import { PAL, kit } from './kit.js';

const ribs = (a, b, per = 2, n = 8) => (f) => (f < n * per ? (Math.floor(f / per) % 2 ? b : a) : a);

function scallop(k, p, r, cols) {
  const { xf, cyl, box, addFaces, add } = k;
  const g = xf(cyl(r * 0.12, r, r * 0.3, 8, false, -1.2, 2.4), p, [Math.PI / 2, 0, 0]);
  addFaces('fine', g, ribs(cols[0], cols[1]));
  add('fine', cols[1], xf(box(r * 0.6, r * 0.2, r * 0.14), [p[0], p[1] - r * 0.06, p[2] + r * 0.06]));
}

function chime(k, x, y, z, s, hang) {
  const { add, rod } = k;
  add('fine', PAL.rope, rod([x, y, z], [x, y + hang, z], 0.008 * s, 0.008 * s, 4));
  add('body', PAL.driftDark, rod([x - 0.2 * s, y, z], [x + 0.2 * s, y + 0.02 * s, z], 0.022 * s, 0.018 * s, 6));
  const shells = [[-0.15, 0.2, [PAL.rose, PAL.shell]], [0, 0.32, [PAL.cream, PAL.sea]], [0.15, 0.24, [PAL.gold, PAL.shell]]];
  for (const [dx, len, cols] of shells) {
    add('fine', PAL.rope, rod([x + dx * s, y, z], [x + dx * s, y - len * s, z], 0.006 * s, 0.006 * s, 4));
    scallop(k, [x + dx * s, y - len * s + 0.01 * s, z], 0.12 * s, cols);
  }
}

