import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VILLAGE_CLAMP, BOX_HALF, SHADOW_FAR, MAX_REACH, shadowReaches,
  SUBSPACE_FLAGS, OUT_OF_REACH_FLAGS, MEASURED_SHADOWLESS_FLAGS, shadowActiveFor,
} from '../js/shadow-scope.js';

const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

// game.js 의 `const NAME = new THREE.Vector3(x, y, z)` 에서 좌표를 꺼낸다.
// 좌표를 이 테스트에 베껴 두면 game.js 가 공간을 옮겨도 통과해 버리므로 반드시 소스에서 읽는다.
function spaceAt(name) {
  const m = src.match(
    new RegExp(`const ${name} = new THREE\\.Vector3\\(\\s*(-?[\\d.]+)\\s*,\\s*-?[\\d.]+\\s*,\\s*(-?[\\d.]+)\\s*\\)`)
  );
  assert.ok(m, `game.js 에서 ${name} 좌표를 찾지 못했다`);
  return { x: Number(m[1]), z: Number(m[2]) };
}

// ─────────────────────────────────────────────────────────────
//  순수 규칙
// ─────────────────────────────────────────────────────────────

test('MAX_REACH 는 실측 49m 보다 크고, ±BOX_HALF 근사보다 넓다', () => {
  // 실측(2026-09-12, 태양각 360 × 방위 72 스윕): 상자 중심에서 49m.
  // 광원 방향 기준이라 ±BOX_HALF(=20)로 잡으면 "밖"이라고 잘못 말한다.
  assert.ok(MAX_REACH >= 49, `실측 49m 보다 커야 한다 — 지금 ${MAX_REACH}`);
  assert.ok(MAX_REACH > BOX_HALF, '월드축 근사보다 넓어야 한다');
  assert.equal(SHADOW_FAR, 60, 'far 를 바꾸면 MAX_REACH 를 다시 실측해야 한다');
});

test('shadowReaches: 마을 안은 어디든 닿는다(중심이 따라오므로)', () => {
  assert.equal(shadowReaches(0, 0), true);
  assert.equal(shadowReaches(18, 18), true);
  assert.equal(shadowReaches(-18, -18), true);
});

test('shadowReaches: 클램프된 중심에서의 거리로 잰다', () => {
  // (0, 84) 의 중심은 (0, 18) → 거리 66
  assert.equal(shadowReaches(0, VILLAGE_CLAMP + MAX_REACH), true, '경계상은 닿는 쪽');
  assert.equal(shadowReaches(0, VILLAGE_CLAMP + MAX_REACH + 0.1), false);
  assert.equal(shadowReaches(400, 0), false, 'x 만 멀어도 밖');
  assert.equal(shadowReaches(0, -400), false, 'z 만 멀어도 밖');
});

// ─────────────────────────────────────────────────────────────
//  game.js 의 그림자 설정이 이 모듈의 상수와 같은지
//  (한쪽만 바뀌면 판정이 조용히 틀어진다)
// ─────────────────────────────────────────────────────────────

test('game.js 의 마을 클램프가 VILLAGE_CLAMP 와 같다', () => {
  const m = src.match(/clamp\(player\.position\.x,\s*(-?\d+),\s*(-?\d+)\)/);
  assert.ok(m, 'updateDayNight 의 그림자 상자 클램프를 찾지 못했다');
  assert.equal(Number(m[2]), VILLAGE_CLAMP);
  assert.equal(Number(m[1]), -VILLAGE_CLAMP);
});

test('game.js 의 그림자 카메라 반폭이 BOX_HALF 와 같다', () => {
  const m = src.match(/shadow\.camera\.left = (-?\d+); sunLight\.shadow\.camera\.right = (-?\d+)/);
  assert.ok(m, 'sunLight.shadow.camera 설정을 찾지 못했다');
  assert.equal(Number(m[2]), BOX_HALF);
  assert.equal(Number(m[1]), -BOX_HALF);
});

