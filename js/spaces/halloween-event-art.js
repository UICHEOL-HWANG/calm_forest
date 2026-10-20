import { kit } from './halloween-art.js';

const PUMPKIN = 0xe8822e, STEM = 0x4f6b2e, CARVE = 0x2b1a12;
const WOOD = 0x8a6a48, WOOD_DARK = 0x5e4630, PURPLE = 0x6b4a9a, CREAM = 0xfff4e0, INK = 0x2b2540;
const FACE_GLOW = [0xffd27a, 0xffa030];
const CANDY = [0xff6b9a, 0x6bd0ff, 0xffd84a, 0x8be07a, 0xc08aff];

function paintAll(T, geo, hex) {
  const c = new T.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new T.BufferAttribute(arr, 3));
  return geo;
}

function pumpkinGeo(T, r, ribs, amp, squash) {
  const g = new T.SphereGeometry(r, ribs * 4, 10), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), phi = Math.atan2(z, x);
    const f = 1 + amp * Math.cos(ribs * phi) * Math.sqrt(Math.max(0, 1 - (y / r) ** 2));
    p.setXYZ(i, x * f, y * squash, z * f);
  }
  g.computeVertexNormals();
  return g;
}

function faceGeos(T, r, cy) {
  const zf = r * 0.9, depth = r * 0.14;
  const ext = (s, z) => new T.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, z);
  const tri = (cx, y, w, h) => { const s = new T.Shape(); s.moveTo(cx - w / 2, y); s.lineTo(cx + w / 2, y); s.lineTo(cx, y + h); s.closePath(); return ext(s, zf - depth * 0.4); };
  const out = [tri(-r * 0.36, cy + r * 0.06, r * 0.32, r * 0.3), tri(r * 0.36, cy + r * 0.06, r * 0.32, r * 0.3), tri(0, cy - r * 0.06, r * 0.16, r * 0.14)];
  const m = new T.Shape(), mw = r * 0.6, my = cy - r * 0.26;
  m.moveTo(-mw, my);
  [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].forEach((x, i) => m.lineTo(r * x, my + (i % 2 ? -r * 0.1 : 0)));
  m.lineTo(mw, my); m.quadraticCurveTo(0, my - r * 0.42, -mw, my);
  out.push(ext(m, zf - depth * 0.7));
  return out;
}

export function buildJack(T, ctx, { lit = true, size = 1 } = {}) {
  const k = kit(T), g = new T.Group(), r = 0.4 * size, sq = 0.78;
  const body = paintAll(T, pumpkinGeo(T, r, 8, 0.07, sq).translate(0, r * sq, 0), lit ? PUMPKIN : 0xb07a4a);
  const stem = k.cyl(r * 0.07, r * 0.11, r * 0.36, 0, r * sq * 2 + r * 0.1, 0, STEM, 6);
  const leaf = paintAll(T, new T.SphereGeometry(r * 0.16, 6, 4).scale(1.6, 0.3, 0.9).translate(r * 0.2, r * sq * 2, 0.02), 0x6f8f3a);
  const skin = ctx.vtxMat('jackSkin');
  if (lit) { skin.emissive.set(0xff6a10); skin.emissiveIntensity = 0.12; }
  g.add(new T.Mesh(k.merge([body, stem, leaf]), skin));
  const face = k.merge(faceGeos(T, r, r * sq).map(f => paintAll(T, f.toNonIndexed(), 0xffffff)));
  g.add(new T.Mesh(face, lit ? ctx.glowMat(...FACE_GLOW, 1.6, true) : new T.MeshStandardMaterial({ color: CARVE, roughness: 1 })));
  return g;
}

export function buildGhostKid(T, ctx) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new T.Vector2(Math.sin(a) * 0.26 + 0.0001, 0.36 + Math.cos(a) * 0.26)); }
  pts.push(new T.Vector2(0.27, 0.18), new T.Vector2(0.31, 0.02));
  const body = new T.LatheGeometry(pts, 24), p = body.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.1) p.setY(i, y + 0.05 * Math.cos(Math.atan2(p.getZ(i), p.getX(i)) * 6)); }
  body.computeVertexNormals();
  const g = new T.Group();
  g.add(new T.Mesh(body, new T.MeshStandardMaterial({ color: 0xf7f6ff, emissive: 0xdcd6ff, emissiveIntensity: 0.25, roughness: 0.6, side: T.DoubleSide })));
  const k = kit(T);
  const eye = (x) => paintAll(T, new T.SphereGeometry(0.045, 8, 6).scale(1, 1.35, 0.5).translate(x, 0.47, 0.235), INK);
  const parts = [eye(-0.085), eye(0.085), k.box(0.05, 0.025, 0.02, 0, 0.39, 0.25, INK),
    k.ball(0.035, -0.15, 0.41, 0.2, 0xffb3c8), k.ball(0.035, 0.15, 0.41, 0.2, 0xffb3c8),
    k.orb(0.07, -0.3, 0.27, 0.04, 0xf7f6ff), k.orb(0.07, 0.3, 0.27, 0.04, 0xf7f6ff)];
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  return g;
}

