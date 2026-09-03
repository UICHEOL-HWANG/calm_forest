-- =============================================================
--  calm forest · 이탈 예측 표본 · 라벨 · 피처 (K=10) — 단일 소스
--  ------------------------------------------------------------
--  사전등록: docs/CHURN_ANALYSIS_PLAN.md §2~§4. 이 파일이 그 문서의 실행본이다.
--  표본 정의를 노트북에 복사하지 말 것 — 두 곳에 두면 반드시 갈라진다.
--
--  라벨   y = 1(이탈) if span_sec < 180
--  피처   세션의 앞 K=10 행만 사용. 그 뒤는 절대 보지 않는다(누수).
--  표본   클라이언트당 5세션 상한(안 C) — 상위 3개 기기가 37%를 차지하기 때문.
--         FARM_FINGERPRINT 시드 고정이라 재실행해도 같은 표본이 나온다.
--
--  ⚠️ 누수 블랙리스트 — 아래 것들은 피처에 절대 넣지 않는다:
--     · pts(세션 총 행수) — 세션 길이의 대리값
--     · span_sec 및 파생값 — 라벨 그 자체
--     · session_logs 의 counts/coins/last_place — 세션 '종료 시점' 값
--     이 쿼리는 session_logs 를 아예 조인하지 않는다. 그게 방어다.
--
--  파라미터: @cap  클라이언트당 세션 상한(기본 5). 민감도 분석용.
-- =============================================================

WITH ranked AS (
  -- 세션 안에서 행 순서를 매긴다. id 오름차순 = 삽입 순서.
  -- created_at 은 배치 INSERT 시각이라 동률이 많아 정렬 키로 못 쓴다(계획서 §7-2).
  SELECT
    session_id, client_id, is_guest, created_at,
    char_x, char_z, cam_yaw, mouse_x, mouse_y,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY id) AS rn
  FROM `calm-forest.calm_forest_raw.game_logs`
  WHERE client_id IS NOT NULL          -- client_id 계측은 07-30 커밋 fc99261 부터
),

session_meta AS (
  -- 라벨과 필터에만 쓰는 세션 전체 통계. 피처로는 절대 내보내지 않는다.
  SELECT
    session_id,
    ANY_VALUE(client_id) AS client_id,
    ANY_VALUE(is_guest)  AS is_guest,
    COUNT(*)             AS pts,
    MIN(created_at)      AS started_at,
    TIMESTAMP_DIFF(MAX(created_at), MIN(created_at), SECOND) AS span_sec
  FROM ranked
  GROUP BY session_id
),

eligible AS (
  -- K=10 윈도우를 채울 수 있는 세션만.
  -- ⚠️ 이 필터가 가장 빠른 이탈자(평균 47초, 192세션)를 버린다 — 계획서 §8-4 한계.
  SELECT * FROM session_meta WHERE pts >= 10
),

sampled AS (
  SELECT * EXCEPT(rn2) FROM (
    SELECT e.*,
           ROW_NUMBER() OVER (
             PARTITION BY client_id ORDER BY FARM_FINGERPRINT(session_id)
           ) AS rn2
    FROM eligible e
  )
  WHERE rn2 <= @cap
),

win AS (
  -- 표본 세션의 앞 10행만. 여기서부터가 피처의 재료다.
  SELECT r.*
  FROM ranked r
  JOIN sampled s USING (session_id)
  WHERE r.rn <= 10
),

steps AS (
  -- 연속 행 사이의 변화량. 첫 행은 이전이 없으므로 NULL → 아래 SUM 에서 무시된다.
  SELECT
    session_id, rn,
    char_x, char_z,
    SQRT(POW(char_x - LAG(char_x) OVER w, 2) + POW(char_z - LAG(char_z) OVER w, 2)) AS d_move,
    SQRT(POW(mouse_x - LAG(mouse_x) OVER w, 2) + POW(mouse_y - LAG(mouse_y) OVER w, 2)) AS d_mouse,
    ABS(cam_yaw - LAG(cam_yaw) OVER w) AS d_yaw,
    -- 좌표가 직전과 완전히 같은 행 = 하트비트 = 유휴
    CAST(char_x = LAG(char_x) OVER w AND char_z = LAG(char_z) OVER w AS INT64) AS is_idle
  FROM win
  WINDOW w AS (PARTITION BY session_id ORDER BY rn)
),

feat AS (
  SELECT
    session_id,
    SUM(d_move)  AS path_len,      -- #1 앞 10행 이동 거리 합
    SUM(d_mouse) AS mouse_travel,  -- #5 마우스 이동 거리 합
    SUM(d_yaw)   AS yaw_total,     -- #4 카메라 좌우 회전량 = 두리번거림
    -- #6 유휴 비율. 분모는 변화량이 정의된 행(=첫 행 제외) 수.
    SAFE_DIVIDE(SUM(is_idle), COUNTIF(d_move IS NOT NULL)) AS idle_ratio,
    -- #2 첫 행 → 마지막 행 직선 거리
    SQRT(
      POW(MAX(IF(rn = 10, char_x, NULL)) - MAX(IF(rn = 1, char_x, NULL)), 2) +
      POW(MAX(IF(rn = 10, char_z, NULL)) - MAX(IF(rn = 1, char_z, NULL)), 2)
    ) AS net_disp
  FROM steps
  GROUP BY session_id
),

first_session AS (
  -- #7 이 클라이언트의 첫 세션인가. 표본이 아니라 '관측된 전체'를 기준으로 판정해야
  -- cap 표집 때문에 첫 세션이 뒤바뀌는 일이 없다.
  SELECT session_id,
         started_at = MIN(started_at) OVER (PARTITION BY client_id) AS is_first_session
  FROM session_meta
)

SELECT
  s.session_id,
  s.client_id,                                  -- GroupKFold 의 group. 피처 아님
  s.is_guest,
  s.started_at,
  CAST(s.span_sec < 180 AS INT64) AS y,         -- 라벨: 1 = 이탈
  s.span_sec,                                   -- 민감도(120/300초)용. 학습 입력 금지
  s.pts,                                        -- 진단용. 학습 입력 금지
  f.path_len, f.net_disp,
  SAFE_DIVIDE(f.path_len, NULLIF(f.net_disp, 0)) AS wander_ratio,   -- #3 방황도
  f.yaw_total, f.mouse_travel, f.idle_ratio,
  fs.is_first_session
FROM sampled s
JOIN feat f USING (session_id)
JOIN first_session fs USING (session_id)
ORDER BY s.started_at
