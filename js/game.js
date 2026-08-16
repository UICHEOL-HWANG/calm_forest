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

import { sampleFrame, startLogging } from './logger.js';         // [센서] 로깅
import { saveGame, loadGame, sendBoatRun } from './supabase-client.js';  // [Supabase] 저장 + 🛶 런 기록
import { trackChop, trackEvent } from './analytics.js';          // [GA4] 이벤트
import { logEcon, startMetrics } from './metrics.js';            // [계측] 경제 원장 + 세션 요약
import { Sound, initSound, startRainSound, stopRainSound, setBGMTheme } from './sound.js'; // 🔊 절차적 사운드 + 🌧️ 빗소리 + 🎵 BGM 테마

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
  { id: 'net',    name: '포충망',   ico: '🦋' }, // 🌟 반딧불이 잡기(밤·남쪽 숲)
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
// 🌡️ 궂은 날씨 이벤트(서리·태풍) — 날짜 시드라 전 유저 동일. 약 14%의 날에 발생.
//    예보(내일)를 보고 "오늘 수확하거나 덮개를 설치"하게 만드는 재방문 훅.
//    ※ 밤손님과 달리 서버 판정이 없다: 예보가 공개 결정값이라 리롤할 유인이 없기 때문.
//    테스트: ?severe=frost|storm (오늘을 그 이벤트 날로 간주)
function severeOf(offsetDays = 0) {
  const r = dateHash('severe', offsetDays) % 100;
  return r < 7 ? 'frost' : r < 14 ? 'storm' : null;
}
const SEVERE_INFO = {
  frost: { ico: '❄️', name: '서리',  hit: '서리가 내려' },
  storm: { ico: '🌀', name: '태풍',  hit: '거센 바람이 지나가' },
};
const SEVERE_TODAY = ['frost', 'storm'].includes(_wq?.get?.('severe')) ? _wq.get('severe') : severeOf(0);
const SEVERE_TOMORROW = ['frost', 'storm'].includes(_wq?.get?.('severe2')) ? _wq.get('severe2') : severeOf(1); // ?severe2= 내일 예보 강제(테스트)
// 내일 예보 한 줄 — 궂은 이벤트가 있으면 일반 날씨 예보를 덮어쓴다(우선 안내)
function forecastLine() {
  if (SEVERE_TOMORROW) {
    const s = SEVERE_INFO[SEVERE_TOMORROW];
    return `내일은 ${s.ico} ${s.name} 예보! 오늘 수확하거나 작업대에서 덮개를 준비하세요!`;
  }
  return FORECAST_MSG[FORECAST];
}
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
// ── 요리 레시피(자유주방) — 작물/물고기 → 일시 버프. mg: 미니게임 종류(pot=끓이기 타이밍, chop=썰기 리듬) ──
const RECIPES = [
  { id: 'veg_stew',     name: '든든한 채소죽', ico: '🥘', cost: { crop: 3 },          buff: 'speed', dur: 60, desc: '60초 이동속도 +40%', mg: 'pot' },
  { id: 'grilled_fish', name: '생선 구이',     ico: '🐟', cost: { fish: 2 },          buff: 'luck',  dur: 90, desc: '90초 희귀 물고기 확률↑', mg: 'chop' },
  { id: 'lunchbox',     name: '모둠 도시락',   ico: '🍱', cost: { crop: 2, fish: 1 }, buff: 'chop',  dur: 90, desc: '90초 벌목 시 목재 +1', mg: 'chop' },
  { id: 'omelette',     name: '푸짐한 오믈렛', ico: '🍳', cost: { egg: 2, crop: 1 },  buff: 'mine',  dur: 90, desc: '90초 채굴 시 광석 추가 확률↑', mg: 'pot' }, // 🥚 닭장 달걀 요리
  { id: 'mushroom_soup', name: '숲의 버섯 스프', ico: '🍄', cost: { forage: 3 },      buff: 'speed', dur: 150, desc: '150초 이동속도 +40%', mg: 'pot' }, // 🍄 채집 숲 재료
];
// ☕ 카페 서빙 단가 — 재료 원가(시세 기준)보다 넉넉해 "요리해서 파는" 동선이 이득이 되게
const CAFE_PAY = { veg_stew: 30, grilled_fish: 34, lunchbox: 42, omelette: 40, mushroom_soup: 46 };
// 버프 메타 — desc는 초보자용 설명(첫 획득 모달·칩 클릭 모달에 표시)
const BUFF_META = {
  speed: { ico: '👟', name: '빠른 발',     desc: '이동 속도가 40% 빨라져요. 넓은 마을과 텃밭·동굴을 오갈 때 시간을 아껴줘요.' },
  luck:  { ico: '🍀', name: '낚시 행운',   desc: '낚시할 때 희귀 물고기(🐠 붉은 물고기·🌈 무지개 물고기)가 잡힐 확률이 올라가요. 호수 부두에서 낚싯대(7번)로 낚아보세요!' },
  chop:  { ico: '🪓', name: '벌목 보너스', desc: '나무를 벨 때마다 목재를 1개 더 받아요. 건축·작업대 재료를 모을 때 딱이에요.' },
  mine:  { ico: '⛏️', name: '광부의 힘',   desc: '동굴에서 채굴할 때 광석(돌·석탄·💎보석)을 추가로 얻을 확률이 올라가요. 마을 서쪽 동굴 입구로!' },
};
const buffs = { speed: 0, luck: 0, chop: 0, mine: 0 };   // 각 버프 만료 시각(clock.elapsedTime 기준)
function buffOn(k) { return clock.elapsedTime < buffs[k]; }
const BENCH = new THREE.Vector3(4, 0, -5);      // 작업대(도구·장식·선물 제작) 위치
let nearBench = false;
// 🍳 자유주방 — 작업대에서 요리를 분리한 새 작업장. 요리는 이제 미니게임(타이밍·리듬)으로 만든다
const KITCHEN = new THREE.Vector3(7.4, 0, -6.4);  // 작업대 동쪽 옆(상점·시세판과 안 겹치는 빈터)
let nearKitchen = false;
const SHOP = new THREE.Vector3(9, 0, 0);        // 상점 좌판(집터 -8,-8 에서 멀리 동쪽)
let nearShop = false;
const MARKET = new THREE.Vector3(11.5, 0, 2.4); // 📊 시세판(상점 동쪽, 플레이어 동선 위) — 초보자도 시세를 발견하게
let nearMarket = false;
const SELL_ICO_G = { crop: '🥕', fish: '🐟', wood: '🪵', stone: '🪨', coal: '⚫', gem: '💎', egg: '🥚', bug: '🌟', forage: '🍄' };
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
const COOP = new THREE.Vector3(-4.5, 0, 11.5); // 텃밭 입구 남서쪽 트인 목 — 나무에 안 가리는 자리(초보 발견성)
// 공원 벤치 [x, z, 회전] — 마을 중심부 트인 자리(랜덤 나무 밴드 r8~30을 피하거나 나무 회피 목록으로 보호)
const PARK_BENCHES = [[-2.2, 4.6, 0.3], [6.5, 6.5, -1.1]];
const COOP_COST = { wood: 25, stone: 10, coins: 60 };
const COOP_FEED = 2;                            // 모이(씨앗) 소비량
let nearCoop = false, coopGroup = null, coopSign = null;
const chickens = [];
const oreRocks = [];                            // 동굴 광석 바위들
const mineTorches = [];                         // 동굴 벽 횃불(깜빡임)
let farmGroup, mineGroup;                        // 텃밭/동굴 그룹(가시성 토글용)

// ── 🌟 반딧불이 계곡(남쪽 숲) — 🌙 밤에만 나타나고 🦋포충망으로 잡는 "새 동사" ──
//    마을 불빛에서 떨어뜨려 배치(어두울수록 잘 보임). 낮에만 하던 플레이에 "밤에 다시 올 이유"를 만듦.
const GLADE = new THREE.Vector3(2, 0, 25);      // 계곡 중심(남쪽 숲) — ☕카페 구역과 안 겹치게 더 남쪽으로
const GLADE_R = 7;                              // 반딧불이가 떠다니는 반경
const GLADE_MAX = IS_MOBILE ? 5 : 7;            // 동시 개체 수
const NIGHT_MIN = 0.45;                         // 이 이상 어두워야 출현(밤 판정)
// 종류 — p는 누적 확률(FISH_KINDS 와 동일 규칙: roll <= p 인 첫 항목)
const BUG_KINDS = [
  { id: 'rainbow', name: '무지개반디', ico: '🌈', color: 0xffc0f0, p: 0.06 },
  { id: 'green',   name: '초록반디',   ico: '🟢', color: 0xa8ffb0, p: 0.22 },
  { id: 'blue',    name: '푸른반디',   ico: '🔵', color: 0x9ad8ff, p: 0.48 },
  { id: 'yellow',  name: '노랑반디',   ico: '🟡', color: 0xfff2a8, p: 1.00 },
];
const gladeBugs = [];                           // 살아있는 반딧불이 개체
let gladeGroup = null, nearGlade = false;
let bugRespawnAt = 0;                           // 다음 개체 보충 시각(clock.elapsedTime)
let nightLevel = 0;                             // updateDayNight 이 매 프레임 갱신(0=한낮 1=한밤)
function isNight() { return nightLevel >= NIGHT_MIN; }

// ── ☕ 카페 — 채굴장처럼 처음부터 마을에 있는 장소. 새 동사: 접객/서빙 ──
//    마을 남쪽 건물로 들어가면 별도의 넓은 홀이 열리고, 그 안에 손님 NPC가 앉아 있다.
//    손님에게 직접 걸어가 요리를 가져다주는 "공간 기반" 의뢰.
//    농사(작물)·낚시(물고기)·닭장(달걀)·채집(버섯)이 전부 "쓸 곳"을 얻어 하나로 엮임.
const CAFE_GATE = new THREE.Vector3(4, 0, 14);  // 마을 안 카페 건물(입구) — 주민 자리·호수·계곡과 안 겹치는 빈터
const CAFE = new THREE.Vector3(0, 0, 320);      // 카페 홀(다른 인스턴스 공간과 멀찍이)
const CAFE_HALF = 11;                           // 넓은 홀 반경
const CAFE_ORDERS = 4;                          // 하루 손님 수
const CAFE_BONUS = 60;                          // 손님 전원 서빙 시 보너스 코인
const CAFE_SEATS = [[-6, -3.5], [6, -3.5], [-6, 4.5], [6, 4.5]];   // 홀 안 테이블 좌석(홀 로컬 좌표)
const CAFE_BOARD = [6.6, -7.9];                 // 📋 주문판(칠판) — 카운터 옆(동선상 눈에 띄게)
let atCafe = false, nearCafeBoard = false;
let cafeInGroup = null, cafeGuestObjs = [];     // 홀 그룹 / 앉은 손님 런타임 { order, group, sprite, phase }
let nearCafeGuest = null;

// ── 🍄 채집 숲(남서쪽) — 새 동사: 채집(심지 않고 줍기). 시간이 지나면 다시 돋아남 ──
//    씨앗·물주기 없이 "돌아다니며 발견"하는 재미. 🌧️ 비 온 날엔 버섯이 유독 잘 나옴(날씨 연동)
const FOREST = new THREE.Vector3(-13, 0, 24);
const FOREST_R = 9;
const FORAGE_NODES = IS_MOBILE ? 8 : 11;        // 동시에 돋아 있는 채집물 수
const FORAGE_RESPAWN = [55, 110];               // 채집 후 다시 돋기까지(초) 최소~최대
// p는 누적 확률(FISH_KINDS 규칙과 동일). give 는 획득 자원
const FORAGE_KINDS = [
  { id: 'herb',     name: '숲 약초',   ico: '🌿', p: 0.12, give: { forage: 2 },          color: 0x7fd6a0 },
  { id: 'acorn',    name: '도토리',    ico: '🌰', p: 0.38, give: { forage: 1, seed: 2 }, color: 0xc99a5a },
  { id: 'berry',    name: '산딸기',    ico: '🫐', p: 0.66, give: { forage: 1, crop: 1 }, color: 0x8a7ad0 },
  { id: 'mushroom', name: '숲 버섯',   ico: '🍄', p: 1.00, give: { forage: 1 },          color: 0xe0705a },
];
const forageNodes = [];                          // { mesh, kind, x, z, ready, respawnAt, phase }
let forestGroup = null, nearForest = false;

// ── 🛶 나루터 & 강 내려가기(마을 북쪽 12시) — 새 동사: 노 젓기 ──────────
//    마을 북쪽 선착장에서 강 공간(별도 인스턴스)으로 이동 → 나룻배 1인칭.
//    배는 자동으로 하류(-z)로 흘러가고 플레이어는 좌우 조향 + 노 젓기(스퍼트)만 한다.
//    ※ 코스는 "날짜+회차" 시드로 결정 — 새로고침 리롤이 안 되고, 그날 모두가 같은 코스라
//      로그에서 유저 간 실력 비교가 가능하다(난이도 튜닝·이탈 지점 분석의 전제).
const DOCK_GATE = new THREE.Vector3(0, 0, -15);   // 마을 12시 방향 선착장(빈 땅)
const DOCK_POND = new THREE.Vector3(0, 0, -21.5); // 나루터 앞 물가 — 마을 호수처럼 둥근 모양
const DOCK_POND_R = 7;                            // 연못 반경(나무·꽃 배치와 물 진입 차단의 기준)
const RIVER = new THREE.Vector3(0, 0, -400);      // 강 공간(다른 인스턴스와 멀찍이)
const RIVER_DOCK_HALF = 6;                        // 상류 나루터(걸어 다니는 데크) 반경
const RIVER_W = 6.4;                              // 강폭 절반 — 배 좌우 이동 한계
const RIVER_LEN = 620;                            // 코스 길이(월드 단위) ≈ 60초
const BOAT_RUNS_PER_DAY = 3;                      // 하루 무료 횟수(리텐션 훅 + 보상 인플레 방지)
const BOAT_LAMPS = 3;                             // 기본 램프(충돌 허용 횟수) — 선체 업그레이드로 +1씩
const BOAT_BASE_SPEED = 9.5;                      // 시작 속도(구간이 진행될수록 가속)
const BOAT_BOOST_CD = 3.2;                        // 노 젓기(스퍼트) 재사용 대기(초)
// 장애물 — r: 좌우 반폭(충돌 판정), hit: 램프를 깎는지(소용돌이는 안 깎고 밀기만)
const RIVER_OBS = {
  rock:  { r: 1.15, hit: true },   // 🪨 바위
  log:   { r: 2.0,  hit: true },   // 🪵 떠내려온 통나무(넓음, 좌우로 천천히 흐름)
  pile:  { r: 0.75, hit: true },   // 🪧 다리 기둥(좁은 문을 만듦 — 쌍으로 배치)
  whirl: { r: 1.7,  hit: false },  // 🌀 소용돌이 — 안 아프지만 배를 끌어당김
};
// 강에서만 나오는 수집물(📖 도감 river 4종) — ⭐별조각은 화폐라 도감에 없음
const RIVER_PICKS = [
  { id: 'lotus',     name: '물 위 연꽃',    ico: '🪷', give: { seed: 2 },          color: 0xffb6d5 },
  { id: 'driftwood', name: '떠내려온 나무', ico: '🪵', give: { wood: 2 },          color: 0xc09068 },
  { id: 'shell',     name: '강 조개',       ico: '🐚', give: { star: 2 },          color: 0xffe6c0 },
  { id: 'moon_fish', name: '달빛 물고기',   ico: '🌕', give: { fish: 2, star: 3 }, color: 0xdfe9ff, night: true },  // 🌙 밤에만
];
// 🧰 뱃사공의 창고 — ⭐별조각 + 🪙코인으로 배를 강화(후반 코인 싱크)
const BOAT_UPGRADES = [
  { id: 'oar',  name: '튼튼한 노',   ico: '🚣', max: 2, desc: '좌우로 더 빠르게 피할 수 있어요',
    cost: [{ star: 8, coins: 80 }, { star: 16, coins: 180 }] },
  { id: 'hull', name: '단단한 선체', ico: '🛶', max: 2, desc: '💡램프 +1 (충돌을 한 번 더 버텨요)',
    cost: [{ star: 12, coins: 120 }, { star: 22, coins: 260 }] },
  { id: 'lamp', name: '뱃머리 등불', ico: '🏮', max: 1, desc: '🌙밤에도 앞이 환하고 밤 보상 +20%',
    cost: [{ star: 10, coins: 100 }] },
];
let riverGroup = null, dockGroup = null;          // 강 공간 / 마을 선착장 그룹
let atRiver = false;                              // 강 공간에 있는지(나루터 데크 포함)
let nearBoat = false, nearBoatShop = false;       // 데크 위 근접 대상
let boatView = 'first';                           // 'first'(1인칭) | 'third' — 멀미 대비 토글
const riverCourse = [];                           // 이번 런의 코스 데이터(시드 생성, 진행거리 오름차순)
const riverActive = [];                           // 화면에 떠 있는 오브젝트 { mesh, item }
const riverPool = {};                             // 종류별 메시 재사용 풀(모바일 부담 감소) { kind: [mesh] }
// 진행 중인 런 상태 — active=false 면 데크에서 대기 중
const boat = {
  active: false, group: null, dist: 0, speed: 0, vx: 0, lamps: 0, stars: 0,
  hits: 0, hitLog: [], picks: {}, boostUntil: 0, boostReadyAt: 0, boostUsed: 0,
  invUntil: 0, stunUntil: 0, wreckAt: 0, shake: 0, next: 0, runNo: 0, seed: 0, startedAt: 0, night: false, t: 0,
};

// ── 🌫️ 안개 낀 숲(마을 북서) — 새 동사: 등불 점화 + ♪연주로 달래기(무폭력 웨이브) ──
//    처음부터 있는 장소(카페·채굴장 문법). 게이트 → 별도 인스턴스, 숲 안은 항상 어둑+짙은 안개.
//    그림자 정령이 수호목의 빛을 갉아먹으러 다가오고, 플레이어는 등불을 켜(감속) ♪리듬 탭으로
//    달랜다(성불). 웨이브 3회를 버티면 그날 하루 정화 — 매일 리셋되는 데일리 루프.
const MIST_GATE = new THREE.Vector3(-13, 0, -13);   // 마을 북서(집 뒤편 어두운 숲)
const MIST = new THREE.Vector3(0, 0, -250);         // 숲 인스턴스(다른 공간과 멀찍이)
const MIST_HALF = 13;
const MIST_WAVES = [3, 4, 5];                       // 웨이브별 정령 수(🌫️안개 날 +1)
const TREE_LIGHT_MAX = 100;                         // 수호목 빛 — 0이 되면 부드러운 실패
const MIST_DRAIN = 4;                               // 수호목에 붙은 정령 1마리당 빛 감소량(/초)
const SOOTHE_GLOW = 2;                              // 달래기 성공 보상 ✨(황금 정령은 2배)
const PURIFY_GLOW = 6;                              // 정화 완료 보너스 ✨
// 그림자 정령 종류 — 📖 도감 spirit 카테고리와 1:1. golden 은 🌫️안개 날에만
const SPIRITS = [
  { id: 'shy',      name: '수줍은 정령',   ico: '🟣', color: 0x8a6cc9, speed: 0.5,  size: 0.3 },
  { id: 'sleepy',   name: '졸린 정령',     ico: '🔵', color: 0x5a6cc0, speed: 0.38, size: 0.36 },
  { id: 'mischief', name: '장난꾸러기 정령', ico: '🟠', color: 0xc06a9a, speed: 0.72, size: 0.26 },
  { id: 'golden',   name: '황금 정령',     ico: '🌟', color: 0xe0b34a, speed: 0.62, size: 0.32, fog: true },
];
// 둘레 등불 6개(숲 로컬 좌표) — 수호목(중앙)으로 오는 길목마다 하나씩
const MIST_LANTERN_POS = [[-7, -7], [7, -7], [-9.5, 1], [9.5, 1], [-5.5, 8], [5.5, 8]];
const LANTERN_CALM_R = 4.5;                         // 켜진 등불 주변: 정령 감속 반경
let mistGroup = null, atMist = false;
let mistTree = null;                                 // 수호목 { group, foliage[], light }
const mistLanterns = [];                             // { group, headMat, light, lit }
// 진행 중인 정화 상태 — active=false 면 웨이브 전(수호목에서 시작)
const mist = { active: false, wave: 0, spirits: [], treeLight: TREE_LIGHT_MAX, soothe: null, t: 0, warned: false };

// 현재 있는 공간만 보이게 — 다른 인스턴스 공간은 숨김
function setSpaceVisible() {
  if (interiorGroup) interiorGroup.visible = indoor;
  if (farmGroup) farmGroup.visible = atFarm;
  if (mineGroup) mineGroup.visible = atMine;
  if (cafeInGroup) cafeInGroup.visible = atCafe;
  if (riverGroup) riverGroup.visible = atRiver;
  if (mistGroup) mistGroup.visible = atMist;
  // 🌧️ 빗소리: 비 오는 날 야외(마을·텃밭·강)에서만 — 실내·동굴·카페에선 정지
  if (RAIN_DAY && mode === 'play' && !indoor && !atMine && !atCafe) startRainSound();
  else stopRainSound();
}
const SELL_PRICE = { crop: 5, fish: 8, wood: 2, stone: 3, coal: 6, gem: 40, egg: 6, bug: 14, forage: 7 };   // 기본 판매 단가(코인)
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
  { id: 'net',   name: '촘촘한 포충망', ico: '🦋', cost: { wood: 12, bug: 2 }, desc: '반딧불이 포획 성공률↑' },   // 🌟 밤 콘텐츠 강화
];

// ── 야외 장식(작업대) — 마당에 설치, 재료 소비 ──
const OUTDOOR = [
  { id: 'fence',     name: '울타리',  ico: '🪵', cost: { wood: 3 }, desc: '마당 울타리 · 밭 근처 4개면 밤손님 방어' },
  { id: 'scarecrow', name: '허수아비', ico: '🎃', cost: { wood: 5 }, desc: '밭 근처에 세우면 밤손님을 쫓아요' },
  { id: 'path',      name: '디딤돌',  ico: '🪨', cost: { wood: 1 }, desc: '돌 디딤돌' },
  { id: 'flowerbed', name: '꽃밭',    ico: '🌷', cost: { crop: 2 }, desc: '알록달록 꽃밭' },
  { id: 'postlamp',  name: '정원등',  ico: '🏮', cost: { wood: 4 }, desc: '밤에 빛나는 등' },
  { id: 'stonewall', name: '돌담',    ico: '🧱', cost: { stone: 3 }, desc: '튼튼한 돌담(채굴)' },
  { id: 'brazier',   name: '화로',    ico: '🔥', cost: { stone: 2, coal: 2 }, desc: '밤에 빛나는 화로(채굴)' },
  { id: 'spiritlamp', name: '정령 등불', ico: '✨', cost: { glow: 8, coins: 60 }, desc: '정령빛이 깃든 등불 — 밤에 청록빛(안개 숲)' },
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
    // 상점 동쪽 트인 벌판 — 작업대(4,-5)·자유주방(7.4,-6.4)·상점(9,0) 동선을 막지 않게(배회 반경 1.6 감안)
    id: 'merchant', name: '방랑 상인', emoji: '🧙', color: 0xc9a8ff, hat: 0x8a5cd0, pos: [13.5, 0, -1.5],
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
      { type: 'cook',         target: 2, title: '오늘의 요리', desc: '요리 2번 하기',  reward: { coins: 12 },           line: '자유주방에서 요리 두 번! 타이밍을 잘 맞추면 버프도 오래가.' },
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
  { type: 'catch',   target: 3, title: '밤의 산책',    desc: '🌟 반딧불이 3마리 잡기(밤)' },
  { type: 'serve',   target: 2, title: '오늘의 접객',  desc: '☕ 카페 손님 2명 서빙하기' },
  { type: 'forage',  target: 5, title: '숲의 아침',    desc: '🍄 채집물 5개 줍기' },
];

