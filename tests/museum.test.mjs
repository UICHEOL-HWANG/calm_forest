import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MUSEUM_FLOORS, floorEntries, floorProgress, openFloors, nextFloorNeed, viewFrame, exhibitCenterY } from '../js/museum.js';
import { VISITORS } from '../js/habitat.js';

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
  // 🦋 방문객도 **실제 개수를 읽는다** — 손으로 적으면 2층 진열장 자리 검증이 옛 칸 수로 돈다
  visitor: VISITORS.map(v => ({ id: v.id })),
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

test('층 구성 — 1층 13 · 2층 17 · 3층 18 · 특별전', () => {
  assert.equal(MUSEUM_FLOORS.length, 4);
  assert.equal(floorEntries(1, DEX).length, 13);
  assert.equal(floorEntries(2, DEX).length, 13 + VISITORS.length);   // 🍄🌟🪏🐾 13 + 🦋방문객
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

// ⚠️ 🦋 방문객은 큐레이터가 집으면 안 된다 — weather 와 같은 이유다.
//    장식 구매·배치가 선행이고 🐸 는 비 오는 날(약 20%)에만 온다.
//    DEX_NEVER 에서 빠지면 그날 dex_one 의뢰가 통째로 막힌다.
test('큐레이터는 방문객을 집지 않는다 — 오늘 안에 맞출 수가 없다', () => {
  const ONLY_VISITOR = { visitor: VISITORS.map(v => ({ id: v.id, name: v.name, ico: v.ico })) };
  for (let seed = 0; seed < 50; seed++) {
    assert.equal(pickMissingDex({}, ONLY_VISITOR, seed, {}), null,
      'visitor 만 있는 풀에서는 아무것도 집으면 안 된다');
  }
});

test('visitor 카테고리가 어느 층엔가 전시된다', () => {
  const placed = new Set(MUSEUM_FLOORS.flatMap(f => f.cats));
  assert.ok(placed.has('visitor'), '빠지면 방문객 4종이 영영 전시되지 않는다');
});

// ═══════════════════════════════════════════════════════════════
//  🛡️ 기존 유저 보호 — 도감 카테고리를 늘려도 이미 모은 사람이 손해를 보면 안 된다
//     (세이브 덮어쓰기 사고 2026-09-14 의 교훈: "괜찮을 것" 이 아니라 테스트로 잠근다)
// ═══════════════════════════════════════════════════════════════

/** game.js 의 dex 객체 리터럴에서 카테고리 키 목록을 뽑는다 */
function dexKeysAt(marker) {
  const i = SRC.indexOf(marker);
  assert.ok(i > 0, `${marker} 를 찾지 못했다 — 테스트가 낡았다`);
  const body = SRC.slice(i, SRC.indexOf('\n', i));   // 한 줄 리터럴 — `fish: {}` 의 첫 `}` 에서 자르면 안 된다
  return (body.match(/(\w+):\s*\{\}/g) || []).map(s => s.split(':')[0]);
}

// ⚠️ 기본 객체와 applySave 복원이 **같은 키 목록**이어야 한다.
//    한쪽만 고치면 세이브가 있는 유저에게 그 카테고리가 undefined 가 되고,
//    dexDiscover 첫 줄(`if (!gameState.dex[cat] ...) return;`)에서 조용히 반환해 영영 등록이 안 된다.
test('도감 기본 객체와 세이브 복원의 카테고리 목록이 같다', () => {
  const base = dexKeysAt('  dex: { fish: {}');
  const restore = dexKeysAt('gameState.dex = { fish: {}');
  assert.deepEqual(restore, base, '한쪽에만 카테고리가 추가됐다 — 그 종은 영영 등록되지 않는다');
  assert.ok(base.includes('visitor'), '🦋 방문객이 빠졌다');
});

test('세이브에 없던 카테고리가 생겨도 기존 도감은 그대로 살아남는다', () => {
  // applySave 와 같은 병합: 기본 키를 깔고 saved.dex 를 덮어쓴다
  const defaults = Object.fromEntries(dexKeysAt('  dex: { fish: {}').map(k => [k, {}]));
  const oldSave = { fish: { common: 111 }, crop: { carrot: 222 }, weather: { clear: 333 } };   // visitor 를 모르던 시절 세이브
  const merged = { ...defaults, ...oldSave };
  assert.deepEqual(merged.fish, { common: 111 }, '기존 기록이 사라졌다');
  assert.deepEqual(merged.crop, { carrot: 222 });
  assert.deepEqual(merged.weather, { clear: 333 });
  assert.deepEqual(merged.visitor, {}, '새 카테고리는 빈 채로 열려 있어야 등록이 된다');
});

// ⚠️ 종이 늘면 floorProgress 의 total 이 커진다. have 는 그대로이므로 해금이 후퇴하면 안 된다.
test('도감 종이 늘어도 이미 열린 층이 닫히지 않는다', () => {
  const OLD = { ...DEX }; delete OLD.visitor;          // 방문객이 없던 시절 표
  const owned = {};                                     // 2층을 9종 채워 3층을 연 유저
  for (const k of Object.keys(DEX)) owned[k] = {};
  OLD.crop.slice(0, 7).forEach(e => { owned.crop[e.id] = 1; });
  OLD.fish.slice(0, 2).forEach(e => { owned.fish[e.id] = 1; });   // 1층 9종
  OLD.forage.forEach(e => { owned.forage[e.id] = 1; });
  OLD.bug.forEach(e => { owned.bug[e.id] = 1; });
  OLD.dig.slice(0, 1).forEach(e => { owned.dig[e.id] = 1; });     // 2층 9종
  const before = openFloors(owned, OLD);
  const after = openFloors(owned, DEX);
  assert.equal(before, 3, '전제가 틀렸다 — 이 세이브는 원래 3층이 열려 있어야 한다');
  assert.equal(after, before, '방문객을 추가했더니 열려 있던 층이 닫혔다');
});

// ⚠️ 총계가 늘면 "다 모은 사람" 이 미완성으로 바뀐다. 배지는 회수하지 않아야 한다.
test('배지는 부여만 하고 회수하지 않는다 — 도감을 늘려도 도감 마스터가 사라지지 않는다', () => {
  const i = SRC.indexOf('function awardBadge(');
  const body = SRC.slice(i, SRC.indexOf('\n}\n', i));
  assert.ok(i > 0, 'awardBadge 를 찾지 못했다');
  assert.doesNotMatch(body, /delete\s+gameState\.badges|badges\[\w+\]\s*=\s*(null|false|0)\b/,
    '배지를 회수하는 경로가 있다 — 종을 늘리면 옛 완성자의 배지가 사라진다');
});

test('완성 보상은 배지로 막혀 다시 나가지 않는다', () => {
  const i = SRC.indexOf('function dexDiscover(');
  const body = SRC.slice(i, SRC.indexOf('\n}\n', i));
  assert.match(body, /total === DEX_TOTAL && !gameState\.badges\.dex_master/,
    '총계가 늘면 옛 완성자에게 완성 보상이 다시 나간다');
});

// ═══════════════════════════════════════════════════════════════
//  📖 희귀종 게이트 — 큐레이터가 오늘 못 깨는 의뢰를 내면 안 된다
// ═══════════════════════════════════════════════════════════════

// ⚠️ 맑은 날에 🌈무지개 물고기를 집으면 그날 의뢰가 불가능해진다(🦋방문객 DEX_NEVER 와 같은 함정).
//    DEX_NEVER 로 전부 막는 건 손해다 — 제일 재미있는 종을 큐레이터가 영영 못 집는다.
//    대신 **오늘 날씨에 열린 종만** 후보에 넣는다.
test('큐레이터는 오늘 날씨에 닫힌 게이트 종을 집지 않는다', () => {
  const GATED = { fish: [{ id: 'rare' }, { id: 'uncommon' }, { id: 'common' }] };
  const owned = { fish: { uncommon: 1, common: 1 } };   // rare 만 안 가졌다
  for (let seed = 0; seed < 30; seed++) {
    assert.equal(pickMissingDex(owned, GATED, seed, { weather: 'clear' }), null,
      '맑은 날에 🌈무지개 물고기를 집었다 — 그날 못 깨는 의뢰가 된다');
    const rain = pickMissingDex(owned, GATED, seed, { weather: 'rain' });
    assert.deepEqual(rain && { cat: rain.cat, id: rain.id }, { cat: 'fish', id: 'rare' },
      '비 오는 날엔 집어야 한다');
  }
});

// ⚠️ 의뢰는 하루치 시드로 고정되는데 밤낮은 하루 안에 바뀐다.
//    밤 종을 낮에 걸러내면 그날 의뢰가 아예 사라진다 → 날씨만 본다.
test('큐레이터 의뢰는 밤 조건을 보지 않는다 — 플레이어가 밤까지 기다리면 된다', () => {
  const GATED = { forage: [{ id: 'herb' }, { id: 'mushroom' }] };
  const owned = { forage: { mushroom: 1 } };
  const pick = pickMissingDex(owned, GATED, 7, { weather: 'clear' });
  assert.equal(pick && pick.id, 'herb',
    '🌿숲 약초는 night 게이트만 있다 — 낮에도 의뢰로 나와야 한다');
});

test('weather 를 안 넘기면 게이트를 보지 않는다(하위 호환)', () => {
  const GATED = { fish: [{ id: 'rare' }, { id: 'common' }] };
  const owned = { fish: { common: 1 } };
  assert.ok(pickMissingDex(owned, GATED, 3, {}), 'ctx.weather 없이도 동작해야 한다');
});

test('게이트 없는 종은 어떤 날씨에도 집을 수 있다 — 게이트가 흔한 종을 막으면 안 된다', () => {
  const PLAIN = { crop: [{ id: 'carrot' }, { id: 'tomato' }] };
  const owned = { crop: { tomato: 1 } };
  for (const w of ['clear', 'rain', 'snow', 'fog']) {
    assert.equal(pickMissingDex(owned, PLAIN, 11, { weather: w })?.id, 'carrot', `${w} 에서 막혔다`);
  }
});

// ── 🔍 확대 관람 프레이밍 (viewFrame) ────────────────────────────────
//   폰 세로에서 전시물 윗부분이 화면 밖으로 잘리던 제보(2026-09-21)를 고친 식.
//   위(상단 HUD·🔵토스 ···✕ 여백)와 아래(명판·돌아가기)를 뺀 빈 영역 한복판에 놓는다.
const FOV = 42, PHONE = { h: 812, top: 130, bot: 280, fov: FOV, aspect: 375 / 812 };
const tanHalf = (fov) => Math.tan(fov * Math.PI / 360);

// 전시물이 화면 세로에서 차지하는 비율(0~1) — 지름 기준
const screenFrac = (f, halfH) => (halfH / (f.dist * tanHalf(FOV)));
// 전시물 중심이 화면 위에서 몇 할 지점에 놓이는가(0=맨 위, 1=맨 아래)
const screenCenter = (f) => 0.5 + (f.dy / f.dist) / tanHalf(FOV) / 2;

// ── 🔍 전시물 시각 중심 높이 — 받침(그룹) 기준 상대값이어야 한다 ─────────
//   2026-09-24 제보: 확대하면 전시물이 사라지고 벽만 보였다(웹·모바일 모두).
//   Box3.setFromObject 는 **월드** 좌표를 돌려주는데 카메라는 그 값을 그룹 높이(1.75)에 또 더했다.
//   열자마자 한 번은 월드 행렬이 갱신 전이라 우연히 맞았고, 220ms 뒤 재측정에서 1.7 위를 보게 됐다.
test('exhibitCenterY: 월드 중심에서 받침 높이를 빼 상대값을 돌려준다', () => {
  assert.equal(exhibitCenterY(1.85, 1.75).toFixed(2), '0.10');
  assert.equal(exhibitCenterY(0.1, 0), 0.1);
});

test('museumViewFrame 은 월드 행렬을 갱신하고 받침 높이를 뺀다(첫 측정·재측정이 같게)', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('function museumViewFrame('), src.indexOf('function openMuseumView('));
  assert.match(fn, /updateWorldMatrix\(true, true\)/, '재기 전에 월드 행렬을 갱신해야 첫 측정과 재측정이 같다');
  assert.match(fn, /f\.cy = exhibitCenterY\(/, 'cy 는 받침 기준 상대값이어야 한다');
  assert.doesNotMatch(fn, /f\.cy = _mvCenter\.y;/, '월드 중심을 그대로 쓰면 그룹 높이가 두 번 더해진다');
});

test('viewFrame: 전시물이 빈 영역의 한복판에 온다', () => {
  const f = viewFrame({ ...PHONE, halfH: 0.3, halfW: 0.3 });
  const band = (PHONE.top + (PHONE.h - PHONE.bot)) / 2 / PHONE.h;
  assert.ok(Math.abs(screenCenter(f) - band) < 0.01, `중심 ${screenCenter(f)} ≠ 밴드 ${band}`);
});

test('viewFrame: 아래 UI 가 더 두꺼우면 전시물은 화면 중앙보다 위로 간다', () => {
  const f = viewFrame({ ...PHONE, halfH: 0.3, halfW: 0.3 });
  assert.ok(f.dy < 0, 'dy 가 음수여야 시선이 내려가 전시물이 위로 온다');
  assert.ok(screenCenter(f) < 0.5);
});

test('viewFrame: 크기가 달라도 화면 점유는 같다 — 돌도 포도송이도', () => {
  const small = viewFrame({ ...PHONE, halfH: 0.3, halfW: 0.3 });   // ⚠️ 둘 다 거리 clamp(1.6~5) 안쪽이어야 비교가 성립한다
  const big = viewFrame({ ...PHONE, halfH: 0.6, halfW: 0.6 });
  assert.ok(big.dist > small.dist, '큰 전시물일수록 멀리서 본다');
  assert.ok(Math.abs(screenFrac(small, 0.3) - screenFrac(big, 0.6)) < 0.01);
});

// ⚠️ 바운딩 **구**(대각선의 절반)를 넘기면 네모난 전시물이 √3 배로 부풀어
//    "빈 영역의 76%" 라는 약속이 조용히 깨진다 — 반치수를 받는다는 계약을 못 박는다.
test('viewFrame: 세로는 빈 영역의 fill 만큼을 채운다', () => {
  const halfH = 0.3, f = viewFrame({ ...PHONE, halfH, halfW: 0.1, fill: 0.76 });
  const usable = (PHONE.h - PHONE.top - PHONE.bot) / PHONE.h;
  assert.ok(Math.abs(screenFrac(f, halfH) - usable * 0.76) < 0.01);
});

test('viewFrame: 폰 세로에선 가로가 먼저 조인다 — 넓적한 전시물', () => {
  const wide = viewFrame({ ...PHONE, halfH: 0.2, halfW: 0.68 });   // 🐟 물고기처럼 옆으로 긴 것
  const halfW = 0.68 / (wide.dist * tanHalf(FOV) * PHONE.aspect);
  assert.ok(halfW <= 0.81, `가로 점유 ${halfW} 가 폭의 80% 를 넘었다`);
});

test('viewFrame: 밴드가 최소치로 벌어져도 중심이 밖으로 나가지 않는다', () => {
  // 폰 가로 + 🔵토스 여백 — 위아래 UI 가 화면의 78% 를 덮는 최악의 경우
  const f = viewFrame({ h: 375, top: 112, bot: 180, fov: FOV, aspect: 812 / 375, halfH: 0.3, halfW: 0.3 });
  const c = screenCenter(f), frac = screenFrac(f, 0.3);
  assert.ok(c - frac > 0 && c + frac < 1, `전시물(${c}±${frac})이 화면 밖으로 샌다`);
});

test('viewFrame: 거리는 min·max 안에 머문다', () => {
  const tiny = viewFrame({ ...PHONE, halfH: 0.001, halfW: 0.001 });
  const huge = viewFrame({ ...PHONE, halfH: 9, halfW: 9 });
  assert.equal(tiny.dist, 1.6);
  assert.equal(huge.dist, 5);
});
