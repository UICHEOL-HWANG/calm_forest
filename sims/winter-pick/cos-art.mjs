import { DOME_BOT, onSurf } from '../../js/cosmetics/anchors.js';

export const WP = Object.freeze({
  cream: 0xe2d3b6, creamDark: 0xc4b08e,
  berry: 0xb8434f, berryDark: 0x8e3240,
  green: 0x4f7f55, greenDark: 0x3b6243,
  mustard: 0xd6a640, mustardDark: 0xae8330,
  wood: 0x9b6a3e, woodDark: 0x6e4a2b, bark: 0x7a5534, endGrain: 0xd4b384, ring: 0xa7835a,
  wicker: 0xc49a5c, wickerDark: 0x98713f, leather: 0x7d4f33,
  sole: 0x8a6446, soleDark: 0x5f4330, snow: 0xccd5de, snowShade: 0x93a5b8, pine: 0x4a7a4e,
});

const headR = (HR, y) => Math.sqrt(Math.max(0, HR * HR - y * y));

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
    g.add(f);
  }
}

export function buildPompomHatA(THREE, g, k, h) {
  const { clay, put } = h;
  const HR = k.HR, yb = DOME_BOT * HR, yt = HR * 1.48;
  const shape = y => {
    const t = (y - yb) / (yt - yb);
    return Math.max(headR(HR, y) * 1.06, HR * 0.95 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.4)), 0.55));
  };
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const y0 = yb + (yt - yb) * (i / bands), y1 = yb + (yt - yb) * ((i + 1) / bands);
    put(g, new THREE.Mesh(lathe(THREE, shape, y0, y1, 6), clay(i % 2 ? WP.cream : WP.berry, false)), 0, 0, 0);
  }
  const cy0 = yb, cy1 = yb + HR * 0.26, cr = shape(cy1) * 1.07;
  const cuff = put(g, new THREE.Mesh(new THREE.CylinderGeometry(cr, cr * 1.03, cy1 - cy0, 26, 1, true), clay(WP.berryDark)), 0, (cy0 + cy1) / 2, 0);
  cuff.material.side = THREE.DoubleSide;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rib = put(g, new THREE.Mesh(new THREE.BoxGeometry(HR * 0.07, (cy1 - cy0) * 0.96, HR * 0.05), clay(WP.berry)),
      Math.cos(a) * cr * 1.02, (cy0 + cy1) / 2, Math.sin(a) * cr * 1.02, false);
    rib.rotation.y = -a;
  }
  pompom(THREE, g, h, HR * 0.30, WP.cream, 0, yt + HR * 0.10, 0, 10);
}

export function buildPompomHatB(THREE, g, k, h) {
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

function coneChain(THREE, g, h, pts, radAt, colorAt) {
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], r0 = radAt(i), r1 = radAt(i + 1), mat = h.clay(colorAt(i), false);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), 14), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
    m.castShadow = true;
    g.add(m);
    if (i > 0) h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r0, 14, 10), mat), a.x, a.y, a.z);
  }
}

export function buildPompomHatC(THREE, g, k, h) {
  const { clay, put } = h;
  const HR = k.HR, yb = DOME_BOT * HR, yt = HR * 1.12;
  const shape = y => {
    const t = (y - yb) / (yt - yb);
    return Math.max(headR(HR, y) * 1.06, HR * 0.92 * Math.sqrt(Math.max(0, 1 - t * t)));
  };
  put(g, new THREE.Mesh(lathe(THREE, shape, yb, yt, 10, 26), clay(WP.berry, false)), 0, 0, 0);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, HR * 0.90, -HR * 0.05),
    new THREE.Vector3(-HR * 0.08, HR * 1.22, -HR * 0.32),
    new THREE.Vector3(-HR * 0.30, HR * 1.20, -HR * 0.70),
    new THREE.Vector3(-HR * 0.52, HR * 0.92, -HR * 0.92),
    new THREE.Vector3(-HR * 0.62, HR * 0.62, -HR * 0.98),
  ]);
  const N = 10, pts = curve.getSpacedPoints(N);
  coneChain(THREE, g, h, pts, i => HR * (0.50 - 0.38 * (i / N)), i => (Math.floor(i / 2) % 2 ? WP.mustard : WP.berry));
  const trim = put(g, new THREE.Mesh(new THREE.TorusGeometry(shape(yb) * 1.02, HR * 0.13, 7, 28), clay(WP.cream, false)), 0, yb + HR * 0.04, 0);
  trim.rotation.x = Math.PI / 2;
  const end = curve.getPointAt(1);
  pompom(THREE, g, h, HR * 0.20, WP.cream, end.x, end.y - HR * 0.08, end.z, 7);
}

