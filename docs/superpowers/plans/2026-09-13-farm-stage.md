# 🌾 밭 단계 증축 (논밭 확장 2단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

논밭 확장 스펙(`docs/superpowers/specs/2026-09-12-farm-expansion-design.md`) §9 구현 순서 7단계 중 **1단계(인스턴싱)·외관 A안만 main 에 병합**돼 있고, 실제 콘텐츠는 하나도 안 들어갔다. 이 계획은 **2단계 "밭 단계 증축"** 이다 — 텃밭을 `FARM_HALF` 6 → 9 → 11 로 넓히는 해금형 증축. 뒤따르는 고급 작물(3단계)·시설(4단계)·노동자(5단계, 상한이 밭 단계에 묶임)가 전부 이 위에 얹힌다.

**Goal:** 텃밭 남쪽 문 옆 📐측량 말뚝에서 재료를 내고 밭을 2단계(9, 81칸)·3단계(11, 121칸)로 넓힌다. 기존 밭·장식 좌표는 그대로, 축소 없음.

**Architecture:** 집 증축(`EXPANSIONS`/`expandInfo`/`doExpand`)과 닭장 건설(`coopInteract` — 근접 프롬프트 + 재료 차감 + 즉시 건설)의 문법을 합친다. 단계 표·비용 판정·울타리/둘레나무 좌표 규칙은 **순수 모듈 `js/farm-stage.js`** 에 두고 `node:test` 로 고정, `game.js` 는 `FARM_HALF` 상수를 `farmHalf()` 함수로 바꾸고 `buildFarm()` 을 재빌드 가능한 `rebuildFarm()` 으로 만든다. 흙·작물 InstancedMesh 는 `plots` 만 덮는 동적 버퍼라 **손댈 게 없다**(PLOT_CAP 160 ≥ 121).

**Tech Stack:** Vanilla JS + Three.js 0.160 · `node --test`

**Spec:** `docs/superpowers/specs/2026-09-12-farm-expansion-design.md` §1 밭 단계 증축, §5-4 측정 프로토콜, §9-2

## Global Constraints

- 단계 표는 스펙 §1 그대로: 1 텃밭 half 6 (49칸, 노동자 2) · 2 넓은 밭 half 9 (81칸, 🪵40 🪨20 🪙150, 노동자 4) · 3 대농장 half 11 (121칸, 🪵90 🪨60 🪙450, 노동자 6)
- **확장은 바깥으로만.** 심어둔 밭·야외 장식 좌표를 옮기지 않는다. 축소 없음.
- 해금 UI 는 **근접 상호작용**(측량 말뚝) — 햄버거 메뉴에 넣지 않는다.
- 저장: `gameState.farm = { stage: 1 }`. 옛 세이브에 `farm` 이 없으면 1단계(가드 문법 `if (saved.farm …)`).
- 새 코드는 `game.js` 에 몰지 않는다 — 규칙은 `js/farm-stage.js` + 테스트, `game.js` 는 그리기·배선만.
- i18n: 새 한국어 문구는 `js/i18n-en.js` 에 키 추가. 숫자가 끼는 프롬프트는 `{0#}` 슬롯 패턴 키. `" · "` 글루로 문장을 잇지 않는다(`tests/i18n-prompt.test.mjs` 함정).
- 트래킹은 구현과 같이: GA4 `farm_expand {stage}` · 원장 `logEcon('farm_expand', 'stage'+n, -coins, …)` · `enter_farm` 에 `{ stage }` 추가.
- dev 파라미터 `farmstage`·`farmmax` 는 `DEV_PARAMS`(`js/first-loop.js:18`) 에 등록해 로깅에서 뺀다.
- 테스트: `npm test`. 브라우저 검증은 `?farm=1&farmstage=3&give=wood:200,stone:100` 조합.

## 한국어 문구 후보 (검수 대상)

