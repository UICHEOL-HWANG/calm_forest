import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOARD_ROW_Y, MENU_KEYS, FRY } from '../js/restaurant/data.js';
import { createSession, stationView } from '../js/restaurant/session.js';
import { nextStep, NEXT_TEXT, RECIPE } from '../js/restaurant/next-step.js';
import { menuView, menuHtml, contextLabel, STOCK_COPY, MENU_COPY, goalRows, ticketHtml } from '../js/restaurant/hud.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const dda = { iv: 1, pat: 1, win: 1 };
const make = (star, tickets) => {
  const S = createSession({ star, dda });
  S.tickets = tickets.map(([menu, table], i) => ({ id: i + 1, menu, table, t0: 0 }));
  return S;
};

test('확정 문구 그대로', () => {
  assert.equal(contextLabel({ do: 'batter' }), '🥣 반죽 묻히기');
  assert.equal(contextLabel({ do: 'heat' }), '🔥 불 맞추기');
  assert.equal(contextLabel({ do: 'shake' }), '🫧 흔들기');
  const want = {
    crate_shrimp: '🦐 상자에서 새우를 꺼내요', crate_squid: '🦑 상자에서 오징어를 꺼내요', crate_veg: '🥬 상자에서 채소를 꺼내요',
    bowlPut: '🥣 반죽 그릇에 올려요', bowlBusy: '🥣 반죽 그릇이 비면 올려요', bowlTap: '🥣 박자에 맞춰 두 번 눌러요', bowlPick: '🥣 반죽 묻힌 걸 들어요',
    fryerPut: '🍤 튀김기에 넣어요', fryerBusy: '🍤 튀김기가 비면 넣어요', fryHeat: '🔥 바늘이 초록 칸일 때 눌러요',
    fryShake: '🫧 거품이 오르면 눌러서 흔들어요', fryWait: '🍤 금빛이 되면 꺼내요', fryTake: '🍤 금빛이에요, 꺼내요',
  };
  for (const [k, v] of Object.entries(want)) assert.equal(NEXT_TEXT[k], v, k);
  assert.deepEqual(STOCK_COPY.items.shrimp, { ico: '🦐', name: '새우', where: '포구 섬 가까운 바다에서 낚아 와요' });
  assert.deepEqual(STOCK_COPY.items.squid, { ico: '🦑', name: '오징어', where: '포구 섬 먼바다나 밤바다에서 낚아 와요' });
  assert.deepEqual(STOCK_COPY.items.veg, { ico: '🥬', name: '채소', where: '포구 섬 시장에서 사 와요' });
  assert.equal(MENU_COPY.fryTip, '🔥 바늘이 초록 칸일 때 불을 맞춰요');
});

test('튀김 레시피 아이콘', () => {
  assert.deepEqual(RECIPE.shrimpfry, ['🦐', '🥣', '🔥', '🍤', '🍽️', '🙋']);
  assert.deepEqual(RECIPE.squidfry, ['🦑', '🥣', '🔥', '🍤', '🍽️', '🙋']);
  assert.deepEqual(RECIPE.vegfry, ['🥬', '🥣', '🔥', '🍤', '🍽️', '🙋']);
});

test('별 5·6 메뉴 카드: 튀김 줄과 세 번째 팁', () => {
  const v5 = menuView(5);
  assert.deepEqual(v5.rows.map(r => r[0]), ['🐟 생선구이', '🍙 주먹밥', '🍲 생선국', '🍤 새우튀김', '🦑 오징어튀김']);
  assert.deepEqual(v5.rows[3][1], ['🦐', '🥣', '🔥', '🍤', '🍽️']);
  assert.equal(menuView(6).rows[5][0], '🥬 채소튀김');
  const h = menuHtml(menuView(5, false, { fish: 1, rice: 1, shrimp: 1, squid: 1 }));
  assert.ok(h.includes(MENU_COPY.fryTip));
  assert.ok(!menuHtml(menuView(4, false, { fish: 1, rice: 1 })).includes(MENU_COPY.fryTip));
  assert.ok(!menuHtml(menuView(5, true)).includes(MENU_COPY.fryTip));
});

