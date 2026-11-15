import { MARKET_POS, BOARD_POS } from '../data/weekly.js';

export const WEEKLY_SOLIDS = Object.freeze([
  Object.freeze([MARKET_POS.x, MARKET_POS.z, 0.9]),
  Object.freeze([BOARD_POS.x, BOARD_POS.z, 0.55]),
]);

const MERCHANT_AT = Object.freeze({ x: 1.4, z: 0.05 });
export const MERCHANT_SOLID = Object.freeze([MARKET_POS.x + MERCHANT_AT.x, MARKET_POS.z + MERCHANT_AT.z, 0.45]);

const BOARD_TURN = 0.2;

const PAL = {
  wood: 0xa8683c, woodDark: 0x5e3b22, cream: 0xf6e7c8, red: 0xd9574a,
  canvas: 0xeadfc6, green: 0x7fb37a, greenDeep: 0x4f8a5c, gold: 0xf2c14e, cork: 0xd2a46e,
  rope: 0x8a5a3a, terracotta: 0xc4703f, leaf: 0x7fa04a, lamp: 0xffd98a, sky: 0xa9c8ef, rose: 0xf2a7a0,
};
const NOTES = [0xfff6e0, 0xf6d36b, 0x9fd3a8, 0xf2a7a0, 0xa9c8ef];

function kit(T) {
  const buckets = { body: [], fine: [], lamp: [] };
  const M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), V = new T.Vector3(), S = new T.Vector3();
  const UP = new T.Vector3(0, 1, 0);
  const xf = (geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => geo.applyMatrix4(M.compose(V.set(...p), Q.setFromEuler(E.set(...r)), S.set(...s)));
  const paint = (geo, hex) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const c = new T.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  };
  const add = (bucket, hex, geo) => { buckets[bucket].push(paint(geo, hex)); };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, seg = 10, open = false, ts = 0, tl = Math.PI * 2) => new T.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl);
  const ball = (r, detail = 1) => new T.IcosahedronGeometry(r, detail);
  const cone = (r, h, seg = 6) => new T.ConeGeometry(r, h, seg);
  const rod = (a, b, r, seg = 6) => {
    const pa = new T.Vector3(...a), pb = new T.Vector3(...b), d = pb.clone().sub(pa);
    const g = new T.CylinderGeometry(r, r, d.length(), seg);
    return g.applyMatrix4(new T.Matrix4().compose(pa.clone().add(pb).multiplyScalar(0.5), new T.Quaternion().setFromUnitVectors(UP, d.normalize()), new T.Vector3(1, 1, 1)));
  };
  const merge = (geos) => {
    const out = new T.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) {
      const total = geos.reduce((t, g) => t + g.getAttribute(name).array.length, 0);
      const arr = new Float32Array(total);
      geos.reduce((off, g) => { arr.set(g.getAttribute(name).array, off); return off + g.getAttribute(name).array.length; }, 0);
      out.setAttribute(name, new T.BufferAttribute(arr, 3));
    }
    return out;
  };
  const finish = (name) => {
    const g = new T.Group();
    g.name = name;
    const lamps = [];
    for (const [k, geos] of Object.entries(buckets)) {
      if (!geos.length) continue;
      const lamp = k === 'lamp';
      const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: lamp ? 0.6 : 0.95, metalness: 0, flatShading: true, side: T.DoubleSide, emissive: lamp ? 0xffb45a : 0x000000, emissiveIntensity: 0 });
      const mesh = new T.Mesh(merge(geos), mat);
      mesh.name = k;
      mesh.castShadow = k === 'body';
      mesh.receiveShadow = !lamp;
      g.add(mesh);
      if (lamp) lamps.push(mat);
      geos.forEach((x) => x.dispose());
    }
    g.userData.lamps = lamps;
    return g;
  };
  return { T, xf, add, box, cyl, ball, cone, rod, finish };
}

