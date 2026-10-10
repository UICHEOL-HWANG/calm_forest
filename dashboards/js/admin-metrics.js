// =============================================================
//  관리자 애널리틱스 — 화면 계산(순수 함수, DOM 없음)
//  tests/admin-metrics.test.mjs 가 이 파일을 직접 import 한다.
// =============================================================

// 이동 밀도 맵 — r = 맵 원점 기준 반경(월드 유닛). 롤업 표(cf_heat_day)는 2유닛 격자라 칸 수 = r.
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
  const n = r;
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
