import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEST_LOOT, CHEST_ZONE, CHEST_RULE, chestToday, placeChest, rollChest, chestOutcome, chestPaid, chestGive } from '../js/boat-chest.js';

// 🧰 나룻배 보물상자 규칙 — 보상표·하루 1개·위치·지급 규칙(2026-09-29 사용자 확정안)

const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

test('CHEST_LOOT: 확정 보상표 — id·확률이 정확히 일치한다', () => {
  assert.deepEqual(CHEST_LOOT.map(l => [l.id, l.w]), [
    ['sap_apple', 20], ['sap_peach', 10], ['sap_chestnut', 5], ['fert', 20], ['bait', 20], ['gem', 10], ['color', 15],
  ]);
  assert.equal(CHEST_LOOT.reduce((a, l) => a + l.w, 0), 100);
});

test('CHEST_LOOT: 코인·별조각 없음(나룻배는 코인을 안 주고, 별조각은 쓸 곳이 뱃사공 창고뿐)', () => {
  for (const l of CHEST_LOOT) {
    assert.ok(!('coins' in (l.give || {})), `${l.id}: 코인`);
    assert.ok(!('star' in (l.give || {})), `${l.id}: 별조각`);
  }
});

test('CHEST_LOOT: 인벤 키가 게임과 같다(묘목 sap_<과일> · fert · bait · gem)', () => {
  const byId = Object.fromEntries(CHEST_LOOT.map(l => [l.id, l.give]));
  assert.deepEqual(byId.sap_apple, { sap_apple: 1 });
  assert.deepEqual(byId.sap_peach, { sap_peach: 1 });
  assert.deepEqual(byId.sap_chestnut, { sap_chestnut: 1 });
  assert.deepEqual(byId.fert, { fert: 3 });
  assert.deepEqual(byId.bait, { bait: 5 });
  assert.deepEqual(byId.gem, { gem: 1 });
  assert.equal(byId.color, null);   // 🎨 집 색 — tryUnlockDrop 로 연다
});

test('chestGive: 실제 지급 기준 {id,name,give} — 집 색이 다 열렸으면 color_gem(보석 1)으로 기록·표시', () => {
  const color = CHEST_LOOT.find(l => l.id === 'color');
  assert.deepEqual(chestGive(color, { unlocked: true }), { id: 'color', name: '집 색 하나', give: {} });
  assert.deepEqual(chestGive(color, { unlocked: false }), { id: 'color_gem', name: '보석 1개', give: { gem: 1 } });   // 화면·원장이 진짜 보석과 구분된다
  const fert = CHEST_LOOT.find(l => l.id === 'fert');
  assert.deepEqual(chestGive(fert, {}), { id: 'fert', name: '비료 3개', give: { fert: 3 } });
});

test('chestToday: 오늘 건졌으면 false, 날이 바뀌면 다시 true', () => {
  assert.equal(chestToday({ chestDate: null }, '2026-10-01'), true);
  assert.equal(chestToday({}, '2026-10-01'), true);                      // 옛 세이브(필드 없음)
  assert.equal(chestToday({ chestDate: '2026-10-01' }, '2026-10-01'), false);
  assert.equal(chestToday({ chestDate: '2026-09-30' }, '2026-10-01'), true);
});

test('placeChest: 코스 70~85% 안, 강폭 안쪽', () => {
  assert.deepEqual(CHEST_ZONE, [0.70, 0.85]);
  for (let s = 1; s < 300; s++) {
    const { d, x } = placeChest(mulberry(s), { len: 620, width: 6.4 });
    assert.ok(d >= 620 * 0.70 && d <= 620 * 0.85, `d=${d}`);
    assert.ok(Math.abs(x) <= 6.4 - 1.3, `x=${x}`);
  }
});

test('rollChest: 같은 시드 같은 결과, 분포가 확률을 따른다', () => {
  assert.deepEqual(rollChest(42), rollChest(42));
  const n = {}, N = 40000;
  for (let s = 0; s < N; s++) { const r = rollChest(s * 7919 + 1); n[r.id] = (n[r.id] || 0) + 1; }
  for (const l of CHEST_LOOT) assert.ok(Math.abs((n[l.id] || 0) / N - l.w / 100) < 0.015, `${l.id}: ${(n[l.id] / N).toFixed(3)}`);
});

test('chestOutcome: 0 없음 · 1 보고 놓침 · 2 건짐 · 3 거기까지 못 감(건짐률 분모에서 뺀다)', () => {
  assert.equal(chestOutcome({ offered: false, seen: false, taken: false }), 0);
  assert.equal(chestOutcome({ offered: true, seen: true, taken: false }), 1);
  assert.equal(chestOutcome({ offered: true, seen: true, taken: true }), 2);
  assert.equal(chestOutcome({ offered: true, seen: false, taken: false }), 3);   // 난파·그만두기가 상자 전에 — 놓친 게 아니다
});

test('chestPaid: 확정 규칙은 always — 난파·그만두기에도 지급', () => {
  assert.equal(CHEST_RULE, 'always');
  for (const r of ['clear', 'wreck', 'quit']) assert.equal(chestPaid(r), true, r);
  assert.equal(chestPaid('wreck', 'clear_only'), false);
  assert.equal(chestPaid('clear', 'clear_only'), true);
});
