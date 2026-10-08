// 🏮 공방 순수 규칙 — 화면 결정·보관함 추가 (브라우저 의존 없음, Node 테스트 가능)
import { SLOT_MAX } from './recipe.js';

export function decideScreen(orders, today, night) {
  if (orders.some(x => x.status === 'done' || x.status === 'fallback')) return 'claim';
  const todays = orders.find(x => x.order_date === today);
  if (todays && (todays.status === 'pending' || todays.status === 'submitted')) return 'waiting';
  if (todays && todays.status === 'claimed') return 'done';
  return night ? 'order' : 'daytime';
}

// 받기 전에 자리부터 본다: 가득인데 비울 칸을 안 골랐으면 서버 호출 없이 교체 화면으로.
export function claimPlan(aura, replaceId) {
  return !replaceId && aura.slots.length >= SLOT_MAX ? 'replace' : 'claim';
}

export function addToSlots(aura, slot, replaceId) {
  if (aura.slots.some(s => s.id === slot.id)) return { aura, full: false };   // 더블탭 중복 방지
  if (replaceId) {
    const slots = aura.slots.map(s => (s.id === replaceId ? slot : s));
    return { aura: { slots, equipped: aura.equipped === replaceId ? null : aura.equipped }, full: false };
  }
  if (aura.slots.length >= SLOT_MAX) return { aura, full: true };
  return { aura: { ...aura, slots: [...aura.slots, slot] }, full: false };
}
