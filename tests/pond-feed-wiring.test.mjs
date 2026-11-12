import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('낚시 보장: 다음 한 번만, DDA 안 건드림, assist 기록', () => {
  const f = src('js/spaces/fishing.js');
  assert.match(f, /export function setFishAssist\(on\)/);
  assert.match(f, /const ASSIST_BITE_SEC = 1\.2;/);
  assert.match(f, /const ASSIST_HOLD_SEC = 20;/);
  assert.match(f, /if \(!assisted\) settleDifficulty\('fish', 1\);/);
  assert.match(f, /\.\.\.\(assisted \? \{ assist: 1 \} : \{\}\)/);
});
