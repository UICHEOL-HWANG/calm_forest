import { PAL, kit } from '../weekly/items/kit.js';

const HALF = Math.PI / 2;
const FLAGS = [PAL.red, PAL.cream, PAL.gold, PAL.celadon, PAL.rose];
const BELL = [[0.035, 0], [0.045, 0.12], [0.075, 0.24], [0.135, 0.33], [0.22, 0.385]];

function plate(T, shape, depth) {
  return new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 });
}

function archShape(T, w, h, rise) {
  const s = new T.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - rise);
  s.quadraticCurveTo(w / 2, h, 0, h);
  s.quadraticCurveTo(-w / 2, h, -w / 2, h - rise);
  s.closePath();
  return s;
}

function pianoShape(T, s) {
  const sh = new T.Shape();
  sh.moveTo(-0.17 * s, 0.12 * s);
  sh.lineTo(-0.17 * s, -0.19 * s);
  sh.quadraticCurveTo(-0.17 * s, -0.27 * s, -0.08 * s, -0.26 * s);
  sh.quadraticCurveTo(0.02 * s, -0.25 * s, 0.05 * s, -0.12 * s);
  sh.quadraticCurveTo(0.075 * s, -0.03 * s, 0.17 * s, -0.03 * s);
  sh.lineTo(0.17 * s, 0.12 * s);
  sh.closePath();
  return sh;
}

function sheet(k, P, w, h, marks = [[-0.3, 0.52], [-0.12, 0.3], [0.2, 0.5], [0.36, 0.26]]) {
  const { add, xf, box, ball } = k;
  for (const sx of [-1, 1]) add('fine', PAL.cream, P(xf(box(w / 2 - 0.006, h, 0.012), [sx * w / 4, h / 2, 0])));
  const r = w * 0.058;
  for (const [mx, my] of marks) {
    add('fine', PAL.coal, P(xf(ball(r, 1), [mx * w, my * h, 0.012], [0, 0, 0.35], [1.2, 0.8, 0.3])));
    add('fine', PAL.coal, P(xf(box(r * 0.36, h * 0.26, 0.008), [mx * w + r * 0.95, my * h + h * 0.13, 0.012])));
  }
}

function keys(k, P, w, d, bucket = 'fine') {
  const { add, xf, box } = k;
  add(bucket, PAL.cream, P(box(w, 0.03, d)));
  for (const fx of [-0.34, -0.2, 0.06, 0.2, 0.34]) add('fine', PAL.coal, P(xf(box(w * 0.08, 0.03, d * 0.58), [fx * w, 0.014, -d * 0.21])));
}

function bunting(k, A, B, sag, n, drop, shift = 0, rr = 0.012, wide = 0.36) {
  const { T, add, rod, poly } = k;
  const a = new T.Vector3(...A), b = new T.Vector3(...B);
  const at = (t) => a.clone().lerp(b, t).add(new T.Vector3(0, -sag * 4 * t * (1 - t), 0)).toArray();
  const S = 8;
  for (let i = 0; i < S; i++) add('fine', PAL.woodDark, rod(at(i / S), at((i + 1) / S), rr, rr, 4));
  const dt = wide / (n + 1);
  const faces = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 1), l = at(t - dt), r = at(t + dt), m = at(t);
    faces.push({ v: [[l[0], l[1] - 0.012, l[2]], [r[0], r[1] - 0.012, r[2]], [m[0], m[1] - drop, m[2]]], c: FLAGS[(i + shift) % FLAGS.length] });
  }
  poly('body', faces);
}

function bell(k, bucket, colour, p, dir, prof, seg = 10) {
  k.add(bucket, colour, k.aim(k.lathe(prof, seg), p, dir));
}