function neckWrap(THREE, g, k, h, colors, tubeK = 0.32) {
  const r = k.neckR, segs = 12;
  for (let i = 0; i < segs; i++) {
    const t = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * tubeK, 7, 4, (Math.PI * 2) / segs + 0.02), h.clay(colors[i % colors.length], false)), 0, r * 0.04, 0);
    t.rotation.set(Math.PI / 2, 0, (i / segs) * Math.PI * 2);
  }
}

const tailPts = (THREE, k, dirs, out) => dirs.map(d => surfLocal(THREE, k, k.neck, d, out));

export function buildKnitScarfA(THREE, g, k, h) {
  const { clay, put } = h;
  const r = k.neckR;
  neckWrap(THREE, g, k, h, [WP.mustard, WP.mustardDark], 0.36);
  const knot = put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.32, 0), clay(WP.mustard)), r * 0.22, -r * 0.08, r * 1.08);
  knot.scale.set(1.1, 0.9, 0.8);
  [[0.30, 0], [0.08, 1]].forEach(([x0, idx]) => {
    const pts = tailPts(THREE, k, [[x0, 0.70, 0.75], [x0 + 0.03, 0.42, 0.92], [x0 + 0.05, 0.12, 1.0], [x0 + 0.06, -0.16 - idx * 0.12, 1.0]], 1.10);
    pts[0] = new THREE.Vector3(r * 0.22 + (idx ? -r * 0.14 : r * 0.10), -r * 0.16, r * 1.08);
    stripChain(THREE, g, pts, r * 0.40, r * 0.12, i => (i % 2 ? WP.mustardDark : WP.mustard), h);
    const end = pts[pts.length - 1], dir = end.clone().sub(pts[pts.length - 2]).normalize();
    fringe(THREE, g, end, dir, r * 0.40, h, WP.cream, 4);
  });
}

export function buildKnitScarfB(THREE, g, k, h) {
  const { clay, put } = h;
  const r = k.neckR;
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

export function buildKnitScarfC(THREE, g, k, h) {
  const { clay, put } = h;
  const r = k.neckR, H = r * 0.50;
  const cowl = put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.24, H, 28, 1, true), clay(WP.green, false)), 0, -r * 0.06, 0);
  cowl.material.side = THREE.DoubleSide;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const cable = put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.08, H * 0.98, 5), clay(i % 2 ? WP.greenDark : WP.green)),
      Math.cos(a) * r * 1.20, -r * 0.06, Math.sin(a) * r * 1.20, false);
    cable.rotation.z = (i % 2 ? 1 : -1) * 0.10;
  }
  const roll = put(g, new THREE.Mesh(new THREE.TorusGeometry(r * 1.10, r * 0.14, 7, 28), clay(WP.greenDark, false)), 0, -r * 0.06 + H * 0.5, 0);
  roll.rotation.x = Math.PI / 2;
  const roll2 = put(g, new THREE.Mesh(new THREE.TorusGeometry(r * 1.22, r * 0.10, 6, 28), clay(WP.greenDark, false)), 0, -r * 0.06 - H * 0.5, 0, false);
  roll2.rotation.x = Math.PI / 2;
  [-1, 1].forEach(s => {
    const top = new THREE.Vector3(s * r * 0.16, -r * 0.20, r * 1.26);
    const bot = surfLocal(THREE, k, k.neck, [s * 0.14, 0.58, 0.88], 1.12);
    put(g, tubeAlong(THREE, [top, top.clone().lerp(bot, 0.5).add(new THREE.Vector3(0, 0, r * 0.06)), bot], r * 0.045, clay(WP.cream), 10, 5), 0, 0, 0, false);
    pompom(THREE, g, h, r * 0.17, WP.mustard, bot.x, bot.y - r * 0.08, bot.z + r * 0.04, 6);
  });
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
  return grp;
}

