// tests/tool-skins.test.mjs — 🪓☂️ 프리미엄 도구 테마 세트(2026-10-02)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLOTS, itemsOf, findItem } from '../js/cosmetics/catalog.js';
import { TOOL_THEMES, SKIN_TOOLS, themeOf, toolSkinOf, umbrellaShown } from '../js/cosmetics/tool-skin-rules.js';
import { TOOL_UPGRADE } from '../js/tool-tiers.js';
import { wardrobeTabVisible } from '../js/cosmetics/wardrobe.js';
import { revealModeOf, revealCardOf, REVEAL_COPY } from '../js/shop/reveal-pose.js';
import { buildPlan } from '../scripts/lib/paddle-seed.mjs';
import { emptyCosmetics, sanitize } from '../js/cosmetics/equip.js';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const owning = (id) => ({ owned: [id], equipped: { ...emptyCosmetics().equipped, tools: id } });

test('🪓 도구 칸 — 테마 세트 3종, 각 ₩5,000 현금 전용', () => {
  assert.ok(SLOTS.includes('tools'));
  const ids = itemsOf('tools').map(i => i.id);
  assert.deepEqual(ids, ['tools_shroom', 'tools_moon', 'tools_bloom']);
  for (const id of ids) {
    const it = findItem(id);
    assert.equal(it.price.won, 5000); assert.equal(it.price.coins, null); assert.equal(it.premium, true);
  }
});

test('테마 = 버섯·달밤·꽃 · 카탈로그 id ↔ 테마', () => {
  assert.deepEqual([...TOOL_THEMES], ['shroom', 'moon', 'bloom']);
  assert.equal(themeOf('tools_moon'), 'moon');
  assert.equal(themeOf('cape'), null);
  assert.equal(themeOf(null), null);
});

test('테마가 입히는 도구 = 손에 드는 도구 9종(업그레이드 표와 같은 집합) · 🌊 릴대는 아님', () => {
  assert.deepEqual([...SKIN_TOOLS].sort(), Object.keys(TOOL_UPGRADE).sort());
  assert.ok(!SKIN_TOOLS.includes('reel'));
});

test('toolSkinOf — 도구 칸에 장착한 세트의 테마, 없으면 null', () => {
  assert.equal(toolSkinOf(owning('tools_bloom')), 'bloom');
  assert.equal(toolSkinOf(emptyCosmetics()), null);
  assert.equal(toolSkinOf(null), null);
});

test('세이브 정제 — 산 세트만 도구 칸에 남는다', () => {
  assert.equal(sanitize(owning('tools_moon')).equipped.tools, 'tools_moon');
  assert.equal(sanitize({ owned: [], equipped: { tools: 'tools_moon' } }).equipped.tools, null);
});

test('☂️ 우산 — 세트를 입고, 비 오는 날, 바깥일 때만', () => {
  assert.equal(umbrellaShown('moon', 'rain', true), true);
  assert.equal(umbrellaShown('moon', 'rain', false), false);   // 실내·카페·박물관·광산
  assert.equal(umbrellaShown('moon', 'snow', true), false);
  assert.equal(umbrellaShown('moon', 'clear', true), false);
  assert.equal(umbrellaShown(null, 'rain', true), false);
});

test('옷장 도구 탭 — 웹 밖에선 산 게 있을 때만(외부 결제 안내 금지)', () => {
  assert.equal(wardrobeTabVisible('tools', emptyCosmetics(), 'toss'), false);
  assert.equal(wardrobeTabVisible('tools', owning('tools_shroom'), 'toss'), true);
  assert.equal(wardrobeTabVisible('tools', emptyCosmetics(), 'web'), true);
});

test('구매 연출 — 도구 세트는 상자 폭발 + 도구 세트 카드', () => {
  assert.equal(revealModeOf({ slot: 'tools' }), 'boxburst');
  const card = revealCardOf({ slot: 'tools' });
  assert.match(card.tag, /도구/);
  assert.equal(revealCardOf({ slot: 'skin' }).tag, 'PREMIUM · 전신 스킨');
  for (const id of ['tools_shroom', 'tools_moon', 'tools_bloom']) assert.ok(REVEAL_COPY[id]?.desc, id);
});

test('Paddle 등록 계획 — 도구 세트 3종이 ₩5,000 으로 들어간다', () => {
  const plan = buildPlan(itemsOf('tools'));
  assert.equal(plan.length, 3);
  for (const p of plan) { assert.equal(p.amount, '5000'); assert.match(p.description, /도구/); }
});

test('price-ids.js 에 세 칸이 있다(값은 사용자가 시드로 채운다)', () => {
  const src = read('../js/shop/price-ids.js');
  for (const id of ['tools_shroom', 'tools_moon', 'tools_bloom']) assert.match(src, new RegExp(`${id}: `));
});

test('게임 배선 — toolMesh 는 테마 인자를 받고(기본 null: 일꾼·릴대 무영향), 손 도구가 테마를 넘긴다', () => {
  const src = gameSource();
  assert.match(src, /function toolMesh\(id, tier = 0, skin = null\)/);
  assert.match(src, /toolMesh\(id, tierOf\(id, gameState\), toolSkinOf\(gameState\.cosmetics\)\)/);
  assert.match(src, /userData\.skin !== toolSkinOf\(gameState\.cosmetics\)/);   // refreshHeldTool 이 테마 변경도 본다
  assert.match(src, /umbrellaShown\(/);
});

test('가게·옷장 탭에 🪓 도구', () => {
  assert.match(read('../js/spaces/cafe.js'), /\['tools', '🪓 도구'\]/);
  assert.match(read('../js/spaces/wardrobe.js'), /\['tools', '🪓 도구'\]/);
});

test('조형 모듈 — 테마 9종 × 3 + 우산, 정점색으로 구워 드로우콜을 줄인다', () => {
  const src = read('../js/cosmetics/tool-skins.js');
  assert.match(src, /export function buildToolSkin\(THREE, theme, toolId\)/);
  assert.match(src, /export function buildUmbrella\(THREE, theme\)/);
  assert.match(src, /mergeGeos/);
  for (const t of ['axe', 'hoe', 'seed', 'water', 'sickle', 'shovel', 'hammer', 'rod', 'net']) assert.match(src, new RegExp(`\\b${t}\\(g\\)`), t);
});

test('i18n — 도구 세트 문구 통문장 등재', () => {
  const en = read('../js/i18n-en.js');
  for (const k of ['🪓 도구', '버섯 숲 세트', '달밤 세트', '꽃정원 세트', 'PREMIUM · 도구 세트', '바로 들어보기',
    ...['tools_shroom', 'tools_moon', 'tools_bloom'].map(id => REVEAL_COPY[id].desc)]) assert.ok(en.includes(`'${k}'`), k);
});
