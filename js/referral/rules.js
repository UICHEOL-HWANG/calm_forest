// js/referral/rules.js
// =============================================================
//  calm forest · 🤝 친구 초대 — 클라이언트 규칙 (순수: DOM·네트워크·THREE 없음)
//  ------------------------------------------------------------
//  계획: dev/active/referral-reward/referral-reward-plan.md
//  ▶ 판정·지급은 서버(SQL referral_bind/claim)가 한다. 여기는 "언제 부를지·무슨 말을 할지"만.
//  ▶ ?ref= ?from= 은 GA 캠페인 소스(js/analytics.js) — 초대 코드는 ?invite= 로만 읽는다.
//  ▶ 문구는 사용자 검수를 거친 값(2026-10-08 추천안 A) — 바꾸려면 다시 검수. 숫자 자리는 {0#}(i18n 패턴 키).
//  ▶ 테스트: tests/referral-rules.test.mjs
// =============================================================

export const INVITE_STORE_KEY = 'cf_invite';          // 구글 OAuth 리다이렉트가 쿼리를 지우므로 도착 즉시 보관
export const WEB_ORIGIN = 'https://calmforest.cloud';
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export const TIERS = Object.freeze([
  Object.freeze({ need: 1, ico: '⭐', item: 'tools_star' }),
  Object.freeze({ need: 3, ico: '🌈', item: 'friendarch' }),
  Object.freeze({ need: 5, ico: '🦋', item: 'friend_wing' }),
]);

export const MSG = Object.freeze({
  menu: '친구 초대',
  title: '🤝 친구를 숲으로 초대해요',
  desc: '링크로 들어온 친구가 이틀 동안 숲에서 지내면 선물이 와요',
  now: '지금 {0#}명',
  tierNeed: '{0#}명 초대',
  pending: '숲에 막 온 친구 {0#}명 — 이틀 지내면 함께 셀게요',
  copy: '🔗 링크 복사',
  share: '📤 공유하기',
  copied: '링크를 복사했어요',
  guest: '로그인하면 초대 링크를 만들 수 있어요',
  loadFail: '초대 링크를 불러오지 못했어요. 잠시 후 다시 열어 주세요',
  banner: '💗 친구가 숲으로 초대했어요! 로그인하면 우정 하트핀을 드려요',
  bindOk: '💗 우정 하트핀이 도착했어요 · 옷장에서 달아 보세요',
  notNew: '초대 선물은 새로 숲에 온 친구만 받을 수 있어요',
  self: '내 초대 링크로는 받을 수 없어요',
  invalid: '초대 링크가 올바르지 않아요',
  shareText: '🌲 조용한 숲에서 같이 농사짓자! 이 링크로 오면 선물이 있어 →',
});

/** location.search → 초대 코드(대문자) | null */
export function readInviteParam(search) {
  let raw = null;
  try { raw = new URLSearchParams(search || '').get('invite'); } catch (e) { return null; }
  const code = String(raw ?? '').trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

/** 로그인(비익명) 계정이고 보관한 코드가 있을 때만 서버에 연결을 청한다 */
export function shouldBind({ pendingCode, isGuest, provider }) {
  return !!pendingCode && !isGuest && provider !== 'offline' && provider !== 'anonymous';
}

/** 활성 친구 수 → 단계별 달성 여부 */
export function tierView(active) {
  const n = Number.isFinite(active) ? active : 0;
  return TIERS.map(t => ({ ...t, done: n >= t.need }));
}

export function inviteUrl(code) {
  return `${WEB_ORIGIN}/?invite=${code}`;
}

/** bind 결과 → 토스트 문구. null = 말하지 않는다(이미 연결됨·익명·네트워크 실패) */
export function bindMessage(res) {
  if (!res || res.error) return null;
  if (res.ok) return MSG.bindOk;
  switch (res.reason) {
    case 'not_new': return MSG.notNew;
    case 'self': return MSG.self;
    case 'bad_code': case 'too_many': case 'inviter_full': case 'cycle': return MSG.invalid;
    default: return null;
  }
}

/** 네트워크·서버 오류면 코드를 남겨 다음 부팅에 다시. 서버가 답을 줬으면(성공·거절) 지운다 */
export function keepPendingAfter(res) {
  return !res || !!res.error;
}
