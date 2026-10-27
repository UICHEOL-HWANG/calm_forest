// =============================================================
//  관리자 애널리틱스 — 화면 계산(순수 함수, DOM 없음)
//  tests/admin-metrics.test.mjs 가 이 파일을 직접 import 한다.
// =============================================================
import { STAGE_NAMES, EXPANSIONS } from '../../js/house-cost.js';

// 이동 밀도 맵 — r = 맵 원점 기준 반경(월드 유닛). 롤업 표(cf_heat_day)는 2유닛 격자라 -r..r 이 r+1 칸.
//   원점·크기 근거: js/data/places.js (마을 0,0 · DREAM 0,-550 · MIRROR 0,-700 r22) · js/dream/layout.js(섬 x -16~22, z -19~6)
export const MAPS = {
  main:   { label: '마을',      r: 44, char: 'fox' },
  dream:  { label: '꿈의 숲',   r: 26, char: 'rabbit' },
  mirror: { label: '거울 마을', r: 24, char: 'cat' },
};

/** 직전 대비 증감. pp=true 는 비율 지표(%p). 비교할 값이 없으면 null(화면에 안 그린다). */
export function delta(cur, prev, { pp = false } = {}) {
  if (cur == null || prev == null || (!pp && prev === 0)) return null;
  const v = pp ? Math.round((cur - prev) * 10) / 10 : Math.round(((cur - prev) / prev) * 100);
  const cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  const arrow = v > 0 ? '▲' : v < 0 ? '▼' : '–';
  return { cls, text: `${arrow} ${Math.abs(v)}${pp ? '%p' : '%'}` };
}

/** 퍼널 [[라벨, 값], ...] 에서 직전 단계 대비 이탈률이 가장 큰 구간. */
export function worstLeak(steps) {
  let idx = -1, drop = 0;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1][1];
    if (!prev) continue;
    const d = 1 - steps[i][1] / prev;
    if (d > drop) { drop = d; idx = i; }
  }
  return { idx, drop: Math.round(drop * 100) };
}

/** 비율(%) — 분모가 minBase 미만이면 null. 소표본 숫자는 그리지 않는다. */
export function rate(n, base, minBase = 1) {
  if (!base || base < minBase) return null;
  return Math.round((n / base) * 1000) / 10;
}

/** 한 맵의 밀도 격자. 행 0 = 북쪽(-z). */
export function heatGrid(cells, map) {
  const { r } = MAPS[map];
  const n = r + 1;   // -r, -r+2, …, r (양 끝 포함)
  const grid = new Array(n * n).fill(0);
  let max = 0;
  for (const c of cells) {
    if (c.map !== map) continue;
    const ix = (c.gx + r) / 2, iz = (c.gz + r) / 2;
    if (ix < 0 || ix >= n || iz < 0 || iz >= n) continue;
    const k = iz * n + ix;
    grid[k] += c.hits;
    if (grid[k] > max) max = grid[k];
  }
  return { grid, n, max };
}

export const HEAT_SLOTS = [
  { slot: 'all', label: '전체' },
  { slot: 0, label: '새벽', range: '0–6시' },
  { slot: 1, label: '오전', range: '6–12시' },
  { slot: 2, label: '오후', range: '12–18시' },
  { slot: 3, label: '저녁', range: '18–24시' },
];

export function heatCellsFor(data, slot) {
  if (slot === 'all') return data.heat || [];
  return (data.heat_slot || []).filter((r) => r[3] === slot).map(([map, gx, gz, , hits]) => ({ map, gx, gz, hits }));
}

export const ZONES = {
  spawn: '스폰 광장', stop: '정류장', neighbor_gate: '이웃 관문', house: '집 앞', bench: '작업대·주방',
  shop: '상점', market: '좌판·시세판', lake: '호수·부두', farm_gate: '텃밭 입구', coop: '닭장',
  cafe_gate: '카페 입구', glade: '계곡', light_workshop: '빛 공방', forest: '채집 숲', mine_gate: '광산 입구',
  museum_gate: '박물관 입구', observatory_gate: '천문대 입구', dock: '나루터', sea_gate: '바다 관문',
  mountain_gate: '설산 관문', mist_gate: '안개숲 관문', orchard_gate: '과수원 관문',
  house_in: '집 실내', farm: '텃밭', orchard: '과수원', mine: '광산', cafe: '카페 홀', museum: '박물관',
  kitchen: '요리 무대', carving: '조각 무대', prologue: '프롤로그', observatory: '천문대', neighbor: '이웃 마당',
  neighbor_in: '이웃 실내', mist: '안개숲', sea: '바다터', mountain: '설산',
  river: '나룻배', dream: '꿈의 숲', mirror: '거울 마을',
};

