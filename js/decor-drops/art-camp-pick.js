import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['cp_camp_chair', 'cp_lantern_hook'];
export const YARD_IDS = ['cp_tent', 'cp_marshmallow_fire'];

const C = {
  olive: 0x7f8c4f, oliveDk: 0x5f6c3a, mustard: 0xd6a640, mustardDk: 0xae8330,
  brick: 0xc8643c, brickDk: 0x9e4a2c, cream: 0xe2d3b6, creamDk: 0xc9b48f,
  navy: 0x3a4a6c, navyDk: 0x2b3854, wood: 0x9c6b40, woodLt: 0xc99a62, woodDk: 0x6b4a2e,
  stone: 0x8f887e, stoneLt: 0xa9a296, iron: 0x4a4a52, marsh: 0xe2d6c0, toast: 0xc08a4c,
  lamp: 0xf2cd72, flame: 0xe8803a, flameIn: 0xf2c25a,
};

const TAU = Math.PI * 2;
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const cone = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 40, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rad, false);
const stick = (p, a, b, r, col, r2 = r) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = part(p, cyl(r2, r, A.distanceTo(B), 6), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  return m;
};
function tri(w, h, depth) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
}

function flameAt(g, x, y, z, k = 1) {
  part(g, cone(0.15 * k, 0.42 * k, 7), C.flame, x, y + 0.21 * k, z);
  [[-0.08, 0.6, 0.3], [0.08, -0.5, 0.26]].forEach(([dx, rz, hh]) => part(g, cone(0.07 * k, hh * k, 6), C.flame, x + dx * k, y + hh * k / 2, z).rotation.z = rz * 0.3);
  part(g, cone(0.08 * k, 0.26 * k, 7), C.flameIn, x, y + 0.13 * k, z + 0.03 * k);
}

function stoneRing(s, r, n, y = 0.07) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, m = part(s, sph(0.11, 8, 6), i % 3 ? C.stone : C.stoneLt, Math.cos(a) * r, y, Math.sin(a) * r);
    m.scale.set(1.15, 0.7, 0.95); m.rotation.y = -a;
  }
}

function marshmallow(s, x, y, z, ax = 'y', k = 1) {
  const m = part(s, cyl(0.045 * k, 0.045 * k, 0.07 * k, 10), C.marsh, x, y, z);
  if (ax === 'x') m.rotation.z = Math.PI / 2;
  return m;
}

function lantern(s, g, x, y, z, k, body, cap) {
  const L = grp(s, x, y, z), G = grp(g, x, y, z);
  L.scale.setScalar(k); G.scale.setScalar(k);
  part(L, cyl(0.09, 0.1, 0.05, 14), body, 0, 0.025, 0);
  part(G, cyl(0.062, 0.062, 0.15, 12), C.lamp, 0, 0.125, 0);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; part(L, cyl(0.009, 0.009, 0.16, 4), cap, Math.cos(a) * 0.075, 0.125, Math.sin(a) * 0.075); }
  part(L, cyl(0.055, 0.1, 0.06, 14), body, 0, 0.23, 0);
  part(L, cyl(0.025, 0.035, 0.03, 8), cap, 0, 0.275, 0);
  part(L, torus(0.06, 0.008, 4, 16, Math.PI), cap, 0, 0.29, 0);
  return L;
}

