import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['fp_owl_clock', 'fp_acorn_cupboard', 'fp_hedgehog_cushion'];
export const YARD_IDS = ['fp_deer_mailbox'];

const C = {
  cream: 0xe3d4b8, berry: 0xb5363f, coal: 0x2a2624, gold: 0xd9a63a,
  wood: 0x9c6b40, woodDk: 0x6b4a2e, stump: 0x80593a,
  acorn: 0x8a5a32, acornLt: 0xa8703a, cap: 0x5e4129, capLt: 0x7a5a3a,
  moss: 0x6f8f4a, glass: 0x3f5a48, ochre: 0xc58a3e, ochreDk: 0x9c6a30,
  squirrel: 0xb8662f, squirrelLt: 0xc9783a,
  quill: 0x7f6a5a, quillDk: 0x6a5648, hogFace: 0xdcc6a6, ear: 0xc4ab8a, cheek: 0xd98a8f,
  fawn: 0xb7794a, fawnDk: 0x94603a, fawnLt: 0xc98a55, antler: 0xd2b98c, birch: 0xd6cdbd, stone: 0x8f887e,
};

const TAU = Math.PI * 2;
const lathe = (pr, seg = 16) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const flatRing = (p, r, tube, col, y, rs = 5, ts = 24) => { const t = part(p, torus(r, tube, rs, ts), col, 0, y, 0); t.rotation.x = Math.PI / 2; return t; };
const disc = (p, r, t, col, x, y, z, seg = 16) => { const d = part(p, cyl(r, r, t, seg), col, x, y, z); d.rotation.x = Math.PI / 2; return d; };
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const arch = (w, h, depth) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.absarc(0, h, w / 2, 0, Math.PI, false); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
};

function spikyShell(radius, spikeLen, keep) {
  const base = new THREE.IcosahedronGeometry(radius, 0).toNonIndexed();
  const pos = base.attributes.position, out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    if (!keep(cen)) continue;
    const apex = cen.clone().normalize().multiplyScalar(radius + spikeLen);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) out.push(p.x, p.y, p.z, q.x, q.y, q.z, apex.x, apex.y, apex.z);
  }
  base.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

function dial(s, x, y, z, r) {
  const d = grp(s, x, y, z);
  disc(d, r, 0.03, C.cream, 0, 0, 0, 20);
  part(d, torus(r, r * 0.1, 5, 22), C.gold, 0, 0, 0.006);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU, t = part(d, box(r * 0.1, r * 0.2, 0.01), C.coal, Math.sin(a) * r * 0.72, Math.cos(a) * r * 0.72, 0.02); t.rotation.z = -a; }
  [[2.1, 0.48, 0.024], [-0.3, 0.72, 0.03]].forEach(([a, l, zz]) => { const h = grp(d, 0, 0, zz); h.rotation.z = -a; part(h, box(r * 0.09, r * l, 0.01), C.coal, 0, r * l / 2, 0); });
  part(d, sph(r * 0.08, 8, 6), C.gold, 0, 0, 0.036);
}

function owlHead(s, x, y, z, r) {
  const h = grp(s, x, y, z);
  part(h, sph(r, 16, 12), C.ochre).scale.set(1.08, 0.92, 1);
  [-1, 1].forEach(sx => {
    const e = grp(h, sx * r * 0.4, r * 0.06, r * 0.8);
    disc(e, r * 0.36, 0.04, C.ochreDk, 0, 0, 0, 14);
    disc(e, r * 0.3, 0.04, C.cream, 0, 0, 0.01, 14);
    part(e, sph(r * 0.15, 10, 8), C.coal, 0, 0, 0.03);
    part(e, sph(r * 0.05, 6, 4), 0xffffff, r * 0.05, r * 0.06, 0.03 + r * 0.13);
    const t = part(h, cone(r * 0.2, r * 0.55, 5), C.ochre, sx * r * 0.62, r * 0.8, -r * 0.05); t.rotation.z = -sx * 0.45;
  });
  part(h, cone(r * 0.1, r * 0.26, 5), C.gold, 0, -r * 0.2, r * 0.98).rotation.x = 2.5;
}

