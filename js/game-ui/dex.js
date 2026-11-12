import { Input } from '../game-lazy.js';
import { CONFIG } from '../config.js';
import { LANG } from '../i18n.js';
import { trackEvent } from '../analytics.js';

let $, ui, isGuestNow;

// ── 📖 도감 — 발견한 종은 컬러, 미발견은 실루엣(???). 게스트에겐 보존 배너(회원 유치) ──
// ⚠️ js/game.js 에도 같은 이름의 표가 있다(박물관 명판용). 문구가 서로 달라 **둘 다** 고쳐야 한다 —
//    한쪽만 고치면 도감 모달 제목에 카테고리 키가 날것으로 뜬다('visitor' 가 그대로 보였다).
const DEX_CAT_LABEL = { fish: '🎣 물고기', crop: '🌾 작물', ore: '⛏️ 광물', cook: '🍳 요리', npc: '🏡 이웃', weather: '🌦️ 날씨', bug: '🌟 반딧불이', forage: '🍄 채집물', track: '🐾 밤손님 흔적', river: '🛶 강에서', spirit: '🌫️ 안개 숲 정령', dig: '🪏 땅속에서', visitor: '🦋 텃밭 방문객' };
// 📖 도감 설명문 — /api/dex-notes 에서 받아 카드에 한 줄씩 붙인다.
//   종 목록이 배포마다 고정이라 응답도 고정 → 한 번 받으면 localStorage 에 두고 다시 부르지 않는다.
//   실패·미설정이면 설명 줄 없이 지금처럼 아이콘·이름만 나온다.
const DEX_NOTE_KEY = `cf_dexnote_${LANG}_v1`;
let dexNotes = {};
const dexNoteBusy = new Set();
async function fetchDexNotes(cats) {
  const todo = cats.filter(c => !dexNotes[c] && !dexNoteBusy.has(c));
  if (!todo.length) return;
  todo.forEach(c => dexNoteBusy.add(c));
  await Promise.all(todo.map(async (c) => {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/api/dex-notes?cat=${c}&lang=${LANG}`);
      if (res.ok) {
        const d = await res.json();
        if (d && Object.keys(d).length) dexNotes[c] = d;
      }
    } catch (e) { /* 오프라인 — 설명 줄 없이 진행 */ }
    finally { dexNoteBusy.delete(c); }
  }));
  try { localStorage.setItem(DEX_NOTE_KEY, JSON.stringify(dexNotes)); } catch (e) {}
  if ($('dex-modal').classList.contains('show')) renderDex();   // 도착했으면 다시 그린다
}

function renderDex() {
  const d = Input.getDex();
  $('dex-title').textContent = `📖 도감 (${d.count}/${d.total})`;
  const box = $('dex-sections'); box.innerHTML = '';
  for (const cat in d.cats) {
    const h = document.createElement('div'); h.className = 'dex-cat'; h.textContent = DEX_CAT_LABEL[cat] || cat; box.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'dex-grid';
    d.cats[cat].forEach(e => {
      const el = document.createElement('div');
      el.className = 'dex-item' + (e.found ? '' : ' locked');
      // 발견한 것에만 설명을 붙인다 — 미발견 카드에 붙으면 그 자체가 스포일러가 된다
      const note = e.found ? (dexNotes[cat] || {})[e.id] : '';
      el.innerHTML = `<span class="d-ico">${e.ico}</span><span class="d-name">${e.found ? e.name : '???'}</span>`
        + (note ? `<span class="d-desc">${note}</span>` : '');
      grid.appendChild(el);
    });
    box.appendChild(grid);
  }
  // 🏅 배지 — 미획득도 이름·조건을 보여줘 목표 제시(도감과 달리 ??? 없음)
  const bh = document.createElement('div'); bh.className = 'dex-cat';
  bh.textContent = `🏅 배지 (${d.badgeCount}/${d.badgeTotal})`; box.appendChild(bh);
  const bgrid = document.createElement('div'); bgrid.className = 'dex-grid';
  d.badges.forEach(b => {
    const el = document.createElement('div');
    el.className = 'dex-item badge' + (b.earned ? '' : ' locked');
    el.innerHTML = `<span class="d-ico">${b.ico}</span><span class="d-name">${b.name}</span><span class="d-desc">${b.desc}</span>`;
    bgrid.appendChild(el);
  });
  box.appendChild(bgrid);
  $('dex-guest').classList.toggle('show', isGuestNow());   // 게스트만: 보존 배너 + 구글 버튼
  return d;
}

function openDex() {
  Input.setAnalog(0, 0);
  const d = renderDex();
  $('dex-modal').classList.add('show');
  ui.act?.('dex');                                          // 튜토리얼: 도감 확인 단계
  trackEvent('dex_open', { found: d.count, total: d.total, badges: d.badgeCount, guest: isGuestNow() }); // [GA4] 도감 관심 퍼널
  // 하나라도 발견한 분류만 받아온다 — 안 본 것까지 미리 받을 이유가 없다
  fetchDexNotes(Object.keys(d.cats).filter(c => d.cats[c].some(e => e.found)));
}

export function installDex(ctx) {
  ({ $, ui, isGuestNow } = ctx);
  try { dexNotes = JSON.parse(localStorage.getItem(DEX_NOTE_KEY) || '{}') || {}; } catch (e) { dexNotes = {}; }
  $('dex-tab').addEventListener('click', openDex);
  $('dex-close').addEventListener('click', () => $('dex-modal').classList.remove('show'));
  $('dex-modal').addEventListener('click', (e) => { if (e.target === $('dex-modal')) $('dex-modal').classList.remove('show'); });
  return {};
}
