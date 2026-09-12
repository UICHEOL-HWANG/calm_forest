import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL, CELL_SEG, SPRIG_PER_PLOT, SPRIG_SPAN,
  mottleAt, reliefAt, mottleMix, sprigOffsets, soilSignature, seamAt, soilSink, nextSunk, vertsPerCell, indicesPerCell, rng,
} from '../js/farm-soil.js';

test('격자 간격은 2.0 — 흙 면이 이 폭이어야 옆 칸과 맞닿는다', () => {
  assert.equal(CELL, 2.0);
  assert.equal(SPRIG_PER_PLOT, 6);
  assert.equal(SPRIG_SPAN, 0.78);
});

test('mottleAt 은 0~1 범위이고 같은 좌표면 늘 같은 값', () => {
  for (let i = 0; i < 500; i++) {
    const x = (i % 37) * 1.3 - 24, z = (i % 23) * 2.1 - 18;
    const m = mottleAt(x, z);
    assert.ok(m >= 0 && m <= 1, `범위 밖 ${m} (x=${x} z=${z})`);
    assert.equal(mottleAt(x, z), m, '같은 좌표인데 값이 달라졌다 — 다시 구울 때 무늬가 흔들린다');
  }
});

// 이게 A안의 핵심이다. 칸마다 같은 무늬가 나오면 격자 타일링이 눈에 보인다.
test('무늬가 칸마다 반복되지 않는다 — 칸 경계를 넘어 이어진다', () => {
  for (const [rx, rz] of [[0, 0], [0.5, 0.5], [-0.7, 0.3]]) {
    const vals = [];
    for (let gx = -5; gx <= 5; gx++) {
      for (let gz = -5; gz <= 5; gz++) vals.push(mottleAt(gx * CELL + rx, gz * CELL + rz));
    }
    const uniq = new Set(vals.map(v => v.toFixed(6)));
    assert.ok(uniq.size > vals.length * 0.9,
      `칸별 상대 위치 (${rx},${rz}) 의 무늬가 ${vals.length}칸 중 ${uniq.size}종뿐 — 타일링이 보인다`);
  }
});

test('맞닿은 칸의 경계 정점은 같은 무늬 값을 갖는다 — 이음매가 안 보이게', () => {
  // 칸 A 의 오른쪽 끝과 칸 B 의 왼쪽 끝은 같은 월드 좌표 → 같은 함수에 같은 입력
  for (let gz = -3; gz <= 3; gz++) {
    const edgeX = 1 * CELL + CELL / 2;
    const z = gz * CELL;
    assert.equal(mottleAt(edgeX, z), mottleAt(edgeX, z));
    assert.equal(reliefAt(edgeX, z), reliefAt(edgeX, z));
  }
});

test('mottleMix — 0.45 를 경계로 어두운 쪽/밝은 쪽, t 는 0~1', () => {
  assert.deepEqual(mottleMix(0), { from: 'dark', to: 'base', t: 0 });
  assert.equal(mottleMix(0.449).to, 'base');
  assert.equal(mottleMix(0.45).from, 'base');
  assert.deepEqual(mottleMix(1), { from: 'base', to: 'light', t: 1 });
  for (let i = 0; i <= 100; i++) {
    const { t } = mottleMix(i / 100);
    assert.ok(t >= 0 && t <= 1, `t 범위 밖 ${t}`);
  }
});

test('reliefAt 은 아주 얕다 — 흙판이 울퉁불퉁해 보이면 안 된다', () => {
  let max = 0;
  for (let i = 0; i < 2000; i++) max = Math.max(max, Math.abs(reliefAt(i * 0.31 - 30, i * 0.17 - 20)));
  assert.ok(max <= 0.025, `기복 최대 ${max.toFixed(4)} — 0.025 이하여야 한다`);
});

test('sprigOffsets — 시드가 같으면 같은 배치, 범위 안에 있다', () => {
  const a = sprigOffsets(7), b = sprigOffsets(7), c = sprigOffsets(8);
  assert.deepEqual(a, b, '같은 칸인데 배치가 달라졌다 — 다시 그릴 때 포기가 튄다');
  assert.notDeepEqual(a, c, '칸이 다른데 배치가 같다 — 밭 전체가 복사·붙여넣기처럼 보인다');
  assert.equal(a.length, SPRIG_PER_PLOT);
  for (const s of a) {
    assert.ok(Math.abs(s.dx) <= SPRIG_SPAN && Math.abs(s.dz) <= SPRIG_SPAN, '흩뿌림 반경을 벗어났다');
    assert.ok(s.scale >= 0.9 && s.scale <= 1.35);
    assert.ok(s.rotY >= 0 && s.rotY < Math.PI * 2);
    assert.equal(typeof s.flower, 'boolean');
  }
});

test('sprigOffsets — 꽃이 전부 달리거나 하나도 안 달리지 않는다', () => {
  let withF = 0, total = 0;
  for (let seed = 0; seed < 200; seed++) {
    for (const s of sprigOffsets(seed)) { total++; if (s.flower) withF++; }
  }
  const ratio = withF / total;
  assert.ok(ratio > 0.6 && ratio < 0.9, `꽃 비율 ${ratio.toFixed(2)} — 0.78 근처여야 한다`);
});

