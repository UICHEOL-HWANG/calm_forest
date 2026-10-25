import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spotSteps, treeSteps, DONE_KINDS } from '../js/onboarding/spot-steps.js';
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

test('세계수 판 문구엔 바치다를 쓰지 않는다', () => {
  for (const p of ['js/world/tree-board-ui.js', 'js/spaces/world-tree.js', 'guide/guide.html']) {
    const src = readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|<!--)/.test(l)).join('\n');
    assert.ok(!/바치|바칠|바쳐|바쳤/.test(src), p);
  }
});

const PLAN = {
  branch: '💧 물의 가지', habitatDone: false,
  decor: [
    { id: 'pond', ico: '💧', name: '작은 연못', n: 2, goal: 2, lack: [] },
    { id: 'bigtree', ico: '🌳', name: '큰 나무', n: 1, goal: 1, lack: [{ ico: '🪵', label: '목재', n: 2, src: '🪓 나무 베기' }] },
  ],
  bundles: [
    { id: 'river', name: '강의 꾸러미', items: [{ ico: '🐟', label: '물고기', n: 5, src: '🎣 낚시' }, { ico: '🪨', label: '돌', n: 5, src: '⛏️ 동굴' }], lack: [] },
    { id: 'ferry', name: '나루터 꾸러미', items: [{ ico: '🪵', label: '목재', n: 20, src: '🪓 나무 베기' }], lack: [{ ico: '🪵', label: '목재', n: 12, src: '🪓 나무 베기' }] },
  ],
};

test('세계수 플레이북: 소개 → 막대 → 꾸러미 재료 → 장식 놓기 순서', () => {
  const steps = treeSteps(PLAN);
  assert.deepEqual(steps.map((s) => s.key), ['tree_intro', 'tree_meter', 'tree_bundle_river', 'tree_bundle_ferry', 'tree_deco_pond', 'tree_deco_bigtree']);
  assert.equal(steps[0].text, '📋 💧 물의 가지 채우는 방법 (클릭)');
  assert.equal(steps[2].text, '🎁 강의 꾸러미에 재료를 채워 주세요\n🐟 물고기 5 (🎣 낚시)\n🪨 돌 5 (⛏️ 동굴)');
  assert.equal(steps[3].text, '🎒 나루터 꾸러미 재료가 부족해요\n🪵 목재 12 (🪓 나무 베기)');
  assert.equal(steps[4].text, '🏡 💧 작은 연못 버튼을 2번 눌러요');
  assert.equal(steps[4].done, 'act:treedeco:pond:2');
  assert.equal(steps[5].text, '🎒 재료가 부족해요\n🪵 목재 2 (🪓 나무 베기)');
  assert.equal(steps[5].done, 'tap');
  for (const s of steps) {
    assert.match(s.key, /^[a-z_]+$/);
    assert.ok(!s.text.includes('—'), s.key);
    assert.ok(DONE_KINDS.some((k) => s.done === k || s.done.startsWith(k + ':')), s.key);
  }
});

test('세계수 플레이북: 빈터가 끝났으면 막대·장식 단계는 없다', () => {
  const steps = treeSteps({ ...PLAN, habitatDone: true, decor: [] });
  assert.deepEqual(steps.map((s) => s.key), ['tree_intro', 'tree_bundle_river', 'tree_bundle_ferry']);
});

test('세계수 플레이북: 판을 처음 열 때 한 번, 장식을 놓으면 단계가 넘어간다', () => {
  const WT = readFileSync(new URL('../js/spaces/world-tree.js', import.meta.url), 'utf8');
  assert.match(WT, /ui\.treeTour\?\.\(tourPlan\(\)\)/);
  assert.match(WT, /ui\.treeSpot\?\.\(`act:treedeco:\$\{decoId\}:\$\{k\}`\)/);
  assert.match(HTML, /function runTreeTour\(plan\) \{[\s\S]{0,140}hintSeen\('spotTree'\)/);
  assert.match(HTML, /kind: 'tree'[^\n]*tree-modal/);
  const UI = readFileSync(new URL('../js/world/tree-board-ui.js', import.meta.url), 'utf8');
  assert.match(UI, /dataset\.deco = d\.id/);
  assert.match(UI, /dataset\.bundle = bd\.id/);
});

test('세계수 플레이북 문구 틀은 영어 사전에 있다', () => {
  for (const k of ['📋 {0} 채우는 방법 (클릭)', '🎁 {0}에 재료를 채워 주세요', '🎒 {0} 재료가 부족해요', '🎒 재료가 부족해요', '🏡 {0} 버튼을 {1#}번 눌러요', '🏡 {0} 버튼을 눌러요', '📊 막대를 다 채우면 빈터 완성! 잎이 돋아요']) assert.ok(EN[k], k);
});
