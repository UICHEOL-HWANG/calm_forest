import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const { MINER_STEPS, MINER_DONE_LINES, ROOT_CINE_TOAST } = await import('../js/data/delve.js');

const ask = (id) => MINER_STEPS.find(s => s.id === id).ask;
const NEW = ['옛날엔 등불이 꺼지지 않던 곳이지', '우린 그걸 쓰고 뿌리 곁을 지켰다네', '맨 아래엔 우리가 지키던 게 있다네'];

test('광부가 탐험 중간에 뿌리 이야기를 흘린다', () => {
  assert.equal(ask('reopen')[1], NEW[0]);
  assert.equal(ask('grab')[1], NEW[1]);
  assert.equal(ask('bottom').at(-1), NEW[2]);
});

test('바닥에 닿은 뒤 대사는 뿌리지기 이야기다', () => {
  assert.deepEqual(MINER_DONE_LINES, [
    '뿌리에 빛이 돌았다고? 자네가 해냈군',
    '우리 광부들은 원래 뿌리지기였다네',
    '저 위 세계수까지 이어진 뿌리지',
    '뿌리가 마르자 갱도가 어두워져 다들 떠났다네',
    '🛒 이 광산 수레는 자네 거라네',
    '이제 매일 일감을 하나씩 맡기겠네',
  ]);
  assert.equal(ROOT_CINE_TOAST, '🌱 마른 뿌리에 다시 빛이 돌아요');
});

test('새 문구는 엠대시·놀다 없이 영어가 다 있다', () => {
  for (const s of [...NEW, ...MINER_DONE_LINES, ROOT_CINE_TOAST]) {
    assert.doesNotMatch(s, /—|놀/, s);
    assert.doesNotMatch(t(s), /[가-힣]/, s);
  }
});
