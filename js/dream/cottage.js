import * as THREE from 'three';
import { put, rbox, arch, revolve, flaredRoof, facing, TRIM } from './house-kit.js';

const BODY = 0xd6bdf4;
const ROOF = 0x7a64b8;
const STEP = 0xe2d6ff;
const GOLD = 0xffe9a8;
const FRAME = 0xfff6ff;

const Cy = (rt, rb, h, n = 12) => new THREE.CylinderGeometry(rt, rb, h, n);

function starWindow(solid, glow, x, y, z, ry) {
  const s = facing(solid, ry), g = facing(glow, ry);
  for (const p of [s, g]) p.position.set(x, y, z);
  put(s, new THREE.OctahedronGeometry(0.36, 0), FRAME, 0, 0, 0).scale.set(1, 1.35, 0.3);
  put(g, new THREE.OctahedronGeometry(0.26, 0), GOLD, 0, 0, 0.05).scale.set(1, 1.35, 0.4);
}

export function buildMoonTower(solid, glow) {
  const wall = [[0.001, 3.2], [1.22, 3.2], [1.28, 2.2], [1.4, 1.2], [1.5, 0], [0.001, 0]];
  revolve(solid, BODY, wall, 14);
  for (const y of [0.15, 1.25, 2.3]) put(solid, Cy(1.5 - y * 0.1, 1.5 - y * 0.1, 0.16, 14), FRAME, 0, y, 0);
  put(solid, Cy(1.75, 1.75, 0.2, 14), STEP, 0, 3.3, 0);
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    put(solid, Cy(0.06, 0.06, 0.45, 5), FRAME, Math.cos(a) * 1.66, 3.55, Math.sin(a) * 1.66);
  }
  put(solid, Cy(1.7, 1.7, 0.08, 14), FRAME, 0, 3.8, 0);
  flaredRoof(solid, ROOF, 1.75, 2.3, 10, 0, 3.4, 0);
  put(solid, Cy(0.04, 0.04, 0.6, 5), FRAME, 0, 5.85, 0);
  put(glow, new THREE.TorusGeometry(0.42, 0.13, 6, 18, Math.PI * 1.5), 0xffe08a, 0, 6.35, 0).rotation.set(0, Math.PI / 2, Math.PI * 0.75);
  arch(solid, FRAME, 1.2, 1.45, 0.12, 0, 0.02, 1.46, 0.03);
  arch(solid, 0x6a5a9a, 0.9, 1.3, 0.1, 0, 0.02, 1.55, 0.02);
  put(solid, new THREE.SphereGeometry(0.05, 6, 5), 0xffe08a, 0.26, 0.7, 1.66);
  rbox(solid, STEP, 1.9, 0.16, 0.7, 0, 0.08, 2.0, 0.06);
  rbox(solid, TRIM, 1.4, 0.16, 0.5, 0, 0.2, 2.0, 0.06);
  [[0, 2.45, 1.26, 0], [1.0, 2.3, 0.95, 0.75], [-1.0, 2.3, 0.95, -0.75]].forEach(([x, y, z, ry]) => starWindow(solid, glow, x, y, z, ry));
  for (const [x, z, r] of [[-1.7, 0.8, 0.45], [-1.4, 1.5, 0.35], [1.7, 1.1, 0.4], [1.8, -0.3, 0.5]]) {
    put(solid, new THREE.IcosahedronGeometry(r, 1), 0xffffff, x, 0.3, z);
  }
}
