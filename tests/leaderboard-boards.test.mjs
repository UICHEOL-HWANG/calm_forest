import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('API BOARDS equals index.html LB_BOARDS ids', () => {
  const api = read('../functions/api/leaderboard.js').match(/const BOARDS = new Set\(\[([^\]]*)\]\)/)[1];
  const apiIds = [...api.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  const html = read('../index.html');
  const block = html.slice(html.indexOf('const LB_BOARDS = ['), html.indexOf('];', html.indexOf('const LB_BOARDS = [')));
  const htmlIds = [...block.matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]).sort();
  assert.ok(htmlIds.includes('boat_rapid'));
  assert.deepEqual(apiIds, htmlIds);
});
