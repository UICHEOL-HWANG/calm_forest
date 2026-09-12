import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLOT_CAP, popScale, poppingPlots } from '../js/farm-render.js';

test('버퍼 초기 용량', () => {
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

test('poppingPlots — 팝 중인 칸의 인덱스만 돌려준다', () => {
  const plots = [{ pop: 0 }, { pop: 0.4 }, {}, { pop: 1 }];
  assert.deepEqual(poppingPlots(plots), [1, 3]);
  assert.deepEqual(poppingPlots([{ pop: 0 }, {}]), [], '아무도 안 튀면 빈 배열 — 매 프레임 갱신 0');
});
