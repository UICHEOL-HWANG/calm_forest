import * as THREE from 'three';

const mats = new Map();
function clay(c) {
  if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, flatShading: true }));
  return mats.get(c);
}
function add(g, geo, c, p, r = [0, 0, 0], s = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, typeof c === 'number' ? clay(c) : c);
  m.position.set(...p); m.rotation.set(...r); m.scale.set(...s); m.castShadow = true; g.add(m); return m;
}
const sph = (r, a = 12, b = 9) => new THREE.SphereGeometry(r, a, b);
const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const DARK = 0x2a2320, WHITE = 0xf5f2ea;

function base(g, color, skin) {
  add(g, new THREE.IcosahedronGeometry(0.5, 1), color, [0, 0.55, 0], [0, 0, 0], [1, 1.05, 1]);
  add(g, new THREE.IcosahedronGeometry(0.38, 1), skin, [0, 1.15, 0]);
}
function eyes(g, z = 0.32, y = 1.18, r = 0.05) {
  for (const s of [-1, 1]) add(g, sph(r, 8, 8), 0x3a2f2a, [s * 0.13, y, z]);
}
function vest(g, c, from) {
  add(g, new THREE.SphereGeometry(0.512, 16, 12, 0, Math.PI * 2, from, Math.PI), c, [0, 0.55, 0], [0, 0, 0], [1.01, 1.05, 1.01]);
}
function apron(g, c) {
  add(g, new THREE.SphereGeometry(0.514, 16, 12, Math.PI / 2 - 0.62, 1.24, Math.PI / 2.4, 1.15), c, [0, 0.55, 0], [0, 0, 0], [1.02, 1.02, 1.02]);
  for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.065, 0.26, 0.04), c, [s * 0.16, 0.85, 0.45], [-0.22, 0, 0]);
}

export function netBuoy(r = 0.22) {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xe04a3a, [0, 0, 0]);
  add(g, new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0xf2f4f6, [0, 0, 0]);
  add(g, new THREE.TorusGeometry(r * 1.0, r * 0.09, 6, 20), 0x333d4b, [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.TorusGeometry(r * 0.24, r * 0.06, 6, 12), 0x4e5968, [0, r * 1.15, 0]);
  add(g, new THREE.TorusGeometry(r * 0.55, r * 0.07, 5, 14, Math.PI * 1.3), 0xb98a55, [r * 0.55, r * 1.05, 0], [0, 0, -0.6]);
  return g;
}

export function beachBuoy() {
  const g = new THREE.Group();
  const net = new THREE.Group(); net.position.y = 0.02; net.rotation.y = 0.5; g.add(net);
  for (let i = -2; i <= 2; i++) {
    add(net, cyl(0.012, 0.012, 0.9, 4), 0x5f7f6a, [i * 0.16, 0, 0.1], [Math.PI / 2, 0, 0]);
    add(net, cyl(0.012, 0.012, 0.75, 4), 0x5f7f6a, [0.05, 0, i * 0.16 + 0.1], [0, 0, Math.PI / 2]);
  }
  const b = netBuoy(0.24); b.position.set(0, 0.18, 0); b.rotation.set(-1.0, 0.3, 0.2); g.add(b);
  g.scale.setScalar(1.6);
  return g;
}

function otter() {
  const g = new THREE.Group();
  const FUR = 0x8a5f3c, CREAM = 0xf1e3c8, COAT = 0xf2c230;
  base(g, FUR, FUR);
  vest(g, COAT, Math.PI / 3.2);
  for (const y of [0.5, 0.74]) add(g, cyl(0.035, 0.035, 0.05, 8), 0x8a6a1c, [0, y, 0.51], [Math.PI / 2, 0, 0]);
  add(g, sph(0.21), CREAM, [0, 1.04, 0.27], [0, 0, 0], [1.25, 0.8, 0.85]);
  add(g, sph(0.065, 8, 6), DARK, [0, 1.12, 0.45]);
  for (const s of [-1, 1]) for (const k of [0, 1]) add(g, new THREE.BoxGeometry(0.22, 0.012, 0.012), 0xf5efe0, [s * 0.27, 1.05 - k * 0.05, 0.36], [0, s * 0.35, s * (k ? -0.12 : 0.1)]);
  for (const s of [-1, 1]) add(g, sph(0.085, 8, 6), 0x6a4528, [s * 0.29, 1.4, -0.02], [0, 0, 0], [1, 0.85, 0.6]);
  add(g, cyl(0.52, 0.56, 0.04, 18), COAT, [0, 1.46, -0.06], [-0.22, 0, 0]);
  add(g, new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), COAT, [0, 1.46, -0.05], [-0.22, 0, 0], [1, 0.75, 1]);
  add(g, new THREE.CapsuleGeometry(0.11, 0.6, 4, 8), FUR, [0, 0.22, -0.62], [1.25, 0, 0], [1.3, 1, 0.55]);
  const buoy = netBuoy(0.17); buoy.position.set(0.44, 0.72, 0.36); buoy.rotation.z = -0.3; g.add(buoy);
  eyes(g);
  return g;
}

