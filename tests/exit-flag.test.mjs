import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { markExit, consumeExit } from '../js/exit-flag.js';

const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test('나가기 표시는 한 번만 읽힌다 — 다음 새로고침엔 다시 자동 연결', () => {
  const s = mem();
  assert.equal(consumeExit(s), false, '표시 없으면 false(첫 진입은 자동 연결 그대로)');
  markExit(s);
  assert.equal(consumeExit(s), true);
  assert.equal(consumeExit(s), false);
});

test('저장소가 없거나 막혀도 던지지 않는다(나가기·부팅을 막지 않는다)', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
  assert.doesNotThrow(() => markExit(broken));
  assert.equal(consumeExit(broken), false);
  assert.doesNotThrow(() => markExit(undefined));
  assert.equal(consumeExit(undefined), false);
});

test('signOut 은 새로고침 전에 표시를 남기고, 토스 자동 연결은 표시가 있으면 건너뛴다', () => {
  const sc = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  const so = sc.slice(sc.indexOf('export async function signOut'), sc.indexOf('location.reload()', sc.indexOf('export async function signOut')));
  assert.match(so, /markExit\(/, 'signOut 이 reload 전에 markExit 를 안 부른다');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /else if \(IS_TOSS && !res\.offline && !justExited\)/, '토스 자동 연결이 나가기 표시를 안 본다');
});
