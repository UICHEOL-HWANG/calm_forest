import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyGuidance,
  createGuidanceCounters,
  createRetentionGuidance,
  buildRetentionModelFeatures,
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

test('VM으로 보낼 raw 모델 피처를 카운터에서 만든다', () => {
  const c = createGuidanceCounters(0);
  c.record('chop_tree');
  c.record('mine_ore');
  c.record('npc_talk');
  c.record('sea_cast');
  c.record('shop_buy');
  c.record('tutorial_step_open');
  const f = buildRetentionModelFeatures(c.snapshot(1000));
  assert.equal(f.early_tracked_events, 6);
  assert.equal(f.early_actions, 5);
  assert.equal(f.early_action_kinds, 5);
  assert.equal(f.early_area_count, 4);
  assert.equal(f.early_chop_tree_events, 1);
  assert.equal(f.early_mine_ore_events, 1);
  assert.equal(f.early_npc_talk_events, 1);
  assert.equal(f.early_fishing_sea_events, 1);
  assert.equal(f.early_econ_tx_events, 1);
  assert.equal(f.early_tutorial_step_events, 1);
});

test('엔진은 decision/show/dismiss/outcome 을 계측한다', async () => {
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
  await rg.run('manual');
  assert.equal(banners.length, 1);
  assert.ok(events.some(([n]) => n === 'retention_guidance_decision'));
  assert.ok(events.some(([n]) => n === 'retention_guidance_show'));

  now = 1000;
  rg.recordEvent('sea_cast', { platform: 'web' });
  const outcome = events.find(([n]) => n === 'retention_guidance_outcome');
  assert.equal(outcome?.[1].outcome_event, 'sea_cast');
});

test('rule-low 구간은 VM 모델 점수로 rescue 할 수 있다', async () => {
  const events = [];
  const banners = [];
  const rg = createRetentionGuidance({
    now: () => 0,
    config: { triggerSec: [], cooldownMs: 0, maxPerSession: 1 },
    modelScore: async () => 0.62,
    track: (name, params) => events.push([name, params]),
    showBanner: b => banners.push(b),
    gameState: {},
  });

  rg.recordEvent('shop_buy');
  await rg.run('manual');
  assert.equal(banners.length, 1);
  const decision = events.find(([n]) => n === 'retention_guidance_decision')?.[1];
  assert.equal(decision.rule_segment, 'model_rescue');
  assert.equal(decision.model_score, 0.62);
});

test('모델 점수와 raw feature 스냅샷을 Supabase 적립 row 로 넘긴다', async () => {
  const rows = [];
  const rg = createRetentionGuidance({
    now: () => 0,
    config: { triggerSec: [], cooldownMs: 0, maxPerSession: 1 },
    modelScore: async () => 0.62,
    persistScore: row => rows.push(row),
    track: () => {},
    showBanner: () => {},
    gameState: {},
  });

  rg.recordEvent('shop_buy');
  await rg.run('manual');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rule_segment, 'model_rescue');
  assert.equal(rows[0].final_eligible, true);
  assert.equal(rows[0].model_score, 0.62);
  assert.equal(rows[0].raw_features.early_tracked_events, 1);
  assert.equal(rows[0].raw_features.early_econ_tx_events, 1);
});
