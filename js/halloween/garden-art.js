import { kit, buildHalloween } from '../spaces/halloween-art.js';
import { buildJack, buildGhostKid, buildCandyStall } from '../spaces/halloween-event-art.js';
import { HW_R } from './layout.js';

const PURPLE = 0x6b4a9a, PURPLE_D = 0x4a3170, BAND = 0xe8822e, WOOD = 0x6b4a2e;

export function makeSharedCtx(T, onNight = null) {
  const vtx = new Map(), glow = new Map();
  return {
    vtxMat(key = 'base') {
      if (!vtx.has(key)) vtx.set(key, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
      return vtx.get(key);
    },
    glowMat(color, emissive, intensity, night = false) {
      const key = `${color}|${emissive}|${intensity}|${night}`;
      if (!glow.has(key)) {
        const m = new T.MeshStandardMaterial({ color, emissive, emissiveIntensity: night ? 0 : intensity, roughness: 0.5 });
        m.userData.k = intensity;
        if (night && onNight) onNight(m);
        glow.set(key, m);
      }
      return glow.get(key);
    },
  };
}

function concat(T, geos) {
  const out = new T.BufferGeometry();
  for (const name of ['position', 'normal', 'color', 'uv']) {
    if (!geos.every(g => g.attributes[name])) continue;
    const size = geos[0].attributes[name].itemSize;
    let total = 0;
    for (const g of geos) total += g.attributes[name].count;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new T.BufferAttribute(arr, size));
  }
  return out;
}

export function mergeStatic(T, root) {
  root.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), meshes = [];
  const kept = (o) => { for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep) return true; return false; };
  root.traverse(o => { if (o.isMesh && !kept(o)) meshes.push(o); });
  for (const m of meshes) {
    const key = m.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: m.material, geos: [] });
    const geo = m.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    buckets.get(key).geos.push(geo.index ? geo.toNonIndexed() : geo);
    m.parent.remove(m);
  }
  const prune = (node) => { for (const c of [...node.children]) { prune(c); if (c.isGroup && !c.userData.keep && c.children.length === 0) node.remove(c); } };
  prune(root);
  for (const b of buckets.values()) {
    const mesh = new T.Mesh(concat(T, b.geos), b.material);
    mesh.receiveShadow = true;
    root.add(mesh);
    for (const g of b.geos) g.dispose();
  }
  return buckets.size;
}

function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function pine(k, parts, x, z, s, leaf) {
  parts.push(k.cyl(0.14 * s, 0.2 * s, 0.8 * s, x, 0.4 * s, z, 0x4a3426, 6));
  [[1.3, 1.6, 1.2], [1.0, 1.4, 2.1], [0.65, 1.1, 2.9]].forEach(([r, h, y]) => parts.push(k.cone(r * s, h * s, x, y * s, z, leaf, 7)));
}

function deadTree(k, parts, x, z, s) {
  const c = 0x3a2e2a;
  parts.push(k.tilt(0.22 * s, 2.6 * s, 0.22 * s, x, 1.3 * s, z, c, 0.06));
  parts.push(k.tilt(0.1 * s, 1.2 * s, 0.1 * s, x - 0.45 * s, 2.3 * s, z, c, 0.9), k.tilt(0.09 * s, 1.0 * s, 0.09 * s, x + 0.4 * s, 2.0 * s, z, c, -1.0));
  parts.push(k.tilt(0.06 * s, 0.6 * s, 0.06 * s, x - 0.85 * s, 2.75 * s, z, c, 0.2), k.tilt(0.06 * s, 0.5 * s, 0.06 * s, x + 0.75 * s, 2.45 * s, z, c, -0.3));
}

