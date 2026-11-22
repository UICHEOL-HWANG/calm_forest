import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { packY } from './art-dessert-pick.js';

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
    tor: (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function tube(K, p, pts, r, c, seg = 28) {
  const m = tubeAlong(K.THREE, pts, r, K.h.clay(c, false), seg, 7); p.add(m); return m;
}

function lensFill(K, p, r) {
  const m = new K.THREE.Mesh(new K.THREE.CircleGeometry(r, 24), new K.THREE.MeshStandardMaterial({ color: BK.glass, roughness: 0.3, transparent: true, opacity: 0.28, depthWrite: false }));
  p.add(m); return m;
}

const EYE_Y = 0.13, EYE_X = 0.37, LENS_Z = 1.0;

export function buildRoundGlasses(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, r = 0.25;
  [-1, 1].forEach(s => {
    const e = K.grp(g, s * EYE_X * HR, EYE_Y * HR, LENS_Z * HR); e.rotation.y = s * 0.32;
    K.add(e, K.tor(r * HR, 0.026 * HR, 8, 32), BK.brass);
    lensFill(K, e, r * HR);
    tube(K, g, [K.V(s * (EYE_X + r * 0.95) * HR, EYE_Y * HR, (LENS_Z - r * 0.32) * HR), K.V(s * 1.0 * HR, 0.15 * HR, 0.62 * HR), K.V(s * 1.13 * HR, 0.12 * HR, 0.1 * HR), K.V(s * 1.0 * HR, 0.02 * HR, -0.2 * HR)], 0.02 * HR, BK.brassDk);
  });
  tube(K, g, [K.V(-0.13 * HR, 0.17 * HR, 1.06 * HR), K.V(0, 0.23 * HR, 1.1 * HR), K.V(0.13 * HR, 0.17 * HR, 1.06 * HR)], 0.022 * HR, BK.brass);
  flatten(THREE, g);
}

function ribbonTail(K, p, w, L, c, x, rz) {
  const sh = new K.THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, -L); sh.lineTo(0, -L + w * 0.55); sh.lineTo(-w / 2, -L); sh.closePath();
  const geo = new K.THREE.ExtrudeGeometry(sh, { depth: w * 0.12, bevelEnabled: true, bevelSize: w * 0.06, bevelThickness: w * 0.06, bevelSegments: 2 });
  const m = K.add(p, geo, c, x, 0, 0); m.rotation.z = rz; return m;
}

export function buildBookmarkCharm(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.08, 7, 40), BK.greenDk, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
  const w = new THREE.Group();
  ribbonTail(K, w, r * 0.2, r * 0.62, BK.wine, -r * 0.05, -0.12);
  ribbonTail(K, w, r * 0.2, r * 0.5, BK.wineDk, r * 0.07, 0.16).position.z = -r * 0.02;
  K.add(w, K.tor(r * 0.1, r * 0.028, 6, 18), BK.brass, 0, r * 0.02, r * 0.04);
  K.add(w, K.sph(r * 0.06, 12, 10), BK.brass, 0, r * 0.02, r * 0.06);
  w.scale.setScalar(1.3);
  stickOn(THREE, k, g, w, K.V(0, -r * 0.16, r), 1.1);
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

export function buildBookPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0) + 0.02), f = K.grp(g, 0, c.y, c.z);
  f.rotation.x = 0.08;
  const d = R * 0.15, z = -R * 0.03 - d / 2, t = R * 0.125;
  const stack = [[R * 0.74, BK.green, -0.02, 0], [R * 0.64, BK.wine, 0.03, 0.05], [R * 0.68, BK.walnut, -0.01, -0.04]];
  stack.forEach(([w, col, dx, ry], i) => {
    const b = K.grp(f, dx * R, (i - 1) * t * 1.02, z); b.rotation.y = ry;
    K.add(b, K.box(w, t, d), col);
    K.add(b, K.box(w * 0.96, t * 0.78, d * 1.04), BK.cream, 0, 0, 0);
    K.add(b, K.box(w * 1.02, t * 1.02, d * 0.06), col, 0, 0, -d * 0.5);
  });
  K.add(f, K.box(R * 0.1, t * 3.3, d * 1.18), BK.walnutDk, 0, 0, z);
  K.add(f, K.box(R * 0.14, R * 0.12, R * 0.03), BK.brass, 0, -t * 0.1, z - d * 0.62);
  K.add(f, K.tor(R * 0.08, R * 0.022, 6, 16, Math.PI), BK.walnutDk, 0, t * 1.55, z);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.22, t, -R * 0.03), K.V(R * 0.22, t, -R * 0.03)], BK.walnutDk);
  flatten(THREE, g);
}

function wingShape(THREE, s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, s * 0.05);
  sh.lineTo(s * 0.62, s * 0.5);
  sh.lineTo(s * 0.62 * 0.92, s * 0.02);
  sh.lineTo(s * 0.42, -s * 0.36);
  sh.lineTo(0, -s * 0.12);
  sh.closePath();
  return sh;
}

export function buildMothTrail(THREE, g, s0, o, h) {
  const s = s0 * 1.5, fold = 0.55, y = 0.012;
  const grp = new THREE.Group(); grp.rotation.y = Math.PI; g.add(grp);
  [-1, 1].forEach(sd => {
    const w = new THREE.Group(); w.scale.x = sd; w.rotation.z = sd * fold; w.position.y = s * 0.02; grp.add(w);
    const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape(THREE, s)), h.film(sd < 0 ? BK.green : BK.greenDk, o));
    wing.material.side = THREE.DoubleSide;
    wing.rotation.x = -Math.PI / 2; wing.position.y = y; wing.renderOrder = 8; w.add(wing);
    const crease = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.02, s * 0.55), h.film(BK.ink, o * 0.5));
    crease.material.side = THREE.DoubleSide;
    crease.rotation.set(-Math.PI / 2, 0, -0.75); crease.position.set(s * 0.26, y + 0.0005, -s * 0.2); crease.renderOrder = 9; w.add(crease);
  });
  const body = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.06, s * 0.6), h.film(BK.walnutDk, o));
  body.rotation.x = -Math.PI / 2; body.position.y = y + 0.001; body.renderOrder = 10; grp.add(body);
}
