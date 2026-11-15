import { PAL, kit, at3, lantern } from './kit.js';

const PATCH = [PAL.cream, PAL.green, PAL.rose, PAL.cream, PAL.gold, PAL.celadon, PAL.cream, PAL.red];

function teapot(k, at, s, { body = PAL.celadon, lid = PAL.cream, bail = false, handle = PAL.woodDark, bucket = 'body' } = {}) {
  const { T, add, xf, lathe, cyl, ball, rod } = k;
  const S = (g) => at(xf(g, [0, 0, 0], [0, 0, 0], [s, s, s]));
  add(bucket, body, S(lathe([[0, 0], [0.09, 0], [0.13, 0.03], [0.15, 0.08], [0.14, 0.13], [0.1, 0.165], [0.06, 0.175], [0, 0.175]], 12)));
  add('fine', lid, S(xf(cyl(0.066, 0.072, 0.03, 12), [0, 0.178, 0])));
  add('fine', lid, S(xf(ball(0.028, 0), [0, 0.205, 0])));
  add(bucket, body, S(rod([0.11, 0.05, 0], [0.235, 0.16, 0], 0.03, 0.016, 8)));
  if (bail) add(bucket, handle, S(xf(new T.TorusGeometry(0.13, 0.014, 5, 14, Math.PI), [0, 0.13, 0], [0, Math.PI / 2, 0])));
  else add(bucket, body, S(xf(new T.TorusGeometry(0.06, 0.016, 5, 10, Math.PI), [-0.12, 0.09, 0], [0, 0, Math.PI / 2])));
}

function cup(k, at, s, color = PAL.cream, bucket = 'fine') {
  const { add, xf, lathe, cyl } = k;
  const S = (g) => at(xf(g, [0, 0, 0], [0, 0, 0], [s, s, s]));
  add(bucket, color, S(lathe([[0, 0], [0.045, 0], [0.05, 0.006], [0.07, 0.075], [0.062, 0.075], [0.044, 0.014], [0, 0.014]], 10)));
  add('fine', PAL.tea, S(xf(cyl(0.05, 0.05, 0.006, 10), [0, 0.05, 0])));
}


function pyeongsang(k, w, d, h, n = 6) {
  const { add, xf, box } = k;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('body', PAL.woodDark, xf(box(0.12, h - 0.06, 0.12), [sx * (w / 2 - 0.09), (h - 0.06) / 2, sz * (d / 2 - 0.09)]));
  for (const sz of [-1, 1]) add('body', PAL.woodDark, xf(box(w + 0.04, 0.1, 0.1), [0, h - 0.1, sz * (d / 2 - 0.03)]));
  for (const sx of [-1, 1]) add('body', PAL.woodDark, xf(box(0.1, 0.1, d + 0.04), [sx * (w / 2 - 0.03), h - 0.1, 0]));
  const pw = d / n;
  for (let i = 0; i < n; i++) add('body', i % 2 ? PAL.wood : PAL.woodLight, xf(box(w, 0.07, pw - 0.025), [0, h - 0.035, -d / 2 + pw * (i + 0.5)]));
}

function soban(k, x, y, z, r, hgt, top = PAL.wood) {
  const { add, xf, cyl, rod } = k;
  add('body', top, xf(cyl(r, r, 0.05, 12), [x, y + hgt - 0.025, z]));
  add('body', PAL.woodDark, xf(cyl(r * 0.84, r * 0.8, 0.08, 12), [x, y + hgt - 0.085, z]));
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    add('body', PAL.woodDark, rod([x + c * r * 0.62, y + hgt - 0.1, z + s * r * 0.62], [x + c * r * 0.82, y - 0.01, z + s * r * 0.82], 0.028, 0.034, 6));
  }
}

function teaService(k, x, y, z, s = 1, pot = PAL.celadon) {
  teapot(k, at3(k, x - 0.06 * s, y - 0.004, z - 0.04 * s, -0.5), 1.25 * s, { body: pot });
  cup(k, at3(k, x + 0.17 * s, y - 0.004, z + 0.1 * s), 1.2 * s);
  cup(k, at3(k, x - 0.02 * s, y - 0.004, z + 0.19 * s), 1.2 * s);
}