function wheel(k, r, x, y, z, spokes = 4) {
  const { T, add, xf, box, cyl } = k;
  add('body', PAL.woodDark, xf(new T.TorusGeometry(r, 0.05, 6, 18), [x, y, z]));
  add('body', PAL.wood, xf(cyl(0.085, 0.085, 0.16, 8), [x, y, z], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < spokes; i++) add('fine', PAL.wood, xf(box(0.05, r * 1.95, 0.03), [x, y, z], [0, 0, (i * Math.PI) / spokes]));
}

function goods(k, [a, b, c]) {
  const { T, add, xf, box, cyl, ball } = k;
  add('fine', PAL.terracotta, xf(cyl(0.13, 0.1, 0.2, 8), [a[0], a[1] + 0.1, a[2]]));
  add('fine', 0xa95a32, xf(cyl(0.145, 0.145, 0.045, 8), [a[0], a[1] + 0.2, a[2]]));
  add('fine', PAL.leaf, xf(ball(0.17), [a[0], a[1] + 0.34, a[2]], [0, 0, 0], [1, 0.9, 1]));
  add('fine', PAL.sky, xf(box(0.32, 0.08, 0.24), [b[0], b[1] + 0.035, b[2]], [0, 0.1, 0]));
  add('fine', PAL.rose, xf(box(0.3, 0.08, 0.22), [b[0], b[1] + 0.11, b[2]], [0, -0.15, 0]));
  add('fine', 0xfff6e0, xf(box(0.26, 0.07, 0.2), [b[0], b[1] + 0.18, b[2]], [0, 0.05, 0]));
  const jar = [[0, 0], [0.1, 0], [0.13, 0.08], [0.12, 0.18], [0.08, 0.22], [0.08, 0.26], [0, 0.26]].map(([x, y]) => new T.Vector2(x, y));
  add('fine', PAL.cream, xf(new T.LatheGeometry(jar, 8), [c[0], c[1] - 0.005, c[2]]));
  add('fine', PAL.rope, xf(cyl(0.095, 0.095, 0.05, 8), [c[0], c[1] + 0.27, c[2]]));
  add('fine', PAL.gold, xf(ball(0.11, 0), [c[0], c[1] + 0.11, c[2] + 0.06], [0, 0, 0], [0.7, 0.7, 0.35]));
}

function lantern(k, x, y, z, hang = 0.2) {
  const { add, xf, cyl, rod } = k;
  add('fine', PAL.woodDark, rod([x, y + hang, z], [x, y + 0.1, z], 0.012, 4));
  add('fine', PAL.woodDark, xf(cyl(0.06, 0.11, 0.05, 8), [x, y + 0.1, z]));
  add('lamp', PAL.lamp, xf(cyl(0.1, 0.1, 0.17, 8), [x, y, z]));
  add('fine', PAL.woodDark, xf(cyl(0.11, 0.06, 0.04, 8), [x, y - 0.1, z]));
}

function notes(k, at, spots, faceZ) {
  const { add, xf, box, ball } = k;
  spots.forEach(([x, y, rz], i) => {
    add('fine', NOTES[i], at(xf(box(0.19, 0.23, 0.012), [x, y, faceZ + 0.01], [0, 0, rz])));
    add('fine', PAL.red, at(xf(ball(0.024, 0), [x, y + 0.085, faceZ + 0.022])));
  });
}

function buildCart(T, open) {
  const k = kit(T);
  const { add, xf, box, cyl, ball, rod, cone } = k;
  const P = Math.PI;
  add('body', PAL.green, xf(box(1.3, 0.5, 0.8), [0, 0.62, 0]));
  add('body', PAL.cream, xf(box(1.36, 0.07, 0.86), [0, 0.88, 0]));
  add('body', PAL.cream, xf(box(0.9, 0.26, 0.02), [0, 0.6, 0.415]));
  add('body', PAL.greenDeep, xf(box(0.7, 0.14, 0.02), [0, 0.6, 0.43]));
  for (const s of [-1, 1]) wheel(k, 0.34, -0.25, 0.36, s * 0.48);
  for (const s of [-1, 1]) {
    add('body', PAL.woodDark, rod([0.52, 0.4, s * 0.3], [0.52, 0, s * 0.3], 0.04));
    add('body', PAL.wood, rod([-0.62, 0.8, s * 0.28], [-1.35, 0.93, s * 0.28], 0.04));
  }
  const base = [0.15, 0.9, -0.3];
  if (!open) {
    add('body', PAL.canvas, xf(box(1.42, 0.22, 0.9), [0, 0.8, 0]));
    add('body', PAL.rope, xf(box(1.44, 0.04, 0.92), [0, 0.76, 0]));
    add('body', PAL.canvas, xf(xf(cyl(0.6, 0.82, 0.3, 4), [0, 0, 0], [0, P / 4, 0]), [0, 1.05, 0], [0, 0, 0], [1.2, 1, 0.78]));
    add('body', PAL.canvas, xf(ball(0.2), [-0.3, 1.22, 0.02], [0, 0, 0], [1.1, 0.7, 1]));
    add('body', PAL.canvas, xf(ball(0.18), [0.32, 1.2, 0.06], [0, 0, 0], [1, 0.7, 1]));
    add('body', PAL.woodDark, rod(base, [0.15, 2.3, -0.3], 0.035));
    add('body', PAL.green, xf(cyl(0.03, 0.15, 0.95, 8), [0.15, 1.78, -0.3]));
    add('fine', PAL.cream, xf(new T.TorusGeometry(0.1, 0.025, 4, 10), [0.15, 1.6, -0.3], [P / 2, 0, 0]));
    add('body', PAL.gold, xf(ball(0.06, 0), [0.15, 2.32, -0.3]));
    return k.finish('cart');
  }
  const tilt = -0.12, len = 1.5;
  const top = [base[0], base[1] + len * Math.cos(tilt), base[2] + len * Math.sin(tilt)];
  add('body', PAL.woodDark, rod(base, top, 0.035));
  const at = (g) => xf(g, top, [tilt, 0, 0]);
  const RC = 1.2, HC = 0.45;
  for (let i = 0; i < 8; i++) add('body', i % 2 ? PAL.cream : PAL.green, at(xf(cyl(0.05, RC, HC, 2, true, (i * P) / 4, P / 4), [0, -HC / 2, 0])));
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * P * 2;
    add('fine', Math.floor(i / 2) % 2 ? PAL.green : PAL.cream, at(xf(cone(0.08, 0.14, 3), [Math.sin(a) * (RC - 0.02), -HC - 0.06, Math.cos(a) * (RC - 0.02)], [P, a, 0])));
  }
  add('body', PAL.gold, at(xf(ball(0.07, 0), [0, 0.04, 0])));
  goods(k, [[-0.42, 0.91, -0.1], [0.08, 0.91, 0.2], [0.45, 0.91, -0.05]]);
  add('fine', PAL.woodDark, rod([0.15, 1.85, -0.36], [0.62, 1.85, -0.36], 0.02, 4));
  lantern(k, 0.62, 1.62, -0.36, 0.23);
  return k.finish('cart');
}