export const zoneLabel = (k) => ZONES[k] || k;

export const ZONE_CIRCLES = [
  ['spawn', 0, 0, 4], ['stop', 16, 17, 2.5], ['neighbor_gate', -4, 25, 2.5],
  ['house', -8, -8, 5], ['bench', 5.5, -5.5, 3.5], ['shop', -17.5, -4, 4],
  ['market', 11, 2.5, 4.5], ['lake', 16, 9, 7], ['farm_gate', 0, 7, 3],
  ['coop', -4.5, 11.5, 3], ['cafe_gate', 4, 14, 3], ['glade', 7, 26, 7],
  ['light_workshop', 16.5, 33.5, 4], ['forest', -18, 23, 9], ['mine_gate', -14, 3, 3],
  ['museum_gate', -26, 5, 3.5], ['observatory_gate', 25, 22, 3.5], ['dock', 0, -18, 6],
  ['sea_gate', 14.5, -12.5, 3], ['mountain_gate', -15, -32, 5], ['mist_gate', -21, -20, 3],
  ['orchard_gate', 33, 7, 3],
];

export const VILLAGE_R = 46;

export function trackSegments(points, r = VILLAGE_R) {
  if (!points?.length) return { segments: [], outsideShare: 0, duration: 0, start: 0 };
  const segments = [];
  let cur = null, out = 0;
  for (const p of points) {
    if (Math.abs(p[1]) <= r && Math.abs(p[2]) <= r) {
      if (!cur) { cur = []; segments.push(cur); }
      cur.push(p);
    } else {
      out += 1;
      cur = null;
    }
  }
  return { segments, outsideShare: Math.round((100 * out) / points.length), duration: points[points.length - 1][0] - points[0][0], start: points[0][0] };
}

export function zoneFlow(flow, seg, topN = 12) {
  if (!flow) return { sessions: 0, top: [], first: [], last: [] };
  const pick = (r) => seg === 'all' || r[0] === seg;
  const sessions = Object.entries(flow.sessions || {}).reduce((a, [k, n]) => a + (seg === 'all' || k === seg ? n : 0), 0);
  const share = (n) => (sessions ? Math.round((1000 * n) / sessions) / 10 : 0);
  const sum = (rows, key) => {
    const m = new Map();
    for (const r of rows.filter(pick)) m.set(key(r), (m.get(key(r)) || 0) + r[r.length - 1]);
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  };
  return {
    sessions,
    top: sum(flow.trans || [], (r) => r[1] + '>' + r[2]).slice(0, topN).map(([k, n]) => { const [a, b] = k.split('>'); return { a, b, n, share: share(n) }; }),
    first: sum(flow.first || [], (r) => r[1]).slice(0, 6).map(([zone, n]) => ({ zone, n, share: share(n) })),
    last: sum(flow.last || [], (r) => r[1]).slice(0, 6).map(([zone, n]) => ({ zone, n, share: share(n) })),
  };
}

export const MAP_HOUR_ROWS = [
  { map: 'main', label: '마을' },
  { map: 'dream', label: '꿈의 숲' },
  { map: 'mirror', label: '거울 마을' },
  { map: 'other', label: '그 외' },
];

export function mapHourGrid(rows) {
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const r of rows) byHour[r.hour] += r.hits;
  const find = (m, h) => rows.find((r) => r.map === m && r.hour === h);
  return {
    total: byHour.reduce((a, b) => a + b, 0),
    rows: MAP_HOUR_ROWS.map(({ map, label }) => ({
      map, label,
      cells: byHour.map((tot, hour) => {
        const r = find(map, hour);
        return { hour, hits: r?.hits || 0, users: r?.users || 0, share: tot ? (r?.hits || 0) / tot : null };
      }),
    })),
  };
}

