export const DONE_KINDS = ['act', 'open', 'menu', 'click', 'tap'];

const CAM_TOUCH = { key: 'cam', target: '#cam-spot-zone', hand: 'twist', text: '🔄 두 손가락으로 비틀면 시점이 돌아가요', done: 'act:camrotate' };
const CAM_PC = { key: 'cam', target: null, keys: ['Q', 'E'], hand: 'key', text: '🔄 Q·E로 시점을 돌려요', done: 'act:camrotate' };

const TOUCH_FULL = [
  { key: 't_move', core: true, target: '#joy-base', hand: 'drag', text: '🕹️ 끌어서 걸어 보세요', done: 'act:move' },
  { key: 't_tool', core: true, target: '#tool-btn', hand: 'tap', text: '🧰 탭해서 도구를 골라요', done: 'act:toolpage' },
  { key: 't_use', core: true, target: '#action-btn', hand: 'tap', text: '⭕ 큰 버튼으로 도구를 써요', done: 'act:use' },
  CAM_TOUCH,
  { key: 't_bag', target: '#bag-btn', hand: 'tap', text: '🎒 가방엔 재화와 재료가 있어요', done: 'open:bag-menu' },
  { key: 't_dex', target: '#hud-dex', hand: 'tap', text: '📖 도감에서 모은 것을 봐요', done: 'open:dex-modal' },
  { key: 't_menu', target: '#hud-menu', hand: 'tap', text: '☰ 사진·소식함·설정은 여기 있어요', done: 'menu' },
  { key: 't_map', target: '#minimap', hand: 'tap', text: '🗺️ 누르면 마을 지도가 펼쳐져요', done: 'open:worldmap' },
];

const PC_FULL = [
  { key: 'pc_move', core: true, target: null, keys: ['↑', '←', '↓', '→'], hand: 'key', text: '⌨️ 방향키로 걸어 보세요', done: 'act:move' },
  { key: 'pc_set', core: true, target: '#tool-page', keys: ['1'], hand: 'key', text: '🧰 1을 누르면 도구 세트가 바뀌어요', done: 'act:toolpage' },
  { key: 'pc_pick', core: true, target: '#hotbar', keys: ['2', '3', '4', '5', '6'], hand: 'key', text: '🔢 2~6으로 도구를 골라요', done: 'act:toolpick' },
  { key: 'pc_use', core: true, target: null, keys: ['Space'], hand: 'key', text: '⭕ Space로 도구를 써요', done: 'act:use' },
  CAM_PC,
  { key: 'pc_bag', target: '#bag-btn', hand: 'click', text: '🎒 가방엔 재화와 재료가 있어요', done: 'open:bag-menu' },
  { key: 'pc_dex', target: '#hud-dex', hand: 'click', text: '📖 도감에서 모은 것을 봐요', done: 'open:dex-modal' },
  { key: 'pc_menu', target: '#hud-menu', hand: 'click', text: '☰ 사진·소식함·설정은 여기 있어요', done: 'menu' },
  { key: 'pc_map', target: '#minimap', hand: 'click', text: '🗺️ 누르면 마을 지도가 펼쳐져요', done: 'open:worldmap' },
];

const TOUCH_NEW = [
  { key: 'new_tool', target: '#tool-btn', hand: 'tap', text: '🧰 도구는 이 버튼을 탭해서 골라요', done: 'act:toolpage' },
  { key: 'new_top', target: '#topright', hand: 'tap', text: '🎒📖☰ 가방·도감·메뉴는 여기 모였어요', done: 'tap' },
  { key: 'new_menu', target: '#hud-menu', hand: 'tap', text: '☰ 사진·소식함·설정은 여기 있어요', done: 'menu' },
];

const PC_NEW = [
  { key: 'new_top', target: '#topright', hand: 'click', text: '🎒📖☰ 가방·도감·메뉴는 여기 모였어요', done: 'tap' },
  { key: 'new_menu', target: '#hud-menu', hand: 'click', text: '☰ 사진·소식함·설정은 여기 있어요', done: 'menu' },
  { key: 'new_map', target: '#minimap', hand: 'click', text: '🗺️ 미니맵을 누르면 지도가 펼쳐져요', done: 'tap' },
];

const MENU = [
  { key: 'menu_inbox', target: '#menu-sheet [data-for="inbox-btn"]', hand: 'tap', text: '📮 공지와 답장이 여기 와요', done: 'tap' },
  { key: 'menu_char', target: '#menu-sheet [data-for="char-btn"]', hand: 'tap', text: '🐾 캐릭터와 옷을 바꿔요', done: 'tap' },
  { key: 'menu_help', target: '#menu-sheet [data-for="help-btn"]', hand: 'tap', text: '📖 막히면 초보자 안내서를 봐요', done: 'tap' },
];

const PILL = [
  { key: 'pill', target: '#near-pill', hand: 'tap', text: '💬 이 동그라미를 누르면 말을 걸어요', done: 'click' },
];

export function spotSteps(kind, touch) {
  if (kind === 'full') return touch ? TOUCH_FULL : PC_FULL;
  if (kind === 'new') return touch ? TOUCH_NEW : PC_NEW;
  if (kind === 'menu') return MENU;
  if (kind === 'pill') return PILL;
  if (kind === 'cam') return [touch ? CAM_TOUCH : CAM_PC];
  return [];
}
