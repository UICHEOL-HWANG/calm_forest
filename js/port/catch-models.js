import * as THREE from 'three';
import { part, mergedMesh } from '../vertex-merge.js';

const SHOW_SCALE = 1.35, EYE = 0x222222;
const ico = (r, d) => new THREE.IcosahedronGeometry(r, d);

function fish(col, belly, s) {
  const f = new THREE.Group();
  f.add(mergedMesh([
    part(ico(0.2, 1), col, { scale: [0.55, 0.75, 1.35] }),
    part(ico(0.16, 1), belly, { pos: [0, -0.05, 0.02], scale: [0.5, 0.5, 1.15] }),
    part(new THREE.SphereGeometry(0.03, 6, 5), EYE, { pos: [0.09, 0.04, 0.17] }),
    part(new THREE.SphereGeometry(0.03, 6, 5), EYE, { pos: [-0.09, 0.04, 0.17] }),
  ]));
  const tail = mergedMesh([part(new THREE.ConeGeometry(0.15, 0.2, 4), col, { rot: [-Math.PI / 2, 0, 0], scale: [0.25, 1, 1] })]);
  tail.position.z = -0.33; f.add(tail);
  f.scale.setScalar(s);
  f.userData.tail = tail;
  return f;
}

function squid() {
  const f = new THREE.Group(), parts = [
    part(new THREE.ConeGeometry(0.15, 0.42, 7), 0xf2a0b0, { pos: [0, 0, 0.16], rot: [Math.PI / 2, 0, 0] }),
    part(ico(0.14, 1), 0xf6b9c4, { scale: [1, 0.9, 0.8] }),
    part(new THREE.SphereGeometry(0.03, 6, 5), EYE, { pos: [0.12, 0.03, -0.02] }),
    part(new THREE.SphereGeometry(0.03, 6, 5), EYE, { pos: [-0.12, 0.03, -0.02] }),
  ];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    parts.push(part(new THREE.CylinderGeometry(0.022, 0.012, 0.3, 4), 0xf2a0b0, { pos: [Math.cos(a) * 0.07, Math.sin(a) * 0.07, -0.22], rot: [Math.PI / 2, 0, 0] }));
  }
  f.add(mergedMesh(parts));
  f.userData.tail = null;
  return f;
}

function shrimp() {
  const f = new THREE.Group(), parts = [];
  for (let i = 0; i < 4; i++) {
    const a = i * 0.45, s = 1 - i * 0.15;
    parts.push(part(ico(0.08, 0), i % 2 ? 0xf08a5d : 0xf4a37a, { pos: [0, Math.sin(a) * 0.12 - 0.04, Math.cos(a) * 0.12 - 0.05 * i], scale: [s, s, s] }));
  }
  f.add(mergedMesh(parts));
  const tail = mergedMesh([part(new THREE.ConeGeometry(0.07, 0.12, 4), 0xf08a5d)]);
  tail.position.set(0, 0.1, -0.22); tail.rotation.x = -2.2; f.add(tail);
  f.userData.tail = tail;
  return f;
}

const MAKERS = {
  fish: () => fish(0x8fb8d6, 0xeef3f6, 1),
  bigfish: () => fish(0x3f6fa8, 0xdfe9f2, 1.5),
  squid,
  shrimp,
};

export function catchMesh(kind) {
  const m = (MAKERS[kind] ?? MAKERS.fish)();
  m.scale.multiplyScalar(SHOW_SCALE);
  return m;
}

export function disposeCatch(m) {
  m.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
}
