// =============================================================
//  🗿 조각 공방 — 깎기 미니게임 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, RES_LABEL, camera, clayMat, dateHash, gameState, mgView, pointer, raycaster, refreshInventoryUI, renderer,
  scene, snapCamera, spawnConfetti, spawnFloatText, spawnSparkle, todayStr, ui, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { SELL_ICO_G } from '../data/places.js';
import { logEcon } from '../metrics.js';
import { Sound } from '../sound.js';
import { emojiSprite } from '../spaces/kitchen-stage.js';
import * as THREE from 'three';

//    12×9 칩 그리드(InstancedMesh 1드로우콜)를 탭/드래그로 깎아 밑그림 속 형상을 드러낸다.
//    · 밝은 칩(버릴 부분) 제거 = 진행, 어두운 칩(밑그림) 탭 = 흠집(-20점, 3개면 강제 완성)
//    · 드래그로 밑그림을 스치는 건 무판정(모바일 배려) — 흠집은 직접 탭했을 때만
//    · 판정·연출 모두 여기(3D가 레이캐스트를 소유), index.html 은 주문판/HUD/결과만
export const WSET = new THREE.Vector3(0, 0, 460);

export const CARVE_COLS = 12, CARVE_ROWS = 9, CARVE_S = 0.34;

export const CARVE_CY = 2.75;

export const CARVE_TIERS = [
  { id: 'master', min: 88, ico: '💎', name: '걸작',  mult: 1.5 },
  { id: 'fine',   min: 65, ico: '✨', name: '명품',  mult: 1.25 },
  { id: 'decent', min: 35, ico: '🙂', name: '양품',  mult: 1.0 },
  { id: 'rough',  min: 0,  ico: '😅', name: '투박',  mult: 0.7 },
];

export const CARVE_MATS = {
  wood:  { ico: '🪵', waste: 0xd9a066, keep: 0xb0763f, crack: 0x5f3a1e, done: 0xf09a4e, dust: 0xcaa06a },
  stone: { ico: '🪨', waste: 0xbcb7ab, keep: 0x8b8779, crack: 0x4e4b43, done: 0x9fd8c0, dust: 0xa8a49a },
};

// 도안 — mask: '#'=밑그림(남길 부분) '.'=깎을 부분. 12×9 고정
export const CARVE_DESIGNS = [
  { id: 'fish', name: '목각 물고기', ico: '🐟', mat: 'wood', cost: { wood: 8 }, pay: 26, mask: [
    '............', '....####....', '...######...', '##.########.', '############',
    '##.########.', '...######...', '....####....', '............'] },
  { id: 'heart', name: '하트 장식', ico: '💗', mat: 'wood', cost: { wood: 6 }, pay: 22, mask: [
    '............', '..###..###..', '.##########.', '.##########.', '..########..',
    '...######...', '....####....', '.....##.....', '............'] },
  { id: 'mush', name: '버섯 조각', ico: '🍄', mat: 'wood', cost: { wood: 6 }, pay: 22, mask: [
    '....####....', '..########..', '.##########.', '.##########.', '....####....',
    '....####....', '...######...', '............', '............'] },
  { id: 'tree', name: '아기 나무', ico: '🌲', mat: 'wood', cost: { wood: 8 }, pay: 24, mask: [
    '.....##.....', '....####....', '...######...', '..########..', '.##########.',
    '....####....', '....####....', '...######...', '............'] },
  { id: 'star', name: '돌 별 장식', ico: '⭐', mat: 'stone', cost: { stone: 5 }, pay: 28, mask: [
    '.....##.....', '.....##.....', '....####....', '.##########.', '..########..',
    '...######...', '..###..###..', '..#......#..', '............'] },
  { id: 'cup', name: '돌 찻잔', ico: '☕', mat: 'stone', cost: { stone: 6 }, pay: 30, mask: [
    '............', '.#######....', '.#######.##.', '.#######..#.', '.#######.##.',
    '..#####.....', '...###......', '..#######...', '............'] },
  { id: 'cat', name: '고양이 석상', ico: '🐱', mat: 'stone', cost: { stone: 5 }, pay: 26, mask: [
    '............', '.##.....##..', '.###...###..', '.##########.', '.##########.',
    '.##########.', '.##########.', '..########..', '............'] },
];

export let wset = null;

