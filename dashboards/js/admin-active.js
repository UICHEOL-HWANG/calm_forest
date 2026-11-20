import { $, V, nf, esc, shareKey, bootAdmin, showRpcError, createLoader, chartDefaults } from './admin-common.js';
import { activeKpis, activeDailyRows, delta } from './admin-metrics.js';

const STEPS = [
  ['dog', '강아지가 날짜별 접속을 세는 중'],
  ['fox', '여우가 7일·30일 창을 굴리는 중'],
  ['bear', '곰이 플랫폼별로 나누는 중'],
];
const PLATFORM = { web: '웹', android: '안드로이드 앱', ios: 'iOS 앱', itch: 'itch.io', toss: '토스', unknown: '알 수 없음' };
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

const page = $('page');
const loader = createLoader(page, $('loader'), STEPS);
const charts = {};
let days = 60, data = null;

const mmdd = (d) => `${+String(d).slice(5, 7)}/${+String(d).slice(8, 10)}`;
const dow = (d) => DOW[new Date(`${String(d).slice(0, 10)}T00:00:00Z`).getUTCDay()];
const fx = (v, digits = 1) => (v == null ? '—' : v.toFixed(digits));
const dl = (cur, prev, vs, opt) => {
  const x = delta(cur, prev, opt);
  return x ? `<span><span class="dlt ${x.cls}">${x.text}</span> <span class="def">${vs}</span></span>` : '<span class="def">비교할 이전 값이 아직 없어요</span>';
};

function spark(vals) {
  if (vals.length < 2) return '';
  const W = 200, H = 34, mx = Math.max(...vals, 1);
  const X = (i) => (i / (vals.length - 1)) * W, Y = (v) => H - 3 - (v / mx) * (H - 6);
  const p = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${p}L${W},${H}L0,${H}Z" fill="rgba(${V('--tint-rgb')},.12)"/><path d="${p}" fill="none" stroke="${V('--s1')}" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>`;
}

function draw(id, cfg) {
  charts[id]?.destroy();
  const el = $(id);
  if (el) charts[id] = new Chart(el, cfg);
}

(async () => {
  loader.start('로딩 중입니다');
  const sb = await bootAdmin();
  if (!sb) { loader.done(); $('dash').hidden = true; return; }
  const { data: d, error } = await sb.rpc('cf_admin_active', shareKey ? { token: shareKey } : {});
  loader.done();
  if (error) { $('dash').hidden = true; showRpcError(sb, error, 'cf_admin_active'); return; }
  if (!d?.series) { $('dash').hidden = true; showRpcError(sb, new Error('응답이 비어 있습니다'), 'cf_admin_active'); return; }
  data = d;
  page.classList.remove('is-first');
  const btns = [...$('range').children];
  btns.forEach((b) => { b.disabled = false; });
  $('range').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || +b.dataset.d === days) return;
    days = +b.dataset.d;
    btns.forEach((x) => x.classList.toggle('on', x === b));
    renderCharts();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
})();

function render() {
  const k = activeKpis(data.series, data.today);
  $('meta').classList.remove('skel');
  if (!k) {
    $('meta').textContent = '아직 완결된 날이 없어요';
    $('dash').hidden = true;
    return;
  }
  $('meta').innerHTML = `기기 기준 · KST · 페르소나 제외 · 오늘은 진행 중이라 <b>어제(${mmdd(k.day)})까지</b> 셉니다` + (shareKey ? ' · 🔗 <b>임시 공유 보기</b>' : '');
  renderKpis(k);
  renderCharts();
  renderPlatforms(data.platforms || []);
  renderDaily(activeDailyRows(data.series, data.today, 14));
}

