import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('index.js 는 겨울이면 모든 진입점을 winter.js 로 넘긴다', () => {
  const src = read('js/plaza/index.js');
  for (const needle of ["const WINTER = DEF.kind === 'winter';", 'if (WINTER) { initWinter(DEF, ge, DEBUG_STAGE); return; }',
    'if (WINTER) return refreshWinter(force);', 'if (WINTER) { updateWinter(dt, inVillage); return; }',
    'if (WINTER) return winterSpot(pos);', 'if (WINTER) { openWinter(); return; }', 'if (WINTER) return winterPhase();',
    "export { fountainSpotNow } from './winter.js';"]) assert.ok(src.includes(needle), needle);
});

test('game.js 연결: initPlaza(GE) 는 GE 뒤, plaza 줄 수는 그대로 14 이하', () => {
  const game = read('js/game.js');
  assert.ok(game.indexOf('initPlaza(GE)') > game.indexOf('const GE = {'));
  assert.ok(!game.includes('initPlaza();'));
  assert.ok(game.split('\n').filter(l => /plaza/i.test(l)).length <= 14);
  assert.ok(read('js/spaces/doors.js').includes("plazaHere === 'fountain'"));
});

test('plaza_give RPC 래퍼와 net.give', () => {
  assert.ok(read('js/supabase-client.js').includes("export function plazaGive(season, stage, item, qty) { return plazaCall('plaza_give', { p_season: season, p_stage: stage, p_item: item, p_qty: qty }); }"));
  assert.ok(read('js/plaza/net.js').includes('export const give = plazaGive;'));
});

test('겨울 이벤트 2종이 코드·분류표·GA4_GUIDE 에 있다', () => {
  const src = read('js/plaza/winter.js'), csv = read('docs/analysis/event-taxonomy.csv'), doc = read('docs/analysis/GA4_GUIDE.md');
  for (const e of ['plaza_fountain_stage', 'plaza_lamp_stage']) {
    assert.ok(src.includes(`trackEvent('${e}'`), e);
    assert.ok(csv.split('\n').some(l => l.startsWith(`${e},`)), e);
    assert.ok(doc.includes(`\`${e}\``), e);
  }
});

test('겨울 경로는 단풍잎·올빼미·환전을 부르지 않는다', () => {
  const src = read('js/plaza/winter.js');
  for (const bad of ['leaf', 'updateInvite', 'convertPlan', 'stageSeenPlan']) assert.ok(!src.includes(bad), bad);
});

test('stage_seen 의 day_n 기준일은 시즌 정의에서 온다', () => {
  const src = read('js/plaza/index.js');
  assert.ok(src.includes('DEF.opensKst'));
  assert.ok(!src.includes('PLAZA_OPENS_KST'));
});
