import { $, V, nf, esc, CHAR, shareKey, bootAdmin, showRpcError, createLoader, chartDefaults } from './admin-common.js';
import { analyzeExperiment, twoProp, funnelRows, experimentSpan } from './admin-metrics.js';

const STEPS = [
  ['chick', '병아리가 실험 명단을 펼치는 중'],
  ['panda', '판다가 배정 비율을 확인하는 중'],
  ['bear', '곰이 신뢰구간을 계산하는 중'],
];
const STATUS = { run: '진행 중', obs: '관측·분석 대기', plan: '설계·대기', done: '결론·보관' };
const ORDER = ['run', 'obs', 'plan', 'done'];
const FILTERS = [
  ['all', '전체', () => true],
  ['run', '진행 중', (r) => r.e.status === 'run'],
  ['wait', '대기', (r) => r.e.status === 'obs' || r.e.status === 'plan'],
  ['done', '결론', (r) => r.e.status === 'done'],
];
const RULES = [
  '결과 보기 전에 주 지표·검정·판정선을 고정',
  '배정 비율이 설계(50:50·90:10·80:20)와 어긋나면(SRM p&lt;0.01) 판정하지 않음',
  '관측 창이 끝나기 전, 목표 표본 전에는 판정하지 않음 · 못 채우고 끝나면 "표본 미달" · 사전등록 판정 시점 전인 실험은 "진행 중 · 판정 전"',
  'CI 가 0을 걸치면 "판정 불가" + 검출 가능 최소 효과 보고 · CI 규칙으로 고정한 실험(E1~E3·E5~E7·프리패스)은 p 를 참고로만',
  '무작위 배정이 없으면 효과 판정 안 함',
];
const DAY = 864e5;

const page = $('page');
const loader = createLoader(page, $('loader'), STEPS);
let rows = [], today = '', filt = 'all', top = 'time', span = 10, chart = null;

