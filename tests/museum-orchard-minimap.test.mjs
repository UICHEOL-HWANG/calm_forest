import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

// 🗺️ 미니맵 서브 공간 중심·반경 — museum·orchard 가 체인에서 빠지면 MINE 으로 떨어져
//    플레이어 점이 광산 원점 기준으로 찍혀 지도 밖에 붙는다.

const src = gameSource();
const line = (start) => {
  const i = src.indexOf(start); assert.ok(i >= 0, start);
  return src.slice(i + start.length, src.indexOf(';\n', i));
};
const C_EXPR = line('const C = place === ');
const HALF_EXPR = line('md.half = place === ');

// 각 상수를 서로 다른 값으로 두고 식을 그대로 평가한다
const env = {
  INT: { x: 1, z: 1 }, FARM: { x: 2, z: 2 }, YARD_D: 0, CAFE: { x: 3, z: 3 }, RIVER: { x: 4, z: 4 },
  MIST: { x: 5, z: 5 }, SEA: { x: 6, z: 6 }, MINE: { x: 7, z: 7 }, MUSEUM: { x: 8, z: 8 }, ORCHARD: { x: 9, z: 9 },
  curHalf: () => 11, farmHalf: () => 12, CAFE_HALF: 13, RIVER_DOCK_HALF: 14, MIST_HALF: 15, MINE_HALF: 17,
  MUSEUM_HALF_W: 7.5, MUSEUM_HALF_D: 6.5, ORCHARD_HALF: 20,
};
const evalFor = (expr, place) => new Function(...Object.keys(env), 'place', `return place === ${expr};`)(...Object.values(env), place);

test('museum: 중심은 MUSEUM, 반경은 전시실 반폭·반깊이 중 큰 값', () => {
  assert.deepEqual(evalFor(C_EXPR, 'museum'), env.MUSEUM);
  assert.equal(evalFor(HALF_EXPR, 'museum'), Math.max(env.MUSEUM_HALF_W, env.MUSEUM_HALF_D));
});

test('orchard: 중심은 ORCHARD, 반경은 ORCHARD_HALF', () => {
  assert.deepEqual(evalFor(C_EXPR, 'orchard'), env.ORCHARD);
  assert.equal(evalFor(HALF_EXPR, 'orchard'), env.ORCHARD_HALF);
});

test('mine 은 그대로 MINE·MINE_HALF', () => {
  assert.deepEqual(evalFor(C_EXPR, 'mine'), env.MINE);
  assert.equal(evalFor(HALF_EXPR, 'mine'), env.MINE_HALF);
});

test('minimapMarks: 박물관 나가는 문(남쪽 벽) 표시', () => {
  const i = src.indexOf('function minimapMarks(');
  const body = src.slice(i, src.indexOf('\n}\n', i));
  assert.match(body, /place === 'museum'[\s\S]{0,200}MUSEUM\.z \+ MUSEUM_HALF_D[\s\S]{0,40}kind: 'exit'/);
});
