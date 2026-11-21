import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt } from '../../js/cosmetics/art-forest-pick.js';
import { tailType } from '../../js/cosmetics/anchors.js';

export const NY = Object.freeze({
  dahong: 0xe0705e, dahongDk: 0xc0564a,
  jjok: 0x5a78b0, jjokDk: 0x445e92,
  yeondu: 0xa8cc7a, yeonduDk: 0x86ad5c,
  norang: 0xeac25a, norangDk: 0xc99a3a,
  pink: 0xeea0a6,
  cream: 0xe2d2b6,
  wood: 0xa87a4e, yut: 0xd8b07a,
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
    cyl: (a, b, hh, s = 20, ...rest) => new THREE.CylinderGeometry(a, b, hh, s, ...rest),
    cone: (r, hh, s = 8) => new THREE.ConeGeometry(r, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

const POUCH = [[0, 0], [0.22, 0.03], [0.4, 0.14], [0.48, 0.32], [0.45, 0.5], [0.33, 0.64], [0.19, 0.72], [0.15, 0.76]];

function pouch(K, p, s, body, tie, coin = null) {
  const THREE = K.THREE, g = K.grp(p), b = K.grp(g); b.scale.z = 0.78;
  K.add(b, new THREE.LatheGeometry(POUCH.map(([r, t]) => new THREE.Vector2(r * s, t * s)), 20), body);
  K.add(b, K.cyl(s * 0.3, s * 0.14, s * 0.2, 16), body, 0, s * 0.86, 0);
  K.add(b, K.tor(s * 0.3, s * 0.035, 6, 20), body, 0, s * 0.96, 0).rotation.x = Math.PI / 2;
  K.add(b, K.tor(s * 0.165, s * 0.045, 6, 18), tie, 0, s * 0.75, 0).rotation.x = Math.PI / 2;
  [-1, 1].forEach(x => K.add(g, K.sph(s * 0.065, 10, 8), tie, x * s * 0.09, s * 0.68, s * 0.15));
  if (coin) K.add(g, K.cyl(s * 0.1, s * 0.1, s * 0.03, 14), coin, 0, s * 0.34, s * 0.37).rotation.x = Math.PI / 2;
  return g;
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

function headband(K, g, HR, c) {
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * 0.06, 6, 30, Math.PI), c, 0, 0, 0, true);
  return band;
}

function saekdongBand(K, g, HR, colors) {
  const band = K.grp(g); band.rotation.x = 0.45;
  const n = 15;
  for (let i = 0; i < n; i++) {
    K.add(band, K.tor(HR * 1.08, HR * 0.06, 6, 4, Math.PI / n + 0.01), colors[i % colors.length], 0, 0, 0, true).rotation.z = i / n * Math.PI;
  }
  return band;
}

const SIDE = -0.92;

function sideSpot(K, g, k, ang, rk, dz = 0) {
  const p = arcPt(K.THREE, k, ang, rk).applyAxisAngle(K.V(1, 0, 0), 0.45);
  return K.grp(g, p.x, p.y, p.z + dz);
}

function hangPouch(K, g, k, HR, s, body, tie, coin) {
  const ang = SIDE * 0.72, e = sideSpot(K, g, k, ang, 1.1, HR * 0.03);
  e.rotation.set(0.1, 0.35, ang * 0.85);
  const pc = pouch(K, e, s, body, tie, coin);
  pc.position.y = s * 0.08;
  return e;
}

export function buildPouchBandA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, NY.dahong);
  hangPouch(K, g, k, HR, HR * 0.52, NY.dahong, NY.norang);
  flatten(THREE, g);
}

export function buildPouchBandB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  saekdongBand(K, g, HR, [NY.dahong, NY.norang, NY.yeondu, NY.jjok, NY.pink]);
  hangPouch(K, g, k, HR, HR * 0.48, NY.jjok, NY.norang);
  flatten(THREE, g);
}

export function buildPouchBandC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, NY.jjok);
  hangPouch(K, g, k, HR, HR * 0.52, NY.dahong, NY.norang, NY.norang);
  flatten(THREE, g);
}

