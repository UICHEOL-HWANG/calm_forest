import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const files = (dir) => readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? files(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [`${dir}/${e.name}`] : []);

test('지워진 이랑 승격·강등 함수를 부르는 곳이 남아 있지 않다', () => {
  for (const f of files('js')) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\b(demotePlotRidges|promotePlotRidges)\s*\(/, f);
  }
});

test('삽질 복구가 끝나면 흙더미를 0 으로 되돌리는 것만으로 마무리한다', () => {
  const src = readFileSync(new URL('../js/spaces/farm-auto.js', import.meta.url), 'utf8');
  assert.match(src, /setPlotDug\(plot, plot\.digBackT \/ DIG_RESTORE\);/);
});
