import { colored, mergeColored } from '../mountain/merge-colored.js';

export const SIGNUP_GIFT_IDS = Object.freeze(['giftsprout', 'giftmailbox', 'giftlantern']);

const SCALE = 1.3;
const BUD = 0xf4cf62;
const PAPER = 0xf2b25a;

function kit(T) {
  const root = new T.Group();
  const part = (geo, hex, x = 0, y = 0, z = 0, parent = root) => {
    const m = new T.Mesh(geo);
    m.userData.hex = hex;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const glow = (geo, x = 0, y = 0, z = 0, parent = root) => {
    const m = part(geo, 0, x, y, z, parent);
    m.userData.glow = true;
    return m;
  };
  const lathe = (pr, seg = 14) => new T.LatheGeometry(pr.map(([x, y]) => new T.Vector2(x, y)), seg);
  const heart = (r) => {
    const s = new T.Shape();
    s.moveTo(0, -r);
    s.bezierCurveTo(r * 0.4, -r * 0.6, r * 1.1, -r * 0.2, r, r * 0.3);
    s.bezierCurveTo(r * 0.9, r * 0.9, r * 0.2, r, 0, r * 0.5);
    s.bezierCurveTo(-r * 0.2, r, -r * 0.9, r * 0.9, -r, r * 0.3);
    s.bezierCurveTo(-r * 1.1, -r * 0.2, -r * 0.4, -r * 0.6, 0, -r);
    return new T.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
  };
  return { root, part, glow, lathe, heart };
}

function sprout(T, k) {
  const { part, glow, lathe } = k;
  part(lathe([[0, 0], [0.26, 0], [0.3, 0.06], [0.36, 0.42], [0.4, 0.46], [0.4, 0.52], [0.33, 0.52], [0.3, 0.44], [0, 0.44]]), 0xd9845a);
  part(lathe([[0.355, 0.24], [0.375, 0.26], [0.38, 0.33], [0.36, 0.35]]), 0xf6e3c4);
  part(new T.CylinderGeometry(0.31, 0.31, 0.03, 14), 0x6b4a33, 0, 0.46, 0);
  part(new T.CylinderGeometry(0.035, 0.045, 0.55, 6), 0x6fa860, 0, 0.74, 0);
  const leafShape = new T.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.18, 0.14, 0.42, 0.12, 0.5, 0);
  leafShape.bezierCurveTo(0.42, -0.12, 0.18, -0.12, 0, 0);
  [0, Math.PI].forEach(ry => {
    const leaf = part(new T.ExtrudeGeometry(leafShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }), 0x86c06b, 0, 0.98, 0);
    leaf.rotation.set(0, ry, 0.45);
  });
  const bud = glow(new T.OctahedronGeometry(0.11, 0), 0, 1.08, 0);
  bud.scale.set(1, 1.3, 1);
  const tag = new T.Group();
  tag.position.set(0.24, 0.44, 0.16);
  tag.rotation.y = -0.4;
  k.root.add(tag);
  part(new T.BoxGeometry(0.03, 0.38, 0.03), 0xb98a5a, 0, 0.19, 0, tag);
  part(new T.BoxGeometry(0.3, 0.16, 0.03), 0xf6ead2, 0, 0.38, 0.01, tag);
  part(new T.BoxGeometry(0.06, 0.06, 0.035), 0xe2574c, -0.09, 0.38, 0.015, tag);
  return BUD;
}

function mailbox(T, k) {
  const { part, heart } = k;
  part(new T.BoxGeometry(0.12, 0.85, 0.12), 0x8a5a3a, 0, 0.42, 0);
  part(new T.CylinderGeometry(0.22, 0.26, 0.06, 7), 0xb7ad9c, 0, 0.03, 0);
  const box = new T.Group();
  box.position.set(0, 1.05, 0);
  k.root.add(box);
  const wood = 0xc99a68;
  part(new T.BoxGeometry(0.46, 0.4, 0.4), wood, 0, 0, 0, box);
  [-1, 1].forEach(sd => {
    const r = part(new T.BoxGeometry(0.4, 0.05, 0.5), 0x6f9a5c, sd * 0.12, 0.33, 0, box);
    r.rotation.z = -sd * 0.76;
  });
  const gable = new T.Shape();
  gable.moveTo(-0.23, 0.2);
  gable.lineTo(0.23, 0.2);
  gable.lineTo(0, 0.42);
  gable.closePath();
  [0.19, -0.21].forEach(z => part(new T.ExtrudeGeometry(gable, { depth: 0.02, bevelEnabled: false }), wood, 0, 0, z, box));
  part(new T.BoxGeometry(0.28, 0.04, 0.02), 0x3a2a22, 0, 0.06, 0.205, box);
  part(heart(0.055), 0xe2574c, 0, -0.08, 0.2, box);
  const letter = part(new T.BoxGeometry(0.2, 0.13, 0.02), 0xffffff, 0.05, 0.12, 0.22, box);
  letter.rotation.z = -0.15;
  return null;
}

