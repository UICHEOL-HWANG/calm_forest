import * as THREE from 'three';
import { mergeGeos, paintGeo, vtxMat } from '../game.js';
import { PLAZA, PLAZA_R, WINTER_LAMPS } from '../data/plaza.js';
import { lampSpot, lampLit } from './winter-rules.js';
import { buildFountain } from './fountain.js';
import { FOUNTAIN_LAST_STAGE } from './fountain-stages.js';

const PAL = { snow: 0xe6eef0, pole: 0x5a5148, off: 0x59626c, cap: 0xf6faf9, ribbon: 0xc8453a, lit: 0xffd36a, halo: 0xffc45a };
const SNOW_H = 0.1;
const SHADE_Y = 1.5;
const HALO_SIZE = 1.5;
const YARD_SCALE = 0.55;
const FW_PERIOD = 2.4;
const BURSTS = [[-2.6, 3.6, -2.5, 0xffd36a], [2.8, 4.0, -3.2, 0x9fe3ff], [0.1, 4.6, -4.5, 0xffa3c4]];
const BUCKET_OF = (k) => (k === 'lit' ? 'lamp' : k === 'snow' ? 'ground' : 'solid');

function assemble(fillParts) {
  const buckets = new Map();
  const add = (k, geo) => {
    const b = BUCKET_OF(k), g = paintGeo(geo, PAL[k]);
    const a = buckets.get(b); a ? a.push(g) : buckets.set(b, [g]);
  };
  fillParts(add);
  const group = new THREE.Group();
  const mats = [];
  for (const [b, geos] of buckets) {
    const mat = b === 'lamp' ? new THREE.MeshBasicMaterial({ color: PAL.lit, fog: false }) : vtxMat();
    const merged = mergeGeos(geos);
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = b === 'solid'; m.receiveShadow = b !== 'lamp';
    group.add(m); mats.push(mat);
  }
  return {
    group,
    dispose() {
      for (const m of group.children) m.geometry.dispose();
      for (const mat of mats) mat.dispose();
    },
  };
}

function lampGeos(add, lit, x, z) {
  add('pole', new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6).translate(x, 0.7, z));
  add(lit ? 'lit' : 'off', new THREE.IcosahedronGeometry(0.2, 0).translate(x, SHADE_Y, z));
  add('cap', new THREE.SphereGeometry(0.15, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 1.66, z));
  if (lit) add('ribbon', new THREE.TorusGeometry(0.1, 0.03, 5, 10).rotateX(Math.PI / 2).translate(x, 1.22, z));
}

export function buildWinterPlaza(lit) {
  const out = assemble((add) => {
    add('snow', new THREE.CylinderGeometry(PLAZA_R + 0.05, PLAZA_R + 0.05, SNOW_H, 32).translate(0, SNOW_H / 2, 0));
    for (let i = 0; i < WINTER_LAMPS; i++) { const p = lampSpot(i); lampGeos(add, lampLit(i, lit), p.x, p.z); }
  });
  out.group.name = 'plazaWinter';
  out.group.position.set(PLAZA.x, 0, PLAZA.z);
  const spots = Array.from({ length: WINTER_LAMPS }, (_, i) => i).filter(i => lampLit(i, lit)).map(lampSpot);
  if (!spots.length) return out;
  const halo = lampHalo(spots);
  out.group.add(halo.points);
  return { group: out.group, dispose() { out.dispose(); halo.dispose(); } };
}

function lampHalo(spots) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(spots.flatMap(p => [p.x, SHADE_Y, p.z]), 3));
  const tex = dotTexture();
  const mat = new THREE.PointsMaterial({ size: HALO_SIZE, color: PAL.halo, map: tex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  return { points: new THREE.Points(geo, mat), dispose() { mat.dispose(); tex.dispose(); } };
}

export function yardFountainMesh() {
  const f = buildFountain(FOUNTAIN_LAST_STAGE);
  f.group.position.set(0, 0, 0);
  f.group.scale.setScalar(YARD_SCALE);
  return f.group;
}

export function yardLampMesh() {
  return assemble((add) => lampGeos(add, true, 0, 0)).group;
}

const rand = (k, i, j) => { const v = Math.sin(k * 127.1 + i * 311.7 + j * 74.7) * 43758.5453; return v - Math.floor(v); };

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export function buildFireworks() {
  const group = new THREE.Group();
  group.name = 'plazaFireworks';
  group.position.set(PLAZA.x, 0, PLAZA.z);
  const tex = dotTexture();
  const bursts = BURSTS.map(([x, y, z, hex], k) => {
    const pts = Array.from({ length: 70 }, (_, i) => {
      const u = rand(k, i, 0) * 2 - 1, a = rand(k, i, 1) * Math.PI * 2, s = Math.sqrt(1 - u * u);
      return [s * Math.cos(a), u, s * Math.sin(a)];
    }).flat();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.PointsMaterial({ size: 0.42, color: hex, map: tex, transparent: true, depthWrite: false, fog: false });
    const points = new THREE.Points(geo, mat);
    points.position.set(x, y, z);
    group.add(points);
    return { points, geo, mat, phase: k / BURSTS.length };
  });
  let clock = 0;
  return {
    group,
    update(dt) {
      clock += dt;
      for (const b of bursts) {
        const f = (clock / FW_PERIOD + b.phase) % 1;
        b.points.scale.setScalar(0.3 + f * 1.8);
        b.mat.opacity = 1 - f;
      }
    },
    dispose() { for (const b of bursts) { b.geo.dispose(); b.mat.dispose(); } tex.dispose(); },
  };
}
