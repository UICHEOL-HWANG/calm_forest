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
export const MIRROR_LANDING = Object.freeze({ x: 2.5, z: 10.8 });      // 하차 뒤 서는 자리(연못을 본다)
export const MIRROR_PARK = Object.freeze({ x: 2.5, z: 18.4, heading: Math.PI / 2 });   // 정류장 남쪽 — 카메라 시선(높이≈4.5)보다 낮아 플레이어를 안 가린다
export const MIRROR_GATE_LOCAL = Object.freeze({ x: 0, y: 5.5, z: -2 });   // 거울 마을 쪽 🪞 거울 문(연못 위)

// 충돌 — 보이는 조형물은 걸어서 뚫고 지나가면 안 된다(2026-10-09 통과 검수 · tests/mirror-collide.test.mjs · 실측 tools/mirror/collide.mjs)
// 🚏 정류장 상자 — 정류장 중심 기준(지붕 남쪽으로 돌린 makeStopShelter: 기둥 z+0.4 · 벤치 z+0.55) · 마을·거울 정류장 공용
export const STOP_SHELTER_BOX = Object.freeze({ x1: -1.4, z1: -0.7, x2: 1.4, z2: 0.8 });
export const SIGN_POLE = Object.freeze({ dx: -1.7, dz: -0.2, r: 0.12 });   // 정류장 표지판 기둥(돌린 뒤)
// 집은 비스듬히 놓여 있어 회전한 벽(3×2.6) 전체를 감싸는 상자 — 축 맞춘 3.2×2.8 로는 모서리를 뚫고 지나갔다
const houseBox = (h) => { const c = Math.abs(Math.cos(h.ry)), s = Math.abs(Math.sin(h.ry)), hx = 1.5 * c + 1.3 * s, hz = 1.5 * s + 1.3 * c; return { x1: h.x - hx, z1: h.z - hz, x2: h.x + hx, z2: h.z + hz }; };
const STOP = LANDMARKS.find(l => l.id === 'stop');
// 상자(로컬) — 연못(원 r3 를 상자로 근사)·집 3·우물·시계탑·정류장. 숨는 자리는 밖에 있어야 한다(테스트)
export const SOLIDS = Object.freeze([
  { x1: -2.7, z1: -2.7, x2: 2.7, z2: 2.7 },
  ...HOUSES.map(houseBox),
  { x1: -8.95, z1: -2.95, x2: -7.05, z2: -1.05 },
  { x1: 6.75, z1: -7.25, x2: 8.25, z2: -5.75 },
  { x1: STOP.x + STOP_SHELTER_BOX.x1, z1: STOP.z + STOP_SHELTER_BOX.z1, x2: STOP.x + STOP_SHELTER_BOX.x2, z2: STOP.z + STOP_SHELTER_BOX.z2 },
].map(Object.freeze));

// 가장자리 숲 링 — art.js 가 그리는 자리와 같은 목록(⚠️ 정류장 남쪽 z > 14, |x − 정류장| < 7 은 비운다 — 화면 아래를 가림)
export const RING_TREES = Object.freeze(Array.from({ length: 34 }, (_, i) => {
  const a = i / 34 * Math.PI * 2, r = 20.5 + (i % 3) * 1.4;
  return { i, r, x: Math.cos(a) * r, z: Math.sin(a) * r };
}).filter(t => !(t.z > 14 && Math.abs(t.x - MIRROR_STOP_LOCAL.x) < 7)).map(Object.freeze));
// 원(로컬) — 등불 기둥·표지판·덮개 나무 줄기·걸어서 닿는 가장자리 나무(WALK_R 바로 밖 줄)
export const SOLID_CIRCLES = Object.freeze([
  (() => { const l = LANDMARKS.find(x => x.id === 'lamp'); return { x: l.x, z: l.z, r: 0.22 }; })(),
  { x: STOP.x + SIGN_POLE.dx, z: STOP.z + SIGN_POLE.dz, r: SIGN_POLE.r },
  ...SPOTS.filter(s => s.cover === 'tree').map(s => ({ x: s.x, z: s.z - 0.3, r: 0.3 })),
  ...RING_TREES.filter(t => t.r < 21).map(t => ({ x: t.x, z: t.z, r: 0.35 })),
].map(Object.freeze));

// 🌙 정박 마차 — 달 몸체(로컬 x ±0.75 · z −1.6..1.6)만 막는다. 양은 공중(y≈1)에 떠 있고, 막으면 마을 탑승 자리(VILLAGE_BOARD)를 덮는다.
//   heading 은 ±π/2 뿐(축 맞춘 상자로 충분) — 좌표계는 park 와 같다(거울 쪽은 로컬, 마을 쪽은 월드)
export function carriageBox(park) {
  const c = Math.cos(park.heading), s = Math.sin(park.heading);
  const pts = [[-0.75, -1.6], [0.75, -1.6], [-0.75, 1.6], [0.75, 1.6]].map(([x, z]) => [park.x + x * c + z * s, park.z - x * s + z * c]);
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  return { x1: Math.min(...xs), z1: Math.min(...zs), x2: Math.max(...xs), z2: Math.max(...zs) };
}

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
export const VILLAGE_STOP = Object.freeze({ x: 16, z: 17 });   // = places.js MIRROR_STOP(THREE 없는 사본 · 테스트가 대조)

