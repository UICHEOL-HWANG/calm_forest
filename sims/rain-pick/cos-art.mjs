import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn, neckWrap } from '../../js/cosmetics/art-xmas-pick.js';
import { arcPt, pushOut } from '../../js/cosmetics/art-forest-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';

export const RN = Object.freeze({
  yellow: 0xf0cc48, yellowDk: 0xd2a838,
  blue: 0x5f8fc8, blueDk: 0x46709f, blueLt: 0x9cc2e4,
  frog: 0x7fb85a, frogDk: 0x5e9440,
  grey: 0x9aa3ad, greyDk: 0x6f7880,
  cream: 0xdcd6c4, ink: 0x2b2f36, pink: 0xeea0a6,
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
    cyl: (a, b, hh, s = 20) => new THREE.CylinderGeometry(a, b, hh, s),
    cone: (r, hh, s = 8) => new THREE.ConeGeometry(r, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    lathe: (pts, s = 28) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

const DROP = [[0, -1], [0.42, -0.86], [0.62, -0.5], [0.56, -0.1], [0.34, 0.36], [0.12, 0.76], [0, 1]];

function drop(K, p, s, c) {
  return K.add(p, K.lathe(DROP.map(([a, b]) => [a * s, b * s]), 14), c);
}

function dropShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, s);
  sh.bezierCurveTo(s * 0.18, s * 0.5, s * 0.62, s * 0.1, s * 0.6, -s * 0.36);
  sh.bezierCurveTo(s * 0.58, -s * 0.9, -s * 0.58, -s * 0.9, -s * 0.6, -s * 0.36);
  sh.bezierCurveTo(-s * 0.62, s * 0.1, -s * 0.18, s * 0.5, 0, s);
  return sh;
}

function rainHat(K, p, r, c) {
  const g = K.grp(p);
  K.add(g, K.lathe([[r, 0], [r * 0.97, r * 0.28], [r * 0.86, r * 0.5], [r * 0.64, r * 0.62], [r * 0.32, r * 0.67], [0, r * 0.68]]), c.crown);
  K.add(g, K.cyl(r * 1.0, r * 1.025, r * 0.15, 30), c.band, 0, r * 0.095, 0);
  const b = K.grp(g, 0, 0, -r * 0.07); b.scale.z = 1.12;
  K.add(b, K.lathe([[r * 0.99, 0], [r * 1.14, -r * 0.07], [r * 1.28, -r * 0.2], [r * 1.32, -r * 0.27], [r * 1.14, -r * 0.13], [r * 0.99, -r * 0.04]], 32), c.brim).material.side = 2;
  K.add(b, K.tor(r * 1.2, r * 0.012, 4, 40), c.stitch, 0, -r * 0.13, 0).rotation.x = Math.PI / 2;
  return g;
}

function sidePin(K, hat, r, a, y = 0.1) {
  const pin = K.grp(hat, Math.cos(a) * r * 1.01, r * y, Math.sin(a) * r * 1.01);
  pin.rotation.y = Math.PI / 2 - a;
  return pin;
}

export function buildRainHoodA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = HR * 0.62;
  const hat = rainHat(K, g, r, { crown: RN.yellow, band: RN.blue, brim: RN.yellow, stitch: RN.yellowDk });
  hat.position.set(0, HR * 0.76, -HR * 0.05); hat.rotation.set(-0.08, 0, 0.06);
  const d = drop(K, sidePin(K, hat, r, Math.PI * 0.62), r * 0.22, RN.blue);
  d.position.set(0, r * 0.16, r * 0.1);
  flatten(THREE, g);
}

export function buildRainHoodB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = HR * 0.62;
  const hat = rainHat(K, g, r, { crown: RN.blue, band: RN.yellow, brim: RN.blue, stitch: RN.blueDk });
  hat.position.set(0, HR * 0.76, -HR * 0.05); hat.rotation.set(-0.08, 0, 0.06);
  const d = drop(K, sidePin(K, hat, r, Math.PI * 0.62), r * 0.22, RN.yellow);
  d.position.set(0, r * 0.16, r * 0.1);
  flatten(THREE, g);
}

