import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt } from '../../js/cosmetics/art-forest-pick.js';
import { ringR } from '../../js/cosmetics/anchors.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';

export const SB = Object.freeze({
  sakura: 0xf592b6, sakuraDk: 0xe0739c, sakuraLt: 0xf9bad2, rose: 0xc95a7a,
  cream: 0xe6d6ba, leaf: 0x8cc06a, leafDk: 0x689e50,
  wood: 0xc99a64, woodDk: 0x9c7046, butter: 0xeac25a,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 16, b = 12, ...rest) => new THREE.SphereGeometry(r, a, b, ...rest),
    cyl: (a, b, hh, s = 20, ...rest) => new THREE.CylinderGeometry(a, b, hh, s, ...rest),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function ex(THREE, sh, d, bev) {
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -d / 2); return geo;
}

export function petalShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.44, s * 0.16, s * 0.46, s * 0.84, s * 0.18, s);
  sh.lineTo(0, s * 0.86);
  sh.lineTo(-s * 0.18, s);
  sh.bezierCurveTo(-s * 0.46, s * 0.84, -s * 0.44, s * 0.16, 0, 0);
  return sh;
}

function leafShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.quadraticCurveTo(s * 0.36, s * 0.45, 0, s);
  sh.quadraticCurveTo(-s * 0.36, s * 0.45, 0, 0);
  return sh;
}

function blossom(K, p, s, petal = SB.sakura, center = SB.rose) {
  const g = K.grp(p);
  for (let i = 0; i < 5; i++) {
    const pg = K.grp(g); pg.rotation.z = i / 5 * TAU;
    const m = K.add(pg, ex(K.THREE, petalShape(K.THREE, s), s * 0.06, s * 0.03), petal, 0, s * 0.06, 0);
    m.rotation.x = -0.28;
  }
  K.add(g, K.sph(s * 0.2, 10, 8), center, 0, 0, s * 0.08).scale.z = 0.6;
  return g;
}

function bud(K, p, s, c = SB.sakuraDk) {
  const g = K.grp(p);
  K.add(g, K.sph(s, 10, 8), c).scale.set(0.8, 1.15, 0.8);
  return g;
}

function leaf(K, p, s, c = SB.leaf, rz = 0) {
  const m = K.add(p, ex(K.THREE, leafShape(K.THREE, s), s * 0.06, s * 0.03), c);
  m.rotation.z = rz; return m;
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

export function buildCrownA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, SB.leaf);
  const e = sideSpot(K, g, k, HR);
  leaf(K, e, HR * 0.3, SB.leaf, 1.9).position.set(-HR * 0.02, -HR * 0.02, -HR * 0.03);
  leaf(K, e, HR * 0.26, SB.leafDk, -1.7).position.set(HR * 0.04, HR * 0.02, -HR * 0.03);
  blossom(K, e, HR * 0.23).position.set(0, 0, HR * 0.02);
  blossom(K, e, HR * 0.14, SB.sakuraLt).position.set(-HR * 0.24, HR * 0.14, 0);
  blossom(K, e, HR * 0.12).position.set(HR * 0.2, -HR * 0.18, 0);
  flatten(THREE, g);
}

export function buildCrownB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  headband(K, g, HR, SB.sakura);
  const e = sideSpot(K, g, k, HR);
  leaf(K, e, HR * 0.28, SB.leaf, 2.2).position.set(0, 0, -HR * 0.03);
  blossom(K, e, HR * 0.27).position.set(0, 0, HR * 0.02);
  bud(K, e, HR * 0.07).position.set(HR * 0.22, -HR * 0.2, 0);
  flatten(THREE, g);
}

export function buildCrownC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, hy = HR * 0.72, rr = ringR(HR, 0.72) * 1.14;
  const tilt = K.grp(g); tilt.rotation.x = 0.22;
  const ring = K.grp(tilt, 0, hy, 0);
  K.add(ring, K.tor(rr, HR * 0.05, 6, 40), SB.woodDk, 0, 0, 0, true).rotation.x = Math.PI / 2;
  [[-0.95, 0.21, SB.sakura], [-0.32, 0.18, SB.sakuraLt], [0.32, 0.2, SB.sakura], [0.95, 0.18, SB.sakuraLt], [1.9, 0.16, SB.sakura], [-1.9, 0.16, SB.sakura]].forEach(([a, s, c], i) => {
    const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
    const o = K.grp(ring, x, HR * 0.03, z); o.rotation.y = a; o.rotation.x = -0.7;
    if (i % 2 === 0) leaf(K, o, HR * 0.2, SB.leaf, i ? 1.9 : -1.9).position.z = -HR * 0.02;
    blossom(K, o, HR * s, c);
  });
  flatten(THREE, g);
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

