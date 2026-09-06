import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPredictor, pickIntervention } from '../js/predict.js';

const fullWindow = () => Array.from({ length: 10 }, (_, i) => ({
  char_x: i, char_z: 0, cam_yaw: i * 0.1, mouse_x: i * 3, mouse_y: 0,
}));

function harness(over = {}) {
  const calls = { fetch: [], banner: [], track: [] };
  const base = {
    getWindow: () => fullWindow(),
    fetchImpl: async () => ({ ok: true, json: async () => ({ p: 0.9, intervene: true, model_version: 'v1', threshold: 0.5 }) }),
    session: { id: 's1', clientId: 'c1', variant: 'beta_A', arm: 'treat', isFirstSession: true },
    gameState: { plantedUnwatered: 1, openQuests: 0, buildableHouse: false, doneKinds: ['chop_tree'] },
    showBanner: (b) => calls.banner.push(b),
    track: (n, p) => calls.track.push([n, p]),
    endpoint: 'https://x/predict',
    maxPerSession: 2,
    timeoutMs: 800,
    ...over,
  };
  const deps = { ...base, fetchImpl: async (...a) => { calls.fetch.push(a); return base.fetchImpl(...a); } };
  return { p: createPredictor(deps), calls };
}

const scoreEvent = (calls) => calls.track.find(([n]) => n === 'churn_score')[1];

test('윈도가 모자라면 호출하지 않는다', async () => {
  const { p, calls } = harness({ getWindow: () => fullWindow().slice(0, 4) });
  await p.onTrigger('time15');
  assert.equal(calls.fetch.length, 0);
  assert.equal(scoreEvent(calls).skipped, 'window');
});

test('점수를 받아 배너를 띄우고 이벤트를 남긴다', async () => {
  const { p, calls } = harness();
  await p.onTrigger('time15');
  assert.equal(calls.fetch.length, 1);
  assert.equal(calls.banner.length, 1);
  const e = scoreEvent(calls);
  assert.equal(e.p, 0.9);
  assert.equal(e.shown, true);
  assert.equal(e.trigger, 'time15');
  assert.equal(e.model_version, 'v1');
});

test('대조군은 점수를 내되 개입하지 않는다', async () => {
  const { p, calls } = harness({ session: { id: 's', clientId: 'c', variant: 'beta_A', arm: 'control', isFirstSession: false } });
  await p.onTrigger('time15');
  assert.equal(calls.fetch.length, 1, '전원 점수화 — 대조군도 호출한다');
  assert.equal(calls.banner.length, 0, 'arm===control 이면 개입하지 않는다');
  const e = scoreEvent(calls);
  assert.equal(e.shown, false);
  assert.equal(e.arm, 'control');
});

test('요청 본문에 arm 과 variant 가 함께 실린다', async () => {
  const { p, calls } = harness();
  await p.onTrigger('time15');
  const [, opts] = calls.fetch[0];
  const body = JSON.parse(opts.body);
  assert.equal(body.arm, 'treat');
  assert.equal(body.variant, 'beta_A');
});

test('API 가 죽어도 게임은 진행한다 (fail-open)', async () => {
  const { p, calls } = harness({ fetchImpl: async () => { throw new Error('network down'); } });
  await assert.doesNotReject(() => p.onTrigger('time15'));
  assert.equal(calls.banner.length, 0);
  assert.equal(scoreEvent(calls).failed, true);
});

test('타임아웃이 나도 던지지 않는다', async () => {
  const { p, calls } = harness({
    timeoutMs: 10,
    fetchImpl: (url, opts) => new Promise((_, rej) => {
      opts.signal.addEventListener('abort', () => rej(new Error('aborted')));
    }),
  });
  await assert.doesNotReject(() => p.onTrigger('time15'));
  assert.equal(calls.banner.length, 0);
});

test('intervene=false 면 배너를 안 띄운다', async () => {
  const { p, calls } = harness({
    fetchImpl: async () => ({ ok: true, json: async () => ({ p: 0.1, intervene: false, model_version: 'v1', threshold: 0.5 }) }),
  });
  await p.onTrigger('time15');
  assert.equal(calls.banner.length, 0);
});

test('세션당 노출 상한을 넘지 않는다', async () => {
  const { p, calls } = harness({ maxPerSession: 2 });
  await p.onTrigger('time15');
  await p.onTrigger('quest');
  await p.onTrigger('quest');
  assert.equal(calls.banner.length, 2);
});

test('규칙 판정을 모델과 함께 기록한다 (베이스라인 비교용)', async () => {
  const { p, calls } = harness();
  await p.onTrigger('quest');
  assert.equal(scoreEvent(calls).rule, true);
});

// ── 개입 문구 규칙 ──────────────────────────────────────────
test('미완이 있으면 그걸 먼저 짚는다', () => {
  const b = pickIntervention({ plantedUnwatered: 2, openQuests: 1, buildableHouse: true, doneKinds: [] });
  assert.match(b.line, /물/, '1순위는 심어놓고 물 안 준 것');
});

test('미완이 없으면 안 해본 것을 권한다', () => {
  const b = pickIntervention({ plantedUnwatered: 0, openQuests: 0, buildableHouse: false, doneKinds: ['chop_tree'] });
  assert.ok(b && b.line.length > 0);
});

test('할 게 하나도 없으면 null (배너를 띄우지 않는다)', () => {
  const all = ['chop_tree', 'fish_success', 'harvest', 'cook', 'carve', 'mine'];
  assert.equal(pickIntervention({ plantedUnwatered: 0, openQuests: 0, buildableHouse: false, doneKinds: all }), null);
});
