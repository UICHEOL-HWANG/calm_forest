export const RESTAURANT = { x: 0, z: 620 };
export const RESTAURANT_GATE = { x: -3, z: 38.5 };
export const RESTAURANT_FACE = -1;
export const restaurantLocal = (lx, lz) => ({ x: RESTAURANT_GATE.x + RESTAURANT_FACE * lx, z: RESTAURANT_GATE.z + RESTAURANT_FACE * lz });
export const toRestaurantLocal = (x, z) => ({ x: (x - RESTAURANT_GATE.x) * RESTAURANT_FACE, z: (z - RESTAURANT_GATE.z) * RESTAURANT_FACE });
export function restaurantBox(x1, z1, x2, z2) {
  const a = restaurantLocal(x1, z1), b = restaurantLocal(x2, z2);
  return { x1: Math.min(a.x, b.x), z1: Math.min(a.z, b.z), x2: Math.max(a.x, b.x), z2: Math.max(a.z, b.z) };
}
const FOOTPRINT = { x: 3.9, z0: -3.0, z1: 4.9 };
export function restaurantScatterBlocks(x, z, pad = 0) {
  const l = toRestaurantLocal(x, z);
  return Math.abs(l.x) < FOOTPRINT.x + pad && l.z > FOOTPRINT.z0 - pad && l.z < FOOTPRINT.z1 + pad;
}
export const REST_LIGHT = { hemi: 0.7, amb: 0.5, sun: 0.85, tint: 0xffeedd, sunTint: 0xfff2e0, player: 0.4, fog: 0xe8d6b8, near: 26, far: 70 };
export const SERVICE_SEC = 100;
export const LAST_SPAWN_SEC = 90;
export const CHOP_TAPS = 4;
export const CHOP_GAP = 0.22;
export const COOK = { pan: { cook: 5, burn: 6.5 }, pot: { cook: 7, win: 3.2, burn: 8 } };
export const FLIP = { at: 2.7, half: 0.5 };
export const PATIENCE = [25, 45];
export const COIN_PER_STAR = 5;
export const EAT_SEC = 3.5;
export const MENU_KEYS = ['grilled', 'riceball', 'soup'];
export const MENU = {
  grilled: { ico: '🐟', from: 'fish' },
  riceball: { ico: '🍙', from: 'rice' },
  soup: { ico: '🍲', from: 'fish' },
};
export const STAR = {
  1: { tables: 2, menus: ['grilled', 'riceball'], pans: 1, pot: false, staff: false, iv: [14, 11] },
  2: { tables: 3, menus: ['grilled', 'riceball', 'soup'], pans: 1, pot: true, staff: false, iv: [12, 9] },
  3: { tables: 3, menus: ['grilled', 'riceball', 'soup'], pans: 2, pot: true, staff: true, iv: [11, 8] },
  4: { tables: 4, menus: ['grilled', 'riceball', 'soup'], pans: 2, pot: true, staff: true, iv: [10, 7] },
};
export const STAR_UP = {
  2: { rating: 40, served: { riceball: 5 }, coins: 100 },
  3: { rating: 100, combo: 4, coins: 200 },
  4: { rating: 200, served: { soup: 8 }, coins: 300 },
};
export const DDA_MIN = 0.8, DDA_MAX = 1.2, DDA_EASY = 0.08, DDA_HARD = 0.06;
export const DDA_EASY_BELOW = 3.2, DDA_HARD_FROM = 4.3;
export const STARTER_STOCK = { fish: 4, rice: 4 };
export const HALL = {
  half: { x: 7.2, z: 4.2 },
  door: { x: -6.3, z: 3.4 },
  board: { x: -3.2, z: -3.7 },
  tables: [[-4.7, -2.0], [-1.7, -2.0], [-4.7, 1.5], [-1.7, 1.5]],
  stations: [
    { id: 'crate_fish', kind: 'crate', give: 'fish', x: 1.9, z: -3.5 },
    { id: 'crate_rice', kind: 'crate', give: 'rice', x: 3.05, z: -3.5 },
    { id: 'board', kind: 'board', x: 4.6, z: -3.5 },
    { id: 'pan0', kind: 'pan', x: 6.55, z: -2.6, need: 1 },
    { id: 'pan1', kind: 'pan', x: 6.55, z: -1.45, need: 3 },
    { id: 'pot', kind: 'pot', x: 6.55, z: -0.3, need: 2 },
    { id: 'plates', kind: 'plates', x: 6.55, z: 1.2 },
    { id: 'trash', kind: 'trash', x: 3.4, z: 3.55 },
    { id: 'pass', kind: 'pass', x: 0.8, z: -0.9 },
  ],
  reach: 1.35, tableReach: 1.7, guestWalk: 3,
};
