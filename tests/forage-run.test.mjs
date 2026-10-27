import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  FORAGE_LOGIC_V, MAX_SEQ, ROW_COLUMNS, GA4_REUSED_KEYS,
  appendCapped, mudAct, diveLeg, divePick, forageRow, pickEventParams, startEventParams, resultEventParams,
} from '../js/forage/run.js';
import { MUD_SPECIES, DIVE_SPECIES, summarizeBag } from '../js/forage/logic.js';

const RUN = '00000000-0000-4000-8000-000000000001';
const DP = { ease: 1.25, dda: 1, arm: 2, probe_v: 2 };
const ctx = {
  mode: 'mudflat', runId: RUN, attemptN: 3, firstTime: false, entry: 'again', prevMode: 'mudflat',
  night: false, weather: 'clear', season: 'autumn', input: 'touch', orientation: 'landscape', coinsBefore: 120,
  diff: DP, params: { win: .375, breathS: null, tideS: 60 },
};

test('sequence helpers pack compact integer tuples', () => {
  assert.deepEqual(mudAct(12345.6, .291, true, 3, 5), [12346, 29, 1, 3, 5]);
  assert.deepEqual(mudAct(0, 1.62, false, 1, 0), [0, 62, 0, 1, 0]);
  assert.deepEqual(diveLeg(1, 1000, 9400.4, 8.73, 4, .214, false), [1, 1000, 9400, 87, 4, 21, 0]);
  assert.deepEqual(divePick(5200, 6.04, 2, .5), [5200, 60, 2, 50]);
});

test('appendCapped keeps the first MAX_SEQ entries and never mutates', () => {
  const a = [[1]];
  const b = appendCapped(a, [2]);
  assert.deepEqual(a, [[1]]);
  assert.deepEqual(b, [[1], [2]]);
  let full = [];
  for (let i = 0; i < MAX_SEQ + 50; i++) full = appendCapped(full, [i]);
  assert.equal(full.length, MAX_SEQ);
  assert.deepEqual(full[MAX_SEQ - 1], [MAX_SEQ - 1]);
});

test('forageRow fills every column and derives totals from the bag', () => {
  const summary = summarizeBag(MUD_SPECIES, { clam: 3, octo: 1 });
  const row = forageRow({
    ctx, outcome: 'finish', endReason: 'tide', durationMs: 60123.4, summary, good: 4, bad: 2,
    acts: [mudAct(1000, .1, true, 1, 0)], lostTide: 3, lostMiss: 1, idleMs: 4200, fpsAvg: 58.44,
  });
  assert.deepEqual(Object.keys(row).sort(), [...ROW_COLUMNS].sort());
  assert.equal(row.run_id, RUN);
  assert.equal(row.mode, 'mudflat');
  assert.equal(row.logic_v, FORAGE_LOGIC_V);
  assert.equal(row.outcome, 'finish');
  assert.equal(row.abandon_stage, null);
  assert.equal(row.duration_ms, 60123);
  assert.equal(row.items, 4);
  assert.equal(row.coins, summary.coins);
  assert.equal(row.sell_value, summary.sellValue);
  assert.equal(row.rare_count, 1);
  assert.deepEqual(row.bag, { clam: 3, octo: 1 });
  assert.equal(row.ease, 1.25);
  assert.equal(row.arm, 2);
  assert.equal(row.win, .375);
  assert.equal(row.breath_s, null);
  assert.equal(row.fps_avg, 58.4);
  assert.equal(row.dives, null);
  assert.equal(row.picks, null);
});

test('abandoned dive rows keep the stage and the dive sequences', () => {
  const summary = summarizeBag(DIVE_SPECIES, {});
  const row = forageRow({
    ctx: { ...ctx, mode: 'dive', params: { win: null, breathS: 17, tideS: null } },
    outcome: 'abandon', abandonStage: 'swim', endReason: 'exit', durationMs: 9000, summary, good: 0, bad: 0,
    dives: [diveLeg(1, 0, 9000, 4, 0, .3, false)], picks: [],
  });
  assert.equal(row.outcome, 'abandon');
  assert.equal(row.abandon_stage, 'swim');
  assert.equal(row.end_reason, 'exit');
  assert.equal(row.acts, null);
  assert.equal(row.lost_tide, null);
  assert.equal(row.dives.length, 1);
  assert.deepEqual(row.picks, []);
  assert.equal(row.breath_s, 17);
});

