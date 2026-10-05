// 🔭🎵 천문대 소리 — A 오르골 BGM 테마 + 효과음 세트 1(별 차임) 배선 (2026-10-05 사용자 선택)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');

test('sound.js has the stars (music box) BGM theme and the seven star effects', async () => {
  const { Sound } = await import('../js/sound.js');
  for (const k of ['starPerfect', 'starGood', 'starMiss', 'starComet', 'starComplete', 'starUnlock', 'starPick']) {
    assert.equal(typeof Sound[k], 'function', `Sound.${k}`);
  }
  const s = src('sound.js');
  assert.match(s, /bgmTheme === 'stars' \? playStarsBar/);
  assert.match(s, /bgmTheme === 'stars' \? STARS_BAR/);
  assert.match(s, /const STARS_BPM = 76;/);
});

test('observatory switches to the stars theme inside and back to main outside', () => {
  const s = src('spaces/observatory.js');
  const enter = s.slice(s.indexOf('export function enterObservatory'), s.indexOf('export function enterObservatory') + 1200);
  const exit = s.slice(s.indexOf('export function exitObservatory'), s.indexOf('export function exitObservatory') + 800);
  assert.match(enter, /setBGMTheme\('stars'\)/);
  assert.match(exit, /setBGMTheme\('main'\)/);
});

test('picking a notebook card plays the pick tick', () => {
  assert.match(src('observatory/book.js'), /Sound\.starPick\(\)/);
});
