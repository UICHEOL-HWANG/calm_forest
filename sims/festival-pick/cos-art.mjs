import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt } from '../../js/cosmetics/art-forest-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';

export const SF = Object.freeze({
  indigo: 0x46528e, indigoDk: 0x313a66,
  red: 0xd4503e, redDk: 0xa83c30,
  orange: 0xec8a3e, fish: 0xf07a3a, gold: 0xe0b450,
  cream: 0xe2d4b6, soft: 0xd8d4ce, wood: 0xc2905c,
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
    cone: (r, hh, s = 12) => new THREE.ConeGeometry(r, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    lathe: (pts, s = 28) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function foxMask(K, p, s, base, mark) {
  const g = K.grp(p);
  K.add(g, K.sph(s, 22, 16), base).scale.set(0.9, 1, 0.38);
  K.add(g, K.sph(s * 0.42, 16, 12), base, 0, -s * 0.46, s * 0.2).scale.set(0.82, 0.68, 0.62);
  K.add(g, K.sph(s * 0.1, 10, 8), mark, 0, -s * 0.56, s * 0.44);
  [-1, 1].forEach(sx => {
    const e = K.add(g, K.cone(s * 0.3, s * 0.56, 10), base, sx * s * 0.52, s * 0.9, -s * 0.02);
    e.rotation.z = -sx * 0.38; e.scale.z = 0.42;
    const i = K.add(g, K.cone(s * 0.16, s * 0.32, 8), mark, sx * s * 0.5, s * 0.86, s * 0.08);
    i.rotation.z = -sx * 0.38; i.scale.z = 0.3;
    const eye = K.add(g, K.cyl(s * 0.045, s * 0.045, s * 0.34, 8), mark, sx * s * 0.32, s * 0.1, s * 0.33);
    eye.rotation.z = Math.PI / 2 - sx * 0.45;
  });
  return g;
}

function headband(K, g, HR, c, tube = 0.06) {
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * tube, 6, 30, Math.PI), c, 0, 0, 0, true);
  return band;
}

const SIDE = -0.92;

function sideSpot(K, g, k, HR, face = 0.35) {
  const p = arcPt(K.THREE, k, SIDE, 1.1).applyAxisAngle(K.V(1, 0, 0), 0.45);
  const e = K.grp(g, p.x, p.y, p.z + HR * 0.06); e.rotation.set(0.1, face, SIDE * 0.5);
  return e;
}

export function buildMaskPinA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, SF.indigo);
  const e = sideSpot(K, g, k, HR);
  foxMask(K, e, HR * 0.31, SF.cream, SF.red).rotation.z = 0.25;
  flatten(THREE, g);
}

export function buildMaskPinB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const e = sideSpot(K, g, k, HR);
  foxMask(K, e, HR * 0.3, SF.cream, SF.red).rotation.z = 0.25;
  const t = K.grp(e, -HR * 0.16, -HR * 0.22, -HR * 0.02); t.rotation.z = 0.35;
  K.add(t, K.sph(HR * 0.045, 12, 8), SF.indigo, 0, 0, 0);
  K.add(t, K.cyl(HR * 0.03, HR * 0.055, HR * 0.2, 10), SF.indigo, 0, -HR * 0.12, 0);
  flatten(THREE, g);
}

export function buildMaskPinC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, SF.red, 0.055);
  const e = sideSpot(K, g, k, HR);
  foxMask(K, e, HR * 0.3, SF.soft, SF.indigo).rotation.z = 0.25;
  K.add(e, K.sph(HR * 0.07, 14, 10), SF.red, HR * 0.24, HR * 0.2, HR * 0.02);
  flatten(THREE, g);
}

