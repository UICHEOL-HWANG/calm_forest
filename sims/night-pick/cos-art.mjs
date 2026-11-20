import { tubeAlong, backFront } from '../../js/cosmetics/art-winter-pick.js';
import { pushOut, bodyNormal } from '../../js/cosmetics/art-forest-pick.js';
import { stickOn, strapsFrom } from '../../js/cosmetics/art-xmas-pick.js';

export const NS = Object.freeze({
  navy: 0x2c3a66, navyDark: 0x202a4c, indigo: 0x46468a, lavender: 0x8f88c8, lilac: 0xb4aedc,
  moon: 0xe6d488, moonDark: 0xc9b46a, gold: 0xd9a838, goldDark: 0xa87a24, lamp: 0xf2cd72,
  silver: 0xb9bfd0, glass: 0xa9c4dc, cork: 0x9c7a52, wood: 0x7a5534, blush: 0xd88a8a, ink: 0x2b221c,
});

const TAU = Math.PI * 2;

export function crescentShape(THREE, r, d = 0.42, r2 = 0.86) {
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

export function starShape(THREE, ro, ri, pts = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < pts * 2; i++) {
    const a = Math.PI / 2 + (i / (pts * 2)) * TAU, r = i % 2 ? ri : ro;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

function starMesh(THREE, h, ro, color, depth = ro * 0.4, pts = 5) {
  const bv = depth * 0.3;
  const geo = new THREE.ExtrudeGeometry(starShape(THREE, ro, ro * 0.48, pts), { depth, bevelEnabled: true, bevelThickness: bv, bevelSize: bv * 0.6, bevelSegments: 1 });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, h.clay(color, false));
  m.castShadow = true;
  return m;
}

function headSpot(THREE, k, dir, lift = 1.02) {
  const d = new THREE.Vector3(...dir).normalize();
  return { p: d.clone().multiplyScalar(k.HR * lift), n: d };
}

function faceOut(obj, p, n, spin = 0) {
  obj.position.copy(p);
  obj.lookAt(p.clone().add(n));
  obj.rotateZ(spin);
}

function sleepyFace(THREE, h, g, r, cx, z) {
  const eye = new THREE.Mesh(new THREE.TorusGeometry(r * 0.09, r * 0.022, 4, 10, Math.PI), h.clay(NS.ink));
  eye.rotation.z = Math.PI; eye.position.set(cx, r * 0.10, z); g.add(eye);
  const cheek = new THREE.Mesh(new THREE.SphereGeometry(r * 0.07, 8, 6), h.clay(NS.blush, false));
  cheek.scale.set(1, 0.7, 0.4); cheek.position.set(cx + r * 0.05, -r * 0.08, z); g.add(cheek);
}

export function buildMoonPinA(THREE, g, k, h) {
  const HR = k.HR, { p, n } = headSpot(THREE, k, [0.80, 0.40, 0.42]);
  const pin = new THREE.Group(); faceOut(pin, p, n, -0.5); g.add(pin);
  const r = HR * 0.30;
  const clip = new THREE.Mesh(new THREE.BoxGeometry(r * 0.22, r * 1.1, r * 0.10), h.clay(NS.goldDark));
  clip.position.set(-r * 0.72, 0, -r * 0.02); pin.add(clip);
  const moon = new THREE.Mesh(crescentGeo(THREE, r, r * 0.22, 0.45, 0.84), h.clay(NS.moon));
  moon.position.z = r * 0.14; moon.castShadow = true; pin.add(moon);
  const hornLow = new THREE.Vector3(Math.cos(-1.05) * r * 0.92, Math.sin(-1.05) * r * 0.92, r * 0.18);
  const tip = hornLow.clone().add(new THREE.Vector3(-r * 0.05, -r * 0.55, r * 0.02));
  pin.add(tubeAlong(THREE, [hornLow, hornLow.clone().lerp(tip, 0.5).add(new THREE.Vector3(r * 0.03, 0, 0)), tip], r * 0.025, h.clay(NS.goldDark), 6, 4));
  const st = starMesh(THREE, h, r * 0.26, NS.gold); st.position.copy(tip).add(new THREE.Vector3(0, -r * 0.2, 0)); pin.add(st);
}

export function buildMoonPinB(THREE, g, k, h) {
  const HR = k.HR;
  const items = [[[0.86, 0.20, 0.46], 'moon', 0.23], [[0.80, 0.44, 0.30], 'star', 0.15], [[0.66, 0.64, 0.20], 'star', 0.12]];
  const pts = items.map(([d]) => headSpot(THREE, k, d, 1.03).p);
  g.add(tubeAlong(THREE, pts.map(q => q.clone().multiplyScalar(0.985)), HR * 0.07, h.clay(NS.navy), 16, 6));
  items.forEach(([d, kind, sz], i) => {
    const { p, n } = headSpot(THREE, k, d, 1.09);
    const o = kind === 'moon' ? new THREE.Mesh(crescentGeo(THREE, HR * sz, HR * 0.05, 0.42, 0.84), h.clay(NS.moon)) : starMesh(THREE, h, HR * sz, i === 1 ? NS.gold : NS.silver);
    o.castShadow = true;
    faceOut(o, p, n, kind === 'moon' ? 0.4 : i * 0.3);
    g.add(o);
  });
}

export function buildMoonPinC(THREE, g, k, h) {
  const HR = k.HR, { p, n } = headSpot(THREE, k, [0.62, 0.70, 0.36], 0.98);
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
}

function neckWrap(THREE, g, k, h, colors, tubeK) {
  const r = k.neckR, segs = 12;
  for (let i = 0; i < segs; i++) {
    const t = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * tubeK, 7, 4, TAU / segs + 0.02), h.clay(colors[i % colors.length], false)), 0, r * 0.04, 0);
    t.rotation.set(Math.PI / 2, 0, (i / segs) * TAU);
  }
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

