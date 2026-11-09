export const GOALS = {
  tree: { ico: '🪓', label: '나무', title: '🪓 나무 베기' },
  cave: { ico: '⛏️', label: '동굴', title: '⛏️ 동굴 탐험하기' },
  stone: { ico: '🪨', label: '돌', title: '🪨 돌 캐기' },
  farmBranch: { ico: '🌾', label: '세계수', title: '🌾 밭의 가지 살리기' },
  coal: { ico: '⚫', label: '석탄', title: '⚫ 석탄 캐기' },
  miner: { ico: '⛏️', label: '광부', title: '⛏️ 광부에게 가기' },
  lift: { ico: '🛗', label: '승강기', title: '🛗 승강기 타기' },
  wall: { ico: '🔨', label: '집 터', title: '🔨 벽 세우기' },
  farm: { ico: '🌾', label: '밭', title: '🌾 밭 가꾸기' },
  roof: { ico: '🏠', label: '집 터', title: '🏠 지붕 올리기' },
  cosShop: { ico: '🎀', label: '꾸미기 가게', title: '🎀 새 옷 고르기' },
  bridge: { ico: '🌉', label: '다리', title: '🌉 다리 고치기' },
  museum: { ico: '🏛️', label: '박물관', title: '🧑‍🦳 할아버지 만나기' },
};

const TUT_KEYS = { chop: 'tree', mine: 'cave', house2: 'wall', harvest: 'farm', build: 'roof', dress: 'cosShop', bridge: 'bridge', curator: 'museum' };

export const ARRIVE = { tree: 2.3, cave: 1.6, stone: 2.2, farmBranch: 4.2, coal: 2.2, miner: 1.5, lift: 1.8, wall: 2.4, roof: 2.4, farm: 1.6, cosShop: 1.8, bridge: 1.8, museum: 2.0 };

export const CINE_SUB = '다음 목적지';
export const MERCHANT_WOOD = 5;
export const MINER_COAL = 3;

export function tutGoal(step, { wood = 0 } = {}) {
  if (step === 'sell') return wood < MERCHANT_WOOD ? { key: 'tree', cine: false } : null;
  return TUT_KEYS[step] ? { key: TUT_KEYS[step], cine: true } : null;
}

export function minerGoal(d, inv = {}) {
  if (!d?.started) return null;
  if (d.stage === 0) return (inv.coal || 0) < MINER_COAL ? { key: 'coal', cine: true } : { key: 'miner', cine: false };
  if (d.stage === 1 && !(d.maxFloor > 0)) return { key: 'lift', cine: true };
  return null;
}

export function onScreen(p, w, h, pad) {
  return !!p && p.x >= pad && p.x <= w - pad && p.y >= pad && p.y <= h - pad;
}

export function edgeAnchor(me, tgt, w, h, pad) {
  const dx = tgt.x - me.x, dy = tgt.y - me.y;
  const ang = Math.atan2(dy, dx);
  const c = Math.cos(ang), s = Math.sin(ang);
  const kx = Math.abs(c) < 1e-9 ? Infinity : (c > 0 ? w - pad - me.x : me.x - pad) / Math.abs(c);
  const ky = Math.abs(s) < 1e-9 ? Infinity : (s > 0 ? h - pad - me.y : me.y - pad) / Math.abs(s);
  const k = Math.max(0, Math.min(kx, ky));
  return { x: me.x + c * k, y: me.y + s * k, ang };
}

const asCircle = (s) => ('r' in s ? { x: s.x, z: s.z, r: s.r }
  : { x: (s.x1 + s.x2) / 2, z: (s.z1 + s.z2) / 2, r: Math.hypot(s.x2 - s.x1, s.z2 - s.z1) / 2 });

export function detourPoint(from, to, solids, pad = 0.8) {
  const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz);
  if (len < 1e-6) return to;
  const ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
  let hit = null;
  for (const s of solids) {
    if (s.off) continue;
    const c = asCircle(s);
    if (Math.hypot(to.x - c.x, to.z - c.z) <= c.r + 0.5 || Math.hypot(from.x - c.x, from.z - c.z) <= c.r) continue;
    const t = (c.x - from.x) * ux + (c.z - from.z) * uz;
    if (t <= 0 || t >= len) continue;
    const side = (c.x - from.x) * nx + (c.z - from.z) * nz;
    if (Math.abs(side) >= c.r) continue;
    if (!hit || t < hit.t) hit = { t, c, side };
  }
  if (!hit) return to;
  const sign = hit.side >= 0 ? -1 : 1, off = hit.c.r + pad;
  return { x: hit.c.x + nx * off * sign, z: hit.c.z + nz * off * sign };
}

export function freshBranchTab(ids, usable, habitatDone, bloomed) {
  return ids.find(id => usable(id) && !habitatDone(id))
    || ids.find(id => usable(id) && !bloomed(id))
    || null;
}

export function guideEventParams(flow, goal, act, extra = {}) {
  const p = { flow, goal, act };
  if (typeof extra.step === 'string') p.step = extra.step;
  if (Number.isFinite(extra.dist)) p.dist = Math.round(extra.dist);
  return p;
}

export function rearmMerchant(hints) {
  if (hints?.tutStep !== 'sell' || hints.merchantMet || !hints.merchantVisit) return hints;
  return { ...hints, merchantVisit: false };
}
