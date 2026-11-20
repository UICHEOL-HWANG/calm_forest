import { DOME_BOT, onSurf, neckAnchor, backAnchor } from './anchors.js';

export const WP = Object.freeze({
  cream: 0xe2d3b6, berry: 0xb8434f, berryDark: 0x8e3240,
  green: 0x4f7f55, greenDark: 0x3b6243,
  mustard: 0xd6a640, mustardDark: 0xae8330,
  bark: 0x7a5534, endGrain: 0xd4b384, ring: 0xa7835a,
  wicker: 0xc49a5c, wickerDark: 0x98713f, leather: 0x7d4f33, pine: 0x4a7a4e,
});

const headR = (HR, y) => Math.sqrt(Math.max(0, HR * HR - y * y));

const withAnchors = k => ({ ...k, neck: neckAnchor(k.HR, k.HY), back: backAnchor(k.bs, k.R, k.bodyY) });

function flatten(THREE, g) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert();
  const nested = [];
  g.traverse(o => { if (o.isMesh && o.parent !== g) nested.push(o); });
  for (const m of nested) {
    m.geometry = m.geometry.clone().applyMatrix4(m.matrixWorld.clone().premultiply(inv));
    m.position.set(0, 0, 0); m.quaternion.identity(); m.scale.set(1, 1, 1);
    g.add(m);
  }
  for (const c of [...g.children]) if (!c.isMesh) g.remove(c);
}

function lathe(THREE, rFn, y0, y1, n = 10, seg = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const y = y0 + (y1 - y0) * (i / n);
    pts.push(new THREE.Vector2(Math.max(0.0005, rFn(y)), y));
  }
  return new THREE.LatheGeometry(pts, seg);
}

function pompom(THREE, g, h, r, color, x, y, z, puffs = 7) {
  const { clay, put } = h;
  put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), clay(color, false)), x, y, z);
  for (let i = 0; i < puffs; i++) {
    const a = i * 2.39996, t = (i + 0.5) / puffs, ry = 1 - 2 * t, rr = Math.sqrt(1 - ry * ry);
    put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.42, 1), clay(color, false)),
      x + Math.cos(a) * rr * r * 0.82, y + ry * r * 0.82, z + Math.sin(a) * rr * r * 0.82, false);
  }
}

function tubeAlong(THREE, pts, radius, mat, seg = 24, radial = 7) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, radius, radial, false), mat);
  m.castShadow = true;
  return m;
}

function surfLocal(THREE, k, origin, d, out) {
  const p = onSurf(k.bs, k.R, k.bodyY, d[0], d[1], d[2], out);
  return new THREE.Vector3(p.x - origin.x, p.y - origin.y, p.z - origin.z);
}

function stripChain(THREE, g, pts, w, t, colorAt, h) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, t, a.distanceTo(b) * 1.12), h.clay(colorAt(i)));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.lookAt(b);
    m.castShadow = true;
    g.add(m);
  }
}

function fringe(THREE, g, end, dir, w, h, color, n = 4) {
  for (let i = 0; i < n; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w * 0.11, w * 0.11, w * 0.42), h.clay(color));
    f.position.copy(end).add(new THREE.Vector3((i / (n - 1) - 0.5) * w * 0.85, 0, 0)).addScaledVector(dir, w * 0.18);
    f.lookAt(f.position.clone().add(dir));
    f.castShadow = true;
    g.add(f);
  }
}

