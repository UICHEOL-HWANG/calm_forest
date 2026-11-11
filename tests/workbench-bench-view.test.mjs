import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costRows, toolView, outView, giftView, carveView, pickSel, allItems } from '../js/workbench/bench-view.js';
import { benchSteps } from '../js/onboarding/bench-steps.js';

const UPG = [
  { id: 'rod', ico: '🎣', name: '튼튼한 낚싯대', desc: '입질 여유', cost: { wood: 5 } },
  { id: 'axe', ico: '🪓', name: '강철 도끼', desc: '나무를 2번에 벨 수 있어요', cost: { wood: 20, crop: 3 } },
  { id: 'net', ico: '🦋', name: '촘촘한 포충망', desc: '포획 +18%', cost: { wood: 12, bug: 4 } },
];
const star = (tool, s, check) => ({ tool, name: tool, ico: '🎣', owned: true, star: s, effects: [2.6, 3.0, 3.4, 3.8], check });
const calm = { severe: null };

test('costRows marks what is short', () => {
  assert.deepEqual(costRows({ wood: 10, crop: 3 }, { wood: 12, crop: 1 }), [
    { k: 'wood', need: 10, have: 12, lack: false },
    { k: 'crop', need: 3, have: 1, lack: true },
  ]);
  assert.deepEqual(costRows(undefined, {}), []);
});

test('toolView splits owned tools from ones to make', () => {
  const v = toolView({
    upgrades: UPG, owned: { rod: true }, inv: { wood: 30, crop: 1, coins: 200, fish: 9 }, tier2: [], weather: calm,
    stars: [star('rod', 0, { state: 'ready', next: 1, cost: { coins: 120, fish: 4 }, missing: [] })],
  });
  assert.deepEqual(v.groups.map(g => g.key), ['mine', 'make']);
  const rod = v.groups[0].items[0];
  assert.equal(rod.id, 'rod');
  assert.deepEqual(rod.stars, { on: 0, next: 1 });
  assert.deepEqual(rod.eff, { label: '입질 여유', now: '2.6초', next: '3.0초' });
  assert.equal(rod.btn.disabled, false);
  assert.equal(rod.act.kind, 'forge');
  const axe = v.groups[1].items.find(i => i.id === 'axe');
  assert.equal(axe.dim, true);
  assert.equal(axe.btn.disabled, true);
  assert.equal(axe.cost.find(c => c.k === 'crop').lack, true);
});

test('pending star upgrade shows the moon tag and a disabled button', () => {
  const v = toolView({
    upgrades: UPG, owned: { rod: true }, inv: {}, forge: { tool: 'rod', star: 1, score: 7 }, tier2: [], weather: calm,
    stars: [star('rod', 0, { state: 'pending', next: 1 })],
  });
  const rod = v.groups[0].items[0];
  assert.equal(rod.tag, 'moon');
  assert.equal(rod.btn.disabled, true);
  assert.match(v.banner, /강화 중/);
});

test('busy anvil blocks a second upgrade', () => {
  const v = toolView({
    upgrades: UPG, owned: { rod: true, net: true }, inv: { coins: 999, fish: 99, bug: 99 }, forge: { tool: 'rod', star: 1, score: null },
    tier2: [], weather: calm,
    stars: [star('rod', 0, { state: 'pending', next: 1 }), star('net', 0, { state: 'busy', next: 1, cost: { coins: 80 } })],
  });
  const net = v.groups[0].items.find(i => i.id === 'net');
  assert.equal(net.btn.disabled, true);
  assert.ok(net.note);
});

test('owned plain tool is marked done and cannot be made again', () => {
  const v = toolView({ upgrades: UPG, owned: { axe: true }, inv: {}, stars: [], tier2: [], weather: calm });
  const axe = v.groups[0].items.find(i => i.id === 'axe');
  assert.equal(axe.tag, 'done');
  assert.equal(axe.btn.disabled, true);
});

test('weather warning puts a cover item first and in the banner', () => {
  const v = toolView({ upgrades: UPG, owned: {}, inv: { wood: 10 }, stars: [], tier2: [],
    weather: { severe: 'frost', info: { ico: '❄️', name: '서리' }, planted: 3, cost: { wood: 4 }, covered: false } });
  const first = v.groups.find(g => g.key === 'make').items[0];
  assert.equal(first.id, 'cover');
  assert.equal(first.act.kind, 'cover');
  assert.match(v.banner, /서리/);
});

