import { DOME_BOT } from '../../js/cosmetics/anchors.js';
import { tubeAlong, backFront, withAnchors, flatten } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn, strapsFrom } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt, pushOut } from '../../js/cosmetics/art-forest-pick.js';

export const DS = Object.freeze({
  pink: 0xff7398, pinkLt: 0xff98b0, pinkDk: 0xe94f78,
  berry: 0xf03a5a, berryDk: 0xc8304c,
  cream: 0xffcadc,
  mint: 0x86e3c3, mintDk: 0x4cc79e,
  butter: 0xffd75a,
  leaf: 0x5cc96a, leafDk: 0x3aa850,
  ink: 0x2b1d1a, blush: 0xff8fa0,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 18, b = 12) => new THREE.SphereGeometry(r, a, b),
    cyl: (a, b, hh, s = 24) => new THREE.CylinderGeometry(a, b, hh, s),
    cone: (r, hh, s = 12) => new THREE.ConeGeometry(r, hh, s),
    tor: (r, t, rs = 10, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function face(K, p, s) {
  [-1, 1].forEach(x => {
    K.add(p, K.sph(s * 0.12, 10, 8), DS.ink, x * s * 0.32, s * 0.04, 0).scale.set(1, 1.15, 0.45);
    K.add(p, K.sph(s * 0.12, 10, 8), DS.blush, x * s * 0.58, -s * 0.15, -s * 0.02).scale.set(1.3, 0.7, 0.3);
  });
  K.add(p, K.tor(s * 0.08, s * 0.025, 5, 10, Math.PI), DS.ink, 0, -s * 0.06, 0).rotation.z = Math.PI;
}

const SB = [[0, 0], [0.16, 0.08], [0.32, 0.26], [0.45, 0.5], [0.5, 0.7], [0.44, 0.88], [0.24, 0.98], [0, 1]];
const sbR = t => {
  for (let i = 0; i < SB.length - 1; i++) if (t <= SB[i + 1][1]) return SB[i][0] + (SB[i + 1][0] - SB[i][0]) * (t - SB[i][1]) / (SB[i + 1][1] - SB[i][1]);
  return 0;
};

function strawberry(K, p, s, x, y, z, rot = [0, 0, 0]) {
  const g = K.grp(p, x, y, z); g.rotation.set(...rot);
  K.add(g, new K.THREE.LatheGeometry(SB.map(([r, t]) => new K.THREE.Vector2(r * s, t * s)), 20), DS.berry);
  [[0.36, 5], [0.62, 6]].forEach(([t, n], ri) => {
    for (let i = 0; i < n; i++) {
      const a = (i + ri * 0.5) / n * TAU, rr = sbR(t) * s * 0.99;
      K.add(g, K.sph(s * 0.035, 6, 4), DS.butter, Math.cos(a) * rr, t * s, Math.sin(a) * rr).scale.set(1, 1.4, 1);
    }
  });
  for (let i = 0; i < 5; i++) {
    const lg = K.grp(g, 0, s * 0.97, 0); lg.rotation.y = i / 5 * TAU;
    const lf = K.add(lg, K.sph(s * 0.2, 10, 6), DS.leaf, s * 0.2, 0, 0);
    lf.scale.set(1, 0.2, 0.5); lf.rotation.z = -0.3;
  }
  K.add(g, K.cyl(s * 0.04, s * 0.05, s * 0.2, 6), DS.leafDk, 0, s * 1.06, 0);
  return g;
}

function macaron(K, p, r, shell, fill) {
  const g = K.grp(p);
  [-1, 1].forEach(s => {
    K.add(g, K.sph(r, 24, 12), shell, 0, 0, s * r * 0.3).scale.set(1, 1, 0.38);
    K.add(g, K.tor(r * 0.88, r * 0.09, 8, 28), shell, 0, 0, s * r * 0.13);
  });
  K.add(g, K.cyl(r * 0.84, r * 0.84, r * 0.26, 24), fill).rotation.x = Math.PI / 2;
  return g;
}

function bow(K, p, s, c, knot) {
  const b = K.grp(p);
  [-1, 1].forEach(x => {
    const lp = K.add(b, K.sph(s * 0.5, 16, 10), c, x * s * 0.5, s * 0.04, 0);
    lp.scale.set(1, 0.62, 0.36); lp.rotation.z = x * 0.28;
    const tl = K.add(b, K.sph(s * 0.36, 12, 8), c, x * s * 0.24, -s * 0.42, -s * 0.03);
    tl.scale.set(0.5, 1, 0.22); tl.rotation.z = x * 0.42;
  });
  K.add(b, K.sph(s * 0.2, 12, 8), knot, 0, s * 0.02, s * 0.04).scale.set(1, 1.1, 0.8);
  return b;
}

const headR = (HR, y) => Math.sqrt(Math.max(0, HR * HR - y * y));

export function buildCakeHatA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, yb = DOME_BOT * HR, yt = HR * 1.18;
  const shape = y => { const t = (y - yb) / (yt - yb); return Math.max(headR(HR, y) * 1.07, HR * 0.95 * Math.sqrt(Math.max(0, 1 - t * t))); };
  const pts = Array.from({ length: 13 }, (_, i) => { const y = yb + (yt - yb) * i / 12; return new THREE.Vector2(Math.max(0.0005, shape(y)), y); });
  K.add(g, new THREE.LatheGeometry(pts, 32), DS.berry);
  const br = shape(yb + HR * 0.06);
  const brim = K.add(g, K.tor(br, HR * 0.11, 12, 40), DS.pinkLt, 0, yb + HR * 0.06, 0);
  brim.rotation.x = Math.PI / 2; brim.scale.z = 1.25;
  [[0.36, 9], [0.6, 8], [0.8, 5]].forEach(([t, n], ri) => {
    const y = yb + HR * 0.2 + (yt - yb - HR * 0.2) * t, rr = shape(y);
    for (let i = 0; i < n; i++) {
      const a = (i + ri * 0.5) / n * TAU;
      const s = K.add(g, K.sph(HR * 0.04, 8, 6), DS.butter, Math.cos(a) * rr, y, Math.sin(a) * rr);
      s.scale.set(0.8, 1.3, 0.8);
    }
  });
  for (let i = 0; i < 5; i++) {
    const lg = K.grp(g, 0, yt - HR * 0.03, 0); lg.rotation.y = i / 5 * TAU + 0.3;
    const lf = K.add(lg, K.sph(HR * 0.3, 14, 8), DS.leaf, HR * 0.24, -HR * 0.03, 0);
    lf.scale.set(1, 0.16, 0.5); lf.rotation.z = -0.36;
  }
  const st = K.add(g, K.cyl(HR * 0.05, HR * 0.065, HR * 0.24, 10), DS.leafDk, HR * 0.03, yt + HR * 0.08, 0);
  st.rotation.z = -0.35;
  flatten(THREE, g);
}

export function buildCakeHatB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const top = K.grp(g, 0, HR * 0.82, -HR * 0.06); top.rotation.set(-0.12, 0, 0.22);
  const rb = HR * 1.1;
  K.add(top, K.sph(rb, 36, 18), DS.pink).scale.set(1, 0.36, 1);
  K.add(top, K.tor(rb * 0.86, HR * 0.07, 8, 40), DS.pinkDk, 0, -HR * 0.1, 0).rotation.x = Math.PI / 2;
  K.add(top, K.cone(HR * 0.07, HR * 0.14, 10), DS.pinkDk, 0, rb * 0.36 + HR * 0.04, 0);
  strawberry(K, top, HR * 0.34, rb * 0.7, rb * 0.08, rb * 0.55, [0.9, 0.9, -0.5]);
  flatten(THREE, g);
}

