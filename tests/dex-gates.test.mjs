import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEX_GATES, gateOf, gateOpen, weatherOpen, rollKind } from '../js/dex-gates.js';

const sit = (weather, night = false) => ({ weather, night });

test('게이트 표 — 스펙 확정값 4종이 정확히 일치한다', () => {
  assert.deepEqual(Object.keys(DEX_GATES).sort(), ['bug', 'fish', 'forage', 'ore']);
  assert.deepEqual(DEX_GATES.fish.rare,     { weather: ['rain'], p: 0.22 });
  assert.deepEqual(DEX_GATES.ore.gem,       { weather: ['fog'], p: 0.28 });
  assert.deepEqual(DEX_GATES.bug.rainbow,   { weather: ['rain', 'fog'], night: true, p: 0.18 });
  assert.deepEqual(DEX_GATES.forage.herb,   { night: true, p: 0.30 });
});

test('게이트가 걸린 종은 희귀종뿐이다 — 흔한 종은 튜토리얼 역할이라 건드리지 않는다', () => {
  const gated = Object.values(DEX_GATES).flatMap(m => Object.keys(m));
  for (const bad of ['common', 'uncommon', 'mushroom', 'berry', 'acorn', 'stone', 'coal', 'yellow', 'blue']) {
    assert.ok(!gated.includes(bad), `${bad} 는 흔한 종이다 — 게이트를 걸면 안 된다`);
  }
});

test('gateOf: 없으면 null', () => {
  assert.deepEqual(gateOf('fish', 'rare'), DEX_GATES.fish.rare);
  assert.equal(gateOf('fish', 'common'), null);
  assert.equal(gateOf('crop', 'carrot'), null);
});

test('gateOpen: 게이트가 없으면 항상 열린다 — 게이트 없는 종이 막히면 대형 사고다', () => {
  assert.equal(gateOpen(null, sit('clear')), true);
  assert.equal(gateOpen(undefined, sit('clear')), true);
});

test('gateOpen: 날씨 게이트', () => {
  const g = gateOf('fish', 'rare');                  // ['rain']
  assert.equal(gateOpen(g, sit('rain')), true);
  assert.equal(gateOpen(g, sit('clear')), false);
  assert.equal(gateOpen(g, sit('fog')), false);
});

test('gateOpen: 날씨가 배열이면 하나만 맞아도 열린다', () => {
  const g = gateOf('bug', 'rainbow');                // ['rain','fog'] + night
  assert.equal(gateOpen(g, sit('rain', true)), true);
  assert.equal(gateOpen(g, sit('fog', true)), true);
  assert.equal(gateOpen(g, sit('snow', true)), false);
});

test('gateOpen: night 게이트는 낮에 닫힌다', () => {
  assert.equal(gateOpen(gateOf('bug', 'rainbow'), sit('rain', false)), false, '비 오는 낮엔 안 된다');
  assert.equal(gateOpen(gateOf('forage', 'herb'), sit('clear', true)), true, '약초는 날씨를 안 본다');
  assert.equal(gateOpen(gateOf('forage', 'herb'), sit('clear', false)), false);
});

test('weatherOpen: 날씨만 본다 — 큐레이터 의뢰용(하루치 시드라 밤낮을 못 본다)', () => {
  assert.equal(weatherOpen(gateOf('bug', 'rainbow'), 'rain'), true, '밤 조건을 무시한다');
  assert.equal(weatherOpen(gateOf('bug', 'rainbow'), 'clear'), false);
  assert.equal(weatherOpen(gateOf('forage', 'herb'), 'clear'), true, '약초는 날씨 조건이 없다');
  assert.equal(weatherOpen(null, 'clear'), true);
});

// ── rollKind ──────────────────────────────────────────────
const FISH = [{ rarity: 'rare', p: 0.07 }, { rarity: 'uncommon', p: 0.28 }, { rarity: 'common', p: 1.00 }];

test('rollKind: 게이트가 닫힌 날엔 그 종이 절대 안 나온다', () => {
  for (let i = 0; i < 200; i++) {
    const k = rollKind(FISH, 'fish', sit('clear'), () => i / 200);
    assert.notEqual(k.rarity, 'rare', '맑은 날에 무지개 물고기가 나왔다');
  }
});

test('rollKind: 게이트가 열린 날엔 표의 p 만큼 나온다', () => {
  let rare = 0; const N = 2000;
  for (let i = 0; i < N; i++) {
    if (rollKind(FISH, 'fish', sit('rain'), () => i / N).rarity === 'rare') rare++;
  }
  const ratio = rare / N;
  assert.ok(Math.abs(ratio - 0.22) < 0.01, `비 오는 날 rare 비중이 ${ratio.toFixed(3)} — 0.22 여야 한다`);
});

