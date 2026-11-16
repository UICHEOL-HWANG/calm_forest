import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pondStageInfo, pondExpandView, pondGrowTipDue } from '../js/pond/stage.js';
import { pondStageShort } from '../js/guide/prepass-rules.js';
import { movedStep } from '../js/pond/yard-steps.js';
import { rvGroup } from '../js/tenjin-events.js';
import { parseCsv } from '../tools/amplitude/csv.mjs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('줄 모델: 수첩·돌·목재·코인 순서, 채운 줄만 ok', () => {
  const v = pondExpandView(pondStageInfo(1, { stone: 26, wood: 12, coins: 310 }, 5));
  assert.deepEqual(v.rows, [
    { k: 'book', need: 4, have: 5, ok: true },
    { k: 'stone', need: 20, have: 26, ok: true },
    { k: 'wood', need: 20, have: 12, ok: false },
    { k: 'coins', need: 200, have: 310, ok: true },
  ]);
  assert.equal(v.hint, 'wood');
  assert.equal(v.canBuy, false);
});

test('안내 줄은 처음 모자란 줄 하나', () => {
  const hint = (inv, got) => pondExpandView(pondStageInfo(1, inv, got)).hint;
  assert.equal(hint({ stone: 0, wood: 0, coins: 0 }, 3), 'book');
  assert.equal(hint({ stone: 0, wood: 0, coins: 0 }, 4), 'stone');
  assert.equal(hint({ stone: 20, wood: 0, coins: 0 }, 4), 'wood');
  assert.equal(hint({ stone: 20, wood: 20, coins: 199 }, 4), 'coins');
  assert.equal(hint({ stone: 20, wood: 20, coins: 200 }, 4), null);
});

test('버튼: 다 채우면 켜지고, 새 자리에 꾸미기가 있으면 꺼지고 안내가 바뀐다', () => {
  const full = pondStageInfo(1, { stone: 20, wood: 20, coins: 200 }, 4);
  assert.equal(pondExpandView(full).canBuy, true);
  const blocked = pondExpandView(full, 1);
  assert.equal(blocked.canBuy, false);
  assert.equal(blocked.hint, 'decor');
  assert.equal(pondExpandView(pondStageInfo(1, {}, 0), 2).hint, 'decor');
  assert.equal(pondExpandView(pondStageInfo(2, { stone: 60, wood: 40, coins: 500 }, 8)).canBuy, true);
  assert.equal(pondExpandView(pondStageInfo(2, { stone: 60, wood: 40, coins: 500 }, 7)).canBuy, false);
  assert.equal(pondExpandView(pondStageInfo(3, { stone: 999, wood: 999, coins: 999 }, 11)), null);
});

test('넓힐 수 있다는 귀띔은 단계마다 한 번', () => {
  assert.equal(pondGrowTipDue({}, 3), 0);
  assert.equal(pondGrowTipDue({}, 4), 2);
  assert.equal(pondGrowTipDue(undefined, 9), 2);
  assert.equal(pondGrowTipDue({ pondGrowTip: 2 }, 6), 0);
  assert.equal(pondGrowTipDue({ pondStage: 2, pondGrowTip: 2 }, 7), 0);
  assert.equal(pondGrowTipDue({ pondStage: 2, pondGrowTip: 2 }, 8), 3);
  assert.equal(pondGrowTipDue({ pondStage: 2, pondGrowTip: 3 }, 11), 0);
  assert.equal(pondGrowTipDue({ pondStage: 3 }, 11), 0);
});

test('광고 자리는 돌·목재가 모자랄 때만, 텐진 묶음은 집 무리', () => {
  assert.equal(pondStageShort(1, { stone: 20, wood: 20, coins: 0 }), null);
  assert.deepEqual(pondStageShort(1, { stone: 26, wood: 12, coins: 0 }).list.map(r => r.k), ['wood']);
  for (const s of ['pond2', 'pond3']) assert.equal(rvGroup(s), 'house', s);
  assert.equal(rvGroup('pond_feed_more'), 'pond');
});