export let carve = null;

export let carveBound = false;

// 오늘의 주문 3건 — 날짜 시드(모든 유저 동일), 자정 리셋(카페 주문판과 같은 규칙)
export function workshopOrders() {
  const st = gameState.workshop;
  const today = todayStr();
  if (st.date !== today) { st.date = today; st.done = []; st.carvedToday = 0; }
  const start = dateHash('carve') % CARVE_DESIGNS.length;
  return [0, 2, 5].map(off => {                     // +0/+2/+5 (mod 7) — 항상 서로 다른 도안
    const d = CARVE_DESIGNS[(start + off) % CARVE_DESIGNS.length];
    return { id: d.id, d, done: st.done.includes(d.id) };
  });
}

// index.html(주문판 탭)이 렌더할 데이터
export function workshopView() {
  const inv = gameState.inventory;
  const st = gameState.workshop;
  return {
    orders: workshopOrders().map(o => ({
      id: o.id, name: o.d.name, ico: o.d.ico, matIco: CARVE_MATS[o.d.mat].ico, pay: o.d.pay,
      cost: Object.entries(o.d.cost).map(([k, v]) => ({ k, ico: SELL_ICO_G[k] || '📦', label: RES_LABEL[k] || k, need: v, have: inv[k] || 0 })),
      ready: !o.done && Object.entries(o.d.cost).every(([k, v]) => (inv[k] || 0) >= v),
      done: o.done, best: st.best[o.id] || 0,
    })),
    carved: st.carved || 0,
  };
}

// 공방 무대 조형 — 주방 세트와 같은 문법(clay/wood 로우폴리 + 이모지 소품 + 따뜻한 조명)
export function buildWorkshopSet() {
  if (wset) return;
  const g = new THREE.Group(); g.position.copy(WSET);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 13), clayMat(0xe3d3b4, false)); wall.position.set(0, 4.2, -2.0); g.add(wall);   // 모바일 세로 프레이밍(원거리 카메라)에서도 배경이 끊기지 않게 넉넉히
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.5), woodMat(2, 1)); shelf.position.set(-2.6, 4.5, -1.75); g.add(shelf);
  ['🔨', '🪚', '🧰'].forEach((e, i) => { const s = emojiSprite(e, 0.42); s.position.set(-3.5 + i * 0.9, 4.75, -1.7); g.add(s); });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(10, 1.0, 3.4), woodMat(3, 1)); counter.position.set(0, 0.5, 0); counter.receiveShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(10, 0.07, 3.5), clayMat(0xd9c6a4, false)); top.position.set(0, 1.03, 0); g.add(top);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.5, 0.14, 18), clayMat(0x8a6a4a)); table.position.set(0, 1.12, 0); g.add(table);
  // 조각 블록(회전 그룹) — 배킹 판 + 칩 InstancedMesh(108개 = 1드로우콜, threejs-geometry)
  const blockGroup = new THREE.Group(); g.add(blockGroup);
  const backing = new THREE.Mesh(new THREE.BoxGeometry(CARVE_COLS * CARVE_S + 0.1, CARVE_ROWS * CARVE_S + 0.1, 0.2), clayMat(0x6b5a45, false));
  backing.position.set(0, CARVE_CY, -0.27); blockGroup.add(backing);
  const chipGeo = new THREE.BoxGeometry(CARVE_S * 0.94, CARVE_S * 0.94, CARVE_S);
  const chips = new THREE.InstancedMesh(chipGeo, clayMat(0xffffff, false), CARVE_COLS * CARVE_ROWS);
  chips.setColorAt(0, new THREE.Color(0xffffff));   // instanceColor 버퍼 생성
  blockGroup.add(chips);
  // 끌(치즐) — 탭 지점에 나타나 콕 내리찍는 손맛 연출
  const chisel = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.3, metalness: 0.6 }));
  blade.position.z = 0.25; chisel.add(blade);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.3, 8), clayMat(0x8a5a3a));
  grip.rotation.x = Math.PI / 2; grip.position.z = 0.62; chisel.add(grip);
  chisel.visible = false; g.add(chisel);
  const light = new THREE.PointLight(0xffe0b0, 1.35, 16); light.position.set(0.6, 4.2, 2.6); g.add(light);
  const fill = new THREE.PointLight(0xfff2d8, 0.6, 14); fill.position.set(-1.2, 3.2, -3.2); g.add(fill);   // 뒷면 필 라이트 — 완성 회전 때 측·후면이 시커멓지 않게
  g.visible = false;
  scene.add(g);
  wset = { group: g, blockGroup, backing, chips, chisel, light, debris: [], trauma: 0, popT: -1, spinT: -1, strikeT: -1,
    debrisMat: clayMat(0xcaa06a, false), _c: new THREE.Color(), _m: new THREE.Matrix4(), _d: new THREE.Object3D() };
}

