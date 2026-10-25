import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const GAME = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

test('도감 등록 알림은 대화 창이 떠 있으면 닫힌 뒤에 보여 준다(수락하기·나중에 버튼을 가리던 문제)', () => {
  assert.match(GAME, /ui\.toast\?\.\(`📖 도감 등록! [^`]*`, 2400, \{ afterDialog: true \}\)/);
  assert.match(HTML, /toast\(msg, ms = 1600, opts = \{\}\) \{\n\s*if \(opts\.afterDialog && \(\$\('npc-modal'\)\.classList\.contains\('show'\) \|\| \$\('char-modal'\)\.classList\.contains\('show'\) \|\| document\.body\.classList\.contains\('intro-open'\)\)\) \{ pendingToasts\.push\(\[msg, ms, opts\]\); return; \}/);
  assert.match(HTML, /const closeCharModal = \(\) => \{ \$\('char-modal'\)\.classList\.remove\('show'\); ui\._charPreview\?\.stop\(\); flushPendingToasts\(\); \};/);
  assert.match(HTML, /const closeNpc = \(\) => \{ \$\('npc-modal'\)\.classList\.remove\('show'\); flushPendingToasts\(\); \};/);
});
