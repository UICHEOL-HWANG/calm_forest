import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const { PEST_LINES, PESTS } = await import('../js/data/delve.js');

test('3차 지하 몹 문구는 모두 영어로 바뀐다', () => {
  const lines = [
    ...Object.values(PESTS).map(p => PEST_LINES.giveup(p.name)),
    PEST_LINES.bonus(3), PEST_LINES.bonus(6), PEST_LINES.empty, PEST_LINES.peek,
    PEST_LINES.result(3, 2, 1), PEST_LINES.result(14, 0, 5, 4),
  ];
  for (const s of lines) assert.doesNotMatch(t(s), /[가-힣]/, s);
  assert.equal(t(PEST_LINES.result(14, 0, 5, 4)), '⛏️ B14 · Kept 0 · Lost 5 · Best streak 4');
});
