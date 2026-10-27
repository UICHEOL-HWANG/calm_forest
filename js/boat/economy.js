import { BOATS, MAT_IDS, LIVE_PHASE } from './boats.js';

export const needValue = (key, st) => (key === 'clears' ? st.clears || 0 : (st.stat && st.stat[key]) || 0);

export function unlockCheck(id, st, inv) {
  const b = BOATS[id];
  const owned = !!(st.own && st.own[id]);
  const live = !!b && b.phase <= LIVE_PHASE;
  if (!b || !b.unlock || owned) return { owned, live, ok: false, lacks: [] };
  const u = b.unlock, lacks = [];
  const push = (key, have, need) => { if (have < need) lacks.push({ key, have, need }); };
  push('star', inv.star || 0, u.star);
  push('coins', inv.coins || 0, u.coins);
  for (const m in u.mat) push(`mat:${m}`, (st.mat && st.mat[m]) || 0, u.mat[m]);
  for (const k in u.need) push(`need:${k}`, needValue(k, st), u.need[k]);
  return { owned, live, ok: live && lacks.length === 0, lacks };
}

export function unlockBoat(id, st, inv) {
  const check = unlockCheck(id, st, inv);
  if (!check.ok) return { ok: false, check };
  const u = BOATS[id].unlock;
  const mat = { ...st.mat };
  for (const m in u.mat) mat[m] -= u.mat[m];
  return {
    ok: true,
    st: { ...st, mat, own: { ...st.own, [id]: 1 } },
    inv: { ...inv, star: (inv.star || 0) - u.star, coins: (inv.coins || 0) - u.coins },
    spentCoins: u.coins,
  };
}

export function addRunMats(st, picks, mult) {
  const mat = { ...st.mat };
  for (const id of MAT_IDS) if (picks && picks[id]) mat[id] = (mat[id] || 0) + Math.floor(picks[id] * mult + 0.5);
  return { ...st, mat };
}
