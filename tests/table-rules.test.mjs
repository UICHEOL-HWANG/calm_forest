import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABLE_LONG_FROM, BITE_BASE_SEC, BITE_AD_PER_DAY } from '../js/data/table.js';
import {
  tableDishes, tableShape, tableView, tableChanges, biteStatus, afterBite, afterBiteAd, biteSeconds, biteBuffEnd, cookbook,
} from '../js/table/rules.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const TIERS = [
  { id: 'perfect', min: 88, mult: 1.5 },
  { id: 'great', min: 65, mult: 1.25 },
  { id: 'good', min: 35, mult: 1.0 },
  { id: 'plain', min: 0, mult: 0.7 },
];
const RECIPES = [...src('js/data/catalog.js').matchAll(/\{ id: '([a-z_]+)',\s+name: '([^']+)',\s+ico: '([^']+)', cost: \{([^}]*)\},\s+buff: '([a-z]+)'/g)]
  .map(m => ({
    id: m[1], name: m[2], ico: m[3], buff: m[5],
    cost: Object.fromEntries(m[4].split(',').map(s => s.trim().split(': ')).map(([k, v]) => [k, Number(v)])),
  }));
const ids = (n) => Object.fromEntries(RECIPES.slice(0, n).map(r => [r.id, 50]));

test('레시피 표는 11개, 등급 컷은 주방과 같다', () => {
  assert.equal(RECIPES.length, 11);
  const cook = src('js/spaces/cooking.js');
  for (const t of TIERS) assert.match(cook, new RegExp(`id: '${t.id}',\\s+min: ${t.min},[^\\n]+mult: ${t.mult}(\\.0)? `));
  assert.equal(TABLE_LONG_FROM, 7);
});

test('접시: 레시피 순서, 레시피당 하나, 등급 붙음', () => {
  const out = tableDishes({ rice_ball: 90, veg_stew: 10, bread: 70, omelette: 35 }, RECIPES, TIERS);
  assert.deepEqual(out.map(d => d.id), ['veg_stew', 'rice_ball', 'omelette', 'bread']);
  assert.deepEqual(out.map(d => d.tier), ['plain', 'perfect', 'good', 'great']);
  assert.deepEqual(Object.keys(out[0]).sort(), ['buff', 'ico', 'id', 'name', 'tier']);
  assert.equal(out[0].ico, '🥘');
  assert.equal(out[0].buff, 'speed');
});

test('접시: 자유 냄비·모르는 요리·0점·숫자 아닌 값은 뺀다', () => {
  const best = { 'free:crop+fish': 80, nope: 50, veg_stew: 0, rice_ball: '70', baked_yam: NaN, herb_salad: -3, bread: 1 };
  assert.deepEqual(tableDishes(best, RECIPES, TIERS).map(d => d.id), ['bread']);
  assert.deepEqual(tableDishes(null, RECIPES, TIERS), []);
  assert.deepEqual(tableDishes([1, 2], RECIPES, TIERS), []);
});

test('모양: 6가지까지 둥근 식탁, 7가지부터 긴 식탁, 최대 11', () => {
  assert.equal(tableShape(0), 'round');
  assert.equal(tableShape(6), 'round');
  assert.equal(tableShape(7), 'long');
  assert.equal(tableShape(11), 'long');
  assert.deepEqual(tableView({}, RECIPES, TIERS), { dishes: [], shape: 'round', has: false });
  const six = tableView(ids(6), RECIPES, TIERS);
  assert.equal(six.shape, 'round');
  assert.equal(six.has, true);
  const all = tableView({ ...ids(11), 'free:crop': 99 }, RECIPES, TIERS);
  assert.equal(all.dishes.length, 11);
  assert.equal(all.shape, 'long');
});

