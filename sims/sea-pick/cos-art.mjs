import { onSurf, domeTheta, ringR } from '../../js/cosmetics/anchors.js';

export const SP = Object.freeze({
  navy: 0x2f4a6b, navyDark: 0x22364f,
  teal: 0x3f8f8c, tealDark: 0x2e6e6c,
  sand: 0xd9c39a, sandDark: 0xb89f72,
  coral: 0xd0574a, coralDark: 0xa8423a,
  cream: 0xe0d6c0, foam: 0xc8d8d4,
  rope: 0xc4a676, ropeDark: 0x9c7f52,
  brass: 0xc79a4a, brassDark: 0x9a7434,
  lamp: 0xe8c25a, ink: 0x2b221c,
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

function fish(THREE, h, s, body, fin) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(s * 0.5, 12, 8), h.clay(body, false));
  b.scale.set(1, 0.62, 0.35); g.add(b);
  const t = new THREE.Mesh(new THREE.ConeGeometry(s * 0.30, s * 0.38, 3), h.clay(fin));
  t.rotation.z = Math.PI / 2; t.position.x = -s * 0.62; t.scale.z = 0.4; g.add(t);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.07, 6, 5), h.clay(SP.ink, false)), s * 0.26, s * 0.07, s * 0.16, false);
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
  return q;
}

function knotBall(THREE, h, g, pos, r, color) {
  const kn = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), h.clay(color, false)), pos.x, pos.y, pos.z);
  kn.scale.set(1.15, 0.9, 0.85);
  return kn;
}

function onDome(THREE, dome, rad, dir, obj, lift = 1.0) {
  const d = new THREE.Vector3(...dir).normalize();
  obj.position.copy(d).multiplyScalar(rad * lift);
  obj.lookAt(d.clone().multiplyScalar(rad * 3));
  dome.add(obj);
  return obj;
}

function fib(n) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    return [Math.cos(a) * rr, y, Math.sin(a) * rr];
  });
}

export function buildPirateScarfA(THREE, g, k, h) {
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
  knotBall(THREE, h, dome, kp, HR * 0.17, SP.navyDark);
  [[-1, 0.8], [1, 1.0]].forEach(([s, l]) => tailFlap(THREE, h, dome, kp, new THREE.Vector3(s * 0.45, -1, -0.55), HR * 0.62 * l, HR * 0.20, s < 0 ? SP.navy : SP.navyDark));
}

export function buildPirateScarfB(THREE, g, k, h) {
  const HR = k.HR, hh = 0.42, R0 = ringR(HR, hh) * 1.10;
  const band = new THREE.Group(); band.position.y = HR * hh; band.rotation.x = -0.38; g.add(band);
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(R0, HR * 0.085, 7, 4, TAU / segs + 0.02), h.clay(i % 2 ? SP.coral : SP.coralDark, false));
    t.rotation.set(Math.PI / 2, 0, (i / segs) * TAU); t.scale.z = 1.5; t.castShadow = true; band.add(t);
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    h.put(band, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.035, 6, 5), h.clay(SP.cream, false)), Math.cos(a) * (R0 + HR * 0.105), (i % 2 ? 1 : -1) * HR * 0.06, Math.sin(a) * (R0 + HR * 0.105), false);
  }
  const ka = -0.35, kp = new THREE.Vector3(Math.cos(ka) * (R0 + HR * 0.08), 0, -Math.sin(ka) * (R0 + HR * 0.08));
  knotBall(THREE, h, band, kp, HR * 0.17, SP.coralDark);
  [[0.9, -0.7, 0.2, 0.70], [1, -0.25, -0.45, 0.58]].forEach(([x, y, z, l], i) => tailFlap(THREE, h, band, kp, new THREE.Vector3(x, y, z), HR * l, HR * 0.22, i ? SP.coral : SP.coralDark));
  const f = fish(THREE, h, HR * 0.34, SP.teal, SP.tealDark);
  f.position.set(0, HR * 0.02, R0 + HR * 0.12);
  band.add(f);
}

