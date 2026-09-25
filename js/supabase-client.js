// =============================================================
//  calm forest · Supabase 연동 모듈 (Auth + DB, 백엔드 서버 없음)
//  ------------------------------------------------------------
//  ▶ [인증] 구글 OAuth 로그인 / 로그아웃 + 게스트(익명·오프라인) 폴백
//  ▶ [DB] 게임 상태 저장/불러오기(game_saves), 센서 로그 배치(game_logs)
//  ▶ 키 미설정 또는 실패 시 "오프라인 모드": 콘솔 폴백으로 정상 동작.
//
//  ─ Supabase 테이블 스키마는 supabase_setup.sql 참고 ─
//    (game_saves / game_logs + RLS + 분석 뷰)
// =============================================================

import { CONFIG, isSupabaseConfigured, IS_DEV_SESSION } from './config.js';  // 🧪 dev 세션 — 리더보드 원천 기록 차단용
import { PLATFORM, IS_ITCH, IS_TOSS, IS_ANDROID } from './platform.js'; // 'web' | 'toss' | 'itch' | 'android' — 로그 세그먼트 · itch 는 구글 팝업 로그인 · toss 는 게스트 이관 · android 는 네이티브 로그인
import { getGoogleIdToken } from './google-native.js';   // 📱 앱: WebView OAuth 는 구글이 막아 네이티브 계정 시트로
import { getPgsAuthCode } from './pgs-native.js';         // 📱 앱: Play Games 자동 로그인 → authCode → pgs-auth Worker
import { pickSave, progressScore } from './save-migrate.js';   // 🔵 게스트 → 정식 계정 진행도 이관 규칙
import { loadOutcome, sessionLoss } from './save-guard.js';    // 🛡️ 읽기 실패를 신규 유저로 오인해 덮어쓰는 사고 방지 · 🔌 노는 중 세션 죽음 판정
import { t, clientId, assignVariant } from './i18n.js';   // i18n + 기기 식별/실험 배정(언어 결정과 공유)
import { setAbVariant, trackEvent } from './analytics.js';
import { kstDate } from './kst-date.js';   // 🕛 run_date 는 KST 날짜
import { markExit } from './exit-flag.js';   // 🚪 나가기 → 새로고침 뒤 로그인 화면

let supabase = null;   // Supabase 클라이언트 (오프라인이면 null)
export const state = {
  online: false,       // Supabase 세션 보유 여부
  userId: null,        // 로그인된 유저 UUID (오프라인이면 로컬 ID)
  email: null,         // 구글 계정 이메일/이름
  provider: null,      // 'google' | 'toss' | 'pgs' | 'anonymous' | 'offline'
  sessionId: randId(), // 이번 플레이 세션 식별자(로그 그룹핑)
  clientId: clientId(),// 분석용 영구 기기 식별자(localStorage, 게스트 재방문 추적)
  isGuest: null,       // 게스트(익명/오프라인) 여부 — 세그먼트 분석용
  lost: false,         // 🔌 놀던 중 세션이 죽었나(refresh 실패·다른 기기 로그아웃) — 저장이 조용히 실패하는 상태
  variant: 'control',  // A/B 변형(실험 off면 control)
  createdAt: null,     // 계정 생성 시각(ISO) — 보상 부스트(가입 3일) 기준
  mapOrder: null,      // 🧪 베타 2차 — 맵 여는 순서('sea_first'|'mist_first'), 명단 테이블에서
  betaReady: Promise.resolve(),  // 명단 조회가 끝나면 resolve — variant/mapOrder 가 확정된 뒤 할 일은 이걸 기다린다
};

