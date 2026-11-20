import { onSurf } from '../../js/cosmetics/anchors.js';

export const XM = Object.freeze({
  red: 0xb8333a, redDark: 0x8a2630,
  holly: 0x3f7a45, hollyDark: 0x2d5a34,
  gold: 0xd9a838, goldDark: 0xa87a24, goldLight: 0xe8c869,
  cream: 0xe2d3b6, snow: 0xd8d8d2,
  brown: 0x8a5a32, brownDark: 0x5e3b20, antler: 0xa8825a, antlerTip: 0xd4bf98,
  ink: 0x2b221c,
});

const TAU = Math.PI * 2;

function tubeAlong(THREE, pts, radius, mat, seg = 24, radial = 7) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, radius, radial, false), mat);
  m.castShadow = true;
  return m;
}

function surfLocal(THREE, k, origin, d, out) {
  const p = onSurf(k.bs, k.R, k.bodyY, d[0], d[1], d[2], out);
  return new THREE.Vector3(p.x - origin.x, p.y - origin.y, p.z - origin.z);
}

function coneChain(THREE, g, h, pts, radAt, colorAt) {
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], r0 = radAt(i), r1 = radAt(i + 1), mat = h.clay(colorAt(i), false);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), 10), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
    m.castShadow = true;
    g.add(m);
    if (i > 0) h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r0, 10, 8), mat), a.x, a.y, a.z);
  }
  const e = pts[pts.length - 1];
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(radAt(pts.length - 1), 10, 8), h.clay(colorAt(pts.length - 2), false)), e.x, e.y, e.z);
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

function berries(THREE, h, g, r, pos, n = 3) {
  const offs = [[0, 0, 0], [-0.9, -0.6, 0.2], [0.9, -0.6, 0.2], [0, -1.1, 0.4]].slice(0, n);
  offs.forEach(([x, y, z], i) => h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), h.clay(i % 2 ? XM.redDark : XM.red, false)), pos.x + x * r, pos.y + y * r, pos.z + z * r));
}

function hollySprig(THREE, h, g, L, pos, ang = 0, tiltX = 0) {
  const sp = new THREE.Group(); sp.position.copy(pos); sp.rotation.set(tiltX, 0, ang); g.add(sp);
  [-1, 1].forEach(s => {
    const lf = hollyLeaf(THREE, h, L, s < 0 ? XM.holly : XM.hollyDark);
    lf.rotation.z = s * 1.05; lf.rotation.y = s * 0.25; sp.add(lf);
  });
  berries(THREE, h, sp, L * 0.16, new THREE.Vector3(0, L * 0.08, L * 0.08));
  return sp;
}

function headBand(THREE, g, k, h, color, tilt = 0.45) {
  const band = new THREE.Group(); band.rotation.x = tilt; g.add(band);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(k.HR * 1.08, k.HR * 0.065, 6, 30, Math.PI), h.clay(color));
  arc.castShadow = true; band.add(arc);
  return band;
}

function arcPt(THREE, k, ang, rk = 1.08) {
  return new THREE.Vector3(-Math.sin(ang) * k.HR * rk, Math.cos(ang) * k.HR * rk, 0);
}

function socket(THREE, band, k, ang) {
  const e = new THREE.Group();
  e.position.copy(arcPt(THREE, k, ang));
  e.rotation.z = ang;
  band.add(e);
  return { e, side: Math.sign(-ang) || 1 };
}

function antlerBranch(THREE, h, e, side, size, beam, tines, rad, tipC) {
  const V = ([x, y, z]) => new THREE.Vector3(side * x * size, y * size, z * size);
  const bp = beam.map(V);
  coneChain(THREE, e, h, bp, i => rad * (1 - 0.45 * i / (bp.length - 1)), i => (i >= bp.length - 2 ? tipC : XM.antler));
  tines.forEach(([bi, d]) => {
    const from = bp[bi], to = from.clone().add(V(d));
    coneChain(THREE, e, h, [from, from.clone().lerp(to, 0.55).add(new THREE.Vector3(0, size * 0.04, 0)), to], i => rad * (0.72 - 0.2 * i), () => tipC);
  });
}

