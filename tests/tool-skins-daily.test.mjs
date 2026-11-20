import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOL_THEMES, SKIN_TOOLS, themeOf } from '../js/cosmetics/tool-skin-rules.js';
import { SM } from '../js/cosmetics/tool-skins-snowman.js';
import { SQ } from '../js/cosmetics/tool-skins-squirrel.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const FILES = { snowman: '../js/cosmetics/tool-skins-snowman.js', squirrel: '../js/cosmetics/tool-skins-squirrel.js' };

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
  for (const [k, c] of [...Object.entries(SM), ...Object.entries(SQ)]) assert.ok(luma(c) <= 0.85, `${k} ${luma(c).toFixed(3)}`);
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