export const carveCell = (i) => ({ c: i % CARVE_COLS, r: (i / CARVE_COLS) | 0 });

export const carvePos = (i) => { const { c, r } = carveCell(i); return { x: (c - (CARVE_COLS - 1) / 2) * CARVE_S, y: CARVE_CY + ((CARVE_ROWS - 1) / 2 - r) * CARVE_S }; };

// 도안 세팅 — 칩 배치·색(밑그림은 살짝 어둡게 = 스케치 힌트)
export function setupCarveBlock(d) {
  const m = CARVE_MATS[d.mat];
  const cells = []; let waste = 0;
  for (let i = 0; i < CARVE_COLS * CARVE_ROWS; i++) {
    const { c, r } = carveCell(i);
    const keep = d.mask[r][c] === '#';
    cells.push(keep ? 'k' : 'w'); if (!keep) waste++;
    const p = carvePos(i);
    wset._d.position.set(p.x, p.y, 0); wset._d.rotation.set(0, 0, 0); wset._d.scale.setScalar(1); wset._d.updateMatrix();
    wset.chips.setMatrixAt(i, wset._d.matrix);
    wset.chips.setColorAt(i, wset._c.set(keep ? m.keep : m.waste));
  }
  wset.chips.instanceMatrix.needsUpdate = true;
  wset.chips.instanceColor.needsUpdate = true;
  wset.chips.computeBoundingSphere();
  wset.blockGroup.rotation.y = 0; wset.blockGroup.scale.setScalar(1);
  wset.backing.material.color.set(d.mat === 'wood' ? 0x6b5a45 : 0x5c584f);
  wset.debrisMat.color.set(m.dust);
  wset.debris.forEach(f => f.m.parent?.remove(f.m)); wset.debris = [];
  wset.trauma = 0; wset.popT = -1; wset.spinT = -1; wset.strikeT = -1; wset.chisel.visible = false;
  carve = { d, cells, waste, removed: 0, dmg: 0, startAt: performance.now(), over: false, finished: false, drag: false, lastMove: 0 };
}

// 조각 시작 — 재료 선소비(주방과 같은 악용 방지: 포기해도 낮은 등급으로 완성)
export function carveStart(id) {
  const o = workshopOrders().find(x => x.id === id);
  if (!o) return { ok: false };
  if (o.done) return { ok: false, msg: '오늘 이 주문은 이미 완성했어요' };
  const d = o.d;
  for (const k in d.cost) if ((gameState.inventory[k] || 0) < d.cost[k]) return { ok: false, msg: `${RES_LABEL[k] || k}이(가) 부족해요` };
  for (const k in d.cost) gameState.inventory[k] -= d.cost[k];
  refreshInventoryUI();
  buildWorkshopSet();
  setupCarveBlock(d);
  wset.group.visible = true;
  $w.mgView = { type: 'carve' };
  bindCarvePointer();
  ui.act?.('carve');                                      // 🎓 튜토리얼: "조각 시작해보기" 단계 통과
  trackEvent('carve_start', { order: id, mat: d.mat });   // [GA4] 미니게임 퍼널: 시작
  return { ok: true, id, name: d.name, ico: d.ico, waste: carve.waste, dmgMax: 3 };
}

// 포인터 입력(캔버스 소유는 game.js) — 탭=깎기/흠집, 드래그=슥슥 연속 깎기(threejs-interaction)
export function carveActive() { return mgView?.type === 'carve' && carve && !carve.over; }

export function bindCarvePointer() {
  if (carveBound) return; carveBound = true;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { if (carveActive()) { carve.drag = true; carveHit(e, true); } });
  el.addEventListener('pointermove', (e) => {
    if (!carveActive() || !carve.drag) return;
    const now = performance.now();
    if (now - carve.lastMove < 40) return;               // 레이캐스트 스로틀
    carve.lastMove = now;
    carveHit(e, false);
  });
  window.addEventListener('pointerup', () => { if (carve) carve.drag = false; });
}