test('worst-case jsonb payload, as Postgres prints it, stays under the 16KB CHECK', () => {
  let acts = [], picks = [], dives = [];
  for (let i = 0; i < 400; i++) {
    acts = appendCapped(acts, mudAct(59999, .99, false, 3, 5));
    picks = appendCapped(picks, divePick(99999, 10.99, 4, .99));
  }
  for (let i = 1; i <= 3; i++) dives = appendCapped(dives, diveLeg(i, 99999, 99999, 10.99, 99, .99, true));
  const bag = Object.fromEntries(MUD_SPECIES.map(s => [s.id, 999]));
  const pg = v => JSON.stringify(v).replace(/,/g, ', ').replace(/:/g, ': ');
  const size = pg(acts).length + pg(picks).length + pg(dives).length + pg(bag).length;
  assert.ok(size <= 16384, `size ${size}`);
  const sql = readFileSync(new URL('../sql/migrations/migrate_forage_runs.sql', import.meta.url), 'utf8');
  assert.match(sql, /<= 16384/);
});

test('GA4 payloads reuse existing keys only and stay within the 23-key budget', () => {
  const summary = summarizeBag(MUD_SPECIES, { clam: 2 });
  const pick = pickEventParams({ mode: 'dive', first: true, night: false, weather: 'rain' });
  const start = startEventParams(ctx);
  const result = resultEventParams({ ctx, summary, good: 2, bad: 1, endReason: 'tide', durationMs: 1234.5 });
  for (const p of [pick, start, result]) {
    assert.ok(Object.keys(p).length <= 23);
    for (const k of Object.keys(p)) assert.ok(GA4_REUSED_KEYS.includes(k), k);
  }
  assert.deepEqual(Object.keys(pick), ['mode', 'first', 'night', 'weather']);
  assert.equal(Object.keys(start).length, 7);
  assert.equal(Object.keys(result).length, 13);
  assert.equal(result.duration_ms, 1235);
  assert.equal(pick.first, 1);
});

test('forage rows go to forage_runs, skip dev sessions and carry identity like sled runs', () => {
  const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  assert.match(read('js/config.js'), /FORAGE_TABLE: 'forage_runs'/);
  const client = read('js/supabase-client.js');
  const body = client.slice(client.indexOf('export async function sendForageRun'), client.indexOf('export async function sendForageRun') + 700);
  assert.match(body, /if \(IS_DEV_SESSION\) return;/);
  assert.match(body, /user_id: state\.userId, session_id: state\.sessionId, client_id: state\.clientId/);
  assert.match(body, /platform: PLATFORM, run_date: kstDate\(\), \.\.\.row/);
  assert.match(body, /from\(CONFIG\.FORAGE_TABLE\)\.insert\(full\)/);
  const sql = read('sql/migrations/migrate_forage_runs.sql') + read('sql/migrations/migrate_forage_runs_homi.sql');
  for (const c of ROW_COLUMNS) assert.match(sql, new RegExp(`^  (add column if not exists )?${c} `, 'm'), c);
});

test('every reused GA4 key already exists in the codebase', () => {
  const root = new URL('../js/', import.meta.url);
  const src = readdirSync(root, { recursive: true })
    .filter(f => f.endsWith('.js') && !f.startsWith('forage'))
    .map(f => readFileSync(new URL(f, root), 'utf8')).join('\n');
  for (const k of GA4_REUSED_KEYS) assert.match(src, new RegExp(`[{ ,]${k}:`), k);
});

test('the hoe tier and engraves ride along on mudflat rows for the difficulty covariates', () => {
  const base = { ctx: { runId: 'r', mode: 'mudflat', diff: {}, params: {} }, outcome: 'finish', endReason: 'tide', durationMs: 1, summary: { count: 0, coins: 0, sellValue: 0, items: [] }, good: 0, bad: 0 };
  const none = forageRow(base);
  assert.equal(none.homi_tier, null);
  assert.equal(none.engraves, null);
  const row = forageRow({ ...base, ctx: { ...base.ctx, homi: { tier: 2, engraves: ['spare'] } } });
  assert.equal(row.homi_tier, 2);
  assert.deepEqual(row.engraves, ['spare']);
  const sql = readFileSync(new URL('../sql/migrations/migrate_forage_runs_homi.sql', import.meta.url), 'utf8');
  assert.match(sql, /add column if not exists homi_tier smallint/);
  assert.match(sql, /add column if not exists engraves text\[\]/);
  assert.match(sql, /homi_tier between 0 and 2/);
  const feet = readFileSync(new URL('../sql/migrations/migrate_forage_runs_homi_feet.sql', import.meta.url), 'utf8');
  assert.match(feet, /engraves <@ array\['reach', 'eye', 'spare', 'feet'\]/);
});
