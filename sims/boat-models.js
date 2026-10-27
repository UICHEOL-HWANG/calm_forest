import * as THREE from 'three';

export const TEAL = 0x3fb3c2, TRIM = 0xd9a066, RED = 0xb2453e;
export const clay = (c, flat = false, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, flatShading: flat, ...extra });
const glow = (c, e, k = 1.2) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: k, roughness: 0.6 });
const thin = (c, o = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, side: THREE.DoubleSide, transparent: o < 1, opacity: o });
export const add = (g, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.scale.set(...s); m.castShadow = true; g.add(m); return m;
};
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const bodyAlongZ = (g, geo, mat, s = [1, 1, 1], p = [0, 0, 0]) => add(g, geo, mat, p, [-Math.PI / 2, 0, 0], s);
function paint(geo, fn) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { c.set(fn(pos.getX(i), pos.getY(i), pos.getZ(i))); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
}
function curveTube(pts, r, mat, g, seg = 24) {
  const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  add(g, new THREE.TubeGeometry(cv, seg, r, 6), mat); return cv;
}
function fan(w, len, notch = 0.45) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.bezierCurveTo(w * 0.3, len * 0.25, w * 0.9, len * 0.55, w, len);
  s.quadraticCurveTo(w * 0.4, len * (notch + 0.2), 0, len * notch + len * 0.3);
  s.quadraticCurveTo(-w * 0.4, len * (notch + 0.2), -w, len);
  s.bezierCurveTo(-w * 0.9, len * 0.55, -w * 0.3, len * 0.25, 0, 0);
  return new THREE.ShapeGeometry(s, 16);
}
function wave(geo, amp, freq) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + Math.sin(p.getY(i) * freq + p.getX(i) * 1.3) * amp * p.getY(i));
  geo.computeVertexNormals(); return geo;
}
function eye(g, x, y, z, r = 0.13, out = 1) {
  add(g, new THREE.SphereGeometry(r, 14, 12), clay(0xffffff), [x, y, z]);
  add(g, new THREE.SphereGeometry(r * 0.66, 12, 10), clay(0x1f1a17), [x + out * r * 0.42, y + r * 0.05, z - r * 0.25]);
  add(g, new THREE.SphereGeometry(r * 0.22, 8, 8), glow(0xffffff, 0xffffff, 0.6), [x + out * r * 0.62, y + r * 0.38, z - r * 0.4]);
}
function saddle(g, y, z, color = 0xb2453e, rim = 0xe2b04a) {
  add(g, new THREE.CylinderGeometry(0.42, 0.46, 0.16, 20), clay(color), [0, y, z], [0, 0, 0], [1, 1, 1.25]);
  add(g, new THREE.TorusGeometry(0.44, 0.045, 8, 28), clay(rim, false, { metalness: 0.3, roughness: 0.4 }), [0, y + 0.07, z], [Math.PI / 2, 0, 0], [1, 1.25, 1]);
}
function canvasTex(draw, w = 256, h = 256, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const oars = (g, z = 0.85, y = 0.38, w = 0.95) => {
  for (const s of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), clay(TRIM), [s * w, y, z], [0, 0, s * 1.18]);
    add(g, new THREE.BoxGeometry(0.4, 0.06, 0.66), clay(TRIM), [s * (w + 0.97), y - 0.43, z]);
  }
};

export function hull(len = 1, body = TEAL, inner = 0x2e93a3) {
  const g = new THREE.Group(), trim = clay(TRIM), red = clay(RED);
  add(g, new THREE.CylinderGeometry(0.6, 0.6, 3 * len, 12), clay(body), [0, 0.32, 0], [Math.PI / 2, 0, 0], [1, 1, 0.5]);
  add(g, new THREE.ConeGeometry(0.6, 1.3, 12), trim, [0, 0.32, -1.5 * len - 0.65], [-Math.PI / 2, 0, 0], [1, 1, 0.5]);
  add(g, new THREE.ConeGeometry(0.6, 1, 12), trim, [0, 0.32, 1.5 * len + 0.5], [Math.PI / 2, 0, 0], [1, 1, 0.5]);
  add(g, new THREE.TorusGeometry(0.57, 0.065, 6, 20), trim, [0, 0.6, 0], [-Math.PI / 2, 0, 0], [1, 2.7 * len, 1]);
  add(g, new THREE.CircleGeometry(0.48, 14), clay(inner), [0, 0.3, 0], [-Math.PI / 2, 0, 0], [1, 2.7 * len, 1]).castShadow = false;
  add(g, new THREE.BoxGeometry(0.86, 0.2, 0.62), red, [0, 0.42, 0.3]);
  add(g, new THREE.BoxGeometry(0.86, 0.44, 0.18), red, [0, 0.66, 0.66]);
  return g;
}

