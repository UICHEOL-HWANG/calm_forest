import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn, neckWrap } from './art-xmas-pick.js';
import { packY } from './art-dessert-pick.js';

export const RN = Object.freeze({
  yellow: 0xf0cc48, yellowDk: 0xd2a838,
  blue: 0x5f8fc8, blueDk: 0x46709f, blueLt: 0x9cc2e4,
  frog: 0x7fb85a, frogDk: 0x5e9440,
  grey: 0x9aa3ad, greyDk: 0x6f7880,
  cream: 0xdcd6c4, ink: 0x2b2f36, pink: 0xeea0a6,
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
    lathe: (pts, s = 28) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

const DROP = [[0, -1], [0.42, -0.86], [0.62, -0.5], [0.56, -0.1], [0.34, 0.36], [0.12, 0.76], [0, 1]];

function drop(K, p, s, c) {
  return K.add(p, K.lathe(DROP.map(([a, b]) => [a * s, b * s]), 14), c);
}

function rainHat(K, p, r, c) {
  const g = K.grp(p);
  K.add(g, K.lathe([[r, 0], [r * 0.97, r * 0.28], [r * 0.86, r * 0.5], [r * 0.64, r * 0.62], [r * 0.32, r * 0.67], [0, r * 0.68]]), c.crown);
  K.add(g, K.cyl(r * 1.0, r * 1.025, r * 0.15, 30), c.band, 0, r * 0.095, 0);
  const b = K.grp(g, 0, 0, -r * 0.07); b.scale.z = 1.12;
  K.add(b, K.lathe([[r * 0.99, 0], [r * 1.14, -r * 0.07], [r * 1.28, -r * 0.2], [r * 1.32, -r * 0.27], [r * 1.14, -r * 0.13], [r * 0.99, -r * 0.04]], 32), c.brim).material.side = 2;
  K.add(b, K.tor(r * 1.2, r * 0.012, 4, 40), c.stitch, 0, -r * 0.13, 0).rotation.x = Math.PI / 2;
  return g;
}

function sidePin(K, hat, r, a, y = 0.1) {
  const pin = K.grp(hat, Math.cos(a) * r * 1.01, r * y, Math.sin(a) * r * 1.01);
  pin.rotation.y = Math.PI / 2 - a;
  return pin;
}

export function buildRainHood(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = HR * 0.62;
  const hat = rainHat(K, g, r, { crown: RN.yellow, band: RN.blue, brim: RN.yellow, stitch: RN.yellowDk });
  hat.position.set(0, HR * 0.76, -HR * 0.05); hat.rotation.set(-0.08, 0, 0.06);
  const d = drop(K, sidePin(K, hat, r, Math.PI * 0.62), r * 0.22, RN.blue);
  d.position.set(0, r * 0.16, r * 0.1);
  flatten(THREE, g);
}

export function buildDropScarf(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [RN.yellow, RN.yellowDk], 0.12);
  const ch = new THREE.Group();
  K.add(ch, K.tor(r * 0.07, r * 0.02, 6, 14), RN.yellowDk, 0, -r * 0.02, 0);
  drop(K, ch, r * 0.22, RN.blue).position.set(0, -r * 0.3, r * 0.03);
  stickOn(THREE, k, g, ch, K.V(0, -r * 0.06, r), 1.13);
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

function packFrame(K, g, k, k0) {
  const c = backFront(k, packY(k0)), f = K.grp(g, 0, c.y, c.z);
  f.rotation.x = 0.08;
  return f;
}

function packStraps(THREE, g, k, h, f, pts, color) {
  f.updateMatrix();
  pts.forEach((p, i) => {
    const s = i ? 1 : -1, p0 = p.clone().applyMatrix4(f.matrix);
    const path = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, path, k.R * 0.04, h.clay(color), 28, 6));
  });
}

function frogEyes(K, p, s, body, x0, y, z) {
  [-1, 1].forEach(sx => {
    const e = K.grp(p, sx * x0, y, z);
    K.add(e, K.sph(s, 14, 10), body);
    K.add(e, K.sph(s * 0.62, 12, 9), RN.cream, 0, s * 0.12, -s * 0.5);
    K.add(e, K.sph(s * 0.34, 10, 8), RN.ink, 0, s * 0.16, -s * 0.86);
  });
}

function smile(K, p, w, y, z, c) {
  const m = K.add(p, K.tor(w, w * 0.08, 5, 16, Math.PI * 0.7), c, 0, y, z);
  m.rotation.set(0, Math.PI, Math.PI + Math.PI * 0.15);
  return m;
}

export function buildFrogPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const w = R * 0.64, hh = R * 0.48, d = R * 0.16, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.16, w * 0.48), d, RN.frog, -R * 0.03, R * 0.035);
  frogEyes(K, f, R * 0.085, RN.frog, w * 0.26, hh / 2 - R * 0.01, -R * 0.03 - d / 2);
  smile(K, f, w * 0.2, -hh * 0.06, zf + R * 0.005, RN.frogDk);
  [-1, 1].forEach(s => K.add(f, K.sph(R * 0.045, 10, 8), RN.pink, s * w * 0.3, -hh * 0.06, zf + R * 0.01).scale.z = 0.35);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.32, -R * 0.03), K.V(w * 0.3, hh * 0.32, -R * 0.03)], RN.frogDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, y, z, rotZ = 0) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

export function buildPuddleTrail(THREE, g, s, o, h) {
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.5, 24), RN.blue, o * 0.8, 0, 0.008, 0).scale.set(1, 0.72, 1);
  flat(THREE, g, h, new THREE.RingGeometry(s * 0.28, s * 0.33, 24), RN.blueLt, o, s * 0.06, 0.01, -s * 0.03).scale.set(1, 0.72, 1);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.06, 10), RN.blueLt, o, -s * 0.2, 0.011, s * 0.12);
}
