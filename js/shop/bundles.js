import { findItem } from '../cosmetics/catalog.js';
import { PRICE_IDS } from './price-ids.js';
import { wonLabel } from './cash.js';

const listWonOf = (ids) => ids.reduce((s, id) => s + (findItem(id)?.price?.won || 0), 0);

const RAW = [
  { id: 'welcome_box', ico: '🎁', won: 4900, fixed: ['firefly'], choose: ['tools_shroom', 'tools_moon', 'tools_bloom'] },
];

export const BUNDLES = Object.freeze(RAW.map(b => Object.freeze({
  ...b,
  fixed: Object.freeze([...b.fixed]),
  choose: Object.freeze([...b.choose]),
  listWon: listWonOf([...b.fixed, b.choose[0]]),
})));

export const BUNDLE_COPY = Object.freeze({
  title: '숲 환영 상자',
  sub: '프리미엄 두 가지를 반값 가까이. 처음 한 번만 열 수 있는 상자예요.',
  ribbon: '첫 구매 45%↓',
  pick: '어떤 도구 세트를 고를까요?',
  list: '따로 사면',
  buy: '{0}에 열기',
  login: '로그인하면 열 수 있어요',
  note: '고른 세트와 발자국은 옷장에 들어가요',
  pickBuy: '이 세트로 열기 · {0}',
  pickNote: '🌟 반딧불 발자국은 함께 들어 있어요',
  back: '← 돌아가기',
  na: '지금은 살 수 없어요',
  setTile: '도구 세트 1종',
  gotTrail: '🌟 반딧불 발자국도 함께 들어왔어요',
});

export const bundleById = (id) => BUNDLES.find(b => b.id === id) || null;

export function bundleCash(bundle) {
  const priceId = PRICE_IDS[bundle?.id];
  return priceId ? { priceId, label: wonLabel(bundle.won) } : null;
}

export function bundleGrant(bundle, choice) {
  const pick = bundle.choose.includes(choice) ? choice : bundle.choose[0];
  return [...bundle.fixed, pick];
}

export function choicesLeft(bundle, owned = []) {
  const have = new Set(owned);
  return bundle.choose.filter(id => !have.has(id));
}

export function bundleCardMode(bundle, { owned = [], platform, online, isGuest, tokenSet, storeOpen, priceId = PRICE_IDS[bundle?.id] } = {}) {
  if (!bundle || platform !== 'web' || !priceId || !tokenSet || !storeOpen) return 'hidden';
  const have = new Set(owned);
  if (bundle.fixed.some(id => have.has(id))) return 'hidden';
  if (!choicesLeft(bundle, owned).length) return 'hidden';
  if (isGuest) return 'login';
  if (!online) return 'unavailable';
  return 'buy';
}