function tableLamp(k, x, y, z) {
  const { add, xf, cyl, rod } = k;
  add('fine', PAL.woodDark, xf(cyl(0.07, 0.08, 0.02, 8), [x, y + 0.01, z]));
  add('lamp', PAL.lamp, xf(cyl(0.055, 0.065, 0.13, 8), [x, y + 0.085, z]));
  add('fine', PAL.woodDark, xf(cyl(0.03, 0.07, 0.03, 8), [x, y + 0.165, z]));
  add('fine', PAL.woodDark, rod([x, y + 0.18, z], [x, y + 0.23, z], 0.008, 0.008, 4));
}

function knot(k, x, y, z, s, color, ear) {
  const { add, xf, ball, cone } = k;
  add('body', color, xf(ball(0.055 * s, 1), [x, y, z]));
  for (const sx of [-1, 1]) add('body', ear, xf(cone(0.05 * s, 0.17 * s, 5), [x + sx * 0.075 * s, y + 0.055 * s, z], [0, 0, -sx * 0.85]));
}

function teadeck(T) {
  const k = kit(T);
  const { add, xf, rod, cyl, ball } = k;
  const w = 1.6, d = 1.1, h = 0.4;
  pyeongsang(k, w, d, h, 5);
  const base = [-0.6, h - 0.05, -0.4], top = [-0.5, 2.0, -0.55];
  add('body', PAL.woodDark, rod(base, top, 0.035));
  const at = (g) => xf(g, top, [0.3, 0, 0.18]);
  const slope = 0.34;
  const slice = (r0, r1, hex) => add('body', hex, at(xf(cyl(r0, r1, (r1 - r0) * slope, 16, true), [0, -((r0 + r1) / 2) * slope, 0])));
  slice(0.05, 0.42, PAL.green);
  slice(0.42, 0.82, PAL.paper);
  slice(0.82, 0.9, PAL.green);
  slice(0.9, 1.08, PAL.paper);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    add('fine', PAL.woodDark, at(rod([0, 0.012, 0], [Math.sin(a) * 1.08, -1.08 * slope + 0.012, Math.cos(a) * 1.08], 0.008, 0.008, 4)));
  }
  add('body', PAL.gold, at(xf(ball(0.06, 0), [0, 0.03, 0])));
  add('fine', PAL.woodDark, rod([-0.53, 1.45, -0.45], [-0.12, 1.45, -0.45], 0.02, 0.02, 4));
  lantern(k, -0.12, 1.2, -0.45, 0.25);
  soban(k, 0.28, h, 0.12, 0.34, 0.22);
  teaService(k, 0.28, h + 0.22, 0.08);
  tableLamp(k, 0.48, h + 0.22, -0.08);
  return k.finish('teadeck');
}

function teacups(T) {
  const k = kit(T);
  k.add('body', PAL.wood, k.lathe([[0, 0], [0.2, 0], [0.22, 0.035], [0.205, 0.035], [0.19, 0.012], [0, 0.012]], 16));
  teapot(k, at3(k, -0.075, 0.008, 0.0, -0.4), 0.85);
  cup(k, at3(k, 0.11, 0.008, 0.075), 0.85);
  cup(k, at3(k, 0.05, 0.008, -0.12), 0.85);
  return k.finish('teacups');
}

function bojagi(T) {
  const k = kit(T);
  const g = new T.BoxGeometry(0.36, 0.25, 0.32, 2, 2, 2).toNonIndexed();
  const p = g.attributes.position, v = new T.Vector3(), R = 0.2;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.lerp(v.clone().setLength(R), 0.6);
    p.setXYZ(i, v.x, Math.max(v.y, -0.105), v.z);
  }
  g.computeVertexNormals();
  g.translate(0, 0.101, 0);
  const col = new Float32Array(p.count * 3), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    c.set(PATCH[(Math.floor(i / 6) * 3 + 1) % PATCH.length]);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  k.addRaw('body', g);
  k.add('body', PAL.redDeep, k.xf(k.cyl(0.03, 0.09, 0.07, 6), [0, 0.245, 0]));
  knot(k, 0, 0.29, 0, 0.85, PAL.redDeep, PAL.red);
  return k.finish('bojagi');
}

export const TEA = Object.freeze({ teadeck, teacups, bojagi });
