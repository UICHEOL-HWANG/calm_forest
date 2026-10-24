import { SEVERE_INFO } from './data/world.js';

const TODAY = {
  clear: ['☀️ 맑음', '농사하기 좋은 날'],
  rain: ['🌧️ 비', '밭이 저절로 자라요'],
  snow: ['❄️ 눈', '목재가 더 나와요'],
  fog: ['🌫️ 안개', '보석이 자주 반짝여요'],
};
const TOMORROW = {
  clear: '맑을 예정이에요',
  rain: '밭이 저절로 자라는 날',
  snow: '목재가 잘 나오는 날',
  fog: '보석 캐기 좋은 날',
};
const LABELS = ['STREAK', '오늘 보상', '오늘', '내일', 'NEW', '좋아요 🌱'];

function josa(word, withJong, noJong) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 ? withJong : noJong;
}

function seasonLine({ season, seasonLeft, fish, fishOwned, seasonNew }) {
  if (!fish || !season) return null;
  if (seasonNew) return `${season.ico} ${season.name}${josa(season.name, '이', '가')} 왔어요 · ${seasonLeft}일 동안 ${fish.ico} ${fish.name}${josa(fish.name, '이', '가')} 낚여요`;
  if (seasonLeft <= 3 && !fishOwned) return `⏳ ${season.name} ${seasonLeft}일 남음 · ${fish.ico} ${fish.name}${josa(fish.name, '은', '는')} 지금만 낚여요`;
  return null;
}

export function dailyCardView(input) {
  const { streak, reward, coinsTable, weather, forecast, severe, forecastInDex } = input;
  const pos = ((streak - 1) % 7) + 1;
  const dots = Array.from({ length: 7 }, (_, i) => (i < pos - 1 ? 'on' : i === pos - 1 ? 'now' : 'off'));
  const nextDay = streak + 1;
  const nextCoins = coinsTable[Math.min(nextDay, coinsTable.length) - 1];
  const [todayLabel, todayDesc] = TODAY[weather] || TODAY.clear;
  const sev = severe && SEVERE_INFO[severe];
  const tomorrow = sev
    ? { label: `${sev.ico} ${sev.name} 예보`, desc: '오늘 수확하거나 덮개를 준비해요', isNew: false, warn: true }
    : { label: (TODAY[forecast] || TODAY.clear)[0], desc: TOMORROW[forecast] || TOMORROW.clear, isNew: !forecastInDex, warn: false };
  return {
    title: `${streak}일 연속 🔥`,
    dots,
    reward: `+${reward.coins}🪙` + (reward.gem ? ` +${reward.gem}💎` : ''),
    next: `내일은 +${nextCoins}` + (nextDay % 7 === 0 ? ' 💎' : ''),
    today: { label: todayLabel, desc: todayDesc },
    tomorrow,
    season: seasonLine(input),
  };
}

export function dailyCardTexts(input) {
  const v = dailyCardView(input);
  return [...LABELS, v.title, v.reward, v.next, v.today.label, v.today.desc, v.tomorrow.label, v.tomorrow.desc, ...(v.season ? [v.season] : [])];
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function tile(cls, head, label, desc) {
  const t = el('div', `dc-t ${cls}`);
  t.append(el('small', null, head), el('b', null, label));
  if (desc) t.append(el('span', null, desc));
  return t;
}

export function renderDailyCard(root, v) {
  const hero = el('div', 'dc-t dc-hero');
  const left = el('div');
  left.append(el('small', null, 'STREAK'), el('b', null, v.title));
  const dots = el('div', 'dc-dots');
  for (const d of v.dots) dots.append(el('i', d === 'off' ? null : d));
  hero.append(left, dots);
  const tmr = tile(`dc-wide${v.tomorrow.warn ? ' dc-warn' : ''}`, '내일', v.tomorrow.label, v.tomorrow.desc);
  if (v.tomorrow.isNew) tmr.querySelector('b').append(el('em', 'dc-new', 'NEW'));
  const parts = [hero, tile('dc-rew', '오늘 보상', v.reward, v.next), tile('', '오늘', v.today.label, v.today.desc), tmr];
  if (v.season) parts.push(el('div', 'dc-t dc-season', v.season));
  root.replaceChildren(...parts);
}