export function buildPirateScarfC(THREE, g, k, h) {
  const HR = k.HR, rk = 1.07, rad = HR * rk, th = domeTheta(HR, rk);
  const dome = new THREE.Group(); dome.rotation.x = -0.18; g.add(dome);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * th, t1 = ((i + 1) / n) * th;
    const s = new THREE.Mesh(new THREE.SphereGeometry(rad, 28, 3, 0, TAU, t0, t1 - t0 + 0.01), h.clay(i % 2 ? SP.cream : SP.teal, false));
    s.castShadow = true; dome.add(s);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(rad * rad - (HR * 0.5) ** 2), HR * 0.055, 6, 32), h.clay(SP.tealDark));
  rim.rotation.x = Math.PI / 2; rim.position.y = HR * 0.5; dome.add(rim);
  const kp = new THREE.Vector3(0, rad * 1.02, -HR * 0.05);
  knotBall(THREE, h, dome, kp, HR * 0.16, SP.tealDark);
  [-1, 1].forEach(s => {
    const q = tailFlap(THREE, h, dome, kp, new THREE.Vector3(s * 0.75, 1, 0.05), HR * 0.50, HR * 0.20, s < 0 ? SP.teal : SP.tealDark);
    q.rotateY(s * 0.3);
  });
  const st = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const arm = new THREE.Mesh(new THREE.ConeGeometry(HR * 0.06, HR * 0.17, 4), h.clay(SP.coral, false));
    arm.position.set(Math.sin(a) * HR * 0.08, Math.cos(a) * HR * 0.08, 0); arm.rotation.z = -a; arm.scale.z = 0.4; st.add(arm);
  }
  onDome(THREE, dome, rad, [0.42, 0.58, 0.70], st, 1.02);
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

function stickOn(THREE, k, g, obj, P, out) {
  const p = pushOut(THREE, k, P, out), n = bodyNormal(THREE, k, p);
  obj.position.copy(p);
  obj.lookAt(p.clone().add(new THREE.Vector3(n.x, n.y * 0.4, n.z).normalize()));
  g.add(obj);
  return obj;
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

function cord(THREE, k, a, b, sag, out = 1.10) {
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / 6, p = a.clone().lerp(b, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    return pushOut(THREE, k, p, out);
  });
}

export function buildAnchorNecklaceA(THREE, g, k, h) {
  const r = k.neckR;
  neckRope(THREE, g, k, h, [SP.rope, SP.ropeDark], 0.16);
  const anc = anchorShape(THREE, h, r * 0.80, { body: SP.navy, ring: SP.rope, stock: SP.ropeDark });
  const w = new THREE.Group(); w.add(anc); anc.position.y = -r * 0.36;
  stickOn(THREE, k, g, w, new THREE.Vector3(0, -r * 0.10, r), 1.14);
}

export function buildAnchorNecklaceB(THREE, g, k, h) {
  const r = k.neckR, n = 22;
  const cols = [SP.navy, SP.cream, SP.navy, SP.coral];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const p = pushOut(THREE, k, new THREE.Vector3(Math.sin(a) * r, -r * 0.05 - Math.max(0, Math.cos(a)) * r * 0.18, Math.cos(a) * r), 1.08);
    const big = Math.abs(Math.sin(a / 2)) < 0.25;
    h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r * (big ? 0.13 : 0.10), 10, 8), h.clay(cols[i % 4], false)), p.x, p.y, p.z);
  }
  const anc = anchorShape(THREE, h, r * 0.56, { body: SP.brass, stock: SP.brassDark });
  const w = new THREE.Group(); w.add(anc); anc.position.y = -r * 0.30;
  h.put(w, new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 10, 8), h.clay(SP.coral, false)), r * 0.24, -r * 0.08, 0, false);
  stickOn(THREE, k, g, w, new THREE.Vector3(0, -r * 0.24, r), 1.14);
}

