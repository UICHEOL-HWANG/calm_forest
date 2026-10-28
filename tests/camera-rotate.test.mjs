import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STORE_KEY, camOffsetFor, classifyTwoFinger, defaultCam, isDefaultCam, loadCam, moveToWorld, normalizeCam,
  saveCam, withYaw, withZoom, withTilt, yawFromTwist,
} from '../js/camera-user.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);

test('yaw 0 은 예전 오프셋 그대로, 회전해도 거리·높이는 그대로', () => {
  assert.deepEqual(camOffsetFor(defaultCam()), { x: 0, y: 14, z: 16 });
  for (const yaw of [-135, -45, 30, 90, 180]) {
    const o = camOffsetFor({ zoom: 1, tilt: null, yaw });
    near(o.y, 14);
    near(Math.hypot(o.x, o.z), 16);
    near(Math.atan2(o.x, o.z) * 180 / Math.PI, yaw);
  }
});

test('yaw 는 -180~180 으로 접히고, 회전했으면 기본 시점이 아니다', () => {
  assert.equal(normalizeCam({ zoom: 1, tilt: null, yaw: 190 }).yaw, -170);
  assert.equal(normalizeCam({ zoom: 1, tilt: null, yaw: -540 }).yaw, 180);
  assert.equal(normalizeCam({ zoom: 1, yaw: 'x' }).yaw, 0);
  assert.equal(isDefaultCam({ zoom: 1, tilt: null, yaw: 0 }), true);
  assert.equal(isDefaultCam({ zoom: 1, tilt: null, yaw: 12 }), false);
  assert.equal(withYaw({ zoom: 1.2, tilt: 50, yaw: 0 }, 400).yaw, 40);
  assert.equal(withZoom({ zoom: 1, tilt: null, yaw: 30 }, 1.3).yaw, 30, '줌은 회전을 유지');
  assert.equal(withTilt({ zoom: 1, tilt: null, yaw: 30 }, 50).yaw, 30, '기울기도 회전을 유지');
});

test('저장·불러오기에 yaw 포함', () => {
  const mem = new Map();
  const st = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
  saveCam(st, { zoom: 1, tilt: null, yaw: 45.678 });
  assert.equal(mem.has(STORE_KEY), true);
  assert.deepEqual(loadCam(st), { zoom: 1, tilt: null, yaw: 45.7 });
  mem.set(STORE_KEY, JSON.stringify({ zoom: 1.2, tilt: 50 }));
  assert.equal(loadCam(st).yaw, 0, '예전 저장값(yaw 없음)은 0');
});

test('이동 방향: 조이스틱 위 = 화면 위쪽(카메라가 보는 쪽)', () => {
  let w = moveToWorld(0, -1, 0); near(w.x, 0); near(w.z, -1);
  w = moveToWorld(0, -1, 90); near(w.x, -1); near(w.z, 0);
  for (const yaw of [-120, -30, 45, 170]) {
    const o = camOffsetFor({ zoom: 1, tilt: null, yaw });
    const len = Math.hypot(o.x, o.z);
    const look = { x: -o.x / len, z: -o.z / len };
    const m = moveToWorld(0, -1, yaw);
    near(m.x, look.x); near(m.z, look.z);
    const r = moveToWorld(1, 0, yaw);
    near(r.x * look.x + r.z * look.z, 0);
  }
});

test('두 손가락 비틀기 판정: 거리는 그대로·각도만 변하면 rotate', () => {
  const a0 = { x: 150, y: 400 }, b0 = { x: 250, y: 400 };
  assert.equal(classifyTwoFinger(a0, b0, { x: 154, y: 380 }, { x: 246, y: 420 }), 'rotate');
  assert.equal(classifyTwoFinger(a0, b0, { x: 151, y: 401 }, { x: 249, y: 402 }), null);
  assert.equal(classifyTwoFinger(a0, b0, { x: 120, y: 400 }, { x: 280, y: 400 }), 'pinch');
  assert.equal(classifyTwoFinger(a0, b0, { x: 150, y: 360 }, { x: 250, y: 361 }), 'tilt');
});

test('비틀기 → yaw: 손가락을 시계 방향으로 돌리면 장면도 시계 방향(yaw +)', () => {
  near(yawFromTwist(0, 0, 30), 30);
  near(yawFromTwist(170, 0, 30), -160);
  near(yawFromTwist(0, 170, -170), 20);
});

