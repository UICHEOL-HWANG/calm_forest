import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeShowcase, YARD_R, DECOR_MAX } from '../js/neighbors/sanitize.js';

const CTX = { outdoorIds: new Set(['fence', 'flowerbed', 'postlamp']), animalIds: new Set(['fox', 'rabbit']),
  fallbackAnimal: 'fox', yard: { x: -8, z: -8 } };
const raw = (o = {}) => ({
  nickname: '느긋한 토끼 #1093', character: 'rabbit',
  equipped: { head: 'beanie', neck: null, back: 'cape', trail: 'firefly', skin: null },
  pet: { kind: 'leaf', works: 50 }, houseStage: 6, houseStyle: { roof: 1, wall: 2, door: 0 }, style: null,
  addons: ['chimney_smoke'], outdoor: [{ id: 'flowerbed', x: -5, z: -5, rot: 1 }], coop: { built: true }, ...o,
});

test('정상 응답 → 그릴 뷰(앞마당 상대좌표·펫 단계)', () => {
  const v = sanitizeShowcase(raw(), CTX);
  assert.deepEqual(Object.keys(v).sort(), ['addons', 'character', 'equipped', 'houseStage', 'houseStyle', 'nickname', 'outdoor', 'pet', 'style']);
  assert.equal(v.nickname, '느긋한 토끼 #1093');
  assert.equal(v.character, 'rabbit');
  assert.deepEqual(v.equipped, { head: 'beanie', neck: null, back: 'cape', trail: 'firefly', skin: null });
  assert.deepEqual(v.pet, { kind: 'leaf', stage: 1 });   // GROW_NEED [0,40,140]
  assert.equal(v.houseStage, 6);
  assert.deepEqual(v.houseStyle, { roof: 1, wall: 2, door: 0 });
  assert.equal(v.style, null);
  assert.deepEqual(v.addons, ['chimney_smoke']);
  assert.deepEqual(v.outdoor, [{ id: 'flowerbed', dx: 3, dz: 3, rot: 1 }]);
});

test('모르는 id·NaN·문자열 좌표는 버린다', () => {
  const v = sanitizeShowcase(raw({ outdoor: [
    { id: 'rocket', x: -8, z: -8 }, { id: 'fence', x: 'a', z: -8 }, { id: 'fence', x: NaN, z: -8 },
    { id: 'fence', x: -8, z: Infinity }, null, 'fence', { id: 'fence', x: -8, z: -8, rot: 5 }, { id: 'fence', x: -8, z: -8, rot: 1.5 },
  ], addons: ['chimney_smoke', 'nope', 3, 'chimney_smoke'] }), CTX);
  assert.deepEqual(v.outdoor, [{ id: 'fence', dx: 0, dz: 0, rot: 1 }, { id: 'fence', dx: 0, dz: 0, rot: 0 }]);
  assert.deepEqual(v.addons, ['chimney_smoke']);
});

test(`반경 ${YARD_R} 경계 · 최대 ${DECOR_MAX}개`, () => {
  const edge = sanitizeShowcase(raw({ outdoor: [{ id: 'fence', x: -8 + YARD_R, z: -8 }, { id: 'fence', x: -8 + YARD_R + 0.01, z: -8 }] }), CTX);
  assert.equal(edge.outdoor.length, 1);
  const many = sanitizeShowcase(raw({ outdoor: Array.from({ length: 60 }, () => ({ id: 'fence', x: -8, z: -8 })) }), CTX);
  assert.equal(many.outdoor.length, DECOR_MAX);
});

test('장착: 슬롯이 다르거나 모르는 id 는 null', () => {
  const v = sanitizeShowcase(raw({ equipped: { head: 'cape', neck: 'nope', back: 'pack', trail: 7, skin: 'plush_doll' } }), CTX);
  assert.deepEqual(v.equipped, { head: null, neck: null, back: 'pack', trail: null, skin: 'plush_doll' });
});

test('펫·캐릭터·닉네임·색 인덱스 방어', () => {
  assert.equal(sanitizeShowcase(raw({ pet: { kind: 'dragon', works: 9 } }), CTX).pet, null);
  assert.deepEqual(sanitizeShowcase(raw({ pet: { kind: 'golem', works: 'x' } }), CTX).pet, { kind: 'golem', stage: 0 });
  assert.equal(sanitizeShowcase(raw({ character: 'dragon' }), CTX).character, 'fox');
  assert.equal(sanitizeShowcase(raw({ nickname: '   ' }), CTX).nickname, '이름 없는 여행자');
  assert.equal(sanitizeShowcase(raw({ nickname: '가'.repeat(30) }), CTX).nickname.length, 16);
  assert.deepEqual(sanitizeShowcase(raw({ houseStyle: { roof: 9, wall: -1, door: 'x' } }), CTX).houseStyle, { roof: 0, wall: 0, door: 0 });
});

test('7단계 스타일 정규화 · 6단계 이하는 null', () => {
  assert.equal(sanitizeShowcase(raw({ houseStage: 7, style: 'hanok' }), CTX).style, 'hanok');
  assert.equal(sanitizeShowcase(raw({ houseStage: 7, style: 'castle' }), CTX).style, 'modern');
  assert.equal(sanitizeShowcase(raw({ houseStage: 6, style: 'hanok' }), CTX).style, null);
});

test('그릴 수 없는 응답은 null', () => {
  for (const bad of [null, 'x', [], { ...raw(), houseStage: 0 }, { ...raw(), houseStage: 8 }, { ...raw(), houseStage: 2.5 }, { ...raw(), houseStage: '3' }]) {
    assert.equal(sanitizeShowcase(bad, CTX), null, String(JSON.stringify(bad)).slice(0, 40));
  }
});
