export const DELVE_FLOORS = 20;
export const DELVE_STOPS = [5, 10, 15, 20];
export const DELVE_CHEST_FLOORS = [10, 20];
export const ROOT_SHRINE_FLOOR = 20;
export const DELVE_HALF = 8;
export const VEINS_PER_FLOOR = 2;
export const PLAIN_ROCKS = [4, 6];
export const LADDER_PITY = 5;
export const LADDER_MIN_FRAC = 0.6;
export const BURROW_MIN_FROM_ARRIVAL = 5;
export const CRYSTAL_PRICE = 25;

export const ORE_ODDS = {
  shallowGem: [0.04, 0.08],
  deepGem: [0.10, 0.18],
  crystal: 0.10,
  coalShare: { shallow: 0.45, deep: 0.6 },
};

export const THEMES = [
  { id: 'earth', from: 1, to: 10, pests: ['axolotl', 'crab', 'mole', 'dormouse'], floor: 0x3a3a40, rock: 0x565b66 },
  { id: 'crystal', from: 11, to: 20, pests: ['bat', 'grub', 'moth', 'roller'], floor: 0x2c2a3a, rock: 0x4a4660 },
];

export const PESTS = {
  axolotl: { ico: '🦎', name: '동굴 도롱뇽', counter: 'tap', speed: 1.6 },
  crab: { ico: '💎', name: '수정집게', counter: 'bait', speed: 0.9 },
  bat: { ico: '🦇', name: '잎귀박쥐', counter: 'grab', speed: 3.0 },
  grub: { ico: '🐛', name: '등불벌레', counter: 'reclaim', speed: 1.2 },
  mole: { ico: '⭐', name: '별코두더지', counter: 'plug', speed: 1.4 },
  dormouse: { ico: '🐭', name: '겨울잠쥐', counter: 'soft', speed: 1.2 },
  moth: { ico: '🦋', name: '달빛나방', counter: 'dark', speed: 2.2 },
  roller: { ico: '🔮', name: '수정공굴리', counter: 'pick', speed: 1.6 },
};

export const VEIN_HP = 5;
export const PEST_LURK_DIST = 0.7;
export const PEST_CATCH_R = 1.0;
export const PEST_DARK_SEC = 6;
export const PEST_LOST_SEC = 6;
export const SOFT_PERIOD = 1.4;
export const SOFT_WINDOW = [0.38, 0.62];
export const MIMIC_DIST = 0.9;

export const PEST_COPY = {
  axolotl: { ico: '🦎', title: '동굴 도롱뇽이 조각을 노려요', line: '웅덩이로 물고 가요 · 톡 치면 뱉어요', prompt: '❗ 톡 치기', took: '🦎 동굴 도롱뇽이 조각을 물고 갔어요',
    steps: [{ ico: '💎', label: '조각을 물고' }, { ico: '💧', label: '웅덩이로 가요' }, { ico: '❗', label: '톡 치면 뱉어요' }] },
  crab: { ico: '💎', title: '수정집게가 조각을 노려요', line: '🍄 미끼를 주면 먹느라 멈춰요', prompt: '🍄 미끼 던지기', took: '💎 수정집게가 조각을 물고 갔어요',
    steps: [{ ico: '💎', label: '조각을 집어' }, { ico: '🕳️', label: '굴로 가져가요' }, { ico: '🍄', label: '버섯을 주면 멈춰요' }] },
  bat: { ico: '🦇', title: '잎귀박쥐가 조각을 노려요', line: '노란 고리가 사라지기 전에 주워요', prompt: null, took: '🦇 잎귀박쥐가 조각을 물고 갔어요',
    steps: [{ ico: '✨', label: '노란 고리 동안은' }, { ico: '✋', label: '먼저 주우면 지켜요' }, { ico: '🦇', label: '끝나면 채 가요' }] },
  grub: { ico: '🐛', title: '등불벌레가 조각을 노려요', line: '놓쳐도 빛 자국 끝 굴을 파면 돼요', prompt: '⛏️ 굴 파기', took: '🐛 등불벌레가 조각을 물고 갔어요',
    steps: [{ ico: '💎', label: '조각을 끌고' }, { ico: '✨', label: '빛 자국을 남겨요' }, { ico: '⛏️', label: '끝의 굴을 파요' }] },
  mole: { ico: '⭐', title: '별코두더지가 조각을 노려요', line: '구멍에 숨어 기다려요 · 돌로 막아요', prompt: '🪨 구멍 막기', took: '⭐ 별코두더지가 조각을 물고 갔어요',
    steps: [{ ico: '🕳️', label: '구멍에 숨어' }, { ico: '💎', label: '조각을 노려요' }, { ico: '🪨', label: '막으면 길을 잃어요' }] },
  dormouse: { ico: '🐭', title: '겨울잠쥐가 조각을 노려요', line: '깨는 소리에 일어나요 · 끝은 살살 캐요', prompt: '🤫 살살 캐기', took: '🐭 겨울잠쥐가 조각을 물고 갔어요',
    steps: [{ ico: '💤', label: '광맥 옆에서 자요' }, { ico: '💥', label: '깨지는 소리에 깨요' }, { ico: '🤫', label: '초록일 때 살살 캐요' }] },
  moth: { ico: '🦋', title: '달빛나방이 조각을 노려요', line: '불빛을 따라와요 · 잠깐 불을 꺼요', prompt: '🌑 불 끄기', took: '🦋 달빛나방이 조각을 물고 갔어요',
    steps: [{ ico: '🏮', label: '불빛을 따라와' }, { ico: '💎', label: '조각을 노려요' }, { ico: '🌑', label: '불을 끄면 떠나요' }] },
  roller: { ico: '🔮', title: '수정공굴리가 조각을 노려요', line: '조각인 척해요 · 귀가 보이면 가짜예요', prompt: null, took: '🔮 수정공굴리가 조각을 굴려 갔어요',
    steps: [{ ico: '🔮', label: '몸을 말아' }, { ico: '💎', label: '조각인 척해요' }, { ico: '👂', label: '귀 없는 쪽이 진짜' }] },
};

