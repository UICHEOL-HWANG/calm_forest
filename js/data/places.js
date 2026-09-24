// =============================================================
//  📦 시설·관문·공간 좌표와 공간별 내용물(손님·곤충·채집물·강·안개·바다) · 집 외관 팔레트
//  ------------------------------------------------------------
//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).
//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.
//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md
// =============================================================
import * as THREE from 'three';

export const INT = new THREE.Vector3(0, 0, 52); // 실내 위치(플레이 구역 밖, 지면 위)

export const ROOF_Y = 3.4;   // ☀️ 루프탑만 집 한 층 높이만큼 띄운다 — "지붕 위에서 마을을 내려다보는" 높이감(2026-09-17 사용자 피드백).

export const LAKE_R = 6;   // 호수 반경(환경 호수와 동일)

export const BENCH = new THREE.Vector3(4, 0, -5);      // 작업대(도구·장식·선물 제작) 위치

// 🍳 자유주방 — 작업대에서 요리를 분리한 새 작업장. 요리는 이제 미니게임(타이밍·리듬)으로 만든다
export const KITCHEN = new THREE.Vector3(7.4, 0, -6.4);  // 작업대 동쪽 옆(상점·시세판과 안 겹치는 빈터)

export const SHOP = new THREE.Vector3(9, 0, 0);        // 상점 좌판(집터 -8,-8 에서 멀리 동쪽)

export const MARKET = new THREE.Vector3(10, 0, 5.5);  // 📊 시세판 — 호수 서쪽 가로등 잔디. 상점 옆에 붙어 있던 걸 떼어 냄(베타: 상점·시세판·상인이 3유닛 안에 몰려 NPC 를 가림)

// 🏆 랭킹 게시판 — 마을 완전 중앙(사용자 지정). 스폰(0,0) 1.9 거리라 시작 시 밀리지 않고
//    (콜라이더 1.57 밖) 프롬프트도 안 뜨게 상호작용 반경은 1.8로 타이트하게.
//    여백: 농부(5,4) 4.4 · 공원벤치(-2.2,4.6) 4.6 · 텃밭 게이트(0,7) 5.6 · 랜덤 나무 밴드(r≥8) 밖
//    ⚠️ 스폰보다 남쪽(z+)에 두면 카메라(남→북)와 캐릭터 사이에 끼어 캐릭터를 가림 — 같은 z선상 동쪽으로.
export const RANK = new THREE.Vector3(13.5, 0, 1.5);  // 🏆 랭킹 게시판 — 호수 북쪽 가로등(15,3) 잔디. 한복판(2.4,0.2)에서 옮김(NPC 안 가림·활동 구역 밖·호수 가는 길에 보임). 부두 옆(8.5,9.5)·텃밭 입구 앞(-0.5,10.5)은 비좁아 제외

// 품목 아이콘 — **SELL_PRICE 의 모든 키를 덮어야 한다**(tests/orchard.test.mjs 가 강제).
//   빠진 키가 있으면 📊시세판 월드 텍스처·상인 말풍선·시세판 모달이 문자 그대로 "undefined" 를 그린다.
//   🍎 과수원 과일 아이콘은 js/orchard.js FRUITS[].ico 와 같은 값.
export const SELL_ICO_G = { charcoal: '⚫', flour: '🌾', brick: '🧱', bread: '🥐', juice: '🍷', grape_juice: '🍹', crop: '🥕', fish: '🐟', wood: '🪵', stone: '🪨', coal: '⚫', gem: '💎', egg: '🥚', bug: '🌟', forage: '🍄', wheat: '🌾', corn: '🌽', grape: '🍇', honey: '🍯',
                     apple: '🍎', pear: '🍐', peach: '🍑', persimmon: '🍊', chestnut: '🌰' };

export const FARM = new THREE.Vector3(0, 0, 84);       // 개인 텃밭 필드(마을 밖 별도 공간)

export const FARM_GATE = new THREE.Vector3(0, 0, 7);   // 마을 안 텃밭 입구 게이트

export const MINE = new THREE.Vector3(0, 0, 250);      // 채굴 동굴(다른 공간과 멀찍이)

export const MINE_HALF = 12;                           // 넓은 동굴

export const MINE_GATE = new THREE.Vector3(-14, 0, 3); // 마을 서쪽 동굴 입구

