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
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\n/g, '').replace(/^export /gm, '').replace(/\bimport\(/g, '__import('), c);
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

test('hall furniture is solid once, and the telescope spot stays reachable', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const fn = game.slice(game.indexOf('function solidCircle('), game.indexOf('const houseWindows = [];'));
  const interior = readFileSync(new URL('../js/observatory/interior.js', import.meta.url), 'utf8')
    .replace(/^import .*;$/gm, '').replace(/^export /gm, '');
  const colliders = [];
  const { c } = spaceContext({ colliders, PLAYER_R: 0.42, scene: { add() {} }, mergeGeos: geos => geos[0] });
  vm.runInContext(fn + interior.replace(/function buildObservatoryInterior[\s\S]*$/, '') + '\nthis.TELESCOPE_SPOT = TELESCOPE_SPOT; this.TELESCOPE_EYE = TELESCOPE_EYE;', c);
  c.buildObservatoryInterior = () => new THREE.Group();
  c.ensureObservatoryHall(); c.ensureObservatoryHall();   // second call must not stack colliders
  const n = colliders.length;
  assert.ok(n >= 4, `expected pier + 2 shelves + desk, got ${n}`);
  c.$w.observatoryGroup = null; c.ensureObservatoryHall();
  assert.equal(colliders.length, n, 'rebuilding the group must not add a second set');

  const at = (x, z) => { const p = new THREE.Vector3(x, 0, 540 + z); c.resolveColliders(p); return [p.x, p.z - 540]; };
  const moved = (x, z) => { const [a, b] = at(x, z); return Math.hypot(a - x, b - z) > 0.05; };
  assert.ok(moved(0, 0), 'pier');
  assert.ok(moved(3.5, 1.8), 'desk');
  assert.ok(moved(Math.sin(2.2) * 4.6, Math.cos(2.2) * 4.6), 'right shelf');
  assert.ok(moved(Math.sin(-2.2) * 4.6, Math.cos(-2.2) * 4.6), 'left shelf');
  assert.ok(!moved(c.TELESCOPE_SPOT.x, c.TELESCOPE_SPOT.z), 'telescope prompt spot must stay walkable');
  assert.ok(!moved(c.TELESCOPE_EYE.x, c.TELESCOPE_EYE.z), 'look spot must not be inside a collider');
  assert.ok(!moved(0, 3.4), 'entrance spot');
});

