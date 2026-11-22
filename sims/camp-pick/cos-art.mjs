import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt, pushOut } from '../../js/cosmetics/art-forest-pick.js';

export const CP = Object.freeze({
  olive: 0x7f8c4f, oliveDk: 0x5f6c3a,
  mustard: 0xd6a640, mustardDk: 0xae8330,
  brick: 0xc8643c, brickDk: 0x9e4a2c,
  cream: 0xe2d3b6, creamDk: 0xc9b48f,
  navy: 0x3a4a6c, navyDk: 0x2b3854,
  wood: 0x8a5e3a,
  ember: 0xf2b544, flame: 0xe07a3c,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add, mat: c => h.clay(c),
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 16, b = 12) => new THREE.SphereGeometry(r, a, b),
    cyl: (a, b, hh, s = 20, open = false) => new THREE.CylinderGeometry(a, b, hh, s, 1, open),
    cone: (r, hh, s = 8) => new THREE.ConeGeometry(r, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    lathe: (pts, s = 28) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

const two = m => { m.material.side = 2; return m; };

function bucketHat(K, p, r, c) {
  const g = K.grp(p);
  K.add(g, K.lathe([[r, 0], [r * 0.97, r * 0.3], [r * 0.9, r * 0.52], [r * 0.78, r * 0.62], [r * 0.45, r * 0.68], [0, r * 0.69]]), c.crown);
  K.add(g, K.cyl(r * 1.0, r * 1.025, r * 0.17, 30), c.band, 0, r * 0.105, 0);
  two(K.add(g, K.lathe([[r * 0.99, r * 0.0], [r * 1.16, -r * 0.06], [r * 1.32, -r * 0.17], [r * 1.34, -r * 0.215], [r * 1.15, -r * 0.1], [r * 0.99, -r * 0.04]], 32), c.brim));
  K.add(g, K.tor(r * 1.2, r * 0.012, 4, 40), c.stitch, 0, -r * 0.095, 0).rotation.x = Math.PI / 2;
  return g;
}

function pine(K, p, s, c, trunk) {
  const g = K.grp(p);
  [[0, 0.62, 0.36], [0.26, 0.5, 0.3], [0.5, 0.36, 0.24]].forEach(([y, w, hh]) => K.add(g, K.cone(s * w, s * hh, 6), c, 0, s * (y + hh / 2), 0));
  K.add(g, K.cyl(s * 0.07, s * 0.08, s * 0.14, 6), trunk, 0, -s * 0.04, 0);
  return g;
}

function feather(K, p, s, c, quillC) {
  const THREE = K.THREE, g = K.grp(p);
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.bezierCurveTo(s * 0.2, s * 0.2, s * 0.22, s * 0.7, 0, s);
  sh.bezierCurveTo(-s * 0.2, s * 0.7, -s * 0.18, s * 0.2, 0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: s * 0.03, bevelEnabled: true, bevelSize: s * 0.01, bevelThickness: s * 0.01, bevelSegments: 1, curveSegments: 10 });
  geo.translate(0, 0, -s * 0.015);
  K.add(g, geo, c);
  K.add(g, K.cyl(s * 0.014, s * 0.014, s * 1.1, 4), quillC, 0, s * 0.45, s * 0.03);
  return g;
}

export function buildBucketHatA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = HR * 0.64;
  const hat = bucketHat(K, g, r, { crown: CP.olive, band: CP.cream, brim: CP.olive, stitch: CP.oliveDk });
  hat.position.set(0, HR * 0.75, -HR * 0.05); hat.rotation.set(-0.08, 0, 0.06);
  const a = Math.PI * 0.62, pin = K.grp(hat, Math.cos(a) * r * 1.0, r * 0.1, Math.sin(a) * r * 1.0);
  pin.rotation.y = Math.PI / 2 - a;
  pine(K, pin, r * 0.3, CP.oliveDk, CP.wood).position.set(0, -r * 0.1, r * 0.04);
  flatten(THREE, g);
}