test('golden tools stay locked until a blueprint arrives', () => {
  const v = toolView({ upgrades: UPG, owned: {}, inv: {}, stars: [], weather: calm,
    tier2: [{ tool: 'axe', name: '금빛 도끼', ico: '🪓', cost: { gem: 2 }, state: 'noBlueprint' }] });
  const lock = allItems(v).find(i => i.id === 'tier2');
  assert.equal(lock.tag, 'lock');
  assert.equal(lock.btn.disabled, true);
});

test('golden tool with a blueprint can be crafted', () => {
  const v = toolView({ upgrades: UPG, owned: { axe: true }, inv: { gem: 5 }, stars: [], weather: calm,
    tier2: [{ tool: 'axe', name: '금빛 도끼', ico: '🪓', cost: { gem: 2 }, state: 'ready' }] });
  const gold = allItems(v).find(i => i.id === 't2:axe');
  assert.equal(gold.act.kind, 'tier2');
  assert.equal(gold.btn.disabled, false);
});

test('outView hides farm-only pieces away from the farm and shows stored count', () => {
  const v = outView({ atFarm: false, inv: { wood: 2 }, stored: { swing: 1 }, outdoor: [
    { id: 'bench', ico: '🪑', name: '벤치', desc: '쉬어 가는 자리', cost: { wood: 8 } },
    { id: 'plot', ico: '🟫', name: '밭', desc: '', cost: { wood: 1 }, farm: true },
    { id: 'swing', ico: '🌙', name: '그네', desc: '', cost: { wood: 99 }, hidden: true },
    { id: 'gone', ico: '❓', name: '숨김', desc: '', cost: {}, hidden: true },
  ] });
  const items = allItems(v);
  assert.deepEqual(items.map(i => i.id), ['bench', 'swing']);
  assert.equal(items[1].cnt, 1);
  assert.equal(items[1].btn.disabled, false);
  assert.deepEqual(items[1].cost, []);
  assert.equal(items[0].dim, true);
});

test('giftView shows love, owned count, new tag and kept carvings banner', () => {
  const v = giftView({ inv: { crop: 5 }, owned: { bouquet: 2 }, kept: [{ ico: '🐟', paper: 'red', n: 1 }], gifts: [
    { id: 'bouquet', ico: '💐', name: '꽃다발', love: 1, cost: { crop: 2 } },
    { id: 'jar', ico: '🫙', name: '별빛 유리병', love: 2, isNew: true, cost: { bug: 3 } },
  ] });
  const [b, jar] = allItems(v);
  assert.equal(b.cnt, 2);
  assert.equal(b.btn.disabled, false);
  assert.equal(jar.tag, 'new');
  assert.equal(jar.dim, true);
  assert.match(v.banner, /🐟🎀/);
});

test('carveView marks finished orders done', () => {
  const v = carveView({ workshop: { orders: [
    { id: 'owl', ico: '🦉', name: '부엉이', pay: 45, best: 82, ready: true, done: false, cost: [{ k: 'wood', need: 6, have: 9 }] },
    { id: 'bear', ico: '🧸', name: '곰', pay: 30, best: 92, ready: false, done: true, cost: [{ k: 'wood', need: 4, have: 9 }] },
  ] } });
  const [owl, bear] = allItems(v);
  assert.equal(owl.act.kind, 'carve');
  assert.equal(owl.btn.disabled, false);
  assert.equal(bear.tag, 'done');
  assert.equal(bear.btn.disabled, true);
});

test('pickSel keeps a valid selection and falls back to the first item', () => {
  const v = carveView({ workshop: { orders: [
    { id: 'a', ico: '1', name: 'a', pay: 1, best: 0, ready: true, done: false, cost: [] },
    { id: 'b', ico: '2', name: 'b', pay: 1, best: 0, ready: true, done: false, cost: [] },
  ] } });
  assert.equal(pickSel(v, 'b'), 'b');
  assert.equal(pickSel(v, 'zzz'), 'a');
  assert.equal(pickSel({ groups: [] }, 'a'), null);
});

test('bench tour has five steps when the player owns a star tool', () => {
  const s = benchSteps({ wide: false, hasStars: true });
  assert.deepEqual(s.map(x => x.key), ['bench_tabs', 'bench_cell', 'bench_detail', 'bench_star', 'bench_carve']);
  assert.ok(s.every(x => x.done === 'tap' && x.target && x.text));
  assert.match(s[1].text, /아래에/);
  assert.match(benchSteps({ wide: true, hasStars: true })[1].text, /오른쪽에/);
});

test('bench tour skips the star step without star tools', () => {
  const s = benchSteps({ wide: true, hasStars: false });
  assert.equal(s.length, 4);
  assert.ok(!s.some(x => x.key === 'bench_star'));
});

test('tour copy avoids em dash', () => {
  for (const s of benchSteps({ wide: false, hasStars: true })) assert.ok(!s.text.includes('—'), s.key);
});