function randId() { return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

// clientId()/assignVariant() 는 js/i18n.js 로 이동 —
// 언어 자동 결정(treatment 배정)과 로그의 variant 가 같은 해시를 쓰도록 단일화.

let statusCb = null;
function emit() { statusCb?.({ ...state }); }

// 익명(게스트) 세션인지 판별
function isAnon(session) {
  return session?.user?.is_anonymous === true
    || session?.user?.app_metadata?.provider === 'anonymous';
}

// 세션 객체 → state 반영 (🔵 토스 유저는 user_metadata.toss · 📱 플레이 게임즈 유저는 user_metadata.pgs 로 식별 — 영구 계정 취급)
function applySession(session) {
  const isToss = session?.user?.user_metadata?.toss === true;
  const isPgs = session?.user?.user_metadata?.pgs === true;
  state.online = true;
  state.userId = session.user.id;
  state.isGuest = isAnon(session);   // 게스트(익명) 여부 — 세그먼트 분석용
  //  🚪 정식 계정으로 바뀌면 "잃을 세이브가 없다"는 전제가 깨진다 — 빗장을 원래대로.
  //    (signInAsGuest 는 이 함수를 부른 뒤에 다시 true 로 세운다)
  if (!isAnon(session)) freshGuest = false;
  state.email = isAnon(session) ? '게스트' : isToss ? '토스 유저' : isPgs ? '플레이 게임즈' : (session.user.email || session.user.user_metadata?.name || '유저');
  state.provider = isAnon(session) ? 'anonymous' : isToss ? 'toss' : isPgs ? 'pgs' : (session.user.app_metadata?.provider || 'google');
  state.betaReady = resolveBetaGroup(session);
  emit();
}

// ── 🧪 베타 배정 — 로그인 계정이 beta_testers 명단에 있으면 variant 고정 ──
//    명단 > ?forceVariant=(로컬 검증용) > 기존 assignVariant() 순.
async function resolveBetaGroup(session) {
  state.createdAt = session.user.created_at || null;   // 보상 부스트(가입 3일) 기준
  try {
    // 로컬 검증 전용 — 운영에선 무시(치트·표본 오염 방지). 배정은 명단(beta_testers)이 유일.
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const forced = isLocal ? new URLSearchParams(location.search).get('forceVariant') : null;
    if (forced === 'beta_A' || forced === 'beta_B') state.variant = forced;
    const forcedOrder = isLocal ? new URLSearchParams(location.search).get('forceMapOrder') : null;
    if (forcedOrder === 'sea_first' || forcedOrder === 'mist_first') state.mapOrder = forcedOrder;
    // 🏁 베타가 끝나면(EXPERIMENT !== 'beta') 명단 조회 자체를 하지 않는다.
    //   이 가드가 없으면 스위치를 내려도 명단에 남은 계정은 계속 beta_* 로 덮여
    //   맵 날짜 게이트·보상 부스트가 살아 있었다. 로그인마다 나가던 조회 요청
    //   (이메일이 쿼리스트링에 실린다)도 함께 사라진다.
    if (supabase && !isAnon(session) && CONFIG.EXPERIMENT === 'beta') {
      const email = (session.user.email || '').toLowerCase();
      const { data } = await supabase.from('beta_testers').select('grp, map_order').eq('email', email).maybeSingle();
      if (data?.grp) state.variant = 'beta_' + data.grp;   // 명단이 최우선
      if (data?.map_order) state.mapOrder = data.map_order;
    }
  } catch (e) { console.warn('[베타] 배정 조회 실패(variant 유지):', e?.message || e); }
  setAbVariant(state.variant);
  emit();
}

// ── 🔌 세션 죽음 ────────────────────────────────────────────────
//   우리가 **일부러** 부르는 signOut(남은 익명 세션 정리·게스트 재시작·로그아웃 버튼)까지
//   사고로 세면 부팅하자마자 만료 안내가 뜬다. 그래서 우리 호출은 표시를 달고 나간다.
let intentionalSignOut = false;
async function signOutQuietly() {
  intentionalSignOut = true;
  try { await supabase.auth.signOut(); }
  finally { await new Promise(r => setTimeout(r, 0)); intentionalSignOut = false; }   // 이벤트가 온 뒤에 내린다
}

//  더는 서버에 쓸 수 없는 세션이다. 저장을 잠가 조용한 실패를 막고(빗장은 writeSave 가 본다),
//  화면이 알 수 있게 알린다. 되살리는 길은 새로고침뿐 — 세션 갱신부터 다시 타야 한다.
//
//  ⚠️ state.online 은 그대로 둔다. 내리면 saveGame 이 "오프라인이라 저장할 게 없다"며
//     { ok:true } 를 돌려주고(위 saveGame 첫 줄), 재시도 루프가 그걸 성공으로 읽어 안내를 지운다.
let lostPending = false;
function markSessionLost() {
  if (state.lost || lostPending) return;
  lostPending = true;
  //  ⚠️ onAuthStateChange 콜백 **안에서** auth 를 다시 부르면 supabase-js 내부 락에 걸린다.
  //     한 틱 물러나 "정말 세션이 없는지" 사실로 확인한다 — 게스트 재시작처럼 곧바로 새 세션이
  //     붙는 경우, 뒤늦게 도착한 SIGNED_OUT 에 속아 멀쩡한 세션을 잠그면 입구가 통째로 막힌다.
  //     (intentionalSignOut 은 1차 방어, 이 확인이 2차 — 부동 버전 esm.sh 라 타이밍에만 기대지 않는다)
  setTimeout(async () => {
    lostPending = false;
    if (state.lost) return;
    try { const { data } = await supabase.auth.getSession(); if (data?.session) return; } catch (e) {}
    state.lost = true;
    saveLocked = true;
    console.warn('[Supabase] 세션이 끊겼습니다 — 저장을 잠급니다(다시 들어가야 이어집니다)');
    emit();
  }, 0);
}

// =============================================================
//  초기화 — 페이지 로드시 호출.
//  반환: { needLogin } → true면 로그인 화면을 띄워야 함.
// =============================================================
export async function initAuth(onStatusChange) {
  statusCb = onStatusChange;
  state.variant = assignVariant();   // 실험 off면 'control', 켜지면 client_id 해시로 A/B

  // 키 미설정 → 오프라인. 로그인 화면에서 "게스트로 플레이"만 가능
  if (!isSupabaseConfigured()) {
    console.log('[Supabase 폴백] 키 미설정 → 오프라인 모드 가능.');
    state.provider = 'offline';
    return { needLogin: true, offline: true };
  }

  try {
    // 📦 웹·토스·itch 는 CDN 그대로. 구글 플레이(Capacitor) 빌드만 scripts/build-cap.mjs 가
    //    이 줄을 vendor/supabase.js 로 치환한다 — 앱은 오프라인에서도 떠야 하기 때문.
    //    ⚠️ 이 문자열이 build-cap 의 치환 앵커다. 바꾸면 빌드가 실패하도록 되어 있다.
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    });

    // 로그인 상태 변화 감지(구글 리다이렉트 복귀 포함).
    //   ※ 익명(게스트) 세션은 여기서 자동 적용하지 않음 → 게스트는 휘발성.
    //     게스트 로그인은 signInAsGuest 가 직접 applySession 으로 처리.
    supabase.auth.onAuthStateChange((event, session) => {
      if (session && !isAnon(session)) { applySession(session); return; }
      // 🔌 놀던 중 세션이 죽었다 — 여기서 안 잡으면 state.online 이 true 로 남아
      //   저장이 끝까지 조용히 실패한다(saveGame 은 던지지 않는다). 판정은 save-guard.js.
      if (sessionLoss({ event, session, wasOnline: state.online, intentional: intentionalSignOut })) markSessionLost();
    });

    // 기존 세션 확인: 구글 계정만 자동 복원. 게스트(익명)는 복원하지 않고 정리.
    const { data } = await supabase.auth.getSession();
    const s = data?.session;
    if (s && !isAnon(s)) {
      applySession(s);                       // 구글 재방문 → 예전 마을 이어서
      return { needLogin: false, offline: false };
    }
    if (s && isAnon(s)) {
      // 🔵 토스·📱 플레이 앱: 자동 연결이 안 돼 게스트로 플레이했던 진행도를 잠시 들고 있는다.
      //    익명 세션을 정리하면 그 계정의 저장을 더는 읽을 수 없으므로(RLS) 로그아웃 전에 읽어야 한다.
      //    정식 계정으로 붙은 뒤 loadGame() 이 pickSave 로 어느 쪽을 남길지 정한다.
      if (IS_TOSS || IS_ANDROID) pendingGuest = await readGuestSave(s.user.id);
      await signOutQuietly();                 // 게스트 재방문 → 이전 익명 세션 정리(매번 새로 시작)
    }
    return { needLogin: true, offline: false };
  } catch (err) {
    console.warn('[Supabase 폴백] 초기화 실패 → 오프라인:', err?.message || err);
    state.provider = 'offline';
    return { needLogin: true, offline: true };
  }
}

