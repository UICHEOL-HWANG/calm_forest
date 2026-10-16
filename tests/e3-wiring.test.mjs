import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const METRICS = read('../js/metrics.js');

test('metrics.js — E3 무리를 session_logs counts 에 표시', () => {
  assert.match(METRICS, /import \{ e3Decision \} from '\.\/exp-e3-boot\.js'/);
  assert.match(METRICS, /import \{ e3SessionMark \} from '\.\/exp-e3\.js'/);
  assert.ok(METRICS.includes('e3SessionMark(e3Decision())'));
  assert.ok(METRICS.includes('counts[e3Mark] = 1'));
});
