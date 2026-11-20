import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['sp_shell_lamp', 'sp_lighthouse_model', 'sp_boat_planter'];
export const YARD_IDS = ['sp_net_hammock'];

const C = {
  navy: 0x2e4a6b, navyDk: 0x22364e, teal: 0x3f8f8a,
  sand: 0xd8c49a, sandDk: 0xbfa77c, cream: 0xdcd2c0, coral: 0xd0574a, coralLt: 0xe08a6e, coralDk: 0xa8443b,
  drift: 0x8a6a4c, driftDk: 0x5e4733, driftLt: 0xa88866,
  brass: 0xc9a04a, rock: 0x7d7a74, rockDk: 0x625f5a, soil: 0x4a3426,
  green: 0x5f8f4a, greenDk: 0x3f6b3a, yellow: 0xe8c04a, pink: 0xe39aa0,
  glow: 0xf5c470, glowCore: 0xf6cf8a,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const basicBaked = (g) => new THREE.Mesh(bakeGroup(g), new THREE.MeshBasicMaterial({ vertexColors: true }));

function rod(p, a, b, r, col, seg = 5, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg, 1, seg < 5), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function meshGeo(pos, idx, outward) {
  const P = (i) => V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const fixed = [];
  for (let f = 0; f < idx.length; f += 3) {
    const [a, b, c] = [idx[f], idx[f + 1], idx[f + 2]];
    const pa = P(a), pb = P(b), pc = P(c);
    const n = pb.clone().sub(pa).cross(pc.clone().sub(pa));
    const cen = pa.clone().add(pb).add(pc).multiplyScalar(1 / 3);
    fixed.push(...(n.dot(outward(cen, f / 3)) >= 0 ? [a, b, c] : [a, c, b]));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(fixed);
  g.computeVertexNormals();
  return g;
}

function grid(nu, nv, at, outward) {
  const pos = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) pos.push(...at(i / nu, j / nv));
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1;
    idx.push(a, b, b + 1, a, b + 1, a + 1);
  }
  return meshGeo(pos, idx, outward);
}

function hull(p, L, W, D, cols) {
  const n = 14, m = 8, inK = 0.84, th = 0.035, tMax = 0.93;
  const hw = (t) => W / 2 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.22 + 0.78 * t))), 0.7);
  const yt = (t) => D + 0.14 * D * t * t;
  const yb = (t) => 0.55 * D * Math.pow(t, 4);
  const X = (t) => -L / 2 + L * t;
  const sec = (t, a, k, dz) => { const s = Math.pow(Math.sin(a), 0.55); return [X(t), yt(t) - (yt(t) - yb(t) - dz) * s, hw(t) * k * Math.cos(a)]; };
  const mid = (c) => V(c.x, D * 1.3, 0);
  const out = (c) => c.clone().sub(mid(c));
  const inn = (c) => mid(c).sub(c);
  part(p, grid(n, m, (t, v) => sec(t, v * Math.PI, 1, 0), out), cols.out);
  part(p, grid(n, m, (t, v) => sec(t * tMax, v * Math.PI, inK, th), inn), cols.in);
  const rimPos = [], rimIdx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, ti = t * tMax;
    for (const sz of [1, -1]) rimPos.push(X(t), yt(t), sz * hw(t), X(ti), yt(ti), sz * hw(ti) * inK);
  }
  for (let i = 0; i < n; i++) for (const o of [0, 2]) { const a = i * 4 + o, b = a + 4; rimIdx.push(a, b, b + 1, a, b + 1, a + 1); }
  part(p, meshGeo(rimPos, rimIdx, () => V(0, 1, 0)), cols.rim);
  const tr = [], tri = [];
  for (let j = 0; j <= m; j++) { const a = j / m * Math.PI; tr.push(...sec(0, a, 1, 0), ...sec(0, a, inK, th)); }
  for (let j = 0; j < m; j++) { const a = j * 2, b = a + 2; tri.push(a, b, b + 1, a, b + 1, a + 1); }
  part(p, meshGeo(tr, tri, () => V(-1, 0, 0)), cols.out);
  for (const [a0, a1] of [[0.1, 0.3], [Math.PI - 0.3, Math.PI - 0.1]]) part(p, grid(n, 2, (t, v) => sec(t, a0 + (a1 - a0) * v, 1.015, 0), out), cols.stripe);
  const sh = new THREE.Shape(), ts = [];
  for (let i = 0; i <= n; i++) ts.push(i / n * tMax);
  ts.forEach((t, i) => { const x = X(t), z = hw(t) * inK * 0.97; i ? sh.lineTo(x, z) : sh.moveTo(x, z); });
  [...ts].reverse().forEach(t => sh.lineTo(X(t), -hw(t) * inK * 0.97));
  const s = part(p, new THREE.ShapeGeometry(sh), cols.soil, 0, D - 0.05, 0); s.rotation.x = -Math.PI / 2;
}

