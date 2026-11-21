import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { arcPt } from './art-forest-pick.js';
import { tailType } from './anchors.js';

export const DS = Object.freeze({
  pink: 0xf2a9ba, pinkDk: 0xd98a9e,
  cream: 0xeed2d4,
  berry: 0xd9505e,
  leaf: 0x6aa86a, leafDk: 0x4f8a54,
  mint: 0x93cfb8,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 16, b = 12) => new THREE.SphereGeometry(r, a, b),
    cyl: (a, b, hh, s = 20) => new THREE.CylinderGeometry(a, b, hh, s),
    cone: (r, hh, s = 8) => new THREE.ConeGeometry(r, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

const SB = [[0, 0], [0.18, 0.08], [0.34, 0.28], [0.45, 0.52], [0.47, 0.72], [0.40, 0.88], [0.22, 0.98], [0, 1]];

function strawberry(K, p, s, color = DS.berry) {
  const g = K.grp(p);
  K.add(g, new K.THREE.LatheGeometry(SB.map(([r, t]) => new K.THREE.Vector2(r * s, t * s)), 18), color);
  for (let i = 0; i < 5; i++) {
    const lg = K.grp(g, 0, s * 0.95, 0); lg.rotation.y = i / 5 * TAU;
    const lf = K.add(lg, K.cone(s * 0.11, s * 0.34, 4), DS.leaf, s * 0.15, 0, 0);
    lf.rotation.z = -1.25; lf.scale.z = 0.45;
  }
  K.add(g, K.cyl(s * 0.035, s * 0.045, s * 0.16, 6), DS.leafDk, 0, s * 1.04, 0);
  return g;
}

function loopShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.12, s * 0.30, s * 0.46, s * 0.38, s * 0.52, s * 0.14);
  sh.bezierCurveTo(s * 0.56, -s * 0.06, s * 0.24, -s * 0.16, 0, 0);
  return sh;
}

function tailShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(-s * 0.05, 0); sh.lineTo(s * 0.05, 0);
  sh.lineTo(s * 0.16, -s * 0.36); sh.lineTo(s * 0.08, -s * 0.31); sh.lineTo(s * 0.03, -s * 0.38);
  sh.lineTo(-s * 0.05, 0);
  return sh;
}

function flatBow(K, p, s, loop, tail) {
  const THREE = K.THREE, b = K.grp(p);
  const ex = (sh, d) => {
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: s * 0.018, bevelThickness: s * 0.018, bevelSegments: 2, curveSegments: 10 });
    geo.translate(0, 0, -d / 2); return geo;
  };
  [-1, 1].forEach(x => {
    K.add(b, ex(loopShape(THREE, s), s * 0.06), loop).rotation.y = x < 0 ? Math.PI : 0;
    K.add(b, ex(tailShape(THREE, s), s * 0.04), tail, x * s * 0.03, -s * 0.02, -s * 0.03).rotation.y = x < 0 ? Math.PI : 0;
  });
  return b;
}

function macaron(K, p, r, shell, fill) {
  const g = K.grp(p);
  [-1, 1].forEach(s => {
    K.add(g, K.sph(r, 20, 10), shell, 0, s * r * 0.3, 0).scale.set(1, 0.4, 1);
    K.add(g, K.tor(r * 0.9, r * 0.08, 6, 24), shell, 0, s * r * 0.14, 0).rotation.x = Math.PI / 2;
  });
  K.add(g, K.cyl(r * 0.86, r * 0.86, r * 0.24, 20), fill);
  return g;
}

const SIDE = -0.92;

export function buildCakeHat(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * 0.06, 6, 30, Math.PI), DS.pink, 0, 0, 0, true);
  const p = arcPt(THREE, k, SIDE, 1.1).applyAxisAngle(K.V(1, 0, 0), 0.45);
  const e = K.grp(g, p.x, p.y, p.z + HR * 0.06); e.rotation.set(0.1, 0.45, SIDE * 0.7);
  flatBow(K, e, HR * 0.78, DS.pink, DS.pinkDk);
  const sb = strawberry(K, e, HR * 0.2); sb.position.set(0, -HR * 0.1, HR * 0.04);
  flatten(THREE, g);
}

