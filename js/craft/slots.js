// 🔥 화덕 슬롯 — 걸기·완성 판정·수령. 순수 함수만.
//    날짜 키는 게임의 todayStr()(js/game.js:152)가 주는 'YYYYMMDD' 문자열을 그대로 받는다.
import { recipeOf, yieldOf } from './recipes.js';

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

/** 걸기 — 등급이 그 자리에서 수량으로 굳는다(나중에 표가 바뀌어도 약속한 양을 준다).
 *  슬롯은 특정 화덕에 묶지 않는다. 배치된 야외 장식은 고유 id 가 없어(세이브가 {id,x,z,rot} 만
 *  복원한다) 화덕을 옮기거나 보관하면 연결이 끊긴다. 화덕 수는 용량(capacityOf)만 정하고,
 *  조형 상태는 'i 번째 화덕 = 슬롯 2i·2i+1' 로 파생한다. */
export function setSlot(slots = [], { item, grade, day }) {
  return [...slots, { item, qty: yieldOf(item, grade), grade: grade | 0, day }];
}

/** i 번째 화덕이 맡는 슬롯 — 조형(불·상판)이 이걸로 상태를 정한다 */
export function slotsOfKiln(slots = [], kilnIdx = 0) {
  return slots.slice(kilnIdx * SLOTS_PER_KILN, (kilnIdx + 1) * SLOTS_PER_KILN);
}

/** 그 화덕의 겉모습 — 'empty' | 'firing' | 'done' */
export function kilnState(slots = [], kilnIdx, today) {
  const mine = slotsOfKiln(slots, kilnIdx);
  if (!mine.length) return 'empty';
  return mine.some(s => isReady(s, today)) ? 'done' : 'firing';
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

/** 세이브에서 온 슬롯 배열을 믿지 않고 정제한다.
 *  기존 복원 코드와 같은 문법 — 카탈로그에 있는 것만, 숫자는 범위 안으로. */
export function sanitizeSlots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(s => {
    if (!s || typeof s !== 'object') return false;
    if (!recipeOf(s.item)) return false;                        // 표에 없는 품목
    return typeof s.day === 'string' && /^\d{8}$/.test(s.day);  // 완성 판정이 문자열 비교라 형식이 깨지면 위험
  }).map(s => {
    const grade = Math.max(0, Math.min(3, Number.isFinite(s.grade) ? Math.floor(s.grade) : 0));
    const min = yieldOf(s.item, 0), max = yieldOf(s.item, 3);
    const qty = Number.isFinite(s.qty) ? Math.max(min, Math.min(max, Math.floor(s.qty))) : min;
    return { item: s.item, qty, grade, day: s.day };
  });
}
