import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('cooking result title is translated before the exclamation mark is added', () => {
  assert.match(read('js/game-ui/cook-course.js'), /\$\('mgr-title'\)\.textContent = `\$\{t\(res\.tier\.name\)\}!`;/);
  assert.match(read('js/game-ui/cook-course.js'), /^import \{ LANG, t \} from '\.\.\/i18n\.js';/m);
});

test('every cooking tier name, including the free-pot skill names, has an English entry', () => {
  const names = [...read('js/spaces/cooking.js').matchAll(/name: '([^']+맛)'/g)].map((m) => m[1]);
  assert.equal(names.length, 4);
  for (const n of [...names, ...names.map((n) => n.replace('맛', '솜씨'))]) assert.ok(EN[n], n);
});
