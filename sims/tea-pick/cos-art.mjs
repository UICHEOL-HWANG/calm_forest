import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt } from '../../js/cosmetics/art-forest-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';

export const TC = Object.freeze({
  matcha: 0x8fb45a, matchaDk: 0x67904a, bud: 0xb4cf78,
  celadon: 0x9cc6b2, celadonDk: 0x74a390,
  cream: 0xe2d4b6, wood: 0xc2905c, woodDk: 0x8e6440,
  persimmon: 0xe57c48, persimDk: 0xc45f36,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 18, b = 14, ...rest) => new THREE.SphereGeometry(r, a, b, ...rest),
    cyl: (a, b, hh, s = 20, ...rest) => new THREE.CylinderGeometry(a, b, hh, s, ...rest),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    lathe: (pts, s = 28) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function ex(THREE, sh, d, bev) {
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -d / 2); return geo;
}

export function teaLeafShape(THREE, s) {
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

function teaBud(K, p, s, c = TC.bud) {
  const g = K.grp(p);
  K.add(g, K.sph(s, 14, 10), c).scale.set(0.62, 1.35, 0.62);
  return g;
}

function sprig(K, p, s, leafC = TC.matcha, leafC2 = TC.matchaDk) {
  const g = K.grp(p);
  teaLeaf(K, g, s, leafC, 0.95).position.z = -s * 0.02;
  teaLeaf(K, g, s * 0.86, leafC2, -0.85, TC.matchaDk).position.z = -s * 0.04;
  teaBud(K, g, s * 0.12).position.set(0, s * 0.62, s * 0.03);
  return g;
}

function persimmon(K, p, s) {
  const g = K.grp(p);
  K.add(g, K.sph(s, 18, 14), TC.persimmon).scale.set(1, 0.8, 1);
  for (let i = 0; i < 4; i++) {
    const l = K.add(g, K.sph(s * 0.3, 8, 6), TC.matchaDk, Math.cos(i / 4 * TAU) * s * 0.22, s * 0.72, Math.sin(i / 4 * TAU) * s * 0.22);
    l.scale.set(1, 0.3, 0.55); l.rotation.y = -i / 4 * TAU;
  }
  K.add(g, K.cyl(s * 0.06, s * 0.07, s * 0.2, 6), TC.woodDk, 0, s * 0.86, 0);
  return g;
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

export function buildLeafPinA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, TC.matchaDk);
  const e = sideSpot(K, g, k, HR);
  sprig(K, e, HR * 0.52).rotation.z = 0.15;
  flatten(THREE, g);
}

export function buildLeafPinB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const e = sideSpot(K, g, k, HR);
  const pin = K.grp(e); pin.rotation.z = 1.05;
  K.add(pin, K.cyl(HR * 0.04, HR * 0.032, HR * 0.86, 10), TC.wood, 0, 0, HR * 0.02);
  K.add(pin, K.sph(HR * 0.09, 16, 12), TC.persimmon, 0, HR * 0.45, HR * 0.02);
  teaLeaf(K, e, HR * 0.46, TC.matcha, 0.75).position.set(-HR * 0.02, -HR * 0.02, -HR * 0.03);
  teaLeaf(K, e, HR * 0.38, TC.matchaDk, -0.6).position.set(HR * 0.02, -HR * 0.02, -HR * 0.05);
  teaBud(K, e, HR * 0.06).position.set(-HR * 0.02, HR * 0.2, 0);
  flatten(THREE, g);
}

export function buildLeafPinC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, TC.celadonDk);
  const e = sideSpot(K, g, k, HR);
  teaLeaf(K, e, HR * 0.44, TC.matcha, 1.15).position.z = -HR * 0.05;
  teaLeaf(K, e, HR * 0.36, TC.matchaDk, -0.75).position.z = -HR * 0.06;
  persimmon(K, e, HR * 0.16).position.set(0, HR * 0.02, HR * 0.06);
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

