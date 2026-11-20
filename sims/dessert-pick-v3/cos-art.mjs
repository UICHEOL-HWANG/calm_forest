import { onSurf } from '../../js/cosmetics/anchors.js';
import { tubeAlong, withAnchors, flatten } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt } from '../../js/cosmetics/art-forest-pick.js';

export const DS = Object.freeze({
  pink: 0xf2a9ba, pinkDk: 0xd98a9e,
  cream: 0xeed2d4,
  berry: 0xd9505e, berrySoft: 0xe2707e,
  leaf: 0x6aa86a, leafDk: 0x4f8a54,
  mint: 0x93cfb8, mintDk: 0x6db59a,
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

function dollop(K, p, s) {
  const g = K.grp(p);
  K.add(g, K.sph(s * 0.5, 14, 10), DS.cream, 0, s * 0.12, 0).scale.set(1, 0.55, 1);
  K.add(g, K.tor(s * 0.42, s * 0.2, 8, 18), DS.cream, 0, s * 0.1, 0).rotation.x = Math.PI / 2;
  K.add(g, K.tor(s * 0.26, s * 0.16, 8, 16), DS.cream, 0, s * 0.36, 0).rotation.x = Math.PI / 2;
  K.add(g, K.cone(s * 0.2, s * 0.34, 10), DS.cream, 0, s * 0.62, 0);
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

function flatBow(K, p, s, loop, tail, knot = true) {
  const THREE = K.THREE, b = K.grp(p);
  const ex = (sh, d) => {
    const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: s * 0.018, bevelThickness: s * 0.018, bevelSegments: 2, curveSegments: 10 });
    geo.translate(0, 0, -d / 2); return geo;
  };
  [-1, 1].forEach(x => {
    K.add(b, ex(loopShape(THREE, s), s * 0.06), loop).rotation.y = x < 0 ? Math.PI : 0;
    K.add(b, ex(tailShape(THREE, s), s * 0.04), tail, x * s * 0.03, -s * 0.02, -s * 0.03).rotation.y = x < 0 ? Math.PI : 0;
  });
  if (knot) K.add(b, K.sph(s * 0.1, 12, 8), tail, 0, 0, s * 0.03).scale.set(1, 1.1, 0.75);
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

function headband(K, g, HR, c) {
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * 0.06, 6, 30, Math.PI), c, 0, 0, 0, true);
  return band;
}

const SIDE = -0.92;

function sideSpot(K, g, k, ang, rk, dz = 0) {
  const p = arcPt(K.THREE, k, ang, rk).applyAxisAngle(K.V(1, 0, 0), 0.45);
  return K.grp(g, p.x, p.y, p.z + dz);
}

export function buildCakeHatA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, DS.pink);
  const s = HR * 0.34, e = sideSpot(K, g, k, SIDE, 1.1, HR * 0.04);
  const sb = strawberry(K, e, s); sb.rotation.set(0.15, 0, 0.45); sb.position.set(Math.sin(0.45) * s * 0.92, -Math.cos(0.45) * s * 0.92 + s * 0.12, 0);
  const d = dollop(K, sideSpot(K, g, k, SIDE * 0.66, 1.12, HR * 0.03), HR * 0.2);
  d.rotation.set(0.2, 0, SIDE * 0.66);
  flatten(THREE, g);
}

function cakeSlice(K, p, w) {
  const THREE = K.THREE, g = K.grp(p);
  const tri = new THREE.Shape();
  tri.moveTo(0, w * 0.42); tri.lineTo(-w * 0.5, -w * 0.3); tri.lineTo(w * 0.5, -w * 0.3); tri.lineTo(0, w * 0.42);
  let y = 0;
  [[0.16, DS.cream], [0.07, DS.pink], [0.16, DS.cream], [0.08, DS.pink]].forEach(([t, c]) => {
    K.add(g, new THREE.ExtrudeGeometry(tri, { depth: w * t, bevelEnabled: false }), c, 0, y, 0, true).rotation.x = -Math.PI / 2;
    y += w * t;
  });
  strawberry(K, g, w * 0.36).position.set(0, y - w * 0.01, w * 0.02);
  return g;
}

export function buildCakeHatB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const e = sideSpot(K, g, k, SIDE, 1.02, HR * 0.06); e.rotation.z = SIDE * 0.6;
  K.add(e, new THREE.BoxGeometry(HR * 0.36, HR * 0.045, HR * 0.08), DS.pinkDk, 0, 0, 0, true);
  const c = cakeSlice(K, e, HR * 0.38); c.position.set(0, HR * 0.02, 0); c.rotation.set(0.12, 0.55, 0);
  flatten(THREE, g);
}