// 매일 접속 시 호출 — 날짜가 바뀌면 의뢰 리셋 + 날짜 시드로 오늘의 의뢰 3개 생성
function refreshDailyQuests() {
  const def = NPCS.find(n => n.daily); if (!def) return;
  const st = npcState(def.id);
  const today = todayStr();
  if (st.date !== today) {   // 새 날 → 진행 상태 리셋(어제 의뢰는 소멸)
    st.date = today; st.idx = 0; st.progress = 0; st.given = false; st.allDone = false; st.acceptedAt = null;
  }
  def.doneLine = `오늘 의뢰는 전부 끝! ${forecastLine()}${forecastDexNudge()} 내일 새 의뢰 들고 올게요 🦉`; // 예보로 재방문 유도(+날씨 도감 훅)
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
  inventory: { wood: 0, seed: 8, crop: 0, fish: 0, coins: 0, coal: 0, stone: 0, gem: 0, egg: 0, bug: 0, forage: 0, star: 0, glow: 0 }, // + 석탄/돌/보석(채굴) + 달걀(닭장) + 반딧불이(밤) + 채집물(숲) + ⭐별조각(강) + ✨정령빛(안개 숲, 장식 교환 화폐)
  playerPos: { x: 0, z: 0 },
  houseStage: 0,                            // 0=없음 1=기초 2=벽 3=완성
  plots: [],                                // [{x,z,state,growth}] 저장용 스냅샷
  npcs: {},                                 // id별 {idx,progress,given,allDone}
  tutorialSeen: false,                      // 신규 유저 튜토리얼 표시 여부
  house: { decor: [] },                     // 실내 배치 가구 [{id,x,z}]
  upgrades: { axe: false, water: false, rod: false, pot: false, net: false }, // 도구 업그레이드(영구) + 🍲 큰 냄비 + 🦋 촘촘한 포충망
  outdoor: [],                              // 야외 장식 [{id,x,z}]
  gifts: {},                                // 보유 선물 { id: count }
  affinity: {},                             // 주민 친밀도 { npcId: level }
  hintsSeen: {},                            // 첫 접근 안내 표시 여부 { key: true }
  character: null,                          // 선택한 동물 캐릭터 id
  houseStyle: { roof: 0, wall: 0, door: 0 }, // 집 외관 색(팔레트 인덱스)
  unlocked: { roof: [0], wall: [0], door: [0] }, // 획득한 외관 색(0=기본 항상 보유)
  daily: { lastDate: null, streak: 0 },     // 출석 보상 { 마지막 수령일(YYYY-MM-DD), 연속 일수 }
  dex: { fish: {}, crop: {}, ore: {}, cook: {}, npc: {}, weather: {}, bug: {}, forage: {}, track: {}, river: {}, spirit: {} }, // 📖 도감 — 카테고리별 { 종id: 첫발견시각(ms) }
  badges: {},                               // 🏅 업적 배지 { id: 획득시각(ms) }
  coop: { built: false, fed: null, collected: null }, // 🐔 닭장 { 건설 여부, 모이 준 날, 달걀 걷은 날(YYYY-MM-DD) }
  cafe: { date: null, done: [], bonus: false, served: 0 }, // ☕ 카페 { 주문 날짜, 완료 주문 index, 완주 보너스 수령, 누적 서빙 }
  night: { lastDate: null, traces: [] },    // 🦝 밤손님 { 마지막 판정일(YYYY-MM-DD), 조사 안 한 흔적 [{x,z,animal,loot}] }
  frost: { coveredFor: null, lastDate: null }, // 🌡️ 날씨 이벤트 { 덮개를 설치해 둔 대상 날짜, 마지막 정산일(YYYY-MM-DD) }
  boat: { date: null, count: 0, best: 0, clears: 0, up: { oar: 0, hull: 0, lamp: 0 } }, // 🛶 나룻배 { 오늘 날짜, 오늘 탄 횟수, 최고 점수, 완주 횟수, 배 업그레이드 }
  mist: { date: null, purified: false, soothedTotal: 0, purifyTotal: 0 }, // 🌫️ 안개 숲 { 정화 판정일(YYYY-MM-DD), 오늘 정화 여부, 누적 달래기, 누적 정화 }
  kitchen: { cooked: 0, best: {}, tiers: {} }, // 🍳 자유주방 { 누적 요리 수, 레시피별 최고 점수(0~100), 등급별 획득 수 }
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
    { id: 'mushroom_soup', name: '숲의 버섯 스프', ico: '🍄' },  // 🍄 채집 숲 재료
  ],
  npc: [
    { id: 'farmer',   name: '농부 삼촌',       ico: '🧑‍🌾' },
    { id: 'builder',  name: '목수 아저씨',     ico: '👷' },
    { id: 'merchant', name: '방랑 상인',       ico: '🧙' },
    { id: 'angler',   name: '낚시꾼 할아버지', ico: '🎣' },
    { id: 'courier',  name: '의뢰 올빼미',     ico: '🦉' },
    { id: 'chef',     name: '요리사 판다',     ico: '🐼' },
  ],
  // 🍄 채집물 — 남서쪽 채집 숲을 돌아다니며 주워야 채워짐
  forage: [
    { id: 'mushroom', name: '숲 버섯',  ico: '🍄' },   // 🌧️ 비 온 날 잘 나옴
    { id: 'berry',    name: '산딸기',   ico: '🫐' },
    { id: 'acorn',    name: '도토리',   ico: '🌰' },
    { id: 'herb',     name: '숲 약초',  ico: '🌿' },
  ],
  // 🌟 반딧불이 — 밤에 남쪽 계곡에서 🦋포충망으로 잡아야 채워짐(밤 재방문 훅)
  bug: [
    { id: 'yellow',  name: '노랑반디',   ico: '🟡' },
    { id: 'blue',    name: '푸른반디',   ico: '🔵' },
    { id: 'green',   name: '초록반디',   ico: '🟢' },   // 🌧️ 비 온 날 잘 나옴
    { id: 'rainbow', name: '무지개반디', ico: '🌈' },   // 🌫️ 안개 낀 날 잘 나옴
  ],
  // 🐾 밤손님 흔적 — 밤사이 다녀간 흔적을 조사해야 채워짐(다음날 재방문 훅)
  track: [
    { id: 'fur_tuft',   name: '털뭉치',     ico: '🧶' },   // 🦝 너구리가 흘리고 감
    { id: 'acorn_drop', name: '주운 도토리', ico: '🌰' },   // 🐗 멧돼지가 물고 가다 떨어뜨림
  ],
  // 🛶 강 — 나룻배를 타고 내려가며 주워야 채워짐(하루 3번 제한 → 여러 날에 걸쳐 완성)
  river: [
    { id: 'lotus',     name: '물 위 연꽃',    ico: '🪷' },
    { id: 'driftwood', name: '떠내려온 나무', ico: '🪵' },
    { id: 'shell',     name: '강 조개',       ico: '🐚' },
    { id: 'moon_fish', name: '달빛 물고기',   ico: '🌕' },   // 🌙 밤에 탄 날에만 나옴
  ],
  // 🌫️ 정령 — 안개 낀 숲에서 ♪로 달래야 채워짐. golden 은 🌫️안개 날에만(날씨 재방문 훅)
  spirit: [
    { id: 'shy',      name: '수줍은 정령',     ico: '🟣' },
    { id: 'sleepy',   name: '졸린 정령',       ico: '🔵' },
    { id: 'mischief', name: '장난꾸러기 정령', ico: '🟠' },
    { id: 'golden',   name: '황금 정령',       ico: '🌟' },
  ],
  // 🌦️ 날씨 — 그 날씨인 날 접속해야 채워짐(예보와 묶어 재방문 유도)
  weather: [
    { id: 'clear', name: '맑은 날',     ico: '☀️' },
    { id: 'rain',  name: '비 오는 날',  ico: '🌧️' },
    { id: 'snow',  name: '눈 오는 날',  ico: '❄️' },
    { id: 'fog',   name: '안개 낀 날',  ico: '🌫️' },
  ],
};
const DEX_TOTAL = Object.values(DEX).reduce((n, list) => n + list.length, 0);   // 전 카테고리 합(현재 33종)
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
  { id: 'night_owl',   name: '밤의 수집가',    ico: '🌟', desc: '반딧불이 4종 모두 잡기',   reward: { coins: 40 } },
  { id: 'barista',     name: '마을 바리스타',  ico: '☕', desc: '카페에서 15잔 서빙',       reward: { coins: 60 } },
  { id: 'forager',     name: '숲의 안내인',    ico: '🍄', desc: '채집물 4종 모두 줍기',     reward: { coins: 40 } },
  { id: 'ferryman',    name: '첫 뱃길',        ico: '🛶', desc: '강을 끝까지 내려가기',     reward: { coins: 30 } },
  { id: 'river_master', name: '잔잔한 물살',   ico: '🌊', desc: '한 번도 부딪히지 않고 완주', reward: { coins: 80 } },
  { id: 'purifier',    name: '숲의 정화자',    ico: '🌫️', desc: '안개 낀 숲을 정화하기',      reward: { coins: 30 } },
  { id: 'spirit_friend', name: '정령의 친구',  ico: '✨', desc: '정령 20마리 달래기',         reward: { coins: 60 } },
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
  if (DEX.bug.every(b => gameState.dex.bug?.[b.id])) awardBadge('night_owl');   // 🌟 반딧불이 4종
  if ((gameState.cafe.served || 0) >= 15) awardBadge('barista');                // ☕ 누적 15잔 서빙
  if (DEX.forage.every(f => gameState.dex.forage?.[f.id])) awardBadge('forager'); // 🍄 채집 4종
  if ((gameState.boat?.clears || 0) >= 1) awardBadge('ferryman');                 // 🛶 강 완주
  if ((gameState.boat?.perfect || 0) >= 1) awardBadge('river_master');            // 🌊 무피해 완주
  if ((gameState.mist?.purifyTotal || 0) >= 1) awardBadge('purifier');             // 🌫️ 첫 정화
  if ((gameState.mist?.soothedTotal || 0) >= 20) awardBadge('spirit_friend');      // ✨ 정령 20마리
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
  body += ' 🔮 ' + forecastLine() + forecastDexNudge(); // 내일 예보 — 재방문 유도(+날씨 도감 훅)
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
let playerArm = null;                                    // (미사용 — 팔 막대 없이 도구만 표시)
let charGroup = null, tailPivot = null, tailPhase = 0;   // 캐릭터 메시 그룹 / 꼬리 피벗(흔들기)
// ── 선택 가능한 동물 캐릭터 7종 ────────────────────────────────
//   ⚠️ "색만 다르고 다 똑같이 생겼다"는 피드백 반영 —
//   색뿐 아니라 체형(몸/머리 크기·비율)·귀·꼬리·얼굴까지 동물마다 다르게 정의합니다.
//
//   bodyR/bodyScale/headR/headY : 실루엣의 8할. 곰·판다는 크고 육중, 토끼·병아리는
//        작고 동글, 여우·고양이는 날씬 — 멀리서 봐도 구분되도록 비율을 벌림.
//   snout  : 주둥이(길이·굵기·색·코). 여우는 뾰족·길게, 곰은 뭉툭·크게.
//   tail   : 종류별 실루엣 + 흔들기 속도/진폭(강아지는 신나게, 고양이는 느긋하게).
//   extras : 그 동물에서만 보이는 포인트(판다 눈패치, 고양이 수염, 병아리 볏·날개…).
//   armX   : 도구 든 손의 좌우 위치 — 몸집에 맞춰야 도구가 붕 뜨지 않음.
const ANIMALS = [
  { id: 'fox', name: '여우', emoji: '🦊', body: 0xe07b3c, belly: 0xf5e9d8, ear: 0x8a4a24,
    bodyR: 0.52, bodyScale: [0.90, 1.08, 0.90], headR: 0.37, headY: 1.26, armX: 0.74,
    ears: 'pointy', earScale: 1.15,
    snout: { len: 0.34, r: 0.13, color: 0xf7efe2, nose: 0x2a2320 },
    tail: { type: 'bushy', color: 0xe07b3c, tip: 0xf7efe2, wagSpeed: 2.2, wagAmp: 0.16 } },

  { id: 'dog', name: '강아지', emoji: '🐶', body: 0xc9945a, belly: 0xf0e2cc, ear: 0x8a6038,
    bodyR: 0.56, bodyScale: [1.03, 0.99, 1.00], headR: 0.40, headY: 1.24, armX: 0.80,
    ears: 'floppy',
    snout: { len: 0.24, r: 0.17, color: 0xf0e2cc, nose: 0x2a2320 },
    tail: { type: 'curl', color: 0xc9945a, wagSpeed: 6.5, wagAmp: 0.55 },   // 신나게 살랑살랑
    extras: ['collar'] },

  { id: 'rabbit', name: '토끼', emoji: '🐰', body: 0xe6e0dc, belly: 0xffffff, ear: 0xf0c0c8,
    bodyR: 0.46, bodyScale: [1.00, 0.96, 1.00], headR: 0.39, headY: 1.12, armX: 0.66,
    ears: 'long',
    snout: { len: 0.16, r: 0.14, color: 0xffffff, nose: 0xe89aa8 },
    tail: { type: 'puff', color: 0xffffff, wagSpeed: 1.6, wagAmp: 0.10 },
    extras: ['teeth'] },

  { id: 'cat', name: '고양이', emoji: '🐱', body: 0x9aa0a8, belly: 0xf0f0f0, ear: 0xf0b0b8,
    bodyR: 0.50, bodyScale: [0.88, 1.10, 0.88], headR: 0.36, headY: 1.25, armX: 0.72,
    ears: 'pointy', earScale: 0.85,
    snout: { len: 0.14, r: 0.13, color: 0xf0f0f0, nose: 0xf08a9a },
    tail: { type: 'long', color: 0x9aa0a8, wagSpeed: 1.5, wagAmp: 0.30 },   // 느긋하게 살랑
    extras: ['whiskers'] },

  { id: 'bear', name: '곰', emoji: '🐻', body: 0x8a6038, belly: 0xc9a878, ear: 0x6a4828,
    bodyR: 0.63, bodyScale: [1.08, 1.00, 1.06], headR: 0.44, headY: 1.34, armX: 0.88,
    ears: 'round', earScale: 1.1,
    snout: { len: 0.22, r: 0.20, color: 0xc9a878, nose: 0x2a2320, noseR: 0.075 },
    tail: { type: 'stub', color: 0x8a6038, wagSpeed: 1.2, wagAmp: 0.08 } },

  { id: 'panda', name: '판다', emoji: '🐼', body: 0xf2f2f2, belly: 0xffffff, ear: 0x2a2a2a,
    bodyR: 0.63, bodyScale: [1.08, 1.00, 1.06], headR: 0.45, headY: 1.34, armX: 0.88,
    ears: 'round', earScale: 1.15,
    snout: { len: 0.18, r: 0.19, color: 0xffffff, nose: 0x2a2a2a, noseR: 0.07 },
    tail: { type: 'stub', color: 0xffffff, wagSpeed: 1.2, wagAmp: 0.08 },
    extras: ['patches', 'band'] },   // 검은 눈 패치 + 어깨 띠 = 판다의 정체성

  { id: 'chick', name: '병아리', emoji: '🐤', body: 0xffe05a, belly: 0xfff0a0, ear: 0xffb020,
    bodyR: 0.50, bodyScale: [1.02, 0.94, 1.02], headR: 0.35, headY: 1.06, armX: 0.62,
    ears: 'none',
    tail: { type: 'feather', color: 0xffd23a, wagSpeed: 2.6, wagAmp: 0.14 },
    extras: ['beak', 'comb', 'wings'] },
];
let heldGroup, handAnchor, heldToolMesh; // 팔(어깨 피벗) / 손 / 든 도구
let sunLight, hemiLight, ambient;
let fireflies, stars;
const trees = [];
const swayables = [];
const particles = [];
const plots = [];                 // 밭 목록 (런타임 객체)
const obstacles = [];             // 밭 만들기 금지 구역 {x,z,r} (나무·호수·벤치·가로등·집)
// ── 🚧 플레이어가 통과할 수 없는 것들 ──────────────────────────
//   obstacles 와 분리한 이유: obstacles 엔 "밭만 금지"인 넓은 구역(반딧불이 계곡 r7,
//   채집 숲 r9)이 들어 있어서, 그대로 막으면 그 구역에 들어갈 수가 없다.
//   형태 두 가지 — 원기둥 {x,z,r} / 축정렬 사각 {x1,z1,x2,z2}(월드 XZ).
//   문이 있는 건물은 원으로 막으면 문 앞에 설 수 없어 사각을 쓴다.
const colliders = [];
const PLAYER_R = 0.42;            // 캐릭터 몸통 반경(대략)
//   off=true 면 잠시 통과 가능(베어진 나무·캔 광맥처럼 안 보이는 동안)
function solidCircle(x, z, r) { const c = { x, z, r, off: false }; colliders.push(c); return c; }
function solidBox(x1, z1, x2, z2) { const c = { x1, z1, x2, z2, off: false }; colliders.push(c); return c; }
//   손님처럼 사라지는 대상은 콜라이더도 같이 치운다(안 그러면 안 보이는 벽이 남음)
function removeSolid(c) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
const NPC_R = 0.45;               // 주민·손님 몸통 반경(대화 2.6 / 서빙 2.4 사거리엔 영향 없음)

// 이동 후 밀어내기 — "가장 얕게 빠져나가는 방향"으로만 밀어 벽을 따라 미끄러지게 한다
function resolveColliders(p) {
  for (const c of colliders) {
    if (c.off) continue;
    if (c.r !== undefined) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const min = c.r + PLAYER_R;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      if (d < 1e-4) { p.x = c.x + min; continue; }   // 정중앙에 겹치면 임의 방향으로 탈출
      const k = min / d;
      p.x = c.x + dx * k; p.z = c.z + dz * k;
    } else {
      const x1 = c.x1 - PLAYER_R, x2 = c.x2 + PLAYER_R;
      const z1 = c.z1 - PLAYER_R, z2 = c.z2 + PLAYER_R;
      if (p.x <= x1 || p.x >= x2 || p.z <= z1 || p.z >= z2) continue;
      const dl = p.x - x1, dr = x2 - p.x, dn = p.z - z1, df = z2 - p.z;
      const m = Math.min(dl, dr, dn, df);
      if (m === dl) p.x = x1; else if (m === dr) p.x = x2;
      else if (m === dn) p.z = z1; else p.z = z2;
    }
  }
}
const houseWindows = [];          // 밤에 빛나는 창문 머티리얼
let houseGroup, houseGhost;       // 집 그룹 / 미완성 터 표시
let houseCollider = null;         // 🚧 집 충돌(짓는 동안 off, 완성되면 단계별 크기로 on)
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
  getKitchen() { return kitchenView(); },               // 🍳 자유주방 메뉴판(레시피+최고점수)
  kitchenStart(id) { return kitchenStart(id); },        // 🍳 요리 시작(재료 소비, 미니게임 개시)
  kitchenFinish(id, res) { return kitchenFinish(id, res); }, // 🍳 미니게임 결과 → 등급·버프·트래킹
  mgSceneStart(type, icos, n) { mgSceneStart(type, icos, n); }, // 🍳 클로즈업 조리 무대 입장(카메라 전환)
  mgSceneEnd() { mgSceneEnd(); },                       // 🍳 무대 종료(마을 카메라 복귀)
  mgChopFrame(ps) { mgChopFrame(ps); },                 // 🔪 리듬 노트 위치 동기화(매 프레임)
  mgChopHit(i, judge) { mgChopHit(i, judge); },         // 🔪 칼질 명중 연출
  mgPotHit(step, judge, ico) { mgPotHit(step, judge, ico); }, // 🍲 끓이기 탭 연출
  getUpgrades() { return UPGRADES; },                   // 도구 업그레이드 목록
  ownedUpgrades() { return { ...gameState.upgrades }; }, // 보유 업그레이드
  craftUpgrade(id) { return craftUpgrade(id); },        // 업그레이드 제작
  getOutdoor() { return OUTDOOR; },                     // 야외 장식 목록
  selectOutdoor(id) { placingOutdoor = id; },           // 야외 장식 선택(설치 대기)
  getWeatherPrep() { return weatherPrepView(); },       // 🌡️ 내일 궂은 날씨·덮개 상태
  craftCover() { return craftCover(); },                // 🛡️ 덮개 설치(예고일 한정)
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
  getCafe() { return cafeView(); },                     // ☕ 주문판(현황 확인용 — 서빙은 손님에게 직접)
  // 🛶 나룻배 — 창고(업그레이드) / 다시 타기 / 중도 포기 / 시점 토글
  getBoatShop() { return boatShopView(); },
  buyBoatUpgrade(id) { return buyBoatUpgrade(id); },
  boatRunsLeft() { return boatRunsLeft(); },
  startBoatRun() { startBoatRun(); },
  quitBoatRun() { if (boat.active) endBoatRun('quit'); },
  toggleBoatView() { boatView = boatView === 'first' ? 'third' : 'first'; if (boat.active) playerAnchor.visible = (boatView === 'third'); return boatView; },
  boatViewMode() { return boatView; },
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
  getCharacter() { return gameState.character; },        // 🐾 바꾸기 모달에서 현재 캐릭터 미리 선택용
  // change=true 면 플레이 도중 교체(진행 상황은 그대로) — 첫 선택과 이벤트를 구분해 기록
  setCharacter(id, change = false) {
    const prev = gameState.character;
    if (change && prev === id) return;                   // 같은 동물이면 아무것도 하지 않음
    gameState.character = id; applyCharacter(id); Sound.blip();
    if (change) {
      spawnSparkle(player.position.x, 1.4, player.position.z, 20);
      trackEvent('character_change', { animal: id, from: prev || 'none' });   // [GA4] 교체 빈도·선호 동물
    } else {
      trackEvent('character_select', { animal: id });     // [GA4] 최초 선택
    }
  },
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
  // 테스트: ?time=0~1 — 시간대 고정(0.75≈한밤). 🌟 반딧불이 등 밤 콘텐츠 확인용
  const _tq = parseFloat(_wq.get('time') || '');
  if (Number.isFinite(_tq)) { timeOfDay = ((_tq % 1) + 1) % 1; dayPaused = true; }
  // 테스트: ?give=crop:5,fish:2 — 재료 지급. 로컬 개발 서버에서만 동작(실서비스 경제·지표 오염 방지)
  if (_wq.has('give') && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    for (const pair of _wq.get('give').split(',')) {
      const [k, v] = pair.split(':');
      if (k in gameState.inventory) gameState.inventory[k] += parseInt(v, 10) || 0;
    }
  }
  // 테스트: 콘솔에서 __nightTest() — 어젯밤이 지난 셈 치고 밤손님 판정을 다시 받는다.
  // ?give 와 같은 로컬 전용(실서비스에서 임의 습격 유발·경제 오염 방지)
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    window.__nightTest = () => { gameState.night.lastDate = todayStr(-1); return resolveNightVisit(); };
    // ?severe=frost 와 조합: 어제 정산한 셈 치고 오늘의 궂은 날씨를 다시 정산
    window.__frostTest = () => { gameState.frost.lastDate = todayStr(-1); return resolveWeatherEvent(); };
    // 🛶 __boatTest() — 오늘 탄 횟수를 초기화(코스 반복 테스트용). 코스 시드는 그대로라 같은 물길이 나온다
    window.__boatTest = () => { gameState.boat.date = null; return boatRunsLeft(); };
    // 🌫️ __mistTest() — 오늘 정화를 무른 셈 치고 다시(코스 아님이라 리롤 유인 없음)
    window.__mistTest = () => { gameState.mist.date = null; gameState.mist.purified = false; return mistDaily(); };
  }
  // 테스트: ?river=1 — 나루터(강 공간)에서 시작. ?time=0.8 과 조합하면 밤 물길 확인
  if (_wq.get('river') === '1') setTimeout(() => enterRiver(), 60);
  // 테스트: ?mist=1 — 안개 낀 숲에서 시작. ?weather=fog 와 조합하면 🌟황금 정령 확인
  if (_wq.get('mist') === '1') setTimeout(() => enterMist(), 60);
  mode = 'play';
  movedOnce = false;
  startLogging();                      // [센서] 배치 전송 시작
  startMetrics(() => ({                // [계측] 세션 요약(60초/이탈 시 upsert)용 스냅샷
    coins: gameState.inventory.coins || 0,
    place: indoor ? 'house' : atFarm ? 'farm' : atMine ? 'mine' : atCafe ? 'cafe' : atRiver ? 'river' : atMist ? 'mist' : 'village',
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
  resolveWeatherEvent();                // 🌡️ 날씨 이벤트 정산(동기) — 시든 작물은 밤손님 후보에서 빠짐
  resolveNightVisit();                  // 🦝 밤손님 — 밤이 지났으면 서버 판정(await 안 함, 실패해도 입장 안 막음)
  if (SEVERE_TOMORROW) {                // 🔮 내일 궂은 날씨 예고 — 다른 안내와 안 겹치게 늦게
    const s = SEVERE_INFO[SEVERE_TOMORROW];
    setTimeout(() => ui.toast?.(`${s.ico} 내일 ${s.name} 예보! 오늘 수확하거나 작업대에서 🛡️ 덮개를 준비하세요`, 3600), 3000);
  }

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
  if (saved.dex) gameState.dex = { fish: {}, crop: {}, ore: {}, cook: {}, npc: {}, weather: {}, bug: {}, forage: {}, track: {}, river: {}, spirit: {}, ...saved.dex }; // 📖 도감 복원
  if (saved.night) gameState.night = { lastDate: null, traces: [], ...saved.night }; // 🦝 밤손님 판정일·미조사 흔적 복원
  if (saved.frost) gameState.frost = { coveredFor: null, lastDate: null, ...saved.frost }; // 🌡️ 날씨 이벤트 상태 복원
  if (saved.boat) gameState.boat = { ...gameState.boat, ...saved.boat, up: { oar: 0, hull: 0, lamp: 0, ...(saved.boat.up || {}) } }; // 🛶 나룻배 횟수·기록·업그레이드 복원
  if (saved.mist) gameState.mist = { ...gameState.mist, ...saved.mist };  // 🌫️ 안개 숲 정화 상태 복원
  if (saved.kitchen) gameState.kitchen = { cooked: saved.kitchen.cooked || 0, best: { ...(saved.kitchen.best || {}) }, tiers: { ...(saved.kitchen.tiers || {}) } }; // 🍳 자유주방 기록 복원
  if (saved.badges) gameState.badges = { ...saved.badges };              // 🏅 배지 복원
  if (saved.coop) { gameState.coop = { ...gameState.coop, ...saved.coop }; if (gameState.coop.built) buildCoop(true); } // 🐔 닭장 복원
  if (saved.cafe) { gameState.cafe = { ...gameState.cafe, ...saved.cafe }; refreshCafeGuests(); } // ☕ 카페 진행(오늘 서빙한 손님) 복원
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
        // 저장된 작물 종류 복원 — 없으면(옛 세이브) 랜덤. 밤손님이 "뭘 훔쳐갔는지" 말하려면 종류가 보존돼야 한다
        plot.cropType = CROP_TYPES.find(c => c.id === p.crop) || CROP_TYPES[Math.floor(Math.random() * CROP_TYPES.length)];
        refreshCropStage(plot);   // growth에 맞는 단계 메시 복원
      }
      updatePlotVisual(plot);
    });
  }
}

export function getGameState() {
  gameState.playerPos = { x: player.position.x, z: player.position.z };
  gameState.plots = plots.map(p => ({ x: p.x, z: p.z, state: p.state, growth: p.growth, crop: p.cropType?.id })); // crop: 밤손님 판정·복원용 작물 종류
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
    let x, z, ok = false;
    for (let tries = 0; tries < 60 && !ok; tries++) { // 호수·집터·시설 위에 안 생기게 재시도
      const r = 8 + Math.random() * 22, a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      ok = !(dist2D({ x, z }, LAKE) < LAKE_R + 2.5 || dist2D({ x, z }, HOUSE_POS) < 3.5 || dist2D({ x, z }, BENCH) < 2.5 || dist2D({ x, z }, KITCHEN) < 3 || dist2D({ x, z }, SHOP) < 2.5 || dist2D({ x, z }, FARM_GATE) < 2.5 || dist2D({ x, z }, MINE_GATE) < 2.5 || dist2D({ x, z }, COOP) < 6 || dist2D({ x, z }, GLADE) < GLADE_R + 1 || dist2D({ x, z }, CAFE_GATE) < 5.5 || dist2D({ x, z }, FOREST) < FOREST_R + 1
      || dist2D({ x, z }, DOCK_POND) < DOCK_POND_R + 2 || dist2D({ x, z }, DOCK_GATE) < 4   // 🛶 나루터 연못·데크 위엔 나무 금지
      || dist2D({ x, z }, MIST_GATE) < 5   // 🌫️ 안개 숲 입구 앞은 비워둠(자체 고목 연출이 있음)
      || PARK_BENCHES.some(([bx, bz]) => dist2D({ x, z }, { x: bx, z: bz }) < 3)   // 공원 벤치가 나무에 가리지 않게
      || NPCS.some(n => dist2D({ x, z }, { x: n.pos[0], z: n.pos[2] }) < 2.6));    // 주민 자리에 나무가 박혀 갇히지 않게
    }
    if (ok) spawnTree(x, z);   // 빈 자리를 못 찾으면 그 나무는 생략 — 시설을 가리며 억지로 심지 않는다
  }

  spawnWorkbench();   // 작업대(도구·장식·선물)
  spawnKitchen();     // 🍳 자유주방(요리 미니게임)
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

  // 🚧 줄기는 통과 못 함(벌목 사거리 2.6 은 그대로 확보). 베어져 사라진 동안엔 꺼둔다.
  tree.userData = { hp: 3, canopy, trunk, squash: 0, fallen: false, respawnAt: 0, leafColor, collider: solidCircle(x, z, 0.8) };
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

  // 캐릭터 몸체는 applyCharacter() 가 buildAnimalMesh() 로 통째로 만들어 붙입니다
  // (동물마다 체형·꼬리·얼굴이 달라 색만 갈아끼우는 방식으론 표현이 안 됨)

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

// ── 동물 파츠 조립기 ────────────────────────────────────────────
//   플레이어와 선택화면 프리뷰가 이 함수 하나를 공유합니다.
//   (예전엔 buildPlayer/buildEars 와 buildCharacterMesh 에 같은 코드가 중복돼 있어
//    한쪽만 고치면 인게임과 프리뷰 생김새가 어긋날 위험이 있었음 → 단일 소스로 통합)
//   모든 좌표는 머리 크기(HR)·몸 반지름(R) 기준 상대값 — 체형을 바꿔도 비율이 유지됨.
//   반환: { group, tail } · tail 은 흔들 피벗(꼬리 없으면 null)
function buildAnimalMesh(id) {
  const a = ANIMALS.find(x => x.id === id) || ANIMALS[0];
  const g = new THREE.Group();
  const R = a.bodyR ?? 0.55, HR = a.headR ?? 0.40, HY = a.headY ?? 1.25;
  const bs = a.bodyScale || [1, 1.05, 1];
  const ex = a.extras || [];
  const skin = () => clayMat(a.body, false);

  // ── 몸통 — 바닥에 딱 닿게 배치(동물마다 키가 달라짐) ──
  const bodyY = R * bs[1] + 0.02;
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1), skin());
  body.position.y = bodyY; body.scale.set(bs[0], bs[1], bs[2]); body.castShadow = true; g.add(body);

  // 배(밝은 색)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 16, 12), clayMat(a.belly, false));
  belly.position.set(0, bodyY - R * 0.16, R * 0.55); belly.scale.set(1, 1.1, 0.6); g.add(belly);

  // ── 머리 ──
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(HR, 1), skin());
  head.position.y = HY; head.castShadow = true; g.add(head);

  // 눈 — 머리 크기에 맞춰 자동 배치
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
  const eyeX = HR * 0.36, eyeY = HY + HR * 0.10, eyeZ = HR * 0.86;
  if (ex.includes('patches')) {   // 🐼 검은 눈 패치 — 눈보다 먼저(뒤에) 깔기
    [-1, 1].forEach(s => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.30, 12, 10), clayMat(0x2a2a2a, false));
      p.position.set(s * eyeX * 1.05, eyeY - HR * 0.02, eyeZ * 0.86);
      p.scale.set(1, 1.25, 0.45); p.rotation.z = s * 0.35; g.add(p);
    });
  }
  [-1, 1].forEach(s => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.145, 8, 8), eyeMat);
    e.position.set(s * eyeX, eyeY, eyeZ); g.add(e);
  });

  // ── 주둥이 + 코 ──
  if (a.snout) {
    const sn = a.snout;
    const m = new THREE.Mesh(new THREE.SphereGeometry(sn.r, 12, 10), clayMat(sn.color, false));
    m.position.set(0, HY - HR * 0.16, HR * 0.60 + sn.len * 0.35);
    m.scale.set(1, 0.82, sn.len / sn.r); g.add(m);
    const nr = sn.noseR ?? sn.r * 0.44;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(nr, 10, 8), clayMat(sn.nose, false));
    nose.position.set(0, HY - HR * 0.13, HR * 0.60 + sn.len * 0.92);
    nose.scale.set(1.25, 0.85, 0.9); g.add(nose);

    if (ex.includes('whiskers')) {   // 🐱 수염 — 코 옆에서 좌우로
      const wm = new THREE.MeshStandardMaterial({ color: 0xf2ece4, roughness: 0.8 });
      [-1, 1].forEach(s => [0.06, 0, -0.06].forEach((dy, i) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, HR * 0.95, 4), wm);
        w.position.set(s * (HR * 0.30), HY - HR * 0.10 + dy, HR * 0.62 + a.snout.len * 0.6);
        w.rotation.z = s * (Math.PI / 2 - 0.25 + i * 0.16); g.add(w);
      }));
    }
    if (ex.includes('teeth')) {      // 🐰 앞니
      const t = new THREE.Mesh(new THREE.BoxGeometry(HR * 0.17, HR * 0.20, 0.03), clayMat(0xffffff, false));
      t.position.set(0, HY - HR * 0.36, HR * 0.60 + sn.len * 0.85); g.add(t);
    }
  }

  // ── 귀 ──
  const earMat = clayMat(a.ear, false);
  const es = a.earScale ?? 1;
  if (a.ears === 'pointy') {                     // 🦊🐱 쫑긋
    [-1, 1].forEach(s => {
      const e = new THREE.Mesh(new THREE.ConeGeometry(HR * 0.33 * es, HR * 0.78 * es, 5), earMat);
      e.position.set(s * HR * 0.55, HY + HR * 0.85 * es, -HR * 0.05);
      e.rotation.z = -s * 0.25; e.castShadow = true; g.add(e);
    });
  } else if (a.ears === 'long') {                // 🐰 길쭉
    [-1, 1].forEach(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.26, 8, 8), earMat);
      e.scale.set(0.7, 2.6, 0.55);
      e.position.set(s * HR * 0.42, HY + HR * 1.40, 0);
      e.rotation.z = -s * 0.12; e.castShadow = true; g.add(e);
    });
  } else if (a.ears === 'floppy') {              // 🐶 축 늘어진
    [-1, 1].forEach(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.30, 8, 8), earMat);
      e.scale.set(0.6, 1.5, 0.4);
      e.position.set(s * HR * 0.78, HY + HR * 0.28, 0);
      e.rotation.z = -s * 0.5; e.castShadow = true; g.add(e);
    });
  } else if (a.ears === 'round') {               // 🐻🐼 동그란
    [-1, 1].forEach(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.36 * es, 10, 8), earMat);
      e.position.set(s * HR * 0.66, HY + HR * 0.70, -HR * 0.05);
      e.castShadow = true; g.add(e);
    });
  }

  // ── 동물별 포인트 ──
  if (ex.includes('beak')) {        // 🐤 부리
    const b = new THREE.Mesh(new THREE.ConeGeometry(HR * 0.26, HR * 0.50, 4), clayMat(0xff9a3a, false));
    b.position.set(0, HY - HR * 0.12, HR * 0.92); b.rotation.x = Math.PI / 2; g.add(b);
  }
  if (ex.includes('comb')) {        // 🐤 머리 위 볏
    [0, 1, 2].forEach(i => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(HR * (0.16 - i * 0.03), 8, 6), clayMat(0xf2564a, false));
      c.position.set(0, HY + HR * (0.92 - i * 0.10), -HR * (0.02 + i * 0.22)); g.add(c);
    });
  }
  if (ex.includes('wings')) {       // 🐤 양옆 짧은 날개
    [-1, 1].forEach(s => {
      const w = new THREE.Mesh(new THREE.SphereGeometry(R * 0.34, 10, 8), clayMat(0xffd23a, false));
      w.scale.set(0.30, 0.85, 0.75);
      w.position.set(s * R * 0.92, bodyY + R * 0.02, R * 0.05);
      w.rotation.z = -s * 0.20; w.castShadow = true; g.add(w);
    });
  }
  if (ex.includes('band')) {        // 🐼 검은 어깨(팔) 블록
    [-1, 1].forEach(s => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(R * 0.40, 10, 8), clayMat(0x2a2a2a, false));
      b.scale.set(0.52, 0.95, 0.86);
      b.position.set(s * R * 0.88, bodyY + R * 0.10, 0);
      b.castShadow = true; g.add(b);
    });
  }
  if (ex.includes('collar')) {      // 🐶 빨간 목줄
    // ※ 머리가 몸통에 깊이 박히는 체형이라 목 위치를 낮게 잡으면 몸 안에 파묻힘.
    //   머리·몸통 실루엣이 만나는 지점(HY - HR*0.55)에 걸치고, 반지름을 그 단면보다
    //   살짝 크게(HR*0.92) 잡아야 밖으로 드러납니다.
    const c = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.92, HR * 0.11, 6, 18), clayMat(0xd9534f, false));
    c.position.set(0, HY - HR * 0.55, 0); c.rotation.x = Math.PI / 2; c.castShadow = true; g.add(c);
    const tag = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.13, 8, 8), clayMat(0xf0c040, false));
    tag.position.set(0, HY - HR * 0.72, HR * 0.86); tag.scale.set(1, 1, 0.55); g.add(tag);
  }

  // ── 꼬리 ── (피벗을 반환해 애니메이션에서 흔듦)
  let tail = null;
  if (a.tail) {
    const t = a.tail;
    tail = new THREE.Group();
    tail.position.set(0, bodyY + R * 0.10, -R * bs[2] * 0.86);
    const tm = clayMat(t.color, false);
    const put = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; tail.add(mesh); };

    if (t.type === 'bushy') {            // 🦊 크고 풍성 + 흰 꼬리끝
      const seg = [[0, 0.02, -0.10, 0.26], [0, 0.14, -0.26, 0.29], [0, 0.30, -0.40, 0.27], [0, 0.48, -0.48, 0.22]];
      seg.forEach(([x, y, z, r]) => put(new THREE.Mesh(new THREE.SphereGeometry(R * r, 10, 8), tm), R * x, R * y, R * z));
      put(new THREE.Mesh(new THREE.SphereGeometry(R * 0.19, 10, 8), clayMat(t.tip, false)), 0, R * 0.64, -R * 0.50);
    } else if (t.type === 'curl') {      // 🐶 짧고 위로 말린
      const seg = [[0.02, -0.08, 0.16], [0.20, -0.16, 0.14], [0.36, -0.10, 0.12], [0.46, 0.02, 0.10]];
      seg.forEach(([y, z, r]) => put(new THREE.Mesh(new THREE.SphereGeometry(R * r, 10, 8), tm), 0, R * y, R * z));
    } else if (t.type === 'puff') {      // 🐰 동그란 솜뭉치
      put(new THREE.Mesh(new THREE.SphereGeometry(R * 0.30, 12, 10), tm), 0, R * 0.04, -R * 0.06);
    } else if (t.type === 'long') {      // 🐱 길고 가늘게 S자
      const seg = [[0.00, -0.10, 0.12], [0.16, -0.22, 0.11], [0.34, -0.26, 0.10], [0.52, -0.20, 0.09], [0.66, -0.06, 0.08]];
      seg.forEach(([y, z, r]) => put(new THREE.Mesh(new THREE.SphereGeometry(R * r, 8, 8), tm), 0, R * y, R * z));
    } else if (t.type === 'stub') {      // 🐻🐼 뭉툭한 짧은 꼬리
      put(new THREE.Mesh(new THREE.SphereGeometry(R * 0.17, 10, 8), tm), 0, R * 0.06, -R * 0.02);
    } else if (t.type === 'feather') {   // 🐤 뾰족한 꽁지깃
      [-1, 0, 1].forEach(s => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(R * 0.13, R * 0.46, 4), tm);
        f.position.set(s * R * 0.14, R * (0.16 + Math.abs(s) * -0.04), -R * 0.14);
        f.rotation.set(-0.9, 0, s * 0.35); f.castShadow = true; tail.add(f);
      });
    }
    tail.userData = { wagSpeed: t.wagSpeed ?? 2, wagAmp: t.wagAmp ?? 0.15 };
    g.add(tail);
  }

  return { group: g, tail };
}

