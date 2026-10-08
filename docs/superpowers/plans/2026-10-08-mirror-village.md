# 🪞 거울 마을 (Mirror Village) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 낮에 마을 🚏 정류장에서 초승달 마차를 타고 🪞 거울 문을 지나 색 반전 마을로 가서, 보색 쌍둥이 주민 3명의 잃어버린 물건을 (2·3번째는 좌우 반전) 단서로 찾아 🪞 거울 조각을 받고 거울 장식 4종으로 바꾼다.

**Architecture:** 1차 🌙 꿈의 숲 패턴을 복제한다 — 순수 규칙(`js/mirror/{layout,quests,clues,ride-schedule,art-color}.js`, Node 테스트) · THREE 조형(`js/mirror/{art,decor-art}.js`) · 트래킹 래퍼(`js/mirror/track.js`) · 탑승 연출(`js/mirror/ride.js`) · 공간 런타임(`js/spaces/mirror.js`, game.js 와 순환 import) · game.js 는 연결부만. 1차 `js/dream/cutscene.js` 는 **고치지 않는다**(라이브 꿈길 회귀 위험 0).

**Tech Stack:** Vanilla JS ES modules · Three.js(importmap `three`) · `node --test tests/*.test.mjs` · 헤드리스 Chrome CDP(`tools/store-shots/cdp.mjs`) · 로컬 서버 `python3 scripts/serve.py 8033`

**Spec:** `docs/superpowers/specs/2026-10-08-mirror-village-design.md` (디자인 6항목 확정, 시안 `dev/active/mirror-village/mockups/compare-*.png`)

## Global Constraints

- 작업 위치: 워크트리 `/Users/uicheol_hwang/calm_forest/.claude/worktrees/mirror-village`, 브랜치 `feat/mirror-village`. 루트 체크아웃으로 `cd` 금지.
- 공간 좌표 `MIRROR = (0, 0, -700)`, 반지름 `MIRROR_R = 22`. 실제 마을 복제 금지.
- 마을 정류장 `MIRROR_STOP = (16, 0, 17)` (호수 LAKE (16, 9) r6 남쪽 잔디) — 반경 4 안 나무 금지.
- 운행 = `!isNight()` (꿈의 숲과 같은 `js/daynight.js` 단일 출처). 밤엔 정류장 프롬프트 `🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서`.
- 거울 마을 안에선 `timeOfDay` 정지, 조명은 늘 푸른 밤(3안 색 반전 숲 팔레트).
- 연출: 탑승(걷기→올라앉기)·하차를 보여 준다, 암전 순간이동 금지. 차원 전환 = **B 🪞 거울 문**. 첫 회 ≈5.6s / 이후 ≈2.4s, 탭·Space·Esc·Enter 건너뛰기.
- 주민 = **보색 쌍둥이**(실제 주민 `farmer`·`angler`·`chef` 몸 그대로, 색만 보색, 눈 발광, 이름 `거울 {주민 이름}`).
- 물건 = **원색 저폴리** 6종: ring 금반지 · musicbox 오르골 상자 · carrot 당근 인형 · yarn 털실 뭉치 · lantern 작은 등불 · brooch 별 브로치.
- 장식 = **보색 반전** 4종: `upsidePot` 6 · `waterMirror` 10(바닥 스탠드) · `shadowBear`(표시 `거울 곰 인형`) 14 · `mirrorLamp`(표시 `거울 등불`) 22, `pay: 'mirror'`, `mirror: true`.
- 보상: 의뢰 1건 +2, 힌트 없이 찾으면 +1. 하루 3건, 순차 해금. quest 1 그대로, quest 2·3 좌우 반전(왼/오 자리만), 세 의뢰는 서로 다른 표지물.
- 💧 힌트: 단서 듣고 30초 뒤 프롬프트 줄 `💧 연못에 비춰 보기`(nd `mirrorhint`, 모바일은 액션 버튼). 모바일 3단 레이아웃 규칙 — 안내는 컨텍스트 슬롯(zone hint) 또는 프롬프트 줄에만.
- 트래킹 11종은 **`js/mirror/track.js` 경유만**. GA4 예약 파라미터(`source`·`medium`·`campaign`·`campaign_id`·`term`·`content`) 금지. id·축은 키값.
- 세이브: `inventory.mirror`(화폐), `gameState.mirror = { visits, day, done, hinted, total }`. 진행 중 의뢰는 저장 안 함. 거울 마을 안에서 저장되면 `playerPos` = 마을 정류장 앞 `(16, 15.6)`.
- 🚨 옛 클라이언트가 `mirror` 필드·거울 장식 id 를 지운다 → 배포는 **웹·토스·Play·itch 4곳 동시**.
- `game.js` 증가분 ≤ 50줄 목표. 새 코드는 `js/mirror/*`, `js/spaces/mirror.js`.
- 순환 import 규칙: `js/spaces/*.js` 는 game.js 값을 로딩 시점에 읽지 않는다(함수 안에서만), game.js 의 let 에 쓸 땐 `$w.x = …`.
- 블룸 임계 0.85 — 흰색에 가까운 발광 금지(채도 있는 파스텔로).
- 드로우콜: 거울 마을 공간 ≤ 60 (`__perf().calls`).
- 커밋 메시지 영어, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 문구 i18n: 새 한국어 UI 문자열은 `js/i18n-en.js` 에 키 추가(숫자 자리는 `{0#}`), 단서·힌트 문장은 `js/mirror/clues.js` 가 ko/en 을 직접 완성한다(조합 문장은 사전 글루 함정).

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `js/data/places.js` | 수정 | `MIRROR`, `MIRROR_R`, `MIRROR_STOP` 상수 |
| `js/mirror/layout.js` | 새로 | 로컬 좌표(표지물·집·주민·숨는 자리 15·정류장·착지·정박)·`clampWalkable`·충돌 상자·마을 쪽 상수 — 순수 |
| `js/mirror/quests.js` | 새로 | 주민 3·물건 6 표, `pickQuests`, `normalizeMirror`, `rewardFor`, `questAt` — 순수 |
| `js/mirror/clues.js` | 새로 | `flipSide`, `npcName`, `clueText`, `hintText`, `clueShort` (ko/en) — 순수 |
| `js/mirror/ride-schedule.js` | 새로 | `rideSchedule`, `phaseAt` — 순수 |
| `js/mirror/track.js` | 새로 | `bindTracker` + `T.*` 11종 + `EVENTS` — 순수(싱크 주입) |
| `js/mirror/art-color.js` | 새로 | `invertColorPure` — 순수 |
| `js/mirror/art.js` | 새로 | `buildMirrorWorld`, `makeMirrorGate`, `makeLostItem`, `mirrorizeFigure`, `makeStopShelter` — THREE 만 |
| `js/mirror/decor-art.js` | 새로 | `MIRROR_DECOR_IDS`, `buildMirrorDecor` — THREE 만 |
| `js/mirror/ride.js` | 새로 | `startRide` — THREE 만 |
| `js/spaces/npc.js` | 수정 | `buildNPCFigure(def)` 추출(동작 불변) |
| `js/spaces/mirror.js` | 새로 | 공간 런타임(정류장·탑승·의뢰·힌트·HUD·온보딩·미니맵·세이브 자리·정박 마차) |
| `js/game.js` | 수정 | 연결부 |
| `js/spaces/doors.js` | 수정 | 마을 정류장 프롬프트 · `atMirror` 분기 · `inVillage2` |
| `js/spaces/outdoor-decor.js`, `js/spaces/farm-auto.js`, `js/shadow-scope.js`, `js/data/tools.js` | 수정 | 고정 목록에 `atMirror`/`mirror` |
| `js/data/catalog.js` | 수정 | 거울 장식 4종 |
| `js/spaces/indoor.js` | 수정 | `pay === 'mirror'` 토스트·트래킹, `buildMirrorDecor` 분기 |
| `js/sound.js` | 수정 | BGM 테마 `'mirror'` |
| `index.html` | 수정 | 도착 카드, 암전 `mirror` 색, 미니맵 라벨·바닥색, 꾸미기 🪞, Space 로 카드 닫기 |
| `js/i18n-en.js` | 수정 | 새 UI 문구 |
| `tests/mirror-*.test.mjs`, `tests/npc-figure.test.mjs` | 새로 | 순수 규칙·배선·i18n |
| `tools/mirror/qa.mjs` | 새로 | 오프라인 CDP 실측 |

---

### Task 0: 스펙 보정(계획 단계에서 확정한 세 가지)

**Files:**
- Modify: `docs/superpowers/specs/2026-10-08-mirror-village-design.md`

- [ ] **Step 1: §9 코드 구조 표의 `js/dream/cutscene.js (수정)` 줄을 아래 두 줄로 교체**

```markdown
| `js/mirror/ride.js` | 탑승(걷기→앉기)·이륙·🪞 거울 문 통과·착지·하차 타임라인. 1차 `js/dream/cutscene.js` 는 고치지 않는다(라이브 꿈길 회귀 0) — 마차 조형만 `makeMoonCarriage()` 재사용 | THREE |
| `js/mirror/ride-schedule.js` | 단계 경계 시각(순수) | — |
```

- [ ] **Step 2: §5 표 `waterMirror` 비고 → `바닥 스탠드 거울(벽걸이 가구 체계가 없어 YAGNI), foot 0.6×0.3` · `mirrorLamp` 이름 → `거울 등불` · §2 "낮(06~18시)" 뒤에 `— 판정은 !isNight()(js/daynight.js 단일 출처)` 추가**

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-10-08-mirror-village-design.md
git commit -m "docs: mirror village spec — own ride timeline, standing water mirror, isNight source

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: 좌표 상수와 순수 레이아웃

**Files:**
- Modify: `js/data/places.js` (164행 `DREAM` 줄 아래)
- Create: `js/mirror/layout.js`
- Test: `tests/mirror-layout.test.mjs`

**Interfaces:**
- Produces (places.js): `MIRROR`(Vector3(0,0,-700)), `MIRROR_R`(22), `MIRROR_STOP`(Vector3(16,0,17)).
- Produces (layout.js, MIRROR 로컬): `WALK_R`, `PICK_R`(1.1), `TALK_R`(2.0), `STOP_REACH`(2.4), `LANDMARKS {id,ko,en,x,z}[]`(pond·well·clock·lamp·stop), `HOUSES {x,z,ry}[3]`, `NPC_SPOTS {x,z,ry}[3]`(순서 = farmer·angler·chef), `SPOTS {id,landmark,side,cover,x,z}[15]`, `spotOf(id)`, `MIRROR_STOP_LOCAL {x,z}`, `MIRROR_LANDING {x,z}`, `MIRROR_PARK {x,z,heading}`, `SOLIDS {x1,z1,x2,z2}[]`, `isWalkable(x,z)`, `clampWalkable(x,z)→{x,z}`, `MIRROR_GATE_LOCAL {x,y,z}`.
- Produces (layout.js, 마을 쪽 월드): `VILLAGE_BOARD {x,z}`(16,15.6), `VILLAGE_PARK {x,z,heading}`, `LAKE_GATE {x,y,z}`.

- [ ] **Step 1: places.js 상수 추가** — `export const DREAM = …` 줄 바로 아래:

```js
export const MIRROR = new THREE.Vector3(0, 0, -700);     // 🪞 거울 마을 — 꿈의 숲(-550)과 150 띄움 · 로컬 좌표는 js/mirror/layout.js
export const MIRROR_R = 22;
export const MIRROR_STOP = new THREE.Vector3(16, 0, 17); // 🚏 마을 정류장 — 호수(16,9 r6) 남쪽 잔디(시안 A 확정, 2026-10-08)
```

- [ ] **Step 2: 실패하는 테스트** — `tests/mirror-layout.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LANDMARKS, SPOTS, spotOf, isWalkable, clampWalkable, MIRROR_LANDING, MIRROR_STOP_LOCAL, MIRROR_PARK,
  SOLIDS, NPC_SPOTS, HOUSES,
} from '../js/mirror/layout.js';

test('표지물 5종 · 숨는 자리 15곳 · 왼/오 자리 10곳', () => {
  assert.deepEqual(LANDMARKS.map(l => l.id), ['pond', 'well', 'clock', 'lamp', 'stop']);
  assert.equal(SPOTS.length, 15);
  assert.equal(SPOTS.filter(s => s.side === 'left' || s.side === 'right').length, 10);
  assert.equal(new Set(SPOTS.map(s => s.id)).size, 15);
  for (const s of SPOTS) {
    assert.ok(['left', 'right', 'front', 'back'].includes(s.side), s.id);
    assert.ok(['bush', 'rock', 'tree'].includes(s.cover), s.id);
    assert.ok(LANDMARKS.some(l => l.id === s.landmark), s.id);
    assert.equal(spotOf(s.id), s);
  }
});

test('방향 규칙 — 화면 왼쪽 = 서쪽(-x), 앞 = 남쪽(+z): 자리는 표지물 기준 그쪽에 있다', () => {
  for (const s of SPOTS) {
    const l = LANDMARKS.find(m => m.id === s.landmark);
    const dx = s.x - l.x, dz = s.z - l.z;
    if (s.side === 'left') assert.ok(dx < -1 && Math.abs(dx) > Math.abs(dz), s.id);
    if (s.side === 'right') assert.ok(dx > 1 && Math.abs(dx) > Math.abs(dz), s.id);
    if (s.side === 'front') assert.ok(dz > 1 && Math.abs(dz) > Math.abs(dx), s.id);
    if (s.side === 'back') assert.ok(dz < -1 && Math.abs(dz) > Math.abs(dx), s.id);
  }
});

test('자리·착지·정류장·주민은 걸을 수 있는 곳, 충돌 상자 밖', () => {
  const inSolid = (x, z) => SOLIDS.some(b => x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2);
  for (const p of [...SPOTS, MIRROR_LANDING, MIRROR_STOP_LOCAL, ...NPC_SPOTS]) {
    assert.ok(isWalkable(p.x, p.z), JSON.stringify(p));
    assert.ok(!inSolid(p.x, p.z), JSON.stringify(p));
  }
  assert.ok(Math.hypot(MIRROR_PARK.x, MIRROR_PARK.z) < 21, '마차 정박 자리도 원 안');
  assert.equal(HOUSES.length, 3);
});

test('clampWalkable — 안이면 그대로, 밖이면 원 경계 안쪽으로', () => {
  assert.deepEqual(clampWalkable(1, 2), { x: 1, z: 2 });
  const c = clampWalkable(40, 0);
  assert.ok(isWalkable(c.x, c.z));
  assert.ok(c.x > 19 && c.x < 21.6 && Math.abs(c.z) < 1e-6);
});
```

- [ ] **Step 3: 실패 확인** — Run: `node --test tests/mirror-layout.test.mjs` → FAIL `Cannot find module`

- [ ] **Step 4: 구현** — `js/mirror/layout.js`

