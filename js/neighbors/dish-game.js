import { GAME_ZONES, beatStars, zoneStars } from './dish-rules.js';
import { DISH_COPY as D } from './dish-copy.js';

const CSS = `
#nb-cook-modal { position: fixed; left: 0; right: 0; bottom: 0; z-index: 33; display: none; }
#nb-cook-modal.show { display: block; }
#nb-cook-modal .nbc-card { background: #fff; border-radius: 20px 20px 0 0; padding: 14px 14px calc(14px + env(safe-area-inset-bottom)); box-shadow: 0 -10px 30px rgba(0,0,0,.2); text-align: center; color: var(--ink); }
@media (min-width: 720px) { #nb-cook-modal { left: auto; right: 14px; bottom: 14px; width: 300px; } #nb-cook-modal .nbc-card { border-radius: 20px; padding-bottom: 14px; } }
#nb-cook-modal h3 { margin: 0 0 3px; font-size: 15px; }
.nbc-dish { font-size: 38px; margin: 2px 0; }
.nbc-bar { position: relative; height: 22px; border-radius: 11px; background: #eef2ee; overflow: hidden; margin: 10px 0 4px; }
.nbc-bar i { position: absolute; top: 0; bottom: 0; }
.nbc-ok { background: #bfe8cf; } .nbc-best { background: #7fcf9c; }
.nbc-fill { left: 0; width: 0; background: rgba(242,194,60,.75); }
.nbc-needle { width: 5px; border-radius: 3px; background: #2f4a3c; left: 0; }
.nbc-beats { display: flex; gap: 16px; justify-content: center; margin: 12px 0 8px; }
.nbc-beat { width: 46px; height: 46px; border-radius: 50%; background: #eef2ee; display: grid; place-items: center; font-size: 22px; position: relative; }
.nbc-beat.hit { background: #bfe8cf; } .nbc-beat.miss { background: #f6d5d1; }
.nbc-beat.now::after { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 3px solid #f2c23c; animation: nbc-shrink .9s linear infinite; }
@keyframes nbc-shrink { from { transform: scale(1.5); opacity: .3; } to { transform: scale(1); opacity: 1; } }
.nbc-stars { font-size: 22px; letter-spacing: 2px; min-height: 28px; }
.nbc-stars i { font-style: normal; opacity: .22; } .nbc-stars i.on { opacity: 1; }
.nbc-res { font-size: 12.5px; font-weight: 700; min-height: 18px; margin: 2px 0 8px; }
.nbc-go { width: 100%; border: none; border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 700; background: var(--mint); color: var(--ink); box-shadow: var(--shadow); font-family: inherit; cursor: pointer; touch-action: none; -webkit-user-select: none; user-select: none; }
.nbc-go[disabled] { opacity: .5; }
body.nb-cooking #mobile-controls, body.nb-cooking #door-prompt, body.nb-cooking #near-pill, body.nb-cooking #action-btn { display: none !important; }
`;

const HOLD_RATE = 53, SWEEP_RATE = 73, BEAT_MS = 900, BEATS = 3, GAME_CAP_MS = 15000;
const TEXT = {
  hold: { title: D.gameHoldTitle, hint: D.gameHoldHint, btn: D.gameHoldBtn },
  tap: { title: D.gameTapTitle, hint: D.gameTapHint, btn: D.gameTapBtn },
  beat: { title: D.gameBeatTitle, hint: D.gameBeatHint, btn: D.gameBeatBtn },
};

let styled = false;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function zoneBar(zone, mover) {
  const bar = el('div', 'nbc-bar');
  const ok = el('i', 'nbc-ok'), best = el('i', 'nbc-best');
  ok.style.left = `${zone.ok[0]}%`; ok.style.width = `${zone.ok[1] - zone.ok[0]}%`;
  best.style.left = `${zone.best[0]}%`; best.style.width = `${zone.best[1] - zone.best[0]}%`;
  bar.append(ok, best, mover);
  return bar;
}

