export function withUtf8(res) {
  const type = res.headers.get('content-type') || '';
  if (!/^text\/html\b/i.test(type) || /charset=/i.test(type)) return res;
  const out = new Response(res.body, res);
  out.headers.set('Content-Type', 'text/html; charset=utf-8');
  return out;
}
