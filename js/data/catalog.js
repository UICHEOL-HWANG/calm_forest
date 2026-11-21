// =============================================================
//  📦 가구·요리·버프·시세·상점·업그레이드·야외 장식·가공 시설
//  ------------------------------------------------------------
//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).
//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.
//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md
// =============================================================
import { FARM_BUILDINGS } from '../farm-building.js';
import { BENCH, KITCHEN, SHOP, MARKET, RANK, FARM_GATE, MINE_GATE, COOP, CAFE_GATE, MUSEUM_GATE, OBSERVATORY_GATE } from './places.js';
import { NPCS } from './npcs.js';
import { STATIONS } from '../craft/recipes.js';
import { REWARD_DECOR } from './reward-decor.js';
import { AFF_FRAMES, AFF_OUTDOOR } from './affinity-decor.js';
import { FORAGE_SELL } from '../forage/logic.js';
import { HOMI_TIERS } from '../forage/homi.js';
import { iconById } from '../icons/index.js';

// 🛋️ 가구 배율 — 14×14 방에 비해 가구가 너무 작아 꾸미기가 허전하다는 베타 피드백(2026-09-09).
//    decorMesh() 안쪽 그룹에만 곱하고 바깥 그룹은 1 로 둔다(등장 팝 애니메이션이 바깥 scale 을 0.01→1 로 쓴다).
export const DECOR_SCALE = 1.5;

