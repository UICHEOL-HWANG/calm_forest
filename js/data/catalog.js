// =============================================================
//  📦 가구·요리·버프·시세·상점·업그레이드·야외 장식·가공 시설
//  ------------------------------------------------------------
//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).
//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.
//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md
// =============================================================
import { FARM_BUILDINGS } from '../farm-building.js';
import { BENCH, KITCHEN, SHOP, MARKET, RANK, FARM_GATE, MINE_GATE, COOP, CAFE_GATE, MUSEUM_GATE } from './places.js';
import { NPCS } from './npcs.js';
import { STATIONS } from '../craft/recipes.js';

// 🛋️ 가구 배율 — 14×14 방에 비해 가구가 너무 작아 꾸미기가 허전하다는 베타 피드백(2026-09-09).
//    decorMesh() 안쪽 그룹에만 곱하고 바깥 그룹은 1 로 둔다(등장 팝 애니메이션이 바깥 scale 을 0.01→1 로 쓴다).
export const DECOR_SCALE = 1.5;

//   foot: [가로, 세로] — 밟고 못 지나가는 발자국(배율 전, decorMesh 치수 기준). 러그류는 밟고 지나가므로 없음.
//   "가구를 그냥 통과한다"는 베타 피드백 → 배치 시 solidBox 로 막는다(놓은 방향에 따라 가로·세로를 바꿈).
export const DECOR = [
  { id: 'rug',      name: '러그',   ico: '🎨', cost: 2, pay: 'crop' },
  { id: 'plant',    name: '화분',   ico: '🪴', cost: 2, pay: 'crop', foot: [0.45, 0.45] },
  { id: 'chair',    name: '의자',   ico: '🪑', cost: 3, pay: 'crop', foot: [0.55, 0.55] },
  { id: 'table',    name: '테이블', ico: '🟫', cost: 3, pay: 'crop', foot: [1.1, 0.7] },
  { id: 'lamp',     name: '램프',   ico: '🕯️', cost: 4, pay: 'crop', foot: [0.4, 0.4] },
  { id: 'sofa',     name: '소파',   ico: '🛋️', cost: 5, pay: 'crop', foot: [1.6, 0.75] },
  { id: 'aquarium', name: '어항',   ico: '🐟', cost: 2, pay: 'fish', foot: [0.66, 0.42] }, // 물고기로 구매
  // ── 큰 가구(사이즈 大) ──
  { id: 'bed',       name: '침대',    ico: '🛏️', cost: 8,  pay: 'crop', big: true, foot: [1.5, 2.2] },
  { id: 'bigtable',  name: '큰 식탁', ico: '🍽️', cost: 8,  pay: 'crop', big: true, foot: [1.8, 1.0] },
  { id: 'bigsofa',   name: '큰 소파', ico: '🛋️', cost: 10, pay: 'crop', big: true, foot: [2.4, 0.95] },
  { id: 'bookshelf', name: '책장',    ico: '📚', cost: 9,  pay: 'crop', big: true, foot: [1.3, 0.45] },
  { id: 'bigrug',    name: '큰 러그', ico: '🟪', cost: 6,  pay: 'crop', big: true },
  // ── 2026-09-09 추가 9종(베타: "가구 종류가 적다") ──
  { id: 'stool',       name: '스툴',     ico: '🟤', cost: 2,  pay: 'crop', foot: [0.45, 0.45] },
  { id: 'vase',        name: '꽃병',     ico: '🌷', cost: 2,  pay: 'crop', foot: [0.3, 0.3] },
  { id: 'nightstand',  name: '협탁',     ico: '🗄️', cost: 3,  pay: 'crop', foot: [0.5, 0.45] },
  { id: 'cushion',     name: '바닥 쿠션', ico: '🟠', cost: 3,  pay: 'crop' },                       // 밟고 지나감
  { id: 'radio',       name: '라디오',   ico: '📻', cost: 4,  pay: 'crop', foot: [0.5, 0.25] },
  { id: 'wardrobe',    name: '옷장',     ico: '🧥', cost: 9,  pay: 'crop', big: true, foot: [1.2, 0.5] },
  { id: 'fireplace',   name: '벽난로',   ico: '🔥', cost: 12, pay: 'crop', big: true, foot: [1.4, 0.6] },
  { id: 'piano',       name: '피아노',   ico: '🎹', cost: 12, pay: 'crop', big: true, foot: [1.4, 1.1] },
  { id: 'bigaquarium', name: '큰 어항',  ico: '🐠', cost: 5,  pay: 'fish', big: true, foot: [1.3, 0.6] },
  // 🏠 층별 해금 고급 가구 — 코인 전용(후반 싱크). stage = 증축 단계 해금, outdoorOnly = 루프탑에만.
  { id: 'rocker',    name: '흔들의자',   ico: '🪑', cost: 120, pay: 'coins', stage: 4, foot: [0.7, 0.8] },
  { id: 'telescope', name: '망원경',     ico: '🔭', cost: 150, pay: 'coins', stage: 4, foot: [0.6, 0.6] },
  { id: 'trunk',     name: '여행 트렁크', ico: '🧳', cost: 180, pay: 'coins', stage: 4, foot: [0.9, 0.55] },
  { id: 'bathtub',   name: '욕조',       ico: '🛁', cost: 250, pay: 'coins', stage: 5, big: true, foot: [1.6, 0.8] },
  { id: 'bigart',    name: '큰 그림',    ico: '🖼️', cost: 280, pay: 'coins', stage: 5, foot: [1.2, 0.2] },
  { id: 'chandelier', name: '샹들리에',  ico: '💠', cost: 300, pay: 'coins', stage: 5 },
  { id: 'grandpiano', name: '그랜드 피아노', ico: '🎹', cost: 400, pay: 'coins', stage: 5, big: true, foot: [2.0, 1.6] },
  { id: 'firepit',   name: '파이어핏',   ico: '🔥', cost: 500, pay: 'coins', stage: 6, outdoorOnly: true, foot: [0.9, 0.9] },
  { id: 'planttree', name: '큰 화분나무', ico: '🌿', cost: 700, pay: 'coins', stage: 6, outdoorOnly: true, foot: [0.8, 0.8] },
  { id: 'jacuzzi',   name: '자쿠지',     ico: '♨️', cost: 900, pay: 'coins', stage: 6, outdoorOnly: true, big: true, foot: [2.0, 1.6] },
  // 🏖️ 옥상 파라솔 세트 승계(§8.2) — 구성품(js/house/addons.js rooftop_set, 900🪙)을 이미 산 사람에게
  // 루프탑에 실물로 놓아 준다. 상점엔 안 뜬다(hidden) · 값은 이미 치렀으므로 cost: 0.
  { id: 'parasol_set', name: '파라솔 세트', ico: '🏖️', cost: 0, pay: 'coins', stage: 6, outdoorOnly: true, hidden: true, foot: [1.8, 1.2] },
];