export function buildPompomHat(THREE, g, k, h) {
  const { clay, put } = h;
  const HR = k.HR, yb = DOME_BOT * HR, yt = HR * 1.16;
  const shape = y => {
    const t = (y - yb) / (yt - yb);
    return Math.max(headR(HR, y) * 1.06, HR * 0.93 * Math.sqrt(Math.max(0, 1 - t * t)));
  };
  put(g, new THREE.Mesh(lathe(THREE, shape, yb, yt, 10, 26), clay(WP.green, false)), 0, 0, 0);
  const zy = yb + HR * 0.20, zr = shape(zy) * 1.01;
  const zz = put(g, new THREE.Mesh(new THREE.CylinderGeometry(zr, zr * 1.02, HR * 0.20, 26, 1, true), clay(WP.cream)), 0, zy, 0, false);
  zz.material.side = THREE.DoubleSide;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tri = put(g, new THREE.Mesh(new THREE.ConeGeometry(HR * 0.08, HR * 0.13, 3), clay(WP.berry)),
      Math.cos(a) * zr * 1.03, zy, Math.sin(a) * zr * 1.03, false);
    tri.rotation.y = -a + Math.PI / 2;
    tri.scale.set(1, 1, 0.35);
  }
  const rim = put(g, new THREE.Mesh(new THREE.TorusGeometry(shape(yb) * 1.04, HR * 0.07, 5, 26), clay(WP.greenDark)), 0, yb, 0, false);
  rim.rotation.x = Math.PI / 2;
  [-1, 1].forEach(s => {
    const fr = HR * 1.07, t0 = Math.acos(0.56), t1 = Math.acos(-0.32), c = s > 0 ? Math.PI : 0;
    const flap = put(g, new THREE.Mesh(new THREE.SphereGeometry(fr, 10, 8, c - 0.48, 0.96, t0, t1 - t0), clay(WP.green, false)), 0, 0, 0);
    flap.material.side = THREE.DoubleSide;
    const lip = put(g, new THREE.Mesh(new THREE.TorusGeometry(fr * Math.sin(t1), HR * 0.05, 4, 10, 0.96), clay(WP.greenDark)), 0, fr * Math.cos(t1), 0, false);
    lip.rotation.set(Math.PI / 2, 0, s > 0 ? -0.48 : Math.PI - 0.48);
    const tip = new THREE.Vector3(s * fr * Math.sin(t1), fr * Math.cos(t1) - HR * 0.03, 0);
    put(g, tubeAlong(THREE, [tip, tip.clone().add(new THREE.Vector3(s * HR * 0.03, -HR * 0.18, HR * 0.02)), tip.clone().add(new THREE.Vector3(s * HR * 0.05, -HR * 0.34, HR * 0.03))], HR * 0.035, clay(WP.mustardDark), 8, 5), 0, 0, 0, false);
    pompom(THREE, g, h, HR * 0.11, WP.mustard, tip.x + s * HR * 0.05, tip.y - HR * 0.42, tip.z + HR * 0.03, 5);
  });
  pompom(THREE, g, h, HR * 0.17, WP.mustard, 0, yt + HR * 0.02, 0, 6);
}

function neckWrap(THREE, g, k, h, colors, tubeK) {
  const r = k.neckR, segs = 12;
  for (let i = 0; i < segs; i++) {
    const t = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * tubeK, 7, 4, (Math.PI * 2) / segs + 0.02), h.clay(colors[i % colors.length], false)), 0, r * 0.04, 0);
    t.rotation.set(Math.PI / 2, 0, (i / segs) * Math.PI * 2);
  }
}

const tailPts = (THREE, k, dirs, out) => dirs.map(d => surfLocal(THREE, k, k.neck, d, out));

export function buildKnitScarf(THREE, g, k0, h) {
  const k = withAnchors(k0), r = k.neckR;
  neckWrap(THREE, g, k, h, [WP.cream, WP.berry], 0.34);
  const pts = tailPts(THREE, k, [[-0.42, 0.80, 0.20], [-0.55, 0.74, -0.25], [-0.52, 0.52, -0.62], [-0.46, 0.25, -0.86], [-0.42, 0.02, -0.92]], 1.12);
  pts[0] = new THREE.Vector3(-r * 0.86, r * 0.10, r * 0.30);
  stripChain(THREE, g, pts, r * 0.42, r * 0.13, i => (i % 2 ? WP.berry : WP.cream), h);
  const end = pts[pts.length - 1], dir = end.clone().sub(pts[pts.length - 2]).normalize();
  fringe(THREE, g, end, dir, r * 0.42, h, WP.berryDark, 5);
  const fp = tailPts(THREE, k, [[0.30, 0.72, 0.72], [0.32, 0.50, 0.88], [0.33, 0.30, 0.96]], 1.10);
  fp[0] = new THREE.Vector3(r * 0.32, -r * 0.18, r * 1.06);
  stripChain(THREE, g, fp, r * 0.40, r * 0.12, i => (i % 2 ? WP.cream : WP.berry), h);
  fringe(THREE, g, fp[2], fp[2].clone().sub(fp[1]).normalize(), r * 0.40, h, WP.berryDark, 5);
}

function log(THREE, g, h, len, rad, pos, rot) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.04, len, 8), h.clay(WP.bark));
  body.castShadow = true;
  grp.add(body);
  [1, -1].forEach(s => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.86, rad * 0.86, rad * 0.10, 8), h.clay(WP.endGrain));
    cap.position.y = s * len / 2;
    grp.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad * 0.45, rad * 0.07, 3, 10), h.clay(WP.ring));
    ring.position.y = s * (len / 2 + rad * 0.05);
    ring.rotation.x = Math.PI / 2;
    grp.add(ring);
  });
  grp.position.copy(pos);
  grp.rotation.copy(rot);
  g.add(grp);
}

