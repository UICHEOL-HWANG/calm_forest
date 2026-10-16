import * as THREE from 'three';
import { terrainHeight, slopePoint } from '../../../../js/mountain/terrain.js';
import { CLIMB_PATH, CLIMB_START } from '../../../../js/mountain/climb.js';
import { COURSE, centerX } from '../../../../js/mountain/course.js';
import { buildSledMesh } from '../../../../js/mountain/sled-art.js';

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  log: new THREE.CylinderGeometry(0.5, 0.5, 1, 7),
  taper: new THREE.CylinderGeometry(0.36, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
  icicle: new THREE.ConeGeometry(0.5, 1, 5),
  sph: new THREE.IcosahedronGeometry(0.5, 1),
  ball: new THREE.IcosahedronGeometry(0.5, 2),
  prism: new THREE.CylinderGeometry(0.5, 0.5, 1, 3),
  tri: new THREE.CylinderGeometry(0.5, 0.5, 1, 3),
};
const SLED_GEO = buildSledMesh(THREE).geometry;

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const jit = (hex, a = 0.06) => new THREE.Color(hex).offsetHSL(0, 0, (rnd() - 0.5) * a).getHex();

const SNOW = 0xf7fafd, SNOW_S = 0xe3eaf3, ICE = 0xd9ecfa, STONE = 0x9aa1ad, STONE_D = 0x737a87, LAMP = 0xffd27a, FIRE = 0xff8a2a, ROPE = 0xd8c39a, SKIN = 0xf2c9a0, IRON = 0x3a3d44, CUT = 0xd6ad78;

const THEMES = {
  A: { wall: 0x8a5a36, wallD: 0x5e3b22, plank: 0x9a6a44, roof: 0x6b4a2e, shutter: 0x4f6b3a, flagA: 0xe0443a, flagB: 0x2f6fd6, cloth: 0xe0443a, coat: 0x3f6b34, bunting: [0xe0443a, 0xffd04a, 0x2f6fd6] },
  B: { wall: 0xf1ece2, wallD: 0x6e4226, plank: 0x8a5530, roof: 0x9c3a2c, shutter: 0xc8483a, flagA: 0xe0443a, flagB: 0xf7fafd, cloth: 0xc8483a, coat: 0xc8483a, bunting: [0xe0443a, 0xf7fafd] },
  C: { wall: 0x4a3426, wallD: 0x2f2119, plank: 0x5a4030, roof: 0x34465c, shutter: 0x2f2119, flagA: 0xffb347, flagB: 0x2f6fd6, cloth: 0x2f6fd6, coat: 0x2f6fd6, bunting: [0xffb347, 0x2f6fd6, 0xf7fafd] },
};

function makeSink() {
  const solid = [], glow = [];
  const add = (geo, color, pos, scl = [1, 1, 1], rot = [0, 0, 0], lit = false) => {
    const g = geo.clone().toNonIndexed();
    g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ')), new THREE.Vector3(...scl)));
    if (!g.getAttribute('color')) {
      const c = new THREE.Color(color), n = g.getAttribute('position').count, arr = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) arr.set([c.r, c.g, c.b], k * 3);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    (lit ? glow : solid).push(g);
  };
  return { add, solid, glow };
}

function mergeAll(geos) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'color']) {
    const arr = new Float32Array(geos.reduce((t, g) => t + g.getAttribute(name).array.length, 0));
    geos.reduce((o, g) => { arr.set(g.getAttribute(name).array, o); return o + g.getAttribute(name).array.length; }, 0);
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  out.computeVertexNormals();
  return out;
}

const Y = (x, z) => terrainHeight(x, z);
const PEAK_Y = slopePoint(0, 0).y;

function frame(x, z, ry, y0) {
  const fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
  return { ry, at: (f, r, h) => [x + fx * f + rx * r, y0 + h, z + fz * f + rz * r], rot: (a = 0, c = 0, b = 0) => [a, ry + b, c] };
}

function gableRoof(S, F, { w, d, eave, rise, roof, fill, fascia, rows = 5, over = 0.55 }) {
  const half = d / 2, th = Math.atan2(rise, half), run = half + over, len = run / Math.cos(th), ridge = eave + rise;
  [-1, 1].forEach(sd => {
    for (let i = 0; i < rows; i++) {
      const s0 = (i + 0.5) * (len / rows), lift = 0.04 * (rows - i);
      const f = sd * Math.cos(th) * s0, h = ridge - Math.sin(th) * s0 + lift;
      S.add(G.box, jit(roof, i % 2 ? 0.07 : 0.03), F.at(f, 0, h + 0.1), [w + 1.1, 0.13, len / rows + 0.14], F.rot(sd * th));
    }
    const sf = sd * Math.cos(th) * len * 0.42, sh = ridge - Math.sin(th) * len * 0.42;
    S.add(G.box, SNOW, F.at(sf, 0, sh + 0.32), [w + 0.95, 0.26, len * 0.86], F.rot(sd * th));
    S.add(G.box, SNOW_S, F.at(sd * Math.cos(th) * len * 0.93, 0, ridge - Math.sin(th) * len * 0.93 + 0.22), [w + 1.05, 0.2, 0.3], F.rot(sd * th));
    const ef = sd * Math.cos(th) * len, eh = ridge - Math.sin(th) * len;
    S.add(G.box, fascia, F.at(ef, 0, eh + 0.02), [w + 1.15, 0.22, 0.1], F.rot(sd * th));
    for (let r = -(w + 1) / 2 + 0.2; r <= (w + 1) / 2 - 0.1; r += 0.32 + rnd() * 0.22) {
      const l = 0.18 + rnd() * 0.42;
      S.add(G.icicle, ICE, F.at(ef + sd * 0.02, r, eh - l / 2 - 0.04), [0.1, l, 0.1], F.rot(Math.PI));
    }
    [-1, 1].forEach(sr => S.add(G.box, fascia, F.at(sd * Math.cos(th) * len / 2, sr * (w / 2 + 0.55), ridge - Math.sin(th) * len / 2 + 0.18), [0.12, 0.26, len + 0.1], F.rot(sd * th)));
  });
  S.add(G.ball, SNOW, F.at(0, 0, ridge + 0.42), [w + 1.0, 0.36, 0.7]);
  [-1, 1].forEach(sr => S.add(G.tri, fill, F.at(0, sr * (w / 2 - 0.04), eave + rise / 3), [d / 0.866, 0.14, rise / 0.75], F.rot(-Math.PI / 2, -Math.PI / 2)));
  return { ridge, th };
}

