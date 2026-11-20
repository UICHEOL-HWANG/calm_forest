import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MINER_STEPS } from '../js/data/delve.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const delve = read('js/spaces/delve.js');
const en = read('js/i18n-en.js');
const step = (id) => MINER_STEPS.find(s => s.id === id);

test('pest steps name the floors where that pest lives', () => {
  assert.equal(step('tap').desc, '🦎 웅덩이 아가미 톡 치기 · 지하 1~10층');
  assert.equal(step('bait').desc, '🍄 수정집게에게 버섯 미끼 던지기 · 지하 1~10층');
  assert.equal(step('grab').desc, '🦇 박쥐 앞에서 조각 바로 줍기 3번 · 지하 11~20층');
  assert.equal(step('reclaim').desc, '🐛 굴에서 조각 되찾기 · 지하 11~20층');
  for (const id of ['tap', 'bait', 'grab', 'reclaim']) assert.ok(en.includes(`'${step(id).desc}'`), id);
});

test('floor already mined today shows plain rocks and says so', () => {
  assert.match(delve, /makeRock\(r\.vein && run\.oreOk, theme\)/);
  assert.match(delve, /if \(!oreOk\) ui\.toast\?\.\('⛏️ 이 층 광맥은 오늘 다 캤어요\. 내일 다시 차올라요'/);
  assert.ok(en.includes("'⛏️ 이 층 광맥은 오늘 다 캤어요. 내일 다시 차올라요'"));
});

test('bait prompt shows without mushrooms and explains on press', () => {
  assert.doesNotMatch(delve, /near\(p\.sim, BAIT_R\) && \(gameState\.inventory\.forage/);
  assert.match(delve, /if \(\(gameState\.inventory\.forage \|\| 0\) <= 0\) \{ ui\.toast\?\.\('🍄 미끼로 줄 버섯이 없어요\. 채집 숲에서 주워 와요'/);
  assert.ok(en.includes("'🍄 미끼로 줄 버섯이 없어요. 채집 숲에서 주워 와요'"));
});

test('lift panel lists every stop, opens reached ones, marks the deepest', async () => {
  const { liftPanelRows, defaultDelve } = await import('../js/delve/rules.js');
  const d = { ...defaultDelve(), maxFloor: 15 };
  assert.deepEqual(liftPanelRows(d), [
    { f: 1, open: true, deep: false }, { f: 5, open: true, deep: false }, { f: 10, open: true, deep: false },
    { f: 15, open: true, deep: true }, { f: 20, open: false, deep: false },
  ]);
  assert.deepEqual(liftPanelRows(defaultDelve()).filter(r => r.open).map(r => r.f), [1]);
});

test('lift ride: panel for stops, bucket ride locks input, fades, then enters the floor', () => {
  const b = delve.match(/if \(nd === 'delve_lift'\)[\s\S]*?\n  \}\n/)[0];
  assert.match(b, /const rows = liftPanelRows\(gameState\.delve\)/);
  assert.match(b, /if \(rows\.filter\(r => r\.open\)\.length === 1\) \{ rideLift\(1\); return true; \}/);
  assert.match(b, /openLiftPanel\(rows, rideLift\)/);
  assert.doesNotMatch(delve, /🪜 1층부터/);
  assert.match(delve, /function rideLift\(floor\) \{[\s\S]*?\$w\.sleeping = true/);
  assert.match(delve, /trackEvent\('delve_enter', \{ floor, stops: [^}]*\}\)/);
  assert.match(delve, /ui\.sleepFade\?\.\(1\)[\s\S]*?endRide\(\);\n  try \{ enterFloor\(floor, 'lift'\); \} finally \{ ui\.sleepFade\?\.\(0\); \}/);
  assert.match(delve, /function tickLift\(dt\) \{\n  if \(!ride\) return;\n  if \(!atMine\) \{ endRide\(\); ui\.sleepFade\?\.\(0\); return; \}/);
  assert.match(delve, /function rideLift\(floor\) \{\n  if \(ride \|\| !liftMesh \|\| !atMine \|\| run\) return;/);
  assert.match(delve, /liftSolids = LIFT_SOLIDS\.map\(\(\[x, z, r\]\) => solidCircle\(/);
  assert.match(read('js/delve/pest-art.js'), /export function makeLift\(\) \{[\s\S]*?setRide/);
});

test('lift panel module renders round floor buttons and a close button, copy translated', () => {
  const p = read('js/delve/lift-panel.js');
  assert.match(p, /export function openLiftPanel\(rows, onPick\)/);
  assert.match(p, /root\.id = 'lift-modal'; root\.className = 'show'/);
  assert.match(p, /'🛗 어디로 갈까요\?'/);
  assert.match(p, /`지하 \$\{r\.f\}층`/);
  assert.match(p, /'닫기'/);
  for (const k of ["'🛗 어디로 갈까요?'", "'지하 {0#}층'", "'닫기'"]) assert.ok(en.includes(k), k);
});
