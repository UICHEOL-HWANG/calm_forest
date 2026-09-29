import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { CHEST_LOOT } from '../js/boat-chest.js';

// 🧰 보물상자 배선·트래킹 — river.js(코스·줍기·정산) · game.js(세이브) · index.html(개봉 화면·결과 카드)
//    트래킹 스펙: dev/active/boat-chest/boat-chest-plan.md 📊 표 (생명주기 전 구간에 run_no)

const src = gameSource();
const fn = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
const call = (body, ev) => { const i = body.indexOf(`trackEvent('${ev}'`); assert.ok(i > 0, `${ev} 없음`); return body.slice(i, body.indexOf('});', i)); };
const ART = readFileSync(new URL('../js/boat-chest-art.js', import.meta.url), 'utf8');
const REVEAL = readFileSync(new URL('../js/boat-chest-reveal.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const EN = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('buildCourse: 오늘 상자가 남았을 때만, 루프가 끝난 뒤 한 개(상자 없는 날 코스 불변)', () => {
  const b = fn('buildCourse');
  assert.match(b, /opts\.chest[\s\S]{0,200}placeChest\(rnd/);
  assert.ok(b.indexOf('placeChest') > b.indexOf('d += gap'), '루프 안에서 난수를 더 쓰면 모든 코스가 바뀐다');
  assert.match(b, /kind: 'chest'/);
});

test('startBoatRun: 오늘 상자 여부로 코스를 만들고 런 상태를 초기화, boat_start 에 has_chest', () => {
  const s = fn('startBoatRun');
  assert.match(s, /chestToday\(gameState\.boat, todayStr\(\)\)/);
  assert.match(s, /buildCourse\(boat\.seed, boat\.night, \{ chest: offered \}\)/);
  for (const k of ['chestOffered', 'chestTaken', 'chestSeen', 'chestMissed', 'chestDxMin', 'chestPos']) assert.match(s, new RegExp(`${k}:`), k);
  assert.match(call(s, 'boat_start'), /has_chest:/);
});

test('생명주기 트래킹: seen·take·miss 가 run_no·seg·speed 를 싣는다', () => {
  const u = fn('updateRiverObjects');
  for (const ev of ['boat_chest_seen', 'boat_chest_take', 'boat_chest_miss']) {
    const c = call(u, ev);
    for (const p of ['run_no', 'seg', 'speed']) assert.match(c, new RegExp(`\\b${p}\\b\\s*[:,]`), `${ev}.${p}`);   // 축약(seg,)도 인정
  }
  const seen = call(u, 'boat_chest_seen');
  for (const p of ['chest_d', 'chest_x']) assert.match(seen, new RegExp(`${p}:`), `seen.${p}`);
  const take = call(u, 'boat_chest_take');
  for (const p of ['loot', 'dist_m', 'dx', 'lamps_left', 'night', 'weather']) assert.match(take, new RegExp(`${p}:`), `take.${p}`);
  const miss = call(u, 'boat_chest_miss');
  for (const p of ['dx_min', 'lamps_left']) assert.match(miss, new RegExp(`${p}:`), `miss.${p}`);
});

test('떠오르는 글자엔 내용물·이모지를 쓰지 않는다(개봉 화면에서 공개)', () => {
  assert.match(fn('updateRiverObjects'), /spawnFloatText\([^)]*'보물상자를 건졌어요!'/);
});

test('오늘 건졌다는 기록은 **지급할 때** 남긴다 — 건진 뒤 창을 닫아도 상자를 잃지 않는다', () => {
  assert.doesNotMatch(fn('updateRiverObjects'), /chestDate = /);
  assert.match(fn('endBoatRun'), /if \(chestPaidNow\) \{[\s\S]{0,300}gameState\.boat\.chestDate = todayStr\(\)/);
});

test('정산: 지급은 boat_chest 출처로 따로, boat_end·boat_runs 에 chest 코드·loot·paid, 코인 없음', () => {
  const e = fn('endBoatRun');
  assert.match(e, /chestOutcome\(\{ offered: boat\.chestOffered, seen: boat\.chestSeen, taken: boat\.chestTaken \}\)/);
  assert.match(e, /giveReward\(chestG\.give, 'boat_chest', chestG\.id\)/);
  assert.match(e, /chest_loot: chestLootId/);   // 실제 지급 기준(color_gem 구분)
  const end = call(e, 'boat_end');
  for (const p of ['chest', 'chest_loot', 'chest_paid']) assert.match(end, new RegExp(`${p}:`), `boat_end.${p}`);
  assert.match(e, /chest: chestCode, chest_loot: [^\n]*chest_paid: [^\n]*chest_d:/);   // sendBoatRun payload(boat_runs 컬럼)
  assert.doesNotMatch(e.slice(e.indexOf('chestCode')), /coins/);
});

test('세이브 기본값에 chestDate', () => {
  assert.match(src, /boat: \{ date: null, count: 0,[^\n]*chestDate: null/);
});

test('개봉 화면은 실제 지급 기준 이름·모형을 보여 준다(색이 다 열렸으면 보석)', () => {
  assert.match(fn('endBoatRun'), /chestView: \{[^}]*id: chestLootId[^}]*name: chestG\?\.name/);
  assert.match(ART, /'color_gem'/);
  assert.match(REVEAL, /\.map\b[\s\S]{0,120}dispose\(\)/);   // 나뭇결 텍스처까지 해제(열 때마다 새로 복제된다)
});

test('3D 모형: 보상표의 모든 id 에 모형이 있다(이모지 스프라이트 금지)', () => {
  for (const l of CHEST_LOOT) assert.match(ART, new RegExp(`'${l.id}'`), `${l.id} 모형`);
  assert.doesNotMatch(ART, /Sprite\(/);
  assert.match(ART, /export function makeChestMesh/);
  assert.match(ART, /export function makeLootMesh/);
  assert.match(ART, /export function setChestNight/);
});

test('개봉 화면(R3): 결과 카드 전에 뜨고, 닫으면 결과 카드로 이어진다', () => {
  assert.match(HTML, /id="chest-reveal"/);
  assert.match(HTML, /playChestReveal\(/);
  assert.match(HTML, /d\.chestView\?\.paid[\s\S]{0,400}chest-reveal/);
  assert.match(REVEAL, /export function playChestReveal/);
  assert.match(REVEAL, /export function stopChestReveal/);
});

test('놓침 줄은 상자를 **보고** 지나쳤을 때만(3 거기까지 못 감엔 안 띄운다)', () => {
  assert.match(fn('endBoatRun'), /missed: chestCode === 1/);
});

test('결과 카드: 건졌으면 보물상자 줄, 놓쳤으면 회색 안내 줄', () => {
  assert.match(HTML, /d\.chestView\?\.paid[\s\S]{0,300}'보물상자'/);
  assert.match(HTML, /'다음 뱃길에 또 떠내려와요'/);
});

test('i18n: 새 문구 영어 사전', () => {
  for (const k of ['보물상자를 건졌어요!', '보물상자를 열었어요!', '보물상자', '다음 뱃길에 또 떠내려와요', '좋아요', '비료 3개', '미끼 5개', '보석 1개', '집 색 하나'])
    assert.match(EN, new RegExp(`'${k}':`), k);
});
