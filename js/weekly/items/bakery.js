import { PAL, kit, at3, lump } from './kit.js';

function wheel(k, x, y, z, r) {
  const { add, xf, cyl, ball } = k;
  const sz = Math.sign(z) || 1;
  add('body', PAL.woodDark, xf(cyl(r, r, 0.06, 14), [x, y, z], [Math.PI / 2, 0, 0]));
  add('body', PAL.wood, xf(cyl(r * 0.72, r * 0.72, 0.07, 14), [x, y, z], [Math.PI / 2, 0, 0]));
  add('body', PAL.cream, xf(ball(0.05, 0), [x, y, z + sz * 0.035]));
}

function boule(k, x, y, z, s = 1, ry = 0) {
  const { T, add, xf, ball } = k;
  const r = 0.1 * s, top = r * 0.7 * 1.3 - 0.004;
  add('body', PAL.crust, xf(lump(T, r, [1.1, 0.7, 0.95], 0.3, 1), [x, y, z], [0, ry, 0]));
  for (const dz of [-0.03, 0.03]) add('fine', PAL.crumb, xf(xf(ball(0.03 * s, 0), [0, top - 0.004 * s, dz * s], [0, 0.25, 0], [2.0, 0.45, 0.8]), [x, y, z], [0, ry, 0]));
}

function baguette(k, base, dir, L, r = 0.038) {
  const { T, add, aim, xf, ball } = k;
  add('body', PAL.crust, aim(new T.CapsuleGeometry(r, L - 2 * r, 2, 6).translate(0, L / 2, 0), base, dir));
  const ry = Math.atan2(-0.4, 0.92), nx = Math.sin(ry), nz = Math.cos(ry);
  for (let i = 0; i < 4; i++) {
    const y = L * (0.2 + i * 0.2);
    add('fine', PAL.crumb, aim(xf(ball(r * 0.6, 0), [nx * r * 0.86, y, nz * r * 0.86], [0, ry, 0.38], [0.55, 1.8, 0.4]), base, dir));
  }
}

function jar(k, at, s, jam, cap) {
  const { add, xf, lathe, cyl } = k;
  const S = (g) => at(xf(g, [0, 0, 0], [0, 0, 0], [s, s, s]));
  add('body', jam, S(lathe([[0, 0], [0.05, 0], [0.058, 0.012], [0.06, 0.09], [0.052, 0.106], [0.046, 0.112], [0.046, 0.13], [0, 0.13]], 10)));
  add('fine', PAL.cream, S(cyl(0.0645, 0.0645, 0.024, 10, true).translate(0, 0.05, 0)));
  add('body', cap, S(xf(cyl(0.048, 0.064, 0.036, 10), [0, 0.122, 0])));
  add('fine', cap, S(xf(cyl(0.032, 0.046, 0.014, 10), [0, 0.145, 0])));
}

const JAMS = [[PAL.red, PAL.cream], [PAL.gold, PAL.greenDeep], [PAL.berry, PAL.red], [PAL.red, PAL.greenDeep], [PAL.gold, PAL.red], [PAL.berry, PAL.cream]];

function chimney(k, x, z, y0, y1, r = 0.05) {
  const { add, xf, rod, cyl, cone } = k;
  add('body', PAL.iron, rod([x, y0, z], [x, y1 + 0.02, z], r, r, 8));
  add('body', PAL.iron, xf(cone(r * 2.3, 0.1, 8), [x, y1 + 0.06, z]));
  add('fine', PAL.coal, xf(cyl(r * 1.3, r * 1.3, 0.05, 8), [x, y1 - 0.12, z]));
}

function archCheek(k, x, h, d, t = 0.04, color = PAL.wood) {
  const { add, xf, box, cyl } = k;
  add('body', color, xf(box(t, h, d), [x, h / 2 - 0.004, 0]));
  add('body', color, xf(cyl(d / 2, d / 2, t + 0.01, 10, false, 0, Math.PI), [x, h - 0.004, 0], [0, 0, Math.PI / 2]));
}

