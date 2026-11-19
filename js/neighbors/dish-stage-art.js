const GRASS = 0xa9d68f, SKY = 0xcfe8f2, BARK = 0x9c6b40, CUT = 0xc9a06a, RING = 0xb58a55, LEAF = 0x6fb46a, TRUNK = 0x8a6440;
const STUMP_R = 2.0, STUMP_Z = -0.3;

export function hostSeat(bodyR) {
  return { x: 0.9, y: 0.42, z: STUMP_Z - Math.sqrt(Math.max(0, (STUMP_R + bodyR) ** 2 - 0.81)), ry: -0.15 };
}

export function buildDishBackdrop(THREE, seat) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, flatShading: true });
  const add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshBasicMaterial({ color: SKY, fog: false }));
  sky.position.set(0, 6, -9); g.add(sky);
  add(new THREE.PlaneGeometry(40, 30).rotateX(-Math.PI / 2), GRASS, 0, 0, -4);
  add(new THREE.CylinderGeometry(STUMP_R, STUMP_R + 0.15, 1.0, 16), BARK, 0, 0.5, STUMP_Z);
  add(new THREE.CylinderGeometry(STUMP_R - 0.02, STUMP_R - 0.02, 0.04, 16), CUT, 0, 1.02, STUMP_Z);
  for (const r of [1.5, 1.0, 0.5]) add(new THREE.TorusGeometry(r, 0.025, 4, 24).rotateX(-Math.PI / 2), RING, 0, 1.045, STUMP_Z);
  add(new THREE.CylinderGeometry(0.3, 0.32, 0.4, 10), BARK, seat.x, 0.2, seat.z);
  add(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 10), CUT, seat.x, 0.41, seat.z);
  const tree = (x, z, s) => { add(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.2 * s, 6), TRUNK, x, 0.6 * s, z); add(new THREE.ConeGeometry(1.0 * s, 2.4 * s, 7), LEAF, x, 2.0 * s, z); };
  for (const [x, z, s] of [[-3.2, -3.6, 1.3], [3.6, -4.4, 1.4], [-1.4, -6.2, 1.6], [1.8, -6.8, 1.5], [-5.4, -1.6, 1], [5.4, -1.2, 1]]) tree(x, z, s);
  return g;
}
