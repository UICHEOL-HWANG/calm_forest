// =============================================================
//  🔔 안드로이드 푸시(@capacitor/push-notifications) — 권한·등록·토큰 전송(순수)
//  ------------------------------------------------------------
//  plugin = capPlugin('PushNotifications'), listen = (event, cb) => capListen('PushNotifications', event, cb)
//  post   = 토큰을 /api/push-register 로 보내는 함수(성공 true) — 전부 주입이라 Node 테스트가 된다.
//  웹·토스·itch 는 plugin 이 undefined → 'unavailable' 로 끝난다.
//  (테스트: node --test tests/push-native.test.mjs)
// =============================================================

export const PUSH_CHANNEL = 'garden';     // 서버(functions/push/fcm.js)의 channel_id 와 같은 값
const REGISTER_TIMEOUT_MS = 15000;

// register() 는 토큰을 이벤트로 준다 — 리스너를 먼저 걸고 부른 뒤, 끝나면 뗀다
function registerForToken(plugin, listen) {
  return new Promise((resolve) => {
    const subs = [];
    let done = false;
    const finish = v => {
      if (done) return; done = true;
      clearTimeout(timer);
      subs.forEach(s => { try { s?.remove?.(); } catch { /* 이미 떨어진 리스너 */ } });
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), REGISTER_TIMEOUT_MS);
    subs.push(listen('registration', t => finish(t?.value || null)));
    subs.push(listen('registrationError', () => finish(null)));
    Promise.resolve(plugin.register()).catch(() => finish(null));
  });
}

async function registerAndPost({ plugin, listen, post, lang, tz, channelName }) {
  try { await plugin.createChannel?.({ id: PUSH_CHANNEL, name: channelName || '밭 소식', importance: 3, visibility: 1 }); } catch { /* 채널은 없어도 기본 채널로 온다 */ }
  const token = await registerForToken(plugin, listen);
  if (!token) return { result: 'error' };
  const ok = await post({ token, enabled: true, lang: lang === 'en' ? 'en' : 'ko', tz: tz || null }).catch(() => false);
  return ok ? { result: 'granted', token } : { result: 'error', token };
}

/** 안내 카드의 "알려 주세요" — 필요하면 시스템 권한 팝업을 띄운다 */
export async function enablePush({ plugin, listen, post, lang, tz, channelName }) {
  if (!plugin) return { result: 'unavailable' };
  try {
    let perm = await plugin.checkPermissions();
    if (perm?.receive !== 'granted' && perm?.receive !== 'denied') perm = await plugin.requestPermissions();
    if (perm?.receive !== 'granted') return { result: 'denied' };
    return await registerAndPost({ plugin, listen, post, lang, tz, channelName });
  } catch { return { result: 'error' }; }
}

/** 앱을 켤 때 — 이미 허용된 사람만 조용히 재등록(토큰 교체·계정 변경 반영). 팝업은 절대 안 띄운다 */
export async function refreshPush({ plugin, listen, post, lang, tz, channelName }) {
  if (!plugin) return { result: 'unavailable' };
  try {
    const perm = await plugin.checkPermissions();
    if (perm?.receive !== 'granted') return { result: 'skipped' };
    return await registerAndPost({ plugin, listen, post, lang, tz, channelName });
  } catch { return { result: 'error' }; }
}

/** ⚙️ 설정에서 끄기 — 토큰은 남기고 서버 쪽 enabled 만 끈다(다시 켜면 팝업 없이 바로) */
export async function disablePush({ token, post }) {
  if (!token) return false;
  return post({ token, enabled: false }).catch(() => false);
}

/** 알림을 눌러 앱이 열렸을 때 — data(kind·send_id)를 넘긴다(GA4 push_open) */
export function onPushOpen(listen, cb) {
  return listen('pushNotificationActionPerformed', a => cb(a?.notification?.data || {}));
}
