import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXPANSIONS, MAX_HOUSE_STAGE } from '../js/house-cost.js';
import {
  HOUSE_STYLES, DEFAULT_HOUSE_STYLE, STAGE7, normalizeHouseStyle, stage7Boxes, stage7DoorPoint, stage7ExcludeR, pointInBoxes,
} from '../js/house-stage7.js';

test('7단계 증축 비용이 확정값이다 (목재180 돌80 보석5 코인1500)', () => {
  const e = EXPANSIONS.find((x) => x.stage === 7);
  assert.ok(e, '7단계가 없다');
  assert.deepEqual(e.cost, { wood: 180, stone: 80, gem: 5, coins: 1500 });
  assert.equal(MAX_HOUSE_STAGE, 7);
});

test('7단계는 스타일 둘(모던·한옥) 이름·아이콘을 가진다', () => {
  const e = EXPANSIONS.find((x) => x.stage === 7);
  for (const id of HOUSE_STYLES) { assert.ok(e.styles[id].name && e.styles[id].ico, `${id} 스타일 정보`); }
  assert.deepEqual([...HOUSE_STYLES], ['modern', 'hanok']);
});

test('normalizeHouseStyle — 옛 세이브·잘못된 값은 안전하게 떨군다', () => {
  assert.equal(normalizeHouseStyle('hanok', 7), 'hanok');
  assert.equal(normalizeHouseStyle('modern', 7), 'modern');
  assert.equal(normalizeHouseStyle(undefined, 7), DEFAULT_HOUSE_STYLE, '7단계인데 없으면 기본(모던)');
  assert.equal(normalizeHouseStyle('palace', 7), DEFAULT_HOUSE_STYLE);
  assert.equal(normalizeHouseStyle('hanok', 6), null, '6단계 이하는 스타일이 없다');
  assert.equal(normalizeHouseStyle(undefined, 3), null);
});

for (const style of HOUSE_STYLES) {
  test(`${style}: 충돌 박스는 3개이고 중정(가운데 마당)을 막지 않는다`, () => {
    const O = { x: -8, z: -8 };
    const boxes = stage7Boxes(style, O);
    assert.equal(boxes.length, 3, '안채·좌·우 행랑');
    for (const [dx, dz] of [[0, 0.5], [0, 2.0], [0.8, 1.5], [-0.8, 1.5], [0, 3.0]])
      assert.ok(!pointInBoxes(boxes, O.x + dx, O.z + dz), `중정 (${dx},${dz}) 이 막혀 있다`);
  });
  test(`${style}: 건물 몸체는 막는다`, () => {
    const boxes = stage7Boxes(style, { x: 0, z: 0 });
    for (const [dx, dz] of [[0, -2.5], [-2.7, 0.9], [2.7, 0.9]]) assert.ok(pointInBoxes(boxes, dx, dz), `(${dx},${dz}) 는 건물 안`);
  });
  test(`${style}: 현관 앞(안채 앞 마루)에 서서 문 프롬프트를 받을 수 있다`, () => {
    const O = { x: 0, z: 0 };
    const door = stage7DoorPoint(style, O);
    assert.ok(!pointInBoxes(stage7Boxes(style, O), door.x, door.z + 0.9), '현관 앞이 막혀 있다');
    assert.ok(Math.abs(door.x) < 1.0, '문이 가운데 근처');
  });
  test(`${style}: 제외 반경이 모든 박스 모서리와 앞 담장을 덮는다`, () => {
    const O = { x: 0, z: 0 }, R = stage7ExcludeR(style);
    for (const b of stage7Boxes(style, O)) for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]])
      assert.ok(Math.hypot(x, z) < R, `모서리 (${x},${z}) 가 제외 반경 ${R} 밖`);
    assert.ok(Math.hypot(3.7, 3.7) < R, '앞 담장 모서리');
  });
}

test('STAGE7 상수 — 풋프린트가 시안과 같다(7.4×6.8)', () => {
  assert.equal(STAGE7.w, 7.4); assert.equal(STAGE7.d, 6.8);
});

// ── 저장 복원 순서·분리 원칙(소스 잠금) ──────────────────────────────
import { gameSource } from './helpers/game-source.mjs';
const SRC = gameSource();

test('house.style 은 buildHouseStage 복원 루프보다 먼저 복원한다(7단계 모델이 style 을 읽는다)', () => {
  const restore = SRC.indexOf('gameState.house.style = normalizeHouseStyle(saved.house?.style, saved.houseStage)');
  const loop = SRC.indexOf('for (let s = 1; s <= saved.houseStage; s++) buildHouseStage(s, true)');
  assert.ok(restore > 0, '스타일 복원이 없다');
  assert.ok(loop > 0, '단계 복원 루프를 못 찾았다');
  assert.ok(restore < loop, '스타일 복원이 루프보다 뒤에 있다 — 7단계가 항상 모던으로 복원된다');
});

test('증축은 스타일 없이는 7단계를 짓지 않는다(재료도 안 쓴다)', () => {
  const fn = SRC.slice(SRC.indexOf('function doExpand('), SRC.indexOf('function doExpand(') + 2500);
  assert.ok(fn.indexOf('needsStyle: true') > 0 && fn.indexOf('needsStyle: true') < fn.indexOf('gameState.inventory[it.k] -= it.need'),
    '스타일 검사가 재료 소비보다 뒤에 있다');
});

test('7단계 모델 3종은 merge 를 거치고 game.js 에는 새 조형 코드가 없다(모듈 분리·드로우콜)', () => {
  const idx = readFileSync(new URL('../js/house/index.js', import.meta.url), 'utf8');
  assert.ok(idx.includes('mergeByMaterial(THREE, g)'), '7단계 외관 병합');
  assert.ok(idx.includes('stage === 7 && !g.userData.anim'), '7단계 구성품 병합');
  assert.ok(!/stage7|Stage7/.test(readFileSync(new URL('../js/game.js', import.meta.url), 'utf8').replace(/house-stage7|HOUSE_CLEAR_R|extView\w+|normalizeHouseStyle/g, '')), 'game.js 에 7단계 조형이 들어갔다');
});
