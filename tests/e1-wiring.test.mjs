// 🧪 E1 연결 — 배정이 부팅의 어느 return 보다 먼저 일어나는지, 기록·처치가 제자리에 붙었는지(소스 검사)
//   옛 A/B(variant) 무효 사고: js/i18n.js detectLang() 이 assignVariant() 전에 return 해서
//   두 무리가 같은 화면을 봤다. 같은 일이 enterGame 에서 생기지 않게 순서를 고정한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { DEV_PARAMS } from '../js/first-loop.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const GAME = read('../js/game.js');
const HTML = read('../index.html');
const ANALYTICS = read('../js/analytics.js');
const METRICS = read('../js/metrics.js');
const VISITORS = read('../js/spaces/visitors.js');
const FARM_AUTO = read('../js/spaces/farm-auto.js');
const E1START = read('../js/spaces/e1-start.js');

function fnBody(src, sig) {
  const i = src.indexOf(sig);
  assert.ok(i >= 0, `${sig} 없음`);
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1);
  }
  throw new Error('닫히지 않음');
}

test('enterGame — 배정(enrollE1)이 세이브 적용과 모든 return 보다 먼저', () => {
  const body = fnBody(GAME, 'export async function enterGame()').replace(/\/\/[^\n]*/g, '');   // 주석 속 낱말은 세지 않는다
  const at = body.indexOf('enrollE1(load)');
  assert.ok(at > 0, 'enrollE1(load) 호출');
  assert.ok(at < body.indexOf('applySave(load.state)'), 'applySave 보다 먼저');
  const firstReturn = body.search(/\breturn\b/);
  assert.ok(firstReturn < 0 || at < firstReturn, 'enterGame 의 어떤 return 보다 먼저');
  // 로드 루프가 끝난 뒤(= 판정이 확정된 뒤)여야 신규/기존을 가릴 수 있다
  assert.ok(at > body.indexOf('for (let tries = 0; !load.canPlay; tries++)'));
  assert.ok(body.indexOf('applyE1(e1)') > body.indexOf('applySave(load.state)'), '처치 밭은 세이브 적용 뒤에 깐다');
});

test('첫 화면 — 환영 모달 세 경로 모두 E1 첫 화면을 먼저 묻는다', () => {
  const body = fnBody(GAME, 'export async function enterGame()');
  assert.match(body, /else if \(Input\.e1FirstScreen\(\)\) \{[^}]*\}\s*else if \(!gameState\.tutorialSeen\)/);
  const hits = HTML.match(/if \(!change && Input\.e1FirstScreen\(\)\) return;|if \(Input\.e1FirstScreen\(\)\) return;/g) || [];
  assert.equal(hits.length, 2, '캐릭터 확정·프롤로그 종료 두 곳');
});

test('처치 대기 중엔 다른 첫 안내를 미룬다', () => {
  const enter = fnBody(VISITORS, 'export function enterFarm()');
  assert.match(enter, /if \(!e1Pending\(\)\) firstHint\('farmInside'/);
  assert.match(enter, /if \(!e1Pending\(\)\) startVisitors\(\)/);
  assert.match(HTML, /body\.e1-pending \.pg-tip/);
});

test('수확하면 E1 에 알린다', () => {
  const body = fnBody(FARM_AUTO, 'export function tryHarvest(');
  assert.match(body, /e1OnHarvest\(\)/);
});

test('기록 — exp_arm 덧붙임 · session counts · dev 강제 파라미터', () => {
  assert.match(ANALYTICS, /withExpArm\(name, /);
  assert.match(ANALYTICS, /export function setExpArm\(/);
  assert.match(METRICS, /counts\['e1_' \+ p\.exp_arm\]/);
  assert.ok(DEV_PARAMS.includes('e1'), '?e1= 강제 세션은 기록하지 않는다');
  assert.match(E1START, /trackEvent\('exp_exposure', \{ exp: 'e1', exp_arm:/);
});

test('세이브 왕복 — gameState.e1 이 저장·복원된다', () => {
  const SRC = gameSource();
  assert.match(SRC, /e1: null,/);
  assert.match(fnBody(GAME, 'function applySave(saved)'), /gameState\.e1 = sanitizeE1\(saved\.e1\)/);
});

test('새 코드는 game.js 밖 — 규칙은 js/exp-e1.js, 연결은 js/spaces/e1-start.js', () => {
  assert.doesNotMatch(GAME, /function armFor|function decideE1/);
  assert.match(E1START, /from '\.\.\/exp-e1\.js'/);
});

test('dev 세션(?dbg 등)은 기기에 무리를 남기지 않는다 — 개발 기기가 나중에 재방문 등록자로 잡히지 않게', () => {
  const enroll = fnBody(E1START, 'export function enrollE1(load)');
  assert.match(enroll, /if \(d\.reason !== 'forced' && !IS_DEV_SESSION\) writeStored\(d\.arm\)/);
});
