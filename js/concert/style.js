const CSS = `
.cc-root { position: fixed; inset: 0; z-index: 44; display: none; place-items: center; grid-template: minmax(0, 1fr) / minmax(0, 1fr); box-sizing: border-box; background: rgba(8,14,34,.56);
  padding: calc(12px + var(--top-inset, 0px)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
.cc-root.show { display: grid; }
.cc-root *, #concert-show-modal * { box-sizing: border-box; }
.cc-card { --font: Pretendard, system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; --num: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
  position: relative; overflow: hidden; outline: none; font-family: var(--font); word-break: keep-all; line-height: 1.35; text-align: left; color: #f6ecd4; -webkit-font-smoothing: antialiased;
  border-radius: 26px; background: radial-gradient(130% 70% at 50% 0, #2c3d68 0, #1a2545 62%), #1a2545; box-shadow: inset 0 0 0 1.5px rgba(255,226,160,.3), 0 18px 40px rgba(4,8,24,.55); }
.cc-card h2, .cc-card h3, .cc-card h4, .cc-card p { margin: 0; }
.cc-card button { font-family: inherit; cursor: pointer; border: 0; }
.cc-card button:active { transform: translateY(1px) scale(.98); }
.cc-card svg { display: block; }
.cc-deco { position: absolute; left: 0; right: 0; top: 0; height: 30px; pointer-events: none; filter: drop-shadow(0 0 5px rgba(255,200,110,.9)) drop-shadow(0 0 12px rgba(255,190,100,.45)); }
.cc-deco svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.cc-deco path { fill: none; stroke: #3a3040; stroke-width: 1.6; vector-effect: non-scaling-stroke; }
.cc-bulb { position: absolute; width: 8.2px; height: 13.8px; margin-left: -4.1px; }
.cc-bulb::before { content: ""; position: absolute; left: 1.85px; top: 0; width: 4.5px; height: 3px; border-radius: 1px; background: #6b5334; }
.cc-bulb::after { content: ""; position: absolute; left: 0; top: 2.8px; width: 8.2px; height: 10px; border-radius: 50%; background: var(--bc); }
.cc-hall { width: min(380px, 100%); max-height: 100%; min-height: 0; display: grid; grid-template: "hd" auto "tabs" auto "body" minmax(0, 1fr) / minmax(0, 1fr); row-gap: 12px; padding: 42px 14px 14px; }
.cc-hd { grid-area: hd; display: grid; grid-template: "ttl purse x" / minmax(0, 1fr) auto auto; align-items: center; gap: 8px; }
.cc-ttl { grid-area: ttl; min-width: 0; }
.cc-ttl h2 { font-size: 20px; font-weight: 900; letter-spacing: -.02em; white-space: nowrap; }
.cc-ttl p { font-size: 12.5px; font-weight: 700; margin-top: 2px; color: #c3cbe2; line-height: 1.4; text-wrap: balance; }
.cc-purse { grid-area: purse; display: inline-flex; align-items: center; gap: 4px; height: 40px; padding: 0 12px 0 9px; white-space: nowrap; justify-self: start; border-radius: 99px; background: #0f1731; color: #ffd27a; box-shadow: inset 0 0 0 1.5px rgba(255,210,122,.55), 0 0 14px rgba(255,200,110,.25); }
.cc-purse svg { width: 18px; height: 18px; }
.cc-purse small { font-size: 12px; font-weight: 800; color: #f6ecd4; }
.cc-purse b { font: 900 18px var(--num); font-variant-numeric: tabular-nums; }
.cc-x { grid-area: x; width: 44px; height: 44px; display: grid; place-items: center; padding: 0; border-radius: 50%; background: rgba(255,255,255,.1); color: #f6ecd4; }
.cc-x svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; fill: none; }
.cc-tabs { grid-area: tabs; display: flex; gap: 6px; min-width: 0; align-self: start; }
.cc-tabs button { flex: 1; min-height: 44px; padding: 0 6px; font-size: 14px; font-weight: 800; white-space: nowrap; background: none; color: #c3cbe2; border-radius: 99px; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.16); }
.cc-tabs button.on { background: linear-gradient(#ffd98a, #f3b452); color: #2a1c05; box-shadow: 0 0 16px rgba(255,200,110,.5); }
.cc-body { grid-area: body; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-width: none; display: grid; align-content: start; gap: 8px; }
.cc-body::-webkit-scrollbar { display: none; }
.cc-list { display: grid; gap: 8px; min-width: 0; }
.cc-row { background: rgba(255,255,255,.075); border-radius: 18px; box-shadow: inset 0 1px 0 rgba(255,236,190,.22), inset 0 0 0 1px rgba(255,236,190,.1); }
.cc-song { display: grid; grid-template: "mark info stub" / auto minmax(0, 1fr) auto; align-items: center; column-gap: 12px; min-height: 70px; padding: 0 12px 0 14px; }
.cc-lv0 { --lc: #9fdc8c; } .cc-lv1 { --lc: #ffc864; } .cc-lv2 { --lc: #ff8f6b; }
.cc-mark { grid-area: mark; position: relative; width: 20px; height: 26px; border-radius: 9px; background: radial-gradient(circle at 50% 45%, #fff6d8 0 18%, var(--lc) 62%); box-shadow: 0 0 14px var(--lc), 0 0 4px var(--lc); }
.cc-mark::before { content: ""; position: absolute; left: 5px; right: 5px; top: -4px; height: 5px; border-radius: 2px; background: #6b5334; }
.cc-info { grid-area: info; min-width: 0; display: grid; gap: 5px; }
.cc-song h4 { font-size: 16.5px; font-weight: 900; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-meta { display: flex; align-items: center; gap: 8px; }
.cc-lv { font-size: 12.5px; font-weight: 800; color: var(--lc); white-space: nowrap; }
.cc-stars { display: inline-flex; gap: 2px; }
.cc-stars svg { width: 19px; height: 19px; stroke-width: 1.6; stroke-linejoin: round; }
.cc-stars .on { fill: #ffd27a; stroke: #ffd27a; filter: drop-shadow(0 0 4px rgba(255,200,110,.85)); }
.cc-stars .off { fill: none; stroke: rgba(255,255,255,.34); }
.cc-stub { grid-area: stub; display: grid; }
.cc-btn { min-height: 44px; padding: 0 14px; font-size: 13.5px; font-weight: 900; white-space: nowrap; display: inline-grid; place-items: center; border-radius: 99px; }
.cc-song .cc-btn { min-height: 46px; font-size: 14.5px; padding: 0 16px; }
.cc-pri { background: linear-gradient(#ffd98a, #f3b452); color: #2a1c05; box-shadow: 0 0 14px rgba(255,200,110,.4); }
.cc-sec { background: none; color: #ffdf9c; box-shadow: inset 0 0 0 1.5px rgba(255,210,122,.75); }
.cc-card .cc-quiet { background: none; color: rgba(195,203,226,.62); box-shadow: inset 0 0 0 1.5px rgba(195,203,226,.2); cursor: default; }
.cc-card .cc-quiet:active { transform: none; }
.cc-tag { min-height: 44px; padding: 0 10px; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 99px; text-align: center; line-height: 1.3; }
.cc-on { color: #ffd27a; white-space: nowrap; }
.cc-short { background: rgba(255,150,120,.13); color: #ffc4b0; padding: 6px 12px; text-wrap: balance; }
.cc-own { color: #b4e6b0; white-space: nowrap; }
.cc-soon { color: #b3bbd4; white-space: nowrap; }
.cc-eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
.cc-eq b { width: 3px; border-radius: 2px; background: currentColor; transform-origin: 50% 100%; animation: cc-eq 1s ease-in-out infinite; }
.cc-eq b:nth-child(1) { height: 6px; } .cc-eq b:nth-child(2) { height: 12px; animation-delay: -.35s; } .cc-eq b:nth-child(3) { height: 8px; animation-delay: -.7s; }
@keyframes cc-eq { 0%, 100% { transform: scaleY(.45); } 50% { transform: scaleY(1); } }
.cc-inst { display: grid; grid-template: "gl nm act" / 44px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 62px; padding: 8px 10px; }
.cc-gl { grid-area: gl; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,236,190,.12); }
.cc-gl svg { width: 36px; height: 36px; }
.cc-nm { grid-area: nm; min-width: 0; display: grid; gap: 5px; }
.cc-inst h4 { font-size: 14.5px; font-weight: 900; white-space: nowrap; letter-spacing: -.01em; }
.cc-dots { display: flex; gap: 4px; }
.cc-dots i { width: 16px; height: 7px; border-radius: 4px; }
.cc-act { grid-area: act; display: grid; min-width: 0; }
.cc-inst .cc-short { max-width: 156px; font-size: 12.5px; }
.cc-decs { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.cc-dec { display: grid; grid-template: "th pr" auto "act act" auto / 52px minmax(0, 1fr); gap: 8px 10px; align-items: center; min-width: 0; padding: 10px; }
.cc-th { grid-area: th; position: relative; width: 52px; height: 52px; border-radius: 14px; overflow: hidden; display: grid; place-items: center; color: rgba(255,226,166,.42);
  background: radial-gradient(circle at 34% 28%, rgba(255,246,216,.2), rgba(255,246,216,0) 60%), rgba(255,236,190,.1); box-shadow: inset 0 0 0 1px rgba(255,236,190,.14); }
.cc-th svg { width: 22px; height: 22px; }
.cc-th img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.cc-pr { grid-area: pr; display: inline-flex; align-items: center; gap: 3px; color: #ffd27a; font: 900 17px var(--num); font-variant-numeric: tabular-nums; }
.cc-pr svg { width: 16px; height: 16px; }
.cc-dec .cc-act > * { width: 100%; padding: 0 6px; font-size: 12.5px; }
.cc-dec .cc-short { padding: 6px 8px; font-size: 12px; }
.cc-guest { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 10px; align-items: center; padding: 10px 12px; font-size: 12.5px; font-weight: 800; line-height: 1.45; background: rgba(255,210,122,.12); color: #f6ecd4; border-radius: 16px; box-shadow: inset 0 0 0 1.5px rgba(255,210,122,.4); }
.cc-guest > svg { width: 22px; height: 22px; fill: none; stroke: #ffd27a; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.cc-guest .cc-btn { grid-column: 1 / -1; }
.cc-res { width: min(320px, 100%); max-height: 100%; overflow: auto; scrollbar-width: none; display: grid; gap: 14px; text-align: center; padding: 46px 16px 16px; }
.cc-res::-webkit-scrollbar { display: none; }
.cc-rtop { display: grid; justify-items: center; gap: 8px; }
.cc-res h3 { font-size: 20px; font-weight: 900; letter-spacing: -.02em; }
.cc-res .cc-stars svg { width: 46px; height: 46px; stroke-width: 1.3; }
.cc-res .cc-stars svg:nth-child(2) { width: 56px; height: 56px; margin-top: -10px; }
.cc-l1 { display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-size: 16px; font-weight: 900; line-height: 1.4; }
.cc-l1 svg { flex: none; width: 18px; height: 18px; color: #ffd27a; }
.cc-l1.cc-free { font-size: 14px; font-weight: 800; color: #dfe4f2; }
.cc-l2 { font-size: 13px; font-weight: 900; padding: 4px 12px; white-space: nowrap; color: #2a1c05; background: linear-gradient(#ffd98a, #f3b452); border-radius: 99px; box-shadow: 0 0 16px rgba(255,200,110,.5); }
.cc-rbot { display: grid; gap: 12px; }
.cc-cnt { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.cc-cnt div { display: grid; gap: 1px; padding: 8px 2px; background: rgba(255,255,255,.075); border-radius: 14px; }
.cc-cnt b { font: 900 21px var(--num); font-variant-numeric: tabular-nums; }
.cc-cnt span { font-size: 12px; font-weight: 800; white-space: nowrap; color: #c3cbe2; }
.cc-cnt div:nth-child(1) b { color: #ffd27a; } .cc-cnt div:nth-child(2) b { color: #b4e6b0; } .cc-cnt div:nth-child(3) b { color: #b3bbd4; }
.cc-btns { display: grid; grid-template-columns: 1.35fr 1fr; gap: 8px; }
.cc-btns .cc-btn { min-height: 48px; font-size: 15px; }
#concert-show-modal { position: fixed; inset: 0; z-index: 43; display: none; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
  font-family: Pretendard, system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; word-break: keep-all; color: #f6ecd4; }
#concert-show-modal.show { display: block; }
.cc-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.cc-hud { position: absolute; left: max(12px, env(safe-area-inset-left)); right: max(12px, env(safe-area-inset-right)); top: calc(12px + var(--top-inset, 0px)); display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; pointer-events: none; }
.cc-strips .cc-hud { left: 132px; right: 132px; top: 10px; }
.cc-hud > * { pointer-events: auto; }
.cc-chip { display: grid; place-items: center; height: 44px; width: 112px; padding: 0 14px; border-radius: 99px; background: rgba(15,23,49,.86); box-shadow: inset 0 0 0 1.5px rgba(255,226,160,.3); }
.cc-prog { display: block; width: 100%; height: 5px; border-radius: 9px; overflow: hidden; background: rgba(255,255,255,.16); }
.cc-prog i { display: block; height: 100%; width: 0; border-radius: inherit; background: #ffd27a; box-shadow: 0 0 8px #ffd27a; }
.cc-quit { min-height: 44px; padding: 0 18px; font-family: inherit; font-size: 14px; font-weight: 800; white-space: nowrap; margin-left: auto; border: 0; cursor: pointer; color: #f6ecd4; border-radius: 99px; background: rgba(15,23,49,.86); box-shadow: inset 0 0 0 1.5px rgba(255,226,160,.45); }
.cc-hintrow { position: absolute; left: 12px; right: 12px; top: calc(66px + var(--top-inset, 0px)); display: grid; place-items: center; pointer-events: none; }
.cc-hint { display: flex; align-items: center; gap: 10px; padding: 9px 14px; font-size: 13.5px; font-weight: 800; line-height: 1.4; text-align: center; border-radius: 22px; background: rgba(15,23,49,.9); color: #f6ecd4; box-shadow: inset 0 0 0 1.5px rgba(255,226,160,.35); }
.cc-hint span { text-wrap: balance; }
.cc-hint i { flex: none; width: 12px; height: 16px; border-radius: 5px; box-shadow: 0 0 10px currentColor; }
.cc-strips .cc-hud .cc-hint { font-size: 13px; padding: 4px 14px; min-height: 44px; }
@media (min-width: 900px) and (min-height: 501px) {
  .cc-root { padding: 24px; }
  .cc-hall { width: 520px; }
  .cc-inst .cc-short { max-width: none; white-space: nowrap; }
  .cc-decs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cc-res { width: 360px; }
  .cc-hud { left: 22px; right: 22px; top: 20px; }
  .cc-hintrow { top: 20px; }
  .cc-hint { font-size: 15px; padding: 11px 18px; }
}
@media (orientation: landscape) and (max-height: 500px) {
  .cc-root { padding: 8px max(14px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); }
  .cc-hall { width: min(712px, 100%); height: 100%; grid-template: "hd body" auto "tabs body" minmax(0, 1fr) / 204px minmax(0, 1fr); column-gap: 12px; padding-top: 38px; }
  .cc-hd { grid-template: "ttl ttl" auto "purse x" auto / minmax(0, 1fr) auto; }
  .cc-tabs { flex-direction: column; }
  .cc-tabs button { flex: none; }
  .cc-body { align-content: safe center; }
  .cc-guest { grid-template-columns: auto minmax(0, 1fr) auto; padding: 6px 6px 6px 12px; }
  .cc-guest .cc-btn { grid-column: auto; }
  .cc-dec { grid-template-columns: 44px minmax(0, 1fr); padding: 8px; gap: 6px 8px; }
  .cc-th { width: 44px; height: 44px; border-radius: 12px; }
  .cc-songs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cc-song { grid-template: "mark" auto "info" 1fr "stub" auto / minmax(0, 1fr); justify-items: center; text-align: center; min-height: 220px; padding: 18px 12px 12px; row-gap: 10px; }
  .cc-song .cc-info { justify-items: center; align-content: center; gap: 8px; }
  .cc-song h4 { font-size: 18px; }
  .cc-song .cc-meta { flex-direction: column; }
  .cc-song .cc-stars svg { width: 24px; height: 24px; }
  .cc-song .cc-stub { justify-self: stretch; }
  .cc-insts { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cc-inst { grid-template: "gl nm" auto "act act" auto / 44px minmax(0, 1fr); gap: 8px; }
  .cc-inst .cc-act > * { width: 100%; max-width: none; padding: 0 4px; font-size: 12.5px; }
  .cc-inst .cc-short { padding: 4px 8px; font-size: 12px; }
  .cc-decs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cc-res { width: min(580px, 100%); grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 18px; padding-top: 40px; }
}
body.concert-open #topleft, body.concert-open #topright, body.concert-open #story-chip, body.concert-open #toast, body.concert-open #hint-banner,
body.concert-open #cam-reset-btn, body.concert-open #guide-card, body.concert-open #guide-mark, body.concert-open #guide-edge,
body.concert-open [id$="-guide-compass"], body.concert-open [id$="-guide-mark"], body.concert-open [id$="-guide-edge"] { display: none !important; }
@media (prefers-reduced-motion: reduce) {
  .cc-card *, .cc-card *::before, .cc-card *::after { animation: none !important; transition: none !important; }
}
`;

export function ensureConcertStyle() {
  if (document.getElementById('concert-style')) return;
  const style = document.createElement('style');
  style.id = 'concert-style';
  style.textContent = CSS;
  document.head.append(style);
}