const pp = (v, unit = '%p') => (v == null || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}${esc(unit)}`);
const unitOf = (a, e) => (a.type === 'mean' ? (e.result?.unit_label || '') : '%p');
const has = (a) => Number.isFinite(a.d);
const chip = (a) => `<span class="chip ${a.verdict[0]}">${esc(a.verdict[1])}</span>`;
const vcol = (k) => (k === 'win' ? V('--up') : k === 'lose' ? V('--down') : k === 'obs' ? V('--s3') : V('--ink-3'));
const mmdd = (d) => `${+String(d).slice(5, 7)}/${+String(d).slice(8, 10)}`;
const ts = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const due = (e) => (e.decide_after && String(e.decide_after) >= String(today) ? `<span class="def tn">판정 ${mmdd(e.decide_after)}</span>` : '');
const rate = (x, type) => (type === 'mean' ? x.mean : x.n ? (x.x / x.n) * 100 : 0);
const narrow = () => matchMedia('(max-width: 860px)').matches;
const kst = (iso) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const hashId = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; } };
const selected = () => rows.find((r) => r.e.id === hashId());
const charSrc = (c) => CHAR(String(c || 'chick').replace(/[^\w-]/g, ''));
const who = (e, sub) => `<span class="who"><span class="av"><img src="${charSrc(e.char)}" alt=""></span><span><b>${esc(e.name)}</b><small>${esc(sub)}</small></span></span>`;

(async () => {
  loader.start('로딩 중입니다');
  const sb = await bootAdmin();
  if (!sb) { loader.done(); $('dash').hidden = true; return; }
  const { data, error } = await sb.rpc('cf_admin_experiments', shareKey ? { token: shareKey } : {});
  loader.done();
  if (error) { $('dash').hidden = true; showRpcError(sb, error, 'cf_admin_experiments'); return; }
  today = data.today;
  rows = (data.experiments || []).map((e) => ({ e, a: analyzeExperiment(e, today) }));
  const edges = rows.filter((r) => unitOf(r.a, r.e) === '%p' && has(r.a)).flatMap((r) => [Math.abs(r.a.lo), Math.abs(r.a.hi)]);
  span = Math.max(10, Math.ceil(Math.max(0, ...edges) / 5) * 5);
  page.classList.remove('is-first');
  $('view').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-f],[data-top]');
    if (!b) return;
    if (b.dataset.f) filt = b.dataset.f;
    else top = b.dataset.top;
    render();
    $('view').querySelector(b.dataset.f ? `[data-f="${filt}"]` : `[data-top="${top}"]`)?.focus();
  });
  addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
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
  chart?.destroy();
  chart = null;
  const cur = selected();
  $('view').innerHTML = cur ? report(cur) : board();
  if (cur) drawCumulative(cur.e.result);
  const on = $('view').querySelector('.fi.on');
  if (on) on.parentElement.scrollLeft = on.offsetLeft - on.parentElement.offsetLeft - 12;
}

function ci(a, { w = 200, kind = a.verdict[0] } = {}) {
  if (!has(a)) return '';
  const sp = a.type === 'mean' ? Math.max(Math.abs(a.lo), Math.abs(a.hi), 1e-9) * 1.15 : span;
  const X = (x) => 6 + ((Math.max(-sp, Math.min(sp, x)) + sp) / (2 * sp)) * (w - 12);
  const c = vcol(kind);
  return `<svg class="ci" viewBox="0 0 ${w} 22" role="img" aria-label="차이 ${a.d.toFixed(1)}, 95% 구간 ${a.lo.toFixed(1)}에서 ${a.hi.toFixed(1)}">
    <line x1="6" x2="${w - 6}" y1="11" y2="11" stroke="${V('--line')}" stroke-width="1"/>
    <line x1="${X(0)}" x2="${X(0)}" y1="2" y2="20" stroke="${V('--ink-3')}" stroke-width="1.2"/>
    <line x1="${X(a.lo)}" x2="${X(a.hi)}" y1="11" y2="11" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    <rect x="${X(a.d) - 5}" y="6" width="10" height="10" rx="2.5" fill="${c}" stroke="${V('--surface-1')}" stroke-width="2"/></svg>`;
}

function arms(e, a, sm) {
  const r = e.result, type = r.type || 'prop';
  const mx = type === 'mean' ? Math.max(...r.arms.map((x) => x.mean), 1e-9) * 1.1 : 100;
  const pair = r.arms.length === 2 && e.kind !== 'ext';
  return `<div class="arms${sm ? ' sm' : ''}">${r.arms.map((x) => {
    const val = rate(x, type), isT = x.key === a.t?.key;
    const label = sm && pair ? (isT ? '처치' : '대조') : esc(x.label || x.key);
    const count = sm ? '' : `<small class="tn">${type === 'mean' ? `n=${nf(x.n)} · 표준편차 ${esc(x.sd ?? '—')}` : `${nf(x.x)} / ${nf(x.n)}`}</small>`;
    return `<div class="arm${isT ? ' t' : ''}"><span class="lb">${label}${count}</span><span class="tr"><i style="width:${((val / mx) * 100).toFixed(1)}%"></i></span><b class="pv tn">${type === 'mean' ? `${esc(val)}${esc(r.unit_label || '')}` : `${val.toFixed(1)}%`}</b></div>`;
  }).join('')}</div>`;
}

function gauge(e, a) {
  if (!e.need) return `<span class="def tn">${a.n ? `표본 ${nf(a.n)}` : '목표 표본 없음'}</span>`;
  const p = Math.min(100, Math.round(((a.n || 0) / e.need) * 100));
  return `<div class="gauge" title="표본 ${a.n || 0}/${e.need}"><span class="tn"><b>${nf(a.n || 0)}</b> / ${nf(e.need)} · ${p}%</span><span class="tr"><i style="width:${p}%"></i></span></div>`;
}

function forestSvg(items, { w = 760, rowH = 30, labelW = 150 } = {}) {
  const x0 = labelW + 10, x1 = w - 66;
  const X = (v) => x0 + ((Math.max(-span, Math.min(span, v)) + span) / (2 * span)) * (x1 - x0);
  const h = items.length * rowH + 30;
  let s = `<svg class="forest" viewBox="0 0 ${w} ${h}" role="group" aria-label="실험별 효과 크기와 95% 신뢰구간">`;
  for (const t of [-span, -span / 2, 0, span / 2, span]) {
    s += `<line x1="${X(t)}" x2="${X(t)}" y1="6" y2="${h - 22}" stroke="${t === 0 ? V('--ink-3') : V('--line-soft')}" stroke-width="${t === 0 ? 1.2 : 1}"/>`
      + `<text x="${X(t)}" y="${h - 6}" font-size="11" text-anchor="middle" fill="${V('--ink-3')}">${t > 0 ? '+' : ''}${t}%p</text>`;
  }
  items.forEach((r, i) => {
    const y = 18 + i * rowH, c = vcol(r.kind);
    s += `<a href="#${esc(r.id)}"><text x="0" y="${y + 4}" font-size="12.5" fill="${V('--ink-2')}">${esc(r.label)}</text></a>`;
    if (!Number.isFinite(r.d)) { s += `<text x="${x0}" y="${y + 4}" font-size="12" fill="${V('--ink-3')}">${esc(r.note)}</text>`; return; }
    if (r.unit !== '%p') {
      s += `<text x="${x0}" y="${y + 4}" font-size="12" fill="${V('--ink-3')}">평균 차이 ${pp(r.d, r.unit)} [${r.lo.toFixed(1)}, ${r.hi.toFixed(1)}] · 단위가 달라 축 밖</text>`;
      return;
    }
    s += `<line x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"${r.dash ? ' stroke-dasharray="4 4"' : ''}/>`
      + `<rect x="${X(r.d) - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="${c}"/>`
      + `<text x="${x1 + 8}" y="${y + 4}" font-size="12" font-weight="700" fill="${V('--ink')}">${pp(r.d, r.unit)}</text>`;
  });
  return `${s}</svg>`;
}

