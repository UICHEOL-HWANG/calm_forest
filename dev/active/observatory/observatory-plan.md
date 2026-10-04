# 🔭 천문대 — 구현 계획 (Codex 실행용)

> 이 문서만 보고 구현할 수 있게 쓴다. 모르는 게 생기면 **추측하지 말고** context.md 의 file:line 을 열어 기존 패턴을 그대로 따른다.
> 진행 체크는 `observatory-tasks.md`, 근거·좌표·함정은 `observatory-context.md`.

## 0. 무엇을 만드나
마을에 **천문대 건물**을 세우고, 문으로 들어가면 **실내 서브공간**(박물관과 같은 방식)이 열린다.
실내 가운데 **망원경** 앞에서 상호작용하면 캐릭터가 허리 숙여 들여다보는 자세를 잠깐 취하고,
**원형 렌즈 뷰 오버레이**가 열려 리듬에 맞춰 **북두칠성**을 잇는다.

- 리듬 방식(확정, 2026-10-04): **C 혜성 + A 목표 링 절충** — 방금 이은 별에서 빛(혜성)이 다음 별로 날아가고,
  동시에 다음 별 위의 링이 줄어든다. **혜성 도착 = 링이 별에 닿는 순간 = 판정 기준 시각.** 그때 탭.
- 시각 기준(픽셀·색·수치의 원본):
  - 외관/실내: `sims/observatory-sim.html?v=c&view=ext|int` (C안 확정)
  - 렌즈 뷰: `sims/observatory-eyepiece-sim.html?v=d` (절충안 확정)
  - 캡처: `dev/active/observatory/look/compare.png`, `eye-d-compare.png`

## 1. 확정 문구 (임의로 바꾸지 말 것)
| 위치 | 문구 |
|---|---|
| 건물 이름(지도·간판·VILLAGE_PLACES) | `천문대` (아이콘 🔭) |
| 문 앞 프롬프트 | `🌌 별 보러 가기` |
| 실내 나가기 프롬프트 | `🚪 나가기` (박물관과 동일) |
| 망원경 앞 프롬프트 | ⏳미확정 → 임시 `🔭 들여다보기` |
| 탭 안내 | ⏳미확정 → 임시 `빛과 링이 별에 닿을 때 탭!` |
| 판정 3단 | ⏳미확정 → 임시 `딱 좋아요!` / `좋아요` / `놓쳤어요` |
| 완성 | ⏳미확정 → 임시 `북두칠성을 그렸어요!` |

⏳ 항목은 상수 `COPY` 한 곳에 모아 두고(duel/ui.js 패턴), 사용자가 확정하면 그 객체만 바꾼다. 모든 문구는 `js/i18n-en.js` 에 영어 키 추가.

## 2. 결정(변경 가능 — 사용자 미확인 기본값)
- **위치**: 1순위 `OBSERVATORY_GATE = (22, 0, 22)`(남동). 테스트로 기존 시설과 겹침 검사, 실패하면 `(-5, 0, 32)`. 랜덤 나무·꽃 제외 목록에 추가.
- **실내 좌표**: `OBSERVATORY = (0, 0, 540)` (z 540 비어 있음).
- **시간 제한 없음**: 낮에도 들어가고 플레이 가능(렌즈 속은 항상 밤하늘). 밤 전용 보너스는 v1에 없음.
- **보상**: 하루 1회 완성 보상 `코인 10 + 딱 좋아요 수 × 2` (최대 24). 같은 날 재도전은 연습(보상 0). `giveReward({coins}, 'star_rhythm', 'big_dipper')` → `requestSave()`. 하루 1회 상태는 `gameState.starDay`(ferry-quiz 의 `gameState.quiz` 패턴 — 기본값·저장·복원 3곳 모두).
- **별자리**: v1 은 북두칠성 1개. 도감(dex) 카테고리 추가는 **v2**(손댈 곳이 7군데라 별도 작업).

