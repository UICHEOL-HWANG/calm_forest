import { makeKit, finish } from './kit.js';
import { aimDir, frontZ, shoulderTop } from './pose.js';
import { drumBody } from './drum.js';

function starGeo(T, ro, ri, t) {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? ri : ro; return new T.Vector2(Math.cos(a) * r, Math.sin(a) * r); });
  return new T.ExtrudeGeometry(new T.Shape(pts), { depth: t, bevelEnabled: false });
}

export function buildBass(rig) {
  const T = rig.T, kit = makeKit(T), { M, rod, strapTube, PAL, V } = kit;
  const R = rig.R, r = R * 0.5, h = R * 0.36;
  const group = new T.Group();
  const g = new T.Group();
  drumBody(kit, g, r, h, PAL.blue);
  M(g, starGeo(T, r * 0.36, r * 0.16, h * 0.03), PAL.gold, [0, h * 0.56, 0], [-Math.PI / 2, 0, 0]);
  const cy = rig.bodyY - R * 0.02;
  g.position.set(0, cy, frontZ(rig, 0, cy) + h * 0.55);
  g.rotation.x = Math.PI / 2 - 0.12;
  group.add(g); g.updateMatrix();
  const headC = V(0, h * 0.55, 0).applyMatrix4(g.matrix);
  const headN = V(0, 1, 0).applyQuaternion(g.quaternion);
  for (const side of [1, -1]) {
    const st = shoulderTop(rig, side, 0.45);
    strapTube(group, [V(side * r * 0.7, cy + r * 0.75, g.position.z - h * 0.2), st.clone().add(V(side * R * 0.1, -R * 0.2, R * 0.45)), st, st.clone().add(V(-side * R * 0.2, -R * 0.05, -R * 0.6))], R * 0.03);
  }
  const mallets = {};
  for (const side of [1, -1]) mallets[side] = { rod: rod(group, PAL.stick, R * 0.034), tip: M(group, new T.SphereGeometry(R * 0.1, 10, 8), PAL.felt) };
  const pose = (hitL, hitR) => {
    for (const [side, hit] of [[1, hitR], [-1, hitL]]) {
      const lift = 1 - hit;
      const paw = aimDir(rig, side, V(side * 0.12, -0.3 + lift * 0.1, 0.95));
      const tip = headC.clone().add(V(side * r * 0.5, r * 0.1, 0)).addScaledVector(headN, R * (0.1 + lift * 0.3)).add(V(side * lift * R * 0.12, 0, 0));
      const dir = tip.clone().sub(paw).normalize();
      mallets[side].rod.set(paw.clone().addScaledVector(dir, -R * 0.16), tip);
      mallets[side].tip.position.copy(tip);
    }
  };
  return finish(rig, group, pose);
}
