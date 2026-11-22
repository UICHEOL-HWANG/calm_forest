import { onSurf } from '../../js/cosmetics/anchors.js';

export const FP = Object.freeze({
  acorn: 0x8a5a32, acornDark: 0x5e3b20, nut: 0xb07a40, cap: 0x6b4a2c,
  moss: 0x6a8a4a, mossDark: 0x4e6b38,
  cream: 0xe2d3b6, creamDark: 0xc4b08e,
  ochre: 0xc98a3c, ochreDark: 0x9c6a2a, russet: 0xb5652f,
  berry: 0xb8434f, berryDark: 0x8e3240,
  ink: 0x2b221c, beak: 0xd9822b,
  quill: 0x6e4f38, quillTip: 0xd9c7a4, snout: 0xd8b48a, leather: 0x7d4f33,
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
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), 12), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
    m.castShadow = true;
    g.add(m);
    if (i > 0) h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r0, 12, 9), mat), a.x, a.y, a.z);
  }
}

function acorn(THREE, h, g, r, pos, rot, mats) {
  const a = new THREE.Group();
  a.position.copy(pos); a.rotation.copy(rot); g.add(a);
  const nut = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mats.nut);
  nut.scale.set(0.82, 1.05, 0.82); nut.position.y = -r * 0.15; nut.castShadow = true; a.add(nut);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.18, r * 0.35, 6), mats.nut);
  tip.rotation.x = Math.PI; tip.position.y = -r * 1.25; a.add(tip);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.92, 12, 6, 0, TAU, 0, Math.PI / 2), mats.cap);
  cap.scale.set(1, 0.62, 1); cap.position.y = r * 0.30; cap.castShadow = true; a.add(cap);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.08, r * 0.12, r * 0.38, 5), mats.cap);
  stem.position.y = r * 0.95; stem.rotation.z = 0.3; a.add(stem);
  return a;
}

function leaf(THREE, h, g, len, pos, rot, color) {
  const lf = new THREE.Mesh(new THREE.SphereGeometry(len * 0.5, 10, 6), h.clay(color));
  lf.scale.set(0.45, 1, 0.14); lf.position.copy(pos); lf.rotation.copy(rot); lf.castShadow = true; g.add(lf);
  return lf;
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

function squirrelEar(THREE, band, k, h, ang, size, c) {
  const e = new THREE.Group();
  e.position.copy(arcPt(THREE, k, ang));
  e.rotation.z = ang;
  band.add(e);
  const s = Math.sign(-ang) || 1;
  const outer = new THREE.Mesh(new THREE.SphereGeometry(size * 0.5, 12, 9), h.clay(c.outer, false));
  outer.scale.set(0.78, 1, 0.34); outer.position.y = size * 0.42; outer.rotation.z = -s * 0.12; outer.castShadow = true; e.add(outer);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(size * 0.34, 10, 8), h.clay(c.inner, false));
  inner.scale.set(0.7, 1, 0.2); inner.position.set(0, size * 0.38, size * 0.12); inner.rotation.z = -s * 0.12; e.add(inner);
  [0, -0.35, 0.35].forEach((t, i) => {
    const tf = new THREE.Mesh(new THREE.ConeGeometry(size * (i ? 0.08 : 0.11), size * (i ? 0.24 : 0.32), 5), h.clay(c.tuft));
    tf.position.set(t * size * 0.16, size * 0.92 - (i ? size * 0.04 : 0), 0);
    tf.rotation.z = -t * 0.9; e.add(tf);
  });
}

export function buildSquirrelBandA(THREE, g, k, h) {
  const band = headBand(THREE, g, k, h, FP.acornDark);
  [-1, 1].forEach(s => squirrelEar(THREE, band, k, h, s * 0.36, k.HR * 0.66, { outer: FP.russet, inner: FP.cream, tuft: FP.acornDark }));
}

