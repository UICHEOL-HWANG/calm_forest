import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['at_easel', 'at_paint_shelf', 'at_frame_wall'];
export const YARD_IDS = ['at_outdoor_easel'];

const C = {
  canvas: 0xe2d4b6, canvasDk: 0xc9b690,
  wood: 0xc0905c, woodDk: 0x8e623c, woodLt: 0xd4aa74,
  navy: 0x3b4a72, burgundy: 0x9c3b4a,
  red: 0xd9534a, blue: 0x4f82c4, yellow: 0xe8bf3e, green: 0x6aab5a, greenDk: 0x4f8a45,
  sky: 0x8fb8dc, metal: 0xa9a59c,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 24, h = 16, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 20, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const DABS = [C.red, C.blue, C.yellow, C.green];
const OUT_OFF = [-0.6, 0.1];

function rod(p, a, b, r, col, r2 = r, seg = 8) {
  const A = V(...a), B = V(...b);
  const m = part(p, cyl(r2, r, A.distanceTo(B), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), B.sub(A).normalize());
  return m;
}

function dab(p, r, col, x, y, z) {
  const m = part(p, sph(r, 16, 10), col, x, y, z); m.scale.z = 0.4; return m;
}

function picture(p, w, h, kind) {
  const z = 0.012;
  if (kind === 'land') {
    part(p, box(w, h * 0.42, 0.006), C.sky, 0, h * 0.29, z);
    const dome = r => sph(r, 24, 10, 0, TAU, 0, Math.PI / 2);
    part(p, dome(w * 0.36), C.green, -w * 0.14, -h * 0.5, z - 0.004).scale.set(1, h * 0.36 / (w * 0.36), 0.03);
    part(p, dome(w * 0.3), C.greenDk, w * 0.2, -h * 0.5, z - 0.002).scale.set(1, h * 0.26 / (w * 0.3), 0.03);
    part(p, cyl(w * 0.09, w * 0.09, 0.006, 20), C.yellow, w * 0.24, h * 0.27, z + 0.004).rotation.x = Math.PI / 2;
  } else if (kind === 'flower') {
    rod(p, [0, -h * 0.4, z], [0, h * 0.05, z], w * 0.012, C.greenDk);
    const lf = part(p, sph(w * 0.08, 16, 10), C.green, w * 0.07, -h * 0.18, z); lf.scale.set(1.3, 0.55, 0.3); lf.rotation.z = 0.5;
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; dab(p, w * 0.075, C.red, Math.cos(a) * w * 0.09, h * 0.12 + Math.sin(a) * w * 0.09, z); }
    dab(p, w * 0.05, C.yellow, 0, h * 0.12, z + 0.006);
  } else if (kind === 'sun') {
    part(p, cyl(w * 0.2, w * 0.2, 0.006, 24), C.yellow, 0, 0, z).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; dab(p, w * 0.04, C.yellow, Math.cos(a) * w * 0.3, Math.sin(a) * w * 0.3, z); }
  } else if (kind === 'still') {
    part(p, box(w, h * 0.3, 0.006), C.canvasDk, 0, -h * 0.35, z);
    const ap = part(p, sph(w * 0.13, 20, 14), C.red, -w * 0.1, -h * 0.12, z); ap.scale.z = 0.3;
    const pr = part(p, sph(w * 0.11, 20, 14), C.yellow, w * 0.16, -h * 0.13, z); pr.scale.set(0.9, 1.15, 0.3);
  }
}

function canvasBoard(p, w, h, kind, x, y, z, edge = C.canvasDk) {
  const g = grp(p, x, y, z);
  part(g, box(w, h, 0.03), C.canvas, 0, 0, 0);
  part(g, box(w + 0.01, h + 0.01, 0.022), edge, 0, 0, -0.006);
  picture(grp(g, 0, 0, 0.015), w * 0.92, h * 0.9, kind);
  return g;
}

function frame(p, w, h, kind, col = C.wood, t = 0.045) {
  const g = grp(p);
  part(g, box(w, h, 0.03), C.canvas, 0, 0, 0);
  [[0, h / 2, w + t, t], [0, -h / 2, w + t, t], [w / 2, 0, t, h + t], [-w / 2, 0, t, h + t]].forEach(([x, y, a, b]) => part(g, box(a, b, 0.05), col, x, y, 0.01));
  picture(grp(g, 0, 0, 0.012), w * 0.9, h * 0.9, kind);
  return g;
}