export function buildGalaxyScarfA(THREE, g, k, h) {
  const r = k.neckR;
  neckWrap(THREE, g, k, h, [NS.navy, NS.indigo], 0.32);
  wrapSpecks(THREE, g, k, h, 0.32, 18, 0.3);
  [[r * 0.30, r * 0.95, NS.indigo], [r * 0.52, r * 0.70, NS.navy]].forEach(([x, len, c]) => {
    const end = chestTail(THREE, g, k, h, x, len, c, r * 0.15);
    const st = starMesh(THREE, h, r * 0.13, NS.gold);
    const n = bodyNormal(THREE, k, end);
    st.position.copy(end).add(new THREE.Vector3(0, -r * 0.12, 0)).addScaledVector(n, r * 0.06);
    st.lookAt(st.position.clone().add(n)); g.add(st);
  });
}

export function buildGalaxyScarfB(THREE, g, k, h) {
  const r = k.neckR;
  neckWrap(THREE, g, k, h, [NS.lavender, NS.lilac], 0.12);
  const br = new THREE.Group(), R0 = r * 0.30;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, R0 * 0.22, 20), h.clay(NS.navyDark));
  disc.rotation.x = Math.PI / 2; br.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R0, R0 * 0.08, 5, 24), h.clay(NS.gold)); br.add(rim);
  [0, Math.PI].forEach((a0, arm) => {
    for (let i = 0; i < 9; i++) {
      const t = i / 8, a = a0 + t * 3.4, rr = R0 * (0.12 + 0.70 * t);
      h.put(br, new THREE.Mesh(new THREE.SphereGeometry(R0 * (0.11 - t * 0.06), 7, 5), h.clay(i % 2 ? NS.lilac : (arm ? NS.lavender : NS.silver), false)), Math.cos(a) * rr, Math.sin(a) * rr, R0 * 0.12, false);
    }
  });
  h.put(br, new THREE.Mesh(new THREE.SphereGeometry(R0 * 0.16, 9, 7), h.clay(NS.lamp, false)), 0, 0, R0 * 0.12);
  stickOn(THREE, k, g, br, new THREE.Vector3(r * 0.12, -r * 0.26, r), 1.12);
}