test('재고 부족 줄에 새 재료', () => {
  const h = menuHtml(menuView(6, false, { fish: 1, rice: 1 }));
  assert.ok(h.includes('<span>새우</span> 0 · <span>포구 섬 가까운 바다에서 낚아 와요</span>'));
  assert.ok(h.includes('<span>오징어</span> 0'));
  assert.ok(h.includes('<span>채소</span> 0'));
});

test('별 6 목표 줄과 튀김 주문표', () => {
  assert.equal(goalRows({ star: 5, rating: 0, served: {}, bestCombo: 0 })[1][0], '🍤 새우튀김 대접하기');
  assert.match(ticketHtml({ id: 1, table: 0, menu: 'squidfry', t0: 0 }, 0, 1, null), /<i>🦑<\/i>/);
});

test('튀김 안내: 상자, 그릇, 박자, 들기', () => {
  const S = make(5, [['shrimpfry', 0]]);
  let n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.text], [0, 'crate_shrimp', NEXT_TEXT.crate_shrimp]);
  assert.deepEqual(n.steps, RECIPE.shrimpfry);
  S.held = { kind: 'shrimp', q: 1 };
  n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.text], [1, 'bowl', NEXT_TEXT.bowlPut]);
  S.stations.bowl.item = { kind: 'squid', q: 1 };
  assert.equal(nextStep(S).text, NEXT_TEXT.bowlBusy);
  S.held = null;
  S.stations.bowl.item = { kind: 'shrimp', q: 1 };
  n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.text], [1, 'bowl', NEXT_TEXT.bowlTap]);
  S.stations.bowl.item = { kind: 'shrimpBat', q: 1 };
  S.stations.bowl.chop = { taps: 2, last: 0 };
  assert.equal(nextStep(S).text, NEXT_TEXT.bowlPick);
});

test('튀김 안내: 튀김기 넣기, 불, 흔들기, 기다리기, 꺼내기', () => {
  const S = make(5, [['squidfry', 0]]);
  S.held = { kind: 'squidBat', q: 1 };
  let n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.text], [2, 'fryer0', NEXT_TEXT.fryerPut]);
  S.stations.fryer0.item = { kind: 'shrimpBat', q: 1 };
  assert.deepEqual([nextStep(S).at, nextStep(S).text], ['fryer0', NEXT_TEXT.fryerBusy]);
  S.held = null;
  S.stations.fryer0 = { ...S.stations.fryer0, item: { kind: 'squidBat', q: 1 }, phase: 'heat', shakes: [false, false] };
  n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.text], [2, 'fryer0', NEXT_TEXT.fryHeat]);
  S.stations.fryer0.phase = 'fry';
  S.stations.fryer0.t = 0.5;
  assert.equal(nextStep(S).text, NEXT_TEXT.fryWait);
  S.stations.fryer0.t = FRY.bubbles[0] + 0.1;
  n = nextStep(S);
  assert.deepEqual([n.i, n.text], [3, NEXT_TEXT.fryShake]);
  S.stations.fryer0.t = FRY.bubbles[0] + FRY.bubbleWin + 0.1;
  assert.equal(nextStep(S).text, NEXT_TEXT.fryWait);
  S.stations.fryer0.shakes = [true, true];
  assert.equal(nextStep(S).text, NEXT_TEXT.fryWait);
  S.stations.fryer0.t = FRY.cook + 0.1;
  n = nextStep(S);
  assert.deepEqual([n.menu, n.i, n.at, n.text], ['squidfry', 3, 'fryer0', NEXT_TEXT.fryTake]);
  S.stations.fryer0.t = 99;
  assert.equal(nextStep(S).text, NEXT_TEXT.burnt);
});

test('튀김기 둘: 첫째가 차 있으면 둘째로', () => {
  const S = make(6, [['vegfry', 0]]);
  S.held = { kind: 'vegBat', q: 1 };
  S.stations.fryer0.item = { kind: 'shrimpBat', q: 1 };
  S.stations.fryer0.phase = 'heat';
  assert.deepEqual([nextStep(S).at, nextStep(S).text], ['fryer1', NEXT_TEXT.fryerPut]);
});

test('튀김 접시 담기와 내가기', () => {
  const S = make(5, [['shrimpfry', 2]]);
  S.held = { kind: 'shrimpfry', q: 1 };
  assert.deepEqual([nextStep(S).i, nextStep(S).at], [4, 'plates']);
  S.held = { kind: 'shrimpfry', q: 1, plated: true };
  assert.deepEqual([nextStep(S).i, nextStep(S).at], [5, 'table']);
});

