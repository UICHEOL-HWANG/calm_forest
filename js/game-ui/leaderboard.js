import { Input } from '../game-lazy.js';
import { CONFIG } from '../config.js';
import { state as authState } from '../supabase-client.js';
import { trackEvent } from '../analytics.js';

let $, escapeHtml;

// ═══════════════ 🏆 리더보드 — /api/leaderboard (서버 집계·엣지 캐시) ═══════════════
const LB_BOARDS = [
  { id: 'boat',  label: '🛶 오늘의 뱃길', unit: '점',  desc: '오늘의 물길 최고 점수 — 코스는 모두에게 같아요', daily: true },
  { id: 'boat_rapid', label: '🌊 급류', unit: '점', desc: '오늘 급류 최고 점수', daily: true },
  { id: 'sea',   label: '🌊 오늘의 대어', unit: 'kg',  desc: '오늘 낚은 가장 무거운 물고기 — 어종은 가리지 않아요', daily: true, fmt: s => (s / 10).toFixed(1) },
  { id: 'rich',  label: '🪙 주간 부자',   unit: '🪙', desc: '이번 주에 번 코인' },
  { id: 'mine',  label: '⛏️ 광부왕',      unit: '회',  desc: '이번 주 채굴 횟수' },
  { id: 'cook',  label: '🍳 요리왕',      unit: '회',  desc: '이번 주 요리 횟수' },
  { id: 'quest', label: '📜 퀘스트',      unit: '건',  desc: '이번 주 완료한 의뢰' },
  { id: 'sled',  label: '🛷 썰매',        unit: '초',  desc: '오늘 설산 썰매 최고 기록', daily: true, fmt: v => (-v / 1000).toFixed(2) },
];
let lbBoard = 'boat';
const lbCache = {};   // 모달 열려있는 동안 보드별 응답 캐시(탭 왕복 시 재요청 방지)
function lbMedal(r) { return r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r + '위'; }
// 🌊 오늘의 대어 — 그 무게를 낸 어종(서버가 sp 로 준다. 없으면 예전처럼 비움 — SQL 적용 전에도 안전)
//   이름은 별도 span — 옵저버가 '참치' 같은 사전 단어로 번역한다(아이콘과 붙이면 못 찾는다)
function lbSpecies(sp) {
  if (!sp) return '';
  const s = (Input.getSeaSpecies?.() || []).find(x => x.id === sp);
  return s ? `<span class="lb-sp">${s.ico} <span>${s.name}</span></span>` : '';
}
async function renderLb(board) {
  lbBoard = board;
  const meta = LB_BOARDS.find(b => b.id === board);
  $('lb-sub').textContent = meta.desc + (meta.daily ? '' : ' — 매주 월요일 새로 시작해요');
  [...document.querySelectorAll('.lb-tab')].forEach(b => b.classList.toggle('active', b.dataset.id === board));
  const list = $('lb-list'), meBox = $('lb-me');
  list.innerHTML = '<div class="lb-empty">불러오는 중… 🌿</div>'; meBox.innerHTML = '';
  try {
    if (!lbCache[board]) {
      const uid = (authState.userId || '');
      const res = await fetch(`${CONFIG.API_BASE}/api/leaderboard?board=${board}&uid=${uid}`);
      if (!res.ok) throw new Error('http ' + res.status);
      lbCache[board] = await res.json();
    }
    const d = lbCache[board];
    const top = d.top || [];
    const myNick = Input.getNickname() || '';
    if (!top.length) {
      list.innerHTML = `<div class="lb-empty">아직 기록이 없어요.<br>${meta.label}의 첫 주인공이 되어보세요!</div>`;
      return;
    }
    list.innerHTML = top.map(r =>
      `<div class="lb-row${r.rank <= 3 ? ' top3' : ''}${d.me && r.rank === d.me.rank && r.nick === myNick ? ' me-row' : ''}">
        <span class="lb-rank">${lbMedal(r.rank)}</span>
        <span class="lb-nick">${escapeHtml(r.nick)}</span>${lbSpecies(r.sp)}
        <span class="lb-score">${meta.fmt ? meta.fmt(r.score) : Number(r.score).toLocaleString()}${meta.unit}</span>
      </div>`).join('');
    // 내 순위 — 상위 목록에 안 보이면 하단에 고정 표시
    if (d.me && !(top.some(r => r.rank === d.me.rank && r.nick === myNick))) {
      meBox.innerHTML = `<div class="lb-row"><span class="lb-rank">${lbMedal(d.me.rank)}</span><span class="lb-nick">${escapeHtml(myNick || '나')} (나)</span>${lbSpecies(d.me.sp)}<span class="lb-score">${meta.fmt ? meta.fmt(d.me.score) : Number(d.me.score).toLocaleString()}${meta.unit}</span></div>`;
    } else if (!d.me && authState.userId) {
      meBox.innerHTML = `<div class="lb-empty" style="padding:8px;">아직 이 보드에 내 기록이 없어요. 지금 만들어봐요!</div>`;
    }
  } catch (e) {
    list.innerHTML = '<div class="lb-empty">순위를 불러오지 못했어요.<br>잠시 후 다시 열어주세요 🌧️</div>';
  }
}
function openLb() {
  const tabs = $('lb-tabs');
  if (!tabs.children.length) {
    LB_BOARDS.forEach(b => {
      const t = document.createElement('button');
      t.className = 'lb-tab'; t.dataset.id = b.id; t.textContent = b.label;
      t.addEventListener('click', () => renderLb(b.id));
      tabs.appendChild(t);
    });
    $('lb-close').addEventListener('click', () => $('lb-modal').classList.remove('show'));
  }
  Object.keys(lbCache).forEach(k => delete lbCache[k]);   // 열 때마다 신선하게(서버가 5분 캐시)
  Input.setAnalog(0, 0);
  $('lb-modal').classList.add('show');
  trackEvent('leaderboard_open', { board: lbBoard });   // [GA4] 소셜 기능 사용률
  renderLb(lbBoard);
}

export function installLeaderboard(ctx) {
  ({ $, escapeHtml } = ctx);
  $('lb-btn').addEventListener('click', openLb);   // ☰메뉴 접힘은 util-btns 위임 핸들러가 처리
  return { openLb };
}