// 🚏 마을 쪽 탑승 안내 판정 — 승차 지점(호숫가) 반경만 보면 마을(남)에서 걸어온 사람은 지붕 뒤 벽에서 2.62 로 멈춰
//   안내가 끝내 안 떴다(2026-10-09 페르소나 p32 4/10 "마차 옆에서 아무 반응이 없다"). 정류장 둘레·정박 마차 옆까지 넓힌다.
export const STOP_AROUND_R = 3.0;   // 정류장 중심 — 지붕 벽에 붙어 선 자리(최대 ≈2.6)를 덮는다
export const PARK_AROUND_R = 2.8;   // 정박 마차 중심 — 마차 몸체에 붙어 선 자리(최대 ≈2.6)를 덮는다
export function nearVillageStop(x, z) {
  return Math.hypot(x - VILLAGE_BOARD.x, z - VILLAGE_BOARD.z) < STOP_REACH
    || Math.hypot(x - VILLAGE_STOP.x, z - VILLAGE_STOP.z) < STOP_AROUND_R
    || Math.hypot(x - VILLAGE_PARK.x, z - VILLAGE_PARK.z) < PARK_AROUND_R;
}

// 정류장 상자·정박 마차 상자(둘은 0.2 떨어져 붙어 있다) — 탑승 연출의 걷기가 이걸 뚫지 않게 돌아간다
//   판정은 실제 상자 둘로(합친 상자로 하면 그 안의 빈 바닥 — 마차 남쪽 띠 등 — 에서 탈 때 직선으로 모서리를 뚫는다, 리뷰 2026-10-09)
export const VILLAGE_WALL = Object.freeze([
  { x1: VILLAGE_STOP.x + STOP_SHELTER_BOX.x1, z1: VILLAGE_STOP.z + STOP_SHELTER_BOX.z1, x2: VILLAGE_STOP.x + STOP_SHELTER_BOX.x2, z2: VILLAGE_STOP.z + STOP_SHELTER_BOX.z2 },
  carriageBox(VILLAGE_PARK),
].map(Object.freeze));

/** 선분 a→b 가 축 맞춘 상자 안을 지나가나(Liang–Barsky) */
export function segHitsBox(a, b, box) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const [p, q] of [[-dx, a.x - box.x1], [dx, box.x2 - a.x], [-dz, a.z - box.z1], [dz, box.z2 - a.z]]) {
    if (p === 0) { if (q <= 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t1 - t0 > 1e-6;
}

/** 지금 자리 → 승차 지점 걷는 길 — 상자들을 지나면 묶음의 모서리로 돌아간다(서·동 중 짧은 쪽). 상자가 없으면 곧장 */
export function boardPath(start, board, boxes, m = 0.35) {
  const s = { x: start.x, z: start.z }, b = { x: board.x, z: board.z };
  const hits = (a, c) => (boxes || []).some(box => segHitsBox(a, c, box));
  if (!hits(s, b)) return [s, b];
  const box = { x1: Math.min(...boxes.map(o => o.x1)), z1: Math.min(...boxes.map(o => o.z1)), x2: Math.max(...boxes.map(o => o.x2)), z2: Math.max(...boxes.map(o => o.z2)) };
  const nz = box.z1 - m, sz = box.z2 + m;
  const len = (pts) => pts.reduce((n, p, i) => (i ? n + Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) : 0), 0);
  const clear = (pts) => pts.every((p, i) => !i || !hits(pts[i - 1], p));
  const routes = [box.x1 - m, box.x2 + m].flatMap((x) => [
    [s, { x, z: nz }, b],                    // 옆에서 — 북쪽 모서리만
    [s, { x, z: s.z }, { x, z: nz }, b],     // 옆으로 비켜선 뒤 북쪽 모서리
    [s, { x, z: sz }, { x, z: nz }, b],      // 남쪽에서 — 남쪽 모서리 → 북쪽 모서리
    [s, { x: s.x, z: sz }, { x, z: sz }, { x, z: nz }, b],   // 상자 사이 틈·띠에서 — 남쪽으로 빠진 뒤 돌아간다
  ]).filter(clear);
  return routes.length ? routes.reduce((best, r) => (len(r) < len(best) ? r : best)) : [s, b];   // 상자 안(충돌 밀림 직후)일 때만 곧장
}
