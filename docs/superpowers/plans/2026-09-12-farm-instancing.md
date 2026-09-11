# 밭 인스턴싱 리팩터링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 밭 타일의 흙·이랑·작물·말풍선을 InstancedMesh 로 묶어, **게임 동작은 한 글자도 바꾸지 않고** 텃밭 드로우콜만 크게 줄인다.

**Architecture:** 밭 1칸은 지금 `THREE.Group`(흙 Box 1 + 이랑 Box 3) + 작물 그룹 + 스프라이트 3장이고, `clayMat()` 이 호출마다 새 재질을 만들어 배칭이 전혀 안 된다. 이 계획은 **`plot.group` 을 빈 앵커 Group 으로 남겨둔 채**(좌표 참조 코드가 전부 살아있게) 흙 → 이랑 → 작물 → 말풍선 순으로 하나씩 InstancedMesh 로 옮긴다. 순수 판정 로직(팝 곡선·리빌드 시점)은 `js/farm-render.js` 에 빼서 `node:test` 로 고정한다.

**Tech Stack:** Vanilla JS + Three.js 0.160 (importmap, 외부 에셋 없음) · `node --test` (node:test)

**Spec:** `docs/superpowers/specs/2026-09-12-farm-expansion-design.md` (§5 드로우콜 예산, §9 구현 순서 1단계)

## Global Constraints

- **기능 변화 0.** 이 계획이 끝난 뒤 플레이어가 체감하는 차이는 "부드러워졌다" 뿐이어야 한다. 밭 갈기·심기·물주기·수확·🪏삽·🛡️덮개·밤손님 판정 전부 동작이 같아야 한다.
- **세이브 스키마를 건드리지 않는다.** `gameState.plots` 직렬화 형식은 그대로다(`{x, z, state, growth, crop}`).
- **`plot.group` 을 없애지 않는다.** `tryHoe`·`tryWater`·`tryHarvest`·`digTarget`·`nearestPlot`·`updatePlots` 가 전부 `plot.group.position` 을 읽는다. Group 은 자식이 없으면 드로우콜 0이므로 앵커로 남긴다.
- **`dispose()` 금지.** 공유 자원 규칙 — 공유·병합 지오메트리는 개별 해제 대상에 쓰지 않는다. 밭 제거는 인스턴스 버퍼 갱신으로만 처리한다.
- **인스턴스 버퍼는 상태가 바뀔 때만 다시 쓴다.** `instanceMatrix.needsUpdate` 를 매 프레임 켜면 인스턴싱 이득이 사라진다. 예외는 팝 애니메이션 중인 칸뿐이다.
- **밭 상한 `PLOT_CAP = 160`** — 스펙 3단계 121칸 + 마을 안 밭 여유분. 넘으면 새 밭이 안 생기는 게 아니라 **인스턴스 버퍼만 재할당**한다(칸 수 제한 아님).
- 한국어 문구는 새로 만들지 않는다. 이 단계는 UI 문구 변경이 없다.
- 테스트 실행: `npm test` (= `node --test tests/*.test.mjs`)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/farm-render.js` | **신규** · 순수 함수. 팝 스케일 곡선 · 리빌드 필요 판정(시그니처) · 팝 진행 중인 칸 추림 · 이랑 z 오프셋 상수. DOM/Three 의존 없음 |
| `tests/farm-render.test.mjs` | **신규** · 위 모듈의 `node:test` |
| `js/game.js` | 밭 InstancedMesh 생성·갱신, `createPlot`/`removePlot`/`setPlotDug`/`buildCropStage`/`setPlotWarn` 계열 수정 |

---

### Task 1: 순수 렌더 규칙 모듈

`js/farm-render.js` 는 Three 없이 돌아가는 판정만 담는다. 여기서 고정하는 건 세 가지다 — **팝 곡선**(기존 `updatePops` 와 같아야 연출이 안 바뀐다), **언제 버퍼를 다시 쓸지**(성능 계약), **매 프레임 갱신할 칸이 누구인지**.

**Files:**
- Create: `js/farm-render.js`
- Test: `tests/farm-render.test.mjs`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `RIDGE_Z: number[]` — 길이 3, 이랑 z 오프셋 `[-0.5, 0, 0.5]`
  - `RIDGE_PER_PLOT: number` — `3`
  - `PLOT_CAP: number` — `160`
  - `popScale(pop: number): number` — `pop` 0~1 → scale. `pop<=0` 이면 `1`
  - `plotsSignature(plots: {x,z,watered,digAt,state}[]): number` — 32bit 정수
  - `poppingPlots(plots: {pop?:number}[]): number[]` — `pop>0` 인 인덱스 배열

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/farm-render.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIDGE_Z, RIDGE_PER_PLOT, PLOT_CAP, popScale, plotsSignature, poppingPlots } from '../js/farm-render.js';

test('이랑 상수 — 기존 createPlot 의 k*0.5 (k=-1,0,1) 과 같다', () => {
  assert.deepEqual(RIDGE_Z, [-0.5, 0, 0.5]);
  assert.equal(RIDGE_PER_PLOT, 3);
  assert.equal(PLOT_CAP, 160);
});

test('popScale — 기존 updatePops 곡선과 같다', () => {
  // pop 이 0 이하면 평상시 크기
  assert.equal(popScale(0), 1);
  assert.equal(popScale(-0.2), 1);
  // pop=1 은 방금 생긴 순간 → 거의 0
  assert.ok(popScale(1) < 0.01);
  // 중간엔 1 을 넘어서는 오버슛이 있다(통통 튀는 느낌의 정체)
  const mid = popScale(0.35);
  assert.ok(mid > 1, `오버슛이 있어야 한다, got ${mid}`);
  // 끝으로 갈수록 1 로 수렴
  assert.ok(Math.abs(popScale(0.01) - 1) < 0.05);
});

test('plotsSignature — 좌표·젖음·삽질 상태가 바뀌면 값이 바뀐다', () => {
  const base = [{ x: 0, z: 0, watered: false, digAt: 0, state: 'empty' }];
  const sig = plotsSignature(base);

  assert.equal(plotsSignature(base), sig, '같은 입력이면 같은 값');
  assert.notEqual(plotsSignature([{ ...base[0], watered: true }]), sig, '물을 주면 바뀐다');
  assert.notEqual(plotsSignature([{ ...base[0], x: 2 }]), sig, '좌표가 바뀌면 바뀐다');
  assert.notEqual(plotsSignature([{ ...base[0], digAt: 123 }]), sig, '삽질 중이면 바뀐다');
  assert.notEqual(plotsSignature([]), sig, '칸이 사라지면 바뀐다');
  assert.notEqual(plotsSignature([...base, { x: 2, z: 0, watered: false, digAt: 0, state: 'empty' }]), sig, '칸이 늘면 바뀐다');
});

test('plotsSignature — 성장도만 바뀌는 건 흙 버퍼와 무관하다', () => {
  const a = [{ x: 0, z: 0, watered: false, digAt: 0, state: 'growing', growth: 0.1 }];
  const b = [{ x: 0, z: 0, watered: false, digAt: 0, state: 'growing', growth: 0.9 }];
  assert.equal(plotsSignature(a), plotsSignature(b), '흙 색·위치가 같으면 다시 안 쓴다');
});

test('poppingPlots — 팝 중인 칸의 인덱스만 돌려준다', () => {
  const plots = [{ pop: 0 }, { pop: 0.4 }, {}, { pop: 1 }];
  assert.deepEqual(poppingPlots(plots), [1, 3]);
  assert.deepEqual(poppingPlots([{ pop: 0 }, {}]), [], '아무도 안 튀면 빈 배열 — 매 프레임 갱신 0');
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/farm-render.js'`

