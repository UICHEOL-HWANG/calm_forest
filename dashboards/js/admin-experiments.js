// =============================================================
//  실험 (A/B) — dashboards/experiments.html  (A안 레지스트리 + 상세 · 위에 C안 효과 그림)
//  데이터: RPC cf_admin_experiments(token) — sql/migrations/migrate_experiments.sql
//          결과 원재료는 ml/scripts/experiment_summary.py 가 매일 03:00 채운다.
//  계산·판정: ./admin-metrics.js analyzeExperiment (테스트: tests/admin-experiments.test.mjs)
// =============================================================
import { $, V, nf, esc, CHAR, shareKey, bootAdmin, explainRpcError, showMsg, createLoader } from './admin-common.js';
import { analyzeExperiment, twoProp } from './admin-metrics.js';

const STEPS = [
  ['chick', '병아리가 실험 명단을 펼치는 중'],
  ['panda', '판다가 배정 비율을 확인하는 중'],
  ['bear', '곰이 신뢰구간을 계산하는 중'],
];
const STATUS = { run: '진행 중', obs: '관측·분석 대기', plan: '설계·대기', done: '결론·보관' };
const ORDER = ['run', 'obs', 'plan', 'done'];

const page = $('page');
const loader = createLoader(page, $('loader'), STEPS);
let rows = [], today = '', sel = (location.hash || '').slice(1) || null, chart = null;