export function buildAntlerBandA(THREE, g, k, h) {
  const HR = k.HR, band = headBand(THREE, g, k, h, XM.brownDark);
  [-1, 1].forEach(s => {
    const { e, side } = socket(THREE, band, k, s * 0.42);
    antlerBranch(THREE, h, e, side, HR * 0.80,
      [[0, 0, 0], [0.10, 0.34, -0.04], [0.32, 0.66, -0.10], [0.62, 0.86, -0.12], [0.86, 0.92, -0.08]],
      [[1, [-0.18, 0.30, 0.10]], [2, [0.02, 0.34, 0.12]], [3, [0.04, 0.26, 0.06]]],
      HR * 0.075, XM.antlerTip);
  });
}

export function buildAntlerBandB(THREE, g, k, h) {
  const HR = k.HR, band = headBand(THREE, g, k, h, XM.red);
  [-1, 1].forEach(s => {
    const { e, side } = socket(THREE, band, k, s * 0.40);
    const sz = HR * 0.60;
    const V = (x, y, z) => new THREE.Vector3(side * x * sz, y * sz, z * sz);
    coneChain(THREE, e, h, [V(0, 0, 0), V(0.10, 0.45, 0), V(0.30, 0.85, -0.04), V(0.36, 1.08, -0.04)], () => HR * 0.11, () => XM.antler);
    coneChain(THREE, e, h, [V(0.10, 0.45, 0), V(0.38, 0.62, 0.04), V(0.52, 0.66, 0.04)], () => HR * 0.095, () => XM.antler);
    coneChain(THREE, e, h, [V(0.24, 0.74, -0.02), V(0.02, 0.98, 0.02)], () => HR * 0.085, () => XM.antlerTip);
  });
  const p = arcPt(THREE, k, 0.95, 1.16);
  hollySprig(THREE, h, band, HR * 0.40, p.add(new THREE.Vector3(0, 0, HR * 0.05)), 0.95, 0.2);
  const q = arcPt(THREE, k, -0.95, 1.16);
  const bell = h.put(band, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.10, 12, 9), h.clay(XM.gold, false)), q.x, q.y, HR * 0.02);
  h.put(bell, new THREE.Mesh(new THREE.TorusGeometry(HR * 0.04, HR * 0.015, 5, 10), h.clay(XM.goldDark)), 0, HR * 0.10, 0);
}

export function buildAntlerBandC(THREE, g, k, h) {
  const HR = k.HR, band = headBand(THREE, g, k, h, XM.holly);
  [-1, 1].forEach(s => {
    const { e, side } = socket(THREE, band, k, s * 0.48);
    antlerBranch(THREE, h, e, side, HR * 0.66,
      [[0, 0, 0], [0.12, 0.40, -0.02], [0.40, 0.72, -0.06], [0.70, 0.80, -0.06]],
      [[1, [-0.16, 0.30, 0.06]]],
      HR * 0.07, XM.antlerTip);
  });
  const top = arcPt(THREE, k, 0);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, a = t * TAU * 3;
    const cy = 0.05 + 0.32 * Math.sin(t * Math.PI * 0.8);
    pts.push(new THREE.Vector3(Math.cos(a) * 0.05 * HR, (cy + Math.sin(a) * 0.05) * HR, 0.62 * t * HR).add(top));
  }
  band.add(tubeAlong(THREE, pts, HR * 0.022, h.clay(XM.goldDark), 80, 5));
  const end = pts[pts.length - 1];
  h.put(band, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.21, 16, 12), h.clay(XM.red, false)), end.x, end.y + HR * 0.04, end.z + HR * 0.06);
  h.put(band, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.05, 8, 6), h.clay(XM.cream, false)), end.x - HR * 0.06, end.y + HR * 0.12, end.z + HR * 0.17);
}

