// =============================================================
//  calm forest · 3D 게임 코어 (Three.js / WebGL)
//  ------------------------------------------------------------
//  2단계 범위: 걷기 + 벌목 + 농사(밭갈기/심기/물주기/수확)
//             + 건축(정해진 터 단계 건설) + 파티클 + 블룸 + 낮/밤
//             + 모바일(아날로그) 입력 지원
//
//  ▷ 아트 디렉션: 로우폴리 + 점토/장난감 느낌, 파스텔 톤,
//    소프트 매트(툰) 셰이딩, 부드러운 그림자/안개, 은은한 블룸
//  ▷ 외부 이미지/모델/사운드 파일 미사용 — 모든 형상은 코드 생성
//
//  ▷ [연동 지점] 주석 태그:
//     · [Supabase] 저장 / [센서] 로깅 스냅샷 / [GA4] 이벤트
//     · [셰이더] 커스텀 머티리얼/포스트프로세싱
//     · [파티클] 벌목/밭갈기/물주기/수확/건축완성 연출
// =============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { sampleFrame, startLogging } from './logger.js?v=19';         // [센서] 로깅
import { saveGame, loadGame } from './supabase-client.js?v=19';       // [Supabase] 저장
import { trackChop, trackEvent } from './analytics.js?v=19';          // [GA4] 이벤트
import { logEcon, startMetrics } from './metrics.js?v=19';            // [계측] 경제 원장 + 세션 요약
import { Sound, initSound, startRainSound, stopRainSound, setBGMTheme } from './sound.js?v=19'; // 🔊 절차적 사운드 + 🌧️ 빗소리 + 🎵 BGM 테마

// 모바일 여부 — 렌더 품질/디테일을 낮춰 성능 확보
const IS_MOBILE = /Mobi|Android|iP(hone|od|ad)/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);

// ── 작물 종류(다양화) — 심을 때 랜덤 배정, 열매 색이 달라짐 ─────
const CROP_TYPES = [
  { id: 'carrot',    name: '당근',   fruit: 0xff9e5e },
  { id: 'tomato',    name: '토마토', fruit: 0xff7b7b },
  { id: 'blueberry', name: '블루베리', fruit: 0x8aa8ff },
  { id: 'pumpkin',   name: '호박',   fruit: 0xffc36e },
];

// ── 도구 하트바 (선택 도구에 따라 상호작용이 달라짐) ─────────────
const TOOLS = [
  { id: 'axe',    name: '도끼',     ico: '🪓' }, // 벌목
  { id: 'hoe',    name: '괭이',     ico: '⛏️' }, // 밭 갈기
  { id: 'seed',   name: '씨앗',     ico: '🌰' }, // 씨앗 심기
  { id: 'water',  name: '물조리개', ico: '💧' }, // 물주기
  { id: 'sickle', name: '낫',       ico: '🌾' }, // 수확
  { id: 'hammer', name: '망치',     ico: '🔨' }, // 건축
  { id: 'rod',    name: '낚싯대',   ico: '🎣' }, // 낚시(호수)
];
let currentTool = 0;
const BUILD_COST = 10;                                  // 건축 단계당 목재 소비량
const STAGE_NAMES = ['', '나무 바닥(데크)', '통나무 벽', '지붕']; // 1→2→3 순서
// ── 🏗️ 증축(집 완성 후) — 단계마다 집이 커지고 지붕·문 모양이 바뀜. 후반 자원·코인 싱크 ──
const EXPANSIONS = [
  { stage: 4, name: '넓은 집', ico: '🏡', cost: { wood: 30, stone: 15, coins: 80 } },
  { stage: 5, name: '저택',    ico: '🏘️', cost: { wood: 50, stone: 30, coal: 10, coins: 200 } },
  { stage: 6, name: '모던 하우스', ico: '🏙️', cost: { wood: 80, stone: 50, gem: 3, coins: 450 } },
];
const MAX_HOUSE_STAGE = 6;
const WET_TIME = 5;    // 물 준 뒤 흙이 촉촉하게 유지되는 시간(초) — 마르면 다시 물 필요
const WILT_TIME = 22;  // 물 없이 목마른 채 방치되면 시드는 시간(초)

// ── 날짜 유틸(출석·데일리 퀘스트·날씨 — 로컬 날짜 기준) ─────────
function todayStr(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dateHash(salt, offsetDays = 0) {   // offsetDays: 0=오늘, 1=내일(예보용)
  const s = todayStr(offsetDays) + ':' + salt;
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}
// 🌦️ 오늘의 날씨 — 날짜 시드라 모든 유저에게 동일. 맑음 55% / 비 20% / 눈 12% / 안개 13%
//    테스트: ?weather=rain|snow|fog (?rain=1 도 호환)
function weatherOf(offsetDays = 0) {
  const r = dateHash('weather', offsetDays) % 100;
  return r < 20 ? 'rain' : r < 32 ? 'snow' : r < 45 ? 'fog' : 'clear';
}
const _wq = new URLSearchParams(location.search);
const WEATHER = ['rain', 'snow', 'fog'].includes(_wq.get('weather')) ? _wq.get('weather')
  : _wq.has('rain') ? 'rain'
  : weatherOf(0);
// 🔮 내일 예보 — 재방문 유도(출석 모달·데일리 올빼미 대사에 노출)
const FORECAST = weatherOf(1);
const FORECAST_MSG = {
  clear: '내일은 ☀️ 맑을 예정이에요!',
  rain:  '내일은 🌧️ 비 소식 — 밭이 저절로 자라는 날!',
  snow:  '내일은 ❄️ 눈 소식 — 목재가 잘 나오는 날!',
  fog:   '내일은 🌫️ 안개 예보 — 보석 캐기 좋은 날!',
};
const RAIN_DAY = WEATHER === 'rain';   // 비 전용 효과(밭 자동 성장·낚시 행운·빗소리)에 사용
const WEATHER_MSG = {
  rain: '🌧️ 오늘은 비 오는 날! 밭이 저절로 자라고 물고기가 잘 물어요',
  snow: '❄️ 오늘은 눈 오는 날! 나뭇가지가 잘 부러져 목재가 더 나와요',
  fog:  '🌫️ 오늘은 안개 낀 날… 동굴에서 보석이 더 자주 반짝여요',
};
let rainLines = null;  // 날씨 파티클(빗줄기/눈송이 LineSegments)

// ── 집 꾸미기 가구 카탈로그 (작물 💰 로 구매해 실내에 배치) ──────
const DECOR = [
  { id: 'rug',      name: '러그',   ico: '🎨', cost: 2, pay: 'crop' },
  { id: 'plant',    name: '화분',   ico: '🪴', cost: 2, pay: 'crop' },
  { id: 'chair',    name: '의자',   ico: '🪑', cost: 3, pay: 'crop' },
  { id: 'table',    name: '테이블', ico: '🟫', cost: 3, pay: 'crop' },
  { id: 'lamp',     name: '램프',   ico: '🕯️', cost: 4, pay: 'crop' },
  { id: 'sofa',     name: '소파',   ico: '🛋️', cost: 5, pay: 'crop' },
  { id: 'aquarium', name: '어항',   ico: '🐟', cost: 2, pay: 'fish' }, // 물고기로 구매
  // ── 큰 가구(사이즈 大) ──
  { id: 'bed',       name: '침대',    ico: '🛏️', cost: 8,  pay: 'crop', big: true },
  { id: 'bigtable',  name: '큰 식탁', ico: '🍽️', cost: 8,  pay: 'crop', big: true },
  { id: 'bigsofa',   name: '큰 소파', ico: '🛋️', cost: 10, pay: 'crop', big: true },
  { id: 'bookshelf', name: '책장',    ico: '📚', cost: 9,  pay: 'crop', big: true },
  { id: 'bigrug',    name: '큰 러그', ico: '🟪', cost: 6,  pay: 'crop', big: true },
];
const INT = new THREE.Vector3(0, 0, 52); // 실내 위치(플레이 구역 밖, 지면 위)

// ── 낚시 ─────────────────────────────────────────────────────
const LAKE_R = 6;   // 호수 반경(환경 호수와 동일)
const FISH_KINDS = [
  { rarity: 'rare',     name: '무지개 물고기', p: 0.07 },
  { rarity: 'uncommon', name: '붉은 물고기',   p: 0.28 },
  { rarity: 'common',   name: '피라미',        p: 1.00 },
];
// ── 요리 레시피(작업대) — 작물/물고기 → 일시 버프 ───────────────
const RECIPES = [
  { id: 'veg_stew',     name: '든든한 채소죽', ico: '🥘', cost: { crop: 3 },          buff: 'speed', dur: 60, desc: '60초 이동속도 +40%' },
  { id: 'grilled_fish', name: '생선 구이',     ico: '🐟', cost: { fish: 2 },          buff: 'luck',  dur: 90, desc: '90초 희귀 물고기 확률↑' },
  { id: 'lunchbox',     name: '모둠 도시락',   ico: '🍱', cost: { crop: 2, fish: 1 }, buff: 'chop',  dur: 90, desc: '90초 벌목 시 목재 +1' },
  { id: 'omelette',     name: '푸짐한 오믈렛', ico: '🍳', cost: { egg: 2, crop: 1 },  buff: 'mine',  dur: 90, desc: '90초 채굴 시 광석 추가 확률↑' }, // 🥚 닭장 달걀 요리
];
const BUFF_META = { speed: { ico: '👟', name: '빠른 발' }, luck: { ico: '🍀', name: '낚시 행운' }, chop: { ico: '🪓', name: '벌목 보너스' }, mine: { ico: '⛏️', name: '광부의 힘' } };
const buffs = { speed: 0, luck: 0, chop: 0, mine: 0 };   // 각 버프 만료 시각(clock.elapsedTime 기준)
function buffOn(k) { return clock.elapsedTime < buffs[k]; }
const BENCH = new THREE.Vector3(4, 0, -5);      // 작업대(요리) 위치
let nearBench = false;
const SHOP = new THREE.Vector3(9, 0, 0);        // 상점 좌판(집터 -8,-8 에서 멀리 동쪽)
let nearShop = false;
const MARKET = new THREE.Vector3(11.5, 0, 2.4); // 📊 시세판(상점 동쪽, 플레이어 동선 위) — 초보자도 시세를 발견하게
let nearMarket = false;
const SELL_ICO_G = { crop: '🥕', fish: '🐟', wood: '🪵', stone: '🪨', coal: '⚫', gem: '💎', egg: '🥚' };
const FARM = new THREE.Vector3(0, 0, 84);       // 개인 텃밭 필드(마을 밖 별도 공간)
const FARM_HALF = 6;                            // 텃밭 반경(정사각 한 변의 절반)
const FARM_GATE = new THREE.Vector3(0, 0, 7);   // 마을 안 텃밭 입구 게이트
let atFarm = false;                             // 텃밭 안에 있는지
let lastMini = 0;                               // 미니맵 갱신 throttle
const MINE = new THREE.Vector3(0, 0, 250);      // 채굴 동굴(다른 공간과 멀찍이)
const MINE_HALF = 12;                           // 넓은 동굴
const MINE_GATE = new THREE.Vector3(-14, 0, 3); // 마을 서쪽 동굴 입구
let atMine = false;
// 🌉 낚시 부두 — 호수 서쪽 물가에서 안쪽으로 뻗음. 물은 못 들어가고 부두 위만 걸을 수 있음
const PIER = { x1: 9.6, x2: 13.4, z1: 8.25, z2: 9.75 };
function onPier(p) { return p.x > PIER.x1 - 0.5 && p.x < PIER.x2 && p.z > PIER.z1 && p.z < PIER.z2; }
// 🐔 닭장(남쪽 필드) — 🔥 2일 연속 출석으로 해금(신규 유저도 이틀째에 도달, 초반 리텐션 훅). 매일 모이(씨앗 2) → 다음날 🥚 달걀 2개
const COOP_STREAK = 2;                          // 해금에 필요한 연속 출석 일수
const COOP = new THREE.Vector3(-6, 0, 13);
const COOP_COST = { wood: 25, stone: 10, coins: 60 };
const COOP_FEED = 2;                            // 모이(씨앗) 소비량
let nearCoop = false, coopGroup = null, coopSign = null;
const chickens = [];
const oreRocks = [];                            // 동굴 광석 바위들
const mineTorches = [];                         // 동굴 벽 횃불(깜빡임)
let farmGroup, mineGroup;                        // 텃밭/동굴 그룹(가시성 토글용)

// 현재 있는 공간만 보이게 — 다른 인스턴스 공간은 숨김
function setSpaceVisible() {
  if (interiorGroup) interiorGroup.visible = indoor;
  if (farmGroup) farmGroup.visible = atFarm;
  if (mineGroup) mineGroup.visible = atMine;
  // 🌧️ 빗소리: 비 오는 날 야외(마을·텃밭)에서만 — 실내·동굴에선 정지
  if (RAIN_DAY && mode === 'play' && !indoor && !atMine) startRainSound();
  else stopRainSound();
}
const SELL_PRICE = { crop: 5, fish: 8, wood: 2, stone: 3, coal: 6, gem: 40, egg: 6 };   // 기본 판매 단가(코인)
// ── 🪙 오늘의 시세 — 품목별 판매가가 날짜 시드로 매일 0.7~1.3배 변동(전원 동일) ──
//    팔 타이밍 전략이 생기고, econ_logs 에 시세 반응 데이터가 쌓임(분석용)
function priceRate(k) { return 0.7 + (dateHash('price:' + k) % 61) / 100; }     // 0.70 ~ 1.30
function priceOf(k) { return Math.max(1, Math.round(SELL_PRICE[k] * priceRate(k))); }
const SHOP_BUY = [
  // 소모품·재료 번들
  { id: 'seed5',   name: '씨앗 5개',   ico: '🌰', coin: 15,  give: { seed: 5 } },
  { id: 'seed20',  name: '씨앗 20개',  ico: '🌰', coin: 50,  give: { seed: 20 }, desc: '대량 할인' },
  { id: 'wood10',  name: '목재 10개',  ico: '🪵', coin: 24,  give: { wood: 10 }, desc: '건축·제작용' },
  { id: 'stone8',  name: '돌 8개',     ico: '🪨', coin: 30,  give: { stone: 8 }, desc: '돌담·화로용' },
  { id: 'coal4',   name: '석탄 4개',   ico: '⚫', coin: 28,  give: { coal: 4 } },
  // 도구 업그레이드(영구) — 코인으로 바로 구매
  { id: 'buy_axe',   name: '강철 도끼',    ico: '🪓', coin: 120, upgrade: 'axe',   desc: '나무를 2번에 벌목' },
  { id: 'buy_rod',   name: '튼튼한 낚싯대', ico: '🎣', coin: 100, upgrade: 'rod',   desc: '입질 시간 여유↑' },
  { id: 'buy_water', name: '큰 물조리개',   ico: '💧', coin: 90,  upgrade: 'water', desc: '물 한 번에 성장↑' },
];

// ── 도구 업그레이드(작업대) — 영구 강화, 재료 소비 ──
const UPGRADES = [
  { id: 'axe',   name: '강철 도끼',    ico: '🪓', cost: { wood: 20, crop: 3 }, desc: '나무를 2번에 벌목' },
  { id: 'water', name: '큰 물조리개',  ico: '💧', cost: { wood: 10, crop: 5 }, desc: '물 한 번에 성장↑' },
  { id: 'rod',   name: '튼튼한 낚싯대', ico: '🎣', cost: { wood: 10, fish: 3 }, desc: '입질 시간 여유↑' },
  { id: 'pot',   name: '큰 냄비',      ico: '🍲', cost: { stone: 5, coal: 3 }, desc: '요리 버프 시간 1.5배(채굴)' },
];

// ── 야외 장식(작업대) — 마당에 설치, 재료 소비 ──
const OUTDOOR = [
  { id: 'fence',     name: '울타리',  ico: '🪵', cost: { wood: 3 }, desc: '마당 울타리' },
  { id: 'path',      name: '디딤돌',  ico: '🪨', cost: { wood: 1 }, desc: '돌 디딤돌' },
  { id: 'flowerbed', name: '꽃밭',    ico: '🌷', cost: { crop: 2 }, desc: '알록달록 꽃밭' },
  { id: 'postlamp',  name: '정원등',  ico: '🏮', cost: { wood: 4 }, desc: '밤에 빛나는 등' },
  { id: 'stonewall', name: '돌담',    ico: '🧱', cost: { stone: 3 }, desc: '튼튼한 돌담(채굴)' },
  { id: 'brazier',   name: '화로',    ico: '🔥', cost: { stone: 2, coal: 2 }, desc: '밤에 빛나는 화로(채굴)' },
];
let placingOutdoor = null;      // 배치 중인 야외 장식 id
const outdoorMeshes = [];

// ── 주민 선물(작업대) — 제작해서 주민에게 주면 친밀도↑ ──
const GIFTS = [
  { id: 'bouquet', name: '꽃다발',      ico: '💐', cost: { crop: 2 } },
  { id: 'fruit',   name: '과일 바구니', ico: '🧺', cost: { crop: 4 } },
  { id: 'fishset', name: '생선 묶음',   ico: '🐟', cost: { fish: 3 } },
  { id: 'woodtoy', name: '목각 인형',   ico: '🪆', cost: { wood: 6 } },
  { id: 'necklace', name: '보석 목걸이', ico: '📿', cost: { gem: 1 }, love: 2 },   // 💎 최상급 선물 — 친밀도 +2(채굴)
];

let fishState = 'idle';   // 'idle' | 'wait' | 'bite'
let biteAt = 0, biteEnd = 0;
let bobber = null;        // 찌(3D)
const castPos = new THREE.Vector3();
const _v = new THREE.Vector3(); // 임시 벡터

// ── 마을 주민(NPC) 정의 — 각자 이름/색/퀘스트 체인 ───────────────
//   퀘스트 type: chop(벌목) harvest(수확) water(물주기) plant(심기)
//               house(집완성) collect_wood/collect_crop(보유량 달성)
const NPCS = [
  {
    id: 'farmer', name: '농부 삼촌', emoji: '🧑‍🌾', color: 0x9fe0a0, hat: 0xe9c47a, pos: [5, 0, 4],
    quests: [
      { type: 'chop',    target: 3, title: '장작 모으기', desc: '나무 3번 베기',   reward: { seed: 3, coins: 5 },  line: '겨울 대비 장작이 필요해. 나무 3번만 베어줄래?' },
      { type: 'harvest', target: 2, title: '수확의 기쁨', desc: '작물 2개 수확',   reward: { wood: 6, coins: 8 },  line: '밭에서 작물 두 개만 거둬다 주면 목재로 보답하지!' },
      { type: 'water',   target: 4, title: '촉촉하게',   desc: '물 4번 주기',     reward: { seed: 5, coins: 8 },  line: '모종이 목말라 해. 물 네 번만 부탁할게.' },
      { type: 'harvest', target: 6, title: '대풍년',     desc: '작물 6개 수확',   reward: { seed: 6, coins: 15 }, line: '올해는 대풍년을 만들어보자! 여섯 개만 더 거둬줘.' },
    ],
  },
  {
    id: 'builder', name: '목수 아저씨', emoji: '👷', color: 0xd6b48a, hat: 0xc0894f, pos: [-5, 0, 6],
    quests: [
      { type: 'collect_wood', target: 10, title: '목재 납품', desc: '목재 10개 모으기', reward: { crop: 3, coins: 10 },          line: '집 지으려면 목재 10개가 필요해. 모아올 수 있겠어?' },
      { type: 'house',        target: 1,  title: '보금자리',  desc: '집 완성하기',      reward: { seed: 6, crop: 3, coins: 30 }, line: '이제 근사한 집을 완성해보자고!' },
      { type: 'collect_wood', target: 20, title: '큰 창고 짓기', desc: '목재 20개 모으기', reward: { coins: 25 }, line: '마을 창고를 지으려면 목재가 많이 필요해. 스무 개 부탁해!' },
    ],
  },
  {
    id: 'merchant', name: '방랑 상인', emoji: '🧙', color: 0xc9a8ff, hat: 0x8a5cd0, pos: [9, 0, -3],
    quests: [
      { type: 'plant',        target: 3, title: '씨앗 뿌리기', desc: '씨앗 3번 심기',   reward: { wood: 4, coins: 6 }, grant: { seed: 3 }, line: '여기 씨앗 3개를 줄 테니, 세 번 심어보겠소?' },
      { type: 'collect_crop', target: 5, title: '풍년',       desc: '작물 5개 보유',   reward: { seed: 8, coins: 12 }, line: '작물 다섯 개만 모으면 큰 선물을 주겠소!' },
      { type: 'sell',         target: 10, title: '장사의 신',  desc: '상점에서 10개 팔기', reward: { coins: 30 }, line: '장사꾼의 자질이 보이는군! 상점에서 열 개를 팔아보시오.' },
    ],
  },
  {
    id: 'angler', name: '낚시꾼 할아버지', emoji: '🎣', color: 0x9fc0e0, hat: 0x5a7a9a, pos: [9, 0, 14],
    quests: [
      { type: 'fish',      target: 2, title: '첫 낚시',   desc: '물고기 2마리 낚기', reward: { crop: 3, coins: 8 }, line: '호수에서 🎣낚싯대로 물고기 두 마리만 낚아보게!' },
      { type: 'fish',      target: 5, title: '월척 도전', desc: '물고기 5마리 낚기', reward: { seed: 5, coins: 12 }, line: '이번엔 다섯 마리! 물면 바로 낚아채야 하네.' },
      { type: 'fish_rare', target: 1, title: '무지개를 낚아', desc: '희귀 물고기 1마리', reward: { crop: 6, seed: 4, coins: 40 }, line: '전설의 무지개 물고기를 낚아오면 큰 상을 주지!' },
      { type: 'fish',      target: 8, title: '만선의 꿈',   desc: '물고기 8마리 낚기', reward: { crop: 5, coins: 20 }, line: '마지막 도전일세 — 만선의 꿈을 이뤄보게나!' },
    ],
  },
  {
    id: 'chef', name: '요리사 판다', emoji: '🐼', color: 0xe8e4dc, hat: 0xf5f5f5, pos: [0, 0, -8],
    quests: [
      { type: 'collect_crop', target: 3, title: '신선한 재료', desc: '작물 3개 보유',  reward: { coins: 8 },            line: '요리는 재료가 절반! 신선한 작물 세 개를 모아와 줘.' },
      { type: 'cook',         target: 2, title: '오늘의 요리', desc: '요리 2번 하기',  reward: { coins: 12 },           line: '작업대에서 요리 두 번! 버프도 붙으니 일석이조야.' },
      { type: 'cook',         target: 3, title: '풀코스 도전', desc: '요리 3번 하기',  reward: { coins: 20, gem: 1 },   line: '마지막 시험이야 — 풀코스 세 접시를 완성해 봐! 💎 특별 보상이 있어.' },
    ],
  },
  {
    // 📋 데일리 의뢰 담당 — quests 는 매일 refreshDailyQuests() 가 날짜 시드로 채움(전원 동일)
    id: 'courier', name: '의뢰 올빼미', emoji: '🦉', color: 0xb8a98e, hat: 0x7a5c36, pos: [-3, 0, -3],
    daily: true, doneLine: '오늘 의뢰는 전부 끝! 내일 새 의뢰를 가져올게요 🦉',
    quests: [],
  },
];

// ── 데일리 퀘스트 풀 — 매일 3개 뽑기(완료 시 코인 + 🎁럭키박스 확률 보상) ──
const DAILY_POOL = [
  { type: 'chop',    target: 5, title: '오늘의 벌목',  desc: '나무 5번 베기' },
  { type: 'harvest', target: 3, title: '오늘의 수확',  desc: '작물 3개 수확하기' },
  { type: 'water',   target: 5, title: '촉촉한 하루',  desc: '물 5번 주기' },
  { type: 'plant',   target: 3, title: '씨앗 심는 날', desc: '씨앗 3번 심기' },
  { type: 'fish',    target: 3, title: '오늘의 조황',  desc: '물고기 3마리 낚기' },
  { type: 'mine',    target: 4, title: '광산 의뢰',    desc: '광석 4개 캐기' },
  { type: 'sell',    target: 5, title: '장사의 날',    desc: '상점에서 아무거나 5개 팔기' },
];

// 매일 접속 시 호출 — 날짜가 바뀌면 의뢰 리셋 + 날짜 시드로 오늘의 의뢰 3개 생성
function refreshDailyQuests() {
  const def = NPCS.find(n => n.daily); if (!def) return;
  const st = npcState(def.id);
  const today = todayStr();
  if (st.date !== today) {   // 새 날 → 진행 상태 리셋(어제 의뢰는 소멸)
    st.date = today; st.idx = 0; st.progress = 0; st.given = false; st.allDone = false; st.acceptedAt = null;
  }
  def.doneLine = `오늘 의뢰는 전부 끝! ${FORECAST_MSG[FORECAST]}${forecastDexNudge()} 내일 새 의뢰 들고 올게요 🦉`; // 예보로 재방문 유도(+날씨 도감 훅)
  const pool = [...DAILY_POOL];
  let h = dateHash('daily');
  def.quests = Array.from({ length: 3 }, (_, i) => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const q = pool.splice(h % pool.length, 1)[0];
    return { ...q, reward: { coins: 10 + i * 5 }, lucky: true, line: `[오늘의 의뢰 ${i + 1}/3] ${q.desc}! 완료하면 🎁럭키박스도 준다구.` };
  });
}

// 🎁 럭키박스 — 데일리 의뢰 완료 확률 보상(60% 코인 / 25% 씨앗 / 10% 보석 / 5% 대박)
function rollLuckyBox(qid) {
  const r = Math.random();
  const box = r < 0.60 ? { tier: 'coin',    ico: '🪙', reward: { coins: 5 + Math.floor(Math.random() * 11) } }
            : r < 0.85 ? { tier: 'seed',    ico: '🌰', reward: { seed: 4 } }
            : r < 0.95 ? { tier: 'gem',     ico: '💎', reward: { gem: 1 } }
            :            { tier: 'jackpot', ico: '🎉', reward: { coins: 50 } };
  giveReward(box.reward, 'lucky_box', qid);   // [원장] 확률 보상도 출처 기록
  ui.toast?.(`🎁 럭키박스! ${box.ico} ${rewardText(box.reward)}`, 2400);
  if (box.tier !== 'coin') spawnConfetti(player.position.x, 1.4, player.position.z);
  trackEvent('lucky_box', { tier: box.tier, quest_id: qid }); // [GA4] 확률 분포 검증용
}

// ── 게임 상태(저장/불러오기 대상) ────────────────────────────
const gameState = {
  inventory: { wood: 0, seed: 8, crop: 0, fish: 0, coins: 0, coal: 0, stone: 0, gem: 0, egg: 0 }, // + 석탄/돌/보석(채굴) + 달걀(닭장)
  playerPos: { x: 0, z: 0 },
  houseStage: 0,                            // 0=없음 1=기초 2=벽 3=완성
  plots: [],                                // [{x,z,state,growth}] 저장용 스냅샷
  npcs: {},                                 // id별 {idx,progress,given,allDone}
  tutorialSeen: false,                      // 신규 유저 튜토리얼 표시 여부
  house: { decor: [] },                     // 실내 배치 가구 [{id,x,z}]
  upgrades: { axe: false, water: false, rod: false, pot: false }, // 도구 업그레이드(영구) + 🍲 큰 냄비
  outdoor: [],                              // 야외 장식 [{id,x,z}]
  gifts: {},                                // 보유 선물 { id: count }
  affinity: {},                             // 주민 친밀도 { npcId: level }
  hintsSeen: {},                            // 첫 접근 안내 표시 여부 { key: true }
  character: null,                          // 선택한 동물 캐릭터 id
  houseStyle: { roof: 0, wall: 0, door: 0 }, // 집 외관 색(팔레트 인덱스)
  unlocked: { roof: [0], wall: [0], door: [0] }, // 획득한 외관 색(0=기본 항상 보유)
  daily: { lastDate: null, streak: 0 },     // 출석 보상 { 마지막 수령일(YYYY-MM-DD), 연속 일수 }
  dex: { fish: {}, crop: {}, ore: {}, cook: {}, npc: {}, weather: {} }, // 📖 도감 — 카테고리별 { 종id: 첫발견시각(ms) }
  badges: {},                               // 🏅 업적 배지 { id: 획득시각(ms) }
  coop: { built: false, fed: null, collected: null }, // 🐔 닭장 { 건설 여부, 모이 준 날, 달걀 걷은 날(YYYY-MM-DD) }
};

