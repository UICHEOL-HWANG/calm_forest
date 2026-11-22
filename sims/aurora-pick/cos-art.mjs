import { tubeAlong, withAnchors, flatten, backFront, surfLocal } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn } from '../../js/cosmetics/art-xmas-pick.js';
import { packY } from '../../js/cosmetics/art-dessert-pick.js';

export const AU = Object.freeze({
  navy: 0x26335e, navyDk: 0x1a2446,
  mint: 0x5cc4ac, mintDk: 0x3a9886,
  violet: 0x8c70cc, violetDk: 0x6a52a6,
  pink: 0xd47cac, pinkDk: 0xac5a88,
  ice: 0xa6d2e4, iceDk: 0x7cacc4,
  fur: 0xccdbe6, furDk: 0xaabccc,
  wood: 0x8a6242, woodDk: 0x5e402a, silver: 0xa9b3c2,
  gMint: 0x7ee6c6, gViolet: 0xb49cf0, gPink: 0xf0a2d0, gIce: 0xa8dcf0,
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
    ico: (r, d = 1) => new THREE.IcosahedronGeometry(r, d),
    cyl: (a, b, hh, s = 16, open = false) => new THREE.CylinderGeometry(a, b, hh, s, 1, open),
    tor: (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc),
    box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
    grp: (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; },
    tube: (p, pts, r, c, seg = 24, rad = 7) => { const m = tubeAlong(THREE, pts, r, h.clay(c, false), seg, rad); p.add(m); return m; },
  };
}

function ribbonGeo(THREE, w, L, sway, depth) {
  const sh = new THREE.Shape(), n = 10, l = [], r = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.sin(t * Math.PI * 1.4) * sway, hw = w / 2 * (1 - t * 0.85);
    l.push([x - hw, t * L]); r.push([x + hw, t * L]);
  }
  sh.moveTo(...l[0]); l.slice(1).forEach(p => sh.lineTo(...p)); r.reverse().forEach(p => sh.lineTo(...p)); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: depth * 0.5, bevelThickness: depth * 0.5, bevelSegments: 2 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function bandAt(K, band, HR, a, rr = 1.08) {
  const e = K.grp(band, Math.cos(a) * HR * rr, Math.sin(a) * HR * rr, 0);
  e.rotation.z = a - Math.PI / 2;
  return e;
}

function bandBase(K, g, HR, c, t = 0.055) {
  const band = K.grp(g); band.rotation.x = 0.45;
  K.add(band, K.tor(HR * 1.08, HR * t, 6, 32, Math.PI), c, 0, 0, 0, true);
  return band;
}

export function buildBandA(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, band = bandBase(K, g, HR, AU.navy);
  [[2.0, AU.mint, 0.95, -0.3], [2.3, AU.violet, 0.8, -0.1], [2.6, AU.pink, 0.62, 0.15]].forEach(([a, c, L, tilt]) => {
    const e = bandAt(K, band, HR, a); e.rotation.z += tilt;
    K.add(e, ribbonGeo(THREE, HR * 0.3, HR * L, HR * 0.1, HR * 0.05), c, 0, -HR * 0.05, 0);
  });
  [0.9, 1.3, 1.8, 2.2].forEach(a => K.add(bandAt(K, band, HR, a, 1.13), K.sph(HR * 0.03, 8, 6), AU.ice));
  flatten(THREE, g);
}

function crystal(K, p, s, c, x, y, z, rz) {
  const m = K.add(p, new K.THREE.OctahedronGeometry(s, 0), c, x, y, z, true);
  m.scale.set(0.45, 1.3, 0.45); m.rotation.z = rz; return m;
}

function flake(K, p, s, c) {
  for (let i = 0; i < 3; i++) {
    const a = K.grp(p); a.rotation.z = i * Math.PI / 3;
    K.add(a, K.box(s * 2, s * 0.16, s * 0.12), c);
    [-1, 1].forEach(sd => [-1, 1].forEach(e => { const b = K.add(a, K.box(s * 0.5, s * 0.12, s * 0.1), c, sd * s * 0.62, e * s * 0.13, 0); b.rotation.z = e * sd * 0.8; }));
  }
  K.add(p, K.sph(s * 0.2, 10, 8), c);
}

