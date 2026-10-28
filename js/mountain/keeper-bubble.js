import { animateBubble, makeRing, onTop } from '../bubble-fx.js';

export const KEEPER_BUBBLE = Object.freeze({ w: 0.9, h: 0.9, y: 2.5, alertR: 4, swapS: 1.2 });

const textures = new Map();

function emojiTexture(THREE, emoji) {
  if (textures.has(emoji)) return textures.get(emoji);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#ffffff';
  c.beginPath(); c.arc(64, 60, 54, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(52, 108); c.lineTo(64, 126); c.lineTo(76, 108); c.fill();
  c.font = '64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(emoji, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(emoji, tex);
  return tex;
}

export function createKeeperBubble(THREE, parent, at) {
  const bubble = onTop(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false, toneMapped: false })));
  const ring = makeRing(KEEPER_BUBBLE.y);
  bubble.position.set(at.x, at.y + KEEPER_BUBBLE.y, at.z);
  ring.position.set(at.x, at.y + KEEPER_BUBBLE.y, at.z);
  bubble.scale.set(KEEPER_BUBBLE.w, KEEPER_BUBBLE.h, 1);
  bubble.visible = ring.visible = false;
  parent.add(bubble, ring);
  let swapT = 0;
  const show = emoji => {
    bubble.material.map = emojiTexture(THREE, emoji);
    bubble.material.needsUpdate = true;
    bubble.visible = true;
  };
  return {
    arrive(mode = 'idle') {
      if (mode === 'quest') { show('❕'); swapT = 0; return; }
      show('☕'); swapT = KEEPER_BUBBLE.swapS;
    },
    hide() { bubble.visible = ring.visible = false; swapT = 0; },
    update(dt, time, dist, baseY) {
      if (!bubble.visible) return;
      if (swapT > 0) { swapT -= dt; if (swapT <= 0) show('🛷'); }
      animateBubble({ bubble, ring, base: { ...KEEPER_BUBBLE, y: baseY + KEEPER_BUBBLE.y }, dist, alertR: KEEPER_BUBBLE.alertR, time, dt });
    },
  };
}