// ── 📖 도감 — 물고기·작물·광물 첫 발견을 수집. 완성 시 보상 ──
//    게스트에겐 마일스톤마다 "로그인하면 영구 보존" 넛지(회원 유치 훅)
const DEX = {
  fish: [
    { id: 'common',   name: '피라미',        ico: '🐟' },
    { id: 'uncommon', name: '붉은 물고기',   ico: '🐠' },
    { id: 'rare',     name: '무지개 물고기', ico: '🌈' },
  ],
  crop: [
    { id: 'carrot',    name: '당근',     ico: '🥕' },
    { id: 'tomato',    name: '토마토',   ico: '🍅' },
    { id: 'blueberry', name: '블루베리', ico: '🫐' },
    { id: 'pumpkin',   name: '호박',     ico: '🎃' },
  ],
  ore: [
    { id: 'stone', name: '돌',   ico: '🪨' },
    { id: 'coal',  name: '석탄', ico: '⚫' },
    { id: 'gem',   name: '보석', ico: '💎' },
  ],
  cook: [
    { id: 'veg_stew',     name: '든든한 채소죽', ico: '🥘' },
    { id: 'grilled_fish', name: '생선 구이',     ico: '🐟' },
    { id: 'lunchbox',     name: '모둠 도시락',   ico: '🍱' },
    { id: 'omelette',     name: '푸짐한 오믈렛', ico: '🍳' },   // 🥚 닭장 해금 후 제작 가능
  ],
  npc: [
    { id: 'farmer',   name: '농부 삼촌',       ico: '🧑‍🌾' },
    { id: 'builder',  name: '목수 아저씨',     ico: '👷' },
    { id: 'merchant', name: '방랑 상인',       ico: '🧙' },
    { id: 'angler',   name: '낚시꾼 할아버지', ico: '🎣' },
    { id: 'courier',  name: '의뢰 올빼미',     ico: '🦉' },
    { id: 'chef',     name: '요리사 판다',     ico: '🐼' },
  ],
  // 🌦️ 날씨 — 그 날씨인 날 접속해야 채워짐(예보와 묶어 재방문 유도)
  weather: [
    { id: 'clear', name: '맑은 날',     ico: '☀️' },
    { id: 'rain',  name: '비 오는 날',  ico: '🌧️' },
    { id: 'snow',  name: '눈 오는 날',  ico: '❄️' },
    { id: 'fog',   name: '안개 낀 날',  ico: '🌫️' },
  ],
};
const DEX_TOTAL = Object.values(DEX).reduce((n, list) => n + list.length, 0);   // 전 카테고리 합(24종)
function dexCount() { return Object.keys(DEX).reduce((n, cat) => n + Object.keys(gameState.dex[cat] || {}).length, 0); }

// 첫 발견 시 도감 등록 — 낚시/수확/채굴 성공 지점에서 호출
function dexDiscover(cat, id) {
  if (!gameState.dex[cat] || gameState.dex[cat][id]) return;   // 이미 등록됨
  gameState.dex[cat][id] = Date.now();
  const entry = DEX[cat].find(e => e.id === id);
  const total = dexCount();
  ui.toast?.(`📖 도감 등록! ${entry?.ico || ''} ${entry?.name || id} (${total}/${DEX_TOTAL})`, 2400);
  spawnSparkle(player.position.x, 1.6, player.position.z, 14);
  trackEvent('dex_discover', { category: cat, entry: id, total });   // [GA4] 수집 퍼널
  if (total === DEX_TOTAL) {                                         // 🎉 도감 완성
    giveReward({ coins: 150 }, 'dex_complete', 'all');               // [원장] 완성 보상
    spawnConfetti(player.position.x, 1.6, player.position.z);
    Sound.complete();
    ui.showHintModal?.({ ico: '📖', title: '도감 완성!', body: `마을의 모든 것 ${DEX_TOTAL}종을 발견했어요! 축하 보상 🪙150 을 받았어요.` });
    trackEvent('dex_complete');                                      // [GA4]
  } else if (total === 5 || total === 12) {
    ui.loginNudge?.('dex' + total);   // 게스트면 "로그인하면 영구 보존" 넛지(index.html 이 판단)
  }
  syncBadges();   // 🏅 날씨 4종·도감 완성 배지 즉시 반영
}

// ── 🏅 업적 배지 — 도감 모달 하단에 전시. 달성 시 1회 기념 보상 ──
//    조건은 syncBadges()가 판정(옛 세이브도 접속 시 소급 지급)
const BADGES = [
  { id: 'house',       name: '내 집 마련',     ico: '🏠', desc: '집 완성하기',            reward: { coins: 20 } },
  { id: 'modern',      name: '드림 하우스',    ico: '🏙️', desc: '모던 하우스까지 증축',    reward: { coins: 100 } },
  { id: 'first_chain', name: '첫 의뢰 완수',   ico: '🎖️', desc: '주민 의뢰 체인 1개 완료', reward: { coins: 20 } },
  { id: 'all_chains',  name: '마을의 영웅',    ico: '👑', desc: '모든 주민 의뢰 완료',     reward: { coins: 50 } },
  { id: 'streak7',     name: '일주일 개근',    ico: '🔥', desc: '7일 연속 출석',          reward: { coins: 30 } },
  { id: 'weather_all', name: '전천후 탐험가',  ico: '🌈', desc: '날씨 4종 모두 경험',      reward: { coins: 30 } },
  { id: 'dex_master',  name: '도감 마스터',    ico: '📖', desc: '도감 전부 채우기',        reward: { coins: 50 } },
];
function badgeCount() { return Object.keys(gameState.badges).length; }

function awardBadge(id) {
  if (gameState.badges[id]) return;                       // 이미 획득
  const b = BADGES.find(x => x.id === id); if (!b) return;
  gameState.badges[id] = Date.now();
  giveReward(b.reward, 'badge', id);                      // [원장] 배지 기념 코인
  Sound.complete();
  spawnConfetti(player.position.x, 1.6, player.position.z);
  ui.toast?.(`🏅 배지 획득! ${b.ico} ${b.name} (+${b.reward.coins}🪙)`, 3200);
  trackEvent('badge_earn', { badge: id, total: badgeCount() });   // [GA4] 업적 퍼널
}

// 배지 조건 일괄 판정 — 접속·퀘스트 완료·집 완성·도감 등록 시점에 호출(멱등)
function syncBadges() {
  if (gameState.houseStage >= 3) awardBadge('house');
  if (gameState.houseStage >= MAX_HOUSE_STAGE) awardBadge('modern');   // 🏙️ 모던 하우스 증축
  const chains = NPCS.filter(n => !n.daily);   // 데일리(올빼미) 제외 상시 의뢰 체인
  const done = chains.filter(n => gameState.npcs[n.id]?.allDone).length;
  if (done >= 1) awardBadge('first_chain');
  if (done === chains.length) awardBadge('all_chains');
  if (gameState.daily.streak >= 7) awardBadge('streak7');
  if (DEX.weather.every(w => gameState.dex.weather?.[w.id])) awardBadge('weather_all');
  if (dexCount() === DEX_TOTAL) awardBadge('dex_master');
}

// 예보 날씨가 아직 도감에 없으면 재방문 훅 문구 — 출석 모달·올빼미 대사에 붙임
function forecastDexNudge() { return gameState.dex.weather?.[FORECAST] ? '' : ' 아직 도감에 없는 날씨예요! 📖'; }

// ── 출석 보상 — 하루 1회, 연속 출석(streak)일수록 커짐. 7일마다 보석 보너스 ──
const DAILY_COINS = [5, 8, 12, 16, 20, 25, 30];   // 1~7일차(이후 30 고정)
function checkDailyBonus() {
  const d = gameState.daily;
  const today = todayStr();
  if (d.lastDate === today) return;                              // 오늘 이미 받음
  d.streak = (d.lastDate === todayStr(-1)) ? d.streak + 1 : 1;   // 어제 접속했으면 연속, 아니면 1일차
  d.lastDate = today;
  const coins = DAILY_COINS[Math.min(d.streak, 7) - 1];
  const reward = { coins };
  if (d.streak > 0 && d.streak % 7 === 0) reward.gem = 1;        // 7일 연속마다 💎
  giveReward(reward, 'daily_bonus', 'day' + d.streak);           // [원장] 출석 코인
  trackEvent('daily_bonus', { streak: d.streak, coins });         // [GA4] 리텐션 KPI
  let body = `연속 ${d.streak}일째 방문! ${rewardText(reward)} 받았어요.` +
    (reward.gem ? ' 7일 연속 보너스 💎!' : ' 내일 또 오면 보상이 더 커져요!');
  if (WEATHER !== 'clear') body += ' ' + WEATHER_MSG[WEATHER]; // 모달이 토스트를 가리므로 날씨 안내를 합쳐서 표시
  body += ' 🔮 ' + FORECAST_MSG[FORECAST] + forecastDexNudge(); // 내일 예보 — 재방문 유도(+날씨 도감 훅)
  if (gameState.character && gameState.tutorialSeen) { ui.showHintModal?.({ ico: '🎁', title: `출석 ${d.streak}일차`, body }); return true; }
  ui.toast?.(`🎁 출석 보상 +${coins}🪙`);                         // 신규 유저: 캐릭터 선택/튜토리얼과 안 겹치게 토스트만
  return false;
}

// 스테이션 첫 접근 시 1회만 뜨는 카드 모달 안내(초보 온보딩)
function firstHint(key, ico, title, body) {
  if (gameState.hintsSeen[key]) return;
  gameState.hintsSeen[key] = true;
  ui.showHintModal?.({ ico, title, body });
}

let indoor = false;        // 실내(집 안) 여부
let nearDoor = null;       // 'enter' | 'exit' | null
let lastDoorPrompt = null; // 도어/빌드 프롬프트 중복 갱신 방지
let lastNearHouse = false; // 🎨 집 근처 여부(외관 꾸미기 버튼 표시) 변화 감지
let placingDecor = null;   // 배치 중인 가구 id
let decorRot = 0;          // 배치 방향(0~3 → 90°씩) — 가로/세로 전환
let interiorGroup, interiorFloor, interiorLamp;
const decorMeshes = [];    // 배치된 가구 메시

let mode = 'attract';   // 'attract'(로그인 배경) | 'play'(플레이)
let dayPaused = false;  // 낮/밤 자동 순환 정지 여부(수동 조절 시)
const npcObjs = [];     // 런타임 NPC 객체들
let nearNPC = null;     // 현재 근접한 NPC(런타임 객체) 또는 null

// 씬 전역 참조
let renderer, scene, camera, composer, bloomPass, gradePass;
let player, playerAnchor, playerLight;
let playerBody, playerBelly, playerHead, playerArm, earGroup;   // 캐릭터(동물) 파츠
// ── 선택 가능한 동물 캐릭터 7종 ──
const ANIMALS = [
  { id: 'fox',    name: '여우',   emoji: '🦊', body: 0xe07b3c, belly: 0xf5e9d8, ear: 0x8a4a24, ears: 'pointy' },
  { id: 'dog',    name: '강아지', emoji: '🐶', body: 0xc9945a, belly: 0xf0e2cc, ear: 0x8a6038, ears: 'floppy' },
  { id: 'rabbit', name: '토끼',   emoji: '🐰', body: 0xe6e0dc, belly: 0xffffff, ear: 0xf0c0c8, ears: 'long' },
  { id: 'cat',    name: '고양이', emoji: '🐱', body: 0x9aa0a8, belly: 0xf0f0f0, ear: 0xf0b0b8, ears: 'pointy' },
  { id: 'bear',   name: '곰',     emoji: '🐻', body: 0x8a6038, belly: 0xc9a878, ear: 0x6a4828, ears: 'round' },
  { id: 'panda',  name: '판다',   emoji: '🐼', body: 0xf2f2f2, belly: 0xffffff, ear: 0x2a2a2a, ears: 'round' },
  { id: 'chick',  name: '병아리', emoji: '🐤', body: 0xffe05a, belly: 0xfff0a0, ear: 0xffb020, ears: 'none' },
];
let heldGroup, handAnchor, heldToolMesh; // 팔(어깨 피벗) / 손 / 든 도구
let sunLight, hemiLight, ambient;
let fireflies, stars;
const trees = [];
const swayables = [];
const particles = [];
const plots = [];                 // 밭 목록 (런타임 객체)
const obstacles = [];             // 밭 만들기 금지 구역 {x,z,r} (나무·호수·벤치·가로등·집)
const houseWindows = [];          // 밤에 빛나는 창문 머티리얼
let houseGroup, houseGhost;       // 집 그룹 / 미완성 터 표시
let houseSign, houseSignTex, houseSignCtx; // 집 터 안내판(멀리서도 보임)

// ── 집 외관 커스터마이징 팔레트(지붕/벽/문 색) ──
const ROOF_COLORS = [0xb5734a, 0xd05a5a, 0x5a86d0, 0x5aa86a, 0x9a6ad0];  // 갈색·빨강·파랑·초록·보라
const WALL_COLORS = [0xd2a068, 0xe8c99a, 0xa9805a, 0xc9c0aa, 0xe0b0b0];  // 기본·밝은나무·진한나무·회벽·핑크
const DOOR_COLORS = [0xa9743f, 0x8a5a3a, 0x5a6a8a, 0x5a8a6a, 0xd0a050];  // 갈색·진갈·파랑·초록·황금
const PART_NAME = { roof: '지붕', wall: '벽', door: '문' };
const PART_COLORS = () => ({ roof: ROOF_COLORS, wall: WALL_COLORS, door: DOOR_COLORS });
// 확률(chance)로 잠긴 외관 색 하나를 랜덤 언락 → "오늘 뭐 나올까" 리텐션 훅
function tryUnlockDrop(chance) {
  if (Math.random() > chance) return;
  const cols = PART_COLORS(); const pool = [];
  for (const p in cols) for (let i = 0; i < cols[p].length; i++) if (!gameState.unlocked[p].includes(i)) pool.push([p, i]);
  if (!pool.length) return;                       // 이미 다 열림
  const [part, idx] = pool[(Math.random() * pool.length) | 0];
  gameState.unlocked[part].push(idx);
  Sound.harvest();
  spawnSparkle(player.position.x, 1.2, player.position.z, 20);
  if (!gameState.hintsSeen.colorUnlock) {          // 첫 획득 → 시스템 안내 모달(온보딩)
    firstHint('colorUnlock', '🎨', '새 집 색을 얻었어요!',
      '낚시·수확·주민 퀘스트·집 완성으로 집 외관 색을 모을 수 있어요. 집 근처에서 🎨 꾸미기 버튼으로 지붕·벽·문에 적용해보세요!');
  } else {
    ui.toast?.(`🎨 새 ${PART_NAME[part]} 색을 얻었어요! 집 앞 🎨 버튼에서 적용해보세요`, 4200);
  }
  trackEvent('color_unlock', { part, idx });      // [GA4]
}
function applyHouseStyle() {
  if (!houseGroup) return;
  houseGroup.traverse(o => {
    if (!o.isMesh || !o.userData.role || !o.material) return;
    if (o.userData.role === 'roof') o.material.color.setHex(ROOF_COLORS[gameState.houseStyle.roof % ROOF_COLORS.length]);
    else if (o.userData.role === 'wall') o.material.color.setHex(WALL_COLORS[gameState.houseStyle.wall % WALL_COLORS.length]);
    else if (o.userData.role === 'door') o.material.color.setHex(DOOR_COLORS[gameState.houseStyle.door % DOOR_COLORS.length]);
  });
}
const HOUSE_POS = new THREE.Vector3(-8, 0, -8); // 정해진 집 터 위치
const clock = new THREE.Clock();

// 입력 상태
const keys = {};
const analog = { x: 0, z: 0 };    // 모바일 조이스틱 아날로그 이동(-1~1)
let wantAction = false;
let timeOfDay = 0.30;
const DAY_SPEED = 0.002;   // 전체 낮/밤 주기 ≈ 8분(기존 ~2분에서 완만하게)
let ui = {};

// 파스텔 팔레트
const PAL = {
  ground: 0xbfe8c9, groundDark: 0xa9dcb6,
  trunk: 0xd8a679, leaf1: 0x8fd6a0, leaf2: 0xb7e6a8, leaf3: 0xa0e0d0,
  body: 0xfff2d6, belly: 0xffd9a8, hat: 0xff9e9e,
  wood: 0xd9a066, sky: 0xdff3ff,
  soil: 0x9c6b4a, soilWet: 0x7c5236,
  sprout: 0x7fce7f, crop: 0xff9e5e, cropLeaf: 0x86d18a,
  wall: 0xffe3c4, roof: 0xff9e9e, window: 0xfff2a8,
};

// =============================================================
//  입력 API (키보드 + 모바일 터치 컨트롤이 함께 사용)
// =============================================================
export const Input = {
  setAnalog(x, z) { analog.x = x; analog.z = z; },      // 조이스틱 벡터
  doAction() { wantAction = true; },                    // 액션 버튼/클릭/Space (도구질)
  doTalk() { if (!indoor && nearNPC) talkToNPC(); },    // 전용 "대화하기" 버튼(모바일) — 도구질과 분리
  selectTool(i) { if (placingOutdoor) { placingOutdoor = null; ui.onDecorPlaced?.(); } currentTool = (i + TOOLS.length) % TOOLS.length; ui.setTool?.(currentTool, TOOLS); setHeldTool(TOOLS[currentTool].id); Sound.blip(); },
  getTools() { return TOOLS; },
  setTimeOfDay(f) { timeOfDay = ((f % 1) + 1) % 1; dayPaused = true; }, // 슬라이더로 시간 지정(수동 → 정지)
  toggleDayFlow() { dayPaused = !dayPaused; return dayPaused; },        // 자동 순환 재생/정지
  armTutorialMove() { movedOnce = false; },  // 튜토리얼 시작 시 이동 스텝 재감지
  getDecor() { return DECOR; },
  getRecipes() { return RECIPES; },                     // 요리 레시피 목록
  craftCook(id) { return craftCook(id); },              // 요리 제작(작업대)
  getUpgrades() { return UPGRADES; },                   // 도구 업그레이드 목록
  ownedUpgrades() { return { ...gameState.upgrades }; }, // 보유 업그레이드
  craftUpgrade(id) { return craftUpgrade(id); },        // 업그레이드 제작
  getOutdoor() { return OUTDOOR; },                     // 야외 장식 목록
  selectOutdoor(id) { placingOutdoor = id; },           // 야외 장식 선택(설치 대기)
  cancelOutdoor() { placingOutdoor = null; },           // 야외 배치 취소
  getSellPrice() { const p = {}; for (const k in SELL_PRICE) p[k] = priceOf(k); return p; }, // 오늘의 시세 반영가
  getPriceRates() { const r = {}; for (const k in SELL_PRICE) r[k] = Math.round(priceRate(k) * 100); return r; }, // 시세 %(100=기본가)
  // 📖 도감 — 카탈로그 + 발견 여부 + 🏅 배지(도감 모달 렌더용)
  getDex() {
    const cats = {};
    for (const cat in DEX) cats[cat] = DEX[cat].map(e => ({ ...e, found: !!gameState.dex[cat]?.[e.id] }));
    const badges = BADGES.map(b => ({ id: b.id, name: b.name, ico: b.ico, desc: b.desc, earned: !!gameState.badges[b.id] }));
    return { cats, count: dexCount(), total: DEX_TOTAL, badges, badgeCount: badgeCount(), badgeTotal: BADGES.length };
  },
  getShopBuy() { return SHOP_BUY; },                    // 구매 목록
  sellItem(k, all) { return sellItem(k, all); },        // 자원 판매
  buyShop(id) { return buyShop(id); },                  // 아이템 구매
  getGifts() { return GIFTS; },                         // 선물 종류
  ownedGifts() { return { ...gameState.gifts }; },      // 보유 선물 수
  craftGift(id) { return craftGift(id); },              // 선물 제작
  giveGift(id) { return giveGift(id); },                // 근처 주민에게 선물
  affinityOf(npcId) { return gameState.affinity[npcId] || 0; }, // 친밀도
  capturePhoto() { try { return renderer.domElement.toDataURL('image/png'); } catch (e) { return null; } }, // 사진 캡처(현재 화면 그대로)
  captureActionShot() { return startActionShot(); },  // 📷 밀착 액션샷(포즈 정점 캡처, Promise<dataURL>)
  toggleSit() { sitting = !sitting; if (sitting) Sound.blip(); },   // 앉기 토글
  // 캐릭터(동물) 선택
  getAnimals() { return ANIMALS.map(a => ({ id: a.id, name: a.name, emoji: a.emoji })); },
  createCharacterPreview(canvas) { return makeCharacterPreview(canvas); }, // 선택화면 3D 프리뷰
  hasCharacter() { return !!gameState.character; },
  setCharacter(id) { gameState.character = id; applyCharacter(id); Sound.blip(); trackEvent('character_select', { animal: id }); }, // [GA4]
  needsTutorial() { return !gameState.tutorialSeen; },
  markTutorialSeen() { gameState.tutorialSeen = true; },
  // 집 외관 커스터마이징
  getHouseStyle() { return { style: { ...gameState.houseStyle }, unlocked: { roof: [...gameState.unlocked.roof], wall: [...gameState.unlocked.wall], door: [...gameState.unlocked.door] }, roof: ROOF_COLORS, wall: WALL_COLORS, door: DOOR_COLORS }; },
  setHousePart(part, idx) {
    if (!(part in gameState.houseStyle)) return { ok: false };
    if (!gameState.unlocked[part].includes(idx)) return { ok: false, locked: true };
    gameState.houseStyle[part] = idx; applyHouseStyle(); Sound.blip(); return { ok: true };
  },
  houseBuilt() { return gameState.houseStage >= 3; },
  getExpansion() { return expandInfo(); },       // 🏗️ 증축 정보(외관 메뉴 렌더용)
  expandHouse() { return doExpand(); },          // 🏗️ 증축 실행(외관 메뉴 버튼)
  emote(e) {   // 머리 위 이모지 + 기분에 맞는 캐릭터 모션(춤·점프·하트·인사)
    spawnFloatText(player.position.x, 2.7, player.position.z, e, '#4a5a40');
    const m = EMOTE_MOTION[e];
    if (m) startEmote(m[0], m[1]);
    if (e === '❤️' || e === '🎵') Sound.harvest(); else Sound.blip();
  },
  selectDecor(id) { placingDecor = id; setHeldDecor(id); },    // 가구 선택 → 손에 들고 바닥 탭/Space로 배치
  cancelDecor() { placingDecor = null; setHeldTool(TOOLS[currentTool].id); },
  rotateDecor() { decorRot = (decorRot + 1) % 4; if (placingDecor) setHeldDecor(placingDecor); return decorRot; }, // 가로/세로 회전
  getDecorRot() { return decorRot; },
  isIndoor() { return indoor; },
};

// =============================================================
//  진입점
// =============================================================
// ① 로그인 화면 뒤에서 도는 "어트랙트" 씬 부팅 (플레이어 조작 X)
export async function bootWorld(uiCallbacks) {
  ui = uiCallbacks || {};
  initRenderer();
  initScene();
  initLights();
  buildWorld();
  buildHouseGhost();
  buildInterior();          // 집 실내 방(꾸미기 공간)
  buildNPCs();              // 마을 주민들
  initPostProcessing();
  initInput();
  initSound();
  ui.setTool?.(currentTool, TOOLS);
  window.addEventListener('resize', onResize);
  player.visible = false;   // 로그인 중엔 캐릭터 숨김(카메라 자동 오빗)
  mode = 'attract';
  animate();
}

// ② 로그인 완료 후 실제 플레이 시작 (저장 로드 + 로깅 + 조작 on)
export async function enterGame() {
  const saved = await loadGame();      // [Supabase] 저장 불러오기(오프라인이면 null)
  if (saved) applySave(saved);
  // 테스트: ?house=4|5|6 — 증축 단계 미리보기(?weather= 와 같은 개발용 파라미터)
  const _hq = parseInt(_wq.get('house') || '', 10);
  if (_hq >= 1 && _hq <= MAX_HOUSE_STAGE) for (let s = gameState.houseStage + 1; s <= _hq; s++) buildHouseStage(s, true);
  if (_wq.get('coop') === '1' && !gameState.coop.built) buildCoop(true);   // 테스트: ?coop=1 — 닭장 미리보기
  refreshDailyQuests();                // [데일리] 오늘 의뢰 준비 — 글리프 갱신 전에(빈 quests 접근 방지)
  refreshInventoryUI();
  ui.setTool?.(currentTool, TOOLS);
  ui.setQuest?.(null);                  // 퀘스트 패널은 주민 근처에서 표시
  npcObjs.forEach(updateNPCGlyph);     // 저장 복원 후 말풍선 상태 반영
  player.visible = true;
  player.position.set(gameState.playerPos.x || 0, 0, gameState.playerPos.z || 0);
  // 테스트: ?spawn=x,z — 시작 위치 지정(?weather=/?house= 와 같은 개발용)
  const _sp = (_wq.get('spawn') || '').split(',').map(Number);
  if (_sp.length === 2 && _sp.every(Number.isFinite)) player.position.set(_sp[0], 0, _sp[1]);
  mode = 'play';
  movedOnce = false;
  startLogging();                      // [센서] 배치 전송 시작
  startMetrics(() => ({                // [계측] 세션 요약(60초/이탈 시 upsert)용 스냅샷
    coins: gameState.inventory.coins || 0,
    place: indoor ? 'house' : atFarm ? 'farm' : atMine ? 'mine' : 'village',
    x: player.position.x, z: player.position.z,
  }));
  const bonusModal = checkDailyBonus(); // [출석] 오늘 첫 접속이면 보상 지급(모달 표시 여부 반환)
  if (WEATHER !== 'clear') {            // [날씨] 궂은 날 안내 + 세션 태깅
    if (!bonusModal) ui.toast?.(WEATHER_MSG[WEATHER], 2800);   // 출석 모달에 이미 합쳐 안내했으면 생략
    if (RAIN_DAY) startRainSound();
    trackEvent('weather_day', { type: WEATHER }); // [GA4] 세션 요약 counts 에 자동 집계 → 날씨별 행동 비교
  }
  dexDiscover('weather', WEATHER);      // 🌦️ 날씨 도감 — 오늘 날씨를 겪어야 등록(재방문 훅)
  syncBadges();                         // 🏅 옛 세이브 소급 지급(집·체인·스트릭 등)

  // 신규: 캐릭터(동물) 미선택이면 선택 화면 → 그 뒤 튜토리얼. 이미 선택했으면 튜토리얼만.
  if (!gameState.character) ui.showCharacterSelect?.();
  else if (!gameState.tutorialSeen) { gameState.tutorialSeen = true; ui.showTutorial?.(); }
}

function applySave(saved) {
  if (saved.inventory) Object.assign(gameState.inventory, saved.inventory);
  if (typeof saved.timeOfDay === 'number') timeOfDay = saved.timeOfDay; // 시간대 복원
  if (saved.tutorialSeen) gameState.tutorialSeen = true;                 // 튜토리얼 이미 봄
  if (saved.house && Array.isArray(saved.house.decor)) {                 // 실내 가구 복원
    gameState.house.decor = [];
    saved.house.decor.forEach(d => placeDecor(d.id, INT.x + d.x, INT.z + d.z, true, d.rot || 0));
  }
  if (saved.npcs) gameState.npcs = { ...gameState.npcs, ...saved.npcs }; // NPC 퀘스트 복원
  if (saved.daily) gameState.daily = { ...gameState.daily, ...saved.daily }; // 출석 스트릭 복원
  if (saved.dex) gameState.dex = { fish: {}, crop: {}, ore: {}, cook: {}, npc: {}, weather: {}, ...saved.dex }; // 📖 도감 복원
  if (saved.badges) gameState.badges = { ...saved.badges };              // 🏅 배지 복원
  if (saved.coop) { gameState.coop = { ...gameState.coop, ...saved.coop }; if (gameState.coop.built) buildCoop(true); } // 🐔 닭장 복원
  if (saved.upgrades) gameState.upgrades = { ...gameState.upgrades, ...saved.upgrades }; // 도구 업그레이드 복원
  if (Array.isArray(saved.outdoor)) saved.outdoor.forEach(o => placeOutdoor(o.x, o.z, true, o.id)); // 야외 장식 복원
  if (saved.gifts) gameState.gifts = { ...saved.gifts };             // 보유 선물 복원
  if (saved.affinity) gameState.affinity = { ...saved.affinity };    // 친밀도 복원
  if (saved.hintsSeen) gameState.hintsSeen = { ...saved.hintsSeen }; // 안내 표시 이력 복원
  if (saved.character) { gameState.character = saved.character; applyCharacter(saved.character); } // 캐릭터 복원
  if (saved.houseStyle) { gameState.houseStyle = { ...gameState.houseStyle, ...saved.houseStyle }; applyHouseStyle(); } // 집 외관 복원
  if (saved.unlocked) { for (const p of ['roof', 'wall', 'door']) if (Array.isArray(saved.unlocked[p])) gameState.unlocked[p] = [...new Set([0, ...saved.unlocked[p]])]; } // 획득 색 복원
  if (typeof saved.houseStage === 'number') {
    for (let s = 1; s <= saved.houseStage; s++) buildHouseStage(s, true); // 조용히 복원
  }
  if (Array.isArray(saved.plots)) {
    saved.plots.forEach(p => {
      if (dist2D({ x: p.x, z: p.z }, INT) < 6) return; // 실내에 잘못 생긴 밭 제거
      const plot = createPlot(p.x, p.z, true);
      plot.state = p.state; plot.growth = p.growth || 0; plot.stage = -1;
      if (p.state === 'growing' || p.state === 'mature') {
        plot.cropType = CROP_TYPES[Math.floor(Math.random() * CROP_TYPES.length)];
        refreshCropStage(plot);   // growth에 맞는 단계 메시 복원
      }
      updatePlotVisual(plot);
    });
  }
}

export function getGameState() {
  gameState.playerPos = { x: player.position.x, z: player.position.z };
  gameState.plots = plots.map(p => ({ x: p.x, z: p.z, state: p.state, growth: p.growth }));
  gameState.timeOfDay = timeOfDay;   // 시간대 저장
  return gameState;
}
export async function requestSave() { return await saveGame(getGameState()); }

// =============================================================
//  렌더러 / 씬 / 조명
// =============================================================
function initRenderer() {
  // 모바일은 안티앨리어싱 off + 픽셀비율 상한을 낮춰 GPU 부담 감소
  renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, powerPreference: 'high-performance', preserveDrawingBuffer: true }); // preserveDrawingBuffer: 사진 캡처용
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = IS_MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.getElementById('app').appendChild(renderer.domElement);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.sky);
  scene.fog = new THREE.Fog(PAL.sky, 18, 74); // 옅고 넓게 퍼지는 거리 안개(부드러운 거리감)

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 14, 16);
  camera.lookAt(0, 0, 0);
}

