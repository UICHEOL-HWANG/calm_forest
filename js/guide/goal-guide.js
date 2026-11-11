import * as THREE from 'three';
import { createShotRig } from '../world/tree-shot.js';
import { regionFrame } from '../world/region-cine.js';
import { ARRIVE, CINE_SUB, GOALS, detourPoint, edgeAnchor, exitFirst, guideEventParams, minerGoal, tutGoal } from './guide-rules.js';
import { storyStep } from './story-steps.js';
import { fillStepCard, stepSignature } from './step-card.js';

const CINE_HOLD = 1.6;
const CINE_DELAY = 0.6;
const NPC_CLEAR = 5;
const RESOLVE_SEC = 0.25;
const STORY_SEC = 0.5;
const BAR = 'clamp(48px,9vh,90px)';

const CSS = `
#goal-cine-modal{position:fixed;inset:0;z-index:60;display:none;cursor:pointer;touch-action:none}
#goal-cine-modal.show{display:block}
#goal-cine-modal .gc-bar{position:absolute;left:0;right:0;height:${BAR};background:#0d0f0e;transition:transform .5s ease}
#goal-cine-modal .gc-top{top:0;transform:translateY(-100%)}#goal-cine-modal .gc-bot{bottom:0;transform:translateY(100%)}
#goal-cine-modal.show .gc-bar{transform:translateY(0)}
#goal-cine-modal .gc-cap{position:absolute;left:0;right:0;bottom:0;height:${BAR};display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:0 20px;opacity:0;transform:translateY(8px);transition:opacity .6s ease .35s,transform .6s ease .35s}
#goal-cine-modal.show .gc-cap{opacity:1;transform:none}
#goal-cine-modal .gc-sub{font-size:clamp(11px,1.5vh,14px);font-weight:700;letter-spacing:.06em;opacity:.8}
#goal-cine-modal .gc-main{font-size:clamp(16px,2.8vh,24px);font-weight:800;margin-top:2px}
#goal-cine-modal .gc-skip{position:absolute;right:16px;top:calc(${BAR} / 2 - 8px);color:#fff;font-size:12px;opacity:.75}
#goal-arrow{position:fixed;inset:0;z-index:24;pointer-events:none;display:none}
#goal-arrow.show{display:block}
#goal-arrow .ga-pin{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px}
#goal-arrow .ga-dn{position:relative;flex:none;width:32px;height:42px;animation:ga-bob 1s ease-in-out infinite alternate}
#goal-arrow .ga-dn::before{content:'';position:absolute;left:3px;top:0;width:26px;height:26px;background:#bfe8c9;border:3px solid #fff7ec;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(40,70,50,.35)}
#goal-arrow .ga-dn::after{content:'';position:absolute;left:12px;top:10px;width:10px;height:10px;border-radius:50%;background:#4a5a4f}
#goal-arrow .ga-chip{padding:5px 11px;border-radius:999px;background:rgba(255,253,246,.96);color:#2f5a3a;font-weight:800;font-size:13px;box-shadow:0 3px 10px rgba(30,60,40,.25);white-space:nowrap;display:flex;align-items:center;gap:6px}
#goal-arrow .ga-edge{position:absolute;transform:translate(-50%,-50%);gap:8px}
#goal-arrow .ga-ar{position:relative;flex:none;width:30px;height:30px;border-radius:50%;background:#bfe8c9;box-shadow:0 0 0 3px #fff7ec}
#goal-arrow .ga-ar::after{content:'';position:absolute;left:8px;top:8px;width:14px;height:14px;background:#4a5a4f;clip-path:polygon(0 0,45% 0,100% 50%,45% 100%,0 100%,55% 50%)}
#goal-arrow .ga-card .rw-ad{pointer-events:auto;margin-top:4px}
#goal-arrow .ga-card{position:absolute;transform:translate(-50%,-100%);display:none;flex-direction:column;gap:2px;background:rgba(255,253,246,.97);border-radius:16px;box-shadow:0 4px 14px rgba(30,60,40,.28);padding:8px 12px;min-width:180px;max-width:min(260px,calc(100vw - 24px))}
#goal-arrow .gk-t{font-weight:800;color:#2f5a3a;font-size:14px}
#goal-arrow .gk-d{font-size:13px;color:#4a5a4f}
#goal-arrow .gk-s{margin-top:4px;padding-top:5px;border-top:1px dashed #e3dccb;font-size:12.5px;color:#7a5a20}
@keyframes ga-bob{to{transform:translateY(5px)}}
@media(prefers-reduced-motion:reduce){#goal-arrow .ga-dn{animation:none}}
`;

