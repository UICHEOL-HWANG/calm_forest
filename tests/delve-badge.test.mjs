import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PEST_BADGE, BADGE_TONE, badgePop, badgeBob } from '../js/delve/badge-math.js';

test('상태마다 이모지 하나와 색 하나: 노림 주황, 물고 감 빨강, 멈춤 초록', () => {
  assert.deepEqual(PEST_BADGE.lurk, ['👀', 'wait']);
  assert.deepEqual(PEST_BADGE.approach, ['👀', 'wait']);
  assert.deepEqual(PEST_BADGE.carry, ['💎', 'carry']);
  for (const s of ['eat', 'sleep', 'doze', 'away', 'lost', 'flee']) assert.equal(PEST_BADGE[s][1], 'stop', s);
  for (const s of ['idle', 'hide', 'gone', 'mimic']) assert.equal(PEST_BADGE[s], undefined, s);
  assert.deepEqual(Object.keys(BADGE_TONE).sort(), ['carry', 'stop', 'wait']);
});

test('나타날 때 0에서 1.15를 거쳐 1로 튀어나오고, 평소엔 위아래로 살짝 둥실', () => {
  assert.equal(badgePop(0), 0);
  assert.ok(Math.abs(badgePop(0.15) - 1.15) < 0.05);
  assert.equal(badgePop(0.22), 1);
  assert.equal(badgePop(3), 1);
  assert.ok(Math.abs(badgeBob(0)) < 1e-9);
  assert.ok(Math.abs(badgeBob(0.35) - 0.05) < 1e-6);
});

test('몹 머리 위는 F안 배지(두 겹 스티커 + 발밑 빛)를 쓰고, 지울 때 정리한다', () => {
  const d = readFileSync(new URL('../js/spaces/delve.js', import.meta.url), 'utf8');
  assert.match(d, /makeStateBadge\(/);
  assert.match(d, /makeGroundGlow\(/);
  assert.match(d, /disposeObj\(p\.glow\)/);
  const b = readFileSync(new URL('../js/delve/state-badge.js', import.meta.url), 'utf8');
  assert.match(b, /toneMapped: false/);
  assert.doesNotMatch(b, /roundRect/);
});