export function buildAnchorNecklaceC(THREE, g, k, h) {
  const r = k.neckR;
  neckRope(THREE, g, k, h, [SP.coral, SP.cream], 0.12, 16);
  const kn = new THREE.Vector3(-r * 0.45, -r * 0.08, r * 0.9);
  const kp = pushOut(THREE, k, kn, 1.12);
  h.put(g, new THREE.Mesh(new THREE.TorusKnotGeometry(r * 0.09, r * 0.04, 32, 6, 2, 3), h.clay(SP.coralDark, false)), kp.x, kp.y, kp.z);
  [[-0.65, -0.55], [-0.30, -0.62]].forEach(([x, y], i) => {
    g.add(tubeAlong(THREE, cord(THREE, k, kn, new THREE.Vector3(x * r, y * r, r), 0, 1.12), r * 0.035, h.clay(i ? SP.coral : SP.cream), 12, 5));
  });
  g.add(tubeAlong(THREE, cord(THREE, k, kn, new THREE.Vector3(r * 0.12, -r * 0.42, r), r * 0.05, 1.12), r * 0.03, h.clay(SP.coral), 12, 5));
  const anc = anchorShape(THREE, h, r * 0.70, { body: SP.teal, stock: SP.tealDark });
  [-0.02, -0.10].forEach(y => {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(r * 0.06, r * 0.025, 5, 10), h.clay(SP.rope, false));
    coil.rotation.x = Math.PI / 2; coil.position.y = y * r; anc.add(coil);
  });
  const w = new THREE.Group(); w.add(anc); anc.position.y = -r * 0.30; anc.rotation.z = 0.22;
  stickOn(THREE, k, g, w, new THREE.Vector3(r * 0.12, -r * 0.42, r), 1.16);
}

function frontAt(k, xR, yR, pad = 0.03) {
  const bs = k.bs, fb = 1 - (xR / bs[0]) ** 2 - (yR / bs[1]) ** 2;
  const HYr = (k.HY - k.bodyY) / k.R, HRr = k.HR / k.R, fh = HRr * HRr - xR * xR - (yR - HYr) ** 2;
  const z = Math.min(fb > 0 ? -bs[2] * Math.sqrt(fb) : 0, fh > 0 ? -Math.sqrt(fh) : 0);
  return { x: xR * k.R, y: k.bodyY + yR * k.R - k.back.y, z: (z - pad) * k.R - k.back.z };
}

function frontSpan(k, xs, ys, pad) {
  let z = 0;
  xs.forEach(x => ys.forEach(y => { z = Math.min(z, frontAt(k, x, y, pad).z); }));
  return z;
}

function strapsFrom(THREE, g, k, h, starts, color) {
  starts.forEach((p0, i) => {
    const s = i ? 1 : -1;
    const pts = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, pts, k.R * 0.045, h.clay(color), 28, 6));
  });
}

function stripedTower(THREE, h, g, base, height, rBot, rTop, bands, colors) {
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands, t1 = (i + 1) / bands;
    const r0 = rBot + (rTop - rBot) * t0, r1 = rBot + (rTop - rBot) * t1;
    h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, height / bands, 16), h.clay(colors[i % colors.length], false)), base.x, base.y + height * (t0 + t1) / 2, base.z);
  }
}

function lanternTop(THREE, h, g, p, r, s = 1) {
  h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.35, r * 0.18, 16), h.clay(SP.navy, false)), p.x, p.y, p.z);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.04, r * 0.32, 4), h.clay(SP.navyDark)), p.x + Math.cos(a) * r * 1.28, p.y + r * 0.24, p.z + Math.sin(a) * r * 1.28, false);
  }
  h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.80, r * 0.80, r * 0.70 * s, 12), h.clay(SP.lamp, false)), p.x, p.y + r * 0.44 * s, p.z);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    h.put(g, new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.72 * s, r * 0.12), h.clay(SP.navyDark)), p.x + Math.cos(a) * r * 0.80, p.y + r * 0.44 * s, p.z + Math.sin(a) * r * 0.80, false);
  }
  h.put(g, new THREE.Mesh(new THREE.ConeGeometry(r * 1.05, r * 0.70, 12), h.clay(SP.coralDark, false)), p.x, p.y + r * (0.79 * s + 0.35), p.z);
  h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), h.clay(SP.navy, false)), p.x, p.y + r * (0.79 * s + 0.76), p.z);
}

