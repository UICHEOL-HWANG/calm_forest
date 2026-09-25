// =============================================================
//  📱 구글 플레이 앱(Capacitor) Play Games 자동 로그인 — 서버용 authCode 받기
//  ------------------------------------------------------------
//  토스 식별키(signInWithToss)와 같은 자리다: 앱이 켜지면 Play Games v2 SDK 가 조용히 인증하고,
//  우리는 1회용 authCode 만 받아 pgs-auth Worker 로 넘긴다(Worker 가 구글과 교환해 playerId 를 확정).
//  네이티브 쪽은 android/.../PlayGamesPlugin.java — JS 에서는 js/cap-bridge.js capPlugin("PlayGames") 로 부른다.
//
//  ⚠️ serverClientId 는 Play Games 설정의 **게임 서버(웹 애플리케이션)** 클라이언트 ID.
//     Android 클라이언트 ID 를 넣으면 교환이 실패한다.
//  ⚠️ 부팅(비대화형)에서는 signIn() 을 부르지 않는다 — 창을 띄우는 건 '바로 플레이하기' 버튼(대화형)만.
//  의존성은 인자로 받는다 — 브라우저·테스트 어디서든 같은 코드가 돈다.
// =============================================================

// → { authCode } | { notSignedIn: true }. 그 밖의 실패는 throw(사유가 메시지에 남는다).
export async function getPgsAuthCode({ plugin, serverClientId, interactive = false }) {
  if (!plugin) throw new Error('PlayGames plugin 없음 — 앱 빌드에 플러그인이 빠졌다');
  if (!serverClientId) throw new Error('serverClientId 미설정 — CONFIG.PGS_SERVER_CLIENT_ID');
  let { authenticated } = await plugin.isAuthenticated();
  if (!authenticated && interactive) ({ authenticated } = await plugin.signIn());
  if (!authenticated) return { notSignedIn: true };
  const { authCode } = await plugin.requestServerSideAccess({ serverClientId });
  if (!authCode) throw new Error('authCode 비어 있음');
  return { authCode };
}
