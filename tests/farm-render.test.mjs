import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIDGE_Z, RIDGE_PER_PLOT, PLOT_CAP, popScale, plotsSignature, poppingPlots } from '../js/farm-render.js';

test('이랑 상수 — 기존 createPlot 의 k*0.5 (k=-1,0,1) 과 같다', () => {
  assert.deepEqual(RIDGE_Z, [-0.5, 0, 0.5]);
  assert.equal(RIDGE_PER_PLOT, 3);
  assert.equal(PLOT_CAP, 160);
});

test('popScale — 기존 updatePops 곡선과 같다', () => {
  // pop 이 0 이하면 평상시 크기
  assert.equal(popScale(0), 1);
  assert.equal(popScale(-0.2), 1);
  // pop=1 은 방금 생긴 순간 → 거의 0
  assert.ok(popScale(1) < 0.01);
  // 중간엔 선형 램프(0.35)를 앞서는 값이 있다(통통 튀는 느낌의 정체)
  //   ⚠️ 기준은 0.35 가 아니라 1-0.35 다 — pop=0.35 일 때의 선형값은 1-pop=0.65 이고,
  //     `> 0.35` 로 두면 선형 램프도 통과해 오버슛을 전혀 검사하지 못한다.
  const mid = popScale(0.35);
  assert.ok(mid > 1 - 0.35, `선형 램프(0.65)보다 앞서 있어야 한다 — 이게 "톡" 하는 느낌의 정체, got ${mid}`);
  // 끝으로 갈수록 1 로 수렴
  assert.ok(Math.abs(popScale(0.01) - 1) < 0.05);
});

test('plotsSignature — 좌표·젖음·이랑 승격 상태가 바뀌면 값이 바뀐다', () => {
  const base = [{ x: 0, z: 0, watered: false, ridges: null, state: 'empty' }];
  const sig = plotsSignature(base);

  assert.equal(plotsSignature(base), sig, '같은 입력이면 같은 값');
  assert.notEqual(plotsSignature([{ ...base[0], watered: true }]), sig, '물을 주면 바뀐다');
  assert.notEqual(plotsSignature([{ ...base[0], x: 2 }]), sig, '좌표가 바뀌면 바뀐다');
  assert.notEqual(plotsSignature([{ ...base[0], ridges: [1, 2, 3] }]), sig, '이랑이 개별 메시로 승격되면 바뀐다');
  assert.notEqual(plotsSignature([]), sig, '칸이 사라지면 바뀐다');
  assert.notEqual(plotsSignature([...base, { x: 2, z: 0, watered: false, ridges: null, state: 'empty' }]), sig, '칸이 늘면 바뀐다');
});

test('plotsSignature — 삽질 시점(digAt)만 바뀌는 건 흙 버퍼와 무관하다', () => {
  // 인스턴스 이랑을 숨길지 정하는 건 digAt 이 아니라 승격 여부(ridges)다 — 게이트와 시그니처가 같은 값을 봐야 한다.
  const a = [{ x: 0, z: 0, watered: false, ridges: null, digAt: 0, state: 'empty' }];
  const b = [{ x: 0, z: 0, watered: false, ridges: null, digAt: 123, state: 'empty' }];
  assert.equal(plotsSignature(a), plotsSignature(b), 'digAt 은 흙·이랑 버퍼에 반영되지 않는다');
});

test('plotsSignature — 성장도만 바뀌는 건 흙 버퍼와 무관하다', () => {
  const a = [{ x: 0, z: 0, watered: false, ridges: null, state: 'growing', growth: 0.1 }];
  const b = [{ x: 0, z: 0, watered: false, ridges: null, state: 'growing', growth: 0.9 }];
  assert.equal(plotsSignature(a), plotsSignature(b), '흙 색·위치가 같으면 다시 안 쓴다');
});

test('poppingPlots — 팝 중인 칸의 인덱스만 돌려준다', () => {
  const plots = [{ pop: 0 }, { pop: 0.4 }, {}, { pop: 1 }];
  assert.deepEqual(poppingPlots(plots), [1, 3]);
  assert.deepEqual(poppingPlots([{ pop: 0 }, {}]), [], '아무도 안 튀면 빈 배열 — 매 프레임 갱신 0');
});
