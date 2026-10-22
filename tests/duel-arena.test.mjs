import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { arenaKind, buildArena, ARENA_LOOK } from '../js/duel/arena.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const ctx = { mid: { x: 10, z: 20 }, perp: { x: 0, z: 1 }, camPos: { x: 10, y: 3, z: 29 }, seed: 7 };
const named = (g, name) => { let n = 0; g.traverse(o => { if (o.name === name) n++; }); return n; };

test('낮엔 등불 결투장(A), 밤엔 씨름판(C)', () => {
  assert.equal(arenaKind(false), 'lantern');
  assert.equal(arenaKind(true), 'ring');
});

test('결투장은 등불 기둥과 보름달, 반딧불을 세운다', () => {
  const a = buildArena(THREE, { ...ctx, kind: 'lantern' });
  assert.ok(named(a.group, 'arena-lamp') >= 5);
  assert.equal(named(a.group, 'arena-moon'), 1);
  assert.ok(named(a.group, 'arena-firefly') >= 10);
  assert.equal(a.sky.getHex(), ARENA_LOOK.lantern.sky);
});

test('씨름판은 모래판·새끼줄·깃발 둘을 세운다', () => {
  const a = buildArena(THREE, { ...ctx, kind: 'ring' });
  assert.equal(named(a.group, 'arena-sand'), 1);
  assert.equal(named(a.group, 'arena-rope'), 1);
  assert.equal(named(a.group, 'arena-banner'), 2);
  assert.equal(a.sky.getHex(), ARENA_LOOK.ring.sky);
});

test('점광원을 쓰지 않는다(조명 수가 바뀌면 모든 재질이 다시 컴파일돼 끊긴다)', () => {
  for (const kind of ['lantern', 'ring']) {
    const a = buildArena(THREE, { ...ctx, kind });
    a.group.traverse(o => assert.ok(!o.isLight, kind));
  }
});

test('배경 나무는 카메라 반대편에만 선다(캐릭터를 가리지 않게)', () => {
  const a = buildArena(THREE, { ...ctx, kind: 'lantern' });
  a.group.traverse(o => {
    if (o.name !== 'arena-tree') return;
    const toward = (o.position.x - ctx.mid.x) * ctx.perp.x + (o.position.z - ctx.mid.z) * ctx.perp.z;
    assert.ok(toward < 0, `tree at ${o.position.x},${o.position.z}`);
  });
});

test('같은 자리면 같은 모양(시드 고정)', () => {
  const p = (k) => { const out = []; buildArena(THREE, { ...ctx, kind: k }).group.traverse(o => o.name === 'arena-firefly' && out.push(o.position.x.toFixed(3))); return out.join(); };
  assert.equal(p('lantern'), p('lantern'));
});

test('dispose 는 지오메트리·재질을 정리한다', () => {
  const a = buildArena(THREE, { ...ctx, kind: 'ring' });
  let n = 0; a.group.traverse(o => { if (o.geometry) o.geometry.addEventListener('dispose', () => n++); });
  a.dispose();
  assert.ok(n > 0);
});

test('무대가 결투장을 세우고 끝나면 하늘·안개를 되돌린다', () => {
  const stage = read('../js/duel/stage.js');
  assert.match(stage, /buildArena\(THREE, \{/);
  assert.match(stage, /arenaKind\(!!stage\.night\)/);
  assert.match(stage, /scene\.background = arena\.sky;/);
  assert.match(stage, /savedFog/);
  assert.match(stage, /arena\.dispose\(\)/);
});

test('낮밤 여부를 무대에 넘긴다', () => {
  assert.match(read('../js/spaces/night-visit.js'), /stage: \{ THREE, scene, camera, player, night: isNight\(\),/);
});

test('튜토리얼 스포트라이트 막은 대결 중에 숨긴다', () => {
  assert.match(read('../index.html'), /body\.duel-open \.sp-bar/);
});

test('대결 중엔 밤 색 보정을 끈다(미니게임 무대와 같은 규칙)', async () => {
  const { gameSource } = await import('./helpers/game-source.mjs');
  assert.match(gameSource(), /uNight\.value = mgView && STAGE_TYPES\.has\(mgView\.type\) \|\| duelActive \? 0 :/);
});

test('깃발은 카메라를 본다', () => {
  const a = buildArena(THREE, { ...ctx, kind: 'ring' });
  a.group.updateMatrixWorld(true);
  a.group.traverse(o => {
    if (o.name !== 'arena-banner') return;
    const flag = o.children[1];
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(flag.getWorldQuaternion(new THREE.Quaternion()));
    const wp = flag.getWorldPosition(new THREE.Vector3());
    const to = new THREE.Vector3(ctx.camPos.x - wp.x, 0, ctx.camPos.z - wp.z).normalize();
    assert.ok(n.dot(to) > 0.95, String(n.dot(to)));
  });
});

test('바닥 원판은 마당 얼룩(y=0.01)보다 확실히 위에 있다(깜빡임 방지)', () => {
  for (const kind of ['lantern', 'ring']) {
    buildArena(THREE, { ...ctx, kind }).group.traverse(o => {
      if (/^arena-(ground|floor|sand)$/.test(o.name)) assert.ok(o.position.y >= 0.02, `${kind} ${o.name}`);
    });
  }
});

test('무대를 세우다 실패하면 스스로 정리한다', () => {
  assert.match(read('../js/duel/stage.js'), /\} catch \(e\) \{\n\s*exitDuelStage\(handle\);\n\s*throw e;/);
});
