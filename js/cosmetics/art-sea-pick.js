import { domeTheta } from './anchors.js';
import { flatten, withAnchors } from './art-winter-pick.js';
import { stickOn, strapsFrom } from './art-xmas-pick.js';

export const SP = Object.freeze({
  navy: 0x2f4a6b, navyDark: 0x22364f,
  teal: 0x3f8f8c, tealDark: 0x2e6e6c,
  coral: 0xd0574a, coralDark: 0xa8423a,
  cream: 0xe0d6c0, foam: 0xc8d8d4,
  rope: 0xc4a676, ropeDark: 0x9c7f52, lamp: 0xe8c25a,
});

const TAU = Math.PI * 2;

function anchorShape(THREE, h, s, c) {
  const g = new THREE.Group(); g.scale.set(1.0, 1.0, 1.3);
  const m = h.clay(c.body, false), r = h.clay(c.ring || c.body, false), st = c.stock ? h.clay(c.stock, false) : m;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 0.11, s * 0.045, 6, 14), r);
  ring.position.y = s * 0.44; g.add(ring);
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.065, s * 0.065, s * 0.78, 8), m);
  shank.position.y = -s * 0.03; g.add(shank);
  const stock = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.045, s * 0.045, s * 0.52, 8), st);
  stock.rotation.z = Math.PI / 2; stock.position.y = s * 0.24; g.add(stock);
  [-1, 1].forEach(x => h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 8, 6), st), x * s * 0.27, s * 0.24, 0, false));
  const arm = new THREE.Mesh(new THREE.TorusGeometry(s * 0.30, s * 0.065, 6, 18, Math.PI), m);
  arm.rotation.z = Math.PI; arm.position.y = -s * 0.12; g.add(arm);
  [-1, 1].forEach(x => {
    const f = h.put(g, new THREE.Mesh(new THREE.ConeGeometry(s * 0.12, s * 0.22, 4), m), x * s * 0.31, -s * 0.06, 0, false);
    f.rotation.z = -x * 0.5; f.scale.z = 0.5;
  });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function tailFlap(THREE, h, g, base, dir, len, wid, color) {
  const q = new THREE.Group();
  q.position.copy(base);
  q.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  const c = new THREE.Mesh(new THREE.ConeGeometry(wid, len, 4), h.clay(color));
  c.rotation.x = Math.PI; c.position.y = -len / 2; c.scale.z = 0.28; c.castShadow = true;
  q.add(c);
  g.add(q);
}

function onDome(THREE, dome, rad, dir, obj, lift) {
  const d = new THREE.Vector3(...dir).normalize();
  obj.position.copy(d).multiplyScalar(rad * lift);
  obj.lookAt(d.clone().multiplyScalar(rad * 3));
  dome.add(obj);
}

function fib(n) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    return [Math.cos(a) * rr, y, Math.sin(a) * rr];
  });
}

export function buildPirateScarf(THREE, g, k, h) {
  const HR = k.HR, rk = 1.07, rad = HR * rk;
  const dome = new THREE.Group(); dome.rotation.x = -0.28; g.add(dome);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(rad, 28, 14, 0, TAU, 0, domeTheta(HR, rk)), h.clay(SP.navy, false));
  cap.castShadow = true; dome.add(cap);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(rad * rad - (HR * 0.5) ** 2), HR * 0.05, 6, 32), h.clay(SP.navyDark));
  rim.rotation.x = Math.PI / 2; rim.position.y = HR * 0.5; dome.add(rim);
  fib(46).forEach(([x, y, z]) => {
    if (y < 0.62 / rk || (z > 0.45 && Math.abs(x) < 0.35 && y < 0.92)) return;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(HR * 0.06, HR * 0.06, HR * 0.02, 10), h.clay(SP.cream, false));
    d.rotation.x = Math.PI / 2;
    const w = new THREE.Group(); w.add(d);
    onDome(THREE, dome, rad, [x, y, z], w, 1.005);
  });
  const holder = new THREE.Group(); holder.add(anchorShape(THREE, h, HR * 0.42, { body: SP.cream }));
  onDome(THREE, dome, rad, [0, 0.66, 0.75], holder, 1.02);
  const kp = new THREE.Vector3(0, HR * 0.42, -rad * 0.93);
  h.put(dome, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.17, 12, 9), h.clay(SP.navyDark, false)), kp.x, kp.y, kp.z).scale.set(1.15, 0.9, 0.85);
  [[-1, 0.8], [1, 1.0]].forEach(([s, l]) => tailFlap(THREE, h, dome, kp, new THREE.Vector3(s * 0.45, -1, -0.55), HR * 0.62 * l, HR * 0.20, s < 0 ? SP.navy : SP.navyDark));
  flatten(THREE, g);
}

function neckRope(THREE, g, k, h, colors, tubeK, twists = 14) {
  const r = k.neckR, d = r * tubeK * 0.7;
  colors.forEach((c, j) => {
    const pts = Array.from({ length: 160 }, (_, i) => {
      const t = i / 160, a = t * TAU, f = t * TAU * twists + j * Math.PI;
      const rr = r + d * Math.cos(f);
      return new THREE.Vector3(Math.sin(a) * rr, r * 0.04 + d * Math.sin(f), Math.cos(a) * rr);
    });
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 320, r * tubeK * 0.75, 6, true), h.clay(c, false));
    m.castShadow = true; g.add(m);
  });
}

