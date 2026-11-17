# 공간 연결 2차 · 컨텍스트

Last Updated: 2026-11-17 KST

## 물가 꾸미기 창 = 미리보기 카드 (11/17, 시안 A 확정)
- 시안 `sims/pond-rim-window-sim.html`, 캡처 `rim-window-sim-*.png`. 결과 캡처 `final-rim-window-{pc,mobile,land,en-mobile,short-mobile}.png`, `final-expand-window-mobile.png`
- 카드 모델은 `rim.js` `rimCards`(상태 using·owned·buy·short, 코인 안내 여부). 창은 공용 수첩 창의 `head` 에 카드 4장을 넣는다. 공용 창에는 `coins`(머리 코인 칩)·`wide`(가로 폰 폭) 두 값만 더했다
- 미리보기는 `js/pond/rim-thumbs.js` 가 게임의 `buildPond` 를 `weekly/thumbs.js` `makeThumbs` 로 320px 그림으로 찍는다. 창은 바로 열리고 한 프레임에 한 장씩 채운다(헤드리스 크롬에서 네 장을 한 번에 찍으면 1.5초 멈춤, 한 장 220~370ms). 네 장은 한 번만 찍고 다시 열어도 안 찍는다. WebGL 이 안 되면 예전 글자 줄로 보인다
- 시안과 다른 점: 가로 폰은 이름을 그림 아래 한 줄로, 칩은 그 아래. 코인이 모자란 카드는 붉은 칩 대신 흐린 그림+회색 칩. 값이 모두 150이라 "살 수 있는 것 하나+못 사는 것 하나"는 실제로는 안 나온다(160코인이면 둘 다 살 수 있음)
- 넓히기 창은 머리에 같은 코인 칩만 더했다(단계 표시는 그대로)
- 못 한 것: 실제 기기에서 첫 열림 시간, 카드 고른 뒤 키보드 초점 유지(다시 그리면 초점이 풀린다), 가로 폰에서 코인 안내가 뜬 상태 캡처(계산으로는 355/390)

## 연못·꾸미기 가게 자리 다시 정함 (11/17 저녁, 사용자 결정)
아래 "P2-a 결과"의 자리 설명((-24,-9), 가게 옆, 이웃 울타리 말뚝 빼기)은 이 절이 대신한다.
- 넓은 연못: `POND_BIG_SPOT = { dx: -8.5, dz: -3 }` → world (-16.5, -11), 집 서쪽 옆. 처음에 이 자리가 기각된 이유는 남쪽에 꾸미기 가게가 서서 가렸기 때문이라, 가게를 옮기고 연못을 집 옆으로 되돌렸다
- 꾸미기 가게: `SHOP_POS` (-17.5, -4) → (-27.5, -9.5), 박물관 물길 북쪽. 시안(-25, -8.5)은 연못과 틈이 2.56이라 "틈이 너무 없다"(사용자) → 더 서쪽으로
- 잰 값(3단계 연못 기준): 가게 충돌체↔물가 4.80 · 가게↔박물관 물가 3.65 · 문 앞↔물가 3.10 · 안개 숲 입구 12.35 · 걷는 범위 여유 10.5 · 집(3단계)↔물가 2.91 · 7단계 집 벽↔물가 모던 1.05 / 한옥 1.09
- 가게 자리 조건은 `tests/shop-place.test.mjs` 가 잠근다(연못 틈 4.5, 물가 3, 안개 숲 10, 걷는 범위 3, 남쪽 시야, 다른 시설 2.5, 문 앞 나무 금지)
- `SHOP_POS` 를 따라가는 것: 건물·충돌체·점원·`SHOP_DOOR`·문 버튼·의뢰 말풍선·코치 `dress`·지도 이름표·미니맵 표식·나무/풀/꽃 제외. 손으로 고친 것: 테스트 좌표 2곳, 안내서 한/영 한 줄, 연못 문구 2개
- 나무: 넓힌 연못은 줄기 충돌체 가장자리가 물가에서 1.2(`POND_TREE_CLEAR`) 안인 나무를 치운다(전에는 중심 0.6이라 물가 0.2에 나무가 남았다). 1단계는 그대로(시작 산포가 이미 중심 1.8 밖). 연못 남쪽(카메라 쪽) 띠(폭 ±(반지름+1.2), 물가에서 4.2까지, `POND_SOUTH_CLEAR`)에 선 나무도 치운다. 물가 2 앞에 선 나무가 남쪽 시점에서 연못을 가린 판이 나왔다
- 가게 문 앞 남쪽 길(문에서 3 내려간 점, 반지름 3.5)에는 시작 산포가 나무를 심지 않는다. 옮긴 자리는 나무 링 가장자리라 문 바로 앞에 나무가 서는 판이 나왔다
- 이웃 마당: 새 자리는 울타리(17.2) 안쪽 깊숙이라 말뚝도 고정 나무도 빠지지 않는다. `pondCovers` 는 그대로 두고 테스트만 "하나도 안 빠진다"로 바꿨다
- 화살표 경유점(`detourPoint`): 7단계 집 마당 안에서 북서쪽 목표(가게·넓은 연못)로 갈 때 서쪽 채를 돌아가는 모서리로 북쪽 채 안쪽 점을 골라 마당에 갇혔다 → 다른 박스 안에 있는 모서리는 고르지 않는다. 집 정북 쪽 목표(안개 숲 등)는 여전히 마당에서 직선으로 가리킨다(전부터 있던 한계, 안 고침)
- 옛 세이브: 2~3단계를 이미 산 개발 빌드 세이브는 불러올 때 `refreshPond('load')` → `ensureBuilt` 가 새 자리에 짓고 마당을 치운다. 옮길 저장 값 없음
- 7단계 집: 연못 동쪽 통로에 서면 모던은 서쪽 채 지붕에 캐릭터가 조금 가리고, 한옥은 집이 비쳐 보이게 바뀐다. 통로는 걸어서 지나간다
- 캡처 `final-*.png` 11장

