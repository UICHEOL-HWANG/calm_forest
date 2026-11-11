export const TOSS_AD_GROUP = 'ait.v2.live.c226252d0fcb4c9e';
const SHOW_TIMEOUT_MS = 3 * 60 * 1000;
const REASON_MAX = 160;

const reasonOf = (e) => String(e?.message || e || '').slice(0, REASON_MAX);

export function createTossRewarded({ isToss, loadSdk, groupId = TOSS_AD_GROUP, timeoutMs = SHOW_TIMEOUT_MS }) {
  let sdk = null;
  let busy = false;
  const supported = () => {
    try {
      return !!sdk?.loadFullScreenAd?.isSupported?.() && !!sdk?.showFullScreenAd?.isSupported?.();
    } catch {
      return false;
    }
  };
  if (isToss) Promise.resolve().then(loadSdk).then((m) => { sdk = m || null; }, () => { sdk = null; });

  const available = () => !!isToss && supported();

  function load() {
    return new Promise((resolve) => {
      try {
        sdk.loadFullScreenAd({
          options: { adGroupId: groupId },
          onEvent: (e) => { if (e?.type === 'loaded') resolve(null); },
          onError: (err) => resolve('load:' + reasonOf(err)),
        });
      } catch (err) {
        resolve('load:' + reasonOf(err));
      }
    });
  }

  function play() {
    return new Promise((resolve) => {
      let earned = false, done = false;
      const finish = (r) => { if (done) return; done = true; clearTimeout(timer); resolve(r); };
      const timer = setTimeout(() => finish({ result: 'fail', reason: 'timeout' }), timeoutMs);
      try {
        sdk.showFullScreenAd({
          options: { adGroupId: groupId },
          onEvent: (e) => {
            if (e?.type === 'userEarnedReward') earned = true;
            else if (e?.type === 'dismissed') finish({ result: earned ? 'complete' : 'skip' });
            else if (e?.type === 'failedToShow') finish({ result: 'fail', reason: 'show:failedToShow' });
          },
          onError: (err) => finish({ result: 'fail', reason: 'show:' + reasonOf(err) }),
        });
      } catch (err) {
        finish({ result: 'fail', reason: 'show:' + reasonOf(err) });
      }
    });
  }

  async function show(placement) {
    if (!available()) return { result: 'unavailable', placement };
    if (busy) return { result: 'fail', reason: 'busy', placement, network: 'toss' };
    busy = true;
    try {
      const err = await load();
      if (err) return { result: 'fail', reason: err, placement, network: 'toss' };
      return { placement, network: 'toss', ...(await play()) };
    } finally {
      busy = false;
    }
  }

  return { available, show };
}