function buildBoard(T) {
  const k = kit(T);
  const { add, xf, box, cyl } = k;
  const P = Math.PI;
  add('body', PAL.woodDark, xf(box(0.09, 2.15, 0.09), [0, 1.075, -0.07]));
  add('body', PAL.woodDark, xf(box(0.62, 0.08, 0.11), [0, 0.04, -0.07]));
  add('body', PAL.woodDark, xf(box(0.11, 0.08, 0.62), [0, 0.04, -0.07]));
  const at = (g) => xf(g, [0, 1.38, 0.0], [-0.18, 0, 0]);
  add('body', PAL.cork, at(xf(cyl(0.56, 0.56, 0.06, 16), [0, 0, 0], [P / 2, 0, 0])));
  add('body', PAL.green, at(new T.TorusGeometry(0.56, 0.04, 5, 24)));
  const spots = Array.from({ length: 5 }, (_, i) => {
    const a = P / 2 + (i * 2 * P) / 5;
    return [Math.cos(a) * 0.29, Math.sin(a) * 0.27 - 0.02, (i % 2 ? 1 : -1) * 0.05];
  });
  notes(k, at, spots, 0.03);
  for (let i = 0; i < 8; i++) add('body', i % 2 ? PAL.cream : PAL.green, xf(cyl(0.03, 0.42, 0.2, 2, true, (i * P) / 4, P / 4), [0, 2.08, -0.07]));
  add('body', PAL.gold, xf(k.ball(0.05, 0), [0, 2.2, -0.07]));
  add('fine', PAL.woodDark, k.rod([0.045, 1.92, -0.07], [0.62, 1.92, -0.07], 0.02, 4));
  lantern(k, 0.62, 1.72, -0.07, 0.2);
  return k.finish('board');
}

function buildMerchant(T) {
  const g = new T.Group();
  g.name = 'merchant';
  const mat = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 });
  const put = (geo, c, x, y, z, s) => {
    const m = new T.Mesh(geo, mat(c));
    m.position.set(x, y, z);
    if (s) m.scale.set(...s);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  put(new T.IcosahedronGeometry(0.5, 1), 0x4f8a8b, 0, 0.55, 0, [1, 1.05, 1]);
  put(new T.SphereGeometry(0.514, 16, 12, Math.PI / 2 - 0.62, 1.24, Math.PI / 2.4, 1.15), 0xfaf3e2, 0, 0.55, 0, [1.02, 1.02, 1.02]);
  put(new T.TorusGeometry(0.27, 0.06, 6, 16), PAL.gold, 0, 0.9, 0.04).rotation.x = Math.PI / 2 - 0.15;
  put(new T.IcosahedronGeometry(0.38, 1), 0xffe0c0, 0, 1.15, 0);
  put(new T.SphereGeometry(0.405, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), PAL.red, 0, 1.18, -0.02);
  put(new T.BoxGeometry(0.42, 0.04, 0.2), PAL.red, 0, 1.33, 0.3).rotation.x = 0.2;
  put(new T.IcosahedronGeometry(0.08, 0), PAL.cream, 0, 1.6, -0.02);
  for (const ex of [-0.13, 0.13]) put(new T.SphereGeometry(0.05, 8, 8), 0x3a2f2a, ex, 1.18, 0.32);
  return g;
}

export function buildWeeklyMarket(T, { open }) {
  const g = new T.Group();
  g.name = 'weekly-market';
  const cart = buildCart(T, open);
  cart.position.set(MARKET_POS.x, 0, MARKET_POS.z);
  if (open) {
    const m = buildMerchant(T);
    m.position.set(MERCHANT_AT.x, 0, MERCHANT_AT.z);
    m.rotation.y = -0.3;
    cart.add(m);
  }
  g.add(cart);
  const board = buildBoard(T);
  board.position.set(BOARD_POS.x, 0, BOARD_POS.z);
  board.rotation.y = BOARD_TURN;
  g.add(board);
  g.userData.lamps = [...cart.userData.lamps, ...board.userData.lamps];
  return g;
}

export function disposeWeeklyMarket(group) {
  group.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.dispose();
  });
}
