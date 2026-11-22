import * as THREE from 'three';
import { part } from '../../js/dream/art.js';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = Math.PI / 180;

export const LANDS = [
  [[50, -100, 26], [62, -120, 16], [40, -85, 17], [30, -100, 12], [18, -95, 8], [70, -80, 12], [10, -80, 6]],
  [[-5, -60, 17], [-20, -55, 16], [-35, -65, 10], [5, -70, 9], [-48, -70, 6]],
  [[50, 20, 16], [55, 60, 22], [50, 100, 24], [35, 105, 16], [62, 95, 18], [25, 78, 10], [40, 40, 12], [65, 30, 10]],
  [[10, 20, 18], [-5, 22, 17], [-22, 25, 12], [20, 5, 13], [28, 15, 10]],
  [[-25, 135, 13], [-30, 145, 8]],
];

function cap(g, R, lat, lon, deg, col, k) {
  const d = V(Math.cos(lat * D) * Math.cos(lon * D), Math.sin(lat * D), -Math.cos(lat * D) * Math.sin(lon * D));
  const m = part(g, new THREE.SphereGeometry(R * (1.008 + k * 0.0004), 20, 6, 0, TAU, 0, deg * D), col);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d);
  return m;
}

export function landmasses(g, R, cols) {
  let k = 0;
  LANDS.forEach((land, i) => land.forEach(([lat, lon, deg]) => cap(g, R, lat, lon, deg, cols[i % cols.length], k++)));
}

export function gridLines(g, R, col) {
  [-45, 0, 45].forEach(lat => {
    const r = R * Math.cos(lat * D) * 1.012, y = R * Math.sin(lat * D) * 1.012;
    part(g, new THREE.TorusGeometry(r, R * 0.008, 4, 48), col, 0, y, 0).rotation.x = Math.PI / 2;
  });
  [0, 60, 120].forEach(lon => { part(g, new THREE.TorusGeometry(R * 1.012, R * 0.008, 4, 48), col).rotation.y = lon * D; });
}

export function poles(g, R, col) {
  [-1, 1].forEach(s => { cap(g, R, s * 90, 0, 16, col, 50 + s); });
}
