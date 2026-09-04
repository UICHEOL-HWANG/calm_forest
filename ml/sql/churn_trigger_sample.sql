-- =============================================================
--  calm forest · 트리거 시점 이탈 예측 표본 (롤링 K=10)
--  ------------------------------------------------------------
--  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §3~§4
--
--  ⚠️ churn_sample.sql 과 다르다. 그쪽은 "세션 앞 10행 → span<180" 이고,
--     이쪽은 "트리거 직전 10행 → 트리거 후 60초 내 종료" 다. 섞어 쓰지 말 것.
--
--  트리거 둘 — 한 세션이 여러 행을 낼 수 있다(각각 독립 표본):
--    time15 : 세션 시작 후 15초를 넘긴 첫 행 (세션당 1건)
--    quest  : quest_accept / quest_complete / npc_talk 이벤트마다 1건
--             ⚠️ 세션당 1건으로 세면 자주 하는 행동이 부풀려진다(설계서 §3-2 정정).
--
--  🔑 GA4 ↔ game_logs 조인 키는 user_id 다(설계서 §3-3).
--     익명 로그인이 세션마다 uid 를 재발급해 사실상 세션 식별자다(uid당 세션 1.05개).
--     사전등록의 "user_id 금지" 경고는 리텐션 분석에 한정된다 — 세션 안에서 잇는
--     이 용도에는 오히려 맞는 성질이다. 시간 근접 매칭은 쓰지 않는다.
--
--  라벨   y = 1  트리거 행의 시각 + 60초 안에 세션의 마지막 행이 온다
--  피처   트리거 행을 포함한 직전 10행(rn-9 .. rn). 그 뒤는 절대 보지 않는다.
--
--  누수 블랙리스트 — 피처에 넣지 않는다:
--    · pts(세션 총 행수) · span_sec 및 파생 · remain_sec · trigger_rn
--    · session_logs 의 종료 시점 값 — 이 쿼리는 session_logs 를 조인하지 않는다
--
--  파라미터: @cap  클라이언트당 세션 상한. **20 을 쓴다**(실측 근거).
--            5 보다 표본이 많고(438→507) 상위3기기 편중도 낮다(25.1%→21.7%).
--            상한이 '세션'을 막지 '행'을 막지 않기 때문 — 퀘스트를 많이 하는 사람은
--            세션 하나에서 트리거를 여러 개 낸다. 상한을 아예 없애면 30.5%로 나빠진다.
-- =============================================================

WITH ranked AS (
  SELECT
    session_id, client_id, user_id, created_at,
    char_x, char_z, cam_yaw, mouse_x, mouse_y,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY id) AS rn
  FROM `calm-forest.calm_forest_raw.game_logs`
  WHERE client_id IS NOT NULL          -- client_id 계측은 07-30 커밋 fc99261 부터
),

session_meta AS (
  SELECT
    session_id,
    ANY_VALUE(client_id) AS client_id,
    ANY_VALUE(user_id)   AS user_id,    -- GA4 조인 키
    COUNT(*)             AS pts,        -- 필터·진단용. 피처 아님
    MIN(created_at)      AS started_at,
    MAX(created_at)      AS ended_at
  FROM ranked
  GROUP BY session_id
),

sampled AS (
  -- 클라이언트당 상한. FARM_FINGERPRINT 시드 고정이라 재실행해도 같은 표본.
  SELECT * EXCEPT(rn2) FROM (
    SELECT m.*,
           ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY FARM_FINGERPRINT(session_id)) AS rn2
    FROM session_meta m
    WHERE m.pts >= 10                   -- 롤링 10행 윈도를 채울 수 있는 세션만
  )
  WHERE rn2 <= @cap
),

-- ── 트리거 ① 접속 후 15초를 넘긴 첫 행 ────────────────────────
trig_time AS (
  SELECT r.session_id, 'time15' AS trigger_kind, MIN(r.rn) AS trigger_rn
  FROM ranked r
  JOIN sampled s USING (session_id)
  WHERE TIMESTAMP_DIFF(r.created_at, s.started_at, SECOND) >= 15
  GROUP BY r.session_id
),

-- ── 트리거 ② 퀘스트 계열 이벤트마다 ───────────────────────────
ga_quest AS (
  SELECT DISTINCT user_id, TIMESTAMP_MICROS(event_timestamp) AS event_at
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE event_name IN ('quest_accept', 'quest_complete', 'npc_talk')
    AND user_id IS NOT NULL
),

quest_matched AS (
  -- 한 이벤트가 두 세션에 걸치면(실측 508건 중 6건, 1.2%) 어느 쪽인지 알 수 없으므로 버린다.
  SELECT g.user_id, g.event_at, ANY_VALUE(s.session_id) AS session_id
  FROM ga_quest g
  JOIN session_meta s
    ON s.user_id = g.user_id
   AND g.event_at BETWEEN s.started_at AND s.ended_at
  GROUP BY g.user_id, g.event_at
  HAVING COUNT(DISTINCT s.session_id) = 1
),