function bow(K, p, s, loop, tail) {
  const THREE = K.THREE, b = K.grp(p);
  [-1, 1].forEach(x => {
    K.add(b, ex(THREE, loopShape(THREE, s), s * 0.06, s * 0.018), loop).rotation.y = x < 0 ? Math.PI : 0;
    K.add(b, ex(THREE, tailShape(THREE, s), s * 0.04, s * 0.018), tail, x * s * 0.03, -s * 0.02, -s * 0.03).rotation.y = x < 0 ? Math.PI : 0;
  });
  return b;
}

function neckCord(K, g, r, c, tube) {
  K.add(g, K.tor(r, r * tube, 7, 36), c, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
}

function front(THREE, K, k, g, r, build, at = 0) {
  const w = new THREE.Group();
  build(w);
  stickOn(THREE, k, g, w, K.V(r * at, -r * 0.26, r), 1.12);
}

export function buildRibbonA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r, SB.sakura, 0.12);
  front(THREE, K, k, g, r, w => {
    bow(K, w, r * 1.0, SB.sakura, SB.sakuraDk);
    blossom(K, w, r * 0.13, SB.sakuraLt, SB.rose).position.z = r * 0.05;
  });
  flatten(THREE, g);
}

export function buildRibbonB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, SB.cream, 0.12);
  front(THREE, K, k, g, r, w => {
    leaf(K, w, r * 0.32, SB.leaf, 2.3).position.z = -r * 0.03;
    leaf(K, w, r * 0.28, SB.leafDk, -2.4).position.z = -r * 0.03;
    blossom(K, w, r * 0.22).position.z = r * 0.02;
    bud(K, w, r * 0.06).position.set(r * 0.24, r * 0.12, 0);
  });
  flatten(THREE, g);
}

export function buildRibbonC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckCord(K, g, r * 1.01, SB.leafDk, 0.09);
  front(THREE, K, k, g, r, w => {
    [[-1, SB.sakura, 0.62], [1, SB.sakuraLt, 0.52]].forEach(([s, c, L]) => {
      const t = K.add(w, ex(THREE, petalShape(THREE, r * L), r * 0.04, r * 0.015), c, s * r * 0.03, 0, -r * 0.03);
      t.rotation.z = Math.PI + s * 0.32;
    });
    blossom(K, w, r * 0.15, SB.sakura, SB.rose).position.z = r * 0.04;
  }, 0.25);
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

function weave(K, f, w, hh, y0, rows, zf, R) {
  const bh = hh / rows;
  for (let r = 0; r < rows; r++)
    K.add(f, new K.THREE.BoxGeometry(w, bh * 0.28, R * 0.02), SB.woodDk, 0, y0 + (r + 0.5) * bh, zf, true);
  [-1, 1].forEach(s => K.add(f, new K.THREE.BoxGeometry(R * 0.025, hh, R * 0.025), SB.woodDk, s * w * 0.5, y0 + hh / 2, zf, true));
}

function basket(THREE, K, f, R, w, hh, d) {
  const zf = -R * 0.03 - d - R * 0.03;
  slab(K, f, roundRect(THREE, w, hh, R * 0.1, R * 0.06), d, SB.wood, -R * 0.03, R * 0.03);
  weave(K, f, w * 0.9, hh * 0.78, -hh / 2 + hh * 0.06, 4, zf + R * 0.005, R);
  K.add(f, new THREE.BoxGeometry(w * 1.02, hh * 0.08, d + R * 0.08), SB.woodDk, 0, hh / 2 - hh * 0.04, -R * 0.03 - d / 2 - R * 0.01, true);
  return zf;
}

