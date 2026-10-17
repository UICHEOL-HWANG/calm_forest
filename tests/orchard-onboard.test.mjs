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

import { wheatStatus, ONBOARD_HOW } from '../js/orchard-onboard.js';
const W = { id: 'wheat', adv: true, waters: 2 };
const plot = (o) => ({ cropType: W, state: 'growing', growth: 0.1, wetUntil: 0, fert: false, weed: false, ...o });

test('밀 상태 — 다 자란 밀이 있으면 거두기가 먼저', () => {
  const s = wheatStatus([plot({}), plot({ state: 'mature', growth: 0.9 })], 100, { upgraded: false });
  assert.equal(s.kind, 'ready');
});

test('밀 상태 — 마른 밀은 물 줄 차례, 남은 물 횟수를 센다', () => {
  const s = wheatStatus([plot({ growth: 0.2 })], 100, { upgraded: false });
  assert.equal(s.kind, 'dry');
  assert.equal(s.watersLeft, 3);
});

test('밀 상태 — 방금 물 준 밀은 기다리는 중', () => {
  const s = wheatStatus([plot({ wetUntil: 105 })], 100, { upgraded: false });
  assert.equal(s.kind, 'wet');
});

test('밀 상태 — 잡초·시듦·심은 밀 없음', () => {
  assert.equal(wheatStatus([plot({ weed: true })], 100, { upgraded: false }).kind, 'weed');
  assert.equal(wheatStatus([plot({ state: 'wilted' })], 100, { upgraded: false }).kind, 'wilted');
  assert.equal(wheatStatus([{ cropType: { id: 'carrot' }, state: 'growing' }], 100, { upgraded: false }).kind, 'none');
  assert.equal(wheatStatus([], 100, { upgraded: false }).kind, 'none');
});

test('안내 문구 — 어디서·무슨 도구로·무엇을, 상태마다 다르다', () => {
  const g = (status) => onboardView('grow', status).how;
  assert.equal(onboardView('plant').how, ONBOARD_HOW.plant);
  assert.match(ONBOARD_HOW.plant, /텃밭.*씨앗\(3번\).*밀/);
  assert.equal(g({ kind: 'dry', watersLeft: 3 }), ONBOARD_HOW.dry.replace('{0#}', '3'));
  assert.match(ONBOARD_HOW.dry, /텃밭.*물조리개\(4번\)/);
  assert.match(g({ kind: 'ready' }), /낫\(5번\)/);
  assert.match(g({ kind: 'weed' }), /잡초/);
  assert.match(g({ kind: 'wilted' }), /괭이\(2번\)/);
  assert.equal(g({ kind: 'none' }), ONBOARD_HOW.plant);
  assert.equal(g(undefined), ONBOARD_HOW.plant);
  const keys = new Set(Object.values(ONBOARD_HOW));
  assert.equal(keys.size, Object.keys(ONBOARD_HOW).length);
});

test('영어판 — 과수원 안내 문구가 전부 있다', async () => {
  const { readFileSync } = await import('node:fs');
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const k of Object.values(ONBOARD_HOW)) assert.ok(en.includes(`'${k}':`), k);
});

test('비 오는 날 — 흙이 안 마르고 저절로 자라므로 물 대신 기다리라고 한다', () => {
  const s = wheatStatus([plot({ wetUntil: 101.5 })], 100, { upgraded: false, rain: true });
  assert.equal(s.kind, 'rain');
  assert.match(onboardView('grow', s).how, /비/);
  assert.equal(wheatStatus([plot({ state: 'mature', growth: 0.9 })], 100, { upgraded: false, rain: true }).kind, 'ready');
  assert.equal(wheatStatus([plot({ weed: true })], 100, { upgraded: false, rain: true }).kind, 'weed');
});

// 🔓 마을 해금 — 농부가 아직 안 돌아왔을 때 첫 수확 → 🦉 올빼미가 1장 다음 걸음을 알려 준다
test('owlNextLine: 집이 덜 지어졌으면 집, 다 지었으면 다리', async () => {
  const { owlNextLine, OWL_NEXT_LINES } = await import('../js/orchard-onboard.js');
  assert.equal(owlNextLine(0), OWL_NEXT_LINES.house);
  assert.equal(owlNextLine(2), OWL_NEXT_LINES.house);
  assert.equal(owlNextLine(3), OWL_NEXT_LINES.bridge);
  assert.equal(owlNextLine(undefined), OWL_NEXT_LINES.house);
});

test('owlCanShow: 환영 모달 전·모달 위에서는 미룬다', async () => {
  const { owlCanShow } = await import('../js/orchard-onboard.js');
  assert.equal(owlCanShow({ tutorialSeen: false, modalOpen: false }), false);
  assert.equal(owlCanShow({ tutorialSeen: true, modalOpen: true }), false);
  assert.equal(owlCanShow({ tutorialSeen: true, modalOpen: false }), true);
});

test('환영 모달 건너뛰기도 미뤄 둔 올빼미·과수원 의뢰를 다시 부른다', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const skip = html.slice(html.indexOf("$('tut-skip').addEventListener"), html.indexOf("$('coach-skip').addEventListener"));
  assert.match(skip, /orchardQuestAfterTutorial/);
  const src = readFileSync(new URL('../js/spaces/orchard-actions.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('function owlNextStep'), src.indexOf('hs.owlAfterHarvest = true'));
  assert.match(fn, /owlCanShow\(/);
});
