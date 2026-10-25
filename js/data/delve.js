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
  { id: 'reopen', title: '갱도 다시 열기', desc: '⚫ 석탄 3개 가져다주기', check: { kind: 'inv', key: 'coal', n: 3, take: true }, reward: { unlock: 1 } },
  { id: 'tap', title: '웅덩이 속 도둑', desc: '🦎 웅덩이 아가미 톡 치기', check: { kind: 'count', key: 'tap', n: 1 }, reward: { gem: 1 } },
  { id: 'stop5', title: '첫 정류장', desc: '🪜 지하 5층까지 내려가기', check: { kind: 'floor', n: 5 }, reward: {} },
  { id: 'bait', title: '먹보 달래기', desc: '🍄 수정집게에게 미끼 던지기', check: { kind: 'count', key: 'bait', n: 1 }, reward: { forage: 3 } },
  { id: 'chest10', title: '10층 보물상자', desc: '🧰 지하 10층 상자 열기', check: { kind: 'chest', n: 10 }, reward: { cosmetic: 'miner_lamp' } },
  { id: 'grab', title: '반짝이 사수', desc: '🦇 박쥐 앞에서 조각 바로 줍기 3번', check: { kind: 'count', key: 'grab', n: 3 }, reward: { crystal: 2 } },
  { id: 'reclaim', title: '빛을 따라', desc: '🐛 굴에서 조각 되찾기', check: { kind: 'count', key: 'reclaim', n: 1 }, reward: {} },
  { id: 'bottom', title: '바닥까지', desc: '🪜 지하 20층까지 내려가기', check: { kind: 'floor', n: 20 }, reward: { decor: 'mine_cart' } },
];
