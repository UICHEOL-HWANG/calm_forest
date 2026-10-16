import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOUNTAIN_THEMES, THEME_KEYS, DUSK, THEME_CHECK_S, mountainTheme, mountainLook } from '../js/mountain/theme.js';
import { isNightAt } from '../js/daynight.js';

const PALETTE_KEYS = ['skyTop', 'skyBot', 'fog', 'fogNear', 'fogFar', 'hemiSky', 'hemiGround', 'hemi', 'sun', 'sunI', 'sunDir',
  'snow', 'snowShade', 'track', 'rock', 'path', 'pine', 'pineDark', 'trunk', 'ranges', 'cloud', 'cloudGlow', 'snowfall', 'grade', 'torch'];

test('theme keys are the four approved looks', () => {
  assert.deepEqual([...THEME_KEYS].sort(), ['day', 'dusk', 'night', 'snow']);
  assert.deepEqual(Object.keys(MOUNTAIN_THEMES).sort(), ['day', 'dusk', 'night', 'snow']);
});

test('palettes are deeply frozen and complete', () => {
  assert.ok(Object.isFrozen(MOUNTAIN_THEMES));
  for (const k of THEME_KEYS) {
    const p = MOUNTAIN_THEMES[k];
    assert.ok(Object.isFrozen(p), k);
    assert.ok(Object.isFrozen(p.ranges) && Object.isFrozen(p.sunDir), k);
    for (const f of PALETTE_KEYS) assert.ok(f in p, `${k}.${f}`);
    assert.equal(p.ranges.length, 3);
    assert.ok(p.fogNear < p.fogFar);
  }
  assert.throws(() => { MOUNTAIN_THEMES.day.sky = 1; });
});

const PROTO = {
  day: { skyTop: 0x5fa8e8, skyBot: 0xdff0ff, fog: 0xdcecfb, fogNear: 70, fogFar: 260, hemiSky: 0xd8ecff, hemiGround: 0x8f9cc8, hemi: 0.95, sun: 0xfff3df, sunI: 1.5,
    snow: 0xf7fafd, snowShade: 0xe6eef8, track: 0xffffff, rock: 0x6f7a8c, path: 0xe9dfcf, pine: 0x2f5a3c, pineDark: 0x24472f, ranges: [0x9fb8d8, 0xb9cde6, 0xd3e2f2] },
  dusk: { skyTop: 0xf39a8c, skyBot: 0xffd7a8, fog: 0xf6c9b4, fogNear: 60, fogFar: 240, hemiSky: 0xffd6c0, hemiGround: 0x8c76b8, hemi: 0.9, sun: 0xffb27a, sunI: 1.35,
    snow: 0xfff3ec, snowShade: 0xf0dfe8, track: 0xfffaf6, rock: 0x6c5f78, path: 0xf0d8c6, pine: 0x3d4f52, pineDark: 0x2c3a40, ranges: [0xb07fa8, 0xcf98ab, 0xe8b8b2] },
  snow: { skyTop: 0xa9c2dc, skyBot: 0xe9f1f8, fog: 0xe3ecf5, fogNear: 40, fogFar: 170, hemiSky: 0xe8f1fb, hemiGround: 0xa6b2cf, hemi: 1.05, sun: 0xf6f8ff, sunI: 0.9,
    snow: 0xf9fbfe, snowShade: 0xe9eff7, track: 0xffffff, rock: 0x7d8796, path: 0xe4e0d8, pine: 0x34594a, pineDark: 0x284638, ranges: [0xb5c4d6, 0xc8d5e3, 0xdbe4ee] },
};

test('day, dusk and snow palettes match the approved prototype A, B, C', () => {
  for (const key of ['day', 'dusk', 'snow']) {
    for (const [f, v] of Object.entries(PROTO[key])) assert.deepEqual(MOUNTAIN_THEMES[key][f], v, `${key}.${f}`);
  }
  assert.equal(MOUNTAIN_THEMES.snow.snowfall, true);
  assert.equal(MOUNTAIN_THEMES.day.snowfall, false);
  assert.equal(MOUNTAIN_THEMES.dusk.snowfall, false);
});

test('night is a moonlit variant of day: same ground and pine palette, darker sky, dimmer cool light', () => {
  const d = MOUNTAIN_THEMES.day, n = MOUNTAIN_THEMES.night;
  for (const f of ['snow', 'snowShade', 'track', 'rock', 'path', 'pine', 'pineDark', 'trunk']) assert.equal(n[f], d[f], f);
  const lum = h => ((h >> 16) & 255) * 0.3 + ((h >> 8) & 255) * 0.59 + (h & 255) * 0.11;
  assert.ok(lum(n.skyTop) < lum(d.skyTop) * 0.5);
  assert.ok(lum(n.fog) < lum(d.fog) * 0.5);
  assert.ok(n.sunI < d.sunI * 0.5);
  assert.ok((n.sun & 255) >= ((n.sun >> 16) & 255), 'moon is cool');
});

