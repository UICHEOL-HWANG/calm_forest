import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';
import { DOME_BOT, tailType } from '../../js/cosmetics/anchors.js';

export const TR = Object.freeze({
  green: 0x2f5a44, greenDk: 0x22422f,
  wine: 0x7e2a36, wineDk: 0x5e1f2a,
  brass: 0xc99a48, brassDk: 0x9c7434,
  walnut: 0x6e4a32, walnutDk: 0x4e3424,
  cream: 0xe4d6b4, creamDk: 0xc8b48e,
  steam: 0xd2d6d8, steamDk: 0x94a2a8,
  ink: 0x3a3230,
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
    lathe: (prof, seg = 40) => new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), seg),
    tube: (p, pts, r, c, seg = 24, rad = 7) => { const m = tubeAlong(THREE, pts, r, h.clay(c, false), seg, rad); p.add(m); return m; },
  };
}

function rbox(K, w, hh, d, r) {
  const sh = new K.THREE.Shape(), x0 = -w / 2, y0 = -hh / 2;
  sh.moveTo(x0 + r, y0); sh.lineTo(x0 + w - r, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  sh.lineTo(x0 + w, y0 + hh - r); sh.quadraticCurveTo(x0 + w, y0 + hh, x0 + w - r, y0 + hh);
  sh.lineTo(x0 + r, y0 + hh); sh.quadraticCurveTo(x0, y0 + hh, x0, y0 + hh - r);
  sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  const b = Math.min(d * 0.3, r * 0.6);
  const geo = new K.THREE.ExtrudeGeometry(sh, { depth: d - b * 2, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 8 });
  geo.translate(0, 0, -(d - b * 2) / 2);
  return geo;
}

function badge(K, p, s, x, y, z) {
  const b = K.grp(p, x, y, z);
  K.add(b, K.cyl(s * 0.5, s * 0.5, s * 0.25, 16), TR.brass).rotation.x = Math.PI / 2;
  K.add(b, K.cyl(s * 0.28, s * 0.28, s * 0.3, 12), TR.brassDk, 0, 0, s * 0.03).rotation.x = Math.PI / 2;
  [-1, 1].forEach(sd => {
    const w = K.add(b, K.box(s * 0.7, s * 0.22, s * 0.12), TR.brass, sd * s * 0.75, s * 0.08, 0);
    w.rotation.z = sd * 0.25;
  });
  return b;
}

function crownHug(K, HR, yt) {
  const y0 = DOME_BOT * HR, R0 = Math.sqrt((HR * 1.08) ** 2 - y0 * y0);
  const f = y => {
    const t = Math.min(1, Math.max(0, (y - y0) / (yt - y0)));
    return Math.max(Math.sqrt(Math.max(0, HR * HR - y * y)) * 1.07, R0 * Math.sqrt(Math.max(0, 1 - t ** 3.2)));
  };
  const prof = [];
  for (let i = 0; i <= 16; i++) { const y = y0 + (yt - y0) * i / 16; prof.push([Math.max(0.0005, f(y)), y]); }
  return { geo: K.lathe(prof, 48), f, y0, r0: R0 };
}

function topPlate(K, g, HR, yt, r, c, rim) {
  K.add(g, K.cyl(r, r * 0.96, HR * 0.1, 40), c, 0, yt - HR * 0.02, 0);
  K.add(g, K.tor(r, HR * 0.028, 6, 48), rim, 0, yt + HR * 0.03, 0).rotation.x = Math.PI / 2;
}

function visor(K, g, HR, r0, y0, c, len = 1.0, tilt = 0.16) {
  const v = K.add(g, new K.THREE.SphereGeometry(r0 * 1.02, 24, 6, -Math.PI / 2, Math.PI), c, 0, y0 + HR * 0.01, HR * 0.08);
  v.scale.set(0.95, 0.1, 0.92 * len); v.rotation.x = tilt;
  return v;
}

export function buildCapA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, yt = HR * 0.98;
  const { geo, f, y0, r0 } = crownHug(K, HR, yt);
  K.add(g, geo, TR.green);
  topPlate(K, g, HR, yt, HR * 0.8, TR.green, TR.greenDk);
  K.add(g, K.cyl(f(y0 + HR * 0.17) + HR * 0.03, r0 + HR * 0.035, HR * 0.17, 40), TR.wine, 0, y0 + HR * 0.085, 0);
  visor(K, g, HR, r0, y0, TR.ink, 1.05, 0.2);
  const cz = x => Math.sqrt(Math.max(0, 1 - x * x * 0.95)) * (r0 + HR * 0.06);
  K.tube(g, [-0.9, -0.55, 0, 0.55, 0.9].map(x => K.V(x * r0, y0 + HR * (0.05 + 0.04 * Math.cos(x * 1.6)), cz(x))), HR * 0.024, TR.brass, 24, 6);
  [-1, 1].forEach(s => K.add(g, K.sph(HR * 0.045, 10, 8), TR.brass, s * 0.9 * r0, y0 + HR * 0.06, cz(0.9)));
  const by = y0 + HR * 0.3;
  badge(K, g, HR * 0.16, 0, by, f(by) + HR * 0.03).rotation.x = -0.35;
  flatten(THREE, g);
}

