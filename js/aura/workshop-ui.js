// =============================================================
//  🏮 빛 공방 모달 #aura-modal — 주문 / 기다림 / 수령 / 다듬기
//  패턴: js/neighbors/ui.js (CSS 1회 주입 · textContent 만 · id 끝 -modal → anyModalOpen 이 이동을 멈춘다)
//  문구: dev/active/light-workshop/copy.md "확정" 절. 순수 규칙은 workshop-rules.js(Node 테스트용 분리).
// =============================================================
import { cardsFromText, swapCard, TEXT_MAX, SPEEDS, RADII, COUNT_MIN, COUNT_MAX } from './recipe.js';
import { AURA_PALETTE } from './palette.js';
import { fetchMyOrders, placeOrder, claimOrder } from './client.js';
import { decideScreen, addToSlots, claimPlan } from './workshop-rules.js';
import { isNicknameBlocked } from '../nickname-filter.js';
import { kstDate } from '../kst-date.js';
import { trackEvent } from '../analytics.js';

export { decideScreen, addToSlots };

const SHAPE_KO = { dot: '동글', petal: '꽃잎', leaf: '나뭇잎', star: '별', drop: '물방울', firefly: '반딧불', snow: '눈송이', heart: '하트', note: '음표', bubble: '비눗방울' };
const MOTION_KO = { orbit: '맴돌기', rise: '피어오르기', fall: '내려앉기', drift: '둥실둥실', spiral: '휘감기', pulse: '반짝반짝' };
const BAND_KO = { feet: '발밑', body: '몸 둘레', head: '머리 위' };
const SPEED_KO = { 0.5: '느리게', 1: '보통', 1.5: '빠르게' };
const RADIUS_KO = { 0.7: '좁게', 1: '보통', 1.3: '넓게' };
const colorKo = id => AURA_PALETTE.find(p => p.id === id)?.ko || id;

const MSG = {
  orderGreeting: '어떤 빛을 두르고 싶어요? 한 줄로 들려주세요',
  placeholder: '예: 발밑에 벚꽃잎이 살랑살랑',
  cardHint: '카드를 누르면 다른 재료로 바꿀 수 있어요',
  orderBtn: '빚어 주세요',
  footer: '하루 한 번 · 내일 아침에 완성돼요',
  accepted: '좋아요, 밤새 정성껏 빚어 둘게요. 내일 아침에 들러요',
  daytime: '빛은 밤에만 빚을 수 있어요. 해가 지면 다시 와요',
  already: '오늘 주문은 벌써 받았어요. 내일 아침에 만나요',
  blocked: '음… 그 말로는 빛이 잘 안 빚어져요. 다르게 말해 줄래요?',
  claimGreeting: '밤새 빚은 빛이에요. 마음에 들면 좋겠어요',
  wear: '지금 두르기', keep: '보관함에 넣기',
  full: '보관함이 가득 찼어요. 하나를 비우고 받아요',
  ai: '🤖 AI가 밤사이 빚어요',
};

const CSS = `#aura-modal{position:fixed;inset:0;z-index:33;display:none;place-items:center;background:rgba(20,40,30,.55)}
#aura-modal.show{display:grid}
#aura-modal .card{width:min(92vw,420px);box-sizing:border-box;max-height:calc(100dvh - 24px - var(--top-inset,0px));overflow-y:auto;background:#fffaf0;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px;color:#3b2a20;font-size:15px;word-break:keep-all;overflow-wrap:anywhere}
#aura-modal .npc{background:#f3ead8;border-radius:12px;padding:10px 12px;line-height:1.5}
#aura-modal input[type=text]{font-size:16px;padding:10px;border-radius:10px;border:1px solid #c9b79a}
#aura-modal .cards{display:flex;flex-wrap:wrap;gap:6px}
#aura-modal .cards button{border:0;border-radius:10px;padding:6px 10px;background:#e3f0d6;font-size:14px;font-family:inherit}
#aura-modal .primary{border:0;border-radius:12px;padding:12px;background:#4f7f55;color:#fff;font-size:16px;font-family:inherit}
#aura-modal .primary[disabled]{opacity:.5}
#aura-modal .ghost{border:1px solid #c9b79a;border-radius:12px;padding:10px;background:transparent;font-size:15px;font-family:inherit}
#aura-modal .note{font-size:12px;color:#8a7a68;text-align:center}
#aura-modal .row{display:flex;align-items:center;gap:8px;font-size:14px}
#aura-modal .row input[type=range]{flex:1}`;