export function buildCakeHatC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, DS.pink);
  const e = sideSpot(K, g, k, SIDE, 1.1, HR * 0.06); e.rotation.set(0.1, 0.45, SIDE * 0.7);
  flatBow(K, e, HR * 0.78, DS.pink, DS.pinkDk, false);
  const sb = strawberry(K, e, HR * 0.2); sb.position.set(0, -HR * 0.1, HR * 0.04);
  flatten(THREE, g);
}

function neckWrap(K, g, r, c, tube) {
  K.add(g, K.tor(r, r * tube, 7, 36), c, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
}

export function buildMacaronBroochA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckWrap(K, g, r * 1.01, DS.pinkDk, 0.045);
  const w = new THREE.Group();
  K.add(w, K.tor(r * 0.05, r * 0.016, 6, 12), DS.cream, 0, r * 0.03, 0);
  const m = macaron(K, w, r * 0.19, DS.mint, DS.cream); m.position.set(0, -r * 0.2, r * 0.02); m.rotation.set(0.9, 0, 0.2);
  stickOn(THREE, k, g, w, K.V(0, -r * 0.08, r), 1.1);
  flatten(THREE, g);
}

export function buildMacaronBroochB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckWrap(K, g, r, DS.pink, 0.12);
  const w = new THREE.Group();
  flatBow(K, w, r * 1.05, DS.pink, DS.pinkDk, false);
  const m = macaron(K, w, r * 0.12, DS.mint, DS.cream); m.position.z = r * 0.05; m.rotation.x = 0.9;
  stickOn(THREE, k, g, w, K.V(0, -r * 0.26, r), 1.12);
  flatten(THREE, g);
}

export function buildMacaronBroochC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR, N = 30;
  neckWrap(K, g, r * 1.02, DS.pink, 0.06);
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * TAU, d = new THREE.Group();
    K.add(d, K.cyl(r * 0.17, r * 0.17, r * 0.03, 16), DS.cream, 0, -r * 0.06, 0, true).rotation.x = Math.PI / 2;
    stickOn(THREE, k, g, d, K.V(Math.sin(a) * r, -r * 0.16, Math.cos(a) * r), 1.04 + (i % 2) * 0.012);
  }
  const s = new THREE.Group();
  strawberry(K, s, r * 0.24).rotation.set(0.25, 0, Math.PI);
  stickOn(THREE, k, g, s, K.V(0, -r * 0.08, r), 1.14);
  flatten(THREE, g);
}

function sideBag(THREE, g, k, h, strap) {
  const K = kit(THREE, h), R = k.R, tube = R * 0.04;
  const L = (x, y, z, out) => { const p = onSurf(k.bs, k.R, k.bodyY, x, y, z, out); return new THREE.Vector3(p.x - k.side.x, p.y - k.side.y, p.z - k.side.z); };
  const hook = L(-0.8, 0.0, 0.48), shoulder = L(0.55, 0.8, 0.2);
  const n = new THREE.Vector3(hook.x + k.side.x, (hook.y + k.side.y - k.bodyY) / (k.bs[1] * k.bs[1]), hook.z + k.side.z).normalize();
  [[L(-0.5, 0.12, 0.85), L(0.04, 0.5, 0.86)], [L(-0.66, 0.18, -0.75), L(-0.12, 0.64, -0.78)]].forEach(mid =>
    g.add(tubeAlong(THREE, [hook, ...mid, shoulder], tube, h.clay(strap), 28, 6)));
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(tube * 1.4, 8, 6), h.clay(strap)), shoulder.x, shoulder.y, shoulder.z, false);
  K.add(g, K.tor(R * 0.045, R * 0.016, 6, 12), strap, hook.x, hook.y, hook.z);
  const bag = K.grp(g, hook.x + n.x * R * 0.1, hook.y + R * 0.04, hook.z + n.z * R * 0.1);
  bag.rotation.y = Math.atan2(n.x, n.z); bag.scale.setScalar(1.4);
  return { K, R, bag };
}

