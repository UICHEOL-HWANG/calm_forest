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
