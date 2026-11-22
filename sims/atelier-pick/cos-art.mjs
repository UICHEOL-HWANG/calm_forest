import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn, neckWrap } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt } from '../../js/cosmetics/art-forest-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';

export const AT = Object.freeze({
  navy: 0x3b4a72, navyDk: 0x2c3858,
  burgundy: 0x9c3b4a, burgundyDk: 0x7a2c3a,
  canvas: 0xe2d4b6, canvasDk: 0xc9b690,
  wood: 0xc0905c, woodDk: 0x8e623c, woodLt: 0xd4aa74,
  metal: 0xa9a59c,
  red: 0xd9534a, blue: 0x4f82c4, yellow: 0xe8bf3e, green: 0x6aab5a,
});

const TAU = Math.PI * 2;
const DABS = [AT.red, AT.blue, AT.yellow, AT.green];

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 16, b = 12) => new THREE.SphereGeometry(r, a, b),
    cyl: (a, b, hh, s = 20) => new THREE.CylinderGeometry(a, b, hh, s),
    cone: (r, hh, s = 12) => new THREE.ConeGeometry(r, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    lathe: (pts, s = 32) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function dab(K, p, s, c, x = 0, y = 0, z = 0) {
  const m = K.add(p, K.sph(s, 12, 9), c, x, y, z);
  m.scale.set(1, 1, 0.42);
  return m;
}

function brush(K, p, L, tip, handle = AT.woodDk) {
  const g = K.grp(p);
  K.add(g, K.cyl(L * 0.035, L * 0.05, L * 0.66, 8), handle, 0, L * 0.33, 0);
  K.add(g, K.cyl(L * 0.055, L * 0.05, L * 0.14, 10), AT.metal, 0, L * 0.73, 0);
  const t = K.add(g, K.sph(L * 0.06, 10, 8), tip, 0, L * 0.86, 0);
  t.scale.set(1, 1.9, 1);
  return g;
}

function paletteShape(THREE, w, hh) {
  const sh = new THREE.Shape();
  sh.moveTo(w * 0.1, -hh * 0.5);
  sh.bezierCurveTo(w * 0.42, -hh * 0.52, w * 0.52, -hh * 0.1, w * 0.48, hh * 0.18);
  sh.bezierCurveTo(w * 0.42, hh * 0.52, -w * 0.2, hh * 0.56, -w * 0.42, hh * 0.3);
  sh.bezierCurveTo(-w * 0.54, hh * 0.14, -w * 0.5, -hh * 0.2, -w * 0.3, -hh * 0.36);
  sh.bezierCurveTo(-w * 0.18, -hh * 0.2, -w * 0.02, -hh * 0.18, -w * 0.02, -hh * 0.34);
  sh.bezierCurveTo(-w * 0.02, -hh * 0.46, w * 0.04, -hh * 0.5, w * 0.1, -hh * 0.5);
  const hole = new THREE.Path();
  hole.absellipse(-w * 0.16, -hh * 0.1, w * 0.07, hh * 0.09, 0, TAU, true);
  sh.holes.push(hole);
  return sh;
}

function ex(THREE, sh, d, bev) {
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 14 });
  geo.translate(0, 0, -d / 2); return geo;
}

function palette(K, p, w, c = AT.woodLt, dabs = DABS) {
  const g = K.grp(p), hh = w * 0.78;
  K.add(g, ex(K.THREE, paletteShape(K.THREE, w, hh), w * 0.05, w * 0.02), c);
  [[0.22, 0.26], [0.34, 0.02], [0.04, 0.34], [-0.26, 0.22]].slice(0, dabs.length).forEach(([x, y], i) => dab(K, g, w * 0.07, dabs[i], x * w, y * hh, w * 0.05));
  return g;
}

function beret(K, p, r, c) {
  const g = K.grp(p);
  const crown = K.add(g, K.lathe([[r * 0.96, 0], [r * 1.0, r * 0.06], [r * 1.13, r * 0.17], [r * 1.18, r * 0.27], [r * 1.14, r * 0.37], [r * 1.0, r * 0.46], [r * 0.72, r * 0.54], [r * 0.36, r * 0.58], [0, r * 0.59]]), c.crown);
  crown.material.side = 2;
  K.add(g, K.tor(r * 0.99, r * 0.05, 6, 36), c.band, 0, r * 0.03, 0).rotation.x = Math.PI / 2;
  K.add(g, K.cyl(r * 0.05, r * 0.07, r * 0.14, 10), c.stem, 0, r * 0.64, 0);
  return g;
}

