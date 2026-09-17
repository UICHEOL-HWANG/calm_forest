// =============================================================
//  calm forest · 🍎 과수원 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-17-orchard-design.md
//  ▶ 나무는 죽지 않는다. 물을 안 주면 그날 열매가 안 열릴 뿐이다.
//  ▶ 과일 id 5종은 GA4·econ_logs·도감·세이브에서 전부 같은 문자열을 쓴다.
//    자리 번호(slot:3)로 종류를 대신하지 않는다 — courier:3 복원 불가 사고.
//  ▶ 테스트: npm test (tests/orchard.test.mjs)
// =============================================================

export const TREE_SLOTS = 10;     // 나무 자리 상한 — 코인 인플레 방어(스펙 §5)
export const STREAM_SLOTS = 4;    // 그중 시냇가(물 면제) 자리
export const STREAM_R = 5;        // 시냇물 중심선에서의 면제 반경 — 💧우물과 같은 문법
export const YIELD_PER_DAY = 2;   // 하루에 달리는 열매 수
export const CAP_DAYS = 3;        // 안 따면 3일치까지 쌓이고 멈춘다

/** 과일 표 — 스펙 §5. fruitColor/leafColor 는 인스턴스 색(새 메시 없이 색만 다르게) */
export const FRUITS = [
  { id: 'apple',     name: '사과',   ico: '🍎', sapCoin: 90,  growDays: 3, price: 5,  fruitColor: 0xd64a42, leafColor: 0x5f9e52 },
  { id: 'pear',      name: '배',     ico: '🍐', sapCoin: 130, growDays: 3, price: 6,  fruitColor: 0xd9cf7a, leafColor: 0x6aa85a },
  { id: 'peach',     name: '복숭아', ico: '🍑', sapCoin: 180, growDays: 4, price: 8,  fruitColor: 0xef9aad, leafColor: 0x7ab069 },
  { id: 'persimmon', name: '감',     ico: '🍊', sapCoin: 240, growDays: 4, price: 10, fruitColor: 0xe08a30, leafColor: 0x55924a },
  { id: 'chestnut',  name: '밤',     ico: '🌰', sapCoin: 300, growDays: 5, price: 12, fruitColor: 0x7a5433, leafColor: 0x4a833f },
];

export function fruitOf(id) { return FRUITS.find(f => f.id === id) || null; }
export function fruitKeyOf(id) { return id; }          // 과일 인벤 키 = id 그대로
export function sapKeyOf(id) { return 'sap_' + id; }   // 묘목 인벤 키
export function growDaysOf(id) { return fruitOf(id)?.growDays ?? 3; }

/** 시냇물 중심선 점 목록 중 **가장 가까운 점**까지의 거리가 STREAM_R 이내인가.
 *  시작점만 보면 시냇물 아래쪽 나무가 통째로 새므로 전 구간을 본다. */
export function nearStream(tree, stream = []) {
  return stream.some(p => Math.hypot(p.x - tree.x, p.z - tree.z) <= STREAM_R);
}

/** 정산 시점에 "물이 있는 상태"인가. 시냇가면 플래그와 무관하게 항상 true. */
export function isWatered(tree, stream = []) {
  return nearStream(tree, stream) || !!tree.watered;
}

/** 지금 딸 수 있는 열매 수. 다 자란 나무만 딸 수 있다. */
export function harvestable(tree) {
  return tree.stage === 'mature' ? Math.max(0, tree.fruit || 0) : 0;
}

/** 상한(3일치)에 걸려 더 안 쌓이는가. */
export function capped(tree) {
  return (tree.fruit || 0) >= YIELD_PER_DAY * CAP_DAYS;
}
