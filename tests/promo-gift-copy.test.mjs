import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LETTER, FAIL, MENU, DECOR_TILES, stage1Lines, allCopy } from '../js/promo-gift/copy.js';
import { STAGE1_BUNDLE } from '../js/promo-gift/rules.js';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('1단계 목록은 4줄(씨앗 3종은 한 줄)', () => {
  assert.deepEqual(stage1Lines(STAGE1_BUNDLE), [
    { ico: '🪙', name: '코인', qty: '200' },
    { ico: '🌾', name: '고급 씨앗 3종', qty: '각 3개' },
    { ico: '🌱', name: '비료', qty: '5개' },
    { ico: '🪱', name: '미끼', qty: '5개' },
  ]);
});

test('2단계 칸은 보상 장식 이름과 같다', () => {
  const promo = REWARD_DECOR.filter(d => d.reward === 'promo');
  assert.deepEqual(DECOR_TILES.map(t => [t.ico, t.name]), promo.map(d => [d.ico, d.name]));
});

test('실패 문구는 이유별', () => {
  for (const r of ['unknown', 'inactive', 'expired', 'full', 'bad_code', 'not_started', 'net_fail', 'dup']) assert.ok(FAIL[r], r);
});

test('문구에 엠대시·놀다가 없고 전부 영어판이 있다', () => {
  for (const s of allCopy()) {
    assert.doesNotMatch(s, /—/, s);
    assert.doesNotMatch(s, /놀/, s);
    assert.ok(en.includes(`'${s}'`), `영어판 없음: ${s}`);
  }
  for (const d of REWARD_DECOR.filter(x => x.reward === 'promo')) {
    assert.ok(en.includes(`'${d.name}'`), d.name);
    assert.ok(en.includes(`'${d.desc}'`), d.desc);
  }
});

test('봉투 핵심 문구', () => {
  assert.equal(LETTER.title1, '고요한 숲에 온 걸 환영해요');
  assert.equal(LETTER.ps, '추신. 로그인하면 전용 꾸미기 세트를 하나 더 보내 드려요 🎈');
  assert.equal(LETTER.title2, '약속한 꾸미기 세트예요');
  assert.equal(MENU.button, '선물 코드');
});
