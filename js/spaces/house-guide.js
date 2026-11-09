// First-house 50:50 experiment: plot close-up, then a compass by the player.
// Camera and modal ownership are supplied by game.js so this cannot interrupt another cutscene.
import * as THREE from 'three';
import { HOUSE_GUIDE_WOOD, houseGuideArm, houseGuideEligible } from '../house-guide-rules.js';

const DURATION = 4.5;
const IN = 1.25;
const HOLD = 1.8;
const smooth = x => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };

export function createHouseGuide(deps) {
  const forcedArm = deps.dev ? new URLSearchParams(location.search).get('houseguide') : null;
  const startingWood = deps.state().inventory.wood || 0;
  // Local QA can enter with ?dbg=1&give=wood:15&houseguide=guide without chopping five trees.
  let previousWood = (['control', 'guide'].includes(forcedArm) && startingWood >= HOUSE_GUIDE_WOOD) ? HOUSE_GUIDE_WOOD - 1 : startingWood;
  let cinematic = false;
  let elapsed = 0;
  let overlay = null;
  let compass = null;
  let groundRing = null;
  let idleSince = 0;
  let nextReminder = 0;
  let idleX = 0, idleZ = 0;
  let fromPos, fromQuat, toPos, toQuat;
  let keyHandler = null;
  const look = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const delta = new THREE.Vector3();

  function mount() {
    if (compass) return;
    const style = document.createElement('style');
    style.id = 'house-guide-style';
    style.textContent = `
      #house-guide-modal{position:fixed;inset:0;z-index:60;display:none;cursor:pointer;touch-action:none}
      #house-guide-modal.show{display:block}
      #house-guide-modal .hg-bar{position:absolute;left:0;right:0;height:clamp(48px,9vh,90px);background:#0d0f0e;transition:transform .5s ease}
      #house-guide-modal .hg-top{top:0;transform:translateY(-100%)}#house-guide-modal .hg-bottom{bottom:0;transform:translateY(100%)}
      #house-guide-modal.show .hg-bar{transform:translateY(0)}
      #house-guide-modal .hg-caption{position:absolute;left:12px;right:12px;bottom:0;height:clamp(48px,9vh,90px);display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.2;color:white;font-weight:750;font-size:clamp(18px,2.2vw,24px);text-shadow:0 1px 6px #000;opacity:0;transition:opacity .5s ease .5s}
      #house-guide-modal.show .hg-caption{opacity:1}
      #house-guide-compass{position:fixed;z-index:25;width:clamp(80px,10vw,155px);aspect-ratio:1;display:none;pointer-events:none;transform:translate(-50%,-50%)}
      #house-guide-compass .hg-pointer{position:absolute;left:50%;top:50%;width:100%;height:100%;transform:translate(-50%,-50%) rotate(var(--hg-angle,-48deg)) translateY(-45%);animation:hg-pulse 1.5s ease-in-out infinite}
      #house-guide-compass .hg-pointer::before{content:'';position:absolute;left:43%;top:1%;width:14%;height:31%;background:#88d7a0;border-radius:6px;box-shadow:0 0 9px #d5ffdc}
      #house-guide-compass .hg-pointer::after{content:'';position:absolute;left:31%;top:-6%;width:38%;height:28%;background:#a0e9ac;clip-path:polygon(50% 0,100% 100%,50% 78%,0 100%);filter:drop-shadow(0 0 5px #fff)}
      #house-guide-compass .hg-hint{position:absolute;top:110%;left:50%;transform:translateX(-50%);white-space:nowrap;padding:7px 12px;border-radius:14px;background:rgba(255,255,245,.94);color:#365b40;font-size:13px;font-weight:700;box-shadow:0 3px 12px #315b3428;display:none}
      #house-guide-compass.remind .hg-hint{display:block}
      #house-guide-compass.remind .hg-pointer{animation:hg-attention 2.8s ease-in-out infinite}
      @keyframes hg-pulse{50%{transform:translate(-50%,-50%) rotate(var(--hg-angle,-48deg)) translateY(-45%) scale(1.08)}}
      @keyframes hg-attention{0%,22%,100%{transform:translate(-50%,-50%) rotate(var(--hg-angle,-48deg)) translateY(-45%) scale(1)}6%,16%{transform:translate(-50%,-50%) rotate(var(--hg-angle,-48deg)) translateY(-55%) scale(1.2)}11%{transform:translate(-50%,-50%) rotate(var(--hg-angle,-48deg)) translateY(-45%) scale(1)}}
      @media(prefers-reduced-motion:reduce){#house-guide-compass .hg-pointer,#house-guide-compass.remind .hg-pointer{animation:none}}
    `;
    document.head.appendChild(style);
    compass = document.createElement('div');
    compass.id = 'house-guide-compass';
    compass.innerHTML = '<div class="hg-pointer"></div><div class="hg-hint"></div>';
    compass.querySelector('.hg-hint').textContent = deps.translate('화살표를 따라가요!');
    document.body.appendChild(compass);
    groundRing = new THREE.Mesh(
      new THREE.RingGeometry(1.09, 1.20, 64),
      new THREE.MeshBasicMaterial({ color: 0xfff9d2, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    );
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.06;
    groundRing.visible = false;
    deps.player.add(groundRing);
  }

  function hideCompass() {
    if (compass) compass.style.display = 'none';
    if (groundRing) groundRing.visible = false;
    idleSince = 0;
    nextReminder = 0;
    compass?.classList.remove('remind');
  }

  function makeOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'house-guide-modal';
    overlay.innerHTML = '<div class="hg-bar hg-top"></div><div class="hg-bar hg-bottom"></div><div class="hg-caption"></div>';
    overlay.querySelector('.hg-caption').textContent = deps.translate('집 터로 가서 망치로 집을 지어보아요!');
    overlay.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); finish(true); });
    document.body.appendChild(overlay);
  }

  function onInventory() {
    const gs = deps.state(), wood = gs.inventory.wood || 0;
    if (houseGuideEligible(previousWood, wood, gs.houseStage, gs.houseGuide)) {
      if (!deps.dev || forcedArm === 'control' || forcedArm === 'guide') {
        gs.houseGuide = { arm: forcedArm || houseGuideArm(deps.clientId(), deps.platform), shown: false, arrived: false };
        deps.track('house_guide_eligible', { arm: gs.houseGuide.arm, wood, house_stage: 0 });
        deps.save();
      }
    }
    previousWood = wood;
  }

  function start() {
    const gs = deps.state();
    if (!deps.cameraFree() || deps.modalOpen() || !deps.inVillage()) return;
    mount();
    if (!overlay) makeOverlay();
    cinematic = true;
    elapsed = 0;
    gs.houseGuide.shown = true;
    deps.save();
    deps.track('house_guide_shown', { arm: 'guide', wood: gs.inventory.wood || 0 });
    fromPos = deps.camera.position.clone();
    fromQuat = deps.camera.quaternion.clone();
    const house = deps.house;
    const portrait = Math.max(1, Math.min(2, 0.85 / deps.camera.aspect));
    toPos = new THREE.Vector3(house.x + 0.5, 6.2 * portrait, house.z + 8.3 * portrait);
    const aim = new THREE.Vector3(house.x, 0.25, house.z);
    const shot = deps.camera.clone();
    shot.position.copy(toPos);
    shot.lookAt(aim);
    toQuat = shot.quaternion.clone();
    deps.stopAnalog();
    document.body.classList.add('cine-open');
    overlay.classList.add('show');
    keyHandler = e => { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) finish(true); };
    window.addEventListener('keydown', keyHandler, true);
    deps.setCameraRig((camera, dt) => {
      if (!cinematic) return;
      elapsed += Math.min(dt, 0.05);
      const blend = elapsed < IN ? smooth(elapsed / IN)
        : elapsed < IN + HOLD ? 1
        : 1 - smooth((elapsed - IN - HOLD) / (DURATION - IN - HOLD));
      camera.position.lerpVectors(fromPos, toPos, blend);
      camera.quaternion.copy(fromQuat).slerp(toQuat, blend);
      if (elapsed >= DURATION) finish(false);
    });
  }

  function finish(skipped) {
    if (!cinematic) return;
    cinematic = false;
    deps.setCameraRig(null);
    deps.snapCamera();
    overlay?.classList.remove('show');
    document.body.classList.remove('cine-open');
    if (keyHandler) window.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
    deps.track('house_guide_end', { arm: 'guide', skipped: skipped ? 1 : 0 });
  }

  function update() {
    const gs = deps.state(), state = gs.houseGuide;
    if (!state || state.arm !== 'guide' || gs.houseStage !== 0) {
      hideCompass();
      return;
    }
    if (!state.shown && gs.inventory.wood >= HOUSE_GUIDE_WOOD) start();
    if (state.shown && !compass) mount();
    if (!compass || cinematic) { hideCompass(); return; }
    const distance = Math.hypot(deps.house.x - deps.player.position.x, deps.house.z - deps.player.position.z);
    if (!state.arrived && distance <= 3.2) {
      state.arrived = true;
      deps.track('house_guide_arrive', { arm: 'guide' });
      deps.save();
    }
    if (distance <= 3.2 || document.hidden || !deps.inVillage() || !deps.cameraFree() || deps.modalOpen()) {
      hideCompass(); return;
    }
    const at = deps.projectPlayer();
    if (!at) { hideCompass(); return; }
    delta.subVectors(deps.house, deps.player.position);
    right.set(1, 0, 0).applyQuaternion(deps.camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(deps.camera.quaternion);
    compass.style.left = at.x + 'px';
    compass.style.top = (at.y - 22) + 'px';
    compass.style.setProperty('--hg-angle', Math.atan2(delta.dot(right), delta.dot(up)) + 'rad');
    compass.style.display = 'block';
    groundRing.visible = true;
    const now = performance.now();
    if (!idleSince || Math.hypot(deps.player.position.x - idleX, deps.player.position.z - idleZ) > 0.15) {
      idleSince = now;
      idleX = deps.player.position.x;
      idleZ = deps.player.position.z;
      nextReminder = 0;
      compass.classList.remove('remind');
    } else if (now - idleSince >= 8000 && !compass.classList.contains('remind')) {
      compass.classList.add('remind');
      nextReminder = now + 2800;
      try { deps.playReminder(); } catch (e) { console.warn('집터 안내 효과음을 재생하지 못했습니다.', e); }
    } else if (nextReminder && now >= nextReminder) {
      nextReminder += (Math.floor((now - nextReminder) / 2800) + 1) * 2800;
      try { deps.playReminder(); } catch (e) { console.warn('집터 안내 효과음을 재생하지 못했습니다.', e); }
    }
  }

  function built() {
    hideCompass();
    if (cinematic) finish(true);
  }

  return { onInventory, update, built, get cinematic() { return cinematic; } };
}
