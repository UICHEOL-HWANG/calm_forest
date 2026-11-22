import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { packY } from './art-dessert-pick.js';

export const AU = Object.freeze({
  navy: 0x26335e, navyDk: 0x1a2446,
  mint: 0x5cc4ac, mintDk: 0x3a9886,
  violet: 0x8c70cc, violetDk: 0x6a52a6,
  pink: 0xd47cac, pinkDk: 0xac5a88,
  fur: 0xccdbe6, furDk: 0xaabccc,
  wood: 0x8a6242, woodDk: 0x5e402a, silver: 0xa9b3c2,
  gMint: 0x7ee6c6, gViolet: 0xb49cf0, gPink: 0xf0a2d0, gIce: 0xa8dcf0,
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
    ico: (r, d = 1) => new THREE.IcosahedronGeometry(r, d),
    tor: (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
    tube: (p, pts, r, c, seg = 24, rad = 7) => { const m = tubeAlong(THREE, pts, r, h.clay(c, false), seg, rad); p.add(m); return m; },
  };
}

function ribbonGeo(THREE, w, L, sway, depth) {
  const sh = new THREE.Shape(), n = 10, l = [], r = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.sin(t * Math.PI * 1.4) * sway, hw = w / 2 * (1 - t * 0.85);
    l.push([x - hw, t * L]); r.push([x + hw, t * L]);
  }
  sh.moveTo(...l[0]); l.slice(1).forEach(p => sh.lineTo(...p)); r.reverse().forEach(p => sh.lineTo(...p)); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: depth * 0.5, bevelThickness: depth * 0.5, bevelSegments: 2 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function bandAt(K, band, HR, a, rr = 1.08) {
  const e = K.grp(band, Math.cos(a) * HR * rr, Math.sin(a) * HR * rr, 0);
  e.rotation.z = a - Math.PI / 2;
  return e;
}

export function buildFurBand(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, band = K.grp(g); band.rotation.x = 0.45;
  for (let i = 0; i <= 22; i++) {
    const a = 0.06 + (Math.PI - 0.12) * i / 22, e = bandAt(K, band, HR, a, 1.08);
    K.add(e, K.ico(HR * (0.085 + 0.012 * (i % 2)), 1), i % 3 ? AU.fur : AU.furDk);
  }
  const b = bandAt(K, band, HR, 2.3, 1.16); b.rotation.z += 0.2; b.scale.setScalar(1.7);
  [-1, 1].forEach(s => {
    const loop = K.grp(b, s * HR * 0.17, HR * 0.04, 0); loop.rotation.z = s * 0.35;
    const m = K.add(loop, K.sph(HR * 0.16, 16, 12), s < 0 ? AU.violet : AU.pink); m.scale.set(1.1, 0.62, 0.34);
  });
  [[-0.06, AU.mint, 0.55], [0.07, AU.violetDk, 0.45]].forEach(([x, c, L]) => {
    const t = K.grp(b, x * HR, -HR * 0.02, HR * 0.02); t.rotation.z = Math.PI + x * 3;
    K.add(t, ribbonGeo(THREE, HR * 0.13, HR * L, HR * 0.06, HR * 0.03), c);
  });
  K.add(b, K.sph(HR * 0.07, 12, 10), AU.pinkDk, 0, HR * 0.03, HR * 0.03);
  flatten(THREE, g);
}

function pom(K, p, r, c, x, y, z) {
  K.add(p, K.ico(r, 2), c, x, y, z);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.39996, t = (i + 0.5) / 8, ry = 1 - 2 * t, rr = Math.sqrt(1 - ry * ry);
    K.add(p, K.ico(r * 0.42, 1), c, x + Math.cos(a) * rr * r * 0.82, y + ry * r * 0.82, z + Math.sin(a) * rr * r * 0.82);
  }
}

function furRing(K, g, r, y, n, pr, cols, jitter = 0) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + jitter;
    K.add(g, K.ico(pr * (0.9 + 0.2 * ((i * 7) % 3) / 2), 1), cols[i % cols.length], Math.sin(a) * r, y, Math.cos(a) * r);
  }
}