const BUILD = {
  cp_tent(s) {
    const L = 1.35, hw = 0.62, H = 1.0, sl = Math.hypot(hw, H), ang = Math.atan2(hw, H);
    [-1, 1].forEach(sx => {
      const p = part(s, box(0.035, sl, L), C.mustard, sx * hw / 2, H / 2, 0); p.rotation.z = sx * ang;
      part(s, box(0.05, 0.05, L + 0.02), C.mustardDk, sx * hw, 0.03, 0);
    });
    part(s, tri(hw * 2, H, 0.03), C.mustard, 0, 0, -L / 2);
    part(s, tri(hw * 2, H, 0.02), C.mustardDk, 0, 0, L / 2 - 0.02);
    part(s, tri(hw * 1.0, H * 0.7, 0.02), C.creamDk, 0, 0, L / 2 - 0.005);
    [-1, 1].forEach(sx => stick(s, [sx * hw * 0.5, 0.02, L / 2 + 0.01], [0, H * 0.7, L / 2 + 0.01], 0.028, C.mustardDk));
    stick(s, [0, 0, L / 2 + 0.03], [0, H + 0.12, L / 2 + 0.03], 0.02, C.woodDk);
    stick(s, [0, 0, -L / 2 - 0.03], [0, H + 0.08, -L / 2 - 0.03], 0.02, C.woodDk);
    part(s, cyl(0.012, 0.012, L + 0.08, 6), C.woodDk, 0, H + 0.01, 0).rotation.x = Math.PI / 2;
    const fl = part(s, tri(0.16, 0.24, 0.012), C.brick, 0.09, H + 0.02, L / 2 + 0.03); fl.rotation.z = -Math.PI / 2;
    [-1, 1].forEach(sz => {
      const top = [0, H + 0.06, sz * (L / 2 + 0.03)], peg = [0, 0.02, sz * (L / 2 + 0.42)];
      stick(s, top, peg, 0.005, C.cream);
      part(s, cyl(0.02, 0.012, 0.1, 6), C.woodDk, peg[0], 0.03, peg[2]);
    });
    return { k: 1.3 };
  },
  cp_camp_chair(s) {
    const W = 0.5, sy = 0.4;
    [-1, 1].forEach(sx => {
      stick(s, [sx * W / 2, 0, 0.22], [sx * W / 2, sy, -0.2], 0.018, C.wood);
      stick(s, [sx * W / 2, 0, -0.22], [sx * W / 2, sy, 0.2], 0.018, C.wood);
      stick(s, [sx * W / 2, sy - 0.02, -0.2], [sx * W / 2, 0.86, -0.3], 0.018, C.wood);
      part(s, box(0.06, 0.03, 0.36), C.woodLt, sx * (W / 2 + 0.02), 0.58, -0.02);
      stick(s, [sx * W / 2, sy, 0.17], [sx * (W / 2 + 0.02), 0.57, 0.14], 0.014, C.wood);
    });
    const seat = part(s, cyl(0.6, 0.6, W, 20, 1, true, Math.PI * 1.5 - 0.36, 0.72), C.olive, 0, sy + 0.55, 0); seat.rotation.z = Math.PI / 2; seat.material.side = THREE.DoubleSide;
    part(s, box(W, 0.03, 0.03), C.woodDk, 0, sy, 0.2); part(s, box(W, 0.03, 0.03), C.woodDk, 0, sy, -0.2);
    const back = grp(s, 0, 0.66, -0.26); back.rotation.x = -0.2;
    part(back, box(W - 0.02, 0.34, 0.02), C.olive);
    part(back, box(W - 0.02, 0.06, 0.025), C.mustard, 0, 0.02, 0.003);
    return {};
  },
  cp_lantern_hook(s, g) {
    part(s, cyl(0.16, 0.18, 0.04, 16), C.navyDk, 0, 0.02, 0);
    part(s, cyl(0.02, 0.022, 1.3, 8), C.navy, 0, 0.68, 0);
    const arc = Array.from({ length: 25 }, (_, i) => { const t = Math.PI * (1 - i / 24); return [0.17 + Math.cos(t) * 0.17, 1.33 + Math.sin(t) * 0.17, 0]; });
    part(s, tube(arc, 0.016, 40, 6), C.navy);
    part(s, sph(0.028, 8, 6), C.mustardDk, 0.34, 1.33, 0);
    stick(s, [0.34, 1.33, 0], [0.34, 1.27, 0], 0.006, C.navyDk);
    lantern(s, g, 0.34, 0.87, 0, 1.35, C.mustard, C.mustardDk);
    return {};
  },
  cp_marshmallow_fire(s, g) {
    stoneRing(s, 0.34, 10);
    part(s, cyl(0.28, 0.28, 0.02, 18), C.woodDk, 0, 0.01, 0);
    [0, 1].forEach(i => { const m = part(s, cyl(0.04, 0.04, 0.46, 8), i ? C.wood : C.woodDk, 0, 0.06 + i * 0.06, 0); m.rotation.set(Math.PI / 2, i ? 0.8 : -0.8, 0); });
    flameAt(g, 0, 0.08, 0, 0.85);
    [-1, 1].forEach(sx => {
      stick(s, [sx * 0.55, 0, 0], [sx * 0.55, 0.52, 0], 0.02, C.woodDk);
      stick(s, [sx * 0.55, 0.44, 0], [sx * 0.62, 0.58, 0], 0.012, C.woodDk);
      stick(s, [sx * 0.55, 0.44, 0], [sx * 0.48, 0.58, 0], 0.012, C.woodDk);
    });
    part(s, cyl(0.009, 0.009, 1.3, 6), C.woodDk, 0, 0.53, 0).rotation.z = Math.PI / 2;
    [-0.11, 0, 0.11].forEach(x => marshmallow(s, x, 0.53, 0, 'x', 1.1));
    part(s, cyl(0.02, 0.02, 0.1, 8), C.wood, 0.7, 0.53, 0).rotation.z = Math.PI / 2;
    return { k: 1.3 };
  },
};

function flickerRows(glow) {
  const rows = new Map();
  [...glow.children].forEach(m => {
    const k = Math.round(m.position.y * 10);
    if (!rows.has(k)) rows.set(k, new THREE.Group());
    m.position.y -= k / 10;
    rows.get(k).add(m);
  });
  return [...rows].map(([k, row]) => { const m = new THREE.Mesh(bakeGroup(row), new THREE.MeshBasicMaterial({ vertexColors: true })); m.position.y = k / 10; m.userData.flicker = true; return m; });
}

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown camp pick decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { k = 1 } = fn(solid, glow);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  flickerRows(glow).forEach(m => { m.userData.noShadow = true; out.add(m); });
  out.scale.setScalar(k);
  return out;
}