//   foot: [가로, 세로] — 밟고 못 지나가는 발자국(배율 전, decorMesh 치수 기준). 러그류는 밟고 지나가므로 없음.
//   "가구를 그냥 통과한다"는 베타 피드백 → 배치 시 solidBox 로 막는다(놓은 방향에 따라 가로·세로를 바꿈).
//   🪔 top: { y, pad } — 소품을 올려놓을 수 있는 상판(y 는 배율 전 윗면 높이, pad 는 [가로, 세로]).
//      sm: true + h — 상판에 올릴 수 있는 작은 소품(h 는 배율 전 높이). 높이를 저장하지 않고 좌표에서 파생시킨다(js/house/surface.js).
//      벽 높이가 3 이라 상판은 낮은 가구만 — 새 상판/소품은 tests/decor-ceiling.test.mjs 가 천장 규칙을 검사한다.
export const DECOR = [
  { id: 'rug',      name: '러그',   ico: '🎨', cost: 2, pay: 'crop' },
  { id: 'plant',    name: '화분',   ico: '🪴', cost: 2, pay: 'crop', foot: [0.45, 0.45], sm: true, h: 0.8 },
  { id: 'chair',    name: '의자',   ico: '🪑', cost: 3, pay: 'crop', foot: [0.55, 0.55] },
  { id: 'table',    name: '테이블', ico: '🟫', cost: 3, pay: 'crop', foot: [1.1, 0.7], top: { y: 0.66, pad: [1.1, 0.7] } },
  { id: 'lamp',     name: '램프',   ico: '🕯️', cost: 4, pay: 'crop', foot: [0.4, 0.4] },
  { id: 'deskLamp', name: '탁상 등불', ico: '🪔', cost: 3, pay: 'crop', foot: [0.28, 0.28], sm: true, h: 0.42 },   // 스탠드 램프는 탁상에 올리면 천장을 뚫는다 → 짧은 등불을 따로 둔다
  { id: 'sofa',     name: '소파',   ico: '🛋️', cost: 5, pay: 'crop', foot: [1.6, 0.75] },
  { id: 'aquarium', name: '어항',   ico: '🐟', cost: 2, pay: 'fish', foot: [0.66, 0.42], sm: true, h: 0.66 }, // 물고기로 구매
  // ── 큰 가구(사이즈 大) ──
  { id: 'bed',       name: '침대',    ico: '🛏️', cost: 8,  pay: 'crop', big: true, foot: [1.5, 2.2] },
  { id: 'bigtable',  name: '큰 식탁', ico: '🍽️', cost: 8,  pay: 'crop', big: true, foot: [1.8, 1.0], top: { y: 0.69, pad: [1.8, 1.0] } },
  { id: 'bigsofa',   name: '큰 소파', ico: '🛋️', cost: 10, pay: 'crop', big: true, foot: [2.4, 0.95] },
  { id: 'bookshelf', name: '책장',    ico: '📚', cost: 9,  pay: 'crop', big: true, foot: [1.3, 0.45] },
  { id: 'bigrug',    name: '큰 러그', ico: '🟪', cost: 6,  pay: 'crop', big: true },
  // ── 2026-09-09 추가 9종(베타: "가구 종류가 적다") ──
  { id: 'stool',       name: '스툴',     ico: '🟤', cost: 2,  pay: 'crop', foot: [0.45, 0.45], top: { y: 0.42, pad: [0.44, 0.44] } },
  { id: 'vase',        name: '꽃병',     ico: '🌷', cost: 2,  pay: 'crop', foot: [0.3, 0.3], sm: true, h: 0.72 },
  { id: 'nightstand',  name: '협탁',     ico: '🗄️', cost: 3,  pay: 'crop', foot: [0.5, 0.45], top: { y: 0.55, pad: [0.5, 0.45] } },
  { id: 'cushion',     name: '바닥 쿠션', ico: '🟠', cost: 3,  pay: 'crop' },                       // 밟고 지나감
  { id: 'radio',       name: '라디오',   ico: '📻', cost: 4,  pay: 'crop', foot: [0.5, 0.25], sm: true, h: 0.6 },
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
  // 🎃 할로윈 한정 코인 장식(SALE_WINDOWS.halloween) — 사면 영구, 기간 밖엔 안 산 사람에겐 목록에서 숨는다(보관분은 계속 보임). 집 단계 제한 없음 — 가격만 문턱
  { id: 'ghostCandle',   name: '유령 촛불', ico: '👻', cost: 150, pay: 'coins', sale: 'halloween', foot: [0.3, 0.3], sm: true, h: 0.5 },
  { id: 'miniGrave',     name: '미니 묘비', ico: '🪦', cost: 200, pay: 'coins', sale: 'halloween', foot: [0.5, 0.3] },
  { id: 'witchCauldron', name: '마녀 솥',   ico: '🧙', cost: 450, pay: 'coins', sale: 'halloween', big: true, foot: [1.0, 1.0] },
  // 🌙 꿈 장식 — ✨ 꿈 조각(꿈의 숲, 하루 7개)으로만 산다. 꿈을 한 번 꾼 뒤에야 목록에 보인다(dream: true · game.js getDecor)
  //    조형 js/dream/decor-art.js · 총 45조각 ≈ 7밤 · ☁️ 구름 침대는 sleep: true 라 밤에 이 침대로도 자기·꿈꾸기(js/spaces/doors.js)
  { id: 'moonLamp',   name: '달 램프',   ico: '🌙', cost: 5,  pay: 'shard', dream: true, foot: [0.3, 0.3], sm: true, h: 0.55 },
  { id: 'crystalPot', name: '수정 화분', ico: '💎', cost: 8,  pay: 'shard', dream: true, foot: [0.32, 0.32], sm: true, h: 0.7 },
  { id: 'starMobile', name: '별 모빌',   ico: '⭐', cost: 12, pay: 'shard', dream: true, foot: [0.5, 0.5] },
  { id: 'cloudBed',   name: '구름 침대', ico: '☁️', cost: 20, pay: 'shard', dream: true, big: true, sleep: true, foot: [1.5, 2.2] },
  // 🪞 거울 장식 — 🪞 거울 조각(거울 마을 의뢰, 하루 최대 9)으로만 산다. 거울 마을을 한 번 다녀온 뒤에 보인다(mirror: true · game.js getDecor)
  //   외관 보색 반전(시안 mockups/compare-decor.png 2안 확정) · waterMirror 는 벽걸이 체계가 없어 바닥 스탠드 거울
  { id: 'upsidePot',   name: '거꾸로 화분', ico: '🪴', cost: 6,  pay: 'mirror', mirror: true, foot: [0.34, 0.34], sm: true, h: 0.7 },
  { id: 'waterMirror', name: '물빛 거울',   ico: '🪞', cost: 10, pay: 'mirror', mirror: true, foot: [0.6, 0.3] },
  { id: 'shadowBear', name: '거울 곰 인형', ico: '🧸', cost: 14, pay: 'mirror', mirror: true, foot: [0.5, 0.45] },
  { id: 'mirrorLamp', name: '거울 등불',   ico: '🏮', cost: 22, pay: 'mirror', mirror: true, foot: [0.5, 0.5] },
  { id: 'ghostDoll',   name: '꼬마 유령 인형', ico: '👻', cost: 8,  pay: 'candy', candy: true, foot: [0.45, 0.45] },
  { id: 'candyBasket', name: '사탕 바구니',   ico: '🍭', cost: 14, pay: 'candy', candy: true, foot: [0.4, 0.4], sm: true, h: 0.42 },
  { id: 'jackLamp',    name: '웃는 호박 등',  ico: '🎃', cost: 20, pay: 'candy', candy: true, foot: [0.45, 0.45], sm: true, h: 0.5 },
  { id: 'snowglobe', name: '설산 스노볼', ico: '🔮', cost: 150, pay: 'coins', hut: true, foot: [0.35, 0.35], sm: true, h: 0.45 },
  { id: 'hutmodel', name: '미니 등불 산장 모형', ico: '🏠', cost: 300, pay: 'coins', hut: true, foot: [0.6, 0.6] },
  { id: 'picnicBasket', name: '소복 과일 바구니', ico: '🧺', cost: 0, pay: 'coins', hidden: true, set: 'picnic', foot: [0.6, 0.6], sm: true, h: 0.42 },
  { id: 'picnicPies', name: '갓 구운 파이 탑', ico: '🥧', cost: 0, pay: 'coins', hidden: true, set: 'picnic', foot: [0.45, 0.45], sm: true, h: 0.62 },
  { id: 'picnicTable', name: '체크 식탁보 둥근 식탁', ico: '🍽️', cost: 0, pay: 'coins', hidden: true, set: 'picnic', foot: [1.6, 1.6], top: { y: 0.61, pad: [1.4, 1.4] } },
  { id: 'teaBowl', name: '텃밭 한 그릇', ico: '🥕', cost: 0, pay: 'coins', hidden: true, set: 'teatime', foot: [0.47, 0.47], sm: true, h: 0.32 },
  { id: 'teaCake', name: '꿈결 별 케이크', ico: '🎂', cost: 0, pay: 'coins', hidden: true, set: 'teatime', foot: [0.45, 0.45], sm: true, h: 0.56 },
  { id: 'teaCupboard', name: '깃발 민트 찬장', ico: '🗄️', cost: 0, pay: 'coins', hidden: true, set: 'teatime', foot: [1.62, 0.5], top: { y: 0.58, pad: [1.5, 0.45] } },
  { id: 'winterSled', name: '목도리 두른 썰매', ico: '🛷', cost: 0, pay: 'coins', hidden: true, set: 'winter', foot: [0.55, 0.85] },
  { id: 'winterLamp', name: '별 헤는 무드등', ico: '🔭', cost: 0, pay: 'coins', hidden: true, set: 'winter', foot: [0.4, 0.4], sm: true, h: 0.33 },
  { id: 'winterSofa', name: '눈 내리는 창가 소파', ico: '❄️', cost: 0, pay: 'coins', hidden: true, set: 'winter', big: true, foot: [2.0, 0.9] },
  { id: 'stoneGems', name: '반짝반짝 원석함', ico: '💎', cost: 0, pay: 'coins', hidden: true, set: 'stone', foot: [0.5, 0.3], sm: true, h: 0.47 },
  { id: 'stoneBear', name: '꼬마 곰 석상', ico: '🗿', cost: 0, pay: 'coins', hidden: true, set: 'stone', foot: [0.45, 0.45] },
  { id: 'stoneHearth', name: '타닥타닥 벽난로', ico: '🔥', cost: 0, pay: 'coins', hidden: true, set: 'stone', big: true, foot: [2.05, 0.5] },
  { id: 'lanternBoat', name: '등불 켠 나룻배', ico: '🛶', cost: 0, pay: 'coins', hidden: true, set: 'lantern', foot: [1.4, 0.7] },
  { id: 'lanternMist', name: '푸른 불 석등', ico: '🏮', cost: 0, pay: 'coins', hidden: true, set: 'lantern', foot: [0.4, 0.4] },
  { id: 'lanternRug', name: '연꽃 연못 러그', ico: '🪷', cost: 0, pay: 'coins', hidden: true, set: 'lantern', big: true, foot: [2.7, 1.85] },
  { id: 'guardFlag', name: '이겼다! 깃발', ico: '🚩', cost: 0, pay: 'coins', hidden: true, set: 'guard', foot: [0.4, 0.4] },
  { id: 'guardJar', name: '반딧불 한 병', ico: '🫙', cost: 0, pay: 'coins', hidden: true, set: 'guard', foot: [0.3, 0.3], sm: true, h: 0.4 },
  { id: 'guardScarecrow', name: '금빛 허수아비', ico: '🌾', cost: 0, pay: 'coins', hidden: true, set: 'guard', foot: [1.05, 0.6] },
  { id: 'teacups', name: '찻잔 세트', ico: '🫖', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.45, 0.45], sm: true, h: 0.21 },
  { id: 'bojagi', name: '보자기 꾸러미', ico: '🎁', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.4, 0.37], sm: true, h: 0.39 },
  { id: 'flowerpail', name: '꽃 양동이', ico: '🪣', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.37, 0.36], sm: true, h: 0.36 },
  { id: 'driedflowers', name: '말린 꽃 리스', ico: '🌾', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.58, 0.6] },
  { id: 'glassbuoy', name: '유리 부표', ico: '🔮', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.48, 0.44], sm: true, h: 0.34 },
  { id: 'conchpot', name: '소라 화분', ico: '🪴', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.5, 0.36], sm: true, h: 0.34 },
  { id: 'globe', name: '지구본', ico: '🌍', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.4, 0.31], sm: true, h: 0.55 },
  { id: 'inkquill', name: '잉크병과 깃펜', ico: '🪶', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.47, 0.3], sm: true, h: 0.59 },
  { id: 'baguettes', name: '바게트 바구니', ico: '🧺', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.71, 0.38], sm: true, h: 0.37 },
  { id: 'jamshelf', name: '잼 병 선반', ico: '🍓', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.66, 0.31] },
  { id: 'guitarstand', name: '기타 받침대', ico: '🎸', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.48, 0.54] },
  { id: 'gramophone', name: '축음기', ico: '📻', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.43, 0.4], sm: true, h: 0.62 },
  { id: 'musicstand', name: '보면대', ico: '🎼', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.48, 0.32] },
  { id: 'metronome', name: '메트로놈', ico: '⏱️', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.25, 0.22], sm: true, h: 0.4 },
  { id: 'musicbox', name: '오르골', ico: '🎹', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.36, 0.46], sm: true, h: 0.47 },
  { id: 'wp_hearth', name: '작은 벽난로', ico: '🔥', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [1.2, 0.6], desc: '양말 두 짝이 걸린 크림색 벽난로예요' },
  { id: 'wp_fur_rug', name: '양털 러그', ico: '🐑', cost: 0, pay: 'coins', hidden: true, keep: true, desc: '털 방울이 빙 둘린 동그란 러그예요' },
  { id: 'wp_cocoa_table', name: '핫초코 탁자', ico: '☕', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.8, 0.8], desc: '큰 머그에 핫초코를 담은 원탁이에요' },
  { id: 'fp_owl_clock', name: '부엉이 시계', ico: '🦉', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.65, 0.45], desc: '부엉이가 머리에 앉은 괘종시계예요' },
  { id: 'fp_acorn_cupboard', name: '다람쥐 도토리 찬장', ico: '🌰', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [1.4, 1.1], desc: '다람쥐가 지키는 커다란 도토리 찬장이에요' },
  { id: 'fp_hedgehog_cushion', name: '고슴도치 쿠션', ico: '🧸', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.55, 0.6], sm: true, h: 0.58, desc: '산딸기를 꼭 안은 고슴도치 인형이에요' },
  { id: 'xm_mini_tree', name: '작은 트리', ico: '🌲', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [1.0, 1.0], desc: '등나무 바구니에 심은 꼬마전구 트리예요' },
  { id: 'xm_gift_pile', name: '선물 더미', ico: '🎀', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.9, 0.55], sm: true, h: 0.61, desc: '리본 묶은 선물 상자를 차곡차곡 쌓았어요' },
  { id: 'xm_ginger_house', name: '진저브레드 집', ico: '🍪', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.9, 0.65], desc: '체크 보 덮은 탁자에 눈 덮인 과자 집을 올렸어요' },
  { id: 'sp_shell_lamp', name: '조개 램프', ico: '🦪', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.7, 0.6], desc: '벌어진 조개 속 진주가 은은하게 빛나요' },
  { id: 'sp_lighthouse_model', name: '등대 모형', ico: '🏝️', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.75, 0.75], desc: '바위섬 위에 줄무늬 등대를 세운 모형이에요' },
  { id: 'sp_boat_planter', name: '보트 화분', ico: '⛵', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [1.0, 0.55], desc: '노 두 자루를 얹은 쪽배에 들꽃을 심었어요' },
  { id: 'ds_cake_case', name: '딸기 카운터 진열장', ico: '🍰', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [1.1, 0.6], desc: '민트 지붕 유리장에 웃는 컵케이크와 케이크를 진열했어요' },
  { id: 'ds_pudding_chair', name: '웃는 푸딩 스툴', ico: '🍮', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.6, 0.6], desc: '캐러멜이 흘러내린 푸딩에 크림과 체리를 얹었어요' },
  { id: 'ds_waffle_rug', name: '하트 꽃 와플 러그', ico: '🧇', cost: 0, pay: 'coins', hidden: true, keep: true, desc: '하트 다섯 장 와플 가운데 딸기잼을 올렸어요' },
  { id: 'ns_constellation_lamp', name: '별 구멍 돔 등', ico: '🌌', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.6, 0.6], desc: '남색 갓에 뚫린 별자리 구멍으로 불빛이 새어 나와요' },
  { id: 'ny_folding_screen', name: '일월오봉 병풍', ico: '🏯', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [1.45, 0.4], desc: '여섯 폭 한지에 연두 산과 다홍 해, 노란 달을 그렸어요' },
  { id: 'ny_tteokguk_table', name: '둥근 소반 떡국', ico: '🥣', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.85, 0.85], desc: '나무 소반에 지단 올린 떡국 한 그릇을 차렸어요' },
  { id: 'ny_bokjori_wall', name: '복조리 횃대', ico: '🧧', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.8, 0.3], desc: '낮은 횃대에 복조리 둘과 다홍 복주머니를 걸었어요' },
  { id: 'cp_camp_chair', name: '접이식 캔버스 의자', ico: '🪑', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.6, 0.6], desc: '나무 X자 다리에 올리브 천을 씌운 캠핑 의자예요' },
  { id: 'cp_lantern_hook', name: '쇠 고리 랜턴', ico: '🏮', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.5, 0.5], desc: '남색 쇠기둥 고리 끝에 머스터드 랜턴이 은은하게 빛나요' },
  { id: 'sb_blossom_pot', name: '크림 화분 벚나무', ico: '🌸', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.7, 0.7], desc: '둥근 크림 화분에서 굽은 줄기가 분홍 꽃송이 셋을 피웠어요' },
  { id: 'sb_picnic_mat', name: '체크 돗자리', ico: '🧺', cost: 0, pay: 'coins', hidden: true, keep: true, desc: '분홍·크림 체크에 연두 테두리를 두르고 꽃잎이 떨어졌어요' },
  { id: 'rn_umbrella_stand', name: '하늘색 우산꽂이', ico: '☂️', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.5, 0.5], desc: '하늘색 둥근 통에 노랑·연두 우산 둘을 꽂았어요' },
  { id: 'rn_rain_curtain', name: '구름 빗방울 모빌', ico: '🌧️', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [0.7, 0.45], desc: '굽은 나무 걸이에 크림 구름과 빗방울 다섯 줄을 달았어요' },
  { id: 'ns_moon_sofa', name: '구름 위 달 소파', ico: '🌙', cost: 0, pay: 'coins', hidden: true, keep: true, foot: [1.35, 0.75], desc: '연보라 구름 방석 뒤로 초승달 등받이를 세웠어요' },
  ...AFF_FRAMES,
];