function acorn(s, x, y, z, r, rot = 0) {
  const a = grp(s, x, y, z); a.rotation.z = rot;
  part(a, sph(r, 10, 8), C.acornLt).scale.set(1, 1.2, 1);
  part(a, sph(r * 1.08, 10, 5, 0, TAU, 0, Math.PI / 2), C.cap, 0, r * 0.3, 0).scale.set(1, 0.7, 1);
  part(a, cyl(r * 0.12, r * 0.15, r * 0.4, 5), C.cap, 0, r, 0);
}

function squirrel(s, x, y, z, rotY) {
  const q = grp(s, x, y, z); q.rotation.y = rotY;
  part(q, sph(0.17, 12, 9), C.squirrel, 0, 0.2, 0).scale.set(0.9, 1.2, 0.85);
  part(q, sph(0.12, 10, 8), C.cream, 0, 0.19, 0.08).scale.set(0.8, 1.05, 0.6);
  part(q, sph(0.13, 12, 9), C.squirrel, 0, 0.45, 0.04);
  part(q, sph(0.07, 8, 6), C.cream, 0, 0.42, 0.13).scale.set(1, 0.7, 0.6);
  [-1, 1].forEach(sx => {
    const e = part(q, cone(0.045, 0.11, 5), C.squirrel, sx * 0.075, 0.58, 0.01); e.rotation.z = -sx * 0.25;
    part(q, sph(0.022, 6, 5), C.coal, sx * 0.055, 0.48, 0.15);
    part(q, sph(0.05, 8, 6), C.squirrel, sx * 0.08, 0.03, 0.08).scale.set(1, 0.6, 1.4);
  });
  part(q, sph(0.018, 6, 4), C.coal, 0, 0.44, 0.18);
  [[0.12, -0.17, 0.1, 1.2], [0.32, -0.3, 0.15, 1.15], [0.55, -0.3, 0.16, 1.1], [0.71, -0.17, 0.12, 1.1]].forEach(([ty, tz, r, sy]) => part(q, sph(r, 12, 9), C.squirrelLt, 0, ty, tz).scale.set(0.8, sy, 1));
  acorn(q, 0, 0.3, 0.18, 0.05);
}

function hogShells(s) {
  const QR = 0.19;
  [[[0, 0.24, 0.1], [-0.35, 0.3, 0], [1.05, 0.78, 1.0]], [[0, 0.27, -0.08], [-0.3, -0.5, 0.1], [1.2, 0.85, 1.05]], [[0, 0.22, -0.26], [-0.45, 0.9, 0], [1.0, 0.75, 1.0]]].forEach(([p, r, sc], i) => {
    const m = part(s, spikyShell(QR, QR * 0.75, c => c.y > -QR * 0.2), i === 1 ? C.quill : C.quillDk, ...p);
    m.rotation.set(...r); m.scale.set(...sc);
  });
}

function hogFace(s, x, y, z, k, tilt) {
  const hg = grp(s, x, y, z); hg.rotation.x = tilt; hg.scale.setScalar(k);
  part(hg, sph(0.13, 14, 10), C.hogFace).scale.set(1, 0.9, 1);
  part(hg, cone(0.085, 0.16, 10), C.hogFace, 0, -0.02, 0.15).rotation.x = Math.PI / 2;
  part(hg, sph(0.032, 8, 6), C.coal, 0, -0.02, 0.23);
  [-1, 1].forEach(sx => {
    part(hg, sph(0.024, 8, 6), C.coal, sx * 0.075, 0.045, 0.095);
    part(hg, sph(0.008, 6, 4), 0xffffff, sx * 0.08, 0.055, 0.115);
    part(hg, sph(0.04, 8, 6), C.ear, sx * 0.1, 0.1, -0.02).scale.set(1, 1, 0.5);
    part(hg, sph(0.03, 8, 6), C.cheek, sx * 0.09, -0.03, 0.09).scale.set(1, 0.6, 0.4);
  });
}

