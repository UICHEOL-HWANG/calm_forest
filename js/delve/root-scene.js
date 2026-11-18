import { camera, defaultCamPose, gameState, Input, removeSolid, renderer, requestSave, setCameraRig, solidCircle, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { ROOT_CINE_TOAST } from '../data/delve.js';
import { makeRootShrine } from './root-shrine.js';
import { cineShots, createRootCine } from './root-cine.js';

const SEEN = 'mineRootLit';
let solids = [];
let cine = null;
let overlay = null;
let onKey = null;

export function placeRootShrine(parent, at, theme, side, lamp) {
  clearRootShrine();
  const shrine = makeRootShrine(theme, side);
  shrine.g.position.copy(at);
  parent.add(shrine.g);
  shrine.g.updateMatrixWorld(true);
  if (lamp) { lamp.position.set(at.x + shrine.lampAt.x, at.y + shrine.lampAt.y, at.z + shrine.lampAt.z); lamp.intensity = 1.6; lamp.distance = 6; lamp.decay = 1.3; }
  solids = shrine.solids.map(s => solidCircle(at.x + s.x, at.z + s.z, s.r));
  const seen = !!gameState.hintsSeen?.[SEEN];
  shrine.setLit(seen);
  shrine.textures.forEach(t => renderer?.initTexture?.(t));
  if (!seen) playRootCine(shrine);
  return shrine;
}

export function clearRootShrine() {
  solids.forEach(removeSolid);
  solids = [];
  if (cine) endRootCine(true);
}

function playRootCine(shrine) {
  const from = { pos: {}, look: {} };
  defaultCamPose(from.pos, from.look);
  const panels = shrine.panels.map(p => shrine.g.localToWorld(p.clone()));
  const rig = createRootCine({
    from, shots: cineShots(panels, camera.aspect, camera.fov), home: defaultCamPose,
    onLight: () => { shrine.setLit(true); Sound.complete?.(); },
  });
  cine = { rig, shrine, skipped: false, t0: performance.now() };
  Input.setAnalog?.(0, 0);
  setCameraRig((cam, dt) => {
    if (!cine) return;
    const ph = cine.rig.update(Math.min(dt, 0.05));
    const c = cine.rig.cur;
    cam.position.set(c.pos.x, c.pos.y, c.pos.z);
    cam.lookAt(c.look.x, c.look.y, c.look.z);
    if (ph === 'done') endRootCine(false);
  });
  showOverlay();
}

function skipRootCine() {
  if (!cine || cine.rig.phase !== 'run') return;
  cine.skipped = true;
  cine.rig.skip();
}

function endRootCine(aborted) {
  const { skipped, t0, shrine } = cine;
  cine = null;
  setCameraRig(null);
  hideOverlay();
  if (!aborted) shrine.setLit(true);
  if (!aborted) {
    gameState.hintsSeen = { ...gameState.hintsSeen, [SEEN]: true };
    requestSave();
    ui.toast?.(ROOT_CINE_TOAST, 3200);
  }
  trackEvent('delve_root_cine', { skipped: skipped || aborted ? 1 : 0, sec: Math.round((performance.now() - t0) / 1000) });
}

function showOverlay() {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'rootcine-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:60;cursor:pointer;-webkit-tap-highlight-color:transparent;'
      + 'background:linear-gradient(to bottom,rgba(0,0,0,0.22),transparent 16%,transparent 84%,rgba(0,0,0,0.22));';
    const hint = document.createElement('div');
    hint.textContent = '탭하면 넘어가요';
    hint.style.cssText = 'position:absolute;left:50%;bottom:calc(min(104px, 12vh) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);'
      + 'padding:4px 12px;border-radius:999px;background:rgba(30,40,30,0.38);color:#fff;font-size:12px;opacity:0.85;pointer-events:none;white-space:nowrap;';
    overlay.appendChild(hint);
    overlay.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); skipRootCine(); });
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'block';
  document.body.classList.add('cine-open');
  onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || /^F\d+$/.test(e.key)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat) skipRootCine();
  };
  window.addEventListener('keydown', onKey, true);
}

function hideOverlay() {
  if (overlay) overlay.style.display = 'none';
  document.body.classList.remove('cine-open');
  if (onKey) window.removeEventListener('keydown', onKey, true);
  onKey = null;
}
