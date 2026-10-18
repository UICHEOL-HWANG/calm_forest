import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pose, swarmAt, puffAt, SET_OF } from '../js/decor-drops/fx-math.js';
import { DECOR_SETS } from '../js/data/decor-sets.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('every set id maps back to its set, bonus included', () => {
  for (const s of DECOR_SETS) for (const id of [...s.items, s.bonus]) assert.equal(SET_OF[id], s.id);
});

test('inactive anims rest in their idle pose', () => {
  assert.deepEqual(pose({ anim: 'spin', axis: 'y', speed: 0.8 }, 5, false), { rot: { y: 0 } });
  assert.deepEqual(pose({ anim: 'sway', axis: 'x', amp: 0.04, speed: 1.4 }, 5, false), { rot: { x: 0 } });
  assert.deepEqual(pose({ anim: 'flame', amp: 0.25, speed: 7 }, 5, false), { scaleY: 1 });
  assert.deepEqual(pose({ anim: 'bob', amp: 0.012, roll: 0.025, speed: 1.2 }, 5, false), { y: 0, rot: { z: 0 } });
  assert.deepEqual(pose({ anim: 'steam', idleHidden: true }, 5, false), { visible: false });
});

test('active anims move within their amplitude', () => {
  assert.equal(pose({ anim: 'spin', axis: 'y', speed: 0.8 }, 2, true).rot.y, 1.6);
  for (let t = 0; t < 10; t += 0.37) {
    assert.ok(Math.abs(pose({ anim: 'sway', axis: 'x', amp: 0.04, speed: 1.4 }, t, true).rot.x) <= 0.04 + 1e-9);
    const f = pose({ anim: 'flame', amp: 0.25, speed: 7 }, t, true).scaleY;
    assert.ok(f >= 0.6 - 1e-9 && f <= 1.1 + 1e-9);
    const b = pose({ anim: 'bob', amp: 0.012, roll: 0.025, speed: 1.2 }, t, true);
    assert.ok(Math.abs(b.y) <= 0.012 + 1e-9 && Math.abs(b.rot.z) <= 0.025 + 1e-9);
  }
  assert.deepEqual(pose({ anim: 'steam', idleHidden: true }, 5, true), { visible: true });
});

test('swarm instances stay in their volume and rest when inactive', () => {
  const snowU = { anim: 'snow', top: 2.4, fall: 1.2 };
  const p = { x: 0.3, y: 2.0, z: -0.6, ph: 0.4, sp: 0.2 };
  for (let t = 0; t < 20; t += 0.7) {
    const s = swarmAt(snowU, p, t, true);
    assert.ok(s.y <= 2.4 + 1e-9 && s.y >= 2.4 - 1.2 - 1e-9);
  }
  assert.deepEqual(swarmAt(snowU, p, 7, false), { x: 0.3, y: 2.0, z: -0.6, s: 1 });
  const fly = swarmAt({ anim: 'fireflies' }, { x: 0, y: 0.2, z: 0.11, ph: 1 }, 3, true);
  assert.ok(Math.hypot(fly.x, fly.z) <= 0.11 + 1e-9);
  const g = swarmAt({ anim: 'glint', speed: 2 }, { x: 0.5, y: 0.03, z: 0.2, ph: 2 }, 3, true);
  assert.ok(g.s >= 0 && g.s <= 1);
});

test('steam puffs rise from their base and fade', () => {
  const a = puffAt({ base: [0, 0.6, 0], phase: 0, i: 0 }, { lift: 0.6, speed: 0.5 }, 0.2);
  assert.ok(a.y >= 0.6 && a.y <= 1.2 && a.opacity >= 0 && a.opacity <= 0.55);
});

test('loop drives set fx only over placed decor and load applies the state', () => {
  const g = read('../js/game.js'), fx = read('../js/decor-drops/fx.js');
  assert.match(g, /updatePops\(dt\);\n\s*updateSetFx\(clock\.elapsedTime\);/);
  assert.match(g, /gameState\.drops = normalizeDrops\(saved\.drops\);\n\s*applySetFx\(\);/);
  assert.match(fx, /for \(const m of decorMeshes\)/);
  assert.match(fx, /addEventListener\('decor-set-fx'/);
  assert.doesNotMatch(fx, /scene\.traverse/);
});

test('anim userData never uses keys that updatePops drives scene-wide', () => {
  const pops = read('../js/spaces/fx.js');
  const reserved = [...new Set([...pops.matchAll(/\bu\.(\w+)/g)].map(m => m[1]))];
  for (const f of ['../js/decor-drops/art-kitchen.js', '../js/decor-drops/art-night.js']) {
    const src = read(f);
    for (const m of src.matchAll(/userData = \{([^}]*)\}/g)) {
      const keys = [...m[1].matchAll(/(\w+):/g)].map(k => k[1]);
      for (const k of keys) assert.ok(!reserved.includes(k), `${f} userData.${k} collides with updatePops`);
    }
  }
  const steam = puffAt({ base: [0, 0.17, 0], phase: 0, i: 0 }, { lift: 0.6, speed: 0.5 }, 0.6);
  assert.ok(steam.y > 0.17);
});