export function carveHit(e, isTap) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(wset.chips, false)[0];
  if (!hit || hit.instanceId == null) return;
  const i = hit.instanceId;
  if (carve.cells[i] === 'w') removeChip(i);
  else if (carve.cells[i] === 'k' && isTap) scratchChip(i);   // 드래그로 스친 밑그림은 무판정
}

// 칩 제거 — 소형 피드백(소리+파편). game-feel: 반복 동작은 과하지 않게
export function removeChip(i) {
  carve.cells[i] = 'x';
  const p = carvePos(i);
  wset._d.position.set(p.x, p.y, 0); wset._d.scale.setScalar(0.0001); wset._d.updateMatrix();
  wset.chips.setMatrixAt(i, wset._d.matrix);
  wset.chips.instanceMatrix.needsUpdate = true;
  for (let n = 0; n < 4; n++) {                          // 파편 포물선(재료별 가루 색)
    const f = new THREE.Mesh(new THREE.BoxGeometry(CARVE_S * (0.2 + Math.random() * 0.25), CARVE_S * 0.22, CARVE_S * 0.22), wset.debrisMat);
    f.position.set(p.x, p.y, 0.3);
    wset.group.add(f);
    wset.debris.push({ m: f, vx: (Math.random() - 0.5) * 2.2, vy: 1.2 + Math.random() * 1.4, vz: 1.0 + Math.random() * 1.2, rx: (Math.random() - 0.5) * 9, life: 0.55 });
  }
  strikeChisel(p);
  Sound.chop();
  carve.removed++;
  ui.carveProgress?.({ removed: carve.removed, waste: carve.waste, dmg: carve.dmg });
  if (carve.removed >= carve.waste) { carve.over = true; setTimeout(() => carveFinish('done'), 380); }
}

// 밑그림 흠집 — 중형 피드백(균열색+셰이크+둔탁음). trauma 는 카메라 오프셋만 흔든다(시뮬레이션 불가침)
export function scratchChip(i) {
  carve.cells[i] = 's';
  wset.chips.setColorAt(i, wset._c.set(CARVE_MATS[carve.d.mat].crack));
  wset.chips.instanceColor.needsUpdate = true;
  const p = carvePos(i);
  strikeChisel(p);
  Sound.till();
  wset.trauma = Math.min(1, wset.trauma + 0.45);
  spawnFloatText(WSET.x + p.x, p.y + 0.3, WSET.z + 0.6, '💢 흠집!', '#c0392b', 0.9);
  carve.dmg++;
  ui.carveProgress?.({ removed: carve.removed, waste: carve.waste, dmg: carve.dmg });
  if (carve.dmg >= 3) { carve.over = true; setTimeout(() => carveFinish('ruin'), 550); }
}

export function strikeChisel(p) {
  wset.chisel.position.set(p.x + 0.12, p.y + 0.1, 0.62);
  wset.chisel.visible = true; wset.strikeT = 0;
}

export function carveAbandon() {
  if (!carve) { carveSceneEnd(); return; }
  if (carve.over) return;                                 // 정산 중엔 무시
  carve.over = true;
  carveFinish('abandon');
}

