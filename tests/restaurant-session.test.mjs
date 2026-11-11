import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HALL, SERVICE_SEC } from '../js/restaurant/data.js';
import { createSession, tickSession, contextAt, actAt, finishSession, stationView } from '../js/restaurant/session.js';

const at = id => {
  const s = HALL.stations.find(s => s.id === id);
  if (s.x > 6) return { x: s.x - 0.9, z: s.z };
  if (s.z > 3) return { x: s.x, z: s.z - 0.9 };
  return { x: s.x, z: s.z + 0.9 };
};
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const yes = () => true;
const one = { iv: 1, pat: 1, win: 1 };

test('★1 첫 손님이 생기고 앉으면 주문표가 생긴다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0, 0) });
  const ev = [];
  for (let i = 0; i < 200; i++) ev.push(...tickSession(S, 0.05, { pos: at('board') }));
  assert.ok(ev.some(e => e.type === 'spawn'));
  assert.ok(ev.some(e => e.type === 'seat'));
  assert.equal(S.tickets.length, 1);
});

test('주먹밥: 쌀 꺼내기 → 도마 → 누르고 있기 → 접시 → 서빙 5점', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0.99, 0) });
  for (let i = 0; i < 200; i++) tickSession(S, 0.05, { pos: at('crate_rice') });
  assert.equal(S.tickets[0].menu, 'riceball');
  assert.equal(contextAt(S, at('crate_rice')).do, 'take');
  actAt(S, at('crate_rice'), { take: yes });
  assert.equal(S.held.kind, 'rice');
  assert.equal(contextAt(S, at('board')).do, 'put');
  actAt(S, at('board'), { take: yes });
  for (let k = 0; k < 4; k++) {
    assert.equal(contextAt(S, at('board')).do, 'chop');
    actAt(S, at('board'), { take: yes });
    for (let i = 0; i < 6; i++) tickSession(S, 0.05, { pos: at('board') });
  }
  assert.equal(contextAt(S, at('board')).do, 'pick');
  actAt(S, at('board'), { take: yes });
  actAt(S, at('plates'), { take: yes });
  assert.equal(S.held.plated, true);
  const tb = HALL.tables[S.tickets[0].table];
  const near = { x: tb[0], z: tb[1] + 1.0 };
  assert.equal(contextAt(S, near).do, 'serve');
  const sv = actAt(S, near, { take: yes }).find(e => e.type === 'served');
  assert.equal(sv.stars, 5);
  assert.equal(sv.menu, 'riceball');
  assert.equal(sv.coins, 25);
});

test('창고가 비면 상자에서 못 꺼낸다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0) });
  const ev = actAt(S, at('crate_fish'), { take: () => false });
  assert.equal(S.held, null);
  assert.ok(ev.some(e => e.type === 'empty' && e.kind === 'fish'));
});

test('팬: 초록에서 뒤집으면 q=1, 안 뒤집으면 0.75, 너무 늦게 꺼내면 burnt', () => {
  const run = (flipAt, pickAt) => {
    const S = createSession({ star: 1, dda: one, rng: seq(0) });
    actAt(S, at('crate_fish'), { take: yes });
    actAt(S, at('pan0'), { take: yes });
    for (let t = 0; t < pickAt; t += 0.05) {
      tickSession(S, 0.05, { pos: at('pan0') });
      if (flipAt !== null && Math.abs(t - flipAt) < 0.025) {
        assert.equal(contextAt(S, at('pan0')).do, 'flip');
        actAt(S, at('pan0'), { take: yes });
      }
    }
    assert.equal(contextAt(S, at('pan0')).do, 'pickCook');
    actAt(S, at('pan0'), { take: yes });
    return S.held;
  };
  assert.equal(run(2.7, 6).q, 1);
  assert.equal(run(1.0, 6).q, 0.75);
  assert.equal(run(null, 6).q, 0.75);
  assert.equal(run(2.7, 12).kind, 'burnt');
});

test('★1 에서는 냄비가 없다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0) });
  assert.equal(contextAt(S, at('pot')), null);
});

test('아무것도 안 하면 손님 2명이 못 받고 끝난다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0.2, 0.7, 0.4) });
  let ended = false;
  for (let i = 0; i < (SERVICE_SEC + 40) / 0.05 && !ended; i++) {
    if (tickSession(S, 0.05, { pos: at('board') }).some(e => e.type === 'end')) ended = true;
  }
  assert.ok(ended);
  const r = finishSession(S);
  assert.equal(r.served, 0);
  assert.equal(r.unserved, 2);
  assert.equal(r.avg, 1);
});

test('★2 생선국: 생선 → 도마 4번 → 냄비 → 완벽 구간에 꺼내기', () => {
  const S = createSession({ star: 2, dda: one, rng: seq(0) });
  actAt(S, at('crate_fish'), { take: yes });
  actAt(S, at('board'), { take: yes });
  for (let k = 0; k < 4; k++) { actAt(S, at('board'), { take: yes }); for (let i = 0; i < 6; i++) tickSession(S, 0.05); }
  actAt(S, at('board'), { take: yes });
  assert.equal(S.held.kind, 'fishChop');
  assert.equal(contextAt(S, at('plates')), null);
  actAt(S, at('pot'), { take: yes });
  for (let i = 0; i < 160; i++) tickSession(S, 0.05);
  actAt(S, at('pot'), { take: yes });
  assert.deepEqual(S.held, { kind: 'soup', q: 1 });
});