function initLights() {
  hemiLight = new THREE.HemisphereLight(0xffffff, 0xbfe8c9, 0.9);
  scene.add(hemiLight);
  ambient = new THREE.AmbientLight(0xfff0dd, 0.25);
  scene.add(ambient);

  sunLight = new THREE.DirectionalLight(0xffe9c4, 1.1);
  sunLight.position.set(10, 18, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(IS_MOBILE ? 1024 : 2048, IS_MOBILE ? 1024 : 2048); // 모바일 그림자 해상도 ↓
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 60;
  sunLight.shadow.camera.left = -30; sunLight.shadow.camera.right = 30;
  sunLight.shadow.camera.top = 30; sunLight.shadow.camera.bottom = -30;
  sunLight.shadow.bias = -0.0005; sunLight.shadow.radius = 6;
  scene.add(sunLight); scene.add(sunLight.target);
}

function clayMat(color, flat = true) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.0, flatShading: flat });
}

// =============================================================
//  월드 구성
// =============================================================
function buildWorld() {
  const groundGeo = new THREE.CircleGeometry(60, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, clayMat(PAL.ground, false));
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i = 0; i < 40; i++) {
    const r = 6 + Math.random() * 26, a = Math.random() * Math.PI * 2;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 2.5, 12), clayMat(PAL.groundDark, false));
    patch.geometry.rotateX(-Math.PI / 2);
    patch.position.set(Math.cos(a) * r, 0.01, Math.sin(a) * r);
    patch.receiveShadow = true;
    scene.add(patch);
  }

  for (let i = 0; i < 14; i++) {
    let x, z, tries = 0;
    do {                                              // 호수·집터·작업대 위에 안 생기게 재시도
      const r = 8 + Math.random() * 22, a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * r; z = Math.sin(a) * r; tries++;
    } while (tries < 24 && (dist2D({ x, z }, LAKE) < LAKE_R + 2.5 || dist2D({ x, z }, HOUSE_POS) < 3.5 || dist2D({ x, z }, BENCH) < 2.5 || dist2D({ x, z }, SHOP) < 2.5 || dist2D({ x, z }, FARM_GATE) < 2.5 || dist2D({ x, z }, MINE_GATE) < 2.5 || dist2D({ x, z }, COOP) < 3.5));
    spawnTree(x, z);
  }

  spawnWorkbench();   // 작업대(요리)
  spawnShop();        // 상점 좌판
  spawnMarketBoard(); // 📊 시세 전광판(상점 옆)
  spawnFarmGate();    // 텃밭 입구 게이트
  buildFarm();        // 개인 텃밭 필드
  spawnMineGate();    // 채굴 동굴 입구
  buildMine();        // 채굴 동굴

  for (let i = 0; i < (IS_MOBILE ? 40 : 80); i++) {   // 모바일 풀 개수 ↓
    const r = 4 + Math.random() * 30, a = Math.random() * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 5), clayMat([PAL.leaf1, PAL.leaf2, PAL.leaf3][i % 3]));
    blade.position.set(Math.cos(a) * r, 0.35, Math.sin(a) * r);
    blade.castShadow = true;
    blade.userData.swayPhase = Math.random() * Math.PI * 2;
    scene.add(blade); swayables.push(blade);
  }

  buildPlayer();
  buildFireflies();
  buildStars();
  buildRain();              // 🌧️ 빗줄기(비 오는 날에만 표시)
  buildEnvironment();
}

function spawnTree(x, z) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 7), clayMat(PAL.trunk));
  trunk.position.y = 0.8; trunk.castShadow = true; tree.add(trunk);

  const leafColor = [PAL.leaf1, PAL.leaf2, PAL.leaf3][Math.floor(Math.random() * 3)];
  const canopy = new THREE.Group(); canopy.position.y = 2.0;
  [[0, 0.4, 0, 1.2], [0.7, 0, 0.2, 0.85], [-0.6, 0.05, -0.3, 0.9], [0.1, 0.9, -0.2, 0.7]].forEach(([bx, by, bz, s]) => {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), clayMat(leafColor));
    blob.position.set(bx, by, bz); blob.castShadow = true; canopy.add(blob);
  });
  tree.add(canopy);
  canopy.userData.swayPhase = Math.random() * Math.PI * 2; swayables.push(canopy);

  tree.userData = { hp: 3, canopy, trunk, squash: 0, fallen: false, respawnAt: 0, leafColor };
  scene.add(tree); trees.push(tree);
  obstacles.push({ x, z, r: 1.3 }); // 나무 밑엔 밭 금지
}

function buildPlayer() {
  playerAnchor = new THREE.Group();
  player = new THREE.Group();
  player.add(playerAnchor);

  // 밤/새벽에 켜지는 캐릭터 주변 횃불 조명(따뜻한 원형 빛)
  playerLight = new THREE.PointLight(0xffb95e, 0, 16, 1.3); // (색, 강도, 거리, 감쇠) — 넓은 반경
  playerLight.position.set(0, 1.5, 0);
  player.add(playerLight);

  playerBody = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), clayMat(PAL.body, false));
  playerBody.position.y = 0.6; playerBody.castShadow = true; playerBody.scale.set(1, 1.05, 1); playerAnchor.add(playerBody);
  playerBelly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), clayMat(PAL.belly, false));
  playerBelly.position.set(0, 0.5, 0.32); playerBelly.scale.set(1, 1.1, 0.6); playerAnchor.add(playerBelly);
  playerHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), clayMat(PAL.body, false));
  playerHead.position.y = 1.25; playerHead.castShadow = true; playerAnchor.add(playerHead);
  earGroup = new THREE.Group(); playerAnchor.add(earGroup);   // 동물 귀(캐릭터별)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
  [-0.14, 0.14].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat);
    eye.position.set(ex, 1.3, 0.34); playerAnchor.add(eye);
  });

  // 오른팔 + 손 — 팔을 옆으로 벌려 도구가 몸 밖에 보이게(원래 보이던 자세 + 바깥으로 이동)
  heldGroup = new THREE.Group();
  heldGroup.position.set(0.78, 0.9, 0.06);   // 오른쪽으로 더 벌림
  heldGroup.rotation.set(-0.1, 0, -0.55);
  playerAnchor.add(heldGroup);
  playerArm = null;  // 팔(막대) 제거 — 도구만 옆에 보이게
  handAnchor = new THREE.Group(); handAnchor.position.set(0, -0.3, 0.08); heldGroup.add(handAnchor);
  setHeldTool(TOOLS[currentTool].id);
  applyCharacter(gameState.character || 'fox');   // 기본 여우(선택 전)

  player.position.set(gameState.playerPos.x, 0, gameState.playerPos.z);
  scene.add(player);
}

// 동물 귀 만들기(캐릭터별)
function buildEars(a) {
  while (earGroup.children.length) earGroup.remove(earGroup.children[0]);
  const mat = clayMat(a.ear, false);
  if (a.ears === 'pointy') {
    [-0.2, 0.2].forEach(x => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 5), mat); e.position.set(x, 1.6, -0.02); e.rotation.z = x > 0 ? -0.25 : 0.25; e.castShadow = true; earGroup.add(e); });
  } else if (a.ears === 'long') {
    [-0.16, 0.16].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat); e.scale.set(0.7, 2.6, 0.55); e.position.set(x, 1.8, 0); e.rotation.z = x > 0 ? -0.12 : 0.12; e.castShadow = true; earGroup.add(e); });
  } else if (a.ears === 'floppy') {
    [-0.3, 0.3].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat); e.scale.set(0.6, 1.5, 0.4); e.position.set(x, 1.35, 0); e.rotation.z = x > 0 ? -0.5 : 0.5; e.castShadow = true; earGroup.add(e); });
  } else if (a.ears === 'round') {
    [-0.26, 0.26].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat); e.position.set(x, 1.55, -0.02); e.castShadow = true; earGroup.add(e); });
  } else if (a.ears === 'none') {   // 병아리: 부리
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), clayMat(0xff9a3a, false)); beak.position.set(0, 1.22, 0.42); beak.rotation.x = Math.PI / 2; earGroup.add(beak);
  }
}

// 선택한 동물로 캐릭터 외형 적용
function applyCharacter(id) {
  const a = ANIMALS.find(x => x.id === id) || ANIMALS[0];
  if (playerBody) playerBody.material.color.setHex(a.body);
  if (playerHead) playerHead.material.color.setHex(a.body);
  if (playerArm) playerArm.material.color.setHex(a.body);
  if (playerBelly) playerBelly.material.color.setHex(a.belly);
  buildEars(a);
}

// ── 캐릭터 선택 화면용: 독립적인 캐릭터 메시(도구/팔 없음) ──
function buildCharacterMesh(id) {
  const a = ANIMALS.find(x => x.id === id) || ANIMALS[0];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), clayMat(a.body, false));
  body.position.y = 0.6; body.scale.set(1, 1.05, 1); g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), clayMat(a.belly, false));
  belly.position.set(0, 0.5, 0.32); belly.scale.set(1, 1.1, 0.6); g.add(belly);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), clayMat(a.body, false));
  head.position.y = 1.25; g.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
  [-0.14, 0.14].forEach(ex => { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat); eye.position.set(ex, 1.3, 0.34); g.add(eye); });
  const mat = clayMat(a.ear, false);
  if (a.ears === 'pointy') {
    [-0.2, 0.2].forEach(x => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 5), mat); e.position.set(x, 1.6, -0.02); e.rotation.z = x > 0 ? -0.25 : 0.25; g.add(e); });
  } else if (a.ears === 'long') {
    [-0.16, 0.16].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat); e.scale.set(0.7, 2.6, 0.55); e.position.set(x, 1.8, 0); e.rotation.z = x > 0 ? -0.12 : 0.12; g.add(e); });
  } else if (a.ears === 'floppy') {
    [-0.3, 0.3].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat); e.scale.set(0.6, 1.5, 0.4); e.position.set(x, 1.35, 0); e.rotation.z = x > 0 ? -0.5 : 0.5; g.add(e); });
  } else if (a.ears === 'round') {
    [-0.26, 0.26].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat); e.position.set(x, 1.55, -0.02); g.add(e); });
  } else if (a.ears === 'none') {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), clayMat(0xff9a3a, false)); beak.position.set(0, 1.22, 0.42); beak.rotation.x = Math.PI / 2; g.add(beak);
  }
  return g;
}

// ── 선택 화면 3D 프리뷰(드래그로 회전 + 살짝 자동 스핀) ──
function makeCharacterPreview(canvas) {
  const rend = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  rend.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  cam.position.set(0, 1.05, 4.6); cam.lookAt(0, 0.95, 0);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x9ab0a0, 1.05));
  const key = new THREE.DirectionalLight(0xfff2d8, 1.15); key.position.set(2.5, 4, 3); sc.add(key);
  const rim = new THREE.DirectionalLight(0xbfe8ff, 0.45); rim.position.set(-3, 2, -2); sc.add(rim);
  const pivot = new THREE.Group(); sc.add(pivot);
  let mesh = null, rotY = 0.5, rotX = 0, dragging = false, lx = 0, ly = 0, autoSpin = true, raf = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function setAnimal(id) { if (mesh) pivot.remove(mesh); mesh = buildCharacterMesh(id); pivot.add(mesh); autoSpin = true; }
  function resize() {
    const w = canvas.clientWidth || 220, h = canvas.clientHeight || 240;
    rend.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function loop() { raf = requestAnimationFrame(loop); if (autoSpin && !dragging) rotY += 0.006; pivot.rotation.y = rotY; pivot.rotation.x = rotX; rend.render(sc, cam); }
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => { dragging = true; autoSpin = false; lx = e.clientX; ly = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; rotY += (e.clientX - lx) * 0.011; rotX = clamp(rotX + (e.clientY - ly) * 0.008, -0.5, 0.5); lx = e.clientX; ly = e.clientY; });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  resize(); loop();
  return { setAnimal, resize };
}

// 손에 든 도구 메시(도구 전환 시 교체)
function toolMesh(id) {
  const g = new THREE.Group();
  const wood = (l) => new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, l, 6), clayMat(0x8a5a3a));
  if (id === 'axe') {
    const h = wood(0.5); h.position.y = 0.15; g.add(h);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.05), clayMat(0xb84a3e)); head.position.set(0.07, 0.36, 0); g.add(head);
  } else if (id === 'hoe') {
    const h = wood(0.5); h.position.y = 0.15; g.add(h);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.18), clayMat(0x9aa0a4)); blade.position.set(0, 0.4, 0.08); blade.rotation.x = 0.9; g.add(blade);
  } else if (id === 'seed') {
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), clayMat(0xcaa06a)); bag.position.y = 0.08; bag.scale.set(1, 1.15, 1); g.add(bag);
  } else if (id === 'water') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 10), clayMat(0x8fd0ea)); body.position.y = 0.18; g.add(body);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.22, 6), clayMat(0x8fd0ea)); spout.position.set(0.15, 0.26, 0); spout.rotation.z = -0.9; g.add(spout);
  } else if (id === 'sickle') {
    const h = wood(0.34); h.position.y = 0.1; g.add(h);
    const blade = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 10, Math.PI), clayMat(0xc9ced2)); blade.position.set(0.05, 0.3, 0); blade.rotation.set(Math.PI / 2, 0, 0.3); g.add(blade);
  } else if (id === 'hammer') {
    const h = wood(0.5); h.position.y = 0.15; g.add(h);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.1), clayMat(0x6a6f74)); head.position.y = 0.38; g.add(head);
  } else if (id === 'rod') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.95, 6), clayMat(0x7a4a2a)); pole.position.y = 0.4; pole.rotation.z = -0.15; g.add(pole);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), clayMat(0xffffff)); tip.position.set(-0.13, 0.86, 0); g.add(tip);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function setHeldTool(id) {
  if (!handAnchor) return;
  if (heldToolMesh) handAnchor.remove(heldToolMesh);
  heldToolMesh = toolMesh(id); handAnchor.add(heldToolMesh);
}
// 꾸미기: 선택한 가구를 손에 작게 들기
function setHeldDecor(id) {
  if (!handAnchor) return;
  if (heldToolMesh) handAnchor.remove(heldToolMesh);
  const m = decorMesh(id); m.scale.setScalar(0.5); m.position.y = 0.05;
  m.rotation.y = decorRot * Math.PI / 2;   // 현재 회전 상태 미리보기
  heldToolMesh = m; handAnchor.add(m);
}

// ── 🌦️ 날씨 파티클 — 비: 빠른 빗줄기 / 눈: 천천히 흩날리는 눈송이 ──
function buildRain() {
  if (WEATHER !== 'rain' && WEATHER !== 'snow') return;   // 맑음·안개는 파티클 없음
  const snow = WEATHER === 'snow';
  const N = snow ? 220 : 260, LEN = snow ? 0.13 : 0.5;    // 눈은 짧은 점 느낌
  const pos = new Float32Array(N * 6), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const o = i * 6, x = (Math.random() - 0.5) * 36, z = (Math.random() - 0.5) * 36, y = Math.random() * 14;
    pos[o] = x; pos[o + 1] = y + LEN; pos[o + 2] = z;      // 윗점
    pos[o + 3] = x; pos[o + 4] = y; pos[o + 5] = z;        // 아랫점
    vel[i] = snow ? 1.3 + Math.random() * 1.4 : 14 + Math.random() * 6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rainLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: snow ? 0xffffff : 0xaac4dc, transparent: true, opacity: snow ? 0.85 : 0.4,
  }));
  rainLines.userData = { vel, snow, len: LEN };
  rainLines.visible = false; rainLines.frustumCulled = false;
  scene.add(rainLines);
}

function updateRain(dt) {
  if (!rainLines) return;
  const show = mode === 'play' && !indoor && !atMine;   // 실내·동굴에선 숨김(텃밭은 야외)
  rainLines.visible = show;
  if (!show) return;
  const { vel, snow, len } = rainLines.userData;
  const pos = rainLines.geometry.attributes.position.array;
  const px = player.position.x, pz = player.position.z, t = clock.elapsedTime;
  for (let i = 0; i < vel.length; i++) {
    const o = i * 6;
    pos[o + 1] -= vel[i] * dt; pos[o + 4] -= vel[i] * dt;
    if (snow) { const sway = Math.sin(t * 1.3 + i * 1.7) * dt * 0.7; pos[o] += sway; pos[o + 3] += sway; } // ❄️ 좌우로 흩날림
    if (pos[o + 4] < 0) {   // 바닥 도달 → 플레이어 주변 상공에서 재시작
      const x = px + (Math.random() - 0.5) * 36, z = pz + (Math.random() - 0.5) * 36, y = 9 + Math.random() * 6;
      pos[o] = x; pos[o + 1] = y + len; pos[o + 2] = z;
      pos[o + 3] = x; pos[o + 4] = y; pos[o + 5] = z;
    }
  }
  rainLines.geometry.attributes.position.needsUpdate = true;
}

function buildFireflies() {
  const N = IS_MOBILE ? 60 : 120;   // 모바일 반딧불이 ↓
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = Math.random() * 34, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.5 + Math.random() * 4; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xfff2a8, size: 0.22, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  fireflies = new THREE.Points(geo, mat);
  fireflies.userData.base = pos.slice();
  scene.add(fireflies);
}

// 밤하늘 별 (상반구 돔 위 점들, 밤에 페이드인 + 반짝임)
function buildStars() {
  const N = IS_MOBILE ? 140 : 260;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - Math.random() * 0.55);  // 위쪽 하늘 위주
    const r = 85;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) + 8;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  stars = new THREE.Points(geo, mat);
  scene.add(stars);
}

// ── 주변 환경: 호수 · 벤치 · 가로등 · 꽃밭 ──────────────────────
const LAKE = new THREE.Vector3(16, 0, 9);
function buildEnvironment() {
  // 호수(잔잔한 수면 + 물가 돌 + 수련잎)
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(6, 40),
    new THREE.MeshStandardMaterial({ color: 0x8fd0ea, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.92 })
  );
  lake.geometry.rotateX(-Math.PI / 2); lake.position.set(LAKE.x, 0.06, LAKE.z); lake.receiveShadow = true;
  scene.add(lake);
  obstacles.push({ x: LAKE.x, z: LAKE.z, r: 6.4 }); // 호수 위엔 밭 금지
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2, r = 5.7 + Math.random() * 0.9;
    const rx = LAKE.x + Math.cos(a) * r, rz = LAKE.z + Math.sin(a) * r;
    if (rx < 10.9 && Math.abs(rz - 9) < 1.4) continue;   // 🌉 부두 입구 자리는 비움
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + Math.random() * 0.3, 0), clayMat(0xb9c0c4));
    rock.position.set(rx, 0.14, rz); rock.castShadow = true; scene.add(rock);
  }
  buildPier();       // 🌉 낚시 부두(호수 안쪽으로)
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 4;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.4, 7), clayMat(0x7fc98a, false));
    pad.geometry.rotateX(-Math.PI / 2); pad.position.set(LAKE.x + Math.cos(a) * r, 0.12, LAKE.z + Math.sin(a) * r); scene.add(pad);
  }

  // 공원: 벤치 2개 + 가로등 2개(밤에 빛남) + 꽃밭
  [[-3, 8, 0.3], [4, 10, -1.1]].forEach(([x, z, ry]) => makeBench(x, z, ry));
  [[-1, 7], [15, 3]].forEach(([x, z]) => makeLamp(x, z));
  const flowerCols = [0xff8fab, 0xffd36e, 0xa78bfa, 0xff9e5e, 0x8fd0ff];
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 26;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (dist2D({ x, z }, LAKE) < 6.5) continue;       // 호수 위 제외
    if (dist2D({ x, z }, HOUSE_POS) < 3) continue;    // 집 터 제외
    if (dist2D({ x, z }, COOP) < 2.8) continue;       // 🐔 닭장 터 제외
    makeFlower(x, z, flowerCols[i % flowerCols.length]);
  }
  buildCoopSite();   // 🐔 닭장 터 표지(남쪽 필드)
}

// 🌉 낚시 부두 — 데크 + 지지 기둥 + 볼라드 + 양동이 소품. PIER 사각 영역만 걷기 허용
function buildPier() {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(PIER.x2 - PIER.x1 + 0.2, 0.14, 1.4), woodMat(4, 1));
  deck.position.set((PIER.x1 + PIER.x2) / 2, 0.3, 9); deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  [[9.9, 8.45], [9.9, 9.55], [11.5, 8.45], [11.5, 9.55], [13.1, 8.45], [13.1, 9.55]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.75, 8), woodMat(1, 1, 0xa9743f));
    post.position.set(px, 0, pz); g.add(post);
  });
  [[13.28, 8.4], [13.28, 9.6]].forEach(([px, pz]) => {   // 끝단 볼라드(말뚝)
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), woodMat(1, 1, 0x8a5a3a));
    b.position.set(px, 0.5, pz); b.castShadow = true; g.add(b);
  });
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.5, metalness: 0.4 }));
  bucket.position.set(12.9, 0.52, 8.62); bucket.castShadow = true; g.add(bucket);
  scene.add(g);
}

// 🐔 닭장 터 표지(미건설 시) — 배지·재료 조건 안내판
function buildCoopSite() {
  coopSign = new THREE.Group(); coopSign.position.copy(COOP);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.3 }));
  pad.geometry.rotateX(-Math.PI / 2); pad.position.y = 0.03; coopSign.add(pad);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const c = cv.getContext('2d');
  c.fillStyle = '#b8d2ba'; roundRect(c, 10, 10, 492, 172, 28); c.fill();
  c.fillStyle = '#3a4a40'; c.textAlign = 'center';
  c.font = 'bold 46px sans-serif'; c.fillText('🐔 닭장 터', 256, 74);
  c.font = 'bold 30px sans-serif'; c.fillText('🔥 2일 연속 출석 + 🪵25 🪨10 🪙60', 256, 134);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.7, 1.0, 1); sp.position.y = 1.7; coopSign.add(sp);
  scene.add(coopSign);
  if (gameState.coop.built) coopSign.visible = false;   // 복원 순서 대비
}

// 🐔 닭장 건설 — 오두막 + 울타리 펜 + 모이통 + 닭 3마리
function buildCoop(silent = false) {
  if (coopGroup) return;
  gameState.coop.built = true;
  if (coopSign) coopSign.visible = false;
  coopGroup = new THREE.Group(); coopGroup.position.copy(COOP);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 1.4), woodMat(2, 1, 0xd98a6a));
  hut.position.set(-0.85, 0.72, -0.55); hut.castShadow = true; coopGroup.add(hut);
  const roofGeo = new THREE.ConeGeometry(1.35, 0.85, 4); roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, woodMat(2, 1, 0xa9564a));
  roof.position.set(-0.85, 1.68, -0.55); roof.scale.set(1.1, 1, 0.95); roof.castShadow = true; coopGroup.add(roof);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 1 }));
  hole.position.set(-0.85, 0.5, 0.17); coopGroup.add(hole);
  // 울타리 — 남쪽 중앙 입구 개방
  const postMat = woodMat(1, 1, 0xc9a06a);
  const posts = [];
  for (let x = -1.6; x <= 1.61; x += 0.8) { posts.push([x, -1.3]); posts.push([x, 1.3]); }
  for (let z = -0.65; z <= 0.66; z += 0.65) { posts.push([-1.6, z]); posts.push([1.6, z]); }
  posts.forEach(([px, pz]) => {
    if (pz > 1.0 && px > -0.5 && px < 0.5) return;   // 입구
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), postMat);
    p.position.set(px, 0.31, pz); coopGroup.add(p);
  });
  const rail = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), postMat); m.position.set(x, 0.52, z); coopGroup.add(m); };
  rail(3.3, 0.07, 0, -1.3); rail(0.07, 2.7, -1.6, 0); rail(0.07, 2.7, 1.6, 0);
  rail(1.1, 0.07, -1.05, 1.3); rail(1.1, 0.07, 1.05, 1.3);
  const trough = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.3), woodMat(1, 1, 0x8a5a3a));
  trough.position.set(0.7, 0.12, -0.9); coopGroup.add(trough);
  for (let i = 0; i < 3; i++) {
    const ch = makeChicken();
    ch.position.set(-0.6 + i * 0.7, 0, 0.2 - i * 0.35);
    ch.userData.tx = ch.position.x; ch.userData.tz = ch.position.z;
    chickens.push(ch); coopGroup.add(ch);
  }
  scene.add(coopGroup);
  obstacles.push({ x: COOP.x, z: COOP.z, r: 2.0 });   // 밭 금지
  if (!silent) { spawnConfetti(COOP.x, 2.2, COOP.z); spawnSparkle(COOP.x, 1.4, COOP.z, 24); Sound.complete(); }
}

// 닭 한 마리(흰 몸통 + 빨간 볏 + 주황 부리) — 펜 안을 종종거리며 돌아다님
function makeChicken() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), clayMat(0xf5f2ea));
  body.position.y = 0.22; body.scale.set(1, 0.9, 1.15); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), clayMat(0xf5f2ea));
  head.position.set(0, 0.44, 0.14); g.add(head);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.12), clayMat(0xe05a4a, false));
  comb.position.set(0, 0.56, 0.12); g.add(comb);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 6), clayMat(0xf0a050, false));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.43, 0.26); g.add(beak);
  g.userData = { tx: 0, tz: 0, wait: Math.random() * 2, phase: Math.random() * 6 };
  return g;
}

// 닭 배회 — 도착하면 잠깐 모이 쪼기(대기) 후 새 목적지(펜 내부 로컬 좌표)
function updateChickens(dt) {
  for (const ch of chickens) {
    const u = ch.userData;
    u.phase += dt * 8;
    if (u.wait > 0) { u.wait -= dt; ch.position.y = 0; continue; }
    const dx = u.tx - ch.position.x, dz = u.tz - ch.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.08) {
      u.wait = 0.8 + Math.random() * 2.2;
      u.tx = -1.2 + Math.random() * 2.4; u.tz = -1.0 + Math.random() * 2.0;
      continue;
    }
    ch.position.x += (dx / d) * dt * 0.55;
    ch.position.z += (dz / d) * dt * 0.55;
    ch.rotation.y = Math.atan2(dx, dz);
    ch.position.y = Math.abs(Math.sin(u.phase)) * 0.045;   // 종종걸음 통통
  }
}

// 🐔 닭장 상호작용 — 미건설: 배지+재료로 건설 / 건설 후: 달걀 걷기 → 모이 주기(하루 루프)
function coopInteract() {
  const c = gameState.coop;
  if (!c.built) {
    if ((gameState.daily.streak || 0) < COOP_STREAK) {
      ui.showHintModal?.({ ico: '🐔', title: '닭장 터', body: `🔥 ${COOP_STREAK}일 연속 출석하면 여기에 닭장을 지을 수 있어요. 내일 또 만나요!` });
      return;
    }
    const lack = Object.entries(COOP_COST).filter(([k, v]) => (gameState.inventory[k] || 0) < v);
    if (lack.length) {
      ui.toast?.('🐔 재료 부족 — ' + lack.map(([k, v]) => `${RES_LABEL[k] || k} ${gameState.inventory[k] || 0}/${v}`).join(' · '), 3000);
      return;
    }
    for (const k in COOP_COST) gameState.inventory[k] -= COOP_COST[k];
    logEcon('coop_build', 'coop', -COOP_COST.coins, gameState.inventory.coins);   // [원장] 코인 소비
    refreshInventoryUI();
    doPlayerAction(COOP.x, COOP.z);
    buildCoop();
    ui.toast?.('🐔 닭장 완성! 모이를 주면 다음날 🥚 달걀을 낳아요', 3200);
    trackEvent('coop_build');                                                     // [GA4]
    return;
  }
  const today = todayStr(), yesterday = todayStr(-1);
  if (c.fed && c.fed !== today && c.collected !== today) {
    const eggs = c.fed === yesterday ? 2 : 1;   // 하루 걸렀으면 1개(닭이 시무룩)
    giveReward({ egg: eggs }, 'coop_collect', today);
    c.collected = today; c.fed = null;
    Sound.harvest(); spawnSparkle(player.position.x, 1.2, player.position.z, 12);
    ui.toast?.(`🥚 달걀 ${eggs}개를 얻었어요!` + (eggs === 1 ? ' (모이를 걸렀더니 시무룩…)' : ' 모이를 또 주면 내일도 낳아요'), 3000);
    trackEvent('coop_collect', { eggs });                                         // [GA4] 데일리 루프 KPI
    return;
  }
  if (c.fed !== today) {
    if ((gameState.inventory.seed || 0) < COOP_FEED) { ui.toast?.(`🌰 모이(씨앗)가 부족해요 — ${gameState.inventory.seed || 0}/${COOP_FEED}`); return; }
    gameState.inventory.seed -= COOP_FEED; refreshInventoryUI();
    c.fed = today;
    Sound.blip(); spawnFloatText(COOP.x, 1.6, COOP.z, '🐔 냠냠!', '#c9682a');
    ui.toast?.('🌰 모이를 줬어요! 내일 🥚 달걀을 낳을 거예요 — 내일 또 만나요', 3000);
    trackEvent('coop_feed');                                                      // [GA4] 데일리 루프 KPI
    return;
  }
  ui.toast?.('🐔 오늘 할 일은 끝! 내일 달걀 걷으러 오세요');
}
function makeBench(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.5), woodMat(2, 1)); seat.position.y = 0.45; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.1), woodMat(2, 1)); back.position.set(0, 0.68, -0.2); g.add(back);
  [[-0.6, 0.18], [0.6, 0.18], [-0.6, -0.18], [0.6, -0.18]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), clayMat(0x6b4a34)); leg.position.set(lx, 0.22, lz); g.add(leg);
  });
  scene.add(g);
  obstacles.push({ x, z, r: 1.2 }); // 벤치 위엔 밭 금지
}
function makeLamp(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), clayMat(0x5a5148)); pole.position.y = 1.2; pole.castShadow = true; g.add(pole);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffca70, emissiveIntensity: 0, roughness: 0.6 });
  houseWindows.push(headMat);   // 밤에 창문과 함께 빛남
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), headMat); head.position.y = 2.5; g.add(head);
  scene.add(g);
  obstacles.push({ x, z, r: 0.8 }); // 가로등 밑엔 밭 금지
}
function makeFlower(x, z, col) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4), clayMat(0x7fbf6a)); stem.position.y = 0.2; g.add(stem);
  const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), clayMat(col, false)); bloom.position.y = 0.42; g.add(bloom);
  g.userData.swayPhase = Math.random() * Math.PI * 2; swayables.push(g); // 바람에 흔들림
  scene.add(g);
}

