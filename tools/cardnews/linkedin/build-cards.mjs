// decks/<slug>.json → templates/*.html
// 차트는 matplotlib PNG 를 얹지 않고 카드 디자인 언어로 직접 그린다(인라인 SVG).
// 색은 card.css 의 --rose/--cyan/--slate 만 쓴다. 글자에는 계열색을 입히지 않는다.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const W = 928;                       // 카드 내용 폭
const C = { rose: 'var(--rose)', cyan: 'var(--cyan)', slate: 'var(--slate)' };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* 바깥 끝만 둥근 막대 — 기준선에 붙은 쪽은 각지게 둔다 */
const barR = (x, y, w, h, r = 4) => w <= r ? `M${x} ${y}h${w}v${h}h${-w}Z`
  : `M${x} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x}Z`;
const colR = (x, y, w, h, r = 4) => h <= r ? `M${x} ${y}h${w}v${h}h${-w}Z`
  : `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;

const legend = items => items.map((it, i) =>
  `<g transform="translate(${i * 250} 0)">
     <rect x="0" y="-11" width="14" height="14" rx="3" fill="${C[it.color]}"/>
     <text x="24" y="0" class="c-label" dominant-baseline="middle">${esc(it.label)}</text>
   </g>`).join('');

/* ── 가로 누적 막대 ────────────────────────────────── */
function stackedBar(s) {
  const LW = s.lw || 150, rowH = 46, gap = 18, plotW = W - LW - 120;   // 긴 라벨은 lw 로 칸을 넓힌다
  const rows = s.rows.map((r, i) => {
    const y = i * (rowH + gap);
    let x = LW, out = '';
    r.segs.forEach((v, k) => {
      if (v <= 0) return;
      const w = (v / s.max) * plotW;
      out += `<path d="${barR(x, y, Math.max(w - 2, 2), rowH)}" fill="${C[s.legend[k].color]}"/>`;
      x += w;                                        // 세그먼트 사이 2px 는 배경이 비친다
    });
    return `<g>
      <text x="0" y="${y + rowH / 2}" class="c-label" dominant-baseline="middle">${esc(r.label)}</text>
      ${out}
      <text x="${x + 14}" y="${y + rowH / 2}" class="c-value" dominant-baseline="middle">${esc(r.note)}</text>
    </g>`;
  }).join('');
  const h = s.rows.length * (rowH + gap) + 34;
  return `<svg viewBox="0 0 ${W} ${h}">${rows}
    <g transform="translate(${LW} ${h - 6})">${legend(s.legend)}</g></svg>`;
}

/* ── 세로 막대 ────────────────────────────────────── */
function column(s) {
  const TOP = 34;                       // 가장 높은 막대의 값 라벨이 잘리지 않도록 확보
  const plotH = 196, base = TOP + plotH + 6, labelH = 52;
  const n = s.bars.length, gap = n > 8 ? 12 : 22;
  const bw = (W - gap * (n - 1)) / n;
  const max = Math.max(...s.bars.map(b => b.v));
  const bars = s.bars.map((b, i) => {
    const x = i * (bw + gap), h = Math.max((b.v / max) * plotH, 3), y = base - h;
    const on = (s.highlight || []).includes(i);
    return `<g>
      <path d="${colR(x, y, bw, h)}" fill="${on ? C.rose : C.slate}"/>
      <text x="${x + bw / 2}" y="${y - 14}" class="c-value" text-anchor="middle">${esc(b.v)}</text>
      <text x="${x + bw / 2}" y="${base + 30}" class="c-label" text-anchor="middle">${esc(b.label)}</text>
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${base + labelH}">
    <line x1="0" y1="${base}" x2="${W}" y2="${base}" class="c-base"/>${bars}</svg>`;
}

/* ── 퍼널(가로, 감소) ─────────────────────────────── */
function funnel(s) {
  const LW = 300, rowH = 44, gap = 16, plotW = W - LW - 110;
  const max = Math.max(...s.steps.map(t => t.v));
  const rows = s.steps.map((t, i) => {
    const y = i * (rowH + gap), w = (t.v / max) * plotW;
    const zero = t.v === 0;
    return `<g>
      <text x="0" y="${y + rowH / 2}" class="c-label" dominant-baseline="middle">${esc(t.label)}</text>
      ${zero
        ? `<rect x="${LW}" y="${y}" width="64" height="${rowH}" rx="6" fill="none" stroke="var(--rose)" stroke-width="1.5" stroke-dasharray="5 5"/>`
        : `<path d="${barR(LW, y, Math.max(w, 6), rowH)}" fill="${i === 0 ? C.cyan : C.rose}"/>`}
      <text x="${LW + (zero ? 78 : Math.max(w, 6) + 14)}" y="${y + rowH / 2}" class="c-value" dominant-baseline="middle">${esc(t.note)}</text>
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${s.steps.length * (rowH + gap)}">${rows}</svg>`;
}

