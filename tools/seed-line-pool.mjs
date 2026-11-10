import { pathToFileURL } from 'node:url';
import { cells, SLOTS } from '../js/lines/slots.js';
import { generateCell } from '../functions/api/_line-gen.js';
import { createPacer, mapLimit, CONCURRENCY, SPACING_MS } from '../functions/api/_exaone.js';
import { storeReady } from '../functions/api/_ai-store.js';
import { runLinePool } from '../functions/line-pool-cron.js';

export function sampleTable(results) {
  const rows = ['| key | slot | lang | 문구 |', '|---|---|---|---|'];
  const notes = [];
  for (const { cell, lines, dropped, failure } of results) {
    if (failure) rows.push(`| ${cell.key} | ${cell.slot} | ${cell.lang} | (실패: ${failure}) |`);
    for (const l of lines) rows.push(`| ${cell.key} | ${cell.slot} | ${cell.lang} | ${l.replace(/\|/g, '\\|')} |`);
    const d = Object.entries(dropped || {}).map(([k, v]) => `${k} ${v}`).join(', ');
    if (d) notes.push(`- ${cell.key}/${cell.slot}/${cell.lang} 버림: ${d}`);
  }
  return [...rows, '', ...notes].join('\n');
}

async function sample(env, kind, n) {
  const pace = createPacer(SPACING_MS);
  const results = await mapLimit(cells(kind), CONCURRENCY, async cell => ({ cell, ...(await pace(() => generateCell(env, cell, n, { seen: new Set() }))) }));
  return sampleTable(results);
}

export function parseArgs(argv) {
  let kind = 'auction';
  let sample = null;
  let seenKind = false;
  let seenSample = false;
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === '--sample' && !seenSample) {
      if (!/^[1-9]\d{0,3}$/.test(val ?? '')) throw new Error(`--sample 에는 1 이상 9999 이하의 정수가 필요합니다: ${val}`);
      sample = Number(val);
      seenSample = true;
    } else if (flag === '--kind' && !seenKind) {
      if (!Object.hasOwn(SLOTS, val ?? '')) throw new Error(`알 수 없는 --kind: ${val}`);
      kind = val;
      seenKind = true;
    } else {
      throw new Error(`허용되지 않는 인자: ${flag}`);
    }
  }
  return { kind, sample };
}

async function main(argv) {
  const { kind, sample: n } = parseArgs(argv);
  const env = process.env;
  if (!env.EXAONE_API_KEY) throw new Error('EXAONE_API_KEY 없음');
  if (n !== null) {
    process.stdout.write(`${await sample(env, kind, n)}\n`);
    return;
  }
  if (!storeReady(env)) throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 없음');
  const r = await runLinePool(env, { source: 'seed', kinds: [kind], maxCalls: 1000, notify: async (_e, title, body) => console.error(title, body) });
  console.log(JSON.stringify(r));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(e => { console.error(e); process.exit(1); });
}
