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
  assert.ok(tube.geometry.boundingBox.min.x < -1.0, 'tube reaches out from the pier');
});

test('look pose pins position and direction each frame and restores tilt', () => {
  const player = new THREE.Object3D(), playerAnchor = new THREE.Object3D();
  playerAnchor.rotation.x = 0.12;
  const classes = new Set();
  const c = vm.createContext({ THREE, player, playerAnchor, $w: {},
    OBSERVATORY: { x: 0, z: 540 }, Input: { setAnalog() {} }, TELESCOPE: { eye: { x: 0.8, z: 0.65, yaw: 4.04 } }, 
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

function spaceContext(extra = {}) {
  const player = new THREE.Object3D(), playerAnchor = new THREE.Object3D();
  const classes = new Set();
  const c = vm.createContext({ THREE, player, playerAnchor, $w: {},
    OBSERVATORY: new THREE.Vector3(0, 0, 540), OBSERVATORY_R: 5.4, Input: { setAnalog() {} }, TELESCOPE: { eye: { x: 0.8, z: 0.65, yaw: 4.04 } }, 
    ui: {}, Sound: { blip() {} }, trackEvent() {},
    document: { body: { classList: { contains: x => classes.has(x), add: x => classes.add(x), remove: x => classes.delete(x) } } },
    ...extra,
  });
  vm.runInContext(readFileSync(new URL('../js/spaces/observatory.js', import.meta.url), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\n/g, '').replace(/^export /gm, ''), c);
  return { c, player, playerAnchor, classes };
}

test('play camera frames the room centre, not just the player at the door', () => {
  const { c } = spaceContext();
  const centre = new THREE.Vector3(0, 0, 540);
  // entrance spot (south, z+3.4) and the far edges of the walkable circle
  for (const [x, z] of [[0, 543.4], [0, 535.35], [4.65, 540], [-4.65, 540]]) {
    const focus = c.observatoryCamFocus(new THREE.Vector3(x, 0, z), new THREE.Vector3());
    assert.ok(Math.hypot(focus.x - centre.x, focus.z - centre.z) <= 2, `focus for ${x},${z} drifts ${focus.toArray()}`);
  }
  // still follows the player a little so walking feels alive
  const a = c.observatoryCamFocus(new THREE.Vector3(0, 0, 543), new THREE.Vector3());
  const b = c.observatoryCamFocus(new THREE.Vector3(0, 0, 537), new THREE.Vector3());
  assert.ok(a.z - b.z > 1);
});

test('floor reads lighter than the navy wall', () => {
  const file = new URL('../js/observatory/interior.js', import.meta.url);
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const c = vm.createContext({ THREE });
  vm.runInContext(game.slice(game.indexOf('function mergeGeos('), game.indexOf('// 테이퍼 튜브'))
    + readFileSync(file, 'utf8').replace(/^import .*;$/gm, '').replace(/^export /gm, ''), c);
  const hall = c.buildObservatoryInterior(c.mergeGeos, 5.4);
  const hsl = name => hall.getObjectByName(name).material.color.getHSL({}, THREE.SRGBColorSpace);
  assert.ok(hsl('floor').l >= hsl('wall').l + 0.1, `floor ${hsl('floor').l.toFixed(2)} vs wall ${hsl('wall').l.toFixed(2)}`);
});

test('telescope reads as a telescope from the play camera and its eyepiece faces the player spot', () => {
  const file = new URL('../js/observatory/interior.js', import.meta.url);
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const c = vm.createContext({ THREE });
  vm.runInContext(game.slice(game.indexOf('function mergeGeos('), game.indexOf('// 테이퍼 튜브'))
    + readFileSync(file, 'utf8').replace(/^import .*;$/gm, '').replace(/^export /gm, '') + '\nthis.TELESCOPE = TELESCOPE;', c);
  const T = c.TELESCOPE;
  const hall = c.buildObservatoryInterior(c.mergeGeos, 5.4);
  hall.updateMatrixWorld(true);
  const tube = hall.getObjectByName('telescope');
  // geometry really sits where TELESCOPE says (both ends of the tube)
  for (const [x, y, z] of [T.eyepiece, T.objective]) {
    const hit = new THREE.Raycaster(new THREE.Vector3(x, 6, z), new THREE.Vector3(0, -1, 0), 0, 6).intersectObjects([tube, hall.getObjectByName('dark')])[0];
    assert.ok(hit && Math.abs(hit.point.y - y) < 0.35, `no tube at ${[x, y, z]}`);
  }
  // play camera: focus near the centre, offset (0,14,16) — the tube must not collapse to a vertical bar
  const cam = new THREE.PerspectiveCamera(45, 1.6, 0.1, 100);
  cam.position.set(0, 14 + 1.2, 1.4 + 16); cam.lookAt(0, 1.2, 1.4); cam.updateMatrixWorld();
  const a = new THREE.Vector3(...T.eyepiece).project(cam), b = new THREE.Vector3(...T.objective).project(cam);
  const angle = Math.atan2(Math.abs(b.x - a.x) * 1.6, Math.abs(b.y - a.y)) * 180 / Math.PI;
  assert.ok(angle > 35, `tube is ${angle.toFixed(0)}° from vertical on screen`);
  // the look spot is just behind the eyepiece, and its yaw faces down the tube
  const spot = T.eye;
  assert.ok(Math.hypot(spot.x - T.eyepiece[0], spot.z - T.eyepiece[2]) < 0.6);
  const fwd = [Math.sin(spot.yaw), Math.cos(spot.yaw)];
  const dir = [T.objective[0] - spot.x, T.objective[2] - spot.z], len = Math.hypot(...dir);
  assert.ok((fwd[0] * dir[0] + fwd[1] * dir[1]) / len > 0.95, 'player would not face the telescope');
});
