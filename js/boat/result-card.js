import { MAT_ICO } from './dock-ui.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const RESULT_COPY = {
  clear: { ico: '🎉', mark: '⛵', title: '무사히 도착!', sub: (v) => (v.perfect ? '한 번도 부딪히지 않았어요. 완벽한 뱃길!' : `${v.dist}m를 내려왔어요`) },
  wreck: { ico: '🌊', mark: '💥', title: '배가 가라앉았어요', sub: () => '🎒 주운 건 그대로 · 🛶 배는 내일 멀쩡해요' },
  quit: { ico: '🛶', mark: '🛶', title: '뱃길을 멈췄어요', sub: (v) => `${v.dist}m 지점에서 멈췄어요. 여기까지 모은 건 그대로 가져가요` },
};

const COURSE_LABEL = { calm: '잔잔한 물길', rapid: '급류' };
const ico = (s) => `<span>${esc(s)}</span>`;

function chipsHtml(v) {
  const chips = [];
  if (v.stars > 0) chips.push(`<span class="chip star">${ico('⭐')} +${v.stars}</span>`);
  for (const p of v.picks || []) chips.push(`<span class="chip">${ico(p.ico)} <span>${esc(p.name)}</span> ×${p.n}</span>`);
  for (const [k, n] of Object.entries(v.mats || {})) {
    if (n > 0 && MAT_ICO[k]) chips.push(`<span class="chip mat">${ico(MAT_ICO[k])} 재료 +${n}</span>`);
  }
  if (v.chest?.paid) chips.push(`<span class="chip">${ico('🧰')} <span>${esc(v.chest.name)}</span></span>`);
  else if (v.chest?.missed) chips.push(`<span class="chip off">${ico('🧰')} 다음 뱃길에 또 떠내려와요</span>`);
  if (!chips.length) chips.push('<span class="chip off">이번엔 빈손이에요</span>');
  return chips.join('');
}

export function resultCardHtml(v) {
  const known = RESULT_COPY[v.result];
  const c = known || RESULT_COPY.quit;
  const cls = known ? v.result : 'quit';
  const pct = Math.min((v.dist / v.total) * 100, 96);
  return `<div class="brc-left">`
    + `<div class="brc-head ${cls}"><div class="ico">${c.ico}</div><h3>${c.title}</h3><p>${c.sub(v)}</p><div class="wave"></div></div>`
    + `<div class="brc-route"><span><b>나루터</b>${ico(v.boatIco)} ${esc(v.boatName)}</span>`
    + `<span class="line"><i style="left:calc(${pct}% - 8px)">${c.mark}</i></span>`
    + `<span class="r"><b>${v.dist}m</b>${COURSE_LABEL[v.course] || COURSE_LABEL.calm}</span></div>`
    + `<div class="brc-score"><span class="n">${v.score}</span>${v.best ? '<span class="best">🏆 최고 기록</span>' : ''}</div>`
    + `</div><div class="brc-right">`
    + `<div class="brc-grid"><div><b>${v.time}초</b>시간</div><div><b>${v.hits}회</b>충돌</div><div><b>×${v.comboMax}</b>최고 콤보</div></div>`
    + `<div class="brc-perf"></div>`
    + `<div class="brc-rew"><div class="lb">이번 뱃길에서 얻은 것 · 보유 ⭐ ${v.totalStar}</div><div class="chips">${chipsHtml(v)}</div></div>`
    + `</div>`;
}
