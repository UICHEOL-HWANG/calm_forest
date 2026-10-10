import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { twoProp, welch, srm, mdeProp, analyzeExperiment } from '../dashboards/js/admin-metrics.js';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const close = (a, b, eps = 0.05) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('두 비율 차이(처치 − 대조, %p)와 Wald 95% CI, 합동 z 검정 p', () => {
  const r = twoProp(41, 212, 36, 205);
  close(r.d, 1.78); close(r.lo, -5.70, 0.1); close(r.hi, 9.25, 0.1); close(r.p, 0.64, 0.02);
});

test('평균 차이는 Welch — 표본이 작으면 t 분위수로 구간이 넓어진다', () => {
  const r = welch({ n: 5, mean: 19, sd: 1 }, { n: 5, mean: 15, sd: 8.276 });
  close(r.d, 4);
  assert.ok(r.hi - r.lo > 2 * 1.96 * Math.sqrt(1 / 5 + 8.276 ** 2 / 5));   // z 보다 넓다
  assert.ok(r.p > 0.3 && r.p < 0.5);
});

test('SRM: 50:50 에서 212/205 는 정상, 300/200 은 어긋남', () => {
  assert.ok(srm([212, 205], [0.5, 0.5]) > 0.5);
  assert.ok(srm([300, 200], [0.5, 0.5]) < 0.01);
  assert.ok(srm([37, 39, 40], [1 / 3, 1 / 3, 1 / 3]) > 0.5);
});

test('검출 가능 최소 효과(80% 검출력, 양측 5%)는 팔당 표본이 4배면 절반', () => {
  close(mdeProp(0.2, 100) / mdeProp(0.2, 400), 2, 0.01);
});

const base = { kind: 'ab', status: 'run', need: null, decide_after: null, confound: null };
const prop = (t, c) => ({ type: 'prop', compare: ['t', 'c'], arms: [{ key: 't', n: t[0], x: t[1] }, { key: 'c', n: c[0], x: c[1] }] });

test('판정 순서: 무작위 아님 → 교란 → SRM → 관측 창 → 표본 → 유의', () => {
  const today = '2026-10-11';
  const v = (e) => analyzeExperiment(e, today).verdict[1];
  assert.equal(v({ ...base, kind: 'policy', result: prop([30, 21], [10, 9]) }), '인과 판정 안 함');
  assert.equal(v({ ...base, kind: 'ext', confound: '플랫폼', result: prop([1840, 23], [620, 9]) }), '교란 주의');
  assert.equal(v({ ...base, result: prop([300, 150], [200, 60]) }), '배정 어긋남 · 판정 보류');
  assert.equal(v({ ...base, decide_after: '2026-10-14', result: prop([57, 33], [66, 39]) }), '관측 대기 · 10/14');
  assert.equal(v({ ...base, need: 450, result: prop([40, 22], [39, 29]) }), '표본 모으는 중');
  assert.equal(v({ ...base, result: prop([500, 300], [500, 200]) }), '효과 있음 ▲');
  assert.equal(v({ ...base, result: prop([200, 40], [200, 42]) }), '판정 불가');
  assert.equal(v({ ...base, status: 'plan', result: null }), '시작 전');
  assert.equal(v({ ...base, kind: 'ext', result: null }), '결과 입력 전');
});

test('사전등록 공식 검정이 있으면 그 p·CI 로 판정한다', () => {
  const e = { ...base, result: { ...prop([200, 40], [200, 42]), official: { d: 9, lo: 1, hi: 17, p: 0.01, complete: true } } };
  const a = analyzeExperiment(e, '2026-10-20');
  assert.equal(a.verdict[1], '효과 있음 ▲');
  assert.equal(a.lo, 1);
});

test('실험 페이지는 v2 RPC 를 부르고 허브에서 열린다', () => {
  assert.match(src('dashboards/js/admin-experiments.js'), /cf_admin_experiments/);
  assert.match(src('dashboards/index.html'), /href="experiments.html"/);
});

test('공식 검정이 관측 진행 중(complete=false)이면 날짜가 지나도 판정하지 않는다', () => {
  const e = { kind: 'ab', status: 'obs', need: null, decide_after: '2026-10-14', confound: null,
    result: { type: 'prop', compare: ['t', 'c'], arms: [{ key: 't', n: 200, x: 90 }, { key: 'c', n: 200, x: 40 }],
      official: { d: 25, lo: 15, hi: 35, p: 0.0001, complete: false } } };
  assert.equal(analyzeExperiment(e, '2026-10-20').verdict[1], '관측 대기 · 데이터 도착 전');
});