// 선택한 동물로 캐릭터 외형 적용 — 체형이 다르므로 몸체를 통째로 교체
function applyCharacter(id) {
  const a = ANIMALS.find(x => x.id === id) || ANIMALS[0];
  if (!playerAnchor) return;
  if (charGroup) { playerAnchor.remove(charGroup); charGroup = null; tailPivot = null; }
  const built = buildAnimalMesh(a.id);
  charGroup = built.group; tailPivot = built.tail;
  playerAnchor.add(charGroup);
  if (heldGroup) heldGroup.position.x = a.armX ?? 0.78;   // 몸집에 맞춰 도구 위치 보정
}

// ── 캐릭터 선택 화면용: 독립 메시(도구/팔 없음) — 인게임과 같은 빌더 사용 ──
function buildCharacterMesh(id) { return buildAnimalMesh(id).group; }

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
  } else if (id === 'net') {
    // 🦋 포충망 — 긴 손잡이 + 테 + 반투명 망(밤에 실루엣이 또렷하게 보이도록 밝은 색)
    const h = wood(0.62); h.position.y = 0.2; g.add(h);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 14), clayMat(0xdfe6ea));
    ring.position.y = 0.6; ring.rotation.x = Math.PI / 2; g.add(ring);
    const bag = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xfaffff, transparent: true, opacity: 0.45, roughness: 1, side: THREE.DoubleSide }));
    bag.position.y = 0.74; g.add(bag);
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
  PARK_BENCHES.forEach(([x, z, ry]) => makeBench(x, z, ry));
  [[-1, 7], [15, 3]].forEach(([x, z]) => makeLamp(x, z));
  const flowerCols = [0xff8fab, 0xffd36e, 0xa78bfa, 0xff9e5e, 0x8fd0ff];
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 26;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (dist2D({ x, z }, LAKE) < 6.5) continue;       // 호수 위 제외
    if (dist2D({ x, z }, HOUSE_POS) < 3) continue;    // 집 터 제외
    if (dist2D({ x, z }, COOP) < 2.8) continue;       // 🐔 닭장 터 제외
    if (dist2D({ x, z }, DOCK_POND) < DOCK_POND_R + 0.5) continue;   // 🛶 나루터 연못 위 제외
    if (dist2D({ x, z }, MIST_GATE) < 4.5) continue;                 // 🌫️ 안개 숲 입구 제외
    makeFlower(x, z, flowerCols[i % flowerCols.length]);
  }
  buildCoopSite();   // 🐔 닭장 터 표지(남쪽 필드)
  buildGlade();      // 🌟 반딧불이 계곡(남쪽 숲) — 밤 콘텐츠
  spawnCafeGate();   // ☕ 카페 건물(마을 남쪽) — 처음부터 있음
  buildCafeHall();   // ☕ 카페 홀(별도 공간)
  buildForest();     // 🍄 채집 숲(남서쪽) — 줍기
  buildDockGate();   // 🛶 나루터(마을 북쪽 12시) — 처음부터 있음
  buildRiverSpace(); // 🛶 강(별도 공간) — 나룻배 러너
  buildMistGate();   // 🌫️ 안개 낀 숲 입구(북서) — 처음부터 있음
  buildMistSpace();  // 🌫️ 숲(별도 공간) — 정령 달래기 웨이브
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
  solidCircle(COOP.x, COOP.z, 1.75);                  // 🚧 오두막·펜 (모이 상호작용 2.4 확보)
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
// =============================================================
//  🌟 반딧불이 계곡 — 밤에만 열리는 남쪽 숲 (새 동사: 잡기)
//  낮엔 텅 빈 공터, 해가 지면 반딧불이가 피어오름 → "밤에 다시 올 이유"
// =============================================================
function buildGlade() {
  gladeGroup = new THREE.Group(); gladeGroup.position.copy(GLADE);
  // 짙은 이끼 바닥 — 주변 잔디보다 어두워 "숲 속 그늘" 느낌(반딧불이 대비도 ↑)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(GLADE_R + 0.6, 36), clayMat(0x8ac9a2, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.position.y = 0.02; floor.receiveShadow = true; gladeGroup.add(floor);
  // 이끼 바위 + 그루터기(공터가 허전하지 않게)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4, r = 2.4 + Math.random() * 3.4;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.32, 0), clayMat(0x9aab9a));
    rock.position.set(Math.cos(a) * r, 0.16, Math.sin(a) * r); rock.castShadow = true; gladeGroup.add(rock);
  }
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.5, 9), clayMat(PAL.trunk));
  stump.position.set(-1.6, 0.25, 1.2); stump.castShadow = true; gladeGroup.add(stump);
  gladeGroup.add(makeSignpost('🌟 반딧불이 계곡', 0, -GLADE_R + 1.2));
  scene.add(gladeGroup);
  // 계곡을 둘러싼 나무 링 — 마을 불빛을 막아 "어두운 숲" 을 만듦
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.25, r = GLADE_R + 1.4 + Math.random() * 1.2;
    const tx = GLADE.x + Math.cos(a) * r, tz = GLADE.z + Math.sin(a) * r;
    if (dist2D({ x: tx, z: tz }, CAFE_GATE) < 5.5) continue;   // ☕ 카페 시야를 가리지 않게 비움
    spawnTree(tx, tz);
  }
  obstacles.push({ x: GLADE.x, z: GLADE.z, r: GLADE_R });   // 계곡 안엔 밭 금지(빈터 유지)
}

// 종류 추첨 — 🌧️ 비 온 날엔 초록반디가, 🌫️ 안개 낀 날엔 무지개반디가 잘 나옴(날씨 훅 재사용)
function rollBugKind() {
  let roll = Math.random();
  if (WEATHER === 'rain' || WEATHER === 'fog') roll = Math.min(roll, Math.random());   // 두 번 굴려 작은 값 → 희귀↑
  return BUG_KINDS.find(k => roll <= k.p) || BUG_KINDS[BUG_KINDS.length - 1];
}

// 반딧불이 한 마리 — 발광 코어 + 넓은 헤일로(Additive). 블룸과 겹쳐 밤에 또렷하게 빛남
function makeFirefly(kind) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: kind.color, transparent: true, opacity: 1 }));
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: kind.color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  g.userData = {
    kind, core, halo,
    phase: Math.random() * Math.PI * 2,          // 점멸 위상 — 밝을 때 휘둘러야 잘 잡힘
    tx: 0, tz: 0, ty: 1.4,                       // 배회 목적지(계곡 로컬)
    flee: 0,                                     // 남은 도망 시간(초)
  };
  retargetFirefly(g);
  return g;
}

function retargetFirefly(bug) {
  const u = bug.userData;
  const a = Math.random() * Math.PI * 2, r = Math.random() * (GLADE_R - 0.8);
  u.tx = Math.cos(a) * r; u.tz = Math.sin(a) * r; u.ty = 0.9 + Math.random() * 1.9;
}

// 계곡 안 랜덤 위치에 한 마리 추가(최대 GLADE_MAX)
function spawnFirefly() {
  if (gladeBugs.length >= GLADE_MAX || !gladeGroup) return;
  const bug = makeFirefly(rollBugKind());
  const a = Math.random() * Math.PI * 2, r = Math.random() * (GLADE_R - 1);
  bug.position.set(Math.cos(a) * r, 0.9 + Math.random() * 1.6, Math.sin(a) * r);
  gladeGroup.add(bug); gladeBugs.push(bug);
}

function removeFirefly(bug) {
  const i = gladeBugs.indexOf(bug);
  if (i >= 0) gladeBugs.splice(i, 1);
  gladeGroup.remove(bug);
}

// 매 프레임 — 밤에만 나타나 떠다니고, 플레이어가 다가오면 슬쩍 도망
function updateFireflyBugs(dt, t) {
  if (!gladeGroup) return;
  const night = isNight();
  gladeGroup.visible = !indoor && !atFarm && !atMine;
  if (!night) {                                   // ☀️ 낮 → 전부 사라짐(밤에 다시 피어오름)
    while (gladeBugs.length) removeFirefly(gladeBugs[gladeBugs.length - 1]);
    return;
  }
  if (t >= bugRespawnAt && gladeBugs.length < GLADE_MAX) {
    spawnFirefly();
    bugRespawnAt = t + 1.2 + Math.random() * 2.4;  // 천천히 하나씩 피어오름
  }
  // 플레이어의 계곡 로컬 좌표(도망 판정용)
  const plx = player.position.x - GLADE.x, plz = player.position.z - GLADE.z;
  for (const bug of gladeBugs) {
    const u = bug.userData;
    u.phase += dt * 3.4;
    // 점멸 — 밝을 때가 "잡을 타이밍"(사인 곡선 그대로 UI/성공률에 연동)
    const bright = 0.5 + 0.5 * Math.sin(u.phase);
    const fade = Math.min(1, (nightLevel - NIGHT_MIN) / 0.2);   // 해질녘엔 서서히 나타남
    u.core.material.opacity = (0.3 + bright * 0.7) * fade;
    u.halo.material.opacity = (0.05 + bright * 0.3) * fade;
    u.halo.scale.setScalar(0.8 + bright * 0.55);
    // 이동 — 목적지로 부드럽게. 가까이 오면 반대 방향으로 튐
    const dx = bug.position.x - plx, dz = bug.position.z - plz;
    const pd = Math.hypot(dx, dz);
    if (pd < 1.5 && u.flee <= 0) { u.flee = 0.9; }
    let sp = 0.55;
    if (u.flee > 0) {
      u.flee -= dt; sp = 2.3;
      const k = pd || 0.001;
      u.tx = Math.max(-GLADE_R + 0.8, Math.min(GLADE_R - 0.8, plx + (dx / k) * 3.4));
      u.tz = Math.max(-GLADE_R + 0.8, Math.min(GLADE_R - 0.8, plz + (dz / k) * 3.4));
    }
    const tdx = u.tx - bug.position.x, tdz = u.tz - bug.position.z, tdy = u.ty - bug.position.y;
    const td = Math.hypot(tdx, tdz);
    if (td < 0.25 && u.flee <= 0) retargetFirefly(bug);
    else {
      bug.position.x += (tdx / (td || 1)) * sp * dt;
      bug.position.z += (tdz / (td || 1)) * sp * dt;
    }
    bug.position.y += tdy * dt * 0.8 + Math.sin(t * 2.2 + u.phase) * dt * 0.35;   // 위아래로 하늘하늘
  }
}

// 🦋 포충망 휘두르기 — 밤 + 계곡 + 반딧불이 근처에서만. 반짝일 때 휘둘러야 잘 잡힘
function tryNet() {
  if (dist2D(GLADE, player.position) > GLADE_R + 2.5) { ui.toast?.('🦋 남쪽 🌟반딧불이 계곡에서 쓰는 도구예요'); return; }
  if (!isNight()) { ui.toast?.('🌙 반딧불이는 밤에만 나와요 — 해가 지면 다시 오세요', 2600); return; }
  let target = null, nd = 2.2;
  for (const bug of gladeBugs) {
    const d = Math.hypot(bug.position.x + GLADE.x - player.position.x, bug.position.z + GLADE.z - player.position.z);
    if (d < nd) { nd = d; target = bug; }
  }
  const wx = target ? target.position.x + GLADE.x : player.position.x;
  const wz = target ? target.position.z + GLADE.z : player.position.z;
  doPlayerAction(wx, wz);   // 휘두르는 제스처는 헛스윙이어도 나감
  if (!target) { Sound.blip(); ui.toast?.('🦋 반딧불이 가까이에서 휘둘러 보세요'); trackEvent('firefly_swing_empty'); return; }
  const u = target.userData, kind = u.kind;
  const bright = 0.5 + 0.5 * Math.sin(u.phase);
  // 성공률: 반짝일 때 크게 유리 + 촘촘한 포충망(영구 업그레이드) 보정
  const base = bright > 0.6 ? 0.9 : 0.35;
  const chance = Math.min(0.98, base + (gameState.upgrades.net ? 0.18 : 0));
  const ok = Math.random() < chance;
  trackEvent('firefly_swing', { kind: kind.id, bright: Math.round(bright * 100), lit: bright > 0.6, upgraded: !!gameState.upgrades.net, caught: ok }); // [GA4] 타이밍 성공률 분석
  if (!ok) {                                   // 실패 — 반딧불이가 휙 도망
    u.flee = 1.4; retargetFirefly(target);
    Sound.blip();
    spawnFloatText(wx, target.position.y + 0.5, wz, '휙— 놓쳤다!', '#8a8f7a');
    ui.toast?.('🌟 놓쳤어요! 반딧불이가 밝게 반짝일 때 휘둘러보세요', 2400);
    return;
  }
  gameState.inventory.bug = (gameState.inventory.bug || 0) + 1;
  refreshInventoryUI();
  removeFirefly(target);
  bugRespawnAt = Math.min(bugRespawnAt, clock.elapsedTime + 2.5);   // 곧 새 개체가 피어남
  Sound.harvest();
  spawnFloatText(wx, 1.4, wz, `+1 ${kind.ico} ${kind.name}`, '#c98a2a');
  spawnSparkle(wx, 1.2, wz, kind.id === 'yellow' ? 12 : 20);
  questEvent('catch');                                    // 🦉 데일리 의뢰(반딧불이 잡기)
  dexDiscover('bug', kind.id);                            // 📖 도감(반딧불이 첫 발견)
  triggerMoment(true);                                    // 🎉 캐치 세리머니
  showCatchItem(bugJarMesh(kind), wx, target.position.y, wz);
  if (kind.id === 'rainbow') tryUnlockDrop(0.5);          // 🎨 최희귀 → 집 색 해금 확률
  trackEvent('firefly_catch', { kind: kind.id, weather: WEATHER, night: Math.round(nightLevel * 100) }); // [GA4] 밤 콘텐츠 KPI
}

// =============================================================
//  🍄 채집 숲 — 새 동사: 줍기 (도구 없이, 시간이 지나면 다시 돋음)
// =============================================================
function buildForest() {
  forestGroup = new THREE.Group(); forestGroup.position.copy(FOREST);
  // 낙엽 깔린 숲 바닥 — 마을 잔디보다 누렇고 어두워 "다른 곳에 왔다" 는 신호
  const floor = new THREE.Mesh(new THREE.CircleGeometry(FOREST_R + 0.8, 40), clayMat(0xb0cc93, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.position.y = 0.02; floor.receiveShadow = true; forestGroup.add(floor);
  for (let i = 0; i < 14; i++) {   // 낙엽 무더기
    const a = Math.random() * Math.PI * 2, r = Math.random() * FOREST_R;
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.1, 8), clayMat(0xc9b878, false));
    leaf.geometry.rotateX(-Math.PI / 2);
    leaf.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r); forestGroup.add(leaf);
  }
  // 쓰러진 통나무 몇 개(숲 느낌 + 시선 유도)
  [[-3.2, -1.4, 0.6], [2.8, 2.2, -0.9], [0.4, -4.2, 1.9]].forEach(([lx, lz, ry]) => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 2.6, 8), clayMat(PAL.trunk));
    log.rotation.set(0, ry, Math.PI / 2); log.position.set(lx, 0.34, lz); log.castShadow = true; forestGroup.add(log);
  });
  forestGroup.add(makeSignpost('🍄 채집 숲', 0, -FOREST_R + 1.4));
  scene.add(forestGroup);
  // 숲을 감싸는 나무들 — 안쪽에도 듬성듬성 심어 "숲 속을 헤집는" 느낌
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2 + 0.4, r = FOREST_R + 1.2 + Math.random() * 1.4;
    spawnTree(FOREST.x + Math.cos(a) * r, FOREST.z + Math.sin(a) * r);
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2, r = 3.5 + Math.random() * 4;
    spawnTree(FOREST.x + Math.cos(a) * r, FOREST.z + Math.sin(a) * r);
  }
  obstacles.push({ x: FOREST.x, z: FOREST.z, r: FOREST_R });   // 숲 안엔 밭 금지
  for (let i = 0; i < FORAGE_NODES; i++) spawnForageNode(i, true);
}

// 종류 추첨 — 🌧️ 비 온 날엔 버섯이 확 늘고(두 번 굴려 큰 값), 평소엔 골고루
function rollForageKind() {
  let roll = Math.random();
  if (WEATHER === 'rain') roll = Math.max(roll, Math.random());   // 큰 값 = 목록 뒤쪽(버섯) 쪽으로
  return FORAGE_KINDS.find(k => roll <= k.p) || FORAGE_KINDS[FORAGE_KINDS.length - 1];
}

function forageMesh(kind) {
  const g = new THREE.Group();
  if (kind.id === 'mushroom') {
    [[0, 0, 1], [0.26, 0.12, 0.7], [-0.2, -0.18, 0.55]].forEach(([mx, mz, s]) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.07 * s, 0.26 * s, 7), clayMat(0xf3ead8));
      stem.position.set(mx, 0.13 * s, mz); g.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), clayMat(kind.color, false));
      cap.position.set(mx, 0.26 * s, mz); cap.scale.set(1, 0.8, 1); cap.castShadow = true; g.add(cap);
    });
  } else if (kind.id === 'berry') {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 0), clayMat(0x7fbf7a));
    bush.position.y = 0.26; bush.scale.set(1.1, 0.85, 1.1); bush.castShadow = true; g.add(bush);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), clayMat(kind.color, false));
      b.position.set(Math.cos(a) * 0.28, 0.3 + Math.sin(i) * 0.08, Math.sin(a) * 0.28); g.add(b);
    }
  } else if (kind.id === 'acorn') {
    [[0, 0], [0.2, 0.16], [-0.17, 0.2]].forEach(([mx, mz]) => {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 7), clayMat(kind.color, false));
      nut.position.set(mx, 0.12, mz); nut.scale.set(1, 1.25, 1); nut.castShadow = true; g.add(nut);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), clayMat(0x8a5f3a, false));
      cap.position.set(mx, 0.2, mz); g.add(cap);
    });
  } else {   // herb — 길쭉한 잎 다발
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 5), clayMat(kind.color));
      leaf.position.set(Math.cos(a) * 0.1, 0.26, Math.sin(a) * 0.1);
      leaf.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); leaf.castShadow = true; g.add(leaf);
    }
  }
  return g;
}

// 채집물 하나를 숲 속 빈자리에 돋움. first=true 면 최초 배치(위치도 새로 뽑음)
function spawnForageNode(i, first = false) {
  const kind = rollForageKind();
  const mesh = forageMesh(kind);
  let node = forageNodes[i];
  if (first) {
    let x, z, tries = 0;
    do {   // 통나무·나무와 안 겹치게 재시도
      const a = Math.random() * Math.PI * 2, r = 1.6 + Math.random() * (FOREST_R - 2.4);
      x = FOREST.x + Math.cos(a) * r; z = FOREST.z + Math.sin(a) * r; tries++;
    } while (tries < 20 && trees.some(t => dist2D(t.position, { x, z }) < 1.6));
    node = { mesh: null, kind, x, z, ready: true, respawnAt: 0, phase: Math.random() * 6 };
    forageNodes[i] = node;
  }
  if (node.mesh) forestGroup.remove(node.mesh);
  node.kind = kind; node.mesh = mesh; node.ready = true;
  mesh.position.set(node.x - FOREST.x, 0, node.z - FOREST.z);
  mesh.rotation.y = Math.random() * Math.PI * 2;
  mesh.scale.setScalar(0.01);                      // 뽕! 하고 돋아나는 연출
  mesh.userData.pop = 1;
  forestGroup.add(mesh);
}

// 매 프레임 — 돋아나는 팝 애니메이션 + 살랑임 + 재생성 타이머
function updateForage(dt, t) {
  if (!forestGroup) return;
  forestGroup.visible = !indoor && !atFarm && !atMine;
  for (let i = 0; i < forageNodes.length; i++) {
    const n = forageNodes[i];
    if (!n.ready) { if (t >= n.respawnAt) spawnForageNode(i); continue; }
    const m = n.mesh;
    if (m.userData.pop > 0) {                      // 돋아나기(살짝 튀는 이징)
      m.userData.pop = Math.max(0, m.userData.pop - dt * 2.6);
      m.scale.setScalar(Math.max(0.01, easeOutBack(1 - m.userData.pop)));
    }
    m.rotation.z = Math.sin(t * 1.1 + n.phase) * 0.06;   // 바람에 살랑
  }
}

// 가장 가까운(주울 수 있는) 채집물 — 없으면 null
function forageTarget() {
  if (!forestGroup || indoor || atFarm || atMine) return null;
  let best = null, bd = 1.9;
  for (const n of forageNodes) {
    if (!n || !n.ready) continue;
    const d = dist2D(n, player.position);
    if (d < bd) { bd = d; best = n; }
  }
  return best ? { node: best, d: bd } : null;
}

// 🍄 줍기 — 도구가 필요 없는 "채집". 주운 자리는 잠시 뒤 다른 종류로 다시 돋아남
function tryForage(node) {
  const i = forageNodes.indexOf(node);
  if (i < 0 || !node.ready) return;
  const kind = node.kind;
  doPlayerAction(node.x, node.z);
  node.ready = false;
  node.respawnAt = clock.elapsedTime + FORAGE_RESPAWN[0] + Math.random() * (FORAGE_RESPAWN[1] - FORAGE_RESPAWN[0]);
  forestGroup.remove(node.mesh); node.mesh = null;
  giveReward(kind.give, 'forage', kind.id);
  Sound.harvest();
  spawnFloatText(node.x, 1.0, node.z, `+${kind.ico} ${kind.name}`, '#5a7a3a');
  spawnSparkle(node.x, 0.55, node.z, kind.id === 'herb' ? 18 : 10);   // 발밑에서 반짝(잎 파티클은 나무 높이라 안 맞음)
  questEvent('forage');                                       // 🦉 데일리 의뢰(채집)
  dexDiscover('forage', kind.id);                             // 📖 채집 도감
  trackEvent('forage_pick', { kind: kind.id, weather: WEATHER });   // [GA4] 채집 루프 KPI
}

// =============================================================
//  ☕ 카페 — 채굴장처럼 처음부터 있는 장소. 홀에 앉은 손님에게 서빙
// =============================================================

// ── 손님 "공급자" — 오늘의 손님·주문·대사를 만드는 곳 ─────────────
//   기본은 날짜 시드 로컬 생성. setCafeGuestSource() 로 외부 생성기
//   (예: Gemini API)를 끼우면 매일 다른 손님과 대사를 그대로 쓸 수 있다.
//   외부 생성기는 async 라서 결과가 올 때까지 로컬 손님으로 플레이가 이어지고,
//   도착하면 캐시에 담고 홀을 다시 그린다.
//   형식: [{ id, name, emoji, color, hat, recipeId, line, thanks }]
const CAFE_LINES = [
  (d) => `${d} 한 그릇 부탁드려요!`,
  (d) => `오늘은 ${d}가 당기네요 😋`,
  (d) => `${d}, 여기 향이 제일 좋더라고요.`,
  (d) => `기다렸어요! ${d} 주세요.`,
];
const CAFE_THANKS = ['잘 먹을게요, 고마워요 ☕', '역시 이 맛이야! 또 올게요', '오늘 하루가 좋아졌어요 😊', '마을 최고의 카페예요!'];

let cafeGuestCache = null;     // { date, guests: [...] } — 외부 생성기 결과
let cafeGuestFetcher = null;   // async (ctx) => guests[]

// [확장 지점] 외부 손님 생성기 등록. fn 은 async (ctx) => [{...}] 를 반환.
//   ctx = { date, count, recipes:[{id,name,ico,cost}], npcs:[{id,name,emoji}] }
export function setCafeGuestSource(fn) { cafeGuestFetcher = fn || null; cafeGuestCache = null; }

async function ensureCafeGuests() {
  const today = todayStr();
  if (!cafeGuestFetcher || cafeGuestCache?.date === today) return;
  try {
    const guests = await cafeGuestFetcher({
      date: today, count: CAFE_ORDERS, weather: WEATHER,
      recipes: cafeMenu().map(r => ({ id: r.id, name: r.name, ico: r.ico, cost: { ...r.cost } })),
      npcs: NPCS.filter(n => !n.daily).map(n => ({ id: n.id, name: n.name, emoji: n.emoji })),
    });
    if (Array.isArray(guests) && guests.length) {
      cafeGuestCache = { date: today, guests };
      refreshCafeGuests();
      trackEvent('cafe_guests_generated', { count: guests.length });   // [GA4] 외부 생성 성공률
    }
  } catch (e) {
    console.warn('[cafe] 손님 생성기 실패 — 기본 손님으로 진행', e);   // 실패해도 플레이는 계속
  }
}

// 🥚 달걀 요리는 닭장을 지어야 만들 수 있으므로, 미보유 시 메뉴에서 제외(막히는 주문 방지)
function cafeMenu() { return RECIPES.filter(r => !r.cost.egg || gameState.coop.built); }

// 로컬 기본 손님 — 날짜 시드라 하루 종일 고정, 자정에 새 손님
function localCafeGuests() {
  const pool = NPCS.filter(n => !n.daily);
  const menu = cafeMenu();
  const avail = [...pool];
  return Array.from({ length: CAFE_ORDERS }, (_, i) => {
    // 주문마다 독립된 날짜 해시 — LCG를 이어 돌리면 하위 비트 주기가 짧아 전부 같은 요리가 뽑혔었음
    const n = avail.length ? avail.splice(dateHash('cafe:npc:' + i) % avail.length, 1)[0] : pool[i % pool.length];
    const r = menu[dateHash('cafe:menu:' + i) % menu.length];
    return {
      id: n.id, name: n.name, emoji: n.emoji, color: n.color, hat: n.hat, recipeId: r.id,
      line: CAFE_LINES[dateHash('cafe:line:' + i) % CAFE_LINES.length](r.name),
      thanks: CAFE_THANKS[dateHash('cafe:thx:' + i) % CAFE_THANKS.length],
    };
  });
}

// 오늘의 주문 — 외부 생성 손님이 있으면 그걸, 없으면 로컬 손님을 정규화해 반환
function cafeOrders() {
  const st = gameState.cafe;
  const today = todayStr();
  if (st.date !== today) { st.date = today; st.done = []; st.bonus = false; }   // 새 날 → 주문 리셋
  const menu = cafeMenu();
  const raw = (cafeGuestCache?.date === today ? cafeGuestCache.guests : localCafeGuests()).slice(0, CAFE_ORDERS);
  return raw.map((g, i) => {
    // 🥚 오믈렛처럼 아직 못 만드는 메뉴를 주문했으면 만들 수 있는 메뉴로 대체
    const recipe = menu.find(r => r.id === g.recipeId) || menu[i % menu.length];
    // 외형(이름·이모지·색·모자)은 항상 게임의 주민 정보가 기준.
    // 외부 생성기(Gemini)는 id·주문·대사만 주면 되고, 나머지는 여기서 채운다.
    const base = NPCS.find(n => n.id === g.id) || {};
    return {
      i, id: g.id || ('guest' + i), name: g.name || base.name || '손님', emoji: g.emoji || base.emoji || '🙂',
      color: g.color ?? base.color ?? 0xc9c0aa, hat: g.hat ?? base.hat ?? 0xe9c47a, recipe,
      line: g.line || CAFE_LINES[0](recipe.name), thanks: g.thanks || CAFE_THANKS[0],
      done: st.done.includes(i),
    };
  });
}

// ── 마을 안 카페 건물(입구) — 채굴장 입구처럼 처음부터 서 있음 ────
function spawnCafeGate() {
  const g = new THREE.Group(); g.position.copy(CAFE_GATE);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 4.0), woodMat(4, 2, 0xf0d9b8));
  wall.position.set(0, 1.3, -1.2); wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
  const roofGeo = new THREE.ConeGeometry(3.6, 1.7, 4); roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, clayMat(0xa9564a));
  roof.position.set(0, 3.35, -1.2); roof.scale.set(1.12, 1, 0.86); roof.castShadow = true; g.add(roof);
  // 문(어두운 사각 + 문틀) — 남쪽(+z)을 향해 열림
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.14), woodMat(1, 1, 0x9a6a42));
  frame.position.set(0, 1.1, 0.82); g.add(frame);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.9 }));
  door.position.set(0, 0.98, 0.9); g.add(door);
  // 밤에 따뜻하게 빛나는 창(집 창문 시스템 재사용)
  [-1.7, 1.7].forEach(wx => {
    const wm = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffcf7a, emissiveIntensity: 0, roughness: 0.6 });
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.1), wm);
    win.position.set(wx, 1.5, 0.82); g.add(win); houseWindows.push(wm);
  });
  // 줄무늬 차양
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.9), clayMat(i % 2 ? 0xe07a6a : 0xfff2e0, false));
    s.position.set(-2.2 + i * 0.62, 2.5, 1.15); s.rotation.x = -0.4; g.add(s);
  }
  // 문 옆 화분
  [-2.1, 2.1].forEach(px => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.36, 10), clayMat(0xc98a6a, false));
    pot.position.set(px, 0.18, 1.0); pot.castShadow = true; g.add(pot);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), clayMat(0x8fd6a0));
    bush.position.set(px, 0.55, 1.0); bush.castShadow = true; g.add(bush);
  });
  // 간판은 팻말로 세워 문 옆에 — 지붕에 가리지 않고 멀리서도 보이게
  g.add(makeSignpost('☕ 카페', -3.1, 1.3));
  scene.add(g);
  obstacles.push({ x: CAFE_GATE.x, z: CAFE_GATE.z, r: 3.0 });
  // 🚧 건물 벽은 사각으로 — 원으로 막으면 남쪽 문 앞(z+1.3)에 설 수가 없다.
  //    벽 footprint: 가로 5.2, 세로 4.0, 중심 z-1.2 → 문이 있는 z+0.8 면까지만 막는다.
  solidBox(CAFE_GATE.x - 2.6, CAFE_GATE.z - 3.2, CAFE_GATE.x + 2.6, CAFE_GATE.z + 0.8);
  [-2.1, 2.1].forEach(px => solidCircle(CAFE_GATE.x + px, CAFE_GATE.z + 1.0, 0.3));   // 문 옆 화분
}

