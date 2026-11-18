import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultNickname, defaultNickname } from '../js/nickname-default.js';
import { checkNickname } from '../js/nickname-filter.js';
import { readFileSync } from 'node:fs';

const DEX = readFileSync(new URL('../js/data/dex.js', import.meta.url), 'utf8');
const NICK_ADJS = JSON.parse(DEX.match(/export const NICK_ADJS = (\[[^\]]+\]);/)[1].replace(/'/g, '"'));

const KO = ['여우', '강아지', '토끼', '고양이', '곰', '판다', '병아리'];
const EN = ['Fox', 'Puppy', 'Rabbit', 'Cat', 'Bear', 'Panda', 'Chick'];
const fixed = (v) => () => v;

test('한국어는 형용사+동물+두 자리 수이고 띄어쓰기가 없다', () => {
  assert.equal(buildDefaultNickname({ adjs: ['호기심 많은'], animal: '곰', lang: 'ko', rand: fixed(0) }), '호기심많은곰10');
  assert.equal(buildDefaultNickname({ adjs: ['포근한'], animal: '곰', lang: 'ko', rand: fixed(0.999) }), '포근한곰99');
});

test('영어는 동물+세 자리 수', () => {
  assert.equal(buildDefaultNickname({ adjs: NICK_ADJS, animal: 'Fox', lang: 'en', rand: fixed(0) }), 'Fox100');
  assert.equal(buildDefaultNickname({ adjs: NICK_ADJS, animal: 'Fox', lang: 'en', rand: fixed(0.999) }), 'Fox999');
});

test('한국어 전 조합이 이름 규칙을 통과한다', () => {
  for (const adj of NICK_ADJS) for (const animal of KO) for (const r of [0, 0.5, 0.999]) {
    const nick = buildDefaultNickname({ adjs: [adj], animal, lang: 'ko', rand: fixed(r) });
    assert.equal(checkNickname(nick).ok, true, nick);
    assert.ok([...nick].length <= 10, nick);
  }
});

test('영어 전 조합이 이름 규칙을 통과한다', () => {
  for (const animal of EN) for (const r of [0, 0.5, 0.999]) {
    const nick = buildDefaultNickname({ adjs: NICK_ADJS, animal, lang: 'en', rand: fixed(r) });
    assert.equal(checkNickname(nick).ok, true, nick);
  }
});

test('규칙에 걸리는 재료가 와도 통과하는 이름을 돌려준다', () => {
  const ko = defaultNickname({ adjs: ['아주아주아주긴형용사'], animal: '코끼리', lang: 'ko', rand: fixed(0.3) });
  assert.equal(checkNickname(ko).ok, true, ko);
  const en = defaultNickname({ adjs: [], animal: 'Hippopotamus', lang: 'en', rand: fixed(0.3) });
  assert.equal(checkNickname(en).ok, true, en);
});