## 3. 아키텍처
```
js/data/places.js            + OBSERVATORY_GATE, OBSERVATORY, OBSERVATORY_R(실내 반경 5.4)
js/observatory/rhythm.js     NEW 순수 로직(DOM·THREE 없음): 차트·판정·점수·보상  ← 테스트 대상
js/observatory/ui.js         NEW 렌즈 뷰 오버레이(canvas). sim v=d 그리기 코드 이식 + rAF 루프 + 입력
js/spaces/observatory.js     NEW 건물 외관(spawn/refresh gate) + 실내 hall + enterObservatory/exitObservatory
                                 + 망원경 상호작용 → 들여다보기 자세 → ui.open()
js/game.js                   배선만(플래그·export·setSpaceVisible·handleAction 등 — context.md 체크리스트)
js/spaces/doors.js           문 프롬프트·나가기 프롬프트·망원경 프롬프트
js/shadow-scope.js           OUT_OF_REACH_FLAGS 에 atObservatory
js/tuning.js                 DIFFICULTY.star 추가
js/i18n-en.js                문구 영어
tests/observatory-*.test.mjs NEW
```
🚨 새 코드는 game.js 에 몰지 말 것 — game.js 는 배선 몇 줄만(memory: split-files-not-gamejs).

템플릿:
- 공간: **박물관**(`js/spaces/cafe.js` enterMuseum/exitMuseum/buildMuseumHall/spawnMuseumGate) 복제 후 이름 바꾸기에서 시작.
- 오버레이: **duel(`js/duel/ui.js`)** 스타일 — 동적 DOM 생성, `COPY`+`t()`, ESC·visibilitychange=포기, AbortController 세션.
- 로직/보상/하루1회: **ferry-quiz(`js/spaces/ferry-quiz-run.js`)** 분리 방식.
- 판정 스키마: **cooking(`kitchenFinish` game.js:4893)** 과 같은 필드명.

## 4. 리듬 규칙 (rhythm.js)
- 별 좌표(정규화, y 위): `[[0,0],[1.05,-0.15],[1.25,-0.95],[0.15,-0.8],[-0.75,0.15],[-1.55,0.45],[-2.45,0.35]]`
- 잇는 순서: `ORDER = [6,5,4,0,1,2,3,0]` → **노트 7개**(첫 별 6은 시작점, 탭 대상 아님. 마지막 노트 = 국자 닫기 0).
  - 시작: 렌즈가 열리고 800ms 뒤 첫 별(6)이 자동으로 켜지고 바로 첫 혜성 출발.
- 혜성 비행 시간: `travelMs = clamp(650 + dist * 380, 700, 1300) * ease` (dist = 정규화 좌표 거리, ease = 난이도 배수; **ease>1 이면 느리고 창이 넓어짐 = 쉬움**).
  - 다음 혜성은 판정 순간이 아니라 **기준 시각에** 출발(박자 유지). 놓쳐도 진행 계속, 그 구간 선은 점선.
- 판정 창(기준 시각 대비 |offset|): `perfect ≤ 90ms × ease`, `good ≤ 180ms × ease`, 그 외 = miss.
  - 기준 시각 − good창 보다 이른 탭은 `early` → 무시(벌점 없음 — 모바일 관대).
  - 무탭은 기준 시각 + good창이 지나면 miss 확정.
- 점수: perfect=2, good=1, miss=0 (만점 14). 콤보는 miss 에서 0.
- 성공: miss ≤ 3.
- 내보낼 순수 함수(이름 고정 — 테스트가 import):
  - `export const DIPPER, ORDER`
  - `buildChart(ease = 1) → [{ i, from, to, startMs, hitMs }]` (첫 startMs = 800)
  - `judgeTap(offsetMs, ease = 1) → 'perfect'|'good'|'miss'|'early'`
  - `summarize(judges) → { perfect, good, miss, maxCombo, score, success }`
  - `rewardFor(summary, alreadyToday) → { coins }` (alreadyToday 또는 실패면 0)

## 5. 오버레이 (ui.js)
- sim `observatory-eyepiece-sim.html` 의 `drawLens / drawConstellation / drawC(v=d 분기) / hud / judge` 를 옮기고, 정지값 `T`·`DONE` 대신 rAF 시간으로 구동. 팔레트(GOLD `#f3d27a`, GOLD2 `#d9b45a`, NAVY `#1a2552`)·`layout()` 세로/가로 분기 유지. 배경 별은 시드 고정 랜덤(프레임마다 같은 위치).
- 입력: canvas pointerdown(터치/마우스) + Space/Enter = 탭. 시각은 `performance.now()`.
- 판정 텍스트는 방금 판정한 별 위 0.6초. 이은 선은 금빛 glow, miss 구간은 점선.
- ✕ / ESC / visibilitychange(hidden) = 포기 → `trackDiffAbandon('star', r, stage, { constellation:'big_dipper' })`.
- 끝나면 결과 카드(완성/실패, 판정 3종 개수, 보상) → 닫기.
- 열 때 `document.body.classList.add('menu-open','mg-open')`(index.html:3357 anyModalOpen 이 이동·액션 잠금), `Input.setAnalog(0,0)`. 닫을 때 제거.
- canvas 는 devicePixelRatio 반영, resize 대응.

