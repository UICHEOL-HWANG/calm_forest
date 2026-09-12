import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOAT_LAMP, BOAT_LAMP_POST, BOAT_EYE, EYE_Z_RANGE, OBSTACLE_TOP,
  screenY, screenX, obstacleScreenY, lampClearsObstacles,
} from '../js/boat-lamp.js';

test('장애물 띠는 늘 화면 중앙 언저리 **아래**에 있다', () => {
  for (const eyeZ of EYE_Z_RANGE) {
    for (const d of [4, 6, 10, 20, 40, 70]) {
      const y = obstacleScreenY(d, OBSTACLE_TOP, eyeZ);
      assert.ok(y < 0.2, `${d}m 장애물이 화면 위쪽까지 올라옴(eyeZ=${eyeZ}): ${y}`);
    }
  }
  // 🪨 바위(꼭대기 1.3 — 눈높이 1.5 아래)는 가까울수록 화면 아래로 내려간다
  assert.ok(obstacleScreenY(6, 1.3) < obstacleScreenY(30, 1.3));
  // 🪧 다리 기둥은 꼭대기가 눈높이보다 높아(1.65) 가까울수록 **올라온다** — 위로 새는 쪽이라 상한을 잡아 둔다
  assert.ok(obstacleScreenY(4) > obstacleScreenY(30), '기둥은 가까울수록 올라온다');
});

test('🏮 등불은 장애물 띠 위에 떠 있다 — 정지부터 스퍼트까지 카메라가 어디에 있든', () => {
  assert.ok(lampClearsObstacles(), '등불 아랫변이 장애물 띠를 침범한다');
  for (const eyeZ of EYE_Z_RANGE) {
    const bottom = screenY({ x: BOAT_LAMP.x, y: BOAT_LAMP.y - BOAT_LAMP.r, z: BOAT_LAMP.z }, eyeZ);
    assert.ok(bottom > 0.25, `등불 아랫변이 시선 위로 충분히 떠 있어야 한다(여유=블룸 후광 몫), eyeZ=${eyeZ} → ${bottom}`);
  }
});

test('회귀: 예전 자리(0, 0.95, -1.9)는 규칙을 어긴다 — 이게 "바위가 등불에 가린다"의 정체', () => {
  const before = { x: 0, y: 0.95, z: -1.9, r: 0.2 };
  assert.ok(!lampClearsObstacles(before), '예전 배치가 통과하면 이 테스트는 아무것도 안 지킨다');
  // 예전 등불 중심은 화면 중앙보다 **아래** — 즉 장애물과 같은 띠에 있었다
  assert.ok(screenY(before) < 0, `예전 등불은 시선 아래에 있었다, got ${screenY(before)}`);
});

test('⚠️ 카메라는 주행 중 뒤로 밀린다 — "카메라 뒤에 두면 안 보인다"는 틀렸다', () => {
  // 실제로 겪은 사고: 돛대를 z=0.95(=정지 시점 0.55 보다 뒤)에 세웠더니 화면 왼쪽에 통나무처럼 잡혔다.
  const mast = { x: -0.34, y: 1.46, z: 0.95 };
  assert.ok(screenY(mast, EYE_Z_RANGE[1]) > 0, '달리는 중엔 카메라보다 앞 — 화면에 잡힌다');
  // 배 위 물건은 정지 시점 기준만 보면 안 되고 EYE_Z_RANGE 전체에서 확인해야 한다
  assert.ok(EYE_Z_RANGE[1] > BOAT_EYE.z + 1, '밀림 폭이 1m 를 넘는다 — 무시할 수 없는 크기');
});

test('등불은 세로 화면(폰)에서도 화면 안에 남는다 — 보상이 안 보이면 업그레이드가 무의미', () => {
  // 가장 좁은 축·가장 가까운 시점(정지) = 가장 바깥으로 밀리는 조합
  const sx = screenX(BOAT_LAMP, 0.46, EYE_Z_RANGE[0]);
  assert.ok(Math.abs(sx) < 0.95, `세로 화면에서 잘린다, got ${sx}`);
  assert.ok(Math.abs(screenY(BOAT_LAMP, EYE_Z_RANGE[0])) < 1, '위로 화면 밖으로 나간다');
});

test('등불 기둥은 얇다 — 20m 앞 바위 폭의 1/3 미만', () => {
  const aspect = 1.78;
  const half = Math.abs(screenX({ x: BOAT_LAMP_POST.r, y: 1.2, z: BOAT_LAMP_POST.z }, aspect));
  const rockHalf = Math.abs(screenX({ x: 0.95, y: 0.35, z: -20 }, aspect));
  assert.ok(half < rockHalf / 3, `기둥이 두꺼워 바위를 덮는다: 기둥 ${half} vs 바위 ${rockHalf}`);
});

test('상수는 game.js 가 실제로 쓰는 값과 묶여 있다', () => {
  assert.ok(BOAT_LAMP_POST.top >= BOAT_LAMP.y - BOAT_LAMP.r - 0.02, '기둥 꼭대기가 등불 아래까지 못 온다(등불이 허공에 뜬다)');
  assert.equal(BOAT_LAMP_POST.x, BOAT_LAMP.x);
  assert.equal(BOAT_LAMP_POST.z, BOAT_LAMP.z);
  assert.equal(OBSTACLE_TOP, 1.65);   // RIVER_OBS.pile: Box(0.5, 2.6, 0.5) at y=0.35
  // 뱃머리 선체 안에 서 있는가 — 뱃머리 고깔(z -1.5 에서 반지름 0.6, 끝 -2.8)
  const hullR = 0.6 * (2.8 + BOAT_LAMP_POST.z) / 1.3;
  assert.ok(Math.abs(BOAT_LAMP_POST.x) < hullR, `기둥이 선체 밖 허공에 있다: |${BOAT_LAMP_POST.x}| vs ${hullR.toFixed(2)}`);
});
