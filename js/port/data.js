export const PANTRY_KEYS = ['fish', 'bigfish', 'squid', 'shrimp', 'clam', 'rice', 'veg'];
export const PANTRY_ICO = { fish: '🐟', bigfish: '🐠', squid: '🦑', shrimp: '🦐', clam: '🐚', rice: '🍚', veg: '🥬' };

export const ISLAND = { x: 44, z: 0 };
export const ISLAND_R = 20;
export const WALK_R = ISLAND_R - 0.8;
export const LAND_Y = 0.6;
export const VILLAGE_DOCK = { x: -25.5, z: 0 };
export const ISLAND_DOCK = { x: 20.6, z: 0 };
export const PIER_END = { x: 22.6, z: 0 };
export const ROUTE = [[-25.5, 0], [-18, -4.6], [-7, -0.5], [2, 5.2], [11, 1], [16, -3.6], [20.6, 0]];
export const SEA_BOUNDS = { x0: -26, x1: 28, z0: -24, z1: 24 };
export const MARKET_POS = { x: 32, z: -6 };
export const HUT_POS = { x: 29.6, z: 8 };
export const LIGHT_POS = { x: 60, z: -9 };
export const SOLIDS = [[MARKET_POS, 1.6], [HUT_POS, 1.9], [LIGHT_POS, 1.2]];

export const BOAT_SPEED = 6;
export const BOAT_TURN = 5;
export const FAST_MULT = 2.6;
export const BITE_FIRST = { delay: 1.4, win: 2.2 };
export const BITE_WIN = 0.9;
export const MARKET_PRICE = 30;
export const MARKET_GIVE = { rice: 2, veg: 2 };

export const SEA_SPOTS = [
  { at: [-17, -5], zone: 'near' }, { at: [-8, 6.5], zone: 'near' }, { at: [3, -6], zone: 'near' }, { at: [12, 6], zone: 'near' },
  { at: [-6, -17], zone: 'far' }, { at: [9, 18], zone: 'far' }, { at: [20, -16], zone: 'far' },
  { at: [-1, 13], zone: 'night' }, { at: [6, -13], zone: 'night' },
];
export const PIER_SPOT = { at: [19.6, -2.6], zone: 'pier' };
export const SPOT_LEFT = { near: 2, far: 3, night: 2, pier: 2 };
export const CATCH = {
  near: [['fish', 0.75], ['shrimp', 0.25]],
  far: [['squid', 0.45], ['fish', 0.3], ['bigfish', 0.25]],
  night: [['squid', 0.8], ['bigfish', 0.2]],
  pier: [['fish', 0.85], ['shrimp', 0.15]],
};

export const QUESTS = [
  { id: 'fisher', who: '수달 어부', pos: [31.2, 11.6], title: '떠내려간 부표 찾기', ask: '그물 부표가 동쪽 해변으로 떠내려갔어. 3개만 주워 줄래?', thanks: '고마워! 오늘 잡은 생선 나눠 줄게.', item: 'buoy', itemName: '부표', need: 3, spots: [[50, 17], [58, 12], [62, 4]], reward: { fish: 5, shrimp: 2 } },
  { id: 'yatai', who: '포장마차 너구리', pos: [34.6, -3.6], title: '어묵 국물용 조개', ask: '국물 낼 조개가 떨어졌네. 남쪽 갯바위에서 4개만 캐 와 줘.', thanks: '덕분에 국물 맛 살겠다! 넉넉히 캐 왔으니 조개 반은 가져가.', item: 'clam', itemName: '조개', need: 4, spots: [[31.5, 13.5], [33.5, 15.2], [35.5, 16.8], [38, 17.5]], reward: { rice: 3, clam: 3 } },
  { id: 'farm', who: '밭 할머니 염소', pos: [49.5, -12], title: '배추 뽑기 도와주기', ask: '아이고 허리야. 배추 3포기만 뽑아다 주겠니?', thanks: '아이고 고마워라. 넉넉히 가져가렴.', item: 'cabbage', itemName: '배추', need: 3, spots: [[52.5, -8.5], [55.5, -8.5], [52.5, -11.5], [55.5, -11.5]], reward: { veg: 5 } },
  { id: 'light', who: '등대지기 부엉이', pos: [57.6, -5.4], title: '등대 기름통 가져다주기', ask: '등불 기름이 다 됐어. 어부네 집 데크에 기름통이 있을 거야. 좀 가져다줄래?', thanks: '이제 배들이 길을 잃지 않겠군. 밤바다에서 잡은 오징어야.', item: 'oil', itemName: '기름통', need: 1, spots: [[32.4, 10.4]], reward: { squid: 3 }, night: true },
];

export const PORT_COPY = {
  board: '🛶 부두 끝에서 배 타기',
  home: '부두 끝에서 마을로 돌아가기',
  fastHome: '🗺️ 마을로 바로 가기',
  fastGo: '🗺️ 섬으로 바로 가기',
  nag: '조금만 더 부탁해.',
  sleep: ['쿨쿨…', '(밤에 다시 와 봐요)'],
  market: '코인 30으로 쌀 2·채소 2를 샀어요. 의뢰를 하면 더 많이 받아요.',
  arrive: '🗺️ 이제 마을 부두에서 포구 섬으로 바로 갈 수 있어요',
};
