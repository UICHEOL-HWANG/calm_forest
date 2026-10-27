import { cafeItem } from './cafe-catalog.js';
import { findItem } from '../cosmetics/catalog.js';

export const LOCK_TEXT = '🏁 깃발 12개 모두 지나 완주하면 열려요';
export const TOBOGGAN_LOCK = '🏁 한 번 완주하면 받아요';
export const TOBOGGAN_TOAST = '⛄ 눈뭉치 터보건을 받았어요';
export const SNOW_SLED_LOCK = '❄️ 눈의 가지를 꾸미면 받아요';
export const SNOW_SLED_TOAST = '❄️ 세계수 썰매를 받았어요';

const price = n => `${n.toLocaleString()}🪙`;

export function cafeState(gs) {
  return {
    coins: gs.inventory.coins | 0,
    cos: gs.cosmetics,
    hut: gs.mountain?.hut || { sleds: ['basic'], sled: 'basic' },
    perfect: !!gs.mountain?.sled?.perfect,
  };
}

export function rowOf(item, st) {
  if (item.tab === 'sled') {
    if (st.hut.sled === item.id) return { kind: 'riding', label: '타는 중', disabled: true };
    if (st.hut.sleds.includes(item.id)) return { kind: 'ride', label: '타기', disabled: false };
    if (item.needs === 'finish') return { kind: 'locked', label: TOBOGGAN_LOCK, disabled: true };
    if (item.needs === 'snowbranch') return { kind: 'locked', label: SNOW_SLED_LOCK, disabled: true };
    if (item.needs === 'perfect' && !st.perfect) return { kind: 'locked', label: LOCK_TEXT, disabled: true };
  }
  if (item.cos && st.cos.owned.includes(item.id)) return { kind: 'owned', label: '구매 완료', disabled: true };
  return { kind: 'buy', label: price(item.coins), disabled: false };
}

function grantOf(item) {
  if (item.tab === 'drink') return { type: 'drink', id: item.id, cup: item.cup };
  if (item.tab === 'sled') return { type: 'sled', id: item.id };
  if (item.cos) return { type: 'cos', id: item.id };
  return { type: item.store, id: item.id };
}

function applyGrant(st, item) {
  if (item.tab === 'sled') return { ...st, hut: { sleds: [...st.hut.sleds, item.id], sled: item.id } };
  if (item.cos) {
    const slot = findItem(item.id).slot;
    return { ...st, cos: { owned: [...st.cos.owned, item.id], equipped: { ...st.cos.equipped, [slot]: item.id } } };
  }
  return st;
}

export function buyCafe(st, id) {
  const item = cafeItem(id);
  if (!item) return { ok: false, why: 'unknown', st, grant: null };
  const row = rowOf(item, st);
  if (row.kind === 'locked') return { ok: false, why: 'locked', st, grant: null };
  if (row.kind !== 'buy') return { ok: false, why: 'owned', st, grant: null };
  if (st.coins < item.coins) return { ok: false, why: 'poor', st, grant: null };
  const next = applyGrant({ ...st, coins: st.coins - item.coins }, item);
  return { ok: true, why: '', st: next, grant: grantOf(item) };
}

export function pickSled(st, id) {
  if (!st.hut.sleds.includes(id)) return st;
  return { ...st, hut: { ...st.hut, sled: id } };
}

export function grantFinishSled(hut) {
  if (hut.sleds.includes('toboggan')) return hut;
  return { ...hut, sleds: [...hut.sleds, 'toboggan'] };
}

export function grantSnowSled(hut) {
  if (hut.sleds.includes('worldtree')) return hut;
  return { ...hut, sleds: [...hut.sleds, 'worldtree'] };
}