export function buildBandB(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, band = bandBase(K, g, HR, AU.iceDk, 0.05);
  const e = bandAt(K, band, HR, 2.3);
  [[0, 0.34, AU.ice, 0], [-0.16, 0.22, AU.ice, 0.55], [0.16, 0.24, AU.iceDk, -0.5], [0.3, 0.15, AU.ice, -0.95], [-0.29, 0.13, AU.iceDk, 0.95]].forEach(([x, s, c, rz]) =>
    crystal(K, e, HR * s * 0.85, c, x * HR * 1.5, HR * s * 0.9, 0, rz));
  const f = bandAt(K, band, HR, 1.75, 1.12); f.rotation.x = -0.25;
  flake(K, f, HR * 0.15, AU.fur);
  [1.2, 1.55].forEach(a => K.add(bandAt(K, band, HR, a, 1.12), K.sph(HR * 0.035, 8, 6), AU.mint));
  flatten(THREE, g);
}

export function buildBandC(THREE, g, k, h) {
  const K = kit(THREE, h), HR = k.HR, band = K.grp(g); band.rotation.x = 0.45;
  for (let i = 0; i <= 22; i++) {
    const a = 0.06 + (Math.PI - 0.12) * i / 22, e = bandAt(K, band, HR, a, 1.08);
    K.add(e, K.ico(HR * (0.085 + 0.012 * (i % 2)), 1), i % 3 ? AU.fur : AU.furDk);
  }
  const b = bandAt(K, band, HR, 2.3, 1.16); b.rotation.z += 0.2; b.scale.setScalar(1.7);
  [-1, 1].forEach(s => {
    const loop = K.grp(b, s * HR * 0.17, HR * 0.04, 0); loop.rotation.z = s * 0.35;
    const m = K.add(loop, K.sph(HR * 0.16, 16, 12), s < 0 ? AU.violet : AU.pink); m.scale.set(1.1, 0.62, 0.34);
  });
  [[-0.06, AU.mint, 0.55], [0.07, AU.violetDk, 0.45]].forEach(([x, c, L]) => {
    const t = K.grp(b, x * HR, -HR * 0.02, HR * 0.02); t.rotation.z = Math.PI + x * 3;
    K.add(t, ribbonGeo(THREE, HR * 0.13, HR * L, HR * 0.06, HR * 0.03), c);
  });
  K.add(b, K.sph(HR * 0.07, 12, 10), AU.pinkDk, 0, HR * 0.03, HR * 0.03);
  flatten(THREE, g);
}

function hang(THREE, K, k, g, r, build, drop = 0.3, out = 1.12) {
  const w = new THREE.Group(); build(w);
  stickOn(THREE, k, g, w, K.V(0, -r * drop, r), out);
}

function pom(K, p, r, c, x, y, z) {
  K.add(p, K.ico(r, 2), c, x, y, z);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.39996, t = (i + 0.5) / 8, ry = 1 - 2 * t, rr = Math.sqrt(1 - ry * ry);
    K.add(p, K.ico(r * 0.42, 1), c, x + Math.cos(a) * rr * r * 0.82, y + ry * r * 0.82, z + Math.sin(a) * rr * r * 0.82);
  }
}

function furRing(K, g, r, y, n, pr, cols, jitter = 0) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + jitter;
    K.add(g, K.ico(pr * (0.9 + 0.2 * ((i * 7) % 3) / 2), 1), cols[i % cols.length], Math.sin(a) * r, y, Math.cos(a) * r);
  }
}

