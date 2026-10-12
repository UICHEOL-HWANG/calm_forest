// =============================================================
//  🧪 E1 첫 5분 수확 실험 — 게임과 잇는 층 (규칙은 js/exp-e1.js)
//  ------------------------------------------------------------
//  ▶ enrollE1(load)  — enterGame 에서 로드 판정 직후·세이브 적용 전에 부른다(배정 + exp_exposure 기록)
//  ▶ applyE1(d)      — 세이브 적용 뒤: gameState.e1 확정, 처치 신규면 텃밭에 다 자란 당근 2×2
//  ▶ e1FirstScreen() — 환영 모달 자리에서 먼저 묻는다. 처치 대기 중이면 텃밭 밭 앞 + 이모지 말풍선으로 시작(true)
//    말풍선은 🔍 방문객과 같은 3D 스프라이트(js/bubble-fx.js) — 월드 말풍선은 이모지만(글자 없음)
//  ▶ e1OnHarvest()   — 첫 수확: 말풍선을 거두고, 미뤄 둔 방문객·환영 모달을 이어서 띄운다
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
// =============================================================
import { atFarm, gameState, player, plots, refreshCropStage, scene, snapCamera, ui, updatePlotVisual } from '../game.js';
import { setExpArm, trackEvent } from '../analytics.js';
import { IS_DEV_SESSION } from '../config.js';
import { animateBubble, makeRing, onTop } from '../bubble-fx.js';
import { FARM } from '../data/places.js';
import { CROP_TYPES } from '../data/tools.js';
import {
  E1_BUBBLE_EMOJI, E1_CROP, E1_PLOTS, E1_SPAWN, E1_STORE_KEY, E1_TUTORIAL_DELAY_MS,
  decideE1, isPending, parseStored, shouldSeed,
} from '../exp-e1.js';
import { clientId } from '../i18n.js';
import { PLATFORM } from '../platform.js';
import { createPlot, syncFarmCrops, syncFarmSoil } from './farm.js';
import { enterFarm, startVisitors } from './visitors.js';
import * as THREE from 'three';

let bubble = null, ring = null;   // 3D 말풍선 + 퍼지는 고리(첫 수확 전에만 있다)
let active = false;   // 이번 세션에 등록됐는가 — 세이브의 e1 만으로 처치를 켜지 않는다(앱에서 웹 처치 세이브를 열 때, 리뷰 M5)
const BUBBLE = { w: 0.85, h: 0.85, y: 1.35 };   // 🔍 방문객 말풍선과 같은 크기·높이
const ALERT_R = 5;

// 🔍 lookTexture(js/spaces/visitors.js)와 같은 베이지 말풍선 — 이모지만 바꾼다
let _tex = null;
function bubbleTexture() {
  if (_tex) return _tex;
  const cv = document.createElement('canvas'); cv.width = 104; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(226,196,158,0.96)';
  c.beginPath(); c.roundRect(8, 8, 88, 64, 18); c.fill();
  c.beginPath(); c.moveTo(42, 72); c.lineTo(62, 72); c.lineTo(48, 94); c.closePath(); c.fill();
  c.font = '50px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(E1_BUBBLE_EMOJI, 52, 41);
  _tex = new THREE.CanvasTexture(cv);
  _tex.colorSpace = THREE.SRGBColorSpace;
  return _tex;
}

function readStored() {
  try { return parseStored(localStorage.getItem(E1_STORE_KEY)); } catch (e) { return null; }
}
function writeStored(arm) {
  try { localStorage.setItem(E1_STORE_KEY, JSON.stringify({ arm, platform: PLATFORM })); } catch (e) { /* 차단 — 세이브 기록이 대신한다 */ }
}

// ── 배정 — 로드 판정(load.kind)이 정해진 직후, 어떤 분기보다 먼저 ──
export function enrollE1(load) {
  const forced = new URLSearchParams(location.search).get('e1');   // QA 강제 — DEV_PARAMS 라 기록은 남지 않는다
  const d = decideE1({ clientId: clientId(), platform: PLATFORM, loadKind: load?.kind, saved: load?.state || null, stored: readStored(), forced, dev: IS_DEV_SESSION });
  if (!d.enrolled) return d;
  if (d.reason !== 'forced' && !IS_DEV_SESSION) writeStored(d.arm);   // dev 세션은 기기에 남기지 않는다(GA4 도 안 나간다)
  setExpArm(d.arm);   // 이 세션의 획득 이벤트에 exp_arm + GA4 유저 속성
  trackEvent('exp_exposure', { exp: 'e1', exp_arm: d.arm, first: d.first ? 1 : 0 });   // [GA4] 배정 직후 · session counts e1_<arm>
  return d;
}

