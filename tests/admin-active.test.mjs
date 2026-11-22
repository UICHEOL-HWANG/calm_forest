import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activeKpis, activeDailyRows } from '../dashboards/js/admin-metrics.js';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const iso = (i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
const series = (n, f) => Array.from({ length: n }, (_, i) => ({ d: iso(i), ...f(i) }));

test('활성 유저 지표는 오늘(진행 중)을 빼고 어제까지로 센다', () => {
  const s = series(70, (i) => ({ dau: i === 69 ? 999 : 10, wau: 40 + i, mau: 100 + i, new: 2 }));
  const k = activeKpis(s, iso(69));
  assert.equal(k.day, iso(68));
  close(k.dau, 10);
  assert.equal(k.wau, 108);
  assert.equal(k.wauPrev, 101);
  assert.equal(k.mau, 168);
  assert.equal(k.mauPrev, 138);
});

test('DAU 는 최근 7일 평균, 직전 7일과 비교한다', () => {
  const s = series(30, (i) => ({ dau: i >= 22 && i <= 28 ? 14 : 7, wau: 50, mau: 200, new: 0 }));
  const k = activeKpis(s, iso(29));
  close(k.dau, 14);
  close(k.dauPrev, 7);
});

test('고착도 = 30일 평균 DAU ÷ MAU, 이력이 60일 안 되면 직전 값은 없다', () => {
  const s = series(40, () => ({ dau: 20, wau: 80, mau: 400, new: 1 }));
  const k = activeKpis(s, iso(40));
  close(k.stick, 5);
  assert.equal(k.stickPrev, null);
  const long = activeKpis(series(70, () => ({ dau: 20, wau: 80, mau: 400, new: 1 })), iso(70));
  close(long.stickPrev, 5);
});

test('완결된 날이 없으면 지표는 null', () => {
  assert.equal(activeKpis([{ d: iso(0), dau: 3, wau: 3, mau: 3, new: 3 }], iso(0)), null);
  assert.equal(activeKpis([], iso(0)), null);
});

test('일별 표는 최근 k일을 최신순으로, 기존 = DAU − 신규', () => {
  const s = series(10, (i) => ({ dau: 10 + i, wau: 30, mau: 50, new: i }));
  const rows = activeDailyRows(s, iso(9), 3);
  assert.deepEqual(rows.map((r) => r.d), [iso(8), iso(7), iso(6)]);
  assert.equal(rows[0].ret, 10);
  close(rows[0].stick, 36);
  assert.equal(activeDailyRows(series(2, () => ({ dau: 1, wau: 1, mau: 0, new: 0 })), iso(2), 5)[0].stick, null);
});

test('활성 유저 창은 cf_admin_active 를 부르고 30·60·90일 버튼을 쓴다', () => {
  assert.match(src('dashboards/js/admin-active.js'), /cf_admin_active/);
  const html = src('dashboards/active.html');
  for (const d of [30, 60, 90]) assert.match(html, new RegExp(`data-d="${d}"`));
  const sql = src('sql/analytics/admin_active.sql');
  assert.match(sql, /cf_is_admin\(\)/);
  assert.match(sql, /not persona/);
  assert.match(src('dashboards/index.html'), /href="active.html"/);
});
