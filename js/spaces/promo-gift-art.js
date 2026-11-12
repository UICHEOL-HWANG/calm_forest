import { colored, mergeColored } from '../mountain/merge-colored.js';

const SCALE = 1.25;
const CENTERED = new Set(['promosuitcase']);

export const PROMO_SUITCASE_BOX = Object.freeze({ w: 1.6, d: 1.05 });

function kit(T) {
  const root = new T.Group();
  const part = (geo, hex, x = 0, y = 0, z = 0, parent = root) => {
    const m = new T.Mesh(geo);
    m.userData.hex = hex;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const lathe = (pr, seg = 10) => new T.LatheGeometry(pr.map(([x, y]) => new T.Vector2(x, y)), seg);
  const tube = (pts, r, seg = 16) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(([x, y, z]) => new T.Vector3(x, y, z))), seg, r, 4);
  return { root, part, lathe, tube };
}

function balloon(T, k) {
  const { root, part, lathe, tube } = k;
  part(new T.CylinderGeometry(0.08, 0.1, 0.12, 6), 0x9a7350, 0, 0.06, 0);
  part(tube([[0, 0.1, 0], [0.12, 0.6, 0.05], [0.05, 1.05, 0]], 0.008), 0x6b4a33);
  const basket = new T.Group();
  basket.position.set(0.05, 1.05, 0);
  root.add(basket);
  part(lathe([[0, 0], [0.2, 0], [0.24, 0.22], [0.25, 0.26], [0, 0.26]]), 0xc9a072, 0, 0, 0, basket);
  part(lathe([[0.235, 0.18], [0.26, 0.2], [0.26, 0.26], [0.24, 0.27]]), 0x8a5a3a, 0, 0, 0, basket);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    part(new T.CylinderGeometry(0.008, 0.008, 0.5, 4), 0x6b4a33, Math.cos(a) * 0.22, 0.5, Math.sin(a) * 0.22, basket);
  }
  const env = part(new T.BoxGeometry(0.14, 0.1, 0.02), 0xfff6e0, 0.07, 0.31, 0.17, basket);
  env.rotation.z = 0.2;
  const bal = new T.Group();
  bal.position.set(0.05, 2.2, 0);
  bal.scale.set(1, 1.15, 1);
  root.add(bal);
  for (let i = 0; i < 12; i++) {
    part(new T.SphereGeometry(0.62, 6, 14, (i / 12) * Math.PI * 2, Math.PI * 2 / 12, 0, Math.PI * 0.82), i % 2 ? 0xf6e7c8 : 0xd9574a, 0, 0, 0, bal);
  }
  part(new T.CylinderGeometry(0.2, 0.26, 0.12, 12), 0xf4cf62, 0, -0.6, 0, bal);
}

function suitcases(T, k) {
  const { root, part } = k;
  const one = (w, h, d, hex, x, y, z, ry) => {
    const c = new T.Group();
    c.position.set(x, y, z);
    c.rotation.y = ry;
    root.add(c);
    part(new T.BoxGeometry(w, h, d), hex, 0, h / 2, 0, c);
    for (const s of [-1, 1]) part(new T.BoxGeometry(0.05, h + 0.01, d + 0.01), 0x6b4a33, s * w * 0.3, h / 2, 0, c);
    part(new T.TorusGeometry(0.07, 0.02, 4, 10, Math.PI), 0x6b4a33, 0, h + 0.005, 0, c);
    part(new T.BoxGeometry(0.14, 0.1, 0.01), 0xfff6e0, w * 0.15, h * 0.55, d / 2 + 0.006, c);
  };
  one(0.9, 0.3, 0.55, 0x7fb37a, 0, 0, 0, 0.1);
  one(0.7, 0.26, 0.45, 0xe7a77a, 0.04, 0.3, 0.02, -0.2);
  one(0.42, 0.42, 0.22, 0x8fb7d9, 0.6, 0, 0.35, -0.5);
  const map = part(new T.BoxGeometry(0.3, 0.01, 0.22), 0xf6ead2, -0.05, 0.565, 0.02);
  map.rotation.y = 0.4;
}

const SHAPES = { promoballoon: balloon, promosuitcase: suitcases };

function bake(T, root) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    parts.push(colored(T, geo, o.userData.hex));
    o.geometry.dispose();
  });
  return mergeColored(T, parts);
}

export function buildPromoGift(T, id) {
  const shape = SHAPES[id];
  if (!shape) return null;
  const k = kit(T);
  shape(T, k);
  k.root.scale.setScalar(SCALE);
  const geo = bake(T, k.root);
  if (CENTERED.has(id)) {
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    geo.translate(-(b.min.x + b.max.x) / 2, 0, -(b.min.z + b.max.z) / 2);
  }
  const g = new T.Group();
  const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}
