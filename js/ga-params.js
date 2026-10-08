// =============================================================
//  calm forest · GA4 예약 파라미터 가드
//  ------------------------------------------------------------
//  GA4 는 이벤트 파라미터 source/medium/campaign/term/content 를
//  '수동 캠페인 태깅'으로 읽어 그 세션의 유입 소스를 통째로 덮어씁니다.
//  게임 내부 출처(econ_tx 의 source='daily_bonus' 등)가 인스타·검색 유입을
//  지워버린 사고가 있었습니다(2026-09-14, 30일 세션의 38%가 오염).
//  → GA4 로 나가기 직전에만 안전한 이름으로 바꿉니다.
//    내부 훅(metrics 카운터)·Supabase 원장(econ_logs)은 원래 이름 그대로.
// =============================================================

// GA4 가 트래픽 소스로 가로채는 이벤트 파라미터 → 대체 이름
export const RESERVED_TRAFFIC_KEYS = {
  source: 'src',
  medium: 'med',
  campaign: 'camp',
  campaign_id: 'camp_id',
  term: 'kw',
  content: 'variant',
};

// 예약 키만 바꾼 새 객체를 돌려줍니다(원본 불변).
export function renameReservedParams(params = {}) {
  return Object.entries(params).reduce(
    (acc, [k, v]) => ({ ...acc, [RESERVED_TRAFFIC_KEYS[k] || k]: v }),
    {},
  );
}

// GA4 는 이벤트당 파라미터 25개까지만 받고 남는 값은 조용히 버린다.
//   2026-10-08 cooking_result(28)·star_result(26)에서 판마다 값이 무작위로 빠진 것을 발견 →
//   무거운 배열은 *_detail 이벤트로 나누고, 넘치면 ga_param_overflow 로 알린다.
export const GA_PARAM_LIMIT = 25;

// 실제로 전송되는 값(null·undefined 제외)이 한도를 몇 개 넘는지. 넘지 않으면 0.
export function overParamLimit(params = {}) {
  const sent = Object.values(params).filter(v => v !== null && v !== undefined).length;
  return Math.max(0, sent - GA_PARAM_LIMIT);
}
