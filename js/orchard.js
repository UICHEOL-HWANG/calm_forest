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

// 🍎 시냇물 중심선 — 과수원을 세로로 가로지른다(ORCHARD 기준 국소 좌표)
// 🍎 시냇물 중심선 — 언덕(반경 20) **가장자리에서 가장자리까지** 흐른다.
//   전에는 ±14 에서 끊겨 들판 한가운데 물웅덩이가 떠 있는 꼴이었다.
export const ORCHARD_STREAM_LOCAL = [[-6.5, -18.5], [-6, -14], [-5, -7], [-4, 0], [-5, 7], [-6, 14], [-6.5, 18.5]];
// 나무 자리 10개 — 앞 4개는 시냇가(면제), 뒤 6개는 멀다.
//   시냇가 4자리는 STREAM_R(5)에 딱 붙이지 않는다 — 정확히 5.0(=hypot(4,3)/hypot(3,4))이면
//   nearStream 의 `<=` 경계에 걸쳐 있는 셈이라, 좌표를 살짝만 흔들거나 `<=`→`<` 로 리팩터링해도
//   "물 면제"가 조용히 "매일 물" 로 뒤집힌다(테스트는 통과한 채로 — 불리언 패턴만 보므로).
//   그래서 최근접 시냇물 점까지 거리를 hypot(3,2)=√13≈3.606(반경의 72%)까지 당겨 여유 1.39 를 둔다.
export const ORCHARD_SLOTS_LOCAL = [
  [-3, -12], [-2, -5], [-2, 3], [-3, 10],                        // 시냇가 4 — 최근접 시냇물 점까지 √13≈3.61
  [7, -12], [11, -5], [12, 3], [8, 11], [3, 15], [14, -13],      // 먼 자리 6
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

/**
 * 하루(또는 여러 날) 정산. 🐝벌통·🐛해충과 같은 날짜 게이트에서 한 번 호출한다.
 *   trees  : [{ x, z, kind, stage:'sapling'|'growing'|'mature', age, watered, fruit }]
 *   stream : 시냇물 중심선 점 목록
 *   days   : 경과 일수(접속이 끊겼던 날 포함)
 * 원본을 바꾸지 않고 새 배열을 돌려준다(저장소 코딩 규칙 — 불변).
 */
export function settleTrees(trees = [], stream = [], days = 1) {
  const matured = [], fruited = [], cappedList = [];
  if (days <= 0) return { trees: trees.map(t => ({ ...t })), matured, fruited, capped: cappedList };

  const out = trees.map(t => {
    let tree = { ...t };
    let cappedOnce = false;   // capped 는 정산 1회당 나무 1그루에 최대 1건만 기록한다 — 며칠이 걸려 있어도 이벤트는 하나
    // fruited 도 마찬가지로 하루 정산이 아니라 나무 1그루당 정산 1회에 최대 1건으로 모은다.
    // 몇 달치 offline 정산이 한 번에 들어오면 하루짜리 이벤트가 수백 건 쏟아져 GA4 신호가 묻힌다.
    let fruitN = 0, fruitWatered = 0, fruitDays = 0;
    for (let d = 0; d < days; d++) {
      if (tree.stage === 'sapling' || tree.stage === 'growing') {
        const age = (tree.age || 0) + 1;
        const need = growDaysOf(tree.kind);
        // watered 는 자라는 중이어도 매일 정산 후 꺼진다 — 다 자란 그날도 예외 없음
        tree = age >= need
          ? { ...tree, age, stage: 'mature', watered: false }
          : { ...tree, age, stage: 'growing', watered: false };
        if (tree.stage === 'mature') matured.push({ kind: tree.kind, grew_days: need });
        continue;                     // 다 자란 날엔 열매가 안 달린다 — 다음 날부터
      }
      // mature
      if (capped(tree)) {
        if (!cappedOnce) { cappedList.push({ kind: tree.kind }); cappedOnce = true; }
        tree = { ...tree, watered: false };   // 상한에 걸려 못 따도 물 플래그는 매일 꺼진다
        continue;
      }
      const wet = isWatered(tree, stream);
      const before = tree.fruit || 0;
      const fruit = Math.min(YIELD_PER_DAY * CAP_DAYS, before + (wet ? YIELD_PER_DAY : 0));
      fruitN += fruit - before;
      fruitWatered += wet ? 1 : 0;
      fruitDays += 1;
      tree = { ...tree, fruit, watered: false };
      if (capped(tree) && !cappedOnce) { cappedList.push({ kind: tree.kind }); cappedOnce = true; }
    }
    if (fruitDays > 0) fruited.push({ kind: tree.kind, n: fruitN, watered: fruitWatered, days: fruitDays });
    return tree;
  });
  return { trees: out, matured, fruited, capped: cappedList };
}