function strap(THREE, g, k, h, dirs, rad, color, out = 1.06) {
  g.add(tubeAlong(THREE, dirs.map(d => surfLocal(THREE, k, k.back, d, out)), rad, h.clay(color), 28, 6));
}

export function buildFirewoodA(THREE, g, k, h) {
  const { clay } = h;
  const R = k.R, rt = R * 0.30, rb = R * 0.23, H = R * 0.80;
  const anchor = surfLocal(THREE, k, k.back, [-0.74, 0.60, -0.55], 1.0);
  const bk = new THREE.Group();
  bk.position.set(anchor.x + R * 0.02, anchor.y + R * 0.04, anchor.z - rt * 0.45);
  bk.rotation.set(-0.12, 0.55, 0.22);
  bk.scale.set(1, 1, 0.66);
  g.add(bk);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, H, 14, 1, true), clay(WP.wicker));
  shell.material.side = THREE.DoubleSide; shell.castShadow = true; bk.add(shell);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(rb, rb, R * 0.04, 14), clay(WP.wickerDark));
  base.position.y = -H / 2; bk.add(base);
  for (let i = 0; i < 4; i++) {
    const f = 0.15 + i * 0.25, rr = rb + (rt - rb) * f;
    const band = new THREE.Mesh(new THREE.TorusGeometry(rr * 1.02, R * 0.025, 4, 18), clay(WP.wickerDark));
    band.position.y = -H / 2 + H * f; band.rotation.x = Math.PI / 2; bk.add(band);
  }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rt, R * 0.05, 5, 18), clay(WP.wickerDark));
  lip.position.y = H / 2; lip.rotation.x = Math.PI / 2; bk.add(lip);
  [[0, 0.12, 0.06, 0.95], [0.14, 0.04, -0.10, 0.80], [-0.13, 0.06, -0.08, 0.88], [0.05, -0.12, 0.10, 0.70]].forEach(([x, z, tilt, l]) => {
    log(THREE, bk, h, H * l + R * 0.30, R * 0.085, new THREE.Vector3(x * R * 1.4, H * 0.5 - (H * l) / 2 + R * 0.24, z * R * 1.4), new THREE.Euler(tilt, 0, x * 0.8));
  });
  const sprig = new THREE.Mesh(new THREE.ConeGeometry(R * 0.10, R * 0.30, 5), clay(WP.pine));
  sprig.position.set(-rt * 0.55, H / 2 + R * 0.10, rt * 0.2); sprig.rotation.z = 0.5; bk.add(sprig);
  bk.updateMatrix();
  const top = new THREE.Vector3(rt * 0.6, H * 0.40, rt * 0.7).applyMatrix4(bk.matrix);
  const pts = [top, ...[[-0.20, 0.92, -0.40], [-0.30, 0.95, 0.20], [-0.45, 0.55, 0.85], [-0.70, 0.10, 0.70]].map(d => surfLocal(THREE, k, k.back, d, 1.07))];
  g.add(tubeAlong(THREE, pts, R * 0.045, clay(WP.leather), 30, 6));
}