function renderKpis(k) {
  const done = data.series.filter((r) => String(r.d) < String(data.today)).slice(-30);
  const stickSeries = done.map((r) => (r.mau ? (r.dau / r.mau) * 100 : 0));
  const tile = (label, sub, value, deltaHtml, vals) => `<div class="k"><span class="lb">${label}<small>${sub}</small></span><span class="n num">${value}</span>${deltaHtml}${spark(vals)}</div>`;
  $('kpis').innerHTML = [
    tile('하루 활성 유저 DAU', '최근 7일 평균', fx(k.dau), dl(k.dau, k.dauPrev, '직전 7일 대비'), done.map((r) => r.dau)),
    tile('주간 활성 유저 WAU', '어제까지 7일', nf(k.wau), dl(k.wau, k.wauPrev, '7일 전 대비'), done.map((r) => r.wau)),
    tile('월간 활성 유저 MAU', '어제까지 30일', nf(k.mau), dl(k.mau, k.mauPrev, '30일 전 대비'), done.map((r) => r.mau)),
    tile('고착도 DAU÷MAU', '30일 평균 DAU 기준', k.stick == null ? '—' : `${fx(k.stick)}%`, dl(k.stick, k.stickPrev, '30일 전 대비', { pp: true }), stickSeries),
  ].join('');
}

function renderCharts() {
  chartDefaults();
  const win = data.series.filter((r) => String(r.d) < String(data.today)).slice(-days);
  const labels = win.map((r) => mmdd(r.d));
  const title = (items) => { const r = win[items[0].dataIndex]; return `${mmdd(r.d)} (${dow(r.d)})`; };
  const x = { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 16 } };
  const y = { beginAtZero: true, grid: { color: V('--line-soft') }, border: { display: false }, ticks: { precision: 0, maxTicksLimit: 5 } };
  const base = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false } };
  draw('cDau', { type: 'bar', data: { labels, datasets: [
    { label: '기존 유저', data: win.map((r) => r.dau - r.new), backgroundColor: V('--s1'), borderRadius: 2 },
    { label: '신규 유저', data: win.map((r) => r.new), backgroundColor: V('--s2'), borderRadius: 2, borderColor: V('--surface-1'), borderWidth: { bottom: 2 }, borderSkipped: false },
  ] }, options: { ...base, plugins: { legend: { display: false }, tooltip: { callbacks: { title, footer: (items) => `DAU ${nf(win[items[0].dataIndex].dau)}` } } },
    scales: { x: { ...x, stacked: true }, y: { ...y, stacked: true } } } });
  const line = (id, key, label) => draw(id, { type: 'line', data: { labels, datasets: [
    { label, data: win.map((r) => r[key]), borderColor: V('--s1'), borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.25, fill: true, backgroundColor: `rgba(${V('--tint-rgb')},.12)` },
  ] }, options: { ...base, plugins: { legend: { display: false }, tooltip: { callbacks: { title } } }, scales: { x, y } } });
  line('cWau', 'wau', 'WAU');
  line('cMau', 'mau', 'MAU');
}

function renderPlatforms(rows) {
  const list = rows.filter((r) => r.mau > 0);
  if (!list.length) { $('plat').innerHTML = '<p class="def">최근 30일 접속 기록이 없어요.</p>'; return; }
  const mx = Math.max(...list.map((r) => r.mau));
  $('plat').innerHTML = `<table class="tb"><tr><th>플랫폼</th><th class="r">DAU</th><th class="r">WAU</th><th>MAU</th></tr>${list.map((r) => `<tr><td><b>${esc(PLATFORM[r.platform] || r.platform)}</b></td><td class="r tn">${nf(r.dau)}</td><td class="r tn">${nf(r.wau)}</td><td class="tn"><span class="mbar" style="width:${Math.round((r.mau / mx) * 90)}px"></span>${nf(r.mau)}</td></tr>`).join('')}</table>`;
}

function renderDaily(rows) {
  $('daily').innerHTML = `<table class="tb"><tr><th>날짜</th><th class="r">DAU</th><th class="r">신규</th><th class="r">기존</th><th class="r">WAU</th><th class="r">MAU</th><th class="r">고착도</th></tr>${rows.map((r) => `<tr><td class="tn"><b>${mmdd(r.d)}</b> <span class="def">${dow(r.d)}</span></td><td class="r tn"><b>${nf(r.dau)}</b></td><td class="r tn">${nf(r.new)}</td><td class="r tn">${nf(r.ret)}</td><td class="r tn">${nf(r.wau)}</td><td class="r tn">${nf(r.mau)}</td><td class="r tn">${r.stick == null ? '—' : `${fx(r.stick)}%`}</td></tr>`).join('')}</table>`;
}
