# 관리자 대시보드 개편 3차 + 활성 유저 창

## Context

관리자 대시보드(`dashboards/`)를 더 보기 편하고 자세하게 다시 디자인하고, DAU·WAU·MAU 전용 창을 새로 만든다.
시안 3종을 실제 데이터로 비교한 뒤 사용자가 정한 방향:

- **일반 창(홈·애널리틱스·활성 유저·소식함·UTM)** = A안: 위쪽 가로 메뉴, 큰 글자, 카드. **기존 섹션은 전부 남긴다**(북극성·퍼널·리텐션·DAU 구성·밀도맵·이동 흐름·유저 관찰·경제).
- **실험(A/B) 창** = B안 카드 + C안: 위에 기간 타임라인, 아래 카드 목록, 카드를 누르면 C안 리포트(왼쪽 목록 + 오른쪽 넓은 상세)로 전환.
- **활성 유저 창** = A안: 지표 카드 4개 + DAU·WAU·MAU 세 칸 차트 + 플랫폼별 표 + 일별 표.

지금 문제: 창 사이 이동 수단이 "← 관리자 홈"뿐, 본문 글자 10.5~12px, 실험 20건을 좁은 목록에서 하나씩 눌러야 비교됨, WAU가 어디에도 없음.

작업 위치: 워크트리 `.claude/worktrees/dash-redesign` (브랜치 `feat/dashboard-redesign`, main 분기). 시안: `dev/active/dashboard-redesign/mockup/`.

## 지켜야 할 것

- `dashboards/_dash.css` 와 `dashboards/analytics.html` 은 **건드리지 않는다**. 토스 번들에 실려 플레이어가 보는 화면이다(`scripts/build-ait.mjs:32-34`). 새 스타일은 전부 `_admin.css` 에 넣는다.
- 색은 `_dash.css` 토큰만 쓴다(검증된 팔레트, `V('--s1')`). 새 hex 없음.
- 판정 로직 `analyzeExperiment`(`dashboards/js/admin-metrics.js:283`)는 그대로 쓴다. 숫자·판정 문구가 바뀌면 안 된다.
- 테스트가 검사하는 id·문자열 유지: `admin_analytics.html` 의 `id="slotSel"`, `id="s-flow"` 등(`tests/admin-metrics.test.mjs:63-157`), `index.html` 의 `href="experiments.html"`(`tests/admin-experiments.test.mjs:57`).
- 공유 링크(`?k=`) 보기 유지. 메뉴는 `?k=` 를 달고 이동하고, 공유 보기에서는 공유가 되는 창(애널리틱스·실험·활성 유저)만 보인다.
- 새 코드에 주석 없음. 화면 문구에 엠대시 없음.
- 새 파일은 `scripts/build-web.mjs:39` 가 `dashboards/` 를 통째로 복사하므로 빌드 설정 변경 없음.

## 단계

### 1. 공통 틀 (메뉴·글자·부품)

- `dashboards/js/admin-nav.js` (신규): `mountNav(current)` 가 위쪽 메뉴를 그린다. 항목: 홈·활성 유저·애널리틱스·실험·소식함·UTM 링크. 캐릭터 PNG(`img/chars/*`) 재사용. 현재 창 표시, 모바일 가로 스크롤, 현재 항목 가운데로.
- `dashboards/_admin.css`: 메뉴(`.top`·`.nav`), 본문 14px 기준 글자 크기, Pretendard 가변 글꼴(`--font` 를 여기서 덮어씀), 카드·지표 카드(`.k`)·판정 태그(`.chip`)·게이지·군별 막대·표(`.tb`). 기존 클래스(`.kstrip`·`.rsec`·`.sh`·`.toc`·`.fun`·`.tri`·`.hgrid`·`.ut`)는 이름을 유지한 채 모양만 고쳐 `admin-analytics.js` 를 거의 안 건드린다.
- 시안 `mock.css` 의 값을 옮겨 쓴다.

### 2. 활성 유저 창 (신규)