export function buildCakeHatC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const band = K.grp(g); band.rotation.x = 0.42;
  K.add(band, K.tor(HR * 1.08, HR * 0.075, 10, 40, Math.PI), DS.pink);
  const at = arcPt(THREE, k, 0.62, 1.12);
  const w = K.grp(band, at.x, at.y, at.z + HR * 0.05); w.rotation.set(0.1, 0.25, 0.62);
  bow(K, w, HR * 0.8, DS.pinkLt, DS.pinkDk);
  strawberry(K, w, HR * 0.34, 0, -HR * 0.12, HR * 0.1, [0.25, 0, 0]);
  flatten(THREE, g);
}

export function buildMacaronBroochA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const ch = K.add(g, K.tor(r * 1.02, r * 0.075, 10, 48), DS.pink, 0, r * 0.04, 0);
  ch.rotation.x = Math.PI / 2; ch.scale.z = 1.35;
  const w = new THREE.Group();
  bow(K, w, r * 0.66, DS.pinkLt, DS.pinkDk);
  K.add(w, K.tor(r * 0.05, r * 0.018, 6, 12), DS.butter, 0, -r * 0.2, r * 0.06);
  const m = macaron(K, w, r * 0.26, DS.mint, DS.cream); m.position.set(0, -r * 0.46, r * 0.06);
  stickOn(THREE, k, g, w, K.V(0, -r * 0.22, r), 1.13);
  flatten(THREE, g);
}

