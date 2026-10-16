import { COLD } from './cold.js';

const CSS = `#cold-hud{position:fixed;left:50%;top:calc(var(--top-inset) + 64px);transform:translateX(-50%);display:none;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.85);font:700 12px system-ui;color:#2b2b30;pointer-events:none;z-index:15}
#cold-hud.show{display:flex}
#cold-hud .ch-bar{width:84px;height:8px;border-radius:999px;background:#e3eaf3;overflow:hidden}
#cold-hud .ch-fill{height:100%;width:0;border-radius:999px;background:#7fb2e8;transition:width .3s}
#cold-hud.shiver .ch-fill{background:#4f86c6}
#cold-hud.slow .ch-fill{background:#2f5fb0}
@media (orientation: portrait){#cold-hud{top:calc(var(--top-inset) + 80px)}}`;

let el = null;

function ensure() {
  if (el) return el;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  el = document.createElement('div');
  el.id = 'cold-hud';
  el.innerHTML = '<span>🌡️</span><span class="ch-bar"><span class="ch-fill"></span></span>';
  document.body.appendChild(el);
  return el;
}

export function showColdHud(v) {
  const e = ensure();
  e.classList.add('show');
  e.classList.toggle('shiver', v >= COLD.shiverAt && v < COLD.slowAt);
  e.classList.toggle('slow', v >= COLD.slowAt);
  e.querySelector('.ch-fill').style.width = `${Math.round(v)}%`;
}

export function hideColdHud() {
  el?.classList.remove('show');
}
