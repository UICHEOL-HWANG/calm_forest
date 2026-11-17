import * as THREE from 'three';
import { emojiBubble } from '../delve/pest-art.js';
import { signParts, signRingEase, signRingKind, signRingLook, SIGN_BUBBLE_Y, SIGN_REACH, SIGN_RINGS } from './sign.js';

const BUBBLE_SIZE = 0.5, BUBBLE_TONE = 0.84, RING_Y = 0.04;
const DASHES = 16, DASH_W = 0.1, DASH_FILL = 0.56, DASH_SPIN = 0.45;
const DISC_RIM = 0.07, DISC_FILL = 0.3;
const PEBBLES = 10, PEBBLE_IN = 0.1, PEBBLE_GLOW = 0.3;
const TAU = Math.PI * 2;

const SHAPE = {
  box: p => new THREE.BoxGeometry(p.w, p.h, p.d),
  post: p => new THREE.CylinderGeometry(p.w * 0.4, p.w / 2, p.h, 6),
  disc: p => new THREE.CylinderGeometry(p.w / 2, p.w / 2, p.d, 10).rotateX(Math.PI / 2),
  ball: p => new THREE.IcosahedronGeometry(0.5, 0).scale(p.w, p.h, p.d),
  cone: p => new THREE.ConeGeometry(p.w / 2, p.h, 5),
};

const flat = g => g.rotateX(-Math.PI / 2);
const overlay = () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false });

function withAlpha(geo, a) {
  const n = geo.attributes.position.count, arr = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) arr.set([1, 1, 1, a], i * 4);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 4));
  return geo;
}

const RING = {
  dash(mergeGeos) {
    const mid = SIGN_REACH - DASH_W / 2, len = (TAU / DASHES) * DASH_FILL;
    const parts = Array.from({ length: DASHES }, (_, i) => {
      const a = (i / DASHES) * TAU;
      const ends = [a, a + len].map(e => new THREE.CircleGeometry(DASH_W / 2, 8).translate(Math.cos(e) * mid, Math.sin(e) * mid, 0));
      return [new THREE.RingGeometry(SIGN_REACH - DASH_W, SIGN_REACH, 5, 1, a, len), ...ends];
    }).flat();
    return new THREE.Mesh(flat(mergeGeos(parts)), overlay());
  },
  disc(mergeGeos) {
    const geo = mergeGeos([
      withAlpha(new THREE.CircleGeometry(SIGN_REACH - DISC_RIM, 48), DISC_FILL),
      withAlpha(new THREE.RingGeometry(SIGN_REACH - DISC_RIM, SIGN_REACH, 48), 1),
    ]);
    const mat = overlay();
    mat.vertexColors = true;
    return new THREE.Mesh(flat(geo), mat);
  },
  pebble(mergeGeos) {
    const parts = Array.from({ length: PEBBLES }, (_, i) => {
      const a = (i / PEBBLES) * TAU + 0.2, k = 0.85 + (i % 3) * 0.12;
      return new THREE.IcosahedronGeometry(0.5, 0).scale(0.24 * k, 0.07, 0.17 * k).rotateY(-a + (i % 2 ? 0.5 : -0.3))
        .translate(Math.cos(a) * (SIGN_REACH - PEBBLE_IN), 0.02, Math.sin(a) * (SIGN_REACH - PEBBLE_IN));
    });
    return new THREE.Mesh(mergeGeos(parts), new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true }));
  },
};

export function buildPondSign({ mergeGeos, paintGeo, reach = true }) {
  const group = new THREE.Group(); group.name = 'pond-sign';
  const geo = mergeGeos(signParts().map(p => paintGeo(SHAPE[p.shape](p).translate(p.x, p.y, p.z), p.color)));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  const bubble = emojiBubble('🪨', BUBBLE_SIZE);
  bubble.position.y = SIGN_BUBBLE_Y;
  bubble.material.color.setScalar(BUBBLE_TONE);
  group.add(mesh, bubble);
  const kind = signRingKind(location.search, location.hostname);
  const ring = reach ? RING[kind](mergeGeos) : null;
  const idle = new THREE.Color(SIGN_RINGS[kind].idle.color), gold = new THREE.Color(SIGN_RINGS[kind].active.color);
  if (ring) {
    ring.position.y = RING_Y;
    ring.renderOrder = 3;
    ring.material.color.copy(idle);
    ring.material.opacity = SIGN_RINGS[kind].idle.opacity;
    group.add(ring);
  }
  let k = 0;
  return {
    group,
    update(dt, active, pulseT) {
      if (!ring) return;
      k = signRingEase(k, active, dt);
      const look = signRingLook(kind, k, pulseT);
      ring.material.color.copy(idle).lerp(gold, look.mix);
      ring.material.opacity = look.opacity;
      ring.scale.setScalar(look.scale);
      if (kind === 'dash') ring.rotation.y += dt * DASH_SPIN * k;
      if (kind === 'pebble') ring.material.emissive.copy(gold).multiplyScalar(PEBBLE_GLOW * look.mix);
    },
    dispose() {
      ring?.geometry.dispose(); ring?.material.dispose();
      geo.dispose(); mesh.material.dispose();
      bubble.material.map.dispose(); bubble.material.dispose();
    },
  };
}
