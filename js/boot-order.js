export function once(load) {
  let p = null;
  return () => {
    if (p) return p;
    const cur = Promise.resolve().then(load);
    p = cur;
    cur.catch(() => { if (p === cur) p = null; });
    return cur;
  };
}

export function hasStoredAuthSession(storage, supabaseUrl) {
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    if (!ref) return false;
    return !!storage?.getItem?.(`sb-${ref}-auth-token`);
  } catch {
    return false;
  }
}

export function loginFirst({ platform, storedSession }) {
  return platform === 'web' && !storedSession;
}