function raccoon() {
  const g = new THREE.Group();
  const FUR = 0x8f8a85, MASK = 0x34302d, NAVY = 0x2f3f66;
  base(g, FUR, 0x9a958f);
  apron(g, NAVY);
  add(g, new THREE.BoxGeometry(0.2, 0.14, 0.03), 0xc8452f, [0, 0.62, 0.5], [-0.12, 0, 0]);
  for (const s of [-1, 1]) add(g, sph(0.14, 10, 8), MASK, [s * 0.15, 1.19, 0.25], [0, 0, s * 0.25], [1.35, 0.78, 0.6]);
  add(g, sph(0.15, 10, 8), WHITE, [0, 1.04, 0.3], [0, 0, 0], [1.05, 0.72, 1]);
  add(g, sph(0.052, 8, 6), DARK, [0, 1.09, 0.45]);
  for (const s of [-1, 1]) {
    add(g, sph(0.062, 8, 8), WHITE, [s * 0.15, 1.2, 0.34]);
    add(g, sph(0.038, 8, 8), DARK, [s * 0.15, 1.2, 0.39]);
    add(g, new THREE.ConeGeometry(0.12, 0.22, 8), FUR, [s * 0.25, 1.48, -0.02], [0, 0, -s * 0.3]);
    add(g, new THREE.ConeGeometry(0.06, 0.12, 8), WHITE, [s * 0.255, 1.47, 0.03], [0, 0, -s * 0.3]);
  }
  add(g, new THREE.TorusGeometry(0.37, 0.05, 6, 20), WHITE, [0, 1.3, 0], [Math.PI / 2 + 0.12, 0, 0]);
  add(g, sph(0.08, 8, 6), WHITE, [0.1, 1.33, -0.38], [0, 0, 0], [1.3, 0.8, 0.8]);
  const tail = new THREE.Group(); tail.position.set(0.28, 0.35, -0.48); tail.rotation.set(0.9, 0, -0.5); g.add(tail);
  for (let i = 0; i < 5; i++) add(tail, cyl(0.12 - i * 0.008, 0.13 - i * 0.008, 0.13, 10), i % 2 ? MASK : FUR, [0, i * 0.13, 0]);
  add(g, cyl(0.02, 0.02, 0.5, 6), 0x9b7247, [0.46, 0.85, 0.3], [0.3, 0, -0.35]);
  add(g, new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0x9b7247, [0.55, 0.63, 0.38]);
  return g;
}

function goat() {
  const g = new THREE.Group();
  const KNIT = 0xd98a9a, SKIN = 0xf2ece0, HORN = 0xcbb48a;
  base(g, KNIT, SKIN);
  for (const y of [0.42, 0.6, 0.78]) add(g, sph(0.035, 6, 5), 0xf6e7c8, [0, y, 0.5]);
  add(g, new THREE.BoxGeometry(0.03, 0.62, 0.02), 0xc2707f, [0, 0.6, 0.49]);
  for (const s of [-1, 1]) {
    [[0.15, 1.44, 0.06, 0.085], [0.18, 1.58, -0.02, 0.08], [0.2, 1.66, -0.16, 0.072], [0.21, 1.63, -0.3, 0.062], [0.21, 1.53, -0.38, 0.05]].forEach(([x, y, z, r]) => add(g, sph(r, 8, 6), HORN, [s * x, y, z]));
    add(g, sph(0.13, 10, 8), SKIN, [s * 0.4, 1.17, -0.02], [0, 0, s * -0.4], [1.5, 0.5, 0.75]);
    add(g, new THREE.TorusGeometry(0.085, 0.016, 6, 16), 0xc9a24a, [s * 0.13, 1.18, 0.36]);
  }
  add(g, new THREE.BoxGeometry(0.1, 0.016, 0.016), 0xc9a24a, [0, 1.19, 0.37]);
  eyes(g, 0.33);
  add(g, sph(0.05, 8, 6), 0xe29aa0, [0, 1.07, 0.37], [0, 0, 0], [1.3, 0.8, 0.8]);
  add(g, new THREE.ConeGeometry(0.1, 0.26, 8), WHITE, [0, 0.86, 0.28], [Math.PI + 0.25, 0, 0]);
  const basket = new THREE.Group(); basket.position.set(0.06, 0.72, 0.46); basket.rotation.x = -0.16; g.add(basket);
  add(basket, cyl(0.23, 0.18, 0.2, 12), 0xc79a63, [0, 0, 0]);
  add(basket, new THREE.TorusGeometry(0.225, 0.028, 6, 14), 0x8e6b3a, [0, 0.1, 0], [Math.PI / 2, 0, 0]);
  add(basket, sph(0.16, 10, 8), 0x7fbf55, [0, 0.16, 0], [0, 0, 0], [1, 0.8, 1]);
  add(basket, sph(0.11, 10, 8), 0xd6eec0, [0.02, 0.27, 0.02], [0, 0, 0], [1, 0.7, 1]);
  return g;
}