export function buildFirewoodB(THREE, g, k, h) {
  const { clay } = h;
  const R = k.R;
  const zOf = (x, y) => surfLocal(THREE, k, k.back, [x, y, -1], 1.0).z;
  [-1, 1].forEach(s => {
    const x = s * R * 0.62;
    const zr = Math.min(zOf(s * 0.55, 0.85), zOf(s * 0.55, 0.20)) - R * 0.06;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(R * 0.07, R * 1.45, R * 0.07), clay(WP.woodDark));
    rail.position.set(x, R * 0.30, zr); rail.rotation.z = -s * 0.10; rail.castShadow = true; g.add(rail);
    [[-0.10, 0], [0.10, 0.08], [0, 0.16]].forEach(([dx, dz], i) => {
      log(THREE, g, h, R * (0.92 - i * 0.08), R * 0.082, new THREE.Vector3(x + dx * R, R * 0.30 + i * R * 0.04, zr - R * 0.14 - dz * R), new THREE.Euler(0.04, 0, s * 0.08 - dx * 0.4));
    });
    [0.62, 0.0].forEach(y => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.20, R * 0.028, 4, 14), clay(WP.berry));
      band.position.set(x, y * R, zr - R * 0.17); band.rotation.x = Math.PI / 2; band.scale.set(1.15, 0.85, 1); g.add(band);
    });
  });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(R * 1.36, R * 0.08, R * 0.08), clay(WP.woodDark));
  bar.position.set(0, R * 0.98, zOf(0, 1.0) - R * 0.10); bar.castShadow = true; g.add(bar);
  [-1, 1].forEach(s => strap(THREE, g, k, h, [[s * 0.55, 0.92, -0.45], [s * 0.42, 1.0, 0.0], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]], R * 0.04, WP.berryDark, 1.06));
}

export function buildFirewoodC(THREE, g, k, h) {
  const { clay } = h;
  const R = k.R;
  const cy = R * 0.48, cz = surfLocal(THREE, k, k.back, [0, 0.72, -1], 1.0).z - R * 0.20;
  const L = R * 1.15, lr = R * 0.10;
  [[-1, 0], [1, 0], [0, 1]].forEach(([i, j]) => {
    log(THREE, g, h, L - Math.abs(i) * R * 0.08 + j * R * 0.1, lr, new THREE.Vector3(i * R * 0.04, cy + j * lr * 1.7, cz + i * lr * 0.95), new THREE.Euler(0, 0, Math.PI / 2 + i * 0.04));
  });
  const sling = new THREE.Mesh(new THREE.CylinderGeometry(lr * 2.25, lr * 2.25, L * 0.62, 16, 1, true, Math.PI * 0.95, Math.PI * 1.1), clay(WP.mustard, false));
  sling.material.side = THREE.DoubleSide;
  sling.rotation.set(0, 0, Math.PI / 2);
  sling.position.set(0, cy + lr * 0.55, cz);
  sling.castShadow = true;
  g.add(sling);
  const sprig = new THREE.Group();
  sprig.position.set(R * 0.28, cy + lr * 2.6, cz + lr * 0.2);
  g.add(sprig);
  [0, 0.7, -0.7].forEach(a => {
    const n = new THREE.Mesh(new THREE.ConeGeometry(R * 0.06, R * 0.24, 5), clay(WP.pine));
    n.rotation.z = a; n.position.x = a * R * 0.08; sprig.add(n);
  });
  [[0.05, 0.02], [-0.04, -0.03]].forEach(([x, z]) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.045, 0), clay(WP.berry));
    b.position.set(x * R, -R * 0.08, z * R + R * 0.05); sprig.add(b);
  });
  [-1, 1].forEach(s => strap(THREE, g, k, h, [[s * 0.30, 0.80, -0.60], [s * 0.40, 1.0, -0.05], [s * 0.40, 0.62, 0.78], [s * 0.50, 0.20, 0.86]], R * 0.04, WP.leather, 1.06));
}