export function buildCupcakePackA(THREE, g, k, h) {
  const { K, R, bag } = sideBag(THREE, g, k, h, DS.pinkDk);
  const body = K.grp(bag); body.scale.z = 0.62;
  const rb = R * 0.12, rt = R * 0.165, H = R * 0.17, y0 = -R * 0.36, yc = y0 + H + rt * 0.66;
  K.add(body, new THREE.LatheGeometry([[0, 0], [rb, 0], [rt, H], [0, H]].map(([a, b]) => new THREE.Vector2(a, b)), 20), DS.pink, 0, y0, 0, true);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU, ra = (rt + rb) / 2 + R * 0.006, tilt = Math.atan2(rt - rb, H);
    K.add(body, K.cyl(R * 0.012, R * 0.012, H * 0.92, 4), DS.pinkDk, Math.cos(a) * ra, y0 + H * 0.5, Math.sin(a) * ra).rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
  }
  K.add(body, K.sph(rt * 1.06, 20, 12), DS.cream, 0, y0 + H, 0).scale.set(1, 0.62, 1);
  K.add(body, K.tor(rt * 0.98, R * 0.022, 6, 24), DS.cream, 0, y0 + H, 0).rotation.x = Math.PI / 2;
  K.add(bag, K.sph(R * 0.042, 12, 10), DS.berry, 0, yc + R * 0.03, 0);
  bag.add(tubeAlong(THREE, [K.V(0, yc + R * 0.06, 0), K.V(R * 0.015, yc + R * 0.11, 0), K.V(R * 0.05, yc + R * 0.13, 0)], R * 0.008, h.clay(DS.leafDk), 6, 4));
  [-1, 1].forEach(s => bag.add(tubeAlong(THREE, [K.V(0, R * 0.02, 0), K.V(s * rt * 0.55, y0 + H + R * 0.07, 0), K.V(s * rt * 0.95, y0 + H, 0)], R * 0.016, h.clay(DS.pinkDk), 8, 5)));
  flatten(THREE, g);
}

export function buildCupcakePackB(THREE, g, k, h) {
  const { K, R, bag } = sideBag(THREE, g, k, h, DS.pinkDk);
  const s = R * 0.36, top = -R * 0.08;
  const sb = strawberry(K, bag, s, DS.berrySoft); sb.rotation.z = Math.PI; sb.position.y = top; sb.scale.z = 0.6;
  [-1, 1].forEach(x => bag.add(tubeAlong(THREE, [K.V(0, R * 0.02, 0), K.V(x * s * 0.14, top - s * 0.02, 0), K.V(x * s * 0.28, top - s * 0.1, 0)], R * 0.016, h.clay(DS.pinkDk), 8, 5)));
  const prof = t => { for (let i = 0; i < SB.length - 1; i++) if (t <= SB[i + 1][1]) return SB[i][0] + (SB[i + 1][0] - SB[i][0]) * (t - SB[i][1]) / (SB[i + 1][1] - SB[i][1]); return 0; };
  [[-0.12, 0.3], [0.12, 0.3], [0, 0.48], [-0.16, 0.56], [0.16, 0.56], [-0.07, 0.72], [0.07, 0.72]].forEach(([x, y]) => {
    const rr = prof(1 - y) * s, zz = Math.sqrt(Math.max(0, rr * rr - (x * s) ** 2)) * 0.6;
    K.add(bag, K.sph(R * 0.014, 6, 4), DS.cream, x * s, top - y * s, zz + R * 0.003).scale.set(0.8, 1.3, 0.6);
  });
  flatten(THREE, g);
}

export function buildCupcakePackC(THREE, g, k, h) {
  const { K, R, bag } = sideBag(THREE, g, k, h, DS.pinkDk);
  const r = R * 0.2, yc = -R * 0.2;
  const m = macaron(K, bag, r, DS.mint, DS.cream); m.position.y = yc; m.scale.z = 0.8;
  const b = flatBow(K, bag, R * 0.24, DS.pink, DS.pinkDk); b.position.set(0, yc + r * 0.05, r * 0.86);
  [-1, 1].forEach(s => bag.add(tubeAlong(THREE, [K.V(0, R * 0.02, 0), K.V(s * r * 0.5, -R * 0.02, 0), K.V(s * r * 0.85, yc + r * 0.25, 0)], R * 0.016, h.clay(DS.mintDk), 8, 5)));
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

function flat(THREE, g, h, geo, c, o, x, y, z, rotZ = 0) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

export function buildCreamTrailA(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.ShapeGeometry(heart(THREE, s * 0.58), 12), DS.pink, o, 0, 0.008, 0, Math.PI);
  [[0.62, 0.2, DS.cream, 0.5], [-0.5, -0.45, DS.mint, 2.0]].forEach(([x, z, c, a]) => {
    const m = h.put(g, new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.05, s * 0.16, 2, 6), h.film(c, o)), x * s, 0.01, z * s, false);
    m.rotation.set(Math.PI / 2, 0, a); m.renderOrder = 10;
  });
}

