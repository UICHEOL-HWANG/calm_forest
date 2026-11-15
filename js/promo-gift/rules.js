import { normalizeGiftCode, readGiftParam } from './code.js';

const KEEP_REASONS = new Set(['anonymous', 'not_started', 'no_user']);

export const STAGE1_BUNDLE = Object.freeze({ coins: 200, seed_wheat: 3, seed_corn: 3, seed_grape: 3, fert: 5, bait: 5 });
export const PROMO_DECOR_IDS = Object.freeze(['promoballoon', 'promosuitcase']);
export const KEYS = Object.freeze({ code: 'cf_gift_code', via: 'cf_gift_via', device: 'cf_gift_stage1_device', seen: 'cf_gift_link_seen' });
export const VIAS = Object.freeze(['url', 'deeplink', 'referrer', 'toss', 'manual']);

export { normalizeGiftCode, readGiftParam };

export function giftFromReferrer(raw) {
  let text = String(raw || '').trim();
  if (!text) return null;
  if (!text.includes('=') && /%3d/i.test(text)) {
    try { text = decodeURIComponent(text); } catch (e) { return null; }
  }
  try { return normalizeGiftCode(new URLSearchParams(text).get('gift')); } catch (e) { return null; }
}

export function nextClaims({ isGuest, provider, stage1Device, hasCode }) {
  if (!hasCode || provider === 'offline') return [];
  const guest = !!isGuest || provider === 'anonymous';
  if (guest) return stage1Device ? [] : [1];
  return stage1Device ? [2] : [1, 2];
}

export function settle(stage, res) {
  if (!res || res.error) return { result: 'net_fail', keep: true, mark: false, show: null, stop: true };
  if (res.ok) return { result: res.new ? 'new' : 'dup', keep: stage === 1, mark: stage === 1, show: res.new ? stage : null, stop: false };
  const reason = String(res.reason || 'unknown');
  return { result: reason, keep: KEEP_REASONS.has(reason), mark: false, show: null, stop: true };
}