function windowAt(S, F, t, f, r, h, ww = 0.9, wh = 0.8, shutters = true) {
  S.add(G.box, LAMP, F.at(f + 0.02, r, h), [ww, wh, 0.05], F.rot(), true);
  S.add(G.box, t.wallD, F.at(f + 0.06, r, h), [ww, 0.07, 0.06], F.rot());
  S.add(G.box, t.wallD, F.at(f + 0.06, r, h), [0.07, wh, 0.06], F.rot());
  [-1, 1].forEach(s => {
    S.add(G.box, t.wallD, F.at(f + 0.07, r, h + s * (wh / 2 + 0.05)), [ww + 0.2, 0.1, 0.1], F.rot());
    S.add(G.box, t.wallD, F.at(f + 0.07, r + s * (ww / 2 + 0.05), h), [0.1, wh + 0.2, 0.1], F.rot());
    if (shutters) {
      S.add(G.box, t.shutter, F.at(f + 0.06, r + s * (ww / 2 + 0.33), h), [0.42, wh + 0.12, 0.06], F.rot());
      S.add(G.box, jit(t.shutter, 0.15), F.at(f + 0.1, r + s * (ww / 2 + 0.33), h), [0.32, 0.08, 0.03], F.rot());
    }
  });
  S.add(G.box, t.wallD, F.at(f + 0.15, r, h - wh / 2 - 0.1), [ww + 0.35, 0.08, 0.3], F.rot());
  S.add(G.ball, SNOW, F.at(f + 0.15, r, h - wh / 2 - 0.02), [ww + 0.3, 0.12, 0.3]);
}

function doorAt(S, F, t, f, r, h) {
  for (let i = -1; i <= 1; i++) S.add(G.box, jit(t.plank, 0.08), F.at(f + 0.03, r + i * 0.3, h + 0.95), [0.29, 1.9, 0.06], F.rot());
  S.add(G.box, t.wallD, F.at(f + 0.07, r, h + 0.6), [0.9, 0.08, 0.04], F.rot());
  S.add(G.box, t.wallD, F.at(f + 0.07, r, h + 1.35), [0.9, 0.08, 0.04], F.rot());
  S.add(G.sph, 0xd9b45a, F.at(f + 0.1, r + 0.3, h + 1.0), [0.08, 0.08, 0.08]);
  [-1, 1].forEach(s => S.add(G.box, t.wallD, F.at(f + 0.06, r + s * 0.52, h + 1.0), [0.12, 2.05, 0.12], F.rot()));
  S.add(G.box, t.wallD, F.at(f + 0.06, r, h + 2.03), [1.16, 0.14, 0.12], F.rot());
  S.add(G.box, t.roof, F.at(f + 0.45, r, h + 2.35), [1.5, 0.1, 0.9], F.rot(0.35));
  S.add(G.box, SNOW, F.at(f + 0.42, r, h + 2.46), [1.4, 0.12, 0.75], F.rot(0.35));
  lantern(S, F.at(f + 0.25, r + 0.85, h + 1.55), t, 0.8);
}

function lantern(S, p, t, k = 1) {
  const [x, y, z] = p;
  S.add(G.box, LAMP, [x, y, z], [0.2 * k, 0.26 * k, 0.2 * k], [0, 0, 0], true);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => S.add(G.box, IRON, [x + a * 0.11 * k, y, z + b * 0.11 * k], [0.03 * k, 0.3 * k, 0.03 * k]));
  S.add(G.cone, IRON, [x, y + 0.2 * k, z], [0.34 * k, 0.16 * k, 0.34 * k]);
  S.add(G.box, IRON, [x, y - 0.15 * k, z], [0.26 * k, 0.04 * k, 0.26 * k]);
}

