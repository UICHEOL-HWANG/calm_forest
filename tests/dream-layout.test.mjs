import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ISLANDS, BRIDGES, SHARD_SPOTS, SHARDS_PER_DAY, CLOUD_BED, LANDING, COTTAGE,
  OBSTACLES, PARK, CRYSTAL_TREES, MUSHROOM_LAMPS,
  isWalkable, clampWalkable, pickShards, normalizeDream, shardsLeft, islandOf,
} from '../js/dream/layout.js';

test('섬 4개 · 다리 3개 · 조각 후보 14곳 — 스펙 표와 같다', () => {
  assert.deepEqual(ISLANDS.map(i => i.id), ['main', 'pink', 'sky', 'star']);
  assert.equal(BRIDGES.length, 3);
  assert.equal(SHARD_SPOTS.length, 14);
  assert.equal(SHARDS_PER_DAY, 7);
  assert.equal(new Set(SHARD_SPOTS.map(s => s.id)).size, 14, '조각 id 는 겹치면 안 된다');
});

test('조각 후보·구름 침대·도착 지점은 전부 걸을 수 있는 자리다', () => {
  for (const s of SHARD_SPOTS) assert.ok(isWalkable(s.x, s.z), `${s.id} 가 허공에 있다`);
  assert.ok(isWalkable(CLOUD_BED.x, CLOUD_BED.z + 1.6), '구름 침대 앞에 설 자리가 있어야 한다');
  assert.ok(isWalkable(LANDING.x, LANDING.z));
});

test('달 탑집 — 안은 못 걷고 밀려난 자리는 걸을 수 있다', () => {
  assert.equal(isWalkable(COTTAGE.x, COTTAGE.z), false);
  assert.equal(isWalkable(COTTAGE.x + COTTAGE.r - 0.05, COTTAGE.z), false);
  assert.ok(isWalkable(COTTAGE.x + COTTAGE.r + 0.05, COTTAGE.z));
  for (const [dx, dz] of [[0, 0], [0.5, 0.2], [-1.2, 0.4], [0, -1.5], [1.9, 0], [-0.3, -1.9]]) {
    const out = clampWalkable(COTTAGE.x + dx, COTTAGE.z + dz);
    assert.ok(isWalkable(out.x, out.z), `(${dx},${dz}) 에서 밀려난 자리가 걸을 수 없다`);
    assert.ok(Math.hypot(out.x - COTTAGE.x, out.z - COTTAGE.z) >= COTTAGE.r - 1e-3);
  }
});

test('달 탑집 — 북쪽 가장자리에서도 반대편으로 순간이동하지 않고 항상 걸을 수 있는 자리를 돌려준다', () => {
  const rim = clampWalkable(1.5, -6.1);
  assert.ok(isWalkable(rim.x, rim.z));
  assert.ok(Math.hypot(rim.x - 1.5, rim.z + 6.1) < 0.6, '탑 너머로 건너뛰었다');
  const north = clampWalkable(0, -9);
  assert.ok(isWalkable(north.x, north.z), '북쪽 허공에서 탑 안으로 밀렸다');
  for (let x = -30; x <= 30; x += 0.7) {
    for (let z = -30; z <= 30; z += 0.7) {
      const out = clampWalkable(x, z);
      assert.ok(isWalkable(out.x, out.z), `(${x.toFixed(1)},${z.toFixed(1)}) → (${out.x.toFixed(2)},${out.z.toFixed(2)}) 걸을 수 없다`);
      const again = clampWalkable(out.x, out.z);
      assert.ok(Math.hypot(again.x - out.x, again.z - out.z) < 1e-9, '한 번 밀린 자리는 그대로여야 한다');
    }
  }
});

test('소품 충돌 — 정박 마차·구름 침대·수정 나무·버섯 등은 통과할 수 없다', () => {
  assert.ok(OBSTACLES.length >= 10);
  assert.equal(new Set(OBSTACLES.map(o => o.id)).size, OBSTACLES.length, '소품 id 가 겹친다');
  assert.equal(isWalkable(PARK.x + 1, PARK.z), false, '마차 몸통');
  assert.equal(isWalkable(PARK.x + 2.6, PARK.z), false, '마차 앞 양');
  assert.equal(isWalkable(PARK.x, PARK.z - 1.6), true, '마차 옆 길은 열려 있다');
  assert.equal(isWalkable(CLOUD_BED.x, CLOUD_BED.z), false, '구름 침대 위');
  for (const [x, z] of CRYSTAL_TREES) assert.equal(isWalkable(x, z), false, `수정 나무 (${x},${z})`);
  for (const [x, z] of MUSHROOM_LAMPS) assert.equal(isWalkable(x, z), false, `버섯 등 (${x},${z})`);
  for (const o of OBSTACLES) {
    const out = clampWalkable((o.ax + o.bx) / 2, (o.az + o.bz) / 2);
    assert.ok(isWalkable(out.x, out.z), `${o.id} 안에서 밀려난 자리가 걸을 수 없다`);
  }
});

test('소품 충돌 — 침대 깨어나기 사거리 안에는 설 수 있다', () => {
  for (const [dx, dz] of [[0, 1.6], [0, -1.6], [1.5, 0], [-1.5, 0]]) {
    const x = CLOUD_BED.x + dx, z = CLOUD_BED.z + dz;
    const out = clampWalkable(x, z);
    assert.ok(Math.hypot(out.x - CLOUD_BED.x, out.z - CLOUD_BED.z) < 2.4, `(${dx},${dz}) 에서 침대 사거리를 벗어난다`);
  }
});

