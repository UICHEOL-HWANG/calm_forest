import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt } from '../../js/cosmetics/art-forest-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';

export const MU = Object.freeze({
  navy: 0x34406a, navyDk: 0x263052,
  velvet: 0xa8323e, velvetDk: 0x7c2430,
  brass: 0xd2a04c, brassDk: 0xa87a34,
  cream: 0xe2d4b6, wood: 0xb8834e, woodDk: 0x7e5432,
  ink: 0x2e2a30,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, h, add,
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

export function flagShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.05, -s * 0.18, s * 0.34, -s * 0.22, s * 0.3, -s * 0.52);
  sh.bezierCurveTo(s * 0.26, -s * 0.36, s * 0.12, -s * 0.3, 0, -s * 0.28);
  sh.closePath();
  return sh;
}

function noteHead(K, p, s, c, x = 0, y = 0) {
  const m = K.add(p, K.sph(s * 0.19, 18, 12), c, x, y, 0);
  m.scale.set(1.3, 0.92, 0.75); m.rotation.z = 0.42;
  return m;
}

function eighth(K, p, s, c, flagC = c) {
  const g = K.grp(p);
  noteHead(K, g, s, c, 0, -s * 0.38);
  K.add(g, K.cyl(s * 0.055, s * 0.055, s * 0.78, 10), c, s * 0.2, 0, 0);
  K.add(g, ex(K.THREE, flagShape(K.THREE, s), s * 0.07, s * 0.03), flagC, s * 0.2, s * 0.38, 0);
  return g;
}

function clef(K, p, s, c) {
  const g = K.grp(p), P = [
    [-0.06, -0.46], [0.02, -0.52], [0.07, -0.44], [0.04, -0.2], [0.0, 0.12], [0.02, 0.36], [0.08, 0.5], [0.12, 0.4],
    [0.04, 0.22], [-0.12, 0.04], [-0.16, -0.12], [-0.06, -0.24], [0.1, -0.22], [0.15, -0.1], [0.06, -0.02], [-0.04, -0.07],
  ].map(([x, y]) => K.V(x * s, y * s, 0));
  g.add(tubeAlong(K.THREE, P, s * 0.04, K.h.clay(c), 80, 8));
  K.add(g, K.sph(s * 0.07, 14, 10), c, -s * 0.07, -s * 0.44, 0);
  return g;
}

function bow(K, p, s, wing, knot = wing) {
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

function headband(K, g, HR, c, tube = 0.055) {
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

export function buildNotePinA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, MU.navy);
  const e = sideSpot(K, g, k, HR);
  eighth(K, e, HR * 0.82, MU.brass).rotation.z = 0.2;
  flatten(THREE, g);
}

export function buildNotePinB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const e = sideSpot(K, g, k, HR);
  bow(K, e, HR * 0.36, MU.velvet, MU.velvetDk).rotation.z = 0.25;
  const n = eighth(K, e, HR * 0.46, MU.brass); n.position.set(HR * 0.06, -HR * 0.24, HR * 0.08); n.rotation.z = 0.15;
  flatten(THREE, g);
}

export function buildNotePinC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, MU.brassDk, 0.05);
  const e = sideSpot(K, g, k, HR);
  clef(K, e, HR * 0.86, MU.navy).rotation.z = 0.15;
  flatten(THREE, g);
}

function cord(K, g, r, c, tube = 0.1) {
  K.add(g, K.tor(r, r * tube, 7, 40), c, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
}

function front(THREE, K, k, g, r, build, out = 1.14) {
  const w = new THREE.Group();
  build(w);
  stickOn(THREE, k, g, w, K.V(0, -r * 0.12, r), out);
}

export function buildBowTieA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, MU.velvetDk);
  front(THREE, K, k, g, r, w => bow(K, w, r * 0.52, MU.velvet, MU.velvetDk));
  flatten(THREE, g);
}

export function buildBowTieB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, MU.navyDk);
  front(THREE, K, k, g, r, w => {
    bow(K, w, r * 0.52, MU.navy, MU.navyDk);
    K.add(w, K.cyl(r * 0.075, r * 0.075, r * 0.04, 16), MU.brass, 0, 0, r * 0.12).rotation.x = Math.PI / 2;
  });
  flatten(THREE, g);
}

export function buildBowTieC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, MU.ink, 0.09);
  front(THREE, K, k, g, r, w => {
    const s = r * 0.52;
    bow(K, w, s, MU.cream, MU.ink);
    [0, Math.PI].forEach(ry => {
      const side = K.grp(w); side.rotation.y = ry;
      [-0.22, 0, 0.22].forEach(y => K.add(side, K.box(s * 0.52, s * 0.024, s * 0.02), MU.ink, s * 0.56, y * s, s * 0.15));
    });
  });
  flatten(THREE, g);
}

