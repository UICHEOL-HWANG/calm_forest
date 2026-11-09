// =============================================================
//  🌙 꿈의 숲 — 좌표 표와 순수 규칙(THREE/DOM 없음 → Node 테스트: tests/dream-layout.test.mjs)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-08-dream-forest-design.md §3·§4
//  ▶ 좌표는 전부 DREAM(js/data/places.js) 기준 **로컬**이다. 월드 좌표 = DREAM + 로컬.
//  ▶ 걷는 면은 y=0 한 장. 섬은 높이가 아니라 모양으로 떠 있다 — 걸을 수 있는 곳 = 섬 원 ∪ 다리 캡슐.
// =============================================================

export const SHARDS_PER_DAY = 7;
export const SHARD_PICK_R = 1.1;          // 이만큼 다가가면 자동으로 줍는다
export const EDGE_PAD = 0.55;             // 섬 가장자리에서 몸 반쯤 안쪽까지만 걷는다(발이 허공에 걸치지 않게)
export const BRIDGE_HALF = 0.8;           // 다리 폭 1.6

export const ISLANDS = Object.freeze([
  Object.freeze({ id: 'main', x: 0,   z: 0,   r: 7 }),
  Object.freeze({ id: 'pink', x: -14, z: -13, r: 4.4 }),
  Object.freeze({ id: 'sky',  x: 13,  z: -16, r: 4.8 }),
  Object.freeze({ id: 'star', x: 20,  z: 2,   r: 3.4 }),
]);

// 다리는 섬 중심끼리 잇는다 — 캡슐 안쪽이 섬과 겹치는 건 상관없다(합집합)
export const BRIDGES = Object.freeze(ISLANDS.slice(1).map(b => Object.freeze({ from: 'main', to: b.id, ax: 0, az: 0, bx: b.x, bz: b.z })));

export const CLOUD_BED = Object.freeze({ x: -3.6, z: 2.4 });   // 🛏️ 깨어나는 자리(머리가 -z)
export const LANDING = Object.freeze({ x: 1.6, z: 4.2 });      // 마차에서 내리는 자리
export const COTTAGE = Object.freeze({ x: 0, z: -4.8, r: 2.0 });
export const PARK = Object.freeze({ x: -0.6, z: 6.0, heading: Math.PI / 2 });   // 정박 — 머리(+z 로컬)가 +x 를 본다

export const CRYSTAL_TREES = Object.freeze([
  [-4.0, -2.2, 1.2, 0], [4.4, -3.0, 1.0, 1], [5.6, -1.2, 0.8, 2], [-14.6, -14.0, 1.4, 3], [12.0, -16.6, 1.1, 0], [14.8, -15.8, 0.9, 2], [21.0, 1.6, 1.0, 1],
].map(Object.freeze));
export const MUSHROOM_LAMPS = Object.freeze([
  [2.8, 4.5, 0xffb3e6], [-2.2, 4.4, 0x9ef0ff], [-3.4, -5.0, 0xfff09e], [-12.4, -11.2, 0x9ef0ff], [13.6, -12.6, 0xffb3e6],
].map(Object.freeze));

const circle = (id, x, z, r) => Object.freeze({ id, ax: x, az: z, bx: x, bz: z, r });
export const OBSTACLES = Object.freeze([
  circle('tower', COTTAGE.x, COTTAGE.z, COTTAGE.r),
  Object.freeze({ id: 'carriage', ax: PARK.x - 0.55, az: PARK.z, bx: PARK.x + 2.75, bz: PARK.z, r: 0.95 }),
  Object.freeze({ id: 'bed', ax: CLOUD_BED.x, az: CLOUD_BED.z - 0.35, bx: CLOUD_BED.x, bz: CLOUD_BED.z + 0.35, r: 0.8 }),
  ...CRYSTAL_TREES.map(([x, z, s], i) => circle(`crystal-${i}`, x, z, 0.5 * s + 0.1)),
  ...MUSHROOM_LAMPS.map(([x, z], i) => circle(`mushroom-${i}`, x, z, 0.45)),
]);

