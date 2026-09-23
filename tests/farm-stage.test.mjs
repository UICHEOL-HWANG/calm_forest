import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FARM_STAGES, MAX_FARM_STAGE, farmHalfOf, farmStageInfo, fencePosts, perimeterTrees, YARD_D, YARD_HZ, surveyYard, surveyOfficePos, surveyDeskPos, surveyBenchPos, clampFarmPos, GATE_HZ } from '../js/farm-stage.js';

test('FARM_STAGES: 스펙 §1 표 그대로 — half 6/9/11 · 비용 · 노동자 상한', () => {
  assert.equal(FARM_STAGES.length, 3); assert.equal(MAX_FARM_STAGE, 3);
  assert.deepEqual(FARM_STAGES.map(s => s.stage), [1, 2, 3]);
  assert.deepEqual(FARM_STAGES.map(s => s.half), [6, 9, 11]);
  assert.deepEqual(FARM_STAGES.map(s => s.workers), [2, 4, 6]);
  assert.equal(FARM_STAGES[0].cost, null, '1단계는 처음부터 있다');
  assert.deepEqual(FARM_STAGES[1].cost, { wood: 40, stone: 20, coins: 150 });
  assert.deepEqual(FARM_STAGES[2].cost, { wood: 90, stone: 60, coins: 450 });
});

test('farmHalfOf: 단계 → 반경, 이상값은 1단계(6)', () => {
  assert.equal(farmHalfOf(1), 6); assert.equal(farmHalfOf(2), 9); assert.equal(farmHalfOf(3), 11);
  assert.equal(farmHalfOf(undefined), 6); assert.equal(farmHalfOf(9), 6); assert.equal(farmHalfOf('2'), 6, '문자열은 단계가 아니다');
});

test('farmStageInfo: 다음 단계 비용 대조 — 부족/충분/최대', () => {
  const a = farmStageInfo(1, { wood: 40, stone: 20, coins: 149 });
  assert.equal(a.maxed, false); assert.equal(a.next.stage, 2); assert.equal(a.affordable, false, '코인 1 부족');
  const b = farmStageInfo(1, { wood: 40, stone: 20, coins: 150 });
  assert.equal(b.affordable, true, '딱 맞으면 가능');
  assert.deepEqual(b.items.map(i => [i.k, i.need, i.have]), [['wood', 40, 40], ['stone', 20, 20], ['coins', 150, 150]]);
  const c = farmStageInfo(3, {});
  assert.equal(c.maxed, true); assert.equal(c.next, null); assert.deepEqual(c.items, []);
  assert.equal(farmStageInfo(1, {}).items.find(i => i.k === 'wood').have, 0, '없는 자원은 0');
  assert.equal(farmStageInfo(undefined, {}).cur.stage, 1, '세이브에 없으면 1단계');
});

test('fencePosts: 둘레에만 · 남쪽·서쪽 출입구 비움 · 중복 없음 · 넓을수록 많다', () => {
  for (const H of [6, 9, 11]) {
    const posts = fencePosts(H);
    assert.ok(posts.every(([x, z]) => Math.abs(x) === H || Math.abs(z) === H), '둘레');
    assert.ok(!posts.some(([x, z]) => z === H && Math.abs(x) < 1.2), '남쪽 가운데 출입구');
    assert.ok(!posts.some(([x, z]) => x === -H && Math.abs(z) < 1.2), '서쪽 가운데 측량소 문');
    assert.equal(new Set(posts.map(p => p.join(','))).size, posts.length, '모서리 중복 없음');
    assert.ok(posts.some(([x, z]) => z === -H && x === -H), '북서 모서리는 있다');
  }
  assert.ok(fencePosts(6).length < fencePosts(9).length && fencePosts(9).length < fencePosts(11).length);
});

test('perimeterTrees: 남쪽 비움 · 스커트 원판(r48) 안 · 울타리 밖', () => {
  for (const H of [6, 9, 11]) {
    const trees = perimeterTrees(H);
    assert.ok(trees.length >= 18 && trees.length <= 24, `그루 수 ${trees.length}`);
    for (const t of trees) {
      const r = Math.hypot(t.x, t.z);
      assert.ok(r > H + 4 && r < 48, `울타리 밖·원판 안 (r=${r})`);
      assert.ok(t.h >= 2.0);
      assert.ok(!(t.z > 0 && Math.abs(t.x) < 0.3 * t.z), '남쪽 출입구 방향은 비어 있다');
      assert.ok(!(t.x < 0 && Math.abs(t.z) < 0.3 * -t.x), '서쪽 측량소 방향은 비어 있다');
    }
  }
});

test('측량소 마당: 울타리 밖 서쪽 · 건물·탁자가 마당 안 · 문 앞 통로(|z|<1.2)는 비어 있다', () => {
  for (const H of [6, 9, 11]) {
    const y = surveyYard(H), o = surveyOfficePos(H), d = surveyDeskPos(H), b = surveyBenchPos(H);
    assert.equal(y.x1, -H, '마당은 울타리 서쪽 면에 붙는다');
    assert.equal(y.x0, -H - YARD_D);
    assert.deepEqual([y.z0, y.z1], [-YARD_HZ, YARD_HZ]);
    for (const p of [o, d, b]) {
      assert.ok(p.x > y.x0 && p.x < y.x1, `마당 안 x (${p.x})`);
      assert.ok(p.z > y.z0 && p.z < y.z1, `마당 안 z (${p.z})`);
    }
    // 건물(4.4×3.6)·탁자가 서쪽 문 통로(|z|<1.2)를 막지 않아야 한다 — 막으면 밭에서 나올 수 없다
    assert.ok(o.z + 1.8 < -1.2, '건물 북쪽 끝이 통로 아래');
    assert.ok(d.z + 0.5 < -1.2, '탁자도 통로 아래');
    assert.ok(d.x > o.x, '탁자는 건물 동쪽(문 쪽) 앞');
    assert.ok(b.z - 0.7 > 1.2, '작업대는 통로 위쪽(남쪽)');
    assert.ok(Math.hypot(b.x - d.x, b.z - d.z) > 3, '두 상호작용 지점이 서로 프롬프트를 잡아먹지 않게 떨어져 있다');
  }
});

