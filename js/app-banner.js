// =============================================================
//  calm forest · 📲 웹 → 앱 유도 배너 (B안 가로 바)
//  -------------------------------------------------------------
//  스펙: dev/active/app-banner-funnel/app-banner-funnel-plan.md
//  · 웹(PLATFORM 'web')에서만, 안드로이드/아이폰에만, 스토어가 열린 OS 에만 뜬다.
//  · 세션의 첫 수확(또는 5분) 뒤 하루 1회. 10초 뒤 자동으로 사라진다.
//  · 게스트는 "로그인하고 받기" → 로그인(리다이렉트) 뒤 다음 부팅에 로그인판이 한 번 더 뜬다.
//  · 클라이언트 10% 홀드아웃 — 배너 효과(웹 리텐션을 깎는지)를 재기 위한 비교군.
//  브라우저 전역을 쓰지 않는 순수 모듈 — DOM·저장소·시계는 전부 주입받는다(테스트 가능).
// =============================================================

export const DEFAULT_APP_BANNER = {
  storeLive: { android: false, ios: false },   // 스토어 출시를 직접 확인한 OS 만 켠다(변경 로그에 기록)
  androidPackage: 'com.cheorish.lab.calmforest',
  iosAppId: '',              // App Store Connect 의 숫자 Apple ID — 비어 있으면 iOS 는 꺼진 것으로 본다
  iosProviderToken: '',      // 캠페인 링크 pt
  fallbackSec: 300,          // 수확이 없을 때 대체 트리거
  autoHideMs: 10000,
  retryMs: 5000,             // 가려진 상태면 이만큼 뒤 다시 시도
  maxRetries: 24,            // 2분까지만 기다린다
  holdoutMod: 10,            // 1/10 홀드아웃 · 0 이면 끔
  maxDismiss: 2,             // ✕ 를 이만큼 누르면 영구 숨김
  pendingTtlMs: 86400000,    // 게스트 클릭 → 로그인 연결 유효 시간(그 뒤 다른 경로로 로그인하면 배너 덕이 아니다)
};

const STATE_KEY = 'cf_app_banner';
export const TOUCH_KEY = 'cf_first_touch';
const UTM_KEYS = ['source', 'medium', 'campaign', 'content'];

// 안드로이드 / iOS(iPadOS 의 Mac 위장 포함) / 그 외(PC) null
export function storeTarget(ua = '', maxTouchPoints = 0) {
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return 'ios';
  return null;
}

export function osLive(os, cfg) {
  if (!os || !cfg?.storeLive?.[os]) return false;
  return os === 'ios' ? !!cfg.iosAppId : true;
}

// FNV-1a — 같은 기기는 늘 같은 군
export function isHoldout(id, mod) {
  if (!id || !mod) return false;
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) % mod === 0;
}

// jid 는 기기에 한 번 · utm 은 utm_source 가 있는 마지막 유입(직접 재방문은 덮지 않는다)
export function captureTouch(search, prev, now, makeId) {
  const q = new URLSearchParams(search || '');
  const src = q.get('utm_source');
  if (prev?.jid && !src) return prev;
  const utm = src
    ? Object.fromEntries(UTM_KEYS.map(k => [k, String(q.get('utm_' + k) || '').slice(0, 100)]))
    : (prev?.utm ?? null);
  return { jid: prev?.jid || makeId(), ts: prev?.ts ?? now, utm };
}

// 값마다 따로 인코딩 — 랜딩 URL 의 utm 값에 '&jid=' 를 숨겨 귀속을 위조하지 못하게.
//   Play 는 1024자를 넘는 referrer 를 버리므로 값은 60자로 자른다.
export function playReferrer(touch) {
  const u = touch?.utm;
  const parts = [['utm_source', u?.source || 'web'], ['utm_medium', 'web_banner']];
  if (u?.campaign) parts.push(['utm_campaign', u.campaign]);
  if (u?.content) parts.push(['utm_content', u.content]);
  if (touch?.jid) parts.push(['jid', touch.jid]);
  return encodeURIComponent(parts.map(([k, v]) => `${k}=${encodeURIComponent(String(v).slice(0, 60))}`).join('&'));
}

export function storeUrl(os, cfg, touch) {
  if (!osLive(os, cfg)) return null;
  if (os === 'android') {
    return `https://play.google.com/store/apps/details?id=${encodeURIComponent(cfg.androidPackage)}&referrer=${playReferrer(touch)}`;
  }
  // ct 는 합계 집계용(App Store Connect) — 개인 ID 는 넣지 않고 유입·소재 팔(utm_content)까지만, 최대 40자
  const arm = touch?.utm?.content ? '_' + touch.utm.content : '';
  const ct = ('web_banner_' + (touch?.utm?.source || 'web') + arm).replace(/[^\w-]/g, '_').slice(0, 40);
  const pt = cfg.iosProviderToken ? `pt=${encodeURIComponent(cfg.iosProviderToken)}&` : '';
  return `https://apps.apple.com/app/id${encodeURIComponent(cfg.iosAppId)}?${pt}ct=${ct}&mt=8`;
}

