import { findItem } from '../cosmetics/catalog.js';

export const CAFE_TABS = Object.freeze([['drink', '☕ 음료'], ['sled', '🛷 썰매'], ['wear', '🧣 꾸미기'], ['gift', '🏔️ 기념품']]);

const wear = id => {
  const it = findItem(id);
  return { id, tab: 'wear', ico: it.ico, name: it.name, coins: it.price.coins, cos: true };
};

export const CAFE_ITEMS = Object.freeze([
  { id: 'cocoa', tab: 'drink', ico: '☕', name: '코코아', coins: 10, cup: 0x6b3b24 },
  { id: 'yuzu', tab: 'drink', ico: '🍵', name: '유자차', coins: 10, cup: 0xe2b23c },
  { id: 'basic', tab: 'sled', ico: '🛷', name: '기본 썰매', coins: 0 },
  { id: 'sky', tab: 'sled', ico: '🛷', name: '하늘 썰매', coins: 400 },
  { id: 'forest', tab: 'sled', ico: '🛷', name: '숲 썰매', coins: 400 },
  { id: 'starry', tab: 'sled', ico: '🛷', name: '별밤 썰매', coins: 900, needs: 'perfect' },
  wear('earmuff'), wear('snowflake'), wear('sled_pack'),
  { id: 'snowglobe', tab: 'gift', ico: '🔮', name: '설산 스노볼', coins: 150, store: 'house' },
  { id: 'hutmodel', tab: 'gift', ico: '🏠', name: '미니 등불 산장 모형', coins: 300, store: 'house' },
  { id: 'summitflag', tab: 'gift', ico: '🚩', name: '정상 깃발', coins: 250, store: 'outdoor' },
].map(i => Object.freeze(i)));

export function cafeItem(id) {
  return CAFE_ITEMS.find(i => i.id === id) || null;
}

export function itemsOfTab(tab) {
  return CAFE_ITEMS.filter(i => i.tab === tab);
}
