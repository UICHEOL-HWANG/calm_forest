import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('개인정보처리방침: 메타 픽셀이 켜져 있으면 Meta 국외 이전·행태정보를 알린다', () => {
  const cfg = read('js/config.js');
  const pixelOn = /META_PIXEL_ID:\s*'\d+'/.test(cfg);
  const p = read('pages/privacy.html');
  if (!pixelOn) return;
  assert.match(p, /<td>Meta Platforms, Inc\. \(미국\)<\/td>/);
  assert.match(p, /광고 성과 측정/);
  assert.match(p, /_fbp/);
  assert.match(p, /fbclid/);
  assert.match(p, /이메일·이름은 보내지 않습니다/);
  assert.match(p, /facebook\.com\/adpreferences/);
  assert.doesNotMatch(p, /광고·추적 쿠키를 사용하지 않습니다/);
  assert.doesNotMatch(p, /최종 수정일: 2026년 10월 11일/);
});

test('개인정보처리방침 9항(쿠키·광고 측정)에 엠대시를 쓰지 않는다', () => {
  const p = read('pages/privacy.html');
  const block = p.slice(p.indexOf('<h2>9.'), p.indexOf('<h2>10.'));
  assert.ok(block.includes('광고 성과 측정'));
  assert.ok(!block.includes('—'), block);
});