| 위치 | 문구 |
|---|---|
| 단계명 | 텃밭 · 넓은 밭 · 대농장 |
| 말뚝 팻말(캔버스) | `📐 측량 말뚝` |
| 근접 프롬프트(가능) | `📐 넓은 밭으로 넓히기 🪵40 🪨20 🪙150` |
| 근접 프롬프트(최대) | `📐 더 넓힐 수 없어요` |
| 부족 토스트 | `📐 넓히기 재료 부족 — 목재 3/40 · 돌 0/20` (닭장 문법 그대로) |
| 완료 토스트 | `🌾 넓은 밭 완성! 울타리가 더 멀리 나갔어요 🎉` |
| 첫 근접 배너 1회 | `📐 재료를 모아 밭을 넓혀요. 심어둔 밭은 그대로예요` |

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/farm-stage.js` | **신규** · 순수. `FARM_STAGES` 표 · `farmHalfOf(stage)` · `farmStageInfo(stage, inventory)` · `fencePosts(half)` · `perimeterTrees(half)` |
| `tests/farm-stage.test.mjs` | **신규** · 위 모듈 테스트 |
| `js/game.js` | `FARM_HALF` → `farmHalf()`(9곳) · `buildFarm` → `rebuildFarm` · 측량 말뚝 프롭 · `farmStakeInteract` · 세이브/복원 · dev 파라미터 |
| `js/first-loop.js:18` | `DEV_PARAMS` 에 `farmstage`, `farmmax` |
| `tests/first-loop.test.mjs:19` | dev 파라미터 테스트 1줄 추가 |
| `js/i18n-en.js` | 새 문구 키 |
| `dev/active/farm-stage/` | plan·context·tasks 3파일(CLAUDE.md 규칙) |
| `docs/superpowers/plans/2026-09-13-farm-stage.md` | 이 계획서 사본 |

---

### Task 1: 순수 규칙 모듈 `js/farm-stage.js`

**Files:** Create `js/farm-stage.js` · Test `tests/farm-stage.test.mjs`

**Produces:**
- `FARM_STAGES: {stage, half, name, ico, cost|null, workers}[]` (3개)
- `MAX_FARM_STAGE = 3`
- `farmHalfOf(stage)` → half. 범위 밖/비숫자 → 6
- `farmStageInfo(stage, inventory)` → `{ maxed, cur, next, items:[{k, need, have}], affordable }` (`expandInfo()` 와 같은 꼴, `RES_LABEL` 은 호출부가 붙임)
- `fencePosts(half)` → `[x,z][]` — 1.5 간격 둘레, 남쪽 `|x|<1.2` 는 출입구로 비움, 모서리 중복 제거
- `perimeterTrees(half)` → `{x, h, z}[]` — 기존 `buildFarm` 의 24그루 규칙(`r = half + 5 + ((i*7)%6)*2.4`, 남쪽 ±0.45rad 비움) 그대로

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FARM_STAGES, MAX_FARM_STAGE, farmHalfOf, farmStageInfo, fencePosts, perimeterTrees } from '../js/farm-stage.js';

test('FARM_STAGES: 스펙 §1 표 그대로 — half 6/9/11 · 비용 · 노동자 상한', () => {
  assert.equal(FARM_STAGES.length, 3); assert.equal(MAX_FARM_STAGE, 3);
  assert.deepEqual(FARM_STAGES.map(s => s.half), [6, 9, 11]);
  assert.deepEqual(FARM_STAGES.map(s => s.workers), [2, 4, 6]);
  assert.equal(FARM_STAGES[0].cost, null);
  assert.deepEqual(FARM_STAGES[1].cost, { wood: 40, stone: 20, coins: 150 });
  assert.deepEqual(FARM_STAGES[2].cost, { wood: 90, stone: 60, coins: 450 });
});
test('farmHalfOf: 단계 → 반경, 이상값은 1단계(6)', () => {
  assert.equal(farmHalfOf(1), 6); assert.equal(farmHalfOf(3), 11);
  assert.equal(farmHalfOf(undefined), 6); assert.equal(farmHalfOf(9), 6);
});
test('farmStageInfo: 다음 단계 비용 대조 — 부족/충분/최대', () => {
  const a = farmStageInfo(1, { wood: 40, stone: 20, coins: 149 });
  assert.equal(a.maxed, false); assert.equal(a.next.stage, 2); assert.equal(a.affordable, false, '코인 1 부족');
  const b = farmStageInfo(1, { wood: 40, stone: 20, coins: 150 });
  assert.equal(b.affordable, true, '딱 맞으면 가능');
  assert.deepEqual(b.items.map(i => [i.k, i.need, i.have]), [['wood', 40, 40], ['stone', 20, 20], ['coins', 150, 150]]);
  assert.equal(farmStageInfo(3, {}).maxed, true);
  assert.equal(farmStageInfo(1, {}).items.find(i => i.k === 'wood').have, 0, '없는 자원은 0');
});
test('fencePosts: 둘레에만 · 남쪽 출입구 비움 · 중복 없음 · 넓을수록 많다', () => {
  for (const H of [6, 9, 11]) {
    const posts = fencePosts(H);
    assert.ok(posts.every(([x, z]) => Math.abs(x) === H || Math.abs(z) === H), '둘레');
    assert.ok(!posts.some(([x, z]) => z === H && Math.abs(x) < 1.2), '남쪽 가운데 출입구');
    assert.equal(new Set(posts.map(p => p.join(','))).size, posts.length, '모서리 중복 없음');
  }
  assert.ok(fencePosts(6).length < fencePosts(9).length && fencePosts(9).length < fencePosts(11).length);
});
test('perimeterTrees: 남쪽 비움 · 스커트 원판(r48) 안 · 울타리 밖', () => {
  for (const H of [6, 11]) {
    const trees = perimeterTrees(H);
    assert.ok(trees.length >= 18 && trees.length <= 24);
    for (const t of trees) {
      const r = Math.hypot(t.x, t.z);
      assert.ok(r > H + 4 && r < 48, `울타리 밖·원판 안 (r=${r})`);
      assert.ok(t.h >= 2.0);
    }
  }
});
```

