# 세션 이탈 예측 + 실시간 개입 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세션 중 트리거 시점(접속 15초 · 퀘스트 계열 접촉)에 "이 세션이 60초 안에 끝날 확률"을 오라클 VM 의 FastAPI 가 계산해 돌려주고, 처치군에만 비차단 배너로 다음 행동을 제시한다.

**Architecture:** 피처는 클라이언트가 계산(좌표·시선은 브라우저에만 있다) → `lab.calmforest.cloud/predict` 로 POST → uvicorn 이 계수 dot product + sigmoid → 응답. API 는 받은 피처를 JSONL 로 적립하고, Airflow DAG 가 주 1회 그걸 BQ 에 올려 재학습해 `coef.json` 을 갈아끼운다. 클라이언트는 800ms fail-open.

**Tech Stack:** ES modules(브라우저, 빌드 없음) · `node --test`(Node 22 내장) · FastAPI/uvicorn · scikit-learn · Airflow 2.10.5(Docker) · nginx · BigQuery · W&B

**Spec:** `docs/superpowers/specs/2026-09-04-churn-intervention-design.md`

---

## Global Constraints

- **브랜치**: `experiment`. ⚠️ **이 브랜치에는 토스 연동이 없다** — `js/platform.js`·`toss-auth/`·`apps-in-toss.config.ts` 는 `main` 에만 있다. 새 코드가 `platform.js` 를 import 하면 이 브랜치에서 깨진다. **import 금지.**
- **배포 화이트리스트**: `scripts/build-web.mjs` 의 `INCLUDE` 는 `js` 디렉터리를 통째로 복사한다. **테스트 파일을 `js/` 아래 두면 운영에 배포된다.** 테스트는 반드시 저장소 루트 `tests/` 에 둔다(화이트리스트 밖).
- **JS 테스트 실행**: `node --test 'tests/**/*.test.mjs'`. 루트에 `package.json` 을 만들지 않는다 — Node 22.14 의 구문 자동 감지로 `.mjs` 테스트가 `js/*.js`(ESM)를 그대로 import 한다. 실증 완료.
- **파이썬**: `ml/` 에서 `uv run`. `requires-python = ">=3.12"`.
- **피처 윈도는 트리거 직전 K=10행(롤링)** — 세션 앞 10행이 아니다. 기존 `ml/sql/churn_sample.sql` 은 앞 10행 기준이라 **이 설계에 재사용할 수 없다**(Task 1 에서 새로 만든다).
- **누수 블랙리스트**: `span_sec`, `pts`(세션 총 행수), `session_logs` 의 종료 시점 값은 어떤 경로로도 피처가 되지 않는다.
- **CORS 는 보안 경계가 아니다** — `allow_origins=["*"]` + Origin 헤더 로깅. 선례: `toss-auth/src/index.js:135-144`(main 브랜치).
- **커밋 메시지**: 한국어, 접두사(`Feat:`/`Fix:`/`Docs:`/`Test:`) + 이모지 1개. 끝에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## 계획 중 확정한 결정 6건

스펙이 비워둔 자리다. 실행자는 이걸 전제로 움직인다.

| # | 미결이던 것 | 확정 | 근거 |
|---|---|---|---|
| 1 | 피처 윈도 정의 (§4 "트리거 시점까지"가 모호) | **트리거 직전 K=10행 롤링** | 15초 트리거와 200초 시점 퀘스트 트리거의 피처가 비교 가능해야 한다. §10 이 이미 "롤링 윈도"라고 적었다 |
| 2 | `/predict` 남용 방어 | **엔드포인트가 아니라 학습 조인에서 막는다** — 적립 행 중 `session_id` 가 `game_logs` 에 실재하는 것만 학습에 쓴다 | 위조하려면 게임 로그까지 심어야 한다. 엔드포인트 인증은 클라이언트에 비밀을 두는 것이라 어차피 못 지킨다 |
| 3 | 토스 웹뷰 오리진 | **가리지 않는다.** `*` + Origin 로깅 | `toss-auth` 가 이미 같은 판단을 했고 운영 중이다 |
| 4 | 피처 적립처 (postgres vs JSONL) | **JSONL**, 일자별 파일 | Airflow 의 postgres 는 Airflow 메타DB다 — 오염시키지 않는다. append 는 커넥션 풀 없이 O(1) |
| 5 | JS 테스트 러너 | **Node 22 내장 `node --test`**, `tests/*.test.mjs` | 무의존. 루트 `package.json` 불필요 |
| 6 | 계수 배포 경로 | DAG 가 `/opt/calm-api/model/coef.json` 에 쓰고, API 가 **요청마다 mtime 확인 후 핫리로드** | 재시작 없이 갈린다. mtime `stat` 은 마이크로초 단위 |

---

## File Structure

| 파일 | 책임 |
|---|---|
| `ml/sql/churn_trigger_sample.sql` | 트리거 표본·라벨·피처(롤링 K=10). **표본 정의의 유일한 소스** |
| `js/features.js` | 순수 함수 — 행 배열 → 피처 8개. 네트워크·DOM 없음. SQL 과 값이 같아야 한다 |
| `js/predict.js` | 롤링 윈도 보관 · 트리거 판정 · API 호출(fail-open) · 개입 규칙 |
| `ml/api/churn.py` | `/predict` 라우터 · 계수 핫리로드 · JSONL 적립 |
| `ml/train_churn.py` | BQ → 학습 → `coef.json` + W&B |
| `infra/airflow/dags/churn_train.py` | 주 1회 학습 + 야간 JSONL→BQ 적재 |
| `tests/features.test.mjs` | JS↔SQL 피처 동등성(파리티) — 이 계획에서 가장 중요한 테스트 |
| `tests/predict.test.mjs` | 트리거 판정 · fail-open · 개입 규칙 |
| `ml/tests/test_churn_api.py` | API 계약 · 핫리로드 · 적립 |
| `ml/tests/test_train_churn.py` | 학습 산출물 형태 · 누수 차단 |

`js/features.js` 를 `predict.js` 에서 분리하는 이유: 피처 계산은 SQL 과 값이 일치해야 하는 **순수 함수**고, 트리거·네트워크·게임 상태가 섞이면 그 동등성을 테스트할 수 없다.

---

## Task 1: 트리거 표본 SQL (롤링 K=10)

> 🔴 **2026-09-04 정정 반영됨.** 퀘스트 트리거는 **이벤트마다 1건**이다(세션당 1건이 아니다).
> 설계서 §3-2 참조 — 세션 기준으로 세면 자주 하는 행동이 부풀려진다.
> 그리고 GA4↔game_logs 조인 키는 **`user_id`** 다(설계서 §3-3, 실측 466/508건이 정확히 한 세션).
> 시간 근접 매칭은 쓰지 않는다. **확정 표본 507건(cap=20)** — 상한 5보다 많고 편중도 낮다.

**Files:**
- Create: `ml/sql/churn_trigger_sample.sql`
- Create: `ml/tests/test_trigger_sample.py`

**Interfaces:**
- Consumes: `calm-forest.calm_forest_raw.game_logs`, `calm-forest.analytics_547127440.events_*`
- Produces: 컬럼 `session_id, client_id, trigger_kind, trigger_rn, y, path_len, net_disp, wander_ratio, yaw_total, mouse_travel, idle_ratio, is_first_session`
  — 이 컬럼명이 `js/features.js`·`ml/train_churn.py`·`ml/api/churn.py` 전부의 계약이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`ml/tests/test_trigger_sample.py`:

```python
"""표본 SQL 이 재현 가능하고 누수가 없는지 검증한다. BQ 를 실제로 친다(읽기 전용)."""
from pathlib import Path
import pandas as pd
from calm_ml import bq

SQL = str(Path(__file__).resolve().parents[1] / "sql" / "churn_trigger_sample.sql")

# 라벨/진단 컬럼 — 학습 입력에 절대 섞이면 안 되는 것들
LEAK = {"span_sec", "pts", "y", "session_id", "client_id", "started_at"}
FEATURES = ["path_len", "net_disp", "wander_ratio", "yaw_total",
            "mouse_travel", "idle_ratio", "is_first_session", "trigger_kind"]


def test_columns_exact():
    df = bq.read_sql_file(SQL, cap=5)
    for c in FEATURES:
        assert c in df.columns, f"피처 {c} 가 없다"
    assert "y" in df.columns


def test_no_leak_columns_in_features():
    """피처 목록과 누수 블랙리스트가 겹치면 안 된다."""
    assert not (set(FEATURES) & LEAK)


def test_reproducible():
    """같은 파라미터로 두 번 돌리면 완전히 같은 표본이 나와야 한다."""
    a = bq.read_sql_file(SQL, cap=5).sort_values(["session_id", "trigger_kind"]).reset_index(drop=True)
    b = bq.read_sql_file(SQL, cap=5).sort_values(["session_id", "trigger_kind"]).reset_index(drop=True)
    pd.testing.assert_frame_equal(a, b)


def test_label_has_variance():
    """라벨이 한쪽으로 쏠리면(>95%) 학습할 게 없다 — 스펙 §2 의 기기 단위 실패를 반복하지 않는다."""
    df = bq.read_sql_file(SQL, cap=5)
    rate = df["y"].mean()
    assert 0.05 < rate < 0.95, f"라벨 쏠림: y={rate:.1%}"


def test_both_triggers_present():
    df = bq.read_sql_file(SQL, cap=5)
    kinds = set(df["trigger_kind"].unique())
    assert kinds == {"time15", "quest"}, f"트리거 종류가 예상과 다르다: {kinds}"
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd ml && uv run pytest tests/test_trigger_sample.py -v`
Expected: FAIL — `ml/sql/churn_trigger_sample.sql` 이 없어서 `FileNotFoundError`. (`pytest` 가 없다면 먼저 Step 3 의 의존성 추가를 한다.)

- [ ] **Step 3: pytest 를 dev 의존성에 추가한다**

`ml/pyproject.toml` 의 `[dependency-groups] dev` 에 추가:

```toml
dev = [
    "jupyterlab>=4.2",
    "ipykernel>=6.29",
    "pytest>=8.3",
    "httpx>=0.28",           # FastAPI TestClient 가 요구
]
```

Run: `cd ml && uv sync`

- [ ] **Step 4: SQL 을 쓴다**

`ml/sql/churn_trigger_sample.sql`:

