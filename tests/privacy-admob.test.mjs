import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('개인정보처리방침: 앱 보상형 광고(애드몹)를 알린다', () => {
  const p = read('pages/privacy.html');
  assert.doesNotMatch(p, /광고를 게재하지 않습니다/);
  assert.match(p, /<td>Google LLC · AdMob \(미국\)<\/td>/);
  assert.match(p, /보상형 광고/);
  assert.match(p, /광고 ID/);
  assert.match(p, /설정 &gt; 개인정보 보호 및 보안 &gt; 추적/);
  assert.match(p, /배너·전면 광고는 없습니다/);
  assert.doesNotMatch(p, /최종 수정일: 2026년 10월 26일/);
});

test('개인정보처리방침 9항 앱 광고 설명에 엠대시를 쓰지 않는다', () => {
  const p = read('pages/privacy.html');
  const start = p.indexOf('<strong>앱 보상형 광고');
  assert.ok(start > 0);
  const block = p.slice(start, p.indexOf('<h2>10.'));
  assert.ok(!block.includes('—'), block);
});
