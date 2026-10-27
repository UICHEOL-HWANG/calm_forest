export const SEA_PICK_TITLE = '오늘은 바다에서 뭐 할까요?';
export const NEW_BADGE = '새로 생겼어요';
export const SOON_LABEL = '곧 열려요';

export const SEA_MODES = [
  { mode: 'fish', ico: '🎣', name: '대어 낚시', line: '버티고 당겨서 대어 낚기', tag: '손맛', meta: '🏆 오늘의 참치 순위', color: '#2f6f94', tint: '#dcecf5', fresh: false },
  { mode: 'mudflat', ico: '🐚', name: '갯벌 캐기', line: '밀물 전에 조개 가득 캐기', tag: '수집', meta: '⏱️ 밀물까지 1분', color: '#a85f30', tint: '#f6e3cf', fresh: true },
  { mode: 'dive', ico: '🤿', name: '잠수', line: '숨 참고 바닷속 보물 줍기', tag: '탐험', meta: '🫧 숨 세 번', color: '#1f7f86', tint: '#d4efee', fresh: true },
];

export const isNewMode = (m, forage) => !!m.fresh && !forage?.tried?.[m.mode];

export const withTried = (forage, mode) => ({ ...(forage || {}), tried: { ...(forage?.tried || {}), [mode]: true } });

export const withLast = (forage, mode) => ({ tried: {}, ...(forage || {}), last: mode });

export const pickCards = (forage, ready) => SEA_MODES.map(m => ({ ...m, isNew: isNewMode(m, forage), ready: !!ready[m.mode] }));
