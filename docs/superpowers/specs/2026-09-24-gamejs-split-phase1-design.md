# game.js 분리 1단계 — 안전망 + 데이터 표 이전

- 날짜: 2026-09-24
- 범위: 0단계(안전망) + 1단계(데이터 표). 공유 상태 모듈(2단계)·공간별 분리(3단계)는 **이번에 하지 않는다**
- 대원칙: **실제 게임에 피해 0.** 로직은 한 글자도 바꾸지 않고 "위치만" 옮긴다. 그것을 기계로 증명한다

## 1. 현재 상태 (2026-09-24, main f5ca226)

- `js/game.js` 16,663줄 · 최상위 함수 644 · 최상위 `let` 187 · `const` 339 · import 64
- 바깥 창구가 좁다: `index.html` 이 8개(`bootWorld, enterGame, requestSave, getGameState, npcAccept, npcClaim, Input, markNoticesSeen`), `js/controls.js` 가 `Input` 1개만 쓴다 → 안쪽을 어떻게 나눠도 바깥 인터페이스는 그대로다
- 빌드(`build-web`·`build-ait`·`build-itch`)는 `js/` 를 통째로 복사한다 → 새 파일이 배포 경로를 바꾸지 않는다
- `sw.js` 는 게임 자산을 캐시하지 않는다 → 새 파일로 인한 캐시 불일치 없음
- game.js 자체를 실행해 보는 테스트는 없다. 대신 game.js 를 **텍스트로 읽어** 좌표·선언을 정규식으로 확인하는 테스트가 20여 개 있다
- `scripts/i18n_check.mjs` 는 한국어 문자열을 검사할 **파일 목록을 명시**한다(game.js 포함)

## 2. 무엇을 옮기나 — 기계 판정

앞 구간(18~2036행)의 최상위 선언 416개를 Babel AST 로 판정했다(분석 로직은 3절의 `verify-move` 에 편입).

**옮길 수 있는 조건(전부 만족):**
1. `const` 또는 `function` 선언
2. 재대입 없음 (`let` 은 전부 제외 — ES 모듈은 다른 파일의 바인딩에 대입할 수 없다)
3. 초기화·본문이 `window`·`document`·`localStorage`·`Date`·`fetch`·`setTimeout` 등 **실행 시점에 따라 값이 달라지는 전역**을 건드리지 않음 (import 로 바뀌면 평가 시점이 앞당겨지므로)
4. 참조하는 최상위 이름이 전부 **import 이거나 함께 옮기는 선언** (고정점 반복)
5. 실행 중 값이 바뀌는 객체가 아님(멤버 대입·push 등 없음) — 의미상으론 옮겨도 안전하지만, 1단계는 "데이터"만 옮긴다는 설계 판단
6. 런타임 객체 제외: `clock`(THREE.Clock) · `keys`(입력 상태)

**결과:** 173개 선언 · 약 755줄(+주석) 이동 가능. 큰 것: `NPCS`(115줄) · `DEX`(80) · `DECOR`(39) · `ANIMALS`(32) · `SHOP_BUY`(30) · `QUEST_HOW`(27) · `STORY`(26) · `DAILY_POOL`(22) · `RECIPES`(20) · 장소 좌표 30여 개 · 도구 자세 쿼터니언 상수.

**옮기지 않는 것:** `gameState`(값이 바뀐다) · 상태를 읽는 함수(`setSpaceVisible`·`refreshDailyQuests`·`syncStory` 등) · 모든 `let` → 2단계 몫.

> 기대치: game.js 는 약 **1,000줄** 줄어든다(16,663 → ~15,600). 숫자보다 **"옮기는 방법과 증명 도구"를 확립**하는 것이 이번 단계의 진짜 산출물이다 — 2·3단계가 같은 도구 위에서 돈다.

## 3. 안전망 (0단계) — 옮기기 전에 먼저 만든다

### 3-1. 정적 증명: `tools/refactor/verify-move.mjs`
기준 커밋의 game.js 와 현재 트리를 AST 로 비교해 **"순수 이동"** 임을 증명한다. 하나라도 어긋나면 실패.

- (a) game.js 에서 사라진 최상위 선언은 전부 `js/data/*.js` 중 **정확히 한 곳**에 있고, 선언 원문이 `export ` 접두어를 빼면 **바이트 단위로 같다**
- (b) `js/data/*.js` 에는 그 선언들과 import 문 외에 다른 코드가 없다
- (c) game.js 에서 선언 삭제와 import 추가 외에 **바뀐 줄이 없다**(선언 바로 위 주석 블록은 선언과 함께 가도 된다)
- (d) 옮긴 선언이 2절 판정 조건을 만족한다(분석기 재사용)
- (e) `js/data/*.js` 가 game.js 를 import 하지 않는다(순환 금지). data 파일끼리는 허용하되 순환이 없어야 한다
- (f) game.js 가 여전히 쓰는 옮긴 이름은 전부 import 되어 있다(빠지면 ReferenceError — 실행 전 정적으로 잡는다)

### 3-2. 실행 증명: `tools/refactor/smoke.mjs`
헤드리스 Chrome(기존 `tools/store-shots/cdp.mjs` 재사용)으로 실제 게임을 띄운다.