// 🌉 낚시 부두 — 호수 서쪽 물가에서 안쪽으로 뻗음. 물은 못 들어가고 부두 위만 걸을 수 있음
export const PIER = { x1: 9.6, x2: 13.4, z1: 8.25, z2: 9.75 };

export function onPier(p) { return p.x > PIER.x1 - 0.5 && p.x < PIER.x2 && p.z > PIER.z1 && p.z < PIER.z2; }

// 🐔 닭장(남쪽 필드) — 🔥 2일 연속 출석으로 해금(신규 유저도 이틀째에 도달, 초반 리텐션 훅). 매일 모이(씨앗 2) → 다음날 🥚 달걀 2개
export const COOP_STREAK = 2;                          // 해금에 필요한 연속 출석 일수

export const COOP = new THREE.Vector3(-4.5, 0, 11.5); // 텃밭 입구 남서쪽 트인 목 — 나무에 안 가리는 자리(초보 발견성)

// 공원 벤치 [x, z, 회전] — 마을 중심부 트인 자리(랜덤 나무 밴드 r8~30을 피하거나 나무 회피 목록으로 보호)
export const PARK_BENCHES = [[-2.2, 4.6, 0.3], [6.5, 6.5, -1.1]];

export const COOP_COST = { wood: 25, stone: 10, coins: 60 };

export const COOP_FEED = 2;                            // 모이(씨앗) 소비량

//    마을 불빛에서 떨어뜨려 배치(어두울수록 잘 보임). 낮에만 하던 플레이에 "밤에 다시 올 이유"를 만듦.
export const GLADE = new THREE.Vector3(7, 0, 26);      // 계곡 중심(남동쪽 숲) — ☕카페·🍄채집 숲과 안 겹치게

export const GLADE_R = 7;                              // 반딧불이가 떠다니는 반경

//   밤 판정 기준 NIGHT_MIN 은 js/daynight.js — 🛏️ 자기 기능과 같은 기준을 써야 한다
// 종류 — p는 누적 확률(FISH_KINDS 와 동일 규칙: roll <= p 인 첫 항목)
export const BUG_KINDS = [
  { id: 'rainbow', name: '무지개반디', ico: '🌈', color: 0xffc0f0, p: 0.06 },
  { id: 'green',   name: '초록반디',   ico: '🟢', color: 0xa8ffb0, p: 0.22 },
  { id: 'blue',    name: '푸른반디',   ico: '🔵', color: 0x9ad8ff, p: 0.48 },
  { id: 'yellow',  name: '노랑반디',   ico: '🟡', color: 0xfff2a8, p: 1.00 },
];

//    마을 남쪽 건물로 들어가면 별도의 넓은 홀이 열리고, 그 안에 손님 NPC가 앉아 있다.
//    손님에게 직접 걸어가 요리를 가져다주는 "공간 기반" 의뢰.
//    농사(작물)·낚시(물고기)·닭장(달걀)·채집(버섯)이 전부 "쓸 곳"을 얻어 하나로 엮임.
export const CAFE_GATE = new THREE.Vector3(4, 0, 14);  // 마을 안 카페 건물(입구) — 주민 자리·호수·계곡과 안 겹치는 빈터

export const MUSEUM_GATE = new THREE.Vector3(-26, 0, 5);   // 🏛️ 박물관 — 마을 서쪽 끝, ⛏️채굴 동굴 너머.

//   사용자가 고른 자리다(전체 지도의 "현위치"). 반경 3.4 안에 나무·바위가 없어 지형을 안 깎는다.
//   ⛏️채굴 동굴(-14,3) 에서 12 — 서쪽 벨트의 끝점이라 가는 길에 자연히 지나친다.
export const MUSEUM = new THREE.Vector3(0, 0, 360);    // 🏛️ 전시실(다른 인스턴스 공간과 멀찍이)

export const CAFE = new THREE.Vector3(0, 0, 320);      // 카페 홀(다른 인스턴스 공간과 멀찍이)

export const CAFE_HALF = 11;                           // 넓은 홀 반경

export const CAFE_ORDERS = 4;                          // 하루 손님 수

export const CAFE_BONUS = 60;                          // 손님 전원 서빙 시 보너스 코인

export const CAFE_SEATS = [[-6, -3.5], [6, -3.5], [-6, 4.5], [6, 4.5]];   // 홀 안 테이블 좌석(홀 로컬 좌표)

export const CAFE_BOARD = [6.6, -7.9];                 // 📋 주문판(칠판) — 카운터 옆(동선상 눈에 띄게)