- [ ] **Step 3: 모듈을 구현한다**

`js/farm-render.js`:

```js
// =============================================================
//  calm forest · 🌾 밭 렌더링 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  밭 1칸이 흙 Box 1 + 이랑 Box 3 = 4드로우콜이었다. 121칸이면 흙만 484콜로
//  마을 전체(567콜)에 맞먹는다 → InstancedMesh 로 묶는다.
//  ▶ 여기엔 "언제 버퍼를 다시 쓸지"와 "팝 곡선"만 둔다. 그리기는 game.js.
//  ▶ 설계 docs/superpowers/specs/2026-09-12-farm-expansion-design.md §5
//  ▶ 테스트: npm test (tests/farm-render.test.mjs)
// =============================================================

/** 이랑 3줄의 z 오프셋 — 기존 createPlot 의 k*0.5 (k=-1,0,1) 그대로 */
export const RIDGE_Z = [-0.5, 0, 0.5];
export const RIDGE_PER_PLOT = RIDGE_Z.length;

/** 인스턴스 버퍼 초기 용량 — 3단계 121칸 + 마을 안 밭 여유.
 *  넘으면 칸이 안 생기는 게 아니라 game.js 가 버퍼를 재할당한다. */
export const PLOT_CAP = 160;

/**
 * 팝(톡 튀어오름) 스케일 — updatePops 의 곡선과 **같아야 한다**.
 * 다르면 밭이 생길 때의 손맛이 바뀐다.
 *   pop: 1(방금 생김) → 0(정착). 0 이하면 평상시 크기 1.
 */
export function popScale(pop) {
  if (!(pop > 0)) return 1;
  const p = 1 - pop;
  return p < 1 ? p + Math.sin(p * Math.PI) * 0.25 : 1;   // 살짝 오버슛
}

/**
 * 흙·이랑 인스턴스 버퍼를 다시 써야 하는지 판정하는 시그니처.
 * **흙 버퍼에 실제로 반영되는 것만** 넣는다 — 위치·젖음(색)·삽질(이랑 흐트러짐)·칸 수.
 * 성장도(growth)는 작물 메시 쪽이라 여기 넣으면 매 프레임 다시 쓰게 된다.
 */
export function plotsSignature(plots) {
  let sig = plots.length | 0;
  for (const p of plots) {
    sig = (Math.imul(sig, 31) + (p.x | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.z | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.watered ? 1 : 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.digAt ? 1 : 0)) | 0;
  }
  return sig;
}

/** 지금 팝 애니메이션 중인 칸의 인덱스 — 이 칸들만 매 프레임 행렬을 갱신한다. */
export function poppingPlots(plots) {
  const out = [];
  for (let i = 0; i < plots.length; i++) if ((plots[i].pop || 0) > 0) out.push(i);
  return out;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test`
Expected: PASS — `farm-render.test.mjs` 의 5개 테스트 전부 통과. 기존 테스트도 그대로 통과해야 한다.

- [ ] **Step 5: 커밋**

```bash
git add js/farm-render.js tests/farm-render.test.mjs
git commit -m "feat: 🌾 밭 렌더링 순수 규칙 모듈 — 팝 곡선·리빌드 시그니처"
```

---

### Task 2: 흙을 InstancedMesh 로

가장 큰 덩어리부터 옮긴다. 이랑·작물·스프라이트는 **건드리지 않는다** — 이 태스크가 끝나도 게임은 완전히 돌아가야 한다.

핵심은 `plot.group` 을 **빈 앵커로 남기는 것**이다. `plot.group.position` 을 읽는 코드가 여러 곳 있고(`tryHoe` · `tryWater` · `tryHarvest` · `digTarget` · `nearestPlot` · `updatePlots` · `createPlot` 의 주민 비켜서기), 전부 그대로 살아있어야 한다.

**Files:**
- Modify: `js/game.js:9614-9632` (`createPlot`)
- Modify: `js/game.js:9705-9715` (`removePlot`)
- Modify: `js/game.js:10062-10064` (`updatePlotVisual`)
- Modify: `js/game.js:2076-2077` 근처 (부팅 시 `buildFarmInstances()` 호출)
- Modify: `js/game.js:1895` 근처 (세이브 복원 직후 `syncFarmSoil(true)`)
- Modify: `js/game.js:9937` (`updatePlots` 끝에 `updateFarmPops(dt)`)

**Interfaces:**
- Consumes: Task 1 의 `PLOT_CAP` · `popScale` · `plotsSignature` · `poppingPlots`
- Produces:
  - `farmSoilMesh: THREE.InstancedMesh | null` — 모듈 스코프 변수
  - `buildFarmInstances(cap?: number): void`
  - `syncFarmSoil(force?: boolean): void` — 시그니처가 바뀌었을 때만 전체 버퍼를 다시 쓴다
  - `updateFarmPops(dt: number): void` — 팝 중인 칸만 매 프레임 행렬 갱신
  - `plot.pop: number` — 기존 `plot.group.userData.pop` 을 대체

- [ ] **Step 1: import 를 추가한다**

`js/game.js` 상단 import 블록(34번 줄 `farm-auto.js` 옆):

```js
import { RIDGE_Z, RIDGE_PER_PLOT, PLOT_CAP, popScale, plotsSignature, poppingPlots } from './farm-render.js';   // 🌾 밭 인스턴싱 규칙
```

- [ ] **Step 2: 인스턴스 메시를 만드는 함수를 추가한다**

`createPlot` 바로 위에 넣는다:

```js
// =============================================================
//  🌾 밭 인스턴싱 — 흙 121칸이 121드로우콜이던 걸 1콜로
//  ⚠️ plot.group 은 없애지 않는다. 빈 Group 은 드로우콜 0이고,
//     plot.group.position 을 읽는 코드가 여러 곳 있다(tryHoe·tryWater·
//     tryHarvest·digTarget·nearestPlot·updatePlots·주민 비켜서기).
//  ⚠️ 공유 지오메트리·재질이므로 dispose 하지 않는다(공유 자원 규칙).
// =============================================================
let farmSoilMesh = null;        // InstancedMesh — 흙
let farmSoilCap = 0;            // 현재 버퍼 용량
let farmSigPrev = NaN;          // 마지막으로 버퍼를 쓴 시점의 시그니처
const _fmM = new THREE.Matrix4(), _fmC = new THREE.Color();

function buildFarmInstances(cap = PLOT_CAP) {
  if (farmSoilMesh) { scene.remove(farmSoilMesh); farmSoilMesh = null; }   // dispose 안 함 — 공유 자원
  const geo = new THREE.BoxGeometry(1.7, 0.2, 1.7);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, flatShading: false });
  farmSoilMesh = new THREE.InstancedMesh(geo, mat, cap);
  farmSoilMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  farmSoilMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  farmSoilMesh.castShadow = false;      // 바닥에 붙어 있어 드리울 그림자가 없다(그림자 패스 절감)
  farmSoilMesh.receiveShadow = true;
  farmSoilMesh.count = 0;
  farmSoilMesh.frustumCulled = false;   // 밭이 넓어지면 경계 상자가 커져 판정이 부정확해진다
  farmSoilCap = cap;
  farmSigPrev = NaN;
  scene.add(farmSoilMesh);
}

// 전체 버퍼 다시 쓰기 — 시그니처가 바뀌었을 때만. force 는 부팅·복원용.
function syncFarmSoil(force = false) {
  if (!farmSoilMesh) return;
  const sig = plotsSignature(plots);
  if (!force && sig === farmSigPrev) return;
  farmSigPrev = sig;
  if (plots.length > farmSoilCap) { buildFarmInstances(plots.length + 40); farmSigPrev = sig; }
  for (let i = 0; i < plots.length; i++) {
    const p = plots[i];
    const s = popScale(p.pop || 0);
    _fmM.makeScale(s, s, s);
    _fmM.setPosition(p.x, 0.1, p.z);          // 기존 soil.position.y = 0.1
    farmSoilMesh.setMatrixAt(i, _fmM);
    _fmC.setHex(p.watered ? PAL.soilWet : PAL.soil);
    farmSoilMesh.setColorAt(i, _fmC);
  }
  farmSoilMesh.count = plots.length;
  farmSoilMesh.instanceMatrix.needsUpdate = true;
  farmSoilMesh.instanceColor.needsUpdate = true;
}

// 팝 중인 칸만 매 프레임 갱신 — 아무도 안 튀면 버퍼를 건드리지 않는다(인스턴싱 이득 보존)
function updateFarmPops(dt) {
  if (!farmSoilMesh) return;
  const idx = poppingPlots(plots);
  if (!idx.length) return;
  for (const i of idx) {
    const p = plots[i];
    p.pop = Math.max(0, p.pop - dt * 3);      // updatePops 와 같은 감쇠율
    const s = popScale(p.pop);
    _fmM.makeScale(s, s, s);
    _fmM.setPosition(p.x, 0.1, p.z);
    farmSoilMesh.setMatrixAt(i, _fmM);
  }
  farmSoilMesh.instanceMatrix.needsUpdate = true;
}
```

- [ ] **Step 3: `createPlot` 에서 흙 메시를 뺀다**

`js/game.js:9614` 의 `createPlot` 을 이렇게 바꾼다 — **이랑은 그대로 둔다**(Task 3에서 옮긴다):

```js
function createPlot(x, z, silent = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  // 🌾 흙은 farmSoilMesh(InstancedMesh)가 그린다 — 여기선 앵커 Group 만 만든다.
  //    이랑은 아직 개별 메시(Task 3에서 인스턴스로 옮김).
  const ridges = [];
  for (let k = -1; k <= 1; k++) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.34), clayMat(0x80553a, false));
    ridge.position.set(0, 0.21, k * 0.5); ridge.receiveShadow = true; g.add(ridge); ridges.push(ridge);
  }
  scene.add(g);
  const plot = { group: g, soil: null, ridges, crop: null, state: 'empty', growth: 0, stage: -1, x, z, watered: false, digAt: 0, digBackT: 0, pop: 0 };
  plots.push(plot);
  // 🌾 발밑에 밭이 생긴 주민은 바로 비켜선다(다음 배회 틱까지 기다리지 않게)
  if (!silent) for (const o of npcObjs) if (onPlotArea(o.group.position.x, o.group.position.z)) o.wanderTimer = 0;
  if (!silent) { plot.pop = 1; spawnDust(x, z, 14); }   // 흙먼지 + 톡 등장(팝은 인스턴스 행렬로)
  syncFarmSoil(true);
  return plot;
}
```

- [ ] **Step 4: `removePlot` 과 `updatePlotVisual` 을 고친다**

`js/game.js:9705` `removePlot`:

```js
function removePlot(plot) {
  const i = plots.indexOf(plot); if (i >= 0) plots.splice(i, 1);
  scene.remove(plot.group);
  syncFarmSoil(true);                      // 🌾 흙 인스턴스 버퍼에서도 빠지게
  spawnDust(plot.x, plot.z, 22);
  spawnDigRegrow(plot.x, plot.z);
  Sound.harvest();
  ui.toast?.('밭을 메웠어요 — 다시 풀밭이 됐어요 🌱');
  trackEvent('dig_plot', { step: 2, plots: plots.length });   // [GA4]
  rollDigDex();
  lastDoorPrompt = null; ui.setDoorPrompt?.(null);
}
```

`js/game.js:10062` `updatePlotVisual` 은 개별 메시가 없어졌으니 인스턴스 갱신으로 바꾼다:

```js
function updatePlotVisual(plot) {
  syncFarmSoil();   // 🌾 젖은 흙 색은 인스턴스 색으로 — 시그니처가 바뀌었을 때만 실제로 쓴다
}
```

- [ ] **Step 5: 부팅·복원·프레임 루프에 연결한다**

`buildFarm()` 호출 근처(`js/game.js:2077`):

```js
  buildFarm();            // 개인 텃밭 필드
  buildFarmInstances();   // 🌾 밭 흙 인스턴스 버퍼
```

세이브 복원(`js/game.js:1895` `saved.plots.forEach` 루프) **직후**에:

```js
    syncFarmSoil(true);   // 🌾 복원된 밭을 인스턴스 버퍼에 반영
```

`updatePlots(dt)` 의 맨 끝에:

```js
  updateFarmPops(dt);   // 🌾 팝 중인 칸만 행렬 갱신
```

- [ ] **Step 6: 회귀가 없는지 직접 확인한다**

Run: 로컬 서버를 띄우고 `?dbg=1&weather=clear&time=0.32&farm=1&give=seed:9` 로 들어간다.

확인할 것 (전부 이전과 같아야 한다):
1. ⛏️괭이로 밭을 갈면 **흙먼지 + 톡 튀는 등장**이 그대로인가
2. 🌰씨앗 → 💧물 → 낫 수확이 정상인가
3. 물을 주면 흙이 **진한 색으로 바뀌는가**(`PAL.soilWet`)
4. 🪏삽으로 두 번 파면 밭이 사라지고 **남은 밭들이 제자리에 있는가** (인덱스 밀림 회귀 체크 — 가장 중요)
5. 밭을 3개 만들고 **가운데 것만** 삽으로 없앤 뒤, 남은 두 칸이 원래 자리에 그대로인가
6. 새로고침하면 심어둔 밭이 **복원되는가**

- [ ] **Step 7: 드로우콜을 측정한다**

Run: 같은 화면에서 콘솔에 `__perf()`

