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