//    왜 따로 만들었나: 예전엔 손님을 마을 주민에서 뽑았는데, 주민 6명 중 5명이 후보이고
//    하루 손님은 4명이라 마을 인구의 80%가 매일 카페에 복제됐다. 밖에 서 있는 🧙방랑 상인이
//    카페에도 앉아 있는 게 눈에 띈 게 그 증상이다. 주민을 마을에서 빼는 방식은 퀘스트·상점
//    NPC 가 사라져 진행이 막히므로, 손님을 아예 별도 캐스트로 갈랐다.
//    acc(소품) + ear(귀 모양) + color 세 가지로 실루엣을 가른다 — 이름표를 못 읽는 거리에서도 구분되게.
//    ⚠️ 플레이어가 고르는 동물(여우·강아지·토끼·고양이·곰·판다·병아리)과 마을 주민은 **피해서** 뽑았다 —
//       내가 여우인데 손님도 여우면 "또 겹쳤다"는 똑같은 인상을 준다.
export const CAFE_GUESTS = [
  { id: 'guest_deer',     name: '숲길 사슴',       emoji: '🦌', color: 0xd9a86a, hat: 0x7a5f3c, ear: 'round', acc: 'antler' },
  { id: 'guest_otter',    name: '강가 수달',       emoji: '🦦', color: 0x6fa8c9, hat: 0xf0e0c0, ear: 'tiny',  acc: 'ribbon' },
  { id: 'guest_hedgehog', name: '가시 고슴도치',   emoji: '🦔', color: 0xa08fb8, hat: 0x5a4d6a, ear: 'tiny',  acc: 'spike' },
  { id: 'guest_squirrel', name: '부지런한 다람쥐', emoji: '🐿️', color: 0xe08a4a, hat: 0xf0c86a, ear: 'round', acc: 'flower' },
  { id: 'guest_raccoon',  name: '야행성 너구리',   emoji: '🦝', color: 0x7d8794, hat: 0xc96a5a, ear: 'point', acc: 'scarf' },
  { id: 'guest_frog',     name: '빗소리 개구리',   emoji: '🐸', color: 0x7ec96a, hat: 0x3a4a3a, ear: 'tiny',  acc: 'glasses' },
  { id: 'guest_turtle',   name: '느긋한 거북',     emoji: '🐢', color: 0x4fa890, hat: 0xe8a07a, ear: 'tiny',  acc: 'beanie' },
  { id: 'guest_beaver',   name: '댐 짓는 비버',    emoji: '🦫', color: 0xb06a4a, hat: 0x8a9ab0, ear: 'round', acc: 'cap' },
];

export const cafeGuestDef = (id) => CAFE_GUESTS.find(g => g.id === id) || null;

//    씨앗·물주기 없이 "돌아다니며 발견"하는 재미. 🌧️ 비 온 날엔 버섯이 유독 잘 나옴(날씨 연동)
export const FOREST = new THREE.Vector3(-18, 0, 23);   // 남서쪽 — 🌟계곡과 중심거리 25.2(나무 링까지 4.0 여유)

export const FOREST_R = 9;

// 🪵 바닥에 누운 통나무 [숲 기준 x, z, 회전] — 굵기 0.34, 길이 2.6
export const FOREST_LOGS = [[-3.2, -1.4, 0.6], [2.8, 2.2, -0.9], [0.4, -4.2, 1.9]];

export const FOREST_LOG_R = 0.45;                      // 🚧 통나무 충돌 반경(굵기 + 캐릭터가 파묻히지 않을 여유)

// 누운 통나무는 회전이 제각각이라 축정렬 사각으로 못 막는다 — 축을 따라 원을 늘어놓아 캡슐처럼 막는다.
//   rotation(0, ry, π/2) 이면 통나무 축은 월드 XZ 에서 (-cos ry, sin ry).
export const FOREST_LOG_SPOTS = FOREST_LOGS.flatMap(([lx, lz, ry]) =>
  [-0.85, -0.425, 0, 0.425, 0.85].map(t => ({ x: FOREST.x + lx - Math.cos(ry) * t, z: FOREST.z + lz + Math.sin(ry) * t })));

export const FORAGE_RESPAWN = [55, 110];               // 채집 후 다시 돋기까지(초) 최소~최대