function pushOut(THREE, k, P, out = 1.07) {
  const W = P.clone().add(k.neck);
  const Q = new THREE.Vector3(W.x, W.y - k.bodyY, W.z);
  const n = Math.hypot(Q.x / (k.bs[0] * k.R), Q.y / (k.bs[1] * k.R), Q.z / (k.bs[2] * k.R));
  if (n < out) Q.multiplyScalar(out / n);
  const D = new THREE.Vector3(Q.x, Q.y + k.bodyY - k.HY, Q.z), hr = k.HR * 1.06 * (out / 1.07);
  if (D.length() < hr) D.setLength(hr);
  return new THREE.Vector3(D.x, D.y + k.HY, D.z).sub(k.neck);
}

function bodyNormal(THREE, k, P) {
  const W = P.clone().add(k.neck);
  const a = k.bs[0] * k.R, b = k.bs[1] * k.R, c = k.bs[2] * k.R;
  return new THREE.Vector3(W.x / (a * a), (W.y - k.bodyY) / (b * b), W.z / (c * c)).normalize();
}

function neckWrap(THREE, g, k, h, colors, tubeK = 0.30) {
  const r = k.neckR, segs = 12;
  for (let i = 0; i < segs; i++) {
    const t = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * tubeK, 7, 4, TAU / segs + 0.02), h.clay(colors[i % colors.length], false)), 0, r * 0.04, 0);
    t.rotation.set(Math.PI / 2, 0, (i / segs) * TAU);
  }
}

function stickOn(THREE, k, g, obj, P, out) {
  const p = pushOut(THREE, k, P, out), n = bodyNormal(THREE, k, p);
  obj.position.copy(p);
  obj.lookAt(p.clone().add(new THREE.Vector3(n.x, n.y * 0.4, n.z).normalize()));
  g.add(obj);
  return obj;
}

function ribbonLoop(THREE, h, g, r, color, side) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.42, 6, 16), h.clay(color, false));
  t.scale.set(1.15, 0.72, 0.55); t.position.x = side * r * 1.05; t.rotation.z = side * 0.18; t.castShadow = true; g.add(t);
  return t;
}

export function buildHollyTieA(THREE, g, k, h) {
  const r = k.neckR;
  neckWrap(THREE, g, k, h, [XM.red, XM.redDark], 0.14);
  const bow = new THREE.Group();
  [-1, 1].forEach(s => {
    const lf = hollyLeaf(THREE, h, r * 0.78, s < 0 ? XM.holly : XM.hollyDark);
    lf.rotation.z = -s * (Math.PI / 2 - 0.22); bow.add(lf);
    const lo = hollyLeaf(THREE, h, r * 0.50, s < 0 ? XM.hollyDark : XM.holly);
    lo.rotation.z = Math.PI + s * 0.45; lo.position.z = -r * 0.02; bow.add(lo);
  });
  berries(THREE, h, bow, r * 0.13, new THREE.Vector3(0, r * 0.06, r * 0.08), 3);
  stickOn(THREE, k, g, bow, new THREE.Vector3(0, -r * 0.30, r), 1.12);
}

export function buildHollyTieB(THREE, g, k, h) {
  const r = k.neckR;
  neckWrap(THREE, g, k, h, [XM.gold, XM.goldDark], 0.12);
  const bow = new THREE.Group();
  [-1, 1].forEach(s => {
    ribbonLoop(THREE, h, bow, r * 0.30, XM.red, s);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(r * 0.16, r * 0.62, r * 0.05), h.clay(s < 0 ? XM.red : XM.redDark));
    tail.position.set(s * r * 0.16, -r * 0.34, -r * 0.02); tail.rotation.z = s * 0.28; tail.castShadow = true; bow.add(tail);
    const notch = new THREE.Mesh(new THREE.ConeGeometry(r * 0.08, r * 0.12, 3), h.clay(XM.gold));
    notch.position.set(s * r * 0.25, -r * 0.66, -r * 0.02); notch.rotation.z = Math.PI + s * 0.28; notch.scale.z = 0.4; bow.add(notch);
  });
  h.put(bow, new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 10, 8), h.clay(XM.redDark, false)), 0, 0, r * 0.04).scale.set(1, 1, 0.7);
  hollySprig(THREE, h, bow, r * 0.52, new THREE.Vector3(0, r * 0.08, r * 0.14), 0, 0);
  stickOn(THREE, k, g, bow, new THREE.Vector3(0, -r * 0.30, r), 1.13);
}