// ── 구글 로그인 (전체 페이지가 구글로 리다이렉트 → 복귀 시 세션 획득) ──
//   🎮 itch(iframe) 에서는 팝업 방식으로 갈아탄다 — signInWithGooglePopup 참고.
export async function signInWithGoogle() {
  if (!supabase) { alert(t('Supabase 키가 설정되지 않았습니다. 게스트로 플레이하세요.')); return; }
  if (IS_ITCH) return signInWithGooglePopup();
  if (IS_ANDROID) return signInWithGoogleNative();
  // 쿼리(?error=...)·해시 제거한 깨끗한 주소로 복귀 (누적 방지)
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) { console.warn('[구글 로그인 실패]', error.message); alert(t('구글 로그인 실패: {0}').replace('{0}', error.message)); }
}

// ── 📱 구글 네이티브 로그인 (구글 플레이 앱 전용) ────────────────────
//   Credential Manager 계정 시트 → ID 토큰 → signInWithIdToken. 브라우저 왕복·리다이렉트 URL 이 없다.
//   사용자가 시트를 닫으면 조용히 끝낸다(오류 아님).
async function signInWithGoogleNative() {
  const fail = (msg) => { console.warn('[구글 네이티브 로그인 실패]', msg); alert(t('구글 로그인 실패: {0}').replace('{0}', msg)); };
  let got;
  try {
    got = await getGoogleIdToken({ plugin: window.Capacitor?.Plugins?.SocialLogin, webClientId: CONFIG.GOOGLE_WEB_CLIENT_ID });
  } catch (e) { return fail(e?.message || String(e)); }
  if (got.cancelled) return;
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: got.idToken, nonce: got.rawNonce });
  if (error || !data?.session) return fail(error?.message || 'no session');
  applySession(data.session);
  console.log('[구글 네이티브] 세션 연결 완료', state.userId);
}

// ── 🎮 구글 팝업 로그인 (itch.io 등 iframe 호스트 전용) ────────────────
//   iframe 안에서는 ① 구글이 OAuth 화면을 막고 ② 복귀 주소(itch.zone)가 Supabase 허용 목록에 없다.
//   그래서 최상위 팝업 창을 열어 구글 → Supabase → 웹 오리진의 auth-popup.html 로 돌아오게 하고,
//   그 페이지가 URL 해시의 토큰을 postMessage 로 이 창(opener)에 넘기면 setSession 으로 세션을 잡는다.
//   ⚠️ 팝업은 클릭 핸들러 안에서 동기적으로 먼저 열어야 차단당하지 않는다(URL 은 나중에 채움).
//   ⚠️ Supabase 대시보드 Authentication > URL Configuration > Redirect URLs 에
//      GOOGLE_POPUP_RETURN 이 등록돼 있어야 한다. 없으면 Site URL 로 튕겨 토큰이 안 돌아온다.
const GOOGLE_POPUP_RETURN = `${CONFIG.API_BASE}/auth-popup.html`;   // 빌드가 API_BASE 를 웹 오리진으로 치환
const GOOGLE_POPUP_ORIGIN = (() => { try { return new URL(GOOGLE_POPUP_RETURN, location.href).origin; } catch { return null; } })();
async function signInWithGooglePopup() {
  const popup = window.open('about:blank', 'calmforest-google-auth', 'popup=yes,width=480,height=640');
  if (!popup) { alert(t('팝업이 차단됐어요. 이 사이트의 팝업을 허용한 뒤 다시 눌러주세요.')); return; }
  const fail = (msg) => { try { popup.close(); } catch {} console.warn('[구글 팝업 로그인 실패]', msg); alert(t('구글 로그인 실패: {0}').replace('{0}', msg)); };

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: GOOGLE_POPUP_RETURN, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return fail(error?.message || 'no url');
  popup.location.href = data.url;

  // 팝업 → opener 로 토큰이 오길 기다린다. 사용자가 팝업을 닫으면 조용히 끝낸다(오류 아님).
  const result = await new Promise((resolve) => {
    const onMsg = (ev) => {
      if (ev.origin !== GOOGLE_POPUP_ORIGIN || ev.source !== popup) return;   // 출처·창 모두 확인
      const m = ev.data;
      if (!m || m.type !== 'calmforest-auth') return;
      cleanup(); resolve(m);
    };
    const timer = setInterval(() => { if (popup.closed) { cleanup(); resolve(null); } }, 500);
    const cleanup = () => { window.removeEventListener('message', onMsg); clearInterval(timer); };
    window.addEventListener('message', onMsg);
  });
  try { popup.close(); } catch {}
  if (!result) return;                                     // 사용자가 닫음
  if (result.error) return fail(result.error);
  const { data: s, error: sErr } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
  if (sErr) return fail(sErr.message);
  applySession(s.session);
  console.log('[구글 팝업] 세션 연결 완료', state.userId);
}

