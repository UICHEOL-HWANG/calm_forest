// 🏮 빛 공방 API 클라이언트 — 토큰을 붙여 Worker 를 부른다. 실패는 {error} 로 돌려준다(던지지 않음).
import { CONFIG, IS_DEV_SESSION } from '../config.js';
import { PLATFORM } from '../platform.js';
import { getAccessToken } from '../supabase-client.js';

async function call(method, { query = '', body } = {}) {
  if (IS_DEV_SESSION) return { error: 'dev_session' };
  const token = await getAccessToken();
  if (!token) return { error: 'login_required' };
  try {
    const r = await fetch(CONFIG.AURA_ORDER_API + query, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    return r.ok ? data : { error: data.error || `http_${r.status}` };
  } catch (e) { return { error: 'network' }; }
}
const clientId = () => { try { return localStorage.getItem('cf_client_id') || null; } catch { return null; } };

export const fetchMyOrders = () => call('GET');
export const placeOrder = (text, cards) => call('POST', { body: { text, cards, client_id: clientId(), platform: PLATFORM } });
export const claimOrder = id => call('POST', { query: `?claim=${encodeURIComponent(id)}`, body: {} });
