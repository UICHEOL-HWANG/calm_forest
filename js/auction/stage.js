import { auctionItemMesh } from './items.js';

export function buildAuctionStage(THREE) {
  const mats = new Map();
  const clay = c => {
    if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 }));
    return mats.get(c);
  };
  const UP = new THREE.Vector3(0, 1, 0);
  const place = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) => geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(...s),
  ));
  const merge = geos => {
    const parts = geos.map(g => (g.index ? g.toNonIndexed() : g));
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal']) {
      const total = parts.reduce((t, g) => t + g.getAttribute(name).array.length, 0);
      const arr = new Float32Array(total);
      parts.reduce((off, g) => { arr.set(g.getAttribute(name).array, off); return off + g.getAttribute(name).array.length; }, 0);
      out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
    return out;
  };
  const g = new THREE.Group();
  const lanterns = [];
  const batches = new Map();
  const part = (color, geo, shadow = true) => {
    const key = `${color}:${shadow}`;
    if (!batches.has(key)) batches.set(key, { color, shadow, geos: [] });
    batches.get(key).geos.push(geo);
  };
  const box = (c, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, shadow = true) => part(c, place(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz), shadow);
  const cyl = (c, rt, rb, h, seg, x, y, z, rx = 0, ry = 0, rz = 0, shadow = true) => part(c, place(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, ry, rz), shadow);

  const WOOD = 0xc9935f, WOOD_D = 0x8f633f, WOOD_DD = 0x6d4a2e, GOLD = 0xe0b04a, CREAM = 0xfff2e0, PINK = 0xff8f8f, RED = 0x9c3533, RED_L = 0xb8433f, STRING = 0x3a2a20;

  box(WOOD, 6.4, 0.5, 3.2, 0, 0.25, 0);
  box(WOOD_D, 6.44, 0.46, 0.05, 0, 0.24, 1.62);
  for (let i = 0; i < 16; i++) {
    part(i % 2 ? CREAM : PINK, place(new THREE.ConeGeometry(0.19, 0.32, 3), -3.0 + i * 0.4, 0.33, 1.7, Math.PI, Math.PI / 6, 0, [1, 1, 0.25]), false);
  }
  box(WOOD_D, 1.3, 0.25, 0.45, 0, 0.125, 1.85);
  for (let i = 0; i < 7; i++) box(WOOD_D, 6.4, 0.012, 0.02, 0, 0.506, -1.4 + i * 0.45);
  for (const sx of [-3.15, 3.15]) cyl(WOOD_DD, 0.1, 0.12, 4.1, 8, sx, 2.05, -1.4);
  for (let i = 0; i < 14; i++) box(i % 2 ? RED : RED_L, 0.45, 3.1, 0.12, -2.93 + i * 0.45, 2.05, -1.42 + (i % 2) * 0.07);
  box(WOOD_DD, 6.6, 0.16, 0.22, 0, 4.0, -1.35);
  box(GOLD, 6.4, 0.34, 0.16, 0, 3.74, -1.26);
  for (let i = 0; i < 14; i++) part(GOLD, place(new THREE.SphereGeometry(0.23, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), -2.93 + i * 0.45, 3.58, -1.22));
  cyl(0xefe3c8, 1.05, 1.05, 0.06, 28, -1.25, 0.52, -0.05, 0, 0, 0, false);
  box(WOOD_DD, 0.9, 1.0, 0.62, 1.75, 1.0, 0.5);
  box(0xa0703f, 1.06, 0.08, 0.74, 1.75, 1.54, 0.5, -0.12);
  box(GOLD, 0.5, 0.36, 0.02, 1.75, 1.05, 0.82, 0, 0, 0, false);
  cyl(WOOD_DD, 0.12, 0.12, 0.05, 12, 2.0, 1.6, 0.58);
  box(WOOD_DD, 0.5, 0.06, 0.06, -3.4, 3.65, -1.2, 0, 0, 0, false);
  for (const x of [-6.4, 6.4]) {
    cyl(WOOD_DD, 0.09, 0.11, 4.6, 8, x, 2.3, 4.0);
    part(GOLD, place(new THREE.SphereGeometry(0.13, 8, 6), x, 4.65, 4.0), false);
  }

  const pedestal = new THREE.Group();
  pedestal.position.set(-1.25, 0.54, -0.05);
  g.add(pedestal);

  const pivot = (x, y, z) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    g.add(p);
    return p;
  };
  const addTo = (p, c, geo) => {
    const m = new THREE.Mesh(geo, clay(c));
    m.castShadow = true;
    m.receiveShadow = true;
    p.add(m);
    return m;
  };
  const gavel = pivot(1.52, 1.62, 0.6);
  addTo(gavel, 0x7a5232, place(new THREE.CylinderGeometry(0.028, 0.028, 0.46, 6), 0.23, 0, 0, 0, 0, Math.PI / 2));
  addTo(gavel, 0x5e3d27, place(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 10), 0.47, 0, 0, Math.PI / 2, 0, 0));
  const bell = pivot(-3.6, 3.62, -1.2);
  addTo(bell, 0x3a2a20, place(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4), 0, -0.06, 0)).castShadow = false;
  addTo(bell, 0xd9a93a, place(new THREE.CylinderGeometry(0.07, 0.19, 0.26, 14), 0, -0.25, 0));
  addTo(bell, 0x8a6a2a, place(new THREE.SphereGeometry(0.06, 8, 6), 0, -0.4, 0)).castShadow = false;

  const warm = [0xff9a4c, 0xffcf5a, 0xff6f6f, 0xffb35c];
  const lanternGeo = new THREE.SphereGeometry(0.15, 12, 10);
  const string = (a, b, sag, n, cols) => {
    const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b), pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, p = pa.clone().lerp(pb, t);
      p.y -= Math.sin(Math.PI * t) * sag;
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    part(STRING, new THREE.TubeGeometry(curve, 40, 0.014, 4), false);
    for (let i = 0; i < n; i++) {
      const p = curve.getPoint((i + 0.5) / n), c = cols[i % cols.length];
      const m = new THREE.Mesh(lanternGeo, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.05, roughness: 0.6 }));
      m.position.set(p.x, p.y - 0.24, p.z);
      m.scale.y = 1.2;
      g.add(m);
      lanterns.push(m);
    }
  };
  string([-6.4, 4.45, 4.0], [6.4, 4.45, 4.0], 0.9, 11, warm);
  string([-3.15, 4.05, -1.3], [6.4, 4.45, 4.0], 0.8, 9, warm.slice(1));
  string([3.15, 4.05, -1.3], [-6.4, 4.45, 4.0], 0.8, 9, warm.slice(2).concat(warm.slice(0, 2)));

  for (const { color, shadow, geos } of batches.values()) {
    const m = new THREE.Mesh(merge(geos), clay(color));
    m.castShadow = shadow;
    m.receiveShadow = true;
    g.add(m);
  }

  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff3c6, transparent: true, opacity: 0.04, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 28, 1, true), beamMat);
  g.add(cone);
  const CONE_BASE = 0.04, POOL_BASE = 0.18;
  let nightLevel = 0;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), beamMat.clone());
  pool.rotation.x = -Math.PI / 2;
  pool.material.opacity = 0;
  g.add(pool);

  const top = new THREE.Vector3(-1.25, 7.4, 2.2), aim = new THREE.Vector3(), dir = new THREE.Vector3();
  const focus = (x, z) => {
    const onStage = Math.abs(x + 1.25) < 0.01 && Math.abs(z + 0.05) < 0.01;
    const y = onStage ? 0.57 : 0.03;
    aim.set(x, y, z);
    dir.copy(top).sub(aim);
    const len = dir.length(), r = Math.tan(0.36) * len * 0.8;
    cone.scale.set(r, len, r);
    cone.position.copy(top).add(aim).multiplyScalar(0.5);
    cone.quaternion.setFromUnitVectors(UP, dir.normalize());
    pool.position.set(x, y, z);
  };
  focus(-1.25, -0.05);
  const applyNight = () => {
    cone.material.opacity = CONE_BASE * nightLevel;
    pool.material.opacity = POOL_BASE * nightLevel;
    cone.visible = pool.visible = nightLevel > 0.02;
  };
  applyNight();
  const disposeTree = root => {
    const seen = new Set();
    root.traverse(o => {
      if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      for (const m of [].concat(o.material || [])) {
        if (!seen.has(m)) { seen.add(m); m.dispose(); }
      }
    });
  };

  return {
    group: g, lanterns, gavel, bell, pedestal, cone, pool, focus,
    setItem(id) {
      for (const old of pedestal.children) disposeTree(old);
      pedestal.clear();
      const m = auctionItemMesh(THREE, id);
      if (m) {
        m.rotation.y = 0.25;
        pedestal.add(m);
      }
    },
    setNight(level) {
      nightLevel = Math.max(0, Math.min(1, level));
      const k = 0.05 + 0.5 * nightLevel;
      applyNight();
      for (const m of lanterns) m.material.emissiveIntensity = k;
    },
    setTension(on, t) {
      const flicker = on ? 0.875 + 0.75 * (0.5 + 0.5 * Math.sin(t * 14)) * 0.5 : 1;
      cone.material.opacity = CONE_BASE * nightLevel * flicker;
    },
  };
}
