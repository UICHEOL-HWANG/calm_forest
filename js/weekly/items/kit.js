export const PAL = {
  wood: 0xa8683c, woodDark: 0x5e3b22, woodLight: 0xc8955c, cream: 0xf6e7c8, paper: 0xf3e2bd,
  green: 0x7fb37a, greenDeep: 0x4f8a5c, celadon: 0x9fcbb5, celadonDeep: 0x6fa58f,
  straw: 0xe8bf4a, mat: 0xd8bd84, red: 0xd9574a, redDeep: 0xa8423a, gold: 0xf2c14e,
  clay: 0xc4703f, coal: 0x3a2a24, iron: 0x4b4a4f, lamp: 0xffd98a, ember: 0xff8a3c, tea: 0xc08a3a,
  rose: 0xe8a49a, lilac: 0xb7a2d8, tin: 0xaebfca, tinDark: 0x8297a4,
  sea: 0x4f9cc4, drift: 0xbcae96, driftDark: 0x8a7a64, sand: 0xe8d9a8, rope: 0xd8c08a, buoy: 0xef8a4a,
  soil: 0x5a3f2c, shell: 0xf6e2c8, amber: 0xf0b85a,
  ink: 0x4a78b0, inkDeep: 0x34508a,
  stone: 0xe6d5b2, brickDeep: 0x9c5434, crust: 0xd2924a, crumb: 0xf3dca6, berry: 0x7d4a78,
  brass: 0xd6a04a,
};

export function kit(T) {
  const buckets = { body: [], fine: [], glass: [], lamp: [] };
  const M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), V = new T.Vector3(), S = new T.Vector3();
  const UP = new T.Vector3(0, 1, 0);
  const xf = (geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => geo.applyMatrix4(M.compose(V.set(...p), Q.setFromEuler(E.set(...r)), S.set(...s)));
  const paint = (geo, pick) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const c = new T.Color(), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c.set(pick(Math.floor(i / 3))); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  };
  const add = (bucket, hex, geo) => { buckets[bucket].push(paint(geo, () => hex)); };
  const addFaces = (bucket, geo, pick) => { buckets[bucket].push(paint(geo, pick)); };
  const poly = (bucket, faces) => {
    const pos = [], col = [], c = new T.Color();
    for (const { v, c: hex } of faces) {
      c.set(hex);
      for (let i = 1; i < v.length - 1; i++) for (const p of [v[0], v[i], v[i + 1]]) { pos.push(...p); col.push(c.r, c.g, c.b); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    buckets[bucket].push(g);
  };
  const addRaw = (bucket, geo) => { buckets[bucket].push(geo); };
  const box = (w, h, d, a = 1, b = 1, c = 1) => new T.BoxGeometry(w, h, d, a, b, c);
  const cyl = (rt, rb, h, seg = 10, open = false, ts = 0, tl = Math.PI * 2) => new T.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl);
  const ball = (r, detail = 1) => new T.IcosahedronGeometry(r, detail);
  const cone = (r, h, seg = 6) => new T.ConeGeometry(r, h, seg);
  const torus = (R, r, rs = 4, ts = 12) => new T.TorusGeometry(R, r, rs, ts);
  const lathe = (pts, seg = 12) => new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), seg);
  const rod = (a, b, r, r2 = r, seg = 6) => {
    const pa = new T.Vector3(...a), pb = new T.Vector3(...b), d = pb.clone().sub(pa);
    const g = new T.CylinderGeometry(r2, r, d.length(), seg);
    return g.applyMatrix4(new T.Matrix4().compose(pa.clone().add(pb).multiplyScalar(0.5), new T.Quaternion().setFromUnitVectors(UP, d.normalize()), new T.Vector3(1, 1, 1)));
  };
  const aim = (geo, p, dir) => geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p), new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(...dir).normalize()), new T.Vector3(1, 1, 1)));
  const merge = (geos) => {
    const out = new T.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) {
      const total = geos.reduce((t, g) => t + g.getAttribute(name).array.length, 0);
      const arr = new Float32Array(total);
      geos.reduce((off, g) => { arr.set(g.getAttribute(name).array, off); return off + g.getAttribute(name).array.length; }, 0);
      out.setAttribute(name, new T.BufferAttribute(arr, 3));
    }
    return out;
  };
  const finish = (name) => {
    const g = new T.Group();
    g.name = name;
    const lamps = [];
    for (const [k, geos] of Object.entries(buckets)) {
      if (!geos.length) continue;
      const lamp = k === 'lamp', glass = k === 'glass';
      const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: lamp ? 0.6 : glass ? 0.22 : 0.95, metalness: glass ? 0.1 : 0, flatShading: true, side: T.DoubleSide, emissive: lamp ? 0xffb45a : 0x000000, emissiveIntensity: 0 });
      const mesh = new T.Mesh(merge(geos), mat);
      mesh.name = k;
      mesh.castShadow = k === 'body';
      mesh.receiveShadow = !lamp;
      g.add(mesh);
      if (lamp) lamps.push(mat);
      geos.forEach((x) => x.dispose());
    }
    g.userData.lamps = lamps;
    return g;
  };
  return { T, xf, add, addFaces, addRaw, poly, box, cyl, ball, cone, lathe, torus, rod, aim, finish };
}

export const at3 = (k, x, y, z, ry = 0) => (g) => k.xf(g, [x, y, z], [0, ry, 0]);

export function lantern(k, x, y, z, hang = 0.2) {
  const { add, xf, cyl, rod } = k;
  add('fine', PAL.woodDark, rod([x, y + hang, z], [x, y + 0.1, z], 0.012, 0.012, 4));
  add('fine', PAL.woodDark, xf(cyl(0.06, 0.11, 0.05, 8), [x, y + 0.1, z]));
  add('lamp', PAL.lamp, xf(cyl(0.1, 0.1, 0.17, 8), [x, y, z]));
  add('fine', PAL.woodDark, xf(cyl(0.11, 0.06, 0.04, 8), [x, y - 0.1, z]));
}

export function lump(T, r, [sx, sy, sz], flat = 0.5, detail = 1) {
  const g = new T.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * sx, Math.max(p.getY(i) * sy, -r * sy * flat), p.getZ(i) * sz);
  g.computeVertexNormals();
  return g.translate(0, r * sy * flat - 0.004, 0);
}
