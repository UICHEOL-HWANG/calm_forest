import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABLE_COPY } from '../js/table/copy.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const index = src('js/table/index.js');
const N_TABLE_LINES = 12;

test('game.js 는 연결 줄만 가진다', () => {
  const g = src('js/game.js');
  assert.match(g, /import \{ refreshTable, updateTable, tableMapKey, tableSettling, tablePos, tableNear \} from '\.\/table\/index\.js';/);
  assert.match(g, /import \{ openCookbook, takeBite, cookbookAfterBite \} from '\.\/table\/book-ui\.js';/);
  assert.ok(g.indexOf("refreshTable('load')") > g.indexOf("refreshPond('load')"));
  assert.match(g, /syncStory\('cook'\);[^\n]*\n  refreshTable\('cook'\);/);
  assert.match(g, /updatePond\(dt, inVillage2\(\)\);\n  updateTable\(dt, inVillage2\(\)\);/);
  assert.match(g, /if \(nearDoor === 'table'\) return openCookbook\(\);/);
  assert.equal(g.split('\n').filter(l => /[tT]able(MapKey|Settling|Pos|Near|BiteAd)|refreshTable|updateTable|openCookbook|takeBite|cookbookAfterBite/.test(l)).length, N_TABLE_LINES);
});

test('문 프롬프트는 연못보다 먼저 식탁을 본다', () => {
  const doors = src('js/spaces/doors.js');
  assert.match(doors, /if \(!prompt && tableNear\(\)\) \{ \$w\.nearDoor = 'table'; prompt = TABLE_COPY\.prompt; \}/);
  assert.ok(doors.indexOf("$w.nearDoor = 'table'") < doors.indexOf("$w.nearDoor = 'pondsign'"));
  assert.match(src('index.html'), /🍽️\|/);
});