export function buildSquirrelBandB(THREE, g, k, h) {
  const HR = k.HR, band = headBand(THREE, g, k, h, FP.moss);
  [-1, 1].forEach(s => squirrelEar(THREE, band, k, h, s * 0.36, HR * 0.54, { outer: FP.ochre, inner: FP.cream, tuft: FP.ochreDark }));
  const p = arcPt(THREE, k, 0.95, 1.12);
  const mats = { nut: h.clay(FP.nut, false), cap: h.clay(FP.cap) };
  leaf(THREE, h, band, HR * 0.42, p.clone().add(new THREE.Vector3(-HR * 0.08, HR * 0.10, -HR * 0.04)), new THREE.Euler(0.2, 0, 0.9), FP.mossDark);
  leaf(THREE, h, band, HR * 0.36, p.clone().add(new THREE.Vector3(HR * 0.06, HR * 0.16, 0)), new THREE.Euler(0.1, 0, -0.3), FP.moss);
  acorn(THREE, h, band, HR * 0.13, p.clone().add(new THREE.Vector3(-HR * 0.02, -HR * 0.04, HR * 0.10)), new THREE.Euler(0.2, 0, 0.5), mats);
  acorn(THREE, h, band, HR * 0.11, p.clone().add(new THREE.Vector3(HR * 0.15, -HR * 0.08, HR * 0.08)), new THREE.Euler(0.1, 0, -0.4), mats);
}

export function buildSquirrelBandC(THREE, g, k, h) {
  const HR = k.HR, band = headBand(THREE, g, k, h, FP.ochreDark);
  [-1, 1].forEach(s => squirrelEar(THREE, band, k, h, s * 0.34, HR * 0.50, { outer: FP.russet, inner: FP.cream, tuft: FP.acornDark }));
  const p0 = arcPt(THREE, k, -1.05);
  const V = (x, y, z) => new THREE.Vector3(x * HR, y * HR, z * HR);
  const curve = new THREE.CatmullRomCurve3([p0, V(1.10, 0.62, -0.02), V(1.28, 0.98, -0.06), V(1.20, 1.34, -0.06), V(0.96, 1.42, -0.04), V(0.84, 1.24, -0.02)]);
  const N = 10, pts = curve.getSpacedPoints(N);
  const rad = i => HR * (0.07 + 0.15 * Math.sin(Math.PI * Math.min(1, (i / N) * 1.25)));
  coneChain(THREE, band, h, pts, rad, i => (i >= N - 3 ? FP.cream : i % 3 === 2 ? FP.ochre : FP.russet));
  const end = pts[N];
  h.put(band, new THREE.Mesh(new THREE.SphereGeometry(rad(N) * 1.25, 10, 8), h.clay(FP.cream, false)), end.x, end.y, end.z);
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

function drapeTri(THREE, k, A, B, C, mat, out = 1.08, n = 8) {
  const pos = [], idx = [], id = (i, j) => (i * (i + 1)) / 2 + j;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= i; j++) {
    const u = i / n, v = i ? j / i : 0;
    const top = A.clone().lerp(B, v), p = top.lerp(C, u);
    const q = pushOut(THREE, k, p, out);
    pos.push(q.x, q.y, q.z);
  }
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    idx.push(id(i, j), id(i + 1, j), id(i + 1, j + 1));
    if (j < i) idx.push(id(i, j), id(i + 1, j + 1), id(i, j + 1));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  mat.side = THREE.DoubleSide;
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  return m;
}

function neckWrap(THREE, g, k, h, colors, tubeK = 0.30) {
  const r = k.neckR, segs = 12;
  for (let i = 0; i < segs; i++) {
    const t = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * tubeK, 7, 4, TAU / segs + 0.02), h.clay(colors[i % colors.length], false)), 0, r * 0.04, 0);
    t.rotation.set(Math.PI / 2, 0, (i / segs) * TAU);
  }
}

function owlFace(THREE, h, size, c) {
  const g = new THREE.Group();
  const disc = (r, col, z, sx = 1, sy = 1) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, size * 0.06, 16), h.clay(col));
    m.rotation.x = Math.PI / 2; m.position.z = z; m.scale.set(sx, 1, sy); g.add(m); return m;
  };
  if (c.face) [-1, 1].forEach(s => { disc(size * 0.50, c.face, 0).position.x = s * size * 0.30; });
  [-1, 1].forEach(s => {
    disc(size * 0.34, c.eye, size * 0.05).position.set(s * size * 0.34, size * 0.04, size * 0.05);
    disc(size * 0.15, FP.ink, size * 0.09).position.set(s * size * 0.32, size * 0.02, size * 0.09);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(size * 0.16, size * 0.40, 3), h.clay(c.tuft));
    tuft.position.set(s * size * 0.52, size * 0.52, size * 0.02); tuft.rotation.z = -s * 0.45; tuft.scale.z = 0.4; g.add(tuft);
  });
  const beak = new THREE.Mesh(new THREE.ConeGeometry(size * 0.10, size * 0.26, 4), h.clay(FP.beak));
  beak.rotation.x = Math.PI; beak.position.set(0, -size * 0.22, size * 0.10); g.add(beak);
  return g;
}

