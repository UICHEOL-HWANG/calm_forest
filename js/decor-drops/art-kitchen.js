import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['picnicBasket', 'picnicPies', 'picnicTable', 'teaBowl', 'teaCake', 'teaCupboard'];

const TAU = Math.PI * 2;
const lathe = (pr, seg = 14) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const sph = (r, w, h, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const flatRing = (p, r, tube, col, y, rs, ts) => { const t = part(p, new THREE.TorusGeometry(r, tube, rs, ts), col, 0, y, 0); t.rotation.x = Math.PI / 2; return t; };

function apple(col = 0xd9483b) {
  const g = new THREE.Group();
  part(g, sph(0.13, 10, 8).scale(1, 0.88, 1), col);
  part(g, cyl(0.008, 0.01, 0.07, 4), 0x5a3a22, 0, 0.13, 0);
  part(g, sph(0.04, 6, 4).scale(1.6, 0.25, 0.8), 0x5aa04a, 0.04, 0.15, 0).rotation.z = -0.5;
  return g;
}
function pear() {
  const g = new THREE.Group();
  part(g, lathe([[0, -0.12], [0.11, -0.08], [0.12, 0], [0.07, 0.08], [0.045, 0.15], [0, 0.17]], 10), 0xc8d65a);
  part(g, cyl(0.008, 0.01, 0.06, 4), 0x5a3a22, 0, 0.19, 0);
  return g;
}
function orange() {
  const g = new THREE.Group();
  part(g, sph(0.12, 10, 8), 0xf0952e);
  part(g, sph(0.02, 5, 4), 0x5aa04a, 0, 0.12, 0);
  return g;
}
function grapes() {
  const g = new THREE.Group();
  [[0, 0, 0], [0.06, 0, 0.03], [-0.06, 0, 0.03], [0, 0, -0.06], [0.03, -0.07, 0], [-0.03, -0.07, 0.02], [0, -0.13, 0]]
    .forEach(([x, y, z]) => part(g, sph(0.045, 7, 6), 0x7d4fa8, x, y, z));
  return g;
}
const FRUITS = [apple, pear, orange, () => apple(0xe8b33a), grapes, apple];

function carrot() {
  const g = new THREE.Group();
  part(g, new THREE.ConeGeometry(0.07, 0.3, 7), 0xf08a3c).rotation.z = Math.PI;
  [-0.4, 0, 0.4].forEach(a => { part(g, new THREE.ConeGeometry(0.025, 0.16, 4), 0x5aa04a, Math.sin(a) * 0.04, 0.22, 0).rotation.z = a; });
  g.rotation.z = 1.1;
  return g;
}
function tomato() {
  const g = new THREE.Group();
  part(g, sph(0.12, 10, 8).scale(1, 0.82, 1), 0xe5483f);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; part(g, box(0.07, 0.01, 0.02), 0x4f9a44, Math.cos(a) * 0.035, 0.1, Math.sin(a) * 0.035).rotation.y = -a; }
  return g;
}
function pumpkin() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(g, sph(0.09, 8, 6).scale(0.7, 0.85, 1), 0xf2a33a, Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06); }
  part(g, cyl(0.015, 0.02, 0.07, 5), 0x6b8a3a, 0, 0.09, 0);
  return g;
}
const VEGGIES = [tomato, carrot, pumpkin, tomato, carrot, tomato];

function fruitPile(r, layers = 2) {
  const g = new THREE.Group();
  let k = 0;
  for (let L = 0; L < layers; L++) {
    const n = L === 0 ? 6 : 3, rr = L === 0 ? r : r * 0.45;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + L * 0.6, f = FRUITS[k++ % FRUITS.length]();
      f.position.set(Math.cos(a) * rr, L * 0.15, Math.sin(a) * rr); f.rotation.y = a; g.add(f);
    }
  }
  const top = FRUITS[k % FRUITS.length](); top.position.y = layers * 0.15; g.add(top);
  return g;
}
function veggiePile(r) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, v = VEGGIES[i % VEGGIES.length]();
    v.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); v.rotation.y = a; g.add(v);
  }
  const top = pumpkin(); top.scale.setScalar(1.3); top.position.y = 0.12; g.add(top);
  const c2 = carrot(); c2.position.set(0.08, 0.2, 0.05); g.add(c2);
  return g;
}