function antler(s, x, y, z, sx, k) {
  const a = grp(s, x, y, z); a.scale.setScalar(k); a.rotation.z = -sx * 0.4;
  part(a, cyl(0.018, 0.026, 0.3, 5), C.antler, 0, 0.15, 0);
  part(a, cyl(0.013, 0.017, 0.13, 5), C.antler, sx * 0.05, 0.16, 0.02).rotation.z = -sx * 0.9;
  part(a, cyl(0.012, 0.016, 0.12, 5), C.antler, -sx * 0.035, 0.3, 0).rotation.z = sx * 0.6;
  part(a, cyl(0.011, 0.015, 0.11, 5), C.antler, sx * 0.04, 0.33, 0).rotation.z = -sx * 0.5;
}

function flag(s, x, y, z) {
  const f = grp(s, x, y, z);
  part(f, box(0.03, 0.34, 0.03), C.woodDk, 0, 0.17, 0);
  part(f, box(0.025, 0.12, 0.16), C.berry, 0, 0.28, 0.09);
  part(f, sph(0.03, 8, 6), C.gold, 0.02, 0, 0);
}

function tunnelBox(s, x, y, z, w, h, d, col) {
  const b = grp(s, x, y, z);
  part(b, box(w, h, d), col, 0, h / 2, 0);
  part(b, cyl(w / 2, w / 2, d, 14, 1, false, Math.PI / 2, Math.PI), col, 0, h, 0).rotation.x = Math.PI / 2;
  return b;
}

