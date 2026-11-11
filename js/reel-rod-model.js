import * as THREE from 'three';
import { part, mergedMesh } from './vertex-merge.js';

const GREEN = 0x2f7d46, HANDLE = 0x9ea2a6, BAND = 0xf1efe8, RIM = 0xe8b21f, SPOOL = 0x8d9196, CAP = 0xf4f2ec;
const Z90 = [0, 0, Math.PI / 2];

const cyl = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s);
const bandAt = (r, y) => part(cyl(r, r, 0.03, 9), BAND, { pos: [0, y, 0] });

export function buildReelRod(g) {
  const RX = 0.085, RY = 0.2;
  g.add(mergedMesh([
    part(cyl(0.032, 0.036, 0.3, 8), HANDLE, { pos: [0, 0.02, 0] }),
    part(cyl(0.04, 0.04, 0.035, 9), HANDLE, { pos: [0, 0.18, 0] }),
    part(cyl(0.019, 0.028, 0.64, 7), GREEN, { pos: [0, 0.5, 0] }),
    bandAt(0.03, 0.42), bandAt(0.026, 0.66),
    part(new THREE.BoxGeometry(0.06, 0.03, 0.03), HANDLE, { pos: [RX - 0.04, RY, 0] }),
    part(cyl(0.068, 0.068, 0.07, 12), SPOOL, { pos: [RX, RY, 0], rot: Z90 }),
    part(cyl(0.088, 0.088, 0.022, 14), RIM, { pos: [RX - 0.042, RY, 0], rot: Z90 }),
    part(cyl(0.088, 0.088, 0.022, 14), RIM, { pos: [RX + 0.042, RY, 0], rot: Z90 }),
    part(new THREE.ConeGeometry(0.05, 0.07, 10), CAP, { pos: [RX + 0.085, RY, 0], rot: [0, 0, -Math.PI / 2] }),
  ]));

  const crank = new THREE.Group(); crank.position.set(RX + 0.06, RY, 0); g.add(crank);
  crank.add(mergedMesh([
    part(new THREE.BoxGeometry(0.016, 0.1, 0.016), GREEN, { pos: [0, -0.045, 0] }),
    part(cyl(0.022, 0.022, 0.06, 8), GREEN, { pos: [0.03, -0.095, 0], rot: Z90 }),
  ]));

  const tip = new THREE.Group(); tip.position.y = 0.82; tip.rotation.z = 0.12; g.add(tip);
  tip.add(mergedMesh([
    part(cyl(0.01, 0.019, 0.46, 6), GREEN, { pos: [0, 0.23, 0] }),
    part(cyl(0.021, 0.021, 0.03, 9), BAND, { pos: [0, 0.14, 0] }),
    part(new THREE.SphereGeometry(0.014, 6, 5), GREEN, { pos: [0, 0.46, 0] }),
  ]));
  const tipEnd = new THREE.Group(); tipEnd.position.y = 0.47; tip.add(tipEnd);
  return { crank, tip, tipEnd };
}
