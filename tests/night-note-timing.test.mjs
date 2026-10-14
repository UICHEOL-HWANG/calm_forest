import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/spaces/night-visit.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('밤손님 쪽지 — 접속 안내와 함께 편지 카드를 바로 띄우고, 도착하면 그 카드를 채운다', () => {
  assert.match(src, /noteCardOpen = true;/);
  assert.match(src, /noteArrivedOpen\(noteQ, n, \{ cardOpen: noteCardOpen \}\)/);
  assert.doesNotMatch(src, /setTimeout\(showNoteIfIdle, 4600\)/);
});

test('쪽지 대기 문구는 영어 사전에도 있다', () => {
  assert.match(en, /'삼촌이 쪽지를 쓰고 있어요…':/);
});

test('대결에서 이기면 첫 수확처럼 밀착 연출 + 되찾은 작물을 머리 위로', () => {
  assert.match(src, /function winCeremony\(/);
  assert.match(src, /triggerMoment\(true\)/);
  assert.match(src, /showCatchItem\(cropMini\(/);
  assert.match(src, /if \(won\) setTimeout\(\(\) => winCeremony\(crops\), \d+\)/);
});

test('쪽지가 카드보다 먼저 도착했으면 대기 문구 없이 바로 쪽지를 띄운다', () => {
  assert.match(src, /const ready = beforeDuel\(noteQ\);\n\s*noteQ = ready\.state;\n\s*if \(ready\.show\) showNote\(ready\.show\);/);
});
