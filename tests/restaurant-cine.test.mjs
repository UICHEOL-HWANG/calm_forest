import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REST_CINE, SHOT_FROM, SHOT_LOOK_Y, restCineKey, tourDue, featureCineDue, cineSpots } from '../js/restaurant/cine-plan.js';
import { HALL } from '../js/restaurant/data.js';

const rest = (o = {}) => ({ star: 1, guideDone: true, services: 3, regulars: {}, ...o });

test('문구는 고른 A안 그대로', () => {
  assert.equal(REST_CINE.door.shots[0].main, '🍽️ 식당이 문을 열었어요');
  assert.deepEqual(REST_CINE.tour.shots.map(s => s.main), ['📋 칠판을 누르면 영업 시작', '🐟 재료는 상자에서', '🙋 손님 자리로 가져다줘요']);
  assert.equal(REST_CINE.special.shots[0].main, '⭐ 오늘의 특선은 코인 2배예요');
  assert.equal(REST_CINE.regular.shots[0].main, '💌 단골 손님 이름표가 여기 붙어요');
  assert.equal(REST_CINE.fryer.shots[0].main, '🍤 튀김기가 들어왔어요. 새우·오징어 튀김을 만들어요');
  assert.equal(REST_CINE.fryer2.shots[0].main, '🥬 튀김기가 하나 더! 채소 튀김도 팔아요');
  assert.equal(REST_CINE.door.sub, '다음 목적지');
  assert.equal(REST_CINE.special.sub, '새로 생겼어요');
  for (const id of ['special', 'regular', 'fryer', 'fryer2']) assert.ok(REST_CINE[id].hint.title && REST_CINE[id].hint.line);
  assert.equal(restCineKey('door'), 'restCine_door');
});

test('첫 입장 둘러보기: 안내를 안 마쳤고 영업한 적 없고 아직 안 봤을 때만', () => {
  assert.equal(tourDue(rest({ guideDone: false, services: 0 }), {}), true);
  assert.equal(tourDue(rest({ guideDone: false, services: 0 }), { restCine_tour: true }), false);
  assert.equal(tourDue(rest({ guideDone: true, services: 0 }), {}), false);
  assert.equal(tourDue(rest({ guideDone: false, services: 1 }), {}), false);
});

test('새 기능 장면은 안내를 마친 뒤 하나씩, 튀김기 → 두 번째 튀김기 → 특선 → 단골 순', () => {
  assert.equal(featureCineDue(rest({ guideDone: false }), 'soup', {}), null);
  assert.equal(featureCineDue(rest(), null, {}), null);
  assert.equal(featureCineDue(rest(), 'soup', {}), 'special');
  assert.equal(featureCineDue(rest(), 'soup', { restCine_special: true }), null);
  assert.equal(featureCineDue(rest({ regulars: { chef: { done: true } } }), null, {}), 'regular');
  assert.equal(featureCineDue(rest({ regulars: { chef: { done: false } } }), null, {}), null);
  assert.equal(featureCineDue(rest({ star: 6 }), 'soup', {}), 'fryer');
  assert.equal(featureCineDue(rest({ star: 6 }), 'soup', { restCine_fryer: true }), 'fryer2');
  assert.equal(featureCineDue(rest({ star: 5 }), null, { restCine_fryer: true }), null);
});

test('장면 대상 자리는 식당 배치에서 가져온다', () => {
  const s = cineSpots();
  const st = id => HALL.stations.find(x => x.id === id);
  assert.deepEqual(s.board, { x: HALL.board.x, z: HALL.board.z });
  assert.deepEqual(s.specialBoard, s.board);
  assert.deepEqual(s.crate, { x: st('crate_fish').x, z: st('crate_fish').z });
  assert.deepEqual(s.table, { x: HALL.tables[0][0], z: HALL.tables[0][1] });
  assert.deepEqual(s.fryer0, { x: st('fryer0').x, z: st('fryer0').z });
  assert.deepEqual(s.fryer1, { x: st('fryer1').x, z: st('fryer1').z });
  assert.ok(Math.abs(s.regularBoard.x + 6.4) < 1e-9 && s.regularBoard.z === 1.9);
});