function musicstand(T) {
  const k = kit(T);
  const { add, xf, box, cyl } = k;
  add('body', PAL.woodDark, xf(cyl(0.12, 0.16, 0.045, 10), [0, 0.019, 0]));
  add('body', PAL.wood, xf(cyl(0.028, 0.036, 0.5, 8), [0, 0.28, 0]));
  add('body', PAL.woodDark, xf(cyl(0.05, 0.05, 0.05, 8), [0, 0.51, 0]));
  const D = (g) => xf(g, [0, 0.47, 0.01], [-0.38, 0, 0]);
  add('body', PAL.woodLight, D(xf(plate(T, archShape(T, 0.46, 0.34, 0.1), 0.03), [0, 0.02, -0.015])));
  add('body', PAL.woodDark, D(xf(box(0.48, 0.04, 0.08), [0, 0.02, 0.03])));
  sheet(k, (g) => D(xf(g, [0, 0.045, 0.023])), 0.36, 0.24);
  return k.finish('musicstand');
}

function metronome(T) {
  const k = kit(T);
  const { add, xf, box, cyl, rod, poly } = k;
  add('body', PAL.woodDark, xf(box(0.21, 0.035, 0.21), [0, 0.014, 0]));
  add('body', PAL.wood, xf(cyl(0.052, 0.125, 0.3, 4), [0, 0.18, 0], [0, Math.PI / 4, 0]));
  add('body', PAL.woodDark, xf(box(0.09, 0.03, 0.09), [0, 0.342, 0]));
  const zf = (y) => 0.0884 - ((y - 0.03) / 0.3) * 0.0516 + 0.01;
  poly('fine', [{ v: [[-0.058, 0.07, zf(0.07)], [0.058, 0.07, zf(0.07)], [0.03, 0.29, zf(0.29)], [-0.03, 0.29, zf(0.29)]], c: PAL.cream }]);
  add('fine', PAL.coal, rod([0, 0.075, 0.105], [0.085, 0.39, 0.06], 0.011, 0.011, 5));
  add('fine', PAL.gold, xf(box(0.062, 0.05, 0.028), [0.052, 0.27, 0.082], [0, 0, -0.26]));
  add('fine', PAL.gold, rod([0.09, 0.1, 0], [0.135, 0.1, 0], 0.01, 0.01, 5));
  add('fine', PAL.gold, xf(box(0.012, 0.06, 0.04), [0.14, 0.1, 0]));
  return k.finish('metronome');
}

function musicbox(T) {
  const k = kit(T);
  const { add, xf, box, rod } = k;
  add('body', PAL.wood, xf(plate(T, pianoShape(T, 1), 0.075), [0, 0.185, 0], [HALF, 0, 0]));
  add('lamp', PAL.lamp, xf(plate(T, pianoShape(T, 0.86), 0.008), [0, 0.195, -0.008], [HALF, 0, 0]));
  const lid = xf(plate(T, pianoShape(T, 1.03), 0.016), [0.175, 0.016, 0], [HALF, 0, 0]);
  add('body', PAL.woodDark, xf(lid, [-0.175, 0.19, 0], [0, 0, 0.85]));
  add('fine', PAL.woodDark, rod([0.13, 0.19, -0.02], [0.02, 0.405, -0.02], 0.008, 0.008, 4));
  add('body', PAL.woodDark, xf(box(0.34, 0.04, 0.07), [0, 0.13, 0.153]));
  keys(k, (g) => xf(g, [0, 0.162, 0.156]), 0.31, 0.058);
  for (const [x, z] of [[-0.13, 0.08], [0.13, 0.08], [-0.08, -0.19]]) add('body', PAL.woodDark, rod([x, 0.115, z], [x, -0.004, z], 0.02, 0.014, 6));
  return k.finish('musicbox');
}

