# 로그인 화면 먼저, 게임은 뒤에서 받기 (lazy game boot)

## 왜
- 아이폰 웹 방문자 14%(33/228)가 첫 화면 전에 나간다. 안드로이드는 8%다(ml/reports/webview_identity_20261110/q3).
- 로그인 화면 하나를 띄우기 전에 JS 3,429KB(min)를 받아 실행한다. 원인은 index.html이 `js/game.js`를 맨 위에서 static import하는 것이다.
- login-first-boot(미커밋)는 순서만 바꿨다. 받는 양은 그대로다.

## 측정 (2026-11-10, esbuild min, 로컬)
| 묶음 | 크기 |
|---|---|
| 지금 로그인 전 전체 | 3,429KB (three 671KB) |
| 무거운 import 9개를 뺀 로그인 전용 | 772KB (three 없음) |
| 그중 영어 사전 i18n-en.js | 323KB |
| 그중 아이콘 전체 toss-icons-all.js | 219KB |
| 위 둘까지 뺀 한국어 로그인 화면 | 약 230KB |

무거운 import 9개(각각 game.js나 three를 끌고 온다):
- `game.js`
- `duel/index.js`
- `boat-chest-reveal.js`
- `controls.js`
- `push-ui.js`
- `cafe-guests.js`
- `night-visit.js`
- `decor-drops/index.js`
- `data/places.js` (SELL_ICO_G 하나 때문에 three 465KB를 끌고 온다)

## 1단계: 게임 본체를 동적 import로 (3,429KB → 772KB)
1. `js/game-lazy.js` 신설
   - `loadGame = once(() => import('./game.js'))`, 모듈을 받으면 `mod`에 담는다.
   - `Input`은 Proxy로 둔다. 로드 전에는 아무 일도 하지 않는 함수를 돌려주고, 로드 후에는 `mod.Input`으로 넘긴다. 이렇게 하면 index.html의 Input 호출 약 400곳을 고치지 않아도 된다(로드 전에는 HUD가 숨어 있어 호출될 일이 없다).
   - 나머지(`enterGame`, `requestSave`, `getGameState` …)는 얇은 위임 함수로 둔다. 모두 플레이 시작 뒤에만 쓰인다.
2. 무거운 7개(`duel` … `decor-drops`)도 `game-lazy`에서 함께 동적 import한다. 이 7개를 쓰는 곳은 이렇다.
   - `initCafeGuests`, `initNightVisit`, `initDuel` 등록은 인증 전 IIFE에서 `ensureWorld` 안(bootWorld 직전)으로 옮긴다.
   - `initControls`, `initPush`, `offerPush`, `playChestReveal`, `openDecorAlbum`은 플레이 뒤에만 쓰이므로 로드된 모듈을 쓴다.
3. `SELL_ICO_G`는 three가 없는 모듈(`js/data/sell-icons.js` 등)로 옮긴다. `places.js`는 그 값을 다시 export한다.
4. `ensureWorld()` = `await loadGame()` → 등록 → `bootWorld(ui)`. 실패하면 이미 있는 `showWorldFailed`로 처리한다(네트워크로 import가 실패할 때도 같다).
5. 로그인 화면이 떠 있는 동안 게임 받기를 바로 시작한다(`loadGame()` 호출, 기존 nextPaint 뒤).
   - 세션이 있는 경로(월드 먼저)는 지금처럼 기다린다. 총시간은 같다.
6. 빌드 쪽
   - `scripts/lib/bundle-boot.mjs`가 인라인 모듈을 "`'./js/game.js'`를 import하는 스크립트"로 찾는다. 이 조건을 `game-lazy.js` 기준으로 바꾼다.
   - esbuild `splitting:true`가 이미 켜져 있어 동적 import는 따로 청크로 떨어진다.
   - `tests/bundle-boot.test.mjs`를 같이 고친다.
7. 회귀 테스트
   - index.html이 `./js/game.js`와 무거운 7개를 static import하지 않는다.
   - 빌드 결과에서 entry의 static closure에 three가 없다. 크기 상한을 둔다(예: 900KB).

## 2단계: 한국어 사용자 몫 덜기 (772KB → 약 230KB)
- `i18n-en.js`(323KB)는 `LANG==='en'`일 때만 동적 import한다.
  - `t()`는 동기 함수라, 영어 사용자는 사전이 올 때까지 부팅을 기다린다(로딩 문구 번역 경로 포함).
- `toss-icons-all.js`(219KB)
  - 로그인 화면에 쓰는 아이콘만 먼저 넣고, 나머지는 게임과 함께 받는다.
  - `icons/index.js`의 hydrate 경로를 조사한 뒤 결정한다.
- 1단계 배포와 측정 뒤에 따로 진행한다.

## 검증
- 로컬
  - `npm test` 전부 통과.
  - `node scripts/build-web.mjs` 뒤 dist를 띄워 실제 묶음 크기를 확인한다.
  - 로그인 화면이 뜨기 전 받은 JS 양을 측정한다.
  - 로그인 → 플레이 → 저장 → 미니게임(승부, 보물상자) → 앱 유도·푸시 경로를 점검한다.
- 앱(Capacitor) 빌드
  - build-cap 앵커(supabase import)를 확인한다.
  - 시뮬레이터로 iOS 부팅을 확인한다.
- 배포 후 지표(GA4)
  - 아이폰 웹 첫 화면 전 이탈 14%와 비교한다(q3_load_by_source 재실행, 1주).
  - `login_screen` 도달까지의 시간도 본다.

## 위험
- 로드 전에 Input을 부르면 조용히 아무 일도 하지 않는다. 로드 전 호출을 개발 모드에서 경고로 잡는다.
- 무거운 모듈을 import할 때 생기는 부작용 순서가 바뀐다. 지금 조사로는 game.js에 `applySeasonPalette` 한 줄만 있다.
- E2(로그인 건너뛰기) 경로는 이미 `ensureWorld` 뒤에 입력을 받으므로 그대로 둔다.
- 처음 오는 사람이 로그인을 아주 빨리 누르면 게임 받기를 기다린다. 로그인 버튼에 처리 중 표시가 필요하다(문구는 미리 검수받는다).

## 범위 밖
- 공간별 지연 로딩(바다·설산·요리 등): 방법 2. 1단계 측정 뒤에 결정한다.
