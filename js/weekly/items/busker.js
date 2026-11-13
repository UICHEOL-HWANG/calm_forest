import { PAL, kit } from './kit.js';

function outline(T, lb, ub, n = 12) {
  const c1 = -0.11, c2 = 0.1, y0 = c1 - lb, y1 = c2 + ub;
  const w = (y) => Math.max(Math.sqrt(Math.max(0, lb * lb - (y - c1) ** 2)), Math.sqrt(Math.max(0, ub * ub - (y - c2) ** 2)));
  const ys = Array.from({ length: n + 1 }, (_, i) => y0 + ((y1 - y0) * (1 - Math.cos((Math.PI * i) / n))) / 2);
  const pts = [...ys.map((y) => new T.Vector2(w(y), y)), ...ys.slice(1, -1).reverse().map((y) => new T.Vector2(-w(y), y))];
  return new T.Shape(pts);
}

function slab(T, shape, depth) {
  const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
  g.deleteAttribute('uv');
  return g;
}

function guitar(k, post, s) {
  const { T, add, xf, box, cyl } = k;
  const S = (g) => post(xf(g, [0, 0, 0], [0, 0, 0], [s, s, s]));
  add('body', PAL.wood, S(slab(T, outline(T, 0.17, 0.125), 0.08).translate(0, 0, -0.04)));
  add('body', PAL.woodLight, S(slab(T, outline(T, 0.158, 0.113), 0.012).translate(0, 0, 0.035)));
  add('fine', PAL.coal, S(xf(cyl(0.052, 0.052, 0.012, 12), [0, 0.04, 0.049], [Math.PI / 2, 0, 0])));
  add('fine', PAL.gold, S(xf(new T.TorusGeometry(0.064, 0.008, 4, 14), [0, 0.04, 0.048])));
  add('fine', PAL.woodDark, S(xf(box(0.13, 0.03, 0.016), [0, -0.17, 0.05])));
  add('body', PAL.wood, S(xf(box(0.056, 0.4, 0.04), [0, 0.405, 0])));
  add('body', PAL.coal, S(xf(box(0.062, 0.4, 0.012), [0, 0.41, 0.025])));
  add('body', PAL.woodDark, S(xf(box(0.095, 0.15, 0.032), [0, 0.67, -0.008], [-0.22, 0, 0])));
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) add('fine', PAL.cream, S(xf(cyl(0.013, 0.013, 0.05, 5), [sx * 0.065, 0.625 + i * 0.038, -0.012 - i * 0.008], [0, 0, Math.PI / 2])));
}

function leanPost(k, s, [x, yb, zb], theta) {
  const E = new k.T.Euler(-theta, 0, 0);
  const off = new k.T.Vector3(x, yb, zb).sub(new k.T.Vector3(0, -0.28 * s, 0).applyEuler(E));
  const post = (g) => k.xf(g, off.toArray(), [-theta, 0, 0]);
  const P = (px, py, pz) => new k.T.Vector3(px * s, py * s, pz * s).applyEuler(E).add(off).toArray();
  return { post, P };
}

function bulb(k, x, y, z, r = 0.055) {
  const { add, xf, ball, cyl } = k;
  add('lamp', PAL.lamp, xf(ball(r, 0), [x, y, z], [0, 0, 0], [1, 1.25, 1]));
  add('fine', PAL.brass, xf(cyl(r * 0.5, r * 0.55, r * 0.8, 6), [x, y + r * 1.25, z]));
}

function stool(k, x, y, z, h, r = 0.16) {
  const { add, xf, cyl, rod, torus } = k;
  add('body', PAL.woodLight, xf(cyl(r, r * 0.95, 0.05, 12), [x, y + h, z]));
  for (const a of [0.4, 2.5, 4.6]) add('body', PAL.woodDark, rod([x + Math.cos(a) * r * 0.6, y + h - 0.02, z + Math.sin(a) * r * 0.6], [x + Math.cos(a) * r * 0.95, y - 0.004, z + Math.sin(a) * r * 0.95], 0.022, 0.026, 5));
  add('fine', PAL.woodDark, xf(torus(r * 0.78, 0.012, 4, 12), [x, y + h * 0.4, z], [Math.PI / 2, 0, 0]));
}

function buskerstage(T) {
  const k = kit(T);
  const { add, xf, cyl } = k;
  add('body', PAL.wood, xf(cyl(1.0, 1.02, 0.24, 18), [0, 0.116, 0]));
  add('body', PAL.red, xf(cyl(1.014, 1.024, 0.06, 18), [0, 0.13, 0]));
  add('body', PAL.woodLight, xf(cyl(0.96, 0.96, 0.02, 18), [0, 0.243, 0]));
  const R = 0.92, sy = 1.55, base = 0.25, n = 8;
  for (let i = 0; i < n; i++) {
    const g = new T.SphereGeometry(R, 2, 5, Math.PI + (i * Math.PI) / n, Math.PI / n, 0, Math.PI / 2);
    add('body', i % 2 ? PAL.cream : PAL.green, xf(g, [0, base, -0.02], [0, 0, 0], [1, sy, 1]));
  }
  add('body', PAL.gold, xf(new T.TorusGeometry(R, 0.045, 5, 18, Math.PI), [0, base, -0.02], [0, 0, 0], [1, sy, 1]));
  for (let i = 0; i < 7; i++) {
    const t = 0.18 + (i / 6) * (Math.PI - 0.36);
    bulb(k, Math.cos(t) * R, base + Math.sin(t) * R * sy - 0.02, 0.06, 0.05);
  }
  stool(k, 0.2, 0.253, 0.32, 0.5, 0.2);
  return k.finish('buskerstage');
}