function stoneRing(S, F, w, d, h) {
  const per = [];
  for (let r = -w / 2; r <= w / 2; r += 0.5) per.push([d / 2, r], [-d / 2, r]);
  for (let f = -d / 2 + 0.5; f < d / 2; f += 0.5) per.push([f, w / 2], [f, -w / 2]);
  per.forEach(([f, r]) => S.add(G.sph, jit(STONE, 0.18), F.at(f * 1.04, r * 1.04, h + rnd() * 0.1), [0.62 + rnd() * 0.2, 0.5 + rnd() * 0.15, 0.55 + rnd() * 0.2], F.rot(0, 0, rnd() * 3)));
}

function logWalls(S, F, t, w, d, h0, h1) {
  const step = 0.3;
  let i = 0;
  for (let h = h0 + 0.15; h < h1; h += step, i++) {
    const off = i % 2 ? step / 2 : 0;
    [-1, 1].forEach(s => {
      S.add(G.log, jit(t.wall, 0.08), F.at(s * d / 2, 0, h), [0.3, w + 0.55, 0.3], F.rot(0, Math.PI / 2));
      S.add(G.log, jit(t.wall, 0.08), F.at(0, s * w / 2, h + off), [0.3, d + 0.55, 0.3], F.rot(Math.PI / 2));
    });
  }
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
    for (let h = h0 + 0.15; h < h1; h += step) S.add(G.cyl, CUT, F.at(a * (d / 2), b * (w / 2 + 0.29), h), [0.26, 0.02, 0.26], F.rot(Math.PI / 2, 0, 0));
  });
  S.add(G.box, t.wallD, F.at(0, 0, (h0 + h1) / 2), [w - 0.2, h1 - h0, d - 0.2], F.rot());
}

function chimney(S, F, f, r, h0, h) {
  for (let y = 0; y < h; y += 0.32) S.add(G.box, jit(STONE_D, 0.16), F.at(f, r, h0 + y + 0.16), [0.62, 0.3, 0.62], F.rot(0, 0, (rnd() - 0.5) * 0.12));
  S.add(G.box, IRON, F.at(f, r, h0 + h + 0.08), [0.78, 0.1, 0.78], F.rot());
  S.add(G.ball, SNOW, F.at(f, r, h0 + h + 0.2), [0.7, 0.18, 0.7]);
  [0.5, 1.1, 1.8, 2.6].forEach((k, i) => S.add(G.ball, 0xeef2f6, F.at(f - k * 0.25, r + k * 0.35, h0 + h + 0.6 + k * 0.7), [0.45 + i * 0.22, 0.4 + i * 0.18, 0.45 + i * 0.22]));
}

function firewood(S, F, f, r, h, len = 1.6, rows = 4) {
  for (let y = 0; y < rows; y++) for (let x = 0; x < len / 0.24; x++) S.add(G.log, jit(CUT, 0.12), F.at(f, r - len / 2 + x * 0.24 + (y % 2) * 0.12, h + 0.12 + y * 0.21), [0.22, 0.6, 0.22], F.rot(Math.PI / 2));
  S.add(G.box, SNOW, F.at(f, r, h + rows * 0.21 + 0.1), [0.7, 0.1, len + 0.1], F.rot());
}

function sledLean(S, F, f, r, h, tilt) {
  const g = SLED_GEO.clone();
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...F.at(f, r, h)), new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2 + tilt, F.ry + Math.PI, 0, 'YXZ')), new THREE.Vector3(1.1, 1.1, 1.1));
  g.applyMatrix4(m);
  S.solid.push(g.index ? g.toNonIndexed() : g);
}

function hutLog(S, F, t) {
  const w = 5.2, d = 4.2, wallTop = 2.7;
  stoneRing(S, F, w, d, 0.2);
  S.add(G.box, STONE_D, F.at(0, 0, 0.35), [w + 0.2, 0.7, d + 0.2], F.rot());
  logWalls(S, F, t, w, d, 0.7, wallTop);
  gableRoof(S, F, { w, d, eave: wallTop, rise: 1.7, roof: t.roof, fill: t.wallD, fascia: t.wallD });
  doorAt(S, F, t, d / 2 + 0.15, w * 0.18, 0.7);
  windowAt(S, F, t, d / 2 + 0.15, -w * 0.24, 1.75);
  windowAt(S, F, t, 0, w / 2 + 0.2, 1.75, 0.8, 0.7);
  chimney(S, F, -d * 0.2, -w * 0.3, wallTop + 0.4, 2.3);
  firewood(S, F, 0.4, -w / 2 - 0.55, 0.7, 1.8, 5);
  deck(S, F, t, d / 2 + 1.0, w, 0.7);
}

