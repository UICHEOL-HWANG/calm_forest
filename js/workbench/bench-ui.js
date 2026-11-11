import { starsHtml } from './forge-ui.js';

const TAG = Object.freeze({ new: '새', done: '✓', moon: '🌙', lock: '🔒' });

export function cellHtml(it, sel) {
  const cls = ['wb-cell', it.id === sel && 'sel', it.dim && 'dim', it.tag === 'done' && 'done'].filter(Boolean).join(' ');
  const star = it.stars ? `<span class="wb-st">${starsHtml(it.stars.on)}</span>` : '';
  const tag = it.tag ? `<span class="wb-tag t-${it.tag}">${TAG[it.tag]}</span>` : '';
  const cnt = it.cnt ? `<span class="wb-cnt">${it.cnt}</span>` : '';
  return `<button type="button" class="${cls}" data-id="${it.id}"${it.stars ? ' data-star="1"' : ''}>${star}${tag}<span class="wb-ico">${it.ico}</span><span class="wb-nm">${it.name}</span>${cnt}</button>`;
}

export function listHtml(view, sel) {
  return view.groups.map(g => `${g.title ? `<div class="wb-sec">${g.title}</div>` : ''}<div class="wb-grid" data-group="${g.key}">${g.items.map(i => cellHtml(i, sel)).join('')}</div>`).join('');
}

function subHtml(it) {
  if (it.eff) {
    const next = it.eff.next ? `<i class="chev"></i><span class="nxt">${it.eff.next}</span>` : '';
    return `<div class="wb-sub"><span>${it.eff.label}</span> <span class="now">${it.eff.now}</span>${next}</div>`;
  }
  return it.sub ? `<div class="wb-sub">${it.sub}</div>` : '';
}

export function sheetHtml(it, icoOf) {
  const star = it.stars ? ` ${starsHtml(it.stars.on, it.stars.next)}` : '';
  const chips = it.cost.length
    ? `<div class="wb-chips">${it.cost.map(c => `<span class="wb-chip${c.lack ? ' lack' : ''}">${icoOf(c.k)} ${c.have}/${c.need}</span>`).join('')}</div>`
    : '';
  const note = it.note ? `<div class="wb-note${it.tag === 'moon' ? ' moon' : ''}">${it.note}</div>` : '';
  const sale = it.sale ? `<div class="wb-sale"><span class="ck-tag">${it.sale.label}</span><span class="ck-tag">${it.sale.until}</span></div>` : '';
  return `<div class="wb-top"><span class="wb-big">${it.ico}</span><div class="wb-txt"><div class="wb-name">${it.name}${star}</div>${subHtml(it)}</div></div>${chips}${sale}${note}<button type="button" class="wb-go"${it.btn.disabled ? ' disabled' : ''}>${it.btn.label}</button>`;
}
