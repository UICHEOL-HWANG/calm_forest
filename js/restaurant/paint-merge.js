export function paintKit(THREE) {
  const tag = (c, glow = false) => ({ c, glow });
  const put = (g, geo, m, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => {
    const o = new THREE.Mesh(geo);
    o.userData.paint = m;
    o.position.set(...p); o.rotation.set(...r); o.scale.set(...s);
    g.add(o);
    return o;
  };
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
  const ball = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
  return { tag, put, box, cyl, ball };
}

const SOLID = { roughness: 0.85, metalness: 0, flatShading: true };

export function mergePainted(THREE, root, { glow = false, emissive = 0xffd29a, intensity = 0.45 } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const parts = [];
  root.traverse(o => {
    if (!o.isMesh || !o.userData.paint || o.userData.paint.glow !== glow) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = new THREE.Color(o.userData.paint.c), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  });
  if (!parts.length) return null;
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(parts.reduce((s, g) => s + g.attributes[name].array.length, 0));
    let off = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, off); off += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  parts.forEach(g => g.dispose());
  out.computeBoundingSphere();
  const mat = glow
    ? new THREE.MeshStandardMaterial({ vertexColors: true, emissive, emissiveIntensity: intensity, roughness: 0.5 })
    : new THREE.MeshStandardMaterial({ vertexColors: true, ...SOLID });
  const mesh = new THREE.Mesh(out, mat);
  mesh.castShadow = !glow;
  mesh.receiveShadow = true;
  mesh.userData.glow = glow;
  return mesh;
}

export function bake(THREE, build, opts = {}) {
  const scratch = new THREE.Group();
  build(scratch);
  const solid = mergePainted(THREE, scratch, { ...opts, glow: false });
  const glow = mergePainted(THREE, scratch, { ...opts, glow: true });
  scratch.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
  return [solid, glow].filter(Boolean);
}
