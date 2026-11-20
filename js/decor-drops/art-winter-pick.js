import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['wp_hearth', 'wp_fur_rug', 'wp_cocoa_table'];
export const YARD_IDS = ['wp_snowman'];

const C = {
  cream: 0xe3d4b8, creamDk: 0xcfbd9c, berry: 0xb5363f, green: 0x2f6b4f, greenDk: 0x24503c,
  mustard: 0xd9a63a, wood: 0x9c6b40, woodDk: 0x6b4a2e, bark: 0x5e4129, coal: 0x2a2624,
  stone: 0x8f887e, snow: 0xcdd8e2, carrot: 0xe0782f, cocoa: 0x5a3422,
  fire: 0xff8a33, fireMid: 0xffb04a, fireCore: 0xffd27a, pink: 0xe8b8bc,
};

const TAU = Math.PI * 2;
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const flatRing = (p, r, tube, col, y, rs = 5, ts = 24) => { const t = part(p, torus(r, tube, rs, ts), col, 0, y, 0); t.rotation.x = Math.PI / 2; return t; };
const seeded = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const basicBaked = (g) => new THREE.Mesh(bakeGroup(g), new THREE.MeshBasicMaterial({ vertexColors: true }));

function starGeo(r1, r2, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

function flames(x, y, z, k) {
  const fl = new THREE.Group();
  [[0, 0.3, C.fire, 0.09], [-0.1, 0.22, C.fireMid, 0.07], [0.1, 0.22, C.fireMid, 0.07], [0, 0.17, C.fireCore, 0.05]].forEach(([dx, h, c, r], i) => part(fl, cone(r, h, 6), c, dx, h / 2, i === 3 ? 0.04 : 0));
  const m = basicBaked(fl); m.position.set(x, y, z); m.scale.setScalar(k); m.userData.flicker = true;
  return m;
}

function logs(s, x, y, z, len, r) {
  [-0.5, 0.5].forEach((a, i) => { const l = part(s, cyl(r, r, len, 7), i ? C.woodDk : C.bark, x, y + r, z + (i ? -0.02 : 0.02)); l.rotation.z = Math.PI / 2; l.rotation.y = a; });
}

function mug(s, x, y, z, col, r, h, rotY) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; s.add(g);
  part(g, cyl(r, r * 0.92, h, 12), col, 0, h / 2, 0);
  part(g, cyl(r * 0.84, r * 0.84, 0.02, 12), C.cocoa, 0, h - 0.02, 0);
  const hd = part(g, torus(r * 0.5, r * 0.15, 5, 10, Math.PI), col, r * 1.02, h * 0.5, 0); hd.rotation.z = -Math.PI / 2;
  return g;
}

function marsh(s, pts, size) {
  pts.forEach(([x, y, z, c = C.cream]) => { part(s, box(size, size * 0.85, size), c, x, y, z).rotation.set(0.25, x * 20, 0.15); });
}

function scarfTail(s, x, y, z, w, len, rotZ, rotX) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rotX, 0, rotZ); s.add(g);
  part(g, box(w, len, 0.05), C.berry, 0, -len / 2, 0);
  [0.3, 0.6].forEach(f => part(g, box(w + 0.006, 0.04, 0.056), C.cream, 0, -len * f, 0));
  for (let i = 0; i < 4; i++) part(g, box(0.02, 0.07, 0.03), C.cream, -w / 2 + w / 8 + i * w / 4, -len - 0.035, 0);
}

function twigArm(s, x, y, z, rotZ, len = 0.55) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rotZ; s.add(g);
  part(g, cyl(0.018, 0.024, len, 5), C.bark, 0, len / 2, 0);
  [0.6, -0.6].forEach((a, i) => { const t = part(g, cyl(0.01, 0.014, 0.16, 4), C.bark, -Math.sin(a) * 0.07, len * (0.72 + i * 0.12) + Math.cos(a) * 0.07, 0); t.rotation.z = a; });
}

