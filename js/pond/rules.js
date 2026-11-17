export const POND_MAX_RIVER = 7;
export const POND_SEA_SCALE = 1.5;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function pondFish(dexFish, riverIds) {
  const dex = obj(dexFish);
  return riverIds
    .map((id, i) => ({ id, i, t: dex[id] }))
    .filter(e => isNum(e.t))
    .sort((a, b) => (a.t - b.t) || (a.i - b.i))
    .slice(0, POND_MAX_RIVER)
    .map(e => e.id);
}

export function pondSea(seaBest, seaIds) {
  const best = obj(seaBest);
  let out = null;
  for (const sp of seaIds) {
    const w = best[sp];
    if (!isNum(w) || w <= 0) continue;
    if (!out || w > out.w) out = { sp, w };
  }
  return out;
}

export function pondSeas(seaBest, seaIds, max = 1) {
  const best = obj(seaBest);
  return seaIds
    .map((sp, i) => ({ sp, w: best[sp], i }))
    .filter(e => isNum(e.w) && e.w > 0)
    .sort((a, b) => (b.w - a.w) || (a.i - b.i))
    .slice(0, Math.max(1, max))
    .map(({ sp, w }) => ({ sp, w }));
}

export function pondView({ dexFish, seaBest } = {}, { riverIds, seaIds }, limits) {
  const fish = pondFish(dexFish, riverIds);
  const seas = pondSeas(seaBest, seaIds, limits?.seaMax);
  const sea = seas[0] ?? null;
  return { fish, sea, seas, has: fish.length > 0 || !!sea };
}

export function pondChanges(prev, next) {
  if (!next?.has) return [];
  if (!prev?.has) return [{ type: 'created', species: next.fish[0] ?? next.sea.sp }];
  const out = next.fish.filter(id => !prev.fish.includes(id)).map(species => ({ type: 'fish', species }));
  if (next.sea && (!prev.sea || next.sea.sp !== prev.sea.sp || next.sea.w > prev.sea.w)) out.push({ type: 'sea', species: next.sea.sp });
  return out;
}

export function pickPondSpot(spots, outdoorRel, r) {
  const items = Array.isArray(outdoorRel) ? outdoorRel : [];
  return spots.find(s => items.every(o => Math.hypot(o.dx - s.dx, o.dz - s.dz) >= r + 0.6)) ?? null;
}

export function pondBlocks(spots, house, x, z, r, pad = 0) {
  return spots.some(s => Math.hypot(house.x + s.dx - x, house.z + s.dz - z) < r + 0.6 + pad);
}

export const POND_TOAST_DELAY = 4;

export function pondToastDue({ pending, seen, inVillage, waitedSec }) {
  return !!pending && !seen && !!inVillage && waitedSec >= POND_TOAST_DELAY;
}

export function shouldTrackCreated(trigger, seen) {
  return trigger !== 'load' || !seen;
}
