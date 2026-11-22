import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';

export const BK = Object.freeze({
  walnut: 0x6e4a32, walnutDk: 0x4e3424,
  green: 0x3f6a4e, greenDk: 0x2c4c38,
  wine: 0x8e2f3c, wineDk: 0x6a2230,
  cream: 0xe2d4b6, creamDk: 0xc8b48e,
  brass: 0xc99a48, brassDk: 0x9c7434,
  ink: 0x3a3230, glass: 0xb8cfc4,
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
    tor: (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function tube(K, p, pts, r, c, seg = 28) {
  const m = tubeAlong(K.THREE, pts, r, K.h.clay(c, false), seg, 7); p.add(m); return m;
}

function lensFill(K, p, r, x, y, z) {
  const m = new K.THREE.Mesh(new K.THREE.CircleGeometry(r, 24), new K.THREE.MeshStandardMaterial({ color: BK.glass, roughness: 0.3, transparent: true, opacity: 0.28, depthWrite: false }));
  m.position.set(x, y, z); p.add(m); return m;
}

const EYE_Y = 0.13, EYE_X = 0.37, LENS_Z = 1.0;

function rim(K, g, HR, s, r, t, c, fill = true) {
  const e = K.grp(g, s * EYE_X * HR, EYE_Y * HR, LENS_Z * HR); e.rotation.y = s * 0.32;
  K.add(e, K.tor(r * HR, t * HR, 8, 32), c);
  if (fill) lensFill(K, e, r * HR, 0, 0, 0);
  e.updateMatrix();
  return e;
}

function temples(K, g, HR, c, t, r) {
  [-1, 1].forEach(s => {
    const a = K.V(s * (EYE_X + r * 0.95) * HR, EYE_Y * HR, (LENS_Z - r * 0.32) * HR);
    tube(K, g, [a, K.V(s * 1.0 * HR, 0.15 * HR, 0.62 * HR), K.V(s * 1.13 * HR, 0.12 * HR, 0.1 * HR), K.V(s * 1.0 * HR, 0.02 * HR, -0.2 * HR)], t * HR, c);
  });
}

export function buildGlassesA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = 0.25;
  [-1, 1].forEach(s => rim(K, g, HR, s, r, 0.026, BK.brass));
  tube(K, g, [K.V(-0.13 * HR, 0.17 * HR, 1.06 * HR), K.V(0, 0.23 * HR, 1.1 * HR), K.V(0.13 * HR, 0.17 * HR, 1.06 * HR)], 0.022 * HR, BK.brass);
  temples(K, g, HR, BK.brassDk, 0.02, r);
  flatten(THREE, g);
}

export function buildGlassesB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = 0.27;
  [-1, 1].forEach(s => {
    const e = rim(K, g, HR, s, r, 0.055, BK.walnut);
    K.add(e, K.sph(0.035 * HR, 10, 8), BK.brass, s * r * HR, r * 0.25 * HR, 0.03 * HR);
  });
  tube(K, g, [K.V(-0.11 * HR, 0.19 * HR, 1.08 * HR), K.V(0, 0.24 * HR, 1.12 * HR), K.V(0.11 * HR, 0.19 * HR, 1.08 * HR)], 0.04 * HR, BK.walnut);
  temples(K, g, HR, BK.walnutDk, 0.035, r);
  flatten(THREE, g);
}

export function buildGlassesC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = 0.26;
  const e = rim(K, g, HR, 1, r, 0.04, BK.brass);
  K.add(e, K.tor(r * 1.02 * HR, 0.016 * HR, 6, 32), BK.brassDk, 0, 0, -0.02 * HR);
  const top = K.V(0, r, 0).multiplyScalar(HR).applyMatrix4(e.matrix);
  K.add(g, K.sph(0.04 * HR, 10, 8), BK.brass, top.x, top.y + 0.02 * HR, top.z);
  const p0 = K.V(r * 0.7, -r * 0.7, 0).multiplyScalar(HR).applyMatrix4(e.matrix);
  const pts = [p0, K.V(0.78 * HR, -0.35 * HR, 0.86 * HR), K.V(0.96 * HR, -0.55 * HR, 0.55 * HR), K.V(1.02 * HR, -0.42 * HR, 0.18 * HR)];
  const curve = new THREE.CatmullRomCurve3(pts);
  for (let i = 0; i <= 16; i++) { const q = curve.getPointAt(i / 16); K.add(g, K.sph(0.026 * HR, 8, 6), i % 2 ? BK.brassDk : BK.brass, q.x, q.y, q.z); }
  K.add(g, K.sph(0.055 * HR, 12, 10), BK.wine, pts[3].x, pts[3].y, pts[3].z);
  flatten(THREE, g);
}

