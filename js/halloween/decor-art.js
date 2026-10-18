import * as THREE from 'three';
import { buildJack, buildGhostKid, buildCandyBasket } from '../spaces/halloween-event-art.js';

export const CANDY_DECOR_IDS = ['ghostDoll', 'candyBasket', 'jackLamp'];

const ctx = {
  vtxMat: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }),
  glowMat: (color, emissive, intensity) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity * 0.6, roughness: 0.5 }),
};

export function buildCandyDecor(id) {
  if (id === 'ghostDoll') { const g = buildGhostKid(THREE, ctx); g.scale.setScalar(0.7); g.position.y = 0.02; return g; }
  if (id === 'candyBasket') { const g = buildCandyBasket(THREE, ctx); g.scale.setScalar(1.15); return g; }
  if (id === 'jackLamp') return buildJack(THREE, ctx, { size: 0.6 });
  throw new Error(`Unknown candy decor id: ${id}`);
}
