import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['mu_gramophone', 'mu_piano_stool', 'mu_music_stand'];
export const YARD_IDS = ['mu_mini_stage'];

const C = {
  wood: 0xb8834e, woodDk: 0x7e5432, walnut: 0x5e3e2a,
  brass: 0xd2a04c, brassDk: 0xa87a34,
  velvet: 0xa8323e, velvetDk: 0x7c2430,
  cream: 0xe2d4b6, creamDk: 0xc9b690,
  navy: 0x34406a, navyDk: 0x263052, ink: 0x2e2a30,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 24, h = 18, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 24, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 28) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 30, rad = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);

function rod(p, a, b, r, col, seg = 12, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function roundSlab(p, w, d, h, r, col, y) {
  const sh = new THREE.Shape(), x0 = -w / 2, z0 = -d / 2;
  sh.moveTo(x0 + r, z0); sh.lineTo(x0 + w - r, z0); sh.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
  sh.lineTo(x0 + w, z0 + d - r); sh.quadraticCurveTo(x0 + w, z0 + d, x0 + w - r, z0 + d);
  sh.lineTo(x0 + r, z0 + d); sh.quadraticCurveTo(x0, z0 + d, x0, z0 + d - r);
  sh.lineTo(x0, z0 + r); sh.quadraticCurveTo(x0, z0, x0 + r, z0);
  const bev = Math.min(h * 0.45, r * 0.8);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, h - bev * 2), bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 4, curveSegments: 12 });
  geo.rotateX(Math.PI / 2); geo.translate(0, h - bev, 0);
  return part(p, geo, col, 0, y, 0);
}

function horn(p, x, y, z, len, mouth, col, rim, rx, ry = 0, petals = 0) {
  const g = grp(p, x, y, z); g.rotation.set(rx, ry, 0, 'YXZ');
  const prof = [[0.026, 0], [0.03, len * 0.25], [0.045, len * 0.5], [0.09, len * 0.72], [mouth * 0.62, len * 0.9], [mouth, len]];
  const geo = lathe(prof, 48);
  if (petals) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), pz = pos.getZ(i), py = pos.getY(i), k = Math.max(0, (py - len * 0.6) / (len * 0.4));
      const w = Math.cos(Math.atan2(pz, px) * petals), f = 1 + 0.06 * k * k * w;
      pos.setXYZ(i, px * f, py + 0.025 * k * k * w * len, pz * f);
    }
    geo.computeVertexNormals();
  }
  part(g, geo, col);
  if (!petals) part(g, torus(mouth, 0.014, 8, 48), rim, 0, len, 0).rotation.x = Math.PI / 2;
  part(g, cyl(0.04, 0.04, 0.05, 16), rim, 0, 0, 0);
  return g;
}

function record(p, x, y, z, r = 0.16) {
  part(p, cyl(r, r, 0.014, 40), C.ink, x, y + 0.007, z);
  part(p, cyl(r * 0.32, r * 0.32, 0.016, 24), C.velvet, x, y + 0.008, z);
  part(p, cyl(0.008, 0.008, 0.04, 8), C.brass, x, y + 0.02, z);
}

function sheet(p, w, h, x, y, z, rx = 0, ry = 0, notes = 4) {
  const g = grp(p, x, y, z); g.rotation.set(rx, ry, 0);
  part(g, box(w, h, 0.008), C.cream, 0, 0, 0);
  [0.22, -0.18].forEach(row => {
    for (let i = 0; i < 3; i++) part(g, box(w * 0.82, 0.004, 0.004), C.creamDk, 0, (row + i * 0.06) * h, 0.006);
    for (let i = 0; i < notes; i++) {
      const nx = (-0.3 + i * (0.6 / Math.max(1, notes - 1))) * w, ny = (row + 0.06 * ((i * 2) % 3)) * h;
      part(g, sph(h * 0.035, 10, 8), C.ink, nx, ny, 0.008).scale.set(1.25, 0.9, 0.4);
      part(g, box(0.004, h * 0.16, 0.004), C.ink, nx + h * 0.04, ny + h * 0.08, 0.008);
    }
  });
  return g;
}

function curvedLeg(p, a, r, top, out, col, foot) {
  const cx = Math.cos(a), cz = Math.sin(a);
  part(p, tube([[cx * r, top, cz * r], [cx * (r + out * 0.5), top * 0.6, cz * (r + out * 0.5)], [cx * (r + out * 0.7), top * 0.25, cz * (r + out * 0.7)], [cx * (r + out), 0.03, cz * (r + out)]], 0.024, 24, 10), col);
  if (foot) part(p, sph(0.034), foot, cx * (r + out), 0.03, cz * (r + out));
}

function tuftSeat(p, r, y, col, btn, n = 6) {
  part(p, cyl(r * 1.02, r * 1.02, 0.05, 40), C.woodDk, 0, y, 0);
  part(p, sph(r, 40, 20), col, 0, y + 0.03, 0).scale.y = 0.34;
  part(p, sph(0.016), btn, 0, y + r * 0.34 + 0.025, 0);
  for (let i = 0; i < n; i++) { const a = i / n * TAU; part(p, sph(0.014), btn, Math.cos(a) * r * 0.52, y + r * 0.29 + 0.025, Math.sin(a) * r * 0.52); }
}

function swag(p, a, b, sag, r, col) {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
  part(p, tube(pts, r, 40, 12), col);
}