function leaf(K, p, s, c, vein) {
  const THREE = K.THREE, sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.bezierCurveTo(s * 0.42, s * 0.2, s * 0.4, s * 0.75, 0, s);
  sh.bezierCurveTo(-s * 0.4, s * 0.75, -s * 0.42, s * 0.2, 0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: s * 0.04, bevelEnabled: true, bevelSize: s * 0.015, bevelThickness: s * 0.015, bevelSegments: 1, curveSegments: 10 });
  geo.translate(0, 0, -s * 0.02);
  const g = K.grp(p);
  K.add(g, geo, c);
  K.add(g, K.cyl(s * 0.02, s * 0.02, s * 0.8, 4), vein, 0, s * 0.42, s * 0.04);
  return g;
}

export function buildRainHoodC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = HR * 0.54, ang = -0.3;
  const p = arcPt(THREE, k, ang, 0.86);
  const hat = rainHat(K, g, r, { crown: RN.yellow, band: RN.frog, brim: RN.yellow, stitch: RN.yellowDk });
  hat.position.set(p.x, p.y, -HR * 0.06); hat.rotation.set(-0.12, 0, ang);
  const pin = K.grp(hat, 0, r * 0.1, r * 1.01);
  const lf = leaf(K, pin, r * 0.42, RN.frog, RN.frogDk); lf.rotation.z = -0.7; lf.position.set(-r * 0.02, -r * 0.06, 0);
  drop(K, pin, r * 0.1, RN.blue).position.set(r * 0.16, r * 0.22, r * 0.05);
  flatten(THREE, g);
}

function surfPatch(THREE, k, h, g, color, fn, nu, nv, out) {
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
}

function backKnot(THREE, K, g, k, r, c) {
  const p = pushOut(THREE, k, K.V(0, r * 0.02, -r), 1.08);
  K.add(g, K.sph(r * 0.13, 12, 9), c, p.x, p.y, p.z).scale.set(1.2, 1, 0.8);
  [-1, 1].forEach(s => {
    const t = K.add(g, K.cone(r * 0.1, r * 0.34, 4), c, p.x + s * r * 0.1, p.y - r * 0.18, p.z - r * 0.04);
    t.rotation.set(0, 0, Math.PI + s * 0.35); t.scale.z = 0.4;
  });
}

function flatDrop(THREE, K, s, c) {
  const d = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(dropShape(THREE, s), { depth: s * 0.12, bevelEnabled: false, curveSegments: 10 });
  K.add(d, geo, c);
  return d;
}

export function buildDropScarfA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.1, 7, 40), RN.blue, 0, r * 0.04, 0, false).rotation.x = Math.PI / 2;
  const tri = (u, v) => K.V((u * 2 - 1) * 0.66 * (1 - v) * r, -r * 0.02 - v * 0.8 * r, r);
  surfPatch(THREE, k, h, g, RN.blue, tri, 12, 10, 1.09);
  [[0.5, 0.2], [0.26, 0.14], [0.74, 0.14], [0.38, 0.46], [0.62, 0.46], [0.5, 0.72]].forEach(([u, v]) => stickOn(THREE, k, g, flatDrop(THREE, K, r * 0.06, RN.blueLt), tri(u, v), 1.1));
  backKnot(THREE, K, g, k, r, RN.blue);
  flatten(THREE, g);
}

export function buildDropScarfB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [RN.yellow, RN.yellowDk], 0.12);
  const ch = new THREE.Group();
  K.add(ch, K.tor(r * 0.07, r * 0.02, 6, 14), RN.yellowDk, 0, -r * 0.02, 0);
  drop(K, ch, r * 0.22, RN.blue).position.set(0, -r * 0.3, r * 0.03);
  stickOn(THREE, k, g, ch, K.V(0, -r * 0.06, r), 1.13);
  flatten(THREE, g);
}

function cloud(K, p, s, c) {
  const g = K.grp(p);
  [[0, 0.05, 0.36], [-0.34, -0.04, 0.27], [0.34, -0.04, 0.27], [0.15, 0.22, 0.24]].forEach(([x, y, r]) => K.add(g, K.sph(s * r, 14, 10), c, x * s, y * s, 0).scale.z = 0.55);
  return g;
}

export function buildDropScarfC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [RN.blue, RN.blueDk], 0.13);
  const ch = new THREE.Group();
  cloud(K, ch, r * 0.5, RN.cream);
  drop(K, ch, r * 0.11, RN.blueLt).position.set(-r * 0.1, -r * 0.27, r * 0.02);
  drop(K, ch, r * 0.11, RN.blue).position.set(r * 0.11, -r * 0.31, r * 0.02);
  stickOn(THREE, k, g, ch, K.V(0, -r * 0.14, r), 1.14);
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