// ── 세이브 적용 뒤 — 상태 확정 + 처치 밭 ──
export function applyE1(d) {
  if (!d?.enrolled) return;
  active = true;
  if (!gameState.e1 || gameState.e1.arm !== d.arm) gameState.e1 = { arm: d.arm, seeded: false, harvested: false };
  if (shouldSeed(d, gameState.e1)) { seedField(); gameState.e1 = { ...gameState.e1, seeded: true }; }
  document.body.classList.toggle('e1-pending', isPending(gameState.e1));
}

// 다 자란 당근 2×2 — 세이브 복원과 같은 경로(state='mature' → refreshCropStage)라 "다 자랐어요" 토스트가 안 뜬다
function seedField() {
  const crop = CROP_TYPES.find(c => c.id === E1_CROP);
  for (const [dx, dz] of E1_PLOTS) {
    const x = FARM.x + dx, z = FARM.z + dz;
    if (plots.some(p => p.x === x && p.z === z)) continue;
    const plot = createPlot(x, z, true);
    plot.cropType = crop; plot.state = 'mature'; plot.growth = 1; plot.stage = -1;
    refreshCropStage(plot);
    updatePlotVisual(plot);
  }
  syncFarmSoil(true); syncFarmCrops(true);
}

export function e1Pending() { return active && isPending(gameState.e1); }

// ── 첫 화면 — 캐릭터 선택·프롤로그가 끝나 환영 모달이 뜰 자리 ──
export function e1FirstScreen() {
  if (!e1Pending()) return false;
  if (!nearestRipe()) { e1OnHarvest(); return false; }   // 익은 처치 밭이 사라졌다(삽으로 없앰 등) — 대기를 풀고 평소 흐름으로(리뷰 L6)
  if (!atFarm) enterFarm();   // 처치 대기 중이라 '내 텃밭' 안내·방문객은 enterFarm 이 건너뛴다
  player.position.set(FARM.x + E1_SPAWN[0], 0, FARM.z + E1_SPAWN[1]);
  player.rotation.y = Math.PI;   // 북쪽(밭)을 본다 — enterFarm 과 같은 방향
  snapCamera();
  showBubble();
  return true;
}

function showBubble() {
  if (bubble) return;
  bubble = onTop(new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture(), transparent: true, depthWrite: false, fog: false, toneMapped: false })));
  bubble.scale.set(BUBBLE.w, BUBBLE.h, 1);
  ring = makeRing(BUBBLE.y);
  scene.add(bubble, ring);
}

function hideBubble() {
  if (!bubble) return;
  scene.remove(bubble, ring);
  bubble.material.dispose(); ring.material.dispose();   // 텍스처는 공유(_tex·고리) — 재질만 버린다
  bubble = ring = null;
}

// 매 프레임(play) — 가장 가까운 다 자란 처치 밭 머리 위로 옮기고 🔍 처럼 통통 튀게 한다
export function updateE1Bubble(dt, time) {
  if (!bubble) return;
  const target = nearestRipe();
  if (!target) { e1OnHarvest(); return; }   // 거두지 않고 밭이 사라져도 미뤄 둔 안내를 풀어 준다
  bubble.visible = atFarm;
  if (!atFarm) { ring.visible = false; return; }
  bubble.position.x = ring.position.x = target.x;
  bubble.position.z = ring.position.z = target.z;
  animateBubble({ bubble, ring, base: BUBBLE, dist: Math.hypot(target.x - player.position.x, target.z - player.position.z), alertR: ALERT_R, time, dt });
}

function nearestRipe() {
  let best = null, bd = Infinity;
  for (const [dx, dz] of E1_PLOTS) {
    const p = plots.find(q => q.x === FARM.x + dx && q.z === FARM.z + dz && q.state === 'mature');
    if (!p) continue;
    const d = (p.x - player.position.x) ** 2 + (p.z - player.position.z) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

// ── 첫 수확(어느 밭이든) — 처치 대기를 끝내고 미뤄 둔 것들을 이어 준다 ──
export function e1OnHarvest() {
  if (!e1Pending()) return;
  gameState.e1 = { ...gameState.e1, harvested: true };
  document.body.classList.remove('e1-pending');
  hideBubble();
  if (atFarm) startVisitors();
  setTimeout(() => {
    if (gameState.tutorialSeen) return;
    gameState.tutorialSeen = true;   // Input.markTutorialSeen 과 같다
    ui.showTutorial?.();
  }, E1_TUTORIAL_DELAY_MS);
}