test('star_start fires when the lens view actually opens, not when the bend starts', async () => {
  const events = [], rolls = [], settles = [];
  let opened = null;
  const load = (uiModule) => {
    const player = new THREE.Object3D(), playerAnchor = new THREE.Object3D();
    const classes = new Set();
    const c = vm.createContext({ THREE, player, playerAnchor, $w: {},
      OBSERVATORY: new THREE.Vector3(0, 0, 540), OBSERVATORY_R: 5.4, Input: { setAnalog() {} },
      TELESCOPE: { eye: { x: 0.8, z: 0.65, yaw: 4.04 } },
      ui: { toast() {} }, Sound: { blip() {} }, trackEvent: (name, params) => events.push([name, params]),
      __import: async () => uiModule, starSettle: (...a) => { settles.push(a); return { coins: 0 }; },
      rollDifficulty: game => { rolls.push(game); return { ease: 1.4, dda: 1, arm: 2 }; },
      diffParams: r => ({ ease: r.ease, dda: r.dda, arm: r.arm }),
      document: { body: { classList: { contains: x => classes.has(x), add: x => classes.add(x), remove: x => classes.delete(x) } } },
    });
    vm.runInContext(readFileSync(new URL('../js/spaces/observatory.js', import.meta.url), 'utf8')
      .replace(/import[\s\S]*?from ['"][^'"]+['"];\n/g, '').replace(/^export /gm, '').replace(/\bimport\(/g, '__import('), c);
    return c;
  };
  const c = load({ openStarView: async (opts) => { opened = opts; return {}; } });
  c.startObservatoryLook();
  assert.deepEqual(events.filter(e => e[0] === 'star_start'), [], 'not yet — still bending');
  c.updateObservatory(0.8, 0);
  await new Promise(r => setTimeout(r, 0));
  const starts = events.filter(e => e[0] === 'star_start');
  assert.equal(starts.length, 1);
  assert.equal(starts[0][1].constellation, 'big_dipper');
  assert.equal(starts[0][1].ease, 1.4, 'star_start carries diffParams');
  assert.deepEqual(rolls, ['star']);
  assert.equal(opened.ease, 1.4);
  assert.equal(opened.diff.arm, 2);
  opened.onResult({ score: 10 }, { judges: [] });
  assert.equal(settles.length, 1);
  assert.equal(settles[0][2].arm, 2, 'settle sees the same rolled difficulty');

  events.length = 0;
  const broken = load({});   // ui failed to provide openStarView
  broken.startObservatoryLook(); broken.updateObservatory(0.8, 0);
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(events.filter(e => e[0] === 'star_start'), [], 'no start when the view never opened');
});

test('gate spawns once — a second call does not stack a building or colliders', () => {
  const added = [], colliders = [], obstacles = [];
  const { c } = spaceContext({
    scene: { add: g => added.push(g), remove() {} }, colliders, obstacles,
    OBSERVATORY_GATE: new THREE.Vector3(22, 0, 22), mergeGeos: geos => geos[0],
    buildObservatoryExterior: () => new THREE.Group(),
    solidCircle: (x, z, r) => { const s = { x, z, r }; colliders.push(s); return s; },
  });
  const a = c.spawnObservatoryGate(), b = c.spawnObservatoryGate();
  assert.equal(a, b);
  assert.equal(added.length, 1);
  assert.equal(colliders.length, 1);
  assert.equal(obstacles.length, 1);
});

test('observatoryLensOpen is true only while the opaque lens view is up (3D render can pause)', async () => {
  let opened = null;
  const { c } = spaceContext({
    __import: async () => ({ openStarView: async (opts) => { opened = opts; return {}; } }),
    starSettle: () => ({ coins: 0 }), rollDifficulty: () => ({ ease: 1, dda: 1, arm: 1 }), diffParams: () => ({}),
  });
  assert.equal(c.observatoryLensOpen(), false);
  c.startObservatoryLook();
  assert.equal(c.observatoryLensOpen(), false, 'still bending — the room is visible');
  c.updateObservatory(0.8, 0);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(c.observatoryLensOpen(), true);
  opened.onClose();
  assert.equal(c.observatoryLensOpen(), false);
});

test('game loop skips the 3D render while the lens covers it', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /if \(!observatoryLensOpen\(\)\) composer\.render\(\);/);
});

test('space helpers moved out of game.js: clamp, lighting, action dispatch, minimap marks', () => {
  const { c } = spaceContext();
  // clamp — walkable circle is R − 0.75
  const out = new THREE.Vector3(10, 0, 540); c.clampToObservatory(out);
  assert.ok(Math.abs(out.x - (5.4 - 0.75)) < 1e-9 && out.z === 540);
  const inside = new THREE.Vector3(1, 0, 541); c.clampToObservatory(inside);
  assert.deepEqual(inside.toArray(), [1, 0, 541]);
  // fixed indoor lighting, whatever the time of day (intensity, colour and light position)
  const L = { hemiLight: { intensity: 0 }, ambient: { intensity: 0, color: new THREE.Color() },
    sunLight: { intensity: 0, color: new THREE.Color(), position: new THREE.Vector3(), target: new THREE.Object3D() },
    playerLight: { intensity: 0 }, fog: { color: new THREE.Color(), near: 0, far: 0 } };
  c.applyObservatoryLight(L);
  const LIGHT = vm.runInContext('OBSERVATORY_LIGHT', c);
  assert.equal(L.ambient.intensity, LIGHT.amb);
  assert.equal(L.sunLight.position.z, 540 + 9);
  assert.equal(L.fog.far, LIGHT.far);
  // action dispatch — door, exit, telescope; anything else inside is swallowed
  const calls = [];
  c.enterObservatory = () => calls.push('enter'); c.exitObservatory = () => calls.push('exit');
  c.startObservatoryLook = () => calls.push('look');
  for (const d of ['observatory', 'observatoryexit', 'telescope', null, 'farm']) c.observatoryAction(d);
  assert.deepEqual(calls, ['enter', 'exit', 'look']);
  // minimap: exit at the south wall + telescope
  const marks = []; c.observatoryMinimapMarks(marks);
  assert.equal(marks.length, 2);
  assert.equal(marks[0].kind, 'exit'); assert.equal(marks[0].z, 540 + 5.4);
});
