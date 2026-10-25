import { domeTheta, DOME_BOT } from './anchors.js';

export const MINER_HELMET = Object.freeze({
  shell: 0x41556b, shellDark: 0x34465a, dark: 0x2e2f35, brass: 0xb8963a, lens: 0xf0d27a,
});

const C = MINER_HELMET;

function lamp(THREE, g, HR, surfR, elev, clay, { r, depth, aim }) {
  const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const dirAt = deg => { const e = THREE.MathUtils.degToRad(deg); return new THREE.Vector3(0, Math.sin(e), Math.cos(e)); };
  const n = dirAt(elev), ax = dirAt(elev - aim);
  const base = n.clone().multiplyScalar(surfR);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(HR * r * 2.1, HR * r * 1.5, HR * 0.07), clay(C.dark));
  plate.position.copy(base); plate.quaternion.setFromUnitVectors(Z, n); g.add(plate);
  const hous = new THREE.Mesh(new THREE.CylinderGeometry(HR * r, HR * r * 0.78, HR * depth, 16), clay(C.dark, false));
  hous.position.copy(base).addScaledVector(ax, HR * depth * 0.5); hous.quaternion.setFromUnitVectors(Y, ax); g.add(hous);
  const face = base.clone().addScaledVector(ax, HR * depth);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(HR * r * 0.86, HR * 0.035, 5, 18), clay(C.brass));
  ring.position.copy(face); ring.quaternion.setFromUnitVectors(Z, ax); g.add(ring);
  const lensMat = new THREE.MeshStandardMaterial({ color: C.lens, emissive: C.lens, emissiveIntensity: 0.55, roughness: 0.5 });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(HR * r * 0.8, 18), lensMat);
  lens.position.copy(face).addScaledVector(ax, HR * 0.004); lens.quaternion.setFromUnitVectors(Z, ax); g.add(lens);
}

export function buildMinerHelmet(THREE, g, k, h) {
  const { clay } = h;
  const HR = k.HR, RK = 1.12, r = HR * RK, y0 = DOME_BOT * HR;
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 22, 14, 0, Math.PI * 2, 0, domeTheta(HR, RK)), clay(C.shell, false)));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(Math.max(0.01, r * r - y0 * y0)), HR * 0.085, 6, 26), clay(C.shellDark));
  rim.rotation.x = Math.PI / 2; rim.position.y = y0; g.add(rim);
  const peak = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.98, 20, 6, -Math.PI / 2, Math.PI), clay(C.shellDark, false));
  peak.position.set(0, y0 + HR * 0.02, HR * 0.08); peak.scale.set(0.9, 0.1, 1.04); peak.rotation.x = -0.08; g.add(peak);
  const ridgeGeo = new THREE.TorusGeometry(r, HR * 0.08, 6, 18, THREE.MathUtils.degToRad(92));
  ridgeGeo.scale(1, 1, 1.6);
  ridgeGeo.rotateZ(THREE.MathUtils.degToRad(28));
  ridgeGeo.rotateY(Math.PI / 2);
  g.add(new THREE.Mesh(ridgeGeo, clay(C.shellDark, false)));
  lamp(THREE, g, HR, r, 54, clay, { r: 0.18, depth: 0.16, aim: 18 });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
}
