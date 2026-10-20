import * as T from 'three';
import { kit, makeCtx } from '/js/spaces/halloween-art.js';
import { buildJack, buildGhostKid } from '/js/spaces/halloween-event-art.js';

const STONE = 0x8f8a96, STONE_D = 0x6c6676, IRON = 0x2e2a36, PURPLE = 0x6b4a9a, PURPLE_D = 0x4a3170, BAND = 0xe8822e, WOOD = 0x6b4a2e;
const NAME = '달빛 안개 정원', SUB = '🎃 11/2까지';

function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new T.Color(hex), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new T.BufferAttribute(arr, 3));
  return g;
}

function portal(w, h) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const c = cv.getContext('2d');
  const gr = c.createRadialGradient(64, 150, 6, 64, 150, 120); gr.addColorStop(0, '#c9a8ff'); gr.addColorStop(0.45, 'rgba(150,100,230,0.55)'); gr.addColorStop(1, 'rgba(80,40,140,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 128, 256);
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, opacity: 0.75, side: T.DoubleSide }));
}

function sign(w = 1.7) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 180; const c = cv.getContext('2d');
  c.fillStyle = '#5a3e28'; c.beginPath(); c.roundRect(4, 4, 504, 172, 26); c.fill();
  c.fillStyle = '#f3e3c4'; c.beginPath(); c.roundRect(16, 16, 480, 148, 18); c.fill();
  c.fillStyle = '#3b2a4a'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = "bold 50px 'Apple SD Gothic Neo','Noto Sans KR',sans-serif"; c.fillText(NAME, 256, 72);
  c.font = "32px 'Apple SD Gothic Neo','Noto Sans KR',sans-serif"; c.fillStyle = '#8a4a10'; c.fillText(SUB, 256, 128);
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(w, w * 180 / 512), new T.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.28 }));
}

function bat(parts, x, y, z, s = 1, rz = 0) {
  const sh = new T.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.12, 0.1, 0.3, 0.06);
  [[0.24, -0.02], [0.18, 0.02], [0.12, -0.04], [0.06, 0], [0, -0.05], [-0.06, 0], [-0.12, -0.04], [-0.18, 0.02], [-0.24, -0.02], [-0.3, 0.06]].forEach(([a, b]) => sh.lineTo(a, b));
  sh.quadraticCurveTo(-0.12, 0.1, 0, 0);
  parts.push(paint(new T.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }).rotateZ(rz).scale(s, s, s).translate(x, y, z), IRON));
}

function jacks(g, ctx, list) { for (const [x, z, sz, ry = 0] of list) { const j = buildJack(T, ctx, { size: sz }); j.position.set(x, 0, z); j.rotation.y = ry; g.add(j); } }

export function gatePillars(ctx) {
  const k = kit(T), parts = [], g = new T.Group();
  for (const sx of [-1, 1]) {
    const x = sx * 1.35;
    parts.push(k.box(0.7, 0.25, 0.7, x, 0.12, 0, STONE_D), k.box(0.56, 1.7, 0.56, x, 1.1, 0, STONE), k.box(0.68, 0.14, 0.68, x, 2.0, 0, STONE_D));
    for (let i = 0; i < 4; i++) parts.push(k.box(0.58, 0.03, 0.58, x, 0.45 + i * 0.4, 0, STONE_D));
    const j = buildJack(T, ctx, { size: 1.15 }); j.position.set(x, 2.07, 0); j.rotation.y = -sx * 0.25; g.add(j);
  }
  parts.push(paint(new T.TorusGeometry(1.35, 0.05, 6, 28, Math.PI).translate(0, 2.05, 0), IRON), paint(new T.TorusGeometry(1.15, 0.035, 6, 28, Math.PI).translate(0, 2.05, 0), IRON));
  for (let i = 1; i < 8; i++) { const a = (i / 8) * Math.PI; parts.push(k.tilt(0.03, 0.22, 0.03, Math.cos(a) * 1.25, 2.05 + Math.sin(a) * 1.25, 0, IRON, a - Math.PI / 2)); }
  bat(parts, -0.55, 3.05, 0.03, 0.9, 0.15); bat(parts, 0.6, 3.15, 0.03, 0.75, -0.2); bat(parts, 0.05, 3.45, 0.03, 0.6, 0);
  parts.push(k.box(0.03, 0.4, 0.03, -0.45, 2.85, 0.02, IRON), k.box(0.03, 0.4, 0.03, 0.45, 2.85, 0.02, IRON));
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  const s = sign(1.15); s.position.set(0, 2.58, 0.06); g.add(s);
  const p = portal(2.1, 2.3); p.position.set(0, 1.18, 0); g.add(p);
  jacks(g, ctx, [[-1.95, 0.6, 0.7, 0.3], [1.95, 0.5, 0.6, -0.3], [-2.35, -0.2, 0.5, 0.4]]);
  return g;
}

