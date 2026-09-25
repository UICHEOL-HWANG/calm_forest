// =============================================================
//  calm forest · 🗓️ 게임 날짜 규칙 서버 사본 (날씨·카페 시간대·조합 축)
//  ------------------------------------------------------------
//  ▶ 게임의 날씨는 날짜 해시라 모든 유저에게 같다(js/game.js weatherOf).
//     서버가 같은 식으로 계산하면 사전 생성 조합에서 날씨 축이 사라진다(24 → 6).
//  ▶ ⚠️ js/game.js 의 dateHash·weatherOf, js/spaces/cafe.js 의 cafeSlot·playerPhase 와
//     한 글자라도 어긋나면 안 된다. tests/ai-pregen.test.mjs 가 게임 원문과 대조한다.
// =============================================================

export const LANGS = ['ko', 'en'];
export const PHASE_IDS = ['settling', 'settled', 'thriving'];
export const CAFE_SLOTS = ['morning', 'noon', 'evening'];
export const VARIANT_BUCKETS = 8;   // 클라이언트가 보내는 기기 버킷 범위(0~7) — js/ai-variant.js 와 같아야 한다

// js/game.js dateHash(salt) 의 서버판 — 입력이 "그 기기의 로컬 날짜 문자열"이라 시간대와 무관하다
function dateHash(date, salt) {
  const s = `${date}:${salt}`;
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}

// 맑음 55% / 비 20% / 눈 12% / 안개 13% — js/game.js weatherOf 와 같은 경계
export function weatherForDate(date) {
  const r = dateHash(date, 'weather') % 100;
  return r < 20 ? 'rain' : r < 32 ? 'snow' : r < 45 ? 'fog' : 'clear';
}

// ☕ 카페 시간대 — 아침(~11시) · 낮(~17시) · 저녁
export function slotOfHour(h) {
  return h < 11 ? 'morning' : h < 17 ? 'noon' : 'evening';
}

const KST_MS = 9 * 3600000;
export function kstDate(ms = Date.now(), offsetDays = 0) {
  return new Date(ms + KST_MS + offsetDays * 86400000).toISOString().slice(0, 10);
}
export function kstHour(ms = Date.now()) {
  return new Date(ms + KST_MS).getUTCHours();
}

// 무료 등급 하루 한도(RPD)는 태평양 자정에 초기화된다 — 그 시각(UTC ms)을 돌려준다.
//   서머타임을 손으로 계산하지 않고 Intl 로 그 순간의 LA 벽시계를 읽어 역산한다.
export function lastPacificMidnight(ms = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hourCycle: 'h23',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  const sinceMidnight = ((+parts.hour * 60 + +parts.minute) * 60 + +parts.second) * 1000;
  return ms - sinceMidnight - (ms % 1000);
}

// 🎲 클라이언트 기기 버킷(?v=) 정규화 — 범위 밖·누락은 0(옛 클라이언트도 0 을 받는다)
export function parseBucket(raw) {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isInteger(n) && n >= 0 && n < VARIANT_BUCKETS ? n : 0;
}