function hornedOwl() {
  const g = new THREE.Group();
  const FEATHER = 0x7b6a58, DISC = 0xd2bb93, NAVY = 0x253a5e;
  base(g, FEATHER, FEATHER);
  add(g, sph(0.4, 14, 10), 0xd9c8a8, [0, 0.62, 0.19], [0, 0, 0], [0.88, 0.98, 0.64]);
  for (const [x, y] of [[-0.1, 0.5], [0.1, 0.5], [-0.05, 0.66], [0.15, 0.66], [-0.1, 0.82], [0.1, 0.82]]) add(g, sph(0.03, 6, 5), 0x8a7458, [x, y, 0.45]);
  add(g, sph(0.33, 14, 10), DISC, [0, 1.15, 0.13], [0, 0, 0], [1.05, 0.9, 0.7]);
  for (const s of [-1, 1]) {
    add(g, sph(0.105, 12, 10), 0xf0a030, [s * 0.13, 1.2, 0.36], [0, 0, 0], [1, 1, 0.75]);
    add(g, sph(0.058, 10, 8), 0x241f1c, [s * 0.13, 1.2, 0.43]);
    add(g, new THREE.ConeGeometry(0.075, 0.3, 7), FEATHER, [s * 0.27, 1.52, -0.02], [0, 0, -s * 0.38]);
    add(g, sph(0.3, 12, 9), FEATHER, [s * 0.44, 0.68, -0.03], [0, 0, s * 0.12], [0.26, 1.0, 0.66]);
  }
  add(g, new THREE.ConeGeometry(0.05, 0.16, 7), 0x5a4a3a, [0, 1.07, 0.44], [2.55, 0, 0]);
  add(g, cyl(0.25, 0.27, 0.13, 16), NAVY, [0, 1.47, -0.04]);
  add(g, cyl(0.255, 0.255, 0.04, 16), WHITE, [0, 1.42, -0.04]);
  add(g, new THREE.BoxGeometry(0.3, 0.025, 0.16), 0x1a1a1a, [0, 1.42, 0.25], [0.2, 0, 0]);
  add(g, sph(0.035, 6, 5), 0xe4c26a, [0, 1.48, 0.23]);
  const lamp = new THREE.Group(); lamp.position.set(0.55, 0.5, 0.25); g.add(lamp);
  add(lamp, cyl(0.012, 0.012, 0.2, 6), DARK, [0, 0.27, 0]);
  add(lamp, cyl(0.1, 0.1, 0.03, 8), DARK, [0, 0.17, 0]);
  add(lamp, cyl(0.1, 0.1, 0.03, 8), DARK, [0, -0.08, 0]);
  add(lamp, cyl(0.075, 0.075, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xffd77a, emissive: 0xffb347, emissiveIntensity: 1.4 }), [0, 0.045, 0]);
  const light = new THREE.PointLight(0xffb45a, 0, 5, 1.4); light.position.set(0, 0.05, 0); light.userData.npcLamp = true; lamp.add(light);
  return g;
}

export const ISLAND_NPCS = {
  fisher: { name: '수달 어부', ico: '🦦', badge: 0xf2c230, build: otter, note: '노란 우비·방수모, 흰 주둥이와 수염, 넓적한 꼬리, 품에 빨간 부표' },
  yatai: { name: '포장마차 너구리', ico: '🦝', badge: 0x2f3f66, build: raccoon, note: '눈 둘레 검은 가면, 흰 머리띠, 남색 앞치마, 줄무늬 꼬리, 국자' },
  farm: { name: '밭 할머니 염소', ico: '🐐', badge: 0xd98a9a, build: goat, note: '뒤로 말린 뿔, 옆으로 뻗은 귀, 동그란 안경, 흰 수염, 분홍 카디건, 배추 바구니' },
  light: { name: '등대지기 부엉이', ico: '🦉', badge: 0x253a5e, build: hornedOwl, note: '귀깃(부엉이 표시), 주황 큰 눈, 남색 선장 모자, 손등불. 마을 의뢰 올빼미(흰 하트 얼굴)와 다르게' },
};

export function buildIslandNPC(id) { return ISLAND_NPCS[id].build(); }

export function setNpcNight(root, on) {
  root.traverse(o => { if (o.isPointLight && o.userData.npcLamp) o.intensity = on ? 6 : 0; });
}

const portraits = new Map();
export function npcPortrait(id, size = 160) {
  if (portraits.has(id)) return portraits.get(id);
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(size, size, false);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xfff4e4, 0x8a8a7a, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-1.5, 2.5, 3); sc.add(key);
  const fig = buildIslandNPC(id); sc.add(fig);
  fig.traverse(o => { if (o.isLight) o.visible = false; });
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  cam.position.set(0.35, 1.38, 2.35); cam.lookAt(0.02, 1.2, 0);
  r.render(sc, cam);
  const url = r.domElement.toDataURL('image/png');
  r.dispose();
  r.forceContextLoss();
  portraits.set(id, url);
  return url;
}
