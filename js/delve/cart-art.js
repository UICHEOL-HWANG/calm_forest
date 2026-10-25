export const MINE_CART_ID = 'mine_cart';
export const MINE_CART_SCALE = 1.2;
export const MINE_CART_BOX = Object.freeze({ w: 1.2, d: 0.8 });

export const CART_COLORS = Object.freeze({
  wood: 0x9a6a3e, woodDark: 0x7a5232, woodLight: 0xb88a58, iron: 0x4c4f58, ironDark: 0x383a41,
  brass: 0xb8963a, hollow: 0x3e2c1e, copper: 0xc07a48, gem: 0x5ab8c8, amber: 0xd9a24a,
  ore: Object.freeze([0x7d7a78, 0x5d5a5a, 0x8f8b86, 0x4c4a4a]),
});

const C = CART_COLORS;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function frustum(THREE, wTop, wBot, dTop, dBot, hgt, open = false) {
  const geo = new THREE.CylinderGeometry(1, 1, hgt, 4, 1, open);
  geo.rotateY(Math.PI / 4);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0;
    p.setX(i, p.getX(i) * Math.SQRT2 * (top ? wTop : wBot) / 2);
    p.setZ(i, p.getZ(i) * Math.SQRT2 * (top ? dTop : dBot) / 2);
  }
  geo.computeVertexNormals();
  return geo;
}

function parts(THREE) {
  const out = [];
  const add = (geo, color, x, y, z, rot) => {
    const m = new THREE.Mesh(geo);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(...rot);
    m.userData.color = color;
    out.push(m);
    return m;
  };
  const len = 1.9;
  [-0.27, 0.27].forEach(z => add(new THREE.BoxGeometry(len, 0.05, 0.05), C.iron, 0, 0.085, z));
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.16, 0.06, 0.82), C.woodDark, (i - 1) * (len / 3) * 0.9, 0.03, 0);
  const W = 1.0, D = 0.62, H = 0.46, ty = 0.3;
  add(frustum(THREE, W, W * 0.82, D, D * 0.82, H), C.wood, 0, ty + H / 2, 0);
  [0.12, 0.34].forEach(t => {
    const wt = W * 0.82 + (W - W * 0.82) * (t / H), dt = D * 0.82 + (D - D * 0.82) * (t / H);
    add(frustum(THREE, wt * 1.03, wt * 1.03, dt * 1.04, dt * 1.04, 0.05, true), C.ironDark, 0, ty + t, 0);
  });
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) =>
    add(new THREE.BoxGeometry(0.07, H * 0.98, 0.07), C.woodDark, sx * W * 0.455, ty + H / 2, sz * D * 0.455, [sz * -0.18, 0, sx * 0.18]));
  [D / 2 + 0.005, -D / 2 - 0.005].forEach(z => add(new THREE.BoxGeometry(W + 0.04, 0.06, 0.05), C.woodLight, 0, ty + H, z));
  [-1, 1].forEach(s => add(new THREE.BoxGeometry(0.05, 0.06, D + 0.06), C.woodLight, s * (W / 2 + 0.005), ty + H, 0));
  add(new THREE.BoxGeometry(W * 0.94, 0.02, D * 0.92), C.hollow, 0, ty + H - 0.05, 0);
  [[-0.32, 0.29], [0.32, 0.29], [-0.32, -0.29], [0.32, -0.29]].forEach(([x, z]) => {
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 14), C.ironDark, x, 0.25, z, [Math.PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(0.15 * 0.38, 0.15 * 0.38, 0.09, 8), C.brass, x, 0.25, z, [Math.PI / 2, 0, 0]);
  });
  const r = rng(5), cy = ty + H - 0.08, hw = 0.82, hd = 0.46, n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.6, rr = (i === 0 ? 0 : 0.55 + r() * 0.35);
    const s = 0.11 + r() * 0.06 + (i === 0 ? 0.04 : 0);
    const m = add(new THREE.IcosahedronGeometry(s, 0), C.ore[i % C.ore.length], Math.cos(a) * rr * hw / 2, cy + s * 0.55 + (1 - rr) * 0.06, Math.sin(a) * rr * hd / 2);
    m.rotation.set(r() * 3, r() * 3, r() * 3); m.scale.set(1, 0.8 + r() * 0.3, 1);
  }
  [[0.22, 0.26, 0.08, C.copper, 0.09], [-0.18, 0.28, -0.04, C.gem, 0.08], [0.02, 0.33, 0.1, C.amber, 0.07]].forEach(([x, y, z, c, s]) => {
    const m = add(new THREE.OctahedronGeometry(s, 0), c, x, cy + y, z, [0.4, 0.7, 0.2]);
    m.scale.set(0.8, 1.25, 0.8);
  });
  return out;
}

export function buildMineCart(THREE) {
  const scale = new THREE.Matrix4().makeScale(MINE_CART_SCALE, MINE_CART_SCALE, MINE_CART_SCALE);
  const geos = parts(THREE).map(m => {
    m.updateMatrix();
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix).applyMatrix4(scale);
    m.geometry.dispose();
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
    const c = new THREE.Color(m.userData.color), cnt = geo.attributes.position.count, col = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  });
  const merged = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(geos.reduce((t, g) => t + g.attributes[name].array.length, 0));
    geos.reduce((off, g) => { arr.set(g.attributes[name].array, off); return off + g.attributes[name].array.length; }, 0);
    merged.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  geos.forEach(g => g.dispose());
  merged.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}
