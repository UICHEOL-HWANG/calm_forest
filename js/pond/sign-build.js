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

export function buildDashRing({ mergeGeos, reach }) {
  const dashes = Math.round(DASHES * reach / SIGN_REACH);
  const mid = reach - DASH_W / 2, len = (TAU / dashes) * DASH_FILL;
  const parts = Array.from({ length: dashes }, (_, i) => {
    const a = (i / dashes) * TAU;
    const ends = [a, a + len].map(e => new THREE.CircleGeometry(DASH_W / 2, 8).translate(Math.cos(e) * mid, Math.sin(e) * mid, 0));
    return [new THREE.RingGeometry(reach - DASH_W, reach, 5, 1, a, len), ...ends];
  }).flat();
  const mesh = new THREE.Mesh(mergeGeos(parts).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: SIGN_RING.idle.color, transparent: true, opacity: SIGN_RING.idle.opacity, depthWrite: false, fog: false }));
  mesh.position.y = RING_Y;
  mesh.renderOrder = 3;
  const idle = new THREE.Color(SIGN_RING.idle.color), gold = new THREE.Color(SIGN_RING.active.color);
  let k = 0;
  return {
    mesh,
    update(dt, active, pulseT) {
      k = signRingEase(k, active, dt);
      const look = signRingLook(k, pulseT);
      mesh.material.color.copy(idle).lerp(gold, look.mix);
      mesh.material.opacity = look.opacity;
      mesh.rotation.y += dt * DASH_SPIN * k * SIGN_REACH / reach;
    },
    dispose() { mesh.geometry.dispose(); mesh.material.dispose(); },
  };
}

export function buildPondSign({ mergeGeos, paintGeo, reach = true }) {
  const group = new THREE.Group(); group.name = 'pond-sign';
  const geo = mergeGeos(signParts().map(p => paintGeo(SHAPE[p.shape](p).translate(p.x, p.y, p.z), p.color)));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  const bubble = emojiBubble('🪨', BUBBLE_SIZE);
  bubble.position.y = SIGN_BUBBLE_Y;
  bubble.material.color.setScalar(BUBBLE_TONE);
  group.add(mesh, bubble);
  const ring = reach ? buildDashRing({ mergeGeos, reach: SIGN_REACH }) : null;
  if (ring) group.add(ring.mesh);
  return {
    group,
    update(dt, active, pulseT) {
      ring?.update(dt, active, pulseT);
    },
    dispose() {
      ring?.dispose();
      geo.dispose(); mesh.material.dispose();
      bubble.material.map.dispose(); bubble.material.dispose();
    },
  };
}
