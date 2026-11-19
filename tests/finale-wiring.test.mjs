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

test('칭호가 칩·세계수 판·이웃 목록에 붙는다', () => {
  const html = read('index.html');
  assert.match(html, /v\.keeper/);
  assert.match(html, /세계수지기/);
  const board = read('js/world/tree-board-ui.js');
  assert.match(board, /tb-title-row/);
  assert.match(board, /엔딩 다시 보기/);
  assert.match(board, /모든 이야기를 마치면 세계수에 꽃이 피어요/);
  assert.match(read('js/neighbors/ui.js'), /r\.keeper/);
});

test('칭호 칩은 챕터 칩과 같은 요소·같은 show 클래스를 쓴다', () => {
  const html = read('index.html');
  const fn = html.slice(html.indexOf('setStory(v) {'), html.indexOf('flashStoryChip()'));
  const keeper = fn.slice(fn.indexOf('v.keeper'), fn.indexOf('if (!v || v.allDone)'));
  assert.match(keeper, /chip\.classList\.add\('show'\)/);
  assert.doesNotMatch(keeper, /style\.display|createElement/);
  assert.match(html, /@media \(max-height: 560px\) \{\s*#story-chip \{ display: none !important; \}/);
});
