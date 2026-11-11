const STAGE = { village: 0, island: 2, done: 4 };
const stage = c => (c.phase === 'sail' ? (c.dir < 0 ? 3 : 1) : STAGE[c.phase] ?? 0);
const past = (c, n) => stage(c) >= n;

export function portGuideSteps() {
  return [
    { id: 'walk', text: '포구 섬 가는 배가 생겼어요. 부두로 가 보세요', target: c => c.pierEnd, via: c => c.pierVia, done: c => past(c, 1) || c.nearPier, joy: true },
    { id: 'embark', text: '배에 타고 바다로 나가 볼까요?', target: c => c.boat, done: c => past(c, 1), expect: ['port_board'] },
    { id: 'move', text: c => (c.device === 'pc' ? 'WASD나 방향키로 배를 움직여 보세요' : '화면 왼쪽을 끌어 배를 움직여 보세요'), target: c => c.spot, done: c => past(c, 2) || c.moved > 5, joy: true },
    { id: 'spot', text: '물결이 이는 곳이 낚시터예요. 다가가 보세요', target: c => c.spot, done: c => past(c, 2) || c.canCast || c.fishing || c.caught > 0 },
    { id: 'cast', text: '🎣 👆', target: c => c.spot, done: c => past(c, 2) || c.fishing || c.caught > 0, expect: ['port_cast'] },
    { id: 'bite', text: '❗ ➜ 🎣 👆', target: c => c.spot, done: c => past(c, 2) || c.caught > 0, expect: ['port_fish', 'port_cast'] },
    { id: 'island', text: '이제 포구 섬으로! 금색 화살표를 따라가세요', target: c => c.islandDock, done: c => past(c, 2) },
    { id: 'npc', text: '❗가 뜬 수달 어부에게 말을 걸어 보세요', target: c => c.fisher, done: c => past(c, 3) || c.quest !== 'avail', expect: ['port_talk', 'port_next'] },
    { id: 'collect', text: c => `해변에 떠내려온 부표를 주워 오세요 (${c.got}/3)`, target: c => c.item, done: c => past(c, 3) || c.got >= 3 || c.quest === 'done', expect: ['port_pick'] },
    { id: 'turnin', text: '수달 어부에게 부표를 돌려주세요', target: c => c.fisher, done: c => past(c, 3) || c.quest === 'done', expect: ['port_talk', 'port_next'] },
    { id: 'free', text: '다른 주민도 도와 보세요. 돌아갈 땐 부두 끝으로', target: c => c.pierEndIsland, done: c => past(c, 3), expect: ['port_board'] },
    { id: 'home', text: '마을 부두로 돌아가세요', target: c => c.villageDock, done: c => past(c, 4) || c.done },
  ];
}
