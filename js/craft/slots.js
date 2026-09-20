// 🔥 화덕 · 🫙 발효통 슬롯 — 걸기·완성 판정·수령. 순수 함수만.
//    날짜 키는 게임의 todayStr()(js/game.js:152)가 주는 'YYYY-MM-DD' 문자열을 그대로 받는다.
//    이 형식은 사전순 = 시간순이라 문자열 비교로 완성을 판정할 수 있다.
import { recipeOf, yieldOf } from './recipes.js';

export const SLOTS_PER_STATION = 2;   // 시설 한 채가 맡는 칸
export const MAX_UNITS = 3;           // 같은 시설을 몇 채까지 두나

export function capacityOf(unitCount = 0) {
  return Math.max(0, Math.min(MAX_UNITS, unitCount | 0)) * SLOTS_PER_STATION;
}

/** 이 품목은 어느 시설 것인가 — 슬롯에 시설을 적지 않고 품목에서 파생한다.
 *  적어 두면 세이브에 같은 사실이 두 벌 남아 어긋날 수 있다. */
export function stationOf(item) { return recipeOf(item)?.station ?? null; }

/** 그 시설 몫의 칸만 — 화덕이 꽉 차도 발효통 칸은 따로 남아 있어야 한다 */
export function slotsOf(slots = [], station) {
  return slots.filter(s => stationOf(s?.item) === station);
}

/** 날짜가 바뀌면 완성. 같은 날은 아직이고, 시계가 거꾸로 가도 완성 처리하지 않는다. */
export function isReady(slot, today) {
  if (!slot?.day || !today) return false;
  return slot.day < today;
}

/** 걸기 — 등급이 그 자리에서 수량으로 굳는다(나중에 표가 바뀌어도 약속한 양을 준다).
 *  슬롯은 특정 화덕에 묶지 않는다. 배치된 야외 장식은 고유 id 가 없어(세이브가 {id,x,z,rot} 만
 *  복원한다) 시설을 옮기거나 보관하면 연결이 끊긴다.
 *  시설 수는 용량(capacityOf)만 정하고, 조형 상태는 'i 번째 = 그 시설 칸의 2i·2i+1' 로 파생한다. */
export function setSlot(slots = [], { item, grade, day }) {
  return [...slots, { item, qty: yieldOf(item, grade), grade: grade | 0, day }];
}

/** i 번째 시설이 맡는 슬롯 — 조형(불·마개·산출물)이 이걸로 상태를 정한다 */
export function unitSlots(slots = [], station, idx = 0) {
  return slotsOf(slots, station).slice(idx * SLOTS_PER_STATION, (idx + 1) * SLOTS_PER_STATION);
}

/** 그 시설 한 채의 겉모습 — 'empty' | 'firing' | 'done' */
export function unitState(slots = [], station, idx, today) {
  const mine = unitSlots(slots, station, idx);
  if (!mine.length) return 'empty';
  return mine.some(s => isReady(s, today)) ? 'done' : 'firing';
}

export function readySlots(slots = [], today) {
  return slots.filter(s => isReady(s, today));
}

/** 'YYYY-MM-DD' 두 개의 날짜 차 — UTC 자정 기준이라 월·해를 넘어도 맞는다 */
export function waitedDays(day, today) {
  const at = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((at(today) - at(day)) / 86400000);
}

/** 다 된 것을 거둔다. station 을 주면 그 시설 칸만 — 화덕 앞에서 받으면 화덕 것만 나와야 한다.
 *  안 주면 전부(자고 일어난 알림은 시설을 가리지 않고 한 번에 센다). */
export function claimAll(slots = [], today, station = null) {
  const gained = {}, claimed = [], rest = [];
  for (const s of slots) {
    if (!isReady(s, today) || (station && stationOf(s.item) !== station)) { rest.push(s); continue; }
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
    return typeof s.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.day);  // dayStr(:149) 형식. 완성 판정이 문자열 비교라 형식이 깨지면 위험
  }).map(s => {
    const grade = Math.max(0, Math.min(3, Number.isFinite(s.grade) ? Math.floor(s.grade) : 0));
    const min = yieldOf(s.item, 0), max = yieldOf(s.item, 3);
    const qty = Number.isFinite(s.qty) ? Math.max(min, Math.min(max, Math.floor(s.qty))) : min;
    return { item: s.item, qty, grade, day: s.day };
  });
}