export function openDishGame({ game, ico, onFinish, onClose }) {
  if (!styled) { styled = true; const s = el('style'); s.id = 'nbc-style'; s.textContent = CSS; document.head.appendChild(s); }
  let root = document.getElementById('nb-cook-modal');
  if (!root) { root = el('div'); root.id = 'nb-cook-modal'; document.body.appendChild(root); }
  const copy = TEXT[game] || TEXT.tap;
  const card = el('div', 'nbc-card');
  const title = el('h3', null, copy.title);
  const stars = el('div', 'nbc-stars');
  const starEls = [0, 1, 2].map(() => stars.appendChild(el('i', null, '⭐')));
  const res = el('div', 'nbc-res', copy.hint);
  const go = el('button', 'nbc-go', copy.btn);
  const area = el('div');
  card.append(title, el('div', 'nbc-dish', ico), area, stars, res, go);
  root.replaceChildren(card);
  root.classList.add('show');
  document.body.classList.add('nb-cooking');

  let raf = 0, done = false, holding = false, t = 0, last = performance.now();
  const started = performance.now();
  const fill = el('i', 'nbc-fill'), needle = el('i', 'nbc-needle');
  const beats = [];
  let beatI = 0, hits = 0, beatT0 = 0;
  if (game === 'hold') area.appendChild(zoneBar(GAME_ZONES.hold, fill));
  else if (game === 'beat') {
    const row = el('div', 'nbc-beats');
    for (let i = 0; i < BEATS; i++) beats.push(row.appendChild(el('div', 'nbc-beat', '🌿')));
    area.appendChild(row);
  } else area.appendChild(zoneBar(GAME_ZONES.tap, needle));

  const arm = () => {
    beats.forEach(b => b.classList.remove('now'));
    void beats[beatI]?.offsetWidth;
    beats[beatI]?.classList.add('now');
    beatT0 = performance.now();
  };
  if (game === 'beat') arm();

  const sweep = (now) => { const p = ((now - started) / 1000 * SWEEP_RATE) % 196; return p <= 98 ? p : 196 - p; };

  function frame(now) {
    if (done) return;
    const dt = (now - last) / 1000; last = now;
    if (game === 'hold' && holding) { t = Math.min(100, t + dt * HOLD_RATE); fill.style.width = `${t}%`; }
    if (game === 'tap') needle.style.left = `${sweep(now)}%`;
    if (now - started > GAME_CAP_MS) finish(1);
    else raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function press() {
    if (done) return;
    if (game === 'hold') { holding = true; return; }
    if (game === 'tap') { finish(zoneStars(sweep(performance.now()), GAME_ZONES.tap)); return; }
    const ph = ((performance.now() - beatT0) % BEAT_MS) / BEAT_MS;
    const ok = ph > 0.72 || ph < 0.08;
    beats[beatI].classList.remove('now');
    beats[beatI].classList.add(ok ? 'hit' : 'miss');
    if (ok) hits++;
    beatI++;
    if (beatI < BEATS) arm(); else finish(beatStars(hits));
  }
  function release() {
    if (done || game !== 'hold' || !holding) return;
    holding = false;
    finish(zoneStars(t, GAME_ZONES.hold));
  }
  const onKey = (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keydown' && !e.repeat) (done ? go.click() : press());
    if (e.type === 'keyup') release();
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  go.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  go.addEventListener('pointerup', release);
  go.addEventListener('pointercancel', release);
  go.addEventListener('pointerleave', release);

  function close() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKey, true);
    root.classList.remove('show');
    root.replaceChildren();
    document.body.classList.remove('nb-cooking');
    onClose?.();
  }

  async function finish(n) {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    starEls.forEach((s, i) => s.classList.toggle('on', i < n));
    go.disabled = true;
    const out = await Promise.resolve(onFinish(n)).catch(() => null);
    if (!out) { close(); return; }
    title.textContent = D.doneTitle;
    area.replaceChildren();
    starEls.forEach((s, i) => s.classList.toggle('on', i < out.stars));
    res.replaceChildren(el('span', null, out.line), el('span', null, out.coin || ''));
    go.textContent = D.doneOk;
    go.disabled = false;
    go.onclick = close;
  }
}