function stickOn(THREE, k, g, obj, P, out) {
  const p = pushOut(THREE, k, P, out), n = bodyNormal(THREE, k, p);
  obj.position.copy(p);
  obj.lookAt(p.clone().add(new THREE.Vector3(n.x, n.y * 0.4, n.z).normalize()));
  g.add(obj);
  return obj;
}

export function buildOwlKerchiefA(THREE, g, k, h) {
  const r = k.neckR;
  neckWrap(THREE, g, k, h, [FP.ochre, FP.ochreDark], 0.26);
  const A = new THREE.Vector3(-r * 0.72, -r * 0.02, r * 0.62), B = new THREE.Vector3(r * 0.72, -r * 0.02, r * 0.62), C = new THREE.Vector3(0, -r * 1.05, r * 1.0);
  g.add(drapeTri(THREE, k, A, B, C, h.clay(FP.ochre, false), 1.08));
  [[A, C], [B, C]].forEach(([p, q]) => {
    const pts = Array.from({ length: 7 }, (_, i) => pushOut(THREE, k, p.clone().lerp(q, i / 6), 1.10));
    g.add(tubeAlong(THREE, pts, r * 0.045, h.clay(FP.cream), 16, 5));
  });
  stickOn(THREE, k, g, owlFace(THREE, h, r * 0.52, { face: FP.acorn, eye: FP.cream, tuft: FP.acornDark }), new THREE.Vector3(0, -r * 0.48, r * 0.9), 1.12);
}

export function buildOwlKerchiefB(THREE, g, k, h) {
  const r = k.neckR;
  neckWrap(THREE, g, k, h, [FP.moss, FP.mossDark], 0.30);
  [-1, 1].forEach(s => {
    const pts = [[0.10, -0.25], [0.18, -0.55], [0.26, -0.85]].map(([x, y]) => pushOut(THREE, k, new THREE.Vector3(s * x * r, y * r, r), 1.10));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const m = new THREE.Mesh(new THREE.BoxGeometry(r * 0.42, r * 0.08, a.distanceTo(b) * 1.1), h.clay(i % 2 ? FP.mossDark : FP.moss));
      m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.castShadow = true; g.add(m);
    }
    const e = pts[pts.length - 1];
    h.put(g, new THREE.Mesh(new THREE.ConeGeometry(r * 0.20, r * 0.22, 3), h.clay(FP.berry)), e.x, e.y - r * 0.05, e.z).rotation.x = Math.PI;
  });
  const owl = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(r * 0.30, 14, 10), h.clay(FP.ochre, false));
  body.scale.set(0.9, 1.05, 0.55); body.castShadow = true; owl.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(r * 0.18, 12, 8), h.clay(FP.cream, false));
  belly.scale.set(1, 1.1, 0.4); belly.position.set(0, -r * 0.12, r * 0.13); owl.add(belly);
  [-1, 1].forEach(s => {
    const w = new THREE.Mesh(new THREE.SphereGeometry(r * 0.14, 8, 6), h.clay(FP.ochreDark));
    w.scale.set(0.5, 1.2, 0.6); w.position.set(s * r * 0.26, -r * 0.06, r * 0.02); w.rotation.z = s * 0.25; owl.add(w);
  });
  const face = owlFace(THREE, h, r * 0.26, { face: FP.creamDark, eye: FP.cream, tuft: FP.ochreDark });
  face.position.set(0, r * 0.12, r * 0.14); owl.add(face);
  owl.scale.setScalar(1.45);
  stickOn(THREE, k, g, owl, new THREE.Vector3(0, -r * 0.42, r), 1.24);
}