export function buildLighthousePackA(THREE, g, k, h) {
  const R = k.R, rb = R * 0.22, rt = R * 0.155, H = R * 0.66, x = -0.50, y0 = 1.02;
  const z = frontSpan(k, [x - 0.2, x, x + 0.2], [y0, y0 + 0.3, y0 + 0.56], 0.04);
  const base = new THREE.Vector3(x * R, k.bodyY + y0 * R - k.back.y, z - rb);
  h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(rb * 1.12, rb * 1.18, R * 0.06, 16), h.clay(SP.navyDark, false)), base.x, base.y, base.z);
  stripedTower(THREE, h, g, base, H, rb, rt, 4, [SP.coral, SP.cream]);
  h.put(g, new THREE.Mesh(new THREE.BoxGeometry(rb * 0.55, R * 0.12, R * 0.02), h.clay(SP.navy)), base.x, base.y + R * 0.08, base.z - rb * 1.0);
  h.put(g, new THREE.Mesh(new THREE.BoxGeometry(rt * 0.45, R * 0.08, R * 0.02), h.clay(SP.navy)), base.x, base.y + H * 0.62, base.z - (rb + rt) * 0.5);
  lanternTop(THREE, h, g, new THREE.Vector3(base.x, base.y + H, base.z), rt);
  strapsFrom(THREE, g, k, h, [new THREE.Vector3(base.x, base.y + H * 0.85, base.z + rt), new THREE.Vector3(R * 0.25, base.y + H * 0.55, z)], SP.navy);
}

function plank(THREE, h, g, w, hgt, d, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), h.clay(c, false));
  m.castShadow = true; g.add(m); return m;
}

export function buildLighthousePackB(THREE, g, k, h) {
  const R = k.R, D = R * 0.14, y0 = 1.00, H = R * 0.62;
  const z = frontSpan(k, [-0.25, 0, 0.25], [y0, y0 + 0.3, y0 + 0.6], 0.04);
  const ctr = new THREE.Vector3(0, k.bodyY + y0 * R - k.back.y, z - D / 2);
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const t = (i + 0.5) / bands, w = R * (0.56 - 0.20 * t);
    plank(THREE, h, g, w, H / bands, D, i % 2 ? SP.cream : SP.coral).position.set(ctr.x, ctr.y + H * t, ctr.z);
  }
  const back = ctr.z - D / 2;
  plank(THREE, h, g, R * 0.12, R * 0.16, R * 0.03, SP.navy).position.set(0, ctr.y + H * 0.55, back);
  plank(THREE, h, g, R * 0.16, R * 0.15, R * 0.03, SP.navy).position.set(0, ctr.y + R * 0.08, back);
  plank(THREE, h, g, R * 0.48, R * 0.06, D * 1.2, SP.navy).position.set(0, ctr.y + H + R * 0.03, ctr.z);
  plank(THREE, h, g, R * 0.26, R * 0.18, D * 0.9, SP.lamp).position.set(0, ctr.y + H + R * 0.15, ctr.z);
  [-1, 1].forEach(s => plank(THREE, h, g, R * 0.04, R * 0.18, D, SP.navyDark).position.set(s * R * 0.13, ctr.y + H + R * 0.15, ctr.z));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, R * 0.22, R * 0.16, 4, 1), h.clay(SP.coralDark, false));
  roof.rotation.y = Math.PI / 4; roof.scale.z = 0.5; roof.position.set(0, ctr.y + H + R * 0.32, ctr.z); roof.castShadow = true; g.add(roof);
  [-1, 1].forEach(s => {
    const ray = plank(THREE, h, g, R * 0.20, R * 0.035, R * 0.03, SP.lamp);
    ray.position.set(s * R * 0.27, ctr.y + H + R * 0.21, ctr.z); ray.rotation.z = s * 0.18;
  });
  [-0.18, 0, 0.18].forEach(x => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(R * 0.07, R * 0.03, 5, 10, Math.PI), h.clay(SP.teal, false));
    w.position.set(x * R, ctr.y - R * 0.02, back - R * 0.01); g.add(w);
  });
  strapsFrom(THREE, g, k, h, [new THREE.Vector3(-R * 0.20, ctr.y + H * 0.8, ctr.z + D / 2), new THREE.Vector3(R * 0.20, ctr.y + H * 0.8, ctr.z + D / 2)], SP.navy);
}

