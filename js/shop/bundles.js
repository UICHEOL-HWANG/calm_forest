import { findItem } from '../cosmetics/catalog.js';
import { PRICE_IDS } from './price-ids.js';
import { wonLabel } from './cash.js';

const listWonOf = (ids) => ids.reduce((s, id) => s + (findItem(id)?.price?.won || 0), 0);

const WELCOME_COPY = {
  title: '숲 환영 상자',
  sub: '프리미엄 두 가지를 반값 가까이. 처음 한 번만 열 수 있는 상자예요.',
  ribbon: '첫 구매 45%↓',
  pick: '어떤 도구 세트를 고를까요?',
  list: '따로 사면',
  buy: '{0}에 열기',
  login: '🔐 로그인 후 구매 가능',
  note: '고른 세트와 발자국은 옷장에 들어가요',
  pickBuy: '이 세트로 열기 · {0}',
  pickNote: '🌟 반딧불 발자국은 함께 들어 있어요',
  back: '← 돌아가기',
  na: '지금은 살 수 없어요',
  setTile: '도구 세트 1종',
  gotTrail: '🌟 반딧불 발자국도 함께 들어왔어요',
};

const HOMI_TRIO_COPY = {
  title: '호미 스킨 3종 묶음',
  sub: '자개·산호·고래 호미를 한 번에 모아요. 겉모습만 바뀌고 캐는 성능은 그대로예요.',
  ribbon: '묶음 22%↓',
  list: '따로 사면',
  buy: '{0}에 사기',
  login: '🔐 로그인 후 구매 가능',
  note: '세 호미 모두 옷장의 호미 칸에 들어가요',
  na: '지금은 살 수 없어요',
  got: '🪏 호미 세 가지가 옷장에 들어왔어요',
};

const MUDFLAT_SET_COPY = {
  title: '갯벌 세트',
  sub: '갯벌 호미에 조개 바구니와 빨간 장화까지. 장화를 신으면 뒤뚱뒤뚱 걸어요. 겉모습만 바뀌고 캐는 성능은 그대로예요.',
  ribbon: '세트 한정',
  list: '따로 사면',
  buy: '{0}에 사기',
  login: '🔐 로그인 후 구매 가능',
  note: '호미는 호미 칸, 바구니와 장화는 가방 칸에 들어가요',
  na: '지금은 살 수 없어요',
  got: '🦀 갯벌 세트가 옷장에 들어왔어요',
};

const RAW = [
  { id: 'welcome_box', ico: '🎁', won: 4900, fixed: ['firefly'], choose: ['tools_shroom', 'tools_moon', 'tools_bloom', 'tools_maple', 'tools_frost', 'tools_honey', 'tools_kitty', 'tools_shell'], copy: WELCOME_COPY,
    shopLine: '숲 환영 상자 (도구 세트 1종 + 🌟 반딧불 자국 · 계정당 1번)', seedDesc: 'calm forest 묶음 상품 (도구 세트 1종 + 반딧불 자국, 계정당 1번)' },
  { id: 'homi_trio', ico: '🪏', won: 3500, fixed: ['homi_najeon', 'homi_coral', 'homi_whale'], choose: [], copy: HOMI_TRIO_COPY, tab: 'homi',
    shopLine: '호미 스킨 3종 묶음 (🪷 자개 · 🪸 산호 · 🐋 고래 호미)', seedDesc: 'calm forest 묶음 상품 (호미 스킨 3종: 자개·산호·고래, 겉모습만)' },
  { id: 'mudflat_set', ico: '🦀', won: 3900, fixed: ['homi_mudset', 'mud_gear'], choose: [], copy: MUDFLAT_SET_COPY, tab: 'homi',
    shopLine: '갯벌 세트 (🦀 갯벌 호미 + 🧺 조개 바구니와 빨간 장화)', seedDesc: 'calm forest 묶음 상품 (갯벌 호미 + 조개 바구니와 장화, 겉모습만)' },
];

export const BUNDLES = Object.freeze(RAW.map(b => Object.freeze({
  ...b,
  fixed: Object.freeze([...b.fixed]),
  choose: Object.freeze([...b.choose]),
  copy: Object.freeze({ ...b.copy }),
  listWon: listWonOf([...b.fixed, ...b.choose.slice(0, 1)]),
})));

export const BUNDLE_COPY = BUNDLES.find(b => b.id === 'welcome_box').copy;

export const bundleById = (id) => BUNDLES.find(b => b.id === id) || null;

export function bundleCash(bundle) {
  const priceId = PRICE_IDS[bundle?.id];
  return priceId ? { priceId, label: wonLabel(bundle.won) } : null;
}

export function bundleGrant(bundle, choice) {
  if (!bundle.choose.length) return [...bundle.fixed];
  const pick = bundle.choose.includes(choice) ? choice : bundle.choose[0];
  return [...bundle.fixed, pick];
}

export const bundleCopy = (bundle) => bundle?.copy || BUNDLE_COPY;

export function choicesLeft(bundle, owned = []) {
  const have = new Set(owned);
  return bundle.choose.filter(id => !have.has(id));
}

export function bundleCardMode(bundle, { owned = [], platform, online, isGuest, tokenSet, storeOpen, priceId = PRICE_IDS[bundle?.id] } = {}) {
  if (!bundle || platform !== 'web' || !priceId || !tokenSet || !storeOpen) return 'hidden';
  const have = new Set(owned);
  if (bundle.fixed.some(id => have.has(id))) return 'hidden';
  if (bundle.choose.length && !choicesLeft(bundle, owned).length) return 'hidden';
  if (isGuest) return 'login';
  if (!online) return 'unavailable';
  return 'buy';
}
