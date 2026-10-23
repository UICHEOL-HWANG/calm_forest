import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spotSteps, DONE_KINDS } from '../js/onboarding/spot-steps.js';
import { EN } from '../js/i18n-en.js';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SRC = ['js/hud/hud-shell.js', 'js/hud/tool-fan.js', 'js/hud/mobile-hud.js', 'js/hud/menu-sheet.js']
  .map((p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')).join('\n') + HTML;

const all = [
  ['full', true, 8], ['full', false, 9], ['new', true, 3], ['new', false, 3], ['menu', true, 3], ['menu', false, 3], ['pill', true, 1], ['cam', true, 1], ['cam', false, 1],
];

test('단계 수 — 모바일 8·PC 9·바뀐 점 3·메뉴 3·근접 알약 1·시점 회전 1', () => {
  for (const [kind, touch, n] of all) assert.equal(spotSteps(kind, touch).length, n, `${kind}/${touch}`);
});

test('모든 단계는 키·문구·완료 조건이 있고, 대상이나 키 안내 중 하나는 있다', () => {
  for (const [kind, touch] of all) for (const s of spotSteps(kind, touch)) {
    assert.match(s.key, /^[a-z_]+$/);
    assert.ok(s.text && !s.text.includes('—'), `${s.key} 문구(엠대시 없음)`);
    assert.ok(DONE_KINDS.some((k) => s.done === k || s.done.startsWith(k + ':')), `${s.key} done=${s.done}`);
    assert.ok(s.target || (s.keys && s.keys.length), `${s.key} 대상 또는 키`);
  }
});

test('가리키는 대상 id 는 실제로 만들어지는 요소다', () => {
  for (const [kind, touch] of all) for (const s of spotSteps(kind, touch)) {
    if (!s.target) continue;
    const id = s.target.match(/#([\w-]+)/)[1];
    assert.ok(SRC.includes(`id="${id}"`) || SRC.includes(`'${id}'`) || SRC.includes(`id = '${id}'`), `${s.key} → #${id}`);
  }
});

test('모바일 단계엔 키보드 이야기가 없고, PC 첫 단계는 방향키', () => {
  spotSteps('full', true).forEach((s) => assert.ok(!s.keys, s.key));
  assert.deepEqual(spotSteps('full', false)[0].keys, ['↑', '←', '↓', '→']);
});

test('문구는 모두 영어 사전에 있다', () => {
  for (const [kind, touch] of all) for (const s of spotSteps(kind, touch)) assert.ok(EN[s.text], s.text);
});

test('첫 실행 핵심 조작(걷기·도구 고르기·쓰기)만 core', () => {
  assert.deepEqual(spotSteps('full', true).filter((s) => s.core).map((s) => s.key), ['t_move', 't_tool', 't_use']);
  assert.deepEqual(spotSteps('full', false).filter((s) => s.core).map((s) => s.key), ['pc_move', 'pc_set', 'pc_pick', 'pc_use']);
});

test('동그라미 안내 문구는 동그라미가 하는 일에 맞춘다', async () => {
  const { pillText, pillHintKey } = await import('../js/onboarding/spot-steps.js');
  assert.equal(pillText({ kind: 'npc', icon: '💬' }), '👆 말 걸기');
  assert.equal(pillText({ kind: 'door', icon: '🎃', text: '🎃 달빛 유령 정원으로 가기' }), '👆 정원으로');
  assert.equal(pillText({ kind: 'door', icon: '🚪', text: '🚪 마을로 나가기' }), '👆 마을로');
  assert.equal(pillText({ kind: 'target', icon: '🔍' }), '👆 살펴보기');
  assert.equal(pillText({ kind: 'door', icon: '🍳', text: '🍳 요리하기' }), '👆 바로 하기');
  for (const k of ['npc', 'target']) assert.ok(pillText({ kind: k }).length <= 8);
  assert.equal(pillHintKey({ kind: 'door', icon: '🎃' }), 'spot_pill_hw');
  assert.equal(pillHintKey({ kind: 'target', icon: '🔍' }), 'spot_pill_look');
  assert.equal(pillHintKey({ kind: 'npc', icon: '💬' }), 'spot_pill');
});
