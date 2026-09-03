// =============================================================
//  calm forest · 베타 A/B 변형 파라미터 (docs/BETA_AB_TEST_PLAN.md)
//  ------------------------------------------------------------
//  A군(beta_A)에만 적용되는 개편 3종의 수치를 한 곳에 모은다.
//  배정 자체는 supabase-client.js(명단 테이블), 적용은 game.js/index.html.
// =============================================================

export const TUNING = {
  // 보상 부스트 — 가입(created_at) 후 N일간, 출석·퀘스트·판매 코인 ×mult
  rewardBoost: { days: 3, mult: 1.5, sources: ['daily_bonus', 'quest_reward', 'lucky_box'] },
  // 관대 판정 — 미니게임별 첫 tries회 시도는 판정 계수 ×mult
  firstTryEase: { tries: 3, mult: 1.3 },
  // A군 튜토리얼 순서 — 재미(낚시·집짓기·꾸미기) 전진. 스텝 내용은 index.html TUT_STEPS 그대로.
  TUT_ORDER_A: ['move', 'toolpage', 'chop', 'fish', 'build', 'enter', 'decor',
                'till', 'seed', 'water', 'harvest', 'sell', 'market', 'quest',
                'mine', 'carve', 'dex'],
};

export function isBetaA(variant) { return variant === 'beta_A'; }

// 가입 후 rewardBoost.days 이내의 A군이면 1.5, 아니면 1
export function rewardBoostMult(variant, createdAtIso) {
  if (!isBetaA(variant) || !createdAtIso) return 1;
  const days = (Date.now() - Date.parse(createdAtIso)) / 86400000;
  return (days >= 0 && days < TUNING.rewardBoost.days) ? TUNING.rewardBoost.mult : 1;
}

// 해당 미니게임 시도 횟수가 tries 미만인 A군이면 1.3, 아니면 1
export function easeMult(variant, tries) {
  return (isBetaA(variant) && (tries || 0) < TUNING.firstTryEase.tries)
    ? TUNING.firstTryEase.mult : 1;
}