/* ── 비율 + 오차 범위 (점과 가로선) ───────────────── */
function dotRange(s) {
  const LW = 190, rowH = 74, plotW = W - LW - 150, max = s.max || 60;
  const px = v => LW + (v / max) * plotW;
  const ticks = [];
  for (let v = 0; v <= max; v += max / 4) ticks.push(v);
  const grid = ticks.map(v =>
    `<line x1="${px(v)}" y1="0" x2="${px(v)}" y2="${s.points.length * rowH}" class="c-grid"/>
     <text x="${px(v)}" y="${s.points.length * rowH + 28}" class="c-tick" text-anchor="middle">${Math.round(v)}%</text>`).join('');
  const rows = s.points.map((p, i) => {
    const y = i * rowH + rowH / 2, col = i === s.points.length - 1 ? C.cyan : C.rose;
    return `<g>
      <text x="0" y="${y}" class="c-label" dominant-baseline="middle">${esc(p.label)}</text>
      <line x1="${px(p.lo)}" y1="${y}" x2="${px(p.hi)}" y2="${y}" stroke="${col}" stroke-width="2" opacity=".45" stroke-linecap="round"/>
      <line x1="${px(p.lo)}" y1="${y - 9}" x2="${px(p.lo)}" y2="${y + 9}" stroke="${col}" stroke-width="2" opacity=".45"/>
      <line x1="${px(p.hi)}" y1="${y - 9}" x2="${px(p.hi)}" y2="${y + 9}" stroke="${col}" stroke-width="2" opacity=".45"/>
      <circle cx="${px(p.p)}" cy="${y}" r="9" fill="${col}" stroke="var(--ink-2)" stroke-width="2"/>
      <text x="${LW + plotW + 26}" y="${y - 4}" class="c-value">${esc(p.p)}%</text>
      <text x="${LW + plotW + 26}" y="${y + 20}" class="c-note">${esc(p.note)}</text>
    </g>`;
  }).join('');
  const h = s.points.length * rowH + 40;
  return `<svg viewBox="0 0 ${W} ${h + (s.caption ? 30 : 0)}">${grid}${rows}
    ${s.caption ? `<text x="0" y="${h + 22}" class="c-note">${esc(s.caption)}</text>` : ''}</svg>`;
}

const CHART = { stackedBar, column, funnel, dotRange };

/* ── 블록·페이지 조립 ─────────────────────────────── */
const pills = list => !list?.length ? '' :
  `<div class="pills">${list.map(p => `<div class="pill${p.tone ? ' ' + p.tone : ''}">${p.tone ? '<i></i>' : ''}${esc(p.text ?? p)}</div>`).join('')}</div>`;

function block(b) {
  if (b.kind === 'note')
    return `<div class="note"><h3>${esc(b.title)}</h3>${b.body.map(p => `<p>${p}</p>`).join('')}</div>`;
  if (b.kind === 'kicker') return `<p class="kicker">${b.text}</p>`;
  if (b.kind === 'shots')
    return `<div class="shots${b.items.length === 1 ? ' solo' : ''}">${b.items.map(s => `<figure class="shot">
      <img src="../assets/shots/${esc(s.src)}" alt=""/>
      ${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ''}
    </figure>`).join('')}</div>`;
  if (b.kind === 'ledger')
    return `<div class="ledger">${b.rows.map(r => `<div class="lg-row">
      <div class="lg-n">${esc(r.n)}</div>
      <div class="lg-t">${esc(r.label)}${r.sub ? `<span>${esc(r.sub)}</span>` : ''}</div>
      <div class="lg-v${r.part ? ' part' : ''}">${esc(r.verdict)}</div>
    </div>`).join('')}</div>`;
  return `<div class="ev">
    <div class="ev-head">
      <div class="ev-num${b.tone === 'cyan' ? ' cyan' : ''}">${b.stat}</div>
      <div class="ev-txt">${b.text}</div>
    </div>
    ${pills(b.pills)}
    ${b.chart ? `<div class="plot">${CHART[b.chart.type](b.chart)}</div>` : ''}
  </div>`;
}

function page(card, i, total) {
  const dots = Array.from({ length: total }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${esc(card.title.replace(/<[^>]+>/g, ' '))}</title>
<link rel="stylesheet" href="card.css"/>
</head>
<body>
<div class="card t-${card.trail || 'band'}${card.photo ? ' has-photo' : ''}">
  <div class="bg">
    <div class="bg-glow"></div>
    ${card.photo ? `<img class="bg-photo" src="../assets/shots/${esc(card.photo)}" alt=""/><div class="bg-scrim"></div>` : ''}
    <img class="bg-trails" src="../assets/trails.svg" alt=""/>
    <div class="bg-grain"></div>
  </div>
  <div class="page">
    <div class="eyebrow"><i></i><span>${esc(card.eyebrow)}</span></div>
    <h1 class="title${card.big ? ' xl' : ''}">${card.title}</h1>
    ${card.lede ? `<p class="lede">${card.lede}</p>` : ''}
    ${card.pills ? `<div style="margin-top:34px">${pills(card.pills)}</div>` : ''}
    <div class="stack">${(card.blocks || []).map(block).join('')}</div>
    <div class="foot"><span>${esc(card.foot || 'CALM FOREST · 개인 프로젝트 데이터 기록')}</span><div class="dots">${dots}</div></div>
  </div>
</div>
</body>
</html>`;
}

const slug = process.argv[2] || 'analysis-story';
const deck = JSON.parse(readFileSync(resolve(here, 'decks', `${slug}.json`), 'utf8'));
const TPL = resolve(here, 'templates');

// 이 덱이 지난번에 만든 파일만 지운다. 다른 덱의 카드는 건드리지 않는다
// (2026-09-20: 전부 지우던 탓에 다른 덱 템플릿이 날아간 적이 있다).
const MANIFEST = resolve(here, 'decks', `.${slug}.manifest.json`);
let prev = [];
try { prev = JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { /* 첫 빌드 */ }
for (const f of prev) {
  try { unlinkSync(resolve(TPL, f)); } catch { /* 이미 없음 */ }
}

const written = deck.cards.map((c, i) => {
  const name = `${String(i + 1).padStart(2, '0')}-${c.id}.html`;
  writeFileSync(resolve(TPL, name), page(c, i, deck.cards.length));
  console.log('✓', name);
  return name;
});
writeFileSync(MANIFEST, JSON.stringify(written, null, 2));