export function buildFurMuff(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.26, 8, 36), AU.furDk, 0, r * 0.04, 0).rotation.x = Math.PI / 2;
  furRing(K, g, r * 1.02, r * 0.16, 16, r * 0.24, [AU.fur, AU.fur, AU.furDk]);
  furRing(K, g, r * 1.1, -r * 0.1, 18, r * 0.24, [AU.fur, AU.furDk, AU.fur], 0.17);
  const w = new THREE.Group();
  [-1, 1].forEach(s => {
    K.tube(w, [K.V(s * r * 0.08, 0, 0), K.V(s * r * 0.11, -r * 0.14, r * 0.02), K.V(s * r * 0.15, -r * 0.3, r * 0.02)], r * 0.02, AU.mintDk, 10, 5);
    pom(K, w, r * 0.12, s < 0 ? AU.mint : AU.violet, s * r * 0.15, -r * 0.4, r * 0.03);
  });
  stickOn(THREE, k, g, w, K.V(0, -r * 0.18, r), 1.3);
  flatten(THREE, g);
}

function packStraps(THREE, g, k, h, f, pts, color) {
  f.updateMatrix();
  pts.forEach((p, i) => {
    const s = i ? 1 : -1, p0 = p.clone().applyMatrix4(f.matrix);
    const path = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, path, k.R * 0.04, h.clay(color), 28, 6));
  });
}

export function buildAuroraSledPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0) + 0.06), f = K.grp(g, 0, c.y, c.z);
  f.rotation.x = 0.08;
  const z = -R * 0.05, w = R * 0.8, H = R * 0.6, d = R * 0.04;
  for (let i = 0; i < 5; i++) K.add(f, K.box(w, R * 0.105, d), AU.wood, 0, -H / 2 + R * 0.06 + i * (H - R * 0.12) / 4, z);
  [-1, 1].forEach(s => {
    const x = s * w * 0.36, rz = z - d * 0.5 - R * 0.05;
    K.add(f, K.box(R * 0.07, H * 0.92, R * 0.05), AU.woodDk, x, 0, z - d * 0.5 - R * 0.02);
    K.tube(f, [K.V(x, -H / 2 - R * 0.02, rz + R * 0.02), K.V(x, -H / 2 + R * 0.1, rz - R * 0.02), K.V(x, H / 2 - R * 0.05, rz - R * 0.02), K.V(x, H / 2 + R * 0.08, rz - R * 0.08), K.V(x, H / 2 + R * 0.06, rz - R * 0.18), K.V(x, H / 2 - R * 0.02, rz - R * 0.16)], R * 0.036, AU.silver, 30, 7);
  });
  [AU.mint, AU.violet, AU.pink].forEach((col, i) => K.add(f, K.box(w * 0.9, R * 0.03, R * 0.012), col, 0, (i - 1) * R * 0.034, z - R * 0.026));
  K.tube(f, [K.V(-w * 0.36, H / 2 + R * 0.04, z - R * 0.12), K.V(0, H / 2 - R * 0.06, z - R * 0.1), K.V(w * 0.36, H / 2 + R * 0.04, z - R * 0.12)], R * 0.014, AU.navy, 16, 5);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.18, H * 0.3, -R * 0.02), K.V(R * 0.18, H * 0.3, -R * 0.02)], AU.navyDk);
  flatten(THREE, g);
}

function stripGeo(THREE, rows) {
  const pos = [], col = [], idx = [];
  rows.forEach(([a, b, c0, c1], i) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const ca = new THREE.Color(c0), cb = new THREE.Color(c1);
    col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
    if (i) { const q = i * 2; idx.push(q - 2, q - 1, q, q - 1, q + 1, q, q - 2, q, q - 1, q - 1, q, q + 1); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function buildAuroraTrail(THREE, g, s0, o, h) {
  const s = s0 * 1.3, rows = [], foot = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, x = (t - 0.5) * s * 1.8, z = Math.sin(t * Math.PI * 2.2) * s * 0.3, hh = s * (0.5 + 0.7 * Math.sin(Math.PI * t));
    rows.push([new THREE.Vector3(x, 0, z), new THREE.Vector3(x + s * 0.06, hh, z - s * 0.1), AU.gMint, t < 0.5 ? AU.gViolet : AU.gPink]);
    foot.push([new THREE.Vector3(x, 0, z - s * 0.12), new THREE.Vector3(x, 0, z + s * 0.12), AU.gIce, AU.gIce]);
  }
  h.put(g, new THREE.Mesh(stripGeo(THREE, rows), h.film(0xffffff, o * 0.85)), 0, 0.004, 0, false);
  h.put(g, new THREE.Mesh(stripGeo(THREE, foot), h.film(0xffffff, o * 0.6)), 0, 0.003, 0, false);
}
