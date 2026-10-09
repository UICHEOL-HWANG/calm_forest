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
import { PLATFORM, IS_TOSS, loadTossSDK } from '../platform.js';
import { captureInvite, runOnPlay, pendingInvite, claimAndApply } from './flow.js';
import { MSG, tossInvitePath } from './rules.js';
import { renderInviteSheet } from './ui.js';

const enabled = () => !!CONFIG.REFERRAL_ON && !IS_DEV_SESSION;
const store = () => { try { return window.localStorage; } catch (e) { return null; } };
const memo = { claim: null, tossBoot: null };
// 토스 공유 링크 미리보기(토스앱 Android 5.240·iOS 5.239 이상만 적용) — index.html og:image 와 같은 그림
const OG_IMAGE = 'https://calmforest.cloud/preview.jpg';
/** SDK 호출이 끝나지 않을 때 기다리는 한도 — 넘으면 fallback 으로 넘어간다(시트가 '…' 에 갇히지 않게) */
const SDK_WAIT_MS = 4000;
const withTimeout = (p, fallback, ms = SDK_WAIT_MS) => Promise.race([p, new Promise(r => setTimeout(() => r(fallback), ms))]);

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
  if (!s) return null;
  // 🟦 토스 공유 링크(intoss://calmforest?invite=…)로 들어오면 코드는 주소창이 아니라 진입 스킴 URL 에 있다.
  //    SDK 를 기다려야 해서 비동기 — referralOnPlay 가 연결(bind) 전에 이 약속을 기다린다.
  if (IS_TOSS) memo.tossBoot = captureTossEntry({ storage: s, track });
  return captureInvite({ search: location.search, storage: s, track });
}

async function captureTossEntry({ storage, track }) {
  try {
    const sdk = await loadTossSDK();
    const entry = sdk?.Environment?.initialURL || (await sdk?.getSchemeUri?.()) || '';   // getSchemeUri 는 옛 이름(Promise 일 수도)
    return captureInvite({ search: entry, storage, track });
  } catch (e) {
    console.warn('[referral] 토스 진입 URL 읽기 실패(무시):', e?.message || e);
    return null;
  }
}

/** 토스 안에서 보낼 공유 링크 — 친구도 토스 앱에서 바로 열린다(없으면 스토어). 실패하면 null → 웹 링크로 */
async function tossShareUrl(code) {
  try {
    const sdk = await loadTossSDK();
    return await withTimeout(sdk.getTossShareLink(tossInvitePath(code), OG_IMAGE), null);
  } catch (e) {
    console.warn('[referral] 토스 공유 링크 생성 실패(웹 링크로):', e?.message || e);
    return null;
  }
}

/** 로그인 화면 배너 문구 — 초대 링크로 왔고 아직 연결 전이면 */
export function inviteBanner() {
  if (!enabled()) return null;
  const s = store();
  return s && pendingInvite(s) ? MSG.banner : null;
}

// 초대받은 새 친구는 입장 직후 캐릭터 선택 → 🎬 프롤로그 → 안내 모달을 지난다. 연결 결과(💗 하트핀 도착)가
//   그 사이에 오면 토스트(z 33)가 프롤로그(z 55)·모달 밑에 깔린 채 사라졌다(2026-10-09 녹화 중 발견).
//   ⇒ 셋 다 닫힐 때까지 미뤘다가 띄운다. 판정이 어긋나 영영 안 닫혀도 3분 뒤엔 띄운다(말은 꼭 한다).
const ONBOARDING_OPEN = ['body.intro-open', '#char-modal.show', '#tutorial-modal.show'];
const onboardingBusy = () => ONBOARDING_OPEN.some(sel => document.querySelector(sel));
function afterOnboarding(fn, { first = 1000, every = 500, maxMs = 180000 } = {}) {
  const t0 = Date.now();
  let clear = 0;   // 캐릭터 창이 닫히고 프롤로그(body.intro-open)가 켜지기 전 한 프레임 틈이 있다 → '비었음'을 두 번 연속 봐야 띄운다
  const tick = () => {
    clear = onboardingBusy() ? 0 : clear + 1;
    if (clear >= 2 || Date.now() - t0 >= maxMs) fn(); else setTimeout(tick, every);
  };
  setTimeout(tick, first);   // 입장 직후엔 캐릭터 선택 창이 아직 안 열렸을 수 있다 — 한 박자 쉬고 본다
}