function cord(K, g, r, c, tube = 0.08) {
  K.add(g, K.tor(r, r * tube, 7, 40), c, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
}

function hang(THREE, K, k, g, r, build, drop = 0.42, out = 1.1, sc = 1.3) {
  const w = new THREE.Group();
  build(w);
  w.scale.setScalar(sc);
  stickOn(THREE, k, g, w, K.V(0, -r * drop, r), out);
}

function ribbonTail(K, p, w, L, c, x, rz) {
  const sh = new K.THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, -L); sh.lineTo(0, -L + w * 0.55); sh.lineTo(-w / 2, -L); sh.closePath();
  const geo = new K.THREE.ExtrudeGeometry(sh, { depth: w * 0.12, bevelEnabled: true, bevelSize: w * 0.06, bevelThickness: w * 0.06, bevelSegments: 2 });
  const m = K.add(p, geo, c, x, 0, 0); m.rotation.z = rz; return m;
}

export function buildCharmA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, BK.greenDk);
  hang(THREE, K, k, g, r, w => {
    ribbonTail(K, w, r * 0.2, r * 0.62, BK.wine, -r * 0.05, -0.12);
    ribbonTail(K, w, r * 0.2, r * 0.5, BK.wineDk, r * 0.07, 0.16).position.z = -r * 0.02;
    K.add(w, K.tor(r * 0.1, r * 0.028, 6, 18), BK.brass, 0, r * 0.02, r * 0.04);
    K.add(w, K.sph(r * 0.06, 12, 10), BK.brass, 0, r * 0.02, r * 0.06);
  }, 0.16);
  flatten(THREE, g);
}

export function buildCharmB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, BK.brassDk, 0.06);
  hang(THREE, K, k, g, r, w => {
    const bw = r * 0.4, bh = r * 0.5, bd = r * 0.14;
    K.add(w, K.box(bw, bh, bd), BK.green, 0, -bh * 0.45, 0);
    K.add(w, K.box(bw * 0.92, bh * 0.94, bd * 1.08), BK.cream, bw * 0.05, -bh * 0.45, 0);
    K.add(w, K.box(bw * 0.86, bh * 1.02, bd * 0.12), BK.green, bw * 0.04, -bh * 0.45, bd * 0.5);
    K.add(w, K.box(bw * 0.12, bh * 1.02, bd * 1.1), BK.greenDk, -bw * 0.48, -bh * 0.45, 0);
    K.add(w, K.box(bw * 0.3, bh * 0.08, bd * 0.06), BK.brass, bw * 0.05, -bh * 0.3, bd * 0.58);
    K.add(w, K.sph(r * 0.035, 10, 8), BK.brass, bw * 0.45, -bh * 0.45, bd * 0.55);
    K.add(w, K.tor(r * 0.05, r * 0.016, 6, 14), BK.brass, 0, r * 0.04, 0);
  }, 0.03);
  flatten(THREE, g);
}

