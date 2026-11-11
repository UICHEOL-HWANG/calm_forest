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

export function tubBoat() {
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
  lampLight(g, [0.48, 0.95, -0.92], 14);
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

function hangLantern(g, p, col = 0xffcf6b) {
  put(g, cyl(0.012, 0.012, 0.3, 4), mat(0x3b2a20), [p[0], p[1] + 0.25, p[2]]);
  put(g, ball(0.15, 1), glow(col, 1.5), p, [0, 0, 0], [1, 1.2, 1]);
  put(g, cyl(0.08, 0.08, 0.04, 8), mat(0x3b2a20), [p[0], p[1] + 0.19, p[2]]);
  lampLight(g, p, 6);
}

export const SHOP_STYLES = {
  A: { title: 'A. 둥근 천막', note: '둥근 줄무늬 천막 노점 + 짚지붕 원형 오두막. 형태가 둥글고 덩어리가 커서 멀리서도 또렷하게 읽힙니다.' },
  B: { title: 'B. 뒤집은 배', note: '돛천 차양 노점 + 뒤집은 배를 지붕으로 쓴 어부 집. 포구 섬이라는 이야기가 형태에서 바로 보입니다.' },
  C: { title: 'C. 등불 포장마차', note: '바퀴 달린 포장마차 + 기둥 위 어부 집. 밤에 등불이 겹겹이 켜져 레퍼런스 밤바다와 가장 잘 어울립니다.' },
};

function marketA() {
  const g = new THREE.Group();
  const cream = twoSided(mat(0xf4e8d0)), terra = twoSided(mat(0xd8643c)), wood = mat(0x9b6b3f);
  put(g, cyl(1.05, 1.1, 0.75, 16), mat(0xf4e8d0), [0, 0.375, 0]);
  put(g, cyl(1.12, 1.12, 0.1, 16), wood, [0, 0.78, 0]);
  produceRow(g, 0.9, 0.55, [-0.5, 0, 0.5]);
  put(g, cyl(0.06, 0.06, 1.9, 8), wood, [0, 1.7, 0]);
  const prof = [[0.001, 2.75], [0.35, 2.68], [1.0, 2.38], [1.5, 2.08]];
  const n = 10;
  for (let i = 0; i < n; i++) put(g, lathe(prof, 3, (i / n) * Math.PI * 2, (Math.PI * 2) / n), i % 2 ? cream : terra);
  for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * Math.PI * 2; put(g, ball(0.17, 0), i % 2 ? cream : terra, [Math.sin(a) * 1.42, 2.02, Math.cos(a) * 1.42], [0, 0, 0], [1, 0.6, 1]); }
  put(g, ball(0.12, 1), terra, [0, 2.82, 0]);
  hangLantern(g, [0.95, 1.65, 0.75]);
  return g;
}
function hutA() {
  const g = new THREE.Group();
  const wall = mat(0xeedcb6), straw = twoSided(mat(0xd2a95a)), dark = twoSided(mat(0x6e4a2c));
  put(g, cyl(1.25, 1.3, 1.45, 14), wall, [0, 0.72, 0]);
  put(g, lathe([[0.001, 3.05], [0.25, 2.98], [1.0, 2.2], [1.7, 1.42], [1.72, 1.32]], 14), straw);
  put(g, ball(0.18, 0), straw, [0, 3.08, 0], [0, 0, 0], [1, 1.4, 1]);
  put(g, new THREE.BoxGeometry(0.62, 0.95, 0.1), dark, [0, 0.48, 1.24]);
  put(g, cyl(0.31, 0.31, 0.1, 12, 1), dark, [0, 0.95, 1.24], [Math.PI / 2, 0, 0]);
  fishSign(g, [0, 1.45, 1.36], 0x3f8fa3, 0.8);
  put(g, cyl(0.32, 0.3, 0.6, 10), mat(0x9b6b3f), [1.35, 0.3, 0.75]);
  put(g, cyl(0.33, 0.33, 0.06, 10), mat(0x6e4a2c), [1.35, 0.6, 0.75]);
  hangLantern(g, [-0.95, 1.35, 1.05]);
  return g;
}