export function buildMacaronBroochB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const ch = K.add(g, K.tor(r * 1.03, r * 0.06, 8, 48), DS.cream, 0, r * 0.02, 0);
  ch.rotation.x = Math.PI / 2; ch.scale.z = 1.4;
  [-1, 1].forEach(s => {
    const f = new THREE.Group();
    K.add(f, K.sph(r * 0.4, 22, 12), DS.cream).scale.set(1, 0.72, 0.14);
    K.add(f, K.tor(r * 0.4, r * 0.035, 6, 32), DS.pink, 0, 0, -r * 0.01).scale.set(1, 0.72, 1);
    f.rotation.z = s * 0.5;
    const p = stickOn(THREE, k, g, f, K.V(s * r * 0.36, -r * 0.3, r), 1.06);
    p.rotateZ(s * 0.5);
  });
  const m = new THREE.Group(); macaron(K, m, r * 0.2, DS.mint, DS.cream);
  stickOn(THREE, k, g, m, K.V(0, -r * 0.14, r), 1.18);
  flatten(THREE, g);
}

export function buildMacaronBroochC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const ch = K.add(g, K.tor(r * 1.0, r * 0.15, 10, 48), DS.pink, 0, r * 0.02, 0);
  ch.rotation.x = Math.PI / 2; ch.scale.z = 1.1;
  const ws = [1.05, 0.72, 0.4];
  const pts = [-0.08, -0.36, -0.62, -0.86].map(y => pushOut(THREE, k, K.V(0, y * r, r), 1.1));
  for (let i = 0; i < 3; i++) {
    const a = pts[i], b = pts[i + 1], L = a.distanceTo(b);
    const m = K.add(g, new THREE.BoxGeometry(r * ws[i], r * 0.07, L * 1.08), DS.pink, 0, 0, 0, true);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b);
    [[-0.26, -0.1], [0.26, 0.2]].slice(0, i < 2 ? 2 : 0).forEach(([x, z]) => {
      [-1, 1].forEach(sy => K.add(m, K.sph(r * 0.07, 10, 6), DS.cream, x * r * ws[i], sy * r * 0.035, z * L).scale.set(1, 0.35, 1));
    });
  }
  K.add(g, K.cone(r * 0.1, r * 0.14, 4), DS.pink, pts[3].x, pts[3].y - r * 0.03, pts[3].z).rotation.x = Math.PI;
  const t = new THREE.Group(); macaron(K, t, r * 0.24, DS.mint, DS.cream);
  stickOn(THREE, k, g, t, K.V(0, -r * 0.12, r), 1.2);
  flatten(THREE, g);
}

