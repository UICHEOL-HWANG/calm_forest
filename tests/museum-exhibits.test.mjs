import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exhibitParts, SHAPES, MATS, PARTS_CATS } from '../js/museum/exhibit-parts.js';
import { MUSEUM_FLOORS } from '../js/museum.js';
import { realDexIds } from './helpers/real-dex.mjs';

const REAL = realDexIds();
// 작물·물고기는 기존 cropMini·fishMesh 가 그린다 — 여기서 다루지 않는다
const OWN = ['crop', 'fish'];
// ⚠️ 카테고리를 옮길 때마다 여기에 추가한다. 'Task 10' 의 '전부 덮는다' 테스트가 이 목록을 전체와 맞춰 본다.
const PORTED = ['ore', 'forage', 'bug', 'track', 'dig', 'river', 'spirit', 'weather', 'npc', 'cook', 'visitor'];

const chan = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

for (const cat of PORTED) {
  test(`${cat}: 실제 도감 id 전부가 올바른 도형 목록을 낸다`, () => {
    assert.ok(REAL[cat]?.length, `${cat} 실제 id 를 못 읽었다`);
    for (const id of REAL[cat]) {
      const parts = exhibitParts(cat, id);
      assert.ok(Array.isArray(parts) && parts.length > 0, `${cat}/${id} 도형이 없다`);
      assert.ok(parts.length <= 60, `${cat}/${id} 도형 ${parts.length}개 — 병합해도 정점이 너무 많다`);
      for (const q of parts) {
        assert.ok(SHAPES.includes(q.shape), `${cat}/${id} 모르는 도형 ${q.shape}`);
        assert.ok(MATS.includes(q.mat), `${cat}/${id} 모르는 재질 ${q.mat}`);
        assert.ok(Number.isInteger(q.color) && q.color >= 0 && q.color <= 0xffffff, `${cat}/${id} 색`);
        assert.ok(q.pos.length === 3 && q.scl.length === 3 && q.rot.length === 3 && [...q.pos, ...q.scl, ...q.rot].every(isNum), `${cat}/${id} 변환`);
        if (q.mat === 'glow') assert.ok(chan(q.color).every(v => v <= 0xd9), `${cat}/${id} 발광색 채널이 0xd9 를 넘는다 — 블룸으로 눈이 부시다`);
      }
    }
  });

  // 🧑 주민은 게임이 NPCS 의 실제 색(color·hat)을 meta 로 넘겨 구분한다 — 메타 없는 해시 팔레트는 겹칠 수 있어 제외
  if (cat !== 'npc') test(`${cat}: 종마다 모양이나 색이 다르다(전부 같은 돌덩이로 보이면 안 된다)`, () => {
    const sig = REAL[cat].map(id => JSON.stringify(exhibitParts(cat, id)));
    assert.equal(new Set(sig).size, sig.length, `${cat} 에 똑같이 생긴 종이 있다`);
  });
}

test('exhibitParts: 모르는 카테고리·id 는 null — 호출부가 20면체 폴백으로 받는다', () => {
  assert.equal(exhibitParts('nope', 'x'), null);
  assert.equal(exhibitParts('ore', 'nope'), null);
});

test('같은 입력이면 같은 결과, 호출할 때마다 새 객체(불변)', () => {
  const a = exhibitParts('ore', 'stone'), b = exhibitParts('ore', 'stone');
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  a[0].pos[0] = 99;
  assert.notEqual(exhibitParts('ore', 'stone')[0].pos[0], 99, '내부 상태를 공유한다');
});

test('PARTS_CATS 는 실제로 다루는 카테고리와 같다', () => {
  assert.deepEqual([...PARTS_CATS].sort(), [...PORTED].sort());
});

// ── 빌더: 도형 목록 → 재질별 병합 메시 ─────────────────────────────
import { buildExhibitMesh } from '../js/museum/exhibit-build.js';

