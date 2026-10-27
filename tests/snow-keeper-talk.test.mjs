import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keeperStage, keeperLines, keeperWantsTalk, KEEPER_PROMPT, KEEPER_TALK_R } from '../js/mountain/keeper-talk.js';
import { SNOW_CHAPTER } from '../js/story/chapters.js';

const at = (ch, o = {}) => ({ story: { ch }, tree: { branches: {} }, hintsSeen: {}, ...o });
const done = { tree: { branches: { snow: { habitat: true } } } };

test('단계: 5장 전 안내, 5장 중 부탁, 빈터 완성 뒤 감사', () => {
  assert.equal(keeperStage(at(0)), 'guide');
  assert.equal(keeperStage(at(SNOW_CHAPTER)), 'quest');
  assert.equal(keeperStage(at(SNOW_CHAPTER + 1)), 'guide');
  assert.equal(keeperStage(at(0, done)), 'thanks');
  assert.equal(keeperStage(at(SNOW_CHAPTER, done)), 'thanks');
});

test('대사: 단계마다 한 줄 이상·엠대시 없음, 선물 줄은 감사 단계에서 gift 일 때만', () => {
  for (const st of ['guide', 'quest', 'thanks']) {
    const lines = keeperLines(st, { gift: false });
    assert.ok(lines.length >= 1, st);
    for (const l of lines) { assert.ok(l.length > 0); assert.doesNotMatch(l, /—/); }
  }
  assert.ok(keeperLines('thanks', { gift: true }).length > keeperLines('thanks', { gift: false }).length);
  assert.deepEqual(keeperLines('guide', { gift: true }), keeperLines('guide', { gift: false }));
});

test('❕ 는 부탁 단계에서 아직 말을 안 걸었을 때만', () => {
  assert.equal(keeperWantsTalk(at(SNOW_CHAPTER)), true);
  assert.equal(keeperWantsTalk(at(SNOW_CHAPTER, { hintsSeen: { keeperQuest: true } })), false);
  assert.equal(keeperWantsTalk(at(0)), false);
  assert.equal(keeperWantsTalk(at(SNOW_CHAPTER, done)), false);
});

test('프롬프트·반경', () => {
  assert.equal(KEEPER_PROMPT, '💬 썰매지기에게 말 걸기');
  assert.ok(KEEPER_TALK_R > 1 && KEEPER_TALK_R < 2.2);
});
