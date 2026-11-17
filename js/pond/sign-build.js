import * as THREE from 'three';
import { emojiBubble } from '../delve/pest-art.js';
import { signParts, signRingEase, signRingLook, SIGN_BUBBLE_Y, SIGN_REACH, SIGN_RING } from './sign.js';

const BUBBLE_SIZE = 0.5, BUBBLE_TONE = 0.84, RING_Y = 0.04;
const DASHES = 16, DASH_W = 0.1, DASH_FILL = 0.56, DASH_SPIN = 0.45;
const TAU = Math.PI * 2;

const SHAPE = {
  box: p => new THREE.BoxGeometry(p.w, p.h, p.d),
  post: p => new THREE.CylinderGeometry(p.w * 0.4, p.w / 2, p.h, 6),
  disc: p => new THREE.CylinderGeometry(p.w / 2, p.w / 2, p.d, 10).rotateX(Math.PI / 2),
  ball: p => new THREE.IcosahedronGeometry(0.5, 0).scale(p.w, p.h, p.d),
  cone: p => new THREE.ConeGeometry(p.w / 2, p.h, 5),
};

function dashRing(mergeGeos) {
  const mid = SIGN_REACH - DASH_W / 2, len = (TAU / DASHES) * DASH_FILL;
  const parts = Array.from({ length: DASHES }, (_, i) => {
    const a = (i / DASHES) * TAU;
    const ends = [a, a + len].map(e => new THREE.CircleGeometry(DASH_W / 2, 8).translate(Math.cos(e) * mid, Math.sin(e) * mid, 0));
    return [new THREE.RingGeometry(SIGN_REACH - DASH_W, SIGN_REACH, 5, 1, a, len), ...ends];
  }).flat();
  const ring = new THREE.Mesh(mergeGeos(parts).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: SIGN_RING.idle.color, transparent: true, opacity: SIGN_RING.idle.opacity, depthWrite: false, fog: false }));
  ring.position.y = RING_Y;
  ring.renderOrder = 3;
  return ring;
}

export function buildPondSign({ mergeGeos, paintGeo, reach = true }) {
  const group = new THREE.Group(); group.name = 'pond-sign';
  const geo = mergeGeos(signParts().map(p => paintGeo(SHAPE[p.shape](p).translate(p.x, p.y, p.z), p.color)));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  const bubble = emojiBubble('🪨', BUBBLE_SIZE);
  bubble.position.y = SIGN_BUBBLE_Y;
  bubble.material.color.setScalar(BUBBLE_TONE);
  group.add(mesh, bubble);
  const ring = reach ? dashRing(mergeGeos) : null;
  if (ring) group.add(ring);
  const idle = new THREE.Color(SIGN_RING.idle.color), gold = new THREE.Color(SIGN_RING.active.color);
  let k = 0;
  return {
    group,
    update(dt, active, pulseT) {
      if (!ring) return;
      k = signRingEase(k, active, dt);
      const look = signRingLook(k, pulseT);
      ring.material.color.copy(idle).lerp(gold, look.mix);
      ring.material.opacity = look.opacity;
      ring.rotation.y += dt * DASH_SPIN * k;
    },
    dispose() {
      ring?.geometry.dispose(); ring?.material.dispose();
      geo.dispose(); mesh.material.dispose();
      bubble.material.map.dispose(); bubble.material.dispose();
    },
  };
}