export function buildMuffA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  K.add(g, K.tor(r, r * 0.26, 8, 36), AU.furDk, 0, r * 0.04, 0).rotation.x = Math.PI / 2;
  furRing(K, g, r * 1.02, r * 0.16, 16, r * 0.24, [AU.fur, AU.fur, AU.furDk]);
  furRing(K, g, r * 1.1, -r * 0.1, 18, r * 0.24, [AU.fur, AU.furDk, AU.fur], 0.17);
  hang(THREE, K, k, g, r, w => {
    [-1, 1].forEach(s => {
      K.tube(w, [K.V(s * r * 0.08, 0, 0), K.V(s * r * 0.11, -r * 0.14, r * 0.02), K.V(s * r * 0.15, -r * 0.3, r * 0.02)], r * 0.02, AU.mintDk, 10, 5);
      pom(K, w, r * 0.12, s < 0 ? AU.mint : AU.violet, s * r * 0.15, -r * 0.4, r * 0.03);
    });
  }, 0.18, 1.3);
  flatten(THREE, g);
}

export function buildMuffB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const cowl = K.add(g, K.tor(r * 1.0, r * 0.26, 10, 40), AU.navy, 0, -r * 0.02, 0);
  cowl.rotation.x = Math.PI / 2; cowl.scale.set(1, 1, 1.4);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * TAU;
    K.add(g, K.box(r * 0.06, r * 0.5, r * 0.06), AU.navyDk, Math.sin(a) * r * 1.25, -r * 0.04, Math.cos(a) * r * 1.25).rotation.y = a;
  }
  furRing(K, g, r * 1.05, r * 0.3, 20, r * 0.15, [AU.fur, AU.furDk]);
  hang(THREE, K, k, g, r, w => {
    [[-1, AU.violet], [1, AU.pink]].forEach(([s, c]) => {
      const t = K.grp(w, s * r * 0.05, 0, r * 0.02); t.rotation.z = Math.PI + s * 0.35;
      K.add(t, ribbonGeo(THREE, r * 0.2, r * 0.55, r * 0.06, r * 0.04), c);
    });
    K.add(w, K.sph(r * 0.09, 12, 10), AU.mint, 0, 0, r * 0.05);
  }, 0.15, 1.42);
  flatten(THREE, g);
}

export function buildMuffC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), r = k.neckR;
  const prof = [[r * 1.0, r * 0.2], [r * 1.16, 0], [r * 1.34, -r * 0.24], [r * 1.5, -r * 0.5], [r * 1.42, -r * 0.54], [r * 1.24, -r * 0.3], [r * 1.02, -r * 0.04], [r * 0.94, r * 0.2]];
  K.add(g, new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 40), AU.fur);
  K.add(g, K.tor(r * 1.04, r * 0.24, 8, 36), AU.fur, 0, r * 0.12, 0).rotation.x = Math.PI / 2;
  furRing(K, g, r * 1.08, r * 0.22, 20, r * 0.16, [AU.fur, AU.furDk]);
  hang(THREE, K, k, g, r, w => flake(K, w, r * 0.17, AU.silver), 0.2, 1.4);
  flatten(THREE, g);
}