function hutChalet(S, F, t) {
  const w = 5.6, d = 4.4, lower = 1.6, wallTop = 3.4;
  stoneRing(S, F, w, d, 0.2);
  S.add(G.box, t.wall, F.at(0, 0, 0.2 + lower / 2), [w, lower + 0.4, d], F.rot());
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { for (let y = 0.3; y < lower + 0.2; y += 0.36) S.add(G.box, jit(STONE, 0.14), F.at(a * (d / 2 + 0.02), b * (w / 2 + 0.02), y + 0.15), [0.42, 0.3, 0.42], F.rot()); });
  for (let r = -w / 2 + 0.17; r < w / 2; r += 0.34) S.add(G.box, jit(t.plank, 0.09), F.at(d / 2 + 0.03, r, lower + 0.4 + (wallTop - lower - 0.4) / 2), [0.32, wallTop - lower - 0.4, 0.08], F.rot());
  S.add(G.box, t.plank, F.at(0, 0, lower + 0.4 + (wallTop - lower - 0.4) / 2), [w, wallTop - lower - 0.4, d], F.rot());
  gableRoof(S, F, { w, d, eave: wallTop, rise: 1.5, roof: t.roof, fill: t.plank, fascia: t.wallD, over: 0.8 });
  doorAt(S, F, t, d / 2 + 0.1, w * 0.22, 0.2);
  windowAt(S, F, t, d / 2 + 0.1, -w * 0.22, 1.05, 0.8, 0.7);
  windowAt(S, F, t, d / 2 + 0.1, -w * 0.22, lower + 1.15, 0.8, 0.7);
  windowAt(S, F, t, d / 2 + 0.1, w * 0.22, lower + 1.15, 0.8, 0.7);
  const bf = d / 2 + 0.75, bh = lower + 0.45;
  S.add(G.box, t.wallD, F.at(bf - 0.35, 0, bh), [w + 0.3, 0.14, 1.0], F.rot());
  for (let r = -w / 2; r <= w / 2 + 0.01; r += 0.28) S.add(G.box, jit(t.wallD, 0.06), F.at(bf + 0.1, r, bh + 0.42), [0.12, 0.7, 0.06], F.rot());
  S.add(G.box, t.wallD, F.at(bf + 0.1, 0, bh + 0.8), [w + 0.3, 0.1, 0.12], F.rot());
  for (let r = -w / 2 + 0.4; r < w / 2; r += 0.7) {
    S.add(G.box, t.wallD, F.at(bf + 0.22, r, bh + 0.92), [0.5, 0.18, 0.22], F.rot());
    S.add(G.ball, SNOW, F.at(bf + 0.22, r, bh + 1.04), [0.52, 0.14, 0.26]);
    S.add(G.sph, 0xe0443a, F.at(bf + 0.24, r + 0.12, bh + 1.06), [0.12, 0.12, 0.12]);
  }
  [-1, 1].forEach(s => S.add(G.box, t.wallD, F.at(bf - 0.1, s * (w / 2 - 0.1), bh - 0.6), [0.14, 1.3, 0.14], F.rot()));
  chimney(S, F, -d * 0.2, w * 0.28, wallTop + 0.3, 2.2);
  firewood(S, F, 0.2, -w / 2 - 0.5, 0.2, 2.2, 5);
}

function hutAframe(S, F, t) {
  const w = 4.4, d = 4.4, base = 0.6, rise = 3.7;
  stoneRing(S, F, w, d, 0.2);
  S.add(G.box, STONE_D, F.at(0, 0, 0.35), [w + 0.2, 0.7, d + 0.2], F.rot());
  const r = gableRoof(S, F, { w, d: d + 0.3, eave: base, rise, roof: t.roof, fill: t.wallD, fascia: t.wallD, rows: 7, over: 0.4 });
  const glass = [];
  for (let h = base + 0.3; h < base + rise - 0.4; h += 0.75) {
    const half = (d / 2) * (1 - (h - base) / rise) - 0.25;
    glass.push([h, half]);
  }
  S.add(G.tri, t.wallD, F.at(0, w / 2 - 0.05, base + rise / 3), [(d + 0.3) / 0.866, 0.2, rise / 0.75], F.rot(-Math.PI / 2, -Math.PI / 2));
  S.add(G.tri, LAMP, F.at(0, w / 2 + 0.02, base + rise / 3 - 0.1), [(d - 0.5) / 0.866, 0.06, (rise - 0.6) / 0.75], F.rot(-Math.PI / 2, -Math.PI / 2), true);
  glass.forEach(([h, half]) => S.add(G.box, t.wallD, F.at(0, w / 2 + 0.08, h), [half * 2, 0.08, 0.1], F.rot(0, 0, Math.PI / 2)));
  [-1, 0, 1].forEach(k => S.add(G.box, t.wallD, F.at(k * 0.8, w / 2 + 0.08, base + rise * 0.3), [0.1, rise * 0.6 * (1 - Math.abs(k) * 0.35), 0.08], F.rot(0, 0, Math.PI / 2)));
  const pf = 0, pr = w / 2 + 1.3;
  for (let i = -3; i <= 3; i++) S.add(G.box, jit(t.plank, 0.08), F.at(pf + i * 0.5, pr, 0.62), [0.46, 0.12, 2.2], F.rot(0, 0, Math.PI / 2));
  for (let i = 0; i < 11; i++) {
    const k = i / 10, f = -1.7 + k * 3.4;
    S.add(G.sph, i % 2 ? LAMP : 0xff9a6a, F.at(f, pr + 0.9, 2.2 - Math.sin(k * Math.PI) * 0.45), [0.16, 0.2, 0.16], F.rot(), true);
  }
  [-1.8, 1.8].forEach(f => S.add(G.box, t.wallD, F.at(f, pr + 0.9, 1.4), [0.12, 1.6, 0.12], F.rot()));
  chimney(S, F, -0.6, -w * 0.15, base + rise - 0.6, 1.4);
  firewood(S, F, 1.2, w / 2 + 0.4, 0.7, 1.4, 4);
}

