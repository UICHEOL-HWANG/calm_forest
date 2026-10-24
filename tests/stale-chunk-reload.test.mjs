import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installStaleChunkReload, isStaleChunkError } from '../js/stale-chunk-reload.js';

function fakeWin() {
  const listeners = {};
  const store = new Map();
  const win = {
    reloads: 0,
    sessionStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    fire(type, ev) { for (const fn of listeners[type] || []) fn(ev); },
  };
  win.location = { reload() { win.reloads++; } };
  return win;
}

test('stale-chunk: 브라우저별 동적 import 실패 문구를 알아본다', () => {
  assert.ok(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/js/b/c-AB.js')));
  assert.ok(isStaleChunkError(new TypeError('Importing a module script failed.')));
  assert.ok(isStaleChunkError(new TypeError('error loading dynamically imported module')));
  assert.ok(!isStaleChunkError(new Error('Cannot read properties of undefined')));
  assert.ok(!isStaleChunkError(undefined));
});

test('stale-chunk: 옛 묶음 파일을 못 받으면 한 번만 새로고침한다', () => {
  const win = fakeWin();
  installStaleChunkReload(win);
  const ev = { reason: new TypeError('Failed to fetch dynamically imported module: /js/b/c-OLD.js') };
  win.fire('unhandledrejection', ev);
  win.fire('unhandledrejection', ev);
  assert.equal(win.reloads, 1);
});

test('stale-chunk: 다른 오류에는 새로고침하지 않는다', () => {
  const win = fakeWin();
  installStaleChunkReload(win);
  win.fire('unhandledrejection', { reason: new Error('boom') });
  assert.equal(win.reloads, 0);
});

test('stale-chunk: sessionStorage 가 막혀도 터지지 않고 새로고침하지 않는다', () => {
  const win = fakeWin();
  win.sessionStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  installStaleChunkReload(win);
  win.fire('unhandledrejection', { reason: new TypeError('Importing a module script failed.') });
  assert.equal(win.reloads, 0);
});
