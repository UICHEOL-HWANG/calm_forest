import { makeKit, finish } from './kit.js';
import { aimDir, aimAt, frontZ, orient, shoulderTop } from './pose.js';

const GD = 0.43, GUB = 0.25;
const HEEL = GD + GUB - 0.04;
const HOLD = { scale: 1.45, cx: 0.36, cy: 0.16, fretUp: 0.12 };

function figure8(T, lb, ub, d, waist) {
  const n = 30, y0 = -lb, y1 = d + ub;
  const circ = (r, y) => Math.sqrt(Math.max(0, r * r - y * y));
  const w = (y) => Math.pow(Math.pow(circ(lb, y), 5) + Math.pow(circ(ub, y - d), 5) + Math.pow(y > 0 && y < d ? waist : 0, 5), 0.2);
  const ys = Array.from({ length: n + 1 }, (_, i) => y0 + ((y1 - y0) * (1 - Math.cos((Math.PI * i) / n))) / 2);
  return new T.Shape([...ys.map((y) => new T.Vector2(w(y), y)), ...ys.slice(1, -1).reverse().map((y) => new T.Vector2(-w(y), y))]);
}

function plate(T, shape, t, bevel) {
  const g = new T.ExtrudeGeometry(shape, { depth: t - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  return g.translate(0, 0, -(t - bevel * 2) / 2);
}

function guitarModel(kit, neck) {
  const { T, M, PAL } = kit;
  const g = new T.Group();
  const lb = 0.34, ub = GUB, d = GD, TH = 0.15, body = PAL.honey;
  M(g, plate(T, figure8(T, lb, ub, d, 0.17), TH, 0.03), body);
  M(g, plate(T, figure8(T, lb * 0.86, ub * 0.82, d, 0.12), 0.02, 0.005), PAL.top, [0, 0, TH / 2]);
  M(g, new T.CylinderGeometry(0.085, 0.085, 0.012, 14), PAL.board, [0, d * 0.62, TH / 2 + 0.012], [Math.PI / 2, 0, 0]);
  M(g, new T.TorusGeometry(0.1, 0.012, 4, 16), PAL.neck, [0, d * 0.62, TH / 2 + 0.012]);
  M(g, new T.BoxGeometry(0.17, 0.04, 0.025), PAL.board, [0, -lb * 0.42, TH / 2 + 0.02]);
  M(g, new T.BoxGeometry(0.085, neck, 0.06), PAL.neck, [0, HEEL + neck / 2, 0.01]);
  M(g, new T.BoxGeometry(0.092, neck + 0.06, 0.018), PAL.board, [0, HEEL + neck / 2 - 0.03, 0.048]);
  for (let i = 1; i <= 3; i++) M(g, new T.BoxGeometry(0.094, 0.008, 0.02), PAL.cream, [0, HEEL + neck * (i / 3.6), 0.05]);
  const hy = HEEL + neck + 0.085;
  M(g, new T.BoxGeometry(0.14, 0.19, 0.05), body, [0, hy, -0.004], [-0.16, 0, 0]);
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) M(g, new T.SphereGeometry(0.028, 6, 5), PAL.cream, [sx * 0.088, hy - 0.045 + i * 0.085, -0.004]);
  const s0 = -lb * 0.42, s1 = HEEL + neck;
  for (let i = 0; i < 4; i++) M(g, new T.CylinderGeometry(0.0045, 0.0045, s1 - s0, 3), 0xfaf4e8, [(i - 1.5) * 0.016, (s0 + s1) / 2, 0.066]);
  return g;
}

export function buildGuitar(rig) {
  const T = rig.T, kit = makeKit(T), { strapTube, V } = kit;
  const v = HOLD, R = rig.R, s = R * v.scale;
  const fretSide = 1, strumSide = -1;
  const group = new T.Group();
  const PF = aimDir(rig, fretSide, V(-0.1, v.fretUp, 1));
  const cx = -v.cx * R * rig.bs[0], cy = rig.bodyY + v.cy * R;
  const TH = 0.15 * s;
  let fz = 0;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, rr = 0.3 * s; fz = Math.max(fz, frontZ(rig, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) - rr * 0.25); }
  const C = V(cx, cy, Math.max(fz, frontZ(rig, cx, cy)) + TH / 2 + R * 0.015);
  const N = PF.clone().add(rig.wings ? V(0, -R * 0.02, R * 0.2) : V(0, -R * 0.02, -R * 0.1));
  const span = N.clone().sub(C);
  const neck = Math.max(0.3, (span.length() / s - HEEL) / 0.6);
  const g = guitarModel(kit, neck);
  g.scale.setScalar(s);
  const holder = new T.Group(); holder.add(g); holder.position.copy(C);
  const ax = orient(T, holder, span, V(0, 0.3, 1));
  group.add(holder);
  const st = shoulderTop(rig, fretSide, 0.42);
  const p0 = C.clone().addScaledVector(ax.y, HEEL * s * 0.9).addScaledVector(ax.z, -TH * 0.3);
  const onBody = (k) => { const p = p0.clone().lerp(st, k); p.z = Math.max(p.z, frontZ(rig, p.x, p.y) + R * 0.035); return p; };
  strapTube(group, [p0, onBody(0.35), onBody(0.7), st.clone().add(V(0, R * 0.03, 0)), st.clone().add(V(-R * 0.25, -R * 0.08, -R * 0.6))], R * 0.04);
  const tail = C.clone().addScaledVector(ax.y, -0.3 * s).addScaledVector(ax.z, -TH * 0.3);
  const sideX = -R * rig.bs[0] * 0.97;
  strapTube(group, [tail, V((tail.x + sideX) / 2, tail.y, frontZ(rig, (tail.x + sideX) / 2, tail.y) + R * 0.03), V(sideX, tail.y + R * 0.05, R * 0.15), V(sideX * 0.8, tail.y + R * 0.15, -R * 0.55)], R * 0.04);
  const strumAt = C.clone().addScaledVector(ax.x, -0.3 * s).addScaledVector(ax.y, 0.1 * s).addScaledVector(ax.z, TH * 0.5);
  const pose = (hitL, hitR) => {
    aimAt(rig, strumSide, strumAt.clone().addScaledVector(ax.x, (hitR - hitL) * R * 0.1).addScaledVector(ax.y, R * 0.04));
    aimDir(rig, fretSide, V(-0.1, v.fretUp, 1));
  };
  return finish(rig, group, pose);
}
