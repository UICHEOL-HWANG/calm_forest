export const WRAP_COST = 15;
export const WRAP_LOVE = 1;
export const WRAP_PAPERS = Object.freeze([
  Object.freeze({ id: 'kraft', name: '크라프트' }),
  Object.freeze({ id: 'floral', name: '꽃무늬' }),
  Object.freeze({ id: 'starry', name: '별밤' }),
]);
export const KEEP_TIERS = Object.freeze(['master', 'fine', 'decent', 'rough']);
const KEPT_RE = /^cv:([a-z]+):([a-z]+)(?::([a-z]+))?$/;

export function keptGiftId(design, tier, paper = null) {
  return paper ? `cv:${design}:${tier}:${paper}` : `cv:${design}:${tier}`;
}

export function parseKeptGift(id) {
  if (typeof id !== 'string') return null;
  const m = KEPT_RE.exec(id);
  if (!m || !KEEP_TIERS.includes(m[2])) return null;
  const paper = m[3] || null;
  if (paper && !WRAP_PAPERS.some(p => p.id === paper)) return null;
  return { design: m[1], tier: m[2], paper };
}

export function keepLove(tier) {
  return tier === 'master' ? 2 : 1;
}

export function giftLove(id, recipes) {
  const kept = parseKeptGift(id);
  if (kept) return keepLove(kept.tier) + (kept.paper ? WRAP_LOVE : 0);
  const g = recipes.find(x => x.id === id);
  return g ? (g.love || 1) : 0;
}

export function restoreGifts(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
  return Object.fromEntries(Object.entries(saved)
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v >= 1)
    .map(([k, v]) => [k, Math.floor(v)]));
}

export function addGift(gifts, id, n = 1) {
  return { ...gifts, [id]: (gifts[id] || 0) + n };
}

export function takeGift(gifts, id) {
  const have = gifts[id] || 0;
  if (have <= 0) return null;
  const rest = Object.fromEntries(Object.entries(gifts).filter(([k]) => k !== id));
  return have > 1 ? { ...rest, [id]: have - 1 } : rest;
}

export function wrapKept(gifts, id, paper) {
  const kept = parseKeptGift(id);
  if (!kept || kept.paper || !WRAP_PAPERS.some(p => p.id === paper)) return null;
  const left = takeGift(gifts, id);
  return left ? addGift(left, keptGiftId(kept.design, kept.tier, paper)) : null;
}

export function keptGiftList(gifts, designs) {
  return Object.entries(gifts)
    .map(([id, n]) => ({ id, n, kept: parseKeptGift(id) }))
    .filter(e => e.kept && e.n > 0)
    .map(e => ({ ...e, d: designs.find(d => d.id === e.kept.design) }))
    .filter(e => e.d)
    .map(e => ({ id: e.id, n: e.n, design: e.kept.design, tier: e.kept.tier, paper: e.kept.paper,
      ico: e.d.ico, name: e.d.name, love: keepLove(e.kept.tier) + (e.kept.paper ? WRAP_LOVE : 0) }))
    .sort((a, b) => b.love - a.love || a.id.localeCompare(b.id));
}

export function objParticle(word) {
  const code = String(word).trim().slice(-1).charCodeAt(0) - 0xac00;
  if (!(code >= 0 && code <= 11171)) return '을(를)';
  return code % 28 ? '을' : '를';
}
