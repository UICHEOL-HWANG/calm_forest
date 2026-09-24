// 🌊 바다터 입구 첫 도달 계측 — 9/18 이후 sea_enter 0건일 때 "입구까지 왔는데 안 들어갔나 / 입구를 몰랐나"를
//    가를 축이 없었다(2026-09-24). 입구 첫 안내가 실제로 뜬 순간에 한 번 sea_gate_hint 를 남긴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const src = gameSource();

test('firstHintBanner 는 실제로 띄웠을 때만 true 를 돌려준다', () => {
  const body = src.slice(src.indexOf('function firstHintBanner('), src.indexOf('let indoor = false;'));
  assert.match(body, /if \(gameState\.hintsSeen\[key\]\) return false;/);
  assert.match(body, /if \(ui\.coachActive\?\.\(\)\) return false;/);
  assert.match(body, /return true;\s*\}\s*$/);
});

test('바다터 입구 첫 안내가 뜰 때만 sea_gate_hint 를 보낸다', () => {
  const i = src.indexOf("nd = 'sea';");
  const branch = src.slice(i, src.indexOf("nd = 'orchard';", i));
  assert.match(branch, /if \(!locked && firstHintBanner\('seaGate',[^)]*\)\)\s*trackEvent\('sea_gate_hint'/);
});
