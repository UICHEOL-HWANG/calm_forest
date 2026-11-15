import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEKLY_COPY, fill } from '../js/weekly/copy.js';
import { WEEKLY_POOL, WEEKLY_FALLBACK } from '../js/data/weekly.js';
import { EN } from '../js/i18n-en.js';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t } = await import('../js/i18n.js');

const leaves = (o) => Object.values(o).flatMap(v => (typeof v === 'string' ? [v] : leaves(v)));
const dictKey = (ko) => ko.replace(/\{(\d+)\}/g, '{$1#}');
const HANGUL = /[가-힣]/;

test('every weekly string has an English entry without Hangul', () => {
  for (const ko of leaves(WEEKLY_COPY)) {
    const en = EN[dictKey(ko)];
    assert.ok(en !== undefined, `missing: ${ko}`);
    assert.doesNotMatch(en, HANGUL, ko);
    assert.equal(en, en.trim(), ko);
  }
});

test('weekly keys carry no stray spaces', () => {
  for (const ko of leaves(WEEKLY_COPY)) assert.equal(ko, ko.trim(), ko);
});

test('rendered weekly strings translate fully in English mode', () => {
  const left = [];
  for (const ko of leaves(WEEKLY_COPY)) {
    for (const n of [2, 6, 15]) {
      const shown = fill(ko, n);
      if (HANGUL.test(t(shown))) left.push(shown);
    }
  }
  assert.deepEqual(left, []);
});

test('weekly copy avoids banned characters', () => {
  for (const ko of leaves(WEEKLY_COPY)) assert.doesNotMatch(ko, /—|놀|[⬅⬆⬇➡↔-↙↩↪⤴⤵]/u, ko);
});

test('every quest has an approved name whose number matches its target', () => {
  for (const q of [...WEEKLY_POOL, ...WEEKLY_FALLBACK]) {
    const name = WEEKLY_COPY.quests[q.id];
    assert.ok(name, `no name for ${q.id}`);
    assert.equal(Number(name.match(/\d+/)[0]), q.target, `${q.id}: ${name}`);
  }
});

test('copy keeps the approved ticket numbers as slots', () => {
  assert.equal(fill(WEEKLY_COPY.board.sub, 2), '하나 끝낼 때마다 장터 표 2장을 받아요');
  assert.equal(fill(WEEKLY_COPY.board.claim, 2), '표 2장 받기');
  assert.equal(fill(WEEKLY_COPY.board.cap, 15), '표는 15장까지 모을 수 있어요');
  assert.equal(fill(WEEKLY_COPY.board.capNo, 15), '표가 15장 가득 찼어요. 장터에서 쓰고 받아 주세요');
  assert.equal(fill(WEEKLY_COPY.market.buy, 6), '표 6장으로 사기');
  assert.equal(fill(WEEKLY_COPY.market.short, 3), '표가 3장 모자라요');
  assert.equal(WEEKLY_COPY.market.guest, '로그인하면 장터에서 살 수 있어요. 모은 표는 그대로 남아요');
  assert.equal(WEEKLY_COPY.market.loginBtn, '🔐 로그인 후 구매 가능');
});
