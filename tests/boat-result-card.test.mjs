import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resultCardHtml, RESULT_COPY } from '../js/boat/result-card.js';

const base = {
  result: 'clear', perfect: false, dist: 620, total: 620, time: 52.3, score: 964, best: false, hits: 2, comboMax: 12, stars: 13, totalStar: 14,
  boatIco: '🐟', boatName: '비단잉어', course: 'rapid', picks: [], mats: {}, chest: null, runsLeft: 1, runsMax: 3,
};
const html = (o = {}) => resultCardHtml({ ...base, ...o });

test('wreck copy, head class and marker', () => {
  const h = html({ result: 'wreck', dist: 304 });
  assert.match(h, /class="brc-head wreck"/);
  assert.ok(h.includes('배가 가라앉았어요'));
  assert.ok(h.includes('🎒 주운 건 그대로 · 🛶 배는 내일 멀쩡해요'));
  assert.ok(h.includes('💥') && h.includes('🌊'));
});

test('clear perfect and clear copy', () => {
  const p = html({ perfect: true, hits: 0 });
  assert.match(p, /class="brc-head clear"/);
  assert.ok(p.includes('무사히 도착!') && p.includes('한 번도 부딪히지 않았어요. 완벽한 뱃길!'));
  assert.ok(p.includes('⛵') && p.includes('🎉'));
  const c = html({ dist: 580 });
  assert.ok(c.includes('580m를 내려왔어요'));
  assert.ok(!c.includes('완벽한 뱃길'));
});

test('quit copy, head class and marker', () => {
  const h = html({ result: 'quit', dist: 120 });
  assert.match(h, /class="brc-head quit"/);
  assert.ok(h.includes('뱃길을 멈췄어요'));
  assert.ok(h.includes('120m 지점에서 멈췄어요. 여기까지 모은 건 그대로 가져가요'));
  assert.ok(h.includes('🛶</i>'));
});

test('route shows boat, course label and marker position', () => {
  const h = html({ result: 'wreck', dist: 310 });
  assert.ok(h.includes('나루터') && h.includes('비단잉어') && h.includes('급류'));
  assert.ok(h.includes('310m'));
  assert.match(h, /left:calc\(50%/);
  assert.ok(html({ course: 'calm' }).includes('잔잔한 물길'));
});

test('score, best pill, tiles', () => {
  assert.ok(!html().includes('최고 기록'));
  assert.ok(html({ best: true }).includes('🏆 최고 기록'));
  const h = html();
  assert.ok(h.includes('964') && h.includes('52.3초') && h.includes('2회') && h.includes('×12'));
});

test('reward chips', () => {
  const h = html({
    picks: [{ ico: '🪷', name: '물 위 연꽃', n: 2 }], mats: { lotus: 3, shell: 0, driftwood: 1 },
    chest: { paid: true, missed: false, name: '사과 묘목' },
  });
  assert.ok(h.includes('보유 ⭐ 14'));
  assert.ok(h.includes('+13'));
  assert.ok(h.includes('물 위 연꽃') && h.includes('×2'));
  assert.ok(h.includes('🪷') && h.includes('재료 +3'));
  assert.ok(h.includes('🪵') && h.includes('재료 +1'));
  assert.ok(!h.includes('🐚'));
  assert.ok(h.includes('🧰') && h.includes('사과 묘목'));
});

test('chest missed shows grey chip', () => {
  const h = html({ chest: { paid: false, missed: true, name: null } });
  assert.match(h, /chip off[^>]*>.*다음 뱃길에 또 떠내려와요/);
});

test('nothing earned shows the empty chip', () => {
  const h = html({ stars: 0, picks: [], mats: { lotus: 0 }, chest: null });
  assert.ok(h.includes('이번엔 빈손이에요'));
  assert.ok(!h.includes('chip star'));
});

test('names are escaped', () => {
  const h = html({ boatName: '<b>x</b>', picks: [{ ico: '🪷', name: '<i>y</i>', n: 1 }], chest: { paid: true, missed: false, name: '<u>z</u>' } });
  assert.ok(!h.includes('<b>x') && !h.includes('<i>y') && !h.includes('<u>z'));
  assert.ok(h.includes('&lt;b&gt;x'));
});

test('no em dash in result-card.js or its copy', () => {
  assert.ok(!readFileSync(new URL('../js/boat/result-card.js', import.meta.url), 'utf8').includes('—'));
  assert.ok(!JSON.stringify(RESULT_COPY).includes('—'));
});

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
test('index.html wiring', () => {
  assert.ok(index.includes("from './js/boat/result-card.js'"));
  const m = index.match(/<div id="boat-result">[\s\S]*?<!-- 📸/)[0];
  assert.ok(m.includes('id="br-again"') && m.includes('id="boat-result-close"') && m.includes('id="br-body"') && m.includes('id="br-runs"'));
  const fn = index.slice(index.indexOf('showBoatResult(d) {'), index.indexOf('openBoatShop(d)'));
  assert.ok(!fn.includes('boat-row'));
  assert.ok(fn.includes('resultCardHtml('));
});

test('dock-ui exports MAT_ICO for reuse', () => {
  assert.ok(/export const MAT_ICO/.test(readFileSync(new URL('../js/boat/dock-ui.js', import.meta.url), 'utf8')));
});
