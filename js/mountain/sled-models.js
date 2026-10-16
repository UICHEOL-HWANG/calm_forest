import { colored } from './merge-colored.js';

export const STRIPE = 0xfff6ea;

export const DECK_TOP = Object.freeze({ davos: 0.38, toboggan: 0.135, bobsled: 0.36, acorn: 0.55, skiff: 0.2 });

const TUBE_SIDES = 5;
const half = n => Math.max(4, Math.ceil(n / 2));

const STARS = [[-0.22, -0.5], [0.2, -0.24], [-0.2, 0.02], [0.24, 0.28], [-0.26, 0.28]];

function kit(THREE) {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const place = (g, [x, y, z], [rx, ry, rz] = [0, 0, 0], s = [1, 1, 1]) =>
    g.applyMatrix4(new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(...s)));
  const tube = (pts, r, hex, closed = false, seg = 48) =>
    colored(THREE, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p)), closed, 'catmullrom', 0.5), half(seg), r, TUBE_SIDES, closed), hex);
  const side = (x, zy) => zy.map(([z, y]) => [x, y, z]);
  const latheZ = (profile, hex, at = [0, 0, 0], sx = 1, sy = 1, seg = 16) => {
    const g = colored(THREE, new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), seg), hex);
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    g.applyMatrix4(new THREE.Matrix4().makeScale(sx, sy, 1));
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(...at));
    g.computeVertexNormals();
    return g;
  };
  const rbox = (w, h, d, hex, at, rot = [0, 0, 0], r = 0.015) => {
    const s = new THREE.Shape();
    const x = w / 2 - r, y = h / 2 - r;
    s.moveTo(-x, -h / 2); s.lineTo(x, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -y);
    s.lineTo(w / 2, y); s.quadraticCurveTo(w / 2, h / 2, x, h / 2); s.lineTo(-x, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y); s.lineTo(-w / 2, -y); s.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 1, curveSegments: 1 });
    g.translate(0, 0, -(d - 2 * r) / 2);
    return place(colored(THREE, g, hex), at, rot);
  };
  const bend = (geo, z0, R) => {
    const p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), z = p.getZ(i);
      if (z <= z0) continue;
      const t = (z - z0) / R, d = R - y;
      p.setY(i, R - d * Math.cos(t));
      p.setZ(i, z0 + d * Math.sin(t));
    }
    geo.computeVertexNormals();
    return geo;
  };
  const slab = (w, h, d, hex, at, segs = 32) => place(colored(THREE, new THREE.BoxGeometry(w, h, d, 1, 1, half(segs)), hex), at);
  const solid = (geo, hex, at, rot, s) => place(colored(THREE, geo, hex), at, rot, s);
  return { tube, side, latheZ, rbox, bend, slab, solid };
}

function davos(THREE, k, p) {
  const out = [];
  for (const s of [-1, 1]) {
    const x = s * 0.32;
    out.push(k.tube(k.side(x, [[-0.66, 0.12], [-0.74, 0.05], [-0.6, 0.03], [0.3, 0.03], [0.6, 0.07], [0.78, 0.2], [0.76, 0.36], [0.6, 0.4], [0.46, 0.34]]), 0.04, p.dark));
    out.push(k.rbox(0.05, 0.016, 1.0, p.metal, [x, 0.0, -0.12]));
    out.push(k.tube(k.side(x, [[-0.46, 0.04], [-0.38, 0.18], [-0.42, 0.31]]), 0.03, p.dark, false, 12));
    out.push(k.tube(k.side(x, [[0.28, 0.04], [0.22, 0.18], [0.26, 0.31]]), 0.03, p.dark, false, 12));
    out.push(k.tube(k.side(x, [[-0.62, 0.31], [0, 0.31], [0.46, 0.34]]), 0.032, p.dark, false, 24));
  }
  for (const z of [-0.5, -0.24, 0.02, 0.28]) out.push(k.rbox(0.8, 0.045, 0.16, p.wood, [0, 0.355, z], [0, 0, 0], 0.018));
  out.push(k.rbox(0.12, 0.01, 0.95, p.metal, [0, 0.382, -0.11], [0, 0, 0], 0.004));
  out.push(k.tube([[-0.3, 0.38, 0.7], [0, 0.52, 0.92], [0.3, 0.38, 0.7]], 0.014, p.accent, false, 16));
  if (p.stars) for (const [x, z] of STARS) out.push(k.solid(new THREE.BoxGeometry(0.07, 0.012, 0.07), p.metal, [x, 0.39, z], [0, Math.PI / 4, 0]));
  return out;
}

