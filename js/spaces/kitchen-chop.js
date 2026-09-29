// =============================================================
//  🔪 썰기 무대 M2 "통통통" — 탭 한 번 = 0.1초 간격 칼질 3번
//  ------------------------------------------------------------
//  칼은 흰 선 위에 서 있고, 재료가 한 칸씩 밀려 들어와 앞끝이 동전 조각으로 떨어진다.
//  시안: sims/cook-chop-sim.html — 사용자 선택(2026-09-29 "M2가 나은거 같은데" · "A로 가고 게임에 넣어").
//  예전엔 칼(z 0.55)과 노트(z 0.75)가 어긋나 칼이 허공을 찍었고, 튀는 건 반쪽이 아니라 작은 통재료였다.
//  ▶ 자르기 = 재료 모형 재질에 클리핑 평면(렌더러 localClippingEnabled) + 단면 원판(sliceModel 을 얇게).
//  ▶ 노트 틀의 원점 = 재료 앞끝(-x)·도마 바닥. mgChopFrame 은 x 만 움직인다.
//  ▶ 박자 520ms 안에 끝난다: 칼질 0.3초 → 0.42초부터 사라짐. 다음 탭이 빨리 오면 앞 재료는 바로 치운다.
// =============================================================
import { renderer } from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { Sound } from '../sound.js';
import * as THREE from 'three';
import { CARROT_PROFILE, ingredientModel, releaseFood, setFoodOpacity, sliceModel } from '../cook-ingredient-art.js';

export const CUT_X = -0.35, CUT_Z = 0.45, BOARD_TOP = 1.14;              // 흰 선 자리 · 도마 윗면
export const KNIFE_UP = 1.62, KNIFE_MID = 1.4, KNIFE_DOWN = BOARD_TOP + 0.105;   // 칼날 끝이 도마에 닿는 높이
export const STROKES = 3, STROKE = 0.1, STRIKE = 0.3, SLICE = 0.07;     // 칼질 수 · 간격(초) · 내려꽂히는 비율 · 조각 두께
const FADE_AT = 0.42, FADE = 0.2;
const NOTE_SIZE = 0.44, CARROT_S = NOTE_SIZE * 2.1;                     // ingredientModel 눈금
const X_AXIS = new THREE.Vector3(1, 0, 0);
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

// 노트 한 개 — 당근은 눕혀 끝(뿌리)이 칼 쪽(-x)을 보게(모형은 1.1 기울어 있다), 나머지는 서 있는 그대로
export function chopNote(key) {
  const w = new THREE.Group(), inner = ingredientModel(key, NOTE_SIZE);
  if (key === 'crop') inner.rotation.set(0, Math.PI, Math.PI / 2 - 1.1);
  w.add(inner); inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  inner.position.set(-box.min.x, -box.min.y, -(box.min.z + box.max.z) / 2);
  w.userData = { ingredient: key, h: box.max.y - box.min.y, d: box.max.z - box.min.z };
  return w;
}

// 앞끝에서 dist 떨어진 자리의 굵기(반지름) — 당근은 옆모습 그대로, 나머지는 몸 크기에서 어림
function radiusAt(u, dist) {
  if (u.ingredient !== 'crop') return 0.5 * Math.min(u.h, u.d) * (0.7 + 0.1 * Math.min(2, dist / SLICE));
  const y = dist / CARROT_S, P = CARROT_PROFILE;
  for (let i = 1; i < P.length; i++) if (y <= P[i][1]) { const [r0, y0] = P[i - 1], [r1, y1] = P[i]; return (r0 + (r1 - r0) * (y - y0) / (y1 - y0)) * CARROT_S; }
  return 0.1 * CARROT_S;
}
const axisY = (u) => (u.ingredient === 'crop' ? 0.12 * CARROT_S : u.h / 2);

// 칼질 시작 — 재료 재질에 클리핑 평면을 걸고 단면 원판을 붙인다(재질은 모형마다 따로라 다른 노트에 번지지 않는다)
function armCut(sp) {
  renderer.localClippingEnabled = true;
  const plane = new THREE.Plane(X_AXIS.clone(), 1e3);                   // 처음엔 안 자른다
  sp.traverse(o => { if (o.isMesh) { o.material.clippingPlanes = [plane]; o.material.side = THREE.DoubleSide; o.material.needsUpdate = true; } });
  const cap = sliceModel(sp.userData.ingredient);
  cap.rotation.z = Math.PI / 2; cap.visible = false; sp.add(cap);       // 원판 축을 x 로 — 잘린 면이 칼 쪽을 본다
  return { plane, cap };
}

