import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('world-tree 가 엔딩을 만들고, 매 프레임 돌리고, 바쁨·안개·안내에 반영한다', () => {
  const w = read('js/spaces/world-tree.js');
  assert.match(w, /from '\.\/tree-finale\.js'/);
  assert.match(w, /initFinale\(/);
  assert.match(w, /updateFinale\(/);
  assert.match(w, /finaleBusy\(\)/);
  assert.match(w, /finaleFogPush\(\)/);
});

test('엔딩 런타임은 GA4 tree_finale 파라미터 3개만 보낸다', () => {
  const f = read('js/spaces/tree-finale.js');
  const m = f.match(/trackEvent\('tree_finale', \{([^}]*)\}/);
  assert.ok(m, 'tree_finale event missing');
  const keys = m[1].split(',').map(s => s.split(':')[0].trim()).filter(Boolean);
  assert.deepEqual(keys.sort(), ['sec', 'skipped', 'via']);
});

test('본 기록은 hintsSeen 에만 남긴다', () => {
  const f = read('js/spaces/tree-finale.js');
  assert.match(f, /markFinaleSeen\(/);
  assert.doesNotMatch(f, /gameState\.(treeFinale|finale)\s*=/);
});

test('chAtBoot 은 이야기 부팅 뒤에만 잡고, 이야기 모달 뒤에 시작한다', () => {
  const f = read('js/spaces/tree-finale.js');
  assert.match(f, /if \(!isStoryBooted\(\)\) return;\n\s*if \(chAtBoot == null\)/);
  assert.match(read('js/spaces/world-tree.js'), /modalQueue\.pending\('story'\)/);
});
