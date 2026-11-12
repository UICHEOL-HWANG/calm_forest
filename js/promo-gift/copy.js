export const LETTER = Object.freeze({
  fallbackFrom: '숲에서 온 초대장',
  title1: '고요한 숲에 온 걸 환영해요',
  note1: '첫날 쓰라고 몇 가지 챙겨 넣었어요',
  ps: '추신. 로그인하면 전용 꾸미기 세트를 하나 더 보내 드려요 🎈',
  take: '받기',
  login: '✉️ 로그인하고 더 받기',
  from2: '두 번째 편지',
  title2: '약속한 꾸미기 세트예요',
  note2: '작업대 🧺 보관함에 넣어 뒀어요. 마당에 놓아 보세요',
  ok: '확인',
});

export const FAIL = Object.freeze({
  unknown: '없는 선물 코드예요',
  bad_code: '선물 코드를 다시 확인해 주세요',
  inactive: '지금은 쓸 수 없는 코드예요',
  expired: '기간이 끝난 코드예요',
  full: '선착순이 마감됐어요',
  not_started: '아직 시작 전인 코드예요',
  net_fail: '연결이 불안정해요. 잠시 후 다시 해 주세요',
  dup: '이미 선물을 받았어요',
  login: '로그인하면 꾸미기 세트를 받을 수 있어요',
});

export const MENU = Object.freeze({
  button: '선물 코드',
  title: '선물 코드를 넣어 주세요',
  placeholder: '예: AUTUMN24',
  submit: '받기',
  close: '닫기',
});

export const DECOR_TILES = Object.freeze([
  Object.freeze({ ico: '🎈', name: '꼬마 열기구' }),
  Object.freeze({ ico: '🧳', name: '여행 가방 더미' }),
]);

const SEED_KEYS = ['seed_wheat', 'seed_corn', 'seed_grape'];

export function stage1Lines(bundle) {
  const seeds = SEED_KEYS.map(k => bundle[k] || 0);
  return [
    { ico: '🪙', name: '코인', qty: String(bundle.coins || 0) },
    { ico: '🌾', name: '고급 씨앗 3종', qty: `각 ${Math.min(...seeds)}개` },
    { ico: '🌱', name: '비료', qty: `${bundle.fert || 0}개` },
    { ico: '🪱', name: '미끼', qty: `${bundle.bait || 0}개` },
  ];
}

export function allCopy() {
  return [
    ...Object.values(LETTER), ...Object.values(FAIL), ...Object.values(MENU),
    ...DECOR_TILES.map(t => t.name),
    '코인', '고급 씨앗 3종', '비료', '미끼', '각 3개', '5개',
  ];
}