test('clear daytime is day, the sunset window is dusk, after dark is night', () => {
  assert.equal(mountainTheme({ timeOfDay: 0.5, weather: 'clear' }), 'day');
  assert.equal(mountainTheme({ timeOfDay: 0.3, weather: 'clear' }), 'day');
  assert.equal(mountainTheme({ timeOfDay: 0.7, weather: 'clear' }), 'dusk');
  assert.equal(mountainTheme({ timeOfDay: 0.9, weather: 'clear' }), 'night');
  assert.equal(mountainTheme({ timeOfDay: 0.1, weather: 'clear' }), 'night');
  assert.equal(mountainTheme({ timeOfDay: 0, weather: 'clear' }), 'night');
});

test('dusk window boundaries are half-open', () => {
  const eps = 1e-6;
  assert.equal(mountainTheme({ timeOfDay: DUSK.from - eps, weather: 'clear' }), 'day');
  assert.equal(mountainTheme({ timeOfDay: DUSK.from, weather: 'clear' }), 'dusk');
  assert.equal(mountainTheme({ timeOfDay: DUSK.to - eps, weather: 'clear' }), 'dusk');
  assert.equal(mountainTheme({ timeOfDay: DUSK.to, weather: 'clear' }), 'night');
  assert.ok(isNightAt(DUSK.to) && !isNightAt(DUSK.from), 'dusk spans the evening night boundary');
});

test('morning night boundary follows the game night rule', () => {
  for (let i = 0; i < 660; i++) {
    const t = i / 1000;
    assert.equal(mountainTheme({ timeOfDay: t, weather: 'clear' }), isNightAt(t) ? 'night' : 'day', `t ${t}`);
  }
});

test('snow weather wins over day and dusk, night stays moonlit with falling snow', () => {
  assert.equal(mountainTheme({ timeOfDay: 0.5, weather: 'snow' }), 'snow');
  assert.equal(mountainTheme({ timeOfDay: 0.7, weather: 'snow' }), 'snow');
  assert.equal(mountainTheme({ timeOfDay: 0.9, weather: 'snow' }), 'night');
  assert.deepEqual(mountainLook({ timeOfDay: 0.9, weather: 'snow' }), { key: 'night', snowfall: true });
  assert.deepEqual(mountainLook({ timeOfDay: 0.5, weather: 'snow' }), { key: 'snow', snowfall: true });
  assert.deepEqual(mountainLook({ timeOfDay: 0.5, weather: 'clear' }), { key: 'day', snowfall: false });
  assert.deepEqual(mountainLook({ timeOfDay: 0.9, weather: 'clear' }), { key: 'night', snowfall: false });
});

test('only the night theme gets the night colour grade and the torch', () => {
  for (const k of ['day', 'dusk', 'snow']) {
    assert.equal(MOUNTAIN_THEMES[k].grade, 0, k);
    assert.equal(MOUNTAIN_THEMES[k].torch, 0, k);
  }
  assert.ok(MOUNTAIN_THEMES.night.grade > 0.15 && MOUNTAIN_THEMES.night.grade <= 0.5);
  assert.ok(MOUNTAIN_THEMES.night.torch > 0 && MOUNTAIN_THEMES.night.torch <= 2);
});

test('rain and fog follow the time of day', () => {
  assert.equal(mountainTheme({ timeOfDay: 0.5, weather: 'rain' }), 'day');
  assert.equal(mountainTheme({ timeOfDay: 0.7, weather: 'fog' }), 'dusk');
  assert.equal(mountainTheme({ timeOfDay: 0.95, weather: 'rain' }), 'night');
});

test('time wraps outside 0..1 and bad input falls back to day', () => {
  assert.equal(mountainTheme({ timeOfDay: 1.5, weather: 'clear' }), 'day');
  assert.equal(mountainTheme({ timeOfDay: -0.3, weather: 'clear' }), 'dusk');
  assert.equal(mountainTheme({ timeOfDay: NaN, weather: 'clear' }), 'day');
  assert.equal(mountainTheme({}), 'day');
});

test('theme is re-checked a few times per second at most', () => {
  assert.ok(THEME_CHECK_S >= 0.2 && THEME_CHECK_S <= 1);
});
