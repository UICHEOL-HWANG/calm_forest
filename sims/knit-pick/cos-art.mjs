import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';
import { DOME_BOT, tailType } from '../../js/cosmetics/anchors.js';

export const KN = Object.freeze({
  cream: 0xe6d6b8, oat: 0xcdb48c,
  mustard: 0xd29a3a, mustardDk: 0xa87828,
  rose: 0xc8707a, roseDk: 0x9c4c58,
  sage: 0x8aa07a, wicker: 0xc49a5c, wickerDk: 0x98713f, wood: 0xb8834e, woodDk: 0x7e5432,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, h, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 18, b = 14) => new THREE.SphereGeometry(r, a, b),
    cyl: (a, b, hh, s = 16, open = false) => new THREE.CylinderGeometry(a, b, hh, s, 1, open),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
    tube: (p, pts, r, c, seg = 24, rad = 7) => { const m = tubeAlong(THREE, pts, r, h.clay(c, false), seg, rad); p.add(m); return m; },
  };
}

function pom(K, p, r, c, x, y, z, puffs = 9) {
  K.add(p, new K.THREE.IcosahedronGeometry(r, 2), c, x, y, z);
  for (let i = 0; i < puffs; i++) {
    const a = i * 2.39996, t = (i + 0.5) / puffs, ry = 1 - 2 * t, rr = Math.sqrt(1 - ry * ry);
    K.add(p, new K.THREE.IcosahedronGeometry(r * 0.4, 1), c, x + Math.cos(a) * rr * r * 0.85, y + ry * r * 0.85, z + Math.sin(a) * rr * r * 0.85);
  }
}

function ribbed(geo, n, amp) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), f = 1 + amp * Math.cos(Math.atan2(z, x) * n);
    pos.setX(i, x * f); pos.setZ(i, z * f);
  }
  geo.computeVertexNormals();
  return geo;
}

function lathe(K, prof, seg = 40) {
  return new K.THREE.LatheGeometry(prof.map(([x, y]) => new K.THREE.Vector2(x, y)), seg);
}

function cuff(K, g, HR, rk, hgt, c, ribN = 30) {
  const y0 = DOME_BOT * HR, r0 = Math.sqrt((HR * rk) ** 2 - y0 * y0) + HR * 0.06, r1 = Math.sqrt((HR * rk) ** 2 - (y0 + hgt) ** 2) + HR * 0.05;
  const geo = ribbed(lathe(K, [[r0 - HR * 0.05, y0 - HR * 0.02], [r0, y0], [r0 + HR * 0.01, y0 + hgt * 0.5], [r1, y0 + hgt], [r1 - HR * 0.06, y0 + hgt + HR * 0.01]], 60), ribN, 0.035);
  K.add(g, geo, c);
}

function crownFn(HR, yt) {
  const y0 = DOME_BOT * HR, R0 = Math.sqrt((HR * 1.08) ** 2 - y0 * y0);
  return y => {
    const t = Math.min(1, Math.max(0, (y - y0) / (yt - y0)));
    return Math.max(Math.sqrt(Math.max(0, HR * HR - y * y)) * 1.07, R0 * Math.sqrt(Math.max(0, 1 - t ** 2.2)));
  };
}

function crown(K, g, HR, yt, c, ribN = 0) {
  const f = crownFn(HR, yt), y0 = DOME_BOT * HR, prof = [];
  for (let i = 0; i <= 16; i++) { const y = y0 + (yt - y0) * i / 16; prof.push([Math.max(0.0005, f(y)), y]); }
  const geo = lathe(K, prof, 48);
  if (ribN) ribbed(geo, ribN, 0.025);
  K.add(g, geo, c);
  return f;
}

