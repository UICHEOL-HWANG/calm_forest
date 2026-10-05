// 🔭 실내 미니맵 — 라벨·바닥색·랜드마크가 천문대를 안다(전엔 기본값 '🌾 텃밭'·풀색으로 떨어졌다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { EN } from '../js/i18n-en.js';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const expr = (re) => { const m = re.exec(HTML); assert.ok(m, `${re} not found`); return m[1]; };
const evalFor = (src, place) => new Function('d', 't', `return (${src});`)({ place }, s => s);

test('minimap label and floor for the observatory are its own, not the farm default', () => {
  const label = expr(/ctx\.fillText\(t\((d\.place === 'house'[^\n]*?)\), S \/ 2/);
  const floor = expr(/const floor = (d\.place === 'house'[^\n]*?);/);
  assert.equal(evalFor(label, 'observatory'), '🔭 천문대');
  assert.notEqual(evalFor(floor, 'observatory'), evalFor(floor, 'farm'));
  assert.ok(EN['🔭 천문대'], 'English label');
});

test('minimap marks come from the observatory module (exit + telescope — behaviour in observatory-interior)', () => {
  const src = gameSource();
  const body = src.slice(src.indexOf('function minimapMarks('), src.indexOf('function minimapMarks(') + 6000);
  assert.match(body, /place === 'observatory'\) \{ observatoryMinimapMarks\(marks\);/);
});
