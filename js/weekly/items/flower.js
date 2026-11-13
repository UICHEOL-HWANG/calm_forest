import { PAL, kit, lantern, lump } from './kit.js';

function petalGeo(T, r, n = 5) {
  const s = new T.Shape(), N = n * 3;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, rr = r * (i % 3 === 0 ? 0.42 : 1);
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new T.ExtrudeGeometry(s, { depth: r * 0.22, bevelEnabled: false });
  g.deleteAttribute('uv');
  return g.translate(0, 0, -r * 0.11).rotateX(-Math.PI / 2);
}

function flower(k, p, r, color, rot = [0, 0, 0], eye = PAL.gold, bucket = 'fine', post = (g) => g) {
  const { T, add, xf, cyl } = k;
  add(bucket, color, post(xf(petalGeo(T, r), p, rot)));
  add('fine', eye, post(xf(xf(cyl(r * 0.3, r * 0.36, r * 0.26, 6), [0, r * 0.14, 0]), p, rot)));
}

const eyeOf = (c) => (c === PAL.gold ? PAL.woodDark : PAL.gold);

function spokedWheel(k, x, y, z, r, spokes) {
  const { T, add, xf, ball, rod } = k;
  const sz = Math.sign(z) || 1;
  add('body', PAL.woodDark, xf(new T.TorusGeometry(r - 0.03, 0.035, 5, 18), [x, y, z]));
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    add('body', PAL.wood, rod([x, y, z], [x + Math.cos(a) * (r - 0.04), y + Math.sin(a) * (r - 0.04), z], 0.018, 0.018, 4));
  }
  add('body', PAL.cream, xf(ball(0.05, 0), [x, y, z + sz * 0.035]));
}

function pail(k) {
  const { T, add, xf, lathe, cyl } = k;
  const S = (g) => xf(g, [0, -0.004, 0]);
  add('body', PAL.tin, S(lathe([[0, 0], [0.13, 0], [0.17, 0.24], [0.158, 0.24], [0.12, 0.014], [0, 0.014]], 14)));
  add('body', PAL.tinDark, S(xf(new T.TorusGeometry(0.166, 0.012, 4, 16), [0, 0.24, 0], [Math.PI / 2, 0, 0])));
  for (const y of [0.07, 0.17]) add('fine', PAL.tinDark, S(xf(new T.TorusGeometry(0.13 + (0.04 * y) / 0.24 + 0.005, 0.008, 4, 16), [0, y, 0], [Math.PI / 2, 0, 0])));
  for (const sx of [-1, 1]) add('fine', PAL.tinDark, S(xf(cyl(0.022, 0.022, 0.02, 6), [sx * 0.166, 0.205, 0], [0, 0, Math.PI / 2])));
  add('fine', PAL.tinDark, S(xf(new T.TorusGeometry(0.178, 0.009, 4, 14, Math.PI), [0, 0.205, 0], [-0.95, 0, 0])));
}

function bow(k, x, y, z, s, color, post) {
  const { add, xf, ball, rod } = k;
  add('fine', color, post(xf(ball(0.026 * s, 0), [x, y, z])));
  for (const sx of [-1, 1]) add('fine', color, post(xf(ball(0.04 * s, 0), [x + sx * 0.05 * s, y + 0.012 * s, z], [0, 0, sx * 0.4], [1.5, 0.85, 0.55])));
  for (const sx of [-1, 1]) add('fine', color, post(rod([x, y - 0.01 * s, z], [x + sx * 0.035 * s, y - 0.085 * s, z], 0.012 * s, 0.016 * s, 4)));
}