// ── 🔵 바로 플레이하기 (앱인토스 웹뷰 전용) ─────────────────────
//   토스 로그인(appLogin)은 사업자 등록을 거친 '토스로그인 약관 동의'가 있어야 쓸 수 있어
//   게임 카테고리 미니앱용 사용자 식별키를 쓴다 — 동의 화면 없이 바로 계정이 잡힌다.
//   SDK getUserKeyForGame() → hash → toss-auth Worker(TOSS_AUTH_ENDPOINT)가
//   mTLS 로 토스에 진위를 검증한 뒤 Supabase 세션(access/refresh)을 발급해 돌려준다.
//
//   반환 { ok, reason } — reason 은 GA4 toss_connect 이벤트의 실패 분류 키:
//     bridge(웹뷰 밖) · old_app(토스앱 구버전) · invalid_category · sdk_error · empty_hash
//     · endpoint_not_configured · server(Worker/토스 검증 실패) · session(Supabase 세션 실패)
//   opts.silent: 자동 연결 시도 때 alert 를 띄우지 않는다(실패는 호출부가 화면으로 안내).
export async function signInWithToss({ silent = false } = {}) {
  const fail = (reason, message) => Object.assign(new Error(message), { reason });
  try {
    const { loadTossSDK } = await import('./platform.js');
    const sdk = await loadTossSDK();
    // 웹뷰 밖(일반 브라우저)에서는 브리지가 없어 SDK 내부에서 TypeError 가 난다 →
    // 원문 대신 사람이 읽을 안내로 바꿔준다.
    let result;
    try {
      result = await sdk.getUserKeyForGame();
    } catch (bridgeErr) {
      console.warn('[토스] 브리지 호출 실패', bridgeErr);
      throw fail('bridge', '토스 앱 안에서만 이용할 수 있어요. 웹에서는 게스트로 플레이해주세요.');
    }
    // SDK 가 실패를 예외가 아니라 반환값으로도 알려주므로 분기해서 안내를 붙인다
    if (!result) throw fail('old_app', '토스 앱 버전이 낮아요. 최신 버전으로 업데이트해주세요.');
    if (result === 'INVALID_CATEGORY') throw fail('invalid_category', '게임 카테고리 미니앱이 아니에요.');
    if (result === 'ERROR') throw fail('sdk_error', '사용자 키를 가져오지 못했어요. 잠시 후 다시 시도해주세요.');
    const anonKey = result.hash;
    if (!anonKey) throw fail('empty_hash', '사용자 키가 비어 있어요.');

    if (!CONFIG.TOSS_AUTH_ENDPOINT) {
      if (!silent) alert(t('토스 계정 연결 서버 준비 중이에요 — 우선 게스트로 플레이해주세요!'));
      return { ok: false, reason: 'endpoint_not_configured' };
    }
    let data;
    try {
      const res = await fetch(CONFIG.TOSS_AUTH_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonKey }),
      });
      data = await res.json();
      if (!res.ok || !data.access_token || !data.refresh_token) throw new Error(data.error || 'HTTP ' + res.status);
    } catch (netErr) {
      throw fail('server', netErr?.message || String(netErr));
    }
    const { data: s, error } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    if (error) throw fail('session', error.message);
    applySession(s.session);
    console.log('[토스] Supabase 세션 연결 완료', state.userId);
    return { ok: true };
  } catch (err) {
    const reason = err?.reason || 'unknown';
    console.warn('[토스 시작 실패]', reason, err?.message || err);
    if (!silent) alert(t('토스로 시작하지 못했어요: {0}').replace('{0}', t(String(err?.message || err))));
    return { ok: false, reason, error: err };
  }
}

