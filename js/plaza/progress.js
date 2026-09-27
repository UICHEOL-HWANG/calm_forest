// 🌾 진행률 조회 스로틀 — 60초 안 재호출은 캐시, 동시 호출은 한 번, 실패 시 마지막 값 유지(순수·주입형)
//   force(기부 직후): 떠 있는 요청은 기부 전 값일 수 있다 → 그걸 기다린 뒤 새로 한 번 더 받는다
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
  function start(season, after) {
    const p = (after ? after.then(() => load(season)) : load(season))
      .finally(() => { if (inflight === p) inflight = null; });   // 뒤에 건 요청을 앞 요청의 finally 가 지우지 않게
    inflight = p;
    return p;
  }
  return {
    get(season, { force = false } = {}) {
      if (!force && lastVal && now() - lastAt < gapMs) return Promise.resolve(lastVal);
      if (inflight && !force) return inflight;
      return start(season, inflight);
    },
    last: () => lastVal,
  };
}
