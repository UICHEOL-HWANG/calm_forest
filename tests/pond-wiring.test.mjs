import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POND_COPY } from '../js/pond/copy.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('fishMesh 는 색을 덮어쓸 수 있다', () => {
  assert.match(src('js/game.js'), /function fishMesh\(rarity, colOverride\)/);
  assert.match(src('js/game.js'), /const col = colOverride \?\? FISH_KINDS/);
});

test('연못 조형은 불투명 1 + 물 1 메시, 물고기 그림자 없음', () => {
  const b = src('js/pond/build.js');
  assert.equal((b.match(/new THREE\.Mesh\(/g) || []).length, 2);
  assert.match(b, /castShadow = false/);
  assert.match(b, /POND_SEA_SCALE/);
});

test('토스트 문구와 영어 사전', () => {
  assert.equal(POND_COPY.created, '🌊 내 연못이 생겼어요 — 새 물고기를 잡을 때마다 식구가 늘어요');
  assert.ok(src('js/i18n-en.js').includes("'🌊 내 연못이 생겼어요 — 새 물고기를 잡을 때마다 식구가 늘어요': '🌊 Your own pond is here! Every new fish you catch joins the family'"));
});

test('game.js 는 연결 줄만 가진다', () => {
  const g = src('js/game.js');
  assert.match(g, /import \{ refreshPond, updatePond, pondScatterBlocks \} from '\.\/pond\/index\.js';/);
  assert.match(g, /refreshPond\('load'\)/);
  assert.match(g, /updatePond\(dt, inVillage2\(\)\)/);
  assert.ok((g.match(/pondScatterBlocks\(x, z/g) || []).length >= 3);
});

test('낚시·바다 획득 직후 갱신', () => {
  const f = src('js/spaces/fishing.js');
  assert.ok(f.indexOf("refreshPond('fishing')") > f.indexOf("dexDiscover('fish', kind.rarity)"));
  assert.match(src('js/spaces/sea.js'), /refreshPond\('sea'\)/);
});

test('연결 모듈: 스위치·트래킹·1회 토스트', () => {
  const p = src('js/pond/index.js');
  assert.match(p, /spaceLinkOn\(e3Decision\(\)\)/);
  for (const ev of ['pond_created', 'pond_fish_added', 'pond_view']) assert.match(p, new RegExp(`trackEvent\\('${ev}'`));
  assert.match(p, /hintsSeen\.pond/);
  assert.match(p, /pondToastDue\(/);
});

test('토스트 대기는 예약 시점부터 센다', () => {
  const p = src('js/pond/index.js');
  assert.ok(p.includes('toastPending = true'));
  assert.ok(p.includes('toastWait = 0'));
  assert.match(p, /toastPending = true;\s*toastWait = 0/);
});

test('pond_created 는 로드마다 보내지 않는다', () => {
  const p = src('js/pond/index.js');
  assert.ok(p.includes('shouldTrackCreated(trigger, !!gameState.hintsSeen.pond)'));
});

test('P1: 연못 위치·근처·모으기·연못 생긴 날', () => {
  const p = src('js/pond/index.js');
  for (const fn of ['pondExists', 'pondPos', 'pondNear', 'pondCount', 'pondGather']) assert.match(p, new RegExp(`export function ${fn}\\(`));
  assert.match(p, /hintsSeen\.pondDay = kstDate\(\)/);
  assert.match(src('js/pond/build.js'), /gather\(sec\)/);
  assert.match(src('js/data/pond.js'), /export const POND_ACT_R = 3\.4;/);
});

test('P2: 단계별 반지름·자리·충돌체·마당 치우기·지도', () => {
  const p = src('js/pond/index.js');
  for (const fn of ['pondStage', 'rebuildPond', 'pondMapKey', 'pondPatchBlocks']) assert.match(p, new RegExp(`export function ${fn}\\(`));
  for (const call of ['pondSpotFor(', 'pondRadius(', 'pondActR(', 'pondViewR(', 'pondFishLimits(', 'removeSolid(', 'obstacles.push(', 'clearYard(']) assert.ok(p.includes(call), call);
  assert.doesNotMatch(p, /POND_ACT_R|POND_VIEW_R/);
  const b = src('js/pond/build.js');
  assert.ok(b.includes('export function buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite, r = POND_R, stage = 1 })'));
  assert.ok(b.includes('setContents(view, seaColorOf, limits'));
  assert.match(b, /grow\(/);
  const g = src('js/game.js');
  assert.ok(g.includes('pond: pondMapKey()'));
  assert.ok(g.includes('pondPatchBlocks('));
});

test('넓힌 연못 둘레에는 괭이질이 막힌다: 밭 금지 거리가 넓히기 검사 거리보다 넓다', () => {
  const hoePad = Number(src('js/game.js').match(/function isBlocked\(x, z\) \{ return obstacles\.some\(o => Math\.hypot\(x - o\.x, z - o\.z\) < o\.r \+ ([\d.]+)\); \}/)[1]);
  const blockPad = Number(src('js/pond/index.js').match(/block = \{ x, z, r: r \+ ([\d.]+) \};/)[1]);
  const reachPad = Number(src('js/pond/stage.js').match(/const DECOR_PAD = ([\d.]+);/)[1]);
  assert.ok(blockPad + hoePad >= reachPad, `${blockPad} + ${hoePad} < ${reachPad}`);
  assert.match(src('js/spaces/orchard-actions.js'), /if \(isBlocked\(gx, gz\)\) \{ ui\.toast/);
});
