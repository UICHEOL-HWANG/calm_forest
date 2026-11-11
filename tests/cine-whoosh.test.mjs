import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('시네마틱 시작 세 곳에서 바람 슉이 난다', () => {
  assert.match(read('../js/sound.js'), /cineWhoosh\(\)\s*\{\s*sweep\(0\.5, 380, 2200, 0\.11, 1\.2\)/);
  const goal = read('../js/guide/goal-guide.js');
  assert.match(goal, /document\.body\.classList\.add\('cine-open'\);\n\s*deps\.whoosh\?\.\(\);/);
  const house = read('../js/spaces/house-guide.js');
  assert.match(house, /document\.body\.classList\.add\('cine-open'\);\n\s*deps\.whoosh\?\.\(\);/);
  assert.ok(read('../js/spaces/world-tree.js').includes("document.body.classList.add('cine-open'); Sound.cineWhoosh(); }"));
  const game = read('../js/game.js');
  assert.equal((game.match(/whoosh: \(\) => Sound\.cineWhoosh\(\)/g) || []).length, 2);
});