function clearZ(k, y0, y1, pad = 0.03) {
  let z = Infinity;
  for (let i = 0; i <= 10; i++) z = Math.min(z, backFront(k, y0 + (y1 - y0) * i / 10, pad).z);
  return z;
}

function packStraps(THREE, g, k, h, y, zf, sx, color) {
  strapsFrom(THREE, g, k, h, [-1, 1].map(x => new THREE.Vector3(x * sx, y, zf + k.R * 0.01)), color);
}

export function buildCupcakePackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R, y0 = 1.1, D = 0.36;
  const rb = R * 0.33, rt = R * 0.44, H = R * 0.44;
  const z = clearZ(k, y0, y0 + 1.1);
  const pack = K.grp(g, 0, backFront(k, y0).y, z - rt * 1.1 * D); pack.scale.z = D;
  const prof = [[0, 0], [rb * 0.85, 0], [rb, H * 0.1], [rt, H], [0, H]];
  K.add(pack, new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 32), DS.mint);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, tilt = Math.atan2(rt - rb, H * 0.9), ra = (rt + rb) / 2;
    const st = K.add(pack, K.cyl(R * 0.022, R * 0.022, H * 0.86, 6), DS.mintDk, Math.cos(a) * ra, H * 0.53, Math.sin(a) * ra);
    st.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
  }
  K.add(pack, K.sph(rt * 1.08, 32, 16), DS.pinkLt, 0, H + R * 0.02, 0).scale.set(1, 0.72, 1);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; K.add(pack, K.sph(rt * 0.2, 12, 8), DS.pinkLt, Math.cos(a) * rt * 1.0, H + R * 0.01, Math.sin(a) * rt * 1.0); }
  K.add(pack, K.sph(R * 0.11, 16, 12), DS.berry, 0, H + rt * 0.78 + R * 0.1, 0);
  pack.add(tubeAlong(THREE, [K.V(0, H + rt * 0.78 + R * 0.2, 0), K.V(R * 0.03, H + rt * 0.78 + R * 0.3, 0), K.V(R * 0.1, H + rt * 0.78 + R * 0.36, 0)], R * 0.015, h.clay(DS.leafDk), 8, 5));
  const f = K.grp(pack, 0, H * 0.48, -(rt + rb) / 2 - R * 0.01); f.rotation.y = Math.PI; face(K, f, R * 0.34);
  packStraps(THREE, g, k, h, pack.position.y + R * 0.3, z, R * 0.24, DS.mintDk);
  flatten(THREE, g);
}

export function buildCupcakePackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R, y0 = 1.16, D = 0.33;
  const rr = R * 0.44, H = R * 0.42;
  const z = clearZ(k, y0, y0 + 0.95);
  const pack = K.grp(g, 0, backFront(k, y0).y, z - rr * D); pack.scale.z = D;
  K.add(pack, K.cyl(rr, rr, H, 32), DS.pink, 0, H / 2, 0);
  K.add(pack, K.tor(rr * 0.94, R * 0.06, 10, 36), DS.pink, 0, R * 0.04, 0).rotation.x = Math.PI / 2;
  K.add(pack, K.cyl(rr * 1.01, rr * 1.01, H * 0.12, 32), DS.berry, 0, H * 0.48, 0);
  K.add(pack, K.sph(rr * 1.02, 32, 12, 0, TAU, 0, Math.PI / 2), DS.cream, 0, H, 0).scale.y = 0.3;
  K.add(pack, K.tor(rr * 0.96, R * 0.06, 10, 36), DS.cream, 0, H, 0).rotation.x = Math.PI / 2;
  [0.2, 1.3, 2.4, 3.5, 4.6, 5.6].forEach((a, i) => {
    const L = R * (0.08 + 0.05 * (i % 2));
    K.add(pack, new THREE.CapsuleGeometry(R * 0.045, L, 4, 10), DS.cream, Math.cos(a) * rr * 1.0, H - L / 2, Math.sin(a) * rr * 1.0);
  });
  strawberry(K, pack, R * 0.34, 0, H + R * 0.08, 0, [0, 0.4, 0.1]);
  packStraps(THREE, g, k, h, pack.position.y + R * 0.28, z, R * 0.24, DS.pink);
  flatten(THREE, g);
}

