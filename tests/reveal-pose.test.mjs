import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealPose, REVEAL_COPY, REVEAL_CARD, revealModeOf, boxburstPose } from '../js/shop/reveal-pose.js';

test('revealPose — 어두워짐 → 커짐(오버슈트) → 카드(1.1s)', () => {
  assert.equal(revealPose(0).scale, 0);
  assert.ok(revealPose(0.25).dim > 0.99);
  const peak = Math.max(...[0.6, 0.7, 0.8, 0.9].map(t => revealPose(t).scale));
  assert.ok(peak > 1.0, 'easeOutBack 오버슈트');
  assert.ok(Math.abs(revealPose(2).scale - 1) < 1e-6);
  assert.equal(revealPose(1.0).card, false);
  assert.equal(revealPose(1.1).card, true);
});

test('문구 — 스펙 §8', () => {
  assert.deepEqual(REVEAL_COPY.firefly, { name: '반딧불 자국', desc: '밤이 되면 발자국마다 반딧불이 떠올라요' });
  assert.deepEqual(REVEAL_COPY.rainbow, { name: '무지개 자국', desc: '걸음마다 일곱 빛깔이 차례로 남아요' });
});

test('스킨 문구(스펙 §7)', () => {
  assert.deepEqual(REVEAL_COPY.forest_spirit, { name: '숲의 정령', desc: '밤이면 몸속에서 반딧불이 떠다녀요' });
  assert.deepEqual(REVEAL_COPY.plush_doll, { name: '플러시 인형', desc: '꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑' });
  assert.deepEqual(REVEAL_CARD.boxburst, { tag: 'PREMIUM · 전신 스킨', cta: '바로 입어보기' });
  assert.deepEqual(REVEAL_CARD.spot, { tag: 'PREMIUM · 걷는 자국', cta: '바로 걸어보기' });
});
test('revealModeOf — 스킨은 상자 폭발, 나머지는 스포트라이트', () => {
  assert.equal(revealModeOf({ slot: 'skin' }), 'boxburst');
  assert.equal(revealModeOf({ slot: 'trail' }), 'spot');
  assert.equal(revealModeOf(null), 'spot');
});
test('boxburstPose — 시안 D 시간축: 등장 0.4 · 덜컹 0.5~1.4 · 열림 1.4 · 솟음 ~2.2 · 카드 2.3', () => {
  assert.equal(boxburstPose(0).box, 0);
  assert.ok(boxburstPose(0.4).box > 0.99);
  assert.equal(boxburstPose(0.45).shake, 0);
  assert.notEqual(boxburstPose(0.97).shake, 0);
  assert.equal(boxburstPose(1.39).open, false);
  assert.equal(boxburstPose(1.39).rise, 0);
  const o = boxburstPose(1.5);
  assert.equal(o.open, true); assert.ok(o.flash > 0); assert.equal(o.ring.on, true);
  assert.ok(boxburstPose(2.2).rise > 0.99);
  assert.equal(boxburstPose(2.29).card, false);
  assert.equal(boxburstPose(2.3).card, true);
  assert.equal(boxburstPose(3).ring.on, false);
  assert.equal(boxburstPose(2.0).flash, 0);
});