test('넓히기 창: 광고는 기존 모자람 광고 도우미로, 구매 순서', () => {
  const f = src('js/pond/expand-ui.js');
  assert.match(f, /export function openPondExpand\(\)/);
  assert.match(f, /export function expandPond\(\)/);
  assert.match(f, /const short = pondStageShort\(info\.cur\.stage, gameState\.inventory\);/);
  assert.match(f, /short \? guideShortAd\(short\.slot, short\.list, /);
  assert.doesNotMatch(f, /rewarded|prepassArm|repeatOpen/);
  assert.match(f, /if \(!view\?\.canBuy\) return false;/);
  assert.match(f, /for \(const k in next\.cost\) gameState\.inventory\[k\] -= next\.cost\[k\];/);
  assert.match(f, /logEcon\('pond_expand', 'stage' \+ next\.stage, -next\.cost\.coins, gameState\.inventory\.coins\);/);
  assert.match(f, /trackEvent\('pond_expand', \{ stage: next\.stage, wood: next\.cost\.wood, stone: next\.cost\.stone, coins: next\.cost\.coins \}\);/);
  const order = ['gameState.inventory[k] -=', 'logEcon(', 'refreshInventoryUI()', 'gameState.hintsSeen.pondStage = next.stage', 'rebuildPond()', "trackEvent('pond_expand'", 'requestSave()', 'closeBook()', 'ui.toast?.('];
  const at = order.map(s => f.indexOf(s));
  assert.ok(at.every(i => i >= 0), JSON.stringify(at));
  assert.deepEqual([...at].sort((a, b) => a - b), at);
  assert.equal((f.match(/trackEvent\(/g) || []).length, 1);
  assert.doesNotMatch(f, /^\s*\/\//m);
  assert.doesNotMatch(f, /gameState\.(?!inventory|hintsSeen)\w+ =/);
});

test('옮겨 간 연못 안내: 2단계로 넓힐 때만, 연못 행동 거리에 들면 끝', () => {
  const s = movedStep('M');
  assert.equal(s.id, 'go');
  assert.equal(s.text, 'M');
  assert.deepEqual(s.target({ pond: { x: -24, z: -9 } }), { x: -24, z: -9 });
  assert.equal(s.target({ pond: null }), null);
  assert.equal(s.done({ nearPond: false }), false);
  assert.equal(s.done({ nearPond: true }), true);
  const f = src('js/pond/expand-ui.js');
  assert.match(f, /const MOVE_STAGE = 2;/);
  assert.match(f, /if \(next\.stage === MOVE_STAGE\) yardGuidePointTo\('pond'\);/);
  assert.equal((f.match(/yardGuidePointTo\(/g) || []).length, 1);
  assert.match(f, /foot: info\.next\.stage === MOVE_STAGE \? el\('div', 'cb-hint', POND_COPY\.growWhere\) : null,/);
  assert.ok(f.indexOf('ui.toast?.(') < f.indexOf("yardGuidePointTo('pond')"));
  const y = src('js/pond/yard-guide.js');
  assert.match(y, /if \(kind === 'pond'\) \{\n\s*if \(!deps\.held\?\.\(\)\) run\('pond_moved', \[movedStep\(POND_COPY\.growMoved\)\]\);\n\s*return;\n\s*\}/);
  assert.ok(y.indexOf("if (flow === 'yard_fill' || flow === 'pond_d1') return;") < y.indexOf("if (kind === 'pond')"));
  assert.match(y, /if \(guideStalled\(lastProgressAt, nowSec\)\) \{ stop\(\); return; \}/);
  assert.match(src('docs/analysis/event-taxonomy.csv'), /pond_moved/);
});

test('수첩 창 입구와 공용 창의 아래 줄·버튼', () => {
  const f = src('js/pond/feed.js');
  assert.match(f, /export function pondBook\(\)/);
  assert.match(f, /foot: growRow\(\),/);
  assert.match(f, /pondStage\(\) >= MAX_POND_STAGE/);
  assert.match(f, /b\.onclick = openPondExpand;/);
  const c = src('js/hud/collection-book.js');
  assert.match(c, /<div id="cb-foot"><\/div>/);
  assert.match(c, /if \(next\.foot\) foot\.append\(next\.foot\);/);
  assert.match(c, /const go = info \? info\.go : model\.go;/);
  assert.match(c, /b\.disabled = !!go\.disabled;/);
  assert.doesNotMatch(c, /^\s*\/\//m);
});

test('귀띔은 연못 갱신 때 정하고 마을에서 띄운다, 저장은 hintsSeen 두 키만', () => {
  const p = src('js/pond/index.js');
  assert.match(p, /pondGrowTipDue\(gameState\.hintsSeen, pondBook\(\)\.got\)/);
  assert.match(p, /gameState\.hintsSeen\.pondGrowTip = tip;/);
  assert.match(p, /POND_COPY\.growTip\.replace\('\{0\}', /);
  assert.match(p, /export const outdoorRel = /);
});

test('이벤트 표: pond_expand 행과 광고 자리 설명', () => {
  const rows = parseCsv(src('docs/analysis/event-taxonomy.csv'));
  const row = rows.find(r => r.event_name === 'pond_expand');
  assert.ok(row);
  assert.equal(row.category, 'gathering');
  assert.equal(row.feature, 'pond');
  assert.deepEqual(row.custom_keys.split('|').sort(), ['coins', 'stage', 'stone', 'wood']);
  assert.match(row.code_line, /^js\/pond\/expand-ui\.js:\d+$/);
  assert.match(rows.find(r => r.event_name === 'prepass_eligible').description_draft, /pond2·pond3/);
});