// 정산 — 등급은 흠집 수가 결정(0=100 / 1=80 / 2=60), 망치거나 포기하면 투박
export function carveFinish(kind) {
  if (!carve || carve.finished) return;
  carve.finished = true;
  const d = carve.d;
  const score = kind === 'done' ? Math.max(0, 100 - carve.dmg * 20) : kind === 'ruin' ? 30 : 25;
  const tier = CARVE_TIERS.find(t => score >= t.min) || CARVE_TIERS[CARVE_TIERS.length - 1];
  const st = gameState.workshop;
  st.carved = (st.carved || 0) + 1;
  st.tiers[tier.id] = (st.tiers[tier.id] || 0) + 1;
  const isBest = score > (st.best[d.id] || 0);
  if (isBest) st.best[d.id] = score;
  if (!st.done.includes(d.id)) st.done.push(d.id);        // 시도 자체가 오늘 주문 소진(재도전 파밍 방지)
  const coins = Math.round(d.pay * tier.mult);
  gameState.inventory.coins += coins;
  if (kind === 'done') st.carvedToday = (st.carvedToday || 0) + 1;   // 🦉 의뢰는 오늘 완성 수를 읽는다(망치거나 포기한 건 "완성" 이 아니다)
  refreshInventoryUI();
  revealCarve(tier, kind === 'done');
  logEcon('carve_reward', d.id, coins, gameState.inventory.coins);   // [원장] 코인 유입
  trackEvent(kind === 'abandon' ? 'carve_abandon' : 'carve_result', {   // [GA4] 결과 지표 — 주방 스키마와 같은 결
    order: d.id, quality: tier.id, score, dmg: carve.dmg,
    chips_left: carve.waste - carve.removed,
    duration_ms: Math.round(performance.now() - carve.startAt),
    is_best: isBest ? 1 : 0, total_carved: st.carved,
  });
  const res = { ok: true, name: d.name, ico: d.ico, score, isBest, coins, carved: st.carved, dmg: carve.dmg,
    tier: { id: tier.id, ico: tier.ico, name: tier.name } };
  setTimeout(() => ui.carveDone?.(res), kind === 'done' ? 1500 : 700);  // 회전 연출을 본 뒤 결과 카드
}

// 완성 연출 — 대형 피드백(색 반전+오버슈트 팝+턴테이블 한 바퀴+팡파레). 연출은 잠깐, 곧 원상 복귀
export function revealCarve(tier, won) {
  const m = CARVE_MATS[carve.d.mat];
  for (let i = 0; i < carve.cells.length; i++) {
    if (carve.cells[i] === 'k') wset.chips.setColorAt(i, wset._c.set(m.done));
  }
  wset.chips.instanceColor.needsUpdate = true;
  wset.popT = 0;
  if (won) wset.spinT = 0;
  spawnSparkle(WSET.x, CARVE_CY, WSET.z + 0.5, tier.id === 'master' ? 26 : 14);
  if (tier.id === 'master' || tier.id === 'fine') { Sound.complete(); spawnConfetti(WSET.x, CARVE_CY + 0.8, WSET.z + 0.5); }
  else Sound.harvest();
}

export function carveSceneEnd() {
  if (wset) {
    wset.group.visible = false;
    wset.debris.forEach(f => f.m.parent?.remove(f.m)); wset.debris = [];
    wset.chisel.visible = false;
  }
  carve = null;
  $w.mgView = null;
  snapCamera();                                           // 마을 카메라 복귀
}

// 매 프레임 — 카메라 고정(+trauma 셰이크) · 끌 트윈 · 팝/회전 · 파편 물리
export function applyCarveCamera() {
  const tanH = Math.tan(camera.fov * Math.PI / 360);
  const need = Math.max((CARVE_COLS * CARVE_S * 0.62) / (tanH * camera.aspect),   // 가로 여백 확보(모바일 세로)
                        (CARVE_ROWS * CARVE_S * 0.80) / tanH);                     // 세로 여백 확보(HUD 공간)
  const dist = Math.min(12.5, Math.max(4.2, need));
  const sh = wset.trauma * wset.trauma;                   // trauma² — 약한 흠집은 살짝, 연속 흠집은 크게
  const tt = performance.now() / 1000;
  camera.position.set(WSET.x + sh * 0.14 * Math.sin(tt * 37), CARVE_CY + 0.5 + sh * 0.10 * Math.sin(tt * 47), WSET.z + dist);
  camera.lookAt(WSET.x, CARVE_CY - 0.05, WSET.z);
}

// 로컬 개발 훅 — 브라우저 검증용(waste n개 자동 깎기 / 흠집 1회). 실서비스 호스트에선 no-op
export function carveDebug(action, n = 1) {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return null;
  if (!carveActive()) return { active: false };
  if (action === 'chip') {
    let left = n;
    for (let i = 0; i < carve.cells.length && left > 0; i++) if (carve.cells[i] === 'w') { removeChip(i); left--; if (carve.over) break; }
  } else if (action === 'scratch') {
    const i = carve.cells.indexOf('k');
    if (i >= 0) scratchChip(i);
  }
  return carve ? { active: !carve.over, removed: carve.removed, waste: carve.waste, dmg: carve.dmg } : { active: false };
}
