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

export const LANDS2 = [
  [[50, -100, 24], [60, -118, 15], [42, -86, 16], [32, -100, 12], [22, -100, 8], [15, -92, 6], [9, -82, 4], [68, -95, 13], [58, -78, 9], [47, -70, 7], [64, -150, 8]],
  [[-4, -60, 16], [-14, -50, 13], [-24, -54, 12], [-34, -64, 9], [-44, -68, 6], [-52, -71, 4], [6, -68, 9], [0, -78, 6]],
  [[48, 12, 12], [52, 30, 14], [57, 55, 18], [58, 85, 20], [52, 110, 18], [38, 108, 14], [30, 112, 9], [64, 120, 15], [66, 75, 14], [27, 78, 9], [22, 80, 6], [40, 42, 10], [33, 50, 9], [24, 45, 9], [14, 102, 7], [44, -4, 6]],
  [[12, 15, 16], [4, 20, 15], [-6, 24, 14], [-18, 26, 11], [-28, 26, 7], [20, 0, 12], [26, 20, 11], [10, 40, 6]],
  [[-24, 134, 12], [-30, 146, 7], [-20, 122, 6]],
  [[73, -40, 9], [54, -3, 4], [37, 138, 4], [-19, 47, 4], [-42, 173, 3], [64, -18, 3], [-6, 106, 4], [0, 114, 4], [-5, 140, 4]],
];

export function landmasses2(g, R, cols) {
  let k = 0;
  LANDS2.forEach((land, i) => land.forEach(([lat, lon, deg]) => {
    const d = new THREE.Vector3(Math.cos(lat * D) * Math.cos(lon * D), Math.sin(lat * D), -Math.cos(lat * D) * Math.sin(lon * D));
    const m = part(g, new THREE.SphereGeometry(R * (1.008 + (k++) * 0.0003), 20, 6, 0, TAU, 0, deg * D), cols[i % cols.length]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  }));
}

const CAPS = LANDS2.flat().map(([lat, lon, deg]) => [new THREE.Vector3(Math.cos(lat * D) * Math.cos(lon * D), Math.sin(lat * D), -Math.cos(lat * D) * Math.sin(lon * D)), Math.cos(deg * D)]);
const wobble = v => 0.035 * Math.sin(v.x * 9 + v.y * 4) * Math.cos(v.z * 7 - v.y * 5);
export const isLand = v => CAPS.some(([c, cosR]) => v.dot(c) + wobble(v) > cosR);

export function facetLand(g, R, col, detail = 4) {
  const src = new THREE.IcosahedronGeometry(1, detail).toNonIndexed(), p = src.attributes.position, out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    m.copy(a).add(b).add(c).normalize();
    if (isLand(m)) for (const v of [a, b, c]) out.push(v.x * R * 1.006, v.y * R * 1.006, v.z * R * 1.006);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  geo.computeVertexNormals();
  src.dispose();
  return part(g, geo, col);
}

export function facetGlobe(g, R, sea, land, detail = 4) {
  const src = new THREE.IcosahedronGeometry(R, detail).toNonIndexed(), p = src.attributes.position, buf = [[], []];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    m.copy(a).add(b).add(c).normalize();
    buf[isLand(m) ? 1 : 0].push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  src.dispose();
  [sea, land].forEach((col, k) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(buf[k], 3));
    geo.computeVertexNormals();
    part(g, geo, col);
  });
}