/** 유저 관찰 표의 상태 칩. */
export function userStatus(u, now = new Date()) {
  const idleH = (now - new Date(u.last_seen)) / 3600e3;
  if (idleH > 48) return 'risk';
  const kstToday = new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
  const ageD = (Date.parse(kstToday) - Date.parse(u.first_day)) / 864e5;
  if (ageD <= 2) return 'new';
  if ((u.acq_days ?? 0) >= 5) return 'habit';
  return 'watch';
}

/** 첫 주 퍼널 단계(시간 순). [라벨, 값, 정의] */
export function funnelSteps(f) {
  return [
    ['신규 진입', f.entered ?? 0, '첫 접속 기기'],
    ['첫날 온보딩', f.onboard ?? 0, '캐릭터 선택까지'],
    ['첫날 획득', f.acq ?? 0, '수확·포획·제작 16종 중 1회'],
    ['D1 복귀', f.d1 ?? 0, '다음 날 다시 접속'],
    ['D7 복귀', f.d7 ?? 0, '7일째 다시 접속'],
  ];
}

// =============================================================
//  실험 페이지 — 효과 크기·검정·판정 (dashboards/experiments.html)
//  원재료(군별 n·x 또는 n·평균·sd)는 ml/scripts/experiment_summary.py 가 매일 만든다.
// =============================================================
const Z975 = 1.959964, Z80 = 0.841621;