// =============================================================
//  집(건축) — 정해진 터, 단계별 건설
// =============================================================
function buildHouseGhost() {
  // 눈에 띄는 집 터: 민트 바닥 + 초록 링(테두리)
  houseGhost = new THREE.Group();
  houseGhost.position.copy(HOUSE_POS);
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 32),
    new THREE.MeshStandardMaterial({ color: 0xbfe8c9, transparent: true, opacity: 0.5, roughness: 1 })
  );
  pad.geometry.rotateX(-Math.PI / 2); pad.position.y = 0.03; houseGhost.add(pad);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.35, 2.65, 40),
    new THREE.MeshBasicMaterial({ color: 0x5fc07c, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; houseGhost.add(ring);
  scene.add(houseGhost);

  // 멀리서도 보이는 안내판(스프라이트)
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 384; houseSignCtx = cv.getContext('2d');
  houseSignTex = new THREE.CanvasTexture(cv);
  houseSignTex.minFilter = THREE.LinearFilter; houseSignTex.magFilter = THREE.LinearFilter; // 선명
  houseSignTex.generateMipmaps = false; houseSignTex.anisotropy = 8;
  const signMat = new THREE.SpriteMaterial({ map: houseSignTex, transparent: true, depthWrite: false });
  signMat.fog = false; // 안개 영향 제거 → 거리와 무관하게 또렷
  houseSign = new THREE.Sprite(signMat);
  houseSign.scale.set(3.4, 1.28, 1); houseSign.position.set(HOUSE_POS.x, 3.3, HOUSE_POS.z);
  scene.add(houseSign);
  updateHouseSign();

  houseGroup = new THREE.Group();
  houseGroup.position.copy(HOUSE_POS);
  scene.add(houseGroup);
  obstacles.push({ x: HOUSE_POS.x, z: HOUSE_POS.z, r: 2.6 }); // 집 터엔 밭 금지
}

// 집 터 안내판 텍스트 갱신(완성되면 숨김)
function updateHouseSign() {
  if (!houseSignCtx) return;
  const c = houseSignCtx; c.clearRect(0, 0, 1024, 384);
  if (gameState.houseStage >= 3) { houseSign.visible = false; houseSignTex.needsUpdate = true; return; }
  houseSign.visible = true;
  // 블룸(후광)에 안 걸리게 살짝 낮춘 세이지 톤 + 진한 테두리·글자
  c.fillStyle = '#b8d2ba';   // 덜 밝은 세이지(블룸 임계값 아래)
  roundRect(c, 30, 26, 964, 248, 60); c.fill();
  c.beginPath(); c.moveTo(462, 274); c.lineTo(562, 274); c.lineTo(512, 356); c.closePath(); c.fill();
  c.lineWidth = 10; c.strokeStyle = '#6fae82'; roundRect(c, 30, 26, 964, 248, 60); c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#204a2c'; c.font = 'bold 92px sans-serif';
  c.fillText('🏠 여기에 집 짓기', 512, 108);
  c.fillStyle = '#33503c'; c.font = 'bold 66px sans-serif';
  c.fillText(`🔨 망치 · 🪵 ${BUILD_COST}`, 512, 210);
  houseSignTex.needsUpdate = true;
}

// ── 따뜻한 우드 머티리얼(판자 결) — 절차 텍스처, 외부 파일 없음 ──
let _woodTex = null;
function woodTexture() {
  if (_woodTex) return _woodTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#d9a066'; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#a9743f'; c.lineWidth = 3;                 // 판자 이음새(가로줄)
  for (let y = 20; y < 128; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke(); }
  c.strokeStyle = 'rgba(150,95,55,0.28)'; c.lineWidth = 1.2;  // 나뭇결 물결
  for (let i = 0; i < 46; i++) {
    const y = Math.random() * 128; c.beginPath(); c.moveTo(0, y);
    for (let x = 0; x <= 128; x += 12) c.lineTo(x, y + Math.sin(x * 0.12 + i) * 1.8);
    c.stroke();
  }
  _woodTex = new THREE.CanvasTexture(cv);
  _woodTex.wrapS = _woodTex.wrapT = THREE.RepeatWrapping;
  return _woodTex;
}
function woodMat(rx = 1, ry = 1, tint = 0xffffff) {
  const t = woodTexture().clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, color: tint, roughness: 0.82, metalness: 0 });
}

// 아래→위로 톡 솟아오르는 등장 애니메이션 세팅
function applyRise(part) {
  const target = part.position.y;
  part.userData.riseTarget = target;
  part.userData.riseFrom = target - 1.5;
  part.userData.rise = 1;
  part.position.y = part.userData.riseFrom;
}

// stage: 1=나무바닥 2=통나무벽 3=지붕(완성). silent=true 면 애니메이션 없이 복원.
function buildHouseStage(stage, silent = false) {
  const parts = [];
  const add = (mesh) => { mesh.name = 'stage' + stage; mesh.castShadow = true; houseGroup.add(mesh); parts.push(mesh); };

  if (stage === 1) {
    // 나무 바닥(데크): 판자 슬래브 + 코너 다리
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.24, 3), woodMat(3, 3));
    deck.position.y = 0.22; deck.receiveShadow = true; add(deck);
    [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].forEach(([px, pz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), woodMat(1, 1, 0xcaa06a));
      leg.position.set(px, 0.0, pz); add(leg);
    });
  } else if (stage === 2) {
    // 통나무 벽: 4면에 가로 통나무 3단씩
    const logMat = woodMat(2, 1, 0xd2a068);
    const levels = [0.62, 1.0, 1.38];
    const sides = [
      { x: 0, z: 1.45, ry: 0 }, { x: 0, z: -1.45, ry: 0 },
      { x: 1.45, z: 0, ry: Math.PI / 2 }, { x: -1.45, z: 0, ry: Math.PI / 2 },
    ];
    sides.forEach(s => levels.forEach(y => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.9, 8), logMat);
      log.rotation.z = Math.PI / 2;    // 통나무 눕히기
      log.rotation.y = s.ry;
      log.position.set(s.x, y, s.z);
      log.userData.role = 'wall';      // 외관 커스텀: 벽
      add(log);
    }));
    // 외부 문(정면) — 외관 커스텀 대상
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.14), woodMat(1, 2, DOOR_COLORS[0]));
    door.position.set(0, 0.85, -1.55); door.userData.role = 'door'; add(door);
    // 창문(밤에 따뜻한 불빛) — emissive
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffcaa0, emissiveIntensity: 0, roughness: 0.7 });
    houseWindows.push(winMat);
    [[0, 1.0, 1.5, 0], [1.5, 1.0, 0, Math.PI / 2]].forEach(([wx, wy, wz, r]) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.06), winMat);
      win.position.set(wx, wy, wz); win.rotation.y = r; add(win);
    });
  } else if (stage === 3) {
    // 지붕: 우드 피라미드 + 굴뚝
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 4), woodMat(2, 2, ROOF_COLORS[0]));
    roof.position.y = 2.35; roof.rotation.y = Math.PI / 4; roof.userData.role = 'roof'; add(roof);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), woodMat(1, 1, 0xa9743f));
    chimney.position.set(0.9, 2.7, 0.9); add(chimney);
  } else if (stage >= 4) {
    // 🏗️ 증축: 기존 집을 지우고 더 큰 새 모델로 통째로 재건축
    [...houseGroup.children].forEach(c => houseGroup.remove(c));
    buildExpandedHouse(stage, add);
  }

  gameState.houseStage = Math.max(gameState.houseStage, stage);
  if (stage >= 3) houseGhost.visible = false; // 완성되면 터 표시 제거
  updateHouseSign();                          // 안내판 갱신(완성 시 숨김)
  applyHouseStyle();                          // 저장된 외관 색 반영

  if (!silent) {
    parts.forEach(applyRise);                    // 아래→위로 톡 솟기
    spawnDust(HOUSE_POS.x, HOUSE_POS.z, 10);     // 약한 먼지
    Sound.build();
    if (stage === 3) {
      // [파티클] 집 완성 축하: 색종이 + 반짝이
      spawnConfetti(HOUSE_POS.x, 3.4, HOUSE_POS.z);
      spawnSparkle(HOUSE_POS.x, 3.0, HOUSE_POS.z, 34);
      Sound.complete();
      ui.toast?.('🎉 집 완성! 축하해요');
      questEvent('house');                       // 퀘스트 진행
      ui.act?.('build');                         // 튜토리얼: 집 완성
      triggerMoment();                           // 📷 순간 줌인
      tryUnlockDrop(1);                          // 🎨 집 완성 보상: 랜덤 색 1개 확정
      trackEvent('house_complete');              // [GA4] 집 완성 이벤트
      syncBadges();                              // 🏅 내 집 마련 배지
    } else if (stage >= 4) {
      // 🏗️ 증축 축하 — 토스트는 호출부(doExpand 결과)가 담당(중복 방지)
      spawnConfetti(HOUSE_POS.x, 4.2, HOUSE_POS.z);
      spawnSparkle(HOUSE_POS.x, 3.4, HOUSE_POS.z, 40);
      Sound.complete();
      triggerMoment();                           // 📷 순간 줌인
      tryUnlockDrop(1);                          // 🎨 증축 보상: 랜덤 색 1개 확정
      trackEvent('house_expand', { stage });     // [GA4] 증축 퍼널
      syncBadges();                              // 🏅 궁전의 주인 배지
    }
  }
}

// 🏗️ 증축 모델(4=넓은 집, 5=저택, 6=모던 하우스) — 단계마다 footprint·지붕·문 모양이 달라짐
//    색 커스텀은 userData.role(roof/wall/door)로 기존 applyHouseStyle 이 그대로 적용
function buildExpandedHouse(stage, add) {
  const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffcaa0, emissiveIntensity: 0, roughness: 0.7 });
  houseWindows.push(winMat);   // 밤에 점등
  const win = (w, h, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), winMat); m.position.set(x, y, z); m.rotation.y = ry; add(m); };

  if (stage === 4) {
    // 🏡 넓은 집 — 4.2 데크, 4단 통나무 벽, 길쭉한 모임지붕, 아치문
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.26, 4.2), woodMat(4, 4));
    deck.position.y = 0.22; deck.receiveShadow = true; add(deck);
    const logMat = woodMat(3, 1, WALL_COLORS[0]);
    [0.62, 1.0, 1.38, 1.76].forEach(y => [
      { x: 0, z: 2.0, ry: 0 }, { x: 0, z: -2.0, ry: 0 },
      { x: 2.0, z: 0, ry: Math.PI / 2 }, { x: -2.0, z: 0, ry: Math.PI / 2 },
    ].forEach(s => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 4.0, 8), logMat);
      log.rotation.z = Math.PI / 2; log.rotation.y = s.ry; log.position.set(s.x, y, s.z);
      log.userData.role = 'wall'; add(log);
    }));
    // 아치문 — 문 상단에 눕힌 원기둥을 겹쳐 둥근 머리 표현(통나무 벽면보다 앞으로)
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.45, 0.14), woodMat(1, 2, DOOR_COLORS[0]));
    door.position.set(0, 0.88, -2.15); door.userData.role = 'door'; add(door);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.14, 16), woodMat(1, 1, DOOR_COLORS[0]));
    arch.rotation.x = Math.PI / 2; arch.position.set(0, 1.6, -2.15); arch.userData.role = 'door'; add(arch);
    win(0.62, 0.62, -1.2, 1.05, -2.2); win(0.62, 0.62, 1.2, 1.05, -2.2); win(0.62, 0.62, 2.2, 1.05, 0, Math.PI / 2);
    // 길쭉한 모임지붕(hip) — 지오메트리를 먼저 45° 회전(정렬)한 뒤 x로 늘려 실루엣 차별화
    const roofGeo = new THREE.ConeGeometry(3.2, 1.7, 4); roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, woodMat(2, 2, ROOF_COLORS[0]));
    roof.position.y = 2.8; roof.scale.set(1.25, 1, 1);
    roof.userData.role = 'roof'; add(roof);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.42), woodMat(1, 1, 0xa9743f));
    chimney.position.set(1.2, 3.1, 0.9); add(chimney);
  } else if (stage === 5) {
    // 🏘️ 저택 — 2층집: 판벽 1층 + 작은 2층 + 발코니 + 2단 지붕(맨사드풍) + 쌍여닫이문
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 4.6), new THREE.MeshStandardMaterial({ color: 0xb9b4a4, roughness: 0.95 }));
    base.position.y = 0.15; base.receiveShadow = true; add(base);
    const floor1 = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.8, 4.3), woodMat(3, 2, WALL_COLORS[0]));
    floor1.position.y = 1.2; floor1.userData.role = 'wall'; add(floor1);
    const floor2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 3.4), woodMat(2, 1, WALL_COLORS[0]));
    floor2.position.y = 2.8; floor2.userData.role = 'wall'; add(floor2);
    [[-2.05, -2.05], [2.05, -2.05], [-2.05, 2.05], [2.05, 2.05]].forEach(([px, pz]) => {  // 코너 기둥
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.8, 0.26), woodMat(1, 2, 0xa9743f));
      post.position.set(px, 1.2, pz); add(post);
    });
    // 쌍여닫이문 + 채광창
    [-0.4, 0.4].forEach(dx => {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.5, 0.14), woodMat(1, 2, DOOR_COLORS[0]));
      d.position.set(dx, 0.95, -2.2); d.userData.role = 'door'; add(d);
    });
    win(1.3, 0.34, 0, 1.92, -2.2);                                        // 문 위 가로 채광창
    win(0.6, 0.7, -1.5, 1.25, -2.18); win(0.6, 0.7, 1.5, 1.25, -2.18);    // 1층 창
    win(0.55, 0.55, -0.9, 2.85, -1.75); win(0.55, 0.55, 0.9, 2.85, -1.75); // 2층 창
    win(0.6, 0.7, 2.18, 1.25, 0, Math.PI / 2); win(0.6, 0.7, -2.18, 1.25, 0, Math.PI / 2);
    // 발코니(문 위) — 슬래브 + 난간
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.7), woodMat(2, 1, 0xa9743f));
    slab.position.set(0, 2.16, -2.05); add(slab);
    [-0.85, 0, 0.85].forEach(dx => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), woodMat(1, 1, 0xa9743f));
      p.position.set(dx, 2.45, -2.34); add(p);
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.08), woodMat(2, 1, 0xa9743f));
    rail.position.set(0, 2.68, -2.34); add(rail);
    // 2단 지붕: 넓은 처마 박스 + 위 피라미드
    const eave = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.45, 3.9), woodMat(3, 1, ROOF_COLORS[0]));
    eave.position.y = 3.65; eave.userData.role = 'roof'; add(eave);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.3, 4), woodMat(2, 2, ROOF_COLORS[0]));
    top.position.y = 4.5; top.rotation.y = Math.PI / 4; top.userData.role = 'roof'; add(top);
    [[-1.3, 1.2], [1.3, -1.2]].forEach(([px, pz]) => {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.4), woodMat(1, 1, 0xa9743f));
      ch.position.set(px, 4.1, pz); add(ch);
    });
  } else {
    // 🏙️ 모던 하우스 — 평지붕 박스 조합 + 전면 통유리 + 루프탑 테라스(난간·화분)
    const concrete = (c = 0xd6d3c9) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.3, 4.4), concrete(0xc6c3b8));
    plat.position.y = 0.15; plat.receiveShadow = true; add(plat);
    // 1층 본체(넓은 박스) + 오른쪽 위 2층 박스 — 왼쪽 지붕은 루프탑 테라스
    const lower = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.9, 3.6), woodMat(3, 2, WALL_COLORS[0]));
    lower.position.y = 1.25; lower.userData.role = 'wall'; add(lower);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 3.0), woodMat(2, 1, WALL_COLORS[0]));
    upper.position.set(1.05, 3.04, 0.1); upper.userData.role = 'wall'; add(upper);
    // 평지붕 슬래브 2장(처마 살짝 돌출) — 1층 지붕이 곧 테라스 바닥
    const roof1 = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.18, 3.9), woodMat(3, 1, ROOF_COLORS[0]));
    roof1.position.y = 2.29; roof1.userData.role = 'roof'; add(roof1);
    const roof2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 3.3), woodMat(2, 1, ROOF_COLORS[0]));
    roof2.position.set(1.05, 3.88, 0.1); roof2.userData.role = 'roof'; add(roof2);
    // 루프탑 테라스 난간(왼쪽 절반) — 밝은 회색 포스트+레일
    const railMat = concrete(0xb9b6ac);
    [[-2.25, -1.8], [-1.3, -1.8], [-0.35, -1.8], [-2.25, 1.8], [-1.3, 1.8], [-0.35, 1.8], [-2.25, -0.9], [-2.25, 0], [-2.25, 0.9]].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.07), railMat);
      p.position.set(px, 2.6, pz); add(p);
    });
    [[{ w: 2.0, d: 0.06, x: -1.3, z: -1.8 }], [{ w: 2.0, d: 0.06, x: -1.3, z: 1.8 }], [{ w: 0.06, d: 3.66, x: -2.25, z: 0 }]].flat().forEach(r => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.07, r.d), railMat);
      m.position.set(r.x, 2.85, r.z); add(m);
    });
    // 루프탑 화분(작은 나무) — 아늑한 포인트
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.26, 8), concrete(0xb0897a));
    pot.position.set(-1.3, 2.5, 0.6); add(pot);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0x7fbf7f, roughness: 0.9 }));
    bush.position.set(-1.3, 2.85, 0.6); add(bush);
    // 현대식 현관 — 큰 문 + 캐노피(어닝) + 콘크리트 스텝
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.7, 0.12), woodMat(1, 2, DOOR_COLORS[0]));
    door.position.set(0, 1.0, -1.86); door.userData.role = 'door'; add(door);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.09, 0.55), concrete(0xb9b6ac));
    awning.position.set(0, 2.02, -1.98); add(awning);
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.5), concrete(0xc6c3b8));
    step.position.set(0, 0.1, -2.42); add(step);
    // 전면 통유리(1층 좌우 대형 창 + 2층 가로로 긴 창) — 밤에 은은히 점등
    win(1.5, 1.3, -1.4, 1.2, -1.84); win(1.5, 1.3, 1.4, 1.2, -1.84);
    win(2.1, 0.7, 1.05, 3.05, -1.44);
    win(1.4, 1.1, 2.32, 1.2, 0.2, Math.PI / 2); win(1.4, 1.1, -2.32, 1.2, 0.2, Math.PI / 2);   // 측면 창
  }
}

// 증축 정보(외관 메뉴 렌더용) — 다음 단계·비용·보유량
function expandInfo() {
  if (gameState.houseStage < 3) return { maxed: false, next: null };
  const next = EXPANSIONS.find(e => e.stage === gameState.houseStage + 1) || null;
  if (!next) return { maxed: true, next: null };
  const items = Object.entries(next.cost).map(([k, v]) => ({ k, need: v, have: gameState.inventory[k] || 0, label: RES_LABEL[k] || k }));
  return { maxed: false, next: { stage: next.stage, name: next.name, ico: next.ico }, items, affordable: items.every(i => i.have >= i.need) };
}

// 증축 실행 — 자원 검증 → 소비 → 재건축. 결과 msg 는 호출부가 토스트
function doExpand() {
  if (gameState.houseStage < 3) return { ok: false, msg: '먼저 🔨망치로 집을 완성해요' };
  const info = expandInfo();
  if (info.maxed) return { ok: false, msg: '🏙️ 이미 모던 하우스까지 완성했어요!' };
  if (!info.affordable) {
    const lack = info.items.filter(i => i.have < i.need).map(i => `${i.label} ${i.have}/${i.need}`).join(' · ');
    return { ok: false, msg: `${info.next.ico} ${info.next.name} 증축 재료 부족 — ${lack}` };
  }
  const exp = EXPANSIONS.find(e => e.stage === info.next.stage);
  for (const k in exp.cost) gameState.inventory[k] -= exp.cost[k];
  if (exp.cost.coins) logEcon('house_expand', 'stage' + exp.stage, -exp.cost.coins, gameState.inventory.coins); // [원장] 코인 소비
  refreshInventoryUI();
  doPlayerAction(HOUSE_POS.x, HOUSE_POS.z);   // 건축 제스처
  buildHouseStage(exp.stage);
  return { ok: true, msg: `${exp.ico} ${exp.name} 증축 완료! 축하해요 🎉` };
}

// =============================================================
//  집 실내(입장) + 꾸미기
// =============================================================
const INT_HALF = 7;   // 실내 반경(넓은 방) — 문 앞 스폰/이동/배치 클램프 기준
function buildInterior() {
  const g = new THREE.Group(); g.position.copy(INT);
  const W = INT_HALF * 2;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, W), woodMat(7, 7));
  floor.position.y = 0.1; floor.receiveShadow = true; g.add(floor);
  interiorFloor = floor;
  const wall = () => clayMat(PAL.wall, false);
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, 3, 0.24), wall()); back.position.set(0, 1.5, INT_HALF); back.castShadow = true; g.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3, W), wall()); left.position.set(-INT_HALF, 1.5, 0); g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3, W), wall()); right.position.set(INT_HALF, 1.5, 0); g.add(right);
  // 앞면 문(가운데 폭 2 구멍) 양옆 벽
  const sideW = INT_HALF - 1;            // 문 반폭 1
  const fL = new THREE.Mesh(new THREE.BoxGeometry(sideW, 3, 0.24), wall()); fL.position.set(-(1 + sideW / 2), 1.5, -INT_HALF); g.add(fL);
  const fR = new THREE.Mesh(new THREE.BoxGeometry(sideW, 3, 0.24), wall()); fR.position.set((1 + sideW / 2), 1.5, -INT_HALF); g.add(fR);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.24), wall()); lintel.position.set(0, 2.6, -INT_HALF); g.add(lintel);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.1, 0.14), woodMat(1, 2, 0xa9743f)); door.position.set(0, 1.05, -INT_HALF); g.add(door); // 나가는 문
  const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffcaa0, emissiveIntensity: 0, roughness: 0.7 });
  houseWindows.push(winMat);
  // 뒷벽 창문 2개(넓어진 방)
  [-2.5, 2.5].forEach(wx => { const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 0.06), winMat); win.position.set(wx, 1.7, INT_HALF - 0.1); g.add(win); });
  scene.add(g); interiorGroup = g; interiorGroup.visible = false;   // 들어갈 때만 표시
  interiorLamp = new THREE.PointLight(0xffd9a0, 0, 26); interiorLamp.position.copy(INT).add(new THREE.Vector3(0, 3.4, 0));
  scene.add(interiorLamp);
}

// 가구 메시(로우폴리)
function decorMesh(id) {
  const g = new THREE.Group();
  if (id === 'rug') {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 20), clayMat(0xff9e9e, false)); r.position.y = 0.02; g.add(r);
  } else if (id === 'plant') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.3, 8), clayMat(0xd98b6a)); pot.position.y = 0.15; g.add(pot);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), clayMat(0x86d18a)); leaf.position.y = 0.5; g.add(leaf);
  } else if (id === 'chair') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), woodMat(1, 1)); seat.position.y = 0.45; g.add(seat);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), woodMat(1, 1)); bk.position.set(0, 0.7, -0.2); g.add(bk);
    [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.07), clayMat(0x6b4a34)); l.position.set(x, 0.22, z); g.add(l); });
  } else if (id === 'table') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.7), woodMat(2, 1)); top.position.y = 0.6; g.add(top);
    [[-.45, -.28], [.45, -.28], [-.45, .28], [.45, .28]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), woodMat(1, 1)); l.position.set(x, 0.3, z); g.add(l); });
  } else if (id === 'lamp') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.3, 6), clayMat(0x5a5148)); pole.position.y = 0.65; g.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffca70, emissiveIntensity: 0.85, roughness: 0.6 })); shade.position.y = 1.35; g.add(shade);
  } else if (id === 'sofa') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.7), clayMat(0x9ec7ff, false)); base.position.y = 0.3; g.add(base);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.2), clayMat(0x9ec7ff, false)); bk.position.set(0, 0.6, -0.25); g.add(bk);
  } else if (id === 'aquarium') {
    // 받침대 + 유리 물통 + 물 + 헤엄치는 물고기
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.42), woodMat(1, 1)); stand.position.y = 0.1; g.add(stand);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.44, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0 }));
    glass.position.y = 0.42; g.add(glass);
    const water = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x4aa6d0, transparent: true, opacity: 0.55, roughness: 0.25, emissive: 0x184a63, emissiveIntensity: 0.5 }));
    water.position.y = 0.4; g.add(water);
    const fish = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), clayMat(0xff8a5b, false));
    fish.rotation.z = Math.PI / 2; fish.position.set(0, 0.4, 0); fish.userData.swim = true; g.add(fish);
  } else if (id === 'bed') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 2.2), woodMat(1, 1)); frame.position.y = 0.2; g.add(frame);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 2.02), clayMat(0xfef1e6, false)); mattress.position.y = 0.42; g.add(mattress);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.16, 1.25), clayMat(0xf5a3a3, false)); blanket.position.set(0, 0.55, 0.4); g.add(blanket);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.42), clayMat(0xbfe6ff, false)); pillow.position.set(0, 0.57, -0.75); g.add(pillow);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.18), woodMat(2, 1)); head.position.set(0, 0.55, -1.06); g.add(head);
  } else if (id === 'bigtable') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 1.0), woodMat(2, 1)); top.position.y = 0.62; g.add(top);
    [[-.78, -.38], [.78, -.38], [-.78, .38], [.78, .38]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.12), woodMat(1, 1)); l.position.set(x, 0.31, z); g.add(l); });
    [-.5, .5].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.04, 12), clayMat(0xffffff, false)); p.position.set(x, 0.71, 0); g.add(p); });
  } else if (id === 'bigsofa') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.9), clayMat(0x8ab4e8, false)); base.position.y = 0.3; g.add(base);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.24), clayMat(0x8ab4e8, false)); bk.position.set(0, 0.65, -0.33); g.add(bk);
    [-1.08, 1.08].forEach(x => { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.9), clayMat(0x7aa6db, false)); arm.position.set(x, 0.42, 0); g.add(arm); });
    [-.6, .6].forEach(x => { const cush = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.7), clayMat(0xa8ccf2, false)); cush.position.set(x, 0.54, 0.05); g.add(cush); });
  } else if (id === 'bookshelf') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.4), woodMat(1, 1)); body.position.y = 0.85; g.add(body);
    const cols = [0xd06b5b, 0x5b86d0, 0x64b06a, 0xe0b64a, 0x9a6ad0];
    for (let i = 0; i < 3; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.36), woodMat(2, 1)); shelf.position.set(0, 0.5 + i * 0.5, 0.02); g.add(shelf);
      for (let b = 0; b < 5; b++) { const bk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.24), clayMat(cols[(i + b) % cols.length], false)); bk.position.set(-0.5 + b * 0.22, 0.7 + i * 0.5, 0.05); g.add(bk); }
    }
  } else if (id === 'bigrug') {
    const r = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.6), clayMat(0xc7a6e8, false)); r.position.y = 0.03; g.add(r);
    const border = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.2), clayMat(0xe8d3f5, false)); border.position.y = 0.04; g.add(border);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// 가구 배치(작물로 구매). silent=true 면 저장 복원(비용/이펙트 없음)
function placeDecor(id, wx, wz, silent = false, rot = null) {
  const def = DECOR.find(d => d.id === id); if (!def) return false;
  const ry = (rot == null ? decorRot : rot) % 4;
  if (!silent) {
    const pay = def.pay || 'crop';                          // 화폐: 작물 or 물고기
    if ((gameState.inventory[pay] || 0) < def.cost) {
      ui.toast?.(pay === 'fish' ? `물고기가 부족해요 (필요 ${def.cost} 🐟)` : `작물이 부족해요 (필요 ${def.cost} 🥕)`);
      return false;
    }
    gameState.inventory[pay] -= def.cost; refreshInventoryUI();
  }
  const m = decorMesh(id);
  const lx = Math.max(INT.x - INT_HALF + 0.5, Math.min(INT.x + INT_HALF - 0.5, wx));
  const lz = Math.max(INT.z - INT_HALF + 0.5, Math.min(INT.z + INT_HALF - 0.5, wz));
  m.position.set(lx, 0.2, lz);
  m.rotation.y = ry * Math.PI / 2;
  scene.add(m); decorMeshes.push(m);
  gameState.house.decor.push({ id, x: lx - INT.x, z: lz - INT.z, rot: ry });
  if (!silent) {
    m.userData.pop = 1; m.scale.setScalar(0.01);
    Sound.blip(); spawnFloatText(lx, 1.3, lz, def.ico + ' 배치!', '#2fa564');
    ui.act?.('decor');                       // 튜토리얼: 가구 배치
    trackEvent('place_decor', { item: id }); // [GA4]
    placingDecor = null;                     // 한 번 놓으면 배치 모드 종료
    setHeldTool(TOOLS[currentTool].id);      // 손에 든 가구 → 원래 도구로
    ui.onDecorPlaced?.();                    // 액션버튼 아이콘 복원(가구 제거)
  }
  return true;
}