export function buildCapB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, yt = HR * 0.94;
  const { geo, f, y0, r0 } = crownHug(K, HR, yt);
  K.add(g, geo, TR.wine);
  const puffTop = K.add(g, K.sph(HR * 1.0, 36, 18), TR.wine, 0, yt, HR * 0.1);
  puffTop.scale.set(0.98, 0.24, 1.02);
  K.add(g, K.tor(HR * 0.97, HR * 0.03, 6, 48), TR.cream, 0, yt - HR * 0.02, HR * 0.1).rotation.x = Math.PI / 2;
  K.add(g, K.sph(HR * 0.07, 12, 8), TR.wineDk, 0, yt + HR * 0.24, HR * 0.1).scale.y = 0.6;
  K.add(g, K.cyl(f(y0 + HR * 0.13) + HR * 0.03, r0 + HR * 0.035, HR * 0.13, 40), TR.green, 0, y0 + HR * 0.065, 0);
  visor(K, g, HR, r0, y0, TR.green, 0.85, 0.3);
  [-1, 1].forEach(s => K.add(g, K.sph(HR * 0.05, 10, 8), TR.brass, s * r0 * 0.92, y0 + HR * 0.07, r0 * 0.42));
  badge(K, g, HR * 0.14, 0, y0 + HR * 0.07, r0 + HR * 0.05);
  flatten(THREE, g);
}

function miniCap(K, p, s) {
  K.add(p, K.cyl(s * 0.5, s * 0.46, s * 0.42, 24), TR.green, 0, s * 0.21, 0);
  K.add(p, K.cyl(s * 0.53, s * 0.53, s * 0.06, 24), TR.greenDk, 0, s * 0.43, 0);
  K.add(p, K.cyl(s * 0.48, s * 0.48, s * 0.14, 24), TR.wine, 0, s * 0.07, 0);
  const v = K.add(p, new K.THREE.SphereGeometry(s * 0.5, 18, 6, -Math.PI / 2, Math.PI), TR.ink, 0, s * 0.01, s * 0.06);
  v.scale.set(0.98, 0.14, 1.05); v.rotation.x = 0.12;
  badge(K, p, s * 0.16, 0, s * 0.27, s * 0.48);
}

export function buildCapC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR;
  const d = K.V(0.56, 0.74, 0.3).normalize();
  const w = K.grp(g, d.x * HR * 0.93, d.y * HR * 0.93, d.z * HR * 0.93);
  w.rotation.set(0.15, 0.35, -0.55, 'YXZ');
  miniCap(K, w, HR * 0.6);
  K.add(w, K.tor(HR * 0.06, HR * 0.02, 6, 14), TR.brassDk, -HR * 0.3, HR * 0.04, 0).rotation.y = Math.PI / 2;
  flatten(THREE, g);
}

