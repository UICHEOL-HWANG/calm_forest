import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { DECOR_SETS } from '../js/data/decor-sets.js';

test('scripts/build-web.mjs: decor set thumbnails ship in dist/', () => {
  execFileSync('node', ['scripts/build-web.mjs'], { stdio: 'pipe' });
  for (const s of DECOR_SETS) assert.ok(existsSync(`dist/${s.thumb}`), `dist/${s.thumb}`);
});
