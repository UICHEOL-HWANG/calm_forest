# 📊 이벤트 파라미터 정리 (2026-10-08)

사용자 지시: "다 만들면 이벤트 파라미터 정리해 줘 — 저번에 이벤트 로그가 파라미터 넘쳐서 문제가 됐나봐"

## 1. 무엇이 문제였나 — BQ 30일 실측

- 모든 이벤트에 `trackEvent` 가 `ts`·`platform` 2개를 자동으로 붙인다(js/analytics.js:84) → **직접 쓸 수 있는 건 23개**.
- GA4 는 이벤트당 파라미터 25개를 넘으면 **행마다 무작위로** 넘친 개수만큼 버린다(앞에서 25개를 남기는 게 아님).

| 이벤트 | 보내는 키(자동 2 포함) | 초과 | 실제로 잃은 것(빠진 비율) |
|---|---|---|---|
| `star_result` | 26 | 1 | 행마다 1개씩 무작위 — `unlocked_n` 9% · `offsets` 8% · `perfect`·`early_taps`·**`platform`** 7% · `success` 6% · **`run_id`** 2% … (합 ≈ 100% = 행당 1개) |
| `cooking_result` | 최대 28 | 3 (자유 요리 행) | `recipe`·`score`·`quality`·`platform` 같은 **핵심 키도 2~5% 유실** |
| `cooking_abandon` | 24 | 0 | (상한 안) |
| `churn_score` | 21 | 0 | (상한 안) |

→ `run_id`·`recipe` 로 조인하거나 `platform` 으로 나누면 몇 %가 조용히 빠진다. 오류가 나지 않아 몰랐다.
- 별개 문제: 30일간 쓰인 커스텀 키가 **346종**인데 GA4 탐색에서 쪼갤 수 있게 등록할 수 있는 칸은 50개다(BQ 에선 다 보인다).

## 2. 🤝 친구 초대 이벤트 — 확정

원칙: 이벤트당 직접 키 ≤ 5 · 기존 키 재사용 · 서버 테이블이 진실인 값(활성화 여부·지급)은 GA4 에 싣지 않는다.
`tests/referral-flow.test.mjs` 가 키 ≤ 5 를 고정한다.

| 이벤트 | 언제 | 파라미터 | 새 키? |
|---|---|---|---|
| `invite_land` | 초대 링크로 처음 도착(같은 코드 재방문은 안 셈) | — | — |
| `invite_sheet_open` | ☰ 친구 초대 시트 열기 | `guest`(0/1) · `active`(활성 친구 수) | `guest`·`active` 신규 |
| `invite_share` | 링크 복사·공유 누름 | `channel`: `copy`·`share`·`native` | `channel` 신규 |
| `referral_bind` | 초대받은 사람 로그인 후 연결 시도 | `result`: `ok`·`not_new`·`self`·`bad_code`·`too_many`·`cycle`·`inviter_full`·`already_bound`·`net_fail` | `result` 신규 |
| `referral_reward_grant` | 정산으로 새 단계 보상을 받음 | `item_id` · `tier`(1/3/5) | `tier` 신규 · `item_id` 재사용 |

서버 쪽(진실): `referrals`(invitee·inviter·bound_at·activated_at·platform) · `purchases`(source='referral').
K-factor = 1인당 `invite_share` 수 × (`referrals` 활성 / 공유 수) — 활성화는 SQL 로 센다.

GA4 맞춤 측정기준 등록이 필요한 것: `result` · `channel` · `tier` (3칸). `guest`·`active` 는 BQ 로만 본다.

## 3. 기존 넘치는 이벤트 — ✅ 이미 main 에서 처리됨(다른 세션, 2026-10-08 16:37 `9e29ec8`, 병합 `7a09b61`)

- `cooking_result`/`cooking_abandon`: `stage_scores`·`offsets`·자유 요리 4키 → `cooking_detail`(run_id 로 조인)
- `star_result`: `offsets`·`judges` → `star_detail`(run_id 로 조인, 전체 기록은 `star_runs`)
- `trackEvent`: 25개 초과 시 `ga_param_overflow { ev, n }` 경보 (`js/ga-params.js overParamLimit`)
- 난이도 probe 키(`arms`·`eases`·`dda`·`probe_v`)는 본 이벤트에 유지
- ⚠️ feat/referral-reward 는 main 병합 전 이 커밋들을 받아야 한다(analytics.js·game.js 충돌 여부 확인)