export const FISH_KINDS = [
  // 🍂 계절 한정 — 누적 p 를 0 으로 둬서 원래 가중치가 없다. 그 계절에만 게이트(js/dex-gates.js)가 p 를 준다.
  //   ⚠️ fish 는 rarity 가 곧 도감 id 다(DEX.fish). col 은 낚인 물고기·박물관 전시 색(fishMesh)
  { rarity: 'sakura_trout', name: '벚꽃 송어', p: 0, season: 'spring', col: 0xf5a9c4 },
  { rarity: 'puffer',       name: '동글 복어', p: 0, season: 'summer', col: 0xf2d16b },
  { rarity: 'maple_carp',   name: '단풍 잉어', p: 0, season: 'autumn', col: 0xe8743c },
  { rarity: 'ice_smelt',    name: '얼음 빙어', p: 0, season: 'winter', col: 0xbfe4f2 },
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
  mine:  { ico: '⛏️', name: '광부의 힘',   desc: '동굴에서 채굴할 때 돌·석탄을 더 얻을 확률이 올라가요. 💎 보석은 🌫️ 안개 낀 날에만 나와요. 마을 서쪽 동굴 입구로!' },
};

export const stationLabel = (rec) => { const d = OUTDOOR.find(o => o.id === rec.id); return `${d.ico} ${d.name}`; };

