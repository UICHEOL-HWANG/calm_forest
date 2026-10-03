import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 🌊 바다터 입구 바깥에서 낚싯대를 쓰면 "호수에서만"이라고만 떠서 "바다 낚시는 막혀 있다"로 읽혔다
//    (페르소나 p11 14판 중 4판이 입구 안으로 안 들어가고 이탈, 2026-10-04).
const src = readFileSync(new URL('../js/spaces/fishing.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
const tryFish = src.slice(src.indexOf('export function tryFish('), src.indexOf('\n}\n', src.indexOf('export function tryFish(')));
const SEA_LINE = '🌊 바다 낚시는 바다터에 들어가서 해야 해요';

test('바다터 입구 근처에선 바다터로 들어가라고 안내한다', () => {
  assert.match(tryFish, /dist2D\(SEA_GATE, player\.position\) < SEA_GATE_HINT_R/);
  assert.ok(tryFish.includes(`'${SEA_LINE}'`));
});

test('바다터 안내가 호수 기본 안내보다 먼저 판정된다', () => {
  assert.ok(tryFish.indexOf(SEA_LINE) < tryFish.indexOf('🎣 낚시는 마을 호수 물가에서만 할 수 있어요'));
});

test('새 문구는 영어 사전에 있다', () => {
  assert.ok(en.includes(`'${SEA_LINE}':`));
});
