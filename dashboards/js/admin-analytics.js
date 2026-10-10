// =============================================================
//  관리자 애널리틱스 v2 (A안 · 리포트형) — dashboards/admin_analytics.html
//  데이터: RPC cf_admin_dashboard(days, token) — sql/analytics/admin_dashboard.sql
//  계산: ./admin-metrics.js(순수 함수, 테스트 있음) · 공통: ./admin-common.js
// =============================================================
import { $, V, nf, esc, CHAR, shareKey, bootAdmin, explainRpcError, showMsg, createLoader } from './admin-common.js';
import { MAPS, delta, worstLeak, rate, heatGrid, userStatus, funnelSteps } from './admin-metrics.js';

const page = $('page');
const loader = createLoader(page, $('loader'));
const charts = {};
let sb = null, days = 30, data = null, heatMap = 'main';

const mmdd = (d) => String(d).slice(5).replace('-', '/');
const secs = (s) => (s == null ? '—' : s >= 60 ? `${Math.floor(s / 60)}분 ${Math.round(s % 60)}초` : `${Math.round(s)}초`);
const pct = (v) => (v == null ? '—' : `${v}%`);
const dl = (cur, prev, opt) => { const d = delta(cur, prev, opt); return d ? `<span class="dlt ${d.cls}">${d.text}</span>` : ''; };

