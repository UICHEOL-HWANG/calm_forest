// 🧪 E1 첫 5분 수확 실험 — 배정·대상·기록·경제 규칙(js/exp-e1.js, 순수 함수)
//   사전등록: analytics/metrics-framework 브랜치 dev/active/metrics-framework/first5min-harvest-experiment-prereg.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMS, ACQ_EVENTS, E1_PLATFORMS, E1_PLOTS, E1_SPAWN, NEW_KINDS,
  E1_BUBBLE_EMOJI, E1_INTRO_BUTTONS, armFor, decideE1, e1IntroCards, parseStored, sanitizeE1, seedCoinValue, shouldSeed, withExpArm,
} from '../js/exp-e1.js';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';
import { GA_PARAM_LIMIT, overParamLimit } from '../js/ga-params.js';

// ⚠️ js/data/catalog.js 는 three 를 import 해서 Node 로 못 읽는다 — 원문에서 기본 작물 단가만 뽑는다
const CATALOG = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8');
const SELL_PRICE = { crop: Number(/export const SELL_PRICE = \{[^}]*\bcrop: (\d+)/.exec(CATALOG)[1]) };

const ids = (n, p = 'c-') => Array.from({ length: n }, (_, i) => `${p}${i.toString(36)}-${(i * 2654435761 >>> 0).toString(16)}`);
const share = (xs, f) => xs.filter(f).length / xs.length;
// js/i18n.js assignVariant 의 해시(h&1) — 옛 A/B 와 상관이 없어야 한다
const oldVariant = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; return h & 1; };

test('같은 기기·플랫폼은 언제나 같은 무리', () => {
  for (const id of ids(200)) for (const p of E1_PLATFORMS) assert.equal(armFor(id, p), armFor(id, p));
  for (const id of ids(50)) assert.ok(ARMS.includes(armFor(id, 'web')));
});

test('플랫폼별로 따로 50:50 (층화)', () => {
  const xs = ids(20000);
  for (const p of E1_PLATFORMS) {
    const r = share(xs, id => armFor(id, p) === 'harvest_start');
    assert.ok(r > 0.485 && r < 0.515, `${p} 처치 비율 ${r}`);
  }
  // 플랫폼마다 솔트가 달라 같은 id 라도 두 플랫폼 배정은 서로 독립
  const agree = share(xs, id => armFor(id, 'web') === armFor(id, 'toss'));
  assert.ok(agree > 0.48 && agree < 0.52, `web·toss 일치율 ${agree}`);
});

test('옛 A/B(assignVariant)와 독립', () => {
  const xs = ids(20000);
  const agree = share(xs, id => (armFor(id, 'web') === 'harvest_start') === (oldVariant(id) === 1));
  assert.ok(agree > 0.48 && agree < 0.52, `variant 와 일치율 ${agree}`);
});

test('신규(세이브 없음)만 등록 — 모든 신규 부팅 경로', () => {
  for (const loadKind of NEW_KINDS) {
    const d = decideE1({ clientId: 'c-x', platform: 'web', loadKind, saved: null, stored: null });
    assert.equal(d.enrolled, true, loadKind);
    assert.equal(d.first, true, loadKind);
    assert.equal(d.fresh, true, loadKind);
    assert.equal(d.arm, armFor('c-x', 'web'));
  }
});

test('기존 세이브가 있으면 등록하지 않는다 → 기존 유저는 아무것도 안 바뀐다', () => {
  const saved = { inventory: { coins: 120 }, tutorialSeen: true };
  for (const id of ids(300)) {
    const d = decideE1({ clientId: id, platform: 'web', loadKind: 'loaded', saved, stored: null });
    assert.equal(d.enrolled, false);
    assert.equal(d.arm, null);
    assert.equal(shouldSeed(d, saved.e1), false);
  }
});

test('배정 해시는 어떤 부팅 경로에서도 먼저 계산된다(옛 variant 사고 방지)', () => {
  // 옛 사고: detectLang() 이 assignVariant() 전에 return 해서 두 무리가 같은 화면을 봤다.
  //   decideE1 은 분기 전에 해시를 구하고, 결과에 그대로 싣는다 — 어느 경로든 hashed 가 있다.
  const kinds = [...NEW_KINDS, 'loaded', 'failed', undefined];
  const platforms = ['web', 'toss', 'itch', 'android', 'ios', undefined];
  for (const loadKind of kinds) for (const platform of platforms) {
    for (const saved of [null, { inventory: {} }]) {
      const d = decideE1({ clientId: 'c-path', platform, loadKind, saved, stored: null });
      assert.ok(ARMS.includes(d.hashed), `${loadKind}/${platform}`);
      assert.equal(typeof d.reason, 'string');
    }
  }
});

