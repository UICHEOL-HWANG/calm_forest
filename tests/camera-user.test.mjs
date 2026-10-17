// 🎥 플레이어 카메라(줌·기울기) — 순수 모델 + 제스처 배선
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_DIST, BASE_PITCH, PITCH_MAX, PITCH_MIN, STORE_KEY, ZOOM_MAX, ZOOM_MIN,
  autoPitch, camOffsetFor, classifyTwoFinger, defaultCam, effectivePitch, isDefaultCam, loadCam,
  normalizeCam, pitchFromDrag, saveCam, withTilt, withZoom, zoomFromPinch, zoomFromWheel,
} from '../js/camera-user.js';
import { readFileSync } from 'node:fs';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);

test('기본값은 예전 오프셋 (0,14,16) 그대로', () => {
  const o = camOffsetFor(defaultCam());
  assert.deepEqual(o, { x: 0, y: 14, z: 16 });
  near(BASE_PITCH, 41.1859, 1e-3);
  assert.ok(isDefaultCam(defaultCam()));
  // 기울기를 기본 피치로 "직접" 맞춘 것도 같은 숫자
  const o2 = camOffsetFor({ zoom: 1, tilt: BASE_PITCH });
  near(o2.y, 14); near(o2.z, 16);
});

test('거리 의미: zoom 은 거리 배수, 피치는 거리와 무관', () => {
  for (const zoom of [0.7, 1, 1.25, 1.5]) for (const tilt of [28, 41, 60]) {
    const o = camOffsetFor({ zoom, tilt });
    near(Math.hypot(o.y, o.z), BASE_DIST * zoom);
    near(Math.atan2(o.y, o.z) * 180 / Math.PI, tilt);
    assert.equal(o.x, 0);
  }
});

test('범위 밖 값은 잘린다', () => {
  assert.deepEqual(normalizeCam({ zoom: 9, tilt: 90 }), { zoom: ZOOM_MAX, tilt: PITCH_MAX });
  assert.deepEqual(normalizeCam({ zoom: 0.1, tilt: 3 }), { zoom: ZOOM_MIN, tilt: PITCH_MIN });
  assert.deepEqual(normalizeCam({ zoom: NaN, tilt: 'x' }), { zoom: 1, tilt: null });
  assert.deepEqual(normalizeCam(null), { zoom: 1, tilt: null });
});

test('자동 피치: 줌아웃할수록 살짝 눕고, 줌인은 그대로 — 기울기를 만지면 그 값이 이긴다', () => {
  near(autoPitch(1), BASE_PITCH);
  near(autoPitch(0.7), BASE_PITCH);
  assert.ok(autoPitch(1.5) < BASE_PITCH - 5);
  assert.ok(autoPitch(1.25) > autoPitch(1.5));
  const s = withTilt(withZoom(defaultCam(), 1.5), 55);
  near(effectivePitch(s), 55);
  near(effectivePitch(withZoom(s, 1.2)), 55);   // 줌을 바꿔도 손으로 정한 기울기 유지
});

test('핀치: 벌리면 가까이, 오므리면 멀리(범위 안)', () => {
  near(zoomFromPinch(1, 100, 200), ZOOM_MIN);   // 0.5 → 0.7 로 잘림
  near(zoomFromPinch(1, 100, 125), 0.8);
  near(zoomFromPinch(1, 200, 160), 1.25);
  near(zoomFromPinch(1.2, 0, 50), 1.2);
});

test('기울기 드래그: 위로 밀면 눕고 아래로 당기면 내려다본다', () => {
  assert.ok(pitchFromDrag(41, -100, 800) < 41);
  assert.ok(pitchFromDrag(41, 100, 800) > 41);
  near(pitchFromDrag(41, 10000, 800), PITCH_MAX);
  near(pitchFromDrag(41, -10000, 800), PITCH_MIN);
});

test('휠: 아래(+)로 굴리면 멀리', () => {
  assert.ok(zoomFromWheel(1, 100) > 1);
  assert.ok(zoomFromWheel(1, -100) < 1);
  near(zoomFromWheel(1.5, 100), ZOOM_MAX);
});

test('두 손가락 판정: 거리 변화=pinch · 같은 방향 세로=tilt · 작은 떨림=보류', () => {
  const a0 = { x: 100, y: 400 }, b0 = { x: 250, y: 400 };
  assert.equal(classifyTwoFinger(a0, b0, { x: 103, y: 402 }, { x: 248, y: 401 }), null);
  assert.equal(classifyTwoFinger(a0, b0, { x: 70, y: 400 }, { x: 280, y: 400 }), 'pinch');
  assert.equal(classifyTwoFinger(a0, b0, { x: 101, y: 360 }, { x: 251, y: 362 }), 'tilt');
  // 반대 방향 세로 = 핀치(세로로 벌리기)
  assert.equal(classifyTwoFinger({ x: 100, y: 400 }, { x: 110, y: 500 }, { x: 100, y: 360 }, { x: 110, y: 540 }), 'pinch');
});

test('저장: 기기 localStorage — 기본값이면 지우고, 깨진 값·예외는 기본값', () => {
  const mem = new Map();
  const st = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
  saveCam(st, { zoom: 1.234567, tilt: 50.123 });
  assert.deepEqual(loadCam(st), { zoom: 1.235, tilt: 50.12 });
  saveCam(st, defaultCam());
  assert.equal(mem.has(STORE_KEY), false);
  mem.set(STORE_KEY, '{bad');
  assert.deepEqual(loadCam(st), defaultCam());
  const boom = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('x'); } };
  assert.deepEqual(loadCam(boom), defaultCam());
  saveCam(boom, { zoom: 1.2, tilt: null });   // 던지지 않는다
  assert.deepEqual(loadCam(null), defaultCam());
});