function scallopFan(p, r, cols, bulge) {
  const span = 2.1, ribs = 9, corr = 0.06, th = 0.02, nr = 5, dir = Math.sign(bulge) || 1;
  const f = grp(p);
  for (let k = 0; k < ribs; k++) {
    const pos = [], idx = [];
    const a0 = -span / 2 + span * k / ribs, a1 = a0 + span / ribs;
    const pts = [[a0, 0], [(a0 + a1) / 2, 1], [a1, 0]];
    let backStart = 0;
    for (const back of [0, 1]) {
      const base = pos.length / 3;
      if (back) backStart = idx.length / 3;
      for (let i = 0; i <= nr; i++) for (const [a, ridge] of pts) {
        const q = i / nr, rr = r * q * (1 + (ridge ? 0.05 : 0) * q);
        const z = r * bulge * Math.sin(q * Math.PI * 0.8) + (ridge ? corr * r * q : 0) - back * th * dir;
        pos.push(Math.sin(a) * rr, Math.cos(a) * rr, z);
      }
      for (let i = 0; i < nr; i++) for (let j = 0; j < 2; j++) { const a = base + i * 3 + j, b = a + 3; idx.push(a, b, b + 1, a, b + 1, a + 1); }
    }
    part(f, meshGeo(pos, idx, (c, fi) => V(0, 0, fi < backStart ? dir : -dir)), cols[k % cols.length]);
  }
  part(f, box(r * 0.42, r * 0.14, r * 0.1), cols[1], 0, r * 0.02, 0).rotation.x = 0.2;
  return f;
}

function rock(p, x, y, z, r, col = C.rock, sy = 0.7, rot = 0) {
  const m = part(p, ico(r), col, x, y, z); m.scale.set(1, sy, 1); m.rotation.y = rot;
}

function daisy(p, x, y, z, r, col, eye) {
  const d = grp(p, x, y, z);
  rod(d, [0, -0.12, 0], [0, 0, 0], 0.008, C.greenDk, 4);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, pt = part(d, sph(r * 0.45, 6, 4), col, Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6); pt.scale.set(1.3, 0.35, 0.8); pt.rotation.y = -a; }
  part(d, sph(r * 0.35, 6, 5), eye, 0, r * 0.08, 0);
}

function leafTuft(p, x, y, z, n, len, col, col2, spread, wid) {
  for (let i = 0; i < n; i++) {
    const g = grp(p, x, y, z); g.rotation.y = i / n * TAU + x * 7;
    const c = part(g, cone(wid, len, 4), i % 2 ? col : col2, Math.sin(spread) * len / 2, Math.cos(spread) * len / 2, 0);
    c.rotation.z = -spread * (0.7 + (i % 3) * 0.2);
  }
}

function oar(p, a, b) {
  rod(p, a, b, 0.016, C.driftLt, 6);
  const A = V(...a), B = V(...b), d = B.clone().sub(A).normalize();
  const bl = part(p, box(0.09, 0.2, 0.018), C.coral, B.x + d.x * 0.08, B.y + d.y * 0.08, B.z + d.z * 0.08);
  bl.quaternion.setFromUnitVectors(V(0, 1, 0), d);
}

function arch(w, h, d) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h); sh.absarc(0, h, w / 2, 0, Math.PI, false); sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 6 });
}