export const FISH_KINDS = [
  { rarity: 'rare',     name: '무지개 물고기', p: 0.07 },
  { rarity: 'uncommon', name: '붉은 물고기',   p: 0.28 },
  { rarity: 'common',   name: '피라미',        p: 1.00 },
];

//    "다양성이 적다"는 피드백에 종류를 늘리되, 넷이 서로 **다른 실패의 모습**을 갖게 갈랐다.
//    같은 탭이라도 무엇을 망쳤는지가 눈에 달라 보여야 다른 게임으로 느껴진다.
export const COOK_MG = {
  pot:    { ico: '🍲', name: '끓이기',    tip: '바늘이 초록 구간에 올 때 누르세요' },
  chop:   { ico: '🔪', name: '썰기',      tip: '재료가 칼 아래 올 때 박자에 맞춰 누르세요' },
  grill:  { ico: '🔥', name: '굽기',      tip: '노릇해졌을 때 눌러 뒤집으세요 — 지나치면 탑니다' },
  season: { ico: '🧂', name: '간 맞추기', tip: '꾹 누르고 있다가 목표선에서 손을 떼세요' },
};

// 코스 난이도(★) → 단계별 판정창 배율. **난이도는 오직 이 배율로만** 조절한다
//   (속도·단계 수까지 같이 흔들면 어느 쪽이 어려웠는지 지표로 가를 수 없다).
//   ★1 은 개편 전(1.0)보다 넉넉한 1.35 — "너무 어렵다"는 피드백의 직접적인 답.
//   코스 뒤로 갈수록 좁아지는 것이 곧 "단계별로 난이도가 올라간다".
export const COURSE_MULT = { 1: [1.35], 2: [1.15, 1.0], 3: [1.05, 0.95, 0.85] };