Expected: 밭 1칸당 흙 1콜이 사라진 만큼 줄어든다. 밭 9칸 기준 **−8콜** 이상(흙 9개 → 인스턴스 1개).
**이 값을 기록해 둔다** — Task 6의 최종 측정과 비교한다.

- [ ] **Step 8: 커밋**

```bash
git add js/game.js
git commit -m "perf: 🌾 밭 흙을 InstancedMesh 로 — 칸당 1콜 제거"
```

---

### Task 3: 이랑을 InstancedMesh 로 + 🪏삽 예외

이랑은 칸당 3개라 가장 수가 많다(121칸 = 363개). 다만 **🪏삽 1타 연출**이 이랑 3줄을 제각각 기울이고 어긋뜨리는데, 이건 인스턴스로 표현이 안 된다 → **삽질 중인 1칸만 개별 메시로 승격**하고 끝나면 인스턴스로 돌려보낸다. 동시에 한 칸뿐이라 비용은 +3콜이다.

**Files:**
- Modify: `js/game.js` — `buildFarmInstances` · `syncFarmSoil` · `updateFarmPops` · `createPlot`
- Modify: `js/game.js:9716` 근처 (`setPlotDug`)
- Modify: `js/game.js:9719` 근처 (`digHit`)
- Modify: `js/game.js:9731` (`expireDig`)
- Modify: `js/game.js:9937` (`updatePlots` 의 `digBackT` 블록)

**Interfaces:**
- Consumes: Task 1 의 `RIDGE_Z` · `RIDGE_PER_PLOT`, Task 2 의 `syncFarmSoil` · `_fmM` · `buildFarmInstances`
- Produces:
  - `farmRidgeMesh: THREE.InstancedMesh | null`
  - `promotePlotRidges(plot): void` — 개별 메시 3개를 만들어 `plot.ridges` 에 넣는다
  - `demotePlotRidges(plot): void` — 개별 메시를 지우고 인스턴스로 되돌린다

- [ ] **Step 1: 이랑 인스턴스를 만든다**

모듈 스코프에 `let farmRidgeMesh = null;` 을 `farmSoilMesh` 옆에 선언하고, `buildFarmInstances` 안 흙 메시를 만든 뒤에 이어 붙인다:

```js
  if (farmRidgeMesh) { scene.remove(farmRidgeMesh); farmRidgeMesh = null; }
  const rgeo = new THREE.BoxGeometry(1.5, 0.1, 0.34);
  const rmat = new THREE.MeshStandardMaterial({ color: 0x80553a, roughness: 0.95, metalness: 0, flatShading: false });
  farmRidgeMesh = new THREE.InstancedMesh(rgeo, rmat, cap * RIDGE_PER_PLOT);
  farmRidgeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  farmRidgeMesh.castShadow = false; farmRidgeMesh.receiveShadow = true;
  farmRidgeMesh.count = 0; farmRidgeMesh.frustumCulled = false;
  scene.add(farmRidgeMesh);
```

- [ ] **Step 2: `syncFarmSoil` 에서 이랑도 같이 쓴다**

`syncFarmSoil` 의 루프 안, 흙을 쓴 뒤에 이어 붙인다:

```js
    // 이랑 3줄 — 삽질 중(digAt)인 칸은 개별 메시로 승격돼 있으니 인스턴스에선 숨긴다
    for (let k = 0; k < RIDGE_PER_PLOT; k++) {
      const ri = i * RIDGE_PER_PLOT + k;
      if (p.digAt) { _fmM.makeScale(0, 0, 0); }                 // 크기 0 = 안 보임
      else { _fmM.makeScale(s, s, s); _fmM.setPosition(p.x, 0.21, p.z + RIDGE_Z[k] * s); }
      farmRidgeMesh.setMatrixAt(ri, _fmM);
    }
```

루프 뒤, `farmSoilMesh.count = plots.length;` 옆에:

```js
  farmRidgeMesh.count = plots.length * RIDGE_PER_PLOT;
  farmRidgeMesh.instanceMatrix.needsUpdate = true;
```

`updateFarmPops` 도 이랑을 같이 갱신하도록 **함수 전체를 이렇게 바꾼다**:

```js
function updateFarmPops(dt) {
  if (!farmSoilMesh) return;
  const idx = poppingPlots(plots);
  if (!idx.length) return;
  for (const i of idx) {
    const p = plots[i];
    p.pop = Math.max(0, p.pop - dt * 3);      // updatePops 와 같은 감쇠율
    const s = popScale(p.pop);
    _fmM.makeScale(s, s, s);
    _fmM.setPosition(p.x, 0.1, p.z);
    farmSoilMesh.setMatrixAt(i, _fmM);
    for (let k = 0; k < RIDGE_PER_PLOT; k++) {
      const ri = i * RIDGE_PER_PLOT + k;
      if (p.digAt) { _fmM.makeScale(0, 0, 0); }
      else { _fmM.makeScale(s, s, s); _fmM.setPosition(p.x, 0.21, p.z + RIDGE_Z[k] * s); }
      farmRidgeMesh.setMatrixAt(ri, _fmM);
    }
  }
  farmSoilMesh.instanceMatrix.needsUpdate = true;
  farmRidgeMesh.instanceMatrix.needsUpdate = true;
}
```

- [ ] **Step 3: `createPlot` 에서 이랑 메시를 뺀다**

```js
function createPlot(x, z, silent = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  // 🌾 흙·이랑은 InstancedMesh 가 그린다. 여기선 앵커 Group 만.
  //    ridges 는 🪏삽 1타 때만 개별 메시로 승격된다(promotePlotRidges).
  scene.add(g);
  const plot = { group: g, soil: null, ridges: null, crop: null, state: 'empty', growth: 0, stage: -1, x, z, watered: false, digAt: 0, digBackT: 0, pop: 0 };
  plots.push(plot);
  if (!silent) for (const o of npcObjs) if (onPlotArea(o.group.position.x, o.group.position.z)) o.wanderTimer = 0;
  if (!silent) { plot.pop = 1; spawnDust(x, z, 14); }
  syncFarmSoil(true);
  return plot;
}
```

- [ ] **Step 4: 승격·강등 함수를 추가한다**

`setPlotDug` 바로 위에 넣는다:

```js
// 🪏 삽 1타 연출 전용 — 이랑 3줄을 제각각 기울이려면 개별 메시여야 한다.
//   동시에 한 칸뿐이라 +3콜. 유예가 끝나면 demote 로 인스턴스에 되돌린다.
function promotePlotRidges(plot) {
  if (plot.ridges) return;
  plot.ridges = [];
  for (let k = 0; k < RIDGE_PER_PLOT; k++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.34), clayMat(0x80553a, false));
    r.position.set(0, 0.21, RIDGE_Z[k]); r.receiveShadow = true;
    plot.group.add(r); plot.ridges.push(r);
  }
}
function demotePlotRidges(plot) {
  if (!plot.ridges) return;
  for (const r of plot.ridges) plot.group.remove(r);
  plot.ridges = null;
  syncFarmSoil(true);      // 인스턴스 쪽 이랑을 다시 보이게
}
```