export function buildHollyTieC(THREE, g, k, h) {
  const r = k.neckR, n = 16;
  const ring = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.07, 5, 28), h.clay(XM.brownDark)), 0, r * 0.02, 0);
  ring.rotation.x = Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const p = pushOut(THREE, k, new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r), 1.12);
    const lf = hollyLeaf(THREE, h, r * 0.66, i % 2 ? XM.holly : XM.hollyDark);
    const piv = new THREE.Group(); piv.position.copy(p); piv.rotation.y = a; g.add(piv);
    lf.rotation.set(-0.55, 0, Math.PI / 2 + (i % 2 ? 0.35 : -0.35)); lf.position.y = -r * 0.04; piv.add(lf);
    if (i % 3 === 0) berries(THREE, h, piv, r * 0.07, new THREE.Vector3(0, r * 0.04, r * 0.10), 3);
  }
  const bow = new THREE.Group();
  [-1, 1].forEach(s => ribbonLoop(THREE, h, bow, r * 0.24, XM.red, s));
  h.put(bow, new THREE.Mesh(new THREE.SphereGeometry(r * 0.08, 8, 6), h.clay(XM.redDark, false)), 0, 0, r * 0.03);
  const bell = h.put(bow, new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 10, 8), h.clay(XM.gold, false)), 0, -r * 0.16, r * 0.02);
  bell.scale.set(1, 1.1, 1);
  stickOn(THREE, k, g, bow, new THREE.Vector3(0, -r * 0.18, r), 1.20);
}

function backFront(k, yR, pad = 0.03) {
  const R = k.R, bs = k.bs;
  const bodyZ = yR < bs[1] ? -bs[2] * Math.sqrt(1 - (yR / bs[1]) ** 2) : 0;
  const HYr = (k.HY - k.bodyY) / R, HRr = k.HR / R, dy = yR - HYr;
  const headZ = Math.abs(dy) < HRr ? -Math.sqrt(HRr * HRr - dy * dy) : 0;
  return { y: k.bodyY + yR * R - k.back.y, z: (Math.min(bodyZ, headZ) - pad) * R - k.back.z };
}

function clearZ(k, y0, y1, pad = 0.03) {
  let z = 0;
  for (let i = 0; i <= 8; i++) z = Math.min(z, backFront(k, y0 + (y1 - y0) * i / 8, pad).z);
  return z;
}

function frontAt(k, xR, yR, pad = 0.03) {
  const bs = k.bs, fb = 1 - (xR / bs[0]) ** 2 - (yR / bs[1]) ** 2;
  const HYr = (k.HY - k.bodyY) / k.R, HRr = k.HR / k.R, fh = HRr * HRr - xR * xR - (yR - HYr) ** 2;
  const z = Math.min(fb > 0 ? -bs[2] * Math.sqrt(fb) : 0, fh > 0 ? -Math.sqrt(fh) : 0);
  return { x: xR * k.R, y: k.bodyY + yR * k.R - k.back.y, z: (z - pad) * k.R - k.back.z };
}

function strapsFrom(THREE, g, k, h, starts, color) {
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
  return b;
}

