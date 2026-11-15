// js/referral/rules.js
// =============================================================
//  calm forest · 🤝 친구 초대 — 클라이언트 규칙 (순수: DOM·네트워크·THREE 없음)
//  ------------------------------------------------------------
//  계획: dev/archive/referral-reward/referral-reward-plan.md
//  ▶ 판정·지급은 서버(SQL referral_bind/claim)가 한다. 여기는 "언제 부를지·무슨 말을 할지"만.
//  ▶ ?ref= ?from= 은 GA 캠페인 소스(js/analytics.js) — 초대 코드는 ?invite= 로만 읽는다.
//  ▶ 문구는 사용자 검수를 거친 값(2026-10-08 추천안 A) — 바꾸려면 다시 검수. 숫자 자리는 {0#}(i18n 패턴 키).
//  ▶ 테스트: tests/referral-rules.test.mjs
// =============================================================

export const INVITE_STORE_KEY = 'cf_invite';          // 구글 OAuth 리다이렉트가 쿼리를 지우므로 도착 즉시 보관
export const WEB_ORIGIN = 'https://calmforest.cloud';
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export const TIERS = Object.freeze([
  Object.freeze({ need: 1, ico: '💎', item: 'tools_star' }),
  Object.freeze({ need: 3, ico: '🌈', item: 'friendarch' }),
  Object.freeze({ need: 5, ico: '🦋', item: 'friend_wing' }),
]);

export const MSG = Object.freeze({
  menu: '친구 초대',
  title: '🤝 친구를 숲으로 초대해요',
  desc: '초대장을 받고 2일 이상 플레이하면 선물이 와요!',
  now: '지금 {0#}명',
  tierNeed: '{0#}명 초대',
  pending: '숲에 막 온 친구 {0#}명 — 이틀 지내면 함께 셀게요',
  copy: '🔗 링크 복사',
  share: '📤 공유하기',
  copied: '링크를 복사했어요',
  guest: '로그인하면 초대 링크를 만들 수 있어요',
  loadFail: '초대 링크를 불러오지 못했어요. 잠시 후 다시 열어 주세요',
  banner: '💗 친구가 숲으로 초대했어요! 로그인하면\n우정 하트핀을 드려요',
  bindOk: '💗 우정 하트핀이 도착했어요 · 옷장에서 달아 보세요',
  notNew: '초대 선물은 새로 숲에 온 친구만 받을 수 있어요',
  self: '내 초대 링크로는 받을 수 없어요',
  invalid: '초대 링크가 올바르지 않아요',
  shareText: '🌲 고요한 숲에서 같이 플레이하자! 이 링크로 오면 선물이 있어 →',
  entryTitle: '친구에게 초대받았나요?',
  entryHint: '초대 코드 8자리를 넣어 주세요',
  entryBtn: '확인',
  entryBad: '초대 코드 8자리를 다시 확인해 주세요',
  alreadyBound: '이미 친구와 연결되어 있어요',
  bannerCode: '초대 코드 {0} · 앱에서 입력해도 받을 수 있어요',
});

const PATH_RE = /^(?:https?:\/\/[^/?#]+)?\/i\/([^/?#]+)\/?(?:[?#]|$)/i;

const asCode = (raw) => {
  const code = String(raw ?? '').trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
};

/** location.search 또는 토스 진입 스킴 URL(intoss://calmforest?invite=…) → 초대 코드(대문자) | null */
export function readInviteParam(search) {
  let raw = null;
  const str = String(search || '').split('#')[0];   // # 조각이 코드 끝에 붙으면 형식 검사에서 버려진다
  const path = str.match(PATH_RE);
  if (path) return asCode(path[1]);
  const q = str.indexOf('?');   // 전체 URL 이면 ? 뒤만 — 스킴 URL 은 URL() 로 파싱하면 호스트·경로 해석이 브라우저마다 다르다
  try { raw = new URLSearchParams(q >= 0 ? str.slice(q) : str).get('invite'); } catch (e) { return null; }
  return asCode(raw);
}

export function inviteFromReferrer(raw) {
  let text = String(raw || '').trim();
  if (!text) return null;
  if (!text.includes('=') && /%3d/i.test(text)) {
    try { text = decodeURIComponent(text); } catch (e) { return null; }
  }
  try { return asCode(new URLSearchParams(text).get('invite')); } catch (e) { return null; }
}

export function normalizeInviteCode(text) {
  const s = String(text || '').trim();
  const fromLink = readInviteParam(s);
  if (fromLink) return fromLink;
  return asCode(s.replace(/[\s-]+/g, ''));
}

const ENTRY_WINDOW_MS = 72 * 3600 * 1000;

export function canEnterCode({ isGuest, provider, createdAt, now = Date.now(), bound }) {
  if (isGuest || bound || provider === 'offline' || provider === 'anonymous') return false;
  const t = Date.parse(createdAt || '');
  return Number.isFinite(t) && now - t < ENTRY_WINDOW_MS;
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
  return `${WEB_ORIGIN}/i/${code}`;
}

/** 토스 앱인토스 이름 — apps-in-toss.config.ts appName 과 같아야 한다 */
export const TOSS_APP = 'calmforest';
/** 토스 안에서 보낼 링크의 딥링크 경로 — getTossShareLink 가 https 공유 링크로 바꿔 준다.
 *  받는 친구는 토스 앱에서 바로 열리고(없으면 스토어), 진입 URL(Environment.initialURL)에 ?invite= 가 담겨 온다 */
export function tossInvitePath(code) {
  return `intoss://${TOSS_APP}?invite=${code}`;
}

/** bind 결과 → 토스트 문구. null = 말하지 않는다(이미 연결됨·익명·네트워크 실패) */
export function bindMessage(res, { manual = false } = {}) {
  if (!res || res.error) return null;
  if (res.ok) return MSG.bindOk;
  switch (res.reason) {
    case 'already_bound': return manual ? MSG.alreadyBound : null;
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
