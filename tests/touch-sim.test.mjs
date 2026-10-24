import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { touchSimOn, isTouchEnv } from '../js/touch-sim.js';
import { DEV_PARAMS, isDevSession } from '../js/first-loop.js';

// 📱 ?touchsim=1 — 데스크톱 브라우저(Aside 페르소나)에서 모바일 화면·조작을 흉내 낸다(2026-10-06).
//    Aside 엔 기기 에뮬레이션이 없고, 조이스틱·액션 버튼은 터치 이벤트만 받아 마우스로는 못 움직였다.
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CONTROLS = read('../js/controls.js');
const GAME = read('../js/game.js');
const INDEX = read('../index.html');

test('touchsim 파라미터가 있으면 켜진다', () => {
  assert.equal(touchSimOn('?touchsim=1'), true);
  assert.equal(touchSimOn('?touchsim'), true);
  assert.equal(touchSimOn('?weather=clear'), false);
  assert.equal(touchSimOn(''), false);
});

test('터치 판정 = 실제 터치 기기 또는 touchsim', () => {
  assert.equal(isTouchEnv({ hasTouchEvent: false, maxTouchPoints: 0, search: '' }), false);
  assert.equal(isTouchEnv({ hasTouchEvent: false, maxTouchPoints: 5, search: '' }), true);
  assert.equal(isTouchEnv({ hasTouchEvent: true, maxTouchPoints: 0, search: '' }), true);
  assert.equal(isTouchEnv({ hasTouchEvent: false, maxTouchPoints: 0, search: '?touchsim=1' }), true);
});

test('터치스크린 노트북처럼 주 입력이 마우스면 데스크톱 조작', () => {
  assert.equal(isTouchEnv({ hasTouchEvent: true, maxTouchPoints: 10, search: '', coarsePointer: false }), false);
  assert.equal(isTouchEnv({ hasTouchEvent: true, maxTouchPoints: 5, search: '', coarsePointer: true }), true);
  assert.equal(isTouchEnv({ hasTouchEvent: false, maxTouchPoints: 0, search: '?touchsim=1', coarsePointer: false }), true);
  assert.equal(isTouchEnv({ hasTouchEvent: false, maxTouchPoints: 0, search: '', coarsePointer: true }), false);
});

test('index.html 튜토리얼 안내·E1 카드도 같은 판정 함수를 쓴다', () => {
  assert.match(INDEX, /const TOUCH = isTouchDevice\(\)/);
  assert.match(read('../js/spaces/e1-start.js'), /const TOUCH = isTouchDevice\(\)/);
});

test('touchsim 은 dev 세션이 아니다 — 페르소나 로그가 끊기면 안 된다', () => {
  assert.ok(!DEV_PARAMS.includes('touchsim'));
  assert.equal(isDevSession('?touchsim=1'), false);
});

test('모바일 컨트롤·IS_MOBILE·튜토리얼 안내가 같은 판정을 쓴다', () => {
  assert.match(CONTROLS, /isTouchDevice\(\)/);
  assert.match(GAME, /const IS_MOBILE = [^\n]*touchSimOn\(location\.search\)/);
  assert.match(INDEX, /const TOUCH = isTouchDevice\(\)/);
});

test('touchsim 일 때만 조이스틱·액션 버튼이 마우스(pointer) 입력도 받는다', () => {
  assert.match(CONTROLS, /if \(touchSimOn\(location\.search\)\) \{[\s\S]*base\.addEventListener\('pointerdown'/);
  assert.match(CONTROLS, /btn\.addEventListener\('pointerdown'/);
});