function deck(S, F, t, f, w, h) {
  for (let r = -w / 2; r <= w / 2; r += 0.4) S.add(G.box, jit(t.plank, 0.08), F.at(f, r, h - 0.05), [1.6, 0.1, 0.38], F.rot(0, 0, Math.PI / 2));
  [-1, 1].forEach(s => S.add(G.box, t.wallD, F.at(f + 0.7, s * (w / 2 - 0.1), h - 0.3), [0.14, 0.6, 0.14], F.rot()));
}

function keeper(S, x, z, ry, t) {
  const y = PEAK_Y, F = frame(x, z, ry, y);
  [-1, 1].forEach(s => S.add(G.cyl, 0x4a3a30, F.at(0, s * 0.16, 0.2), [0.2, 0.4, 0.24]));
  S.add(G.taper, t.coat, F.at(0, 0, 0.75), [0.82, 0.9, 0.7]);
  S.add(G.box, 0xf7fafd, F.at(0.31, 0, 0.75), [0.08, 0.8, 0.14], F.rot());
  S.add(G.taper, 0xc8483a, F.at(0, 0, 1.25), [0.66, 0.16, 0.6]);
  S.add(G.box, 0xc8483a, F.at(0.3, 0.12, 1.05), [0.08, 0.36, 0.14], F.rot(0.2));
  S.add(G.ball, SKIN, F.at(0, 0, 1.62), [0.62, 0.6, 0.6]);
  S.add(G.sph, 0x2b2b30, F.at(0.27, 0.12, 1.66), [0.07, 0.09, 0.05]);
  S.add(G.sph, 0x2b2b30, F.at(0.27, -0.12, 1.66), [0.07, 0.09, 0.05]);
  S.add(G.sph, 0xf2a6a0, F.at(0.27, 0.2, 1.55), [0.08, 0.05, 0.05]);
  S.add(G.sph, 0xf2a6a0, F.at(0.27, -0.2, 1.55), [0.08, 0.05, 0.05]);
  S.add(G.ball, 0xe0443a, F.at(-0.02, 0, 1.86), [0.64, 0.4, 0.62]);
  S.add(G.box, 0xf7fafd, F.at(0, 0, 1.75), [0.66, 0.1, 0.64], F.rot());
  S.add(G.ball, SNOW, F.at(-0.05, 0, 2.1), [0.2, 0.2, 0.2]);
  [-1, 1].forEach(s => S.add(G.cyl, t.coat, F.at(0.2, s * 0.38, 0.85), [0.16, 0.5, 0.16], F.rot(-0.9, s * 0.3)));
  S.add(G.cyl, 0xf7fafd, F.at(0.48, 0, 0.95), [0.18, 0.2, 0.18]);
  S.add(G.cyl, 0x7a4a2a, F.at(0.48, 0, 1.04), [0.15, 0.02, 0.15]);
}

function bunting(S, a, b, colors, sag = 0.4, n = 10) {
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * sag, z = a[2] + (b[2] - a[2]) * k;
    if (i < n) {
      const k2 = (i + 0.5) / n, x2 = a[0] + (b[0] - a[0]) * k2, y2 = a[1] + (b[1] - a[1]) * k2 - Math.sin(k2 * Math.PI) * sag, z2 = a[2] + (b[2] - a[2]) * k2;
      const ry = Math.atan2(b[0] - a[0], b[2] - a[2]) + Math.PI / 2;
      S.add(G.tri, colors[i % colors.length], [x2, y2 - 0.16, z2], [0.34, 0.03, 0.42], [-Math.PI / 2, ry, -Math.PI / 2]);
    }
    S.add(G.box, ROPE, [x, y, z], [0.04, 0.04, 0.04]);
  }
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
  for (let i = 0; i < 12; i++) {
    const k = (i + 0.5) / 12, x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * sag, z = a[2] + (b[2] - a[2]) * k;
    S.add(G.box, ROPE, [x, y, z], [0.03, 0.03, L / 12 + 0.02], [0, Math.atan2(b[0] - a[0], b[2] - a[2]), 0]);
  }
}

function startDeck(S, t) {
  const p = slopePoint(0, centerX(0)), F = frame(p.x, p.z - 1.2, 0, p.y);
  for (let r = -2.1; r <= 2.1; r += 0.42) S.add(G.box, jit(t.plank, 0.08), F.at(0, r, 0.1), [3.0, 0.14, 0.4], F.rot());
  [-1, 1].forEach(s => {
    [-1.3, 1.3].forEach(f => S.add(G.box, t.wallD, F.at(f, s * 2.2, 0.5), [0.14, 0.9, 0.14], F.rot()));
    S.add(G.box, t.wallD, F.at(0, s * 2.2, 0.9), [0.12, 0.1, 2.8], F.rot());
    S.add(G.cyl, t.wallD, F.at(1.3, s * 2.4, 1.6), [0.2, 3.2, 0.2]);
    S.add(G.sph, t.cloth, F.at(1.3, s * 2.4, 3.25), [0.26, 0.26, 0.26]);
  });
  for (let i = 0; i < 10; i++) S.add(G.box, i % 2 ? 0x2b2b30 : 0xffd04a, F.at(1.3, -2.25 + (i + 0.5) * 0.45, 0.62), [0.45, 0.07, 0.07], F.rot());
  bunting(S, F.at(1.3, -2.4, 3.1), F.at(1.3, 2.4, 3.1), t.bunting, 0.9, 12);
  [-1, 1].forEach(s => S.add(G.box, s < 0 ? t.flagA : t.flagB, F.at(1.3, s * 2.4 + s * 0.38, 2.75), [0.7, 0.5, 0.04], F.rot()));
  const g = SLED_GEO.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...F.at(0.3, 0, 0.17)), new THREE.Quaternion(), new THREE.Vector3(1.1, 1.1, 1.1)));
  S.solid.push(g);
}