function timelineSvg() {
  const list = ORDER.flatMap((g) => rows.filter((r) => r.e.status === g)).map((r) => ({ ...r, sp: experimentSpan(r.e, today) }));
  const spans = list.filter((r) => r.sp);
  const now = ts(today);
  const t0 = Math.min(now - 30 * DAY, ...spans.map((r) => ts(r.sp.from))) - 3 * DAY;
  const t1 = Math.max(now, ...spans.map((r) => ts(r.sp.to))) + 10 * DAY;
  const nar = narrow();
  const W = nar ? 360 : 1200, L = nar ? 136 : 250, rh = nar ? 24 : 26, H = list.length * rh + 34;
  const short = (name) => (nar && name.length > 12 ? `${name.slice(0, 11)}…` : name);
  const X = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - 10);
  let s = `<svg class="gantt" viewBox="0 0 ${W} ${H}" role="group" aria-label="실험 기간 타임라인">`;
  const first = new Date(t0);
  for (let m = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1)); m.getTime() < t1; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
    const x = X(m.getTime());
    s += `<line x1="${x}" x2="${x}" y1="18" y2="${H - 6}" stroke="${V('--line-soft')}"/><text x="${x + 4}" y="12" font-size="11" fill="${V('--ink-3')}">${m.getUTCMonth() + 1}월</text>`;
  }
  list.forEach(({ e, a, sp }, i) => {
    const y = 22 + i * rh, c = vcol(a.verdict[0]);
    s += `<a href="#${esc(e.id)}" aria-label="${esc(e.name)} 상세"><rect x="0" y="${y}" width="${W}" height="${rh}" fill="transparent"/>
      <text x="${nar ? 0 : 8}" y="${y + 17}" font-size="${nar ? 11.5 : 12.5}" font-weight="600" fill="${V('--ink-2')}">${esc(short(e.name))}</text>`;
    if (sp) {
      const a0 = X(ts(sp.from)), a1 = X(Math.min(ts(sp.to), now)), b1 = X(ts(sp.to));
      if (ts(sp.from) <= now) s += `<rect x="${a0}" y="${y + 7}" width="${Math.max(6, a1 - a0)}" height="12" rx="6" fill="${c}"/>`;
      if (ts(sp.to) > now) { const p0 = Math.max(a0, X(now) + 2); s += `<rect x="${p0}" y="${y + 7}" width="${Math.max(4, b1 - p0)}" height="12" rx="6" fill="${c}" opacity=".3"/>`; }
    } else if (!nar) s += `<text x="${X(now) + 8}" y="${y + 17}" font-size="11.5" fill="${V('--ink-3')}">${esc(a.verdict[1])}</text>`;
    s += '</a>';
  });
  const xn = X(now);
  return `${s}<line x1="${xn}" x2="${xn}" y1="16" y2="${H - 4}" stroke="${V('--ink')}" stroke-width="1.4"/><text x="${xn - 4}" y="12" text-anchor="end" font-size="11.5" font-weight="700" fill="${V('--ink')}">오늘 ${mmdd(today)}</text></svg>`;
}

