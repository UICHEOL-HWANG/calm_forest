// 🌾→🍎 과수원 온보딩 의뢰 — 규칙(js/orchard-onboard.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARD_SEEDS, shouldOffer, afterAdvPlant, afterUnlock, needsRefill, onboardView, restoreStage,
} from '../js/orchard-onboard.js';

test('처음 기본 작물을 거둔 유저에게만 의뢰를 건다', () => {
  assert.equal(shouldOffer({}), true);
  assert.equal(shouldOffer({ advHarvest: 0 }), true);
  assert.equal(shouldOffer(undefined), true);
});

test('이미 과수원이 열렸으면(고급 작물을 거둔 적 있으면) 걸지 않는다', () => {
  assert.equal(shouldOffer({ advHarvest: 1 }), false);
  assert.equal(shouldOffer({ advHarvest: 3 }), false);
});

test('한 번 건 의뢰는 다시 걸지 않는다 — 진행 중이든 끝났든', () => {
  for (const s of ['plant', 'grow', 'done']) assert.equal(shouldOffer({ orchardQuest: s }), false, s);
});

test('밀 씨앗 3개를 준다 — 인벤 키는 상점과 같은 seed_wheat', () => {
  assert.deepEqual(ONBOARD_SEEDS, { seed_wheat: 3 });
});

test('고급 씨앗을 심으면 plant → grow, 다른 단계는 그대로', () => {
  assert.equal(afterAdvPlant('plant'), 'grow');
  assert.equal(afterAdvPlant('grow'), 'grow');
  assert.equal(afterAdvPlant('done'), 'done');
  assert.equal(afterAdvPlant(undefined), undefined);
});

test('해금되면 진행 중 의뢰는 done — 의뢰를 안 받은 유저는 건드리지 않는다', () => {
  assert.equal(afterUnlock('plant'), 'done');   // 일꾼이 먼저 거둬도 끝난다
  assert.equal(afterUnlock('grow'), 'done');
  assert.equal(afterUnlock('done'), 'done');
  assert.equal(afterUnlock(undefined), undefined);
});

test('심기 전에 고급 씨앗을 다 팔았으면 한 번만 다시 준다', () => {
  const empty = { seed_wheat: 0, seed_corn: 0, seed_grape: 0 };
  assert.equal(needsRefill({ orchardQuest: 'plant' }, empty), true);
  assert.equal(needsRefill({ orchardQuest: 'plant', orchardRefill: true }, empty), false, '두 번째는 없다');
  assert.equal(needsRefill({ orchardQuest: 'plant' }, { seed_corn: 1 }), false, '다른 고급 씨앗이라도 있으면 된다');
  assert.equal(needsRefill({ orchardQuest: 'grow' }, empty), false, '이미 심었으면 필요 없다');
  assert.equal(needsRefill({}, empty), false);
});

test('패널 카드 — 단계마다 할 일이 바뀌고, 끝났거나 안 받았으면 없다', () => {
  assert.equal(onboardView(undefined), null);
  assert.equal(onboardView('done'), null);
  const p = onboardView('plant'), g = onboardView('grow');
  for (const v of [p, g]) {
    assert.equal(v.id, 'orchard_onboard');
    assert.equal(v.target, 2, '심기 → 거두기 두 걸음');
    assert.ok(v.progress < v.target, '패널에서 ✅완료(주민에게 가기)로 보이면 안 된다 — 끝나면 카드가 사라진다');
  }
  assert.equal(p.progress, 0);
  assert.equal(g.progress, 1, '심고 나면 막대가 반쯤 찬다 — "0 / 1" 로 멈춰 있으면 고장난 카운터로 읽힌다');
  assert.match(p.desc, /심기/);
  assert.match(g.desc, /거두기/);
  assert.notEqual(p.desc, g.desc);
});

test('세이브 복원 — 모르는 값은 버리고, 이미 열린 과수원의 진행 중 의뢰는 done 으로 닫는다', () => {
  assert.equal(restoreStage('plant', 0), 'plant');
  assert.equal(restoreStage('grow', 0), 'grow');
  assert.equal(restoreStage('done', 1), 'done');
  assert.equal(restoreStage('plant', 1), 'done', '다른 경로로 열렸는데 카드가 영영 남으면 안 된다');
  assert.equal(restoreStage('grow', 2), 'done');
  assert.equal(restoreStage('bogus', 0), undefined);
  assert.equal(restoreStage(undefined, 0), undefined, '없는 세이브는 비운다 — 다른 계정 상태가 새지 않게');
});