export function gateHat(ctx) {
  const k = kit(T), parts = [], g = new T.Group();
  parts.push(paint(new T.CylinderGeometry(2.3, 2.4, 0.16, 28).translate(0, 0.08, 0), PURPLE_D));
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new T.Vector2(1.55 * (1 - t) ** 0.9 + 0.02, t * 3.4)); }
  const cone = new T.LatheGeometry(pts, 24), p = cone.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y / 3.4; p.setX(i, p.getX(i) + Math.max(0, t - 0.55) ** 2 * 2.6); p.setY(i, y - Math.max(0, t - 0.7) ** 2 * 1.4); }
  cone.computeVertexNormals(); parts.push(paint(cone.translate(0, 0.16, 0), PURPLE));
  parts.push(paint(new T.CylinderGeometry(1.5, 1.56, 0.32, 24, 1, true).translate(0, 0.52, 0), BAND));
  parts.push(k.box(0.5, 0.42, 0.06, 0, 0.52, 1.56, 0xf2c94a), k.box(0.32, 0.26, 0.07, 0, 0.52, 1.57, PURPLE_D));
  for (const [x, y] of [[-0.8, 1.6], [0.9, 2.2], [0.2, 2.8], [-0.4, 1.2]]) parts.push(paint(new T.OctahedronGeometry(0.08, 0).translate(x * 0.9, y, 1.2 - y * 0.27), 0xffe28a));
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  const ds = new T.Shape(); ds.moveTo(-0.55, 0); ds.lineTo(0.55, 0); ds.lineTo(0.55, 0.9); ds.quadraticCurveTo(0, 1.55, -0.55, 0.9); ds.closePath();
  const door = new T.Mesh(new T.ShapeGeometry(ds), ctx.glowMat(0xffb04a, 0xff8a20, 1.5, true)); door.position.set(0, 0.17, 1.6); g.add(door);
  const s = sign(1.3); s.position.set(1.95, 1.05, 1.55); s.rotation.y = -0.35; g.add(s);
  const post = new T.Mesh(new T.BoxGeometry(0.09, 1.0, 0.09), new T.MeshStandardMaterial({ color: WOOD })); post.position.set(1.95, 0.5, 1.5); g.add(post);
  jacks(g, ctx, [[-1.3, 1.9, 0.8, 0.3], [-0.75, 2.3, 0.55, 0.3], [1.0, 2.25, 0.6, -0.3], [-2.2, 1.0, 0.7, 0.4]]);
  const gh = buildGhostKid(T, ctx); gh.scale.setScalar(0.9); gh.position.set(-1.9, 1.7, 0.9); gh.rotation.z = 0.25; g.add(gh);
  return g;
}

export function gateTunnel(ctx) {
  const k = kit(T), parts = [], g = new T.Group(), bulbsO = [], bulbsP = [];
  for (let i = 0; i < 3; i++) {
    const z = -i * 1.3, r = 1.35 - i * 0.12;
    for (const sx of [-1, 1]) parts.push(k.box(0.14, 1.6, 0.14, sx * r, 0.8, z, WOOD));
    parts.push(paint(new T.TorusGeometry(r, 0.06, 6, 24, Math.PI).translate(0, 1.6, z), WOOD));
    for (let j = 0; j <= 10; j++) { const a = (j / 10) * Math.PI; (j % 2 ? bulbsP : bulbsO).push(k.orb(0.075, Math.cos(a) * r, 1.6 + Math.sin(a) * r, z + 0.07, 0xffffff)); }
    for (let j = 0; j < 4; j++) { const y = 0.25 + j * 0.4; (j % 2 ? bulbsO : bulbsP).push(k.orb(0.065, -r, y, z + 0.08, 0xffffff), k.orb(0.065, r, y, z + 0.08, 0xffffff)); }
  }
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  g.add(new T.Mesh(k.merge(bulbsO), ctx.glowMat(0xffb04a, 0xff9a30, 1.8, true)));
  g.add(new T.Mesh(k.merge(bulbsP), ctx.glowMat(0xc39aff, 0xa070ff, 1.8, true)));
  const p = portal(2.0, 2.6); p.position.set(0, 1.3, -2.6); g.add(p);
  for (const [x, y, z] of [[-0.55, 2.55, 0], [0.6, 2.4, -1.3]]) { const gh = buildGhostKid(T, ctx); gh.scale.setScalar(0.6); gh.position.set(x, y, z); gh.rotation.z = x > 0 ? -0.2 : 0.2; g.add(gh); }
  const s = sign(1.5); s.position.set(0, 3.2, 0.05); g.add(s);
  jacks(g, ctx, [[-1.85, 0.4, 0.8, 0.3], [1.8, 0.3, 0.7, -0.3], [-1.7, -1.4, 0.6, 0.3], [1.65, -1.6, 0.6, -0.3], [-2.4, 0.9, 0.5, 0.4]]);
  return g;
}

export const GATES = { pillars: gatePillars, hat: gateHat, tunnel: gateTunnel };

export function place(scene, key, x, z, ry = 0) {
  const old = scene.getObjectByName('hw-gate'); if (old) scene.remove(old);
  const ctx = makeCtx(T, m => { m.emissiveIntensity = Math.max(m.emissiveIntensity, 1.5); });
  const g = GATES[key](ctx); g.name = 'hw-gate'; g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); return key;
}