export function buildOwlKerchiefC(THREE, g, k, h) {
  const r = k.neckR;
  const petal = (a, len, wid, color, y0, out, drop) => {
    const root = pushOut(THREE, k, new THREE.Vector3(Math.sin(a) * r, y0, Math.cos(a) * r), out);
    const tip = pushOut(THREE, k, root.clone().add(new THREE.Vector3(Math.sin(a) * len * 0.45, -len * drop, Math.cos(a) * len * 0.45)), out + 0.02);
    const Y = tip.clone().sub(root).normalize(), Z0 = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const Z = Z0.sub(Y.clone().multiplyScalar(Z0.dot(Y))).normalize(), X = new THREE.Vector3().crossVectors(Y, Z);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), h.clay(color, false));
    m.scale.set(wid, root.distanceTo(tip) * 0.62, r * 0.06);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    m.position.copy(root).lerp(tip, 0.5); m.castShadow = true; g.add(m);
  };
  for (let i = 0; i < 16; i++) petal((i / 16) * TAU, r * 0.62, r * 0.20, i % 2 ? FP.ochreDark : FP.ochre, -r * 0.08, 1.10, 0.85);
  for (let i = 0; i < 16; i++) petal(((i + 0.5) / 16) * TAU, r * 0.42, r * 0.16, i % 2 ? FP.cream : FP.creamDark, r * 0.04, 1.14, 0.75);
  const ring = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.10, 6, 28), h.clay(FP.acornDark)), 0, r * 0.05, 0);
  ring.rotation.x = Math.PI / 2;
  stickOn(THREE, k, g, owlFace(THREE, h, r * 0.56, { face: FP.ochreDark, eye: FP.cream, tuft: FP.acornDark }), new THREE.Vector3(0, -r * 0.34, r), 1.24);
}

function backFront(k, yR, pad = 0.03) {
  const R = k.R, bs = k.bs;
  const bodyZ = yR < bs[1] ? -bs[2] * Math.sqrt(1 - (yR / bs[1]) ** 2) : 0;
  const HYr = (k.HY - k.bodyY) / R, HRr = k.HR / R, dy = yR - HYr;
  const headZ = Math.abs(dy) < HRr ? -Math.sqrt(HRr * HRr - dy * dy) : 0;
  return { y: k.bodyY + yR * R - k.back.y, z: (Math.min(bodyZ, headZ) - pad) * R - k.back.z };
}

function frontAt(k, xR, yR, pad = 0.03) {
  const bs = k.bs, fb = 1 - (xR / bs[0]) ** 2 - (yR / bs[1]) ** 2;
  const HYr = (k.HY - k.bodyY) / k.R, HRr = k.HR / k.R, fh = HRr * HRr - xR * xR - (yR - HYr) ** 2;
  const z = Math.min(fb > 0 ? -bs[2] * Math.sqrt(fb) : 0, fh > 0 ? -Math.sqrt(fh) : 0);
  return { x: xR * k.R, y: k.bodyY + yR * k.R - k.back.y, z: (z - pad) * k.R - k.back.z };
}

function sideFront(k, xR, yR, pad = 0.02) {
  const bs = k.bs, f = 1 - (xR / bs[0]) ** 2 - (yR / bs[1]) ** 2;
  return { x: xR * k.R, y: k.bodyY + yR * k.R - k.back.y, z: (-bs[2] * Math.sqrt(Math.max(0, f)) - pad) * k.R - k.back.z };
}

function strapsFrom(THREE, g, k, h, starts, color) {
  starts.forEach((p0, i) => {
    const s = i ? 1 : -1;
    const pts = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, pts, k.R * 0.045, h.clay(color), 28, 6));
  });
}

function fib(n) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    return [Math.cos(a) * rr, y, Math.sin(a) * rr];
  });
}

function quill(THREE, h, g, base, dir, len, rad, dark, tipC) {
  const q = new THREE.Group();
  q.position.copy(base);
  q.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const c = new THREE.Mesh(new THREE.ConeGeometry(rad, len, 5), h.clay(dark)); c.position.y = len / 2; c.castShadow = true; q.add(c);
  if (tipC) { const t = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.42, len * 0.40, 5), h.clay(tipC)); t.position.y = len * 0.80; q.add(t); }
  g.add(q);
}

function hogFace(THREE, h, g, s, pos, dir) {
  const f = new THREE.Group(); f.position.copy(pos);
  f.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
  g.add(f);
  const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.42, 12, 9), h.clay(FP.snout, false)); head.scale.set(1.1, 0.9, 0.9); f.add(head);
  const sn = new THREE.Mesh(new THREE.ConeGeometry(s * 0.20, s * 0.40, 8), h.clay(FP.snout, false)); sn.rotation.z = -Math.PI / 2; sn.position.x = s * 0.52; f.add(sn);
  h.put(f, new THREE.Mesh(new THREE.SphereGeometry(s * 0.09, 8, 6), h.clay(FP.ink, false)), s * 0.72, 0, 0, false);
  [-1, 1].forEach(z => {
    h.put(f, new THREE.Mesh(new THREE.SphereGeometry(s * 0.065, 8, 6), h.clay(FP.ink, false)), s * 0.24, s * 0.14, z * s * 0.24, false);
    const ear = h.put(f, new THREE.Mesh(new THREE.SphereGeometry(s * 0.12, 8, 6), h.clay(FP.snout, false)), -s * 0.05, s * 0.30, z * s * 0.30, false);
    ear.scale.set(0.6, 1, 0.5);
  });
  return f;
}