test('cells carry selection, dimming, stars and tags', async () => {
  const { cellHtml, listHtml } = await import('../js/workbench/bench-ui.js');
  const v = toolView({ upgrades: UPG, owned: { rod: true }, inv: {}, tier2: [], weather: calm,
    stars: [star('rod', 1, { state: 'short', next: 2, cost: { coins: 240 }, missing: ['coins'] })] });
  const rod = v.groups[0].items[0];
  const h = cellHtml(rod, 'rod');
  assert.match(h, /class="wb-cell sel dim"/);
  assert.match(h, /data-star="1"/);
  assert.match(h, /<i class="on">★<\/i>/);
  assert.match(listHtml(v, 'rod'), /<div class="wb-grid" data-group="mine">/);
  assert.match(cellHtml({ ...rod, tag: 'new', stars: null }, null), /<span class="wb-tag t-new">새<\/span>/);
});

test('sheet shows have over need, red chips and a disabled button when short', async () => {
  const { sheetHtml } = await import('../js/workbench/bench-ui.js');
  const v = toolView({ upgrades: UPG, owned: {}, inv: { wood: 30, crop: 1 }, tier2: [], weather: calm, stars: [] });
  const axe = allItems(v).find(i => i.id === 'axe');
  const h = sheetHtml(axe, k => ({ wood: '🪵', crop: '🥕' })[k]);
  assert.match(h, /<span class="wb-chip">🪵 30\/20<\/span><span class="wb-chip lack">🥕 1\/3<\/span>/);
  assert.match(h, /<button type="button" class="wb-go" disabled>재료가 부족해요<\/button>/);
});

test('star sheet shows the effect now and next', async () => {
  const { sheetHtml } = await import('../js/workbench/bench-ui.js');
  const v = toolView({ upgrades: UPG, owned: { rod: true }, inv: { coins: 999, fish: 99 }, tier2: [], weather: calm,
    stars: [star('rod', 0, { state: 'ready', next: 1, cost: { coins: 120, fish: 4 }, missing: [] })] });
  const h = sheetHtml(v.groups[0].items[0], k => k);
  assert.match(h, /<span>입질 여유<\/span> <span class="now">2\.6초<\/span><i class="chev"><\/i><span class="nxt">3\.0초<\/span>/);
  assert.match(h, /<button type="button" class="wb-go">🔨 ★1로 강화하기<\/button>/);
});

test('limited outdoor pieces keep sale label and date apart', async () => {
  const { sheetHtml } = await import('../js/workbench/bench-ui.js');
  const v = outView({ inv: { wood: 9 }, outdoor: [{ id: 'pumpkin', ico: '🎃', name: '호박', desc: '', cost: { wood: 2 }, tag: { label: '🎃 할로윈', until: '11/1까지' } }] });
  const it = allItems(v)[0];
  assert.deepEqual(it.sale, { label: '🎃 할로윈', until: '11/1까지' });
  assert.match(sheetHtml(it, k => k), /<span class="ck-tag">🎃 할로윈<\/span><span class="ck-tag">11\/1까지<\/span>/);
});

test('bench tour runs once, yields to other tours and pauses under other windows', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const s = html.indexOf('function runBenchTour()');
  const body = html.slice(s, html.indexOf('\n    }\n', s));
  assert.match(body, /Input\.hintSeen\('spotBench'\) \|\| spot\.active\(\)/);
  assert.match(body, /markHintsSeen\(\['spotBench'\]\)/);
  assert.match(body, /kind: 'bench'/);
  assert.match(body, /pause: \(\) =>/);
  assert.doesNotMatch(body, /anyModalOpen/);
  assert.match(html, /openCook\(tab = 'tool'\) \{[^}]*runBenchTour\(\);/);
  const spot = readFileSync(new URL('../js/hud/spotlight.js', import.meta.url), 'utf8');
  assert.match(spot, /run\.blocked \? !!run\.pause\?\.\(\) : blocked\(\)/);
});

test('tourPick shows a slot that needs materials, preferring one with a red chip', async () => {
  const { tourPick } = await import('../js/workbench/bench-view.js');
  const v = toolView({ upgrades: UPG, owned: { axe: true }, inv: { wood: 30, crop: 9, bug: 0 }, stars: [], tier2: [], weather: calm });
  assert.equal(tourPick(v), 'net');
  const ready = toolView({ upgrades: UPG.slice(0, 2), owned: { axe: true }, inv: { wood: 30 }, stars: [], tier2: [], weather: calm });
  assert.equal(tourPick(ready), 'rod');
  assert.equal(tourPick({ groups: [] }), null);
});
