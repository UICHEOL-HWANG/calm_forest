import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 🌟반딧불이 계곡과 🍄채집 숲이 겹쳐 보이던 걸 떼어 놓고, 다시 붙지 않게 잠근다.
//   좌표는 js/game.js 전역 상수라 모듈로 뺄 수 없다 — 소스에서 읽어 산술로 검증한다.
const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

function vec3(name) {
  const m = new RegExp(`const ${name} = new THREE\\.Vector3\\(\\s*(-?[\\d.]+)\\s*,\\s*-?[\\d.]+\\s*,\\s*(-?[\\d.]+)\\s*\\)`).exec(src);
  assert.ok(m, `${name} 좌표를 못 찾았다 — 선언 형태가 바뀌었나?`);
  return { x: +m[1], z: +m[2] };
}
function num(name) {
  const m = new RegExp(`const ${name} = (-?[\\d.]+)`).exec(src);
  assert.ok(m, `${name} 을 못 찾았다`);
  return +m[1];
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

const GLADE = vec3('GLADE'), FOREST = vec3('FOREST');
const GLADE_R = num('GLADE_R'), FOREST_R = num('FOREST_R');

// 둘레 나무가 뻗는 최대 반경 — buildGlade / buildForest 의 링 생성식과 같아야 한다
const GLADE_RING = GLADE_R + 1.4 + 1.2;
const FOREST_RING = FOREST_R + 1.2 + 1.4;

test('🌟계곡과 🍄숲의 구역(밭 금지·입장 판정)이 겹치지 않는다', () => {
  const d = dist(GLADE, FOREST);
  assert.ok(d > GLADE_R + FOREST_R,
    `중심거리 ${d.toFixed(2)} ≤ 반경합 ${GLADE_R + FOREST_R} — 두 구역이 겹친다`);
});

test('🌟계곡과 🍄숲의 둘레 나무 링도 겹치지 않는다', () => {
  // 구역만 떼어 놓으면 링 나무가 서로 뚫고 들어가 여전히 한 덩어리로 보인다
  const d = dist(GLADE, FOREST);
  const gap = d - (GLADE_RING + FOREST_RING);
  assert.ok(gap > 1, `나무 링 간격 ${gap.toFixed(2)} — 1 이상 떨어져야 한다 (중심거리 ${d.toFixed(2)})`);
});

test('링 생성식이 바뀌면 이 테스트도 같이 고치도록 — 소스와 상수를 대조', () => {
  assert.ok(src.includes('r = GLADE_R + 1.4 + Math.random() * 1.2'),
    'buildGlade 의 링 반경식이 바뀌었다 — GLADE_RING 을 맞춰라');
  assert.ok(src.includes('r = FOREST_R + 1.2 + Math.random() * 1.4'),
    'buildForest 의 링 반경식이 바뀌었다 — FOREST_RING 을 맞춰라');
});

test('두 구역 모두 지면(반경 60) 안에 있다', () => {
  for (const [name, p, ring] of [['GLADE', GLADE, GLADE_RING], ['FOREST', FOREST, FOREST_RING]]) {
    const far = Math.hypot(p.x, p.z) + ring;
    assert.ok(far < 60, `${name} 바깥 끝이 원점에서 ${far.toFixed(1)} — 지면(60) 밖으로 나간다`);
  }
});
