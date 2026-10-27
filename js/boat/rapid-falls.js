import * as THREE from 'three';
import { RIVER_W } from './consts.js';

const W = (RIVER_W + 1.6) * 2;
const POLE_X = RIVER_W + 1.2;
const FLAGS = 10;
const ROPE_Y = 3.9, ROPE_SAG = 0.7;
const FLAG_COLORS = [0xf2c14e, 0xe0603f, 0x3fb3c2, 0xffffff];

const MAT = {
  hump: new THREE.MeshStandardMaterial({ color: 0x8fd6ee, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.93 }),
  foam: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xa9743f, roughness: 0.85 }),
  flag: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
};

const GEO = {
  hump: (() => { const g = new THREE.CylinderGeometry(1, 1, W, 24, 1, true, 0, Math.PI); g.rotateZ(Math.PI / 2); return g; })(),
  crest: (() => { const g = new THREE.CylinderGeometry(0.13, 0.13, W, 10); g.rotateZ(Math.PI / 2); return g; })(),
  foam: new THREE.SphereGeometry(0.42, 10, 8),
  rope: (() => {
    const pts = [];
    for (let i = 0; i <= 11; i++) { const u = i / 11; pts.push(new THREE.Vector3(-POLE_X + POLE_X * 2 * u, ROPE_Y - Math.sin(u * Math.PI) * ROPE_SAG, 0)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.025, 4);
  })(),
  flag: (() => { const g = new THREE.ConeGeometry(0.22, 0.5, 3); g.rotateX(Math.PI); return g; })(),
  pole: new THREE.CylinderGeometry(0.08, 0.1, 4, 6),
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

function foamRow(n, z, spread, seed) {
  const im = new THREE.InstancedMesh(GEO.foam, MAT.foam, n);
  const base = Array.from({ length: n }, (_, i) => {
    const r = (Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
    const k = 0.6 + Math.abs(r) * 0.7;
    return { x: -W / 2 + (i + 0.5) * (W / n) + r * 0.3, z: z + r * spread, k, ph: i * 1.7 };
  });
  im.userData.base = base;
  poseFoam(im, 0);
  return im;
}

function poseFoam(im, t) {
  im.userData.base.forEach((b, i) => {
    const k = b.k * (1 + Math.sin(t * 4 + b.ph) * 0.12);
    _p.set(b.x, 0.12 + Math.sin(t * 3 + b.ph) * 0.04, b.z);
    _s.set(k * 1.25, k * 0.45, k);
    _m.compose(_p, _q, _s); im.setMatrixAt(i, _m);
  });
  im.instanceMatrix.needsUpdate = true;
}

function bunting() {
  const im = new THREE.InstancedMesh(GEO.flag, MAT.flag, FLAGS - 1);
  const c = new THREE.Color();
  for (let i = 1; i < FLAGS; i++) {
    const u = i / FLAGS;
    _p.set(-POLE_X + POLE_X * 2 * u, ROPE_Y - Math.sin(u * Math.PI) * ROPE_SAG - 0.28, 0);
    _m.compose(_p, _q, _s.set(1, 1, 1)); im.setMatrixAt(i - 1, _m);
    im.setColorAt(i - 1, c.set(FLAG_COLORS[i % FLAG_COLORS.length]));
  }
  return im;
}

function poles() {
  const im = new THREE.InstancedMesh(GEO.pole, MAT.wood, 2);
  [-1, 1].forEach((sd, i) => { _m.makeTranslation(sd * POLE_X, 2, 0); im.setMatrixAt(i, _m); });
  return im;
}

export function makeRapidFall() {
  const g = new THREE.Group();
  const hump = new THREE.Mesh(GEO.hump, MAT.hump);
  hump.scale.set(1, 0.42, 1.2); hump.position.y = 0.08; g.add(hump);
  const crest = new THREE.Mesh(GEO.crest, MAT.foam);
  crest.position.y = 0.5; g.add(crest);
  const foams = [foamRow(14, 1.3, 0.25, 5), foamRow(16, -1.4, 0.35, 9)];
  foams.forEach(f => g.add(f));
  g.add(new THREE.Mesh(GEO.rope, MAT.wood), bunting(), poles());
  g.userData.foams = foams;
  return g;
}

export function tickRapidFalls(falls, t) {
  for (const f of falls || []) if (f.visible) f.userData.foams.forEach(im => poseFoam(im, t));
}
