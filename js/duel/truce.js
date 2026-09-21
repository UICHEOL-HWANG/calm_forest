// =============================================================
//  calm forest · 🤝 발길 끊기 — 유효기간 (순수)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ ⚠️ 이 파일은 **브라우저와 Cloudflare Worker 양쪽이 import 한다**
//    (functions/api/night-visit.js). 만료 규칙이 두 곳에 흩어지면 어긋나는 날이 온다.
//    그래서 DOM·THREE·Node API 를 쓰지 않는다 — 순수 ESM 만.
//  ▶ 날짜는 **클라이언트가 보낸 date 기준**이다. 기존 밤손님 판정이 이미
//    body.date 로 도는 것과 같은 규칙이라, 서버가 제 UTC 날짜를 따로 재지 않는다.
//  ▶ 서버가 상한(TRUCE_NIGHTS)을 강제하므로, 세이브를 고쳐도 최대 2밤이다.
//  ▶ 테스트: node --test tests/duel.test.mjs
// =============================================================

/** 이기면 그 동물이 쉬는 밤 수 — 서버가 재는 상한과 같은 값이어야 한다 */
export const TRUCE_NIGHTS = 2;

/** 대결 상대 — 밤손님 판정의 animal 과 같은 키 */
export const DUEL_ANIMALS = ['boar', 'raccoon'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 내부 헬퍼: 'YYYY-MM-DD' 문자열이 달력상 유효한가.
 * 정규식만으로는 2월 30일이나 13월을 못 잡으므로, round-trip 검증한다:
 * 파싱 후 다시 문자열로 만들어 원본과 같은지 본다.
 * 유효하면 'YYYY-MM-DD', 무효하면 null.
 */
function isValidDate(dateStr) {
  if (typeof dateStr !== 'string' || !DATE_RE.test(dateStr)) return null;
  try {
    const d = new Date(`${dateStr}T00:00:00Z`);
    // 유효한 날짜면 round-trip 이 같다. 2월 30일·13월 등은 다르다.
    if (d.toISOString().slice(0, 10) !== dateStr) return null;
    return dateStr;
  } catch {
    return null;
  }
}

/** 'YYYY-MM-DD' + n일. UTC 로 계산해 서머타임·시간대에 흔들리지 않게 한다. 무효하면 null. */
export function addDays(date, n) {
  const validated = isValidDate(date);
  if (!validated) return null;
  const d = new Date(`${validated}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  const result = d.toISOString().slice(0, 10);
  // 덧셈 후에도 달력상 유효한지 재검증한다 (예: 음수 날짜 등)
  return isValidDate(result);
}

/** 오늘 이겼을 때 찍을 만료일. 무효하면 null. */
export function truceUntil(today, nights = TRUCE_NIGHTS) {
  return addDays(today, nights);
}

/**
 * 이 만료일이 오늘 밤에 유효한가.
 * 오늘 이하면 이미 지났고, 오늘+TRUCE_NIGHTS 를 넘으면 상한 초과다.
 * 달력상 무효한 날짜(13월·2월 30일 등)는 round-trip 검증으로 걸러낸다.
 * 무효하거나 형식이 깨진 모든 값은 false. 어떤 입력에도 절대 던지지 않는다.
 */
export function truceActive(until, today) {
  if (isValidDate(until) === null) return false;
  if (isValidDate(today) === null) return false;
  const maxDate = addDays(today, TRUCE_NIGHTS);
  if (!maxDate) return false;
  return until > today && until <= maxDate;
}

/** 오늘 밤 오지 않는 동물들 */
export function blockedAnimals(truce, today) {
  if (!truce || typeof truce !== 'object') return [];
  return DUEL_ANIMALS.filter(a => truceActive(truce[a], today));
}
