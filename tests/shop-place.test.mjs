import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POND_STAGE_R, POND_BIG_SPOT } from '../js/data/pond.js';
import { ISLE, ISLE_R, STREAM_HALF, BANK_W } from '../js/world/bridge.js';
import { walkLimit } from '../js/world/walk-bounds.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const places = read('../js/data/places.js');
const vec = (name) => {
  const m = places.match(new RegExp(`const ${name} = new THREE\\.Vector3\\((-?[\\d.]+), 0, (-?[\\d.]+)\\)`));
  assert.ok(m, `${name} not found`);
  return { x: Number(m[1]), z: Number(m[2]) };
};
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const SHOP = vec('SHOP_POS');
const HOUSE = vec('HOUSE_POS');
const doorM = places.match(/const SHOP_DOOR = new THREE\.Vector3\(SHOP_POS\.x, 0, SHOP_POS\.z \+ ([\d.]+)\)/);
const solidM = read('../js/spaces/cafe.js').match(/solidCircle\(SHOP_POS\.x, SHOP_POS\.z, ([\d.]+)\)/);
const SHOP_R = Number(solidM?.[1]);
const DOOR = { x: SHOP.x, z: SHOP.z + Number(doorM?.[1]) };
const FRONT = { x: DOOR.x, z: DOOR.z + 1 };
const POND = { x: HOUSE.x + POND_BIG_SPOT.dx, z: HOUSE.z + POND_BIG_SPOT.dz };
const POND_R3 = POND_STAGE_R[POND_STAGE_R.length - 1];
const BANK = ISLE_R + STREAM_HALF + BANK_W;
const others = [...places.matchAll(/export const ([A-Z_]+) = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/g)]
  .map(m => ({ name: m[1], x: Number(m[2]), z: Number(m[3]) }))
  .filter(g => g.name !== 'SHOP_POS' && Math.abs(g.x) < 45 && Math.abs(g.z) < 45);

test('가게 충돌 반지름과 문 자리를 코드에서 읽는다', () => {
  assert.equal(SHOP_R, 2.4);
  assert.ok(doorM, 'SHOP_DOOR 는 가게 남쪽(+Z)으로 내민다');
  assert.ok(DOOR.z > SHOP.z);
  assert.ok(others.length > 10);
});

test('가게와 3단계 연못 물가 사이는 4.5 이상', () => {
  assert.ok(d(SHOP, POND) - SHOP_R - POND_R3 >= 4.5, `${(d(SHOP, POND) - SHOP_R - POND_R3).toFixed(2)}`);
});

test('가게도 문 앞 자리도 박물관 물가에서 3 이상', () => {
  assert.ok(d(SHOP, ISLE) - BANK - SHOP_R >= 3, `${(d(SHOP, ISLE) - BANK - SHOP_R).toFixed(2)}`);
  assert.ok(d(FRONT, ISLE) - BANK >= 3, `${(d(FRONT, ISLE) - BANK).toFixed(2)}`);
});

test('안개의 숲 입구와 10 이상, 마을 걷는 범위 안쪽 3', () => {
  assert.ok(d(SHOP, vec('MIST_GATE')) >= 10);
  assert.ok(Math.hypot(SHOP.x, SHOP.z) + SHOP_R + 3 <= walkLimit(Math.atan2(SHOP.z, SHOP.x)));
});

test('가게는 연못 남쪽 시야에 서지 않는다', () => {
  const south = SHOP.z - POND.z;
  assert.ok(!(south > 0 && south < POND_R3 + 7 && Math.abs(SHOP.x - POND.x) < POND_R3 + 2.5));
});

test('가게 남쪽 10 안에는 집도 시설도 서 있지 않다', () => {
  for (const g of others) {
    const r = g.name === 'HOUSE_POS' ? 3.9 : 2.5;
    const south = g.z - SHOP.z;
    assert.ok(!(south > 0 && south < 10 && Math.abs(g.x - SHOP.x) < SHOP_R + r), g.name);
  }
});

test('문 앞 남쪽 길에는 나무를 심지 않는다', () => {
  const m = read('../js/game.js').match(/\|\| dist2D\(\{ x, z \}, \{ x: SHOP_DOOR\.x, z: SHOP_DOOR\.z \+ ([\d.]+) \}\) < ([\d.]+)/);
  assert.ok(m, '나무 산포 제외 조건');
  const c = { x: DOOR.x, z: DOOR.z + Number(m[1]) }, r = Number(m[2]);
  for (let z = FRONT.z; z <= DOOR.z + 5; z += 0.5) assert.ok(d({ x: DOOR.x, z }, c) + 0.8 < r, `z ${z}`);
  assert.ok(d(c, ISLE) - r < ISLE_R + 2.4);
});

test('다른 시설 좌표와 2.5 이상 떨어진다', () => {
  for (const g of others) assert.ok(d(SHOP, g) - SHOP_R >= 2.5, `${g.name} ${(d(SHOP, g) - SHOP_R).toFixed(2)}`);
});