function leadCard() {
  const forest = () => forestSvg(rows.map(({ e, a }) => ({
    id: e.id, label: e.name, d: a.d, lo: a.lo, hi: a.hi, kind: a.verdict[0], unit: unitOf(a, e),
    dash: e.kind === 'policy' || !!e.confound, note: a.verdict[1],
  })), narrow() ? { w: 400, labelW: 128, rowH: 32 } : { labelW: 250 });
  const note = top === 'time'
    ? '막대 색 = 판정 상태(초록 효과 확인 · 파랑 관측 중 · 빨강 반대 방향·주의 · 회색 판정 불가·보관). 오늘 뒤 흐린 부분은 예정 기간입니다. 겹치는 기간을 보며 교란을 살핍니다. 줄을 누르면 상세가 열립니다.'
    : '비율 지표 실험을 같은 축(%p)에 놓았습니다. 점선 = 무작위가 아니거나 교란이 있어 효과로 읽으면 안 되는 것. 단위가 다른 실험(평균)은 글자로만 적습니다.';
  return `<section class="card lead" aria-labelledby="leadTitle">
    <div class="lead-h"><div><h2 id="leadTitle">${top === 'time' ? '언제 무엇이 돌았나' : '주 지표 효과 한눈에'}</h2><p class="def">${note}</p></div>
      <div class="seg" role="group" aria-label="보기"><button data-top="time" class="${top === 'time' ? 'on' : ''}">기간</button><button data-top="effect" class="${top === 'effect' ? 'on' : ''}">효과</button></div></div>
    <div class="scroll-x">${top === 'time' ? timelineSvg() : forest()}</div>
    <details class="rules"><summary>판정 규칙 5가지</summary><ol>${RULES.map((t) => `<li>${t}</li>`).join('')}</ol></details>
  </section>`;
}

function board() {
  const match = FILTERS.find(([k]) => k === filt)[2];
  const card = ({ e, a }) => `<a class="xc" href="#${esc(e.id)}">
      ${who(e, e.unit)}<span class="row">${chip(a)}${due(e)}</span>
      <span class="q">${esc(e.question)}</span>
      ${has(a) ? `<span class="big"><b class="tn">${pp(a.d, unitOf(a, e))}</b><span>${esc(e.metric)}</span></span>${ci(a, { w: 280 })}${arms(e, a, true)}`
    : `<span class="def">${e.result?.funnel ? '단계별 숫자만 봅니다' : '아직 숫자 없음'} · ${esc(e.period)}</span>`}
      <span class="ft">${gauge(e, a)}</span></a>`;
  return `${leadCard()}
    <div class="bd-h"><h2>실험 ${rows.length}건</h2><div class="seg" role="group" aria-label="상태">${FILTERS.map(([k, t, f]) => `<button data-f="${k}" class="${k === filt ? 'on' : ''}">${t} ${rows.filter(f).length}</button>`).join('')}</div></div>
    <div class="bd">${ORDER.flatMap((g) => rows.filter((r) => r.e.status === g)).filter(match).map(card).join('')}</div>`;
}

function funnelPanel(f) {
  const head = `<tr><th>단계</th>${f.cols.map((c) => `<th class="r">${esc(c.label)}</th>`).join('')}</tr>`;
  const body = funnelRows(f).map((r) => `<tr><td><b>${esc(r.label)}</b>${r.unlinked ? ' <span class="chip st">별도 집계</span>' : ''}</td>${r.cells.map((c) => `<td class="r tn">${nf(c.n)}${c.pct == null ? '' : ` <span class="def">(${c.pct}%)</span>`}</td>`).join('')}</tr>`).join('');
  return `<section class="sec card"><h3>단계별 깔때기</h3><p class="def">괄호 = 직전 단계 대비 비율. 단위 = 기기. '별도 집계'는 앱 안 브라우저에서 외부 브라우저로 넘어가면 기기 ID가 바뀌어 앞 단계와 이어 붙일 수 없는 숫자(같은 기간 전체 합계)입니다.</p><div class="scroll-x"><table class="tb loose">${head}${body}</table></div></section>`;
}

function emptyResult(e) {
  if (e.kind === 'ext') {
    return `<div class="card empty-st"><img src="${CHAR('fox')}" alt=""><b>외부 플랫폼 숫자를 아직 안 넣었어요</b>
      인사이트의 조회(n)·링크 클릭(x)을 군별로 0 자리에 넣어 실행하면 계산됩니다(다시 실행하면 갱신).
      <code>insert into cf_experiment_results (exp_id, source, result) values ('${esc(e.id)}', 'manual', '{"type":"prop","compare":["A","B"],"arms":[{"key":"A","label":"A","n":0,"x":0},{"key":"B","label":"B","n":0,"x":0}]}') on conflict (exp_id) do update set result = excluded.result, source = excluded.source, computed_at = now();</code></div>`;
  }
  return `<div class="card empty-st"><img src="${CHAR('rabbit')}" alt=""><b>${e.status === 'plan' ? '아직 배정 전이에요' : '아직 결과가 없어요'}</b>${esc(e.period)}</div>`;
}