function neckCord(K, g, r, c, tube) {
  K.add(g, K.tor(r, r * tube, 7, 36), c, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
}

function tieOn(THREE, K, k, g, r, build, at = 0.3) {
  const w = new THREE.Group(), inner = K.grp(w); inner.rotation.x = -0.35;
  build(inner);
  stickOn(THREE, k, g, w, K.V(r * at, -r * 0.24, r), 1.12);
}

export function buildGoreumTieA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r, NY.dahong, 0.12);
  tieOn(THREE, K, k, g, r, p => goreum(K, p, r * 0.95, NY.dahong, NY.dahongDk, NY.norang));
  flatten(THREE, g);
}

export function buildGoreumTieB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, NY.cream, 0.14);
  tieOn(THREE, K, k, g, r, p => goreum(K, p, r * 0.95, NY.jjok, NY.jjokDk, NY.jjokDk));
  flatten(THREE, g);
}

function norigae(K, p, s, knot, tassel) {
  const g = K.grp(p);
  K.add(g, K.cyl(s * 0.014, s * 0.014, s * 0.2, 6), knot, 0, -s * 0.02, 0);
  const kn = K.grp(g, 0, -s * 0.17, 0);
  K.add(kn, K.sph(s * 0.085, 12, 8), knot).scale.set(1, 1, 0.6);
  [0, 1, 2, 3].forEach(i => {
    const a = i / 4 * TAU + Math.PI / 4;
    K.add(kn, K.tor(s * 0.055, s * 0.02, 5, 12), knot, Math.cos(a) * s * 0.1, Math.sin(a) * s * 0.1, 0);
  });
  K.add(g, K.sph(s * 0.045, 10, 8), NY.norangDk, 0, -s * 0.3, 0);
  K.add(g, K.cyl(s * 0.04, s * 0.075, s * 0.24, 12), tassel, 0, -s * 0.44, 0);
  K.add(g, K.tor(s * 0.042, s * 0.014, 5, 12), NY.norangDk, 0, -s * 0.34, 0).rotation.x = Math.PI / 2;
  return g;
}

export function buildGoreumTieC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, NY.jjok, 0.07);
  tieOn(THREE, K, k, g, r, p => norigae(K, p, r * 1.25, NY.dahong, NY.norang), 0.1);
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

function disc(K, p, r, c, x, y, z, t = 0.02) {
  K.add(p, K.cyl(r, r, t, 20), c, x, y, z).rotation.x = Math.PI / 2;
}

function stick(K, p, a, b, r, c) {
  const A = K.V(...a), B = K.V(...b), m = K.add(p, K.cyl(r, r, A.distanceTo(B), 5), c, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, true);
  m.quaternion.setFromUnitVectors(K.V(0, 1, 0), B.sub(A).normalize());
}

export const PACK_Y = Object.freeze({ bushy: 0.74, curl: 0.86, puff: 0.66, feather: 0.62 });
const packY = k => PACK_Y[tailType(k.tail)] ?? 0.56;
const FEATHER_Y = -0.2;
const liftY = (k, dy) => tailType(k.tail) === 'feather' ? FEATHER_Y : packY(k) + dy;

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

