import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_AFFINITY, BLUEPRINTS, blueprintOfNpc, blueprintOfTool, hiddenQuestFor, tier2Status, sanitizeToolFlags } from '../js/tool-blueprints.js';
import { tierOf, TOOL_UPGRADE } from '../js/tool-tiers.js';
import { QUEST_TYPES } from '../js/data/npcs.js';
import { QUEST_LIMITS, questIdFor } from '../js/quests.js';

// 🔨 도구 2단계 — 주민별 전문 도구 도면(친밀도) → 작업대 제작(코인+재료) → 금·흑단·보석 외형
//   dev/active/tool-tiers/ · 사용자 결정(2026-09-24): 주민별 전문 도구 · 친밀도 문턱 6

test('도면은 도구 9종에 하나씩, 주민도 한 명에 하나씩', () => {
  const tools = BLUEPRINTS.map(b => b.tool), npcs = BLUEPRINTS.map(b => b.npc);
  assert.deepEqual([...tools].sort(), Object.keys(TOOL_UPGRADE).sort(), '업그레이드가 있는 도구 9종과 같아야 한다');
  assert.equal(new Set(npcs).size, npcs.length, '한 주민이 도면 둘을 주면 친밀도 하나로 둘이 열린다');
  assert.ok(!npcs.includes('courier'), '🦉 일일 의뢰 올빼미는 체인이 없어 히든 의뢰 자리가 없다');
});

test('히든 의뢰 목표는 게임이 세는 이벤트형 종류이고, 하루 한도가 걸린 종류가 아니다', () => {
  for (const b of BLUEPRINTS) {
    assert.ok(QUEST_TYPES.has(b.quest.type), `${b.npc}: 모르는 목표 ${b.quest.type}`);
    assert.ok(!(b.quest.type in QUEST_LIMITS), `${b.npc}: 하루 한도(${b.quest.type}) 목표는 여러 날 이어져도 오해를 부른다`);
    assert.ok(!b.quest.type.startsWith('collect_'), `${b.npc}: 보유형 목표는 수락 전 재고로 바로 끝난다`);
    assert.ok(b.quest.target >= 10, `${b.npc}: 히든 의뢰는 반복 의뢰보다 커야 한다`);
  }
});

test('제작 비용 — 도구마다 코인 150~300 + 재료, 9종 합계 2,000 안팎', () => {
  let sum = 0;
  for (const b of BLUEPRINTS) {
    assert.ok(b.cost.coins >= 150 && b.cost.coins <= 300, `${b.tool}: ${b.cost.coins}`);
    assert.ok(Object.keys(b.cost).some(k => k !== 'coins'), `${b.tool}: 재료가 없다`);
    sum += b.cost.coins;
  }
  assert.ok(sum >= 1700 && sum <= 2300, `합계 ${sum}`);
});

test('hiddenQuestFor — 문턱 미만·이미 도면 있음·모르는 주민이면 null', () => {
  const b = BLUEPRINTS[0];
  assert.equal(hiddenQuestFor(b.npc, { affinity: HIDDEN_AFFINITY - 1, blueprints: {} }), null);
  assert.equal(hiddenQuestFor(b.npc, { affinity: HIDDEN_AFFINITY, blueprints: { [b.tool]: true } }), null);
  assert.equal(hiddenQuestFor('nobody', { affinity: 99, blueprints: {} }), null);
  const q = hiddenQuestFor(b.npc, { affinity: HIDDEN_AFFINITY, blueprints: {} });
  assert.equal(q.hidden, true); assert.equal(q.tool, b.tool); assert.equal(q.type, b.quest.type);
  assert.ok(q.reward && Number.isFinite(q.reward.coins));
});

test('hiddenQuestFor — 매번 같은 객체 모양(진행도 포인터가 한 의뢰를 가리키게)', () => {
  const b = BLUEPRINTS[1];
  const a1 = hiddenQuestFor(b.npc, { affinity: 9, blueprints: {} }), a2 = hiddenQuestFor(b.npc, { affinity: 9, blueprints: {} });
  assert.deepEqual(a1, a2);
});

test('tier2Status — 도면 없음 → 1단계 필요 → 재료 부족 → 가능 → 보유', () => {
  const b = blueprintOfTool('sickle');
  const rich = { coins: 9999, stone: 99, gem: 9, wood: 99, coal: 9, crop: 99, fish: 99, bug: 99 };
  assert.equal(tier2Status('sickle', { blueprints: {}, upgrades: {}, tier2: {}, inventory: rich }).state, 'noBlueprint');
  assert.equal(tier2Status('sickle', { blueprints: { sickle: true }, upgrades: {}, tier2: {}, inventory: rich }).state, 'needTier1');
  const short = tier2Status('sickle', { blueprints: { sickle: true }, upgrades: { sickle: true }, tier2: {}, inventory: { coins: 1 } });
  assert.equal(short.state, 'short'); assert.ok(short.missing.includes('coins'));
  assert.equal(tier2Status('sickle', { blueprints: { sickle: true }, upgrades: { sickle: true }, tier2: {}, inventory: rich }).state, 'ready');
  assert.equal(tier2Status('sickle', { blueprints: { sickle: true }, upgrades: { sickle: true }, tier2: { sickle: true }, inventory: rich }).state, 'owned');
  assert.equal(b.cost.coins > 0, true);
});

test('tierOf — 2단계를 만들면 2, 1단계만이면 1(주민 도구는 호출부가 0 고정)', () => {
  assert.equal(tierOf('axe', { upgrades: { axe: true }, tier2: { axe: true } }), 2);
  assert.equal(tierOf('axe', { upgrades: { axe: true }, tier2: {} }), 1);
  assert.equal(tierOf('axe', {}), 0);
  assert.equal(tierOf('axe', { tier2: { axe: true } }), 2, '세이브에 2단계가 있으면 1단계 플래그가 빠져도 금빛 그대로');
});

test('sanitizeToolFlags — 아는 도구의 true 만', () => {
  assert.deepEqual(sanitizeToolFlags({ axe: true, hoe: 1, nope: true, rod: false }), { axe: true });
  assert.deepEqual(sanitizeToolFlags(null), {});
});

test('blueprintOfNpc / blueprintOfTool 은 서로 짝', () => {
  for (const b of BLUEPRINTS) {
    assert.equal(blueprintOfNpc(b.npc).tool, b.tool);
    assert.equal(blueprintOfTool(b.tool).npc, b.npc);
  }
});

test('quest_id — 히든 의뢰는 npc:hidden:도구(순번·반복과 안 겹친다)', () => {
  assert.equal(questIdFor({ npcId: 'farmer', idx: 2, hiddenTool: 'sickle' }), 'farmer:hidden:sickle');
});
