export const FLY_TIME = 2.4;
export const LAND_HOLD = 3.2;
export const LAND_BLEND = 0.7;
export const OUT_TIME = 1.3;
export const SKIP_OUT_TIME = 0.45;
export const ORB_LIFT = 9;

export const REGIONS = {
  'water:habitat':   { id: 'dock',    npc: 'angler', place: 'river',   at: { x: 0, z: -15 },      fx: 'water',   sub: '💧 물의 가지',   main: '나루터에 물이 다시 흘러요' },
  'water:bundles':   { id: 'sea',     npc: 'ferryman', place: 'sea',     at: { x: 14.5, z: -12.5 }, fx: 'water',   sub: '💧 물의 가지',   main: '바다로 가는 길이 열렸어요' },
  'farm:habitat':    { id: 'coop',    npc: 'farmer', place: 'coop',    at: { x: -4.5, z: 11.5 },  fx: 'farm',    sub: '🌾 밭의 가지',   main: '닭장에 다시 활기가 돌아요' },
  'kitchen:habitat': { id: 'kitchen', npc: 'chef', place: 'kitchen', at: { x: 7.4, z: -6.4 },   fx: 'kitchen', sub: '🍳 부엌의 가지', main: '부엌에 불이 켜졌어요' },
  'forest:habitat':  { id: 'forest',  npc: 'forager', place: 'forest',  at: { x: -18, z: 23 },     fx: 'forest',  sub: '🌲 숲의 가지',   main: '숲길이 다시 열렸어요' },
  'snow:habitat':    { id: 'snowpeak', npc: null, place: null,     at: { x: -15, z: -29.5 },   fx: 'snow',    sub: '❄️ 눈의 가지',   main: '정상 산장에 불이 켜졌어요' },
  'mine:habitat':    { id: 'mine',    npc: 'miner', place: null,      at: { x: -14, z: 3 },      fx: 'mine',    sub: '⛏️ 광산의 가지', main: '동굴에 빛이 돌아왔어요' },
};

export function regionFor(branch, kind) {
  return REGIONS[`${branch}:${kind}`] || null;
}

const ease = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * x * (x * (x * 6 - 15) + 10); };
const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });

export function orbPoint(a, b, k, lift = ORB_LIFT) {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + lift, z: (a.z + b.z) / 2 };
  const u = 1 - k;
  return {
    x: u * u * a.x + 2 * u * k * m.x + k * k * b.x,
    y: u * u * a.y + 2 * u * k * m.y + k * k * b.y,
    z: u * u * a.z + 2 * u * k * m.z + k * k * b.z,
  };
}

export function regionFrame(at, aspect) {
  const [h, d] = (aspect || 1) < 0.8 ? [14, 18] : [10, 13];
  return { pos: { x: at.x, y: h, z: at.z + d }, look: { x: at.x, y: 1.2, z: at.z } };
}

const orbit = (frame, at, ang) => {
  const ox = frame.pos.x - at.x, oz = frame.pos.z - at.z, c = Math.cos(ang), s = Math.sin(ang);
  return { pos: { x: at.x + ox * c - oz * s, y: frame.pos.y, z: at.z + ox * s + oz * c }, look: { ...frame.look } };
};

export function createRegionRig({ from, tip, at, aspect, home, onLand, hold = LAND_HOLD }) {
  const land = { x: at.x, y: 1.4, z: at.z };
  const frame = regionFrame(at, aspect);
  const high = { x: frame.pos.x, y: frame.pos.y + 6, z: frame.pos.z + 6 };
  const start = { pos: { ...from.pos }, look: { ...from.look } };
  const cur = { pos: { ...from.pos }, look: { ...from.look } };
  const orb = { x: tip.x, y: tip.y, z: tip.z, visible: true };
  const outFrom = { pos: { ...cur.pos }, look: { ...cur.look } };
  const hp = { x: 0, y: 0, z: 0 }, hl = { x: 0, y: 0, z: 0 };
  let phase = 'fly', t = 0, outDur = OUT_TIME, landed = false, landFrom = null;
  const fireLand = () => { if (!landed) { landed = true; orb.visible = false; onLand?.(); } };
  const toOut = (dur) => { outFrom.pos = { ...cur.pos }; outFrom.look = { ...cur.look }; phase = 'out'; t = 0; outDur = dur; };
  const set = (p) => { cur.pos = p.pos; cur.look = p.look; };
  return {
    get phase() { return phase; },
    cur, orb,
    skip() {
      if (phase === 'out' || phase === 'done') return;
      fireLand();
      toOut(SKIP_OUT_TIME);
    },
    update(dt) {
      if (phase === 'done') return phase;
      t += dt;
      if (phase === 'fly') {
        const k = ease(t / FLY_TIME), o = orbPoint(tip, land, k);
        Object.assign(orb, o);
        set({ pos: mix(start.pos, high, k), look: mix(start.look, mix(o, land, 0.25), Math.min(1, k * 2)) });
        if (t >= FLY_TIME) { t -= FLY_TIME; phase = 'land'; landFrom = { pos: { ...cur.pos }, look: { ...cur.look } }; fireLand(); }
      }
      if (phase === 'land') {
        const o = orbit(frame, at, (t / hold - 0.5) * 0.35), b = ease(t / LAND_BLEND);
        set({ pos: mix(landFrom.pos, o.pos, b), look: mix(landFrom.look, o.look, b) });
        if (t >= hold) toOut(OUT_TIME);
      }
      if (phase === 'out') {
        home(hp, hl);
        const k = ease(t / outDur);
        set({ pos: mix(outFrom.pos, hp, k), look: mix(outFrom.look, hl, k) });
        if (t >= outDur) phase = 'done';
      }
      return phase;
    },
  };
}
