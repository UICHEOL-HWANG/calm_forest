import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { arcPt } from './art-forest-pick.js';
import { packY } from './art-dessert-pick.js';

export const SB = Object.freeze({
  sakura: 0xf592b6, sakuraDk: 0xe0739c, sakuraLt: 0xf9bad2, rose: 0xc95a7a,
  cream: 0xe6d6ba, leaf: 0x8cc06a, leafDk: 0x689e50,
  wood: 0xc99a64, woodDk: 0x9c7046, butter: 0xeac25a,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 16, b = 12, ...rest) => new THREE.SphereGeometry(r, a, b, ...rest),
    cyl: (a, b, hh, s = 20, ...rest) => new THREE.CylinderGeometry(a, b, hh, s, ...rest),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function ex(THREE, sh, d, bev) {
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -d / 2); return geo;
}

function petalShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.44, s * 0.16, s * 0.46, s * 0.84, s * 0.18, s);
  sh.lineTo(0, s * 0.86);
  sh.lineTo(-s * 0.18, s);
  sh.bezierCurveTo(-s * 0.46, s * 0.84, -s * 0.44, s * 0.16, 0, 0);
  return sh;
}

function leafShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.quadraticCurveTo(s * 0.36, s * 0.45, 0, s);
  sh.quadraticCurveTo(-s * 0.36, s * 0.45, 0, 0);
  return sh;
}

function blossom(K, p, s, petal = SB.sakura, center = SB.rose) {
  const g = K.grp(p);
  for (let i = 0; i < 5; i++) {
    const pg = K.grp(g); pg.rotation.z = i / 5 * TAU;
    const m = K.add(pg, ex(K.THREE, petalShape(K.THREE, s), s * 0.06, s * 0.03), petal, 0, s * 0.06, 0);
    m.rotation.x = -0.28;
  }
  K.add(g, K.sph(s * 0.2, 10, 8), center, 0, 0, s * 0.08).scale.z = 0.6;
  return g;
}

function bud(K, p, s, c = SB.sakuraDk) {
  const g = K.grp(p);
  K.add(g, K.sph(s, 10, 8), c).scale.set(0.8, 1.15, 0.8);
  return g;
}

function leaf(K, p, s, c = SB.leaf, rz = 0) {
  const m = K.add(p, ex(K.THREE, leafShape(K.THREE, s), s * 0.06, s * 0.03), c);
  m.rotation.z = rz; return m;
}

function headband(K, g, HR, c, tube = 0.06) {
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * tube, 6, 30, Math.PI), c, 0, 0, 0, true);
  return band;
}

const SIDE = -0.92;

function sideSpot(K, g, k, HR) {
  const p = arcPt(K.THREE, k, SIDE, 1.1).applyAxisAngle(K.V(1, 0, 0), 0.45);
  const e = K.grp(g, p.x, p.y, p.z + HR * 0.06); e.rotation.set(0.1, 0.45, SIDE * 0.7);
  return e;
}

export function buildBlossomCrown(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, SB.leaf);
  const e = sideSpot(K, g, k, HR);
  leaf(K, e, HR * 0.3, SB.leaf, 1.9).position.set(-HR * 0.02, -HR * 0.02, -HR * 0.03);
  leaf(K, e, HR * 0.26, SB.leafDk, -1.7).position.set(HR * 0.04, HR * 0.02, -HR * 0.03);
  blossom(K, e, HR * 0.23).position.set(0, 0, HR * 0.02);
  blossom(K, e, HR * 0.14, SB.sakuraLt).position.set(-HR * 0.24, HR * 0.14, 0);
  blossom(K, e, HR * 0.12).position.set(HR * 0.2, -HR * 0.18, 0);
  flatten(THREE, g);
}

