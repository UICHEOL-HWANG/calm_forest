import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findItem, itemsOf } from '../js/cosmetics/catalog.js';
import { themeOf, toolSkinOf, SKIN_TOOLS } from '../js/cosmetics/tool-skin-rules.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';
import { REVEAL_COPY } from '../js/shop/reveal-pose.js';
import { SHOP_COPY } from '../scripts/lib/shop-copy.mjs';
import { FX_IDS, spawnBubble, particleStep } from '../js/cosmetics/trail-fx.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const THEMES = ['maple', 'frost', 'honey', 'kitty', 'shell'];
const DECOS = { acorn_cap: ['head', 3500], bee_band: ['head', 3500], kitty_pack: ['back', 4500], nest_pack: ['back', 4500], maple_trail: ['trail', 4000], bubble_trail: ['trail', 4000] };
const ALL = [...THEMES.map(t => `tools_${t}`), ...Object.keys(DECOS)];

test('2차 도구 세트 5종: 현금 전용 ₩5,000, 카탈로그 id 와 테마가 맞물린다', () => {
  for (const t of THEMES) {
    const it = findItem(`tools_${t}`);
    assert.equal(it.slot, 'tools'); assert.equal(it.price.won, 5000); assert.equal(it.price.coins, null); assert.equal(it.premium, true);
    assert.equal(themeOf(it.id), t);
    assert.equal(toolSkinOf({ equipped: { tools: it.id } }), t);
  }
});

test('2차 꾸미기 6종: 슬롯·가격·등 앵커', () => {
  for (const [id, [slot, won]] of Object.entries(DECOS)) {
    const it = findItem(id);
    assert.equal(it.slot, slot, id); assert.equal(it.price.won, won, id); assert.equal(it.premium, true, id);
    if (slot === 'back') assert.equal(it.anchor, 'back', id);
    if (slot === 'head') assert.equal(it.earSafe, 'low', id);
  }
  assert.ok(!itemsOf('trail').some(i => i.sale && Object.keys(DECOS).includes(i.id)));
});

test('2차 품목 전부: 가격표 칸·구매 연출 문구·상점 설명이 있고, 문구에 엠대시가 없다', () => {
  for (const id of ALL) {
    assert.ok(id in PRICE_IDS, id);
    assert.ok(REVEAL_COPY[id]?.name && REVEAL_COPY[id]?.desc, id);
    assert.ok(SHOP_COPY[id], id);
    assert.ok(!/—/.test(REVEAL_COPY[id].desc + SHOP_COPY[id]), id);
  }
});

test('테마 파일마다 도구 9종 전부와 우산 정의가 있고 tool-skins.js 가 펼친다', () => {
  const ts = read('js/cosmetics/tool-skins.js');
  for (const t of THEMES) {
    const src = read(`js/cosmetics/tool-skins-${t}.js`);
    assert.match(src, new RegExp(`export function ${t}Themes\\(THREE, K, X\\)`));
    assert.match(src, new RegExp(`export const ${t.toUpperCase()}_UMBRELLA`));
    for (const tool of SKIN_TOOLS) assert.match(src, new RegExp(`\\n    ${tool}\\(g\\) \\{`), `${t}.${tool}`);
    assert.match(ts, new RegExp(`${t}Themes`));
    assert.match(ts, new RegExp(`${t}: ${t.toUpperCase()}_UMBRELLA`));
  }
  assert.match(ts, /\.\.\.extraThemes\(THREE, K\)/);
});

test('꾸미기 조형이 art.js 표에 등록되고, 발자국은 trail.js 자국을 가진다', () => {
  const art = read('js/cosmetics/art.js'), trail = read('js/cosmetics/trail.js');
  for (const [id, fn] of [['acorn_cap', 'buildAcornCap'], ['bee_band', 'buildBeeBand'], ['kitty_pack', 'buildKittyPack'], ['nest_pack', 'buildNestPack']])
    assert.match(art, new RegExp(`${id}: \\(g, k\\) => ${fn}\\(THREE, g, k, h\\)`));
  for (const id of ['maple_trail', 'bubble_trail']) assert.match(trail, new RegExp(`${id}: \\(g, s, o\\) =>`));
});

test('비눗방울은 입자로 떠오르고, 단풍잎은 바닥 자국만 남긴다', () => {
  assert.ok(FX_IDS.includes('bubble_trail'));
  assert.ok(!FX_IDS.includes('maple_trail'));
  const b = spawnBubble({ x: 0, y: 0, z: 0 }, () => 0.5, 0x9fd4f0);
  const n = particleStep(b, 0.5);
  assert.ok(n.y > b.y);
  assert.equal(particleStep(b, b.life + 0.1), null);
});

test('SQL 프리미엄 가드에 2차 품목이 전부 들어 있다', () => {
  const sql = read('sql/migrations/migrate_premium_sets_2.sql');
  for (const id of ALL) assert.match(sql, new RegExp(`'${id}'`), id);
});