// ── 카페 홀(별도 공간) — 넓은 실내. 카운터 + 테이블 4세트 + 주문판 ──
function buildCafeHall() {
  const g = new THREE.Group(); g.position.copy(CAFE);
  const H = CAFE_HALF;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(H * 2, 0.2, H * 2), woodMat(6, 6, 0xd9b98a));
  floor.position.y = 0.05; floor.receiveShadow = true; g.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.4, 28), clayMat(0xd08a7a, false));
  rug.geometry.rotateX(-Math.PI / 2); rug.position.set(0, 0.16, 1.5); g.add(rug);
  // 문 밖 현관 데크 — 카메라가 홀 남쪽에 있어, 바닥이 없으면 화면 아래가 허공으로 크게 비어 보임
  // ── 문 밖(카페 앞마당) ────────────────────────────────────
  //  장식이 아니라 카메라 때문에 반드시 있어야 하는 바닥이다. 카메라는 플레이어보다
  //  16 뒤·높이 14(세로 화각 42°)에 있어서, 남쪽 문 앞에 섰을 때 화면 맨 아래가
  //  벽 너머 7.1 유닛까지 비춘다. 바닥이 없으면 그만큼 안개색 허공이 뜬다.
  //  나무 데크로 깔았더니 "왜 있는지 모를 빈 마루"로 보여서, 마을과 같은 잔디 +
  //  현관 디딤돌 길로 바꿔 "문 밖 앞마당"으로 자연스럽게 읽히게 했다.
  const YARD_D = 9;
  const yard = new THREE.Mesh(new THREE.BoxGeometry(H * 2 + 8, 0.14, YARD_D), clayMat(PAL.ground, false));
  yard.position.set(0, 0.03, H + YARD_D / 2); yard.receiveShadow = true; g.add(yard);
  for (let i = 0; i < 5; i++) {   // 문 → 남쪽으로 이어지는 디딤돌
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 8), clayMat(0xcfc7b0, false));
    st.position.set(i % 2 ? 0.4 : -0.4, 0.12, H + 1.2 + i * 1.6); g.add(st);
  }
  [[-4.2, 2.0, 0.6], [4.4, 2.4, 0.5], [-7.0, 5.2, 0.65], [6.6, 5.6, 0.55], [-2.0, 7.4, 0.45]]
    .forEach(([bx, bz, s]) => {   // 앞마당 덤불
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), clayMat(0x8fd6a0));
      b.position.set(bx, s * 0.85, H + bz); b.castShadow = true; g.add(b);
    });
  [-2.4, 2.4].forEach(px => {   // 문 옆 화분
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 10), clayMat(0xc98a6a, false));
    p.position.set(px, 0.37, H + 1.0); p.castShadow = true; g.add(p);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), clayMat(0x8fd6a0));
    b.position.set(px, 0.95, H + 1.0); b.castShadow = true; g.add(b);
  });
  // 벽 4면. 카메라가 있는 남쪽만 낮은 반벽 — 안쪽이 가려지지 않게(가운데는 출입구)
  const wallMat = clayMat(0xf3e2c8, false);
  const wall = (w, d, x, z, h = 3.4) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, h / 2, z); m.receiveShadow = true; g.add(m); };
  wall(H * 2, 0.4, 0, -H);
  wall(0.4, H * 2, -H, 0); wall(0.4, H * 2, H, 0);
  wall(H - 1.4, 0.4, -(H + 1.4) / 2, H, 1.0); wall(H - 1.4, 0.4, (H + 1.4) / 2, H, 1.0);
  // 카운터(북쪽) + 뒷선반 + 커피 머신
  const counter = new THREE.Mesh(new THREE.BoxGeometry(9, 1.05, 1.0), woodMat(4, 1, 0xb5834f));
  counter.position.set(0, 0.55, -H + 2.2); counter.castShadow = true; g.add(counter);
  const ctop = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.12, 1.3), woodMat(4, 1, 0xe0c398));
  ctop.position.set(0, 1.14, -H + 2.2); g.add(ctop);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 0.5), woodMat(3, 1, 0xb5834f));
  shelf.position.set(0, 1.9, -H + 0.7); g.add(shelf);
  for (let i = 0; i < 7; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.26, 9), clayMat([0xfff2e0, 0xe8a07a, 0x9ad0c0][i % 3], false));
    cup.position.set(-3 + i, 2.1, -H + 0.7); g.add(cup);
  }
  const machine = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.6), clayMat(0x7a6a60, false));
  machine.position.set(3.2, 1.55, -H + 2.2); machine.castShadow = true; g.add(machine);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.3, 10), clayMat(0x3a2a24, false));
  pot.position.set(-3.2, 1.35, -H + 2.2); g.add(pot);
  // 테이블 4세트(좌석 좌표와 짝) + 의자 두 개씩
  CAFE_SEATS.forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.68, 9), clayMat(0x8a6a4a));
    leg.position.set(sx, 0.44, sz); g.add(leg);
    const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 18), woodMat(1, 1, 0xe4c79c));
    tt.position.set(sx, 0.83, sz); tt.castShadow = true; g.add(tt);
    [1.5, -1.5].forEach(cz => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.62), woodMat(1, 1, 0xc9a06a));
      seat.position.set(sx, 0.5, sz + cz); seat.castShadow = true; g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.6, 0.09), woodMat(1, 1, 0xc9a06a));
      back.position.set(sx, 0.8, sz + cz + (cz > 0 ? 0.28 : -0.28)); g.add(back);
      [-0.24, 0.24].forEach(ox => [-0.24, 0.24].forEach(oz => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), clayMat(0x8a6a4a));
        l.position.set(sx + ox, 0.25, sz + cz + oz); g.add(l);
      }));
    });
  });
  // 창문 + 화분
  [[-H + 0.3, -4], [-H + 0.3, 4], [H - 0.3, -4], [H - 0.3, 4]].forEach(([wx, wz]) => {
    const wm = new THREE.MeshStandardMaterial({ color: 0xdff0ff, emissive: 0xffd9a0, emissiveIntensity: 0.25, roughness: 0.4 });
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 2.2), wm);
    win.position.set(wx, 1.9, wz); g.add(win);
  });
  [[-H + 1.4, H - 1.6], [H - 1.4, H - 1.6], [-H + 1.4, -H + 1.4]].forEach(([px, pz]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 10), clayMat(0xc98a6a, false));
    p.position.set(px, 0.3, pz); p.castShadow = true; g.add(p);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), clayMat(0x8fd6a0));
    b.position.set(px, 0.95, pz); b.castShadow = true; g.add(b);
  });
  // 📋 주문판(칠판) — 오늘의 주문 현황을 한눈에
  const bpost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6), woodMat(1, 1));
  bpost.position.set(CAFE_BOARD[0], 0.8, CAFE_BOARD[1]); g.add(bpost);
  const board = makeSignBoard('📋 주문판'); board.scale.setScalar(0.6);
  board.position.set(CAFE_BOARD[0], 1.75, CAFE_BOARD[1] + 0.05); g.add(board);
  const exitSign = makeSignBoard('🚪 나가기'); exitSign.scale.setScalar(0.62);
  exitSign.position.set(0, 1.1, H - 0.6); g.add(exitSign);
  // 따뜻한 펜던트 등 3개(그룹 안이라 홀에 있을 때만 씬 조명에 잡힘)
  [[-5.5, 0], [0, -3], [5.5, 0]].forEach(([lx, lz]) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), clayMat(0x6a5a4a));
    cord.position.set(lx, 3.0, lz); g.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 12), clayMat(0xe8a07a, false));
    shade.position.set(lx, 2.45, lz); g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));
    bulb.position.set(lx, 2.25, lz); g.add(bulb);
    const light = new THREE.PointLight(0xffd9a0, 2.6, 20, 1.3); light.position.set(lx, 2.2, lz); g.add(light);
  });
  // 🚧 홀 안 가구 충돌 — 카운터를 뚫고 들어가 서 있던 문제
  solidBox(CAFE.x - 4.75, CAFE.z - H + 1.5, CAFE.x + 4.75, CAFE.z - H + 2.9);   // 카운터
  CAFE_SEATS.forEach(([sx, sz]) => solidCircle(CAFE.x + sx, CAFE.z + sz, 0.9)); // 테이블
  [[-H + 1.4, H - 1.6], [H - 1.4, H - 1.6], [-H + 1.4, -H + 1.4]]
    .forEach(([px, pz]) => solidCircle(CAFE.x + px, CAFE.z + pz, 0.4));         // 화분
  scene.add(g); cafeInGroup = g; cafeInGroup.visible = false;   // 홀에 있을 때만 표시
  refreshCafeGuests();
}

// 자리에 앉은 손님 — 머리 위에 "주문한 요리" 말풍선을 띄움
function makeCafeGuest(o) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.44, 1), clayMat(o.color, false));
  body.position.y = 0.72; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.33, 1), clayMat(0xffe0c0, false));
  head.position.y = 1.24; head.castShadow = true; g.add(head);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.055, 12), clayMat(o.hat));
  brim.position.y = 1.46; g.add(brim);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), clayMat(o.hat));
  top.position.y = 1.56; g.add(top);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
  [-0.11, 0.11].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat); e.position.set(ex, 1.27, 0.28); g.add(e); });
  return g;
}

// 주문 말풍선(캔버스 스프라이트) — 주문한 요리 아이콘을 크게
function cafeGuestSprite(o) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(255,255,255,0.94)'; roundRect(c, 10, 8, 108, 92, 22); c.fill();
  c.beginPath(); c.moveTo(54, 98); c.lineTo(74, 98); c.lineTo(62, 120); c.closePath(); c.fill();
  c.font = '58px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(o.recipe.ico, 64, 56);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.0, 1.0, 1.0); sp.position.y = 2.3;
  return sp;
}

// 오늘의 주문에 맞춰 홀의 손님을 다시 배치(입장·서빙·날짜 변경 후 호출)
function refreshCafeGuests() {
  if (!cafeInGroup) return;
  while (cafeGuestObjs.length) {
    const g = cafeGuestObjs.pop();
    cafeInGroup.remove(g.group);
    removeSolid(g.collider);        // 🚧 떠난 손님 자리에 안 보이는 벽이 남지 않게
  }
  cafeOrders().forEach((o, n) => {
    if (o.done) return;                                   // 서빙 끝난 손님은 이미 떠남
    const [sx, sz] = CAFE_SEATS[n % CAFE_SEATS.length];
    const group = makeCafeGuest(o);
    group.position.set(sx, 0.16, sz + 1.5);               // 테이블 남쪽 의자에 앉음(의자 높이만큼 올림)
    group.rotation.y = Math.PI;                           // 테이블(북쪽)을 바라봄
    const sprite = cafeGuestSprite(o);
    group.add(sprite);
    cafeInGroup.add(group);
    // 🚧 손님도 통과 못 함(홀 좌표 → 월드 좌표). 서빙 사거리 2.4 엔 영향 없음
    const collider = solidCircle(CAFE.x + sx, CAFE.z + sz + 1.5, NPC_R);
    cafeGuestObjs.push({ order: o, group, sprite, collider, phase: Math.random() * 6 });
  });
}

// 매 프레임 — 숨쉬기 + 말풍선 살랑임(홀에 있을 때만)
function updateCafeGuests(dt, t) {
  if (!atCafe) return;
  for (const g of cafeGuestObjs) {
    g.group.position.y = 0.16 + Math.sin(t * 2 + g.phase) * 0.03;
    g.sprite.position.y = 2.3 + Math.sin(t * 2.6 + g.phase) * 0.08;
  }
}

// index.html(ui.openCafe)이 렌더할 주문판 데이터
function cafeView() {
  const st = gameState.cafe;
  const inv = gameState.inventory;
  const orders = cafeOrders().map(o => ({
    i: o.i,
    npc: { id: o.id, name: o.name, emoji: o.emoji },
    recipe: { id: o.recipe.id, name: o.recipe.name, ico: o.recipe.ico },
    line: o.line,
    cost: Object.entries(o.recipe.cost).map(([k, v]) => ({ key: k, ico: SELL_ICO_G[k] || '📦', label: RES_LABEL[k] || k, need: v, have: inv[k] || 0 })),
    pay: CAFE_PAY[o.recipe.id] || 30,
    done: o.done,
    ready: !o.done && Object.entries(o.recipe.cost).every(([k, v]) => (inv[k] || 0) >= v),
  }));
  return { orders, served: st.served || 0, allDone: orders.every(o => o.done), bonus: CAFE_BONUS };
}

function enterCafe() {
  atCafe = true;
  refreshCafeGuests();                                   // 자정을 넘겼다면 새 손님으로
  ensureCafeGuests();                                    // 외부 생성기(등록됐다면) 비동기 갱신
  player.position.set(CAFE.x, 0, CAFE.z + CAFE_HALF - 3.2); player.rotation.y = Math.PI;
  nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('cafeHall', '☕', '카페',
    '손님이 테이블에 앉아 머리 위에 주문한 요리를 띄우고 있어요. 재료를 들고 손님에게 다가가 액션(Space)을 누르면 그 자리에서 만들어 서빙해요! 📋 주문판에서 오늘 주문 전체를 볼 수 있어요. 남쪽 문으로 나가요.');
  Sound.blip(); trackEvent('enter_cafe');                // [GA4]
}
function exitCafe() {
  atCafe = false;
  player.position.set(CAFE_GATE.x, 0, CAFE_GATE.z + 2.8);
  nearDoor = null; ui.setDoorPrompt?.(null);
  snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('exit_cafe');                 // [GA4]
}

// ☕ 서빙 — 손님 앞에서 재료를 소비해 그 자리에서 만들어 냄
function serveCafeGuest(guest) {
  const o = guest?.order; if (!o) return;
  const st = gameState.cafe;
  if (st.done.includes(o.i)) { ui.toast?.('이미 서빙한 손님이에요'); return; }
  const lack = Object.entries(o.recipe.cost).filter(([k, v]) => (gameState.inventory[k] || 0) < v);
  if (lack.length) {
    const need = Object.entries(o.recipe.cost).map(([k, v]) => `${SELL_ICO_G[k] || ''}${RES_LABEL[k] || k} ${gameState.inventory[k] || 0}/${v}`).join(' · ');
    ui.toast?.(`${o.recipe.ico} ${o.recipe.name} 재료가 부족해요 — ${need}`, 3200);
    return;
  }
  const wx = guest.group.position.x + CAFE.x, wz = guest.group.position.z + CAFE.z;
  for (const k in o.recipe.cost) gameState.inventory[k] -= o.recipe.cost[k];
  doPlayerAction(wx, wz);
  const pay = CAFE_PAY[o.recipe.id] || 30;
  giveReward({ coins: pay }, 'cafe_serve', o.recipe.id);          // [원장] 서빙 수입
  st.done.push(o.i);
  st.served = (st.served || 0) + 1;
  const aff = gameState.affinity[o.id] = (gameState.affinity[o.id] || 0) + 1;   // ❤️ 접객으로도 친해짐
  refreshInventoryUI();
  dexDiscover('cook', o.recipe.id);                               // 📖 요리 도감(만들어 낸 셈)
  questEvent('serve');                                            // 🦉 데일리 의뢰(서빙)
  Sound.harvest();
  spawnFloatText(wx, 2.6, wz, `${o.recipe.ico} ${o.thanks}`, '#c9682a');
  spawnSparkle(wx, 1.6, wz, 16);
  triggerMoment();
  nearCafeGuest = null;
  refreshCafeGuests();                                            // 만족한 손님은 자리를 뜸
  trackEvent('cafe_serve', { recipe: o.recipe.id, npc: o.id, pay, served_total: st.served, affinity: aff }); // [GA4] 접객 루프 KPI
  if (st.done.length >= CAFE_ORDERS && !st.bonus) {               // 🎉 오늘 영업 완주
    st.bonus = true;
    giveReward({ coins: CAFE_BONUS }, 'cafe_bonus', st.date);
    spawnConfetti(player.position.x, 2.4, player.position.z); Sound.complete();
    ui.toast?.(`🎉 오늘 손님을 모두 대접했어요! 보너스 🪙+${CAFE_BONUS} — 내일 새 손님이 와요`, 3400);
    trackEvent('cafe_complete', { served_total: st.served });     // [GA4] 데일리 완주율
  } else {
    ui.toast?.(`${o.recipe.ico} ${o.name}에게 ${o.recipe.name} 서빙! 🪙+${pay} ❤️${aff}`, 2600);
  }
  syncBadges();                                                   // 🏅 바리스타 배지 판정
}

// 홀 안 손님/주문판 근접 판정 — updateDoorInteract 에서 호출. 프롬프트 문구를 돌려줌
function updateCafeInteract() {
  nearCafeGuest = null; nearCafeBoard = false;
  if (!atCafe) return null;
  let nd = 2.4;
  for (const g of cafeGuestObjs) {
    const d = Math.hypot(g.group.position.x + CAFE.x - player.position.x, g.group.position.z + CAFE.z - player.position.z);
    if (d < nd) { nd = d; nearCafeGuest = g; }
  }
  if (nearCafeGuest) {
    const o = nearCafeGuest.order;
    const ready = Object.entries(o.recipe.cost).every(([k, v]) => (gameState.inventory[k] || 0) >= v);
    return `${o.emoji} ${o.name} — ${o.recipe.ico} ${o.recipe.name} ${ready ? '서빙하기' : '(재료 부족)'}`;
  }
  if (Math.hypot(CAFE_BOARD[0] + CAFE.x - player.position.x, CAFE_BOARD[1] + CAFE.z - player.position.z) < 2.2) {
    nearCafeBoard = true; return '📋 오늘의 주문판';
  }
  return null;
}

// =============================================================
//  🛶 나루터 & 강 내려가기 — 마을 북쪽(12시) 선착장 → 강 인스턴스 공간
//  ------------------------------------------------------------
//  ▶ 카페·채굴장과 같은 "처음부터 있는 장소" 문법: 마을 게이트 → 별도 공간 이동
//  ▶ 강 공간은 2단계 — ① 나루터 데크(걸어 다니며 배 타기/업그레이드) ② 런(1인칭 배)
//  ▶ 코스는 날짜+회차 시드로 결정 → 리롤 불가 + 전원 동일 코스(실력 비교 가능)
// =============================================================

// ── 마을 북쪽 선착장(게이트) — 여기서 액션을 누르면 강 공간으로 ──
function buildDockGate() {
  const g = new THREE.Group(); g.position.copy(DOCK_GATE);
  // 물가 — 마을 호수와 같은 둥근 연못(네모난 판이 아니라 자연스러운 물가)
  const water = new THREE.Mesh(new THREE.CircleGeometry(DOCK_POND_R, 40),
    new THREE.MeshStandardMaterial({ color: 0x8fd0ea, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.92 }));
  water.geometry.rotateX(-Math.PI / 2);
  water.position.set(DOCK_POND.x - DOCK_GATE.x, 0.07, DOCK_POND.z - DOCK_GATE.z); water.receiveShadow = true; g.add(water);
  // 물가 돌 — 호수와 같은 문법(데크가 닿는 남쪽은 비움)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    if (Math.sin(a) > 0.55) continue;                       // 데크 쪽(남쪽)은 비움
    const rr = DOCK_POND_R - 0.25 + Math.random() * 0.5;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26 + Math.random() * 0.3, 0), clayMat(0xb9c0c4));
    rock.position.set((DOCK_POND.x - DOCK_GATE.x) + Math.cos(a) * rr, 0.14, (DOCK_POND.z - DOCK_GATE.z) + Math.sin(a) * rr);
    rock.castShadow = true; g.add(rock);
  }
  // 수련잎 몇 장 — 호수와 같은 소품으로 물이 비어 보이지 않게
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * (DOCK_POND_R - 3);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.36, 7), clayMat(0x7fc98a, false));
    pad.geometry.rotateX(-Math.PI / 2);
    pad.position.set((DOCK_POND.x - DOCK_GATE.x) + Math.cos(a) * rr, 0.12, (DOCK_POND.z - DOCK_GATE.z) + Math.sin(a) * rr);
    g.add(pad);
  }
  // 데크(마을에서 물가로 뻗은 나무 다리)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 5.2), woodMat(2, 3));
  deck.position.set(0, 0.32, -2.2); deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  [[-1.1, -0.2], [1.1, -0.2], [-1.1, -4.2], [1.1, -4.2]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 6), woodMat(1, 1, 0xa9743f));
    post.position.set(px, 0.1, pz); g.add(post);
  });
  // 정박한 나룻배(장식) — "여기서 탄다"는 걸 한눈에
  const moored = makeBoatHull(0.9, true); moored.position.set(2.2, 0.22, -5.2); moored.rotation.y = 0.35; g.add(moored);
  // 노가 걸린 표지판
  g.add(makeSignpost('🛶 나루터', 0, 1.6));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffcf6a, emissiveIntensity: 0.8 }));
  lamp.position.set(-2.2, 1.5, 0.6); g.add(lamp);   // 물가 잔디 위(연못 밖)에 세움
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 6), woodMat(1, 1, 0x8a6540));
  pole.position.set(-2.2, 0.75, 0.6); g.add(pole);
  scene.add(g); dockGroup = g;
  obstacles.push({ x: DOCK_POND.x, z: DOCK_POND.z, r: DOCK_POND_R + 0.5 });   // 연못 위엔 밭 금지
  solidCircle(DOCK_POND.x, DOCK_POND.z, DOCK_POND_R - 0.3);                    // 🚧 물엔 못 들어감(물가에서 막힘)
}

// 🛶 나룻배 — 청록 선체 + 나무 뱃전/뱃머리 + 붉은 좌석 + 고물 장식(곤돌라 풍).
//   마을 장식과 실제 탑승용에 함께 쓴다. 뱃머리는 -z(진행) 방향.
//   원기둥을 눕혀 세로로 납작하게 눌러 카누 단면을 만들고, 앞뒤에 뾰족한 콘을 붙인다.
//   ※ 참고 디자인의 금테 대신 마을의 나무 톤(데크·표지판과 같은 색)으로 — 마을 팔레트와 통일
const BOAT_TEAL = 0x3fb3c2, BOAT_TRIM = 0xd9a066, BOAT_RED = 0xb2453e;
function makeBoatHull(s = 1, withOar = false) {
  const g = new THREE.Group();
  const teal = clayMat(BOAT_TEAL, false), trim = clayMat(BOAT_TRIM, false), red = clayMat(BOAT_RED, false);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3, 12), teal);
  hull.rotation.x = Math.PI / 2;          // 원기둥 축(local Y) → 진행 방향(z)
  hull.scale.set(1, 1, 0.5);              // local z(= 월드 높이)만 눌러 납작하게
  hull.position.y = 0.32; hull.castShadow = true; g.add(hull);
  // 뱃머리·고물 — 나무 뾰족 캡
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.3, 12), trim);
  bow.rotation.x = -Math.PI / 2; bow.scale.set(1, 1, 0.5); bow.position.set(0, 0.32, -2.15); bow.castShadow = true; g.add(bow);
  const stern = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 12), trim);
  stern.rotation.x = Math.PI / 2; stern.scale.set(1, 1, 0.5); stern.position.set(0, 0.32, 2); g.add(stern);
  // 뱃전 테두리 — 위에서 봤을 때 배 안쪽이 파여 보이게
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.065, 6, 20), trim);
  rim.rotation.x = -Math.PI / 2; rim.scale.set(1, 2.7, 1); rim.position.y = 0.6; g.add(rim);
  // 안쪽 바닥(진한 청록) — 파인 느낌
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.48, 14), clayMat(0x2e93a3, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.scale.set(1, 1, 2.7); floor.position.y = 0.3; g.add(floor);
  // 붉은 좌석 + 등받이
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.2, 0.62), red);
  seat.position.set(0, 0.42, 0.3); seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 0.18), red);
  back.position.set(0, 0.66, 0.66); g.add(back);
  // 고물 장식(곤돌라의 페로) — 나무를 깎아 만든 기둥 + 빗살
  const ferro = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.66, 0.16), trim);
  ferro.position.set(0, 0.85, 1.72); g.add(ferro);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.5), trim);
  head.position.set(0, 1.12, 1.55); g.add(head);
  for (let i = 0; i < 3; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.26), trim);
    tooth.position.set(0, 0.72 - i * 0.16, 1.86); g.add(tooth);
  }
  // 노(장식) — 정박한 배에만. 뱃전에 걸쳐 물에 담근 모습
  if (withOar) g.add(makeOar(-1));
  g.scale.setScalar(s);
  return g;
}

// 노 하나 — 나무 자루 + 넓적한 날. side: -1 왼쪽 / +1 오른쪽
function makeOar(side) {
  const oar = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), clayMat(BOAT_TRIM, false));
  shaft.rotation.z = side * 1.18;                       // 거의 눕힌 각도(수평에 가깝게)
  shaft.position.set(side * 0.95, -0.12, 0); oar.add(shaft);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.66), clayMat(BOAT_TRIM, false));
  blade.position.set(side * 1.92, -0.55, 0); oar.add(blade);
  oar.position.set(0, 0.5, 0.85);                       // 뱃전(노받이) 위치 — 카메라보다 뒤·아래
  oar.userData.side = side;
  return oar;
}

// ── 강 공간 — 상류 나루터 데크 + 긴 강물 + 강둑 ──
function buildRiverSpace() {
  const g = new THREE.Group(); g.position.copy(RIVER);
  const H = RIVER_DOCK_HALF;
  // 나루터 데크(걸어 다니는 바닥)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(H * 2, 0.3, H * 2), woodMat(6, 6));
  deck.position.set(0, 0.15, 0); deck.receiveShadow = true; g.add(deck);
  for (let i = -1; i <= 1; i += 2) {   // 데크 난간(양옆)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, H * 2), woodMat(1, 4, 0xa9743f));
    rail.position.set(i * (H - 0.1), 0.55, 0); g.add(rail);
  }
  // 강물 — 데크 앞(-z)으로 코스 길이만큼 길게
  const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_W * 2 + 4, RIVER_LEN + 80),
    new THREE.MeshStandardMaterial({ color: 0x7ec4e8, roughness: 0.22, metalness: 0.2, transparent: true, opacity: 0.94 }));
  water.geometry.rotateX(-Math.PI / 2);
  water.position.set(0, 0.08, -H - (RIVER_LEN + 80) / 2 + 4); water.receiveShadow = true; g.add(water);
  // 강둑(양쪽) + 듬성듬성한 나무 — 속도감을 주는 시각 기준점
  for (let i = -1; i <= 1; i += 2) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(7, 0.9, RIVER_LEN + 80), clayMat(0x9ed7a8, false));
    bank.position.set(i * (RIVER_W + 5), 0.2, -H - (RIVER_LEN + 80) / 2 + 4); bank.receiveShadow = true; g.add(bank);
  }
  // 강둑 나무 — 속도감을 주는 시각 기준점. 📱 모바일은 간격을 넓혀 드로우콜을 절반 이하로
  const treeGap = IS_MOBILE ? 18 : 9;
  for (let d = 6; d < RIVER_LEN + 40; d += treeGap) {
    for (const side of [-1, 1]) {
      if ((d * 7 + side) % 3 === 0) continue;           // 듬성듬성
      const h = 2.2 + ((d * 13) % 7) * 0.28;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, h, 5), clayMat(PAL.trunk));
      trunk.position.set(side * (RIVER_W + 2.6 + ((d * 3) % 5) * 0.5), 0.65 + h / 2, -H - d); g.add(trunk);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.4, 6), clayMat((d % 2) ? PAL.leaf1 : PAL.leaf2));
      leaf.position.set(trunk.position.x, 0.65 + h + 0.9, -H - d); g.add(leaf);
    }
  }
  // 🛶 타는 배(정박) — 데크 앞쪽 끝
  const moored = makeBoatHull(1, true); moored.position.set(0, 0.2, -H - 1.4); g.add(moored);
  g.userData.moored = moored;   // 🛶 런 중엔 숨김 — 출발 지점과 겹쳐 배가 이중으로 보이는 것 방지
  // 🧰 뱃사공의 창고(업그레이드) — 데크 서쪽
  const shed = new THREE.Group(); shed.position.set(-H + 2, 0, 1.6);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 2), clayMat(0xe2c79a)); body.position.y = 1.25; body.castShadow = true; shed.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.1, 4), clayMat(0xd08a6a)); roof.position.y = 2.7; roof.rotation.y = Math.PI / 4; shed.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.08), woodMat(1, 1, 0x8a5c36)); door.position.set(0, 0.9, 1.02); shed.add(door);
  g.add(shed);
  g.add(makeSignpost('🧰 뱃사공의 창고', -H + 2, 3.4));
  g.add(makeSignpost('🚪 마을로', 0, H - 0.6));
  scene.add(g); riverGroup = g; g.visible = false;
  solidCircle(RIVER.x - H + 2, RIVER.z + 1.6, 1.5);   // 🚧 창고
}

// ── 하루 횟수 / 업그레이드 ──────────────────────────────────
function boatDaily() {
  const st = gameState.boat;
  if (st.date !== todayStr()) { st.date = todayStr(); st.count = 0; }   // 자정 지나면 리셋
  return st;
}
function boatRunsLeft() { return Math.max(0, BOAT_RUNS_PER_DAY - boatDaily().count); }
function boatLampMax() { return BOAT_LAMPS + (gameState.boat.up.hull || 0); }
// 🧰 창고 UI 데이터 — index.html 이 렌더
function boatShopView() {
  const inv = gameState.inventory;
  return {
    star: inv.star || 0, coins: inv.coins || 0,
    best: gameState.boat.best || 0, clears: gameState.boat.clears || 0, runsLeft: boatRunsLeft(), runsMax: BOAT_RUNS_PER_DAY,
    items: BOAT_UPGRADES.map(u => {
      const lv = gameState.boat.up[u.id] || 0;
      const next = lv < u.max ? u.cost[lv] : null;
      return {
        id: u.id, name: u.name, ico: u.ico, desc: u.desc, lv, max: u.max, cost: next,
        affordable: !!next && (inv.star || 0) >= next.star && (inv.coins || 0) >= next.coins,
      };
    }),
  };
}
function buyBoatUpgrade(id) {
  const u = BOAT_UPGRADES.find(x => x.id === id); if (!u) return { ok: false };
  const lv = gameState.boat.up[id] || 0;
  if (lv >= u.max) return { ok: false, msg: '이미 최고 단계예요' };
  const c = u.cost[lv];
  if ((gameState.inventory.star || 0) < c.star) return { ok: false, msg: `⭐별조각이 부족해요 — ${gameState.inventory.star || 0}/${c.star}` };
  if ((gameState.inventory.coins || 0) < c.coins) return { ok: false, msg: `🪙코인이 부족해요 — ${gameState.inventory.coins || 0}/${c.coins}` };
  gameState.inventory.star -= c.star;
  gameState.inventory.coins -= c.coins;
  gameState.boat.up[id] = lv + 1;
  logEcon('boat_upgrade', `${id}:${lv + 1}`, -c.coins, gameState.inventory.coins);   // [원장] 코인 싱크
  refreshInventoryUI(); Sound.build(); spawnSparkle(player.position.x, 1.5, player.position.z, 18);
  trackEvent('boat_upgrade', { item: id, level: lv + 1, star_cost: c.star, coin_cost: c.coins });   // [GA4] 성장 퍼널
  return { ok: true, name: u.name, ico: u.ico, lv: lv + 1 };
}

// ── 입장 / 퇴장 ────────────────────────────────────────────
function enterRiver() {
  atRiver = true;
  player.position.set(RIVER.x, 0, RIVER.z + RIVER_DOCK_HALF - 1.6); player.rotation.y = Math.PI;
  nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('riverDock', '🛶', '나루터',
    '정박한 나룻배에 다가가 액션(Space)을 누르면 강을 내려가요! 배는 알아서 흘러가니 ⬅️➡️ 좌우로 피하기만 하면 돼요. 액션을 누르면 노를 힘껏 저어 잠깐 빨라져요. ⭐별조각을 모아 🧰창고에서 배를 강화하세요. 하루 3번 탈 수 있어요.');
  Sound.blip();
  trackEvent('boat_enter', { runs_left: boatRunsLeft(), night: isNight(), weather: WEATHER });   // [GA4] 유입
}
function exitRiver() {
  if (boat.active) endBoatRun('quit');
  atRiver = false;
  player.position.set(DOCK_GATE.x, 0, DOCK_GATE.z + 2.2);
  nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('boat_exit');   // [GA4]
}

