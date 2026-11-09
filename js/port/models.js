import * as THREE from 'three';

const mats = new Map();
export function mat(c, o = {}) {
  const key = c + JSON.stringify(o);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, flatShading: true, ...o }));
  return mats.get(key);
}
export function glow(c, k = 1.6) { return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.5 }); }
function put(g, geo, m, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const o = new THREE.Mesh(geo, m); o.position.set(...p); o.rotation.set(...r); o.scale.set(...s); g.add(o); return o;
}
const lathe = (pts, seg = 16, a = 0, len = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, a, len);
const ball = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const twoSided = m => { const c = m.clone(); c.side = THREE.DoubleSide; return c; };

function lampLight(g, p, dist = 7) {
  const l = new THREE.PointLight(0xffb45a, 0, dist, 1.4); l.position.set(...p); g.add(l);
  return l;
}

export function tubBoat({ light = true } = {}) {
  const g = new THREE.Group();
  const red = twoSided(mat(0xc8452f)), rim = mat(0xe06a3c), deep = mat(0x7b2e22), wood = mat(0x6e4a2c);
  put(g, lathe([[0.02, 0.02], [0.5, 0.04], [0.82, 0.16], [0.97, 0.34], [1.0, 0.46]], 20), red, [0, 0, 0], [0, 0, 0], [0.95, 1, 1.22]);
  put(g, new THREE.CircleGeometry(0.92, 20), deep, [0, 0.3, 0], [-Math.PI / 2, 0, 0], [0.95, 1.22, 1]);
  put(g, new THREE.TorusGeometry(1.0, 0.085, 6, 24), rim, [0, 0.46, 0], [Math.PI / 2, 0, 0], [0.95, 1.22, 1]);
  put(g, ball(0.3, 1), mat(0xc8452f), [0, 0.4, 1.28], [0, 0, 0], [0.9, 0.7, 1.15]);
  put(g, new THREE.BoxGeometry(0.9, 0.12, 0.42), wood, [0, 0.42, 0.42]);
  put(g, cyl(0.02, 0.02, 0.32, 6), wood, [0.48, 0.6, -0.92]);
  put(g, cyl(0.1, 0.12, 0.05, 10), mat(0x3b2a20), [0.48, 0.92, -0.92]);
  put(g, ball(0.14, 1), glow(0xffcf6b, 1.8), [0.48, 0.8, -0.92]);
  if (light) lampLight(g, [0.48, 0.95, -0.92], 14);
  g.userData.seat = new THREE.Vector3(0, 0.34, 0.15);
  g.userData.lamp = new THREE.Vector3(0.48, 0.8, -0.92);
  return g;
}

function produceRow(g, y, z, xs) {
  const cols = [0xe8573a, 0x7fbf55, 0xf0c04a, 0xf2ead8, 0xe8573a];
  xs.forEach((x, i) => {
    put(g, cyl(0.22, 0.17, 0.16, 10), mat(0xb98a55), [x, y, z]);
    for (let k = 0; k < 3; k++) put(g, ball(0.085, 0), mat(cols[(i + k) % cols.length]), [x - 0.07 + k * 0.07, y + 0.12 + (k % 2) * 0.04, z + (k === 1 ? -0.05 : 0.03)]);
  });
}

function fishSign(g, p, col = 0x3f8fa3, s = 1) {
  const f = new THREE.Group(); f.position.set(...p); f.scale.setScalar(s);
  put(f, ball(0.3, 1), mat(col), [0, 0, 0], [0, 0, 0], [1.25, 0.62, 0.22]);
  put(f, new THREE.ConeGeometry(0.2, 0.3, 3), mat(col), [0.44, 0, 0], [0, 0, -Math.PI / 2], [1, 1, 0.3]);
  put(f, ball(0.045, 0), mat(0xffffff), [-0.22, 0.05, 0.07]);
  g.add(f);
  return f;
}