test('rollKind: 닫힌 날엔 남은 종으로 정규화된다 — 합이 1 이라 항상 뭔가 나온다', () => {
  const seen = {};
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const k = rollKind(FISH, 'fish', sit('clear'), () => i / N);
    assert.ok(k, '아무것도 안 나왔다 — 정규화가 틀렸다');
    seen[k.rarity] = (seen[k.rarity] || 0) + 1;
  }
  assert.equal(seen.rare, undefined);
  // 원래 개별 가중치 uncommon .21 · common .72 → 정규화하면 .2258 / .7742
  assert.ok(Math.abs(seen.uncommon / N - 0.2258) < 0.01, `uncommon ${(seen.uncommon / N).toFixed(3)}`);
  assert.ok(Math.abs(seen.common / N - 0.7742) < 0.01, `common ${(seen.common / N).toFixed(3)}`);
});

test('rollKind: 열린 날엔 나머지가 (1 - p) 안에서 원래 비율을 지킨다', () => {
  const seen = {}; const N = 3000;
  for (let i = 0; i < N; i++) {
    const k = rollKind(FISH, 'fish', sit('rain'), () => i / N);
    seen[k.rarity] = (seen[k.rarity] || 0) + 1;
  }
  // rare .22, 나머지 .78 을 uncommon .21 : common .72 비율로 → .1766 / .6034
  assert.ok(Math.abs(seen.uncommon / N - 0.1766) < 0.012, `uncommon ${(seen.uncommon / N).toFixed(3)}`);
  assert.ok(Math.abs(seen.common / N - 0.6034) < 0.012, `common ${(seen.common / N).toFixed(3)}`);
});

test('rollKind: 게이트가 하나도 없는 카테고리는 원래 분포 그대로', () => {
  const KINDS = [{ id: 'a', p: 0.3 }, { id: 'b', p: 1.00 }];
  let a = 0; const N = 1000;
  for (let i = 0; i < N; i++) if (rollKind(KINDS, 'crop', sit('clear'), () => i / N).id === 'a') a++;
  assert.ok(Math.abs(a / N - 0.3) < 0.01, `a ${(a / N).toFixed(3)} — 원래 0.3 이어야 한다`);
});

test('rollKind: id 든 rarity 든 읽는다 — fish 만 rarity 를 쓴다', () => {
  const BUGS = [{ id: 'rainbow', p: 0.06 }, { id: 'green', p: 0.28 }, { id: 'yellow', p: 1.00 }];
  for (let i = 0; i < 200; i++) {
    assert.notEqual(rollKind(BUGS, 'bug', sit('clear', true), () => i / 200).id, 'rainbow',
      '맑은 밤엔 무지개반디가 안 나와야 한다');
  }
});

test('rollKind: 목록이 한 종뿐이고 그게 닫혀 있어도 터지지 않는다', () => {
  const ONE = [{ id: 'rare', p: 1.00 }];
  const k = rollKind(ONE, 'fish', sit('clear'), () => 0.5);
  assert.ok(k, '폴백이 없으면 undefined 를 반환해 호출부가 터진다');
});

// ⚠️ 회귀 잠금 — 이 기능의 가장 큰 위험
test('게이트는 도감 종을 늘리거나 줄이지 않는다 — DEX_TOTAL 불변', () => {
  const known = {
    fish:   ['common', 'uncommon', 'rare'],
    ore:    ['stone', 'coal', 'gem'],
    bug:    ['rainbow', 'green', 'blue', 'yellow'],
    forage: ['herb', 'acorn', 'berry', 'mushroom'],
  };
  for (const [cat, m] of Object.entries(DEX_GATES)) {
    for (const id of Object.keys(m)) {
      assert.ok(known[cat]?.includes(id), `${cat}.${id} 는 존재하지 않는 종이다`);
    }
  }
});

test('게이트 확률은 원래 확률보다 커야 한다 — 기다린 대가가 있어야 벌칙이 아니다', () => {
  const before = { 'fish.rare': 0.07, 'ore.gem': 0.10, 'bug.rainbow': 0.06, 'forage.herb': 0.12 };
  for (const [key, was] of Object.entries(before)) {
    const [cat, id] = key.split('.');
    assert.ok(DEX_GATES[cat][id].p > was,
      `${key}: 게이트 안 확률 ${DEX_GATES[cat][id].p} 가 원래 ${was} 보다 크지 않다 — 그냥 어려워진 것뿐이다`);
  }
});