function finish(S, t) {
  const p = slopePoint(COURSE.length - 4, centerX(COURSE.length - 4)), half = COURSE.width / 2 - 0.4;
  const top = [];
  [-1, 1].forEach(sd => {
    const x = p.x + sd * half, y = Y(x, p.z);
    S.add(G.cyl, t.wallD, [x, y + 1.9, p.z], [0.24, 3.8, 0.24]);
    S.add(G.ball, SNOW, [x, y + 0.15, p.z], [0.9, 0.35, 0.9]);
    S.add(G.sph, t.cloth, [x, y + 3.9, p.z], [0.3, 0.3, 0.3]);
    top.push([x, y + 3.55, p.z]);
  });
  const midY = (top[0][1] + top[1][1]) / 2;
  for (let i = 0; i < 12; i++) {
    const x = top[0][0] + (top[1][0] - top[0][0]) * ((i + 0.5) / 12);
    S.add(G.box, i % 2 ? 0x2b2b30 : 0xf7fafd, [x, midY - 0.15, p.z], [(top[1][0] - top[0][0]) / 12, 0.3, 0.06]);
    S.add(G.box, i % 2 ? 0xf7fafd : 0x2b2b30, [x, midY - 0.45, p.z], [(top[1][0] - top[0][0]) / 12, 0.3, 0.06]);
  }
  bunting(S, [top[0][0], top[0][1] - 0.9, p.z], [top[1][0], top[1][1] - 0.9, p.z], t.bunting, 0.5, 14);
  for (let i = -6; i <= 6; i++) {
    const u = i / 6, x = p.x + u * (half + 1.5), z = p.z + 4.2 + (1 - u * u) * 1.2;
    S.add(G.ball, i % 2 ? SNOW : SNOW_S, [x, Y(x, z) - 0.2, z], [2.4, 0.55 + (1 - Math.abs(u)) * 0.2, 1.6], [0, -u * 0.6, 0]);
  }
  const R = frame(p.x + half + 2.8, p.z + 2.2, Math.PI / 2, Y(p.x + half + 2.8, p.z + 2.2));
  S.add(G.box, t.wallD, R.at(0, 0, 1.0), [0.14, 0.14, 3.4], R.rot(0, 0, Math.PI / 2));
  [-1.6, 1.6].forEach(r => S.add(G.box, t.wallD, R.at(0, r, 0.5), [0.14, 1.0, 0.14], R.rot()));
  [-1.0, 0, 1.0].forEach(r => sledLean(S, R, 0.45, r, 0.62, 0));
}

function trailhead(S, t) {
  const { x, z } = CLIMB_START, F = frame(x + 1.8, z + 0.8, -0.6, Y(x + 1.8, z + 0.8));
  S.add(G.cyl, t.wallD, F.at(0, 0, 1.2), [0.2, 2.4, 0.2]);
  [[2.0, 0.5, '>'], [1.55, -0.6, '<']].forEach(([h, rot]) => {
    S.add(G.box, t.plank, F.at(0.1, rot > 0 ? 0.55 : -0.55, h), [0.1, 0.32, 1.1], F.rot(0, 0, Math.PI / 2));
    S.add(G.box, t.plank, F.at(0.1, rot > 0 ? 1.15 : -1.15, h), [0.08, 0.22, 0.22], F.rot(Math.PI / 4, 0, Math.PI / 2));
  });
  S.add(G.ball, SNOW, F.at(0, 0, 2.45), [0.3, 0.12, 0.3]);
  const s = frame(x - 1.8, z + 0.4, 0, Y(x - 1.8, z + 0.4));
  S.add(G.box, t.wallD, s.at(0, 0, 0.3), [0.6, 0.6, 1.1], s.rot());
  S.add(G.ball, SNOW, s.at(0, 0, 0.62), [0.65, 0.14, 1.15]);
  for (let i = 0; i < 5; i++) S.add(G.cyl, 0xc9a26b, s.at(0, -0.4 + i * 0.2, 1.0), [0.07, 1.5, 0.07], s.rot(0.06 * (i - 2), 0, 0.05));
  cairn(S, x + 0.4, z - 1.6, 1.2);
}

function cairn(S, x, z, k = 1) {
  const y = Y(x, z);
  [[0.8, 0.42], [0.62, 0.36], [0.46, 0.3], [0.32, 0.24], [0.2, 0.18]].reduce((h, [w, th], i) => {
    S.add(G.sph, jit(i % 2 ? STONE : STONE_D, 0.12), [x + (rnd() - 0.5) * 0.08, y + (h + th / 2) * k, z], [w * k, th * k, w * 0.9 * k], [0, rnd() * 3, 0]);
    return h + th * 0.85;
  }, 0);
}

