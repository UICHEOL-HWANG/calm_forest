export const BANNER_FAR = 8;

export const ONBOARD_COPY = Object.freeze({
  ico: '🔨',
  title: '저녁 경매가 열렸어요',
  line: Object.freeze({ eul: '나루터 옆 무대에서 {0}을 겨뤄요', reul: '나루터 옆 무대에서 {0}를 겨뤄요' }),
  follow: '화살표를 따라가요!',
});

export const INTRO_CARDS = Object.freeze([
  { ico: '🔨', title: '저녁마다 경매가 열려요', sub: '경매품 한 점이 무대에 올라와요', btn: '다음' },
  { ico: '🔔', title: '버튼으로 값을 불러요', sub: '4초 동안 조용하면 낙찰!', btn: '다음' },
  { ico: '🪙', title: '하루 한 번 참가해요', sub: '코인이 모자라면 구경만 해요', btn: '알겠어요' },
].map(c => Object.freeze(c)));

export function hasBatchim(word) {
  if (!word) return false;
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0;
}

export function bannerLine(name, t) {
  const key = hasBatchim(name) ? ONBOARD_COPY.line.eul : ONBOARD_COPY.line.reul;
  return t(key).replace('{0}', t(name));
}

export function bannerTick(state, { open, day, joined, ready, far }) {
  if (!open) {
    if (!state.bannerDate) return { act: null, state };
    return { act: 'reset', state: { ...state, bannerDate: '' } };
  }
  if (state.bannerDate === day) return { act: null, state };
  const marked = { ...state, bannerDate: day };
  if (joined) return { act: 'skip', state: marked };
  if (!ready) return { act: null, state };
  if (!far) return { act: 'skip', state: marked };
  return { act: 'show', state: marked };
}

export function introNeeded(state, mode) {
  return !state?.introSeen && (mode === 'bid' || mode === 'watch');
}
