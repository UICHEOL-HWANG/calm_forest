export const DELVE_FLOORS = 20;
export const DELVE_STOPS = [5, 10, 15, 20];
export const DELVE_CHEST_FLOORS = [10, 20];
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
  { id: 'earth', from: 1, to: 10, pests: ['axolotl', 'crab'], floor: 0x3a3a40, rock: 0x565b66 },
  { id: 'crystal', from: 11, to: 20, pests: ['bat', 'grub'], floor: 0x2c2a3a, rock: 0x4a4660 },
];

export const PESTS = {
  axolotl: { ico: '🦎', name: '동굴 도롱뇽', counter: 'tap', speed: 1.6 },
  crab: { ico: '💎', name: '수정집게', counter: 'bait', speed: 0.9 },
  bat: { ico: '🦇', name: '잎귀박쥐', counter: 'grab', speed: 3.0 },
  grub: { ico: '🐛', name: '등불벌레', counter: 'reclaim', speed: 1.2 },
};

export const PEST_COPY = {
  common: { ico: '⛏️', title: '조각 도둑', line: '가방은 안전해요. 조각만 노려요', prompt: null },
  axolotl: { ico: '🦎', title: '동굴 도롱뇽', line: '웅덩이 아가미를 톡 치면 뱉어요', prompt: '❗ 톡 치기' },
  crab: { ico: '💎', title: '수정집게', line: '먹보예요. 🍄 미끼를 던져요', prompt: '🍄 미끼 던지기' },
  bat: { ico: '🦇', title: '잎귀박쥐', line: '반짝이면 툭! 조각은 바로 주워요', prompt: null },
  grub: { ico: '🐛', title: '등불벌레', line: '놓쳐도 OK. 빛 자국 끝 굴로', prompt: '⛏️ 굴 파기' },
};

export const MINER_STEPS = [
  { id: 'reopen', title: '승강기 고치기', desc: '⚫ 석탄 3개 가져다주기', check: { kind: 'inv', key: 'coal', n: 3, take: true }, reward: { unlock: 1 },
    ask: ['어이쿠, 손님이군. 여긴 오래된 갱도라네', '승강기가 멈춰서 아래로 못 내려가고 있지', '⚫ 석탄 3개만 캐 오게. 불을 때면 다시 돌아갈 거야'] },
  { id: 'tap', title: '웅덩이 속 도둑', desc: '🦎 웅덩이 아가미 톡 치기', check: { kind: 'count', key: 'tap', n: 1 }, reward: { gem: 1 },
    ask: ['승강기가 다시 도네! 이제 내려갈 수 있어', '아래 웅덩이에 🦎 도롱뇽이 숨어 광석을 노린다네', '아가미가 보이면 톡 쳐서 쫓아 주게'] },
  { id: 'stop5', title: '첫 정류장', desc: '🪜 지하 5층까지 내려가기', check: { kind: 'floor', n: 5 }, reward: {},
    ask: ['그 녀석 한동안 얌전하겠군', '🪜 지하 5층까지 내려가 보게. 거기 정류장이 있다네'] },
  { id: 'bait', title: '먹보 달래기', desc: '🍄 수정집게에게 미끼 던지기', check: { kind: 'count', key: 'bait', n: 1 }, reward: { forage: 3 },
    ask: ['5층 정류장이 열렸군. 다음부턴 승강기로 바로 가게', '💎 수정집게는 먹보라네. 🍄 버섯을 던져 달래 주게'] },
  { id: 'chest10', title: '10층 보물상자', desc: '🧰 지하 10층 상자 열기', check: { kind: 'chest', n: 10 }, reward: { cosmetic: 'miner_lamp' },
    ask: ['집게가 배불러서 길을 비켜 줬겠군', '🧰 지하 10층에 옛 광부들 상자가 있다네. 찾아 열어 보게'] },
  { id: 'grab', title: '반짝이 사수', desc: '🦇 박쥐 앞에서 조각 바로 줍기 3번', check: { kind: 'count', key: 'grab', n: 3 }, reward: { crystal: 2 },
    ask: ['상자에 내 옛 헬멧이 있었군! 자네가 쓰게', '🦇 박쥐는 떨어진 조각을 채 간다네', '노란 고리가 끝나기 전에 3번 주워 보게'] },
  { id: 'reclaim', title: '빛을 따라', desc: '🐛 굴에서 조각 되찾기', check: { kind: 'count', key: 'reclaim', n: 1 }, reward: {},
    ask: ['손이 빠르구먼!', '🐛 등불벌레가 조각을 굴로 끌고 가면', '빛 자국을 따라가 되찾아 오게'] },
  { id: 'bottom', title: '바닥까지', desc: '🪜 지하 20층까지 내려가기', check: { kind: 'floor', n: 20 }, reward: { decor: 'mine_cart' },
    ask: ['빛 자국을 잘 따라갔군', '🪜 이제 맨 아래, 지하 20층까지 내려가 보게'] },
];
export const MINER_DONE_LINES = ['바닥까지 갔다니! 자네가 진짜 광부일세', '🛒 이 광산 수레는 자네 거라네', '이제 매일 일감을 하나씩 맡기겠네'];
export const MINER_NAG = '아직이네. 이걸 부탁하네';
