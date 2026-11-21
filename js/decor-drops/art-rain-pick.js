import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['rn_umbrella_stand', 'rn_rain_curtain'];
export const YARD_IDS = ['rn_rain_planter', 'rn_snail_garden'];

const C = {
  yellow: 0xf0cc48, yellowDk: 0xd2a838, blue: 0x5f8fc8, blueDk: 0x46709f, blueLt: 0x9cc2e4, water: 0x7fa9d6,
  frog: 0x7fb85a, frogDk: 0x5e9440, leaf: 0x8cc266, moss: 0x86a860,
  greyDk: 0x6f7880, stone: 0xa8aaa4,
  cream: 0xdcd6c4, ink: 0x2b2f36, pink: 0xeea0a6,
  wood: 0xa87a4e, woodDk: 0x7a5636,
  shell: 0xe0a65a, shellDk: 0xb57c3e, snail: 0xcfc4a6,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const cone = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);
const lathe = (pts, s = 20) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 40, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);
const stick = (p, a, b, r, col, r2 = r) => {
  const A = V(...a), B = V(...b);
  const m = part(p, cyl(r2, r, A.distanceTo(B), 6), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), B.sub(A).normalize());
  return m;
};

const DROP = [[0, -1], [0.42, -0.86], [0.62, -0.5], [0.56, -0.1], [0.34, 0.36], [0.12, 0.76], [0, 1]];
const drop = (p, s, col, x, y, z) => part(p, lathe(DROP.map(([a, b]) => [a * s, b * s]), 12), col, x, y, z);

function puddle(p, r, x, z, sx = 1, sz = 0.7) {
  const m = part(p, cyl(r, r, 0.012, 24), C.water, x, 0.006, z); m.scale.set(sx, 1, sz);
  const ring = part(p, torus(r * 0.55, 0.008, 4, 22), C.blueLt, x + r * 0.15, 0.014, z); ring.rotation.x = Math.PI / 2; ring.scale.set(sx, sz, 1);
}

function cloud(p, s, col, x, y, z) {
  const g = grp(p, x, y, z);
  [[0, 0.05, 0.36], [-0.34, -0.04, 0.27], [0.34, -0.04, 0.27], [0.15, 0.22, 0.24], [-0.14, 0.18, 0.2]].forEach(([cx, cy, r]) => part(g, sph(s * r, 14, 10), col, cx * s, cy * s, 0).scale.z = 0.7);
  return g;
}

function taroLeaf(p, s, col, rib, x, y, z, ry, tilt) {
  const g = grp(p, x, y, z); g.rotation.set(0, ry, 0);
  const h = grp(g); h.rotation.x = tilt;
  const cap = part(h, sph(s, 18, 8, 0, TAU, Math.PI * 0.62, Math.PI * 0.38), col, 0, s * 0.82, 0);
  cap.scale.set(1, 0.6, 1.25);
  part(h, cyl(0.006, 0.006, s * 2.2, 4), rib, 0, s * 0.33, 0).rotation.x = Math.PI / 2;
  return { g, h };
}

function umbrella(p, x, z, H, col, colDk, tiltX, tiltZ, handle = C.wood) {
  const g = grp(p, x, 0, z); g.rotation.set(tiltX, 0, tiltZ);
  part(g, cone(0.012, 0.06, 6), C.greyDk, 0, 0.05, 0).rotation.x = Math.PI;
  part(g, cyl(0.01, 0.01, H, 6), C.greyDk, 0, H / 2, 0);
  part(g, lathe([[0, 0.12], [0.06, 0.2], [0.1, H * 0.48], [0.085, H * 0.68], [0.03, H * 0.8], [0, H * 0.82]], 8), col);
  part(g, torus(0.095, 0.014, 4, 14), colDk, 0, H * 0.5, 0).rotation.x = Math.PI / 2;
  part(g, cyl(0.016, 0.016, 0.08, 8), handle, 0, H + 0.02, 0);
  part(g, torus(0.05, 0.016, 6, 14, Math.PI), handle, 0.05, H + 0.06, 0);
  return g;
}

function bead(p, x, y0, z, n, gap, s, cols) {
  stick(p, [x, y0, z], [x, y0 - gap * n, z], 0.004, C.greyDk);
  for (let i = 0; i < n; i++) drop(p, s, cols[i % cols.length], x, y0 - gap * (i + 0.6), z);
}

function snail(p, s, x, y, z, ry = 0, shell = C.shell, shellDk = C.shellDk) {
  const g = grp(p, x, y, z); g.rotation.y = ry;
  const b = part(g, sph(s * 0.32, 12, 8), C.snail, s * 0.05, s * 0.16, 0); b.scale.set(2.4, 0.6, 0.9);
  part(g, sph(s * 0.2, 10, 8), C.snail, s * 0.62, s * 0.3, 0).scale.set(1, 1.15, 0.9);
  [-1, 1].forEach(sz => {
    stick(g, [s * 0.66, s * 0.42, sz * s * 0.06], [s * 0.78, s * 0.7, sz * s * 0.12], s * 0.025, C.snail);
    part(g, sph(s * 0.05, 6, 5), C.ink, s * 0.78, s * 0.72, sz * s * 0.12);
  });
  const sh = part(g, sph(s * 0.38, 16, 12), shell, -s * 0.08, s * 0.52, 0); sh.scale.set(1, 1, 0.72);
  const pts = [];
  for (let i = 0; i <= 48; i++) { const t = i / 48, a = t * TAU * 2.2, r = s * (0.3 - 0.27 * t); pts.push([-s * 0.08 + Math.cos(a) * r, s * 0.52 + Math.sin(a) * r, s * 0.28]); }
  part(g, tube(pts, s * 0.03, 60, 4), shellDk);
  part(g, sph(s * 0.07, 8, 6), C.pink, s * 0.7, s * 0.26, s * 0.14).scale.z = 0.4;
  return g;
}