function packFrame(K, g, k, k0, lift = 0) {
  const c = backFront(k, packY(k0) + lift), f = K.grp(g, 0, c.y, c.z);
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

function sled(K, f, R, z, slatCols, runner) {
  const w = R * 0.8, H = R * 0.6, d = R * 0.04;
  for (let i = 0; i < 5; i++) K.add(f, K.box(w, R * 0.105, d), slatCols[i % slatCols.length], 0, -H / 2 + R * 0.06 + i * (H - R * 0.12) / 4, z);
  [-1, 1].forEach(s => {
    const x = s * w * 0.36, rz = z - d * 0.5 - R * 0.05;
    K.add(f, K.box(R * 0.07, H * 0.92, R * 0.05), AU.woodDk, x, 0, z - d * 0.5 - R * 0.02);
    K.tube(f, [K.V(x, -H / 2 - R * 0.02, rz + R * 0.02), K.V(x, -H / 2 + R * 0.1, rz - R * 0.02), K.V(x, H / 2 - R * 0.05, rz - R * 0.02), K.V(x, H / 2 + R * 0.08, rz - R * 0.08), K.V(x, H / 2 + R * 0.06, rz - R * 0.18), K.V(x, H / 2 - R * 0.02, rz - R * 0.16)], R * 0.036, runner, 30, 7);
  });
  return { w, H, d };
}

export function buildSledA(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.06), z = -R * 0.05;
  const { w, H } = sled(K, f, R, z, [AU.wood, AU.wood], AU.silver);
  [AU.mint, AU.violet, AU.pink].forEach((c, i) => K.add(f, K.box(w * 0.9, R * 0.03, R * 0.012), c, 0, (i - 1) * R * 0.034, z - R * 0.026));
  K.tube(f, [K.V(-w * 0.36, H / 2 + R * 0.04, z - R * 0.12), K.V(0, H / 2 - R * 0.06, z - R * 0.1), K.V(w * 0.36, H / 2 + R * 0.04, z - R * 0.12)], R * 0.014, AU.navy, 16, 5);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.18, H * 0.3, -R * 0.02), K.V(R * 0.18, H * 0.3, -R * 0.02)], AU.navyDk);
  flatten(THREE, g);
}

export function buildSledB(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.06), z = -R * 0.05;
  const { w, H } = sled(K, f, R, z, [AU.wood, AU.woodDk], AU.iceDk);
  K.add(f, K.cyl(R * 0.14, R * 0.14, w * 0.9, 18), AU.fur, 0, R * 0.02, z - R * 0.2).rotation.z = Math.PI / 2;
  [-1, 1].forEach(s => K.add(f, K.cyl(R * 0.145, R * 0.145, R * 0.03, 18), AU.furDk, s * w * 0.46, R * 0.02, z - R * 0.2).rotation.z = Math.PI / 2);
  [-0.22, 0.22].forEach(x => K.add(f, K.tor(R * 0.15, R * 0.018, 6, 20), AU.navy, x * R, R * 0.02, z - R * 0.2).rotation.y = Math.PI / 2);
  const bw = K.grp(f, R * 0.22, R * 0.02, z - R * 0.36);
  [-1, 1].forEach(s => K.add(bw, K.sph(R * 0.06, 12, 10), AU.mint, s * R * 0.06, R * 0.02, 0).scale.set(1, 0.6, 0.4));
  K.add(bw, K.sph(R * 0.03, 10, 8), AU.mintDk, 0, R * 0.02, 0);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.18, H * 0.3, -R * 0.02), K.V(R * 0.18, H * 0.3, -R * 0.02)], AU.navyDk);
  flatten(THREE, g);
}

export function buildSledC(THREE, g, k0, h) {
  const K = kit(THREE, h), k = withAnchors(k0), R = k.R;
  const f = packFrame(K, g, k, k0, 0.06), z = -R * 0.05, w = R * 0.72, H = R * 0.62;
  const curve = new THREE.CatmullRomCurve3([K.V(0, -H / 2, z), K.V(0, H * 0.2, z), K.V(0, H / 2, z - R * 0.03), K.V(0, H / 2 + R * 0.1, z - R * 0.12), K.V(0, H / 2 + R * 0.05, z - R * 0.22), K.V(0, H / 2 - R * 0.04, z - R * 0.2)]);
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = curve.getPointAt(i / n), b = curve.getPointAt((i + 1) / n);
    const seg = K.add(f, K.box(w, R * 0.03, a.distanceTo(b) * 1.15), AU.ice, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    seg.quaternion.setFromUnitVectors(K.V(0, 0, 1), b.clone().sub(a).normalize());
  }
  [[AU.violet, -0.2], [AU.pink, 0], [AU.mint, 0.2]].forEach(([c, dx]) => K.add(f, K.box(R * 0.08, H * 0.86, R * 0.012), c, dx * R, -H * 0.06, z - R * 0.022));
  [-1, 1].forEach(s => K.tube(f, [K.V(s * w * 0.52, -H / 2 + R * 0.02, z - R * 0.02), K.V(s * w * 0.56, -H * 0.1, z - R * 0.06), K.V(s * w * 0.56, H * 0.25, z - R * 0.06), K.V(s * w * 0.52, H / 2 - R * 0.02, z - R * 0.03)], R * 0.016, AU.navy, 20, 5));
  K.tube(f, [K.V(-w * 0.42, H / 2 + R * 0.02, z - R * 0.2), K.V(0, H / 2 - R * 0.1, z - R * 0.26), K.V(w * 0.42, H / 2 + R * 0.02, z - R * 0.2)], R * 0.016, AU.navy, 16, 5);
  packStraps(THREE, g, k, h, f, [K.V(-R * 0.18, H * 0.3, -R * 0.02), K.V(R * 0.18, H * 0.3, -R * 0.02)], AU.navyDk);
  flatten(THREE, g);
}

