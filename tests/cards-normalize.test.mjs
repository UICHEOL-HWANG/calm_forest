import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanUrl, normalizeTopics, SOURCES } from '../functions/api/_cards-normalize.js';

test('cleanUrl: http(s) 만 남기고 나머지는 null', () => {
  assert.equal(cleanUrl('https://gall.dcinside.com/x'), 'https://gall.dcinside.com/x');
  assert.equal(cleanUrl('http://a.b/c'), 'http://a.b/c');
  // 실측: 디시 목록에서 'javascript:;' 가 url 자리에 들어온다
  assert.equal(cleanUrl('javascript:;'), null);
  assert.equal(cleanUrl(''), null);
  assert.equal(cleanUrl(undefined), null);
  assert.equal(cleanUrl('   '), null);
});

test('normalizeTopics: 출처별 필드 차이를 한 형태로 접는다', () => {
  const raw = {
    date: '2026-09-22',
    sources: {
      jobplanet: [{ category: '이직/취준', title: '제목A', excerpt: '본문A' }],
      blind:     [{ title: '제목B', excerpt: '본문B' }],
      dc:        [{ title: '제목C', url: 'javascript:;', excerpt: '' }],
      mlb:       [{ title: '제목D', url: 'https://mlbpark/x', excerpt: '본문D' }],
    },
  };
  const rows = normalizeTopics(raw, { collectedOn: '2026-09-22' });
  assert.equal(rows.length, 4);

  const a = rows.find(r => r.title === '제목A');
  assert.equal(a.source, 'jobplanet');
  assert.equal(a.category, '이직/취준');
  assert.equal(a.url, null, '잡플래닛은 url 이 없다');
  assert.equal(a.collected_on, '2026-09-22');

  const b = rows.find(r => r.title === '제목B');
  assert.equal(b.category, null, '블라인드는 category 가 없다');

  const c = rows.find(r => r.title === '제목C');
  assert.equal(c.url, null, 'javascript:; 는 DB 에 넣지 않는다');
  assert.equal(c.excerpt, '', '빈 본문은 빈 문자열로 (null 아님 — NOT NULL 컬럼)');

  assert.equal(rows.find(r => r.title === '제목D').url, 'https://mlbpark/x');
});

test('normalizeTopics: 쓰레기 입력을 조용히 버린다', () => {
  const raw = {
    sources: {
      dc: [
        { title: '', excerpt: 'x' },          // 제목 없음 → 버린다
        { excerpt: 'y' },                      // 제목 자체가 없음 → 버린다
        { title: '  공백 정리  ', excerpt: '  z  ' },
      ],
      unknown_src: [{ title: '알 수 없는 출처' }],   // 화이트리스트 밖 → 버린다
    },
  };
  const rows = normalizeTopics(raw, { collectedOn: '2026-09-22' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, '공백 정리', '앞뒤 공백을 턴다');
  assert.equal(rows[0].excerpt, 'z');
});

test('normalizeTopics: 같은 날 같은 출처에 같은 제목이 두 번 오면 하나만 남는다', () => {
  // DB 의 unique 제약과 같은 기준으로 미리 접는다 — 한 배치 안의 중복은
  // upsert 가 "ON CONFLICT DO UPDATE command cannot affect row a second time"
  // 로 통째로 실패시킨다.
  const raw = { sources: { blind: [{ title: '같은 제목', excerpt: '1' }, { title: '같은 제목', excerpt: '2' }] } };
  const rows = normalizeTopics(raw, { collectedOn: '2026-09-22' });
  assert.equal(rows.length, 1);
});

test('SOURCES: 스펙의 check 제약과 같은 목록', () => {
  assert.deepEqual(SOURCES, ['jobplanet', 'blind', 'dc', 'mlb', 'news']);
});
