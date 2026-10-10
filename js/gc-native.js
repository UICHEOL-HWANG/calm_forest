// =============================================================
//  🍎 iOS 앱(Capacitor) 게임센터 자동 로그인 — 신원 서명 받기
//  ------------------------------------------------------------
//  안드로이드 Play Games(pgs-native.js)와 같은 자리다: 앱이 켜지면 GKLocalPlayer 가 조용히 인증하고,
//  우리는 신원 서명만 받아 gc-auth Worker 로 넘긴다(Worker 가 Apple 인증서로 서명을 검증해 teamPlayerID 를 확정).
//  네이티브 쪽은 ios/App/App/GameCenterPlugin.swift — JS 에서는 js/cap-bridge.js capPlugin("GameCenter") 로 부른다.
//
//  ⚠️ 부팅(비대화형)에서는 signIn() 을 부르지 않는다 — 창을 띄우는 건 '바로 플레이하기' 버튼(대화형)만.
//  의존성은 인자로 받는다 — 브라우저·테스트 어디서든 같은 코드가 돈다.
// =============================================================

const FIELDS = ['publicKeyUrl', 'signature', 'salt', 'timestamp', 'teamPlayerID', 'bundleID'];

// → { identity } | { notSignedIn: true }. 그 밖의 실패는 throw(사유가 메시지에 남는다).
export async function getGcIdentity({ plugin, interactive = false }) {
  if (!plugin) throw new Error('GameCenter plugin 없음 — 앱 빌드에 플러그인이 빠졌다');
  let { authenticated } = await plugin.isAuthenticated();
  if (!authenticated && interactive) ({ authenticated } = await plugin.signIn());
  if (!authenticated) return { notSignedIn: true };
  const got = await plugin.fetchIdentity();
  const missing = FIELDS.filter(k => !got?.[k]);
  if (missing.length) throw new Error('신원 필드 없음: ' + missing.join(','));
  return { identity: Object.fromEntries(FIELDS.map(k => [k, String(got[k])])) };
}