function cord(K, g, r, c, t = 0.07) {
  K.add(g, K.tor(r, r * t, 7, 40), c, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
}

function hang(THREE, K, k, g, r, build, drop = 0.42, out = 1.1, sc = 1.3, side = 0) {
  const w = new THREE.Group();
  build(w);
  w.scale.setScalar(sc);
  stickOn(THREE, k, g, w, K.V(side * r, -r * drop, r), out);
}

function ticket(K, p, w, hh, d, notch = true) {
  K.add(p, K.box(w, hh, d), TR.cream, 0, -hh / 2, 0);
  K.add(p, K.box(w * 1.01, hh * 0.2, d * 1.1), TR.green, 0, -hh * 0.22, 0);
  K.add(p, K.box(w * 0.55, hh * 0.05, d * 1.15), TR.wine, -w * 0.1, -hh * 0.55, 0);
  K.add(p, K.box(w * 0.4, hh * 0.05, d * 1.15), TR.creamDk, -w * 0.15, -hh * 0.7, 0);
  K.add(p, K.box(w * 0.25, hh * 0.12, d * 1.15), TR.wine, w * 0.28, -hh * 0.68, 0);
  if (notch) [-1, 1].forEach(s => K.add(p, K.cyl(hh * 0.07, hh * 0.07, d * 1.3, 10), TR.ink, s * w * 0.5, -hh * 0.6, 0).rotation.x = Math.PI / 2);
  K.add(p, K.cyl(hh * 0.07, hh * 0.07, d * 1.3, 10), TR.ink, w * 0.3, -hh * 0.38, 0).rotation.x = Math.PI / 2;
}

export function buildTicketA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, TR.wine);
  hang(THREE, K, k, g, r, w => {
    K.add(w, K.tor(r * 0.06, r * 0.02, 6, 14), TR.brass, 0, 0, 0);
    const t = K.grp(w, 0, -r * 0.05, 0); t.rotation.z = 0.12;
    ticket(K, t, r * 0.56, r * 0.36, r * 0.025);
  }, 0.08);
  flatten(THREE, g);
}

export function buildTicketB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, TR.brassDk, 0.05);
  hang(THREE, K, k, g, r, w => {
    const cw = r * 0.5, ch = r * 0.4, cd = r * 0.06;
    K.add(w, K.tor(r * 0.05, r * 0.016, 6, 14), TR.brass, 0, 0, 0);
    K.add(w, K.box(r * 0.12, r * 0.07, cd * 0.8), TR.brass, 0, -r * 0.07, 0);
    const c = K.grp(w, 0, -r * 0.1, 0);
    K.add(c, rbox(K, cw, ch, cd, r * 0.05), TR.walnut, 0, -ch / 2, 0);
    const t = K.grp(c, 0, -ch * 0.12, cd * 0.42);
    ticket(K, t, cw * 0.78, ch * 0.66, r * 0.012, false);
    K.add(c, K.box(cw * 0.86, r * 0.02, cd * 0.4), TR.walnutDk, 0, -ch * 0.08, cd * 0.48);
    K.add(c, K.box(cw * 0.86, r * 0.02, cd * 0.4), TR.walnutDk, 0, -ch * 0.92, cd * 0.48);
    K.add(c, K.sph(r * 0.025, 8, 6), TR.brass, cw * 0.38, -ch * 0.08, cd * 0.55);
  }, 0.06);
  flatten(THREE, g);
}

export function buildTicketC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  cord(K, g, r, TR.green);
  hang(THREE, K, k, g, r, w => {
    K.add(w, K.tor(r * 0.05, r * 0.016, 6, 14), TR.brass, 0, 0, 0);
    const t = K.grp(w, 0, -r * 0.04, 0); t.rotation.z = -0.32;
    ticket(K, t, r * 0.42, r * 0.28, r * 0.022);
  }, 0.1, 1.1, 1.3, -0.22);
  hang(THREE, K, k, g, r, w => {
    K.add(w, K.tor(r * 0.045, r * 0.015, 6, 14), TR.brass, 0, 0, 0);
    const wh = K.grp(w, 0, -r * 0.06, 0); wh.rotation.z = 0.35;
    K.add(wh, K.cyl(r * 0.055, r * 0.055, r * 0.26, 14), TR.brass, 0, -r * 0.13, 0);
    K.add(wh, K.sph(r * 0.09, 14, 10), TR.brass, r * 0.02, -r * 0.28, 0);
    K.add(wh, K.box(r * 0.05, r * 0.06, r * 0.07), TR.brassDk, r * 0.06, -r * 0.15, 0);
    K.add(wh, K.cyl(r * 0.06, r * 0.06, r * 0.03, 14), TR.brassDk, 0, 0, 0);
  }, 0.18, 1.12, 1.3, 0.2);
  flatten(THREE, g);
}