const pp = (v, unit = '%p') => (v == null || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}${unit}`);
const unitOf = (a, e) => (a.type === 'mean' ? (e.result?.unit_label || '') : '%p');
const chip = ([c, t]) => `<span class="chip ${c}">${esc(t)}</span>`;
const srmTxt = (s) => (s == null ? '<span class="def">해당 없음</span>'
  : s < 0.01 ? `<span class="bad">어긋남 p=${s.toFixed(3)}</span>` : `<span class="ok">정상 p=${s.toFixed(2)}</span>`);
// SVG 는 viewBox 째로 줄어든다 — 좁은 화면에선 처음부터 좁게 그려야 글자가 읽힌다
const narrow = () => matchMedia('(max-width: 860px)').matches;
const kst = (iso) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

(async () => {
  loader.start('분석 중 · 실험');
  const sb = await bootAdmin();
  if (!sb) { loader.done(); $('dash').hidden = true; return; }
  const { data, error } = await sb.rpc('cf_admin_experiments', shareKey ? { token: shareKey } : {});
  loader.done();
  if (error) { $('dash').hidden = true; showMsg(explainRpcError(error, 'cf_admin_experiments')); return; }
  today = data.today;
  rows = (data.experiments || []).map((e) => ({ e, a: analyzeExperiment(e, today) }));
  if (!rows.some((r) => r.e.id === sel)) sel = rows.find((r) => r.e.status === 'obs')?.e.id || rows[0]?.e.id;
  $('list').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-sel]');
    if (!b) return;
    sel = b.dataset.sel;
    history.replaceState(null, '', '#' + sel);
    renderList(); renderDetail();
    if (matchMedia('(max-width: 860px)').matches) $('detail').scrollIntoView({ behavior: 'smooth' });
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  matchMedia('(max-width: 860px)').addEventListener('change', render);
  render();
})();

function render() {
  const last = rows.map((r) => r.e.computed_at).filter(Boolean).sort().at(-1);
  const cnt = (s) => rows.filter((r) => r.e.status === s).length;
  $('meta').classList.remove('skel');
  $('meta').innerHTML = `진행 <b>${cnt('run')}</b> · 관측 대기 <b>${cnt('obs')}</b> · 설계 <b>${cnt('plan')}</b> · 결론 <b>${cnt('done')}</b>`
    + ` · 매일 03:00 BigQuery 에서 요약${last ? ` · 마지막 계산 ${kst(last)}` : ''}` + (shareKey ? ' · 🔗 <b>임시 공유 보기</b>' : '');
  renderForest(); renderList(); renderDetail();
}

// ── C: 주 지표 효과 한눈에(포리스트 플롯) ──
//   perRow = 줄마다 자기 단위·자기 축(평균 지표처럼 단위가 줄마다 다를 때). 가운데 세로선이 0.
function forestSvg(items, { w = 760, rowH = 30, labelW = 150, perRow = false } = {}) {
  const vals = items.filter((r) => r.unit === '%p' && Number.isFinite(r.d)).flatMap((r) => [r.lo, r.hi]);
  const span = Math.max(10, Math.ceil(Math.max(0, ...vals.map(Math.abs)) / 5) * 5);
  const x0 = labelW + 10, x1 = w - 66;
  const axis = (sp) => (v) => x0 + (Math.max(-sp, Math.min(sp, v)) + sp) / (2 * sp) * (x1 - x0);
  const X = axis(span);
  const h = items.length * rowH + 30;
  const col = (k) => (k === 'win' ? V('--up') : k === 'lose' ? V('--down') : k === 'obs' || k === 'conf' || k === 'st' ? V('--ink-3') : V('--s3'));
  let s = `<svg class="forest" viewBox="0 0 ${w} ${h}" role="img" aria-label="실험별 효과 크기와 95% 신뢰구간">`;
  for (const t of perRow ? [0] : [-span, -span / 2, 0, span / 2, span]) {
    s += `<line x1="${X(t)}" x2="${X(t)}" y1="6" y2="${h - 22}" stroke="${t === 0 ? V('--ink-3') : V('--line-soft')}" stroke-width="${t === 0 ? 1.2 : 1}"/>`
      + `<text x="${X(t)}" y="${h - 6}" font-size="10" text-anchor="middle" fill="${V('--ink-3')}">${perRow ? '0' : `${t > 0 ? '+' : ''}${t}%p`}</text>`;
  }
  items.forEach((r, i) => {
    const y = 18 + i * rowH, c = col(r.kind);
    s += `<text x="0" y="${y + 4}" font-size="11.5" fill="${V('--ink-2')}">${esc(r.label)}</text>`;
    if (!Number.isFinite(r.d)) { s += `<text x="${x0}" y="${y + 4}" font-size="11" fill="${V('--ink-3')}">${esc(r.note)}</text>`; return; }
    if (r.unit !== '%p' && !perRow) {
      s += `<text x="${x0}" y="${y + 4}" font-size="11" fill="${V('--ink-3')}">평균 차이 ${esc(pp(r.d, r.unit))} [${r.lo.toFixed(1)}, ${r.hi.toFixed(1)}] — 단위가 달라 축 밖</text>`;
      return;
    }
    const Xr = perRow ? axis(Math.max(Math.abs(r.lo), Math.abs(r.hi), 1e-9) * 1.1) : X;
    s += `<line x1="${Xr(r.lo)}" x2="${Xr(r.hi)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"${r.dash ? ' stroke-dasharray="4 4"' : ''}/>`
      + `<rect x="${Xr(r.d) - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="${c}"/>`
      + `<text x="${x1 + 8}" y="${y + 4}" font-size="11" font-weight="700" fill="${V('--ink')}">${esc(pp(r.d, r.unit))}</text>`;
  });
  return s + '</svg>';
}
function renderForest() {
  const items = rows.map(({ e, a }) => ({
    label: e.name, d: a.d, lo: a.lo, hi: a.hi, kind: a.verdict[0], unit: unitOf(a, e),
    dash: e.kind === 'policy' || !!e.confound, note: a.verdict[1],
  }));
  $('forest').innerHTML = forestSvg(items, narrow() ? { w: 400, labelW: 118, rowH: 32 } : {});
}

// ── A: 목록 ──
function renderList() {
  $('list').innerHTML = ORDER.map((g) => {
    const items = rows.filter((r) => r.e.status === g);
    if (!items.length) return '';
    return `<div class="eyebrow grp-t">${STATUS[g]}</div>` + items.map(({ e, a }) => {
      const prog = e.need ? Math.min(100, Math.round((a.n || 0) / e.need * 100)) : null;
      return `<button class="item${e.id === sel ? ' on' : ''}" data-sel="${esc(e.id)}" aria-current="${e.id === sel}">
        <span class="av"><img src="${CHAR(esc(e.char))}" alt=""></span>
        <span><b>${esc(e.name)}</b><span class="row">${chip(a.verdict)}<span class="def">${esc(e.unit)}</span></span>
        ${prog != null ? `<span class="bar" style="margin-top:6px" title="표본 ${a.n || 0}/${e.need}"><i style="width:${prog}%"></i></span>` : ''}</span></button>`;
    }).join('');
  }).join('');
}