let root = null, card = null, game = null;
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function ensure() {
  if (root) return;
  const style = el('style'); style.id = 'aura-style'; style.textContent = CSS; document.head.appendChild(style);
  root = el('div'); root.id = 'aura-modal';
  root.addEventListener('click', e => { if (e.target === root) close(); });
  card = el('div', 'card'); root.appendChild(card); document.body.appendChild(root);
}
function close() { root?.classList.remove('show'); }
const say = text => card.appendChild(el('div', 'npc', text));
const aiNote = () => card.appendChild(el('div', 'note', MSG.ai));

export async function openWorkshop() {
  ensure();
  game ??= await import('../game.js');
  card.replaceChildren(el('div', 'note', '공방 불을 켜는 중…'));
  root.classList.add('show');
  const res = await fetchMyOrders();
  if (res.error) {
    card.replaceChildren();
    say(res.error === 'login_required' ? '로그인하면 빛을 빚어 줄 수 있어요.' : '지금은 공방 문이 잠겼어요. 잠시 뒤에 다시 와 주세요.');
    return;
  }
  const orders = res.orders || [];
  const screen = decideScreen(orders, kstDate(), game.isNight());
  trackEvent('aura_workshop_view', { screen, has_ready: screen === 'claim' ? 1 : 0 });
  ({ claim: drawClaim, waiting: drawPending, done: drawPending, order: drawOrder, daytime: drawDaytime })[screen](orders);
}

function drawTuneButton() {
  if (!game.gameState.aura.slots.length) return;
  const b = el('button', 'ghost', '내 빛 다듬기'); b.onclick = () => drawTune(); card.appendChild(b);
}
function drawDaytime() { card.replaceChildren(); say(MSG.daytime); trackEvent('aura_order_blocked', { reason: 'daytime' }); drawTuneButton(); }
function drawPending() { card.replaceChildren(); say(MSG.already); drawTuneButton(); }
function drawAccepted() { card.replaceChildren(); say(MSG.accepted); drawTuneButton(); }

function drawOrder() {
  card.replaceChildren();
  say(MSG.orderGreeting);
  const input = el('input'); input.type = 'text'; input.maxLength = TEXT_MAX; input.placeholder = MSG.placeholder;
  const hint = el('div', 'note', MSG.cardHint);
  const box = el('div', 'cards');
  let cards = cardsFromText(''), changed = 0;
  const labels = { shape: c => SHAPE_KO[c.shape], color: c => colorKo(c.color), motion: c => MOTION_KO[c.motion], band: c => BAND_KO[c.band] };
  const render = () => box.replaceChildren(...['shape', 'color', 'motion', 'band'].map(k => {
    const b = el('button', null, labels[k](cards));
    b.onclick = () => { const from = cards[k]; cards = swapCard(cards, k); changed++; trackEvent('aura_cards_swap', { card: k, from, to: cards[k] }); render(); };
    return b;
  }));
  input.oninput = () => { cards = cardsFromText(input.value); render(); };
  const go = el('button', 'primary', MSG.orderBtn);
  const err = el('div', 'note');
  go.onclick = async () => {
    const text = input.value.trim();
    if (!text) { err.textContent = '한 줄만 들려주세요.'; return; }
    if (isNicknameBlocked(text)) { err.textContent = MSG.blocked; trackEvent('aura_order_blocked', { reason: 'profanity' }); return; }
    go.disabled = true;
    const r = await placeOrder(text, cards);
    if (r.error) {
      go.disabled = false;
      err.textContent = r.error === 'limit' ? MSG.already
        : r.error === 'blocked' ? MSG.blocked : '주문이 닿지 않았어요. 잠시 뒤에 다시 눌러 주세요.';
      const reason = r.error === 'blocked' ? 'profanity' : r.error === 'limit' ? 'limit' : 'error';
      trackEvent('aura_order_blocked', reason === 'error' ? { reason, code: String(r.error) } : { reason });
      return;
    }
    trackEvent('aura_order_submit', { order_id: r.order?.id, len: text.length, cards_changed: changed });
    drawAccepted();
  };
  render();
  card.append(input, hint, box, err, go, el('div', 'note', MSG.footer));
  aiNote();
}

