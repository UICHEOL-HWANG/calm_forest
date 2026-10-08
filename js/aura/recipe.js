// =============================================================
//  🏮 오라 레시피 v1 — 스키마·검증·카드 사전·대체 레시피 (순수 함수, 브라우저·Worker·Node 공용)
//  AI 출력도 저장값도 전부 sanitizeRecipe 를 거친다: 범위 밖은 가장 가까운 허용값, 모르는 값은 기본값.
// =============================================================
import { PALETTE_IDS } from './palette.js';

export const RECIPE_VERSION = 1;
export const SHAPES = Object.freeze(['dot', 'petal', 'leaf', 'star', 'drop', 'firefly', 'snow', 'heart', 'note', 'bubble']);
export const MOTIONS = Object.freeze(['orbit', 'rise', 'fall', 'drift', 'spiral', 'pulse']);
export const BANDS = Object.freeze(['feet', 'body', 'head']);
export const SPEEDS = Object.freeze([0.5, 1, 1.5]);
export const RADII = Object.freeze([0.7, 1, 1.3]);
export const COUNT_MIN = 6, COUNT_MAX = 24;
export const NAME_MAX = 12, LINE_MAX = 40, TEXT_MAX = 60, SLOT_MAX = 3;
export const CARD_KEYS = Object.freeze(['shape', 'color', 'motion', 'band']);

export const DEFAULT_RECIPE = Object.freeze({
  v: RECIPE_VERSION, name: '작은 빛', line: '카드에 고른 재료 그대로 정성껏 빚었어요',
  shape: 'dot', motion: 'orbit', band: 'body', count: 14, speed: 1, radius: 1, colors: Object.freeze(['mint', 'cream']),
});

const nearest = (list, v) => list.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), list[0]);
const pick = (list, v, fb) => (list.includes(v) ? v : fb);
const clampStr = (s, max, fb, isBlocked) => {
  const t = typeof s === 'string' ? s.trim().slice(0, max) : '';
  return t && !isBlocked(t) ? t : fb;
};
const clampCount = (v, fb) => {
  const n = Number(v);
  return v !== '' && v !== null && Number.isFinite(n) ? Math.min(COUNT_MAX, Math.max(COUNT_MIN, Math.round(n))) : fb;
};
const snap = (list, v, fb) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? nearest(list, Number(v)) : fb);
const twoColors = (raw, fb) => {
  const cs = Array.isArray(raw) ? raw.filter(c => PALETTE_IDS.includes(c)).slice(0, 2) : [];
  return cs.length === 2 ? cs : cs.length === 1 ? [cs[0], fb[1]] : [...fb];
};

export function sanitizeRecipe(raw, { isBlocked = () => false, fallback = DEFAULT_RECIPE } = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    v: RECIPE_VERSION,
    name: clampStr(r.name, NAME_MAX, fallback.name, isBlocked),
    line: clampStr(r.line, LINE_MAX, fallback.line, isBlocked),
    shape: pick(SHAPES, r.shape, fallback.shape),
    motion: pick(MOTIONS, r.motion, fallback.motion),
    band: pick(BANDS, r.band, fallback.band),
    count: clampCount(r.count, fallback.count),
    speed: snap(SPEEDS, r.speed, fallback.speed),
    radius: snap(RADII, r.radius, fallback.radius),
    colors: twoColors(r.colors, fallback.colors),
  };
}

export function sanitizeCards(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const ok = SHAPES.includes(c.shape) && PALETTE_IDS.includes(c.color) && MOTIONS.includes(c.motion) && BANDS.includes(c.band);
  return ok ? { shape: c.shape, color: c.color, motion: c.motion, band: c.band } : null;
}