// p는 누적 확률(FISH_KINDS 규칙과 동일). give 는 획득 자원
export const FORAGE_KINDS = [
  { id: 'herb',     name: '숲 약초',   ico: '🌿', p: 0.12, give: { forage: 2 },          color: 0x7fd6a0 },
  { id: 'acorn',    name: '도토리',    ico: '🌰', p: 0.38, give: { forage: 1, seed: 2 }, color: 0xc99a5a },
  { id: 'berry',    name: '산딸기',    ico: '🫐', p: 0.66, give: { forage: 1, crop: 1 }, color: 0x8a7ad0 },
  { id: 'mushroom', name: '숲 버섯',   ico: '🍄', p: 1.00, give: { forage: 1 },          color: 0xe0705a },
];

//    마을 북쪽 선착장에서 강 공간(별도 인스턴스)으로 이동 → 나룻배 1인칭.
//    배는 자동으로 하류(-z)로 흘러가고 플레이어는 좌우 조향 + 노 젓기(스퍼트)만 한다.
//    ※ 코스는 "날짜+회차" 시드로 결정 — 새로고침 리롤이 안 되고, 그날 모두가 같은 코스라
//      로그에서 유저 간 실력 비교가 가능하다(난이도 튜닝·이탈 지점 분석의 전제).
export const DOCK_GATE = new THREE.Vector3(0, 0, -15);   // 마을 12시 방향 선착장(빈 땅)

export const DOCK_POND = new THREE.Vector3(0, 0, -21.5); // 나루터 앞 물가 — 마을 호수처럼 둥근 모양

export const DOCK_POND_R = 7;                            // 연못 반경(나무·꽃 배치와 물 진입 차단의 기준)

export const RIVER = new THREE.Vector3(0, 0, -400);      // 강 공간(다른 인스턴스와 멀찍이)

export const RIVER_DOCK_HALF = 6;                        // 상류 나루터(걸어 다니는 데크) 반경

export const RIVER_W = 6.4;                              // 강폭 절반 — 배 좌우 이동 한계

export const RIVER_LEN = 620;                            // 코스 길이(월드 단위) ≈ 60초

export const BOAT_RUNS_PER_DAY = 3;                      // 하루 무료 횟수(리텐션 훅 + 보상 인플레 방지)

export const BOAT_LAMPS = 3;                             // 기본 램프(충돌 허용 횟수) — 선체 업그레이드로 +1씩

export const BOAT_BASE_SPEED = 9.5;                      // 시작 속도(구간이 진행될수록 가속)

export const BOAT_BOOST_CD = 3.2;                        // 노 젓기(스퍼트) 재사용 대기(초)

// 장애물 — r: 좌우 반폭(충돌 판정), hit: 램프를 깎는지(소용돌이는 안 깎고 밀기만)
export const RIVER_OBS = {
  rock:  { r: 1.15, hit: true },   // 🪨 바위
  log:   { r: 2.0,  hit: true },   // 🪵 떠내려온 통나무(넓음, 좌우로 천천히 흐름)
  pile:  { r: 0.75, hit: true },   // 🪧 다리 기둥(좁은 문을 만듦 — 쌍으로 배치)
  whirl: { r: 1.7,  hit: false },  // 🌀 소용돌이 — 안 아프지만 배를 끌어당김
};

// 강에서만 나오는 수집물(📖 도감 river 4종) — ⭐별조각은 화폐라 도감에 없음
export const RIVER_PICKS = [
  { id: 'lotus',     name: '물 위 연꽃',    ico: '🪷', give: { seed: 2 },          color: 0xffb6d5 },
  { id: 'driftwood', name: '떠내려온 나무', ico: '🪵', give: { wood: 2 },          color: 0xc09068 },
  { id: 'shell',     name: '강 조개',       ico: '🐚', give: { star: 2 },          color: 0xffe6c0 },
  { id: 'moon_fish', name: '달빛 물고기',   ico: '🌕', give: { fish: 2, star: 3 }, color: 0xdfe9ff, night: true },  // 🌙 밤에만
];

// 🧰 뱃사공의 창고 — ⭐별조각 + 🪙코인으로 배를 강화(후반 코인 싱크)
export const BOAT_UPGRADES = [
  { id: 'oar',  name: '튼튼한 노',   ico: '🚣', max: 2, desc: '좌우로 더 빠르게 피할 수 있어요',
    cost: [{ star: 8, coins: 80 }, { star: 16, coins: 180 }] },
  { id: 'hull', name: '단단한 선체', ico: '🛶', max: 2, desc: '💡램프 +1 (충돌을 한 번 더 버텨요)',
    cost: [{ star: 12, coins: 120 }, { star: 22, coins: 260 }] },
  { id: 'lamp', name: '뱃머리 등불', ico: '🏮', max: 1, desc: '🌙밤에도 앞이 환하고 밤 보상 +20%',
    cost: [{ star: 10, coins: 100 }] },
];