// 🔥 가공물(charcoal·flour·brick·bread) — **파는 건 출구 중 가장 나쁜 선택**이 되게 잡았다.
//   밀 4개(60)로 밀가루 평균 3.5개(63)라 팔면 본전이고, 빵으로 구우면 카페에서 56을 받는다.
//   ⚠️ 이 표는 한 줄로 유지한다 — tests/orchard.test.mjs 가 한 줄 정규식으로 파싱한다.
export const SELL_PRICE = { charcoal: 9, flour: 18, brick: 12, bread: 26, juice: 40, apple_jam: 12, roast_chestnut: 30, gotgam: 24, crop: 5, fish: 8, wood: 2, stone: 3, coal: 6, gem: 40, crystal: 25, egg: 6, bug: 14, forage: 7, wheat: 15, corn: 20, grape: 30, honey: 12, apple: 8, pear: 10, peach: 13, persimmon: 16, chestnut: 20, ...FORAGE_SELL };   // 기본 판매 단가(코인) — 고급 작물은 js/farm-crops.js price 와 같은 값(3·4·6배), 🍯꿀은 벌통 · 🍎 과수원 과일은 js/orchard.js FRUITS[].price 와 같은 값

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
  { id: 'sap_apple',     name: '사과나무 묘목',   ico: '🍎', coin: 40,  give: { sap_apple: 1 },     desc: '3일이면 자라요 · 매일 🍎2개' },
  { id: 'sap_pear',      name: '배나무 묘목',     ico: '🍐', coin: 55, give: { sap_pear: 1 },      desc: '3일이면 자라요 · 매일 🍐2개' },
  { id: 'sap_peach',     name: '복숭아나무 묘목', ico: '🍑', coin: 80, give: { sap_peach: 1 },     desc: '4일이면 자라요 · 매일 🍑2개' },
  { id: 'sap_persimmon', name: '감나무 묘목',     ico: '🍊', coin: 100, give: { sap_persimmon: 1 }, desc: '4일이면 자라요 · 매일 🍊2개' },
  { id: 'sap_chestnut',  name: '밤나무 묘목',     ico: '🌰', coin: 130, give: { sap_chestnut: 1 },  desc: '5일이면 자라요 · 매일 🌰2개' },
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
  ...HOMI_TIERS.slice(1).map(h => ({ id: `buy_homi${h.tier}`, name: h.name, ico: iconById(h.ico), coin: h.coin, homi: h.tier, desc: h.desc })),
];