function secondaryTable(e) {
  const r = e.result;
  if (!r?.secondary?.length) return '';
  const body = r.secondary.map((s) => {
    const sa = analyzeExperiment({ ...e, need: null, decide_after: null, confound: null, result: { ...s, compare: r.compare, official: null } }, today);
    const type = s.type || 'prop', su = type === 'mean' ? s.unit_label || '' : '%p';
    const cell = (x) => (x ? (type === 'mean' ? `${esc(x.mean)}${esc(su)}` : `${rate(x, type).toFixed(1)}% <span class="def">${nf(x.x)}/${nf(x.n)}</span>`) : '—');
    return `<tr><td><b>${esc(s.label)}</b></td><td class="r tn">${cell(sa.t)}</td><td class="r tn">${cell(sa.c)}</td><td class="r tn"><b>${has(sa) ? pp(sa.d, su) : '—'}</b></td><td class="cic">${ci(sa, { w: 150, kind: 'na' })}</td></tr>`;
  }).join('');
  return `<section class="sec card"><h3>보조 지표 · 가드레일</h3><div class="scroll-x"><table class="tb loose"><tr><th>지표</th><th class="r">처치</th><th class="r">대조</th><th class="r">차이</th><th class="cic">95% 구간</th></tr>${body}</table></div></section>`;
}

function detail({ e, a }) {
  const res = e.result, unit = unitOf(a, e), off = a.official;
  const srm = a.srm == null ? ['—', e.kind === 'ab' || e.kind === 'multi' ? '기대 빈도 5 미만 · 검사 안 함' : '해당 없음', '']
    : a.srm < 0.01 ? ['어긋남', `p=${a.srm.toFixed(3)}`, 'bad'] : ['정상', `p=${a.srm.toFixed(2)}`, 'ok'];
  const warn = e.confound ? `<p class="warn">교란 주의 · ${esc(e.confound)}</p>`
    : e.kind === 'policy' ? '<p class="warn">무작위 배정이 없어 두 집단은 처음부터 다릅니다. 아래 차이는 효과가 아닙니다.</p>' : '';
  const filled = res?.arms?.some((x) => x.n > 0);
  const rule = `<section class="sec card"><h3>판정 규칙</h3><p class="def">검정: ${esc(e.test || '—')}</p>${e.verdict_note ? `<p class="say"><b>결론</b> ${esc(e.verdict_note)}</p>` : ''}</section>`;
  const body = filled && has(a) ? `
    <div class="hero ${a.verdict[0]}">
      <div><span class="eyebrow">${esc(e.metric)}</span><div class="bn">${pp(a.d, unit)}</div>
        <div class="rg tn">95% 구간 ${a.lo.toFixed(1)} ~ ${a.hi.toFixed(1)}${a.p != null ? ` · p=${a.p.toFixed(a.p < 0.01 ? 3 : 2)}` : ''}</div>
        ${ci(a, { w: 320 })}
        ${off ? `<span class="def">공식 검정: ${esc(off.method || '')}${off.complete === false ? ' · 관측 진행 중(잠정)' : ''}</span>` : ''}
        ${e.verdict_note ? `<p class="say"><b>결론</b> ${esc(e.verdict_note)}</p>` : ''}</div>
      <div><span class="eyebrow">군별 결과</span>${arms(e, a)}</div>
    </div>
    <div class="ck">
      <div><span class="eyebrow">배정 비율 검사(SRM)${res.ratio ? ` · 설계 ${res.ratio.map((x) => Math.round(x * 100)).join(':')}` : ''}</span><span class="n ${srm[2]}">${srm[0]}</span><span class="def tn">${srm[1]}</span></div>
      <div><span class="eyebrow">표본</span>${gauge(e, a)}<span class="def tn">지금 표본으로 잡을 수 있는 최소 효과 ±${Number.isFinite(a.mde) ? a.mde.toFixed(1) : '—'}${esc(unit)}</span></div>
      <div><span class="eyebrow">판정 규칙</span><span class="def">${esc(e.test || '—')}</span>${due(e)}</div>
    </div>` : `${filled ? `<section class="sec card"><h3>군별 결과</h3>${arms(e, a)}</section>` : res?.funnel ? '' : emptyResult(e)}${rule}`;
  const notes = (res?.notes || []).map((n) => `<li>${esc(n)}</li>`).join('');
  const stamp = e.computed_at ? `<p class="def">계산 ${kst(e.computed_at)} · 원천 ${e.source === 'manual' ? '수동 입력' : 'BigQuery'}</p>` : '';
  const log = `<section class="sec"><h3>기록</h3><div class="tl">${(e.log || []).map(([d, t]) => `<div><span>${esc(d)}</span><i></i><p>${esc(t)}</p></div>`).join('')}</div></section>`;
  const cum = res?.daily?.length ? `<section class="sec"><h3>날마다 쌓인 표본으로 본 차이</h3><p class="def">띠가 좁아지는지(표본이 쌓이는지)를 봅니다. 중간에 멈추고 판정하지 않습니다.</p><div class="chartbox"><canvas id="cCum" height="200"></canvas></div></section>` : '';
  const ref = notes || stamp ? `<section class="sec"><h3>참고</h3>${notes ? `<ul class="def">${notes}</ul>` : ''}${stamp}</section>` : '';
  return `<article class="dt">
    <header class="dt-h"><span class="eyebrow">${esc(e.unit)} · ${esc(e.period)}</span><h2>${esc(e.name)}</h2><p class="q">${esc(e.question)}</p>
      <div class="row">${chip(a)}<span class="def">${e.prereg ? `🔒 사전 기준 · ${esc(e.prereg)}` : '사전 기준 없음'}</span></div>${warn}</header>
    ${body}
    ${res?.funnel ? funnelPanel(res.funnel) : ''}
    ${secondaryTable(e)}
    ${cum ? `<div class="xtwo">${cum}${log}</div>${ref}` : `<div class="xtwo">${log}${ref}</div>`}
  </article>`;
}

