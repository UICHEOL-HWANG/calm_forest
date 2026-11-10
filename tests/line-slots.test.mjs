import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POOL_CAP, ANY, AUCTION_ITEMS, SLOTS, keysFor, slotsFor, cells, cellId, lineLength, lineProblem, fillLine,
} from '../js/lines/slots.js';

const cell = (slot, lang = 'ko') => ({ kind: 'auction', slot, lang });

test('경매 칸은 경매품별 2 slot과 공통 5 slot, 두 언어로 22칸', () => {
  assert.deepEqual(keysFor('auction'), [...AUCTION_ITEMS, ANY]);
  assert.deepEqual(slotsFor('auction', 'moonswing'), ['intro', 'open']);
  assert.deepEqual(slotsFor('auction', ANY), ['raise_npc', 'raise_me', 'last', 'sold_me', 'sold_npc']);
  assert.equal(cells('auction').length, 22);
  assert.equal(cellId({ kind: 'auction', key: ANY, slot: 'last', lang: 'en' }), 'auction|_any|last|en');
  assert.equal(POOL_CAP, 30);
  assert.equal(SLOTS.auction.raise_npc.per, 4);
});

test('정상 문구는 통과한다', () => {
  assert.equal(lineProblem('{who}께서 부르셨소!', cell('raise_npc')), null);
  assert.equal(lineProblem('{who} raises the bid!', cell('raise_npc', 'en')), null);
  assert.equal(lineProblem('더 부르실 분 없소?', cell('last')), null);
});

test('자리표시가 빠지거나 모르는 자리표시가 있으면 vars', () => {
  assert.equal(lineProblem('좋소, 좋아!', cell('raise_npc')), 'vars');
  assert.equal(lineProblem('{name}께서 부르셨소!', cell('raise_npc')), 'vars');
  assert.equal(lineProblem('{who}, 손님도 부르시오!', cell('raise_me')), 'vars');
});

test('숫자·금지어·조사·언어·길이를 거른다', () => {
  assert.equal(lineProblem('3번째 손님이오!', cell('raise_me')), 'digit');
  assert.equal(lineProblem('자, 시작하오 — 서두르시오!', cell('last')), 'banned');
  assert.equal(lineProblem('같이 놀아요!', cell('last')), 'banned');
  assert.equal(lineProblem('{who}가 불렀소!', cell('raise_npc')), 'josa');
  assert.equal(lineProblem('{who}를 보시오!', cell('raise_npc')), 'josa');
  assert.equal(lineProblem('Going once!', cell('last')), 'lang');
  assert.equal(lineProblem('한 번 더!', cell('last', 'en')), 'lang');
  assert.equal(lineProblem('가'.repeat(21), cell('last')), 'length');
  assert.equal(lineProblem('a'.repeat(36), cell('last', 'en')), null);
  assert.equal(lineProblem('a'.repeat(37), cell('last', 'en')), 'length');
  assert.equal(lineProblem('   ', cell('last')), 'empty');
  assert.equal(lineProblem('좋소', cell('nope')), 'slot');
});

test('자리표시는 네 글자로 세어 길이를 잰다', () => {
  assert.equal(lineLength('{who}!'), 5);
  assert.equal(lineLength('가나다'), 3);
});

test('fillLine 은 자리표시를 채우고, 남으면 null', () => {
  assert.equal(fillLine('{who}께서 부르셨소!', { who: '목수 아저씨' }), '목수 아저씨께서 부르셨소!');
  assert.equal(fillLine('{who}께서 부르셨소!', {}), null);
  assert.equal(fillLine('더 없소?', {}), '더 없소?');
});
