import { THEMES, ORE_ODDS } from '../data/delve.js';

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