function cable(K, g, f, phi, y0, y1, w, rr, c) {
  const M = 44;
  [0, Math.PI].forEach(ph => {
    const pts = [];
    for (let i = 0; i <= M; i++) {
      const t = i / M, y = y0 + (y1 - y0) * t, rad = f(y), sp = Math.sin(t * Math.PI * 6 + ph), cp = Math.cos(t * Math.PI * 6 + ph);
      const ww = w * (1 - 0.6 * t), r = rad + rr * 0.5 + ww * 0.5 * (1 + cp), p2 = phi + (ww / Math.max(rad, w)) * sp;
      pts.push(K.V(r * Math.cos(p2), y, r * Math.sin(p2)));
    }
    K.tube(g, pts, rr * (1 - 0.35 * 1), c, 70, 6);
  });
}

export function buildBeanieA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, yt = HR * 1.3;
  const f = crown(K, g, HR, yt, KN.mustard);
  for (let i = 0; i < 7; i++) cable(K, g, f, (i / 7) * TAU + Math.PI / 2, DOME_BOT * HR + HR * 0.26, yt - HR * 0.14, HR * 0.08, HR * 0.06, KN.mustardDk);
  cuff(K, g, HR, 1.08, HR * 0.24, KN.mustard, 34);
  pom(K, g, HR * 0.3, KN.cream, 0, yt + HR * 0.06, -HR * 0.02, 11);
  flatten(THREE, g);
}

export function buildBeanieB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, rk = 1.08;
  const cf = crown(K, g, HR, HR * 1.16, KN.rose);
  const sl = K.add(g, K.sph(HR * 0.78, 28, 18), KN.rose, 0, HR * 0.82, -HR * 0.42);
  sl.scale.set(1.04, 0.72, 1.0); sl.rotation.x = 0.55;
  [0.66, 0.82, 0.98].forEach(y => K.add(g, K.tor(cf(y * HR), HR * 0.03, 5, 40), KN.roseDk, 0, y * HR, 0).rotation.x = Math.PI / 2);
  cuff(K, g, HR, rk, HR * 0.13, KN.roseDk, 40);
  const f = K.grp(g, HR * 0.72, HR * 0.68, HR * 0.62); f.lookAt(HR * 2, HR * 1.4, HR * 2);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU, pt = K.add(f, K.sph(HR * 0.09, 12, 8), KN.cream, Math.cos(a) * HR * 0.1, Math.sin(a) * HR * 0.1, 0);
    pt.scale.set(1, 1, 0.45);
  }
  K.add(f, K.sph(HR * 0.06, 12, 8), KN.mustard, 0, 0, HR * 0.03);
  flatten(THREE, g);
}

export function buildBeanieC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, rk = 1.07;
  const cf = crown(K, g, HR, HR * 1.12, KN.cream, 28);
  [0.72, 0.92].forEach(y => K.add(g, K.tor(cf(y * HR) + HR * 0.01, HR * 0.05, 6, 40), KN.rose, 0, y * HR, 0).rotation.x = Math.PI / 2);
  cuff(K, g, HR, rk, HR * 0.18, KN.mustard, 34);
  const curve = new THREE.CatmullRomCurve3([K.V(0, HR * 0.86, 0), K.V(0, HR * 1.22, -HR * 0.08), K.V(HR * 0.1, HR * 1.42, -HR * 0.3), K.V(HR * 0.34, HR * 1.4, -HR * 0.56), K.V(HR * 0.5, HR * 1.18, -HR * 0.7)]);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = curve.getPointAt(t);
    K.add(g, K.sph(HR * (0.46 - 0.33 * t), 20, 14), Math.floor(i / 2) % 2 ? KN.rose : KN.cream, p.x, p.y, p.z);
  }
  const e = curve.getPointAt(1);
  pom(K, g, HR * 0.17, KN.mustard, e.x + HR * 0.04, e.y - HR * 0.14, e.z - HR * 0.04, 8);
  flatten(THREE, g);
}

