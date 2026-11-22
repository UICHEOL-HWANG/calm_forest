import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { packY } from './art-dessert-pick.js';
import { DOME_BOT } from './anchors.js';

export const KN = Object.freeze({
  cream: 0xe6d6b8, oat: 0xcdb48c,
  mustard: 0xd29a3a, mustardDk: 0xa87828,
  rose: 0xc8707a, roseDk: 0x9c4c58,
  wicker: 0xc49a5c, wickerDk: 0x98713f, woodDk: 0x7e5432,
});

export const BEANIE_TOP = 1.3;
export const POM_R = 0.22;
export const POM_Y = 1.36;

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

const lathe = (K, prof, seg = 40) => new K.THREE.LatheGeometry(prof.map(([x, y]) => new K.THREE.Vector2(x, y)), seg);

function cuff(K, g, HR, rk, hgt, c, ribN) {
  const y0 = DOME_BOT * HR, r0 = Math.sqrt((HR * rk) ** 2 - y0 * y0) + HR * 0.06, r1 = Math.sqrt((HR * rk) ** 2 - (y0 + hgt) ** 2) + HR * 0.05;
  K.add(g, ribbed(lathe(K, [[r0 - HR * 0.05, y0 - HR * 0.02], [r0, y0], [r0 + HR * 0.01, y0 + hgt * 0.5], [r1, y0 + hgt], [r1 - HR * 0.06, y0 + hgt + HR * 0.01]], 60), ribN, 0.035), c);
}

function crown(K, g, HR, yt, c) {
  const y0 = DOME_BOT * HR, R0 = Math.sqrt((HR * 1.08) ** 2 - y0 * y0);
  const f = y => {
    const t = Math.min(1, Math.max(0, (y - y0) / (yt - y0)));
    return Math.max(Math.sqrt(Math.max(0, HR * HR - y * y)) * 1.07, R0 * Math.sqrt(Math.max(0, 1 - t ** 2.2)));
  };
  const prof = [];
  for (let i = 0; i <= 16; i++) { const y = y0 + (yt - y0) * i / 16; prof.push([Math.max(0.0005, f(y)), y]); }
  K.add(g, lathe(K, prof, 48), c);
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
    K.tube(g, pts, rr * 0.65, c, 70, 6);
  });
}

export function buildCableBeanie(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, yt = HR * BEANIE_TOP;
  const f = crown(K, g, HR, yt, KN.mustard);
  for (let i = 0; i < 7; i++) cable(K, g, f, (i / 7) * TAU + Math.PI / 2, DOME_BOT * HR + HR * 0.26, yt - HR * 0.14, HR * 0.08, HR * 0.06, KN.mustardDk);
  cuff(K, g, HR, 1.08, HR * 0.24, KN.mustard, 34);
  pom(K, g, HR * POM_R, KN.cream, 0, HR * POM_Y, -HR * 0.02, 11);
  flatten(THREE, g);
}

function closedRope(K, g, r, y, w, rr, colors, twists) {
  const M = 120;
  colors.forEach((c, si) => {
    const pts = [];
    for (let i = 0; i < M; i++) {
      const a = (i / M) * TAU, ph = a * twists + si * TAU / colors.length, rad = r + w * Math.cos(ph);
      pts.push(K.V(Math.cos(a) * rad, y + w * Math.sin(ph), Math.sin(a) * rad));
    }
    const m = new K.THREE.Mesh(new K.THREE.TubeGeometry(new K.THREE.CatmullRomCurve3(pts, true), 240, rr, 7, true), K.h.clay(c, false));
    m.castShadow = true; g.add(m);
  });
}

function ropeAlong(K, g, pts, w, rr, colors, twists) {
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
  const t = K.grp(g, at.x, at.y, at.z);
  t.quaternion.setFromUnitVectors(K.V(0, -1, 0), dir.clone().normalize());
  K.add(t, K.sph(r * 0.7, 12, 10), c);
  K.add(t, K.cyl(r * 0.55, r * 0.95, r * 2.4, 14), c, 0, -r * 1.5, 0);
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; K.add(t, K.cyl(r * 0.16, r * 0.12, r * 0.9, 5), c, Math.cos(a) * r * 0.7, -r * 3.0, Math.sin(a) * r * 0.7); }
}

