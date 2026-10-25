import { THEMES, ORE_ODDS, DELVE_HALF, VEINS_PER_FLOOR, PLAIN_ROCKS, LADDER_PITY, LADDER_MIN_FRAC, BURROW_MIN_FROM_ARRIVAL, DELVE_FLOORS, DELVE_STOPS, MINER_STEPS } from '../data/delve.js';

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function floorSeed(date, floor, visit) {
  return hashSeed(`delve:${date}:${floor}:${visit}`);
}

export function themeOf(floor) {
  return THEMES.find(t => floor >= t.from && floor <= t.to) || THEMES[0];
}

export function oreOdds(floor, weather) {
  const deep = floor > 10;
  const k = deep ? (floor - 11) / 9 : (floor - 1) / 9;
  const [g0, g1] = deep ? ORE_ODDS.deepGem : ORE_ODDS.shallowGem;
  const gem = deep || weather === 'fog' ? g0 + (g1 - g0) * k : 0;
  const crystal = deep ? ORE_ODDS.crystal : 0;
  const rest = 1 - gem - crystal;
  const coal = rest * (deep ? ORE_ODDS.coalShare.deep : ORE_ODDS.coalShare.shallow);
  return [['gem', gem], ['crystal', crystal], ['coal', coal], ['stone', rest - coal]];
}

export function rollOre(rng, odds) {
  let x = rng();
  for (const [id, p] of odds) { if ((x -= p) < 0) return id; }
  return 'stone';
}

export function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

const pick = (rng, lo, hi) => lo + rng() * (hi - lo);

function placeFree(rng, taken, ok, half, gap = 1.4, tries = 400) {
  const lim = half - 1;
  for (let i = 0; i < tries; i++) {
    const p = { x: +pick(rng, -lim, lim).toFixed(2), z: +pick(rng, -lim, lim).toFixed(2) };
    if (taken.every(t => dist(t, p) >= gap) && ok(p)) return p;
  }
  return null;
}

export function layoutFloor({ seed, floor, half = DELVE_HALF }) {
  const rng = makeRng(seed);
  const lim = half - 1;
  const arrival = { x: +pick(rng, -half / 2, half / 2).toFixed(2), z: -half + 1.5 };
  const minLadder = half * 2 * Math.SQRT2 * LADDER_MIN_FRAC;
  const ladderAt = placeFree(rng, [arrival], p => p.z > 0 && dist(p, arrival) >= minLadder, half) || { x: arrival.x <= 0 ? lim : -lim, z: lim };
  const rocks = [{ ...ladderAt, vein: false }];
  const away = p => dist(p, arrival) >= 2.5;
  for (let v = 0; v < VEINS_PER_FLOOR; v++) {
    const p = placeFree(rng, [arrival, ...rocks], away, half);
    if (p) rocks.push({ ...p, vein: true });
  }
  const plainN = PLAIN_ROCKS[0] + Math.floor(rng() * (PLAIN_ROCKS[1] - PLAIN_ROCKS[0] + 1));
  for (let i = 1; i < plainN; i++) {
    const p = placeFree(rng, [arrival, ...rocks], away, half);
    if (p) rocks.push({ ...p, vein: false });
  }
  const shuffled = rocks.map(r => ({ r, k: rng() })).sort((a, b) => a.k - b.k).map(o => o.r);
  const ladderRock = shuffled.findIndex(r => !r.vein && r.x === ladderAt.x && r.z === ladderAt.z);
  const theme = themeOf(floor);
  const pests = Array.from({ length: 1 + (rng() < 0.5 ? 1 : 0) }, () => theme.pests[Math.floor(rng() * theme.pests.length)]);
  const burrows = [], puddles = [];
  for (const p of pests) {
    const taken = [arrival, ...shuffled, ...burrows, ...puddles];
    if (p === 'axolotl') { const q = placeFree(rng, taken, () => true, half, 2.0); if (q) puddles.push(q); }
    const b = placeFree(rng, [...taken, ...puddles], q => dist(q, arrival) >= BURROW_MIN_FROM_ARRIVAL, half, 1.6) || { x: -ladderAt.x * 0.5, z: lim };
    burrows.push(b);
  }
  return { arrival, rocks: shuffled, ladderAt, ladderRock, burrows, puddles, pests };
}

