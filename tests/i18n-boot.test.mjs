// =============================================================
//  🌐 i18n 부팅 순서 — 로딩 화면이 게임 다운로드를 기다리지 않게
//  ------------------------------------------------------------
//  #loading 은 정적 한국어 마크업이고, 이를 영어로 바꾸는 건 translateDom 뿐이다.
//  그런데 translateDom 이 js/game.js(+three.js, 모듈 64개)를 static import 하는
//  큰 모듈 스크립트 안에 있으면, ES 모듈 규칙상 **그 전부가 내려온 뒤에야** 실행된다.
//  = 로딩 화면은 로딩이 끝나는 순간에야 영어가 된다(itch 처럼 느린 망에서 그대로 드러남).
//
//  그래서 i18n 부팅만 떼어 **게임보다 먼저 실행되는 작은 모듈 스크립트**로 둔다.
//  이 파일은 그 순서가 되돌아가지 않게 잠근다.
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';

const ROOT = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', ROOT), 'utf8');

/** 정적 마크업의 로딩 문구 — 사전 키와 글자 하나까지 같아야 번역된다. */
const LOADING_RE = /<div id="loading">([^<]*)<\/div>/;

test('로딩 문구가 정적 마크업에 있고 EN 사전에 키로 등록돼 있다', () => {
  const m = html.match(LOADING_RE);
  assert.ok(m, '#loading 마크업을 찾지 못했다');
  const text = m[1].trim();
  assert.ok(EN[text], `EN 사전에 '${text}' 키가 없다 — 영어 유저에게 한국어가 그대로 보인다`);
});

test('i18n 부팅이 게임 import 보다 먼저 온다 — 로딩 화면이 게임을 기다리면 안 된다', () => {
  const i18nAt = html.indexOf("from './js/i18n.js'");
  const gameAt = html.indexOf("from './js/game.js'");
  assert.ok(i18nAt >= 0, "index.html 이 './js/i18n.js' 를 import 하지 않는다");
  assert.ok(gameAt >= 0, "index.html 이 './js/game.js' 를 import 하지 않는다");
  assert.ok(i18nAt < gameAt,
    'i18n import 가 game.js import 뒤에 있다 — 같은 스크립트라면 게임이 다 내려온 뒤에야 번역된다');
});

/** 모듈 스크립트 블록을 문서 순서대로 뽑는다 — "먼저 실행되는 스크립트" 를 블록 단위로 봐야 한다. */
const moduleBlocks = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const bootBlock = moduleBlocks[0];

test('가장 먼저 오는 모듈 스크립트가 i18n 부트다 — 게임을 끌고 오지 않아야 빨리 실행된다', () => {
  assert.ok(bootBlock, '모듈 스크립트를 하나도 찾지 못했다');
  const imports = [...bootBlock.matchAll(/from '(\.\/js\/[^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(imports, ['./js/i18n.js'],
    `첫 모듈 스크립트가 ${imports.join(', ') || '(없음)'} 를 import 한다 — i18n 하나만 끌고 와야 한다`);
});

test('부트 스크립트가 로딩 화면을 번역한다', () => {
  assert.match(bootBlock, /translateDom\(/, '부트 스크립트가 translateDom 을 부르지 않는다');
  assert.match(bootBlock, /loading/, '부트 스크립트가 #loading 을 대상으로 삼지 않는다');
});

test('게임은 부트보다 뒤 블록에서 import 된다', () => {
  const gameBlock = moduleBlocks.findIndex((b) => b.includes("from './js/game.js'"));
  assert.ok(gameBlock > 0,
    'game.js 가 첫 모듈 스크립트에 있다 — 부트가 게임 다운로드를 기다리게 된다');
});
