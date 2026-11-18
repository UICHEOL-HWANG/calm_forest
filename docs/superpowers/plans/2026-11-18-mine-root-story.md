# 광산 20층 뿌리 터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지하 20층에 옛 광부 벽화(M1 갱목 3컷)·마른 뿌리·돌바닥을 고정 배치하고, 첫 도착 때 벽화를 훑으며 뿌리에 빛이 도는 연출을 틀고, 광부 대사를 뿌리 이야기로 바꾼다.

**Architecture:** 배치 예약은 순수 함수(`js/delve/rules.js`)로, 그림은 three 의존 없는 캔버스 모듈(`root-mural.js`)로, 3D 소품은 `root-shrine.js`, 카메라 경로는 순수 리그(`root-cine.js`), 게임 상태·오버레이·기록 연결은 `root-scene.js` 가 맡는다. `js/spaces/delve.js` 는 `enterFloor`·`clearRoom` 에서 두 함수만 부른다.

**Tech Stack:** vanilla ES modules, three(importmap), `node --test`, CDP 캡처(`tools/store-shots/cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-18-mine-root-story-design.md`

## Global Constraints

- 새 코드·테스트에 주석 금지.
- 문구에 엠대시 금지, "놀다" 금지. 광부 말투는 ~하게체.
- 새 모듈은 `js/delve/` 아래. `game.js` 는 수정하지 않는다.
- floor 10·19 배치는 같은 시드에서 변경 전과 같아야 한다(지문 10 → 718294889, 19 → 3534895323, seed = 1000 + i*7, i<60, JSON 이어 붙여 `hashSeed`).
- 새 이벤트는 `delve_root_cine` 하나, 파라미터 `skipped`(0/1)·`sec`(정수).
- 저장 키는 `gameState.hintsSeen.mineRootLit`.
- 장면에 새 광원은 등불 PointLight 하나만 둔다.
- 푸시·배포 없음. 로컬 커밋까지.

---

### Task 1: 20층 뿌리 터 자리 예약

**Files:** Modify `js/data/delve.js` (`ROOT_SHRINE_FLOOR = 20`), `js/delve/rules.js`; Test `tests/mine-root.test.mjs`

**Interfaces:**
- `rootShrineSpot(arrival, half = DELVE_HALF) → { x: arrival.x <= 0 ? 4.2 : -4.2, z: -half + 0.7 }`
- `inRootShrine(p, spot) → Math.abs(p.x - spot.x) < 3.4 && p.z < spot.z + 4.5`
- floor 20 의 `layoutFloor` 결과에만 `shrine` 키 추가

- [ ] 테스트: 시드 200개 floor 20 에서 rocks·burrows·puddles·ladderAt·chestSpot(ladderAt) 모두 `!inRootShrine`; `shrine` = `rootShrineSpot(arrival)`; 도착 x 반대쪽; floor 10·19 지문 일치.
- [ ] 실패 확인 → 구현: `const shrine = floor === ROOT_SHRINE_FLOOR ? rootShrineSpot(arrival, half) : null; const clear = p => !shrine || !inRootShrine(p, shrine);` 를 바위·웅덩이·굴 조건에 AND, 반환에 `...(shrine ? { shrine } : {})`.
- [ ] 통과, 커밋 `feat(delve): reserve root shrine area on floor 20`.

### Task 2: 대사·안내 문구와 영어

**Files:** Modify `js/data/delve.js`, `js/i18n-en.js`; Test `tests/mine-root.test.mjs`

- [ ] 테스트: reopen ask[1] = '옛날엔 등불이 꺼지지 않던 곳이지'; grab ask[1] = '우린 그걸 쓰고 뿌리 곁을 지켰다네'; bottom ask 마지막 = '맨 아래엔 우리가 지키던 게 있다네'; `MINER_DONE_LINES` 6줄(스펙 순서); `ROOT_CINE_TOAST`; 엠대시·"놀" 없음; `?lang=en` 에서 `t()` 결과에 한글 없음.
- [ ] 구현, 기존 `tests/delve-rules.test.mjs` 포함 통과, 커밋 `feat(delve): miner lines tell the root keeper story`.

### Task 3: 벽화 캔버스·3D 소품·카메라 리그

**Files:** Create `js/delve/root-mural.js`(목업 `sims/mine-root/murals.js` M1 경로 이식), `js/delve/root-shrine.js`, `js/delve/root-cine.js`; Test `tests/mine-root.test.mjs`(cine)

**Interfaces:**
- `drawRootMural() → [{ color, glow }] × 3` (캔버스)
- `makeRootShrine(theme, side) → { g, setLit(on), panels: Vector3[3] (g 로컬), solids: [{ x, z, r }] (g 로컬) }`. side 1 이면 등불·뿌리가 +x, -1 이면 x 반전. 벽화는 반전하지 않음. 캔버스 실패 시 벽화 없이 계속.
- `cineShots(panels, aspect)`: d = aspect < 0.8 ? 3.6 : 3.2; `pos = { x: p.x, y: p.y + 0.35, z: p.z + d }`, `look = p`.
- `createRootCine({ from, shots, home, onLight }) → { cur, phase, lit, skip(), update(dt) }`; `ROOT_CINE_DUR = [1.0, 1.3, 1.3, 1.1]`; 2칸 도착 시 onLight 한 번; 합계 뒤 'done'; `skip()` 은 즉시 onLight 후 0.4초에 home.

- [ ] cine 테스트: 세로 d > 가로 d; 2칸 전 lit=false·후 true; 4.7초 뒤 done·cur=home; skip 후 0.4초 안에 done·lit; onLight 한 번.
- [ ] 구현, 통과, 커밋 `feat(delve): root shrine mural, props and cine rig`.

### Task 4: 20층 연결

**Files:** Create `js/delve/root-scene.js`; Modify `js/spaces/delve.js`

**Interfaces:**
- `placeRootShrine(parent, at, theme, side)`: solids 를 `solidCircle` 로 등록; 기록 없으면 연출(오버레이 탭·키 skip, `Input.setAnalog(0,0)`); 끝나면 `hintsSeen.mineRootLit = true`, `requestSave()`, `ui.toast(ROOT_CINE_TOAST, 3200)`, `trackEvent('delve_root_cine', { skipped, sec })`.
- `clearRootShrine()`: solids 해제, 연출 중이면 토스트 없이 기록만 남기고 끝.
- delve.js: `enterFloor` 끝(snapCamera 뒤)에서 `run.layout.shrine` 있으면 호출, `clearRoom` 에서 `clearRootShrine()`, `disposeObj` 가 `emissiveMap` 도 해제.

- [ ] 연결 테스트(소스 검사), 구현, 전체 `npm test`, 커밋 `feat(delve): play root shrine scene on first floor 20 arrival`.

### Task 5: 캡처·검증

- [ ] CDP 캡처 PC 1280×800·세로 375×812: 도착 직후, 연출 1·2·3칸, 연출 뒤, 재도착, 상자 미개봉 시 상자 위치, `?lang=en` 토스트.
- [ ] 콘솔 오류 없음, 빌드 통과.
- [ ] 코드 리뷰 에이전트, 지적 반영, dev docs 갱신, 커밋.
