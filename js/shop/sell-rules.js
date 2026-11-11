export function sellQty(have, req) {
  const n = Math.max(0, Math.floor(have || 0));
  if (n <= 0) return 0;
  if (req === true) return n;
  if (typeof req === 'number' && Number.isFinite(req)) return Math.min(n, Math.max(1, Math.floor(req)));
  return 1;
}

export function clampQty(q, have) {
  if (!(have > 0)) return 0;
  const v = Number.isFinite(q) ? Math.floor(q) : 1;
  return Math.min(have, Math.max(1, v));
}

export function itemName(label) {
  return String(label ?? '').replace(/^[^\p{L}\p{N}]+/u, '');
}

export function sellList(market, inv) {
  return market
    .filter(m => (inv[m.k] || 0) > 0)
    .map(m => ({ k: m.k, ico: m.ico, name: itemName(m.label), price: m.price, rate: m.rate, have: inv[m.k] }))
    .sort((a, b) => b.rate - a.rate);
}
