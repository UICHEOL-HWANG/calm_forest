import { readBearer, getUserId, json } from './_cards-auth.js';
import { getSheetsToken, batchGet, writeRows } from './_gsheets.js';
import { LANDINGS, SHORT_BASE, isSlug, validateInput, buildFinalUrl, makeCode, sheetRow, kstDate } from './_utm.js';

const TAB = '링크내역';
const RANGES = ['Links!A4:A', 'Links!D4:D', `${TAB}!A2:I`];
const RECENT = 30;

let tokenFn = getSheetsToken;
export function __setSheetsToken(fn) { tokenFn = fn || getSheetsToken; }

const firstCol = (rows) => rows.map((r) => String(r?.[0] ?? '').trim()).filter(isSlug);
const codeOf = (shortUrl) => (String(shortUrl || '').startsWith(SHORT_BASE) ? shortUrl.slice(SHORT_BASE.length) : '');

async function loadSheet(env) {
  if (!env.UTM_SHEET_ID) throw new Error('UTM_SHEET_ID missing');
  const token = await tokenFn(env);
  const [src, med, rows] = await batchGet(env.UTM_SHEET_ID, RANGES, token);
  return { token, sources: firstCol(src), mediums: firstCol(med), rows };
}

async function admin(request, env) {
  return getUserId(readBearer(request), env);
}

function sheetError(err) {
  console.error(JSON.stringify({ message: 'utm sheet error', error: err instanceof Error ? err.message : String(err) }));
  return json({ error: '시트에 연결하지 못했어요. 서비스 계정 공유와 GOOGLE_SA_JSON 을 확인해 주세요.' }, 502);
}

export async function onRequestGet({ request, env }) {
  if (!await admin(request, env)) return json({ error: 'unauthorized' }, 401);
  let sheet;
  try { sheet = await loadSheet(env); } catch (err) { return sheetError(err); }

  const recent = await Promise.all(sheet.rows.filter((r) => r?.[0]).slice(-RECENT).reverse().map(async (r) => {
    const code = codeOf(r[8]);
    const clicks = code ? Number(await env.UTM_LINKS.get(`c:${code}`)) || 0 : null;
    return {
      date: r[0], source: r[1] || '', medium: r[2] || '', campaign: r[3] || '', content: r[4] || '',
      landing: r[5] || '', finalUrl: r[6] || '', memo: r[7] || '', shortUrl: r[8] || '', code, clicks,
    };
  }));

  const landings = Object.entries(LANDINGS).map(([id, l]) => ({ id, label: l.label }));
  return json({ sources: sheet.sources, mediums: sheet.mediums, landings, recent });
}

export async function onRequestPost({ request, env }) {
  if (!await admin(request, env)) return json({ error: 'unauthorized' }, 401);
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'bad body' }, 400);

  let sheet;
  try { sheet = await loadSheet(env); } catch (err) { return sheetError(err); }

  const v = validateInput(body, sheet);
  if (!v.ok) return json({ error: v.error }, 400);

  const input = {
    source: body.source, medium: body.medium, campaign: body.campaign,
    content: body.content || '', memo: (body.memo || '').trim(),
  };
  const date = kstDate();
  const links = body.landings.map((landing) => {
    const code = makeCode();
    return { landing, code, finalUrl: buildFinalUrl(landing, input), shortUrl: SHORT_BASE + code };
  });

  try {
    await Promise.all(links.map((l) => env.UTM_LINKS.put(`l:${l.code}`, JSON.stringify({
      url: l.finalUrl, landing: l.landing, ...input, date,
    }))));
    const startRow = 2 + sheet.rows.length;
    await writeRows(env.UTM_SHEET_ID, TAB, startRow, links.map((l) => sheetRow({ date, ...input, ...l })), sheet.token);
  } catch (err) {
    await Promise.allSettled(links.map((l) => env.UTM_LINKS.delete(`l:${l.code}`)));
    return sheetError(err);
  }

  return json({ date, links });
}