export function buildRopeScarf(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  closedRope(K, g, r * 1.02, r * 0.04, r * 0.15, r * 0.17, [KN.mustard, KN.mustardDk], 8);
  const pts = [[0, 0, 1], [0.30, 0.72, 0.72], [0.32, 0.50, 0.88], [0.33, 0.30, 0.96]].map(d => surfLocal(THREE, k, k.neck, d, 1.1));
  pts[0] = K.V(r * 0.34, -r * 0.16, r * 1.08);
  const c = ropeAlong(K, g, pts, r * 0.1, r * 0.13, [KN.mustard, KN.mustardDk], 3);
  tassel(K, g, c.getPointAt(1), c.getTangentAt(1), r * 0.17, KN.cream);
  flatten(THREE, g);
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

function yarnBall(K, p, r, c, cDk, x, y, z, seed) {
  const b = K.grp(p, x, y, z);
  K.add(b, K.sph(r, 20, 14), c);
  for (let i = 0; i < 6; i++) K.add(b, K.tor(r, r * 0.07, 5, 28), i % 2 ? cDk : c).rotation.set(seed * 0.7 + i * 1.1, seed + i * 0.6, i * 0.9);
}

function needle(K, p, a, b, r, c, bead) {
  const A = K.V(...a), B = K.V(...b), d = B.clone().sub(A);
  const m = K.add(p, K.cyl(r, r * 0.6, d.length(), 8), c, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(K.V(0, 1, 0), d.normalize());
  K.add(p, K.sph(r * 2.2, 10, 8), bead, B.x, B.y, B.z);
}

export function buildYarnPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0)), outer = K.grp(g, 0, c.y, c.z);
  outer.rotation.x = 0.08;
  const f = K.grp(outer); f.scale.z = 0.5;
  const br = R * 0.25, bh = R * 0.26, cz = -R * 0.28;
  K.add(f, K.cyl(br, br * 0.86, bh, 24), KN.wicker, 0, 0, cz);
  for (let i = 0; i < 4; i++) K.add(f, K.tor(br * (0.88 + 0.12 * (i + 0.5) / 4), R * 0.022, 5, 28), i % 2 ? KN.wickerDk : KN.wicker, 0, -bh / 2 + (i + 0.5) * bh / 4, cz).rotation.x = Math.PI / 2;
  K.add(f, K.tor(br, R * 0.035, 6, 28), KN.wickerDk, 0, bh / 2, cz).rotation.x = Math.PI / 2;
  yarnBall(K, f, R * 0.13, KN.rose, KN.roseDk, -R * 0.1, bh / 2 + R * 0.04, cz + R * 0.06, 1);
  yarnBall(K, f, R * 0.12, KN.cream, KN.oat, R * 0.11, bh / 2 + R * 0.03, cz + R * 0.04, 2);
  yarnBall(K, f, R * 0.11, KN.mustard, KN.mustardDk, 0, bh / 2 + R * 0.06, cz - R * 0.1, 3);
  needle(K, f, [-R * 0.02, bh / 2, cz], [-R * 0.24, bh / 2 + R * 0.2, cz - R * 0.04], R * 0.014, KN.woodDk, KN.rose);
  needle(K, f, [R * 0.02, bh / 2, cz], [R * 0.26, bh / 2 + R * 0.17, cz - R * 0.04], R * 0.014, KN.woodDk, KN.rose);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.18, R * 0.1, -R * 0.06), K.V(R * 0.18, R * 0.1, -R * 0.06)], KN.wickerDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, rotZ, y) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), 0, y, 0, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

function arc(THREE, r, w, a0, len) { return new THREE.RingGeometry(r - w / 2, r + w / 2, 20, 1, a0, len); }

export function buildYarnTrail(THREE, g, s0, o, h) {
  const s = s0 * 2.3, r = s * 0.26;
  flat(THREE, g, h, new THREE.CircleGeometry(r, 28), KN.mustard, o, 0, 0.008);
  [[0.5, [-0.5, 0, 0.5]], [-0.9, [0.1]]].forEach(([rot, ds]) => ds.forEach(d => {
    const L = 2 * Math.sqrt(r * r - (d * r) ** 2) * 0.9, geo = new THREE.PlaneGeometry(L, s * 0.03);
    geo.translate(0, d * r, 0); geo.rotateZ(rot);
    flat(THREE, g, h, geo, KN.mustardDk, o, 0, rot > 0 ? 0.009 : 0.0095);
  }));
  const t1 = arc(THREE, s * 0.1, s * 0.035, Math.PI, Math.PI); t1.translate(-r - s * 0.1, 0, 0);
  const t2 = arc(THREE, s * 0.1, s * 0.035, 0, Math.PI); t2.translate(-r - s * 0.3, 0, 0);
  [t1, t2].forEach(geo => flat(THREE, g, h, geo, KN.mustardDk, o, Math.PI / 2, 0.009));
}
