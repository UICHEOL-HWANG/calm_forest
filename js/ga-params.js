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
