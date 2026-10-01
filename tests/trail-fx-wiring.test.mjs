import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

test('updateTrail 이 fx 를 찍고·흘리고·지운다', () => {
  const src = gameSource();
  assert.match(src, /createTrailFx\(THREE\)/);
  assert.match(src, /trailFx\.onStamp\(id, m\.position, \{ nightLevel \}\)/);
  assert.match(src, /trailFx\.update\(dt, \{ nightLevel \}\)/);
  assert.match(src, /trailFx\.clear\(\)/);
});

test('미리보기도 같은 fx 를 밤 값으로 쓴다', () => {
  const src = readFileSync(new URL('../js/cosmetics/trail-walk.js', import.meta.url), 'utf8');
  assert.match(src, /createTrailFx\(THREE/);
  assert.match(src, /nightLevel: 1/);
});

test('자국 종류가 바뀌면 풀 메시를 dispose 한 뒤 비운다 · 캐릭터 미리보기 무지개 자국은 색을 입힌다', () => {
  const src = gameSource();
  assert.match(src, /for \(const m of trailPool\) m\.traverse\([^\n]*dispose\(\)[^\n]*\n\s*trailPool\.length = 0/);
  assert.match(src, /if \(tid === 'rainbow'\) tintTrailMark\(m, rainbowHex\(/);
});
