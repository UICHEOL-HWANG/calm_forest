import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNickStep } from '../js/nickname-step.js';

const rig = () => {
  const sent = [];
  let t = 1000;
  const step = createNickStep({ track: (n, p) => sent.push([n, p]), now: () => t });
  return { sent, step, tick: (ms) => { t += ms; } };
};

test('보임 → 첫 입력 → 완료, 시간은 보인 순간부터 잰다', () => {
  const { sent, step, tick } = rig();
  step.view();
  tick(1200); step.input('솔');
  tick(300); step.input('솔방');
  tick(2500); step.done();
  assert.deepEqual(sent, [
    ['nickname_step', { step: 'view' }],
    ['nickname_step', { step: 'type', ms: 1200 }],
    ['nickname_step', { step: 'done', ms: 4000 }],
  ]);
});

test('끝내지 않고 떠나면 막힌 조건과 글자 수만 남긴다 — 이름 값은 보내지 않는다', () => {
  const { sent, step, tick } = rig();
  step.view();
  tick(800); step.input('ㅋㅋ');
  tick(5000); step.leave('ㅋㅋ');
  assert.deepEqual(sent.at(-1), ['nickname_step', { step: 'leave', ms: 5800, reason: 'jamo', len: 2 }]);
  assert.ok(!JSON.stringify(sent).includes('ㅋㅋ'));
});

test('빈칸으로 떠나면 len, 조건을 다 맞춘 채 떠나면 none', () => {
  const a = rig(); a.step.view(); a.step.leave('');
  assert.equal(a.sent.at(-1)[1].reason, 'len');
  const b = rig(); b.step.view(); b.step.input('솔방울'); b.step.leave('솔방울');
  assert.equal(b.sent.at(-1)[1].reason, 'none');
});

test('완료 뒤·보이기 전·두 번째 떠남은 기록하지 않는다', () => {
  const { sent, step } = rig();
  step.leave('x');
  step.view(); step.done(); step.leave('솔방울'); step.leave('솔방울');
  assert.deepEqual(sent.map(([, p]) => p.step), ['view', 'done']);
});

test('파라미터는 4개 이하(GA4 한도 여유)', () => {
  const { sent, step } = rig();
  step.view(); step.input('a'); step.leave('a');
  sent.forEach(([, p]) => assert.ok(Object.keys(p).length <= 4));
});

test('캐릭터 선택 창(새 유저)에 연결돼 있다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /import \{ createNickStep \} from '\.\/js\/nickname-step\.js';/);
  assert.match(html, /if \(!change\) nickStep\.view\(\);/);
  assert.match(html, /nickStep\.input\(nick\.value\)/);
  assert.match(html, /if \(!change\) nickStep\.done\(\);/);
  assert.match(html, /addEventListener\('pagehide', \(\) => nickStep\.leave\(\$\('nick-input'\)\?\.value \|\| ''\)\)/);
});