- [ ] **Step 5: 삽질 흐름에 연결한다**

`setPlotDug(plot, k)` 맨 앞에 `promotePlotRidges(plot);` 를 넣는다. 함수 안에서 `plot.ridges[...]` 를 쓰는 기존 코드는 **그대로 둔다** — 이제 승격돼 있으니 동작한다.

`digHit` 에서 `plot.digAt = clock.elapsedTime;` 다음 줄에:

```js
  syncFarmSoil(true);   // 🪏 인스턴스 쪽 이랑을 숨긴다(승격된 개별 메시가 대신 보인다)
```

`expireDig(plot)` 의 끝과 `removePlot` 의 맨 앞에 `demotePlotRidges(plot);` 를 넣는다.
`updatePlots` 의 `digBackT` 블록도 고친다:

```js
    if (plot.digBackT > 0) {
      plot.digBackT = Math.max(0, plot.digBackT - dt);
      setPlotDug(plot, plot.digBackT / DIG_RESTORE);
      if (plot.digBackT === 0) demotePlotRidges(plot);   // 🪏 복구 끝 → 인스턴스로 강등
    }
```

- [ ] **Step 6: 🪏 삽 동작을 직접 확인한다**

Run: `?dbg=1&weather=clear&time=0.32&farm=1`

확인할 것:
1. 밭을 갈고 🪏삽으로 **한 번** 파면 이랑 3줄이 **제각각 기울고 흙더미가 생기는가**
2. 6초를 기다리면 **이랑이 원위치로 돌아오고**, 돌아온 뒤 모양이 다른 밭과 **똑같은가** (강등이 제대로 됐는지)
3. 6초 안에 **한 번 더** 파면 밭이 사라지고 남은 밭들이 제자리인가
4. 밭 여러 개를 만들고 그중 하나만 삽질하는 동안 **다른 밭의 이랑이 멀쩡한가** (인덱스 오염 체크)

- [ ] **Step 7: 드로우콜을 측정한다**

Run: `__perf()`
Expected: 밭 9칸 기준 이랑 27개 → 1콜. Task 2 측정값 대비 **−26콜** 이상.

- [ ] **Step 8: 커밋**

```bash
git add js/game.js
git commit -m "perf: 🌾 밭 이랑을 InstancedMesh 로 — 🪏삽질 칸만 개별 메시로 승격"
```

---

### Task 4: 작물 메시를 단계별 InstancedMesh 로

작물은 `작물종(4) × 단계(3)` 조합이지만 실제 지오메트리는 **단계별로 고정**이고 색만 작물종을 따른다(`plot.cropType.fruit`). 단계 0·1은 색도 고정이라 **단계별 InstancedMesh 5개 + 열매만 인스턴스 색**이면 된다.

**Files:**
- Modify: `js/game.js` — `buildFarmInstances` 에 작물 인스턴스 추가
- Modify: `js/game.js:10084-10110` (`buildCropStage`)
- Modify: `js/game.js:9995` 근처 (`clearCrop`)
- Modify: `js/game.js:9983` 근처 (`wiltPlot`)
- Modify: `js/game.js` — `updateFarmPops` 에 작물 팝 추가

**Interfaces:**
- Consumes: Task 1 의 `popScale`, Task 2 의 `_fmM` · `_fmC` · `buildFarmInstances`
- Produces:
  - `farmCropMeshes: { sprout, stem, leaf, bush, fruit }` — 각 `THREE.InstancedMesh`
  - `syncFarmCrops(force?: boolean): void`
  - `plot.crop: true | null` — 기존 Group 참조를 truthy 플래그로 대체
  - `plot.cropPop: number`

- [ ] **Step 1: 작물 인스턴스 5종을 만든다**

모듈 스코프에 `let farmCropMeshes = null;` 을 선언하고, `buildFarmInstances` 안에 이어 붙인다:

```js
  // 🌱 작물 — 단계별 지오메트리는 고정, 열매만 작물종 색을 따른다
  const mk = (geo, color, count, colored) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({
      color: colored ? 0xffffff : color, roughness: 0.95, metalness: 0, flatShading: !colored,
    }), count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (colored) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    m.castShadow = true; m.receiveShadow = true; m.count = 0; m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  farmCropMeshes = {
    sprout: mk(new THREE.ConeGeometry(0.09, 0.3, 5), 0x9be89b, cap, false),
    stem:   mk(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), PAL.sprout, cap, false),
    leaf:   mk(new THREE.SphereGeometry(0.14, 8, 6), PAL.cropLeaf, cap * 2, false),
    bush:   mk(new THREE.IcosahedronGeometry(0.3, 0), PAL.cropLeaf, cap, false),
    fruit:  mk(new THREE.IcosahedronGeometry(0.19, 0), 0xffffff, cap, true),
  };
```

- [ ] **Step 2: 작물 버퍼를 쓰는 함수를 추가한다**

```js
// 🌱 작물 인스턴스 버퍼 — 단계가 바뀔 때만 다시 쓴다(성장도는 단계 안에서 모양이 안 변한다)
let farmCropSigPrev = NaN;
function cropsSignature() {
  let sig = plots.length | 0;
  for (const p of plots) {
    sig = (Math.imul(sig, 31) + (p.x | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.z | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.crop ? p.stage + 2 : 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.wilted ? 1 : 0)) | 0;
  }
  return sig;
}
function syncFarmCrops(force = false) {
  if (!farmCropMeshes) return;
  const sig = cropsSignature();
  if (!force && sig === farmCropSigPrev) return;
  farmCropSigPrev = sig;
  const M = farmCropMeshes;
  let nSprout = 0, nStem = 0, nLeaf = 0, nBush = 0, nFruit = 0;
  const LEAF = [[-0.16, 0.3], [0.16, 0.42]];
  const base = 0.26;                                   // 기존 crop 그룹의 position.y
  for (const p of plots) {
    if (!p.crop) continue;
    const s = popScale(p.cropPop || 0);
    if (p.stage === 0) {
      _fmM.makeScale(s, s, s); _fmM.setPosition(p.x, base + 0.15 * s, p.z);
      M.sprout.setMatrixAt(nSprout++, _fmM);
    } else if (p.stage === 1) {
      _fmM.makeScale(s, s, s); _fmM.setPosition(p.x, base + 0.25 * s, p.z);
      M.stem.setMatrixAt(nStem++, _fmM);
      for (const [lx, ly] of LEAF) {
        _fmM.makeScale(s, 0.5 * s, 0.7 * s);
        _fmM.setPosition(p.x + lx * s, base + ly * s, p.z);
        M.leaf.setMatrixAt(nLeaf++, _fmM);
      }
    } else if (p.stage === 2) {
      _fmM.makeScale(s, 0.82 * s, s);
      _fmM.setPosition(p.x, base + 0.32 * s, p.z);
      M.bush.setMatrixAt(nBush++, _fmM);
      _fmM.makeScale(s, s, s);
      _fmM.setPosition(p.x, base + 0.56 * s, p.z);
      M.fruit.setMatrixAt(nFruit, _fmM);
      _fmC.setHex(p.wilted ? 0x9a844f : (p.cropType?.fruit ?? PAL.crop));
      M.fruit.setColorAt(nFruit++, _fmC);
    }
  }
  M.sprout.count = nSprout; M.stem.count = nStem; M.leaf.count = nLeaf;
  M.bush.count = nBush; M.fruit.count = nFruit;
  for (const k of ['sprout', 'stem', 'leaf', 'bush', 'fruit']) M[k].instanceMatrix.needsUpdate = true;
  M.fruit.instanceColor.needsUpdate = true;
}
```

