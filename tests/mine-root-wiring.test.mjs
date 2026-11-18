import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const DELVE = readFileSync(new URL('../js/spaces/delve.js', import.meta.url), 'utf8');
const SCENE = readFileSync(new URL('../js/delve/root-scene.js', import.meta.url), 'utf8');

test('20층에 들어오면 뿌리 터를 놓고, 방을 비울 때 함께 치운다', () => {
  assert.match(DELVE, /import \{ placeRootShrine, clearRootShrine \} from '\.\.\/delve\/root-scene\.js'/);
  assert.match(DELVE, /if \(layout\.shrine\) \{[^}]*placeRootShrine\(group,/);
  assert.match(DELVE, /function clearRoom\(\) \{\n  clearRootShrine\(\);/);
  assert.match(DELVE, /m\.emissiveMap\?\.dispose\(\)/);
});

test('연출은 한 번 보면 기록하고 이벤트를 남긴다', () => {
  assert.match(SCENE, /const SEEN = 'mineRootLit'/);
  assert.match(SCENE, /trackEvent\('delve_root_cine', \{ skipped: [^,]+, sec: /);
  assert.match(SCENE, /requestSave\(\)/);
});