function placeBeret(K, g, k, r, c, ang = -0.24) {
  const p = arcPt(K.THREE, k, ang, 0.84);
  const b = beret(K, g, r, c);
  b.position.set(p.x, p.y, -k.HR * 0.06); b.rotation.set(-0.14, 0, ang);
  return b;
}

function bandPin(K, b, r, a, y = 0.06) {
  const pin = K.grp(b, Math.cos(a) * r * 1.02, r * y, Math.sin(a) * r * 1.02);
  pin.rotation.y = Math.PI / 2 - a;
  return pin;
}

export function buildBeretA(THREE, g, k, h) {
  const K = kit(THREE, h), r = k.HR * 0.56;
  const b = placeBeret(K, g, k, r, { crown: AT.navy, band: AT.navyDk, stem: AT.navyDk });
  const pin = bandPin(K, b, r * 1.08, Math.PI * 0.28, 0.12);
  const br = brush(K, pin, r * 0.92, AT.red, AT.woodLt); br.rotation.z = -0.95; br.position.set(-r * 0.34, -r * 0.1, r * 0.02);
  flatten(THREE, g);
}

export function buildBeretB(THREE, g, k, h) {
  const K = kit(THREE, h), r = k.HR * 0.56;
  const b = placeBeret(K, g, k, r, { crown: AT.burgundy, band: AT.burgundyDk, stem: AT.burgundyDk });
  const pin = bandPin(K, b, r * 1.1, Math.PI * 0.28, 0.12);
  const pl = palette(K, pin, r * 0.44, AT.canvas, [AT.blue, AT.yellow, AT.green]); pl.position.z = r * 0.03; pl.rotation.z = 0.25;
  flatten(THREE, g);
}

export function buildBeretC(THREE, g, k, h) {
  const K = kit(THREE, h), r = k.HR * 0.56;
  const b = placeBeret(K, g, k, r, { crown: AT.canvas, band: AT.navy, stem: AT.navy });
  [[0.42, 0.5, AT.red, 0.1], [0.62, 1.5, AT.blue, 0.085], [0.2, 2.6, AT.yellow, 0.08]].forEach(([rr, a, c, s]) => {
    const x = Math.cos(a) * r * rr, z = Math.sin(a) * r * rr, y = r * (0.59 - 0.16 * rr * rr);
    dab(K, b, r * s, c, x, y, z).rotation.x = -Math.PI / 2;
  });
  flatten(THREE, g);
}

function front(THREE, K, k, g, r, build, at = 0, out = 1.13) {
  const w = new THREE.Group();
  build(w);
  stickOn(THREE, k, g, w, K.V(r * at, -r * 0.12, r), out);
}

export function buildScarfA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [AT.canvas, AT.canvasDk], 0.13);
  front(THREE, K, k, g, r, w => {
    K.add(w, K.sph(r * 0.15, 14, 10), AT.canvas).scale.set(1.2, 1, 0.7);
    [[-1, 0.34, AT.red], [1, 0.28, AT.blue]].forEach(([s, L, c]) => {
      const t = K.grp(w, s * r * 0.06, 0, -r * 0.02); t.rotation.z = s * 0.38;
      K.add(t, K.box(r * 0.17, r * L, r * 0.04), AT.canvas, 0, -r * L / 2, 0);
      dab(K, t, r * 0.055, c, 0, -r * L * 0.72, r * 0.03);
    });
    dab(K, w, r * 0.04, AT.yellow, r * 0.07, r * 0.06, r * 0.1);
  }, 0.3);
  flatten(THREE, g);
}

export function buildScarfB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.11, 7, 40), AT.navy, 0, r * 0.04, 0).rotation.x = Math.PI / 2;
  front(THREE, K, k, g, r, w => {
    dab(K, w, r * 0.1, AT.yellow, 0, -r * 0.1, -r * 0.02);
    const b = brush(K, w, r * 0.82, AT.red, AT.woodLt); b.rotation.z = -1.3; b.position.set(-r * 0.36, -r * 0.2, r * 0.03);
  }, 0.24, 1.15);
  flatten(THREE, g);
}

export function buildScarfC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [AT.burgundy, AT.burgundyDk], 0.12);
  front(THREE, K, k, g, r, w => {
    const pl = palette(K, w, r * 0.5, AT.woodLt, [AT.red, AT.blue, AT.yellow]); pl.rotation.z = 0.2; pl.position.y = -r * 0.12;
  }, 0, 1.15);
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

