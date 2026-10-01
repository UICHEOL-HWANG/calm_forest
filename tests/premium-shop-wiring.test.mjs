import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('가게가 premiumRowMode 로 행을 고르고 hidden 이면 그리지 않는다', () => {
  assert.match(cafe, /import \{ premiumRowMode \} from '\.\.\/shop\/premium-row\.js'/);
  assert.match(cafe, /mode === 'hidden'\) continue/);
  assert.match(cafe, /trackEvent\('premium_row_view'/);
  assert.match(cafe, /const sb = shopButton\(it, gameState\.cosmetics\);\s*\n\s*if \(sb\)/);
});

test('새 문구는 영어 사전에 있다', () => {
  for (const k of ['로그인하면 살 수 있어요', '지금은 살 수 없어요']) assert.ok(en.includes(`'${k}'`), k);
});