// ─────────────────────────────────────────────────────────────
//  공간 분류 — 이 작업의 전제
// ─────────────────────────────────────────────────────────────

// 기하학적으로 상자 밖인 공간(플래그 이름 ↔ game.js 좌표 상수). OUT_OF_REACH_FLAGS 와 짝이다.
const OUT_OF_REACH = { atFarm: 'FARM', atMine: 'MINE', atCafe: 'CAFE', atMist: 'MIST', atRiver: 'RIVER', atSea: 'SEA' };
// 상자는 닿지만 실측상 보이는 그림자가 없는 공간.
const MEASURED_SHADOWLESS = { indoor: 'INT' };
// 마을 땅 안의 구역: 그림자가 실제로 보인다. 절대 끄면 안 된다.
const VILLAGE_SPACES = ['GLADE', 'FOREST', 'DOCK_POND'];

for (const [flag, name] of Object.entries(OUT_OF_REACH)) {
  test(`${name}(${flag}) 은 그림자 상자 밖이다`, () => {
    const { x, z } = spaceAt(name);
    assert.equal(shadowReaches(x, z), false, `${name}(${x}, ${z}) 가 상자 안으로 들어왔다`);
  });
}

for (const [flag, name] of Object.entries(MEASURED_SHADOWLESS)) {
  test(`${name}(${flag}) 은 상자 안이지만 실측 예외다 — 규칙이 이를 숨기면 안 된다`, () => {
    const { x, z } = spaceAt(name);
    // 여기서 false 가 나오면 규칙이 "안 닿는다"고 거짓말하는 것이다(실측: 하루 절반 이상 절두체 안).
    assert.equal(shadowReaches(x, z), true, `${name}(${x}, ${z}) 는 닿는 것으로 판정돼야 한다`);
  });
}

for (const name of VILLAGE_SPACES) {
  test(`${name} 은 그림자 상자 안이다 — 끄면 디테일이 무너진다`, () => {
    const { x, z } = spaceAt(name);
    assert.equal(shadowReaches(x, z), true, `${name}(${x}, ${z}) 가 상자 밖으로 나갔다`);
  });
}

test('두 분류가 서로 겹치지 않고 SUBSPACE_FLAGS 를 이룬다', () => {
  assert.deepEqual([...SUBSPACE_FLAGS].sort(),
    [...Object.keys(OUT_OF_REACH), ...Object.keys(MEASURED_SHADOWLESS)].sort());
  assert.deepEqual([...OUT_OF_REACH_FLAGS].sort(), Object.keys(OUT_OF_REACH).sort());
  assert.deepEqual([...MEASURED_SHADOWLESS_FLAGS].sort(), Object.keys(MEASURED_SHADOWLESS).sort());
});

// ─────────────────────────────────────────────────────────────
//  배선 — 새 서브 공간을 추가하면서 토글을 빠뜨리는 것을 막는다
// ─────────────────────────────────────────────────────────────

// 멀리 떨어진 공간의 진입/퇴장 함수. 토글은 여기 흩뿌리지 않고 setSpaceVisible 한 곳에 있으므로,
// 이 함수들이 setSpaceVisible 을 부른다는 것이 토글이 도달한다는 보장이다.
const GATES = [
  ['enterHouse', 'exitHouse'],
  ['enterFarm', 'exitFarm'],
  ['enterMine', 'exitMine'],
  ['enterCafe', 'exitCafe'],
  ['enterMist', 'exitMist'],
  ['enterRiver', 'exitRiver'],
  ['enterSea', 'exitSea'],
];

