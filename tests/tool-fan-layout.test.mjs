import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fanLayout, clampFan, pickSlot, stepTool, swipeDir, FAN } from '../js/hud/fan-layout.js';

const ctr = { cx: 300, cy: 600 };

test('안쪽 줄·바깥 줄이 각자 반지름 위에, 왼쪽 위 부채꼴로 놓인다', () => {
  const pts = fanLayout({ ...ctr, inner: 5, outer: 5 });
  assert.equal(pts.length, 10);
  pts.slice(0, 5).forEach(p => assert.ok(Math.abs(Math.hypot(p.x - 300, p.y - 600) - FAN.rIn) < 0.01));
  pts.slice(5).forEach(p => assert.ok(Math.abs(Math.hypot(p.x - 300, p.y - 600) - FAN.rOut) < 0.01));
  pts.forEach(p => assert.ok(p.y < 600 + FAN.rOut * 0.4, '아래로 크게 내려가지 않는다'));
  assert.ok(pts.some(p => p.x < 300 - FAN.rIn * 0.9), '왼쪽으로 펼쳐진다');
});

test('같은 줄 칸끼리 겹치지 않는다(칸 지름보다 멀리)', () => {
  const pts = fanLayout({ ...ctr, inner: 5, outer: 5 });
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    assert.ok(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) > FAN.slot + 4, `${i}-${j}`);
  }
});

test('화면 밖으로 나가는 부채꼴은 통째로 밀어 넣는다', () => {
  const pts = fanLayout({ cx: 340, cy: 120, inner: 5, outer: 5 });
  const box = { w: 375, h: 290, pad: 30, top: 10 };
  const fit = clampFan(pts, box);
  fit.forEach(p => {
    assert.ok(p.x >= box.pad && p.x <= box.w - box.pad);
    assert.ok(p.y >= box.top + box.pad && p.y <= box.h - box.pad);
  });
  const dx = fit[0].x - pts[0].x, dy = fit[0].y - pts[0].y;
  fit.forEach((p, i) => { assert.ok(Math.abs(p.x - pts[i].x - dx) < 0.01); assert.ok(Math.abs(p.y - pts[i].y - dy) < 0.01); });
});

test('손가락이 닿은 칸을 고른다 — 멀면 -1', () => {
  const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  assert.equal(pickSlot(pts, 90, 5), 1);
  assert.equal(pickSlot(pts, 50, 200), -1);
});

test('좌우로 밀면 옆 도구로 한 칸씩, 끝에서 돌아온다', () => {
  const order = [3, 1, 4];
  assert.equal(stepTool(order, 1, 1), 4);
  assert.equal(stepTool(order, 4, 1), 3);
  assert.equal(stepTool(order, 3, -1), 4);
  assert.equal(stepTool(order, 9, 1), 3);
});

test('짧게 움직이면 밀기가 아니고, 가로로 충분히 밀어야 방향이 나온다', () => {
  assert.equal(swipeDir(10, 2), 0);
  assert.equal(swipeDir(FAN.swipe + 1, 3), 1);
  assert.equal(swipeDir(-FAN.swipe - 1, 3), -1);
  assert.equal(swipeDir(FAN.swipe + 1, FAN.swipe * 2), 0);
});