export function buildCharmC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, BK.walnut);
  hang(THREE, K, k, g, r, w => {
    const cw = r * 0.3, chh = r * 0.62;
    const sh = new THREE.Shape();
    sh.moveTo(-cw / 2, -chh); sh.lineTo(cw / 2, -chh); sh.lineTo(cw / 2, -cw / 2); sh.absarc(0, -cw / 2, cw / 2, 0, Math.PI, false); sh.closePath();
    K.add(w, new THREE.ExtrudeGeometry(sh, { depth: r * 0.02, bevelEnabled: true, bevelSize: r * 0.012, bevelThickness: r * 0.012, bevelSegments: 2, curveSegments: 12 }), BK.cream, 0, 0, 0);
    [0.3, 0.42, 0.54, 0.66].forEach(t => K.add(w, K.box(cw * 0.66, r * 0.014, r * 0.01), BK.creamDk, 0, -chh * t - r * 0.04, r * 0.035));
    K.add(w, K.tor(r * 0.03, r * 0.012, 6, 12), BK.brass, 0, -cw * 0.45, r * 0.035);
    K.add(w, K.sph(r * 0.05, 10, 8), BK.green, 0, -chh - r * 0.03, r * 0.02);
    K.add(w, K.cyl(r * 0.05, r * 0.075, r * 0.2, 10), BK.green, 0, -chh - r * 0.15, r * 0.02);
  }, 0.03);
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

export function buildBookPackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.02);
  const d = R * 0.15, z = -R * 0.03 - d / 2, t = R * 0.125;
  const stack = [[R * 0.74, BK.green, -0.02, 0], [R * 0.64, BK.wine, 0.03, 0.05], [R * 0.68, BK.walnut, -0.01, -0.04]];
  stack.forEach(([w, c, dx, ry], i) => {
    const b = K.grp(f, dx * R, (i - 1) * t * 1.02, z); b.rotation.y = ry;
    K.add(b, K.box(w, t, d), c);
    K.add(b, K.box(w * 0.96, t * 0.78, d * 1.04), BK.cream, 0, 0, 0);
    K.add(b, K.box(w * 1.02, t * 1.02, d * 0.06), c, 0, 0, -d * 0.5);
  });
  K.add(f, K.box(R * 0.1, t * 3.3, d * 1.18), BK.walnutDk, 0, 0, z);
  K.add(f, K.box(R * 0.14, R * 0.12, R * 0.03), BK.brass, 0, -t * 0.1, z - d * 0.62);
  K.add(f, K.tor(R * 0.08, R * 0.022, 6, 16, Math.PI), BK.walnutDk, 0, t * 1.55, z);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.22, t, -R * 0.03), K.V(R * 0.22, t, -R * 0.03)], BK.walnutDk);
  flatten(THREE, g);
}

export function buildBookPackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.04);
  const d = R * 0.13, z = -R * 0.03 - d / 2, base = -R * 0.22;
  const row = [[R * 0.15, R * 0.48, BK.wine], [R * 0.13, R * 0.42, BK.cream], [R * 0.17, R * 0.54, BK.green], [R * 0.13, R * 0.45, BK.walnut]];
  let x = -row.reduce((a, [w]) => a + w, 0) / 2;
  row.forEach(([w, hh, c]) => {
    const b = K.grp(f, x + w / 2, base + hh / 2, z);
    K.add(b, K.box(w, hh, d * 0.94), BK.creamDk);
    K.add(b, K.box(w * 1.02, hh * 1.02, d * 0.12), c, 0, 0, -d * 0.47);
    K.add(b, K.box(w * 1.02, hh * 1.02, d * 0.12), c, 0, 0, d * 0.47);
    K.add(b, K.box(w, hh * 1.02, d * 0.06), c, 0, 0, -d * 0.52);
    [-0.32, 0.34].forEach(t => K.add(b, K.box(w * 1.06, R * 0.025, d * 0.1), c === BK.cream ? BK.wine : BK.brass, 0, t * hh, -d * 0.56));
    x += w;
  });
  K.add(f, K.box(x * 2 + R * 0.06, R * 0.09, d * 1.12), BK.walnutDk, 0, base + R * 0.2, z);
  K.add(f, K.box(R * 0.1, R * 0.1, R * 0.03), BK.brass, 0, base + R * 0.2, z - d * 0.6);
  K.add(f, K.box(x * 2 + R * 0.08, R * 0.05, d * 1.2), BK.walnutDk, 0, base - R * 0.02, z);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.2, R * 0.2, -R * 0.03), K.V(R * 0.2, R * 0.2, -R * 0.03)], BK.walnutDk);
  flatten(THREE, g);
}

