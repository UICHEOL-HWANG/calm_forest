import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('개인정보처리방침: 이웃 마을 공개 항목·끄는 법·보관', () => {
  const p = read('pages/privacy.html');
  assert.match(p, /<strong>이웃 마을 구경하기<\/strong>/);
  assert.match(p, /⚙️ 설정 › 이웃에게 내 마을 보여 주기/);
  assert.match(p, /10분 안에/);
  assert.match(p, /이웃 방문 기록/);
  assert.doesNotMatch(p, /최종 수정일: 2026년 9월 11일/);
});

test('안내서: 8장까지', () => {
  const ko = read('guide/guide.html'), en = read('guide/guide-en.html');
  assert.match(ko, /<h3>📖 나의 이야기 - 8장<\/h3>/);
  assert.match(ko, /8장 이웃의 숲\(이웃 마을에 놀러 가기, \+150🪙\)/);
  assert.match(en, /<h3>📖 My Story: 8 chapters<\/h3>/);
  assert.match(en, /Ch\. 8 Neighboring Forests \(visit a neighbor's village, \+150🪙\)/);
});