function pie(fill, r) {
  const g = new THREE.Group(), crust = 0xe0b067, cut = 0.55;
  part(g, cyl(r, r * 0.9, 0.1, 18, 1, false, cut, TAU - cut), crust, 0, 0.05, 0);
  part(g, cyl(r * 0.88, r * 0.88, 0.02, 18, 1, false, cut, TAU - cut), fill, 0, 0.105, 0);
  flatRing(g, r * 0.94, 0.035, crust, 0.11, 5, 22);
  for (let i = -2; i <= 2; i++) {
    const len = r * 1.7 * Math.sqrt(1 - (i * 0.32 / 0.9) ** 2);
    part(g, box(0.035, 0.02, len), crust, i * r * 0.32, 0.125, 0);
    part(g, box(len, 0.02, 0.035), crust, 0, 0.13, i * r * 0.32);
  }
  const slice = new THREE.Group();
  part(slice, cyl(r, r * 0.9, 0.1, 6, 1, false, 0, cut), crust, 0, 0.05, 0);
  part(slice, cyl(r * 0.88, r * 0.88, 0.02, 6, 1, false, 0, cut), fill, 0, 0.105, 0);
  slice.position.set(Math.sin(cut / 2) * 0.14, 0, Math.cos(cut / 2) * 0.14);
  g.add(slice);
  return g;
}

function steamPuffs(cols) {
  const g = new THREE.Group();
  cols.forEach(([x, y, z, phase]) => {
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(sph(0.06, 6, 5), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 1, depthWrite: false }));
      p.position.set(x, y, z); p.userData = { base: [x, y, z], phase, i };
      g.add(p);
    }
  });
  g.visible = false;
  g.userData = { anim: 'steam', idleHidden: true, rise: 0.6, speed: 0.5 };
  return g;
}

function starShape(r1, r2) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  return s;
}

