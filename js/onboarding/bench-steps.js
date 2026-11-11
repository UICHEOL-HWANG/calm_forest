export function benchSteps({ wide, hasStars }) {
  const steps = [
    { key: 'bench_tabs', target: '#cook-menu .ck-tabs', hand: 'tap', done: 'tap', text: '만들 걸 여기서 골라요\n🔧 도구 · 🌷 야외 · 🎁 선물 · 🗿 조각' },
    { key: 'bench_cell', target: '#wb-list .wb-cell.sel', scroll: true, hand: 'tap', done: 'tap', text: wide ? '칸을 누르면\n필요한 재료가 오른쪽에 나와요' : '칸을 누르면\n필요한 재료가 아래에 나와요' },
    { key: 'bench_detail', target: '#wb-sheet', hand: 'tap', done: 'tap', text: '재료가 다 모이면 여기서 만들어요\n빨간 재료는 더 모아 와야 해요' },
    { key: 'bench_star', target: '#wb-list .wb-grid[data-group="mine"]', scroll: true, hand: 'tap', done: 'tap', text: '⭐ 가진 도구는 망치질로\n별을 올려 더 좋아져요' },
    { key: 'bench_carve', target: '#cook-menu .ck-tab[data-tab="carve"]', hand: 'tap', done: 'tap', text: '🗿 조각 주문은 매일 바뀌어요\n깎아서 코인을 받아요' },
  ];
  return hasStars ? steps : steps.filter(s => s.key !== 'bench_star');
}
