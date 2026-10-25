import * as THREE from 'three';

const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...extra });
const glow = (c, k = 0.9) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.35 });
const M = (geo, m, parent, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], shadow = true) => {
  const o = new THREE.Mesh(geo, m); o.position.set(...p); o.rotation.set(...r); o.scale.set(...s); o.castShadow = shadow; parent.add(o); return o;
};
const pair = fn => [-1, 1].map(fn);

function teardrop(r, len, tip = 0.3, flatBottom = 0.3) {
  const g = new THREE.SphereGeometry(r, 18, 14);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const zN = v.z / r, back = Math.max(0, -zN);
    const k = 1 - (1 - tip) * Math.pow(back, 1.4);
    v.x *= k; v.y *= k;
    if (v.y < 0) v.y *= 1 - flatBottom;
    v.z = zN * len / 2;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function crystal(r, h) {
  const prism = new THREE.CylinderGeometry(r, r * 1.08, h, 6); prism.translate(0, h / 2, 0);
  const tip = new THREE.ConeGeometry(r, r * 1.7, 6); tip.translate(0, h + r * 0.85, 0);
  return [prism, tip];
}

export function makeOreChunk() {
  const g = new THREE.Group();
  M(new THREE.IcosahedronGeometry(0.15, 0), mat(0x5a5854, { flatShading: true }), g);
  M(new THREE.IcosahedronGeometry(0.075, 0), glow(0x5ad0e0, 0.7), g, [0.07, 0.08, 0.05]);
  return g;
}

function crystalCrab() {
  const K = { SKIN: 0xe0795a, SKIN2: 0xf2b08f, ROCK: 0x6b6e78, XA: 0x9be3ee, XB: 0xc7a6f0, DARK: 0x1c1816 };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  M(new THREE.IcosahedronGeometry(0.3, 0), mat(K.ROCK, { flatShading: true }), body, [0, 0.3, -0.06], [0.3, 0.4, 0], [1.05, 0.72, 0.95]);
  const cluster = new THREE.Group(); cluster.position.set(0, 0.45, -0.08); body.add(cluster);
  [
    [0.00, 0.00, 0.00, 0.07, 0.30, 0.00, 0.0, K.XA],
    [0.11, -0.02, 0.05, 0.05, 0.20, -0.5, 0.2, K.XB],
    [-0.12, -0.03, -0.02, 0.055, 0.22, 0.55, -0.1, K.XA],
    [0.03, -0.04, -0.14, 0.045, 0.16, 0.2, -0.6, K.XB],
  ].forEach(([x, y, z, r, h, rz, rx, c]) => {
    const part = new THREE.Group(); part.position.set(x, y, z); part.rotation.set(rx, 0, rz); cluster.add(part);
    const m = glow(c, 0.35);
    crystal(r, h).forEach(geo => M(geo, m, part));
  });
  M(teardrop(0.17, 0.34, 0.5, 0.4), mat(K.SKIN), body, [0, 0.16, 0.16], [0.15, 0, 0], [1.25, 0.8, 1]);
  pair(sd => {
    M(new THREE.CylinderGeometry(0.016, 0.02, 0.2, 6), mat(K.SKIN), body, [sd * 0.07, 0.32, 0.26], [0.25, 0, -sd * 0.15]);
    M(new THREE.SphereGeometry(0.038, 10, 8), mat(K.DARK), body, [sd * 0.085, 0.42, 0.29]);
    const arm = new THREE.Group(); arm.position.set(sd * 0.18, 0.15, 0.3); arm.rotation.y = -sd * 0.35; body.add(arm);
    const big = sd > 0 ? 1.25 : 0.85;
    M(teardrop(0.08 * big, 0.22 * big, 0.5, 0.2), mat(K.SKIN), arm, [0, 0, 0.06 * big]);
    M(new THREE.ConeGeometry(0.04 * big, 0.14 * big, 6), mat(K.SKIN2), arm, [0, 0.045, 0.2 * big], [Math.PI / 2, 0, 0], [1, 1, 0.6]);
    M(new THREE.ConeGeometry(0.03 * big, 0.11 * big, 6), mat(K.SKIN2), arm, [0, -0.005, 0.19 * big], [Math.PI / 2 + 0.15, 0, 0], [1, 1, 0.6]);
    for (let k = 0; k < 3; k++) {
      const leg = new THREE.Group(); leg.position.set(sd * 0.14, 0.14, 0.12 - k * 0.11); body.add(leg);
      M(new THREE.CylinderGeometry(0.02, 0.017, 0.17, 5), mat(K.SKIN), leg, [sd * 0.07, 0.03, 0], [0, 0, sd * 1.15]);
      M(new THREE.CylinderGeometry(0.017, 0.008, 0.17, 5), mat(K.SKIN2), leg, [sd * 0.16, -0.06, 0], [0, 0, sd * 0.35]);
    }
  });
  return { g, holdAt: new THREE.Vector3(0, 0.2, 0.42) };
}

function leafBat() {
  const K = { FUR: 0x8a6fa8, BELLY: 0xd8c4e0, EARIN: 0xf0a8b8, WING: 0x5c4878, BONE: 0x463660, DARK: 0x1c1818 };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  M(teardrop(0.17, 0.4, 0.5, 0.1), mat(K.FUR), body, [0, 0, 0], [Math.PI / 2, 0, 0]);
  M(teardrop(0.12, 0.3, 0.5, 0.1), mat(K.BELLY), body, [0, -0.02, 0.07], [Math.PI / 2, 0, 0], [0.9, 1, 0.8], false);
  const head = new THREE.Group(); head.position.set(0, 0.2, 0.04); body.add(head);
  M(new THREE.SphereGeometry(0.12, 14, 10), mat(K.FUR), head, [0, 0, 0], [0, 0, 0], [1, 0.9, 0.95]);
  M(new THREE.ConeGeometry(0.045, 0.09, 8), mat(K.BELLY), head, [0, -0.03, 0.11], [Math.PI / 2, 0, 0], [1.3, 1, 0.8]);
  pair(sd => M(new THREE.SphereGeometry(0.022, 8, 6), mat(K.DARK), head, [sd * 0.055, 0.02, 0.1]));
  pair(sd => {
    const ear = new THREE.Group(); ear.position.set(sd * 0.08, 0.05, 0); ear.rotation.set(-0.15, 0, -sd * 1.0); head.add(ear);
    M(teardrop(0.15, 0.3, 0.15, 0), mat(K.FUR), ear, [0, 0.13, 0], [-Math.PI / 2, 0, 0], [1.25, 0.22, 1]);
    M(teardrop(0.11, 0.23, 0.15, 0), mat(K.EARIN), ear, [0, 0.12, 0.02], [-Math.PI / 2, 0, 0], [1.25, 0.15, 1], false);
  });
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.1); wingShape.bezierCurveTo(0.2, 0.22, 0.45, 0.3, 0.7, 0.26);
  wingShape.quadraticCurveTo(0.6, 0.1, 0.62, -0.08); wingShape.quadraticCurveTo(0.5, 0.0, 0.42, -0.14);
  wingShape.quadraticCurveTo(0.3, -0.04, 0.22, -0.18); wingShape.quadraticCurveTo(0.12, -0.08, 0, -0.16);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 12);
  pair(sd => {
    const pivot = new THREE.Group(); pivot.position.set(sd * 0.1, 0.05, -0.02); pivot.rotation.z = sd * 0.35; body.add(pivot);
    M(wingGeo, mat(K.WING, { side: THREE.DoubleSide }), pivot, [0, 0, 0], [0, 0, 0], [sd, 1, 1]);
    [[0.7, 0.26], [0.62, -0.08], [0.42, -0.14]].forEach(([x, y]) => {
      M(new THREE.CylinderGeometry(0.01, 0.012, Math.hypot(x, y), 4), mat(K.BONE), pivot, [sd * x / 2, y / 2, 0.006], [0, 0, -Math.atan2(sd * x, y)]);
    });
  });
  body.rotation.x = -0.35;
  return { g, holdAt: new THREE.Vector3(0, -0.28, 0.06), hover: 0.8 };
}

