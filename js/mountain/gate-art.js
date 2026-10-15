function merge(THREE, parts) {
  const geos = parts.map(([geo, x, y, z, sx, sy, sz]) => {
    const g = geo.clone().toNonIndexed();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz)));
    return g;
  });
  const count = geos.reduce((n, g) => n + g.attributes.position.array.length, 0);
  const pos = new Float32Array(count);
  let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

export function buildGateArt(THREE) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 7);
  const wood = merge(THREE, [[box, -1.6, 1.4, 0, 0.35, 2.8, 0.35], [box, 1.6, 1.4, 0, 0.35, 2.8, 0.35], [box, 0, 2.9, 0, 3.8, 0.35, 0.45]]);
  const snow = merge(THREE, [[box, 0, 3.15, 0, 4.0, 0.18, 0.6], [cone, 0, 2.15, -2.6, 1.0, 0.9, 1.0]]);
  const rock = merge(THREE, [[cone, 0, 1.0, -2.6, 1.9, 2.0, 1.9], [cone, -1.3, 0.6, -2.3, 1.0, 1.2, 1.0]]);
  const mat = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(wood, mat(0x7a5534)), new THREE.Mesh(snow, mat(0xf6f8fb)), new THREE.Mesh(rock, mat(0x5b6a4c)));
  return group;
}