test('clampFarmPos: 문을 지나야만 마당 — 울타리를 따라 밀어도 z 순간이동이 없다', () => {
  for (const H of [6, 9, 11]) {
    // 울타리 안 북서쪽에서 서쪽으로 밀기 — 통로 밖이라 x 만 막히고 z 는 그대로여야 한다
    const side = clampFarmPos(-H - 0.05, H - 1.2, H, false);
    assert.equal(side.inYard, false, '통로 밖에선 마당으로 넘어가지 않는다');
    assert.equal(side.z, H - 1.2, 'z 가 튀지 않는다');
    assert.ok(side.x >= -H + 0.6, '울타리 안쪽으로 되돌린다');

    // 문 통로(|z| < GATE_HZ)에서 서쪽으로 나가면 마당
    const inYard = clampFarmPos(-H - 0.05, 0.4, H, false);
    assert.equal(inYard.inYard, true);
    assert.ok(inYard.x < -H + 0.61);

    // 마당 안에선 마당 사각으로 제한
    const deep = clampFarmPos(-H - 99, 99, H, true);
    assert.ok(deep.x > -H - YARD_D, '마당 서쪽 끝'); assert.ok(deep.z <= YARD_HZ - 0.6);

    // 마당 → 밭 복귀(문을 지나 동쪽으로)
    const back = clampFarmPos(-H + 1.5, 0.2, H, true);
    assert.equal(back.inYard, false); assert.equal(back.x, -H + 1.5);

    // 마당 남쪽 끝과 밭 남쪽 끝이 어긋나 순간이동하지 않는다(H=6 에서 둘 다 5.4)
    const edge = clampFarmPos(-H - 1, YARD_HZ, H, true);
    assert.ok(edge.z <= Math.max(YARD_HZ - 0.6, H - 0.6));
  }
  assert.equal(GATE_HZ, 1.6);
});

// ── 🚧 측량소 세트 충돌 — 조형을 덮는가 ─────────────────────────────────
//   2026-09-23 토스 -72 테스트에서 캐릭터가 🔧자재 작업대에 파묻혀 보였다. 충돌체는 제자리에
//   있었지만 **원(r0.8)이 조형 발자국(1.8×0.95, 대각 1.02)보다 작아서** 좌우 끝·모서리가
//   무방비였다. 원으로 덮으려면 앞뒤까지 같이 두꺼워져 통로가 막히니 사각으로 간다
//   (🫙발효통이 VAT_BOX 로 이미 쓰는 방식. 마을 작업대는 조형 1.5×0.9 에 r1.0 이라 문제없다).
//   ⚠️ 상호작용 판정은 둘 다 중심에서 1.9 다 — 박스가 커지면 그 안에 못 들어가 기능이 죽는다.
const GSRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const PLAYER_R = 0.42;

function surveySolid(varName) {
  const m = GSRC.match(new RegExp(varName + '\\.userData\\.solid = (\\w+)\\(([^;]*)\\);'));
  assert.ok(m, `${varName}.userData.solid 등록을 js/game.js 에서 못 찾음`);
  //  FARM.x/d.x 같은 식별자는 빼고 리터럴 반치수만 — solidSpan(cx, cz, hw, z1, z2)
  const nums = [...m[2].matchAll(/-?\d*\.\d+|\b\d+\b/g)].map(x => +x[0]).filter(n => Math.abs(n) <= 3);
  return { fn: m[1], nums };
}

//   z 범위는 비대칭이다 — 작업대는 뒤판(-0.52 에 두께 0.08)이 상판(±0.475)보다 뒤로 더 나간다.
//   그래서 '반깊이'가 아니라 **조형이 차지하는 z 구간을 덮는지**로 본다.
for (const [name, halfW, zMin, zMax, what] of [
  ['plan', 0.80, -0.55, 0.55, '📐 제도 탁자(상판 1.6×1.1)'],
  ['btop', 0.90, -0.56, 0.475, '🔧 자재 작업대(뒤판 폭 1.8 · 상판 깊이 0.95)'],
]) {
  test(`${what} 충돌체가 조형을 덮는다`, () => {
    const s = surveySolid(name);
    assert.ok(!/Circle/.test(s.fn), `${what} 는 사각 조형이다 — 원으로 막으면 좌우 끝이 뚫린다`);
    const [hw, z1, z2] = s.nums;
    assert.ok(hw >= halfW - 1e-6, `${what} x 반폭 ${hw} < 필요 ${halfW}`);
    assert.ok(z1 <= zMin + 1e-6, `${what} 뒤쪽이 덜 막힘 — 박스 z1 ${z1} > 조형 ${zMin}`);
    assert.ok(z2 >= zMax - 1e-6, `${what} 앞쪽이 덜 막힘 — 박스 z2 ${z2} < 조형 ${zMax}`);
    // 상호작용(1.9) 이 살아 있어야 한다 — 박스 모서리 + 플레이어 반경이 한계 거리
    const reach = Math.hypot(hw + PLAYER_R, Math.max(-z1, z2) + PLAYER_R);
    assert.ok(reach < 1.9, `${what} 에 다가갈 수 없다 — 최소 접근 ${reach.toFixed(2)} ≥ 판정 1.9`);
  });
}