export function buildKitePackA(THREE, g, k0, h, yc = liftY(k0, 0.05)) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, yc);
  const w = R * 0.6, hh = R * 0.52, d = R * 0.08, zf = -R * 0.03 - d - R * 0.03;
  slab(K, f, roundRect(THREE, w, hh, R * 0.12), d, NY.cream, -R * 0.03, R * 0.03);
  const sr = R * 0.008;
  stick(K, f, [-w * 0.44, hh * 0.44, zf], [w * 0.44, -hh * 0.44, zf], sr, NY.wood);
  stick(K, f, [w * 0.44, hh * 0.44, zf], [-w * 0.44, -hh * 0.44, zf], sr, NY.wood);
  stick(K, f, [0, hh * 0.46, zf], [0, -hh * 0.46, zf], sr, NY.wood);
  disc(K, f, w * 0.17, NY.jjok, 0, 0, zf - R * 0.005, R * 0.02);
  K.add(f, K.tor(w * 0.17, R * 0.012, 5, 22), NY.jjokDk, 0, 0, zf - R * 0.012);
  const top = K.add(f, K.cyl(w * 0.14, w * 0.14, R * 0.02, 20, 1, false, Math.PI / 2, Math.PI), NY.dahong, 0, hh / 2 - R * 0.005, zf);
  top.rotation.x = Math.PI / 2;
  [NY.dahong, NY.norang, NY.yeondu].forEach((c, i) => K.add(f, new THREE.BoxGeometry(w * 0.9, hh * 0.065, R * 0.03), c, 0, -hh / 2 + hh * (0.08 + i * 0.075), zf - R * 0.005, true));
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.34, -R * 0.03), K.V(w * 0.3, hh * 0.34, -R * 0.03)], NY.dahongDk);
  flatten(THREE, g);
}

export function buildKitePackB(THREE, g, k0, h, yc = liftY(k0, 0.08)) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, yc);
  const w = R * 0.56, hh = R * 0.5, d = R * 0.08, zf = -R * 0.03 - d - R * 0.03;
  slab(K, f, diamond(THREE, w, hh, R * 0.12), d, NY.jjok, -R * 0.03, R * 0.03);
  slab(K, f, diamond(THREE, w * 0.56, hh * 0.56, R * 0.04), R * 0.02, NY.cream, zf + R * 0.02, R * 0.012);
  disc(K, f, R * 0.07, NY.dahong, 0, 0, zf - R * 0.02, R * 0.025);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.16, hh * 0.3, -R * 0.03), K.V(w * 0.16, hh * 0.3, -R * 0.03)], NY.jjokDk);
  flatten(THREE, g);
}

export function buildKitePackC(THREE, g, k0, h, yc = liftY(k0, 0)) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, yc);
  const w = R * 0.7, hh = R * 0.56, d = R * 0.16, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.14, w * 0.5), d, NY.dahong, -R * 0.03, R * 0.04);
  const fh = hh * 0.5, fl = slab(K, f, roundRect(THREE, w * 1.0, fh, R * 0.1, w * 0.5), R * 0.025, NY.dahongDk, zf, R * 0.015);
  fl.position.y = hh / 2 - fh / 2 + R * 0.02;
  const ky = hh / 2 - fh + R * 0.02, kz = zf - R * 0.04;
  const em = K.grp(f, 0, ky, kz);
  slab(K, em, diamond(THREE, R * 0.26, R * 0.3, R * 0.025), R * 0.02, NY.norang, 0, R * 0.01);
  disc(K, em, R * 0.035, NY.jjok, 0, 0, -R * 0.035, R * 0.015);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.36, -R * 0.03), K.V(w * 0.3, hh * 0.36, -R * 0.03)], NY.dahongDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, y, z, rotZ = 0) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

function yutStick(THREE, g, h, L, rr, o, x, z, a, c, dots) {
  const m = h.put(g, new THREE.Mesh(new THREE.CapsuleGeometry(rr, L, 2, 10), h.film(c, o)), x, 0.008, z, false);
  m.rotation.set(Math.PI / 2, 0, a); m.scale.set(1, 1, 0.15); m.renderOrder = 8;
  if (dots) [-0.22, 0, 0.22].forEach(t => flat(THREE, g, h, new THREE.CircleGeometry(rr * 0.42, 8), dots, o, x - Math.sin(a) * t * L, 0.011, z + Math.cos(a) * t * L));
}

export function buildYutTrailA(THREE, g, s, o, id, h) {
  yutStick(THREE, g, h, s * 0.78, s * 0.1, o, 0, 0, 0.5, NY.yut, NY.dahong);
  yutStick(THREE, g, h, s * 0.78, s * 0.1, o, 0, 0, -0.5, NY.yut, NY.dahong);
}