export function createGoalGuide(deps) {
  let goal = null, cine = null, overlay = null, arrow = null, ring = null, keyHandler = null, waitT = 0;
  let cached = null, cacheT = 0, wpCache = null, wpT = 0, edgeHalf = 96, storyMemo = null, storyT = STORY_SEC;
  const boardSeen = new Set();
  const last = {};
  const v = new THREE.Vector3(), right = new THREE.Vector3(), fwd = new THREE.Vector3();

  function mount() {
    if (arrow) return;
    const st = document.createElement('style'); st.id = 'goal-guide-style'; st.textContent = CSS; document.head.appendChild(st);
    arrow = document.createElement('div'); arrow.id = 'goal-arrow';
    arrow.innerHTML = '<div class="ga-pin"><div class="ga-chip"></div><div class="ga-dn"></div></div><div class="ga-edge ga-chip"><span class="ga-ar"></span><span class="ga-txt"></span></div><div class="ga-card"></div>';
    document.body.appendChild(arrow);
    overlay = document.createElement('div'); overlay.id = 'goal-cine-modal';
    overlay.innerHTML = '<div class="gc-bar gc-top"></div><div class="gc-bar gc-bot"></div><div class="gc-skip"></div><div class="gc-cap"><div class="gc-sub"></div><div class="gc-main"></div></div>';
    overlay.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); skip(); });
    document.body.appendChild(overlay);
    ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.16, 48),
      new THREE.MeshBasicMaterial({ color: 0xfff9d2, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.07; ring.visible = false;
    deps.scene.add(ring);
  }

  const T = (s) => deps.translate(s);
  const seen = (k) => !!deps.state().hintsSeen?.[k];
  const mark = (k) => { const gs = deps.state(); gs.hintsSeen = { ...(gs.hintsSeen || {}), [k]: true }; deps.save(); };
  const stepEvent = (act, extra = {}) => goal && deps.track('guide_step', guideEventParams(goal.flow, goal.key, act, { step: goal.step, ...extra }));

  function nearest(list, ok) {
    let best = null, bd = Infinity;
    for (const o of list) {
      if (!ok(o)) continue;
      const d = Math.hypot(o.position.x - deps.player.position.x, o.position.z - deps.player.position.z);
      if (d < bd) { bd = d; best = o.position; }
    }
    return best;
  }

  function resolve(key) {
    return exitFirst(key, resolveTarget(key), { inSpaceFor: key === 'farm' && deps.atFarm(), exitAt: deps.exitSpot() });
  }

  function resolveTarget(key) {
    const inV = deps.inVillage(), inMine = deps.atMine();
    if (key === 'tree') {
      if (!inV) return null;
      const npcs = deps.npcSpots();
      const clear = (t) => !t.userData.fallen && npcs.every(n => Math.hypot(n.x - t.position.x, n.z - t.position.z) >= NPC_CLEAR);
      return { at: nearest(deps.trees(), clear) || nearest(deps.trees(), t => !t.userData.fallen), g: GOALS.tree };
    }
    if (key === 'cave') {
      if (inV) return { at: deps.mineGate, g: GOALS.cave };
      if (inMine) return { at: nearest(deps.oreRocks(), r => !r.userData.depleted && r.userData.ore?.id === 'stone'), g: GOALS.stone };
      return null;
    }
    if (key === 'farmBranch') return inV ? { at: deps.worldTree, g: GOALS.farmBranch } : null;
    if (key.startsWith('story_')) return storyTarget(key, inV);
    const spot = deps.villageSpots()[key];
    if (spot) return inV ? { at: spot.at, via: spot.via || null, g: GOALS[key] } : null;
    if (!inMine) return null;
    if (key === 'coal') return { at: nearest(deps.oreRocks(), r => !r.userData.depleted && r.userData.ore?.id === 'coal'), g: GOALS.coal };
    const spots = deps.mineSpots();
    if (key === 'miner') return { at: spots.miner, g: GOALS.miner };
    if (key === 'lift') return { at: spots.lift, g: GOALS.lift };
    return null;
  }

  function storyTarget(key, inV) {
    const st = goal?.story;
    if (!st) return null;
    const g = { ico: st.ico, label: st.label || '', title: st.title };
    if (key === 'story_worldTree') return inV ? { at: deps.worldTree, g } : null;
    if (key === 'story_cafeDoor') return inV ? { at: deps.cafeGate, g } : null;
    if (key === 'story_cafeGuest') { const at = deps.atCafe() ? deps.cafeGuestAt(st.guest) : null; return at ? { at, g } : null; }
    return null;
  }

  function wanted() {
    const gs = deps.state();
    if (deps.coaching()) {
      const step = gs.hintsSeen?.tutStep;
      const g = tutGoal(step, { wood: gs.inventory.wood || 0 });
      if (g) return { flow: 'tut', step, ...g };
    }
    if (!seen('guideFarmTab') && deps.farmBranchDue()) return { flow: 'tree', step: 'farm', key: 'farmBranch', cine: true };
    if (deps.atMine()) {
      const g = minerGoal(gs.delve, gs.inventory);
      if (g) return { flow: 'mine', step: `stage${gs.delve.stage}`, ...g };
    }
    if (storyMemo && storyMemo.where !== 'board') return { flow: 'story', step: storyMemo.rule, key: `story_${storyMemo.where}`, story: storyMemo, cine: false };
    return null;
  }

  function setGoal(w) {
    const same = goal && w && goal.flow === w.flow && goal.key === w.key && goal.step === w.step;
    if (same && w.story) goal.story = w.story;
    if (same || (!goal && !w)) return;
    goal = w ? { ...w, arrived: false, cineKey: `guideCine_${w.key}` } : null;
    waitT = 0; cached = null; wpCache = null;
    if (goal) {
      const r = resolve(goal.key);
      stepEvent('start', r?.at ? { dist: Math.hypot(r.at.x - deps.player.position.x, r.at.z - deps.player.position.z) } : {});
    }
  }

  function canCine() {
    return deps.cameraFree() && !deps.modalOpen() && !document.hidden;
  }

  function startCine(at, g) {
    mount();
    mark(goal.cineKey);
    overlay.querySelector('.gc-sub').textContent = T(CINE_SUB);
    overlay.querySelector('.gc-main').textContent = T(g.title);
    overlay.querySelector('.gc-skip').textContent = T('탭하면 넘어가요');
    const cam = deps.camera;
    cam.getWorldDirection(v);
    const p0 = cam.position, d0 = Math.hypot(p0.x - deps.player.position.x, p0.y - deps.player.position.y - 1.2, p0.z - deps.player.position.z);
    const from = { pos: { x: p0.x, y: p0.y, z: p0.z }, look: { x: p0.x + v.x * d0, y: p0.y + v.y * d0, z: p0.z + v.z * d0 } };
    const rig = createShotRig({ from, to: regionFrame({ x: at.x, z: at.z }, cam.aspect), home: deps.defaultCamPose, hold: CINE_HOLD });
    cine = { rig, skipped: false };
    deps.stopAnalog();
    document.body.classList.add('cine-open');
    deps.whoosh?.();
    overlay.classList.add('show');
    keyHandler = e => { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) skip(); };
    window.addEventListener('keydown', keyHandler, true);
    deps.setCameraRig((camera, dt) => {
      if (!cine) return;
      const ph = cine.rig.update(Math.min(dt, 0.05));
      const c = cine.rig.cur;
      camera.position.set(c.pos.x, c.pos.y, c.pos.z);
      camera.lookAt(c.look.x, c.look.y, c.look.z);
      if (ph === 'done') endCine();
    });
    stepEvent('cine');
  }

  function skip() {
    if (!cine || cine.skipped) return;
    cine.skipped = true;
    cine.rig.skip();
    overlay?.classList.remove('show');
    stepEvent('cine_skip');
  }

  function endCine() {
    if (!cine) return;
    cine = null;
    deps.setCameraRig(null);
    overlay?.classList.remove('show');
    document.body.classList.remove('cine-open');
    if (keyHandler) window.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
  }

  function hideArrow() {
    if (arrow) arrow.classList.remove('show');
    if (ring) ring.visible = false;
  }

  function screenDir(from, to) {
    right.set(1, 0, 0).applyQuaternion(deps.camera.quaternion); right.y = 0; right.normalize();
    fwd.set(0, 0, -1).applyQuaternion(deps.camera.quaternion); fwd.y = 0; fwd.normalize();
    const dx = to.x - from.x, dz = to.z - from.z;
    return { x: dx * right.x + dz * right.z, y: -(dx * fwd.x + dz * fwd.z) };
  }

  function put(el, key, prop, val) {
    if (last[key] === val) return;
    last[key] = val;
    if (prop === 'text') el.textContent = val;
    else el.style[prop] = val;
  }

  function drawArrow(r, dt) {
    mount();
    const { at, g, via } = r;
    const p = deps.player.position;
    const dist = Math.hypot(at.x - p.x, at.z - p.z);
    goal.near = !r.exit && dist < (ARRIVE[goal.key] || 1.5);
    if (goal.near || (r.exit && dist < ARRIVE.exit)) {
      if (goal.near && !goal.arrived) { goal.arrived = true; stepEvent('arrive'); }
      if (goal.near && goal.story) { drawCard(at); return; }
      hideArrow();
      return;
    }
    put(arrow.querySelector('.ga-card'), 'cd', 'display', 'none');
    const W = innerWidth, H = innerHeight;
    const top = Math.max(110, deps.topInset()), bottom = Math.max(deps.touch() ? 190 : 96, deps.bottomInset?.() || 0), side = 72, pinSide = 44;
    const text = `${g.ico} ${T(g.label)} ${Math.round(dist)}m`;
    const sp = deps.project(v.set(at.x, 0, at.z), 2.6);
    const pin = arrow.querySelector('.ga-pin'), edge = arrow.querySelector('.ga-edge');
    ring.position.x = at.x; ring.position.z = at.z;
    if (sp && sp.x >= pinSide && sp.x <= W - pinSide && sp.y >= 90 && sp.y <= H - bottom) {
      put(pin, 'pd', 'display', 'flex'); put(edge, 'ed', 'display', 'none');
      put(pin, 'pl', 'left', Math.round(sp.x) + 'px'); put(pin, 'pt', 'top', Math.round(sp.y) + 'px');
      put(pin.querySelector('.ga-chip'), 'ptx', 'text', text);
      ring.visible = true;
    } else {
      const me = deps.project(p, 1.2) || { x: W / 2, y: H / 2 };
      wpT += dt;
      if (!wpCache || wpT >= RESOLVE_SEC) { wpT = 0; edgeHalf = edge.offsetWidth ? edge.offsetWidth / 2 + 12 : edgeHalf; const to = via || at; wpCache = detourPoint({ x: p.x, z: p.z }, { x: to.x, z: to.z }, deps.solids()); }
      const wp = wpCache;
      const d = screenDir(p, wp);
      const a = edgeAnchor(me, { x: me.x + d.x * 1e4, y: me.y + d.y * 1e4 }, W, H, side);
      put(edge, 'ed', 'display', 'flex'); put(pin, 'pd', 'display', 'none');
      put(edge, 'el', 'left', Math.round(Math.min(W - edgeHalf, Math.max(edgeHalf, a.x))) + 'px');
      put(edge, 'et', 'top', Math.round(Math.min(H - bottom, Math.max(top, a.y))) + 'px');
      put(edge.querySelector('.ga-ar'), 'ea', 'transform', `rotate(${a.ang.toFixed(2)}rad)`);
      put(edge.querySelector('.ga-txt'), 'etx', 'text', text);
      ring.visible = false;
    }
    arrow.classList.add('show');
  }

  function drawCard(at) {
    const st = goal.story, card = arrow.querySelector('.ga-card');
    const sp = deps.project(v.set(at.x, 0, at.z), 2.4);
    put(arrow.querySelector('.ga-pin'), 'pd', 'display', 'none'); put(arrow.querySelector('.ga-edge'), 'ed', 'display', 'none');
    if (!sp) { put(card, 'cd', 'display', 'none'); return; }
    const half = Math.min(130, innerWidth / 2 - 12);
    put(card, 'cd', 'display', 'flex');
    put(card, 'cl', 'left', Math.round(Math.min(innerWidth - half, Math.max(half, sp.x))) + 'px');
    put(card, 'ct', 'top', Math.round(Math.max(Math.max(110, deps.topInset()) + 90, sp.y)) + 'px');
    const sig = stepSignature(st);
    if (last.csig !== sig) {
      last.csig = sig;
      fillStepCard(card, st, { t: 'gk-t', d: 'gk-d', s: 'gk-s' }, T);
      const b = st.key === 'cafe_short' ? deps.adButton?.('cafe_order', st.shortList) : null;
      if (b) card.append(b);
    }
    ring.visible = false;
    arrow.classList.add('show');
  }

  function update(dt = 1 / 60) {
    storyT += dt;
    if (storyT >= STORY_SEC) { storyT = 0; const snap = deps.storySnap?.(); storyMemo = snap ? storyStep({ ...snap, boardOpen: false }) : null; }
    if (cine) return;
    setGoal(wanted());
    if (!goal) { hideArrow(); return; }
    cacheT += dt;
    if (!cached || cached.goal !== goal || cacheT >= RESOLVE_SEC) { cacheT = 0; cached = { goal, r: resolve(goal.key) }; }
    const r = cached.r;
    if (!r?.at) { hideArrow(); return; }
    if (goal.cine && !r.exit && !seen(goal.cineKey)) {
      hideArrow();
      waitT += dt;
      if (waitT >= CINE_DELAY && canCine()) startCine(r.at, r.g);
      return;
    }
    if (deps.modalOpen() || document.hidden || !deps.cameraFree()) { hideArrow(); return; }
    drawArrow(r, dt);
  }

  function boardTab(id) {
    if (id !== 'farm' || seen('guideFarmTab') || !deps.farmBranchDue()) return;
    if (goal?.key === 'farmBranch') stepEvent('done');
    mark('guideFarmTab');
  }

  function boardHint(tab) {
    const snap = deps.storySnap?.();
    const st = snap ? storyStep({ ...snap, boardOpen: true, boardTab: tab }) : null;
    if (!st || st.where !== 'board') return null;
    if (!boardSeen.has(st.key)) { boardSeen.add(st.key); deps.track('guide_step', guideEventParams('story', st.key, 'start', { step: st.rule })); }
    return st;
  }

  function debug() {
    const r = goal && resolve(goal.key);
    const p = deps.player.position;
    const to = r?.via || r?.at;
    const wp = to ? detourPoint({ x: p.x, z: p.z }, { x: to.x, z: to.z }, deps.solids()) : null;
    return { goal: goal && { flow: goal.flow, key: goal.key, step: goal.step, arrived: goal.arrived, near: !!goal.near }, at: r?.at ? { x: r.at.x, z: r.at.z } : null, wp, cine: !!cine, exit: !!r?.exit, story: storyMemo && storyMemo.key };
  }

  return { update, boardTab, boardHint, skip, debug, get cinematic() { return !!cine; } };
}