function caveAxolotl({ submerged = false } = {}) {
  const K = { SKIN: 0xf0b3bd, GILL: 0xd9546e, BELLY: 0xf7d4d8, DARK: 0x1c1816 };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  M(teardrop(0.17, 0.62, 0.35, 0.45), mat(K.SKIN), body, [0, 0.13, 0]);
  M(teardrop(0.14, 0.5, 0.4, 0.5), mat(K.BELLY), body, [0, 0.09, 0.02], [0, 0, 0], [0.92, 0.55, 1], false);
  M(new THREE.SphereGeometry(0.15, 14, 10), mat(K.SKIN), body, [0, 0.15, 0.3], [0, 0, 0], [1.25, 0.8, 1]);
  const tail = new THREE.Group(); tail.position.set(0, 0.13, -0.28); tail.rotation.y = 0.25; body.add(tail);
  M(teardrop(0.1, 0.5, 0.05, 0), mat(K.SKIN), tail, [0, 0, -0.2], [0, 0, 0], [0.35, 1, 1]);
  pair(sd => {
    [0.5, 0, -0.5].forEach((a, i) => M(new THREE.ConeGeometry(0.05, 0.28, 5), mat(K.GILL), body, [sd * 0.24, 0.24, 0.26 + (1 - i) * 0.05], [a, 0, -sd * (0.75 + i * 0.35)]));
    [0.18, -0.15].forEach(z => M(teardrop(0.035, 0.13, 0.6, 0), mat(K.SKIN), body, [sd * 0.17, 0.05, z], [0, sd * 1.1, 0]));
  });
  pair(sd => M(new THREE.SphereGeometry(0.025, 8, 6), mat(K.DARK), body, [sd * 0.1, 0.2, 0.4]));
  if (submerged) body.position.y = -0.2;
  return { g, holdAt: new THREE.Vector3(0, 0.12, 0.5) };
}