export function buildMacaronBrooch(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.12, 7, 36), DS.pink, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
  const w = new THREE.Group();
  flatBow(K, w, r * 1.05, DS.pink, DS.pinkDk);
  const m = macaron(K, w, r * 0.12, DS.mint, DS.cream); m.position.z = r * 0.05; m.rotation.x = 0.9;
  stickOn(THREE, k, g, w, K.V(0, -r * 0.26, r), 1.12);
  flatten(THREE, g);
}

function roundRect(THREE, w, hh, r, topR = r) {
  const sh = new THREE.Shape(), x0 = -w / 2, y0 = -hh / 2;
  sh.moveTo(x0 + r, y0); sh.lineTo(x0 + w - r, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  sh.lineTo(x0 + w, y0 + hh - topR); sh.quadraticCurveTo(x0 + w, y0 + hh, x0 + w - topR, y0 + hh);
  sh.lineTo(x0 + topR, y0 + hh); sh.quadraticCurveTo(x0, y0 + hh, x0, y0 + hh - topR);
  sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  return sh;
}

function slab(K, p, sh, d, c, z, bev) {
  const geo = new K.THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 3, curveSegments: 16 });
  geo.translate(0, 0, -d);
  return K.add(p, geo, c, 0, 0, z);
}

function packStraps(THREE, g, k, h, f, pts, color) {
  f.updateMatrix();
  pts.forEach((p, i) => {
    const s = i ? 1 : -1, p0 = p.clone().applyMatrix4(f.matrix);
    const path = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, path, k.R * 0.042, h.clay(color), 28, 6));
  });
}

function scallopFlap(THREE, w, hh, n) {
  const sh = new THREE.Shape(), r = w / (2 * n), top = hh / 2, bot = -hh / 2 + r;
  sh.moveTo(-w / 2, bot);
  for (let i = 0; i < n; i++) { const cx = -w / 2 + r * (2 * i + 1); sh.absarc(cx, bot, r, Math.PI, TAU, false); }
  sh.lineTo(w / 2, top - w * 0.36);
  sh.quadraticCurveTo(w / 2, top, 0, top);
  sh.quadraticCurveTo(-w / 2, top, -w / 2, top - w * 0.36);
  sh.lineTo(-w / 2, bot);
  return sh;
}

export const PACK_Y = Object.freeze({ bushy: 0.74, curl: 0.86, puff: 0.66, feather: -0.2 });
export const packY = k => PACK_Y[tailType(k.tail)] ?? 0.56;

export function buildCupcakePack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0)), f = K.grp(g, 0, c.y, c.z); f.rotation.x = 0.08;
  const w = R * 0.72, hh = 0.56 * R, d = R * 0.16, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.14, w * 0.5), d, DS.pink, -R * 0.03, R * 0.04);
  const fh = hh * 0.56, fl = slab(K, f, scallopFlap(THREE, w * 1.02, fh, 5), R * 0.025, DS.cream, zf, R * 0.015);
  fl.position.y = hh / 2 - fh / 2 + R * 0.025;
  const by = hh / 2 - fh + R * 0.06;
  const b = flatBow(K, f, R * 0.36, DS.pink, DS.pinkDk); b.position.set(0, by, zf - R * 0.04);
  strawberry(K, f, R * 0.1).position.set(0, by - R * 0.05, zf - R * 0.07);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.36, -R * 0.03), K.V(w * 0.3, hh * 0.36, -R * 0.03)], DS.pinkDk);
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

export function buildCreamTrail(THREE, g, s, o, h) {
  const m = h.put(g, new THREE.Mesh(new THREE.ShapeGeometry(heart(THREE, s * 0.58), 12), h.film(DS.pink, o)), 0, 0.008, 0, false);
  m.rotation.set(-Math.PI / 2, 0, Math.PI); m.renderOrder = 8;
  [[0.62, 0.2, DS.cream, 0.5], [-0.5, -0.45, DS.mint, 2.0]].forEach(([x, z, c, a]) => {
    const sp = h.put(g, new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.05, s * 0.16, 2, 6), h.film(c, o)), x * s, 0.01, z * s, false);
    sp.rotation.set(Math.PI / 2, 0, a); sp.renderOrder = 10;
  });
}
