import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { arcPt } from './art-forest-pick.js';
import { packY } from './art-dessert-pick.js';

export const NY = Object.freeze({
  dahong: 0xe0705e, dahongDk: 0xc0564a,
  jjok: 0x5a78b0, jjokDk: 0x445e92,
  norang: 0xeac25a, norangDk: 0xc99a3a,
  yut: 0xd8b07a,
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
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

const POUCH = [[0, 0], [0.22, 0.03], [0.4, 0.14], [0.48, 0.32], [0.45, 0.5], [0.33, 0.64], [0.19, 0.72], [0.15, 0.76]];

function pouch(K, p, s, body, tie, coin) {
  const THREE = K.THREE, g = K.grp(p), b = K.grp(g); b.scale.z = 0.78;
  K.add(b, new THREE.LatheGeometry(POUCH.map(([r, t]) => new THREE.Vector2(r * s, t * s)), 20), body);
  K.add(b, K.cyl(s * 0.3, s * 0.14, s * 0.2, 16), body, 0, s * 0.86, 0);
  K.add(b, K.tor(s * 0.3, s * 0.035, 6, 20), body, 0, s * 0.96, 0).rotation.x = Math.PI / 2;
  K.add(b, K.tor(s * 0.165, s * 0.045, 6, 18), tie, 0, s * 0.75, 0).rotation.x = Math.PI / 2;
  [-1, 1].forEach(x => K.add(g, K.sph(s * 0.065, 10, 8), tie, x * s * 0.09, s * 0.68, s * 0.15));
  K.add(g, K.cyl(s * 0.1, s * 0.1, s * 0.03, 14), coin, 0, s * 0.34, s * 0.37).rotation.x = Math.PI / 2;
  return g;
}

const SIDE = -0.92;

export function buildPouchBand(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * 0.06, 6, 30, Math.PI), NY.jjok, 0, 0, 0, true);
  const ang = SIDE * 0.72, p = arcPt(THREE, k, ang, 1.1).applyAxisAngle(K.V(1, 0, 0), 0.45);
  const e = K.grp(g, p.x, p.y, p.z + HR * 0.03);
  e.rotation.set(0.1, 0.35, ang * 0.85);
  pouch(K, e, HR * 0.52, NY.dahong, NY.norang, NY.norang).position.y = HR * 0.52 * 0.08;
  flatten(THREE, g);
}

function loopShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.12, s * 0.30, s * 0.46, s * 0.38, s * 0.52, s * 0.14);
  sh.bezierCurveTo(s * 0.56, -s * 0.06, s * 0.24, -s * 0.16, 0, 0);
  return sh;
}

function stripShape(THREE, w, L) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0);
  sh.lineTo(w * 0.6, -L); sh.lineTo(-w * 0.6, -L + w * 0.7);
  sh.lineTo(-w / 2, 0);
  return sh;
}

function ex(THREE, sh, d, bev) {
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -d / 2); return geo;
}

function goreum(K, p, s, loop, tails, knot) {
  const THREE = K.THREE, g = K.grp(p), bev = s * 0.016;
  const l = K.add(g, ex(THREE, loopShape(THREE, s * 0.9), s * 0.05, bev), loop, 0, 0, s * 0.01); l.rotation.z = -0.35;
  const t1 = K.add(g, ex(THREE, stripShape(THREE, s * 0.17, s * 0.62), s * 0.035, bev), tails, -s * 0.03, 0, -s * 0.02); t1.rotation.z = -0.1;
  const t2 = K.add(g, ex(THREE, stripShape(THREE, s * 0.15, s * 0.48), s * 0.035, bev), loop, s * 0.04, 0, 0); t2.rotation.z = 0.2;
  K.add(g, K.sph(s * 0.09, 12, 8), knot, 0, 0, s * 0.035).scale.set(1.1, 1, 0.7);
  return g;
}

export function buildGoreumTie(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.12, 7, 36), NY.dahong, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
  const w = new THREE.Group(), inner = K.grp(w); inner.rotation.x = -0.35;
  goreum(K, inner, r * 0.95, NY.dahong, NY.dahongDk, NY.norang);
  stickOn(THREE, k, g, w, K.V(r * 0.3, -r * 0.24, r), 1.12);
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

function diamond(THREE, w, hh, r) {
  const sh = new THREE.Shape();
  sh.moveTo(0, hh / 2 - r); sh.quadraticCurveTo(0, hh / 2, r * 0.7, hh / 2 - r * 0.7);
  sh.lineTo(w / 2 - r * 0.7, r * 0.7); sh.quadraticCurveTo(w / 2, 0, w / 2 - r * 0.7, -r * 0.7);
  sh.lineTo(r * 0.7, -hh / 2 + r * 0.7); sh.quadraticCurveTo(0, -hh / 2, -r * 0.7, -hh / 2 + r * 0.7);
  sh.lineTo(-w / 2 + r * 0.7, -r * 0.7); sh.quadraticCurveTo(-w / 2, 0, -w / 2 + r * 0.7, r * 0.7);
  sh.lineTo(-r * 0.7, hh / 2 - r * 0.7); sh.quadraticCurveTo(0, hh / 2, 0, hh / 2 - r);
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

export function buildKitePack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0)), f = K.grp(g, 0, c.y, c.z); f.rotation.x = 0.08;
  const w = R * 0.7, hh = R * 0.56, d = R * 0.16, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.14, w * 0.5), d, NY.dahong, -R * 0.03, R * 0.04);
  const fh = hh * 0.5, fl = slab(K, f, roundRect(THREE, w, fh, R * 0.1, w * 0.5), R * 0.025, NY.dahongDk, zf, R * 0.015);
  fl.position.y = hh / 2 - fh / 2 + R * 0.02;
  const em = K.grp(f, 0, hh / 2 - fh + R * 0.02, zf - R * 0.04);
  slab(K, em, diamond(THREE, R * 0.26, R * 0.3, R * 0.025), R * 0.02, NY.norang, 0, R * 0.01);
  K.add(em, K.cyl(R * 0.035, R * 0.035, R * 0.015, 20), NY.jjok, 0, 0, -R * 0.035).rotation.x = Math.PI / 2;
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.36, -R * 0.03), K.V(w * 0.3, hh * 0.36, -R * 0.03)], NY.dahongDk);
  flatten(THREE, g);
}

function yutStick(THREE, g, h, L, rr, o, a) {
  const m = h.put(g, new THREE.Mesh(new THREE.CapsuleGeometry(rr, L, 2, 10), h.film(NY.yut, o)), 0, 0.008, 0, false);
  m.rotation.set(Math.PI / 2, 0, a); m.scale.set(1, 1, 0.15); m.renderOrder = 8;
  [-0.22, 0, 0.22].forEach(t => {
    const d = h.put(g, new THREE.Mesh(new THREE.CircleGeometry(rr * 0.42, 8), h.film(NY.dahong, o)), -Math.sin(a) * t * L, 0.011, Math.cos(a) * t * L, false);
    d.rotation.set(-Math.PI / 2, 0, 0); d.renderOrder = 11;
  });
}

export function buildYutTrail(THREE, g, s, o, h) {
  yutStick(THREE, g, h, s * 0.78, s * 0.1, o, 0.5);
  yutStick(THREE, g, h, s * 0.78, s * 0.1, o, -0.5);
}