function camp(S, t, x, z) {
  const y = Y(x, z);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; S.add(G.sph, jit(STONE, 0.15), [x + Math.cos(a) * 0.95, y + 0.14, z + Math.sin(a) * 0.95], [0.42, 0.3, 0.42], [0, a, 0]); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; S.add(G.log, jit(0x6e4226, 0.1), [x + Math.cos(a) * 0.3, y + 0.42, z + Math.sin(a) * 0.3], [0.14, 1.0, 0.14], [0.5, -a + Math.PI / 2, 0]); }
  S.add(G.cone, FIRE, [x, y + 0.55, z], [0.62, 0.95, 0.62], [0, 0, 0], true);
  S.add(G.cone, 0xffd04a, [x + 0.08, y + 0.5, z], [0.36, 0.7, 0.36], [0, 0, 0], true);
  S.add(G.cone, FIRE, [x - 0.18, y + 0.4, z + 0.1], [0.3, 0.5, 0.3], [0, 0, 0], true);
  [[0, 2.1, 0], [-2.1, 0, Math.PI / 2], [1.6, -1.4, -0.8]].forEach(([dx, dz, r]) => {
    const bx = x + dx, bz = z + dz, by = Y(bx, bz);
    S.add(G.log, jit(t.wallD, 0.08), [bx, by + 0.42, bz], [0.42, 1.9, 0.42], [0, r, Math.PI / 2]);
    [-0.6, 0.6].forEach(o => S.add(G.cyl, jit(0x6e4226, 0.08), [bx + Math.cos(r) * o, by + 0.15, bz - Math.sin(r) * o], [0.32, 0.3, 0.32]));
    S.add(G.ball, SNOW, [bx, by + 0.66, bz], [1.6, 0.1, 0.32], [0, r, 0]);
  });
}

function lampPost(S, t, x, z) {
  const y = Y(x, z);
  S.add(G.cyl, t.wallD, [x, y + 1.1, z], [0.16, 2.2, 0.16]);
  S.add(G.box, t.wallD, [x + 0.28, y + 2.12, z], [0.6, 0.08, 0.08]);
  lantern(S, [x + 0.5, y + 1.85, z], t, 1);
  S.add(G.ball, SNOW, [x, y + 2.25, z], [0.2, 0.08, 0.2]);
  S.add(G.ball, SNOW, [x, y + 0.08, z], [0.6, 0.2, 0.6]);
}

function snowman(S, x, z, k = 1, ry = 0.3) {
  const F = frame(x, z, ry, Y(x, z));
  S.add(G.ball, SNOW, F.at(0, 0, 0.55 * k), [1.25 * k, 1.1 * k, 1.25 * k]);
  S.add(G.ball, SNOW, F.at(0, 0, 1.38 * k), [0.9 * k, 0.82 * k, 0.9 * k]);
  S.add(G.ball, SNOW, F.at(0, 0, 2.0 * k), [0.62 * k, 0.58 * k, 0.62 * k]);
  S.add(G.cone, 0xf08a2a, F.at(0.36 * k, 0, 2.0 * k), [0.1 * k, 0.4 * k, 0.1 * k], F.rot(Math.PI / 2));
  [-1, 1].forEach(s => S.add(G.sph, 0x2b2b30, F.at(0.27 * k, s * 0.11 * k, 2.1 * k), [0.07 * k, 0.07 * k, 0.07 * k]));
  [1.25, 1.45, 1.65].forEach(h => S.add(G.sph, 0x2b2b30, F.at(0.44 * k, 0, h * k), [0.07 * k, 0.07 * k, 0.07 * k]));
  S.add(G.taper, 0xc8483a, F.at(0, 0, 1.73 * k), [0.64 * k, 0.14 * k, 0.64 * k]);
  S.add(G.box, 0xc8483a, F.at(0.2 * k, 0.22 * k, 1.5 * k), [0.12 * k, 0.4 * k, 0.16 * k], F.rot(0.3));
  S.add(G.cyl, 0x2b2b30, F.at(0, 0, 2.38 * k), [0.42 * k, 0.32 * k, 0.42 * k]);
  S.add(G.cyl, 0x2b2b30, F.at(0, 0, 2.24 * k), [0.6 * k, 0.04 * k, 0.6 * k]);
  [-1, 1].forEach(s => S.add(G.cyl, 0x6e4226, F.at(0, s * 0.62 * k, 1.5 * k), [0.05 * k, 0.8 * k, 0.05 * k], F.rot(0, 0, s * 1.0)));
}

function woodpile(S, t, x, z) {
  const F = frame(x, z, Math.PI / 2, Y(x, z));
  firewood(S, F, 0, 0, 0, 1.8, 5);
  S.add(G.cyl, jit(0x6e4226, 0.1), F.at(0.9, 0.8, 0.25), [0.6, 0.5, 0.6]);
  S.add(G.box, 0x9aa1ad, F.at(0.9, 0.8, 0.62), [0.06, 0.4, 0.3], F.rot(0, 0, 0.3));
}

