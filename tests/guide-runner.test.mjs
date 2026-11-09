import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGuide } from '../js/guide/runner.js';

const make = () => {
  let t = 0; const log = []; let finished = 0;
  const g = createGuide({
    flow: 'port',
    steps: [
      { id: 'a', text: 'A', target: () => null, done: c => c.a },
      { id: 'b', text: c => `B ${c.n}`, target: () => ({ x: 1, z: 2 }), done: c => c.b, expect: ['go'] },
    ],
    now: () => t, onStep: e => log.push(e), onDone: () => finished++,
  });
  return { g, log, adv: ms => { t += ms; }, finished: () => finished };
};

test('완료 조건을 만족할 때만 다음 단계로 가고 머문 시간을 기록한다', () => {
  const { g, log, adv } = make();
  assert.equal(g.current().id, 'a');
  g.tick({ a: false });
  assert.equal(g.index(), 0);
  adv(1500); g.tick({ a: true, b: false });
  assert.equal(g.current().id, 'b');
  assert.deepEqual(log, [{ flow: 'port', step: 1, ms: 1500 }]);
});

test('한 tick 에 여러 단계가 끝나면 모두 기록하고 끝나면 onDone 한 번', () => {
  const { g, log, adv, finished } = make();
  adv(200); g.tick({ a: true, b: true });
  assert.deepEqual(log.map(e => e.step), [1, 2]);
  assert.equal(g.active(), false);
  assert.equal(g.current(), null);
  assert.equal(finished(), 1);
  g.tick({ a: true, b: true });
  assert.equal(finished(), 1);
});

test('stop 하면 더 기록하지 않는다', () => {
  const { g, log } = make();
  g.stop(); g.tick({ a: true, b: true });
  assert.equal(log.length, 0);
  assert.equal(g.active(), false);
});
