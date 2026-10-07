import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const body = (text, head) => { const i = text.indexOf(head); assert.ok(i >= 0, `${head} 없음`); return text.slice(i, text.indexOf('\n}', i)); };

test('5장: 밭 증축 안내를 닫으면 syncStory', () => {
  assert.match(body(src('js/game.js'), 'gameState.farm.stage = next.stage;'), /ok:\s*\{\s*onClick:\s*\(\)\s*=>\s*syncStory\('farm_expand'\)\s*\}/);
});
test('5장: 묘목 심기 뒤 syncStory', () => {
  const o = src('js/spaces/orchard-actions.js');
  assert.match(body(o, 'export function plantSapling'), /syncStory\('sapling'\)/);
  assert.match(o, /import \{[^}]*\bsyncStory\b[^}]*\} from '\.\.\/game\.js'/);
});
test('6장: 특별 전시 기록 뒤 syncStory(연출 뒤로 미룸)', () => {
  assert.match(body(src('js/game.js'), 'function noteSpecialExhibit'), /setTimeout\(\(\) => syncStory\('special'\), 2200\)/);
});
test('7장: 별 수첩을 닫으면 syncStory', () => {
  const o = src('js/spaces/observatory.js');
  assert.match(body(o, 'function showBook'), /onClose:\s*\(\)\s*=>\s*\{\s*resetLookPose\(\);\s*syncStory\('star'\);\s*\}/);
  assert.match(o, /import \{[^}]*\bsyncStory\b[^}]*\} from '\.\.\/game\.js'/);
});