function backFront(k, yR, pad = 0.03) {
  const R = k.R, bs = k.bs;
  const bodyZ = yR < bs[1] ? -bs[2] * Math.sqrt(1 - (yR / bs[1]) ** 2) : 0;
  const HYr = (k.HY - k.bodyY) / R, HRr = k.HR / R, dy = yR - HYr;
  const headZ = Math.abs(dy) < HRr ? -Math.sqrt(HRr * HRr - dy * dy) : 0;
  return { y: k.bodyY + yR * R - k.back.y, z: (Math.min(bodyZ, headZ) - pad) * R - k.back.z };
}

function wickerCone(THREE, h, rt, rb, H, bands) {
  const { clay } = h;
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, H, 18, 1, true), clay(WP.wicker));
  shell.material.side = THREE.DoubleSide; shell.castShadow = true; g.add(shell);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, ra = (rt + rb) / 2;
    const st = new THREE.Mesh(new THREE.BoxGeometry(H * 0.035, H * 1.0, H * 0.035), clay(WP.wickerDark));
    st.position.set(Math.cos(a) * ra * 1.02, 0, Math.sin(a) * ra * 1.02);
    st.rotation.set(Math.sin(a) * Math.atan2(rt - rb, H), 0, -Math.cos(a) * Math.atan2(rt - rb, H));
    g.add(st);
  }
  for (let i = 0; i < bands; i++) {
    const f = (i + 0.5) / bands, rr = rb + (rt - rb) * f;
    const b = new THREE.Mesh(new THREE.TorusGeometry(rr * 1.03, H * 0.035, 4, 22), clay(WP.wickerDark));
    b.position.y = -H / 2 + H * f; b.rotation.x = Math.PI / 2; g.add(b);
  }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rt, H * 0.06, 5, 22), clay(WP.wickerDark));
  lip.position.y = H / 2; lip.rotation.x = Math.PI / 2; g.add(lip);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(rb, rb * 0.95, H * 0.06, 18), clay(WP.wickerDark));
  base.position.y = -H / 2; g.add(base);
  return g;
}

export function buildFirewood(THREE, g, k0, h) {
  const k = withAnchors(k0);
  const R = k.R, rt = R * 0.50, rb = R * 0.30, dk = 0.30;
  const fb = backFront(k, 0.76), ft = backFront(k, 1.24);
  const zb = fb.z - rb * dk, zt = ft.z - rt * dk;
  const H = Math.hypot(ft.y - fb.y, zt - zb);
  const holder = new THREE.Group();
  holder.position.set(0, (fb.y + ft.y) / 2, (zb + zt) / 2);
  holder.rotation.x = Math.atan2(zt - zb, ft.y - fb.y);
  holder.scale.set(1, 1, dk);
  holder.add(wickerCone(THREE, h, rt, rb, H, 4));
  g.add(holder);
  const logs = new THREE.Group();
  logs.position.copy(holder.position); logs.rotation.copy(holder.rotation);
  g.add(logs);
  [[-0.55, 0, R * 0.30, 0.22], [-0.18, 0.1, R * 0.42, 0.06], [0.2, -0.1, R * 0.36, -0.08], [0.55, 0, R * 0.26, -0.24]].forEach(([x, z, up, tilt]) => {
    const len = H * 0.75 + up;
    log(THREE, logs, h, len, R * 0.075, new THREE.Vector3(x * rt, H / 2 - H * 0.75 + len / 2, z * rt * dk), new THREE.Euler(0, 0, tilt));
  });
  const sprig = new THREE.Mesh(new THREE.ConeGeometry(R * 0.09, R * 0.28, 5), h.clay(WP.pine));
  sprig.position.set(rt * 0.85, H / 2 + R * 0.12, 0); sprig.rotation.z = -0.6; logs.add(sprig);
  holder.updateMatrix();
  [-1, 1].forEach(s => {
    const p0 = new THREE.Vector3(s * rt * 0.8, H * 0.42, rt * 0.6).applyMatrix4(holder.matrix);
    const pts = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, pts, R * 0.045, h.clay(WP.leather), 28, 6));
  });
  flatten(THREE, g);
}
