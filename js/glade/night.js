export const NIGHT_KINDS = Object.freeze(['plain', 'stream', 'mono', 'low']);
export const MONO_SHARE = 0.7;

const hash = (s) => {
  let h = [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  return h >>> 0;
};

export function nightKind(dateKey) {
  const r = hash('glade:' + dateKey) % 10;
  return r < 4 ? 'plain' : r < 6 ? 'stream' : r < 8 ? 'mono' : 'low';
}

export function monoKind(dateKey, openIds) {
  const pool = openIds.filter(id => id !== 'rainbow');
  return pool.length ? pool[hash('mono:' + dateKey) % pool.length] : null;
}

export function pickKindId(kind, monoId, rnd, fallback) {
  return kind === 'mono' && monoId && rnd() < MONO_SHARE ? monoId : fallback();
}

const BASE = Object.freeze({ respawn: 1, speed: 0.55, yMin: 0.9, yMax: 2.8, fleeDist: 1.5, dimChance: 0.35 });

export const TUNE = Object.freeze({
  plain: BASE,
  mono: BASE,
  stream: Object.freeze({ ...BASE, respawn: 0.5 }),
  low: Object.freeze({ ...BASE, speed: 0.3, yMin: 0.5, yMax: 1.1, fleeDist: 1.0, dimChance: 0.6 }),
});

export const streamPoint = (u, R) => ({ x: R * 0.68 * Math.sin(u), z: R * 0.4 * Math.sin(2 * u) });
