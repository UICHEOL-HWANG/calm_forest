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
import { TRAIL_FADE } from './trail.js';

export const FX_IDS = Object.freeze(['firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl']);
const FLY_HEX = 0xc8e65a;          // 연두빛 — 블룸 임계 아래
const EMBER_HEX = 0xff9a3c;     // 🎃 불씨 — 블룸 임계 아래의 주황
const MOON_HEX = 0xdcd2ff;      // 🦇 달가루
const HALO_HEX = 0xff9628;      // 🎃 호박등 온기 — 블룸 임계 아래의 주황
const DOT_SIZE = 0.22;          // 점 입자 기본 크기(PointsMaterial.size) — 점마다 aSizeK 배
const HALO_SIZE = 0.36;         // 🎃 온기 크기(시안 lanternCell 0.36·pop)
const HALO_ALPHA = { night: 0.75, day: 0.55 };
const BAT_LIFE = 2.4, BAT_SPIN = 5.2, BAT_RISE = 0.42, BAT_R0 = 0.05, BAT_R1 = 0.13, BAT_SQUASH = 0.7;   // 시안 helixCell
const outBack = x => { const c1 = 1.70158, c3 = c1 + 1; x = Math.max(0, Math.min(1, x)); return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
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

/** 🦇 박쥐 한 마리 — 발자국 곁에서 나선으로 오른다(kind 'bat' 은 스프라이트 Points 로 그린다)
 *  치수는 시안 helixCell 그대로(자국 반지름 TRAIL_S 0.10 이 시안과 같은 축척): 높이 0.42 · 반지름 0.05→0.13 · 크기 0.19.
 *  dir: 도는 방향(+1/-1) — 걸음마다 바꾸면 좌우 발자국이 서로 반대로 감긴다 */
export function spawnBat(pos, rnd, dir = 1) {
  return { kind: 'bat', x: pos.x, y: pos.y + 0.06, z: pos.z, bx: pos.x, by: pos.y, bz: pos.z,
    age: 0, life: BAT_LIFE, phase: rnd() * 6.28, dir, hex: 0xc9b8ff, size: 0.19 };
}

/** 🎃 호박등 온기 — 자국 자리에 머무는 주황 빛무리. 자국과 같은 수명(TRAIL_FADE)으로 같이 흐려진다 */
export function spawnHalo(pos, rnd) {
  return { kind: 'halo', x: pos.x, y: pos.y + 0.03, z: pos.z, bx: pos.x, bz: pos.z,
    vy: 0, age: 0, life: TRAIL_FADE, phase: rnd() * 6.28, hex: HALO_HEX, size: HALO_SIZE };
}

/** 점 하나의 크기 배율 — 🎃 온기만 톡 커진다. 나머지(반딧불·반짝이·불씨)는 1 = 기존 그대로 */
function sizeKOf(p) { return p.kind === 'halo' ? (HALO_SIZE / DOT_SIZE) * outBack(p.age / 0.32) : 1; }

/** 한 프레임 진행 — 새 객체. 수명이 다하면 null */
export function particleStep(p, dt) {
  const age = p.age + dt;
  if (age >= p.life) return null;
  if (p.kind === 'bat') {          // 🦇 반지름을 넓히며 돈다 — 회오리. 위치는 나이에서 바로 구한다(적분 오차 없음)
    const k = age / p.life, th = batAngle(p, age), rad = BAT_R0 + (BAT_R1 - BAT_R0) * k;
    return { ...p, age, x: p.bx + Math.cos(th) * rad, z: p.bz + Math.sin(th) * rad * BAT_SQUASH,
      y: p.by + 0.06 + BAT_RISE * Math.pow(k, 0.75) };
  }
  if (p.kind === 'halo') return { ...p, age };   // 🎃 제자리
  const sway = p.kind === 'fly' ? 0.35 : 0;
  return { ...p, age,
    x: p.bx + Math.sin(age * 1.7 + p.phase) * sway,
    z: p.bz + Math.cos(age * 1.3 + p.phase) * sway,
    y: p.y + p.vy * dt };
}

/** 🦇 박쥐가 지금 도는 각도 — 스프라이트(기울기·앞뒤 깊이)도 같은 값을 쓴다 */
export function batAngle(p, age = p.age) { return p.phase + p.dir * age * BAT_SPIN; }

/** 입자 하나의 현재 밝기(0..1) — 반딧불은 깜빡이고 낮엔 희미 */
function alphaOf(p, nightLevel) {
  const fade = 1 - p.age / p.life;
  if (p.kind === 'bat') return Math.min(1, (p.life - p.age) / 0.7);          // 시안 fadeOut(b, 0.7) — 등장은 크기(톡)로
  if (p.kind === 'halo') return fade * (0.88 + 0.12 * Math.sin(p.age * 13 + p.phase))   // 자국과 같이 흐려지며 일렁인다
    * (nightLevel >= NIGHT_MIN ? HALO_ALPHA.night : HALO_ALPHA.day);
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
  const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 4), sizeK = new Float32Array(cap).fill(1);   // RGBA — 알파로 흐려진다(가산·일반 혼합 모두)
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setAttribute('aSizeK', new THREE.BufferAttribute(sizeK, 1));
  geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({ size: DOT_SIZE, map: glowTexture(THREE), vertexColors: true, transparent: true,
    depthWrite: false, blending: blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending, sizeAttenuation: true });
  //  점마다 크기 배율(aSizeK) — 🎃 온기만 크게. 재질 종류·드로우콜은 그대로(PointsMaterial 셰이더 한 줄만 바꾼다)
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'attribute float aSizeK;\n' + shader.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = size * aSizeK;');
  };
  const dots = new THREE.Points(geo, mat);
  dots.frustumCulled = false;
  const bats = createBatSprites(THREE, { cap: 16 });
  const points = new THREE.Group();           // game.js·purchase-reveal 이 scene/root 에 add 하는 단일 핸들
  points.add(dots, bats.points);
  let live = [], step = 0, batDir = 1;
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
      push(spawnHalo(at, rnd));                                                 // 🎃 온기 — 밤에도 호박등이 빛나 보이게
      for (let i = 0; i < 2; i++) push(spawnSpark(at, EMBER_HEX, rnd));        // 🎃 불씨 2개(점 입자 재사용)
      return { tint: null };
    }
    if (id === 'bat_swirl') {
      batDir = -batDir;
      push(spawnBat(at, rnd, batDir));                                          // 걸음마다 반대로 감긴다(시안 dir: side)
      for (let i = 0; i < 2; i++) push(spawnSpark(at, MOON_HEX, rnd));         // 🦇 달가루
      return { tint: null };
    }
    return { tint: null };
  }

  function update(dt, { nightLevel = 0 } = {}) {
    live = live.map(p => particleStep(p, dt)).filter(Boolean);
    const sparks = live.filter(p => p.kind !== 'bat');
    bats.setBats(live.filter(p => p.kind === 'bat').map(p => ({ ...p, alpha: alphaOf(p, nightLevel), ang: batAngle(p) })), nightLevel);
    sparks.forEach((p, i) => {
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      tmp.setHex(p.hex);
      col[i * 4] = tmp.r; col[i * 4 + 1] = tmp.g; col[i * 4 + 2] = tmp.b; col[i * 4 + 3] = alphaOf(p, nightLevel);
      sizeK[i] = sizeKOf(p);
    });
    geo.setDrawRange(0, sparks.length);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.aSizeK.needsUpdate = true;
  }

  function clear() { live = []; geo.setDrawRange(0, 0); bats.setBats([], 0); }

  /** GPU 자원 정리 — 점 입자(지오메트리·재질·글로우 텍스처) + 박쥐 스프라이트 */
  function dispose() { geo.dispose(); mat.map.dispose(); mat.dispose(); bats.dispose(); }

  return { points, onStamp, update, clear, dispose };
}