test('식당 모듈 배선: 안내 시작 때 문 장면, 입장 때 둘러보기·새 기능 장면', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/spaces/restaurant.js', import.meta.url), 'utf8');
  assert.match(src, /if \(visible && !ctx\.inside\) restCine\(\)\.door\(\);/);
  assert.doesNotMatch(src, /if \(!\$w\.atRestaurant\) restCine\(\)\.door\(\);/);
  assert.match(src, /export function exitRestaurant\(\) \{\n  restCineObj\?\.cancel\(\);/);
  assert.match(src, /restCine\(\)\.enter\(\{ rest: gameState\.restaurant, special, running: !!runtime\?\.running\(\) \}\);/);
  const run = readFileSync(new URL('../js/restaurant/cine-run.js', import.meta.url), 'utf8');
  assert.match(run, /deps\.banner\(`restHint_\$\{id\}`/);
  assert.match(run, /deps\.track\('feature_hint', \{ id \}\)/);
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /!restaurantCineActive\(\)/);
});

test('단골 게시판은 이름표가 향한 남쪽 정면에서 높이 본다', () => {
  assert.ok(SHOT_FROM.regularBoard.z > 1.9);
  assert.ok(SHOT_LOOK_Y.regularBoard > 2.5);
});

test('실내 장면 동안 플레이어를 숨겼다가 끝나면 되돌린다', async () => {
  const { readFileSync } = await import('node:fs');
  const run = readFileSync(new URL('../js/restaurant/cine-run.js', import.meta.url), 'utf8');
  assert.match(run, /if \(indoor\) deps\.showPlayer\?\.\(false\);/);
  assert.match(run, /onEnd: r => \{ if \(indoor\) deps\.showPlayer\?\.\(true\);/);
  assert.match(readFileSync(new URL('../js/spaces/restaurant.js', import.meta.url), 'utf8'), /showPlayer: v => \{ player\.visible = v; \},/);
});

test('시네마틱 동안에는 8단계 안내 표시를 숨긴다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/spaces/restaurant.js', import.meta.url), 'utf8');
  assert.match(src, /if \(!visible \|\| !step \|\| restCineObj\?\.active\) \{ view\.hide\(\); setPoint\(null\); return; \}/);
});

test('튜토리얼 중에는 새 기능 장면을 미룬다(배너가 막혀 영영 안 뜨는 걸 막기)', async () => {
  const { readFileSync } = await import('node:fs');
  const run = readFileSync(new URL('../js/restaurant/cine-run.js', import.meta.url), 'utf8');
  assert.match(run, /if \(deps\.coaching\?\.\(\)\) return false;\n    const id = featureCineDue/);
  assert.match(readFileSync(new URL('../js/spaces/restaurant.js', import.meta.url), 'utf8'), /coaching: \(\) => !!ui\.coachActive\?\.\(\) \|\| !!Input\.needsTutorial\?\.\(\),/);
});

test('식당을 나가며 장면을 끊으면 숨긴 플레이어를 되돌린다', async () => {
  const { readFileSync } = await import('node:fs');
  const run = readFileSync(new URL('../js/restaurant/cine-run.js', import.meta.url), 'utf8');
  assert.match(run, /cancel: \(\) => \{ if \(cine\?\.active\) deps\.showPlayer\?\.\(true\); cine\?\.cancel\(\); \}/);
  assert.ok(SHOT_LOOK_Y.specialBoard > 0.9);
});

test('세로 폰에서도 자막이 한 줄에 들어가게 글자 크기가 화면 폭을 따른다', async () => {
  const { readFileSync } = await import('node:fs');
  const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  assert.match(read('js/guide/place-cine.js'), /\.pc-main\{font-size:clamp\(16px,min\(2\.8vh,4vw\),24px\);/);
  assert.match(read('js/guide/goal-guide.js'), /\.gc-main\{font-size:clamp\(16px,min\(2\.8vh,4vw\),24px\);/);
});

test('새 시네마틱·배너 문구는 영어 사전에 모두 있다', async () => {
  const { EN } = await import('../js/i18n-en.js');
  const { GOALS } = await import('../js/guide/guide-rules.js');
  const keys = new Set(['새로 생겼어요', GOALS.mineGate.title, GOALS.minerMeet.title, GOALS.mineGate.label]);
  for (const def of Object.values(REST_CINE)) {
    keys.add(def.sub);
    def.shots.forEach(s => keys.add(s.main));
    if (def.hint) { keys.add(def.hint.title); keys.add(def.hint.line); }
  }
  assert.deepEqual([...keys].filter(k => !EN[k]), []);
});

test('창이 열려 있으면 시네마틱을 시작하지 않는다', async () => {
  const { readFileSync } = await import('node:fs');
  assert.match(readFileSync(new URL('../js/spaces/restaurant.js', import.meta.url), 'utf8'), /free: \(\) => cameraFree\(\) && !ui\.anyModalOpen\?\.\(\),/);
});
