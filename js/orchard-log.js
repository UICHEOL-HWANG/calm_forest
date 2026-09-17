// =============================================================
//  calm forest · 🍎 과수원 이벤트 원장 전송 (fire-and-forget)
//  ------------------------------------------------------------
//  js/game.js 가 사과나무 생애주기 이벤트마다 trackEvent(GA4) 와 나란히 호출한다.
//  GA4 는 광고차단에 유실되고 BigQuery export 가 일별이라 당일 확인이 안 되므로,
//  리텐션 측정이 존재 이유인 과수원만은 Supabase 원장(orchard_events)에도
//  직접 남긴다 — POST /api/orchard-events (functions/api/orchard-events.js).
//
//  ▶ fire-and-forget: await 하지 않는다. 실패해도 게임을 절대 막지 않는다
//    (throw 하지 않고 콘솔에만 남긴다).
//  ▶ 🧪 dev 세션은 GA4·세션 카운터와 같은 규칙으로 건너뛴다(config.js IS_DEV_SESSION).
//  ▶ 인증: Supabase 세션의 access_token 을 Authorization 헤더로 보낸다.
//    세션이 없으면(오프라인 모드) 서버가 401 을 낼 걸 미리 알고 건너뛴다.
// =============================================================
import { CONFIG, IS_DEV_SESSION } from './config.js';
import { getAccessToken } from './supabase-client.js';
import { PLATFORM } from './platform.js';

export function logOrchardEvent(event, params = {}) {
  if (IS_DEV_SESSION) return;              // 🧪 dev 세션 — 원장 기록 없음(GA4 와 동일 규칙)
  if (!CONFIG.ORCHARD_EVENTS_API) return;
  (async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;                  // 오프라인(비로그인) — 서버 401 을 미리 건너뜀
      const res = await fetch(CONFIG.ORCHARD_EVENTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event, platform: PLATFORM, ...params }),
      });
      if (!res.ok) console.warn('[과수원 원장] 전송 실패:', event, res.status);
    } catch (e) {
      console.warn('[과수원 원장] 전송 실패(무시):', event, e?.message || e);
    }
  })();
}