// 함수 선언부터 다음 최상위 함수 선언까지를 본문으로 자른다.
function bodyOf(fn) {
  const start = src.search(new RegExp(`^(?:async )?function ${fn}\\(`, 'm'));
  assert.ok(start >= 0, `game.js 에서 ${fn} 을 찾지 못했다`);
  const rest = src.slice(start + 1);
  const end = rest.search(/^(?:async )?function \w+\(/m);
  return end < 0 ? rest : rest.slice(0, end);
}

test('그림자 토글 헬퍼가 game.js 에 있다', () => {
  assert.match(src, /function setShadowActive\(/);
  // enabled 를 끄면 머티리얼 셰이더가 전부 재컴파일돼 진입 때 튄다 — autoUpdate 만 끊어야 한다.
  assert.match(src, /shadowMap\.autoUpdate = /);
  assert.doesNotMatch(
    bodyOf('setShadowActive'),
    /shadowMap\.enabled/,
    'setShadowActive 는 shadowMap.enabled 를 건드리면 안 된다(셰이더 재컴파일)'
  );
});

test('토글은 공간 전환 한 곳(setSpaceVisible)에서만 걸린다', () => {
  assert.match(bodyOf('setSpaceVisible'), /setShadowActive\(/, 'setSpaceVisible 이 토글을 부르지 않는다');
  // 판정은 순수 모듈에 위임해야 한다 — game.js 가 자기 조건식을 따로 갖고 있으면
  // SUBSPACE_FLAGS 에 새 공간을 더해도 반영되지 않는다.
  assert.match(src, /from '\.\/shadow-scope\.js'/, 'shadow-scope.js 를 import 해야 한다');
  assert.match(bodyOf('setSpaceVisible'), /shadowActiveFor\(/, '판정을 shadowActiveFor 에 위임해야 한다');
});

for (const [enter, exit] of GATES) {
  test(`${enter}/${exit} 은 setSpaceVisible 을 불러 토글에 도달한다`, () => {
    assert.match(bodyOf(enter), /setSpaceVisible\(\)/, `${enter} 에 setSpaceVisible() 이 없다`);
    assert.match(bodyOf(exit), /setSpaceVisible\(\)/, `${exit} 에 setSpaceVisible() 이 없다`);
  });
}

// ─────────────────────────────────────────────────────────────
//  shadowActiveFor — 서브 공간 하나라도 켜지면 멈춘다
// ─────────────────────────────────────────────────────────────

test('shadowActiveFor: 마을(플래그 전부 꺼짐)에서만 켠다', () => {
  assert.equal(shadowActiveFor({}), true, '마을에서는 켜야 한다');
  for (const flag of SUBSPACE_FLAGS) {
    assert.equal(shadowActiveFor({ [flag]: true }), false, `${flag} 일 때 멈춰야 한다`);
  }
});

test('shadowActiveFor: 여러 플래그가 겹쳐도 멈춘다', () => {
  assert.equal(shadowActiveFor({ indoor: true, atFarm: true }), false);
  // 관계없는 키는 판정에 영향을 주지 않는다
  assert.equal(shadowActiveFor({ atGlade: true, nearCafeBoard: true }), true);
});

test('SUBSPACE_FLAGS 의 이름이 game.js 의 실제 변수와 맞다', () => {
  for (const flag of SUBSPACE_FLAGS) {
    assert.match(src, new RegExp(`\\b(?:let|const|var)\\b[^\\n]*\\b${flag}\\b`), `game.js 에 ${flag} 선언이 없다`);
  }
});

test('game.js 의 shadow.camera.far 가 실측 전제와 같다', () => {
  // MAX_REACH 49m 실측은 far=60 에서 나왔다. far 가 커지면 도달 거리도 늘어난다.
  const m = src.match(/sunLight\.shadow\.camera\.far = (\d+)/);
  assert.ok(m, 'shadow.camera.far 설정을 찾지 못했다');
  assert.equal(Number(m[1]), SHADOW_FAR);
});

test('마을 안 구역은 서브 공간 플래그를 갖지 않는다', () => {
  // 계곡·채집 숲·나루터는 걸어 들어가는 마을 땅이다. 플래그로 승격되면 그림자가 꺼져 디테일이 무너진다.
  for (const flag of ['atGlade', 'atForest', 'atDock']) {
    assert.ok(!SUBSPACE_FLAGS.includes(flag), `${flag} 은 마을 안이라 그림자를 끄면 안 된다`);
  }
});
