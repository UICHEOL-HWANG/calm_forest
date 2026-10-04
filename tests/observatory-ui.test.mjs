import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const uiUrl = new URL('../js/observatory/ui.js', import.meta.url);
const copyUrl = new URL('../js/observatory/copy.js', import.meta.url);
const UI = existsSync(uiUrl) ? readFileSync(uiUrl, 'utf8')
  + readFileSync(new URL('../js/observatory/render.js', import.meta.url), 'utf8') : '';
const COPY = readFileSync(copyUrl, 'utf8');

function requireUi() {
  assert.ok(UI, 'js/observatory/ui.js 가 없다');
}

test('렌즈 뷰는 리듬 로직, COPY, i18n, 입력 잠금을 연결한다', () => {
  requireUi();
  assert.match(UI, /import \{ buildChart, judgeTap, summarize, rewardFor \} from '\.\/rhythm\.js'/);
  assert.match(UI, /import \{ COPY \} from '\.\/copy\.js'/);
  assert.match(UI, /import \{ t \} from '\.\.\/i18n\.js'/);
  assert.match(UI, /import \{ Input, trackDiffAbandon \} from '\.\.\/game\.js'/);
  assert.match(UI, /export async function openStarView/);
  assert.match(UI, /Input\.setAnalog\(0, 0\)/);
});

test('렌즈 뷰는 오버레이 생명주기와 포기 경로를 정리한다', () => {
  requireUi();
  assert.match(UI, /document\.body\.classList\.add\('menu-open', 'mg-open'\)/);
  assert.match(UI, /document\.body\.classList\.remove\('menu-open', 'mg-open'\)/);
  assert.match(UI, /new AbortController\(\)/);
  assert.match(UI, /canvas\.addEventListener\('pointerdown'/);
  assert.match(UI, /window\.addEventListener\('keydown'/);
  assert.match(UI, /document\.addEventListener\('visibilitychange'/);
  assert.match(UI, /e\.key === 'Escape'/);
  assert.match(UI, /e\.key === ' ' \|\| e\.key === 'Enter'/);
  assert.match(UI, /requestAnimationFrame/);
  assert.match(UI, /cancelAnimationFrame/);
  assert.match(UI, /trackDiffAbandon\('star'[\s\S]*constellation: 'big_dipper'/);
  assert.match(UI, /controller\.abort\(\)/);
});

test('렌즈 뷰는 sim v=d 시각 요소와 성능 장치를 가진다', () => {
  requireUi();
  assert.match(UI, /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);
  assert.match(UI, /bgCanvas/);
  assert.match(UI, /rimCanvas/);
  assert.match(UI, /function drawLens/);
  assert.match(UI, /function drawConstellation/);
  assert.match(UI, /function drawComet/);
  assert.match(UI, /function showResult/);
  assert.match(UI, /function closeStarView/);
  assert.match(UI, /rgba\(243,210,122/);
  assert.match(UI, /#1a2552/);
});

test('천문대 COPY 는 plan §1 문구를 모으고 canvas 문구는 t(COPY.*) 로 쓴다', () => {
  requireUi();
  for (const key of ['title', 'subtitle', 'tapGuide', 'perfect', 'good', 'miss', 'complete', 'close', 'combo']) {
    assert.match(COPY, new RegExp(`${key}:`), `COPY.${key} 누락`);
    assert.match(UI, new RegExp(`t\\(COPY\\.${key}\\)`), `ui.js 에서 COPY.${key} 를 t() 로 감싸야 한다`);
  }
});
