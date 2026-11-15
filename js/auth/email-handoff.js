const FLAG = 'cf_login_email';
const FROM = 'cf_login_email_from';

export function requestEmailHandoff(storage, from = 'login_nudge') {
  try { storage.setItem(FLAG, '1'); storage.setItem(FROM, from); return true; } catch { return false; }
}

export function pendingEmailHandoff(storage) {
  try { return storage.getItem(FLAG) === '1'; } catch { return false; }
}

export function takeEmailHandoff(storage) {
  if (!pendingEmailHandoff(storage)) return null;
  let from = 'login_nudge';
  try { from = storage.getItem(FROM) || from; storage.removeItem(FLAG); storage.removeItem(FROM); } catch { }
  return { from };
}
