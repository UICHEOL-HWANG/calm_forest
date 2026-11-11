export const AD_UNITS = Object.freeze({
  live: Object.freeze({
    android: 'ca-app-pub-4372856890021592/5636922678',
    ios: 'ca-app-pub-4372856890021592/5078072368',
  }),
  test: Object.freeze({
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
  }),
});

const NATIVE = new Set(['android', 'ios']);
const NOFILL_CODE = Object.freeze({ android: '3', ios: '1' });
const EVENTS = Object.freeze({
  reward: 'onRewardedVideoAdReward',
  dismissed: 'onRewardedVideoAdDismissed',
  failedToShow: 'onRewardedVideoAdFailedToShow',
  impression: 'onRewardedVideoAdImpression',
});
const SHOW_TIMEOUT_MS = 3 * 60 * 1000;
const LATE_EVENT_MS = 400;
const REASON_MAX = 160;

export function adUnitFor(platform, testMode) {
  return (testMode ? AD_UNITS.test : AD_UNITS.live)[platform];
}

function reasonOf(e) {
  const raw = typeof e === 'string' ? e : (e?.message || e?.errorMessage || '');
  return String(raw).slice(0, REASON_MAX);
}

async function runConsent(plugin) {
  try {
    let info = await plugin.requestConsentInfo({});
    if (info?.status === 'REQUIRED' && info?.isConsentFormAvailable) info = await plugin.showConsentForm();
    return {
      canRequestAds: info?.canRequestAds === true,
      privacyOptionsRequired: info?.privacyOptionsRequirementStatus === 'REQUIRED',
    };
  } catch (e) {
    return { canRequestAds: false, privacyOptionsRequired: false, detail: reasonOf(e) };
  }
}

async function runTracking(plugin) {
  try {
    const { status } = await plugin.trackingAuthorizationStatus();
    if (status === 'notDetermined') await plugin.requestTrackingAuthorization();
  } catch {
    return;
  }
}

function watchShow({ plugin, listen, timeoutMs }) {
  return new Promise((resolve) => {
    const subs = [];
    const state = { rewarded: false, paid: null };
    let done = false;
    let lateTimer = null;
    const finish = (outcome) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(lateTimer);
      subs.forEach(s => { try { s?.remove?.(); } catch { return; } });
      resolve({ ...outcome, rewarded: state.rewarded, paid: state.paid });
    };
    const timer = setTimeout(() => finish({ error: 'timeout' }), timeoutMs);
    const settled = () => state.rewarded && state.paid;
    subs.push(listen(EVENTS.impression, (v) => {
      state.paid = v || null;
      if (lateTimer && settled()) finish({});
    }));
    subs.push(listen(EVENTS.reward, () => {
      state.rewarded = true;
      if (lateTimer && settled()) finish({});
    }));
    subs.push(listen(EVENTS.dismissed, () => {
      if (settled()) return finish({});
      lateTimer = setTimeout(() => finish({}), LATE_EVENT_MS);
    }));
    subs.push(listen(EVENTS.failedToShow, (e) => finish({ error: 'show:' + reasonOf(e) })));
    Promise.resolve(plugin.showRewardVideoAd()).catch(e => finish({ error: 'show:' + reasonOf(e) }));
  });
}

function paidFields(paid) {
  if (!paid || paid.valueMicros == null) return {};
  return {
    valueMicros: Number(paid.valueMicros),
    currencyCode: paid.currencyCode,
    precision: paid.precision,
  };
}

export function createRewardedAds({ platform, plugin, listen, testMode = false, showTimeoutMs = SHOW_TIMEOUT_MS }) {
  const available = NATIVE.has(platform) && !!plugin;
  let initPromise = null;
  let busy = false;

  function init() {
    if (!initPromise) {
      initPromise = (async () => {
        const checked = await runConsent(plugin);
        const consent = testMode && checked.detail ? { ...checked, canRequestAds: true } : checked;
        if (!consent.canRequestAds) {
          initPromise = null;
          return consent;
        }
        if (platform === 'ios') await runTracking(plugin);
        await plugin.initialize({ initializeForTesting: !!testMode });
        return consent;
      })().catch((e) => {
        initPromise = null;
        throw e;
      });
    }
    return initPromise;
  }

  async function play(placement) {
    let ready;
    try {
      ready = await init();
    } catch (e) {
      return { result: 'fail', reason: 'init:' + reasonOf(e) };
    }
    if (!ready.canRequestAds) return { result: 'fail', reason: 'consent', ...(ready.detail ? { detail: ready.detail } : {}) };
    try {
      await plugin.prepareRewardVideoAd({
        adId: adUnitFor(platform, testMode),
        isTesting: !!testMode,
        ssv: { customData: String(placement) },
      });
    } catch (e) {
      const code = String(e?.code ?? '');
      if (code === NOFILL_CODE[platform]) return { result: 'nofill' };
      return { result: 'fail', reason: `load:${code}:${reasonOf(e)}` };
    }
    const shown = await watchShow({ plugin, listen, timeoutMs: showTimeoutMs });
    if (shown.rewarded) return { result: 'complete', ...paidFields(shown.paid) };
    if (shown.error) return { result: 'fail', reason: shown.error, ...paidFields(shown.paid) };
    return { result: 'skip', ...paidFields(shown.paid) };
  }

  async function showRewarded(placement) {
    if (!available) return { result: 'unavailable', placement };
    if (busy) return { result: 'fail', reason: 'busy', placement, network: 'admob' };
    busy = true;
    try {
      return { placement, network: 'admob', ...(await play(placement)) };
    } finally {
      busy = false;
    }
  }

  const closed = { canRequestAds: false, privacyOptionsRequired: false };
  const warmUp = () => (available ? init().catch(() => closed) : Promise.resolve(closed));

  async function showPrivacyOptions() {
    if (!available) return 'unavailable';
    try {
      await plugin.showPrivacyOptionsForm();
      return 'shown';
    } catch {
      return 'fail';
    }
  }

  return { available, warmUp, showRewarded, showPrivacyOptions };
}