test('웹·토스만 — 앱·itch 는 등록 안 함', () => {
  for (const platform of ['itch', 'android', 'ios']) {
    const d = decideE1({ clientId: 'c-x', platform, loadKind: 'empty', saved: null, stored: null });
    assert.equal(d.enrolled, false, platform);
    assert.equal(d.reason, 'platform');
  }
});

test('재방문은 같은 무리 — 기기 기록·세이브 기록', () => {
  const arm = 'harvest_start';
  // 첫 저장 전에 나갔다 돌아온 같은 기기(세이브 없음) — 기기 기록의 무리를 그대로(해시가 달라져도)
  const byDevice = decideE1({ clientId: 'c-any', platform: 'web', loadKind: 'empty', saved: null, stored: { arm, platform: 'web' } });
  assert.deepEqual([byDevice.enrolled, byDevice.arm, byDevice.first], [true, arm, false]);
  const bySave = decideE1({ clientId: 'c-other', platform: 'toss', loadKind: 'loaded', saved: { e1: { arm: 'control' } }, stored: null });
  assert.deepEqual([bySave.enrolled, bySave.arm, bySave.first], [true, 'control', false]);
  // 재방문엔 밭을 다시 깔지 않는다
  assert.equal(shouldSeed(byDevice, { arm, seeded: true }), false);
});

test('QA 강제(?e1=) 는 유효한 무리만', () => {
  assert.equal(decideE1({ clientId: 'c', platform: 'web', loadKind: 'empty', forced: 'harvest_start' }).arm, 'harvest_start');
  assert.equal(decideE1({ clientId: 'c', platform: 'web', loadKind: 'empty', forced: 'bogus' }).arm, armFor('c', 'web'));
});

test('기기 기록 파싱은 낯선 값을 버린다', () => {
  assert.deepEqual(parseStored(JSON.stringify({ arm: 'control', platform: 'web' })), { arm: 'control', platform: 'web' });
  for (const bad of [null, '', '{', '{"arm":"x"}', '[]', '42']) assert.equal(parseStored(bad), null);
});

test('처치 밭은 처치 무리의 신규에게 한 번만', () => {
  const d = (arm, fresh = true) => ({ enrolled: true, arm, first: fresh, fresh });
  assert.equal(shouldSeed(d('harvest_start'), undefined), true);
  assert.equal(shouldSeed(d('control'), undefined), false);
  assert.equal(shouldSeed(d('harvest_start'), { seeded: true }), false);
  assert.equal(shouldSeed({ enrolled: false, arm: null, first: false }, undefined), false);
});

test('경제 가드레일 — 처음 주는 밭은 작고 코인 가치가 작다', () => {
  assert.equal(E1_PLOTS.length, 4);
  // 짝수 격자(tryHoe 와 같은 규칙) · 겹치지 않음
  for (const [x, z] of E1_PLOTS) assert.ok(x % 2 === 0 && z % 2 === 0);
  assert.equal(new Set(E1_PLOTS.map(String)).size, E1_PLOTS.length);
  const coins = seedCoinValue(SELL_PRICE);
  assert.ok(coins <= 30, `처치 밭 판매가 ${coins}🪙 — 상인 환영 거래(30)를 넘지 않는다`);
});

test('첫 안내는 월드 말풍선 이모지 하나 — 글자 문구 없음(사용자 결정: 월드 말풍선은 이모지만)', () => {
  assert.equal([...new Intl.Segmenter().segment(E1_BUBBLE_EMOJI)].length, 1, '이모지 한 글자');
  assert.doesNotMatch(E1_BUBBLE_EMOJI, /[가-힣A-Za-z]/);
  assert.equal(EN['👆 눌러서 수확하기'], undefined, '옛 글자 문구는 사전에서도 뺀다');
});

test('획득 행동 16종(정의서 §2)', () => {
  assert.equal(ACQ_EVENTS.length, 16);
  for (const e of ['harvest_crop', 'fishing_catch', 'craft_item', 'quest_complete', 'duel_result']) assert.ok(ACQ_EVENTS.includes(e));
});

test('exp_arm 은 획득 이벤트에만, 한도 안에서만 붙고 원본은 그대로', () => {
  const p = { crop: 3, ts: 1, platform: 'web' };
  const out = withExpArm('harvest_crop', p, 'harvest_start');
  assert.equal(out.exp_arm, 'harvest_start');
  assert.equal(p.exp_arm, undefined, '원본 불변');
  assert.equal(withExpArm('chop_tree', p, 'control').exp_arm, undefined);
  assert.equal(withExpArm('harvest_crop', p, null).exp_arm, undefined);
  const full = Object.fromEntries(Array.from({ length: GA_PARAM_LIMIT }, (_, i) => [`k${i}`, i]));
  const kept = withExpArm('cooking_result', full, 'control');
  assert.equal(overParamLimit(kept), 0, '25개가 찬 이벤트에 붙여서 다른 값을 밀어내지 않는다');
  assert.equal(kept.exp_arm, undefined);
});

