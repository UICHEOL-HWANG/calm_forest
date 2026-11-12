import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LETTERS, letterOf } from '../js/data/npc-letters.js';
import { AFFINITY_NPCS, STAGES } from '../js/affinity/stages.js';
import { blueprintOfNpc } from '../js/tool-blueprints.js';

const VALUE = { seed: 3, crop: 5, wood: 2.4, coins: 1, bait: 5, fish: 8, flour: 18, honey: 12, forage: 7, bug: 14, egg: 6, stone: 3.75, coal: 7, gem: 40 };
const worth = (gift) => Object.entries(gift).reduce((s, [k, v]) => s + VALUE[k] * v, 0);
const texts = () => AFFINITY_NPCS.flatMap(npc => Object.values(LETTERS[npc]).flatMap(l => [l.body, l.alt].filter(Boolean)));

test('주민 11명 모두 이웃·친구 편지가 있다', () => {
  assert.deepEqual(Object.keys(LETTERS).sort(), [...AFFINITY_NPCS].sort());
  for (const npc of AFFINITY_NPCS) {
    assert.ok(LETTERS[npc].nbr?.body, `${npc} 이웃 편지`);
    assert.ok(LETTERS[npc].friend?.body, `${npc} 친구 편지`);
  }
});

test('이웃 꾸러미는 아는 재료만, 35~50코인 상당', () => {
  for (const npc of AFFINITY_NPCS) {
    const gift = LETTERS[npc].nbr.gift;
    for (const k of Object.keys(gift)) assert.ok(k in VALUE, `${npc}: 모르는 재료 ${k}`);
    const w = worth(gift);
    assert.ok(w >= 35 && w <= 50, `${npc}: ${w}`);
  }
});

test('도면 주민의 친구 편지는 선물 없이 도면을 열고, 받은 사람 갈래가 있다', () => {
  for (const npc of AFFINITY_NPCS) {
    const f = LETTERS[npc].friend;
    if (blueprintOfNpc(npc)) {
      assert.equal(f.gift, undefined, `${npc}: 도면이 보상이다`);
      assert.ok(f.alt, `${npc}: 도면을 이미 받은 사람 갈래`);
    } else {
      assert.equal(f.gift?.gem, 1, `${npc}: 도면 대신 보석`);
      assert.equal(f.alt, undefined);
    }
  }
});

test('문구 금지어: 엠대시, 놀다', () => {
  for (const s of texts()) {
    assert.ok(!s.includes('—'), s);
    assert.ok(!/놀[아았이자다]/.test(s), s);
  }
});

test('letterOf 는 단계 인덱스로 편지를 찾고, 도면 받은 사람에겐 갈래를 준다', () => {
  const nbr = STAGES.findIndex(s => s.id === 'nbr');
  const friend = STAGES.findIndex(s => s.id === 'friend');
  assert.equal(letterOf('builder', nbr).body, LETTERS.builder.nbr.body);
  assert.deepEqual(letterOf('builder', nbr).gift, LETTERS.builder.nbr.gift);
  assert.equal(letterOf('builder', friend, { hasBlueprint: true }).body, LETTERS.builder.friend.alt);
  assert.equal(letterOf('builder', friend).body, LETTERS.builder.friend.body);
  assert.equal(letterOf('chef', friend, { hasBlueprint: true }).body, LETTERS.chef.friend.body);
  assert.equal(letterOf('builder', nbr, { lang: 'en' }).body, LETTERS.builder.nbr.bodyEn);
  assert.equal(letterOf('builder', friend, { hasBlueprint: true, lang: 'en' }).body, LETTERS.builder.friend.altEn);
  assert.equal(letterOf('builder', 0), null);
  assert.equal(letterOf('guest_deer', nbr), null);
});
