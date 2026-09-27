// 🌾 진행률 조회 스로틀 — 60초 안 재호출은 캐시, 동시 호출은 한 번, 실패 시 마지막 값 유지(순수·주입형)
export function createProgressFetcher({ fetchFn, url, now = () => Date.now(), gapMs = 60_000 }) {
  let lastVal = null, lastAt = -Infinity, inflight = null;
  async function load(season) {
    try {
      const r = await fetchFn(url ? url(season) : season);
      if (!r.ok) return lastVal;
      const v = await r.json();
      if (!v || v.error) return lastVal;
      lastVal = v; lastAt = now();
      return v;
    } catch { return lastVal; }
  }
  return {
    get(season, { force = false } = {}) {
      if (!force && lastVal && now() - lastAt < gapMs) return Promise.resolve(lastVal);
      if (inflight) return inflight;
      inflight = load(season).finally(() => { inflight = null; });
      return inflight;
    },
    last: () => lastVal,
  };
}