## 6. 공간(observatory.js)
- **외관**: sim C안(`VARIANTS.c`, `buildExterior`) 형태를 게임 재질 규칙으로 이식 — 재질별 `mergeGeos` 병합(메시 수 ≈ 재질 수).
  - 🚨 돔 슬릿을 **클리핑 평면으로 만들지 말 것**(sim 은 그랬지만 게임 renderer 에 localClippingEnabled 를 켜면 전역 영향). 지오메트리로: 반구 삼각형 중 |x|<w/2 && z<0.18r 제거 → 들쭉날쭉한 가장자리는 슬릿 양옆 금색 레일(Torus 호)로 덮는다. 슬릿 안쪽은 어두운 BackSide 반구(MeshBasic `0x141a30`).
  - 크기·색: 원통 R 4.2 / 벽 H 3.4 / 기단 2단(반경 R+1.3~R+1.6, 높이 1.2) / 계단 4칸 / 남색 돔 `0x2f3f6b` + 금 띠 `0xd9b45a` + 금빛 별 46개(octahedron 병합) / 벽 `0xd8d0bc` / 기단 `0xb9ae95` / 남색 아치 문 / 창 emissive(블룸 임계 0.85 규칙).
  - 충돌체: 기단 원 둘레(박물관 solidBox 패턴), 재생성 시 colliders 에서 splice.
- **실내**: 반경 5.4(밖보다 넓음 — 게임 관례), 남색 벽 `0x27305a` + 금빛 별 그림, 바닥 `0x3a3550` + 금 링 2개, 단상 위 흰 망원경(pier), 책장 2, 책상+스탠드, 별자리 액자.
  - ⚠️ 게임 실내 카메라는 41° 내려다본다(박물관 천장 없음). **돔은 카메라 반대편 뒤쪽 반만**(cutaway) 또는 생략하고 벽 윗단 금 링만. 뒤쪽 반 돔에 슬릿을 내면 그 뒤에 별 Points.
  - 조명: 시간대 무관 고정(`MUSEUM_LIGHT` 패턴, memory: indoor-space-lighting — 세기·색·광원 자리 3종).
- **들여다보기 자세**: 망원경 프롬프트 탭 → 플레이어를 접안부 뒤 고정 위치·방향으로 → 700ms 동안 `playerAnchor.rotation.x` 0→-0.5 보간(sea.js:556-580 처럼 updatePlayer 이후 매 프레임 덮어쓰기) → 오버레이 페이드인. 닫으면 복귀.
  - 🚨 도구 휘두르기 모션은 건드리지 말 것(memory: no-swing-motion-change). 캐릭터 얼굴·팔 조형도 그대로.

## 6.5 성능·모듈 규칙 (필수 — 완료 기준 4와 연결)
**모듈**
- 새 코드는 `js/observatory/*`, `js/spaces/observatory.js` 에만. game.js 는 배선 줄만(추가 ≤ 40줄 목표). 파일당 ≤ 400줄, 넘으면 `observatory-build.js`(지오메트리) 로 분리.
- `rhythm.js` 는 THREE·DOM import 금지(테스트에서 직접 import).
- **지연 로딩**: `ui.js` 는 부팅 import 체인에 넣지 말 것 — 망원경 상호작용 시 `await import('../observatory/ui.js')` (한 번 로드 후 캐시). 로딩 화면이 게임 모듈 전부를 기다리는 구조라 부팅 모듈을 늘리면 첫 진입이 느려진다(memory: i18n-architecture 부팅 순서 함정).
- 실내 hall 은 **첫 입장 때 한 번 빌드**하고 이후엔 `visible` 토글(박물관 rebuild 경로는 전시물 갱신 때문 — 천문대는 재빌드 불필요). 마을 밖에 있을 땐 `setSpaceVisible()` 로 group.visible=false.