function lantern(T, k) {
  const { part, glow, lathe } = k;
  const pole = 0x8a5a3a;
  part(new T.CylinderGeometry(0.3, 0.36, 0.14, 8), 0xb7ad9c, 0, 0.07, 0);
  part(new T.CylinderGeometry(0.07, 0.09, 1.3, 6), pole, 0, 0.78, 0);
  part(new T.BoxGeometry(0.5, 0.06, 0.06), pole, 0.2, 1.38, 0);
  const curl = part(new T.TorusGeometry(0.08, 0.025, 5, 10, Math.PI), pole, 0.45, 1.32, 0);
  curl.rotation.z = -Math.PI / 2;
  const lamp = new T.Group();
  lamp.position.set(0.45, 1.06, 0);
  k.root.add(lamp);
  part(new T.CylinderGeometry(0.01, 0.01, 0.12, 4), 0x4a3a2a, 0, 0.06, 0, lamp);
  glow(lathe([[0, -0.2], [0.13, -0.18], [0.2, -0.08], [0.21, 0.02], [0.17, 0.12], [0.08, 0.17], [0, 0.17]], 10), 0, 0, 0, lamp);
  part(new T.CylinderGeometry(0.1, 0.12, 0.04, 8), 0x6b3a2a, 0, 0.18, 0, lamp);
  part(new T.CylinderGeometry(0.12, 0.1, 0.04, 8), 0x6b3a2a, 0, -0.21, 0, lamp);
  [-1, 1].forEach(s => part(new T.BoxGeometry(0.42, 0.02, 0.02), 0xd95a4a, 0, -0.02 + s * 0.06, 0, lamp));
  const path = new T.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => {
    const a = i * 0.85;
    return new T.Vector3(Math.cos(a) * 0.085, 0.2 + i * 0.075, Math.sin(a) * 0.085);
  }));
  part(new T.TubeGeometry(path, 40, 0.018, 5), 0x5f9a52);
  for (let i = 1; i < 12; i += 2) {
    const a = i * 0.85;
    const l = part(new T.SphereGeometry(0.055, 6, 4), i % 4 === 1 ? 0x86c06b : 0x6fa860, Math.cos(a) * 0.12, 0.2 + i * 0.075, Math.sin(a) * 0.12);
    l.scale.set(1.4, 0.45, 0.9);
    l.rotation.y = -a;
  }
  const sign = new T.Group();
  sign.position.set(0, 0.96, 0.09);
  k.root.add(sign);
  part(new T.BoxGeometry(0.34, 0.2, 0.03), 0xf6ead2, 0, 0, 0, sign);
  part(new T.BoxGeometry(0.08, 0.08, 0.035), 0xe2574c, 0, 0, 0.002, sign);
  return PAPER;
}

const SHAPES = { giftsprout: sprout, giftmailbox: mailbox, giftlantern: lantern };

function bake(T, root) {
  root.updateMatrixWorld(true);
  const body = [], lit = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    (o.userData.glow ? lit : body).push(colored(T, geo, o.userData.hex));
    o.geometry.dispose();
  });
  return { body: mergeColored(T, body), lit: lit.length ? mergeColored(T, lit) : null };
}

export function buildSignupGift(T, id, onNight = null) {
  const shape = SHAPES[id];
  if (!shape) return null;
  const k = kit(T);
  const glowHex = shape(T, k);
  k.root.scale.setScalar(SCALE);
  const { body, lit } = bake(T, k.root);
  const g = new T.Group();
  const mesh = new T.Mesh(body, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  if (lit) {
    const night = id === 'giftlantern' && onNight;
    const mat = new T.MeshStandardMaterial({ color: glowHex, emissive: glowHex, emissiveIntensity: night ? 0 : 0.3, roughness: 0.6 });
    if (night) onNight(mat);
    const glowMesh = new T.Mesh(lit, mat);
    glowMesh.castShadow = true;
    g.add(glowMesh);
  }
  return g;
}