function drape(p, x, y, z, h, col, tie) {
  part(p, lathe([[0.02, 0], [0.12, h * 0.02], [0.1, h * 0.3], [0.045, h * 0.52], [0.055, h * 0.6], [0.11, h * 0.85], [0.08, h], [0.0, h]], 20), col, x, y - h, z).rotation.y = 0.3;
  part(p, torus(0.055, 0.016, 8, 20), tie, x, y - h + h * 0.55, z).rotation.x = Math.PI / 2;
}

function platform(s0, r, h) {
  const s = grp(s0); s.scale.z = 0.82;
  part(s, cyl(r, r, h, 56), C.wood, 0, h / 2, 0);
  part(s, cyl(r * 1.01, r * 1.03, h * 0.5, 56), C.walnut, 0, h * 0.25, 0);
  part(s, torus(r, 0.016, 8, 72), C.brassDk, 0, h, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const zz = -0.75 + i * 0.3;
    part(s, box(r * 1.9 * Math.sqrt(1 - zz * zz), 0.003, 0.008), C.woodDk, 0, h + 0.002, zz * r);
  }
}

function post(s, x, z, h, col = C.woodDk, cap = C.brass) {
  part(s, cyl(0.055, 0.065, h, 16), col, x, h / 2, z);
  part(s, cyl(0.08, 0.08, 0.05, 16), col, x, 0.025, z);
  part(s, sph(0.06), cap, x, h + 0.03, z);
}

const BUILD = {
  mu_gramophone(s) {
    roundSlab(s, 0.56, 0.5, 0.06, 0.05, C.woodDk, 0);
    roundSlab(s, 0.5, 0.44, 0.4, 0.05, C.wood, 0.05);
    roundSlab(s, 0.54, 0.48, 0.04, 0.05, C.woodDk, 0.44);
    part(s, box(0.3, 0.2, 0.01), C.brassDk, 0, 0.25, 0.225);
    part(s, box(0.27, 0.17, 0.01), C.wood, 0, 0.25, 0.23);
    part(s, sph(0.025), C.brass, 0, 0.25, 0.24);
    record(s, -0.04, 0.48, 0.04);
    part(s, cyl(0.035, 0.04, 0.08, 16), C.brass, 0.17, 0.52, -0.13);
    rod(s, [0.17, 0.56, -0.13], [0.03, 0.51, 0.06], 0.012, C.brass);
    part(s, tube([[0.17, 0.56, -0.13], [0.17, 0.66, -0.15], [0.14, 0.74, -0.12]], 0.03, 16, 10), C.brassDk);
    horn(s, 0.14, 0.74, -0.12, 0.6, 0.27, C.brass, C.brassDk, 0.85, -0.25);
  },
  mu_piano_stool(s) {
    tuftSeat(s, 0.22, 0.42, C.velvet, C.brass);
    part(s, cyl(0.05, 0.05, 0.16, 16), C.brass, 0, 0.32, 0);
    for (let i = 0; i < 5; i++) part(s, torus(0.05, 0.008, 6, 16), C.brassDk, 0, 0.26 + i * 0.03, 0).rotation.x = Math.PI / 2;
    part(s, cyl(0.1, 0.1, 0.06, 24), C.woodDk, 0, 0.23, 0);
    [0, 1, 2, 3].forEach(i => curvedLeg(s, i / 4 * TAU + Math.PI / 4, 0.07, 0.22, 0.14, C.woodDk, C.brass));
  },
  mu_music_stand(s) {
    part(s, lathe([[0, 0.0], [0.22, 0.0], [0.23, 0.025], [0.18, 0.05], [0.06, 0.07], [0, 0.07]], 32), C.woodDk);
    part(s, lathe([[0.04, 0.06], [0.05, 0.12], [0.03, 0.3], [0.045, 0.5], [0.03, 0.7], [0.045, 0.84], [0.035, 0.9]], 20), C.wood);
    const d = grp(s, 0, 0.92, 0.02); d.rotation.x = -0.36;
    const sh = new THREE.Shape();
    sh.moveTo(-0.26, 0); sh.lineTo(0.26, 0); sh.lineTo(0.26, 0.26); sh.quadraticCurveTo(0.26, 0.36, 0.14, 0.36);
    sh.quadraticCurveTo(0.06, 0.36, 0, 0.42); sh.quadraticCurveTo(-0.06, 0.36, -0.14, 0.36); sh.quadraticCurveTo(-0.26, 0.36, -0.26, 0.26); sh.closePath();
    part(d, new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3, curveSegments: 12 }), C.wood, 0, -0.02, -0.03);
    part(d, box(0.56, 0.03, 0.07), C.woodDk, 0, -0.02, 0.02);
    sheet(d, 0.21, 0.3, -0.11, 0.15, 0.0, 0, 0.05);
    sheet(d, 0.21, 0.3, 0.11, 0.15, 0.0, 0, -0.05);
    part(d, box(0.025, 0.26, 0.004), C.velvet, 0.0, 0.07, 0.02);
  },
  mu_mini_stage(s) {
    platform(s, 0.92, 0.14);
    [-1, 1].forEach(sx => {
      post(s, sx * 0.78, -0.5, 1.5);
      drape(s, sx * 0.7, 1.46, -0.48, 1.3, C.velvet, C.brass);
    });
    swag(s, [-0.78, 1.46, -0.5], [0.78, 1.46, -0.5], 0.22, 0.06, C.velvet);
    swag(s, [-0.78, 1.5, -0.5], [0.78, 1.5, -0.5], 0.04, 0.025, C.velvetDk);
    [-0.36, 0, 0.36].forEach(x => part(s, sph(0.035), C.brass, x, 1.5 - (x === 0 ? 0.22 : 0.16), -0.47));
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown concert pick decor: ${id}`);
  const solid = new THREE.Group();
  fn(solid);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  return out;
}