export function startChop(kset, i) {
  const sp = kset.notes[i];
  if (!sp) return;
  kset.chops.forEach(c => { if (c.t < FADE_AT) { c.t = FADE_AT; c.rushed = true; } });   // 앞 재료는 서둘러 치운다
  kset.chops.push({ sp, t: 0, x0: sp.position.x, coins: [], rushed: false, ...armCut(sp) });
}

function addCoin(c) {
  const k = c.coins.length, u = c.sp.userData;
  const r = Math.max(0.02, radiusAt(u, (k + 0.5) * SLICE));
  const m = sliceModel(u.ingredient);
  m.scale.set(r, 0.04, r); m.userData.r = r;
  c.sp.parent.add(m); c.coins.push(m);
  if (k > 0 && !c.rushed) Sound.chop();                                  // 첫 칼질 소리는 판정 쪽(index.html)이 낸다
}

// 한 프레임 — 끝나면 true
function stepChop(c) {
  const { t, sp } = c, u = sp.userData;
  // 몸통: 판정 오차와 상관없이 앞끝이 선을 한 칸 넘은 자리로 붙고, 칼질 사이마다 한 칸씩 밀려 들어온다
  let push = 0;
  for (let k = 0; k < STROKES - 1; k++) push += ease((t - (k + STRIKE) * STROKE) / ((1 - STRIKE) * STROKE));
  sp.position.x = c.x0 + (CUT_X - SLICE - c.x0) * ease(t / (STRIKE * STROKE)) - SLICE * push;
  const hits = t < STRIKE * STROKE ? 0 : Math.min(STROKES, Math.floor(t / STROKE - STRIKE) + 1);
  while (c.coins.length < hits) addCoin(c);
  if (hits) {
    const cut = hits * SLICE;
    sp.updateMatrixWorld(true);
    c.plane.set(X_AXIS, -cut).applyMatrix4(sp.matrixWorld);               // 틀 기준 x ≥ cut 만 남긴다
    const r = radiusAt(u, cut) * 0.95;
    c.cap.visible = true; c.cap.scale.set(r, 0.006, r); c.cap.position.set(cut + 0.004, axisY(u), 0);
  }
  c.coins.forEach((m, k) => {                                             // 세워진 단면 → 옆으로 툭 쓰러짐, 뒤 조각이 앞 조각을 민다
    const fall = ease((t - (k + STRIKE) * STROKE) / 0.12), r = m.userData.r;
    m.position.set(CUT_X - SLICE * 0.5 - 0.1 * fall - 0.06 * (hits - 1 - k), BOARD_TOP + r * (1 - fall) + 0.02 * fall, CUT_Z);
    m.rotation.z = (Math.PI / 2) * (1 - fall);
  });
  const out = (t - FADE_AT) / FADE;
  if (out > 0) { const a = Math.max(0, 1 - out); setFoodOpacity(sp, a); c.coins.forEach(m => setFoodOpacity(m, a)); }
  return out >= 1;
}

function knifeY(t) {
  if (t < 0) return KNIFE_UP;
  const end = STROKES * STROKE;
  if (t >= end) return KNIFE_MID + (KNIFE_UP - KNIFE_MID) * ease((t - end) / 0.15);
  const k = Math.floor(t / STROKE), ph = t / STROKE - k, top = k ? KNIFE_MID : KNIFE_UP;   // 이어 썰 땐 덜 올린다
  return ph < STRIKE ? top - (top - KNIFE_DOWN) * ease(ph / STRIKE) : KNIFE_DOWN + (KNIFE_MID - KNIFE_DOWN) * ease((ph - STRIKE) / (1 - STRIKE));
}

export function updateChops(kset, dt) {
  for (let i = kset.chops.length - 1; i >= 0; i--) {
    const c = kset.chops[i];
    c.t += dt;
    if (stepChop(c)) { c.sp.visible = false; c.coins.forEach(releaseFood); kset.chops.splice(i, 1); }
  }
  const last = kset.chops[kset.chops.length - 1];
  kset.knife.position.y = knifeY(last ? last.t : -1);
}

export function clearChops(kset) {
  (kset.chops || []).forEach(c => c.coins.forEach(releaseFood));
  kset.chops = [];
  kset.knife.position.y = KNIFE_UP;
}
