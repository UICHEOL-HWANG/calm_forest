import { PHYS } from './sled.js';
import { cashFor } from '../shop/cash.js';

const entry = (o) => Object.freeze({ coins: 0, cashWon: 0, needs: null, phys: Object.freeze({}), ...o, stats: Object.freeze(o.stats), palette: Object.freeze(o.palette), ...(o.phys ? { phys: Object.freeze(o.phys) } : {}) });

export const SLED_LINEUP = Object.freeze({
  basic: entry({
    id: 'basic', ico: '🛷', name: '나무 썰매', line: '균형 잡힌 기본 썰매', stats: [3, 3, 3, 3], model: 'davos',
    palette: { wood: 0xe2b98e, dark: 0xa8774c, metal: 0xe5484d, accent: 0xfff6ea },
  }),
  sky: entry({
    id: 'sky', ico: '🛷', name: '하늘 썰매', line: '균형 잡힌 기본 썰매', stats: [3, 3, 3, 3], model: 'davos', coins: 400,
    palette: { wood: 0x8cc4ef, dark: 0x4f86c6, metal: 0xf7fafd, accent: 0xf7fafd },
  }),
  forest: entry({
    id: 'forest', ico: '🛷', name: '숲 썰매', line: '균형 잡힌 기본 썰매', stats: [3, 3, 3, 3], model: 'davos', coins: 400,
    palette: { wood: 0x5f9a5c, dark: 0x3f6b34, metal: 0xe8c78e, accent: 0xe8c78e },
  }),
  starry: entry({
    id: 'starry', ico: '🛷', name: '별밤 썰매', line: '균형 잡힌 기본 썰매', stats: [3, 3, 3, 3], model: 'davos', coins: 900, needs: 'perfect',
    palette: { wood: 0x24305e, dark: 0x161d3d, metal: 0xf2c94c, accent: 0xf2c94c, stars: true },
  }),
  toboggan: entry({
    id: 'toboggan', ico: '⛄', name: '눈뭉치 터보건', line: '부딪혀도 덜 느려져요. 커브는 둔해요', stats: [3, 2, 5, 3], model: 'toboggan', needs: 'finish',
    palette: { body: 0xbfe8d8, dark: 0xe5484d, pad: 0xfff0c2, rope: 0xe5484d },
    phys: { steerRate: 7.8, hitSlowMult: 0.65, hitRecoverMs: 1100 },
  }),
  wind: entry({
    id: 'wind', ico: '💨', name: '바람 썰매', line: '기본 속도가 빨라요. 도토리 힘은 약해요', stats: [5, 3, 2, 1], model: 'bobsled', coins: 1500, cashWon: 3900,
    palette: { body: 0xc9dcff, trim: 0xfff6ea, dark: 0x22306a, metal: 0x22306a, accent: 0xe5484d },
    phys: { baseSpeed: 13.65, boostMult: 1.33 },
  }),
  acorn: entry({
    id: 'acorn', ico: '🌰', name: '도토리 로켓', line: '도토리 부스터가 세요. 출발이 느려요', stats: [2, 3, 3, 5], model: 'acorn', coins: 1500, cashWon: 3900,
    palette: { nut: 0xffe0a3, cap: 0xe5484d, capDark: 0xb83338, metal: 0x22306a, accent: 0xfff6ea, dark: 0x22306a },
    phys: { baseSpeed: 12.6, accel: 11.25, boostMult: 1.575 },
  }),
  skiff: entry({
    id: 'skiff', ico: '⛸️', name: '얼음 스키프', line: '커브가 날렵해요. 부딪히면 오래 느려요', stats: [3, 5, 1, 3], model: 'skiff', coins: 1500, cashWon: 3900,
    palette: { wood: 0xe3d4ff, metal: 0x22306a, accent: 0xe5484d, trim: 0x22306a },
    phys: { steerRate: 12.3, hitRecoverMs: 1900 },
  }),
});

export const SLED_IDS = Object.freeze(Object.keys(SLED_LINEUP));
export const CASH_SLED_IDS = Object.freeze(['wind', 'acorn', 'skiff']);
export const STAT_NAMES = Object.freeze(['속도', '커브', '튼튼함', '도토리']);

export function sledOf(id) {
  return SLED_LINEUP[id] || SLED_LINEUP.basic;
}

export function sledCash(id) {
  const s = CASH_SLED_IDS.includes(id) ? SLED_LINEUP[id] : null;
  return s?.cashWon ? cashFor(id, null, s.cashWon) : null;
}

export function physOf(id) {
  return Object.freeze({ ...PHYS, ...sledOf(id).phys });
}
