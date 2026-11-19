const PINKS = [0xffb7d5, 0xffd1e3, 0xff9cc4, 0xfff0f6];
const N_BLOOM = 240, N_PETAL = 160;

function rnd(seed) {
  let s = seed >>> 0;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
}

export function buildFinaleArt(three, { box, pts, seed = 7 }) {
  const T = three, r = rnd(seed), group = new T.Group();
  const top = box.cy + box.hy, m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();

  const blooms = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ toneMapped: false }), N_BLOOM);
  const spots = [];
  for (let i = 0; i < N_BLOOM; i++) {
    const th = r() * Math.PI * 2, ph = r() * 1.35, rr = 0.86 + r() * 0.1;
    const pos = new T.Vector3(
      box.cx + Math.cos(th) * Math.sin(ph) * box.hx * rr,
      top - box.hy * 0.6 + Math.cos(ph) * box.hy * 0.6 * rr,
      box.cz + Math.sin(th) * Math.sin(ph) * box.hz * rr);
    spots.push({ pos, size: 0.16 + r() * 0.16 });
    blooms.setColorAt(i, new T.Color(PINKS[i % 4]));
  }
  const ys = spots.map(p => p.pos.y), y0 = Math.min(...ys), y1 = Math.max(...ys);
  spots.forEach(p => { p.at = (p.pos.y - y0) / Math.max(1e-6, y1 - y0) * 0.7; });

  const petalGeo = new T.PlaneGeometry(0.16, 0.11);
  const petals = new T.InstancedMesh(petalGeo, new T.MeshBasicMaterial({ color: PINKS[0], side: T.DoubleSide, toneMapped: false }), N_PETAL);
  const fall = [];
  for (let i = 0; i < N_PETAL; i++) {
    fall.push({ x: box.cx + (r() - 0.5) * box.hx * 4.4, y: r() * top, z: box.cz + (r() - 0.5) * box.hz * 4.4 + 4, a: r() * 6, sp: 0.4 + r() * 0.5 });
  }

  const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p.x, p.y, p.z)));
  const tube = new T.Mesh(new T.TubeGeometry(curve, 240, 0.22, 6, false), new T.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false }));
  const halo = new T.Mesh(new T.TubeGeometry(curve, 240, 0.55, 6, false),
    new T.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }));

  group.add(blooms, petals, tube, halo);

  const placePetals = () => {
    fall.forEach((f, i) => { q.setFromEuler(new T.Euler(f.a, f.a * 0.7, f.a * 1.3)); m4.compose(v.set(f.x, f.y, f.z), q, s.set(1, 1, 1)); petals.setMatrixAt(i, m4); });
    petals.instanceMatrix.needsUpdate = true;
  };

  const api = {
    group,
    setReveal(k) {
      const c = Math.min(1, Math.max(0, k));
      for (const o of [tube, halo]) o.geometry.setDrawRange(0, Math.floor(o.geometry.index.count * c / 3) * 3);
    },
    setBloom(k) {
      spots.forEach((p, i) => {
        const g = Math.min(1, Math.max(0, (k - p.at) / 0.3));
        m4.compose(p.pos, q.identity(), s.setScalar(p.size * g));
        blooms.setMatrixAt(i, m4);
      });
      blooms.instanceMatrix.needsUpdate = true;
      petals.visible = k > 0.5;
    },
    setNight(on) { halo.material.opacity = on ? 0.45 : 0.22; },
    update(dt) {
      if (!petals.visible) return;
      for (const f of fall) {
        f.y -= dt * f.sp; f.a += dt * 1.5; f.x += Math.sin(f.a) * dt * 0.3;
        if (f.y < 0) f.y = top;
      }
      placePetals();
    },
  };
  placePetals();
  api.setBloom(0);
  api.setReveal(0);
  return api;
}
