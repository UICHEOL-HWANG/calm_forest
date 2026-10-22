import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SPOT = read('js/hud/spotlight.js');
const HTML = read('index.html');
const GAME = gameSource();

test('레이어는 모달이 아니다 — 이동·행동을 막지 않아야 "걸어 보세요"를 할 수 있다', () => {
  assert.match(SPOT, /layer\.id = 'spot-layer';/);
  assert.doesNotMatch(SPOT, /id = '[^']*-modal'/);
});

test('레이어 z-index 는 ☰ 카드(47) 위, 저장 멈춤 화면(60) 아래', () => {
  const z = Number(SPOT.match(/#spot-layer \{[^}]*z-index: (\d+);/)[1]);
  assert.ok(z > 47 && z < 60, `z=${z}`);
});

test('막힘 탈출 — 같은 단계 20초면 다음 버튼', () => {
  assert.match(SPOT, /const STUCK_MS = 20000;/);
  assert.match(SPOT, /advance\('timeout'\)/);
});

test('행동 신호 — 큰 버튼·Space·화면 클릭은 use, 숫자 2~6 은 toolpick', () => {
  assert.match(GAME, /function requestAction\(\) \{ wantAction = true; ui\.act\?\.\('use'\); \}/);
  assert.match(GAME, /doAction\(\) \{ requestAction\(\); \}/);
  assert.match(GAME, /if \(e\.code === 'Space'\) requestAction\(\);/);
  assert.match(GAME, /Input\.selectPageSlot\(parseInt\(e\.code\.slice\(5\)\) - 2\); ui\.act\?\.\('toolpick'\); \}/);
});

test('ui.act 신호가 스포트라이트로도 간다 · 코치 대기 판정에 스포트라이트 포함', () => {
  assert.match(HTML, /act\(type\) \{\n\s*spot\?\.notify\('act:' \+ type\);/);
  assert.match(HTML, /coachActive\(\) \{ return tutIdx >= 0 \|\| !!spot\?\.active\(\); \}/);
});

test('환영 창 자리에서 스포트라이트 → 코치 순서로 이어진다(E1 분기는 그대로)', () => {
  assert.match(HTML, /showTutorial\(src = 'welcome'\) \{ startOnboarding\(src\); \}/);
  assert.match(HTML, /async function startOnboarding\(src\) \{/);
  assert.match(HTML, /Input\.markHintsSeen\(\['spotV2', 'spot_cam'\]\);\s*if \(\$\('worldmap'\)\.classList\.contains\('show'\)\) closeWorldMap\(\);\s*startCoach\(\);/);
  assert.match(HTML, /Input\.armTutorialMove\(\);\n\s*await spot\.run\(/);
  assert.match(GAME, /else if \(Input\.e1FirstScreen\(\)\)/);
});

test('중간에 나가도 이어서 — 단계마다 저장, 기존 유저는 바뀐 점 투어', () => {
  assert.match(HTML, /Input\.markHintsSeen\(\['spot_' \+ s\.key\]\)/);
  assert.match(HTML, /function maybeHudTour\(\) \{/);
  assert.match(HTML, /spotSteps\('new', TOUCH\)/);
  assert.match(HTML, /maybeHudTour\(\);/);
});

test('🎓 코치 단계도 세이브에 남기고 다시 들어오면 그 단계부터 이어 간다', () => {
  assert.match(HTML, /Input\.setTutStep\(TUT_STEPS\[tutIdx\]\.key\);/);
  assert.match(HTML, /Input\.setTutStep\('done'\);/);
  assert.match(HTML, /if \(Input\.hintSeen\('spotV2'\)\) \{ const k = Input\.tutStep\(\); if \(k && k !== 'done'\) startCoach\(k\); return; \}/);
  assert.match(GAME, /setTutStep\(k\) \{ gameState\.hintsSeen = \{ \.\.\.gameState\.hintsSeen, tutStep: k \}; requestSave\(\); \}/);
});

test('🎓 이미 끝낸 단계는 건너뛴다 — 스포트라이트에서 한 걷기·도구·도감, 먼저 지은 집', () => {
  assert.match(HTML, /build: \(\) => Input\.houseStage\(\) >= 3,/);
  assert.match(HTML, /while \(tutIdx < TUT_STEPS\.length && STEP_DONE\[TUT_STEPS\[tutIdx\]\.key\]\?\.\(\)\)/);
});

test('☰ 카드를 처음 열면 메뉴 투어, 근접 알약이 처음 뜨면 알약 투어', () => {
  assert.match(HTML, /onOpen: \(\) => runMenuTour\(\)/);
  assert.match(HTML, /spotSteps\('menu', TOUCH\)/);
  assert.match(read('js/hud/menu-sheet.js'), /c\.dataset\.for = el\.id;/);
  assert.match(HTML, /onPill: \(\) => runPillTour\(\)/);
});

test('대상이 사라지면 3초 뒤 넘기고, 자기 조건이 깨진 투어(☰ 닫힘)는 끝낸다', () => {
  assert.match(SPOT, /const GONE_MS = 3000;/);
  assert.match(SPOT, /if \(run\.blocked\?\.\(\)\) \{ finish\(\); return; \}/);
  assert.match(SPOT, /getComputedStyle\(el\)\.visibility !== 'hidden'/);
  assert.match(SPOT, /run\.stuck = false; run\.gone = 0; paint\(\); \} else hide\(\);/);
});

test('건너뛰기는 말풍선 안 링크 · 첫 실행은 핵심 조작 뒤부터, 다시 보기·바뀐 점은 처음부터', () => {
  assert.match(SPOT, /<button type="button" class="sp-skip"><\/button>/);
  assert.match(SPOT, /const canSkip = run\.skip === 'all' \|\| \(run\.skip === 'optional' && !s\.core\);/);
  assert.match(SPOT, /trackEvent\?\.\('tutorial_skip', \{ at: s\.key, kind: run\.kind \}\)/);
  assert.match(HTML, /skip: src === 'help' \? 'all' : 'optional'/);
  assert.match(HTML, /spot\.run\(spotSteps\('new', TOUCH\), \{ kind: 'new', skip: 'all' \}\)/);
});