test('soilSignature 는 pop 을 보지 않는다 — 보면 매 프레임 다시 굽는다', () => {
  const base = [{ x: 0, z: 0, watered: false }, { x: 2, z: 0, watered: false }];
  const popping = [{ x: 0, z: 0, watered: false, pop: 0.7 }, { x: 2, z: 0, watered: false, pop: 0.2 }];
  assert.equal(soilSignature(base), soilSignature(popping));
});

test('soilSignature 는 물주기·칸 추가를 잡는다', () => {
  const a = [{ x: 0, z: 0, watered: false }];
  const b = [{ x: 0, z: 0, watered: true }];
  const c = [{ x: 0, z: 0, watered: false }, { x: 2, z: 0, watered: false }];
  assert.notEqual(soilSignature(a), soilSignature(b), '물을 줬는데 색이 안 바뀐다');
  assert.notEqual(soilSignature(a), soilSignature(c), '칸이 늘었는데 안 다시 굽는다');
});

test('버퍼 크기 계산', () => {
  assert.equal(vertsPerCell(4), 25);
  assert.equal(indicesPerCell(4), 96);
  assert.equal(vertsPerCell(CELL_SEG), (CELL_SEG + 1) ** 2);
});

test('rng — 시드 고정, 0~1', () => {
  const r = rng(3), s = rng(3);
  for (let i = 0; i < 50; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
    assert.equal(v, s());
  }
});

// ── 팝: 갓 생긴 칸을 묻었다 끌어올린다 ───────────────────────────
import { popScale } from '../js/farm-render.js';

test('soilSink — pop 이 끝나면 정확히 0(부동소수 잔차가 남으면 칸이 가라앉은 채 남는다)', () => {
  assert.equal(soilSink(0, popScale), 0);
  assert.equal(soilSink(undefined, popScale), 0);
  assert.equal(soilSink(-0.3, popScale), 0);
  assert.ok(soilSink(1, popScale) > 0.44, '갓 생긴 칸은 거의 다 묻혀 있어야 한다');
  // 단조 감소 — 솟아오르다 다시 내려가면 안 된다
  let prev = Infinity;
  for (let p = 1; p >= 0; p -= 0.05) { const v = soilSink(p, popScale); assert.ok(v <= prev + 1e-12); prev = v; }
});

test('nextSunk — 평상시 칸은 건드리지 않는다', () => {
  const r = nextSunk([0, 0, 0], new Set());
  assert.deepEqual(r.write, [], '아무도 안 튀는데 버퍼를 올리고 있다');
  assert.equal(r.sunk.size, 0);
});

test('nextSunk — 복귀는 딱 한 프레임만 쓴다', () => {
  // 1칸이 내려가 있다가 제자리로: 그 프레임엔 쓰고, 다음 프레임엔 안 쓴다
  let st = nextSunk([0.45, 0], new Set());
  assert.deepEqual(st.write, [0], '내려간 칸을 안 썼다');
  assert.deepEqual([...st.sunk], [0]);

  st = nextSunk([0, 0], st.sunk);
  assert.deepEqual(st.write, [0], '복귀 프레임에 제자리로 안 돌려놨다');
  assert.equal(st.sunk.size, 0);

  st = nextSunk([0, 0], st.sunk);
  assert.deepEqual(st.write, [], '복귀를 두 번 이상 쓰고 있다 — 매 프레임 버퍼가 올라간다');
});

test('nextSunk — 여러 칸이 서로 다른 시점에 복귀해도 각각 한 번씩', () => {
  let st = nextSunk([0.4, 0.2, 0], new Set());
  assert.deepEqual(st.write, [0, 1]);
  st = nextSunk([0.1, 0, 0], st.sunk);
  assert.deepEqual(st.write, [0, 1], '0 은 아직 내려가 있고 1 은 복귀 프레임');
  st = nextSunk([0, 0, 0], st.sunk);
  assert.deepEqual(st.write, [0], '0 만 복귀 — 1 은 이미 끝났다');
  st = nextSunk([0, 0, 0], st.sunk);
  assert.deepEqual(st.write, []);
});

// ── 칸 경계 이음매 ─────────────────────────────────────────────
test('seamAt — 경계 정점만 어둡고 안쪽은 건드리지 않는다', () => {
  const seg = 4;
  assert.ok(seamAt(0, 0, seg) > 0, '모서리는 이음매가 있어야 한다');
  assert.ok(seamAt(0, 2, seg) > 0, '변 위도 이음매');
  assert.ok(seamAt(seg, seg, seg) > 0, '반대쪽 모서리도 대칭이어야 한다');
  assert.equal(seamAt(2, 2, seg), 0, '칸 한가운데는 손대면 안 된다');
  assert.equal(seamAt(0, 0, seg), seamAt(seg, 0, seg), '좌우 비대칭이면 밭이 기울어 보인다');
  // 너무 진하면 이랑을 되살린 꼴이다 — A안의 "이어진 흙"을 깨지 않을 만큼만
  for (let c = 0; c <= seg; c++) for (let r = 0; r <= seg; r++) assert.ok(seamAt(c, r, seg) <= 0.25);
});
