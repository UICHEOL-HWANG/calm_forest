// =============================================================
//  🪞 거울 마을 — 하루 의뢰 3건 배정 · 세이브 정리 · 보상(순수 → tests/mirror-quests.test.mjs)
//  ------------------------------------------------------------
//  스펙 §4·§5·§6 · 1번은 그대로, 2·3번은 좌우 반전 단서(왼/오 자리만) · 세 의뢰는 서로 다른 표지물
// =============================================================
import { SPOTS } from './layout.js';

export const QUESTS_PER_DAY = 3;
export const RESIDENTS = Object.freeze([{ id: 'farmer' }, { id: 'angler' }, { id: 'chef' }].map(Object.freeze));   // js/data/npcs.js id — 보색 쌍둥이로 만든다
export const ITEMS = Object.freeze([
  { id: 'ring',     ko: '금반지',      en: 'gold ring',      ico: '💍' },
  { id: 'musicbox', ko: '오르골 상자', en: 'music box',      ico: '🎵' },
  { id: 'carrot',   ko: '당근 인형',   en: 'carrot doll',    ico: '🥕' },
  { id: 'yarn',     ko: '털실 뭉치',   en: 'ball of yarn',   ico: '🧶' },
  { id: 'lantern',  ko: '작은 등불',   en: 'little lantern', ico: '🕯️' },
  { id: 'brooch',   ko: '별 브로치',   en: 'star brooch',    ico: '⭐' },
].map(Object.freeze));

function hashStr(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const _cache = new Map();   // 날짜 → 얼린 배정(꿈 pickShards 와 달리 여러 날짜를 번갈아 불러도 같은 객체 — 테스트·자정 경계)
/** 그날의 의뢰 3건(얼린 배열 — 호출부는 고치지 않는다). 프롬프트가 매 프레임 부른다 */
export function pickQuests(day) {
  let p = _cache.get(day);
  if (!p) { p = Object.freeze(compute(day).map(Object.freeze)); _cache.set(day, p); if (_cache.size > 8) _cache.delete(_cache.keys().next().value); }
  return p;
}
function compute(day) {
  const rnd = mulberry32(hashStr(`mirror:${day}`));
  const npcs = shuffled(RESIDENTS.map(r => r.id), rnd);
  const items = shuffled(ITEMS.map(i => i.id), rnd).slice(0, QUESTS_PER_DAY);
  const used = new Set(), out = [];
  for (let n = 1; n <= QUESTS_PER_DAY; n++) {
    const flipped = n > 1;
    const pool = SPOTS.filter(s => !used.has(s.landmark) && (!flipped || s.side === 'left' || s.side === 'right'));
    const spot = shuffled(pool, rnd)[0];
    used.add(spot.landmark);
    out.push({ n, npc: npcs[n - 1], item: items[n - 1], spot: spot.id, flipped });
  }
  return out;
}

const nonNegInt = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
/** 세이브의 mirror 필드 검증·정리. 날이 바뀌면 done·hinted 를 비운다 */
export function normalizeMirror(saved, today) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const sameDay = s.day === today;
  const done = sameDay ? Math.min(QUESTS_PER_DAY, nonNegInt(s.done)) : 0;
  const hinted = sameDay && Array.isArray(s.hinted)
    ? [...new Set(s.hinted.filter(n => Number.isInteger(n) && n >= 1 && n <= done))].sort((a, b) => a - b)
    : [];
  return { visits: nonNegInt(s.visits), day: today, done, hinted, total: nonNegInt(s.total) };
}

export function rewardFor(hinted) { return hinted ? 2 : 3; }
/** 다음에 할 의뢰(없으면 null) */
export function questAt(state, today) {
  const done = state?.day === today ? state.done : 0;
  return done >= QUESTS_PER_DAY ? null : pickQuests(today)[done];
}