function closedRope(K, g, r, y, w, rr, colors, twists = 7) {
  const M = 120;
  colors.forEach((c, si) => {
    const pts = [];
    for (let i = 0; i < M; i++) {
      const a = (i / M) * TAU, ph = a * twists + si * TAU / colors.length;
      const rad = r + w * Math.cos(ph);
      pts.push(K.V(Math.cos(a) * rad, y + w * Math.sin(ph), Math.sin(a) * rad));
    }
    const m = new K.THREE.Mesh(new K.THREE.TubeGeometry(new K.THREE.CatmullRomCurve3(pts, true), 240, rr, 7, true), K.h.clay(c, false));
    m.castShadow = true; g.add(m);
  });
}

function ropeAlong(K, g, pts, w, rr, colors, twists = 4) {
  const curve = new K.THREE.CatmullRomCurve3(pts), M = 60, up = K.V(0, 1, 0);
  colors.forEach((c, si) => {
    const out = [];
    for (let i = 0; i <= M; i++) {
      const t = i / M, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      const s1 = new K.THREE.Vector3().crossVectors(tg, up).normalize(), s2 = new K.THREE.Vector3().crossVectors(s1, tg).normalize();
      const ph = t * TAU * twists + si * TAU / colors.length;
      out.push(p.clone().addScaledVector(s1, w * Math.cos(ph)).addScaledVector(s2, w * Math.sin(ph)));
    }
    K.tube(g, out, rr, c, 80, 7);
  });
  return curve;
}

function tassel(K, g, at, dir, r, c) {
  const q = new K.THREE.Quaternion().setFromUnitVectors(K.V(0, -1, 0), dir.clone().normalize());
  const t = K.grp(g, at.x, at.y, at.z); t.quaternion.copy(q);
  K.add(t, K.sph(r * 0.7, 12, 10), c, 0, 0, 0);
  K.add(t, K.cyl(r * 0.55, r * 0.95, r * 2.4, 14), c, 0, -r * 1.5, 0);
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; K.add(t, K.cyl(r * 0.16, r * 0.12, r * 0.9, 5), c, Math.cos(a) * r * 0.7, -r * 3.0, Math.sin(a) * r * 0.7); }
}

const frontPts = (THREE, k, r, dirs, first) => {
  const p = dirs.map(d => surfLocal(THREE, k, k.neck, d, 1.1));
  p[0] = new THREE.Vector3(...first.map(v => v * r));
  return p;
};

export function buildScarfA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  closedRope(K, g, r * 1.02, r * 0.04, r * 0.15, r * 0.17, [KN.mustard, KN.mustardDk], 8);
  const pts = frontPts(THREE, k, r, [[0, 0, 1], [0.30, 0.72, 0.72], [0.32, 0.50, 0.88], [0.33, 0.30, 0.96]], [0.34, -0.16, 1.08]);
  const c = ropeAlong(K, g, pts, r * 0.1, r * 0.13, [KN.mustard, KN.mustardDk], 3);
  const e = c.getPointAt(1);
  tassel(K, g, e, c.getTangentAt(1), r * 0.17, KN.cream);
  flatten(THREE, g);
}

export function buildScarfB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const geo = ribbed(lathe(K, [[r * 0.98, -r * 0.3], [r * 1.18, -r * 0.24], [r * 1.3, -r * 0.04], [r * 1.3, r * 0.18], [r * 1.2, r * 0.34], [r * 1.06, r * 0.4]], 72), 26, 0.03);
  K.add(g, geo, KN.cream);
  K.add(g, K.tor(r * 1.0, r * 0.08, 6, 48), KN.oat, 0, -r * 0.28, 0).rotation.x = Math.PI / 2;
  K.add(g, K.tor(r * 1.08, r * 0.07, 6, 48), KN.oat, 0, r * 0.38, 0).rotation.x = Math.PI / 2;
  K.add(g, K.tor(r * 1.33, r * 0.05, 6, 48), KN.rose, 0, r * 0.07, 0).rotation.x = Math.PI / 2;
  [-0.12, 0.2].forEach(y => {
    const a = -1.05, b = K.add(g, K.cyl(r * 0.09, r * 0.09, r * 0.05, 14), KN.woodDk, Math.cos(a) * r * 1.32, y * r, -Math.sin(a) * r * 1.32);
    b.lookAt(b.position.clone().multiplyScalar(2)); b.rotateX(Math.PI / 2);
  });
  flatten(THREE, g);
}

