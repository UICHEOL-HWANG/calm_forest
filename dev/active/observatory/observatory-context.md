# 🔭 천문대 — 컨텍스트

**Last Updated:** 2026-10-05 (Claude, 4차 — 미니맵·렌즈 중 3D 정지·렌즈 blur 축소·game.js 배선 이동; 3차: 리뷰 D1~D3·R3·R6~R10 + 6~8단계) — 아래 줄 번호는 기획 세션 기준이라 어긋나면 함수명으로 grep.

### 3차에서 생긴 것 (파일 지도)
- `js/observatory/star-run.js` — `starSettle(summary, run, diff)`: 하루 1회 보상(`gameState.starDay`)·DDA(`ddaOutcome('star')`=점수/14)·`star_result`
- `js/observatory/interior.js` — `TELESCOPE`(관 자세 → 접안부·대물·자세 위치 파생), `HALL_SOLIDS`(받침·책장·책상 충돌체)
- `js/spaces/observatory.js` — `applyObservatoryLight`·`clampToObservatory`·`observatoryAction`·`observatoryMinimapMarks`(game.js 에서 옮김), `observatoryLensOpen`(렌즈 중 3D 렌더 건너뜀), `observatoryCamFocus`(카메라 초점을 홀 중심 쪽 0.4배), `rollDifficulty('star')` → 렌즈 열기 → `star_start`
- `tests/helpers/fake-dom.mjs` + `tests/observatory-overlay.test.mjs` — 렌즈 뷰 동작 테스트(가짜 DOM)
- `js/tuning.js` `DIFFICULTY.star`, `js/difficulty.js` `ddaOutcome('star')`, `scripts/i18n_check.mjs` 가 js/observatory 도 검사

## 결정 기록
| 날짜 | 결정 |
|---|---|
| 2026-10-04 | 천문대 = 문으로 들어가는 실내 서브공간 + 망원경 리듬 미니게임 |
| 2026-10-04 | 외관·실내 **C안**(석조 2단 기단 + 남색 돔 금빛 별) — `sims/observatory-sim.html?v=c` |
| 2026-10-04 | 렌즈 뷰 **C 혜성 + A 목표 링 절충** — `sims/observatory-eyepiece-sim.html?v=d` |
| 2026-10-04 | 문구: 건물명 `천문대`, 문 프롬프트 `🌌 별 보러 가기` (나머지 미확정 — plan §1) |
| 기본값 | 위치·시간 제한 없음·보상·v1 북두칠성만 — plan §2 (사용자 미확인, 바뀔 수 있음) |

## 공간 배선 체크리스트 (atMuseum 이 있는 곳마다 atObservatory)
박물관을 템플릿으로 삼는다: `js/spaces/cafe.js` — `buildMuseumHall` :414 (재질별 parts Map + mergeGeos, solidBox 충돌체, 재생성 시 colliders splice :468) · `enterMuseum` :532 · `exitMuseum` :562 (플레이어를 GATE + z3.4 로) · `refreshMuseumGate` :577 · `spawnMuseumGate` :601.

enter 시퀀스(그대로 복제): `$w.atX = true; setFogExempt(player, true)` → hall 생성/표시 → `player.position.set(...)` → `$w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null; snapCamera(); setSpaceVisible(); Sound.blip(); trackEvent('observatory_enter', …)`.

`js/game.js`
- [ ] :446 `let atMuseum=false, museumGroup=null` 옆에 `atObservatory`, `observatoryGroup`
- [ ] :253 `$w` getter/setter 쌍 (spaces 모듈은 `$w.x = …` 로 씀 — 순환 import)
- [ ] :7360-7385 `export { … }` 블록
- [ ] :498 `setSpaceVisible()` — group.visible (예 :526), 빗소리 조건 :535
- [ ] :2686-2690 `_spaceFlags` / `spaceFlags()`
- [ ] :1458 `toolZoneKey()`
- [ ] :2346, :5516 `place` 문자열 체인(세이브·미니맵)
- [ ] :5720 `updatePlayer` 이동 반경 클램프 분기(실내 반경 5.4 − 여유)
- [ ] :6077 카메라 오프셋(`camOffsetIndoor`)
- [ ] :6278 고정 조명 오버라이드(`MUSEUM_LIGHT` 패턴, sunLight 위치 고정)
- [ ] 바깥 효과 숨김 :3412, :3470, :4305, :4311
- [ ] :6486-6492 `handleAction` — `nearDoor==='observatory'` → enter, `'observatoryexit'` → exit, `'telescope'` → 망원경, 그리고 **`if (atObservatory) return;` 가드**(없으면 실내에서 밭을 간다)
- [ ] :4409 `buildEnvironment()` 안에서 gate spawn 호출
- [ ] :2798-2817 랜덤 나무 제외(gate 주변), :4390-4402 꽃 제외 목록
- [ ] :5380-5403 `VILLAGE_PLACES` 에 `{ ico:'🔭', name:'천문대', x, z, pri:1 }` — 지명 단일 출처(npcs.js:18 대사도 같은 이름)
- [ ] :963 근처 `gameState` 기본값에 `starDay: null`(ferry quiz `gameState.quiz` 패턴), :2550 근처 복원

`js/spaces/doors.js` (`updateDoorInteract` :121)
- [ ] :216-227 실내 나가기 분기 패턴 → `else if (atObservatory) { 나가기(문 근처 <1.9) → nd='observatoryexit', prompt='🚪 나가기'; 망원경 근처 → nd='telescope', prompt=COPY.lookIn }`
- [ ] :259-262 마을 입구 분기 → `nd='observatory'; prompt='🌌 별 보러 가기'; firstHintBanner('observatoryGate','🔭','천문대','…')` (배너 설명 문구는 검수 대상 — 임시로 짧게)
- [ ] :387 `inVillage2()`, :358 `updateZoneHint` 필요 시

