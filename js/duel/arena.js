export const ARENA_LOOK = {
  lantern: { sky: 0x1d2a44, fogNear: 14, fogFar: 40 },
  ring: { sky: 0xf3c9a0, fogNear: 16, fogFar: 45 },
};

export function arenaKind(night) {
  return night ? 'ring' : 'lantern';
}

function rng(seed) {
  let a = (Math.floor(seed * 9973) >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildArena(THREE, { kind, mid, perp, camPos, seed = 1 }) {
  const look = ARENA_LOOK[kind] || ARENA_LOOK.lantern;
  const rand = rng(seed);
  const group = new THREE.Group();
  group.name = 'duel-arena';
  const line = { x: -perp.z, z: perp.x };
  const at = (a, b) => ({ x: mid.x + line.x * a + perp.x * b, z: mid.z + line.z * a + perp.z * b });
  const mats = new Map();
  const std = (c, extra = {}) => {
    const key = `s${c}${extra.side || ''}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true, ...extra }));
    return mats.get(key);
  };
  const glow = (c, fog = true) => {
    const key = `b${c}${fog}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color: c, fog }));
    return mats.get(key);
  };
  const add = (mesh, name, x, y, z) => { mesh.name = name; mesh.position.set(x, y, z); group.add(mesh); return mesh; };
  const disc = (r, c, y, name) => {
    const m = add(new THREE.Mesh(new THREE.CircleGeometry(r, 40), std(c)), name, mid.x, y, mid.z);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    return m;
  };
  const tree = (p, s, c) => {
    const o = new THREE.Group();
    o.name = 'arena-tree';
    o.position.set(p.x, 0, p.z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.1 * s, 6), std(0x8a5a3a));
    trunk.position.y = 0.55 * s;
    const low = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 2.0 * s, 7), std(c));
    low.position.y = 1.9 * s;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.7 * s, 1.5 * s, 7), std(c));
    top.position.y = 2.6 * s;
    o.add(trunk, low, top);
    group.add(o);
  };

  if (kind === 'ring') {
    disc(12, 0x8fbf6a, 0.02, 'arena-ground');
    disc(3.6, 0xe6cf98, 0.026, 'arena-sand');
    const rope = add(new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.09, 6, 48), std(0xc9a46a)), 'arena-rope', mid.x, 0.07, mid.z);
    rope.rotation.x = -Math.PI / 2;
    for (const [a, c] of [[-3.2, 0x3e7a57], [3.2, 0x3a3f66]]) {
      const p = at(a, -2.6);
      const banner = new THREE.Group();
      banner.name = 'arena-banner';
      banner.position.set(p.x, 0, p.z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), std(0x7a5a3a));
      pole.position.y = 1.2;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), std(c, { side: THREE.DoubleSide }));
      flag.position.set(0.36 * Math.sign(-a), 1.85, 0);
      banner.add(pole, flag);
      group.add(banner);
      banner.updateMatrixWorld(true);
      flag.lookAt(camPos.x, 1.85, camPos.z);
    }
    for (let i = 0; i < 8; i++) tree(at(-7 + i * 2, -6 - (i % 2)), 1.0, 0x6a9a58);
    const colors = [0xff7a6a, 0xffd06a, 0x7ad0ff];
    for (let i = 0; i < 5; i++) {
      const p = at(-4.5 + i * 2.2, -4.2);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glow(colors[i % 3])), 'arena-lantern', p.x, 2.3, p.z);
    }
  } else {
    disc(9, 0x3d5a40, 0.02, 'arena-ground');
    disc(3.4, 0x4e6b45, 0.026, 'arena-floor');
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const x = mid.x + Math.cos(ang) * 3.9, z = mid.z + Math.sin(ang) * 3.9;
      if ((x - mid.x) * perp.x + (z - mid.z) * perp.z > 1.5) continue;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 6), std(0x5a4030)), 'arena-post', x, 0.45, z);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), glow(0xffd27a)), 'arena-lamp', x, 1.0, z);
    }
    const mp = at(3.5, -14);
    const moon = add(new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), glow(0xfff1c4, false)), 'arena-moon', mp.x, 6.5, mp.z);
    moon.lookAt(camPos.x, camPos.y, camPos.z);
    for (let i = 0; i < 6; i++) tree(at(-5 + i * 2, -6 - (i % 2) * 1.5), 1.1, 0x2f4a3a);
    const flyGeo = new THREE.SphereGeometry(0.04, 6, 6);
    for (let i = 0; i < 26; i++) {
      const p = at((rand() - 0.5) * 9, (rand() - 0.7) * 6);
      add(new THREE.Mesh(flyGeo, glow(0xfff3a0)), 'arena-firefly', p.x, 0.4 + rand() * 1.6, p.z);
    }
  }

  const dispose = () => {
    const geos = new Set();
    group.traverse(o => { if (o.geometry) geos.add(o.geometry); });
    for (const g of geos) g.dispose();
    for (const m of mats.values()) m.dispose();
  };
  return { group, sky: new THREE.Color(look.sky), fogNear: look.fogNear, fogFar: look.fogFar, dispose };
}
