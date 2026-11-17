import * as THREE from 'three';
import { emojiBubble } from '../delve/pest-art.js';
import { signParts, signRingEase, signRingLook, SIGN_BUBBLE_Y, SIGN_REACH, SIGN_RING } from './sign.js';

const BUBBLE_SIZE = 0.5, BUBBLE_TONE = 0.84,RING_W = 0.07, RING_Y = 0.04;

function reachRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(SIGN_REACH - RING_W, SIGN_REACH, 56).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: SIGN_RING.idle.color, transparent: true, opacity: SIGN_RING.idle.opacity, depthWrite: false, fog: false }),
  );
  ring.position.y = RING_Y;
  ring.renderOrder = 3;
  return ring;
}

export function buildPondSign({ mergeGeos, paintGeo, reach = true }) {
  const group = new THREE.Group(); group.name = 'pond-sign';
  const geo = mergeGeos(signParts().map(p => paintGeo(new THREE.BoxGeometry(p.w, p.h, p.d).translate(p.x, p.y, p.z), p.color)));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  const bubble = emojiBubble('🪨', BUBBLE_SIZE);
  bubble.position.y = SIGN_BUBBLE_Y;
  bubble.material.color.setScalar(BUBBLE_TONE);
  group.add(mesh, bubble);
  const ring = reach ? reachRing() : null;
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
      ring.scale.setScalar(look.scale);
    },
    dispose() {
      ring?.geometry.dispose(); ring?.material.dispose();
      geo.dispose(); mesh.material.dispose();
      bubble.material.map.dispose(); bubble.material.dispose();
    },
  };
}
