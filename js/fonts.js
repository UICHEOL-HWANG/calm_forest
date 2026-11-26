export const EMOJI_FAMILY = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
export const UI_FONT = `Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", ${EMOJI_FAMILY}, sans-serif`;

export const EMOJI_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap';
export const NEW_EMOJI = '🪵🪨🪙🪴🪺🪹🫖🪣🪤🫐🫒🫑🪱🪲🪳🪸🪷🫧🪼🪽🪿🫎🫏🪻🫚🫛🪭🪮🪇🪈🧋🪚🪛🪝🪜🪞🪟🪠🪡🪢🪐🪁🪀🪃🪄🪅🪆🫕🫓🫔🫙🦪🦦🦥🦩🦭🦬🦫🪶🪰🦤🦣';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const needsEmojiFont = (ua = globalThis.navigator?.userAgent || '') => /Windows/.test(ua);

function addEmojiCss(doc) {
  return new Promise((resolve) => {
    const link = doc.createElement('link');
    link.rel = 'stylesheet'; link.href = EMOJI_CSS;
    link.onload = link.onerror = resolve;
    doc.head.appendChild(link);
  });
}

export function fontsReady({ doc = globalThis.document, ua, timeout = 2500 } = {}) {
  const fonts = doc?.fonts;
  if (!fonts?.load) return Promise.resolve();
  const loads = ['400', '700'].map((w) => fonts.load(`${w} 16px Pretendard`, '가A'));
  if (needsEmojiFont(ua)) loads.push(addEmojiCss(doc).then(() => fonts.load('16px "Noto Color Emoji"', NEW_EMOJI)));
  return Promise.race([Promise.allSettled(loads), sleep(timeout)]);
}
