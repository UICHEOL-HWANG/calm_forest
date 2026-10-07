// tests/halloween-art.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { HALLOWEEN_INDOOR_IDS, HALLOWEEN_OUTDOOR_IDS, HALLOWEEN_STYLES, HALLOWEEN_STYLE, makeCtx, buildHalloween } from '../js/spaces/halloween-art.js';

const ids = [...HALLOWEEN_INDOOR_IDS, ...HALLOWEEN_OUTDOOR_IDS];
// 배율 전 최대 폭·깊이·높이 — 카탈로그의 foot/h 와 같은 규격(야외 울타리는 기존 울타리 한 마디 1.2 폭 기준)
const LIMIT = {
  ghostCandle: { w: 0.3, d: 0.3, h: 0.5 }, miniGrave: { w: 0.5, d: 0.3, h: 0.6 }, witchCauldron: { w: 1.0, d: 1.0, h: 1.2 },
  ghostlamp: { w: 0.7, d: 0.7, h: 2.0 }, gravefence: { w: 1.25, d: 0.3, h: 0.75 }, webarch: { w: 2.6, d: 0.5, h: 2.6 },
};

test('6종이 모두 있고 승인 기본안이 목록 안에 있다', () => {
  assert.equal(ids.length, 6);
  ids.forEach(id => assert.ok(HALLOWEEN_STYLES[id].includes(HALLOWEEN_STYLE[id]), id));
});

test('승인 스타일만 남는다', () => {
  assert.deepEqual(HALLOWEEN_STYLE, { ghostCandle: 'ghost', miniGrave: 'gable', witchCauldron: 'bubble', ghostlamp: 'lantern', gravefence: 'iron', webarch: 'tree' });
  ids.forEach(id => assert.deepEqual(HALLOWEEN_STYLES[id], [HALLOWEEN_STYLE[id]], id));
});

test('알 수 없는 id·style 은 조용히 넘어가지 않고 throw', () => {
  assert.throws(() => buildHalloween(THREE, 'nope', 'x', makeCtx(THREE)), /Unknown halloween model id\/style/);
  assert.throws(() => buildHalloween(THREE, 'ghostlamp', 'sheet', makeCtx(THREE)), /Unknown halloween model id\/style/);
  assert.throws(() => buildHalloween(THREE, 'ghostCandle', 'jar', makeCtx(THREE)), /Unknown halloween model id\/style/);
});

test('ghostlamp 은 night 재질을 onNight 로 넘기고 0 으로 시작, 실내 3종은 부르지 않는다', () => {
  const got = [];
  buildHalloween(THREE, 'ghostlamp', HALLOWEEN_STYLE.ghostlamp, makeCtx(THREE, m => got.push(m)));
  assert.ok(got.length >= 1, 'night 재질 없음');
  got.forEach(m => assert.equal(m.emissiveIntensity, 0));
  for (const id of HALLOWEEN_INDOOR_IDS) {
    let calls = 0;
    buildHalloween(THREE, id, HALLOWEEN_STYLE[id], makeCtx(THREE, () => { calls++; }));
    assert.equal(calls, 0, id);
  }
});

for (const id of ids) for (const style of HALLOWEEN_STYLES[id]) {
  test(`${id}/${style}: 메시 ≤3 · 크기 제약`, () => {
    const g = buildHalloween(THREE, id, style, makeCtx(THREE));
    const meshes = []; g.traverse(o => o.isMesh && meshes.push(o));
    assert.ok(meshes.length >= 1 && meshes.length <= 3, `메시 ${meshes.length}개`);
    const box = new THREE.Box3().setFromObject(g), L = LIMIT[id];
    assert.ok(box.min.y > -0.02, '바닥 아래로 파고들지 않는다');
    const EPS = 1e-3;   // Float32 정점이라 경계값이 1.2500001 처럼 나온다
    assert.ok(box.max.y <= L.h + EPS, `높이 ${box.max.y.toFixed(3)} > ${L.h}`);
    assert.ok(box.max.x - box.min.x <= L.w + EPS, `가로 ${(box.max.x - box.min.x).toFixed(3)} > ${L.w}`);
    assert.ok(box.max.z - box.min.z <= L.d + EPS, `세로 ${(box.max.z - box.min.z).toFixed(3)} > ${L.d}`);
  });
}
