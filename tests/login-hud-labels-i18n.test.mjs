import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Apple sign-in and beta diary buttons have English labels', () => {
  assert.match(html, /<button id="apple-btn">[\s\S]*?<\/svg> Apple로 계속하기<\/button>/);
  assert.match(html, /<button id="diary-btn"[^>]*>[\s\S]*?<span class="ulbl">오늘 일지<\/span>/);
  assert.equal(EN['Apple로 계속하기'], 'Continue with Apple');
  assert.equal(EN['오늘 일지'], "Today's Log");
});
