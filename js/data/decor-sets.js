export const DECOR_SETS = [
  { id: 'picnic', items: ['picnicBasket', 'picnicPies'], bonus: 'picnicTable', thumb: 'assets/decor-sets/picnic.jpg' },
  { id: 'teatime', items: ['teaBowl', 'teaCake'], bonus: 'teaCupboard', thumb: 'assets/decor-sets/teatime.jpg' },
  { id: 'winter', items: ['winterSled', 'winterLamp'], bonus: 'winterSofa', thumb: 'assets/decor-sets/winter.jpg' },
  { id: 'stone', items: ['stoneGems', 'stoneBear'], bonus: 'stoneHearth', thumb: 'assets/decor-sets/stone.jpg' },
  { id: 'lantern', items: ['lanternBoat', 'lanternMist'], bonus: 'lanternRug', thumb: 'assets/decor-sets/lantern.jpg' },
  { id: 'guard', items: ['guardFlag', 'guardJar'], bonus: 'guardScarecrow', thumb: 'assets/decor-sets/guard.jpg' },
];

const d = (set, item, n) => ({ set, item, p: 1 / n, pity: 2 * n });

export const DROP_SOURCES = {
  orchard: d('picnic', 'picnicBasket', 6),
  cook: d('picnic', 'picnicPies', 10),
  crop: d('teatime', 'teaBowl', 10),
  dream: d('teatime', 'teaCake', 14),
  sled: d('winter', 'winterSled', 9),
  star: d('winter', 'winterLamp', 4),
  mine: d('stone', 'stoneGems', 64),
  carve: d('stone', 'stoneBear', 4),
  ferry: d('lantern', 'lanternBoat', 4),
  mist: d('lantern', 'lanternMist', 4),
  duel: d('guard', 'guardFlag', 4),
  firefly: d('guard', 'guardJar', 28),
};

export const SRC_LIST = Object.keys(DROP_SOURCES);
