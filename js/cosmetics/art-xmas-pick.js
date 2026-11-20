import { flatten, tubeAlong, surfLocal, backFront, withAnchors } from './art-winter-pick.js';
import { coneChain, arcPt, pushOut, bodyNormal } from './art-forest-pick.js';

export const XM = Object.freeze({
  red: 0xb8333a, redDark: 0x8a2630,
  holly: 0x3f7a45, hollyDark: 0x2d5a34,
  gold: 0xd9a838, goldDark: 0xa87a24, goldLight: 0xe8c869,
  cream: 0xe2d3b6, brownDark: 0x5e3b20, antler: 0xa8825a, antlerTip: 0xd4bf98,
});

const TAU = Math.PI * 2;

function roundChain(THREE, g, h, pts, rad, color) {
  coneChain(THREE, g, h, pts, () => rad, () => color);
  const e = pts[pts.length - 1];
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 9), h.clay(color, false)), e.x, e.y, e.z);
}

function hollyShape(THREE, L, W) {
  const s = new THREE.Shape(), right = [];
  for (let i = 1; i <= 5; i++) {
    const t = i / 6, w = W * Math.pow(Math.sin(Math.PI * t), 0.7);
    right.push([i % 2 ? w * 1.2 : w * 0.62, t * L]);
  }
  s.moveTo(0, 0);
  right.forEach(([x, y]) => s.lineTo(x, y));
  s.lineTo(0, L);
  right.slice().reverse().forEach(([x, y]) => s.lineTo(-x, y));
  s.lineTo(0, 0);
  return s;
}

function hollyLeaf(THREE, h, L, color) {
  const geo = new THREE.ExtrudeGeometry(hollyShape(THREE, L, L * 0.26), { depth: L * 0.05, bevelEnabled: false });
  geo.translate(0, 0, -L * 0.025);
  const m = new THREE.Mesh(geo, h.clay(color));
  m.castShadow = true;
  const vein = new THREE.Mesh(new THREE.BoxGeometry(L * 0.03, L * 0.8, L * 0.07), h.clay(XM.hollyDark));
  vein.position.y = L * 0.45; m.add(vein);
  return m;
}

function berries(THREE, h, g, r, pos) {
  [[0, 0, 0], [-0.9, -0.6, 0.2], [0.9, -0.6, 0.2]].forEach(([x, y, z], i) =>
    h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), h.clay(i % 2 ? XM.redDark : XM.red, false)), pos.x + x * r, pos.y + y * r, pos.z + z * r));
}

function hollySprig(THREE, h, g, L, pos, ang, tiltX) {
  const sp = new THREE.Group(); sp.position.copy(pos); sp.rotation.set(tiltX, 0, ang); g.add(sp);
  [-1, 1].forEach(s => {
    const lf = hollyLeaf(THREE, h, L, s < 0 ? XM.holly : XM.hollyDark);
    lf.rotation.z = s * 1.05; lf.rotation.y = s * 0.25; sp.add(lf);
  });
  berries(THREE, h, sp, L * 0.16, new THREE.Vector3(0, L * 0.08, L * 0.08));
}

export function buildAntlerBand(THREE, g, k, h) {
  const HR = k.HR, band = new THREE.Group();
  band.rotation.x = 0.45; g.add(band);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(HR * 1.08, HR * 0.065, 6, 30, Math.PI), h.clay(XM.red));
  arc.castShadow = true; band.add(arc);
  [-1, 1].forEach(s => {
    const ang = s * 0.40, side = Math.sign(-ang) || 1, sz = HR * 0.60;
    const e = new THREE.Group(); e.position.copy(arcPt(THREE, k, ang)); e.rotation.z = ang; band.add(e);
    const V = (x, y, z) => new THREE.Vector3(side * x * sz, y * sz, z * sz);
    roundChain(THREE, e, h, [V(0, 0, 0), V(0.10, 0.45, 0), V(0.30, 0.85, -0.04), V(0.36, 1.08, -0.04)], HR * 0.11, XM.antler);
    roundChain(THREE, e, h, [V(0.10, 0.45, 0), V(0.38, 0.62, 0.04), V(0.52, 0.66, 0.04)], HR * 0.095, XM.antler);
    roundChain(THREE, e, h, [V(0.24, 0.74, -0.02), V(0.02, 0.98, 0.02)], HR * 0.085, XM.antlerTip);
  });
  hollySprig(THREE, h, band, HR * 0.40, arcPt(THREE, k, 0.95, 1.16).add(new THREE.Vector3(0, 0, HR * 0.05)), 0.95, 0.2);
  const q = arcPt(THREE, k, -0.95, 1.16);
  const bell = h.put(band, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.10, 12, 9), h.clay(XM.gold, false)), q.x, q.y, HR * 0.02);
  h.put(bell, new THREE.Mesh(new THREE.TorusGeometry(HR * 0.04, HR * 0.015, 5, 10), h.clay(XM.goldDark)), 0, HR * 0.10, 0);
  flatten(THREE, g);
}

function neckWrap(THREE, g, k, h, colors, tubeK) {
  const r = k.neckR, segs = 12;
  for (let i = 0; i < segs; i++) {
    const t = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * tubeK, 7, 4, TAU / segs + 0.02), h.clay(colors[i % colors.length], false)), 0, r * 0.04, 0);
    t.rotation.set(Math.PI / 2, 0, (i / segs) * TAU);
  }
}

