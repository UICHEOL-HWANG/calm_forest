import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushSample, getWindow, resetWindow } from '../js/window-buffer.js';
import { WINDOW_SIZE } from '../js/features.js';

const s = (i) => ({ char_x: i, char_z: 0, cam_yaw: 0, mouse_x: 0, mouse_y: 0 });

test('윈도는 최근 WINDOW_SIZE 개만 시간 오름차순으로 준다', () => {
  resetWindow();
  for (let i = 0; i < 25; i++) pushSample(s(i));
  const w = getWindow();
  assert.equal(w.length, WINDOW_SIZE);
  assert.equal(w[0].char_x, 15, '가장 오래된 것이 앞');
  assert.equal(w[w.length - 1].char_x, 24, '가장 최근이 뒤');
});

test('샘플이 모자라면 있는 만큼만 준다', () => {
  resetWindow();
  for (let i = 0; i < 3; i++) pushSample(s(i));
  assert.equal(getWindow().length, 3);
});

test('반환값을 고쳐도 내부 상태가 오염되지 않는다', () => {
  resetWindow();
  for (let i = 0; i < 12; i++) pushSample(s(i));
  getWindow()[0].char_x = 999;
  assert.notEqual(getWindow()[0].char_x, 999);
});

test('resetWindow 는 세션 사이에 비운다', () => {
  resetWindow();
  for (let i = 0; i < 12; i++) pushSample(s(i));
  resetWindow();
  assert.deepEqual(getWindow(), []);
});

test('브라우저 전역(window·document)을 참조하지 않는다', () => {
  // Node 에서 import 가 성공한 것 자체가 증거. logger.js 는 최상위에서
  // window.addEventListener 를 호출하므로 링 버퍼를 여기로 분리했다.
  assert.equal(typeof pushSample, 'function');
});