function netCage(k, x, y, z, r, meridians) {
  const { add, xf, torus } = k;
  add('fine', PAL.rope, xf(torus(r * 0.99, r * 0.085, 4, 14), [x, y, z], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < meridians; i++) add('fine', PAL.rope, xf(torus(r * 0.99, r * 0.07, 4, 14), [x, y, z], [0, (i * Math.PI) / meridians + 0.4, 0]));
}

function floatLamp(k, x, y, z, r, hang) {
  const { add, xf, ball, rod, torus } = k;
  add('lamp', PAL.amber, xf(ball(r, 1), [x, y, z]));
  netCage(k, x, y, z, r, 2);
  add('fine', PAL.rope, xf(torus(r * 0.22, r * 0.07, 4, 8), [x, y + r * 1.12, z], [0, 0.4, 0]));
  add('fine', PAL.rope, rod([x, y + r * 1.3, z], [x, y + r + hang, z], 0.01, 0.01, 4));
}

function seaBuoy(k, x, y, z, hang) {
  const { add, xf, ball, cyl, rod } = k;
  add('body', PAL.buoy, xf(ball(0.16, 1), [x, y, z], [0, 0, 0], [1, 1.25, 1]));
  add('body', PAL.cream, xf(cyl(0.158, 0.158, 0.08, 10), [x, y, z]));
  add('fine', PAL.rope, rod([x, y + 0.18, z], [x, y + 0.2 + hang, z], 0.01, 0.01, 4));
}

function sandPatch(k, x, z, rx, rz) {
  const ring = [1, 0.86, 1.05, 0.9, 1.02, 0.84, 0.97, 0.9, 1.04];
  k.poly('fine', [{ v: ring.map((m, i) => { const a = (i / ring.length) * Math.PI * 2; return [x + Math.cos(a) * rx * m, 0.006, z + Math.sin(a) * rz * m]; }), c: PAL.sand }]);
}

function shellshade(T) {
  const k = kit(T);
  const { add, rod, poly } = k;
  const H = 2.4, X0 = -1.0, X1 = 1.0, Z0 = -0.72, Z1 = 0.72, Y = 2.57, n = 6;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('body', PAL.drift, rod([sx * 0.85, -0.03, sz * 0.6], [sx * 0.89, H + 0.06, sz * 0.62], 0.055, 0.045, 7));
  for (const sz of [-1, 1]) add('body', PAL.driftDark, rod([-1.02, H + 0.02, sz * 0.62], [1.02, H + 0.04, sz * 0.62], 0.045, 0.045, 6));
  for (const sx of [-1, 1]) add('body', PAL.driftDark, rod([sx * 0.87, H + 0.1, -0.78], [sx * 0.87, H + 0.1, 0.78], 0.045, 0.045, 6));
  const sag = 0.07;
  const yAt = (x, z) => Y - sag * Math.sin((Math.PI * (x - X0)) / (X1 - X0)) * Math.sin((Math.PI * (z - Z0)) / (Z1 - Z0));
  const zs = [Z0, 0, Z1];
  const faces = [];
  for (let i = 0; i < n; i++) {
    const xa = X0 + ((X1 - X0) * i) / n, xb = X0 + ((X1 - X0) * (i + 1)) / n, c = i % 2 ? PAL.cream : PAL.sea;
    for (let j = 0; j < 2; j++) {
      const za = zs[j], zb = zs[j + 1];
      faces.push({ v: [[xa, yAt(xa, za), za], [xb, yAt(xb, za), za], [xb, yAt(xb, zb), zb], [xa, yAt(xa, zb), zb]], c });
    }
    const xm = (xa + xb) / 2, zf = Z1 + 0.004;
    faces.push({ v: [[xa, Y, zf], [xb, Y, zf], [xb, Y - 0.12, zf], [xm, Y - 0.24, zf], [xa, Y - 0.12, zf]], c });
  }
  poly('body', faces);
  sandPatch(k, 0, 0.05, 1.25, 0.95);
  seaBuoy(k, -0.6, 2.16, 0.62, 0.03);
  chime(k, 0, 2.34, 0.62, 0.9, 0.05);
  floatLamp(k, 0.6, 2.06, 0.62, 0.12, 0.2);
  return k.finish('shellshade');
}

function glassbuoy(T) {
  const k = kit(T);
  const { add, xf, ball, rod } = k;
  const knotP = [0.03, 0.31, 0.04];
  for (const [x, z, r, c] of [[-0.07, -0.03, 0.14, PAL.celadon], [0.15, 0.02, 0.105, PAL.sea], [0.03, 0.17, 0.085, PAL.amber]]) {
    const y = r - 0.004;
    add('glass', c, xf(ball(r, 1), [x, y, z]));
    netCage(k, x, y, z, r, 1);
    add('fine', PAL.rope, rod([x, y + r * 0.98, z], knotP, 0.008, 0.008, 4));
  }
  add('fine', PAL.rope, xf(ball(0.022, 0), knotP));
  return k.finish('glassbuoy');
}

function leafFan(k, x, y, z, n, len, wid, tilt, cols, yaw0 = 0) {
  const { add, xf, cone } = k;
  for (let i = 0; i < n; i++) {
    const a = yaw0 + (i / n) * Math.PI * 2;
    add('body', cols[i % cols.length], xf(xf(xf(cone(wid, len, 4), [0, len / 2, 0]), [0, 0, 0], [tilt, 0, 0]), [x, y, z], [0, a, 0]));
  }
}

function rosette(k, x, y, z) {
  leafFan(k, x, y, z, 7, 0.13, 0.035, 1.05, [PAL.green, PAL.celadonDeep]);
  leafFan(k, x, y + 0.01, z, 5, 0.1, 0.03, 0.55, [PAL.greenDeep], 0.4);
  k.add('body', PAL.green, k.xf(k.cone(0.025, 0.07, 4), [x, y + 0.035, z]));
}

function conchpot(T) {
  const k = kit(T);
  const { add, xf, lathe, cyl, cone, rod } = k;
  const th = 0.16, O = [-0.22, 0.098, 0.0];
  const d = [Math.cos(th), Math.sin(th), 0], u = [-Math.sin(th), Math.cos(th), 0];
  const at = (t, a, r) => [O[0] + d[0] * t + (u[0] * Math.cos(a)) * r, O[1] + d[1] * t + (u[1] * Math.cos(a)) * r, O[2] + Math.sin(a) * r];
  const prof = [[0, 0], [0.025, 0.03], [0.07, 0.1], [0.13, 0.2], [0.15, 0.26], [0.142, 0.29], [0.1, 0.305], [0.095, 0.34], [0.062, 0.36], [0.056, 0.395], [0.026, 0.425], [0, 0.455]];
  add('body', PAL.shell, xf(xf(lathe(prof, 9), [0, 0, 0], [0, 0, th - Math.PI / 2]), O));
  for (const a of [-1.1, -0.35, 0.35, 1.1]) add('body', PAL.shell, rod(at(0.275, a, 0.14), at(0.275, a, 0.2), 0.032, 0.006, 5));
  const ap = at(0.13, 0, 0.075);
  add('body', PAL.rose, xf(cyl(0.12, 0.13, 0.04, 10), ap, [0, 0, th], [1.25, 1, 0.78]));
  add('body', PAL.soil, xf(cyl(0.1, 0.1, 0.012, 10), [ap[0], ap[1] + 0.018, ap[2]], [0, 0, th], [1.15, 1, 0.72]));
  add('fine', PAL.rose, xf(cone(0.05, 0.1, 5), at(0.0, 0, 0.0), [0, 0, th + Math.PI / 2]));
  rosette(k, ap[0] - 0.005, ap[1] + 0.02, ap[2]);
  return k.finish('conchpot');
}

export const SEASIDE = Object.freeze({ shellshade, glassbuoy, conchpot });