## P2-a 연못 넓히기 결과 (11/17)
- 브랜치 `feat/pond-expand`, worktree `.claude/worktrees/pond-expand`, 커밋 d0489661..df61bc66
- 저장은 `hintsSeen.pondStage`(정수 1~3)·`hintsSeen.pondGrowTip` 뿐. 새 최상위 필드 없음 → 5곳 동시 배포 불필요(옛 클라이언트가 지우지 않음)
- 넓은 자리 고르는 규칙에 "남쪽(카메라 쪽)에 집·시설이 없을 것"이 빠져 처음 자리(-16.5,-11)는 꾸미기 가게에 가려졌다. `tests/pond-spots.test.mjs` 에 시야·박물관 물길·걷는 범위 검사를 추가했고 지금 자리는 (-24,-9)
- 집에서 16칸 안에는 반지름 3.9가 시야까지 통과하는 자리가 없다(격자 탐색). 그래서 2단계부터는 마당이 아니라 가게 옆
- 새 모듈: `js/pond/stage.js`(규칙)·`shape.js`(배치)·`yard-clear.js`(나무·풀·꽃 치우기)·`expand-ui.js`(창·구매). `js/game.js` 는 연결만
- 지도는 그림 파일이 아니라 위에서 찍는 실시간 화면. `mapSignature` 에 `pondMapKey()` 를 넣어 넓힌 뒤 다시 찍는다
- 주민·상인은 `colliders` 가 아니라 `obstacles` 만 본다 → 연못도 `obstacles` 에 넣었다(1단계 포함)
- 이웃 마당은 울타리 반지름 17.2라 넓은 자리(집에서 16)가 울타리 선에 걸린다 → 그 자리 울타리 말뚝 3~4개와 나무 1그루를 뺀다
- 검증: 오프라인 게스트 + Supabase 차단 + 헤드리스 크롬. 개발 세션은 기록을 버리므로 `trackEvent`·`logEcon` 은 계측용 테스트 서버로 확인. 광고 버튼은 `?prepass=1`
- 넓은 자리에 갈아 둔 밭이 있으면 꾸미기처럼 넓히기를 막는다(밭은 그대로 둔다). 넓힌 뒤에는 연못 둘레(반지름+1.05)에 괭이질이 안 된다
- 이웃 화면: `_nb_pond` 가 `seas`(최대 4)를 같이 보낸다. 옛 서버면 `sea` 한 마리. SQL 은 아직 운영에 적용 안 함
- 지도: 연못이 커지는 2초 동안은 위에서 찍기를 미루고 끝나면 바로 찍는다(`pondSettling`)
- 추가 검증(11/17 오후, 헤드리스 크롬): 앞마당 작은 자리 두 곳(-5,1)·(-2,1)에서 2단계로 넓힌 뒤 금색 화살표를 따라 걸어 도착(집 중심과 5.6 이상, 가게 2.8, 광산 4.5, 물길 7 떨어짐, 도착하면 안내 끝). 캡처 `p2-route-front-pc.png`, `p2-stage3-big-{land,mobile}.png`, `p2-stage2-big-pc.png`, `p2-stage3-house7-pc.png`