function palette(p, w, x, y, z, rx = -Math.PI / 2) {
  const sh = new THREE.Shape(), hh = w * 0.78;
  sh.moveTo(w * 0.1, -hh * 0.5);
  sh.bezierCurveTo(w * 0.42, -hh * 0.52, w * 0.52, -hh * 0.1, w * 0.48, hh * 0.18);
  sh.bezierCurveTo(w * 0.42, hh * 0.52, -w * 0.2, hh * 0.56, -w * 0.42, hh * 0.3);
  sh.bezierCurveTo(-w * 0.54, hh * 0.14, -w * 0.5, -hh * 0.2, -w * 0.3, -hh * 0.36);
  sh.bezierCurveTo(-w * 0.18, -hh * 0.2, -w * 0.02, -hh * 0.18, -w * 0.02, -hh * 0.34);
  sh.bezierCurveTo(-w * 0.02, -hh * 0.46, w * 0.04, -hh * 0.5, w * 0.1, -hh * 0.5);
  const hole = new THREE.Path(); hole.absellipse(-w * 0.16, -hh * 0.1, w * 0.07, hh * 0.09, 0, TAU, true); sh.holes.push(hole);
  const g = grp(p, x, y, z); g.rotation.x = rx;
  part(g, new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, curveSegments: 14 }), C.woodLt);
  [[0.22, 0.26], [0.34, 0.02], [0.04, 0.34], [-0.26, 0.22]].forEach(([a, b], i) => dab(g, w * 0.07, DABS[i], a * w, b * hh, 0.014));
  return g;
}

function brush(p, L, tip, x, y, z, rz = 0, rx = 0) {
  const g = grp(p, x, y, z); g.rotation.set(rx, 0, rz);
  part(g, cyl(L * 0.03, L * 0.04, L * 0.68, 8), C.woodDk, 0, L * 0.34, 0);
  part(g, cyl(L * 0.045, L * 0.04, L * 0.12, 10), C.metal, 0, L * 0.74, 0);
  part(g, sph(L * 0.05, 12, 8), tip, 0, L * 0.86, 0).scale.y = 1.9;
  return g;
}

function jar(p, r, h, paint, x, y, z) {
  const g = grp(p, x, y, z);
  part(g, cyl(r, r, h, 20), paint, 0, h / 2, 0);
  part(g, cyl(r * 1.05, r * 1.05, h * 0.28, 20), C.canvas, 0, h * 0.4, 0);
  part(g, cyl(r * 1.04, r * 1.04, h * 0.22, 20), C.woodDk, 0, h + h * 0.11, 0);
  return g;
}

function brushJar(p, r, h, x, y, z, tips = [C.red, C.blue, C.yellow]) {
  const g = grp(p, x, y, z);
  part(g, cyl(r, r * 0.92, h, 20), C.navy, 0, h / 2, 0);
  tips.forEach((t, i) => brush(g, h * 1.5, t, (i - 1) * r * 0.45, h * 0.3, (i % 2 ? -1 : 1) * r * 0.2, (i - 1) * 0.22));
  return g;
}

function easel(p, H, kind, cw = 0.62, ch = 0.5, ledgeY = 0.55 * H) {
  const g = grp(p), lean = 0.16 * H, spread = 0.3 * H / 1.5;
  [-1, 1].forEach(s => rod(g, [s * spread, 0, lean], [s * 0.05, H, 0], 0.022, C.wood, 0.026));
  rod(g, [0, 0, -0.42 * H], [0, H * 0.86, -0.01], 0.02, C.woodDk);
  const zAt = y => lean * (1 - y / H);
  part(g, box(spread * 1.5, 0.03, 0.03), C.woodDk, 0, H * 0.22, zAt(H * 0.22));
  const tilt = Math.atan2(lean, H);
  const led = part(g, box(cw + 0.1, 0.035, 0.11), C.wood, 0, ledgeY, zAt(ledgeY) + 0.05); led.rotation.x = -tilt;
  const cy = ledgeY + ch / 2 + 0.02, cv = canvasBoard(g, cw, ch, kind, 0, cy, zAt(cy) + 0.045);
  cv.rotation.x = -tilt;
  const top = cy + ch / 2 + 0.03;
  part(g, box(0.1, 0.05, 0.06), C.woodDk, 0, top, zAt(top) + 0.035).rotation.x = -tilt;
  return { g, ledgeY, zAt, tilt };
}

