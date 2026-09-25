// =============================================================
//  📱 구글 플레이 앱 사진 저장·공유 — 네이티브 PhotoPlugin 호출
//  ------------------------------------------------------------
//  WebView 는 <a download> 를 조용히 무시하고 navigator.share 도 없다
//  (2026-09-25 실기기: 📷 저장·공유 버튼 무반응). 앱에서는 네이티브로 넘긴다:
//   save      → 갤러리(Pictures/calmforest)에 저장(MediaStore)
//   share     → 안드로이드 공유 시트(이미지 + 문구)
//   shareText → 링크 공유(앨범)
//  네이티브는 android/.../PhotoPlugin.java, JS 에서는 capPlugin('Photo') 로 받는다.
//  의존성은 인자로 받는다 — 테스트에서 가짜 플러그인으로 돈다.
// =============================================================

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export function splitDataUrl(dataUrl) {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl || '');
  return m ? { mime: m[1], base64: m[2] } : null;
}

function prepare(plugin, dataUrl) {
  if (!plugin) throw new Error('Photo plugin 없음 — 앱 빌드에 플러그인이 빠졌다');
  const parts = splitDataUrl(dataUrl);
  if (!parts) throw new Error('dataUrl 아님');
  return parts;
}

export async function savePhotoNative({ plugin, dataUrl, now = Date.now() }) {
  const { mime, base64 } = prepare(plugin, dataUrl);
  return plugin.save({ base64, mime, fileName: `calmforest-${now}.${EXT[mime] || 'png'}` });
}

export async function sharePhotoNative({ plugin, dataUrl, text }) {
  const { mime, base64 } = prepare(plugin, dataUrl);
  return plugin.share({ base64, mime, text });
}

export async function shareUrlNative({ plugin, url, title }) {
  if (!plugin) throw new Error('Photo plugin 없음 — 앱 빌드에 플러그인이 빠졌다');
  return plugin.shareText({ text: url, title });
}