function packFrame(K, g, k, k0) {
  const c = backFront(k, packY(k0)), f = K.grp(g, 0, c.y, c.z);
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

function frogEyes(K, p, s, body, x0, y, z) {
  [-1, 1].forEach(sx => {
    const e = K.grp(p, sx * x0, y, z);
    K.add(e, K.sph(s, 14, 10), body);
    K.add(e, K.sph(s * 0.62, 12, 9), RN.cream, 0, s * 0.12, -s * 0.5);
    K.add(e, K.sph(s * 0.34, 10, 8), RN.ink, 0, s * 0.16, -s * 0.86);
  });
}

function smile(K, p, w, y, z, c) {
  const m = K.add(p, K.tor(w, w * 0.08, 5, 16, Math.PI * 0.7), c, 0, y, z);
  m.rotation.set(0, Math.PI, Math.PI + Math.PI * 0.15);
  return m;
}

export function buildFrogPackA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const w = R * 0.64, hh = R * 0.48, d = R * 0.16, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.16, w * 0.48), d, RN.frog, -R * 0.03, R * 0.035);
  frogEyes(K, f, R * 0.085, RN.frog, w * 0.26, hh / 2 - R * 0.01, -R * 0.03 - d / 2);
  smile(K, f, w * 0.2, -hh * 0.06, zf + R * 0.005, RN.frogDk);
  [-1, 1].forEach(s => K.add(f, K.sph(R * 0.045, 10, 8), RN.pink, s * w * 0.3, -hh * 0.06, zf + R * 0.01).scale.z = 0.35);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.32, -R * 0.03), K.V(w * 0.3, hh * 0.32, -R * 0.03)], RN.frogDk);
  flatten(THREE, g);
}

export function buildFrogPackB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const w = R * 0.6, hh = R * 0.46, d = R * 0.15, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.1, R * 0.18), d, RN.yellow, -R * 0.03, R * 0.035);
  const fh = hh * 0.42, fl = slab(K, f, roundRect(THREE, w * 1.02, fh, R * 0.1, R * 0.18), R * 0.025, RN.yellowDk, zf, R * 0.015);
  fl.position.y = hh / 2 - fh / 2 + R * 0.02;
  const bz = zf - R * 0.04, by = -hh * 0.12, br = R * 0.1;
  const b = K.add(f, K.cyl(br, br, R * 0.03, 22), RN.frog, 0, by, bz); b.rotation.x = Math.PI / 2;
  [-1, 1].forEach(s => {
    K.add(f, K.sph(br * 0.36, 10, 8), RN.frog, s * br * 0.5, by + br * 0.85, bz);
    K.add(f, K.sph(br * 0.2, 8, 6), RN.ink, s * br * 0.5, by + br * 0.9, bz - br * 0.28);
  });
  smile(K, f, br * 0.45, by - br * 0.1, bz - R * 0.016, RN.frogDk);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.34, -R * 0.03), K.V(w * 0.3, hh * 0.34, -R * 0.03)], RN.blueDk);
  flatten(THREE, g);
}

export function buildFrogPackC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0);
  const w = R * 0.58, hh = R * 0.42, d = R * 0.16, zf = -R * 0.03 - d - R * 0.04;
  slab(K, f, roundRect(THREE, w, hh, R * 0.1, R * 0.12), d, RN.blue, -R * 0.03, R * 0.035);
  K.add(f, new THREE.BoxGeometry(w * 0.9, R * 0.04, d * 0.9), RN.blueDk, 0, hh / 2 + R * 0.02, -R * 0.03 - d / 2);
  const fr = K.grp(f, 0, hh / 2 + R * 0.04, -R * 0.03 - d / 2), hr = R * 0.15;
  const hd = K.add(fr, K.sph(hr, 18, 12), RN.frog, 0, 0, 0); hd.scale.set(1.15, 0.62, 0.9);
  frogEyes(K, fr, hr * 0.42, RN.frog, hr * 0.52, hr * 0.5, 0);
  smile(K, fr, hr * 0.5, hr * 0.02, -hr * 0.84, RN.frogDk);
  K.add(f, K.cyl(R * 0.05, R * 0.05, R * 0.02, 16), RN.yellow, 0, -hh * 0.1, zf + R * 0.01).rotation.x = Math.PI / 2;
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.32, -R * 0.03), K.V(w * 0.3, hh * 0.32, -R * 0.03)], RN.blueDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, y, z, rotZ = 0) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

