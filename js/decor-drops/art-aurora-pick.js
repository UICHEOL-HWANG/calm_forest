import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['au_igloo_lamp', 'au_ice_chair', 'au_polar_bear_plush', 'au_aurora_window'];
export const YARD_IDS = [];

const C = {
  navy: 0x26335e, navyDk: 0x1a2446,
  mint: 0x5cc4ac, violet: 0x8c70cc, pink: 0xd47cac,
  ice: 0xa6d2e4, iceDk: 0x7cacc4, iceLt: 0xbcdcea,
  fur: 0xccdbe6, furDk: 0xaabccc,
  wood: 0x8a6242, woodDk: 0x5e402a, ink: 0x2a2a36,
  gWarm: 0xf2cd72, gMint: 0x7ee6c6, gViolet: 0xb49cf0, gPink: 0xf0a2d0,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 24, h = 18, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 24, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 30, rad = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);

function rod(p, a, b, r, col, seg = 12) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
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

function dome(p, R, col, x = 0, y = 0, z = 0) {
  return part(p, sph(R, 32, 16, 0, TAU, 0, Math.PI / 2), col, x, y, z);
}

function seams(p, R, rows, col, r = 0.008, x = 0, y = 0, z = 0) {
  for (let i = 1; i <= rows; i++) {
    const a = i / (rows + 1) * Math.PI / 2;
    part(p, torus(R * Math.cos(a) + r * 0.3, r, 6, 40), col, x, y + R * Math.sin(a), z).rotation.x = Math.PI / 2;
  }
  for (let i = 0; i <= rows; i++) {
    const a0 = i / (rows + 1) * Math.PI / 2, a1 = (i + 1) / (rows + 1) * Math.PI / 2, n = Math.max(3, Math.round(10 * Math.cos(a0)));
    for (let j = 0; j < n; j++) {
      const b = (j + (i % 2) * 0.5) / n * TAU, pts = [a0, (a0 + a1) / 2, a1].map(a => [x + Math.sin(b) * R * Math.cos(a) * 1.004, y + R * Math.sin(a), z + Math.cos(b) * R * Math.cos(a) * 1.004]);
      part(p, tube(pts, r, 4, 4), col);
    }
  }
}

function archShape(w, hgt) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, hgt - w / 2); sh.absarc(0, hgt - w / 2, w / 2, 0, Math.PI, false); sh.closePath();
  return sh;
}

function doorway(p, g, R, w, hgt, col, glowCol, y0) {
  const depth = R * 0.5, z0 = R * 0.6;
  part(p, new THREE.ExtrudeGeometry(archShape(w + 0.06, hgt + 0.03), { depth, bevelEnabled: false, curveSegments: 16 }), col, 0, y0, z0);
  part(p, torus(w / 2 + 0.03, 0.012, 6, 20, Math.PI), C.iceDk, 0, y0 + hgt - w / 2, z0 + depth);
  part(g, new THREE.ShapeGeometry(archShape(w, hgt), 16), glowCol, 0, y0, z0 + depth + 0.002);
}