export function buildCreamTrailB(THREE, g, s, o, id, h) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.95);
  sh.bezierCurveTo(0.55, -0.62, 0.74, 0.15, 0.55, 0.5);
  sh.bezierCurveTo(0.36, 0.76, -0.36, 0.76, -0.55, 0.5);
  sh.bezierCurveTo(-0.74, 0.15, -0.55, -0.62, 0, -0.95);
  const sc = s * 0.55, geo = new THREE.ShapeGeometry(sh, 12); geo.scale(sc, sc, 1);
  flat(THREE, g, h, geo, DS.berrySoft, o, 0, 0.008, 0, Math.PI);
  [[-0.24, 0], [0.24, 0], [0, -0.38]].forEach(([x, y]) => flat(THREE, g, h, new THREE.CircleGeometry(s * 0.04, 8), DS.cream, o, x * sc, 0.01, -y * sc).scale.set(0.7, 1, 1));
  [-1, 0, 1].forEach(i => {
    const lf = flat(THREE, g, h, new THREE.CircleGeometry(sc * 0.2, 10), DS.leaf, o, i * sc * 0.2, 0.011, 0.6 * sc, i * 0.7);
    lf.scale.set(0.55, 1, 1);
  });
}

export function buildCreamTrailC(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.42, 24), DS.cream, o, 0, 0.008, 0);
  const pts = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39, a = t * TAU * 1.6, rr = s * (0.06 + 0.26 * t);
    return new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr);
  });
  const sw = h.put(g, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, s * 0.035, 4, false), h.film(DS.pink, o)), 0, 0.011, 0, false);
  sw.scale.y = 0.15; sw.renderOrder = 11;
}

export const VARIANTS = {
  ds_cake_hat: {
    slot: 'head', name: '딸기 케이크 머리띠', rec: 'A',
    A: { name: '딸기 머리띠', note: '가는 분홍 머리띠 · 귀 옆에 작은 딸기 하나와 크림 한 점', build: buildCakeHatA },
    B: { name: '쇼트케이크 머리핀', note: '귀 옆 분홍 핀 · 딸기 올린 작은 케이크 조각 하나', build: buildCakeHatB },
    C: { name: '리본 머리띠', note: '가는 분홍 머리띠 · 납작한 리본 두 고리 · 가운데 작은 딸기', build: buildCakeHatC },
    REF: { name: '루돌프 뿔 머리띠', note: '출시된 크리스마스 머리띠 (비교용)', ref: 'xm_antler_band' },
  },
  ds_macaron_brooch: {
    slot: 'neck', name: '마카롱 목걸이', rec: 'B',
    A: { name: '마카롱 줄목걸이', note: '가는 분홍 줄 · 가운데 민트 마카롱 참 하나', build: buildMacaronBroochA },
    B: { name: '리본 타이 + 마카롱', note: '분홍 목끈 · 납작한 리본 · 매듭 자리에 작은 민트 마카롱', build: buildMacaronBroochB },
    C: { name: '크림 레이스 칼라', note: '물결 크림 칼라 · 분홍 줄 · 앞에 작은 딸기', build: buildMacaronBroochC },
    REF: { name: '호랑가시 리본 타이', note: '출시된 크리스마스 목장식 (비교용)', ref: 'xm_holly_tie' },
  },
  ds_cupcake_pack: {
    slot: 'back', anchor: 'side', cols: 'pochette', name: '컵케이크 크로스백', rec: 'A',
    A: { name: '컵케이크 크로스백', note: '가슴을 가로지르는 끈 · 옆구리에 작은 분홍 컵 · 크림 뚜껑 · 체리', build: buildCupcakePackA },
    B: { name: '딸기 크로스백', note: '옆구리에 작은 딸기 모양 가방 · 크림 씨앗 · 초록 꼭지', build: buildCupcakePackB },
    C: { name: '마카롱 동전지갑', note: '옆구리에 작은 민트 마카롱 · 앞에 분홍 리본 하나', build: buildCupcakePackC },
    REF: { name: '선물 꾸러미 배낭', note: '출시된 크리스마스 배낭 (비교용)', ref: 'xm_gift_pack', anchor: 'back' },
  },
  ds_cream_trail: {
    slot: 'trail', name: '크림 발자국', rec: 'A',
    A: { name: '하트 스프링클', note: '작은 분홍 하트 · 크림과 민트 스프링클 두 개', build: buildCreamTrailA },
    B: { name: '딸기 도장', note: '작은 딸기 모양 · 크림 씨앗 셋 · 초록 꼭지', build: buildCreamTrailB },
    C: { name: '크림 소용돌이', note: '작은 크림 동그라미 · 분홍 소용돌이 한 줄', build: buildCreamTrailC },
    REF: { name: '별가루 발자국', note: '출시된 크리스마스 발자국 (비교용)', ref: 'xm_stardust_trail' },
  },
};