function glowMat(THREE, o) {
  return new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });
}

function stripGeo(THREE, rows) {
  const pos = [], col = [], idx = [];
  rows.forEach(([a, b, c0, c1], i) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const ca = new THREE.Color(c0), cb = new THREE.Color(c1 ?? c0);
    col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
    if (i) { const q = i * 2; idx.push(q - 2, q - 1, q, q - 1, q + 1, q); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}

const grad = (THREE, cs, t) => {
  const n = cs.length - 1, i = Math.min(n - 1, Math.floor(t * n));
  return new THREE.Color(cs[i]).lerp(new THREE.Color(cs[i + 1]), t * n - i).getHex();
};

function glowMesh(THREE, g, geo, o, y = 0, order = 8) {
  const m = new THREE.Mesh(geo, glowMat(THREE, o)); m.position.y = y; m.renderOrder = order; g.add(m); return m;
}

export function buildAuroraTrailA(THREE, g, s0, o) {
  const s = s0 * 1.5, rows = [], cs = [AU.gMint, AU.gViolet, AU.gPink];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, z = (t - 0.5) * s * 2.2, x = Math.sin(t * Math.PI * 2) * s * 0.35, w = s * (0.12 + 0.16 * Math.sin(Math.PI * t));
    const c = grad(THREE, cs, t);
    rows.push([new THREE.Vector3(x - w, 0, z), new THREE.Vector3(x + w, 0, z), c, c]);
  }
  glowMesh(THREE, g, stripGeo(THREE, rows), o, 0.006);
}

export function buildAuroraTrailB(THREE, g, s0, o) {
  const s = s0 * 1.3, rows = [], foot = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, x = (t - 0.5) * s * 1.8, z = Math.sin(t * Math.PI * 2.2) * s * 0.3, hh = s * (0.5 + 0.7 * Math.sin(Math.PI * t));
    rows.push([new THREE.Vector3(x, 0, z), new THREE.Vector3(x + s * 0.06, hh, z - s * 0.1), AU.gMint, t < 0.5 ? AU.gViolet : AU.gPink]);
    foot.push([new THREE.Vector3(x, 0, z - s * 0.12), new THREE.Vector3(x, 0, z + s * 0.12), AU.gIce, AU.gIce]);
  }
  glowMesh(THREE, g, stripGeo(THREE, rows), o * 0.85, 0.004);
  glowMesh(THREE, g, stripGeo(THREE, foot), o * 0.6, 0.003, 7);
}

export function buildAuroraTrailC(THREE, g, s0, o) {
  const s = s0 * 1.2;
  const padMat = new THREE.MeshBasicMaterial({ color: AU.gIce, transparent: true, opacity: o * 0.7, depthWrite: false });
  [[0, 0, 0.5], [-0.5, 0.55, 0.17], [-0.18, 0.75, 0.17], [0.18, 0.75, 0.17], [0.5, 0.55, 0.17]].forEach(([x, z, r]) => {
    const t = new THREE.Mesh(new THREE.CircleGeometry(s * r, 6), padMat); t.rotation.x = -Math.PI / 2; t.position.set(x * s, 0.005, z * s); t.renderOrder = 7; g.add(t);
  });
  const rows = [], cs = [AU.gMint, AU.gViolet, AU.gPink];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, a = t * TAU * 1.25, r = s * (0.55 - 0.3 * t), y = s * (0.25 + 1.6 * t), w = s * 0.16 * (1 - 0.6 * t);
    const c = grad(THREE, cs, t);
    rows.push([new THREE.Vector3(Math.cos(a) * r, y - w, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r, y + w, Math.sin(a) * r), c, c]);
  }
  glowMesh(THREE, g, stripGeo(THREE, rows), o * 0.9, 0);
}

