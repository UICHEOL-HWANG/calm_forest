import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MUSEUM_FLOORS, floorEntries, floorProgress, openFloors, nextFloorNeed } from '../js/museum.js';

// 🏛️ 증축은 **코인이 아니라 수집률**로 열린다 — 돈으로 건너뛰면 수집이 의미를 잃는다.
//   층별 전시 목록도 여기서 정한다(game.js 의 DEX 를 인자로 받아 순수하게 유지).
const SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const listLen = (start, re) => {
  const i = SRC.indexOf(start);
  return (SRC.slice(i, SRC.indexOf('\n];', i)).match(re) || []).length;
};
const REAL_NPC = listLen('const NPCS = [', /^    id: '/gm) + listLen('CAFE_GUESTS = [', /\{ id: '/g);   // 🧑 주민 + ☕ 손님
const REAL_COOK = listLen('const RECIPES = [', /\{ id: '/g);

// 실제 DEX 와 같은 모양의 표본 — 카테고리별 { id } 목록
const DEX = {
  crop: [1,2,3,4,5,6,7].map(i => ({ id: 'c' + i })),
  fish: [1,2,3].map(i => ({ id: 'f' + i })),
  ore:  [1,2,3].map(i => ({ id: 'o' + i })),
  forage: [1,2,3,4].map(i => ({ id: 'g' + i })),
  bug:  [1,2,3,4].map(i => ({ id: 'b' + i })),
  dig:  [1,2,3].map(i => ({ id: 'd' + i })),
  track:[1,2].map(i => ({ id: 't' + i })),
  river:[1,2,3,4].map(i => ({ id: 'r' + i })),
  spirit:[1,2,3,4].map(i => ({ id: 's' + i })),
  weather:[1,2,3,4].map(i => ({ id: 'w' + i })),
  // ⚠️ npc·cook 은 **game.js 에서 실제 개수를 읽는다.** 손으로 적어 두면 실제와 갈리고,
  //    실제로 그 때문에 "3층 18칸" 이라 단언하며 통과했다(진짜는 31칸 — 절반이 방 밖에 놓였다).
  npc:  Array.from({ length: REAL_NPC }, (_, i) => ({ id: 'n' + i })),
  cook: Array.from({ length: REAL_COOK }, (_, i) => ({ id: 'k' + i })),
};
// 앞에서부터 n 종을 발견한 도감을 만든다
function dexWith(cat, n) {
  const out = {};
  for (const k of Object.keys(DEX)) out[k] = {};
  DEX[cat].slice(0, n).forEach(e => { out[cat][e.id] = 1; });
  return out;
}

test('층 구성 — 1층 13 · 2층 13 · 3층 18 · 특별전', () => {
  assert.equal(MUSEUM_FLOORS.length, 4);
  assert.equal(floorEntries(1, DEX).length, 13);
  assert.equal(floorEntries(2, DEX).length, 13);
  assert.equal(floorEntries(3, DEX).length, 12 + REAL_NPC);   // 🛶강4+🌫️정령4+🌦️날씨4 + 주민·손님
  assert.ok(floorEntries(4, DEX).length > 0);
});

test('층 전시 목록에는 카테고리가 함께 붙는다(명판·도감 조회에 쓴다)', () => {
  const e = floorEntries(1, DEX)[0];
  assert.equal(e.cat, 'crop');
  assert.ok(e.id);
});

test('모든 도감 카테고리가 어느 한 층에는 들어간다 — 빠지면 영영 전시되지 않는다', () => {
  const placed = new Set(MUSEUM_FLOORS.flatMap(f => f.cats));
  for (const cat of Object.keys(DEX)) assert.ok(placed.has(cat), `${cat} 이 어느 층에도 없다`);
});

test('같은 카테고리가 두 층에 걸치지 않는다', () => {
  const all = MUSEUM_FLOORS.flatMap(f => f.cats);
  assert.equal(new Set(all).size, all.length);
});

// ── 해금 ──────────────────────────────────────────────────────
test('처음엔 1층만 열려 있다', () => {
  assert.equal(openFloors(dexWith('crop', 0), DEX), 1);
});

test('아래층을 기준만큼 채우면 다음 층이 열린다', () => {
  assert.equal(openFloors(dexWith('crop', 7), DEX), 1, '7종은 아직 모자라다');
  const nine = dexWith('crop', 7);
  nine.fish = { f1: 1, f2: 1 };            // 7 + 2 = 9
  assert.equal(openFloors(nine, DEX), 2);
});

test('2층을 채우면 3층이 열린다', () => {
  const d = dexWith('crop', 7); d.fish = { f1: 1, f2: 1 };        // 1층 9/13 → 2층 개방
  d.forage = { g1: 1, g2: 1, g3: 1, g4: 1 }; d.bug = { b1: 1, b2: 1, b3: 1, b4: 1 };
  d.dig = { d1: 1 };                                              // 2층 9/13
  assert.equal(openFloors(d, DEX), 3);
});

// ⚠️ 위층을 먼저 채웠다고 아래층을 건너뛸 수는 없다 — 순서가 무너지면 증축 서사가 사라진다
test('위층만 채워도 아래층 기준을 못 넘으면 열리지 않는다', () => {
  const d = dexWith('npc', 6);
  d.weather = { w1: 1, w2: 1, w3: 1, w4: 1 };   // 3층만 잔뜩
  assert.equal(openFloors(d, DEX), 1);
});

test('진행도와 다음 목표를 함께 돌려준다(큐레이터 대사·안내에 쓴다)', () => {
  const d = dexWith('crop', 5);
  const p = floorProgress(1, d, DEX);
  assert.deepEqual(p, { have: 5, total: 13 });
  const n = nextFloorNeed(d, DEX);
  assert.equal(n.floor, 2);
  assert.equal(n.need, 9);
  assert.equal(n.have, 5);
  assert.equal(n.left, 4);
});

test('다 열렸으면 다음 목표가 없다', () => {
  const d = {};
  for (const k of Object.keys(DEX)) { d[k] = {}; DEX[k].forEach(e => { d[k][e.id] = 1; }); }
  assert.equal(openFloors(d, DEX), MUSEUM_FLOORS.length);
  assert.equal(nextFloorNeed(d, DEX), null);
});

test('빈 도감·모르는 층이어도 터지지 않는다', () => {
  assert.equal(openFloors({}, DEX), 1);
  assert.deepEqual(floorEntries(99, DEX), []);
  assert.deepEqual(floorProgress(99, {}, DEX), { have: 0, total: 0 });
});

// ── 짝 검증 ───────────────────────────────────────────────────
test('전시실이 층 목록을 museum.js 에서 가져온다', () => {
  assert.match(SRC, /floorEntries\(/, 'game.js 가 층 전시 목록을 직접 만들고 있다(단일 출처가 아니다)');
});

// ⚠️ 세이브에서 도감을 복원한 뒤 건물을 다시 세우지 않으면,
//    이미 2·3층을 연 사람도 접속할 때마다 1층 건물을 본다(🪓도구 등급에서 겪은 사고와 같은 유형).
test('세이브 복원 뒤 박물관 외관을 다시 세운다', () => {
  const i = SRC.indexOf('function applySave(');
  const body = SRC.slice(i, SRC.indexOf('\n}\n', i));
  const dex = body.indexOf('saved.dex');
  const ref = body.indexOf('refreshMuseumGate()');
  assert.ok(ref > 0, 'applySave 가 박물관 외관을 갱신하지 않는다');
  assert.ok(ref > dex, '도감 복원보다 먼저 갱신하면 아무 소용이 없다');
});

// 층이 열린 순간 밖에서 보이지 않으면 증축이 보상으로 읽히지 않는다
test('도감 등록이 외관 갱신을 부른다', () => {
  const i = SRC.indexOf('function dexDiscover(');
  const body = SRC.slice(i, SRC.indexOf('\n}\n', i));
  assert.match(body, /refreshMuseumGate\(true\)/, '도감이 늘어도 건물이 그대로다');
});

// ⚠️ 주민 도감을 손으로 적어 두면 주민을 추가할 때마다 빠뜨린다 —
//    실제로 주민 4명이 빠져 도감 토스트에 이름 대신 id 가 떴다. NPCS 에서 파생해야 한다.
test('주민 도감은 NPCS 에서 파생한다(손으로 적지 않는다)', () => {
  const i = SRC.indexOf('  npc: [');
  const block = SRC.slice(i, SRC.indexOf('  ],', i));
  assert.match(block, /\.\.\.NPCS\.map\(/, '주민 목록을 손으로 적고 있다 — 새 주민이 조용히 빠진다');
  assert.doesNotMatch(block, /id: 'farmer'/, '하드코딩이 남아 있다');
});

// ── 🧑‍🦳 "아직 🌈무지개 물고기가 없군요" — 남은 종을 콕 집는 의뢰 ─────
//   베타 피드백 "미션이 없어지는 지점에서 뭘 해야 할지 모르겠다" 를 직접 푸는 자리다.
import { pickMissingDex } from '../js/museum.js';

const OPEN = { locked: { river: false, sea: false, mist: false } };

test('아직 없는 종 하나를 집어 준다', () => {
  const d = dexWith('crop', 6);                       // 🍇포도만 빠졌다
  const pick = pickMissingDex(d, DEX, 1234, OPEN);
  assert.ok(pick, '남은 게 있는데 못 집었다');
  assert.ok(!d[pick.cat]?.[pick.id], '이미 가진 것을 집었다');
});

test('같은 시드면 같은 종 — 하루 안에 의뢰가 바뀌면 진행도가 증발한다', () => {
  const d = dexWith('crop', 3);
  const a = pickMissingDex(d, DEX, 777, OPEN), b = pickMissingDex(d, DEX, 777, OPEN);
  assert.deepEqual(a, b);
});

test('다 모았으면 null — 호출부가 다른 의뢰로 폴백한다', () => {
  const d = {};
  for (const k of Object.keys(DEX)) { d[k] = {}; DEX[k].forEach(e => { d[k][e.id] = 1; }); }
  assert.equal(pickMissingDex(d, DEX, 1, OPEN), null);
});

// ⚠️ 잠긴 맵에서만 나오는 것을 집으면 "영원히 못 깨는 의뢰" 가 된다(js/quests.js 가 막으려는 그 사고)
test('잠긴 맵의 종은 집지 않는다', () => {
  const d = {};
  for (const k of Object.keys(DEX)) d[k] = {};
  for (const k of Object.keys(DEX)) if (k !== 'river') DEX[k].forEach(e => { d[k][e.id] = 1; });
  const locked = { locked: { river: true, sea: false, mist: false } };
  assert.equal(pickMissingDex(d, DEX, 5, locked), null, '🛶강이 잠겼는데 강 도감을 집었다');
  assert.ok(pickMissingDex(d, DEX, 5, OPEN), '열려 있으면 집어야 한다');
});

// 🌦️ 날씨는 "그 날씨인 날 접속" 이라 하루 안에 못 맞출 수 있다 — 오늘의 의뢰로는 부적절
test('날씨 도감은 집지 않는다(그 날씨인 날을 기다려야 한다)', () => {
  const d = {};
  for (const k of Object.keys(DEX)) d[k] = {};
  for (const k of Object.keys(DEX)) if (k !== 'weather') DEX[k].forEach(e => { d[k][e.id] = 1; });
  assert.equal(pickMissingDex(d, DEX, 9, OPEN), null);
});

test('상태가 비어도 터지지 않는다', () => {
  assert.ok(pickMissingDex({}, DEX, 3, OPEN));
  assert.ok(pickMissingDex({}, DEX, 3, {}));
});


// ── 🏛️ 진열장 자리 — 모든 칸이 방 안에 있어야 한다 ─────────────
//   ⚠️ 이게 없어서 3층 31칸 중 16칸이 벽 밖 허공에 떴다. 이동 제한 밖이라
//      명판도 못 읽고 🔍도 못 눌러 "있지만 볼 수 없는" 전시물이 됐다.
//   game.js 는 노드에서 import 할 수 없어 함수 본문을 떼어 평가한다.
const HALF_W = 7.5, HALF_D = 6.5;
const slotsFn = (() => {
  const src = SRC.slice(SRC.indexOf('function museumSlots('), SRC.indexOf('\nlet museumCases'));
  // eslint-disable-next-line no-new-func
  return new Function('MUSEUM_HALF_W', 'MUSEUM_HALF_D', src + '\nreturn museumSlots;')(HALF_W, HALF_D);
})();

for (const floor of MUSEUM_FLOORS) {
  test(`${floor.name} 진열장이 전부 방 안에 있다`, () => {
    const count = floorEntries(floor.id, DEX).length;
    const slots = slotsFn(count);
    assert.equal(slots.length, count, '칸 수와 자리 수가 다르다 — 전시물이 사라지거나 남는다');
    const out = slots.filter(([x, z]) => Math.abs(x) > HALF_W - 0.8 || Math.abs(z) > HALF_D - 0.8);
    assert.deepEqual(out, [], `${out.length}칸이 벽 밖이다 — 걸어갈 수 없어 영원히 못 본다`);
  });
}

test('진열장끼리 겹치지 않는다', () => {
  for (const floor of MUSEUM_FLOORS) {
    const slots = slotsFn(floorEntries(floor.id, DEX).length);
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      const d = Math.hypot(slots[i][0] - slots[j][0], slots[i][1] - slots[j][1]);
      assert.ok(d > 1.1, `${floor.name} 진열장이 겹친다(간격 ${d.toFixed(2)})`);
    }
  }
});

// ⚠️ 관람 모형은 진열장과 **같은 자리**에 떠야 한다. 13칸 기준으로 읽으면
//    3층에서 undefined 를 구조분해해 터지고, 특별전에선 9m 떨어진 벽 속에 뜬다.
test('관람 모형이 층 칸 수에 맞는 자리를 쓴다', () => {
  const fn = SRC.slice(SRC.indexOf('function openMuseumView('), SRC.indexOf('\nfunction closeMuseumView'));
  assert.match(fn, /museumSlots\(museumFloorItems\(\)\.length\)/, '13칸 기준 자리를 쓰고 있다');
  assert.match(fn, /if \(!slot\) return/, '없는 자리를 그대로 구조분해한다');
});

// ⚠️ 2·3층 카테고리는 ORES·CROP_TYPES 에 없다 — 폴백이 없으면 2층에 들어가는 순간 터진다
test('모든 층 카테고리에 전시물 색 폴백이 있다', () => {
  const i = SRC.indexOf('const MUSEUM_CAT_TINT = {');
  assert.ok(i > 0, 'MUSEUM_CAT_TINT 가 없다 — 2층 전시물이 undefined.color 로 터진다');
  const tint = SRC.slice(i, SRC.indexOf('};', i));
  for (const f of MUSEUM_FLOORS) for (const cat of f.cats) {
    if (['crop', 'fish', 'ore'].includes(cat)) continue;   // 전용 조형이 있다
    assert.match(tint, new RegExp(`${cat}:`), `${cat} 폴백 색이 없다`);
  }
  const fn = SRC.slice(SRC.indexOf('function museumExhibitMesh('), SRC.indexOf('\n}', SRC.indexOf('function museumExhibitMesh(')));
  assert.match(fn, /MUSEUM_CAT_TINT\[item\.cat\]/, '폴백을 쓰지 않는다');
});