export const UPGRADES = [
  { id: 'axe',   name: '강철 도끼',    ico: '🪓', cost: { wood: 20, crop: 3 }, desc: '나무를 2번에 벌목' },
  { id: 'water', name: '큰 물조리개',  ico: '💧', cost: { wood: 10, crop: 5 }, desc: '물 한 번에 성장↑' },
  { id: 'rod',   name: '튼튼한 낚싯대', ico: '🎣', cost: { wood: 10, fish: 3 }, desc: '입질 시간 여유↑' },
  { id: 'pot',   name: '큰 냄비',      ico: '🍲', cost: { stone: 5, coal: 3 }, desc: '요리 버프 시간 1.5배(채굴)' },
  { id: 'net',   name: '촘촘한 포충망', ico: '🦋', cost: { wood: 12, bug: 2 }, desc: '반딧불이 포획 성공률↑' },   // 🌟 밤 콘텐츠 강화
  // 🔧 신설 5종 — 도구 9종이 전부 같은 3단계 규칙을 따르게(dev/archive/tool-tiers/).
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
  { id: 'kiln',      name: '화덕',    ico: '🔥', cost: { stone: 20, wood: 15, coins: 150 }, desc: '재료를 넣어두면 다음 날 구워져 있어요 · 한 채에 2칸' },
  { id: 'vat',       name: '발효통',  ico: '🫙', cost: { wood: 25, stone: 10, coins: 200 }, desc: '🍇포도를 밟아 넣어두면 다음 날 🍷포도즙이 돼요 · 한 채에 2칸' },
  // 🌾 수확제 광장(2026 가을) — 작업대 목록에선 숨기고 🧺 보관함으로만 꺼낸다. 좌판 구매·완공 보상이 보관함에 넣어 준다
  //    cost 는 표시용이 아니라 "직접 구매 불가" 표시 — hidden 이라 작업대에서 살 수 없다(보관분만 꺼냄)
  { id: 'haybale',          name: '볏단',          ico: '🌾', cost: { leaf: 40 }, desc: '수확제 좌판에서 산 볏단', hidden: true },
  { id: 'pumpkins',         name: '호박 더미',      ico: '🎃', cost: { leaf: 60 }, desc: '수확제 좌판에서 산 호박 더미', hidden: true },
  { id: 'pumpkinlamp',      name: '호박 등불',      ico: '🏮', cost: { leaf: 9999 }, desc: '수확제 광장 🥈 보상 — 밤에 은은히', hidden: true },
  { id: 'harvestscarecrow', name: '수확제 허수아비', ico: '🧑‍🌾', cost: { leaf: 9999 }, desc: '수확제 광장 🥇 보상', hidden: true },
  { id: 'winterfountain',   name: '꼬마 분수',      ico: '⛲', cost: { coins: 9999 }, desc: '겨울 분수를 다 지은 선물', hidden: true, box: [1.5, 1.5] },
  { id: 'winterlamp',       name: '겨울 등불',      ico: '🏮', cost: { coins: 9999 }, desc: '마을 등불 선물. 밤에 빛나요', hidden: true },
  { id: 'summitflag', name: '정상 깃발', ico: '🚩', cost: { coins: 9999 }, desc: '산장 카페에서 산 정상 깃발', hidden: true },
  { id: 'moonswing',   name: '달빛 그네', ico: '🌙', cost: { coins: 9999 }, desc: '경매에서 산 달빛 그네', hidden: true },
  { id: 'lanternarch', name: '등불 아치', ico: '🏮', cost: { coins: 9999 }, desc: '경매에서 산 등불 아치', hidden: true },
  { id: 'starvane',    name: '별 풍향계', ico: '⭐', cost: { coins: 9999 }, desc: '경매에서 산 별 풍향계', hidden: true },
  { id: 'teadeck',     name: '찻상 놓인 평상', ico: '🍵', cost: { coins: 9999 }, desc: '마당에서 차 한잔 쉬어 가요', hidden: true, box: [1.64, 1.14] },
  { id: 'flowercart',  name: '꽃 파는 수레', ico: '💐', cost: { coins: 9999 }, desc: '마당에 세워 두는 꽃 수레예요', hidden: true, box: [1.3, 1] },
  { id: 'bookstall',   name: '헌책 좌판', ico: '📚', cost: { coins: 9999 }, desc: '헌책이 쌓인 야외 좌판이에요', hidden: true, box: [1.8, 1.08] },
  { id: 'breadcart',   name: '빵 굽는 손수레', ico: '🥖', cost: { coins: 9999 }, desc: '빵 냄새가 나는 야외 손수레예요', hidden: true, box: [1.5, 1] },
  { id: 'buskerstage', name: '작은 악사 무대', ico: '🎤', cost: { coins: 9999 }, desc: '노래하기 좋은 야외 무대예요', hidden: true, box: [2.05, 2.05], posts: [[0, 0, 1.02]] },
  { id: 'shellshade',  name: '조개 풍경 그늘막', ico: '🐚', cost: { coins: 9999 }, desc: '조개 풍경이 흔들리는 그늘막이에요', hidden: true, box: [2.1, 1.6], posts: [[-0.87, -0.61, 0.12], [0.87, -0.61, 0.12], [-0.87, 0.61, 0.12], [0.87, 0.61, 0.12]] },
  { id: 'noteflags', name: '음표 깃발 줄', ico: '🎶', cost: { coins: 9999 }, desc: '음표 모양 기둥에 깃발을 걸었어요', hidden: true, box: [2.5, 0.5], posts: [[-0.97, 0, 0.3], [0.85, 0, 0.2]] },
  { id: 'hornpost', name: '나팔 기둥', ico: '📢', cost: { coins: 9999 }, desc: '마을 소식을 알리는 나팔이에요', hidden: true, box: [1.04, 0.64], posts: [[0, 0, 0.22]] },
  { id: 'reedorgan', name: '작은 풍금', ico: '🎹', cost: { coins: 9999 }, desc: '마당에서 한 곡 쳐 보고 싶어져요', hidden: true, box: [1.1, 0.62] },
  { id: 'wp_snowman', name: '목도리 두른 눈사람', ico: '⛄', cost: { coins: 9999 }, desc: '방울모자에 긴 목도리를 두른 눈사람이에요', hidden: true, quest: true, box: [0.9, 0.9], posts: [[0, 0, 0.4]] },
  { id: 'fp_deer_mailbox', name: '사슴 우체통', ico: '🦌', cost: { coins: 9999 }, desc: '자작나무 기둥 위에 사슴 얼굴 편지함을 얹었어요', hidden: true, quest: true, box: [0.6, 0.6], posts: [[0, 0, 0.3]] },
  { id: 'xm_wreath_arch', name: '리스 아치', ico: '💝', cost: { coins: 9999 }, desc: '지팡이 사탕 둘이 하트로 맞닿은 리스 아치예요', hidden: true, quest: true, box: [2.0, 0.4], posts: [[-0.84, 0, 0.14], [0.84, 0, 0.14]] },
  { id: 'sp_net_hammock', name: '그물 해먹', ico: '🪢', cost: { coins: 9999 }, desc: '유목 받침대에 남색 그물 해먹을 걸었어요', hidden: true, quest: true, box: [2.5, 0.8] },
  { id: 'ds_icecream_cart', name: '파라솔 수레', ico: '🍦', cost: { coins: 9999 }, desc: '분홍·노랑 파라솔 아래 아이스크림 세 통을 실었어요', hidden: true, quest: true, box: [1.6, 0.8] },
  { id: 'ns_telescope', name: '삼각대 망원경', ico: '🔭', cost: { coins: 9999 }, desc: '나무 삼각대 위 남색 망원경이 밤하늘을 향해요', hidden: true, quest: true, box: [0.8, 0.8] },
  { id: 'ny_kite_stand', name: '연 세 줄', ico: '🪁', cost: { coins: 9999 }, desc: '두 기둥 사이 줄에 쪽빛·다홍·연두 가오리연 셋을 달았어요', hidden: true, quest: true, box: [2.0, 0.4], posts: [[-0.9, 0, 0.12], [0.9, 0, 0.12]] },
  { id: 'cp_tent', name: '머스터드 삼각 텐트', ico: '⛺', cost: { coins: 9999 }, desc: '크림 문을 걷어 올리고 꼭대기에 벽돌색 깃발을 꽂았어요', hidden: true, quest: true, box: [1.7, 1.9] },
  { id: 'cp_marshmallow_fire', name: '꼬치 받침 화로', ico: '🏕️', cost: { coins: 9999 }, desc: '돌 둘레 모닥불 위로 마시멜로 세 개를 꼬치에 걸었어요', hidden: true, quest: true, box: [1.8, 1.15] },
  { id: 'sb_petal_swing', name: '나무 그네', ico: '🎐', cost: { coins: 9999 }, desc: '나무 A자 틀 가로대에 꽃 덩굴을 감고 분홍 자리를 매달았어요', hidden: true, quest: true, box: [2.0, 0.9], posts: [[-0.85, -0.38, 0.1], [-0.85, 0.38, 0.1], [0.85, -0.38, 0.1], [0.85, 0.38, 0.1]] },
  { id: 'sb_blossom_arch', name: '꽃구름 아치', ico: '💮', cost: { coins: 9999 }, desc: '나무 기둥 위 반원에 분홍 꽃송이를 촘촘히 얹었어요', hidden: true, quest: true, box: [2.0, 0.4], posts: [[-0.9, 0, 0.15], [0.9, 0, 0.15]] },
  { id: 'rn_rain_planter', name: '토란잎 빗물 화분', ico: '🌿', cost: { coins: 9999 }, desc: '하늘색 화분의 넓은 토란잎마다 빗방울이 한 알씩 맺혔어요', hidden: true, quest: true, box: [1.1, 1.0] },
  { id: 'rn_snail_garden', name: '이끼 돌 달팽이', ico: '🐌', cost: { coins: 9999 }, desc: '이끼 덮인 돌 위로 노란 달팽이가 버섯 둘 곁을 지나가요', hidden: true, quest: true, box: [1.4, 1.1] },
  { id: 'ns_starlight_arch', name: '별 전구 아치', ico: '🌠', cost: { coins: 9999 }, desc: '반원 철사에 별 전구를 달고 꼭대기에 큰 금별을 얹었어요', hidden: true, quest: true, box: [2.0, 0.4], posts: [[-0.9, 0, 0.15], [0.9, 0, 0.15]] },
  ...AFF_OUTDOOR,
  ...REWARD_DECOR,   // 🤝 친구 초대 보상 장식(js/data/reward-decor.js) — 원장이 보관함에 넣어 준다 · 서버 가드 대상
  { id: 'mine_cart', name: '광산 수레', ico: '🛒', cost: { coins: 9999 }, desc: '광부 아저씨가 준 수레 · 지하 20층 도달 보상', hidden: true, quest: 'delve' },
  // 🎃 할로윈 한정 코인 장식 — 직접 구매(작업대 목록, 기간 한정). hidden 과 다르다: hidden 은 영구 비판매, sale 은 기간 판매
  { id: 'ghostlamp',  name: '유령 정원등', ico: '👻', cost: { coins: 200 }, sale: 'halloween', desc: '밤이 되면 으스스하게 빛나는 유령 등' },
  { id: 'gravefence', name: '묘비 울타리', ico: '🪦', cost: { coins: 280 }, sale: 'halloween', desc: '묘비 모양 울타리 · 밤손님은 못 막아요' },
  { id: 'webarch',    name: '거미줄 아치', ico: '🕸️', cost: { coins: 500 }, sale: 'halloween', desc: '마당 입구에 세우는 커다란 거미줄 아치' },
  ...FARM_BUILDINGS,   // 🏗️ 밭 시설 7종(farm:true, fp:[가로칸,세로칸]) — 같은 배치 문법, 텃밭 안에서만(js/farm-building.js)
];