const BUILD = {
  wp_hearth(s, g) {
    part(s, box(1.2, 0.06, 0.62), C.stone, 0, 0.03, 0.04);
    [-0.41, 0.41].forEach(x => part(s, box(0.28, 0.82, 0.42), C.cream, x, 0.47, -0.04));
    part(s, box(1.1, 0.24, 0.42), C.cream, 0, 0.76, -0.04);
    part(s, box(0.56, 0.6, 0.04), C.coal, 0, 0.36, -0.22);
    part(s, box(0.56, 0.04, 0.4), C.coal, 0, 0.62, -0.04);
    [-0.27, 0.27].forEach(x => part(s, box(0.06, 0.6, 0.03), C.berry, x, 0.36, 0.18));
    part(s, box(0.6, 0.06, 0.03), C.berry, 0, 0.66, 0.18);
    part(s, box(1.32, 0.08, 0.56), C.wood, 0, 0.92, 0);
    logs(s, 0, 0.06, -0.04, 0.38, 0.05);
    const rnd = seeded(11);
    for (let i = 0; i < 9; i++) { const x = -0.56 + i * 0.14; part(s, new THREE.IcosahedronGeometry(0.07, 0), i % 2 ? C.green : C.greenDk, x, 0.99, 0.2 + (rnd() - 0.5) * 0.04).rotation.y = rnd() * 3; if (i % 2 === 0) part(s, sph(0.026, 6, 5), C.berry, x + 0.03, 1.02, 0.26); }
    [[-0.34, C.berry], [0.34, C.green]].forEach(([x, col], i) => {
      const st = new THREE.Group(); st.position.set(x, 0.86, 0.3); st.rotation.z = i ? -0.06 : 0.06; s.add(st);
      part(st, box(0.15, 0.06, 0.06), C.cream, 0, 0, 0);
      part(st, box(0.12, 0.2, 0.05), col, 0, -0.13, 0);
      part(st, box(0.17, 0.08, 0.05), col, (i ? -1 : 1) * 0.025, -0.25, 0);
      part(st, box(0.05, 0.05, 0.052), C.cream, (i ? -1 : 1) * 0.1, -0.25, 0);
    });
    part(s, cyl(0.035, 0.035, 0.12, 8), C.cream, 0.5, 1.02, -0.1);
    part(g, cone(0.022, 0.06, 6), C.fireCore, 0.5, 1.11, -0.1);
    return { anims: [flames(0, 0.12, -0.04, 0.95)] };
  },
  wp_fur_rug(s) {
    part(s, cyl(0.82, 0.82, 0.04, 28), C.cream, 0, 0.02, 0);
    const n = 20;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; part(s, sph(0.13, 9, 6), i % 2 ? C.cream : C.creamDk, Math.cos(a) * 0.8, 0.045, Math.sin(a) * 0.8).scale.set(1, 0.42, 1); }
    part(s, cyl(0.6, 0.6, 0.05, 28), C.berry, 0, 0.025, 0);
    part(s, cyl(0.5, 0.5, 0.058, 28), C.cream, 0, 0.029, 0);
    part(s, cyl(0.26, 0.26, 0.064, 24), C.green, 0, 0.032, 0);
    part(s, starGeo(0.2, 0.09, 0.015), C.mustard, 0, 0.064, 0).rotation.x = -Math.PI / 2;
    return {};
  },
  wp_cocoa_table(s) {
    part(s, cyl(0.24, 0.28, 0.05, 14), C.woodDk, 0, 0.025, 0);
    part(s, cyl(0.045, 0.06, 0.52, 8), C.wood, 0, 0.31, 0);
    part(s, cyl(0.38, 0.38, 0.05, 20), C.wood, 0, 0.595, 0);
    flatRing(s, 0.38, 0.018, C.woodDk, 0.595, 4, 28);
    part(s, cyl(0.2, 0.17, 0.025, 18), C.cream, 0, 0.632, 0);
    const m = mug(s, 0, 0.645, 0, C.berry, 0.14, 0.24, 0.5);
    part(m, cyl(0.1445, 0.141, 0.05, 16), C.cream, 0, 0.12, 0);
    marsh(m, [[-0.05, 0.25, 0.03], [0.05, 0.255, -0.02, C.pink], [0.0, 0.25, -0.07], [-0.07, 0.255, -0.05, C.pink], [0.07, 0.25, 0.06], [0.0, 0.29, 0.0], [-0.03, 0.285, 0.05, C.pink]], 0.055);
    const cane = new THREE.Group(); cane.position.set(0.07, 0.8, -0.04); cane.rotation.z = -0.25; s.add(cane);
    for (let i = 0; i < 6; i++) part(cane, cyl(0.018, 0.018, 0.04, 8), i % 2 ? C.cream : C.berry, 0, i * 0.04, 0);
    part(cane, torus(0.05, 0.018, 6, 10, Math.PI), C.berry, -0.05, 0.22, 0);
    part(s, cyl(0.05, 0.05, 0.018, 10), C.mustard, 0.25, 0.63, 0.12);
    part(s, cyl(0.05, 0.05, 0.018, 10), C.mustard, 0.24, 0.648, 0.17).rotation.x = 0.3;
    return {};
  },
  wp_snowman(s) {
    part(s, sph(0.42, 16, 12), C.snow, 0, 0.38, 0);
    part(s, sph(0.3, 16, 12), C.snow, 0, 0.94, 0);
    part(s, sph(0.22, 16, 12), C.snow, 0, 1.36, 0);
    [-0.07, 0.07].forEach(dx => part(s, sph(0.03, 8, 6), C.coal, dx, 1.41, Math.sqrt(0.22 * 0.22 - dx * dx - 0.05 * 0.05) - 0.012));
    part(s, cone(0.04, 0.22, 8), C.carrot, 0, 1.33, 0.3).rotation.x = Math.PI / 2;
    [1.02, 0.88, 0.74].forEach(y => part(s, sph(0.03, 8, 6), C.coal, 0, y, Math.sqrt(Math.max(0, 0.3 * 0.3 - (y - 0.94) ** 2)) - 0.005));
    flatRing(s, 0.2, 0.065, C.berry, 1.17, 6, 18);
    scarfTail(s, 0.12, 1.15, 0.2, 0.13, 0.5, 0.18, 0.3);
    scarfTail(s, 0.2, 1.15, 0.12, 0.12, 0.36, 0.45, 0.2);
    part(s, sph(0.215, 14, 8, 0, TAU, 0, Math.PI / 2), C.green, 0, 1.43, 0).scale.set(1.04, 1.1, 1.04);
    flatRing(s, 0.21, 0.04, C.greenDk, 1.45, 5, 18);
    part(s, sph(0.08, 10, 8), C.mustard, 0, 1.69, 0);
    twigArm(s, -0.27, 1.0, 0, 1.0);
    twigArm(s, 0.27, 1.0, 0, -0.9);
    return { flat: false };
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown winter pick decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { flat = true, anims = [] } = fn(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: 0.9, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) out.add(basicBaked(glow));
  anims.forEach(a => out.add(a));
  out.traverse(o => { if (o.isMesh && o !== body) o.userData.noShadow = true; });
  return out;
}