// ── 📱 Play Games 자동 로그인 (구글 플레이 앱 전용) ─────────────────
//   토스 식별키와 같은 자리: 앱이 켜지면 PGS v2 가 조용히 인증 → 1회용 authCode →
//   pgs-auth Worker(PGS_AUTH_ENDPOINT)가 구글과 교환해 playerId 를 확정하고 Supabase 세션을 돌려준다.
//
//   반환 { ok, reason } — reason 은 GA4 pgs_connect 이벤트의 실패 분류 키:
//     plugin(앱 빌드 누락·설정 누락) · not_signed_in(자동 로그인 안 됨/거절) · auth_code
//     · endpoint_not_configured · server(Worker/구글 교환 실패) · session(Supabase 세션 실패)
//   opts.interactive: '바로 플레이하기' 버튼 — 자동 로그인이 안 됐으면 PGS 로그인 창을 한 번 띄운다.
//   alert 는 띄우지 않는다 — 실패는 호출부가 로그인 화면·게스트 폴백으로 안내한다.
export async function signInWithPlayGames({ interactive = false } = {}) {
  const fail = (reason, message) => Object.assign(new Error(message), { reason });
  try {
    if (!CONFIG.PGS_AUTH_ENDPOINT) return { ok: false, reason: 'endpoint_not_configured' };
    let got;
    try {
      got = await getPgsAuthCode({ plugin: window.Capacitor?.Plugins?.PlayGames,
                                   serverClientId: CONFIG.PGS_SERVER_CLIENT_ID, interactive });
    } catch (e) {
      throw fail(/plugin|serverClientId/.test(e?.message) ? 'plugin' : 'auth_code', e?.message || String(e));
    }
    if (got.notSignedIn) return { ok: false, reason: 'not_signed_in' };
    let data;
    try {
      const res = await fetch(CONFIG.PGS_AUTH_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authCode: got.authCode }),
      });
      data = await res.json();
      if (!res.ok || !data.access_token || !data.refresh_token) throw new Error(data.error || 'HTTP ' + res.status);
    } catch (netErr) {
      throw fail('server', netErr?.message || String(netErr));
    }
    const { data: s, error } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    if (error) throw fail('session', error.message);
    applySession(s.session);
    console.log('[플레이 게임즈] Supabase 세션 연결 완료', state.userId);
    return { ok: true };
  } catch (err) {
    const reason = err?.reason || 'unknown';
    console.warn('[플레이 게임즈 연결 실패]', reason, err?.message || err);
    return { ok: false, reason, error: err };
  }
}

// ── 게스트로 플레이 (매번 새 익명계정 → 휘발성, 재방문 시 새 마을) ──
//   익명 로그인이 성공해야 game_logs/game_saves 에 실제로 쌓임(RLS·FK 때문).
//   실패하면 순수 오프라인(콘솔 폴백)으로만 동작.
export async function signInAsGuest() {
  if (supabase) {
    try {
      // 혹시 남아있는 익명 세션이 있으면 정리 → 항상 새 게스트로 시작(A안)
      const { data: cur } = await supabase.auth.getSession();
      if (cur?.session && isAnon(cur.session)) await signOutQuietly();
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      applySession(data.session);          // state.online = true → DB 저장 활성화
      //  🚪 방금 만든 계정이다 — game_saves 에 행이 있을 수 없다(잃을 세이브 0).
      //    읽기가 실패해도 이 세션은 입장을 막지 않는다(save-guard.js 의 freshGuest).
      freshGuest = true;
      console.log('[게스트] 익명 로그인 성공 → DB 저장 활성화', state.userId);
      return { online: true };
    } catch (err) {
      // 조용히 넘기지 않고 원인을 명확히 노출(대부분 "Anonymous sign-ins 비활성화")
      console.error(
        '[게스트] 익명 로그인 실패 → 오프라인(콘솔 폴백)으로만 동작합니다.\n' +
        '  DB에 저장하려면 Supabase 대시보드에서 Authentication > Sign In / Providers >\n' +
        '  "Anonymous sign-ins" 를 켜주세요. (원인: ' + (err?.message || err) + ')'
      );
    }
  }
  // 순수 오프라인 게스트(익명 로그인 불가) — 진행은 되지만 DB 저장은 안 됨
  state.online = false;
  state.userId = 'local-' + state.sessionId;
  state.isGuest = true;
  state.email = '게스트';
  state.provider = 'offline';
  emit();
  return { online: false };
}

// ── 로그아웃 ──
export async function signOut() {
  if (supabase) { try { intentionalSignOut = true; await supabase.auth.signOut(); } catch (e) {} }
  state.online = false; state.userId = null; state.email = null; state.provider = null;
  markExit(globalThis.sessionStorage);   // 🚪 새로고침 직후 토스 자동 연결을 한 번 건너뛴다(js/exit-flag.js) — 안 하면 나가기가 다시 들어오는 루프
  location.reload();
}

// =============================================================
//  게임 저장 / 불러오기 / 로그 전송  (오프라인이면 콘솔 폴백)
// =============================================================
//  🛡️ 세이브를 못 읽은 세션은 서버를 덮어쓰면 안 된다(js/save-guard.js 참고).
//    ⚠️ 이 빗장은 game_saves 로 가는 **모든** 쓰기를 지나야 뜻이 있다. 그래서 저장 경로를
//    writeSave() 하나로 모았다 — saveGame 도, 게스트 이관도 여기를 통과한다.
let saveLocked = false;
let freshGuest = false;   // 이 세션에서 익명 계정을 방금 만들었나(= 잃을 세이브가 없다)

//  game_saves 로 나가는 유일한 쓰기 통로. allowLocked 는 "잠금을 알고도 써야 하는" 경우(게스트 이관)에만.
async function writeSave(row, { allowLocked = false } = {}) {
  if (saveLocked && !allowLocked) { console.warn('[Supabase] 저장 잠금 — 세이브를 못 읽은 세션이라 덮어쓰지 않습니다'); return { ok: false, locked: true }; }
  const { error } = await supabase.from(CONFIG.SAVE_TABLE).upsert(row);
  if (error) throw error;
  return { ok: true };
}