export function buildPalettePackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.05);
  const w = R * 0.62, hh = w * 0.74, d = R * 0.12, zf = -R * 0.03 - d - R * 0.035;
  const body = slab(K, f, paletteShape(THREE, w, hh), d, AT.woodLt, -R * 0.03, R * 0.03);
  body.rotation.y = Math.PI; body.position.z = -R * 0.03 - d;
  [[-0.22, 0.26, AT.red], [-0.34, 0.02, AT.blue], [-0.04, 0.34, AT.yellow], [0.26, 0.22, AT.green]].forEach(([x, y, c]) => dab(K, f, w * 0.075, c, x * w, y * hh, zf));
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.26, hh * 0.3, -R * 0.03), K.V(w * 0.26, hh * 0.3, -R * 0.03)], AT.woodDk);
  flatten(THREE, g);
}

export function buildPalettePackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const w = R * 0.6, hh = R * 0.46, d = R * 0.15, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.08, R * 0.1), d, AT.navy, -R * 0.03, R * 0.035);
  const fh = hh * 0.4, fl = slab(K, f, roundRect(THREE, w * 1.02, fh, R * 0.08, R * 0.1), R * 0.025, AT.canvas, zf, R * 0.015);
  fl.position.y = hh / 2 - fh / 2 + R * 0.02;
  K.add(f, K.box(R * 0.06, R * 0.1, R * 0.02), AT.woodDk, 0, hh / 2 - fh + R * 0.03, zf - R * 0.04);
  [[-0.16, AT.red, 0.1], [0.02, AT.blue, -0.05], [0.18, AT.yellow, -0.16]].forEach(([x, c, rz], i) => {
    const b = brush(K, f, R * (0.3 - i * 0.02), c); b.position.set(w * x, hh / 2 - R * 0.17, -R * 0.03 - d / 2); b.rotation.z = rz;
  });
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.34, -R * 0.03), K.V(w * 0.3, hh * 0.34, -R * 0.03)], AT.navyDk);
  flatten(THREE, g);
}

export function buildPalettePackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.05);
  const w = R * 0.58, hh = R * 0.46, d = R * 0.1, zf = -R * 0.03 - d;
  slab(K, f, roundRect(THREE, w, hh, R * 0.03), d, AT.wood, -R * 0.03, R * 0.02);
  const iw = w * 0.78, ih = hh * 0.74, zc = zf - R * 0.015;
  K.add(f, K.box(iw, ih, R * 0.02), AT.canvas, 0, 0, zc);
  K.add(f, K.box(iw, ih * 0.36, R * 0.01), AT.blue, 0, ih * 0.32, zc - R * 0.012);
  K.add(f, K.sph(iw * 0.42, 20, 10), AT.green, -iw * 0.08, -ih * 0.5, zc - R * 0.01).scale.set(1.1, 0.55, 0.08);
  K.add(f, K.cyl(iw * 0.1, iw * 0.1, R * 0.015, 18), AT.yellow, iw * 0.26, ih * 0.22, zc - R * 0.024).rotation.x = Math.PI / 2;
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.34, -R * 0.03), K.V(w * 0.3, hh * 0.34, -R * 0.03)], AT.woodDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, y, z, rotZ = 0) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

function splatShape(THREE, s, n = 7, seed = 0) {
  const sh = new THREE.Shape(), N = n * 2;
  const rad = i => s * (i % 2 ? 0.78 + 0.06 * ((i * 7 + seed) % 3) : 1);
  const pt = i => { const a = i / N * TAU; return [Math.cos(a) * rad(i), Math.sin(a) * rad(i)]; };
  sh.moveTo(...pt(0));
  for (let i = 0; i < N; i++) {
    const [x1, y1] = pt(i + 1), am = (i + 0.5) / N * TAU, rm = (rad(i) + rad(i + 1)) / 2 * 1.04;
    sh.quadraticCurveTo(Math.cos(am) * rm, Math.sin(am) * rm, x1, y1);
  }
  return sh;
}

export function buildPaintTrailA(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.ShapeGeometry(splatShape(THREE, s * 0.44, 6, 1), 6), AT.blue, o * 0.9, 0, 0.008, 0, 0.4);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.09, 12), AT.blue, o * 0.9, s * 0.56, 0.008, -s * 0.2);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.13, 14), AT.yellow, o, -s * 0.05, 0.01, s * 0.04);
}