function teacup(K, p, s, c = TC.celadon, rim = TC.celadonDk) {
  const g = K.grp(p);
  K.add(g, K.cyl(s * 0.32, s * 0.34, s * 0.12, 20), rim, 0, -s * 0.34, 0);
  K.add(g, K.lathe([[0, -s * 0.28], [s * 0.36, -s * 0.28], [s * 0.62, -s * 0.12], [s * 0.76, s * 0.1], [s * 0.82, s * 0.28], [s * 0.74, s * 0.28], [s * 0.6, s * 0.06], [0, -s * 0.08]], 28), c);
  K.add(g, K.tor(s * 0.78, s * 0.045, 6, 28), rim, 0, s * 0.28, 0).rotation.x = Math.PI / 2;
  K.add(g, K.cyl(s * 0.68, s * 0.68, s * 0.02, 24), TC.matcha, 0, s * 0.2, 0);
  return g;
}

export function buildTeaCordA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r, TC.matchaDk, 0.12);
  front(THREE, K, k, g, r, w => {
    K.add(w, K.tor(r * 0.07, r * 0.022, 5, 12), TC.matchaDk, 0, r * 0.08, 0);
    const c = teacup(K, w, r * 0.4); c.position.set(0, -r * 0.13, r * 0.06); c.rotation.x = 0.18;
  });
  flatten(THREE, g);
}

function knot(K, p, s) {
  const g = K.grp(p);
  K.add(g, K.sph(s * 0.26, 14, 10), TC.persimmon, 0, 0, s * 0.02).scale.set(1, 1, 0.7);
  [[-1, 0], [1, 0], [0, 1]].forEach(([x, y]) => {
    const l = K.add(g, K.tor(s * 0.15, s * 0.06, 6, 14), TC.persimmon, x * s * 0.3, y * s * 0.3, 0);
    l.scale.set(1, 0.8, 0.7);
  });
  K.add(g, K.cyl(s * 0.11, s * 0.17, s * 0.56, 10), TC.persimDk, 0, -s * 0.56, 0);
  K.add(g, K.cyl(s * 0.12, s * 0.12, s * 0.06, 10), TC.cream, 0, -s * 0.3, 0);
  return g;
}

export function buildTeaCordB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, TC.cream, 0.12);
  front(THREE, K, k, g, r, w => {
    knot(K, w, r * 0.66).position.set(0, -r * 0.04, r * 0.04);
  });
  flatten(THREE, g);
}

export function buildTeaCordC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, TC.woodDk, 0.1);
  front(THREE, K, k, g, r, w => {
    const s = sprig(K, w, r * 0.56); s.rotation.z = Math.PI; s.position.set(0, r * 0.08, 0);
    K.add(w, K.sph(r * 0.09, 16, 12), TC.persimmon, 0, r * 0.08, r * 0.05);
  });
  flatten(THREE, g);
}

function packFrame(K, g, k, k0) {
  const c = backFront(k, packY(k0)), f = K.grp(g, 0, c.y + k.R * 0.04, c.z);
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

function pot(K, f, R, o) {
  const r = R * o.r, zc = -R * 0.03 - r * o.dz, body = K.grp(f, 0, 0, zc);
  body.scale.z = o.dz;
  K.add(body, K.sph(r, 32, 24), o.body).scale.y = 0.74;
  K.add(body, K.tor(r * 1.0, r * 0.05, 6, 32), o.band, 0, -r * 0.08, 0).rotation.x = Math.PI / 2;
  const top = r * 0.74;
  K.add(body, K.cyl(r * 0.5, r * 0.56, r * 0.1, 22), o.lid, 0, top - r * 0.02, 0);
  K.add(body, K.sph(r * 0.48, 22, 10, 0, TAU, 0, Math.PI / 2), o.lid, 0, top + r * 0.02, 0).scale.y = 0.3;
  K.add(body, K.sph(r * 0.1, 14, 10), o.knob, 0, top + r * 0.15, 0);
  const sp = K.grp(f, r * 0.82, -r * 0.08, zc); sp.rotation.z = -0.85;
  K.add(sp, K.cyl(r * 0.08, r * 0.15, r * 0.5, 12), o.body, 0, r * 0.22, 0);
  return { r, zc, top };
}

export function buildTeapotPackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const { r, zc } = pot(K, f, R, { r: 0.33, dz: 0.3, body: TC.celadon, band: TC.celadonDk, lid: TC.celadon, knob: TC.persimmon });
  const hd = K.add(f, K.tor(r * 0.3, r * 0.07, 6, 18, Math.PI * 1.3), TC.celadonDk, -r * 0.92, -r * 0.02, zc);
  hd.rotation.z = Math.PI * 0.35;
  const lf = K.grp(f, -r * 0.2, -r * 0.3, zc - r * 0.31); lf.rotation.y = Math.PI;
  teaLeaf(K, lf, r * 0.42, TC.matcha, 0.5);
  teaLeaf(K, lf, r * 0.34, TC.matchaDk, -0.6);
  packStraps(THREE, g, k, h, f, [K.V(-r * 0.6, r * 0.4, -R * 0.03), K.V(r * 0.6, r * 0.4, -R * 0.03)], TC.woodDk);
  flatten(THREE, g);
}

