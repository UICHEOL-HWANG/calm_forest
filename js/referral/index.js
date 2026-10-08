// js/referral/index.js
// =============================================================
//  calm forest · 🤝 친구 초대 — 실제 바인딩(네트워크·localStorage·DOM)
//  ------------------------------------------------------------
//  ▶ 규칙은 rules.js · 흐름은 flow.js(둘 다 테스트). 여기는 묶기만 한다(js/neighbors/net.js 와 같은 구조).
//  ▶ CONFIG.REFERRAL_ON 이 false 면 아무것도 하지 않는다 — 4곳 배포 후 켠다.
//  ▶ 🧪 dev 세션(?dbg 등)은 서버를 부르지 않는다 — 원장에 행을 남기는 경로라서(IS_DEV_SESSION 규칙).
// =============================================================
import { CONFIG, IS_DEV_SESSION } from '../config.js';
import { getAccessToken } from '../supabase-client.js';
import { PLATFORM } from '../platform.js';
import { captureInvite, runOnPlay, pendingInvite } from './flow.js';
import { MSG } from './rules.js';
import { renderInviteSheet } from './ui.js';

const enabled = () => !!CONFIG.REFERRAL_ON && !IS_DEV_SESSION;
const store = () => { try { return window.localStorage; } catch (e) { return null; } };
const memo = { claim: null };

async function call(action, body = {}) {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const r = await fetch(CONFIG.REFERRAL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }),
    });
    if (!r.ok) return { error: r.status };
    return await r.json();
  } catch (e) {
    console.warn('[referral] 호출 실패(무시):', action, e?.message || e);
    return null;
  }
}

/** ☰ 친구 초대 버튼을 보일까 */
export const referralEnabled = () => enabled();

/** 부팅 직후(로그인 전) — 코드 보관. 보관 중인 코드가 있으면 돌려준다 */
export function bootReferral({ track }) {
  if (!enabled()) return null;
  const s = store();
  return s ? captureInvite({ search: location.search, storage: s, track }) : null;
}

/** 로그인 화면 배너 문구 — 초대 링크로 왔고 아직 연결 전이면 */
export function inviteBanner() {
  if (!enabled()) return null;
  const s = store();
  return s && pendingInvite(s) ? MSG.banner : null;
}

/** enterGame 이후 — 연결·정산. 실패해도 게임엔 영향 없다 */
export async function referralOnPlay({ auth, toast, track, resync }) {
  if (!enabled()) return;
  const s = store();
  if (!s) return;
  try {
    memo.claim = await runOnPlay({ storage: s, call, toast, track, resync, platform: PLATFORM, auth });
  } catch (e) {
    console.warn('[referral] 진입 처리 실패(무시):', e?.message || e);
  }
}

/** ☰ 친구 초대 — 시트를 그린다. 코드는 처음 열 때 발급받는다 */
export async function openInviteSheet({ box, auth, toast, track, shareNative }) {
  const guest = !auth || auth.isGuest || auth.provider === 'offline' || auth.provider === 'anonymous';
  const view = { guest, loading: !guest, error: false, code: null, active: memo.claim?.active ?? 0, pending: memo.claim?.pending ?? 0 };
  const on = {
    copy: async (url) => {
      try { await navigator.clipboard.writeText(`${MSG.shareText} ${url}`); toast(MSG.copied); } catch (e) { toast(url); }
      track('invite_share', { channel: 'copy' });
    },
    share: async (url) => {
      track('invite_share', { channel: shareNative ? 'native' : navigator.share ? 'share' : 'copy' });
      try {
        if (shareNative) await shareNative(`${MSG.shareText} ${url}`);
        else if (navigator.share) await navigator.share({ title: '🌿 calm forest', text: MSG.shareText, url });
        else { await navigator.clipboard.writeText(`${MSG.shareText} ${url}`); toast(MSG.copied); }
      } catch (e) { /* 공유 시트 취소는 정상 흐름 */ }
    },
  };
  renderInviteSheet(box, view, on);
  track('invite_sheet_open', { guest: guest ? 1 : 0, active: view.active });
  if (guest || !enabled()) return;
  const res = await call('code');
  renderInviteSheet(box, { ...view, loading: false, error: !res?.ok, code: res?.code ?? null }, on);
}