function stripedTube(K, g, pts, rFn, colors, n = 8) {
  const curve = new K.THREE.CatmullRomCurve3(pts);
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, seg = [];
    for (let j = 0; j <= 6; j++) seg.push(curve.getPointAt(t0 + (t1 - t0) * j / 6));
    K.tube(g, seg, rFn((t0 + t1) / 2), colors[i % colors.length], 10, 8);
  }
  return curve;
}

export function buildScarfC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const segs = 14;
  for (let i = 0; i < segs; i++) {
    const t = K.add(g, K.tor(r * 1.02, r * 0.24, 8, 6, TAU / segs + 0.02), i % 3 ? KN.rose : KN.mustard, 0, r * 0.04, 0);
    t.rotation.set(Math.PI / 2, 0, (i / segs) * TAU);
  }
  const knot = K.V(-r * 0.3, -r * 0.1, r * 1.08);
  K.add(g, K.sph(r * 0.27, 18, 14), KN.roseDk, knot.x, knot.y, knot.z).scale.set(1, 0.9, 0.8);
  [[[-0.18, 0.70, 0.80], [-0.12, 0.45, 0.95], [-0.08, 0.16, 1.0]], [[-0.34, 0.66, 0.76], [-0.32, 0.40, 0.90], [-0.30, 0.12, 0.95]]].forEach((dirs, j) => {
    const pts = [knot.clone(), ...dirs.map(d => surfLocal(THREE, k, k.neck, d, 1.1 + j * 0.02))];
    const c = stripedTube(K, g, pts, () => r * 0.13, [KN.rose, KN.rose, KN.mustard], 9);
    const e = c.getPointAt(1);
    pom(K, g, r * 0.15, KN.cream, e.x, e.y - r * 0.1, e.z + r * 0.02, 7);
  });
  flatten(THREE, g);
}

function packFrame(K, g, k, k0, lift = {}, dk = 0.5) {
  const c = backFront(k, packY(k0) + (lift[tailType(k0.tail)] || 0)), f = K.grp(g, 0, c.y, c.z);
  f.rotation.x = 0.08;
  const inner = K.grp(f); inner.scale.z = dk;
  return inner;
}

function packStraps(THREE, g, k, h, f, pts, color) {
  f.parent.updateMatrix(); f.updateMatrix();
  const M = f.matrix.clone().premultiply(f.parent.matrix);
  pts.forEach((p, i) => {
    const s = i ? 1 : -1, p0 = p.clone().applyMatrix4(M);
    const path = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, path, k.R * 0.04, h.clay(color), 28, 6));
  });
}

function yarnBall(K, p, r, c, cDk, x, y, z, seed = 1) {
  const b = K.grp(p, x, y, z);
  K.add(b, K.sph(r, 20, 14), c);
  for (let i = 0; i < 6; i++) {
    const t = K.add(b, K.tor(r * 1.0, r * 0.07, 5, 28), i % 2 ? cDk : c);
    t.rotation.set(seed * 0.7 + i * 1.1, seed + i * 0.6, i * 0.9);
  }
  return b;
}

