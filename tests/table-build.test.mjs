import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABLE_SHAPES } from '../js/data/table.js';
import { PLAIN_STYLE } from '../js/table/style-plain.js';
import { PLATE_RIM, PLATE_R, plateParts } from '../js/table/plates.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SLOTS = { round: 6, long: 11 };
const dim = (c) => [c >> 16, (c >> 8) & 255, c & 255].every(ch => ch / 255 < 0.85);

test('임시 식탁은 발자국 안에 서고 바닥에서 시작한다', () => {
  for (const shape of ['round', 'long']) {
    const { hx, hz } = TABLE_SHAPES[shape], parts = PLAIN_STYLE.parts(shape);
    assert.ok(parts.length >= 6, shape);
    for (const p of parts) {
      assert.ok(Math.abs(p.x) + p.w / 2 <= hx + 1e-9, `${shape} ${p.kind} x`);
      assert.ok(Math.abs(p.z) + p.d / 2 <= hz + 1e-9, `${shape} ${p.kind} z`);
      assert.ok(p.y - p.h / 2 >= -1e-9, `${shape} ${p.kind} 바닥`);
      assert.ok(dim(p.color), `${shape} ${p.kind} 밝기`);
      assert.ok(['box', 'cyl'].includes(p.shape));
    }
    for (const kind of ['top', 'cloth', 'leg', 'seat']) assert.ok(parts.some(p => p.kind === kind), `${shape} ${kind}`);
    assert.ok(Math.max(...parts.map(p => Math.abs(p.x) + p.w / 2)) >= hx - 0.2, `${shape} 가로를 채운다`);
  }
});

test('접시 자리는 둥근 식탁 6, 긴 식탁 11, 상판 위에 서로 안 겹치게', () => {
  for (const shape of ['round', 'long']) {
    const slots = PLAIN_STYLE.slots(shape), parts = PLAIN_STYLE.parts(shape);
    const cloth = parts.find(p => p.kind === 'cloth'), top = parts.find(p => p.kind === 'top');
    const surface = Math.max(cloth.y + cloth.h / 2, top.y + top.h / 2);
    assert.equal(slots.length, SLOTS[shape]);
    slots.forEach((s, i) => {
      assert.ok(Math.abs(s.y - surface) < 1e-9, `${shape} ${i} 높이`);
      const inTop = top.shape === 'cyl' ? Math.hypot(s.x, s.z) + PLATE_R <= top.w / 2 : Math.abs(s.x) + PLATE_R <= top.w / 2 && Math.abs(s.z) + PLATE_R <= top.d / 2;
      assert.ok(inTop, `${shape} ${i} 상판 안`);
      slots.slice(i + 1).forEach(o => assert.ok(Math.hypot(s.x - o.x, s.z - o.z) >= PLATE_R * 2 + 0.1, `${shape} ${i} 간격`));
    });
  }
});

test('접시 테두리 색은 등급에서 온다: 금, 은, 흰, 흰', () => {
  assert.deepEqual(Object.keys(PLATE_RIM), ['perfect', 'great', 'good', 'plain']);
  assert.equal(PLATE_RIM.good, PLATE_RIM.plain);
  assert.equal(new Set(Object.values(PLATE_RIM)).size, 3);
  for (const c of Object.values(PLATE_RIM)) assert.ok(dim(c));
  const [r, g, b] = [PLATE_RIM.perfect >> 16, (PLATE_RIM.perfect >> 8) & 255, PLATE_RIM.perfect & 255];
  assert.ok(r > g && g > b);
  const slot = { x: 0.3, y: 0.79, z: -0.2 };
  const gold = plateParts(slot, { id: 'bread', tier: 'perfect' }, 0), plain = plateParts(slot, { id: 'bread', tier: 'plain' }, 0);
  assert.equal(gold.find(p => p.kind === 'rim').color, PLATE_RIM.perfect);
  assert.equal(plain.find(p => p.kind === 'rim').color, PLATE_RIM.plain);
  assert.equal(plateParts(slot, { id: 'x', tier: 'nope' }, 0).find(p => p.kind === 'rim').color, PLATE_RIM.plain);
  for (const p of gold) {
    assert.ok(Math.hypot(p.x - slot.x, p.z - slot.z) < 1e-9);
    assert.ok(p.y - p.h / 2 >= slot.y - 1e-9);
    assert.ok(p.w <= PLATE_R * 2 + 1e-9);
  }
  assert.deepEqual(gold.map(p => p.kind), ['rim', 'plate', 'food']);
});

test('조형: 메시 3개 이하, 글자 없음, 접시는 그림자를 드리우지 않는다, 스타일은 등록표에서 고른다', () => {
  const b = src('js/table/build.js');
  assert.ok((b.match(/new THREE\.Mesh\(/g) || []).length <= 3);
  assert.doesNotMatch(b, /CanvasTexture|fillText|Sprite/);
  assert.match(b, /export const TABLE_STYLES = Object\.freeze\(\{ plain: PLAIN_STYLE \}\);/);
  assert.match(b, /export function buildTable\(\{ style, shape, dishes, mergeGeos, paintGeo \}\)/);
  assert.match(b, /plates\.castShadow = false;/);
  assert.match(b, /TABLE_STYLES\[style\] \?\? TABLE_STYLES\.plain/);
  for (const k of ['group', 'setDishes', 'grow', 'growing', 'update', 'dispose']) assert.match(b, new RegExp(`\\b${k}\\b`));
  for (const f of ['js/table/build.js', 'js/table/style-plain.js', 'js/table/plates.js']) assert.doesNotMatch(src(f), /^\s*\/\//m);
  for (const f of ['js/table/style-plain.js', 'js/table/plates.js']) assert.doesNotMatch(src(f), /from 'three'/);
});
