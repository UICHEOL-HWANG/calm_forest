import { pathToFileURL } from 'node:url';
import { cells } from '../js/lines/slots.js';
import { generateCell } from '../functions/api/_line-gen.js';
import { createPacer, mapLimit, CONCURRENCY, SPACING_MS } from '../functions/api/_exaone.js';
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

async function main(argv) {
  const arg = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
  const kind = arg('--kind') || 'auction';
  const n = Number(arg('--sample')) || 0;
  const env = process.env;
  if (!env.EXAONE_API_KEY) throw new Error('EXAONE_API_KEY 없음');
  if (n) {
    process.stdout.write(`${await sample(env, kind, n)}\n`);
    return;
  }
  const r = await runLinePool(env, { source: 'seed', kinds: [kind], maxCalls: 1000, notify: async (_e, title, body) => console.error(title, body) });
  console.log(JSON.stringify(r));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(e => { console.error(e); process.exit(1); });
}
