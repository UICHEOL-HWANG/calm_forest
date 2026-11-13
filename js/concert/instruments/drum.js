import { makeKit, finish } from './kit.js';
import { aimDir, frontZ, shoulderTop } from './pose.js';

export function drumBody(kit, g, r, h, shell) {
  const { T, M, rod, brass, PAL, V } = kit;
  M(g, new T.CylinderGeometry(r, r * 0.92, h, 18), shell);
  for (const sy of [1, -1]) {
    M(g, new T.CylinderGeometry(r * 1.02, r * 1.02, h * 0.08, 18), PAL.cream, [0, sy * h * 0.5, 0]);
    M(g, new T.TorusGeometry(r * 1.03, r * 0.07, 5, 20), brass(), [0, sy * h * 0.46, 0], [Math.PI / 2, 0, 0]);
  }
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2;
    const P = (a, y) => V(Math.cos(a) * r, y, Math.sin(a) * r);
    rod(g, PAL.cream, r * 0.022, 4).set(P(a0, h * 0.4), P(a1, -h * 0.4));
    rod(g, PAL.cream, r * 0.022, 4).set(P(a1, -h * 0.4), P(a2, h * 0.4));
  }
}

export function buildDrum(rig) {
  const T = rig.T, kit = makeKit(T), { M, rod, strapTube, PAL, V } = kit;
  const R = rig.R, r = R * 0.4, h = R * 0.34;
  const group = new T.Group();
  const g = new T.Group();
  drumBody(kit, g, r, h, PAL.red);
  const cy = rig.bodyY + R * 0.02;
  g.position.set(0, cy, frontZ(rig, 0, cy) + r * 0.82);
  g.rotation.x = 0.5;
  group.add(g); g.updateMatrix();
  const headC = V(0, h * 0.55, 0).applyMatrix4(g.matrix);
  const headN = V(0, 1, 0).applyQuaternion(g.quaternion);
  for (const side of [1, -1]) {
    const st = shoulderTop(rig, side, 0.45);
    strapTube(group, [V(side * r * 0.8, cy + h * 0.2, g.position.z - r * 0.5), st.clone().add(V(side * R * 0.12, -R * 0.25, R * 0.5)), st, st.clone().add(V(-side * R * 0.2, -R * 0.05, -R * 0.6))], R * 0.026);
  }
  const sticks = {};
  for (const side of [1, -1]) sticks[side] = { rod: rod(group, PAL.stick, R * 0.032), tip: M(group, new T.SphereGeometry(R * 0.055, 8, 6), PAL.stick) };
  const pose = (hitL, hitR) => {
    for (const [side, hit] of [[1, hitR], [-1, hitL]]) {
      const lift = 1 - hit;
      const paw = aimDir(rig, side, V(-side * 0.2, -0.42 + lift * 0.14, 0.88));
      const tip = headC.clone().add(V(side * r * 0.38, 0, 0)).addScaledVector(headN, R * (0.04 + lift * 0.3));
      const dir = tip.clone().sub(paw).normalize();
      sticks[side].rod.set(paw.clone().addScaledVector(dir, -R * 0.16), tip);
      sticks[side].tip.position.copy(tip);
    }
  };
  return finish(rig, group, pose);
}
