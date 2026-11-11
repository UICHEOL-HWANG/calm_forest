import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { warmBeforeReveal } from '../js/render/reveal-warm.js';

const rec = () => { const log = []; return { log, veil: { show: () => log.push('show'), hide: () => log.push('hide') }, hold: (v) => log.push(`hold:${v}`) }; };

test('가린 채로 셰이더를 다 굽고, 렌더를 다시 켠 뒤 걷는다', async () => {
  const r = rec();
  await warmBeforeReveal({ warm: async () => { r.log.push('warm'); return true; }, veil: r.veil, hold: r.hold, maxMs: 1000 });
  assert.deepEqual(r.log, ['show', 'hold:true', 'warm', 'hold:false', 'hide']);
});

test('오래 걸리면 상한에서 끊고, 실패해도 가림막을 걷는다', async () => {
  const slow = rec();
  const t0 = Date.now();
  await warmBeforeReveal({ warm: () => new Promise(() => {}), veil: slow.veil, hold: slow.hold, maxMs: 30 });
  assert.ok(Date.now() - t0 < 500);
  assert.deepEqual(slow.log, ['show', 'hold:true', 'hold:false', 'hide']);
  const bad = rec();
  await warmBeforeReveal({ warm: () => { throw new Error('lost'); }, veil: bad.veil, hold: bad.hold, maxMs: 30 });
  assert.deepEqual(bad.log, ['show', 'hold:true', 'hold:false', 'hide']);
  const none = rec();
  await warmBeforeReveal({ warm: async () => true, veil: null, hold: none.hold, maxMs: 30 });
  assert.deepEqual(none.log, ['hold:true', 'hold:false']);
});

test('game.js 는 플레이 시작 직전에 가린 채로 굽고, 그동안 3D 를 그리지 않는다', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /await warmBeforeReveal\(\{ warm: async \(\) => \{ await warmShaders\(renderer, scene, camera\); await shootMapNow\(\); \}, veil: revealVeil\(\), hold: \(v\) => \{ holdRender = v; \} \}\);\n  \/\/ 테스트: \?river=1/);
  assert.match(game, /if \(!observatoryLensOpen\(\) && !holdRender\) composer\.render\(\);/);
  assert.doesNotMatch(game, /mode = 'play';\n  setTimeout\(\(\) => warmShaders/);
});
