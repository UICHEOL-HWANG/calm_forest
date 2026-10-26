import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanEventNames, namesInLine } from '../tools/amplitude/event-names.mjs';
import { parseCsv } from '../tools/amplitude/csv.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CATEGORIES = new Set(['ga4_auto', 'system', 'experiment', 'monetization', 'onboarding', 'ui', 'farming', 'gathering', 'crafting', 'content', 'economy', 'decor', 'progression', 'social']);
const STATUSES = new Set(['active', 'dormant', 'not_fired', 'retired', 'auto']);
const MIN_CODE_EVENTS = 400;
const NORTH_STAR = ['harvest_crop', 'coop_collect', 'honey_collect', 'fishing_catch', 'sea_catch', 'firefly_catch', 'forage_pick', 'mine_ore', 'craft_item', 'craft_claim', 'cooking_result', 'cafe_serve', 'carve_result', 'quest_complete', 'star_result', 'duel_result'];

const taxonomy = parseCsv(readFileSync(new URL('../docs/analysis/event-taxonomy.csv', import.meta.url), 'utf8'));
const byName = new Map(taxonomy.map(r => [r.event_name, r]));

test('코드에서 보내는 이벤트는 전부 분류표에 있다', () => {
  const missing = [...scanEventNames(ROOT).keys()].filter(n => !byName.has(n));
  assert.deepEqual(missing, [], `분류표에 없는 이벤트: ${missing.join(', ')} → docs/analysis/event-taxonomy.csv 에 행을 추가하세요`);
});

test('이벤트 이름은 한 번씩만 나온다', () => {
  assert.equal(byName.size, taxonomy.length);
});

test('행마다 분류값이 정해진 값 안에 있다', () => {
  for (const r of taxonomy) {
    assert.ok(CATEGORIES.has(r.category), `${r.event_name}: category ${r.category}`);
    assert.ok(['1', '2', '3'].includes(r.tier), `${r.event_name}: tier ${r.tier}`);
    assert.ok(['Y', 'N'].includes(r.north_star), `${r.event_name}: north_star ${r.north_star}`);
    assert.ok(STATUSES.has(r.status), `${r.event_name}: status ${r.status}`);
    assert.ok(r.feature, `${r.event_name}: feature 비어 있음`);
  }
});

test('북극성 획득 행동 16종은 tier 1 이고 north_star=Y 이다', () => {
  for (const n of NORTH_STAR) {
    assert.equal(byName.get(n)?.tier, '1', n);
    assert.equal(byName.get(n)?.north_star, 'Y', n);
  }
  assert.equal(taxonomy.filter(r => r.north_star === 'Y').length, NORTH_STAR.length);
});

test('시스템·GA4 자동 이벤트는 앰플리튜드로 보내지 않는다(tier 3)', () => {
  for (const r of taxonomy.filter(r => r.category === 'system' || r.category === 'ga4_auto')) {
    assert.equal(r.tier, '3', r.event_name);
  }
});

test('추출기: 삼항·포워더·튜플 파일·광장 event 키를 잡는다', () => {
  assert.deepEqual(namesInLine("trackEvent(skipped ? 'intro_skip' : 'intro_complete', { at_s })", 'js/x.js'), ['intro_skip', 'intro_complete']);
  assert.deepEqual(namesInLine("deps.track?.('retention_guidance_show', payload)", 'js/x.js'), ['retention_guidance_show']);
  assert.deepEqual(namesInLine("  enter: (p) => emit('mirror_enter', p),", 'js/mirror/track.js'), ['mirror_enter']);
  assert.deepEqual(namesInLine("openPolicyPage('/privacy', 'privacy_open'));", 'index.html'), ['privacy_open']);
  assert.deepEqual(namesInLine("  ['neighbor_visit_start', { host }];", 'js/neighbors/track.js'), ['neighbor_visit_start']);
  assert.deepEqual(namesInLine("{ event: 'plaza_donate', params }", 'js/plaza/donate.js'), ['plaza_donate']);
});

test('추출기: 이벤트 이름이 아닌 문자열은 잡지 않는다', () => {
  assert.deepEqual(namesInLine("trackEvent(...evFail('today', r.reason));", 'js/spaces/neighbor.js'), []);
  assert.deepEqual(namesInLine("trackEvent(kind === 'abandon' ? 'carve_abandon' : 'carve_result', {", 'js/x.js'), ['carve_abandon', 'carve_result']);
  assert.deepEqual(namesInLine("    ['fish_success', { ico: '🎣' }],", 'js/predict.js'), []);
  assert.deepEqual(namesInLine("post({ event: 'result', result: r.result })", 'js/push-ui.js'), []);
});

test('추출기가 코드 이벤트를 크게 놓치지 않는다(하한)', () => {
  const n = scanEventNames(ROOT).size;
  assert.ok(n >= MIN_CODE_EVENTS, `코드에서 찾은 이벤트 ${n}개 < ${MIN_CODE_EVENTS}. 새 전송 방식이 생겼다면 tools/amplitude/event-names.mjs 에 추가`);
});

test('추출기: 줄바꿈된 호출과 튜플도 잡는다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evscan-'));
  mkdirSync(join(dir, 'js', 'feat'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '');
  writeFileSync(join(dir, 'js', 'a.js'), "trackEvent(\n  'wrapped_event', { a: 1 });\n");
  writeFileSync(join(dir, 'js', 'feat', 'track.js'), "export const ev = () => ['tuple_wrapped',\n  { a: 1 }];\n");
  const found = scanEventNames(dir);
  assert.ok(found.has('wrapped_event'));
  assert.ok(found.has('tuple_wrapped'));
});

test('CSV 파서: CRLF 와 따옴표 안 쉼표·줄바꿈', () => {
  const rows = parseCsv('a,b\r\n1,"x, y"\r\n2,"line1\nline2"\r\n');
  assert.deepEqual(rows, [{ a: '1', b: 'x, y' }, { a: '2', b: 'line1\nline2' }]);
});
