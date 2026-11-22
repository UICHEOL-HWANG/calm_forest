import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from './art-winter-pick.js';
import { stickOn } from './art-xmas-pick.js';
import { packY } from './art-dessert-pick.js';
import { DOME_BOT, tailType } from './anchors.js';

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

export function buildConductorCap(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, yt = HR * 0.98;
  const { geo, f, y0, r0 } = crownHug(K, HR, yt);
  K.add(g, geo, TR.green);
  K.add(g, K.cyl(HR * 0.8, HR * 0.8 * 0.96, HR * 0.1, 40), TR.green, 0, yt - HR * 0.02, 0);
  K.add(g, K.tor(HR * 0.8, HR * 0.028, 6, 48), TR.greenDk, 0, yt + HR * 0.03, 0).rotation.x = Math.PI / 2;
  K.add(g, K.cyl(f(y0 + HR * 0.17) + HR * 0.03, r0 + HR * 0.035, HR * 0.17, 40), TR.wine, 0, y0 + HR * 0.085, 0);
  const v = K.add(g, new THREE.SphereGeometry(r0 * 1.02, 24, 6, -Math.PI / 2, Math.PI), TR.ink, 0, y0 + HR * 0.01, HR * 0.08);
  v.scale.set(0.95, 0.1, 0.92 * 1.05); v.rotation.x = 0.2;
  const cz = x => Math.sqrt(Math.max(0, 1 - x * x * 0.95)) * (r0 + HR * 0.06);
  K.tube(g, [-0.9, -0.55, 0, 0.55, 0.9].map(x => K.V(x * r0, y0 + HR * (0.05 + 0.04 * Math.cos(x * 1.6)), cz(x))), HR * 0.024, TR.brass, 24, 6);
  [-1, 1].forEach(s => K.add(g, K.sph(HR * 0.045, 10, 8), TR.brass, s * 0.9 * r0, y0 + HR * 0.06, cz(0.9)));
  const by = y0 + HR * 0.3;
  badge(K, g, HR * 0.16, 0, by, f(by) + HR * 0.03).rotation.x = -0.35;
  flatten(THREE, g);
}

function ticket(K, p, w, hh, d) {
  K.add(p, K.box(w, hh, d), TR.cream, 0, -hh / 2, 0);
  K.add(p, K.box(w * 1.01, hh * 0.2, d * 1.1), TR.green, 0, -hh * 0.22, 0);
  K.add(p, K.box(w * 0.55, hh * 0.05, d * 1.15), TR.wine, -w * 0.1, -hh * 0.55, 0);
  K.add(p, K.box(w * 0.4, hh * 0.05, d * 1.15), TR.creamDk, -w * 0.15, -hh * 0.7, 0);
  K.add(p, K.box(w * 0.25, hh * 0.12, d * 1.15), TR.wine, w * 0.28, -hh * 0.68, 0);
  [-1, 1].forEach(s => K.add(p, K.cyl(hh * 0.07, hh * 0.07, d * 1.3, 10), TR.ink, s * w * 0.5, -hh * 0.6, 0).rotation.x = Math.PI / 2);
  K.add(p, K.cyl(hh * 0.07, hh * 0.07, d * 1.3, 10), TR.ink, w * 0.3, -hh * 0.38, 0).rotation.x = Math.PI / 2;
}

export function buildTicketCharm(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.07, 7, 40), TR.wine, 0, r * 0.04, 0, true).rotation.x = Math.PI / 2;
  const w = new THREE.Group();
  K.add(w, K.tor(r * 0.06, r * 0.02, 6, 14), TR.brass, 0, 0, 0);
  const t = K.grp(w, 0, -r * 0.05, 0); t.rotation.z = 0.12;
  ticket(K, t, r * 0.56, r * 0.36, r * 0.025);
  w.scale.setScalar(1.3);
  stickOn(THREE, k, g, w, K.V(0, -r * 0.08, r), 1.1);
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

function sticker(K, p, x, y, z, s, round, c, c2) {
  if (round) {
    K.add(p, K.cyl(s, s, s * 0.08, 18), c, x, y, z).rotation.x = Math.PI / 2;
    K.add(p, K.cyl(s * 0.6, s * 0.6, s * 0.1, 18), c2, x, y, z - s * 0.01).rotation.x = Math.PI / 2;
  } else {
    K.add(p, K.box(s * 1.8, s * 1.1, s * 0.08), c, x, y, z).rotation.z = 0.18;
    K.add(p, K.box(s * 1.2, s * 0.25, s * 0.1), c2, x, y, z - s * 0.01).rotation.z = 0.18;
  }
}

export function buildSuitcasePack(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const c = backFront(k, packY(k0) + (tailType(k0.tail) === 'feather' ? -0.06 : 0)), f = K.grp(g, 0, c.y, c.z);
  f.rotation.x = 0.08;
  const w = R * 0.66, hh = R * 0.44, d = R * 0.2, z = -R * 0.03 - d / 2;
  const b = K.grp(f, 0, 0, z);
  K.add(b, rbox(K, w, hh, d, Math.min(w, hh) * 0.12), TR.wine);
  K.add(b, K.box(w * 1.01, hh * 0.05, d * 1.04), TR.walnutDk, 0, 0, 0);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => K.add(b, K.box(w * 0.14, hh * 0.16, d * 1.06), TR.brass, sx * w * 0.44, sy * hh * 0.43, 0));
  [-1, 1].forEach(s => K.add(f, K.box(R * 0.07, R * 0.06, R * 0.03), TR.brass, s * w * 0.22, hh * 0.18, z - d * 0.52));
  const hw = R * 0.08, hy = hh * 0.5 + R * 0.01;
  K.add(f, K.tor(hw, hw * 0.22, 6, 16, Math.PI), TR.walnutDk, 0, hy, z);
  [-1, 1].forEach(s => K.add(f, K.box(hw * 0.4, hw * 0.3, hw * 0.5), TR.brass, s * hw, hy, z));
  sticker(K, f, -w * 0.2, -hh * 0.18, z - d * 0.52, R * 0.08, true, TR.cream, TR.green);
  sticker(K, f, w * 0.2, -hh * 0.22, z - d * 0.52, R * 0.07, false, TR.green, TR.cream);
  packStraps(THREE, g, k, h, f, [K.V(-w * 0.3, hh * 0.3, -R * 0.03), K.V(w * 0.3, hh * 0.3, -R * 0.03)], TR.walnutDk);
  flatten(THREE, g);
}

export function buildSteamTrail(THREE, g, s0, o, h) {
  const s = s0 * 1.5, lobes = [[0, 0, 0.3], [-0.26, -0.05, 0.22], [0.27, -0.04, 0.23], [-0.12, 0.17, 0.2], [0.14, 0.18, 0.21]];
  [[TR.steamDk, 1.12, -0.04, 0.008], [TR.steam, 1, 0, 0.009]].forEach(([c, k, dy, y]) => lobes.forEach(([lx, ly, r]) => {
    const geo = new THREE.CircleGeometry(r * s * k, 22); geo.translate(lx * s, ly * s + dy * s, 0);
    const m = h.put(g, new THREE.Mesh(geo, h.film(c, o)), 0, y, 0, false);
    m.rotation.set(-Math.PI / 2, 0, 0); m.renderOrder = Math.round(y * 1000);
  }));
}