export function sailCatamaran() {
  const g = new THREE.Group(), wood = clay(0xd9a066);
  for (const s of [-1, 1]) {
    const geo = paint(lathe([[0, -1.9], [0.16, -1.6], [0.26, -0.8], [0.28, 0.4], [0.22, 1.3], [0.1, 1.85], [0, 2.0]], 20), (x, y, z) => Math.abs(z) < 0.06 && z > -0.2 ? 0x5c8fd6 : 0xf7f3ea);
    bodyAlongZ(g, geo, clay(0xffffff, false, { vertexColors: true }), [1, 1, 0.75], [s * 0.85, 0.22, 0]);
  }
  for (const z of [-0.7, 0.8]) add(g, new THREE.BoxGeometry(2.0, 0.08, 0.14), wood, [0, 0.42, z]);
  const deck = add(g, new THREE.PlaneGeometry(1.5, 1.4, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf2e3c2, wireframe: true }), [0, 0.43, 0.05], [-Math.PI / 2, 0, 0]);
  deck.castShadow = false;
  add(g, new THREE.CylinderGeometry(0.045, 0.055, 3.4, 8), wood, [0, 2.1, -0.35]);
  const main = new THREE.Shape(); main.moveTo(0, 0); main.quadraticCurveTo(1.9, 1.2, 0.05, 3.1); main.lineTo(0, 0);
  const sg = new THREE.ShapeGeometry(main, 20);
  paint(sg, (x, y) => (Math.floor(y / 0.42) % 3 === 1) ? 0x8fb8ea : 0xfdfaf2);
  add(g, wave(sg, 0.04, 2), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }), [0, 0.55, -0.32], [0, -Math.PI / 2, 0]);
  const jib = new THREE.Shape(); jib.moveTo(0, 0); jib.lineTo(1.25, 0); jib.lineTo(0, 2.3);
  add(g, new THREE.ShapeGeometry(jib), thin(0xf6c86e, 0.95), [0, 0.6, -0.45], [0, Math.PI / 2, 0]);
  const pen = new THREE.Shape(); pen.moveTo(0, 0); pen.quadraticCurveTo(0.35, -0.05, 0.6, -0.15); pen.quadraticCurveTo(0.3, -0.18, 0, -0.26);
  add(g, wave(new THREE.ShapeGeometry(pen, 8), 0.1, 6), thin(0xe8674a, 1), [0, 3.78, -0.35], [0, -Math.PI / 2, 0]);
  return g;
}
export function sailPaper() {
  const g = new THREE.Group();
  const tex = canvasTex((x, w, h) => {
    x.fillStyle = '#bcdcf5'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#9cc4e8'; x.lineWidth = 3; for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    x.fillStyle = '#f5a623'; for (let i = 0; i < 9; i++) { const cx = (i * 83) % w + 22, cy = (i * 57) % h + 22; x.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 9 : 20; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.fill(); }
  }, 256, 256, [0.6, 0.6]);
  const paper = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, flatShading: true, side: THREE.DoubleSide });
  const hull = new THREE.Shape(); hull.moveTo(-1.05, 0); hull.lineTo(1.05, 0); hull.lineTo(1.9, 0.8); hull.lineTo(-1.9, 0.8); hull.lineTo(-1.05, 0);
  const hg = new THREE.ExtrudeGeometry(hull, { depth: 1.1, bevelEnabled: false });
  hg.translate(0, 0, -0.55);
  const pos = hg.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, pos.getZ(i) * (0.55 + 0.45 * (y / 0.8))); }
  hg.computeVertexNormals();
  add(g, hg, paper, [0, 0.08, 0], [0, Math.PI / 2, 0]);
  add(g, new THREE.PlaneGeometry(1.0, 3.1), clay(0x9fbfd9, true, { side: THREE.DoubleSide }), [0, 0.84, 0], [-Math.PI / 2, 0, 0]).castShadow = false;
  const sail = new THREE.Shape(); sail.moveTo(-1.0, 0); sail.lineTo(1.0, 0); sail.lineTo(0, 1.75); sail.lineTo(-1.0, 0);
  const sgeo = new THREE.ExtrudeGeometry(sail, { depth: 0.36, bevelEnabled: false }); sgeo.translate(0, 0, -0.18);
  const sp = sgeo.attributes.position;
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i); sp.setZ(i, sp.getZ(i) * (1 - y / 1.75)); }
  sgeo.computeVertexNormals();
  add(g, sgeo, paper, [0, 0.82, 0], [0, Math.PI / 2, 0]);
  add(g, new THREE.SphereGeometry(0.11, 10, 8), glow(0xffd34d, 0xe8a93c, 0.5), [0, 2.62, 0]);
  return g;
}
export function sailWalnut() {
  const g = new THREE.Group();
  const shell = new THREE.SphereGeometry(1, 26, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const p = shell.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); const a = Math.atan2(v.z, v.x); const k = 1 + 0.05 * Math.sin(a * 14) * Math.sin(v.y * 9) + 0.03 * Math.sin(a * 5); p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  shell.computeVertexNormals();
  add(g, shell, clay(0xa8723f), [0, 0.55, 0], [0, 0, 0], [1.05, 0.62, 1.55]);
  add(g, new THREE.CircleGeometry(1, 26), clay(0xe4c08f), [0, 0.53, 0], [-Math.PI / 2, 0, 0], [1.0, 1.5, 1]).castShadow = false;
  add(g, new THREE.TorusGeometry(1, 0.07, 8, 32), clay(0x7a4e28), [0, 0.55, 0], [Math.PI / 2, 0, 0], [1.05, 1.55, 1]);
  curveTube([[0, 0.5, 0.1], [0.04, 1.4, 0.05], [-0.05, 2.3, -0.05], [0.06, 3.0, 0]], 0.05, clay(0x6b4a2b), g);
  const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.bezierCurveTo(0.95, 0.3, 1.0, 1.4, 0, 2.3); leaf.bezierCurveTo(-1.0, 1.4, -0.95, 0.3, 0, 0);
  const lg = new THREE.ShapeGeometry(leaf, 24); const lp = lg.attributes.position;
  for (let i = 0; i < lp.count; i++) lp.setZ(i, -0.35 * Math.cos(lp.getX(i) * 1.6) + 0.35);
  lg.computeVertexNormals();
  paint(lg, (x, y) => Math.abs(x) < 0.035 || Math.abs(Math.abs(x) - (y % 0.5) * 0.9) < 0.03 && Math.abs(x) < 0.7 ? 0xc6e48d : 0x6fae4b);
  add(g, lg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }), [0, 0.72, 0.15], [0, Math.PI / 2, 0]);
  add(g, new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), clay(0x8a6236, true), [0, 3.02, 0], [0, 0, 0], [1, 0.8, 1]);
  add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6), clay(0x6b4a2b), [0, 3.22, 0]);
  return g;
}

