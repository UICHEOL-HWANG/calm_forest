import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { arcPt } from './art-forest-pick.js';
import { packY } from './art-dessert-pick.js';

export const MU = Object.freeze({
  navy: 0x34406a, navyDk: 0x263052,
  velvet: 0xa8323e, velvetDk: 0x7c2430,
  brass: 0xd2a04c, brassDk: 0xa87a34,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 18, b = 14) => new THREE.SphereGeometry(r, a, b),
    cyl: (a, b, hh, s = 16) => new THREE.CylinderGeometry(a, b, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function ex(THREE, sh, d, bev, curve = 14) {
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 3, curveSegments: curve });
  geo.translate(0, 0, -d / 2); return geo;
}

function symShape(THREE, start, segs) {
  const sh = new THREE.Shape();
  sh.moveTo(...start);
  segs.forEach(([c1, c2, e]) => sh.bezierCurveTo(...c1, ...c2, ...e));
  for (let i = segs.length - 1; i >= 0; i--) {
    const [c1, c2] = segs[i], p = i ? segs[i - 1][2] : start;
    sh.bezierCurveTo(-c2[0], c2[1], -c1[0], c1[1], -p[0], p[1]);
  }
  return sh;
}

function flagShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.05, -s * 0.18, s * 0.34, -s * 0.22, s * 0.3, -s * 0.52);
  sh.bezierCurveTo(s * 0.26, -s * 0.36, s * 0.12, -s * 0.3, 0, -s * 0.28);
  sh.closePath();
  return sh;
}

function eighth(K, p, s, c) {
  const g = K.grp(p);
  const head = K.add(g, K.sph(s * 0.19, 18, 12), c, 0, -s * 0.38, 0);
  head.scale.set(1.3, 0.92, 0.75); head.rotation.z = 0.42;
  K.add(g, K.cyl(s * 0.055, s * 0.055, s * 0.78, 10), c, s * 0.2, 0, 0);
  K.add(g, ex(K.THREE, flagShape(K.THREE, s), s * 0.07, s * 0.03), c, s * 0.2, s * 0.38, 0);
  return g;
}

function bow(K, p, s, wing, knot) {
  const g = K.grp(p);
  const sh = new K.THREE.Shape();
  sh.moveTo(0, -s * 0.16);
  sh.bezierCurveTo(s * 0.35, -s * 0.24, s * 0.72, -s * 0.5, s * 0.86, -s * 0.36);
  sh.bezierCurveTo(s * 0.98, -s * 0.16, s * 0.98, s * 0.16, s * 0.86, s * 0.36);
  sh.bezierCurveTo(s * 0.72, s * 0.5, s * 0.35, s * 0.24, 0, s * 0.16);
  sh.closePath();
  [0, Math.PI].forEach(r => { const w = K.grp(g); w.rotation.y = r; K.add(w, ex(K.THREE, sh, s * 0.12, s * 0.07), wing); });
  K.add(g, K.sph(s * 0.2, 16, 12), knot, 0, 0, s * 0.03).scale.set(0.9, 1.05, 0.8);
  return g;
}

const SIDE = -0.92;

export function buildNotePin(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * 0.055, 6, 30, Math.PI), MU.navy, 0, 0, 0, true);
  const p = arcPt(THREE, k, SIDE, 1.1).applyAxisAngle(K.V(1, 0, 0), 0.45);
  const e = K.grp(g, p.x, p.y, p.z + HR * 0.06); e.rotation.set(0.1, 0.45, SIDE * 0.7);
  eighth(K, e, HR * 0.82, MU.brass).rotation.z = 0.2;
  flatten(THREE, g);
}

export function buildBowTie(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.1, 7, 40), MU.velvetDk, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
  const w = new THREE.Group();
  bow(K, w, r * 0.52, MU.velvet, MU.velvetDk);
  stickOn(THREE, k, g, w, K.V(0, -r * 0.12, r), 1.14);
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

function caseShape(THREE, L, W) {
  return symShape(THREE, [0, -L / 2], [
    [[W * 0.56, -L / 2], [W * 0.56, -L * 0.04], [W * 0.3, L * 0.1]],
    [[W * 0.2, L * 0.17], [W * 0.22, L / 2], [0, L / 2]],
  ]);
}

export function buildViolinPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0) + 0.04), f = K.grp(g, 0, c.y, c.z);
  f.rotation.x = 0.08;
  const L = R * 0.84, W = R * 0.36, d = R * 0.11, z0 = -R * 0.03, zf = z0 - d - R * 0.035;
  const t = K.grp(f); t.rotation.z = Math.PI / 2 + 0.1;
  const geo = new THREE.ExtrudeGeometry(caseShape(THREE, L, W), { depth: d, bevelEnabled: true, bevelSize: R * 0.035, bevelThickness: R * 0.035, bevelSegments: 3, curveSegments: 18 });
  geo.translate(0, 0, -d);
  K.add(t, geo, MU.navy, 0, 0, z0);
  [-1, 1].forEach(s => K.add(t, K.box(R * 0.04, R * 0.1, R * 0.03), MU.brass, s * W * 0.3, -L * 0.04, zf + R * 0.01));
  K.add(f, K.tor(R * 0.08, R * 0.02, 6, 16, Math.PI), MU.brassDk, -R * 0.04, W * 0.4 + R * 0.04, z0 - d / 2 - R * 0.02);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.2, R * 0.1, z0), K.V(R * 0.2, R * 0.1, z0)], MU.navyDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), 0, y, 0, false);
  m.rotation.set(-Math.PI / 2, 0, 0); m.renderOrder = Math.round(y * 1000);
  return m;
}

export function buildNoteTrail(THREE, g, s0, o, h) {
  const s = s0 * 1.55;
  const grp = new THREE.Group(); grp.rotation.y = Math.PI; g.add(grp);
  const head = new THREE.CircleGeometry(s * 0.17, 20);
  head.scale(1.32, 0.9, 1); head.rotateZ(0.42); head.translate(0, -s * 0.38, 0);
  flat(THREE, grp, h, head, MU.navy, o);
  const stem = new THREE.PlaneGeometry(s * 0.06, s * 0.78); stem.translate(s * 0.19, 0, 0);
  flat(THREE, grp, h, stem, MU.navy, o, 0.009);
  const fl = new THREE.ShapeGeometry(flagShape(THREE, s), 10); fl.translate(s * 0.19, s * 0.38, 0);
  flat(THREE, grp, h, fl, MU.navy, o, 0.0095);
}
