import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unreadNotices, pickText, maxId, quoteLine, expandedIds, parseBody } from '../js/notices.js';

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

test('expandedIds: 안 읽은 소식만 펼친다 — 지난 소식은 제목 한 줄로 접힌다', () => {
  assert.deepEqual(expandedIds([N(1), N(2), N(3)], 1).sort(), [2, 3]);
  assert.deepEqual(expandedIds([N(1), N(2)], 0).sort(), [1, 2], 'seenId 가 없으면(첫 유저) 전부 새 소식');
});

test('expandedIds: 다 읽었으면 최신 하나만 펼친다 — 전부 접힌 화면은 빈칸처럼 보인다', () => {
  assert.deepEqual(expandedIds([N(1), N(5), N(3)], 5), [5]);
  assert.deepEqual(expandedIds([N(9)], 99), [9], 'seenId 가 더 커도(다른 기기에서 먼저 읽음) 하나는 펼친다');
});

test('expandedIds: 빈 목록·쓰레기 행은 조용히 무시', () => {
  assert.deepEqual(expandedIds([], 0), []);
  assert.deepEqual(expandedIds(null, 0), []);
  assert.deepEqual(expandedIds([null, { id: 'x' }, N(2)], 0), [2]);
});

// ── parseBody: 본문 텍스트의 '|' 줄을 표로 — DB 는 텍스트 그대로, 렌더 규칙만 공유(게임 소식함·관리자 미리보기) ──
test('parseBody: | 없는 본문은 문단(lead)만', () => {
  const r = parseBody('첫 줄\n\n둘째 줄');
  assert.deepEqual(r, { lead: ['첫 줄', '둘째 줄'], header: null, rows: [], tail: [] });
});
test('parseBody: 첫 | 줄은 표 머리, 나머지는 행 — 셀 앞뒤 공백 제거', () => {
  const r = parseBody('리드 문장\n무엇이 | 어떻게\n반복 의뢰 |  다시 말을 걸어요 \n새 이웃|🦡오소리 · 🦆오리');
  assert.deepEqual(r.lead, ['리드 문장']);
  assert.deepEqual(r.header, ['무엇이', '어떻게']);
  assert.deepEqual(r.rows, [['반복 의뢰', '다시 말을 걸어요'], ['새 이웃', '🦡오소리 · 🦆오리']]);
});
test('parseBody: | 줄이 하나뿐이면 머리 없이 행 하나', () => {
  const r = parseBody('얼굴 | 매끈하게');
  assert.equal(r.header, null);
  assert.deepEqual(r.rows, [['얼굴', '매끈하게']]);
});
test('parseBody: 표 뒤의 문단은 tail — 빈 줄은 버림', () => {
  const r = parseBody('a | b\nc | d\n\n놀이 방식은 그대로예요\n');
  assert.deepEqual(r.rows, [['c', 'd']]);
  assert.deepEqual(r.header, ['a', 'b']);
  assert.deepEqual(r.tail, ['놀이 방식은 그대로예요']);
});
test('parseBody: 빈 값·null 은 빈 결과', () => {
  assert.deepEqual(parseBody(''), { lead: [], header: null, rows: [], tail: [] });
  assert.deepEqual(parseBody(null), { lead: [], header: null, rows: [], tail: [] });
});
test('parseBody: 셀 수는 줄마다 달라도 그대로(렌더가 맞춤)', () => {
  const r = parseBody('h1 | h2\nx | y | z\nq');
  assert.deepEqual(r.rows, [['x', 'y', 'z']]);
  assert.deepEqual(r.tail, ['q']);
});