export function lampLotus() {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(1.5, 1.35, 0.16, 28, 1, false, 0.3, Math.PI * 2 - 0.6), clay(0x4f8f45), [0, 0.12, 0]);
  const petal = new THREE.Shape(); petal.moveTo(0, 0); petal.bezierCurveTo(0.45, 0.25, 0.42, 0.95, 0, 1.25); petal.bezierCurveTo(-0.42, 0.95, -0.45, 0.25, 0, 0);
  const pg = new THREE.ShapeGeometry(petal, 16); const pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.28 * Math.cos(pp.getX(i) * 3.2) - 0.28);
  pg.computeVertexNormals();
  paint(pg, (x, y) => new THREE.Color(0xfbe3ee).lerp(new THREE.Color(0xe86f9e), Math.min(1, y / 1.25)).getHex());
  const pm = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.6 });
  [[10, 0.95, 1.05, 0.95], [8, 0.6, 0.62, 0.75]].forEach(([n, r, tilt, sc], layer) => {
    for (let i = 0; i < n; i++) {
      const a = (i + layer * 0.5) / n * Math.PI * 2, piv = new THREE.Group();
      piv.position.set(Math.cos(a) * r, 0.25 + layer * 0.1, Math.sin(a) * r); piv.rotation.y = -a + Math.PI / 2;
      add(piv, pg, pm, [0, 0, 0], [-tilt, 0, 0], [sc, sc, sc]);
      g.add(piv);
    }
  });
  add(g, new THREE.CylinderGeometry(0.32, 0.36, 0.7, 12), glow(0xffe2a8, 0xffa63d, 1.5), [0, 0.85, 0]);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(g, new THREE.BoxGeometry(0.03, 0.72, 0.03), clay(0xb2453e), [Math.cos(a) * 0.35, 0.85, Math.sin(a) * 0.35]); }
  add(g, new THREE.ConeGeometry(0.4, 0.22, 12), clay(0xb2453e), [0, 1.32, 0]);
  add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), clay(0xb2453e), [0, 0.5, 0]);
  const l = new THREE.PointLight(0xffb45a, 7, 7, 1.6); l.position.set(0, 0.95, 0); g.add(l);
  g.scale.setScalar(1.3);
  return g;
}
export function lampGourd() {
  const g = new THREE.Group();
  const bowl = new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58);
  const p = bowl.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.07 * Math.cos(a * 10); p.setX(i, x * k); p.setZ(i, z * k); }
  bowl.computeVertexNormals();
  add(g, bowl, clay(0xf0a84a, false, { side: THREE.DoubleSide }), [0, 0.75, 0], [0, 0, 0], [1.05, 0.85, 1.45]);
  add(g, new THREE.TorusGeometry(0.98, 0.06, 8, 40), clay(0xd88a2e), [0, 0.98, 0], [Math.PI / 2, 0, 0], [1.03, 1.42, 1]);
  curveTube([[0, 0.95, 1.35], [0.05, 1.25, 1.55], [0.25, 1.35, 1.45], [0.2, 1.2, 1.3]], 0.06, clay(0x5f8f45), g);
  const pole = curveTube([[0.55, 0.9, 0.9], [0.6, 2.2, 0.4], [0.35, 2.75, -0.6], [0, 2.6, -1.5]], 0.05, clay(0x9cb45a), g);
  for (let i = 1; i < 4; i++) add(g, new THREE.TorusGeometry(0.055, 0.015, 4, 10), clay(0x6f8a3a), pole.getPoint(i / 4).toArray(), [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.35, 4), clay(0x3a3128), [0, 2.42, -1.5]);
  add(g, new THREE.SphereGeometry(0.3, 16, 12), glow(0xff6b4a, 0xff4a2a, 1.2), [0, 2.0, -1.5], [0, 0, 0], [1, 1.2, 1]);
  for (const y of [2.32, 1.66]) add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 12), clay(0xe2b04a), [0, y, -1.5]);
  add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4), clay(0xe2b04a), [0, 1.5, -1.5]);
  const l = new THREE.PointLight(0xff8a5a, 7, 7, 1.6); l.position.set(0, 2.0, -1.5); g.add(l);
  for (let i = 0; i < 9; i++) add(g, new THREE.SphereGeometry(0.045, 6, 6), glow(0xeaff8a, 0xd8ff5a, 2), [Math.sin(i * 2.3) * 1.7, 1.0 + (i % 3) * 0.5, Math.cos(i * 1.7) * 1.9]).castShadow = false;
  return g;
}