// 코스 점수 가중치 — 뒤 단계일수록 무겁게(마지막 한 판을 잘해야 최고 등급)
export const COURSE_WEIGHT = { 1: [1], 2: [0.85, 1.15], 3: [0.8, 1.0, 1.2] };

//    stages: 순서대로 치르는 미니게임(길이 = 난이도 ★). diff 는 stages.length 와 항상 같다.
export const RECIPES = [
  // ★1 — 한 판짜리 입문. 네 미니게임을 하나씩 맡아 처음 만나는 자리가 된다
  { id: 'veg_stew',      name: '든든한 채소죽',   ico: '🥘', cost: { crop: 3 },                      buff: 'speed', dur: 60,  desc: '60초 이동속도 +40%',        stages: ['pot'] },
  { id: 'mushroom_soup', name: '숲의 버섯 스프',  ico: '🍄', cost: { forage: 3 },                    buff: 'speed', dur: 90,  desc: '90초 이동속도 +40%',        stages: ['pot'] },      // 🍄 채집 숲 재료
  { id: 'rice_ball',     name: '소금 주먹밥',     ico: '🍙', cost: { crop: 2 },                      buff: 'chop',  dur: 60,  desc: '60초 벌목 시 목재 +1',      stages: ['season'] },   // 🧂 간 맞추기 입문
  { id: 'baked_yam',     name: '군고구마',        ico: '🍠', cost: { forage: 2, crop: 1 },           buff: 'mine',  dur: 60,  desc: '60초 채굴 시 광석 추가 확률↑', stages: ['grill'] },   // 🔥 굽기 입문
  { id: 'herb_salad',    name: '들나물 무침',     ico: '🥗', cost: { forage: 2, crop: 1 },           buff: 'luck',  dur: 60,  desc: '60초 희귀 물고기 확률↑',    stages: ['chop'] },     // 🔪 썰기 입문
  // ★2 — 두 판. 손질 → 조리처럼 "차례가 있는" 요리
  { id: 'grilled_fish',  name: '생선 구이',       ico: '🐟', cost: { fish: 2 },                      buff: 'luck',  dur: 90,  desc: '90초 희귀 물고기 확률↑',    stages: ['chop', 'grill'] },
  { id: 'omelette',      name: '푸짐한 오믈렛',   ico: '🍳', cost: { egg: 2, crop: 1 },              buff: 'mine',  dur: 90,  desc: '90초 채굴 시 광석 추가 확률↑', stages: ['pot', 'season'] }, // 🥚 닭장 달걀 요리
  // 🥐 화덕에서 밤새 빻은 밀가루가 있어야 만든다 — 화덕이 요리를 대체하지 않고 **입구**가 된다.
  //    ★2 인데 지속이 ★3급(150초)인 건 하룻밤을 기다린 값을 여기서 돌려주는 것이다.
  { id: 'bread',         name: '갓 구운 빵',      ico: '🥐', cost: { flour: 2 },                     buff: 'speed', dur: 150, desc: '150초 이동속도 +40%',       stages: ['pot', 'grill'] },
  // 🍹 발효통에서 밤새 익은 🍷포도즙을 잔에 따라 낸다 — 🫙 가 요리를 대체하지 않고 **입구**가 된다(빵과 같은 규칙).
  //    ★2 인데 재료가 한 개뿐인 건 하룻밤을 기다린 값을 여기서 돌려주는 것이다.
  { id: 'grape_juice',   name: '포도주스',        ico: '🍹', cost: { juice: 1 },                     buff: 'luck',  dur: 120, desc: '120초 희귀 물고기 확률↑',   stages: ['chop', 'season'] },
  // ★3 — 세 판 풀코스. 재료도 버프도 가장 크다
  { id: 'lunchbox',      name: '모둠 도시락',     ico: '🍱', cost: { crop: 2, fish: 1, forage: 1 },  buff: 'chop',  dur: 150, desc: '150초 벌목 시 목재 +1',     stages: ['chop', 'pot', 'season'] },
  { id: 'forest_feast',  name: '숲의 한상차림',   ico: '🍲', cost: { forage: 2, crop: 2, fish: 1 },  buff: 'luck',  dur: 180, desc: '180초 희귀 물고기 확률↑',   stages: ['chop', 'grill', 'pot'] },
];