function neckCord(K, g, r, c, tube) {
  K.add(g, K.tor(r, r * tube, 7, 36), c, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
}

function front(THREE, K, k, g, r, build) {
  const w = new THREE.Group();
  build(w);
  stickOn(THREE, k, g, w, K.V(0, -r * 0.26, r), 1.12);
}

function goldfish(K, p, s) {
  const g = K.grp(p);
  K.add(g, K.sph(s * 0.5, 18, 14), SF.fish).scale.set(1.2, 0.9, 0.62);
  [-1, 1].forEach(sy => {
    const t = K.add(g, K.sph(s * 0.32, 14, 10), SF.orange, -s * 0.72, sy * s * 0.18, 0);
    t.scale.set(1.1, 0.5, 0.25); t.rotation.z = sy * 0.6;
  });
  K.add(g, K.sph(s * 0.18, 10, 8), SF.orange, -s * 0.05, s * 0.44, 0).scale.set(1.3, 0.6, 0.3);
  K.add(g, K.sph(s * 0.07, 8, 6), SF.indigoDk, s * 0.3, s * 0.1, s * 0.28);
  return g;
}

function paperLantern(K, p, s, body, cap) {
  const g = K.grp(p);
  K.add(g, K.sph(s * 0.5, 18, 14), body).scale.set(0.86, 1, 0.86);
  [-1, 1].forEach(sy => K.add(g, K.cyl(s * 0.24, s * 0.24, s * 0.12, 14), cap, 0, sy * s * 0.48, 0));
  K.add(g, K.tor(s * 0.43, s * 0.025, 5, 22), SF.redDk, 0, s * 0.18, 0).rotation.x = Math.PI / 2;
  K.add(g, K.tor(s * 0.43, s * 0.025, 5, 22), SF.redDk, 0, -s * 0.18, 0).rotation.x = Math.PI / 2;
  return g;
}

function flowerKnot(K, p, s, c, dk) {
  const g = K.grp(p);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + Math.PI / 4;
    const l = K.add(g, K.tor(s * 0.14, s * 0.06, 6, 14), c, Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.22, 0);
    l.scale.set(1, 1, 0.7);
  }
  K.add(g, K.sph(s * 0.13, 12, 8), dk, 0, 0, s * 0.04).scale.z = 0.7;
  [-1, 1].forEach(sx => {
    const t = K.add(g, K.cyl(s * 0.035, s * 0.05, s * 0.5, 8), c, sx * s * 0.1, -s * 0.52, 0);
    t.rotation.z = sx * 0.15;
  });
  return g;
}

export function buildYukataCordA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r, SF.red, 0.12);
  front(THREE, K, k, g, r, w => {
    K.add(w, K.tor(r * 0.06, r * 0.02, 5, 12), SF.redDk, 0, r * 0.08, 0);
    goldfish(K, w, r * 0.5).position.set(0, -r * 0.12, r * 0.05);
  });
  flatten(THREE, g);
}

export function buildYukataCordB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, SF.indigo, 0.12);
  front(THREE, K, k, g, r, w => {
    K.add(w, K.cyl(r * 0.012, r * 0.012, r * 0.12, 6), SF.indigoDk, 0, r * 0.05, 0);
    paperLantern(K, w, r * 0.5, SF.red, SF.indigoDk).position.set(0, -r * 0.18, r * 0.05);
  });
  flatten(THREE, g);
}