export function buildPuddleTrailA(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.5, 24), RN.blue, o * 0.8, 0, 0.008, 0).scale.set(1, 0.72, 1);
  flat(THREE, g, h, new THREE.RingGeometry(s * 0.28, s * 0.33, 24), RN.blueLt, o, s * 0.06, 0.01, -s * 0.03).scale.set(1, 0.72, 1);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.06, 10), RN.blueLt, o, -s * 0.2, 0.011, s * 0.12);
}

export function buildPuddleTrailB(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.RingGeometry(s * 0.42, s * 0.5, 28), RN.blue, o, 0, 0.008, 0).scale.set(1, 0.75, 1);
  flat(THREE, g, h, new THREE.RingGeometry(s * 0.18, s * 0.25, 22), RN.blueLt, o, 0, 0.009, 0).scale.set(1, 0.75, 1);
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.07, 10), RN.blue, o, 0, 0.01, 0);
}

export function buildPuddleTrailC(THREE, g, s, o, id, h) {
  flat(THREE, g, h, new THREE.ShapeGeometry(dropShape(THREE, s * 0.5), 12), RN.blue, o, 0, 0.008, 0, Math.PI);
  flat(THREE, g, h, new THREE.ShapeGeometry(dropShape(THREE, s * 0.2), 10), RN.blueLt, o, -s * 0.08, 0.01, s * 0.04, Math.PI);
  [[0.5, -0.5, 0.07], [-0.46, -0.6, 0.055], [0.58, 0.2, 0.05]].forEach(([x, z, r]) => flat(THREE, g, h, new THREE.CircleGeometry(s * r, 10), RN.blueLt, o, x * s, 0.011, z * s));
}

export const VARIANTS = {
  rn_rain_hood: {
    slot: 'head', name: '우비 모자', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '노란 레인햇', note: '작은 노란 레인햇 · 하늘색 띠 · 옆에 파란 물방울 핀 하나 · 뒤챙이 조금 길다', build: buildRainHoodA },
    B: { name: '하늘색 레인햇', note: '하늘색 레인햇 · 노란 띠 · 노란 물방울 핀 하나', build: buildRainHoodB },
    C: { name: '갸웃 미니 레인햇', note: '한쪽으로 기울인 더 작은 노란 모자 · 개구리색 띠 · 앞에 잎과 물방울', build: buildRainHoodC },
    REF: { name: '올리브 버킷햇', note: '출시된 캠핑 모자 (비교용)', ref: 'cp_bucket_hat' },
  },
  rn_drop_scarf: {
    slot: 'neck', name: '물방울 스카프', rec: 'B', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '물방울 무늬 손수건', note: '하늘색 삼각 손수건 · 연하늘 물방울 무늬 · 뒤 매듭', build: buildDropScarfA },
    B: { name: '노란 목끈 + 물방울', note: '가는 노란 목끈 · 앞에 파란 물방울 참 하나', build: buildDropScarfB },
    C: { name: '구름 참 목도리', note: '하늘색 목도리 · 앞에 작은 구름 · 물방울 둘', build: buildDropScarfC },
    REF: { name: '호랑가시 리본 타이', note: '출시된 크리스마스 목장식 (비교용)', ref: 'xm_holly_tie' },
  },
  rn_frog_pack: {
    slot: 'back', cols: 'pack', name: '개구리 배낭', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '개구리 얼굴 배낭', note: '연두 둥근 배낭 · 위에 눈 둘 · 웃는 입 · 분홍 볼', build: buildFrogPackA },
    B: { name: '노란 우비 배낭', note: '노란 배낭 · 진노랑 덮개 · 개구리 단추 하나', build: buildFrogPackB },
    C: { name: '개구리 빼꼼 배낭', note: '하늘색 배낭 · 위로 얼굴 내민 작은 개구리', build: buildFrogPackC },
    REF2: { name: '고슴도치 배낭', note: '출시된 숲 배낭 (비교용)', ref: 'fp_hedgehog_pack', anchor: 'back' },
  },
  rn_puddle_trail: {
    slot: 'trail', name: '물웅덩이 발자국', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '작은 웅덩이', note: '하늘색 웅덩이 · 연하늘 물결 고리 · 작은 물방울', build: buildPuddleTrailA },
    B: { name: '퍼지는 물결', note: '물결 고리 둘 · 가운데 빗방울 점', build: buildPuddleTrailB },
    C: { name: '빗방울 첨벙', note: '파란 빗방울 하나 · 둘레에 튄 물 세 점', build: buildPuddleTrailC },
    REF: { name: '크림 발자국', note: '출시된 디저트 발자국 (비교용)', ref: 'ds_cream_trail' },
  },
};