function neckCord(K, g, r, c, tube) {
  K.add(g, K.tor(r, r * tube, 7, 36), c, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
}

function front(THREE, K, k, g, r, build, at = 0) {
  const w = new THREE.Group();
  build(w);
  stickOn(THREE, k, g, w, K.V(r * at, -r * 0.26, r), 1.12);
}

export function buildPetalRibbon(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, SB.cream, 0.12);
  front(THREE, K, k, g, r, w => {
    leaf(K, w, r * 0.32, SB.leaf, 2.3).position.z = -r * 0.03;
    leaf(K, w, r * 0.28, SB.leafDk, -2.4).position.z = -r * 0.03;
    blossom(K, w, r * 0.22).position.z = r * 0.02;
    bud(K, w, r * 0.06).position.set(r * 0.24, r * 0.12, 0);
  });
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

function packFrame(K, g, k, yc) {
  const c = backFront(k, yc), f = K.grp(g, 0, c.y, c.z);
  f.rotation.x = 0.08;
  return f;
}

function packStraps(THREE, g, k, h, f, pts, color) {
  f.updateMatrix();
  pts.forEach((p, i) => {
    const s = i ? 1 : -1, p0 = p.clone().applyMatrix4(f.matrix);
    const path = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, path, k.R * 0.042, h.clay(color), 28, 6));
  });
}

function weave(K, f, w, hh, y0, rows, zf, R) {
  const bh = hh / rows;
  for (let r = 0; r < rows; r++)
    K.add(f, new K.THREE.BoxGeometry(w, bh * 0.28, R * 0.02), SB.woodDk, 0, y0 + (r + 0.5) * bh, zf, true);
  [-1, 1].forEach(s => K.add(f, new K.THREE.BoxGeometry(R * 0.025, hh, R * 0.025), SB.woodDk, s * w * 0.5, y0 + hh / 2, zf, true));
}

function basket(THREE, K, f, R, w, hh, d) {
  const zf = -R * 0.03 - d - R * 0.03;
  slab(K, f, roundRect(THREE, w, hh, R * 0.1, R * 0.06), d, SB.wood, -R * 0.03, R * 0.03);
  weave(K, f, w * 0.9, hh * 0.78, -hh / 2 + hh * 0.06, 4, zf + R * 0.005, R);
  K.add(f, new THREE.BoxGeometry(w * 1.02, hh * 0.08, d + R * 0.08), SB.woodDk, 0, hh / 2 - hh * 0.04, -R * 0.03 - d / 2 - R * 0.01, true);
  return zf;
}

function gingham(K, f, w, hh, y, zf, R, base, check) {
  K.add(f, new K.THREE.BoxGeometry(w, hh, R * 0.03), base, 0, y, zf, true);
  const n = 5, cw = w / n, m = 3, ch = hh / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if ((i + j) % 2 === 0)
    K.add(f, new K.THREE.BoxGeometry(cw * 0.98, ch * 0.98, R * 0.01), check, -w / 2 + cw * (i + 0.5), y - hh / 2 + ch * (j + 0.5), zf - R * 0.012, true);
}

export function buildPicnicPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, packY(k0));
  const w = R * 0.66, hh = R * 0.5, d = R * 0.16;
  const zf = basket(THREE, K, f, R, w, hh, d);
  gingham(K, f, w * 0.8, hh * 0.3, hh / 2 - hh * 0.02, zf - R * 0.005, R, SB.sakura, SB.cream);
  blossom(K, f, R * 0.1).position.set(0, -hh * 0.14, zf - R * 0.02);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.36, -R * 0.03), K.V(w * 0.3, hh * 0.36, -R * 0.03)], SB.woodDk);
  flatten(THREE, g);
}

function flatShape(THREE, g, h, geo, c, o, x, z, rotZ, ro, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = ro;
  return m;
}

function flatBlossom(THREE, g, h, s, o, x, z, rot, petal = SB.sakura) {
  const geo = new THREE.ShapeGeometry(petalShape(THREE, s), 8);
  for (let i = 0; i < 5; i++) flatShape(THREE, g, h, geo, petal, o, x, z, rot + i / 5 * TAU, 8);
  flatShape(THREE, g, h, new THREE.CircleGeometry(s * 0.2, 12), SB.rose, o, x, z, 0, 10, 0.011);
}

export function buildPetalTrail(THREE, g, s, o, h) {
  flatBlossom(THREE, g, h, s * 0.56, o, 0, 0, 0.2);
}
