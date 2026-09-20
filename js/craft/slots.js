// 🔥 화덕 슬롯 — 걸기·완성 판정·수령. 순수 함수만.
//    날짜 키는 게임의 todayStr()(js/game.js:152)가 주는 'YYYYMMDD' 문자열을 그대로 받는다.
import { yieldOf } from './recipes.js';

export const SLOTS_PER_KILN = 2;
export const MAX_KILNS = 3;

export function capacityOf(kilnCount = 0) {
  return Math.max(0, Math.min(MAX_KILNS, kilnCount | 0)) * SLOTS_PER_KILN;
}

/** 날짜가 바뀌면 완성. 같은 날은 아직이고, 시계가 거꾸로 가도 완성 처리하지 않는다. */
export function isReady(slot, today) {
  if (!slot?.day || !today) return false;
  return slot.day < today;
}

/** 걸기 — 등급이 그 자리에서 수량으로 굳는다(나중에 표가 바뀌어도 약속한 양을 준다) */
export function setSlot(slots = [], { st, item, grade, day }) {
  return [...slots, { st, item, qty: yieldOf(item, grade), grade: grade | 0, day }];
}

export function readySlots(slots = [], today) {
  return slots.filter(s => isReady(s, today));
}

/** 'YYYYMMDD' 두 개의 날짜 차 — UTC 자정 기준이라 월·해를 넘어도 맞는다 */
export function waitedDays(day, today) {
  const at = s => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  return Math.round((at(today) - at(day)) / 86400000);
}

export function claimAll(slots = [], today) {
  const gained = {}, claimed = [], rest = [];
  for (const s of slots) {
    if (!isReady(s, today)) { rest.push(s); continue; }
    gained[s.item] = (gained[s.item] || 0) + s.qty;
    claimed.push({ item: s.item, qty: s.qty, grade: s.grade, waitedDays: waitedDays(s.day, today) });
  }
  return { rest, gained, claimed };
}
