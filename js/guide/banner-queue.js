export const BANNER_PRIORITY = Object.freeze({ tutorial: 50, quest: 40, place: 30, feature: 20, misc: 10 });
export const BANNER_BURST_MS = 60000;
export const BANNER_FEATURE_GAP_MS = 20000;
export const BANNER_STATS0 = Object.freeze({ lastFeatureAt: -Infinity, featuresShown: 0 });

const rank = (b) => BANNER_PRIORITY[b.kind] ?? BANNER_PRIORITY.misc;

export function enqueueBanner(queue, item) {
  if (item.key && queue.some(i => i.key === item.key)) return queue;
  return Object.freeze([...queue, Object.freeze({ ...item })]);
}

function featureReady(ctx) {
  if (ctx.now - ctx.lastFeatureAt < BANNER_FEATURE_GAP_MS) return false;
  return !(ctx.now - ctx.sessionStart < BANNER_BURST_MS && ctx.featuresShown >= 1);
}

function eligible(item, ctx) {
  if (!ctx.visible) return false;
  if ((ctx.tutorial || ctx.modalDue) && item.kind !== 'tutorial') return false;
  return item.kind !== 'feature' || featureReady(ctx);
}

export function pickBanner(queue, ctx) {
  const alive = queue.filter(i => !i.live || i.live());
  const item = [...alive].sort((a, b) => rank(b) - rank(a)).find(i => eligible(i, ctx)) || null;
  if (!item && alive.length === queue.length) return null;
  return { item, rest: Object.freeze(alive.filter(i => i !== item)) };
}

export const yieldedBanner = (item) => Object.freeze({ ...item, burn: null, onShow: null });

export const noteBannerShown = (stats, item, now) => item.kind === 'feature'
  ? Object.freeze({ lastFeatureAt: now, featuresShown: stats.featuresShown + 1 })
  : stats;