function packFrame(K, g, k, k0, lift = 0) {
  const c = backFront(k, packY(k0) + lift), f = K.grp(g, 0, c.y, c.z);
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

function slabAt(K, p, sh, d, c, z, bev) {
  const geo = new K.THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 3, curveSegments: 18 });
  geo.translate(0, 0, -d);
  return K.add(p, geo, c, 0, 0, z);
}

function caseShape(THREE, L, W) {
  return symShape(THREE, [0, -L / 2], [
    [[W * 0.56, -L / 2], [W * 0.56, -L * 0.04], [W * 0.3, L * 0.1]],
    [[W * 0.2, L * 0.17], [W * 0.22, L / 2], [0, L / 2]],
  ]);
}

function violinShape(THREE, L, W) {
  return symShape(THREE, [0, -L / 2], [
    [[W * 0.54, -L / 2], [W * 0.56, -L * 0.12], [W * 0.32, -L * 0.04]],
    [[W * 0.26, 0], [W * 0.26, L * 0.06], [W * 0.32, L * 0.1]],
    [[W * 0.48, L * 0.2], [W * 0.46, L / 2], [0, L / 2]],
  ]);
}

export function buildViolinPackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.04);
  const L = R * 0.84, W = R * 0.36, d = R * 0.11, z0 = -R * 0.03, zf = z0 - d - R * 0.035;
  const t = K.grp(f); t.rotation.z = Math.PI / 2 + 0.1;
  slabAt(K, t, caseShape(THREE, L, W), d, MU.navy, z0, R * 0.035);
  [-1, 1].forEach(s => K.add(t, K.box(R * 0.04, R * 0.1, R * 0.03), MU.brass, s * W * 0.3, -L * 0.04, zf + R * 0.01));
  K.add(f, K.tor(R * 0.08, R * 0.02, 6, 16, Math.PI), MU.brassDk, -R * 0.04, W * 0.4 + R * 0.04, z0 - d / 2 - R * 0.02);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.2, R * 0.1, z0), K.V(R * 0.2, R * 0.1, z0)], MU.navyDk);
  flatten(THREE, g);
}

export function buildViolinPackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.04);
  const L = R * 0.84, W = R * 0.28, d = R * 0.12, z0 = -R * 0.03, zf = z0 - d - R * 0.035;
  const t = K.grp(f); t.rotation.z = 1.15;
  const sh = new THREE.Shape();
  sh.absarc(0, -L / 2 + W / 2, W / 2, Math.PI, TAU, false);
  sh.absarc(0, L / 2 - W / 2, W / 2, 0, Math.PI, false);
  slabAt(K, t, sh, d, MU.velvet, z0, R * 0.035);
  [-0.16, 0.16].forEach(y => K.add(t, K.box(W * 1.12, R * 0.035, R * 0.02), MU.brass, 0, y * L, zf));
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.18, R * 0.12, z0), K.V(R * 0.18, R * 0.12, z0)], MU.velvetDk);
  flatten(THREE, g);
}

export function buildViolinPackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.1);
  const L = R * 0.6, W = R * 0.44, d = R * 0.1, z0 = -R * 0.03, zf = z0 - d - R * 0.03;
  const t = K.grp(f); t.rotation.z = -1.0;
  slabAt(K, t, violinShape(THREE, L, W), d, MU.wood, z0, R * 0.03);
  K.add(t, K.box(R * 0.05, L * 0.62, R * 0.025), MU.ink, 0, L * 0.38, zf - R * 0.005);
  K.add(t, K.cyl(R * 0.03, R * 0.03, R * 0.12, 12), MU.woodDk, 0, L * 0.74, zf + R * 0.03).rotation.x = Math.PI / 2;
  K.add(t, K.sph(R * 0.045, 14, 10), MU.woodDk, 0, L * 0.8, zf + R * 0.02);
  K.add(t, K.box(R * 0.12, R * 0.02, R * 0.03), MU.cream, 0, -L * 0.14, zf - R * 0.01);
  K.add(t, K.box(R * 0.1, R * 0.04, R * 0.02), MU.ink, 0, -L * 0.42, zf);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.15, R * 0.1, z0), K.V(R * 0.15, R * 0.1, z0)], MU.velvetDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, z, rotZ = 0, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

function headGeo(THREE, s) {
  const geo = new THREE.CircleGeometry(s * 0.17, 20);
  geo.scale(1.32, 0.9, 1); geo.rotateZ(0.42);
  return geo;
}

function flatEighth(THREE, g, h, s, c, o, rot) {
  const grp = new THREE.Group(); grp.rotation.y = rot; g.add(grp);
  const head = headGeo(THREE, s); head.translate(0, -s * 0.38, 0);
  flat(THREE, grp, h, head, c, o, 0, 0);
  const stem = new THREE.PlaneGeometry(s * 0.06, s * 0.78); stem.translate(s * 0.19, 0, 0);
  flat(THREE, grp, h, stem, c, o, 0, 0, 0, 0.009);
  const fl = new THREE.ShapeGeometry(flagShape(THREE, s), 10); fl.translate(s * 0.19, s * 0.38, 0);
  flat(THREE, grp, h, fl, c, o, 0, 0, 0, 0.0095);
  return grp;
}