## 물가 꾸미기 결과 (11/17)
- 물가 4종: 기본 돌(무료)·흰 조약돌·붉은 벽돌·조개와 산호(각 150코인, 한 번 사면 자유 전환). 광고 없음
- 저장은 `hintsSeen.pondRim`(문자열)·`hintsSeen.pondRims`(배열) 뿐
- 새 모듈 `js/pond/rim.js`(규칙)·`rim-ui.js`(창·구매). 조각 배치는 `shape.js` `rimPieces`, 조형은 `build.js` 가 물가 메시에 합친다(메시 2개 유지)
- 바꿀 때는 `setPondRim()` 이 물가 조형만 갈아 끼운다(자리·충돌체·마당 그대로, 커지는 연출 없음)
- 흰색 계열은 블룸 문턱 0.85 아래로 낮췄다(시안보다 조금 어둡다)
- 가로 폰에서 수첩 아래 두 줄(넓히기·물가 꾸미기)은 나란히 놓는다. 한 줄씩 쌓으면 닫기 버튼이 화면 밖으로 밀린다
- 이웃 화면: `_nb_pond` 가 `rim` 을 보낸다. SQL 은 운영에 적용 안 함
- 검증(헤드리스 크롬, 오프라인 게스트): 150코인 한 번만 차감(두 번 눌러도), 가진 물가 전환 무료, 3단계 드로우콜 네 종류 모두 104. 캡처 `p2-rim-*.png`
- 못 한 것: 오프라인 게스트는 저장이 안 돼 실제 새로고침 확인은 못 했다(저장된 값으로 다시 짓는 것만 확인). `trackEvent`·`logEcon` 실제 전송, 이웃 화면 렌더, SQL 실행

## P1 구현 결과 (11/12)
- 브랜치 `feat/space-link-p1`, 커밋 12개(6d10b36c..08ccc270), worktree `.claude/worktrees/space-link-p1`, 미리보기 설정 `space-link-p1`(포트 8891)
- 새 파일: js/pond/actions.js · yard-steps.js · feed.js · yard-guide.js, js/hud/collection-book.js, sql/migrations/migrate_push_pond.sql
- 안내 종료 규칙: `hintsSeen.yardTries` < 2, 진행 없이 600초면 멈춤(완료 표시 안 함). 포구·식당 안내는 마당 안내 중엔 시작 안 함
- 옛 세이브(`unlocks.legacy`)는 집 3단계면 다리 고친 것으로 봄(`bridgeDone`)
- 바다가 잠겨 있으면 수첩 바다 칸은 "바다터가 열리면 낚을 수 있어요"만, 이동 버튼 없음
- 검증 함정: 앱 브라우저 패널이 숨겨지면 rAF 가 0프레임이라 게임 루프가 안 돈다 → 헤드리스 크롬 CDP 봇으로 검증(scratchpad yard-bot.mjs 방식)
- 새 세이브 테스트는 튜토리얼 스포트라이트가 `coachActive` 를 붙잡아 안내가 안 뜬다 → 테스트에선 `window.__ui.coachActive = () => false`

## 11/12 오후 바뀐 결정
- 마당 채우기 안내 시점: 지붕 직후 → **다리 수리 뒤**(사용자). 지붕 순간엔 코치 `dress`·🦉 다리 창이 이미 줄 서 있어 부딪힘
- P1 저장은 `hintsSeen` 키만(pondDay·pondFeedDay·pondFeedAd·yardFill·pondD1·pondBook). 새 최상위 필드는 옛 클라이언트가 다음 저장 때 지운다(`applySave` 화이트리스트)
- 푸시는 Android·iOS 앱만, `push_logs.kind` CHECK 에 pond 추가 마이그레이션 필요
- 안내 엔진은 식당·포구 섬의 `createGuide`+`createGuideView`(E6 무관). 첫 캐스팅 보장은 `setFishAssist`(DDA 미반영, `assist:1`)
- `sims/space-link-onboarding.html` 은 "지붕 직후" 시절 그림이라 시점 칸이 옛 결정