function foldStool(p, x, z, ry, col) {
  const g = grp(p, x, 0, z); g.rotation.y = ry;
  [-1, 1].forEach(s => { rod(g, [-0.16, 0, s * 0.15], [0.16, 0.42, s * 0.15], 0.016, C.woodDk); rod(g, [0.16, 0, s * 0.15], [-0.16, 0.42, s * 0.15], 0.016, C.woodDk); });
  part(g, box(0.36, 0.03, 0.34), col, 0, 0.43, 0);
  return g;
}

function parasol(p, x, z, R, H, colA, colB, n = 8) {
  const g = grp(p, x, 0, z);
  part(g, cyl(0.16, 0.2, 0.08, 24), C.canvasDk, 0, 0.04, 0);
  part(g, cyl(0.022, 0.022, H, 10), C.woodLt, 0, H / 2, 0);
  const ch = R * 0.32;
  for (let i = 0; i < n; i++) part(g, new THREE.ConeGeometry(R, ch, 6, 1, true, i / n * TAU, TAU / n), i % 2 ? colB : colA, 0, H - ch / 2 + 0.02, 0);
  part(g, sph(0.045, 16, 12), C.woodDk, 0, H + 0.03, 0);
  for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; part(g, sph(0.03, 12, 8), i % 2 ? colA : colB, Math.sin(a) * R, H - ch + 0.02, Math.cos(a) * R); }
  return g;
}

const BUILD = {
  at_easel(s) {
    const e = easel(s, 1.45, 'land');
    palette(e.g, 0.2, 0.22, e.ledgeY + 0.04, e.zAt(e.ledgeY) + 0.08, -Math.PI / 2 + 0.25).rotation.z = 0.4;
    brush(e.g, 0.22, C.blue, -0.26, e.ledgeY + 0.03, e.zAt(e.ledgeY) + 0.06, -1.45);
  },
  at_paint_shelf(s) {
    const w = 0.8, d = 0.32, h = 0.86;
    [-1, 1].forEach(sx => part(s, box(0.04, h, d), C.wood, sx * (w / 2 - 0.02), h / 2, 0));
    [0.04, 0.44, h - 0.02].forEach(y => part(s, box(w, 0.035, d), C.wood, 0, y, 0));
    part(s, box(w - 0.04, h - 0.04, 0.02), C.woodDk, 0, h / 2, -d / 2 + 0.01);
    [C.red, C.blue, C.yellow, C.green].forEach((c, i) => jar(s, 0.045, 0.1, c, -0.27 + i * 0.13, 0.46, 0.04));
    [[C.canvas, 0.03], [C.navy, 0.03], [C.burgundy, 0.025]].reduce((y, [c, t]) => { part(s, box(0.36, t, 0.24), c, -0.12, y + t / 2, 0.01).rotation.y = 0.05; return y + t; }, 0.06);
    brushJar(s, 0.055, 0.13, 0.22, 0.06, 0.02);
    brushJar(s, 0.05, 0.12, 0.2, h, 0.0);
    part(s, cyl(0.05, 0.05, 0.36, 16), C.canvas, -0.15, h + 0.05, 0.02).rotation.z = Math.PI / 2;
  },
  at_frame_wall(s) {
    const big = frame(s, 0.5, 0.38, 'land'); big.position.set(0, 1.1, 0.03);
    const l = frame(s, 0.26, 0.34, 'flower', C.navy, 0.04); l.position.set(-0.46, 1.04, 0.03);
    const r = frame(s, 0.24, 0.24, 'sun', C.burgundy, 0.04); r.position.set(0.44, 1.2, 0.03);
    const r2 = frame(s, 0.22, 0.18, 'still', C.woodDk, 0.035); r2.position.set(0.42, 0.92, 0.03);
  },
  at_outdoor_easel(s) {
    const o = grp(s, OUT_OFF[0], 0, OUT_OFF[1]);
    const e = easel(o, 1.5, 'land', 0.66, 0.52); e.g.position.set(0, 0, 0.05);
    palette(e.g, 0.22, 0.24, e.ledgeY + 0.04, e.zAt(e.ledgeY) + 0.08, -Math.PI / 2 + 0.25).rotation.z = 0.4;
    parasol(o, 0.75, -0.25, 0.85, 2.05, C.canvas, C.navy);
    foldStool(o, 0.35, 0.65, 0.4, C.navy);
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown atelier pick decor: ${id}`);
  const solid = new THREE.Group();
  fn(solid);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  return out;
}