export function buildGalaxyScarfC(THREE, g, k, h) {
  const r = k.neckR, n = 9;
  neckWrap(THREE, g, k, h, [NS.navyDark], 0.10);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const base = pushOut(THREE, k, new THREE.Vector3(Math.sin(a) * r, -r * 0.05, Math.cos(a) * r), 1.10);
    const nn = bodyNormal(THREE, k, base);
    const dir = new THREE.Vector3(nn.x * 0.35, -1, nn.z * 0.35).normalize();
    const tip = pushOut(THREE, k, base.clone().addScaledVector(dir, r * 0.58), 1.10);
    const piv = new THREE.Group(); piv.position.copy(base);
    piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tip.clone().sub(base).normalize()); g.add(piv);
    const len = tip.distanceTo(base);
    const petal = new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, len, 4), h.clay(i % 2 ? NS.indigo : NS.navy));
    petal.rotation.x = Math.PI; petal.position.y = -len / 2; petal.scale.z = 0.25; petal.castShadow = true; piv.add(petal);
    const s = starMesh(THREE, h, r * 0.09, NS.gold); s.position.copy(tip); s.lookAt(tip.clone().add(bodyNormal(THREE, k, tip))); g.add(s);
  }
  const clasp = new THREE.Mesh(crescentGeo(THREE, r * 0.17, r * 0.06, 0.42, 0.84), h.clay(NS.moon));
  clasp.rotation.z = -0.6;
  const cg = new THREE.Group(); cg.add(clasp);
  stickOn(THREE, k, g, cg, new THREE.Vector3(0, -r * 0.30, r), 1.16);
}

function clearZ(k, y0, y1, pad = 0.03) {
  let z = 0;
  for (let i = 0; i <= 8; i++) z = Math.min(z, backFront(k, y0 + (y1 - y0) * i / 8, pad).z);
  return z;
}

function softBox(THREE, h, w, hh, d, color) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(Math.min(hh, d) * 0.5, w - Math.min(hh, d), 4, 10), h.clay(color, false));
  m.rotation.z = Math.PI / 2; m.scale.set(hh / Math.min(hh, d), 1, d / Math.min(hh, d));
  m.castShadow = true;
  return m;
}

function starLantern(THREE, h, s) {
  const L = new THREE.Group();
  const core = starMesh(THREE, h, s, NS.lamp, s * 0.55); core.userData.flicker = true; L.add(core);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.18, s * 0.26, s * 0.20, 8), h.clay(NS.goldDark)); cap.position.y = s * 1.05; L.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 0.14, s * 0.04, 4, 10), h.clay(NS.goldDark)); ring.position.y = s * 1.24; L.add(ring);
  return L;
}

export function buildStarLanternPackA(THREE, g, k, h) {
  const R = k.R, y0 = 1.16, hh = 0.40, d = 0.22;
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
}

