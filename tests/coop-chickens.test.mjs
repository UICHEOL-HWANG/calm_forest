import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COOP_HUT, COOP_TROUGH, COOP_PEN, COOP_DOOR, CHICK_R, CHICK_SPAWN,
  doorScale, yardTarget, pushOutOfCoop, makeChickenState, stepChickens,
} from '../js/coop-chickens.js';

const inHut = (c) => c.x > COOP_HUT.x1 && c.x < COOP_HUT.x2 && c.z > COOP_HUT.z1 && c.z < COOP_HUT.z2;
const inTrough = (c) => c.x > COOP_TROUGH.x1 && c.x < COOP_TROUGH.x2 && c.z > COOP_TROUGH.z1 && c.z < COOP_TROUGH.z2;
// 재현 가능한 난수(테스트가 흔들리지 않게)
const seeded = (seed) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

test('yardTarget: 오두막·모이통 자국 밖만 뽑는다', () => {
  const rnd = seeded(7);
  for (let i = 0; i < 500; i++) {
    const t = yardTarget(rnd);
    assert.ok(!inHut(t), `오두막 안 목적지: ${JSON.stringify(t)}`);
    assert.ok(!inTrough(t), `모이통 안 목적지: ${JSON.stringify(t)}`);
    assert.ok(t.x >= COOP_PEN.x1 - 1e-9 && t.x <= COOP_PEN.x2 + 1e-9);
    assert.ok(t.z >= COOP_PEN.z1 - 1e-9 && t.z <= COOP_PEN.z2 + 1e-9);
  }
});

test('pushOutOfCoop: 오두막 안으로 파고들면 가장 얕은 쪽으로 나온다', () => {
  const p = pushOutOfCoop({ x: -0.7, z: 0.02 });   // 화면에서 실제로 벽에 박혀 있던 자리
  assert.ok(!inHut(p));
  assert.ok(Math.abs(p.z - (COOP_HUT.z2 + CHICK_R)) < 1e-9, `앞면으로 밀려나야 한다: ${p.z}`);
});

test('pushOutOfCoop: 모이통도 막는다 / 이미 밖이면 그대로', () => {
  assert.ok(!inTrough(pushOutOfCoop({ x: 0.7, z: -0.9 })));
  const free = pushOutOfCoop({ x: 0.9, z: 0.8 });
  assert.deepEqual(free, { x: 0.9, z: 0.8 });
});

test('pushOutOfCoop: 울타리 안에서 밀려나면 울타리 안에 남는다', () => {
  // 오두막 왼쪽 벽은 울타리보다 더 나와 있다 — 가장 얕은 면이 펜 밖이면 다른 면으로 나가야 한다
  for (let x = COOP_PEN.x1; x <= COOP_PEN.x2; x += 0.02) {
    for (let z = COOP_PEN.z1; z <= COOP_PEN.z2; z += 0.02) {
      const p = pushOutOfCoop({ x, z });
      assert.ok(p.x >= COOP_PEN.x1 - 1e-9 && p.x <= COOP_PEN.x2 + 1e-9, `펜 밖(x): ${JSON.stringify(p)}`);
      assert.ok(p.z >= COOP_PEN.z1 - 1e-9 && p.z <= COOP_PEN.z2 + 1e-9, `펜 밖(z): ${JSON.stringify(p)}`);
    }
  }
});

test('pushOutOfCoop: 두 자국이 겹치는 자리도 한 번에 빠져나온다(모서리에 끼지 않음)', () => {
  // 오두막·모이통 팽창 사각은 x 0.11~0.24 에서 겹친다 — 한 패스만 돌면 여기서 떤다
  for (let x = 0.05; x <= 0.30; x += 0.01) {
    for (let z = -1.1; z <= -0.6; z += 0.01) {
      const p = pushOutOfCoop({ x, z });
      assert.ok(!inHut(p) && !inTrough(p), `겹침 구간에서 안 빠져나옴: ${JSON.stringify(p)}`);
    }
  }
});

test('첫 배치 자리는 셋 다 오두막·모이통 밖', () => {
  for (const p of CHICK_SPAWN) { assert.ok(!inHut(p)); assert.ok(!inTrough(p)); }
});