function mushroom(p, x, z, s, cap, ry = 0) {
  part(p, cyl(s * 0.18, s * 0.22, s * 0.6, 8), C.cream, x, s * 0.3, z);
  const c = part(p, sph(s * 0.45, 12, 8, 0, TAU, 0, Math.PI / 2), cap, x, s * 0.55, z); c.scale.y = 0.75; c.rotation.y = ry;
  [[0.2, 0.1], [-0.15, 0.2]].forEach(([u, v]) => part(p, sph(s * 0.07, 6, 5), C.cream, x + u * s, s * 0.82, z + v * s));
}

const BUILD = {
  rn_rain_planter(s) {
    part(s, lathe([[0, 0], [0.2, 0], [0.24, 0.04], [0.27, 0.3], [0.3, 0.33], [0.29, 0.36], [0.26, 0.34], [0, 0.3]], 22), C.blue);
    part(s, torus(0.25, 0.018, 5, 22), C.blueDk, 0, 0.16, 0).rotation.x = Math.PI / 2;
    part(s, cyl(0.26, 0.26, 0.02, 20), C.woodDk, 0, 0.32, 0);
    [[0, 0.34, 0.72, 0.17], [2.2, 0.26, 0.62, 0.15], [4.2, 0.3, 0.5, 0.15]].forEach(([a, tilt, hh, ls], i) => {
      const x = Math.sin(a) * 0.07, z = Math.cos(a) * 0.07;
      stick(s, [x, 0.3, z], [x + Math.sin(a) * 0.12, 0.3 + hh, z + Math.cos(a) * 0.12], 0.014, C.frogDk);
      const { h } = taroLeaf(s, ls, i === 1 ? C.leaf : C.frog, C.frogDk, x + Math.sin(a) * 0.12, 0.3 + hh - ls * 0.5, z + Math.cos(a) * 0.12, a, tilt);
      drop(h, 0.035, C.blue, 0, ls * 0.62, 0).scale.set(1, 0.8, 1);
    });
    puddle(s, 0.16, 0.3, 0.26);
    return { k: 1.4 };
  },
  rn_umbrella_stand(s) {
    part(s, lathe([[0, 0], [0.15, 0], [0.16, 0.02], [0.15, 0.48], [0.17, 0.5], [0.165, 0.53], [0.135, 0.51], [0.135, 0.04], [0, 0.04]], 20), C.blue);
    [0.14, 0.38].forEach(y => part(s, torus(0.153, 0.008, 4, 20), C.blueDk, 0, y, 0).rotation.x = Math.PI / 2);
    drop(s, 0.035, C.blueLt, 0, 0.26, 0.153).scale.z = 0.3;
    umbrella(s, -0.04, 0.02, 0.92, C.yellow, C.yellowDk, 0.05, 0.12);
    umbrella(s, 0.05, -0.02, 0.84, C.frog, C.frogDk, -0.06, -0.16, C.woodDk);
    return { k: 1 };
  },
  rn_rain_curtain(s) {
    part(s, cyl(0.2, 0.22, 0.04, 20), C.woodDk, 0, 0.02, 0);
    part(s, cyl(0.025, 0.03, 1.5, 8), C.wood, -0.18, 0.77, 0);
    part(s, tube([[-0.18, 1.5, 0], [-0.14, 1.62, 0], [0.04, 1.68, 0], [0.18, 1.62, 0], [0.22, 1.55, 0]], 0.022, 30, 6), C.wood);
    stick(s, [0.22, 1.55, 0], [0.22, 1.42, 0], 0.004, C.greyDk);
    cloud(s, 0.4, C.cream, 0.22, 1.34, 0);
    [[-0.12, 3], [0.02, 2], [0.16, 3], [0.3, 2], [0.44, 3]].forEach(([dx, n], i) => bead(s, 0.22 + dx * 0.66 - 0.04, 1.24, 0, n, 0.13, 0.055, i % 2 ? [C.blue, C.blueLt] : [C.blueLt, C.blue]));
    return { k: 1 };
  },
  rn_snail_garden(s) {
    part(s, sph(0.24, 14, 10), C.stone, 0, 0.1, 0).scale.set(1.3, 0.6, 1.0);
    part(s, sph(0.235, 14, 8, 0, TAU, 0, Math.PI * 0.38), C.moss, 0, 0.11, 0).scale.set(1.31, 0.62, 1.01);
    snail(s, 0.3, -0.04, 0.2, 0.02, 0.3);
    mushroom(s, 0.3, -0.12, 0.14, C.pink, 0.4);
    mushroom(s, 0.38, 0.0, 0.1, C.yellow, 1.1);
    puddle(s, 0.14, -0.32, 0.24);
    [[-0.3, -0.18], [0.26, 0.22]].forEach(([x, z]) => part(s, sph(0.05, 8, 6), C.leaf, x, 0.03, z).scale.set(1, 0.4, 1.6));
    return { k: 1.6 };
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown rain pick decor: ${id}`);
  const solid = new THREE.Group();
  const { k = 1 } = fn(solid);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  out.scale.setScalar(k);
  return out;
}
