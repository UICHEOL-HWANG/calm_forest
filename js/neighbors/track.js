// =============================================================
//  🏡 이웃 마을 GA4 이벤트 — 순수 빌더(스펙 §7). 호출부: trackEvent(...evX(...))
//  식별자: 이웃 = public_id(무작위, PII 아님) · 반응 = wave|heart|flower|star. 예약어 금지(js/ga-params.js).
//  다음날 BQ 재검증: 7종 적재 · host 가 uuid 형식 · dev 세션 제외(trackEvent 가 IS_DEV_SESSION 이면 안 보낸다)
// =============================================================
export const evOpen = (today, via) =>
  ['neighbors_open', { shown: (today.list || []).length, rewarded_today: today.rewardedToday | 0, via }];
export const evVisitStart = ({ publicId, slot, revisit, loadMs }) =>
  ['neighbor_visit_start', { host: publicId, slot, revisit: revisit ? 1 : 0, load_ms: Math.round(loadMs || 0) }];
export const evReact = (publicId, emoji, outcome) =>
  ['neighbor_react', { host: publicId, emoji, rewarded: outcome.reward ? 1 : 0, reason: outcome.reason }];
export const evVisitEnd = (publicId, sec, reacted) =>
  ['neighbor_visit_end', { host: publicId, sec: Math.max(0, Math.round(sec)), reacted: reacted ? 1 : 0 }];
export const evNotice = (n, total) => ['neighbor_visitors_notice', { n, total }];
export const evToggle = (on) => ['village_public_toggle', { on: on ? 1 : 0 }];
export const evFail = (stage, code) => ['neighbor_load_fail', { stage, code: String(code ?? 'unknown') }];