// ── A: 상세 ──
function effectRows(e, a) {
  const out = [{ label: e.metric, d: a.d, lo: a.lo, hi: a.hi, kind: a.verdict[0], unit: unitOf(a, e), dash: e.kind === 'policy' || !!e.confound, note: a.verdict[1] }];
  for (const s of e.result?.secondary || []) {
    const sa = analyzeExperiment({ ...e, need: null, decide_after: null, result: { ...s, compare: e.result.compare, official: null } }, today);
    out.push({ label: `보조 · ${s.label}`, d: sa.d, lo: sa.lo, hi: sa.hi, kind: 'na', unit: sa.type === 'mean' ? (s.unit_label || '') : '%p', note: '—' });
  }
  return out;
}
function armsTable(e) {
  const r = e.result;
  if (!r?.arms?.length) return '<p class="def">아직 결과가 없습니다.</p>';
  const head = r.type === 'mean'
    ? '<tr><th>군</th><th class="r">표본</th><th class="r">평균</th><th class="r">표준편차</th></tr>'
    : `<tr><th>군</th><th class="r">표본</th><th class="r">${esc(e.metric)}</th></tr>`;
  const body = r.arms.map((x) => r.type === 'mean'
    ? `<tr><td><b>${esc(x.label || x.key)}</b></td><td class="r">${nf(x.n)}</td><td class="r">${x.mean ?? '—'}${esc(r.unit_label || '')}</td><td class="r">${x.sd ?? '—'}</td></tr>`
    : `<tr><td><b>${esc(x.label || x.key)}</b></td><td class="r">${nf(x.n)}</td><td class="r">${nf(x.x)} (${x.n ? (x.x / x.n * 100).toFixed(1) : '—'}%)</td></tr>`).join('');
  return `<div class="scroll-x"><table class="t">${head}${body}</table></div>`;
}
function emptyResult(e) {
  if (e.kind === 'ext') {
    return `<div class="empty-st"><img src="${CHAR('fox')}" alt=""><b>외부 플랫폼 숫자를 아직 안 넣었어요</b>
      인사이트의 조회(n)·링크 클릭(x)을 군별로 0 자리에 넣어 실행하면 계산됩니다(다시 실행하면 갱신) —
      <code>insert into cf_experiment_results (exp_id, source, result) values ('${esc(e.id)}', 'manual', '{"type":"prop","compare":["A","B"],"arms":[{"key":"A","label":"A","n":0,"x":0},{"key":"B","label":"B","n":0,"x":0}]}') on conflict (exp_id) do update set result = excluded.result, source = excluded.source, computed_at = now();</code></div>`;
  }
  return `<div class="empty-st"><img src="${CHAR('rabbit')}" alt=""><b>${e.status === 'plan' ? '아직 배정 전이에요' : '아직 결과가 없어요'}</b>${esc(e.period)}</div>`;
}
function renderDetail() {
  const r = rows.find((x) => x.e.id === sel);
  if (!r) { $('detail').innerHTML = ''; return; }
  const { e, a } = r, res = e.result;
  const unit = unitOf(a, e);
  const prog = e.need ? Math.min(100, Math.round((a.n || 0) / e.need * 100)) : null;
  const off = a.official;
  const warn = e.confound ? `<p class="def bad" style="font-size:12px">⚠ ${esc(e.confound)}</p>`
    : e.kind === 'policy' ? '<p class="def" style="font-size:12px">무작위 배정이 없어 두 집단은 처음부터 다릅니다. 아래 차이는 효과가 아닙니다.</p>' : '';
  $('detail').innerHTML = `
    <header class="xh">
      <span class="eyebrow">${esc(e.unit)} · ${esc(e.period)}</span>
      <h2>${esc(e.name)}</h2>
      <p class="hyp">${esc(e.question)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${chip(a.verdict)}${e.prereg ? `<span class="lock">🔒 사전 기준 · ${esc(e.prereg)}</span>` : ''}</div>
      ${warn}
    </header>
    ${!res?.arms?.length ? emptyResult(e) : `
    <div class="checks">
      <div><span class="eyebrow">배정 비율(SRM)</span><span class="num">${a.srm == null ? '—' : a.srm < 0.01 ? '어긋남' : '정상'}</span>${srmTxt(a.srm)}</div>
      <div><span class="eyebrow">표본</span><span class="num">${nf(a.n)}${e.need ? `<span class="def" style="display:inline"> / ${nf(e.need)}</span>` : ''}</span>
        ${prog != null ? `<span class="bar"><i style="width:${prog}%"></i></span>` : ''}
        <span class="def">지금 표본으로 잡을 수 있는 최소 효과 ±${Number.isFinite(a.mde) ? a.mde.toFixed(1) : '—'}${esc(unit)}</span></div>
      <div><span class="eyebrow">${esc(e.metric)}</span><span class="num">${pp(a.d, unit)}</span>
        <span class="def">95% CI [${a.lo.toFixed(1)}, ${a.hi.toFixed(1)}]${a.p != null ? ` · p=${a.p.toFixed(a.p < 0.01 ? 3 : 2)}` : ''}</span>
        ${off ? `<span class="def">공식 검정: ${esc(off.method || '')}${off.complete ? '' : ' · 관측 진행 중(잠정)'}</span>` : ''}</div>
    </div>
    <div class="${res.daily?.length ? 'xtwo' : ''}">
      <section class="panel"><h3>효과 크기 · 95% 신뢰구간</h3>
        <p class="def">네모 = 차이, 선 = 신뢰구간. 선이 0을 걸치면 판정하지 않습니다.${a.type === 'mean' ? ' 평균 지표는 줄마다 자기 단위로 그립니다(가운데 선 = 0).' : ''}</p>
        ${forestSvg(effectRows(e, a), { w: narrow() || res.daily?.length ? 420 : 760, labelW: narrow() ? 132 : 160, rowH: 34, perRow: a.type === 'mean' })}</section>
      ${res.daily?.length ? `<section class="panel"><h3>날마다 쌓인 표본으로 본 차이</h3><p class="def">띠가 좁아지는지(표본이 쌓이는지)를 봅니다. 중간에 멈추고 판정하지 않습니다.</p>
        <div class="chartbox"><canvas id="cCum" height="200"></canvas></div></section>` : ''}
    </div>`}
    <div class="xtwo">
      <section class="panel"><h3>군별 결과</h3>${armsTable(e)}
        <p class="def">검정: ${esc(e.test || '—')}</p>
        ${(res?.notes || []).map((n) => `<p class="def">· ${esc(n)}</p>`).join('')}
        ${e.computed_at ? `<p class="def">계산 ${kst(e.computed_at)} · 원천 ${esc(e.source === 'manual' ? '수동 입력' : 'BigQuery')}</p>` : ''}</section>
      <section class="panel"><h3>기록</h3><div class="log">${(e.log || []).map(([d, t]) => `<div><span>${esc(d)}</span>${esc(t)}</div>`).join('')}</div>
        ${e.verdict_note ? `<p class="def" style="font-size:12px">결론: ${esc(e.verdict_note)}</p>` : ''}</section>
    </div>`;
  drawCumulative(res);
}

