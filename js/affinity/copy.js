import { STAGES, stageProgress } from './stages.js';

const STAGE_EN = Object.freeze({ acq: 'Acquaintance', nbr: 'Neighbor', friend: 'Friend', best: 'Best Friend', family: 'Family' });
const STAGE_EN_PLURAL = Object.freeze({ acq: 'Acquaintances', nbr: 'Neighbors', friend: 'Friends', best: 'Best Friends', family: 'Family' });

export function josa(word, withJong, noJong) {
  const last = String(word).trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return noJong;
  return code % 28 ? withJong : noJong;
}

export const stageLabel = (idx, lang = 'ko') => {
  const s = STAGES[idx];
  if (!s) return '';
  return `${s.ico} ${lang === 'en' ? STAGE_EN[s.id] : s.name}`;
};

export function chipText(n, lang = 'ko') {
  const { idx, value, next } = stageProgress(n);
  if (idx < 0) return lang === 'en' ? '❤️0 · Start with a gift' : '❤️0 · 선물로 시작';
  return `${stageLabel(idx, lang)} ❤️${value}${next ? `/${next}` : ''}`;
}

export function stageUpToast({ name, nameEn, idx, letter, lang = 'ko' }) {
  const s = STAGES[idx];
  if (lang === 'en') {
    const head = `${s.ico} You and ${nameEn} are now ${STAGE_EN_PLURAL[s.id]}!`;
    return letter ? `${head} · ✉️ A letter is in your Inbox` : head;
  }
  const head = `${s.ico} ${name}${josa(name, '과', '와')} ${s.name}${josa(s.name, '이', '가')} 됐어요!`;
  return letter ? `${head} · ✉️ 소식함에 편지가 왔어요` : head;
}

export function giftCapToast({ name, nameEn, lang = 'ko' }) {
  return lang === 'en'
    ? `🎁 Given! Hearts with ${nameEn} are full for today`
    : `🎁 전했어요! 오늘 ${name} 하트는 다 찼어요`;
}

export function retroToast(count, lang = 'ko') {
  if (lang === 'en') return count === 1 ? '✉️ 1 letter from a villager is waiting' : `✉️ ${count} letters from villagers are waiting`;
  return `✉️ 주민들에게서 편지 ${count}통이 와 있어요`;
}

export function letterTitle({ name, nameEn, lang = 'ko' }) {
  return lang === 'en' ? `✉️ A letter from ${nameEn}` : `✉️ ${name}의 편지`;
}

export function letterRowText({ name, nameEn, idx, lang = 'ko' }) {
  return `${lang === 'en' ? nameEn : name} · ${stageLabel(idx, lang)}`;
}

export function nextRewardText(n, ico = '', lang = 'ko') {
  const { idx, next } = stageProgress(n);
  if (idx < 0) return lang === 'en' ? 'One gift to start' : '선물 하나면 시작';
  if (!next) return '';
  const tail = ico ? ` ${ico}` : '';
  return lang === 'en' ? `Next ❤️${next}${tail}` : `다음 ❤️${next}${tail}`;
}

export function introTitle({ name, nameEn, lang = 'ko' }) {
  return lang === 'en' ? `Get to know ${nameEn}` : `${name}${josa(name, '과', '와')} 친해져 보세요`;
}

export function introBody({ item, itemEn, lang = 'ko' }) {
  if (lang === 'en') return `The closer you get, the more letters arrive. Become 💛 Best Friends and they will send you ${itemEn}.`;
  return `친해질수록 편지가 오고, 💛 단짝이 되면 ${item}${josa(item, '을', '를')} 보내 줘요.`;
}

export function guideGiveText({ name, nameEn, lang = 'ko' }) {
  return lang === 'en' ? `Give the bouquet to ${nameEn}` : `${name}에게 꽃다발 건네기`;
}

export function trackerLines({ name, nameEn, value, next, nextIdx, reward, giftLeft, compact = false, lang = 'ko' }) {
  const ico = STAGES[nextIdx]?.ico || '';
  const who = lang === 'en' ? nameEn : name;
  const left = next - value;
  return {
    head: `${ico} ${who}${compact ? '' : ` ❤️${value}/${next}`}`,
    reward: lang === 'en' ? `${reward} in ❤️${left}` : `${reward}까지 ❤️${left}`,
    gift: giftLeft > 0
      ? (lang === 'en' ? `Gifts today: 🎁 ${giftLeft} more` : `오늘 선물 🎁 ${giftLeft}번 더`)
      : (lang === 'en' ? 'Gifts again tomorrow' : '선물은 내일 다시'),
  };
}

export const trackerStart = (lang = 'ko') => (lang === 'en' ? '🎁 Befriend villagers for gifts' : '🎁 주민과 친해지면 선물이 와요');

export function favChip({ ico, regular, lang = 'ko' }) {
  if (lang === 'en') return `${ico} ${regular ? 'Regular' : 'Favorite'}`;
  return `${ico} ${regular ? '단골' : '좋아함'}`;
}

export function regularRowText({ name, nameEn, ico, lang = 'ko' }) {
  return `${lang === 'en' ? nameEn : name} · ${favChip({ ico, regular: true, lang })}`;
}

export function pantryGiftText({ ico, name, n, lang = 'ko' }) {
  return `${ico} ${name} ${n} · ${lang === 'en' ? 'to the restaurant pantry' : '식당 창고로'}`;
}

export const pantryClaimToast = (lang = 'ko') => (lang === 'en' ? '🍽️ Added to the restaurant pantry' : '🍽️ 식당 창고에 넣었어요');
