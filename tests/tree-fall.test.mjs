import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import {
  treeFallPose, fallDirAway, TREE_FALL_DUR, TREE_FALL_IMPACT, TREE_FALL_LIE,
} from '../js/tree-fall.js';

// 🌳 나무 쓰러짐 — B안 '기우뚱 쿵 바운스'(2026-09-28, sims/tree-fall-sim.html 에서 3안 비교 후 채택)
//   마지막 도끼질에 한 프레임 만에 사라지던 것을: 뜸(기우뚱) → 가속 낙하 → 쿵·튕김 → 땅속으로.
const SRC = gameSource();
const FISHING = readFileSync(new URL('../js/spaces/fishing.js', import.meta.url), 'utf8');

test('t=0 에는 서 있다', () => {
  const p = treeFallPose(0);
  assert.equal(p.angle, 0);
  assert.equal(p.sink, 0);
  assert.equal(p.scale, 1);
  assert.equal(p.done, false);
});

test('뜸: 처음 0.15초는 반대쪽으로 살짝 기우뚱(음수 각)', () => {
  const a = treeFallPose(0.075).angle;
  assert.ok(a < 0 && a > -0.1, `기우뚱 각 ${a}`);
});

test('낙하는 가속한다 — 뒤 절반에 더 많이 돈다', () => {
  const mid = (0.15 + TREE_FALL_IMPACT) / 2;
  const first = treeFallPose(mid).angle - treeFallPose(0.15).angle;
  const second = treeFallPose(TREE_FALL_IMPACT).angle - treeFallPose(mid).angle;
  assert.ok(second > first * 2, `앞 ${first} 뒤 ${second}`);
});

test('착지 순간 눕고(≈80°), 바로 뒤 한 번 튕겨 올라왔다가 다시 눕는다', () => {
  assert.ok(Math.abs(treeFallPose(TREE_FALL_IMPACT).angle - TREE_FALL_LIE) < 1e-9);
  const bounce = treeFallPose(TREE_FALL_IMPACT + 0.08).angle;
  assert.ok(bounce < TREE_FALL_LIE - 0.05, `튕김 ${bounce}`);
  assert.ok(Math.abs(treeFallPose(1.1).angle - TREE_FALL_LIE) < 0.02);
});

test('끝에는 땅속으로 가라앉으며 작아지고, 끝나면 done', () => {
  const end = treeFallPose(TREE_FALL_DUR - 0.001);
  assert.ok(end.sink > 1 && end.scale < 0.7);
  assert.equal(treeFallPose(TREE_FALL_DUR).done, true);
  assert.equal(treeFallPose(1.0).done, false);
});

test('쓰러지는 방향은 플레이어 반대쪽 단위 벡터 · 같은 자리면 기본 방향', () => {
  const d = fallDirAway({ x: 0, z: 0 }, { x: -3, z: 4 });
  assert.ok(Math.abs(d.x - 0.6) < 1e-9 && Math.abs(d.z + 0.8) < 1e-9);
  const same = fallDirAway({ x: 1, z: 1 }, { x: 1, z: 1 });
  assert.ok(Math.abs(Math.hypot(same.x, same.z) - 1) < 1e-9);
});

test('벌목 완료 시 즉시 숨기지 않고 쓰러짐 상태로 넘긴다', () => {
  const start = FISHING.indexOf('if (ud.hp <= 0)');
  const felledBlock = FISHING.slice(start, FISHING.indexOf('refreshInventoryUI()', start));
  assert.doesNotMatch(felledBlock, /nearest\.visible\s*=\s*false/);
  assert.match(felledBlock, /ud\.felling\s*=/);
  assert.match(felledBlock, /fallDirAway\(/);
});

test('충돌체는 땅에 닿을 때까지 켜 둔다 — 아직 선 나무를 뚫고 지나가지 않게', () => {
  const upd = SRC.slice(SRC.indexOf('function updateTrees('), SRC.indexOf('function updateTrees(') + 1500);
  assert.match(upd, /collider\.off\s*=\s*ud\.fallen\s*&&\s*!\(ud\.felling\s*&&\s*now\s*-\s*ud\.felling\.t0\s*<\s*TREE_FALL_IMPACT\)/);
});

test('updateTrees 가 updateFelling 을 부르고, updateFelling 은 treeFallPose 로 그리다 끝나면 숨긴다', () => {
  const upd = SRC.slice(SRC.indexOf('function updateTrees('), SRC.indexOf('function updateTrees(') + 400);
  assert.match(upd, /if \(ud\.felling\) updateFelling\(/);
  const at = SRC.indexOf('function updateFelling(');
  const body = SRC.slice(at, SRC.indexOf('function updateTrees('));
  assert.match(body, /treeFallPose\(/);
  assert.match(body, /tree\.visible\s*=\s*false/);
});