// ✨ 조각 후보 14곳 — main 3 · pink 3 · sky 4 · star 2 · 다리 2
export const SHARD_SPOTS = Object.freeze([
  { id: 'main-1', island: 'main', x: 2.6,  z: -3.0 },
  { id: 'main-2', island: 'main', x: -2.2, z: -4.2 },
  { id: 'main-3', island: 'main', x: 4.4,  z: 2.4 },
  { id: 'pink-1', island: 'pink', x: -14,  z: -11.6 },
  { id: 'pink-2', island: 'pink', x: -16.2, z: -14.4 },
  { id: 'pink-3', island: 'pink', x: -12.2, z: -15.0 },
  { id: 'sky-1',  island: 'sky',  x: 12.4, z: -14.2 },
  { id: 'sky-2',  island: 'sky',  x: 15.4, z: -17.6 },
  { id: 'sky-3',  island: 'sky',  x: 10.8, z: -18.0 },
  { id: 'sky-4',  island: 'sky',  x: 15.6, z: -14.2 },
  { id: 'star-1', island: 'star', x: 20.4, z: 2.6 },
  { id: 'star-2', island: 'star', x: 21.6, z: 0.6 },
  { id: 'brg-1',  island: 'bridge', x: -7.6, z: -7.0 },
  { id: 'brg-2',  island: 'bridge', x: 10.4, z: 1.0 },
].map(Object.freeze));

const SPOT_BY_ID = new Map(SHARD_SPOTS.map(s => [s.id, s]));

export function islandOf(id) { return SPOT_BY_ID.get(id)?.island ?? null; }
export function spotOf(id) { return SPOT_BY_ID.get(id) ?? null; }

// ── 걷기 영역 ──────────────────────────────────────────────
function segClosest(b, x, z) {
  const dx = b.bx - b.ax, dz = b.bz - b.az;
  const t = Math.max(0, Math.min(1, ((x - b.ax) * dx + (z - b.az) * dz) / (dx * dx + dz * dz)));
  return { x: b.ax + dx * t, z: b.az + dz * t };
}

const PAD = 1e-4;

function closestOnSeg(o, x, z) {
  const dx = o.bx - o.ax, dz = o.bz - o.az, len2 = dx * dx + dz * dz;
  const t = len2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((x - o.ax) * dx + (z - o.az) * dz) / len2));
  return { x: o.ax + dx * t, z: o.az + dz * t };
}

function insideObstacle(o, x, z) {
  const p = closestOnSeg(o, x, z);
  return Math.hypot(x - p.x, z - p.z) < o.r - 1e-9;
}

function outlineOf(o) {
  const r = o.r + PAD, pts = [], dx = o.bx - o.ax, dz = o.bz - o.az, len = Math.hypot(dx, dz);
  if (len < 1e-9) {
    for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; pts.push({ x: o.ax + Math.cos(a) * r, z: o.az + Math.sin(a) * r }); }
    return pts;
  }
  const ux = dx / len, uz = dz / len, base = Math.atan2(uz, ux);
  for (let k = 0; k <= 16; k++) {
    const a = base - Math.PI / 2 + k / 16 * Math.PI, c = base + Math.PI / 2 + k / 16 * Math.PI;
    pts.push({ x: o.bx + Math.cos(a) * r, z: o.bz + Math.sin(a) * r }, { x: o.ax + Math.cos(c) * r, z: o.az + Math.sin(c) * r });
  }
  for (let t = 0; t <= len; t += 0.3) {
    pts.push({ x: o.ax + ux * t - uz * r, z: o.az + uz * t + ux * r }, { x: o.ax + ux * t + uz * r, z: o.az + uz * t - ux * r });
  }
  return pts;
}
const OUTLINES = OBSTACLES.map(outlineOf);

export function isWalkable(x, z) {
  for (const o of OBSTACLES) if (insideObstacle(o, x, z)) return false;
  for (const i of ISLANDS) if (Math.hypot(x - i.x, z - i.z) <= i.r - EDGE_PAD + 1e-9) return true;
  for (const b of BRIDGES) { const c = segClosest(b, x, z); if (Math.hypot(x - c.x, z - c.z) <= BRIDGE_HALF + 1e-9) return true; }
  return false;
}