// ── 제스처 배선(가짜 DOM) ─────────────────────────────────────
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

test('캔버스 두 손가락 핀치 → 줌, 손 떼면 1회 커밋', async () => {
  const { initCameraGestures } = await import('../js/camera-gestures.js');
  const env = fakeEnv();
  const h = initCameraGestures({ canvas: env.canvas, enabled: () => true, get: env.get, set: env.set, commit: env.commit });
  const t0 = performance.now();
  env.canvas.dispatchEvent(tev('touchstart', [touch(1, 150, 400)]));
  assert.equal(h.multiSince(t0), false);
  env.canvas.dispatchEvent(tev('touchstart', [touch(1, 150, 400), touch(2, 250, 400)]));
  assert.equal(h.multiSince(t0), true);   // 첫 손가락의 탭 행동은 무른다
  env.canvas.dispatchEvent(tev('touchmove', [touch(1, 130, 400), touch(2, 270, 400)]));   // 판정(핀치)
  env.canvas.dispatchEvent(tev('touchmove', [touch(1, 105, 400), touch(2, 280, 400)]));   // 140 → 175
  near(env.state().zoom, 0.8);
  env.canvas.dispatchEvent(tev('touchend', [touch(2, 280, 400)]));
  assert.equal(env.commits.length, 1);
  assert.equal(env.commits[0][1], 'pinch');
});

test('두 손가락 같은 방향 세로 드래그 → 기울기', async () => {
  const { initCameraGestures } = await import('../js/camera-gestures.js');
  const env = fakeEnv();
  initCameraGestures({ canvas: env.canvas, enabled: () => true, get: env.get, set: env.set, commit: env.commit });
  env.canvas.dispatchEvent(tev('touchstart', [touch(1, 150, 400), touch(2, 250, 400)]));
  env.canvas.dispatchEvent(tev('touchmove', [touch(1, 150, 420), touch(2, 250, 421)]));
  env.canvas.dispatchEvent(tev('touchmove', [touch(1, 150, 520), touch(2, 250, 521)]));
  assert.ok(env.state().tilt > BASE_PITCH + 5, `tilt ${env.state().tilt}`);
  near(env.state().zoom, 1);
  env.canvas.dispatchEvent(tev('touchcancel', []));
  assert.equal(env.commits[0][1], 'tilt');
});

test('조이스틱 손가락 + 캔버스 손가락 하나 = 카메라 제스처 아님', async () => {
  const { initCameraGestures } = await import('../js/camera-gestures.js');
  const env = fakeEnv();
  const h = initCameraGestures({ canvas: env.canvas, enabled: () => true, get: env.get, set: env.set, commit: env.commit });
  const t0 = performance.now();
  // 조이스틱 손가락은 #joy-base 가 target 이라 캔버스 targetTouches 에 안 들어온다
  env.canvas.dispatchEvent(tev('touchstart', [touch(2, 300, 300)]));
  env.canvas.dispatchEvent(tev('touchmove', [touch(2, 200, 500)]));
  env.canvas.dispatchEvent(tev('touchend', []));
  assert.deepEqual(env.state(), defaultCam());
  assert.equal(env.commits.length, 0);
  assert.equal(h.multiSince(t0), false);
});

test('비활성(실내·연출 중)이면 두 손가락도 무시', async () => {
  const { initCameraGestures } = await import('../js/camera-gestures.js');
  const env = fakeEnv();
  const h = initCameraGestures({ canvas: env.canvas, enabled: () => false, get: env.get, set: env.set, commit: env.commit });
  env.canvas.dispatchEvent(tev('touchstart', [touch(1, 150, 400), touch(2, 250, 400)]));
  env.canvas.dispatchEvent(tev('touchmove', [touch(1, 100, 400), touch(2, 300, 400)]));
  assert.deepEqual(env.state(), defaultCam());
  assert.equal(h.multiSince(0), false);
});

test('휠: 줌 / Shift+휠: 기울기, ctrl+휠(브라우저 확대)은 건드리지 않음', async () => {
  const { initCameraGestures } = await import('../js/camera-gestures.js');
  const env = fakeEnv();
  initCameraGestures({ canvas: env.canvas, enabled: () => true, get: env.get, set: env.set, commit: env.commit });
  const wheel = (o) => Object.assign(new Event('wheel', { cancelable: true }), { deltaX: 0, deltaY: 0, deltaMode: 0, shiftKey: false, ctrlKey: false }, o);
  env.canvas.dispatchEvent(wheel({ deltaY: 100 }));
  assert.ok(env.state().zoom > 1);
  const z = env.state().zoom;
  env.canvas.dispatchEvent(wheel({ deltaY: 100, ctrlKey: true }));
  near(env.state().zoom, z);
  env.canvas.dispatchEvent(wheel({ deltaX: 100, shiftKey: true }));
  assert.ok(env.state().tilt > effectivePitch({ zoom: z, tilt: null }));
});

test('game.js 배선: 기본 추적·snap 모두 플레이어 오프셋, 이벤트 줌은 그 위에 곱', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /camOffsetIndoor : followOffset\(\)\)\.multiplyScalar\(zoom\)/);
  assert.match(src, /camOffsetIndoor : followOffset\(\)\);/);   // snapCamera
  assert.match(src, /trackEvent\('camera_adjust'/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="cam-reset-btn"[^>]*hidden/);
});
