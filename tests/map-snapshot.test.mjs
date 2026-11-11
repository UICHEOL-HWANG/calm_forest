import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
const addonsUrl = new URL('../vendor/three/addons/', import.meta.url).href;
register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : s.startsWith('three/addons/') ? { url: '${addonsUrl}' + s.slice(13), shortCircuit: true } : n(s, c);`);

const THREE = await import('../vendor/three/three.module.js');
const { MAP_VIEW } = await import('../js/world/village-map.js');
const S = await import('../js/world/map-snapshot.js');

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const toPixel = (cam, x, z, size) => {
  const v = new THREE.Vector3(x, 0, z).project(cam);
  return [(v.x + 1) / 2 * size, (1 - v.y) / 2 * size];
};

test('the map camera frame covers MAP_VIEW exactly from straight above with north up', () => {
  const f = S.mapCameraFrame(MAP_VIEW);
  assert.equal(f.right - f.left, MAP_VIEW.w);
  assert.equal(f.top - f.bottom, MAP_VIEW.h);
  assert.deepEqual(f.up, [0, 0, -1]);
  assert.equal(f.position[0], f.target[0]);
  assert.equal(f.position[2], f.target[2]);
  assert.ok(f.position[1] > 60 && f.target[1] === 0);
  assert.ok(f.far > f.position[1] && f.near > 0);
});

test('a world point lands on the same pixel the painted map uses', () => {
  const cam = S.makeMapCamera(THREE, MAP_VIEW);
  const size = 1024, K = size / MAP_VIEW.w;
  const pts = [[0, 0], [MAP_VIEW.x0, MAP_VIEW.z0], [MAP_VIEW.x0 + MAP_VIEW.w, MAP_VIEW.z0 + MAP_VIEW.h], [16, 9], [-15, -36], [33, 7]];
  for (const [x, z] of pts) {
    const [u, v] = toPixel(cam, x, z, size);
    assert.ok(Math.abs(u - (x - MAP_VIEW.x0) * K) < 1e-6, `u ${x},${z}`);
    assert.ok(Math.abs(v - (z - MAP_VIEW.z0) * K) < 1e-6, `v ${x},${z}`);
  }
  const [, north] = toPixel(cam, 0, -30, size), [, south] = toPixel(cam, 0, 30, size);
  assert.ok(north < south, 'north (-z) is up');
  const [west] = toPixel(cam, -30, 0, size), [east] = toPixel(cam, 30, 0, size);
  assert.ok(west < east, 'east (+x) is right');
});

test('the snapshot size is 1024 on desktop and 640 on mobile', () => {
  assert.equal(S.shotSize(false), 1024);
  assert.equal(S.shotSize(true), 640);
});

test('flipRows turns the bottom-up readback into a top-down image', () => {
  const w = 2, h = 3;
  const src = new Uint8Array(w * h * 4).map((_, i) => Math.floor(i / (w * 4)));
  const out = S.flipRows(src, w, h);
  assert.ok(out instanceof Uint8ClampedArray);
  assert.deepEqual([...out.slice(0, 8)], Array(8).fill(2));
  assert.deepEqual([...out.slice(16)], Array(8).fill(0));
  assert.deepEqual([...src.slice(0, 8)], Array(8).fill(0), 'source untouched');
});

test('the map signature changes with unlocks, outdoor decor, house stage and season only', () => {
  const base = { season: 'autumn', houseStage: 3, unlocks: new Set(['bridge', 'coop']), outdoor: [{ id: 'fence', x: 1, z: 2, rot: 0 }] };
  const sig = S.mapSignature(base);
  assert.equal(S.mapSignature({ ...base, unlocks: new Set(['coop', 'bridge']) }), sig, 'unlock order is irrelevant');
  assert.equal(S.mapSignature({ ...base, outdoor: [{ id: 'fence', x: 1.01, z: 2, rot: 0 }] }), sig, 'sub-decimetre jitter is irrelevant');
  for (const changed of [
    { unlocks: new Set(['bridge']) },
    { outdoor: [] },
    { outdoor: [{ id: 'fence', x: 4, z: 2, rot: 0 }] },
    { outdoor: [{ id: 'fence', x: 1, z: 2, rot: 1 }] },
    { outdoor: [{ id: 'lamp', x: 1, z: 2, rot: 0 }] },
    { houseStage: 4 },
    { season: 'winter' },
  ]) assert.notEqual(S.mapSignature({ ...base, ...changed }), sig, JSON.stringify(Object.keys(changed)));
  assert.equal(typeof S.mapSignature({ season: 'spring', houseStage: 0, unlocks: null, outdoor: [] }), 'string');
});

test('transients hide sprites, particles, glow rings and given groups but never lights', () => {
  const scene = new THREE.Scene();
  const house = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const sign = new THREE.Sprite(new THREE.SpriteMaterial());
  const dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
  const glow = new THREE.Mesh(new THREE.RingGeometry(1, 2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  const solidRing = new THREE.Mesh(new THREE.RingGeometry(1, 2), new THREE.MeshStandardMaterial());
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const player = new THREE.Group(), body = new THREE.Mesh(), torch = new THREE.PointLight();
  player.add(body, torch);
  const npc = new THREE.Group(); npc.add(new THREE.Mesh());
  const off = new THREE.Sprite(new THREE.SpriteMaterial()); off.visible = false;
  scene.add(house, sign, dust, glow, solidRing, halo, player, npc, off);
  const hidden = S.collectTransients(scene, [player, npc, null]);
  for (const o of [sign, dust, glow, halo, body, npc]) assert.ok(hidden.includes(o), o.type);
  for (const o of [house, solidRing, player, torch, off]) assert.ok(!hidden.includes(o), o.type);
  assert.equal(new Set(hidden).size, hidden.length);
});

test('game.js wires the snapshot module in a few lines', () => {
  const game = read('js/game.js');
  assert.match(game, /from '\.\/world\/map-snapshot\.js'/);
  const lines = game.split('\n').filter(l => /MapSnapshot|map-snapshot/.test(l));
  assert.ok(lines.length >= 3 && lines.length <= 5, lines.join('\n'));
  assert.match(game, /initMapSnapshot\(\{/);
  assert.match(game, /tickMapSnapshot\(place === 'village'/);
  assert.match(game, /ui\.setMapSnapshot\?\.\(/);
  assert.match(game, /try \{ timeOfDay = 0\.5; dayPaused = true; updateDayNight\(0\); fn\(\); \} finally \{ timeOfDay = t0; dayPaused = p0; updateDayNight\(0\); \}/);
  assert.doesNotMatch(read('js/world/map-snapshot.js'), /WebGLRenderer\(/);
  assert.doesNotMatch(read('js/world/map-snapshot.js'), /from '\.\.\/game\.js'/);
});

test('the snapshot renders with the shared renderer, restores its state and falls back on failure', () => {
  const src = read('js/world/map-snapshot.js');
  for (const k of ['getRenderTarget()', 'readRenderTargetPixels', 'setRenderTarget(prev', 'getViewport(', 'setViewport(', 'fog.near', 'fog.far', 'shadowMap.needsUpdate', 'catch', 'dispose()', 'OutputPass', 'compileAsync', 'NoToneMapping', 'renderer.toneMapping = toneMapping']) assert.ok(src.includes(k), k);
  assert.doesNotMatch(src, /scene\.fog = null/);
  assert.doesNotMatch(src, /shadowMap\.enabled =/);
  assert.doesNotMatch(src, /composer/);
});

test('index.html draws the snapshot clipped to the land outline with the picture-book filter', () => {
  const html = read('index.html');
  assert.equal((html.match(/<script type="module"/g) || []).length, 3);
  assert.match(html, /requestMapSnapshot \} from '\.\/js\/game-lazy\.js';/);
  assert.match(read('js/game-lazy.js'), /export const requestMapSnapshot = \(\.\.\.a\) => need\(\)\.snap\.requestMapSnapshot\(\.\.\.a\);/);
  assert.match(html, /setMapSnapshot\(img\) \{/);
  assert.doesNotMatch(html, /\b(c|ctx)\.filter\s*=/, 'no canvas filter: iOS WKWebView lacks it');
  assert.doesNotMatch(html, /MAP_FILTER|saturate\(1\.55\)/);
  assert.match(html, /c\.clip\(\)/);
  assert.match(html, /c\.drawImage\(mapShot, /);
  assert.match(html, /requestMapSnapshot\(\);\s*\n\s*drawWorldMap\(\);/);
  const mini = html.slice(html.indexOf('setMinimap(d) {'), html.indexOf('setIndoor(on) {'));
  assert.ok(mini.length > 0);
  assert.doesNotMatch(mini, /paintIsland\(|\.clip\(\)/, 'the minimap tick never repaints or clips the island');
  assert.match(mini, /ctx\.drawImage\(bakeMiniIsland\(need\), 0, 0, S, S\);/);
  assert.match(html, /function bakeMiniIsland\(size\) \{\n\s*if \(miniIsland && miniIsland\.width === size\) return miniIsland;/);
  assert.match(html, /mapShot = img; miniIsland = null;/);
  const paint = html.slice(html.indexOf('function paintIsland('), html.indexOf('function drawWorldMap('));
  assert.ok(paint.indexOf('MAP_SHORE') < paint.indexOf('drawImage'), 'snapshot goes over the sand fringe');
  assert.ok(paint.indexOf('MAP_LAND') < paint.indexOf('drawImage'), 'clipped to the land outline');
  assert.match(paint, /rgba\(255,255,255,0?\.75\)/);
});

test('the snapshot waits for play, precompiles, retakes only after a settled change and survives failures', async () => {
  globalThis.ImageData ??= class { constructor(data, w, h) { Object.assign(this, { data, width: w, height: h }); } };
  globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ({ putImageData() {} }) }) };
  const calls = { compile: 0, shots: 0, onShot: 0, renders: 0 };
  let sig = 'a', fail = true, target = null;
  const renderer = {
    autoClear: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1, outputColorSpace: THREE.SRGBColorSpace, shadowMap: { autoUpdate: true, needsUpdate: false },
    getRenderTarget: () => target, setRenderTarget: t => { target = t; }, getViewport: v => v.set(0, 0, 800, 600), setViewport: () => {},
    clear: () => {}, render: () => { calls.renders++; }, readRenderTargetPixels: () => {},
    extensions: { has: () => true }, compile: () => { throw new Error('sync compile with the extension'); },
    compileAsync: () => { calls.compile++; return Promise.resolve(); },
  };
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 18, 74);
  const sun = new THREE.DirectionalLight(), hemi = new THREE.HemisphereLight();
  sun.position.set(-18, 2, 8); sun.intensity = 0.4; hemi.intensity = 0.3;
  scene.add(sun, sun.target, hemi);
  const sign = new THREE.Sprite(new THREE.SpriteMaterial()); scene.add(sign);
  const player = new THREE.Group(); player.add(new THREE.Mesh()); scene.add(player);
  let seen = null;
  S.initMapSnapshot({
    renderer, scene, mobile: true, sunLight: sun, hemiLight: hemi, onShot: c => { calls.onShot++; seen = c; },
    transients: () => [player], signature: () => sig,
    daylight: fn => { calls.shots++; if (fail) throw new Error('readback'); fn(); },
  });
  const flush = () => new Promise(r => setTimeout(r, 0));
  S.tickMapSnapshot(false, 0);
  S.tickMapSnapshot(true, 100);
  S.tickMapSnapshot(true, 100 + S.FIRST_SHOT_DELAY - 1);
  assert.equal(calls.compile, 0, 'not before the first-shot delay');
  S.tickMapSnapshot(true, 100 + S.FIRST_SHOT_DELAY);
  assert.equal(calls.compile, 1);
  S.tickMapSnapshot(true, 2200);
  assert.equal(calls.shots, 0, 'not while shaders compile');
  await flush();
  S.tickMapSnapshot(false, 2300);
  assert.equal(calls.shots, 0, 'not outside the village');
  S.tickMapSnapshot(true, 2400);
  assert.equal(calls.shots, 0, 'the first-shot delay restarts after leaving the village');
  S.tickMapSnapshot(true, 2400 + S.FIRST_SHOT_DELAY);
  assert.equal(calls.shots, 1);
  assert.equal(calls.onShot, 0, 'a failed readback keeps the painted map');
  assert.match(S.mapSnapshotInfo().error, /readback/);
  S.tickMapSnapshot(true, 9000);
  assert.equal(calls.compile, 1, 'a failed shot waits a stable period before retrying');
  fail = false;
  S.tickMapSnapshot(true, 9000 + S.DIRTY_SETTLE - 1);
  assert.equal(calls.compile, 1, 'still settling');
  S.tickMapSnapshot(true, 10000 + S.DIRTY_SETTLE + S.SIGNATURE_EVERY);
  assert.equal(calls.compile, 2);
  await flush();
  S.tickMapSnapshot(true, 14100);
  assert.equal(calls.shots, 2);
  assert.equal(S.mapSnapshotInfo().error, null);
  assert.equal(calls.onShot, 1);
  assert.equal(seen.width, S.shotSize(true));
  assert.ok(calls.renders >= 2, 'scene and output pass');
  assert.equal(S.mapSnapshotInfo().has, true);
  assert.equal(S.mapSnapshotInfo().error, null);
  assert.equal(target, null);
  assert.equal(renderer.autoClear, false);
  assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping);
  assert.equal(renderer.shadowMap.needsUpdate, true);
  assert.deepEqual([scene.fog.near, scene.fog.far], [18, 74]);
  assert.deepEqual(sun.position.toArray(), [-18, 2, 8]);
  assert.deepEqual(sun.target.position.toArray(), [0, 0, 0]);
  assert.deepEqual([sun.intensity, hemi.intensity], [0.4, 0.3]);
  assert.ok(sign.visible && player.children[0].visible, 'transients come back');
  S.requestMapSnapshot();
  assert.equal(calls.compile, 2, 'opening the map with nothing changed does not re-render');
  sig = 'c';
  S.requestMapSnapshot();
  assert.equal(calls.compile, 3, 'opening the map after a change starts a fresh shot');
  await flush();
  S.tickMapSnapshot(true, 14200);
  assert.equal(calls.shots, 3);
  renderer.extensions.has = () => false;
  renderer.compile = () => { calls.compile++; return new Set(); };
  renderer.compileAsync = () => { throw new Error('compileAsync warns without the extension'); };
  sig = 'd';
  S.requestMapSnapshot();
  assert.equal(calls.compile, 4, 'falls back to a plain compile');
  await flush();
  S.tickMapSnapshot(true, 14300);
  assert.equal(calls.shots, 4);
  assert.equal(S.mapSnapshotInfo().error, null);
});

test('the picture-book tone follows the CSS saturate, brightness and contrast formulae in order', () => {
  const near = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-6, `${a} vs ${b}`));
  assert.deepEqual(S.BOOK_TONE, { saturate: 1.55, brightness: 1.16, contrast: 1.08 });
  near(S.saturate([100, 100, 100], 1.55), [100, 100, 100]);
  near(S.saturate([200, 100, 50], 1.55), [245.265, 90.265, 12.765]);
  near(S.saturate([10, 240, 10], 1.55), [0, 255, 0]);
  near(S.brightness([100, 50, 250], 1.16), [116, 58, 255]);
  near(S.contrast([127.5, 0, 255], 1.08), [127.5, 0, 255]);
  near(S.contrast([116, 200, 20], 1.08), [115.08, 205.8, 11.4]);
  const px = new Uint8ClampedArray([200, 100, 50, 77, 100, 100, 100, 255, 0, 0, 0, 0, 255, 255, 255, 128]);
  const out = S.bookTone(px);
  assert.notEqual(out, px);
  assert.deepEqual([...out], [255, 103, 6, 77, 115, 115, 115, 255, 0, 0, 0, 0, 255, 255, 255, 128]);
  assert.deepEqual([...px.slice(0, 4)], [200, 100, 50, 77], 'source untouched');
  const chain = rgb => S.contrast(S.brightness(S.saturate(rgb, 1.55), 1.16), 1.08).map(Math.round);
  const many = new Uint8ClampedArray(4 * 512).map((_, i) => (i * 37 + (i >> 2) * 11) % 256);
  const toned = S.bookTone(many);
  for (let i = 0; i < many.length; i += 4) assert.deepEqual([...toned.slice(i, i + 3)], chain([many[i], many[i + 1], many[i + 2]]), `pixel ${i / 4}`);
});

test('the shot hands the toned pixels to the UI and drops the raw canvas', async () => {
  const src = read('js/world/map-snapshot.js');
  assert.match(src, /bookTone\(flipRows\(/);
  assert.doesNotMatch(src, /shot = canvas/);
});

test('a failed retake retries after the next stable period, a few times only', async () => {
  let sig = 'a', fail = false, shots = 0, target = null;
  const renderer = {
    autoClear: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1, outputColorSpace: THREE.SRGBColorSpace, shadowMap: { autoUpdate: true, needsUpdate: false },
    getRenderTarget: () => target, setRenderTarget: t => { target = t; }, getViewport: v => v, setViewport: () => {},
    clear: () => {}, render: () => {}, readRenderTargetPixels: () => {},
    extensions: { has: () => true }, compileAsync: () => Promise.resolve(),
  };
  const scene = new THREE.Scene();
  const sun = new THREE.DirectionalLight(), hemi = new THREE.HemisphereLight();
  scene.add(sun, sun.target, hemi);
  S.initMapSnapshot({ renderer, scene, mobile: true, sunLight: sun, hemiLight: hemi, onShot: () => {}, transients: () => [], signature: () => sig,
    daylight: fn => { shots++; if (fail) throw new Error('lost'); fn(); } });
  const flush = () => new Promise(r => setTimeout(r, 0));
  let now = 100000;
  const step = async ms => { now += ms; S.tickMapSnapshot(true, now); await flush(); S.tickMapSnapshot(true, now); };
  sig = 'b'; fail = true;
  const before = shots;
  for (let i = 0; i < 12; i++) await step(S.SIGNATURE_EVERY + S.DIRTY_SETTLE);
  const tries = shots - before;
  assert.ok(tries >= 2, `retried after a failure (${tries})`);
  assert.ok(tries <= S.MAX_RETRIES + 1, `gives up after a few tries (${tries})`);
  fail = false; sig = 'c';
  for (let i = 0; i < 3; i++) await step(S.SIGNATURE_EVERY + S.DIRTY_SETTLE);
  assert.equal(S.mapSnapshotInfo().error, null, 'a real change tries again');
});

test('a compile that never settles times out and the shot still happens', async () => {
  let sig = 'x', shots = 0, target = null, pending = 0;
  const renderer = {
    autoClear: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1, outputColorSpace: THREE.SRGBColorSpace, shadowMap: { autoUpdate: true, needsUpdate: false },
    getRenderTarget: () => target, setRenderTarget: t => { target = t; }, getViewport: v => v, setViewport: () => {},
    clear: () => {}, render: () => {}, readRenderTargetPixels: () => {},
    extensions: { has: () => true }, compileAsync: () => { pending++; return new Promise(() => {}); },
  };
  const scene = new THREE.Scene();
  const sun = new THREE.DirectionalLight(), hemi = new THREE.HemisphereLight();
  scene.add(sun, sun.target, hemi);
  S.initMapSnapshot({ renderer, scene, mobile: true, sunLight: sun, hemiLight: hemi, onShot: () => {}, transients: () => [], signature: () => sig,
    daylight: fn => { shots++; fn(); } });
  let now = 500000;
  sig = 'y';
  S.tickMapSnapshot(true, now);
  now += S.SIGNATURE_EVERY + S.DIRTY_SETTLE; S.tickMapSnapshot(true, now);
  S.tickMapSnapshot(true, now + 100);
  assert.equal(pending, 1);
  assert.equal(S.mapSnapshotInfo().phase, 'compiling');
  now += S.COMPILE_TIMEOUT - 1; S.tickMapSnapshot(true, now);
  assert.equal(shots, 0);
  now += 2; S.tickMapSnapshot(true, now);
  S.tickMapSnapshot(true, now + 1);
  assert.equal(shots, 1, 'timed out compile falls through to the shot');
  assert.equal(S.mapSnapshotInfo().phase, 'idle');
});

test('shootMapNow: 준비 전엔 아무것도 안 하고, game.js 는 가림막 뒤에서 첫 사진을 찍는다', async () => {
  const fresh = await import(`../js/world/map-snapshot.js?fresh=${Date.now()}`);
  assert.equal(await fresh.shootMapNow(), false);
  const src = read('js/world/map-snapshot.js');
  const fn = src.slice(src.indexOf('export async function shootMapNow('));
  assert.match(fn, /await compileFor\(\);/);
  assert.match(fn, /takeShot\(performance\.now\(\)\);/);
  assert.match(read('js/game.js'), /warm: async \(\) => \{ await warmShaders\(renderer, scene, camera\); await shootMapNow\(\); \}/);
});
