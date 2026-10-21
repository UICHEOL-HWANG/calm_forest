import * as THREE from 'three';
import { keepOnWalk, onWalk, walkEnd, walkHeight } from './gate-walk.js';
import { PLAYER_R } from '../data/character.js';

const rings = [], entries = {};
let lifted = false;

function glowMat(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
}

function glowRing(color, r) {
  const g = new THREE.Group();
  const flat = (geo, op, y) => { const m = new THREE.Mesh(geo, glowMat(color, op)); m.rotation.x = -Math.PI / 2; m.position.y = y; g.add(m); return m; };
  flat(new THREE.CircleGeometry(r, 36), 0.16, 0.01);
  const ring = flat(new THREE.RingGeometry(r * 0.88, r * 1.03, 40), 0.55, 0.02);
  const wave = flat(new THREE.RingGeometry(r * 0.9, r, 40), 0.5, 0.03);
  const motes = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), glowMat(color, 0.9));
    m.userData = { a: (i / 7) * Math.PI * 2, r: r * (0.43 + (i % 3) * 0.21), ph: i / 7 };
    g.add(m); motes.push(m);
  }
  return { group: g, tick(t) {
    const k = (t * 0.55) % 1;
    wave.scale.setScalar(1 + k * 0.9); wave.material.opacity = 0.5 * (1 - k);
    ring.material.opacity = 0.42 + Math.sin(t * 2.2) * 0.14;
    for (const m of motes) {
      const p = (t * 0.32 + m.userData.ph) % 1, a = m.userData.a + t * 0.4;
      m.position.set(Math.cos(a) * m.userData.r, 0.1 + p * 1.9, Math.sin(a) * m.userData.r);
      m.material.opacity = 0.9 * Math.sin(p * Math.PI);
      m.rotation.y = t * 2;
    }
  } };
}

export function addGateWalk(parent, kind, { walk, water, color, ringR = 1 }) {
  water.except = p => onWalk(walk, p);
  entries[kind] = { walk, water };
  const end = walkEnd(walk), cue = glowRing(color, ringR);
  cue.group.position.set(end.x - parent.position.x, walk.y, end.z - parent.position.z);
  cue.parent = parent; parent.add(cue.group); rings.push(cue);
}

export function gateWalkEnd(kind) { const e = entries[kind]; return e ? walkEnd(e.walk) : null; }

function open() { return Object.values(entries).filter(e => !e.water.lock); }

export function keepOnGateWalks(p) {
  for (const { walk, water } of open()) keepOnWalk([walk], p, q => Math.hypot(q.x - water.x, q.z - water.z) < water.r + PLAYER_R);
}

export function updateGateWalks(dt, p) {
  const walks = open().map(e => e.walk);
  const near = walks.some(w => Math.hypot(p.x - (w.ax + w.bx) / 2, p.z - (w.az + w.bz) / 2) < w.len / 2 + w.hw + 1);
  if (!near) { if (lifted) { p.y = 0; lifted = false; } return; }
  const target = walkHeight(walks, p);
  p.y += (target - p.y) * Math.min(1, dt * 16);
  lifted = p.y > 1e-3;
  if (!lifted) p.y = 0;
}

function shown(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }

export function updateGateCues(t, dt) {
  for (const cue of rings) if (shown(cue.group)) cue.tick(t, dt);
}