test('doorScale: 문턱에선 거의 0, 마당에선 1 (벽을 스칠 만큼 크지 않다)', () => {
  assert.ok(doorScale(COOP_DOOR.z + 0.03) < 0.12);
  assert.equal(doorScale(COOP_DOOR.z + 0.7), 1);
  assert.equal(doorScale(COOP_DOOR.z - 5), 0.06);   // 안쪽은 하한
});

const SEEDS = [3, 7, 11, 23, 101];               // 시드 하나만 돌면 못 잡는 게 있어 여러 개

test('stepChickens: 오래 돌려도 보이는 닭은 오두막·모이통을 통과하지 않고 울타리 안에 있다', () => {
  for (const seed of SEEDS) {
    const rnd = seeded(seed);
    const list = [0, 1, 2].map(i => makeChickenState(i, rnd));
    for (let f = 0; f < 20000; f++) {              // 1/60초 × 20000 ≈ 5분 30초
      stepChickens(list, 1 / 60, rnd);
      for (const c of list) {
        if (!c.visible) continue;                  // 오두막 안(안 보임)은 예외
        if (c.st === 'in' || c.st === 'out') {     // 문턱은 지나가되 작아져 있어야 한다
          assert.ok(c.scale <= 1 && c.x === COOP_DOOR.x, '문턱은 문 한가운데로만');
          assert.ok(c.z <= COOP_DOOR.z + 0.72, '문 앞보다 멀리 나가지 않는다');
          continue;
        }
        assert.ok(!inHut(c), `seed=${seed} f=${f} 오두막 통과: ${JSON.stringify(c)}`);
        assert.ok(!inTrough(c), `seed=${seed} f=${f} 모이통 통과: ${JSON.stringify(c)}`);
        assert.ok(c.x >= COOP_PEN.x1 - 1e-9 && c.x <= COOP_PEN.x2 + 1e-9, `seed=${seed} 울타리 밖(x): ${c.x}`);
        assert.ok(c.z >= COOP_PEN.z1 - 1e-9 && c.z <= COOP_PEN.z2 + 1e-9, `seed=${seed} 울타리 밖(z): ${c.z}`);
      }
    }
  }
});

test('stepChickens: 들어갔다 나오는 한 바퀴가 실제로 돈다', () => {
  for (const seed of SEEDS) {
    const rnd = seeded(seed);
    const list = [0, 1, 2].map(i => makeChickenState(i, rnd));
    const seen = new Set();
    for (let f = 0; f < 20000; f++) {
      stepChickens(list, 1 / 60, rnd);
      for (const c of list) seen.add(c.st);
    }
    for (const st of ['yard', 'door', 'in', 'rest', 'out']) assert.ok(seen.has(st), `seed=${seed} ${st} 상태를 못 거쳤다`);
  }
});

test('stepChickens: 마당이 한꺼번에 비지 않는다(들어가는 건 한 번에 한 마리)', () => {
  for (const seed of SEEDS) {
    const rnd = seeded(seed);
    const list = [0, 1, 2].map(i => makeChickenState(i, rnd));
    for (let f = 0; f < 20000; f++) {
      stepChickens(list, 1 / 60, rnd);
      const away = list.filter(c => c.st !== 'yard').length;
      assert.ok(away <= 1, `seed=${seed} f=${f} 닭 ${away}마리가 동시에 자리를 비웠다`);
    }
  }
});

test('stepChickens: 세 마리 다 이따금 들어간다(한 마리가 계속 밀리지 않는다)', () => {
  for (const seed of SEEDS) {
    const rnd = seeded(seed);
    const list = [0, 1, 2].map(i => makeChickenState(i, rnd));
    const trips = [0, 0, 0];
    for (let f = 0; f < 36000; f++) {              // 10분
      const before = list.map(c => c.st);
      stepChickens(list, 1 / 60, rnd);
      list.forEach((c, i) => { if (before[i] === 'in' && c.st === 'rest') trips[i]++; });
    }
    for (let i = 0; i < 3; i++) assert.ok(trips[i] >= 2, `seed=${seed} ${i}번 닭이 10분 동안 ${trips[i]}번만 들어갔다`);
  }
});
