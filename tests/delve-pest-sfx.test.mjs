import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PEST_SFX, PEST_SFX_KEYS, pestSfx } from '../js/delve/pest-sfx.js';

const KEYS = ['notice', 'snatch', 'lost', 'tap', 'startle', 'bait', 'munch', 'plug', 'confused', 'snore', 'hush', 'wake', 'ringdrop', 'swoop', 'dig', 'reclaim', 'lightsOff', 'flutter', 'lightsOn', 'curl', 'real', 'fake', 'roll', 'heart', 'combo1', 'combo2', 'combo3', 'bonus', 'comboBreak', 'giveUp', 'gift', 'dive', 'bubble', 'feint', 'rumble', 'dust', 'shuffle'];

test('효과음 D 묶음: 게임에서 쓰는 키가 모두 있고 괭이·줍기는 없다', () => {
  assert.deepEqual([...PEST_SFX_KEYS].sort(), [...KEYS].sort());
  for (const k of KEYS) {
    assert.equal(typeof PEST_SFX[k].play, 'function', k);
    assert.ok(['A', 'B', 'C'].includes(PEST_SFX[k].voice), k);
    assert.ok(PEST_SFX[k].gain > 0, k);
  }
  assert.equal(PEST_SFX.hit, undefined);
  assert.equal(PEST_SFX.keep, undefined);
});

test('오디오가 없으면 조용히 아무것도 안 한다', () => {
  for (const k of [...KEYS, 'nope', undefined]) assert.doesNotThrow(() => pestSfx(k));
});

test('소리를 끄면 오디오를 만들지 않고, 재생 중 오류도 밖으로 안 낸다', async () => {
  const made = [];
  globalThis.window = { AudioContext: class { constructor() { made.push(this); throw new Error('boom'); } } };
  const { toggleSound } = await import('../js/sound.js');
  try {
    toggleSound(false);
    pestSfx('tap');
    assert.equal(made.length, 0);
    toggleSound(true);
    assert.doesNotThrow(() => pestSfx('tap'));
    assert.equal(made.length, 1);
  } finally {
    delete globalThis.window;
  }
});