// ── 차트 공통(색은 _dash.css 토큰) ──
function chartDefaults() {
  Chart.defaults.color = V('--ink-3');
  Chart.defaults.borderColor = V('--line-soft');
  Chart.defaults.font.family = V('--font');
  Chart.defaults.font.size = 10.5;
  Chart.defaults.plugins.tooltip.backgroundColor = V('--ink');
  Chart.defaults.plugins.tooltip.titleColor = V('--surface-1');
  Chart.defaults.plugins.tooltip.bodyColor = V('--surface-1');
}
const axes = (extra = {}) => ({
  x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
  y: { beginAtZero: true, grid: { color: V('--line-soft') }, border: { display: false } },
  ...extra,
});
const legend = { display: true, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10 } };
function draw(id, cfg) {
  charts[id]?.destroy();
  const el = $(id);
  if (el) charts[id] = new Chart(el, cfg);
}
const fill = (ctx, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgba(${V('--tint-rgb')},.28)`);
  g.addColorStop(1, `rgba(${V('--tint-rgb')},0)`);
  return g;
};

// ── 부팅 ──
(async () => {
  loader.start(`분석 중 · 최근 ${days}일`);
  sb = await bootAdmin();
  if (!sb) { loader.done(); $('wrap').hidden = true; return; }
  $('range').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled || +b.dataset.d === days) return;
    days = +b.dataset.d;
    load();
  });
  $('mapSel').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    heatMap = b.dataset.map;
    [...$('mapSel').children].forEach((x) => x.classList.toggle('on', x === b));
    if (data) renderHeat(data.heat || []);
  });
  watchToc();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => data && render(data));
  load();
})();

async function load() {
  const btns = [...$('range').children];
  btns.forEach((b) => { b.disabled = true; b.classList.toggle('on', +b.dataset.d === days); b.setAttribute('aria-busy', String(+b.dataset.d === days)); });
  loader.start(`분석 중 · 최근 ${days}일`);
  const { data: d, error } = await sb.rpc('cf_admin_dashboard', shareKey ? { days, token: shareKey } : { days });
  btns.forEach((b) => { b.disabled = false; b.setAttribute('aria-busy', 'false'); });
  loader.done();
  if (error) { $('wrap').hidden = true; showMsg(explainRpcError(error, 'cf_admin_dashboard')); return; }
  data = d;
  render(d);
  $('dash').classList.remove('fadein');
  void $('dash').offsetWidth;   // 애니메이션 다시 걸기
  $('dash').classList.add('fadein');
}

function render(d) {
  chartDefaults();
  const m = d.meta || {}, k = d.kpis || {};
  $('meta').innerHTML = `<b>${mmdd(m.since)} – ${mmdd(m.today)}</b> (${m.days}일) · 기기 기준 · KST · 페르소나 세션 ${nf(m.persona_sessions)}개 제외 · 데이터 ${mmdd(m.data_from)}~`
    + (shareKey ? ' · 🔗 <b>임시 공유 보기</b>(읽기 전용)' : '');
  $('ovEyebrow').textContent = `개요 · 최근 ${m.days}일`;
  renderKpis(k, d.nsm_daily || []);
  renderInsights(d);
  renderFunnel(d.funnel || {}, m);
  renderBuckets(d.session_buckets || []);
  renderCurve(d.curve || []);
  renderCohorts(d.cohorts || []);
  renderGrowth(d.daily || []);
  renderNsm(d.nsm_daily || []);
  renderHourmap(d.hourly || []);
  renderHeat(d.heat || []);
  renderUsers(d.users || []);
  renderEcon(d.econ_daily || [], d.econ_sources || []);
  renderSegments(d.segments || {}, d.progress || {});
}

// ── 개요 ──
function renderKpis(k, nsmDaily) {
  $('kpis').innerHTML = `
    <div class="nsm"><span class="lbl">★ 북극성 · 획득한 유저 / 일</span>
      <span><span class="num">${k.nsm ?? '—'}</span> ${dl(k.nsm, k.nsm_prev)}</span>
      <div class="chartbox" style="height:44px"><canvas id="cSpark"></canvas></div>
      <span class="def">어제까지 7일 평균 · 지난주 ${k.nsm_prev ?? '—'}</span></div>
    <div><span class="lbl">평균 DAU</span><span class="num">${k.avg_dau ?? '—'}</span>${dl(k.avg_dau, k.avg_dau_prev)}
      <span class="def">오늘 ${nf(k.dau_today)}명(진행 중)</span></div>
    <div><span class="lbl">신규 유저</span><span class="num">${nf(k.new_users)}</span>${dl(k.new_users, k.new_prev)}
      <span class="def">직전 기간 ${nf(k.new_prev)}</span></div>
    <div><span class="lbl">D1 리텐션</span><span class="num">${pct(k.d1)}</span>${dl(k.d1, k.d1_prev, { pp: true })}
      <span class="def">대상 ${nf(k.d1_base)}명 · D7 ${pct(k.d7)}</span></div>
    <div><span class="lbl">Stickiness</span><span class="num">${pct(k.stickiness)}</span>${dl(k.stickiness, k.stickiness_prev, { pp: true })}
      <span class="def">평균 DAU ÷ MAU ${nf(k.mau)} · 세션 ${secs(k.med_session_sec)}</span></div>`;
  const el = $('cSpark');
  const arr = nsmDaily.map((r) => r.ma7);
  draw('cSpark', { type: 'line', data: { labels: arr.map((_, i) => i), datasets: [{
    data: arr, borderColor: V('--s1'), backgroundColor: fill(el.getContext('2d'), 44), fill: true, tension: .35, borderWidth: 2,
    pointRadius: arr.map((_, i) => (i === arr.length - 1 ? 3 : 0)), pointBackgroundColor: V('--s1') }] },
    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
      plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } } } });
}

function renderInsights(d) {
  const k = d.kpis || {}, f = d.funnel || {};
  const steps = funnelSteps(f);
  const lk = worstLeak(steps);
  const leakTxt = lk.idx > 0 ? `첫 주 퍼널의 가장 큰 누수는 <b>${steps[lk.idx - 1][0]} → ${steps[lk.idx][0]}</b>(<b>−${lk.drop}%</b>).` : '';
  $('insight').innerHTML = `북극성은 하루 <b>${k.nsm ?? '—'}명</b>, 평균 DAU <b>${k.avg_dau ?? '—'}</b>명. ${leakTxt}`;

  const a = rate(f.d1_if_acq, f.n_acq), n = rate(f.d1_if_non, f.n_non);
  const small = (f.n_acq ?? 0) < 20 || (f.n_non ?? 0) < 20;
  $('actInsight').innerHTML = a == null || n == null
    ? '7일 관측이 끝난 신규가 아직 적어 비교하지 않습니다.'
    : `첫날 획득한 신규의 D1 복귀 <b>${a}%</b>(${f.n_acq}명), 안 한 신규 <b>${n}%</b>(${f.n_non}명).`
      + (small ? ' 표본이 작아 방향만 참고하세요.' : '') + ' 인과가 아니라 같이 움직이는지입니다.';

  const c7 = (d.curve || []).find((r) => r.n === 7);
  const r7a = c7 && rate(c7.ret_acq, c7.base_acq, 5), r7n = c7 && rate(c7.ret_non, c7.base_non, 5);
  $('retInsight').innerHTML = r7a != null && r7n != null
    ? `D7 잔존: 첫날 획득 <b>${r7a}%</b> · 미획득 <b>${r7n}%</b>. 전체 D7 은 <b>${pct(k.d7)}</b>(관측 완료 ${nf(k.d7_base)}명).`
    : `전체 D7 리텐션 <b>${pct(k.d7)}</b>(관측 완료 ${nf(k.d7_base)}명). 기간이 짧으면 곡선 뒤쪽은 분모가 모자라 비어 있습니다.`;
}

// ── 활성화 ──
function renderFunnel(f, m) {
  const steps = funnelSteps(f);
  $('funnelDef').textContent = `첫 접속 ${mmdd(m.funnel_from)}–${mmdd(m.funnel_to)} 신규(7일 관측 완료). 각 단계는 앞 단계를 통과한 사람 중에서 셉니다.`;
  const top = steps[0][1];
  if (!top) { $('funnel').innerHTML = emptyState('7일 관측이 끝난 신규가 아직 없어요', '기간을 30일 이상으로 넓혀 보세요.'); return; }
  const lk = worstLeak(steps);
  $('funnel').innerHTML = '<div class="fun">' + steps.map(([l, v, def], i) => {
    const prev = i ? steps[i - 1][1] : null;
    const gap = i ? `<div class="fgap${i === lk.idx ? ' worst' : ''}"><span></span><span class="d">↓ ${prev ? Math.round((1 - v / prev) * 100) : 0}% 이탈${i === lk.idx ? ' · 가장 큰 누수' : ''}</span><span></span></div>` : '';
    return gap + `<div class="frow"><span class="fl">${l}<small>${def}</small></span>
      <span class="fb"><i style="width:${(v / top * 100).toFixed(1)}%;opacity:${(1 - i * .13).toFixed(2)}"></i><span>${nf(v)}</span></span>
      <span class="fv">${(v / top * 100).toFixed(1)}%<small>${i ? '단계 ' + (prev ? Math.round(v / prev * 100) : 0) + '%' : '기준'}</small></span></div>`;
  }).join('') + '</div>';
}

function renderBuckets(rows) {
  draw('cBuckets', { type: 'bar', data: { labels: rows.map((r) => r.bucket), datasets: [{
    data: rows.map((r) => r.sessions), backgroundColor: rows.map((_, i) => (i < 2 ? V('--s2') : V('--s1'))), borderRadius: 5 }] },
    options: { responsive: true, aspectRatio: 2, plugins: { legend: { display: false } }, scales: axes() } });
}

// ── 리텐션 ──
function renderCurve(rows) {
  const pts = rows.filter((r) => r.n > 0);
  const series = (n, b) => pts.map((r) => rate(r[n], r[b], 5));
  draw('cCurve', { type: 'line', data: { labels: pts.map((r) => 'D' + r.n), datasets: [
    { label: '첫날 획득함', data: series('ret_acq', 'base_acq'), borderColor: V('--s1'), backgroundColor: V('--s1'), tension: .3, pointRadius: 2, borderWidth: 2.5, spanGaps: false },
    { label: '획득 안 함', data: series('ret_non', 'base_non'), borderColor: V('--s2'), backgroundColor: V('--s2'), tension: .3, pointRadius: 2, borderWidth: 2.5, spanGaps: false },
    { label: '전체', data: series('ret', 'base'), borderColor: V('--ink-3'), backgroundColor: V('--ink-3'), borderDash: [4, 4], tension: .3, pointRadius: 0, borderWidth: 1.5 },
  ] }, options: { responsive: true, aspectRatio: 1.6, interaction: { mode: 'index', intersect: false },
    plugins: { legend, tooltip: { callbacks: { label: (x) => ` ${x.dataset.label} ${x.parsed.y ?? '—'}%` } } },
    scales: axes({ y: { beginAtZero: true, grid: { color: V('--line-soft') }, border: { display: false }, ticks: { callback: (v) => v + '%' } },
      x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: (v, i) => ([1, 3, 7, 14, 30].includes(pts[i]?.n) ? 'D' + pts[i].n : '') } } }) } });
}

function renderCohorts(rows) {
  if (!rows.length) { $('cohorts').innerHTML = emptyState('기간 안에 들어온 신규가 없어요', '기간을 넓혀 보세요.'); return; }
  const N = [1, 3, 7, 14, 30];
  const tint = (p) => `background:rgba(var(--tint-rgb),${Math.min(.85, .07 + p / 30).toFixed(2)})`;
  $('cohorts').innerHTML = '<div class="scroll-x"><table class="tri"><tr><th>첫 접속 주</th><th style="text-align:right">인원</th>'
    + N.map((n) => `<th>D${n}</th>`).join('') + '</tr>'
    + rows.map((r) => {
      const cells = Object.fromEntries((r.cells || []).map((c) => [c.n, c]));
      return `<tr><td class="c">${mmdd(r.week)} 주</td><td class="n">${nf(r.size)}</td>` + N.map((n) => {
        const c = cells[n];
        const v = c && rate(c.ret, c.base, 1);
        return v == null ? '<td class="na" title="아직 관측 기간이 안 지남"></td>'
          : `<td style="${tint(v)}" title="${c.ret}/${c.base}명">${v}%</td>`;
      }).join('') + '</tr>';
    }).join('') + '</table></div><p class="def" style="margin-top:6px">빗금 = 관측 기간이 아직 안 끝난 칸(분모에서 뺌). 칸에 마우스를 올리면 인원.</p>';
}

// ── 성장 구성 ──
function renderGrowth(rows) {
  draw('cGrowth', { type: 'bar', data: { labels: rows.map((r) => mmdd(r.day)), datasets: [
    { label: '신규', data: rows.map((r) => r.new_users), backgroundColor: V('--s1'), stack: 'g' },
    { label: '연속 복귀', data: rows.map((r) => r.retained), backgroundColor: V('--s3'), stack: 'g' },
    { label: '재활성', data: rows.map((r) => r.resurrected), backgroundColor: V('--s4'), stack: 'g' },
    { label: '이탈', data: rows.map((r) => (r.churned == null ? null : -r.churned)), backgroundColor: V('--s2'), stack: 'g' },
  ] }, options: { responsive: true, aspectRatio: 3.2,
    plugins: { legend, tooltip: { mode: 'index', intersect: false, callbacks: { label: (x) => ` ${x.dataset.label} ${Math.abs(x.parsed.y)}명` } } },
    scales: axes({ x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 14 } },
      y: { stacked: true, grid: { color: V('--line-soft') }, border: { display: false } } }) } });
}

function renderNsm(rows) {
  const el = $('cNsm');
  draw('cNsm', { data: { labels: rows.map((r) => mmdd(r.day)), datasets: [
    { type: 'line', label: '7일 평균', data: rows.map((r) => r.ma7), borderColor: V('--s1'), backgroundColor: fill(el.getContext('2d'), 160), fill: true, tension: .35, pointRadius: 0, borderWidth: 2.5 },
    { type: 'bar', label: '그날 획득한 유저', data: rows.map((r) => r.acq_users), backgroundColor: `rgba(${V('--tint-rgb')},.28)`, borderRadius: 3 },
  ] }, options: { responsive: true, aspectRatio: 4.2, interaction: { mode: 'index', intersect: false }, plugins: { legend }, scales: axes() } });
}

// ── 참여 ──
function renderHourmap(rows) {
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const max = Math.max(1, ...rows.map((r) => r.sessions));
  const get = (d, h) => rows.find((r) => r.dow === d && r.hour === h)?.sessions || 0;
  let h = '<div class="hgrid"><span></span>' + Array.from({ length: 24 }, (_, i) => `<span style="text-align:center">${i % 6 === 0 ? i : ''}</span>`).join('');
  for (let d = 0; d < 7; d++) {
    h += `<span class="rl">${DOW[d]}</span>`;
    for (let i = 0; i < 24; i++) {
      const v = get(d, i);
      h += `<span class="cell" title="${DOW[d]} ${i}시 · ${v}세션"${v ? ` style="background:rgba(var(--tint-rgb),${(.12 + .88 * v / max).toFixed(2)})"` : ''}></span>`;
    }
  }
  $('hourmap').innerHTML = h + '</div>';
}

// 히트맵 램프 = _dash.css --heat-lo → --heat-hi (단일 색 — 다색 램프는 색맹에서 순서가 뒤집힌다)
function renderHeat(cells) {
  const { grid, n, max } = heatGrid(cells, heatMap);
  const c = $('heat');
  c.width = n; c.height = n;
  const ctx = c.getContext('2d');
  const lo = V('--heat-lo').split(',').map(Number), hi = V('--heat-hi').split(',').map(Number);
  const img = ctx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const t = max ? Math.sqrt(grid[i] / max) : 0;
    for (let k = 0; k < 3; k++) img.data[i * 4 + k] = Math.round(lo[k] + (hi[k] - lo[k]) * t);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const total = grid.reduce((a, b) => a + b, 0);
  $('heatDef').innerHTML = total
    ? `위 = 북쪽 · ${MAPS[heatMap].label} 위치 기록 ${nf(total)}건. 밝을수록 오래 머문 칸(2유닛 격자).`
    : `<span style="display:inline-flex;gap:8px;align-items:center"><img src="${CHAR(MAPS[heatMap].char)}" alt="" style="width:28px;height:28px;object-fit:contain">이 기간 ${MAPS[heatMap].label} 기록이 없어요.</span>`;
}

// ── 운영 ──
function renderUsers(rows) {
  if (!rows.length) { $('users').innerHTML = `<tr><td>${emptyState('기간 안에 접속한 유저가 없어요', '')}</td></tr>`; return; }
  const now = new Date();
  const ago = (t) => { const mins = Math.round((now - new Date(t)) / 60000);
    return mins < 60 ? `${Math.max(mins, 0)}분 전` : mins < 1440 ? `${Math.round(mins / 60)}시간 전` : `${Math.round(mins / 1440)}일 전`; };
  const CHIP = { risk: ['risk', '이탈 위험'], new: ['new', '신규'], habit: ['ok', '습관화'], watch: ['', '관찰'] };
  $('users').innerHTML = '<tr><th>유저</th><th>플랫폼</th><th>첫 접속</th><th class="r">활동일</th><th class="r">획득일</th><th class="r">세션</th><th class="r">마지막</th><th>상태</th></tr>'
    + rows.map((r) => {
      const [cls, label] = CHIP[userStatus(r, now)];
      return `<tr><td style="font-family:var(--mono);font-size:11px">${r.is_guest ? 'g_' : 'u_'}${esc(r.uid)}</td>
        <td>${esc(r.platform || 'web')}</td><td>${mmdd(r.first_day)}</td>
        <td class="r">${r.active_days}</td><td class="r">${r.acq_days}</td><td class="r">${r.sessions}</td>
        <td class="r">${ago(r.last_seen)}</td><td><span class="chip ${cls}">${label}</span></td></tr>`;
    }).join('');
}

function renderEcon(daily, sources) {
  draw('cEcon', { data: { labels: daily.map((r) => mmdd(r.day)), datasets: [
    { type: 'bar', label: '유입', data: daily.map((r) => r.inflow), backgroundColor: V('--s1'), stack: 'e' },
    { type: 'bar', label: '유출', data: daily.map((r) => -r.outflow), backgroundColor: V('--s2'), stack: 'e' },
    { type: 'line', label: '순증', data: daily.map((r) => r.net), borderColor: V('--s3'), backgroundColor: 'transparent', tension: .3, pointRadius: 0, borderWidth: 2 },
  ] }, options: { responsive: true, aspectRatio: 1.6, plugins: { legend }, scales: axes({ x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: V('--line-soft') }, border: { display: false } } }) } });
  $('econSrc').innerHTML = !sources.length ? emptyState('경제 기록이 없어요', '')
    : '<table class="ut"><tr><th>출처</th><th class="r">건수</th><th class="r">유입</th><th class="r">유출</th><th class="r">순증</th></tr>'
      + sources.map((r) => `<tr><td>${esc(r.source)}</td><td class="r">${nf(r.tx)}</td>
        <td class="r" style="color:var(--up)">${r.inflow ? '+' + nf(r.inflow) : '—'}</td>
        <td class="r" style="color:var(--down)">${r.outflow ? '-' + nf(r.outflow) : '—'}</td>
        <td class="r"><b>${r.net > 0 ? '+' : ''}${nf(r.net)}</b></td></tr>`).join('') + '</table>';
}

function renderSegments(seg, prog) {
  const P = [V('--s1'), V('--s2'), V('--s3'), V('--s4'), V('--s5')];   // 순서 고정 — 색맹 안전장치
  const pie = (id, rows, lab, val) => draw(id, { type: 'doughnut', data: { labels: rows.map(lab),
    datasets: [{ data: rows.map(val), backgroundColor: rows.map((_, i) => P[i % P.length]), borderWidth: 0 }] },
    options: { responsive: true, aspectRatio: 1.5, cutout: '58%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } } } } });
  const bar = (id, rows, lab, val) => draw(id, { type: 'bar', data: { labels: rows.map(lab),
    datasets: [{ data: rows.map(val), backgroundColor: V('--s1'), borderRadius: 4 }] },
    options: { responsive: true, aspectRatio: 1.6, plugins: { legend: { display: false } }, scales: axes() } });
  pie('cPlatform', seg.platform || [], (r) => r.seg, (r) => r.users);
  pie('cGuest', seg.guest || [], (r) => r.seg, (r) => r.users);
  const HOUSE = { 0: '없음', 1: '기초', 2: '벽', 3: '완성', 4: '넓은 집', 5: '저택', 6: '모던' };
  bar('cHouse', prog.house || [], (r) => HOUSE[r.stage] ?? `${r.stage}단계`, (r) => r.users);
  bar('cDex', prog.dex || [], (r) => r.bucket, (r) => r.users);
}

function emptyState(title, hint) {
  return `<div class="empty-st"><img src="${CHAR('rabbit')}" alt=""><b>${title}</b>${hint}</div>`;
}

// 목차: 지금 보는 섹션 강조
function watchToc() {
  const links = [...$('toc').querySelectorAll('a')];
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('.rsec').forEach((s) => io.observe(s));
}