function bootSole(THREE, g, s, mat, put, sc = 1) {
  put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.50 * sc, 12, 7), mat), 0, 0.006, s * 0.42 * sc, false).scale.set(0.82, 0.08, 1.10);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.56 * sc, s * 0.02, s * 0.50 * sc), mat), 0, 0.005, -s * 0.12 * sc, false);
  put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.38 * sc, 12, 7), mat), 0, 0.006, -s * 0.52 * sc, false).scale.set(0.95, 0.08, 0.85);
}

export function buildBootTrailA(THREE, g, s, o, id, h) {
  const { film, put } = h;
  bootSole(THREE, g, s, film(WP.sole, o), put, 1.15);
  const dark = film(WP.soleDark, o);
  [0.70, 0.45, 0.20].forEach(z => put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.66, s * 0.02, s * 0.08), dark), 0, 0.010, z * s, false));
  [-0.50, -0.72].forEach(z => put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.52, s * 0.02, s * 0.08), dark), 0, 0.010, z * s, false));
  const fur = film(WP.cream, o);
  [[-0.32, -0.95, 0.20], [0, -1.05, 0.24], [0.32, -0.95, 0.20], [-0.48, -0.70, 0.15], [0.48, -0.70, 0.15]].forEach(([x, z, r]) => {
    put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(s * r, 0), fur), x * s, s * 0.06, z * s, false).scale.y = 0.55;
  });
}

export function buildBootTrailB(THREE, g, s, o, id, h) {
  const { film, put } = h;
  const sc = 1.15;
  bootSole(THREE, g, s, film(WP.snowShade, o * 0.85), put, sc);
  const rim = film(WP.snow, o);
  [[0.92, 1.18, 0.42], [0.82, 0.78, -0.52]].forEach(([rx, rz, z]) => {
    const t = put(g, new THREE.Mesh(new THREE.TorusGeometry(s * 0.5 * sc, s * 0.13, 5, 20), rim), 0, 0.008, z * s * sc, false);
    t.rotation.x = Math.PI / 2; t.scale.set(rx, rz, 0.45);
  });
  [[-0.55, 0.12, -1.20, 0.16], [0.40, 0.20, -1.40, 0.12], [0.05, 0.30, -1.65, 0.10], [-0.25, 0.42, -1.90, 0.07]].forEach(([x, y, z, r], i) => {
    put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(s * r, 0), film(WP.snow, o * (1 - i * 0.18))), x * s, y * s, z * s, false).rotation.set(i, i * 2, 0);
  });
}

export function buildBootTrailC(THREE, g, s, o, id, h) {
  const { film, put } = h;
  const sc = 1.15;
  bootSole(THREE, g, s, film(WP.berry, o), put, sc);
  const tread = film(WP.cream, o);
  [0.78, 0.52, 0.26].forEach(z => [-1, 1].forEach(sd => {
    put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.34, s * 0.02, s * 0.07), tread), sd * s * 0.14, 0.011, z * s * sc, false).rotation.y = sd * 0.55;
  }));
  const heart = new THREE.Shape();
  heart.moveTo(0, -0.9); heart.bezierCurveTo(0.9, -0.1, 0.8, 0.8, 0, 0.35); heart.bezierCurveTo(-0.8, 0.8, -0.9, -0.1, 0, -0.9);
  const hg = new THREE.ShapeGeometry(heart, 8);
  hg.scale(s * 0.24, s * 0.24, 1);
  put(g, new THREE.Mesh(hg, tread), 0, 0.012, -s * 0.55 * sc, false).rotation.x = -Math.PI / 2;
  [[0.30, 0.9, -0.2, 0.16, 0.8], [-0.25, 1.9, -0.5, 0.11, 0.5], [0.10, 2.9, -0.8, 0.08, 0.3]].forEach(([x, y, z, r, a]) => {
    put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(s * r, 1), film(WP.cream, o * a)), x * s, y * s, z * s, false);
  });
}