function needle(K, p, a, b, r, c, bead) {
  const A = K.V(...a), B = K.V(...b), d = B.clone().sub(A);
  const m = K.add(p, K.cyl(r, r * 0.6, d.length(), 8), c, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(K.V(0, 1, 0), d.normalize());
  K.add(p, K.sph(r * 2.2, 10, 8), bead, B.x, B.y, B.z);
}

export function buildYarnPackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const br = R * 0.25, bh = R * 0.26, cz = -R * 0.28;
  K.add(f, K.cyl(br, br * 0.86, bh, 24), KN.wicker, 0, 0, cz);
  for (let i = 0; i < 4; i++) K.add(f, K.tor(br * (0.88 + 0.12 * (i + 0.5) / 4), R * 0.022, 5, 28), i % 2 ? KN.wickerDk : KN.wicker, 0, -bh / 2 + (i + 0.5) * bh / 4, cz).rotation.x = Math.PI / 2;
  K.add(f, K.tor(br * 1.0, R * 0.035, 6, 28), KN.wickerDk, 0, bh / 2, cz).rotation.x = Math.PI / 2;
  yarnBall(K, f, R * 0.13, KN.rose, KN.roseDk, -R * 0.1, bh / 2 + R * 0.04, cz + R * 0.06, 1);
  yarnBall(K, f, R * 0.12, KN.cream, KN.oat, R * 0.11, bh / 2 + R * 0.03, cz + R * 0.04, 2);
  yarnBall(K, f, R * 0.11, KN.mustard, KN.mustardDk, 0, bh / 2 + R * 0.06, cz - R * 0.1, 3);
  needle(K, f, [-R * 0.02, bh / 2, cz], [-R * 0.24, bh / 2 + R * 0.2, cz - R * 0.04], R * 0.014, KN.woodDk, KN.rose);
  needle(K, f, [R * 0.02, bh / 2, cz], [R * 0.26, bh / 2 + R * 0.17, cz - R * 0.04], R * 0.014, KN.woodDk, KN.rose);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.18, R * 0.1, -R * 0.06), K.V(R * 0.18, R * 0.1, -R * 0.06)], KN.wickerDk);
  flatten(THREE, g);
}

export function buildYarnPackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, { puff: 0.1, curl: 0.22, long: 0.05 });
  const br = R * 0.25, cz = -R * 0.28;
  yarnBall(K, f, br, KN.mustard, KN.mustardDk, 0, 0, cz, 0.4);
  needle(K, f, [-R * 0.16, -R * 0.1, cz - R * 0.1], [R * 0.3, R * 0.26, cz - R * 0.02], R * 0.018, KN.woodDk, KN.cream);
  needle(K, f, [R * 0.16, -R * 0.1, cz - R * 0.1], [-R * 0.3, R * 0.24, cz - R * 0.02], R * 0.018, KN.woodDk, KN.cream);
  K.tube(f, [K.V(br * 0.7, -br * 0.55, cz - br * 0.6), K.V(br * 1.1, -br * 0.6, cz - br * 0.3), K.V(br * 1.25, -br * 0.3, cz - br * 0.1), K.V(br * 1.45, -br * 0.45, cz)], R * 0.025, KN.mustardDk, 20, 6);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.18, R * 0.1, -R * 0.06), K.V(R * 0.18, R * 0.1, -R * 0.06)], KN.roseDk);
  flatten(THREE, g);
}