- [ ] **Step 2:** `node --test tests/farm-stage.test.mjs` → 모듈 없음으로 FAIL 확인
- [ ] **Step 3: 구현**

```js
// js/farm-stage.js — 🌾 밭 단계 증축 규칙 (순수 함수, DOM/Three 없음). 스펙 §1
export const FARM_STAGES = [
  { stage: 1, half: 6,  name: '텃밭',   ico: '🌱', cost: null,                                 workers: 2 },
  { stage: 2, half: 9,  name: '넓은 밭', ico: '🌾', cost: { wood: 40, stone: 20, coins: 150 }, workers: 4 },
  { stage: 3, half: 11, name: '대농장', ico: '🚜', cost: { wood: 90, stone: 60, coins: 450 }, workers: 6 },
];
export const MAX_FARM_STAGE = FARM_STAGES.length;
export function farmHalfOf(stage) { return (FARM_STAGES.find(s => s.stage === stage) || FARM_STAGES[0]).half; }
export function farmStageInfo(stage, inventory = {}) {
  const cur = FARM_STAGES.find(s => s.stage === stage) || FARM_STAGES[0];
  const next = FARM_STAGES.find(s => s.stage === cur.stage + 1);
  if (!next) return { maxed: true, cur, next: null, items: [], affordable: false };
  const items = Object.entries(next.cost).map(([k, need]) => ({ k, need, have: inventory[k] || 0 }));
  return { maxed: false, cur, next, items, affordable: items.every(i => i.have >= i.need) };
}
export function fencePosts(half) {
  const seen = new Set(), out = [];
  for (let i = -half; i <= half; i += 1.5) for (const [x, z] of [[i, -half], [i, half], [-half, i], [half, i]]) {
    if (z === half && Math.abs(x) < 1.2) continue;
    const key = x + ',' + z; if (seen.has(key)) continue; seen.add(key); out.push([x, z]);
  }
  return out;
}
export function perimeterTrees(half) {
  const out = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.45) continue;
    const r = half + 5 + ((i * 7) % 6) * 2.4, h = 2.0 + ((i * 13) % 7) * 0.3;
    out.push({ x: Math.cos(a) * r, h, z: Math.sin(a) * r });
  }
  return out;
}
```

- [ ] **Step 4:** `npm test` PASS
- [ ] **Step 5:** `git add js/farm-stage.js tests/farm-stage.test.mjs && git commit -m "feat: 🌾 밭 단계 증축 규칙 모듈 — 단계 표·비용 판정·울타리/둘레나무 좌표"`

---

### Task 2: `FARM_HALF` → `farmHalf()` · `buildFarm` → `rebuildFarm(silent)` · 세이브