// 🔥 첫 화덕 자리 — ⛏️채굴장 입구(-14,3) 아래 빈터. 마을 서쪽 동선 위라 오가며 눈에 들어온다.
//    (-6,4) 는 목수 아저씨와 겹쳐 캐릭터 뒤에 가렸다(2026-09-20 실측).
//    한 점에 박으면 그 자리에 나무가 서 있을 때 화덕이 파묻힌다 — 후보 중 **가장 트인 곳**을 고른다.
export const KILN_SPOTS = [[-9.5, 12.5], [-11.5, 9.5], [-13, 8], [-7.5, 14], [-12, 6.4]];   // 채굴장(-14,3)에 붙지 않게 남동쪽 빈터를 앞에 둔다

export const KILN_HOME = KILN_SPOTS[0];                 // 기본값(후보를 못 고를 때)

export const KILN_CLEAR_R = 2.4;                        // 이 반경 안엔 나무가 없어야 한다(화덕 폭 2.03 + 여유)

export function kilnAvoidPoints() {
  return [MINE_GATE, CAFE_GATE, MUSEUM_GATE, OBSERVATORY_GATE, FARM_GATE, KITCHEN, BENCH, SHOP, MARKET, RANK, COOP]
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

export const MOUNTAIN_PLACE_MSG = '🏔️ 산자락엔 놓을 수 없어요';

export function isFarmBuilding(id) { return FARM_BUILDINGS.some(d => d.id === id); }

export const OUTDOOR_REACH = 7;   // 조준 가능한 최대 거리 — 화면 끝을 눌러 멀리 놓지 못하게(근접 상호작용 원칙)