- [ ] **Step 3: `buildCropStage` 와 `clearCrop` 을 바꾼다**

```js
// 단계별 작물 — 메시는 farmCropMeshes(InstancedMesh)가 그린다. 여기선 상태만 바꾸고 팝을 건다.
function buildCropStage(plot) {
  plot.crop = true;          // "작물이 있다" 플래그 — 기존 코드가 truthy 검사만 한다
  plot.cropPop = 1;          // 단계 전환 시 톡 튀는 팝
  syncFarmCrops(true);
}

function clearCrop(plot) {
  plot.crop = null; plot.cropPop = 0;
  syncFarmCrops(true);
}
```

- [ ] **Step 4: `wiltPlot` 의 색 변경을 인스턴스로 옮긴다**

```js
function wiltPlot(plot) {
  plot.wilted = true; plot.state = 'wilted';
  syncFarmCrops(true);              // 🥀 시든 색(0x9a844f)은 인스턴스 색으로
  setPlotWarn(plot, false);
  ui.toast?.('🥀 작물이 시들었어요… 괭이로 다시 심어요');
}
```

> 기존 `wiltPlot` 의 기울어짐(`rotation.z = 0.5`)과 `scale.y *= 0.6` 은 **버린다.** 인스턴스 행렬로 넣을 수는 있지만 시든 상태는 색만으로도 충분히 읽히고, 회전까지 넣으면 `syncFarmCrops` 가 복잡해진다. 의도적인 연출 축소이며 스펙 §5-3의 "인스턴스로 표현이 안 되는 것"에 해당한다.

- [ ] **Step 5: 팝과 나머지 호출 지점에 연결한다**

`updateFarmPops` 끝에 작물 팝을 넣는다:

```js
  let cropPopping = false;
  for (const p of plots) if ((p.cropPop || 0) > 0) { p.cropPop = Math.max(0, p.cropPop - dt * 3); cropPopping = true; }
  if (cropPopping) syncFarmCrops(true);
```

`refreshCropStage` 끝, `setPlotCover`(`js/game.js:9317`), 세이브 복원 루프 뒤에 각각 `syncFarmCrops(true);` 를 넣는다.

- [ ] **Step 6: 작물이 정상인지 직접 확인한다**

Run: `?dbg=1&weather=clear&time=0.32&farm=1&give=seed:9`

확인할 것:
1. 씨앗을 심으면 **새싹이 톡 튀어오르는가**
2. 물을 주면 **줄기+잎 → 덤불+열매**로 단계가 오르고 매번 팝이 있는가
3. 작물마다 **열매 색이 다른가**(당근 주황 · 토마토 빨강 · 블루베리 파랑 · 호박 노랑) — 인스턴스 색 회귀 체크
4. 밭 여러 개를 서로 다른 단계로 만들어 두고 **각자 제 단계로 보이는가**
5. 물을 안 주고 방치해 시들면 **누렇게 변하는가**
6. 낫으로 수확하면 작물이 사라지고 빈 밭이 되는가
7. 🛡️덮개(작업대에서 만들어 설치)를 켜면 자라는 밭 위에 덮개가 보이는가

- [ ] **Step 7: 커밋**

```bash
git add js/game.js
git commit -m "perf: 🌱 작물 메시를 단계별 InstancedMesh 로 — 열매만 인스턴스 색"
```

---

### Task 5: 말풍선 스프라이트를 아틀라스 인스턴스로

`물!` · `수확!` · `씨앗을 넣어요` 세 알림은 지금 칸마다 `THREE.Sprite` 다. 재질은 이미 공유(`_warnMat` 등)하지만 **Sprite 는 객체마다 1드로우콜**이라 121칸이면 최대 121콜이다.

세 알림은 **동시에 하나만** 뜬다(`updatePlots` 가 배타적으로 토글). 그래서 **아틀라스 텍스처 1장 + 빌보드 InstancedMesh 1개**로 묶고, 어느 알림인지는 인스턴스 속성으로 고른다.

**Files:**
- Modify: `js/game.js:9990-10060` (`warnMaterial` · `harvestMaterial` · `seedHintMaterial` · `setPlotWarn` · `setPlotHarvest` · `setPlotSeedHint` — 전부 교체)
- Modify: `js/game.js` — `buildFarmInstances` 에 빌보드 추가
- Modify: `js/game.js:9937` (`updatePlots` 의 둥실 애니메이션 3줄 제거 + `syncFarmHints(now)`)

**Interfaces:**
- Consumes: Task 2 의 `_fmM` · `buildFarmInstances`
- Produces:
  - `farmHintMesh: THREE.InstancedMesh`
  - `hintTexture(): THREE.CanvasTexture`
  - `plot.hint: -1 | 0 | 1 | 2` — 없음 · 물 · 수확 · 씨앗
  - `syncFarmHints(now: number): void`

- [ ] **Step 1: 아틀라스 텍스처를 만든다**

기존 세 `*Material()` 함수(`warnMaterial` · `harvestMaterial` · `seedHintMaterial`)와 모듈 변수 `_warnMat` · `_harvestMat` · `_seedHintMat` 를 지우고 하나로 합친다:

```js
// 🌾 밭 알림 아틀라스 — '물!'·'수확!'·'씨앗을 넣어요' 세 배지를 한 텍스처에 세로로 쌓는다.
//   Sprite 는 객체마다 1드로우콜이라 121칸이면 121콜이었다 → 빌보드 InstancedMesh 1개로.
const HINT_W = 256, HINT_H = 112, HINT_N = 3;
let _hintTex = null;
function hintTexture() {
  if (_hintTex) return _hintTex;
  const cv = document.createElement('canvas'); cv.width = HINT_W; cv.height = HINT_H * HINT_N;
  const c = cv.getContext('2d');
  const badge = (row, bg, ink, text, padX) => {
    const y0 = row * HINT_H;
    c.fillStyle = bg; roundRect(c, padX, y0 + 8, HINT_W - padX * 2, 64, 18); c.fill();
    c.beginPath(); c.moveTo(HINT_W / 2 - 10, y0 + 72); c.lineTo(HINT_W / 2 + 10, y0 + 72); c.lineTo(HINT_W / 2 - 4, y0 + 94); c.closePath(); c.fill();
    c.fillStyle = ink; c.font = 'bold 28px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, HINT_W / 2, y0 + 40);
  };
  badge(0, 'rgba(140,200,255,0.96)', '#14406b', t('💧 물을 줘야해요!'), 46);
  badge(1, 'rgba(150,220,150,0.96)', '#245a2a', t('🌾 수확!'), 60);
  badge(2, 'rgba(233,206,150,0.97)', '#6b4a20', t('🌰 씨앗을 넣어요'), 12);
  _hintTex = new THREE.CanvasTexture(cv);
  _hintTex.minFilter = THREE.LinearFilter; _hintTex.magFilter = THREE.LinearFilter; _hintTex.generateMipmaps = false;
  return _hintTex;
}
```