function toboggan(THREE, k, p) {
  const out = [
    k.bend(k.slab(0.92, 0.06, 1.9, p.body, [0, 0.04, -0.05], 48), 0.22, 0.26),
    k.bend(k.slab(0.06, 0.13, 1.9, p.dark, [-0.45, 0.075, -0.05], 48), 0.22, 0.22),
    k.bend(k.slab(0.06, 0.13, 1.9, p.dark, [0.45, 0.075, -0.05], 48), 0.22, 0.22),
    k.rbox(0.74, 0.07, 0.8, p.pad, [0, 0.1, -0.38], [0, 0, 0], 0.03),
    k.bend(k.slab(0.18, 0.064, 1.9, STRIPE, [0, 0.042, -0.05], 48), 0.22, 0.26),
  ];
  for (const s of [-1, 1]) out.push(k.tube(k.side(s * 0.5, [[-0.86, 0.14], [-0.55, 0.11], [-0.25, 0.15], [0.02, 0.11], [0.2, 0.16]]), 0.018, p.rope, false, 24));
  out.push(k.tube([[-0.5, 0.14, -0.86], [0, 0.11, -0.95], [0.5, 0.14, -0.86]], 0.018, p.rope, false, 16));
  return out;
}

const BOB_PROFILE = [[0, -0.8], [0.18, -0.79], [0.28, -0.66], [0.32, -0.3], [0.31, 0.15], [0.25, 0.48], [0.14, 0.72], [0.04, 0.84], [0, 0.86]];

function bobRadius(z) {
  const i = BOB_PROFILE.findIndex(([, pz], j) => j > 0 && z <= pz);
  if (i < 1) return 0;
  const [r0, z0] = BOB_PROFILE[i - 1], [r1, z1] = BOB_PROFILE[i];
  return r0 + (r1 - r0) * (z - z0) / (z1 - z0);
}

const ring = (n, rx, rz, y, z0 = 0) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a) * rx, y, z0 + Math.sin(a) * rz]; });

function bobsled(THREE, k, p) {
  const Y = 0.36, SY = 0.6;
  const out = [k.latheZ(BOB_PROFILE, p.body, [0, Y, 0], 1, SY, 20)];
  out.push(k.solid(new THREE.SphereGeometry(1, 16, 8), p.dark, [0, Y + 0.16, -0.28], [0, 0, 0], [0.21, 0.05, 0.36]));
  out.push(k.tube(ring(16, 0.23, 0.38, Y + 0.175, -0.28), 0.022, p.trim, true, 32));
  for (const x of [-0.07, 0.07]) {
    const pts = Array.from({ length: 12 }, (_, i) => 0.12 + i * 0.06).map(z => { const r = bobRadius(z); return [x, Y + Math.sqrt(Math.max(0, r * r - x * x)) * SY + 0.008, z]; });
    out.push(k.tube(pts, 0.018, p.trim, false, 24));
  }
  for (const s of [-1, 1]) {
    out.push(k.solid(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), p.trim, [s * 0.315, Y, 0.05], [0, 0, Math.PI / 2]));
    out.push(k.solid(new THREE.CylinderGeometry(0.06, 0.06, 0.024, 16), p.accent, [s * 0.318, Y, 0.05], [0, 0, Math.PI / 2]));
    out.push(k.tube(k.side(s * 0.22, [[-0.72, 0.03], [0.4, 0.03], [0.62, 0.08], [0.68, 0.16]]), 0.024, p.metal, false, 24));
    for (const z of [-0.5, 0.3]) out.push(k.rbox(0.04, 0.18, 0.08, p.metal, [s * 0.22, 0.12, z]));
  }
  out.push(k.rbox(0.03, 0.16, 0.22, p.accent, [0, Y + 0.22, -0.66], [0.25, 0, 0]));
  return out;
}