export function buildYarnPackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, { puff: 0.08 });
  const cz = -R * 0.22;
  const sackGeo = ribbed(lathe(K, [[R * 0.001, -R * 0.24], [R * 0.18, -R * 0.22], [R * 0.27, -R * 0.08], [R * 0.27, R * 0.06], [R * 0.2, R * 0.17], [R * 0.13, R * 0.2]], 40), 18, 0.04);
  const sack = K.add(f, sackGeo, KN.rose, 0, 0, cz); sack.scale.set(1, 1, 0.68);
  const ruf = K.add(f, ribbed(lathe(K, [[R * 0.12, R * 0.2], [R * 0.17, R * 0.27], [R * 0.21, R * 0.31]], 40), 10, 0.12), KN.roseDk, 0, 0, cz);
  ruf.scale.set(1, 1, 0.7);
  K.add(f, K.tor(R * 0.13, R * 0.025, 6, 24), KN.cream, 0, R * 0.2, cz).rotation.x = Math.PI / 2;
  yarnBall(K, f, R * 0.09, KN.cream, KN.oat, R * 0.02, R * 0.26, cz, 2);
  [-1, 1].forEach(s => {
    const a = K.V(s * R * 0.1, R * 0.19, cz - R * 0.09);
    K.tube(f, [a, K.V(s * R * 0.14, R * 0.08, cz - R * 0.17), K.V(s * R * 0.15, -R * 0.02, cz - R * 0.19)], R * 0.014, KN.cream, 12, 5);
    pom(K, f, R * 0.05, KN.mustard, s * R * 0.15, -R * 0.05, cz - R * 0.19, 6);
  });
  K.add(f, K.box(R * 0.14, R * 0.12, R * 0.02), KN.cream, 0, -R * 0.06, cz - R * 0.19);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.16, R * 0.1, -R * 0.06), K.V(R * 0.16, R * 0.1, -R * 0.06)], KN.roseDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, z, rotZ = 0, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

function arc(THREE, r, w, a0, len) { return new THREE.RingGeometry(r - w / 2, r + w / 2, 20, 1, a0, len); }

export function buildYarnTrailA(THREE, g, s0, o, id, h) {
  const s = s0 * 2.3, r = s * 0.26;
  flat(THREE, g, h, new THREE.CircleGeometry(r, 28), KN.mustard, o, 0, 0, 0, 0.008);
  [[0.5, [-0.5, 0, 0.5]], [-0.9, [0.1]]].forEach(([rot, ds]) => ds.forEach(d => {
    const L = 2 * Math.sqrt(r * r - (d * r) ** 2) * 0.9, geo = new THREE.PlaneGeometry(L, s * 0.03);
    geo.translate(0, d * r, 0); geo.rotateZ(rot);
    flat(THREE, g, h, geo, KN.mustardDk, o, 0, 0, 0, rot > 0 ? 0.009 : 0.0095);
  }));
  const t1 = arc(THREE, s * 0.1, s * 0.035, Math.PI, Math.PI); t1.translate(-r - s * 0.1, 0, 0);
  const t2 = arc(THREE, s * 0.1, s * 0.035, 0, Math.PI); t2.translate(-r - s * 0.3, 0, 0);
  [t1, t2].forEach(geo => flat(THREE, g, h, geo, KN.mustardDk, o, 0, 0, Math.PI / 2, 0.009));
}

export function buildYarnTrailB(THREE, g, s0, o, id, h) {
  const s = s0 * 2.3, w = s * 0.075, L = s * 0.2;
  [-1, 0, 1].forEach(row => [-0.5, 0.5].forEach(col => {
    [-1, 1].forEach(side => {
      const geo = new THREE.PlaneGeometry(w, L); geo.rotateZ(side * 0.55);
      geo.translate(col * s * 0.26 + side * L * 0.25, row * s * 0.2, 0);
      flat(THREE, g, h, geo, row ? KN.rose : KN.roseDk, o, 0, 0, Math.PI / 2, 0.008 + (side > 0 ? 0.001 : 0));
    });
  }));
}

