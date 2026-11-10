import { refundOf } from './hammer.js';

export const STAR_TOOLS = Object.freeze(['rod', 'water', 'pot', 'net', 'hammer']);
export const MAX_STAR = 3;
export const MAX_SCORE = 10;

export const STAR_EFFECT = Object.freeze({
  rod: Object.freeze([2.6, 3.0, 3.4, 3.8]),
  water: Object.freeze([1.75, 2.0, 2.25, 2.5]),
  pot: Object.freeze([1.5, 1.65, 1.8, 2.0]),
  net: Object.freeze([0.18, 0.24, 0.30, 0.36]),
  hammer: Object.freeze([0.7, 0.65, 0.6, 0.55]),
});

export const TOOL_MAT = Object.freeze({ rod: 'fish', water: 'crop', pot: 'coal', net: 'bug', hammer: 'coal' });

const STAR_BASE = Object.freeze([
  Object.freeze({ coins: 120, wood: 10 }),
  Object.freeze({ coins: 240, stone: 10 }),
  Object.freeze({ coins: 400, gem: 1 }),
]);
const MAT_COUNT = Object.freeze([4, 8, 12]);
const NET_MAT_COUNT = Object.freeze([2, 4, 6]);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const isTool = tool => STAR_TOOLS.includes(tool);
const clampStar = v => Math.max(0, Math.min(MAX_STAR, Math.floor(Number(v) || 0)));

export function defaultToolStars() {
  return Object.fromEntries(STAR_TOOLS.map(t => [t, 0]));
}

export function starCost(tool, star) {
  if (!isTool(tool) || !Number.isInteger(star) || star < 1 || star > MAX_STAR) return null;
  const n = (tool === 'net' ? NET_MAT_COUNT : MAT_COUNT)[star - 1];
  return { ...STAR_BASE[star - 1], [TOOL_MAT[tool]]: n };
}

export function starOf(state = {}, tool) {
  if (!isTool(tool) || !state.upgrades?.[tool]) return 0;
  const raw = state.toolStars?.[tool];
  return typeof raw === 'number' ? clampStar(raw) : 0;
}

export function effectOf(tool, star) {
  return isTool(tool) ? STAR_EFFECT[tool][clampStar(star)] : null;
}

export function rodBiteSec(state = {}) { return effectOf('rod', starOf(state, 'rod')); }

export function waterMult(star = 0) { return effectOf('water', star); }

export function potMult(state = {}) { return state.upgrades?.pot ? effectOf('pot', starOf(state, 'pot')) : 1; }

export function netBonus(state = {}) { return state.upgrades?.net ? effectOf('net', starOf(state, 'net')) : 0; }

export function hammerRate(state = {}) { return state.upgrades?.hammer ? effectOf('hammer', starOf(state, 'hammer')) : 1; }

export function forgeCheck(state = {}, tool) {
  if (!isTool(tool)) return { state: 'unknown' };
  if (!state.upgrades?.[tool]) return { state: 'noTool' };
  const star = starOf(state, tool);
  const forge = state.forge;
  if (forge && forge.tool === tool) return { state: 'pending', star, next: forge.star };
  if (star >= MAX_STAR) return { state: 'max', star };
  const next = star + 1;
  const cost = starCost(tool, next);
  if (forge) return { state: 'busy', star, next, cost, busyTool: forge.tool };
  const inv = state.inventory || {};
  const missing = Object.keys(cost).filter(k => (inv[k] || 0) < cost[k]);
  return { state: missing.length ? 'short' : 'ready', star, next, cost, missing };
}

export function forgeStart(state = {}, tool, day) {
  const chk = forgeCheck(state, tool);
  if (chk.state !== 'ready' || !DAY_RE.test(day || '')) return null;
  const inventory = { ...state.inventory };
  for (const k of Object.keys(chk.cost)) inventory[k] = (inventory[k] || 0) - chk.cost[k];
  return { inventory, forge: { tool, star: chk.next, day, coins: chk.cost.coins, score: null } };
}

export function forgeCancel(state = {}) {
  const f = state.forge;
  if (!f || f.score !== null) return null;
  const cost = starCost(f.tool, f.star);
  if (!cost) return null;
  const inventory = { ...state.inventory };
  for (const k of Object.keys(cost)) inventory[k] = (inventory[k] || 0) + cost[k];
  return { inventory, forge: null };
}

export function forgeScore(state = {}, score) {
  const f = state.forge;
  if (!f || f.score !== null) return null;
  const s = Math.max(0, Math.min(MAX_SCORE, Math.floor(Number(score) || 0)));
  const refund = refundOf(f.coins, s);
  const inventory = { ...state.inventory, coins: (state.inventory?.coins || 0) + refund };
  return { inventory, forge: { ...f, score: s }, refund };
}

export function forgeReady(forge, today, slept = false) {
  if (!forge || forge.score === null || forge.score === undefined) return false;
  return !!slept || (typeof today === 'string' && forge.day < today);
}

export function forgeComplete(state = {}, today, slept = false) {
  const f = state.forge;
  if (!forgeReady(f, today, slept)) return null;
  const prev = { ...defaultToolStars(), ...(state.toolStars || {}) };
  const toolStars = { ...prev, [f.tool]: Math.max(f.star, prev[f.tool] || 0) };
  return { toolStars, forge: null, done: { tool: f.tool, star: f.star } };
}

export function restoreToolStars(saved) {
  const out = defaultToolStars();
  if (!saved || typeof saved !== 'object') return out;
  for (const t of STAR_TOOLS) if (typeof saved[t] === 'number' && Number.isFinite(saved[t])) out[t] = clampStar(saved[t]);
  return out;
}

export function restoreForge(saved, stars = defaultToolStars()) {
  if (!saved || typeof saved !== 'object' || !isTool(saved.tool)) return null;
  if (!Number.isInteger(saved.star) || saved.star !== (stars[saved.tool] || 0) + 1) return null;
  if (typeof saved.day !== 'string' || !DAY_RE.test(saved.day)) return null;
  const cost = starCost(saved.tool, saved.star);
  const coins = Number.isFinite(saved.coins) ? Math.max(0, Math.floor(saved.coins)) : cost.coins;
  const score = Number.isFinite(saved.score) ? Math.max(0, Math.min(MAX_SCORE, Math.floor(saved.score))) : 0;
  return { tool: saved.tool, star: saved.star, day: saved.day, coins, score };
}
