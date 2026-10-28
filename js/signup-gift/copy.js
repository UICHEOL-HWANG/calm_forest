const HERO = Object.freeze({
  harvest: Object.freeze({ ico: '🌾', tag: 'FIRST HARVEST', title: '첫 수확 축하해요!' }),
  house: Object.freeze({ ico: '🏠', tag: 'FIRST HOME', title: '첫 집이 생겼어요!' }),
});

const GIFT = Object.freeze({ label: '가입 선물', title: '셋 중 하나가 랜덤으로 와요', line: '🪴 화분 · 📮 우편함 · 🏮 등불' });
const WEB_WARN = '지금 마을은 이 브라우저에만 저장돼 있어요';
const BTN = Object.freeze({ inapp: '✉️ 이메일로 마을 지키고 선물 받기', web: '로그인하고 선물 받기' });

export const GIFT_NAMES = Object.freeze({ giftsprout: '첫 새싹 화분', giftmailbox: '새집 우편함', giftlantern: '환영 등불' });
export const GIFT_ICONS = Object.freeze({ giftsprout: '🪴', giftmailbox: '📮', giftlantern: '🏮' });

export const BOX = Object.freeze({
  closedTitle: '🎁 가입 선물이 도착했어요',
  closedSub: '상자를 눌러 열어 보세요',
  open: Object.freeze({
    giftsprout: '🪴 첫 새싹 화분이 왔어요!',
    giftmailbox: '📮 새집 우편함이 왔어요!',
    giftlantern: '🏮 환영 등불이 왔어요!',
  }),
  openBody: '작업대 🧺 보관함에 넣어 뒀어요. 마당에 놓아 보세요',
  ok: '확인',
});

export function nudgeView({ trigger, platform, inApp }) {
  const hero = HERO[trigger] || null;
  const web = platform === 'web';
  return {
    ico: hero?.ico ?? null,
    tag: hero?.tag ?? null,
    title: hero?.title ?? null,
    gift: GIFT,
    warn: web ? WEB_WARN : null,
    button: web ? (inApp ? BTN.inapp : BTN.web) : null,
  };
}

export function allCopy() {
  return [
    ...Object.values(HERO).map(h => h.title),
    GIFT.label, GIFT.title, GIFT.line, WEB_WARN, BTN.inapp, BTN.web,
    BOX.closedTitle, BOX.closedSub, ...Object.values(BOX.open), BOX.openBody, BOX.ok,
  ];
}