export function stickOn(THREE, k, g, obj, P, out) {
  const p = pushOut(THREE, k, P, out), n = bodyNormal(THREE, k, p);
  obj.position.copy(p);
  obj.lookAt(p.clone().add(new THREE.Vector3(n.x, n.y * 0.4, n.z).normalize()));
  g.add(obj);
  return obj;
}

export function buildHollyTie(THREE, g, k0, h) {
  const k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [XM.red, XM.redDark], 0.14);
  const bow = new THREE.Group();
  [-1, 1].forEach(s => {
    const lf = hollyLeaf(THREE, h, r * 0.78, s < 0 ? XM.holly : XM.hollyDark);
    lf.rotation.z = -s * (Math.PI / 2 - 0.22); bow.add(lf);
    const lo = hollyLeaf(THREE, h, r * 0.50, s < 0 ? XM.hollyDark : XM.holly);
    lo.rotation.z = Math.PI + s * 0.45; lo.position.z = -r * 0.02; bow.add(lo);
  });
  berries(THREE, h, bow, r * 0.13, new THREE.Vector3(0, r * 0.06, r * 0.08));
  stickOn(THREE, k, g, bow, new THREE.Vector3(0, -r * 0.30, r), 1.12);
  flatten(THREE, g);
}

function clearZ(k, y0, y1, pad = 0.03) {
  let z = 0;
  for (let i = 0; i <= 8; i++) z = Math.min(z, backFront(k, y0 + (y1 - y0) * i / 8, pad).z);
  return z;
}

export function strapsFrom(THREE, g, k, h, starts, color) {
  starts.forEach((p0, i) => {
    const s = i ? 1 : -1;
    const pts = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, pts, k.R * 0.045, h.clay(color), 28, 6));
  });
}

function bowTop(THREE, h, g, s, color, pos) {
  const b = new THREE.Group(); b.position.copy(pos); g.add(b);
  [-1, 1].forEach(side => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(s, s * 0.32, 6, 14), h.clay(color, false));
    t.position.set(side * s * 0.95, s * 0.55, 0); t.rotation.z = side * 0.55; t.scale.set(1, 0.8, 0.6); t.castShadow = true; b.add(t);
  });
  h.put(b, new THREE.Mesh(new THREE.SphereGeometry(s * 0.42, 10, 8), h.clay(color, false)), 0, s * 0.25, 0);
}

function giftBox(THREE, h, g, w, hh, d, pos, color, ribbon, rotY, bow) {
  const b = new THREE.Group(); b.position.copy(pos); b.rotation.y = rotY; g.add(b);
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), h.clay(color)); box.castShadow = true; b.add(box);
  const rw = Math.min(w, d) * 0.18, e = 1.04;
  b.add(new THREE.Mesh(new THREE.BoxGeometry(rw, hh * e, d * e), h.clay(ribbon)));
  b.add(new THREE.Mesh(new THREE.BoxGeometry(w * e, hh * e, rw), h.clay(ribbon)));
  if (bow) bowTop(THREE, h, b, Math.min(w, d) * 0.30, ribbon, new THREE.Vector3(0, hh / 2, 0));
}

export function buildGiftPack(THREE, g, k0, h) {
  const k = withAnchors(k0), R = k.R;
  const stack = [[0.74, 0.34, 0.24, XM.red, XM.gold, 0], [0.56, 0.30, 0.22, XM.holly, XM.red, 0.14], [0.38, 0.27, 0.20, XM.cream, XM.red, -0.10]];
  let y = 1.04;
  stack.forEach(([w, hh, d, c, rb, ry], i) => {
    const z = clearZ(k, y, y + hh) - d * R / 2;
    giftBox(THREE, h, g, w * R, hh * R, d * R, new THREE.Vector3(0, backFront(k, y + hh / 2).y, z), c, rb, ry, i === 2);
    y += hh;
  });
  const top = backFront(k, 1.20);
  strapsFrom(THREE, g, k, h, [-1, 1].map(s => new THREE.Vector3(s * R * 0.20, top.y + R * 0.08, clearZ(k, 1.04, 1.38) + R * 0.02)), XM.brownDark);
  flatten(THREE, g);
}

function star5(THREE, ro, ri) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? ri : ro;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

export function buildStardustTrail(THREE, g, s, o, h) {
  [[0.62, XM.gold, 0.008], [0.30, XM.goldLight, 0.010]].forEach(([ro, c, y]) => {
    h.put(g, new THREE.Mesh(new THREE.ShapeGeometry(star5(THREE, s * ro, s * ro * 0.45)), h.film(c, o)), 0, y, s * 0.30, false).rotation.set(-Math.PI / 2, 0, 0.2);
  });
  const N = 7;
  for (let i = 1; i <= N; i++) {
    const t = i / N, x = Math.sin(t * 2.2) * s * 0.55, z = s * 0.30 - t * s * 1.9;
    const m = h.put(g, new THREE.Mesh(new THREE.OctahedronGeometry(s * (0.16 - t * 0.10), 0), h.film(i % 2 ? XM.goldLight : XM.cream, o * (1 - t * 0.7))), x, 0.008, z, false);
    m.scale.set(1, 0.25, 1); m.rotation.y = i;
  }
}
