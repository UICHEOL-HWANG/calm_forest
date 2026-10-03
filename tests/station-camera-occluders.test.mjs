import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 🔥 가공 시설 클로즈업에서 폰 화면이 초록색으로 꽉 찼다(사용자 제보 2026-10-04, 토스·화덕 불 조절).
//    폰 세로는 카메라가 3.8×k(최대 6.65) 뒤로 물러나는데, 가리는 나무를 숨기는 범위는 5.0 고정이었다.
//    나무는 접속마다 무작위 14그루라 5~6.65 사이에 서는 날만 카메라 앞을 덮었다.
const src = readFileSync(new URL('../js/spaces/kitchen-stage.js', import.meta.url), 'utf8');
const fn = (name) => { const i = src.indexOf(`export function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };

test('숨기는 범위가 실제 카메라 거리(stationCamDist)를 따라간다 — 고정 5.0 아님', () => {
  const b = fn('hideKilnOccluders');
  assert.doesNotMatch(b, /const camZ = rec\.z \+ 5\.0/);
  assert.match(b, /const camZ = rec\.z \+ stationCamDist \+ OCCLUDER_MARGIN/);
});

test('카메라를 먼저 잡고 나서 가리는 것을 숨긴다(거리가 정해진 뒤에 범위를 쓴다)', () => {
  const b = fn('craftFocus');
  assert.ok(b.indexOf('applyStationCamera(nearStation)') < b.indexOf('hideKilnOccluders(nearStation, true)'));
});

test('여유분은 나무 갓 반경 이상', () => {
  const m = src.match(/const OCCLUDER_MARGIN = ([\d.]+)/);
  assert.ok(m && Number(m[1]) >= 1.5);
});