export function buildTeapotPackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const { r, zc } = pot(K, f, R, { r: 0.33, dz: 0.3, body: TC.cream, band: TC.matcha, lid: TC.matcha, knob: TC.persimmon });
  const hd = K.grp(f, -r * 0.86, r * 0.02, zc); hd.rotation.z = Math.PI / 2 + 0.25;
  K.add(hd, K.cyl(r * 0.1, r * 0.13, r * 0.36, 12), TC.wood, 0, r * 0.16, 0);
  K.add(hd, K.sph(r * 0.11, 12, 8), TC.woodDk, 0, r * 0.36, 0);
  const lf = K.grp(f, 0, -r * 0.34, zc - r * 0.3); lf.rotation.y = Math.PI;
  teaLeaf(K, lf, r * 0.36, TC.matcha, 0.55);
  teaLeaf(K, lf, r * 0.3, TC.matchaDk, -0.55);
  packStraps(THREE, g, k, h, f, [K.V(-r * 0.6, r * 0.4, -R * 0.03), K.V(r * 0.6, r * 0.4, -R * 0.03)], TC.matchaDk);
  flatten(THREE, g);
}

export function buildTeapotPackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const { r, zc, top } = pot(K, f, R, { r: 0.33, dz: 0.3, body: TC.wood, band: TC.woodDk, lid: TC.celadon, knob: TC.celadonDk });
  const arc = K.grp(f, 0, top * 0.3, zc - r * 0.12);
  K.add(arc, K.tor(r * 0.72, r * 0.06, 6, 28, Math.PI), TC.matcha).scale.y = 0.86;
  [-1, 1].forEach(s => K.add(arc, K.sph(r * 0.09, 12, 8), TC.matchaDk, s * r * 0.72, 0, 0));
  K.add(f, K.sph(r * 0.1, 14, 10), TC.persimmon, -r * 0.3, -r * 0.24, zc - r * 0.3).scale.z = 0.5;
  packStraps(THREE, g, k, h, f, [K.V(-r * 0.6, r * 0.4, -R * 0.03), K.V(r * 0.6, r * 0.4, -R * 0.03)], TC.woodDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, z, rotZ, ro, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = ro;
  return m;
}

function flatLeaf(THREE, g, h, s, c, o, x, z, rot, ro, dy = 0) {
  const leaf = new THREE.ShapeGeometry(teaLeafShape(THREE, s), 10); leaf.translate(0, dy * s, 0);
  flat(THREE, g, h, leaf, c, o, x, z, rot, ro);
  const rib = new THREE.PlaneGeometry(s * 0.035, s * 0.7); rib.translate(0, s * 0.45 + dy * s, 0);
  flat(THREE, g, h, rib, TC.matchaDk, o, x, z, rot, ro + 1, 0.0095);
}

export function buildLeafTrailA(THREE, g, s, o, id, h) {
  flatLeaf(THREE, g, h, s * 1.25, TC.matcha, o, 0, 0, Math.PI + 0.2, 8, -0.5);
}

