import * as THREE from 'three';

const clayMat = (color, flat = true) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: flat });
const glowMat = (color, k) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });

export function makeMiner() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clayMat(0x6b7448, false)), 0, 0.55, 0).scale.set(1, 1.05, 1);
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(0xf3d5b5, false)), 0, 1.15, 0);
  const eye = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
  [-0.13, 0.13].forEach(x => add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eye), x, 1.18, 0.32));
  const helm = 0x41556b;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), clayMat(helm, false)), 0, 1.3, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.04, 18), clayMat(helm, false)), 0, 1.31, 0.02);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.07, 12), clayMat(0x2a2a2e, false)), 0, 1.6, 0.31).rotation.x = Math.PI / 2 - 0.8;
  add(new THREE.Mesh(new THREE.CircleGeometry(0.052, 14), glowMat(0xfff2b0, 1.6)), 0, 1.627, 0.338).rotation.x = -0.8;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), clayMat(0x4a3628, false)), 0, 1.06, 0.33).scale.set(1.5, 0.45, 0.6);
  [-0.2, 0.2].forEach(x => add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), clayMat(0x8a8078, false)), x, 1.08, 0.3).scale.set(1, 0.6, 0.4));
  add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 20), clayMat(0x8a5a2e, false)), 0, 0.62, 0).rotation.set(Math.PI / 2, 0.5, 0);
  const pick = new THREE.Group(); pick.position.set(0.38, 1.0, -0.22); pick.rotation.set(0.3, 0, -0.6); g.add(pick);
  pick.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.1, 6), clayMat(0x7a5232)));
  [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.36, 5), clayMat(0x3e3b3a)); c.rotation.z = -s * (Math.PI / 2 + 0.25); c.position.set(s * 0.17, 0.52, 0); pick.add(c); });
  return g;
}
