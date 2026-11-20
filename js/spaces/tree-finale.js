import {
  Input, camera, defaultCamPose, gameState, isNight, npcObjs, requestSave, scene, setCameraRig, syncStory, todayStr, isStoryBooted,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { t as tr } from '../i18n.js';
import { NEIGHBOR_GATE } from '../data/places.js';
import { setNpcGlyphsHidden } from './npc.js';
import { inVillage2 } from './doors.js';
import { finaleDue, finaleVia, hasKeeperTitle, markFinaleSeen } from '../world/finale-rules.js';
import { createFinaleRig, rootPoints } from '../world/finale-rig.js';
import { buildFinaleArt } from '../world/finale-art.js';

const BAR = 'clamp(48px,9vh,90px)';
let T = null, art = null, pts = null, tree = null, run = null, chAtBoot = null, overlay = null, onKey = null;
let shownBloom = -1, shownNight = null;

export function initFinale(three, box, treePos) {
  if (art) return;
  T = three;
  tree = { x: treePos.x, z: treePos.z };
  pts = rootPoints(tree, { x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z });
  art = buildFinaleArt(three, { box, pts });
  art.group.visible = false;
  scene.add(art.group);
}

export const finaleBusy = () => !!run;

export function finaleFogPush() {
  if (!run) return 0;
  const c = run.rig.cur;
  return Math.max(0, Math.hypot(c.pos.x - c.look.x, c.pos.y - c.look.y, c.pos.z - c.look.z) - 21);
}

export function replayFinale() { start(true); }

function show(bloom, reveal, dt, animate = true) {
  if (bloom !== shownBloom) { art.setBloom(bloom); shownBloom = bloom; }
  art.setReveal(reveal);
  const night = isNight();
  if (night !== shownNight) { art.setNight(night); shownNight = night; }
  if (animate) art.update(dt);
}

export function updateFinale(dt, ready) {
  if (!art) return;
  if (!isStoryBooted()) return;
  if (chAtBoot == null) chAtBoot = Number(gameState.story?.ch) || 0;
  if (run) {
    if (!inVillage2() && run.rig.phase !== 'card') end(); else step(dt);
    return;
  }
  const keeper = hasKeeperTitle(gameState);
  art.group.visible = keeper;
  if (keeper) show(1, 1, dt, inVillage2());
  if (ready && finaleDue(gameState)) start(false);
}

function staging() {
  const list = npcObjs.filter(o => o.group && !o.hidden && o.def.id !== 'merchant');
  return list.map((o, i) => {
    const k = 0.1 + (i / Math.max(1, list.length)) * 0.75;
    const a = pts[Math.min(pts.length - 1, Math.round(k * (pts.length - 1)))];
    const side = i % 2 ? 1.8 : -1.8;
    return { o, x: a.x + side, z: a.z, face: Math.atan2(-side, 0), save: { p: o.group.position.clone(), r: o.group.rotation.y } };
  });
}

function start(replay) {
  if (run) return;
  const via = finaleVia(chAtBoot, gameState, replay);
  if (!replay) { gameState.hintsSeen = markFinaleSeen(gameState.hintsSeen, todayStr()); requestSave(); }
  const fwd = new T.Vector3();
  camera.getWorldDirection(fwd);
  const p0 = camera.position;
  const from = { pos: { x: p0.x, y: p0.y, z: p0.z }, look: { x: p0.x + fwd.x * 20, y: p0.y + fwd.y * 20, z: p0.z + fwd.z * 20 } };
  const rig = createFinaleRig({ from, pts, tree, aspect: camera.aspect, home: defaultCamPose });
  const cast = staging();
  const sprites = [];
  for (const c of cast) c.o.group.traverse(ch => { if (ch.isSprite && ch.visible) { ch.visible = false; sprites.push(ch); } });
  run = { rig, via, skipped: false, t0: performance.now(), cast, sprites };
  art.group.visible = true;
  shownBloom = -1;
  show(0, 0, 0);
  Input.setAnalog?.(0, 0);
  setNpcGlyphsHidden(true);
  setCameraRig((cam) => {
    if (!run) return;
    for (const c of run.cast) {
      c.o.group.position.set(c.x, 0, c.z); c.o.group.rotation.y = c.face;
    }
    const p = run.rig.cur;
    cam.position.set(p.pos.x, p.pos.y, p.pos.z);
    cam.lookAt(p.look.x, p.look.y, p.look.z);
  });
  showOverlay();
  Sound.cineWhoosh?.();
}

function step(dt) {
  const before = run.rig.phase;
  const ph = run.rig.update(Math.min(dt, 0.05));
  show(run.rig.bloom, run.rig.reveal, dt);
  overlay.querySelector('#fin-cap').style.opacity = run.rig.caption ? '1' : '0';
  if (ph === 'card' && before !== 'card') { overlay.querySelector('#fin-card').style.display = 'block'; Sound.complete?.(); }
  if (ph === 'done') end();
}

function skip() {
  if (!run) return;
  if (run.rig.phase === 'card') { run.rig.close(); overlay.querySelector('#fin-card').style.display = 'none'; return; }
  if (run.rig.phase === 'out') return;
  run.skipped = true;
  run.rig.skip();
}

function end() {
  const { via, skipped, t0, cast, sprites } = run;
  run = null;
  for (const c of cast) { c.o.group.position.copy(c.save.p); c.o.group.rotation.y = c.save.r; }
  for (const s of sprites) s.visible = true;
  setCameraRig(null);
  setNpcGlyphsHidden(false);
  hideOverlay();
  trackEvent('tree_finale', { skipped: skipped ? 1 : 0, sec: Math.round((performance.now() - t0) / 1000), via });
  syncStory();
}

function showOverlay() {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'finale-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:60;cursor:pointer;-webkit-tap-highlight-color:transparent;';
    overlay.innerHTML = `<div style="position:absolute;left:0;right:0;top:0;height:${BAR};background:#0d0f0e"></div>`
      + `<div style="position:absolute;left:0;right:0;bottom:0;height:${BAR};background:#0d0f0e"></div>`
      + `<div id="fin-cap" style="position:absolute;left:0;right:0;bottom:calc(${BAR} + 18px);text-align:center;color:#fff;font-size:clamp(15px,2vw,22px);font-weight:700;padding:0 20px;text-shadow:0 2px 12px rgba(0,0,0,.6);opacity:0;transition:opacity .6s ease"></div>`
      + '<div id="fin-card" style="display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(255,253,246,.96);border-radius:18px;padding:18px 26px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.25);width:min(86vw,360px)">'
      + '<div style="font-size:30px">🌸</div><div id="fin-title" style="font-size:clamp(16px,2.2vw,20px);font-weight:800;color:#2c3e4a;margin:6px 0 4px"></div>'
      + '<div id="fin-body" style="font-size:14px;color:#6b7b86;line-height:1.5"></div></div>';
    overlay.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); skip(); });
    document.body.appendChild(overlay);
  }
  overlay.querySelector('#fin-cap').textContent = tr('이웃들이 오간 길마다 뿌리가 이어졌어요');
  overlay.querySelector('#fin-title').textContent = tr('세계수가 다시 숨을 쉬어요');
  overlay.querySelector('#fin-body').replaceChildren(tr('칭호 「세계수지기」를 받았어요'), document.createElement('br'), tr('빛나는 뿌리 길이 이웃 마을까지 이어져요'));
  overlay.querySelector('#fin-card').style.display = 'none';
  overlay.style.display = 'block';
  document.body.classList.add('cine-open');
  onKey = (e) => { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) skip(); };
  window.addEventListener('keydown', onKey, true);
}

function hideOverlay() {
  if (overlay) overlay.style.display = 'none';
  document.body.classList.remove('cine-open');
  if (onKey) window.removeEventListener('keydown', onKey, true);
  onKey = null;
}
