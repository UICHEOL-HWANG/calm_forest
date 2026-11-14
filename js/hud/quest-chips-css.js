const SVG = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
const HEART = 'M12 16.75C9.9 15.35 8.5 14.16 8.5 12.69C8.5 11.43 9.48 10.45 10.6 10.45C11.23 10.45 11.72 10.73 12 11.15C12.28 10.73 12.77 10.45 13.4 10.45C14.52 10.45 15.5 11.43 15.5 12.69C15.5 14.16 14.1 15.35 12 16.75Z';

export const ICONS = {
  q: SVG + '<rect x="6" y="5" width="12" height="14" fill="#fff"/>'
    + '<path d="M6 7.5v9M18 7.5v9M9 10.5h6M9 13.5h3.5" stroke="#3f7a55" stroke-width="1.75"/>'
    + '<rect x="4" y="3" width="16" height="4.5" rx="2.25" fill="#fff" stroke="#3f7a55" stroke-width="1.75"/>'
    + '<rect x="4" y="16.5" width="16" height="4.5" rx="2.25" fill="#fff" stroke="#3f7a55" stroke-width="1.75"/></svg>',
  a: SVG + '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="#fff" stroke="#b14f73" stroke-width="1.75"/>'
    + '<path d="M4.2 7L12 12.6 19.8 7" stroke="#b14f73" stroke-width="1.75"/>'
    + `<path d="${HEART}" fill="#e6789a" stroke="#b14f73" stroke-width="1.25"/></svg>`,
  x: SVG + '<path d="M7 7l10 10M17 7L7 17" stroke="#4a5a4f" stroke-width="2.25"/></svg>',
};

export const QUEST_CHIPS_CSS = `
body.is-touch #quest-panel { width: 48px; padding: 0 !important; background: none !important; box-shadow: none !important;
  backdrop-filter: none !important; -webkit-backdrop-filter: none !important; border-radius: 0 !important;
  max-width: none !important; max-height: none !important; overflow: visible !important; z-index: 9; }
body.is-touch #quest-panel.qc-open { z-index: 20; }
body.quest-sheet-open #goal-arrow, body.quest-sheet-open #guide-card, body.quest-sheet-open #guide-mark, body.quest-sheet-open #guide-edge, body.quest-sheet-open [id$="-guide-compass"], body.quest-sheet-open [id$="-guide-mark"], body.quest-sheet-open [id$="-guide-edge"] { display: none !important; }
#qc-btns { position: relative; display: flex; flex-direction: column; gap: 8px; }
.qc-rb { position: relative; display: block; width: 48px; height: 48px; padding: 4px; border: 0; border-radius: 50%; cursor: pointer;
  background: conic-gradient(var(--qc-ring) calc(var(--p, 0) * 1turn), #fff 0);
  box-shadow: 0 0 0 1px rgba(74,90,79,.12), var(--shadow); transition: transform .1s; -webkit-tap-highlight-color: transparent; }
.qc-rb[hidden] { display: none; }
.qc-rb[data-k=q] { --qc-ring: #2f9e58; --qc-disc: #e6f6ea; }
.qc-rb[data-k=a] { --qc-ring: #d9467a; --qc-disc: #fdedf2; }
.qc-in { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--qc-disc); }
.qc-in svg { display: block; width: 24px; height: 24px; }
.qc-rb:active { transform: scale(.94); }
.qc-rb:focus-visible, .qc-tabs button:focus-visible { outline: 3px solid #ffc94a; outline-offset: 2px; }
.qc-rb.qc-on { box-shadow: 0 0 0 2px #fff, 0 0 16px 4px rgba(255,190,74,.75); animation: qc-glow 1.2s ease-in-out infinite; }
.qc-rb.qc-on .qc-in { background: #fff1cc; }
@keyframes qc-glow { 50% { box-shadow: 0 0 0 2px #fff, 0 0 4px 1px rgba(255,190,74,.4); } }
.qc-badge, .qc-dot { position: absolute; transform: translate(-50%, -50%); pointer-events: none; }
.qc-badge { left: 41px; top: 41px; height: 16px; min-width: 24px; padding: 0 4px; box-sizing: border-box; border-radius: 8px; background: #fff; color: var(--ink);
  font-size: 11px; font-weight: 800; line-height: 16px; text-align: center; white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,.18); font-variant-numeric: tabular-nums; }
.qc-badge:empty, .qc-dot[hidden] { display: none; }
.qc-rb.qc-on .qc-badge { background: #e8a33c; color: #fff; }
.qc-dot { left: 41px; top: 7px; width: 12px; height: 12px; border-radius: 50%; background: #e0533d; box-shadow: 0 0 0 2px #fff7ec; }
#qc-shade { position: fixed; inset: 0; pointer-events: none; opacity: 0; transition: opacity .4s;
  background: radial-gradient(circle at var(--sx, 36px) var(--sy, 124px), rgba(20,40,30,0) 32px, rgba(20,40,30,.28) 64px); }
#quest-panel.qc-glow #qc-shade { opacity: 1; }
#qc-dim { position: fixed; left: 0; right: 0; top: 0; background: rgba(20,40,30,.35); }
#qc-sheet { position: fixed; box-sizing: border-box; padding: 0 16px 16px; border-radius: 20px; background: #fffdf7; color: var(--ink);
  box-shadow: 0 -8px 24px rgba(0,0,0,.18); overflow-y: auto; overscroll-behavior: contain; animation: qc-up .18s ease-out; }
#qc-dim[hidden], #qc-sheet[hidden], .qc-pane[hidden], .qc-tab[hidden] { display: none; }
@keyframes qc-up { from { transform: translateY(16px); opacity: 0; } }
.qc-grab { width: 40px; height: 4px; border-radius: 2px; background: rgba(0,0,0,.14); margin: 8px auto; }
.qc-tabs { display: flex; gap: 8px; }
.qc-tabs button { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 8px; border: 0; border-radius: 12px;
  background: #f1f4ef; color: var(--ink); font: inherit; font-weight: 800; font-size: 15px; line-height: 20px; cursor: pointer; }
.qc-tab { flex: 1; min-width: 0; }
.qc-tabs svg { display: block; width: 20px; height: 20px; flex: none; }
.qc-tab[data-k=q][aria-selected=true] { background: #bfe8c9; }
.qc-tab[data-k=a][aria-selected=true] { background: #fbdbe4; }
.qc-tabs .qc-x { flex: 0 0 44px; padding: 0; }
.qc-body { margin-top: 16px; }
body.is-touch #qc-sheet .q-how { display: block; }
body.is-touch #qc-sheet #aff-track { margin-top: 0; }
@media (prefers-reduced-motion: reduce) { .qc-rb.qc-on, #qc-sheet { animation: none; } }
`;
