// =============================================================
//  calm forest · 💎 자국 움직임 — 반딧불(밤에 떠오름) · 무지개(걸음마다 색 + 반짝이)
//                               · 🎃 호박등 불씨 · 🦇 박쥐 회오리(시안 sims/halloween-trail-sim.html A·B)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §3-2 · 시안 sims/premium-reveal-sim.html
//  ▶ 계산은 순수 함수(테스트), 그리기는 점 입자 Points 하나 + 🦇 박쥐 스프라이트 Points 하나(trail-fx-sprites.js)
//    — 둘을 Group 하나(points)로 묶어 넘긴다. 박쥐가 없으면 drawRange 0 이라 실제 그리기는 +1. THREE 는 인자로 받는다.
//  ▶ 반딧불은 밤 콘텐츠 — 판정은 js/daynight.js 의 NIGHT_MIN(단일 출처).
//  ▶ 블룸 임계 0.85: 반딧불 색은 밝기를 임계 아래로 둔다(번지면 형광 덩어리가 된다).
// =============================================================
import { NIGHT_MIN } from '../daynight.js';
import { createBatSprites } from './trail-fx-sprites.js';

export const FX_IDS = Object.freeze(['firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl']);
const FLY_HEX = 0xc8e65a;          // 연두빛 — 블룸 임계 아래
const EMBER_HEX = 0xff9a3c;     // 🎃 불씨 — 블룸 임계 아래의 주황
const MOON_HEX = 0xdcd2ff;      // 🦇 달가루
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

/** 🦇 박쥐 한 마리 — 발자국에서 나선으로 오른다(kind 'bat' 은 스프라이트 Points 로 그린다) */
export function spawnBat(pos, rnd) {
  return { kind: 'bat', x: pos.x, y: pos.y + 0.1, z: pos.z, bx: pos.x, bz: pos.z,
    vy: 0.5 + rnd() * 0.2, age: 0, life: 1.8 + rnd() * 0.5, phase: rnd() * 6.28, turns: 1.2 + rnd() * 0.6,
    r0: 0.12, r1: 0.42 + rnd() * 0.12, hex: 0xc9b8ff, size: 0.3 };
}

/** 한 프레임 진행 — 새 객체. 수명이 다하면 null */
export function particleStep(p, dt) {
  const age = p.age + dt;
  if (age >= p.life) return null;
  if (p.kind === 'bat') {          // 🦇 반지름을 넓히며 돈다 — 회오리
    const k = age / p.life, ang = p.phase + k * p.turns * Math.PI * 2, rad = p.r0 + (p.r1 - p.r0) * k;
    return { ...p, age, x: p.bx + Math.cos(ang) * rad, z: p.bz + Math.sin(ang) * rad, y: p.y + p.vy * dt };
  }
  const sway = p.kind === 'fly' ? 0.35 : 0;
  return { ...p, age,
    x: p.bx + Math.sin(age * 1.7 + p.phase) * sway,
    z: p.bz + Math.cos(age * 1.3 + p.phase) * sway,
    y: p.y + p.vy * dt };
}

/** 입자 하나의 현재 밝기(0..1) — 반딧불은 깜빡이고 낮엔 희미 */
function alphaOf(p, nightLevel) {
  const fade = 1 - p.age / p.life;
  if (p.kind === 'bat') return Math.min(1, p.age * 4) * fade;
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
  const dots = new THREE.Points(geo, mat);
  dots.frustumCulled = false;
  const bats = createBatSprites(THREE, { cap: 16 });
  const points = new THREE.Group();           // game.js·purchase-reveal 이 scene/root 에 add 하는 단일 핸들
  points.add(dots, bats.points);
  let live = [], step = 0;
  const tmp = new THREE.Color();

  const push = (p) => { live = [...live, p].slice(-cap); };

  /** 자국을 찍을 때 — rainbow 면 그 자국에 입힐 색을 돌려준다. step 을 주면 내부 카운터 대신 그 걸음 색 */
  function onStamp(id, at, { nightLevel = 0, step: stepAt } = {}) {
    if (id === 'firefly') {
      for (let i = fireflyCount(nightLevel, rnd()); i > 0; i--) push(spawnFirefly(at, rnd));
      return { tint: null };
    }
    if (id === 'rainbow') {
      const hex = rainbowHex(stepAt ?? step++);
      for (let i = 0; i < 3; i++) push(spawnSpark(at, hex, rnd));
      return { tint: hex };
    }
    if (id === 'pumpkin_glow') {
      for (let i = 0; i < 2; i++) push(spawnSpark(at, EMBER_HEX, rnd));        // 🎃 불씨 2개(점 입자 재사용)
      return { tint: null };
    }
    if (id === 'bat_swirl') {
      push(spawnBat(at, rnd));
      for (let i = 0; i < 2; i++) push(spawnSpark(at, MOON_HEX, rnd));         // 🦇 달가루
      return { tint: null };
    }
    return { tint: null };
  }

  function update(dt, { nightLevel = 0 } = {}) {
    live = live.map(p => particleStep(p, dt)).filter(Boolean);
    const sparks = live.filter(p => p.kind !== 'bat');
    bats.setBats(live.filter(p => p.kind === 'bat').map(p => ({ ...p, alpha: alphaOf(p, nightLevel) })), nightLevel);
    sparks.forEach((p, i) => {
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      tmp.setHex(p.hex);
      col[i * 4] = tmp.r; col[i * 4 + 1] = tmp.g; col[i * 4 + 2] = tmp.b; col[i * 4 + 3] = alphaOf(p, nightLevel);
    });
    geo.setDrawRange(0, sparks.length);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  function clear() { live = []; geo.setDrawRange(0, 0); bats.setBats([], 0); }

  /** GPU 자원 정리 — 점 입자(지오메트리·재질·글로우 텍스처) + 박쥐 스프라이트 */
  function dispose() { geo.dispose(); mat.map.dispose(); mat.dispose(); bats.dispose(); }

  return { points, onStamp, update, clear, dispose };
}