export function buildBunting(T, ctx, span = 4, sag = 0.4, flags = 9) {
  const k = kit(T), parts = [], cols = [PUMPKIN, PURPLE, 0x2f2a3a];
  const at = (t) => [-span / 2 + span * t, -Math.sin(Math.PI * t) * sag];
  for (let i = 0; i < 16; i++) {
    const [x, y] = at(i / 16), [x2, y2] = at((i + 1) / 16);
    parts.push(k.tilt(Math.hypot(x2 - x, y2 - y) + 0.01, 0.02, 0.02, (x + x2) / 2, (y + y2) / 2, 0, 0x3a3030, Math.atan2(y2 - y, x2 - x)));
  }
  for (let i = 0; i < flags; i++) {
    const [x, y] = at((i + 0.5) / flags), s = new T.Shape();
    s.moveTo(-0.15, 0); s.lineTo(0.15, 0); s.lineTo(0, -0.32); s.closePath();
    parts.push(paintAll(T, new T.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: false }).toNonIndexed().translate(x, y, 0), cols[i % 3]));
  }
  return new T.Mesh(k.merge(parts), ctx.vtxMat());
}

export function buildCandyStall(T, ctx) {
  const k = kit(T), parts = [], g = new T.Group();
  parts.push(k.box(1.6, 0.08, 0.7, 0, 0.82, 0, WOOD), k.box(1.5, 0.74, 0.62, 0, 0.41, 0, WOOD_DARK));
  for (const x of [-0.74, 0.74]) parts.push(k.box(0.08, 1.95, 0.08, x, 0.98, -0.28, WOOD), k.box(0.08, 1.7, 0.08, x, 0.85, 0.3, WOOD));
  for (let i = 0; i < 6; i++) {
    const x = -0.81 + 0.135 + i * 0.27, c = i % 2 ? CREAM : PURPLE;
    parts.push(k.tilt(0.27, 0.04, 0.9, x, 1.86, 0.06, c, 0).rotateX(-0.22), k.cone(0.085, 0.16, x, 1.67, 0.55, c, 3));
  }
  parts.push(k.cyl(0.17, 0.19, 0.36, -0.42, 1.04, 0, 0xf6e6f0, 10), k.cyl(0.13, 0.13, 0.05, -0.42, 1.24, 0, 0xd04a7a, 10));
  for (let i = 0; i < 9; i++) parts.push(k.ball(0.05, -0.42 + Math.cos(i * 2.3) * 0.09, 0.93 + (i % 3) * 0.08, Math.sin(i * 2.3) * 0.09, CANDY[i % 5]));
  for (let i = 0; i < 4; i++) {
    const x = 0.02 + i * 0.13;
    parts.push(k.cyl(0.012, 0.012, 0.24, x, 0.98, 0.18, 0xffffff, 4), paintAll(T, new T.CylinderGeometry(0.055, 0.055, 0.02, 12).rotateX(Math.PI / 2).translate(x, 1.12, 0.19), CANDY[i]));
  }
  parts.push(k.box(0.62, 0.34, 0.04, 0, 2.18, -0.28, CREAM), k.box(0.68, 0.4, 0.03, 0, 2.18, -0.3, WOOD_DARK));
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  const jack = buildJack(T, ctx, { size: 0.55 }); jack.position.set(0.58, 0.86, -0.1); g.add(jack);
  return g;
}

export function buildCandyBasket(T, ctx) {
  const k = kit(T), parts = [], g = new T.Group();
  const weave = new T.CylinderGeometry(0.17, 0.13, 0.14, 12, 1, true);
  parts.push(paintAll(T, weave.toNonIndexed().translate(0, 0.07, 0), 0xc89a5e), k.cyl(0.13, 0.13, 0.01, 0, 0.005, 0, 0xa87a40, 12), k.ring(0.17, 0.014, 0, 0.14, 0, 0xa87a40, true));
  const handle = paintAll(T, new T.TorusGeometry(0.15, 0.012, 5, 16, Math.PI).toNonIndexed().translate(0, 0.14, 0), 0xa87a40);
  parts.push(handle);
  for (let i = 0; i < 8; i++) { const a = i * 2.4, r = 0.06 + (i % 3) * 0.03; parts.push(k.ball(0.04, Math.cos(a) * r, 0.15 + (i % 2) * 0.02, Math.sin(a) * r, CANDY[i % 5])); }
  for (let i = 0; i < 3; i++) { const x = -0.06 + i * 0.06; parts.push(k.cyl(0.006, 0.006, 0.16, x, 0.22, -0.02, 0xffffff, 4), paintAll(T, new T.CylinderGeometry(0.035, 0.035, 0.012, 12).rotateX(Math.PI / 2).translate(x, 0.31, -0.02), CANDY[(i + 2) % 5])); }
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  return g;
}

export function candyBubbleTexture(T, ico = '🍬', bg = 'rgba(226,196,158,0.96)') {
  const cv = document.createElement('canvas'); cv.width = 104; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = bg; c.beginPath(); c.roundRect(8, 8, 88, 64, 18); c.fill();
  c.beginPath(); c.moveTo(42, 72); c.lineTo(62, 72); c.lineTo(48, 94); c.closePath(); c.fill();
  c.font = "46px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(ico, 52, 42);
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
