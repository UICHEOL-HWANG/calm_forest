import { KEYS, STAGE1_BUNDLE, normalizeGiftCode, nextClaims, settle } from './rules.js';

const read = (s, k) => { try { return s.getItem(k); } catch (e) { return null; } };
const write = (s, k, v) => { try { s.setItem(k, v); return true; } catch (e) { return false; } };
const drop = (s, k) => { try { s.removeItem(k); } catch (e) { return; } };

export function pendingCode(storage) {
  return normalizeGiftCode(read(storage, KEYS.code));
}

export function captureCode({ storage, code, via, force = false, track }) {
  const c = normalizeGiftCode(code);
  if (!c) return null;
  if (!force && read(storage, KEYS.seen) === c) return null;
  if (!write(storage, KEYS.code, c)) return null;
  write(storage, KEYS.via, via);
  write(storage, KEYS.seen, c);
  track('promo_gift_arrive', { code: c, via });
  return c;
}

export async function runPromoGift({ auth, storage, call, grant, show, track }) {
  const code = pendingCode(storage);
  const loggedIn = !auth?.isGuest && auth?.provider !== 'anonymous' && auth?.provider !== 'offline';
  const stages = nextClaims({ isGuest: !!auth?.isGuest, provider: auth?.provider, stage1Device: read(storage, KEYS.device) === '1', hasCode: !!code });
  const views = [];
  for (const stage of stages) {
    const res = await call(stage, code);
    const s = settle(stage, res);
    track('promo_gift_claim', { code, step: stage, result: s.result });
    if (s.mark) write(storage, KEYS.device, '1');
    if (!s.keep) drop(storage, KEYS.code);
    if (s.show === 1) grant(STAGE1_BUNDLE);
    if (s.show) views.push({ stage: s.show, label: res.label || null, labelEn: res.label_en || null, loggedIn });
    if (s.stop) break;
  }
  for (const v of views) await show(v);
  return views;
}