```sql
-- =============================================================
--  calm forest · 트리거 시점 이탈 예측 표본 (롤링 K=10)
--  ------------------------------------------------------------
--  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §3~§4
--
--  ⚠️ churn_sample.sql 과 다르다. 그쪽은 "세션 앞 10행 → span<180" 이고,
--     이쪽은 "트리거 직전 10행 → 트리거 후 60초 내 종료" 다. 섞어 쓰지 말 것.
--
--  트리거 둘 — 한 세션이 두 행을 낼 수 있다(각각 독립 표본):
--    time15 : 세션 시작 후 15초를 넘긴 첫 행
--    quest  : GA4 의 quest_accept / quest_complete / npc_talk 직후 첫 행
--
--  라벨   y = 1  트리거 시각 + 60초 안에 세션의 마지막 행이 온다
--  피처   트리거 행을 포함한 직전 10행(rn-9 .. rn). 그 뒤는 절대 보지 않는다.
--
--  누수 블랙리스트 — 피처에 넣지 않는다:
--    · pts(세션 총 행수) · span_sec 및 파생 · session_logs 의 종료 시점 값
--    이 쿼리는 session_logs 를 조인하지 않는다. 그게 방어다.
--
--  파라미터: @cap  클라이언트당 세션 상한(기본 5)
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
    ANY_VALUE(user_id)   AS user_id,    -- GA4 조인 키. 익명 uid는 세션마다 재발급 = 사실상 세션키
    COUNT(*)             AS pts,        -- 필터·진단용. 피처 아님
    MIN(created_at)      AS started_at,
    MAX(created_at)      AS ended_at,
    MAX(rn)              AS last_rn
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
  SELECT session_id, 'time15' AS trigger_kind,
         CAST(NULL AS TIMESTAMP) AS event_at, MIN(rn) AS trigger_rn
  FROM ranked r
  JOIN sampled s USING (session_id)
  WHERE TIMESTAMP_DIFF(r.created_at, s.started_at, SECOND) >= 15
  GROUP BY session_id
),

-- ── 트리거 ② 퀘스트 계열 GA4 이벤트 직후 첫 행 ────────────────
ga_quest AS (
  -- 🔑 조인 키는 user_id 다. GA4 퀘스트 이벤트의 90%(647/720)에 실려 있고
  --    game_logs 에도 같은 컬럼이 있다. 익명 로그인이 세션마다 uid 를 재발급하므로
  --    uid 는 사실상 세션 식별자다(uid당 세션 1.05개) — 시간 근접으로 때울 필요가 없다.
  --    ⚠️ 사전등록의 "user_id 금지" 경고는 **리텐션 분석에 한정**된다(uid 회전 때문에
  --       사람 수를 과대 계산). 세션 안에서 잇는 이 용도에는 오히려 맞는 성질이다.
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
  -- ⚠️ 퀘스트 이벤트 '하나하나'가 트리거다(설계서 §3-2 안 B). 세션당 1건이 아니다.
  --    세션 기준으로 세면 자주 하는 행동이 부풀려진다 — 그게 처음의 오답이었다.
  SELECT m.session_id, 'quest' AS trigger_kind, m.event_at, MIN(r.rn) AS trigger_rn
  FROM quest_matched m
  JOIN sampled s USING (session_id)
  JOIN ranked r ON r.session_id = m.session_id AND r.created_at >= m.event_at
  GROUP BY m.session_id, m.event_at
),

triggers AS (
  SELECT * FROM trig_time
  UNION ALL
  SELECT * FROM trig_quest
),

-- ── 피처: 트리거 행 포함 직전 10행 ────────────────────────────
win AS (
  SELECT
    t.session_id, t.trigger_kind, t.trigger_rn,
    r.rn, r.char_x, r.char_z, r.cam_yaw, r.mouse_x, r.mouse_y
  FROM triggers t
  JOIN ranked r
    ON r.session_id = t.session_id
   AND r.rn BETWEEN t.trigger_rn - 9 AND t.trigger_rn
),

steps AS (
  SELECT
    session_id, trigger_kind, trigger_rn, rn, char_x, char_z,
    MIN(rn) OVER w AS first_rn, MAX(rn) OVER w AS last_rn,
    SQRT(POW(char_x  - LAG(char_x)  OVER w, 2) + POW(char_z  - LAG(char_z)  OVER w, 2)) AS d_move,
    SQRT(POW(mouse_x - LAG(mouse_x) OVER w, 2) + POW(mouse_y - LAG(mouse_y) OVER w, 2)) AS d_mouse,
    ABS(cam_yaw - LAG(cam_yaw) OVER w) AS d_yaw,
    CAST(char_x = LAG(char_x) OVER w AND char_z = LAG(char_z) OVER w AS INT64) AS is_idle
  FROM win
  WINDOW w AS (PARTITION BY session_id, trigger_kind, trigger_rn ORDER BY rn)
),

feat AS (
  SELECT
    session_id, trigger_kind, trigger_rn,
    SUM(d_move)  AS path_len,
    SUM(d_mouse) AS mouse_travel,
    SUM(d_yaw)   AS yaw_total,
    SAFE_DIVIDE(SUM(is_idle), COUNTIF(d_move IS NOT NULL)) AS idle_ratio,
    SQRT(
      POW(MAX(IF(rn = last_rn, char_x, NULL)) - MAX(IF(rn = first_rn, char_x, NULL)), 2) +
      POW(MAX(IF(rn = last_rn, char_z, NULL)) - MAX(IF(rn = first_rn, char_z, NULL)), 2)
    ) AS net_disp
  FROM steps
  GROUP BY session_id, trigger_kind, trigger_rn
),

first_session AS (
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
  FROM triggers t
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
  SAFE_DIVIDE(f.path_len, NULLIF(f.net_disp, 0)) AS wander_ratio,
  f.yaw_total, f.mouse_travel, f.idle_ratio,
  fs.is_first_session
FROM feat f
JOIN sampled s USING (session_id)
JOIN labeled l USING (session_id, trigger_kind, trigger_rn)
JOIN first_session fs USING (session_id)
ORDER BY s.session_id, f.trigger_kind
```

- [ ] **Step 5: 테스트를 돌려 통과를 확인한다**

Run: `cd ml && uv run pytest tests/test_trigger_sample.py -v`
Expected: 5 passed.

`net_disp` 의 중첩 집계(`MAX(...) OVER` 안의 `MAX(rn) OVER`)가 BQ 에서 거부되면, `steps` CTE 에 `MIN(rn) OVER w AS first_rn, MAX(rn) OVER w AS last_rn` 컬럼을 먼저 만들어 두고 `feat` 에서 그 값과 비교하도록 바꾼다.

- [ ] **Step 6: 표본 규모를 기록한다**

Run:
```bash
cd ml && uv run python -c "
from calm_ml import bq
df = bq.read_sql_file('sql/churn_trigger_sample.sql', cap=5)
print(df.groupby('trigger_kind')['y'].agg(['size','mean']))
print('클라이언트', df.client_id.nunique())
"
```
실측 확정치(cap=20): **time15 248건 · quest 259건 · 합계 507건**, 세션 254 · 기기 135. **2배 이상 벗어나면 멈추고 사용자에게 보고한다** — 표본이 무엇인지 모르는 채로 학습하지 않는다.

- [ ] **Step 7: 커밋**

```bash
git add ml/sql/churn_trigger_sample.sql ml/tests/test_trigger_sample.py ml/pyproject.toml ml/uv.lock
git commit -m "$(cat <<'MSG'
Feat: 🎯 트리거 표본 SQL — 롤링 K=10 · 트리거 후 60초 라벨

churn_sample.sql(앞 10행·span<180)과 축이 달라 새로 만든다.
재현성·누수·라벨 분산·트리거 2종 존재를 테스트로 고정.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---
## Task 2: 피처 계산 순수 함수 + SQL 파리티

**이 계획에서 가장 중요한 태스크다.** JS 가 계산한 피처와 SQL 이 계산한 피처가 다르면
모델은 학습한 적 없는 입력을 받는다(training/serving skew). 그걸 테스트로 못박는다.

**Files:**
- Create: `js/features.js`
- Create: `tests/features.test.mjs`
- Create: `ml/tests/make_parity_fixture.py`
- Create: `tests/fixtures/feature_parity.json` (생성물, 커밋한다)

**Interfaces:**
- Consumes: Task 1 의 `ml/sql/churn_trigger_sample.sql` 컬럼 계약
- Produces:
  - `FEATURE_ORDER: string[]` — 계수 벡터와 같은 순서. `ml/train_churn.py`·`ml/api/churn.py` 가 이 순서를 따른다
  - `computeFeatures(rows, opts) -> Record<string, number|null>`
    - `rows`: `{char_x, char_z, cam_yaw, mouse_x, mouse_y}[]`, 시간 오름차순, 길이 10
    - `opts`: `{ isFirstSession: boolean, triggerKind: 'time15'|'quest' }`
    - 반환 키: `path_len, net_disp, wander_ratio, yaw_total, mouse_travel, idle_ratio, is_first_session, trigger_kind`
    - `wander_ratio` 는 `net_disp === 0` 일 때 **`null`** (SQL 의 `SAFE_DIVIDE`/`NULLIF` 와 동일). 대치는 서버가 한다

- [ ] **Step 1: 파리티 픽스처 생성기를 쓴다**

`ml/tests/make_parity_fixture.py`:

```python
"""BQ 에서 원시 윈도 행 + SQL 이 계산한 피처값을 뽑아 JS 테스트용 픽스처로 저장한다.

    cd ml && uv run python tests/make_parity_fixture.py

이 픽스처가 JS↔SQL 동등성의 기준점이다. SQL 을 고치면 반드시 다시 생성한다.
"""
import json
from pathlib import Path
from calm_ml import bq

OUT = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "feature_parity.json"

# 표본 20건 — 다양한 경우가 섞이도록 idle_ratio 양극단과 중간을 고른다
SAMPLE_SQL = """
WITH s AS ({inner})
SELECT * FROM s
ORDER BY idle_ratio DESC LIMIT 10
"""

def main():
    inner = (Path(__file__).resolve().parents[1] / "sql" / "churn_trigger_sample.sql").read_text(encoding="utf-8")
    feats = bq.read_sql(SAMPLE_SQL.format(inner=inner), cap=5)

    cases = []
    for _, r in feats.iterrows():
        rows = bq.read_sql(
            """
            SELECT char_x, char_z, cam_yaw, mouse_x, mouse_y
            FROM (
              SELECT char_x, char_z, cam_yaw, mouse_x, mouse_y,
                     ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY id) AS rn
              FROM `calm-forest.calm_forest_raw.game_logs`
              WHERE session_id = @sid AND client_id IS NOT NULL
            )
            WHERE rn BETWEEN @lo AND @hi
            ORDER BY rn
            """,
            sid=r["session_id"], lo=int(r["trigger_rn"]) - 9, hi=int(r["trigger_rn"]),
        )
        if len(rows) != 10:
            continue
        cases.append({
            "session_id": r["session_id"],
            "trigger_kind": r["trigger_kind"],
            "is_first_session": bool(r["is_first_session"]),
            "rows": rows.to_dict("records"),
            "expected": {
                k: (None if r[k] is None or (isinstance(r[k], float) and r[k] != r[k]) else float(r[k]))
                for k in ["path_len", "net_disp", "wander_ratio", "yaw_total", "mouse_travel", "idle_ratio"]
            },
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cases, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(cases)}건 저장 → {OUT}")


if __name__ == "__main__":
    main()
```

Run: `cd ml && uv run python tests/make_parity_fixture.py`
Expected: `10건 저장 → .../tests/fixtures/feature_parity.json`. 0건이면 Task 1 의 SQL 을 먼저 고친다.

- [ ] **Step 2: 실패하는 JS 테스트를 쓴다**

`tests/features.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeFeatures, FEATURE_ORDER } from '../js/features.js';

const cases = JSON.parse(readFileSync(new URL('./fixtures/feature_parity.json', import.meta.url), 'utf8'));

test('픽스처가 비어있지 않다', () => {
  assert.ok(cases.length > 0, 'make_parity_fixture.py 를 먼저 돌린다');
});

test('SQL 이 계산한 값과 일치한다', () => {
  for (const c of cases) {
    const got = computeFeatures(c.rows, {
      isFirstSession: c.is_first_session,
      triggerKind: c.trigger_kind,
    });
    for (const [k, want] of Object.entries(c.expected)) {
      if (want === null) {
        assert.equal(got[k], null, `${c.session_id}/${k}: SQL 은 NULL 인데 JS 는 ${got[k]}`);
        continue;
      }
      const diff = Math.abs(got[k] - want);
      const tol = Math.max(1e-6, Math.abs(want) * 1e-9);
      assert.ok(diff <= tol, `${c.session_id}/${k}: JS ${got[k]} vs SQL ${want} (차 ${diff})`);
    }
  }
});

test('FEATURE_ORDER 는 8개이고 중복이 없다', () => {
  assert.equal(FEATURE_ORDER.length, 8);
  assert.equal(new Set(FEATURE_ORDER).size, 8);
});

test('net_disp 가 0이면 wander_ratio 는 null', () => {
  const still = Array.from({ length: 10 }, () => ({ char_x: 1, char_z: 2, cam_yaw: 0, mouse_x: 5, mouse_y: 5 }));
  const f = computeFeatures(still, { isFirstSession: true, triggerKind: 'time15' });
  assert.equal(f.net_disp, 0);
  assert.equal(f.wander_ratio, null);
  assert.equal(f.idle_ratio, 1, '전부 정지면 유휴 비율 1');
});

test('행이 10개가 아니면 던진다', () => {
  assert.throws(() => computeFeatures([], { isFirstSession: true, triggerKind: 'time15' }), /10/);
});
```

- [ ] **Step 3: 실패를 확인한다**

Run: `node --test 'tests/**/*.test.mjs'`
Expected: FAIL — `Cannot find module '../js/features.js'`

- [ ] **Step 4: 구현한다**

`js/features.js`:

```js
// =============================================================
//  calm forest · 이탈 예측 피처 계산 (순수 함수)
//  ------------------------------------------------------------
//  ⚠️ 이 파일의 계산은 ml/sql/churn_trigger_sample.sql 과 값이 같아야 한다.
//     한쪽만 고치면 모델이 학습한 적 없는 입력을 받는다(training/serving skew).
//     tests/features.test.mjs 가 실제 BQ 값으로 그 동등성을 잡는다.
//  ▶ 네트워크·DOM·게임 상태를 참조하지 않는다. 그래야 테스트할 수 있다.
// =============================================================

export const WINDOW_SIZE = 10;   // SQL 의 rn BETWEEN trigger_rn-9 AND trigger_rn 과 동일

// 계수 벡터의 순서. ml/train_churn.py 와 ml/api/churn.py 가 이 순서를 따른다.
export const FEATURE_ORDER = [
  'path_len', 'net_disp', 'wander_ratio', 'yaw_total',
  'mouse_travel', 'idle_ratio', 'is_first_session', 'trigger_kind',
];

/**
 * 롤링 윈도 행 배열 → 피처.
 * @param {{char_x:number,char_z:number,cam_yaw:number,mouse_x:number,mouse_y:number}[]} rows 시간 오름차순 10행
 * @param {{isFirstSession:boolean, triggerKind:'time15'|'quest'}} opts
 */