기타
- [ ] `js/spaces/outdoor-decor.js:23` `outdoorZone()`
- [ ] `js/spaces/sea.js:79`, `js/spaces/farm-auto.js:541` (atMuseum 나열된 곳 — 같은 방식으로)
- [ ] `js/shadow-scope.js:41` `OUT_OF_REACH_FLAGS` (→ :60 SUBSPACE_FLAGS)
- [ ] `tests/shadow-scope.test.mjs:76-81` `OUT_OF_REACH` 맵 + `NEAREST_RECEIVER_M`
- [ ] `js/data/places.js` :84/:88 옆에 `OBSERVATORY_GATE`, `OBSERVATORY`, `OBSERVATORY_R`

👉 빠뜨림 방지: `grep -rn "atMuseum" js tests` 결과 전부에 대해 천문대도 필요한지 하나씩 판단.

## 미니게임 참고
- 이동 잠금: `ui.anyModalOpen()` index.html:3357 (`body.menu-open`/`mg-open`) → updatePlayer 입력 0(game.js:5667), handleAction 조기 return(:6467). 열 때 `Input.setAnalog(0,0)`.
- 오버레이 템플릿: `js/duel/ui.js` `openDuel`/`closeDuel` :82/:97 (AbortController, ESC, visibilitychange, `COPY` + `t()`).
- 로직 분리 템플릿: `js/spaces/ferry-quiz-run.js` (`quizStart`/`quizAnswer`/`quizEnd`, 모든 닫기 경로가 quizEnd 하나로).
- 판정 스키마: `kitchenStart` game.js:4866 / `kitchenFinish` :4893 (`offsets`, `judges`, `max_combo`).
- 보상: `giveReward({coins}, source, item)` game.js:7321 → `requestSave()`.
- 순수 리듬 채점 참고: `crushScore` js/craft/minigame.js:52.
- 난이도: `rollDifficulty` :7291 · `settleDifficulty` :7300 · `diffParams` :7306 · `trackDiffAbandon` :7316 · `DIFFICULTY` js/tuning.js:135.
- 트래킹: `trackEvent` js/analytics.js:82 (IS_DEV_SESSION 이면 자동 스킵, js/config.js:127).
- 자세 덮어쓰기: js/spaces/sea.js:556-580 (`playerArms.*.pivot.rotation`, `playerAnchor.rotation.x`, `$w.armWristK = 0` 을 updatePlayer 뒤 매 프레임).
- 밤 판정(v2용): `isNight()` game.js:442, `js/daynight.js`. 계절 `SEASON` game.js:380.
- 병합: `mergeGeos` game.js:2724 (export). 밤하늘 `buildStars` :4346.

## 위치 근거 (plan §2)
점유: 집(-8,-8) · 안개문(-17,-17) · 선착장(0,-15)/연못(0,-21.5) · 바다문(14.5,-12.5)+만(24,-21.5) r12 · 꾸미기상점(-17.5,-4) · 광산문(-14,3) · 박물관문(-26,5) · 숲(-18,23) r9 · 닭장(-4.5,11.5) · 농장문(0,7) · 카페문(4,14) · 반딧불 숲(7,26) r7 · 호수(16,9) r6 · 과수원문(32,2) · 광장(23,-4) · 랭킹(13.5,1.5) · 상점(9,0) · 장터(10,5.5) · 벤치(4,-5) · 부엌(7.4,-6.4) · NPC(js/data/npcs.js, `stargazer` (6,20.5) 근처).
플레이어 반경 maxR=42(game.js:5738), 땅 반경 60. (22,22) 는 |r|=31 → 기단 반경 ~5.8 포함 OK 예상, `tests/village-places.test.mjs` 패턴으로 최소 거리 테스트 작성해 확인.

## 테스트 규칙
- `npm test` = `node --test tests/*.test.mjs` (node:test + assert/strict).
- `gameSource()` tests/helpers/game-source.mjs:19 — game.js + js/data/* + js/spaces/* 를 이어 붙이고 `export `·`$w.` 제거 → 소스 텍스트 assert.
- 순수 로직은 DOM·THREE 없는 모듈로(js/museum.js, js/difficulty.js 처럼) → 직접 import 테스트.
- 예: tests/village-places.test.mjs, tests/museum.test.mjs, tests/shadow-scope.test.mjs.

## i18n 규칙
- `js/i18n-en.js` `EN` 은 화면에 나오는 한국어 원문 그대로가 키(이모지·문장부호 포함). 누락 시 한국어로 보임.
- canvas 에 그리는 문자열은 반드시 `t()` 로 감싼다(DOM 은 watchDom 이 자동 번역하지만 canvas 는 안 됨).
- 통문장 키, `<b>` 로 쪼개지 말 것. `'{0} · {1}'` 글루 함정 — tests/i18n-prompt.test.mjs.
- 검사: `node scripts/i18n_check.mjs`.

## 함정 (메모리에서)
- 🚨 PUBLIC 저장소 — 푸시 전 `git grep -E "AIza|GOCSPX-"` 스캔.
- 🚨 루트 `js/config.js` 에 test_ 토큰 로컬 수정이 있을 수 있음 — 커밋에 섞지 말 것(`git diff js/config.js` 확인).
- 워크트리 작업 시 미커밋 유실·preview 는 루트를 띄움(memory: worktree-pitfalls).
- 헤드리스 캡처: 창 최소폭 ~500px, 한글 폰트 폭 오판, 디스크 캐시(memory: game-capture-pitfall).
- 실내 조명 '시간대 무관' = 세기·색·광원 자리 3종 세트.
- 게임 renderer 에 localClippingEnabled 켜지 말 것(전역).
