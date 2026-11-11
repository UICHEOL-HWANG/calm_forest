import { VILLAGE_WALL } from '../mirror/layout.js';

export const boxCircle = (b) => [{ x: (b.x1 + b.x2) / 2, z: (b.z1 + b.z2) / 2 }, Math.hypot(b.x2 - b.x1, b.z2 - b.z1) / 2];

export const STOP_SOLIDS = Object.freeze(VILLAGE_WALL.map(boxCircle));