test('달 탑집 — 다리 길과 섬 가장자리를 막지 않는다', () => {
  for (const b of BRIDGES) {
    for (let t = 0.1; t < 0.95; t += 0.05) {
      const x = b.ax + (b.bx - b.ax) * t, z = b.az + (b.bz - b.az) * t;
      assert.ok(isWalkable(x, z), `다리 ${b.to} ${t.toFixed(2)} 지점이 막혔다`);
    }
  }
  assert.ok(Math.hypot(COTTAGE.x, COTTAGE.z) + COTTAGE.r < ISLANDS[0].r, '탑집이 섬 밖으로 걸친다');
});

test('islandOf — 후보 자리의 섬을 돌려준다(다리 위는 bridge)', () => {
  for (const s of SHARD_SPOTS) assert.equal(islandOf(s.id), s.island);
  assert.equal(islandOf('nope'), null);
  assert.ok(SHARD_SPOTS.some(s => s.island === 'bridge'));
});

test('pickShards — 같은 날은 같은 7곳, 날이 바뀌면 배치가 바뀐다', () => {
  const a = pickShards('2026-10-08'), b = pickShards('2026-10-08');
  assert.deepEqual(a, b);
  assert.equal(a.length, 7);
  assert.equal(new Set(a).size, 7);
  const days = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'];
  assert.ok(days.some(d => pickShards(d).join() !== a.join()), '5일 내내 같은 배치면 시드가 안 먹은 것');
});

test('pickShards — main 은 정확히 2개, 나머지 섬은 최소 1개(90일 전수)', () => {
  for (let i = 0; i < 90; i++) {
    const d = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
    const ids = pickShards(d);
    const by = (isl) => ids.filter(id => islandOf(id) === isl).length;
    assert.equal(by('main'), 2, `${d} main`);
    for (const isl of ['pink', 'sky', 'star']) assert.ok(by(isl) >= 1, `${d} ${isl} 가 비었다`);
  }
});

test('clampWalkable — 섬 안은 그대로, 허공은 가장 가까운 가장자리로 되민다', () => {
  assert.deepEqual(clampWalkable(1, 1), { x: 1, z: 1 });
  const out = clampWalkable(0, 12);                       // main 남쪽 바깥 허공
  assert.ok(isWalkable(out.x, out.z));
  assert.ok(out.z > 5 && out.z < 7, `가장자리 근처여야 한다: ${out.z}`);
  const far = clampWalkable(-30, 30);
  assert.ok(isWalkable(far.x, far.z));
});

test('clampWalkable — 다리 위로는 지나갈 수 있고 다리 옆 허공은 막힌다', () => {
  const br = BRIDGES.find(b => b.to === 'pink');
  const mx = (br.ax + br.bx) / 2, mz = (br.az + br.bz) / 2;
  assert.ok(isWalkable(mx, mz), '다리 한가운데');
  const side = clampWalkable(mx + 3, mz - 3);
  assert.ok(isWalkable(side.x, side.z));
  assert.ok(Math.hypot(side.x - (mx + 3), side.z - (mz - 3)) > 0.5, '허공에서 밀려나야 한다');
});

test('normalizeDream — 쓰레기 입력은 기본값, 날이 바뀌면 got 을 비운다', () => {
  const today = '2026-10-08';
  assert.deepEqual(normalizeDream(null, today), { visits: 0, day: today, got: [], total: 0 });
  assert.deepEqual(normalizeDream({ visits: -3, got: 'x', total: 'a' }, today), { visits: 0, day: today, got: [], total: 0 });
  const id = pickShards(today)[0];
  const kept = normalizeDream({ visits: 2.7, day: today, got: [id, id, 'evil', 7], total: 5 }, today);
  assert.deepEqual(kept, { visits: 2, day: today, got: [id], total: 5 });
  const reset = normalizeDream({ visits: 4, day: '2026-10-07', got: [id], total: 9 }, today);
  assert.deepEqual(reset, { visits: 4, day: today, got: [], total: 9 });
});

test('normalizeDream — 오늘 고른 자리가 아닌 id 는 got 에서 버린다', () => {
  const today = '2026-10-08';
  const notToday = SHARD_SPOTS.map(s => s.id).find(id => !pickShards(today).includes(id));
  assert.deepEqual(normalizeDream({ day: today, got: [notToday] }, today).got, []);
});

test('shardsLeft — 오늘 고른 자리 중 아직 안 주운 것', () => {
  const today = '2026-10-08';
  const ids = pickShards(today);
  assert.deepEqual(shardsLeft({ day: today, got: [] }, today), ids);
  assert.deepEqual(shardsLeft({ day: today, got: ids.slice(0, 3) }, today), ids.slice(3));
  assert.deepEqual(shardsLeft({ day: '2026-10-07', got: ids }, today), ids, '어제 기록은 오늘에 영향 없음');
});

test('pickShards — 같은 날은 같은 배열을 돌려주고(메모), 얼려 있어 호출부가 고칠 수 없다', () => {
  const a = pickShards('2026-11-01');
  assert.equal(pickShards('2026-11-01'), a);
  assert.ok(Object.isFrozen(a));
  assert.notEqual(pickShards('2026-11-02'), a);
});
