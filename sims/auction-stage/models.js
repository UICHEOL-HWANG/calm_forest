import * as THREE from 'three';
import { buildAnimalHead, plushMat } from '../../js/animal-faces.js';

const mats = new Map();
export function clay(c, flat = true) {
  const k = `${c}:${flat}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, flatShading: flat }));
  return mats.get(k);
}
export function glowMat(c, k = 1) {
  return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.6 });
}
function put(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const UP = new THREE.Vector3(0, 1, 0);
function beam(parent, a, b, r, mat) {
  const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b);
  const d = pb.clone().sub(pa), len = d.length();
  const m = put(parent, new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(pa.clone().add(pb).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

export const VILLAGERS = {
  merchant: { name: '방랑 상인', color: 0x8a5cd0, hat: 0xf0c04a, look: 'peddler' },
  curator: { name: '큐레이터', color: 0x4a5a7a, hat: 0x8a2f3a, skin: 0xf0ddc8, look: 'curator' },
  builder: { name: '목수 아저씨', color: 0xe0663c, hat: 0xffd23f, look: 'builder' },
  star: { name: '별 보는 아이', color: 0x5b6fd0, hat: 0xffd86b, skin: 0xfde3c8, look: 'stargazer' },
  farmer: { name: '농부 삼촌', color: 0x5fbf62, hat: 0xf0cd6a, look: 'farmer' },
  pink: { name: '구경꾼', color: 0xf09aa8, hat: 0xfff2c4, look: 'plain' },
  teal: { name: '구경꾼', color: 0x5fb8b0, hat: 0xf6d38a, look: 'plain' },
};

function dress(g, def) {
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const M = THREE.Mesh;
  if (def.look === 'peddler') {
    add(new M(new THREE.ConeGeometry(0.66, 0.34, 14), clay(0xd9b46a)), 0, 1.52, 0);
    add(new M(new THREE.SphereGeometry(0.07, 8, 6), clay(0xb8923f)), 0, 1.7, 0);
    add(new M(new THREE.TorusGeometry(0.46, 0.06, 8, 18), clay(def.hat, false)), 0, 0.48, 0).rotation.x = Math.PI / 2;
    add(new M(new THREE.TorusGeometry(0.4, 0.05, 8, 18), clay(def.color, false)), 0, 1.5, 0).rotation.x = Math.PI / 2;
    add(new M(new THREE.SphereGeometry(0.38, 12, 10), clay(def.color, false)), 0, 0.95, -0.46).scale.set(1, 0.85, 0.8);
    add(new M(new THREE.BoxGeometry(0.16, 0.1, 0.14), clay(0xc9b070, false)), 0, 1.28, -0.34);
    add(new M(new THREE.SphereGeometry(0.2, 10, 8), clay(0xdcd3c8, false)), 0, 0.98, 0.26).scale.set(1, 0.7, 0.6);
  } else if (def.look === 'curator') {
    const GOLD = 0xc9a227, WHITE = 0xeae6de;
    add(new M(new THREE.SphereGeometry(0.4, 14, 10), clay(WHITE, false)), 0, 1.3, -0.03).scale.set(1.04, 0.78, 1.0);
    [-0.34, 0.34].forEach(ex => add(new M(new THREE.SphereGeometry(0.16, 10, 8), clay(WHITE, false)), ex, 1.12, 0.02).scale.set(0.7, 1.1, 0.9));
    [-0.17, 0.17].forEach(ex => { add(new M(new THREE.TorusGeometry(0.135, 0.022, 7, 16), clay(GOLD, false)), ex, 1.13, 0.3).rotation.x = 0.06; });
    add(new M(new THREE.BoxGeometry(0.08, 0.022, 0.022), clay(GOLD, false)), 0, 1.15, 0.31);
    add(new M(new THREE.SphereGeometry(0.47, 14, 10), clay(def.color, false)), 0, 0.62, 0.06).scale.set(0.92, 1.0, 0.78);
    add(new M(new THREE.TorusGeometry(0.24, 0.05, 8, 16), clay(0xf4f1ea, false)), 0, 0.9, 0.12).rotation.x = Math.PI / 2 - 0.25;
    [-1, 1].forEach(sx => { add(new M(new THREE.ConeGeometry(0.1, 0.16, 6), clay(def.hat, false)), sx * 0.09, 0.84, 0.3).rotation.z = sx * Math.PI / 2; });
    add(new M(new THREE.SphereGeometry(0.045, 8, 6), clay(def.hat, false)), 0, 0.84, 0.32);
  } else if (def.look === 'farmer') {
    add(new M(new THREE.CylinderGeometry(0.74, 0.74, 0.05, 16), clay(def.hat)), 0, 1.42, 0);
    add(new M(new THREE.SphereGeometry(0.3, 12, 8), clay(def.hat)), 0, 1.45, 0).scale.set(1, 0.62, 1);
    add(new M(new THREE.TorusGeometry(0.3, 0.035, 6, 14), clay(0x8e6b3a, false)), 0, 1.46, 0).rotation.x = Math.PI / 2;
  } else if (def.look === 'builder') {
    add(new M(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), clay(def.hat, false)), 0, 1.32, 0);
    add(new M(new THREE.BoxGeometry(0.44, 0.05, 0.22), clay(def.hat, false)), 0, 1.34, 0.34);
    add(new M(new THREE.BoxGeometry(0.1, 0.06, 0.5), clay(0xd9a520, false)), 0, 1.55, 0);
  } else if (def.look === 'stargazer') {
    g.scale.setScalar(0.84);
    add(new M(new THREE.SphereGeometry(0.405, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.5), clay(0x3b2f2a, false)), 0, 1.16, 0);
    add(new M(new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, Math.PI / 2.6, 0.5), clay(0x3b2f2a, false)), 0, 1.15, -0.07);
    add(new M(new THREE.TorusGeometry(0.375, 0.038, 6, 18), clay(0xf5f0e4, false)), 0, 1.3, 0).rotation.x = 1.42;
    add(new M(new THREE.OctahedronGeometry(0.19, 0), clay(def.hat, false)), 0, 1.56, 0.06).rotation.set(0.25, 0.5, 0.1);
  } else {
    add(new M(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), clay(def.hat)), 0, 1.4, 0);
    add(new M(new THREE.SphereGeometry(0.26, 10, 8), clay(def.hat)), 0, 1.5, 0);
  }
}

export function buildVillager(id) {
  const def = VILLAGERS[id];
  const root = new THREE.Group(), lift = new THREE.Group(), g = new THREE.Group();
  root.add(lift); lift.add(g);
  const body = put(g, new THREE.IcosahedronGeometry(0.5, 1), clay(def.color, false), 0, 0.55, 0);
  body.scale.set(1, 1.05, 1);
  put(g, new THREE.IcosahedronGeometry(0.38, 1), clay(def.skin || 0xffe0c0, false), 0, 1.15, 0);
  dress(g, def);
  const eye = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
  [-0.13, 0.13].forEach(ex => put(g, new THREE.SphereGeometry(0.05, 8, 8), eye, ex, 1.18, 0.32));
  return { root, lift, fig: g, def, scale: g.scale.x };
}

export function buildPaddle(color, s = 1) {
  const p = new THREE.Group();
  put(p, new THREE.CylinderGeometry(0.035, 0.042, 0.55, 6), clay(0x9b7247, false), 0, 0.27, 0);
  put(p, new THREE.CylinderGeometry(0.21, 0.21, 0.05, 18), clay(0xf6efe0, false), 0, 0.7, 0).rotation.x = Math.PI / 2;
  put(p, new THREE.TorusGeometry(0.21, 0.035, 6, 20), clay(color, false), 0, 0.7, 0);
  put(p, new THREE.CylinderGeometry(0.085, 0.085, 0.065, 14), clay(color, false), 0, 0.7, 0).rotation.x = Math.PI / 2;
  p.scale.setScalar(s);
  return p;
}

export function buildBear() {
  const R = 0.63, bs = [1.08, 1, 1.06], body = 0x936a44, belly = 0xd2b38a, ear = 0x6a4828;
  const root = new THREE.Group(), lift = new THREE.Group(), g = new THREE.Group();
  root.add(lift); lift.add(g);
  const bodyY = R * bs[1] + 0.02;
  put(g, new THREE.SphereGeometry(R, 32, 24), plushMat(body), 0, bodyY, 0).scale.set(...bs);
  put(g, new THREE.SphereGeometry(R * 0.62, 24, 18), plushMat(belly), 0, bodyY - R * 0.16, R * 0.55).scale.set(1, 1.1, 0.6);
  g.add(buildAnimalHead('bear', { HR: 0.44, HY: 1.34, body, belly }));
  const arm = side => {
    const pivot = new THREE.Group();
    pivot.rotation.order = 'YXZ';
    pivot.position.set(side * R * 0.85 * bs[0], bodyY + R * 0.54, R * 0.2);
    const aim = new THREE.Group();
    aim.rotation.z = side * 0.22;
    pivot.add(aim);
    const ar = R * 0.23, al = R * 0.32;
    put(aim, new THREE.CapsuleGeometry(ar, al, 4, 8), plushMat(body), 0, -(al / 2 + ar * 0.4), 0);
    put(aim, new THREE.SphereGeometry(ar * 1.06, 10, 8), clay(ear, false), 0, -(al + ar * 0.9), 0);
    const hand = new THREE.Group();
    hand.position.y = -(al + ar * 0.9);
    aim.add(hand);
    g.add(pivot);
    return { pivot, hand };
  };
  return { root, lift, fig: g, armR: arm(1), armL: arm(-1), def: { name: '나', color: 0x6fae7f }, scale: 1 };
}

export function buildMoonSwing() {
  const g = new THREE.Group(), wood = clay(0xc79a63, false), rope = clay(0xe8dcc0, false);
  const glows = [];
  for (const sx of [-0.78, 0.78]) {
    beam(g, [sx, 0, 0.36], [sx, 1.78, 0], 0.05, wood);
    beam(g, [sx, 0, -0.36], [sx, 1.78, 0], 0.05, wood);
  }
  beam(g, [-0.9, 1.78, 0], [0.9, 1.78, 0], 0.055, wood);
  for (const sx of [-0.3, 0.3]) beam(g, [sx, 1.76, 0], [sx, 0.56, 0], 0.014, rope);
  put(g, new THREE.BoxGeometry(0.78, 0.06, 0.32), wood, 0, 0.54, 0);
  const moon = put(g, new THREE.TorusGeometry(0.17, 0.055, 8, 22, Math.PI * 1.25), glowMat(0xfff0b0, 0.55), 0, 2.02, 0);
  moon.rotation.z = 0.95; glows.push(moon);
  for (const [x, y] of [[-0.55, 1.6], [0.55, 1.62], [0.0, 1.58]]) {
    beam(g, [x, 1.76, 0], [x, y + 0.05, 0], 0.006, rope);
    glows.push(put(g, new THREE.OctahedronGeometry(0.055, 0), glowMat(0xfff4c8, 0.7), x, y, 0));
  }
  g.userData.glows = glows;
  return g;
}

function lantern(color) {
  const g = new THREE.Group();
  const body = put(g, new THREE.SphereGeometry(0.15, 12, 10), glowMat(color, 0.9));
  body.scale.set(1, 1.2, 1); body.castShadow = false;
  put(g, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), clay(0x3a2a20), 0, 0.19, 0).castShadow = false;
  put(g, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8), clay(0x3a2a20), 0, -0.19, 0).castShadow = false;
  return { g, body };
}

function lanternString(parent, a, b, sag, n, colors, out) {
  const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, p = pa.clone().lerp(pb, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.014, 4), clay(0x3a2a20, false)));
  for (let i = 0; i < n; i++) {
    const p = curve.getPoint((i + 0.5) / n);
    const l = lantern(colors[i % colors.length]);
    l.g.position.set(p.x, p.y - 0.24, p.z);
    parent.add(l.g); out.push(l.body);
  }
}

function tree(parent, x, z, s = 1) {
  const t = new THREE.Group();
  put(t, new THREE.CylinderGeometry(0.16, 0.22, 1.0, 6), clay(0x7a5536), 0, 0.5, 0);
  put(t, new THREE.ConeGeometry(1.15, 2.2, 7), clay(0x4f8f55), 0, 1.9, 0);
  put(t, new THREE.ConeGeometry(0.85, 1.6, 7), clay(0x5ea062), 0, 2.7, 0);
  t.position.set(x, 0, z); t.scale.setScalar(s); parent.add(t);
}

export function buildStage() {
  const g = new THREE.Group(), lanterns = [];
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), clay(0x86b862));
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; g.add(grass);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 40), clay(0xcdb68e));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.01; plaza.receiveShadow = true; g.add(plaza);
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39, r = 2.5 + (i * 0.37) % 7.5;
    put(g, new THREE.CylinderGeometry(0.34, 0.36, 0.03, 7), clay(i % 2 ? 0xd9c49c : 0xbfa77e), Math.cos(a) * r, 0.02, Math.sin(a) * r + 1).castShadow = false;
  }

  const wood = clay(0xc9935f), woodD = clay(0x8f633f), woodDD = clay(0x6d4a2e);
  put(g, new THREE.BoxGeometry(6.4, 0.5, 3.2), wood, 0, 0.25, -3.2);
  for (let i = 0; i < 7; i++) put(g, new THREE.BoxGeometry(6.4, 0.012, 0.02), woodD, 0, 0.506, -4.6 + i * 0.45).castShadow = false;
  put(g, new THREE.BoxGeometry(6.44, 0.46, 0.05), woodD, 0, 0.24, -1.58);
  for (let i = 0; i < 16; i++) {
    const tri = put(g, new THREE.ConeGeometry(0.19, 0.32, 3), clay(i % 2 ? 0xfff2e0 : 0xff8f8f, false), -3.0 + i * 0.4, 0.33, -1.54);
    tri.rotation.set(Math.PI, Math.PI / 6, 0); tri.scale.z = 0.25;
  }
  put(g, new THREE.BoxGeometry(1.3, 0.25, 0.45), woodD, 0, 0.125, -1.35);

  for (const sx of [-3.15, 3.15]) put(g, new THREE.CylinderGeometry(0.1, 0.12, 4.1, 8), woodDD, sx, 2.05, -4.6);
  for (let i = 0; i < 14; i++) {
    put(g, new THREE.BoxGeometry(0.45, 3.1, 0.12), clay(i % 2 ? 0x9c3533 : 0xb8433f, false), -2.93 + i * 0.45, 2.05, -4.62 + (i % 2) * 0.07);
  }
  put(g, new THREE.BoxGeometry(6.6, 0.16, 0.22), woodDD, 0, 4.0, -4.55);
  put(g, new THREE.BoxGeometry(6.4, 0.34, 0.16), clay(0xe0b04a, false), 0, 3.74, -4.46);
  for (let i = 0; i < 14; i++) put(g, new THREE.SphereGeometry(0.23, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clay(0xe0b04a, false), -2.93 + i * 0.45, 3.58, -4.42);

  put(g, new THREE.CylinderGeometry(1.05, 1.05, 0.04, 28), clay(0xefe3c8, false), -1.25, 0.52, -3.25).castShadow = false;
  const item = buildMoonSwing();
  item.position.set(-1.25, 0.54, -3.25); item.rotation.y = 0.25; g.add(item);

  put(g, new THREE.BoxGeometry(0.9, 1.0, 0.62), woodDD, 1.75, 1.0, -2.7);
  put(g, new THREE.BoxGeometry(1.06, 0.08, 0.74), clay(0xa0703f), 1.75, 1.54, -2.7).rotation.x = -0.12;
  put(g, new THREE.BoxGeometry(0.5, 0.36, 0.02), clay(0xe0b04a, false), 1.75, 1.05, -2.38);
  put(g, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), woodDD, 2.0, 1.6, -2.62);
  const gavel = new THREE.Group();
  gavel.position.set(1.52, 1.62, -2.6);
  put(gavel, new THREE.CylinderGeometry(0.028, 0.028, 0.46, 6), clay(0x7a5232, false), 0.23, 0, 0).rotation.z = Math.PI / 2;
  put(gavel, new THREE.CylinderGeometry(0.075, 0.075, 0.26, 10), clay(0x5e3d27, false), 0.47, 0, 0).rotation.x = Math.PI / 2;
  g.add(gavel);

  put(g, new THREE.BoxGeometry(0.5, 0.06, 0.06), woodDD, -3.4, 3.65, -4.4).castShadow = false;
  const bell = new THREE.Group();
  bell.position.set(-3.6, 3.62, -4.4);
  put(bell, new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4), clay(0x3a2a20), 0, -0.06, 0);
  put(bell, new THREE.CylinderGeometry(0.07, 0.19, 0.26, 14), clay(0xd9a93a, false), 0, -0.25, 0);
  put(bell, new THREE.SphereGeometry(0.06, 8, 6), clay(0x8a6a2a, false), 0, -0.4, 0);
  g.add(bell);

  for (const [x, z] of [[-6.4, 0.8], [6.4, 0.8]]) {
    put(g, new THREE.CylinderGeometry(0.09, 0.11, 4.6, 8), woodDD, x, 2.3, z);
    put(g, new THREE.SphereGeometry(0.13, 8, 6), clay(0xe0b04a, false), x, 4.65, z);
  }
  const warm = [0xff9a4c, 0xffcf5a, 0xff6f6f, 0xffb35c];
  lanternString(g, [-6.4, 4.45, 0.8], [6.4, 4.45, 0.8], 0.9, 11, warm, lanterns);
  lanternString(g, [-3.15, 4.05, -4.5], [6.4, 4.45, 0.8], 0.8, 9, warm.slice(1), lanterns);
  lanternString(g, [3.15, 4.05, -4.5], [-6.4, 4.45, 0.8], 0.8, 9, warm.slice(2).concat(warm.slice(0, 2)), lanterns);

  for (const [x, z, s] of [[-8.5, -6, 1.2], [-10.5, -1, 1], [9, -5.5, 1.15], [10.8, 0, 0.95], [-6.5, -9, 1.3], [6, -9.5, 1.25], [0, -10.5, 1.4], [-11, 5, 1], [11.5, 5, 1.1]]) tree(g, x, z, s);
  for (const [x, z] of [[-4.2, -2.2], [4.3, -2.4]]) {
    put(g, new THREE.CylinderGeometry(0.32, 0.28, 0.7, 10), clay(0x9a6a40), x, 0.35, z);
    put(g, new THREE.TorusGeometry(0.31, 0.03, 6, 14), woodDD, x, 0.55, z).rotation.x = Math.PI / 2;
  }
  for (const [x, z, c] of [[-4.6, -0.8, 0xff8fb0], [4.7, -1.0, 0xffd45a]]) {
    put(g, new THREE.CylinderGeometry(0.28, 0.22, 0.42, 8), clay(0xb8673f), x, 0.21, z);
    for (let k = 0; k < 5; k++) put(g, new THREE.SphereGeometry(0.1, 6, 5), clay(c, false), x + Math.cos(k * 1.26) * 0.15, 0.5, z + Math.sin(k * 1.26) * 0.15);
  }

  return { group: g, lanterns, gavel, bell, item, itemPos: new THREE.Vector3(-1.25, 0.54, -3.25) };
}

export function makeConfetti(scene) {
  const parts = [];
  const geo = new THREE.PlaneGeometry(0.09, 0.14);
  const cols = [0xff8f8f, 0xffd45a, 0x8fd3a0, 0x8fb8ff, 0xfff2e0];
  return {
    burst(pos) {
      for (let i = 0; i < 46; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, transparent: true }));
        m.position.copy(pos);
        m.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 3.2, 2.4 + Math.random() * 2.4, (Math.random() - 0.5) * 3.2), w: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0), life: 1.8 };
        scene.add(m); parts.push(m);
      }
    },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const m = parts[i], u = m.userData;
        u.v.y -= 6.5 * dt; u.v.multiplyScalar(0.985);
        m.position.addScaledVector(u.v, dt);
        m.rotation.x += u.w.x * dt; m.rotation.y += u.w.y * dt;
        u.life -= dt; m.material.opacity = Math.min(1, u.life * 2);
        if (u.life <= 0 || m.position.y < 0.02) { scene.remove(m); m.material.dispose(); parts.splice(i, 1); }
      }
    },
  };
}