function flowercart(T) {
  const k = kit(T);
  const { add, xf, box, rod, ball } = k;
  add('body', PAL.cream, xf(box(1.16, 0.28, 0.72), [0, 0.61, 0]));
  add('body', PAL.rose, xf(box(1.18, 0.07, 0.74), [0, 0.62, 0]));
  add('body', PAL.woodDark, xf(box(1.2, 0.05, 0.76), [0, 0.47, 0]));
  add('body', PAL.woodDark, xf(box(0.14, 0.14, 0.7), [0.05, 0.4, 0]));
  for (const sz of [-1, 1]) spokedWheel(k, 0.05, 0.355, sz * 0.43, 0.36, 6);
  for (const sz of [-1, 1]) {
    add('body', PAL.wood, rod([-0.5, 0.56, sz * 0.27], [-1.2, 0.8, sz * 0.27], 0.03));
    add('body', PAL.woodDark, rod([0.5, 0.48, sz * 0.25], [0.55, -0.005, sz * 0.25], 0.025));
  }
  add('body', PAL.wood, rod([-1.2, 0.8, -0.3], [-1.2, 0.8, 0.3], 0.03));
  add('body', PAL.green, xf(lump(T, 0.5, [1.1, 0.22, 0.66], 0.5, 1), [0, 0.74, 0]));
  const hy = (x, z) => 0.736 + 0.11 * (0.5 + Math.sqrt(Math.max(0, 1 - (x / 0.55) ** 2 - (z / 0.33) ** 2)));
  const top = [
    [-0.38, 0.14, PAL.rose], [-0.12, 0.19, PAL.gold], [0.14, 0.18, PAL.cream], [0.38, 0.12, PAL.red],
    [-0.27, -0.06, PAL.lilac], [0.0, -0.01, PAL.rose], [0.26, -0.05, PAL.lilac], [-0.42, -0.14, PAL.cream], [0.42, -0.15, PAL.gold],
  ];
  for (const [x, z, c] of top) flower(k, [x, hy(x, z) + 0.01, z], 0.12, c, [z * 1.6, 0, -x * 0.7], eyeOf(c), 'body');
  const R = 0.56, cz = -0.2, cy = 0.76;
  add('body', PAL.woodDark, xf(new T.TorusGeometry(R, 0.03, 5, 18, Math.PI), [0, cy, cz]));
  const arch = [PAL.rose, PAL.cream, PAL.lilac, PAL.gold, PAL.rose, PAL.cream, PAL.lilac];
  const span = Math.PI - 0.48;
  arch.forEach((c, i) => {
    const t = 0.24 + (i / (arch.length - 1)) * span;
    flower(k, [Math.cos(t) * R, cy + Math.sin(t) * R, cz + 0.04], 0.11, c, [1.05, 0, 0], eyeOf(c), 'body');
    if (i < arch.length - 1) {
      const u = t + span / (arch.length - 1) / 2;
      add('body', PAL.green, xf(ball(0.06, 0), [Math.cos(u) * R, cy + Math.sin(u) * R, cz], [0, 0, 0], [1, 0.8, 1.2]));
    }
  });
  add('fine', PAL.woodDark, rod([Math.cos(0.35) * R, cy + Math.sin(0.35) * R, cz], [0.8, cy + Math.sin(0.35) * R, cz], 0.016, 0.016, 4));
  lantern(k, 0.8, 0.72, cz, 0.22);
  return k.finish('flowercart');
}

function flowerpail(T) {
  const k = kit(T);
  const { add, xf } = k;
  pail(k);
  add('body', PAL.green, xf(lump(T, 0.13, [1.15, 0.5, 1.15], 0.5, 0), [0, 0.215, 0]));
  const ring = [PAL.rose, PAL.gold, PAL.cream, PAL.lilac, PAL.red];
  ring.forEach((c, i) => {
    const a = (i / ring.length) * Math.PI * 2 + 0.3;
    flower(k, [Math.cos(a) * 0.1, 0.285, Math.sin(a) * 0.1], 0.08, c, [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], eyeOf(c), 'body');
  });
  flower(k, [0, 0.33, 0.01], 0.085, PAL.rose, [0.2, 0, 0], PAL.gold, 'body');
  return k.finish('flowerpail');
}

function driedflowers(T) {
  const k = kit(T);
  const { add, xf, rod, ball, box } = k;
  for (const sx of [-1, 1]) add('body', PAL.wood, rod([sx * 0.22, -0.005, 0.1], [sx * 0.05, 1.0, -0.12], 0.02));
  add('body', PAL.wood, rod([0, -0.005, -0.34], [0, 0.96, -0.13], 0.02));
  add('body', PAL.woodDark, xf(box(0.5, 0.035, 0.08), [0, 0.36, 0.06]));
  const at = (g) => xf(g, [0, 0.62, 0.03], [-0.32, 0, 0]);
  const R = 0.23, n = 8;
  add('body', PAL.mat, at(new T.TorusGeometry(R, 0.055, 6, 20)));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    add('body', i % 2 ? PAL.greenDeep : PAL.green, at(xf(ball(0.06, 0), [Math.cos(a) * R, Math.sin(a) * R, 0.035], [0, 0, a + 0.6], [1.6, 0.75, 0.6])));
  }
  for (const [a, c] of [[0.35, PAL.rose], [1.0, PAL.straw], [1.7, PAL.lilac], [2.4, PAL.cream], [3.0, PAL.rose], [-0.5, PAL.lilac]]) {
    flower(k, [Math.cos(a) * R, Math.sin(a) * R, 0.07], 0.07, c, [Math.PI / 2, 0, 0], PAL.mat, 'fine', at);
  }
  bow(k, 0, -R, 0.075, 1.5, PAL.red, at);
  return k.finish('driedflowers');
}

export const FLOWER = Object.freeze({ flowercart, flowerpail, driedflowers });
