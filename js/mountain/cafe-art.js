import { BARISTA, TABLES, ROOF, KNEE } from './cafe-layout.js';

const W = 11, D = 8.5;
const WOOD = 0x8a5a36, WOOD_D = 0x5e3b22, PLANK = 0xa9764a, SNOW = 0xf7fafd, LAMP = 0xffd27a, IRON = 0x34363c, CREAM = 0xf3e6cf, RED = 0xd2463a, BLUE = 0x2f6fd6, GREEN = 0x3f7b4f, MUSTARD = 0xe2b23c;

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function makeSink(THREE) {
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12), log: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    cone: new THREE.ConeGeometry(0.5, 1, 10), sph: new THREE.IcosahedronGeometry(0.5, 1), ball: new THREE.IcosahedronGeometry(0.5, 2),
    tor: new THREE.TorusGeometry(0.5, 0.12, 8, 16), tri: new THREE.CylinderGeometry(0.5, 0.5, 1, 3),
  };
  const solid = [], glow = [];
  const jit = (hex, a = 0.07) => new THREE.Color(hex).offsetHSL(0, 0, (rnd() - 0.5) * a).getHex();
  const add = (geo, c, p, s = [1, 1, 1], r = [0, 0, 0], o = {}) => {
    const g = geo.index ? geo.clone().toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')), new THREE.Vector3(...s));
    if (o.parent) m.premultiply(o.parent.matrix);
    g.applyMatrix4(m);
    const col = new THREE.Color(c), n = g.getAttribute('position').count, arr = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) arr.set([col.r, col.g, col.b], k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    (o.glow ? glow : solid).push(g);
  };
  const figureBase = (x, z, ry) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    g.updateMatrix();
    return g;
  };
  const dispose = () => Object.values(G).forEach(g => g.dispose());
  return { add, jit, figureBase, dispose, G, solid, glow };
}

function mergeAll(THREE, geos) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'color']) {
    const arr = new Float32Array(geos.reduce((t, g) => t + g.getAttribute(name).array.length, 0));
    geos.reduce((o, g) => { arr.set(g.getAttribute(name).array, o); return o + g.getAttribute(name).array.length; }, 0);
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  geos.forEach(g => g.dispose());
  out.computeVertexNormals();
  return out;
}

function floor(S, tone = PLANK) {
  for (let x = -W / 2 + 0.3; x < W / 2; x += 0.6) S.add(S.G.box, S.jit(tone, 0.1), [x, -0.05, 0], [0.58, 0.1, D]);
}

function mug(S, x, y, z, c = CREAM) {
  const { add, G } = S;
  add(G.cyl, c, [x, y + 0.11, z], [0.18, 0.22, 0.18]);
  add(G.cyl, 0x6b3b24, [x, y + 0.22, z], [0.15, 0.02, 0.15]);
  add(G.tor, c, [x + 0.12, y + 0.12, z], [0.12, 0.12, 0.12], [0, Math.PI / 2, 0]);
}

function priceStand(S, x, y, z, c) {
  const { add, G } = S;
  add(G.box, WOOD_D, [x, y + 0.12, z], [0.05, 0.24, 0.05]);
  add(G.box, c, [x, y + 0.28, z], [0.22, 0.14, 0.03]);
  add(G.cyl, 0xf2c94c, [x, y + 0.28, z + 0.02], [0.08, 0.02, 0.08], [Math.PI / 2, 0, 0], { glow: true });
}

function face(S, g, y, skin, eyeC = 0x3a2f2a, front = 0.33) {
  const { add, G } = S;
  [-0.13, 0.13].forEach(ex => add(G.sph, eyeC, [ex, y + 0.03, front], [0.1, 0.11, 0.06], [0, 0, 0], { parent: g }));
  [-0.22, 0.22].forEach(ex => add(G.sph, 0xf2a6a0, [ex, y - 0.09, front - 0.03], [0.12, 0.07, 0.05], [0, 0, 0], { parent: g }));
}

function fox(S, x, z, ry) {
  const { add, G } = S;
  const g = S.figureBase(x, z, ry);
  add(G.sph, 0xf4f6fa, [0, 0.55, 0], [1, 1.05, 1], [0, 0, 0], { parent: g });
  add(G.box, 0x6b4a34, [0, 0.45, 0.38], [0.6, 0.6, 0.12], [0, 0, 0], { parent: g });
  add(G.ball, 0xf8f9fc, [0, 1.15, 0], [0.76, 0.72, 0.74], [0, 0, 0], { parent: g });
  add(G.cone, 0xf8f9fc, [0, 1.08, 0.36], [0.26, 0.3, 0.26], [Math.PI / 2, 0, 0], { parent: g });
  add(G.sph, 0x2b2b30, [0, 1.08, 0.52], [0.08, 0.07, 0.07], [0, 0, 0], { parent: g });
  face(S, g, 1.22, 0xf8f9fc, 0x3a2f2a, 0.3);
  [-1, 1].forEach(s => { add(G.cone, 0xf8f9fc, [s * 0.22, 1.56, -0.02], [0.24, 0.36, 0.14], [0, 0, -s * 0.25], { parent: g }); add(G.cone, 0xf6c2c8, [s * 0.22, 1.54, 0.03], [0.12, 0.22, 0.06], [0, 0, -s * 0.25], { parent: g }); });
  add(G.tor, MUSTARD, [0, 0.9, 0], [0.48, 0.48, 0.6], [Math.PI / 2, 0, 0], { parent: g });
  add(G.box, MUSTARD, [0.2, 0.68, 0.34], [0.14, 0.4, 0.08], [0.2, 0, 0.2], { parent: g });
  add(G.ball, 0xf4f6fa, [0.1, 0.5, -0.6], [0.5, 0.5, 0.9], [0.6, 0, 0], { parent: g });
  add(G.ball, 0xe9ecf2, [0.12, 0.72, -0.98], [0.32, 0.32, 0.4], [0.6, 0, 0], { parent: g });
}