function breadcart(T) {
  const k = kit(T);
  const { add, xf, box, cyl, rod, lathe, aim } = k;
  add('body', PAL.wood, xf(box(1.42, 0.1, 0.84), [-0.06, 0.56, 0]));
  for (const sz of [-1, 1]) {
    add('body', PAL.cream, xf(box(1.3, 0.14, 0.03), [-0.06, 0.56, sz * 0.43]));
    add('body', PAL.greenDeep, xf(box(1.32, 0.04, 0.045), [-0.06, 0.56, sz * 0.43]));
  }
  add('body', PAL.woodDark, xf(box(0.14, 0.14, 0.96), [0.05, 0.42, 0]));
  for (const sz of [-1, 1]) wheel(k, 0.05, 0.355, sz * 0.5, 0.36);
  for (const sz of [-1, 1]) {
    add('body', PAL.woodDark, rod([0.55, 0.52, sz * 0.32], [0.58, -0.005, sz * 0.32], 0.03));
    add('body', PAL.wood, rod([-0.7, 0.56, sz * 0.3], [-1.22, 0.8, sz * 0.3], 0.03));
  }
  add('body', PAL.wood, rod([-1.22, 0.8, -0.34], [-1.22, 0.8, 0.34], 0.032));
  const OX = 0.18, B = 0.7;
  add('body', PAL.brickDeep, xf(cyl(0.46, 0.48, 0.1, 12), [OX, 0.655, 0]));
  add('body', PAL.clay, xf(lathe([[0, 0], [0.43, 0], [0.44, 0.1], [0.41, 0.24], [0.34, 0.37], [0.22, 0.47], [0, 0.51]], 12), [OX, B, 0]));
  add('body', PAL.coal, xf(cyl(0.21, 0.21, 0.1, 10, false, -Math.PI / 2, Math.PI), [OX, B + 0.004, 0.42], [-Math.PI / 2, 0, 0]));
  add('body', PAL.stone, xf(new T.TorusGeometry(0.215, 0.05, 5, 10, Math.PI), [OX, B + 0.004, 0.43]));
  add('lamp', PAL.ember, xf(cyl(0.16, 0.16, 0.02, 10, false, -Math.PI / 2, Math.PI), [OX, B + 0.008, 0.474], [-Math.PI / 2, 0, 0], [1, 1, 0.8]));
  chimney(k, OX - 0.08, -0.14, 1.05, 1.76);
  const pb = [0.95, -0.004, -0.06], pt = [0.62, 0.95, -0.06], pd = [pt[0] - pb[0], pt[1] - pb[1], 0];
  add('body', PAL.woodLight, rod(pb, pt, 0.022, 0.022, 5));
  add('body', PAL.woodLight, aim(xf(cyl(0.13, 0.13, 0.022, 12), [0, 0.13, 0], [Math.PI / 2, 0, 0], [1, 1, 1.12]), pt, pd));
  add('body', PAL.woodDark, xf(box(0.44, 0.05, 0.64), [-0.5, 0.632, 0]));
  boule(k, -0.5, 0.655, -0.2, 1.0, 0.3);
  boule(k, -0.5, 0.655, 0.0, 1.05, -0.2);
  boule(k, -0.5, 0.655, 0.2, 1.0, 0.5);
  return k.finish('breadcart');
}

function basket(k, pts, sx, bands) {
  const { add, xf, lathe, torus } = k;
  add('body', PAL.mat, xf(lathe(pts, 14), [0, -0.004, 0], [0, 0, 0], [sx, 1, 1]));
  for (const [y, r, t] of bands) add('fine', PAL.woodLight, xf(torus(r, t, 4, 18), [0, y, 0], [Math.PI / 2, 0, 0], [sx, 1, 1]));
}

function baguettes(T) {
  const k = kit(T);
  basket(k, [[0, 0], [0.13, 0], [0.17, 0.09], [0.18, 0.11], [0.165, 0.11], [0.12, 0.014], [0, 0.014]], 1.85, [[0.104, 0.175, 0.016], [0.05, 0.151, 0.01]]);
  baguette(k, [-0.28, 0.06, -0.075], [1, 0.0, 0.01], 0.56, 0.042);
  baguette(k, [-0.28, 0.06, 0.0], [1, 0.0, -0.01], 0.56, 0.042);
  baguette(k, [-0.28, 0.06, 0.075], [1, 0.0, 0.0], 0.56, 0.042);
  baguette(k, [-0.22, 0.1, 0.03], [1, 0.45, 0.06], 0.6, 0.042);
  return k.finish('baguettes');
}

function jamshelf(T) {
  const k = kit(T);
  const { add, xf, box, rod } = k;
  for (const sx of [-1, 1]) archCheek(k, sx * 0.3, 0.74, 0.28);
  for (const y of [0.05, 0.38]) {
    add('body', PAL.woodLight, xf(box(0.58, 0.035, 0.27), [0, y, -0.003]));
    add('fine', PAL.greenDeep, xf(box(0.58, 0.04, 0.022), [0, y + 0.01, 0.143]));
  }
  add('body', PAL.wood, xf(box(0.66, 0.04, 0.31), [0, 0.74, 0]));
  add('body', PAL.woodDark, rod([-0.3, 0.6, -0.125], [0.3, 0.6, -0.125], 0.018));
  [-0.17, 0, 0.17].forEach((x, i) => jar(k, at3(k, x, 0.0635, 0.0, i * 0.7), 1.0, JAMS[i][0], JAMS[i][1]));
  [-0.17, 0, 0.17].forEach((x, i) => jar(k, at3(k, x, 0.3935, 0.0, i * 0.5), 1.0, JAMS[i + 3][0], JAMS[i + 3][1]));
  return k.finish('jamshelf');
}

export const BAKERY = Object.freeze({ breadcart, baguettes, jamshelf });
