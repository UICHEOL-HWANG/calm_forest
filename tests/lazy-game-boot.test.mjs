import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bundleBoot } from '../scripts/lib/bundle-boot.mjs';

const HEAVY = [
  'game.js', 'duel/index.js', 'boat-chest-reveal.js', 'controls.js', 'push-ui.js',
  'cafe-guests.js', 'night-visit.js', 'decor-drops/index.js', 'data/places.js',
];
const BOOT_KB_LIMIT = 650;

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const staticImports = [...html.matchAll(/^\s*import\s[^;]*?from\s+'(\.\/js\/[^']+)'/gm)].map(m => m[1]);

test('index.html does not statically import the game or modules that pull it in', () => {
  for (const h of HEAVY) {
    assert.ok(!staticImports.includes(`./js/${h}`), `static import of ./js/${h}`);
  }
});

test('game modules are loaded through js/game-lazy.js', () => {
  assert.ok(staticImports.includes('./js/game-lazy.js'));
  const lazy = readFileSync(new URL('../js/game-lazy.js', import.meta.url), 'utf8');
  for (const h of HEAVY.filter(h => h !== 'data/places.js')) {
    assert.ok(lazy.includes(`import('./${h}')`), h);
  }
});

test('first-screen bundle has no three.js and stays under the size limit', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cf-lazy-'));
  try {
    cpSync('index.html', path.join(dir, 'index.html'));
    cpSync('js', path.join(dir, 'js'), { recursive: true });
    const { bootFiles, metafile } = await bundleBoot(dir);
    const inputs = bootFiles.flatMap(f => Object.keys(metafile.outputs[f].inputs));
    assert.ok(!inputs.some(f => f.includes('vendor/three')), 'three.js is in the first-screen bundle');
    assert.ok(!inputs.some(f => f.endsWith('js/game.js')), 'game.js is in the first-screen bundle');
    const kb = Math.round(bootFiles.reduce((s, f) => s + metafile.outputs[f].bytes, 0) / 1024);
    assert.ok(kb <= BOOT_KB_LIMIT, `first-screen JS ${kb}KB > ${BOOT_KB_LIMIT}KB`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const WRAPPERS = [...readFileSync(new URL('../js/game-lazy.js', import.meta.url), 'utf8')
  .matchAll(/^export const (\w+) = \(/gm)].map(m => m[1]).filter(n => n !== 'loadGameModules');
const script = html.slice(html.indexOf("from './js/game-lazy.js';"))
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

test('every call wrapper points at a real function, not a live value', () => {
  const lazy = readFileSync(new URL('../js/game-lazy.js', import.meta.url), 'utf8');
  const files = { game: 'game.js', duel: 'duel/index.js', chest: 'boat-chest-reveal.js', controls: 'controls.js', push: 'push-ui.js', cafe: 'cafe-guests.js', night: 'night-visit.js', decor: 'decor-drops/index.js', vmap: 'world/village-map.js', snap: 'world/map-snapshot.js' };
  for (const [, mod, fn] of lazy.matchAll(/need\(\)\.(\w+)\.(\w+)\(\.\.\.a\)/g)) {
    const src = readFileSync(new URL(`../js/${files[mod]}`, import.meta.url), 'utf8');
    const isFn = new RegExp(`(async\\s+)?function\\s+${fn}\\b|(const|let)\\s+${fn}\\s*=\\s*(async\\s*)?\\(`).test(src);
    assert.ok(isFn, `${mod}.${fn} is not declared as a function in js/${files[mod]}`);
  }
});

test('top-level statements do not call into the game before it loads', () => {
  const calls = new RegExp(`(Input\\.\\w+\\(|\\b(${WRAPPERS.join('|')})\\()`);
  for (const line of script.split('\n')) {
    if (!/^ {4}\S/.test(line)) continue;
    const m = line.match(calls);
    if (!m) continue;
    const before = line.slice(0, m.index);
    assert.ok(/=>|function\b/.test(before), `top-level game call: ${line.trim().slice(0, 120)}`);
  }
});
