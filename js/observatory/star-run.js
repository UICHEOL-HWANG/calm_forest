// =============================================================
//  🔭 별 잇기 정산 — 하루 1회 보상·세이브 상태
//  ------------------------------------------------------------
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//  ▶ 그날 첫 **성공**만 코인을 준다. 실패는 그날을 쓰지 않는다(다시 해서 받을 수 있다).
//  ▶ 같은 날 재도전은 연습 — 보상 0. 날짜는 gameState.starDay(마지막으로 받은 날).
// =============================================================
import { diffParams, gameState, giveReward, requestSave, settleDifficulty, todayStr } from '../game.js';   // 🔁 순환 import — 함수 안에서만
import { trackEvent } from '../analytics.js';
import { ddaOutcome } from '../difficulty.js';
import { rewardFor } from './rhythm.js';

/**
 * 끝까지 간 판을 정산하고 실제로 준 코인을 돌려준다(결과 카드는 이 값만 보여 준다).
 * run: { judges[], offsets[] (탭한 노트만, ms), durationMs } · diff: rollDifficulty('star') 결과(없으면 DDA 안 움직임)
 */
export function starSettle(summary, run = {}, diff = null) {
  const today = todayStr();
  const alreadyToday = gameState.starDay === today;
  const { coins } = rewardFor(summary, alreadyToday);
  if (coins > 0) {
    giveReward({ coins }, 'star_rhythm', 'big_dipper');   // [원장] econ_logs source='star_rhythm'
    gameState.starDay = today;
    requestSave();
  }
  if (diff) settleDifficulty('star', ddaOutcome('star', summary));   // 🎚️ 점수/14
  // [GA4] 식별자·숫자만. 배열은 쉼표 문자열로(요리 cooking_result 와 같은 모양 — GA4 파라미터는 배열을 못 받는다)
  trackEvent('star_result', {
    constellation: 'big_dipper', success: summary.success ? 1 : 0,
    perfect: summary.perfect, good: summary.good, miss: summary.miss, max_combo: summary.maxCombo, score: summary.score,
    coins, already_today: alreadyToday ? 1 : 0,
    offsets: (run.offsets || []).map(v => Math.round(v)).join(','),
    judges: (run.judges || []).join(','),
    duration_ms: Math.round(run.durationMs || 0),
    ...(diff ? diffParams(diff) : {}),
  });
  return { coins, alreadyToday };
}
