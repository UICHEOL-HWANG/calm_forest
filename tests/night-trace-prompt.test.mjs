import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const doors = read('../js/spaces/doors.js');
const html = read('../index.html');
const duelUi = read('../js/duel/ui.js');
const duel = read('../js/duel/index.js');
const game = gameSource();

test('흔적 가까이 가면 프롬프트 줄에 살펴보기가 뜨고 액션 버튼이 그 동작이 된다', () => {
  assert.match(doors, /traceTarget\(\)\) \{ \$w\.nearDoor = 'trace'; prompt = '🐾 흔적 살펴보기'; \}/);
  assert.match(game, /if \(nearDoor === 'trace'\) \{ const tr = traceTarget\(\); if \(tr\) return investigateTrace\(tr\); \}/);
});

test('모바일 동그라미 액션 버튼 아이콘은 🐾', () => {
  assert.match(html, /t\.includes\('흔적'\) \? '🐾'/);
});

test('대결 들어갈 때 할퀴기 전환을 거친다', () => {
  assert.match(duelUi, /export function playIntro\(/);
  assert.match(html, /#duel-intro/);
  assert.match(duel, /await ui\.playIntro\(\{ animal: ctx\.animal, onDark: \(\) => \{ handle = enterDuelStage\(/);
});