export function buildCupcakePackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R, y0 = 1.12, r = R * 0.5, D = 0.46;
  const z = clearZ(k, y0, y0 + 1.0);
  const pack = K.grp(g, 0, backFront(k, y0).y + r * 0.95, z - r * 0.68 * D); pack.scale.z = D;
  macaron(K, pack, r, DS.pink, DS.cream);
  const f = K.grp(pack, 0, -r * 0.05, -r * 0.67); f.rotation.y = Math.PI; face(K, f, r * 0.8);
  const b = bow(K, pack, R * 0.32, DS.mint, DS.mintDk); b.position.set(r * 0.55, r * 0.72, -r * 0.1); b.rotation.set(0, Math.PI, -0.6);
  packStraps(THREE, g, k, h, pack.position.y + R * 0.08, z, R * 0.24, DS.pinkDk);
  flatten(THREE, g);
}

function heart(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -s);
  sh.bezierCurveTo(s * 0.9, -s * 0.3, s * 1.1, s * 0.55, s * 0.5, s * 0.7);
  sh.bezierCurveTo(s * 0.2, s * 0.8, 0, s * 0.55, 0, s * 0.4);
  sh.bezierCurveTo(0, s * 0.55, -s * 0.2, s * 0.8, -s * 0.5, s * 0.7);
  sh.bezierCurveTo(-s * 1.1, s * 0.55, -s * 0.9, -s * 0.3, 0, -s);
  return sh;
}

function flatShape(THREE, g, h, shape, c, o, x, y, z, rotY = 0) {
  const m = h.put(g, new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotY);
  return m;
}

function flatDisc(THREE, g, h, r, c, o, x, y, z, sx = 1, sz = 1) {
  const m = h.put(g, new THREE.Mesh(new THREE.CircleGeometry(r, 20), h.film(c, o)), x, y, z, false);
  m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1);
  return m;
}

function flatSprinkle(THREE, g, h, s, o, x, z, c, a) {
  const m = h.put(g, new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.075, s * 0.3, 2, 8), h.film(c, o)), x, 0.012, z, false);
  m.rotation.set(Math.PI / 2, 0, a);
}

export function buildCreamTrailA(THREE, g, s, o, id, h) {
  flatShape(THREE, g, h, heart(THREE, s * 0.8), DS.pink, o, 0, 0.007, 0, Math.PI);
  flatShape(THREE, g, h, heart(THREE, s * 0.28), DS.cream, o, -s * 0.2, 0.009, -s * 0.2, Math.PI + 0.3);
  [[0.95, 0.15, DS.mint, 0.4], [-0.85, 0.45, DS.butter, 1.3], [0.35, -1.0, DS.mint, 2.2]]
    .forEach(([x, z, c, a]) => flatSprinkle(THREE, g, h, s, o, x * s, z * s, c, a));
}

export function buildCreamTrailB(THREE, g, s, o, id, h) {
  const sb = new THREE.Shape();
  sb.moveTo(0, -0.95);
  sb.bezierCurveTo(0.55, -0.62, 0.78, 0.15, 0.58, 0.5);
  sb.bezierCurveTo(0.38, 0.78, -0.38, 0.78, -0.58, 0.5);
  sb.bezierCurveTo(-0.78, 0.15, -0.55, -0.62, 0, -0.95);
  const sc = s * 0.95, geo = new THREE.ShapeGeometry(sb, 14); geo.scale(sc, sc, 1);
  h.put(g, new THREE.Mesh(geo, h.film(DS.berry, o)), 0, 0.007, 0, false).rotation.set(-Math.PI / 2, 0, Math.PI);
  [[-0.28, -0.05], [0.28, -0.05], [0, 0.25], [-0.16, -0.42], [0.16, -0.42], [0, -0.68]].forEach(([x, y]) => flatDisc(THREE, g, h, s * 0.06, DS.butter, o, x * sc, 0.009, -y * sc, 0.7, 1));
  const st = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i / 10 * TAU, rr = i % 2 ? 0.14 : 0.36;
    if (i) st.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else st.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const lg = new THREE.ShapeGeometry(st); lg.scale(sc, sc, 1);
  h.put(g, new THREE.Mesh(lg, h.film(DS.leaf, o)), 0, 0.011, -0.62 * sc, false).rotation.x = -Math.PI / 2;
}

