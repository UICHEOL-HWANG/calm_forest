const LEAD_EMOJI = /^(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)\s*/u;
const TWO_LINE_AT = 24;

export function splitToast(text) {
  const s = String(text ?? '');
  const m = s.match(LEAD_EMOJI);
  const rest = m ? s.slice(m[0].length) : s;
  const [main, ...subs] = rest.split(' · ');
  return { ic: m ? m[1] : '', main, subs };
}

export function isTwoLine(p) {
  return (p.main + p.subs.join('')).length > TWO_LINE_AT;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function renderToast(root, text, { chips = false } = {}) {
  const p = splitToast(text);
  root.classList.toggle('tst-two', !chips && isTwoLine(p));
  root.classList.toggle('tst-chips', chips);
  const parts = [];
  if (p.ic) parts.push(el('span', 'tst-ic', p.ic));
  const tx = el('span', 'tst-tx');
  tx.append(el('b', null, p.main));
  p.subs.forEach((s, i) => {
    if (chips) tx.append(el('span', i ? 'tst-chip' : 'tst-chip on', s));
    else tx.append(el('span', 'tst-sep'), el('span', 'tst-sub', s));
  });
  parts.push(tx);
  root.replaceChildren(...parts);
}

export function renderTiles(root, tiles) {
  root.replaceChildren(...tiles.map(x => {
    if (x.k === 'hero') {
      const h = el('div', 'dc-t dc-hero dc-hero-ic');
      const w = el('div');
      w.append(el('small', null, x.tag), el('b', null, x.title));
      h.append(el('span', 'dc-ic', x.ico), w);
      return h;
    }
    if (x.k === 'quote') {
      const q = el('div', 'dc-t dc-quote dc-wide');
      q.append(el('small', null, x.tag), el('p', null, x.text));
      return q;
    }
    const t = el('div', ['dc-t', x.tone && `dc-${x.tone}`, x.wide && 'dc-wide'].filter(Boolean).join(' '));
    if (x.tag) t.append(el('small', null, x.tag));
    t.append(el('b', null, x.label));
    if (x.desc) t.append(el('span', null, x.desc));
    if (x.chips) {
      const c = el('div', 'dc-cost');
      x.chips.forEach(s => c.append(el('i', null, s)));
      t.append(c);
    }
    return t;
  }));
}

export const BUFF_SHORT = {
  speed: { effect: '👟 이동 속도 +40%', where: '🗺️ 어디서나', whereSub: '마을·텃밭·동굴' },
  luck: { effect: '🐠🌈 희귀 물고기 확률↑', where: '🎣 호수 부두', whereSub: '낚싯대' },
  chop: { effect: '🪵 쓰러뜨리면 목재 +1', where: '🌳 나무 앞', whereSub: '도끼' },
  mine: { effect: '🪨⚫ 돌·석탄 더 많이', where: '⛏️ 서쪽 동굴', whereSub: '💎는 안개 낀 날' },
};

export function buffTiles(key, meta, remainSec) {
  const short = BUFF_SHORT[key] || {};
  return [
    { k: 'hero', ico: meta.ico, tag: 'BUFF', title: `${meta.name} 버프` },
    { k: 'tile', wide: true, tag: '효과', label: short.effect || meta.desc },
    { k: 'tile', tone: 'gold', tag: '남은 시간', label: `⏱️ ${remainSec}초` },
    { k: 'tile', tag: '어디서', label: short.where, desc: short.whereSub },
    { k: 'tile', tone: 'lav', wide: true, label: '🍳 요리하면 다시 · 등급이 좋으면 더 오래' },
  ];
}

export function mistClearTiles(glow) {
  return [
    { k: 'hero', ico: '🌤️', tag: 'CLEAR', title: '숲이 맑아졌어요' },
    { k: 'tile', tone: 'gold', tag: '보너스', label: `+${glow} ✨`, desc: '정령빛' },
    { k: 'tile', tag: '쓰는 곳', label: '✨ 정령 등불', desc: '상점 야외 장식' },
    { k: 'tile', tone: 'peach', wide: true, label: '🌫️ 내일 또 안개가 차요' },
  ];
}

export function bridgeTiles(cost) {
  return [
    { k: 'quote', tag: '🦉 의뢰 올빼미', text: '"저 나무, 우리가 지켜야 해. 서쪽 박물관 할아버지가 방법을 알 거야."' },
    { k: 'tile', wide: true, tag: '다음 할 일', label: '🌉 다리 고치기', chips: [`🪵 ${cost.wood}`, `🪨 ${cost.stone}`] },
  ];
}