function packFrame(K, g, k, k0, lift = {}) {
  const c = backFront(k, packY(k0) + (lift[tailType(k0.tail)] || 0)), f = K.grp(g, 0, c.y, c.z);
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

function suitcase(K, p, w, hh, d, body, trim, z) {
  const b = K.grp(p, 0, 0, z);
  K.add(b, rbox(K, w, hh, d, Math.min(w, hh) * 0.12), body);
  K.add(b, K.box(w * 1.01, hh * 0.05, d * 1.04), trim, 0, 0, 0);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => K.add(b, K.box(w * 0.14, hh * 0.16, d * 1.06), TR.brass, sx * w * 0.44, sy * hh * 0.43, 0));
  return b;
}

function handle(K, p, w, y, z, c) {
  const t = K.add(p, K.tor(w, w * 0.22, 6, 16, Math.PI), c, 0, y, z);
  [-1, 1].forEach(s => K.add(p, K.box(w * 0.4, w * 0.3, w * 0.5), TR.brass, s * w, y, z));
  return t;
}

function sticker(K, p, x, y, z, s, round, c, c2) {
  if (round) {
    K.add(p, K.cyl(s, s, s * 0.08, 18), c, x, y, z).rotation.x = Math.PI / 2;
    K.add(p, K.cyl(s * 0.6, s * 0.6, s * 0.1, 18), c2, x, y, z - s * 0.01).rotation.x = Math.PI / 2;
  } else {
    const m = K.add(p, K.box(s * 1.8, s * 1.1, s * 0.08), c, x, y, z); m.rotation.z = 0.18;
    const n = K.add(p, K.box(s * 1.2, s * 0.25, s * 0.1), c2, x, y, z - s * 0.01); n.rotation.z = 0.18;
  }
}

export function buildSuitcaseA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, { feather: -0.06 });
  const w = R * 0.66, hh = R * 0.44, d = R * 0.2, z = -R * 0.03 - d / 2;
  suitcase(K, f, w, hh, d, TR.wine, TR.walnutDk, z);
  [-1, 1].forEach(s => K.add(f, K.box(R * 0.07, R * 0.06, R * 0.03), TR.brass, s * w * 0.22, hh * 0.18, z - d * 0.52));
  handle(K, f, R * 0.08, hh * 0.5 + R * 0.01, z, TR.walnutDk);
  sticker(K, f, -w * 0.2, -hh * 0.18, z - d * 0.52, R * 0.08, true, TR.cream, TR.green);
  sticker(K, f, w * 0.2, -hh * 0.22, z - d * 0.52, R * 0.07, false, TR.green, TR.cream);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.3, -R * 0.03), K.V(w * 0.3, hh * 0.3, -R * 0.03)], TR.walnutDk);
  flatten(THREE, g);
}

export function buildSuitcaseB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, { feather: -0.06 });
  const w = R * 0.6, hh = R * 0.48, d = R * 0.22, z = -R * 0.03 - d / 2;
  const b = K.grp(f, 0, 0, z);
  K.add(b, rbox(K, w, hh, d, R * 0.05), TR.green);
  K.add(b, K.box(w * 1.02, hh * 0.06, d * 1.04), TR.greenDk, 0, hh * 0.32, 0);
  [-1, 1].forEach(s => {
    K.add(b, K.box(R * 0.07, hh * 1.03, d * 1.06), TR.walnut, s * w * 0.26, 0, 0);
    K.add(b, K.box(R * 0.09, R * 0.08, d * 1.12), TR.brass, s * w * 0.26, -hh * 0.12, 0);
    K.add(b, K.box(R * 0.05, R * 0.04, d * 1.16), TR.walnutDk, s * w * 0.26, -hh * 0.12, 0);
  });
  handle(K, f, R * 0.08, hh * 0.5 + R * 0.01, z, TR.walnutDk);
  const tag = K.grp(f, R * 0.1, hh * 0.5, z - d * 0.3); tag.rotation.z = -0.3;
  K.tube(tag, [K.V(0, 0, 0), K.V(R * 0.03, -R * 0.06, -R * 0.01), K.V(R * 0.05, -R * 0.1, -R * 0.01)], R * 0.008, TR.wine, 8, 4);
  K.add(tag, K.box(R * 0.1, R * 0.14, R * 0.012), TR.cream, R * 0.06, -R * 0.17, -R * 0.012);
  K.add(tag, K.box(R * 0.06, R * 0.02, R * 0.016), TR.wine, R * 0.06, -R * 0.13, -R * 0.014);
  sticker(K, f, 0, -hh * 0.15, z - d * 0.52, R * 0.07, true, TR.wine, TR.cream);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.26, hh * 0.3, -R * 0.03), K.V(w * 0.26, hh * 0.3, -R * 0.03)], TR.walnutDk);
  flatten(THREE, g);
}

