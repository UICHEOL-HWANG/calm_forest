// js/referral/flow.js
// =============================================================
//  calm forest · 🤝 친구 초대 흐름 — 부팅 보관 · 로그인 후 연결(bind) · 정산(claim)
//  ------------------------------------------------------------
//  ▶ 의존성은 전부 인자로 받는다(storage·call·toast·track·resync) — DOM·네트워크 없이 테스트한다.
//    실제 바인딩은 js/referral/index.js.
//  ▶ GA4 이벤트(파라미터 ≤ 5 — dev/active/referral-reward 계획 §트래킹):
//      invite_land {}                         초대 링크로 처음 도착(같은 코드 재방문은 안 셈)
//      referral_bind { result }               'ok' | 서버 거절 사유 | 'net_fail'
//      referral_reward_grant { item_id, tier } 정산으로 새로 받은 단계 보상
//    활성화·지급의 진실은 서버 테이블(referrals·purchases) — GA4 는 퍼널 보조.
//  ▶ 테스트: tests/referral-flow.test.mjs
// =============================================================
import { INVITE_STORE_KEY, TIERS, readInviteParam, shouldBind, bindMessage, keepPendingAfter } from './rules.js';

const safe = (fn, fallback = null) => { try { return fn(); } catch (e) { return fallback; } };

/** 부팅 즉시 — ?invite= 를 보관(구글 OAuth 가 쿼리를 지운다). 보관 중인 코드를 돌려준다 */
export function captureInvite({ search, storage, track }) {
  const code = readInviteParam(search);
  const kept = safe(() => storage.getItem(INVITE_STORE_KEY));
  if (code && code !== kept) {
    safe(() => storage.setItem(INVITE_STORE_KEY, code));
    track('invite_land', {});
    return code;
  }
  return kept || null;
}

export const pendingInvite = (storage) => safe(() => storage.getItem(INVITE_STORE_KEY)) || null;

/** 플레이 진입 후 — ① 초대받은 사람이면 연결 ② 내가 초대한 친구 정산. 정산 결과(또는 null)를 돌려준다 */
export async function runOnPlay({ storage, call, toast, track, resync, platform, auth }) {
  if (!auth || auth.isGuest || auth.provider === 'offline' || auth.provider === 'anonymous') return null;

  const code = pendingInvite(storage);
  if (shouldBind({ pendingCode: code, isGuest: auth.isGuest, provider: auth.provider })) {
    const res = await call('bind', { code, platform });
    track('referral_bind', { result: !res || res.error ? 'net_fail' : res.ok ? 'ok' : String(res.reason || 'unknown') });
    const msg = bindMessage(res);
    if (msg) toast(msg);
    if (!keepPendingAfter(res)) safe(() => storage.removeItem(INVITE_STORE_KEY));
    if (res?.ok) await resync('referral_bind', { quiet: true });   // 하트핀 문구를 방금 띄웠다 — 도착 토스트 겹침 방지
  }

  return claimAndApply({ call, track, resync });
}

/** 내가 초대한 친구 정산 — 새 단계 보상이 있으면 원장을 다시 받아 게임에 반영한다. 결과(또는 null) */
export async function claimAndApply({ call, track, resync }) {
  const claim = await call('claim', {});
  if (!claim || claim.error) return null;
  const granted = Array.isArray(claim.granted) ? claim.granted : [];
  for (const id of granted) track('referral_reward_grant', { item_id: id, tier: TIERS.find(t => t.item === id)?.need ?? 0 });
  if (granted.length) await resync('referral_claim');
  return claim;
}