export function buildBucketHatB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = HR * 0.64;
  const hat = bucketHat(K, g, r, { crown: CP.cream, band: CP.olive, brim: CP.cream, stitch: CP.creamDk });
  hat.position.set(0, HR * 0.75, -HR * 0.05); hat.rotation.set(-0.08, 0, 0.06);
  const a = Math.PI * 0.6, f = K.grp(hat, Math.cos(a) * r * 1.01, r * 0.12, Math.sin(a) * r * 1.01);
  f.rotation.set(0, Math.PI / 2 - a, 0);
  const fe = feather(K, f, r * 0.7, CP.brick, CP.brickDk); fe.rotation.z = -0.95; fe.position.set(0, -r * 0.04, r * 0.02);
  flatten(THREE, g);
}

export function buildBucketHatC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = HR * 0.56, ang = -0.3;
  const p = arcPt(THREE, k, ang, 0.86);
  const hat = bucketHat(K, g, r, { crown: CP.brick, band: CP.cream, brim: CP.brick, stitch: CP.brickDk });
  hat.position.set(p.x, p.y, -HR * 0.06); hat.rotation.set(-0.12, 0, ang);
  const pin = K.grp(hat, 0, r * 0.1, r * 1.0);
  pine(K, pin, r * 0.3, CP.oliveDk, CP.wood).position.set(0, -r * 0.1, r * 0.04);
  flatten(THREE, g);
}

function surfPatch(THREE, k, h, g, color, fn, nu = 10, nv = 8, out = 1.08) {
  const pos = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const p = pushOut(THREE, k, fn(i / nu, j / nv), out);
    pos.push(p.x, p.y, p.z);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, h.clay(color, false)); m.material.side = THREE.DoubleSide; m.castShadow = true;
  g.add(m);
  return m;
}

function bandana(THREE, K, g, k, h, r, main, drop = 0.82, half = 0.7) {
  K.add(g, K.tor(r * 1.0, r * 0.1, 7, 40), main, 0, r * 0.04, 0, false).rotation.x = Math.PI / 2;
  const tri = (u, v) => {
    const w = half * (1 - v), x = (u * 2 - 1) * w * r;
    return K.V(x, -r * 0.02 - v * drop * r, r);
  };
  surfPatch(THREE, k, h, g, main, tri, 12, 10, 1.09);
  return { tri };
}

function dotOn(THREE, K, k, g, P, rr, c, out = 1.12) {
  const d = new THREE.Group();
  K.add(d, K.cyl(rr, rr, rr * 0.4, 12), c, 0, 0, 0).rotation.x = Math.PI / 2;
  stickOn(THREE, k, g, d, P, out);
}

function backKnot(THREE, K, g, k, r, c) {
  const p = pushOut(THREE, k, K.V(0, r * 0.02, -r), 1.08);
  K.add(g, K.sph(r * 0.13, 12, 9), c, p.x, p.y, p.z).scale.set(1.2, 1, 0.8);
  [-1, 1].forEach(s => {
    const t = K.add(g, K.cone(r * 0.1, r * 0.34, 4), c, p.x + s * r * 0.1, p.y - r * 0.18, p.z - r * 0.04);
    t.rotation.set(0, 0, Math.PI + s * 0.35); t.scale.z = 0.4;
  });
}

export function buildBandanaA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const { tri } = bandana(THREE, K, g, k, h, r, CP.brick);
  [[0.5, 0.18], [0.3, 0.22], [0.7, 0.22], [0.5, 0.48], [0.18, 0.1], [0.82, 0.1], [0.5, 0.74]].forEach(([u, v]) => dotOn(THREE, K, k, g, tri(u, v), r * 0.045, CP.cream, 1.105));
  backKnot(THREE, K, g, k, r, CP.brick);
  flatten(THREE, g);
}

