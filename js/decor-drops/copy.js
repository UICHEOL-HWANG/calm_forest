export const SET_NAMES = {
  picnic: '오후의 피크닉 세트',
  teatime: '별빛 티타임 세트',
  winter: '눈 오는 밤 세트',
  stone: '반짝 돌 공방 세트',
  lantern: '달빛 연못 세트',
  guard: '한밤의 텃밭 세트',
};

export const SET_EFFECT = {
  picnic: '식탁에 체크 식탁보가 깔렸어요',
  teatime: '벽에 알록달록 깃발이 걸렸어요',
  winter: '창가에 눈이 내리기 시작했어요',
  stone: '벽난로에 타닥타닥 불이 붙었어요',
  lantern: '방 안에 작은 연못이 생겼어요',
  guard: '금빛 허수아비가 집을 지켜요',
};

export const SRC_PLACE = {
  orchard: '과수원', cook: '요리', crop: '텃밭', dream: '꿈의 숲', sled: '설산', star: '천문대',
  mine: '광산', carve: '조각', ferry: '나룻배', mist: '안개숲', duel: '밤손님 대결', firefly: '반딧불 숲',
};

const hasFinal = (w) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0;
};
const eul = (w) => w + (hasFinal(w) ? '을' : '를');

export const dropToast = (item, setId, n) => `🎁 ${eul(item)} 찾았어요. ${SET_NAMES[setId]} ${n}/2`;
export const setCompleteToast = (setId) => `✨ ${SET_NAMES[setId]} 완성! ${SET_EFFECT[setId]}`;
export const bannerCopy = (setId, src) => ({
  title: `🎁 ${SET_NAMES[setId]}`,
  line: `${SRC_PLACE[src]}에서 일정 확률로 나와요!`,
  go: '세트 보기 ›',
});

export const ALBUM_COPY = {
  title: '🎁 특별한 꾸미기 세트',
  lead: '미니게임을 하다 보면 일정 확률로 나와요! 두 개를 다 모으면 세트 연출이 켜져요.',
  soon: '🎣 곧 만나요',
};