export function buildBookPackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.04);
  const w = R * 0.66, hh = R * 0.46, d = R * 0.13, z = -R * 0.03 - d / 2;
  K.add(f, K.box(w * 0.95, hh * 0.94, d * 0.86), BK.cream, R * 0.012, 0, z);
  [-1, 1].forEach(s => K.add(f, K.box(w, hh, d * 0.1), BK.green, 0, 0, z + s * d * 0.46));
  K.add(f, K.box(R * 0.06, hh, d), BK.greenDk, -w * 0.5, 0, z);
  for (let i = 0; i < 4; i++) K.add(f, K.box(w * 0.9, R * 0.006, d * 0.7), BK.creamDk, R * 0.02, hh * 0.47, z + (i - 1.5) * d * 0.18);
  [[1, 1], [1, -1]].forEach(([sx, sy]) => {
    const c = K.add(f, K.box(R * 0.1, R * 0.1, d * 1.06), BK.brass, sx * w * 0.47, sy * hh * 0.47, z);
    c.rotation.z = Math.PI / 4;
  });
  K.add(f, K.box(w * 0.5, hh * 0.3, R * 0.012), BK.greenDk, 0, R * 0.02, z - d * 0.52);
  K.add(f, K.box(w * 0.4, hh * 0.2, R * 0.012), BK.brass, 0, R * 0.02, z - d * 0.54);
  const tail = K.grp(f, w * 0.46, -hh * 0.12, z);
  ribbonTail(K, tail, R * 0.07, R * 0.18, BK.wine, 0, Math.PI / 2 + 0.25);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.2, hh * 0.32, -R * 0.03), K.V(R * 0.2, hh * 0.32, -R * 0.03)], BK.walnutDk);
  flatten(THREE, g);
}

function wingShape(THREE, s, up, low) {
  const sh = new THREE.Shape();
  sh.moveTo(0, s * 0.05);
  sh.lineTo(s * up, s * 0.5);
  sh.lineTo(s * up * 0.92, s * 0.02);
  sh.lineTo(s * low, -s * 0.36);
  sh.lineTo(0, -s * 0.12);
  sh.closePath();
  return sh;
}

function moth(THREE, g, h, s, c, cDk, o, rot, x = 0, z = 0, fold = 0, y = 0.008) {
  const grp = new THREE.Group(); grp.rotation.y = rot; grp.position.set(x, 0, z); g.add(grp);
  [-1, 1].forEach(sd => {
    const w = new THREE.Group(); w.scale.x = sd; w.rotation.z = sd * fold; w.position.y = fold ? s * 0.02 : 0; grp.add(w);
    const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape(THREE, s, 0.62, 0.42)), h.film(sd < 0 ? c : cDk, o));
    wing.material.side = THREE.DoubleSide;
    wing.rotation.x = -Math.PI / 2; wing.position.y = y; wing.renderOrder = 8; w.add(wing);
    const crease = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.02, s * 0.55), h.film(BK.ink, o * 0.5));
    crease.material.side = THREE.DoubleSide;
    crease.rotation.set(-Math.PI / 2, 0, -0.75); crease.position.set(s * 0.26, y + 0.0005, -s * 0.2); crease.renderOrder = 9; w.add(crease);
  });
  const body = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.06, s * 0.6), h.film(BK.walnutDk, o));
  body.rotation.x = -Math.PI / 2; body.position.y = y + 0.001; body.renderOrder = 10; grp.add(body);
  return grp;
}

