import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spotToolStep, spotWant, spotKeep, SPOT, IDLE } from '../js/spot-tool-auto.js';
import { gameSource } from './helpers/game-source.mjs';

const base = { eligible: true, page: 'farm', tool: 'seed', want: 'axe', keep: false };

test('자리가 원하는 도구를 들고, 원래 세트·도구를 기억한다', () => {
  const r = spotToolStep(IDLE, base);
  assert.equal(r.act, 'grab');
  assert.deepEqual(r.state, { on: true, tool: 'axe', prevPage: 'farm', prevTool: 'seed' });
});

test('이미 그 도구를 들었거나 맨손 세트·자격 없음이면 바꾸지 않는다', () => {
  assert.equal(spotToolStep(IDLE, { ...base, tool: 'axe' }).act, null);
  assert.equal(spotToolStep(IDLE, { ...base, page: 'none' }).act, null);
  assert.equal(spotToolStep(IDLE, { ...base, eligible: false }).act, null);
  assert.equal(spotToolStep(IDLE, { ...base, want: null }).act, null);
});

test('경계 여유(keep) 안에서는 유지, 벗어나면 원래 도구로 돌아간다', () => {
  const on = spotToolStep(IDLE, base).state;
  const mid = spotToolStep(on, { ...base, want: null, keep: true, tool: 'axe', page: 'out' });
  assert.equal(mid.act, null);
  assert.equal(mid.state.on, true);
  const far = spotToolStep(on, { ...base, want: null, keep: false, tool: 'axe', page: 'out' });
  assert.equal(far.act, 'restore');
  assert.deepEqual(far.state, IDLE);
  assert.deepEqual(far.restore, { page: 'farm', tool: 'seed' });
});

test('범위 안에서 손으로 바꿨으면 다시 잡지 않고, 떠날 때 되돌리지도 않는다', () => {
  const on = spotToolStep(IDLE, base).state;
  assert.equal(spotToolStep(on, { ...base, keep: true, tool: 'water' }).act, null);
  const far = spotToolStep(on, { ...base, want: null, keep: false, tool: 'water' });
  assert.equal(far.act, null);
  assert.deepEqual(far.state, IDLE);
});

test('이미 그 도구를 들고 들어왔다가 손으로 바꾸면, 범위 안에선 다시 빼앗지 않는다', () => {
  const inSpot = spotToolStep(IDLE, { ...base, tool: 'axe', page: 'out' });
  assert.equal(inSpot.act, null);
  assert.equal(inSpot.state.on, true);
  const swiped = spotToolStep(inSpot.state, { ...base, keep: true, tool: 'hammer', page: 'out' });
  assert.equal(swiped.act, null);
  const left = spotToolStep(swiped.state, { ...base, want: null, keep: false, tool: 'hammer', page: 'out' });
  assert.equal(left.act, null);
  assert.deepEqual(left.state, IDLE);
});

test('처음부터 들고 들어온 도구는 떠날 때 바꿀 게 없다', () => {
  const inSpot = spotToolStep(IDLE, { ...base, tool: 'axe', page: 'out' }).state;
  const left = spotToolStep(inSpot, { ...base, want: null, keep: false, tool: 'axe', page: 'out' });
  assert.equal(left.act, null);
  assert.deepEqual(left.state, IDLE);
});

test('자동으로 든 뒤 맨손을 고르면 그 선택을 지킨다 — 떠날 때 도구를 다시 쥐여 주지 않는다', () => {
  const on = spotToolStep(IDLE, base).state;
  const bare = spotToolStep(on, { ...base, keep: true, tool: 'axe', page: 'none' });
  assert.equal(bare.act, null);
  assert.deepEqual(bare.state, IDLE);
  const left = spotToolStep(bare.state, { ...base, want: null, keep: false, tool: 'axe', page: 'none' });
  assert.equal(left.act, null);
});

test('구역을 벗어나 자격이 없어지면 바로 되돌린다', () => {
  const on = spotToolStep(IDLE, base).state;
  assert.equal(spotToolStep(on, { ...base, eligible: false, keep: true, tool: 'axe' }).act, 'restore');
});

test('호숫가는 나무보다 먼저 — 물가에선 낚싯대, 나무 옆에선 도끼', () => {
  const lakeIn = SPOT.rod.in - 0.1, treeIn = SPOT.axe.in - 0.1;
  assert.equal(spotWant({ lake: lakeIn, tree: treeIn }), 'rod');
  assert.equal(spotWant({ lake: 99, tree: treeIn }), 'axe');
  assert.equal(spotWant({ lake: 99, tree: 99 }), null);
  assert.equal(spotKeep('rod', { lake: SPOT.rod.out - 0.1, tree: 99 }), true);
  assert.equal(spotKeep('rod', { lake: SPOT.rod.out + 0.1, tree: 0 }), false);
  assert.equal(spotKeep('axe', { lake: 99, tree: SPOT.axe.out - 0.1 }), true);
});

test('집터에선 망치 — 호숫가 다음, 나무보다 먼저', () => {
  const far = { lake: 99, tree: 99, house: 99 };
  assert.equal(spotWant({ ...far, house: SPOT.hammer.in - 0.1 }), 'hammer');
  assert.equal(spotWant({ ...far, house: SPOT.hammer.in - 0.1, tree: 0 }), 'hammer');
  assert.equal(spotWant({ ...far, house: 0, lake: 0 }), 'rod');
  assert.equal(spotKeep('hammer', { ...far, house: SPOT.hammer.out - 0.1 }), true);
  assert.equal(spotKeep('hammer', { ...far, house: SPOT.hammer.out + 0.1 }), false);
});

test('망치 자리는 실제로 지을 수 있는 거리 안쪽이다', () => {
  const build = gameSource().match(/if \(dist2D\(HOUSE_POS, player\.position\) > ([\d.]+)\)/);
  assert.ok(build, 'tryBuild 거리 조건');
  assert.ok(SPOT.hammer.in < Number(build[1]));
});

test('낚싯대 자리는 실제로 낚시가 되는 거리 안쪽이다', () => {
  const fishing = gameSource().match(/if \(distLake > LAKE_R \+ ([\d.]+)\)/);
  assert.ok(fishing, 'tryFish 거리 조건');
  assert.ok(SPOT.rod.in < Number(fishing[1]));
});

test('game.js 가 구역 자동 전환보다 먼저 매 프레임 판정하고 기록한다', () => {
  const src = gameSource();
  assert.match(src, /function updateToolPageAuto\(\) \{\n  updateSpotToolAuto\(\);/);
  assert.match(src, /trackEvent\('tool_auto', \{ to: r\.state\.tool, reason: SPOT_REASON\[r\.state\.tool\] \}\)/);
  assert.match(src, /house: dist2D\(HOUSE_POS, player\.position\)/);
});
