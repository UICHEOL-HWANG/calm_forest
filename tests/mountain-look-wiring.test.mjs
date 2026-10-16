import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { applyLook } from '../js/mountain/interior-look.js';
import { MOUNTAIN_THEMES } from '../js/mountain/theme.js';
import { OUT_OF_REACH_FLAGS } from '../js/shadow-scope.js';

const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const space = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a) + a.length));
const dayNight = between(game, 'function updateDayNight(dt)', '\n}\n');
const HOOK = 'if (atMountain) mountainLookFrame({ scene, hemiLight, ambient, sunLight, bloomPass }, dt);';

test('game.js hands the mountain look to one guarded hook at the end of the day-night update', () => {
  assert.equal(game.split('mountainLookFrame(').length - 1, 1);
  assert.ok(dayNight.includes(HOOK));
  const at = dayNight.indexOf(HOOK);
  assert.ok(at > dayNight.indexOf('bloomPass.strength ='), 'after bloom');
  assert.ok(at > dayNight.indexOf('if (atMirror) {'), 'after the other space blocks');
  assert.ok(at < dayNight.indexOf('ui.setTime?.('));
});

function writesOf(env) {
  const writes = new Set();
  const spy = (obj, name) => new Proxy(obj, {
    get(t, k) {
      const v = t[k];
      if (v && typeof v === 'object' && (v.isColor || v.isVector3 || v.isFog || v.isObject3D)) return spy(v, `${name}.${String(k)}`);
      if (typeof v === 'function') return (...a) => { writes.add(`${name}.${String(k)}()`); return v.apply(t, a); };
      return v;
    },
    set(t, k, v) { writes.add(`${name}.${String(k)}`); t[k] = v; return true; },
  });
  return { env: Object.fromEntries(Object.entries(env).map(([k, v]) => [k, v && typeof v === 'object' && !v.isVector3 ? spy(v, k) : v])), writes };
}

test('every global the mountain look writes is rewritten by the village day-night update each frame', () => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 18, 74);
  const { env, writes } = writesOf({
    scene, hemiLight: new THREE.HemisphereLight(), ambient: new THREE.AmbientLight(), sunLight: new THREE.DirectionalLight(),
    bloomPass: { strength: 0.5 }, target: new THREE.Vector3(),
  });
  applyLook(env, MOUNTAIN_THEMES.night, new THREE.Texture());
  const village = {
    'hemiLight.color.setHex()': 'hemiLight.color.setHex(HEMI_SKY)',
    'hemiLight.groundColor.setHex()': 'hemiLight.groundColor.setHex(HEMI_GROUND)',
    'hemiLight.intensity': 'hemiLight.intensity = 0.2 + daylight',
    'ambient.intensity': 'ambient.intensity = 0.2 + nightAmt',
    'sunLight.color.setHex()': 'sunLight.color = sun;',
    'sunLight.intensity': 'sunLight.intensity = (0.1 + daylight',
    'sunLight.target.position.copy()': 'sunLight.target.position.set(shx, 0, shz);',
    'sunLight.position.set()': 'sunLight.position.set(shx +',
    'sunLight.target.updateMatrixWorld()': 'sunLight.target.updateMatrixWorld();',
    'scene.fog.color.setHex()': 'scene.background = sky; scene.fog.color = sky;',
    'scene.fog.near': 'scene.fog.near = 18; scene.fog.far = 74;',
    'scene.fog.far': 'scene.fog.near = 18; scene.fog.far = 74;',
    'scene.background': 'scene.background = sky; scene.fog.color = sky;',
    'bloomPass.strength': 'bloomPass.strength = (0.5 + nightAmt',
  };
  for (const w of writes) {
    if (w.endsWith('.getHex()') || w.endsWith('.clone()')) continue;
    assert.ok(w in village, `unrestored write ${w}`);
    const reset = dayNight.indexOf(village[w]);
    assert.ok(reset >= 0, `village frame never resets ${w}`);
    assert.ok(reset < dayNight.indexOf(HOOK), `${w} reset after the hook`);
  }
  assert.ok(writes.has('scene.background') && writes.has('hemiLight.groundColor.setHex()'));
});

test('village hemisphere colours are constants shared by init and the per-frame reset', () => {
  assert.match(game, /const HEMI_SKY = 0xffffff, HEMI_GROUND = 0xbfe8c9;/);
  assert.match(game, /new THREE\.HemisphereLight\(HEMI_SKY, HEMI_GROUND, 0\.9\)/);
});

test('exiting the mountain drops the look so the next frame is pure village, and nothing else global is touched', () => {
  const exit = between(space, 'export function exitMountain', 'export function clampToMountain');
  assert.match(exit, /\$w\.atMountain = false;\s*look = null;/);
  assert.match(exit, /\$w\.mountainGroup\.visible = false/);
  assert.match(between(space, 'export function enterMountain', 'export function exitMountain'), /look = null;/);
  for (const f of ['spaces/mountain', 'mountain/interior-look', 'mountain/interior-art']) {
    const src = readFileSync(new URL(`../js/${f}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /camera\.far|shadowMap|toneMapping|scene\.fog\s*=|scene\.fog = new/, f);
  }
});

test('interior shadows stay frozen: the mountain keeps the village shadow map off', () => {
  assert.ok(OUT_OF_REACH_FLAGS.includes('atMountain'));
  const art = readFileSync(new URL('../js/mountain/interior-art.js', import.meta.url), 'utf8');
  assert.doesNotMatch(art, /castShadow|receiveShadow/);
});

test('the look frame re-checks the theme on a timer and repaints only when the key changes', () => {
  const frame = between(space, 'export function mountainLookFrame', '\n}\n');
  assert.match(frame, /if \(!look \|\| lookT <= 0\) \{ lookT = THEME_CHECK_S; refreshLook\(ud\); \}/);
  const refresh = between(space, 'function refreshLook', '\n}\n');
  assert.match(refresh, /mountainLook\(\{ timeOfDay: gameState\.timeOfDay, weather: WEATHER \}\)/);
  assert.match(refresh, /if \(next\.key !== look\?\.key\) paintInterior\(/);
  assert.match(refresh, /ud\.snowfall\.visible = next\.snowfall;/);
});
