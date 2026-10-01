// =============================================================
//  calm forest · 💎 자국 움직임 — 반딧불(밤에 떠오름) · 무지개(걸음마다 색 + 반짝이)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §3-2 · 시안 sims/premium-reveal-sim.html
//  ▶ 계산은 순수 함수(테스트), 그리기는 THREE.Points **하나**(드로우콜 +1). THREE 는 인자로 받는다.
//  ▶ 반딧불은 밤 콘텐츠 — 판정은 js/daynight.js 의 NIGHT_MIN(단일 출처).
//  ▶ 블룸 임계 0.85: 반딧불 색은 밝기를 임계 아래로 둔다(번지면 형광 덩어리가 된다).
// =============================================================
import { NIGHT_MIN } from '../daynight.js';

export const FX_IDS = Object.freeze(['firefly', 'rainbow']);
const FLY_HEX = 0xc8e65a;          // 연두빛 — 블룸 임계 아래
const HUE_STEP = 1 / 7;       // 일곱 빛깔 — 한 걸음에 한 색

export function fireflyCount(nightLevel, rnd) {
  if (nightLevel >= NIGHT_MIN) return 2;
  return rnd < 0.3 ? 1 : 0;
}

export function hueAt(step) {
  const h = (step * HUE_STEP) % 1;
  return h < 0 ? h + 1 : h;
}

/** HSL(h, .85, .6) → 0xRRGGBB */
export function rainbowHex(step) {
  const h = hueAt(step), s = 0.85, l = 0.6;
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(x * 255);
  return (to(f(0)) << 16) | (to(f(8)) << 8) | to(f(4));
}

export function spawnFirefly(pos, rnd) {
  return { kind: 'fly', x: pos.x, y: pos.y + 0.12, z: pos.z,
    bx: pos.x + (rnd() - 0.5) * 0.3, bz: pos.z + (rnd() - 0.5) * 0.3,
    vy: 0.35 + rnd() * 0.25, age: 0, life: 3 + rnd() * 1.5, phase: rnd() * 6.28, hex: FLY_HEX, size: 0.22 };
}

export function spawnSpark(pos, hex, rnd) {
  return { kind: 'spark', x: pos.x, y: pos.y + 0.08, z: pos.z,
    bx: pos.x + (rnd() - 0.5) * 0.35, bz: pos.z + (rnd() - 0.5) * 0.35,
    vy: 0.6, age: 0, life: 0.9, phase: rnd() * 6.28, hex, size: 0.12 };
}

/** 한 프레임 진행 — 새 객체. 수명이 다하면 null */
export function particleStep(p, dt) {
  const age = p.age + dt;
  if (age >= p.life) return null;
  const sway = p.kind === 'fly' ? 0.35 : 0;
  return { ...p, age,
    x: p.bx + Math.sin(age * 1.7 + p.phase) * sway,
    z: p.bz + Math.cos(age * 1.3 + p.phase) * sway,
    y: p.y + p.vy * dt };
}

/** 입자 하나의 현재 밝기(0..1) — 반딧불은 깜빡이고 낮엔 희미 */
function alphaOf(p, nightLevel) {
  const fade = 1 - p.age / p.life;
  if (p.kind === 'spark') return fade;
  const blink = 0.5 + 0.5 * Math.sin(p.age * 5 + p.phase);
  return blink * Math.min(1, p.age * 3) * fade * (nightLevel >= NIGHT_MIN ? 1 : 0.35);
}

function glowTexture(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createTrailFx(THREE, { cap = 64, rnd = Math.random, blending = 'additive' } = {}) {
  const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 4);   // RGBA — 알파로 흐려진다(가산·일반 혼합 모두)
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({ size: 0.22, map: glowTexture(THREE), vertexColors: true, transparent: true,
    depthWrite: false, blending: blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let live = [], step = 0;
  const tmp = new THREE.Color();

  const push = (p) => { live = [...live, p].slice(-cap); };

  /** 자국을 찍을 때 — rainbow 면 그 자국에 입힐 색을 돌려준다 */
  function onStamp(id, at, { nightLevel = 0 } = {}) {
    if (id === 'firefly') {
      for (let i = fireflyCount(nightLevel, rnd()); i > 0; i--) push(spawnFirefly(at, rnd));
      return { tint: null };
    }
    if (id === 'rainbow') {
      const hex = rainbowHex(step++);
      for (let i = 0; i < 3; i++) push(spawnSpark(at, hex, rnd));
      return { tint: hex };
    }
    return { tint: null };
  }

  function update(dt, { nightLevel = 0 } = {}) {
    live = live.map(p => particleStep(p, dt)).filter(Boolean);
    live.forEach((p, i) => {
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      tmp.setHex(p.hex);
      col[i * 4] = tmp.r; col[i * 4 + 1] = tmp.g; col[i * 4 + 2] = tmp.b; col[i * 4 + 3] = alphaOf(p, nightLevel);
    });
    geo.setDrawRange(0, live.length);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  function clear() { live = []; geo.setDrawRange(0, 0); }

  return { points, onStamp, update, clear };
}