export function recipeDiff(r) { return Math.min(3, Math.max(1, r.stages.length)); }   // ★ 등급 = 코스 길이

// ☕ 카페 서빙 단가 — 재료 원가(시세 기준)보다 넉넉해 "요리해서 파는" 동선이 이득이 되게.
//    ★ 가 오를수록 판을 더 치르니 단가도 같이 오른다(★1 ~30 · ★2 ~46 · ★3 ~74)
export const CAFE_PAY = { bread: 56, grape_juice: 62, veg_stew: 30, mushroom_soup: 32, rice_ball: 28, baked_yam: 30, herb_salad: 31, grilled_fish: 46, omelette: 48, lunchbox: 74, forest_feast: 78 };

// 버프 메타 — desc는 초보자용 설명(첫 획득 모달·칩 클릭 모달에 표시)
export const BUFF_META = {
  speed: { ico: '👟', name: '빠른 발',     desc: '이동 속도가 40% 빨라져요. 넓은 마을과 텃밭·동굴을 오갈 때 시간을 아껴줘요.' },
  luck:  { ico: '🍀', name: '낚시 행운',   desc: '낚시할 때 희귀 물고기(🐠 붉은 물고기·🌈 무지개 물고기)가 잡힐 확률이 올라가요. 호수 부두에서 낚싯대(7번)로 낚아보세요!' },
  chop:  { ico: '🪓', name: '벌목 보너스', desc: '나무를 쓰러뜨릴 때마다 목재를 1개 더 받아요. 건축·작업대 재료를 모을 때 딱이에요.' },
  mine:  { ico: '⛏️', name: '광부의 힘',   desc: '동굴에서 채굴할 때 광석(돌·석탄·💎보석)을 더 얻을 확률이 올라가요. 마을 서쪽 동굴 입구로!' },
};

export const stationLabel = (rec) => { const d = OUTDOOR.find(o => o.id === rec.id); return `${d.ico} ${d.name}`; };

// 🔥 가공물(charcoal·flour·brick·bread) — **파는 건 출구 중 가장 나쁜 선택**이 되게 잡았다.
//   밀 4개(60)로 밀가루 평균 3.5개(63)라 팔면 본전이고, 빵으로 구우면 카페에서 56을 받는다.
//   ⚠️ 이 표는 한 줄로 유지한다 — tests/orchard.test.mjs 가 한 줄 정규식으로 파싱한다.
export const SELL_PRICE = { charcoal: 9, flour: 18, brick: 12, bread: 26, juice: 40, crop: 5, fish: 8, wood: 2, stone: 3, coal: 6, gem: 40, egg: 6, bug: 14, forage: 7, wheat: 15, corn: 20, grape: 30, honey: 12, apple: 5, pear: 6, peach: 8, persimmon: 10, chestnut: 12 };   // 기본 판매 단가(코인) — 고급 작물은 js/farm-crops.js price 와 같은 값(3·4·6배), 🍯꿀은 벌통 · 🍎 과수원 과일은 js/orchard.js FRUITS[].price 와 같은 값

