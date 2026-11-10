import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resultView, resultHtml } from '../js/restaurant/hud.js';

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
