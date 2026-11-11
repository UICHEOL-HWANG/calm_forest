import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HALL } from '../js/restaurant/data.js';
import { stockStatus } from '../js/restaurant/rules.js';
import { createSession, tickSession } from '../js/restaurant/session.js';

globalThis.location ??= { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { menuView, menuHtml, STOCK_COPY } = await import('../js/restaurant/hud.js');
const { t, setLang } = await import('../js/i18n.js');

const one = { iv: 1, pat: 1, win: 1 };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const board = (() => { const s = HALL.stations.find(s => s.id === 'board'); return { x: s.x, z: s.z + 0.9 }; })();
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('stockStatus 는 이 별 단계 메뉴 재료 중 0 인 것을 모은다', () => {
  assert.deepEqual(stockStatus(['grilled', 'riceball'], { fish: 3, rice: 0 }), { short: [{ k: 'rice', n: 0 }], none: false, partial: true });
  assert.deepEqual(stockStatus(['grilled', 'riceball', 'soup'], { fish: 0, rice: 0 }), { short: [{ k: 'fish', n: 0 }, { k: 'rice', n: 0 }], none: true, partial: false });
  assert.deepEqual(stockStatus(['grilled', 'riceball'], { fish: 1, rice: 2 }), { short: [], none: false, partial: false });
  assert.deepEqual(stockStatus(['grilled'], undefined), { short: [{ k: 'fish', n: 0 }], none: true, partial: false });
});

test('재고 있는 메뉴만 주문으로 나온다 (부분 영업)', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0.99, 0), stock: k => (k === 'fish' ? 2 : 0) });
  for (let i = 0; i < 200; i++) tickSession(S, 0.05, { pos: board });
  assert.ok(S.guests.length > 0);
  assert.ok(S.guests.every(g => g.menu === 'grilled'));
});

test('재료가 하나도 없으면 손님이 오지 않는다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0), stock: () => 0 });
  for (let i = 0; i < 400; i++) tickSession(S, 0.05, { pos: board });
  assert.equal(S.gid, 0);
});

test('첫 영업(연습)은 재고와 상관없이 생선구이 손님 한 명', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0.99), first: true, stock: () => 0 });
  for (let i = 0; i < 200; i++) tickSession(S, 0.05, { pos: board });
  assert.equal(S.gid, 1);
  assert.equal(S.guests[0]?.menu ?? S.tickets[0]?.menu, 'grilled');
});

test('칠판 카드: 모자란 재료는 구하는 곳과 함께, 부분 영업이면 안내 한 줄', () => {
  const h = menuHtml(menuView(1, false, { fish: 3, rice: 0 }));
  assert.match(h, /⚠️ 재고가 부족해요/);
  assert.match(h, /🍚 <span>쌀<\/span> 0 · <span>포구 섬 시장에서 사 와요<\/span>/);
  assert.match(h, /있는 재료로 만드는 메뉴만 주문이 들어와요/);
  assert.match(h, /🔔 영업 시작/);
  assert.doesNotMatch(h, /data-act="guide"/);
});

test('칠판 카드: 재료가 전혀 없으면 영업 대신 섬 안내를 묻는다', () => {
  const h = menuHtml(menuView(1, false, { fish: 0, rice: 0 }));
  assert.match(h, /🐟 <span>생선<\/span> 0 · <span>포구 섬에서 낚아 와요<\/span>/);
  assert.match(h, /섬에 가서 식자재를 받아 와야 해요\. 안내받으시겠어요\?/);
  assert.match(h, /data-act="guide">🧭 안내 받기</);
  assert.match(h, /data-act="later">다음에</);
  assert.doesNotMatch(h, /🔔 영업 시작/);
});

test('첫 영업 카드는 재고 경고가 없다', () => {
  assert.doesNotMatch(menuHtml(menuView(1, true, { fish: 0, rice: 0 })), /재고가 부족해요/);
});

test('재고 문구는 모두 영어가 있다', () => {
  setLang('en');
  const all = [STOCK_COPY.title, STOCK_COPY.partial, STOCK_COPY.ask, STOCK_COPY.guide, STOCK_COPY.later, STOCK_COPY.follow, ...Object.values(STOCK_COPY.items).flatMap(v => [v.name, v.where])];
  for (const s of all) assert.doesNotMatch(t(s), /[가-힣]/, s);
  setLang('ko');
});

test('섬 안내는 경매 길 안내를 이름만 바꿔 쓰고, 영업 시작 전 카드에서 연다', () => {
  const g = read('js/auction/guide.js');
  assert.match(g, /const P = `\$\{deps\.name \|\| 'auction'\}-guide`;/);
  assert.doesNotMatch(g, /id = 'auction-guide/);
  const r = read('js/spaces/restaurant.js');
  assert.match(r, /createAuctionGuide\(\{\s*name: 'restaurant-stock'/);
  assert.match(r, /spot: \{ x: PORT_PIER\.ax, z: PORT_PIER\.az \}/);
  assert.match(read('js/restaurant/runtime.js'), /hud\.menu\(menuView\(env\.rest\(\)\.star, first, env\.port\(\)\?\.pantry\), start, env\.onStockGuide\)/);
});