export const SHOP_BUY = [
  // 🪙 코인 전용 소모품 — 재료로는 못 얻는 "시간·운"을 판다(첫 구매처, 20~25🪙)
  { id: 'fert1', name: '비료 1개',    ico: '🌱', coin: 20, give: { fert: 1 }, desc: '자라는 작물을 바로 수확 가능하게' },
  { id: 'bait5', name: '미끼 5회분',  ico: '🪱', coin: 25, give: { bait: 5 }, desc: '5번 동안 희귀 물고기 확률↑' },
  // 소모품·재료 번들
  { id: 'seed5',   name: '씨앗 5개',   ico: '🌰', coin: 15,  give: { seed: 5 } },
  { id: 'seed20',  name: '씨앗 20개',  ico: '🌰', coin: 50,  give: { seed: 20 }, desc: '대량 할인' },
  // 🌾 고급 작물 씨앗 — 코인으로만(코인 싱크). 🌰씨앗 도구를 다시 누르면 종류를 고른다. 수확해도 씨앗은 안 돌아온다
  { id: 'seedw3', name: '밀 씨앗 3개',    ico: '🌾', coin: 18, give: { seed_wheat: 3 }, desc: '물 2번 · 잡초가 잦아요 · 🪙15에 팔려요' },
  { id: 'seedc3', name: '옥수수 씨앗 3개', ico: '🌽', coin: 24, give: { seed_corn: 3 },  desc: '물 3번 · 해충이 잘 붙어요 · 🪙20에 팔려요' },
  { id: 'seedg3', name: '포도 씨앗 3개',   ico: '🍇', coin: 36, give: { seed_grape: 3 }, desc: '🍇지지대 옆에만 · 물 3번 · 🪙30에 팔려요' },
  // 🍎 과수원 묘목 — 코인 전용(최대 코인 싱크). 한 번 심으면 영구 자산이라 씨앗보다 훨씬 비싸다
  { id: 'sap_apple',     name: '사과나무 묘목',   ico: '🍎', coin: 90,  give: { sap_apple: 1 },     desc: '3일이면 자라요 · 매일 🍎2개' },
  { id: 'sap_pear',      name: '배나무 묘목',     ico: '🍐', coin: 130, give: { sap_pear: 1 },      desc: '3일이면 자라요 · 매일 🍐2개' },
  { id: 'sap_peach',     name: '복숭아나무 묘목', ico: '🍑', coin: 180, give: { sap_peach: 1 },     desc: '4일이면 자라요 · 매일 🍑2개' },
  { id: 'sap_persimmon', name: '감나무 묘목',     ico: '🍊', coin: 240, give: { sap_persimmon: 1 }, desc: '4일이면 자라요 · 매일 🍊2개' },
  { id: 'sap_chestnut',  name: '밤나무 묘목',     ico: '🌰', coin: 300, give: { sap_chestnut: 1 },  desc: '5일이면 자라요 · 매일 🌰2개' },
  { id: 'wood10',  name: '목재 10개',  ico: '🪵', coin: 24,  give: { wood: 10 }, desc: '건축·제작용' },
  { id: 'stone8',  name: '돌 8개',     ico: '🪨', coin: 30,  give: { stone: 8 }, desc: '돌담·화로용' },
  { id: 'coal4',   name: '석탄 4개',   ico: '⚫', coin: 28,  give: { coal: 4 } },
  // 도구 업그레이드(영구) — 코인으로 바로 구매
  { id: 'buy_axe',   name: '강철 도끼',    ico: '🪓', coin: 120, upgrade: 'axe',   desc: '나무를 2번에 벌목' },
  { id: 'buy_rod',   name: '튼튼한 낚싯대', ico: '🎣', coin: 100, upgrade: 'rod',   desc: '입질 시간 여유↑' },
  { id: 'buy_water', name: '큰 물조리개',   ico: '💧', coin: 90,  upgrade: 'water', desc: '물 한 번에 성장↑' },
  { id: 'buy_hoe',    name: '무쇠 괭이',        ico: '⛏️', coin: 110, upgrade: 'hoe',    desc: '광맥을 한 번 덜 캐도 돼요' },
  { id: 'buy_seed',   name: '넉넉한 씨앗 주머니', ico: '🌰', coin: 80,  upgrade: 'seed',   desc: '기본 씨앗이 가끔 안 줄어요' },
  { id: 'buy_sickle', name: '잘 드는 낫',       ico: '🌾', coin: 150, upgrade: 'sickle', desc: '옆 칸 작물도 함께 거둬요' },   // 효과 대비 싸서 130 → 150
  { id: 'buy_shovel', name: '넓은 삽',          ico: '🪏', coin: 100, upgrade: 'shovel', desc: '빈 밭을 한 번에 메워요' },
  { id: 'buy_hammer', name: '묵직한 망치',      ico: '🔨', coin: 140, upgrade: 'hammer', desc: '건축·증축 목재가 줄어요' },
];