export function buildYukataCordC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, SF.indigo, 0.1);
  K.add(g, K.tor(r * 1.03, r * 0.05, 5, 36), SF.cream, 0, r * 0.1, 0, true).rotation.x = Math.PI / 2;
  front(THREE, K, k, g, r, w => {
    flowerKnot(K, w, r * 0.62, SF.red, SF.gold).position.set(0, -r * 0.02, r * 0.04);
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

function pouch(K, f, R, o) {
  const r = R * o.r, zc = -R * 0.03 - r * o.dz, body = K.grp(f, 0, -r * 0.1, zc);
  body.scale.z = o.dz;
  K.add(body, K.sph(r, 30, 22), o.body).scale.y = 0.8;
  const top = r * 0.66;
  K.add(body, K.lathe([[r * 0.5, top - r * 0.08], [r * 0.42, top + r * 0.06], [r * 0.56, top + r * 0.3], [r * 0.5, top + r * 0.32], [r * 0.3, top + r * 0.1], [0.0001, top]], 24), o.body);
  K.add(body, K.tor(r * 0.44, r * 0.06, 6, 24), o.cord, 0, top + r * 0.04, 0).rotation.x = Math.PI / 2;
  if (o.base) K.add(body, K.sph(r * 1.01, 30, 12, 0, TAU, Math.PI * 0.62, Math.PI * 0.38), o.base).scale.y = 0.8;
  return { r, zc, top: top - r * 0.1 };
}

function fan(K, f, x, y, z, r, face, rim, motif, rz) {
  const g = K.grp(f, x, y, z); g.rotation.z = rz;
  K.add(g, K.cyl(r * 0.07, r * 0.06, r * 1.1, 10), SF.wood, 0, -r * 1.2, 0);
  const d = K.add(g, K.cyl(r, r, r * 0.06, 32), face); d.rotation.x = Math.PI / 2; d.scale.z = 0.92;
  K.add(g, K.tor(r, r * 0.06, 6, 32), rim).scale.y = 0.92;
  if (motif) motif(g, r);
  return g;
}

const fishMotif = (K, z) => (g, r) => { const m = goldfish(K, g, r * 0.62); m.position.set(0, 0, z * r); m.rotation.y = Math.PI; m.scale.z = 0.4; };

export function buildFanPackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const { r, zc, top } = pouch(K, f, R, { r: 0.3, dz: 0.32, body: SF.indigo, cord: SF.red });
  fan(K, f, r * 0.98, top + r * 0.14, zc - r * 0.02, r * 0.5, SF.cream, SF.red, fishMotif(K, -0.08), -1.45);
  K.add(f, K.sph(r * 0.08, 10, 8), SF.red, -r * 0.3, top - r * 0.12, zc - r * 0.28);
  K.add(f, K.cyl(r * 0.05, r * 0.08, r * 0.3, 8), SF.red, -r * 0.3, top - r * 0.3, zc - r * 0.28);
  packStraps(THREE, g, k, h, f, [K.V(-r * 0.6, r * 0.3, -R * 0.03), K.V(r * 0.6, r * 0.3, -R * 0.03)], SF.indigoDk);
  flatten(THREE, g);
}

export function buildFanPackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const { r, zc, top } = pouch(K, f, R, { r: 0.3, dz: 0.32, body: SF.red, cord: SF.cream });
  fan(K, f, -r * 0.98, top + r * 0.14, zc - r * 0.02, r * 0.5, SF.indigo, SF.indigoDk, (gg, rr) => K.add(gg, K.sph(rr * 0.28, 14, 10), SF.gold, 0, rr * 0.1, -rr * 0.05).scale.z = 0.2, 1.45);
  packStraps(THREE, g, k, h, f, [K.V(-r * 0.6, r * 0.3, -R * 0.03), K.V(r * 0.6, r * 0.3, -R * 0.03)], SF.redDk);
  flatten(THREE, g);
}

export function buildFanPackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const r = R * 0.3, zc = -R * 0.03 - r * 0.2;
  const bow = K.grp(f, 0, -r * 0.1, zc);
  [-1, 1].forEach(sx => {
    const l = K.add(bow, K.sph(r * 0.5, 20, 14), SF.indigo, sx * r * 0.52, 0, 0);
    l.scale.set(1, 0.62, 0.42); l.rotation.z = sx * 0.2;
    const t = K.add(bow, K.sph(r * 0.3, 14, 10), SF.indigo, sx * r * 0.26, -r * 0.5, 0);
    t.scale.set(0.6, 1, 0.36); t.rotation.z = sx * 0.5;
  });
  K.add(bow, K.sph(r * 0.24, 16, 12), SF.indigoDk, 0, 0, -r * 0.04).scale.set(1, 1, 0.7);
  fan(K, f, r * 0.05, r * 0.46, zc + r * 0.06, r * 0.5, SF.cream, SF.red, fishMotif(K, -0.08), -0.15);
  packStraps(THREE, g, k, h, f, [K.V(-r * 0.6, r * 0.1, -R * 0.03), K.V(r * 0.6, r * 0.1, -R * 0.03)], SF.indigoDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, z, rotZ, ro, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = ro;
  return m;
}

function petal(THREE, l, w) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.quadraticCurveTo(w, l * 0.5, 0, l);
  sh.quadraticCurveTo(-w, l * 0.5, 0, 0);
  return new THREE.ShapeGeometry(sh, 8);
}

export function buildFireworkTrailA(THREE, g, s, o, id, h) {
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, geo = petal(THREE, s * 0.5, s * 0.15); geo.translate(0, s * 0.12, 0);
    flat(THREE, g, h, geo, i % 2 ? SF.gold : SF.orange, o, 0, 0, a, 8);
  }
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.14, 14), SF.red, o, 0, 0, 0, 10, 0.01);
}

