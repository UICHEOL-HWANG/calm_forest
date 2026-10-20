const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';

let cached = { token: null, exp: 0 };

const b64url = (buf) => {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function pemToDer(pem) {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0)).buffer;
}

export function parseServiceAccount(raw) {
  let sa;
  try { sa = JSON.parse(raw || ''); } catch { return null; }
  return sa?.client_email && sa?.private_key ? sa : null;
}

export async function getSheetsToken(env, now = Date.now()) {
  if (cached.token && cached.exp - 60_000 > now) return cached.token;
  const sa = parseServiceAccount(env?.GOOGLE_SA_JSON);
  if (!sa) throw new Error('GOOGLE_SA_JSON secret missing or invalid');
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`google token ${res.status}`);
  const data = await res.json();
  cached = { token: data.access_token, exp: now + (data.expires_in || 3600) * 1000 };
  return cached.token;
}

export async function batchGet(sheetId, ranges, token) {
  const q = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const res = await fetch(`${API}/${sheetId}/values:batchGet?${q}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`sheets batchGet ${res.status}`);
  const data = await res.json();
  return (data.valueRanges || []).map((v) => v.values || []);
}

export async function writeRows(sheetId, tab, startRow, rows, token) {
  const range = `${tab}!A${startRow}:I${startRow + rows.length - 1}`;
  const res = await fetch(`${API}/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: rows }),
  });
  if (!res.ok) throw new Error(`sheets write ${res.status}`);
}
