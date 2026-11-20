import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOL_THEMES, SKIN_TOOLS, themeOf } from '../js/cosmetics/tool-skin-rules.js';
import { SM } from '../js/cosmetics/tool-skins-snowman.js';
import { SQ } from '../js/cosmetics/tool-skins-squirrel.js';
import { CD } from '../js/cosmetics/tool-skins-candy.js';
import { OC } from '../js/cosmetics/tool-skins-octopus.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const FILES = { snowman: '../js/cosmetics/tool-skins-snowman.js', squirrel: '../js/cosmetics/tool-skins-squirrel.js', candy: '../js/cosmetics/tool-skins-candy.js', octopus: '../js/cosmetics/tool-skins-octopus.js' };

test('⛄🐿️ 오늘의 픽 도구 테마 — 규칙 표에 있고 카탈로그 id 로 찾힌다', () => {
  for (const t of Object.keys(FILES)) {
    assert.ok(TOOL_THEMES.includes(t), t);
    assert.equal(themeOf(`tools_${t}`), t);
  }
});

test('⛄🐿️ 9종 전부 + 우산 · tool-skins.js 에 frost 처럼 배선(굽기 bake 경로 공유)', () => {
  const ts = read('../js/cosmetics/tool-skins.js');
  for (const [t, f] of Object.entries(FILES)) {
    const src = read(f), UP = t.toUpperCase();
    assert.match(src, new RegExp(`export function ${t}Themes\\(THREE, K, X\\)`));
    const body = src.slice(src.indexOf(`${t}: {`), src.indexOf(`export const ${UP}_UMBRELLA`));
    for (const tool of SKIN_TOOLS) assert.match(body, new RegExp(`\\b${tool}\\(g\\)`), `${t}.${tool}`);
    assert.match(ts, new RegExp(`import \\{ ${t}Themes, ${UP}_UMBRELLA, ${t}UmbrellaLook \\} from './tool-skins-${t}\\.js'`));
    assert.match(ts, new RegExp(`\\[${t}Themes, ${t}UmbrellaLook, '${t}'\\]`));
    assert.match(ts, new RegExp(`${t}: ${UP}_UMBRELLA`));
  }
});

test('⛄🐿️ 넓은 면 색은 블룸 임계 0.85 이하 · 발광 없음', () => {
  for (const [k, c] of [...Object.entries(SM), ...Object.entries(SQ), ...Object.entries(CD), ...Object.entries(OC)]) assert.ok(luma(c) <= 0.85, `${k} ${luma(c).toFixed(3)}`);
  for (const f of Object.values(FILES)) assert.doesNotMatch(read(f), /glow:/);
});

test('⛄🐿️ 주석 없음 · 쥐기·스윙 상수는 건드리지 않는다', () => {
  for (const f of Object.values(FILES)) {
    const src = read(f);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
    assert.doesNotMatch(src, /TOOL_GRIP|TOOL_QREST|SLASH|slashPhase/);
  }
});

test('🐿️ 꼬리는 발바닥이 쥐는 자루 아래쪽(y < 0.18)을 피해 위에서 시작한다', () => {
  const src = read(FILES.squirrel);
  const starts = [...src.matchAll(/\btail\(g, ([\d.]+),/g)].map(m => +m[1]);
  assert.ok(starts.length >= 5);
  for (const y of starts) assert.ok(y >= 0.18, `tail y0 ${y}`);
});

test('🍬🐙 umbrella look covers outer·inner·shaft·deco·finial and the theme order ends with candy·octopus', () => {
  assert.deepEqual(TOOL_THEMES.slice(-4), ['snowman', 'squirrel', 'candy', 'octopus']);
  for (const t of ['candy', 'octopus']) {
    const src = read(FILES[t]);
    const look = src.slice(src.indexOf(`export function ${t}UmbrellaLook`));
    for (const k of ['outer:', 'inner:', 'shaft()', 'deco(', 'finial(']) assert.ok(look.includes(k), `${t} ${k}`);
  }
});

test('🍬 handle stripes stay inside the grip skip radius', () => {
  const src = read(FILES.candy);
  assert.match(src, /r \* 0\.32, 4/);
  assert.match(src, /r \* 0\.82\)/);
});

test('🐙 tentacles stay off the grip: every handle tool hangs its tentacles at top-relative y ≥ 0.18', () => {
  const src = read(FILES.octopus);
  const body = src.slice(src.indexOf('octopus: {'), src.indexOf('export const OCTOPUS_UMBRELLA'));
  for (const tool of ['axe', 'hoe', 'sickle', 'shovel', 'hammer']) {
    const fn = body.slice(body.indexOf(`${tool}(g)`), body.indexOf('g.scale', body.indexOf(`${tool}(g)`)));
    const top = { axe: 0.44, hoe: 0.44, sickle: 0.22, shovel: 0.5, hammer: 0.42 }[tool];
    const ys = [...fn.matchAll(/\b(top|cy|y)(?: ([-+]) ([\d.]+))?, /g)].map(m => (m[1] === 'top' ? top : top - 0.04) + (m[2] === '-' ? -1 : 1) * (+m[3] || 0));
    assert.ok(ys.length > 0, tool);
    for (const y of ys) assert.ok(y >= 0.18, `${tool} y ${y.toFixed(3)}`);
  }
});