> ⚠️ `t()` 로 번역한 문구를 캔버스에 굽는다. 언어를 바꾸면 텍스처를 다시 만들어야 하므로, i18n 언어 전환 지점에서 `_hintTex = null; buildFarmInstances(); syncFarmSoil(true); syncFarmCrops(true);` 를 부른다.

- [ ] **Step 2: 빌보드 인스턴스를 만든다**

모듈 스코프에 `let farmHintMesh = null;` 을 선언하고 `buildFarmInstances` 에 이어 붙인다:

```js
  // 알림 배지 — PlaneGeometry + 아틀라스. 인스턴스마다 UV 행을 옮긴다.
  const hgeo = new THREE.PlaneGeometry(1.5, 1.5 * HINT_H / HINT_W);
  const hmat = new THREE.MeshBasicMaterial({ map: hintTexture(), transparent: true, depthWrite: false });
  hmat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float hintRow;\nvarying float vRow;\n' +
      sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vRow = hintRow;');
    sh.fragmentShader = 'varying float vRow;\n' +
      sh.fragmentShader.replace('#include <map_fragment>',
        'vec2 uvA = vec2(vMapUv.x, (vMapUv.y + vRow) / ' + HINT_N.toFixed(1) + ');\n' +
        'vec4 sampledDiffuseColor = texture2D(map, uvA);\n diffuseColor *= sampledDiffuseColor;');
  };
  farmHintMesh = new THREE.InstancedMesh(hgeo, hmat, cap);
  farmHintMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  farmHintMesh.geometry.setAttribute('hintRow', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
  farmHintMesh.castShadow = false; farmHintMesh.receiveShadow = false;
  farmHintMesh.count = 0; farmHintMesh.frustumCulled = false;
  scene.add(farmHintMesh);
```

- [ ] **Step 3: 세 `setPlot*` 함수를 플래그 설정으로 바꾼다**

```js
// 🌾 알림 배지 — 세 종류가 동시에 뜨지 않으므로 칸당 하나의 값으로 관리한다.
//    -1 없음 · 0 물! · 1 수확! · 2 씨앗을 넣어요
function setPlotWarn(plot, show)     { if (show) plot.hint = 0; else if (plot.hint === 0) plot.hint = -1; }
function setPlotHarvest(plot, show)  { if (show) plot.hint = 1; else if (plot.hint === 1) plot.hint = -1; }
function setPlotSeedHint(plot, show) { if (show) plot.hint = 2; else if (plot.hint === 2) plot.hint = -1; }
```

- [ ] **Step 4: 매 프레임 빌보드 갱신 함수를 추가한다**

```js
// 알림이 떠 있는 칸만 행렬을 쓴다. 카메라를 향해 돌리고 살짝 둥실거린다(기존 연출 유지).
const _hintQ = new THREE.Quaternion(), _hintS = new THREE.Vector3(1, 1, 1), _hintP = new THREE.Vector3();
function syncFarmHints(now) {
  if (!farmHintMesh) return;
  const rows = farmHintMesh.geometry.getAttribute('hintRow');
  let n = 0;
  camera.getWorldQuaternion(_hintQ);
  for (const p of plots) {
    const h = p.hint ?? -1;
    if (h < 0) continue;
    _hintP.set(p.x, 1.4 + Math.sin(now * 3 + h) * 0.06, p.z);
    _fmM.compose(_hintP, _hintQ, _hintS);
    farmHintMesh.setMatrixAt(n, _fmM);
    rows.array[n] = h;
    n++;
  }
  farmHintMesh.count = n;
  farmHintMesh.instanceMatrix.needsUpdate = true;
  rows.needsUpdate = true;
}
```

- [ ] **Step 5: `updatePlots` 의 둥실 코드를 교체한다**

`updatePlots` 끝의 세 줄(`if (plot.warn && plot.warn.visible) ...` · `plot.harvest` · `plot.seedHint`)을 지우고, 루프 **바깥** 맨 끝에 넣는다:

```js
  syncFarmHints(now);
```

- [ ] **Step 6: 알림이 정상인지 직접 확인한다**

Run: `?dbg=1&weather=clear&time=0.32&farm=1&give=seed:9`

확인할 것:
1. 빈 밭 위에 **🌰 씨앗을 넣어요** 배지가 뜨는가
2. 심고 나서 흙이 마르면 **💧 물을 줘야해요!** 로 바뀌는가
3. 다 자라면 **🌾 수확!** 로 바뀌는가
4. 세 배지가 **동시에 겹쳐 뜨지 않는가**
5. 카메라를 돌려도 배지가 **항상 정면을 보는가** (빌보드 회귀 체크)
6. 배지가 **위아래로 살짝 둥실거리는가**
7. 밭을 여러 개 서로 다른 상태로 두고 **각자 제 배지가 뜨는가** (UV 행 오염 체크)
8. 언어를 영어로 바꿨다가 돌아오면 배지 글자가 따라 바뀌는가

- [ ] **Step 7: 커밋**

```bash
git add js/game.js
git commit -m "perf: 🌾 밭 알림 배지를 아틀라스 빌보드 인스턴스로 — Sprite 121개 → 1콜"
```

---

### Task 6: 울타리·둘레나무 인스턴싱과 최종 측정

**Files:**
- Modify: `js/game.js:7868-7905` (`buildFarm()` 의 울타리 말뚝 · 둘레 나무)
- Modify: `js/game.js:1789` 근처 (dev 훅 `__farmMax`)
- Modify: `js/game.js:485` 근처 (`setSpaceVisible` — 인스턴스 메시 토글)

**Interfaces:**
- Consumes: Task 1~5 전부
- Produces: `window.__farmMax(): number` — 밭을 가득 채워 최악 상태를 재현하는 dev 훅

- [ ] **Step 1: 인스턴스 메시를 공간 전환에 연결한다**

⚠️ **이 단계에서 가장 새기 쉬운 버그다.** `farmSoilMesh` 등은 `farmGroup` 의 자식이 아니라 `scene` 직속이라 `farmGroup.visible = false` 로 안 숨는다. 마을에서 밭이 허공에 뜬다.

`js/game.js:485` 의 `setSpaceVisible` 에서 `farmGroup.visible = atFarm;` 옆에 추가한다:

```js
  // 🌾 밭 인스턴스들은 scene 직속이라 farmGroup 과 같이 토글해야 한다
  for (const m of [farmSoilMesh, farmRidgeMesh, farmHintMesh]) if (m) m.visible = atFarm;
  if (farmCropMeshes) for (const k of ['sprout', 'stem', 'leaf', 'bush', 'fruit']) farmCropMeshes[k].visible = atFarm;
```

