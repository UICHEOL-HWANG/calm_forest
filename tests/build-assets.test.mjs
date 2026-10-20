import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { DECOR_SETS } from '../js/data/decor-sets.js';

const BUILDS = [
  ['scripts/build-web.mjs', 'dist'],
  ['scripts/build-ait.mjs', 'dist-toss'],
  ['scripts/build-cap.mjs', 'dist-cap'],
  ['scripts/build-itch.mjs', 'dist-itch'],
];

for (const [script, out] of BUILDS) {
  test(`${script}: decor set thumbnails ship in ${out}/`, () => {
    execFileSync('node', [script], { stdio: 'pipe' });
    for (const s of DECOR_SETS) assert.ok(existsSync(`${out}/${s.thumb}`), `${out}/${s.thumb}`);
  });
}