function fishBoat({ profile, seg = 30, flat = false, pattern, fin, tail, finColor, dorsal, saddleZ = 0.15, eyeR = 0.13, wood = false }) {
  const g = new THREE.Group();
  const geo = paint(lathe(profile, seg), pattern);
  bodyAlongZ(g, geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: wood ? 0.85 : 0.45, flatShading: flat }), [1, 1, 0.68], [0, 0.42, 0]);
  const tg = wave(fan(tail.w, tail.len, tail.notch ?? 0.45), tail.wave ?? 0.08, 2.4);
  if (tail.vein) paint(tg, (x, y) => Math.abs(Math.sin(Math.atan2(x, y + 0.3) * 9)) < 0.18 ? tail.vein : finColor);
  add(g, tg, tail.vein ? new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: tail.op ?? 0.85, roughness: 0.4 }) : thin(finColor, tail.op ?? 0.85), [0, 0.48, profile[0][1] * -1 - 0.15], [Math.PI / 2 - 0.25, 0, 0]);
  for (const s of [-1, 1]) {
    const pf = wave(fan(fin.w, fin.len, 0.6), 0.05, 3);
    add(g, pf, thin(finColor, 0.8), [s * 0.5, 0.25, -0.55], [Math.PI / 2 + 0.5, 0, s * (Math.PI / 2 + 0.9)]);
  }
  if (dorsal) {
    const d = new THREE.Shape(); d.moveTo(0, 0); d.quadraticCurveTo(0.15, dorsal.h * 1.1, dorsal.len, dorsal.h * 0.2); d.lineTo(dorsal.len, 0); d.lineTo(0, 0);
    add(g, wave(new THREE.ShapeGeometry(d, 12), 0.03, 4), thin(finColor, 0.85), [0, 0.8, 0.55], [0, -Math.PI / 2, 0]);
  }
  const headY = 0.5, headZ = -1.15;
  for (const s of [-1, 1]) eye(g, s * 0.42, headY + 0.12, headZ, eyeR, s);
  add(g, new THREE.TorusGeometry(0.085, 0.035, 8, 16), clay(0xe98d8d), [0, 0.38, -1.7], [0, 0, 0], [1, 0.8, 1]);
  if (!wood) for (const s of [-1, 1]) curveTube([[s * 0.12, 0.33, -1.6], [s * 0.25, 0.22, -1.72], [s * 0.38, 0.18, -1.68]], 0.014, clay(0xd06a3c), g, 8);
  saddle(g, 0.86, saddleZ);
  return g;
}
const noise = (x, y, z) => Math.sin(x * 4.1 + y * 2.3) + Math.sin(y * 3.7 - z * 2.9) + Math.sin(z * 5.3 + x * 1.7);
export const carpKoi = () => fishBoat({
  profile: [[0.1, -1.75], [0.24, -1.45], [0.5, -0.8], [0.7, 0.0], [0.72, 0.6], [0.6, 1.15], [0.38, 1.55], [0.14, 1.75], [0, 1.8]],
  pattern: (x, y, z) => z < -0.25 ? 0xfdf8ef : (noise(x, y, z) > 0.55 ? 0xf05a28 : (noise(x * 2.2, y * 2.4 + 5, z) > 2.0 && y < 0.8 ? 0x22201f : 0xfdf8ef)),
  fin: { w: 0.32, len: 0.62 }, tail: { w: 0.95, len: 1.25, vein: 0xf4b49a, op: 0.8 }, finColor: 0xffd9c8, dorsal: { len: 1.1, h: 0.32 },
});
export function ferryBoat() { const g = hull(); oars(g); add(g, new THREE.BoxGeometry(0.14, 0.66, 0.16), clay(TRIM), [0, 0.85, 1.72]); add(g, new THREE.BoxGeometry(0.16, 0.2, 0.5), clay(TRIM), [0, 1.12, 1.55]); return g; }