export function buildHedgehogPackA(THREE, g, k, h) {
  const R = k.R, a = R * 0.56, b = R * 0.28, c = R * 0.13;
  const f = backFront(k, 1.16);
  const ctr = new THREE.Vector3(-R * 0.04, f.y, f.z - c);
  const body = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), h.clay(FP.quill, false)), ctr.x, ctr.y, ctr.z);
  body.scale.set(a, b, c);
  fib(150).forEach(([x, y, z], i) => {
    if (z > 0.1 || x > 0.62 || y < -0.45) return;
    const p = new THREE.Vector3(x * a, y * b, z * c).add(ctr);
    const n = new THREE.Vector3(x / a, y / b, z / c).normalize();
    n.x -= 0.55; n.y += 0.55; n.z *= 0.6;
    quill(THREE, h, g, p, n, R * 0.17, R * 0.05, i % 3 ? FP.quill : FP.acornDark, i % 2 ? FP.quillTip : null);
  });
  hogFace(THREE, h, g, R * 0.40, new THREE.Vector3(ctr.x + a * 0.92, ctr.y - b * 0.15, ctr.z - c * 0.15), new THREE.Vector3(1, 0.05, -0.25));
  strapsFrom(THREE, g, k, h, [new THREE.Vector3(-a * 0.6, ctr.y + b * 0.4, ctr.z + c), new THREE.Vector3(a * 0.5, ctr.y + b * 0.4, ctr.z + c)], FP.leather);
}

export function buildHedgehogPackB(THREE, g, k, h) {
  const R = k.R, rb = R * 0.28;
  const f = frontAt(k, -0.52, 1.02);
  const ctr = new THREE.Vector3(f.x, f.y, f.z - rb * 0.80);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(rb, 16, 12), h.clay(FP.quill, false)), ctr.x, ctr.y, ctr.z);
  fib(90).forEach(([x, y, z], i) => {
    if (z > 0.35 || y < -0.55 || (y < -0.25 && z < -0.2 && x > -0.3)) return;
    const n = new THREE.Vector3(x, y, z);
    quill(THREE, h, g, n.clone().multiplyScalar(rb * 0.92).add(ctr), n, R * 0.18, R * 0.05, i % 3 ? FP.quill : FP.acornDark, i % 2 ? FP.quillTip : null);
  });
  const fp = new THREE.Vector3(0.25, -0.60, -0.75).normalize().multiplyScalar(rb * 0.85).add(ctr);
  hogFace(THREE, h, g, R * 0.30, fp, new THREE.Vector3(0.35, -0.35, -1));
  const ap = new THREE.Vector3(0.35, 0.80, -0.45).normalize().multiplyScalar(rb * 1.25).add(ctr);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(R * 0.13, 12, 9), h.clay(FP.berry, false)), ap.x, ap.y, ap.z);
  h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(R * 0.012, R * 0.012, R * 0.07, 4), h.clay(FP.acornDark)), ap.x, ap.y + R * 0.13, ap.z);
  leaf(THREE, h, g, R * 0.16, new THREE.Vector3(ap.x + R * 0.06, ap.y + R * 0.14, ap.z), new THREE.Euler(0, 0, -1.0), FP.moss);
  const mats = { nut: h.clay(FP.nut, false), cap: h.clay(FP.cap) };
  acorn(THREE, h, g, R * 0.08, new THREE.Vector3(-0.55, 0.55, -0.55).normalize().multiplyScalar(rb * 1.22).add(ctr), new THREE.Euler(0.4, 0, 0.7), mats);
  strapsFrom(THREE, g, k, h, [new THREE.Vector3(ctr.x - rb * 0.3, ctr.y + rb * 0.5, ctr.z + rb * 0.6), new THREE.Vector3(ctr.x + rb * 0.8, ctr.y + rb * 0.2, ctr.z + rb * 0.6)], FP.leather);
}