export function canShowToday(state, today, maxDismiss) {
  if (!state) return true;
  if ((state.dismissN || 0) >= maxDismiss) return false;
  return !(state.day === today && state.shown);
}

export function createAppBanner(deps) {
  const cfg = { ...DEFAULT_APP_BANNER, ...(deps.config || {}) };
  const os = storeTarget(deps.ua, deps.maxTouchPoints);
  const active = deps.platform === 'web' && osLive(os, cfg);
  let decided = false;     // 이 세션에서 노출/홀드아웃을 이미 정했다
  let harvestSeen = false; // 트리거는 세션의 '첫' 수확뿐
  let showing = null;      // { os, guest }
  let autoT = null, retryT = null, retries = 0;

  const readState = () => deps.storage.get(STATE_KEY) || { day: null, shown: false, dismissN: 0, pending: null };
  const writeState = (patch) => { const next = { ...readState(), ...patch }; deps.storage.set(STATE_KEY, next); return next; };
  const touch = () => deps.storage.get(TOUCH_KEY);

  function display(v, trigger) {
    const visible = deps.render(v);
    if (!visible) { deps.hide(); return false; }
    showing = v;
    if (trigger) {
      writeState({ day: deps.today(), shown: true });
      deps.track('app_banner_shown', { os: v.os, trigger, is_guest: v.guest });
    }
    deps.clearTimeout(autoT);
    autoT = deps.setTimeout(() => close('timeout'), cfg.autoHideMs);
    return true;
  }

  function attempt(trigger) {
    retryT = null;
    if (decided || !active) return;
    const st = readState();
    // post_login 은 게스트가 이미 본 배너의 이어짐 — 하루 1회 상한·홀드아웃 배정과 무관(영구 숨김만 지킨다)
    const allowed = trigger === 'post_login'
      ? (st.dismissN || 0) < cfg.maxDismiss
      : canShowToday(st, deps.today(), cfg.maxDismiss);
    if (!allowed) { decided = true; return; }
    if (trigger !== 'post_login' && deps.holdout(deps.clientId() || touch()?.jid || '', cfg.holdoutMod)) {
      decided = true;
      writeState({ day: deps.today(), shown: true });
      deps.track('app_banner_holdout', { os, trigger });
      return;
    }
    // 가려진 상태(메뉴·미니게임·모달·CSS 숨김)는 노출로 치지 않고 잠시 뒤 다시 본다
    if (deps.suppressed() || !display({ os, guest: !!deps.isGuest() }, trigger)) {
      if (retries++ < cfg.maxRetries) retryT = deps.setTimeout(() => attempt(trigger), cfg.retryMs);
      return;
    }
    decided = true;
    if (trigger === 'post_login') writeState({ pending: null });   // 실제로 보인 뒤에만 지운다
  }

  function close(reason) {
    if (!showing) return;
    deps.clearTimeout(autoT);
    const dismissN = (readState().dismissN || 0) + (reason === 'close' ? 1 : 0);
    if (reason === 'close') writeState({ dismissN });
    deps.track('app_banner_dismiss', { os: showing.os, reason, dismiss_n: dismissN });
    showing = null;
    deps.hide();
  }

  return {
    start() {
      if (!active) return;
      const p = readState().pending;
      if (p) {
        const fresh = p.os === os && deps.now() - (p.ts || 0) < cfg.pendingTtlMs;
        if (!fresh) writeState({ pending: null });                 // 다른 OS·오래된 클릭은 버린다
        else if (!deps.isGuest()) { attempt('post_login'); return; }   // 게스트로 돌아왔으면 그대로 둔다
      }
      deps.setTimeout(() => { if (!retryT) attempt('time'); }, cfg.fallbackSec * 1000);
    },
    onEvent(name) {
      if (name !== 'harvest_crop' || harvestSeen) return;
      harvestSeen = true;
      if (!retryT) attempt('harvest');
    },
    dismiss() { close('close'); },
    click() {
      if (!showing) return;
      const v = showing;
      deps.clearTimeout(autoT);
      if (v.guest) {
        deps.track('app_banner_click', { os: v.os, is_guest: true, jid: touch()?.jid || '' });
        writeState({ pending: { os: v.os, ts: deps.now() } });
        showing = null;
        deps.hide();
        // 구글은 페이지 리다이렉트라 성공이면 여기로 안 돌아온다. 실패(reject)면 연결 흔적을 지운다
        Promise.resolve().then(() => deps.connect()).catch(() => writeState({ pending: null }));
        return;
      }
      const url = storeUrl(v.os, cfg, touch());
      deps.track('app_banner_click', { os: v.os, is_guest: false, jid: touch()?.jid || '' });
      showing = null;
      deps.hide();
      if (url) deps.navigate(url);
    },
    // QA — ?appbanner=android|ios[-guest] (dev 세션 전용). 기록·상한 없음
    debugShow(dOs, guest) {
      const visible = deps.render({ os: dOs, guest: !!guest });
      if (visible) showing = { os: dOs, guest: !!guest };
    },
  };
}