function gingham(K, f, w, hh, y, zf, R, base, check) {
  K.add(f, new K.THREE.BoxGeometry(w, hh, R * 0.03), base, 0, y, zf, true);
  const n = 5, cw = w / n, m = 3, ch = hh / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if ((i + j) % 2 === 0)
    K.add(f, new K.THREE.BoxGeometry(cw * 0.98, ch * 0.98, R * 0.01), check, -w / 2 + cw * (i + 0.5), y - hh / 2 + ch * (j + 0.5), zf - R * 0.012, true);
}

export function buildPicnicPackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, packY(k0));
  const w = R * 0.66, hh = R * 0.5, d = R * 0.16;
  const zf = basket(THREE, K, f, R, w, hh, d);
  gingham(K, f, w * 0.8, hh * 0.3, hh / 2 - hh * 0.02, zf - R * 0.005, R, SB.sakura, SB.cream);
  blossom(K, f, R * 0.1).position.set(0, -hh * 0.14, zf - R * 0.02);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.36, -R * 0.03), K.V(w * 0.3, hh * 0.36, -R * 0.03)], SB.woodDk);
  flatten(THREE, g);
}

export function buildPicnicPackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, packY(k0) - 0.04);
  const w = R * 0.66, hh = R * 0.46, d = R * 0.16;
  const zf = basket(THREE, K, f, R, w, hh, d);
  const lid = slab(K, f, roundRect(THREE, w * 1.04, hh * 0.3, R * 0.06), R * 0.03, SB.cream, zf, R * 0.012);
  lid.position.y = hh / 2 - hh * 0.12;
  const hd = K.add(f, K.tor(w * 0.22, R * 0.022, 6, 20, Math.PI), SB.woodDk, 0, hh / 2 + R * 0.01, -R * 0.03 - d / 2);
  hd.scale.y = 0.4;
  const b = bow(K, f, R * 0.26, SB.sakura, SB.sakuraDk); b.position.set(w * 0.3, hh / 2 - hh * 0.12, zf - R * 0.045);
  K.add(f, K.sph(R * 0.03, 10, 8), SB.sakuraDk, w * 0.3, hh / 2 - hh * 0.13, zf - R * 0.05);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.3, -R * 0.03), K.V(w * 0.3, hh * 0.3, -R * 0.03)], SB.sakuraDk);
  flatten(THREE, g);
}

export function buildPicnicPackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, packY(k0));
  const w = R * 0.64, hh = R * 0.48, d = R * 0.16;
  const zf = basket(THREE, K, f, R, w, hh, d);
  const top = hh / 2, zc = -R * 0.03 - d / 2;
  K.add(f, K.sph(w * 0.4, 16, 8, 0, TAU, 0, Math.PI / 2), SB.cream, 0, top - R * 0.03, zc).scale.set(1, 0.2, 0.5);
  const tw = K.grp(f, -w * 0.2, top - R * 0.02, zc - R * 0.04); tw.rotation.z = 1.3;
  K.add(tw, K.cyl(R * 0.014, R * 0.018, R * 0.34, 6), SB.woodDk, 0, R * 0.17, 0);
  [[0, R * 0.34, 0.075], [R * 0.06, R * 0.2, 0.06], [-R * 0.05, R * 0.26, 0.055]].forEach(([x, y, s], i) => {
    const b = blossom(K, tw, R * s, i === 1 ? SB.sakuraLt : SB.sakura); b.position.set(x, y, -R * 0.02); b.rotation.y = Math.PI;
  });
  blossom(K, f, R * 0.07, SB.sakuraLt).position.set(w * 0.26, -hh * 0.2, zf - R * 0.03);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.36, -R * 0.03), K.V(w * 0.3, hh * 0.36, -R * 0.03)], SB.leafDk);
  flatten(THREE, g);
}

function flatShape(THREE, g, h, geo, c, o, x, z, rotZ, ro, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = ro;
  return m;
}

function flatBlossom(THREE, g, h, s, o, x, z, rot, petal = SB.sakura) {
  const geo = new THREE.ShapeGeometry(petalShape(THREE, s), 8);
  for (let i = 0; i < 5; i++) flatShape(THREE, g, h, geo, petal, o, x, z, rot + i / 5 * TAU, 8);
  flatShape(THREE, g, h, new THREE.CircleGeometry(s * 0.2, 12), SB.rose, o, x, z, 0, 10, 0.011);
}

