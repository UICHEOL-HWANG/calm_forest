# A/B 테스트 — 컨텍스트

**Last Updated**: 2026-09-18
**브랜치**: `feat/ab-testing` (main 분기) · worktree `.claude/worktrees/ab-testing`
**베이스라인**: 717 tests pass / 0 fail

## 목표

1. **Play Console 스토어 등록정보 실험** — 아이콘·스크린샷·짧은 설명 A/B (코드 0줄, 정식 출시 후)
2. **Firebase Remote Config + A/B Testing** — 게임 내 수치를 배포 없이 원격 전환하고 그룹별 행동 비교

두 층은 독립이다. 2번은 웹이 지원되므로 **플레이 출시를 기다리지 않는다.**

## 확정 사실

### Firebase / GA4
- 프로젝트 `calmforest-app` · messagingSenderId `305000814570`
- GA4 는 **기존 속성 `ga4-calm_forest`(547127440)** 에 연결됨 (새 속성 아님 — 확인 완료)
- 같은 속성 안에 웹 스트림이 **2개**가 됨:

| 스트림 | 스트림 ID | 측정 ID | 상태 |
|---|---|---|---|
| calm_forest | 15328457923 | `G-ELBTR8BXBF` | 트래픽 수신 중 (기존) |
| calm forest web | 15800305382 | `G-EHMH4E6FH5` | 데이터 없음 (Firebase 생성) |

- **같은 속성이므로 BigQuery export·Tableau 파이프라인은 안전.**

### 코드 현황
- 측정 ID 하드코딩: **`js/config.js:25` 한 곳뿐** (`GA4_MEASUREMENT_ID`)
- `stream_id` 참조: **0건** → 측정 ID 전환의 저장소 내 영향은 한 줄
- `js/analytics.js`: 번들러 없이 gtag.js 를 **동적 삽입**(L40-57). `gtag('config', id)` 는 L52
- `index.html:1953` 에 **importmap** 존재 (three 는 unpkg CDN)
- dev 세션 가드: `IS_DEV_SESSION` 이면 gtag.js 자체를 로드하지 않음 (`js/analytics.js:41`)
- **기존 A/B 배정이 이미 있다**: `assignVariant()` → `ab_variant` user property (`js/analytics.js:55`, `:72`)

## 핵심 의사결정

### 결정됨
- **측정 ID 는 `G-EHMH4E6FH5`(Firebase) 로 통일한다.**
  근거: Firebase 문서가 "Firebase ID 가 아닌 곳으로 보낸 gtag 이벤트는 Firebase 에 연결되지 않아 **타겟팅에 쓸 수 없다**"고 명시. 실험을 하려면 이 길뿐.
  결과: 전환 시점부터 새 스트림에 쌓이고, 과거 데이터는 옛 스트림에 남되 **속성 단위 리포트에서는 합산**된다.
- **Firebase 호스팅 미사용** — 배포는 Cloudflare Workers 유지
- **브랜치는 `feat/capacitor` 가 아니라 main 분기** — capacitor 는 main 보다 95커밋 뒤처져 있고 A/B 는 Capacitor 와 의존이 없다

- **Firebase SDK 로딩은 기존 패턴을 그대로 따른다** (`feat/capacitor` `7402222` 선례):
  웹·토스·itch 는 **CDN**(three=unpkg, supabase=esm.sh), **플레이/Capacitor 빌드만** `vendor/` 자체 호스팅을 `build-cap` 이 치환.
  → Firebase import 줄에 **치환 앵커 주석**을 달아둔다(`build-ait` 의 `API_BASE` 치환과 같은 패턴).
  커밋 메시지 근거: "지금 필요한 건 구글 플레이 빌드뿐이다. 라이브 서비스 3곳을 건드릴 이유가 없다."
  **따라서 Capacitor 를 기다릴 이유가 없다** — 오히려 앵커를 미리 심어두면 Capacitor 작업이 쉬워진다.

### 미결정
- **배정 주체** — 기존 `assignVariant()` 유지 vs Remote Config 이관. **이중으로 굴리면 배정이 꼬인다**
- **첫 실험 대상 수치** — Tableau 에서 나온 **입구 이탈 59.4%** 가 가장 큰 구멍이라 초반 온보딩이 후보

## 함정

- Firebase 웹 `apiKey` 는 **공개 식별자**다 — 시크릿 아니므로 교체·마스킹 불필요
- Firebase 프로젝트 생성 화면의 계정 드롭다운은 **계정**이지 속성이 아니다. 연필 아이콘을 눌러야 속성 선택이 나온다
- "새 속성이 생성되고" 안내문은 속성을 고른 뒤에도 안 바뀌는 기본 문구 — 무시
- GA4 스트림 URL 은 표시용이라 과거 값이어도 수집에 영향 없음 (수집은 측정 ID 기준)
- dev 세션이 실험 표본에 섞이지 않도록 Firebase SDK 도 `IS_DEV_SESSION` 가드 아래 둘 것
