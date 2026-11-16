export const BOOT_STEPS = Object.freeze([
  Object.freeze({ text: '숲길을 여는 중', to: 0.3 }),
  Object.freeze({ text: '주민을 깨우는 중', to: 0.62 }),
  Object.freeze({ text: '내 마을을 불러오는 중', to: 0.9 }),
]);

const OPEN_MS = 1100;
const FADE_MS = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let active = null;

export function createBootScreen(el, { t = (s) => s, wait = sleep } = {}) {
  const fill = el.querySelector('.boot-bar i');
  const label = el.querySelector('.boot-step');
  let at = -1;
  let gone = false;

  const isUp = () => !gone && el.style.display !== 'none';

  const step = (i) => {
    if (!isUp() || i <= at || i >= BOOT_STEPS.length) return;
    at = i;
    fill?.style.setProperty('--to', String(BOOT_STEPS[i].to));
    if (label) label.textContent = t(BOOT_STEPS[i].text);
  };

  const close = async (cls, ms) => {
    if (gone) return;
    gone = true;
    el.classList.add(cls);
    await wait(ms);
    el.style.display = 'none';
    el.classList.remove(cls);
  };

  const veil = () => (isUp() ? {
    show() {},
    hide() {
      fill?.style.setProperty('--to', '1');
      return close('boot-open', OPEN_MS);
    },
  } : null);

  const screen = { step, veil, isUp, dismiss: () => close('boot-fade', FADE_MS) };
  active = screen;
  return screen;
}

export const activeBootVeil = () => active?.veil() ?? null;
