// =============================================================
//  🏡 이웃 마을 네트워크 — 주입형 순수 팩토리(Node 테스트). 실제 바인딩은 ./net.js
//  RPC 6종(유저별, 캐시 없음 — 방문 원장 viewStart/viewEnd 포함) + /api/neighbor(엣지 10분 캐시). 실패는 전부 { ok:false, reason } — 삼키지 않는다.
// =============================================================
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createNeighborApi({ rpc, fetchFn, base = '', now = () => performance.now() }) {
  async function call(fn, args) {
    try {
      const r = await rpc(fn, args);
      return r && typeof r === 'object' ? r : { ok: false, reason: 'upstream' };
    } catch { return { ok: false, reason: 'offline' }; }
  }
  return {
    async today() {
      const r = await call('neighbors_today', {});
      if (!r.ok || !Array.isArray(r.list)) return { ok: false, reason: r.reason || 'upstream' };
      return { ok: true, list: r.list.slice(0, 3), rewardedToday: Math.max(0, r.rewarded_today | 0) };
    },
    react: (publicId, emoji) => call('neighbor_react', { p_public_id: publicId, p_emoji: emoji }),
    async visitors(sinceMs) {
      const r = await call('my_visitors', { p_since: new Date(sinceMs).toISOString() });
      if (!r.ok) return { ok: false, reason: r.reason || 'upstream' };
      return { ok: true, total: Math.max(0, r.total | 0), list: Array.isArray(r.list) ? r.list : [], isPublic: r.is_public !== false };
    },
    async setPublic(on) {
      const r = await call('set_village_public', { p_on: !!on });
      return r.ok ? { ok: true, is_public: r.is_public !== false } : { ok: false, reason: r.reason || 'upstream' };
    },
    // 📒 방문 원장(village_views) — GA4 가 광고 차단으로 빠져도 서버에 남는다. 탭을 닫으면 viewEnd 없이 ended_at 이 비어 남는다(허용)
    async viewStart(publicId, slot, revisit) {
      const r = await call('neighbor_view_start', { p_public_id: publicId, p_slot: Number.isInteger(slot) ? slot : null, p_revisit: !!revisit });
      if (!r.ok || !Number.isFinite(r.view_id)) return { ok: false, reason: r.reason || 'upstream' };
      return { ok: true, viewId: r.view_id };
    },
    async viewEnd(viewId, sec, reacted) {
      if (viewId == null) return { ok: false, reason: 'no_view' };
      const r = await call('neighbor_view_end', { p_view_id: viewId, p_sec: Math.max(0, Math.round(Number(sec) || 0)), p_reacted: !!reacted });
      return r.ok ? { ok: true } : { ok: false, reason: r.reason || 'upstream' };
    },
    async showcase(publicId) {
      if (!UUID_RE.test(publicId || '')) return { ok: false, reason: 'bad_id', code: 400 };
      const t0 = now();
      try {
        const r = await fetchFn(`${base}/api/neighbor?id=${encodeURIComponent(publicId)}`);
        if (r.status === 404) return { ok: false, reason: 'not_found', code: 404 };
        if (!r.ok) return { ok: false, reason: 'upstream', code: r.status };
        const data = await r.json();
        if (!data || data.error) return { ok: false, reason: 'not_found', code: 404 };
        return { ok: true, data, loadMs: Math.round(now() - t0) };
      } catch { return { ok: false, reason: 'offline', code: 0 }; }
    },
  };
}