function marketB() {
  const g = new THREE.Group();
  const wood = mat(0xb07a46), band = mat(0x7a5232), canvas = twoSided(mat(0xf6f1e4)), navy = mat(0x2f4f7a);
  put(g, new THREE.BoxGeometry(2.2, 0.75, 0.95), wood, [0, 0.375, 0]);
  for (const y of [0.18, 0.58]) put(g, new THREE.BoxGeometry(2.24, 0.07, 0.99), band, [0, y, 0]);
  produceRow(g, 0.86, 0.1, [-0.6, 0, 0.6]);
  for (const x of [-1.05, 1.05]) {
    put(g, cyl(0.05, 0.05, 2.2, 6), band, [x, 1.1, -0.45]);
    put(g, new THREE.BoxGeometry(0.16, 0.42, 0.04), band, [x, 2.3, -0.45]);
  }
  put(g, new THREE.CylinderGeometry(1.0, 1.0, 2.5, 14, 1, true, 0, Math.PI), canvas, [0, 1.85, 0], [0, 0, Math.PI / 2], [1, 1, 0.55]);
  put(g, new THREE.BoxGeometry(2.55, 0.12, 0.08), navy, [0, 1.85, 0.56]);
  put(g, new THREE.BoxGeometry(2.55, 0.12, 0.08), navy, [0, 1.85, -0.56]);
  hangLantern(g, [0.85, 1.55, 0.6]);
  return g;
}
function hutB() {
  const g = new THREE.Group();
  const wall = mat(0xf1e6cf), teal = twoSided(mat(0x3d8f9a)), wood = mat(0x8a5a36), red = mat(0xd94a3a);
  put(g, new THREE.BoxGeometry(3.0, 1.2, 2.0), wall, [0, 0.6, 0]);
  put(g, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), teal, [0, 1.15, 0], [0, 0, 0], [1.85, 0.95, 1.25]);
  put(g, new THREE.BoxGeometry(3.5, 0.12, 0.14), wood, [0, 2.1, 0]);
  put(g, new THREE.TorusGeometry(1.0, 0.04, 4, 20), mat(0xe8d2a8), [0, 1.16, 0], [Math.PI / 2, 0, 0], [1.86, 1.26, 1]);
  put(g, new THREE.BoxGeometry(0.62, 0.95, 0.06), wood, [-0.55, 0.48, 1.02]);
  put(g, new THREE.TorusGeometry(0.24, 0.07, 6, 14), red, [0.55, 0.72, 1.04]);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; put(g, new THREE.BoxGeometry(0.1, 0.09, 0.15), mat(0xffffff), [0.55 + Math.cos(a) * 0.24, 0.72 + Math.sin(a) * 0.24, 1.04], [0, 0, a]); }
  hangLantern(g, [1.2, 1.15, 1.15]);
  return g;
}

function marketC() {
  const g = new THREE.Group();
  const wood = mat(0xa86b3c), dark = mat(0x5b3a24), roofM = twoSided(mat(0x9a3b2a)), noren = mat(0x2f4f7a);
  put(g, new THREE.BoxGeometry(2.0, 0.7, 1.0), wood, [0, 0.62, 0]);
  put(g, new THREE.BoxGeometry(2.12, 0.08, 1.12), dark, [0, 1.0, 0]);
  for (const x of [-0.75, 0.75]) {
    put(g, cyl(0.3, 0.3, 0.1, 14), dark, [x, 0.3, 0.56], [Math.PI / 2, 0, 0]);
    put(g, cyl(0.1, 0.1, 0.12, 8), wood, [x, 0.3, 0.56], [Math.PI / 2, 0, 0]);
  }
  produceRow(g, 1.1, 0.15, [-0.55, 0.05, 0.6]);
  for (const x of [-0.95, 0.95]) put(g, cyl(0.045, 0.045, 1.3, 6), dark, [x, 1.65, -0.42]);
  put(g, new THREE.CylinderGeometry(1.25, 1.25, 2.6, 16, 1, true, Math.PI / 2 - 0.75, 1.5), roofM, [0, 1.05, 0.05], [0, 0, Math.PI / 2]);
  for (let i = 0; i < 3; i++) put(g, new THREE.BoxGeometry(0.52, 0.42, 0.03), noren, [-0.58 + i * 0.58, 1.93, 0.88], [0.12, 0, 0]);
  put(g, ball(0.09, 0), mat(0xf4e8d0), [0, 1.95, 0.9]);
  for (const x of [-1.2, 1.2]) {
    put(g, cyl(0.01, 0.01, 0.25, 4), dark, [x, 2.15, 0.62]);
    put(g, ball(0.17, 1), glow(0xe8503a, 1.3), [x, 1.92, 0.62], [0, 0, 0], [1, 1.25, 1]);
    lampLight(g, [x, 1.92, 0.62], 6);
  }
  return g;
}
function hutC() {
  const g = new THREE.Group();
  const wood = mat(0x8a5a36), wall = mat(0xeedcb6), roofM = mat(0x40585f);
  for (const x of [-1.0, 1.0]) for (const z of [-0.8, 0.8]) put(g, cyl(0.09, 0.11, 0.9, 6), wood, [x, 0.3, z]);
  put(g, new THREE.BoxGeometry(2.6, 0.12, 2.0), wood, [0, 0.72, 0.15]);
  put(g, new THREE.BoxGeometry(2.0, 1.15, 1.4), wall, [0, 1.35, -0.15]);
  for (const s of [-1, 1]) put(g, new THREE.BoxGeometry(2.5, 0.1, 1.05), roofM, [0, 2.22, -0.15 + s * 0.42], [s * 0.62, 0, 0]);
  put(g, new THREE.BoxGeometry(2.55, 0.1, 0.12), mat(0x2c3e44), [0, 2.55, -0.15]);
  for (const x of [-1.0, 1.0]) put(g, new THREE.CylinderGeometry(0.7, 0.7, 0.06, 3, 1, false, Math.PI), wall, [x, 2.15, -0.15], [0, 0, Math.PI / 2], [0.55, 1, 1.15]);
  put(g, new THREE.BoxGeometry(0.55, 0.85, 0.05), mat(0x5b3a24), [-0.4, 1.2, 0.57]);
  put(g, new THREE.BoxGeometry(0.45, 0.4, 0.05), mat(0xffd98a, { emissive: 0xffb24a, emissiveIntensity: 0.6 }), [0.5, 1.45, 0.57]);
  put(g, cyl(0.02, 0.02, 1.6, 4), wood, [1.15, 1.45, 0.95]);
  hangLantern(g, [1.15, 1.85, 0.95]);
  fishSign(g, [0, 2.0, 0.62], 0x3f8fa3, 0.7);
  return g;
}

