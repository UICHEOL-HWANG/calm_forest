export const RESTAURANT = { x: 0, z: 620 };
export const RESTAURANT_GATE = { x: 12, z: 20.5 };
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
