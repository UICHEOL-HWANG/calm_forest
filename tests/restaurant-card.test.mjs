import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resultView, resultHtml, goalRows, stockNeed, ticketHtml } from '../js/restaurant/hud.js';

const r = { served: 7, avg: 4.6, coins: 175, perfect: 5 };
const copy = { done: '영업 끝!', starUp: n => `⭐${n} 식당이 됐어요` };

test('영업 끝 카드는 칠판 머리·숫자 세 칸·진행 막대', () => {
  const v = resultView(r, { bonus: 0, starUp: false, rest: { star: 1 } }, [['식당 평점', 34, 40], ['🍙 내기', 5, 5]], copy);
  assert.equal(v.kicker, '오늘의 영업');
  assert.equal(v.title, '영업 끝!');
  assert.deepEqual(v.stats, [['7명', '손님'], ['5개', '완벽한 요리'], ['🪙 175', '번 코인']]);
  const h = resultHtml(v);
  assert.match(h, /class="head"/);
  assert.match(h, /평균 ★4\.6/);
  assert.match(h, /width:85%/);
  assert.match(h, /class="bar full"/);
  assert.doesNotMatch(h, /별 올리기 선물/);
  assert.equal((h.match(/★/g) || []).length, 6);
});

test('별 올리기 카드는 축하 머리와 선물 띠', () => {
  const v = resultView(r, { bonus: 100, starUp: true, rest: { star: 2 } }, [], copy);
  assert.equal(v.kicker, '축하해요');
  assert.equal(v.title, '⭐2 식당이 됐어요');
  const h = resultHtml(v);
  assert.match(h, /🎁 별 올리기 선물 🪙 100/);
  assert.doesNotMatch(h, /다음 별까지/);
});

test('카드 문구에 엠대시·영어 없음', () => {
  const h = resultHtml(resultView(r, { bonus: 100, starUp: true, rest: { star: 2 } }, [['식당 평점', 1, 2]], copy));
  assert.doesNotMatch(h, /—/);
  assert.doesNotMatch(h.replace(/<[^>]+>/g, ''), /[A-Za-z]{3,}/);
});

test('다음 별 목표 줄은 메뉴 이름과 대접하기로 쓴다', () => {
  const rest = { star: 1, rating: 40, served: { grilled: 4, riceball: 4, soup: 0 }, bestCombo: 0 };
  assert.deepEqual(goalRows(rest)[1], ['🍙 주먹밥 대접하기', 4, 5]);
  assert.deepEqual(goalRows({ ...rest, star: 3 })[1], ['🍲 생선국 대접하기', 0, 8]);
});

const soldCopy = { ...copy, soldOut: '재료가 다 떨어졌어요' };
const rest1 = { star: 1, rating: 40, served: { grilled: 4, riceball: 4, soup: 0 }, bestCombo: 0 };

test('재료가 떨어져 일찍 끝나면 제목이 바뀐다', () => {
  const v = resultView({ ...r, soldOut: true }, { bonus: 0, starUp: false, rest: rest1 }, [], soldCopy);
  assert.equal(v.title, '재료가 다 떨어졌어요');
  const up = resultView({ ...r, soldOut: true }, { bonus: 100, starUp: true, rest: { star: 2 } }, [], soldCopy);
  assert.equal(up.title, '⭐2 식당이 됐어요');
});

test('막힌 목표 재료가 없으면 그 목표 줄 아래에 한 줄로 알려 준다', () => {
  const need = stockNeed(rest1, { fish: 0, rice: 0 });
  assert.deepEqual(need, { row: 1, items: [{ k: 'rice', n: 0 }] });
  const v = resultView(r, { bonus: 0, starUp: false, rest: rest1 }, goalRows(rest1), soldCopy, need);
  const h = resultHtml(v);
  assert.match(h, /class="gneed">🍚 쌀 0 · 포구 섬 시장에서 사 와요</);
  assert.ok(h.indexOf('주먹밥 대접하기') < h.indexOf('gneed'));
  assert.match(h, /data-act="done">확인</);
  assert.match(h, /data-act="guide">🧭 안내 받기</);
});

test('막힌 목표와 상관없는 재료만 모자라면 마지막 목표 줄 아래에 모두 보여 준다', () => {
  const rest = { ...rest1, served: { grilled: 4, riceball: 5, soup: 0 } };
  assert.deepEqual(stockNeed(rest, { fish: 0, rice: 3 }), { row: 1, items: [{ k: 'fish', n: 0 }] });
  const full = { shrimp: 3, squid: 3, veg: 3 };
  assert.deepEqual(stockNeed({ ...rest, star: 6 }, { fish: 0, rice: 0, ...full }), { row: -1, items: [{ k: 'fish', n: 0 }, { k: 'rice', n: 0 }] });
  const h = resultHtml(resultView(r, { bonus: 0, starUp: false, rest: { star: 6 } }, [], soldCopy, stockNeed({ ...rest, star: 6 }, { fish: 0, rice: 0, ...full })));
  assert.equal((h.match(/class="gneed"/g) || []).length, 2);
});

test('재료가 넉넉하면 안내 줄과 안내 버튼이 없다', () => {
  assert.equal(stockNeed(rest1, { fish: 3, rice: 3 }), null);
  const h = resultHtml(resultView(r, { bonus: 0, starUp: false, rest: rest1 }, goalRows(rest1), soldCopy, null));
  assert.doesNotMatch(h, /gneed|data-act="guide"/);
  assert.match(h, /<button type="button">확인</);
});

test('주문표는 손님 얼굴 배지를 달고 좋아하는 메뉴면 분홍으로 표시한다', () => {
  const t = { id: 1, table: 0, menu: 'grilled', t0: 0, face: '🎣', fav: true };
  const h = ticketHtml(t, 1, 1, null);
  assert.match(h, /<div class="tk fav"><span class="face">🎣<\/span><b>1<\/b><i>🐟<\/i>/);
  const plain = ticketHtml({ ...t, face: '🦌', fav: false }, 1, 1, 1);
  assert.match(plain, /^<div class="tk now"><span class="face">🦌<\/span><b>1<\/b>/);
  assert.doesNotMatch(ticketHtml({ ...t, face: '', fav: false }, 1, 1, null), /class="face"/);
});
