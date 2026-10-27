import * as THREE from 'three';
import { makeBoatHull } from '../spaces/river.js';
import { makeKayakPaddle } from './kayak-paddle.js';
import { BOAT_LAMP, BOAT_LAMP_POST } from '../boat-lamp.js';

const MAT = {
  trim: new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.95 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb2453e, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x5fa64f, roughness: 0.9 }),
  vein: new THREE.MeshStandardMaterial({ color: 0x8cc66f, roughness: 0.9 }),
  petal: new THREE.MeshStandardMaterial({ color: 0xf4a6c6, roughness: 0.9 }),
  seat: new THREE.MeshStandardMaterial({ color: 0xc78a5a, roughness: 0.9 }),
  log: new THREE.MeshStandardMaterial({ color: 0xa9784e, roughness: 0.95 }),
  rope: new THREE.MeshStandardMaterial({ color: 0xe8d3a3, roughness: 0.95 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1f1a17, roughness: 0.5 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe2b04a, roughness: 0.4, metalness: 0.3 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xe98d8d, roughness: 0.6 }),
  fin: new THREE.MeshStandardMaterial({ color: 0xffd9c8, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
  post: new THREE.MeshStandardMaterial({ color: 0x6f4c2e, roughness: 0.95, metalness: 0, flatShading: false }),
  globe: new THREE.MeshStandardMaterial({ color: 0xf2d79a, emissive: 0xe8a93c, emissiveIntensity: 0.9 }),
  koiBody: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }),
};

const tint = (base, color) => { const m = base.clone(); m.color.set(color); return m; };

const EXTRA = {
  stamen: tint(MAT.gold, 0xffd34d),
  whisker: tint(MAT.pink, 0xd06a3c),
  koiTail: Object.assign(MAT.fin.clone(), { vertexColors: true, roughness: 0.4 }),
};

const add = (g, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p); m.rotation.set(...r); m.scale.set(...s); m.castShadow = true; g.add(m);
  return m;
};

const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

function paint(geo, fn) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { c.set(fn(pos.getX(i), pos.getY(i), pos.getZ(i))); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function curveTube(pts, r, mat, g, seg = 24) {
  const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  add(g, new THREE.TubeGeometry(cv, seg, r, 6), mat);
  return cv;
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
  geo.computeVertexNormals();
  return geo;
}

function eye(g, x, y, z, r = 0.13, out = 1) {
  add(g, new THREE.SphereGeometry(r, 14, 12), MAT.white, [x, y, z]);
  add(g, new THREE.SphereGeometry(r * 0.66, 12, 10), MAT.dark, [x + out * r * 0.42, y + r * 0.05, z - r * 0.25]);
  add(g, new THREE.SphereGeometry(r * 0.22, 8, 8), MAT.white, [x + out * r * 0.62, y + r * 0.38, z - r * 0.4]);
}

function saddle(g, y, z) {
  const seat = add(g, new THREE.CylinderGeometry(0.42, 0.46, 0.16, 20), MAT.red, [0, y, z], [0, 0, 0], [1, 1, 1.25]);
  const rim = add(g, new THREE.TorusGeometry(0.44, 0.045, 8, 28), MAT.gold, [0, y + 0.07, z], [Math.PI / 2, 0, 0], [1, 1.25, 1]);
  return [seat, rim];
}

const koiNoise = (x, y, z) => Math.sin(x * 4.1 + y * 2.3) + Math.sin(y * 3.7 - z * 2.9) + Math.sin(z * 5.3 + x * 1.7);

function ferryModel() {
  const g = new THREE.Group();
  g.add(makeBoatHull(1.05, false, true));
  g.userData.paddle = makeKayakPaddle();
  g.add(g.userData.paddle);
  const lantern = new THREE.Group();
  const P = BOAT_LAMP_POST;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(P.r, P.r * 1.3, P.top - P.bottom, 6), MAT.post);
  post.position.set(P.x, (P.top + P.bottom) / 2, P.z);
  lantern.add(post);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(BOAT_LAMP.r, 8, 8), MAT.globe);
  globe.position.set(BOAT_LAMP.x, BOAT_LAMP.y, BOAT_LAMP.z);
  lantern.add(globe);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(BOAT_LAMP.r * 1.3, 0.13, 6), MAT.post);
  cap.position.set(BOAT_LAMP.x, BOAT_LAMP.y + BOAT_LAMP.r + 0.04, BOAT_LAMP.z);
  lantern.add(cap);
  lantern.visible = false; g.add(lantern);
  const light = new THREE.PointLight(0xffd79a, 0, 34, 1.2);
  light.position.set(0, 2.0, -5.0); g.add(light);
  g.userData.lantern = lantern; g.userData.light = light;
  return g;
}

