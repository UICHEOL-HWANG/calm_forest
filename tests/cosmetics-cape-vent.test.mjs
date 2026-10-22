// tests/cosmetics-cape-vent.test.mjs — 꼬리 판정 · 망토를 입으면 꼬리를 숨기고 트임은 좁게
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tailType } from '../js/cosmetics/anchors.js';

test('tailType — game.js 의 객체 형태와 옛 문자열 형태를 모두 읽는다', () => {
  assert.equal(tailType({ type: 'bushy', color: 0xf0883a }), 'bushy');
  assert.equal(tailType({ type: 'long' }), 'long');
  assert.equal(tailType('bushy'), 'bushy');
  assert.equal(tailType(undefined), '');
  assert.equal(tailType(null), '');
});

test('game.js — 여우 bushy · 고양이 long 은 큰 꼬리, 나머지는 아니다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const types = [...src.matchAll(/id:\s*'(\w+)'[\s\S]*?tail:\s*\{\s*type:\s*'(\w+)'/g)];
  assert.ok(types.length >= 5, 'ANIMALS 정의를 읽지 못했다');
  const big = types.filter(([, , t]) => ['bushy', 'long'].includes(tailType({ type: t })));
  assert.ok(big.length >= 2);
});

test('망토를 입으면 꼬리를 숨긴다 — 트임은 꼬리와 무관하게 좁다', async () => {
  const art = readFileSync(new URL('../js/cosmetics/art.js', import.meta.url), 'utf8');
  assert.match(art, /const VENT = 0\.06;/);
  assert.doesNotMatch(art, /BIG_TAIL/);
  const bats = readFileSync(new URL('../js/cosmetics/art-bats.js', import.meta.url), 'utf8');
  assert.match(bats, /const VENT = 0\.06, VENT_TOP = 0\.30;/);
  const { hidesTail } = await import('../js/cosmetics/equip.js');
  assert.equal(hidesTail({ equipped: { back: 'cape' } }), true);
  assert.equal(hidesTail({ equipped: { back: 'bat_cape' } }), true);
  assert.equal(hidesTail({ equipped: { back: 'bat_wing' } }), false);
  assert.equal(hidesTail({ equipped: {} }), false);
  assert.equal(hidesTail(null), false);
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /if \(tailPivot\) tailPivot\.visible = !hidesTail\(cos\);/);
  assert.match(game, /if \(built\.tail\) built\.tail\.visible = !hidesTail\(cos\);/);
});