export function buildStarLanternPackB(THREE, g, k, h) {
  const R = k.R, y0 = 1.14, hh = 0.48, rr = 0.21, sq = 0.66;
  const z = clearZ(k, y0, y0 + hh) - rr * R * sq, cy = backFront(k, y0 + hh / 2).y;
  const jar = new THREE.Group(); jar.position.set(0, cy, z); jar.scale.z = sq; g.add(jar);
  const glassMat = new THREE.MeshStandardMaterial({ color: NS.glass, roughness: 0.25, transparent: true, opacity: 0.42, depthWrite: false });
  jar.add(new THREE.Mesh(new THREE.CylinderGeometry(rr * R, rr * R * 0.94, hh * R, 20), glassMat));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(rr * R * 0.72, rr * R, R * 0.06, 20), glassMat); neck.position.y = hh * R / 2 + R * 0.03; jar.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(rr * R * 0.66, rr * R * 0.62, R * 0.10, 14), h.clay(NS.cork)); cork.position.y = hh * R / 2 + R * 0.10; jar.add(cork);
  const band = new THREE.Mesh(new THREE.TorusGeometry(rr * R * 0.98, R * 0.018, 4, 20), h.clay(NS.navy)); band.rotation.x = Math.PI / 2; band.position.y = hh * R * 0.18; jar.add(band);
  [[0.0, -0.20, 0.0, 0.10], [-0.10, 0.02, 0.06, 0.07], [0.11, -0.05, -0.05, 0.08], [0.02, 0.20, -0.06, 0.06], [-0.08, -0.32, -0.06, 0.06], [0.10, 0.28, 0.06, 0.05]].forEach(([x, y, zz, s], i) => {
    const st = starMesh(THREE, h, s * R, i % 2 ? NS.lamp : NS.gold, s * R * 0.5); st.position.set(x * R, y * R, zz * R); st.rotation.set(i * 0.6, i * 1.3, i);
    st.userData.flicker = true; jar.add(st);
  });
  const tag = new THREE.Mesh(crescentGeo(THREE, R * 0.07, R * 0.02, 0.42, 0.84), h.clay(NS.moon)); tag.position.set(rr * R * 0.55, hh * R * 0.18, -rr * R * 0.88); tag.rotation.y = Math.PI + 0.5; jar.add(tag);
  strapsFrom(THREE, g, k, h, [-1, 1].map(s => new THREE.Vector3(s * R * 0.18, cy, z + rr * R * sq * 0.9)), NS.navyDark);
}

export function buildStarLanternPackC(THREE, g, k, h) {
  const R = k.R, rr = R * 0.34, dd = R * 0.15;
  const z = clearZ(k, 1.40, 2.10) - dd / 2 - R * 0.04, cy = backFront(k, 1.76).y;
  const moon = new THREE.Mesh(crescentGeo(THREE, rr, dd, 0.40, 0.80), h.clay(NS.moon));
  moon.position.set(0, cy, z); moon.rotation.set(0, Math.PI, Math.PI / 2); moon.castShadow = true; g.add(moon);
  [-1, 1].forEach(s => {
    const horn = new THREE.Vector3(s * rr * 0.74, cy + rr * 0.62, z - dd * 0.2);
    const end = horn.clone().add(new THREE.Vector3(s * R * 0.16, -R * 0.06, -R * 0.02));
    g.add(tubeAlong(THREE, [horn, horn.clone().lerp(end, 0.5).add(new THREE.Vector3(0, R * 0.05, 0)), end], R * 0.010, h.clay(NS.goldDark), 6, 4));
    const lan = starLantern(THREE, h, R * 0.085); lan.position.copy(end).add(new THREE.Vector3(0, -R * 0.105, 0)); lan.rotation.y = Math.PI; g.add(lan);
  });
  const face = new THREE.Group(); face.position.set(0, cy - rr * 0.60, z - dd * 0.86); face.rotation.y = Math.PI; g.add(face);
  [-1, 1].forEach(s => sleepyFace(THREE, h, face, rr * 0.55, s * rr * 0.16, 0));
  strapsFrom(THREE, g, k, h, [-1, 1].map(s => new THREE.Vector3(s * R * 0.22, cy, z + dd * 0.6)), NS.navyDark);
}

function oval(THREE, g, h, r, sx, sz, x, z, mat, y = 0.006) {
  const t = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8), mat), x, y, z, false);
  t.scale.set(sx, 0.10, sz);
  return t;
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

export function buildMeteorTrailA(THREE, g, s, o, id, h) {
  [[-0.5, 0.13, 1.2, NS.lavender, 0.7], [0, 0.20, 1.8, NS.lilac, 0.85], [0.5, 0.13, 1.3, NS.lavender, 0.7]].forEach(([a, w, L, c, k]) =>
    flatOn(THREE, g, h, streak(THREE, w * s, L * s), h.film(c, o * k), a * s * 0.20, 0.007, s * 0.36, a * 0.40));
  flatOn(THREE, g, h, new THREE.ShapeGeometry(starShape(THREE, s * 0.36, s * 0.17)), h.film(NS.gold, o), 0, 0.010, s * 0.40, 0.15).renderOrder = 1;
}

