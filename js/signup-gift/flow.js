const GUEST_PROVIDERS = new Set(['anonymous', 'offline']);

export async function runSignupGift({ auth, call, resync, track, show }) {
  if (!auth || auth.isGuest || GUEST_PROVIDERS.has(auth.provider)) return null;
  const res = await call('claim');
  if (!res || res.error) {
    track('signup_gift_claim', { result: 'net_fail', item: '' });
    return null;
  }
  if (!res.ok) {
    track('signup_gift_claim', { result: String(res.reason || 'unknown'), item: '' });
    return res;
  }
  if (!res.new) return res;
  track('signup_gift_claim', { result: 'new', item: res.item });
  await resync('signup_gift', { quiet: true });
  show(res.item);
  return res;
}
