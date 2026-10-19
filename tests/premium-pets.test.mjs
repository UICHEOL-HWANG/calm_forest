import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PET_KINDS, petKindOf, abilityOf, choresPerMin, pickPetTask, afterWork, burstTargets, petFishBonus, petGift, emptyPet, FISH_BONUS, PREMIUM_PET_WON, REST_SEC, CHAIN_MAX } from '../js/pet/rules.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const PREMIUM = ['cloud_dragon', 'hedgehog', 'axolotl', 'unicorn'];
const plot = (i, o) => ({ i, x: i, z: 0, state: 'growing', wet: false, weed: false, pest: false, wiltAt: 100 + i, ...o });

test('유료 펫 4종: 현금 전용 ₩6,900, 코인 펫은 그대로', () => {
  assert.equal(PREMIUM_PET_WON, 6900);
  for (const id of PREMIUM) { const k = petKindOf(id); assert.equal(k.premium, true); assert.equal(k.won, 6900); assert.ok(id in PRICE_IDS); }
  for (const id of ['leaf', 'spirit', 'bird', 'golem']) { const k = petKindOf(id); assert.equal(k.premium, false); assert.deepEqual(abilityOf(id), { tasks: ['water', 'weed', 'pest'], chain: CHAIN_MAX, rest: REST_SEC, burst: false, fishBonus: false, gift: false }); }
});

test('밸런스: 분당 작업량은 코인 펫(9.2칸)의 ±10% 안 또는 그 아래, 보너스가 있으면 작업량을 줄인다', () => {
  const base = choresPerMin('leaf');
  assert.ok(Math.abs(base - 9.23) < 0.05);
  for (const id of PREMIUM) {
    const r = choresPerMin(id), a = abilityOf(id);
    assert.ok(r <= base * 1.1, `${id} ${r}`);
    if (a.fishBonus || a.gift) assert.ok(r < base, `${id} 보너스가 있는데 작업량이 같다`);
  }
});

test('특기별 할 일: 구름용은 물만, 고슴도치는 잡초·해충만', () => {
  const plots = [plot(0, { weed: true }), plot(1), plot(2, { pest: true })];
  assert.equal(pickPetTask(plots, { x: 0, z: 0 }, 5, abilityOf('cloud_dragon').tasks).type, 'water');
  assert.equal(pickPetTask([plot(0, { weed: true })], { x: 0, z: 0 }, 5, abilityOf('cloud_dragon').tasks), null);
  assert.equal(pickPetTask(plots, { x: 0, z: 0 }, 5, abilityOf('hedgehog').tasks).type, 'weed');
  assert.equal(pickPetTask([plot(1)], { x: 0, z: 0 }, 5, abilityOf('hedgehog').tasks), null);
});

test('소나기: 반경 안 목마른 칸을 시드는 순서로 최대 n칸, 잡초 칸은 뺀다', () => {
  const plots = [plot(0, { wiltAt: 9 }), plot(1, { wiltAt: 3 }), plot(2, { weed: true }), plot(3, { wet: true }), plot(9)];
  assert.deepEqual(burstTargets(plots, { x: 0, z: 0 }, 4, 5), [1, 0]);
  assert.deepEqual(burstTargets(plots, { x: 0, z: 0 }, 4, 1), [1]);
});

test('쉬는 시간과 칸 수 상한은 종마다', () => {
  const now = 1000;
  assert.equal(afterWork(emptyPet('cloud_dragon'), 9, now).works, 5);
  assert.equal(afterWork(emptyPet('cloud_dragon'), 5, now).restUntil, now + 30000);
  assert.equal(afterWork(emptyPet('hedgehog'), 9, now).works, 6);
  assert.equal(afterWork(emptyPet('leaf'), 9, now).restUntil, now + 20000);
});

test('물가 행운: 10% · 하루 4마리까지 · 우파루파만', () => {
  let pet = emptyPet('axolotl'), got = 0;
  for (let i = 0; i < 20; i++) { const r = petFishBonus(pet, '2026-10-20', 0.05); got += r.bonus; pet = r.pet; }
  assert.equal(got, FISH_BONUS.cap);
  assert.equal(petFishBonus(pet, '2026-10-21', 0.05).bonus, 1);
  assert.equal(petFishBonus(pet, '2026-10-21', 0.5).bonus, 0);
  assert.equal(petFishBonus(emptyPet('leaf'), '2026-10-20', 0).bonus, 0);
});

test('꽃길 선물: 하루 한 번 1~3개 · 유니콘만', () => {
  const a = petGift(emptyPet('unicorn'), '2026-10-20', 0.99);
  assert.equal(a.n, 3);
  assert.equal(petGift(a.pet, '2026-10-20', 0).n, 0);
  assert.equal(petGift(a.pet, '2026-10-21', 0).n, 1);
  assert.equal(petGift(emptyPet('golem'), '2026-10-20', 0).n, 0);
});

test('배선: 조형·작업 루프·낚시·선물·세이브·상점·서버 가드', () => {
  const art = read('js/pet/art-premium.js');
  for (const id of PREMIUM) assert.match(art, new RegExp(`\\b${id}\\b`));
  assert.match(read('js/pet/art.js'), /if \(!fn\) return buildPremiumPet\(THREE, kind, stage\)/);
  const farm = read('js/spaces/farm-auto.js');
  assert.match(farm, /abilityOf\(/); assert.match(farm, /burstTargets\(/); assert.match(farm, /petGift\(/);
  assert.match(read('js/spaces/fishing.js'), /petFishBonus\(/);
  const game = read('js/game.js');
  for (const f of ['bonusDay', 'bonusN', 'giftDay']) assert.match(game, new RegExp(f));
  assert.match(read('js/spaces/cafe.js'), /k\.premium/);
  const sql = read('sql/migrations/migrate_premium_pets.sql');
  for (const id of PREMIUM) assert.match(sql, new RegExp(`'${id}'`));
  assert.match(sql, /trg_game_saves_guard_pets/);
  assert.match(sql, /e\.value->>'kind' = u\.item/, '키를 바꿔 넣은 펫도 잡는다');
});
