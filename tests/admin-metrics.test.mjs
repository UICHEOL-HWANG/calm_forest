import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { delta, worstLeak, rate, heatGrid, userStatus, funnelSteps, MAPS } from '../dashboards/js/admin-metrics.js';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('증감: 비율은 %, 비율 지표는 %p, 직전 값이 없으면 표시하지 않는다', () => {
  assert.deepEqual(delta(12, 10), { cls: 'up', text: '▲ 20%' });
  assert.deepEqual(delta(8, 10), { cls: 'down', text: '▼ 20%' });
  assert.deepEqual(delta(5.3, 7.7, { pp: true }), { cls: 'down', text: '▼ 2.4%p' });
  assert.deepEqual(delta(10, 10), { cls: 'flat', text: '– 0%' });
  assert.equal(delta(3, 0), null);
  assert.equal(delta(3, null), null);
  assert.equal(delta(null, 3), null);
});

test('퍼널의 가장 큰 누수는 직전 단계 대비 이탈률이 가장 큰 구간', () => {
  const steps = [['a', 100], ['b', 60], ['c', 20], ['d', 12]];
  assert.deepEqual(worstLeak(steps), { idx: 2, drop: 67 });
  // 앞 단계가 0이면 0으로 나누지 않는다
  assert.deepEqual(worstLeak([['a', 0], ['b', 0]]), { idx: -1, drop: 0 });
});

test('비율은 분모가 기준 미만이면 null — 소표본 숫자를 그리지 않는다', () => {
  assert.equal(rate(3, 10), 30);
  assert.equal(rate(1, 3), 33.3);
  assert.equal(rate(1, 4, 5), null);
  assert.equal(rate(0, 0), null);
});

test('맵별 밀도 격자: 맵 경계 밖 칸은 버리고 최댓값을 함께 준다', () => {
  const cells = [
    { map: 'main', gx: 0, gz: 0, hits: 5 },
    { map: 'main', gx: 44, gz: -44, hits: 9 },     // 경계 칸(양 끝 포함)
    { map: 'main', gx: 200, gz: 0, hits: 99 },     // 경계 밖
    { map: 'dream', gx: 0, gz: 0, hits: 7 },       // 다른 맵
  ];
  const g = heatGrid(cells, 'main');
  assert.equal(g.max, 9);
  assert.equal(g.n, MAPS.main.r + 1);              // 2유닛 격자, -r..r 양 끝 포함
  assert.equal(g.grid.reduce((a, b) => a + b, 0), 14);
  assert.equal(heatGrid(cells, 'mirror').max, 0);
});

test('유저 상태: 이틀 넘게 안 오면 이탈 위험, 최근 3일 첫 접속은 신규, 획득일 5일+ 은 습관화', () => {
  const now = new Date('2026-10-10T12:00:00+09:00');
  const ago = (h) => new Date(now - h * 3600e3).toISOString();
  assert.equal(userStatus({ last_seen: ago(60), first_day: '2026-09-01', acq_days: 9 }, now), 'risk');
  assert.equal(userStatus({ last_seen: ago(2), first_day: '2026-10-09', acq_days: 0 }, now), 'new');
  assert.equal(userStatus({ last_seen: ago(2), first_day: '2026-09-01', acq_days: 5 }, now), 'habit');
  assert.equal(userStatus({ last_seen: ago(2), first_day: '2026-09-01', acq_days: 1 }, now), 'watch');
});

test('첫 주 퍼널 단계는 시간 순(진입→첫날 온보딩→첫날 획득→D1→D7)', () => {
  const s = funnelSteps({ entered: 10, onboard: 8, acq: 4, d1: 2, d7: 1 });
  assert.deepEqual(s.map(x => x[1]), [10, 8, 4, 2, 1]);
  assert.match(s[1][0], /온보딩/);
  assert.match(s[2][0], /획득/);
});

test('관리자 페이지는 v2 RPC 와 7·30·60일 버튼을 쓰고 90일은 없다', () => {
  const html = src('dashboards/admin_analytics.html');
  const js = src('dashboards/js/admin-analytics.js');
  assert.match(js, /cf_admin_dashboard/);
  for (const d of [7, 30, 60]) assert.match(html, new RegExp(`data-d="${d}"`));
  assert.doesNotMatch(html, /data-d="90"/);
});

test('맵 필터는 마을·꿈의 숲·거울 마을 세 개', () => {
  assert.deepEqual(Object.keys(MAPS), ['main', 'dream', 'mirror']);
  const html = src('dashboards/admin_analytics.html');
  for (const m of Object.keys(MAPS)) assert.match(html, new RegExp(`data-map="${m}"`));
});