// ── 코스 생성(시드) ────────────────────────────────────────
// mulberry32 — 시드 하나로 재현 가능한 난수열(같은 날·같은 회차면 코스가 똑같음)
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clampW(x, pad = 1.1) { return Math.max(-RIVER_W + pad, Math.min(RIVER_W - pad, x)); }
function buildCourse(seed, night) {
  riverCourse.length = 0;
  const rnd = mulberry32(seed);
  let d = 46;                                     // 첫 장애물까지 여유(가속·조작 적응 구간)
  while (d < RIVER_LEN - 24) {
    const p = d / RIVER_LEN;                      // 진행도 0~1 (구간 1/2/3)
    //  1구간은 넉넉하게(조작을 익히는 구간) → 갈수록 촘촘해짐
    const gap = (p < 0.34 ? 26 : p < 0.67 ? 17 : 12.5) + rnd() * 8;
    const kinds = p < 0.34 ? ['rock', 'rock', 'log']
      : p < 0.67 ? ['rock', 'log', 'whirl', 'rock']
        : ['rock', 'log', 'whirl', 'pile', 'rock'];
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    if (kind === 'pile') {                        // 🪧 다리 기둥 — 좁은 문(쌍으로)
      const gx = (rnd() * 2 - 1) * (RIVER_W - 3);
      riverCourse.push({ d, kind: 'pile', x: gx - 2.4 });
      riverCourse.push({ d, kind: 'pile', x: gx + 2.4 });
    } else {
      riverCourse.push({ d, kind, x: clampW((rnd() * 2 - 1) * RIVER_W, RIVER_OBS[kind].r + 0.3), drift: kind === 'log' ? (rnd() * 2 - 1) * 0.7 : 0 });
    }
    // ⭐ 별조각 라인 — 장애물 사이 빈틈에 곡선으로. "피하면서 줍는" 동선을 만듦
    if (rnd() < 0.78) {
      const n = 3 + Math.floor(rnd() * 3);
      const sx = (rnd() * 2 - 1) * (RIVER_W - 1.4), curve = (rnd() * 2 - 1) * 0.9;
      for (let i = 0; i < n; i++) riverCourse.push({ d: d + gap * 0.42 + i * 2.7, kind: 'star', x: clampW(sx + curve * i) });
    }
    // 🪷 희귀 수집물 — 드물게, 살짝 위험한 자리에(밤 전용은 밤에만)
    if (rnd() < 0.22) {
      const cands = RIVER_PICKS.filter(k => !k.night || night);
      const k = cands[Math.floor(rnd() * cands.length)];
      riverCourse.push({ d: d + gap * 0.68, kind: 'pick', pick: k.id, x: clampW((rnd() * 2 - 1) * RIVER_W, 1.3) });
    }
    d += gap;
  }
  riverCourse.sort((a, b) => a.d - b.d);
}

// ── 코스 오브젝트 메시(풀 재사용) ───────────────────────────
function makeRiverMesh(kind, pickId) {
  if (kind === 'rock') {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), clayMat(0xb0b8bd));
    m.castShadow = true; return m;
  }
  if (kind === 'log') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.6, 7), woodMat(2, 1, 0xa9743f));
    m.rotation.z = Math.PI / 2; m.castShadow = true; return m;
  }
  if (kind === 'pile') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), woodMat(1, 2, 0x8a5c36));
    m.castShadow = true; return m;
  }
  if (kind === 'whirl') {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 6, 18),
      new THREE.MeshStandardMaterial({ color: 0x9fdcf5, transparent: true, opacity: 0.75, roughness: 0.3 }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  if (kind === 'star') {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0),
      new THREE.MeshStandardMaterial({ color: 0xffe07a, emissive: 0xffc94a, emissiveIntensity: 0.85, roughness: 0.4 }));
    return m;
  }
  const k = RIVER_PICKS.find(x => x.id === pickId) || RIVER_PICKS[0];
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0),
    new THREE.MeshStandardMaterial({ color: k.color, emissive: k.color, emissiveIntensity: 0.45, roughness: 0.45 }));
  return m;
}
function acquireRiverMesh(item) {
  const key = item.kind === 'pick' ? 'pick:' + item.pick : item.kind;
  const pool = riverPool[key] || (riverPool[key] = []);
  const m = pool.pop() || makeRiverMesh(item.kind, item.pick);
  m.visible = true; riverGroup.add(m);
  return m;
}
function releaseRiverMesh(act) {
  const key = act.item.kind === 'pick' ? 'pick:' + act.item.pick : act.item.kind;
  riverGroup.remove(act.mesh);
  (riverPool[key] || (riverPool[key] = [])).push(act.mesh);
}
function clearRiverObjects() {
  while (riverActive.length) releaseRiverMesh(riverActive.pop());
}

// ── 런 시작 / 종료 ─────────────────────────────────────────
function startBoatRun() {
  const st = boatDaily();
  if (st.count >= BOAT_RUNS_PER_DAY) {
    ui.showHintModal?.({ ico: '🛶', title: '오늘은 여기까지', body: `나룻배는 하루 ${BOAT_RUNS_PER_DAY}번까지 탈 수 있어요. 내일 새로운 물길(코스)이 열려요 — 또 만나요!` });
    return;
  }
  st.count += 1;
  boat.runNo = st.count;
  boat.night = isNight();
  // 날짜+회차 시드 — 새로고침해도 같은 코스(리롤 불가) + 그날 전원 동일 코스(실력 비교 가능)
  boat.seed = dateHash('river:' + boat.runNo);
  buildCourse(boat.seed, boat.night);
  Object.assign(boat, {
    active: true, dist: 0, speed: BOAT_BASE_SPEED, vx: 0, lamps: boatLampMax(), stars: 0,
    hits: 0, hitLog: [], picks: {}, boostUntil: 0, boostReadyAt: 0, boostUsed: 0,
    invUntil: 0, stunUntil: 0, wreckAt: 0, shake: 0, next: 0, startedAt: performance.now(), t: 0,
  });
  clearRiverObjects();
  if (!boat.group) { boat.group = makeBoatRideable(); scene.add(boat.group); }
  boat.group.visible = true;
  const lit = !!(boat.night && gameState.boat.up.lamp);   // 🏮 밤 + 등불 업그레이드일 때만 점등
  boat.group.userData.lantern.visible = lit;
  boat.group.userData.light.intensity = lit ? 1.6 : 0;
  playerAnchor.visible = (boatView === 'third');     // 1인칭이면 캐릭터를 숨김(시야 방해 방지)
  if (heldGroup) heldGroup.visible = false;          // 🛶 배 위에선 도구를 내려놓는다(두 손으로 노를 잡는 느낌)
  playerAnchor.position.y = 0; playerAnchor.rotation.set(0, 0, 0);   // 노 젓기 자세 초기화
  boat.group.rotation.set(0, 0, 0); boat.group.position.y = 0;       // 지난 런의 침몰 자세 초기화
  if (riverGroup?.userData.moored) riverGroup.userData.moored.visible = false;   // 정박 배 숨김(출발 지점 겹침 방지)
  player.position.set(RIVER.x, 0, RIVER.z - RIVER_DOCK_HALF - 2); player.rotation.y = Math.PI;
  nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); lastZoneHint = null;
  ui.setBoatRun?.(true);
  Sound.water();
  const up = gameState.boat.up;
  trackEvent('boat_start', {                                   // [GA4] 런 시작(코스 시드까지 남김)
    run_no: boat.runNo, seed: boat.seed, night: boat.night, weather: WEATHER,
    lamps: boat.lamps, up_oar: up.oar, up_hull: up.hull, up_lamp: up.lamp,
  });
}

// 실제 타는 배 — 선체 + 좌우 노(젓는 모션). 1인칭에서 화면 아래 양옆에 노가 보인다
function makeBoatRideable() {
  const g = new THREE.Group();
  g.add(makeBoatHull(1.05));
  // 노 — 1인칭에서 화면 아래 양옆으로 뻗게(시야 정중앙을 가리지 않도록 낮고 눕혀서)
  for (const side of [-1, 1]) g.add(makeOar(side));
  // 🏮 뱃머리 등불 — 업그레이드를 샀고 밤일 때만 켜진다(밤 주행의 체감 보상)
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc85a, emissiveIntensity: 1 }));
  lantern.position.set(0, 0.95, -1.9); lantern.visible = false; g.add(lantern);
  const light = new THREE.PointLight(0xffd79a, 0, 22, 1.4);
  light.position.set(0, 1.2, -2.4); g.add(light);
  g.userData.lantern = lantern; g.userData.light = light;
  return g;
}

function endBoatRun(result) {
  if (!boat.active) return;
  boat.active = false;
  const timeSec = Math.round((performance.now() - boat.startedAt) / 100) / 10;
  const distM = Math.round(boat.dist);
  const rareCount = Object.values(boat.picks).reduce((a, b) => a + b, 0);
  const up = gameState.boat.up;
  // ⭐ 보상 — 🌧️비(물살↑)·🌙밤+🏮등불 보너스, 완주/무피해 보너스. 코인은 주지 않음(인플레 방지)
  const rainBonus = RAIN_DAY ? 1.15 : 1;
  const lampBonus = (boat.night && up.lamp) ? 1.2 : 1;
  let stars = Math.round(boat.stars * rainBonus * lampBonus);
  if (result === 'clear') stars += 5;
  if (result === 'clear' && boat.hits === 0) stars += 5;              // 🏆 무피해 완주
  const give = { star: stars };
  for (const id in boat.picks) {                                       // 희귀 수집물 → 재료
    const k = RIVER_PICKS.find(x => x.id === id); if (!k) continue;
    for (const res in k.give) give[res] = (give[res] || 0) + k.give[res] * boat.picks[id];
  }
  const score = distM + boat.stars * 8 + rareCount * 40 + (result === 'clear' ? 200 : 0);
  const best = score > (gameState.boat.best || 0);
  if (best) gameState.boat.best = score;
  if (result === 'clear') gameState.boat.clears = (gameState.boat.clears || 0) + 1;
  if (result === 'clear' && boat.hits === 0) gameState.boat.perfect = (gameState.boat.perfect || 0) + 1;   // 🌊 무피해 완주(배지 소급용)

  clearRiverObjects();
  if (boat.group) boat.group.visible = false;
  playerAnchor.visible = true;
  if (heldGroup) heldGroup.visible = true;                            // 도구를 다시 손에
  playerAnchor.position.y = 0; playerAnchor.rotation.set(0, 0, 0);    // 노 젓기·침몰 자세 해제
  if (riverGroup?.userData.moored) riverGroup.userData.moored.visible = true;    // 정박 배 복원
  player.position.set(RIVER.x, 0, RIVER.z + 1.2); player.rotation.y = Math.PI;   // 데크로 복귀
  snapCamera();
  ui.setBoatRun?.(false); ui.setBoatHud?.(null);

  if (stars > 0 || rareCount > 0) giveReward(give, 'boat_run', result);
  for (const id in boat.picks) dexDiscover('river', id);               // 📖 강 도감
  if (result === 'clear') awardBadge('ferryman');
  if (result === 'clear' && boat.hits === 0) awardBadge('river_master');
  syncBadges();
  if (result === 'clear') { Sound.complete(); spawnConfetti(player.position.x, 2.2, player.position.z); }
  else if (result === 'wreck') Sound.build();

  const payload = {
    result, run_no: boat.runNo, seed: boat.seed, night: boat.night, weather: WEATHER,
    dist_m: distM, time_sec: timeSec, score, best, hits: boat.hits, hit_points: boat.hitLog,
    picks: { ...boat.picks }, stars, lamps_left: boat.lamps, boost_used: boat.boostUsed,
    upgrades: { ...up },
  };
  trackEvent('boat_end', {                                             // [GA4] 완주율·이탈 지점 KPI
    result, run_no: boat.runNo, dist_m: distM, time_sec: timeSec, score, hits: boat.hits,
    stars, rare: rareCount, boost_used: boat.boostUsed, night: boat.night, weather: WEATHER, best,
  });
  sendBoatRun(payload);                                                // [분석] 런 단위 1행(boat_runs)
  ui.showBoatResult?.({
    ...payload, rare: rareCount, runsLeft: boatRunsLeft(), runsMax: BOAT_RUNS_PER_DAY,
    picksView: Object.entries(boat.picks).map(([id, n]) => {
      const k = RIVER_PICKS.find(x => x.id === id); return { ico: k?.ico || '❔', name: k?.name || id, n };
    }),
    totalStar: gameState.inventory.star || 0,
  });
}

// ── 런 물리 — updatePlayer 대신 매 프레임 호출 ───────────────
function updateBoatRun(dt, t) {
  boat.t += dt;
  // 🌊 침몰 연출: 마지막 충돌 지점에서 배가 기울며 천천히 가라앉는다 — 다 잠기면 결과 화면
  if (boat.wreckAt) {
    if (boat.t >= boat.wreckAt) { endBoatRun('wreck'); return; }
    const k = 1 - Math.max(0, (boat.wreckAt - boat.t) / 1.9);        // 침몰 진행도 0→1
    boat.speed = 0; boat.vx = 0;                                     // 그 자리에서
    if (boat.group) {
      boat.group.position.set(player.position.x, -k * k * 0.9, player.position.z);
      boat.group.rotation.x = k * 0.55;                              // 뱃머리부터 물속으로
      boat.group.rotation.z = Math.sin(boat.t * 7) * 0.12 * (1 - k); // 잦아드는 흔들림
      boat.group.children.forEach(c => { if (c.userData.side) c.rotation.x = 0.85; }); // 노를 놓침
    }
    playerAnchor.position.y = -k * k * 0.75;                         // 캐릭터도 배와 함께 잠긴다(3인칭)
    playerAnchor.rotation.x = k * 0.4;
    if (Math.random() < (IS_MOBILE ? 0.2 : 0.4))                     // 보글보글 물거품
      spawnSparkle(player.position.x + (Math.random() - 0.5) * 1.4, 0.15, player.position.z - 1 + Math.random() * 2, 4);
    return;                                                          // 침몰 중엔 조향·충돌·HUD 갱신 없음
  }
  const p = Math.min(1, boat.dist / RIVER_LEN);
  const seg = p < 0.34 ? 1 : p < 0.67 ? 2 : 3;
  // 💥 충돌 직후: 배가 그 자리에 멈춰 출렁이는 중 / 🚣 출렁임이 끝나면 노를 빠르게 저으며 재출발
  const stunned = boat.t < boat.stunUntil;
  const restarting = !stunned && boat.stunUntil > 0 && boat.t < boat.stunUntil + 0.9;
  // 속도: 구간이 갈수록 빨라지고, 🌧️비 오는 날은 물살이 세다
  const boosting = boat.t < boat.boostUntil;
  let sp = BOAT_BASE_SPEED * (1 + p * 0.55) * (RAIN_DAY ? 1.12 : 1);
  if (boosting) sp *= 1.5;
  if (stunned) sp = 0;                               // 충돌: 완전히 멈춘다(통과 금지)
  boat.speed += (sp - boat.speed) * Math.min(1, dt * (stunned ? 12 : 4));   // 충돌 시 급정거, 재출발은 원래 가속
  boat.dist += boat.speed * dt;

  // 조향 — 키보드(A/D·←/→) 또는 조이스틱 x. 🚣노 업그레이드로 반응이 빨라짐
  //        충돌 출렁임 중엔 잠금(부딪혀 밀려나는 vx 만 자연 감쇠)
  const oar = gameState.boat.up.oar || 0;
  let steer = 0;
  if (!stunned) {
    if (keys['ArrowLeft'] || keys['KeyA']) steer -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) steer += 1;
    if (Math.abs(analog.x) > 0.12) steer += analog.x;
    steer = Math.max(-1, Math.min(1, steer));
  }
  const acc = 26 + oar * 7, maxVx = 6.2 + oar * 1.4;
  boat.vx += steer * acc * dt;
  boat.vx *= Math.pow(stunned ? 0.35 : 0.06, dt);    // 감쇠 — 충돌 밀려남은 천천히(옆으로 미끄러지는 맛)
  boat.vx = Math.max(-maxVx, Math.min(maxVx, boat.vx));
  player.position.x += boat.vx * dt;
  player.position.z = RIVER.z - RIVER_DOCK_HALF - 2 - boat.dist;
  // 강폭 밖으로는 못 나감(둑에 닿으면 튕겨 나옴)
  const lim = RIVER_W - 0.7;
  if (player.position.x < RIVER.x - lim) { player.position.x = RIVER.x - lim; boat.vx = Math.abs(boat.vx) * 0.3; }
  if (player.position.x > RIVER.x + lim) { player.position.x = RIVER.x + lim; boat.vx = -Math.abs(boat.vx) * 0.3; }

  // 🚣 노 젓기(스퍼트) — 액션 버튼/Space. 쿨다운이 있어 남발 못 함
  //    충돌 출렁임 중엔 무시(버퍼된 입력이 재출발 순간 터지지 않게 소비만 함)
  if (wantAction) {
    wantAction = false;
    if (!stunned && boat.t >= boat.boostReadyAt) {
      boat.boostUntil = boat.t + 1.5; boat.boostReadyAt = boat.t + BOAT_BOOST_CD; boat.boostUsed++;
      Sound.water(); spawnSparkle(player.position.x, 0.6, player.position.z + 1.5, 10);
    }
  }

  updateRiverObjects(dt, t, seg);
  if (!boat.active) return;                          // 위에서 난파 처리됐으면 종료

  // 배 메시 — 위치·기울기(조향 방향으로 롤) + 노 젓기 모션
  if (boat.group) {
    boat.group.position.set(player.position.x, 0, player.position.z);
    boat.group.rotation.y = (-boat.vx / maxVx) * 0.16;   // 뱃머리는 모델 로컬 -z = 진행 방향
    boat.group.rotation.z = (boat.vx / maxVx) * 0.13;
    boat.group.position.y = Math.sin(boat.t * 3.2) * 0.05;
    if (stunned) {
      // 💥 충돌 연출: 크게 출렁이며 앞뒤로 갸우뚱 — 시간이 지나며 잦아듦. 노는 놀라서 들어올림
      const k = Math.max(0, (boat.stunUntil - boat.t) / 1.15);
      boat.group.rotation.z += Math.sin(boat.t * 16) * 0.15 * k;
      boat.group.rotation.x = Math.sin(boat.t * 12) * 0.1 * k;
      boat.group.position.y += Math.sin(boat.t * 9) * 0.06 * k;
      boat.group.children.forEach(c => { if (c.userData.side) c.rotation.x = 0.7 * k; });
      // 캐릭터도 배와 함께 휘청(3인칭)
      playerAnchor.position.y = boat.group.position.y;
      playerAnchor.rotation.x = 0.1;
      playerAnchor.rotation.z = Math.sin(boat.t * 16) * 0.18 * k;
    } else {
      boat.group.rotation.x = 0;
      // 🚣 재출발·스퍼트 중엔 노를 빠르고 깊게 젓는다 — "다시 출발!" 이 눈에 보이게
      const fast = boosting || restarting;
      const stroke = Math.sin(boat.t * (fast ? 11 : 5.5));
      boat.group.children.forEach(c => { if (c.userData.side) c.rotation.x = stroke * (fast ? 0.55 : 0.32); });
      // 🚣 캐릭터도 노와 같은 위상으로 상체를 앞뒤로 — 젓는 사람이 보이게(3인칭)
      playerAnchor.position.y = boat.group.position.y + Math.abs(stroke) * 0.05;   // 배 출렁임 + 젓는 들썩임
      playerAnchor.rotation.x = 0.12 + stroke * (fast ? 0.24 : 0.14);              // 앞으로 숙였다 젖혔다
      playerAnchor.rotation.z = (boat.vx / maxVx) * 0.13;                          // 배 롤을 따라 기울기
    }
  }
  if (boat.shake > 0) boat.shake = Math.max(0, boat.shake - dt * 2.4);

  // 물보라(뱃머리) — 가끔씩만 뿌려 부담 최소화(📱 모바일은 더 드물게). 재출발 땐 노 뒤로 물살
  const sprayP = stunned ? 0 : IS_MOBILE ? ((boosting || restarting) ? 0.25 : 0.08) : ((boosting || restarting) ? 0.5 : 0.2);
  if (Math.random() < sprayP) spawnSparkle(player.position.x, 0.35, player.position.z - 2, 3);

  ui.setBoatHud?.({
    p, seg, dist: Math.round(boat.dist), total: RIVER_LEN,
    lamps: boat.lamps, lampMax: boatLampMax(), stars: boat.stars,
    boost: boosting ? 1 : Math.min(1, 1 - (boat.boostReadyAt - boat.t) / BOAT_BOOST_CD),
    boosting, speed: Math.round(boat.speed * 3.6),
  });

  if (boat.dist >= RIVER_LEN) endBoatRun('clear');
}

// 코스 오브젝트 등장/퇴장 + 충돌·획득 판정
function updateRiverObjects(dt, t, seg) {
  // 앞쪽 일정 거리 안에 들어온 것부터 스폰(📱 모바일은 더 가까이서 — 동시 오브젝트 수↓)
  const spawnAhead = IS_MOBILE ? 52 : 70;
  while (boat.next < riverCourse.length && riverCourse[boat.next].d - boat.dist < spawnAhead) {
    const item = riverCourse[boat.next++];
    const mesh = acquireRiverMesh(item);
    const y = item.kind === 'whirl' ? 0.12 : item.kind === 'star' || item.kind === 'pick' ? 0.85 : item.kind === 'pile' ? 1.3 : 0.35;
    mesh.position.set(item.x, y, -RIVER_DOCK_HALF - 2 - item.d);
    riverActive.push({ mesh, item, x: item.x, taken: false, prevRel: Infinity });
  }
  const bx = player.position.x - RIVER.x;
  for (let i = riverActive.length - 1; i >= 0; i--) {
    const a = riverActive[i], it = a.item;
    const rel = it.d - boat.dist;                    // 배 기준 남은 거리(+앞 / -뒤)
    // 프레임이 길면(저사양·탭 복귀) 한 프레임에 오브젝트를 건너뛸 수 있다 →
    // "직전 프레임엔 앞에 있었는데 지금은 뒤"면 스쳐 지나간 것으로 보고 판정(터널링 방지)
    const passed = a.prevRel > 0 && rel <= 0;
    a.prevRel = rel;
    if (rel < -10) { releaseRiverMesh(a); riverActive.splice(i, 1); continue; }
    // 🪵 통나무는 좌우로 천천히 흐르고, 🌀 소용돌이는 빙글 돈다
    if (it.drift) {
      a.x = clampW(a.x + it.drift * dt, RIVER_OBS.log.r);
      a.mesh.position.x = a.x;
    }
    if (it.kind === 'whirl') a.mesh.rotation.z += dt * 2.2;
    if (it.kind === 'star' || it.kind === 'pick') { a.mesh.rotation.y += dt * 2.6; a.mesh.position.y = 0.85 + Math.sin(t * 3 + it.d) * 0.12; }
    if (a.taken) continue;
    const dx = Math.abs(a.x - bx);
    if (it.kind === 'star' || it.kind === 'pick') {              // 획득
      if ((Math.abs(rel) < 1.4 || passed) && dx < 1.5) {
        a.taken = true; a.mesh.visible = false;
        if (it.kind === 'star') { boat.stars++; Sound.blip(); }
        else {
          boat.picks[it.pick] = (boat.picks[it.pick] || 0) + 1;
          const k = RIVER_PICKS.find(x => x.id === it.pick);
          // 배 앞쪽에 작게 — 배 위치(=1인칭 카메라 앞)에 띄우면 세로 화면에서 시야각을 넘쳐 잘림
          Sound.harvest(); spawnFloatText(player.position.x, 1.9, player.position.z - 10, `${k?.ico || ''} ${k?.name || ''}`, '#2fa564', 0.8);
          trackEvent('boat_pickup', { item: it.pick, dist_m: Math.round(boat.dist), seg });   // [GA4] 희귀 획득 분포
        }
        spawnSparkle(player.position.x, 1, player.position.z, 8);
      }
      continue;
    }
    const meta = RIVER_OBS[it.kind];
    if (it.kind === 'whirl') {                                   // 🌀 끌어당기기(피해 없음)
      if (Math.abs(rel) < meta.r && dx < meta.r + 1) boat.vx += (a.x - bx) * dt * 5.5;
      continue;
    }
    if ((Math.abs(rel) < 1.0 || passed) && dx < meta.r + 0.7) {  // 💥 충돌
      a.taken = true;
      if (boat.t < boat.invUntil) continue;                      // 무적 시간(연속 피격 방지)
      boat.lamps--; boat.hits++;
      boat.hitLog.push({ d: Math.round(boat.dist), kind: it.kind, seg });   // [분석] 어디서 부딪혔나
      // 💥 충돌 연출: 그냥 통과하지 않는다 — 장애물 앞으로 튕겨나 급정거,
      //    부딪힌 쪽 반대로 미끄러지며 출렁 → 잦아들면 노를 저어 다시 출발(updateBoatRun)
      boat.stunUntil = boat.t + 1.15;
      boat.invUntil = boat.stunUntil + 1.0;      // 재출발 직후 같은 장애물 스침은 봐줌
      boat.speed = 0;
      boat.dist = Math.max(0, boat.dist - 1.6);  // 뒤로 튕겨 장애물 앞에 멈춤
      boat.vx = (Math.sign(bx - a.x) || (Math.random() < 0.5 ? -1 : 1)) * 5;   // 옆으로 밀려나 비켜남
      boat.shake = 1.3;
      Sound.build();
      spawnDust(player.position.x, player.position.z, 10);
      spawnSparkle(player.position.x, 0.5, player.position.z - 1.5, 14);       // 물보라 팍!
      // 배 앞쪽에 작게 — 세로 화면(모바일)의 좁은 가로 시야각 안에 들어오게
      spawnFloatText(player.position.x, 1.9, player.position.z - 10, boat.lamps > 0 ? `💥 -1 (💡${boat.lamps})` : '💥 배가 가라앉아요…', '#d9534f', 0.8);
      trackEvent('boat_hit', { obstacle: it.kind, dist_m: Math.round(boat.dist), seg, lamps_left: boat.lamps }); // [GA4] 난이도 튜닝
      if (boat.lamps <= 0) {                       // 🌊 마지막 충돌: 충돌 지점에서 배가 기울며 가라앉는 연출 → 결과 화면
        boat.wreckAt = boat.t + 1.9;
        Sound.water();
        return;
      }
    }
  }
}

// ── 1인칭 카메라 — 뱃머리 시점(멀미 대비: 흔들림 최소, 3인칭 토글 가능) ──
function updateBoatCamera(dt) {
  const shake = boat.shake * 0.18;
  if (boatView === 'third') {
    _camTarget.set(player.position.x * 0.6, 5.2, player.position.z + 9);
    camera.position.lerp(_camTarget, 1 - Math.pow(0.008, dt));
    camera.lookAt(player.position.x, 0.9, player.position.z - 6);
    return;
  }
  // 노 젓는 자리(뱃전 안쪽)에서 뱃머리 너머를 본다 — 배 안쪽 구조물이 시야를 막지 않는 위치
  const bob = Math.sin(boat.t * 3.2) * 0.045;
  _camTarget.set(player.position.x + (Math.random() - 0.5) * shake, 1.5 + bob, player.position.z + 0.55);
  camera.position.lerp(_camTarget, 1 - Math.pow(0.0001, dt));   // 배 위치를 거의 즉시 따라감
  _camLook.lerp(_camTarget.set(player.position.x + boat.vx * 0.35, 1.05, player.position.z - 14), 1 - Math.pow(0.02, dt));
  camera.lookAt(_camLook);
}

// ── 나루터 데크 위 근접 판정(배 타기 / 창고) — updateDoorInteract 에서 호출 ──
function updateRiverInteract() {
  nearBoat = false; nearBoatShop = false;
  const lx = player.position.x - RIVER.x, lz = player.position.z - RIVER.z;
  if (Math.hypot(lx, lz + RIVER_DOCK_HALF + 1.4) < 2.6) {
    nearBoat = true;
    const left = boatRunsLeft();
    return left > 0 ? `🛶 나룻배 타기 (오늘 ${left}/${BOAT_RUNS_PER_DAY}회 남음)` : '🛶 오늘은 다 탔어요 — 내일 새 물길이 열려요';
  }
  if (Math.hypot(lx + RIVER_DOCK_HALF - 2, lz - 1.6) < 2.6) {
    nearBoatShop = true;
    return `🧰 뱃사공의 창고 (⭐${gameState.inventory.star || 0})`;
  }
  return null;
}

// =============================================================
//  🌫️ 안개 낀 숲 — 그림자 정령을 등불·♪음악으로 달래는 무폭력 웨이브
//  ------------------------------------------------------------
//  ▶ 마을 북서 게이트(처음부터 있음) → 별도 인스턴스. 숲 안은 항상 어둑+짙은 안개.
//  ▶ 하루 1회 정화(데일리): 웨이브 3회를 버티면 그날은 안개가 걷힌 밝은 숲.
//  ▶ 실패는 부드럽게 — 수호목 빛이 다 꺼지면 정령이 흩어질 뿐, 주운 ✨는 유지되고
//    켜둔 등불도 그날 내내 남아 재도전이 점점 쉬워진다(뱃놀이 문법).
// =============================================================

// ── 마을 북서 게이트 — 고목 두 그루가 만드는 어두운 입구 ──
// 부드러운 방사형 안개 텍스처(캔버스 그라데이션) — 딱딱한 판 대신 가장자리가 스르르 사라지는 퍼프
let _mistPuffTex = null;
function mistPuffTexture() {
  if (_mistPuffTex) return _mistPuffTex;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
  const c = cv.getContext('2d');
  const grad = c.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(235,240,250,0.4)');
  grad.addColorStop(1, 'rgba(230,236,248,0)');
  c.fillStyle = grad; c.fillRect(0, 0, 128, 128);
  _mistPuffTex = new THREE.CanvasTexture(cv);
  return _mistPuffTex;
}
function mistPuffSprite(scale, opacity) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: mistPuffTexture(), transparent: true, opacity, depthWrite: false, color: 0xdfe7f4,
  }));
  sp.scale.set(scale, scale * 0.62, 1);
  return sp;
}