/** 표준정규 누적분포(Abramowitz–Stegun 26.2.17, 오차 < 7.5e-8). */
export function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// 정규화 불완전 베타 I_x(a,b) — 연분수(Numerical Recipes betacf). t 분포 꼬리확률에 쓴다.
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5, ser = 1.000000000190015;
  tmp -= (x + 0.5) * Math.log(tmp);
  for (const v of c) ser += v / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function betacf(a, b, x) {
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d);
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); c = 1 + aa / c; c = Math.abs(c) < 1e-30 ? 1e-30 : c; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); c = 1 + aa / c; c = Math.abs(c) < 1e-30 ? 1e-30 : c;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-10) break;
  }
  return h;
}
function ibeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
/** t 분포 양측 p. */
export function tTwoSided(t, df) { return ibeta(df / 2, 0.5, df / (df + t * t)); }
/** t 분포 97.5% 분위수(이분법). */
export function tQ975(df) {
  let lo = 0, hi = 100;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (tTwoSided(mid, df) > 0.05) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/** 두 비율 차이(처치 − 대조, %p) · Wald 95% CI · 합동 z 검정 양측 p. */
export function twoProp(x1, n1, x2, n2) {
  const p1 = x1 / n1, p2 = x2 / n2, d = p1 - p2;
  const se = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
  const pp = (x1 + x2) / (n1 + n2), se0 = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  const z = se0 ? d / se0 : 0;
  return { p1, p2, d: d * 100, lo: (d - Z975 * se) * 100, hi: (d + Z975 * se) * 100, p: 2 * (1 - phi(Math.abs(z))) };
}

/** 두 평균 차이(처치 − 대조) · Welch t 95% CI · 양측 p. 표본이 작으면 t 분위수로 넓어진다. */
export function welch(a, b) {
  const v1 = (a.sd ** 2) / a.n, v2 = (b.sd ** 2) / b.n, se = Math.sqrt(v1 + v2), d = a.mean - b.mean;
  if (!se) return { d, lo: d, hi: d, p: null, df: null };
  const den = (a.n > 1 ? v1 * v1 / (a.n - 1) : 0) + (b.n > 1 ? v2 * v2 / (b.n - 1) : 0);
  const df = den ? (v1 + v2) ** 2 / den : Math.max(1, a.n + b.n - 2);
  const q = tQ975(df);
  return { d, lo: d - q * se, hi: d + q * se, p: tTwoSided(d / se, df), df };
}

/** 배정 비율 카이제곱 검사(SRM) p. ratio = 설계상 비율. */
export function srm(ns, ratio) {
  const N = ns.reduce((s, n) => s + n, 0);
  const chi = ns.reduce((s, n, i) => s + (n - N * ratio[i]) ** 2 / (N * ratio[i]), 0);
  const df = ns.length - 1;
  return df === 1 ? 2 * (1 - phi(Math.sqrt(chi))) : 1 - lowerGammaReg(df / 2, chi / 2);
}
function lowerGammaReg(s, x) {          // 정규화 하부 감마 P(s,x) — 자유도 2 이상 카이제곱용(급수)
  if (x <= 0) return 0;
  let sum = 1 / s, term = sum;
  for (let n = 1; n < 300; n++) { term *= x / (s + n); sum += term; if (term < sum * 1e-12) break; }
  return Math.min(1, sum * Math.exp(-x + s * Math.log(x) - lgamma(s)));
}

/** 검출 가능 최소 효과(%p) — 기준 비율 p, 팔당 n, 양측 5%·검출력 80%. */
export const mdeProp = (p, n) => (Z975 + Z80) * Math.sqrt(2 * p * (1 - p) / n) * 100;

const mmdd = (iso) => String(iso).slice(5).replace('-', '/');

/** 실험 1개 → 효과 크기·검정·판정. 판정 순서는 고정(실험 페이지 '판정 규칙' 과 같다). */
export function analyzeExperiment(e, today) {
  const r = e.result;
  if (!r || !r.arms?.length || !r.arms.some((a) => a.n > 0)) {
    const v = e.status === 'plan' ? ['st', '시작 전'] : e.kind === 'ext' ? ['st', '결과 입력 전'] : ['st', '결과 없음'];
    return { verdict: v, n: 0 };
  }
  const [tk, ck] = r.compare || [r.arms[0].key, r.arms[1].key];
  const t = r.arms.find((a) => a.key === tk), c = r.arms.find((a) => a.key === ck);
  const n = r.arms.reduce((s, a) => s + a.n, 0);
  const minN = Math.min(t.n, c.n);
  let est;
  if (r.type === 'mean') {
    est = welch(t, c);
    const sp = Math.sqrt(((t.sd ** 2) + (c.sd ** 2)) / 2);
    est.mde = (Z975 + Z80) * sp * Math.sqrt(2 / Math.max(1, minN));
  } else {
    est = twoProp(t.x, t.n, c.x, c.n);
    est.mde = mdeProp(c.n ? c.x / c.n : 0, Math.max(1, minN));
  }
  if (r.official) est = { ...est, d: r.official.d, lo: r.official.lo, hi: r.official.hi, p: r.official.p };
  const equal = e.kind === 'ab' || e.kind === 'multi';
  const ratio = Array.isArray(r.ratio) && r.ratio.length === r.arms.length ? r.ratio : r.arms.map(() => 1 / r.arms.length);
  const expectedMin = Math.min(...ratio) * n;
  const s = equal && expectedMin >= 5 ? srm(r.arms.map((a) => a.n), ratio) : null;
  const ciRule = r.official?.rule === 'ci';

  let verdict;
  if (e.kind === 'policy') verdict = ['obs', '인과 판정 안 함'];
  else if (e.confound) verdict = ['conf', '교란 주의'];
  else if (s != null && s < 0.01) verdict = ['lose', '배정 어긋남 · 판정 보류'];
  else if (e.decide_after && String(today) < String(e.decide_after)) verdict = ['obs', `관측 대기 · ${mmdd(e.decide_after)}`];
  else if (r.official && r.official.complete === false) verdict = ['obs', '관측 대기 · 데이터 도착 전'];
  else if (e.need && n < e.need && e.status === 'run') verdict = ['small', '표본 모으는 중'];
  else if (e.need && n < e.need && e.status === 'done') verdict = ['st', '표본 미달로 종료'];
  else if (r.descriptive) verdict = ['obs', '방향만 · 판정 안 함'];
  else if (ciRule) verdict = est.lo > 0 ? ['win', '효과 있음 ▲'] : est.hi < 0 ? ['lose', '효과 있음 ▼'] : ['na', '판정 불가'];
  else if (est.p != null && est.p < 0.05) verdict = est.d > 0 ? ['win', '효과 있음 ▲'] : ['lose', '효과 있음 ▼'];
  else verdict = ['na', '판정 불가'];
  return { ...est, type: r.type || 'prop', n, srm: s, verdict, t, c, official: r.official || null };
}

const HOUSE_STAGE_NAMES = [...STAGE_NAMES, ...EXPANSIONS.map((e) => e.name)];
const HOUSE7_STYLES = EXPANSIONS.find((e) => e.stage === 7)?.styles || {};

export function houseStageLabel(r) {
  if (!r.stage) return '없음';
  const name = (r.stage === 7 && HOUSE7_STYLES[r.style]?.name) || HOUSE_STAGE_NAMES[r.stage];
  return name ? `${r.stage} ${name}` : `${r.stage}단계`;
}
