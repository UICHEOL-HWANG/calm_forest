import { AFFINITY_NPCS } from './stages.js';
import { pantryClaimToast } from './copy.js';
import { getLang as lang } from '../i18n.js';

const GIFT_ICO = Object.freeze({ seed: '🌰', crop: '🥕', wood: '🪵', coins: '🪙', bait: '🪱', fish: '🐟', flour: '🌾', honey: '🍯', forage: '🍄', bug: '🌟', egg: '🥚', stone: '🪨', coal: '⚫', gem: '💎' });
const GIFT_LABEL = Object.freeze({ seed: '씨앗', crop: '작물', wood: '목재', coins: '코인', bait: '미끼', fish: '물고기', flour: '밀가루', honey: '꿀', forage: '채집물', bug: '반딧불이', egg: '달걀', stone: '돌', coal: '석탄', gem: '보석' });

export const giftLine = (gift, t) => Object.entries(gift || {}).map(([k, v]) => `${GIFT_ICO[k] || ''} ${t(GIFT_LABEL[k] || k)} ${v}`).join(' · ');

const toneOf = (npc) => `nb-tone-${Math.max(0, AFFINITY_NPCS.indexOf(npc)) % 6}`;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function renderLetters({ box, wrap, det, countEl, Input, t, toast, focusKey = null, wide }) {
  wrap.innerHTML = ''; det.innerHTML = '';
  box.classList.remove('open');
  const letters = Input.affinityLetters();
  const count = () => {
    const c = Input.affinityLetters().filter(l => !l.read).length;
    countEl.textContent = c ? String(c) : '';
  };
  box.classList.toggle('empty', !letters.length);
  if (!letters.length) { wrap.appendChild(el('p', 'nt-empty', t('아직 온 편지가 없어요 🌱'))); count(); return; }
  const items = letters.map((l, i) => {
    const it = el('button', `nb-it ${toneOf(l.npc)}`); it.type = 'button';
    const tx = el('span', 'nb-t'); tx.append(el('b', null, l.row));
    it.append(el('span', 'nb-stamp', l.face), tx);
    it.classList.toggle('unread', !l.read);
    it.addEventListener('click', () => open(i));
    wrap.appendChild(it);
    return it;
  });
  const open = (i) => {
    const l = letters[i];
    Input.readLetter(l.key);
    items.forEach((it, k) => { it.classList.toggle('sel', k === i); if (k === i) it.classList.remove('unread'); });
    count();
    det.innerHTML = '';
    const cover = el('div', `nb-cover ${toneOf(l.npc)}`);
    const back = el('button', 'nb-back', '‹'); back.type = 'button'; back.setAttribute('aria-label', t('뒤로'));
    back.addEventListener('click', () => box.classList.remove('open'));
    cover.append(back, el('span', 'nb-big', l.face), el('span', 'nb-pill', l.stage));
    const page = el('div', 'nb-body');
    page.append(el('h3', null, l.title), el('p', 'nt-lead', l.body));
    const att = l.giftText ? `🎁 ${l.giftText}` : l.gift ? `🎁 ${giftLine(l.gift, t)}` : `🎁 ${t('📜 금빛 도구 도면 의뢰가 열려요')}`;
    page.appendChild(el('p', 'nb-att', att));
    det.append(cover, page);
    if (l.gift) {
      const claimed = () => Input.affinityLetters().find(x => x.key === l.key)?.claimed;
      const btn = el('button', 'nb-claim', claimed() ? t('받았어요') : t('받기')); btn.type = 'button';
      btn.disabled = !!claimed();
      btn.addEventListener('click', () => {
        if (!Input.claimLetter(l.key)) return;
        btn.textContent = t('받았어요'); btn.disabled = true;
        toast(l.gift.pantry ? pantryClaimToast(lang()) : l.gift.decor ? '🧺 보관함에 넣었어요' : '🎒 가방에 넣었어요');
      });
      det.appendChild(btn);
    }
    box.classList.add('open');
    items[i].scrollIntoView({ block: 'nearest' });
  };
  const focus = focusKey ? letters.findIndex(l => l.key === focusKey) : -1;
  const first = focus >= 0 ? focus : Math.max(0, letters.findIndex(l => !l.read));
  if (focus >= 0 || wide()) open(first); else count();
}
