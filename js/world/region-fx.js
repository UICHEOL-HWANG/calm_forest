const PALETTE = {
  water:   [0x9fe3ff, 0xdff6ff, 0x6fc7f0],
  farm:    [0xffb7cf, 0xffe28a, 0xfff6d8],
  kitchen: [0xffcf7a, 0xffa94d, 0xfff1d0],
  forest:  [0xfff27a, 0xd9ff8a, 0xfffbd0],
  mine:    [0xa8f0ff, 0xd7b8ff, 0xffffff],
};
const AMBIENT = {
  water:   { rate: 26, r: 4.5, y: [0.2, 0.4], vy: 1.6, wob: 0, life: 1.6, big: 0.08, rings: 5 },
  farm:    { rate: 22, r: 5, y: [3.5, 6], vy: -0.8, wob: 1.6, life: 3, big: 0, rings: 0 },
  kitchen: { rate: 16, r: 3.2, y: [0.6, 3.5], vy: 0.9, wob: 0.4, life: 1.8, big: 0.25, rings: 0 },
  forest:  { rate: 14, r: 6, y: [0.6, 3], vy: 0.15, wob: 1.4, life: 3.2, big: 0, rings: 0 },
  mine:    { rate: 18, r: 3, y: [0.4, 2.6], vy: 0.7, wob: 0.3, life: 1.5, big: 0.15, rings: 0 },
};
const MAX = 220;
const AMBIENT_TIME = 4.5;
const RISE_TIME = 0.8;
const RISE_DEPTH = 2.5;

const backOut = (t) => { const x = Math.min(1, Math.max(0, t)), c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const rnd = (a, b) => a + Math.random() * (b - a);

function dotTexture(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function pointPool(THREE, tex, size) {
  const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ map: tex, size, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; pts.renderOrder = 5; pts.visible = false;
  const live = [], tint = new THREE.Color();
  return {
    pts,
    count: () => live.length,
    spawn(p, v, color, life, wob = 0, g = 0) {
      if (live.length >= MAX) return;
      tint.setHex(color);
      live.push({ p: { ...p }, v: { ...v }, c: [tint.r, tint.g, tint.b], life, age: 0, wob, g, ph: Math.random() * 6 });
    },
    update(dt) {
      if (!live.length && !pts.visible) return;
      for (let i = live.length - 1; i >= 0; i--) {
        const q = live[i]; q.age += dt;
        if (q.age >= q.life) { live.splice(i, 1); continue; }
        q.v.y += q.g * dt;
        q.p.x += (q.v.x + Math.sin(q.age * 3 + q.ph) * q.wob) * dt;
        q.p.y += q.v.y * dt;
        q.p.z += (q.v.z + Math.cos(q.age * 2.3 + q.ph) * q.wob) * dt;
      }
      for (let i = 0; i < live.length; i++) {
        const q = live[i], a = Math.sin(Math.PI * Math.min(1, (q.age / q.life) * 1.15)), j = i * 3;
        pos[j] = q.p.x; pos[j + 1] = q.p.y; pos[j + 2] = q.p.z;
        col[j] = q.c[0] * a; col[j + 1] = q.c[1] * a; col[j + 2] = q.c[2] * a;
      }
      geo.setDrawRange(0, live.length);
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      pts.visible = live.length > 0;
    },
  };
}

export function createRegionFx(THREE, scene) {
  const tex = dotTexture(THREE);
  const small = pointPool(THREE, tex, 0.42), big = pointPool(THREE, tex, 1.1);
  scene.add(small.pts, big.pts);
  const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xfff6c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  orb.scale.setScalar(1.7); orb.visible = false; orb.renderOrder = 6;
  scene.add(orb);
  const rings = Array.from({ length: 4 }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m);
    return { m, age: 0, life: 1.6, on: false };
  });
  let ambient = null, rise = null;
  const ring = (at, color, delay = 0) => {
    const r = rings.find(x => !x.on); if (!r) return;
    r.on = true; r.age = -delay; r.m.material.color.setHex(color); r.m.position.set(at.x, 0.08, at.z);
  };
  const updateAmbient = (dt) => {
    const { at, pal, cfg } = ambient;
    ambient.left -= dt;
    const n = Math.floor(cfg.rate * dt + Math.random());
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * cfg.r;
      const p = { x: at.x + Math.cos(a) * d, y: rnd(cfg.y[0], cfg.y[1]), z: at.z + Math.sin(a) * d };
      const v = { x: cfg.wob ? rnd(-0.3, 0.3) : 0, y: cfg.vy * rnd(1, 1.4), z: 0 };
      (Math.random() < cfg.big ? big : small).spawn(p, v, pal[i % 3], cfg.life, cfg.wob);
    }
    if (ambient.rings > 0 && (ambient.nextRing -= dt) <= 0) { ring(at, pal[1]); ambient.rings--; ambient.nextRing = 0.75; }
    if (ambient.left <= 0) ambient = null;
  };
  const updateRings = (dt) => {
    for (const r of rings) {
      if (!r.on) continue;
      r.age += dt;
      if (r.age < 0) { r.m.visible = false; continue; }
      const k = r.age / r.life;
      if (k >= 1) { r.on = false; r.m.visible = false; continue; }
      r.m.visible = true; r.m.scale.setScalar(0.5 + k * 7.5); r.m.material.opacity = 0.75 * (1 - k);
    }
  };
  return {
    setOrb(p) {
      orb.visible = !!p?.visible;
      if (!orb.visible) return;
      orb.position.set(p.x, p.y, p.z);
      if (Math.random() < 0.6) small.spawn({ x: p.x + rnd(-0.25, 0.25), y: p.y + rnd(-0.25, 0.25), z: p.z + rnd(-0.25, 0.25) }, { x: 0, y: -0.3, z: 0 }, 0xfff1a8, 0.6);
    },
    land(region, group) {
      const pal = PALETTE[region.fx], at = region.at, cfg = AMBIENT[region.fx];
      orb.visible = false;
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * Math.PI * 2, sp = rnd(3, 7);
        small.spawn({ x: at.x, y: 1.2, z: at.z }, { x: Math.cos(a) * sp, y: rnd(2, 6), z: Math.sin(a) * sp }, pal[i % 3], 1.3, 0, -6);
      }
      for (let i = 0; i < 6; i++) big.spawn({ x: at.x + rnd(-1, 1), y: rnd(0.8, 2.2), z: at.z + rnd(-1, 1) }, { x: 0, y: 0.6, z: 0 }, pal[0], 1.1);
      ring(at, pal[1]); ring(at, pal[0], 0.35);
      ambient = { at, pal, cfg, left: AMBIENT_TIME, rings: cfg.rings, nextRing: 0.6 };
      if (group) { rise = { group, t: 0 }; group.position.y = -RISE_DEPTH; }
    },
    update(dt) {
      if (ambient) updateAmbient(dt);
      if (rise) {
        rise.t += dt;
        const k = rise.t / RISE_TIME;
        rise.group.position.y = k >= 1 ? 0 : -RISE_DEPTH * (1 - backOut(k));
        if (k >= 1) rise = null;
      }
      updateRings(dt);
      small.update(dt); big.update(dt);
    },
    finish() {
      orb.visible = false;
    },
  };
}