function fakeEnv() {
  globalThis.window = Object.assign(new EventTarget(), { innerHeight: 800 });
  const canvas = new EventTarget();
  canvas.setPointerCapture = () => {};
  let state = defaultCam();
  const commits = [];
  return { canvas, get: () => state, set: (s) => { state = s; }, commits, commit: (s, how) => commits.push([s, how]), state: () => state };
}
const touch = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });
const tev = (type, targetTouches) => Object.assign(new Event(type), { targetTouches });

test('캔버스 두 손가락 비틀기 → yaw, 손 떼면 rotate 로 1회 커밋', async () => {
  const { initCameraGestures } = await import('../js/camera-gestures.js');
  const env = fakeEnv();
  initCameraGestures({ canvas: env.canvas, enabled: () => true, get: env.get, set: env.set, commit: env.commit });
  const c = Math.cos(Math.PI / 4) * 50, s = Math.sin(Math.PI / 4) * 50;
  env.canvas.dispatchEvent(tev('touchstart', [touch(1, 150, 400), touch(2, 250, 400)]));
  env.canvas.dispatchEvent(tev('touchmove', [touch(1, 153, 383), touch(2, 247, 417)]));
  env.canvas.dispatchEvent(tev('touchmove', [touch(1, 200 - c, 400 - s), touch(2, 200 + c, 400 + s)]));
  assert.ok(env.state().yaw > 20 && env.state().yaw < 45, `yaw ${env.state().yaw}`);
  near(env.state().zoom, 1);
  env.canvas.dispatchEvent(tev('touchend', []));
  assert.equal(env.commits.length, 1);
  assert.equal(env.commits[0][1], 'rotate');
});

test('PC: Q 는 왼쪽(yaw +), E 는 오른쪽(yaw -)', async () => {
  const { initCameraGestures } = await import('../js/camera-gestures.js');
  const env = fakeEnv();
  initCameraGestures({ canvas: env.canvas, enabled: () => true, get: env.get, set: env.set, commit: env.commit });
  const key = (code) => Object.assign(new Event('keydown'), { code, preventDefault() {} });
  window.dispatchEvent(key('KeyQ'));
  assert.ok(env.state().yaw > 0);
  window.dispatchEvent(key('KeyE')); window.dispatchEvent(key('KeyE'));
  assert.ok(env.state().yaw < 0);
});

test('게임 배선: 이동 회전·튜토리얼 신호·미니맵 시야·되돌리기 버튼·투어', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /moveToWorld\(mx, mz, camUser\.yaw\)/);
  assert.match(src, /ui\.act\?\.\('camrotate'\)/);
  assert.match(src, /camYaw: userCamOn\(\) \? camUser\.yaw : 0/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="cam-reset-btn"[^>]*hidden>🧭</);
  assert.match(html, /if \(d\.camYaw\)/);
  assert.match(html, /camTour\(\)/);
  const steps = readFileSync(new URL('../js/onboarding/spot-steps.js', import.meta.url), 'utf8');
  assert.match(steps, /key: 'cam'.*hand: 'twist'.*done: 'act:camrotate'/);
  assert.match(steps, /key: 'cam'.*keys: \['Q', 'E'\].*done: 'act:camrotate'/);
  const spot = readFileSync(new URL('../js/hud/spotlight.js', import.meta.url), 'utf8');
  assert.match(spot, /data-h="twist"/);
  const shell = readFileSync(new URL('../js/hud/hud-shell.js', import.meta.url), 'utf8');
  assert.match(shell, /cam-reset-btn/);
});

test('투어 단계 목록: 새 유저 full 과 기존 유저 cam 투어 모두 회전 단계를 가진다', async () => {
  const { spotSteps } = await import('../js/onboarding/spot-steps.js');
  for (const touch of [true, false]) {
    assert.ok(spotSteps('full', touch).some(s => s.key === 'cam' && !s.core));
    assert.ok(spotSteps('cam', touch).some(s => s.key === 'cam' && s.done === 'act:camrotate'));
  }
  assert.equal(spotSteps('cam', false).length, 1);
  assert.equal(spotSteps('cam', true).length, 3);
  assert.equal(spotSteps('cam', true)[0].target, '#cam-spot-zone');
});
