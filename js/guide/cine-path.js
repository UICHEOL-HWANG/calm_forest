import { ease, approachTime } from '../world/tree-shot.js';

export const SKIP_OUT = 0.45;

const mix = (o, a, b, k) => { o.x = a.x + (b.x - a.x) * k; o.y = a.y + (b.y - a.y) * k; o.z = a.z + (b.z - a.z) * k; };
const copy = f => ({ pos: { ...f.pos }, look: { ...f.look } });

export function hallFrame(target, center, { h, d, lookY = 0.9 }) {
  const dx = center.x - target.x, dz = center.z - target.z, n = Math.hypot(dx, dz) || 1;
  return { pos: { x: target.x + dx / n * d, y: h, z: target.z + dz / n * d }, look: { x: target.x, y: lookY, z: target.z } };
}

export function createCinePath({ from, frames, home, hold = 1.6, onShot }) {
  const cur = copy(from), seg = copy(from), hp = { x: 0, y: 0, z: 0 }, hl = { x: 0, y: 0, z: 0 };
  let phase = 'fly', index = 0, t = 0, dur = approachTime(from.pos, frames[0].pos), outDur = dur * 0.85;
  const startOut = d => { seg.pos = { ...cur.pos }; seg.look = { ...cur.look }; phase = 'out'; t = 0; outDur = d; };
  return {
    cur,
    get phase() { return phase; },
    get index() { return index; },
    skip() { if (phase !== 'out' && phase !== 'done') startOut(SKIP_OUT); },
    update(dt) {
      if (phase === 'done') return { phase, index };
      t += dt;
      if (phase === 'fly') {
        const k = ease(t / dur), to = frames[index];
        mix(cur.pos, seg.pos, to.pos, k); mix(cur.look, seg.look, to.look, k);
        if (t >= dur) { phase = 'hold'; t = 0; onShot?.(index); }
      } else if (phase === 'hold') {
        Object.assign(cur.pos, frames[index].pos); Object.assign(cur.look, frames[index].look);
        if (t >= hold) {
          if (index + 1 < frames.length) {
            seg.pos = { ...cur.pos }; seg.look = { ...cur.look };
            index++; phase = 'fly'; t = 0; dur = approachTime(seg.pos, frames[index].pos);
          } else startOut(dur * 0.85);
        }
      } else if (phase === 'out') {
        home(hp, hl);
        const k = ease(t / outDur);
        mix(cur.pos, seg.pos, hp, k); mix(cur.look, seg.look, hl, k);
        if (t >= outDur) phase = 'done';
      }
      return { phase, index };
    },
  };
}
