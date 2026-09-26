import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idle, hop, recoil, pump, pop, zoomPunch, flee, shake, decayTrauma,
         IDLE_PERIOD, HOP_H, RECOIL_MAX, SHAKE_MAX, ZOOM_IN } from '../js/duel/motion.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const samples = (fn, n = 200) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

// 🎬 대결 연출 곡선 — 숫자 범위가 곧 "화면에서 튀지 않는다"는 약속이다(폰 375×812 에서 안 잘릴 것)
test('숨쉬기: 주기적이고, 위로만 살짝 뜬다', () => {
  for (const t of [0, 0.3, 1.1, 2.7]) {
    const a = idle(t, 0.4), b = idle(t + IDLE_PERIOD, 0.4);
    assert.ok(near(a.dy, b.dy) && near(a.sy, b.sy), '한 주기 뒤 같은 자세');
    assert.ok(a.dy >= 0 && a.dy <= 0.05, `dy ${a.dy} 는 0~0.05`);
    assert.ok(a.sy > 0.95 && a.sy < 1.05 && a.sx > 0.95 && a.sx < 1.05, '찌그러짐은 5% 이내');
  }
});

test('숨쉬기: 위상이 다르면 둘이 같이 움직이지 않는다', () => {
  assert.ok(!near(idle(0.5, 0).dy, idle(0.5, 0.5).dy, 1e-3));
});

test('폴짝: 땅에서 시작해 땅으로 끝나고 꼭대기는 HOP_H', () => {
  assert.ok(near(hop(0).dy, 0) && near(hop(1).dy, 0));
  assert.ok(near(hop(0.5).dy, HOP_H, 1e-9));
  for (const h of samples(hop)) assert.ok(h.dy >= 0 && h.dy <= HOP_H + 1e-9);
});

test('폴짝: 떠오르기 직전·착지 순간에 눌리고(sy<1) 공중에선 늘어난다(sy>1)', () => {
  assert.ok(hop(0.02).sy < 1);
  assert.ok(hop(0.98).sy < 1);
  assert.ok(hop(0.5).sy > 1);
});

test('움찔: 빨리 밀렸다가 제자리로 돌아온다', () => {
  assert.ok(near(recoil(0), 0) && near(recoil(1), 0, 1e-9));
  const peakAt = samples(recoil).indexOf(Math.max(...samples(recoil))) / 200;
  assert.ok(peakAt <= 0.3, `가장 멀리 밀리는 때(${peakAt})는 앞쪽 30% 안 — 맞는 느낌은 빨라야 한다`);
  assert.ok(Math.max(...samples(recoil)) <= RECOIL_MAX + 1e-9);
});

test('주먹 흔들기: 정확히 세 번 튀고 땅에서 끝난다', () => {
  const ys = samples(pump, 600);
  assert.ok(near(ys[0], 0) && near(ys.at(-1), 0, 1e-9));
  let peaks = 0;
  for (let i = 1; i < ys.length - 1; i++) if (ys[i] > ys[i - 1] && ys[i] >= ys[i + 1] && ys[i] > 0.01) peaks++;
  assert.equal(peaks, 3, '가위·바위·보 세 박자');
});

test('손 팝: 0 에서 커지며 한 번 넘쳤다가 1 에 선다', () => {
  assert.ok(near(pop(0), 0) && near(pop(1), 1, 1e-9));
  assert.ok(Math.max(...samples(pop)) > 1.05, '오버슈트가 있어야 톡 튄다');
  assert.ok(Math.max(...samples(pop)) < 1.4, '과하면 화면을 덮는다');
});

test('줌 펀치: 들어갔다 제자리로 — 폰에서 잘리지 않게 거리 8% 이내', () => {
  assert.ok(near(zoomPunch(0), 1) && near(zoomPunch(1), 1, 1e-9));
  const min = Math.min(...samples(zoomPunch));
  assert.ok(min < 1 && min >= 1 - 0.08 - 1e-9, `최소 배율 ${min}`);
  assert.ok(ZOOM_IN > 0.9 && ZOOM_IN < 1, '판 시작 줌인도 8% 이내');
});

test('도망: 먼저 돌아서고, 그다음 점점 빨리 멀어진다', () => {
  assert.ok(near(flee(0).turn, 0) && near(flee(1).turn, Math.PI, 1e-9));
  assert.ok(near(flee(0.25).turn, Math.PI, 1e-9), '앞 25% 안에 다 돈다');
  assert.ok(near(flee(0.25).dist, 0), '돌기 전엔 제자리');
  const d = samples(u => flee(u).dist);
  for (let i = 1; i < d.length; i++) assert.ok(d[i] >= d[i - 1], '뒤로 가지 않는다');
  assert.ok(flee(1).dist >= 4, '화면 밖으로 충분히');
});

test('흔들림: 트라우마 0 이면 안 흔들리고, 최대치를 넘지 않는다', () => {
  assert.deepEqual(shake(0, 1.23), { x: 0, y: 0 });
  for (let t = 0; t < 3; t += 0.07) {
    const s = shake(1, t);
    assert.ok(Math.abs(s.x) <= SHAKE_MAX + 1e-9 && Math.abs(s.y) <= SHAKE_MAX + 1e-9);
  }
  assert.ok(Math.abs(shake(0.5, 0.4).x) < Math.abs(shake(1, 0.4).x) + 1e-9, '약하면 덜 흔들린다');
});

test('트라우마는 시간이 지나면 0 으로 가라앉고 음수가 되지 않는다', () => {
  assert.ok(decayTrauma(1, 0.1) < 1);
  assert.equal(decayTrauma(0.05, 1), 0);
  assert.equal(decayTrauma(0, 0.5), 0);
});
