import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['ns_constellation_lamp', 'ns_moon_sofa'];
export const YARD_IDS = ['ns_telescope', 'ns_starlight_arch'];

const C = {
  navy: 0x2c3a66, navyDk: 0x202a4c, indigo: 0x46468a, lavender: 0x8f88c8, lilac: 0xb4aedc,
  moon: 0xe6d488, moonDk: 0xc9b46a, gold: 0xd9a838, goldDk: 0xa87a24, silver: 0xb9bfd0,
  wood: 0x9c6b40, woodLt: 0xc99a62, woodDk: 0x6b4a2e, stone: 0x8f887e,
  lamp: 0xf2cd72, lampBlue: 0xb8c8f0,
};

const TAU = Math.PI * 2;
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const pathPoints = (fn, n) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

function crescentShape(r, d = 0.42, r2 = 0.86) {
  const R2 = r * r2, D = r * d;
  const x = (r * r - R2 * R2 + D * D) / (2 * D), y = Math.sqrt(Math.max(0, r * r - x * x));
  const th = Math.atan2(y, x), ph = Math.atan2(y, x - D), s = new THREE.Shape(), n = 28;
  for (let i = 0; i <= n; i++) {
    const a = th + (TAU - 2 * th) * i / n;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = 1; i < n; i++) {
    const a = TAU - ph - (TAU - 2 * ph) * i / n;
    s.lineTo(D + Math.cos(a) * R2, Math.sin(a) * R2);
  }
  s.closePath();
  return s;
}

function starShape(ro, ri, pts = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < pts * 2; i++) {
    const a = Math.PI / 2 + (i / (pts * 2)) * TAU, r = i % 2 ? ri : ro;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

function extrude(shape, depth, bevel = depth * 0.3) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
}
const crescent = (r, depth, d = 0.42, r2 = 0.82) => extrude(crescentShape(r, d, r2), depth);
const star = (r, depth, pts = 5) => extrude(starShape(r, r * 0.48, pts), depth, depth * 0.25);
const tube = (pts, r, seg = 40, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rad, false);
const stick = (p, a, b, r, col) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = part(p, cyl(r, r, A.distanceTo(B), 5), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  return m;
};