function optionC(S) {
  const { add, jit, G } = S;
  floor(S, 0x9a6a44);
  const { rise, cut } = ROOF;
  const th = Math.atan2(rise, W / 2), span = W / 2 - KNEE, len = Math.hypot(span, cut);
  [-1, 1].forEach(s => {
    for (let i = 0; i < 9; i++) add(G.box, jit(WOOD, 0.1), [s * (W / 2 - span / 2), cut / 2, -D / 2 + 0.5 + i * 0.95], [len, 0.16, 0.92], [0, 0, -s * th]);
    add(G.box, WOOD_D, [s * (W / 2 - span), cut, 0], [0.22, 0.22, D], [0, 0, -s * th]);
  });
  add(G.tri, 0x9ccff2, [0, rise / 3, -D / 2], [W / 0.866 - 0.4, 0.06, rise / 0.75 - 0.3], [-Math.PI / 2, -Math.PI / 2, -Math.PI / 2], { glow: true });
  const peaks = [[-2.8, 1.4, 1.6], [0.6, 2.3, 2.2], [3.2, 1.2, 1.5]];
  peaks.forEach(([x, h, w]) => add(G.cone, 0xeaf3fb, [x, 0.6 + h / 2, -D / 2 + 0.12], [w * 1.6, h, 0.1], [0, 0, 0], { glow: true }));
  for (let y = 0.9; y < rise - 0.6; y += 1.1) add(G.box, WOOD_D, [0, y, -D / 2 + 0.08], [(1 - y / rise) * W - 0.3, 0.1, 0.1]);
  [-1.6, 1.6].forEach(x => add(G.box, WOOD_D, [x, rise * 0.3, -D / 2 + 0.08], [0.1, rise * 0.55, 0.1]));
  add(G.box, WOOD_D, [-1.9, 2.3, -3.1], [2.6, 0.16, 2.2]);
  [-3.1, -0.7].forEach(x => add(G.box, WOOD_D, [x, 1.15, -2.1], [0.14, 2.3, 0.14]));
  for (let i = 0; i < 6; i++) add(G.box, WOOD_D, [-3.1 + i * 0.48, 2.7, -2.0], [0.07, 0.7, 0.07]);
  add(G.box, WOOD_D, [-1.9, 3.05, -2.0], [2.6, 0.09, 0.09]);
  [-1, 1].forEach(s => add(G.box, WOOD_D, [-0.3 + s * 0.3, 1.15, -1.6], [0.08, 2.4, 0.08], [0.25, 0, 0]));
  for (let i = 0; i < 6; i++) add(G.box, WOOD_D, [-0.3, 0.25 + i * 0.38, -1.5 - i * 0.09], [0.66, 0.06, 0.06]);
  [[-2.6, -3.3], [-1.6, -3.4]].forEach(([x, z], i) => { add(G.box, i ? BLUE : RED, [x, 2.55, z], [0.9, 0.3, 0.6]); add(G.ball, SNOW, [x, 2.75, z], [0.5, 0.2, 0.3]); });
  add(G.box, WOOD_D, [2.2, 0.38, -1.8], [3.2, 0.76, 0.9]);
  add(G.box, PLANK, [2.2, 0.8, -1.8], [3.5, 0.1, 1.1]);
  add(G.box, 0xc8ccd4, [3.2, 1.11, -1.9], [0.7, 0.55, 0.45]);
  add(G.box, 0x3a3d44, [3.2, 0.96, -1.66], [0.4, 0.06, 0.1]);
  add(G.cyl, 0xc8ccd4, [3.2, 1.46, -1.9], [0.3, 0.2, 0.3]);
  mug(S, 1.4, 0.85, -1.6); mug(S, 1.8, 0.85, -1.65, RED); mug(S, 2.4, 0.85, -1.6, BLUE);
  TABLES.forEach(({ x, z }) => {
    add(G.cyl, WOOD, [x, 0.75, z], [1.0, 0.07, 1.0]);
    add(G.cyl, WOOD_D, [x, 0.38, z], [0.1, 0.74, 0.1]);
    mug(S, x, 0.78, z, CREAM);
    [-0.75, 0.75].forEach(dx => { add(G.cyl, jit(MUSTARD, 0.1), [x + dx, 0.35, z], [0.48, 0.12, 0.48]); add(G.cyl, WOOD_D, [x + dx, 0.15, z], [0.08, 0.3, 0.08]); });
  });
  for (let i = 0; i < 13; i++) {
    const k = i / 12, x = -W / 2 + 1.6 + k * (W - 3.2);
    add(G.sph, i % 2 ? LAMP : 0xff9a6a, [x, 2.15 - Math.sin(k * Math.PI) * 0.4, -0.4], [0.14, 0.18, 0.14], [0, 0, 0], { glow: true });
  }
  priceStand(S, 0.9, 0.85, -1.5, MUSTARD);
}

export function buildCafeRoom(THREE) {
  seed = 11;
  const S = makeSink(THREE);
  optionC(S);
  fox(S, BARISTA.x, BARISTA.z, 0);
  S.dispose();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeAll(THREE, S.solid), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  g.add(new THREE.Mesh(mergeAll(THREE, S.glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  return g;
}
