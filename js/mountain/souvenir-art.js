export const SOUVENIR_INDOOR_IDS = Object.freeze(['snowglobe', 'hutmodel']);

const lambert = (THREE, c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });

function snowglobe(THREE) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.1, 14), lambert(THREE, 0x5e3b22));
  base.position.y = 0.05;
  const peak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 8), lambert(THREE, 0xf7fafd));
  peak.position.y = 0.18;
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), lambert(THREE, 0xcfe8ff, { transparent: true, opacity: 0.35, depthWrite: false }));
  glass.position.y = 0.26;
  g.add(base, peak, glass);
  return g;
}

function hutmodel(THREE) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), lambert(THREE, 0xf7fafd));
  base.position.y = 0.03;
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 3), lambert(THREE, 0x34465c));
  roof.rotation.set(-Math.PI / 2, 0, -Math.PI / 2, 'YXZ');
  roof.position.y = 0.2;
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  glow.position.set(0, 0.13, 0.19);
  g.add(base, roof, glow);
  return g;
}

export function buildSouvenir(THREE, id) {
  return id === 'snowglobe' ? snowglobe(THREE) : hutmodel(THREE);
}

export function souvenirOutdoorMesh(THREE, id) {
  if (id !== 'summitflag') return null;
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 8), lambert(THREE, 0x5e3b22));
  pole.position.y = 1.1;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), lambert(THREE, 0xd2463a));
  flag.position.set(0.47, 1.85, 0);
  const cairn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), lambert(THREE, 0x8d95a3));
  cairn.scale.y = 0.6;
  cairn.position.y = 0.15;
  g.add(pole, flag, cairn);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