function shelter(S, t, x, z) {
  const F = frame(x, z, -Math.PI / 2 + 0.4, Y(x, z));
  [[-0.8, -1.1], [0.8, -1.1], [-0.8, 1.1], [0.8, 1.1]].forEach(([f, r]) => S.add(G.box, t.wallD, F.at(f, r, 1.05), [0.16, 2.1, 0.16], F.rot()));
  gableRoof(S, F, { w: 2.4, d: 1.8, eave: 2.1, rise: 0.8, roof: t.roof, fill: t.wallD, fascia: t.wallD, rows: 3, over: 0.35 });
  S.add(G.box, t.plank, F.at(-0.4, 0, 0.5), [0.5, 0.1, 2.1], F.rot());
  S.add(G.box, t.plank, F.at(-0.7, 0, 0.85), [0.1, 0.5, 2.1], F.rot());
  lantern(S, F.at(0.85, 1.1, 1.6), t, 0.9);
  cairn(S, ...F.at(1.4, -1.6, 0).filter((_, i) => i !== 1), 1);
}

function fence(S, t) {
  let acc = 0, nextStep = 0, nextPost = 0, nextCairn = 14, prev = null;
  const summit = CLIMB_PATH.at(-1);
  for (let i = 0; i < CLIMB_PATH.length - 1; i++) {
    const a = CLIMB_PATH[i], b = CLIMB_PATH[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / len, dz = (b.z - a.z) / len;
    const nx = -dz, nz = dx, ry = Math.atan2(dx, dz);
    for (let d = 0; d < len; d += 0.5) {
      const s = acc + d, x = a.x + dx * d, z = a.z + dz * d, y = Y(x, z);
      if (Math.hypot(x - summit.x, z - summit.z) < 7) { prev = null; continue; }
      if (s >= nextStep) {
        S.add(G.log, jit(t.wallD, 0.08), [x, y + 0.08, z], [0.24, 2.0, 0.24], [0, ry, Math.PI / 2]);
        nextStep += 2.4;
      }
      if (s >= nextPost) {
        const px = x + nx * 1.6, pz = z + nz * 1.6, py = Y(px, pz);
        S.add(G.cyl, jit(t.wallD, 0.08), [px, py + 0.5, pz], [0.14, 1.0, 0.14]);
        S.add(G.ball, SNOW, [px, py + 1.02, pz], [0.18, 0.08, 0.18]);
        if (prev) {
          for (let k = 0; k < 4; k++) {
            const u = (k + 0.5) / 4, mx = prev[0] + (px - prev[0]) * u, mz = prev[2] + (pz - prev[2]) * u, my = prev[1] + (py + 0.85 - prev[1]) * u - Math.sin(u * Math.PI) * 0.18;
            S.add(G.box, ROPE, [mx, my, mz], [0.04, 0.04, Math.hypot(px - prev[0], pz - prev[2]) / 4 + 0.04], [0, Math.atan2(px - prev[0], pz - prev[2]), 0]);
          }
        }
        prev = [px, py + 0.85, pz];
        nextPost += 3.0;
      }
      if (s >= nextCairn) { cairn(S, x - nx * 2.0, z - nz * 2.0, 0.9); nextCairn += 18; }
    }
    acc += len;
  }
}

export const PROTO_LAYOUT = Object.freeze({
  hut: { x: 4.2, z: -11.2, ry: -0.5 },
  keeper: { x: 2.6, z: -6.4 },
  camp: { x: -3.6, z: 76.5 },
  shelter: { x: 27.8, z: 24 },
});

const HUTS = { A: hutLog, B: hutChalet, C: hutAframe };

export function buildSet(key) {
  seed = 7;
  const t = THEMES[key], S = makeSink(), L = PROTO_LAYOUT;
  const H = frame(L.hut.x, L.hut.z, key === 'C' ? -2.2 : L.hut.ry, PEAK_Y - 0.1);
  S.add(G.ball, SNOW, H.at(0, 0, -1.6), [11, 3.4, 10]);
  HUTS[key](S, H, t);
  [[0.9, 3.4], [1.05, 3.95], [1.2, 4.5]].forEach(([f, r], i) => sledLean(S, H, 2.6 + f * 0.1, r - 0.2, 0.62, i * 0.05));
  keeper(S, L.keeper.x, L.keeper.z, -Math.PI / 2 - 0.5, t);
  startDeck(S, t);
  finish(S, t);
  trailhead(S, t);
  camp(S, t, L.camp.x, L.camp.z);
  [[-7.4, 70.2], [7.6, 79.6], [-6.8, 81.6]].forEach(([x, z]) => lampPost(S, t, x, z));
  woodpile(S, t, -7.8, 75.6);
  if (key !== 'A') snowman(S, 5.4, 81.0, key === 'B' ? 0.9 : 0.75);
  if (key === 'A') snowman(S, 5.6, 81.2, 0.7);
  if (key === 'C') bunting(S, [-7.4, Y(-7.4, 70.2) + 2.3, 70.2], [7.6, Y(7.6, 79.6) + 2.3, 79.6], [LAMP, 0xff9a6a], 0.8, 18);
  shelter(S, t, L.shelter.x, L.shelter.z);
  fence(S, t);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(mergeAll(S.solid), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  if (S.glow.length) group.add(new THREE.Mesh(mergeAll(S.glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  group.userData.tris = [...S.solid, ...S.glow].reduce((a, g) => a + g.getAttribute('position').count / 3, 0);
  return group;
}