- SQL `sql/analytics/admin_active.sql` (신규): `cf_admin_active(days int default 60, token text default null) returns jsonb`. 접근 판정은 `cf_admin_dashboard`(`sql/analytics/admin_dashboard.sql:18-45`)와 같은 패턴(관리자 또는 유효한 공유 토큰). `cf_sessions`(페르소나 제외, 기기 `uid`)에서 날짜별 `dau`·`wau`(그날까지 7일)·`mau`(그날까지 30일)·`new` 와 어제 기준 플랫폼별 DAU·WAU·MAU 를 돌려준다. 표·인덱스 변경 없음(읽기 함수 하나 추가).
- `dashboards/js/admin-metrics.js` 에 순수 함수 추가(테스트 먼저): `activeKpis(series)`(7일 평균 DAU·WAU·MAU·고착도와 직전 대비), `activeDailyRows(series, k)`.
- `tests/admin-active.test.mjs` (신규): 위 함수와, 오늘(진행 중)을 빼고 어제까지만 세는지 검사.
- `dashboards/active.html` + `dashboards/js/admin-active.js` (신규): `bootAdmin`·`createLoader`·`showRpcError`(`admin-common.js`) 재사용. 차트는 기존 패턴대로 Chart.js(`admin-analytics.js:20-46` 의 `chartDefaults`·`axes`·`draw` 방식). DAU 는 기존·신규 누적 막대, WAU·MAU 는 선. 기간 30·60·90일.
- 애널리틱스 창 "DAU 상세 구성" 섹션과 홈 카드에서 이 창으로 가는 링크.

### 3. 실험 창

- `dashboards/experiments.html`·`dashboards/js/admin-experiments.js` 다시 구성:
  - 위: 타임라인 카드. 보기 전환 `기간 | 효과` 로 기존 "주 지표 효과 한눈에"(`forestSvg`)를 같은 카드 안에 남긴다. 판정 규칙 5줄은 접히는 영역으로 남긴다.
  - 가운데: 상태 필터(전체·진행 중·대기·결론) + 카드 목록. 카드 = 이름, 판정 태그, 질문, 차이 값, 95% 구간 그림, 군별 막대, 표본 게이지.
  - 카드 클릭 또는 `#e5` 주소 → 리포트 화면: 왼쪽 실험 목록 + 오른쪽 상세(큰 차이 값, 군별 막대, 배정 비율·표본·판정 규칙 3칸, 보조 지표·가드레일 표, 누적 차이 차트(기존 `drawCumulative` Chart.js 유지), 기록 타임라인, 참고). "전체 보기"로 카드 목록 복귀.
- `admin-metrics.js` 에 `experimentSpan(e, today)`(기간 문자열 → 시작·끝) 추가, `tests/admin-experiments.test.mjs` 에 테스트.
- 깔때기(`funnelRows`)·빈 상태·수동 입력 안내(`emptyResult`)는 내용 그대로 새 모양에 넣는다.

### 4. 나머지 창

- `dashboards/index.html`(홈): 메뉴, 카드 모양, 활성 유저 카드 추가.
- `dashboards/admin_analytics.html`: 머리 영역을 메뉴 + 제목으로 교체, 섹션은 전부 유지. 왼쪽 섹션 목차는 유지.
- `dashboards/utm.html`·`notices_admin.html`: 메뉴와 글자 크기만 맞춘다(구조 변경 없음).
- `dashboards/beta_monitor.html`(보관): 메뉴만 붙인다.

### 5. 검증

- `npm test` (기존 admin 테스트 + 신규).
- 미리보기 `dash-redesign`(포트 8931)에서 관리자 화면 확인: 가짜 세션 + 실제 RPC 응답 픽스처로 `fetch` 대역(기존에 쓰던 방법). 홈·애널리틱스·활성 유저·실험 4개 창을 PC 1440·모바일 390, 라이트·다크로 캡처해 콘솔 오류 0 확인.
- `cf_admin_active` 는 운영 DB에 적용하기 전 풀러에서 `explain analyze` 로 8초 제한 안인지 확인하고, 시안에 쓴 직접 집계 값과 대조.
- code-reviewer 에이전트 리뷰 후 지적 반영.

### 6. 운영 반영 (승인 필요 항목)

- 운영 DB에 `cf_admin_active` 함수 추가(풀러 직접 실행). 이 계획 승인에 포함.
- 커밋·푸시·웹 배포는 따로 요청하실 때만 한다. `fixture.js`(실제 지표)는 커밋하지 않는다.

## 하지 않는 것

- 플레이어용 `analytics.html` 개편.
- 활성 유저 창의 광고 일정 표식·요약 문장·주별 표(B·C안 요소). A안에 없어 뺐다. 필요하면 나중에 추가.
- 소식함·UTM·베타 관제의 내부 구조 개편.

## dev docs

승인 뒤 `dev/active/dashboard-redesign/` 에 `dashboard-redesign-plan.md`·`-context.md`·`-tasks.md` 를 만든다.
