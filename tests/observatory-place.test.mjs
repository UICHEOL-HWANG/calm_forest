import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const p = (x, z, r = 0) => ({ x, z, r });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const src = gameSource();

function vec3(name) {
  const m = new RegExp(`const ${name} = new THREE\\.Vector3\\(\\s*(-?[\\d.]+)\\s*,\\s*-?[\\d.]+\\s*,\\s*(-?[\\d.]+)\\s*\\)`).exec(src);
  assert.ok(m, `${name} 좌표를 못 찾았다`);
  return { x: +m[1], z: +m[2] };
}

function num(name) {
  const m = new RegExp(`const ${name} = (-?[\\d.]+)`).exec(src);
  assert.ok(m, `${name} 을 못 찾았다`);
  return +m[1];
}

const FOREST = vec3('FOREST');
const GLADE = vec3('GLADE');
const MIST_GATE = vec3('MIST_GATE');
const ORCHARD_GATE = vec3('ORCHARD_GATE');
const OBSERVATORY_GATE = vec3('OBSERVATORY_GATE');
const OBSERVATORY = vec3('OBSERVATORY');
const FOREST_R = num('FOREST_R');
const GLADE_R = num('GLADE_R');
const OBSERVATORY_R = num('OBSERVATORY_R');
const SEA_COVE = (() => {
  const m = /const SEA_COVE = \{ x: SEA_GATE\.x \+ ([\d.]+), z: SEA_GATE\.z - ([\d.]+), r: ([\d.]+) \}/.exec(src);
  assert.ok(m, 'SEA_COVE 를 못 찾았다');
  const gate = vec3('SEA_GATE');
  return { x: gate.x + +m[1], z: gate.z - +m[2], r: +m[3] };
})();

const OCCUPIED = [
  ['house', p(-8, -8, 0)],
  ['mist gate', MIST_GATE],
  ['dock gate', p(0, -15, 0)],
  ['dock pond', p(0, -21.5, 7)],
  ['sea gate', p(14.5, -12.5, 0)],
  ['sea cove', SEA_COVE],
  ['decor shop', p(-17.5, -4, 0)],
  ['mine gate', p(-14, 3, 0)],
  ['museum gate', p(-26, 5, 0)],
  ['forest', p(FOREST.x, FOREST.z, FOREST_R)],
  ['coop', p(-4.5, 11.5, 0)],
  ['farm gate', p(0, 7, 0)],
  ['cafe gate', p(4, 14, 0)],
  ['glade', p(GLADE.x, GLADE.z, GLADE_R)],
  ['lake', p(16, 9, 6)],
  ['orchard gate', ORCHARD_GATE],
  ['plaza', p(23, -4, 5)],
  ['rank board', p(13.5, 1.5, 0)],
  ['shop', p(9, 0, 0)],
  ['market', p(10, 5.5, 0)],
  ['bench', p(4, -5, 0)],
  ['kitchen', p(7.4, -6.4, 0)],
  ['stargazer', p(6, 20.5, 0)],
];

test('천문대 게이트는 기존 시설과 최소 8m 이상 떨어져 있다', () => {
  for (const [name, spot] of OCCUPIED) {
    const gap = dist(OBSERVATORY_GATE, spot) - (spot.r || 0);
    assert.ok(gap >= 8, `${name} 과의 여유 ${gap.toFixed(2)}m`);
  }
});

test('천문대 게이트는 마을 이동 반경과 기단 여유 안에 있다', () => {
  assert.ok(Math.hypot(OBSERVATORY_GATE.x, OBSERVATORY_GATE.z) <= 36);
});

test('천문대 실내는 다른 인스턴스 공간과 충분히 떨어져 있다', () => {
  const interiors = [
    ['farm', vec3('FARM')],
    ['orchard', vec3('ORCHARD')],
    ['mine', vec3('MINE')],
    ['cafe', vec3('CAFE')],
    ['museum', vec3('MUSEUM')],
  ];
  for (const [name, origin] of interiors) {
    assert.ok(dist(OBSERVATORY, origin) >= 30, `${name} 과 너무 가깝다`);
  }
});

test('천문대 실내 반경은 계획값 5.4m 다', () => {
  assert.equal(OBSERVATORY_R, 5.4);
});