export function buildMothTrailA(THREE, g, s0, o, id, h) {
  moth(THREE, g, h, s0 * 1.6, BK.cream, BK.creamDk, o, Math.PI);
}

export function buildMothTrailB(THREE, g, s0, o, id, h) {
  moth(THREE, g, h, s0 * 1.5, BK.green, BK.greenDk, o, Math.PI, 0, 0, 0.55, 0.012);
}

export function buildMothTrailC(THREE, g, s0, o, id, h) {
  const s = s0 * 0.95;
  moth(THREE, g, h, s, BK.wine, BK.wineDk, o, Math.PI + 0.4, -s * 0.45, s * 0.1);
  moth(THREE, g, h, s * 0.8, BK.cream, BK.creamDk, o, Math.PI - 0.3, s * 0.4, -s * 0.35, 0, 0.009);
  moth(THREE, g, h, s * 0.7, BK.green, BK.greenDk, o, Math.PI + 0.1, s * 0.25, s * 0.55, 0, 0.01);
}

export const VARIANTS = {
  bk_round_glasses: {
    slot: 'head', name: '동그란 안경', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '금빛 동그란 안경', note: '가는 놋쇠 테 동그란 알 둘 · 옅은 유리 · 귀 옆으로 다리', build: buildGlassesA },
    B: { name: '호두나무 뿔테 안경', note: '두꺼운 호두나무 테 · 테 위 놋쇠 징 · 굵은 다리', build: buildGlassesB },
    C: { name: '외알 안경', note: '오른눈에 놋쇠 외알 안경 · 볼을 따라 내려오는 구슬 줄', build: buildGlassesC },
    REF: { name: '금빛 음표 머리띠', note: '출시된 음악회 머리띠 (비교용)', ref: 'mu_note_pin' },
  },
  bk_bookmark_charm: {
    slot: 'neck', name: '책갈피 목걸이', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '리본 책갈피', note: '숲색 목끈 · 놋쇠 고리에 자줏빛 리본 꼬리 둘', build: buildCharmA },
    B: { name: '작은 책 목걸이', note: '놋쇠 줄 · 숲색 표지 작은 책 · 크림 책장 · 놋쇠 걸쇠', build: buildCharmB },
    C: { name: '종이 책갈피', note: '호두나무 끈 · 줄 그은 크림 종이 책갈피 · 숲색 술', build: buildCharmC },
    REF: { name: '벨벳 나비넥타이', note: '출시된 음악회 목장식 (비교용)', ref: 'mu_bow_tie' },
  },
  bk_book_pack: {
    slot: 'back', cols: 'pack', name: '책 배낭', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '눕힌 책 세 권', note: '숲색·자줏빛·호두나무 책을 눕혀 쌓고 세로 가죽띠 · 놋쇠 버클', build: buildBookPackA },
    B: { name: '세운 책 네 권', note: '키 다른 책 네 권을 세워 가로 가죽띠로 묶음 · 등에 놋쇠 띠', build: buildBookPackB },
    C: { name: '큰 책 가방', note: '숲색 표지 큰 책 한 권 · 놋쇠 모서리 · 자줏빛 책갈피 끈', build: buildBookPackC },
    REF2: { name: '바이올린 케이스 배낭', note: '출시된 음악회 배낭 (비교용)', ref: 'mu_violin_pack', anchor: 'back' },
  },
  bk_paper_moth_trail: {
    slot: 'trail', name: '종이 나비 발자국', rec: 'B', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '크림 종이 나비', note: '납작한 크림 종이 나비 하나 · 접은 선', build: buildMothTrailA },
    B: { name: '접어 세운 숲색 나비', note: '날개를 살짝 세운 숲색 종이 나비 하나', build: buildMothTrailB },
    C: { name: '나비 세 마리', note: '자줏빛·크림·숲색 작은 종이 나비 셋', build: buildMothTrailC },
    REF: { name: '음표 발자국', note: '출시된 음악회 발자국 (비교용)', ref: 'mu_note_trail' },
  },
};