const C_VARIANTS = {
  C2: { title: 'C2. 붉은 지붕 밤장', note: '지붕과 등을 붉게 맞춰 밤에 가장 따뜻하게 빛납니다. 기둥·몸통은 짙은 나무색으로 눌렀습니다.',
    roof: 0xa8402e, roofLine: 0x7d2c20, trim: 0x3b2a20, post: 0x5b3a24, body: 0xa86b3c, plank: 0x8a5530, lantern: 0xff8a4a, band: 0x5b2418, noren: 0x2f4f7a, emblem: 0xf4e8d0, stool: 0x5b3a24,
    hutRoof: 0xa8402e, hutRib: 0x5b2418, hutWall: 0xeedcb6, deck: 0x8a5a36, flag: 0xf0c04a, roofAng: 0.82, wheelR: 0.44, chibi: 1 },
};

function paperLantern(g, p, v, s = 1) {
  const L = new THREE.Group(); L.position.set(...p); L.scale.setScalar(s); g.add(L);
  put(L, cyl(0.008, 0.008, 0.22, 4), mat(0x3b2a20), [0, 0.34, 0]);
  put(L, ball(0.17, 2), glow(v.lantern, 1.4), [0, 0, 0], [0, 0, 0], [1, 1.3, 1]);
  put(L, cyl(0.1, 0.1, 0.05, 10), mat(0x3b2a20), [0, 0.22, 0]);
  put(L, cyl(0.1, 0.1, 0.05, 10), mat(0x3b2a20), [0, -0.22, 0]);
  put(L, new THREE.TorusGeometry(0.168, 0.018, 4, 18), mat(v.band), [0, 0.04, 0], [Math.PI / 2, 0, 0]);
}

function spokedWheel(g, x, y, z, r, col) {
  const W = new THREE.Group(); W.position.set(x, y, z); W.rotation.y = Math.PI / 2; g.add(W);
  put(W, new THREE.TorusGeometry(r, 0.055, 6, 20), mat(col));
  put(W, cyl(0.09, 0.09, 0.16, 8), mat(col), [0, 0, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) put(W, new THREE.BoxGeometry(0.04, r * 2, 0.04), mat(col), [0, 0, 0], [0, 0, (i / 4) * Math.PI]);
}

function gableTriangle(halfW, h, depth, col) {
  const s = new THREE.Shape(); s.moveTo(-halfW, 0); s.lineTo(halfW, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, mat(col));
}

function yatai(v) {
  const g = new THREE.Group();
  const k = v.chibi;
  const bodyY = 0.78, bodyH = 0.72 / k, top = bodyY + bodyH / 2;
  put(g, new THREE.BoxGeometry(2.0, bodyH, 1.0), mat(v.body), [0, bodyY, 0]);
  for (const x of [-0.62, -0.2, 0.22, 0.64]) put(g, new THREE.BoxGeometry(0.035, bodyH * 0.86, 0.03), mat(v.plank), [x, bodyY, 0.51]);
  put(g, new THREE.BoxGeometry(2.3, 0.08, 1.3), mat(v.plank), [0, top + 0.04, 0.12]);
  spokedWheel(g, -1.08, v.wheelR + 0.02, -0.05, v.wheelR, 0x5b3a24);
  spokedWheel(g, 1.08, v.wheelR + 0.02, -0.05, v.wheelR, 0x5b3a24);
  for (const x of [-0.62, 0.62]) put(g, new THREE.BoxGeometry(0.07, 0.07, 1.4), mat(0x5b3a24), [x, bodyY - 0.18, -1.05], [-0.12, 0, 0]);
  const postH = 1.2 * k;
  for (const x of [-0.98, 0.98]) for (const z of [-0.42, 0.42]) put(g, new THREE.BoxGeometry(0.08, postH, 0.08), mat(v.post), [x, top + postH / 2, z]);
  const eaveY = top + postH - 0.05;
  const a = v.roofAng, half = 0.6 * k, rise = Math.sin(a) * half * 2;
  const ridgeY = eaveY + rise / 2 + 0.25;
  for (const s of [-1, 1]) {
    const slab = new THREE.Group();
    slab.position.set(0, ridgeY - Math.sin(a) * half, s * Math.cos(a) * half);
    slab.rotation.x = s * a;
    put(slab, new THREE.BoxGeometry(2.7, 0.1, half * 2 + 0.08), mat(v.roof));
    for (const zz of [-0.45, -0.05, 0.35]) put(slab, new THREE.BoxGeometry(2.72, 0.03, 0.05), mat(v.roofLine), [0, 0.06, zz * k]);
    put(slab, new THREE.BoxGeometry(2.76, 0.07, 0.07), mat(v.trim), [0, -0.02, s > 0 ? half + 0.04 : -(half + 0.04)]);
    g.add(slab);
  }
  put(g, cyl(0.07, 0.07, 2.8, 8), mat(v.trim), [0, ridgeY + 0.03, 0], [0, 0, Math.PI / 2]);
  const triH = ridgeY - (ridgeY - Math.sin(a) * half * 2);
  for (const x of [-1.25, 1.25]) { const t = gableTriangle(Math.cos(a) * half * 2 - 0.05, triH - 0.05, 0.05, v.body); t.position.set(x, ridgeY - triH, 0); t.rotation.y = Math.PI / 2; g.add(t); }
  const eaveFront = Math.cos(a) * half * 2;
  for (let i = 0; i < 3; i++) put(g, new THREE.BoxGeometry(0.58, 0.36, 0.02), mat(v.noren), [-0.62 + i * 0.62, ridgeY - triH - 0.2, eaveFront - 0.06]);
  put(g, ball(0.08, 1), mat(v.emblem), [0, ridgeY - triH - 0.18, eaveFront - 0.04], [0, 0, 0], [1, 1, 0.3]);
  paperLantern(g, [-1.22, ridgeY - triH - 0.42, eaveFront - 0.02], v, k);
  paperLantern(g, [1.22, ridgeY - triH - 0.42, eaveFront - 0.02], v, k);
  put(g, cyl(0.26, 0.24, 0.24, 12), mat(0x8c8f96), [-0.45, top + 0.2, -0.05]);
  put(g, cyl(0.27, 0.27, 0.03, 12), mat(0x6b6e75), [-0.45, top + 0.32, -0.05]);
  for (const [dx, dy, s] of [[-0.05, 0.55, 0.12], [0.06, 0.75, 0.09]]) put(g, ball(s, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 1 }), [-0.45 + dx, top + dy, -0.05]);
  produceRow(g, top + 0.1, 0.3, [0.25, 0.72]);
  for (const x of [-0.5, 0.5]) {
    put(g, cyl(0.2, 0.2, 0.08, 12), mat(v.stool), [x, 0.62, 1.05]);
    put(g, cyl(0.05, 0.07, 0.58, 6), mat(0x5b3a24), [x, 0.29, 1.05]);
  }
  return g;
}

