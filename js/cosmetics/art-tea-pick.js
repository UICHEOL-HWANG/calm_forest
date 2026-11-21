import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { arcPt } from './art-forest-pick.js';
import { packY } from './art-dessert-pick.js';

export const TC = Object.freeze({
  matcha: 0x8fb45a, matchaDk: 0x67904a, bud: 0xb4cf78,
  celadon: 0x9cc6b2, celadonDk: 0x74a390,
  woodDk: 0x8e6440, persimmon: 0xe57c48,
});

const POT_R = 0.36;

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 18, b = 14, ...rest) => new THREE.SphereGeometry(r, a, b, ...rest),
    cyl: (a, b, hh, s = 20) => new THREE.CylinderGeometry(a, b, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    lathe: (pts, s = 28) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function ex(THREE, sh, d, bev) {
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -d / 2); return geo;
}

function teaLeafShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.3, s * 0.1, s * 0.36, s * 0.62, 0, s);
  sh.bezierCurveTo(-s * 0.36, s * 0.62, -s * 0.3, s * 0.1, 0, 0);
  return sh;
}

function teaLeaf(K, p, s, c = TC.matcha, rz = 0, rib = TC.matchaDk) {
  const g = K.grp(p); g.rotation.z = rz;
  K.add(g, ex(K.THREE, teaLeafShape(K.THREE, s), s * 0.05, s * 0.025), c);
  K.add(g, K.cyl(s * 0.018, s * 0.012, s * 0.8, 5), rib, 0, s * 0.45, s * 0.05);
  return g;
}

function sprig(K, p, s) {
  const g = K.grp(p);
  teaLeaf(K, g, s, TC.matcha, 0.95).position.z = -s * 0.02;
  teaLeaf(K, g, s * 0.86, TC.matchaDk, -0.85).position.z = -s * 0.04;
  K.add(g, K.sph(s * 0.12, 14, 10), TC.bud, 0, s * 0.62, s * 0.03).scale.set(0.62, 1.35, 0.62);
  return g;
}

const SIDE = -0.92;

export function buildLeafPin(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * 0.06, 6, 30, Math.PI), TC.matchaDk, 0, 0, 0, true);
  const p = arcPt(THREE, k, SIDE, 1.1).applyAxisAngle(K.V(1, 0, 0), 0.45);
  const e = K.grp(g, p.x, p.y, p.z + HR * 0.06); e.rotation.set(0.1, 0.45, SIDE * 0.7);
  sprig(K, e, HR * 0.52).rotation.z = 0.15;
  flatten(THREE, g);
}

function teacup(K, p, s) {
  const g = K.grp(p);
  K.add(g, K.cyl(s * 0.32, s * 0.34, s * 0.12, 20), TC.celadonDk, 0, -s * 0.34, 0);
  K.add(g, K.lathe([[0, -s * 0.28], [s * 0.36, -s * 0.28], [s * 0.62, -s * 0.12], [s * 0.76, s * 0.1], [s * 0.82, s * 0.28], [s * 0.74, s * 0.28], [s * 0.6, s * 0.06], [0, -s * 0.08]], 28), TC.celadon);
  K.add(g, K.tor(s * 0.78, s * 0.045, 6, 28), TC.celadonDk, 0, s * 0.28, 0).rotation.x = Math.PI / 2;
  K.add(g, K.cyl(s * 0.68, s * 0.68, s * 0.02, 24), TC.matcha, 0, s * 0.2, 0);
  return g;
}

export function buildTeaCord(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.12, 7, 36), TC.matchaDk, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
  const w = new THREE.Group();
  K.add(w, K.tor(r * 0.07, r * 0.022, 5, 12), TC.matchaDk, 0, r * 0.08, 0);
  const c = teacup(K, w, r * 0.4); c.position.set(0, -r * 0.13, r * 0.06); c.rotation.x = 0.18;
  stickOn(THREE, k, g, w, K.V(0, -r * 0.26, r), 1.12);
  flatten(THREE, g);
}

function packStraps(THREE, g, k, h, f, pts, color) {
  f.updateMatrix();
  pts.forEach((p, i) => {
    const s = i ? 1 : -1, p0 = p.clone().applyMatrix4(f.matrix);
    const path = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, path, k.R * 0.04, h.clay(color), 28, 6));
  });
}

export function buildTeapotPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0)), f = K.grp(g, 0, c.y + R * 0.04, c.z);
  f.rotation.x = 0.08;
  const r = R * POT_R, dz = 0.3, zc = -R * 0.03 - r * dz, top = r * 0.74;
  const body = K.grp(f, 0, 0, zc); body.scale.z = dz;
  K.add(body, K.sph(r, 32, 24), TC.celadon).scale.y = 0.74;
  K.add(body, K.tor(r, r * 0.05, 6, 32), TC.celadonDk, 0, -r * 0.08, 0).rotation.x = Math.PI / 2;
  K.add(body, K.cyl(r * 0.5, r * 0.56, r * 0.1, 22), TC.celadon, 0, top - r * 0.02, 0);
  K.add(body, K.sph(r * 0.48, 22, 10, 0, TAU, 0, Math.PI / 2), TC.celadon, 0, top + r * 0.02, 0).scale.y = 0.3;
  K.add(body, K.sph(r * 0.1, 14, 10), TC.persimmon, 0, top + r * 0.15, 0);
  const sp = K.grp(f, r * 0.82, -r * 0.08, zc); sp.rotation.z = -0.85;
  K.add(sp, K.cyl(r * 0.08, r * 0.15, r * 0.5, 12), TC.celadon, 0, r * 0.22, 0);
  K.add(f, K.tor(r * 0.3, r * 0.07, 6, 18, Math.PI * 1.3), TC.celadonDk, -r * 0.92, -r * 0.02, zc).rotation.z = Math.PI * 0.35;
  const lf = K.grp(f, -r * 0.2, -r * 0.3, zc - r * 0.31); lf.rotation.y = Math.PI;
  teaLeaf(K, lf, r * 0.42, TC.matcha, 0.5);
  teaLeaf(K, lf, r * 0.34, TC.matchaDk, -0.6);
  packStraps(THREE, g, k, h, f, [K.V(-r * 0.6, r * 0.4, -R * 0.03), K.V(r * 0.6, r * 0.4, -R * 0.03)], TC.woodDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, z, rotZ, ro, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = ro;
  return m;
}

function flatLeaf(THREE, g, h, s, c, o, x, z, rot, ro) {
  flat(THREE, g, h, new THREE.ShapeGeometry(teaLeafShape(THREE, s), 10), c, o, x, z, rot, ro);
  const rib = new THREE.PlaneGeometry(s * 0.035, s * 0.7); rib.translate(0, s * 0.45, 0);
  flat(THREE, g, h, rib, TC.matchaDk, o, x, z, rot, ro + 1, 0.0095);
}

export function buildLeafTrail(THREE, g, s, o, h) {
  flatLeaf(THREE, g, h, s * 0.9, TC.matcha, o, 0, s * 0.3, Math.PI + 0.7, 8);
  flatLeaf(THREE, g, h, s * 0.8, TC.matchaDk, o, 0, s * 0.3, Math.PI - 0.7, 10);
  flat(THREE, g, h, new THREE.ShapeGeometry(teaLeafShape(THREE, s * 0.6), 8), TC.bud, o, 0, s * 0.3, Math.PI, 12, 0.011).scale.x = 0.55;
}