- Supabase·GA 를 `Network.setBlockedURLs` 로 차단 → 오프라인 게스트 진입, 운영 DB·GA4 오염 없음
- 고정 파라미터: `?dbg=1&weather=clear&time=0.32`
- 시나리오: 부팅 → 게스트 → 캐릭터 선택 → 인트로 건너뛰기 → 공간 순회(마을·텃밭·광산·과수원·바다·강·안개 숲·카페·박물관·집 실내·반딧불 계곡(밤)·채집 숲)
- 공간마다 기록: **uncaught 예외·console.error 수** · 드로우콜 · 씬 메시 수 · 스크린샷 1장
- 마지막에 `getGameState()` JSON 에서 시각·랜덤 필드를 뺀 **정규화 스냅샷**
- `baseline.json` 과 `after.json` 을 비교해 **에러 0 · 드로우콜/메시 수 동일 · 스냅샷 동일**이면 통과. 스크린샷은 사람이 나란히 본다(파티클·애니메이션 때문에 픽셀 일치는 요구하지 않는다)

### 3-3. 기존 테스트 유지: `tests/helpers/game-source.mjs`
game.js 를 텍스트로 읽던 테스트가 데이터 이동으로 깨지지 않게, `gameSource()` = game.js + `js/data/*.js` 를 이어 붙인 텍스트를 돌려주는 도우미를 둔다. 해당 테스트에서 `readFileSync('../js/game.js')` **한 줄만** 이것으로 바꾸고 **단언(assert)은 건드리지 않는다.**

## 4. 새 파일 배치

`js/data/` 아래 도메인별로 나눈다. 정확한 소속은 구현 계획에서 분석기 출력으로 확정한다.

| 파일 | 내용(예) |
|---|---|
| `js/data/places.js` | 시설·관문·공간 좌표(BENCH·FARM·MINE·SEA·ORCHARD·…_GATE) |
| `js/data/tools.js` | TOOLS·도구 페이지·ZONE_PAGE·도구 아이콘 |
| `js/data/npcs.js` | NPCS·QUEST_TYPES·QUEST_HOW·DAILY_POOL·STORY |
| `js/data/catalog.js` | DECOR·SHOP_BUY·UPGRADES·OUTDOOR·GIFTS·BOAT_UPGRADES·RECIPES·COOK_MG·BUFF_META |
| `js/data/dex.js` | DEX·BADGES·BUG_KINDS·FORAGE_KINDS·CROP_TYPES |
| `js/data/character.js` | ANIMALS·팔/도구 자세 상수·PAL |

각 파일은 200~400줄 안쪽. 선언은 **원래 순서를 유지**한다(선언 간 참조 순서 보존).

## 5. 부수 변경

- `scripts/i18n_check.mjs` 파일 목록에 `js/data/*.js` 추가(안 하면 옮긴 한국어 문구가 검사에서 빠진다)
- 다른 파일 주석의 "game.js 의 X" 참조는 **이번엔 고치지 않는다**(동작 무관, 범위 폭발 방지) — 목록만 남긴다
- `index.html`·`sw.js`·빌드 스크립트·워커: 변경 없음

## 6. 진행·배포

- 워크트리 `refactor/gamejs-data` 에서 작업. 스모크는 **워크트리 경로에서 자체 서버**를 띄운다(preview 가 저장소 루트를 띄우는 함정 회피)
- 순서: 안전망 커밋 → 베이스라인 측정(main 그대로) → 파일 하나씩 이동, **파일마다** `verify-move` + `npm test` + 스모크 → 커밋
- 병합 전: code-reviewer 에이전트 검토 · 스모크 전 구간 재실행 · 사용자에게 공간별 스크린샷 비교 제시
- 배포: 웹(`wrangler deploy`) → 모바일 실측 1회 → 토스 `bundle_upload(memo)` → itch zip. 1단계는 **플레이어에게 보이는 변화가 없으므로 공지 없음**
- 롤백: 병합 커밋 하나를 `git revert` 후 재배포(데이터만 옮겼으므로 세이브 형식 영향 없음)

## 7. 성공 기준

1. `verify-move` 통과 — 순수 이동임이 기계로 증명됨
2. `npm test` 전부 통과, 단언 변경 0
3. 스모크: 전 공간 에러 0, 드로우콜·메시 수·정규화 세이브 스냅샷이 베이스라인과 동일
4. 웹 배포 후 24시간 GA4 에 새 에러 이벤트 증가 없음
5. game.js 약 1,000줄 감소

## 8. 위험과 대응

| 위험 | 대응 |
|---|---|
| 옮긴 이름 import 누락 → 부팅 시 ReferenceError | verify-move (f) 가 정적으로 잡고, 스모크가 실행으로 한 번 더 잡는다 |
| 순환 import → TDZ 로 로딩 중 멈춤 | verify-move (e): data → game.js import 금지 |
| 평가 시점이 앞당겨져 값이 달라짐 | 2절 조건 3: 실행 시점 전역을 쓰는 선언은 옮기지 않는다 |
| 텍스트 검사 테스트가 깨짐 | 3-3 도우미 — 읽는 대상만 넓히고 단언은 그대로 |
| 토스·itch 번들에서 새 파일 누락 | 빌드가 `js/` 를 통째로 복사함을 확인함. 배포 전 `dist-*/js/data/` 존재를 확인 |
| 다른 세션이 동시에 game.js 수정 → 병합 충돌 | 옮기는 구간이 앞 2,000줄에 몰려 있다. 병합 직전 main 을 받아 verify-move 를 새 기준으로 다시 돌린다 |
