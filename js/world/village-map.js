import { LAKE, LAKE_R, DOCK_POND, DOCK_POND_R, SEA_COVE, FOREST, FOREST_R, GLADE, GLADE_R, MOUNTAIN_LANDMARK, MOUNTAIN_LANDMARK_R } from '../data/places.js';
import { ISLE, ISLE_R, STREAM_HALF, BANK_W } from './bridge.js';
import { WALK_R, walkLimit } from './walk-bounds.js';

export const LAND_FRINGE = 2.2;
export const WOBBLE_MAX = 1.5;
export const COVE_SAND = 1.1;
export const SCENERY_PAD = 1;
export const SCENERY_SPREAD = 2;
export const WORLD_TREE_SPOT = Object.freeze({ x: 4, z: -35 });
export const WORLD_TREE_CANOPY_R = 9;

export const SCENERY = Object.freeze([
  Object.freeze({ id: 'mountain', x: MOUNTAIN_LANDMARK.x, z: MOUNTAIN_LANDMARK.z, r: MOUNTAIN_LANDMARK_R }),
  Object.freeze({ id: 'tree', x: WORLD_TREE_SPOT.x, z: WORLD_TREE_SPOT.z, r: WORLD_TREE_CANOPY_R }),
]);

const SAMPLES = 192;
const VIEW_PAD = 0.5;
const WAVES = [[5, 3.9, 0.8], [9, 2.7, 0.5], [13, 1.1, 0.2]];

const wobble = t => WAVES.reduce((s, [k, ph, a]) => s + a * Math.sin(k * t + ph), 0);

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

const bump = (t, o) => {
  const dist = Math.hypot(o.x, o.z), half = Math.asin(Math.min(1, o.r / dist)) * SCENERY_SPREAD;
  const d = wrap(t - Math.atan2(o.z, o.x));
  if (Math.abs(d) >= half) return 0;
  const c = Math.cos(d / half * Math.PI / 2);
  return WALK_R + (dist + o.r + SCENERY_PAD - WALK_R) * c * c;
};

export function sceneryReach(t) {
  return Math.max(0, ...SCENERY.map(o => bump(t, o)));
}

export function mapLand(grow = 0) {
  return Array.from({ length: SAMPLES }, (_, i) => {
    const t = -Math.PI + i / SAMPLES * Math.PI * 2;
    const r = Math.max(walkLimit(t), sceneryReach(t)) + (wobble(t) + WOBBLE_MAX) / 2 + grow;
    return [Math.cos(t) * r, Math.sin(t) * r];
  });
}

function squareView(pts) {
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  const x0 = Math.floor(Math.min(...xs) - VIEW_PAD), x1 = Math.ceil(Math.max(...xs) + VIEW_PAD);
  const z0 = Math.floor(Math.min(...zs) - VIEW_PAD), z1 = Math.ceil(Math.max(...zs) + VIEW_PAD);
  const side = Math.max(x1 - x0, z1 - z0);
  return { x0: x0 - (side - (x1 - x0)) / 2, z0: z0 - (side - (z1 - z0)) / 2, w: side, h: side };
}

export const MAP_VIEW = Object.freeze(squareView(mapLand(LAND_FRINGE)));

export function mapWater() {
  return [
    { id: 'lake', x: LAKE.x, z: LAKE.z, r: LAKE_R },
    { id: 'pond', x: DOCK_POND.x, z: DOCK_POND.z, r: DOCK_POND_R },
    { id: 'cove', x: SEA_COVE.x, z: SEA_COVE.z, r: SEA_COVE.r, sand: SEA_COVE.r + COVE_SAND },
    { id: 'moat', x: ISLE.x, z: ISLE.z, r: ISLE_R, half: STREAM_HALF, bank: BANK_W, ring: true },
  ];
}

export function mapGrove() {
  return [
    { id: 'forest', x: FOREST.x, z: FOREST.z, r: FOREST_R },
    { id: 'glade', x: GLADE.x, z: GLADE.z, r: GLADE_R },
  ];
}
