# E1 첫 5분 수확 실험 — 구현 계획

원본(고정): `git show analytics/metrics-framework:dev/active/metrics-framework/first5min-harvest-experiment-prereg.md`
기준은 고치지 않는다. 구현이 기준과 어긋나면 멈추고 묻는다.

## 사용자 확정 (2026-10-12)
- 시안 **B 작물 위 말풍선** — 2×2 다 자란 당근, 작물 머리 위 월드 고정 말풍선, HUD 추가 없음 (`design-compare.html`)
- 문구 **👆 눌러서 수확하기** (터치) · PC 는 **👆 Space·클릭으로 수확하기** · 영어 `👆 Tap to harvest` / `👆 Space or click to harvest`
- 환영(튜토리얼) 모달은 **첫 수확 뒤** — 캐릭터 선택 → 프롤로그 → 밭 앞 + 말풍선 → 첫 수확 → 환영 모달(내용 그대로)

## 배정
- 단위 기기(`clientId()`), 해시 `e1:<platform>:<clientId>` → 50:50. 플랫폼별 솔트 = 층화. `assignVariant`(h&1)·`aiBucket`('ai:')과 다른 솔트
- 대상 web·toss 만. 신규(세이브 없음: load.kind empty·offline·failed_fresh)만 등록. 세이브가 있으면 등록 안 함
- 등록 기록: localStorage `cf_e1` + 세이브 `gameState.e1 = { arm, harvested }` → 재방문·다른 기기 로그인에도 같은 무리
- `enterGame` 에서 로드 루프 직후·`applySave` 보다 먼저 `enrollE1(load)` — 조기 반환 전(옛 variant 사고 방지), 테스트로 강제
- QA: `?e1=control|harvest_start` 강제(DEV_PARAMS 에 추가 → dev 세션 = 기록 없음)

## 기록
- `exp_exposure` { exp:'e1', exp_arm, first } — 등록 세션마다 1회(first=1 은 배정 직후)
- 16종 획득 이벤트에 `exp_arm` 덧붙임 — trackEvent 에서, 25개 한도를 넘지 않을 때만
- session_logs counts: `exp_exposure` 자동 + `e1_<arm>` 표시 키(tut_ 패턴)
- GA4 유저 속성 `exp_arm`
- 힌트 배너 실험(churn_events.arm)과 무관

## 처치 (harvest_start)
- 등록 즉시 텃밭(FARM)에 2×2 다 자란 당근 4칸(조용히, 토스트 없음) — 한 번만
- 첫 화면(프롤로그 끝 / 캐릭터 선택 뒤) → 텃밭 안 밭 앞 북향 + 말풍선
- 첫 수확 전까지 미룸: '내 텃밭' 첫 안내 모달 · 방문객 · 도구바 "눌러서 도구 바꾸기" 칩 · 환영 모달
- 첫 수확 → 말풍선 제거, `e1.harvested=true`, 잠시 뒤 환영 모달(needsTutorial 이면), 방문객 시작
- 경제: 당근 4 = 작물 +4·씨앗 +8, 판매가 최대 20🪙 (가드레일 테스트)

## 모듈
- `js/exp-e1.js` 순수 규칙(노드 테스트) · `js/spaces/e1-start.js` 게임 연결 · game.js/index.html 은 호출 몇 줄만