// 바닥 탭 → 선택한 가구 배치
function tryPlaceDecor(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(interiorFloor, false)[0];
  if (hit) placeDecor(placingDecor, hit.point.x, hit.point.z);
}

// ── 작업대(요리) ─────────────────────────────────────────────
function spawnWorkbench() {
  const g = new THREE.Group(); g.position.copy(BENCH);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.9), woodMat(2, 1)); top.position.y = 0.7; top.castShadow = true; g.add(top);
  [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]].forEach(([x, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), clayMat(0x6b4a34)); l.position.set(x, 0.35, z); g.add(l);
  });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.3, 12), clayMat(0x5a5148)); pot.position.set(-0.3, 0.94, 0); pot.castShadow = true; g.add(pot);
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 12), clayMat(0xff9e5e, false)); soup.position.set(-0.3, 1.09, 0); g.add(soup);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.35), woodMat(1, 1)); board.position.set(0.45, 0.8, 0); g.add(board);
  g.add(makeSignpost('🍳 작업대', 1.2, 0.7));   // 팻말
  scene.add(g);
  obstacles.push({ x: BENCH.x, z: BENCH.z, r: 1.4 }); // 작업대 위엔 밭 금지
}

// 상점 좌판(절차적)
function spawnShop() {
  const g = new THREE.Group(); g.position.copy(SHOP);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.7), woodMat(2, 1)); counter.position.y = 0.45; counter.castShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.9), woodMat(1, 1)); top.position.y = 0.95; g.add(top);
  // 차양(줄무늬 두 칸)
  for (let i = 0; i < 4; i++) {
    const c = i % 2 ? 0xff8f8f : 0xfff2e0;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.7), clayMat(c, false));
    s.position.set(-0.75 + i * 0.5, 1.9, 0.1); s.rotation.x = -0.35; g.add(s);
  }
  for (const x of [-0.9, 0.9]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), clayMat(0x6b4a34)); p.position.set(x, 1, -0.2); g.add(p); }
  g.add(makeSignpost('🛒 상점', 1.4, 0.7));   // 팻말
  scene.add(g);
  obstacles.push({ x: SHOP.x, z: SHOP.z, r: 1.6 });
}

// ── 📊 시세 전광판 — 상점 옆. 보드에 오늘의 최고/최저 품목이 직접 표시되고,
//    가까이 가서 상호작용하면 전체 시세판 모달이 열림(초보자 발견용) ──
function spawnMarketBoard() {
  const g = new THREE.Group(); g.position.copy(MARKET);
  for (const x of [-0.8, 0.8]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 2.1, 6), woodMat(1, 1));
    p.position.set(x, 1.05, 0); p.castShadow = true; g.add(p);
  }
  // 보드 캔버스 — 한글 "시세판" 크게 + 오늘의 최고/최저 등락(멀리서도 읽히게)
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320;
  const c = cv.getContext('2d');
  c.fillStyle = '#6a4c32'; c.fillRect(0, 0, 512, 320);                    // 나무 프레임
  c.fillStyle = '#f7f0dc'; c.fillRect(18, 18, 476, 284);                  // 종이판
  c.fillStyle = '#8a6a48';                                                 // 코너 못 장식
  [[34, 34], [478, 34], [34, 286], [478, 286]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); });
  c.textAlign = 'center';
  c.fillStyle = '#4a3b28'; c.font = 'bold 74px sans-serif';
  c.fillText('📊 시세판', 256, 96);                                        // 한글 제목 큼직하게
  c.strokeStyle = '#d9cdb0'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(50, 122); c.lineTo(462, 122); c.stroke();       // 구분선
  const ks = Object.keys(SELL_PRICE);
  const hi = ks.reduce((a, b) => (priceRate(a) >= priceRate(b) ? a : b));
  const lo = ks.reduce((a, b) => (priceRate(a) <= priceRate(b) ? a : b));
  const pct = (k) => Math.round(priceRate(k) * 100) - 100;
  c.font = 'bold 48px sans-serif';
  c.fillStyle = '#2fa564'; c.fillText(`${SELL_ICO_G[hi]} 비싸요  +${pct(hi)}%`, 256, 186);
  c.fillStyle = '#d05a4a'; c.fillText(`${SELL_ICO_G[lo]} 싸요  ${pct(lo)}%`, 256, 248);
  c.fillStyle = '#8a7a5f'; c.font = '26px sans-serif';
  c.fillText('가격은 매일 자정에 바뀌어요', 256, 292);
  const tex = new THREE.CanvasTexture(cv);
  // 재질 배열: +z 앞면만 시세판 텍스처, 나머지는 나무 톤(옆면 스트레치 방지)
  const woodSide = new THREE.MeshStandardMaterial({ color: 0x9a7248, roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 0.08),
    [woodSide, woodSide, woodSide, woodSide, front, woodSide]);
  board.position.y = 1.45; board.castShadow = true; g.add(board);
  scene.add(g);   // 회전 없음 — 게임 카메라(남쪽에서 북쪽을 봄)를 향해 앞면(+z) 표시
  obstacles.push({ x: MARKET.x, z: MARKET.z, r: 0.9 });
}

// 시세판 모달 데이터 — index.html(ui.openMarket)이 렌더
function marketData() {
  return {
    items: Object.keys(SELL_PRICE).map(k => ({
      k, ico: SELL_ICO_G[k], label: RES_LABEL[k] || k,
      price: priceOf(k), base: SELL_PRICE[k], rate: Math.round(priceRate(k) * 100) - 100, // 등락 %(0=기본가)
    })).sort((a, b) => b.rate - a.rate),       // 비싼 순 정렬(오늘 뭘 팔지 바로 보이게)
    forecast: FORECAST_MSG[FORECAST],
  };
}

// 판매: 보유 자원 → 코인
function sellItem(k, all) {
  const have = gameState.inventory[k] || 0;
  if (have <= 0) return { ok: false, msg: '팔 게 없어요' };
  const qty = all ? have : 1;
  gameState.inventory[k] -= qty;
  const gain = priceOf(k) * qty;   // 🪙 오늘의 시세 반영
  gameState.inventory.coins = (gameState.inventory.coins || 0) + gain;
  refreshInventoryUI();
  Sound.blip();
  questEvent('sell', qty);                          // 데일리 의뢰(장사) 진행
  ui.act?.('sell');                                 // 튜토리얼: 첫 판매
  trackEvent('shop_sell', { item: k, qty, gain, rate: Math.round(priceRate(k) * 100) });  // [GA4] 금액+시세%(시세 반응 분석용)
  logEcon('shop_sell', k, gain, gameState.inventory.coins);  // [원장] 코인 유입
  return { ok: true, gain, qty };
}

// 구매: 코인 → 아이템
function buyShop(id) {
  const it = SHOP_BUY.find(x => x.id === id); if (!it) return { ok: false };
  if (it.upgrade && gameState.upgrades[it.upgrade]) return { ok: false, msg: '이미 보유한 도구예요' };
  if ((gameState.inventory.coins || 0) < it.coin) return { ok: false, msg: '코인이 부족해요' };
  gameState.inventory.coins -= it.coin;
  if (it.give) giveReward(it.give, 'shop_buy_bundle', id);
  if (it.upgrade) {                                   // 도구 업그레이드 코인 구매
    gameState.upgrades[it.upgrade] = true;
    spawnFloatText(player.position.x, 1.6, player.position.z, `${it.ico} ${it.name}!`, '#2f7a44');
    Sound.complete();
  } else {
    Sound.harvest();
  }
  refreshInventoryUI();
  trackEvent('shop_buy', { item: id, cost: it.coin });  // [GA4] 구매 금액 포함
  logEcon('shop_buy', id, -it.coin, gameState.inventory.coins);  // [원장] 코인 소비
  return { ok: true, name: it.name };
}

// 요리: 레시피 재료 확인 → 소비 → 일시 버프 적용
function craftCook(id) {
  const r = RECIPES.find(x => x.id === id); if (!r) return { ok: false };
  for (const k in r.cost) {
    if ((gameState.inventory[k] || 0) < r.cost[k]) return { ok: false, msg: `${RES_LABEL[k] || k}이(가) 부족해요` };   // 🥚 달걀 등 신규 재료도 안내
  }
  for (const k in r.cost) gameState.inventory[k] -= r.cost[k];
  refreshInventoryUI();
  buffs[r.buff] = clock.elapsedTime + r.dur * (gameState.upgrades.pot ? 1.5 : 1); // 버프 적용(🍲 큰 냄비: 지속 1.5배)
  Sound.harvest();
  spawnFloatText(player.position.x, 1.4, player.position.z, `${r.ico} ${r.name}!`, '#c9682a');
  spawnSparkle(player.position.x, 0.9, player.position.z, 16);
  trackEvent('craft_item', { category: 'cook', item: id });  // [GA4] 제작 사용 트래킹(GA4 전용)
  dexDiscover('cook', id);                                   // 📖 도감(첫 요리)
  questEvent('cook');                                        // 요리사 퀘스트 진행
  triggerMoment();                                           // 📷 순간 줌인
  emitBuffs();
  return { ok: true, name: r.name, buff: BUFF_META[r.buff].name };
}

// 도구 업그레이드 제작(영구) — 이미 보유면 거절
function craftUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id); if (!u) return { ok: false };
  if (gameState.upgrades[id]) return { ok: false, msg: '이미 보유한 업그레이드예요' };
  for (const k in u.cost) {
    if ((gameState.inventory[k] || 0) < u.cost[k]) {
      return { ok: false, msg: `${RES_LABEL[k] || k}이(가) 부족해요` };   // 돌·석탄 등 광물 재료도 안내
    }
  }
  for (const k in u.cost) gameState.inventory[k] -= u.cost[k];
  gameState.upgrades[id] = true;
  refreshInventoryUI();
  Sound.complete();
  spawnFloatText(player.position.x, 1.5, player.position.z, `${u.ico} ${u.name}!`, '#2f7a44');
  spawnSparkle(player.position.x, 1.0, player.position.z, 22);
  trackEvent('craft_item', { category: 'tool', item: id });  // [GA4]
  return { ok: true, name: u.name };
}

// 활성 버프 목록을 UI로 전달(정수 초 바뀔 때만)
let lastBuffKey = '';
function emitBuffs() {
  const now = clock.elapsedTime;
  const list = Object.keys(buffs).filter(k => now < buffs[k])
    .map(k => ({ ico: BUFF_META[k].ico, name: BUFF_META[k].name, remain: Math.ceil(buffs[k] - now) }));
  const key = list.map(b => b.ico + b.remain).join('|');
  if (key !== lastBuffKey) { lastBuffKey = key; ui.setBuffs?.(list); }
}

// 야외 장식 메시(절차적)
function outdoorMesh(id) {
  const g = new THREE.Group();
  if (id === 'fence') {
    for (const x of [-0.5, 0.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), woodMat(1, 1)); p.position.set(x, 0.3, 0); g.add(p); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.08), woodMat(2, 1)); rail.position.y = 0.42; g.add(rail);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.08), woodMat(2, 1)); rail2.position.y = 0.22; g.add(rail2);
  } else if (id === 'path') {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 8), clayMat(0xbfae95, false)); s.position.y = 0.04; s.scale.z = 0.8; g.add(s);
  } else if (id === 'flowerbed') {
    const soil = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.7), clayMat(0x7a5230)); soil.position.y = 0.08; g.add(soil);
    [0xff8fab, 0xffd36e, 0xa78bfa, 0xff9e5e].forEach((c, i) => {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), clayMat(0x7fbf6a)); st.position.set(-0.3 + i * 0.2, 0.18, 0); g.add(st);
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), clayMat(c, false)); b.position.set(-0.3 + i * 0.2, 0.3, 0); g.add(b);
    });
  } else if (id === 'postlamp') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), clayMat(0x5a5148)); pole.position.y = 0.7; g.add(pole);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffca70, emissiveIntensity: 0, roughness: 0.6 });
    houseWindows.push(headMat);   // 밤에 창문/가로등과 함께 점등
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), headMat); head.position.y = 1.5; g.add(head);
  } else if (id === 'stonewall') {
    const smat = clayMat(0x9a9a92, false);
    [[-0.35, 0.18, 0], [0.35, 0.18, 0], [0, 0.5, 0]].forEach(([x, y, z]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.4), smat); b.position.set(x, y, z); g.add(b);
    });
  } else if (id === 'brazier') {
    const legMat = clayMat(0x5a5148);
    for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), legMat); l.position.set(Math.cos(a) * 0.18, 0.25, Math.sin(a) * 0.18); g.add(l); }
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.2, 0.22, 10), clayMat(0x4a4844, false)); bowl.position.y = 0.55; g.add(bowl);
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xff8a3a, emissive: 0xff6a1a, emissiveIntensity: 0, roughness: 0.5 });
    houseWindows.push(fireMat);   // 밤에 점등
    const fire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), fireMat); fire.position.y = 0.68; g.add(fire);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// 야외 장식 설치 (플레이어 위치에). silent=true 면 저장 복원
function placeOutdoor(wx, wz, silent = false, id = placingOutdoor) {
  const def = OUTDOOR.find(d => d.id === id); if (!def) return false;
  if (!silent) {
    for (const k in def.cost) {
      if ((gameState.inventory[k] || 0) < def.cost[k]) { ui.toast?.((k === 'crop' ? '작물이' : '목재가') + ' 부족해요'); return false; }
    }
    for (const k in def.cost) gameState.inventory[k] -= def.cost[k];
    refreshInventoryUI();
  }
  const m = outdoorMesh(id); m.position.set(wx, 0, wz); scene.add(m); outdoorMeshes.push(m);
  gameState.outdoor.push({ id, x: wx, z: wz });
  obstacles.push({ x: wx, z: wz, r: 0.8 });   // 그 위엔 밭 금지
  if (!silent) {
    m.userData.pop = 1; m.scale.setScalar(0.01);
    Sound.blip(); spawnFloatText(wx, 1.0, wz, def.ico + ' 설치!', '#2fa564');
    trackEvent('craft_item', { category: 'outdoor', item: id });  // [GA4]
    placingOutdoor = null; ui.onDecorPlaced?.();                   // 배치 모드 종료(1회)
  }
  return true;
}

// 선물 제작(보유 수 +1)
function craftGift(id) {
  const g = GIFTS.find(x => x.id === id); if (!g) return { ok: false };
  for (const k in g.cost) {
    if ((gameState.inventory[k] || 0) < g.cost[k]) {
      const label = k === 'fish' ? '물고기' : k === 'crop' ? '작물' : '목재';
      return { ok: false, msg: `${label}이(가) 부족해요` };
    }
  }
  for (const k in g.cost) gameState.inventory[k] -= g.cost[k];
  gameState.gifts[id] = (gameState.gifts[id] || 0) + 1;
  refreshInventoryUI();
  Sound.blip();
  spawnFloatText(player.position.x, 1.4, player.position.z, `${g.ico} ${g.name}!`, '#c9682a');
  trackEvent('craft_item', { category: 'gift', item: id });  // [GA4]
  return { ok: true, name: g.name };
}

// 근처 주민에게 선물 주기 → 친밀도↑ (3개마다 감사 보상)
function giveGift(giftId) {
  const o = nearNPC; if (!o) return { ok: false, msg: '가까운 주민이 없어요' };
  if ((gameState.gifts[giftId] || 0) <= 0) return { ok: false, msg: '그 선물이 없어요' };
  const g = GIFTS.find(x => x.id === giftId);
  gameState.gifts[giftId] -= 1;
  const id = o.def.id;
  const before = gameState.affinity[id] || 0;
  gameState.affinity[id] = before + (g.love || 1);           // 📿 보석 목걸이 등은 친밀도 +2
  refreshInventoryUI();
  Sound.harvest();
  spawnFloatText(o.group.position.x, 2.2, o.group.position.z, g.love > 1 ? '❤️❤️' : '❤️', '#e6789a');
  spawnSparkle(o.group.position.x, 1.4, o.group.position.z, 14);
  let reward = null;
  // 친밀 3단계마다 답례 — +2 증가로 배수를 "건너뛴" 경우도 통과 판정
  if (Math.floor(gameState.affinity[id] / 3) > Math.floor(before / 3)) { reward = { seed: 3, crop: 1 }; giveReward(reward, 'affinity_gift', id); }
  trackEvent('gift_give', { npc: id, gift: giftId });  // [GA4]
  return { ok: true, npc: o.def.name, ico: g.ico, affinity: gameState.affinity[id], reward: reward ? rewardText(reward) : null };
}

// 캔버스 글자 표지판(persistent)
function makeSignBoard(text) {
  const W = 640, H = 260;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  // 나무판 + 위/아래 테두리
  c.fillStyle = '#e8d3a8'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#c9a86e'; c.fillRect(0, 0, W, 22); c.fillRect(0, H - 22, W, 22);
  c.fillStyle = '#8a6a3a'; c.fillRect(0, 0, W, 9); c.fillRect(0, H - 9, W, 9);
  // 이모지는 캔버스에서 기기(iOS 등)마다 폭 측정/렌더가 달라 글자가 삐져나감 → 판엔 한글만
  const label = text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
  // 글자 폭을 재서 판 안에 딱 맞게 폰트 자동 축소(넉넉한 양옆 여백 → 잘림 방지)
  const maxW = W - 130;
  const fontFor = (s) => `bold ${s}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
  let fs = 128;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = fontFor(fs);
  while (fs > 40 && c.measureText(label).width > maxW) { fs -= 4; c.font = fontFor(fs); }
  c.fillStyle = '#4a3a24';
  c.fillText(label, W / 2, H / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.anisotropy = 4;
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });   // 글자 면(앞뒤)
  const side = new THREE.MeshStandardMaterial({ color: 0xcdb083, roughness: 0.85 }); // 옆·위·아래(나무색)
  // BoxGeometry 면 순서: [+X, -X, +Y(위), -Y(아래), +Z(앞), -Z(뒤)] → 글자는 앞뒤만
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2 * H / W, 0.1), [side, side, side, side, face, face]);
  return m;
}

// 서 있는 팻말(나무 기둥 + 판) — 로컬 (x,z)에 세움
function makeSignpost(text, x = 0, z = 1.3) {
  const grp = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6), woodMat(1, 1)); post.position.set(x, 0.75, z); post.castShadow = true; grp.add(post);
  const sign = makeSignBoard(text); sign.scale.setScalar(0.55); sign.position.set(x, 1.45, z + 0.04); grp.add(sign);
  return grp;
}

// 마을 안 텃밭 입구 게이트(나무 아치 + 표지판)
function spawnFarmGate() {
  const g = new THREE.Group(); g.position.copy(FARM_GATE);
  for (const x of [-1.1, 1.1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 7), woodMat(1, 1)); p.position.set(x, 1.2, 0); p.castShadow = true; g.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 0.24), woodMat(2, 1)); top.position.y = 2.4; g.add(top);
  const sign = makeSignBoard('🌾 내 텃밭'); sign.position.set(0, 1.7, 0.02); g.add(sign);
  scene.add(g);
  obstacles.push({ x: FARM_GATE.x, z: FARM_GATE.z, r: 1.2 });
}

// 텃밭 필드(잔디 바닥 + 울타리 + 나가는 문 + 허수아비)
function buildFarm() {
  const g = new THREE.Group(); g.position.copy(FARM);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(FARM_HALF * 2, 0.2, FARM_HALF * 2), clayMat(0x8fce7e, false));
  ground.position.y = 0.05; ground.receiveShadow = true; g.add(ground);
  // 울타리 둘레
  const H = FARM_HALF;
  for (let i = -H; i <= H; i += 1.5) {
    for (const [x, z] of [[i, -H], [i, H], [-H, i], [H, i]]) {
      if (Math.abs(x) < 1.2 && z === H) continue; // 남쪽 가운데는 출입구
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), woodMat(1, 1)); post.position.set(x, 0.35, z); g.add(post);
    }
  }
  // 나가는 문(남쪽 가운데)
  const gate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.4), woodMat(1, 2, 0xa9743f)); gate.position.set(0, 0.16, H); g.add(gate);
  const board = makeSignBoard('🚪 나가기'); board.scale.setScalar(0.7); board.position.set(0, 1.4, H); g.add(board);
  // 허수아비(장식)
  const sc = new THREE.Group(); sc.position.set(-H + 1.5, 0, -H + 1.5);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), clayMat(0x8a6a3a)); pole.position.y = 0.8; sc.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), clayMat(0x8a6a3a)); arm.position.y = 1.1; sc.add(arm);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), clayMat(0xf1e2b8, false)); head.position.y = 1.5; sc.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 10), clayMat(0xc98a4f)); hat.position.y = 1.72; sc.add(hat);
  sc.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(sc);
  scene.add(g); farmGroup = g; farmGroup.visible = false;   // 텃밭에 있을 때만 표시
}

function enterFarm() {
  atFarm = true;
  player.position.set(FARM.x, 0, FARM.z + FARM_HALF - 1.5); player.rotation.y = Math.PI;
  nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  firstHint('farmInside', '🌾', '내 텃밭', '⛏️괭이로 밭을 갈고 🌰씨앗을 심어 💧물을 주며 키워보세요. 심은 작물은 저장돼요. 나갈 땐 남쪽 문으로!');
  Sound.blip(); trackEvent('enter_farm'); // [GA4]
}
function exitFarm() {
  atFarm = false;
  player.position.set(FARM_GATE.x, 0, FARM_GATE.z + 2);
  nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('exit_farm'); // [GA4]
}

// ── 채굴 동굴 ─────────────────────────────────────────────────
const ORES = [
  { id: 'stone', name: '돌',   color: 0x9a9a92 },
  { id: 'coal',  name: '석탄', color: 0x2a2a2a },
  { id: 'gem',   name: '보석', color: 0x5ad0e0 },
];
function weightedOre() { const gemP = WEATHER === 'fog' ? 0.2 : 0.1; const r = Math.random(); return r < 0.55 ? ORES[0] : r < 1 - gemP ? ORES[1] : ORES[2]; } // 돌55/석탄~35/보석10(🌫️ 안개 낀 날 20)

function spawnOreRock(x, z, ore) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const rockMat = clayMat(0x5a5854, false);
  for (let i = 0; i < 3; i++) { const r = 0.34 + Math.random() * 0.24; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), rockMat); b.position.set((Math.random() - 0.5) * 0.5, r * 0.7, (Math.random() - 0.5) * 0.5); b.castShadow = true; g.add(b); }
  const oreMat = ore.id === 'gem'
    ? new THREE.MeshStandardMaterial({ color: ore.color, emissive: ore.color, emissiveIntensity: 0.5, roughness: 0.3 })
    : clayMat(ore.color, false);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), oreMat); b.position.set((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6); g.add(b); }
  g.userData = { ore, hp: 3, depleted: false, respawnAt: 0, growing: false };
  scene.add(g); oreRocks.push(g);
}

function buildMine() {
  const g = new THREE.Group(); g.position.copy(MINE);
  const H = MINE_HALF;
  // 어둡고 거친 바닥
  const floor = new THREE.Mesh(new THREE.BoxGeometry(H * 2 + 3, 0.2, H * 2 + 3), clayMat(0x3a3a40, false)); floor.position.y = 0.05; floor.receiveShadow = true; g.add(floor);
  // 공용 바위 지오/머티리얼(플랫셰이딩 = 각진 로우폴리 바위)
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x565b66, roughness: 1, metalness: 0, flatShading: true });
  const rock = (x, y, z, sx, sy, sz, cast) => {
    const b = new THREE.Mesh(rockGeo, rockMat); b.position.set(x, y, z); b.scale.set(sx, sy, sz);
    b.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4);
    if (cast) b.castShadow = true; g.add(b); return b;
  };
  // 울퉁불퉁 바위 벽(플랫 박스 대신) — 둘레를 따라 크고작은 바위 겹쳐 쌓기
  const step = 1.05;
  for (let t = -H; t <= H + 0.01; t += step) {
    const s = () => 0.75 + Math.random() * 0.9, sy = () => 1.6 + Math.random() * 2.0;
    rock(t, sy() * 0.5, H + 0.3, s(), sy(), s(), true);          // 북
    rock(H + 0.3, sy() * 0.5, t, s(), sy(), s(), true);          // 동
    rock(-H - 0.3, sy() * 0.5, t, s(), sy(), s(), true);         // 서
    if (Math.abs(t) > 1.4) rock(t, sy() * 0.5, -H - 0.3, s(), sy(), s(), true); // 남(가운데 문 구멍 제외)
    // 안쪽 낮은 바위 한 겹(깊이감)
    if (Math.random() < 0.6) rock(t * 0.96, 0.4, (H - 0.6) * (Math.random() < 0.5 ? 1 : -1), s() * 0.7, 0.5 + Math.random() * 0.5, s() * 0.7, false);
  }
  // 종유석/석순 몇 개(위로 뾰족)
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * 6, r = H - 1 - Math.random() * 2;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.28 + Math.random() * 0.3, 1 + Math.random() * 1.6, 6), rockMat);
    c.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r); c.rotation.y = Math.random() * 6; c.castShadow = true; g.add(c);
  }
  // 바닥 돌기(자잘한 바위)
  for (let i = 0; i < 14; i++) rock((Math.random() - 0.5) * (H * 2 - 2), 0.06, (Math.random() - 0.5) * (H * 2 - 2), 0.3 + Math.random() * 0.4, 0.14 + Math.random() * 0.2, 0.3 + Math.random() * 0.4, false);
  // 나가는 문 표지판(남쪽 구멍)
  const board = makeSignBoard('🚪 나가기'); board.scale.setScalar(0.7); board.position.set(0, 1.4, -H - 0.1); g.add(board);
  scene.add(g); mineGroup = g; mineGroup.visible = false;   // 동굴에 있을 때만 표시
  // 위쪽 은은한 푸른 필(깊이감)
  const glow = new THREE.PointLight(0x9ac4ff, 0.5, 44, 1.2); glow.position.set(MINE.x, 7, MINE.z); scene.add(glow);
  // 벽 횃불(사이드) — 넓은 동굴 곳곳을 밝힘
  const torchPos = [
    [-H + 0.6, -5], [-H + 0.6, 5], [H - 0.6, -5], [H - 0.6, 5],
    [-5, H - 0.6], [5, H - 0.6], [-5, -H + 0.6], [5, -H + 0.6], [0, 0],
  ];
  torchPos.forEach(([lx, lz], i) => {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 5), clayMat(0x3a3834)); bracket.position.set(lx, 1.55, lz); g.add(bracket);
    const fm = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff8a3a, emissiveIntensity: 1.7, roughness: 0.5 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 6), fm); flame.position.set(lx, 1.95, lz); g.add(flame);
    const light = new THREE.PointLight(0xffb866, 2.2, 15, 1.2); light.position.set(lx, 2.05, lz); g.add(light);
    mineTorches.push({ light, fm, base: 2.2, phase: i * 1.6 });
  });
  // 광맥 배치(넓어진 동굴)
  for (let i = 0; i < 15; i++) {
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * (H - 2.5);
    spawnOreRock(MINE.x + Math.cos(a) * r, MINE.z + Math.sin(a) * r, weightedOre());
  }
}

function spawnMineGate() {
  const g = new THREE.Group(); g.position.copy(MINE_GATE);
  // 입구는 정면(+z)을 향함
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x565b66, roughness: 1, metalness: 0, flatShading: true });
  // 어두운 입구 구멍
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.35, 20), new THREE.MeshBasicMaterial({ color: 0x080a0e }));
  hole.position.set(0, 1.35, 0.06); g.add(hole);
  // 구멍 둘레를 바위로 둘러싸 아가리 형태
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const ang = Math.PI * (i / N);                 // 윗 반원 아치
    const rad = 1.8 + Math.random() * 0.35;
    const b = new THREE.Mesh(rockGeo, rockMat);
    b.position.set(Math.cos(ang) * rad, 1.25 + Math.sin(ang) * rad, (Math.random() - 0.5) * 0.4);
    const s = 0.55 + Math.random() * 0.7; b.scale.set(s, s * (1 + Math.random() * 0.6), s);
    b.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); b.castShadow = true; g.add(b);
  }
  // 입구 양옆 바닥의 큰 바위 무더기
  [-2.0, 2.0].forEach(x => { const b = new THREE.Mesh(rockGeo, rockMat); b.position.set(x, 0.7, 0.2); b.scale.set(1.2, 1.5, 1.2); b.rotation.y = Math.random() * 6; b.castShadow = true; g.add(b); });
  // 서 있는 팻말(나무 기둥 + 판) — 입구 앞 오른쪽
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.7, 6), woodMat(1, 1)); post.position.set(2.7, 0.85, 1.4); post.castShadow = true; g.add(post);
  const sign = makeSignBoard('⛏️ 채굴장'); sign.scale.setScalar(0.62); sign.position.set(2.7, 1.62, 1.45); g.add(sign);
  scene.add(g);
  obstacles.push({ x: MINE_GATE.x, z: MINE_GATE.z, r: 1.8 });
}

function enterMine() {
  atMine = true;
  player.position.set(MINE.x, 0, MINE.z - MINE_HALF + 3); player.rotation.y = 0;
  nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  firstHint('mineInside', '⛏️', '채굴 동굴', '⛏️괭이로 반짝이는 광맥을 캐면 돌·석탄·💎보석이 나와요. 작업대 재료·상점 판매에 쓰여요. 어두우니 캐릭터 횃불로 살펴봐요! 남쪽 문으로 나가요');
  setBGMTheme('cave');   // 🎵 음산한 동굴 테마
  Sound.blip(); trackEvent('enter_mine'); // [GA4]
}
function exitMine() {
  atMine = false;
  player.position.set(MINE_GATE.x, 0, MINE_GATE.z + 2);
  nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  setBGMTheme('main');   // 🎵 마을 테마 복귀
  Sound.blip(); trackEvent('exit_mine'); // [GA4]
}

// 채굴: 가까운 광맥을 괭이로 캐기
function tryMine() {
  let nearest = null, nd = 2.4;
  for (const rock of oreRocks) { if (rock.userData.depleted) continue; const d = dist2D(rock.position, player.position); if (d < nd) { nd = d; nearest = rock; } }
  if (!nearest) { ui.toast?.('가까운 광맥이 없어요 ⛏️'); return; }
  const ud = nearest.userData;
  doPlayerAction(nearest.position.x, nearest.position.z);
  Sound.chop(); spawnDust(nearest.position.x, nearest.position.z, 8);
  ud.hp -= 1;
  if (ud.hp <= 0) {
    const ore = ud.ore;
    const amt = ore.id === 'gem' ? 1 : (1 + (Math.random() < 0.5 ? 1 : 0) + (buffOn('mine') && Math.random() < 0.6 ? 1 : 0)); // 🍳 오믈렛 버프: 광석 추가 확률
    gameState.inventory[ore.id] = (gameState.inventory[ore.id] || 0) + amt;
    refreshInventoryUI();
    spawnFloatText(nearest.position.x, 1.4, nearest.position.z, `+${amt} ${ore.name}`, ore.id === 'gem' ? '#5ad0e0' : '#cfc8b8');
    spawnSparkle(nearest.position.x, 0.8, nearest.position.z, ore.id === 'gem' ? 26 : 12);
    Sound.harvest();
    ud.depleted = true; ud.respawnAt = clock.elapsedTime + 14; nearest.visible = false;
    questEvent('mine', amt);                       // 데일리 의뢰(광석 캐기) 진행
    dexDiscover('ore', ore.id);                    // 📖 도감(광물 첫 채굴)
    ui.act?.('mine');                              // 튜토리얼: 첫 채굴
    trackEvent('mine_ore', { ore: ore.id, amt });  // [GA4]
  }
}

// 광맥 리젠(캔 뒤 잠시 후 다시 자람)
function updateOreRocks() {
  const now = clock.elapsedTime;
  for (const rock of oreRocks) {
    const ud = rock.userData;
    if (ud.depleted && now > ud.respawnAt) { ud.depleted = false; ud.hp = 3; rock.scale.set(0.01, 0.01, 0.01); ud.growing = true; }
    if (ud.growing) { const s = THREE.MathUtils.lerp(rock.scale.x, 1, 0.12); rock.scale.set(s, s, s); if (s > 0.98) { rock.scale.set(1, 1, 1); ud.growing = false; } }
    rock.visible = atMine && !ud.depleted;   // 동굴 밖에선 안 보이게
  }
}

function enterHouse() {
  indoor = true;
  player.position.set(INT.x, 0, INT.z - 3); player.rotation.y = 0;
  nearDoor = null; ui.setDoorPrompt?.(null); ui.setIndoor?.(true); snapCamera(); setSpaceVisible();
  Sound.blip(); ui.act?.('enter'); trackEvent('enter_house'); // [GA4]
}
function exitHouse() {
  indoor = false; placingDecor = null;
  player.position.set(HOUSE_POS.x, 0, HOUSE_POS.z + 3);
  nearDoor = null; ui.setDoorPrompt?.(null); ui.setIndoor?.(false); snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('exit_house'); // [GA4]
}

// 문 근접 감지(입장/퇴장 프롬프트)
function updateDoorInteract() {
  let nd = null, prompt = null;
  if (indoor) {
    if (dist2D({ x: INT.x, z: INT.z - INT_HALF }, player.position) < 1.7) { nd = 'exit'; prompt = '🚪 나가기'; } // 문 바로 앞에서만
  } else if (atFarm) {
    if (dist2D({ x: FARM.x, z: FARM.z + FARM_HALF }, player.position) < 1.8) { nd = 'farmexit'; prompt = '🚪 나가기'; }
  } else if (atMine) {
    if (dist2D({ x: MINE.x, z: MINE.z - MINE_HALF }, player.position) < 1.7) { nd = 'mineexit'; prompt = '🚪 나가기'; }
  } else if (gameState.houseStage >= 3 && dist2D(HOUSE_POS, player.position) < 2.8) {
    nd = 'enter'; prompt = '🚪 집에 들어가기';
  } else if (dist2D(FARM_GATE, player.position) < 2.0) {
    nd = 'farm'; prompt = '🌾 내 텃밭';
  } else if (dist2D(MINE_GATE, player.position) < 2.0) {
    nd = 'mine'; prompt = '⛏️ 채굴 동굴';
  }
  nearDoor = nd;
  if (nd === 'mine') firstHint('mineGate', '⛏️', '채굴 동굴 입구', '들어가면 어두운 동굴에서 ⛏️괭이로 돌·석탄·보석을 캘 수 있어요. 작업대 재료와 상점 판매에 쓰여요!');
  // 작업대(요리) / 상점 — 마을(실외)에서 다른 프롬프트가 없을 때만
  const inVillage = !indoor && !atFarm && !atMine && !nd;
  nearBench = inVillage && dist2D(BENCH, player.position) < 2.0;
  nearShop = inVillage && !nearBench && dist2D(SHOP, player.position) < 2.0;
  nearMarket = inVillage && !nearBench && !nearShop && dist2D(MARKET, player.position) < 2.0; // 📊 시세 전광판
  nearCoop = inVillage && !nearBench && !nearShop && !nearMarket && dist2D(COOP, player.position) < 2.4; // 🐔 닭장
  if (nearBench) prompt = '🍳 요리하기 (작업대)';
  else if (nearShop) prompt = '🛒 상점';
  else if (nearMarket) { prompt = '📊 오늘의 시세'; firstHint('market', '📊', '시세 전광판', '판매 가격이 매일 바뀌어요! 전광판에서 오늘 비싼 품목을 확인하고 비쌀 때 파세요 🪙'); }
  else if (nearCoop) {
    prompt = gameState.coop.built ? '🐔 닭장' : '🐔 닭장 터';
    firstHint('coop', '🐔', '닭장 터', '남쪽 빈터에 닭장을 지을 수 있어요! 🔥 2일 연속 출석하고 재료(🪵25 🪨10 🪙60)를 모아 오세요. 지으면 매일 모이를 주고 다음날 🥚 달걀을 얻어요.');
  }
  if (prompt !== lastDoorPrompt) { lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
  // 첫 접근 안내(1회) — 초보가 각 시설 용도를 알게
  if (nearBench) firstHint('bench', '🍳', '작업대', '재료(작물·물고기·목재)로 요리(일시 버프)·도구 강화·야외 장식·주민 선물을 만들 수 있어요. 4개 탭에서 골라 만들어보세요!');
  else if (nearShop) firstHint('shop', '🛒', '상점', '작물·물고기·목재를 팔아 🪙코인을 벌고, 씨앗 등을 살 수 있어요. (팔기: 탭하면 1개, 꾹 누르면 전부)');
  else if (nd === 'farm') firstHint('farmGate', '🌾', '내 텃밭 입구', '들어가면 나만의 넓은 밭이 있어요. 마을과 별개로, 마음껏 농사지을 수 있는 나만의 공간이에요!');
  // 🎨 완성된 집 근처 → 외관 꾸미기 버튼(메뉴 대신 공간 기반 동선)
  const nearHouse = inVillage2() && gameState.houseStage >= 3 && dist2D(HOUSE_POS, player.position) < 4.2;
  if (nearHouse !== lastNearHouse) { lastNearHouse = nearHouse; ui.setNearHouse?.(nearHouse); }
  if (nearHouse) firstHint('extDecor', '🎨', '집 외관 꾸미기', '집 근처에 오면 🎨 집 외관 꾸미기 버튼이 떠요. 지붕·벽·문 색을 바꿔 나만의 집을 만들어보세요!');
}
function inVillage2() { return !indoor && !atFarm && !atMine; }   // 마을 실외 여부(집 근처 버튼용)

// =============================================================
//  포스트 프로세싱
// =============================================================
function initPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // 모바일은 블룸 해상도를 절반으로 낮춰 부담 감소
  const bloomRes = IS_MOBILE ? new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) : new THREE.Vector2(window.innerWidth, window.innerHeight);
  bloomPass = new UnrealBloomPass(bloomRes, 0.55, 0.9, 0.85); // 세기는 낮/밤에 따라 조절
  composer.addPass(bloomPass);

  // [셰이더] 비네팅 + 따뜻한 컬러 그레이딩 + 밤 푸른 톤(uNight)
  gradePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, uVignette: { value: 1.15 },
      uWarm: { value: new THREE.Color(1.06, 1.005, 0.9) }, uNight: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uVignette; uniform vec3 uWarm; uniform float uNight; varying vec2 vUv;
      void main(){
        vec4 col = texture2D(tDiffuse, vUv);
        col.rgb *= uWarm;
        // 밤: 푸른 틴트로 섞고 전체적으로 어둡게
        vec3 night = col.rgb * vec3(0.62, 0.74, 1.08);
        col.rgb = mix(col.rgb, night, uNight);
        col.rgb *= (1.0 - uNight * 0.30);
        vec2 d = vUv - 0.5;
        float vig = smoothstep(0.9, 0.28, length(d) * uVignette); // 더 부드러운 감쇠
        col.rgb *= mix(mix(0.84, 0.7, uNight), 1.0, vig);          // 낮엔 은은, 밤엔 약간 강하게
        gl_FragColor = col;
      }`,
  });
  composer.addPass(gradePass);
  composer.addPass(new OutputPass());
}

