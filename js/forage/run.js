export const FORAGE_LOGIC_V = 1;
export const MAX_SEQ = 200;

export const ROW_COLUMNS = [
  'run_id', 'mode', 'logic_v', 'outcome', 'abandon_stage', 'end_reason', 'duration_ms',
  'items', 'coins', 'sell_value', 'rare_count', 'good', 'bad', 'bag',
  'attempt_n', 'first_time', 'entry', 'prev_mode', 'night', 'weather', 'season', 'input', 'orientation', 'fps_avg', 'coins_before',
  'ease', 'arm', 'dda', 'probe_v', 'win', 'breath_s', 'tide_s',
  'acts', 'lost_tide', 'lost_miss', 'idle_ms', 'dives', 'picks',
  'homi_tier', 'engraves',
];

export const GA4_REUSED_KEYS = [
  'mode', 'first', 'night', 'weather', 'run_id', 'attempt_n', 'items', 'coins', 'good', 'bad', 'rare', 'reason', 'duration_ms',
  'ease', 'dda', 'arm', 'probe_v',
];

const int = v => (Number.isFinite(v) ? Math.round(v) : null);
const pct = v => Math.round((((v % 1) + 1) % 1) * 100);
const r1 = v => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const r2 = v => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const nn = v => (v === undefined ? null : v);

export const appendCapped = (list, item, cap = MAX_SEQ) => (list.length >= cap ? list : [...list, item]);

export const mudAct = (tMs, phase, hit, depth, spIdx) => [Math.round(tMs), pct(phase), hit ? 1 : 0, depth, spIdx];
export const diveLeg = (n, startMs, endMs, maxDepth, items, airLeft, outOfAir) =>
  [n, Math.round(startMs), Math.round(endMs), Math.round(maxDepth * 10), items, Math.round(airLeft * 100), outOfAir ? 1 : 0];
export const divePick = (tMs, depth, spIdx, air) => [Math.round(tMs), Math.round(depth * 10), spIdx, Math.round(air * 100)];

const bagOf = summary => Object.fromEntries(summary.items.map(it => [it.id, it.count]));
const rareOf = summary => summary.items.filter(it => it.rare).reduce((a, it) => a + it.count, 0);

export function forageRow({
  ctx, outcome, abandonStage = null, endReason, durationMs, summary, good, bad,
  acts = null, lostTide = null, lostMiss = null, idleMs = null, dives = null, picks = null, fpsAvg = null,
}) {
  const dp = ctx.diff || {};
  const p = ctx.params || {};
  return {
    run_id: ctx.runId,
    mode: ctx.mode,
    logic_v: FORAGE_LOGIC_V,
    outcome,
    abandon_stage: abandonStage,
    end_reason: endReason,
    duration_ms: int(durationMs),
    items: summary.count,
    coins: summary.coins,
    sell_value: summary.sellValue,
    rare_count: rareOf(summary),
    good,
    bad,
    bag: bagOf(summary),
    attempt_n: nn(ctx.attemptN),
    first_time: !!ctx.firstTime,
    entry: nn(ctx.entry),
    prev_mode: nn(ctx.prevMode),
    night: !!ctx.night,
    weather: nn(ctx.weather),
    season: nn(ctx.season),
    input: nn(ctx.input),
    orientation: nn(ctx.orientation),
    fps_avg: r1(fpsAvg),
    coins_before: int(ctx.coinsBefore),
    ease: r2(dp.ease),
    arm: nn(dp.arm),
    dda: r2(dp.dda),
    probe_v: nn(dp.probe_v),
    win: nn(p.win),
    breath_s: nn(p.breathS),
    tide_s: nn(p.tideS),
    homi_tier: nn(ctx.homi?.tier),
    engraves: ctx.homi ? [...ctx.homi.engraves] : null,
    acts,
    lost_tide: lostTide,
    lost_miss: lostMiss,
    idle_ms: int(idleMs),
    dives,
    picks,
  };
}

const diffKeys = dp => ({ ease: r2(dp?.ease), dda: r2(dp?.dda), arm: nn(dp?.arm), probe_v: nn(dp?.probe_v) });

export const pickEventParams = ({ mode, first, night, weather }) => ({ mode, first: first ? 1 : 0, night: night ? 1 : 0, weather: nn(weather) });

export const startEventParams = ctx => ({ mode: ctx.mode, run_id: ctx.runId, attempt_n: nn(ctx.attemptN), ...diffKeys(ctx.diff) });

export const resultEventParams = ({ ctx, summary, good, bad, endReason, durationMs }) => ({
  mode: ctx.mode,
  run_id: ctx.runId,
  items: summary.count,
  coins: summary.coins,
  good,
  bad,
  rare: rareOf(summary),
  reason: endReason,
  duration_ms: int(durationMs),
  ...diffKeys(ctx.diff),
});