const BUILD = {
  fp_owl_clock(s) {
    part(s, box(0.62, 0.1, 0.42), C.woodDk, 0, 0.05, 0);
    part(s, box(0.5, 1.0, 0.34), C.acorn, 0, 0.6, 0);
    part(s, box(0.56, 0.05, 0.38), C.woodDk, 0, 1.1, 0);
    part(s, box(0.32, 0.5, 0.04), C.woodDk, 0, 0.45, 0.18);
    part(s, box(0.26, 0.44, 0.02), C.glass, 0, 0.45, 0.193);
    part(s, box(0.015, 0.3, 0.01), C.gold, 0, 0.53, 0.207);
    disc(s, 0.06, 0.015, C.gold, 0, 0.36, 0.212, 12);
    dial(s, 0, 0.9, 0.187, 0.15);
    [-1, 1].forEach(sx => {
      part(s, sph(0.3, 10, 8), C.ochreDk, sx * 0.26, 0.72, 0).scale.set(0.22, 1.25, 0.65);
      [0, 1].forEach(i => part(s, cone(0.022, 0.08, 4), C.gold, sx * (0.12 + i * 0.06), 0.1, 0.22).rotation.x = Math.PI / 2);
    });
    owlHead(s, 0, 1.36, 0, 0.29);
  },
  fp_acorn_cupboard(s) {
    [0, 2.1, 4.2].forEach(a => part(s, cyl(0.05, 0.04, 0.16, 6), C.woodDk, Math.sin(a) * 0.26, 0.08, Math.cos(a) * 0.26));
    part(s, lathe([[0, 0], [0.12, 0.01], [0.3, 0.1], [0.42, 0.3], [0.46, 0.55], [0.45, 0.82], [0, 0.82]], 18), C.acornLt, 0, 0.14, 0);
    part(s, lathe([[0, 0], [0.5, 0], [0.53, 0.06], [0.49, 0.16], [0.37, 0.28], [0.18, 0.35], [0, 0.37]], 18), C.cap, 0, 0.92, 0);
    flatRing(s, 0.51, 0.04, C.capLt, 0.95, 5, 26);
    flatRing(s, 0.42, 0.02, C.capLt, 1.1, 4, 22);
    part(s, cyl(0.04, 0.06, 0.16, 6), C.cap, 0, 1.35, 0);
    const lf = part(s, sph(0.1, 8, 6), C.moss, 0.1, 1.37, 0.02); lf.scale.set(1.2, 0.2, 0.55); lf.rotation.z = -0.3;
    part(s, arch(0.42, 0.34, 0.04), C.acorn, 0, 0.26, 0.42);
    part(s, arch(0.34, 0.3, 0.012), C.wood, 0, 0.3, 0.462);
    disc(s, 0.08, 0.02, C.glass, 0, 0.66, 0.47, 14);
    part(s, torus(0.08, 0.015, 4, 16), C.cream, 0, 0.66, 0.48);
    part(s, sph(0.028, 8, 6), C.gold, 0.12, 0.45, 0.49);
    squirrel(s, 0.6, 0, 0.18, -0.6);
  },
  fp_hedgehog_cushion(root) {
    const s = grp(root); s.scale.setScalar(0.72);
    part(s, sph(0.3, 16, 12), C.quill, 0, 0.32, -0.02).scale.set(1, 1.1, 0.9);
    const sh = grp(s, 0, 0.08, -0.16); sh.scale.set(1.25, 1.35, 1.0); sh.rotation.x = -0.35;
    hogShells(sh);
    part(s, sph(0.26, 14, 10), C.hogFace, 0, 0.3, 0.1).scale.set(0.85, 1.0, 0.6);
    hogFace(s, 0, 0.48, 0.12, 1.25, 0.05);
    [-1, 1].forEach(sx => {
      part(s, sph(0.07, 8, 6), C.stump, sx * 0.14, 0.05, 0.16).scale.set(1, 0.6, 1.3);
      const arm = part(s, sph(0.06, 8, 6), C.hogFace, sx * 0.13, 0.28, 0.25); arm.scale.set(0.8, 1.3, 0.8); arm.rotation.z = sx * 0.6;
    });
    part(s, sph(0.07, 10, 8), C.berry, 0, 0.26, 0.29);
    part(s, cone(0.03, 0.04, 5), C.moss, 0, 0.33, 0.29);
  },
  fp_deer_mailbox(s) {
    part(s, cyl(0.24, 0.28, 0.08, 8), C.stone, 0, 0.04, 0);
    part(s, cyl(0.06, 0.07, 0.86, 8), C.birch, 0, 0.5, 0);
    [[0.3, 0.6], [0.55, 2.2], [0.75, 4.0]].forEach(([y, a]) => part(s, box(0.05, 0.02, 0.02), C.coal, Math.sin(a) * 0.066, y, Math.cos(a) * 0.066).rotation.y = a);
    const b = tunnelBox(s, 0, 0.9, 0, 0.36, 0.24, 0.48, C.fawn);
    [[-1, 0.1, 0.1], [-1, 0.06, -0.12], [1, 0.12, -0.06], [1, 0.05, 0.13]].forEach(([sx, y, z]) => part(b, cyl(0.035, 0.035, 0.012, 10), C.cream, sx * 0.183, y, z).rotation.z = Math.PI / 2);
    part(b, arch(0.38, 0.24, 0.03), C.fawnLt, 0, -0.01, 0.24);
    [-1, 1].forEach(sx => {
      part(b, sph(0.032, 8, 6), C.coal, sx * 0.085, 0.27, 0.275);
      part(b, sph(0.01, 6, 4), 0xffffff, sx * 0.093, 0.285, 0.302);
      const e = part(b, cone(0.07, 0.19, 6), C.fawnDk, sx * 0.24, 0.36, 0.02); e.scale.set(1, 1, 0.4); e.rotation.z = -sx * 1.15;
      antler(b, sx * 0.08, 0.38, 0, sx, 1.05);
    });
    const mz = part(b, cyl(0.1, 0.1, 0.03, 14), C.cream, 0, 0.12, 0.28); mz.rotation.x = Math.PI / 2; mz.scale.set(1.25, 1, 0.85);
    part(b, sph(0.04, 8, 6), C.coal, 0, 0.16, 0.3);
    part(b, box(0.16, 0.025, 0.01), C.coal, 0, 0.06, 0.296);
    flag(b, 0.2, 0.08, -0.1);
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown forest pick decor: ${id}`);
  const solid = new THREE.Group();
  fn(solid);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  return out;
}
