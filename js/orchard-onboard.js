// =============================================================
//  calm forest · 🌾→🍎 과수원 온보딩 의뢰 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  왜: 과수원 해금 조건(고급 작물 1회 수확)을 알려주는 곳이 없어 9/18~9/29 349명 중 1명만 열었다.
//      조건은 그대로 두고 **가는 길**만 깐다 — 기본 작물을 처음 거두면 농부 삼촌이 밀 씨앗을 쥐여 준다.
//  ▶ 주민에게 말을 걸어야 시작하는 의뢰는 도달률 1~3% 라 자동으로 건다(수락 단계 없음).
//  ▶ 끝은 기존 해금(bumpAdvHarvest)이 그대로 판정한다 — 이 모듈은 해금 조건을 바꾸지 않는다.
//  ▶ 세이브: progress.orchardQuest ('plant'|'grow'|'done') · progress.orchardRefill (boolean)
//  ▶ 테스트: tests/orchard-onboard.test.mjs
// =============================================================

export const ONBOARD_SEEDS = { seed_wheat: 3 };      // 밀 — 가장 싸고(6🪙) 지지대가 필요 없다
const ADV_SEED_KEYS = ['seed_wheat', 'seed_corn', 'seed_grape'];
export const ONBOARD_STAGES = ['plant', 'grow', 'done'];

/** 의뢰를 걸 차례인가 — 아직 안 받았고, 과수원도 안 열린 유저 */
export function shouldOffer(progress = {}) {
  const p = progress || {};
  return !p.orchardQuest && !((p.advHarvest || 0) >= 1);
}

/** 고급 씨앗을 심었을 때 다음 단계 */
export function afterAdvPlant(stage) { return stage === 'plant' ? 'grow' : stage; }

/** 과수원이 열렸을 때 다음 단계 — 의뢰를 받은 적 없는 유저(undefined)는 그대로 */
export function afterUnlock(stage) { return stage ? 'done' : stage; }

/** 심기 전에 고급 씨앗을 다 써버렸으면 한 번만 다시 준다 */
export function needsRefill(progress = {}, inv = {}) {
  const p = progress || {};
  if (p.orchardQuest !== 'plant' || p.orchardRefill) return false;
  return ADV_SEED_KEYS.every(k => (inv[k] || 0) <= 0);
}

/** 📜 의뢰 패널 카드 — js/spaces/npc.js refreshQuestPanel 이 주민 의뢰와 나란히 그린다.
 *  progress 는 target 에 닿지 않는다 — 끝나면 카드가 사라지므로 "✅ 주민에게 가기" 상태로 보일 일이 없다. */
export function onboardView(stage) {
  const base = { id: 'orchard_onboard', name: '농부 삼촌', title: '🍎 과수원 가는 길', target: 2 };   // 심기 → 거두기 두 걸음
  if (stage === 'plant') return { ...base, progress: 0, desc: '🌾 밀 씨앗 심기', how: '🌰 씨앗 도구로 빈 밭에 심어요' };
  if (stage === 'grow')  return { ...base, progress: 1, desc: '🌾 밀 거두기', how: '물 주고 다 자라면 🌾 낫으로 거둬요' };
  return null;
}

/** 세이브 복원 — 모르는 값·없는 값은 undefined(다른 계정 상태가 새지 않게),
 *  이미 열린 과수원(advHarvest ≥ 1)의 진행 중 의뢰는 done(디버그 해금·옛 세이브로 카드가 영영 남지 않게) */
export function restoreStage(stage, advHarvest = 0) {
  if (!ONBOARD_STAGES.includes(stage)) return undefined;
  return (advHarvest || 0) >= 1 ? 'done' : stage;
}

/** 배너 문구 — 한 곳에서만 만든다(i18n 은 통문장 사전) */
export const ONBOARD_LINES = {
  title: '농부 삼촌',
  offer: '동쪽 언덕에 과수원이 있어요 — 🌾 밀을 한 번 길러 거두면 열려요! 씨앗 3개 줄게요',
  refill: '🌾 밀 씨앗이 없네요 — 3개 더 줄게요. 빈 밭에 심어요',
};
