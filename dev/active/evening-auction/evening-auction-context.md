# 저녁 경매 — 맥락

Last Updated: 2026-11-10 (구현 완료, 배포 전)

## 결정(사용자 확정)
- 방식: 실시간 호가(A). 봉투 입찰·떨이 기각 — `sims/auction-compare.html`
- 무대: 마을 광장 등불 무대(1). 장날 링·포구 기각 — `sims/auction-stage-compare.html`
- 시안 이모지는 자리표시. 실제는 3D 주민 + 입찰 팻말 + 망치·종 메시 — `sims/auction-stage-3d.html`
- 작업대 개편·시세판 철거·상점 코인 도구 정리는 범위 밖(별도 결정)

## 근거 수치
- 판매자 198명 중 192명이 시세 +15% 품목만 판매(GA4 10/11~11/09)
- 코인 잔액(최근 14일 저장 632건): 중앙값 5 · p90 217 · 300+ 57건(9%)

## 코드 접점(조사 2026-11-10)
- 게임 시간 `gameState.timeOfDay` 0..1, 0.75=18시, 하루 ≈500초(`DAY_SPEED` js/data/world.js:26)
- 날짜 `todayStr()`·`dateHash()` game.js:447-456
- 광장 `PLAZA {23,-4} r5` js/data/plaza.js:39, 수확제 끝(phase after) — 무대는 광장 동쪽 후보 `{32.5,-3.5}`
- 보관함 `gameState.outdoorStored {id:count}`, hidden OUTDOOR 는 보관분만 작업대에 보임(index.html:6276)
- 코인 서버 검증 없음(클라 권위) — `docs/superpowers/specs/2026-10-07-halloween-coin-decor-design.md:60`
- 미니게임 정지: `$w.mgView` 가 있으면 updatePlayer·handleAction 멈춤(game.js:6240·6247), `updateMgScene`(kitchen-stage.js:452)이 분기
- 주민 몸 재사용 `buildNPCFigure(def)` npc.js:287, 숨김 `setNpcHidden` npc.js:827
- 플레이어 팔 `playerArms {R:{pivot,hand}}` game.js:1638(→ `$w` 게터 추가 필요)
- 카메라 기본 복귀 `snapCamera()` game.js:6967
- 블룸 0.55/0.9/임계 0.85 game.js:5960, 모바일 품질 단계에서 블룸 끔 js/adaptive-quality.js
- 연결 테스트 선례 `tests/plaza-wiring.test.mjs`(game.js 줄 상한), 영어 테스트 선례 `tests/aura-i18n.test.mjs`
- 이벤트 사전 `docs/analysis/event-taxonomy.csv` — 없으면 `tests/event-taxonomy.test.mjs` 실패

## 의존
- node 테스트의 three 는 `../vendor/three/three.module.js` 에서 import(node_modules 에 three 없음 — tests/mountain-souvenirs.test.mjs:4)
- `js/animal-faces.js` 는 three 만 import(시안에서 직접 사용)

## 확정 문구
2026-11-10 사용자 승인. 기본은 후보 2, 사용자가 4줄을 고쳤다(★). 경매품 이름은 후보 2 에 안이 없어 후보 1 유지.

| 자리 | 한국어 | 영어 |
|---|---|---|
| 무대 앞 안내(열림) | 🔨 경매 참가 | 🔨 Join the auction |
| 무대 앞 안내(닫힘) ★ | 🔨 경매는 저녁에 열려요 | 🔨 Opens in the evening |
| 무대 앞 안내(오늘 끝) | 🔨 오늘 경매 끝 | 🔨 Done for today |
| 창 제목 | 🔨 오늘의 경매 | 🔨 Today's Auction |
| 대기 안내 | 오늘의 경매품이 나왔어요 | Today's lot is up |
| 참가 버튼 | 🔔 경매 참가하기 | 🔔 Join |
| 구경 버튼 ★ | 👀 구경만 하기 | 👀 Just watch |
| 구경 이유 | 시작가 🪙{0} | Starts at 🪙{0} |
| 첫 줄 | 시작가예요 | Starting price |
| 1등(나) | 🙋 지금 1등 | 🙋 You're leading |
| 1등(주민) | {0} 1등 | {0} is leading |
| 시간 연장 | ⏱️ 연장! | ⏱️ Extended! |
| 카운트 | 3… / 2… / 1… | 3… / 2… / 1… |
| 낙찰 | {0} 낙찰! | {0} is yours! |
| 낙찰 부가 ★ | 🧺 보관함에 넣었어요 | Added to storage 🧺 |
| 패찰 | {0}에게 낙찰 | {0} won it |
| 유찰 | 유찰됐어요 | No bids this time |
| 끝 버튼 ★ | 닫기 | Close |
| 내 기록 이름 | 🙋 내 입찰 | 🙋 Me |
| 경매품 이름 | 달빛 그네 · 등불 아치 · 별 풍향계 | Moon Swing · Lantern Arch · Star Vane |
| 경매품 설명 | 경매에서 산 {이름} | Won at the auction |

- 낙찰·패찰의 {0}: 낙찰은 경매품 이름, 패찰은 주민 이름.
- "구경만하기"는 띄어쓰기만 "구경만 하기"로 맞췄다.
- 모바일 폭 실측은 Task 10.
