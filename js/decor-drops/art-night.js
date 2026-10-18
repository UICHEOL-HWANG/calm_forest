import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['winterSled', 'winterLamp', 'winterSofa', 'stoneGems', 'stoneBear', 'stoneHearth', 'lanternBoat', 'lanternMist', 'lanternRug', 'guardFlag', 'guardJar', 'guardScarecrow'];

const TAU = Math.PI * 2;
const lathe = (pr, seg = 14) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const sph = (r, w, h, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s) => new THREE.ConeGeometry(r, h, s);
const flatRing = (p, r, tube, col, y, rs, ts) => { const t = part(p, new THREE.TorusGeometry(r, tube, rs, ts), col, 0, y, 0); t.rotation.x = Math.PI / 2; return t; };
const seeded = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const basicBaked = (g) => new THREE.Mesh(bakeGroup(g), new THREE.MeshBasicMaterial({ vertexColors: true }));

function starGeo(r1, r2, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

function swarm(kind, n, r, mat, place, extra = {}) {
  const im = new THREE.InstancedMesh(sph(r, 6, 5), mat, n), m = new THREE.Matrix4(), pts = [];
  for (let i = 0; i < n; i++) { const p = place(i); pts.push(p); m.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m); }
  im.instanceMatrix.needsUpdate = true;
  im.userData = { anim: kind, pts, ...extra };
  return im;
}

function boatParts(s, g) {
  const hp = part(s, lathe([[0, 0], [0.22, 0.02], [0.3, 0.12], [0.32, 0.22], [0.28, 0.22], [0.25, 0.14], [0.18, 0.06], [0, 0.05]], 16), 0x9c6b40); hp.scale.set(2.2, 1, 1);
  const rim = flatRing(s, 0.3, 0.02, 0x7d5432, 0.22, 4, 20); rim.scale.set(2.2, 1, 1);
  [-0.25, 0.15].forEach(x => part(s, box(0.06, 0.03, 0.5), 0xc49866, x, 0.17, 0));
  part(s, cyl(0.012, 0.012, 0.9, 5), 0xc49866, -0.05, 0.25, 0.2).rotation.z = 1.45;
  part(s, box(0.16, 0.02, 0.07), 0xc49866, -0.5, 0.29, 0.2);
  part(s, cyl(0.018, 0.018, 0.62, 5), 0x6b4a2e, 0.48, 0.48, 0);
  part(s, box(0.2, 0.02, 0.02), 0x6b4a2e, 0.57, 0.78, 0);
  part(g, box(0.11, 0.14, 0.11), 0xffb84a, 0.66, 0.64, 0);
  [0.08, -0.08].forEach(y => part(s, box(0.14, 0.022, 0.14), 0x3a2f26, 0.66, 0.64 + y, 0));
  part(s, cone(0.09, 0.06, 4).rotateY(Math.PI / 4), 0x3a2f26, 0.66, 0.76, 0);
}