function drawClaim(orders) {
  const o = orders.find(x => x.status === 'done' || x.status === 'fallback');
  const r = o.recipe;
  card.replaceChildren();
  say(r.line || MSG.claimGreeting);
  card.appendChild(el('div', null, r.name));
  card.appendChild(el('div', 'note', `${SHAPE_KO[r.shape]} · ${MOTION_KO[r.motion]} · ${BAND_KO[r.band]}`));
  let wearBtn, keepBtn;
  const lock = on => { if (wearBtn) wearBtn.disabled = on; if (keepBtn) keepBtn.disabled = on; };
  const take = async (wear, replaceId) => {
    if (claimPlan(game.gameState.aura, replaceId) === 'replace') { drawReplace(wear, take, () => drawClaim(orders)); return; }
    lock(true);
    const res = await claimOrder(o.id);
    if (res.error) {
      lock(false);
      if (!card.querySelector('.claim-err')) card.appendChild(el('div', 'note claim-err', '건네주다 놓쳤어요. 다시 눌러 주세요.'));
      return;
    }
    const slot = { id: o.id, recipe: r, tune: { count: r.count, speed: r.speed, radius: r.radius, colors: r.colors } };
    const added = addToSlots(game.gameState.aura, slot, replaceId);
    game.gameState.aura = wear ? { ...added.aura, equipped: o.id } : added.aura;
    game.refreshAura(); game.requestSave();
    const hours = Math.round((Date.now() - Date.parse(o.created_at)) / 36e5) || 0;
    trackEvent('aura_claim', { order_id: o.id, status: o.status, hours_since_order: hours });
    if (wear) trackEvent('aura_equip', { order_id: o.id, via: 'workshop' });
    close();
  };
  wearBtn = el('button', 'primary', MSG.wear); wearBtn.onclick = () => take(true);
  keepBtn = el('button', 'ghost', MSG.keep); keepBtn.onclick = () => take(false);
  card.append(wearBtn, keepBtn);
  aiNote();
}

function drawReplace(wear, take, back) {
  card.replaceChildren();
  say(MSG.full);
  for (const s of game.gameState.aura.slots) {
    const b = el('button', 'ghost', s.recipe.name);
    b.onclick = async () => { b.disabled = true; await take(wear, s.id); b.disabled = false; };
    card.appendChild(b);
  }
  const back_ = el('button', 'ghost', '돌아가기'); back_.onclick = back; card.appendChild(back_);
}

function drawTune() {
  card.replaceChildren();
  const aura = game.gameState.aura;
  if (!aura.slots.length) { say('아직 받은 빛이 없어요.'); return; }
  say('언제든 다듬을 수 있어요.');
  for (const s of aura.slots) {
    const wearing = aura.equipped === s.id;
    const b = el('button', wearing ? 'primary' : 'ghost', wearing ? `${s.recipe.name} · 두르는 중` : s.recipe.name);
    b.onclick = () => {
      game.gameState.aura = { ...aura, equipped: wearing ? null : s.id };
      trackEvent(wearing ? 'aura_unequip' : 'aura_equip', { order_id: s.id, via: 'workshop' });
      game.refreshAura(); game.requestSave(); drawTune();
    };
    card.appendChild(b);
  }
  const cur = aura.slots.find(s => s.id === aura.equipped);
  if (!cur) return;
  const slider = (label, field, list, fmt) => {
    const row = el('div', 'row'); row.appendChild(el('span', null, label));
    const r = el('input'); r.type = 'range'; r.min = 0; r.max = list.length - 1; r.step = 1; r.value = String(Math.max(0, list.indexOf(cur.tune[field])));
    row.append(r, el('span', null, fmt(cur.tune[field])));
    r.onchange = () => {
      const value = list[Number(r.value)];
      const slots = aura.slots.map(s => (s.id === cur.id ? { ...s, tune: { ...s.tune, [field]: value } } : s));
      game.gameState.aura = { ...aura, slots };
      trackEvent('aura_tune', { order_id: cur.id, field, val: value });
      game.refreshAura(); game.requestSave(); drawTune();
    };
    card.appendChild(row);
  };
  const counts = Array.from({ length: COUNT_MAX - COUNT_MIN + 1 }, (_, i) => COUNT_MIN + i);
  slider('개수', 'count', counts, n => String(n));
  slider('빠르기', 'speed', [...SPEEDS], s => SPEED_KO[s]);
  slider('넓이', 'radius', [...RADII], s => RADIUS_KO[s]);
}
