import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three/three.module.js';

test('interior has a raised telescope, merged books, and one star field/light', () => {
  const file = new URL('../js/observatory/interior.js', import.meta.url);
  assert.ok(existsSync(file));
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const c = vm.createContext({ THREE });
  vm.runInContext(game.slice(game.indexOf('function mergeGeos('), game.indexOf('// 테이퍼 튜브'))
    + readFileSync(file, 'utf8').replace(/^import .*;$/gm, '').replace(/^export /gm, ''), c);
  const hall = c.buildObservatoryInterior(c.mergeGeos, 5.4);
  assert.equal(hall.children.filter(o => o.isPoints).length, 1);
  assert.equal(hall.children.filter(o => o.isPointLight).length, 1);
  assert.ok(hall.children.length <= 12);
  assert.ok(hall.getObjectByName('books').geometry.attributes.color);
  const tube = hall.getObjectByName('telescope');
  tube.geometry.computeBoundingBox();
  assert.ok(tube.geometry.boundingBox.max.y > 2.5);
  assert.ok(tube.geometry.boundingBox.min.z < -1.4);
});

test('look pose pins position and direction each frame and restores tilt', () => {
  const player = new THREE.Object3D(), playerAnchor = new THREE.Object3D();
  playerAnchor.rotation.x = 0.12;
  const classes = new Set();
  const c = vm.createContext({ THREE, player, playerAnchor, $w: {},
    OBSERVATORY: { x: 0, z: 540 }, Input: { setAnalog() {} },
    ui: {}, Sound: { blip() {} }, trackEvent() {},
    document: { body: { classList: { contains: x => classes.has(x), add: x => classes.add(x), remove: x => classes.delete(x) } } },
  });
  vm.runInContext(readFileSync(new URL('../js/spaces/observatory.js', import.meta.url), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\n/g, '').replace(/^export /gm, ''), c);
  c.startObservatoryLook();
  const original = player.position.clone(), yaw = player.rotation.y;
  player.position.x += 1; player.rotation.y += 1;
  c.updateObservatory(0.35, 0);
  assert.ok(player.position.equals(original));
  assert.equal(player.rotation.y, yaw);
  assert.ok(classes.has('menu-open'));
  c.resetLookPose();
  assert.equal(playerAnchor.rotation.x, 0.12);
  assert.equal(classes.has('menu-open'), false);
});
