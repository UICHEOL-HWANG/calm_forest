// =============================================================
//  📱 Capacitor 네이티브 플러그인 호출 어댑터
//  ------------------------------------------------------------
//  ⚠️ window.Capacitor.Plugins 는 @capacitor/core 의 registerPlugin() 이 채운다.
//     이 게임은 번들러 없이 돌아서 @capacitor/core 를 불러오지 않으므로 Plugins 가 **비어 있다**
//     — 2026-09-25 실기기에서 Play Games 로그인이 서버 요청 0건으로 게스트로 빠진 원인.
//  네이티브 브리지(native-bridge.js)가 기본 제공하는 Capacitor.nativePromise(플러그인, 메서드, 옵션)로
//  직접 부른다. 앱에 그 플러그인이 없으면(PluginHeaders 에 없음) undefined → 호출부가 폴백.
// =============================================================

export function capPlugin(name, cap = globalThis.Capacitor) {
  if (!cap) return undefined;                                    // 웹·토스·itch
  if (cap.Plugins?.[name]) return cap.Plugins[name];             // @capacitor/core 가 이미 등록한 경우
  if (typeof cap.nativePromise !== 'function') return undefined;
  if (Array.isArray(cap.PluginHeaders) && !cap.PluginHeaders.some(h => h.name === name)) return undefined;
  return new Proxy({}, {
    // then 은 막는다 — 안 막으면 await 할 때 thenable 로 오인돼 네이티브 'then' 을 부른다
    get: (_, method) => (typeof method !== 'string' || method === 'then')
      ? undefined
      : (options = {}) => cap.nativePromise(name, method, options),
  });
}