test('시작 자리에서 첫 액션이 곧 수확이다(자동 수확 반경 안)', () => {
  // 2026-10-12 실기: (1, 1.8) 은 가장 가까운 밭까지 2.06 — 반경 1.8 밖이라 첫 Space 가 괭이로 새 밭을 갈았다
  const FARM_AUTO = readFileSync(new URL('../js/spaces/farm-auto.js', import.meta.url), 'utf8');
  const R = Number(/export const FARM_AUTO_R = ([\d.]+)/.exec(FARM_AUTO)[1]);
  const d = Math.min(...E1_PLOTS.map(([x, z]) => Math.hypot(x - E1_SPAWN[0], z - E1_SPAWN[1])));
  assert.ok(d < R - 0.2, `시작 자리 → 가장 가까운 밭 ${d.toFixed(2)} (반경 ${R})`);
});

test('리뷰 H1 — 첫 저장 전에 나간 처치 신규는 다음 접속에서 밭을 받는다(로그상 first 는 0)', () => {
  const d = decideE1({ clientId: 'c', platform: 'web', loadKind: 'empty', saved: null, stored: { arm: 'harvest_start', platform: 'web' } });
  assert.deepEqual([d.enrolled, d.arm, d.first, d.fresh], [true, 'harvest_start', false, true]);
  assert.equal(shouldSeed(d, undefined), true);
});

test('리뷰 H2 — 기기 기록이 있어도 e1 없는 기존 세이브면 등록하지 않는다', () => {
  const d = decideE1({ clientId: 'c', platform: 'web', loadKind: 'loaded', saved: { inventory: {} }, stored: { arm: 'control', platform: 'web' } });
  assert.deepEqual([d.enrolled, d.reason], [false, 'existing']);
});

test('리뷰 M3 — offline 은 세이브가 없는지 모르므로 신규로 보지 않는다', () => {
  assert.ok(!NEW_KINDS.includes('offline'));
  assert.equal(decideE1({ clientId: 'c', platform: 'web', loadKind: 'offline' }).enrolled, false);
});

test('리뷰 M4 — dev 세션은 강제(?e1=)가 아니면 등록하지 않고, 강제여도 기존 세이브엔 밭을 깔지 않는다', () => {
  assert.deepEqual(Object.values((({ enrolled, reason }) => ({ enrolled, reason }))(decideE1({ clientId: 'c', platform: 'web', loadKind: 'empty', dev: true }))), [false, 'dev']);
  const forcedExisting = decideE1({ clientId: 'c', platform: 'web', loadKind: 'loaded', saved: { inventory: {} }, forced: 'harvest_start', dev: true });
  assert.equal(forcedExisting.enrolled, true);
  assert.equal(shouldSeed(forcedExisting, undefined), false);
});

test('개정 1 — 처치 시작 안내 카드 3장(문구 A, 2026-10-12 확정) · 영어 사전', () => {
  const touch = e1IntroCards(true), pc = e1IntroCards(false);
  assert.equal(touch.length, 3);
  assert.deepEqual(touch.map(c => [c.ico, c.title, c.sub]), [
    ['🌾', '여기는 당신의 텃밭이에요', '당근이 벌써 다 자랐어요'],
    ['🕹️', '왼쪽으로 걷고, 오른쪽 버튼으로 해요', ''],
    ['🥕', '첫 수확을 해 볼까요?', '거둔 작물로 마을을 키워요'],
  ]);
  assert.equal(pc[1].title, 'WASD로 걷고, Space·클릭으로 해요');
  assert.deepEqual(E1_INTRO_BUTTONS, { next: '다음', start: '시작하기 🌱' });
  const strings = [...touch, ...pc].flatMap(c => [c.title, c.sub]).filter(Boolean).concat(Object.values(E1_INTRO_BUTTONS));
  for (const k of strings) assert.ok(EN[k], `영어 사전에 '${k}'`);
});

test('세이브 왕복 — 안내 카드를 봤는지(intro)도 남는다', () => {
  assert.deepEqual(sanitizeE1({ arm: 'harvest_start', seeded: true, harvested: false, intro: true }), { arm: 'harvest_start', seeded: true, harvested: false, intro: true });
  assert.equal(sanitizeE1({ arm: 'control' }).intro, false);
});
