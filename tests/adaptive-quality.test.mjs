import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQualityGovernor, QUALITY_STEPS } from '../js/adaptive-quality.js';

function feed(gov, dtList, start = 1000) {
  let t = start;
  const steps = [];
  gov.frame(t);
  for (const dt of dtList) {
    t += dt;
    const lvl = gov.frame(t);
    if (lvl != null) steps.push(lvl);
  }
  return steps;
}

const repeat = (n, dt) => Array(n).fill(dt);

test('단계표는 해상도부터 내리고 그다음 블룸을 끈다', () => {
  assert.equal(QUALITY_STEPS.length, 3);
  assert.deepEqual(QUALITY_STEPS.map(s => s.bloom), [true, true, false]);
  assert.ok(QUALITY_STEPS[1].dpr < QUALITY_STEPS[0].dpr);
  assert.equal(QUALITY_STEPS[2].dpr, QUALITY_STEPS[1].dpr);
});

test('빠른 기기는 단계를 내리지 않는다', () => {
  const gov = createQualityGovernor({ windowMs: 1000 });
  assert.deepEqual(feed(gov, repeat(600, 1000 / 60)), []);
  assert.equal(gov.level(), 0);
});

test('계속 느리면 창마다 한 단계씩 최대 2단계까지 내린다', () => {
  const gov = createQualityGovernor({ windowMs: 1000 });
  assert.deepEqual(feed(gov, repeat(200, 50)), [1, 2]);
  assert.equal(gov.level(), 2);
});

test('한 번짜리 끊김(셰이더 컴파일)은 무시한다', () => {
  const gov = createQualityGovernor({ windowMs: 1000 });
  const dts = [...repeat(30, 1000 / 60), 400, ...repeat(200, 1000 / 60)];
  assert.deepEqual(feed(gov, dts), []);
});

test('하위 10% 프레임이 느리면 평균이 괜찮아도 내린다', () => {
  const gov = createQualityGovernor({ windowMs: 1000 });
  const dts = [];
  for (let i = 0; i < 120; i++) dts.push(i % 5 === 0 ? 60 : 1000 / 60);
  assert.deepEqual(feed(gov, dts).slice(0, 1), [1]);
});

test('1초 넘는 공백(백그라운드)은 창에 넣지 않는다', () => {
  const gov = createQualityGovernor({ windowMs: 1000 });
  const dts = [...repeat(30, 1000 / 60), 5000, ...repeat(40, 1000 / 60)];
  assert.deepEqual(feed(gov, dts), []);
});

test('시작 직후 워밍업 구간(셰이더 컴파일)은 판단에 넣지 않는다', () => {
  const gov = createQualityGovernor({ windowMs: 1000, warmupMs: 2000 });
  const dts = [...repeat(40, 50), ...repeat(120, 1000 / 60)];
  assert.deepEqual(feed(gov, dts), []);
});

test('워밍업 뒤에도 계속 느리면 내린다', () => {
  const gov = createQualityGovernor({ windowMs: 1000, warmupMs: 2000 });
  assert.deepEqual(feed(gov, repeat(80, 50)), [1, 2]);
});

test('최대 단계 뒤에는 더 내리지 않는다', () => {
  const gov = createQualityGovernor({ windowMs: 1000 });
  feed(gov, repeat(400, 80));
  assert.equal(gov.level(), 2);
});