export function lotusLeaf() {
      const g = new THREE.Group(), leaf = clay(0x5fa64f), vein = clay(0x8cc66f);
      add(g, new THREE.CylinderGeometry(1.35, 1.25, 0.18, 22, 1, false, 0.25, Math.PI * 2 - 0.5), leaf, [0, 0.22, 0]);
      add(g, new THREE.TorusGeometry(1.3, 0.09, 6, 26, Math.PI * 2 - 0.5), leaf, [0, 0.34, 0], [-Math.PI / 2, 0, 0.25]);
      for (let i = 0; i < 6; i++) { const a = 0.6 + i * 0.95; add(g, new THREE.BoxGeometry(0.05, 0.02, 1.15), vein, [Math.sin(a) * 0.6, 0.32, Math.cos(a) * 0.6], [0, a, 0]); }
      add(g, new THREE.CylinderGeometry(0.32, 0.36, 0.28, 10), clay(0xc78a5a), [0, 0.45, 0.35]);
      const pet = clay(0xf4a6c6);
      for (let i = 0; i < 6; i++) add(g, new THREE.SphereGeometry(0.16, 8, 6), pet, [0.95 + Math.cos(i) * 0.14, 0.5, 0.55 + Math.sin(i) * 0.14], [0, i, 0], [1, 0.6, 1.6]);
      add(g, new THREE.SphereGeometry(0.09, 8, 6), clay(0xffd34d), [0.95, 0.58, 0.55]);
      add(g, new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), clay(TRIM), [-0.9, 0.5, 0.6], [0.2, 0, 0.9]);
      return g;
}

export function raftBoat() {
      const g = new THREE.Group(), log = clay(0xa9784e), rope = clay(0xe8d3a3);
      for (let i = 0; i < 5; i++) add(g, new THREE.CylinderGeometry(0.22, 0.22, 3.4 - (i % 2) * 0.25, 9), log, [-0.9 + i * 0.45, 0.3, 0], [Math.PI / 2, 0, 0]);
      for (const z of [-1.1, 1.1]) add(g, new THREE.BoxGeometry(2.4, 0.1, 0.2), rope, [0, 0.48, z]);
      add(g, new THREE.BoxGeometry(0.9, 0.22, 0.6), clay(RED), [0, 0.6, 0.45]);
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), clay(TRIM), [1.15, 0.6, 0.2], [0.15, 0, -0.8]);
      add(g, new THREE.BoxGeometry(0.34, 0.05, 0.55), clay(TRIM), [2.1, -0.05, 0.4]);
      return g;
}