function buildMistGate() {
  const g = new THREE.Group(); g.position.copy(MIST_GATE);
  const bark = clayMat(0x6b6178);                      // 라벤더빛 고목(검정 덩어리 대신 낮에도 읽히는 톤)
  // 안쪽으로 기울어 맞닿는 고목 두 그루 + 늘어진 상인방 가지
  for (const side of [-1, 1]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 3.8, 6), bark);
    trunk.position.set(side * 1.55, 1.8, 0); trunk.rotation.z = -side * 0.3; trunk.castShadow = true; g.add(trunk);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.1, 5), bark);   // 옆가지
    branch.position.set(side * 1.1, 2.6, 0.1); branch.rotation.z = -side * 1.15; g.add(branch);
    // 잎 뭉치 — 라벤더·청회·물빛 섞어 몽환적으로(작게 여러 개, 큰 검은 덩어리 금지)
    [[side * 0.75, 3.6, 0, 0.62, 0x9b93b8], [side * 1.35, 3.15, 0.25, 0.46, 0x847fa3], [side * 0.35, 3.95, -0.15, 0.4, 0x7fa3a8]]
      .forEach(([x, y, z, r, col]) => {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), clayMat(col, false));
        leaf.position.set(x, y, z); g.add(leaf);
      });
  }
  const lintel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), bark);       // 살짝 처진 상인방
  lintel.position.set(0, 3.32, 0); lintel.rotation.z = Math.PI / 2; lintel.rotation.x = 0.06; g.add(lintel);
  // 늘어진 덩굴 + 🏮 청록 등불 두 개(항상 은은히 — 신비로운 입구의 시그니처)
  for (const [vx, vlen] of [[-0.85, 0.75], [0.85, 0.55], [0.2, 0.4]]) {
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, vlen, 4), clayMat(0x76889b));
    vine.position.set(vx, 3.3 - vlen / 2, 0.05); g.add(vine);
  }
  for (const lx of [-0.85, 0.85]) {
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0),
      new THREE.MeshStandardMaterial({ color: 0xbef3ea, emissive: 0x5fe8d0, emissiveIntensity: 0.55, roughness: 0.5 }));
    orb.position.set(lx, 3.3 - (lx < 0 ? 0.82 : 0.62), 0.05); g.add(orb);
  }
  // 발치: 디딤돌 길 + 발광 버섯 — "들어가 보고 싶은" 입구의 디테일
  [[0.15, 1.1], [-0.2, 2.0], [0.1, 2.9]].forEach(([sx, sz]) => {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.09, 7), clayMat(0x9aa1ad, false));
    st.position.set(sx, 0.05, sz); st.receiveShadow = true; g.add(st);
  });
  for (const [mx, mz, mr] of [[-1.15, 0.7, 0.09], [1.25, 0.45, 0.07], [1.05, 0.75, 0.055]]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(mr * 0.45, mr * 0.6, mr * 2.4, 5), clayMat(0xdde2e8, false));
    stem.position.set(mx, mr * 1.2, mz); g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(mr, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x8fd8cc, emissive: 0x4fc8b4, emissiveIntensity: 0.45, roughness: 0.6 }));
    cap.position.set(mx, mr * 2.3, mz); g.add(cap);
  }
  // 안개 — 딱딱한 판 대신 소프트 퍼프 여러 겹(아치 안쪽으로 깊어질수록 짙게)
  [[0, 1.5, -0.4, 3.6, 0.30], [0.7, 0.9, -1.3, 2.8, 0.34], [-0.6, 1.1, -2.2, 3.2, 0.4], [0, 0.45, 0.6, 2.6, 0.22]]
    .forEach(([px, py, pz, sc, op]) => { const p = mistPuffSprite(sc, op); p.position.set(px, py, pz); g.add(p); });
  g.add(makeSignpost('🌫️ 안개 낀 숲', 1.9, 1.6));      // 표지판은 아치 옆으로(입구 시야 확보)
  g.rotation.y = Math.PI / 4;                          // 마을 중심(남동)을 바라보게
  scene.add(g);
  obstacles.push({ x: MIST_GATE.x, z: MIST_GATE.z, r: 2.6 });
  [-1, 1].forEach(side => solidCircle(MIST_GATE.x + side * 1.1, MIST_GATE.z - side * 1.1, 0.35));   // 고목 기둥(아치 회전 반영)
}

// ── 숲 인스턴스 — 어두운 빈터 + 중앙 수호목 + 둘레 등불 6개 ──
function buildMistSpace() {
  const g = new THREE.Group(); g.position.copy(MIST);
  const H = MIST_HALF;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(H + 1.5, 40), clayMat(0x3e4452, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.position.y = 0.02; floor.receiveShadow = true; g.add(floor);
  // 둘레의 뒤틀린 고목 울타리(경계 연출)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.15;
    if (Math.abs(a - Math.PI / 2) < 0.35) continue;    // 남쪽 출구는 비움
    const r = H + 1.6 + ((i * 7) % 3) * 0.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3 + (i % 3), 5), clayMat(0x443f52));
    trunk.position.set(Math.cos(a) * r, 1.6, Math.sin(a) * r); trunk.rotation.z = Math.sin(i * 3) * 0.2; g.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0 + (i % 2) * 0.4, 0), clayMat(0x4e4a66, false));
    crown.position.set(Math.cos(a) * r, 3.4 + (i % 3) * 0.5, Math.sin(a) * r); g.add(crown);
  }
  // 🌳 수호목 — 중앙 북쪽. 빛 게이지에 따라 잎이 밝아지고 어두워진다
  const tg = new THREE.Group(); tg.position.set(0, 0, -3);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3.6, 7), woodMat(1, 2, 0x8a7a5f));
  trunk.position.y = 1.8; trunk.castShadow = true; tg.add(trunk);
  const mats = [];
  [[0, 4.4, 0, 1.7], [-1.2, 3.6, 0.4, 1.1], [1.1, 3.7, -0.4, 1.2]].forEach(([x, y, z, r]) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x8fe8d8, emissive: 0x4fd8b8, emissiveIntensity: 0.9, roughness: 0.6 });
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m);
    leaf.position.set(x, y, z); tg.add(leaf); mats.push(m);
  });
  const tlight = new THREE.PointLight(0x7fe8cf, 2.2, 26, 1.1); tlight.position.set(0, 4.2, 0); tg.add(tlight);
  g.add(tg);
  mistTree = { group: tg, mats, light: tlight };
  // 🏮 둘레 등불 — 꺼진 채 시작, 액션으로 점화(그날 내내 유지)
  mistLanterns.length = 0;
  for (const [lx, lz] of MIST_LANTERN_POS) {
    const lg = new THREE.Group(); lg.position.set(lx, 0, lz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.6, 6), clayMat(0x4a4a54));
    pole.position.y = 0.8; lg.add(pole);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x777f8c, emissive: 0x9fe8ff, emissiveIntensity: 0, roughness: 0.55 });
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), headMat); head.position.y = 1.78; lg.add(head);
    const ll = new THREE.PointLight(0x9fe8ff, 0, 9, 1.3); ll.position.y = 1.9; lg.add(ll);
    g.add(lg);
    mistLanterns.push({ x: lx, z: lz, headMat, light: ll, lit: false });
  }
  g.add(makeSignpost('🚪 마을로', 0, H - 0.8));
  scene.add(g); mistGroup = g; g.visible = false;
  solidCircle(MIST.x, MIST.z - 3, 1.0);                // 🚧 수호목 줄기(잎 상호작용 반경 확보)
  mistLanterns.forEach(l => solidCircle(MIST.x + l.x, MIST.z + l.z, 0.24));
}

// ── 하루 판정 + 상태 반영 ───────────────────────────────────
function mistDaily() {
  const st = gameState.mist;
  if (st.date !== todayStr()) {                        // 자정 지나면 새 안개
    st.date = todayStr(); st.purified = false;
    mistLanterns.forEach(l => { l.lit = false; });
    mist.treeLight = TREE_LIGHT_MAX;
  }
  return st;
}
// 수호목·등불 시각 상태를 게이지에 맞춤(입장·매 프레임 양쪽에서 호출해도 안전)
function applyMistVisuals() {
  const ratio = gameState.mist.purified ? 1 : Math.max(0, mist.treeLight / TREE_LIGHT_MAX);
  if (mistTree) {
    mistTree.mats.forEach(m => { m.emissiveIntensity = 0.15 + ratio * 1.0; });
    mistTree.light.intensity = 0.4 + ratio * 2.4;
  }
  mistLanterns.forEach(l => {
    l.headMat.emissiveIntensity = l.lit ? 1.3 : 0;
    l.light.intensity = l.lit ? 1.5 : 0;
  });
}

// ── 입장 / 퇴장 ────────────────────────────────────────────
function enterMist() {
  atMist = true;
  const st = mistDaily();
  player.position.set(MIST.x, 0, MIST.z + MIST_HALF - 1.6); player.rotation.y = Math.PI;
  nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); lastZoneHint = null;
  snapCamera(); setSpaceVisible(); applyMistVisuals();
  if (st.purified) {
    ui.toast?.('🌤️ 오늘의 숲은 맑아요 — 정령들이 고마워하고 있어요. 내일 다시 안개가 차요');
  } else {
    firstHint('mistWood', '🌫️', '안개 낀 숲',
      '빛을 잃어가는 🌳수호목에 그림자 정령들이 모여들어요. 수호목 앞에서 정화를 시작하면 정령이 다가와요 — 🏮등불을 켜면 근처 정령이 느려지고, 정령 곁에서 액션을 누르면 ♪리듬에 맞춰 달랠 수 있어요(♪가 가장 작아질 때 탭!). 웨이브 3번을 버티면 오늘의 숲이 맑아져요.');
  }
  Sound.blip(); setBGMTheme?.('cave');                 // 어둑한 숲 무드(동굴 테마 재사용)
  trackEvent('mist_enter', { purified: st.purified, weather: WEATHER });   // [GA4] 유입
}
function exitMist() {
  if (mist.active) mistEnd('quit');                    // 나가면 이번 시도는 종료(등불·✨는 유지)
  atMist = false;
  player.position.set(MIST_GATE.x + 1.6, 0, MIST_GATE.z + 1.6);
  nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip(); setBGMTheme?.('main');
  trackEvent('mist_exit');                             // [GA4]
}

// ── 정화 시작 / 웨이브 ──────────────────────────────────────
function startPurify() {
  const st = mistDaily();
  if (st.purified) { ui.toast?.('오늘은 이미 숲이 맑아요 — 내일 새 안개가 차면 다시 와요'); return; }
  Object.assign(mist, { active: true, wave: 0, treeLight: TREE_LIGHT_MAX, soothe: null, t: 0, warned: false });
  clearMistSpirits();
  spawnMistWave();
  Sound.water(); spawnSparkle(MIST.x, 3.5, MIST.z - 3, 20);
  trackEvent('mist_purify_start', { weather: WEATHER, lit: mistLanterns.filter(l => l.lit).length });   // [GA4]
}
function spawnMistWave() {
  mist.wave += 1;
  let count = MIST_WAVES[mist.wave - 1] + (WEATHER === 'fog' ? 1 : 0);
  const kinds = SPIRITS.filter(s => !s.fog);
  for (let i = 0; i < count; i++) {
    // 🌟 황금 정령: 안개 낀 날 마지막 웨이브에 1마리(도감 재방문 훅)
    const def = (WEATHER === 'fog' && mist.wave === MIST_WAVES.length && i === 0)
      ? SPIRITS.find(s => s.id === 'golden')
      : kinds[Math.floor(Math.random() * kinds.length)];
    const a = Math.PI * 2 * (i / count) + Math.random() * 0.8;
    const r = MIST_HALF - 0.8;
    mist.spirits.push(makeSpirit(def, Math.cos(a) * r, Math.sin(a) * r));
  }
  ui.toast?.(`🌫️ 웨이브 ${mist.wave}/${MIST_WAVES.length} — 정령 ${count}마리가 다가와요`, 2400);
  trackEvent('mist_wave', { n: mist.wave, count });     // [GA4] 웨이브 진행
}
function makeSpirit(def, lx, lz) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(def.size, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x241f33, transparent: true, opacity: 0.9, emissive: def.color, emissiveIntensity: 0.4, roughness: 0.7 }));
  body.position.y = 0.9; g.add(body);
  for (const ex of [-0.1, 0.1]) {                       // 무섭지 않게 — 동그란 눈
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff6e8 }));
    eye.position.set(ex, 0.98, def.size * 0.82); g.add(eye);
  }
  g.position.set(lx, 0, lz);
  mistGroup.add(g);
  return { group: g, body, def, phase: Math.random() * 6, gone: 0, atTree: false };
}
function clearMistSpirits() {
  if (mist.soothe) mistGroup.remove(mist.soothe.note);   // ♪ 진행 중이던 리듬 표식도 정리
  mist.spirits.forEach(s => mistGroup.remove(s.group));
  mist.spirits.length = 0;
  mist.soothe = null;
}

// ── 정화 종료 — purified(성공) / faded(빛 소진) / quit(중도 퇴장) ──
function mistEnd(result) {
  mist.active = false;
  const st = gameState.mist;
  if (result === 'purified') {
    st.purified = true; st.purifyTotal = (st.purifyTotal || 0) + 1;
    giveReward({ glow: PURIFY_GLOW }, 'mist_purify', 'day');
    Sound.complete();
    spawnConfetti(MIST.x, 4, MIST.z - 3); spawnSparkle(MIST.x, 3, MIST.z - 3, 40);
    ui.showHintModal?.({ ico: '🌤️', title: '숲이 맑아졌어요!', body: `정령들이 하늘로 돌아가고 안개가 걷혔어요. 보너스 ✨${PURIFY_GLOW} — 모은 정령빛은 상점 야외 장식 ‘✨정령 등불’에 쓸 수 있어요. 내일 다시 안개가 차면 정령들이 돌아와요.` });
    awardBadge('purifier'); syncBadges();
  } else if (result === 'faded') {
    ui.toast?.('🌫️ 수호목이 오늘은 지쳤어요… 켜둔 등불은 남아있으니 한숨 돌리고 다시 도전해요', 3600);
    Sound.build();
  }
  clearMistSpirits();
  mist.treeLight = TREE_LIGHT_MAX;                     // 다음 시도를 위해 회복(등불은 유지 — 재도전이 쉬워짐)
  applyMistVisuals();
  ui.setZoneHint?.(null); lastZoneHint = null;
  trackEvent('mist_end', {                              // [GA4] 정화 퍼널
    result, wave: mist.wave, soothed_total: st.soothedTotal, lit: mistLanterns.filter(l => l.lit).length, weather: WEATHER,
  });
}

// ── 매 프레임 갱신 — animate(play) 에서 호출 ─────────────────
let mistHintT = 0;
function updateMist(dt, t) {
  if (!atMist) return;
  // 정령 이동·수호목 빛 — 정화 진행 중에만
  if (mist.active) {
    mist.t += dt;
    let drain = 0;
    for (let i = mist.spirits.length - 1; i >= 0; i--) {
      const s = mist.spirits[i];
      const g = s.group;
      if (s.gone > 0) {                                 // ✨ 성불 연출: 밝아지며 떠올라 사라짐
        s.gone += dt;
        g.position.y += dt * 2.2;
        s.body.material.emissiveIntensity = 0.4 + s.gone * 3;
        s.body.material.opacity = Math.max(0, 0.9 - s.gone * 1.1);
        if (s.gone > 0.9) { mistGroup.remove(g); mist.spirits.splice(i, 1); }
        continue;
      }
      s.phase += dt;
      s.body.position.y = 0.9 + Math.sin(t * 2.2 + s.phase) * 0.08;   // 두둥실
      if (mist.soothe?.sp === s) continue;              // 달래는 중엔 멈춰서 귀 기울임
      const tx = 0 - g.position.x, tz = -3 - g.position.z;   // 목표 = 수호목(로컬 0,-3)
      const d = Math.hypot(tx, tz);
      if (d < 2.0) {                                    // 🌳 도착 — 빛을 갉아먹음
        s.atTree = true; drain += MIST_DRAIN;
        g.position.x += Math.sin(t * 3 + s.phase) * dt * 0.3;   // 나무 곁에서 서성임
        continue;
      }
      // 켜진 등불 근처에선 순해져서 느려짐
      let spd = s.def.speed;
      for (const l of mistLanterns) {
        if (l.lit && Math.hypot(l.x - g.position.x, l.z - g.position.z) < LANTERN_CALM_R) { spd *= 0.4; break; }
      }
      g.position.x += (tx / d) * spd * dt;
      g.position.z += (tz / d) * spd * dt;
    }
    if (drain > 0) {
      mist.treeLight = Math.max(0, mist.treeLight - drain * dt);
      if (!mist.warned && mist.treeLight < TREE_LIGHT_MAX * 0.3) {
        mist.warned = true;
        ui.toast?.('🌳 수호목의 빛이 흐려져요! 정령들을 서둘러 달래주세요', 2600);
      }
      if (mist.treeLight <= 0) { mistEnd('faded'); return; }
    }
    // ♪ 리듬 진행 — 링(♪)이 줄어들 때 탭. 놓쳐도 벌점 없음(루프), 엇박 탭만 실패
    const so = mist.soothe;
    if (so) {
      so.phase += dt / 0.95;
      if (so.phase >= 1) so.phase -= 1;
      const k = 1.7 - so.phase * 1.25;                  // 크게 시작해 작아지는 ♪
      so.note.scale.set(k * 0.62, k * 0.62, 1);
      so.note.material.opacity = 0.55 + so.phase * 0.45;
      so.note.position.set(so.sp.group.position.x, so.sp.body.position.y + 1.05, so.sp.group.position.z);
      // 자리를 뜨면 취소(정령이 다시 움직임)
      if (dist2D(player.position, { x: MIST.x + so.sp.group.position.x, z: MIST.z + so.sp.group.position.z }) > 3.2) cancelSoothe();
    }
    // 웨이브 클리어 → 다음 웨이브 / 정화 완료
    if (!mist.spirits.length) {
      if (mist.wave >= MIST_WAVES.length) { mistEnd('purified'); return; }
      spawnMistWave();
    }
    // 상태 안내(존 힌트) — 0.3초마다
    if (t - mistHintT > 0.3) {
      mistHintT = t;
      ui.setZoneHint?.(`🌳 ${Math.ceil(mist.treeLight)}% · 웨이브 ${mist.wave}/${MIST_WAVES.length} · 정령 ${mist.spirits.filter(s => !s.gone).length}`);
      lastZoneHint = 'mist';
    }
  }
  applyMistVisuals();
}

// ── ♪ 달래기 세션 ───────────────────────────────────────────
function startSoothe(sp) {
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
  const c = cv.getContext('2d');
  c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 7; c.strokeStyle = 'rgba(20,28,24,0.8)'; c.strokeText('♪', 48, 50);
  c.fillStyle = '#aef3e2'; c.fillText('♪', 48, 50);
  const note = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  mistGroup.add(note);
  mist.soothe = { sp, step: 0, phase: 0, note };
  Sound.blip();
}
function cancelSoothe(scared = false) {
  const so = mist.soothe; if (!so) return;
  mistGroup.remove(so.note);
  if (scared) {                                         // 엇박: 정령이 놀라 가장자리 쪽으로 물러남
    const g = so.sp.group;
    const d = Math.hypot(g.position.x, g.position.z) || 1;
    g.position.x = clampMist(g.position.x + (g.position.x / d) * 3);
    g.position.z = clampMist(g.position.z + (g.position.z / d) * 3);
    so.sp.atTree = false;
    spawnFloatText(MIST.x + g.position.x, 1.8, MIST.z + g.position.z, '💨 놀랐어요!', '#8a94a8', 0.9);
  }
  mist.soothe = null;
}
function clampMist(v) { return Math.max(-MIST_HALF + 1, Math.min(MIST_HALF - 1, v)); }
function sootheTap() {
  const so = mist.soothe; if (!so) return;
  if (so.phase >= 0.62 && so.phase <= 0.99) {           // 🎯 ♪가 작아진 순간
    so.step += 1; so.phase = 0;
    Sound.blip();
    spawnSparkle(MIST.x + so.sp.group.position.x, 1.6, MIST.z + so.sp.group.position.z, 6);
    if (so.step >= 3) {                                 // ✨ 성불!
      const sp = so.sp;
      mistGroup.remove(so.note); mist.soothe = null;
      sp.gone = 0.01;
      const gold = sp.def.id === 'golden';
      giveReward({ glow: gold ? SOOTHE_GLOW * 2 : SOOTHE_GLOW }, 'mist_soothe', sp.def.id);
      gameState.mist.soothedTotal = (gameState.mist.soothedTotal || 0) + 1;
      dexDiscover('spirit', sp.def.id);
      Sound.harvest(); triggerMoment();
      trackEvent('mist_soothe', { kind: sp.def.id, wave: mist.wave });   // [GA4] 달래기 성공 분포
      syncBadges();
    }
  } else {
    cancelSoothe(true);                                 // 엇박 — 부드러운 실패
    trackEvent('mist_soothe_miss', { wave: mist.wave });                 // [GA4] 리듬 난이도 튜닝
  }
}

// ── 숲 안 근접 프롬프트/액션 — updateDoorInteract / handleAction 에서 호출 ──
function updateMistInteract() {
  const lx = player.position.x - MIST.x, lz = player.position.z - MIST.z;
  if (mist.soothe) return '♪ 리듬에 맞춰 탭!';
  // 정령(달래기) — 도착해 나무를 갉는 정령을 우선
  let best = null, bd = 2.4;
  for (const s of mist.spirits) {
    if (s.gone) continue;
    const d = Math.hypot(s.group.position.x - lx, s.group.position.z - lz);
    if (d < bd - (s.atTree ? 0.6 : 0)) { bd = d; best = s; }
  }
  if (best) return `♪ ${best.def.name} 달래기`;
  for (const l of mistLanterns) {                       // 꺼진 등불
    if (!l.lit && Math.hypot(l.x - lx, l.z - lz) < 1.6) return '🏮 등불 켜기';
  }
  if (Math.hypot(lx, lz + 3) < 2.8) {                   // 수호목
    if (gameState.mist.purified) return '🌳 오늘은 숲이 맑아요';
    if (!mist.active) return '🌳 숲 정화 시작하기';
  }
  return null;
}
function mistAction() {
  const lx = player.position.x - MIST.x, lz = player.position.z - MIST.z;
  if (mist.soothe) { sootheTap(); return; }
  let best = null, bd = 2.4;
  for (const s of mist.spirits) {
    if (s.gone) continue;
    const d = Math.hypot(s.group.position.x - lx, s.group.position.z - lz);
    if (d < bd - (s.atTree ? 0.6 : 0)) { bd = d; best = s; }
  }
  if (best) { startSoothe(best); return; }
  for (const l of mistLanterns) {
    if (!l.lit && Math.hypot(l.x - lx, l.z - lz) < 1.6) {
      l.lit = true;
      doPlayerAction(MIST.x + l.x, MIST.z + l.z);
      Sound.harvest(); spawnSparkle(MIST.x + l.x, 1.9, MIST.z + l.z, 14);
      applyMistVisuals();
      trackEvent('mist_lantern', { lit: mistLanterns.filter(x => x.lit).length });   // [GA4]
      return;
    }
  }
  if (Math.hypot(lx, lz + 3) < 2.8 && !mist.active && !gameState.mist.purified) { startPurify(); return; }
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
  solidCircle(x, z, 0.8);           // 🚧 벤치 — 폭 1.4라 끝부분까지 막히게(통과 방지)
}
function makeLamp(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), clayMat(0x5a5148)); pole.position.y = 1.2; pole.castShadow = true; g.add(pole);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffca70, emissiveIntensity: 0, roughness: 0.6 });
  houseWindows.push(headMat);   // 밤에 창문과 함께 빛남
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), headMat); head.position.y = 2.5; g.add(head);
  scene.add(g);
  obstacles.push({ x, z, r: 0.8 }); // 가로등 밑엔 밭 금지
  solidCircle(x, z, 0.22);          // 🚧 기둥만(불빛 아래는 지나갈 수 있게)
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
  houseCollider = solidCircle(HOUSE_POS.x, HOUSE_POS.z, 2.2); // 🚧 집 벽 — 짓는 동안엔 꺼 두고 완성되면 켠다
  syncHouseCollider();
}

// 집 충돌 반경 — 단계별 실제 풋프린트(3×3 → 4.2 → 4.6 → 5.0)에 맞춰 커진다.
// 문 프롬프트 사거리는 이 값 +0.6 이라 어느 단계든 문 앞에 설 수 있다(PLAYER_R 0.42 감안).
function houseSolidR() {
  const s = gameState.houseStage;
  return s >= 6 ? 2.7 : s >= 5 ? 2.55 : s >= 4 ? 2.4 : 2.2;
}
// 짓는 동안(터·기초·벽)은 터를 자유롭게 오가고, 완성(지붕, 3단계+)되면 실제 크기만큼 막는다
function syncHouseCollider() {
  if (!houseCollider) return;
  houseCollider.off = gameState.houseStage < 3;
  houseCollider.r = houseSolidR();
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
  syncHouseCollider();                        // 🚧 완성되면 충돌 on + 증축 크기 반영(짓는 동안엔 통행 자유)
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
  const vise = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.22), clayMat(0x8b8b93)); vise.position.set(-0.35, 0.88, 0); vise.castShadow = true; g.add(vise); // 바이스(공구 느낌)
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.1), woodMat(1, 1)); hammer.position.set(0.4, 0.81, 0.12); hammer.rotation.y = 0.5; g.add(hammer); // 놓인 망치 자루
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.16), clayMat(0x6e6e76)); head.position.set(0.52, 0.83, 0.05); head.rotation.y = 0.5; g.add(head);
  g.add(makeSignpost('🔧 작업대', 1.2, 0.7));   // 팻말 — 요리는 옆 🍳 자유주방으로 분리됨
  scene.add(g);
  obstacles.push({ x: BENCH.x, z: BENCH.z, r: 1.4 }); // 작업대 위엔 밭 금지
  solidCircle(BENCH.x, BENCH.z, 1.0);                 // 🚧 (제작 상호작용 2.0 확보)
}

// ── 🍳 자유주방 — 요리 미니게임 작업장(작업대 동쪽 옆 노점형 주방) ──
function spawnKitchen() {
  const g = new THREE.Group(); g.position.copy(KITCHEN);
  // 조리대(카운터)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.8, 0.85), clayMat(0xf3e6d0)); counter.position.y = 0.4; counter.castShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.09, 1.0), woodMat(2, 1)); top.position.y = 0.85; top.castShadow = true; g.add(top);
  // 화덕 + 냄비(김이 나는 요리 느낌)
  const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.16, 10), clayMat(0x7a5a44)); stove.position.set(-0.45, 0.97, 0); g.add(stove);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.3, 12), clayMat(0x5a5148)); pot.position.set(-0.45, 1.18, 0); pot.castShadow = true; g.add(pot);
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12), clayMat(0xffb35e, false)); soup.position.set(-0.45, 1.33, 0); g.add(soup);
  // 도마 + 칼(썰기 리듬 게임의 상징)
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.38), woodMat(1, 1)); board.position.set(0.42, 0.92, 0.05); g.add(board);
  const knife = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.07), clayMat(0xc9ccd4, false)); knife.position.set(0.42, 0.96, -0.06); knife.rotation.y = 0.35; g.add(knife);
  // 차양(상점과 톤이 다른 민트 줄무늬 — 멀리서도 "주방"으로 구분)
  for (let i = 0; i < 4; i++) {
    const c = i % 2 ? 0x9fd8c0 : 0xfff6e6;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.8), clayMat(c, false));
    s.position.set(-0.75 + i * 0.5, 1.95, 0.15); s.rotation.x = -0.35; g.add(s);
  }
  for (const x of [-0.85, 0.85]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.05, 6), clayMat(0x6b4a34)); p.position.set(x, 1.02, -0.25); g.add(p); }
  g.add(makeSignpost('🍳 자유주방', 1.45, 0.75));  // 팻말
  scene.add(g);
  obstacles.push({ x: KITCHEN.x, z: KITCHEN.z, r: 1.5 });
  solidCircle(KITCHEN.x, KITCHEN.z, 1.1);           // 🚧 (요리 상호작용 2.2 확보)
}

// ── 🍳 자유주방 클로즈업 조리 무대 — 요리 미니게임 동안 카메라가 이 세트로 넘어간다 ──
//    (카페 홀처럼 마을과 떨어진 별도 공간. 도마·칼·냄비를 크게 보여주는 "요리 게임 화면")
const KSET = new THREE.Vector3(0, 0, 420);
let kset = null;      // 세트 소품 핸들
let mgView = null;    // { type: 'pot'|'chop' } — 활성이면 카메라가 조리대 클로즈업 고정

function emojiSprite(emoji, size = 0.5) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.font = '100px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(emoji, 64, 72);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(size, size, 1);
  return sp;
}

function buildKitchenSet() {
  if (kset) return;
  const g = new THREE.Group(); g.position.copy(KSET);
  // 배경 벽 + 선반(양념병) — 아늑한 주방 느낌
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), clayMat(0xf3e2c8, false)); wall.position.set(0, 2.2, -1.7); g.add(wall);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.5), woodMat(2, 1)); shelf.position.set(-0.4, 2.55, -1.45); g.add(shelf);
  [0xd98f6a, 0x9fd8c0, 0xe8c46a, 0xc9a8ff].forEach((col, i) => {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 8), clayMat(col, false));
    jar.position.set(-1.45 + i * 0.7, 2.72, -1.45); g.add(jar);
  });
  // 조리대(넓은 카운터가 화면 하단을 가득 채움)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(9, 1.0, 3.4), woodMat(3, 1)); counter.position.set(0, 0.5, 0); counter.receiveShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(9, 0.07, 3.5), clayMat(0xf7ecd8, false)); top.position.set(0, 1.03, 0); g.add(top);
  // 🔪 도마 + 칼 (썰기 무대)
  const boardGroup = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.15), woodMat(1, 1)); board.position.set(0, 1.10, 0.15); board.castShadow = true; boardGroup.add(board);
  const knife = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.025), new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.3, metalness: 0.6 }));
  blade.position.set(-0.27, -0.03, 0); knife.add(blade);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.028), new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.2, metalness: 0.7 }));
  edge.position.set(-0.27, -0.105, 0); knife.add(edge);   // 반짝이는 칼날 라인
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.055), clayMat(0x5a4632)); handle.position.set(0.1, 0.02, 0); knife.add(handle);
  knife.position.set(-0.28, 1.5, 0.55); knife.rotation.z = 0.42;   // 손잡이를 축으로 들려 있음
  boardGroup.add(knife);
  // ✂️ 썰기 지점 표시 — 노트가 이 흰 선에 올 때 탭
  const cutLine = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.75), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  cutLine.rotation.x = -Math.PI / 2; cutLine.position.set(-0.35, 1.155, 0.45); boardGroup.add(cutLine);
  g.add(boardGroup);
  // 🍲 화덕 + 냄비 (끓이기 무대)
  const potGroup = new THREE.Group();
  const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.16, 12), clayMat(0x6b5140)); stove.position.set(0, 1.12, 0.05); potGroup.add(stove);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.44, 0.46, 14), clayMat(0x54493f)); pot.position.set(0, 1.43, 0.05); pot.castShadow = true; potGroup.add(pot);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.16), clayMat(0x3f362e)); h.position.set(s * 0.56, 1.52, 0.05); potGroup.add(h); }
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 14), clayMat(0xf09a4b, false)); soup.position.set(0, 1.66, 0.05); potGroup.add(soup);
  const flames = [];
  for (let i = 0; i < 3; i++) { const f = emojiSprite('🔥', 0.3); f.position.set(-0.28 + i * 0.28, 1.16, 0.5); potGroup.add(f); flames.push(f); }
  const bubbles = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), clayMat(0xffe8c8, false));
    b.position.set((Math.random() - 0.5) * 0.6, 1.66, 0.05 + (Math.random() - 0.5) * 0.5);
    b.userData.ph = Math.random() * 2; potGroup.add(b); bubbles.push(b);
  }
  const steam = [];
  for (let i = 0; i < 2; i++) { const s = emojiSprite('♨️', 0.34); s.material.opacity = 0; s.position.set(-0.15 + i * 0.3, 1.9, 0.05); s.userData.ph = i * 1.3; potGroup.add(s); steam.push(s); }
  const ladle = new THREE.Group();
  const lHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), woodMat(1, 1)); lHandle.rotation.z = -0.5; lHandle.position.set(0.14, 0.3, 0); ladle.add(lHandle);
  const lBowl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), clayMat(0x8a7a68)); ladle.add(lBowl);
  ladle.position.set(0.42, 1.7, 0.05); potGroup.add(ladle);
  const foods = new THREE.Group(); foods.position.set(0, 1.7, 0.05); potGroup.add(foods);   // 국에 둥둥 뜨는 재료 스프라이트
  g.add(potGroup);
  // 조명 — 세트 전용 따뜻한 불빛(밤에도 아늑하게 보이게)
  const light = new THREE.PointLight(0xffe0b0, 1.15, 14); light.position.set(0.4, 3.4, 2.2); g.add(light);
  g.visible = false;
  scene.add(g);
  kset = { group: g, boardGroup, knife, potGroup, soup, flames, bubbles, steam, ladle, foods, light,
    notes: [], fx: [], knifeT: -1, ladleT: -1, flareT: -1, drop: null, dropT: -1 };
}

