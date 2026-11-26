import { STAGE_POS } from '../data/concert.js';

export const DECK_H = 0.14;

export const STAGE_SOLIDS = Object.freeze([
  Object.freeze([STAGE_POS.x, STAGE_POS.z - 1.65, 1.0]),
  Object.freeze([STAGE_POS.x - 1.6, STAGE_POS.z - 0.95, 0.9]),
  Object.freeze([STAGE_POS.x + 1.6, STAGE_POS.z - 0.95, 0.9]),
]);

const PAL = {
  wood: 0xa8683c, woodDark: 0x5e3b22, woodLight: 0xd6a36c, woodDeep: 0x8a5630,
  cream: 0xf6e7c8, coral: 0xf0b59c, lamp: 0xffd98a,
};

const SHELL = { n: 7, R: 2.42, r0: 0.32, sy: 1.22, base: 0.04, zBack: -1.45, wrap: 0.7, recline: 0.42, ridge: 0.1, lobe: 0.11 };
const SEATS = [[-2.15, 2.15], [2.15, 2.15]];
export const SEAT_SOLIDS = Object.freeze(SEATS.map(([x, z]) => Object.freeze([STAGE_POS.x + x, STAGE_POS.z + z, 0.6])));
const BAND = [
  { body: 0xf3eeea, belly: 0xffffff, id: 'rabbit', R: 0.46, bs: [1, 0.96, 1], headR: 0.39, headY: 1.12, x: -1.28, z: -0.62, ry: 0.32, s: 0.8 },
  { body: 0xffe05a, belly: 0xfff0a0, id: 'chick', R: 0.5, bs: [1.02, 0.94, 1.02], headR: 0.35, headY: 1.06, x: 1.28, z: -0.62, ry: -0.32, s: 0.82 },
];
const SWAY = 5 * Math.PI / 180;
const CLAPS_PER_SEAT = 2;
const CLAP_SIZE = 0.42;
const CLAP_Y = 1.05;
const FILL = Object.freeze({ color: 0xffc98a, distance: 7, at: [0, 2.6, 2.4] });

const kits = new WeakMap();

function kit(T) {
  const buckets = { body: [], fine: [], lamp: [] };
  const M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), V = new T.Vector3(), S = new T.Vector3();
  const xf = (geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => geo.applyMatrix4(M.compose(V.set(...p), Q.setFromEuler(E.set(...r)), S.set(...s)));
  const paint = (geo, hex) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const c = new T.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  };
  const add = (bucket, hex, geo) => { buckets[bucket].push(paint(geo, hex)); };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, seg = 10) => new T.CylinderGeometry(rt, rb, h, seg);
  const ball = (r, detail = 1) => new T.IcosahedronGeometry(r, detail);
  const tube = (pts, r, seg, n) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p))), n, r, seg);
  const patch = (fn, U, W) => {
    const a = [];
    const push = (u, w) => { a.push(...fn(u / U, w / W)); };
    for (let u = 0; u < U; u++) for (let w = 0; w < W; w++) {
      push(u, w); push(u + 1, w + 1); push(u + 1, w);
      push(u, w); push(u, w + 1); push(u + 1, w + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(a), 3));
    g.computeVertexNormals();
    return g;
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
  const mat = (lamp) => new T.MeshStandardMaterial({ vertexColors: true, roughness: lamp ? 0.6 : 0.95, metalness: 0, flatShading: true, side: T.DoubleSide, emissive: lamp ? 0xffb45a : 0x000000, emissiveIntensity: 0 });
  const finish = (g) => {
    const lamps = [];
    for (const [key, geos] of Object.entries(buckets)) {
      if (!geos.length) continue;
      const lamp = key === 'lamp';
      const geo = merge(geos);
      let material = mat(lamp);
      if (lamp) {
        const half = geos.slice(0, geos.length >> 1).reduce((n, x) => n + x.attributes.position.count, 0);
        geo.addGroup(0, half, 0);
        geo.addGroup(half, geo.attributes.position.count - half, 1);
        material = [material, mat(true)];
        lamps.push(...material);
      }
      const mesh = new T.Mesh(geo, material);
      mesh.name = key;
      mesh.castShadow = key === 'body';
      mesh.receiveShadow = !lamp;
      g.add(mesh);
      geos.forEach((x) => x.dispose());
    }
    return lamps;
  };
  return { T, xf, add, box, cyl, ball, tube, patch, finish };
}

