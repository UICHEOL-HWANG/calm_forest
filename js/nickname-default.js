import { checkNickname } from './nickname-filter.js';

const TRIES = 5;
const squeeze = (s) => String(s ?? '').replace(/\s+/g, '');
const digits = (rand, lo, hi) => String(lo + Math.floor(rand() * (hi - lo + 1)));

export function buildDefaultNickname({ adjs = [], animal = '', lang = 'ko', rand = Math.random } = {}) {
  if (lang === 'en') return `${squeeze(animal)}${digits(rand, 100, 999)}`;
  const adj = adjs.length ? adjs[Math.floor(rand() * adjs.length)] : '';
  return `${squeeze(adj)}${squeeze(animal)}${digits(rand, 10, 99)}`;
}

export function defaultNickname(opts = {}) {
  for (let i = 0; i < TRIES; i++) {
    const nick = buildDefaultNickname(opts);
    if (checkNickname(nick).ok) return nick;
  }
  return buildDefaultNickname({ ...opts, adjs: [], animal: opts.lang === 'en' ? 'Friend' : '숲친구' });
}
