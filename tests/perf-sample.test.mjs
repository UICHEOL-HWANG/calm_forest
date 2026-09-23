// 📱 FPS 샘플러 — js/perf-sample.js (구글 플레이 앱 기기별 성능 수집)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPerfSampler } from '../js/perf-sample.js';

// dtList 간격으로 frame() 을 부르고 처음 나온 요약을 돌려준다
function run(sampler, dtList, start = 1000) {
  let t = start, out = null;
  sampler.frame(t);                       // 첫 호출은 기준점
  for (const dt of dtList) {
    t += dt;
    const s = sampler.frame(t);
    if (s && !out) out = s;
  }
  return out;
}

test('60fps 로 샘플 시간을 채우면 요약 1회', () => {
  const s = run(createPerfSampler({ sampleMs: 1000 }), Array(70).fill(1000 / 60));
  assert.ok(s);
  assert.equal(s.fps_avg, 60);
  assert.equal(s.fps_p10, 60);
  assert.equal(s.long_frame_pct, 0);
  assert.equal(s.sample_sec, 1);
});

test('샘플 시간 전에는 null, 요약 뒤에는 다시 안 보낸다', () => {
  const sampler = createPerfSampler({ sampleMs: 1000 });
  assert.equal(run(sampler, Array(30).fill(1000 / 60)), null);
  let count = 0, t = 5000;
  for (let i = 0; i < 200; i++) { t += 1000 / 60; if (sampler.frame(t)) count++; }
  assert.equal(count, 1);
});

test('느린 프레임 10% 가 p10 과 long_frame_pct 에 드러난다', () => {
  // 90% 는 16.7ms, 10% 는 100ms(10fps)
  const dts = [];
  for (let i = 0; i < 200; i++) dts.push(i % 10 === 0 ? 100 : 1000 / 60);
  const s = run(createPerfSampler({ sampleMs: 3000 }), dts);
  assert.ok(s);
  assert.ok(s.fps_avg < 60 && s.fps_avg > 30, `avg ${s.fps_avg}`);
  assert.equal(s.fps_p10, 10);
  assert.equal(s.long_frame_pct, 10);
});

test('1초 넘는 간격(백그라운드·일시정지)은 측정에서 뺀다', () => {
  const dts = [...Array(30).fill(1000 / 60), 5000, ...Array(40).fill(1000 / 60)];
  const s = run(createPerfSampler({ sampleMs: 1000 }), dts);
  assert.ok(s);
  assert.equal(s.fps_avg, 60);   // 5초 공백이 섞였다면 평균이 크게 떨어졌을 것
});
