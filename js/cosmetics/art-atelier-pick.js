import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn, neckWrap } from './art-xmas-pick.js';
import { arcPt } from './art-forest-pick.js';
import { packY } from './art-dessert-pick.js';

export const AT = Object.freeze({
  navy: 0x3b4a72, navyDk: 0x2c3858,
  burgundy: 0x9c3b4a, burgundyDk: 0x7a2c3a,
  woodDk: 0x8e623c, woodLt: 0xd4aa74, metal: 0xa9a59c,
  red: 0xd9534a, blue: 0x4f82c4, yellow: 0xe8bf3e, green: 0x6aab5a,
});

const TAU = Math.PI * 2;

function kit(THREE, h) {
  const add = (p, geo, c, x = 0, y = 0, z = 0, flat = false) => {
    const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
  };
  return {
    THREE, add,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    sph: (r, a = 16, b = 12) => new THREE.SphereGeometry(r, a, b),
    cyl: (a, b, hh, s = 20) => new THREE.CylinderGeometry(a, b, hh, s),
    tor: (r, t, rs = 8, ts = 24, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    lathe: (pts, s = 32) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
  };
}

function dab(K, p, s, c, x = 0, y = 0, z = 0) {
  const m = K.add(p, K.sph(s, 12, 9), c, x, y, z);
  m.scale.set(1, 1, 0.42);
  return m;
}

function brush(K, p, L, tip, handle) {
  const g = K.grp(p);
  K.add(g, K.cyl(L * 0.035, L * 0.05, L * 0.66, 8), handle, 0, L * 0.33, 0);
  K.add(g, K.cyl(L * 0.055, L * 0.05, L * 0.14, 10), AT.metal, 0, L * 0.73, 0);
  K.add(g, K.sph(L * 0.06, 10, 8), tip, 0, L * 0.86, 0).scale.set(1, 1.9, 1);
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

export function buildBeret(THREE, g, k, h) {
  const K = kit(THREE, h), r = k.HR * 0.56, ang = -0.24;
  const p = arcPt(THREE, k, ang, 0.84);
  const b = K.grp(g, p.x, p.y, -k.HR * 0.06); b.rotation.set(-0.14, 0, ang);
  K.add(b, K.lathe([[r * 0.96, 0], [r * 1.0, r * 0.06], [r * 1.13, r * 0.17], [r * 1.18, r * 0.27], [r * 1.14, r * 0.37], [r * 1.0, r * 0.46], [r * 0.72, r * 0.54], [r * 0.36, r * 0.58], [0, r * 0.59]]), AT.navy).material.side = 2;
  K.add(b, K.tor(r * 0.99, r * 0.05, 6, 36), AT.navyDk, 0, r * 0.03, 0).rotation.x = Math.PI / 2;
  K.add(b, K.cyl(r * 0.05, r * 0.07, r * 0.14, 10), AT.navyDk, 0, r * 0.64, 0);
  const a = Math.PI * 0.28, pr = r * 1.08;
  const pin = K.grp(b, Math.cos(a) * pr * 1.02, pr * 0.12, Math.sin(a) * pr * 1.02); pin.rotation.y = Math.PI / 2 - a;
  const br = brush(K, pin, r * 0.92, AT.red, AT.woodLt); br.rotation.z = -0.95; br.position.set(-r * 0.34, -r * 0.1, r * 0.02);
  flatten(THREE, g);
}

export function buildPaintScarf(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [AT.burgundy, AT.burgundyDk], 0.12);
  const w = new THREE.Group(), pl = K.grp(w), pw = r * 0.5;
  pl.rotation.z = 0.2; pl.position.y = -r * 0.12;
  K.add(pl, ex(THREE, paletteShape(THREE, pw, pw * 0.78), pw * 0.05, pw * 0.02), AT.woodLt);
  [[0.22, 0.26, AT.red], [0.34, 0.02, AT.blue], [0.04, 0.34, AT.yellow]].forEach(([x, y, c]) => dab(K, pl, pw * 0.07, c, x * pw, y * pw * 0.78, pw * 0.05));
  stickOn(THREE, k, g, w, K.V(0, -r * 0.12, r), 1.15);
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

export function buildPalettePack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0) + 0.05), f = K.grp(g, 0, c.y, c.z);
  f.rotation.x = 0.08;
  const w = R * 0.62, hh = w * 0.74, d = R * 0.12, zf = -R * 0.03 - d - R * 0.035;
  const geo = new THREE.ExtrudeGeometry(paletteShape(THREE, w, hh), { depth: d, bevelEnabled: true, bevelSize: R * 0.03, bevelThickness: R * 0.03, bevelSegments: 3, curveSegments: 16 });
  geo.translate(0, 0, -d);
  K.add(f, geo, AT.woodLt, 0, 0, -R * 0.03 - d).rotation.y = Math.PI;
  [[-0.22, 0.26, AT.red], [-0.34, 0.02, AT.blue], [-0.04, 0.34, AT.yellow], [0.26, 0.22, AT.green]].forEach(([x, y, cc]) => dab(K, f, w * 0.075, cc, x * w, y * hh, zf));
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.26, hh * 0.3, -R * 0.03), K.V(w * 0.26, hh * 0.3, -R * 0.03)], AT.woodDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, y, z) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, 0); m.renderOrder = Math.round(y * 1000);
  return m;
}

export function buildPaintTrail(THREE, g, s, o, h) {
  flat(THREE, g, h, new THREE.CircleGeometry(s * 0.3, 22), AT.navy, o * 0.85, 0, 0.008, s * 0.12).scale.set(1.15, 0.9, 1);
  [[-0.38, -0.24, AT.red], [-0.14, -0.44, AT.yellow], [0.14, -0.44, AT.blue], [0.38, -0.24, AT.green]].forEach(([x, z, c]) =>
    flat(THREE, g, h, new THREE.CircleGeometry(s * 0.12, 16), c, o, x * s, 0.01, z * s));
}
