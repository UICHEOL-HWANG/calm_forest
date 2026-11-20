import { flatten, tubeAlong, surfLocal, backFront, withAnchors } from './art-winter-pick.js';

export const FP = Object.freeze({
  acornDark: 0x5e3b20, nut: 0xb07a40, cap: 0x6b4a2c,
  moss: 0x6a8a4a, mossDark: 0x4e6b38,
  cream: 0xe2d3b6, creamDark: 0xc4b08e,
  ochre: 0xc98a3c, ochreDark: 0x9c6a2a, russet: 0xb5652f,
  berry: 0xb8434f, ink: 0x2b221c, beak: 0xd9822b,
  quill: 0x6e4f38, quillTip: 0xd9c7a4, snout: 0xd8b48a, leather: 0x7d4f33,
});

const TAU = Math.PI * 2;

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

export function buildSquirrelBand(THREE, g, k, h) {
  const HR = k.HR, band = new THREE.Group();
  band.rotation.x = 0.45; g.add(band);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(HR * 1.08, HR * 0.065, 6, 30, Math.PI), h.clay(FP.ochreDark));
  arc.castShadow = true; band.add(arc);
  [-1, 1].forEach(s => squirrelEar(THREE, band, k, h, s * 0.34, HR * 0.50, { outer: FP.russet, inner: FP.cream, tuft: FP.acornDark }));
  const V = (x, y, z) => new THREE.Vector3(x * HR, y * HR, z * HR);
  const curve = new THREE.CatmullRomCurve3([arcPt(THREE, k, -1.05), V(1.10, 0.62, -0.02), V(1.28, 0.98, -0.06), V(1.20, 1.34, -0.06), V(0.96, 1.42, -0.04), V(0.84, 1.24, -0.02)]);
  const N = 10, pts = curve.getSpacedPoints(N);
  const rad = i => HR * (0.07 + 0.15 * Math.sin(Math.PI * Math.min(1, (i / N) * 1.25)));
  coneChain(THREE, band, h, pts, rad, i => (i >= N - 3 ? FP.cream : i % 3 === 2 ? FP.ochre : FP.russet));
  const end = pts[N];
  h.put(band, new THREE.Mesh(new THREE.SphereGeometry(rad(N) * 1.25, 10, 8), h.clay(FP.cream, false)), end.x, end.y, end.z);
  flatten(THREE, g);
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

function owlFace(THREE, h, size, c) {
  const g = new THREE.Group();
  const disc = (r, col, z) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, size * 0.06, 16), h.clay(col));
    m.rotation.x = Math.PI / 2; m.position.z = z; g.add(m); return m;
  };
  [-1, 1].forEach(s => { disc(size * 0.50, c.face, 0).position.x = s * size * 0.30; });
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

export function buildOwlKerchief(THREE, g, k0, h) {
  const k = withAnchors(k0), r = k.neckR;
  for (let i = 0; i < 12; i++) {
    const t = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.30, 7, 4, TAU / 12 + 0.02), h.clay(i % 2 ? FP.mossDark : FP.moss, false)), 0, r * 0.04, 0);
    t.rotation.set(Math.PI / 2, 0, (i / 12) * TAU);
  }
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
  const p = pushOut(THREE, k, new THREE.Vector3(0, -r * 0.42, r), 1.24), n = bodyNormal(THREE, k, p);
  owl.position.copy(p);
  owl.lookAt(p.clone().add(new THREE.Vector3(n.x, n.y * 0.4, n.z).normalize()));
  g.add(owl);
  flatten(THREE, g);
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
}

export function buildHedgehogPack(THREE, g, k0, h) {
  const k = withAnchors(k0), R = k.R, a = R * 0.56, b = R * 0.28, c = R * 0.13;
  const f = backFront(k, 1.16);
  const ctr = new THREE.Vector3(-R * 0.04, f.y, f.z - c);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), h.clay(FP.quill, false)), ctr.x, ctr.y, ctr.z).scale.set(a, b, c);
  Array.from({ length: 150 }, (_, i) => {
    const y = 1 - 2 * (i + 0.5) / 150, rr = Math.sqrt(1 - y * y), t = i * 2.39996;
    return [Math.cos(t) * rr, y, Math.sin(t) * rr];
  }).forEach(([x, y, z], i) => {
    if (z > 0.1 || x > 0.62 || y < -0.45) return;
    const p = new THREE.Vector3(x * a, y * b, z * c).add(ctr);
    const n = new THREE.Vector3(x / a, y / b, z / c).normalize();
    n.x -= 0.55; n.y += 0.55; n.z *= 0.6;
    quill(THREE, h, g, p, n, R * 0.17, R * 0.05, i % 3 ? FP.quill : FP.acornDark, i % 2 ? FP.quillTip : null);
  });
  hogFace(THREE, h, g, R * 0.40, new THREE.Vector3(ctr.x + a * 0.92, ctr.y - b * 0.15, ctr.z - c * 0.15), new THREE.Vector3(1, 0.05, -0.25));
  [new THREE.Vector3(-a * 0.6, ctr.y + b * 0.4, ctr.z + c), new THREE.Vector3(a * 0.5, ctr.y + b * 0.4, ctr.z + c)].forEach((p0, i) => {
    const s = i ? 1 : -1;
    const pts = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, pts, R * 0.045, h.clay(FP.leather), 28, 6));
  });
  flatten(THREE, g);
}

export function buildAcornTrail(THREE, g, s, o, h) {
  const nut = new THREE.Shape();
  nut.moveTo(-0.55, 0.15); nut.bezierCurveTo(-0.6, -0.5, -0.2, -0.95, 0, -1.1); nut.bezierCurveTo(0.2, -0.95, 0.6, -0.5, 0.55, 0.15); nut.lineTo(-0.55, 0.15);
  const cap = new THREE.Shape();
  cap.moveTo(-0.72, 0.10); cap.bezierCurveTo(-0.72, 0.62, 0.72, 0.62, 0.72, 0.10); cap.lineTo(-0.72, 0.10);
  const sc = s * 0.95;
  const flat = (shape, mat, y) => { const geo = new THREE.ShapeGeometry(shape, 10); geo.scale(sc, sc, 1); h.put(g, new THREE.Mesh(geo, mat), 0, y, 0, false).rotation.set(-Math.PI / 2, 0, Math.PI); };
  flat(nut, h.film(FP.nut, o), 0.006);
  flat(cap, h.film(FP.cap, o), 0.008);
  const hatch = h.film(FP.creamDark, o * 0.8);
  [-0.4, 0, 0.4].forEach(x => { h.put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.05, s * 0.01, s * 0.34), hatch), x * sc, 0.010, s * 0.30, false).rotation.y = 0.5; });
  h.put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.08, s * 0.01, s * 0.26), h.film(FP.cap, o)), 0, 0.009, s * 0.66, false);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.13, 8, 5), h.film(FP.cream, o * 0.6)), s * 0.20, 0.010, -s * 0.35, false).scale.set(0.6, 0.08, 1.2);
  const lf = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.30, 8, 5), h.film(FP.moss, o)), s * 0.72, 0.007, -s * 0.30, false);
  lf.scale.set(0.42, 0.08, 1); lf.rotation.y = -0.7;
}