function deck(k, r) {
  const { add, xf, box, cyl } = k;
  add('body', PAL.woodDeep, xf(cyl(r, r + 0.05, DECK_H, 28), [0, DECK_H / 2, 0]));
  add('body', PAL.woodLight, xf(cyl(r - 0.07, r - 0.07, 0.016, 28), [0, DECK_H + 0.002, 0]));
  for (const z of [-1.14, -0.38, 0.38, 1.14]) {
    const half = Math.sqrt((r - 0.07) ** 2 - z * z);
    add('fine', PAL.wood, xf(box(half * 2 - 0.06, 0.006, 0.028), [0, DECK_H + 0.0125, z]));
  }
}

function shellPoint(i, u, w) {
  const o = SHELL;
  const th = Math.PI * (i + u) / o.n;
  const rim = o.R * (1 - o.lobe * (1 - Math.sin(Math.PI * u)));
  const r = o.r0 + (rim - o.r0) * w, rn = r / o.R;
  return [r * Math.cos(th), o.base + r * Math.sin(th) * o.sy, o.zBack + o.wrap * Math.cos(th) ** 2 * rn * rn - o.recline * Math.sin(th) * rn * rn + o.ridge * Math.sin(Math.PI * u) * w];
}

function shell(k) {
  const { T, add, xf, ball, tube, patch } = k;
  const o = SHELL;
  for (let i = 0; i < o.n; i++) add('body', i % 2 ? PAL.coral : PAL.cream, patch((u, w) => shellPoint(i, u, w), 4, 4));
  const rim = [];
  for (let i = 0; i < o.n; i++) for (let s = 0; s < 6; s++) rim.push(shellPoint(i, s / 6, 1));
  rim.push(shellPoint(o.n - 1, 1, 1));
  add('body', PAL.wood, tube(rim.map(([x, y, z]) => [x, y, z + 0.02]), 0.06, 5, 96));
  const hinge = new T.Shape();
  hinge.absarc(0, 0, 0.62, 0, Math.PI);
  add('body', PAL.wood, xf(new T.ExtrudeGeometry(hinge, { depth: 0.16, bevelEnabled: false, curveSegments: 6 }), [0, o.base, o.zBack - 0.05], [0, 0, 0], [1, o.sy * 0.9, 1]));
  for (let i = 1; i < o.n; i++) {
    const [x, y, z] = shellPoint(i, 0, 1);
    add('lamp', PAL.lamp, xf(ball(0.125, 1), [x * 0.985, y - 0.03, z + 0.14]));
  }
}

function bench(k, x, z) {
  const { add, xf, box } = k;
  const at = (g) => xf(g, [x, 0, z], [0, Math.atan2(x, z), 0]);
  add('body', PAL.woodLight, at(xf(box(1.36, 0.09, 0.42), [0, 0.44, 0])));
  for (const s of [-1, 1]) add('body', PAL.woodDark, at(xf(box(0.1, 0.4, 0.34), [s * 0.5, 0.2, 0])));
}

const plush = (T, color) => new T.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 });

