import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COS_STAGES, COS_REWARD, shouldOffer, afterVisit, afterBuy, cosOnboardView, restoreStage, COS_LINES, COS_HOW,
} from '../js/cos-onboard.js';

test('튜토리얼을 마치고 꾸미기가 하나도 없는 유저에게만 건다', () => {
  assert.equal(shouldOffer({ tutorialSeen: true, owned: [] }), true);
  assert.equal(shouldOffer({ tutorialSeen: false, owned: [] }), false);
  assert.equal(shouldOffer({ tutorialSeen: true, owned: ['scarf'] }), false);
  assert.equal(shouldOffer({ tutorialSeen: true }), true);
});

test('한 번 건 의뢰는 다시 걸지 않는다', () => {
  for (const s of COS_STAGES) assert.equal(shouldOffer({ tutorialSeen: true, owned: [], stage: s }), false, s);
});

test('가게를 열면 visit → buy, 다른 단계는 그대로', () => {
  assert.equal(afterVisit('visit'), 'buy');
  assert.equal(afterVisit('buy'), 'buy');
  assert.equal(afterVisit('done'), 'done');
  assert.equal(afterVisit(undefined), undefined);
});

test('꾸미기를 사면 진행 중 의뢰는 done · 안 받은 유저는 그대로', () => {
  assert.equal(afterBuy('visit'), 'done');
  assert.equal(afterBuy('buy'), 'done');
  assert.equal(afterBuy('done'), 'done');
  assert.equal(afterBuy(undefined), undefined);
});

test('의뢰 카드 — 두 걸음, 끝나면 사라진다', () => {
  const v = cosOnboardView('visit');
  assert.equal(v.id, 'cos_onboard');
  assert.equal(v.title, '🎀 꾸미기 가게 구경하기');
  assert.deepEqual([v.progress, v.target], [0, 2]);
  assert.equal(v.how, COS_HOW.visit);
  assert.equal(cosOnboardView('buy').progress, 1);
  assert.equal(cosOnboardView('done'), null);
  assert.equal(cosOnboardView(undefined), null);
});

test('복원 — 모르는 값은 버리고, 이미 꾸미기가 있으면 done', () => {
  assert.equal(restoreStage('weird', 0), undefined);
  assert.equal(restoreStage('visit', 0), 'visit');
  assert.equal(restoreStage('buy', 2), 'done');
  assert.equal(restoreStage(undefined, 3), undefined);
});

test('보상은 작다 · 문구에 엠대시가 없다', () => {
  assert.ok(COS_REWARD > 0 && COS_REWARD <= 50);
  for (const t of [...Object.values(COS_LINES), ...Object.values(COS_HOW)]) assert.ok(!t.includes('—'), t);
});

test('튜토리얼 끝·가게 열기·코인 구매·현금 구매에 의뢰가 이어져 있다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const end = html.slice(html.indexOf('function endCoach'), html.indexOf('function endCoach') + 1500);
  assert.match(end, /cosQuestAfterTutorial/);
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /noteCosQuestVisit\(\)/);
  const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
  assert.equal((cafe.match(/noteCosQuestBuy\(/g) || []).length >= 2, true);
});

test('다른 경로(환영 상자·설산 카페·지연 지급)로 꾸미기를 얻어도 매 프레임 확인으로 의뢰가 끝난다', () => {
  const src = readFileSync(new URL('../js/spaces/cos-quest.js', import.meta.url), 'utf8');
  const upd = src.slice(src.indexOf('export function updateCosQuestBubble'));
  assert.match(upd, /cosQuestActive\(\) && owned\.length > 0\) noteCosQuestBuy\(/);
});

test('의뢰 문구는 영어 사전에 있다', () => {
  const src = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const t of [COS_LINES.offer, COS_LINES.done, COS_HOW.visit, COS_HOW.buy, '🎀 꾸미기 가게 구경하기', '🎀 꾸미기 가게 들르기', '🌱 첫 꾸미기 달기']) {
    assert.ok(src.includes(`'${t}'`), t);
  }
});