// 🏪 꾸미기 가게 — 마을 서쪽, 집터(-8,-8)와 ⛏️동굴 입구(-14,3) 사이 빈터.
//    중심에서 18.0 이라 나무 링(r8~30) 한복판이다 — 나무·꽃 산포 제외 목록에 **반드시** 들어가야 한다.
//    정면은 +Z 라 회전하지 않는다(카메라 시선이 늘 −Z).
export const SHOP_POS = new THREE.Vector3(-17.5, 0, -4);

//  🎀 가게 앞(정면 +Z) 판정점 — 콜라이더가 2.4 라 중심 기준으론 가까이 갈 수가 없다.
//     문 쪽으로 2.0 내밀어 **앞에 섰을 때만** 잡히게 한다(옆·뒤는 2.8 밖).
export const SHOP_DOOR = new THREE.Vector3(SHOP_POS.x, 0, SHOP_POS.z + 2.0);

//    처음부터 있는 장소(카페·채굴장 문법). 게이트 → 별도 인스턴스, 숲 안은 항상 어둑+짙은 안개.
//    그림자 정령이 수호목의 빛을 갉아먹으러 다가오고, 플레이어는 등불을 켜(감속) ♪리듬 탭으로
//    달랜다(성불). 웨이브 3회를 버티면 그날 하루 정화 — 매일 리셋되는 데일리 루프.
export const MIST_GATE = new THREE.Vector3(-17, 0, -17);   // 마을 북서(집 뒤편 어두운 숲) — 집터(-8,-8)와 7→12.7 로 띄움(베타: 집 바로 옆이라 답답)

export const MIST = new THREE.Vector3(0, 0, -250);         // 숲 인스턴스(다른 공간과 멀찍이)

export const MIST_HALF = 13;

export const MIST_WAVES = [3, 4, 5];                       // 웨이브별 정령 수(🌫️안개 날 +1)

export const TREE_LIGHT_MAX = 100;                         // 수호목 빛 — 0이 되면 부드러운 실패

export const MIST_DRAIN = 4;                               // 수호목에 붙은 정령 1마리당 빛 감소량(/초)

export const SOOTHE_GLOW = 2;                              // 달래기 성공 보상 ✨(황금 정령은 2배)

export const PURIFY_GLOW = 6;                              // 정화 완료 보너스 ✨

// 그림자 정령 종류 — 📖 도감 spirit 카테고리와 1:1. golden 은 🌫️안개 날에만
export const SPIRITS = [
  { id: 'shy',      name: '수줍은 정령',   ico: '🟣', color: 0x8a6cc9, speed: 0.5,  size: 0.3 },
  { id: 'sleepy',   name: '졸린 정령',     ico: '🔵', color: 0x5a6cc0, speed: 0.38, size: 0.36 },
  { id: 'mischief', name: '장난꾸러기 정령', ico: '🟠', color: 0xc06a9a, speed: 0.72, size: 0.26 },
  { id: 'golden',   name: '황금 정령',     ico: '🌟', color: 0xe0b34a, speed: 0.62, size: 0.32, fog: true },
];

// 둘레 등불 6개(숲 로컬 좌표) — 수호목(중앙)으로 오는 길목마다 하나씩
export const MIST_LANTERN_POS = [[-7, -7], [7, -7], [-9.5, 1], [9.5, 1], [-5.5, 8], [5.5, 8]];

export const LANTERN_CALM_R = 4.5;                         // 켜진 등불 주변: 정령 감속 반경

// 🎓 연습 모드 4단계(컨텍스트 슬롯) — "웨이브가 뭐예요?"(2026-09-07) 후속. 정령 1마리·빛 안 줄어듦·보상/도감/일일 기록 없음
export const MIST_PRACTICE_STEPS = [
  '① 🏮 꺼진 등불 앞에서 버튼 — 켜진 등불 근처에선 정령이 느려져요',
  '② 🟣 정령 곁으로 걸어가 버튼 — ♪가 나타나요',
  '③ ♪가 가장 작아지는 순간 탭 ×3 — 놓쳐도 괜찮아요, 엇박만 조심',
  '④ 잘했어요! 이제 정령 세 무리에 도전해요',
];

