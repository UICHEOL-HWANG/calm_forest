const CODE_RE = /^[A-Z0-9]{4,16}$/;
const PATH_RE = /\/g\/([A-Za-z0-9-]{4,20})(?=[/?#]|$)/;

export function normalizeGiftCode(text) {
  const s = String(text ?? '').trim().replace(/[\s-]+/g, '').toUpperCase();
  return CODE_RE.test(s) ? s : null;
}

export function readGiftParam(search) {
  const str = String(search || '').split('#')[0];
  const path = str.match(PATH_RE);
  if (path) return normalizeGiftCode(path[1]);
  const q = str.indexOf('?');
  try { return normalizeGiftCode(new URLSearchParams(q >= 0 ? str.slice(q) : str).get('gift')); } catch (e) { return null; }
}
