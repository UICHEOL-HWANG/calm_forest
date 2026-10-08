import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();

test('gameState.aura 기본값과 저장 복원', () => {
  assert.match(SRC, /aura: \{ slots: \[\], equipped: null \},/);
  assert.match(SRC, /gameState\.aura = restoreAura\(saved\.aura\);/);
  assert.match(SRC, /return \{ \.\.\.gameState,/, 'getGameState 가 gameState 를 펼쳐 aura 가 저장에 실린다');
});

test('오라 렌더는 매 프레임 갱신되고 실내·특수 공간에선 끈다', () => {
  assert.match(SRC, /const auraFx = createAuraFx\(THREE\);/);
  assert.match(SRC, /updateAura\(dt\);/);
  const i = SRC.indexOf('function updateAura(');
  assert.ok(i > 0);
  assert.match(SRC.slice(i, i + 600), /indoor \|\| atCafe \|\| atMuseum \|\| atObservatory \|\| atMine \|\| atDream/);
  assert.match(SRC, /function refreshAura\(\)/);
});
