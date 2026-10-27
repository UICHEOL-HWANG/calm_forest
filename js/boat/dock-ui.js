const MAT = { lotus: '🪷 연꽃', driftwood: '🪵 떠내려온 나무', shell: '🐚 강 조개', moon_fish: '🌕 달빛 물고기' };
const MAT_ICO = { lotus: '🪷', driftwood: '🪵', shell: '🐚', moon_fish: '🌕' };
const NEED = { clears: '완주', rapidPerfect: '급류 무피해 완주', comboBest: '별 콤보', raftClears: '뗏목으로 완주', nightClears: '밤 완주', rapidNightClears: '급류 밤 완주' };
const UNIT = { comboBest: '' };

export function LACK_LABEL({ key, have, need }) {
  if (key === 'star') return `⭐ 별조각 ${have}/${need}`;
  if (key === 'coins') return `🪙 코인 ${have}/${need}`;
  if (key.startsWith('mat:')) return `${MAT[key.slice(4)]} ${have}/${need}`;
  const k = key.slice(5);
  return `${NEED[k]} ${have}/${need}${UNIT[k] ?? '번'}`;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function boatCard(b) {
  const btn = b.owned
    ? `<button data-boat="${b.id}"${b.selected ? ' disabled' : ''}>${b.selected ? '타는 중' : '타기'}</button>`
    : `<button data-unlock="${b.id}"${b.ok ? '' : ' disabled'}>만들기</button>`;
  const lacks = b.owned ? '' : `<span class="bd-lacks">${b.lacks.map((l) => `<i>${esc(LACK_LABEL(l))}</i>`).join('')}</span>`;
  return `<div class="boat-up bd-boat${b.selected ? ' on' : ''}"><span class="bu-ico">${b.ico}</span><span class="bu-body"><span class="bu-name">${esc(b.name)} <small>💡${b.lamps}</small></span>${lacks}</span>${btn}</div>`;
}

export function matsRowHtml(matsView) {
  return Object.entries(matsView || {}).filter(([k, n]) => n > 0 && MAT_ICO[k]).map(([k, n]) => `${MAT_ICO[k]} ${n}`).join(' · ');
}

export function dockHtml(v) {
  const course = ['calm', 'rapid'].map((c) => {
    const locked = c === 'rapid' && !v.rapidOpen;
    return `<button data-course="${c}" class="${v.sel.course === c ? 'on' : ''}"${locked ? ' disabled' : ''}>${c === 'calm' ? '잔잔한 물길' : '급류'}</button>`;
  }).join('');
  const lock = v.rapidOpen ? '' : '<p class="bd-note">잔잔한 물길을 한 번 완주하면 급류가 열려요</p>';
  const mats = Object.entries(v.mat).map(([k, n]) => `${MAT_ICO[k]} ${n}`).join(' · ');
  return `<p class="bd-sub">⭐별조각 <b>${v.star}</b> · 🪙<b>${v.coins}</b> · 오늘 <b>${v.runsLeft}/${v.runsMax}</b>회 남음</p>`
    + `<p class="bd-mats">${mats}</p>`
    + `<div class="bd-course">${course}</div>${lock}`
    + `<div class="bd-boats">${v.boats.map(boatCard).join('')}</div>`;
}

export function renderDock(el, view, actions) {
  el.innerHTML = dockHtml(view);
  el.querySelectorAll('[data-boat]').forEach((b) => b.addEventListener('click', () => actions.select(b.dataset.boat)));
  el.querySelectorAll('[data-course]').forEach((b) => b.addEventListener('click', () => actions.course(b.dataset.course)));
  el.querySelectorAll('[data-unlock]').forEach((b) => b.addEventListener('click', () => actions.unlock(b.dataset.unlock)));
}