test('바뀐 것: 처음 생김, 새 요리, 등급 오름, 긴 식탁', () => {
  const v = (best) => tableView(best, RECIPES, TIERS);
  assert.deepEqual(tableChanges(null, v({})), []);
  assert.deepEqual(tableChanges(null, v({ veg_stew: 40 })), [{ type: 'created' }]);
  assert.deepEqual(tableChanges(v({}), v({ veg_stew: 40 })), [{ type: 'created' }]);
  assert.deepEqual(tableChanges(v({ veg_stew: 40 }), v({ veg_stew: 40 })), []);
  assert.deepEqual(tableChanges(v({ veg_stew: 40 }), v({ veg_stew: 40, bread: 40 })), [{ type: 'dish', id: 'bread' }]);
  assert.deepEqual(tableChanges(v({ veg_stew: 40 }), v({ veg_stew: 90 })), [{ type: 'tier', id: 'veg_stew' }]);
  assert.deepEqual(tableChanges(v(ids(6)), v(ids(7))), [{ type: 'dish', id: RECIPES[6].id }, { type: 'long' }]);
  assert.deepEqual(tableChanges(v(ids(7)), v(ids(8))), [{ type: 'dish', id: RECIPES[7].id }]);
});

test('한 입: 하루 한 번, 날이 바뀌면 다시', () => {
  assert.equal(BITE_AD_PER_DAY, 1);
  assert.deepEqual(biteStatus({}, '2026-11-17'), { bit: false, adLeft: 0 });
  assert.deepEqual(biteStatus(null, '2026-11-17'), { bit: false, adLeft: 0 });
  const h = afterBite({ tableSeen: true }, '2026-11-17');
  assert.deepEqual(h, { tableSeen: true, tableBiteDay: '2026-11-17' });
  assert.deepEqual(biteStatus(h, '2026-11-17'), { bit: true, adLeft: 1 });
  assert.deepEqual(biteStatus(h, '2026-11-18'), { bit: false, adLeft: 0 });
});

test('한 입 더: 무료 한 입 뒤에만, 하루 한 번, 원본은 그대로', () => {
  const src0 = { tableSeen: true };
  const h1 = afterBite(src0, '2026-11-17');
  const h2 = afterBiteAd(h1, '2026-11-17');
  assert.deepEqual(src0, { tableSeen: true });
  assert.equal(h1.tableBiteAd, undefined);
  assert.deepEqual(biteStatus(h2, '2026-11-17'), { bit: true, adLeft: 0 });
  assert.deepEqual(biteStatus(afterBite(h2, '2026-11-18'), '2026-11-18'), { bit: true, adLeft: 1 });
});

test('한 입 길이: 등급 배율만 곱한다', () => {
  assert.equal(BITE_BASE_SEC, 30);
  assert.deepEqual(TIERS.map(t => biteSeconds(t.id, TIERS)).reverse(), [21, 30, 38, 45]);
  assert.equal(biteSeconds('nope', TIERS), 30);
});

test('한 입은 돌고 있는 버프를 줄이지 않는다', () => {
  assert.equal(biteBuffEnd(undefined, 100, 30), 130);
  assert.equal(biteBuffEnd(50, 100, 30), 130);
  assert.equal(biteBuffEnd(250, 100, 30), 280);
});

test('요리책: 11칸, 모자란 재료만, 밤사이 재료 안내', () => {
  const book = cookbook({ veg_stew: 90, 'free:crop': 50 }, { crop: 2, forage: 5, flour: 2 }, RECIPES, TIERS);
  assert.equal(book.total, 11);
  assert.equal(book.got, 1);
  assert.equal(book.slots.length, 11);
  const by = Object.fromEntries(book.slots.map(s => [s.id, s]));
  assert.equal(by.veg_stew.got, true);
  assert.equal(by.veg_stew.tier, 'perfect');
  assert.equal(by.rice_ball.got, false);
  assert.equal(by.rice_ball.tier, null);
  assert.deepEqual(by.rice_ball.cost, [{ k: 'crop', need: 2, have: 2 }]);
  assert.deepEqual(by.rice_ball.short, []);
  assert.deepEqual(by.lunchbox.short, [{ k: 'fish', need: 1, have: 0, more: 1 }]);
  assert.deepEqual(by.omelette.short.map(s => s.k), ['egg']);
  assert.equal(by.bread.station, 'kiln');
  assert.deepEqual(by.bread.short, []);
  assert.equal(by.grape_juice.station, 'vat');
  assert.equal(by.veg_stew.station, null);
  assert.equal(cookbook(null, null, RECIPES, TIERS).got, 0);
});

test('규칙 파일에는 주석이 없다', () => {
  for (const f of ['js/data/table.js', 'js/table/rules.js', 'js/table/site.js']) assert.doesNotMatch(src(f), /^\s*\/\//m);
});