export function buildBandanaB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const { tri } = bandana(THREE, K, g, k, h, r, CP.navy);
  [[0.5, 0.2], [0.26, 0.15], [0.74, 0.15], [0.38, 0.45], [0.62, 0.45], [0.5, 0.7]].forEach(([u, v]) => dotOn(THREE, K, k, g, tri(u, v), r * 0.04, CP.cream, 1.105));
  const s = new THREE.Group();
  K.add(s, K.cyl(r * 0.1, r * 0.1, r * 0.06, 14), CP.mustard).rotation.x = Math.PI / 2;
  K.add(s, K.tor(r * 0.1, r * 0.02, 5, 14), CP.mustardDk, 0, 0, r * 0.03);
  stickOn(THREE, k, g, s, tri(0.5, 0.02), 1.13);
  backKnot(THREE, K, g, k, r, CP.navy);
  flatten(THREE, g);
}

export function buildBandanaC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const { tri } = bandana(THREE, K, g, k, h, r, CP.olive, 0.78, 0.64);
  const t = new THREE.Group();
  pine(K, t, r * 0.3, CP.cream, CP.creamDk);
  t.scale.z = 0.25;
  stickOn(THREE, k, g, t, tri(0.5, 0.42), 1.105);
  backKnot(THREE, K, g, k, r, CP.olive);
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
  const c = backFront(k, yc);
  const f = K.grp(g, 0, c.y, c.z);
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

function roll(K, p, rr, len, c, lining, strap) {
  const g = K.grp(p);
  K.add(g, K.cyl(rr, rr, len, 22), c).rotation.z = Math.PI / 2;
  [-1, 1].forEach(s => {
    K.add(g, K.tor(rr * 0.92, rr * 0.1, 6, 22), c, s * len / 2, 0, 0).rotation.y = Math.PI / 2;
    const sp = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 2.2, q = rr * (0.12 + 0.68 * t); sp.push(K.V(s * (len / 2 + rr * 0.02), Math.sin(a) * q, Math.cos(a) * q)); }
    g.add(tubeAlong(K.THREE, sp, rr * 0.07, K.mat(lining), 60, 4));
    K.add(g, K.cyl(rr * 0.86, rr * 0.86, rr * 0.02, 22), lining, s * (len / 2 + rr * 0.0), 0, 0).rotation.z = Math.PI / 2;
  });
  if (strap) [-0.28, 0.28].forEach(x => K.add(g, K.tor(rr * 1.04, rr * 0.1, 5, 24), strap, x * len, 0, 0).rotation.y = Math.PI / 2);
  return g;
}

const PACK_Y = { bushy: 0.74, curl: 0.86, puff: 0.66, feather: 0.62 };
const yOf = (k, d = 0, lift = {}) => (PACK_Y[k.tail] ?? 0.56) + d + (lift[k.tail] ?? 0);

export function buildSleepingbagPackA(THREE, g, k0, h, yc = yOf(k0, 0, { feather: 0.2 })) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, yc);
  const w = R * 0.62, hh = R * 0.46, d = R * 0.15, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.12, R * 0.2), d, CP.olive, -R * 0.03, R * 0.035);
  const pw = w * 0.62, ph = hh * 0.4, pk = slab(K, f, roundRect(THREE, pw, ph, R * 0.06), R * 0.03, CP.oliveDk, zf + R * 0.01, R * 0.015);
  pk.position.y = -hh * 0.14;
  K.add(f, new THREE.BoxGeometry(R * 0.07, R * 0.05, R * 0.03), CP.mustard, 0, -hh * 0.14 + ph * 0.42, zf - R * 0.03, true);
  const rr = R * 0.1, rl = roll(K, f, rr, w * 1.08, CP.brick, CP.cream, CP.oliveDk);
  rl.position.set(0, hh / 2 + rr * 0.82, -R * 0.03 - d / 2 - R * 0.02);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.36, -R * 0.03), K.V(w * 0.3, hh * 0.36, -R * 0.03)], CP.oliveDk);
  flatten(THREE, g);
}