export const UPGRADES = [
  { id: 'axe',   name: '강철 도끼',    ico: '🪓', cost: { wood: 20, crop: 3 }, desc: '나무를 2번에 벌목' },
  { id: 'water', name: '큰 물조리개',  ico: '💧', cost: { wood: 10, crop: 5 }, desc: '물 한 번에 성장↑' },
  { id: 'rod',   name: '튼튼한 낚싯대', ico: '🎣', cost: { wood: 10, fish: 3 }, desc: '입질 시간 여유↑' },
  { id: 'pot',   name: '큰 냄비',      ico: '🍲', cost: { stone: 5, coal: 3 }, desc: '요리 버프 시간 1.5배(채굴)' },
  { id: 'net',   name: '촘촘한 포충망', ico: '🦋', cost: { wood: 12, bug: 2 }, desc: '반딧불이 포획 성공률↑' },   // 🌟 밤 콘텐츠 강화
  // 🔧 신설 5종 — 도구 9종이 전부 같은 3단계 규칙을 따르게(dev/active/tool-tiers/).
  //    효과는 전부 "반복 노동 완화" 다 — 보상량을 늘리면 코인 인플레가 생기는데, 지금은 코인이 남는 게 문제다.
  //   ⚠️ 재료에 ⚫석탄·💎보석을 섞는다 — 목재·돌만으로 만들 수 있으면 후반 플레이어는
  //      코인을 한 푼도 안 내고, 이 기획의 목표인 코인 싱크가 실현되지 않는다(리뷰 지적).
  { id: 'hoe',    name: '무쇠 괭이',        ico: '⛏️', cost: { wood: 15, stone: 8, coal: 2 },  desc: '광맥을 한 번 덜 캐도 돼요' },
  { id: 'seed',   name: '넉넉한 씨앗 주머니', ico: '🌰', cost: { crop: 8, wood: 6, coal: 1 },   desc: '기본 씨앗이 가끔 안 줄어요' },
  { id: 'sickle', name: '잘 드는 낫',       ico: '🌾', cost: { stone: 10, crop: 8, gem: 1 },   desc: '옆 칸 작물도 함께 거둬요' },
  { id: 'shovel', name: '넓은 삽',          ico: '🪏', cost: { wood: 12, stone: 6, coal: 2 },  desc: '빈 밭을 한 번에 메워요' },
  { id: 'hammer', name: '묵직한 망치',      ico: '🔨', cost: { stone: 14, coal: 3, gem: 1 },   desc: '건축·증축 목재가 줄어요' },
];

