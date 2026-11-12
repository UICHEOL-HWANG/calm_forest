import { CONFIG, IS_DEV_SESSION } from '../config.js';
import { getAccessToken } from '../supabase-client.js';
import { IS_TOSS, IS_NATIVE, loadTossSDK } from '../platform.js';
import { capPlugin, capListen } from '../cap-bridge.js';
import { getLang } from '../i18n.js';
import { readGiftParam, giftFromReferrer, normalizeGiftCode } from './rules.js';
import { captureCode, pendingCode, runPromoGift } from './flow.js';
import { showLetter, openCodeEntry } from './ui.js';

const BUSY = ['body.intro-open', '#char-modal.show', '#tutorial-modal.show', '#hint-modal.show', '#nudge-modal.show', '#gift-box-modal.show'];
const SDK_WAIT_MS = 4000;
const NONE = Object.freeze({ views: [], result: 'net_fail' });
const memo = { track: () => {}, play: null, running: null };

const enabled = () => !IS_DEV_SESSION && !!CONFIG.PROMO_GIFT_API;
const store = () => { try { return localStorage; } catch (e) { return null; } };
const withTimeout = (p, fallback) => Promise.race([p, new Promise(r => setTimeout(() => r(fallback), SDK_WAIT_MS))]);
const busyWith = (ui) => () => BUSY.some(sel => document.querySelector(sel)) || !!ui?.coachActive?.() || !!ui?.anyModalOpen?.();

function whenIdle(busy, { first = 1500, every = 700, maxMs = 120000 } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let clear = 0;
    const tick = () => {
      clear = busy() ? 0 : clear + 1;
      if (clear >= 2 || Date.now() - t0 >= maxMs) resolve();
      else setTimeout(tick, every);
    };
    setTimeout(tick, first);
  });
}

async function call(stage, code) {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const r = await fetch(CONFIG.PROMO_GIFT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'claim', code, stage }),
    });
    if (r.status === 400) return await r.json().catch(() => ({ ok: false, reason: 'bad_code' }));
    if (!r.ok) return { error: r.status };
    return await r.json();
  } catch (e) {
    return null;
  }
}

async function connectThenRerun(ctx, from) {
  let out = null;
  try { out = await ctx.ui?.connectAccount?.(from); } catch (e) { out = null; }
  if (memo.play) runNow(memo.play, { wait: false }).catch(() => null);
  return out;
}

function runNow(ctx, { wait = true } = {}) {
  const s = store();
  if (!s) return Promise.resolve(NONE);
  if (memo.running) return memo.running;
  memo.running = (async () => {
    if (!pendingCode(s)) return NONE;
    if (wait) await whenIdle(busyWith(ctx.ui));
    const code = pendingCode(s);
    let result = 'dup';
    const track = (ev, p) => { if (ev === 'promo_gift_claim') result = p.result; ctx.track(ev, p); };
    const views = await runPromoGift({
      auth: ctx.auth, storage: s, call, grant: (b) => { try { ctx.grant(b); } catch (e) { return; } }, track,
      show: (view) => { ctx.beforeShow?.(); return showLetter(view, { track: ctx.track, connect: (from) => connectThenRerun(ctx, from), code, lang: getLang() }); },
    });
    return { views, result };
  })().catch(() => NONE).finally(() => { memo.running = null; });
  return memo.running;
}

export function bootPromoGift({ track }) {
  if (!enabled()) return;
  const s = store();
  if (!s) return;
  memo.track = track;
  captureCode({ storage: s, code: readGiftParam(location.search), via: 'url', track });
  if (IS_TOSS) {
    loadTossSDK().then(async (sdk) => {
      const entry = sdk?.Environment?.initialURL || (await sdk?.getSchemeUri?.()) || '';
      captureCode({ storage: s, code: readGiftParam(entry), via: 'toss', track });
    }).catch(() => null);
  }
  if (!IS_NATIVE) return;
  const app = capPlugin('App');
  if (app) {
    withTimeout(Promise.resolve(app.getLaunchUrl()).then(r => r?.url || null).catch(() => null), null)
      .then(url => captureCode({ storage: s, code: readGiftParam(url), via: 'deeplink', track }));
  }
  try {
    capListen('App', 'appUrlOpen', (ev) => {
      if (captureCode({ storage: s, code: readGiftParam(ev?.url), via: 'deeplink', track }) && memo.play) runNow(memo.play);
    });
  } catch (e) {
    return;
  }
}

export function linkInstallGift(installP) {
  if (!enabled() || !IS_NATIVE || !installP) return;
  const s = store();
  if (!s) return;
  withTimeout(installP, null).then(attr => captureCode({ storage: s, code: giftFromReferrer(attr?.raw), via: 'referrer', track: memo.track }));
}

export function promoGiftOnPlay({ auth, track, ui, grant }) {
  if (!enabled()) return Promise.resolve(NONE);
  memo.play = { auth, track, ui, grant };
  return runNow(memo.play);
}

export function openGiftCodeEntry({ auth, track, ui, grant }) {
  const s = store();
  if (!s || !enabled()) return;
  openCodeEntry({
    submit: async (text, closeEntry) => {
      const code = normalizeGiftCode(text);
      if (!code) return { ok: false, reason: 'bad_code' };
      captureCode({ storage: s, code, via: 'manual', force: true, track });
      memo.play = { auth, track, ui, grant };
      const { views, result } = await runNow({ ...memo.play, beforeShow: closeEntry }, { wait: false });
      return views.length ? { ok: true } : { ok: false, reason: result };
    },
  });
}
