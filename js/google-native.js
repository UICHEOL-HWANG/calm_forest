// =============================================================
//  📱 구글 플레이 앱(Capacitor) 네이티브 구글 로그인 — ID 토큰 받기
//  ------------------------------------------------------------
//  WebView 안에서 구글 OAuth 페이지를 열면 구글이 막는다(disallowed_useragent).
//  대신 안드로이드 Credential Manager 가 계정 선택 시트를 띄우고 ID 토큰을 돌려준다
//  (@capgo/capacitor-social-login — JS 에서는 js/cap-bridge.js capPlugin("SocialLogin") 로 부른다).
//  받은 토큰은 supabase-client 가 signInWithIdToken 으로 세션으로 바꾼다.
//
//  ⚠️ nonce 는 양쪽에 다르게 준다: 구글에는 SHA-256 해시본, Supabase 에는 원본.
//  ⚠️ webClientId 는 **웹 애플리케이션** 클라이언트 ID(Supabase Google 공급자와 같은 값).
//     Android 클라이언트(패키지명+SHA-1)는 같은 GCP 프로젝트(agriquant)에 등록만 하고 여기 넣지 않는다.
//  의존성은 인자로 받는다 — 브라우저·테스트 어디서든 같은 코드가 돈다.
// =============================================================

let _initializedFor = null;

export async function sha256Hex(text, crypto = globalThis.crypto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes, crypto) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

// → { idToken, rawNonce } | { cancelled: true }. 그 밖의 실패는 throw(사유가 메시지에 남는다).
export async function getGoogleIdToken({ plugin, webClientId, crypto = globalThis.crypto }) {
  if (!plugin) throw new Error('SocialLogin plugin 없음 — 앱 빌드에 플러그인이 빠졌다');
  if (!webClientId) throw new Error('webClientId 미설정 — CONFIG.GOOGLE_WEB_CLIENT_ID');

  if (_initializedFor !== plugin) {
    await plugin.initialize({ google: { webClientId, mode: 'online' } });
    _initializedFor = plugin;
  }

  const rawNonce = randomHex(32, crypto);
  let res;
  try {
    res = await plugin.login({ provider: 'google', options: { nonce: await sha256Hex(rawNonce, crypto) } });
  } catch (e) {
    const msg = String(e?.message || e);
    if (/cancel/i.test(msg)) return { cancelled: true };   // 계정 시트를 닫은 것 — 오류 아님
    throw new Error(msg);
  }
  const idToken = res?.result?.idToken;
  if (!idToken) throw new Error('idToken 없음 — online 모드 응답이 아니다');
  return { idToken, rawNonce };
}
