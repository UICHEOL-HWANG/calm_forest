import * as THREE from 'three';
import { BADGE_TONE, HEARTS_SIZE, GIFT_SIZE } from './badge-math.js';

const FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const CREAM = '#efe6d4';
const CAP = 0xebebeb;
const S = 256;
const sheets = new Map();
const once = (key, draw) => { if (!sheets.has(key)) sheets.set(key, draw()); return sheets.get(key); };

const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')]; };
const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };

function emojiLayer(e) {
  const [c, x] = canvas();
  x.font = `138px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(e, S / 2, S / 2 + 7);
  return c;
}

function rim(src, r, color) {
  const [sil, s] = canvas();
  s.drawImage(src, 0, 0);
  s.globalCompositeOperation = 'source-in'; s.fillStyle = color; s.fillRect(0, 0, S, S);
  const [c, x] = canvas();
  for (const k of [1, 0.66, 0.33]) for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; x.drawImage(sil, Math.cos(a) * r * k, Math.sin(a) * r * k); }
  x.drawImage(sil, 0, 0);
  return c;
}

function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function badgeSheet(emoji, tone) {
  const em = emojiLayer(emoji);
  const [c, x] = canvas();
  x.save(); x.shadowColor = 'rgba(8,6,4,0.55)'; x.shadowBlur = 14; x.shadowOffsetY = 7; x.drawImage(rim(em, 30, BADGE_TONE[tone]), 0, 0); x.restore();
  x.drawImage(rim(em, 13, CREAM), 0, 0);
  x.drawImage(em, 0, 0);
  return c;
}

function glowSheet(tone) {
  const [c, x] = canvas(), rgb = rgbOf(BADGE_TONE[tone]);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2 - 2);
  g.addColorStop(0, `rgba(${rgb},0.62)`); g.addColorStop(0.55, `rgba(${rgb},0.34)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return c;
}

export function makeStateBadge(emoji, tone, tilt = 0) {
  const c = once(`b${emoji}${tone}`, () => badgeSheet(emoji, tone));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture(c), transparent: true, depthWrite: false, depthTest: false, fog: false, toneMapped: false, color: CAP }));
  s.material.rotation = tilt;
  s.renderOrder = 22;
  return s;
}

export function makeGroundGlow(tone) {
  const c = once(`g${tone}`, () => glowSheet(tone));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), new THREE.MeshBasicMaterial({ map: texture(c), transparent: true, depthWrite: false, toneMapped: false, fog: false, color: CAP }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 3;
  return m;
}

const heartSheets = new Map();
function heartSheet(n) {
  if (heartSheets.has(n)) return heartSheets.get(n);
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.font = `64px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(8,6,4,0.5)'; x.shadowBlur = 8; x.shadowOffsetY = 3;
  x.fillText('❤️'.repeat(n), 128, 52);
  heartSheets.set(n, c);
  return c;
}

export function makeHearts(n) {
  const tex = new THREE.CanvasTexture(heartSheet(n)); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false, toneMapped: false }));
  s.scale.set(HEARTS_SIZE[0], HEARTS_SIZE[1], 1); s.renderOrder = 23;
  return s;
}

export function makeGift() {
  const s = makeStateBadge('🎁', 'stop');
  s.scale.setScalar(GIFT_SIZE);
  return s;
}

export function makeEmojiMark(emoji, size = 0.55) {
  const c = once(`e${emoji}`, () => emojiLayer(emoji));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture(c), transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  s.scale.setScalar(size); s.renderOrder = 20;
  return s;
}