export const GRAVES = Object.freeze([[-6, -3, 2.2], [-4, -5.5, 2], [-7.5, -7, 1.8], [6, -4, 2.2], [4.5, -7, 2], [7.5, -1.5, 1.9], [-3, -9, 2], [3, -10, 2.2]]);
export const LAMPS = Object.freeze([[-3, 6], [3.5, 6.5], [-8, 2], [8.5, 2.5]]);
export const DEAD_TREES = Object.freeze([[-9, -10, 1.4], [9.5, -9, 1.6], [-12, 4, 1.3], [12, 5, 1.2]]);

export function buildGarden(T, onNight) {
  const ctx = makeSharedCtx(T, onNight), k = kit(T), rnd = seeded(11), g = new T.Group(), parts = [];
  const ground = new T.Mesh(new T.CircleGeometry(HW_R + 8, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x5a6a6a, roughness: 1 }));
  ground.position.y = 0.02; ground.receiveShadow = true; ground.userData.keep = true; g.add(ground);
  const rim = new T.Mesh(new T.RingGeometry(HW_R + 8, 70, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x2a3638, roughness: 1 }));
  rim.position.y = 0.01; rim.userData.keep = true; g.add(rim);
  for (let i = 0; i < 6; i++) parts.push(k.cyl(0.55 + rnd() * 0.2, 0.6, 0.06, (rnd() - 0.5) * 0.6, 0.04, 10.6 - i * 1.6, 0x8a8478, 7));
  const gate = buildHalloween(T, 'webarch', 'tree', ctx); gate.position.set(0, 0, 12.2); gate.scale.setScalar(1.3); g.add(gate);
  const stall = buildCandyStall(T, ctx); stall.position.set(0.5, 0, 2.5); stall.scale.setScalar(1.15); g.add(stall);
  for (const [x, z, s] of GRAVES) { const m = buildHalloween(T, 'miniGrave', 'gable', ctx); m.position.set(x, 0, z); m.scale.setScalar(s); m.rotation.y = (rnd() - 0.5) * 0.6; g.add(m); }
  for (let i = 0; i < 12; i++) { const a = -Math.PI * 0.95 + i * 0.16, f = buildHalloween(T, 'gravefence', 'iron', ctx); f.position.set(Math.cos(a) * 11, 0, Math.sin(a) * 11 - 1); f.rotation.y = -a + Math.PI / 2; f.scale.setScalar(1.4); g.add(f); }
  for (const [x, z] of LAMPS) { const l = buildHalloween(T, 'ghostlamp', 'lantern', ctx); l.position.set(x, 0, z); l.scale.setScalar(1.2); g.add(l); }
  for (const [x, z, s] of DEAD_TREES) deadTree(k, parts, x, z, s);
  for (let i = 0; i < 6; i++) { const j = buildJack(T, ctx, { size: 0.7 }), a = rnd() * 6.28; j.position.set(Math.cos(a) * 5, 0, Math.sin(a) * 5 - 3); g.add(j); }
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + rnd() * 0.2, r = 13.5 + rnd() * 5.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > 9 && Math.abs(x) < 3.2) continue;
    pine(k, parts, x, z, 1.1 + rnd() * 0.6, 0x2e3e3c);
  }
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  const mist = new T.MeshBasicMaterial({ color: 0x9a8acc, transparent: true, opacity: 0.18, depthWrite: false });
  for (let i = 0; i < 9; i++) { const m = new T.Mesh(new T.CircleGeometry(2.5 + rnd() * 2, 20).rotateX(-Math.PI / 2), mist); m.position.set((rnd() - 0.5) * 22, 0.15 + i * 0.01, (rnd() - 0.6) * 20); m.renderOrder = 1; g.add(m); }
  mergeStatic(T, g);
  return g;
}

export function buildGhost(T, onNight) {
  return buildGhostKid(T, makeSharedCtx(T, onNight));
}