// 최소 가짜 THREE — 병합 결과가 재질당 메시 1개인지만 본다(실제 THREE 정확성은 브라우저 스모크가 본다)
function fakeTHREE() {
  class Geo { constructor(n = 12) { this.attributes = { position: { count: n, array: new Float32Array(n * 3), itemSize: 3 }, normal: { count: n, array: new Float32Array(n * 3), itemSize: 3 } }; this.index = null; } applyMatrix4() { return this; } setAttribute(k, v) { this.attributes[k] = v; } toNonIndexed() { return this; } dispose() {} }
  const geo = function () { return new Geo(); };
  class Obj { constructor() { this.children = []; } add(o) { this.children.push(o); return this; } }
  return {
    Group: Obj, Mesh: class extends Obj { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; this.isMesh = true; } },
    BufferGeometry: Geo, BufferAttribute: class { constructor(arr, size) { this.array = arr; this.itemSize = size; this.count = arr.length / size; } },
    SphereGeometry: geo, CylinderGeometry: geo, ConeGeometry: geo, BoxGeometry: geo, IcosahedronGeometry: geo, DodecahedronGeometry: geo, TorusGeometry: geo, LatheGeometry: geo, TubeGeometry: geo,
    Vector2: class {}, Vector3: class {}, CatmullRomCurve3: class {},
    Matrix4: class { compose() { return this; } }, Quaternion: class { setFromEuler() { return this; } }, Euler: class {},
    Color: class { constructor(h) { this.r = ((h >> 16) & 255) / 255; this.g = ((h >> 8) & 255) / 255; this.b = (h & 255) / 255; } },
    MeshStandardMaterial: class { constructor(o) { Object.assign(this, o); } }, MeshBasicMaterial: class { constructor(o) { Object.assign(this, o); } },
    DoubleSide: 2,
  };
}

test('buildExhibitMesh: 재질별로 병합 — 전시물 하나는 메시 3개 이하', () => {
  const T = fakeTHREE();
  const mk = (shape, args, color, mat) => ({ shape, args, color, mat, pos: [0, 0, 0], scl: [1, 1, 1], rot: [0, 0, 0] });
  const g = buildExhibitMesh(T, [mk('sph', [0.1, 8, 6], 0xff0000, 'solid'), mk('box', [1, 1, 1], 0x00ff00, 'solid'), mk('sph', [0.1, 8, 6], 0xd0c060, 'glow'), mk('cyl', [1, 1, 1, 8], 0xcfeff5, 'glass')]);
  assert.equal(g.children.length, 3, 'solid·glow·glass 한 메시씩이어야 한다');
  assert.equal(buildExhibitMesh(T, null), null);
});

test('buildExhibitMesh: solid 만 있으면 메시 1개', () => {
  const g = buildExhibitMesh(fakeTHREE(), exhibitParts('ore', 'gem'));
  assert.equal(g.children.length, 1);
});

test('npc: 모르는 id·meta 없이도 도형이 나온다 — 주민이 늘어도 박물관이 터지지 않는다', () => {
  const a = exhibitParts('npc', 'brand_new_villager');
  assert.ok(a && a.length > 0);
  assert.deepEqual(exhibitParts('npc', 'brand_new_villager'), a, '같은 id 는 늘 같은 모양이어야 한다');
});

test('npc: meta 의 실제 색을 쓴다(주민이 자기 색으로 전시된다)', () => {
  const parts = exhibitParts('npc', 'farmer', { color: 0x5fbf62, hat: 0xf0cd6a });
  assert.ok(parts.some(q => q.color === 0x5fbf62), '몸 색이 meta.color 가 아니다');
  assert.ok(parts.some(q => q.color === 0xf0cd6a), '모자 색이 meta.hat 이 아니다');
});

test('cook: 모르는 레시피도 접시 위 음식으로 나온다', () => {
  assert.ok(exhibitParts('cook', 'brand_new_dish')?.length > 0);
});

test('작물·물고기 말고 모든 층 카테고리에 도형 목록이 있다 — 하나라도 빠지면 그 종은 옛 원석으로 남는다', () => {
  const need = [...new Set(MUSEUM_FLOORS.flatMap(f => f.cats))].filter(c => !OWN.includes(c)).sort();
  assert.deepEqual([...PARTS_CATS].sort(), need);
  assert.deepEqual([...PORTED].sort(), need);
});