export const PEST_LINES = {
  eat: n => `수정집게가 버섯을 먹어요 · ${n}초`,
  ran: '도롱뇽이 놀라서 도망가요',
  dark: '불을 끄자 달빛나방이 수정 쪽으로 가요',
  plug: '구멍을 막았어요 · 별코두더지가 헤매요',
  soft: '쉿! 겨울잠쥐가 계속 자요',
  fake: '앗, 가짜였어요',
  real: '진짜를 골랐어요',
  spat: '조각을 뱉었어요',
  result: (floor, kept, lost) => `⛏️ 지하 ${floor}층 · 지킨 조각 ${kept} · 뺏긴 조각 ${lost}`,
};

export const MINER_STEPS = [
  { id: 'reopen', title: '승강기 고치기', desc: '⚫ 석탄 3개 가져다주기', check: { kind: 'inv', key: 'coal', n: 3, take: true }, reward: { unlock: 1 },
    ask: ['어이쿠, 손님이군. 여긴 오래된 갱도라네', '옛날엔 등불이 꺼지지 않던 곳이지', '승강기가 멈춰서 아래로 못 내려가고 있지', '⚫ 석탄 3개만 캐 오게. 불을 때면 다시 돌아갈 거야'] },
  { id: 'tap', title: '웅덩이 속 도둑', desc: '🦎 웅덩이 아가미 톡 치기 · 지하 1~10층', check: { kind: 'count', key: 'tap', n: 1 }, reward: { gem: 1 },
    ask: ['승강기가 다시 도네! 이제 내려갈 수 있어', '아래 웅덩이에 🦎 도롱뇽이 숨어 광석을 노린다네', '광맥을 캐면 다가와 기다리지. 그때 톡 쳐서 쫓아 주게'] },
  { id: 'stop5', title: '첫 정류장', desc: '🪜 지하 5층까지 내려가기', check: { kind: 'floor', n: 5 }, reward: {},
    ask: ['그 녀석 한동안 얌전하겠군', '🪜 지하 5층까지 내려가 보게. 거기 정류장이 있다네'] },
  { id: 'bait', title: '먹보 달래기', desc: '🍄 수정집게에게 버섯 미끼 던지기 · 지하 1~10층', check: { kind: 'count', key: 'bait', n: 1 }, reward: { forage: 3 },
    ask: ['5층 정류장이 열렸군. 다음부턴 승강기로 바로 가게', '💎 수정집게는 먹보라네. 🍄 버섯을 던져 달래 주게'] },
  { id: 'chest10', title: '10층 보물상자', desc: '🧰 지하 10층 상자 열기', check: { kind: 'chest', n: 10 }, reward: { cosmetic: 'miner_lamp' },
    ask: ['집게가 배불러서 길을 비켜 줬겠군', '🧰 지하 10층에 옛 광부들 상자가 있다네. 찾아 열어 보게'] },
  { id: 'grab', title: '반짝이 사수', desc: '🦇 박쥐 앞에서 조각 바로 줍기 3번 · 지하 11~20층', check: { kind: 'count', key: 'grab', n: 3 }, reward: { crystal: 2 },
    ask: ['상자에 내 옛 헬멧이 있었군! 자네가 쓰게', '우린 그걸 쓰고 뿌리 곁을 지켰다네', '🦇 박쥐는 떨어진 조각을 채 간다네', '노란 고리가 끝나기 전에 3번 주워 보게'] },
  { id: 'reclaim', title: '빛을 따라', desc: '🐛 굴에서 조각 되찾기 · 지하 11~20층', check: { kind: 'count', key: 'reclaim', n: 1 }, reward: {},
    ask: ['손이 빠르구먼!', '🐛 등불벌레가 조각을 굴로 끌고 가면', '빛 자국을 따라가 되찾아 오게'] },
  { id: 'bottom', title: '바닥까지', desc: '🪜 지하 20층까지 내려가기', check: { kind: 'floor', n: 20 }, reward: { decor: 'mine_cart' },
    ask: ['빛 자국을 잘 따라갔군', '🪜 이제 맨 아래, 지하 20층까지 내려가 보게', '맨 아래엔 우리가 지키던 게 있다네'] },
];
export const MINER_DONE_LINES = ['뿌리에 빛이 돌았다고? 자네가 해냈군', '우리 광부들은 원래 뿌리지기였다네', '저 위 세계수까지 이어진 뿌리지', '뿌리가 마르자 갱도가 어두워져 다들 떠났다네', '🛒 이 광산 수레는 자네 거라네', '이제 매일 일감을 하나씩 맡기겠네'];
export const ROOT_CINE_TOAST = '🌱 마른 뿌리에 다시 빛이 돌아요';
export const MINER_NAG = '아직이네. 이걸 부탁하네';