/** enterGame 이후 — 연결·정산. 실패해도 게임엔 영향 없다 */
export async function referralOnPlay({ auth, toast, track, resync }) {
  if (!enabled()) return;
  const s = store();
  if (!s) return;
  const quietToast = (m) => afterOnboarding(() => toast(m));
  if (memo.tossBoot) await withTimeout(memo.tossBoot, null);   // 토스 진입 URL 의 초대 코드가 보관된 뒤에 연결한다(SDK 가 멈춰도 정산은 진행)
  try {
    memo.claim = await runOnPlay({ storage: s, call, toast: quietToast, track, resync, platform: PLATFORM, auth });
  } catch (e) {
    console.warn('[referral] 진입 처리 실패(무시):', e?.message || e);
  }
}

/** ☰ 친구 초대 — 시트를 그린다. 코드는 처음 열 때 발급받는다 */
export async function openInviteSheet({ box, auth, toast, track, shareNative, resync }) {
  const guest = !auth || auth.isGuest || auth.provider === 'offline' || auth.provider === 'anonymous';
  const view = { guest, loading: !guest, error: false, code: null, active: memo.claim?.active ?? 0, pending: memo.claim?.pending ?? 0 };
  const on = {
    copy: async (url) => {
      const text = `${MSG.shareText} ${url}`;
      try {
        if (IS_TOSS) await (await loadTossSDK()).setClipboardText(text);   // 토스 웹뷰는 navigator.clipboard 가 막힐 수 있다
        else await navigator.clipboard.writeText(text);
        toast(MSG.copied);
      } catch (e) { toast(url); }
      track('invite_share', { channel: 'copy' });
    },
    share: async (url) => {
      track('invite_share', { channel: IS_TOSS ? 'toss' : shareNative ? 'native' : navigator.share ? 'share' : 'copy' });
      try {
        if (IS_TOSS) await (await loadTossSDK()).share({ message: `${MSG.shareText} ${url}` });
        else if (shareNative) await shareNative(`${MSG.shareText} ${url}`);
        else if (navigator.share) await navigator.share({ title: '🌿 calm forest', text: MSG.shareText, url });
        else { await navigator.clipboard.writeText(`${MSG.shareText} ${url}`); toast(MSG.copied); }
      } catch (e) { /* 공유 시트 취소는 정상 흐름 */ }
    },
  };
  renderInviteSheet(box, view, on);
  track('invite_sheet_open', { guest: guest ? 1 : 0, active: view.active });
  if (guest || !enabled()) return;
  // 친구 수는 열 때마다 다시 센다 — 부팅 때 값은 정산이 끝나기 전이거나 그 뒤 친구가 늘었을 수 있다(리뷰 2026-10-09).
  //   30초 쿨다운 중이어도 서버는 숫자를 돌려준다(throttled). 실패하면 부팅 때 값을 그대로 쓴다.
  const [res, claim] = await Promise.all([
    call('code'),
    resync ? claimAndApply({ call, track, resync }).catch(() => null) : Promise.resolve(null),
  ]);
  if (claim) memo.claim = claim;
  const code = res?.code ?? null;
  const url = code && IS_TOSS ? await tossShareUrl(code) : null;   // 토스 → 토스 공유 링크 · 그 외(또는 실패) → ui 가 웹 링크
  renderInviteSheet(box, {
    ...view, loading: false, error: !res?.ok, code, url,
    active: memo.claim?.active ?? 0, pending: memo.claim?.pending ?? 0,
  }, on);
}
