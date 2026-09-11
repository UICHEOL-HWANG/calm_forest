import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 🍳 요리 코스 개편의 불변식을 잠근다.
//   레시피·미니게임·카페 손님은 세 군데(RECIPES / COOK_MG / CAFE_GUESTS)에 흩어져 있고
//   한쪽만 고쳐도 조용히 깨진다 — stages 에 없는 미니게임을 적으면 코스가 멈추고,
//   CAFE_PAY 에 빠뜨리면 서빙 단가가 조용히 30원으로 떨어진다. 눈에 안 보이는 실패라 테스트로 막는다.
//   game.js 는 브라우저 전역(THREE·document)에 의존해 import 할 수 없어 원문을 파싱한다.
const SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const EN_SRC = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

function block(startRe, endMark) {
  const i = SRC.search(startRe);
  assert.ok(i >= 0, `${startRe} 를 js/game.js 에서 못 찾음 — 상수 이름이 바뀌었나?`);
  const j = SRC.indexOf(endMark, i);
  assert.ok(j > i, `${startRe} 의 끝(${endMark})을 못 찾음`);
  return SRC.slice(i, j + endMark.length);
}

// ── RECIPES ──────────────────────────────────────────────
const recipesSrc = block(/^const RECIPES = \[/m, '\n];');
const RECIPES = [...recipesSrc.matchAll(/\{ id: '([a-z_]+)',[^\n]*?buff: '([a-z]+)',[^\n]*?stages: \[([^\]]+)\] \}/g)]
  .map(m => ({ id: m[1], buff: m[2], stages: m[3].split(',').map(s => s.trim().replace(/'/g, '')) }));

const mgKeys = [...block(/^const COOK_MG = \{/m, '\n};').matchAll(/^\s{2}([a-z]+):/gm)].map(m => m[1]);
const buffKeys = [...block(/^const BUFF_META = \{/m, '\n};').matchAll(/^\s{2}([a-z]+):/gm)].map(m => m[1]);
const paySrc = block(/^const CAFE_PAY = \{/m, '};');
const PAY = Object.fromEntries([...paySrc.matchAll(/([a-z_]+): (\d+)/g)].map(m => [m[1], +m[2]]));

test('레시피를 모두 파싱했다', () => {
  assert.equal(RECIPES.length, 9, `레시피 ${RECIPES.length}개만 파싱됨 — 줄 모양이 바뀌었나?`);
  assert.ok(mgKeys.length === 4 && mgKeys.includes('grill') && mgKeys.includes('season'));
});

test('모든 레시피의 코스는 실제로 있는 미니게임만 쓴다', () => {
  for (const r of RECIPES) {
    const bad = r.stages.filter(s => !mgKeys.includes(s));
    assert.deepEqual(bad, [], `${r.id} 의 알 수 없는 미니게임: ${bad.join(', ')}`);
  }
});

test('코스 길이(=★ 난이도)는 1~3 이고 COURSE_MULT·COURSE_WEIGHT 에 그만큼 값이 있다', () => {
  const mult = JSON.parse(block(/^const COURSE_MULT = \{/m, '};').match(/\{ (.+) \}/)[1]
    .replace(/(\d):/g, '"$1":').replace(/^/, '{').replace(/$/, '}'));
  const weight = JSON.parse(block(/^const COURSE_WEIGHT = \{/m, '};').match(/\{ (.+) \}/)[1]
    .replace(/(\d):/g, '"$1":').replace(/^/, '{').replace(/$/, '}'));
  for (const r of RECIPES) {
    const n = r.stages.length;
    assert.ok(n >= 1 && n <= 3, `${r.id} 코스 길이 ${n}`);
    assert.equal(mult[n].length, n, `★${n} 의 판정창 배율 개수가 코스 길이와 다름`);
    assert.equal(weight[n].length, n, `★${n} 의 점수 가중치 개수가 코스 길이와 다름`);
  }
  // 단계별로 난이도가 올라간다 = 배율이 뒤로 갈수록 작아진다
  for (const n of [2, 3]) {
    for (let i = 1; i < n; i++) assert.ok(mult[n][i] < mult[n][i - 1], `★${n} 의 ${i + 1}번째 판이 앞 판보다 안 좁다`);
    for (let i = 1; i < n; i++) assert.ok(weight[n][i] > weight[n][i - 1], `★${n} 의 뒤 단계 가중치가 더 무겁지 않다`);
  }
  // ★1 은 개편 전(1.0)보다 넉넉해야 한다 — "너무 어렵다" 피드백의 직접적인 답
  assert.ok(mult[1][0] > 1.0, `★1 판정창 배율 ${mult[1][0]} — 개편 전보다 넉넉해야 한다`);
});

test('모든 레시피에 카페 단가가 있고, ★ 가 높을수록 비싸다', () => {
  const missing = RECIPES.filter(r => !(r.id in PAY)).map(r => r.id);
  assert.deepEqual(missing, [], `CAFE_PAY 에 빠진 레시피: ${missing.join(', ')}`);
  const dead = Object.keys(PAY).filter(k => !RECIPES.some(r => r.id === k));
  assert.deepEqual(dead, [], `RECIPES 에 없는 죽은 단가: ${dead.join(', ')}`);
  const maxOf = (n) => Math.max(...RECIPES.filter(r => r.stages.length === n).map(r => PAY[r.id]));
  const minOf = (n) => Math.min(...RECIPES.filter(r => r.stages.length === n).map(r => PAY[r.id]));
  assert.ok(minOf(2) > maxOf(1), '★2 최저가가 ★1 최고가보다 높아야 한다');
  assert.ok(minOf(3) > maxOf(2), '★3 최저가가 ★2 최고가보다 높아야 한다');
});

test('모든 레시피의 버프는 BUFF_META 에 정의돼 있다', () => {
  const bad = RECIPES.filter(r => !buffKeys.includes(r.buff)).map(r => `${r.id}:${r.buff}`);
  assert.deepEqual(bad, [], `정의 없는 버프: ${bad.join(', ')}`);
});

test('네 미니게임이 모두 어딘가의 레시피에 쓰인다 — 만들어만 두고 안 쓰는 판이 없게', () => {
  const used = new Set(RECIPES.flatMap(r => r.stages));
  const unused = mgKeys.filter(k => !used.has(k));
  assert.deepEqual(unused, [], `아무 레시피도 쓰지 않는 미니게임: ${unused.join(', ')}`);
});

test('★1 요리가 네 미니게임을 하나씩 맡는다 — 처음 만나는 자리가 쉬운 판이도록', () => {
  const easy = new Set(RECIPES.filter(r => r.stages.length === 1).flatMap(r => r.stages));
  assert.deepEqual([...easy].sort(), [...mgKeys].sort());
});

// ── ☕ 카페 손님 캐스트 ────────────────────────────────────
const guestsSrc = block(/^const CAFE_GUESTS = \[/m, '\n];');
const GUESTS = [...guestsSrc.matchAll(/\{ id: '([a-z_]+)', +name: '([^']+)', +emoji: '([^']+)',[^\n]*?ear: '([a-z]+)', +acc: '([a-z]+)' \}/g)]
  .map(m => ({ id: m[1], name: m[2], emoji: m[3], ear: m[4], acc: m[5] }));
const npcSrc = block(/^const NPCS = \[/m, '\n];');
const NPC_EMOJI = [...npcSrc.matchAll(/^\s{4}id: '([a-z]+)', name: '([^']+)', emoji: '([^']+)'/gm)].map(m => m[3]);
const animalSrc = block(/^export const ANIMALS = \[/m, '\n];');
const ANIMAL_EMOJI = [...animalSrc.matchAll(/^\s{2}\{ id: '([a-z]+)', name: '([^']+)', emoji: '([^']+)'/gm)].map(m => m[3]);

test('손님 캐스트를 모두 파싱했다', () => {
  assert.equal(GUESTS.length, 8, `손님 ${GUESTS.length}명만 파싱됨`);
  assert.ok(NPC_EMOJI.length >= 6 && ANIMAL_EMOJI.length >= 6);
});

test('손님 수가 하루 주문 수보다 많다 — 같은 손님이 두 자리에 앉을 수 없게', () => {
  const orders = +SRC.match(/^const CAFE_ORDERS = (\d+);/m)[1];
  assert.ok(GUESTS.length > orders, `손님 ${GUESTS.length}명 ≤ 하루 주문 ${orders}건 — 풀이 마르면 중복이 난다`);
});

test('손님은 마을 주민과 겹치지 않는다 — 밖에 있는 사람이 카페에도 앉아 있던 문제', () => {
  const dup = GUESTS.filter(g => NPC_EMOJI.includes(g.emoji)).map(g => g.name);
  assert.deepEqual(dup, [], `마을 주민과 같은 동물인 손님: ${dup.join(', ')}`);
});

test('손님은 플레이어가 고르는 동물과도 겹치지 않는다', () => {
  const dup = GUESTS.filter(g => ANIMAL_EMOJI.includes(g.emoji)).map(g => g.name);
  assert.deepEqual(dup, [], `플레이어 캐릭터와 같은 동물인 손님: ${dup.join(', ')}`);
});

test('손님끼리도 id·이모지가 서로 다르다', () => {
  assert.equal(new Set(GUESTS.map(g => g.id)).size, GUESTS.length);
  assert.equal(new Set(GUESTS.map(g => g.emoji)).size, GUESTS.length);
});

test('손님의 귀·소품은 실제로 그려지는 종류만 쓴다 — 오타면 조용히 민둥머리가 된다', () => {
  const earSrc = block(/^function guestEarGeos\(ear\) \{/m, '\n}');
  const accSrc = block(/^function guestAccGeos\(acc, add\) \{/m, '\n}');
  const ears = new Set([...earSrc.matchAll(/ear === '([a-z]+)'/g)].map(m => m[1]).concat('tiny'));   // tiny = else 기본값
  const accs = new Set([...accSrc.matchAll(/acc === '([a-z]+)'/g)].map(m => m[1]).concat('flower')); // flower = else 기본값
  for (const g of GUESTS) {
    assert.ok(ears.has(g.ear), `${g.name} 의 알 수 없는 귀 모양: ${g.ear}`);
    assert.ok(accs.has(g.acc), `${g.name} 의 알 수 없는 소품: ${g.acc}`);
  }
});

// ── 🌐 영어판 ────────────────────────────────────────────
test('새 요리·손님 이름이 영어 사전에 있다 — 빠지면 영어판에 한국어가 섞인다', () => {
  const names = [...recipesSrc.matchAll(/name: '([^']+)'/g)].map(m => m[1])
    .concat(GUESTS.map(g => g.name));
  const missing = names.filter(n => !EN_SRC.includes(`'${n}':`));
  assert.deepEqual(missing, [], `영어 사전에 빠진 이름: ${missing.join(', ')}`);
});

test('미니게임 이름·안내 문구가 영어 사전에 있다', () => {
  const mgSrc = block(/^const COOK_MG = \{/m, '\n};');
  const texts = [...mgSrc.matchAll(/name: '([^']+)', +tip: '([^']+)'/g)].flatMap(m => [m[1], m[2]]);
  const missing = texts.filter(t => !EN_SRC.includes(`'${t}':`));
  assert.deepEqual(missing, [], `영어 사전에 빠진 문구: ${missing.join(', ')}`);
});