function dockHouse(v) {
  const g = new THREE.Group();
  const k = v.chibi;
  const wood = 0x6e4a2c;
  for (const x of [-1.35, 0, 1.35]) for (const z of [-1.0, 1.0]) put(g, cyl(0.1, 0.12, 1.2, 6), mat(wood), [x, 0.3, z]);
  for (const s of [-1, 1]) put(g, new THREE.BoxGeometry(0.06, 1.0, 0.06), mat(wood), [s * 0.68, 0.38, 1.02], [0, 0, s * 0.95]);
  for (const x of [-1.35, 1.35]) put(g, new THREE.TorusGeometry(0.13, 0.035, 4, 10), mat(0xe8d2a8), [x, 0.7, 1.0], [Math.PI / 2, 0, 0]);
  put(g, new THREE.BoxGeometry(3.3, 0.14, 2.4), mat(v.deck), [0, 0.9, 0.05]);
  for (const x of [-1.2, -0.6, 0, 0.6, 1.2]) put(g, new THREE.BoxGeometry(0.03, 0.01, 2.38), mat(wood), [x, 0.975, 0.05]);
  put(g, new THREE.BoxGeometry(0.9, 0.1, 0.5), mat(v.deck), [-0.2, 0.45, 1.5]);
  const wallH = 1.35 / k;
  put(g, new THREE.BoxGeometry(2.1, wallH, 1.6), mat(v.hutWall), [0, 0.97 + wallH / 2, -0.25]);
  put(g, new THREE.BoxGeometry(2.16, 0.1, 1.66), mat(v.hutRib), [0, 1.02, -0.25]);
  const wallTop = 0.97 + wallH;
  const roofR = 1.0 * k;
  put(g, new THREE.CylinderGeometry(roofR, roofR, 2.3 * k, 14, 1, false, 0, Math.PI), mat(v.hutRoof), [0, wallTop - 0.05, -0.25], [0, 0, Math.PI / 2], [1, 1, 1]).scale.set(0.75, 1, 1.12);
  for (const x of [-0.95, 0, 0.95].map(q => q * k)) put(g, new THREE.TorusGeometry(roofR + 0.02, 0.045, 4, 14, Math.PI), mat(v.hutRib), [x, wallTop - 0.05, -0.25], [0, Math.PI / 2, 0], [1.12, 0.75, 1]);
  const front = -0.25 + 0.8;
  const frameM = mat(v.hutRib);
  put(g, new THREE.BoxGeometry(0.5, 0.78, 0.04), mat(0x5b3a24), [-0.45, 0.97 + 0.39 + 0.05, front + 0.02]);
  put(g, cyl(0.25, 0.25, 0.04, 12), mat(0x5b3a24), [-0.45, 0.97 + 0.83, front + 0.02], [Math.PI / 2, 0, 0]);
  put(g, ball(0.035, 0), mat(0xd9a066), [-0.3, 0.97 + 0.45, front + 0.06]);
  const wy = 0.97 + 0.78, wx = 0.48, ww = 0.48, wh = 0.42;
  put(g, new THREE.BoxGeometry(ww, wh, 0.03), mat(0xffd98a, { emissive: 0xffb24a, emissiveIntensity: 0.7 }), [wx, wy, front + 0.015]);
  put(g, new THREE.BoxGeometry(ww + 0.1, 0.06, 0.06), frameM, [wx, wy + wh / 2 + 0.02, front + 0.03]);
  put(g, new THREE.BoxGeometry(ww + 0.14, 0.07, 0.1), frameM, [wx, wy - wh / 2 - 0.03, front + 0.05]);
  for (const s of [-1, 1]) put(g, new THREE.BoxGeometry(0.06, wh + 0.04, 0.06), frameM, [wx + s * (ww / 2 + 0.02), wy, front + 0.03]);
  put(g, new THREE.BoxGeometry(0.035, wh, 0.05), frameM, [wx, wy, front + 0.03]);
  put(g, new THREE.BoxGeometry(ww, 0.035, 0.05), frameM, [wx, wy, front + 0.03]);
  fishSign(g, [-0.42, wallTop - 0.05, front + 0.05], 0x3f8fa3, 0.55);
  put(g, new THREE.TorusGeometry(0.22, 0.065, 6, 14), mat(0xd94a3a), [1.4, 1.35, 0.95], [0, Math.PI / 2, 0]);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; put(g, new THREE.BoxGeometry(0.15, 0.09, 0.1), mat(0xffffff), [1.4, 1.35 + Math.sin(a) * 0.22, 0.95 + Math.cos(a) * 0.22], [a, 0, 0]); }
  put(g, cyl(0.025, 0.025, 1.0, 4), mat(wood), [1.4, 1.45, 0.95]);
  put(g, new THREE.BoxGeometry(0.03, 0.03, 0.4), mat(wood), [1.4, 1.95, 0.8]);
  paperLantern(g, [1.4, 1.62, 0.62], v, 0.8);
  put(g, cyl(0.018, 0.018, 0.8, 4), mat(wood), [0.7 * k, wallTop + roofR * 0.7, -0.25]);
  put(g, new THREE.ConeGeometry(0.17, 0.42, 3), mat(v.flag), [0.92 * k, wallTop + roofR * 0.7 + 0.25, -0.25], [0, 0, -Math.PI / 2], [1, 1, 0.25]);
  put(g, cyl(0.16, 0.13, 0.24, 10), mat(0x4f7fa8), [-1.25, 1.09, 0.85]);
  return g;
}


export function buildPortShops() {
  const v = C_VARIANTS.C2;
  return { market: yatai(v), hut: dockHouse(v) };
}

export function setPortNight(root, on) {
  root.traverse(o => { if (o.isPointLight) o.intensity = on ? 14 : 0; });
}
