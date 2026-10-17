import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holeRect, bars, bubblePos, inHole } from '../js/hud/spot-geom.js';

const VW = 390, VH = 844;

test('구멍은 대상보다 여백만큼 크고 화면 안으로 잘린다', () => {
  assert.deepEqual(holeRect({ left: 100, top: 200, right: 160, bottom: 260 }, 8, VW, VH), { l: 92, t: 192, r: 168, b: 268 });
  assert.deepEqual(holeRect({ left: -5, top: -5, right: 30, bottom: 30 }, 8, VW, VH), { l: 0, t: 0, r: 38, b: 38 });
  assert.deepEqual(holeRect({ left: 370, top: 820, right: 400, bottom: 860 }, 8, VW, VH), { l: 362, t: 812, r: VW, b: VH });
});

test('어둠 막대 4장이 구멍만 비우고 화면을 빈틈없이 덮는다', () => {
  const h = { l: 100, t: 200, r: 160, b: 260 };
  const [top, bottom, left, right] = bars(h, VW, VH);
  assert.deepEqual(top, { l: 0, t: 0, w: VW, h: 200 });
  assert.deepEqual(bottom, { l: 0, t: 260, w: VW, h: VH - 260 });
  assert.deepEqual(left, { l: 0, t: 200, w: 100, h: 60 });
  assert.deepEqual(right, { l: 160, t: 200, w: VW - 160, h: 60 });
  const area = [top, bottom, left, right].reduce((s, r) => s + r.w * r.h, 0) + 60 * 60;
  assert.equal(area, VW * VH);
});

test('말풍선은 위에 자리가 있으면 위, 없으면 아래, 좌우는 화면 안', () => {
  const low = bubblePos({ l: 200, t: 640, r: 260, b: 700 }, 180, 40, VW, VH, 12);
  assert.equal(low.side, 'above');
  assert.ok(low.y + 40 <= 640 - 12 + 0.01);
  const high = bubblePos({ l: 330, t: 10, r: 380, b: 60 }, 180, 40, VW, VH, 12);
  assert.equal(high.side, 'below');
  assert.ok(high.y >= 60 + 12 - 0.01);
  assert.ok(high.x + 180 <= VW - 12 + 0.01);
  assert.ok(high.x >= 12);
});

test('구멍 안 클릭 판정', () => {
  const h = { l: 10, t: 10, r: 50, b: 50 };
  assert.equal(inHole(h, 30, 30), true);
  assert.equal(inHole(h, 60, 30), false);
});