function giftBox(THREE, h, g, w, hh, d, pos, color, ribbon, rotY = 0, bow = true) {
  const b = new THREE.Group(); b.position.copy(pos); b.rotation.y = rotY; g.add(b);
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), h.clay(color)); box.castShadow = true; b.add(box);
  const rw = Math.min(w, d) * 0.18, e = 1.04;
  b.add(new THREE.Mesh(new THREE.BoxGeometry(rw, hh * e, d * e), h.clay(ribbon)));
  b.add(new THREE.Mesh(new THREE.BoxGeometry(w * e, hh * e, rw), h.clay(ribbon)));
  if (bow) bowTop(THREE, h, b, Math.min(w, d) * 0.30, ribbon, new THREE.Vector3(0, hh / 2, 0));
  return b;
}

export function buildGiftPackA(THREE, g, k, h) {
  const R = k.R;
  const stack = [[0.74, 0.34, 0.24, XM.red, XM.gold, 0], [0.56, 0.30, 0.22, XM.holly, XM.red, 0.14], [0.38, 0.27, 0.20, XM.cream, XM.red, -0.10]];
  let y = 1.04;
  stack.forEach(([w, hh, d, c, rb, ry], i) => {
    const z = clearZ(k, y, y + hh) - d * R / 2;
    giftBox(THREE, h, g, w * R, hh * R, d * R, new THREE.Vector3(0, backFront(k, y + hh / 2).y, z), c, rb, ry, i === 2);
    y += hh;
  });
  const top = backFront(k, 1.20);
  strapsFrom(THREE, g, k, h, [-1, 1].map(s => new THREE.Vector3(s * R * 0.20, top.y + R * 0.08, clearZ(k, 1.04, 1.38) + R * 0.02)), XM.brownDark);
}

export function buildGiftPackB(THREE, g, k, h) {
  const R = k.R, y0 = 1.00, hh = 0.38, d = 0.22;
  const z = clearZ(k, y0, y0 + hh) - d * R / 2, cy = backFront(k, y0 + hh / 2).y;
  giftBox(THREE, h, g, 0.54 * R, hh * R, d * R, new THREE.Vector3(-0.34 * R, cy, z), XM.red, XM.gold, 0.06, false);
  giftBox(THREE, h, g, 0.48 * R, 0.32 * R, d * R, new THREE.Vector3(0.32 * R, cy - 0.03 * R, z), XM.holly, XM.cream, -0.06, false);
  const tz = clearZ(k, y0 + hh, y0 + hh + 0.28) - 0.11 * R;
  const top = giftBox(THREE, h, g, 0.32 * R, 0.26 * R, 0.20 * R, new THREE.Vector3(-0.30 * R, cy + (hh / 2 + 0.15) * R, Math.min(tz, z)), XM.gold, XM.red, -0.12, true);
  top.rotation.z = 0.12;
  strapsFrom(THREE, g, k, h, [-1, 1].map(s => new THREE.Vector3(s * R * 0.26, cy + R * 0.12, z + d * R / 2)), XM.brown);
}

