import { createCinePath } from './cine-path.js';

const BAR = 'clamp(48px,9vh,90px)';
const CSS = `
#place-cine{position:fixed;inset:0;z-index:60;display:none;cursor:pointer;touch-action:none}
#place-cine.show{display:block}
#place-cine .pc-bar{position:absolute;left:0;right:0;height:${BAR};background:#0d0f0e;transition:transform .5s ease}
#place-cine .pc-top{top:0;transform:translateY(-100%)}#place-cine .pc-bot{bottom:0;transform:translateY(100%)}
#place-cine.show .pc-bar{transform:translateY(0)}
#place-cine .pc-cap{position:absolute;left:0;right:0;bottom:0;height:${BAR};display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:0 20px;opacity:0;transform:translateY(8px);transition:opacity .45s ease,transform .45s ease}
#place-cine .pc-cap.on{opacity:1;transform:none}
#place-cine .pc-sub{font-size:clamp(11px,1.5vh,14px);font-weight:700;letter-spacing:.06em;opacity:.8}
#place-cine .pc-main{font-size:clamp(16px,2.8vh,24px);font-weight:800;margin-top:2px}
#place-cine .pc-skip{position:absolute;right:16px;top:calc(${BAR} / 2 - 8px);color:#fff;font-size:12px;opacity:.75}
`;

export function createPlaceCine(deps) {
  let el = null, run = null, keyHandler = null;

  function mount() {
    if (el) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'place-cine';
    el.innerHTML = '<div class="pc-bar pc-top"></div><div class="pc-bar pc-bot"></div><div class="pc-skip"></div><div class="pc-cap"><div class="pc-sub"></div><div class="pc-main"></div></div>';
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); skip(); });
    document.body.appendChild(el);
  }

  function caption(i) {
    const cap = el.querySelector('.pc-cap');
    cap.classList.remove('on');
    el.querySelector('.pc-main').textContent = deps.translate(run.shots[i].main);
    void cap.offsetWidth;
    cap.classList.add('on');
  }

  function skip() {
    if (!run || run.skipped) return;
    run.skipped = true;
    run.path.skip();
    el.querySelector('.pc-cap').classList.remove('on');
    el.classList.remove('show');
  }

  function end() {
    const r = run;
    run = null;
    deps.setCameraRig(null);
    el.classList.remove('show');
    document.body.classList.remove('cine-open');
    if (keyHandler) window.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
    r.onEnd?.({ skipped: r.skipped });
  }

  function play({ shots, sub, hold, onEnd }) {
    if (run || !shots.length) return false;
    mount();
    const cam = deps.camera;
    const look = deps.lookOf(cam);
    const from = { pos: { x: cam.position.x, y: cam.position.y, z: cam.position.z }, look };
    const start = { pos: { ...from.pos }, look: { ...look } };
    const home = deps.home || ((p, l) => { Object.assign(p, start.pos); Object.assign(l, start.look); });
    run = { shots, onEnd, skipped: false };
    run.path = createCinePath({ from, frames: shots.map(s => s.frame), home, hold, onShot: caption });
    el.querySelector('.pc-sub').textContent = deps.translate(sub);
    el.querySelector('.pc-skip').textContent = deps.translate('탭하면 넘어가요');
    el.querySelector('.pc-cap').classList.remove('on');
    deps.stopAnalog?.();
    document.body.classList.add('cine-open');
    deps.whoosh?.();
    el.classList.add('show');
    keyHandler = e => { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) skip(); };
    window.addEventListener('keydown', keyHandler, true);
    deps.setCameraRig((camera, dt) => {
      if (!run) return;
      const { phase } = run.path.update(Math.min(dt, 0.05));
      const c = run.path.cur;
      camera.position.set(c.pos.x, c.pos.y, c.pos.z);
      camera.lookAt(c.look.x, c.look.y, c.look.z);
      if (phase === 'done') end();
    });
    return true;
  }

  function cancel() {
    if (!run) return;
    run.onEnd = null;
    end();
  }

  return { play, skip, cancel, get active() { return !!run; } };
}
