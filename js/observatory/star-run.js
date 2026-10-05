// =============================================================
//  🔭 별 잇기 정산 — 하루 1회 보상·별자리 해금·학습용 기록
//  ------------------------------------------------------------
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//  ▶ 그날 첫 **성공**만 코인을 준다(별자리 무관 하루 1회). 실패는 그날을 쓰지 않는다.
//  ▶ 별자리를 처음 깨면 1회 보너스 +30 — 그리고 다음 별자리가 열린다(해금은 cleared 로 계산).
//  ▶ 판마다 같은 run_id 로 GA4(star_start/star_result/minigame_abandon)와 Supabase star_runs 1행을 남긴다.
// =============================================================
import { diffParams, gameState, giveReward, requestSave, settleDifficulty, todayStr, trackDiffAbandon } from '../game.js';   // 🔁 순환 import — 함수 안에서만
import { trackEvent } from '../analytics.js';
import { sendStarRun } from '../supabase-client.js';
import { ddaOutcome } from '../difficulty.js';
import { BY_ID, maxScore, noteCount, unlockedIds } from './constellations.js';
import { rewardFor, summarize } from './rhythm.js';

export const FIRST_CLEAR_COINS = 30;

/** gameState.star — 없거나 깨진 값이면 빈 기록(옛 세이브·테스트 컨텍스트) */
export function starState() {
  const s = gameState.star || {};
  return { cleared: { ...(s.cleared || {}) }, plays: { ...(s.plays || {}) }, best: { ...(s.best || {}) } };
}

/** 렌즈가 열린 판의 시작 — 별자리별 시도 횟수를 올리고 star_start 를 보낸다 */
export function starBegin(c, diff, runId) {
  const st = starState();
  const attemptN = (st.plays[c.id] || 0) + 1;
  const unlockedN = unlockedIds(st.cleared).length;
  gameState.star = { ...st, plays: { ...st.plays, [c.id]: attemptN } };
  requestSave();   // 포기한 판도 시도 횟수는 남긴다 — 안 그러면 새로고침 뒤 attempt_n 이 되풀이된다
  trackEvent('star_start', {
    constellation: c.id, notes: noteCount(c), run_id: runId, attempt_n: attemptN, unlocked_n: unlockedN,
    ...(diff ? diffParams(diff) : {}),
  });
  return { attemptN, unlockedN };
}

/** star_runs 한 행 — 컬럼은 sql/migrations/migrate_star_runs.sql 과 같다(고정 컬럼 insert) */
function starRow({ c, runId, attemptN, unlockedN }, outcome, reason, summary, run, diff, pay) {
  const dp = diff ? diffParams(diff) : {};
  return {
    run_id: runId, constellation: c.id, notes: noteCount(c), tempo: c.tempo ?? 1,
    attempt_n: attemptN ?? null, unlocked_n: unlockedN ?? null,
    outcome, abandon_reason: reason,
    perfect: summary.perfect, good: summary.good, miss: summary.miss, early_taps: run.earlyTaps || 0,
    max_combo: summary.maxCombo, score: summary.score, max_score: maxScore(c),
    judges: [...(run.judges || [])],
    offsets: [...(run.noteOffsets || run.offsets || [])],   // 노트 순서, 시간 초과 miss 는 null
    duration_ms: Math.round(run.durationMs || 0),
    coins: pay.coins, already_today: pay.alreadyToday, first_clear: pay.firstClear, unlocked_next: pay.unlockedNext,
    ease: dp.ease ?? null, arm: dp.arm ?? null, dda: dp.dda ?? null, probe_v: dp.probe_v ?? null,
  };
}

/**
 * 끝까지 간 판을 정산하고 실제로 준 코인을 돌려준다(결과 카드는 이 값만 보여 준다).
 * run: { judges[], offsets[] (탭한 노트만), noteOffsets[] (노트 순서·miss=null), earlyTaps, durationMs }
 * diff: rollDifficulty('star') 결과(없으면 DDA 안 움직임) · ctx: { c, runId, attemptN, unlockedN }
 */
export function starSettle(summary, run = {}, diff = null, ctx = {}) {
  const c = ctx.c || BY_ID.big_dipper;
  const today = todayStr();
  const alreadyToday = gameState.starDay === today;
  const { coins } = rewardFor(summary, alreadyToday);
  if (coins > 0) {
    giveReward({ coins }, 'star_rhythm', c.id);   // [원장] econ_logs source='star_rhythm', item=별자리
    gameState.starDay = today;
  }

  const st = starState();
  const firstClear = !!summary.success && !st.cleared[c.id];
  const bonus = firstClear ? FIRST_CLEAR_COINS : 0;
  if (bonus) giveReward({ coins: bonus }, 'star_first_clear', c.id);   // [원장] 별자리마다 1회
  const before = unlockedIds(st.cleared).length;
  const cleared = firstClear ? { ...st.cleared, [c.id]: today } : st.cleared;
  const opened = unlockedIds(cleared);
  const unlockedNext = opened.length > before ? opened.at(-1) : null;
  const bestUp = (summary.score || 0) > (st.best[c.id] || 0);
  gameState.star = { ...st, cleared, best: bestUp ? { ...st.best, [c.id]: summary.score } : st.best };
  if (coins > 0 || firstClear || bestUp) requestSave();

  if (diff) settleDifficulty('star', ddaOutcome('star', summary));   // 🎚️ 점수/그 판 만점
  // [GA4] 식별자·숫자만. 배열은 쉼표 문자열로(요리 cooking_result 와 같은 모양 — GA4 파라미터는 배열을 못 받는다)
  trackEvent('star_result', {
    constellation: c.id, notes: noteCount(c), max_score: maxScore(c),
    success: summary.success ? 1 : 0,
    perfect: summary.perfect, good: summary.good, miss: summary.miss, max_combo: summary.maxCombo, score: summary.score,
    coins, bonus_coins: bonus, first_clear: firstClear ? 1 : 0, already_today: alreadyToday ? 1 : 0,
    offsets: (run.offsets || []).map(v => Math.round(v)).join(','),
    judges: (run.judges || []).join(','),
    duration_ms: Math.round(run.durationMs || 0), early_taps: run.earlyTaps || 0,
    run_id: ctx.runId || '', attempt_n: ctx.attemptN || 0, unlocked_n: ctx.unlockedN || 0,
    ...(diff ? diffParams(diff) : {}),
  });
  if (unlockedNext) trackEvent('star_unlock', { constellation: unlockedNext, from: c.id, run_id: ctx.runId || '' });

  const pay = { coins: coins + bonus, alreadyToday, firstClear, unlockedNext };
  if (ctx.runId) sendStarRun(starRow({ ...ctx, c }, summary.success ? 'success' : 'fail', null, summary, run, diff, pay));
  return { coins, bonus, alreadyToday, firstClear, unlockedNext };
}

/** 결과 전에 닫힌 판 — 포기도 표본(GA4 minigame_abandon + star_runs abandon 행). DDA·보상 없음 */
export function starAbandon(reason, run = {}, diff = null, ctx = {}) {
  const c = ctx.c || BY_ID.big_dipper;
  const judges = run.judges || [];
  trackDiffAbandon('star', diff, reason, { constellation: c.id, notes: noteCount(c), run_id: ctx.runId || '', done: judges.length });
  if (!ctx.runId) return;
  const pay = { coins: 0, alreadyToday: gameState.starDay === todayStr(), firstClear: false, unlockedNext: null };
  sendStarRun(starRow({ ...ctx, c }, 'abandon', reason, summarize(judges, noteCount(c)), run, diff, pay));
}
