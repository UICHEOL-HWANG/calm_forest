import * as THREE from 'three';
import { drawRootMural } from './root-mural.js';

const ROOT = { dry: 0x786a5c, dryVein: 0x4a3f36, lit: 0x8d6a46, litEmissive: 0x2a1804, gold: 0xffcf6a };
const PANEL_W = 1.2, PANEL_H = 0.94, MURAL_Y = 1.45, MURAL_Z = 0.05, MURAL_TILT = -0.14;
const PAD_Z = 2.3, PAD_R = 1.9;
const ROOT_PTS = [[-2.7, 0.4, -0.9], [-2.3, 0.3, 0.5], [-1.2, 0.28, 1.7], [0.2, 0.3, 2.1], [1.5, 0.25, 1.6], [2.5, 0.1, 1.1], [3.1, -0.4, 0.9]];

const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, flatShading: true, ...extra });

function taperedTube(curve, r, seg, radial, taper) {
  const g = new THREE.TubeGeometry(curve, seg, r, radial, false);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    const f = taper(i / seg);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(p, k).sub(c).multiplyScalar(f).add(c);
      p.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

function makeRoot(pts) {
  const r = 0.36, taper = u => 1 - 0.55 * u;
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const g = new THREE.Group();
  const body = new THREE.Mesh(taperedTube(curve, r, 28, 6, taper), mat(ROOT.dry));
  body.castShadow = true; body.receiveShadow = true; g.add(body);
  const side = new THREE.Vector3(0, 0.75, 0.66).normalize();
  const veinCurve = new THREE.CatmullRomCurve3(curve.getSpacedPoints(24).map((q, i) => q.clone().addScaledVector(side, r * 0.9 * taper(i / 24))));
  const vein = new THREE.Mesh(taperedTube(veinCurve, r * 0.2, 28, 5, u => taper(u) * (u > 0.97 ? 0.4 : 1)), mat(ROOT.dryVein));
  g.add(vein);
  const sGeo = new THREE.OctahedronGeometry(0.07, 0), sMat = new THREE.MeshBasicMaterial({ color: 0xe8b850 });
  const spark = Array.from({ length: 10 }, (_, i) => {
    const u = 0.08 + 0.84 * (i / 9);
    const s = new THREE.Mesh(sGeo, sMat);
    s.position.copy(curve.getPointAt(u).addScaledVector(side, r * taper(u) + 0.18 + (i % 3) * 0.12));
    s.rotation.set(i, i * 0.7, 0); s.scale.setScalar(0.7 + (i % 3) * 0.3); s.visible = false;
    g.add(s);
    return s;
  });
  const setLit = (on) => {
    body.material.color.setHex(on ? ROOT.lit : ROOT.dry);
    body.material.emissive.setHex(on ? ROOT.litEmissive : 0);
    vein.material.color.setHex(on ? ROOT.gold : ROOT.dryVein);
    vein.material.emissive.setHex(on ? ROOT.gold : 0);
    vein.material.emissiveIntensity = on ? 0.9 : 0;
    spark.forEach(s => { s.visible = on; });
  };
  return { g, setLit };
}

function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function makeMural(stoneHex) {
  const g = new THREE.Group(), faces = [];
  const wood = mat(0x7a5232), stone = mat(stoneHex);
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); };
  let art = null;
  try { art = drawRootMural(); } catch { art = null; }
  if (art) {
    art.forEach((p, i) => {
      const face = new THREE.MeshStandardMaterial({ map: canvasTex(p.color), emissiveMap: canvasTex(p.glow), emissive: 0x000000, roughness: 0.95 });
      faces.push(face);
      const o = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W, PANEL_H, 0.12), [stone, stone, stone, stone, face, stone]);
      o.position.set((i - 1) * PANEL_W, 0, 0); o.receiveShadow = true; g.add(o);
    });
    [-1.5, -0.5, 0.5, 1.5].forEach(k => box(0.13, PANEL_H + 0.34, 0.2, wood, k * PANEL_W, -0.05, 0.05));
    box(3 * PANEL_W + 0.5, 0.17, 0.24, wood, 0, PANEL_H / 2 + 0.1, 0.06);
    box(3 * PANEL_W + 0.3, 0.12, 0.2, wood, 0, -PANEL_H / 2 - 0.06, 0.05);
  }
  g.position.set(0, MURAL_Y, MURAL_Z); g.rotation.x = MURAL_TILT;
  const setLit = (on) => faces.forEach(m => { m.emissive.setHex(on ? 0xffffff : 0); m.emissiveIntensity = on ? 0.8 : 0; });
  return { g, setLit };
}

function makePad() {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.27, 0.286, 0.1, 6);
  const rings = [[0, 1, 0x6a6478], [0.6, 6, 0x5c576c], [1.15, 11, 0x6a6478], [1.68, 15, 0x5c576c]];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), at = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (const color of [0x5c576c, 0x6a6478]) {
    const spots = rings.filter(r => r[2] === color).flatMap(([rr, n]) => Array.from({ length: n }, (_, k) => [rr, (k / n) * Math.PI * 2 + rr]));
    const inst = new THREE.InstancedMesh(geo, mat(color), spots.length);
    spots.forEach(([rr, a], i) => {
      at.set(Math.cos(a) * rr, 0.035, PAD_Z + Math.sin(a) * rr * 0.92);
      inst.setMatrixAt(i, m4.compose(at, q.setFromAxisAngle(up, a), one));
    });
    inst.receiveShadow = true;
    g.add(inst);
  }
  const curb = new THREE.Mesh(new THREE.TorusGeometry(PAD_R + 0.12, 0.09, 4, 28), mat(0x4f4a60));
  curb.rotation.x = -Math.PI / 2; curb.scale.set(1, 0.92, 1); curb.position.set(0, 0.02, PAD_Z);
  g.add(curb);
  return g;
}

function makeLamp(x) {
  const g = new THREE.Group();
  const wood = mat(0x7a5232), dir = Math.sign(x);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), wood); post.position.set(x, 1.1, 0.35); post.castShadow = true; g.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), wood); arm.position.set(x - dir * 0.2, 2.25, 0.35); g.add(arm);
  const lx = x - dir * 0.38;
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb84a, emissiveIntensity: 0.8 }));
  lamp.position.set(lx, 1.98, 0.35); g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.12, 4), mat(0x3a3648)); cap.position.set(lx, 2.17, 0.35); cap.rotation.y = Math.PI / 4; g.add(cap);
  const light = new THREE.PointLight(0xffb866, 1.6, 6, 1.3); light.position.set(lx, 1.9, 0.9); g.add(light);
  return g;
}

export function makeRootShrine(theme, side = 1) {
  const g = new THREE.Group();
  const mural = makeMural(theme.rock);
  const root = makeRoot(ROOT_PTS.map(([x, y, z]) => [x * side, y, z]));
  g.add(mural.g, makePad(), root.g, makeLamp(2.15 * side));
  const panels = [-1, 0, 1].map(k => new THREE.Vector3(k * PANEL_W, MURAL_Y, MURAL_Z));
  const solids = [...[-1, 0, 1].map(k => ({ x: k * PANEL_W, z: MURAL_Z, r: 0.7 })), { x: 2.15 * side, z: 0.35, r: 0.3 }];
  const setLit = (on) => { mural.setLit(on); root.setLit(on); };
  return { g, setLit, panels, solids };
}