function lanternRoom(s, g, y, r, h) {
  part(s, cyl(r * 1.35, r * 1.35, 0.03, 12), C.navy, 0, y, 0);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; rod(s, [Math.cos(a) * r * 1.3, y, Math.sin(a) * r * 1.3], [Math.cos(a) * r * 1.3, y + 0.06, Math.sin(a) * r * 1.3], 0.006, C.navy, 4); }
  part(s, torus(r * 1.3, 0.008, 4, 20), C.navy, 0, y + 0.06, 0).rotation.x = Math.PI / 2;
  part(g, cyl(r * 0.92, r * 0.92, h, 10), C.glow, 0, y + 0.015 + h / 2, 0);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; const m = part(s, box(0.014, h, 0.014), C.navy, Math.cos(a) * r * 0.94, y + 0.015 + h / 2, Math.sin(a) * r * 0.94); m.rotation.y = -a; }
  const top = y + 0.015 + h;
  part(s, cone(r * 1.15, r * 1.1, 10), C.navy, 0, top + r * 0.55, 0);
  part(s, sph(r * 0.22, 8, 6), C.brass, 0, top + r * 1.15, 0);
}

function hammockNet(s, X, top, sag, W, nu, nv) {
  const at = (u, v) => {
    const x = -X + 2 * X * u, end = Math.min(1, Math.sin(Math.PI * u) * 1.6);
    const gather = 0.12 + 0.88 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(Math.max((u - 0.06) / 0.88, 0), 1))), 0.35);
    return [x, top - 0.12 - sag * Math.sin(Math.PI * u) - 0.08 * Math.sin(Math.PI * v) * end, (v - 0.5) * W * gather];
  };
  const P = (i, j) => at(i / nu, j / nv);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    rod(s, P(i, j), P(i + 1, j + 1), 0.011, C.navy, 3);
    rod(s, P(i, j + 1), P(i + 1, j), 0.011, C.navy, 3);
  }
  for (const j of [0, nv]) for (let i = 0; i < nu; i++) rod(s, P(i, j), P(i + 1, j), 0.0165, C.navyDk, 4);
  [-1, 1].forEach(sx => { for (let j = 0; j <= nv; j++) rod(s, [sx * X, top, 0], at(sx < 0 ? 0 : 1, j / nv), 0.009, C.navyDk, 3); });
  rod(s, at(0.06, 0), at(0.06, 1), 0.02, C.driftDk, 6);
  rod(s, at(0.94, 0), at(0.94, 1), 0.02, C.driftDk, 6);
  return at;
}

function flickerRows(glow) {
  const rows = new Map();
  [...glow.children].forEach(m => {
    const k = Math.round(m.position.y * 10);
    if (!rows.has(k)) rows.set(k, new THREE.Group());
    m.position.y -= k / 10;
    rows.get(k).add(m);
  });
  return [...rows].map(([k, row]) => { const m = basicBaked(row); m.position.y = k / 10; m.userData.flicker = true; return m; });
}