export function computeFeatures(rows, { isFirstSession, triggerKind }) {
  if (!Array.isArray(rows) || rows.length !== WINDOW_SIZE) {
    throw new Error(`피처 계산에는 정확히 ${WINDOW_SIZE}행이 필요하다 (받은 값: ${rows?.length})`);
  }

  let pathLen = 0, mouseTravel = 0, yawTotal = 0, idleCount = 0;

  // SQL 의 LAG 와 동일 — 첫 행은 이전이 없으므로 합계에서 빠진다.
  for (let i = 1; i < rows.length; i++) {
    const p = rows[i - 1], c = rows[i];
    pathLen     += Math.hypot(c.char_x - p.char_x, c.char_z - p.char_z);
    mouseTravel += Math.hypot(c.mouse_x - p.mouse_x, c.mouse_y - p.mouse_y);
    yawTotal    += Math.abs(c.cam_yaw - p.cam_yaw);
    // 좌표가 직전과 완전히 같은 행 = 로거의 하트비트 = 유휴 (SQL 도 = 로 비교)
    if (c.char_x === p.char_x && c.char_z === p.char_z) idleCount++;
  }

  const first = rows[0], last = rows[rows.length - 1];
  const netDisp = Math.hypot(last.char_x - first.char_x, last.char_z - first.char_z);

  return {
    path_len: pathLen,
    net_disp: netDisp,
    // SAFE_DIVIDE(path_len, NULLIF(net_disp, 0)) — 0 나눗셈은 NULL. 대치는 서버가 한다.
    wander_ratio: netDisp === 0 ? null : pathLen / netDisp,
    yaw_total: yawTotal,
    mouse_travel: mouseTravel,
    idle_ratio: idleCount / (rows.length - 1),   // 분모 = 변화량이 정의된 행 수
    is_first_session: isFirstSession ? 1 : 0,
    trigger_kind: triggerKind === 'quest' ? 1 : 0,
  };
}
```

- [ ] **Step 5: 통과를 확인한다**

Run: `node --test 'tests/**/*.test.mjs'`
Expected: 5 pass, 0 fail.

실패하면 **JS 를 SQL 에 맞춘다**(SQL 이 학습의 기준이다). 단, SQL 쪽이 틀렸다고 판단되면 멈추고 사용자에게 보고한다 — 표본 정의를 조용히 바꾸지 않는다.

- [ ] **Step 6: 커밋**

```bash
git add js/features.js tests/features.test.mjs tests/fixtures/feature_parity.json ml/tests/make_parity_fixture.py
git commit -m "$(cat <<'MSG'
Feat: 🧮 피처 계산 순수 함수 + SQL 파리티 테스트

JS 와 BQ 가 같은 값을 내는지 실제 로그 10건으로 고정한다.
어긋나면 모델이 학습한 적 없는 입력을 받게 되므로 여기서 막는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Task 3: 로거에 롤링 윈도 노출

현재 `js/logger.js` 의 버퍼는 1.5초마다 **비워진다**(`buffer = []`). 트리거 시점에 직전 10행을
읽으려면 별도 보관이 필요하다.

**Files:**
- Modify: `js/logger.js:14-17`(모듈 상태), `js/logger.js:57`(`buffer.push(s)` 직후)
- Create: `tests/logger-window.test.mjs`

**Interfaces:**
- Produces: `getWindow() -> object[]` — 최근 `WINDOW_SIZE` 개 샘플의 **얕은 복사본**, 시간 오름차순. 10개 미만이면 있는 만큼만.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/logger-window.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { _pushSampleForTest, getWindow, _resetForTest } from '../js/logger.js';
import { WINDOW_SIZE } from '../js/features.js';

test('윈도는 최근 WINDOW_SIZE 개만 시간 오름차순으로 준다', () => {
  _resetForTest();
  for (let i = 0; i < 25; i++) _pushSampleForTest({ char_x: i, char_z: 0, cam_yaw: 0, mouse_x: 0, mouse_y: 0 });
  const w = getWindow();
  assert.equal(w.length, WINDOW_SIZE);
  assert.equal(w[0].char_x, 15, '가장 오래된 것이 앞');
  assert.equal(w[w.length - 1].char_x, 24, '가장 최근이 뒤');
});

test('샘플이 모자라면 있는 만큼만 준다', () => {
  _resetForTest();
  for (let i = 0; i < 3; i++) _pushSampleForTest({ char_x: i, char_z: 0, cam_yaw: 0, mouse_x: 0, mouse_y: 0 });
  assert.equal(getWindow().length, 3);
});

