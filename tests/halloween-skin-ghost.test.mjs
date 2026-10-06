// tests/halloween-skin-ghost.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/cosmetics/skin-ghost.js', import.meta.url), 'utf8');

test('👻 유령 2종 — export · 표식 · 소유 표시', () => {
  assert.match(src, /export function applyGhostNightcap\(THREE, built\)/);
  assert.match(src, /export function applyGhostCloud\(THREE, built\)/);
  assert.match(src, /part\s*=\s*'skinhead'/, '후드 끝은 머리 꾸미기에 숨는다');
  assert.match(src, /skinOwned\s*=\s*true/, 'disposeSkin 이 지오메트리를 버리게');
  assert.doesNotMatch(src, /\.dispose\(\)/, '캐릭터 원본 재질은 dispose 금지');
  assert.ok(src.split('\n').length < 800, '800줄 이하');
  assert.doesNotMatch(src, /from '\.\/skin\.js'/, 'skin.js 를 import 하면 순환이 된다');
});

test('👻 나이트캡 — 후드 끝을 숨겨도 정수리가 뚫리지 않는다(닫는 뚜껑은 늘 보이는 시트 인덱스에)', () => {
  const kit = readFileSync(new URL('../js/cosmetics/skin-kit.js', import.meta.url), 'utf8');
  const d = kit.slice(kit.indexOf('export function drape('));
  assert.match(d, /cutRow/, '자르기는 격자 행 단위 — 이음매가 한 줄의 꼭짓점 고리가 된다');
  assert.match(d, /[^C]idx\.push\(\.\.\.capIdx\(/, '뚜껑 삼각형은 늘 보이는 idx 로(새 메시·재질 없음)');
  assert.doesNotMatch(d, /idxCut\.push\([^)]*cap/i, '뚜껑은 후드 끝(skinhead) 쪽에 넣지 않는다');
  assert.match(src, /drape\(THREE, \{[^}]*\bcutRow\b/, '나이트캡은 행 단위로 후드 끝을 뗀다');
  assert.match(src, /cap:\s*HR\s*\*/, '뚜껑 높이는 머리 크기 비례');
});
