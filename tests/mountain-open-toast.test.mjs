import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
const fn = M.slice(M.indexOf('export function maybeRevealMountain'), M.indexOf('\n}\n', M.indexOf('export function maybeRevealMountain')));

test('설산 해금은 카메라 연출 없이 토스트만', () => {
  assert.ok(!M.includes('createReveal'), 'createReveal 호출이 남아 있다');
  assert.match(fn, /ui\.toast\?\.\('🏔️ 설산이 열렸어요!'/);
  assert.match(fn, /mountainReveal: true/);
  assert.match(fn, /trackEvent\('mountain_reveal'\)/);
  assert.match(fn, /requestSave\(\)/);
});
