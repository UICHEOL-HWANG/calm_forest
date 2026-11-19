import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
const { DISH_COPY: C, fill } = await import('../js/neighbors/dish-copy.js');
setLang('en');
const HAS_KO = /[가-힣]/;
const en = (s) => { const out = t(s); assert.ok(!HAS_KO.test(out), `번역 없음: ${JSON.stringify(s)} → ${out}`); return out; };

test('고정 문구는 전부 영어가 있다', () => {
  const flat = (o) => Object.values(o).flatMap(v => (typeof v === 'string' ? [v] : flat(v)));
  const fixed = flat(C).filter(s => !s.includes('{0}') && s !== C.coinTail);
  assert.ok(fixed.length > 20);
  for (const s of fixed) en(s);
});

test('자리 채움 문구', () => {
  assert.equal(en(fill(C.doneLine[2], 'Acorn Bear')), "Acorn Bear will taste it when they're back");
  assert.equal(en(C.metaReact), 'Left you a reaction');
  assert.equal(en(fill(C.metaReply, '🌸')), '😋 Tasted my dish 🌸');
  assert.equal(en(fill(C.rateSub, '🐻 Acorn Bear')), '🐻 Acorn Bear will get your answer');
  assert.equal(en(fill(C.rated, 'Acorn Bear')), '💌 Sent your answer to Acorn Bear');
  assert.equal(en(fill(C.bookBtn, 3)), "🍽️ Neighbors' dishes 3");
  assert.equal(en(fill(C.rateSec, 45)), '45s');
});

test('엠대시·놀다 없음', () => {
  const all = JSON.stringify(C);
  assert.doesNotMatch(all, /—/);
  assert.doesNotMatch(all, /놀/);
});