> 마을 안에도 밭을 만들 수 있으므로, 마을에서 밭이 안 보이면 안 된다. **마을 안 밭이 있는 경우엔 `atFarm` 이 아니라 `!indoor && !atMine && !atCafe && !atRiver && !atMist && !atSea` 로 판정해야 한다.** 구현 시 실제로 마을에 밭을 하나 만들어 두고 확인한다.

- [ ] **Step 2: 측정용 dev 훅을 추가한다**

`window.__tp` 옆(`js/game.js:1789`):

```js
    // 🌾 최악 상태 재현 — 텃밭을 밭으로 가득 채운다(드로우콜 측정용). 로컬 전용.
    window.__farmMax = () => {
      const H = FARM_HALF;
      for (let x = -H + 1; x <= H - 1; x += 2) for (let z = -H + 1; z <= H - 1; z += 2) {
        if (!plots.some(p => p.x === FARM.x + x && p.z === FARM.z + z)) createPlot(FARM.x + x, FARM.z + z, true);
      }
      for (const p of plots) { p.state = 'growing'; p.growth = 0.9; p.stage = -1; p.cropType = CROP_TYPES[Math.abs(p.x + p.z) & 3]; refreshCropStage(p); }
      syncFarmSoil(true); syncFarmCrops(true);
      return plots.length;
    };
```

- [ ] **Step 3: 인스턴싱 전 기준값을 잰다**

Run: `?dbg=1&weather=clear&time=0.32&farm=1` 로 들어가 콘솔에서

```js
__farmMax(); __perf()
```

**이 값을 기록한다.** 아직 울타리·나무는 개별 메시라 그 수만큼(말뚝 36 + 나무 48) 포함돼 있다.

- [ ] **Step 4: 울타리 말뚝을 인스턴스로 묶는다**

`buildFarm()` 의 말뚝 이중 루프를 바꾼다:

```js
  // 울타리 둘레 — 말뚝 36~60개가 개별 메시라 그 수만큼 드로우콜이었다 → InstancedMesh 1개
  const H = FARM_HALF;
  const posts = [];
  for (let i = -H; i <= H; i += 1.5) {
    for (const [x, z] of [[i, -H], [i, H], [-H, i], [H, i]]) {
      if (Math.abs(x) < 1.2 && z === H) continue;   // 남쪽 가운데는 출입구
      posts.push([x, z]);
    }
  }
  const postMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.12, 0.6, 0.12),
    new THREE.MeshStandardMaterial({ color: PAL.wood, roughness: 0.95, metalness: 0, flatShading: true }),
    posts.length);
  postMesh.castShadow = true; postMesh.receiveShadow = true;
  const _pm = new THREE.Matrix4();
  posts.forEach(([x, z], i) => { _pm.makeTranslation(x, 0.35, z); postMesh.setMatrixAt(i, _pm); });
  postMesh.instanceMatrix.needsUpdate = true;
  g.add(postMesh);
```

- [ ] **Step 5: 둘레 나무를 인스턴스로 묶는다**

같은 함수의 나무 루프를 바꾼다(24그루 × 줄기+잎 = 48메시):

```js
  // 둘레 나무 24그루 — 줄기·잎을 각각 InstancedMesh 1개로(48메시 → 2콜)
  const tr = [], lf = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.45) continue;              // 남쪽(+z) 출입구
    const r = FARM_HALF + 5 + ((i * 7) % 6) * 2.4;
    const h = 2.0 + ((i * 13) % 7) * 0.3;
    tr.push([Math.cos(a) * r, h, Math.sin(a) * r]);
    lf.push([Math.cos(a) * r, h + 1.0, Math.sin(a) * r]);
  }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1, 5),
    new THREE.MeshStandardMaterial({ color: PAL.trunk, roughness: 0.95, metalness: 0, flatShading: true }), tr.length);
  const leafMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 2.6, 6),
    new THREE.MeshStandardMaterial({ color: PAL.leaf1, roughness: 0.95, metalness: 0, flatShading: true }), lf.length);
  const _tm = new THREE.Matrix4(), _ts = new THREE.Vector3(), _tq = new THREE.Quaternion(), _tp = new THREE.Vector3();
  tr.forEach(([x, h, z], i) => { _ts.set(1, h, 1); _tp.set(x, h / 2, z); _tm.compose(_tp, _tq, _ts); trunkMesh.setMatrixAt(i, _tm); });
  lf.forEach(([x, y, z], i) => { _tm.makeTranslation(x, y, z); leafMesh.setMatrixAt(i, _tm); });
  trunkMesh.instanceMatrix.needsUpdate = true; leafMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.castShadow = true; leafMesh.castShadow = true;
  g.add(trunkMesh, leafMesh);
```

> 잎 색이 3가지(`leaf1/2/3`)였던 건 **`leaf1` 하나로 통일**한다. 색을 살리려면 인스턴스 색을 써야 하는데, 배경 장식이라 눈에 띄는 차이가 없고 재질만 늘어난다.

- [ ] **Step 6: 최종 측정**

Run: 같은 화면에서

```js
__farmMax(); __perf()
```

Expected: **텃밭 안에서 60콜 이하**(49칸 기준). 스펙 §5-4의 합격선은 121칸 기준 150콜이며, 이 단계에선 49칸이 상한이므로 훨씬 낮아야 한다.
Step 3에서 기록한 값과 비교해 감소폭을 커밋 메시지에 적는다.

- [ ] **Step 7: 전체 회귀를 마지막으로 확인한다**

Run: `npm test` → 전부 통과해야 한다.

그리고 게임에서 확인할 것:
1. **마을에 밭을 하나 만들고** 마을 ↔ 텃밭을 오가며 양쪽 밭이 제대로 보이는가 (Step 1의 판정 조건 검증)
2. 밭 갈기 · 심기 · 물주기 · 수확 · 🪏삽 전부 정상인가
3. 새로고침 복원이 정상인가
4. 🛡️덮개 · 🦝밤손님 흔적 · 🌡️서리 피해가 정상인가

- [ ] **Step 8: 커밋**

```bash
git add js/game.js
git commit -m "perf: 🌾 울타리·둘레나무 인스턴싱 + 밭 최악상태 측정 훅(__farmMax)"
```

---

## 완료 조건

- [ ] `npm test` 전부 통과
- [ ] `__farmMax(); __perf()` 가 텃밭에서 **60콜 이하**
- [ ] 밭 갈기 · 심기 · 물주기 · 수확 · 🪏삽 · 🛡️덮개 동작이 이전과 같음
- [ ] 마을 ↔ 텃밭 이동 시 양쪽 밭이 제대로 보이고 숨음
- [ ] 새로고침 복원 정상
- [ ] 세이브 스키마 변경 없음

## 다음 계획서

이 단계가 끝나면 스펙 §9의 2단계로 간다 — `docs/superpowers/plans/` 에 **밭 단계 증축**(`farm-stage.js` + `rebuildFarm()` + 측량 말뚝) 계획서를 새로 쓴다. 나머지 5단계도 같은 방식으로 하나씩 이어간다.