export function buildSuitcaseC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, { feather: -0.1, bushy: 0.08 });
  const w1 = R * 0.68, h1 = R * 0.28, d1 = R * 0.2, w2 = R * 0.46, h2 = R * 0.2, d2 = R * 0.15;
  const y1 = -R * 0.1, z1 = -R * 0.03 - d1 / 2;
  suitcase(K, f, w1, h1, d1, TR.walnut, TR.walnutDk, z1).position.y = y1;
  const top = suitcase(K, f, w2, h2, d2, TR.wine, TR.wineDk, z1 - R * 0.01);
  top.position.set(R * 0.04, y1 + h1 / 2 + h2 / 2, z1 - R * 0.01); top.rotation.z = 0.05;
  K.add(f, K.box(R * 0.07, h1 + h2 + R * 0.02, d1 * 1.08), TR.green, -R * 0.12, y1 + h2 / 2, z1);
  K.add(f, K.box(R * 0.09, R * 0.07, d1 * 1.14), TR.brass, -R * 0.12, y1 + h1 * 0.15, z1);
  handle(K, f, R * 0.06, y1 + h1 + h2 / 2 + R * 0.01, z1 - R * 0.01, TR.walnutDk);
  sticker(K, f, w1 * 0.25, y1 - h1 * 0.05, z1 - d1 * 0.52, R * 0.065, true, TR.cream, TR.wine);
  sticker(K, f, R * 0.12, y1 + h1 / 2 + h2 / 2, z1 - R * 0.01 - d2 * 0.53, R * 0.05, false, TR.cream, TR.green);
  packStraps(THREE, g, k, h, f, [K.V(-w1 * 0.3, y1 + h1 * 0.3, -R * 0.03), K.V(w1 * 0.3, y1 + h1 * 0.3, -R * 0.03)], TR.walnutDk);
  flatten(THREE, g);
}

function flat(THREE, g, h, geo, c, o, x, z, rotZ = 0, y = 0.008) {
  const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotZ); m.renderOrder = Math.round(y * 1000);
  return m;
}

function puff(THREE, g, h, s, o, x, z, y = 0.008) {
  const lobes = [[0, 0, 0.3], [-0.26, -0.05, 0.22], [0.27, -0.04, 0.23], [-0.12, 0.17, 0.2], [0.14, 0.18, 0.21]];
  lobes.forEach(([lx, ly, r]) => {
    const geo = new THREE.CircleGeometry(r * s * 1.12, 22); geo.translate(lx * s, ly * s - s * 0.04, 0);
    flat(THREE, g, h, geo, TR.steamDk, o, x, z, 0, y);
  });
  lobes.forEach(([lx, ly, r]) => {
    const geo = new THREE.CircleGeometry(r * s, 22); geo.translate(lx * s, ly * s, 0);
    flat(THREE, g, h, geo, TR.steam, o, x, z, 0, y + 0.001);
  });
}

export function buildSteamA(THREE, g, s0, o, id, h) {
  puff(THREE, g, h, s0 * 1.5, o, 0, 0);
}