export function buildGiftPackC(THREE, g, k, h) {
  const R = k.R, rb = R * 0.29, hb = R * 0.36;
  const f = frontAt(k, -0.40, 1.04);
  const z = Math.min(f.z, frontAt(k, -0.40, 1.34).z, frontAt(k, -0.12, 1.24).z, frontAt(k, -0.66, 1.10).z) - hb / 2;
  const hat = new THREE.Group(); hat.position.set(f.x, f.y + hb * 0.25, z); hat.rotation.set(Math.PI / 2, 0, 0.18); g.add(hat);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rb, rb, hb, 20), h.clay(XM.holly)); cyl.castShadow = true; hat.add(cyl);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(rb * 1.07, rb * 1.07, hb * 0.24, 20), h.clay(XM.red)); lid.position.y = -hb * 0.42; hat.add(lid);
  [0, Math.PI / 2].forEach(a => { const rr = new THREE.Mesh(new THREE.BoxGeometry(rb * 2.2, hb * 0.27, rb * 0.30), h.clay(XM.gold)); rr.position.y = -hb * 0.42; rr.rotation.y = a; hat.add(rr); });
  const lb = bowTop(THREE, h, hat, rb * 0.36, XM.gold, new THREE.Vector3(0, -hb * 0.55, 0)); lb.rotation.x = Math.PI;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(rb * 1.02, rb * 1.02, hb * 0.18, 20), h.clay(XM.gold)); band.position.y = hb * 0.12; hat.add(band);
  const box = giftBox(THREE, h, g, R * 0.30, R * 0.27, R * 0.24, new THREE.Vector3(f.x + R * 0.16, f.y + R * 0.30, z - R * 0.04), XM.red, XM.gold, 0.4, true);
  box.rotation.z = -0.35;
  const tag = new THREE.Mesh(new THREE.BoxGeometry(R * 0.12, R * 0.16, R * 0.015), h.clay(XM.cream));
  tag.position.set(f.x - rb * 0.95, f.y - R * 0.12, z - rb * 0.6); tag.rotation.z = 0.25; g.add(tag);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(R * 0.02, 6, 5), h.clay(XM.red)), tag.position.x, tag.position.y + R * 0.05, tag.position.z - R * 0.012);
  g.add(tubeAlong(THREE, [new THREE.Vector3(f.x - rb * 0.8, f.y, z - rb * 0.9), new THREE.Vector3(f.x - rb * 0.95, f.y - R * 0.05, z - rb * 0.75), tag.position.clone().add(new THREE.Vector3(0, R * 0.08, 0))], R * 0.008, h.clay(XM.red), 8, 4));
  strapsFrom(THREE, g, k, h, [new THREE.Vector3(f.x - rb * 0.3, f.y + rb * 0.7, z + rb * 0.6), new THREE.Vector3(f.x + rb * 1.0, f.y + rb * 0.4, z + rb * 0.6)], XM.brownDark);
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

function flatStar(THREE, g, h, ro, mat, x, y, z, rot = 0) {
  mat.side = THREE.DoubleSide;
  const m = h.put(g, new THREE.Mesh(new THREE.ShapeGeometry(star5(THREE, ro, ro * 0.45)), mat), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rot);
  return m;
}

function oval(THREE, g, h, r, sx, sz, x, z, mat, y = 0.006) {
  const t = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 9, 6), mat), x, y, z, false);
  t.scale.set(sx, 0.10, sz);
  return t;
}

function glitter(THREE, g, h, s, o, pts) {
  pts.forEach(([x, z, k], i) => {
    const m = h.put(g, new THREE.Mesh(new THREE.OctahedronGeometry(s * k, 0), h.film(i % 2 ? XM.goldLight : XM.gold, o)), x * s, 0.010, z * s, false);
    m.scale.set(1, 0.25, 1); m.rotation.y = i * 0.7;
  });
}

const TOES = [[-0.50, 0.30], [-0.18, 0.54], [0.18, 0.54], [0.50, 0.30]];

export function buildStardustTrailA(THREE, g, s, o, id, h) {
  oval(THREE, g, h, s * 0.46, 1.15, 0.95, 0, -s * 0.14, h.film(XM.goldDark, o * 0.85));
  TOES.forEach(([x, z], i) => flatStar(THREE, g, h, s * 0.24, h.film(XM.gold, o), x * s * 1.05, 0.008, z * s * 1.1, i * 0.4 - 0.6));
  glitter(THREE, g, h, s, o * 0.9, [[0.90, -0.40, 0.09], [-0.85, -0.55, 0.08], [0.20, -0.95, 0.07], [-0.95, 0.85, 0.06]]);
}

