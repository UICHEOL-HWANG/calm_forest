import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SHELL = read('js/hud/hud-shell.js');
const MOBILE = read('js/hud/mobile-hud.js');
const HTML = read('index.html');

test('오른쪽 위 🎒📖☰ 와 좌측 열 정리는 PC·모바일 공용 — 터치에만 묶지 않는다', () => {
  assert.match(SHELL, /export function initHudShell\(/);
  assert.match(SHELL, /^#topleft, #inv-chips, #time-indicator, #feedback-tab, #dex-tab, \.bag-lbl \{ display: none !important; \}/m);
  assert.match(SHELL, /mkBtn\('hud-dex', '📖', '도감'\)/);
  assert.match(SHELL, /menu\.open\(\);/);
  assert.match(SHELL, /function layoutLeft\(\)/);
});

test('모바일 전용 모듈엔 도구 휠·근접 알약·터치 배치만 남는다', () => {
  assert.doesNotMatch(MOBILE, /hud-dex|layoutLeft|coin-pop/);
  assert.match(MOBILE, /createToolFan/);
});

test('PC 하단 숫자 도구바는 그대로 — 도구바 숨김은 터치에만', () => {
  assert.doesNotMatch(SHELL, /#hotbar/);
  assert.match(MOBILE, /body\.is-touch #hotbar > \.slot \{ display: none !important; \}/);
});

test('enterPlay 가 플랫폼과 무관하게 셸을 켜고, 공용 훅은 셸로 간다', () => {
  assert.match(HTML, /if \(!shell\) shell = initHudShell\(\{ Input, t, trackEvent, menu: menuSheet \}\);/);
  assert.match(HTML, /shell\?\.onInv\(inv\);/);
  assert.match(HTML, /setUnread\(n\) \{ shell\?\.setUnread\(n\); menuSheet\.setUnread\(n\); \}/);
  assert.match(HTML, /if \(shell\) \{ shell\.layoutLeft\(\); return; \}/);
  assert.match(HTML, /if \(shell\) \{\s*const keys = /);
});