export function buildPaintTrailB(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.3, 22), AT.navy, o * 0.85, 0, 0.008, s * 0.12).scale.set(1.15, 0.9, 1);
  [[-0.38, -0.24, AT.red], [-0.14, -0.44, AT.yellow], [0.14, -0.44, AT.blue], [0.38, -0.24, AT.green]].forEach(([x, z, c]) =>
    flat(THREE, g, h, new THREE.CircleGeometry(s * 0.12, 16), c, o, x * s, 0.01, z * s));
}

function strokeShape(THREE, s) {
  const n = 16, top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = (t - 0.5) * s * 0.92, y = Math.sin(t * Math.PI) * s * 0.14;
    const w = s * (0.13 - 0.07 * t) * Math.min(1, Math.sin(Math.min(t, 0.92) * Math.PI) * 1.6 + 0.35);
    top.push([x, y + w]); bot.push([x, y - w]);
  }
  const sh = new THREE.Shape();
  sh.moveTo(...bot[0]);
  sh.quadraticCurveTo(-s * 0.56, 0, ...top[0]);
  top.slice(1).forEach(q => sh.lineTo(...q));
  sh.quadraticCurveTo(s * 0.5, s * 0.02, ...bot[n]);
  bot.slice(0, n).reverse().forEach(q => sh.lineTo(...q));
  return sh;
}

export function buildPaintTrailC(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.ShapeGeometry(strokeShape(THREE, s), 8), AT.burgundy, o * 0.9, 0, 0.008, 0, 0.75);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.08, 12), AT.yellow, o, s * 0.42, 0.011, s * 0.06);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.05, 10), AT.yellow, o, s * 0.5, 0.011, -s * 0.1);
}

export const VARIANTS = {
  at_beret: {
    slot: 'head', name: '베레모', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '남색 베레모 붓', note: '작은 남색 베레모를 옆으로 기울임 · 띠에 빨간 붓 하나', build: buildBeretA },
    B: { name: '버건디 베레모 팔레트', note: '버건디 베레모 · 옆에 작은 크림 팔레트 핀', build: buildBeretB },
    C: { name: '크림 베레모 물감 점', note: '캔버스색 베레모 · 남색 띠 · 위에 물감 점 셋', build: buildBeretC },
    REF: { name: '올리브 버킷햇', note: '출시된 캠핑 모자 (비교용)', ref: 'cp_bucket_hat' },
  },
  at_paint_scarf: {
    slot: 'neck', name: '물감 스카프', rec: 'C', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '물감 묻은 크림 스카프', note: '크림 목도리 · 옆 매듭 끝에 물감 점 셋', build: buildScarfA },
    B: { name: '남색 끈 붓 브로치', note: '가는 남색 목끈 · 앞에 빨간 붓 하나 · 노란 물감 점', build: buildScarfB },
    C: { name: '버건디 목도리 팔레트', note: '버건디 목도리 · 앞에 작은 나무 팔레트', build: buildScarfC },
    REF: { name: '물방울 목걸이', note: '출시된 비 오는 날 목장식 (비교용)', ref: 'rn_drop_scarf' },
  },
  at_palette_pack: {
    slot: 'back', cols: 'pack', name: '팔레트 배낭', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '나무 팔레트 배낭', note: '팔레트 모양 나무 배낭 · 엄지 구멍 · 물감 넷', build: buildPalettePackA },
    B: { name: '남색 화구 가방', note: '남색 가방 · 크림 덮개 · 위로 붓 셋', build: buildPalettePackB },
    C: { name: '그림 캔버스 배낭', note: '나무 틀 캔버스 · 하늘·언덕·해 그림', build: buildPalettePackC },
    REF: { name: '개구리 배낭', note: '출시된 비 오는 날 배낭 (비교용)', ref: 'rn_frog_pack', anchor: 'back' },
  },
  at_paint_trail: {
    slot: 'trail', name: '물감 발자국', rec: 'B', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '물감 튄 자국', note: '파란 물감 얼룩 · 노란 점 · 튄 방울', build: buildPaintTrailA },
    B: { name: '알록달록 발바닥', note: '남색 발바닥 · 발가락 넷 빨강·노랑·파랑·초록', build: buildPaintTrailB },
    C: { name: '붓 자국', note: '비스듬한 버건디 붓 한 획 · 끝에 튄 노란 점 둘', build: buildPaintTrailC },
    REF: { name: '물웅덩이 발자국', note: '출시된 비 오는 날 발자국 (비교용)', ref: 'rn_puddle_trail' },
  },
};