## 근거 데이터
- 10/16~11/04 새 기기 1,338대(GA4 `first_open`/`first_visit`): 물고기 낚음 85(6.4%, 처음까지 중앙값 12분) · 연못 봄 46 · 요리 24(1.8%, 중앙값 146분) · 이틀 이상 접속 126(9.4%). 낚은 기기 재방문 45% vs 안 낚은 7%(스스로 고른 집단이라 인과 아님)
- 첫날 집 단계(`ml/reports/house_stages_20261107/report.md`, 454대): 건설 기록 없음 76% · 바닥 24% · 지붕 13%. 바닥 → 같은 날 지붕 56%
- 이야기 장 도달(`dev/active/main-quest-guide/main-quest-guide-context.md`): 1장 326 → 2장 68 → 3장 46. 새 세이브는 2장(물의 가지)에서 낚시꾼, 3장(부엌의 가지)에서 요리

## 핵심 파일 (기존)
- 연못 1차: `js/pond/{index,build,rules,copy}.js`, `js/data/pond.js`, 이웃 `js/neighbors/scene.js`
- 실험 스위치: `js/exp-e3.js` `spaceLinkOn()`, 사전등록 `dev/active/metrics-framework/space-link-experiment-prereg.md`
- 요리: `js/spaces/cooking.js`(kitchenView·eatDish·cookTier), `js/data/catalog.js`(RECIPES·FISH_KINDS·BUFF_META), `gameState.kitchen.best`
- 바다 종: `SEA_SPECIES` (catalog.js 264행 근처)
- 넓히기 패턴: `js/farm-stage.js` FARM_STAGES·farmStageInfo
- 광고: `js/ads/rewarded.js`, `js/guide/prepass-rules.js`(PREPASS_CAPS·CAFE_CAPS·REPEAT_SLOTS·repeatOpen·dayCount·bumpDay), 설계 `docs/superpowers/specs/2026-11-09-progress-prepass-rewarded-design.md`
- 안내 엔진: `js/guide/`(goal-guide·route·step-card·runner)
- 날짜: `js/kst-date.js` kstDate
- 금칙어: `js/nickname-filter.js`
- 1회성 플래그: `gameState.hintsSeen`

## 시안 (sims/)
- `cook-link-sim.html` 요리 연결 형태 4종 → A
- `cook-table-count-sim.html` 접시 수 3종 → ①
- `cook-table-action-sim.html` 식탁 행동 4종 → ①+②
- `pond-action-sim.html` 연못 행동 4종 → 전부 (광고 버튼 반영)
- `pond-grow-sim.html` 넓히기 3단계 + 넓히기 창(광고 버튼 반영)
- `space-link-onboarding.html` 온보딩 흐름
- 캡처: 이 폴더의 PNG 4장

## 결정과 이유
- 지붕 직후 온보딩: E6 주 지표(첫날 지붕 완성)가 거기서 끝나고, 반복 광고가 열리는 `repeatOpen()`(집 3단계)과 같은 순간. 지붕 전 곁길은 집 완성을 깎을 위험
- 연못 1단계 = 지금 연못: 기존 유저 손실 없음
- 계절 물고기·꾸미기 코인엔 광고 없음: 계절 재방문 이유·코인 소비처 보호
- 수첩 창 공용: 연못·식탁이 같은 모양

## 주의 (메모리)
- 시안은 파일을 직접 열어도 보이게 자급(옆 모듈 import 금지, file:// 에서 막힘)
- 코드 주석 금지 · game.js 에 로직 금지 · 월드 말풍선은 이모지만 · 화살표 이모지 금지 · 문구 엠대시·"놀다" 금지 · 문구 후보 먼저 검수
- 새 최상위 저장 필드 → 옛 클라이언트 처리 확인, 필요하면 5곳 동시 배포
- 새 GA4 이벤트 파라미터 ≤ 5, 기존 키 재사용
- dev 파라미터 사용 시 GA4 오염 주의

## 미확인
- 넓히기·꾸미기 비용 밸런스
- 첫 캐스팅 "무조건 성공"을 낚시 미니게임에서 어떻게 보장할지(기존 낚시 튜토리얼 코드 확인 필요)
- 집에서 부두까지 경로·경유점
- 옛 클라이언트의 `spaceLink` 필드 처리
