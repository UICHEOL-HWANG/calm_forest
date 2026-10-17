import { createToolFan } from './tool-fan.js';

const CSS = `
body.is-touch #talk-btn { display: none !important; }
@media (orientation: portrait) {
  body.is-touch #toast, body.is-touch.coaching #toast, body.is-touch.hintbanner #toast, body.is-touch.decor-guide #toast, body.is-touch.mist-guide #toast {
    top: auto !important; bottom: calc(var(--hud-bottom, 230px) + 14px); }
  body.is-touch:has(#hint-banner.slot-bottom.show) #toast { bottom: calc(282px + 70px + env(safe-area-inset-bottom)); }
}
body.is-touch:not(.coaching) #hint-banner:not(.slot-bottom) { top: var(--rcol-bottom, calc(64px + var(--top-inset))); left: auto; right: max(12px, calc(env(safe-area-inset-right) + 8px)); transform: none; }

body.is-touch #hotbar { left: 0; top: 0; bottom: auto; transform: none; padding: 0; width: 0; height: 0; overflow: visible; background: none; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
body.is-touch #hotbar > .slot { display: none !important; }
#tool-btn { position: fixed; z-index: 8; width: 58px; height: 58px; border-radius: 50%; border: 3px solid #7cc06e; background: #f2fbea; box-shadow: var(--shadow);
  display: grid; place-items: center; padding: 0; touch-action: none; cursor: pointer; font-family: inherit; color: var(--ink); }
#tool-btn, #tool-fan, #near-pill { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
#tool-btn:not(.placed), #tool-name:not(.placed) { visibility: hidden; }
body.menu-open #tool-btn, body.menu-open #tool-name { display: none; }
#tool-btn[data-page="out"] { border-color: #6fb3dc; background: #eaf5fc; }
#tool-btn[data-page="none"] { border-color: #b8c6bd; background: #fff; }
#tool-btn .tb-ico { font-size: 27px; line-height: 1; display: grid; place-items: center; }
#tool-btn .tb-ico svg { width: 27px !important; height: 27px !important; }
#tool-btn .tb-arr { position: absolute; top: 50%; transform: translateY(-50%); font-size: 9px; font-weight: 900; color: #3f7a3d; opacity: .75; }
#tool-btn .tb-arr.l { left: -12px; } #tool-btn .tb-arr.r { right: -12px; }
#tool-btn .tb-tip { display: none; position: absolute; bottom: calc(100% + 8px); right: -6px; white-space: nowrap; font-size: 11px; font-weight: 800; color: #5b4300;
  background: #ffe68a; border-radius: 9px; padding: 4px 9px; box-shadow: var(--shadow); pointer-events: none; }
#tool-btn.fresh .tb-tip, body.coach-toolpage #tool-btn .tb-tip { display: block; }
body.tool-fan-open #tool-btn .tb-tip { display: none; }
#tool-btn.fresh, body.coach-toolpage #tool-btn { animation: toolbtnpulse 1.4s ease-in-out infinite; }
@keyframes toolbtnpulse { 0%, 100% { box-shadow: var(--shadow); } 50% { box-shadow: 0 0 0 7px rgba(255,170,60,.45), var(--shadow); } }
#tool-name { position: fixed; z-index: 8; transform: translateX(-50%); background: rgba(255,250,240,.95); color: var(--ink); border-radius: 10px; padding: 2px 9px;
  font-size: 11.5px; font-weight: 800; white-space: nowrap; box-shadow: var(--shadow); pointer-events: none; }
#tool-fan { position: fixed; inset: 0; z-index: 45; background: rgba(30,24,14,.32); touch-action: none; }
.tf-slot { position: absolute; width: 50px; height: 50px; margin: -25px 0 0 -25px; border-radius: 50%; display: grid; place-items: center; box-shadow: var(--shadow);
  transition: transform .12s; animation: tfpop .16s ease-out both; }
.tf-slot.farm { background: #ecf8df; border: 2px solid #a8d88a; }
.tf-slot.out { background: #e3f2fb; border: 2px solid #9ccbe8; }
.tf-slot.bare { background: #fff; border: 2px solid #c9d3cc; }
.tf-slot.on { border: 3px solid #3f9a4a; }
.tf-slot.hover { transform: scale(1.22); border-color: #ff8a3d; z-index: 2; }
.tf-ico { font-size: 25px; line-height: 1; display: grid; place-items: center; }
.tf-ico svg { width: 25px !important; height: 25px !important; }
.tf-name { position: absolute; top: calc(100% + 1px); left: 50%; transform: translateX(-50%); font-size: 10.5px; font-weight: 800; color: #fff; white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0,0,0,.7); pointer-events: none; }
@keyframes tfpop { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }

#near-pill { position: fixed; left: 0; top: 0; z-index: 7; width: 50px; height: 50px; margin: -25px 0 0 -25px; border-radius: 50%; border: 3px solid #e9a23b; background: #fff;
  box-shadow: 0 0 0 5px rgba(233,162,59,.28), var(--shadow); display: none; place-items: center; font-size: 25px; padding: 0; touch-action: manipulation; cursor: pointer;
  font-family: inherit; animation: pillbob 1.6s ease-in-out infinite; }
#near-pill.show { display: grid; }
@keyframes pillbob { 0%, 100% { margin-top: -25px; } 50% { margin-top: -30px; } }
body:not(.playing) #near-pill, body.menu-open #near-pill, body.mg-open #near-pill, body.duel-open #near-pill, body.intro-open #near-pill,
body.dream-cut #near-pill, body.guide-open #near-pill, body.boat-run #near-pill, body.tool-fan-open #near-pill { display: none !important; }
body.is-touch.near-pill-on #door-prompt { opacity: 0 !important; }

`;

const $ = (id) => document.getElementById(id);

export function initMobileHud({ Input, t, act, trackEvent }) {
  const style = document.createElement('style');
  style.id = 'mobile-hud-css'; style.textContent = CSS;
  document.head.appendChild(style);

  const fan = createToolFan({ Input, t, act, trackEvent });
  const pill = document.createElement('button');
  pill.id = 'near-pill'; pill.type = 'button';
  document.body.appendChild(pill);
  let npc = null, door = null, kind = null, raf = 0;
  pill.addEventListener('pointerdown', (e) => e.stopPropagation());
  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!kind) return;
    trackEvent?.('near_pill_tap', { kind, icon: pill.textContent });
    if (kind === 'npc') Input.doTalk?.(); else Input.doAction?.();
  });
  function tick() {
    if (!kind) { raf = 0; return; }
    const p = Input.playerScreenPos?.();
    if (p) { pill.style.left = Math.round(p.x + 38) + 'px'; pill.style.top = Math.round(p.y - 18) + 'px'; }
    pill.style.visibility = p ? '' : 'hidden';
    raf = requestAnimationFrame(tick);
  }
  function refreshPill() {
    kind = npc ? 'npc' : door ? 'door' : null;
    pill.textContent = npc ? '💬' : door || '';
    pill.classList.toggle('show', !!kind);
    document.body.classList.toggle('near-pill-on', kind === 'door');
    if (kind && !raf) raf = requestAnimationFrame(tick);
  }

  return {
    onTool(idx, tools, page) { fan.mount($('hotbar')); fan.onTool(idx, tools, page); fan.layout(); },
    onNpc(text) { npc = text || null; refreshPill(); },
    onDoor(text, info, icon) { door = text && !info ? icon : null; refreshPill(); },
    setCoachStep(key) { document.body.classList.toggle('coach-toolpage', key === 'toolpage'); },
  };
}
