import { HALL } from './data.js';

const NEXT = '다음 목적지', NEW = '새로 생겼어요';

export const REST_CINE = {
  door: { sub: NEXT, shots: [{ spot: 'door', main: '🍽️ 식당이 문을 열었어요' }] },
  tour: { sub: NEXT, shots: [
    { spot: 'board', main: '📋 칠판을 누르면 영업 시작' },
    { spot: 'crate', main: '🐟 재료는 상자에서' },
    { spot: 'table', main: '🙋 손님 자리로 가져다줘요' },
  ] },
  fryer: { sub: NEW, shots: [{ spot: 'fryer0', main: '🍤 튀김기가 들어왔어요. 새우·오징어 튀김을 만들어요' }], hint: { ico: '🍤', title: '튀김기', line: '새우·오징어 튀김을 만들어요' } },
  fryer2: { sub: NEW, shots: [{ spot: 'fryer1', main: '🥬 튀김기가 하나 더! 채소 튀김도 팔아요' }], hint: { ico: '🥬', title: '두 번째 튀김기', line: '채소 튀김도 팔아요' } },
  special: { sub: NEW, shots: [{ spot: 'specialBoard', main: '⭐ 오늘의 특선은 코인 2배예요' }], hint: { ico: '⭐', title: '오늘의 특선', line: '칠판에 걸린 메뉴는 코인 2배예요' } },
  regular: { sub: NEW, shots: [{ spot: 'regularBoard', main: '💌 단골이 생기면 여기 이름표가 붙어요' }], hint: { ico: '💌', title: '단골 게시판', line: '단골이 생기면 여기 이름표가 붙어요' } },
};

export const restCineKey = id => `restCine_${id}`;

export const REGULAR_BOARD_AT = { x: -6.85, z: 1.9 };

export const REGULAR_TAGS_AT = { x: REGULAR_BOARD_AT.x + 0.45, z: REGULAR_BOARD_AT.z };
export const SHOT_FROM = { regularBoard: { x: REGULAR_TAGS_AT.x, z: 10 } };
export const SHOT_LOOK_Y = { regularBoard: 3.1 };

export function tourDue(rest, seen) {
  return !rest.guideDone && !(rest.services > 0) && !seen?.[restCineKey('tour')];
}

export function featureCineDue(rest, special, seen) {
  if (!rest.guideDone) return null;
  const due = {
    fryer: rest.star >= 5,
    fryer2: rest.star >= 6,
    special: !!special,
    regular: Object.values(rest.regulars || {}).some(r => r?.done),
  };
  return Object.keys(due).find(id => due[id] && !seen?.[restCineKey(id)]) ?? null;
}

export function cineSpots() {
  const st = id => { const s = HALL.stations.find(x => x.id === id); return { x: s.x, z: s.z }; };
  const board = { x: HALL.board.x, z: HALL.board.z };
  return {
    board, specialBoard: board, crate: st('crate_fish'),
    table: { x: HALL.tables[0][0], z: HALL.tables[0][1] },
    fryer0: st('fryer0'), fryer1: st('fryer1'), regularBoard: { ...REGULAR_TAGS_AT },
  };
}
