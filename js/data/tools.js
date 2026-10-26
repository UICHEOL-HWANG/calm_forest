// =============================================================
//  📦 작물 종류·도구 표·도구 페이지·농사 타이머
//  ------------------------------------------------------------
//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).
//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.
//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md
// =============================================================
import { ADV_CROPS } from '../farm-crops.js';
import { iconHtml, iconById } from '../icons/index.js';

export const CROP_TYPES = [
  { id: 'carrot',    name: '당근',   fruit: 0xff9e5e },
  { id: 'tomato',    name: '토마토', fruit: 0xff7b7b },
  { id: 'blueberry', name: '블루베리', fruit: 0x8aa8ff },
  { id: 'pumpkin',   name: '호박',   fruit: 0xffc36e },
  ...ADV_CROPS,   // 🌾 고급 3종(adv:true) — 표는 js/farm-crops.js. 랜덤 심기는 BASIC_CROPS 에서만 뽑는다
];

export const BASIC_CROPS = CROP_TYPES.filter(c => !c.adv);

export const TOOLS = [
  { id: 'axe',    name: '도끼',     ico: iconHtml('🪓'), grp: 'out'  }, // 벌목
  { id: 'hoe',    name: '괭이',     ico: iconHtml('⛏️'), grp: 'farm' }, // 밭 갈기 · 채굴
  { id: 'seed',   name: '씨앗',     ico: iconHtml('🌰'), grp: 'farm' }, // 씨앗 심기
  { id: 'water',  name: '물조리개', ico: iconHtml('💧'), grp: 'farm' }, // 물주기
  { id: 'sickle', name: '낫',       ico: iconById('sickle'), grp: 'farm' }, // 수확
  { id: 'shovel', name: '삽',       ico: iconHtml('🪏'), grp: 'farm' }, // 빈 밭 메우기(두 번 파기) — 농사 세트 5번째 칸. 🪏 는 Emoji 16.0(2024)이라 구형 기기에선 □ 로 보일 수 있음
  { id: 'hammer', name: '망치',     ico: iconHtml('🔨'), grp: 'out'  }, // 건축
  { id: 'rod',    name: '낚싯대',   ico: iconHtml('🎣'), grp: 'out'  }, // 낚시(호수)
  { id: 'net',    name: '포충망',   ico: iconById('net'), grp: 'out'  }, // 🌟 반딧불이 잡기(밤·남쪽 숲)
];

//   8칸을 늘 펼쳐두니 하단이 답답해서, 4칸씩 두 벌로 나누고 ✋맨손(접기)을 하나 더 뒀다.
//   · 자동   — 구역에 들어가면 알아서 넘어간다(숲·실내는 맨손). 마을은 자동 없음.
//   · 수동   — 하단바 왼쪽 칩을 눌러 순환. 자동을 덮어쓴다.
//   · 숫자키 — 1 = 세트 전환, 2~5 = 지금 펼친 세트의 도구 4개.
//     화면 슬롯에 적힌 번호와 정확히 같다(예전엔 절대 번호라 🏕️세트가 1·6·7·8 로 튀었다).
export const TOOL_PAGES = [
  { id: 'farm', name: '농사',     ico: iconHtml('🌾') },
  { id: 'out',  name: '야외도구', ico: iconHtml('🏕️') },
  { id: 'none', name: '맨손',     ico: iconHtml('✋') },
];

export const CHOP_WOOD = 3;                                    // 🪵 나무 한 그루를 쓰러뜨릴 때 목재(타격마다는 0)

export const TREE_RESPAWN_SEC = 30;                            // 🌳 쓰러진 나무 재생 시간(초)

// 🌾 작물 속도 — 베타 피드백 "너무 빨리 자라고 빨리 시든다"(2026-09-11)
//   자라는 속도 = 물 주는 간격(WET_TIME). 물 1회 +0.4 에 수확 기준이 growth>=0.8 이라 물 2번이면 끝 —
//   5초일 땐 심고 5초 뒤에 벌써 수확이었다(지금은 9초). 더 늦추려면 tryWater 의 성장량을 낮춘다.
//   시드는 시간은 흙이 마른 뒤부터 세므로, 한 번 자리를 비우면 22초 만에 밭이 전멸했다.
export const WET_TIME = 9;    // 물 준 뒤 흙이 촉촉하게 유지되는 시간(초) — 마르면 다시 물 필요

export const WILT_TIME = 60;  // 물 없이 목마른 채 방치되면 시드는 시간(초)

// 구역별 기본 페이지. 마을은 일부러 비워 뒀다 —
// 밭일·벌목·건축이 한곳에 뒤섞이는 곳이라, 자동으로 넘기면 방금 고른 도구를 뺏는 꼴이 된다.
export const ZONE_PAGE = {
  indoor: 'none', cafe: 'none', forest: 'none', river: 'none', mist: 'none', museum: 'none', observatory: 'none', neighbor: 'none', dream: 'none', mirror: 'none', halloween: 'none', mountain: 'none',
  farm: 'farm', mine: 'farm',        // ⛏️괭이 — 밭갈기·채굴 둘 다 농사 페이지에 있다
  orchard: 'farm',                   // 🍎 심기·물주기·수확(🌰💧🌾)이 전부 농사 페이지다. 이 줄이 없어서
                                     //    과수원만 페이지가 안 열렸고, 묘목 종류를 바꾸려면(🌰 다시 누르기)
                                     //    페이지 넘기기를 한 번 더 눌러야 했다. 🪓베기는 'out' 이라 명시적으로 넘긴다(의도대로)
  glade: 'out',                      // 🦋포충망(밤 반딧불이)
};

// 세트만으론 부족한 구역 — 들 도구까지 정해 준다. 광산은 ⛏️괭이 말고 할 일이 없는데
// 세트만 펴 주면 마지막에 쓰던 🌰씨앗·낫이 손에 남아 "눌러도 안 캐진다"가 됐다(베타 피드백).
export const ZONE_TOOL = { mine: 'hoe' };
