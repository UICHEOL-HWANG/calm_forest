import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unreadNotices, pickText, maxId, quoteLine } from '../js/notices.js';

const N = (id, extra = {}) => ({ id, title: `제목${id}`, body: `본문${id}`, title_en: null, body_en: null,
                                 target_user_id: null, reply_to: null, created_at: '2026-09-11T00:00:00Z', feedback: null, ...extra });

test('unreadNotices: seenId 보다 큰 id 만, 오름차순', () => {
  const list = [N(5), N(2), N(9), N(3)];
  assert.deepEqual(unreadNotices(list, 3).map(n => n.id), [5, 9]);
});
test('unreadNotices: seenId 가 없으면(0/undefined) 전부', () => {
  assert.equal(unreadNotices([N(1), N(2)], 0).length, 2);
  assert.equal(unreadNotices([N(1), N(2)], undefined).length, 2);
});
test('unreadNotices: 빈 목록·비배열은 []', () => {
  assert.deepEqual(unreadNotices([], 0), []);
  assert.deepEqual(unreadNotices(null, 0), []);
});

test('pickText: ko 면 항상 한국어', () => {
  assert.deepEqual(pickText(N(1, { title_en: 'T', body_en: 'B' }), 'ko'), { title: '제목1', body: '본문1' });
});
test('pickText: en 이면 영어 있을 때만 영어, 없으면 한국어 폴백(필드별)', () => {
  assert.deepEqual(pickText(N(1, { title_en: 'T', body_en: 'B' }), 'en'), { title: 'T', body: 'B' });
  assert.deepEqual(pickText(N(1, { title_en: 'T' }), 'en'), { title: 'T', body: '본문1' });
  assert.deepEqual(pickText(N(1, { title_en: '' }), 'en'), { title: '제목1', body: '본문1' });
});

test('maxId: 가장 큰 id, 빈 목록이면 0', () => {
  assert.equal(maxId([N(4), N(11), N(7)]), 11);
  assert.equal(maxId([]), 0);
});

test('quoteLine: 답장이면 원문 앞 60자, 줄바꿈은 공백으로', () => {
  const n = N(1, { reply_to: 3, feedback: { message: '밤에 밭이\n잘 안 보여요' } });
  assert.equal(quoteLine(n), '밤에 밭이 잘 안 보여요');
  const long = N(2, { reply_to: 4, feedback: { message: 'a'.repeat(80) } });
  assert.equal(quoteLine(long), 'a'.repeat(60) + '…');
});
test('quoteLine: 전체 공지거나 원문을 못 읽으면 null', () => {
  assert.equal(quoteLine(N(1)), null);
  assert.equal(quoteLine(N(1, { reply_to: 3, feedback: null })), null);
});