```js
// =============================================================
//  🪞 거울 마을 — 좌표 표와 순수 규칙(THREE/DOM 없음 → Node 테스트: tests/mirror-layout.test.mjs)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-08-mirror-village-design.md §3·§4
//  ▶ 좌표는 MIRROR(js/data/places.js) 기준 **로컬**(월드 = MIRROR + 로컬). 마을 쪽 상수(VILLAGE_*·LAKE_GATE)만 월드.
//  ▶ 카메라는 북쪽(-z)을 본다 → 화면 왼쪽 = 서쪽(-x), 앞 = 남쪽(+z). 단서의 왼/오는 이 기준.
//  ▶ 배치는 확정 시안 dev/active/mirror-village/mockups/village.html 의 L 표와 같다.
// =============================================================
export const WALK_R = 20.4;            // 가장자리 숲 링(20.5~) 안쪽까지만
export const PICK_R = 1.1;             // 물건 자동 줍기
export const TALK_R = 2.0;             // 주민에게 말 걸기
export const STOP_REACH = 2.4;         // 정류장 프롬프트

export const LANDMARKS = Object.freeze([
  { id: 'pond',  ko: '🪞 거울 연못',     en: '🪞 Mirror Pond',             x: 0,   z: 0 },
  { id: 'well',  ko: '🪣 우물',          en: '🪣 well',                    x: -8,  z: -2 },
  { id: 'clock', ko: '🕰️ 거꾸로 시계탑', en: '🕰️ upside-down clock tower', x: 7.5, z: -6.5 },
  { id: 'lamp',  ko: '🏮 등불 기둥',     en: '🏮 lantern post',            x: -6,  z: 7 },
  { id: 'stop',  ko: '🚏 거울 정류장',   en: '🚏 Mirror Stop',             x: 2.5, z: 15 },
].map(Object.freeze));

export const HOUSES = Object.freeze([{ x: -11, z: -10, ry: 0.3 }, { x: 11, z: 1.5, ry: -0.5 }, { x: 1, z: -14, ry: 0.05 }].map(Object.freeze));
// 주민 자리 — 순서 = farmer · angler · chef (js/spaces/mirror.js 가 이 순서로 세운다)
export const NPC_SPOTS = Object.freeze([{ x: -9, z: -6.6, ry: 0.5 }, { x: 8.4, z: 4.6, ry: -0.6 }, { x: 3.6, z: -10.6, ry: 0.1 }].map(Object.freeze));

// 숨는 자리 15곳 — 표지물에서 2.2~4 떨어진 덮개(덤불·바위·나무) 밑. 왼/오 10 · 앞/뒤 5
export const SPOTS = Object.freeze([
  { id: 'pond-l',  landmark: 'pond',  side: 'left',  cover: 'bush', x: -4.0,  z: 0.3 },
  { id: 'pond-r',  landmark: 'pond',  side: 'right', cover: 'rock', x: 4.0,   z: -0.3 },
  { id: 'pond-f',  landmark: 'pond',  side: 'front', cover: 'bush', x: 0.4,   z: 4.0 },
  { id: 'pond-b',  landmark: 'pond',  side: 'back',  cover: 'rock', x: -0.4,  z: -4.0 },
  { id: 'well-l',  landmark: 'well',  side: 'left',  cover: 'bush', x: -10.4, z: -1.6 },
  { id: 'well-r',  landmark: 'well',  side: 'right', cover: 'rock', x: -5.6,  z: -2.2 },
  { id: 'well-f',  landmark: 'well',  side: 'front', cover: 'tree', x: -8.2,  z: 0.6 },
  { id: 'clock-l', landmark: 'clock', side: 'left',  cover: 'bush', x: 5.1,   z: -6.2 },
  { id: 'clock-r', landmark: 'clock', side: 'right', cover: 'bush', x: 9.9,   z: -6.8 },
  { id: 'clock-b', landmark: 'clock', side: 'back',  cover: 'tree', x: 7.6,   z: -9.0 },
  { id: 'lamp-l',  landmark: 'lamp',  side: 'left',  cover: 'rock', x: -8.4,  z: 7.3 },
  { id: 'lamp-r',  landmark: 'lamp',  side: 'right', cover: 'bush', x: -3.6,  z: 6.8 },
  { id: 'lamp-f',  landmark: 'lamp',  side: 'front', cover: 'bush', x: -5.8,  z: 9.4 },
  { id: 'stop-l',  landmark: 'stop',  side: 'left',  cover: 'bush', x: -0.4,  z: 14.6 },
  { id: 'stop-r',  landmark: 'stop',  side: 'right', cover: 'rock', x: 5.4,   z: 14.4 },
].map(Object.freeze));
const SPOT_BY_ID = new Map(SPOTS.map(s => [s.id, s]));
export function spotOf(id) { return SPOT_BY_ID.get(id) ?? null; }

export const MIRROR_STOP_LOCAL = Object.freeze({ x: 2.5, z: 13.4 });   // 정류장 지붕 북쪽 앞 — 서면 「마을로 돌아가기」
export const MIRROR_LANDING = Object.freeze({ x: 2.5, z: 12.4 });      // 하차 뒤 서는 자리(연못을 본다)
export const MIRROR_PARK = Object.freeze({ x: 2.5, z: 18.4, heading: Math.PI / 2 });   // 정류장 남쪽 — 카메라 시선(높이≈4.5)보다 낮아 플레이어를 안 가린다
export const MIRROR_GATE_LOCAL = Object.freeze({ x: 0, y: 5.5, z: -2 });   // 거울 마을 쪽 🪞 거울 문(연못 위)

// 충돌 상자(로컬) — 연못(원 r3 를 상자로 근사)·집 3·우물·시계탑. 숨는 자리는 밖에 있어야 한다(테스트)
export const SOLIDS = Object.freeze([
  { x1: -2.7, z1: -2.7, x2: 2.7, z2: 2.7 },
  ...HOUSES.map(h => ({ x1: h.x - 1.6, z1: h.z - 1.4, x2: h.x + 1.6, z2: h.z + 1.4 })),
  { x1: -8.95, z1: -2.95, x2: -7.05, z2: -1.05 },
  { x1: 6.75, z1: -7.25, x2: 8.25, z2: -5.75 },
].map(Object.freeze));

export function isWalkable(x, z) { return Math.hypot(x, z) <= WALK_R + 1e-9; }
export function clampWalkable(x, z) {
  const d = Math.hypot(x, z);
  if (d <= WALK_R) return { x, z };
  const k = (WALK_R - 1e-4) / d;
  return { x: x * k, z: z * k };
}

// ── 마을 쪽(월드) — 정류장 MIRROR_STOP(16,0,17) · 호수 LAKE(16,9 r6) ──
export const VILLAGE_BOARD = Object.freeze({ x: 16, z: 15.6 });                          // 정류장 북쪽 앞(호수 남쪽 기슭) — 「거울 마을행 타기」·귀환 하차 자리
export const VILLAGE_PARK = Object.freeze({ x: 19.2, z: 16.6, heading: -Math.PI / 2 });  // 정류장 동쪽 — 낮엔 늘 서 있다(발견성)
export const LAKE_GATE = Object.freeze({ x: 16, y: 3.6, z: 9 });                         // 🪞 거울 문이 서는 자리(호수 위)
```

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/mirror-layout.test.mjs` → PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add js/data/places.js js/mirror/layout.js tests/mirror-layout.test.mjs
git commit -m "feat: 🪞 mirror village layout constants and walk rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 하루 의뢰 배정과 세이브 정리

**Files:**
- Create: `js/mirror/quests.js`
- Test: `tests/mirror-quests.test.mjs`

**Interfaces:**
- Consumes: `SPOTS`, `spotOf` (layout.js).
- Produces: `QUESTS_PER_DAY = 3`; `RESIDENTS [{id}]`(farmer·angler·chef — `js/data/npcs.js` id); `ITEMS [{id, ko, en, ico}]`(6); `pickQuests(day) → Readonly<{n, npc, item, spot, flipped}>[3]`; `normalizeMirror(saved, today) → {visits, day, done, hinted, total}`; `rewardFor(hinted) → 2|3`; `questAt(state, today) → quest|null`.

- [ ] **Step 1: 실패하는 테스트** — `tests/mirror-quests.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS_PER_DAY, RESIDENTS, ITEMS, pickQuests, normalizeMirror, rewardFor, questAt } from '../js/mirror/quests.js';
import { spotOf } from '../js/mirror/layout.js';

