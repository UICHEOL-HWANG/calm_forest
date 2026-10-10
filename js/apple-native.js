// =============================================================
//  🍎 iOS 앱(Capacitor) 네이티브 Apple 로그인 — ID 토큰 받기
//  ------------------------------------------------------------
//  App Store 가이드라인 4.8: 구글 로그인을 넣은 앱은 Apple 로그인도 같이 제공해야 한다.
//  ASAuthorization 시트 → ID 토큰 → supabase-client 가 signInWithIdToken({ provider: 'apple' }).
//  (@capgo/capacitor-social-login — JS 에서는 js/cap-bridge.js capPlugin("SocialLogin") 로 부른다)
//
//  ⚠️ nonce 는 구글과 같은 규칙: Apple 에는 SHA-256 해시본, Supabase 에는 원본.
//  ⚠️ iOS 네이티브는 clientId 가 필요 없다 — 토큰 aud 는 번들 ID.
//     Supabase Apple 공급자의 Client IDs 에 번들 ID(com.cheorish.lab.calmforest)를 넣어야 통과한다.
//  ⚠️ initialize 는 apple 만 넘긴다 — 구글 설정은 google-native.js 가 따로 한다.
// =============================================================
import { sha256Hex } from './google-native.js';

let _initializedFor = null;

function randomHex(bytes, crypto) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

// → { idToken, rawNonce } | { cancelled: true }. 그 밖의 실패는 throw(사유가 메시지에 남는다).
export async function getAppleIdToken({ plugin, crypto = globalThis.crypto }) {
  if (!plugin) throw new Error('SocialLogin plugin 없음 — 앱 빌드에 플러그인이 빠졌다');

  if (_initializedFor !== plugin) {
    await plugin.initialize({ apple: {} });
    _initializedFor = plugin;
  }

  const rawNonce = randomHex(32, crypto);
  let res;
  try {
    res = await plugin.login({
      provider: 'apple',
      options: { scopes: ['email', 'name'], nonce: await sha256Hex(rawNonce, crypto) },
    });
  } catch (e) {
    const msg = String(e?.message || e);
    if (/cancel|1001/i.test(msg)) return { cancelled: true };   // 시트를 닫은 것(ASAuthorizationError.canceled=1001) — 오류 아님
    throw new Error(msg);
  }
  const idToken = res?.result?.idToken;
  if (!idToken) throw new Error('idToken 없음 — Apple 응답에 identityToken 이 없다');
  return { idToken, rawNonce };
}