export function buildCreamTrailC(THREE, g, s, o, id, h) {
  flatDisc(THREE, g, h, s * 0.46, DS.pink, o, 0, 0.007, s * 0.12, 1.1, 0.9);
  [[-0.62, -0.42], [-0.22, -0.72], [0.22, -0.72], [0.62, -0.42]].forEach(([x, z]) => flatDisc(THREE, g, h, s * 0.2, DS.pink, o, x * s, 0.007, z * s, 0.9, 1.1));
  flatShape(THREE, g, h, heart(THREE, s * 0.24), DS.cream, o, 0, 0.009, s * 0.12, Math.PI);
}

export const VARIANTS = {
  ds_cake_hat: {
    slot: 'head', name: '딸기 케이크 모자', rec: 'A',
    A: { name: '딸기 니트 비니', note: '머리에 꼭 맞는 딸기색 니트 · 말아 올린 분홍 테 · 노란 씨앗 점 · 초록 잎 꼭지', build: buildCakeHatA },
    B: { name: '분홍 베레 + 딸기 핀', note: '살짝 기운 분홍 베레 · 진분홍 테 · 옆에 딸기 핀 하나', build: buildCakeHatB },
    C: { name: '딸기 리본 머리띠', note: '분홍 머리띠 · 옆에 큰 연분홍 리본 · 가운데 딸기', build: buildCakeHatC },
  },
  ds_macaron_brooch: {
    slot: 'neck', name: '마카롱 목걸이', rec: 'A',
    A: { name: '리본 초커 + 마카롱 참', note: '분홍 초커 · 연분홍 리본 · 아래 민트 마카롱이 달랑', build: buildMacaronBroochA },
    B: { name: '크림 칼라 + 마카롱 브로치', note: '분홍 테두리 크림 둥근 칼라 · 가운데 민트 마카롱', build: buildMacaronBroochB },
    C: { name: '분홍 반다나 + 마카롱 매듭', note: '크림 물방울 분홍 반다나 · 매듭 자리에 민트 마카롱', build: buildMacaronBroochC },
  },
  ds_cupcake_pack: {
    slot: 'back', cols: 'back2', name: '컵케이크 배낭', rec: 'A',
    A: { name: '민트 컵케이크 배낭', note: '말랑한 민트 주름 컵 + 웃는 얼굴 · 동그란 분홍 크림 뚜껑 · 체리 하나', build: buildCupcakePackA },
    B: { name: '딸기 케이크 가방', note: '연분홍 둥근 케이크 · 가운데 딸기잼 줄 · 크림이 흘러내린 뚜껑 · 큰 딸기', build: buildCupcakePackB },
    C: { name: '웃는 마카롱 배낭', note: '큰 분홍 마카롱 + 웃는 얼굴 · 크림 속 · 귀퉁이 민트 리본', build: buildCupcakePackC },
  },
  ds_cream_trail: {
    slot: 'trail', name: '크림 발자국', rec: 'A',
    A: { name: '하트 스프링클', note: '분홍 하트 + 작은 크림 하트 · 민트·노랑 스프링클 셋', build: buildCreamTrailA },
    B: { name: '딸기 도장', note: '빨간 딸기 모양 · 노란 씨앗 여섯 · 초록 꼭지', build: buildCreamTrailB },
    C: { name: '분홍 젤리 발바닥', note: '분홍 발바닥 도장 · 가운데 크림 하트', build: buildCreamTrailC },
  },
};