export function buildHedgehogPackC(THREE, g, k, h) {
  const R = k.R, W = R * 0.80, H = R * 0.46, D = R * 0.16;
  const f = backFront(k, 1.18);
  const ctr = new THREE.Vector3(0, f.y, f.z - D / 2);
  h.put(g, new THREE.Mesh(new THREE.BoxGeometry(W, H, D), h.clay(FP.creamDark)), ctr.x, ctr.y, ctr.z);
  const backZ = ctr.z - D / 2;
  [[0.38, 9, FP.acornDark, 0.36], [0.12, 8, FP.quill, 0.30], [-0.12, 7, FP.acorn, 0.26]].forEach(([yy, n, col, len]) => {
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n - 0.5) * W * 1.02;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(R * 0.095, R * len, 4), h.clay(col));
      sp.position.set(x, ctr.y + yy * H + R * len * 0.25, backZ - R * 0.035);
      sp.rotation.set(-0.15, Math.PI / 4, 0); sp.scale.z = 0.45; sp.castShadow = true; g.add(sp);
    }
  });
  const face = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(R * 0.21, 12, 9), h.clay(FP.snout, false)), 0, ctr.y - H * 0.30, backZ - R * 0.02);
  face.scale.set(1.3, 0.85, 0.45);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(R * 0.045, 8, 6), h.clay(FP.ink, false)), 0, ctr.y - H * 0.34, backZ - R * 0.10, false);
  [-1, 1].forEach(s => h.put(g, new THREE.Mesh(new THREE.SphereGeometry(R * 0.028, 6, 5), h.clay(FP.ink, false)), s * R * 0.09, ctr.y - H * 0.22, backZ - R * 0.08, false));
  const strapTop = s => new THREE.Vector3(s * W * 0.32, ctr.y + H * 0.5, ctr.z + D * 0.3);
  strapsFrom(THREE, g, k, h, [strapTop(-1), strapTop(1)], FP.leather);
}

function pawPrint(THREE, g, s, mat, put, sc = 1) {
  const oval = (r, sx, sz, x, z) => { const t = put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 9, 6), mat), x, 0.006, z, false); t.scale.set(sx, 0.10, sz); return t; };
  oval(s * 0.46 * sc, 1.15, 0.95, 0, -s * 0.12 * sc);
  [[-0.50, 0.30], [-0.18, 0.52], [0.18, 0.52], [0.50, 0.30]].forEach(([x, z]) => oval(s * 0.17 * sc, 0.9, 1.15, x * s * sc, z * s * sc));
}

function filmAcorn(THREE, h, g, r, o, pos, rot) {
  return acorn(THREE, h, g, r, pos, rot, { nut: h.film(FP.nut, o), cap: h.film(FP.cap, o) });
}

export function buildAcornTrailA(THREE, g, s, o, id, h) {
  pawPrint(THREE, g, s, h.film(FP.acornDark, o * 0.85), h.put, 1.05);
  filmAcorn(THREE, h, g, s * 0.32, o, new THREE.Vector3(s * 0.95, s * 0.28, -s * 0.15), new THREE.Euler(0, 0.4, Math.PI / 2 - 0.15));
  const lf = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.22, 8, 5), h.film(FP.moss, o)), s * 0.70, 0.006, s * 0.30, false);
  lf.scale.set(0.45, 0.08, 1); lf.rotation.y = 0.6;
}

