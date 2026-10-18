import { DECOR_SETS } from '../data/decor-sets.js';

export const SET_OF = Object.fromEntries(DECOR_SETS.flatMap(s => [...s.items, s.bonus].map(id => [id, s.id])));

const frac = (v) => v - Math.floor(v);

export function pose(u, t, on) {
  switch (u.anim) {
    case 'spin': return { rot: { [u.axis]: on ? t * u.speed : 0 } };
    case 'sway': return { rot: { [u.axis]: on ? Math.sin(t * u.speed) * u.amp : 0 } };
    case 'flame': return { scaleY: on ? 0.85 + u.amp * Math.sin(t * u.speed) : 1 };
    case 'bob': return on
      ? { y: Math.sin(t * u.speed) * u.amp, rot: { z: Math.sin(t * u.speed * 0.75) * u.roll } }
      : { y: 0, rot: { z: 0 } };
    case 'steam': return { visible: on };
    default: return {};
  }
}

export function swarmAt(u, p, t, on) {
  if (!on) return { x: p.x, y: p.y, z: p.z, s: 1 };
  if (u.anim === 'snow') {
    const k = frac(t * p.sp + p.ph);
    return { x: p.x + Math.sin(t + p.ph * 6) * 0.04, y: u.top - k * u.fall, z: p.z, s: 1 };
  }
  if (u.anim === 'fireflies') {
    const a = t * 1.1 + p.ph;
    return { x: Math.sin(a) * 0.11, y: 0.2 + Math.sin(t * 1.7 + p.ph * 2) * 0.1, z: Math.cos(a) * 0.11, s: 0.75 + 0.25 * Math.sin(t * 4 + p.ph) };
  }
  if (u.anim === 'glint') return { x: p.x, y: p.y, z: p.z, s: Math.max(0, Math.sin(t * u.speed + p.ph)) };
  return { x: p.x, y: p.y, z: p.z, s: 1 };
}

export function puffAt(pu, u, t) {
  const k = frac(t * u.speed + pu.phase + pu.i / 3);
  return {
    x: pu.base[0] + Math.sin(k * 6 + pu.i) * 0.05,
    y: pu.base[1] + k * u.rise,
    z: pu.base[2],
    scale: 0.7 + k * 1.2,
    opacity: 0.55 * (1 - k),
  };
}
