// =============================================================
//  calm forest · 🗂️ 카드뉴스 이미지 서빙 (발행용 임시 호스팅)
//  ------------------------------------------------------------
//  KV 에 올려둔 카드 JPEG 를 공개 URL 로 내보낸다.
//
//  ⚠️ 인증을 붙이면 안 된다. 인스타 발행은 Meta 서버가 image_url 을 직접
//     가져가는 방식이라 Authorization 헤더를 붙일 주체가 없다.
//     대신 키 형식을 <묶음이름>/NN.jpg 로 못박아 경로 주입을 차단하고,
//     업로드 때 TTL 을 걸어 발행이 끝나면 스스로 사라지게 한다.
//     (어차피 이 이미지들은 인스타에 공개될 마케팅 카드다 — 숨길 내용이 없다)
// =============================================================

const PREFIX = '/cardnews/';
/** 카드 묶음 이름 + 2자리 번호. `..` · 절대경로 · 중첩 경로를 전부 배제한다 */
const KEY_RE = /^[a-z0-9][a-z0-9._-]{0,63}\/\d{2}\.jpg$/;

export async function onRequestGet({ request, env }) {
  if (!env.CARDNEWS) return new Response('not_configured', { status: 503 });

  const key = decodeURIComponent(new URL(request.url).pathname.slice(PREFIX.length));
  if (!KEY_RE.test(key)) return new Response('not_found', { status: 404 });

  const body = await env.CARDNEWS.get(key, 'arrayBuffer');
  if (!body) return new Response('not_found', { status: 404 });

  return new Response(body, {
    headers: {
      'content-type': 'image/jpeg',
      // Meta 가 한 번만 긁어가므로 길게 캐시할 이유가 없다. 재발행 때 갱신이 빨라야 한다.
      'cache-control': 'public, max-age=600',
    },
  });
}