export function buildFireworkTrailB(THREE, g, s, o, id, h) {
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    flat(THREE, g, h, new THREE.CircleGeometry(s * 0.1, 12), SF.gold, o, Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, 0, 8);
    if (i % 2 === 0) flat(THREE, g, h, new THREE.CircleGeometry(s * 0.08, 12), SF.red, o, Math.cos(a + 0.26) * s * 0.28, Math.sin(a + 0.26) * s * 0.28, 0, 9);
  }
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.13, 14), SF.orange, o, 0, 0, 0, 10, 0.01);
}

export function buildFireworkTrailC(THREE, g, s, o, id, h) {
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, geo = petal(THREE, s * 0.46, s * 0.2); geo.translate(0, s * 0.07, 0);
    flat(THREE, g, h, geo, SF.red, o, -s * 0.12, s * 0.06, a, 8);
  }
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.12, 14), SF.gold, o, -s * 0.12, s * 0.06, 0, 10, 0.01);
  [[0.48, -0.4, 0.09, SF.gold], [0.56, 0.22, 0.07, SF.orange], [0.24, -0.66, 0.065, SF.orange]].forEach(([x, z, r, c]) => flat(THREE, g, h, new THREE.CircleGeometry(s * r, 10), c, o * 0.9, x * s, z * s, 0, 11));
}

export const VARIANTS = {
  sf_mask_pin: {
    slot: 'head', name: '여우 가면 머리핀', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '쪽빛 띠 여우 가면', note: '가는 쪽빛 머리띠 · 귀 옆에 작은 크림 여우 가면', build: buildMaskPinA },
    B: { name: '가면 머리핀', note: '띠 없이 귀 옆 크림 여우 가면 · 쪽빛 작은 술', build: buildMaskPinB },
    C: { name: '빨간 띠 하얀 가면', note: '가는 빨간 머리띠 · 쪽빛 무늬 하얀 가면 · 빨간 구슬', build: buildMaskPinC },
    REF: { name: '찻잎 머리핀', note: '출시된 찻집 머리핀 (비교용)', ref: 'tc_leaf_pin' },
  },
  sf_yukata_cord: {
    slot: 'neck', name: '축제 매듭 끈', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '금붕어 끈', note: '가는 빨간 끈 · 앞에 작은 금붕어 하나', build: buildYukataCordA },
    B: { name: '초롱 끈', note: '쪽빛 끈 · 앞에 작은 빨간 초롱', build: buildYukataCordB },
    C: { name: '꽃 매듭 끈', note: '쪽빛과 크림 두 줄 끈 · 빨간 꽃 매듭 · 금빛 구슬', build: buildYukataCordC },
    REF: { name: '찻잔 목걸이', note: '출시된 찻집 목장식 (비교용)', ref: 'tc_tea_cord' },
  },
  sf_fan_pack: {
    slot: 'back', cols: 'pack', name: '부채 주머니', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '쪽빛 복주머니와 부채', note: '쪽빛 주머니 · 빨간 끈 · 금붕어 그린 크림 부채', build: buildFanPackA },
    B: { name: '빨간 복주머니와 부채', note: '빨간 주머니 · 크림 끈 · 금빛 달 쪽빛 부채', build: buildFanPackB },
    C: { name: '허리 리본과 부채', note: '등 아래 쪽빛 리본 · 그 위에 꽂은 금붕어 부채', build: buildFanPackC },
    REF2: { name: '찻주전자 배낭', note: '출시된 찻집 배낭 (비교용)', ref: 'tc_teapot_pack', anchor: 'back' },
  },
  sf_firework_trail: {
    slot: 'trail', name: '불꽃 발자국', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '불꽃 한 송이', note: '주황·금빛 꽃잎 여덟 갈래 · 빨간 가운데', build: buildFireworkTrailA },
    B: { name: '점 불꽃', note: '금빛 점 고리 · 안쪽 빨간 점 · 주황 가운데', build: buildFireworkTrailB },
    C: { name: '작은 불꽃과 불티', note: '빨간 꽃잎 여섯 · 금빛 가운데 · 불티 세 점', build: buildFireworkTrailC },
    REF: { name: '찻잎 발자국', note: '출시된 찻집 발자국 (비교용)', ref: 'tc_leaf_trail' },
  },
};