const BUILD = {
  winterSled(s) {
    for (let i = 0; i < 4; i++) part(s, box(0.16, 0.04, 0.9), 0xc9874f, -0.27 + i * 0.18, 0.18, 0);
    [-0.32, 0.32].forEach(x => {
      part(s, box(0.04, 0.04, 1.0), 0xb5532f, x, 0.02, 0);
      const curl = part(s, new THREE.TorusGeometry(0.1, 0.02, 5, 10, Math.PI), 0xb5532f, x, 0.12, 0.5); curl.rotation.y = Math.PI / 2;
      [-0.3, 0.3].forEach(z => part(s, box(0.03, 0.16, 0.03), 0xb5532f, x, 0.1, z));
    });
    flatRing(s, 0.17, 0.05, 0xe8e0d0, 0.24, 6, 14).position.set(0.05, 0.24, -0.15);
    for (let i = 0; i < 6; i++) part(s, box(0.11, 0.025, 0.08), i % 2 ? 0xd65a4e : 0xe8e0d0, 0.25, 0.22, -0.1 + i * 0.07);
    return { k: 0.75 };
  },
  winterLamp(s, g) {
    part(s, cyl(0.2, 0.24, 0.12, 14), 0x9c6b40, 0, 0.06, 0);
    part(s, sph(0.3, 18, 12, 0, TAU, 0, Math.PI / 2), 0x26335e, 0, 0.12, 0);
    flatRing(s, 0.31, 0.015, 0xd9b25a, 0.12, 5, 24);
    part(g, starGeo(0.07, 0.03, 0.02), 0xf2c050, 0, 0.47, -0.01);
    const dots = new THREE.Group();
    [[0.3, 0.6], [1.2, 0.9], [2.1, 0.45], [2.9, 1.05], [3.8, 0.7], [4.6, 0.35], [5.4, 0.95], [0.8, 1.25]].forEach(([a, b]) => {
      const p = new THREE.Vector3().setFromSphericalCoords(0.305, b, a); part(dots, sph(0.018, 5, 4), 0xf5c95a, p.x, p.y, p.z);
    });
    const spin = basicBaked(dots); spin.position.y = 0.12; spin.userData = { anim: 'spin', axis: 'y', speed: 0.2 };
    return { k: 0.6, flat: false, anims: [spin] };
  },
  winterSofa(s, g) {
    const cush = 0x9fc3e0, frame = 0xf6f1ea, WY = 1.575, WZ = -0.52;
    part(s, box(2.0, 0.42, 0.85), cush, 0, 0.3, 0);
    part(s, box(2.0, 0.55, 0.22), cush, 0, 0.7, -0.33);
    [-0.95, 0.95].forEach(x => part(s, box(0.2, 0.55, 0.85), cush, x, 0.45, 0));
    part(s, box(0.75, 0.05, 0.9), 0xd65a4e, 0.45, 0.53, 0.02);
    for (let i = 0; i < 4; i++) part(s, box(0.75, 0.052, 0.05), 0xfbf3e6, 0.45, 0.535, -0.3 + i * 0.2);
    part(s, box(2.2, 1.1, 0.12), frame, 0, WY, WZ);
    part(g, box(1.95, 0.9, 0.05), 0x203a66, 0, WY, WZ + 0.05);
    part(s, box(0.06, 0.9, 0.07), frame, 0, WY, WZ + 0.07);
    part(s, box(1.95, 0.06, 0.07), frame, 0, WY, WZ + 0.07);
    part(s, box(2.3, 0.08, 0.3), frame, 0, WY - 0.58, WZ + 0.12);
    [-1.05, 1.05].forEach(x => part(s, box(0.07, WY - 0.55, 0.07), frame, x, (WY - 0.55) / 2, WZ));
    const rnd = seeded(7), TOP = WY + 0.42, FALL = 0.84;
    const snow = swarm('snow', 26, 0.025, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdde8ff, emissiveIntensity: 0.4, roughness: 1 }),
      () => { const x = (rnd() - 0.5) * 1.8, ph = rnd(), sp = 0.15 + rnd() * 0.15; return { x, y: TOP - ph * FALL, z: WZ + 0.12, ph, sp }; },
      { top: TOP, fall: FALL });
    return { k: 0.85, flat: false, anims: [snow] };
  },
  stoneGems(s, g, glass) {
    part(s, box(1.1, 0.75, 0.55), 0x8a5a36, 0, 0.375, 0);
    part(s, box(1.14, 0.05, 0.59), 0x6b4a2e, 0, 0.77, 0);
    part(s, box(1.0, 0.03, 0.45), 0x5a3a5e, 0, 0.805, 0);
    [[-0.32, 0x9a63d6, 0.1], [-0.05, 0x3fbf8a, 0.08], [0.22, 0xe8b33a, 0.09], [0.38, 0x5aa6e0, 0.07]].forEach(([x, c, r]) => {
      part(s, new THREE.OctahedronGeometry(r, 0), c, x, 0.83 + r, 0).rotation.set(0.3, x * 4, 0.2);
    });
    part(glass, box(1.0, 0.3, 0.45), 0xe6f6ff, 0, 0.95, 0);
    return { k: 0.42 };
  },
  stoneBear(s) {
    const st = 0xa9a39a;
    part(s, box(0.6, 0.5, 0.6), 0x8a837a, 0, 0.25, 0);
    part(s, sph(0.26, 10, 8).scale(1, 1.15, 0.9), st, 0, 0.78, 0);
    part(s, sph(0.21, 10, 8), st, 0, 1.15, 0);
    [-0.13, 0.13].forEach(x => part(s, sph(0.07, 7, 5), st, x, 1.33, 0));
    part(s, sph(0.08, 7, 5), 0xc4beb4, 0, 1.11, 0.18);
    [-0.18, 0.18].forEach(x => part(s, sph(0.08, 7, 5), st, x, 0.85, 0.15));
    return { k: 0.75 };
  },
  stoneHearth(s) {
    const rock = [0x9b9389, 0x8a837a, 0xa8a196, 0x938b80], rnd = seeded(7);
    for (let row = 0; row < 6; row++) for (let i = 0; i < 6; i++) {
      const x = -1.0 + i * 0.4 + (row % 2) * 0.2, y = 0.12 + row * 0.27;
      if (Math.abs(x) < 0.5 && y < 0.9) continue;
      part(s, box(0.38, 0.25, 0.45), rock[(row + i) % 4], x, y, 0).rotation.y = (rnd() - 0.5) * 0.15;
    }
    part(s, box(2.6, 0.12, 0.6), 0x7d5432, 0, 1.7, 0.05);
    part(s, box(1.0, 0.85, 0.3), 0x2a2420, 0, 0.45, -0.1);
    [-0.15, 0.15].forEach((x, i) => { const l = part(s, cyl(0.06, 0.06, 0.7, 6), 0x6b4a2e, x * 0.5, 0.1, 0.05); l.rotation.z = Math.PI / 2; l.rotation.y = i ? 0.4 : -0.4; });
    const fl = new THREE.Group();
    [[0, 0.32, 0xff9a3c], [-0.13, 0.25, 0xffc25a], [0.13, 0.25, 0xffc25a], [0, 0.22, 0xffe08a]].forEach(([x, h, c]) => part(fl, cone(0.09, h, 6), c, x, h / 2, 0));
    const flames = basicBaked(fl); flames.position.set(0, 0.18, 0.05); flames.userData = { anim: 'flame', amp: 0.25, speed: 7 };
    return { k: 0.75, anims: [flames] };
  },
  lanternBoat(s, g) {
    boatParts(s, g);
    return { k: 1, bob: { anim: 'bob', amp: 0.012, roll: 0.025, speed: 1.2 } };
  },
  lanternMist(s, g) {
    const st = 0xa49c90;
    part(s, cyl(0.24, 0.28, 0.12, 6), st, 0, 0.06, 0);
    part(s, cyl(0.08, 0.1, 0.55, 6), st, 0, 0.4, 0);
    part(s, box(0.42, 0.06, 0.42), st, 0, 0.7, 0);
    part(g, box(0.28, 0.27, 0.28), 0x9fd0ea, 0, 0.87, 0);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => part(s, box(0.06, 0.3, 0.06), st, x * 0.14, 0.87, z * 0.14));
    part(s, cone(0.36, 0.2, 4).rotateY(Math.PI / 4), st, 0, 1.12, 0);
    part(s, sph(0.05, 6, 5), st, 0, 1.25, 0);
    return { k: 0.7 };
  },
  lanternRug(s) {
    const pond = new THREE.Group(); pond.scale.z = 0.7; s.add(pond);
    part(pond, cyl(1.5, 1.5, 0.02, 32), 0x3f6f9e, 0, 0.01, 0);
    [1.1, 0.75, 0.4].forEach((r, i) => flatRing(pond, r, 0.015, 0x9fc8e2, 0.022 + i * 0.001, 4, 40));
    [[0.9, 0.5, 0.2], [1.1, -0.35, 0.16], [-1.05, -0.45, 0.18]].forEach(([x, z, r]) => part(pond, cyl(r, r, 0.015, 12, 1, false, 0.4, TAU - 0.4), 0x5f9e4f, x, 0.03, z));
    const lotus = new THREE.Group(); lotus.position.set(0.9, 0.03, 0.5); pond.add(lotus);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(lotus, sph(0.05, 6, 4).scale(0.6, 1, 0.35), 0xf3a9c0, Math.cos(a) * 0.04, 0.05, Math.sin(a) * 0.04).rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
    part(lotus, sph(0.025, 6, 5), 0xf6d36a, 0, 0.06, 0);
    [[-1.4, -0.2], [-1.3, 0.35], [1.42, 0.05], [0.2, -1.38]].forEach(([x, z]) => {
      for (let k = 0; k < 4; k++) part(pond, cone(0.025, 0.4 + k * 0.08, 4), 0x6f9a4a, x + (k - 1.5) * 0.05, 0.2 + k * 0.04, z).rotation.z = (k - 1.5) * 0.12;
    });
    const rnd = seeded(7);
    const glints = swarm('glint', 8, 0.018, new THREE.MeshStandardMaterial({ color: 0xcdeefa, emissive: 0xcdeefa, emissiveIntensity: 0.6, roughness: 0.6 }),
      () => ({ x: (rnd() - 0.5) * 2, y: 0.03, z: (rnd() - 0.5) * 1.3, ph: rnd() * 6 }), { speed: 2 });
    return { k: 0.87, flat: false, anims: [glints] };
  },
  guardFlag(s) {
    part(s, cyl(0.2, 0.24, 0.1, 10), 0x6b4a2e, 0, 0.05, 0);
    part(s, cyl(0.025, 0.025, 1.6, 6), 0x8a5a36, 0, 0.85, 0);
    part(s, sph(0.05, 8, 6), 0xe8c25a, 0, 1.68, 0);
    const cloth = new THREE.Group();
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.5, 0, 0.75, -0.25, 0], 3)); tri.computeVertexNormals();
    part(cloth, tri, 0xd65a4e);
    part(cloth, starGeo(0.08, 0.035, 0.01), 0xe8c25a, 0.25, -0.25, 0.005);
    const sway = new THREE.Mesh(bakeGroup(cloth), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
    sway.position.set(0.03, 1.6, 0); sway.userData = { anim: 'sway', axis: 'y', amp: 0.18, speed: 1.3 };
    return { k: 0.7, anims: [sway] };
  },
  guardJar(s, g, glass) {
    part(glass, lathe([[0, 0], [0.17, 0], [0.19, 0.05], [0.19, 0.38], [0.13, 0.45], [0.12, 0.5], [0, 0.5]], 16), 0xe6f6ff);
    part(s, cyl(0.11, 0.1, 0.07, 10), 0xc49866, 0, 0.53, 0);
    const rnd = seeded(7);
    const bugs = swarm('fireflies', 6, 0.022, new THREE.MeshStandardMaterial({ color: 0xd8ff7a, emissive: 0xd8ff7a, emissiveIntensity: 0.85, roughness: 0.6 }),
      () => { const ph = rnd() * 6; return { x: Math.sin(ph) * 0.11, y: 0.2 + Math.sin(ph * 2) * 0.1, z: Math.cos(ph) * 0.11, ph }; });
    return { k: 0.7, anims: [bugs] };
  },
  guardScarecrow(s) {
    const straw = 0xe0b84a, gold = 0xe8c25a;
    part(s, cyl(0.28, 0.32, 0.08, 10), 0x7d5432, 0, 0.04, 0);
    part(s, cyl(0.035, 0.035, 1.3, 6), 0x8a5a36, 0, 0.7, 0);
    part(s, box(1.0, 0.07, 0.07), 0x8a5a36, 0, 1.0, 0);
    part(s, cyl(0.2, 0.28, 0.6, 8), gold, 0, 0.85, 0);
    part(s, sph(0.2, 10, 8), 0xc9a56a, 0, 1.38, 0);
    [-0.07, 0.07].forEach(x => part(s, sph(0.025, 5, 4), 0x2a2624, x, 1.4, 0.18));
    part(s, cyl(0.36, 0.36, 0.03, 14), straw, 0, 1.55, 0);
    part(s, cone(0.17, 0.25, 10), straw, 0, 1.68, 0);
    [-0.52, 0.52].forEach(x => { for (let k = -1; k <= 1; k++) part(s, cyl(0.012, 0.004, 0.18, 4), straw, x + Math.sign(x) * 0.06, 1.0 + k * 0.04, 0).rotation.z = Math.sign(x) * (1.3 + k * 0.25); });
    return { k: 0.8, rough: 0.5, metal: 0.25 };
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown night set decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group(), glass = new THREE.Group();
  const { k, flat = true, rough = 0.85, metal = 0, anims = [], bob = null } = fn(solid, glow, glass);
  if (glow.children.length && glass.children.length) throw new Error(`night set decor ${id}: glow and glass both used`);
  const out = new THREE.Group(), host = bob ? new THREE.Group() : out;
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: metal }));
  body.castShadow = true; body.receiveShadow = true;
  host.add(body);
  if (glow.children.length) host.add(basicBaked(glow));
  if (glass.children.length) host.add(new THREE.Mesh(bakeGroup(glass), new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false })));
  if (bob) { host.userData = { ...bob }; out.add(host); }
  anims.forEach(a => out.add(a));
  out.traverse(o => { if (o.isMesh && o !== body) o.userData.noShadow = true; });
  out.scale.setScalar(k);
  return out;
}