**Files:** Modify `js/game.js` (import 줄 ~37 · `:288` · `:921~991` gameState · `:1984` `__farmMax` · `:2046` applySave · `:2311` 호출부 · `:8022` makeSignpost · `:8062-8115` buildFarm · `:8119` enterFarm · `:8399` · `:8647-8650` · `:8737` · `:8893-8894`)

**Consumes:** Task 1 전부.
**Produces:** `farmHalf()`, `rebuildFarm(silent)`, `gameState.farm.stage`, `farmStake`(말뚝 그룹 참조), `farmStakePos()` → `{x, z}`(월드 좌표).

- [ ] **Step 1:** import 추가: `import { FARM_STAGES, MAX_FARM_STAGE, farmHalfOf, farmStageInfo, fencePosts, perimeterTrees } from './farm-stage.js';`
- [ ] **Step 2:** `const FARM_HALF = 6;` 삭제 → `function farmHalf() { return farmHalfOf(gameState.farm?.stage || 1); }`. 9곳 치환: `__farmMax(half = farmHalf())`, 둘레나무/바닥/H, `enterFarm` 스폰, `:8399` 출구 판정, `minimapMarks` 3곳(`:8647` 출구 · `:8648` **죽은 허수아비 마크 줄 삭제**(허수아비 장식은 제거된 지 오래) · `:8650` 필터), `:8737 md.half`, `:8893-8894` 클램프. `grep -n FARM_HALF js/game.js` 가 0건이어야 한다.
- [ ] **Step 3:** gameState 에 `farm: { stage: 1 },   // 🌾 밭 단계 { 1 텃밭 · 2 넓은 밭 · 3 대농장 } — js/farm-stage.js` (coop 줄 옆).
- [ ] **Step 4:** `makeSignpost` 가 rAF 로 등록하는 콜라이더를 `grp.userData.solid = solidCircle(...)` 로 보관(재빌드 때 `removeSolid` 하려고).
- [ ] **Step 5:** `buildFarm()` → `rebuildFarm(silent = false)`:
  - 기존 `farmGroup` 이 있으면: `farmGroup.traverse(o => { if (o.userData.solid) removeSolid(o.userData.solid); if (o.isMesh) { o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); } })` 후 `scene.remove(farmGroup)`. (이 그룹 안 재질·지오메트리는 전부 `buildFarm` 이 자체 생성한 것 — `clayMat`/`woodMat` 은 호출마다 새 재질, `woodTexture().clone()` — 공유 자원 없음. 스펙 §4-4 규칙 위반 아님.)
  - `const H = farmHalf();` 나무는 `perimeterTrees(H)`, 말뚝은 `fencePosts(H)` 로 인스턴스 행렬 채움(기존 코드의 루프를 함수 호출로 교체, 나머지 동일). 바닥 `BoxGeometry(H*2, 0.2, H*2)`.
  - 📐측량 말뚝: `farmStake = makeSignpost('📐 측량 말뚝', -2.2, H - 0.2)` — 출구 팻말(`+1.9`) 의 거울 위치. `g.add(farmStake)`.
  - `farmGroup.visible = atFarm`(초기엔 false).
  - `silent` 가 false 면 축하: `spawnConfetti(FARM.x - 2.2, 2.4, FARM.z + H - 0.2)`, `spawnSparkle(같은 좌표, 3.0, …, 40)`, `Sound.complete()`.
  - `function farmStakePos() { return { x: FARM.x - 2.2, z: FARM.z + farmHalf() - 0.2 }; }`
- [ ] **Step 6:** 호출부 `:2311` `buildFarm()` → `rebuildFarm(true)`.
- [ ] **Step 7:** `applySave` — `houseStage` 복원 **앞**, 밭 복원 앞에: `if (saved.farm && Number.isFinite(saved.farm.stage)) { gameState.farm.stage = Math.max(1, Math.min(MAX_FARM_STAGE, Math.floor(saved.farm.stage))); if (gameState.farm.stage > 1) rebuildFarm(true); }`
- [ ] **Step 8:** `enterFarm` 의 `trackEvent('enter_farm')` → `trackEvent('enter_farm', { stage: gameState.farm.stage })`.
- [ ] **Step 9:** `npm test` PASS · 브라우저 `?farm=1` 로 기존 텃밭이 그대로인지(울타리·나무·출구 팻말 + 새 말뚝) 확인.
- [ ] **Step 10:** `git commit -m "refactor: 🌾 FARM_HALF 상수 → farmHalf(stage) · buildFarm 재빌드 가능하게 · gameState.farm.stage"`