export function buildLeafTrailB(THREE, g, s, o, id, h) {
  flatLeaf(THREE, g, h, s * 0.9, TC.matcha, o, 0, s * 0.3, Math.PI + 0.7, 8);
  flatLeaf(THREE, g, h, s * 0.8, TC.matchaDk, o, 0, s * 0.3, Math.PI - 0.7, 10);
  flat(THREE, g, h, new THREE.ShapeGeometry(teaLeafShape(THREE, s * 0.6), 8), TC.bud, o, 0, s * 0.3, Math.PI, 12, 0.011).scale.x = 0.55;
}

export function buildLeafTrailC(THREE, g, s, o, id, h) {
  flatLeaf(THREE, g, h, s * 0.9, TC.matcha, o, -s * 0.12, s * 0.05, Math.PI + 0.35, 8, -0.4);
  flat(THREE, g, h, new THREE.RingGeometry(s * 0.24, s * 0.33, 26), TC.celadon, o, s * 0.36, -s * 0.36, 0, 11);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.09, 14), TC.persimmon, o, -s * 0.42, -s * 0.5, 0, 12);
}

export const VARIANTS = {
  tc_leaf_pin: {
    slot: 'head', name: '찻잎 머리핀', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '찻잎 순 머리띠', note: '가는 진녹 머리띠 · 귀 옆에 찻잎 둘과 연두 새순', build: buildLeafPinA },
    B: { name: '나무 비녀 찻잎', note: '띠 없이 귀 옆 나무 비녀 · 감빛 구슬 · 찻잎 둘', build: buildLeafPinB },
    C: { name: '찻잎과 작은 감', note: '가는 청자색 머리띠 · 찻잎 둘 · 작은 감 하나', build: buildLeafPinC },
    REF: { name: '딸기 케이크 머리띠', note: '출시된 디저트 머리띠 (비교용)', ref: 'ds_cake_hat' },
  },
  tc_tea_cord: {
    slot: 'neck', name: '다도 끈', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '찻잔 목걸이', note: '가는 진녹 끈 · 앞에 작은 청자 찻잔 하나', build: buildTeaCordA },
    B: { name: '감빛 매듭 끈', note: '크림 끈 · 앞에 감빛 매듭과 짧은 술', build: buildTeaCordB },
    C: { name: '찻잎 브로치 끈', note: '가는 나무색 끈 · 찻잎 둘과 새순 · 감빛 구슬', build: buildTeaCordC },
    REF: { name: '호랑가시 리본 타이', note: '출시된 크리스마스 목장식 (비교용)', ref: 'xm_holly_tie' },
  },
  tc_teapot_pack: {
    slot: 'back', cols: 'pack', name: '찻주전자 배낭', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '청자 찻주전자', note: '둥근 청자 주전자 · 옆 손잡이 · 감빛 꼭지 · 찻잎 둘', build: buildTeapotPackA },
    B: { name: '크림 옆손잡이 주전자', note: '크림 주전자 · 말차 뚜껑과 띠 · 옆으로 뻗은 나무 손잡이', build: buildTeapotPackB },
    C: { name: '나무 주전자 대나무 손잡이', note: '나무색 주전자 · 청자 뚜껑 · 위로 낮게 굽은 대나무 손잡이', build: buildTeapotPackC },
    REF2: { name: '고슴도치 배낭', note: '출시된 숲 배낭 (비교용)', ref: 'fp_hedgehog_pack', anchor: 'back' },
  },
  tc_leaf_trail: {
    slot: 'trail', name: '찻잎 발자국', rec: 'B', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '찻잎 한 장', note: '말차빛 찻잎 하나 · 진녹 잎맥', build: buildLeafTrailA },
    B: { name: '새순 두 잎', note: '찻잎 둘 사이로 연두 새순 하나', build: buildLeafTrailB },
    C: { name: '찻잎과 찻잔 자국', note: '찻잎 하나 · 청자 찻잔 고리 · 감빛 점', build: buildLeafTrailC },
    REF: { name: '크림 발자국', note: '출시된 디저트 발자국 (비교용)', ref: 'ds_cream_trail' },
  },
};