export function buildAcornTrailB(THREE, g, s, o, id, h) {
  const nut = new THREE.Shape();
  nut.moveTo(-0.55, 0.15); nut.bezierCurveTo(-0.6, -0.5, -0.2, -0.95, 0, -1.1); nut.bezierCurveTo(0.2, -0.95, 0.6, -0.5, 0.55, 0.15); nut.lineTo(-0.55, 0.15);
  const cap = new THREE.Shape();
  cap.moveTo(-0.72, 0.10); cap.bezierCurveTo(-0.72, 0.62, 0.72, 0.62, 0.72, 0.10); cap.lineTo(-0.72, 0.10);
  const flat = (shape, mat, y, sc) => { const geo = new THREE.ShapeGeometry(shape, 10); geo.scale(sc, sc, 1); const m = h.put(g, new THREE.Mesh(geo, mat), 0, y, 0, false); m.rotation.set(-Math.PI / 2, 0, Math.PI); return m; };
  const sc = s * 0.95;
  flat(nut, h.film(FP.nut, o), 0.006, sc);
  flat(cap, h.film(FP.cap, o), 0.008, sc);
  const hatch = h.film(FP.creamDark, o * 0.8);
  [-0.4, 0, 0.4].forEach(x => h.put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.05, s * 0.01, s * 0.34), hatch), x * sc, 0.010, s * 0.30, false).rotation.y = 0.5);
  h.put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.08, s * 0.01, s * 0.26), h.film(FP.cap, o)), 0, 0.009, s * 0.66, false);
  const hl = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.13, 8, 5), h.film(FP.cream, o * 0.6)), s * 0.20, 0.010, -s * 0.35, false);
  hl.scale.set(0.6, 0.08, 1.2);
  const lf = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.30, 8, 5), h.film(FP.moss, o)), s * 0.72, 0.007, -s * 0.30, false);
  lf.scale.set(0.42, 0.08, 1); lf.rotation.y = -0.7;
}

export function buildAcornTrailC(THREE, g, s, o, id, h) {
  pawPrint(THREE, g, s, h.film(FP.ochreDark, o * 0.5), h.put, 0.7);
  filmAcorn(THREE, h, g, s * 0.36, o, new THREE.Vector3(-s * 0.75, s * 0.33, s * 1.25), new THREE.Euler(0.5, 0.9, Math.PI / 2));
  [[-0.70, 0.72, 0.12], [-0.62, 0.30, 0.11], [-0.48, -0.10, 0.10], [-0.30, -0.48, 0.085], [-0.10, -0.82, 0.07]].forEach(([x, z, r], i) => {
    const d = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * r * 1.4, 8, 5), h.film(FP.cap, o * (0.95 - i * 0.15))), x * s - s * 0.10, 0.006, z * s, false);
    d.scale.set(1, 0.10, 1.6);
  });
}

export const VARIANTS = {
  fp_squirrel_band: {
    slot: 'head', name: '다람쥐 귀 머리띠',
    A: { name: '털끝 다람쥐 귀', note: '짙은 갈색 띠 + 큰 적갈색 귀 · 크림 안쪽 · 털끝 술', build: buildSquirrelBandA },
    B: { name: '도토리 귀띠', note: '이끼색 띠 + 작은 황토 귀 · 옆에 도토리 둘·참나무잎', build: buildSquirrelBandB },
    C: { name: '꼬리 말린 귀띠', note: '황토 띠 + 귀 + 한쪽에 말려 올라간 다람쥐 꼬리', build: buildSquirrelBandC },
  },
  fp_owl_kerchief: {
    slot: 'neck', name: '부엉이 손수건',
    A: { name: '부엉이 얼굴 반다나', note: '황토 삼각 손수건 + 크림 테 + 가운데 부엉이 얼굴', build: buildOwlKerchiefA },
    B: { name: '부엉이 매듭 스카프', note: '이끼색 스카프 두 자락 + 가슴의 부엉이 매듭고리', build: buildOwlKerchiefB },
    C: { name: '깃털 칼라', note: '황토·크림 깃털 두 겹 칼라 + 앞쪽 부엉이 눈', build: buildOwlKerchiefC },
  },
  fp_hedgehog_pack: {
    slot: 'back', cols: 'back2', name: '고슴도치 배낭',
    A: { name: '엎드린 고슴도치', note: '등 위쪽 가로 몸통 + 뒤로 누운 가시 · 얼굴은 오른쪽으로', build: buildHedgehogPackA },
    B: { name: '동그르르 고슴도치', note: '왼어깨에 말린 공 + 가시에 꽂힌 열매·도토리', build: buildHedgehogPackB },
    C: { name: '가시 덮개 가방', note: '크림 상자 가방 + 세 줄 가시 덮개 + 아래 얼굴', build: buildHedgehogPackC },
  },
  fp_acorn_trail: {
    slot: 'trail', name: '도토리 굴리는 발자국',
    A: { name: '발자국 + 도토리', note: '갈색 발바닥 + 옆에 누운 도토리·잎', build: buildAcornTrailA },
    B: { name: '도토리 도장', note: '자국 자체가 도토리 모양 + 깍정이 무늬 + 잎', build: buildAcornTrailB },
    C: { name: '굴러간 도토리', note: '옅은 발자국 + 굴러가는 도토리 + 점선 자취', build: buildAcornTrailC },
  },
};
