import * as THREE from 'three';
import { JARS_PER_SEG } from './string.js';

const ANCHOR_Y = 2.5, SAG = 0.5, JAR_DROP = 0.37, DARK = 0x2a2622;

function segCurve(p, q) {
  const pts = [];
  for (let s = 0; s <= 12; s++) {
    const u = s / 12;
    pts.push(new THREE.Vector3(p.x + (q.x - p.x) * u, ANCHOR_Y - SAG * 4 * u * (1 - u), p.z + (q.z - p.z) * u));
  }
  return new THREE.CatmullRomCurve3(pts);
}

function instanced(geo, mat, places) {
  const mesh = new THREE.InstancedMesh(geo, mat, places.length);
  const m = new THREE.Matrix4();
  places.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function buildString({ group, anchors, clayMat, mergeGeos }) {
  const wood = clayMat(0x8a6a4a);
  const poles = anchors.filter(a => a.post);
  if (poles.length) {
    group.add(instanced(new THREE.CylinderGeometry(0.07, 0.1, ANCHOR_Y + 0.1, 7), wood, poles.map(p => ({ x: p.x, y: (ANCHOR_Y + 0.1) / 2, z: p.z }))));
    group.add(instanced(new THREE.SphereGeometry(0.12, 8, 6), clayMat(0xa5835c), poles.map(p => ({ x: p.x, y: ANCHOR_Y + 0.14, z: p.z }))));
  }
  const ropes = [], jarPos = [];
  anchors.forEach((p, i) => {
    const c = segCurve(p, anchors[(i + 1) % anchors.length]);
    ropes.push(new THREE.TubeGeometry(c, 12, 0.022, 5));
    for (let s = 1; s <= JARS_PER_SEG; s++) jarPos.push(c.getPoint(s / (JARS_PER_SEG + 1)));
  });
  group.add(new THREE.Mesh(mergeGeos(ropes), clayMat(0x6b5236)));
  const at = (dy) => jarPos.map(p => ({ x: p.x, y: p.y - dy, z: p.z }));
  group.add(instanced(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5), clayMat(0x5a4632), at(0.1)));
  group.add(instanced(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), wood, at(0.22)));
  group.add(instanced(new THREE.CylinderGeometry(0.13, 0.11, 0.26, 10), new THREE.MeshStandardMaterial({ color: 0xdff5ff, transparent: true, opacity: 0.32, roughness: 0.2, depthWrite: false }), at(JAR_DROP)));
  const core = instanced(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), at(JAR_DROP));
  const halo = instanced(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), at(JAR_DROP));
  group.add(core, halo);
  return { core, halo, jarPos, n: jarPos.length };
}

export function refreshString(art, colors, night) {
  const c = new THREE.Color(), m = new THREE.Matrix4();
  for (let i = 0; i < art.n; i++) {
    const hex = colors[Math.floor(i / JARS_PER_SEG)]?.[i % JARS_PER_SEG];
    const on = hex !== undefined && night;
    art.core.setColorAt(i, hex === undefined ? c.set(DARK) : c.set(hex).multiplyScalar(night ? 1 : 0.4));
    art.halo.setColorAt(i, c.set(on ? hex : 0x000000));
    const p = art.jarPos[i], k = on ? 1 : 0.001;
    art.halo.setMatrixAt(i, m.makeScale(k, k, k).setPosition(p.x, p.y - JAR_DROP, p.z));
  }
  art.core.instanceColor.needsUpdate = true;
  art.halo.instanceColor.needsUpdate = true;
  art.halo.instanceMatrix.needsUpdate = true;
}
