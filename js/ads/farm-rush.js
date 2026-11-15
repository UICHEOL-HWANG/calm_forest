import { repeatOpen, rushTargets } from '../guide/prepass-rules.js';

const TICK = 0.3;
const CSS = `
.place-rush{position:fixed;left:50%;transform:translateX(-50%);z-index:22;display:none;pointer-events:none}
.place-rush.show{display:block}
`;

export function createFarmRush(deps) {
  let root = null, btn = null, t = TICK, shownN = -1;
  const ad = deps.rewarded;
  const slot = deps.slot || 'farm_rush';
  const targets = () => (deps.targets ? deps.targets() : rushTargets(deps.plots()));
  const parts = (n) => (deps.parts ? deps.parts(n) : ['광고 보고', ' ', `🌱 ${n}`, deps.unit(), ' ', '지금 다 자라게']);

  function mount() {
    if (root) return;
    if (!document.getElementById('place-rush-style')) {
      const st = document.createElement('style'); st.id = 'place-rush-style'; st.textContent = CSS; document.head.appendChild(st);
    }
    root = document.createElement('div'); root.id = deps.id || 'farm-rush'; root.className = 'place-rush';
    btn = ad.button(() => ({ slot, plots: targets() }), [], (ctx) => deps.grant(ctx.plots), () => { shownN = -1; t = TICK; });
    root.appendChild(btn); document.body.appendChild(root);
  }

  function hide() { if (root) root.classList.remove('show'); shownN = -1; }

  function update(dt = 1 / 60) {
    t += dt;
    if (t < TICK) return;
    t = 0;
    const ok = deps.atFarm() && !deps.modalOpen() && repeatOpen(deps.state().houseStage);
    const n = ok ? targets().length : 0;
    if (!n) { hide(); return; }
    if (!ad.offer(slot)) { hide(); return; }
    mount();
    if (n !== shownN) { shownN = n; ad.label(btn, parts(n)); }
    root.style.bottom = `${Math.max(120, deps.bottomInset())}px`;
    root.classList.add('show');
  }

  return { update, debug: () => ({ shown: !!root?.classList.contains('show'), n: shownN }) };
}
