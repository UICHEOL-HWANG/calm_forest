import { DECOR_SETS, DROP_SOURCES } from '../data/decor-sets.js';
import { setProgress } from './rules.js';
import { SET_NAMES, SRC_PLACE, ALBUM_COPY } from './copy.js';

const SRC_ICO = {
  orchard: '🍎', cook: '🍲', crop: '🌾', dream: '🌙', sled: '🏔️', star: '🔭',
  mine: '⛏️', carve: '🗿', ferry: '🛶', mist: '🌫️', duel: '🐗', firefly: '🦋',
};

const srcOf = (item) => Object.keys(DROP_SOURCES).find(k => DROP_SOURCES[k].item === item);

export function albumView(granted, info) {
  const sets = DECOR_SETS.map(s => {
    const p = setProgress(granted, s.id);
    return {
      id: s.id,
      name: SET_NAMES[s.id],
      thumb: s.thumb,
      n: p.n,
      complete: p.complete,
      from: s.items.map(it => ({ ico: SRC_ICO[srcOf(it)], place: SRC_PLACE[srcOf(it)] })),
      items: s.items.map(it => ({ id: it, ...info(it), owned: granted.includes(it) })),
    };
  });
  return { title: ALBUM_COPY.title, lead: ALBUM_COPY.lead, soon: ALBUM_COPY.soon, sets };
}

const chip = (i) => `<span class="da-chip${i.owned ? ' got' : ''}"><i>${i.ico}</i>${i.name}</span>`;

const card = (s) => `<div class="da-set${s.complete ? ' done' : ''}">`
  + `<div class="da-pic"><img src="${s.thumb}" alt="" loading="lazy"><b>${s.n}/2</b></div>`
  + `<div class="da-name">${s.name}</div><div class="da-from">${s.from.map(f => `<span><i>${f.ico}</i>${f.place}</span>`).join('')}</div>`
  + `<div class="da-chips">${s.items.map(chip).join('')}</div></div>`;

export function albumHtml(view) {
  return `<p class="da-lead">${view.lead}</p><div class="da-grid">${view.sets.map(card).join('')}`
    + `<div class="da-soon"><span>${view.soon}</span></div></div>`;
}