export function buildSteamB(THREE, g, s0, o, id, h) {
  const s = s0 * 1.55;
  [[0, 0.2, 1.0], [0.32, -0.12, 0.66], [0.52, -0.38, 0.42], [0.62, -0.58, 0.24]].forEach(([x, z, k]) => {
    const r = s * 0.3 * k;
    flat(THREE, g, h, new THREE.CircleGeometry(r * 1.15, 20), TR.steamDk, o, x * s, z * s + r * 0.06, 0, 0.008);
    flat(THREE, g, h, new THREE.CircleGeometry(r, 20), TR.steam, o, x * s, z * s, 0, 0.009);
  });
}

export function buildSteamC(THREE, g, s0, o, id, h) {
  const s = s0 * 1.9;
  [-0.22, 0, 0.22].forEach(z => flat(THREE, g, h, new THREE.PlaneGeometry(s * 0.46, s * 0.07), TR.walnut, o, 0, z * s, 0, 0.008));
  [-1, 1].forEach(sd => flat(THREE, g, h, new THREE.PlaneGeometry(s * 0.035, s * 0.62), TR.brass, o, sd * s * 0.13, 0, 0, 0.009));
  puff(THREE, g, h, s * 0.36, o, s * 0.3, -s * 0.28, 0.010);
}

export const VARIANTS = {
  tr_conductor_cap: {
    slot: 'head', name: '차장 모자', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '숲색 차장 모자', note: '반듯한 숲색 원통 모자 · 자줏빛 띠 · 검은 챙 · 놋쇠 끈과 날개 바퀴 휘장 · dome', build: buildCapA },
    B: { name: '자줏빛 둥근 차장 모자', note: '앞으로 볼록한 자줏빛 윗판 · 크림 테 · 숲색 띠와 챙 · 놋쇠 휘장 · dome', build: buildCapB },
    C: { name: '꼬마 차장 모자 핀', note: '머리 오른쪽 위에 비스듬히 꽂은 작은 차장 모자 · 귀가 트임 · low', build: buildCapC },
    REF: { name: '캡', note: '출시된 기본 캡 (dome 높이 비교용)', ref: 'cap' },
  },
  tr_ticket_charm: {
    slot: 'neck', name: '승차권 목걸이', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '구멍 뚫린 승차권', note: '자줏빛 목끈 · 놋쇠 고리 · 숲색 띠 크림 승차권 · 개찰 구멍', build: buildTicketA },
    B: { name: '가죽 정기권 지갑', note: '놋쇠 줄 · 호두나무 가죽 지갑 · 창 속 크림 승차권', build: buildTicketB },
    C: { name: '승차권과 호루라기', note: '숲색 목끈 · 기운 작은 승차권 · 놋쇠 차장 호루라기', build: buildTicketC },
    REF: { name: '리본 책갈피 목걸이', note: '출시된 책방 목걸이 (비교용)', ref: 'bk_bookmark_charm' },
  },
  tr_suitcase_pack: {
    slot: 'back', cols: 'pack', name: '여행 가방', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '자줏빛 옛 가방', note: '자줏빛 단단한 가방 · 놋쇠 모서리 · 가죽 손잡이 · 크림·숲색 스티커', build: buildSuitcaseA },
    B: { name: '숲색 띠 가방', note: '숲색 가방 · 세로 가죽띠 둘 · 놋쇠 버클 · 크림 꼬리표', build: buildSuitcaseB },
    C: { name: '가방 두 개 묶음', note: '호두나무 큰 가방 위 자줏빛 작은 가방 · 숲색 띠로 묶음', build: buildSuitcaseC },
    REF2: { name: '책 더미 배낭', note: '출시된 책방 배낭 (비교용)', ref: 'bk_book_pack', anchor: 'back' },
  },
  tr_steam_trail: {
    slot: 'trail', name: '증기 발자국', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '뭉게 증기', note: '다섯 덩이 뭉게 증기 하나 · 아래 옅은 그림자 테', build: buildSteamA },
    B: { name: '흩어지는 증기 방울', note: '큰 것에서 작은 것으로 이어지는 증기 방울 넷', build: buildSteamB },
    C: { name: '철길 한 칸과 증기', note: '호두나무 침목 셋 · 놋쇠 레일 둘 · 옆에 작은 증기', build: buildSteamC },
    REF: { name: '털실 공 발자국', note: '출시된 뜨개 발자국 (비교용)', ref: 'kn_yarn_trail' },
  },
};