function backFront(k, yR, pad = 0.03) {
  const R = k.R, bs = k.bs;
  const bodyZ = yR < bs[1] ? -bs[2] * Math.sqrt(1 - (yR / bs[1]) ** 2) : 0;
  const HYr = (k.HY - k.bodyY) / R, HRr = k.HR / R, dy = yR - HYr;
  const headZ = Math.abs(dy) < HRr ? -Math.sqrt(HRr * HRr - dy * dy) : 0;
  return { y: k.bodyY + yR * R - k.back.y, z: (Math.min(bodyZ, headZ) - pad) * R - k.back.z };
}

function sideFront(k, xR, yR, pad = 0.02) {
  const bs = k.bs, f = 1 - (xR / bs[0]) ** 2 - (yR / bs[1]) ** 2;
  return { x: xR * k.R, y: k.bodyY + yR * k.R - k.back.y, z: (-bs[2] * Math.sqrt(Math.max(0, f)) - pad) * k.R - k.back.z };
}

function wickerCone(THREE, h, rt, rb, H, dk, bands = 3) {
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
  g.scale.set(1, 1, dk);
  return g;
}

function logsIn(THREE, g, h, rt, H, dk, R, spec) {
  spec.forEach(([x, z, up, tilt]) => {
    const len = H * 0.75 + up;
    log(THREE, g, h, len, R * 0.075, new THREE.Vector3(x * rt, H / 2 - H * 0.75 + len / 2, z * rt * dk), new THREE.Euler(0, 0, tilt));
  });
}

function strapsFrom(THREE, g, k, h, starts, color) {
  starts.forEach((p0, i) => {
    const s = i ? 1 : -1;
    const pts = [p0, ...[[s * 0.42, 1.0, -0.15], [s * 0.42, 0.62, 0.78], [s * 0.55, 0.15, 0.85]].map(d => surfLocal(THREE, k, k.back, d, 1.06))];
    g.add(tubeAlong(THREE, pts, k.R * 0.045, h.clay(color), 28, 6));
  });
}

export function buildFirewoodD(THREE, g, k, h) {
  const R = k.R, rt = R * 0.50, rb = R * 0.30, dk = 0.30;
  const fb = backFront(k, 0.76), ft = backFront(k, 1.24);
  const zb = fb.z - rb * dk, zt = ft.z - rt * dk;
  const H = Math.hypot(ft.y - fb.y, zt - zb);
  const bk = wickerCone(THREE, h, rt, rb, H, 1, 4);
  const holder = new THREE.Group();
  holder.position.set(0, (fb.y + ft.y) / 2, (zb + zt) / 2);
  holder.rotation.x = Math.atan2(zt - zb, ft.y - fb.y);
  holder.scale.set(1, 1, dk);
  holder.add(bk);
  g.add(holder);
  const logs = new THREE.Group();
  logs.position.copy(holder.position); logs.rotation.copy(holder.rotation);
  g.add(logs);
  logsIn(THREE, logs, h, rt, H, dk, R, [[-0.55, 0, R * 0.30, 0.22], [-0.18, 0.1, R * 0.42, 0.06], [0.2, -0.1, R * 0.36, -0.08], [0.55, 0, R * 0.26, -0.24]]);
  const sprig = new THREE.Mesh(new THREE.ConeGeometry(R * 0.09, R * 0.28, 5), h.clay(WP.pine));
  sprig.position.set(rt * 0.85, H / 2 + R * 0.12, 0); sprig.rotation.z = -0.6; logs.add(sprig);
  holder.updateMatrix();
  const rim = s => new THREE.Vector3(s * rt * 0.8, H * 0.42, rt * 0.6).applyMatrix4(holder.matrix);
  strapsFrom(THREE, g, k, h, [rim(-1), rim(1)], WP.leather);
}