function lotusModel() {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(1.35, 1.25, 0.18, 22, 1, false, 0.25, Math.PI * 2 - 0.5), MAT.leaf, [0, 0.22, 0]);
  add(g, new THREE.TorusGeometry(1.3, 0.09, 6, 26, Math.PI * 2 - 0.5), MAT.leaf, [0, 0.34, 0], [-Math.PI / 2, 0, 0.25]);
  for (let i = 0; i < 6; i++) { const a = 0.6 + i * 0.95; add(g, new THREE.BoxGeometry(0.05, 0.02, 1.15), MAT.vein, [Math.sin(a) * 0.6, 0.32, Math.cos(a) * 0.6], [0, a, 0]); }
  add(g, new THREE.CylinderGeometry(0.32, 0.36, 0.28, 10), MAT.seat, [0, 0.45, 0.35]);
  const flower = [];
  for (let i = 0; i < 6; i++) flower.push(add(g, new THREE.SphereGeometry(0.16, 8, 6), MAT.petal, [0.95 + Math.cos(i) * 0.14, 0.5, 0.55 + Math.sin(i) * 0.14], [0, i, 0], [1, 0.6, 1.6]));
  flower.push(add(g, new THREE.SphereGeometry(0.09, 8, 6), EXTRA.stamen, [0.95, 0.58, 0.55]));
  const pole = add(g, new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), MAT.trim, [-0.9, 0.5, 0.6], [0.2, 0, 0.9]);
  g.userData.oars = [pole];
  g.userData.fpHide = flower;
  return g;
}

function raftModel() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) add(g, new THREE.CylinderGeometry(0.22, 0.22, 3.4 - (i % 2) * 0.25, 9), MAT.log, [-0.9 + i * 0.45, 0.3, 0], [Math.PI / 2, 0, 0]);
  for (const z of [-1.1, 1.1]) add(g, new THREE.BoxGeometry(2.4, 0.1, 0.2), MAT.rope, [0, 0.48, z]);
  add(g, new THREE.BoxGeometry(0.9, 0.22, 0.6), MAT.red, [0, 0.6, 0.45]);
  const pole = add(g, new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), MAT.trim, [1.15, 0.6, 0.2], [0.15, 0, -0.8]);
  add(g, new THREE.BoxGeometry(0.34, 0.05, 0.55), MAT.trim, [2.1, -0.05, 0.4]);
  g.userData.oars = [pole];
  return g;
}

function koiModel() {
  const g = new THREE.Group();
  const profile = [[0.1, -1.75], [0.24, -1.45], [0.5, -0.8], [0.7, 0.0], [0.72, 0.6], [0.6, 1.15], [0.38, 1.55], [0.14, 1.75], [0, 1.8]];
  const pattern = (x, y, z) => z < -0.25 ? 0xfdf8ef : (koiNoise(x, y, z) > 0.55 ? 0xf05a28 : (koiNoise(x * 2.2, y * 2.4 + 5, z) > 2.0 && y < 0.8 ? 0x22201f : 0xfdf8ef));
  add(g, paint(lathe(profile, 30), pattern), MAT.koiBody, [0, 0.42, 0], [-Math.PI / 2, 0, 0], [1, 1, 0.68]);
  const tg = wave(fan(0.95, 1.25, 0.45), 0.08, 2.4);
  paint(tg, (x, y) => Math.abs(Math.sin(Math.atan2(x, y + 0.3) * 9)) < 0.18 ? 0xf4b49a : 0xffd9c8);
  add(g, tg, EXTRA.koiTail, [0, 0.48, profile[0][1] * -1 - 0.15], [Math.PI / 2 - 0.25, 0, 0]);
  for (const s of [-1, 1]) {
    add(g, wave(fan(0.32, 0.62, 0.6), 0.05, 3), MAT.fin, [s * 0.5, 0.25, -0.55], [Math.PI / 2 + 0.5, 0, s * (Math.PI / 2 + 0.9)]);
  }
  const d = new THREE.Shape();
  d.moveTo(0, 0); d.quadraticCurveTo(0.15, 0.32 * 1.1, 1.1, 0.32 * 0.2); d.lineTo(1.1, 0); d.lineTo(0, 0);
  const dorsal = add(g, wave(new THREE.ShapeGeometry(d, 12), 0.03, 4), MAT.fin, [0, 0.8, 0.55], [0, -Math.PI / 2, 0]);
  for (const s of [-1, 1]) eye(g, s * 0.42, 0.62, -1.15, 0.13, s);
  add(g, new THREE.TorusGeometry(0.085, 0.035, 8, 16), MAT.pink, [0, 0.38, -1.7], [0, 0, 0], [1, 0.8, 1]);
  for (const s of [-1, 1]) curveTube([[s * 0.12, 0.33, -1.6], [s * 0.25, 0.22, -1.72], [s * 0.38, 0.18, -1.68]], 0.014, EXTRA.whisker, g, 8);
  const seat = saddle(g, 0.86, 0.15);
  g.userData.fpHide = g.children.filter(c => c.isMesh);
  g.userData.oars = [];
  return g;
}

const MAKERS = { ferry: ferryModel, lotus: lotusModel, raft: raftModel, koi: koiModel };

export function makeBoatModel(boatId) {
  const g = (MAKERS[boatId] || ferryModel)();
  g.userData.oars ??= [];
  g.userData.fpHide ??= [];
  return g;
}