test('스위치 뒤에서만 돌고 저장은 hintsSeen 안에만 쓴다', () => {
  assert.match(index, /export function refreshTable\(trigger\) \{\n  if \(!spaceLinkOn\(e3Decision\(\)\)\) return;/);
  const writes = [...index.matchAll(/gameState\.(\w+)(?:\.(\w+)|\[)[^=\n]*= /g)].map(m => m[1]);
  assert.ok(writes.length >= 2);
  for (const w of writes) assert.equal(w, 'hintsSeen');
  assert.match(index, /hintsSeen\.tableRingSeen = true/);
  assert.match(index, /toast === 'long' \? 'tableLong' : 'tableSeen'/);
});

test('짓기: 조형이 실패하면 아무것도 남기지 않고, 마당을 치우고, 충돌체와 주민 금지 원을 건다', () => {
  assert.match(index, /try \{\n\s*model = buildTable\(\{ style: STYLE, shape: view\.shape, dishes: view\.dishes, mergeGeos, paintGeo \}\);\n\s*hoop = buildDashRing\(\{ mergeGeos, reach: TABLE_SHAPES\[view\.shape\]\.reach \}\);\n\s*\} catch \(e\) \{\n\s*model\?\.dispose\(\);/);
  assert.ok(index.indexOf('} catch (e) {') < index.indexOf('clearYard('));
  assert.ok(index.indexOf('clearYard(') < index.indexOf('scene.add(model.group'));
  assert.match(index, /clearYard\(\{ scene, trees, obstacles, swayables, grassClumps, removeSolid \}, f\.x, f\.z, clear\.r, clear\.treeR, clear\.south\);/);
  assert.match(index, /solidBox\(f\.x - f\.hx, f\.z - f\.hz, f\.x \+ f\.hx, f\.z \+ f\.hz\)/);
  assert.match(index, /obstacles\.push\(\.\.\.blocks\);/);
  assert.doesNotMatch(src('js/game.js'), /tableScatter|TABLE_SITES/);
});

test('치우기는 짓기와 짝이 맞는다', () => {
  const t = index.slice(index.indexOf('function teardown()'), index.indexOf('function build('));
  for (const s of ['scene.remove(table.group, ring.mesh);', 'table.dispose();', 'ring.dispose();', 'removeSolid(solid);', 'obstacles.splice(i, 1);', 'setOwlNoFly(null);']) assert.ok(t.includes(s), s);
  assert.match(index, /solid\.off = !inVillage;/);
  assert.match(index, /table\.group\.visible = inVillage;\n  ring\.mesh\.visible = inVillage;/);
});

test('올빼미: 순찰 착지만 식탁 건너편을 피하고 배달 비행은 그대로다', () => {
  const npc = src('js/spaces/npc.js');
  assert.match(npc, /export function setOwlNoFly\(fn\) \{ owlNoFly = fn; \}/);
  assert.match(npc, /export function owlLandingSpot\(o, cx, cz, minR, maxR, avoidLine = false\)/);
  assert.match(npc, /if \(avoidLine && owlNoFly && \(owlNoFly\(o\.group\.position\.x, o\.group\.position\.z, x, z\) \|\| owlNoFly\(x, z, o\.home\.x, o\.home\.z\)\)\) continue;/);
  assert.equal((npc.match(/owlLandingSpot\(o, o\.home\.x, o\.home\.z, 2\.5, 5\.5, true\)/g) || []).length, 2);
  assert.equal((npc.match(/owlLandingSpot\(o, player\.position\.x, player\.position\.z, 1\.6, 2\.4\)/g) || []).length, 2);
  assert.match(npc, /owlLandingSpot\(o, g\.position\.x, g\.position\.z, 1\.2, 3\)/);
  assert.match(index, /setOwlNoFly\(\(ax, az, bx, bz\) => segmentHitsKeepOut\(\{ x: ax, z: az \}, \{ x: bx, z: bz \}, blocks, OWL_PAD\)\);/);
  assert.match(index, /OWL_PAD = 0\.8/);
});

test('자리는 연못이 바뀔 때마다 다시 고르고, 서 있는 자리는 꾸미기에 밀리지 않는다', () => {
  assert.match(index, /if \(pondMapKey\(\) !== pondKey\) refreshTable\('pond'\);/);
  assert.match(index, /tableSiteNext\(yard\(\), table && shape === view\.shape \? site : null\)/);
  assert.match(index, /pond: pond \? \{ \.\.\.rel\(pond\), r: pondRadius\(pondStage\(\)\) \} : null,/);
});

test('고리: 연못 팻말의 점선 고리를 다시 쓰고 판정 반지름과 같다', () => {
  const b = src('js/pond/sign-build.js');
  assert.match(b, /export function buildDashRing\(\{ mergeGeos, reach \}\)/);
  assert.match(index, /ring\.update\(dt, tableNear\(\), pulse\);/);
  assert.match(index, /dist2D\(player\.position, table\.group\.position\) < TABLE_SHAPES\[shape\]\.reach;/);
  assert.match(index, /signPulseDue\(\{ seen: !!gameState\.hintsSeen\.tableRingSeen,/);
});

test('처음 생김: 한 번만 기록하고 마을에서 4초 뒤 한 번 알린다, 긴 식탁은 커지는 연출', () => {
  assert.match(index, /shouldTrackCreated\(trigger, !!hints\.tableSeen\)\) trackEvent\('table_created', \{ trigger: trigger === 'load' \? 'existing' : trigger, count: view\.dishes\.length \}\);/);
  assert.match(index, /pondToastDue\(\{ pending: toast, inVillage, waitedSec: toastWait \}\)/);
  assert.match(index, /else if \(trigger !== 'load'\) table\.grow\(GROW_SEC\);/);
  assert.match(index, /c\.type === 'long' && !hints\.tableLong/);
  assert.match(src('docs/analysis/event-taxonomy.csv'), /^table_created,crafting,table,2,N,not_fired,0,0,,,trigger\|count,/m);
});

test('지도: 식탁 자리와 모양이 바뀌면 다시 찍는다', () => {
  assert.match(src('js/world/map-snapshot.js'), /\$\{pond \?\? ''\}\|\$\{table \?\? ''\}/);
  assert.match(index, /export function tableSettling\(\) \{\n  return !!table\?\.growing\(\);\n\}/);
});

test('문구: 초안 그대로, 금지 표현 없음, 영어 사전에 통문장으로', () => {
  const world = { prompt: TABLE_COPY.prompt, created: TABLE_COPY.created, long: TABLE_COPY.long };
  assert.deepEqual(world, {
    prompt: '🍽️ 마당 식탁',
    created: '🍽️ 마당에 식탁이 생겼어요. 만든 요리가 올라가요',
    long: '🍽️ 요리가 7가지가 됐어요. 긴 식탁으로 바뀌었어요',
  });
  const en = src('js/i18n-en.js');
  for (const s of Object.values(world)) {
    assert.doesNotMatch(s, /—|놀|[⬆⬇⬅➡↑↓←→]/);
    const m = en.match(new RegExp(`'${s}': '([^']+)'`));
    assert.ok(m, s);
    assert.doesNotMatch(m[1], /[가-힣]/);
  }
});

test('첫 로딩에 들어가지 않고 주석이 없다', () => {
  assert.doesNotMatch(src('index.html'), /js\/table\//);
  for (const f of ['js/table/index.js', 'js/table/copy.js', 'js/table/book-ui.js', 'js/table/guide-steps.js']) assert.doesNotMatch(src(f), /^\s*\/\//m);
  assert.doesNotMatch(index, /openTableWindow/);
});