function acorn(THREE, k, p) {
  const Y = 0.42;
  const out = [
    k.latheZ([[0.34, -0.26], [0.4, -0.1], [0.41, 0.08], [0.38, 0.26], [0.29, 0.44], [0.16, 0.58], [0.05, 0.68], [0, 0.74]], p.nut, [0, Y, 0], 1, 0.95, 14),
    k.latheZ([[0, -0.62], [0.16, -0.6], [0.32, -0.52], [0.43, -0.38], [0.46, -0.24], [0.44, -0.15], [0.38, -0.13]], p.cap, [0, Y, 0], 1, 0.95, 14),
  ];
  for (const [z, r] of [[-0.2, 0.455], [-0.3, 0.45], [-0.4, 0.42], [-0.49, 0.36], [-0.56, 0.26]]) out.push(k.solid(new THREE.TorusGeometry(r, 0.026, 3, 12), p.capDark, [0, Y, z], [0, 0, 0], [1, 0.95, 1]));
  out.push(k.solid(new THREE.CylinderGeometry(0.055, 0.07, 0.2, 10), p.capDark, [0, Y, -0.7], [Math.PI / 2, 0, 0]));
  out.push(k.solid(new THREE.TorusGeometry(0.085, 0.025, 4, 10), p.accent, [0, Y, -0.8]));
  out.push(k.solid(new THREE.SphereGeometry(1, 12, 6), p.dark, [0, Y + 0.33, 0.0], [0, 0, 0], [0.18, 0.05, 0.24]));
  out.push(k.tube(ring(16, 0.2, 0.26, Y + 0.35), 0.02, p.accent, true, 24));
  for (const s of [-1, 1]) {
    const x = s * 0.27;
    out.push(k.tube(k.side(x, [[-0.62, 0.06], [-0.55, 0.025], [0.3, 0.025], [0.56, 0.08], [0.66, 0.2], [0.6, 0.3], [0.48, 0.3]]), 0.026, p.metal, false, 24));
    for (const z of [-0.38, 0.22]) out.push(k.tube(k.side(x, [[z, 0.03], [z + 0.03, 0.12], [z, 0.2]]), 0.022, p.metal, false, 10));
    out.push(k.rbox(0.025, 0.22, 0.26, p.accent, [s * 0.38, Y + 0.02, -0.5], [0, 0, s * -0.5], 0.01));
  }
  out.push(k.solid(new THREE.TorusGeometry(0.405, 0.03, 4, 18), STRIPE, [0, Y, 0.0], [0, 0, 0], [1, 0.95, 1]));
  for (const s of [-1, 1]) out.push(k.solid(new THREE.SphereGeometry(0.035, 6, 4), p.dark, [s * 0.13, Y + 0.12, 0.6]));
  return out;
}

function skiff(THREE, k, p) {
  const out = [];
  for (const s of [-1, 1]) {
    const x = s * 0.26;
    out.push(k.tube(k.side(x, [[-0.86, 0.1], [-0.8, 0.03], [0.55, 0.025], [0.84, 0.07], [0.96, 0.2], [0.9, 0.33], [0.76, 0.32], [0.72, 0.21]]), 0.022, p.metal, false, 48));
    for (const z of [-0.6, -0.1, 0.38]) out.push(k.tube(k.side(x, [[z - 0.04, 0.03], [z, 0.1], [z + 0.03, 0.165]]), 0.018, p.metal, false, 10));
  }
  for (const x of [-0.17, 0, 0.17]) out.push(k.rbox(0.15, 0.035, 1.34, p.wood, [x, 0.185, -0.12], [0, 0, 0], 0.014));
  for (const z of [-0.62, 0.42]) out.push(k.rbox(0.56, 0.03, 0.06, p.trim, [0, 0.155, z]));
  out.push(k.rbox(0.2, 0.012, 0.36, p.accent, [0, 0.207, 0.12], [0, 0, 0], 0.005));
  for (const x of [-0.17, 0.17]) out.push(k.rbox(0.035, 0.008, 1.2, STRIPE, [x, 0.206, -0.12], [0, 0, 0], 0.003));
  out.push(k.rbox(0.8, 0.05, 0.09, p.trim, [0, 0.24, 0.6], [0, 0, 0], 0.02));
  for (const s of [-1, 1]) out.push(k.solid(new THREE.SphereGeometry(0.05, 10, 6), p.accent, [s * 0.42, 0.24, 0.6]));
  return out;
}

const MODELS = Object.freeze({ davos, toboggan, bobsled, acorn, skiff });

export function modelParts(THREE, model, palette) {
  return (MODELS[model] || davos)(THREE, kit(THREE), palette);
}