// 문장 → 카드. 칸마다 앞에서부터 처음 맞는 규칙이 이긴다. AI 없이 즉석으로 보여 주는 '이렇게 들렸어요'.
const RULES = [
  ['shape', /벚꽃|꽃잎|꽃|petal|blossom|flower/i, 'petal'], ['shape', /비눗방울|거품|bubble/i, 'bubble'],
  ['shape', /물방울|이슬|빗방울|비가|비\s*온|drop|rain|dew/i, 'drop'],
  ['shape', /잎|풀|leaf|grass/i, 'leaf'], ['shape', /별|star/i, 'star'],
  ['shape', /반딧불|firefly/i, 'firefly'], ['shape', /눈|snow/i, 'snow'], ['shape', /하트|사랑|heart|love/i, 'heart'],
  ['shape', /음표|노래|음악|note|song|music/i, 'note'],
  ['motion', /빙글|회오리|소용돌이|spiral|swirl/i, 'spiral'], ['motion', /피어오르|올라|솟|rise|float up/i, 'rise'],
  ['motion', /흩날|떨어|내리|맺힌|fall|drift down/i, 'fall'], ['motion', /둥실|떠다|drift|wander/i, 'drift'],
  ['motion', /두근|반짝반짝|맥|pulse|beat/i, 'pulse'], ['motion', /돌|감싸|orbit|circle/i, 'orbit'],
  ['band', /머리|왕관|위에|head|crown/i, 'head'], ['band', /발|발밑|땅|feet|ground/i, 'feet'],
  ['color', /벚꽃|분홍|pink/i, 'pink'], ['color', /하늘|파랑|파란|푸른|푸르|blue|sky/i, 'sky'], ['color', /노랑|노란|금|gold|yellow/i, 'gold'],
  ['color', /보라|purple|violet/i, 'violet'], ['color', /물방울|이슬|바다|ocean|\bsea\b|dew/i, 'dew'], ['color', /초록|연두|풀|green/i, 'leaf'],
  ['color', /하양|하얀|흰|white|눈/i, 'snow'], ['color', /빨강|빨간|red|딸기/i, 'berry'], ['color', /주황|orange/i, 'amber'],
];
const CARD_DEFAULT = Object.freeze({ shape: 'dot', color: 'mint', motion: 'orbit', band: 'body' });
export function cardsFromText(text) {
  const s = typeof text === 'string' ? text : '';
  const out = { ...CARD_DEFAULT };
  const done = new Set();
  for (const [key, re, val] of RULES) if (!done.has(key) && re.test(s)) { out[key] = val; done.add(key); }
  return out;
}

const CYCLE = { shape: SHAPES, color: PALETTE_IDS, motion: MOTIONS, band: BANDS };
export function swapCard(cards, key) {
  const list = CYCLE[key];
  if (!list) return { ...cards };
  return { ...cards, [key]: list[(list.indexOf(cards[key]) + 1) % list.length] };
}

// FNV-1a — 시드 문자열(주문 id)로 결정론적 변주
const hash = s => [...String(s)].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const NAME_BY_SHAPE = { dot: '작은 빛', petal: '꽃잎 바람', leaf: '풀잎 바람', star: '별 부스러기', drop: '물방울 빛',
  firefly: '반딧불 산책', snow: '눈송이 춤', heart: '두근두근', note: '콧노래', bubble: '비눗방울' };
export function fallbackRecipe(cards, seed) {
  const c = sanitizeCards(cards) || { ...CARD_DEFAULT };
  const h = hash(seed);
  const partner = PALETTE_IDS[(PALETTE_IDS.indexOf(c.color) + 1 + (h % 5)) % PALETTE_IDS.length];
  return sanitizeRecipe({
    name: NAME_BY_SHAPE[c.shape], line: DEFAULT_RECIPE.line, shape: c.shape, motion: c.motion, band: c.band,
    count: 10 + (h % 9), speed: 1, radius: 1, colors: [c.color, partner],
  });
}

export const RECIPE_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['name', 'line', 'shape', 'motion', 'band', 'count', 'speed', 'radius', 'colors'],
  properties: {
    name: { type: 'string', description: `오라 이름, ${NAME_MAX}자 이내 한국어` },
    line: { type: 'string', description: `공방 주인이 건네는 한마디, ${LINE_MAX}자 이내 해요체` },
    shape: { type: 'string', enum: [...SHAPES] },
    motion: { type: 'string', enum: [...MOTIONS] },
    band: { type: 'string', enum: [...BANDS] },
    count: { type: 'integer', description: `${COUNT_MIN}~${COUNT_MAX}` },
    speed: { type: 'number', enum: [...SPEEDS] },
    radius: { type: 'number', enum: [...RADII] },
    colors: { type: 'array', items: { type: 'string', enum: [...PALETTE_IDS] } },
  },
});

const sanitizeTune = (t, recipe) => {
  const x = t && typeof t === 'object' ? t : {};
  return { count: clampCount(x.count, recipe.count), speed: snap(SPEEDS, x.speed, recipe.speed),
    radius: snap(RADII, x.radius, recipe.radius), colors: twoColors(x.colors, recipe.colors) };
};
export function restoreAura(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const slots = (Array.isArray(s.slots) ? s.slots : [])
    .filter(x => x && typeof x.id === 'string' && x.id.length <= 64)
    .slice(0, SLOT_MAX)
    .map(x => { const recipe = sanitizeRecipe(x.recipe); return { id: x.id, recipe, tune: sanitizeTune(x.tune, recipe) }; });
  const equipped = slots.some(x => x.id === s.equipped) ? s.equipped : null;
  return { slots, equipped };
}