**드로우콜**
- 색을 먼저 정해 재질 키를 묶고(외관 목표 ≤ 8재질: 벽·기단·트림·돔·금·문·창(emissive)·슬릿안쪽), 파츠는 `.translate()/.rotateX()` 로 지오메트리에 구운 뒤 재질별 `mergeGeos` 한 번. 루프 안에서 `new Material` 금지.
- 돔 금빛 별 46개·실내 별 그림·책 21권·바닥 링 → 각각 재질 하나로 병합(책은 정점색 한 덩이). 판/간판은 PlaneGeometry 1장.
- 병합 예외: 밤마다 emissiveIntensity 가 바뀌는 창 유리만 별도 메시.
- **그림자**: castShadow 는 건물 본체(원통+기단+돔) 하나만. 문·창틀·레일·별·책·소품은 castShadow=false(그림자 패스가 콜의 ~40%, 작은 소품 그림자는 지글거림도 유발 — memory: lowpoly-surface-pitfalls).
- 실내 별 하늘은 `THREE.Points` 1개(병합), 별 sprite·광원 추가 금지. 실내 광원 PointLight ≤ 1(책상 스탠드).
- 🚨 `mergeGeos`/공유 지오메트리·재질은 `disposeTree()` 로 정리하는 오브젝트에 쓰지 말 것(공유 자원이 같이 해제됨).

**오버레이**
- canvas DPR = `Math.min(devicePixelRatio, 2)`, 배경 별 220개는 열 때 한 번 오프스크린 canvas 에 그려 캐시 → 프레임마다 drawImage 1회. 렌즈 테두리·눈금도 캐시.
- 오버레이가 열려 있는 동안 3D 렌더 루프는 `mgView` 패턴(game.js:4787, :5502-5509)으로 updatePlayer/handleAction 정지. 가능하면 3D 렌더 프레임도 건너뛰기(가려져 안 보임) — 기존에 그런 경로가 없으면 v1 은 정지만.
- 닫을 때: rAF cancel, AbortController.abort() 로 리스너 전부 해제, canvas/DOM 제거.

**측정 (전후 같은 조건)**
- `?dbg=1&weather=clear&time=0.32` 로 띄우고 `__tp(x,z)` 로 같은 지점(천문대 게이트 앞 8m, 카메라 기본) 이동 후 `__perf()` → calls/triangles 기록. time 고정 필수(해 각도가 그림자 콜 수를 바꿈).
- 추가 전(main) / 추가 후 두 번, 실내는 입장 직후 한 번. 수치를 tasks.md 에 적는다.
- 모바일 프로필(390×844)에서도 한 번. 상세: memory draw-call-optimization.

## 7. 트래킹 (식별자만, 표시 문자열 금지)
- `observatory_enter` / `observatory_exit`
- `star_start` `{ constellation:'big_dipper', ...diffParams(r) }`
- `star_result` `{ constellation, success, perfect, good, miss, max_combo, score, coins, already_today, offsets:[정수 ms], judges:[…], duration_ms, ...diffParams(r) }`
- 포기: `trackDiffAbandon('star', r, stage, { constellation })` → `minigame_abandon`
- 난이도: `js/tuning.js` `DIFFICULTY.star = { arms:[0.7,1.0,1.4], target:0.78, ddaOn:true }`, 시작 시 `rollDifficulty('star')`, 끝에 `settleDifficulty('star', summary.score / 14)`. ⚠️ arms 값이 rhythm.js 의 `ease` 로 들어가는지 확인(arm 0.7=어려움인지 쉬움인지 cooking 에서 ease 쓰는 방향을 보고 맞출 것).

## 8. 완료 기준 (전부 증명)
1. `npm test` 전부 통과(기존 + 신규).
2. `node scripts/i18n_check.mjs` 누락 0.
3. 로컬 서버 + `?weather=clear`(dev 세션 — 프로덕션 기록 방지)로: 마을 → 문 프롬프트 `🌌 별 보러 가기` → 실내 → 망원경 → 자세 → 렌즈 뷰 → 7노트 완주 → 결과·코인 → 나가기 → 마을 문 앞. PC 1280×800 + 모바일 390×844 캡처(헤드리스는 창 최소폭 ~500 — look/frame.html iframe 방식).
4. 드로우콜: 마을 천문대 추가 전후 증가 ≤ 12, 실내 ≤ 40.
5. 실내에서 액션 버튼이 밭 갈기 등 다른 동작을 하지 않음.
6. 세이브 왕복: 보상 받은 날 새로고침 후 재플레이 → 보상 0.

## 9. 범위 밖 (v2)
도감 별자리 카테고리 · 계절 별자리(백조·페가수스·오리온) · 노트마다 음계 · 밤 보너스 · NPC `stargazer`(npcs.js:118) 연결 · 공지 · 4곳 배포(사람이 승인 후, memory: deploy-checklist).