function boundaryPoint(cx, cz, rad, x, z) {
  const d = Math.hypot(x - cx, z - cz) || 1e-6, k = (rad - PAD) / d;
  return { x: cx + (x - cx) * k, z: cz + (z - cz) * k };
}

function nearestWalkable(candidates, x, z) {
  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    if (!isWalkable(c.x, c.z)) continue;
    const dist = Math.hypot(c.x - x, c.z - z);
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  return best;
}

/** 걸을 수 없는 자리면 가장 가까운 걸을 수 있는 자리(섬·다리 가장자리, 소품 둘레)로 되민다. 걸을 수 있으면 그대로 돌려준다. */
export function clampWalkable(x, z) {
  if (isWalkable(x, z)) return { x, z };
  const candidates = ISLANDS.map(i => boundaryPoint(i.x, i.z, i.r - EDGE_PAD, x, z));
  for (const b of BRIDGES) { const c = segClosest(b, x, z); candidates.push(boundaryPoint(c.x, c.z, BRIDGE_HALF, x, z)); }
  const edgePoints = candidates.slice();
  OBSTACLES.forEach((o, i) => {
    const p = closestOnSeg(o, x, z), d = Math.hypot(x - p.x, z - p.z);
    if (d >= o.r + 1.0 && !edgePoints.some(c => insideObstacle(o, c.x, c.z))) return;
    if (d < o.r) {
      const ux = d > 1e-6 ? (x - p.x) / d : 0, uz = d > 1e-6 ? (z - p.z) / d : 1;
      candidates.push({ x: p.x + ux * (o.r + PAD), z: p.z + uz * (o.r + PAD) });
    }
    candidates.push(...OUTLINES[i]);
  });
  return nearestWalkable(candidates, x, z) ?? nearestWalkable(OUTLINES.flat(), x, z) ?? { x: LANDING.x, z: LANDING.z };
}

// ── 하루 조각 배치 ──────────────────────────────────────────
function hashStr(s) {   // FNV-1a 32bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** 그날의 조각 자리 id 7개 — main 정확히 2개, pink·sky·star 각 1개 이상, 나머지 2개는 main 밖에서.
 *  꿈속 프롬프트가 매 프레임 부르므로 날짜별로 한 번만 계산한다(얼린 배열 — 호출부는 고치지 않는다) */
let _pickDay = null, _pick = null;
export function pickShards(day) {
  if (day === _pickDay) return _pick;
  _pick = Object.freeze(computePick(day)); _pickDay = day;
  return _pick;
}
function computePick(day) {
  const rnd = mulberry32(hashStr(`dream:${day}`));
  const ids = (isl) => SHARD_SPOTS.filter(s => s.island === isl).map(s => s.id);
  const main = shuffled(ids('main'), rnd).slice(0, 2);
  const firsts = ['pink', 'sky', 'star'].map(isl => shuffled(ids(isl), rnd)[0]);
  const rest = shuffled(SHARD_SPOTS.filter(s => s.island !== 'main' && !firsts.includes(s.id)).map(s => s.id), rnd)
    .slice(0, SHARDS_PER_DAY - main.length - firsts.length);
  const picked = new Set([...main, ...firsts, ...rest]);
  return SHARD_SPOTS.map(s => s.id).filter(id => picked.has(id));   // 표 순서로 — 테스트·HUD 가 안정적
}

// ── 세이브 ──────────────────────────────────────────────────
const nonNegInt = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** 세이브의 dream 필드를 검증·정리한다. 날이 바뀌었으면 got 을 비운다. */
export function normalizeDream(saved, today) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const todays = new Set(pickShards(today));
  const got = s.day === today && Array.isArray(s.got)
    ? [...new Set(s.got.filter(id => typeof id === 'string' && todays.has(id)))]
    : [];
  return { visits: nonNegInt(s.visits), day: today, got, total: nonNegInt(s.total) };
}

/** 오늘 고른 자리 중 아직 안 주운 것(표 순서) */
export function shardsLeft(dream, today) {
  const got = dream?.day === today && Array.isArray(dream.got) ? dream.got : [];
  return pickShards(today).filter(id => !got.includes(id));
}