export function buildLighthousePackC(THREE, g, k, h) {
  const R = k.R, rr = R * 0.34, D = 0.5, y0 = 1.42;
  const z = frontSpan(k, [-0.3, 0, 0.3], [y0, y0 + 0.25, y0 + 0.5], 0.04);
  const pack = new THREE.Group(); pack.position.set(0, k.bodyY + y0 * R - k.back.y, z - rr * 1.35 * D); pack.scale.z = D; g.add(pack);
  stripedTower(THREE, h, pack, new THREE.Vector3(0, 0, 0), R * 0.24, rr, rr * 0.92, 3, [SP.coral, SP.cream]);
  lanternTop(THREE, h, pack, new THREE.Vector3(0, R * 0.24, 0), rr * 0.72, 0.85);
  const ctr = pack.position;
  const door = plank(THREE, h, g, R * 0.14, R * 0.13, R * 0.03, SP.navy); door.position.set(0, ctr.y + R * 0.085, ctr.z - rr * D - R * 0.005);
  strapsFrom(THREE, g, k, h, [new THREE.Vector3(-R * 0.22, ctr.y + R * 0.30, ctr.z + R * 0.05), new THREE.Vector3(R * 0.22, ctr.y + R * 0.30, ctr.z + R * 0.05)], SP.navy);
}

function pawPrint(THREE, g, s, mat, put, sc = 1) {
  const oval = (r, sx, sz, x, z) => { const t = put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 9, 6), mat), x, 0.006, z, false); t.scale.set(sx, 0.10, sz); return t; };
  oval(s * 0.46 * sc, 1.15, 0.95, 0, -s * 0.12 * sc);
  [[-0.50, 0.30], [-0.18, 0.52], [0.18, 0.52], [0.50, 0.30]].forEach(([x, z]) => oval(s * 0.17 * sc, 0.9, 1.15, x * s * sc, z * s * sc));
}

function sineStrip(THREE, s, amp, len, bumps, w, mat) {
  const pts = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return new THREE.Vector3((t - 0.5) * len * s, 0, Math.sin(t * bumps * TAU) * amp * s);
  });
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, w * s, 5, false), mat);
  m.scale.y = 0.15;
  return m;
}

function foamDots(THREE, g, s, o, h, list) {
  list.forEach(([x, z, r]) => {
    const b = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(s * r, 8, 5), h.film(SP.foam, o * 0.85)), x * s, 0.008, z * s, false);
    b.scale.y = 0.3;
  });
}

export function buildWaveTrailA(THREE, g, s, o, id, h) {
  pawPrint(THREE, g, s, h.film(SP.teal, o * 0.85), h.put, 1.0);
  const crest = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(s * 0.62, s * 0.11, 4, 16, Math.PI * 0.9), h.film(SP.foam, o * 0.9)), 0, 0.008, s * 0.20, false);
  crest.rotation.set(-Math.PI / 2, 0, Math.PI * 0.05); crest.scale.z = 0.25;
  foamDots(THREE, g, s, o, h, [[-0.72, 0.85, 0.10], [0.0, 1.05, 0.12], [0.70, 0.88, 0.09], [0.38, 1.18, 0.07]]);
}

export function buildWaveTrailB(THREE, g, s, o, id, h) {
  const sh = new THREE.Shape();
  sh.moveTo(-0.75, -0.55);
  sh.quadraticCurveTo(0, -0.85, 0.75, -0.55);
  sh.lineTo(0.75, 0.05);
  [[0.50, 0.55, 0.25], [0.0, 0.55, -0.25], [-0.50, 0.55, -0.75]].forEach(([cx, cy, ex]) => sh.quadraticCurveTo(cx, cy, ex, 0.05));
  sh.lineTo(-0.75, -0.55);
  const geo = new THREE.ShapeGeometry(sh, 12); geo.scale(s, s, 1);
  const m = h.put(g, new THREE.Mesh(geo, h.film(SP.teal, o)), 0, 0.006, 0, false);
  m.rotation.set(-Math.PI / 2, 0, Math.PI);
  const pts = Array.from({ length: 31 }, (_, i) => {
    const t = i / 30, u = (t * 3) % 1;
    return new THREE.Vector3((0.75 - t * 1.5) * -s, 0.009, (0.07 + 0.25 * Math.sin(Math.PI * u)) * s);
  });
  const line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, s * 0.07, 4, false), h.film(SP.foam, o * 0.9));
  line.scale.y = 0.2; g.add(line);
  h.put(g, sineStrip(THREE, s, 0.06, 1.2, 1.5, 0.05, h.film(SP.tealDark, o * 0.8)), 0, 0.009, -s * 0.25, false);
}

