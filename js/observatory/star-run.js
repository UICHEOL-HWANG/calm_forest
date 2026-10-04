// =============================================================
//  🔭 별 잇기 정산 — 하루 1회 보상·세이브 상태
//  ------------------------------------------------------------
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//  ▶ 그날 첫 **성공**만 코인을 준다. 실패는 그날을 쓰지 않는다(다시 해서 받을 수 있다).
//  ▶ 같은 날 재도전은 연습 — 보상 0. 날짜는 gameState.starDay(마지막으로 받은 날).
// =============================================================
import { gameState, giveReward, requestSave, todayStr } from '../game.js';   // 🔁 순환 import — 함수 안에서만
import { rewardFor } from './rhythm.js';

/** 결과를 정산하고 실제로 준 코인을 돌려준다(결과 카드는 이 값만 보여 준다). */
export function starSettle(summary) {
  const today = todayStr();
  const alreadyToday = gameState.starDay === today;
  const { coins } = rewardFor(summary, alreadyToday);
  if (coins > 0) {
    giveReward({ coins }, 'star_rhythm', 'big_dipper');   // [원장] econ_logs source='star_rhythm'
    gameState.starDay = today;
    requestSave();
  }
  return { coins, alreadyToday };
}