test('탄 음식은 접시에 못 담고 버리기만 된다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0) });
  actAt(S, at('crate_fish'), { take: yes });
  actAt(S, at('pan0'), { take: yes });
  for (let i = 0; i < 240; i++) tickSession(S, 0.05);
  actAt(S, at('pan0'), { take: yes });
  assert.equal(S.held.kind, 'burnt');
  assert.equal(contextAt(S, at('plates')), null);
  assert.equal(contextAt(S, at('trash')).do, 'trash');
});

test('완주 봇: ★1 한 판에서 6명 이상, 평균 ★4 이상', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0.1, 0.6, 0.8, 0.3, 0.55, 0.05, 0.9) });
  let done = false;
  const step = (n) => { for (let i = 0; i < n && !done; i++) if (tickSession(S, 0.05).some(e => e.type === 'end')) done = true; };
  const near = i => ({ x: HALL.tables[i][0], z: HALL.tables[i][1] + 1.0 });
  let guard = 0;
  while (!done && guard++ < 5000) {
    const tk = S.tickets[0];
    if (!tk) { step(4); continue; }
    if (tk.menu === 'riceball') {
      actAt(S, at('crate_rice'), { take: yes });
      actAt(S, at('board'), { take: yes });
      for (let k = 0; k < 4; k++) { actAt(S, at('board'), { take: yes }); step(5); }
      actAt(S, at('board'), { take: yes });
    } else {
      actAt(S, at('crate_fish'), { take: yes });
      actAt(S, at('pan0'), { take: yes });
      while (!done && S.stations.pan0.t < 2.7) step(1);
      actAt(S, at('pan0'), { take: yes });
      while (!done && S.stations.pan0.t < 5.05) step(1);
      actAt(S, at('pan0'), { take: yes });
    }
    actAt(S, at('plates'), { take: yes });
    actAt(S, near(tk.table), { take: yes });
    step(2);
  }
  const r = finishSession(S);
  assert.ok(done, 'end 이벤트');
  assert.ok(r.served >= 6, `served ${r.served}`);
  assert.ok(r.avg >= 4, `avg ${r.avg}`);
});

test('설비 게이지: 도마 칸, 팬 초록 구간, 냄비 완벽', () => {
  const S = createSession({ star: 2, dda: one, rng: seq(0) });
  assert.equal(stationView(S, 'board'), null);
  actAt(S, at('crate_rice'), { take: yes });
  actAt(S, at('board'), { take: yes });
  actAt(S, at('board'), { take: yes });
  assert.deepEqual({ ...stationView(S, 'board'), beat: 0 }, { kind: 'chop', taps: 1, beat: 0 });
  actAt(S, at('crate_fish'), { take: () => false });
  const S2 = createSession({ star: 1, dda: one, rng: seq(0) });
  actAt(S2, at('crate_fish'), { take: yes });
  actAt(S2, at('pan0'), { take: yes });
  for (let i = 0; i < 20; i++) tickSession(S2, 0.05);
  const v = stationView(S2, 'pan0');
  assert.equal(v.state, 'raw');
  assert.deepEqual(v.zone, [2.2 / 5, 3.2 / 5]);
  assert.ok(Math.abs(v.p - 0.2) < 1e-6);
  assert.equal(stationView(S2, 'pot'), null);
});

test('★1 도마는 쌀만 받는다(냄비가 없어 손질한 생선을 쓸 데가 없다)', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0) });
  actAt(S, at('crate_fish'), { take: yes });
  assert.equal(contextAt(S, at('board')), null);
  const S2 = createSession({ star: 2, dda: one, rng: seq(0) });
  actAt(S2, at('crate_fish'), { take: yes });
  assert.equal(contextAt(S2, at('board')).do, 'put');
});

test('손님은 식탁·다른 의자를 뚫지 않고 통로로 걸어 자리에 앉는다', async () => {
  const { guestPath, pointAlong, pathLen } = await import('../js/restaurant/session.js');
  const segDist = (a, b, p) => {
    const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0;
    return Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
  };
  const board = { x: HALL.board.x, z: HALL.board.z };
  HALL.tables.forEach(([tx, tz], i) => {
    const path = guestPath(i);
    assert.deepEqual(path[0], HALL.door);
    assert.deepEqual(path.at(-1), { x: tx, z: tz - 1.0 });
    for (let k = 1; k < path.length; k++) {
      const a = path[k - 1], b = path[k];
      HALL.tables.forEach(([ox, oz], j) => {
        assert.ok(segDist(a, b, { x: ox, z: oz }) > 0.78 + (j === i ? 0.15 : 0.25), `table ${i} leg ${k} hits table ${j}`);
        if (j !== i) assert.ok(segDist(a, b, { x: ox, z: oz - 1.0 }) > 0.32 + 0.25, `table ${i} leg ${k} hits chair ${j}`);
      });
      assert.ok(segDist(a, b, board) > 0.5, `table ${i} leg ${k} hits the board`);
    }
    const xz = p => ({ x: p.x, z: p.z });
    assert.deepEqual(xz(pointAlong(path, 0)), HALL.door);
    assert.deepEqual(xz(pointAlong(path, pathLen(path))), { x: tx, z: tz - 1.0 });
  });
});