function drawCumulative(res) {
  chart?.destroy(); chart = null;
  const el = $('cCum');
  if (!el || !res?.daily?.length) return;
  const pts = res.daily.filter((d) => d.t[0] >= 5 && d.c[0] >= 5).map((d) => ({ day: d.day.slice(5).replace('-', '/'), ...twoProp(d.t[1], d.t[0], d.c[1], d.c[0]) }));
  chart = new Chart(el, { type: 'line', data: { labels: pts.map((p) => p.day), datasets: [
    { label: '상한', data: pts.map((p) => +p.hi.toFixed(1)), borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: `rgba(${V('--tint-rgb')},.14)` },
    { label: '하한', data: pts.map((p) => +p.lo.toFixed(1)), borderWidth: 0, pointRadius: 0, fill: false },
    { label: '차이', data: pts.map((p) => +p.d.toFixed(1)), borderColor: V('--s1'), borderWidth: 2.2, pointRadius: 0, tension: 0.3, fill: false },
    { label: '0', data: pts.map(() => 0), borderColor: V('--ink-3'), borderDash: [4, 4], borderWidth: 1, pointRadius: 0 },
  ] }, options: { responsive: true, aspectRatio: 1.7, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { filter: (x) => x.dataset.label === '차이', callbacks: { label: (x) => ` 차이 ${pp(x.parsed.y)}` } } },
    scales: { x: { grid: { display: false }, ticks: { color: V('--ink-3'), maxRotation: 0, autoSkipPadding: 14 } },
      y: { grid: { color: V('--line-soft') }, border: { display: false }, ticks: { color: V('--ink-3'), callback: (v) => v + '%p' } } } } });
}