export function buildPetalTrailA(THREE, g, s, o, id, h) {
  flatBlossom(THREE, g, h, s * 0.56, o, 0, 0, 0.2);
}

export function buildPetalTrailB(THREE, g, s, o, id, h) {
  [[0, 0, 0.3, SB.sakura, 0.56], [s * 0.52, s * 0.36, 2.2, SB.sakuraLt, 0.48], [-s * 0.46, -s * 0.42, 4.1, SB.sakuraDk, 0.46]].forEach(([x, z, a, c, L], i) =>
    flatShape(THREE, g, h, new THREE.ShapeGeometry(petalShape(THREE, s * L), 8), c, o, x, z, a, 8 + i));
}

export function buildPetalTrailC(THREE, g, s, o, id, h) {
  flatBlossom(THREE, g, h, s * 0.44, o, -s * 0.1, 0, 0.5);
  [[s * 0.66, s * 0.34, 2.4, SB.sakuraLt], [-s * 0.54, -s * 0.58, 4.0, SB.sakura]].forEach(([x, z, a, c], i) =>
    flatShape(THREE, g, h, new THREE.ShapeGeometry(petalShape(THREE, s * 0.36), 8), c, o, x, z, a, 12 + i));
}

export const VARIANTS = {
  sb_blossom_crown: {
    slot: 'head', name: '벚꽃 화관', rec: 'A',
    A: { name: '연두 머리띠 꽃송이', note: '가는 연두 머리띠 · 귀 옆에 벚꽃 셋과 잎 둘', build: buildCrownA },
    B: { name: '분홍 머리띠 한 송이', note: '가는 분홍 머리띠 · 귀 옆에 큰 벚꽃 하나 · 꽃봉오리', build: buildCrownB },
    C: { name: '가지 화관', note: '머리를 두른 가는 나뭇가지 고리 · 작은 벚꽃 여섯', build: buildCrownC },
    REF: { name: '딸기 케이크 머리띠', note: '출시된 디저트 머리띠 (비교용)', ref: 'ds_cake_hat' },
  },
  sb_petal_ribbon: {
    slot: 'neck', name: '꽃잎 리본', rec: 'B',
    A: { name: '분홍 리본', note: '분홍 목끈 · 분홍 리본 · 가운데 연분홍 벚꽃', build: buildRibbonA },
    B: { name: '벚꽃 브로치', note: '크림 목끈 · 벚꽃 한 송이 · 잎 둘 · 꽃봉오리', build: buildRibbonB },
    C: { name: '꽃잎 끈', note: '가는 연두 끈 · 꽃잎 모양 끈 둘 · 작은 벚꽃 매듭', build: buildRibbonC },
    REF: { name: '마카롱 목걸이', note: '출시된 디저트 목장식 (비교용)', ref: 'ds_macaron_brooch' },
  },
  sb_picnic_pack: {
    slot: 'back', cols: 'pack', name: '피크닉 바구니 배낭', rec: 'A',
    A: { name: '체크 보 바구니', note: '나무 바구니 · 위로 보이는 분홍 체크 보 · 앞에 벚꽃 하나', build: buildPicnicPackA },
    B: { name: '손잡이 바구니', note: '나무 바구니 · 크림 뚜껑 · 낮은 손잡이 · 분홍 리본', build: buildPicnicPackB },
    C: { name: '벚꽃 가지 바구니', note: '나무 바구니 · 크림 보 · 옆으로 누운 벚꽃 가지', build: buildPicnicPackC },
    REF: { name: '컵케이크 배낭', note: '출시된 디저트 배낭 (비교용)', ref: 'ds_cupcake_pack', anchor: 'back' },
  },
  sb_petal_trail: {
    slot: 'trail', name: '꽃잎 발자국', rec: 'A',
    A: { name: '벚꽃 한 송이', note: '분홍 다섯 잎 벚꽃 · 진분홍 가운데', build: buildPetalTrailA },
    B: { name: '흩날린 꽃잎', note: '홈 파인 꽃잎 셋 · 분홍 세 가지', build: buildPetalTrailB },
    C: { name: '꽃과 꽃잎', note: '작은 벚꽃 하나 · 흩날린 꽃잎 둘', build: buildPetalTrailC },
    REF: { name: '크림 발자국', note: '출시된 디저트 발자국 (비교용)', ref: 'ds_cream_trail' },
  },
};