export const OUTDOOR = [
  { id: 'fence',     name: '울타리',  ico: '🪵', cost: { wood: 3 }, desc: '마당 울타리 · 밭 근처 4개면 밤손님 방어' },
  { id: 'scarecrow', name: '허수아비', ico: '🎃', cost: { wood: 5 }, desc: '밭 근처에 세우면 밤손님을 쫓아요' },
  { id: 'path',      name: '디딤돌',  ico: '🪨', cost: { wood: 1 }, desc: '돌 디딤돌' },
  { id: 'flowerbed', name: '꽃밭',    ico: '🌷', cost: { crop: 2 }, desc: '알록달록 꽃밭' },
  { id: 'postlamp',  name: '정원등',  ico: '🏮', cost: { wood: 4 }, desc: '밤에 빛나는 등' },
  { id: 'stonewall', name: '돌담',    ico: '🧱', cost: { stone: 3 }, desc: '튼튼한 돌담(채굴)' },
  { id: 'brazier',   name: '화로',    ico: '🔥', cost: { stone: 2, coal: 2 }, desc: '밤에 빛나는 화로(채굴)' },
  { id: 'spiritlamp', name: '정령 등불', ico: '✨', cost: { glow: 8, coins: 60 }, desc: '정령빛이 깃든 등불 — 밤에 청록빛(안개 숲)' },
  { id: 'kiln',      name: '화덕',    ico: '🔥', cost: { stone: 20, wood: 15, coins: 150 }, desc: '재료를 걸어두면 다음 날 구워져 있어요 · 한 채에 2칸' },
  { id: 'vat',       name: '발효통',  ico: '🫙', cost: { wood: 25, stone: 10, coins: 200 }, desc: '🍇포도를 밟아 걸어두면 다음 날 🍷포도즙이 돼요 · 한 채에 2칸' },
  ...FARM_BUILDINGS,   // 🏗️ 밭 시설 7종(farm:true, fp:[가로칸,세로칸]) — 같은 배치 문법, 텃밭 안에서만(js/farm-building.js)
];

// 🔥 첫 화덕 자리 — ⛏️채굴장 입구(-14,3) 아래 빈터. 마을 서쪽 동선 위라 오가며 눈에 들어온다.
//    (-6,4) 는 목수 아저씨와 겹쳐 캐릭터 뒤에 가렸다(2026-09-20 실측).
//    한 점에 박으면 그 자리에 나무가 서 있을 때 화덕이 파묻힌다 — 후보 중 **가장 트인 곳**을 고른다.
export const KILN_SPOTS = [[-9.5, 12.5], [-11.5, 9.5], [-13, 8], [-7.5, 14], [-12, 6.4]];   // 채굴장(-14,3)에 붙지 않게 남동쪽 빈터를 앞에 둔다

export const KILN_HOME = KILN_SPOTS[0];                 // 기본값(후보를 못 고를 때)

export const KILN_CLEAR_R = 2.4;                        // 이 반경 안엔 나무가 없어야 한다(화덕 폭 2.03 + 여유)

export function kilnAvoidPoints() {
  return [MINE_GATE, CAFE_GATE, MUSEUM_GATE, FARM_GATE, KITCHEN, BENCH, SHOP, MARKET, RANK, COOP]
    .filter(Boolean)
    .concat(NPCS.map(n => ({ x: n.pos[0], z: n.pos[2] })));   // 주민 자리도 피한다
}

export const KILN_SCALE = 1.35;        // 마을 기준 체감 크기(1.0 은 벤치보다 작게 읽혔다)

// 🔥 화덕·🫙 발효통은 같은 규칙을 쓴다 — 한 채에 2칸, 종류마다 3채까지.
//    마을·텃밭이 가공 시설로 뒤덮이지 않게. 슬롯 상한 6칸도 여기서 나온다
export const STATION_IDS = STATIONS.map(s => s.id);

// 🫙 첫 발효통 자리 — 텃밭 마당 북서쪽(밭 로컬). 밭 위가 아니라 마당이라 파종·물주기를 가로채지 않고,
//    x -12.5 는 밭이 3단계(half 11)까지 커져도 마당 안에 남는다. 🔧자재 작업대(z 2.6)와도 2.6 이상 벌어진다.
export const VAT_HOME_LOCAL = [-12.5, 5.0];

export const FARM_PLACE_MSG = { notFarm: '🏗️ 밭 시설은 텃밭 안에서만 놓을 수 있어요', outside: '🏗️ 울타리 안 밭에 놓아요', yard: '🏗️ 시설 마당은 이미 꽉 찼어요. 울타리 안 밭에 놓아요', plot: '🏗️ 밭 위엔 놓을 수 없어요. 옆 칸으로 옮기거나 🪏삽으로 밭을 없애요', overlap: '🏗️ 다른 시설과 겹쳐요' };

export function isFarmBuilding(id) { return FARM_BUILDINGS.some(d => d.id === id); }

export const OUTDOOR_REACH = 7;   // 조준 가능한 최대 거리 — 화면 끝을 눌러 멀리 놓지 못하게(근접 상호작용 원칙)