export function buildMeteorTrailB(THREE, g, s, o, id, h) {
  oval(THREE, g, h, s * 0.46, 1.15, 0.95, 0, -s * 0.14, h.film(NS.indigo, o * 0.75));
  [[-0.50, 0.30], [-0.18, 0.54], [0.18, 0.54], [0.50, 0.30]].forEach(([x, z], i) =>
    flatOn(THREE, g, h, new THREE.ShapeGeometry(starShape(THREE, s * 0.20, s * 0.06, 4)), h.film(i % 2 ? NS.lilac : NS.gold, o), x * s * 1.05, 0.008, z * s * 1.1, i * 0.3));
}

export function buildMeteorTrailC(THREE, g, s, o, id, h) {
  flatOn(THREE, g, h, new THREE.ShapeGeometry(crescentShape(THREE, s * 0.50, 0.42, 0.80)), h.film(NS.moon, o), 0, 0.008, 0, -Math.PI / 2 + 0.3);
  [[0.22, 0.06, 0.13], [0.36, -0.20, 0.08]].forEach(([x, z, r], i) =>
    flatOn(THREE, g, h, new THREE.ShapeGeometry(starShape(THREE, s * r, s * r * 0.45)), h.film(i ? NS.lilac : NS.gold, o), x * s, 0.010, z * s, i));
}

export const VARIANTS = {
  ns_moon_pin: {
    slot: 'head', name: '초승달 머리핀',
    A: { name: '달 핀 + 별 방울', note: '옆머리 금빛 핀 위 초승달 · 아래 뿔에 작은 별이 대롱대롱', build: buildMoonPinA },
    B: { name: '달·별 줄 똑딱핀', note: '남색 핀을 따라 초승달 하나 + 금별·은별 · 옆머리 사선', build: buildMoonPinB },
    C: { name: '구름 위 졸린 달', note: '연보라 구름 받침 위 눈 감은 초승달 · 품에 금별 하나', build: buildMoonPinC },
  },
  ns_galaxy_scarf: {
    slot: 'neck', name: '은하수 목도리',
    A: { name: '별가루 니트 목도리', note: '남색·쪽빛 두툼한 목도리 + 별가루 · 가슴에 늘어진 두 끝에 금별', build: buildGalaxyScarfA },
    B: { name: '소용돌이 은하 브로치', note: '연보라 가는 띠 + 가슴에 남색 원판 은하 소용돌이 · 금테', build: buildGalaxyScarfB },
    C: { name: '별 끝 꽃잎 깃', note: '남색·쪽빛 뾰족 깃 아홉 장 · 깃 끝마다 금별 · 앞 초승달 단추', build: buildGalaxyScarfC },
  },
  ns_star_lantern_pack: {
    slot: 'back', cols: 'back2', name: '별 랜턴 배낭',
    A: { name: '낚싯대 별 랜턴', note: '남색 배낭 + 머리 위로 휜 나무 막대 끝에 별 랜턴', build: buildStarLanternPackA },
    B: { name: '별 담은 유리병', note: '코르크 마개 유리병 안에 반짝이는 별 여섯 · 남색 띠', build: buildStarLanternPackB },
    C: { name: '초승달 배낭', note: '등에 세운 졸린 초승달 + 두 뿔에 꼬마 별 랜턴', build: buildStarLanternPackC },
  },
  ns_meteor_trail: {
    slot: 'trail', name: '유성 발자국',
    A: { name: '꼬리 긴 유성', note: '발자국 없이 금별 하나 + 뒤로 길게 늘어진 연보라 꼬리 셋', build: buildMeteorTrailA },
    B: { name: '반짝 발가락', note: '쪽빛 발바닥 + 발가락 넷이 네 꼭지 반짝별', build: buildMeteorTrailB },
    C: { name: '초승달 자국', note: '초승달 모양 자국 + 안쪽에 작은 별 둘', build: buildMeteorTrailC },
  },
};
