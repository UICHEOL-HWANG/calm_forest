import * as THREE from 'three';

let sharedMat = null;
export const vertexColorMat = () => (sharedMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true }));

export function part(geo, hex, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
  const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
  const c = new THREE.Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

export function mergedMesh(parts) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const size = parts[0].attributes[name].itemSize;
    const arr = new Float32Array(parts.reduce((s, g) => s + g.attributes[name].count, 0) * size);
    let off = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  for (const g of parts) g.dispose();
  out.computeBoundingSphere();
  return new THREE.Mesh(out, vertexColorMat());
}