const DAYS = [...Array.from({ length: 28 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`), '2026-11-03', '2027-01-01'];

test('같은 날 = 같은 배정(결정적), 같은 날 다시 부르면 같은 객체', () => {
  const a = JSON.stringify(pickQuests('2026-10-09'));
  pickQuests('2026-10-10');
  assert.equal(JSON.stringify(pickQuests('2026-10-09')), a);
  assert.equal(pickQuests('2026-10-09'), pickQuests('2026-10-09'));
});

test('하루 3건 — 주민 3명 각 1건, 물건·표지물 서로 다름, 1번 그대로 / 2·3번 왼·오 반전', () => {
  for (const d of DAYS) {
    const q = pickQuests(d);
    assert.equal(q.length, QUESTS_PER_DAY);
    assert.deepEqual(q.map(x => x.n), [1, 2, 3]);
    assert.equal(new Set(q.map(x => x.npc)).size, 3);
    assert.equal(new Set(q.map(x => x.item)).size, 3);
    assert.equal(new Set(q.map(x => spotOf(x.spot).landmark)).size, 3, d);
    assert.equal(q[0].flipped, false);
    for (const x of q.slice(1)) {
      assert.equal(x.flipped, true);
      assert.ok(['left', 'right'].includes(spotOf(x.spot).side), `${d} ${x.spot}`);
    }
    for (const x of q) { assert.ok(RESIDENTS.some(r => r.id === x.npc)); assert.ok(ITEMS.some(i => i.id === x.item)); }
  }
});

test('날마다 배정이 바뀐다(30일 중 자리 조합 20가지 이상)', () => {
  assert.ok(new Set(DAYS.map(d => pickQuests(d).map(x => x.spot).join())).size >= 20);
});

test('normalizeMirror — 타입·범위 검증, 날이 바뀌면 done·hinted 초기화', () => {
  assert.deepEqual(normalizeMirror(null, '2026-10-09'), { visits: 0, day: '2026-10-09', done: 0, hinted: [], total: 0 });
  assert.deepEqual(normalizeMirror({ visits: 3, day: '2026-10-09', done: 2, hinted: [2], total: 7 }, '2026-10-09'),
    { visits: 3, day: '2026-10-09', done: 2, hinted: [2], total: 7 });
  assert.deepEqual(normalizeMirror({ visits: 3, day: '2026-10-08', done: 3, hinted: [1, 2], total: 9 }, '2026-10-09'),
    { visits: 3, day: '2026-10-09', done: 0, hinted: [], total: 9 });
  assert.deepEqual(normalizeMirror({ visits: -1, day: '2026-10-09', done: 9, hinted: [5, 'x', 2, 2, 3], total: 'a' }, '2026-10-09'),
    { visits: 0, day: '2026-10-09', done: 3, hinted: [2, 3], total: 0 });
  assert.deepEqual(normalizeMirror({ day: '2026-10-09', done: 1, hinted: [1, 3] }, '2026-10-09').hinted, [1], '아직 안 한 의뢰의 힌트는 버린다');
});

test('보상·다음 의뢰', () => {
  assert.equal(rewardFor(false), 3);
  assert.equal(rewardFor(true), 2);
  const st = normalizeMirror({ day: '2026-10-09', done: 1 }, '2026-10-09');
  assert.equal(questAt(st, '2026-10-09').n, 2);
  assert.equal(questAt({ ...st, done: 3 }, '2026-10-09'), null);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/mirror-quests.test.mjs` → FAIL

- [ ] **Step 3: 구현** — `js/mirror/quests.js`

```js
// =============================================================
//  🪞 거울 마을 — 하루 의뢰 3건 배정 · 세이브 정리 · 보상(순수 → tests/mirror-quests.test.mjs)
//  ------------------------------------------------------------
//  스펙 §4·§5·§6 · 1번은 그대로, 2·3번은 좌우 반전 단서(왼/오 자리만) · 세 의뢰는 서로 다른 표지물
// =============================================================
import { SPOTS } from './layout.js';

export const QUESTS_PER_DAY = 3;
export const RESIDENTS = Object.freeze([{ id: 'farmer' }, { id: 'angler' }, { id: 'chef' }].map(Object.freeze));   // js/data/npcs.js id — 보색 쌍둥이로 만든다
export const ITEMS = Object.freeze([
  { id: 'ring',     ko: '금반지',      en: 'gold ring',      ico: '💍' },
  { id: 'musicbox', ko: '오르골 상자', en: 'music box',      ico: '🎵' },
  { id: 'carrot',   ko: '당근 인형',   en: 'carrot doll',    ico: '🥕' },
  { id: 'yarn',     ko: '털실 뭉치',   en: 'ball of yarn',   ico: '🧶' },
  { id: 'lantern',  ko: '작은 등불',   en: 'little lantern', ico: '🏮' },
  { id: 'brooch',   ko: '별 브로치',   en: 'star brooch',    ico: '⭐' },
].map(Object.freeze));

function hashStr(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const _cache = new Map();   // 날짜 → 얼린 배정(꿈 pickShards 와 달리 여러 날짜를 번갈아 불러도 같은 객체 — 테스트·자정 경계)
/** 그날의 의뢰 3건(얼린 배열 — 호출부는 고치지 않는다). 프롬프트가 매 프레임 부른다 */
export function pickQuests(day) {
  let p = _cache.get(day);
  if (!p) { p = Object.freeze(compute(day).map(Object.freeze)); _cache.set(day, p); if (_cache.size > 8) _cache.delete(_cache.keys().next().value); }
  return p;
}
function compute(day) {
  const rnd = mulberry32(hashStr(`mirror:${day}`));
  const npcs = shuffled(RESIDENTS.map(r => r.id), rnd);
  const items = shuffled(ITEMS.map(i => i.id), rnd).slice(0, QUESTS_PER_DAY);
  const used = new Set(), out = [];
  for (let n = 1; n <= QUESTS_PER_DAY; n++) {
    const flipped = n > 1;
    const pool = SPOTS.filter(s => !used.has(s.landmark) && (!flipped || s.side === 'left' || s.side === 'right'));
    const spot = shuffled(pool, rnd)[0];
    used.add(spot.landmark);
    out.push({ n, npc: npcs[n - 1], item: items[n - 1], spot: spot.id, flipped });
  }
  return out;
}

const nonNegInt = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
/** 세이브의 mirror 필드 검증·정리. 날이 바뀌면 done·hinted 를 비운다 */
export function normalizeMirror(saved, today) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const sameDay = s.day === today;
  const done = sameDay ? Math.min(QUESTS_PER_DAY, nonNegInt(s.done)) : 0;
  const hinted = sameDay && Array.isArray(s.hinted)
    ? [...new Set(s.hinted.filter(n => Number.isInteger(n) && n >= 1 && n <= done))].sort((a, b) => a - b)
    : [];
  return { visits: nonNegInt(s.visits), day: today, done, hinted, total: nonNegInt(s.total) };
}

export function rewardFor(hinted) { return hinted ? 2 : 3; }
/** 다음에 할 의뢰(없으면 null) */
export function questAt(state, today) {
  const done = state?.day === today ? state.done : 0;
  return done >= QUESTS_PER_DAY ? null : pickQuests(today)[done];
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/mirror-quests.test.mjs` → PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add js/mirror/quests.js tests/mirror-quests.test.mjs
git commit -m "feat: 🪞 mirror village daily quest picker and save normalizer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 단서·힌트 문장(ko/en)

**Files:**
- Create: `js/mirror/clues.js`
- Test: `tests/mirror-clues.test.mjs`

**Interfaces:**
- Consumes: `LANDMARKS`, `spotOf` (layout.js), `ITEMS` (quests.js).
- Produces: `flipSide(side)`; `npcName(id, lang)`; `clueText(q, lang)`; `hintText(q, lang)`; `clueShort(q, lang)`. `lang` ∈ `'ko'|'en'`(그 밖은 ko).

- [ ] **Step 1: 실패하는 테스트** — `tests/mirror-clues.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flipSide, npcName, clueText, hintText, clueShort } from '../js/mirror/clues.js';
import { pickQuests } from '../js/mirror/quests.js';

const HAS_KO = /[가-힣]/;
const Q1 = { n: 1, npc: 'farmer', item: 'ring', spot: 'well-l', flipped: false };
const Q2 = { n: 2, npc: 'angler', item: 'yarn', spot: 'clock-r', flipped: true };
const QB = { n: 1, npc: 'chef', item: 'yarn', spot: 'clock-b', flipped: false };

test('flipSide — 왼↔오만, 앞·뒤는 그대로', () => {
  assert.equal(flipSide('left'), 'right'); assert.equal(flipSide('right'), 'left');
  assert.equal(flipSide('front'), 'front'); assert.equal(flipSide('back'), 'back');
});

test('그대로 단서는 실제 방향, 반전 단서는 반대 방향을 말한다', () => {
  assert.equal(clueText(Q1, 'ko'), '거울 농부 삼촌: "🪣 우물 왼쪽 덤불 밑에서 금반지를 잃어버렸어요"');
  assert.equal(clueText(Q2, 'ko'), '거울 낚시꾼 할아버지: "🕰️ 거꾸로 시계탑 왼쪽 덤불 밑에서 털실 뭉치를 잃어버렸어요"');
  assert.equal(clueText(Q2, 'en'), 'Mirror Angler: "I lost my ball of yarn under the bush to the left of the 🕰️ upside-down clock tower"');
  assert.equal(clueText(QB, 'ko'), '거울 요리사 판다: "🕰️ 거꾸로 시계탑 뒤 나무 밑에서 털실 뭉치를 잃어버렸어요"');
});

test('힌트 — 반전이면 "거울 말로는 X → 진짜는 Y", 그대로면 다시 살펴보기(조사 맞춤)', () => {
  assert.equal(hintText(Q2, 'ko'), '🪞 거울 말로는 왼쪽 → 진짜는 오른쪽이에요');
  assert.equal(hintText(Q1, 'ko'), '💧 🪣 우물 왼쪽을 다시 살펴봐요');
  assert.equal(hintText(QB, 'ko'), '💧 🕰️ 거꾸로 시계탑 뒤를 다시 살펴봐요');
  assert.equal(hintText(Q2, 'en'), '🪞 In mirror-speak "left" → it really means right');
});

test('프롬프트 줄 요약', () => {
  assert.equal(clueShort(Q1, 'ko'), '🔍 🪣 우물 왼쪽 덤불 밑 · 💍 금반지');
  assert.equal(clueShort(Q2, 'ko'), '🔍 🕰️ 거꾸로 시계탑 왼쪽 덤불 밑 · 🧶 털실 뭉치', '요약도 주민이 말한(반전) 방향');
});

test('영어 문장엔 한국어가 없다 — 28일치 실제 배정 전부', () => {
  for (let i = 1; i <= 28; i++) for (const q of pickQuests(`2026-10-${String(i).padStart(2, '0')}`)) {
    for (const s of [clueText(q, 'en'), hintText(q, 'en'), clueShort(q, 'en'), npcName(q.npc, 'en')]) assert.ok(!HAS_KO.test(s), s);
  }
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/mirror-clues.test.mjs` → FAIL

- [ ] **Step 3: 구현** — `js/mirror/clues.js`

```js
// =============================================================
//  🪞 거울 마을 — 단서·힌트 문장(ko/en 을 여기서 완성한다 → tests/mirror-clues.test.mjs)
//  ------------------------------------------------------------
//  ⚠️ 조합 문장은 i18n 사전 글루(" · ")에 쪼개진다(beta-feedback-r3 함정) — 사전에 넣지 않고 언어별로 완성해 넘긴다.
//  반전 단서는 왼↔오만 바꾼다(거울은 좌우만 뒤집는다). 앞/뒤 자리는 반전 의뢰에 배정되지 않는다(quests.js).
// =============================================================
import { LANDMARKS, spotOf } from './layout.js';
import { ITEMS } from './quests.js';

const SIDE_KO = { left: '왼쪽', right: '오른쪽', front: '앞', back: '뒤' };
const COVER = { ko: { bush: '덤불', rock: '바위', tree: '나무' }, en: { bush: 'bush', rock: 'rock', tree: 'tree' } };
const NPC = { ko: { farmer: '거울 농부 삼촌', angler: '거울 낚시꾼 할아버지', chef: '거울 요리사 판다' }, en: { farmer: 'Mirror Farmer', angler: 'Mirror Angler', chef: 'Mirror Chef Panda' } };
const L = (lang) => (lang === 'en' ? 'en' : 'ko');

export function flipSide(side) { return side === 'left' ? 'right' : side === 'right' ? 'left' : side; }
export function npcName(id, lang) { return NPC[L(lang)][id] ?? id; }
const landmark = (id, lang) => LANDMARKS.find(l => l.id === id)[L(lang)];
const item = (id) => ITEMS.find(i => i.id === id);
/** 주민이 말하는 방향 — 반전 의뢰면 실제의 반대 */
const said = (q) => { const s = spotOf(q.spot).side; return q.flipped ? flipSide(s) : s; };
/** 받침 있으면 '을', 없으면 '를' */
function eulReul(w) { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? '을' : '를'; }
/** 영어 위치구 — 왼/오는 to the X of, 앞/뒤는 in front of / behind */
const whereEn = (side, lm) => (side === 'left' || side === 'right' ? `to the ${side} of the ${lm}` : side === 'front' ? `in front of the ${lm}` : `behind the ${lm}`);

export function clueText(q, lang) {
  const s = spotOf(q.spot), it = item(q.item), side = said(q);
  if (L(lang) === 'en') return `${npcName(q.npc, 'en')}: "I lost my ${it.en} under the ${COVER.en[s.cover]} ${whereEn(side, landmark(s.landmark, 'en'))}"`;
  return `${npcName(q.npc, 'ko')}: "${landmark(s.landmark, 'ko')} ${SIDE_KO[side]} ${COVER.ko[s.cover]} 밑에서 ${it.ko}${eulReul(it.ko)} 잃어버렸어요"`;
}

export function hintText(q, lang) {
  const s = spotOf(q.spot), en = L(lang) === 'en';
  if (q.flipped) return en ? `🪞 In mirror-speak "${said(q)}" → it really means ${s.side}` : `🪞 거울 말로는 ${SIDE_KO[said(q)]} → 진짜는 ${SIDE_KO[s.side]}이에요`;
  if (en) return `💧 Look again ${whereEn(s.side, landmark(s.landmark, 'en'))}`;
  const w = SIDE_KO[s.side];
  return `💧 ${landmark(s.landmark, 'ko')} ${w}${eulReul(w)} 다시 살펴봐요`;
}

export function clueShort(q, lang) {
  const s = spotOf(q.spot), it = item(q.item), side = said(q);
  return L(lang) === 'en'
    ? `🔍 ${landmark(s.landmark, 'en')} · ${side} · ${COVER.en[s.cover]} · ${it.ico} ${it.en}`
    : `🔍 ${landmark(s.landmark, 'ko')} ${SIDE_KO[side]} ${COVER.ko[s.cover]} 밑 · ${it.ico} ${it.ko}`;
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/mirror-clues.test.mjs` → PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add js/mirror/clues.js tests/mirror-clues.test.mjs
git commit -m "feat: 🪞 mirror village clue and hint sentences (ko/en, flipped sides)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 트래킹 래퍼 11종

**Files:**
- Create: `js/mirror/track.js`
- Test: `tests/mirror-track.test.mjs`

**Interfaces:**
- Produces: `EVENTS`(이름 → 파라미터 키 배열), `bindTracker(fn, { strict })`, `T.stopShown / board / cutsceneEnd / enter / clue / hint / found / ret / leave / onboard / decorBuy`. 불린 → 0/1. strict 면 빠진 키·모르는 키·열거값 밖을 throw, 아니면 `console.warn` 후 그대로 보낸다.

- [ ] **Step 1: 실패하는 테스트** — `tests/mirror-track.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { bindTracker, T, EVENTS } from '../js/mirror/track.js';

const sent = [];
bindTracker((name, params) => sent.push([name, params]), { strict: true });

test('11종 이름·파라미터가 스펙 §8 그대로', () => {
  assert.deepEqual(Object.keys(EVENTS).sort(), ['decor_buy_mirror', 'mirror_board', 'mirror_clue', 'mirror_cutscene_end', 'mirror_enter', 'mirror_found', 'mirror_hint', 'mirror_leave', 'mirror_onboard', 'mirror_return', 'mirror_stop_shown']);
  assert.deepEqual(EVENTS.mirror_found, ['quest_n', 'item_id', 'spot_id', 'flipped', 'hinted', 'search_s']);
});

test('불린은 0/1 · 키 순서 무관', () => {
  sent.length = 0;
  T.found({ hinted: false, quest_n: 2, item_id: 'yarn', spot_id: 'clock-r', flipped: true, search_s: 12.3 });
  assert.deepEqual(sent[0], ['mirror_found', { quest_n: 2, item_id: 'yarn', spot_id: 'clock-r', flipped: 1, hinted: 0, search_s: 12.3 }]);
});

test('strict — 빠진 키·모르는 키·열거값 밖은 throw', () => {
  assert.throws(() => T.clue({ quest_n: 1, npc_id: 'farmer', spot_id: 'well-l' }), /flipped/);
  assert.throws(() => T.onboard({ step: 'stop', source: 'x' }), /source/);
  assert.throws(() => T.onboard({ step: 'oops' }), /step/);
});

test('예약 파라미터 이름 금지 · 호출부는 trackEvent 를 직접 부르지 않는다', { skip: !existsSync(new URL('../js/spaces/mirror.js', import.meta.url)) && 'Task 10 전' }, () => {
  for (const keys of Object.values(EVENTS)) for (const k of keys) assert.doesNotMatch(k, /^(source|medium|campaign|campaign_id|term|content)$/);
  const src = readFileSync(new URL('../js/spaces/mirror.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /trackEvent\('/);
  for (const fn of ['stopShown', 'board', 'cutsceneEnd', 'enter', 'clue', 'hint', 'found', 'ret', 'leave', 'onboard']) assert.match(src, new RegExp(`T\\.${fn}\\(`), fn);
  for (const step of ['stop', 'arrive', 'flip', 'return']) assert.match(src, new RegExp(`T\\.onboard\\(\\{ step: '${step}' \\}\\)`), step);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/mirror-track.test.mjs` → FAIL

- [ ] **Step 3: 구현** — `js/mirror/track.js`

```js
// =============================================================
//  🪞 거울 마을 트래킹 — 스펙 §8 의 11종을 이름·파라미터째 한곳에 고정한다
//  ------------------------------------------------------------
//  호출부(js/spaces/mirror.js · indoor.js)는 trackEvent 를 직접 부르지 않고 T.* 만 쓴다(quest_id 누락 사고 재발 방지).
//  싱크는 주입(bindTracker) — Node 테스트가 analytics.js(브라우저 전역) 없이 돈다.
// =============================================================
export const EVENTS = Object.freeze({
  mirror_stop_shown:   ['prior_visits', 'night'],
  mirror_board:        ['dir', 'first', 'done_today'],
  mirror_cutscene_end: ['dir', 'skipped', 'at_s', 'short'],
  mirror_enter:        ['visit_n', 'done_today'],
  mirror_clue:         ['quest_n', 'npc_id', 'spot_id', 'flipped'],
  mirror_hint:         ['quest_n', 'spot_id', 'wait_s'],
  mirror_found:        ['quest_n', 'item_id', 'spot_id', 'flipped', 'hinted', 'search_s'],
  mirror_return:       ['quest_n', 'reward'],
  mirror_leave:        ['done_today', 'elapsed_s'],
  mirror_onboard:      ['step'],
  decor_buy_mirror:    ['item', 'cost', 'left'],
});
const ENUMS = { dir: ['go', 'back'], step: ['stop', 'arrive', 'flip', 'return'] };

let sink = null, strict = false;
export function bindTracker(fn, opts = {}) { sink = fn; strict = !!opts.strict; }

function emit(name, p) {
  const keys = EVENTS[name], out = {}, bad = [];
  for (const k of keys) {
    if (!(k in p)) { bad.push(`missing ${k}`); continue; }
    const v = p[k];
    if (ENUMS[k] && !ENUMS[k].includes(v)) bad.push(`bad ${k}=${v}`);
    out[k] = typeof v === 'boolean' ? +v : v;
  }
  for (const k of Object.keys(p)) if (!keys.includes(k)) bad.push(`unknown ${k}`);
  if (bad.length) { const msg = `[mirror track] ${name}: ${bad.join(', ')}`; if (strict) throw new Error(msg); console.warn(msg); }
  sink?.(name, out);
}
export const T = Object.freeze({
  stopShown: (p) => emit('mirror_stop_shown', p),
  board: (p) => emit('mirror_board', p),
  cutsceneEnd: (p) => emit('mirror_cutscene_end', p),
  enter: (p) => emit('mirror_enter', p),
  clue: (p) => emit('mirror_clue', p),
  hint: (p) => emit('mirror_hint', p),
  found: (p) => emit('mirror_found', p),
  ret: (p) => emit('mirror_return', p),
  leave: (p) => emit('mirror_leave', p),
  onboard: (p) => emit('mirror_onboard', p),
  decorBuy: (p) => emit('decor_buy_mirror', p),
});
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/mirror-track.test.mjs` → PASS (3, 1 skipped)

- [ ] **Step 5: Commit**

```bash
git add js/mirror/track.js tests/mirror-track.test.mjs
git commit -m "feat: 🪞 mirror village tracking wrapper (11 events, strict param check)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 탑승 연출 시간표(순수)

**Files:**
- Create: `js/mirror/ride-schedule.js`
- Test: `tests/mirror-ride-schedule.test.mjs`

**Interfaces:**
- Produces: `rideSchedule(first) → { walk, board, rise, pass, descend, alight: [a,b], gate: [a,b], flash: number, total }`; `phaseAt(sched, t) → { name, p }`(t ≥ total → `{ name: 'done', p: 1 }`).

- [ ] **Step 1: 실패하는 테스트** — `tests/mirror-ride-schedule.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rideSchedule, phaseAt } from '../js/mirror/ride-schedule.js';

for (const first of [true, false]) test(`단계가 빈틈없이 이어진다 (first=${first})`, () => {
  const s = rideSchedule(first);
  const order = ['walk', 'board', 'rise', 'pass', 'descend', 'alight'];
  assert.equal(s.walk[0], 0);
  for (let i = 1; i < order.length; i++) assert.equal(s[order[i]][0], s[order[i - 1]][1], order[i]);
  assert.equal(s.total, s.alight[1]);
  assert.ok(s.flash > s.pass[0] && s.flash < s.pass[1], '번쩍(공간 전환)은 거울 문을 지나는 중간');
  assert.ok(s.gate[0] >= s.rise[0] && s.gate[1] <= s.pass[0], '거울 문은 이륙하는 동안 일어선다');
});

test('길이 — 첫 회 ≈5.6s, 이후 ≈2.4s (스펙 §2)', () => {
  assert.ok(Math.abs(rideSchedule(true).total - 5.6) < 0.05);
  assert.ok(Math.abs(rideSchedule(false).total - 2.4) < 0.05);
});

test('phaseAt', () => {
  const s = rideSchedule(true), mid = s.rise[0] + (s.rise[1] - s.rise[0]) / 2;
  assert.deepEqual(phaseAt(s, 0), { name: 'walk', p: 0 });
  assert.equal(phaseAt(s, mid).name, 'rise');
  assert.ok(Math.abs(phaseAt(s, mid).p - 0.5) < 1e-9);
  assert.deepEqual(phaseAt(s, 99), { name: 'done', p: 1 });
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/mirror-ride-schedule.test.mjs` → FAIL

- [ ] **Step 3: 구현** — `js/mirror/ride-schedule.js`

```js
// 🪞 거울 마을 탑승 연출 시간표(순수) — js/mirror/ride.js 가 쓴다 · tests/mirror-ride-schedule.test.mjs
//   걷기 → 올라앉기 → 이륙(🪞 거울 문이 일어섬) → 거울 문 통과(가운데서 번쩍 = 공간 전환) → 내려앉기 → 하차
const FIRST = { walk: 1.0, board: 0.4, rise: 1.2, pass: 0.4, descend: 1.9, alight: 0.7 };
const SHORT = { walk: 0.3, board: 0.2, rise: 0.5, pass: 0.2, descend: 0.8, alight: 0.4 };
const ORDER = ['walk', 'board', 'rise', 'pass', 'descend', 'alight'];
const round = (v) => Math.round(v * 1000) / 1000;

export function rideSchedule(first) {
  const d = first ? FIRST : SHORT, s = {};
  let t = 0;
  for (const k of ORDER) { s[k] = [round(t), round(t + d[k])]; t += d[k]; }
  s.total = round(t);
  s.flash = round((s.pass[0] + s.pass[1]) / 2);
  s.gate = [round(s.rise[0] + d.rise * 0.15), round(s.rise[1] - d.rise * 0.1)];
  return Object.freeze(s);
}

export function phaseAt(s, t) {
  if (t >= s.total) return { name: 'done', p: 1 };
  for (const k of ORDER) { const [a, b] = s[k]; if (t < b) return { name: k, p: Math.max(0, (t - a) / (b - a)) }; }
  return { name: 'done', p: 1 };
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/mirror-ride-schedule.test.mjs` → PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add js/mirror/ride-schedule.js tests/mirror-ride-schedule.test.mjs
git commit -m "feat: 🪞 mirror ride schedule (walk, board, gate pass, alight)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 주민 몸 추출 — `buildNPCFigure(def)` (동작 불변 리팩터)

**Files:**
- Modify: `js/spaces/npc.js` (`buildNPCs` 루프 첫 7줄, 284~296행)
- Test: `tests/npc-figure.test.mjs`

**Interfaces:**
- Produces: `export function buildNPCFigure(def) → { group, body, look }` — 몸통(Icosahedron 0.5)·머리(0.38)·`buildNPCLook`·공용 눈(look.eyes 없을 때, `userData.npcEye = true`). 위치·scene 추가는 호출부.

- [ ] **Step 1: 실패하는 테스트(소스 잠금)** — `tests/npc-figure.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const NPC = readFileSync(new URL('../js/spaces/npc.js', import.meta.url), 'utf8');

test('buildNPCFigure 를 내보내고 buildNPCs 가 그것을 쓴다(외형 코드 한 벌)', () => {
  assert.match(NPC, /export function buildNPCFigure\(def\) \{/);
  assert.match(NPC, /const \{ group: g, body, look \} = buildNPCFigure\(def\);/);
  assert.equal((NPC.match(/new THREE\.IcosahedronGeometry\(0\.5, 1\)/g) || []).length, 1, '몸통 생성은 한 곳');
  assert.match(NPC, /e\.userData\.npcEye = true;/, '거울 쌍둥이가 공용 눈을 찾아 발광으로 바꾼다');
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/npc-figure.test.mjs` → FAIL

- [ ] **Step 3: 구현** — `buildNPCs` 바로 위에 추가:

```js
/** 주민 몸 한 벌(몸통·머리·외형 장식·눈) — 마을 주민과 🪞 거울 마을 보색 쌍둥이가 같이 쓴다. 위치·scene 추가는 호출부 */
export function buildNPCFigure(def) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clayMat(def.color, false));
  body.position.y = 0.55; body.castShadow = true; body.scale.set(1, 1.05, 1); g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(def.skin || 0xffe0c0, false));
  head.position.y = 1.15; head.castShadow = true; g.add(head);
  const look = buildNPCLook(g, def) || {};
  if (!look.eyes) {   // 🦉 올빼미처럼 제 눈을 직접 그린 외형은 공용 눈을 얹지 않는다
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
    [-0.13, 0.13].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat); e.position.set(ex, 1.18, 0.32); e.userData.npcEye = true; g.add(e); });
  }
  return { group: g, body, look };
}
```

`buildNPCs` 루프 안 기존 줄(`const g = new THREE.Group();` 부터 공용 눈 `if (!look.eyes) { … }` 블록 끝까지)을 교체:

```js
    const { group: g, body, look } = buildNPCFigure(def);
    g.position.set(def.pos[0], 0, def.pos[2]);
```

(`scene.add(g);` 부터 아래는 그대로.)

- [ ] **Step 4: 통과 확인 + 전체 회귀** — Run: `node --test tests/npc-figure.test.mjs && npm test 2>&1 | tail -5` → PASS · `fail 0`

- [ ] **Step 5: Commit**

```bash
git add js/spaces/npc.js tests/npc-figure.test.mjs
git commit -m "refactor: extract buildNPCFigure for reuse by mirror twins (no behavior change)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 거울 마을 조형

**Files:**
- Create: `js/mirror/art-color.js`, `js/mirror/art.js`
- Create: `dev/active/mirror-village/mockups/real-world.html` (스모크용)
- Test: `tests/mirror-art-colors.test.mjs`

**Interfaces:**
- Consumes: layout.js, `bakeGroup` (`js/dream/art.js` — `bakeGroup(root)` 은 메시 트리를 **각 메시 `material.color` 의 정점색**으로 구운 지오메트리 하나를 돌려준다; 구현 전에 `js/dream/art.js:18-45` 를 읽어 색 출처가 `material.color` 인지 확인하고, 다르면 거기 맞춘다).
- Produces: `invertColorPure(hex)`(art-color) · art.js: `PAL3`, `invertColor`(재수출), `mirrorizeFigure(group)`, `makeStopShelter(roof, wood)`, `makeLostItem(id)`, `makeMirrorGate() → { group, setRise(k), setOpen(k) }`, `buildMirrorWorld() → { group, items: Map<itemId, Group>, npcAnchors: Group[3], beam: Mesh, update(t) }`.

- [ ] **Step 1: 실패하는 테스트** — `tests/mirror-art-colors.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invertColorPure } from '../js/mirror/art-color.js';

const hsl = (hex) => { const r = (hex >> 16 & 255) / 255, g = (hex >> 8 & 255) / 255, b = (hex & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; return { s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l }; };
test('보색 — 채도 ≤ 0.56, 명도 0.44~0.73(블룸 임계 아래, 밤 배경에서 묻히지 않게)', () => {
  for (const c of [0x5fbf62, 0x3f8fd6, 0xf7f4ee, 0x222222, 0xffffff, 0xf0cd6a, 0x27506f]) {
    const o = invertColorPure(c), { s, l } = hsl(o);
    assert.ok(s <= 0.56 && l >= 0.44 && l <= 0.73, `${c.toString(16)} → ${o.toString(16)} s${s.toFixed(2)} l${l.toFixed(2)}`);
  }
  assert.notEqual(invertColorPure(0x5fbf62), 0x5fbf62);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/mirror-art-colors.test.mjs` → FAIL

- [ ] **Step 3: 구현** — `js/mirror/art-color.js`

```js
// 🪞 보색 쌍둥이 색 규칙(순수) — 확정 시안 dev/active/mirror-village/mockups/residents.html v=2 의 inv() 와 같다
export function invertColorPure(hex) {
  const c = 0xffffff - hex;
  let r = (c >> 16 & 255) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l0 = (mx + mn) / 2, d = mx - mn;
  const s0 = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const s = Math.min(s0, 0.55), l = Math.min(Math.max(l0, 0.45), 0.72);
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2;
  [r, g, b] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255);
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/mirror-art-colors.test.mjs` → PASS

- [ ] **Step 5: 구현** — `js/mirror/art.js`

```js
// =============================================================
//  🪞 거울 마을 — 조형(THREE 만 의존, 게임 상태 없음)
//  ------------------------------------------------------------
//  스펙 §3·§4 · 확정 시안: 외관 3안 색 반전 숲(mockups/village.html?v=3) · 물건 원색 저폴리(items.html?v=1) · 거울 문(cutscene.html?f=3b)
//  ⚡ 드로우콜 ≤ 60 — 고정 조형(땅·표지물·집·숲 링·덮개 15)은 bakeGroup 으로 solid(무광)·glow(발광) 두 덩이.
//     따로 두는 것: 물건(그날 활성 1개만 보임) · 주민 3(npc 몸) · 빛기둥 1 · 오로라 1 · 반딧불 Points 1 · 거울 문
//  ⚠️ 블룸 임계 0.85 — 흰 발광 금지(연못·등불은 채도 있는 파스텔)
// =============================================================
import * as THREE from 'three';
import { bakeGroup } from '../dream/art.js';
import { LANDMARKS, HOUSES, SPOTS, MIRROR_STOP_LOCAL } from './layout.js';
import { invertColorPure } from './art-color.js';
export { invertColorPure as invertColor };

export const PAL3 = Object.freeze({
  sky: 0x120f2e, fog: 0x2e2858, ground: 0x50629a, pondGlow: 0xc89eff, stone: 0xb8b0d0,
  wood: 0xc8c0e0, roofA: 0x7ad6c0, roofB: 0x6ab8e0, wallB: 0xe8b8d0, lampGlow: 0x9ef6d0,
  leaf: [0xdfe6f2, 0xc8d6ea, 0xeef2ff], trunk: 0x8a86a8, bush: [0x5a6aa0, 0x6a5aa8],
  walls: [0xc8a0d8, 0xa8c0e8, 0xe0b0c0], roofs: [0x6ad6b0, 0xe0d06a, 0x7ab8f0], win: [0x9ef6d0, 0xffe08a, 0xff9ee0],
});
const mat = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85 });
function put(parent, geo, color, x, y, z) { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); parent.add(m); return m; }

/** 보색 쌍둥이 — 그룹 안 재질을 복제해 색만 보색으로. 공용 눈(userData.npcEye)은 하늘빛 발광 */
export function mirrorizeFigure(group) {
  group.traverse(o => {
    if (!o.isMesh) return;
    if (o.userData.npcEye) { o.material = new THREE.MeshBasicMaterial({ color: 0xbff6ff }); return; }
    const m = o.material.clone();   // ⚠️ clayMat 은 공유 재질일 수 있다 — 복제 없이 바꾸면 마을 주민 색까지 뒤집힌다
    if (m.color) m.color.setHex(invertColorPure(m.color.getHex()));
    if (m.emissive) m.emissive.setHex(0x000000);
    o.material = m;
  });
}

export function makeStopShelter(roof, wood) {
  const g = new THREE.Group();
  for (const s of [-1.1, 1.1]) put(g, new THREE.CylinderGeometry(0.09, 0.11, 2.3, 6), wood, s, 1.15, -0.4);
  put(g, new THREE.BoxGeometry(2.8, 0.16, 1.3), roof, 0, 2.36, -0.25).rotation.x = 0.12;
  put(g, new THREE.BoxGeometry(1.8, 0.12, 0.45), wood, 0, 0.48, -0.55);
  put(g, new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), 0x8a8f99, 1.7, 1.3, 0.2);
  put(g, new THREE.BoxGeometry(1.0, 0.4, 0.06), 0xfff8ea, 1.7, 2.4, 0.2);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function star(r1, r2) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1, a = i / 10 * Math.PI * 2 + Math.PI / 2; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return s; }
const warm = (c, k = 0.25) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, flatShading: true, roughness: 0.85 });
function at(parent, geo, m, x, y, z) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; }
const ITEM_BUILD = {
  ring(g) { at(g, new THREE.TorusGeometry(0.26, 0.07, 6, 14), warm(0xffd27a), 0, 0.3, 0); at(g, new THREE.OctahedronGeometry(0.11, 0), warm(0x9ee8ff, 0.6), 0, 0.6, 0); },
  musicbox(g) { at(g, new THREE.BoxGeometry(0.55, 0.32, 0.4), warm(0xff9e9e), 0, 0.16, 0); at(g, new THREE.BoxGeometry(0.58, 0.07, 0.42), warm(0xffd27a), 0, 0.38, -0.08).rotation.x = -0.5; },
  carrot(g) { at(g, new THREE.ConeGeometry(0.22, 0.62, 8), warm(0xff9e5e), 0, 0.33, 0).rotation.x = Math.PI; [-0.08, 0, 0.08].forEach((x, i) => { at(g, new THREE.ConeGeometry(0.06, 0.28, 5), warm(0x86d18a), x, 0.74, 0).rotation.z = (i - 1) * 0.4; }); },
  yarn(g) { at(g, new THREE.SphereGeometry(0.28, 10, 8), warm(0xc8a0ff), 0, 0.28, 0); [0, 1, 2].forEach(i => { at(g, new THREE.TorusGeometry(0.285, 0.025, 4, 16), warm(0xe8d0ff), 0, 0.28, 0).rotation.set(i * 0.9, i * 0.6, 0.3); }); },
  lantern(g) { at(g, new THREE.BoxGeometry(0.34, 0.42, 0.34), warm(0xffd59e, 0.8), 0, 0.26, 0); at(g, new THREE.ConeGeometry(0.28, 0.16, 4), warm(0xb05a3a), 0, 0.55, 0).rotation.y = Math.PI / 4; },
  brooch(g) { at(g, new THREE.ExtrudeGeometry(star(0.3, 0.13), { depth: 0.07, bevelEnabled: false }), warm(0xffe08a, 0.4), 0, 0.36, 0); at(g, new THREE.SphereGeometry(0.06, 6, 4), warm(0xff9ee0, 0.6), 0, 0.36, 0.09); },
};
export function makeLostItem(id) {
  const b = ITEM_BUILD[id]; if (!b) throw new Error(`unknown lost item: ${id}`);
  const g = new THREE.Group(); g.name = `lost:${id}`; b(g); return g;
}

let haloTex = null;
function halo(color, size, op) {
  if (!haloTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const gr = x.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(cv); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); return s;
}

/** 🪞 거울 문 — 은빛 고리 + 거울면(색 반전 마을 색) + 후광. setRise: 세로로 일어섬(0..1) · setOpen: 면 불투명도 */
export function makeMirrorGate() {
  const group = new THREE.Group(); group.name = 'mirrorGate';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.28, 10, 48), new THREE.MeshStandardMaterial({ color: 0xe6ebf5, metalness: 0.35, roughness: 0.25, emissive: 0x9ec8ff, emissiveIntensity: 0.4 }));
  const face = new THREE.Mesh(new THREE.CircleGeometry(3.3, 48), new THREE.MeshBasicMaterial({ color: 0x3a2f68, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  group.add(ring, face, halo(0xc89eff, 12, 0.45));
  group.visible = false;
  return {
    group,
    setRise(k) { group.scale.set(1, Math.max(0.001, k), 1); group.visible = k > 0.001; },
    setOpen(k) { face.material.opacity = Math.min(1, Math.max(0, k)) * 0.95; },
  };
}

function lowTree(parent, x, z, s, leaf, trunk) {
  put(parent, new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.4 * s, 6), trunk, x, 0.7 * s, z);
  put(parent, new THREE.IcosahedronGeometry(1.0 * s, 0), leaf, x, 1.9 * s, z);
  put(parent, new THREE.IcosahedronGeometry(0.7 * s, 0), leaf, x + 0.4 * s, 2.5 * s, z + 0.1 * s);
}
function placed(parent, x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); return g; }
function cover(parent, s, P, i) {
  if (s.cover === 'bush') put(parent, new THREE.IcosahedronGeometry(0.55, 0), P.bush[i % 2], s.x, 0.35, s.z).scale.set(1.3, 0.8, 1.1);
  else if (s.cover === 'rock') put(parent, new THREE.DodecahedronGeometry(0.5, 0), P.stone, s.x, 0.24, s.z);
  else lowTree(parent, s.x, s.z - 0.3, 0.9, P.leaf[i % 3], P.trunk);
}

/** 거울 마을 전체 — group 은 MIRROR 좌표에 놓는다 */
export function buildMirrorWorld() {
  const P = PAL3, group = new THREE.Group(); group.name = 'mirrorWorld';
  const solid = new THREE.Group(), glow = new THREE.Group();
  put(solid, new THREE.CircleGeometry(23, 56), P.ground, 0, 0, 0).rotation.x = -Math.PI / 2;
  put(solid, new THREE.RingGeometry(23, 70, 48), P.bush[0], 0, -0.01, 0).rotation.x = -Math.PI / 2;
  const LM = Object.fromEntries(LANDMARKS.map(l => [l.id, l]));
  // 🪞 연못
  put(glow, new THREE.CircleGeometry(3, 32), P.pondGlow, 0, 0.03, 0).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; put(solid, new THREE.DodecahedronGeometry(0.34, 0), P.stone, Math.cos(a) * 3.3, 0.16, Math.sin(a) * 3.3); }
  // 🪣 우물
  { const { x, z } = LM.well;
    put(solid, new THREE.CylinderGeometry(0.9, 0.95, 0.9, 10), P.stone, x, 0.45, z);
    put(glow, new THREE.CylinderGeometry(0.7, 0.7, 0.05, 10), P.pondGlow, x, 0.92, z);
    for (const s of [-1, 1]) put(solid, new THREE.BoxGeometry(0.12, 1.6, 0.12), P.wood, x + s * 0.85, 1.3, z);
    put(solid, new THREE.ConeGeometry(1.25, 0.7, 4), P.roofA, x, 2.4, z).rotation.y = Math.PI / 4; }
  // 🕰️ 거꾸로 시계탑 — 지붕이 아래, 받침이 위
  { const { x, z } = LM.clock;
    put(solid, new THREE.ConeGeometry(1.1, 1.6, 4), P.roofB, x, 0.8, z).rotation.set(Math.PI, Math.PI / 4, 0);
    put(solid, new THREE.BoxGeometry(1.5, 3.4, 1.5), P.wallB, x, 3.3, z);
    put(solid, new THREE.BoxGeometry(1.9, 0.35, 1.9), P.stone, x, 5.15, z);
    put(glow, new THREE.CylinderGeometry(0.55, 0.55, 0.06, 20), 0xffe8b0, x, 3.9, z + 0.78).rotation.x = Math.PI / 2; }
  // 🏮 등불 기둥
  { const { x, z } = LM.lamp; put(solid, new THREE.CylinderGeometry(0.12, 0.16, 3.2, 6), P.wood, x, 1.6, z); put(glow, new THREE.BoxGeometry(0.6, 0.7, 0.6), P.lampGlow, x, 3.4, z); }
  // 🚏 거울 정류장(지붕이 남쪽, 앞이 북쪽 연못을 본다)
  { const sh = makeStopShelter(P.roofA, P.wood); sh.position.set(LM.stop.x, 0, LM.stop.z); sh.rotation.y = Math.PI; solid.add(sh); }
  // 집 3 — 창문은 같은 변환의 glow 그룹에
  HOUSES.forEach((h, i) => {
    const s = placed(solid, h.x, h.z, h.ry), w = placed(glow, h.x, h.z, h.ry);
    put(s, new THREE.BoxGeometry(3, 2.2, 2.6), P.walls[i], 0, 1.1, 0);
    const r = put(s, new THREE.ConeGeometry(2.4, 1.5, 4), P.roofs[i], 0, 2.95, 0); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.85);
    put(s, new THREE.BoxGeometry(0.7, 1.1, 0.05), 0x4a4060, 0, 0.55, 1.31);
    for (const wx of [-0.75, 0.75]) put(w, new THREE.BoxGeometry(0.6, 0.6, 0.05), P.win[i], wx, 1.3, 1.31);
  });
  // 가장자리 숲 링 — ⚠️ 정류장 남쪽(z > 14, |x − 2.5| < 7)엔 나무 금지(화면 아래를 가림, 시안 확인)
  for (let i = 0; i < 34; i++) {
    const a = i / 34 * Math.PI * 2, r = 20.5 + (i % 3) * 1.4, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > 14 && Math.abs(x - MIRROR_STOP_LOCAL.x) < 7) continue;
    lowTree(solid, x, z, 1.5 + (i % 2) * 0.4, P.leaf[i % 3], P.trunk);
  }
  SPOTS.forEach((s, i) => cover(solid, s, P, i));
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
  body.castShadow = true; body.receiveShadow = true;
  group.add(body, new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  // 오로라 1 · 반딧불 1
  const aur = new THREE.Mesh(new THREE.PlaneGeometry(120, 14), new THREE.MeshBasicMaterial({ color: 0x9ec8ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  aur.position.set(0, 30, -70); aur.rotation.z = 0.08; group.add(aur);
  const fp = new Float32Array(40 * 3);
  for (let i = 0; i < 40; i++) { fp[i * 3] = Math.sin(i * 12.9898) * 16; fp[i * 3 + 1] = 0.6 + (i % 7); fp[i * 3 + 2] = Math.cos(i * 78.233) * 15; }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  group.add(new THREE.Points(fg, new THREE.PointsMaterial({ color: 0x9ef6d0, size: 0.18, transparent: true, opacity: 0.8 })));
  // 물건(런타임이 위치·가시성) · 💧 힌트 빛기둥 · 주민 자리
  const items = new Map();
  for (const id of Object.keys(ITEM_BUILD)) { const g = makeLostItem(id); g.visible = false; group.add(g); items.set(id, g); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.visible = false; beam.position.y = 3.5; group.add(beam);
  const npcAnchors = [0, 1, 2].map(() => { const a = new THREE.Group(); group.add(a); return a; });
  const update = (t) => {
    aur.material.opacity = 0.12 + Math.sin(t * 0.7) * 0.04;
    for (const g of items.values()) if (g.visible) g.rotation.y = t * 1.2;
    npcAnchors.forEach((a, i) => { a.position.y = Math.sin(t * 1.6 + i) * 0.08; });
  };
  return { group, items, npcAnchors, beam, update };
}
```

- [ ] **Step 6: 브라우저 스모크** — `dev/active/mirror-village/mockups/real-world.html`

```html
<!doctype html><meta charset="utf-8"><title>Mirror Real World</title>
<script type="importmap">{ "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }</script>
<body style="margin:0;background:#000">
<script type="module">
import * as THREE from 'three';
import { buildMirrorWorld, PAL3 } from '/js/mirror/art.js';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(innerWidth, innerHeight); document.body.appendChild(r.domElement);
r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.45;
const s = new THREE.Scene(); s.background = new THREE.Color(PAL3.sky); s.fog = new THREE.Fog(PAL3.fog, 26, 90);
s.add(new THREE.HemisphereLight(0xe0d4ff, 0x3a3270, 1.35)); const d = new THREE.DirectionalLight(0xe8dcff, 1); d.position.set(10, 22, 8); s.add(d);
const w = buildMirrorWorld(); s.add(w.group);
const c = new THREE.PerspectiveCamera(innerHeight > innerWidth ? 60 : 45, innerWidth / innerHeight, 0.1, 300); c.position.set(2.5, 14, 28.4); c.lookAt(2.5, 0, 10.9);
r.info.autoReset = false; r.render(s, c); window.__calls = r.info.render.calls;
</script></body>
```

Run: `node tools/mirror/mock-shots.mjs real-world.html real a=1 --port 9410`
Expected: `dev/active/mirror-village/mockups/real/pc-a-1.png` 가 시안 `village/pc-v-3.png` 와 같은 배치·팔레트, 정류장 남쪽에 나무 없음. (CDP 로 `__calls` 를 읽어 ≤ 12 인지도 확인 — 공간 고정 조형 몫)

- [ ] **Step 7: Commit**

```bash
git add js/mirror/art.js js/mirror/art-color.js tests/mirror-art-colors.test.mjs dev/active/mirror-village/mockups/real-world.html dev/active/mirror-village/mockups/real
git commit -m "feat: 🪞 mirror village art (baked world, lost items, mirror gate, twin recolor)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 거울 장식 4종(카탈로그·조형·결제)

**Files:**
- Modify: `js/data/catalog.js` (70행 꿈 장식 블록 아래)
- Create: `js/mirror/decor-art.js`
- Modify: `js/spaces/indoor.js` (36행 import · 431행 decorMesh 분기 · 683~694행 결제)
- Modify: `js/game.js:1641` (꾸미기 목록 필터)
- Modify: `index.html:4409`, `:4419`
- Test: `tests/mirror-decor.test.mjs`

**Interfaces:**
- Consumes: `T.decorBuy` (track.js), `bakeGroup` (dream/art.js).
- Produces: `MIRROR_DECOR_IDS`, `buildMirrorDecor(id) → Group`.

- [ ] **Step 1: 실패하는 테스트** — `tests/mirror-decor.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('카탈로그 4종 · 🪞 결제 · 거울 마을 다녀온 뒤에만 목록에', () => {
  const cat = read('js/data/catalog.js');
  for (const [id, cost] of [['upsidePot', 6], ['waterMirror', 10], ['shadowBear', 14], ['mirrorLamp', 22]]) {
    assert.match(cat, new RegExp(`id: '${id}',[^\\n]*cost: ${cost},[^\\n]*pay: 'mirror', mirror: true`), id);
  }
  assert.match(cat, /id: 'upsidePot',[^\n]*sm: true/);
  assert.match(cat, /id: 'shadowBear', name: '거울 곰 인형'/);
  assert.match(cat, /id: 'mirrorLamp', name: '거울 등불'/);
  assert.match(read('js/game.js'), /\.filter\(d => !d\.mirror \|\| \(gameState\.mirror\?\.visits \|\| 0\) > 0 \|\| \(kept\[d\.id\] \|\| 0\) > 0\)/);
});

test('결제 — 부족 토스트·트래킹은 래퍼 경유·아이콘 🪞', () => {
  const ind = read('js/spaces/indoor.js');
  assert.match(ind, /pay === 'mirror' \? `거울 조각이 부족해요 \(필요 \$\{def\.cost\} 🪞\)`/);
  assert.match(ind, /if \(pay === 'mirror'\) MirrorT\.decorBuy\(\{ item: id, cost: def\.cost, left: gameState\.inventory\.mirror \}\);/);
  assert.match(ind, /MIRROR_DECOR_IDS\.includes\(id\)\) \{[^\n]*\n\s+g\.add\(buildMirrorDecor\(id\)\);/);
  const html = read('index.html');
  assert.match(html, /pay === 'mirror' \? '🪞'/);
  assert.match(html, /pay === 'mirror' \? '거울 조각이 부족해요 🪞'/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/mirror-decor.test.mjs` → FAIL

- [ ] **Step 3: 카탈로그** — `js/data/catalog.js` 꿈 장식 4줄 아래

```js
  // 🪞 거울 장식 — 🪞 거울 조각(거울 마을 의뢰, 하루 최대 9)으로만 산다. 거울 마을을 한 번 다녀온 뒤에 보인다(mirror: true · game.js getDecor)
  //   외관 보색 반전(시안 mockups/compare-decor.png 2안 확정) · waterMirror 는 벽걸이 체계가 없어 바닥 스탠드 거울
  { id: 'upsidePot',   name: '거꾸로 화분', ico: '🪴', cost: 6,  pay: 'mirror', mirror: true, foot: [0.34, 0.34], sm: true, h: 0.7 },
  { id: 'waterMirror', name: '물빛 거울',   ico: '🪞', cost: 10, pay: 'mirror', mirror: true, foot: [0.6, 0.3] },
  { id: 'shadowBear', name: '거울 곰 인형', ico: '🧸', cost: 14, pay: 'mirror', mirror: true, foot: [0.5, 0.45] },
  { id: 'mirrorLamp', name: '거울 등불',   ico: '🏮', cost: 22, pay: 'mirror', mirror: true, foot: [0.5, 0.5] },
```

- [ ] **Step 4: 조형** — `js/mirror/decor-art.js`

```js
// =============================================================
//  🪞 거울 장식 4종 조형 — js/spaces/indoor.js decorMesh 가 부른다 · 원점 = 바닥 중심, 배율 전
//  확정 시안 mockups/decor.html?v=2(보색 반전) · 메시 ≤2(무광 한 덩이 + 발광 한 덩이, bakeGroup)
//  ⚠️ 소품(sm) 높이는 catalog h 이하 — tests/decor-ceiling.test.mjs
// =============================================================
import * as THREE from 'three';
import { bakeGroup } from '../dream/art.js';
export const MIRROR_DECOR_IDS = ['upsidePot', 'waterMirror', 'shadowBear', 'mirrorLamp'];
function P(parent, geo, color, x, y, z) { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color })); m.position.set(x, y, z); parent.add(m); return m; }
const BUILD = {
  upsidePot(s, g) {   // 뒤집힌 화분이 가는 받침 위에 떠 있고 잎이 아래로 — 전체 높이 ≤ 0.7
    P(s, new THREE.CylinderGeometry(0.16, 0.21, 0.28, 10), 0x3fb8a8, 0, 0.56, 0).rotation.x = Math.PI;
    P(g, new THREE.TorusGeometry(0.21, 0.03, 6, 14), 0xff9ee0, 0, 0.44, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; P(s, new THREE.SphereGeometry(0.09, 6, 4), 0xc85fc8, Math.cos(a) * 0.1, 0.3 - (i % 2) * 0.06, Math.sin(a) * 0.1).scale.set(0.6, 1.6, 0.4); }
    P(s, new THREE.CylinderGeometry(0.03, 0.05, 0.26, 6), 0x9a8ad0, 0, 0.13, 0);
  },
  waterMirror(s, g) {   // 바닥 스탠드 거울 — 타원 고리 + 물빛 면 + 다리
    P(s, new THREE.TorusGeometry(0.42, 0.05, 6, 28), 0x5a7ad6, 0, 1.0, 0).scale.set(0.75, 1, 1);
    P(g, new THREE.CircleGeometry(0.4, 28), 0x9ee8ff, 0, 1.0, 0.01).scale.set(0.75, 1, 1);
    P(s, new THREE.BoxGeometry(0.06, 0.6, 0.06), 0x5a7ad6, 0, 0.3, 0);
    P(s, new THREE.BoxGeometry(0.5, 0.05, 0.26), 0x5a7ad6, 0, 0.03, 0);
    P(g, new THREE.SphereGeometry(0.05, 8, 6), 0xffe08a, 0, 1.45, 0.02);
  },
  shadowBear(s, g) {
    const F = 0x5f9ac8;
    P(s, new THREE.SphereGeometry(0.32, 12, 10), F, 0, 0.3, 0).scale.set(1, 0.95, 0.9);
    P(s, new THREE.SphereGeometry(0.25, 12, 10), F, 0, 0.72, 0.02);
    for (const k of [-1, 1]) {
      P(s, new THREE.SphereGeometry(0.09, 8, 6), F, k * 0.18, 0.93, 0);
      P(s, new THREE.SphereGeometry(0.1, 8, 6), F, k * 0.3, 0.32, 0.14);
      P(s, new THREE.SphereGeometry(0.12, 8, 6), F, k * 0.17, 0.08, 0.2).scale.set(1, 0.7, 1.3);
      P(g, new THREE.SphereGeometry(0.035, 6, 4), 0x9ee8ff, k * 0.09, 0.76, 0.22);
    }
    P(s, new THREE.SphereGeometry(0.09, 8, 6), 0x2a4a7a, 0, 0.68, 0.22).scale.set(1.2, 0.8, 0.8);
  },
  mirrorLamp(s, g) {
    P(s, new THREE.CylinderGeometry(0.22, 0.28, 0.12, 10), 0x7a5ad6, 0, 0.06, 0);
    P(s, new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), 0x7a5ad6, 0, 0.8, 0);
    P(g, new THREE.OctahedronGeometry(0.22, 0), 0x9ef6d0, 0, 1.75, 0).scale.set(1, 1.4, 1);
  },
};
/** 거울 장식 하나 — Group(몸체 + 발광). 모르는 id 면 throw(카탈로그와 어긋난 걸 조용히 넘기지 않는다) */
export function buildMirrorDecor(id) {
  const b = BUILD[id]; if (!b) throw new Error(`unknown mirror decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group(); b(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
  body.castShadow = true; body.receiveShadow = true; out.add(body);
  if (glow.children.length) out.add(new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  return out;
}
```

- [ ] **Step 5: indoor.js** — 36행 아래:

```js
import { MIRROR_DECOR_IDS, buildMirrorDecor } from '../mirror/decor-art.js';   // 🪞 거울 장식 4종
import { T as MirrorT } from '../mirror/track.js';
```

`decorMesh` 꿈 장식 분기(`g.add(buildDreamDecor(id));`) 바로 아래:

```js
  } else if (MIRROR_DECOR_IDS.includes(id)) {   // 🪞 거울 장식 — 🪞 거울 조각으로 산다(js/mirror/decor-art.js)
    g.add(buildMirrorDecor(id));
```

결제 토스트(`pay === 'shard' ? …` 줄 아래):

```js
               : pay === 'mirror' ? `거울 조각이 부족해요 (필요 ${def.cost} 🪞)`
```

`decor_buy_shard` 줄 아래:

```js
    if (pay === 'mirror') MirrorT.decorBuy({ item: id, cost: def.cost, left: gameState.inventory.mirror });   // [GA4] 🪞 거울 조각 싱크(js/mirror/track.js 경유)
```

> `MirrorT` 는 Task 10 의 `bindTracker` 가 불린 뒤에야 실제로 보낸다. 거울 장식은 거울 마을을 다녀온 뒤에만 보이므로(목록 필터) 그 전에 불릴 일이 없다 — 그래도 안전하게, `js/spaces/mirror.js` 가 모듈 로딩 시점에 `bindTracker` 를 부른다(game.js 가 정적 import 하므로 부팅 때 실행).

- [ ] **Step 6: game.js 꾸미기 필터** — 1641행(꿈 필터) 바로 아래 줄:

```js
      .filter(d => !d.mirror || (gameState.mirror?.visits || 0) > 0 || (kept[d.id] || 0) > 0)   // 🪞 거울 마을을 다녀오기 전엔 🪞 화폐가 뭔지 모른다
```

- [ ] **Step 7: index.html** — 4409행 `pay === 'shard' ? '✨'` 앞에 `pay === 'mirror' ? '🪞' : ` · 4419행 `pay === 'shard' ? '꿈 조각이 부족해요 ✨'` 앞에 `pay === 'mirror' ? '거울 조각이 부족해요 🪞' : `

- [ ] **Step 8: 통과 확인 + 천장 규칙** — Run: `node --test tests/mirror-decor.test.mjs tests/decor-ceiling.test.mjs` → PASS. `decor-ceiling` 이 소품 id 목록을 하드코딩했다면 `'upsidePot'` 을 추가하고, 조형 모듈 목록을 import 한다면 `MIRROR_DECOR_IDS` 도 같이 넣는다(테스트를 읽고 판단).

- [ ] **Step 9: Commit**

```bash
git add js/data/catalog.js js/mirror/decor-art.js js/spaces/indoor.js js/game.js index.html tests/mirror-decor.test.mjs tests/decor-ceiling.test.mjs
git commit -m "feat: 🪞 mirror decor (4 items, mirror shard payment, hidden until first visit)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 탑승 연출 런타임 — `js/mirror/ride.js`

**Files:**
- Create: `js/mirror/ride.js`

**Interfaces:**
- Consumes: `rideSchedule`, `phaseAt` (Task 5).
- Produces: `startRide({ dir, first, route, hooks }) → { update(dt), skip(), done }`.
  - `route = { from: { board:{x,z}, park:{x,z,heading}, gate:{x,y,z} }, to: { gate:{x,y,z}, park:{x,z,heading}, landing:{x,z} } }` — **월드** 좌표.
  - `hooks = { player, playerAnchor, camera, carriage /* scene 직속 Group */, gateFrom, gateTo /* makeMirrorGate() */, flash(a), teleport(), land({ skipped, atS, short }) }`.
  - 계약: `teleport()` 는 정확히 한 번(건너뛰기여도). `land()` 는 마지막에 한 번. 건너뛰기 = 즉시 teleport(아직이면) + 착지 상태.

- [ ] **Step 1: 구현**

```js
// =============================================================
//  🪞 거울 마을 탑승 연출 — 걷기 → 올라앉기 → 이륙(🪞 거울 문이 일어섬) → 거울 문 통과(번쩍 = 공간 전환) → 내려앉기 → 하차
//  ------------------------------------------------------------
//  스펙 §2 · 확정 시안 mockups/compare-cut1.png(공통) · compare-cut3.png ③-B(거울 문)
//  게임 상태를 직접 만지지 않는다 — 호출부(js/spaces/mirror.js)가 넘긴 객체·콜백만 움직인다. 시간표는 ride-schedule.js(순수).
//  ⚠️ 1차 js/dream/cutscene.js 는 건드리지 않는다(라이브 꿈길 회귀 0) — 카메라 문법(옆에서 잡기·세로 화면 K)만 같다.
// =============================================================
import * as THREE from 'three';
import { rideSchedule, phaseAt } from './ride-schedule.js';

const smooth = (p) => { const c = Math.min(1, Math.max(0, p)); return c * c * (3 - 2 * c); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _a = new THREE.Vector3(), _t = new THREE.Vector3(), _look = new THREE.Vector3(), _w = new THREE.Vector3();

function curveFrom(f) {   // 정박 → 문 쪽으로 오르며 → 문 3 앞(문 높이) → 문 중심
  const dx = f.gate.x - f.park.x, dz = f.gate.z - f.park.z, len = Math.hypot(dx, dz) || 1;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(f.park.x, 0, f.park.z),
    new THREE.Vector3(f.park.x + dx * 0.35, f.gate.y * 0.55, f.park.z + dz * 0.35),
    new THREE.Vector3(f.gate.x - dx / len * 3, f.gate.y, f.gate.z - dz / len * 3),
    new THREE.Vector3(f.gate.x, f.gate.y, f.gate.z),
  ]);
}
function curveTo(t) {     // 문 중심 → 내려오며 → 정박
  const dx = t.park.x - t.gate.x, dz = t.park.z - t.gate.z;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(t.gate.x, t.gate.y, t.gate.z),
    new THREE.Vector3(t.gate.x + dx * 0.4, t.gate.y * 0.9, t.gate.z + dz * 0.4),
    new THREE.Vector3(t.gate.x + dx * 0.8, 1.2, t.gate.z + dz * 0.8),
    new THREE.Vector3(t.park.x, 0, t.park.z),
  ]);
}

export function startRide({ dir, first, route, hooks }) {
  const S = rideSchedule(first), A = curveFrom(route.from), B = curveTo(route.to);
  const st = { t: 0, done: false, teleported: false, dir };
  const start = hooks.player.position.clone();
  const { carriage: car, player, playerAnchor, camera } = hooks;
  const seatW = () => { car.updateMatrixWorld(true); return _w.set(0, car.userData.seatY, -0.1).applyMatrix4(car.matrixWorld).clone(); };
  const onCurve = (curve, u, endHeading) => {
    curve.getPointAt(u, _a); curve.getTangentAt(Math.min(u, 0.999), _t);
    car.position.copy(_a);
    const travel = Math.atan2(_t.x, _t.z), k = endHeading == null ? 0 : smooth((u - 0.8) / 0.2);
    car.rotation.y = travel + wrap((endHeading ?? travel) - travel) * k;
    car.rotation.x = -Math.sin(u * Math.PI) * 0.12;
  };
  const sitOn = () => { player.position.copy(seatW()); player.rotation.y = car.rotation.y; playerAnchor.position.y = -0.3; };   // 앉기 포즈(프롤로그·꿈길과 같은 값)
  function cam(back) {   // 마차 왼쪽 옆에서 — 옆에서 봐야 초승달로 읽힌다(꿈길 실측). 세로 화면은 더 멀리
    const K = Math.max(1, Math.min(2.0, 0.85 / camera.aspect)), yaw = car.rotation.y, dist = 7 + 4 * back;
    _look.copy(player.position); _look.y += 1.0;
    camera.position.set(_look.x - Math.cos(yaw) * dist * K, _look.y + (2.4 + 2.6 * back) * K, _look.z + Math.sin(yaw) * dist * K);
    camera.lookAt(_look);
  }
  function teleport() {
    if (st.teleported) return;
    st.teleported = true;
    hooks.gateFrom.setRise(0);
    hooks.teleport();
    hooks.gateTo.setRise(1); hooks.gateTo.setOpen(1);
  }
  function finish(skipped) {
    if (st.done) return;
    teleport();
    onCurve(B, 1, route.to.park.heading); car.rotation.x = 0;
    hooks.gateTo.setRise(0);
    player.position.set(route.to.landing.x, 0, route.to.landing.z);
    playerAnchor.position.y = 0;
    hooks.flash(0);
    st.done = true;
    hooks.land({ skipped, atS: Math.round(st.t * 10) / 10, short: !first });
  }
  hooks.gateFrom.setRise(0); hooks.gateTo.setRise(0);
  car.position.set(route.from.park.x, 0, route.from.park.z); car.rotation.set(0, route.from.park.heading, 0);
  st.update = (dt) => {
    if (st.done) return;
    st.t += dt;
    const ph = phaseAt(S, st.t);
    if (ph.name === 'done') { finish(false); return; }
    if (ph.name === 'walk') {   // 지금 자리 → 승차 지점(종종걸음)
      const p = smooth(ph.p), bx = route.from.board.x, bz = route.from.board.z;
      player.position.set(start.x + (bx - start.x) * p, 0, start.z + (bz - start.z) * p);
      if (Math.hypot(bx - start.x, bz - start.z) > 0.05) player.rotation.y = Math.atan2(bx - start.x, bz - start.z);
      playerAnchor.position.y = Math.abs(Math.sin(st.t * 14)) * 0.06;
      cam(0);
    } else if (ph.name === 'board') {   // 승차 지점 → 좌석(살짝 뛰어 오름)
      const p = smooth(ph.p), seat = seatW(), bx = route.from.board.x, bz = route.from.board.z;
      player.position.set(bx + (seat.x - bx) * p, seat.y * p + Math.sin(p * Math.PI) * 0.6, bz + (seat.z - bz) * p);
      playerAnchor.position.y = -0.3 * p;
      cam(0);
    } else if (ph.name === 'rise') {
      onCurve(A, smooth(ph.p) * 0.85, null); sitOn();
      const g = smooth((st.t - S.gate[0]) / (S.gate[1] - S.gate[0]));
      hooks.gateFrom.setRise(g); hooks.gateFrom.setOpen(g);
      cam(ph.p * 0.6);
    } else if (ph.name === 'pass') {
      if (st.t < S.flash) { onCurve(A, 0.85 + 0.15 * ph.p, null); }
      else { teleport(); onCurve(B, 0, null); }
      sitOn();
      hooks.flash(Math.sin(ph.p * Math.PI) * 0.9);   // 거울 문 통과 — 보랏빛 번쩍(가장 밝을 때 공간이 바뀐다)
      cam(0.6);
    } else if (ph.name === 'descend') {
      teleport(); hooks.flash(0);
      const p = smooth(ph.p); onCurve(B, p, route.to.park.heading); sitOn();
      hooks.gateTo.setRise(1 - smooth((ph.p - 0.5) / 0.5));
      cam(0.6 * (1 - p) + 0.2);
    } else if (ph.name === 'alight') {
      const p = smooth(ph.p), seat = seatW(), lx = route.to.landing.x, lz = route.to.landing.z;
      car.rotation.x = 0;
      player.position.set(seat.x + (lx - seat.x) * p, seat.y * (1 - p) + Math.sin(p * Math.PI) * 0.5, seat.z + (lz - seat.z) * p);
      playerAnchor.position.y = -0.3 * (1 - p);
      cam(0.2);
    }
  };
  st.skip = () => finish(true);
  return st;
}
```

- [ ] **Step 2: 문법 확인** (실동작은 Task 13 실측)

Run: `node --check js/mirror/ride.js && node --input-type=module -e "import('./js/mirror/ride-schedule.js').then(m=>console.log(m.rideSchedule(true).total))"`
Expected: 오류 없음 · `5.6`

- [ ] **Step 3: Commit**

```bash
git add js/mirror/ride.js
git commit -m "feat: 🪞 mirror ride runtime (walk, board, mirror gate, alight)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 공간 런타임 — `js/spaces/mirror.js`

**Files:**
- Create: `js/spaces/mirror.js`

**Interfaces:**
- Consumes (game.js 순환, 함수 안에서만): `$w, atMirror, camera, dist2D, firstHintBanner, gameState, handAnchor, isNight, makeNameTag, player, playerAnchor, refreshInventoryUI, requestSave, scene, setSpaceVisible, snapCamera, solidBox, spawnFloatText, spawnSparkle, todayStr, ui` — 구현 전 `git grep -n "^export {\|^  .*makeNameTag\|isNight," js/game.js` 로 export 여부 확인, 빠진 것은 game.js 맨 아래 export 목록에 추가(꿈의 숲이 쓰는 것과 같은 방식). `trackEvent` (analytics.js) · `NPCS` (data/npcs.js) · `buildNPCFigure` (npc.js) · `setBGMTheme`, `Sound` (sound.js) · Task 1~9.
- Produces: `mirrorState()`, `setMirrorVisible(on)`, `mirrorVillagePrompt() → {nd, prompt}|null`, `mirrorPrompt() → {nd, prompt}`, `mirrorAction(nd)`, `mirrorRideActive()`, `skipMirrorRide()`, `updateMirrorRide(dt, t) → boolean`, `updateMirror(dt, t)`, `syncVillageCarriage(inVillage)`, `clampToMirror(pos)`, `mirrorReturnPos() → {x,z}`, `MIRROR_MAP`, `mirrorMinimapMarks(marks)`.

- [ ] **Step 1: 구현**

```js
// =============================================================
//  🪞 거울 마을 — 낮에 🚏 정류장 → 초승달 마차 → 🪞 거울 문 → 색 반전 마을에서 보색 쌍둥이 주민의 잃어버린 물건 찾기
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-08-mirror-village-design.md
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만. let 쓰기는 `$w.x = …`.
//  ▶ 좌표 js/mirror/layout.js(로컬, 월드 = MIRROR + 로컬) · 의뢰 quests.js · 문장 clues.js · 조형 art.js · 연출 ride.js
//  ▶ 트래킹은 js/mirror/track.js 의 T.* 만(스펙 §8 11종 — trackEvent 직접 호출 금지, tests/mirror-track.test.mjs 가 잠금)
// =============================================================
import {
  $w, atMirror, camera, dist2D, firstHintBanner, gameState, handAnchor, isNight, makeNameTag, player, playerAnchor,
  refreshInventoryUI, requestSave, scene, setSpaceVisible, snapCamera, solidBox, spawnFloatText, spawnSparkle, todayStr, ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { trackEvent } from '../analytics.js';
import { MIRROR } from '../data/places.js';
import { NPCS } from '../data/npcs.js';
import { buildNPCFigure } from './npc.js';
import {
  LANDMARKS, NPC_SPOTS, SOLIDS, MIRROR_LANDING, MIRROR_STOP_LOCAL, MIRROR_PARK, MIRROR_GATE_LOCAL, STOP_REACH, PICK_R, TALK_R,
  VILLAGE_BOARD, VILLAGE_PARK, LAKE_GATE, clampWalkable, spotOf,
} from '../mirror/layout.js';
import { QUESTS_PER_DAY, normalizeMirror, questAt, rewardFor } from '../mirror/quests.js';
import { clueText, clueShort, hintText, npcName } from '../mirror/clues.js';
import { buildMirrorWorld, invertColor, makeMirrorGate, mirrorizeFigure } from '../mirror/art.js';
import { makeMoonCarriage } from '../dream/art.js';
import { startRide } from '../mirror/ride.js';
import { T, bindTracker } from '../mirror/track.js';
import { Sound, setBGMTheme } from '../sound.js';
import * as THREE from 'three';

// 로컬에선 파라미터가 엇나가면 바로 터지게(strict), 운영에선 경고만
bindTracker(trackEvent, { strict: ['localhost', '127.0.0.1'].includes(location.hostname) });

const HINT_AFTER_S = 30;
const TWIN_IDS = ['farmer', 'angler', 'chef'];   // NPC_SPOTS 순서와 같다
let world = null, carriage = null, gateLake = null, gateMirror = null, twins = [];
let ride = null;            // 진행 중 연출
let active = null;          // 단서를 들은 의뢰 { q, heardAt, hinted, hintShown } — 저장하지 않는다(스펙 §6)
let arrivedAt = 0, lastHud = '', stopShownKey = null;
const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ko');
const secs = (from) => Math.round((performance.now() - from) / 100) / 10;
const W = (l) => ({ x: MIRROR.x + l.x, z: MIRROR.z + l.z });

/** 머리 위 💬 — 다음 의뢰를 줄 주민만 보인다 */
function bubbleSprite() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.roundRect(8, 10, 80, 62, 18); x.fill();
  x.font = '44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('💬', 48, 42);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  s.scale.set(0.8, 0.8, 0.8); s.position.y = 2.95; s.visible = false;
  return s;
}

function ensureWorld() {
  if (world) return world;
  world = buildMirrorWorld();
  world.group.position.set(MIRROR.x, 0, MIRROR.z);
  world.group.visible = false;
  scene.add(world.group);
  for (const b of SOLIDS) solidBox(MIRROR.x + b.x1, MIRROR.z + b.z1, MIRROR.x + b.x2, MIRROR.z + b.z2);
  // 보색 쌍둥이 — 실제 주민 몸 그대로, 색만 뒤집는다(시안 residents.html v=2 확정)
  twins = TWIN_IDS.map((id, i) => {
    const def = NPCS.find(d => d.id === id);
    const { group } = buildNPCFigure(def);
    mirrorizeFigure(group);
    const s = NPC_SPOTS[i]; group.position.set(s.x, 0, s.z); group.rotation.y = s.ry;
    const tag = makeNameTag({ ...def, name: npcName(id, 'ko'), color: invertColor(def.color) });
    tag.position.y = 2.25; group.add(tag);
    const bubble = bubbleSprite(); group.add(bubble);
    world.npcAnchors[i].add(group);
    return { id, group, spot: s, bubble };
  });
  gateMirror = makeMirrorGate();
  gateMirror.group.position.set(MIRROR.x + MIRROR_GATE_LOCAL.x, MIRROR_GATE_LOCAL.y, MIRROR.z + MIRROR_GATE_LOCAL.z);
  scene.add(gateMirror.group);
  return world;
}
/** 마을 쪽 — 정박 마차와 호수 거울 문(처음 낮에 마을을 돌 때 지어진다) */
function ensureVillageSide() {
  if (carriage) return;
  carriage = makeMoonCarriage(); carriage.name = 'mirrorCarriage';
  carriage.position.set(VILLAGE_PARK.x, 0, VILLAGE_PARK.z); carriage.rotation.y = VILLAGE_PARK.heading;
  scene.add(carriage);
  gateLake = makeMirrorGate(); gateLake.group.position.set(LAKE_GATE.x, LAKE_GATE.y, LAKE_GATE.z);
  scene.add(gateLake.group);
}
/** 낮엔 정류장에 마차가 서 있다(발견성) · 밤엔 막차가 끊긴다 — game.js 루프에서 매 프레임(가벼움) */
export function syncVillageCarriage(inVillage) {
  if (ride) return;
  if (!inVillage) { if (carriage) carriage.visible = false; return; }
  ensureVillageSide();
  carriage.visible = !isNight();
}

export function mirrorState() {
  const today = todayStr(), m = gameState.mirror;
  if (m && m.day === today && Number.isInteger(m.done)) return m;
  gameState.mirror = normalizeMirror(m, today);
  return gameState.mirror;
}
export function setMirrorVisible(on) { if (world) world.group.visible = on; }

// ── 마을 정류장 ──────────────────────────────────────────────
/** doors.js 마을 분기에서 — 정류장 앞이면 { nd, prompt }, 아니면 null */
export function mirrorVillagePrompt() {
  if (dist2D(VILLAGE_BOARD, player.position) >= STOP_REACH) { stopShownKey = null; return null; }
  const night = isNight(), key = `${todayStr()}:${+night}`;
  if (stopShownKey !== key) { stopShownKey = key; T.stopShown({ prior_visits: mirrorState().visits, night }); }
  if (night) return { nd: null, prompt: '🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서' };
  if (firstHintBanner('mirrorStop', '🚏', '마차 정류장', '낮엔 🪞 거울 마을에 갈 수 있어요')) T.onboard({ step: 'stop' });
  return { nd: 'mirrorgo', prompt: '🪞 거울 마을행 타기' };
}

// ── 탑승 ─────────────────────────────────────────────────────
function routeGo() {
  return {
    from: { board: VILLAGE_BOARD, park: VILLAGE_PARK, gate: LAKE_GATE },
    to: { gate: { x: MIRROR.x + MIRROR_GATE_LOCAL.x, y: MIRROR_GATE_LOCAL.y, z: MIRROR.z + MIRROR_GATE_LOCAL.z }, park: { ...W(MIRROR_PARK), heading: MIRROR_PARK.heading }, landing: W(MIRROR_LANDING) },
  };
}
function routeBack() {
  const g = routeGo();
  return { from: { board: W(MIRROR_STOP_LOCAL), park: g.to.park, gate: g.to.gate }, to: { gate: LAKE_GATE, park: VILLAGE_PARK, landing: VILLAGE_BOARD } };
}
function board(dir) {
  if (ride) return;
  if (dir === 'go' && isNight()) { ui.toast?.('🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서'); return; }   // 프롬프트를 띄운 채 해가 진 경우
  ensureWorld(); ensureVillageSide();
  const m = mirrorState(), first = dir === 'go' ? m.visits === 0 : !gameState.hintsSeen.mirrorReturn;
  T.board({ dir, first, done_today: m.done });
  $w.sleeping = true; $w.sitting = false;   // 이동·액션·앉기·도구 전환 잠금(꿈길과 같은 잠금)
  if (handAnchor) handAnchor.visible = false;
  carriage.visible = true;
  Sound.blip();
  ui.setDreamSkip?.(true);   // 건너뛰기 버튼은 꿈길 것을 같이 쓴다(Input.dreamSkip 이 둘 다 부른다)
  ride = startRide({
    dir, first, route: dir === 'go' ? routeGo() : routeBack(),
    hooks: {
      player, playerAnchor, camera, carriage,
      gateFrom: dir === 'go' ? gateLake : gateMirror, gateTo: dir === 'go' ? gateMirror : gateLake,
      flash: (a) => ui.sleepFade?.(a, 'mirror'),
      teleport: () => (dir === 'go' ? enterSpace() : leaveSpace()),
      land: (r) => (dir === 'go' ? arrive(r) : backHome(r)),
    },
  });
}
export function mirrorRideActive() { return !!ride; }
export function skipMirrorRide() { ride?.skip(); }
/** 루프에서 매 프레임 — 연출 중이면 true(카메라·입력은 연출 몫) */
export function updateMirrorRide(dt, t) { if (!ride) return false; ride.update(dt); world?.update(t); return true; }

function enterSpace() {
  $w.atMirror = true;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastDoorPrompt = null;
  mirrorState().visits += 1;
  active = null; refreshWorld();
  setSpaceVisible(); setBGMTheme('mirror');
}
function arrive({ skipped, atS, short }) {
  ride = null; ui.setDreamSkip?.(false);
  if (handAnchor) handAnchor.visible = true;
  player.rotation.y = Math.PI;   // 연못(북쪽)을 본다
  snapCamera();
  arrivedAt = performance.now(); lastHud = '';
  setTimeout(() => { $w.sleeping = false; }, 300);   // 번쩍이 걷히는 동안 연타가 새지 않게
  const m = mirrorState();
  T.cutsceneEnd({ dir: 'go', skipped, at_s: atS, short });
  T.enter({ visit_n: m.visits, done_today: m.done });
  syncHud();
  if (!gameState.hintsSeen.mirrorArrive) { gameState.hintsSeen.mirrorArrive = true; ui.showMirrorArrive?.(); T.onboard({ step: 'arrive' }); }
  requestSave();
}
function leaveSpace() {
  $w.atMirror = false;
  active = null; if (world) world.beam.visible = false;
  ui.setZoneHint?.(null); $w.lastZoneHint = null;
  setSpaceVisible(); setBGMTheme('main');
}
function backHome({ skipped, atS, short }) {
  ride = null; ui.setDreamSkip?.(false);
  if (handAnchor) handAnchor.visible = true;
  carriage.position.set(VILLAGE_PARK.x, 0, VILLAGE_PARK.z); carriage.rotation.set(0, VILLAGE_PARK.heading, 0);
  player.rotation.y = Math.PI;
  snapCamera();
  setTimeout(() => { $w.sleeping = false; }, 300);
  const m = mirrorState();
  T.cutsceneEnd({ dir: 'back', skipped, at_s: atS, short });
  T.leave({ done_today: m.done, elapsed_s: secs(arrivedAt) });
  if (firstHintBanner('mirrorReturn', '🪞', '거울 장식', '🛋️ 꾸미기에서 거울 조각으로 바꿔요')) T.onboard({ step: 'return' });
  requestSave();
}

// ── 안에서 ───────────────────────────────────────────────────
function refreshWorld() {
  if (!world) return;
  const next = questAt(mirrorState(), todayStr());
  for (const g of world.items.values()) g.visible = false;
  // 물건은 단서를 들은 의뢰 것만 보인다(미리 주우면 "누구 거지?"가 된다 — 스펙 §4)
  if (active) { const s = spotOf(active.q.spot), g = world.items.get(active.q.item); g.position.set(s.x, 0.15, s.z + 0.35); g.visible = true; }
  world.beam.visible = !!active?.hintShown;
  if (active?.hintShown) { const s = spotOf(active.q.spot); world.beam.position.set(s.x, 3.5, s.z + 0.35); }
  for (const tw of twins) if (tw.bubble) tw.bubble.visible = !!next && !active && next.npc === tw.id;
}
function syncHud() {
  const key = `${mirrorState().done}`;
  if (key === lastHud) return;
  lastHud = key;
  ui.setZoneHint?.(`🪞 거울 마을 · 의뢰 ${mirrorState().done}/${QUESTS_PER_DAY}`);   // 상태는 컨텍스트 슬롯 — 모바일 3단 레이아웃 규칙
  $w.lastZoneHint = 'mirror';
}
const twinWorld = (tw) => W(tw.spot);

/** doors.js atMirror 분기 — { nd, prompt } */
export function mirrorPrompt() {
  if (dist2D(W(MIRROR_STOP_LOCAL), player.position) < STOP_REACH) return { nd: 'mirrorback', prompt: '🚏 마을로 돌아가기' };
  const next = questAt(mirrorState(), todayStr());
  const tw = next && !active ? twins.find(x => x.id === next.npc) : null;
  if (tw && dist2D(twinWorld(tw), player.position) < TALK_R) return { nd: 'mirrortalk', prompt: `💬 ${npcName(tw.id, lang())}에게 말 걸기` };
  if (active) {
    if (!active.hintShown && secs(active.heardAt) >= HINT_AFTER_S) return { nd: 'mirrorhint', prompt: '💧 연못에 비춰 보기' };
    return { nd: null, prompt: active.hintShown ? hintText(active.q, lang()) : clueShort(active.q, lang()) };
  }
  if (!next) return { nd: null, prompt: '오늘 의뢰는 끝났어요 · 🚏 정류장에서 돌아가요' };
  return { nd: null, prompt: `💬 ${npcName(next.npc, lang())}에게 말 걸기` };
}
/** handleAction 에서 — 정류장 타기(마을) · 돌아가기 · 말 걸기 · 힌트 */
export function mirrorAction(nd) {
  if (nd === 'mirrorgo') return board('go');
  if (!atMirror) return;
  if (nd === 'mirrorback') return board('back');
  if (nd === 'mirrortalk') return talk();
  if (nd === 'mirrorhint') return useHint();
}
function talk() {
  const q = questAt(mirrorState(), todayStr()); if (!q || active) return;
  active = { q, heardAt: performance.now(), hinted: false, hintShown: false };
  ui.toast?.(clueText(q, lang()), 5200);
  T.clue({ quest_n: q.n, npc_id: q.npc, spot_id: q.spot, flipped: q.flipped });
  if (q.n === 2 && firstHintBanner('mirrorFlip', '🪞', '거울 말', '여기 주민들은 좌우를 반대로 말해요')) T.onboard({ step: 'flip' });
  refreshWorld();
}
function useHint() {
  if (!active || active.hintShown) return;
  active.hintShown = true; active.hinted = true;
  T.hint({ quest_n: active.q.n, spot_id: active.q.spot, wait_s: secs(active.heardAt) });
  ui.toast?.(hintText(active.q, lang()), 4200);
  refreshWorld();
}
/** 루프에서 매 프레임 — 거울 마을이 아니면 아무것도 안 한다 */
export function updateMirror(dt, t) {
  if (!atMirror || !world || ride) return;
  world.update(t);
  if (!active) return;
  const s = spotOf(active.q.spot);
  if (Math.hypot(player.position.x - MIRROR.x - s.x, player.position.z - MIRROR.z - (s.z + 0.35)) < PICK_R) found();
}
function found() {
  const a = active, m = mirrorState(), next = questAt(m, todayStr());
  active = null;
  // 거울 마을 안에서 자정을 넘기면 어제 의뢰가 남아 있다 — 오늘 다음 의뢰와 다르면 보상 없이 닫는다
  if (!next || next.n !== a.q.n || next.spot !== a.q.spot) { refreshWorld(); return; }
  T.found({ quest_n: a.q.n, item_id: a.q.item, spot_id: a.q.spot, flipped: a.q.flipped, hinted: a.hinted, search_s: secs(a.heardAt) });
  const reward = rewardFor(a.hinted);
  m.done += 1; if (a.hinted) m.hinted.push(a.q.n); m.total += reward;
  gameState.inventory.mirror = (gameState.inventory.mirror || 0) + reward;
  refreshInventoryUI();
  const w = twinWorld(twins.find(x => x.id === a.q.npc));
  spawnSparkle(w.x, 1.4, w.z, 22); spawnFloatText(w.x, 2.2, w.z, `+${reward} 🪞`, '#7ad6c0');
  Sound.starPick?.();
  T.ret({ quest_n: a.q.n, reward });
  ui.toast?.(m.done >= QUESTS_PER_DAY ? '오늘 의뢰는 끝났어요 · 🚏 정류장에서 돌아가요' : `${npcName(a.q.npc, lang())}: "찾아 줘서 고마워요!"`, 3000);
  refreshWorld(); syncHud(); requestSave();
}

/** 원 안으로 — updatePlayer 이동 한계 */
export function clampToMirror(pos) { const c = clampWalkable(pos.x - MIRROR.x, pos.z - MIRROR.z); pos.x = MIRROR.x + c.x; pos.z = MIRROR.z + c.z; }
/** getGameState — 거울 마을에서 저장되면 마을 정류장 앞(z=-700 을 적으면 새로고침 때 마을 밖으로 튄다) */
export function mirrorReturnPos() { return { x: VILLAGE_BOARD.x, z: VILLAGE_BOARD.z }; }

/** 미니맵 — 원 하나 · 표지물 · 정류장(나가는 곳) · 힌트 쓴 자리 */
export const MIRROR_MAP = Object.freeze({ cx: MIRROR.x, cz: MIRROR.z, half: 23 });
export function mirrorMinimapMarks(marks) {
  for (const l of LANDMARKS) marks.push({ x: MIRROR.x + l.x, z: MIRROR.z + l.z, c: '#c8c0e0', r: 1.6 });
  marks.push({ x: MIRROR.x + MIRROR_STOP_LOCAL.x, z: MIRROR.z + MIRROR_STOP_LOCAL.z, c: '#9ecbff', kind: 'exit' });
  if (active?.hintShown) { const s = spotOf(active.q.spot); marks.push({ x: MIRROR.x + s.x, z: MIRROR.z + s.z, c: '#ffd86b', r: 2.4 }); }
}
```

> `makeNameTag(def)` 가 `def.name`·`def.color` 외에 무엇을 읽는지 `git grep -n "function makeNameTag" -A12 js/game.js` 로 확인하고 맞춘다.

- [ ] **Step 2: track 테스트의 skip 이 풀렸는지 확인 + 문법**

Run: `node --test tests/mirror-track.test.mjs && node --check js/spaces/mirror.js`
Expected: PASS (4 tests, skip 0) — 파일이 생겨 마지막 테스트가 돈다

- [ ] **Step 3: Commit**

```bash
git add js/spaces/mirror.js js/game.js
git commit -m "feat: 🪞 mirror village space runtime (stop, ride, quests, hint, HUD, onboarding)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 배선 — game.js · doors.js · 고정 목록 · 사운드 · index.html

**Files:**
- Modify: `js/game.js`, `js/spaces/doors.js`, `js/spaces/outdoor-decor.js:23`, `js/spaces/farm-auto.js:541`, `js/shadow-scope.js:46`, `js/data/tools.js:73`, `js/sound.js`, `index.html`
- Test: `tests/mirror-wiring.test.mjs`

- [ ] **Step 1: 실패하는 배선 테스트** — `tests/mirror-wiring.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// 🪞 거울 마을 배선 — 새 공간을 더할 때 빠뜨리기 쉬운 자리들을 소스에서 잠근다(dream-wiring 과 같은 목록)
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const GAME = read('js/game.js'), DOORS = read('js/spaces/doors.js'), HTML = read('index.html');

test('game.js — 플래그·$w·spaceFlags·가시성·이동 한계·place·도구', () => {
  assert.match(GAME, /let atMirror = false;/);
  assert.match(GAME, /get atMirror\(\) \{ return atMirror; \}, set atMirror\(v\) \{ atMirror = v; \}/);
  assert.match(GAME, /_spaceFlags\.atMirror = atMirror/);
  assert.match(GAME, /setMirrorVisible\(atMirror\)/);
  assert.match(GAME, /\} else if \(atMirror\) \{ clampToMirror\(player\.position\);/);
  assert.equal((GAME.match(/atMirror \? 'mirror' : atDream/g) || []).length, 2, 'place 문자열 2곳(세션 요약·미니맵)');
  assert.match(GAME, /if \(place === 'mirror'\) \{[^\n]*\n[^\n]*mirrorMinimapMarks\(md\.marks\)/);
  assert.match(GAME, /if \(atMirror\) return 'mirror';/);
  assert.match(read('js/data/tools.js'), /mirror: 'none'/);
});

test('game.js — 루프·입력: 연출이 카메라를 갖고 탭·Space·Esc·Enter 로 건너뛴다 · 센서 정지', () => {
  assert.match(GAME, /else if \(updateMirrorRide\(dt, t\)\) \{ wantAction = false; \}/);
  assert.match(GAME, /!intro && !dreamCutActive\(\) && !mirrorRideActive\(\)\) \{\n\s+handleAction\(\);/);
  assert.match(GAME, /if \(mirrorRideActive\(\) && \(e\.code === 'Space' \|\| e\.code === 'Escape' \|\| e\.code === 'Enter'\)\) skipMirrorRide\(\);/);
  assert.match(GAME, /if \(mirrorRideActive\(\)\) \{ skipMirrorRide\(\); return; \}/);
  assert.match(GAME, /dreamSkip\(\) \{ skipDreamCut\(\); skipMirrorRide\(\); \}/);
  assert.match(GAME, /updateMirror\(dt, t\);/);
  assert.match(GAME, /syncVillageCarriage\(inVillage2\(\)\);/);
  assert.match(GAME, /if \(!dreamCutActive\(\) && !mirrorRideActive\(\)\) sampleFrame\(/);
});

test('game.js — 액션·세이브·시간 정지·조명·그림자·나무 제외', () => {
  assert.match(GAME, /if \(atMirror \|\| nearDoor === 'mirrorgo'\) return mirrorAction\(nearDoor\);/);
  assert.match(GAME, /atMirror \? mirrorReturnPos\(\) : atDream \? dreamReturnPos\(\) :/);
  assert.match(GAME, /gameState\.mirror = normalizeMirror\(saved\.mirror, todayStr\(\)\);/);
  assert.match(GAME, /mirror: \{ visits: 0, day: '', done: 0, hinted: \[\], total: 0 \}/);
  assert.match(GAME, /bait: 0, shard: 0, mirror: 0,/);
  assert.match(GAME, /if \(!dayPaused && !atDream && !atMirror\) timeOfDay =/);
  assert.match(GAME, /if \(atMirror\) \{\n\s+hemiLight\.intensity = /);
  assert.match(read('js/shadow-scope.js'), /'atDream', 'atMirror'\]/);
  assert.equal((GAME.match(/dist2D\(\{ x, z \}, MIRROR_STOP\) < 4/g) || []).length, 2, '정류장 주변 나무 제외 2곳');
});

test('doors.js · 고정 목록 · index.html · BGM', () => {
  assert.match(DOORS, /if \(atMirror\) \{[^]*?const mp = mirrorPrompt\(\);/);
  assert.match(DOORS, /const mv = !indoor && mirrorVillagePrompt\(\);/);
  assert.match(DOORS, /\} else if \(mv\) \{/);
  assert.match(DOORS, /inVillage2\(\) \{ return [^}]*!atMirror/);
  assert.match(read('js/spaces/outdoor-decor.js'), /outdoorZone\(\) \{ return [^}]*!atMirror/);
  assert.match(read('js/spaces/farm-auto.js'), /atMine \|\| atDream \|\| atMirror;/);
  assert.match(GAME, /const off = indoor \|\| atCafe \|\| atMuseum \|\| atObservatory \|\| atMine \|\| atDream \|\| atMirror;/);
  assert.match(HTML, /d\.place === 'mirror' \? 'rgba\(80,98,154,0\.8\)'/);
  assert.match(HTML, /d\.place === 'mirror' \? '🪞 거울 마을'/);
  assert.match(HTML, /<div id="mirror-arrive-modal">/);
  assert.match(HTML, /'mirror-arrive-modal': 'mirror-arrive-ok'/);
  assert.match(HTML, /#sleep-fade\.mirror \{/);
  assert.match(HTML, /el\.classList\.toggle\('mirror', tint === 'mirror'\)/);
  assert.doesNotMatch(HTML.slice(HTML.indexOf('id="mirror-arrive-modal"'), HTML.indexOf('id="mirror-arrive-ok"')), /<b>/, '문장 안 <b> 는 영어 모드에서 한국어가 남는다');
  assert.match(read('js/sound.js'), /bgmTheme === 'mirror' \? playMirrorBar/);
  assert.match(GAME, /\{ ico: '🚏', name: '정류장', x: MIRROR_STOP\.x, z: MIRROR_STOP\.z/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/mirror-wiring.test.mjs` → FAIL

- [ ] **Step 3: game.js 배선** — 각 줄은 꿈의 숲 자리 바로 옆(`git grep -n "atDream" js/game.js` 로 현재 행 확인):

1. import(174행 아래):
```js
import { MIRROR_MAP, clampToMirror, mirrorAction, mirrorMinimapMarks, mirrorReturnPos, mirrorRideActive, setMirrorVisible, skipMirrorRide, syncVillageCarriage, updateMirror, updateMirrorRide } from './spaces/mirror.js';   // 📦 🪞 거울 마을(js/mirror/*)
import { normalizeMirror } from './mirror/quests.js';
```
places import(120행)에 `MIRROR, MIRROR_STOP,` 추가. `inVillage2` 를 game.js 가 이미 import 하는지 `git grep -n "inVillage2" js/game.js` — 없으면 doors.js import 줄에 추가.
2. `$w`(266행 아래): `  get atMirror() { return atMirror; }, set atMirror(v) { atMirror = v; },`
3. 상태(464행 아래): `let atMirror = false;                                 // 🪞 거울 마을 안 — js/spaces/mirror.js`
4. `setSpaceVisible`(551행 아래): `  setMirrorVisible(atMirror);   // 🪞 거울 마을(처음 탈 때 지어진다)` · 556행 비 소리 조건 끝 `&& !atDream` → `&& !atDream && !atMirror`
5. 기본 세이브: 963행 `bait: 0, shard: 0,` → `bait: 0, shard: 0, mirror: 0,` · 992행 아래 `  mirror: { visits: 0, day: '', done: 0, hinted: [], total: 0 },   // 🪞 거울 마을 — 누적 방문·그날 마친 의뢰·힌트 쓴 의뢰·누적 조각(js/mirror/quests.js normalizeMirror)`
6. 도구(1475행 아래): `  if (atMirror) return 'mirror';           // 🪞 거울 마을 — 맨손`
7. `Input.dreamSkip`(1704행): `dreamSkip() { skipDreamCut(); skipMirrorRide(); },                       // 🌙 꿈길 · 🪞 탑승 건너뛰기`
8. dev 훅(`window.__dream = {…};` 블록 아래):
```js
    window.__mirror = {   // 🪞 거울 마을 검수(로컬 전용) — tools/mirror/qa.mjs
      day: () => { timeOfDay = 0.35; dayPaused = true; return !isNight(); },
      night: () => { timeOfDay = 0.8; dayPaused = true; return isNight(); },
      stop: () => window.__tp(16, 15.6),
      state: () => ({ atMirror, ride: mirrorRideActive(), sleeping, mirror: gameState.mirror, coins: gameState.inventory.mirror, tod: timeOfDay, pos: window.__pos(), nearDoor }),
      tp: (lx, lz) => { player.position.set(MIRROR.x + lx, 0, MIRROR.z + lz); snapCamera(); return window.__pos(); },
      save: () => { const g = getGameState(); return { pos: g.playerPos, mirror: g.mirror, coins: g.inventory.mirror }; },
      reset: () => { gameState.mirror = { visits: 0, day: '', done: 0, hinted: [], total: 0 }; for (const k of ['mirrorArrive', 'mirrorStop', 'mirrorFlip', 'mirrorReturn']) delete gameState.hintsSeen[k]; return true; },
    };
```
9. place 문자열 2곳(2383행·5586행): `atDream ? 'dream' :` → `atMirror ? 'mirror' : atDream ? 'dream' :`
10. applySave(2535행 아래): `  gameState.mirror = normalizeMirror(saved.mirror, todayStr());   // 🪞 거울 마을 — 타입·범위 검증, 날이 바뀌면 done·hinted 를 비운다`
11. getGameState(2623행): `atNeighbor ? neighborReturnPos() : atDream ? dreamReturnPos() :` → `atNeighbor ? neighborReturnPos() : atMirror ? mirrorReturnPos() : atDream ? dreamReturnPos() :` (거울 마을 시간은 멈춰 있을 뿐 — `timeOfDay` 저장 2626행은 그대로)
12. `_spaceFlags`(2729·2733행): 객체에 `atMirror: false` · 대입 끝에 ` _spaceFlags.atMirror = atMirror;`
13. 나무 제외 2곳: 2854행 천문대 조건 아래 `      || dist2D({ x, z }, MIRROR_STOP) < 4   // 🚏 거울 마을 정류장 — 지붕·정박 마차가 나무에 가리지 않게` · 4448행 천문대 줄 아래 `    if (dist2D({ x, z }, MIRROR_STOP) < 4) continue;                 // 🚏 거울 마을 정류장`
14. 발자국 off(3458행): `|| atMine || atDream;` → `|| atMine || atDream || atMirror;` · outdoors(3516행)·빗줄기/구름(4351·4357행): `!atDream` 옆에 `|| atMirror` / `&& !atMirror`
15. 마을 미니맵 표지(5460행 `{ ico: '🔭', name: '천문대', … }` 아래): `  { ico: '🚏', name: '정류장', x: MIRROR_STOP.x, z: MIRROR_STOP.z, pri: 1 },`
16. 키(5385행 아래): `      if (mirrorRideActive() && (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter')) skipMirrorRide();   // 🪞 탑승 연출 건너뛰기` · 탭(5417행 아래): `    if (mirrorRideActive()) { skipMirrorRide(); return; }   // 🪞 화면 탭 = 건너뛰기`
17. 루프(5568행 아래): `    else if (updateMirrorRide(dt, t)) { wantAction = false; }   // 🪞 탑승 연출(마차·거울 문)이 카메라를 가짐` · 5576행 `!intro && !dreamCutActive()` → `!intro && !dreamCutActive() && !mirrorRideActive()` · 루프 안 `updateDream(dt, t);` 바로 아래 `    updateMirror(dt, t); syncVillageCarriage(inVillage2());`
18. 센서(5617행): `if (!dreamCutActive()) sampleFrame(` → `if (!dreamCutActive() && !mirrorRideActive()) sampleFrame(`
19. 미니맵(5602행 꿈 블록 아래):
```js
      if (place === 'mirror') {   // 🪞 거울 마을 — 원 하나를 한 화면에
        md.cx = MIRROR_MAP.cx; md.cz = MIRROR_MAP.cz; md.half = MIRROR_MAP.half; md.marks = []; mirrorMinimapMarks(md.marks);
      }
```
20. 이동 한계(5803행 꿈 줄 다음): `  } else if (atMirror) { clampToMirror(player.position);   // 🪞 원 안만(숲 링 너머로 못 나간다)` · 5838행 아래 `  if (atMirror) clampToMirror(player.position);   // 🪞 집·연못 상자가 밀어낸 뒤 한 번 더`
21. 시간 정지(6302행): `if (!dayPaused && !atDream) timeOfDay =` → `if (!dayPaused && !atDream && !atMirror) timeOfDay =`
22. 조명(6383행 꿈 블록 아래):
```js
  // 🪞 거울 마을: 시간대 무관 푸른 밤(3안 색 반전 숲) — 해 **자리**도 고정(🏛️·🌙 와 같은 함정)
  if (atMirror) {
    hemiLight.intensity = 0.95; ambient.intensity = 0.6; sunLight.intensity = 1.0;
    ambient.color.setHex(0x8a90d8);
    sunLight.color.setHex(0xe8dcff);
    sunLight.position.set(MIRROR.x + 10, 22, MIRROR.z + 8);
    sunLight.target.position.set(MIRROR.x, 0, MIRROR.z);
    sunLight.target.updateMatrixWorld();
    if (playerLight) playerLight.intensity = 0.6;
    scene.fog.color.setHex(0x2e2858); scene.fog.near = 26; scene.fog.far = 90;
    scene.background = scene.fog.color;
  }
```
그레이딩(6442행): `atDream ? 0.25 :` → `atDream || atMirror ? 0.25 :`
23. 액션(6574행 아래): `  if (atMirror || nearDoor === 'mirrorgo') return mirrorAction(nearDoor);   // 🪞 정류장 타기·말 걸기·힌트·돌아가기`
24. export 목록(7482행): `atMirror,` 추가 · Task 10 에서 필요해진 `isNight`·`makeNameTag` 등도 여기 있는지 확인.

- [ ] **Step 4: doors.js** — import 에 `atMirror` 추가 · `import { mirrorPrompt, mirrorVillagePrompt } from '../spaces/mirror.js';`

꿈 분기(152행 블록) 아래:

```js
  if (atMirror) {      // 🪞 거울 마을: 정류장 돌아가기 / 주민 말 걸기 / 💧 힌트 / 단서 요약(모바일 규칙 — 안내는 프롬프트 줄에만)
    const mp = mirrorPrompt();
    $w.nearDoor = mp.nd;
    if (mp.prompt !== lastDoorPrompt) { $w.lastDoorPrompt = mp.prompt; ui.setDoorPrompt?.(mp.prompt); }
    return;   // 존 힌트(의뢰 N/3)는 js/spaces/mirror.js 가 상태표시로 쓴다
  }
```

마을 게이트 사슬(`… else if (dist2D(… ORCHARD_GATE …` 로 시작하는 if/else 사슬) **직전**에 `const mv = !indoor && mirrorVillagePrompt();` 를 두고, 사슬 안 천문대 `else if` 바로 앞에:

```js
  } else if (mv) {     // 🚏 거울 마을 정류장(낮 운행 · 밤엔 막차 안내만, nd 없음)
    nd = mv.nd; prompt = mv.prompt;
```

`inVillage2`(429행) 끝 `&& !atDream` → `&& !atDream && !atMirror`

- [ ] **Step 5: 고정 목록 4곳**
- `js/spaces/outdoor-decor.js:23` `outdoorZone()` 끝 `&& !atDream` → `&& !atDream && !atMirror` (import 에 `atMirror`)
- `js/spaces/farm-auto.js:541` `… || atMine || atDream;` → `… || atMine || atDream || atMirror;` (import 에 `atMirror`)
- `js/shadow-scope.js:46` 배열 끝 `'atDream'` → `'atDream', 'atMirror'`
- `js/data/tools.js:73` `dream: 'none',` 뒤에 ` mirror: 'none',`

- [ ] **Step 6: sound.js** — DREAM 상수(224행 근처) 아래:

```js
// 🪞 거울 마을 — 꿈과 다른 조로 맑고 신비하게(단조 금지). 위에서 아래로 내려오는 아르페지오(거울), BPM 68
const MIRROR_BPM = 68;
const MIRROR_E = 30 / MIRROR_BPM;
const MIRROR_BAR = MIRROR_E * 8 * 1000;
const MIRROR_CHORDS = [[0, 2, 4, 6], [3, 5, 7, 9], [0, 2, 4, 7], [4, 6, 8, 11]];   // MEL 인덱스
const MIRROR_ROOTS = [65.41, 87.31, 65.41, 98];
const MIRROR_ARP = [3, 2, 1, 0, 1, 2, 3, 2];
```

`playDreamBar` 아래:

```js
// 🪞 거울 마을 마디 — 위에서 내려오는 오르골 + 맑은 바탕음 + 가끔 물방울
function playMirrorBar(at) {
  const bar = barCount++ % MIRROR_CHORDS.length;
  const ch = MIRROR_CHORDS[bar];
  MIRROR_ARP.forEach((k, i) => chime(MEL[ch[k] % MEL.length], MIRROR_E * 2.2, 0.04, { at: at + i * MIRROR_E, wet: 0.45, out: musicGain }));
  padNote(MIRROR_ROOTS[bar], MIRROR_E * 8, 0.04, 'sine', at);
  if (Math.random() < 0.4) chime(MEL[(Math.random() * MEL.length) | 0] * 4, MIRROR_E * 0.8, 0.015, { at: at + (1 + Math.random() * 6) * MIRROR_E, wet: 0.8, out: musicGain });
}
```

`barFn` 앞머리에 `bgmTheme === 'mirror' ? playMirrorBar :`, `barLen` 앞머리에 `bgmTheme === 'mirror' ? MIRROR_BAR :` · 171행 주석에 `| 'mirror'(🪞 거울 마을)`. (`MEL` 길이가 12 미만이면 `% MEL.length` 가 감싼다 — `MEL` 정의를 읽고 확인.)

- [ ] **Step 7: index.html**
1. CSS(1137행 아래): `  #sleep-fade.mirror { background: radial-gradient(ellipse at center, #9ec8ff 0%, #50629a 55%, #120f2e 100%); }`
   1151~1153행 선택자에 `#mirror-arrive-modal` 추가(`#dream-modal, #dream-arrive-modal, #mirror-arrive-modal {…}`, `.show`, `.tut-card`, `h2` 넷 다) · 1169행 아래 `  #mirror-arrive-ok { width: 100%; border: none; border-radius: 14px; min-height: 48px; font-weight: 800; font-size: 15px; cursor: pointer; background: #50629a; color: #fff; }`
2. 마크업(2019행 꿈 도착 카드 `</div>` 아래):
```html
  <!-- 🪞 거울 마을 첫 도착 안내(1회) -->
  <div id="mirror-arrive-modal">
    <div class="tut-card">
      <h2>🪞 거울 마을에 왔어요</h2>
      <ul class="dream-list">
        <li>💬 거울 주민에게 말을 걸어 보세요</li>
        <li>🔍 잃어버린 물건을 찾아 돌려주면 🪞 조각을 받아요</li>
        <li>🚏 정류장에서 언제든 마을로 돌아가요</li>
      </ul>
      <button id="mirror-arrive-ok">알겠어요</button>
    </div>
  </div>
```
3. ui(3327행 `showDreamArrive` 아래):
```js
      showMirrorArrive() {
        const m = $('mirror-arrive-modal');
        $('mirror-arrive-ok').onclick = () => m.classList.remove('show');
        Input.setAnalog(0, 0);
        m.classList.add('show');
      },
```
4. `sleepFade`(3301행 아래): `        if (a > 0) el.classList.toggle('mirror', tint === 'mirror');   // 🪞 거울 문 번쩍은 물빛`
5. 미니맵 바닥색(3703행): `d.place === 'dream' ?` 앞에 `d.place === 'mirror' ? 'rgba(80,98,154,0.8)' : ` · 라벨(3719행): `d.place === 'dream' ? '🌙 꿈의 숲' :` 앞에 `d.place === 'mirror' ? '🪞 거울 마을' : `
6. Space 로 카드 닫기(5542행 `OK_BTN`): `'dream-arrive-modal': 'dream-arrive-ok'` 뒤에 `, 'mirror-arrive-modal': 'mirror-arrive-ok'`

- [ ] **Step 8: 통과 확인 + 전체 회귀**

Run: `node --test tests/mirror-wiring.test.mjs && npm test 2>&1 | tail -6`
Expected: PASS · 전체 `fail 0`. `shadow-scope`·`*-minimap` 테스트가 플래그·장소 목록 전수를 요구해 깨지면 그 테스트 기대값에 `atMirror`/`'mirror'` 를 추가한다(새 공간이 들어갔으니 기대값이 바뀌는 게 맞다 — 동작을 우회하는 수정 금지).

- [ ] **Step 9: Commit**

```bash
git add js/game.js js/spaces/doors.js js/spaces/outdoor-decor.js js/spaces/farm-auto.js js/shadow-scope.js js/data/tools.js js/sound.js index.html tests/
git commit -m "feat: 🪞 wire mirror village into game loop, doors, save, lighting, minimap, BGM

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 영어 문구

**Files:**
- Modify: `js/i18n-en.js` (꿈의 숲 블록 끝 아래)
- Test: `tests/mirror-i18n.test.mjs`

- [ ] **Step 1: 실패하는 테스트** — `tests/mirror-i18n.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
const HAS_KO = /[가-힣]/;
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const RUNTIME = [
  '🪞 거울 마을행 타기', '🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서', '🚏 마을로 돌아가기', '💧 연못에 비춰 보기',
  '오늘 의뢰는 끝났어요 · 🚏 정류장에서 돌아가요', '🪞 거울 마을 · 의뢰 0/3', '🪞 거울 마을 · 의뢰 3/3',
  '💬 거울 농부 삼촌에게 말 걸기', '💬 거울 낚시꾼 할아버지에게 말 걸기', '💬 거울 요리사 판다에게 말 걸기',
  '거울 농부 삼촌: "찾아 줘서 고마워요!"', '거울 낚시꾼 할아버지: "찾아 줘서 고마워요!"', '거울 요리사 판다: "찾아 줘서 고마워요!"',
  '🪞 거울 마을에 왔어요', '💬 거울 주민에게 말을 걸어 보세요', '🔍 잃어버린 물건을 찾아 돌려주면 🪞 조각을 받아요', '🚏 정류장에서 언제든 마을로 돌아가요',
  '마차 정류장', '낮엔 🪞 거울 마을에 갈 수 있어요', '거울 말', '여기 주민들은 좌우를 반대로 말해요', '거울 장식', '🛋️ 꾸미기에서 거울 조각으로 바꿔요',
  '거꾸로 화분', '물빛 거울', '거울 곰 인형', '거울 등불', '거울 조각이 부족해요 🪞', '거울 조각이 부족해요 (필요 14 🪞)',
  '🪞 거울 마을', '정류장', '거울 농부 삼촌', '거울 낚시꾼 할아버지', '거울 요리사 판다',
];
for (const ko of RUNTIME) test(`🪞 en: ${ko}`, () => { const en = t(ko); assert.ok(!HAS_KO.test(en), `"${ko}" → "${en}"`); });
test('🪞 숫자 자리', () => {
  assert.equal(t('🪞 거울 마을 · 의뢰 2/3'), '🪞 Mirror Village · Requests 2/3');
  assert.equal(t('거울 조각이 부족해요 (필요 22 🪞)'), 'Not enough mirror shards (need 22 🪞)');
});
test('🪞 이미 영어로 완성된 단서 문장은 그대로 통과한다', () => {
  const s = 'Mirror Angler: "I lost my ball of yarn under the bush to the left of the 🕰️ upside-down clock tower"';
  assert.equal(t(s), s);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/mirror-i18n.test.mjs` → FAIL

- [ ] **Step 3: 사전 추가** — `js/i18n-en.js` 꿈 블록 끝 아래

```js
  // ── 🪞 거울 마을 ─────────────────────────────────────────
  '🪞 거울 마을행 타기': '🪞 Ride to Mirror Village',
  '🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서': '🌙 The last carriage has left · Dream from your bed tonight',
  '🚏 마을로 돌아가기': '🚏 Ride back to the village',
  '💧 연못에 비춰 보기': '💧 Peek into the pond',
  '오늘 의뢰는 끝났어요 · 🚏 정류장에서 돌아가요': "That's all for today · Head back from the 🚏 stop",
  '🪞 거울 마을 · 의뢰 {0#}/{1#}': '🪞 Mirror Village · Requests {0}/{1}',
  '💬 거울 농부 삼촌에게 말 걸기': '💬 Talk to Mirror Farmer',
  '💬 거울 낚시꾼 할아버지에게 말 걸기': '💬 Talk to Mirror Angler',
  '💬 거울 요리사 판다에게 말 걸기': '💬 Talk to Mirror Chef Panda',
  '거울 농부 삼촌: "찾아 줘서 고마워요!"': 'Mirror Farmer: "Thank you for finding it!"',
  '거울 낚시꾼 할아버지: "찾아 줘서 고마워요!"': 'Mirror Angler: "Thank you for finding it!"',
  '거울 요리사 판다: "찾아 줘서 고마워요!"': 'Mirror Chef Panda: "Thank you for finding it!"',
  '거울 농부 삼촌': 'Mirror Farmer', '거울 낚시꾼 할아버지': 'Mirror Angler', '거울 요리사 판다': 'Mirror Chef Panda',
  '🪞 거울 마을에 왔어요': '🪞 Welcome to Mirror Village',
  '💬 거울 주민에게 말을 걸어 보세요': '💬 Talk to the mirror villagers',
  '🔍 잃어버린 물건을 찾아 돌려주면 🪞 조각을 받아요': '🔍 Find what they lost to earn 🪞 shards',
  '🚏 정류장에서 언제든 마을로 돌아가요': '🚏 Ride home from the stop anytime',
  '마차 정류장': 'Carriage Stop',
  '낮엔 🪞 거울 마을에 갈 수 있어요': 'By day, ride to 🪞 Mirror Village',
  '거울 말': 'Mirror-speak',
  '여기 주민들은 좌우를 반대로 말해요': 'Villagers here say left and right the wrong way round',
  '거울 장식': 'Mirror Decor',
  '🛋️ 꾸미기에서 거울 조각으로 바꿔요': '🛋️ Trade mirror shards for decor in Decorate',
  '거꾸로 화분': 'Upside-down Pot', '물빛 거울': 'Water Mirror', '거울 곰 인형': 'Mirror Bear', '거울 등불': 'Mirror Lamp',
  '거울 조각이 부족해요 🪞': 'Not enough mirror shards 🪞',
  '거울 조각이 부족해요 (필요 {0#} 🪞)': 'Not enough mirror shards (need {0} 🪞)',
  '🪞 거울 마을': '🪞 Mirror Village',
  '정류장': 'Carriage Stop',
```

> 이름표(`makeNameTag`)는 한국어 이름으로 그린다(캔버스 텍스처) — 영어 모드에서 이름표 글자가 바뀌는지는 기존 주민과 같은 경로를 따른다. 기존 주민 이름표가 `t()` 를 거치면 그대로 되고, 아니면 `npcName(id, lang())` 로 그리게 Task 10 의 `makeNameTag` 호출을 바꾼다(기존 동작 확인 후).

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/mirror-i18n.test.mjs tests/i18n-*.test.mjs tests/dream-i18n.test.mjs` → PASS

- [ ] **Step 5: Commit**

```bash
git add js/i18n-en.js tests/mirror-i18n.test.mjs
git commit -m "feat: 🪞 mirror village English copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 오프라인 실측 QA + 꿈길 회귀 + 드로우콜

**Files:**
- Create: `tools/mirror/qa.mjs`

- [ ] **Step 1: QA 스크립트** — `tools/dream/qa.mjs` 1~40행(부트: 차단 URL·포커스 에뮬·0.7s bringToFront·`ev`·`check`·`KEYS`·`press`·`hold`·게스트·캐릭터·안내 닫기)을 그대로 복사하고 `OUT` 을 `.scratch/mirror/qa`, URL 포트를 `8033`, 쿼리를 `?dbg=1&weather=clear&time=0.42${lang ? '&lang=' + lang : ''}` 로. `KEYS` 에 `Enter: ['Enter', 13]` 추가. 그 뒤 검사:

```js
const shot = async (n) => b.shot(`${OUT}/${dev}${lang}-${n}.png`);
const prompt = () => ev(`document.getElementById('door-prompt')?.textContent || ''`);
const waitRide = async () => { for (let i = 0; i < 80; i++) { const s = await ev('__mirror.state()'); if (s && s.ride === false && s.sleeping === false) return s; await b.sleep(300); } return ev('__mirror.state()'); };
const Q = `(await import('/js/mirror/quests.js'))`, LY = `(await import('/js/mirror/layout.js'))`;

// M1 밤 정류장 = 안내만
await ev('__mirror.reset()'); await ev('__mirror.night()'); await ev('__mirror.stop()'); await b.sleep(900);
check('M1 밤 정류장 프롬프트 = 막차 안내', /막차|last carriage/.test(await prompt()), await prompt());
await press('Space'); await b.sleep(400);
check('M1b 밤엔 Space 로 안 탄다', (await ev('__mirror.state()')).ride === false);
// M2 낮 탑승(실제 Space) → 연출 → 도착
await ev('__mirror.day()'); await b.sleep(700);
check('M2 낮 정류장 프롬프트', /거울 마을행|Mirror Village/.test(await prompt()), await prompt());
await press('Space'); await b.sleep(500);
check('M2b 탑승 연출 시작', (await ev('__mirror.state()')).ride === true);
await shot('m2-board');
let st = await waitRide();
check('M2c 거울 마을 도착·조작 해제·방문 1', st.atMirror === true && st.mirror.visits === 1, JSON.stringify(st.pos));
await ev(`document.getElementById('mirror-arrive-ok')?.click()`); await b.sleep(400); await shot('m2-arrive');
// M3 시간 정지
const t0 = (await ev('__mirror.state()')).tod; await b.sleep(2500);
check('M3 거울 마을 시간 정지', t0 === (await ev('__mirror.state()')).tod);
// M4 저장 = 마을 정류장 앞
check('M4 거울 마을 저장 좌표 = 정류장 앞', JSON.stringify((await ev('__mirror.save()')).pos) === JSON.stringify({ x: 16, z: 15.6 }), JSON.stringify((await ev('__mirror.save()')).pos));
// M5 의뢰 3건 — 주민 앞 Space → 단서 → 물건 자리 → 줍기 · 3번째는 30초 기다려 💧 힌트
for (let n = 1; n <= 3; n++) {
  const q = await ev(`(async () => { const M = ${Q}; return M.questAt(__gs().mirror, __gs().mirror.day); })()`);
  const sp = await ev(`(async () => (${LY}).NPC_SPOTS[${['farmer', 'angler', 'chef'].indexOf(q.npc)}])()`);
  await ev(`__mirror.tp(${sp.x}, ${sp.z + 1.4})`); await b.sleep(800);
  check(`M5.${n}a 말 걸기 프롬프트`, /말 걸기|Talk to/.test(await prompt()), await prompt());
  await press('Space'); await b.sleep(500);
  if (n === 3) {
    await b.sleep(31000);
    check('M5h 30초 뒤 💧 힌트 프롬프트', /연못에 비춰|Peek/.test(await prompt()), await prompt());
    await press('Space'); await b.sleep(500); await shot('m5-hint');
  }
  const spot = await ev(`(async () => (${LY}).spotOf('${q.spot}'))()`);
  await ev(`__mirror.tp(${spot.x}, ${spot.z + 0.35})`); await b.sleep(1500);
  st = await ev('__mirror.state()');
  check(`M5.${n} 의뢰 ${n} 완료`, st.mirror.done === n, JSON.stringify(st.mirror));
}
check('M5z 보상 합계 = 3+3+2 · 힌트 기록 [3]', (await ev('__mirror.state()')).coins === 8 && JSON.stringify((await ev('__mirror.state()')).mirror.hinted) === '[3]');
await shot('m5-done');
// M6 귀환(실제 Space) → 마을 정류장 앞
await ev(`__mirror.tp(2.5, 13.2)`); await b.sleep(800);
check('M6a 돌아가기 프롬프트', /마을로 돌아가기|Ride back/.test(await prompt()), await prompt());
await press('Space'); st = await waitRide();
check('M6 마을로 귀환', st.atMirror === false && Math.hypot(st.pos[0] - 16, st.pos[1] - 15.6) < 0.3, JSON.stringify(st.pos));
// M7 두 번째 탑승은 Esc 건너뛰기
await ev('__mirror.stop()'); await b.sleep(700); await press('Space'); await b.sleep(300); await press('Escape');
st = await waitRide();
check('M7 Esc 건너뛰기 → 바로 도착', st.atMirror === true);
// M8 드로우콜
const calls = await ev('__perf().calls');
check('M8 거울 마을 드로우콜 ≤ 60', calls <= 60, String(calls));
// M9 꾸미기 — 🪞 8 로 거꾸로 화분(6) 사기 · 남은 2
await ev(`__mirror.tp(2.5, 13.2)`); await b.sleep(700); await press('Space'); await waitRide();
await ev('__dream.house()'); await b.sleep(700);
await ev(`document.getElementById('decor-btn')?.click()`); await b.sleep(700);
const row = await ev(`(() => { const r=[...document.querySelectorAll('#dm-items .dm-item')].find(e=>/거꾸로 화분|Upside-down Pot/.test(e.textContent)); if (!r) return null; r.click(); return 'clicked'; })()`);
check('M9a 거울 장식 행 노출(다녀온 뒤)', row === 'clicked', String(row));
await b.sleep(500); await press('Space'); await b.sleep(900);
check('M9b 놓기 = 🪞6 차감', (await ev('__mirror.state()')).coins === 2);
await shot('m9-decor');

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - fails} / ${results.length} PASS`);
await b.close(); process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: 실행 — PC·모바일·영어** (서버 `python3 scripts/serve.py 8033` 가 워크트리에서 떠 있어야 한다)

```bash
node tools/mirror/qa.mjs pc 9421
node tools/mirror/qa.mjs mobile 9422
node tools/mirror/qa.mjs pc 9423 en
```

Expected: 셋 다 `N / N PASS`. 실패하면 systematic-debugging 으로 원인부터(헤드리스 hidden → rAF 0 함정, 연출은 시간 대기 대신 상태 폴링).

- [ ] **Step 3: 꿈길 회귀(1차 동작 불변 증명)**

```bash
mkdir -p .scratch && sed 's/8032/8033/g' tools/dream/qa.mjs > .scratch/dream-qa-8033.mjs && node .scratch/dream-qa-8033.mjs pc 9424
```

Expected: 27/27 PASS (Input.dreamSkip 이 skipMirrorRide 도 부르게 바뀌었으므로 꿈 건너뛰기 Q5 가 특히 중요)

- [ ] **Step 4: 캡처 대조** — `.scratch/mirror/qa/` 의 `m2-board`(정류장 옆 정박 마차·캐릭터), `m2-arrive`(색 반전 숲·보색 쌍둥이 3·HUD 칩), `m5-hint`(빛기둥), `m9-decor` 를 열어 확정 시안(`compare-game.png` 3안 · `compare-res.png` 2안 · `compare-cut1.png` · `compare-decor.png` 2안)과 대조. 어긋나면 고치고 Step 2 재실행.

- [ ] **Step 5: Commit**

```bash
git add tools/mirror/qa.mjs
git commit -m "test: 🪞 mirror village offline QA (ride, quests, hint, save, skip, draw calls, decor)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 리뷰·문서·인수인계

**Files:**
- Modify: `dev/active/mirror-village/mirror-village-{context,tasks}.md`, `docs/superpowers/specs/2026-10-08-mirror-village-design.md`(상태 줄)

- [ ] **Step 1: code-reviewer 에이전트로 브랜치 전체 리뷰** (`git diff origin/main...HEAD`, 스펙·계획 경로 함께 전달) — CRITICAL/HIGH 반영 후 `npm test` + QA 3종 + 꿈 QA 재실행
- [ ] **Step 2: 결과(테스트 수·QA PASS 수·드로우콜)를 tasks.md 에 기록, 체크박스 갱신**
- [ ] **Step 3: 스펙 상태 줄 → `✅ 구현 완료(미병합) · 배포는 웹·토스·Play·itch 4곳 동시`**, context.md `Last Updated` 갱신
- [ ] **Step 4: Commit**

```bash
git add dev/active/mirror-village docs/superpowers/specs/2026-10-08-mirror-village-design.md
git commit -m "docs: 🪞 mirror village implementation status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

> 배포(웹·토스 `bundle_upload(memo)`·Play·itch 4곳 동시, main + feat/capacitor-app 푸시, 푸시 전 키 스캔, 공지·다음 날 BQ 재검증)는 이 계획 밖 — 사용자 확인 후 deploy-checklist 대로.