export const C_VARIANTS = {
  C1: { title: 'C1. 어묵 포장마차 정석', note: '나무색 박공지붕 + 붉은 기둥 + 흰 종이등. 레퍼런스 야타이를 가장 그대로 옮긴 안입니다.',
    roof: 0x8a6a4e, roofLine: 0x6b4f38, trim: 0xb4472f, post: 0xc0574a, body: 0xd9b98a, plank: 0xb8956a, lantern: 0xfff1d6, band: 0xc0432b, noren: 0x2f4f7a, emblem: 0xf4e8d0, stool: 0xc0574a,
    hutRoof: 0x8a5a36, hutRib: 0x5b3a24, hutWall: 0xc9a06a, deck: 0x9b6b3f, flag: 0xe8763a, roofAng: 0.82, wheelR: 0.44, chibi: 1 },
  C2: { title: 'C2. 붉은 지붕 밤장', note: '지붕과 등을 붉게 맞춰 밤에 가장 따뜻하게 빛납니다. 기둥·몸통은 짙은 나무색으로 눌렀습니다.',
    roof: 0xa8402e, roofLine: 0x7d2c20, trim: 0x3b2a20, post: 0x5b3a24, body: 0xa86b3c, plank: 0x8a5530, lantern: 0xff8a4a, band: 0x5b2418, noren: 0x2f4f7a, emblem: 0xf4e8d0, stool: 0x5b3a24,
    hutRoof: 0xa8402e, hutRib: 0x5b2418, hutWall: 0xeedcb6, deck: 0x8a5a36, flag: 0xf0c04a, roofAng: 0.82, wheelR: 0.44, chibi: 1 },
  C3: { title: 'C3. 통통한 파스텔', note: '지붕을 크게, 몸통을 낮게 줄여 귀엽게. 청록 지붕과 크림 기둥이라 낮에도 밝고 다른 마을 건물과 겹치지 않습니다.',
    roof: 0x3d8f9a, roofLine: 0x2f7480, trim: 0xf4e8d0, post: 0xf1e2c4, body: 0xe9c99a, plank: 0xd4ae78, lantern: 0xffcf6b, band: 0xd8643c, noren: 0xd8643c, emblem: 0xfff4e0, stool: 0xd8643c,
    hutRoof: 0x3d8f9a, hutRib: 0x2f7480, hutWall: 0xf3e3c2, deck: 0xb07a46, flag: 0xd8643c, roofAng: 0.7, wheelR: 0.5, chibi: 1.15 },
};

function paperLantern(g, p, v, s = 1) {
  const L = new THREE.Group(); L.position.set(...p); L.scale.setScalar(s); g.add(L);
  put(L, cyl(0.008, 0.008, 0.22, 4), mat(0x3b2a20), [0, 0.34, 0]);
  put(L, ball(0.17, 2), glow(v.lantern, 1.4), [0, 0, 0], [0, 0, 0], [1, 1.3, 1]);
  put(L, cyl(0.1, 0.1, 0.05, 10), mat(0x3b2a20), [0, 0.22, 0]);
  put(L, cyl(0.1, 0.1, 0.05, 10), mat(0x3b2a20), [0, -0.22, 0]);
  put(L, new THREE.TorusGeometry(0.168, 0.018, 4, 18), mat(v.band), [0, 0.04, 0], [Math.PI / 2, 0, 0]);
  lampLight(g, p, 6);
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

export function buildShops(style) {
  if (C_VARIANTS[style]) return { market: yatai(C_VARIANTS[style]), hut: dockHouse(C_VARIANTS[style]) };
  if (style === 'B') return { market: marketB(), hut: hutB() };
  if (style === 'C') return { market: marketC(), hut: hutC() };
  return { market: marketA(), hut: hutA() };
}

export function setNight(root, on) {
  root.traverse(o => { if (o.isPointLight) o.intensity = on ? (o.distance > 10 ? 14 : 7) : 0; });
}