export function buildFirewoodE(THREE, g, k, h) {
  const { clay } = h;
  const R = k.R, W = R * 1.20, Hc = R * 0.34, D = R * 0.30;
  const yc = 1.10, f = backFront(k, yc - 0.17);
  const c = new THREE.Vector3(0, backFront(k, yc).y, f.z - D / 2);
  const crate = new THREE.Group();
  crate.position.copy(c); g.add(crate);
  const wall = (w, hh, d, x, y, z, col = WP.wicker) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), clay(col)); m.position.set(x, y, z); m.castShadow = true; crate.add(m); return m;
  };
  wall(W, R * 0.04, D, 0, -Hc / 2, 0, WP.wickerDark);
  [-1, 1].forEach(s => wall(W, Hc, R * 0.035, 0, 0, s * D / 2));
  [-1, 1].forEach(s => wall(R * 0.035, Hc, D, s * W / 2, 0, 0));
  [-0.25, 0.1].forEach(y => [-1, 1].forEach(s => wall(W * 1.01, R * 0.03, R * 0.045, 0, y * Hc, s * D / 2, WP.wickerDark)));
  for (let i = -4; i <= 4; i++) wall(R * 0.03, Hc * 1.02, R * 0.05, (i / 4.5) * W / 2, 0, -D / 2, WP.wickerDark);
  [-1, 1].forEach(s => wall(W * 1.03, R * 0.05, R * 0.06, 0, Hc / 2, s * D / 2, WP.wickerDark));
  [[-0.22, 0.05], [0.22, 0.05], [0, 0.32]].forEach(([z, y], i) => {
    log(THREE, crate, h, W * (1.30 - i * 0.08), R * 0.085, new THREE.Vector3(i === 2 ? R * 0.05 : 0, Hc / 2 - R * 0.06 + y * R, z * D), new THREE.Euler(0, 0, Math.PI / 2));
  });
  const sprig = new THREE.Mesh(new THREE.ConeGeometry(R * 0.08, R * 0.26, 5), clay(WP.pine));
  sprig.position.set(-W * 0.32, Hc / 2 + R * 0.22, 0); sprig.rotation.z = 0.5; crate.add(sprig);
  [-1, 1].forEach(s => {
    const top = sideFront(k, s * 0.48, yc - 0.20, 0.06), bot = sideFront(k, s * 0.50, 0.25, 0.06);
    const pole = tubeAlong(THREE, [new THREE.Vector3(top.x, c.y - Hc / 2, Math.min(top.z, c.z)), new THREE.Vector3(bot.x, bot.y, bot.z)], R * 0.04, clay(WP.woodDark), 4, 5);
    g.add(pole);
  });
  strapsFrom(THREE, g, k, h, [new THREE.Vector3(-W * 0.3, c.y, c.z + D / 2), new THREE.Vector3(W * 0.3, c.y, c.z + D / 2)], WP.berryDark);
}

export function buildFirewoodF(THREE, g, k, h) {
  const R = k.R, rt = R * 0.27, rb = R * 0.19, Hb = R * 0.56, dk = 0.82, xR = 0.60, yR = 0.62;
  const rims = [];
  [-1, 1].forEach(s => {
    const f = sideFront(k, s * xR, yR);
    const pos = new THREE.Vector3(f.x, f.y, f.z - rt * dk);
    const bk = wickerCone(THREE, h, rt, rb, Hb, dk, 3);
    bk.position.copy(pos); bk.rotation.z = -s * 0.10; g.add(bk);
    const logs = new THREE.Group(); logs.position.copy(pos); logs.rotation.z = -s * 0.10; g.add(logs);
    logsIn(THREE, logs, h, rt, Hb, dk, R, [[-0.35, 0.1, R * 0.30, 0.12], [0.3, -0.15, R * 0.22, -0.1], [0, 0.3, R * 0.38, 0.02 * s]]);
    rims.push(new THREE.Vector3(pos.x, pos.y + Hb / 2, pos.z));
  });
  const mid = backFront(k, yR + 0.42, 0.06);
  g.add(tubeAlong(THREE, [rims[0], new THREE.Vector3(-R * 0.25, mid.y - R * 0.02, mid.z), new THREE.Vector3(0, mid.y, mid.z), new THREE.Vector3(R * 0.25, mid.y - R * 0.02, mid.z), rims[1]], R * 0.05, h.clay(WP.woodDark), 24, 6));
  const sprig = new THREE.Mesh(new THREE.ConeGeometry(R * 0.08, R * 0.24, 5), h.clay(WP.pine));
  sprig.position.set(0, mid.y + R * 0.08, mid.z); g.add(sprig);
  [[0.06, 0], [-0.06, 0.02]].forEach(([x, z]) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.045, 0), h.clay(WP.berry));
    b.position.set(x * R, mid.y - R * 0.02, mid.z - R * 0.03 + z * R); g.add(b);
  });
  strapsFrom(THREE, g, k, h, rims, WP.leather);
}

