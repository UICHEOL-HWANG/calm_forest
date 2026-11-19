import { ease } from './tree-shot.js';

export const FINALE_T = { fly: 1.2, root: 6, bloom: 3, out: 0.9 };
const U0 = 0.04, U1 = 0.9, AHEAD = 0.15;

export function rootPoints(tree, gate, n = 9) {
  const z0 = tree.z + 2.6, out = [];
  for (let i = 0; i <= n; i++) {
    const k = 1 - i / n;
    const wig = Math.sin(k * 7) * 2.2 * (1 - Math.abs(k - 0.5) * 1.4) * (i === 0 || i === n ? 0 : 1);
    out.push({ x: tree.x + (gate.x - tree.x) * k + wig, y: 0.08, z: z0 + (gate.z - z0) * k });
  }
  return out;
}

export function pointAt(pts, k) {
  const c = Math.min(1, Math.max(0, k));
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); seg.push(d); total += d; }
  let want = c * total;
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(1, want / seg[i]) : 0, a = pts[i], b = pts[i + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f };
    }
    want -= seg[i];
  }
  return { ...pts[pts.length - 1] };
}

const mix = (o, a, b, k) => { o.x = a.x + (b.x - a.x) * k; o.y = a.y + (b.y - a.y) * k; o.z = a.z + (b.z - a.z) * k; };

export function createFinaleRig({ from, pts, tree, aspect, home }) {
  const far = aspect < 0.8 ? 1.8 : 1;
  const along = (u) => {
    const p = pointAt(pts, u), q = pointAt(pts, Math.min(1, u + 0.18));
    return { pos: { x: p.x + 2, y: 5.5, z: p.z + 7 * far }, look: { x: q.x, y: 2.5, z: q.z } };
  };
  const top = { pos: { x: tree.x, y: 6, z: tree.z + 22 * far }, look: { x: tree.x, y: 7, z: tree.z } };
  const start = along(U0);
  const cur = { pos: { ...from.pos }, look: { ...from.look } };
  const outFrom = { pos: {}, look: {} }, hp = { x: 0, y: 0, z: 0 }, hl = { x: 0, y: 0, z: 0 };
  let phase = 'fly', t = 0, reveal = 0, bloom = 0;
  const setCur = (f) => { cur.pos = { ...f.pos }; cur.look = { ...f.look }; };
  return {
    get phase() { return phase; },
    get cur() { return cur; },
    get reveal() { return reveal; },
    get bloom() { return bloom; },
    get caption() { return phase === 'root'; },
    skip() {
      if (phase !== 'fly' && phase !== 'root' && phase !== 'bloom') return;
      reveal = 1; bloom = 1; setCur(top); phase = 'card';
    },
    close() {
      if (phase !== 'card') return;
      outFrom.pos = { ...cur.pos }; outFrom.look = { ...cur.look }; phase = 'out'; t = 0;
    },
    update(dt) {
      if (phase === 'done' || phase === 'card') return phase;
      t += dt;
      if (phase === 'fly') {
        const k = ease(t / FINALE_T.fly);
        mix(cur.pos, from.pos, start.pos, k); mix(cur.look, from.look, start.look, k);
        reveal = Math.max(reveal, Math.min(1, U0 + AHEAD) * k);
        if (t >= FINALE_T.fly) { phase = 'root'; t = 0; }
      } else if (phase === 'root') {
        const u = U0 + (U1 - U0) * ease(t / FINALE_T.root);
        setCur(along(u));
        reveal = Math.max(reveal, Math.min(1, u + AHEAD));
        if (t >= FINALE_T.root) { phase = 'bloom'; t = 0; reveal = 1; }
      } else if (phase === 'bloom') {
        const k = ease(t / FINALE_T.bloom), a = along(U1);
        mix(cur.pos, a.pos, top.pos, Math.min(1, k * 1.6)); mix(cur.look, a.look, top.look, Math.min(1, k * 1.6));
        bloom = Math.max(bloom, k);
        if (t >= FINALE_T.bloom) { bloom = 1; setCur(top); phase = 'card'; }
      } else if (phase === 'out') {
        home(hp, hl);
        const k = ease(t / FINALE_T.out);
        mix(cur.pos, outFrom.pos, hp, k); mix(cur.look, outFrom.look, hl, k);
        if (t >= FINALE_T.out) { cur.pos = { ...hp }; cur.look = { ...hl }; phase = 'done'; }
      }
      return phase;
    },
  };
}