function report(cur) {
  const list = ORDER.map((g) => {
    const items = rows.filter((r) => r.e.status === g);
    return items.length ? `<span class="eyebrow">${STATUS[g]} ${items.length}</span>${items.map(({ e, a }) => `<a class="fi${e.id === cur.e.id ? ' on' : ''}" href="#${esc(e.id)}"${e.id === cur.e.id ? ' aria-current="true"' : ''}><span class="av"><img src="${charSrc(e.char)}" alt=""></span><span><b>${esc(e.name)}</b>${chip(a)}</span></a>`).join('')}` : '';
  }).join('');
  return `<a class="to-board" href="#">← 전체 보기</a><div class="fc"><nav class="fl" aria-label="실험 목록">${list}</nav>${detail(cur)}</div>`;
}

function drawCumulative(res) {
  const el = $('cCum');
  if (!el || !res?.daily?.length) return;
  chartDefaults();
  const pts = res.daily.filter((d) => d.t[0] >= 5 && d.c[0] >= 5).map((d) => ({ day: d.day.slice(5).replace('-', '/'), ...twoProp(d.t[1], d.t[0], d.c[1], d.c[0]) }));
  chart = new Chart(el, { type: 'line', data: { labels: pts.map((p) => p.day), datasets: [
    { label: '상한', data: pts.map((p) => +p.hi.toFixed(1)), borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: `rgba(${V('--tint-rgb')},.14)` },
    { label: '하한', data: pts.map((p) => +p.lo.toFixed(1)), borderWidth: 0, pointRadius: 0, fill: false },
    { label: '차이', data: pts.map((p) => +p.d.toFixed(1)), borderColor: V('--s1'), borderWidth: 2.2, pointRadius: 0, tension: 0.3, fill: false },
    { label: '0', data: pts.map(() => 0), borderColor: V('--ink-3'), borderDash: [4, 4], borderWidth: 1, pointRadius: 0 },
  ] }, options: { responsive: true, aspectRatio: 1.7, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { filter: (x) => x.dataset.label === '차이', callbacks: { label: (x) => ` 차이 ${pp(x.parsed.y)}` } } },
    scales: { x: { grid: { display: false }, ticks: { color: V('--ink-3'), maxRotation: 0, autoSkipPadding: 14 } },
      y: { grid: { color: V('--line-soft') }, border: { display: false }, ticks: { color: V('--ink-3'), callback: (v) => `${v}%p` } } } } });
}
