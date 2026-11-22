import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { arcPt } from './art-forest-pick.js';
import { packY } from './art-dessert-pick.js';

export const SF = Object.freeze({
  indigo: 0x46528e, indigoDk: 0x313a66,
  red: 0xd4503e, redDk: 0xa83c30,
  orange: 0xec8a3e, fish: 0xf07a3a, gold: 0xe0b450,
  cream: 0xe2d4b6, mask: 0xe8d7b6, wood: 0xc2905c,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 18, b = 14) => new THREE.SphereGeometry(r, a, b),
    cyl: (a, b, hh, s = 20) => new THREE.CylinderGeometry(a, b, hh, s),
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

const SIDE = -0.92;

export function buildMaskPin(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * 0.06, 6, 30, Math.PI), SF.indigo, 0, 0, 0, true);
  const p = arcPt(THREE, k, SIDE, 1.1).applyAxisAngle(K.V(1, 0, 0), 0.45);
  const e = K.grp(g, p.x, p.y, p.z + HR * 0.06); e.rotation.set(0.1, 0.35, SIDE * 0.5);
  foxMask(K, e, HR * 0.31, SF.mask, SF.red).rotation.z = 0.25;
  flatten(THREE, g);
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

export function buildYukataCord(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.12, 7, 36), SF.red, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
  const w = new THREE.Group();
  K.add(w, K.tor(r * 0.06, r * 0.02, 5, 12), SF.redDk, 0, r * 0.08, 0);
  goldfish(K, w, r * 0.5).position.set(0, -r * 0.12, r * 0.05);
  stickOn(THREE, k, g, w, K.V(0, -r * 0.26, r), 1.12);
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

export function buildFanPack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0)), f = K.grp(g, 0, c.y + R * 0.04, c.z);
  f.rotation.x = 0.08;
  const r = R * 0.3, dz = 0.32, zc = -R * 0.03 - r * dz, body = K.grp(f, 0, -r * 0.1, zc);
  body.scale.z = dz;
  K.add(body, K.sph(r, 30, 22), SF.indigo).scale.y = 0.8;
  const lip = r * 0.66;
  K.add(body, K.lathe([[r * 0.5, lip - r * 0.08], [r * 0.42, lip + r * 0.06], [r * 0.56, lip + r * 0.3], [r * 0.5, lip + r * 0.32], [r * 0.3, lip + r * 0.1], [0.0001, lip]], 24), SF.indigo);
  K.add(body, K.tor(r * 0.44, r * 0.06, 6, 24), SF.red, 0, lip + r * 0.04, 0).rotation.x = Math.PI / 2;
  const top = lip - r * 0.1, fr = r * 0.5;
  const fan = K.grp(f, r * 0.98, top + r * 0.14, zc - r * 0.02); fan.rotation.z = -1.45;
  K.add(fan, K.cyl(fr * 0.07, fr * 0.06, fr * 1.1, 10), SF.wood, 0, -fr * 1.2, 0);
  const d = K.add(fan, K.cyl(fr, fr, fr * 0.06, 32), SF.cream); d.rotation.x = Math.PI / 2; d.scale.z = 0.92;
  K.add(fan, K.tor(fr, fr * 0.06, 6, 32), SF.red).scale.y = 0.92;
  const m = goldfish(K, fan, fr * 0.62); m.position.set(0, 0, -0.08 * fr); m.rotation.y = Math.PI; m.scale.z = 0.4;
  K.add(f, K.sph(r * 0.08, 10, 8), SF.red, -r * 0.3, top - r * 0.12, zc - r * 0.28);
  K.add(f, K.cyl(r * 0.05, r * 0.08, r * 0.3, 8), SF.red, -r * 0.3, top - r * 0.3, zc - r * 0.28);
  packStraps(THREE, g, k, h, f, [K.V(-r * 0.6, r * 0.3, -R * 0.03), K.V(r * 0.6, r * 0.3, -R * 0.03)], SF.indigoDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, rotZ, ro, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), 0, y, 0, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = ro;
  return m;
}

export function buildFireworkTrail(THREE, g, s, o, h) {
  for (let i = 0; i < 8; i++) {
    const sh = new THREE.Shape(), l = s * 0.5, w = s * 0.15;
    sh.moveTo(0, 0);
    sh.quadraticCurveTo(w, l * 0.5, 0, l);
    sh.quadraticCurveTo(-w, l * 0.5, 0, 0);
    const geo = new THREE.ShapeGeometry(sh, 8); geo.translate(0, s * 0.12, 0);
    flat(THREE, g, h, geo, i % 2 ? SF.gold : SF.orange, o, i / 8 * TAU, 8);
  }
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.14, 14), SF.red, o, 0, 10, 0.01);
}
