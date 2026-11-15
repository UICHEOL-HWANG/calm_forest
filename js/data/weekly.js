export const WEEKLY_GROUPS = Object.freeze(['field', 'water', 'craft', 'explore', 'village']);

const q = (id, group, type, target) => Object.freeze({ id, group, type, target });

export const WEEKLY_POOL = Object.freeze([
  q('w_harvest', 'field', 'harvest', 25),
  q('w_water', 'field', 'water', 40),
  q('w_forage', 'field', 'forage', 15),
  q('w_fish', 'water', 'fish', 15),
  q('w_fish_rare', 'water', 'fish_rare', 2),
  q('w_cook', 'craft', 'cook', 8),
  q('w_serve', 'craft', 'serve', 6),
  q('w_carve', 'craft', 'carve', 2),
  q('w_delve', 'explore', 'delve', 5),
  q('w_sled', 'explore', 'sled', 2),
  q('w_star', 'explore', 'star', 1),
  q('w_gift', 'village', 'gift', 3),
  q('w_neighbor', 'village', 'neighbor', 3),
  q('w_daily', 'village', 'daily', 10),
  q('w_sell', 'village', 'sell', 30),
]);

export const WEEKLY_FALLBACK = Object.freeze([
  q('f_harvest', 'any', 'harvest', 25),
  q('f_fish', 'any', 'fish', 15),
  q('f_chop', 'any', 'chop', 30),
  q('f_sell', 'any', 'sell', 30),
  q('f_daily', 'any', 'daily', 10),
]);

export const TICKETS_PER_QUEST = 2;
export const TICKET_CAP = 15;

const hero = (id) => Object.freeze({ id, cost: 6, kind: 'outdoor' });
const prop = (id) => Object.freeze({ id, cost: 2, kind: 'indoor' });
const theme = (id, h, a, b) => Object.freeze({ id, hero: hero(h), props: Object.freeze([prop(a), prop(b)]) });

export const MARKET_THEMES = Object.freeze([
  theme('tea', 'teadeck', 'teacups', 'bojagi'),
  theme('flower', 'flowercart', 'flowerpail', 'driedflowers'),
  theme('seaside', 'shellshade', 'glassbuoy', 'conchpot'),
  theme('books', 'bookstall', 'globe', 'inkquill'),
  theme('bakery', 'breadcart', 'baguettes', 'jamshelf'),
  theme('busker', 'buskerstage', 'guitarstand', 'gramophone'),
]);

export const MARKET_ITEM_IDS = Object.freeze(MARKET_THEMES.flatMap(t => [t.hero.id, ...t.props.map(p => p.id)]));

export const MARKET_POS = Object.freeze({ x: 17.4, z: -2.0 });
export const BOARD_POS = Object.freeze({ x: 17.6, z: 1.9 });
