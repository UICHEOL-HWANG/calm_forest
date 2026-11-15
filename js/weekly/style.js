export const FLY_MS = 700;

export const WEEKLY_CSS = `
#weekly-modal { position: fixed; inset: 0; z-index: 44; display: none; place-items: center; grid-template: minmax(0, 1fr) / minmax(0, 1fr); box-sizing: border-box; background: rgba(20,40,30,0.55);
  padding: calc(12px + var(--top-inset, 0px)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
#weekly-modal.show { display: grid; }
#weekly-modal .wk { --font: system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; --num: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
  --wk-w: 380px; --x-bg: #fff6e2; --x-ink: #5a3818; --cork: #c99c63;
  position: relative; width: min(var(--wk-w), 100%); max-height: 100%; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto; grid-template-areas: "head" "side" "main" "foot";
  overflow: hidden; font-family: var(--font); text-align: left; word-break: keep-all; overflow-wrap: break-word; outline: none; box-sizing: border-box;
  background: radial-gradient(circle at 20% 30%, rgba(120,72,30,.22) 1.2px, transparent 1.8px) 0 0 / 9px 11px, radial-gradient(circle at 70% 60%, rgba(255,240,210,.25) 1px, transparent 1.6px) 0 0 / 7px 8px, var(--cork);
  border: 10px solid #8a5a32; border-radius: 24px; box-shadow: inset 0 2px 10px rgba(60,30,10,.35), 0 0 0 2px #6e4524; padding: 10px; color: #3a2410; }
#weekly-modal .wk-market { --wk-w: 380px; border-top-width: 0; padding-top: 40px; }
#weekly-modal .wk * { box-sizing: border-box; }
#weekly-modal .wk h2, #weekly-modal .wk p { margin: 0; }
#weekly-modal .wk button { font-family: inherit; cursor: pointer; }
#weekly-modal .wk button:active { transform: translateY(1px) scale(.98); }
#weekly-modal .wk-head { grid-area: head; position: relative; display: flex; align-items: flex-start; gap: 8px; padding: 0 0 12px; }
#weekly-modal .wk-side { grid-area: side; min-width: 0; }
#weekly-modal .wk-main { grid-area: main; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; }
#weekly-modal .wk-foot { grid-area: foot; min-width: 0; display: grid; gap: 8px; padding-top: 8px; }
#weekly-modal .wk-sign { flex: 1; min-width: 0; background: linear-gradient(#f6e2b8, #e9cb93); border-radius: 10px; padding: 8px 12px 9px; box-shadow: 0 3px 0 #b88a52, 0 6px 10px rgba(60,30,10,.25); transform: rotate(-1deg); }
#weekly-modal .wk-t { font-size: 20px; font-weight: 900; color: #4a2c10; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; }
#weekly-modal .wk-s { font-size: 12.5px; font-weight: 700; color: #6a4520; margin-top: 2px; line-height: 1.4; }
#weekly-modal .wk-x { flex: none; width: 44px; height: 44px; border: 0; border-radius: 14px; display: grid; place-items: center; background: var(--x-bg); color: var(--x-ink); box-shadow: 0 3px 0 #b88a52; padding: 0; }
#weekly-modal .wk-x svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; fill: none; }
#weekly-modal .wk-chip { line-height: 1; display: inline-flex; align-items: center; gap: 5px; height: 44px; padding: 0 12px 0 14px; background: #ffd66b; color: #4a3200; font-size: 13px; font-weight: 800; white-space: nowrap; flex: none; transform: rotate(2deg); box-shadow: 0 3px 6px rgba(60,30,10,.3);
  -webkit-mask: radial-gradient(circle 5px at 0 50%, #0000 96%, #000) left / 51% 100% no-repeat, radial-gradient(circle 5px at 100% 50%, #0000 96%, #000) right / 51% 100% no-repeat; mask: radial-gradient(circle 5px at 0 50%, #0000 96%, #000) left / 51% 100% no-repeat, radial-gradient(circle 5px at 100% 50%, #0000 96%, #000) right / 51% 100% no-repeat; }
#weekly-modal .wk-chip .num { font-size: 17px; font-weight: 900; }
#weekly-modal .wk-chip small { font-size: 12px; font-weight: 800; color: #6b4a10; }
#weekly-modal .num { font-family: var(--num); font-variant-numeric: tabular-nums; }
#weekly-modal .g-field { --g-bg: #eaf3d9; --g-fill: #86b95c; }
#weekly-modal .g-water { --g-bg: #dcecf4; --g-fill: #5b9fc6; }
#weekly-modal .g-craft { --g-bg: #fbe4d5; --g-fill: #e0875a; }
#weekly-modal .g-explore { --g-bg: #e8e3f3; --g-fill: #8f7bc6; }
#weekly-modal .g-village { --g-bg: #f8e9bd; --g-fill: #dcab35; }
#weekly-modal .wk-bar { height: 6px; border-radius: 99px; background: #efe4cc; overflow: hidden; flex: 1; }
#weekly-modal .wk-bar i { display: block; height: 100%; border-radius: inherit; background: var(--g-fill); }
#weekly-modal .wk-list { display: grid; gap: 12px; padding: 6px 4px 8px; }
#weekly-modal .wk-n { position: relative; background: #fffdf5; border-radius: 4px 4px 10px 4px; padding: 14px 12px 12px; box-shadow: 0 2px 0 rgba(0,0,0,.05), 0 6px 12px rgba(60,30,10,.22); transform: rotate(var(--r, 0deg)); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
#weekly-modal .wk-n:nth-child(4n+1) { --r: -1.1deg; } #weekly-modal .wk-n:nth-child(4n+2) { --r: .8deg; } #weekly-modal .wk-n:nth-child(4n+3) { --r: -.4deg; } #weekly-modal .wk-n:nth-child(4n+4) { --r: 1.2deg; }
#weekly-modal .wk-n::before { content: ""; position: absolute; top: -5px; left: 50%; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff8 0 2px, transparent 3px), var(--g-fill); box-shadow: 0 2px 2px rgba(0,0,0,.35); }
#weekly-modal .wk-tx { min-width: 0; display: grid; gap: 6px; }
#weekly-modal .wk-hd { display: flex; align-items: center; gap: 8px; }
#weekly-modal .wk-ic { font-size: 20px; flex: none; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: var(--g-bg); line-height: 1; }
#weekly-modal .wk-nm { font-size: 14.5px; font-weight: 800; line-height: 1.35; color: #33200c; }
#weekly-modal .wk-pg { display: flex; align-items: center; gap: 8px; }
#weekly-modal .wk-ct { font-size: 13px; font-weight: 800; color: #6a4a2a; flex: none; white-space: nowrap; }
#weekly-modal .wk-ct b { font-size: 16px; color: #33200c; }
#weekly-modal .wk-stub { position: relative; align-self: stretch; display: grid; place-items: center; padding: 6px 8px 6px 14px; margin: -14px -12px -12px 0; border-radius: 0 4px 10px 0; background: #ffd66b; transform-origin: 0 50%; animation: wk-wiggle 4s ease-in-out infinite;
  -webkit-mask: radial-gradient(circle 3.5px at 0 7px, #0000 96%, #000) 0 0 / 100% 14px; mask: radial-gradient(circle 3.5px at 0 7px, #0000 96%, #000) 0 0 / 100% 14px; }
#weekly-modal .wk-claim { min-height: 48px; border: 0; border-radius: 10px; padding: 0 12px; background: #4a2c10; color: #ffe39a; font-size: 14.5px; font-weight: 900; white-space: nowrap; }
#weekly-modal .wk-claim.dim { opacity: .55; filter: saturate(.6); }
#weekly-modal .wk-n.claiming .wk-stub { animation: wk-tear .55s cubic-bezier(.5,0,.7,.4) forwards; }
#weekly-modal .wk-stamp { display: grid; place-items: center; min-width: 80px; height: 44px; padding: 0 10px; border: 3px solid #b23a26; border-radius: 10px; color: #b23a26; font-size: 15px; font-weight: 900; transform: rotate(-12deg); white-space: nowrap; background: rgba(255,253,245,.6); }
#weekly-modal .wk-n.st-done { background: #f6f1e4; }
#weekly-modal .wk-n.st-done .wk-nm { color: #4f3a22; }
#weekly-modal .wk-n.just .wk-stamp { animation: wk-stamp .45s cubic-bezier(.2,1.4,.5,1) both; }
#weekly-modal .wk-msg { grid-column: 1 / -1; font-size: 13px; font-weight: 800; color: #8a3518; line-height: 1.45; background: #fde3d3; border-radius: 8px; padding: 8px 10px; }
#weekly-modal .wk-tag { background: #f3e4c4; color: #4a2c10; border-radius: 8px; padding: 9px 12px; font-size: 13px; font-weight: 800; line-height: 1.4; box-shadow: 0 3px 8px rgba(60,30,10,.25); display: flex; gap: 8px; align-items: center; }
#weekly-modal .wk-tag .ei { font-size: 18px; flex: none; line-height: 1; }
#weekly-modal .wk-tag.lite { background: #fffdf5; font-weight: 700; font-size: 12.5px; color: #5a3818; }
#weekly-modal .wk-awn { position: absolute; left: 0; right: 0; top: 0; height: 30px; background: repeating-linear-gradient(90deg, #4f8a60 0 30px, #fdf6e3 30px 60px);
  -webkit-mask: radial-gradient(circle 15px at 15px 15px, #000 96%, #0000) 0 15px / 30px 15px repeat-x, linear-gradient(#000, #000) 0 0 / 100% 16px no-repeat; mask: radial-gradient(circle 15px at 15px 15px, #000 96%, #0000) 0 15px / 30px 15px repeat-x, linear-gradient(#000, #000) 0 0 / 100% 16px no-repeat; }
#weekly-modal .wk-thumb { display: grid; place-items: center; line-height: 1; border-radius: 10px; background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.75), rgba(255,255,255,0) 58%), linear-gradient(160deg, var(--th) 0%, color-mix(in srgb, var(--th) 78%, #6b4a2a) 100%); box-shadow: inset 0 -6px 0 rgba(0,0,0,.06); }
#weekly-modal .wk-thumb { position: relative; }
#weekly-modal .wk-thumb .wk-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
#weekly-modal .wk-crate { position: relative; background: #fffdf5; border-radius: 6px 6px 12px 6px; padding: 12px; box-shadow: 0 6px 12px rgba(60,30,10,.22); display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 6px 12px; align-items: center; transform: rotate(-.6deg); margin: 2px 4px 10px; }
#weekly-modal .wk-crate .wk-thumb { width: 92px; height: 92px; font-size: 46px; grid-row: span 2; }
#weekly-modal .wk-crate .act { grid-column: 1 / -1; }
#weekly-modal .wk-it .nm { font-size: 15px; font-weight: 900; color: #33200c; }
#weekly-modal .wk-it .ds { font-size: 12.5px; font-weight: 600; color: #5e4428; line-height: 1.4; margin-top: 2px; }
#weekly-modal .wk-price { justify-self: start; line-height: 1; display: inline-flex; align-items: center; gap: 3px; margin-top: 6px; height: 26px; padding: 0 10px 0 12px; background: #ffd66b; color: #4a3200; font-weight: 900; font-size: 13px; white-space: nowrap;
  -webkit-mask: radial-gradient(circle 4px at 0 50%, #0000 96%, #000); mask: radial-gradient(circle 4px at 0 50%, #0000 96%, #000); }
#weekly-modal .wk-tags { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 4px; }
#weekly-modal .wk-hang { position: relative; background: #fffdf5; border-radius: 12px 12px 10px 10px; padding: 18px 10px 10px; box-shadow: 0 6px 12px rgba(60,30,10,.22); display: grid; gap: 6px; align-content: start; transform: rotate(var(--r, 0deg)); }
#weekly-modal .wk-hang:nth-child(1) { --r: -1.4deg; } #weekly-modal .wk-hang:nth-child(2) { --r: 1.2deg; }
#weekly-modal .wk-hang::before { content: ""; position: absolute; top: 6px; left: 50%; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: #c99c63; box-shadow: inset 0 1px 2px rgba(0,0,0,.4); }
#weekly-modal .wk-hang .wk-thumb { height: 62px; font-size: 32px; }
#weekly-modal .wk-hang .act { margin-top: 4px; }
#weekly-modal .wk-buy { width: 100%; min-height: 46px; border: 0; border-radius: 10px; font-size: 14.5px; font-weight: 900; background: #4f8a60; color: #fff; white-space: nowrap; }
#weekly-modal .wk-crate .wk-buy { background: #4a2c10; color: #ffe39a; }
#weekly-modal .wk-short, #weekly-modal .wk-own { display: grid; place-items: center; min-height: 46px; border-radius: 10px; font-size: 14px; font-weight: 800; text-align: center; }
#weekly-modal .wk-short { background: #fde3d3; color: #8a3518; border: 2px dashed #d9967a; }
#weekly-modal .wk-own { color: #b23a26; border: 3px solid #b23a26; transform: rotate(-3deg); }
#weekly-modal .wk-guest { background: #fffdf5; border-radius: 10px; padding: 10px 10px 10px 12px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; font-size: 13px; font-weight: 800; color: #3e2f7a; line-height: 1.4; box-shadow: 0 4px 10px rgba(60,30,10,.25); }
#weekly-modal .wk-guest button { min-height: 44px; border: 0; border-radius: 10px; padding: 0 14px; background: #4b3a8a; color: #fff; font-weight: 900; font-size: 14px; white-space: nowrap; }
.wk-fly { position: fixed; z-index: 60; left: 0; top: 0; font-size: 22px; line-height: 1; pointer-events: none; animation: wk-fly ${FLY_MS}ms cubic-bezier(.3,.7,.2,1) forwards; }
@keyframes wk-fly { 0% { transform: translate(0,0) scale(1); opacity: 0; } 15% { opacity: 1; transform: translate(0,-14px) scale(1.25); } 100% { transform: translate(var(--dx), var(--dy)) scale(.6); opacity: .2; } }
@keyframes wk-bump { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
#weekly-modal .wk-bump { display: inline-block; animation: wk-bump .45s cubic-bezier(.3,1.6,.5,1); }
@keyframes wk-wiggle { 0%, 86%, 100% { transform: rotate(0); } 90% { transform: rotate(-3deg); } 95% { transform: rotate(2deg); } }
@keyframes wk-tear { 0% { transform: rotate(0); } 25% { transform: rotate(-6deg) translateX(4px); } 100% { transform: rotate(18deg) translate(20px, 60px); opacity: 0; } }
@keyframes wk-stamp { 0% { transform: scale(1.8) rotate(-12deg); opacity: 0; } 60% { transform: scale(.94) rotate(-12deg); opacity: 1; } 100% { transform: scale(1) rotate(-12deg); opacity: 1; } }
@media (min-width: 900px) and (min-height: 501px) {
  #weekly-modal { padding: 24px; }
  #weekly-modal .wk { --wk-w: 440px; }
  #weekly-modal .wk-market { --wk-w: 460px; }
}
@media (orientation: landscape) and (max-height: 500px) {
  #weekly-modal { padding: 8px max(18px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left)); }
  #weekly-modal .wk, #weekly-modal .wk-market { --wk-w: 720px; border-width: 8px; padding: 8px; grid-template-columns: 236px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; grid-template-areas: "head head" "side main" "foot main"; }
  #weekly-modal .wk-market { border-top-width: 0; padding-top: 28px; }
  #weekly-modal .wk-side { overflow: hidden; }
  #weekly-modal .wk-head { padding-bottom: 6px; align-items: center; }
  #weekly-modal .wk-sign { display: flex; align-items: baseline; gap: 10px; padding: 6px 12px; }
  #weekly-modal .wk-t { font-size: 18px; flex: none; }
  #weekly-modal .wk-s { white-space: nowrap; overflow: hidden; margin: 0; }
  #weekly-modal .wk-list { grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 8px; }
  #weekly-modal .wk-n.st-claim { grid-column: 1 / -1; }
  #weekly-modal .wk-stamp { min-width: 64px; padding: 0 6px; font-size: 13px; }
  #weekly-modal .wk-foot { padding: 6px 10px 0 2px; align-self: end; }
  #weekly-modal .wk-side { padding: 6px 10px 0 2px; }
  #weekly-modal .wk-strip { grid-template-areas: "head head" "side main" "foot foot"; }
  #weekly-modal .wk-strip .wk-foot { padding: 6px 2px 0; }
  #weekly-modal .wk-awn { height: 22px; }
  #weekly-modal .wk-crate { grid-template-columns: 1fr; margin: 4px 2px 0; padding: 8px; }
  #weekly-modal .wk-crate .wk-thumb { width: 100%; height: 56px; grid-row: auto; font-size: 34px; }
  #weekly-modal .wk-crate .ds { display: none; }
  #weekly-modal .wk-tags { padding-top: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  #weekly-modal .wk *, #weekly-modal .wk *::before, #weekly-modal .wk *::after, .wk-fly { animation: none !important; transition: none !important; }
  .wk-fly { display: none; }
}
`;