export const VARIANTS = {
  wp_pompom_hat: {
    slot: 'head', name: '방울 뜨개 모자',
    A: { name: '줄무늬 긴 방울모자', note: '베리·크림 5줄 + 골지 접단 + 큰 방울', build: buildPompomHatA },
    B: { name: '귀덮개 뜨개모자', note: '초록 + 지그재그 띠 + 귀덮개·끈 방울', build: buildPompomHatB },
    C: { name: '늘어진 꼬리 방울모자', note: '뒤로 늘어진 꼬리 + 크림 털테 + 끝 방울', build: buildPompomHatC },
  },
  wp_knit_scarf: {
    slot: 'neck', name: '손뜨개 겨울 목도리',
    A: { name: '골지 긴 자락 목도리', note: '겨자색 골지 + 앞으로 늘어진 두 자락·술', build: buildKnitScarfA },
    B: { name: '줄무늬 어깨 넘김', note: '크림·베리 줄무늬 + 자락 하나 어깨 뒤로', build: buildKnitScarfB },
    C: { name: '꽈배기 넥워머', note: '초록 꽈배기 통 + 방울 끈 두 개', build: buildKnitScarfC },
  },
  wp_firewood: {
    slot: 'back', name: '등에 멘 장작 바구니',
    A: { name: '비스듬 등바구니', note: '왼쪽 어깨 고리바구니 + 세운 장작·솔가지', build: buildFirewoodA },
    B: { name: '지게 장작', note: '나무 지게 두 다리 + 장작 두 묶음(가운데 트임)', build: buildFirewoodB },
    C: { name: '장작 멜빵 자루', note: '가로로 누운 장작 + 겨자색 천 자루 + 솔가지', build: buildFirewoodC },
  },
  wp_firewood_v2: {
    slot: 'back', cols: 'back2', name: '등에 멘 장작 바구니 v2', rows: ['REF', 'D', 'E', 'F'],
    REF: { name: '기존 바구니(basket)', note: '카탈로그 기존 아이템 · 옆구리 앵커 · 비교용', ref: 'basket', anchor: 'side' },
    D: { name: '다래끼 등바구니', note: '위가 넓은 납작 고리바구니를 등 위쪽에 높이 · 장작 4개 꽂음', build: buildFirewoodD },
    E: { name: '지게 고리상자', note: '어깨 위 가로 고리상자 + 가로 장작 · 양옆 지게 다리로 받침', build: buildFirewoodE },
    F: { name: '쌍바구니 멜대', note: '척추 양옆 작은 바구니 두 개 + 가운데 멜대 · 꼬리 자리 비움', build: buildFirewoodF },
  },
  wp_boot_trail: {
    slot: 'trail', name: '털장화 발자국',
    A: { name: '밑창 + 털 뭉치', note: '갈색 밑창 줄무늬 + 뒤꿈치 털 뭉치', build: buildBootTrailA },
    B: { name: '눈 위 장화 자국', note: '눌린 눈 그림자 + 솟은 눈 테두리 + 튄 눈', build: buildBootTrailB },
    C: { name: '하트 굽 장화', note: '베리 밑창 + 갈매기 무늬 + 하트 굽 + 떠오르는 털', build: buildBootTrailC },
  },
};
