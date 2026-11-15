import { makeKit, finish } from './kit.js';
import { aimDir } from './pose.js';

function bellModel(kit, R, color) {
  const { T, M, brass, PAL } = kit;
  const g = new T.Group();
  M(g, new T.CylinderGeometry(R * 0.05, R * 0.058, R * 0.34, 8), PAL.dark, [0, R * 0.05, 0]);
  M(g, new T.SphereGeometry(R * 0.075, 8, 6), color, [0, R * 0.24, 0]);
  const pts = [[0, 0], [0.08, 0], [0.13, -0.07], [0.16, -0.2], [0.26, -0.33], [0.3, -0.36], [0.3, -0.4], [0, -0.38]].map(([x, y]) => new T.Vector2(x * R, y * R));
  M(g, new T.LatheGeometry(pts, 14), brass(), [0, -R * 0.1, 0]);
  M(g, new T.TorusGeometry(R * 0.1, R * 0.035, 5, 12), color, [0, -R * 0.13, 0], [Math.PI / 2, 0, 0]);
  M(g, new T.SphereGeometry(R * 0.06, 8, 6), PAL.dark, [0, -R * 0.5, 0]);
  return g;
}

export function buildBells(rig) {
  const T = rig.T, kit = makeKit(T), { PAL, V } = kit;
  const R = rig.R;
  const group = new T.Group();
  const bells = { 1: bellModel(kit, R, PAL.red), [-1]: bellModel(kit, R, PAL.blue) };
  for (const side of [1, -1]) group.add(bells[side]);
  const pose = (hitL, hitR) => {
    for (const [side, hit] of [[1, hitR], [-1, hitL]]) {
      const paw = aimDir(rig, side, V(side * 0.35, -0.05 + hit * 0.3, 0.93));
      const b = bells[side];
      b.position.copy(paw).add(V(0, R * 0.02, R * 0.1));
      b.rotation.set(-0.35 - hit * 0.75, 0, -side * (0.3 - hit * 0.1));
    }
  };
  return finish(rig, group, pose);
}