export function ladderRevealed({ broken, hitLadderRock }) {
  return hitLadderRock || broken >= LADDER_PITY;
}

const COUNT_KEYS = ['tap', 'bait', 'grab', 'reclaim'];
const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };

export function defaultDelve() {
  return { maxFloor: 0, stops: [], stage: 0, counts: { tap: 0, bait: 0, grab: 0, reclaim: 0 }, chests: {}, visited: { date: null, floors: [] }, jobDate: null, started: false };
}

export function sanitizeDelve(raw) {
  const d = defaultDelve();
  if (!raw || typeof raw !== 'object') return d;
  d.maxFloor = int(raw.maxFloor, 0, DELVE_FLOORS);
  d.stops = DELVE_STOPS.filter(s => s <= d.maxFloor && Array.isArray(raw.stops) && raw.stops.includes(s));
  d.stage = int(raw.stage, 0, MINER_STEPS.length);
  for (const k of COUNT_KEYS) d.counts[k] = typeof raw.counts?.[k] === 'number' ? int(raw.counts[k], 0, 9999) : 0;
  for (const f of [10, 20]) if (raw.chests?.[f] === true) d.chests[f] = true;
  if (typeof raw.visited?.date === 'string') d.visited = { date: raw.visited.date, floors: Array.isArray(raw.visited.floors) ? raw.visited.floors.filter(f => Number.isInteger(f) && f >= 1 && f <= DELVE_FLOORS) : [] };
  d.jobDate = typeof raw.jobDate === 'string' ? raw.jobDate : null;
  d.started = !!raw.started;
  return d;
}

export function noteReach(d, floor) {
  const maxFloor = Math.max(d.maxFloor, floor);
  return { ...d, maxFloor, stops: DELVE_STOPS.filter(s => s <= maxFloor) };
}

export function stopsOpen(d) { return DELVE_STOPS.filter(s => s <= d.maxFloor); }

export function oreAllowed(d, date, floor) {
  return d.visited.date !== date || !d.visited.floors.includes(floor);
}

export function markOreFloor(d, date, floor) {
  const floors = d.visited.date === date ? d.visited.floors : [];
  return floors.includes(floor) ? d : { ...d, visited: { date, floors: [...floors, floor] } };
}

export function bumpCount(d, key, n = 1) {
  return { ...d, counts: { ...d.counts, [key]: d.counts[key] + n } };
}

export function noteChest(d, floor) { return { ...d, chests: { ...d.chests, [floor]: true } }; }

export function canDescendFrom0(d) { return d.stage >= 1; }

function progressOf(step, d, inv) {
  const c = step.check;
  if (c.kind === 'inv') return Math.min(c.n, inv[c.key] || 0);
  if (c.kind === 'count') return Math.min(c.n, d.counts[c.key]);
  if (c.kind === 'floor') return Math.min(c.n, d.maxFloor);
  return d.chests[c.n] ? 1 : 0;
}

const targetOf = step => (step.check.kind === 'chest' ? 1 : step.check.n);

export function stepView(d, inv) {
  if (!d.started || d.stage >= MINER_STEPS.length) return null;
  const step = MINER_STEPS[d.stage];
  const progress = progressOf(step, d, inv), target = targetOf(step);
  return { index: d.stage, id: step.id, title: step.title, desc: step.desc, progress, target, ready: progress >= target };
}

export function claimStep(d, inv) {
  const v = stepView(d, inv);
  if (!v || !v.ready) return null;
  const step = MINER_STEPS[d.stage];
  const next = { ...inv };
  if (step.check.kind === 'inv' && step.check.take) next[step.check.key] = (next[step.check.key] || 0) - step.check.n;
  for (const k of ['gem', 'forage', 'crystal']) if (step.reward[k]) next[k] = (next[k] || 0) + step.reward[k];
  return { delve: { ...d, stage: d.stage + 1 }, inv: next, reward: step.reward, stepId: step.id };
}

export function jobFor(date) {
  const r = makeRng(hashSeed(`delvejob:${date}`));
  return r() < 0.7 ? { kind: 'ore', n: 3 + Math.floor(r() * 4), floorMin: 5 + Math.floor(r() * 3) * 5 } : { kind: 'reclaim', n: 2, floorMin: 11 };
}
