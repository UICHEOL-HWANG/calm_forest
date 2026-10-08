import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.location ??= { search: '', hostname: 'localhost', origin: 'http://localhost' };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.navigator ??= { language: 'ko-KR', userAgent: 'node' };
const { auraTabVisible } = await import('../js/aura/wardrobe-aura.js');

test('🔮 탭은 받은 오라가 있을 때만', () => {
  assert.equal(auraTabVisible({ slots: [], equipped: null }), false);
  assert.equal(auraTabVisible({ slots: [{ id: 'a' }], equipped: null }), true);
  assert.equal(auraTabVisible(undefined), false);
});

test('옷장에 오라 탭이 등록되고 그리기를 위임한다', () => {
  const src = readFileSync(new URL('../js/spaces/wardrobe.js', import.meta.url), 'utf8');
  assert.match(src, /\['aura', '🔮 오라'\]/);
  assert.match(src, /drawAuraTab\(/);
  assert.match(src, /auraTabVisible\(gameState\.aura\)/);
});