export const VARIANTS = {
  au_aurora_band: {
    slot: 'head', name: '오로라 머리띠', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '오로라 리본 머리띠', note: '남색 띠 · 왼쪽에 민트·보라·분홍 물결 리본 셋이 불꽃처럼 · 얼음 구슬', build: buildBandA },
    B: { name: '얼음 결정 머리띠', note: '얼음색 띠 · 왼쪽에 길쭉한 얼음 결정 다섯 · 흰 눈송이 · 민트 구슬', build: buildBandB },
    C: { name: '털 띠 오로라 리본', note: '보송한 흰 털 띠 · 옆에 보라·분홍 리본 매듭 · 민트 꼬리', build: buildBandC },
    REF: { name: '초승달 머리핀', note: '출시된 밤하늘 머리핀 (비교용)', ref: 'ns_moon_pin' },
  },
  au_fur_muff: {
    slot: 'neck', name: '털 목도리', rec: 'A', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '보송 털 목도리', note: '흰 털 뭉치 두 줄 · 앞에 민트·보라 방울 끈 둘', build: buildMuffA },
    B: { name: '남색 넥워머 털 테두리', note: '두툼한 남색 골지 통 · 위에 흰 털 테두리 · 보라·분홍 리본 핀', build: buildMuffB },
    C: { name: '털 어깨망토', note: '어깨로 퍼지는 흰 털 망토 · 굵은 털 깃 · 은빛 눈송이 걸쇠', build: buildMuffC },
    REF: { name: '은하수 목도리', note: '출시된 밤하늘 목도리 (비교용)', ref: 'ns_galaxy_scarf' },
  },
  au_sled_pack: {
    slot: 'back', cols: 'pack', name: '썰매 배낭', rec: 'A', rows: ['A', 'B', 'C', 'REF2'],
    A: { name: '나무 썰매', note: '나무 살 다섯 · 은빛 날이 위로 말림 · 가운데 민트·보라·분홍 줄 · 남색 끈', build: buildSledA },
    B: { name: '짐 실은 썰매', note: '나무 썰매에 흰 털 담요 말이 · 남색 끈 둘 · 민트 리본', build: buildSledB },
    C: { name: '얼음색 터보건', note: '끝이 J로 말린 판 하나 · 보라·분홍·민트 줄 · 남색 손잡이 끈', build: buildSledC },
    REF2: { name: '별 랜턴 배낭', note: '출시된 밤하늘 배낭 (비교용)', ref: 'ns_star_lantern_pack', anchor: 'back' },
  },
  au_aurora_trail: {
    slot: 'trail', name: '오로라 꼬리 발자국', rec: 'B', rows: ['A', 'B', 'C', 'REF'],
    A: { name: '바닥 오로라 띠', note: '바닥에 누운 S자 빛 띠 · 민트→보라→분홍', build: buildAuroraTrailA },
    B: { name: '작은 오로라 커튼', note: '발자국마다 서 있는 물결 빛 커튼 · 아래 민트 위 보라·분홍', build: buildAuroraTrailB },
    C: { name: '발바닥과 빛 회오리', note: '얼음빛 발바닥 · 위로 감겨 오르는 리본', build: buildAuroraTrailC },
    REF: { name: '유성 발자국', note: '출시된 밤하늘 발자국 (비교용)', ref: 'ns_meteor_trail' },
  },
};