function lampGrub() {
  const K = { BODY: 0xe4dbef, BAND: 0x9a86b8, LAMP: 0xd9f27a, DARK: 0x1c1816, FEEL: 0x6e5c88 };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const N = 6;
  let head;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1), r = 0.11 + 0.06 * Math.sin(Math.min(1, u * 1.3) * Math.PI);
    const sg = new THREE.Group(); sg.position.set(0, r + (i % 2 ? 0.03 : 0), 0.36 - i * 0.15); body.add(sg);
    const isLamp = i === N - 1;
    M(new THREE.SphereGeometry(r, 16, 12), isLamp ? glow(K.LAMP, 1.1) : mat(K.BODY), sg, [0, 0, 0], [0, 0, 0], [1.05, 0.92, 0.9]);
    if (!isLamp && i > 0) M(new THREE.SphereGeometry(r * 1.01, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.32), mat(K.BAND), sg, [0, 0, 0], [0, 0, 0], [1.05, 0.92, 0.9], false);
    if (i === 0) head = sg;
  }
  pair(sd => M(new THREE.SphereGeometry(0.022, 8, 6), mat(K.DARK), head, [sd * 0.06, 0.04, 0.1]));
  pair(sd => {
    M(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 4), mat(K.FEEL), head, [sd * 0.05, 0.14, 0.08], [0.5, 0, -sd * 0.35]);
    M(new THREE.SphereGeometry(0.022, 8, 6), mat(K.FEEL), head, [sd * 0.08, 0.21, 0.12]);
  });
  const light = new THREE.PointLight(0xd9f27a, 1.4, 3.2, 1.6); light.position.set(0, 0.2, -0.4); body.add(light);
  return { g, holdAt: new THREE.Vector3(0, 0.36, 0.06) };
}

const BUILD = { crab: crystalCrab, bat: leafBat, axolotl: caveAxolotl, grub: lampGrub };

export function makePest(id, opts) {
  const p = BUILD[id](opts);
  p.g.scale.setScalar(1.6);
  return p;
}

export function makePuddle(r = 0.75) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshStandardMaterial({ color: 0x2f6a80, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.97 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.04; water.scale.set(1, 0.72, 1); g.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 6, 28), mat(0x4a4a50, { flatShading: true }));
  rim.rotation.x = -Math.PI / 2; rim.scale.set(1, 0.72, 1); rim.position.y = 0.04; g.add(rim);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.3, r * 0.34, 24), new THREE.MeshBasicMaterial({ color: 0xbfe4ee, transparent: true, opacity: 0.6 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  return g;
}

export function makeBurrow() {
  const g = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), new THREE.MeshBasicMaterial({ color: 0x050608 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.02; g.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 6, 18), mat(0x4a4440, { flatShading: true }));
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.02; g.add(rim);
  return g;
}

