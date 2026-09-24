// =============================================================
//  📦 도감·배지·메인 이야기·닉네임·출석 보상
//  ------------------------------------------------------------
//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).
//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.
//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md
// =============================================================
import { VISITORS } from '../habitat.js';
import { RECIPES } from './catalog.js';
import { CAFE_GUESTS } from './places.js';
import { NPCS } from './npcs.js';

//    게스트에겐 마일스톤마다 "로그인하면 영구 보존" 넛지(회원 유치 훅)
export const DEX = {
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
    { id: 'wheat',     name: '밀',       ico: '🌾' },   // 🌾 고급 작물 3종(js/farm-crops.js)
    { id: 'corn',      name: '옥수수',   ico: '🌽' },
    { id: 'grape',     name: '포도',     ico: '🍇' },
  ],
  ore: [
    { id: 'stone', name: '돌',   ico: '🪨' },
    { id: 'coal',  name: '석탄', ico: '⚫' },
    { id: 'gem',   name: '보석', ico: '💎' },
  ],
  // 🍳 요리 — RECIPES 에서 파생. 레시피를 늘릴 때 도감을 따로 고치는 걸 잊어 빈칸이 생기던 걸 막는다
  cook: RECIPES.map(r => ({ id: r.id, name: r.name, ico: r.ico })),
  // ⚠️ **NPCS 에서 파생한다.** 손으로 적어 두면 주민을 추가할 때마다 빠뜨린다 —
  //    실제로 🦡숲지기·⭐별 보는 아이·🦆사공·🐔목장 아주머니가 빠져 있었고,
  //    도감 토스트에 이름 대신 id 가 그대로 떴다(🧑‍🦳큐레이터를 넣다 발견).
  npc: [
    ...NPCS.map(n => ({ id: n.id, name: n.name, ico: n.emoji })),
    // ☕ 카페 손님 — 마을에 살지 않는 이웃들(서빙하면 채워짐). CAFE_GUESTS 에서 파생
    ...CAFE_GUESTS.map(g => ({ id: g.id, name: g.name, ico: g.emoji })),
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
  // 🪏 땅속에서 — 삽으로 빈 밭을 완전히 메운 순간(2타) 낮은 확률로 나옴(DIG_DEX). 재료·코인은 없고 도감만
  dig: [
    { id: 'worm',     name: '지렁이',   ico: '🪱' },   // 10%
    { id: 'shard',    name: '사금파리', ico: '🏺' },   // 5%
    { id: 'old_coin', name: '옛 동전',  ico: '🪙' },   // 2% — 이름만 동전, 코인 지급 없음
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
  // 🦋 방문객 — 텃밭 환경을 만들면 스스로 찾아온다. 조건·판정의 단일 출처는 js/habitat.js 다.
  //   여기서 표를 다시 적지 않는다(주민 도감을 손으로 적어 4명이 빠졌던 사고와 같은 유형).
  visitor: VISITORS.map(v => ({ id: v.id, name: v.name, ico: v.ico })),
};

// 전 카테고리 합. ⚠️ 여기에 숫자를 적어두지 않는다 — npc·cook 이 NPCS/CAFE_GUESTS/RECIPES 에서
//    파생하므로 주민·레시피를 늘릴 때마다 조용히 낡는다(실제로 "33종" 주석이 오래 남아 70종인 걸 가렸다).
//    지금 값이 궁금하면 도감 제목(📖 도감 n/m)이나 dexCount() 를 본다.
export const DEX_TOTAL = Object.values(DEX).reduce((n, list) => n + list.length, 0);

//    조건은 syncBadges()가 판정(옛 세이브도 접속 시 소급 지급)
export const BADGES = [
  { id: 'house',       name: '내 집 마련',     ico: '🏠', desc: '집 완성하기',            reward: { coins: 20 } },
  { id: 'modern',      name: '드림 하우스',    ico: '🏙️', desc: '루프탑 빌라까지 증축',    reward: { coins: 100 } },
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

//  프롤로그 컷신에서 이어지는 4개의 장. 새 시스템이 아니라 "이미 하게 될 일"에 서사와 순서를 얹는다.
//  강제 없음(코지 문법): HUD 칩이 "다음에 하면 좋은 것"을 알려주고, 조건이 차면 어디서든 완료된다.
//  안내자는 🦉 의뢰 올빼미 — 완료 모달의 기록자 화자.
export const STORY = [
  {
    id: 'home', ico: '🏠', title: '나의 첫 집', goal: '내 집 짓기',
    start: '떠돌이 생활은 오늘로 끝. 마을 한켠의 빈터에 내 집을 지어보자. 나무를 베면 목재를 얻을 수 있어요.',
    done: '지붕이 올라갔어요. 오늘부터 여기서 잠들 수 있어요.',
    reward: { coins: 40 },
  },
  {
    id: 'friends', ico: '💬', title: '숲의 이웃들', goal: '주민 의뢰 3번',
    start: '이 숲엔 먼저 자리 잡은 이웃들이 있어요. ❕ 말풍선이 뜬 주민을 도와주며 얼굴을 익혀보자.',
    done: '이웃 셋의 부탁을 들어줬어요. 이제 서로 얼굴을 알아요.',
    reward: { seed: 5, coins: 30 },
  },
  {
    id: 'taste', ico: '🍳', title: '첫 요리', goal: '요리하고 서빙하기',
    start: '숲에서 거둔 재료로 요리를 해보자. 주방에서 만들어 카페 손님에게 내면 돼요.',
    done: '첫 요리를 손님상에 냈어요. 카페에 소문이 돌기 시작해요.',
    reward: { coins: 50 },
  },
  {
    id: 'secret', ico: '🌿', title: '잎사귀의 주인', goal: '안개 걷어내기',
    start: '북서쪽 숲엔 걷히지 않는 안개가 있대요. 문득, 그날 바람에 실려 온 잎사귀가 떠올라요.',
    done: '안개가 걷히고 수호목이 말했어요. "그 잎사귀, 내가 보낸 거란다. 먼 길 오느라 고생했어."',
    reward: { coins: 80 },
  },
];

//    유일성은 #태그(4자리)로 충돌을 낮추고, 진짜 유니크 보장은 리더보드 profiles 테이블에서(다음 단계).
export const NICK_ADJS = ['조용한', '포근한', '느긋한', '반짝이는', '부지런한', '졸린', '씩씩한', '다정한', '호기심 많은', '바람 같은', '노래하는', '새벽의', '별 헤는', '숲속의'];

export const DAILY_COINS = [5, 8, 12, 16, 20, 25, 30];   // 1~7일차(이후 30 고정)
