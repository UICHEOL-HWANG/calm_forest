// 🧮 GA4 파라미터 25개 한도 — 무거운 배열은 *_detail 이벤트로 나눈다(2026-10-08).
//   trackEvent 가 ts·platform 을 더 붙이므로 본 이벤트는 23개 이하로 유지한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const ANALYTICS = readFileSync(new URL('../js/analytics.js', import.meta.url), 'utf8');

function block(src, start) {
  const i = src.indexOf(start);
  assert.ok(i >= 0, `${start} 를 찾지 못했다`);
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1);
  }
  throw new Error('블록이 닫히지 않았다');
}
const topKeys = body => body.replace(/\/\/[^\n]*/g, '').replace(/\([^()]*\)/g, '()').split('\n')
  .flatMap(l => [...l.matchAll(/(?:^\s*|[,{]\s*)([a-z_][a-z0-9_]*)\s*:/g)].map(m => m[1]));

test('cooking_result/abandon 본 이벤트는 23개 이하이고 run_id 를 싣는다', () => {
  const keys = topKeys(block(SRC, "trackEvent(res.abandoned ? 'cooking_abandon' : 'cooking_result'"));
  assert.ok(keys.includes('run_id'), 'run_id 로 cooking_detail 과 잇는다');
  for (const moved of ['offsets', 'stage_scores', 'combo_key', 'taste', 'is_new', 'found']) {
    assert.ok(!keys.includes(moved), `${moved} 는 cooking_detail 로 옮긴다`);
  }
  for (const kept of ['arms', 'eases', 'dda', 'probe_v', 'avg_offset_ms', 'duration_ms']) {
    assert.ok(keys.includes(kept), `${kept} 는 기존 분석 쿼리가 쓰므로 본 이벤트에 남긴다`);
  }
  assert.ok(keys.length <= 23, `본 이벤트 키 ${keys.length}개`);
});

test('cooking_detail 이 run_id·원본 배열·자유 요리 정보를 싣는다', () => {
  const keys = topKeys(block(SRC, "trackEvent('cooking_detail'"));
  for (const k of ['run_id', 'recipe', 'outcome', 'offsets', 'stage_scores', 'combo_key', 'taste', 'is_new', 'found']) {
    assert.ok(keys.includes(k), `cooking_detail 에 ${k}`);
  }
});

test('trackEvent 는 25개를 넘으면 ga_param_overflow 를 보낸다', () => {
  assert.match(ANALYTICS, /overParamLimit\(gaPayload\)/);
  assert.match(ANALYTICS, /'ga_param_overflow'/);
});