export const SEA_GATE = new THREE.Vector3(14.5, 0, -12.5);   // 마을 북동(빈 사분면) — 호수·나루터와 안 겹침

export const SEA_COVE = { x: SEA_GATE.x + 9.5, z: SEA_GATE.z - 9, r: 12 };  // 포구 앞 후미(만) — 게이트 너머로 보이는 진짜 바다

export const SEA = new THREE.Vector3(400, 0, 0);             // 바다 인스턴스 — 다른 공간이 전부 x=0 축이라 동쪽으로 뺌

export const ORCHARD_GATE = new THREE.Vector3(32, 0, 2);   // 🍎 마을 정동쪽 — 여덟 방향 중 유일하게 빈 자리(스펙 §1).

// 🔒 문 앞 프롬프트 반경 — **잠금 충돌체를 넘어서야 한다**. 잠겼을 때 문을 막는 원은
//   (문 앞 0.45, 반경 1.5)라 남쪽에서 다가설 수 있는 한계가 0.45+1.5+PLAYER_R(0.42)=2.37 이다.
//   예전 값 2.2 는 그 한계보다 작아, 잠긴 동안에는 해금 안내("🌾고급 작물을 한 번 거두면 열려요")가
//   한 번도 뜨지 못했다 — 유저는 무엇을 하면 열리는지 알 길이 없었다(🏛️ 박물관 계단 STAIR_PROMPT_R 과 같은 교훈).
export const ORCHARD_PROMPT_R = 2.8;

//   x=22 였을 때 언덕길 계단이 호수(LAKE 16,9 · 반경 6)를 덮어 32 로 밀었다. 동쪽은 x>18 에 고정물이 없다.
export const ORCHARD = new THREE.Vector3(0, 0, 160);       // 과수원 인스턴스 — 텃밭(84)과 광산(250) 사이

export const ORCHARD_HALF = 20;                            // 언덕 반경

export const SEA_DECK_W = 3.4, SEA_DECK_Z0 = 4, SEA_DECK_Z1 = -10;   // 부두(로컬 z): 뭍(+z) → 끝(-z)

export const SEA_EDGE = SEA_DECK_Z1 + 0.55;                  // 이 선을 넘게 끌려가면 놓침

// 어종 티어 = 난이도(선택 UI 없음 — 뭘 노리느냐가 난이도).
//   drag(끌려가는 속도)·win(당길 기회 배율)·tap(연타 1회 진행)·w(무게 kg)·give(보상)
export const SEA_SPECIES = [
  { id: 'aji',  name: '전갱이', ico: '🐟', scale: 0.62, color: 0x6f8fa8, drag: 0.45, win: 1.35, tap: 0.060, w: [1, 3],    give: { fish: 1, coins: 4 },  daylight: true },
  { id: 'buri', name: '방어',   ico: '🐠', scale: 0.92, color: 0x4a6f8f, drag: 0.72, win: 1.05, tap: 0.042, w: [6, 14],   give: { fish: 2, coins: 8 } },
  { id: 'mola', name: '개복치', ico: '🐡', scale: 1.35, color: 0x7a8896, drag: 0.50, win: 1.10, tap: 0.020, w: [40, 90],  give: { fish: 2, coins: 14 }, night: true, sunfish: true },
  { id: 'tuna', name: '참치',   ico: '⚔️', scale: 1.15, color: 0x33628f, drag: 0.95, win: 0.90, tap: 0.032, w: [60, 120], give: { fish: 3, coins: 24 }, daily: true },
];

export const ROOF_COLORS = [0xb5734a, 0xd05a5a, 0x5a86d0, 0x5aa86a, 0x9a6ad0];  // 갈색·빨강·파랑·초록·보라

export const WALL_COLORS = [0xd2a068, 0xe8c99a, 0xa9805a, 0xc9c0aa, 0xe0b0b0];  // 기본·밝은나무·진한나무·회벽·핑크

export const DOOR_COLORS = [0xa9743f, 0x8a5a3a, 0x5a6a8a, 0x5a8a6a, 0xd0a050];  // 갈색·진갈·파랑·초록·황금

export const PART_NAME = { roof: '지붕', wall: '벽', door: '문' };

export const HOUSE_POS = new THREE.Vector3(-8, 0, -8); // 정해진 집 터 위치