function bandMember(T, a) {
  const root = new T.Group();
  const bodyY = a.R * a.bs[1] + 0.02;
  const body = new T.Mesh(new T.SphereGeometry(a.R, 32, 24), plush(T, a.body));
  body.position.y = bodyY;
  body.scale.set(...a.bs);
  body.castShadow = true;
  root.add(body);
  const belly = new T.Mesh(new T.SphereGeometry(a.R * 0.62, 24, 18), plush(T, a.belly));
  belly.position.set(0, bodyY - a.R * 0.16, a.R * 0.55);
  belly.scale.set(1, 1.1, 0.6);
  root.add(belly);
  root.position.set(a.x, DECK_H + 0.012, a.z);
  root.rotation.y = a.ry;
  root.scale.setScalar(a.s);
  return root;
}

function addHeads(band) {
  import('../animal-faces.js').then(({ buildAnimalHead }) => {
    band.forEach((m, i) => {
      const a = BAND[i];
      m.add(buildAnimalHead(a.id, { HR: a.headR, HY: a.headY, body: a.body, belly: a.belly }));
    });
  });
}

export function buildConcertStage(T) {
  const g = new T.Group();
  g.name = 'concert-stage';
  g.position.set(STAGE_POS.x, 0, STAGE_POS.z);
  const k = kit(T);
  deck(k, 1.9);
  shell(k);
  SEATS.forEach(([x, z]) => bench(k, x, z));
  const lamps = k.finish(g);
  const band = BAND.map((a) => bandMember(T, a));
  band.forEach((m) => g.add(m));
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') addHeads(band);
  const fill = new T.PointLight(FILL.color, 0, FILL.distance);
  fill.position.set(...FILL.at);
  g.add(fill);
  kits.set(g, T);
  g.userData.fill = fill;
  g.userData.lamps = lamps;
  g.userData.band = band;
  g.userData.seats = SEATS.map(([x, z]) => ({ x: STAGE_POS.x + x, z: STAGE_POS.z + z }));
  return g;
}

function clapTexture(T) {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const x = c.getContext('2d');
  x.font = '72px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('👏', 48, 54);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

function makeClaps(group, T) {
  const map = clapTexture(T);
  const claps = [];
  SEATS.forEach(([x, z], s) => {
    const along = [Math.cos(Math.atan2(x, z)), -Math.sin(Math.atan2(x, z))];
    for (let i = 0; i < CLAPS_PER_SEAT; i++) {
      const off = (i - (CLAPS_PER_SEAT - 1) / 2) * 0.55;
      const sp = new T.Sprite(new T.SpriteMaterial({ map, transparent: true, depthWrite: false }));
      sp.scale.set(CLAP_SIZE, CLAP_SIZE, 1);
      sp.position.set(x + along[0] * off, CLAP_Y, z + along[1] * off);
      sp.visible = false;
      sp.userData.ph = s * 1.7 + i * 0.9;
      group.add(sp);
      claps.push(sp);
    }
  });
  return claps;
}

export function stageCheer(group, level) {
  if (!group.userData.claps) {
    if (level <= 0 || !kits.has(group)) return;
    group.userData.claps = makeClaps(group, kits.get(group));
  }
  const claps = group.userData.claps;
  const shown = Math.ceil(Math.max(0, Math.min(1, level)) * claps.length);
  const t = performance.now() / 1000;
  claps.forEach((sp, i) => {
    sp.visible = i < shown;
    if (!sp.visible) return;
    const beat = Math.abs(Math.sin(t * 6 + sp.userData.ph));
    sp.position.y = CLAP_Y + beat * 0.12;
    sp.scale.setScalar(CLAP_SIZE * (0.9 + beat * 0.2));
  });
}

export function stageSway(group, beatPhase) {
  group.userData.band.forEach((m, i) => {
    m.rotation.z = Math.sin((beatPhase + i * 0.5) * Math.PI * 2) * SWAY;
  });
}

export function disposeConcertStage(group) {
  group.traverse((o) => {
    if (!o.isMesh && !o.isSprite) return;
    o.geometry?.dispose();
    for (const m of [o.material].flat()) {
      m.map?.dispose();
      m.dispose();
    }
  });
}
