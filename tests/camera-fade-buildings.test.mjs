import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FADE_MAX_SPAN, FADE_MIN_TOP, fadeCandidatesOf, fadeUnitOf, isFadeMeshBox, isFadeUnitBox, shownInScene, underAny } from '../js/camera-fade.js';

const box = (x0, y0, z0, x1, y1, z1) => ({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 } });
const node = (name, b, extra = {}) => ({ name, visible: true, isMesh: true, children: [], parent: null, _box: b, ...extra });
const group = (name, children, extra = {}) => {
  const g = { name, visible: true, children, parent: null, ...extra };
  children.forEach(c => { c.parent = g; });
  return g;
};
const boxOf = (o) => o._box;

test('walls and roofs reaching above head height are fade candidates', () => {
  assert.equal(isFadeMeshBox(box(-3, 0, -3, 3, 4.5, 3)), true);
  assert.equal(isFadeMeshBox(box(-3, 3, -3, 3, 4.5, 3)), true);
});

test('low props, flat ground and huge terrain are not candidates', () => {
  assert.equal(isFadeMeshBox(box(-1, 0, -1, 1, FADE_MIN_TOP - 0.1, 1)), false);
  assert.equal(isFadeMeshBox(box(-60, -0.1, -60, 60, 0.1, 60)), false);
  assert.equal(isFadeMeshBox(box(0, 0, 0, FADE_MAX_SPAN + 1, 8, 4)), false);
  assert.equal(isFadeMeshBox(box(Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity)), false);
});

test('a building-sized unit fades as a whole, a sprawling one does not', () => {
  assert.equal(isFadeUnitBox(box(-4, 0, -4, 4, 5, 4)), true);
  assert.equal(isFadeUnitBox(box(-30, 0, -4, 30, 5, 4)), false);
});

test('candidates skip hidden subtrees, the skip set, helpers and instanced grass', () => {
  const wall = node('wall', box(-3, 0, -3, 3, 4, 3));
  const hiddenWall = node('hiddenWall', box(-3, 0, -3, 3, 4, 3));
  const house = group('house', [wall]);
  const shop = group('shop', [hiddenWall], { visible: false });
  const player = group('player', [node('body', box(-0.4, 0, -0.4, 0.4, 2.2, 0.4))]);
  const grass = node('grass', box(-5, 0, -5, 5, 3, 5), { isInstancedMesh: true });
  const rain = node('rain', box(-5, 0, -5, 5, 9, 5), { isMesh: false, isLineSegments: true });
  const got = fadeCandidatesOf([house, shop, player, grass, rain], { skip: new Set([player]), boxOf });
  assert.deepEqual(got.map(m => m.name), ['wall']);
});

test('a hit mesh climbs to the object placed directly in the scene', () => {
  const pane = node('pane', null);
  const wall = group('wall', [pane]);
  const house = group('house', [wall]);
  const scene = group('scene', [house]);
  assert.equal(fadeUnitOf(pane, scene), house);
});

test('inside an unlock holder the facility piece is the unit, not the holder', () => {
  const roof = node('roof', null);
  const cafe = group('cafePart', [roof]);
  const holder = group('unlock:cafe', [cafe]);
  const scene = group('scene', [holder]);
  assert.equal(fadeUnitOf(roof, scene), cafe);
  const loose = node('looseWall', null);
  group('unlock:shop', [loose]);
  assert.equal(fadeUnitOf(loose, scene), loose);
});

test('shownInScene is false when any ancestor is hidden', () => {
  const child = node('child', null);
  const root = group('root', [child], { visible: false });
  assert.equal(shownInScene(child), false);
  root.visible = true;
  assert.equal(shownInScene(child), true);
});

test('underAny finds a skipped ancestor so a player parented to a building is never faded', () => {
  const body = node('body', null);
  const player = group('player', [body]);
  group('house', [player]);
  assert.equal(underAny(body, new Set([player])), true);
  assert.equal(underAny(body, new Set()), false);
});

test('game.js restores faded meshes newest first and shares one done set with trees', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const i = src.indexOf('function updateCameraFade()');
  const body = src.slice(i, src.indexOf('\n}\n', i));
  assert.match(body, /for \(let i = _faded\.length - 1; i >= 0; i--\)/);
  assert.ok(body.indexOf('const done = new Set()') < body.indexOf('intersectObjects(trees, true)'));
});

test('game.js fades buildings between the camera and the player', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const i = src.indexOf('function updateCameraFade()');
  const body = src.slice(i, src.indexOf('\n}\n', i));
  assert.match(body, /intersectObjects\(trees, true\)/);
  assert.match(body, /intersectObjects\(_bFade\.meshes, false\)/);
  assert.match(body, /fadeUnitOf\(/);
});
