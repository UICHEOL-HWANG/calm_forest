import { ISLAND, WALK_R } from './data.js';

export const PIER_WALK = { x0: 21.9, x1: 26.5, halfZ: 0.75 };

export function islandWalkable(p) {
  if (p.x >= PIER_WALK.x0 && p.x <= PIER_WALK.x1 && Math.abs(p.z) <= PIER_WALK.halfZ) return true;
  return Math.hypot(p.x - ISLAND.x, p.z - ISLAND.z) <= WALK_R - 0.2;
}