function noteflags(T) {
  const k = kit(T);
  const { add, xf, ball, rod, box } = k;
  const L = [-0.85, 1.55, 0], R = [0.85, 1.85, 0];
  for (const [x, top] of [[L[0], L[1]], [R[0], R[1]]]) {
    add('body', PAL.coal, xf(ball(0.2, 1), [x - 0.17, 0.15, 0], [0, 0, 0.38], [1.25, 0.8, 1]));
    add('body', PAL.coal, rod([x, 0.1, 0], [x, top, 0], 0.05, 0.045, 6));
  }
  const ang = Math.atan2(R[1] - L[1], R[0] - L[0]), len = Math.hypot(R[0] - L[0], R[1] - L[1]);
  add('body', PAL.coal, xf(box(len + 0.07, 0.13, 0.07), [0, (L[1] + R[1]) / 2 - 0.05, 0], [0, 0, ang]));
  bunting(k, [L[0], L[1] - 0.22, 0], [R[0], R[1] - 0.24, 0], 0.26, 5, 0.3);
  return k.finish('noteflags');
}

function hornpost(T) {
  const k = kit(T);
  const { add, xf, cyl, ball, aim, torus } = k;
  add('body', PAL.woodDark, xf(cyl(0.15, 0.19, 0.14, 8), [0, 0.066, 0]));
  add('body', PAL.wood, xf(cyl(0.055, 0.07, 1.75, 8), [0, 0.875, 0]));
  add('body', PAL.woodDark, xf(cyl(0.1, 0.1, 0.16, 8), [0, 1.62, 0]));
  add('body', PAL.red, xf(ball(0.085, 1), [0, 1.79, 0]));
  for (const sx of [-1, 1]) {
    const p = [sx * 0.06, 1.62, 0.02], dir = [sx, 0.35, 0.7];
    bell(k, 'body', sx > 0 ? PAL.celadon : PAL.cream, p, dir, BELL);
    add('fine', PAL.red, aim(xf(torus(0.22, 0.018, 4, 14), [0, 0.385, 0], [HALF, 0, 0]), p, dir));
    add('lamp', PAL.lamp, aim(xf(cyl(0.118, 0.118, 0.012, 10), [0, 0.31, 0]), p, dir));
  }
  return k.finish('hornpost');
}

function reedorgan(T) {
  const k = kit(T);
  const { add, xf, box, cyl } = k;
  add('body', PAL.woodDark, xf(box(1.08, 0.06, 0.46), [0, 0.026, -0.03]));
  add('body', PAL.wood, xf(box(1.0, 0.6, 0.4), [0, 0.34, -0.05]));
  add('fine', PAL.woodLight, xf(box(0.62, 0.34, 0.012), [0, 0.37, 0.156]));
  add('body', PAL.woodDark, xf(box(1.06, 0.07, 0.3), [0, 0.675, 0.1]));
  keys(k, (g) => xf(g, [0, 0.722, 0.14]), 0.9, 0.17, 'body');
  add('body', PAL.wood, xf(box(1.0, 0.36, 0.18), [0, 0.89, -0.16]));
  add('body', PAL.woodDark, xf(box(1.08, 0.05, 0.26), [0, 1.095, -0.15]));
  sheet(k, (g) => xf(g, [0, 0.72, -0.045], [-0.2, 0, 0]), 0.4, 0.27);
  for (const sx of [-1, 1]) add('body', PAL.greenDeep, xf(box(0.17, 0.03, 0.2), [sx * 0.13, 0.1, 0.22], [0.35, 0, 0]));
  add('fine', PAL.woodDark, xf(cyl(0.07, 0.08, 0.025, 8), [0.36, 1.132, -0.15]));
  add('lamp', PAL.lamp, xf(cyl(0.055, 0.065, 0.14, 8), [0.36, 1.214, -0.15]));
  add('fine', PAL.woodDark, xf(cyl(0.03, 0.07, 0.035, 8), [0.36, 1.3, -0.15]));
  return k.finish('reedorgan');
}

const BUILDERS = Object.freeze({ musicstand, metronome, musicbox, noteflags, hornpost, reedorgan });

export const hasConcertArt = (id) => Object.hasOwn(BUILDERS, id);

export const concertDecorMesh = (T, id) => (hasConcertArt(id) ? BUILDERS[id](T) : null);
