import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWalk, onWalk, walkHeight, keepOnWalk, walkEnd } from '../js/spaces/gate-walk.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const deck = makeWalk({ ax: 0, az: -14.4, bx: 0, bz: -19.4, hw: 1, y: 0.4 });

test('판 가운데·끝은 걸을 수 있고 옆 물은 아니다', () => {
  assert.equal(onWalk(deck, { x: 0, z: -17 }), true);
  assert.equal(onWalk(deck, { x: 0.9, z: -19.3 }), true);
  assert.equal(onWalk(deck, { x: 1.6, z: -17 }), false);
  assert.equal(onWalk(deck, { x: 0, z: -21 }), false);
});

test('발 높이: 뭍 쪽 시작에서 0, 조금 올라가면 판 높이', () => {
  assert.equal(walkHeight([deck], { x: 0, z: -14.4 }), 0);
  assert.equal(walkHeight([deck], { x: 0, z: -16 }), 0.4);
  const mid = walkHeight([deck], { x: 0, z: -14.7 });
  assert.ok(mid > 0 && mid < 0.4);
  assert.equal(walkHeight([deck], { x: 5, z: -16 }), 0);
});

test('판 옆으로 한 발 내딛으면 판 위로 되돌린다(물가로 순간이동하지 않는다)', () => {
  const p = { x: 1.15, z: -17.5 };
  keepOnWalk([deck], p, () => true);
  assert.equal(onWalk(deck, p), true);
  assert.ok(Math.abs(p.z + 17.5) < 1e-9);
});

test('물이 아니면 건드리지 않는다', () => {
  const p = { x: 1.15, z: -17.5 };
  keepOnWalk([deck], p, () => false);
  assert.deepEqual(p, { x: 1.15, z: -17.5 });
});

test('길에서 멀리 떨어진 물은 충돌체에 맡긴다', () => {
  const p = { x: 4, z: -17.5 };
  keepOnWalk([deck], p, () => true);
  assert.deepEqual(p, { x: 4, z: -17.5 });
});

test('판 끝을 넘어 물로 나가면 판 끝에 멈춘다', () => {
  const p = { x: 0.3, z: -19.9 };
  keepOnWalk([deck], p, () => true);
  assert.ok(onWalk(deck, p));
  assert.ok(Math.abs(p.z + 19.4) < 1e-3 && Math.abs(p.x - 0.3) < 1e-5);
  assert.equal(onWalk(deck, { x: 0, z: -19.6 }), false);
});

test('끝점 — 입장 고리 자리', () => {
  assert.deepEqual(walkEnd(deck), { x: 0, z: -19.4 });
});

test('바다터 돌다리·나루터 판 길이 소스에 연결돼 있다', () => {
  assert.match(src('js/spaces/sea.js'), /addGateWalk\(/);
  assert.match(src('js/spaces/river.js'), /addGateWalk\(/);
  assert.match(src('js/game.js'), /keepOnGateWalks\(player\.position\)/);
  assert.match(src('js/game.js'), /updateGateWalks\(dt, player\.position\)/);
});

test('바다터 돌다리 끝 — 어느 자리에 서도 등대 기둥과 몸이 겹치지 않는다', () => {
  const sea = src('js/spaces/sea.js'), places = src('js/data/places.js');
  const [, cx, cz] = places.match(/SEA_COVE = \{ x: SEA_GATE\.x \+ ([\d.]+), z: SEA_GATE\.z - ([\d.]+)/);
  const [, lx, lz] = sea.match(/const LX = CX - ([\d.]+), LZ = CZ \+ ([\d.]+)/);
  const tower = { x: +cx - +lx, z: -+cz + +lz, r: 0.52 };
  const m = sea.match(/ax: SEA_GATE\.x \+ ([\d.]+), az: SEA_GATE\.z - ([\d.]+), bx: SEA_GATE\.x \+ ([\d.]+), bz: SEA_GATE\.z - ([\d.]+), hw: ([\d.]+)/);
  const w = makeWalk({ ax: +m[1], az: -m[2], bx: +m[3], bz: -m[4], hw: +m[5], y: 0.36 });
  const PLAYER_R = +src('js/data/character.js').match(/export const PLAYER_R = ([\d.]+)/)[1];
  for (let s = 0; s <= 1; s += 0.05) for (const k of [-1, 0, 1]) {
    const x = w.ax + w.ux * w.len * s - w.uz * w.hw * k, z = w.az + w.uz * w.len * s + w.ux * w.hw * k;
    assert.ok(Math.hypot(x - tower.x, z - tower.z) > tower.r + PLAYER_R, `겹침 s=${s} k=${k}`);
  }
});