const BUILD = {
  picnicBasket(s) {
    part(s, lathe([[0, 0], [0.42, 0], [0.5, 0.08], [0.56, 0.26], [0.58, 0.32], [0.54, 0.32], [0.5, 0.26], [0.45, 0.1], [0, 0.06]], 16), 0xc9a46a);
    [0.08, 0.17, 0.26].forEach(y => flatRing(s, 0.5 + y * 0.25, 0.025, 0xa9844e, y, 4, 18));
    part(s, new THREE.TorusGeometry(0.5, 0.035, 5, 16, Math.PI), 0xa9844e, 0, 0.3, 0);
    const pile = fruitPile(0.3, 2); pile.position.y = 0.22; s.add(pile);
    return { k: 0.5, flat: false };
  },
  picnicPies(s) {
    part(s, cyl(0.03, 0.03, 1.25, 6), 0x8a5a36, 0, 0.62, 0);
    [[0.48, 0.05, 0xc23b4a], [0.38, 0.5, 0xe8b33a], [0.3, 0.92, 0x5b5fb8]].forEach(([r, y, f]) => {
      part(s, cyl(r, r * 0.95, 0.04, 16), 0x8a5a36, 0, y, 0);
      const p = pie(f, r * 0.72); p.position.y = y + 0.02; p.rotation.y = y * 3; s.add(p);
    });
    part(s, sph(0.06, 8, 6), 0xb5851f, 0, 1.3, 0);
    return { k: 0.45, flat: false, anims: [steamPuffs([[0, 0.17, 0, 0], [0, 0.6, 0, 0.4]])] };
  },
  picnicTable(s) {
    part(s, cyl(1.15, 1.15, 0.08, 20), 0x9c6b40, 0, 0.82, 0);
    part(s, cyl(0.09, 0.14, 0.8, 8), 0x7d5432, 0, 0.4, 0);
    part(s, cyl(0.5, 0.55, 0.06, 12), 0x7d5432, 0, 0.03, 0);
    const cloth = new THREE.Group(), N = 8, W = 2.3 / N;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      part(cloth, box(W, 0.012, W), (i + j) % 2 === 0 ? 0xd65a4e : 0xfbf3e6, -1.15 + (i + 0.5) * W, 0, -1.15 + (j + 0.5) * W);
    }
    cloth.position.y = 0.87; s.add(cloth);
    return { k: 0.7, flat: true };
  },
  teaBowl(s) {
    part(s, lathe([[0, 0], [0.18, 0], [0.18, 0.03], [0.06, 0.06], [0.05, 0.16], [0.2, 0.2], [0.46, 0.3], [0.5, 0.36], [0.47, 0.36], [0.42, 0.31], [0.18, 0.23], [0, 0.22]], 18), 0x8fd3bf);
    flatRing(s, 0.49, 0.022, 0xfdfbf6, 0.36, 5, 22);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(s, sph(0.03, 6, 4), 0xfdfbf6, Math.cos(a) * 0.37, 0.27, Math.sin(a) * 0.37); }
    const pile = veggiePile(0.27); pile.position.y = 0.34; s.add(pile);
    return { k: 0.45, flat: false };
  },
  teaCake(s, glow, glass) {
    part(s, lathe([[0, 0], [0.12, 0], [0.04, 0.03], [0.04, 0.22], [0.5, 0.25], [0.5, 0.28], [0, 0.28]], 18), 0xf7c6cf);
    const cake = new THREE.Group(); cake.position.y = 0.28; s.add(cake);
    part(cake, cyl(0.3, 0.3, 0.2, 20), 0xc9c3ef, 0, 0.1, 0);
    part(cake, cyl(0.21, 0.21, 0.17, 20), 0xf7c6cf, 0, 0.285, 0);
    [[0.3, 0.2], [0.21, 0.37]].forEach(([r, y]) => flatRing(cake, r, 0.03, 0xfff7ee, y, 6, 22));
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; part(cake, sph(0.022, 6, 5), 0xfbe3a6, Math.cos(a) * 0.3, 0.13, Math.sin(a) * 0.3); }
    part(s, sph(0.06, 8, 6), 0xf7c6cf, 0, 1.16, 0);
    part(glass, sph(0.5, 18, 10, 0, TAU, 0, Math.PI / 2).scale(1, 1.75, 1), 0xe6f6ff, 0, 0.28, 0);
    const starGeo = new THREE.ExtrudeGeometry(starShape(0.1, 0.045), { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015);
    const star = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: 0xf2c050 }));
    star.position.set(0, 0.78, 0); star.userData = { anim: 'spin', axis: 'y', speed: 0.8 };
    return { k: 0.45, flat: false, anims: [star] };
  },
  teaCupboard(s) {
    part(s, box(2.6, 0.9, 0.7), 0xbfe3d6, 0, 0.45, 0);
    part(s, box(2.7, 0.06, 0.8), 0xfbf6f0, 0, 0.93, 0);
    [-0.65, 0.65].forEach(x => part(s, box(1.1, 0.7, 0.02), 0xa6d2c3, x, 0.45, 0.36));
    [-0.2, 0.2].forEach(x => part(s, sph(0.04, 6, 5), 0xd9b25a, x, 0.5, 0.38));
    [-1.3, 1.3].forEach(x => {
      part(s, cyl(0.025, 0.03, 1.66, 6), 0x8a6a4a, x, 1.79, 0.2);
      part(s, sph(0.045, 6, 5), 0xd9b25a, x, 2.64, 0.2);
    });
    const bunting = new THREE.Group(), cols = [0xf7c6cf, 0xbfe3d6, 0xfbe3a6, 0xc9c3ef], SAG = 0.6, HALF = 1.3;
    part(bunting, new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-HALF, 0, 0), new THREE.Vector3(0, -SAG, 0), new THREE.Vector3(HALF, 0, 0)), 20, 0.01, 4), 0x8a6a4a);
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.5) / 9, x = -HALF + u * 2 * HALF, y = -SAG * 2 * u * (1 - u);
      const tri = part(bunting, new THREE.ConeGeometry(0.13, 0.26, 3), cols[i % 4], x, y - 0.13, 0);
      tri.rotation.z = Math.PI; tri.scale.z = 0.12;
    }
    const sway = new THREE.Mesh(bakeGroup(bunting), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, side: THREE.DoubleSide }));
    sway.position.set(0, 2.55, 0.2); sway.userData = { anim: 'sway', axis: 'x', amp: 0.04, speed: 1.4 };
    return { k: 0.6, flat: true, anims: [sway] };
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown kitchen set decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group(), glass = new THREE.Group();
  const { k, flat = true, anims = [] } = fn(solid, glow, glass);
  if (glow.children.length && glass.children.length) throw new Error(`kitchen set decor ${id}: glow and glass both used`);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: 0.85 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) out.add(new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  if (glass.children.length) out.add(new THREE.Mesh(bakeGroup(glass), new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false })));
  anims.forEach(a => out.add(a));
  out.scale.setScalar(k);
  return out;
}
