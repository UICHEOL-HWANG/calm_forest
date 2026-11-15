import { storeHeaders, storeReady } from '../api/_ai-store.js';
import { getAccessToken, readServiceAccount, sendFcm } from './fcm.js';
import { kstDates } from './pick-kind.js';
import { WEEKLY_COPY } from '../../js/weekly/copy.js';
import { weekIndex } from '../../js/weekly/rules.js';

export const MARKET_KIND = 'market';
export const SUBREQUEST_LIMIT = 50;
export const MARKET_OVERHEAD = 4;
export const MARKET_SEND_CAP = 40;
export const MARKET_FETCH_LIMIT = 100;

const KST_MS = 9 * 3600 * 1000;
const FIRST_MINUTE_OF_DAY = 20 * 60 + 10;
const LAST_MINUTE_OF_DAY = 22 * 60 + 50;
const FRIDAY = 5;
const MARKET_TITLE = { ko: `🛒 ${WEEKLY_COPY.market.title}`, en: '🛒 Weekend market' };
const EN_BODY = 'The weekend market is open from today through Sunday';

export function isMarketTick(scheduledTime) {
  const k = new Date(scheduledTime + KST_MS);
  const minuteOfDay = k.getUTCHours() * 60 + k.getUTCMinutes();
  return k.getUTCDay() === FRIDAY && minuteOfDay >= FIRST_MINUTE_OF_DAY && minuteOfDay <= LAST_MINUTE_OF_DAY && k.getUTCMinutes() % 20 === 10;
}

export function marketMessage(lang = 'ko') {
  const en = lang === 'en';
  return { title: en ? MARKET_TITLE.en : MARKET_TITLE.ko, body: en ? EN_BODY : WEEKLY_COPY.banner };
}

export function marketBudget(night) {
  const sends = (night?.sent | 0) + (night?.failed | 0) + (night?.dead | 0);
  const ran = typeof night?.candidates === 'number' && night.candidates > 0;
  const used = ran ? 1 + 1 + sends + (night.error ? 1 : 0) + 2 : night?.skipped ? 0 : 1;
  return Math.max(0, Math.min(MARKET_SEND_CAP, SUBREQUEST_LIMIT - used - MARKET_OVERHEAD));
}

export async function runMarketPush(env, { now = Date.now(), fetch: fetchFn = fetch, budget = MARKET_SEND_CAP } = {}) {
  const sa = readServiceAccount(env);
  if (!storeReady(env) || !sa) return { skipped: 'not-configured' };
  if (budget <= 0) return { skipped: 'budget' };
  const week = weekIndex(now);
  const today = kstDates(now).today;
  const rest = path => `${env.SUPABASE_URL}/rest/v1/${path}`;

  let rows;
  try {
    const res = await fetchFn(rest('rpc/push_market_candidates'), {
      method: 'POST', headers: storeHeaders(env),
      body: JSON.stringify({ p_week: week, p_today: today, p_limit: MARKET_FETCH_LIMIT }),
    });
    if (!res.ok) return { error: `candidates ${res.status}` };
    rows = await res.json();
  } catch (e) { return { error: `candidates ${e?.message}` }; }
  if (!Array.isArray(rows) || !rows.length) return { candidates: 0, sent: 0, checked: 0 };

  let accessToken = null, stop = null;
  const checked = [], dead = [], logs = [];
  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      if (sent + failed + dead.length >= budget) break;
      accessToken ??= await getAccessToken(env, { fetch: fetchFn, now });
      if (!accessToken) { stop = 'fcm-auth'; break; }

      const id = crypto.randomUUID();
      const { title, body } = marketMessage(row.lang);
      const r = await sendFcm({ projectId: sa.project_id, accessToken, token: row.token, title, body,
        data: { kind: MARKET_KIND, send_id: id } }, { fetch: fetchFn });
      if (r.status === 401 || r.status === 403) { stop = 'fcm-auth'; break; }
      logs.push({ id, user_id: row.user_id, kind: MARKET_KIND, status: r.ok ? 'sent' : r.dead ? 'dead' : 'failed',
        http: r.status, sent_on: today });
      if (r.ok) { sent++; checked.push(row.token); }
      else if (r.dead) { dead.push(row.token); checked.push(row.token); }
      else if (r.status >= 400 && r.status < 500) { failed++; checked.push(row.token); }
      else { failed++; }
    } catch (e) {
      console.warn('[push-market] row failed', e?.message);
      checked.push(row.token);
    }
  }

  let logError = null;
  if (logs.length) {
    try {
      const lg = await fetchFn(rest('push_logs'), { method: 'POST', headers: storeHeaders(env, 'return=minimal'), body: JSON.stringify(logs) });
      if (!lg.ok) logError = `logs ${lg.status}`;
    } catch (e) { logError = `logs ${e?.message}`; }
    if (logError) console.warn('[push-market] log insert failed', logError);
  }
  const left = rows.length - checked.length;
  try {
    const m = await fetchFn(rest('rpc/push_market_mark'), { method: 'POST', headers: storeHeaders(env),
      body: JSON.stringify({ p_week: week, p_checked: checked, p_dead: dead }) });
    if (!m.ok) throw new Error(`push_market_mark ${m.status}`);
  } catch (e) {
    console.warn('[push-market] mark failed', e?.message);
    return { candidates: rows.length, sent, failed, dead: dead.length, checked: checked.length, left, error: 'mark' };
  }
  const error = stop || logError;
  return { candidates: rows.length, sent, failed, dead: dead.length, checked: checked.length, left, ...(error ? { error } : {}) };
}