export function buildSleepingbagPackB(THREE, g, k0, h, yc = yOf(k0, 0.04)) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, yc);
  const rr = R * 0.15, len = R * 0.82;
  const rl = roll(K, f, rr, len, CP.mustard, CP.cream, CP.oliveDk);
  rl.position.set(0, 0, -R * 0.03 - rr);
  packStraps(THREE, g, k, h, f, [K.V(-len * 0.28, rr * 0.6, -R * 0.03 - rr * 0.3), K.V(len * 0.28, rr * 0.6, -R * 0.03 - rr * 0.3)], CP.oliveDk);
  flatten(THREE, g);
}

export function buildSleepingbagPackC(THREE, g, k0, h, yc = yOf(k0, 0.06, { feather: 0.12, puff: 0.06 })) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, yc);
  const w = R * 0.6, hh = R * 0.42, d = R * 0.15, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.1, w * 0.45), d, CP.olive, -R * 0.03, R * 0.035);
  const fh = hh * 0.5, fl = slab(K, f, roundRect(THREE, w * 1.02, fh, R * 0.12, w * 0.45), R * 0.025, CP.cream, zf, R * 0.015);
  fl.position.y = hh / 2 - fh / 2 + R * 0.02;
  K.add(f, new THREE.BoxGeometry(R * 0.06, R * 0.08, R * 0.03), CP.brickDk, 0, hh / 2 - fh + R * 0.04, zf - R * 0.035, true);
  const rr = R * 0.085, rl = roll(K, f, rr, w * 1.06, CP.brick, CP.cream, CP.oliveDk);
  rl.position.set(0, -hh / 2 - rr * 0.7, -R * 0.03 - d / 2 - R * 0.02);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.34, -R * 0.03), K.V(w * 0.3, hh * 0.34, -R * 0.03)], CP.oliveDk);
  flatten(THREE, g);
}

function flame(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, s);
  sh.bezierCurveTo(s * 0.12, s * 0.55, s * 0.6, s * 0.3, s * 0.52, -s * 0.28);
  sh.bezierCurveTo(s * 0.46, -s * 0.78, -s * 0.46, -s * 0.78, -s * 0.52, -s * 0.28);
  sh.bezierCurveTo(-s * 0.6, s * 0.3, -s * 0.12, s * 0.55, 0, s);
  return sh;
}

function spark(THREE, s) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = i % 2 ? s * 0.32 : s; const x = Math.sin(a) * q, y = Math.cos(a) * q; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  sh.closePath();
  return sh;
}

function flat(THREE, g, h, geo, c, o, x, y, z, rotZ = 0) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

export function buildEmberTrailA(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.ShapeGeometry(flame(THREE, s * 0.78), 12), CP.flame, o, 0, 0.008, 0, Math.PI);
  flat(THREE, g, h, new THREE.ShapeGeometry(flame(THREE, s * 0.4), 12), CP.ember, o, 0, 0.01, -s * 0.14, Math.PI);
  [[0.62, -0.5, 0.07], [-0.58, -0.7, 0.055]].forEach(([x, z, r]) => flat(THREE, g, h, new THREE.CircleGeometry(s * r, 8), CP.ember, o, x * s, 0.011, z * s));
}

export function buildEmberTrailB(THREE, g, s, o, id, h) {
  const lg = h.put(g, new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.16, s * 0.62, 2, 8), h.film(CP.wood, o)), 0, 0.008, s * 0.32, false);
  lg.rotation.set(Math.PI / 2, 0, Math.PI / 2); lg.scale.z = 0.1; lg.renderOrder = 8;
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.09, 12), CP.creamDk, o, s * 0.4, 0.009, s * 0.32);
  flat(THREE, g, h, new THREE.ShapeGeometry(flame(THREE, s * 0.48), 12), CP.flame, o, 0, 0.01, -s * 0.08, Math.PI);
  flat(THREE, g, h, new THREE.ShapeGeometry(flame(THREE, s * 0.24), 12), CP.ember, o, 0, 0.011, -s * 0.17, Math.PI);
}