export function buildWaveTrailC(THREE, g, s, o, id, h) {
  pawPrint(THREE, g, s, h.film(SP.sandDark, o * 0.75), h.put, 0.85);
  h.put(g, sineStrip(THREE, s, 0.10, 2.2, 2, 0.09, h.film(SP.teal, o * 0.85)), s * 0.05, 0.007, -s * 0.78, false);
  h.put(g, sineStrip(THREE, s, 0.08, 1.7, 1.5, 0.07, h.film(SP.foam, o * 0.85)), -s * 0.10, 0.008, -s * 1.08, false);
  foamDots(THREE, g, s, o, h, [[0.85, -0.55, 0.08], [-0.85, -0.62, 0.07], [0.55, -1.30, 0.06]]);
}

export const VARIANTS = {
  sp_pirate_scarf: {
    slot: 'head', name: '해적 두건',
    A: { name: '물방울 무늬 두건', note: '남색 두건이 머리를 덮고 · 크림 물방울 무늬 + 이마 닻 · 뒤통수 매듭 꼬리 둘', build: buildPirateScarfA },
    B: { name: '말아 묶은 이마 두건', note: '산호색 말린 띠 + 오른쪽 큰 매듭 꼬리 · 이마에 청록 물고기', build: buildPirateScarfB },
    C: { name: '줄무늬 정수리 매듭', note: '청록·크림 가로 줄무늬 두건 · 정수리 매듭 꼬리가 위로 · 옆 산호 불가사리', build: buildPirateScarfC },
  },
  sp_anchor_necklace: {
    slot: 'neck', name: '닻 목걸이',
    A: { name: '밧줄 + 큰 닻', note: '꼰 밧줄 목걸이 + 가운데 남색 큰 닻(밧줄색 고리·가로대)', build: buildAnchorNecklaceA },
    B: { name: '구슬 + 놋쇠 닻', note: '남색·크림·산호 구슬줄 + 작은 놋쇠 닻과 산호 구슬', build: buildAnchorNecklaceB },
    C: { name: '매듭 끈 + 감긴 닻', note: '산호·크림 꼰 끈 · 왼쪽 매듭과 끈 꼬리 · 밧줄 감긴 청록 닻이 비스듬히', build: buildAnchorNecklaceC },
  },
  sp_lighthouse_pack: {
    slot: 'back', cols: 'back2', name: '등대 배낭',
    A: { name: '어깨 위 등대', note: '한쪽 어깨에 선 둥근 등대 · 산호·크림 줄 + 노란 등불 방·난간 · 꼬리 피해 옆으로', build: buildLighthousePackA },
    B: { name: '납작 등대 가방', note: '등 가운데 납작한 등대 모양 판 가방 · 등불 빛살 · 아래 파도 무늬', build: buildLighthousePackB },
    C: { name: '등불 방 가방', note: '등대 꼭대기만 떼 온 넓적한 가방 · 줄무늬 몸통 + 노란 등불 방·난간 + 큰 빨간 지붕', build: buildLighthousePackC },
  },
  sp_wave_trail: {
    slot: 'trail', name: '파도 발자국',
    A: { name: '발자국 + 거품 물마루', note: '청록 발자국 앞에 크림 거품 둥근 물결 + 거품 알갱이', build: buildWaveTrailA },
    B: { name: '파도 도장', note: '자국 자체가 세 굽이 파도 모양 + 거품 테두리', build: buildWaveTrailB },
    C: { name: '밀려오는 물결', note: '모래색 발자국 뒤로 청록·거품 물결 두 줄', build: buildWaveTrailC },
  },
};
