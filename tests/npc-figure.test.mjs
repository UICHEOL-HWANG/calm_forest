import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const NPC = readFileSync(new URL('../js/spaces/npc.js', import.meta.url), 'utf8');

test('buildNPCFigure 를 내보내고 buildNPCs 가 그것을 쓴다(외형 코드 한 벌)', () => {
  assert.match(NPC, /export function buildNPCFigure\(def\) \{/);
  assert.match(NPC, /const \{ group: g, body, look \} = buildNPCFigure\(def\);/);
  assert.equal((NPC.match(/new THREE\.IcosahedronGeometry\(0\.5, 1\)/g) || []).length, 1, '몸통 생성은 한 곳');
  assert.match(NPC, /e\.userData\.npcEye = true;/, '거울 쌍둥이가 공용 눈을 찾아 발광으로 바꾼다');
});
