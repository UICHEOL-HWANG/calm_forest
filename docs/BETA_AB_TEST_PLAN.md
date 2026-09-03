# 🧪 베타 A/B 테스트 설계 (2026-09-02)

베타테스터 10명 · 1주일. A/B 번들 실험(개편판 3종)과 운영자 전용 베타 관제 대시보드.
예측 모델(이탈 예측)은 베타 데이터 수집 후 다음 주에 별도 기획한다 — 이 문서 범위 밖.

## 결정 요약

| 항목 | 결정 |
|---|---|
| 실험 구조 | **번들 A/B 5:5** — A군 5명=개편판 3종 전부, B군 5명=현행판 (실험별 독립 배정은 10명 규모에서 셀당 1명꼴이라 기각) |
| 배정 방식 | **명단 테이블** — Supabase `beta_testers`(email → grp)로 직접 지정. 해시 자동 배정은 10명에서 쏠림 위험이라 기각 |
| 계정 | 전원 **구글 OAuth 신규 가입** → `created_at` 기준일 사용 가능 |
| 일반 유저 | 명단에 없으면 기존 로직대로 `control` — 실험 밖, 게임플레이 변화 없음 |
| 튜토리얼 개편 | **17단계 유지 + 순서 재배치** (재미 단계 전진) — 단축판·체크리스트형 기각 |
| 보상량 개편 | **가입 후 3일 부스트 ×1.5** (출석·퀘스트·판매) — 전액 상향은 인플레 위험이라 기각 |
| 난이도 개편 | **미니게임별 첫 3회 관대 판정 ×1.3** — 러버밴딩(복잡)·전역 완화(숙련자 재미 손실) 기각 |
| 관제 | **운영자 전용** `dashboards/beta_monitor.html` — 기존 admin_analytics 인증 패턴 재사용. 테스터 본인용 뷰는 범위 밖 |

## 1. 배정 인프라

- Supabase 테이블 `beta_testers`: `email text PK, grp text CHECK (grp IN ('A','B')), note text`.
  RLS: 로그인 유저는 **자기 이메일 행만** SELECT 가능. 쓰기는 service role만.
- `js/supabase-client.js` — 로그인 완료(applySession) 후 자기 행 조회:
  - 행 있음 → `state.variant = 'beta_A' | 'beta_B'`
  - 행 없음/게스트/오프라인 → 기존 `assignVariant()` 결과 (현행 유지)
- `CONFIG.EXPERIMENT = 'beta'` 로 전환. i18n 실험은 전면 롤아웃 상태 — 언어 결정 로직
  (`detectLang`)이 EXPERIMENT 값 변경에 영향받지 않는지 구현 시 확인.
- variant는 이미 모든 Supabase 이벤트·GA4 유저 속성(`ab_variant`)에 실려 나가므로
  트래킹 추가 작업 없음.

## 2. 변형 파라미터 — `js/tuning.js` 신설

산재한 상수는 건드리지 않고, 분기가 필요한 값만 모은다.

```js
export const TUNING = {
  rewardBoost:  { days: 3, mult: 1.5 },   // A군만 — 출석·퀘스트·판매 보상
  firstTryEase: { tries: 3, mult: 1.3 },  // A군만 — 미니게임 판정창·타이밍 관대
  tutorialOrder: [/* A군 재배치 배열 — §3 */],
};
```

- 보상 배율은 `giveReward` 경유 지점에 적용. **원장에 boost 적용 여부를 기록**해
  분석 시 원값 복원이 가능하게 한다.
- "가입 후 3일"은 Supabase `user.created_at` 기준 (전원 신규 OAuth 가입 전제).
- 관대 판정: 미니게임별 시도 횟수를 세이브에 저장, 첫 3회는 판정 계수 ×1.3.
  대상: 배 운행(장애물)·바다낚시·안개 리듬·조각 등 판정창이 있는 미니게임.

## 3. 튜토리얼 재배치 (A군)

스텝 내용·개수(17)는 그대로, 순서만 변경. 가설: 이탈 원인은 길이가 아니라 "재미없는 초반".

- A군: 이동 → 도구 → 벌목 → **🎣낚시 → 🏠집짓기 → 입장 → 꾸미기** → 밭갈기 → 씨앗
  → 물주기 → 수확 → 판매 → 시세 → 퀘스트 → 채굴 → 조각 → 도감
- B군: 현행 순서 유지.
- 의존성 검증: 집짓기는 목재 필요(벌목 뒤 OK), 꾸미기는 입장 뒤 OK, 낚싯대는 기본 도구 세트 OK.
- `tutorial_step` 이벤트에 **순서 인덱스 + 스텝 key** 둘 다 기록 → 군간 스텝 퍼널 비교.

## 4. 베타 관제 대시보드 — `dashboards/beta_monitor.html`

"베타 관제" 목업(아티팩트, 2026-09-01)을 실페이지로 승격.

- 접근: `calmforest.cloud/dashboards/beta_monitor.html` — 구글 로그인 + **admin 검증
  RPC** (`cf_beta_overview` 신설, `cf_admin_overview` 패턴 복제). share token 옵션 재사용.
- 내용:
  - 테스터 10명 **개별 현황 행** (최근 접속·진행도·소속 군) — 10명 규모 관제의 핵심 뷰
  - A/B 군별 비교: DAU·체류시간·이탈 퍼널(variant 분할)·미니게임 성공률
  - 튜토리얼 스텝 퍼널 (군별, §3의 인덱스+key 기반)
- SQL은 `sql/admin_analytics.sql`에 이어서 추가. 차트 색은 `_dash.css` 토큰만 사용.

## 5. 검증

- `?forceVariant=beta_A|beta_B` 로컬 강제 배정 파라미터 (운영에선 명단이 우선).
- 브라우저 프리뷰로 A/B 각각: 튜토리얼 순서·보상 배율(원장 기록 포함)·관대 판정 확인.
- 대시보드는 SQL 재실행 → 실데이터 렌더 확인 후 배포 (dev → main 병합).
