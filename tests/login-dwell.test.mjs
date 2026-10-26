import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoginDwell, DWELL_MARKS } from '../js/login-dwell.js';

function fakeClock() {
  let now = 0;
  const timers = new Map();
  let id = 0;
  return {
    setTimer(fn, ms) { const k = ++id; timers.set(k, { at: now + ms, fn }); return k; },
    clearTimer(k) { timers.delete(k); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = end;
    },
    pending: () => timers.size,
  };
}

function setup({ open = true, hidden = false } = {}) {
  const clock = fakeClock();
  const state = { open, hidden };
  const sent = [];
  const dwell = createLoginDwell({
    track: (name, params) => sent.push([name, params]),
    isOpen: () => state.open,
    isHidden: () => state.hidden,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  return { clock, state, sent, dwell };
}

test('기본 구간은 3·10·30초', () => {
  assert.deepEqual(DWELL_MARKS, [3, 10, 30]);
});

test('화면이 계속 떠 있으면 3·10·30초에 한 번씩 남긴다', () => {
  const { clock, sent, dwell } = setup();
  dwell.start();
  clock.advance(31000);
  assert.deepEqual(sent, [
    ['login_dwell', { sec: 3 }],
    ['login_dwell', { sec: 10 }],
    ['login_dwell', { sec: 30 }],
  ]);
});

test('화면이 닫히면 그 뒤 구간은 남기지 않고 타이머를 정리한다', () => {
  const { clock, state, sent, dwell } = setup();
  dwell.start();
  clock.advance(4000);
  state.open = false;
  clock.advance(30000);
  assert.deepEqual(sent, [['login_dwell', { sec: 3 }]]);
  assert.equal(clock.pending(), 0);
});

test('탭이 숨겨진 동안 도달한 구간은 남기지 않는다', () => {
  const { clock, state, sent, dwell } = setup();
  dwell.start();
  clock.advance(4000);
  state.hidden = true;
  clock.advance(30000);
  assert.deepEqual(sent, [['login_dwell', { sec: 3 }]]);
});

test('숨겨졌다 다시 보이면 그 뒤 구간은 다시 남긴다', () => {
  const { clock, state, sent, dwell } = setup({ hidden: true });
  dwell.start();
  clock.advance(5000);
  state.hidden = false;
  clock.advance(26000);
  assert.deepEqual(sent.map(([, p]) => p.sec), [10, 30]);
});

test('여러 번 불러도 한 번만 잰다', () => {
  const { clock, sent, dwell } = setup();
  dwell.start();
  clock.advance(2000);
  dwell.start();
  clock.advance(29000);
  assert.equal(sent.length, 3);
  assert.deepEqual(sent.map(([, p]) => p.sec), [3, 10, 30]);
});

test('stop 하면 남은 타이머를 모두 지운다', () => {
  const { clock, sent, dwell } = setup();
  dwell.start();
  dwell.stop();
  clock.advance(31000);
  assert.deepEqual(sent, []);
  assert.equal(clock.pending(), 0);
});