// =============================================================
//  입력
// =============================================================
function initInput() {
  const MOVE_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') wantAction = true;
    if (e.code === 'KeyC') Input.toggleSit();   // C: 앉기
    // 숫자키 1~7 로 도구 선택
    if (/^Digit[1-7]$/.test(e.code)) Input.selectTool(parseInt(e.code.slice(5)) - 1);
    // 방향키/스페이스는 브라우저 페이지 스크롤 방지(플레이 중 화면 밀림 방지)
    if (MOVE_KEYS.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (indoor && placingDecor) { tryPlaceDecor(e); return; } // 실내 가구 배치 중이면 바닥 탭 = 배치
    wantAction = true;
  });
}

// =============================================================
//  메인 루프
// =============================================================
// 서브 공간(실내/텃밭/동굴) 미니맵에 찍을 랜드마크(월드좌표) 목록
const PLOT_MINI = { empty: '#7a5230', growing: '#8fd18a', mature: '#ff8a5c', wilted: '#8a8378' };
const ORE_MINI = { stone: '#c3c3b8', coal: '#5f5f5f', gem: '#5ad0e0' };
function minimapMarks(place) {
  const marks = [];
  if (place === 'farm') {
    marks.push({ x: FARM.x, z: FARM.z + FARM_HALF, c: '#c8905a', kind: 'exit' });            // 나가는 문(남쪽)
    marks.push({ x: FARM.x - FARM_HALF + 1.5, z: FARM.z - FARM_HALF + 1.5, c: '#d9b25f', r: 2.4 }); // 허수아비
    for (const p of plots) {   // 텃밭 안 밭만(경계로 필터)
      if (Math.abs(p.x - FARM.x) > FARM_HALF + 1 || Math.abs(p.z - FARM.z) > FARM_HALF + 1) continue;
      marks.push({ x: p.x, z: p.z, c: PLOT_MINI[p.state] || '#7a5230', r: 2.4 });
    }
  } else if (place === 'mine') {
    marks.push({ x: MINE.x, z: MINE.z - MINE_HALF, c: '#c8905a', kind: 'exit' });             // 나가는 문(남쪽)
    for (const rock of oreRocks) {
      if (rock.userData.depleted) continue;
      marks.push({ x: rock.position.x, z: rock.position.z, c: ORE_MINI[rock.userData.ore.id] || '#c3c3b8', r: 2.2 });
    }
  } else if (place === 'house') {
    marks.push({ x: INT.x, z: INT.z - INT_HALF, c: '#c8905a', kind: 'exit' });                // 나가는 문(앞쪽)
    for (const d of gameState.house.decor) marks.push({ x: INT.x + d.x, z: INT.z + d.z, c: '#e0b483', r: 2.2 }); // 배치한 가구
  }
  return marks;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (mode === 'play') {
    updatePlayer(dt, t);
    updateCamera(dt);
    handleAction();
    updateNPCInteract();
    updateDoorInteract();
    updateFishing();
    emitBuffs();          // 활성 버프 HUD 갱신(만료 처리 포함)
    if (t - lastMini > 0.12) {   // 미니맵(캐릭터 위치) 갱신
      lastMini = t;
      const place = indoor ? 'house' : atFarm ? 'farm' : atMine ? 'mine' : 'village';
      const md = { place, x: player.position.x, z: player.position.z, yaw: player.rotation.y };
      if (place !== 'village') {   // 서브 공간: 중심·반경·랜드마크를 함께 전달
        const C = place === 'house' ? INT : place === 'farm' ? FARM : MINE;
        md.cx = C.x; md.cz = C.z;
        md.half = place === 'house' ? INT_HALF : place === 'farm' ? FARM_HALF : MINE_HALF;
        md.marks = minimapMarks(place);
      }
      ui.setMinimap?.(md);
    }
    // [센서] 매 프레임 스냅샷 → logger throttle 후 배치 전송
    sampleFrame(() => ({
      char: { x: player.position.x, y: 0, z: player.position.z },
      cam: { yaw: camera.rotation.y, pitch: camera.rotation.x },
    }));
  } else {
    updateAttractCamera(t);   // 로그인 배경: 카메라 천천히 회전
  }

  updateDayNight(dt);
  updateRain(dt);       // 🌧️ 빗줄기(비 오는 날 + 야외에서만)
  updateSway(t);
  updateTrees(dt);
  updateOreRocks();
  updateChickens(dt);   // 🐔 닭 배회(닭장 건설 후)
  updatePlots(dt);
  updatePops(dt);
  updateParticles(dt);
  updateCatchItem(dt);   // 🎁 캐치 아이템(수확물/물고기 들어올리기)
  updateFloatTexts(dt);
  updateNPC(dt, t);
  // 집 터 안내판/마커: 플레이 중 + 미완성일 때만 (로그인 화면에선 숨김)
  const showHouseCue = (mode === 'play' && gameState.houseStage < 3);
  if (houseSign) { houseSign.visible = showHouseCue; if (showHouseCue) houseSign.position.y = 3.3 + Math.sin(t * 2) * 0.12; }
  if (houseGhost) { houseGhost.visible = showHouseCue; if (showHouseCue) houseGhost.scale.setScalar(1 + Math.sin(t * 2) * 0.03); }
  composer.render();

  // 📷 액션샷 정점 캡처 — 렌더 직후 캡처해 항상 온전한 프레임을 얻음
  if (photoResolve && photoT >= photoPeakT) {
    const cb = photoResolve; photoResolve = null;
    let data = null;
    try { data = renderer.domElement.toDataURL('image/png'); } catch (e) {}
    cb(data);
  }
}

// 로그인 배경용 부드러운 오빗 카메라
function updateAttractCamera(t) {
  const r = 19, y = 12;
  camera.position.set(Math.cos(t * 0.11) * r, y + Math.sin(t * 0.3) * 0.6, Math.sin(t * 0.11) * r);
  camera.lookAt(0, 1.6, 0);
}

let walkPhase = 0;
let movedOnce = false;   // 튜토리얼: 첫 이동 감지
let actAnim = 0;         // 액션 제스처 진행(1→0)
let sitting = false;     // 앉기 상태

// ── 이모트 모션 — 기분에 따라 캐릭터가 실제로 움직임(춤·점프·하트·인사) ──
let emoteAnim = null;    // { type, t0, dur, fx, baseRot }
const EMOTE_MOTION = { '👋': ['wave', 1.4], '❤️': ['heart', 1.6], '😄': ['jump', 1.2], '🎵': ['dance', 2.4] };
function startEmote(type, dur) {
  sitting = false;
  emoteAnim = { type, el: 0, dur, fx: false, baseRot: player.rotation.y }; // el: 프레임 누적 경과(탭 전환 점프에 안전)
}
// updatePlayer 의 idle 분기에서 호출 — 활성 중이면 true(기본 idle 애니 스킵)
function updateEmote(dt) {
  if (!emoteAnim) return false;
  emoteAnim.el += dt;
  const p = emoteAnim.el / emoteAnim.dur;
  const A = playerAnchor;
  if (p >= 1) {   // 종료 → 원래 자세/방향 복원
    A.position.y = 0; A.rotation.z = 0; A.scale.set(1, 1, 1);
    player.rotation.y = emoteAnim.baseRot;
    emoteAnim = null; return false;
  }
  if (emoteAnim.type === 'wave') {          // 👋 좌우로 까딱까딱 인사
    A.rotation.z = Math.sin(p * Math.PI * 5) * 0.28;
    A.position.y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.08;
  } else if (emoteAnim.type === 'jump') {   // 😄 신나서 두 번 폴짝(착지 스쿼시)
    const b = Math.abs(Math.sin(p * Math.PI * 2));
    A.position.y = b * 0.55;
    A.scale.set(1 + (1 - b) * 0.09, 1 - (1 - b) * 0.11, 1 + (1 - b) * 0.09);
  } else if (emoteAnim.type === 'heart') {  // ❤️ 폴짝 뛰며 한 바퀴 + 반짝
    player.rotation.y = emoteAnim.baseRot + p * Math.PI * 2;
    A.position.y = Math.sin(p * Math.PI) * 0.4;
    if (!emoteAnim.fx && p > 0.4) { emoteAnim.fx = true; spawnSparkle(player.position.x, 1.7, player.position.z, 18); }
  } else if (emoteAnim.type === 'dance') {  // 🎵 빙글빙글 스텝 댄스(두 바퀴)
    player.rotation.y = emoteAnim.baseRot + p * Math.PI * 4;
    A.position.y = Math.abs(Math.sin(p * Math.PI * 6)) * 0.22;
    A.rotation.z = Math.sin(p * Math.PI * 8) * 0.18;
    A.scale.setScalar(1 + Math.sin(p * Math.PI * 6) * 0.04);
    if (!emoteAnim.fx && p > 0.5) { emoteAnim.fx = true; spawnFloatText(player.position.x, 2.5, player.position.z, '🎵♪', '#4a5a40'); }
  }
  return true;
}

// 액션 제스처 트리거: 대상(tx,tz) 방향으로 돌고 몸을 휙 숙였다 폄
function doPlayerAction(tx, tz) {
  if (typeof tx === 'number') player.rotation.y = Math.atan2(tx - player.position.x, tz - player.position.z);
  actAnim = 1;
}
function updatePlayer(dt, t) {
  const speed = 6 * (buffOn('speed') ? 1.4 : 1);   // 🥘 채소죽 버프: 이동속도 +40%
  let mx = 0, mz = 0;
  if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  // 모바일 조이스틱 아날로그 합산
  mx += analog.x; mz += analog.z;

  const moving = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05;
  if (moving && sitting) sitting = false;   // 움직이면 일어남
  if (moving && emoteAnim) { playerAnchor.scale.set(1, 1, 1); emoteAnim = null; } // 움직이면 이모트 취소
  if (moving && !movedOnce) { movedOnce = true; ui.act?.('move'); } // 튜토리얼: 첫 이동
  if (sitting) {
    playerAnchor.position.y = -0.3;         // 앉기: 몸을 낮춤
    playerAnchor.rotation.z *= 0.9;
  } else if (moving) {
    const len = Math.hypot(mx, mz) || 1;
    mx /= len; mz /= len;
    player.position.x += mx * speed * dt;
    player.position.z += mz * speed * dt;
    player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(mx, mz), 0.2);
    walkPhase += dt * 12;
    playerAnchor.position.y = Math.abs(Math.sin(walkPhase)) * 0.18;
    playerAnchor.rotation.z = Math.sin(walkPhase) * 0.05;
  } else if (!updateEmote(dt)) {  // 이모트 모션 중이면 기본 idle 숨쉬기 대신 모션 재생
    playerAnchor.position.y = Math.sin(t * 2) * 0.03;
    playerAnchor.rotation.z *= 0.9;
  }

  if (indoor) { // 실내: 방 벽 안쪽으로 제한(넓어진 방)
    player.position.x = Math.max(INT.x - INT_HALF + 0.6, Math.min(INT.x + INT_HALF - 0.6, player.position.x));
    player.position.z = Math.max(INT.z - INT_HALF + 0.5, Math.min(INT.z + INT_HALF - 0.6, player.position.z));
  } else if (atFarm) { // 텃밭: 울타리 안쪽으로 제한
    player.position.x = Math.max(FARM.x - FARM_HALF + 0.6, Math.min(FARM.x + FARM_HALF - 0.6, player.position.x));
    player.position.z = Math.max(FARM.z - FARM_HALF + 0.6, Math.min(FARM.z + FARM_HALF - 0.6, player.position.z));
  } else if (atMine) { // 동굴: 벽 안쪽으로 제한
    player.position.x = Math.max(MINE.x - MINE_HALF + 0.7, Math.min(MINE.x + MINE_HALF - 0.7, player.position.x));
    player.position.z = Math.max(MINE.z - MINE_HALF + 0.6, Math.min(MINE.z + MINE_HALF - 0.7, player.position.z));
  } else {
    const maxR = 42, pr = Math.hypot(player.position.x, player.position.z);
    if (pr > maxR) { player.position.x *= maxR / pr; player.position.z *= maxR / pr; }
    // 🌊 호수는 못 들어감 — 🌉 부두 위만 허용(데크 밖으로 떨어지지 않게 클램프)
    const dl = dist2D(player.position, LAKE);
    if (dl < LAKE_R + 0.3) {
      if (onPier(player.position)) {
        player.position.x = Math.min(player.position.x, PIER.x2 - 0.25);
        player.position.z = Math.max(PIER.z1 + 0.18, Math.min(PIER.z2 - 0.18, player.position.z));
      } else {
        const k = (LAKE_R + 0.3) / (dl || 0.001);   // 물가 밖으로 방사형 밀어냄
        player.position.x = LAKE.x + (player.position.x - LAKE.x) * k;
        player.position.z = LAKE.z + (player.position.z - LAKE.z) * k;
      }
    }
  }

  // 액션 제스처: 백스윙 → 휙 내려침 → 팔로스루 — 도구가 어깨 피벗으로 크게 호를 그림
  if (actAnim > 0) {
    actAnim = Math.max(0, actAnim - dt * 2.4);   // 전체 ~0.42초(읽히는 속도)
    const p = 1 - actAnim;                       // 진행도 0→1
    const s = Math.sin(p * Math.PI);             // 몸 스쿼시용 0→1→0
    // ── 도구 스윙 각도(어깨 피벗 X축) — 3단계 비대칭 곡선 ──
    const REST = -0.1;                           // 평상시 각도(buildPlayer 와 일치)
    let swing;
    if (p < 0.32) {        // ① 백스윙: 뒤로 크게 들어올림(ease-out — 천천히 멈춤)
      const q = p / 0.32; swing = REST - 1.3 * (1 - (1 - q) * (1 - q));
    } else if (p < 0.58) { // ② 내려침: 휙! (ease-in — 가속하며 190° 호)
      const q = (p - 0.32) / 0.26; swing = (REST - 1.3) + 3.3 * q * q;
    } else {               // ③ 팔로스루: 관성 지나쳤다가 부드럽게 복귀
      const q = (p - 0.58) / 0.42; swing = (REST + 2.0) - 2.0 * (1 - (1 - q) * (1 - q));
    }
    const toolId = TOOLS[currentTool].id;
    if (heldGroup) {
      // 물조리개·씨앗주머니는 내려치는 게 아니라 앞으로 기울여 붓기/뿌리기
      heldGroup.rotation.x = (toolId === 'water' || toolId === 'seed') ? REST + s * 1.0 : swing;
      heldGroup.rotation.z = -0.55 + s * 0.4;    // 스윙 중 도구를 정면으로 살짝 세워 호가 또렷하게
    }
    // ── 몸: 백스윙 때 살짝 젖혔다가, 내려칠 때 상체 비틀며 앞으로 숙임(파워 느낌) ──
    playerAnchor.rotation.x = p < 0.32 ? -0.12 * (p / 0.32) : 0.5 * s;
    playerAnchor.rotation.y = p < 0.32 ? -0.22 * (p / 0.32) : 0.3 * s * (1 - p);
    playerAnchor.position.y -= s * 0.1;
    playerAnchor.scale.set(1 + s * 0.1, 1 - s * 0.12, 1 + s * 0.1);
  } else if (playerAnchor.rotation.x !== 0 || playerAnchor.rotation.y !== 0 || (heldGroup && heldGroup.rotation.x !== -0.1)) {
    playerAnchor.rotation.x = 0; playerAnchor.rotation.y = 0; playerAnchor.scale.set(1, 1, 1);
    if (heldGroup) { heldGroup.rotation.x = -0.1; heldGroup.rotation.z = -0.55; }
  }
}

const camOffset = new THREE.Vector3(0, 14, 16);
const _camTarget = new THREE.Vector3();
const _camLook = new THREE.Vector3(0, 1.2, 0);
const _camOff = new THREE.Vector3();
let momentUntil = 0;   // 이벤트 순간 줌인 종료 시각(clock.elapsedTime)

// ── 📷 액션샷 — 카메라를 캐릭터 정면에 밀착시키고, 포즈의 정점 프레임에서 캡처 ──
//    ※ clock.elapsedTime 은 탭이 백그라운드였다 돌아오면 한 번에 점프하므로
//      프레임 누적 시간(photoT += clamped dt)으로 진행 — 탭 전환에도 안전.
let photoT = -1;             // 액션샷 경과(초). 0 미만 = 비활성
let photoPeakT = 0;          // 포즈 정점(캡처) 시점
let photoResolve = null;     // 정점 캡처 콜백(animate 렌더 직후 실행 → 빈 프레임 방지)
const PHOTO_HOLD = 1.7;      // 밀착 카메라 유지 시간(초) — 가장 늦은 포즈 정점(댄스 1.49s)보다 길게
const _photoPos = new THREE.Vector3();
// 세로 화면(모바일)은 가로 시야가 좁아 같은 거리면 과하게 확대돼 보임 → 종횡비로 밀착 거리 보정
//   데스크톱(가로)=1배, 폰 세로(≈0.46)=최대 2배까지 뒤로 — "뭘 잡았는지" 보이는 미디엄 샷
function closeUpDist(base) {
  return base * Math.min(2.0, Math.max(1, 1.35 / camera.aspect));
}
function startActionShot() {
  return new Promise((resolve) => {
    const poses = [['jump', 1.2, 0.30], ['dance', 2.4, 0.62], ['heart', 1.6, 0.55], ['wave', 1.4, 0.42]];
    const [pose, dur, peak] = poses[Math.floor(Math.random() * poses.length)];
    startEmote(pose, dur);                       // 역동적 포즈 발동
    // 밀착 위치는 시작 시점에 고정(스핀 포즈여도 카메라가 흔들리지 않게) — 정면 어깨높이
    const fy = player.rotation.y;
    const pd = closeUpDist(3.2);
    _photoPos.set(player.position.x + Math.sin(fy) * pd, 1.55 + (pd - 3.2) * 0.12, player.position.z + Math.cos(fy) * pd);
    photoT = 0;
    photoPeakT = dur * peak;                     // 포즈 정점 프레임
    photoResolve = resolve;
    Sound.blip();
  });
}
// ── 🎉 캐치 세리머니 — 수확·낚시 성공 순간: 액션샷처럼 정면 밀착 + 폴짝 모션 ──
//    (프레임 누적 진행이라 탭 전환 점프에 안전 — photoT 와 동일 메커니즘)
let momentT = -1;                 // 세리머니 경과(초). 0 미만 = 비활성
const MOMENT_HOLD = 1.15;         // 밀착 유지 시간(액션샷보다 짧게 — 게임 흐름 안 끊게)
const _momentPos = new THREE.Vector3();

// 이벤트 순간 연출 + 사진 버튼 넛지
//   close=true  : 수확·낚시 — 캐릭터 정면 밀착 + 캐치 세리머니(폴짝)
//   close=false : 집 완성·요리 — 기존 가벼운 줌(집/UI가 주인공이므로)
function triggerMoment(close = false) {
  ui.photoNudge?.();
  if (!close) { momentUntil = clock.elapsedTime + 1.3; return; }
  // doPlayerAction 이 방금 대상(밭/호수) 방향으로 몸을 돌려둔 상태 → 그 정면에서 밀착 촬영
  // 세로 화면에선 closeUpDist 가 거리를 늘려 캐릭터+수확물+주변이 함께 보이는 미디엄 샷이 됨
  const fy = player.rotation.y;
  const md = closeUpDist(3.4);
  _momentPos.set(player.position.x + Math.sin(fy) * md, 1.65 + (md - 3.4) * 0.12, player.position.z + Math.cos(fy) * md);
  momentT = 0;
  startEmote('jump', 1.0);        // 수확물 캐치 세리머니 — 신나서 폴짝
}

// ── 🎁 캐치 아이템 — 수확물/물고기가 튀어올라 캐릭터 머리 위에 들리는 연출 ──
let catchItem = null;             // { mesh, t, from }
const CATCH_ARC = 0.4;            // 포물선 비행 시간(초)

// 로우폴리 물고기(등급별 색, 무지개는 은은한 발광) — 머리 위에서 파닥파닥
function fishMesh(rarity) {
  const g = new THREE.Group();
  const col = rarity === 'rare' ? 0x7ae0ff : rarity === 'uncommon' ? 0xe06a5a : 0x9fb4c8;
  const mat = rarity === 'rare'
    ? new THREE.MeshStandardMaterial({ color: col, emissive: 0x3ac0e0, emissiveIntensity: 0.4, roughness: 0.4 })
    : clayMat(col, false);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), mat);
  body.scale.set(1.6, 0.9, 0.7); body.castShadow = true; g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 6), mat);
  tail.rotation.z = Math.PI / 2; tail.position.x = -0.52; g.add(tail);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.5 });
  [0.14, -0.14].forEach(ez => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat); e.position.set(0.3, 0.07, ez); g.add(e); });
  g.userData.flap = true;         // 살아있는 물고기 — 파닥임
  return g;
}