export async function saveGame(gameState) {
  const row = { user_id: state.userId, state: gameState, updated_at: new Date().toISOString() };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 저장(오프라인):', row); return { ok: true, offline: true }; }
  try {
    const r = await writeSave(row);
    if (!r.ok) return { ok: false, locked: true };
    console.log('[Supabase] 저장 완료'); return { ok: true, offline: false };
  } catch (err) { console.warn('[Supabase 폴백] 저장 실패:', err?.message || err); return { ok: false, offline: false, error: err }; }
}

//  ⚠️ 읽기 실패를 절대 null(= 저장 없음 = 신규 유저)로 뭉개지 않는다.
//    예전에는 둘 다 null 이라 호출부가 실패를 신규로 읽고 새 마을을 만들었고,
//    30초 뒤 자동저장이 서버의 멀쩡한 마을을 덮어썼다(2026-09-14·09-11 사고 2건).
//    판정은 save-guard.js 가 하고 테스트가 잠근다. 호출부는 canPlay 가 설 때까지 기다린다.
export async function loadGame() {
  const online = !!(state.online && supabase);
  let row = null, error = null;
  if (online) {
    try {
      const { data, error: readErr } = await supabase.from(CONFIG.SAVE_TABLE).select('state').eq('user_id', state.userId).maybeSingle();
      if (readErr) throw readErr;
      row = await migrateGuestSave(data?.state ?? null);
    } catch (err) { error = err; console.warn('[Supabase] 불러오기 실패(신규로 보지 않고 다시 시도):', err?.message || err); }
  }
  const out = loadOutcome({ online, error, row, freshGuest });
  //  세션이 죽었으면 읽기가 우연히 성공해도 빗장은 그대로다 — 새로고침 전엔 쓸 수 없는 세션이다.
  saveLocked = !out.canSave || state.lost;   // 성공하면 풀리고, 실패한 동안은 걸려 있다
  //  실패 원인을 호출부가 GA4 로 보낼 수 있게 넘긴다 — 갇힌 사람을 셀 분모가 여기서 나온다
  if (error) out.code = String(error?.code || error?.status || error?.name || 'unknown');
  return out;
}

// ── 🔵 게스트 → 토스 정식 계정 진행도 이관 ────────────────────────
//   initAuth 가 로그아웃 전에 읽어 둔 게스트 저장(pendingGuest)을, 토스 계정으로 붙은 첫 loadGame 에서 처리한다.
//   규칙은 save-migrate.js(순수 모듈, 테스트로 잠금). 한 번 처리하면 비운다 — 새로고침마다 다시 옮기지 않게.
let pendingGuest = null;   // { userId, state } | null

async function readGuestSave(userId) {
  try {
    const { data, error } = await supabase.from(CONFIG.SAVE_TABLE).select('state').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data?.state ? { userId, state: data.state } : null;
  } catch (err) { console.warn('[토스] 게스트 저장 읽기 실패(이관 생략):', err?.message || err); return null; }
}

async function migrateGuestSave(tossSave) {
  if (!pendingGuest || !['toss', 'pgs'].includes(state.provider)) return tossSave;   // 토스·플레이 정식 계정으로 붙었을 때만 소비(다시 게스트면 다음 기회에)
  const guest = pendingGuest;
  const pick = pickSave(tossSave, guest.state);
  trackEvent('guest_migrate', { kept: pick.keep, guest_score: progressScore(guest.state), toss_score: progressScore(tossSave) }); // [GA4] 사고 복구 추적
  if (!pick.migrate) { pendingGuest = null; return tossSave; }       // 옮길 이유가 없다 — 여기서 비운다
  try {
    //  ⚠️ allowLocked: 이 upsert 는 "이 저장을 남긴다"고 방금 판정한 결과다. 읽기가 한 번
    //    실패해 빗장이 걸려 있어도 이관은 나가야 게스트 진행도가 고아가 되지 않는다.
    await writeSave({ user_id: state.userId, state: guest.state, updated_at: new Date().toISOString() }, { allowLocked: true });
  } catch (err) {
    //  ⚠️ pendingGuest 를 비우지 않는다 — 비우고 실패하면 재시도 때 이관이 영영 건너뛰어진다.
    console.warn('[토스] 게스트 진행도 이관 실패 — 다음 시도에서 다시 옮긴다:', err?.message || err);
    return tossSave;
  }
  pendingGuest = null;                                               // 성공한 뒤에만 비운다
  console.log('[토스] 게스트 진행도를 정식 계정으로 옮김', guest.userId, '→', state.userId);
  return guest.state;
}

// ── 개발자 피드백 전송(feedback 테이블) — 오프라인이면 콘솔 폴백 ──
export async function submitFeedback({ category, message, meta }) {
  //  meta.platform 은 meta.ua 와 별개다. ua 는 브라우저 문자열이고,
  //  platform 은 platform.js 의 판정값(?platform=toss · SDK 전역)이라 서로 어긋날 수 있다.
  //  다른 로그 테이블이 전부 PLATFORM 기준이므로 피드백도 같은 자로 재야 모수가 맞는다.
  //  (호출자가 meta.platform 을 직접 넘기면 그쪽을 존중)
  const row = { user_id: state.userId, category, message,
                meta: { platform: PLATFORM, ...(meta || {}) },
                created_at: new Date().toISOString() };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 피드백(오프라인):', row); return { ok: true, offline: true }; }
  try {
    const { error } = await supabase.from('feedback').insert(row);
    if (error) throw error;
    console.log('[Supabase] 피드백 전송 완료');
    return { ok: true, offline: false };
  } catch (err) {
    console.warn('[Supabase 폴백] 피드백 전송 실패:', err?.message || err);
    return { ok: false, offline: false, error: err };
  }
}

