import * as THREE from 'three';

export function makeLeader(color, clayMat) {
  const g = new THREE.Group();
  const dark = clayMat(0x5a4030);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), dark);
  head.position.z = -0.28;
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }));
  tail.position.z = 0.14;
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
  const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), wingMat);
  wingL.scale.set(1, 0.08, 0.6); wingL.position.set(-0.28, 0.2, -0.07); wingL.rotation.z = 0.6;
  const wingR = wingL.clone();
  wingR.position.x = 0.28; wingR.rotation.z = -0.6;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  g.add(head, tail, wingL, wingR, halo);
  g.userData = { tail, halo };
  return g;
}

export function setLeaderGlow(g, b) {
  g.userData.tail.material.opacity = 0.35 + b * 0.65;
  g.userData.halo.material.opacity = 0.06 + b * 0.3;
  g.userData.halo.scale.setScalar(0.8 + b * 0.5);
}