function ribbonPanel(g, pts, w, cols, z, parts = 6, sub = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
  for (let k = 0; k < parts; k++) {
    const pos = [], idx = [];
    for (let i = 0; i <= sub; i++) {
      const t = (k + i / sub) / parts, P = curve.getPointAt(t), T = curve.getTangentAt(t), hw = w * (0.35 + 0.65 * Math.sin(Math.PI * t)) / 2;
      pos.push(P.x + T.y * hw, P.y - T.x * hw, z, P.x - T.y * hw, P.y + T.x * hw, z);
      if (i) { const q = i * 2; idx.push(q - 2, q, q - 1, q - 1, q, q + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    part(g, geo, new THREE.Color(cols[0]).lerp(new THREE.Color(cols[1]), (k + 0.5) / parts).getHex());
  }
}

function star(g, x, y, z, s, col) {
  [0, Math.PI / 4].forEach(r => part(g, box(s, s, 0.006), col, x, y, z).rotation.z = r);
}

function bear(p, s) {
  const head = grp(p, 0, 0, 0);
  part(head, sph(0.13 * s, 20, 16), C.fur).scale.set(1, 0.92, 0.95);
  [-1, 1].forEach(sx => {
    part(head, sph(0.04 * s, 12, 10), C.fur, sx * 0.09 * s, 0.09 * s, -0.01 * s);
    part(head, sph(0.022 * s, 10, 8), C.furDk, sx * 0.09 * s, 0.09 * s, 0.015 * s);
  });
  part(head, sph(0.06 * s, 14, 10), C.furDk, 0, -0.03 * s, 0.1 * s).scale.set(1, 0.75, 0.8);
  part(head, sph(0.02 * s, 10, 8), C.ink, 0, -0.015 * s, 0.15 * s);
  [-1, 1].forEach(sx => part(head, sph(0.017 * s, 10, 8), C.ink, sx * 0.05 * s, 0.03 * s, 0.115 * s));
  return head;
}

function archWindow(s, w, hh, d, y0) {
  const outline = (ww, b) => {
    const sh = new THREE.Shape();
    sh.moveTo(-ww / 2, b); sh.lineTo(ww / 2, b); sh.lineTo(ww / 2, hh - w / 2); sh.absarc(0, hh - w / 2, ww / 2, 0, Math.PI, false); sh.closePath();
    return sh;
  };
  const iw = w - 0.12, frame = outline(w, 0);
  frame.holes.push(outline(iw, 0.06));
  part(s, new THREE.ExtrudeGeometry(frame, { depth: d, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 24 }), C.navy, 0, y0, -d / 2);
  part(s, new THREE.ShapeGeometry(outline(iw, 0.06), 24), C.navyDk, 0, y0, -0.012);
  return iw;
}

const BUILD = {
  au_igloo_lamp(s, g) {
    const R = 0.26, y0 = 0.03;
    part(s, cyl(R + 0.03, R + 0.04, 0.03, 32), C.iceDk, 0, 0.015, 0);
    dome(s, R, C.iceLt, 0, y0, 0);
    seams(s, R, 3, C.iceDk, 0.007, 0, y0, 0);
    doorway(s, g, R, 0.16, 0.18, C.iceLt, C.gWarm, y0);
    part(s, sph(0.03, 10, 8), C.iceDk, 0, y0 + R + 0.01, 0);
    [-1, 1].forEach(sx => {
      const w = grp(s, sx * Math.sin(1.1) * R * 0.86, y0 + R * 0.5, Math.cos(1.1) * R * 0.86); w.rotation.y = sx * 1.1;
      part(w, torus(0.035, 0.009, 6, 18), C.iceDk);
      const gw = grp(g, w.position.x, w.position.y, w.position.z); gw.rotation.y = sx * 1.1;
      part(gw, cyl(0.032, 0.032, 0.01, 18), C.gWarm).rotation.x = Math.PI / 2;
    });
    return 1.7;
  },
  au_ice_chair(s) {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(s, cyl(0.035, 0.012, 0.38, 6), C.iceDk, sx * 0.19, 0.19, sz * 0.17).rotation.x = Math.PI);
    roundSlab(s, 0.5, 0.46, 0.05, 0.05, C.ice, 0.38);
    roundSlab(s, 0.42, 0.38, 0.07, 0.06, C.pink, 0.43);
    const back = grp(s, 0, 0.78, -0.2); back.rotation.x = -0.1;
    for (let i = 0; i < 3; i++) {
      const a = grp(back); a.rotation.z = i * Math.PI / 3;
      part(a, box(0.56, 0.05, 0.04), C.iceLt);
      [-1, 1].forEach(sd => [-1, 1].forEach(e => part(a, box(0.12, 0.035, 0.035), C.iceLt, sd * 0.19, e * 0.04, 0).rotation.z = e * sd * 0.8));
    }
    part(back, sph(0.06, 14, 10), C.ice);
    rod(s, [-0.12, 0.41, -0.19], [-0.08, 0.6, -0.2], 0.02, C.iceDk);
    rod(s, [0.12, 0.41, -0.19], [0.08, 0.6, -0.2], 0.02, C.iceDk);
    part(s, sph(0.11, 16, 12), C.violet, 0.1, 0.52, -0.08).scale.set(1.2, 0.8, 0.5);
    return 1;
  },
  au_polar_bear_plush(s) {
    part(s, sph(0.19, 24, 18), C.fur, 0, 0.19, 0).scale.set(1, 1.05, 0.95);
    part(s, sph(0.12, 18, 14), C.iceLt, 0, 0.17, 0.1).scale.set(1, 1.1, 0.6);
    [-1, 1].forEach(sx => {
      part(s, sph(0.07, 14, 10), C.fur, sx * 0.1, 0.06, 0.14).scale.set(1, 0.8, 1.3);
      part(s, sph(0.04, 10, 8), C.furDk, sx * 0.1, 0.06, 0.22).scale.set(1, 1, 0.4);
      part(s, sph(0.065, 14, 10), C.fur, sx * 0.17, 0.24, 0.05).scale.set(0.8, 1.3, 0.8);
    });
    bear(grp(s, 0, 0.47, 0.02), 1.1);
    part(s, torus(0.12, 0.035, 8, 28), C.navy, 0, 0.35, 0.01).rotation.x = Math.PI / 2;
    part(s, torus(0.12, 0.012, 6, 28), C.mint, 0, 0.35, 0.01).rotation.x = Math.PI / 2;
    part(s, box(0.06, 0.15, 0.03), C.navy, 0.06, 0.27, 0.13).rotation.z = 0.2;
    part(s, box(0.065, 0.02, 0.035), C.mint, 0.05, 0.22, 0.134).rotation.z = 0.2;
    return 1.3;
  },
  au_aurora_window(s, g) {
    const w = 0.7, hh = 0.95, y0 = 0.08, iw = archWindow(s, w, hh, 0.1, y0);
    ribbonPanel(g, [[-0.27, y0 + 0.35, 0], [-0.1, y0 + 0.55, 0], [0.08, y0 + 0.45, 0], [0.27, y0 + 0.72, 0]], 0.13, [C.gMint, C.gViolet], -0.004);
    ribbonPanel(g, [[-0.27, y0 + 0.6, 0], [-0.08, y0 + 0.75, 0], [0.1, y0 + 0.7, 0], [0.22, y0 + 0.88, 0]], 0.09, [C.gViolet, C.gPink], -0.003);
    [[-0.18, 0.86], [0.12, 0.92], [0.2, 0.3], [-0.2, 0.22]].forEach(([x, y]) => star(g, x, y0 + y, -0.002, 0.025, C.gWarm));
    part(s, box(0.025, hh - 0.1, 0.04), C.navy, 0, y0 + hh / 2 - 0.02, 0);
    part(s, box(iw, 0.025, 0.04), C.navy, 0, y0 + 0.45, 0);
    part(s, box(w + 0.14, 0.04, 0.2), C.wood, 0, y0 + 0.02, 0.04);
    part(s, box(w + 0.06, 0.08, 0.14), C.woodDk, 0, 0.04, 0);
    return 1;
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown aurora pick decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const k = fn(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) {
    const m = new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true }));
    m.userData.noShadow = true;
    out.add(m);
  }
  out.scale.setScalar(k);
  return out;
}