test('튀기는 중 보기에 흔들기 성공 수', () => {
  const S = make(5, []);
  S.stations.fryer0 = { ...S.stations.fryer0, item: { kind: 'vegBat', q: 1 }, phase: 'fry', t: 1, heat: true, shakes: [true, false] };
  assert.equal(stationView(S, 'fryer0').shaken, 1);
});

test('칠판 줄 6개, 판 안에 위에서부터', () => {
  assert.deepEqual(Object.keys(BOARD_ROW_Y), MENU_KEYS);
  assert.deepEqual(Object.values(BOARD_ROW_Y), [1.31, 1.2, 1.09, 0.98, 0.87, 0.76]);
  for (const y of Object.values(BOARD_ROW_Y)) assert.ok(y > 1.12 - 0.44 && y < 1.12 + 0.44);
});

test('새 문구 영어 짝', async () => {
  globalThis.location ??= { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
  try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
  const { t, setLang } = await import('../js/i18n.js');
  const all = [
    '🥣 반죽 묻히기', '🔥 불 맞추기', '🫧 흔들기',
    ...Object.entries(NEXT_TEXT).filter(([k]) => /shrimp|squid|veg|bowl|fry/.test(k)).map(([, v]) => v),
    '🍤 새우튀김', '🦑 오징어튀김', '🥬 채소튀김', MENU_COPY.fryTip,
    ...['shrimp', 'squid', 'veg'].flatMap(k => [STOCK_COPY.items[k].name, STOCK_COPY.items[k].where]),
  ];
  setLang('en');
  for (const s of all) assert.doesNotMatch(t(s), /[가-힣]/, s);
  setLang('ko');
});

test('그릇 썰기는 첫 썰기 안내를 부르지 않고, 불·흔들기 팝이 있다', () => {
  const r = read('js/restaurant/runtime.js');
  assert.match(r, /e\.type === 'chop' && e\.taps === 1 && e\.id !== 'bowl'/);
  assert.match(r, /e\.type === 'heat'\) pop\(e\.id, e\.ok \? '✨' : '💨'\)/);
  assert.match(r, /e\.type === 'shake'\) pop\(e\.id, '🫧'\)/);
});

test('튀김기 두 대에 같은 메뉴가 있으면 지금 손이 필요한 쪽을 가리킨다', () => {
  const S = make(6, [['shrimpfry', 0], ['shrimpfry', 1]]);
  S.stations.fryer0 = { ...S.stations.fryer0, item: { kind: 'shrimpBat', q: 1 }, phase: 'fry', t: 0.3, shakes: [false, false] };
  S.stations.fryer1 = { ...S.stations.fryer1, item: { kind: 'shrimpBat', q: 1 }, phase: 'heat', shakes: [false, false] };
  assert.deepEqual([nextStep(S).at, nextStep(S).text], ['fryer1', NEXT_TEXT.fryHeat]);
  S.stations.fryer1 = { ...S.stations.fryer1, phase: 'fry', t: 0.2 };
  S.stations.fryer0.t = FRY.bubbles[1] + 0.1;
  assert.deepEqual([nextStep(S).at, nextStep(S).text], ['fryer0', NEXT_TEXT.fryShake]);
  S.stations.fryer0.shakes = [true, true];
  S.stations.fryer1.t = FRY.cook + 0.1;
  assert.deepEqual([nextStep(S).at, nextStep(S).text], ['fryer1', NEXT_TEXT.fryTake]);
});

test('낮은 화면에서 메뉴 카드는 화면 안에 들어오고 오른쪽만 넘겨 보며 시작 버튼은 아래에 붙어 있다', () => {
  const h = read('js/restaurant/hud.js');
  const m = h.match(/@media \(max-height:480px\)\{([\s\S]*?)\n\}/)[1];
  assert.match(m, /#rest-card \.box\{max-height:calc\(100vh - 16px\)\}/);
  assert.match(m, /#rest-card \.box > :last-child\{overflow-y:auto;min-width:0;/);
  assert.match(m, /#rest-card \.foot\{[^}]*position:sticky;bottom:0;/);
});
