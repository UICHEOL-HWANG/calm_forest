import { repeatOpen, rushTargets } from '../guide/prepass-rules.js';

const TICK = 0.3;
const CSS = `
#farm-rush{position:fixed;left:50%;transform:translateX(-50%);z-index:22;display:none;pointer-events:none}
#farm-rush.show{display:block}
`;

export function createFarmRush(deps) {
  let root = null, btn = null, t = TICK, shownN = -1;
  const ad = deps.rewarded;

  function mount() {
    if (root) return;
    const st = document.createElement('style'); st.id = 'farm-rush-style'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'farm-rush';
    btn = ad.button(() => ({ slot: 'farm_rush', plots: rushTargets(deps.plots()) }), [], (ctx) => deps.grant(ctx.plots), () => { shownN = -1; t = TICK; });
    root.appendChild(btn); document.body.appendChild(root);
  }

  function hide() { if (root) root.classList.remove('show'); shownN = -1; }

  function update(dt = 1 / 60) {
    t += dt;
    if (t < TICK) return;
    t = 0;
    const ok = deps.atFarm() && !deps.modalOpen() && repeatOpen(deps.state().houseStage);
    const n = ok ? rushTargets(deps.plots()).length : 0;
    if (!n) { hide(); return; }
    if (!ad.offer('farm_rush')) { hide(); return; }
    mount();
    if (n !== shownN) { shownN = n; ad.label(btn, ['🎬 ', '광고 보고', ' ', `🌱 ${n}`, deps.unit(), ' ', '지금 다 자라게']); }
    root.style.bottom = `${Math.max(120, deps.bottomInset())}px`;
    root.classList.add('show');
  }

  return { update, debug: () => ({ shown: !!root?.classList.contains('show'), n: shownN }) };
}
