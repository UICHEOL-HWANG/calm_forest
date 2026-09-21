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

/** 'YYYY-MM-DD' + n일. UTC 로 계산해 서머타임·시간대에 흔들리지 않게 한다 */
export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 오늘 이겼을 때 찍을 만료일 */
export function truceUntil(today, nights = TRUCE_NIGHTS) {
  return addDays(today, nights);
}

/**
 * 이 만료일이 오늘 밤에 유효한가.
 * 오늘 이하면 이미 지났고, 오늘+TRUCE_NIGHTS 를 넘으면 상한 초과다.
 * 형식이 깨진 값은 전부 무효 — 서버가 받는 입력이라 믿지 않는다.
 */
export function truceActive(until, today) {
  if (typeof until !== 'string' || !DATE_RE.test(until)) return false;
  if (typeof today !== 'string' || !DATE_RE.test(today)) return false;
  return until > today && until <= addDays(today, TRUCE_NIGHTS);
}

/** 오늘 밤 오지 않는 동물들 */
export function blockedAnimals(truce, today) {
  if (!truce || typeof truce !== 'object') return [];
  return DUEL_ANIMALS.filter(a => truceActive(truce[a], today));
}