test('반환값을 고쳐도 내부 상태가 오염되지 않는다', () => {
  _resetForTest();
  for (let i = 0; i < 12; i++) _pushSampleForTest({ char_x: i, char_z: 0, cam_yaw: 0, mouse_x: 0, mouse_y: 0 });
  getWindow()[0].char_x = 999;
  assert.notEqual(getWindow()[0].char_x, 999);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test 'tests/logger-window.test.mjs'`
Expected: FAIL — `_pushSampleForTest` 가 export 되어 있지 않다.

- [ ] **Step 3: 구현한다**

`js/logger.js` 상단 import 에 추가:

```js
import { WINDOW_SIZE } from './features.js';
```

모듈 상태 선언부(`let lastHeartbeat = 0;` 다음 줄)에 추가:

```js
// [이탈 예측] 전송 버퍼와 별개로 최근 WINDOW_SIZE 개를 계속 들고 있는 링 버퍼.
// buffer 는 1.5초마다 비워지므로 트리거 시점에 직전 10행을 읽으려면 여기가 필요하다.
let windowBuf = [];
```

`sampleFrame` 의 `buffer.push(s);` 바로 아래에 추가:

```js
  windowBuf.push(s);
  if (windowBuf.length > WINDOW_SIZE) windowBuf.shift();
```

파일 끝에 추가:

```js
// [이탈 예측] 트리거 시점의 롤링 윈도. 얕은 복사로 내보내 내부 상태를 보호한다.
export function getWindow() {
  return windowBuf.map(s => ({ ...s }));
}

// ── 테스트 전용 ─────────────────────────────────────────────
// 브라우저 런타임에서는 쓰지 않는다. node --test 에서 링 버퍼만 검사하기 위한 것.
export function _pushSampleForTest(s) {
  windowBuf.push(s);
  if (windowBuf.length > WINDOW_SIZE) windowBuf.shift();
}
export function _resetForTest() { windowBuf = []; }
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test 'tests/**/*.test.mjs'`
Expected: 8 pass (Task 2 의 5건 + 3건), 0 fail.

`logger.js` 가 `./config.js` 와 `./supabase-client.js` 를 import 하므로, 그 모듈들이 Node 에서 import 시점에 `window` 를 만지면 테스트가 깨진다. 깨지면 `_pushSampleForTest`/`getWindow`/`_resetForTest` 와 `windowBuf` 만 `js/window-buffer.js` 로 분리하고 `logger.js` 가 그걸 import 하도록 바꾼다 — 테스트는 `window-buffer.js` 를 직접 import 한다.

- [ ] **Step 5: 커밋**

```bash
git add js/logger.js tests/logger-window.test.mjs
git commit -m "$(cat <<'MSG'
Feat: 🔟 로거에 롤링 윈도(최근 10샘플) 노출

전송 버퍼는 1.5초마다 비워져 트리거 시점에 직전 행을 읽을 수 없다.
별도 링 버퍼를 두고 얕은 복사로만 내보낸다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---
## Task 4: 학습 — BQ → 계수 JSON + W&B

**Files:**
- Create: `ml/train_churn.py`
- Create: `ml/tests/test_train_churn.py`

**Interfaces:**
- Consumes: `ml/sql/churn_trigger_sample.sql`(Task 1), `calm_ml.bq.read_sql_file`, `calm_ml.tracking.start_run(name, *, config, tags)`
- Produces: `coef.json` — `ml/api/churn.py` 가 읽는 유일한 계약

```json
{
  "model_version": "2026-09-04T12:00:00Z",
  "feature_order": ["path_len","net_disp","wander_ratio","yaw_total","mouse_travel","idle_ratio","is_first_session","trigger_kind"],
  "coef": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  "intercept": 0.0,
  "scaler": { "mean": [0.0], "scale": [1.0] },
  "impute": { "wander_ratio": 3.2 },
  "threshold": 0.5,
  "enabled": true,
  "metrics": { "auc": 0.0, "auc_ci_low": 0.0, "auc_ci_high": 0.0, "baseline_majority": 0.5, "baseline_pathlen_auc": 0.0, "n": 0 }
}
```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`ml/tests/test_train_churn.py`:

```python
"""학습 산출물의 형태와 누수 차단을 검증한다. BQ 를 치지 않고 합성 데이터로 돈다."""
import json
import numpy as np
import pandas as pd
import pytest

from train_churn import EXCLUDED, FEATURE_ORDER, fit_and_export


def synthetic(n=300, seed=0):
    """path_len 이 작을수록 이탈하는 합성 표본. 학습이 신호를 잡는지 확인용."""
    rng = np.random.default_rng(seed)
    path = rng.gamma(2.0, 3.0, n)
    y = (rng.random(n) < 1 / (1 + np.exp(0.35 * (path - 6)))).astype(int)
    return pd.DataFrame({
        "session_id": [f"s{i}" for i in range(n)],
        "client_id": [f"c{i % 40}" for i in range(n)],      # GroupKFold 용 40그룹
        "y": y,
        "span_sec": rng.integers(10, 900, n),               # 누수 후보 — 들어가면 안 됨
        "pts": rng.integers(10, 400, n),                    # 누수 후보
        "remain_sec": rng.integers(0, 600, n),              # 누수 후보
        "trigger_rn": rng.integers(10, 50, n),              # 누수 후보
        "path_len": path,
        "net_disp": rng.gamma(1.5, 2.0, n),
        "wander_ratio": rng.gamma(2.0, 1.5, n),
        "yaw_total": rng.gamma(2.0, 1.0, n),
        "mouse_travel": rng.gamma(2.0, 40.0, n),
        "idle_ratio": rng.random(n),
        "is_first_session": rng.integers(0, 2, n),
        "trigger_kind": rng.integers(0, 2, n),
    })


def test_excluded_and_features_disjoint():
    """누수 블랙리스트와 피처 목록이 겹치면 안 된다."""
    assert not (set(FEATURE_ORDER) & set(EXCLUDED))


def test_export_shape(tmp_path):
    out = tmp_path / "coef.json"
    fit_and_export(synthetic(), out, log_wandb=False)
    m = json.loads(out.read_text())

    assert m["feature_order"] == FEATURE_ORDER
    assert len(m["coef"]) == len(FEATURE_ORDER)
    assert len(m["scaler"]["mean"]) == len(FEATURE_ORDER)
    assert len(m["scaler"]["scale"]) == len(FEATURE_ORDER)
    assert all(s > 0 for s in m["scaler"]["scale"]), "scale 이 0이면 추론에서 0나눗셈"
    assert 0.0 <= m["threshold"] <= 1.0
    assert m["enabled"] is True
    assert "wander_ratio" in m["impute"]
    assert m["metrics"]["n"] == 300


def test_no_leak_columns_reach_the_model(tmp_path):
    """누수 컬럼값을 극단으로 바꿔도 계수가 그대로여야 한다 — 모델이 안 봤다는 뜻."""
    df = synthetic()
    a = tmp_path / "a.json"; fit_and_export(df, a, log_wandb=False)
    df2 = df.copy()
    for c in ["span_sec", "pts", "remain_sec", "trigger_rn"]:
        df2[c] = 999999
    b = tmp_path / "b.json"; fit_and_export(df2, b, log_wandb=False)
    assert json.loads(a.read_text())["coef"] == json.loads(b.read_text())["coef"]


def test_learns_the_planted_signal(tmp_path):
    """합성 신호(path_len 작을수록 이탈)를 잡아야 한다. 못 잡으면 파이프라인이 고장난 것."""
    out = tmp_path / "coef.json"
    fit_and_export(synthetic(n=800), out, log_wandb=False)
    m = json.loads(out.read_text())
    assert m["metrics"]["auc"] > 0.60
    assert m["coef"][FEATURE_ORDER.index("path_len")] < 0, "path_len 이 클수록 이탈 확률이 낮아야"


def test_missing_wander_ratio_is_imputed(tmp_path):
    df = synthetic()
    df.loc[:50, "wander_ratio"] = np.nan
    out = tmp_path / "coef.json"
    fit_and_export(df, out, log_wandb=False)
    m = json.loads(out.read_text())
    assert np.isfinite(m["impute"]["wander_ratio"])
    assert all(np.isfinite(c) for c in m["coef"]), "NaN 이 계수까지 새어나갔다"
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd ml && uv run pytest tests/test_train_churn.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'train_churn'`

- [ ] **Step 3: 구현한다**

`ml/train_churn.py`:

```python
# =============================================================
#  calm forest · 세션 이탈 예측 학습 — BQ → 계수 JSON
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §5
#  ▶ 손으로:   cd ml && uv run python train_churn.py --out /tmp/coef.json
#  ▶ 주 1회:   infra/airflow/dags/churn_train.py 가 이걸 호출한다
#
#  ⚠️ FEATURE_ORDER 는 js/features.js 의 FEATURE_ORDER 와 순서까지 같아야 한다.
#     계수 벡터가 그 순서로 저장되고, API 가 그 순서로 내적을 계산한다.
# =============================================================
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler

# js/features.js 의 FEATURE_ORDER 와 동일한 순서
FEATURE_ORDER = [
    "path_len", "net_disp", "wander_ratio", "yaw_total",
    "mouse_travel", "idle_ratio", "is_first_session", "trigger_kind",
]

# 학습 입력에 절대 넣지 않는다 — 라벨 자체이거나 세션 길이의 대리값
EXCLUDED = ["y", "span_sec", "pts", "remain_sec", "trigger_rn", "session_id", "client_id", "started_at"]

SQL = Path(__file__).parent / "sql" / "churn_trigger_sample.sql"


def _prepare(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    """피처 행렬·라벨·그룹·대치값. 여기서 EXCLUDED 컬럼은 아예 만지지 않는다."""
    impute = {}
    X = pd.DataFrame(index=df.index)
    for c in FEATURE_ORDER:
        col = pd.to_numeric(df[c], errors="coerce").astype(float)
        if col.isna().any():
            # SQL 의 SAFE_DIVIDE 가 NULL 을 낼 수 있는 건 wander_ratio 다.
            # 중앙값으로 대치하고, 그 값을 coef.json 에 실어 API 가 같은 값을 쓰게 한다.
            fill = float(col.median()) if np.isfinite(col.median()) else 0.0
            impute[c] = fill
            col = col.fillna(fill)
        X[c] = col
    return X.to_numpy(dtype=float), df["y"].to_numpy(dtype=int), df["client_id"].to_numpy(), impute


def _cv_auc(X, y, groups, n_splits=5) -> float:
    """GroupKFold — 같은 클라이언트가 학습/검증에 동시에 들어가지 않게 한다."""
    n_splits = min(n_splits, len(np.unique(groups)))
    oof = np.zeros(len(y), dtype=float)
    for tr, te in GroupKFold(n_splits=n_splits).split(X, y, groups):
        sc = StandardScaler().fit(X[tr])
        clf = LogisticRegression(penalty="l2", C=1.0, max_iter=1000).fit(sc.transform(X[tr]), y[tr])
        oof[te] = clf.predict_proba(sc.transform(X[te]))[:, 1]
    return float(roc_auc_score(y, oof)), oof


def _bootstrap_ci(y, p, n_boot=1000, seed=0) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    idx = np.arange(len(y))
    aucs = []
    for _ in range(n_boot):
        s = rng.choice(idx, size=len(idx), replace=True)
        if len(np.unique(y[s])) < 2:      # 한 클래스만 뽑히면 AUC 가 정의되지 않는다
            continue
        aucs.append(roc_auc_score(y[s], p[s]))
    if not aucs:
        return 0.0, 0.0
    return float(np.percentile(aucs, 2.5)), float(np.percentile(aucs, 97.5))


def fit_and_export(df: pd.DataFrame, out: Path | str, *, log_wandb: bool = True,
                   threshold: float = 0.5) -> dict:
    """표본 DataFrame → coef.json. 반환값은 저장한 dict 와 동일."""
    X, y, groups, impute = _prepare(df)

    auc, oof = _cv_auc(X, y, groups)
    ci_low, ci_high = _bootstrap_ci(y, oof)

    # 베이스라인 ① 다수 클래스 ② path_len 단일 피처
    base_majority = float(max(y.mean(), 1 - y.mean()))
    pl = X[:, FEATURE_ORDER.index("path_len")].reshape(-1, 1)
    base_auc, _ = _cv_auc(pl, y, groups)

    # 최종 모델은 전체 표본으로 다시 적합한다(위 CV 는 성능 추정용)
    scaler = StandardScaler().fit(X)
    clf = LogisticRegression(penalty="l2", C=1.0, max_iter=1000).fit(scaler.transform(X), y)

    model = {
        "model_version": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "feature_order": FEATURE_ORDER,
        "coef": [float(v) for v in clf.coef_[0]],
        "intercept": float(clf.intercept_[0]),
        "scaler": {
            "mean": [float(v) for v in scaler.mean_],
            # scale 이 0이면 추론에서 0나눗셈 — 상수 피처를 대비해 1로 바닥을 깐다
            "scale": [float(v) if v > 1e-12 else 1.0 for v in scaler.scale_],
        },
        "impute": impute,
        "threshold": float(threshold),
        "enabled": True,
        "metrics": {
            "auc": auc,
            "auc_ci_low": ci_low,
            "auc_ci_high": ci_high,
            "baseline_majority": base_majority,
            "baseline_pathlen_auc": base_auc,
            "n": int(len(y)),
            "churn_rate": float(y.mean()),
        },
    }

    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # 원자적 교체 — API 가 반쯤 쓰인 파일을 읽지 않게 한다
    tmp = out.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(out)

    if log_wandb:
        from calm_ml.tracking import start_run
        run = start_run("churn-trigger", config={"cap": 5, "features": FEATURE_ORDER}, tags=["churn", "trigger"])
        run.log(model["metrics"])
        run.finish()

    return model


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/opt/calm-api/model/coef.json")
    ap.add_argument("--cap", type=int, default=5, help="클라이언트당 세션 상한")
    ap.add_argument("--no-wandb", action="store_true")
    a = ap.parse_args()

    from calm_ml import bq
    df = bq.read_sql_file(str(SQL), cap=a.cap)
    m = fit_and_export(df, a.out, log_wandb=not a.no_wandb)
    print(json.dumps(m["metrics"], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd ml && uv run pytest tests/test_train_churn.py -v`
Expected: 5 passed.

`ml/tests/` 에서 `train_churn` 을 import 하려면 `ml/` 이 `sys.path` 에 있어야 한다. 안 잡히면 `ml/pyproject.toml` 에 추가한다:

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

- [ ] **Step 5: 실제 데이터로 한 번 돌려본다**

Run: `cd ml && uv run python train_churn.py --out /tmp/coef.json --no-wandb`
Expected: metrics JSON 출력. **`auc_ci_low` 가 0.60 미만이어도 계속 진행한다** — 설계서 §12 가 "모델이 기준 미달이어도 파이프라인은 유지한다"고 정해 놨다. 숫자는 기록만 하고 사용자에게 보고한다.

- [ ] **Step 6: 커밋**

```bash
git add ml/train_churn.py ml/tests/test_train_churn.py ml/pyproject.toml
git commit -m "$(cat <<'MSG'
Feat: 🎓 이탈 예측 학습 — GroupKFold + 부트스트랩 CI → coef.json

누수 컬럼을 극단값으로 바꿔도 계수가 안 변하는지 테스트로 고정.
계수 파일은 원자적 교체 — API 가 반쯤 쓰인 파일을 읽지 않게.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---
## Task 5: 추론 API — /predict · 계수 핫리로드 · JSONL 적립

**Files:**
- Create: `ml/api/churn.py`
- Create: `ml/tests/test_churn_api.py`

**Interfaces:**
- Consumes: `coef.json`(Task 4 형식), `js/features.js` 의 키 이름
- Produces: HTTP 계약 —
  - 요청 `POST /predict` `{ features: {...}, trigger: "time15"|"quest", session_id: str, client_id: str, variant: str }`
  - 응답 `200 { p: float, intervene: bool, model_version: str, threshold: float }`
  - 모델 없음/꺼짐 → `200 { p: null, intervene: false, model_version: "none", threshold: null }` (**5xx 가 아니다** — 클라이언트가 fail-open 으로 조용히 넘어가면 되고, 500 은 브라우저 콘솔을 더럽힌다)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`ml/tests/test_churn_api.py`:

```python
"""추론 API 계약·핫리로드·적립을 검증한다."""
import json
import math
import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import api.churn as churn

FEATS = {
    "path_len": 12.0, "net_disp": 4.0, "wander_ratio": 3.0, "yaw_total": 2.0,
    "mouse_travel": 300.0, "idle_ratio": 0.4, "is_first_session": 1, "trigger_kind": 0,
}


def make_model(version="v1", coef=None, enabled=True, threshold=0.5):
    order = churn.FEATURE_ORDER
    return {
        "model_version": version,
        "feature_order": order,
        "coef": coef or [0.0] * len(order),
        "intercept": 0.0,
        "scaler": {"mean": [0.0] * len(order), "scale": [1.0] * len(order)},
        "impute": {"wander_ratio": 3.2},
        "threshold": threshold,
        "enabled": enabled,
        "metrics": {},
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(churn, "MODEL_PATH", tmp_path / "coef.json")
    monkeypatch.setattr(churn, "LOG_DIR", tmp_path / "log")
    churn._reset_cache()
    app = FastAPI()
    app.include_router(churn.router)
    return TestClient(app)


def test_no_model_returns_null_not_error(client):
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s1", "client_id": "c1", "variant": "control"})
    assert r.status_code == 200, "모델이 없어도 5xx 를 내지 않는다"
    assert r.json()["p"] is None
    assert r.json()["intervene"] is False


def test_scores_with_model(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s1", "client_id": "c1", "variant": "control"})
    body = r.json()
    assert body["model_version"] == "v1"
    assert body["p"] == pytest.approx(0.5), "계수 0 · 절편 0 → sigmoid(0) = 0.5"


def test_sigmoid_matches_manual_dot_product(client, tmp_path):
    coef = [0.1, -0.2, 0.0, 0.0, 0.0, 1.5, 0.0, 0.0]
    (tmp_path / "coef.json").write_text(json.dumps(make_model(coef=coef)))
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s1", "client_id": "c1", "variant": "control"})
    z = 0.1 * 12.0 + (-0.2) * 4.0 + 1.5 * 0.4
    assert r.json()["p"] == pytest.approx(1 / (1 + math.exp(-z)), abs=1e-9)


def test_threshold_drives_intervene(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model(threshold=0.4)))
    assert client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()["intervene"] is True
    (tmp_path / "coef.json").write_text(json.dumps(make_model(version="v2", threshold=0.9)))
    time.sleep(0.01)
    assert client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()["intervene"] is False


def test_hot_reload_on_mtime_change(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model(version="v1")))
    assert client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()["model_version"] == "v1"
    time.sleep(0.01)
    (tmp_path / "coef.json").write_text(json.dumps(make_model(version="v2")))
    assert client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()["model_version"] == "v2", \
        "재시작 없이 갈려야 한다"


def test_disabled_model_does_not_intervene(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model(enabled=False)))
    body = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()
    assert body["intervene"] is False, "enabled=false 는 배포 없이 끄는 스위치"


def test_null_wander_ratio_is_imputed(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    f = dict(FEATS, wander_ratio=None)
    r = client.post("/predict", json={"features": f, "trigger": "time15",
                                      "session_id": "s", "client_id": "c", "variant": "x"})
    assert r.status_code == 200
    assert r.json()["p"] is not None


def test_appends_jsonl_row(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    client.post("/predict", json={"features": FEATS, "trigger": "quest",
                                  "session_id": "sess-9", "client_id": "cl-9", "variant": "beta_A"})
    files = list((tmp_path / "log").glob("*.jsonl"))
    assert len(files) == 1
    row = json.loads(files[0].read_text().strip())
    assert row["session_id"] == "sess-9"
    assert row["trigger"] == "quest"
    assert row["features"]["path_len"] == 12.0
    assert "p" in row and "at" in row and "origin" in row


def test_unknown_feature_key_is_rejected(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    r = client.post("/predict", json={"features": dict(FEATS, evil=1), "trigger": "time15",
                                      "session_id": "s", "client_id": "c", "variant": "x"})
    assert r.status_code == 422, "모르는 피처 키는 거부한다 — 적립 파일이 오염된다"


def test_corrupt_model_file_falls_back_to_null(client, tmp_path):
    (tmp_path / "coef.json").write_text("{ 이건 JSON 이 아니다")
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s", "client_id": "c", "variant": "x"})
    assert r.status_code == 200
    assert r.json()["p"] is None
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd ml && uv run pytest tests/test_churn_api.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'api.churn'`

- [ ] **Step 3: 구현한다**

`ml/api/churn.py`:

```python
# =============================================================
#  calm forest · 세션 이탈 예측 추론 — /predict
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §6·§9
#
#  ▶ 계수는 coef.json 에서 온다(Airflow DAG 가 주 1회 갈아끼운다).
#    요청마다 mtime 만 확인하고, 바뀌었을 때만 다시 읽는다 — 재시작 불필요.
#  ▶ 받은 피처는 JSONL 로 적립한다. 이게 다음 주 학습 표본이 되고,
#    "판정에 실제로 쓴 값"이 그대로 쌓이므로 학습/서빙 스큐가 생기지 않는다.
#  ▶ 모델이 없거나 깨졌거나 꺼져 있으면 200 + p=null 로 답한다.
#    5xx 를 내면 브라우저 콘솔만 더러워지고 클라이언트가 할 일은 똑같다(개입 안 함).
#
#  ⚠️ 이 엔드포인트는 인증이 없다. 방어는 여기가 아니라 학습 조인에서 한다 —
#     적립 행 중 session_id 가 game_logs 에 실재하는 것만 학습에 쓴다(계획 결정 #2).
# =============================================================
from __future__ import annotations

import json
import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

log = logging.getLogger("churn")
router = APIRouter()

# js/features.js 의 FEATURE_ORDER · ml/train_churn.py 의 FEATURE_ORDER 와 동일 순서
FEATURE_ORDER = [
    "path_len", "net_disp", "wander_ratio", "yaw_total",
    "mouse_travel", "idle_ratio", "is_first_session", "trigger_kind",
]

MODEL_PATH = Path(os.environ.get("CHURN_MODEL_PATH", "/opt/calm-api/model/coef.json"))
LOG_DIR = Path(os.environ.get("CHURN_LOG_DIR", "/opt/calm-api/data"))

_cache: dict | None = None
_cache_mtime: float | None = None


def _reset_cache() -> None:
    """테스트에서 모델 캐시를 비운다."""
    global _cache, _cache_mtime
    _cache = None
    _cache_mtime = None


def _load_model() -> dict | None:
    """mtime 이 바뀌었을 때만 다시 읽는다. 깨져 있으면 None."""
    global _cache, _cache_mtime
    try:
        mtime = MODEL_PATH.stat().st_mtime
    except OSError:
        _cache, _cache_mtime = None, None
        return None
    if _cache is not None and _cache_mtime == mtime:
        return _cache
    try:
        m = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
        if m.get("feature_order") != FEATURE_ORDER:
            log.error("coef.json 의 feature_order 가 API 와 다르다 — 무시한다: %s", m.get("feature_order"))
            _cache, _cache_mtime = None, mtime
            return None
        _cache, _cache_mtime = m, mtime
        log.info("모델 로드 %s", m.get("model_version"))
        return m
    except (json.JSONDecodeError, OSError) as e:
        log.error("coef.json 을 읽지 못했다: %s", e)
        _cache, _cache_mtime = None, mtime
        return None


class Features(BaseModel):
    # extra='forbid' — 모르는 키가 오면 422. 적립 파일이 오염되지 않게 한다.
    model_config = ConfigDict(extra="forbid")
    path_len: float
    net_disp: float
    wander_ratio: float | None       # net_disp == 0 이면 클라이언트가 null 을 보낸다
    yaw_total: float
    mouse_travel: float
    idle_ratio: float
    is_first_session: int
    trigger_kind: int


class PredictIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    features: Features
    trigger: str = Field(pattern="^(time15|quest)$")
    session_id: str = Field(max_length=128)
    client_id: str = Field(max_length=128)
    variant: str = Field(max_length=32)


class PredictOut(BaseModel):
    p: float | None
    intervene: bool
    model_version: str
    threshold: float | None


def _score(model: dict, feats: dict) -> float:
    """표준화 → 내적 → 시그모이드. train_churn.py 의 LogisticRegression 과 같은 계산."""
    impute = model.get("impute", {})
    mean = model["scaler"]["mean"]
    scale = model["scaler"]["scale"]
    z = float(model["intercept"])
    for i, name in enumerate(FEATURE_ORDER):
        v = feats.get(name)
        if v is None:
            v = impute.get(name, 0.0)
        z += model["coef"][i] * ((float(v) - mean[i]) / scale[i])
    # overflow 방어 — 극단값이 와도 죽지 않는다
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-min(z, 700.0)))
    e = math.exp(max(z, -700.0))
    return e / (1.0 + e)


def _append_row(row: dict) -> None:
    """일자별 JSONL 에 한 줄 붙인다. 적립 실패가 응답을 막지 않는다."""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with (LOG_DIR / f"churn-{day}.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    except OSError as e:
        log.error("적립 실패: %s", e)


@router.post("/predict", response_model=PredictOut)
def predict(body: PredictIn, request: Request) -> PredictOut:
    model = _load_model()
    feats = body.features.model_dump()

    p: float | None = None
    version = "none"
    threshold: float | None = None
    intervene = False

    if model is not None:
        version = model.get("model_version", "unknown")
        threshold = float(model.get("threshold", 0.5))
        p = _score(model, feats)
        intervene = bool(model.get("enabled", True)) and p >= threshold

    _append_row({
        "at": datetime.now(timezone.utc).isoformat(),
        "session_id": body.session_id,
        "client_id": body.client_id,
        "variant": body.variant,
        "trigger": body.trigger,
        "features": feats,
        "p": p,
        "intervene": intervene,
        "model_version": version,
        # CORS 는 보안 경계가 아니다 — 오리진을 가리지 않고 어떤 오리진이 오는지 남긴다
        # (선례: toss-auth/src/index.js). 토스 웹뷰의 실제 오리진도 이걸로 알게 된다.
        "origin": request.headers.get("origin", ""),
        "ua": (request.headers.get("user-agent") or "")[:120],
    })

    return PredictOut(p=p, intervene=intervene, model_version=version, threshold=threshold)
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd ml && uv run pytest tests/test_churn_api.py -v`
Expected: 10 passed.

`ml/api/__init__.py` 가 없어 `import api.churn` 이 실패하면 빈 파일로 만든다: `touch ml/api/__init__.py`

- [ ] **Step 5: 커밋**

```bash
git add ml/api/churn.py ml/api/__init__.py ml/tests/test_churn_api.py
git commit -m "$(cat <<'MSG'
Feat: 🔮 /predict — 계수 핫리로드 + JSONL 적립

mtime 만 보고 재시작 없이 모델을 갈아끼운다.
모델이 없거나 깨져도 200 + p=null — 클라이언트는 조용히 개입을 건너뛴다.
받은 피처를 그대로 적립해 학습/서빙 스큐를 없앤다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Task 6: 앱 조립 — 스텁 제거 · CORS · 헬스

**Files:**
- Modify: `ml/api/main.py` (전면 교체 — 기존 `/predict` 스텁은 타깃이 `d1_return_prob` 이라 이번 설계와 다르다)
- Create: `ml/tests/test_main_app.py`

**Interfaces:**
- Consumes: `api.churn.router`
- Produces: `app` — uvicorn 진입점 `api.main:app`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`ml/tests/test_main_app.py`:

```python
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_predict_route_is_mounted():
    r = client.post("/predict", json={
        "features": {"path_len": 1.0, "net_disp": 1.0, "wander_ratio": 1.0, "yaw_total": 1.0,
                     "mouse_travel": 1.0, "idle_ratio": 0.0, "is_first_session": 0, "trigger_kind": 0},
        "trigger": "time15", "session_id": "s", "client_id": "c", "variant": "control"})
    assert r.status_code == 200, "라우터가 등록되지 않았다"


def test_old_stub_is_gone():
    """d1_return_prob 스텁이 남아 있으면 안 된다 — 이번 설계와 타깃이 다르다."""
    assert "d1_return_prob" not in (client.post("/predict", json={
        "features": {"path_len": 1.0, "net_disp": 1.0, "wander_ratio": 1.0, "yaw_total": 1.0,
                     "mouse_travel": 1.0, "idle_ratio": 0.0, "is_first_session": 0, "trigger_kind": 0},
        "trigger": "time15", "session_id": "s", "client_id": "c", "variant": "control"}).text)


def test_cors_allows_any_origin():
    """CORS 는 보안 경계가 아니다 — 토스 웹뷰 오리진을 미리 알 수 없어 가리지 않는다."""
    r = client.options("/predict", headers={
        "Origin": "https://알수없는웹뷰.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"})
    assert r.status_code in (200, 204)
    assert r.headers.get("access-control-allow-origin") == "*"
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd ml && uv run pytest tests/test_main_app.py -v`
Expected: FAIL — 기존 스텁이 `SessionFeatures`(playtime_sec 등)를 요구해 422.

- [ ] **Step 3: 구현한다**

`ml/api/main.py` **전체를 교체**한다:

```python
# =============================================================
#  calm forest · 모델 서빙 API (FastAPI)
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §6
#
#  ▶ 로컬:  cd ml && uv run uvicorn api.main:app --reload --port 8100
#  ▶ 운영:  오라클 VM 의 docker compose 서비스 'api' (infra/airflow/docker-compose.yml)
#           앞단은 nginx(lab.calmforest.cloud) — /predict, /health 만 넘어온다
# =============================================================
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.churn import router as churn_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="calm-forest ml api", version="1.0.0")

# CORS 는 보안 경계가 아니다 — 앱인토스 웹뷰의 오리진을 미리 알 수 없고,
# 오리진을 가려봐야 브라우저 밖 호출은 어차피 막지 못한다.
# 대신 어떤 오리진이 오는지 churn.py 가 적립 행에 남긴다.
# (선례: toss-auth/src/index.js 의 corsHeaders — 같은 판단으로 운영 중)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(churn_router)


@app.get("/health")
def health() -> dict:
    """nginx·컨테이너 헬스체크용. 모델 유무와 무관하게 200 이어야 한다."""
    return {"ok": True}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd ml && uv run pytest tests/ -v`
Expected: 전부 통과(BQ 를 치는 `test_trigger_sample.py` 포함 — ADC 가 없으면 그 파일만 실패하며, 그건 인증 문제이지 코드 문제가 아니다).

- [ ] **Step 5: 커밋**

```bash
git add ml/api/main.py ml/tests/test_main_app.py
git commit -m "$(cat <<'MSG'
Feat: 🔌 서빙 앱 조립 — d1_return_prob 스텁 제거

스텁은 타깃이 달라(D1 복귀) 이번 설계와 섞이면 안 된다.
CORS 는 열어두고 오리진은 적립 행에 남긴다 — toss-auth 와 같은 판단.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---
## Task 7: VM 배포 — api 컨테이너 · nginx 경로

**설계서 §10 과의 의도적 차이:** 설계서는 `infra/airflow/docker-compose.yml` 에 api 서비스를
추가한다고 적었지만, **별도 스택 `infra/api/` 로 분리한다.** Airflow 는 2주 무중단으로 돌고 있고,
API 를 고칠 때마다 그 compose 를 건드리면 스케줄러까지 재시작 위험에 든다. Airflow 쪽은
**볼륨 두 줄과 환경변수 한 줄만** 추가한다.

**Files:**
- Create: `infra/api/Dockerfile`, `infra/api/docker-compose.yml`, `infra/api/README.md`
- Modify: `infra/airflow/docker-compose.yml`, `infra/airflow/Dockerfile`, `infra/airflow/nginx/airflow.conf`

- [ ] **Step 1: API 이미지와 스택을 쓴다**

`infra/api/Dockerfile`:

```dockerfile
# calm forest · 추론 API — 런타임 의존성만(학습 패키지는 Airflow 이미지에 있다)
FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir "fastapi>=0.115" "uvicorn[standard]>=0.32" "pydantic>=2.9"

# 코드는 이미지에 굽지 않고 바인드 마운트한다 — 한 줄 고칠 때마다 재빌드하지 않기 위해.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8100"]
```

`infra/api/docker-compose.yml`:

```yaml
# calm forest · 추론 API 스택 — Airflow 와 분리해 서로의 재시작에 영향을 주지 않는다.
# 배포 위치: /opt/calm-api  ·  코드: app/  ·  계수: model/  ·  적립: data/
services:
  api:
    build: .
    image: calm-forest/churn-api:1.0.0
    restart: unless-stopped
    environment:
      CHURN_MODEL_PATH: /opt/calm-api/model/coef.json
      CHURN_LOG_DIR: /opt/calm-api/data
    volumes:
      - ./app:/app:ro                    # ml/api · ml/calm_ml 을 올린 것
      - ./model:/opt/calm-api/model:ro   # Airflow 가 coef.json 을 쓰는 곳
      - ./data:/opt/calm-api/data        # 적립 JSONL — Airflow 가 읽어 BQ 로 올린다
    ports:
      - "127.0.0.1:8100:8100"            # 외부 노출은 nginx 가 한다. 직접 열지 않는다
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request;urllib.request.urlopen('http://localhost:8100/health')"]
      interval: 30s
      timeout: 5s
      retries: 3
```

`infra/api/README.md`:

```markdown
# 추론 API 배포 (오라클 VM)

Airflow 와 **별도 스택**이다. 서로의 재시작에 영향받지 않는다.

## 최초 1회
    ssh oracle-calmforest 'sudo mkdir -p /opt/calm-api/{app,model,data} && sudo chown -R ubuntu:ubuntu /opt/calm-api'
    scp infra/api/Dockerfile infra/api/docker-compose.yml oracle-calmforest:/opt/calm-api/

## 코드 배포 (매번)
    ssh oracle-calmforest 'find /opt/calm-api/app -mindepth 1 -delete'
    scp -r ml/api ml/calm_ml oracle-calmforest:/opt/calm-api/app/
    ssh oracle-calmforest 'cd /opt/calm-api && sudo docker compose up -d --build'

## 확인
    curl -s https://lab.calmforest.cloud/health   # {"ok":true}

계수(`model/coef.json`)는 Airflow DAG 가 쓴다. 손으로 두지 않는다.
```

- [ ] **Step 2: Airflow 쪽에 공유 볼륨과 자격증명 경로를 더한다**

`infra/airflow/docker-compose.yml` 의 `x-airflow-common.volumes` 에 2줄 추가:

```yaml
    # 🎯 이탈 예측 — 학습 산출물(coef.json)을 API 가 읽는 위치에 쓴다
    - /opt/calm-api/model:/opt/calm-api/model
    # 🎯 이탈 예측 — API 가 적립한 JSONL 을 읽어 BQ 로 올린다
    - /opt/calm-api/data:/opt/calm-api/data
```

같은 파일 `x-airflow-common.environment` 에 1줄 추가:

```yaml
    # calm_ml/bq.py 는 ADC 를 쓴다. VM 엔 ADC 가 없으므로 SA 키를 ADC 로 승격시킨다.
    GOOGLE_APPLICATION_CREDENTIALS: /opt/airflow/secrets/gcp_sa.json
```

`infra/airflow/Dockerfile` 의 `pip install` 을 학습 패키지까지 포함하도록 바꾼다:

```dockerfile
RUN pip install --no-cache-dir \
      "google-cloud-bigquery>=3.25,<4" \
      "gspread>=6.1,<7" \
      "db-dtypes>=1.3" \
      "scikit-learn>=1.5" \
      "pandas>=2.2" \
      "wandb>=0.19"
```

- [ ] **Step 3: nginx 에 경로를 연다**

`infra/airflow/nginx/airflow.conf` 의 `location / { ... }` **앞에** 두 블록을 넣는다:

```nginx
    # 🎯 이탈 예측 추론 — Airflow(8080)가 아니라 API(8100)로 보낸다
    location = /predict {
        proxy_pass http://127.0.0.1:8100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        # 게임이 800ms 에 끊는다. 서버가 그보다 오래 붙들고 있을 이유가 없다.
        proxy_read_timeout 5s;
    }

    location = /health {
        proxy_pass http://127.0.0.1:8100;
        proxy_set_header Host $host;
        access_log off;
    }
```

⚠️ `= /predict` 는 **정확히 일치** 매칭이라 Airflow 웹UI 경로를 가리지 않는다.

- [ ] **Step 4: 배포하고 살아있는지 확인한다**

```bash
ssh oracle-calmforest 'sudo mkdir -p /opt/calm-api/{app,model,data} && sudo chown -R ubuntu:ubuntu /opt/calm-api'
scp infra/api/Dockerfile infra/api/docker-compose.yml oracle-calmforest:/opt/calm-api/
scp -r ml/api ml/calm_ml oracle-calmforest:/opt/calm-api/app/
ssh oracle-calmforest 'cd /opt/calm-api && sudo docker compose up -d --build'
scp infra/airflow/nginx/airflow.conf oracle-calmforest:/tmp/
ssh oracle-calmforest 'sudo mv /tmp/airflow.conf /etc/nginx/sites-available/airflow && sudo nginx -t && sudo systemctl reload nginx'
```

검증:

```bash
curl -s https://lab.calmforest.cloud/health
# {"ok":true}
```

```bash
curl -s -X POST https://lab.calmforest.cloud/predict -H 'Content-Type: application/json' -d '{"features":{"path_len":12,"net_disp":4,"wander_ratio":3,"yaw_total":2,"mouse_travel":300,"idle_ratio":0.4,"is_first_session":1,"trigger_kind":0},"trigger":"time15","session_id":"smoke","client_id":"smoke","variant":"control"}'
# 계수가 아직 없으므로 {"p":null,"intervene":false,"model_version":"none","threshold":null}
```

⚠️ **Airflow 가 여전히 뜨는지 반드시 확인한다** — 볼륨·Dockerfile 을 건드렸다:

```bash
ssh oracle-calmforest 'cd /opt/airflow && sudo docker compose up -d --build' && sleep 20 && ssh oracle-calmforest 'sudo docker ps --format "{{.Names}}\t{{.Status}}"'
```

Airflow 3개 컨테이너가 살아 있고 `https://lab.calmforest.cloud/` 가 200/302 를 내야 한다.
아니면 **멈추고 사용자에게 보고한다** — 돌아가던 것을 깨는 건 이 계획의 범위가 아니다.

- [ ] **Step 5: 커밋**

```bash
git add infra/api infra/airflow/docker-compose.yml infra/airflow/Dockerfile infra/airflow/nginx/airflow.conf
git commit -m "$(cat <<'MSG'
Feat: 🚢 추론 API 배포 — Airflow 와 별도 스택 + nginx /predict

api 를 airflow compose 에 넣지 않는다. 2주 무중단으로 도는 스케줄러를
API 고칠 때마다 재시작 위험에 두지 않기 위해서다.
공유는 볼륨 두 개(model·data)로만 한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---
## Task 8: 클라이언트 예측기 — 트리거 · fail-open · 개입 규칙

**Files:**
- Create: `js/predict.js`
- Modify: `js/tuning.js`
- Create: `tests/predict.test.mjs`

**Interfaces:**
- Consumes: `js/features.js`(`computeFeatures`, `WINDOW_SIZE`)
- Produces:
  - `createPredictor(deps) -> { onTrigger(kind: 'time15'|'quest'): Promise<void>, reset(): void }`
  - `pickIntervention(gameState) -> {ico,title,line}|null` — 규칙, 모델 아님

`deps` 는 전부 주입한다(테스트에서 네트워크·게임 없이 돌리기 위해):
`{ getWindow, fetchImpl, session:{id,clientId,variant,isFirstSession}, gameState, showBanner, track, endpoint, maxPerSession, timeoutMs }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/predict.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPredictor, pickIntervention } from '../js/predict.js';

const fullWindow = () => Array.from({ length: 10 }, (_, i) => ({
  char_x: i, char_z: 0, cam_yaw: i * 0.1, mouse_x: i * 3, mouse_y: 0,
}));

function harness(over = {}) {
  const calls = { fetch: [], banner: [], track: [] };
  const base = {
    getWindow: () => fullWindow(),
    fetchImpl: async () => ({ ok: true, json: async () => ({ p: 0.9, intervene: true, model_version: 'v1', threshold: 0.5 }) }),
    session: { id: 's1', clientId: 'c1', variant: 'beta_A', isFirstSession: true },
    gameState: { plantedUnwatered: 1, openQuests: 0, buildableHouse: false, doneKinds: ['chop_tree'] },
    showBanner: (b) => calls.banner.push(b),
    track: (n, p) => calls.track.push([n, p]),
    endpoint: 'https://x/predict',
    maxPerSession: 2,
    timeoutMs: 800,
    ...over,
  };
  const deps = { ...base, fetchImpl: async (...a) => { calls.fetch.push(a); return base.fetchImpl(...a); } };
  return { p: createPredictor(deps), calls };
}

const scoreEvent = (calls) => calls.track.find(([n]) => n === 'churn_score')[1];

test('윈도가 모자라면 호출하지 않는다', async () => {
  const { p, calls } = harness({ getWindow: () => fullWindow().slice(0, 4) });
  await p.onTrigger('time15');
  assert.equal(calls.fetch.length, 0);
  assert.equal(scoreEvent(calls).skipped, 'window');
});

test('점수를 받아 배너를 띄우고 이벤트를 남긴다', async () => {
  const { p, calls } = harness();
  await p.onTrigger('time15');
  assert.equal(calls.fetch.length, 1);
  assert.equal(calls.banner.length, 1);
  const e = scoreEvent(calls);
  assert.equal(e.p, 0.9);
  assert.equal(e.shown, true);
  assert.equal(e.trigger, 'time15');
  assert.equal(e.model_version, 'v1');
});

test('대조군은 점수를 내되 개입하지 않는다', async () => {
  const { p, calls } = harness({ session: { id: 's', clientId: 'c', variant: 'control', isFirstSession: false } });
  await p.onTrigger('time15');
  assert.equal(calls.fetch.length, 1, '전원 점수화 — 대조군도 호출한다');
  assert.equal(calls.banner.length, 0, '처치군만 개입한다');
  assert.equal(scoreEvent(calls).shown, false);
});

test('API 가 죽어도 게임은 진행한다 (fail-open)', async () => {
  const { p, calls } = harness({ fetchImpl: async () => { throw new Error('network down'); } });
  await assert.doesNotReject(() => p.onTrigger('time15'));
  assert.equal(calls.banner.length, 0);
  assert.equal(scoreEvent(calls).failed, true);
});

test('타임아웃이 나도 던지지 않는다', async () => {
  const { p, calls } = harness({
    timeoutMs: 10,
    fetchImpl: (url, opts) => new Promise((_, rej) => {
      opts.signal.addEventListener('abort', () => rej(new Error('aborted')));
    }),
  });
  await assert.doesNotReject(() => p.onTrigger('time15'));
  assert.equal(calls.banner.length, 0);
});

test('intervene=false 면 배너를 안 띄운다', async () => {
  const { p, calls } = harness({
    fetchImpl: async () => ({ ok: true, json: async () => ({ p: 0.1, intervene: false, model_version: 'v1', threshold: 0.5 }) }),
  });
  await p.onTrigger('time15');
  assert.equal(calls.banner.length, 0);
});

test('세션당 노출 상한을 넘지 않는다', async () => {
  const { p, calls } = harness({ maxPerSession: 2 });
  await p.onTrigger('time15');
  await p.onTrigger('quest');
  await p.onTrigger('quest');
  assert.equal(calls.banner.length, 2);
});

test('규칙 판정을 모델과 함께 기록한다 (베이스라인 비교용)', async () => {
  const { p, calls } = harness();
  await p.onTrigger('quest');
  assert.equal(scoreEvent(calls).rule, true);
});

// ── 개입 문구 규칙 ──────────────────────────────────────────
test('미완이 있으면 그걸 먼저 짚는다', () => {
  const b = pickIntervention({ plantedUnwatered: 2, openQuests: 1, buildableHouse: true, doneKinds: [] });
  assert.match(b.line, /물/, '1순위는 심어놓고 물 안 준 것');
});

test('미완이 없으면 안 해본 것을 권한다', () => {
  const b = pickIntervention({ plantedUnwatered: 0, openQuests: 0, buildableHouse: false, doneKinds: ['chop_tree'] });
  assert.ok(b && b.line.length > 0);
});

test('할 게 하나도 없으면 null (배너를 띄우지 않는다)', () => {
  const all = ['chop_tree', 'fish_success', 'harvest', 'cook', 'carve', 'mine'];
  assert.equal(pickIntervention({ plantedUnwatered: 0, openQuests: 0, buildableHouse: false, doneKinds: all }), null);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test 'tests/predict.test.mjs'`
Expected: FAIL — `Cannot find module '../js/predict.js'`

- [ ] **Step 3: 구현한다**

`js/predict.js`:

```js
// =============================================================
//  calm forest · 세션 이탈 예측 — 트리거 판정 · 추론 호출 · 개입
//  ------------------------------------------------------------
//  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §6~§8
//
//  ▶ 피처 계산은 features.js(순수 함수), 점수는 서버(lab.calmforest.cloud/predict).
//  ▶ 무엇을 띄울지는 모델이 아니라 규칙이다 — 미완 여부는 gameState 에 사실로 있다.
//  ▶ 전원 점수화, 처치군만 개입. 그래야 모델이 아니라 '개입 효과'가 측정된다.
//  ▶ 실패는 전부 조용히 넘어간다(fail-open). 배너 하나 못 띄우는 게 손해의 전부다.
//
//  ⚠️ platform.js 를 import 하지 않는다 — experiment 브랜치에 그 파일이 없다.
// =============================================================
import { computeFeatures, WINDOW_SIZE } from './features.js';

/** 처치군인가 — A/B 배정은 supabase-client 의 variant 를 그대로 쓴다. */
function isTreatment(variant) { return variant === 'beta_A'; }

/**
 * 무엇을 띄울지 정하는 규칙. 모델을 쓰지 않는다.
 * 1순위 미완 짚기 → 2순위 아직 안 해본 것.
 * @returns {{ico:string,title:string,line:string}|null} 권할 게 없으면 null
 */
export function pickIntervention(gs) {
  if (!gs) return null;

  // 1순위 — 이미 벌여놓고 안 끝낸 것
  if (gs.plantedUnwatered > 0) return { ico: '💧', title: '물 줄 때가 됐어요', line: '심어둔 작물이 목말라요.' };
  if (gs.openQuests > 0)       return { ico: '📜', title: '받아둔 부탁이 있어요', line: '마을 사람이 기다리는 중이에요.' };
  if (gs.buildableHouse)       return { ico: '🏠', title: '집을 지을 수 있어요', line: '재료가 다 모였어요.' };

  // 2순위 — 아직 안 해본 것 중 흔한 것(전역 인기순 고정 목록)
  const done = new Set(gs.doneKinds || []);
  const candidates = [
    ['chop_tree',    { ico: '🪓', title: '나무를 베어볼까요', line: '집 재료가 돼요.' }],
    ['fish_success', { ico: '🎣', title: '낚시 어때요',       line: '물가에서 던져보세요.' }],
    ['harvest',      { ico: '🌾', title: '수확할 게 있어요',   line: '밭을 살펴보세요.' }],
    ['cook',         { ico: '🍳', title: '요리해볼까요',       line: '주방에서 만들 수 있어요.' }],
    ['carve',        { ico: '🗿', title: '조각을 해볼까요',    line: '작업대에서 깎을 수 있어요.' }],
    ['mine',         { ico: '⛏️', title: '광석을 캐볼까요',    line: '동굴에 광맥이 있어요.' }],
  ];
  for (const [kind, banner] of candidates) if (!done.has(kind)) return banner;
  return null;   // 다 해봤다 — 띄울 게 없다
}

/** 예측기. 의존성을 전부 주입받는다(테스트에서 네트워크·게임 없이 돌리기 위해). */
export function createPredictor(deps) {
  const {
    getWindow, fetchImpl, session, gameState, showBanner, track, endpoint,
    maxPerSession = 2, timeoutMs = 800,
  } = deps;

  let shownCount = 0;

  async function onTrigger(kind) {
    const rows = getWindow();

    // 윈도가 덜 찼으면 학습 때와 다른 입력이 된다 — 점수를 내지 않는다.
    if (!rows || rows.length < WINDOW_SIZE) {
      track('churn_score', { trigger: kind, skipped: 'window', variant: session.variant });
      return;
    }

    let feats;
    try {
      feats = computeFeatures(rows, { isFirstSession: !!session.isFirstSession, triggerKind: kind });
    } catch (e) {
      track('churn_score', { trigger: kind, skipped: 'features', variant: session.variant });
      return;
    }

    // 규칙 베이스라인 — "트리거 도달 = 무조건 개입". 모델과 비교하려고 같이 남긴다.
    const rule = true;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res = null;
    try {
      const r = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: feats,
          trigger: kind,
          session_id: session.id,
          client_id: session.clientId,
          variant: session.variant,
        }),
        signal: ctrl.signal,
        keepalive: true,        // 세션이 곧 끝날 수 있다 — 언로드 중에도 나가게
      });
      if (r && r.ok) res = await r.json();
    } catch (e) {
      // 네트워크·타임아웃·중단 — 전부 조용히 넘어간다(fail-open)
    } finally {
      clearTimeout(timer);
    }

    if (!res) {
      track('churn_score', { trigger: kind, failed: true, rule, variant: session.variant });
      return;
    }

    // 전원 점수화, 처치군만 개입
    let shown = false;
    if (res.intervene && isTreatment(session.variant) && shownCount < maxPerSession) {
      const banner = pickIntervention(gameState);
      if (banner) { showBanner(banner); shownCount++; shown = true; }
    }

    track('churn_score', {
      p: res.p, trigger: kind, rule, variant: session.variant,
      shown, threshold: res.threshold, model_version: res.model_version,
    });
  }

  return { onTrigger, reset() { shownCount = 0; } };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test 'tests/**/*.test.mjs'`
Expected: 19 pass (Task 2 의 5 + Task 3 의 3 + 여기 11), 0 fail.

- [ ] **Step 5: 파라미터를 tuning.js 로 뺀다**

`js/tuning.js` 의 `TUNING` 객체 안, `TUT_ORDER_A` 다음에 추가:

```js
  // 🎯 이탈 예측 개입 — 임계값·on/off 는 서버(coef.json)에 있다. 여기는 클라이언트 값만.
  churn: {
    endpoint: 'https://lab.calmforest.cloud/predict',
    timeoutMs: 800,        // 넘으면 개입 없이 진행(fail-open)
    maxPerSession: 2,      // 세션당 배너 노출 상한
    timeTriggerSec: 15,    // 시간 트리거 — 설계서 §3-1(커버리지 84%)
  },
```

- [ ] **Step 6: 커밋**

```bash
git add js/predict.js js/tuning.js tests/predict.test.mjs
git commit -m "$(cat <<'MSG'
Feat: 🎯 클라이언트 예측기 — 트리거 · fail-open · 개입 규칙

전원 점수화하고 처치군만 개입한다. 그래야 모델이 아니라 개입 효과가 측정된다.
무엇을 띄울지는 모델이 아니라 gameState 규칙 — 미완은 추정할 필요가 없다.
규칙 판정을 모델 점수와 같이 남겨 나중에 베이스라인 비교가 되게 한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---
## Task 9: 게임 배선 — 트리거 3+1 지점 · gameState 어댑터

**Files:**
- Modify: `js/game.js` — import 추가(26행 근처), 어댑터·예측기 생성, 트리거 호출 4곳
- Create: `tests/game-state-adapter.test.mjs`

**Interfaces:**
- Consumes: `createPredictor`, `pickIntervention`(Task 8), `getWindow`(Task 3), `TUNING.churn`(Task 8)
- Produces: `buildGameStateSnapshot(sources) -> {plantedUnwatered, openQuests, buildableHouse, doneKinds}`
  — `js/predict.js` 의 `pickIntervention` 이 받는 모양

**확인된 게임 상태 (조사 완료):**

| 필요한 값 | 원천 | 확인 위치 |
|---|---|---|
| `plantedUnwatered` | 런타임 배열 `plots` 의 `p.state==='growing' && !p.watered` | `js/game.js:1074`, `:7803`, `:7859` |
| `openQuests` | NPC 퀘스트 상태 `st.acceptedAt != null` 인 NPC 수 | `js/game.js:8735`, `:8760` |
| `buildableHouse` | `gameState.houseStage < MAX_HOUSE_STAGE` 이고 재료 충족 | `js/game.js:1401`, `:4389` |
| `doneKinds` | `gameState.dex` 카테고리별 비어있지 않음 | `js/game.js:1491` |

- [ ] **Step 1: 어댑터 테스트를 쓴다**

`tests/game-state-adapter.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGameStateSnapshot } from '../js/predict.js';

test('물 안 준 자라는 작물만 센다', () => {
  const s = buildGameStateSnapshot({
    plots: [
      { state: 'growing', watered: false },
      { state: 'growing', watered: true },
      { state: 'empty',   watered: false },   // 빈 밭은 세지 않는다
      { state: 'mature',  watered: false },   // 다 자란 건 물이 필요없다
    ],
    questStates: [], houseStage: 0, maxHouseStage: 4, houseReady: false, dex: {},
  });
  assert.equal(s.plantedUnwatered, 1);
});

test('수락했고 아직 완료 안 한 퀘스트를 센다', () => {
  const s = buildGameStateSnapshot({
    plots: [],
    questStates: [{ acceptedAt: 123 }, { acceptedAt: null }, { acceptedAt: 456 }],
    houseStage: 0, maxHouseStage: 4, houseReady: false, dex: {},
  });
  assert.equal(s.openQuests, 2);
});

test('최종 단계면 지을 집이 없다', () => {
  const s = buildGameStateSnapshot({
    plots: [], questStates: [], houseStage: 4, maxHouseStage: 4, houseReady: true, dex: {},
  });
  assert.equal(s.buildableHouse, false);
});

test('재료가 있고 단계가 남았으면 지을 수 있다', () => {
  const s = buildGameStateSnapshot({
    plots: [], questStates: [], houseStage: 1, maxHouseStage: 4, houseReady: true, dex: {},
  });
  assert.equal(s.buildableHouse, true);
});

test('도감이 비어있지 않은 카테고리를 해본 것으로 친다', () => {
  const s = buildGameStateSnapshot({
    plots: [], questStates: [], houseStage: 0, maxHouseStage: 4, houseReady: false,
    dex: { fish: { a: 1 }, crop: {}, ore: { b: 1 }, cook: {} },
  });
  assert.ok(s.doneKinds.includes('fish_success'));
  assert.ok(s.doneKinds.includes('mine'));
  assert.ok(!s.doneKinds.includes('harvest'));
  assert.ok(!s.doneKinds.includes('cook'));
});

test('빠진 입력에도 죽지 않는다', () => {
  const s = buildGameStateSnapshot({});
  assert.equal(s.plantedUnwatered, 0);
  assert.equal(s.openQuests, 0);
  assert.equal(s.buildableHouse, false);
  assert.deepEqual(s.doneKinds, []);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test 'tests/game-state-adapter.test.mjs'`
Expected: FAIL — `buildGameStateSnapshot` 이 export 되어 있지 않다.

- [ ] **Step 3: 어댑터를 `js/predict.js` 에 추가한다**

`js/predict.js` 끝에 붙인다:

```js
/**
 * 게임 런타임 값 → pickIntervention 이 읽는 모양.
 * game.js 의 내부 구조를 predict.js 가 알지 않도록 여기서 한 번 번역한다.
 * @param {{plots?:Array, questStates?:Array, houseStage?:number, maxHouseStage?:number,
 *          houseReady?:boolean, dex?:Object}} src
 */
export function buildGameStateSnapshot(src = {}) {
  const plots = src.plots || [];
  const questStates = src.questStates || [];
  const dex = src.dex || {};

  // 도감 카테고리 → 개입 후보의 kind. 비어있지 않으면 '해봤다'로 친다.
  const DEX_TO_KIND = { fish: 'fish_success', crop: 'harvest', ore: 'mine', cook: 'cook' };
  const doneKinds = [];
  for (const [cat, kind] of Object.entries(DEX_TO_KIND)) {
    if (dex[cat] && Object.keys(dex[cat]).length > 0) doneKinds.push(kind);
  }
  if ((src.houseStage || 0) > 0) doneKinds.push('chop_tree');   // 집을 지었으면 벌목은 했다

  return {
    plantedUnwatered: plots.filter(p => p && p.state === 'growing' && !p.watered).length,
    openQuests: questStates.filter(st => st && st.acceptedAt != null).length,
    buildableHouse: !!src.houseReady && (src.houseStage || 0) < (src.maxHouseStage || 0),
    doneKinds,
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test 'tests/**/*.test.mjs'`
Expected: 25 pass, 0 fail.

- [ ] **Step 5: `js/game.js` 에 배선한다**

먼저 NPC 퀘스트 상태 배열의 실제 접근 경로를 확인한다:

```bash
grep -n "st.acceptedAt" js/game.js
sed -n '540,560p' js/game.js     # st 가 어디서 오는지
```

import 추가(26행 `supabase-client` import 근처):

```js
import { createPredictor, buildGameStateSnapshot } from './predict.js';   // [🎯 이탈 예측]
import { getWindow } from './logger.js';                                   // [🎯 이탈 예측] 롤링 윈도
import { TUNING } from './tuning.js';
```

게임 시작부(`startLogging()` 을 호출하는 자리 근처)에 예측기를 만든다:

```js
// ── [🎯 이탈 예측] 트리거 시점에 점수를 받아 처치군에만 배너를 띄운다 ──────
//    설계서 §6~§8. 실패는 전부 조용히 넘어간다(fail-open).
let churnPredictor = null;
function initChurnPredictor() {
  churnPredictor = createPredictor({
    getWindow,
    fetchImpl: (...a) => fetch(...a),
    endpoint: TUNING.churn.endpoint,
    timeoutMs: TUNING.churn.timeoutMs,
    maxPerSession: TUNING.churn.maxPerSession,
    session: {
      id: authState.sessionId,
      clientId: authState.clientId,
      variant: authState.variant,
      // 첫 세션 판정 — 세이브가 없으면 첫 세션으로 본다
      isFirstSession: !gameState.houseStage && !Object.keys(gameState.dex?.fish || {}).length,
    },
    get gameState() {
      return buildGameStateSnapshot({
        plots,
        questStates: npcQuestStates(),      // ← Step 5 의 grep 으로 확인한 접근자로 바꾼다
        houseStage: gameState.houseStage,
        maxHouseStage: MAX_HOUSE_STAGE,
        houseReady: canBuildNextHouseStage(),  // ← 없으면 false 로 둔다(개입 후보에서 빠질 뿐)
        dex: gameState.dex,
      });
    },
    showBanner: (b) => ui.showHintBanner?.({ ico: b.ico, title: b.title, line: b.line, near: () => true }),
    track: (n, p) => trackEvent(n, p),
  });

  // 트리거 ① 접속 후 15초 — 한 번만
  setTimeout(() => churnPredictor?.onTrigger('time15'), TUNING.churn.timeTriggerSec * 1000);
}
```

⚠️ `createPredictor` 는 `deps.gameState` 를 **호출 시점에** 읽는다. 위처럼 getter 로 넘겨야
배너를 띄우는 순간의 상태가 반영된다. 값으로 넘기면 게임 시작 시점 상태로 굳는다.

트리거 ② 퀘스트 계열 — `trackEvent` 호출 **바로 뒤**에 한 줄씩 추가한다(3곳):

```js
// js/game.js:8710  trackEvent('npc_talk', ...) 다음 줄
churnPredictor?.onTrigger('quest');

// js/game.js:8740  trackEvent('quest_accept', ...) 다음 줄
churnPredictor?.onTrigger('quest');

// js/game.js:8759  trackEvent('quest_complete', ...) 다음 줄
churnPredictor?.onTrigger('quest');
```

세 이벤트는 설계서 §3-2 에서 신뢰구간이 완전히 겹쳐 **하나의 트리거로 묶기로** 했다.
`onTrigger` 는 `async` 지만 `await` 하지 않는다 — 게임 흐름을 막지 않기 위해서다.

- [ ] **Step 6: 브라우저에서 실제로 도는지 확인한다**

로컬 서버를 띄우고(`scripts/serve.py`) 게임을 연 뒤 개발자도구에서:

- 15초 뒤 `POST https://lab.calmforest.cloud/predict` 가 나가는가 (네트워크 탭)
- 응답이 `{"p":null,...}` 인가 (계수가 아직 없으므로 정상)
- 콘솔에 오류가 없는가
- NPC 와 대화하면 요청이 한 번 더 나가는가

⚠️ `js/config.js` 에 GA4 localhost 가드가 없다(원장 기록). 로컬로 열면 **실계정이 오염된다** —
확인은 GA4 측정 ID 를 잠시 비우고 하거나, 오염을 감수한 뒤 사용자에게 알린다.

- [ ] **Step 7: 커밋**

```bash
git add js/game.js js/predict.js tests/game-state-adapter.test.mjs
git commit -m "$(cat <<'MSG'
Feat: 🔗 게임에 이탈 예측 배선 — 15초 + 퀘스트 계열 3곳

퀘스트 수락·완료·NPC 대화는 신뢰구간이 완전히 겹쳐 하나의 트리거로 묶는다.
gameState 어댑터를 따로 둬서 predict.js 가 game.js 내부를 모르게 한다.
onTrigger 는 await 하지 않는다 — 게임 흐름을 막지 않는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Task 10: Airflow DAG — 주 1회 학습 + 야간 적립 업로드

**Files:**
- Create: `infra/airflow/dags/churn_train.py`
- Create: `ml/sql/churn_events_schema.json`

**Interfaces:**
- Consumes: `ml/train_churn.py`(`fit_and_export`), `/opt/calm-api/data/*.jsonl`(Task 5 적립분)
- Produces: `/opt/calm-api/model/coef.json`, BQ 테이블 `calm-forest.calm_forest_raw.churn_events`

- [ ] **Step 1: DAG 를 쓴다**

`infra/airflow/dags/churn_train.py`:

```python
# =============================================================
#  calm forest · 이탈 예측 — 주 1회 학습 + 야간 적립 업로드
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §5·§9
#
#  두 스케줄이 한 파일에 있다:
#    upload_events  매일 03:00  API 가 적립한 JSONL → BQ
#    train          매주 월 04:00  BQ → 학습 → coef.json (API 가 mtime 보고 핫리로드)
#
#  ⚠️ 학습 표본은 BQ 의 game_logs 에서 뽑는다. 적립 JSONL 은 '실제로 판정에 쓴 피처'의
#     기록이고, 다음 단계에서 학습 원천으로 옮길 예정이다(지금은 표본이 부족하다).
#     적립 행 중 session_id 가 game_logs 에 실재하는 것만 신뢰한다 — 그게 남용 방어다.
# =============================================================
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator

DATA_DIR = Path("/opt/calm-api/data")
MODEL_OUT = Path("/opt/calm-api/model/coef.json")
ML_DIR = Path("/opt/airflow/dags/ml")     # scp 로 올리는 ml/ 사본(train_churn.py·calm_ml·sql)

BQ_PROJECT = "calm-forest"
BQ_LOCATION = "asia-northeast3"
EVENTS_TABLE = f"{BQ_PROJECT}.calm_forest_raw.churn_events"

default_args = {"retries": 1, "retry_delay": timedelta(minutes=10)}


def _upload_events(**_):
    """어제치 JSONL 을 BQ 로 올리고, 올린 파일은 .done 으로 표시한다."""
    from google.cloud import bigquery

    files = sorted(p for p in DATA_DIR.glob("churn-*.jsonl") if not p.with_suffix(".done").exists())
    if not files:
        print("올릴 파일 없음")
        return

    rows = []
    for p in files:
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    if not rows:
        print("빈 파일만 있음")
        for p in files:
            p.with_suffix(".done").touch()
        return

    client = bigquery.Client(project=BQ_PROJECT, location=BQ_LOCATION)
    job = client.load_table_from_json(
        rows, EVENTS_TABLE,
        job_config=bigquery.LoadJobConfig(
            autodetect=True,
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        ),
    )
    job.result()
    for p in files:
        p.with_suffix(".done").touch()
    print(f"{len(rows)}행 적재 → {EVENTS_TABLE}")


def _train(**_):
    """BQ 표본으로 학습해 coef.json 을 원자적으로 교체한다."""
    sys.path.insert(0, str(ML_DIR))
    from calm_ml import bq                    # noqa: E402
    from train_churn import fit_and_export    # noqa: E402

    df = bq.read_sql_file(str(ML_DIR / "sql" / "churn_trigger_sample.sql"), cap=5)
    if len(df) < 100:
        # 표본이 무너지면 멀쩡히 돌던 모델을 덮어쓰지 않는다.
        raise ValueError(f"표본이 너무 작다({len(df)}행) — 기존 coef.json 을 지킨다")

    m = fit_and_export(df, MODEL_OUT, log_wandb=True)
    print(json.dumps(m["metrics"], indent=2, ensure_ascii=False))


with DAG(
    dag_id="churn_upload_events",
    description="🎯 이탈 예측 — API 적립 JSONL 을 BQ 로",
    start_date=datetime(2026, 9, 1),
    schedule="0 3 * * *",
    catchup=False,
    default_args=default_args,
    tags=["churn"],
) as dag_upload:
    PythonOperator(task_id="upload_events", python_callable=_upload_events)


with DAG(
    dag_id="churn_train",
    description="🎯 이탈 예측 — 주 1회 재학습 → coef.json",
    start_date=datetime(2026, 9, 1),
    schedule="0 4 * * 1",
    catchup=False,
    default_args=default_args,
    tags=["churn"],
) as dag_train:
    PythonOperator(task_id="train", python_callable=_train)
```

- [ ] **Step 2: 배포하고 손으로 한 번 돌린다**

```bash
ssh oracle-calmforest 'mkdir -p /opt/airflow/dags/ml/sql'
scp ml/train_churn.py oracle-calmforest:/opt/airflow/dags/ml/
scp -r ml/calm_ml oracle-calmforest:/opt/airflow/dags/ml/
scp ml/sql/churn_trigger_sample.sql oracle-calmforest:/opt/airflow/dags/ml/sql/
scp infra/airflow/dags/churn_train.py oracle-calmforest:/opt/airflow/dags/
```

```bash
ssh oracle-calmforest 'sudo docker exec airflow-airflow-scheduler-1 airflow dags list | grep churn'
ssh oracle-calmforest 'sudo docker exec airflow-airflow-scheduler-1 airflow dags test churn_train 2026-09-04'
```

Expected: metrics JSON 이 찍히고 `/opt/calm-api/model/coef.json` 이 생긴다.

그다음 API 가 **재시작 없이** 새 모델을 잡는지 확인한다:

```bash
curl -s -X POST https://lab.calmforest.cloud/predict -H 'Content-Type: application/json' -d '{"features":{"path_len":12,"net_disp":4,"wander_ratio":3,"yaw_total":2,"mouse_travel":300,"idle_ratio":0.4,"is_first_session":1,"trigger_kind":0},"trigger":"time15","session_id":"smoke","client_id":"smoke","variant":"control"}'
```

`model_version` 이 `none` 이 아니라 타임스탬프여야 한다. 여전히 `none` 이면
`ml/api/churn.py` 의 `_load_model()` 로그(`sudo docker logs calm-api-api-1`)를 본다 —
`feature_order` 불일치가 가장 흔한 원인이다.

- [ ] **Step 3: 커밋**

```bash
git add infra/airflow/dags/churn_train.py
git commit -m "$(cat <<'MSG'
Feat: ⏰ 이탈 예측 DAG — 야간 적립 업로드 + 주 1회 재학습

표본이 100행 미만이면 학습을 실패시킨다. 멀쩡히 돌던 계수를
무너진 표본으로 덮어쓰지 않기 위해서다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

## Task 11: 검증 노트북 — 베이스라인 · 판정

**Files:**
- Create: `ml/notebooks/04_churn_model.ipynb`

- [ ] **Step 1: 노트북을 만든다**

절 구성은 `plain-analysis-report` 형식을 따른다 —
`한 줄 답` → `(차트+설명+코드) × 논점` → `크기가 얼마나 되나` → `이 숫자로 말할 수 없는 것` → `다음에 확인할 것`.
마지막 두 절은 **비우지 않는다**. 차트는 `calm_ml.report` 의 팔레트·한글 폰트를 쓴다.

담을 것:

1. 표본 규모 — 트리거별 건수·이탈률, 클라이언트 수, cap 적용 전/후
2. 피처 단변량 — 이탈/잔존 분포 비교 8개
3. 베이스라인 2개 — 다수 클래스 · `path_len` 단독
4. 모델 — GroupKFold AUC + 부트스트랩 1,000회 CI
5. **판정** — 설계서 §12 기준(`auc_ci_low > 0.60`) 대비 결과. 미달이어도 파이프라인은 유지한다
6. 병기 — 사전등록 `CHURN_ANALYSIS_PLAN.md` §5 의 `span<180` 라벨로도 한 번 (축이 다르므로 참고용)

- [ ] **Step 2: 끝까지 실행하고 커밋**

```bash
cd ml && uv run jupyter nbconvert --execute --inplace notebooks/04_churn_model.ipynb
git add ml/notebooks/04_churn_model.ipynb
git commit -m "$(cat <<'MSG'
Feat: 📊 이탈 예측 모델 검증 — 베이스라인 대비 · 사전 기준 판정

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 3: 원장을 갱신한다**

`docs/ANALYSIS_GATES.md` 의 "지금 상태" 를 구현 완료 시점으로 바꾸고,
실측된 AUC·표본 규모·미달 여부를 적는다. 다음 세션이 여기만 보고 복원할 수 있어야 한다.

---

## 전체 검증 (모든 태스크 후)

- [ ] `node --test 'tests/**/*.test.mjs'` — 25 pass
- [ ] `cd ml && uv run pytest tests/ -v` — 전부 통과
- [ ] `curl -s https://lab.calmforest.cloud/health` → `{"ok":true}`
- [ ] `/predict` 가 `model_version` 을 타임스탬프로 돌려준다
- [ ] Airflow 웹UI 가 살아 있고 DAG 3개(`calm_smoke`·`tableau_sheets`·`churn_*`)가 보인다
- [ ] 게임을 열고 15초 뒤 요청이 나가며 콘솔에 오류가 없다
- [ ] `node scripts/build-web.mjs` 후 `dist/` 에 `tests/` 가 **없다**

---

## Self-Review 기록

**스펙 대조** — §1~§12 전부 태스크가 있다.
§2(세션 단위) → Task 1 라벨 · §3(트리거) → Task 1·8·9 · §4(피처) → Task 1·2 ·
§5(학습) → Task 4·10 · §6(추론) → Task 5·6·7 · §7(개입) → Task 8 ·
§8(A/B) → Task 8(variant 분기) · §9(측정) → Task 5 적립 + Task 8 GA4 ·
§10(파일) → 전 태스크 · §11(한계) → 계획 서두 Global Constraints · §12(기준) → Task 11

**타입 일관성** — `FEATURE_ORDER` 8개가 `js/features.js`·`ml/train_churn.py`·`ml/api/churn.py`
세 곳에 같은 순서로 정의된다. 어긋나면 `_load_model()` 이 거부하고 `p=null` 로 답한다(Task 5 에 테스트 있음).
`wander_ratio` 는 세 곳 모두 "0 나눗셈 → null → 서버가 impute" 로 일관된다.

**남은 위험 3개** (실행자가 만나면 멈추고 보고할 것)
1. **Task 1 의 GA4↔game_logs 조인** — `user_id` 로 잇는다(설계서 §3-3). 실측으로 466/508건이
   정확히 한 세션에 붙었다. 퀘스트 트리거가 **616건 근처**로 안 나오면 조인이 틀린 것이다.
2. **Task 7 이 돌아가는 Airflow 를 건드린다** — 볼륨·Dockerfile 변경. 재시작 후 3개 컨테이너 확인 필수.
3. **`js/config.js` GA4 localhost 가드 부재** — 로컬 확인이 실계정을 오염시킨다(Task 9 Step 6).