function signMesh(T, title, sub, w) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 180; const c = cv.getContext('2d');
  c.fillStyle = '#5a3e28'; c.beginPath(); c.roundRect(4, 4, 504, 172, 26); c.fill();
  c.fillStyle = '#f3e3c4'; c.beginPath(); c.roundRect(16, 16, 480, 148, 18); c.fill();
  c.fillStyle = '#3b2a4a'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = "bold 50px 'Apple SD Gothic Neo','Noto Sans KR',sans-serif"; c.fillText(title, 256, 72, 470);
  c.font = "32px 'Apple SD Gothic Neo','Noto Sans KR',sans-serif"; c.fillStyle = '#8a4a10'; c.fillText(sub, 256, 128, 470);
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  const m = new T.Mesh(new T.PlaneGeometry(w, w * 180 / 512), new T.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.28 }));
  m.userData.keep = true;
  return m;
}

function paint(T, geo, hex) {
  const n = geo.index ? geo.toNonIndexed() : geo, col = new T.Color(hex), arr = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) { arr[i] = col.r; arr[i + 1] = col.g; arr[i + 2] = col.b; }
  n.setAttribute('color', new T.BufferAttribute(arr, 3));
  return n;
}

export function buildGate(T, onNight, { title, sub }) {
  const ctx = makeSharedCtx(T, onNight), k = kit(T), parts = [], g = new T.Group();
  parts.push(paint(T, new T.CylinderGeometry(2.3, 2.4, 0.16, 28).translate(0, 0.08, 0), PURPLE_D));
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new T.Vector2(1.55 * (1 - t) ** 0.9 + 0.02, t * 3.4)); }
  const cone = new T.LatheGeometry(pts, 24), p = cone.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y / 3.4; p.setX(i, p.getX(i) + Math.max(0, t - 0.55) ** 2 * 2.6); p.setY(i, y - Math.max(0, t - 0.7) ** 2 * 1.4); }
  cone.computeVertexNormals(); parts.push(paint(T, cone.translate(0, 0.16, 0), PURPLE));
  parts.push(paint(T, new T.CylinderGeometry(1.5, 1.56, 0.32, 24, 1, true).translate(0, 0.52, 0), BAND));
  parts.push(k.box(0.5, 0.42, 0.06, 0, 0.52, 1.56, 0xf2c94a), k.box(0.32, 0.26, 0.07, 0, 0.52, 1.57, PURPLE_D));
  for (const [x, y] of [[-0.8, 1.6], [0.9, 2.2], [0.2, 2.8], [-0.4, 1.2]]) parts.push(paint(T, new T.OctahedronGeometry(0.08, 0).translate(x * 0.9, y, 1.2 - y * 0.27), 0xffe28a));
  parts.push(k.box(0.09, 1.0, 0.09, 1.95, 0.5, 1.5, WOOD));
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  const ds = new T.Shape(); ds.moveTo(-0.55, 0); ds.lineTo(0.55, 0); ds.lineTo(0.55, 0.9); ds.quadraticCurveTo(0, 1.55, -0.55, 0.9); ds.closePath();
  const door = new T.Mesh(new T.ShapeGeometry(ds), ctx.glowMat(0xffb04a, 0xff8a20, 1.5, true)); door.position.set(0, 0.17, 1.6); g.add(door);
  for (const [x, z, sz, ry] of [[-1.3, 1.9, 0.8, 0.3], [-0.75, 2.3, 0.55, 0.3], [1.0, 2.25, 0.6, -0.3], [-2.2, 1.0, 0.7, 0.4]]) { const j = buildJack(T, ctx, { size: sz }); j.position.set(x, 0, z); j.rotation.y = ry; g.add(j); }
  const gh = buildGhostKid(T, ctx); gh.scale.setScalar(0.9); gh.position.set(-1.9, 1.7, 0.9); gh.rotation.z = 0.25; g.add(gh);
  mergeStatic(T, g);
  const s = signMesh(T, title, sub, 1.3); s.position.set(1.95, 1.05, 1.55); s.rotation.y = -0.35; g.add(s);
  return g;
}
