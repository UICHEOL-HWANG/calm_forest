// 🍲 자유 냄비 표 검수 페이지 — ★5·★1~2 항목을 위로 모아 한 장으로 본다
import { writeFileSync } from 'node:fs';
import { FREE_POT_TABLE } from '../../js/free-pot/table.js';
import { buffOf, durOf, stageOf, freeCombos } from '../../js/free-pot/rules.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rank = (e) => (e.taste === 5 ? 0 : e.taste <= 2 ? 1 : 2);
const rows = Object.entries(FREE_POT_TABLE).sort(([, a], [, b]) => rank(a) - rank(b) || b.taste - a.taste);
const missing = freeCombos().filter(k => !FREE_POT_TABLE[k]);
const hist = [1, 2, 3, 4, 5].map(t => rows.filter(([, e]) => e.taste === t).length);
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Free pot review</title>
<style>body{font:14px system-ui;margin:16px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left}.s5{background:#fff5d6}.s1,.s2{background:#fde8e8}</style>
<h1>🍲 자유 냄비 표 검수</h1>
<p>채움 ${rows.length}/${freeCombos().length} · 빠짐 ${missing.length} · ★1~5 분포 ${hist.join(' / ')}</p>
<table><tr><th>조합</th><th>요리</th><th>★</th><th>평</th><th>EN</th><th>버프·지속·판</th><th>태그</th></tr>
${rows.map(([k, e]) => `<tr class="s${e.taste}"><td>${esc(k)}</td><td>${esc(e.ico)} ${esc(e.name)}</td><td>${e.taste}</td><td>${esc(e.judge)}</td><td>${esc(e.name_en)} — ${esc(e.judge_en)}</td><td>${buffOf(k)} · ${durOf(e.taste)}s · ${stageOf(k)}</td><td>${esc(e.tags.join(','))}</td></tr>`).join('\n')}
</table>`;
writeFileSync(new URL('../../dev/active/free-pot/review.html', import.meta.url), html);
console.log(`review.html · ${rows.length}행`);
