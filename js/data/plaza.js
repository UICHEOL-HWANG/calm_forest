// =============================================================
//  🌾 수확제 광장 — 표시 정보(아이콘·이름·연출) + 좌표(순수 숫자, THREE 없음).
//  목표 숫자·기간은 SQL 시드가 단일 출처.
//  여기 있는 숫자(시작일·상한·등급 임계값)는 표시·오프라인 추정용이며
//  tests/plaza-sync.test.mjs 가 sql/migrations/migrate_plaza.sql 과 대조한다.
//  ⚠️ 값만 둔다 — 게임 상태를 읽는 코드는 js/plaza/ 로.
//  ⚠️ 좌표(PLAZA·PLAZA_R·PLAZA_BOX·PLAZA_STALL_POS·PLAZA_POLE·PLAZA_PATH)는
//     원래 js/data/places.js 에 THREE.Vector3 로 두기로 했으나, node 테스트가
//     `three` 패키지를 해석하지 못해(devDependency 없음) 여기 평범한 숫자로 둔다.
//     js/data/places.js 는 수정하지 않는다 — 3D 렌더 쪽에서 필요하면
//     new THREE.Vector3(PLAZA.x, 0, PLAZA.z) 형태로 여기서 값만 가져다 쓴다.
// =============================================================
export const PLAZA_SEASON = 'harvest-2026';
export const PLAZA_OPENS_KST = '2026-10-09';
export const PLAZA_DAILY_CAP = 30;
export const PLAZA_TIERS = [
  { id: 'gold', min: 150, ico: '🥇' },
  { id: 'silver', min: 60, ico: '🥈' },
  { id: 'bronze', min: 10, ico: '🥉' },
];
export const PLAZA_ITEMS = {
  wood: { ico: '🪵', name: '목재' }, stone: { ico: '🪨', name: '돌' }, coal: { ico: '⚫', name: '석탄' },
  crop: { ico: '🥕', name: '작물' }, forage: { ico: '🍄', name: '채집물' },
};
export const PLAZA_STAGE_NAMES = ['', '터 다지기', '돌바닥 깔기', '수확제 장식', '완공'];
export const PLAZA_STALL = [
  { id: 'haybale', price: 40 },
  { id: 'pumpkins', price: 60 },
];
export const PLAZA_TIER_REWARD = { bronze: { badge: 'harvest_helper' }, silver: { decor: 'pumpkinlamp' }, gold: { decor: 'harvestscarecrow' } };
export const PLAZA_LEAF_COINS = 2;                  // 시즌 후 남은 🍂 1장 → 🪙2
export const PLAZA_INVITE_REWARD = { leaf: 5, coins: 10 };
export const PLAZA_VIEW_R = 20;                     // 이 반경 안에 오면 진행률 재조회(60초 1회)
export const PLAZA_DONATE_STEPS = [1, 5];            // +1 · +5 · 최대

// 🌾 수확제 광장 — 마을 동쪽 과수원 길(2026-09-27 사용자 확정, 스펙 docs/superpowers/specs/2026-09-27-harvest-plaza-design.md).
//    나무 링(r8~30) 안이라 산포 제외는 js/plaza/rules.js plazaBlocks 가 맡는다. 정면은 +Z(카메라 시선 −Z).
export const PLAZA = { x: 23, z: -4 };
export const PLAZA_R = 5;
export const PLAZA_BOX = { x: 21.4, z: -0.9 };        // 기부함(완공 후 명판 자리)
export const PLAZA_STALL_POS = { x: 25.4, z: -1.0 };  // 🌾 수확제 좌판(시즌 중)
export const PLAZA_POLE = { x: 23, z: -8.2 };         // 깃대 — 광장 뒤(북)에 세워 시작점에서 나무 위로 보이게
// 돌길: 시작점 동쪽 → 🏆랭킹 게시판 앞 → 광장 정면. 1.6 간격(산포 제외 판정도 이 점들로)
export const PLAZA_PATH = [
  [3.0, 1.4], [4.6, 1.8], [6.2, 2.2], [7.8, 2.6], [9.4, 3.0], [11.0, 3.3], [12.6, 3.4],
  [14.2, 3.3], [15.8, 2.8], [17.3, 2.2], [18.7, 1.5], [20.0, 0.8], [21.2, 0.3],
];