export function buildYutTrailB(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.3, 20), NY.dahong, o, 0, 0.008, 0);
  [0, 1, 2, 3].forEach(i => {
    const a = i / 4 * TAU + Math.PI / 4;
    flat(THREE, g, h, new THREE.CircleGeometry(s * 0.12, 14), i % 2 ? NY.norang : NY.jjok, o, Math.cos(a) * s * 0.58, 0.009, Math.sin(a) * s * 0.58);
  });
}

export function buildYutTrailC(THREE, g, s, o, id, h) {
  [-1.5, -0.5, 0.5, 1.5].forEach((t, i) => yutStick(THREE, g, h, s * 0.7, s * 0.085, o, t * s * 0.22, 0, 0, i === 2 ? NY.dahong : NY.yut, i === 2 ? null : NY.dahongDk));
}

export const VARIANTS = {
  ny_pouch_band: {
    slot: 'head', name: '복주머니 머리띠', rec: 'C',
    A: { name: '다홍 복주머니 머리띠', note: '가는 다홍 머리띠 · 귀 옆에 작은 다홍 복주머니 · 노랑 끈', build: buildPouchBandA },
    B: { name: '색동 머리띠', note: '가는 색동 머리띠 · 귀 옆에 작은 쪽빛 복주머니', build: buildPouchBandB },
    C: { name: '쪽빛 머리띠 + 엽전', note: '가는 쪽빛 머리띠 · 다홍 복주머니에 노랑 엽전 한 점', build: buildPouchBandC },
    REF: { name: '루돌프 뿔 머리띠', note: '출시된 크리스마스 머리띠 (비교용)', ref: 'xm_antler_band' },
  },
  ny_goreum_tie: {
    slot: 'neck', name: '한복 고름 목도리', rec: 'A',
    A: { name: '다홍 고름', note: '다홍 목끈 · 한쪽 고리와 긴 끈 둘 · 노랑 매듭', build: buildGoreumTieA },
    B: { name: '동정 깃 + 쪽빛 고름', note: '크림 동정 목끈 · 쪽빛 고름', build: buildGoreumTieB },
    C: { name: '노리개', note: '가는 쪽빛 줄 · 다홍 매듭 · 노랑 술', build: buildGoreumTieC },
    REF: { name: '호랑가시 리본 타이', note: '출시된 크리스마스 목장식 (비교용)', ref: 'xm_holly_tie' },
  },
  ny_kite_pack: {
    slot: 'back', cols: 'pack', name: '연 배낭', rec: 'C',
    A: { name: '방패연 배낭', note: '크림 방패연 · 쪽빛 방구멍 · 다홍 꼭지 · 아래 색동 띠 셋', build: buildKitePackA },
    B: { name: '가오리연 배낭', note: '쪽빛 마름모 연 · 크림 안쪽 · 다홍 점', build: buildKitePackB },
    C: { name: '연 단추 배낭', note: '둥근 다홍 배낭 · 덮개에 작은 노랑 연 하나', build: buildKitePackC },
    REF: { name: '컵케이크 배낭', note: '출시된 디저트 배낭 (비교용)', ref: 'ds_cupcake_pack', anchor: 'back' },
    REF2: { name: '고슴도치 배낭', note: '출시된 숲 배낭 (비교용)', ref: 'fp_hedgehog_pack', anchor: 'back' },
  },
  ny_yut_trail: {
    slot: 'trail', name: '윷 발자국', rec: 'A',
    A: { name: '윷가락 둘', note: '엇갈린 나무색 윷가락 둘 · 다홍 점 셋씩', build: buildYutTrailA },
    B: { name: '윷판 점', note: '다홍 동그라미 · 노랑·쪽빛 작은 점 넷', build: buildYutTrailB },
    C: { name: '윷 넷 (걸)', note: '나란한 윷가락 넷 · 하나만 뒤집혀 다홍', build: buildYutTrailC },
    REF: { name: '크림 발자국', note: '출시된 디저트 발자국 (비교용)', ref: 'ds_cream_trail' },
  },
};
