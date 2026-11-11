import { FORAGE_ICO } from '../forage/logic.js';

// 품목 아이콘 — **SELL_PRICE 의 모든 키를 덮어야 한다**(tests/orchard.test.mjs 가 강제).
//   빠진 키가 있으면 📊시세판 월드 텍스처·상인 말풍선·시세판 모달이 문자 그대로 "undefined" 를 그린다.
//   🍎 과수원 과일 아이콘은 js/orchard.js FRUITS[].ico 와 같은 값.
export const SELL_ICO_G = { ...FORAGE_ICO, charcoal: '⚫', flour: '🌾', brick: '🧱', bread: '🥐', juice: '🍷', grape_juice: '🍹', crop: '🥕', fish: '🐟', wood: '🪵', stone: '🪨', coal: '⚫', gem: '💎', crystal: '🔮', egg: '🥚', bug: '🌟', forage: '🍄', wheat: '🌾', corn: '🌽', grape: '🍇', honey: '🍯',
                     apple: '🍎', pear: '🍐', peach: '🍑', persimmon: '🍊', chestnut: '🌰',
                     apple_jam: '🥫', roast_chestnut: '🌰', gotgam: '🍡' };   // 🍎 과일 가공(js/craft/recipes.js)