export function buildAnchorNecklace(THREE, g, k0, h) {
  const k = withAnchors(k0), r = k.neckR;
  neckRope(THREE, g, k, h, [SP.rope, SP.ropeDark], 0.16);
  const anc = anchorShape(THREE, h, r * 0.80, { body: SP.navy, ring: SP.rope, stock: SP.ropeDark });
  const w = new THREE.Group(); w.add(anc); anc.position.y = -r * 0.36;
  stickOn(THREE, k, g, w, new THREE.Vector3(0, -r * 0.10, r), 1.14);
  flatten(THREE, g);
}

function frontAt(k, xR, yR, pad) {
  const bs = k.bs, fb = 1 - (xR / bs[0]) ** 2 - (yR / bs[1]) ** 2;
  const HYr = (k.HY - k.bodyY) / k.R, HRr = k.HR / k.R, fh = HRr * HRr - xR * xR - (yR - HYr) ** 2;
  const z = Math.min(fb > 0 ? -bs[2] * Math.sqrt(fb) : 0, fh > 0 ? -Math.sqrt(fh) : 0);
  return (z - pad) * k.R - k.back.z;
}

function lanternTop(THREE, h, g, p, r) {
  h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.35, r * 0.18, 16), h.clay(SP.navy, false)), p.x, p.y, p.z);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.04, r * 0.32, 4), h.clay(SP.navyDark)), p.x + Math.cos(a) * r * 1.28, p.y + r * 0.24, p.z + Math.sin(a) * r * 1.28, false);
  }
  h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.80, r * 0.80, r * 0.70, 12), h.clay(SP.lamp, false)), p.x, p.y + r * 0.44, p.z);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    h.put(g, new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.72, r * 0.12), h.clay(SP.navyDark)), p.x + Math.cos(a) * r * 0.80, p.y + r * 0.44, p.z + Math.sin(a) * r * 0.80, false);
  }
  h.put(g, new THREE.Mesh(new THREE.ConeGeometry(r * 1.05, r * 0.70, 12), h.clay(SP.coralDark, false)), p.x, p.y + r * 1.14, p.z);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), h.clay(SP.navy, false)), p.x, p.y + r * 1.55, p.z);
}

export function buildLighthousePack(THREE, g, k0, h) {
  const k = withAnchors(k0), R = k.R, rb = R * 0.22, rt = R * 0.155, H = R * 0.66, x = -0.50, y0 = 1.02, bands = 4;
  let z = 0;
  [x - 0.2, x, x + 0.2].forEach(xx => [y0, y0 + 0.3, y0 + 0.56].forEach(yy => { z = Math.min(z, frontAt(k, xx, yy, 0.04)); }));
  const base = new THREE.Vector3(x * R, k.bodyY + y0 * R - k.back.y, z - rb);
  h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(rb * 1.12, rb * 1.18, R * 0.06, 16), h.clay(SP.navyDark, false)), base.x, base.y, base.z);
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands, t1 = (i + 1) / bands;
    h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(rb + (rt - rb) * t1, rb + (rt - rb) * t0, H / bands, 16), h.clay(i % 2 ? SP.cream : SP.coral, false)), base.x, base.y + H * (t0 + t1) / 2, base.z);
  }
  h.put(g, new THREE.Mesh(new THREE.BoxGeometry(rb * 0.55, R * 0.12, R * 0.02), h.clay(SP.navy)), base.x, base.y + R * 0.08, base.z - rb * 1.0);
  h.put(g, new THREE.Mesh(new THREE.BoxGeometry(rt * 0.45, R * 0.08, R * 0.02), h.clay(SP.navy)), base.x, base.y + H * 0.62, base.z - (rb + rt) * 0.5);
  lanternTop(THREE, h, g, new THREE.Vector3(base.x, base.y + H, base.z), rt);
  strapsFrom(THREE, g, k, h, [new THREE.Vector3(base.x, base.y + H * 0.85, base.z + rt), new THREE.Vector3(R * 0.25, base.y + H * 0.55, z)], SP.navy);
  flatten(THREE, g);
}

export function buildWaveTrail(THREE, g, s, o, h) {
  const sh = new THREE.Shape();
  sh.moveTo(-0.75, -0.55);
  sh.quadraticCurveTo(0, -0.85, 0.75, -0.55);
  sh.lineTo(0.75, 0.05);
  [[0.50, 0.55, 0.25], [0.0, 0.55, -0.25], [-0.50, 0.55, -0.75]].forEach(([cx, cy, ex]) => sh.quadraticCurveTo(cx, cy, ex, 0.05));
  sh.lineTo(-0.75, -0.55);
  const geo = new THREE.ShapeGeometry(sh, 12); geo.scale(s, s, 1);
  h.put(g, new THREE.Mesh(geo, h.film(SP.teal, o)), 0, 0.006, 0, false).rotation.set(-Math.PI / 2, 0, Math.PI);
  const crest = Array.from({ length: 31 }, (_, i) => {
    const t = i / 30, u = (t * 3) % 1;
    return new THREE.Vector3((0.75 - t * 1.5) * -s, 0.009, (0.07 + 0.25 * Math.sin(Math.PI * u)) * s);
  });
  h.put(g, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crest), 60, s * 0.07, 4, false), h.film(SP.foam, o * 0.9)), 0, 0, 0, false).scale.y = 0.2;
  const ripple = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return new THREE.Vector3((t - 0.5) * 1.2 * s, 0, Math.sin(t * 1.5 * TAU) * 0.06 * s);
  });
  h.put(g, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ripple), 40, s * 0.05, 5, false), h.film(SP.tealDark, o * 0.8)), 0, 0.009, -s * 0.25, false).scale.y = 0.15;
}