// 수확 열매 미니(작물 색 + 잎 꼭지) — 머리 위로 번쩍
function cropMini(type) {
  const g = new THREE.Group();
  const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), clayMat(type?.fruit ?? 0xff9e5e, false));
  fruit.castShadow = true; g.add(fruit);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 5), clayMat(0x7fc57f));
  leaf.position.y = 0.28; g.add(leaf);
  return g;
}

function showCatchItem(mesh, fx, fy, fz) {
  if (catchItem) scene.remove(catchItem.mesh);   // 연타 시 이전 것 정리
  mesh.position.set(fx, fy, fz);
  scene.add(mesh);
  catchItem = { mesh, t: 0, from: new THREE.Vector3(fx, fy, fz) };
}

// animate 에서 매 프레임 — 포물선 비행 → 머리 위 들림(파닥) → 팟 하고 가방으로
function updateCatchItem(dt) {
  if (!catchItem) return;
  catchItem.t += dt;
  const m = catchItem.mesh, T = catchItem.t;
  const headY = 2.3 + playerAnchor.position.y;   // 캐릭터가 폴짝 뛰면 같이 들썩
  if (T < CATCH_ARC) {                            // ① 물/밭에서 머리 위로 포물선 점프
    const p = T / CATCH_ARC;
    m.position.x = THREE.MathUtils.lerp(catchItem.from.x, player.position.x, p);
    m.position.z = THREE.MathUtils.lerp(catchItem.from.z, player.position.z, p);
    m.position.y = THREE.MathUtils.lerp(catchItem.from.y, headY, p) + Math.sin(p * Math.PI) * 1.2; // 아크 궤적
    m.rotation.y += dt * 10;                      // 빙글 돌며 날아옴
  } else if (T < MOMENT_HOLD + 0.2) {             // ② 머리 위에 들림 — 세리머니 동안 유지
    m.position.set(player.position.x, headY + Math.sin(T * 9) * 0.04, player.position.z);
    if (m.userData.flap) { m.rotation.z = Math.sin(T * 22) * 0.35; m.rotation.x = Math.sin(T * 17) * 0.15; } // 🐟 파닥파닥
    else m.rotation.y += dt * 2.5;                // 🥕 천천히 돌며 자랑
  } else {                                        // ③ 팟! 줄어들며 가방으로
    const s = Math.max(0.01, m.scale.x - dt * 6);
    m.scale.setScalar(s);
    if (s <= 0.02) { scene.remove(m); catchItem = null; }
  }
}
// 순간이동(집/텃밭 입퇴장) 시 카메라를 즉시 맞춰 긴 스윕 방지
function snapCamera() {
  _camTarget.copy(player.position).add(camOffset);
  camera.position.copy(_camTarget);
  _camLook.set(player.position.x, 1.2, player.position.z);
  camera.lookAt(_camLook);
}
function updateCamera(dt) {
  // 📷 액션샷 중: 캐릭터 정면 어깨높이로 빠르게 밀착(끝나면 아래 기본 추적이 부드럽게 복귀)
  if (photoT >= 0) {
    photoT += dt;                          // 프레임 누적 진행(탭 전환 점프에 안전)
    if (photoT >= PHOTO_HOLD && !photoResolve) { photoT = -1; }   // ★캡처가 끝난 뒤에만 복귀(정점 미도달 시 밀착 유지)
    else {
      const k = 1 - Math.pow(0.0004, dt);  // 밀착은 빠르게
      camera.position.lerp(_photoPos, k);
      _camLook.lerp(_camTarget.set(player.position.x, 1.05, player.position.z), k);
      camera.lookAt(_camLook);
      return;
    }
  }
  // 🎉 캐치 세리머니 중: 수확물을 낚아채는 정면을 밀착으로(끝나면 기본 추적이 부드럽게 복귀)
  if (momentT >= 0) {
    momentT += dt;                         // 프레임 누적 진행(탭 전환 점프에 안전)
    if (momentT >= MOMENT_HOLD) { momentT = -1; }
    else {
      const k = 1 - Math.pow(0.0008, dt);  // 빠르게 밀착(액션샷보다 아주 살짝 느긋)
      camera.position.lerp(_momentPos, k);
      _camLook.lerp(_camTarget.set(player.position.x, 1.05, player.position.z), k);
      camera.lookAt(_camLook);
      return;
    }
  }
  // 이벤트 순간엔 오프셋을 줄여 캐릭터로 줌인(감쇠 보간이라 부드럽게 당겨졌다 복귀)
  const zoom = clock.elapsedTime < momentUntil ? 0.58 : 1;
  _camOff.copy(camOffset).multiplyScalar(zoom);
  _camTarget.copy(player.position).add(_camOff);
  const k = 1 - Math.pow(0.025, dt);          // 값↓ = 더 부드럽게(느긋하게) 추적
  camera.position.lerp(_camTarget, k);
  _camLook.lerp(_camTarget.set(player.position.x, 1.2, player.position.z), k);
  camera.lookAt(_camLook);
}

// 하늘색/햇빛 색 키프레임 (t: 0=자정 0.25=일출 0.5=정오 0.75=일몰)
const SKY_STOPS = [
  { t: 0.00, sky: 0x1b2145, sun: 0x3b4a86 }, // 깊은 밤
  { t: 0.20, sky: 0x394073, sun: 0x8a7bb0 }, // 여명
  { t: 0.28, sky: 0xffd9b3, sun: 0xffb072 }, // 아침(일출) 따뜻
  { t: 0.50, sky: 0xdff3ff, sun: 0xffe9c4 }, // 정오 밝고 파랑
  { t: 0.72, sky: 0xffc79c, sun: 0xffa65e }, // 노을(일몰) 주황
  { t: 0.82, sky: 0x4a3f70, sun: 0x6a5e98 }, // 초저녁 보라
  { t: 1.00, sky: 0x1b2145, sun: 0x3b4a86 }, // 밤
];
const _cA = new THREE.Color(), _cB = new THREE.Color();
const _rainGray = new THREE.Color(0x8a94a0);   // 🌧️ 비/안개 낀 날 하늘 잿빛
const _snowWhite = new THREE.Color(0xe3e9f0);  // ❄️ 눈 오는 날 밝은 회백
function skyAt(t) {
  let i = 0; while (i < SKY_STOPS.length - 1 && t > SKY_STOPS[i + 1].t) i++;
  const a = SKY_STOPS[i], b = SKY_STOPS[Math.min(i + 1, SKY_STOPS.length - 1)];
  const span = (b.t - a.t) || 1, f = (t - a.t) / span;
  const e = f * f * (3 - 2 * f); // smoothstep → 부드러운 전환
  return {
    sky: _cA.setHex(a.sky).lerp(_cB.setHex(b.sky), e).clone(),
    sun: _cA.setHex(a.sun).lerp(_cB.setHex(b.sun), e).clone(),
  };
}

function updateDayNight(dt) {
  if (!dayPaused) timeOfDay = (timeOfDay + DAY_SPEED * dt) % 1; // 일시정지 아니면 자동 순환
  gameState.timeOfDay = timeOfDay;
  const daylight = Math.max(0, Math.sin(timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5);
  const nightAmt = 1 - daylight;
  const t = clock.elapsedTime;

  // 하늘·안개·햇빛 색을 키프레임 그라데이션으로 부드럽게
  const { sky, sun } = skyAt(timeOfDay);
  if (WEATHER === 'rain') { sky.lerp(_rainGray, 0.45); sun.lerp(_rainGray, 0.5); }        // 🌧️ 잿빛 톤 다운
  else if (WEATHER === 'snow') { sky.lerp(_snowWhite, 0.42); sun.lerp(_snowWhite, 0.35); } // ❄️ 밝은 회백 톤
  else if (WEATHER === 'fog') { sky.lerp(_rainGray, 0.55); sun.lerp(_rainGray, 0.5); }     // 🌫️ 뿌연 잿빛
  scene.background = sky; scene.fog.color = sky;
  sunLight.color = sun;
  const wDim = WEATHER === 'rain' ? 0.55 : WEATHER === 'fog' ? 0.6 : WEATHER === 'snow' ? 0.8 : 1;
  sunLight.intensity = (0.1 + daylight * 1.2) * wDim;   // 궂은 날 햇빛 약하게
  hemiLight.intensity = 0.2 + daylight * 0.75;
  ambient.color.setHex(0xfff0dd).lerp(new THREE.Color(0x33406e), nightAmt); // 밤엔 푸른 앰비언트
  ambient.intensity = 0.2 + nightAmt * 0.12;
  const ang = timeOfDay * Math.PI * 2;
  sunLight.position.set(Math.cos(ang) * 18, Math.sin(ang) * 18 + 2, 8);

  // 반딧불이 점멸(트윙클) — 🌫️ 안개 낀 날엔 낮에도 은은하게 떠다님(신비로운 분위기)
  const twinkle = 0.7 + Math.sin(t * 6) * 0.3;
  const ffAmt = WEATHER === 'fog' ? Math.max(nightAmt, 0.6) : nightAmt;
  fireflies.material.opacity = Math.max(0, ffAmt - 0.3) * 1.5 * twinkle;
  // 별 하늘(밤에 페이드인 + 반짝임)
  if (stars) stars.material.opacity = Math.max(0, nightAmt - 0.35) * 1.5 * (0.8 + Math.sin(t * 3.3) * 0.2);
  // 집 창문 따뜻한 불빛
  houseWindows.forEach(m => { m.emissiveIntensity = nightAmt * 2.1; });
  // 실내 조명: 안에 있을 때만 켜고, 밤일수록 더 밝게(저녁·밤엔 방 안이 포근하게 은은한 온기)
  if (interiorLamp) interiorLamp.intensity = indoor ? (1.8 + nightAmt * 2.6) : 0;
  // 캐릭터 주변 횃불: 저녁부터 서서히 밝아져 밤에 가장 밝음(낮엔 꺼짐)
  if (playerLight) playerLight.intensity = Math.max(0, nightAmt - 0.15) * 4.4;
  scene.fog.near = 18; scene.fog.far = 74;   // 기본 안개(동굴에선 아래서 걷음)
  if (!atMine) {                             // 날씨별 대기 농도(동굴은 자체 설정 유지)
    if (WEATHER === 'rain') { scene.fog.near = 14; scene.fog.far = 58; }
    else if (WEATHER === 'fog') { scene.fog.near = 8; scene.fog.far = 36; }   // 🌫️ 시야가 뿌옇게
    else if (WEATHER === 'snow') { scene.fog.near = 16; scene.fog.far = 62; }
  }
  // 채굴 동굴: 시간대 무관 밝게(잘 보이게) + 차가운 톤 + 벽 횃불
  if (atMine) {
    hemiLight.intensity = 0.5; ambient.intensity = 0.72; sunLight.intensity = 0.12;  // 잘 보이게(무드는 블루톤+횃불로)
    ambient.color.setHex(0x4a5878);   // 동굴 블루(ambient는 매 프레임 리셋되므로 안전)
    if (playerLight) playerLight.intensity = 3.0;
    scene.fog.color.setHex(0x141a26); scene.fog.near = 26; scene.fog.far = 64;   // 동굴 벽은 보이되 먼 다른 공간은 어둠에 묻힘
    // 벽 횃불 깜빡임
    const tt = clock.elapsedTime;
    for (const t of mineTorches) { const f = 0.85 + Math.sin(tt * 7 + t.phase) * 0.15; t.light.intensity = t.base * f; t.fm.emissiveIntensity = 1.4 * f + 0.4; }
  }
  // 집 안내판: 낮엔 매트(후광X), 밤엔 은은하게 빛나 잘 보이게(동적 채광)
  if (houseSign && houseSign.visible) houseSign.material.color.setScalar(1 + nightAmt * 0.28);
  // 블룸 밤에 살짝 더 강하게
  if (bloomPass) bloomPass.strength = 0.5 + nightAmt * 0.5;
  // 밤 푸른 톤 그레이딩
  if (gradePass) gradePass.uniforms.uNight.value = nightAmt;

  // 노브 위치는 timeOfDay(하루 사이클 0~1) 기준 — 슬라이더 클릭 위치와 1:1 대응
  ui.setTime?.(daylight > 0.4 ? 'day' : 'night', timeOfDay, WEATHER === 'clear' ? null : WEATHER);
}

function updateSway(t) {
  for (const s of swayables) {
    const ph = s.userData.swayPhase || 0;
    s.rotation.z = Math.sin(t * 1.3 + ph) * 0.08;
    s.rotation.x = Math.cos(t * 1.1 + ph) * 0.05;
  }
  if (fireflies) {
    const base = fireflies.userData.base, pos = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) pos[i + 1] = base[i + 1] + Math.sin(t * 1.5 + i) * 0.25;
    fireflies.geometry.attributes.position.needsUpdate = true;
  }
}

function updateTrees(dt) {
  const now = clock.elapsedTime;
  for (const tree of trees) {
    const ud = tree.userData;
    if (ud.squash > 0) {
      ud.squash = Math.max(0, ud.squash - dt * 4);
      const sq = ud.squash;
      tree.scale.set(1 + Math.sin(sq * Math.PI) * 0.14, 1 - Math.sin(sq * Math.PI) * 0.18, 1 + Math.sin(sq * Math.PI) * 0.14);
      tree.rotation.z = Math.sin(sq * 22) * 0.06 * sq;
    }
    if (ud.fallen && now > ud.respawnAt) { ud.fallen = false; ud.hp = 3; tree.visible = true; tree.scale.set(0.01, 0.01, 0.01); ud.growing = true; }
    if (ud.growing) {
      const s = THREE.MathUtils.lerp(tree.scale.x, 1, dt * 5);
      tree.scale.set(s, s, s);
      if (s > 0.98) { tree.scale.set(1, 1, 1); ud.growing = false; }
    }
  }
}

// =============================================================
//  상호작용: 선택 도구에 따라 분기
// =============================================================
function handleAction() {
  if (!wantAction) return;
  wantAction = false;
  // 문/게이트(입장/퇴장) 우선
  if (nearDoor === 'enter') return enterHouse();
  if (nearDoor === 'exit') return exitHouse();
  if (nearDoor === 'farm') return enterFarm();
  if (nearDoor === 'farmexit') return exitFarm();
  if (nearDoor === 'mine') return enterMine();
  if (nearDoor === 'mineexit') return exitMine();
  if (atMine) {                   // 동굴: 괭이로만 채굴 가능
    if (TOOLS[currentTool].id === 'hoe') return tryMine();
    ui.toast?.('⛏️ 괭이(도구 2)로 캐야 해요');
    return;
  }
  // 실내에선 도구질(밭갈기·낚시 등) 금지 — 가구 배치만(선택 중이면 발 앞에 놓기)
  if (indoor) {
    if (placingDecor) placeDecor(placingDecor, player.position.x, player.position.z);
    else ui.toast?.('🎨 꾸미기 버튼으로 가구를 골라 배치하세요');
    return;
  }
  if (placingOutdoor) return placeOutdoor(player.position.x, player.position.z); // 야외 장식 설치 중이면 발밑에 설치
  if (nearBench) return ui.openCook?.();   // 작업대 근처 → 요리 메뉴
  if (nearShop) return ui.openShop?.();    // 상점 근처 → 상점 메뉴
  if (nearMarket) { ui.act?.('market'); return ui.openMarket?.(marketData()); } // 📊 전광판 → 시세판 모달(튜토리얼: 시세 확인)
  if (nearCoop) return coopInteract();     // 🐔 닭장 → 건설/모이/달걀
  // 데스크톱(Space)만 근접 시 대화로 분기. 모바일은 전용 "대화하기" 버튼으로만
  // 대화 → 수확·벌목 중 NPC가 겹쳐도 액션 버튼이 대화로 새지 않음
  if (nearNPC && !IS_MOBILE) return talkToNPC();
  switch (TOOLS[currentTool].id) {
    case 'axe': return tryChop();
    case 'hoe': return tryHoe();
    case 'seed': return trySeed();
    case 'water': return tryWater();
    case 'sickle': return tryHarvest();
    case 'hammer': return tryBuild();
    case 'rod': return tryFish();
  }
}

// =============================================================
//  낚시: 호수 물가에서 던지기 → 물면 낚아채기(반응 미니게임)
// =============================================================
function tryFish() {
  if (fishState === 'bite') { catchFish(); return; }        // 지금! 낚아채기
  if (fishState === 'wait') { resetFishing(); ui.toast?.('낚싯줄을 걷었어요'); return; }
  // idle → 캐스팅. 물가 근처여야 함
  const distLake = dist2D(LAKE, player.position);
  if (distLake > LAKE_R + 2.8) { ui.toast?.('🎣 호수 물가에서 낚시하세요'); return; }
  const dir = _v.set(LAKE.x - player.position.x, 0, LAKE.z - player.position.z).normalize();
  castPos.set(player.position.x + dir.x * 2.6, 0.35, player.position.z + dir.z * 2.6);
  // 물 위로 클램프
  const dc = Math.hypot(castPos.x - LAKE.x, castPos.z - LAKE.z);
  if (dc > LAKE_R - 0.4) { const k = (LAKE_R - 0.6) / dc; castPos.set(LAKE.x + (castPos.x - LAKE.x) * k, 0.35, LAKE.z + (castPos.z - LAKE.z) * k); }
  if (!bobber) buildBobber();
  bobber.position.copy(castPos); bobber.visible = true;
  doPlayerAction(castPos.x, castPos.z); // 낚싯대 던지기 제스처
  fishState = 'wait'; biteAt = clock.elapsedTime + (RAIN_DAY ? 1.0 + Math.random() * 1.6 : 1.5 + Math.random() * 2.8); // 🌧️ 비 오는 날: 입질 빨라짐
  Sound.water(); spawnWater(castPos.x, castPos.z);
  ui.setFishPrompt?.('🎣 던졌어요… 물 때까지 기다려요');
  trackEvent('fishing_cast'); // [GA4]
}

function catchFish() {
  // 🐟 생선구이 버프(luck)·🌧️ 비 오는 날: 두 번 굴려 작은 값 채택 → 희귀/고급 확률↑
  let roll = Math.random();
  if (buffOn('luck') || RAIN_DAY) roll = Math.min(roll, Math.random());
  const kind = FISH_KINDS.find(k => roll <= k.p) || FISH_KINDS[FISH_KINDS.length - 1];
  doPlayerAction(castPos.x, castPos.z); // 낚아채기 제스처
  gameState.inventory.fish += 1; refreshInventoryUI();
  spawnFloatText(castPos.x, 1.0, castPos.z, `+1 🐟 ${kind.name}`, '#2f6a8a');
  if (kind.rarity !== 'common') spawnSparkle(castPos.x, 0.7, castPos.z, 20);
  Sound.harvest();
  questEvent('fish'); if (kind.rarity === 'rare') questEvent('fish_rare');
  dexDiscover('fish', kind.rarity);                                     // 📖 도감(어종 첫 발견)
  ui.act?.('fish');                                                     // 튜토리얼: 낚시
  triggerMoment(true);                                                  // 🎉 캐치 세리머니(밀착 + 폴짝)
  showCatchItem(fishMesh(kind.rarity), castPos.x, 0.25, castPos.z);     // 🐟 물속에서 튀어나와 머리 위에서 파닥!
  tryUnlockDrop(kind.rarity === 'rare' ? 0.6 : kind.rarity === 'uncommon' ? 0.18 : 0.08); // 🎨 랜덤 색(희귀일수록↑)
  trackEvent('fishing_catch', { fish: kind.name, rarity: kind.rarity }); // [GA4]
  resetFishing();
}

function resetFishing() {
  fishState = 'idle'; if (bobber) bobber.visible = false; ui.setFishPrompt?.(null);
}

function buildBobber() {
  bobber = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), clayMat(0xff7b7b, false)); top.position.y = 0.08; bobber.add(top);
  const bot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), clayMat(0xffffff, false)); bot.position.y = -0.05; bobber.add(bot);
  bobber.visible = false; scene.add(bobber);
}

function updateFishing() {
  if (fishState === 'idle') return;
  if (TOOLS[currentTool].id !== 'rod' || indoor) { resetFishing(); return; } // 도구 바꾸면 취소
  const now = clock.elapsedTime;
  if (fishState === 'wait') {
    bobber.position.y = 0.32 + Math.sin(now * 3) * 0.04; // 잔잔히 떠 있음
    if (now >= biteAt) {
      fishState = 'bite'; biteEnd = now + (gameState.upgrades.rod ? 2.6 : 1.4); // 튼튼한 낚싯대: 입질 여유↑
      ui.setFishPrompt?.('❗ 물었어요! 지금 낚아채요!');
      Sound.blip(); spawnWater(castPos.x, castPos.z);
    }
  } else if (fishState === 'bite') {
    bobber.position.y = 0.15 + Math.sin(now * 30) * 0.08; // 격하게 요동
    if (now > biteEnd) { ui.toast?.('놓쳤어요 🐟💨'); trackEvent('fishing_miss'); resetFishing(); }
  }
}

// ── 벌목 ─────────────────────────────────────────────────────
function tryChop() {
  let nearest = null, nd = 2.6;
  for (const tree of trees) {
    if (tree.userData.fallen) continue;
    const d = dist2D(tree.position, player.position);
    if (d < nd) { nd = d; nearest = tree; }
  }
  if (!nearest) { ui.toast?.('가까운 나무가 없어요'); return; }
  const ud = nearest.userData;
  ud.squash = 1;
  doPlayerAction(nearest.position.x, nearest.position.z); // 벌목 제스처
  Sound.chop();
  spawnLeafBurst(nearest); spawnWoodChips(nearest);
  ud.hp -= gameState.upgrades.axe ? 2 : 1;                     // 강철 도끼: 2번에 벌목
  const bonus = (buffOn('chop') ? 1 : 0)
    + (WEATHER === 'snow' && Math.random() < 0.5 ? 1 : 0);     // 🪓 도시락 버프 / ❄️ 눈: 가지가 잘 부러져 +1 확률
  if (ud.hp <= 0) {
    gameState.inventory.wood += 3 + bonus; ud.fallen = true; ud.respawnAt = clock.elapsedTime + 12;
    nearest.visible = false; spawnLeafBurst(nearest, 26);
    spawnFloatText(nearest.position.x, 2.4, nearest.position.z, `+${3 + bonus} 🪵`, '#7a5230'); // 획득 표시
  } else { gameState.inventory.wood += 1 + bonus; spawnFloatText(nearest.position.x, 2.2, nearest.position.z, `+${1 + bonus} 🪵`, '#7a5230'); }
  refreshInventoryUI();
  questEvent('chop');                                          // 퀘스트 진행
  ui.act?.('chop');                                            // 튜토리얼
  trackChop(trees.indexOf(nearest), gameState.inventory.wood); // [GA4]
}

// =============================================================
//  농사: 밭 타일 상태머신
//  state: 'empty'(갈아둔 이랑) → 'growing'(3단계 성장) → 'mature'(수확가능)
//  stage: 0 새싹 → 1 자람 → 2 수확가능
// =============================================================
function createPlot(x, z, silent = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1.7), clayMat(PAL.soil, false));
  soil.position.y = 0.1; soil.receiveShadow = true; g.add(soil);
  // 이랑(줄무늬) — 갈아엎은 밭 느낌의 두둑 3줄
  for (let k = -1; k <= 1; k++) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.34), clayMat(0x80553a, false));
    ridge.position.set(0, 0.21, k * 0.5); ridge.receiveShadow = true; g.add(ridge);
  }
  scene.add(g);
  const plot = { group: g, soil, crop: null, state: 'empty', growth: 0, stage: -1, x, z, watered: false };
  plots.push(plot);
  if (!silent) { g.userData.pop = 1; g.scale.setScalar(0.01); spawnDust(x, z, 14); } // 흙먼지 + 톡 등장
  return plot;
}

function plantSeed(plot) {
  if (gameState.inventory.seed <= 0) { ui.toast?.('씨앗이 없어요 🌰'); return; }
  gameState.inventory.seed -= 1;
  plot.state = 'growing'; plot.growth = 0.05; plot.stage = -1;
  plot.cropType = CROP_TYPES[Math.floor(Math.random() * CROP_TYPES.length)]; // 작물 종류 랜덤
  doPlayerAction(plot.x, plot.z); // 심기 제스처
  Sound.plant();
  refreshCropStage(plot);   // 0단계(새싹) 메시 생성 + 팝
  refreshInventoryUI(); updatePlotVisual(plot);
  questEvent('plant');      // 퀘스트 진행
  ui.act?.('seed');         // 튜토리얼
  trackEvent('plant_seed'); // [GA4]
}

// 괭이: 빈 땅이면 밭 만들기(+씨앗 심기), 갈아둔 밭이면 씨앗 심기
function tryHoe() {
  const gx = Math.round(player.position.x / 2) * 2;
  const gz = Math.round(player.position.z / 2) * 2;
  let plot = plots.find(p => dist2D(p.group.position, player.position) < 1.6);
  if (!plot) {
    if (isBlocked(gx, gz)) { ui.toast?.('여기엔 밭을 만들 수 없어요 🌳'); return; } // 나무·호수·벤치·가로등·집
    createPlot(gx, gz);                          // 밭만 갈기 (씨앗은 🌰 도구로 심기)
    doPlayerAction(gx, gz);                      // 밭갈기 제스처
    Sound.till();
    ui.act?.('till');                            // 튜토리얼
    ui.toast?.('밭을 갈았어요 — 🌰 씨앗 도구로 심어요');
    return;
  }
  if (plot.state === 'wilted') {                 // 시든 밭 → 다시 갈아엎기(빈 밭)
    clearCrop(plot);
    plot.state = 'empty'; plot.wilted = false; plot.growth = 0; plot.stage = -1; plot.needSince = 0;
    spawnDust(plot.x, plot.z, 10); Sound.till();
    ui.toast?.('밭을 다시 갈았어요 — 🌰 씨앗을 심어요');
  } else if (plot.state === 'empty') ui.toast?.('이미 갈아둔 밭이에요 — 🌰 씨앗을 심어요');
  else ui.toast?.('이미 작물이 자라는 중이에요');
}

// 씨앗: 갈아둔 빈 밭에 씨앗 심기
function trySeed() {
  const plot = plots.find(p => p.state === 'empty' && dist2D(p.group.position, player.position) < 1.6);
  if (!plot) { ui.toast?.('갈아둔 밭이 없어요 — ⛏️ 괭이로 먼저 갈기'); return; }
  if (gameState.inventory.seed <= 0) {
    // 밭에 자라는 작물도 없으면 완전히 막힌 상태 → 씨앗 지급(안전장치)
    const hasGrowing = plots.some(p => p.state === 'growing' || p.state === 'mature');
    if (!hasGrowing) {
      gameState.inventory.seed += 3; refreshInventoryUI();
      ui.showSeedHelp?.();   // 안내 모달로 상황 설명 + 채워줌 (이번엔 안내만, 다시 눌러 심기)
      return;
    } else {
      ui.toast?.('씨앗이 없어요 — 작물을 수확하면 씨앗이 늘어요 🌾'); return;
    }
  }
  plantSeed(plot);
}

// 물조리개: 자라는 밭에 물 → 성장(물 없이는 안 자람) + 물방울 파티클
function tryWater() {
  const plot = plots.find(p => p.state === 'growing' && dist2D(p.group.position, player.position) < 1.8);
  if (!plot) {
    const wilted = plots.find(p => p.state === 'wilted' && dist2D(p.group.position, player.position) < 1.8);
    ui.toast?.(wilted ? '🥀 시든 작물이에요. 괭이로 다시 심어요' : '물 줄 작물이 없어요 💧');
    return;
  }
  if (clock.elapsedTime < (plot.wetUntil || 0)) { ui.toast?.('아직 흙이 촉촉해요 🌱'); return; } // 마른 뒤에만 성장
  plot.growth = Math.min(1, plot.growth + (gameState.upgrades.water ? 0.7 : 0.4)); // 큰 물조리개: 성장 증가↑
  plot.wetUntil = clock.elapsedTime + WET_TIME; plot.watered = true;
  doPlayerAction(plot.x, plot.z); // 물주기 제스처
  Sound.water();
  spawnWater(plot.x, plot.z);   // [파티클] 물방울 + 무지개 반짝임
  refreshCropStage(plot);       // 단계 상승 시 새 메시 + 팝
  updatePlotVisual(plot);
  questEvent('water');          // 퀘스트 진행
  ui.act?.('water');            // 튜토리얼
  trackEvent('water_crop');     // [GA4]
}

// 낫: 다 자란 작물 수확 → 반짝이 스파클 + 작물 +1
function tryHarvest() {
  const plot = plots.find(p => p.state === 'mature' && dist2D(p.group.position, player.position) < 1.8);
  if (!plot) { ui.toast?.('수확할 작물이 없어요 🌾'); return; }
  doPlayerAction(plot.x, plot.z); // 수확 제스처
  gameState.inventory.crop += 1; // 작물 +1
  gameState.inventory.seed += 2; // 씨앗 +2 (심기 1 소모 대비 순증 → 농사 지속 가능)
  Sound.harvest();
  ui.toast?.(`${plot.cropType?.name || '작물'} +1 수확! 🌾`);
  spawnFloatText(plot.x, 1.1, plot.z, '+1 🥕', '#c05a2a'); // 획득 표시
  spawnSparkle(plot.x, 0.7, plot.z, 24); // [파티클] 반짝이 폭발
  if (plot.crop) { plot.group.remove(plot.crop); plot.crop = null; }
  plot.state = 'empty'; plot.growth = 0; plot.stage = -1; plot.watered = false;
  updatePlotVisual(plot);
  refreshInventoryUI();
  questEvent('harvest');                                          // 퀘스트 진행
  if (plot.cropType?.id) dexDiscover('crop', plot.cropType.id);   // 📖 도감(작물 첫 수확)
  ui.act?.('harvest');                                            // 튜토리얼: 수확
  triggerMoment(true);                                            // 🎉 캐치 세리머니(밀착 + 폴짝)
  showCatchItem(cropMini(plot.cropType), plot.x, 0.6, plot.z);    // 🥕 열매를 머리 위로 번쩍!
  tryUnlockDrop(0.05);                                            // 🎨 랜덤 색(낮은 확률)
  trackEvent('harvest_crop', { crop: gameState.inventory.crop }); // [GA4]
}