export function buildStardustTrailB(THREE, g, s, o, id, h) {
  const snow = h.film(XM.snow, o * 0.9);
  oval(THREE, g, h, s * 0.48, 1.15, 0.95, 0, -s * 0.12, snow);
  TOES.forEach(([x, z]) => oval(THREE, g, h, s * 0.17, 0.9, 1.15, x * s, z * s, snow));
  flatStar(THREE, g, h, s * 0.30, h.film(XM.gold, o), 0, 0.010, -s * 0.12, 0);
  glitter(THREE, g, h, s, o * 0.8, [[0.80, -0.55, 0.07], [-0.75, 0.80, 0.06]]);
}

export function buildStardustTrailC(THREE, g, s, o, id, h) {
  flatStar(THREE, g, h, s * 0.62, h.film(XM.gold, o), 0, 0.008, s * 0.30, 0.2);
  flatStar(THREE, g, h, s * 0.30, h.film(XM.goldLight, o), 0, 0.010, s * 0.30, 0.2);
  const N = 7;
  for (let i = 1; i <= N; i++) {
    const t = i / N, x = Math.sin(t * 2.2) * s * 0.55, z = s * 0.30 - t * s * 1.9;
    const m = h.put(g, new THREE.Mesh(new THREE.OctahedronGeometry(s * (0.16 - t * 0.10), 0), h.film(i % 2 ? XM.goldLight : XM.cream, o * (1 - t * 0.7))), x, 0.008, z, false);
    m.scale.set(1, 0.25, 1); m.rotation.y = i;
  }
}

export const VARIANTS = {
  xm_antler_band: {
    slot: 'head', name: '루돌프 뿔 머리띠',
    A: { name: '가지뿔 머리띠', note: '짙은 갈색 띠 + 큰 가지뿔(곁가지 셋) · 끝만 밝은 뿔색', build: buildAntlerBandA },
    B: { name: '말랑 펠트뿔', note: '빨간 띠 + 굵고 둥근 펠트뿔 · 한쪽 호랑가시, 반대쪽 금방울', build: buildAntlerBandB },
    C: { name: '빨간 코 용수철', note: '초록 띠 + 작은 뿔 + 이마 앞으로 튀어나온 빨간 코 방울', build: buildAntlerBandC },
  },
  xm_holly_tie: {
    slot: 'neck', name: '호랑가시 리본 타이',
    A: { name: '잎사귀 나비 타이', note: '가는 빨간 끈 + 호랑가시 잎 넷이 나비 모양 · 가운데 빨간 열매', build: buildHollyTieA },
    B: { name: '빨간 리본 + 잎', note: '금빛 끈 + 둥근 빨간 리본 고리·꼬리 · 매듭에 호랑가시', build: buildHollyTieB },
    C: { name: '호랑가시 화환 깃', note: '목을 두른 잎 화환 + 열매 + 앞쪽 작은 리본·금방울', build: buildHollyTieC },
  },
  xm_gift_pack: {
    slot: 'back', cols: 'back2', name: '선물 꾸러미 배낭',
    A: { name: '선물 탑', note: '빨강·초록·크림 상자 세 단 · 맨 위 빨간 리본', build: buildGiftPackA },
    B: { name: '나란히 꾸러미', note: '빨강·초록 상자 나란히 + 위에 금빛 상자 · 어깨끈 두 줄', build: buildGiftPackB },
    C: { name: '모자상자 + 꼬리표', note: '왼어깨 초록 원통 상자 + 기울어진 빨간 상자 · 크림 꼬리표', build: buildGiftPackC },
  },
  xm_stardust_trail: {
    slot: 'trail', name: '별가루 발자국',
    A: { name: '별 발가락', note: '금갈색 발바닥 + 발가락이 다섯 꼭지 별 · 둘레 금가루', build: buildStardustTrailA },
    B: { name: '눈 발자국 + 별', note: '하얀 눈 발자국 + 발바닥 가운데 금별 하나', build: buildStardustTrailB },
    C: { name: '별똥 자취', note: '발자국 없이 다섯 꼭지 금별 + 뒤로 흩어지는 별가루', build: buildStardustTrailC },
  },
};