---

### Task 3: 측량 말뚝 상호작용 + 트래킹 + i18n + dev 파라미터

**Files:** Modify `js/game.js` (`:8398-8399` 텃밭 브랜치 · `:9704` 디스패치 · 새 함수 `farmStakeInteract` (coopInteract 옆) · `:1915` dev 파라미터) · `js/first-loop.js:18` · `tests/first-loop.test.mjs` · `js/i18n-en.js`

**Consumes:** `farmHalf`, `rebuildFarm`, `farmStakePos`, `farmStageInfo`, `RES_LABEL`, `logEcon`, `refreshInventoryUI`, `doPlayerAction`, `trackEvent`, `requestSave`, `firstHintBanner`.

- [ ] **Step 1: dev 파라미터 테스트** `tests/first-loop.test.mjs` 의 `isDevSession` 테스트에 `assert.equal(isDevSession('?farm=1&farmstage=3'), true); assert.equal(isDevSession('?farmmax=1'), true);` 추가 → FAIL 확인 → `DEV_PARAMS` 에 `'farmstage', 'farmmax'` 추가 → PASS.
- [ ] **Step 2: 근접 판정** — `:8398` 브랜치:

```js
} else if (atFarm) {
  const H = farmHalf(), sp = farmStakePos();
  if (dist2D({ x: FARM.x, z: FARM.z + H }, player.position) < 1.8) { nd = 'farmexit'; prompt = '🚪 나가기'; }
  else if (dist2D(sp, player.position) < 1.8) {
    nd = 'farmstake';
    const info = farmStageInfo(gameState.farm.stage, gameState.inventory);
    prompt = info.maxed ? '📐 더 넓힐 수 없어요'
      : `📐 ${info.next.name}으로 넓히기 🪵${info.next.cost.wood} 🪨${info.next.cost.stone} 🪙${info.next.cost.coins}`;
    firstHintBanner('farmStake', '📐', '측량 말뚝', '재료를 모아 밭을 넓혀요. 심어둔 밭은 그대로예요');
  }
}
```
  (`firstHintBanner` 실제 시그니처는 `js/game.js:1289` 에서 확인해 맞춘다.)

- [ ] **Step 3: 디스패치** `:9704` 옆 `if (nearDoor === 'farmstake') return farmStakeInteract();`
- [ ] **Step 4: `farmStakeInteract()`** (coopInteract 문법):

```js
// 📐 측량 말뚝 — 밭 단계 증축. 닭장과 같은 문법: 부족하면 토스트, 충분하면 즉시 차감·재빌드
function farmStakeInteract() {
  const info = farmStageInfo(gameState.farm.stage, gameState.inventory);
  if (info.maxed) { ui.toast?.('📐 이미 가장 넓은 밭이에요', 2400); return; }
  const lack = info.items.filter(i => i.have < i.need);
  if (lack.length) { ui.toast?.('📐 넓히기 재료 부족 — ' + lack.map(i => `${RES_LABEL[i.k] || i.k} ${i.have}/${i.need}`).join(' · '), 3000); return; }
  for (const k in info.next.cost) gameState.inventory[k] -= info.next.cost[k];
  logEcon('farm_expand', 'stage' + info.next.stage, -info.next.cost.coins, gameState.inventory.coins);   // [원장]
  refreshInventoryUI();
  const sp = farmStakePos(); doPlayerAction(sp.x, sp.z);
  gameState.farm.stage = info.next.stage;
  rebuildFarm();                                              // 축하 연출 포함
  ui.toast?.(`🌾 ${info.next.name} 완성! 울타리가 더 멀리 나갔어요 🎉`, 3200);
  trackEvent('farm_expand', { stage: info.next.stage });      // [GA4] 증축 퍼널
  nearDoor = null; ui.setDoorPrompt?.(null);                  // 말뚝이 새 울타리로 이동 — 옛 프롬프트 지움
  requestSave();
}
```
- [ ] **Step 5: dev 파라미터** `:1915` 옆:

```js
const _fs = parseInt(_wq.get('farmstage') || '', 10);   // 테스트: ?farmstage=2|3 — 밭 증축 미리보기
if (_fs >= 1 && _fs <= MAX_FARM_STAGE && _fs !== gameState.farm.stage) { gameState.farm.stage = _fs; rebuildFarm(true); }
if (_wq.get('farmmax') === '1') { gameState.farm.stage = MAX_FARM_STAGE; rebuildFarm(true); setTimeout(() => window.__farmMax?.(), 80); }   // 스펙 §5-4 최악 상태
```
- [ ] **Step 6: i18n** `js/i18n-en.js` 에 추가: `'📐 측량 말뚝'`, `'📐 더 넓힐 수 없어요'`, `'📐 넓은 밭으로 넓히기 🪵{0#} 🪨{1#} 🪙{2#}'`, `'📐 대농장으로 넓히기 🪵{0#} 🪨{1#} 🪙{2#}'`, `'📐 이미 가장 넓은 밭이에요'`, 부족 토스트(기존 닭장 키 `'🐔 재료 부족 — …'` 의 형식을 i18n-en.js 에서 보고 그대로), `'🌾 {0} 완성! 울타리가 더 멀리 나갔어요 🎉'`, `'넓은 밭'`, `'대농장'`, 배너 문구 2개. `scripts/i18n_check.mjs` 가 있으면 실행.
- [ ] **Step 7:** `npm test` PASS. 커밋: `feat: 📐 측량 말뚝 — 밭 2·3단계 증축(재료 차감·원장·GA4) + ?farmstage/?farmmax`

---

### Task 4: 브라우저 검증 · 드로우콜 · dev docs · 계획서 사본

- [ ] **Step 1:** `preview_start` 로 로컬 서버(`.claude/launch.json` 확인) → `?farm=1&give=wood:200,stone:100&dbg=1&weather=clear&time=0.32`
  - 캔버스 클릭 후 말뚝 앞으로 이동 → 프롬프트 `📐 넓은 밭으로 넓히기 🪵40 🪨20 🪙150` 확인 → 액션 → 울타리·나무·팻말·말뚝이 half 9 로 이동, 인벤토리 차감, 토스트, 색종이.
  - 한 번 더 → 3단계. 세 번째 → `📐 더 넓힐 수 없어요`.
  - 코인 부족 상태(`give` 없이)에서 부족 토스트 문구 확인.
  - 새 영역(예: x=±8) 에서 괭이질이 되고 미니맵에 그 밭이 보이는지. 새 울타리 너머로 못 나가는지(클램프).
  - 새로고침 → 3단계 유지(세이브/복원). 남쪽 출구 팻말 옛 위치(z=84+6)에 보이지 않는 벽이 없는지(콜라이더 제거 검증: 걸어서 통과).
  - `?lang=en` 으로 프롬프트·토스트 영어 확인.
- [ ] **Step 2:** `?farm=1&farmmax=1&dbg=1&weather=clear&time=0.32` → 콘솔 `__perf()` → **150콜 이하**(스펙 §5-4 합격선). 넘으면 원인 기록.
- [ ] **Step 3:** 모바일 뷰포트(`resize_window mobile`)에서 프롬프트 줄이 잘리지 않는지 스크린샷.
- [ ] **Step 4:** `dev/active/farm-stage/{farm-stage-plan.md, -context.md, -tasks.md}` 생성, `docs/superpowers/plans/2026-09-13-farm-stage.md` 에 이 계획 저장. 커밋 `docs: 🌾 밭 단계 증축 계획·dev docs`.
- [ ] **Step 5:** code-reviewer 에이전트 리뷰 → CRITICAL/HIGH 반영 → `npm test` → 최종 커밋. 배포는 사용자 판단.

---

## 완료 조건
- [ ] `grep FARM_HALF js/game.js` 0건, `npm test` 전부 통과(신규 farm-stage 5건 + first-loop 갱신)
- [ ] 1→2→3 증축 · 부족 · 최대 · 세이브 복원 · 영어 · 모바일 프롬프트 브라우저 확인
- [ ] `?farmmax=1` 드로우콜 ≤150
- [ ] 원장 `farm_expand` + GA4 `farm_expand{stage}` + `enter_farm{stage}` 찍힘

## 다음 계획서
스펙 §9-3 **고급 작물 + 새 공정 3종**. 노동자 상한(`FARM_STAGES[].workers`)은 5단계에서 소비.