const BUILD = {
  sp_shell_lamp(s, g) {
    part(s, cyl(0.26, 0.29, 0.07, 9), C.drift, 0, 0.035, 0).scale.set(1.15, 1, 0.95);
    part(s, cyl(0.24, 0.26, 0.012, 9), C.driftLt, 0, 0.076, 0).scale.set(1.15, 1, 0.95);
    [[-0.24, 0.14], [0.25, 0.1], [0.2, -0.16]].forEach(([x, z], i) => rock(s, x, 0.09, z, 0.035 + i * 0.008, i % 2 ? C.sandDk : C.rock));
    const low = scallopFan(s, 0.3, [C.sand, C.coralLt], 0.22);
    low.rotation.x = Math.PI / 2; low.position.set(0, 0.16, -0.15);
    const up = scallopFan(s, 0.3, [C.coral, C.sand], 0.22);
    up.rotation.x = -Math.PI / 2 + 1.1; up.position.set(0, 0.16, -0.17);
    part(g, sph(0.07, 14, 10), C.glowCore, 0, 0.2, 0);
    return 1.1;
  },
  sp_lighthouse_model(s, g) {
    part(s, cyl(0.36, 0.38, 0.08, 14), C.drift, 0, 0.04, 0);
    part(s, cyl(0.34, 0.34, 0.012, 14), C.driftLt, 0, 0.086, 0);
    part(s, cyl(0.3, 0.33, 0.04, 14), C.teal, 0, 0.11, 0);
    [[0, 0, 0.2, 0.9], [0.17, 0.09, 0.12, 0.7], [-0.16, 0.1, 0.11, 0.6], [0.06, -0.19, 0.1, 0.6], [-0.13, -0.13, 0.09, 0.7]].forEach(([x, z, r, sy], i) => rock(s, x, 0.15, z, r, i % 2 ? C.rockDk : C.rock, sy, i));
    const y0 = 0.22, H = 0.72, r0 = 0.15, r1 = 0.105, bands = 6;
    for (let i = 0; i < bands; i++) {
      const a = i / bands, b = (i + 1) / bands;
      part(s, cyl(r0 + (r1 - r0) * b, r0 + (r1 - r0) * a, H / bands, 14), i % 2 ? C.cream : C.coral, 0, y0 + H * (a + b) / 2, 0);
    }
    part(s, arch(0.07, 0.07, 0.02), C.navy, 0, y0, r0 - 0.012);
    [0.35, 0.62].forEach(f => part(s, box(0.04, 0.05, 0.02), C.navy, 0, y0 + H * f, r0 + (r1 - r0) * f - 0.002));
    lanternRoom(s, g, y0 + H, 0.11, 0.1);
  },
  sp_boat_planter(s) {
    hull(s, 0.95, 0.46, 0.22, { out: C.navy, in: C.sandDk, rim: C.cream, stripe: C.coral, soil: C.soil });
    part(s, box(0.035, 0.03, 0.39), C.driftLt, -0.2, 0.2, 0);
    [[-0.3, 0.05, 0, C.cream], [-0.17, -0.08, 1, C.yellow], [-0.05, 0.06, 0, C.cream], [0.07, -0.04, 1, C.coralLt], [0.18, 0.05, 0, C.cream], [0.28, -0.02, 1, C.yellow], [-0.08, -0.12, 0, C.pink], [0.1, 0.1, 1, C.cream]].forEach(([x, z, big, col], i) => {
      leafTuft(s, x, 0.17, z, 5, 0.14, C.green, C.greenDk, 0.6, 0.03);
      daisy(s, x + 0.01, 0.3 + (i % 3) * 0.04, z, big ? 0.07 : 0.06, col, col === C.yellow ? C.coralDk : C.yellow);
    });
    oar(s, [-0.42, 0.24, 0.23], [0.12, 0.26, 0.26]);
    oar(s, [0.4, 0.25, -0.22], [-0.05, 0.25, -0.26]);
  },
  sp_net_hammock(s) {
    const X = 1.18, top = 0.98;
    part(s, box(1.8, 0.08, 0.12), C.driftDk, 0, 0.04, 0);
    [-1, 1].forEach(sx => {
      part(s, box(0.1, 0.06, 0.7), C.driftDk, sx * 0.85, 0.03, 0);
      const pts = [[sx * 0.82, 0.07, 0], [sx * 0.98, 0.4, 0], [sx * 1.12, 0.75, 0], [sx * X, top + 0.04, 0]];
      for (let i = 0; i < 3; i++) rod(s, pts[i], pts[i + 1], 0.045, C.drift, 7, 0.05);
      part(s, sph(0.05, 7, 5), C.driftLt, ...pts[3]);
    });
    const at = hammockNet(s, X - 0.04, top - 0.02, 0.55, 0.62, 12, 4);
    const [px, py] = at(0.25, 0.5);
    const pil = grp(s, px, py + 0.03, 0); pil.rotation.z = -0.5;
    for (let i = 0; i < 3; i++) part(pil, box(0.17, 0.08, 0.13), i % 2 ? C.cream : C.teal, 0, 0.04, -0.13 + i * 0.13);
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown sea pick decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const k = fn(solid, glow) || 1;
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  flickerRows(glow).forEach(m => { m.userData.noShadow = true; out.add(m); });
  out.scale.setScalar(k);
  return out;
}
