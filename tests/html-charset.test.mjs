import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withUtf8 } from '../worker/html-charset.js';

test('charset 없는 HTML 응답에는 UTF-8 을 붙인다 (안내서 조각을 주소로 열어도 한글이 안 깨지게)', async () => {
  const res = withUtf8(new Response('<p>고요한 숲</p>', { headers: { 'Content-Type': 'text/html', 'X-Content-Type-Options': 'nosniff' } }));
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await res.text(), '<p>고요한 숲</p>');
});

test('이미 charset 이 있거나 HTML 이 아니면 그대로 둔다', () => {
  const a = new Response('x', { headers: { 'Content-Type': 'text/html; charset=EUC-KR' } });
  assert.equal(withUtf8(a), a);
  const b = new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  assert.equal(withUtf8(b), b);
  const c = new Response(null, { status: 307, headers: { Location: '/guide/guide' } });
  assert.equal(withUtf8(c), c);
});

test('워커는 정적 자산 응답을 withUtf8 로 감싼다', () => {
  const src = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ withUtf8 \} from '\.\/html-charset\.js';/);
  assert.match(src, /return withUtf8\(await env\.ASSETS\.fetch\(request\)\);/);
});