export function buildEmberTrailC(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.ShapeGeometry(spark(THREE, s * 0.56), 1), CP.ember, o, 0, 0.008, 0, 0.2);
  [[0.6, 0.4, 0.08, CP.flame], [-0.56, 0.48, 0.06, CP.flame], [0.4, -0.62, 0.065, CP.ember], [-0.48, -0.46, 0.05, CP.flame]].forEach(([x, z, r, c]) => flat(THREE, g, h, new THREE.CircleGeometry(s * r, 8), c, o * 0.9, x * s, 0.01, z * s));
}

export const VARIANTS = {
  cp_bucket_hat: {
    slot: 'head', name: '버킷햇', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '올리브 버킷햇', note: '작은 올리브 버킷햇 · 크림 띠 · 옆에 작은 소나무 핀 하나', build: buildBucketHatA },
    B: { name: '크림 버킷햇 + 깃털', note: '크림 버킷햇 · 올리브 띠 · 벽돌색 깃털 하나', build: buildBucketHatB },
    C: { name: '갸웃 미니 버킷햇', note: '한쪽으로 기울여 쓴 더 작은 벽돌색 모자 · 크림 띠 · 소나무 핀', build: buildBucketHatC },
    REF: { name: '리본 머리띠', note: '출시된 디저트 머리띠 (비교용)', ref: 'ds_cake_hat' },
  },
  cp_bandana: {
    slot: 'neck', name: '손수건 스카프', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '벽돌색 물방울 손수건', note: '앞으로 늘어진 삼각 손수건 · 크림 물방울 · 뒤 매듭', build: buildBandanaA },
    B: { name: '남색 손수건 + 단추', note: '남색 삼각 손수건 · 크림 물방울 · 위에 작은 머스터드 단추', build: buildBandanaB },
    C: { name: '올리브 소나무 손수건', note: '올리브 삼각 손수건 · 크림 소나무 자수 하나', build: buildBandanaC },
    REF: { name: '호랑가시 리본 타이', note: '출시된 크리스마스 목장식 (비교용)', ref: 'xm_holly_tie' },
  },
  cp_sleepingbag_pack: {
    slot: 'back', cols: 'pack', name: '침낭 배낭', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '침낭 얹은 배낭', note: '올리브 배낭 · 위에 벽돌색 침낭 롤 · 작은 앞주머니', build: buildSleepingbagPackA },
    B: { name: '침낭 롤 하나', note: '배낭 없이 머스터드 침낭 롤만 · 크림 안감 돌돌 · 올리브 끈', build: buildSleepingbagPackB },
    C: { name: '덮개 배낭 + 아래 침낭', note: '올리브 배낭 · 크림 덮개 · 아래에 매단 벽돌색 침낭', build: buildSleepingbagPackC },
    REF: { name: '리본 배낭', note: '출시된 디저트 배낭 (비교용)', ref: 'ds_cupcake_pack', anchor: 'back' },
    REF2: { name: '고슴도치 배낭', note: '출시된 숲 배낭 (비교용)', ref: 'fp_hedgehog_pack', anchor: 'back' },
  },
  cp_ember_trail: {
    slot: 'trail', name: '장작불 불씨 발자국', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '작은 불꽃', note: '벽돌색 불꽃 · 안쪽 노란 불꽃 · 불씨 두 점', build: buildEmberTrailA },
    B: { name: '장작과 불꽃', note: '작은 장작 하나 · 그 위 불꽃', build: buildEmberTrailB },
    C: { name: '불티 반짝', note: '노란 불티 별 하나 · 둘레 불씨 네 점', build: buildEmberTrailC },
    REF: { name: '크림 발자국', note: '출시된 디저트 발자국 (비교용)', ref: 'ds_cream_trail' },
  },
};
