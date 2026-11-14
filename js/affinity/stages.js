import { HIDDEN_AFFINITY } from '../tool-blueprints.js';

export const STAGES = Object.freeze([
  Object.freeze({ id: 'acq', min: 1, ico: '👋', name: '아는 사이', letter: false }),
  Object.freeze({ id: 'nbr', min: 3, ico: '🏡', name: '이웃', letter: true }),
  Object.freeze({ id: 'friend', min: HIDDEN_AFFINITY, ico: '🤝', name: '친구', letter: true }),
  Object.freeze({ id: 'best', min: 10, ico: '💛', name: '단짝', letter: true }),
  Object.freeze({ id: 'family', min: 15, ico: '🌳', name: '가족', letter: true }),
]);

export const AFFINITY_NPCS = Object.freeze([
  'farmer', 'builder', 'merchant', 'angler', 'chef', 'forager',
  'stargazer', 'ferryman', 'rancher', 'curator', 'courier',
]);

export const GIFT_DAILY_CAP = 2;
export const LETTER_MAX_STAGE = 4;

export const isAffinityNpc = (id) => AFFINITY_NPCS.includes(id);

const asCount = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

export function stageIndex(n) {
  const v = asCount(n);
  let idx = -1;
  STAGES.forEach((s, i) => { if (v >= s.min) idx = i; });
  return idx;
}

export function stageProgress(n) {
  const value = asCount(n);
  const idx = stageIndex(value);
  const next = STAGES[idx + 1]?.min ?? null;
  return { idx, value, next };
}

export function lettersToIssue(affinity, issued, maxIdx = LETTER_MAX_STAGE) {
  const out = [];
  for (const [npc, n] of Object.entries(affinity || {})) {
    if (!isAffinityNpc(npc)) continue;
    const cur = Math.min(stageIndex(n), maxIdx);
    const done = Number.isInteger(issued?.[npc]) ? issued[npc] : 0;
    for (let idx = done + 1; idx <= cur; idx++) if (STAGES[idx].letter) out.push({ npc, idx });
  }
  return out;
}

export function markIssued(issued, letters) {
  const next = { ...(issued || {}) };
  for (const { npc, idx } of letters) next[npc] = Math.max(next[npc] ?? 0, idx);
  return next;
}

export const letterKey = (npc, idx) => `${npc}:${STAGES[idx].min}`;

export function giftGain(state, today, npc, love) {
  const fresh = state && typeof state === 'object' && state.d === today && state.by && typeof state.by === 'object';
  const by = fresh ? state.by : {};
  const used = asCount(by[npc]);
  const gain = Math.max(0, Math.min(asCount(love), GIFT_DAILY_CAP - used));
  return { gain, state: { d: today, by: { ...by, [npc]: used + gain } } };
}

export function owlDailyGain(lastDay, today) {
  return { gain: lastDay === today ? 0 : 1, day: today };
}

export function allMaxed(affinity, visibleIds) {
  const top = STAGES[STAGES.length - 1].min;
  return visibleIds.length > 0 && visibleIds.every(id => (affinity?.[id] || 0) >= top);
}

export function pickTracker(affinity, visibleIds) {
  let best = null;
  for (const npc of visibleIds) {
    if (!isAffinityNpc(npc)) continue;
    const { idx, value, next } = stageProgress(affinity?.[npc]);
    if (idx < 0 || !next) continue;
    const left = next - value;
    if (!best || left < best.next - best.value || (left === best.next - best.value && value > best.value)) best = { npc, value, next };
  }
  return best;
}
