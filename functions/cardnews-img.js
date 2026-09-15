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
/** 카드 묶음 이름 + 2자리 번호(.jpg), 또는 릴스 영상(.mp4).
 *  `..` · 절대경로 · 중첩 경로를 전부 배제한다. */
const KEY_RE = /^[a-z0-9][a-z0-9._-]{0,63}\/(?:\d{2}\.jpg|[a-z0-9][a-z0-9._-]{0,63}\.mp4)$/;

const TYPES = { jpg: 'image/jpeg', mp4: 'video/mp4' };

export async function onRequestGet({ request, env }) {
  if (!env.CARDNEWS) return new Response('not_configured', { status: 503 });

  const key = decodeURIComponent(new URL(request.url).pathname.slice(PREFIX.length));
  if (!KEY_RE.test(key)) return new Response('not_found', { status: 404 });

  const body = await env.CARDNEWS.get(key, 'arrayBuffer');
  if (!body) return new Response('not_found', { status: 404 });

  const type = TYPES[key.slice(key.lastIndexOf('.') + 1)] || 'application/octet-stream';
  const total = body.byteLength;
  const headers = {
    'content-type': type,
    // Meta 가 한 번만 긁어가므로 길게 캐시할 이유가 없다. 재발행 때 갱신이 빨라야 한다.
    'cache-control': 'public, max-age=600',
    // ⚠️ 영상 페처는 Range 로 긁어간다. accept-ranges 가 없으면 아예 안 가져가기도 한다.
    'accept-ranges': 'bytes',
  };

  // ── Range 요청 ─────────────────────────────────────────────
  //  KV 는 값을 통째로 준다. 구간을 잘라 주는 건 여기서 한다.
  const range = request.headers.get('range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (m) {
    let start = m[1] === '' ? null : Number(m[1]);
    let end = m[2] === '' ? null : Number(m[2]);
    if (start === null && end !== null) { start = Math.max(0, total - end); end = total - 1; }
    else if (start !== null && end === null) { end = total - 1; }
    if (start === null || start >= total || start > end) {
      return new Response('range_not_satisfiable',
        { status: 416, headers: { 'content-range': `bytes */${total}` } });
    }
    end = Math.min(end, total - 1);
    return new Response(body.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${total}` },
    });
  }

  return new Response(body, { headers });
}
