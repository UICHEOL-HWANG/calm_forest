import { tubeAlong, backFront, withAnchors, flatten } from './art-winter-pick.js';
import { pushOut, bodyNormal } from './art-forest-pick.js';
import { strapsFrom, neckWrap, clearZ } from './art-xmas-pick.js';

export const NS = Object.freeze({
  navy: 0x2c3a66, navyDark: 0x202a4c, indigo: 0x46468a, lavender: 0x8f88c8, lilac: 0xb4aedc,
  moon: 0xe6d488, gold: 0xd9a838, goldDark: 0xa87a24, lamp: 0xf2cd72,
  wood: 0x7a5534, blush: 0xd88a8a, ink: 0x2b221c,
});

const TAU = Math.PI * 2;

function crescentShape(THREE, r, d = 0.42, r2 = 0.86) {
  const R2 = r * r2, D = r * d;
  const x = (r * r - R2 * R2 + D * D) / (2 * D), y = Math.sqrt(Math.max(0, r * r - x * x));
  const th = Math.atan2(y, x), ph = Math.atan2(y, x - D), s = new THREE.Shape(), n = 28;
  for (let i = 0; i <= n; i++) {
    const a = th + (TAU - 2 * th) * i / n;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = 1; i < n; i++) {
    const a = TAU - ph - (TAU - 2 * ph) * i / n;
    s.lineTo(D + Math.cos(a) * R2, Math.sin(a) * R2);
  }
  s.closePath();
  return s;
}

function crescentGeo(THREE, r, depth, d, r2) {
  const bv = depth * 0.35;
  const g = new THREE.ExtrudeGeometry(crescentShape(THREE, r, d, r2), { depth, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function starShape(THREE, ro, ri) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? ri : ro;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

function starMesh(THREE, h, ro, color, depth = ro * 0.4) {
  const bv = depth * 0.3;
  const geo = new THREE.ExtrudeGeometry(starShape(THREE, ro, ro * 0.48), { depth, bevelEnabled: true, bevelThickness: bv, bevelSize: bv * 0.6, bevelSegments: 1 });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, h.clay(color, false));
  m.castShadow = true;
  return m;
}

function sleepyFace(THREE, h, g, r, cx, z) {
  const eye = new THREE.Mesh(new THREE.TorusGeometry(r * 0.09, r * 0.022, 4, 10, Math.PI), h.clay(NS.ink));
  eye.rotation.z = Math.PI; eye.position.set(cx, r * 0.10, z); g.add(eye);
  const cheek = new THREE.Mesh(new THREE.SphereGeometry(r * 0.07, 8, 6), h.clay(NS.blush, false));
  cheek.scale.set(1, 0.7, 0.4); cheek.position.set(cx + r * 0.05, -r * 0.08, z); g.add(cheek);
}

export function buildMoonPin(THREE, g, k, h) {
  const HR = k.HR, n = new THREE.Vector3(0.62, 0.70, 0.36).normalize(), p = n.clone().multiplyScalar(HR * 0.98);
  const pin = new THREE.Group(); pin.position.copy(p);
  pin.lookAt(p.clone().add(new THREE.Vector3(n.x * 0.7, 0, n.z * 0.7 + 0.6)));
  pin.rotateZ(-0.35);
  g.add(pin);
  const cl = HR * 0.13;
  [[0, 0, 0, 1.0], [-1.0, -0.25, 0.1, 0.78], [1.0, -0.25, 0.0, 0.78], [-0.5, -0.35, 0.6, 0.7], [0.5, -0.35, 0.6, 0.7]].forEach(([x, y, z, s]) => {
    const c = h.put(pin, new THREE.Mesh(new THREE.IcosahedronGeometry(cl * s, 1), h.clay(NS.lilac, false)), x * cl, y * cl, z * cl);
    c.scale.y = 0.8;
  });
  const r = HR * 0.30;
  const moon = new THREE.Group(); moon.position.set(r * 0.25, cl * 0.4 + r * 0.80, 0); moon.rotation.z = -0.25; pin.add(moon);
  const m = new THREE.Mesh(crescentGeo(THREE, r, r * 0.30, 0.48, 0.80), h.clay(NS.moon)); m.castShadow = true; moon.add(m);
  sleepyFace(THREE, h, moon, r, -r * 0.62, r * 0.27);
  const st = starMesh(THREE, h, r * 0.20, NS.gold); st.position.set(r * 0.22, r * 0.18, 0); moon.add(st);
  flatten(THREE, g);
}

function wrapSpecks(THREE, g, k, h, tubeK, n, seed) {
  const r = k.neckR;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + seed, up = Math.sin(i * 2.7 + seed) * 0.6;
    const rr = r + r * tubeK * 0.95 * Math.cos(up);
    const m = h.put(g, new THREE.Mesh(new THREE.OctahedronGeometry(r * (i % 3 ? 0.035 : 0.055), 0), h.clay(i % 3 ? NS.lilac : NS.gold, false)), Math.sin(a) * rr, r * 0.04 + r * tubeK * 0.95 * Math.sin(up), Math.cos(a) * rr, false);
    m.rotation.set(i, i * 2, 0);
  }
}

function chestTail(THREE, g, k, h, x0, len, color, rad) {
  const r = k.neckR;
  const pts = Array.from({ length: 6 }, (_, i) => pushOut(THREE, k, new THREE.Vector3(x0 + i * r * 0.04, -r * 0.18 - (i / 5) * len, r * 0.95), 1.10));
  g.add(tubeAlong(THREE, pts, rad, h.clay(color), 20, 7));
  return pts[pts.length - 1];
}

export function buildGalaxyScarf(THREE, g, k0, h) {
  const k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [NS.navy, NS.indigo], 0.32);
  wrapSpecks(THREE, g, k, h, 0.32, 18, 0.3);
  [[r * 0.30, r * 0.95, NS.indigo], [r * 0.52, r * 0.70, NS.navy]].forEach(([x, len, c]) => {
    const end = chestTail(THREE, g, k, h, x, len, c, r * 0.15);
    const st = starMesh(THREE, h, r * 0.13, NS.gold);
    const n = bodyNormal(THREE, k, end);
    st.position.copy(end).add(new THREE.Vector3(0, -r * 0.12, 0)).addScaledVector(n, r * 0.06);
    st.lookAt(st.position.clone().add(n)); g.add(st);
  });
  flatten(THREE, g);
}

