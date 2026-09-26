import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initNoteQueue, noteArrived, showIfIdle, beforeDuel } from '../js/duel/note-queue.js';

const NOTE = { author: '농부 삼촌', text: '어젯밤 멧돼지 녀석이…' };

// 📜 밤손님 쪽지는 대결 한가운데 뜨면 판을 덮는다(2026-09-26 실기기 제보) —
//    순서는 늘 "쪽지 → 대결", 대결 중에 도착하면 끝난 뒤로 미룬다.
test('도착하면 일단 쥐고 있는다 — 띄우는 건 한 박자 뒤(출석 창 등과 안 겹치게)', () => {
  const s = noteArrived(initNoteQueue(), NOTE);
  assert.equal(s.note, NOTE);
  assert.equal(s.shown, false);
});

test('한가하면(대결 밖) 보여 준다', () => {
  const r = showIfIdle(noteArrived(initNoteQueue(), NOTE), { duelActive: false });
  assert.equal(r.show, NOTE);
  assert.equal(r.state.shown, true);
});

test('대결 중이면 보여 주지 않고 계속 쥐고 있다', () => {
  const r = showIfIdle(noteArrived(initNoteQueue(), NOTE), { duelActive: true });
  assert.equal(r.show, null);
  assert.equal(r.state.shown, false);
});

test('대결이 끝나면 쥐고 있던 쪽지를 그때 보여 준다', () => {
  const held = showIfIdle(noteArrived(initNoteQueue(), NOTE), { duelActive: true }).state;
  const r = showIfIdle(held, { duelActive: false });
  assert.equal(r.show, NOTE);
});

test('도착 뒤 한 박자 사이에 흔적을 조사하면 쪽지 먼저 — 대결은 닫은 뒤에', () => {
  const r = beforeDuel(noteArrived(initNoteQueue(), NOTE));
  assert.equal(r.show, NOTE);
  assert.equal(r.state.shown, true);
  assert.equal(showIfIdle(r.state, { duelActive: false }).show, null, '한 박자 타이머가 늦게 와도 두 번 뜨지 않는다');
});

test('이미 본 쪽지는 대결 전에도 뒤에도 다시 띄우지 않는다', () => {
  const seen = showIfIdle(noteArrived(initNoteQueue(), NOTE), { duelActive: false }).state;
  assert.equal(beforeDuel(seen).show, null);
  assert.equal(showIfIdle(seen, { duelActive: false }).show, null);
});

test('쪽지가 아직 안 왔으면 대결을 기다리게 하지 않는다', () => {
  const r = beforeDuel(initNoteQueue());
  assert.equal(r.show, null);
  assert.equal(showIfIdle(r.state, { duelActive: false }).show, null);
});

test('빈 쪽지(본문 없음)는 무시한다 — 서버 실패 응답', () => {
  const s = noteArrived(initNoteQueue(), { author: 'x', text: '' });
  assert.equal(s.note, null);
  assert.equal(showIfIdle(s, { duelActive: false }).show, null);
});

test('상태를 변형하지 않는다', () => {
  const s0 = initNoteQueue();
  const s1 = noteArrived(s0, NOTE);
  assert.deepEqual(s0, { note: null, shown: false });
  showIfIdle(s1, { duelActive: false });
  beforeDuel(s1);
  assert.equal(s1.shown, false);
});
