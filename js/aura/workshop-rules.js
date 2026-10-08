// 🏮 공방 순수 규칙 — 화면 결정·보관함 추가 (브라우저 의존 없음, Node 테스트 가능)
import { SLOT_MAX } from './recipe.js';

export function decideScreen(orders, today, night) {
  if (orders.some(x => x.status === 'done' || x.status === 'fallback')) return 'claim';
  const todays = orders.find(x => x.order_date === today);
  if (todays && (todays.status === 'pending' || todays.status === 'submitted')) return 'waiting';
  if (todays && todays.status === 'claimed') return 'done';
  return night ? 'order' : 'daytime';
}

export function addToSlots(aura, slot, replaceId) {
  if (replaceId) {
    const slots = aura.slots.map(s => (s.id === replaceId ? slot : s));
    return { aura: { slots, equipped: aura.equipped === replaceId ? null : aura.equipped }, full: false };
  }
  if (aura.slots.length >= SLOT_MAX) return { aura, full: true };
  return { aura: { ...aura, slots: [...aura.slots, slot] }, full: false };
}
