// 🦆 사공 퀴즈 문제 검수 페이지 — 템플릿마다 시드 1..300 으로 나오는 서로 다른 문제를 전부 모아 ko/en 표로.
//    사용: node tools/ferry-quiz/review.mjs → dev/active/ferry-quiz/review.html
//    C안(나루터 팻말)은 표찰 4개가 한 줄 — 보기가 길면 2×2 로 접는다. 그 대상을 표에 표시한다.
import { writeFileSync } from 'node:fs';
import { QUIZ_TEMPLATES } from '../../js/ferry-quiz.js';
import { nodeQuizData } from './data-node.mjs';

export const LONG_CHOICE = 5;   // 한국어 글자 수(이모지 제외) — 넘으면 표찰 2×2
const OUT = new URL('../../dev/active/ferry-quiz/review.html', import.meta.url);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const textLen = (s) => [...s.replace(/\p{Extended_Pictographic}|️|‍/gu, '').trim()].length;

export function collectQuestions(data = nodeQuizData()) {
  const byTpl = [];
  for (const t of QUIZ_TEMPLATES) {
    const seen = new Map();
    for (let s = 1; s <= 300; s++) { const q = t.make(data, mulberry(s)); if (q && !seen.has(q.qid)) seen.set(q.qid, q); }
    byTpl.push({ tpl: t.id, questions: [...seen.values()].sort((a, b) => a.qid.localeCompare(b.qid)) });
  }
  return byTpl;
}

function render(byTpl) {
  const total = byTpl.reduce((n, t) => n + t.questions.length, 0);
  const row = (q) => {
    const long = q.choices.some(c => textLen(c.ko) > LONG_CHOICE);
    const ch = (lang) => q.choices.map((c, i) => `<span class="${i === q.answer ? 'ans' : ''}">${esc(c[lang])}</span>`).join('');
    return `<tr><td class="id">${esc(q.qid)}${long ? '<br><em>표찰 2×2</em>' : ''}</td>
      <td><div class="q">${esc(q.q.ko)}</div><div class="ch">${ch('ko')}</div><div class="hint">💡 ${esc(q.hint.ko)}</div></td>
      <td class="en"><div class="q">${esc(q.q.en)}</div><div class="ch">${ch('en')}</div><div class="hint">💡 ${esc(q.hint.en)}</div></td></tr>`;
  };
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>사공 퀴즈 문제 검수</title>
<style>
  body{margin:0;padding:18px 16px;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",system-ui,sans-serif;background:#f4f1e8;color:#3d3222}
  h1{font-size:19px;margin:0 0 4px} .sub{font-size:13px;opacity:.7;margin:0 0 16px}
  h2{font-size:15px;margin:22px 0 8px;display:flex;gap:8px;align-items:baseline} h2 small{font-weight:500;opacity:.6;font-size:12px}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(80,60,20,.08)}
  td{padding:10px 12px;border-top:1px solid #efe8d8;vertical-align:top;font-size:13.5px;line-height:1.5;word-break:keep-all}
  td.id{width:150px;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#8a7350} td.id em{color:#b5642e;font-style:normal;font-weight:700}
  td.en{color:#4a4a5a} .q{font-weight:700;margin-bottom:6px}
  .ch{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px} .ch span{border:1px solid #e3d8c0;background:#fbf6ea;border-radius:8px;padding:2px 8px}
  .ch span.ans{border-color:#7fae72;background:#e3f2dd;font-weight:800;color:#2c5a2c} .hint{font-size:12.5px;color:#8a6a2e}
</style>
<h1>🦆 사공 퀴즈 — 나올 수 있는 문제 전부 (${total}개)</h1>
<p class="sub">초록 = 정답. 문제·보기·정답은 게임 데이터에서 자동으로 만든다(수치를 바꾸면 문제도 따라감). 하루 3문제 · 템플릿이 겹치지 않게 뽑힌다. <b>빼거나 고칠 문제·템플릿</b>을 알려 주세요.</p>
${byTpl.map(t => `<h2>${esc(t.tpl)} <small>${t.questions.length}개</small></h2><table>${t.questions.map(row).join('')}</table>`).join('\n')}`;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const byTpl = collectQuestions();
  writeFileSync(OUT, render(byTpl));
  console.log(byTpl.map(t => `${t.tpl} ${t.questions.length}`).join(' · '), '→', OUT.pathname);
}