function softBox(THREE, h, w, hh, d, color) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(Math.min(hh, d) * 0.5, w - Math.min(hh, d), 4, 10), h.clay(color, false));
  m.rotation.z = Math.PI / 2; m.scale.set(hh / Math.min(hh, d), 1, d / Math.min(hh, d));
  m.castShadow = true;
  return m;
}

function starLantern(THREE, h, s) {
  const L = new THREE.Group();
  L.add(starMesh(THREE, h, s, NS.lamp, s * 0.55));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.18, s * 0.26, s * 0.20, 8), h.clay(NS.goldDark)); cap.position.y = s * 1.05; L.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 0.14, s * 0.04, 4, 10), h.clay(NS.goldDark)); ring.position.y = s * 1.24; L.add(ring);
  return L;
}

export function buildStarLanternPack(THREE, g, k0, h) {
  const k = withAnchors(k0), R = k.R, y0 = 1.16, hh = 0.40, d = 0.22;
  const z = clearZ(k, y0, y0 + hh) - d * R / 2, cy = backFront(k, y0 + hh / 2).y;
  const bag = softBox(THREE, h, 0.62 * R, hh * R, d * R, NS.navy); bag.position.set(0, cy, z); g.add(bag);
  const flap = softBox(THREE, h, 0.64 * R, 0.18 * R, d * R * 1.1, NS.indigo); flap.position.set(0, cy + hh * R * 0.36, z); g.add(flap);
  const st = starMesh(THREE, h, R * 0.07, NS.gold); st.position.set(0, cy + hh * R * 0.30, z - d * R * 0.58); st.rotation.y = Math.PI; g.add(st);
  const px = R * 0.24, top = cy + hh * R / 2;
  const hz = clearZ(k, y0, (k.HY + k.HR - k.bodyY) / k.R + 0.2, 0.12);
  const pole = [new THREE.Vector3(px, top - R * 0.1, z), new THREE.Vector3(px + R * 0.04, top + R * 0.5, Math.min(z, hz) - R * 0.04), new THREE.Vector3(px + R * 0.14, top + R * 0.95, hz - R * 0.10), new THREE.Vector3(px + R * 0.42, top + R * 1.08, hz - R * 0.14)];
  g.add(tubeAlong(THREE, pole, R * 0.028, h.clay(NS.wood), 24, 6));
  const tip = pole[3];
  g.add(tubeAlong(THREE, [tip, tip.clone().add(new THREE.Vector3(0, -R * 0.08, 0)), tip.clone().add(new THREE.Vector3(0, -R * 0.16, 0))], R * 0.008, h.clay(NS.goldDark), 4, 4));
  const lan = starLantern(THREE, h, R * 0.15); lan.position.copy(tip).add(new THREE.Vector3(0, -R * 0.16 - R * 0.17, 0)); lan.rotation.y = Math.PI; g.add(lan);
  strapsFrom(THREE, g, k, h, [-1, 1].map(s => new THREE.Vector3(s * R * 0.2, cy + R * 0.12, z + d * R / 2)), NS.navyDark);
  flatten(THREE, g);
}

function flatOn(THREE, g, h, geo, mat, x, y, z, rot = 0) {
  mat.side = THREE.DoubleSide;
  const m = h.put(g, new THREE.Mesh(geo, mat), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rot);
  return m;
}

function streak(THREE, w, L) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0); s.quadraticCurveTo(-w * 0.6, L * 0.5, 0, L); s.quadraticCurveTo(w * 0.6, L * 0.5, w, 0); s.quadraticCurveTo(0, -w * 0.8, -w, 0);
  return new THREE.ShapeGeometry(s, 8);
}

export function buildMeteorTrail(THREE, g, s, o, h) {
  [[-0.5, 0.13, 1.2, NS.lavender, 0.7], [0, 0.20, 1.8, NS.lilac, 0.85], [0.5, 0.13, 1.3, NS.lavender, 0.7]].forEach(([a, w, L, c, k]) =>
    flatOn(THREE, g, h, streak(THREE, w * s, L * s), h.film(c, o * k), a * s * 0.20, 0.007, s * 0.36, a * 0.40));
  flatOn(THREE, g, h, new THREE.ShapeGeometry(starShape(THREE, s * 0.36, s * 0.17)), h.film(NS.gold, o), 0, 0.010, s * 0.40, 0.15).renderOrder = 1;
}