trig_quest AS (
  SELECT m.session_id, 'quest' AS trigger_kind, MIN(r.rn) AS trigger_rn
  FROM quest_matched m
  JOIN sampled s ON s.session_id = m.session_id
  JOIN ranked r ON r.session_id = m.session_id AND r.created_at >= m.event_at
  GROUP BY m.session_id, m.event_at    -- 이벤트마다 별도 트리거
),

triggers AS (
  SELECT * FROM trig_time
  UNION ALL
  SELECT * FROM trig_quest
),

eligible_triggers AS (
  -- 앞에 10행이 없으면 윈도를 못 채운다 — 학습 때와 다른 입력이 되므로 버린다.
  SELECT DISTINCT session_id, trigger_kind, trigger_rn
  FROM triggers
  WHERE trigger_rn >= 10
),

-- ── 피처: 트리거 행 포함 직전 10행 ────────────────────────────
win AS (
  SELECT
    t.session_id, t.trigger_kind, t.trigger_rn,
    r.rn, r.char_x, r.char_z, r.cam_yaw, r.mouse_x, r.mouse_y
  FROM eligible_triggers t
  JOIN ranked r
    ON r.session_id = t.session_id
   AND r.rn BETWEEN t.trigger_rn - 9 AND t.trigger_rn
),

steps AS (
  SELECT
    session_id, trigger_kind, trigger_rn, rn, char_x, char_z,
    MIN(rn) OVER w AS first_rn,
    MAX(rn) OVER w AS last_rn,
    SQRT(POW(char_x  - LAG(char_x)  OVER w, 2) + POW(char_z  - LAG(char_z)  OVER w, 2)) AS d_move,
    SQRT(POW(mouse_x - LAG(mouse_x) OVER w, 2) + POW(mouse_y - LAG(mouse_y) OVER w, 2)) AS d_mouse,
    ABS(cam_yaw - LAG(cam_yaw) OVER w) AS d_yaw,
    -- 좌표가 직전과 완전히 같은 행 = 로거의 하트비트 = 유휴
    CAST(char_x = LAG(char_x) OVER w AND char_z = LAG(char_z) OVER w AS INT64) AS is_idle
  FROM win
  WINDOW w AS (PARTITION BY session_id, trigger_kind, trigger_rn ORDER BY rn)
),

feat AS (
  SELECT
    session_id, trigger_kind, trigger_rn,
    SUM(d_move)  AS path_len,      -- #1
    SUM(d_mouse) AS mouse_travel,  -- #5
    SUM(d_yaw)   AS yaw_total,     -- #4
    -- #6 유휴 비율. 분모는 변화량이 정의된 행(=첫 행 제외) 수.
    SAFE_DIVIDE(SUM(is_idle), COUNTIF(d_move IS NOT NULL)) AS idle_ratio,
    -- #2 윈도 첫 행 → 마지막 행 직선 거리
    SQRT(
      POW(MAX(IF(rn = last_rn, char_x, NULL)) - MAX(IF(rn = first_rn, char_x, NULL)), 2) +
      POW(MAX(IF(rn = last_rn, char_z, NULL)) - MAX(IF(rn = first_rn, char_z, NULL)), 2)
    ) AS net_disp
  FROM steps
  GROUP BY session_id, trigger_kind, trigger_rn
),

first_session AS (
  -- #7 표본이 아니라 '관측된 전체'를 기준으로 판정해야 cap 표집에 첫 세션이 뒤바뀌지 않는다.
  SELECT session_id,
         started_at = MIN(started_at) OVER (PARTITION BY client_id) AS is_first_session
  FROM session_meta
),

labeled AS (
  -- 라벨: 트리거 행의 시각 + 60초 안에 세션 마지막 행이 오는가
  SELECT
    t.session_id, t.trigger_kind, t.trigger_rn,
    CAST(TIMESTAMP_DIFF(s.ended_at, r.created_at, SECOND) <= 60 AS INT64) AS y,
    TIMESTAMP_DIFF(s.ended_at, r.created_at, SECOND) AS remain_sec
  FROM eligible_triggers t
  JOIN sampled s USING (session_id)
  JOIN ranked r ON r.session_id = t.session_id AND r.rn = t.trigger_rn
)

SELECT
  s.session_id,
  s.client_id,                 -- GroupKFold 의 group. 피처 아님
  f.trigger_kind,              -- #8 피처
  f.trigger_rn,                -- 진단용. 학습 입력 금지
  l.y,                         -- 라벨
  l.remain_sec,                -- 민감도(30/90초)용. 학습 입력 금지
  s.pts,                       -- 진단용. 학습 입력 금지
  f.path_len, f.net_disp,
  SAFE_DIVIDE(f.path_len, NULLIF(f.net_disp, 0)) AS wander_ratio,   -- #3
  f.yaw_total, f.mouse_travel, f.idle_ratio,
  fs.is_first_session
FROM feat f
JOIN sampled s USING (session_id)
JOIN labeled l USING (session_id, trigger_kind, trigger_rn)
JOIN first_session fs USING (session_id)
ORDER BY s.session_id, f.trigger_kind, f.trigger_rn