export function makeTrail(points) {
  const g = new THREE.Group();
  points.forEach(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd9f27a, transparent: true, opacity: 0.35 + 0.6 * (i / (points.length - 1)) }));
    m.position.set(x, 0.06, z); g.add(m);
  });
  return g;
}

export function makeRing(r = 0.5) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.84, r, 32), new THREE.MeshBasicMaterial({ color: 0xffe48a, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.04;
  return m;
}

export function makeBait() {
  const g = new THREE.Group();
  M(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8), mat(0xeee3c8), g, [0, 0.08, 0]);
  M(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc4553c), g, [0, 0.15, 0], [0, 0, 0], [1, 0.7, 1]);
  return g;
}

export function emojiBubble(txt, size = 0.85) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,250,242,.95)'; x.beginPath(); x.arc(64, 58, 50, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(52, 100); x.lineTo(64, 122); x.lineTo(76, 100); x.fill();
  x.font = '62px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 64, 62);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.setScalar(size); sp.renderOrder = 10; return sp;
}

export function makeShaft() {
  const g = new THREE.Group();
  const wood = mat(0x7a5232, { flatShading: true });
  const hole = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 1.3), new THREE.MeshBasicMaterial({ color: 0x050608 }));
  hole.position.y = 0.02; g.add(hole);
  for (const [x, z, w, d] of [[0, 0.7, 1.6, 0.14], [0, -0.7, 1.6, 0.14], [0.7, 0, 0.14, 1.6], [-0.7, 0, 0.14, 1.6]]) M(new THREE.BoxGeometry(w, 0.16, d), wood, g, [x, 0.08, z]);
  for (const x of [-0.6, 0.6]) M(new THREE.BoxGeometry(0.12, 1.3, 0.12), wood, g, [x, 0.65, -0.7]);
  M(new THREE.BoxGeometry(1.4, 0.12, 0.12), wood, g, [0, 1.3, -0.7]);
  const rail = mat(0x9a7a52, { flatShading: true });
  for (const x of [-0.25, 0.25]) M(new THREE.BoxGeometry(0.06, 0.06, 1.0), rail, g, [x, 0.1, 0], [-0.35, 0, 0]);
  for (let i = 0; i < 4; i++) M(new THREE.BoxGeometry(0.56, 0.05, 0.06), rail, g, [0, 0.12 - i * 0.02, 0.35 - i * 0.22]);
  return g;
}

export function makeLadderUp() {
  const g = new THREE.Group();
  const wood = mat(0x8a6038, { flatShading: true });
  for (const x of [-0.3, 0.3]) M(new THREE.BoxGeometry(0.08, 2.6, 0.08), wood, g, [x, 1.3, 0]);
  for (let i = 0; i < 6; i++) M(new THREE.BoxGeometry(0.6, 0.06, 0.08), wood, g, [0, 0.3 + i * 0.4, 0]);
  return g;
}

export function makeRock(vein, theme) {
  const g = new THREE.Group();
  const rock = mat(theme.rock, { flatShading: true });
  M(new THREE.IcosahedronGeometry(0.45, 0), rock, g, [0, 0.32, 0], [0.3, 0.6, 0], [1.1, 0.8, 1]);
  M(new THREE.IcosahedronGeometry(0.3, 0), rock, g, [0.28, 0.2, 0.15], [0.8, 0.2, 0.4]);
  if (vein) for (const [x, y, z] of [[0.1, 0.55, 0.25], [-0.25, 0.4, 0.2], [0.3, 0.35, -0.1]]) M(new THREE.IcosahedronGeometry(0.09, 0), glow(0xffd27a, 0.35), g, [x, y, z]);
  return g;
}

export function makeLift() {
  const g = new THREE.Group();
  const wood = mat(0x7a5232, { flatShading: true });
  for (const x of [-0.9, 0.9]) M(new THREE.BoxGeometry(0.18, 3, 0.18), wood, g, [x, 1.5, 0]);
  M(new THREE.BoxGeometry(2.1, 0.2, 0.3), wood, g, [0, 3.0, 0]);
  M(new THREE.BoxGeometry(1.5, 0.1, 1.2), mat(0x3e3b3a), g, [0, 0.05, 0]);
  return g;
}
