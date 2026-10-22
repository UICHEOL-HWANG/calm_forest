import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initNoteQueue, noteArrived, afterDuel, defenseTip, FALLBACK_NOTES } from '../js/duel/note-queue.js';

const NOTE = { author: '농부 삼촌', text: '멧돼지가 오늘은 한 수 위였네요.' };
const FALL = { author: '농부 삼촌', text: '기본 쪽지' };

test('도착한 쪽지는 쥐고만 있다', () => {
  const s = noteArrived(initNoteQueue(), NOTE);
  assert.equal(s.note, NOTE);
  assert.equal(s.shown, false);
});

test('빈 쪽지는 무시한다', () => {
  assert.equal(noteArrived(initNoteQueue(), { author: 'x', text: '' }).note, null);
});

test('졌을 때만 쪽지를 보여 준다', () => {
  const held = noteArrived(initNoteQueue(), NOTE);
  const r = afterDuel(held, { result: 'lose', fallback: FALL });
  assert.equal(r.show, NOTE);
  assert.equal(r.state.shown, true);
});

test('이기면 쪽지를 띄우지 않는다', () => {
  const r = afterDuel(noteArrived(initNoteQueue(), NOTE), { result: 'win', fallback: FALL });
  assert.equal(r.show, null);
  assert.equal(r.state.shown, false);
});

test('중간에 그만두면 쪽지를 띄우지 않는다', () => {
  const r = afterDuel(noteArrived(initNoteQueue(), NOTE), { result: 'quit', fallback: FALL });
  assert.equal(r.show, null);
});

test('졌는데 쪽지가 아직 없으면 기본 쪽지를 쓴다', () => {
  const r = afterDuel(initNoteQueue(), { result: 'lose', fallback: FALL });
  assert.equal(r.show, FALL);
  assert.equal(r.state.shown, true);
});

test('한 번 보여 준 뒤엔 다시 지더라도 또 띄우지 않는다', () => {
  const first = afterDuel(noteArrived(initNoteQueue(), NOTE), { result: 'lose', fallback: FALL });
  assert.equal(afterDuel(first.state, { result: 'lose', fallback: FALL }).show, null);
});

test('상태를 변형하지 않는다', () => {
  const s0 = initNoteQueue();
  const s1 = noteArrived(s0, NOTE);
  afterDuel(s1, { result: 'lose', fallback: FALL });
  assert.deepEqual(s0, { note: null, shown: false });
  assert.equal(s1.shown, false);
});

test('기본 쪽지는 두 동물 모두 있고 엠대시가 없다', () => {
  for (const a of ['boar', 'raccoon']) {
    assert.ok(FALLBACK_NOTES[a]?.length > 10);
    assert.doesNotMatch(FALLBACK_NOTES[a], /—/);
  }
});

test('방어 팁은 지금 밭에 없는 것부터 권한다', () => {
  assert.match(defenseTip({ scarecrow: false, fence: false }), /허수아비/);
  assert.match(defenseTip({ scarecrow: true, fence: false }), /울타리/);
  assert.match(defenseTip({ scarecrow: true, fence: true }), /이기면/);
  assert.match(defenseTip({ scarecrow: false, fence: true }), /^🎃/);
});