// 미니게임 무대 입장 — 종류별 소품 토글 + 카메라 클로즈업 고정
function mgSceneStart(type, icos = [], noteN = 0) {
  buildKitchenSet();
  kset.group.visible = true;
  kset.boardGroup.visible = type === 'chop';
  kset.potGroup.visible = type === 'pot';
  // 이전 판 소품 정리
  kset.notes.forEach(n => n.parent?.remove(n)); kset.notes = [];
  kset.fx.forEach(f => f.sp.parent?.remove(f.sp)); kset.fx = [];
  kset.foods.clear();
  kset.knifeT = -1; kset.ladleT = -1; kset.flareT = -1; kset.dropT = -1;
  if (kset.drop) { kset.drop.parent?.remove(kset.drop); kset.drop = null; }
  if (type === 'pot') {                                     // 국물 위 재료
    icos.slice(0, 3).forEach((ico, i) => {
      const sp = emojiSprite(ico, 0.3); sp.position.set(-0.18 + i * 0.18, 0.02, 0); sp.userData.ph = i * 1.7;
      kset.foods.add(sp);
    });
  } else {                                                  // 리듬 노트(도마 앞을 흘러감)
    for (let i = 0; i < noteN; i++) {
      const sp = emojiSprite(icos[i % Math.max(1, icos.length)] || '🥕', 0.44);
      sp.position.set(3.4, 1.24, 0.75); sp.visible = false;
      kset.group.add(sp); kset.notes.push(sp);
    }
  }
  mgView = { type };
  applyMgCamera();
}
function applyMgCamera() {
  camera.position.set(KSET.x + 0.15, KSET.y + 2.55, KSET.z + 3.55);
  camera.lookAt(KSET.x, KSET.y + 1.15, KSET.z - 0.3);
}
function mgSceneEnd() {
  if (kset) kset.group.visible = false;
  mgView = null;
  snapCamera();                                             // 마을 카메라 복귀
}

// 리듬 노트 위치 동기화 — ps[i] = { p: 진행도(0=출발 1=칼 아래), s: 0진행 1처리됨 2미스 }
const CHOP_X0 = 3.4, CHOP_X1 = -0.35;                       // 출발/타격 지점(로컬 x)
function mgChopFrame(ps) {
  if (!kset || !mgView) return;
  ps.forEach((st, i) => {
    const sp = kset.notes[i]; if (!sp) return;
    if (st.s === 1) { sp.visible = false; return; }         // 썰린 노트는 조각 연출로 대체
    sp.visible = st.p > 0;
    sp.position.x = CHOP_X0 + (CHOP_X1 - CHOP_X0) * st.p;
    if (st.s === 2) { sp.material.opacity = 0.28; sp.material.color?.set?.(0x777777); }
  });
}
// 칼질 명중 — 칼 내려찍기 + 재료 반쪽 두 개가 튀어오름 + 반짝이
function mgChopHit(i, judge) {
  if (!kset) return;
  kset.knifeT = 0;
  const sp = kset.notes[i];
  const px = sp ? sp.position.x : CHOP_X1;
  for (const dir of [-1, 1]) {
    const half = emojiSprite(sp?.material.map ? '' : '🥕', 0.34);
    if (sp) { half.material.map = sp.material.map; half.material.needsUpdate = true; }
    half.position.set(px, 1.24, 0.75);
    kset.group.add(half);
    kset.fx.push({ sp: half, vx: dir * (0.9 + Math.random() * 0.4), vy: 1.6 + Math.random() * 0.6, life: 0.55 });
  }
  spawnSparkle(KSET.x + px, KSET.y + 1.3, KSET.z + 0.75, judge === 'perfect' ? 14 : 7);
}
// 끓이기 탭 연출 — 단계별(재료 퐁당 / 국자 젓기 / 불길 활활)
function mgPotHit(step, judge, ico) {
  if (!kset) return;
  if (step === 0) {
    if (kset.drop) kset.drop.parent?.remove(kset.drop);
    kset.drop = emojiSprite(ico || '🥕', 0.34);
    kset.drop.position.set(0, 2.6, 0.05);
    kset.potGroup.add(kset.drop); kset.dropT = 0;
  } else if (step === 1) kset.ladleT = 0;
  else kset.flareT = 0.55;
  if (judge !== 'miss') spawnSparkle(KSET.x, KSET.y + 1.9, KSET.z + 0.4, judge === 'perfect' ? 14 : 7);
}

// 매 프레임 — 무대 연출(카메라 고정·거품·김·불·칼/국자 트윈·조각 물리)
function updateMgScene(dt, t) {
  if (!kset || !mgView) return;
  applyMgCamera();                                          // 다른 카메라 로직이 못 뺏게 매 프레임 고정
  // 김/거품/불/재료 — 냄비가 계속 "요리 중"으로 보이게
  for (const b of kset.bubbles) {
    b.position.y += dt * 0.35;
    if (b.position.y > 1.78) { b.position.y = 1.66; b.position.x = (Math.random() - 0.5) * 0.6; }
  }
  for (const s of kset.steam) {
    const ph = ((t * 0.55 + s.userData.ph) % 1.4) / 1.4;
    s.position.y = 1.85 + ph * 0.75;
    s.material.opacity = ph < 0.25 ? ph * 2.4 : (1 - ph) * 0.8;
  }
  kset.flames.forEach((f, i) => {
    const boost = kset.flareT > 0 ? 1.5 : 1;
    f.scale.y = 0.3 * boost * (1 + 0.18 * Math.sin(t * 13 + i * 2.1));
    f.scale.x = 0.3 * boost;
  });
  if (kset.flareT > 0) kset.flareT -= dt;
  kset.light.intensity = 1.15 + (kset.flareT > 0 ? 0.6 : 0) + 0.05 * Math.sin(t * 11);
  kset.foods.children.forEach((f, i) => { f.position.y = 0.02 + 0.02 * Math.sin(t * 2.4 + f.userData.ph); });
  // 🔪 칼 내려찍기 트윈(0~0.1 내려감 → 0.35 복귀)
  if (kset.knifeT >= 0) {
    kset.knifeT += dt;
    const k = kset.knifeT;
    kset.knife.rotation.z = k < 0.1 ? 0.42 - (k / 0.1) * 0.47 : k < 0.35 ? -0.05 + ((k - 0.1) / 0.25) * 0.47 : 0.42;
    if (k >= 0.35) kset.knifeT = -1;
  }
  // 🥄 국자 젓기(원 궤적)
  if (kset.ladleT >= 0) {
    kset.ladleT += dt;
    const a = (kset.ladleT / 0.7) * Math.PI * 2;
    kset.ladle.position.set(Math.cos(a) * 0.26, 1.7, 0.05 + Math.sin(a) * 0.26);
    if (kset.ladleT >= 0.7) { kset.ladleT = -1; kset.ladle.position.set(0.42, 1.7, 0.05); }
  }
  // 🧺 재료 퐁당(냄비 속으로 낙하 → 반짝)
  if (kset.dropT >= 0 && kset.drop) {
    kset.dropT += dt;
    kset.drop.position.y = 2.6 - (kset.dropT / 0.45) * 0.95;
    if (kset.dropT >= 0.45) {
      kset.drop.parent?.remove(kset.drop); kset.drop = null; kset.dropT = -1;
      spawnSparkle(KSET.x, KSET.y + 1.72, KSET.z + 0.3, 8);
    }
  }
  // 반쪽 조각 물리(포물선 + 페이드)
  for (let i = kset.fx.length - 1; i >= 0; i--) {
    const f = kset.fx[i];
    f.sp.position.x += f.vx * dt; f.sp.position.y += f.vy * dt;
    f.vy -= 6 * dt; f.life -= dt;
    f.sp.material.opacity = Math.max(0, f.life / 0.55);
    if (f.life <= 0) { f.sp.parent?.remove(f.sp); kset.fx.splice(i, 1); }
  }
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
  solidCircle(SHOP.x, SHOP.z, 1.15);   // 🚧 좌판 (상점 상호작용 2.0 확보)
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
  solidCircle(MARKET.x, MARKET.z, 0.8);   // 🚧 전광판 (시세 상호작용 2.0 확보)
}

// 시세판 모달 데이터 — index.html(ui.openMarket)이 렌더
function marketData() {
  return {
    items: Object.keys(SELL_PRICE).map(k => ({
      k, ico: SELL_ICO_G[k], label: RES_LABEL[k] || k,
      price: priceOf(k), base: SELL_PRICE[k], rate: Math.round(priceRate(k) * 100) - 100, // 등락 %(0=기본가)
    })).sort((a, b) => b.rate - a.rate),       // 비싼 순 정렬(오늘 뭘 팔지 바로 보이게)
    forecast: forecastLine(),
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

// ── 🍳 자유주방 — 요리 미니게임(타이밍·리듬). 결과 점수(0~100)가 요리 등급 → 버프 지속 배율을 정한다 ──
//    게임업계식 등급 컷: 점수 구간 → 등급/배율. 잘할수록 같은 재료로 더 오래 가는 버프.
const COOK_TIERS = [
  { id: 'perfect', min: 88, ico: '💫', name: '최고의 맛', mult: 1.5 },
  { id: 'great',   min: 65, ico: '😋', name: '훌륭한 맛', mult: 1.25 },
  { id: 'good',    min: 35, ico: '🙂', name: '무난한 맛', mult: 1.0 },
  { id: 'plain',   min: 0,  ico: '😅', name: '아쉬운 맛', mult: 0.7 },
];

// 주방 메뉴판 데이터 — index.html(ui.openKitchen)이 렌더
function kitchenView() {
  const inv = gameState.inventory;
  return {
    recipes: RECIPES.map(r => ({
      id: r.id, name: r.name, ico: r.ico, desc: r.desc, mg: r.mg,
      cost: Object.entries(r.cost).map(([k, v]) => ({ k, ico: SELL_ICO_G[k] || '📦', label: RES_LABEL[k] || k, need: v, have: inv[k] || 0 })),
      ready: Object.entries(r.cost).every(([k, v]) => (inv[k] || 0) >= v),
      best: gameState.kitchen.best[r.id] || 0,           // 레시피별 최고 점수(진행도 표시)
    })),
    cooked: gameState.kitchen.cooked || 0,
  };
}

// 요리 시작 — 재료를 먼저 소비(중도 포기해도 요리는 낮은 등급으로 완성 → 재시도 악용 방지)
function kitchenStart(id) {
  const r = RECIPES.find(x => x.id === id); if (!r) return { ok: false };
  for (const k in r.cost) {
    if ((gameState.inventory[k] || 0) < r.cost[k]) return { ok: false, msg: `${RES_LABEL[k] || k}이(가) 부족해요` };
  }
  for (const k in r.cost) gameState.inventory[k] -= r.cost[k];
  refreshInventoryUI();
  trackEvent('cooking_start', { recipe: id, mg_type: r.mg });   // [GA4] 미니게임 퍼널: 시작
  return { ok: true, id, mg: r.mg, name: r.name, ico: r.ico, icos: Object.keys(r.cost).map(k => SELL_ICO_G[k] || '📦') }; // icos: 조리 장면 연출용 재료 아이콘
}

// 요리 완성 — 미니게임 결과를 받아 등급 판정 + 버프 적용 + 기록/트래킹
// res: { score(0~100), offsets[탭별 타이밍 오차 ms, 부호 포함], maxCombo, judges:{perfect,good,miss}, durationMs, abandoned, step }
function kitchenFinish(id, res = {}) {
  const r = RECIPES.find(x => x.id === id); if (!r) return { ok: false };
  const score = Math.max(0, Math.min(100, Math.round(res.score || 0)));
  const tier = COOK_TIERS.find(t => score >= t.min) || COOK_TIERS[COOK_TIERS.length - 1];
  const st = gameState.kitchen;
  st.cooked = (st.cooked || 0) + 1;
  st.tiers[tier.id] = (st.tiers[tier.id] || 0) + 1;
  const isBest = score > (st.best[id] || 0);
  if (isBest) st.best[id] = score;
  const dur = Math.round(r.dur * tier.mult * (gameState.upgrades.pot ? 1.5 : 1)); // 등급 배율 × 🍲 큰 냄비 1.5배
  buffs[r.buff] = clock.elapsedTime + dur;
  Sound.harvest();
  if (tier.id === 'perfect') { Sound.complete(); spawnConfetti(player.position.x, 2.2, player.position.z); }
  spawnFloatText(player.position.x, 1.4, player.position.z, `${r.ico} ${tier.ico} ${tier.name}!`, '#c9682a');
  spawnSparkle(player.position.x, 0.9, player.position.z, tier.id === 'perfect' ? 26 : 14);
  dexDiscover('cook', id);                                   // 📖 도감(첫 요리)
  questEvent('cook');                                        // 요리사 퀘스트/데일리 진행
  triggerMoment();                                           // 📷 순간 줌인
  emitBuffs();
  // 🔰 이 버프를 처음 받았다면 설명 모달(1회) — 결과 화면이 먼저 뜬 뒤에 얹어 보여줌
  const bm = BUFF_META[r.buff];
  setTimeout(() => firstHint('buff_' + r.buff, bm.ico, `${bm.name} 버프 획득!`,
    `${bm.desc} 남은 시간은 화면 오른쪽 위 칩에 표시되고, 칩을 누르면 이 설명을 다시 볼 수 있어요.`), 800);
  // [GA4] 게임업계식 미니게임 결과 지표 — 탭별 타이밍(ms)·정확도·콤보·등급·누적 진행도까지 한 행에
  const offsets = (res.offsets || []).map(v => Math.round(v));
  const j = res.judges || {};
  trackEvent(res.abandoned ? 'cooking_abandon' : 'cooking_result', {
    recipe: id, mg_type: r.mg, quality: tier.id, score,
    avg_offset_ms: offsets.length ? Math.round(offsets.reduce((a, b) => a + Math.abs(b), 0) / offsets.length) : null, // 평균 절대 오차(정밀도)
    offsets: offsets.join(','),                              // 탭별 원본 타이밍(부호=빠름/늦음)
    max_combo: res.maxCombo || 0,
    n_perfect: j.perfect || 0, n_good: j.good || 0, n_miss: j.miss || 0,
    duration_ms: Math.round(res.durationMs || 0),
    step: res.step ?? null,                                  // 포기 시 어느 단계까지 갔는지(퍼널 이탈 지점)
    is_best: isBest ? 1 : 0, total_cooked: st.cooked,        // 유저 진행도(누적 요리 수)
  });
  return {
    ok: true, name: r.name, ico: r.ico, score, isBest, cooked: st.cooked,
    tier: { id: tier.id, ico: tier.ico, name: tier.name, mult: tier.mult },
    buff: { ...BUFF_META[r.buff], dur },
  };
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
    .map(k => ({ k, ico: BUFF_META[k].ico, name: BUFF_META[k].name, desc: BUFF_META[k].desc, remain: Math.ceil(buffs[k] - now) })); // desc: 칩 클릭 설명 모달용
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
  } else if (id === 'scarecrow') {
    // 예전 텃밭 장식과 같은 실루엣 — 이제는 사서 밭 근처에 "배치"해야 밤손님을 막는다
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), clayMat(0x8a6a3a)); pole.position.y = 0.8; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), clayMat(0x8a6a3a)); arm.position.y = 1.1; g.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), clayMat(0xf1a444, false)); head.position.y = 1.5; g.add(head); // 🎃 호박 머리
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 10), clayMat(0xc98a4f)); hat.position.y = 1.72; g.add(hat);
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
  } else if (id === 'spiritlamp') {
    // ✨ 정령 등불 — 굽은 가지 모양 기둥 + 정령빛(청록) 구슬. 밤에 houseWindows 와 함께 점등
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.3, 6), clayMat(0x4a5a58)); pole.position.y = 0.65; pole.rotation.z = 0.12; g.add(pole);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xbef3ea, emissive: 0x5fe8d0, emissiveIntensity: 0, roughness: 0.5 });
    houseWindows.push(headMat);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 0), headMat); head.position.set(0.16, 1.36, 0); g.add(head);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 5, 12), clayMat(0x4a5a58)); ring.position.set(0.16, 1.36, 0); g.add(ring);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// 야외 장식 설치 (플레이어 위치에). silent=true 면 저장 복원
function placeOutdoor(wx, wz, silent = false, id = placingOutdoor) {
  const def = OUTDOOR.find(d => d.id === id); if (!def) return false;
  if (!silent) {
    for (const k in def.cost) {
      if ((gameState.inventory[k] || 0) < def.cost[k]) { ui.toast?.((RES_LABEL[k] || k) + '이(가) 부족해요'); return false; }
    }
    for (const k in def.cost) gameState.inventory[k] -= def.cost[k];
    refreshInventoryUI();
  }
  const m = outdoorMesh(id); m.position.set(wx, 0, wz); scene.add(m); outdoorMeshes.push(m);
  gameState.outdoor.push({ id, x: wx, z: wz });
  obstacles.push({ x: wx, z: wz, r: 0.8 });   // 그 위엔 밭 금지
  // 🚧 울타리·돌담·정원등·화로·허수아비는 막고, 디딤돌·꽃밭은 밟고 지나갈 수 있게
  if (['fence', 'stonewall', 'postlamp', 'brazier', 'scarecrow', 'spiritlamp'].includes(id)) solidCircle(wx, wz, ['postlamp', 'scarecrow', 'spiritlamp'].includes(id) ? 0.22 : 0.5);
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
  // 🚧 기둥 두 개만 — 아치 가운데는 걸어서 지나갈 수 있어야 한다
  [-1.1, 1.1].forEach(px => solidCircle(FARM_GATE.x + px, FARM_GATE.z, 0.28));
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
  // (허수아비 장식은 제거 — 이제 작업대에서 만들어 직접 배치해야 밤손님을 막는다)
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
  // 🚧 광맥 바위(채굴 사거리 2.4 는 그대로). 캐서 사라진 동안엔 통과 가능.
  g.userData = { ore, hp: 3, depleted: false, respawnAt: 0, growing: false, collider: solidCircle(x, z, 0.7) };
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
  // 🚧 바위 더미는 사각으로 — 입구(+z)만 열어 두고 나머지를 막는다.
  //    (원으로 막으면 아치 안으로 못 들어가 입장 판정 2.0 을 못 채움)
  solidBox(MINE_GATE.x - 2.4, MINE_GATE.z - 1.7, MINE_GATE.x + 2.4, MINE_GATE.z + 0.15);
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
    if (ud.collider) ud.collider.off = ud.depleted;   // 🚧 캔 자리엔 막히지 않게
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
  if (boat.active) {   // 🛶 런 중엔 프롬프트를 전부 끔(액션 = 노 젓기)
    nearDoor = null; nearBoat = nearBoatShop = false;
    if (lastDoorPrompt !== null) { lastDoorPrompt = null; ui.setDoorPrompt?.(null); }
    if (lastZoneHint !== null) { lastZoneHint = null; ui.setZoneHint?.(null); }
    return;
  }
  if (atMist) {        // 🌫️ 안개 숲: 남쪽으로 나가기 / 수호목·등불·정령 근접
    let prompt = null;
    if (dist2D({ x: MIST.x, z: MIST.z + MIST_HALF }, player.position) < 1.9) { nd = 'mistexit'; prompt = '🚪 마을로 나가기'; }
    else prompt = updateMistInteract();
    nearDoor = nd;
    if (prompt !== lastDoorPrompt) { lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
    return;   // 존 힌트는 updateMist 가 상태표시로 사용
  }
  if (atRiver) {       // 🛶 나루터 데크: 남쪽으로 나가기 / 배·창고 근접
    if (dist2D({ x: RIVER.x, z: RIVER.z + RIVER_DOCK_HALF }, player.position) < 1.9) { nd = 'riverexit'; prompt = '🚪 마을로 나가기'; }
    else prompt = updateRiverInteract();
    nearDoor = nd;
    if (prompt !== lastDoorPrompt) { lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
    if (lastZoneHint !== null) { lastZoneHint = null; ui.setZoneHint?.(null); }
    return;
  }
  if (indoor) {
    if (dist2D({ x: INT.x, z: INT.z - INT_HALF }, player.position) < 1.7) { nd = 'exit'; prompt = '🚪 나가기'; } // 문 바로 앞에서만
  } else if (atFarm) {
    if (dist2D({ x: FARM.x, z: FARM.z + FARM_HALF }, player.position) < 1.8) { nd = 'farmexit'; prompt = '🚪 나가기'; }
  } else if (atMine) {
    if (dist2D({ x: MINE.x, z: MINE.z - MINE_HALF }, player.position) < 1.7) { nd = 'mineexit'; prompt = '🚪 나가기'; }
  } else if (atCafe) {   // ☕ 홀: 남쪽 문으로 나가기 / 손님·주문판 근접 안내
    if (dist2D({ x: CAFE.x, z: CAFE.z + CAFE_HALF }, player.position) < 1.9) { nd = 'cafeexit'; prompt = '🚪 나가기'; }
    else prompt = updateCafeInteract();
  } else if (gameState.houseStage >= 3 && dist2D(HOUSE_POS, player.position) < houseSolidR() + 0.6) { // 증축 크기에 맞춰 문 사거리도 확장
    nd = 'enter'; prompt = '🚪 집에 들어가기';
  } else if (dist2D(FARM_GATE, player.position) < 2.0) {
    nd = 'farm'; prompt = '🌾 내 텃밭';
  } else if (dist2D(MINE_GATE, player.position) < 2.0) {
    nd = 'mine'; prompt = '⛏️ 채굴 동굴';
  } else if (dist2D({ x: MIST_GATE.x + 1.4, z: MIST_GATE.z + 1.4 }, player.position) < 2.4) {
    nd = 'mist'; prompt = '🌫️ 안개 낀 숲에 들어가기';
    firstHint('mistGate', '🌫️', '안개 낀 숲', '마을 북서쪽, 안개가 걷히지 않는 숲이에요. 그림자 정령들이 수호목의 빛을 탐내고 있어요 — 등불과 ♪음악으로 달래서 하루의 안개를 정화해보세요. 정령빛(✨)으로 특별한 등불 장식도 만들 수 있어요!');
  } else if (dist2D({ x: DOCK_GATE.x, z: DOCK_GATE.z + 1.2 }, player.position) < 2.4) {
    nd = 'river'; prompt = '🛶 나루터 (나룻배 타러 가기)';
    firstHint('dockGate', '🛶', '나루터', '마을 북쪽 강가예요. 들어가면 나룻배를 타고 강을 내려가는 물길이 열려요 — 장애물을 피하고 ⭐별조각을 모아 배를 강화하세요. 하루 3번 탈 수 있고, 물길은 매일 새로 바뀌어요!');
  } else if (dist2D({ x: CAFE_GATE.x, z: CAFE_GATE.z + 1.3 }, player.position) < 2.2) {
    nd = 'cafe'; prompt = '☕ 카페에 들어가기';
    firstHint('cafeGate', '☕', '카페', '들어가면 손님들이 테이블에 앉아 요리를 주문하고 있어요. 재료를 들고 손님에게 다가가면 그 자리에서 만들어 서빙 — 🪙코인과 ❤️친밀도를 받아요. 농사·낚시·닭장·채집으로 모은 재료를 쓸 곳이에요!');
  }
  nearDoor = nd;
  if (nd === 'mine') firstHint('mineGate', '⛏️', '채굴 동굴 입구', '들어가면 어두운 동굴에서 ⛏️괭이로 돌·석탄·보석을 캘 수 있어요. 작업대 재료와 상점 판매에 쓰여요!');
  // 자유주방/작업대/상점 — 마을(실외)에서 다른 프롬프트가 없을 때만
  const inVillage = !indoor && !atFarm && !atMine && !atRiver && !nd;
  nearKitchen = inVillage && dist2D(KITCHEN, player.position) < 2.2;               // 🍳 자유주방(요리 미니게임)
  nearBench = inVillage && !nearKitchen && dist2D(BENCH, player.position) < 2.0;
  nearShop = inVillage && !nearKitchen && !nearBench && dist2D(SHOP, player.position) < 2.0;
  nearMarket = inVillage && !nearKitchen && !nearBench && !nearShop && dist2D(MARKET, player.position) < 2.0; // 📊 시세 전광판
  nearCoop = inVillage && !nearKitchen && !nearBench && !nearShop && !nearMarket && dist2D(COOP, player.position) < 2.4; // 🐔 닭장
  if (nearKitchen) prompt = '🍳 요리하기 (자유주방)';
  else if (nearBench) prompt = '🔧 만들기 (작업대)';
  else if (nearShop) prompt = '🛒 상점';
  else if (nearMarket) { prompt = '📊 오늘의 시세'; firstHint('market', '📊', '시세 전광판', '판매 가격이 매일 바뀌어요! 전광판에서 오늘 비싼 품목을 확인하고 비쌀 때 파세요 🪙'); }
  else if (nearCoop) {
    prompt = gameState.coop.built ? '🐔 닭장' : '🐔 닭장 터';
    firstHint('coop', '🐔', '닭장 터', '남쪽 빈터에 닭장을 지을 수 있어요! 🔥 2일 연속 출석하고 재료(🪵25 🪨10 🪙60)를 모아 오세요. 지으면 매일 모이를 주고 다음날 🥚 달걀을 얻어요.');
  }
  if (prompt !== lastDoorPrompt) { lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
  // 첫 접근 안내(1회) — 초보가 각 시설 용도를 알게
  if (nearKitchen) firstHint('kitchen', '🍳', '자유주방', '재료로 요리하는 미니게임 작업장이에요! 🍲끓이기는 바늘이 초록 구간에 올 때 탭, 🔪썰기는 리듬에 맞춰 탭 — 타이밍이 좋을수록 요리 등급이 올라 버프가 오래가요.');
  else if (nearBench) firstHint('bench', '🔧', '작업대', '재료(목재·돌·작물)로 도구 강화·야외 장식·주민 선물을 만들 수 있어요. 요리는 옆의 🍳 자유주방에서!');
  else if (nearShop) firstHint('shop', '🛒', '상점', '작물·물고기·목재를 팔아 🪙코인을 벌고, 씨앗 등을 살 수 있어요. (팔기: 탭하면 1개, 꾹 누르면 전부)');
  else if (nd === 'farm') firstHint('farmGate', '🌾', '내 텃밭 입구', '들어가면 나만의 넓은 밭이 있어요. 마을과 별개로, 마음껏 농사지을 수 있는 나만의 공간이에요!');
  // 🎨 완성된 집 근처 → 외관 꾸미기 버튼(메뉴 대신 공간 기반 동선)
  const nearHouse = inVillage2() && gameState.houseStage >= 3 && dist2D(HOUSE_POS, player.position) < 4.2;
  if (nearHouse !== lastNearHouse) { lastNearHouse = nearHouse; ui.setNearHouse?.(nearHouse); }
  if (nearHouse) firstHint('extDecor', '🎨', '집 외관 꾸미기', '집 근처에 오면 🎨 집 외관 꾸미기 버튼이 떠요. 지붕·벽·문 색을 바꿔 나만의 집을 만들어보세요!');
  updateZoneHint();
}

// 🌟🍄 존(구역) 안내 — 도구로 상호작용하는 넓은 구역용.
//   setDoorPrompt 와 달리 액션 버튼 아이콘을 뺏지 않아, 구역 안에서도 도구질이 그대로 됨.
let lastZoneHint = null;
function updateZoneHint() {
  let hint = null;
  if (atCafe) {   // ☕ 손님 옆에 서면 주문 대사를 띄움(액션 프롬프트와 별도 줄)
    if (nearCafeGuest) hint = `💬 ${nearCafeGuest.order.line}`;
    if (hint !== lastZoneHint) { lastZoneHint = hint; ui.setZoneHint?.(hint); }
    return;
  }
  const wasGlade = nearGlade;
  nearGlade = inVillage2() && dist2D(GLADE, player.position) < GLADE_R + 0.5;
  if (nearGlade) {
    hint = isNight() ? '🌟 반딧불이 — 🦋포충망(도구 8)으로 반짝일 때 휘두르기' : '🌟 반딧불이 계곡 — 🌙 밤에 다시 오세요';
    if (!wasGlade) trackEvent('zone_enter', { zone: 'glade', night: isNight() });   // [GA4] 밤 콘텐츠 유입
    firstHint('glade', '🌟', '반딧불이 계곡',
      '밤이 되면 이 숲에 반딧불이가 피어올라요. 🦋 포충망을 들고 반딧불이가 밝게 반짝이는 순간 휘두르면 잡을 수 있어요! 종류는 4가지 — 📖 도감에 모아보세요.');
  }
  const wasForest = nearForest;
  nearForest = inVillage2() && dist2D(FOREST, player.position) < FOREST_R + 0.5;
  if (nearForest && !hint) {
    hint = forageTarget() ? '🍄 채집물 발견! 액션(Space)으로 줍기 — 도구 필요 없어요' : '🍄 채집 숲 — 버섯·산딸기·도토리를 찾아보세요';
    if (!wasForest) trackEvent('zone_enter', { zone: 'forest', weather: WEATHER });   // [GA4] 채집 유입
    firstHint('forest', '🍄', '채집 숲',
      '씨앗도 물주기도 필요 없어요 — 숲을 돌아다니다 버섯·산딸기·도토리·약초를 발견하면 그냥 주우면 돼요! 주운 자리엔 잠시 뒤 다른 게 돋아나고, 🌧️ 비 온 날엔 버섯이 특히 많이 나요.');
  }
  if (hint !== lastZoneHint) { lastZoneHint = hint; ui.setZoneHint?.(hint); }
}
function inVillage2() { return !indoor && !atFarm && !atMine && !atCafe && !atRiver && !atMist; }   // 마을 실외 여부(집 근처 버튼용)

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
    // 숫자키 1~8 로 도구 선택(8=🦋포충망)
    if (/^Digit[1-8]$/.test(e.code)) Input.selectTool(parseInt(e.code.slice(5)) - 1);
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
  } else if (place === 'river') {
    if (boat.active) {   // 🛶 런 중엔 "앞을 보는 레이더" — 다가오는 장애물·수집물을 미리 알려줌
      for (const a of riverActive) {
        if (a.taken) continue;
        const c = a.item.kind === 'star' ? '#ffd95e' : a.item.kind === 'pick' ? '#ff9ecb'
          : a.item.kind === 'whirl' ? '#9fdcf5' : '#9aa3a8';
        marks.push({ x: RIVER.x + a.x, z: RIVER.z - RIVER_DOCK_HALF - 2 - a.item.d, c, r: a.item.kind === 'log' ? 4 : 2.6 });
      }
    } else {
      marks.push({ x: RIVER.x, z: RIVER.z + RIVER_DOCK_HALF, c: '#c8905a', kind: 'exit' });     // 마을로 나가는 길(남쪽)
      marks.push({ x: RIVER.x, z: RIVER.z - RIVER_DOCK_HALF - 1.4, c: '#c08d5a', r: 3.4 });     // 🛶 정박한 배
      marks.push({ x: RIVER.x - RIVER_DOCK_HALF + 2, z: RIVER.z + 1.6, c: '#e2c79a', r: 3 });   // 🧰 창고
    }
  } else if (place === 'mist') {
    marks.push({ x: MIST.x, z: MIST.z + MIST_HALF, c: '#c8905a', kind: 'exit' });             // 마을로(남쪽)
    marks.push({ x: MIST.x, z: MIST.z - 3, c: '#7fe8cf', r: 3.4 });                            // 🌳 수호목
    mistLanterns.forEach(l => marks.push({ x: MIST.x + l.x, z: MIST.z + l.z, c: l.lit ? '#9fe8ff' : '#5a626e', r: 2.2 })); // 🏮 등불(켜짐/꺼짐)
    mist.spirits.forEach(s => { if (!s.gone) marks.push({ x: MIST.x + s.group.position.x, z: MIST.z + s.group.position.z, c: '#b08ae0', r: 2 }); }); // 정령
  } else if (place === 'cafe') {
    marks.push({ x: CAFE.x, z: CAFE.z + CAFE_HALF, c: '#c8905a', kind: 'exit' });             // 나가는 문(남쪽)
    marks.push({ x: CAFE.x + CAFE_BOARD[0], z: CAFE.z + CAFE_BOARD[1], c: '#8a7a5f', r: 2.4 }); // 📋 주문판
    for (const g of cafeGuestObjs) marks.push({ x: CAFE.x + g.group.position.x, z: CAFE.z + g.group.position.z, c: '#e8907a', r: 3 }); // 대기 중인 손님
  }
  return marks;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  // ?dbg=1 — 루프 상태 스냅샷(로컬 조사용): 모드·위치·눌린 키·현재 공간
  if (_wq.has('dbg')) window.__dbg = { mode, atMist, atRiver, px: +player.position.x.toFixed(2), pz: +player.position.z.toFixed(2), keys: Object.keys(keys).filter(k => keys[k]), nearKitchen, nearBench, nearNPC: !!nearNPC, nearDoor, wantAction };

  if (mode === 'play') {
    if (!mgView) { updatePlayer(dt, t); updateCamera(dt); }
    else { updateMgScene(dt, t); wantAction = false; }  // 🍳 요리 미니게임 중엔 클로즈업 무대가 카메라를 가짐 — 마을 상호작용(프롬프트·힌트·액션)은 정지
    if (!mgView) {
      handleAction();
      updateNPCInteract();
      updateDoorInteract();
    }
    updateFishing();
    emitBuffs();          // 활성 버프 HUD 갱신(만료 처리 포함)
    if (t - lastMini > 0.12) {   // 미니맵(캐릭터 위치) 갱신
      lastMini = t;
      const place = indoor ? 'house' : atFarm ? 'farm' : atMine ? 'mine' : atCafe ? 'cafe' : atRiver ? 'river' : atMist ? 'mist' : 'village';
      const md = { place, x: player.position.x, z: player.position.z, yaw: player.rotation.y };
      if (place !== 'village') {   // 서브 공간: 중심·반경·랜드마크를 함께 전달
        const C = place === 'house' ? INT : place === 'farm' ? FARM : place === 'cafe' ? CAFE : place === 'river' ? RIVER : place === 'mist' ? MIST : MINE;
        md.cx = C.x; md.cz = C.z;
        md.half = place === 'house' ? INT_HALF : place === 'farm' ? FARM_HALF : place === 'cafe' ? CAFE_HALF : place === 'river' ? RIVER_DOCK_HALF : place === 'mist' ? MIST_HALF : MINE_HALF;
        // 🛶 런 중엔 배를 중심으로 앞뒤를 보는 레이더(고정 데크 지도 대신)
        if (place === 'river' && boat.active) { md.cx = player.position.x; md.cz = player.position.z - 14; md.half = 22; }
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
  updateFireflyBugs(dt, t); // 🌟 반딧불이(밤에만 계곡에 출현)
  updateMist(dt, t);        // 🌫️ 안개 숲(정령 웨이브·수호목 빛)
  updateCafeGuests(dt, t);  // ☕ 카페 손님(숨쉬기·주문 말풍선)
  updateForage(dt, t);      // 🍄 채집물(돋아나기·재생성)
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
  if (boat.active) return updateBoatRun(dt, t);    // 🛶 런 중엔 걷기 대신 배 물리
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

  // 🐾 꼬리 흔들기 — 동물별 속도·진폭(강아지는 신나게, 고양이는 느긋하게).
  //    움직일 때 더 크고 빠르게 흔들려 "살아있는" 느낌을 줌.
  if (tailPivot) {
    const u = tailPivot.userData;
    tailPhase += dt * u.wagSpeed * (moving ? 1.8 : 1);
    tailPivot.rotation.y = Math.sin(tailPhase) * u.wagAmp * (moving ? 1.6 : 1);
    tailPivot.rotation.x = Math.sin(tailPhase * 0.5) * u.wagAmp * 0.3;
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
  } else if (atCafe) { // ☕ 카페 홀: 벽 안쪽으로 제한
    player.position.x = Math.max(CAFE.x - CAFE_HALF + 0.8, Math.min(CAFE.x + CAFE_HALF - 0.8, player.position.x));
    player.position.z = Math.max(CAFE.z - CAFE_HALF + 0.8, Math.min(CAFE.z + CAFE_HALF - 0.7, player.position.z));
  } else if (atRiver) { // 🛶 나루터 데크: 물에 빠지지 않게 데크 안쪽으로 제한
    player.position.x = Math.max(RIVER.x - RIVER_DOCK_HALF + 0.7, Math.min(RIVER.x + RIVER_DOCK_HALF - 0.7, player.position.x));
    player.position.z = Math.max(RIVER.z - RIVER_DOCK_HALF + 0.7, Math.min(RIVER.z + RIVER_DOCK_HALF - 0.5, player.position.z));
  } else if (atMist) {  // 🌫️ 안개 숲: 빈터 안쪽으로 제한
    player.position.x = Math.max(MIST.x - MIST_HALF + 0.7, Math.min(MIST.x + MIST_HALF - 0.7, player.position.x));
    player.position.z = Math.max(MIST.z - MIST_HALF + 0.7, Math.min(MIST.z + MIST_HALF - 0.5, player.position.z));
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

  // 🚧 건물·바위·가구 밀어내기 — 공간 클램프 뒤에 마지막으로(벽 모서리에 끼지 않게)
  //    실내(집)는 가구를 직접 배치하는 공간이라 제외 — 잘못 놓으면 갇힐 수 있음
  if (!indoor) resolveColliders(player.position);
  // 테스트: ?dbg=1 — 현재 좌표·카메라·콜라이더 수를 <body data-dbg> 에 기록(충돌 디버깅용)
  if (_wq.has('dbg')) {
    document.body.dataset.dbg = `${player.position.x.toFixed(2)},${player.position.z.toFixed(2)} cam ${camera.position.x.toFixed(1)},${camera.position.z.toFixed(1)} col ${colliders.length}`;
    window.__scene = scene;   // 씬 그래프 콘솔 조사용(로컬 ?dbg=1 전용)
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
//   데스크톱(가로)=1배, 폰 세로(≈0.46)=최대 2.3배까지 뒤로.
//   ※ 상한 2.0 + 기준거리 3.2 조합은 세로 화면에서 캐릭터가 프레임을 꽉 채워
//     "뭘 했는지" 안 보인다는 피드백이 있어 한 단계 더 물렸습니다.
function closeUpDist(base) {
  return base * Math.min(2.3, Math.max(1, 1.35 / camera.aspect));
}
function startActionShot() {
  return new Promise((resolve) => {
    const poses = [['jump', 1.2, 0.30], ['dance', 2.4, 0.62], ['heart', 1.6, 0.55], ['wave', 1.4, 0.42]];
    const [pose, dur, peak] = poses[Math.floor(Math.random() * poses.length)];
    startEmote(pose, dur);                       // 역동적 포즈 발동
    // 밀착 위치는 시작 시점에 고정(스핀 포즈여도 카메라가 흔들리지 않게) — 정면 어깨높이
    const fy = player.rotation.y;
    const pd = closeUpDist(4.0);
    _photoPos.set(player.position.x + Math.sin(fy) * pd, 1.70 + (pd - 4.0) * 0.14, player.position.z + Math.cos(fy) * pd);
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
  const md = closeUpDist(4.2);
  _momentPos.set(player.position.x + Math.sin(fy) * md, 1.80 + (md - 4.2) * 0.14, player.position.z + Math.cos(fy) * md);
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

// 🫙 반딧불이 유리병 — 잡은 순간 머리 위로 들어올리는 전리품.
//   개체 메시를 그대로 쓰면 밀착 카메라 + 블룸에 하얗게 번지므로, 작고 또렷한 병으로 표현
function bugJarMesh(kind) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.34, 12),
    new THREE.MeshStandardMaterial({ color: 0xdff2f5, transparent: true, opacity: 0.32, roughness: 0.15, metalness: 0.1 }));
  glass.position.y = 0.17; g.add(glass);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 12), clayMat(0xc9a06a, false));
  lid.position.y = 0.37; g.add(lid);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8),
    new THREE.MeshBasicMaterial({ color: kind.color }));
  glow.position.y = 0.16; g.add(glow);
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
  if (boat.active) return updateBoatCamera(dt);   // 🛶 런 중: 1인칭 뱃머리 시점
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
  nightLevel = nightAmt;   // 🌟 반딧불이 등 "밤 전용" 콘텐츠가 참조
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
  // ☕ 카페 홀: 시간대 무관 따뜻하고 밝게(펜던트 등이 켜져 있는 실내)
  if (atCafe) {
    hemiLight.intensity = 0.55; ambient.intensity = 0.62; sunLight.intensity = 0.3;
    ambient.color.setHex(0xffe6c8);   // 전구색(ambient 는 매 프레임 리셋되므로 안전)
    if (playerLight) playerLight.intensity = 0.5;
    scene.fog.color.setHex(0xe8d6b8); scene.fog.near = 26; scene.fog.far = 70;
  }
  // 🌫️ 안개 숲: 시간대 무관 어둑 + 짙은 안개(정화한 날은 맑고 환하게)
  if (atMist) {
    const clear2 = gameState.mist.purified;
    hemiLight.intensity = clear2 ? 0.8 : 0.3; ambient.intensity = clear2 ? 0.5 : 0.42; sunLight.intensity = clear2 ? 0.8 : 0.1;
    ambient.color.setHex(clear2 ? 0xd8f0e4 : 0x46508a);   // 정화 전: 푸른 어스름
    if (playerLight) playerLight.intensity = clear2 ? 0.4 : 2.6;
    scene.fog.color.setHex(clear2 ? 0xcfe8dc : 0x8a92aa);
    // ⚠️ 카메라가 캐릭터 뒤 ~21유닛에 있어 near 는 그보다 길어야 함(짧으면 화면 전체가 화이트아웃)
    scene.fog.near = clear2 ? 24 : 21; scene.fog.far = clear2 ? 70 : 40;   // 정화 전: 캐릭터 너머는 금세 뿌옇게
    scene.background = scene.fog.color;   // 숲은 사방이 트여 배경이 보임 — 하늘도 안개색으로
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
    if (ud.collider) ud.collider.off = ud.fallen;   // 🚧 안 보이는 그루터기에 막히지 않게
    if (ud.growing) {
      const s = THREE.MathUtils.lerp(tree.scale.x, 1, dt * 5);
      tree.scale.set(s, s, s);
      if (s > 0.98) { tree.scale.set(1, 1, 1); ud.growing = false; }
    }
  }
}

// =============================================================
//  🦝 밤손님 — 자리를 비운 밤사이 너구리·멧돼지가 작물을 훔쳐간다
//  ------------------------------------------------------------
//  ▶ 판정은 서버(/api/night-visit)가 한다: HMAC(uid:날짜) 시드의 결정적
//    난수라 새로고침으로 결과를 다시 굴릴 수 없다. 서버 실패 시엔
//    lastDate 를 넘기지 않아 다음 접속에서 다시 판정한다(결정적이라 리롤 아님).
//  ▶ 방어: 밭 근처(9칸)의 허수아비 1개·울타리 4개가 확률과 도난 개수를 깎는다.
//  ▶ 손실만 주면 접속이 벌이 된다 — 흔적(파헤쳐진 흙+발자국)을 조사하면
//    수집품(도감 신규 카테고리 '흔적')과 씨앗을 돌려받는다.
// =============================================================
let nightFetcher = null;      // async (ctx) => verdict — js/night-visit.js 가 등록
let nightNoteFetcher = null;  // async ({date,animal,crop}) => {author,text}
export function setNightVisitSource(fn) { nightFetcher = fn || null; }
export function setNightNoteSource(fn) { nightNoteFetcher = fn || null; }

const NIGHT_ANIMAL = {
  raccoon: { ico: '🦝', name: '너구리' },
  boar:    { ico: '🐗', name: '멧돼지' },
};
const traceObjs = [];   // 씬에 떠 있는 흔적 [{ mesh, data }]

// 흔적 위 '🐾 조사' 말풍선(공유 텍스처) — 밭의 '물 줘요!' 와 같은 문법
let _traceMat = null;
function traceMaterial() {
  if (_traceMat) return _traceMat;
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(226,196,158,0.96)'; roundRect(c, 8, 8, 184, 64, 18); c.fill();
  c.beginPath(); c.moveTo(90, 72); c.lineTo(110, 72); c.lineTo(96, 94); c.closePath(); c.fill();
  c.fillStyle = '#5a4126'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('🐾 조사!', 100, 40);
  const tex = new THREE.CanvasTexture(cv);
  _traceMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return _traceMat;
}

// 파헤쳐진 흙 + 도망간 방향 발자국 — "눈으로 봐야 사건으로 느껴진다"
function traceMesh(animal) {
  const g = new THREE.Group();
  const dug = clayMat(0x5e4026, false);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 5), dug);
  mound.position.set(0.1, 0.1, -0.1); mound.scale.y = 0.4; g.add(mound);
  const mound2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), dug);
  mound2.position.set(-0.35, 0.07, 0.25); mound2.scale.y = 0.4; g.add(mound2);
  // 발자국: 너구리는 작고 총총, 멧돼지는 크고 성큼 — 밭에서 멀어지는 한 줄
  const paw = clayMat(0x4a3520, false);
  const r = animal === 'boar' ? 0.11 : 0.07;
  const step = animal === 'boar' ? 0.55 : 0.38;
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 7), paw);
    p.position.set((i % 2 ? 0.16 : -0.16) + 0.5 + i * step * 0.5, 0.03, 0.6 + i * step);
    p.scale.z = 1.35; g.add(p);
  }
  const bubble = new THREE.Sprite(traceMaterial());
  bubble.scale.set(1.28, 0.7, 1); bubble.position.set(0, 1.35, 0);
  g.add(bubble);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function spawnTrace(t, silent = false) {
  const m = traceMesh(t.animal); m.position.set(t.x, 0, t.z);
  scene.add(m); traceObjs.push({ mesh: m, data: t });
  if (!silent) { m.userData.pop = 1; m.scale.setScalar(0.01); spawnDust(t.x, t.z, 10); }
}