export function buildYarnTrailC(THREE, g, s0, o, id, h) {
  const s = s0 * 2.4, sh = new THREE.Shape();
  sh.moveTo(-s * 0.18, -s * 0.28);
  sh.lineTo(-s * 0.2, s * 0.1);
  sh.bezierCurveTo(-s * 0.2, s * 0.34, s * 0.16, s * 0.34, s * 0.16, s * 0.1);
  sh.lineTo(s * 0.17, -s * 0.28);
  sh.closePath();
  const th = new THREE.Shape();
  th.absellipse(0, 0, s * 0.07, s * 0.12, 0, TAU);
  const thumb = new THREE.ShapeGeometry(th, 16); thumb.rotateZ(0.6); thumb.translate(s * 0.2, -s * 0.06, 0);
  flat(THREE, g, h, new THREE.ShapeGeometry(sh, 16), KN.rose, o, 0, 0, Math.PI / 2, 0.008);
  flat(THREE, g, h, thumb, KN.rose, o, 0, 0, Math.PI / 2, 0.008);
  const cuffG = new THREE.PlaneGeometry(s * 0.4, s * 0.12); cuffG.translate(0, -s * 0.3, 0);
  flat(THREE, g, h, cuffG, KN.cream, o, 0, 0, Math.PI / 2, 0.009);
  const dot = new THREE.CircleGeometry(s * 0.05, 14); dot.translate(-s * 0.02, s * 0.05, 0);
  flat(THREE, g, h, dot, KN.mustard, o, 0, 0, Math.PI / 2, 0.01);
}

export const VARIANTS = {
  kn_beanie: {
    slot: 'head', name: '털모자', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '꽈배기 방울 털모자', note: '겨자색 굵은 꽈배기 줄 일곱 · 골지 접단 · 크림 큰 방울', build: buildBeanieA },
    B: { name: '늘어진 장미 털모자', note: '뒤로 축 늘어진 장미색 모자 · 가로 코 줄 · 옆에 크림 뜨개 꽃', build: buildBeanieB },
    C: { name: '꼬깔 줄무늬 털모자', note: '크림·장미 줄무늬 꼬리가 뒤로 휘어 · 끝에 겨자 방울', build: buildBeanieC },
    REF: { name: '방울 뜨개 모자', note: '출시된 겨울 준비 모자 (겹치지 않는지 비교)', ref: 'wp_pompom_hat' },
  },
  kn_scarf: {
    slot: 'neck', name: '목도리', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '꽈배기 밧줄 목도리', note: '두 가닥 꼰 굵은 겨자 목도리 · 앞으로 한 가닥 · 크림 술', build: buildScarfA },
    B: { name: '골지 넥워머', note: '끝 없는 두툼한 크림 통 목도리 · 세로 골 · 장미 줄 · 나무 단추 둘', build: buildScarfB },
    C: { name: '매듭 방울 목도리', note: '장미 목도리를 앞에서 묶어 · 둥근 꼬리 둘 끝에 크림 방울', build: buildScarfC },
    REF: { name: '손뜨개 겨울 목도리', note: '출시된 겨울 준비 목도리 (비교용)', ref: 'wp_knit_scarf' },
  },
  kn_yarn_pack: {
    slot: 'back', cols: 'pack', name: '털실 바구니 배낭', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '등 바구니에 털실 셋', note: '작은 등나무 바구니 · 장미·크림·겨자 털실 · 대바늘 둘', build: buildYarnPackA },
    B: { name: '커다란 털실 뭉치', note: '겨자 털실 공 하나를 통째로 · 대바늘 X자 · 늘어진 실 끝', build: buildYarnPackB },
    C: { name: '뜨개 복주머니', note: '장미색 골지 주머니 · 주름 입구 · 크림 털실 · 방울 끈', build: buildYarnPackC },
    REF2: { name: '장작 바구니', note: '출시된 겨울 준비 배낭 (비교용)', ref: 'wp_firewood', anchor: 'back' },
  },
  kn_yarn_trail: {
    slot: 'trail', name: '털실 발자국', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '털실 공과 꼬불 실', note: '겨자 털실 공 · 감긴 줄 · S자 실 꼬리', build: buildYarnTrailA },
    B: { name: '뜨개 코 무늬', note: '장미색 V자 코 두 줄 세 단 (메리야스뜨기)', build: buildYarnTrailB },
    C: { name: '벙어리장갑', note: '장미 벙어리장갑 · 크림 손목 · 겨자 점', build: buildYarnTrailC },
    REF: { name: '털장화 발자국', note: '출시된 겨울 준비 발자국 (비교용)', ref: 'wp_boot_trail' },
  },
};
