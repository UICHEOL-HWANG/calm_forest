export const AUCTION_ITEM_IDS = ['moonswing', 'lanternarch', 'starvane'];

function kit(THREE) {
  const mats = new Map();
  const clay = c => {
    if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 }));
    return mats.get(c);
  };
  const glow = (c, k) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.6 });
  const up = new THREE.Vector3(0, 1, 0);
  const put = (g, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  };
  const beam = (g, a, b, r, mat) => {
    const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b), d = pb.clone().sub(pa);
    const m = put(g, new THREE.CylinderGeometry(r, r, d.length(), 8), mat);
    m.position.copy(pa.add(pb).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(up, d.normalize());
    return m;
  };
  return { clay, glow, put, beam };
}

function moonswing(THREE) {
  const { clay, glow, put, beam } = kit(THREE);
  const g = new THREE.Group(), wood = clay(0xc79a63), rope = clay(0xe8dcc0);
  for (const sx of [-0.78, 0.78]) {
    beam(g, [sx, 0, 0.36], [sx, 1.78, 0], 0.05, wood);
    beam(g, [sx, 0, -0.36], [sx, 1.78, 0], 0.05, wood);
  }
  beam(g, [-0.9, 1.78, 0], [0.9, 1.78, 0], 0.055, wood);
  for (const sx of [-0.3, 0.3]) beam(g, [sx, 1.76, 0], [sx, 0.56, 0], 0.014, rope);
  put(g, new THREE.BoxGeometry(0.78, 0.06, 0.32), wood, 0, 0.54, 0);
  put(g, new THREE.TorusGeometry(0.17, 0.055, 8, 22, Math.PI * 1.25), glow(0xfff0b0, 0.45), 0, 2.02, 0).rotation.z = 0.95;
  for (const [x, y] of [[-0.55, 1.6], [0.55, 1.62], [0, 1.58]]) {
    beam(g, [x, 1.76, 0], [x, y + 0.05, 0], 0.006, rope);
    put(g, new THREE.OctahedronGeometry(0.055, 0), glow(0xfff4c8, 0.5), x, y, 0);
  }
  return g;
}

function lanternarch(THREE) {
  const { clay, glow, put } = kit(THREE);
  const g = new THREE.Group(), wood = clay(0x8f633f);
  for (const sx of [-0.85, 0.85]) put(g, new THREE.CylinderGeometry(0.07, 0.08, 1.6, 8), wood, sx, 0.8, 0);
  put(g, new THREE.TorusGeometry(0.85, 0.06, 8, 24, Math.PI), wood, 0, 1.6, 0);
  [0xff9a4c, 0xffcf5a, 0xff6f6f, 0xffcf5a, 0xff9a4c].forEach((c, i) => {
    const a = Math.PI * (0.12 + i * 0.19);
    put(g, new THREE.SphereGeometry(0.11, 10, 8), glow(c, 0.5), Math.cos(a) * 0.85, 1.6 + Math.sin(a) * 0.85 - 0.2, 0).scale.y = 1.2;
  });
  return g;
}

function starGeometry(THREE, r) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * 0.45 : r;
    const x = Math.cos(a) * k, y = Math.sin(a) * k;
    if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
  geo.translate(0, 0, -0.035);
  return geo;
}

function starvane(THREE) {
  const { clay, glow, put } = kit(THREE);
  const g = new THREE.Group();
  put(g, new THREE.CylinderGeometry(0.22, 0.26, 0.12, 10), clay(0x9aa3a8), 0, 0.06, 0);
  put(g, new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6), clay(0x5e3d27), 0, 0.9, 0);
  const arrow = new THREE.Group(); arrow.position.y = 1.55; g.add(arrow);
  put(arrow, new THREE.BoxGeometry(0.9, 0.04, 0.04), clay(0x5e3d27), 0, 0, 0);
  put(arrow, new THREE.ConeGeometry(0.08, 0.18, 6), clay(0x5e3d27), 0.48, 0, 0).rotation.z = -Math.PI / 2;
  put(arrow, starGeometry(THREE, 0.36), glow(0xffd23a, 0.5), -0.62, 0, 0);
  put(g, new THREE.SphereGeometry(0.06, 8, 6), clay(0xe0b04a), 0, 1.78, 0);
  g.userData.spin = arrow;
  return g;
}

const BUILD = { moonswing, lanternarch, starvane };

export function auctionItemMesh(THREE, id) {
  return BUILD[id] ? BUILD[id](THREE) : null;
}
