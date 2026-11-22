import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { pushOut } from './art-forest-pick.js';
import { packY } from './art-dessert-pick.js';
import { tailType } from './anchors.js';

export const CP = Object.freeze({
  olive: 0x7f8c4f, oliveDk: 0x5f6c3a,
  mustard: 0xd6a640, mustardDk: 0xae8330,
  brick: 0xc8643c,
  cream: 0xe2d3b6,
  navy: 0x3a4a6c,
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
    cyl: (a, b, hh, s = 20) => new THREE.CylinderGeometry(a, b, hh, s),
    cone: (r, hh, s = 8) => new THREE.ConeGeometry(r, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    lathe: (pts, s = 28) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function pine(K, p, s, c, trunk) {
  const g = K.grp(p);
  [[0, 0.62, 0.36], [0.26, 0.5, 0.3], [0.5, 0.36, 0.24]].forEach(([y, w, hh]) => K.add(g, K.cone(s * w, s * hh, 6), c, 0, s * (y + hh / 2), 0));
  K.add(g, K.cyl(s * 0.07, s * 0.08, s * 0.14, 6), trunk, 0, -s * 0.04, 0);
  return g;
}

export function buildBucketHat(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = HR * 0.64;
  const hat = K.grp(g, 0, HR * 0.75, -HR * 0.05); hat.rotation.set(-0.08, 0, 0.06);
  K.add(hat, K.lathe([[r, 0], [r * 0.97, r * 0.3], [r * 0.9, r * 0.52], [r * 0.78, r * 0.62], [r * 0.45, r * 0.68], [0, r * 0.69]]), CP.olive);
  K.add(hat, K.cyl(r * 1.0, r * 1.025, r * 0.17, 30), CP.cream, 0, r * 0.105, 0);
  K.add(hat, K.lathe([[r * 0.99, r * 0.0], [r * 1.16, -r * 0.06], [r * 1.32, -r * 0.17], [r * 1.34, -r * 0.215], [r * 1.15, -r * 0.1], [r * 0.99, -r * 0.04]], 32), CP.olive).material.side = THREE.DoubleSide;
  K.add(hat, K.tor(r * 1.2, r * 0.012, 4, 40), CP.oliveDk, 0, -r * 0.095, 0).rotation.x = Math.PI / 2;
  const a = Math.PI * 0.62, pin = K.grp(hat, Math.cos(a) * r, r * 0.1, Math.sin(a) * r);
  pin.rotation.y = Math.PI / 2 - a;
  pine(K, pin, r * 0.3, CP.oliveDk, CP.wood).position.set(0, -r * 0.1, r * 0.04);
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

export function buildBandana(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.1, 7, 40), CP.navy, 0, r * 0.04, 0, false).rotation.x = Math.PI / 2;
  const tri = (u, v) => K.V((u * 2 - 1) * 0.7 * (1 - v) * r, -r * 0.02 - v * 0.82 * r, r);
  surfPatch(THREE, k, h, g, CP.navy, tri, 12, 10, 1.09);
  [[0.5, 0.2], [0.26, 0.15], [0.74, 0.15], [0.38, 0.45], [0.62, 0.45], [0.5, 0.7]].forEach(([u, v]) => {
    const d = new THREE.Group();
    K.add(d, K.cyl(r * 0.04, r * 0.04, r * 0.016, 12), CP.cream).rotation.x = Math.PI / 2;
    stickOn(THREE, k, g, d, tri(u, v), 1.105);
  });
  const s = new THREE.Group();
  K.add(s, K.cyl(r * 0.1, r * 0.1, r * 0.06, 14), CP.mustard).rotation.x = Math.PI / 2;
  K.add(s, K.tor(r * 0.1, r * 0.02, 5, 14), CP.mustardDk, 0, 0, r * 0.03);
  stickOn(THREE, k, g, s, tri(0.5, 0.02), 1.13);
  backKnot(THREE, K, g, k, r, CP.navy);
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
    K.add(g, K.cyl(rr * 0.86, rr * 0.86, rr * 0.02, 22), lining, s * len / 2, 0, 0).rotation.z = Math.PI / 2;
  });
  [-0.28, 0.28].forEach(x => K.add(g, K.tor(rr * 1.04, rr * 0.1, 5, 24), strap, x * len, 0, 0).rotation.y = Math.PI / 2);
  return g;
}

export function buildSleepingbagPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0) - (tailType(k0.tail) === 'feather' ? 0.2 : 0)), f = K.grp(g, 0, c.y, c.z); f.rotation.x = 0.08;
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

function flame(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, s);
  sh.bezierCurveTo(s * 0.12, s * 0.55, s * 0.6, s * 0.3, s * 0.52, -s * 0.28);
  sh.bezierCurveTo(s * 0.46, -s * 0.78, -s * 0.46, -s * 0.78, -s * 0.52, -s * 0.28);
  sh.bezierCurveTo(-s * 0.6, s * 0.3, -s * 0.12, s * 0.55, 0, s);
  return sh;
}

function flat(THREE, g, h, geo, c, o, x, y, z, rotZ = 0) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

export function buildEmberTrail(THREE, g, s, o, h) {
  flat(THREE, g, h, new THREE.ShapeGeometry(flame(THREE, s * 0.78), 12), CP.flame, o, 0, 0.008, 0, Math.PI);
  flat(THREE, g, h, new THREE.ShapeGeometry(flame(THREE, s * 0.4), 12), CP.ember, o, 0, 0.01, -s * 0.14, Math.PI);
  [[0.62, -0.5, 0.07], [-0.58, -0.7, 0.055]].forEach(([x, z, r]) => flat(THREE, g, h, new THREE.CircleGeometry(s * r, 8), CP.ember, o, x * s, 0.011, z * s));
}