function guitarstand(T) {
  const k = kit(T);
  const { add, rod, xf, ball } = k;
  const s = 0.76, { post, P } = leanPost(k, s, [0, 0.1, 0.04], 0.24);
  guitar(k, post, s);
  const C = P(0, -0.28, 0), Y = P(0, 0.47, -0.075), J = [0, C[1] - 0.03, C[2] - 0.02];
  add('body', PAL.woodDark, rod([-0.13, J[1], J[2]], [0.13, J[1], J[2]], 0.024));
  for (const sx of [-1, 1]) {
    const tip = P(sx * 0.12, -0.2, 0.075);
    add('body', PAL.woodDark, rod([sx * 0.13, J[1], J[2]], tip, 0.02));
    add('fine', PAL.red, xf(ball(0.028, 0), tip));
    add('body', PAL.woodDark, rod(J, [sx * 0.22, -0.004, J[2] + 0.13], 0.024, 0.026));
    const prong = P(sx * 0.05, 0.47, 0.035);
    add('fine', PAL.woodDark, rod(Y, prong, 0.014, 0.014, 5));
    add('fine', PAL.red, xf(ball(0.02, 0), prong));
  }
  add('body', PAL.woodDark, rod(J, Y, 0.024));
  const M = [(J[0] + Y[0]) / 2, (J[1] + Y[1]) / 2, (J[2] + Y[2]) / 2];
  add('body', PAL.woodDark, rod(M, [0, -0.004, Y[2] - 0.2], 0.022, 0.026));
  return k.finish('guitarstand');
}

function horn(k, p0, dir, prof, colors, rim, gores = 8) {
  const { T, add, xf, aim } = k;
  const pts = prof.map(([r, y]) => new T.Vector2(r, y));
  for (let i = 0; i < gores; i++) add('body', colors[i % colors.length], aim(new T.LatheGeometry(pts, 2, (i * Math.PI * 2) / gores, (Math.PI * 2) / gores), p0, dir));
  const [lr, ly] = prof[prof.length - 1];
  add('fine', rim, aim(xf(new T.TorusGeometry(lr, 0.011, 4, 20), [0, ly, 0], [Math.PI / 2, 0, 0]), p0, dir));
}

function gramoBase(k) {
  const { add, xf, box, cyl, rod, ball } = k;
  const wood = PAL.wood, trim = PAL.woodDark, panel = PAL.woodLight, felt = PAL.greenDeep, metal = PAL.brass;
  add('body', trim, xf(box(0.34, 0.03, 0.32), [0, 0.011, 0]));
  add('body', wood, xf(box(0.3, 0.13, 0.28), [0, 0.09, 0]));
  add('body', trim, xf(box(0.32, 0.02, 0.3), [0, 0.16, 0]));
  add('fine', panel, xf(box(0.2, 0.07, 0.012), [0, 0.09, 0.142]));
  add('body', felt, xf(cyl(0.12, 0.12, 0.016, 16), [0, 0.176, 0]));
  add('body', PAL.coal, xf(cyl(0.112, 0.112, 0.012, 16), [0, 0.189, 0]));
  add('fine', PAL.red, xf(cyl(0.038, 0.038, 0.014, 10), [0, 0.195, 0]));
  add('fine', metal, xf(cyl(0.006, 0.006, 0.03, 5), [0, 0.205, 0]));
  add('fine', metal, rod([0.15, 0.09, 0.03], [0.215, 0.09, 0.03], 0.009, 0.009, 5));
  add('fine', metal, rod([0.215, 0.09, 0.03], [0.215, 0.04, 0.07], 0.009, 0.009, 5));
  add('fine', trim, xf(ball(0.02, 0), [0.24, 0.04, 0.07]));
  add('body', metal, xf(cyl(0.03, 0.036, 0.03, 8), [0.11, 0.18, -0.1]));
  add('body', metal, rod([0.11, 0.17, -0.1], [0.11, 0.26, -0.1], 0.016, 0.016, 8));
  add('fine', metal, rod([0.11, 0.24, -0.1], [0.02, 0.235, 0.05], 0.011, 0.011, 5));
  add('fine', metal, xf(cyl(0.032, 0.032, 0.018, 10), [0.02, 0.237, 0.06], [Math.PI / 2, 0, 0]));
  return [0.11, 0.255, -0.1];
}

const HORN_CLASSIC = [[0.016, 0], [0.02, 0.08], [0.03, 0.16], [0.055, 0.22], [0.1, 0.265], [0.16, 0.29], [0.19, 0.296]];

function gramophone(T) {
  const k = kit(T);
  const p0 = gramoBase(k);
  horn(k, p0, [-0.22, 1, 0.82], HORN_CLASSIC, [PAL.brass, PAL.gold], PAL.gold, 8);
  return k.finish('gramophone');
}

export const BUSKER = Object.freeze({ buskerstage, guitarstand, gramophone });
