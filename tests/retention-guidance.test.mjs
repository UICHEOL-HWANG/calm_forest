import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyGuidance,
  createGuidanceCounters,
  createRetentionGuidance,
  eventFamily,
  pickGuidanceBanner,
} from '../js/retention-guidance.js';

test('최근 후반 기능 이벤트를 family 로 묶는다', () => {
  assert.equal(eventFamily('sea_cast'), 'sea_boat');
  assert.equal(eventFamily('boat_start'), 'sea_boat');
  assert.equal(eventFamily('mist_soothe'), 'mist');
  assert.equal(eventFamily('museum_enter'), 'museum');
  assert.equal(eventFamily('cafe_serve'), 'cafe');
  assert.equal(eventFamily('orchard_enter'), 'orchard');
});

test('high tracked + high actions 는 next_content', () => {
  const d = classifyGuidance({ earlyTracked: 22, earlyActions: 6 });
  assert.equal(d.segment, 'next_content');
  assert.equal(d.reason, 'rule_high_play');
});

test('high tracked + low actions 는 first_action_help', () => {
  const d = classifyGuidance({ earlyTracked: 22, earlyActions: 1 });
  assert.equal(d.segment, 'first_action_help');
});

test('rule-low 여도 model score 가 높으면 rescue 한다', () => {
  const d = classifyGuidance({ earlyTracked: 12, earlyActions: 1, modelScore: 0.41 });
  assert.equal(d.segment, 'model_rescue');
  assert.equal(d.reason, 'model_high_rule_low');
});

test('low tracked + no action 은 entry_support', () => {
  const d = classifyGuidance({ earlyTracked: 4, earlyActions: 0 });
  assert.equal(d.segment, 'entry_support');
});

test('next_content 는 최근 도달이 있는 새 콘텐츠 family 를 후보로 고른다', () => {
  const banner = pickGuidanceBanner(
    { eligible: true, segment: 'next_content' },
    { seenFamilies: ['sea_boat'] },
    {}
  );
  assert.equal(banner.kind, 'mist');
});

test('카운터는 시스템/자기 계측 이벤트를 tracked 에 섞지 않는다', () => {
  const c = createGuidanceCounters(0);
  c.record('churn_score');
  c.record('retention_guidance_show');
  c.record('sea_cast');
  const s = c.snapshot(1000);
  assert.equal(s.earlyTracked, 1);
  assert.equal(s.earlyActions, 1);
  assert.deepEqual(s.seenFamilies, ['sea_boat']);
});

test('엔진은 decision/show/dismiss/outcome 을 계측한다', () => {
  let now = 0;
  const events = [];
  const banners = [];
  const rg = createRetentionGuidance({
    now: () => now,
    config: { triggerSec: [], cooldownMs: 0, maxPerSession: 1 },
    track: (name, params) => events.push([name, params]),
    showBanner: b => {
      banners.push(b);
      b.onShow?.();
    },
    gameState: {},
  });

  for (let i = 0; i < 20; i += 1) rg.recordEvent('shop_buy');
  rg.run('manual');
  assert.equal(banners.length, 1);
  assert.ok(events.some(([n]) => n === 'retention_guidance_decision'));
  assert.ok(events.some(([n]) => n === 'retention_guidance_show'));

  now = 1000;
  rg.recordEvent('sea_cast', { platform: 'web' });
  const outcome = events.find(([n]) => n === 'retention_guidance_outcome');
  assert.equal(outcome?.[1].outcome_event, 'sea_cast');
});
