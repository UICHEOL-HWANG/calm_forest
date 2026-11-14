import { makeKit, finish } from './kit.js';
import { aimDir } from './pose.js';

function maracaModel(kit, R, color, band) {
  const { T, M, PAL } = kit;
  const g = new T.Group();
  M(g, new T.CylinderGeometry(R * 0.05, R * 0.06, R * 0.5, 8), PAL.stick, [0, R * 0.08, 0]);
  const head = M(g, new T.SphereGeometry(R * 0.21, 12, 9), color, [0, R * 0.48, 0]);
  head.scale.set(1, 1.22, 1);
  M(g, new T.TorusGeometry(R * 0.2, R * 0.03, 5, 14), band, [0, R * 0.46, 0], [Math.PI / 2, 0, 0]);
  M(g, new T.TorusGeometry(R * 0.135, R * 0.026, 5, 12), band, [0, R * 0.64, 0], [Math.PI / 2, 0, 0]);
  return g;
}

export function buildMaracas(rig) {
  const T = rig.T, kit = makeKit(T), { PAL, V } = kit;
  const R = rig.R;
  const group = new T.Group();
  const ms = { 1: maracaModel(kit, R, PAL.red, PAL.cream), [-1]: maracaModel(kit, R, PAL.green, PAL.cream) };
  for (const side of [1, -1]) group.add(ms[side]);
  const pose = (hitL, hitR) => {
    for (const [side, hit] of [[1, hitR], [-1, hitL]]) {
      const paw = aimDir(rig, side, V(side * 0.3, -0.2 + hit * 0.25, 0.93));
      const m = ms[side];
      m.position.copy(paw).add(V(0, -R * 0.02, R * 0.08));
      m.rotation.set(0.25 + hit * 0.7, 0, -side * 0.35);
    }
  };
  return finish(rig, group, pose);
}