const BUILD = {
  ns_constellation_lamp(s, g) {
    part(s, cyl(0.22, 0.25, 0.07, 16), C.woodDk, 0, 0.035, 0);
    part(s, cyl(0.035, 0.05, 0.16, 8), C.wood, 0, 0.15, 0);
    const R = 0.3, cy = 0.23;
    part(s, sph(R, 20, 10, 0, TAU, 0, Math.PI / 2), C.navy, 0, cy, 0);
    part(s, torus(R, 0.02, 5, 28), C.goldDk, 0, cy, 0).rotation.x = Math.PI / 2;
    part(g, cyl(R * 0.92, R * 0.92, 0.01, 20), C.lamp, 0, cy + 0.004, 0);
    const dots = [[0.3, 0.5], [0.9, 0.35], [1.5, 0.6], [2.1, 0.3], [2.7, 0.5], [3.3, 0.75], [3.9, 0.4], [4.5, 0.62], [5.1, 0.28], [5.7, 0.55], [0.6, 1.0], [2.4, 0.95], [4.2, 1.0]];
    dots.forEach(([a, t], i) => {
      const el = t * Math.PI / 2 * 0.9, d = new THREE.Vector3(Math.cos(el) * Math.sin(a), Math.sin(el), Math.cos(el) * Math.cos(a));
      const m = part(g, i % 3 ? sph(0.018, 6, 5) : star(0.034, 0.012), C.lamp, d.x * R * 1.01, cy + d.y * R * 1.01, d.z * R * 1.01);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    });
    part(s, cyl(0.012, 0.012, 0.08, 5), C.goldDk, 0, cy + R + 0.04, 0);
    part(s, crescent(0.07, 0.025), C.moon, 0, cy + R + 0.14, 0).rotation.z = -0.4;
  },
  ns_telescope(s) {
    const hy = 0.9;
    [0, 1, 2].forEach(i => {
      const a = i / 3 * TAU + 0.3;
      stick(s, [Math.sin(a) * 0.36, 0, Math.cos(a) * 0.36], [0, hy, 0], 0.025, C.wood);
      part(s, cyl(0.032, 0.035, 0.03, 6), C.woodDk, Math.sin(a) * 0.36, 0.015, Math.cos(a) * 0.36);
    });
    part(s, cyl(0.06, 0.07, 0.08, 10), C.goldDk, 0, hy + 0.02, 0);
    const t = grp(s, 0, hy + 0.1, 0); t.rotation.set(0, -0.5, 0);
    const tt = grp(t); tt.rotation.x = -0.62;
    const tb = part(tt, cyl(0.075, 0.055, 0.9, 14), C.navy, 0, 0, 0.05); tb.rotation.x = Math.PI / 2;
    [-0.38, -0.05, 0.3].forEach(z => part(tt, torus(z > 0 ? 0.072 : 0.066, 0.012, 5, 16), C.gold, 0, 0, 0.05 - z));
    part(tt, cyl(0.09, 0.08, 0.1, 14), C.gold, 0, 0, 0.53).rotation.x = Math.PI / 2;
    part(tt, cyl(0.07, 0.07, 0.01, 14), C.lampBlue, 0, 0, 0.585).rotation.x = Math.PI / 2;
    part(tt, cyl(0.025, 0.03, 0.14, 8), C.goldDk, 0, 0, -0.45).rotation.x = Math.PI / 2;
    part(tt, cyl(0.02, 0.02, 0.16, 6), C.navyDk, 0, 0.09, 0.2).rotation.x = Math.PI / 2;
  },
  ns_moon_sofa(s) {
    const pf = [[0, 0.22, 0.05, 0.3], [-0.38, 0.2, 0.08, 0.26], [0.38, 0.2, 0.08, 0.26], [-0.58, 0.16, 0.12, 0.18], [0.58, 0.16, 0.12, 0.18], [-0.2, 0.2, 0.22, 0.2], [0.2, 0.2, 0.22, 0.2], [0, 0.12, 0.28, 0.16]];
    pf.forEach(([x, y, z, r], i) => { const m = part(s, sph(r, 14, 10), i % 2 ? C.lilac : C.lavender, x, y, z); m.scale.y = 0.72; });
    const m = part(s, crescent(0.66, 0.16, 0.44, 0.8), C.moon, 0, 0.74, -0.24); m.rotation.z = Math.PI / 2;
    [-0.52, 0.5].forEach((x, i) => part(s, star(0.07, 0.03), C.gold, x, 1.24 + i * 0.04, -0.24).rotation.z = i);
  },
  ns_starlight_arch(s, g) {
    const px = 0.9, cy = 1.2;
    [-1, 1].forEach(sx => {
      part(s, cyl(0.12, 0.14, 0.1, 10), C.stone, sx * px, 0.05, 0);
      part(s, cyl(0.04, 0.05, cy, 8), C.navyDk, sx * px, cy / 2 + 0.05, 0);
      part(s, tube(pathPoints(t => [sx * px + Math.cos(t * 18) * 0.06, 0.12 + t * (cy - 0.15), Math.sin(t * 18) * 0.06], 60), 0.022, 80, 5), C.lilac);
    });
    part(s, torus(px, 0.025, 5, 32, Math.PI), C.navyDk, 0, cy + 0.05, 0);
    pathPoints(t => t, 10).forEach((t, i) => {
      const a = t * Math.PI, m = part(g, star(0.05, 0.03), i % 2 ? C.lamp : C.lampBlue, Math.cos(a) * px, cy + 0.05 + Math.sin(a) * px, 0.04);
      m.rotation.z = a;
    });
    part(s, star(0.22, 0.08), C.gold, 0, cy + px + 0.28, 0);
    part(g, star(0.1, 0.1), C.lamp, 0, cy + px + 0.28, 0.01);
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
  if (!fn) throw new Error(`unknown night pick decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  fn(solid, glow);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  flickerRows(glow).forEach(m => { m.userData.noShadow = true; out.add(m); });
  return out;
}
