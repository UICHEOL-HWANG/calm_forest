import * as THREE from 'three';
import { poolGlow } from './night.js';

const POOL_Y = 0.04;

export function buildPools(group, max) {
  const geo = new THREE.CircleGeometry(1, 20);
  geo.rotateX(-Math.PI / 2);
  const fall = new Float32Array(geo.attributes.position.count * 3);
  fall.set([1, 1, 1]);
  geo.setAttribute('color', new THREE.BufferAttribute(fall, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  const black = new THREE.Color(0x000000);
  for (let i = 0; i < max; i++) mesh.setColorAt(i, black);
  mesh.count = 0;
  mesh.frustumCulled = false;
  group.add(mesh);
  return { mesh, max, m: new THREE.Matrix4(), c: new THREE.Color() };
}

export function updatePools(art, bugs, fade) {
  let n = 0;
  for (const b of bugs) {
    if (n >= art.max) break;
    const g = poolGlow(b.position.y, b.userData.bright ?? 0.5);
    if (g.k <= 0.01) continue;
    art.mesh.setMatrixAt(n, art.m.makeScale(g.r, 1, g.r).setPosition(b.position.x, POOL_Y, b.position.z));
    art.mesh.setColorAt(n, art.c.set(b.userData.kind.color).multiplyScalar(g.k * fade));
    n++;
  }
  art.mesh.count = n;
  art.mesh.instanceMatrix.needsUpdate = true;
  art.mesh.instanceColor.needsUpdate = true;
}
