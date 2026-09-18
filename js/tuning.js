// =============================================================
//  calm forest · 베타 A/B 변형 파라미터 (docs/beta/BETA_AB_TEST_PLAN.md)
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
  // 🎯 이탈 예측 개입 — 임계값·on/off 는 서버(coef.json)에 있다. 여기는 클라이언트 값만.
  churn: {
    endpoint: 'https://lab.calmforest.cloud/predict',
    timeoutMs: 800,        // 넘으면 개입 없이 진행(fail-open)
    maxPerSession: 2,      // 세션당 배너 노출 상한
    treatRate: 0.5,        // 세션 단위 개입 배정 확률 — 0 이면 개입 전면 off
    timeTriggerSec: 15,    // 시간 트리거 — 설계서 §3-1(커버리지 84%)
  },
  // 🌿 리텐션 안내 — 모델 서버 없이 1차 룰로 실제 배너를 띄운다.
  // 모델 점수는 나중에 들어오면 rule-low 구간 rescue 로만 쓰도록 js/retention-guidance.js 에 자리를 열어둔다.
  retentionGuidance: {
    // ⏸️ 꺼 둔다(2026-09-19) — 배너 한국어 문구 10종이 아직 검수 전이고,
    //    js/retention-guidance.js 가 i18n 을 안 거쳐 영어 모드에서 한국어가 그대로 뜬다.
    //    문구 확정 + i18n-en.js 등재가 끝나면 true 로 되돌린다.
    enabled: false,
    highTracked: 20,
    highActions: 6,
    modelThreshold: 0.285,
    triggerSec: [180, 600],   // 3분: 진입 보조 / 10분: 다음 콘텐츠
    maxPerSession: 1,
    cooldownMs: 180000,
    outcomeWindowMs: 600000,
    policyVersion: 'retention-guidance-rules-2026-09-18',
  },
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

// =============================================================
//  🧪 베타 2차 (2026-09-06) — 맵 계단식 열기 · 문구 (docs/beta/BETA_AB_TEST_PLAN.md 2차 설계 §5)
//  잠금 대상은 beta_A/beta_B 뿐. 판정은 여기 순수 함수로, game.js 는 부르기만 한다.
// =============================================================
export const BETA = {
  startDate: '2026-09-09',                       // D1 = max(시작일, 가입일 KST)
  endDate: '2026-09-15',                         // 마지막 날 — 늦게 시작한 테스터도 이 날엔 최종 문항을 본다
  mapGate: {
    sea_first:  { sea: 3, mist: 5 },
    mist_first: { sea: 5, mist: 3 },
  },
};

export const BETA_COPY = {
  diaryBtn: '📝 오늘 일지',
  diaryTitle: '고요한 숲 베타 일지',
  lock: { sea: '🌊 바다터는 {N}일차에 열려요', mist: '🌫️ 안개 낀 숲은 {N}일차에 열려요',
          orchard: '🔒 🌾고급 작물을 한 번 거두면 열려요' },   // 🍎 진행도 게이트라 {N}(날짜)이 없다 — replace 가 그대로 통과한다
  open: {
    sea:  '🌊 바다터가 열렸어요 — 먼 바다 대형 물고기와 줄다리기',
    mist: '🌫️ 안개 낀 숲이 열렸어요 — 등불과 ♪음악으로 안개를 정화하는 숲',
  },
};

/** ms → KST 날짜 'YYYY-MM-DD'. 서버·브라우저 시간대와 무관하게 한국 날짜로 센다. */
export function kstDate(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

const DAY_MS = 86400000;
function dateToMs(ymd) { return Date.parse(ymd + 'T00:00:00Z'); }

/** 며칠째인가. D1 = max(시작일, 가입일). 시작 전날은 0, created_at 이 없으면 1. */
export function betaDay(createdAtIso, nowMs = Date.now()) {
  if (!createdAtIso) return 1;
  const d1 = Math.max(dateToMs(BETA.startDate), dateToMs(kstDate(Date.parse(createdAtIso))));
  return Math.floor((dateToMs(kstDate(nowMs)) - d1) / DAY_MS) + 1;
}

/** 이 순서에서 이 맵이 열리는 날. 배정이 없으면 null(= 잠그지 않는다). */
export function mapOpenDay(mapOrder, map) {
  return BETA.mapGate[mapOrder]?.[map] ?? null;
}

/** 진행도 해금 표 — 날짜가 아니라 "무엇을 해냈나"로 여는 공간.
 *  세이브 기반이라 유저마다 열리는 시점이 자연히 다르다. */
export const PROGRESS_GATE = {
  orchard: { kind: 'advHarvest', n: 1 },   // 🌾고급 작물(밀·옥수수·포도) 1회 수확
};

/** 진행도 게이트로 잠겼나. 표에 없는 맵은 잠그지 않는다. */
export function isProgressLocked(map, progress) {
  const g = PROGRESS_GATE[map];
  if (!g) return false;
  return ((progress || {})[g.kind] || 0) < g.n;
}

/** 잠겼나 — 베타 날짜 게이트 **또는** 진행도 게이트. 둘 중 하나라도 잠그면 잠긴다. */
export function isMapLocked({ variant, mapOrder, createdAtIso, progress, nowMs = Date.now() }, map) {
  if (isProgressLocked(map, progress)) return true;
  if (!/^beta_/.test(variant || '')) return false;
  const openDay = mapOpenDay(mapOrder, map);
  if (openDay == null) return false;
  return betaDay(createdAtIso, nowMs) < openDay;
}

export function lockLine(map, openDay) { return BETA_COPY.lock[map].replace('{N}', String(openDay)); }
export function openLine(map) { return BETA_COPY.open[map]; }

/** 최종 문항(D7)을 보여줄 날인가 — 7일차이거나, 늦게 시작해 7일차가 안 와도 종료일이면 true. */
export function isFinalDay(createdAtIso, nowMs = Date.now()) {
  return betaDay(createdAtIso, nowMs) >= 7 || kstDate(nowMs) >= BETA.endDate;
}