export async function sendLogBatch(rows) {
  if (!rows || rows.length === 0) return;
  const enriched = rows.map(r => ({
    user_id: state.userId, session_id: state.sessionId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, platform: PLATFORM, // [분석] 기기/게스트/실험/플랫폼 세그먼트
    ...r,
  }));
  if (!state.online || !supabase) { console.log(`[Supabase 폴백] 로그 배치 ${enriched.length}건 (오프라인)`); return; }
  try {
    const { error } = await supabase.from(CONFIG.LOG_TABLE).insert(enriched);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 로그 전송 실패:', err?.message || err); }
}

// ── [계측] 경제 원장 배치 전송(econ_logs) — 코인 증감 {source,item,amount,balance} ──
//    metrics.js 가 버퍼링해 호출. 오프라인이면 콘솔 폴백(게임 진행 영향 없음).
/**
 * 🐗🦝 승부 판별 로그 — econ_logs 와 같은 배치 문법.
 *   ⚠️ 실패해도 조용히 넘긴다. 분석용 기록이 게임을 막으면 안 된다(경제 원장과 같은 원칙).
 */
export async function sendDuelBatch(rows) {
  if (!rows || rows.length === 0) return;
  const enriched = rows.map(r => ({
    user_id: state.userId, session_id: state.sessionId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, platform: PLATFORM,
    ...r,
  }));
  if (!state.online || !supabase) { console.log(`[Supabase 폴백] 승부 로그 ${enriched.length}건 (오프라인)`, enriched); return; }
  try {
    const { error } = await supabase.from(CONFIG.DUEL_TABLE).insert(enriched);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 승부 로그 전송 실패:', err?.message || err); }
}

export async function sendEconBatch(rows) {
  if (!rows || rows.length === 0) return;
  const enriched = rows.map(r => ({
    user_id: state.userId, session_id: state.sessionId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, platform: PLATFORM, // [분석] 세그먼트 동일 적용
    ...r,
  }));
  if (!state.online || !supabase) { console.log(`[Supabase 폴백] 경제 원장 ${enriched.length}건 (오프라인)`, enriched); return; }
  try {
    const { error } = await supabase.from(CONFIG.ECON_TABLE).insert(enriched);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 경제 원장 전송 실패:', err?.message || err); }
}

// ── [계측] ☕ 그날의 카페 손님 보관(cafe_guests) — Gemini 생성 콘텐츠 아카이브 ──
//    손님은 날짜 시드라 그날 접속한 전원이 똑같은 4명을 봅니다. 그래서 유저별이 아니라
//    (날짜, 날씨, 인원)당 1행만 남깁니다 — 먼저 들어온 한 명이 기록하고 나머지는
//    unique 제약(23505)에 걸려 조용히 무시됩니다. 그래서 user_id 도 붙이지 않습니다.
//    실패해도 게임엔 아무 영향이 없어야 하므로 전부 삼킵니다.
export async function sendCafeGuests({ date, weather, count, phase, model, guests }) {
  if (!guests || !guests.length) return;
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 카페 손님 기록 생략 (오프라인)'); return; }
  try {
    const { error } = await supabase.from('cafe_guests').insert({
      // phase = 집 단계 버킷. unique 키에 들어가므로 버킷마다 한 벌씩 남는다.
      //   (없으면 같은 날·날씨에서 먼저 온 한 벌만 남고 나머지 두 벌이 버려진다 —
      //    sql/migrations/migrate_cafe_guests_phase.sql 참고)
      gen_date: date, weather, guest_count: count, phase: phase || 'settled', model, guests,
    });
    if (error && error.code !== '23505') throw error;   // 23505 = 그 조합은 이미 기록됨(정상)
  } catch (err) { console.warn('[Supabase 폴백] 카페 손님 기록 실패:', err?.message || err); }
}

// ── 📸 사진첩 — 업로드 인증 토큰 + 메타데이터 행(photos 테이블, RLS) ──
//    사진 원본은 OCI 버킷(서버 프록시 /api/photo 경유), 목록·정렬은 이 테이블로.
export async function getAccessToken() {
  if (!supabase) return null;
  try { const { data } = await supabase.auth.getSession(); return data?.session?.access_token || null; }
  catch (e) { return null; }
}

export async function listPhotos() {
  if (!state.online || !supabase) return [];
  try {
    const { data, error } = await supabase.from('photos')
      .select('object_key, weather, taken_at')
      .order('taken_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  } catch (err) { console.warn('[Supabase 폴백] 사진 목록 실패:', err?.message || err); return []; }
}

// ── 📮 소식함 — 전체 공지 + 내게 온 답장 (RLS 가 target_user_id 로 거른다) ──
//   sinceId 보다 큰 id 만(읽음 기준은 세이브의 noticeSeenId). feedback(message) 는 reply_to 임베드 —
//   본인 글 select 정책(feedback_select_own)이 있어야 값이 오고, 없으면 null 로 올 뿐 에러는 아니다.
//   ascending=true 는 접속 시 "안 읽은 것" 조회용 — 오래된 순으로 limit 만큼 받아야 20건이 넘게 밀렸을 때
//   읽음 id 가 못 본 것을 건너뛰지 않는다(남은 건 다음 접속에). 메뉴 소식함은 최신순(false).
export async function fetchNotices(sinceId = 0, { limit = 20, ascending = false } = {}) {
  if (!state.online || !supabase) return [];
  try {
    const { data, error } = await supabase.from('notices')
      .select('id, title, body, title_en, body_en, target_user_id, reply_to, created_at, feedback(message)')
      .gt('id', sinceId).order('id', { ascending }).limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) { console.warn('[Supabase 폴백] 소식 조회 실패:', err?.message || err); return []; }
}

export async function insertPhotoRow(objectKey, weather) {
  if (!state.online || !supabase) return;
  try {
    const { error } = await supabase.from('photos').insert({ user_id: state.userId, object_key: objectKey, weather });
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 사진 메타 기록 실패:', err?.message || err); }
}

export async function deletePhotoRow(objectKey) {
  if (!state.online || !supabase) return;
  try {
    const { error } = await supabase.from('photos').delete().eq('object_key', objectKey);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 사진 메타 삭제 실패:', err?.message || err); }
}

// ── [계측] 🛶 나룻배 런 기록(boat_runs) — 런 1회 = 1행 ──
//    좌표 로그(game_logs)만으론 "어디서 부딪혀 그만뒀는지"를 복원하기 어렵습니다.
//    코스 시드·구간별 충돌 지점·수집물까지 한 행에 남겨야 난이도 튜닝과 이탈 분석이 됩니다.
//    ※ 코스는 날짜+회차 시드라 seed 가 같으면 같은 코스 — 유저 간 실력 비교의 기준이 됩니다.
//    실패해도 게임엔 영향이 없어야 하므로 전부 삼킵니다.
export async function sendBoatRun(row) {
  //  🧪 dev 세션(?sea=1 · ?weather= 등)에서는 기록하지 않는다.
  //  boat_runs 는 🛶 리더보드의 원천이라 테스트 런이 실제 유저와 같은 순위표에 오른다.
  //  게다가 dev 세션은 game_logs·session_logs 가 차단돼 있어, 남은 이 행이
  //  테스트인지 실제 플레이인지 나중에 판별할 근거조차 없다.
  if (IS_DEV_SESSION) return;
  const full = {
    user_id: state.userId, session_id: state.sessionId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, platform: PLATFORM,
    run_date: kstDate(),   // YYYY-MM-DD · KST(UTC 면 새벽 기록이 어제로 샌다 — js/kst-date.js)
    ...row,
  };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 🛶 런 기록(오프라인):', full); return; }
  try {
    const { error } = await supabase.from(CONFIG.BOAT_TABLE).insert(full);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 런 기록 전송 실패:', err?.message || err); }
}

// ── [계측] 🌊 바다터 대어 기록(sea_records) — 어획 1회 = 1행 ──
//    참치 무게가 '오늘의 대어' 리더보드(sea 보드)의 원천. 다른 어종도 함께 남겨
//    어종별 도전/성공률 분석에 쓴다. 실패해도 게임엔 영향 없게 전부 삼킨다.
export async function sendSeaRecord(row) {
  if (IS_DEV_SESSION) return;   // 🧪 dev 세션 — 🌊 '오늘의 대어' 원천이므로 sendBoatRun 과 동일
  const full = {
    user_id: state.userId, session_id: state.sessionId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, platform: PLATFORM,
    run_date: kstDate(),   // YYYY-MM-DD · KST(보드가 KST 하루로 센다 — js/kst-date.js)
    ...row,   // { species, weight }
  };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 🌊 대어 기록(오프라인):', full); return; }
  try {
    const { error } = await supabase.from(CONFIG.SEA_TABLE).insert(full);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 대어 기록 전송 실패:', err?.message || err); }
}


// ── [계측] 세션 요약 upsert(session_logs) — 세션당 1행, 주기/이탈 시 갱신 ──
export async function upsertSessionRow(row) {
  const full = {
    session_id: state.sessionId, user_id: state.userId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, platform: PLATFORM,
    ...row, updated_at: new Date().toISOString(),
  };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 세션 요약(오프라인):', full); return; }
  try {
    const { error } = await supabase.from(CONFIG.SESSION_TABLE).upsert(full);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 세션 요약 전송 실패:', err?.message || err); }
}

// ── [계측] 리텐션 안내 예측 점수/피처 스냅샷(retention_guidance_scores) ──
//    VM API 가 계산한 score 와 그 요청에 들어간 raw feature 를 세션 트리거 단위로 남긴다.
//    실패해도 안내 배너·게임 진행에는 영향이 없어야 하므로 전부 삼킨다.
export async function upsertRetentionGuidanceScore(row) {
  const full = {
    session_id: state.sessionId, user_id: state.userId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, platform: PLATFORM,
    ...row, updated_at: new Date().toISOString(),
  };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 리텐션 안내 점수(오프라인):', full); return; }
  try {
    const { error } = await supabase
      .from(CONFIG.RETENTION_GUIDANCE_SCORE_TABLE)
      .upsert(full, { onConflict: 'session_id,trigger,policy_version' });
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 리텐션 안내 점수 전송 실패:', err?.message || err); }
}