export function buildNoteTrailA(THREE, g, s, o, id, h) {
  flatEighth(THREE, g, h, s * 1.55, MU.navy, o, Math.PI);
}

export function buildNoteTrailB(THREE, g, s0, o, id, h) {
  const s = s0 * 1.35;
  const grp = new THREE.Group(); grp.rotation.y = Math.PI; grp.position.x = s * 0.2; g.add(grp);
  const dx = s * 0.42;
  [[0, -s * 0.36], [dx, -s * 0.28]].forEach(([x, y]) => {
    const head = headGeo(THREE, s); head.translate(x, y, 0);
    flat(THREE, grp, h, head, MU.navy, o, 0, 0);
    const st = new THREE.PlaneGeometry(s * 0.055, s * 0.72); st.translate(x + s * 0.19, y + s * 0.36, 0);
    flat(THREE, grp, h, st, MU.navy, o, 0, 0, 0, 0.009);
  });
  const beam = new THREE.PlaneGeometry(dx + s * 0.06, s * 0.1); beam.rotateZ(Math.atan2(s * 0.08, dx)); beam.translate(s * 0.19 + dx / 2, s * 0.04, 0);
  flat(THREE, grp, h, beam, MU.brassDk, o, 0, 0, 0, 0.01);
}

export function buildNoteTrailC(THREE, g, s0, o, id, h) {
  const s = s0 * 1.4;
  [-0.18, 0, 0.18].forEach(z => flat(THREE, g, h, new THREE.PlaneGeometry(s * 0.95, s * 0.035), MU.woodDk, o * 0.75, 0, z * s, 0, 0.008));
  const head = headGeo(THREE, s * 1.1); head.translate(-s * 0.04, -s * 0.02, 0);
  flat(THREE, g, h, head, MU.velvet, o, 0, 0, Math.PI, 0.01);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.05, 12), MU.brassDk, o, s * 0.3, s * 0.1, 0, 0.011);
}

export const VARIANTS = {
  mu_note_pin: {
    slot: 'head', name: '음표 머리핀', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '금빛 음표 머리띠', note: '가는 남색 머리띠 · 귀 옆에 금빛 8분음표 하나', build: buildNotePinA },
    B: { name: '벨벳 리본 음표 핀', note: '띠 없이 귀 옆 작은 벨벳 리본 · 아래 금빛 음표', build: buildNotePinB },
    C: { name: '높은음자리표 머리띠', note: '가는 금빛 머리띠 · 귀 옆에 남색 높은음자리표', build: buildNotePinC },
    REF: { name: '딸기 케이크 머리띠', note: '출시된 디저트 머리띠 (비교용)', ref: 'ds_cake_hat' },
  },
  mu_bow_tie: {
    slot: 'neck', name: '나비넥타이', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '벨벳 나비넥타이', note: '가는 진홍 목끈 · 앞에 붉은 벨벳 나비넥타이', build: buildBowTieA },
    B: { name: '남색 금단추 나비넥타이', note: '남색 나비넥타이 · 가운데 작은 금빛 단추', build: buildBowTieB },
    C: { name: '악보 나비넥타이', note: '크림 나비넥타이에 오선 줄 · 검은 매듭', build: buildBowTieC },
    REF: { name: '호랑가시 리본 타이', note: '출시된 크리스마스 목장식 (비교용)', ref: 'xm_holly_tie' },
  },
  mu_violin_pack: {
    slot: 'back', cols: 'pack', name: '바이올린 케이스 배낭', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '남색 바이올린 케이스', note: '등에 가로로 멘 남색 바이올린 케이스 · 금빛 잠금쇠 둘 · 위 손잡이', build: buildViolinPackA },
    B: { name: '벨벳 캡슐 케이스', note: '비스듬히 멘 둥근 진홍 케이스 · 금빛 띠 둘', build: buildViolinPackB },
    C: { name: '작은 바이올린', note: '케이스 없이 비스듬히 멘 나무 바이올린 · 검은 지판 · 크림 브리지', build: buildViolinPackC },
    REF2: { name: '고슴도치 배낭', note: '출시된 숲 배낭 (비교용)', ref: 'fp_hedgehog_pack', anchor: 'back' },
  },
  mu_note_trail: {
    slot: 'trail', name: '음표 발자국', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '8분음표 하나', note: '남색 8분음표 한 개', build: buildNoteTrailA },
    B: { name: '이어진 음표 둘', note: '남색 음표 둘 · 금빛 잇단 줄', build: buildNoteTrailB },
    C: { name: '오선 위 음표', note: '나무색 오선 셋 · 진홍 음표 머리 · 금빛 점', build: buildNoteTrailC },
    REF: { name: '크림 발자국', note: '출시된 디저트 발자국 (비교용)', ref: 'ds_cream_trail' },
  },
};