// 성장은 오직 물주기로만! 여기선 마름·목마름 알림·시들기를 처리(리얼리티)
function updatePlots(dt) {
  const now = clock.elapsedTime;
  for (const plot of plots) {
    if (plot.state === 'growing') {
      if (RAIN_DAY) {   // 🌧️ 비 오는 날: 흙이 계속 촉촉 + 천천히 저절로 자람(물주기 불필요)
        plot.wetUntil = Math.max(plot.wetUntil || 0, now + 1.5);
        plot.growth = Math.min(1, plot.growth + (dt || 0) * 0.012);
        refreshCropStage(plot);
        if (plot.state !== 'growing') continue;   // 방금 다 자랐으면(mature) 아래 로직 스킵
      }
      const wet = now < (plot.wetUntil || 0);
      if (wet !== plot.watered) { plot.watered = wet; updatePlotVisual(plot); }
      if (wet) { plot.needSince = 0; }
      else {
        if (!plot.needSince) plot.needSince = now;              // 목마르기 시작
        else if (now - plot.needSince > WILT_TIME) wiltPlot(plot); // 오래 방치 → 시듦
      }
      // '물을 줘야해요!' 알림: 목마른 성장 작물 위에
      setPlotWarn(plot, !wet);
      setPlotHarvest(plot, false); setPlotSeedHint(plot, false);
    } else if (plot.state === 'mature') {
      setPlotWarn(plot, false); setPlotHarvest(plot, true); setPlotSeedHint(plot, false); // 다 자람 → "수확!"
    } else if (plot.state === 'empty') {
      setPlotWarn(plot, false); setPlotHarvest(plot, false); setPlotSeedHint(plot, true); // 빈 밭 → "씨앗!"
    } else {
      setPlotWarn(plot, false); setPlotHarvest(plot, false); setPlotSeedHint(plot, false); // 시든 밭 등
    }
    if (plot.warn && plot.warn.visible) plot.warn.position.y = 1.4 + Math.sin(now * 3) * 0.06; // 살짝 둥실
    if (plot.harvest && plot.harvest.visible) plot.harvest.position.y = 1.4 + Math.sin(now * 3 + 1) * 0.06;
    if (plot.seedHint && plot.seedHint.visible) plot.seedHint.position.y = 1.4 + Math.sin(now * 3 + 2) * 0.06;
  }
}

// 시들기: 갈색으로 축 처지고 'wilted' 상태로(괭이로 다시 심어야 함)
function wiltPlot(plot) {
  plot.wilted = true; plot.state = 'wilted';
  if (plot.crop) {
    plot.crop.traverse(o => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.color.set(0x9a844f); } });
    plot.crop.rotation.z = 0.5; plot.crop.scale.y *= 0.6;
  }
  setPlotWarn(plot, false);
  ui.toast?.('🥀 작물이 시들었어요… 괭이로 다시 심어요');
}

function clearCrop(plot) {
  if (plot.crop) { plot.group.remove(plot.crop); plot.crop = null; }
  plot.crop = null;
}

// 밭 위 '물!' 경고 스프라이트 토글(공유 텍스처)
let _warnMat = null;
function warnMaterial() {
  if (_warnMat) return _warnMat;
  const cv = document.createElement('canvas'); cv.width = 176; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(140,200,255,0.96)'; roundRect(c, 8, 8, 160, 64, 18); c.fill();
  c.beginPath(); c.moveTo(78, 72); c.lineTo(98, 72); c.lineTo(84, 94); c.closePath(); c.fill();
  c.fillStyle = '#164a6a'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('💧 물 줘요!', 88, 40);
  const tex = new THREE.CanvasTexture(cv);
  _warnMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return _warnMat;
}
function setPlotWarn(plot, show) {
  if (show && !plot.warn) {
    plot.warn = new THREE.Sprite(warnMaterial());
    plot.warn.scale.set(1.15, 0.68, 1); plot.warn.position.set(0, 1.4, 0);
    plot.group.add(plot.warn);
  }
  if (plot.warn) plot.warn.visible = show;
}

// 밭 위 '수확!' 알림 스프라이트(공유 텍스처)
let _harvestMat = null;
function harvestMaterial() {
  if (_harvestMat) return _harvestMat;
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(150,220,150,0.96)'; roundRect(c, 8, 8, 184, 64, 18); c.fill();
  c.beginPath(); c.moveTo(90, 72); c.lineTo(110, 72); c.lineTo(96, 94); c.closePath(); c.fill();
  c.fillStyle = '#245a2a'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('🌾 수확!', 100, 40);
  const tex = new THREE.CanvasTexture(cv);
  _harvestMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return _harvestMat;
}
function setPlotHarvest(plot, show) {
  if (show && !plot.harvest) {
    plot.harvest = new THREE.Sprite(harvestMaterial());
    plot.harvest.scale.set(1.28, 0.7, 1); plot.harvest.position.set(0, 1.4, 0);
    plot.group.add(plot.harvest);
  }
  if (plot.harvest) plot.harvest.visible = show;
}

// 밭 위 '씨앗을 넣어요' 알림(빈 밭)
let _seedHintMat = null;
function seedHintMaterial() {
  if (_seedHintMat) return _seedHintMat;
  const cv = document.createElement('canvas'); cv.width = 248; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(233,206,150,0.97)'; roundRect(c, 8, 8, 232, 64, 18); c.fill();
  c.beginPath(); c.moveTo(114, 72); c.lineTo(134, 72); c.lineTo(120, 94); c.closePath(); c.fill();
  c.fillStyle = '#6b4a20'; c.font = 'bold 28px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('🌰 씨앗을 넣어요', 124, 40);
  const tex = new THREE.CanvasTexture(cv);
  _seedHintMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return _seedHintMat;
}
function setPlotSeedHint(plot, show) {
  if (show && !plot.seedHint) {
    plot.seedHint = new THREE.Sprite(seedHintMaterial());
    plot.seedHint.scale.set(1.55, 0.65, 1); plot.seedHint.position.set(0, 1.4, 0);
    plot.group.add(plot.seedHint);
  }
  if (plot.seedHint) plot.seedHint.visible = show;
}

function updatePlotVisual(plot) {
  plot.soil.material.color.set(plot.watered ? PAL.soilWet : PAL.soil); // 젖은 흙 색
}

// 성장 단계(0 새싹 → 1 자람 → 2 수확가능)를 growth로 판정, 변할 때 메시 재생성 + 팝
function refreshCropStage(plot) {
  const desired = plot.growth >= 0.8 ? 2 : plot.growth >= 0.4 ? 1 : 0;
  if (desired === plot.stage) return;
  plot.stage = desired;
  buildCropStage(plot);        // 새 단계 메시 생성 + 톡 튀는 팝
  if (desired === 2) {         // 수확 준비 완료
    plot.state = 'mature';
    spawnSparkle(plot.x, 0.7, plot.z, 8);
    ui.toast?.(`🌾 ${plot.cropType?.name || '작물'}가 다 자랐어요! 낫으로 수확하세요`);
  }
}

// 단계별 작물 메시(그룹 scale=1, 크기는 지오메트리로 → updatePops 팝과 호환)
function buildCropStage(plot) {
  if (plot.crop) plot.group.remove(plot.crop);
  const g = new THREE.Group(); g.position.y = 0.26;
  const col = plot.cropType?.fruit ?? PAL.crop;
  if (plot.stage === 0) {
    // 새싹: 작고 연두
    const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 5), clayMat(0x9be89b));
    sprout.position.y = 0.15; g.add(sprout);
  } else if (plot.stage === 1) {
    // 자람: 중간 줄기 + 잎
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), clayMat(PAL.sprout));
    stem.position.y = 0.25; g.add(stem);
    [[-0.16, 0.3], [0.16, 0.42]].forEach(([lx, ly]) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), clayMat(PAL.cropLeaf));
      leaf.scale.set(1, 0.5, 0.7); leaf.position.set(lx, ly, 0); g.add(leaf);
    });
  } else {
    // 수확가능: 무성한 잎 + 열매 톡 보임
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), clayMat(PAL.cropLeaf));
    bush.position.y = 0.32; bush.scale.set(1, 0.82, 1); g.add(bush);
    const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 0), clayMat(col, false));
    fruit.position.y = 0.56; g.add(fruit);
  }
  plot.group.add(g); plot.crop = g;
  g.userData.pop = 1; g.scale.setScalar(0.01);   // 단계 전환 시 톡 튀는 팝 스케일
}

// =============================================================
//  건축: 망치로 집 터에서 단계 건설
// =============================================================
function tryBuild() {
  if (dist2D(HOUSE_POS, player.position) > 3.2) { ui.toast?.('집 터(반투명 자리)로 가세요 🏠'); return; }
  if (gameState.houseStage >= 3) { const r = doExpand(); ui.toast?.(r.msg, 3200); return; }   // 🏗️ 완성 후엔 망치=증축
  const next = gameState.houseStage + 1;
  if (gameState.inventory.wood < BUILD_COST) { ui.toast?.(`${STAGE_NAMES[next]}엔 목재 ${BUILD_COST}개가 필요해요 🪵`); return; }
  gameState.inventory.wood -= BUILD_COST;
  doPlayerAction(HOUSE_POS.x, HOUSE_POS.z); // 건축 제스처
  buildHouseStage(next);
  if (next < 3) ui.toast?.(`🪵 ${STAGE_NAMES[next]} 완성! (-${BUILD_COST} 목재)`);
  refreshInventoryUI();
}

// =============================================================
//  팝 애니메이션(밭/작물/집 부재 톡 튀어오름)
// =============================================================
// ── 획득 표시: "+3 🪵" 처럼 위로 떠오르며 사라지는 텍스트(스프라이트) ──
const floatTexts = [];
function spawnFloatText(x, y, z, text, color = '#3a4a40') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
  const c = cv.getContext('2d');
  c.font = 'bold 52px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,0.92)'; c.strokeText(text, 128, 48);
  c.fillStyle = color; c.fillText(text, 128, 48);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(1.9, 0.72, 1); sp.position.set(x, y, z);
  sp.userData = { life: 1.4, vy: 1.5 };
  scene.add(sp); floatTexts.push(sp);
}
function updateFloatTexts(dt) {
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const s = floatTexts[i], u = s.userData;
    u.life -= dt; s.position.y += u.vy * dt; u.vy *= 0.95;
    s.material.opacity = Math.min(1, u.life * 1.6);
    if (u.life <= 0) { scene.remove(s); s.material.map.dispose(); s.material.dispose(); floatTexts.splice(i, 1); }
  }
}

function updatePops(dt) {
  // scene 전체에서 pop(스케일) / rise(솟아오름) 표시 객체 처리
  scene.traverse(obj => {
    const u = obj.userData;
    if (!u) return;
    if (u.pop > 0) {
      u.pop = Math.max(0, u.pop - dt * 3);
      const p = 1 - u.pop;
      const s = p < 1 ? p + Math.sin(p * Math.PI) * 0.25 : 1; // 통통 튀는 오버슛
      obj.scale.set(s, s, s);
      if (u.pop === 0) obj.scale.set(1, 1, 1);
    }
    if (u.rise > 0) {
      u.rise = Math.max(0, u.rise - dt * 2.2);
      const e = easeOutBack(1 - u.rise);                     // 아래→위 오버슛
      obj.position.y = u.riseFrom + (u.riseTarget - u.riseFrom) * e;
      if (u.rise === 0) obj.position.y = u.riseTarget;
    }
    if (u.swim) {                                            // 어항 속 물고기: 좌우로 살랑살랑
      const t = clock.elapsedTime;
      obj.position.x = Math.sin(t * 1.6) * 0.16;
      obj.rotation.y = Math.cos(t * 1.6) > 0 ? 0 : Math.PI;  // 방향 전환
      obj.position.y = 0.4 + Math.sin(t * 2.3) * 0.03;
    }
  });
}
function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

// =============================================================
//  [파티클] 공용 파티클 풀
// =============================================================
const _leafGeo = new THREE.PlaneGeometry(0.22, 0.22);
const _chipGeo = new THREE.TetrahedronGeometry(0.12);
const _dropGeo = new THREE.SphereGeometry(0.07, 6, 6);
const _confGeo = new THREE.PlaneGeometry(0.16, 0.24);

function makeParticle(geo, color, additive = false) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.9, side: THREE.DoubleSide, transparent: true,
    emissive: additive ? color : 0x000000, emissiveIntensity: additive ? 1.2 : 0,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive,
  });
  const m = new THREE.Mesh(geo, mat); scene.add(m); return m;
}

function spawnLeafBurst(tree, count = 14) {
  const c = new THREE.Color(tree.userData.leafColor);
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_leafGeo, c);
    p.position.set(tree.position.x + (Math.random() - 0.5), 2 + Math.random() * 1.2, tree.position.z + (Math.random() - 0.5));
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), spin: rndSpin(6), life: 1.4, gravity: -4, flutter: true };
    particles.push(p);
  }
}
function spawnWoodChips(tree) {
  const c = new THREE.Color(PAL.wood);
  for (let i = 0; i < 8; i++) {
    const p = makeParticle(_chipGeo, c);
    p.position.set(tree.position.x + (Math.random() - 0.5) * 0.4, 0.9, tree.position.z + (Math.random() - 0.5) * 0.4);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 4, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 4), spin: rndSpin(10), life: 1.0, gravity: -9, flutter: false };
    particles.push(p);
  }
}
// 밭갈기/건축: 흙먼지가 살짝 피어오름
function spawnDust(x, z, count = 12) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_chipGeo, new THREE.Color(0xc9a988));
    p.position.set(x + (Math.random() - 0.5) * 1.4, 0.2, z + (Math.random() - 0.5) * 1.4);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.6 + Math.random(), (Math.random() - 0.5) * 1.2), spin: rndSpin(4), life: 0.9, gravity: -1.2, flutter: false, grow: 2 };
    particles.push(p);
  }
}
// 물주기: 물방울 + 무지개 반짝임
function spawnWater(x, z) {
  for (let i = 0; i < 12; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(0x8fd0ff), true);
    p.position.set(x + (Math.random() - 0.5) * 0.8, 1.6, z + (Math.random() - 0.5) * 0.8);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8), spin: rndSpin(2), life: 1.0, gravity: -6, flutter: false };
    particles.push(p);
  }
  // 작은 무지개 반짝임(색색의 발광 점)
  const rainbow = [0xff8a8a, 0xffd28a, 0xfff58a, 0x8affa0, 0x8ad2ff, 0xc08aff];
  for (let i = 0; i < 6; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(rainbow[i]), true);
    p.position.set(x + (Math.random() - 0.5) * 1.0, 1.2 + Math.random() * 0.6, z + (Math.random() - 0.5) * 1.0);
    p.userData = { vel: new THREE.Vector3(0, 0.4, 0), spin: rndSpin(1), life: 0.9, gravity: 0.5, flutter: false };
    particles.push(p);
  }
}
// 수확: 별/스파클(발광)
function spawnSparkle(x, y, z, count = 16) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_chipGeo, new THREE.Color(0xfff2a0), true);
    p.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2), spin: rndSpin(8), life: 1.0, gravity: -3, flutter: false };
    particles.push(p);
  }
}
// 집 완성: 색종이(색색의 평면 조각)
function spawnConfetti(x, y, z) {
  const cols = [0xff8a8a, 0xffd28a, 0x8affa0, 0x8ad2ff, 0xc08aff, 0xfff58a];
  for (let i = 0; i < 40; i++) {
    const p = makeParticle(_confGeo, new THREE.Color(cols[i % cols.length]));
    p.position.set(x + (Math.random() - 0.5) * 1.5, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 1.5);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3), spin: rndSpin(12), life: 2.2, gravity: -3.5, flutter: true };
    particles.push(p);
  }
}
function rndSpin(m) { return new THREE.Vector3(Math.random() * m, Math.random() * m, Math.random() * m); }

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i], u = p.userData;
    u.life -= dt;
    u.vel.y += u.gravity * dt;
    if (u.flutter) u.vel.x += Math.sin(clock.elapsedTime * 8 + i) * dt * 1.5;
    p.position.addScaledVector(u.vel, dt);
    p.rotation.x += u.spin.x * dt; p.rotation.y += u.spin.y * dt; p.rotation.z += u.spin.z * dt;
    if (u.grow) p.scale.multiplyScalar(1 + u.grow * dt); // 먼지 퍼짐
    if (p.position.y < 0.05) { p.position.y = 0.05; u.vel.set(0, 0, 0); }
    p.material.opacity = Math.min(1, u.life);
    if (u.life <= 0) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); }
  }
}

// =============================================================
//  NPC (마을 주민 다중) + 퀘스트 체인
// =============================================================
let trackedNPC = null;                 // 퀘스트 패널에 표시할 NPC
const RES_LABEL = { wood: '목재', seed: '씨앗', crop: '작물', fish: '물고기', coins: '🪙코인', stone: '돌', coal: '석탄', gem: '보석', egg: '달걀' };

// id별 퀘스트 진행 상태(없으면 생성)
function npcState(id) {
  if (!gameState.npcs[id]) gameState.npcs[id] = { idx: 0, progress: 0, given: false, allDone: false };
  return gameState.npcs[id];
}

// 모든 주민 생성 (데이터 기반)
function buildNPCs() {
  refreshDailyQuests();   // 부팅 시점에도 데일리 의뢰 채움(빈 quests 로 글리프 접근 방지)
  for (const def of NPCS) {
    const g = new THREE.Group();
    g.position.set(def.pos[0], 0, def.pos[2]);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clayMat(def.color, false));
    body.position.y = 0.55; body.castShadow = true; body.scale.set(1, 1.05, 1); g.add(body);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(0xffe0c0, false));
    head.position.y = 1.15; head.castShadow = true; g.add(head);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), clayMat(def.hat));
    brim.position.y = 1.4; g.add(brim);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), clayMat(def.hat));
    top.position.y = 1.5; g.add(top);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
    [-0.13, 0.13].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat); e.position.set(ex, 1.18, 0.32); g.add(e); });
    scene.add(g);

    // 머리 위 상태 말풍선(캔버스 텍스처 — 외부 파일 없음)
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(0.9, 0.9, 0.9); sprite.position.y = 2.15; g.add(sprite);

    const o = {
      def, group: g, body, sprite, ctx, tex, lastGlyph: null,
      home: new THREE.Vector3(def.pos[0], 0, def.pos[2]),
      target: new THREE.Vector3(def.pos[0], 0, def.pos[2]),
      wanderTimer: Math.random() * 3, phase: Math.random() * 6,
    };
    npcObjs.push(o);
    updateNPCGlyph(o);
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// 상태 글리프: ! 수락가능 / … 진행중 / ✓ 완료 / (없음) 전부완료
function npcGlyph(o) {
  const st = npcState(o.def.id);
  if (st.allDone) return '';
  if (!st.given) return '!';
  return st.progress >= o.def.quests[st.idx].target ? '✓' : '…';
}
function updateNPCGlyph(o) {
  if (!o || !o.ctx) return;
  const g = npcGlyph(o);
  if (g === o.lastGlyph) return; o.lastGlyph = g;
  const c = o.ctx; c.clearRect(0, 0, 128, 128);
  if (!g) { o.sprite.visible = false; o.tex.needsUpdate = true; return; }
  o.sprite.visible = true;
  c.fillStyle = g === '✓' ? '#8fd6a0' : g === '!' ? '#ffd27a' : '#cfe3ff';
  roundRect(c, 18, 14, 92, 82, 22); c.fill();
  c.beginPath(); c.moveTo(54, 94); c.lineTo(74, 94); c.lineTo(60, 118); c.closePath(); c.fill();
  c.fillStyle = '#3a4a40'; c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(g, 64, 55);
  o.tex.needsUpdate = true;
}

// 주민 애니메이션: 숨쉬기 + 말풍선 부유 + 근접 시 바라보기 / 아니면 배회
function updateNPC(dt, t) {
  for (const o of npcObjs) {
    o.body.position.y = 0.55 + Math.sin(t * 2 + o.phase) * 0.04;
    if (o.sprite) o.sprite.position.y = 2.15 + Math.sin(t * 2.5 + o.phase) * 0.08;
    if (mode === 'play' && nearNPC === o) {
      const dx = player.position.x - o.group.position.x, dz = player.position.z - o.group.position.z;
      o.group.rotation.y = lerpAngle(o.group.rotation.y, Math.atan2(dx, dz), 0.2); // 플레이어 바라보기
    } else {
      wanderNPC(o, dt);                                                            // 홈 주변 배회
    }
    updateNPCGlyph(o);
  }
}
function wanderNPC(o, dt) {
  o.wanderTimer -= dt;
  if (o.wanderTimer <= 0) {
    o.wanderTimer = 3 + Math.random() * 4;
    const a = Math.random() * Math.PI * 2, r = Math.random() * 1.6;
    o.target.set(o.home.x + Math.cos(a) * r, 0, o.home.z + Math.sin(a) * r);
  }
  const dx = o.target.x - o.group.position.x, dz = o.target.z - o.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.06) {
    o.group.position.x += (dx / d) * 0.5 * dt;
    o.group.position.z += (dz / d) * 0.5 * dt;
    o.group.rotation.y = lerpAngle(o.group.rotation.y, Math.atan2(dx, dz), 0.1);
  }
}

// 근접 시 가장 가까운 주민 선택 → 프롬프트 + 퀘스트 패널
function updateNPCInteract() {
  let near = null, nd = 2.6;
  for (const o of npcObjs) { const d = dist2D(o.group.position, player.position); if (d < nd) { nd = d; near = o; } }
  if (near !== nearNPC) {
    nearNPC = near;
    ui.setInteractPrompt?.(near ? `💬 ${near.def.name} · Space 로 대화` : null);
    if (near) { const st = npcState(near.def.id); if (st.given && !st.allDone) { trackedNPC = near; refreshQuestPanel(); } }
  }
}

// 대화 시작 = 현재 주민 상태를 담은 모달을 연다(수락/보상은 버튼으로)
function talkToNPC() {
  const view = npcDialogState();
  if (view) {
    Sound.blip(); ui.openNPCModal?.(view); ui.act?.('talk'); // 튜토리얼
    dexDiscover('npc', view.npc.id);                         // 📖 도감(이웃 첫 대화)
    // [GA4] 대화 이벤트 — 주민별 대화 횟수 / mode(offer·progress·claim·done)로 대화→수락 전환 분석.
    //   ※ GA4 전용(스키마 자유). Supabase game_logs(고정 스키마)엔 넣지 않아 연동 충돌 없음.
    trackEvent('npc_talk', { npc: view.npc.id, mode: view.mode });
    // [퍼널①] 퀘스트 노출 — offer 화면을 봤다 = 퍼널의 시작점(노출→수락 전환율 측정)
    if (view.mode === 'offer') trackEvent('quest_offered', { quest_id: view.qid, npc: view.npc.id, quest: view.title });
  }
}

// 근접 주민의 현재 대화/퀘스트 상태를 뷰 객체로 반환
//   mode: 'offer'(수락 전) | 'progress'(진행 중) | 'claim'(보상 대기) | 'done'(전부 완료)
export function npcDialogState() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  if (st.allDone) return { npc: o.def, mode: 'done', line: o.def.doneLine || '덕분에 마을이 살아났어요. 정말 고마워요! 🌼' };
  const q = o.def.quests[st.idx];
  const base = { npc: o.def, title: q.title, desc: q.desc, target: q.target, reward: rewardText(q.reward), qid: o.def.id + ':' + st.idx }; // qid: 퍼널 분석용 표준 퀘스트 ID
  if (!st.given) return { ...base, mode: 'offer', line: q.line, progress: 0 };
  if (st.progress < q.target) return { ...base, mode: 'progress', line: '조금만 더 부탁해요!', progress: st.progress };
  return { ...base, mode: 'claim', line: '다 해냈네요! 보상을 받아요 🎁', progress: st.progress };
}

// 퀘스트 수락(모달 "수락하기" 버튼) → 갱신된 상태 반환
export function npcAccept() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  if (!st.given && !st.allDone) {
    st.given = true; st.progress = 0; st.readyToasted = false;
    st.acceptedAt = Date.now();         // [퍼널②] 수락 시각(epoch ms) — 저장돼 세션 넘어도 유지
    const q = o.def.quests[st.idx];
    const qid = o.def.id + ':' + st.idx;
    if (q.grant) giveReward(q.grant, 'quest_grant', qid);   // 수행에 필요한 자원 지급(예: 씨앗 3개)
    trackedNPC = o; refreshCollectQuests(); refreshQuestPanel(); updateNPCGlyph(o);
    trackEvent('quest_accept', { quest: q.title, npc: o.def.id, quest_id: qid }); // [GA4]
  }
  return npcDialogState();
}

// 보상 수령(모달 "보상 받기" 버튼) → 갱신된 상태 반환
export function npcClaim() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  if (st.allDone) return npcDialogState();
  const q = o.def.quests[st.idx];
  if (st.given && st.progress >= q.target) {
    const qid = o.def.id + ':' + st.idx;
    giveReward(q.reward, 'quest_reward', qid); Sound.harvest();      // [원장] 퀘스트 코인 보상 출처 기록
    if (o.def.daily && q.lucky) rollLuckyBox(qid);                   // 🎁 데일리 의뢰: 럭키박스 확률 보상
    ui.act?.('quest');                                               // 튜토리얼: 퀘스트 보상까지 완료
    tryUnlockDrop(0.5);                                              // 🎨 랜덤 색(퀘스트 보상, 높은 확률)
    // [퍼널③] 완료 — 수락→완료 소요시간(초). acceptedAt 없는 옛 세이브는 null.
    const elapsed = st.acceptedAt ? Math.round((Date.now() - st.acceptedAt) / 1000) : null;
    trackEvent('quest_complete', { quest: q.title, npc: o.def.id, quest_id: qid, elapsed_sec: elapsed, reward_coins: q.reward.coins || 0 }); // [GA4]
    st.idx++; st.given = false; st.progress = 0; st.readyToasted = false; st.acceptedAt = null;
    if (st.idx >= o.def.quests.length) { st.allDone = true; ui.setQuest?.(null); syncBadges(); } // 🏅 체인 완료 배지
    if (trackedNPC === o) trackedNPC = null;
    refreshCollectQuests(); refreshQuestPanel(); updateNPCGlyph(o);
  }
  return npcDialogState();
}

// 이벤트형 퀘스트 진행(벌목/수확/물주기/심기/건축) — 모든 주민 검사
function questEvent(type, amount = 1) {
  for (const o of npcObjs) {
    const st = npcState(o.def.id);
    if (st.allDone || !st.given) continue;
    const q = o.def.quests[st.idx];
    if (q.type !== type) continue;
    st.progress = Math.min(q.target, st.progress + amount);
    if (st.progress >= q.target) ui.toast?.(`✅ ${o.def.name}의 목표 달성!`);
    updateNPCGlyph(o);
  }
  refreshQuestPanel();
}

// 보유량형 퀘스트(collect_wood/collect_crop) — 인벤토리 변할 때 재계산
function refreshCollectQuests() {
  for (const o of npcObjs) {
    const st = npcState(o.def.id);
    if (st.allDone || !st.given) continue;
    const q = o.def.quests[st.idx];
    if (q.type === 'collect_wood') st.progress = Math.min(q.target, gameState.inventory.wood);
    else if (q.type === 'collect_crop') st.progress = Math.min(q.target, gameState.inventory.crop);
    else continue;
    if (st.progress >= q.target && !st.readyToasted) { st.readyToasted = true; ui.toast?.(`✅ ${o.def.name}의 목표 달성!`); }
    updateNPCGlyph(o);
  }
  refreshQuestPanel();
}

function questView(o) {
  const st = npcState(o.def.id);
  if (st.allDone || !st.given) return null;
  const q = o.def.quests[st.idx];
  return { name: o.def.name, title: q.title, desc: q.desc, progress: st.progress, target: q.target, ready: st.progress >= q.target };
}
function refreshQuestPanel() { ui.setQuest?.(trackedNPC ? questView(trackedNPC) : null); }
function rewardText(r) { return Object.entries(r).map(([k, v]) => `${RES_LABEL[k] || k}+${v}`).join(', '); }

function giveReward(r, source = 'reward', item = null) {
  for (const k in r) gameState.inventory[k] = (gameState.inventory[k] || 0) + r[k];
  if (r.coins) logEcon(source, item, r.coins, gameState.inventory.coins); // [원장] 코인 보상 유입(출처 명시)
  refreshInventoryUI();
  if (player) spawnFloatText(player.position.x, 1.9, player.position.z, '+' + rewardText(r), '#2fa564'); // 보상 표시
}

// =============================================================
//  UI / 유틸
// =============================================================
function refreshInventoryUI() {
  ui.setInventory?.(gameState.inventory);
  refreshCollectQuests();   // 보유량형 퀘스트 진행 갱신
}
function dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
// 해당 위치가 장애물(나무·호수·벤치·가로등·집)과 겹치는지 — 밭 크기 여유(0.95) 포함
function isBlocked(x, z) { return obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 0.95); }
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