// 조사(도구 불필요·모바일 액션 버튼 동일): 흔적 제거 + 수집품 도감 + 씨앗 위로
function investigateTrace(tr) {
  const t = tr.data;
  scene.remove(tr.mesh);
  traceObjs.splice(traceObjs.indexOf(tr), 1);
  gameState.night.traces = gameState.night.traces.filter(x => !(x.x === t.x && x.z === t.z));
  const entry = DEX.track.find(e => e.id === t.loot);
  Sound.blip();
  spawnDust(t.x, t.z, 12);
  spawnSparkle(t.x, 0.7, t.z, 18);
  giveReward({ seed: 2 }, 'night_trace', t.loot);        // [원장] 위로 보상 — 손실이 벌이 되지 않게
  ui.toast?.(`🔍 ${NIGHT_ANIMAL[t.animal]?.ico || '🐾'} 흔적에서 ${entry?.ico || ''} ${entry?.name || '수집품'}을 찾았어요!`, 2600);
  dexDiscover('track', t.loot);                          // 📖 도감 신규 카테고리 '흔적'
  trackEvent('night_trace', { animal: t.animal });       // [GA4] 조사 전환율
  requestSave();
}

// 방어 판정 입력 — 심어둔 밭 9칸 안의 허수아비·울타리(4개 이상)만 인정
function computeNightDefense(cands) {
  const near = (o, r) => cands.some(c => Math.hypot(o.x - c.p.x, o.z - c.p.z) < r);
  return {
    scarecrow: gameState.outdoor.some(o => o.id === 'scarecrow' && near(o, 9)),
    fence: gameState.outdoor.filter(o => o.id === 'fence' && near(o, 9)).length >= 4,
  };
}

// 접속 시 1회 — 밤이 지났으면 서버 판정을 받아 손실·흔적을 적용
async function resolveNightVisit() {
  const st = gameState.night;
  const today = todayStr();
  st.traces.forEach(t => spawnTrace(t, true));            // 지난 세션에 조사 안 한 흔적 복원
  if (!st.lastDate) { st.lastDate = today; return; }      // 첫 기록 — 오늘 밤부터 감시 시작
  if (st.lastDate === today) return;                      // 오늘 이미 판정함
  const cands = plots.map((p, i) => ({ p, i })).filter(c => c.p.state === 'growing' || c.p.state === 'mature');
  if (!cands.length || !nightFetcher) { st.lastDate = today; return; }   // 심은 게 없으면 훔칠 것도 없다

  const nights = Math.max(1, Math.round((new Date(today) - new Date(st.lastDate)) / 86400000));
  let v = null;
  try {
    v = await nightFetcher({
      date: today, nights,
      plots: cands.map(c => ({ crop: c.p.cropType?.id || '' })),
      defense: computeNightDefense(cands),
    });
  } catch (e) { console.warn('[밤손님] 판정 실패 — 다음 접속에 재시도', e?.message || e); }
  if (!v) return;                                         // 서버 실패 → lastDate 유지(재시도)
  st.lastDate = today;

  if (!v.visited) {
    // 방어 성공은 조용히 넘기지 않는다 — "세워두길 잘했다"는 피드백이 다음 방어를 만든다
    if (v.defended) setTimeout(() => ui.toast?.('🎃 허수아비와 울타리가 밤새 밭을 지켰어요!', 2800), 900);
    requestSave();
    return;
  }

  const stolen = [];   // 훔쳐간 작물 이름들(안내용)
  for (const i of (v.stolenIdx || [])) {
    const c = cands[i]; if (!c) continue;
    stolen.push(c.p.cropType?.name || '작물');
    clearCrop(c.p);
    c.p.state = 'empty'; c.p.growth = 0; c.p.stage = -1; c.p.watered = false;
    updatePlotVisual(c.p);
    const t = { x: c.p.x, z: c.p.z, animal: v.animal, loot: v.loot };
    st.traces.push(t); spawnTrace(t);
  }
  if (!stolen.length) return;

  const a = NIGHT_ANIMAL[v.animal] || NIGHT_ANIMAL.raccoon;
  trackEvent('night_visit', { animal: v.animal, stolen: stolen.length });   // [GA4] 밤손님 발생률
  setTimeout(() => {   // 출석 모달·날씨 토스트와 겹치지 않게 한 박자 늦게
    ui.toast?.(`${a.ico} 밤사이 ${a.name}가 ${stolen.join('·')} ${stolen.length}개를 가져갔어요… 🐾 흔적을 조사해보세요`, 3800);
    firstHint('night', a.ico, '밤손님이 다녀갔어요',
      '밤사이 배고픈 숲 친구가 밭에 다녀갔어요. 🐾 파헤쳐진 흙을 조사하면 수집품을 얻을 수 있어요. 작업대에서 🎃 허수아비·🪵 울타리를 만들어 밭 근처에 두면 피해가 줄어요!');
  }, 1200);
  // 📜 주민 쪽지(Gemini·자정 캐시) — 도착하면 카드로. 실패하면 조용히 생략
  if (nightNoteFetcher) {
    const firstCrop = cands[(v.stolenIdx || [])[0]]?.p?.cropType?.id || '';
    nightNoteFetcher({ date: today, animal: v.animal, crop: firstCrop })
      .then(n => { if (n?.text) setTimeout(() => ui.showHintModal?.({ ico: '📜', title: n.author || '주민 쪽지', body: n.text }), 4600); })
      .catch(() => {});
  }
  requestSave();
}

// =============================================================
//  🌡️ 날씨 이벤트 — 서리·태풍 예고를 보고 하루 안에 대비하는 재방문 훅
//  ------------------------------------------------------------
//  ▶ 예고: severeOf()는 날짜 시드 공개 결정값(전 유저 동일). 서버 판정이
//    필요 없다 — 결과가 이미 공개라 리롤할 유인이 없기 때문(밤손님과 대비).
//  ▶ 대비: 오늘 수확하거나, 작업대에서 🛡️ 덮개(목재 3)를 설치.
//  ▶ 정산: 밤손님과 같은 "접속 시 정산" 패턴 — 미보호 작물은 시들 뿐(wilted),
//    괭이로 다시 갈면 복구되는 부드러운 손실.
// =============================================================
const COVER_COST = { wood: 3 };

// 밭 위 덮개(나무 틀 + 천) — 밭 단위 표시, 보호는 밭 전체(coveredFor 날짜) 단위
function setPlotCover(plot, show) {
  if (show && !plot.cover) {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), clayMat(0x8a6a3a));
      leg.position.set(x, 0.35, z); g.add(leg);
    }
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.06, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf3ead4, roughness: 0.9, transparent: true, opacity: 0.92 }),
    );
    cloth.position.y = 0.74; g.add(cloth);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    plot.cover = g; plot.group.add(g);
  }
  if (plot.cover) plot.cover.visible = show;
}
function refreshCovers() {
  const active = gameState.frost.coveredFor
    && (gameState.frost.coveredFor === todayStr() || gameState.frost.coveredFor === todayStr(1));
  for (const p of plots) setPlotCover(p, !!active && (p.state === 'growing' || p.state === 'mature'));
}

// 작업대 덮개 뷰/제작 — 예고일(내일 궂음)에만 의미가 있다
function weatherPrepView() {
  return {
    severe: SEVERE_TOMORROW,
    info: SEVERE_TOMORROW ? SEVERE_INFO[SEVERE_TOMORROW] : null,
    planted: plots.filter(p => p.state === 'growing' || p.state === 'mature').length,
    cost: { ...COVER_COST },
    covered: gameState.frost.coveredFor === todayStr(1),
  };
}
function craftCover() {
  if (!SEVERE_TOMORROW) return { ok: false, msg: '내일은 날씨가 온화해요' };
  if (gameState.frost.coveredFor === todayStr(1)) return { ok: false, msg: '이미 덮개를 설치했어요' };
  for (const k in COVER_COST) {
    if ((gameState.inventory[k] || 0) < COVER_COST[k]) return { ok: false, msg: '목재가 부족해요' };
  }
  for (const k in COVER_COST) gameState.inventory[k] -= COVER_COST[k];
  gameState.frost.coveredFor = todayStr(1);
  refreshInventoryUI(); refreshCovers();
  Sound.blip();
  trackEvent('craft_item', { category: 'weather', item: 'cover' });   // [GA4] 대비 전환율
  requestSave();
  return { ok: true };
}

// 접속 시 1회 — 지난 궂은 날을 정산(밤손님과 같은 패턴, 동기라 서버 불필요)
function resolveWeatherEvent() {
  const st = gameState.frost;
  const today = todayStr();
  if (!st.lastDate) { st.lastDate = today; refreshCovers(); return; }
  if (st.lastDate === today) { refreshCovers(); return; }
  // 마지막 정산 다음날~오늘 중 가장 최근의 궂은 날 하나만 정산(밤손님과 동일한 단순화)
  const gap = Math.round((new Date(today) - new Date(st.lastDate)) / 86400000);
  let hitDate = null, kind = null;
  for (let off = 0; off < gap; off++) {              // off=0 → 오늘, 1 → 어제 …
    const k = off === 0 ? SEVERE_TODAY : severeOf(-off);
    if (k) { hitDate = todayStr(-off); kind = k; break; }
  }
  st.lastDate = today;
  const exposed = plots.filter(p => p.state === 'growing' || p.state === 'mature');
  if (!kind || !exposed.length) { st.coveredFor = null; refreshCovers(); requestSave(); return; }

  const s = SEVERE_INFO[kind];
  if (st.coveredFor === hitDate) {
    // 대비가 통했다는 피드백 — "준비하길 잘했다"가 다음 대비를 만든다
    setTimeout(() => ui.toast?.(`${s.ico} ${s.name}가 지나갔지만 🛡️ 덮개 덕분에 밭이 무사해요!`, 3200), 900);
    trackEvent('weather_event', { kind, protected: true, plots: exposed.length });   // [GA4]
  } else {
    exposed.forEach(wiltPlot);
    setTimeout(() => {
      ui.toast?.(`${s.ico} ${s.hit} 작물 ${exposed.length}개가 시들었어요… ⛏️ 괭이로 갈면 다시 심을 수 있어요`, 3800);
      firstHint('severe', s.ico, `${s.name}가 지나갔어요`,
        `예보가 뜬 날엔 작물을 미리 수확하거나, 작업대에서 🛡️ 덮개를 설치하면 밭을 지킬 수 있어요. 시든 밭은 ⛏️ 괭이로 갈면 다시 심을 수 있어요.`);
    }, 900);
    trackEvent('weather_event', { kind, protected: false, plots: exposed.length });  // [GA4]
  }
  st.coveredFor = null;
  refreshCovers();
  requestSave();
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
  if (nearDoor === 'cafe') return enterCafe();
  if (nearDoor === 'cafeexit') return exitCafe();
  if (nearDoor === 'river') return enterRiver();
  if (nearDoor === 'riverexit') return exitRiver();
  if (nearDoor === 'mist') return enterMist();
  if (nearDoor === 'mistexit') return exitMist();
  if (atMist) { mistAction(); return; }
  if (atRiver) {                  // 🛶 나루터 데크: 배 타기 / 창고 열기
    if (nearBoat) return startBoatRun();
    if (nearBoatShop) { trackEvent('boat_shop_open'); return ui.openBoatShop?.(boatShopView()); }
    ui.toast?.('🛶 정박한 배로 가면 강을 내려갈 수 있어요');
    return;
  }
  if (atMine) {                   // 동굴: 괭이로만 채굴 가능
    if (TOOLS[currentTool].id === 'hoe') return tryMine();
    ui.toast?.('⛏️ 괭이(도구 2)로 캐야 해요');
    return;
  }
  if (atCafe) {                   // ☕ 홀: 손님에게 서빙 / 주문판 열기
    if (nearCafeGuest) return serveCafeGuest(nearCafeGuest);
    if (nearCafeBoard) { trackEvent('cafe_open'); return ui.openCafe?.(cafeView()); }
    ui.toast?.('☕ 손님에게 다가가 액션을 누르면 서빙해요');
    return;
  }
  // 실내에선 도구질(밭갈기·낚시 등) 금지 — 가구 배치만(선택 중이면 발 앞에 놓기)
  if (indoor) {
    if (placingDecor) placeDecor(placingDecor, player.position.x, player.position.z);
    else ui.toast?.('🎨 꾸미기 버튼으로 가구를 골라 배치하세요');
    return;
  }
  if (placingOutdoor) return placeOutdoor(player.position.x, player.position.z); // 야외 장식 설치 중이면 발밑에 설치
  if (nearKitchen) { trackEvent('kitchen_open'); return ui.openKitchen?.(kitchenView()); } // 🍳 자유주방 → 요리 미니게임 메뉴판
  if (nearBench) return ui.openCook?.();   // 작업대 근처 → 제작 메뉴(도구·야외·선물)
  if (nearShop) return ui.openShop?.();    // 상점 근처 → 상점 메뉴
  if (nearMarket) { ui.act?.('market'); return ui.openMarket?.(marketData()); } // 📊 전광판 → 시세판 모달(튜토리얼: 시세 확인)
  if (nearCoop) return coopInteract();     // 🐔 닭장 → 건설/모이/달걀
  // 🍄 채집 — 도구가 필요 없는 "줍기". 단, 도끼를 들고 더 가까운 나무가 있으면 벌목에 양보
  const fg = forageTarget();
  if (fg) {
    let treeD = Infinity;
    if (TOOLS[currentTool].id === 'axe') {
      for (const tr of trees) if (!tr.userData.fallen) treeD = Math.min(treeD, dist2D(tr.position, player.position));
    }
    if (treeD >= fg.d) return tryForage(fg.node);
  }
  // 🐾 밤손님 흔적 조사 — 도구가 필요 없는 "줍기"류. 모바일 액션 버튼으로도 동일 동작
  const tr = traceObjs.find(t => dist2D(t.mesh.position, player.position) < 1.7);
  if (tr) return investigateTrace(tr);
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
    case 'net': return tryNet();
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
  refreshCovers();          // 🛡️ 덮개 설치 중이면 새로 심은 밭에도 표시
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
  refreshCovers();          // 🛡️ 수확한 빈 밭에선 덮개 표시 제거
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
// scale: 좁은 화면·가까운 카메라(🛶 뱃놀이 등)에서 줄여 그리기 위한 배율(기본 1)
function spawnFloatText(x, y, z, text, color = '#3a4a40', scale = 1) {
  const cv = document.createElement('canvas');
  let c = cv.getContext('2d');
  c.font = 'bold 52px sans-serif';
  // 캔버스 폭을 텍스트 길이에 맞춤 — 고정 256px 이던 시절 긴 한글("배가 가라앉아요…")이 잘렸음
  const w = Math.ceil(Math.min(1024, Math.max(256, c.measureText(text).width + 48)));
  cv.width = w; cv.height = 96;                       // width 대입 → 컨텍스트 상태 리셋됨
  c = cv.getContext('2d');
  c.font = 'bold 52px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,0.92)'; c.strokeText(text, w / 2, 48);
  c.fillStyle = color; c.fillText(text, w / 2, 48);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(0.72 * (w / 96) * scale, 0.72 * scale, 1);   // 캔버스 비율 유지(w=256, scale=1 → 기존 1.9와 동일)
  sp.position.set(x, y, z);
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
const RES_LABEL = { wood: '목재', seed: '씨앗', crop: '작물', fish: '물고기', coins: '🪙코인', stone: '돌', coal: '석탄', gem: '보석', egg: '달걀', bug: '반딧불이', forage: '채집물', star: '⭐별조각', glow: '✨정령빛' };

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
      // 🚧 주민도 통과 못 함. 배회하니 콜라이더 좌표를 매 프레임 따라가게 한다(updateNPC)
      collider: solidCircle(def.pos[0], def.pos[2], NPC_R),
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
    o.collider.x = o.group.position.x; o.collider.z = o.group.position.z;          // 🚧 콜라이더 동기화
    updateNPCGlyph(o);
  }
}
// 주민이 들어가면 안 되는 자리(건물·호수·나무 등) — 밭 금지 구역보다 여유를 적게 둬 벽에 바짝 설 수 있게
function npcBlocked(x, z) {
  // 플레이어 자리도 피한다 — 안 그러면 배회하다 플레이어를 밀고 지나간다
  if (player && Math.hypot(x - player.position.x, z - player.position.z) < NPC_R + PLAYER_R + 0.2) return true;
  return obstacles.some(ob => Math.hypot(x - ob.x, z - ob.z) < ob.r + 0.35);
}

function wanderNPC(o, dt) {
  o.wanderTimer -= dt;
  if (o.wanderTimer <= 0) {
    o.wanderTimer = 3 + Math.random() * 4;
    // 건물·호수 안쪽은 목적지로 고르지 않음(카페·닭장·집을 뚫고 지나가던 문제)
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.6;
      const nx = o.home.x + Math.cos(a) * r, nz = o.home.z + Math.sin(a) * r;
      if (!npcBlocked(nx, nz)) { o.target.set(nx, 0, nz); break; }
      if (i === 5) o.target.copy(o.home);   // 전부 막혔으면 제자리
    }
  }
  const dx = o.target.x - o.group.position.x, dz = o.target.z - o.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.06) {
    const nx = o.group.position.x + (dx / d) * 0.5 * dt;
    const nz = o.group.position.z + (dz / d) * 0.5 * dt;
    // 이미 막힌 자리에 서 있다면(나무가 나중에 생긴 경우 등) 빠져나올 수 있게 이동을 허용
    if (npcBlocked(nx, nz) && !npcBlocked(o.group.position.x, o.group.position.z)) { o.wanderTimer = 0; return; }
    o.group.position.x = nx; o.group.position.z = nz;
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
