import * as THREE from 'three';
import { gameState, giveReward, requestSave, roundRect, scene, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { animateBubble, makeRing, onTop } from '../bubble-fx.js';
import { SHOP_DOOR } from '../data/places.js';
import { COS_LINES, COS_REWARD, afterBuy, afterVisit, shouldOffer } from '../cos-onboard.js';
import { refreshQuestPanel } from './npc.js';

const step = (s, extra = {}) => trackEvent('cos_quest', { step: s, ...extra });

export function cosQuestActive() {
  const s = gameState.progress?.cosQuest;
  return s === 'visit' || s === 'buy';
}

export function maybeOfferCosQuest({ via = 'tutorial' } = {}) {
  const p = gameState.progress;
  if (ui.coachActive?.()) return;
  if (!shouldOffer({ tutorialSeen: gameState.tutorialSeen, owned: gameState.cosmetics?.owned, stage: p.cosQuest })) return;
  p.cosQuest = 'visit';
  ui.showHintBanner?.({ ico: '🎀', title: COS_LINES.title, line: COS_LINES.offer, near: () => true });
  step('offered', { via });
  refreshQuestPanel(); requestSave();
}

export function noteCosQuestVisit() {
  const p = gameState.progress, next = afterVisit(p.cosQuest);
  if (next === p.cosQuest) return;
  p.cosQuest = next;
  step('visited');
  refreshQuestPanel(); requestSave();
}

export function noteCosQuestBuy(itemId, via = 'coins') {
  const p = gameState.progress;
  if (!cosQuestActive()) return;
  p.cosQuest = afterBuy(p.cosQuest);
  giveReward({ coins: COS_REWARD }, 'cos_quest', itemId);
  ui.toast?.(COS_LINES.done, 2600);
  step('done', { item_id: itemId, via });
  refreshQuestPanel(); requestSave();
}

const BUBBLE = { w: 0.95, h: 0.95, y: 3.1 };
let bubbleGroup = null;

function bubbleTexture() {
  const cv = document.createElement('canvas'); cv.width = 104; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(226,196,158,0.96)'; roundRect(c, 8, 8, 88, 64, 18); c.fill();
  c.beginPath(); c.moveTo(42, 72); c.lineTo(62, 72); c.lineTo(48, 94); c.closePath(); c.fill();
  c.font = '50px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('🎀', 52, 41);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ensureBubble() {
  if (bubbleGroup) return bubbleGroup;
  const bubble = onTop(new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture(), transparent: true, depthWrite: false, fog: false, toneMapped: false })));
  bubble.scale.set(BUBBLE.w, BUBBLE.h, 1); bubble.position.set(0, BUBBLE.y, 0);
  const ring = makeRing(BUBBLE.y);
  bubbleGroup = new THREE.Group();
  bubbleGroup.position.set(SHOP_DOOR.x, 0, SHOP_DOOR.z);
  bubbleGroup.add(bubble, ring);
  bubbleGroup.userData = { bubble, ring };
  scene.add(bubbleGroup);
  return bubbleGroup;
}

export function updateCosQuestBubble(dt, time, playerPos, inVillage) {
  const owned = gameState.cosmetics?.owned || [];
  if (cosQuestActive() && owned.length > 0) noteCosQuestBuy(owned[owned.length - 1], 'other');
  const show = inVillage && cosQuestActive();
  if (!show) { if (bubbleGroup) bubbleGroup.visible = false; return; }
  const g = ensureBubble();
  g.visible = true;
  const dist = playerPos ? Math.hypot(SHOP_DOOR.x - playerPos.x, SHOP_DOOR.z - playerPos.z) : 99;
  animateBubble({ bubble: g.userData.bubble, ring: g.userData.ring, base: BUBBLE, dist, alertR: 5, time, dt });
}
