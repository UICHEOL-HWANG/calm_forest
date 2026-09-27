// js/plaza/index.js
// =============================================================
//  🌾 수확제 광장 — 게임 연결 진입점. game.js 는 여기 함수만 부른다(연결 줄 ≤14).
//  스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
// =============================================================
import { gameState, player, dist2D, ui, scene, solidCircle, removeSolid, obstacles, giveReward, refreshInventoryUI, requestSave } from '../game.js';
import { trackEvent } from '../analytics.js';
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS, PLAZA_POLE, PLAZA_ARCH, PLAZA_ARCH_HALF, PLAZA_SEASON, PLAZA_VIEW_R } from '../data/plaza.js';
import { plazaBlocks, siteOpen, seasonPhase, visualStage, tierOf } from './rules.js';
import { progress, donate, mine as fetchMine } from './net.js';
import { openPlazaModal, renderPlazaModal } from './ui.js';
import { interpretDonate } from './donate.js';
import { toastText } from './copy.js';
import { buildPlaza } from './build.js';
import { buildPath } from './path.js';

export { plazaDefault, restorePlaza } from './rules.js';
export { plazaDecorMesh } from './decor.js';

const DEBUG_STAGE = (() => {                       // ?plaza=0|1|2|3|4 — 검수용 단계 고정(DEV_PARAMS: 기록 안 됨)
  const v = new URLSearchParams(location.search).get('plaza');
  return v !== null && /^[0-4]$/.test(v) ? Number(v) : null;
})();
const BOX_R = 2.0;
const STALL_R = 2.0;
// 시즌 id — localhost 에서만 ?plazaSeason= 으로 바꿀 수 있다(Task 8 의 dev-plaza 시즌 검증용). 모든 서버 호출·트래킹은 SEASON 을 쓴다
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export const SEASON = (IS_LOCAL && new URLSearchParams(location.search).get('plazaSeason')) || PLAZA_SEASON;

let spotNow = null;
let shownStage = -1;
let shownPhase = null;
let lastProg = null;

let built = null, solids = [], obstacle = null;
let pathBuilt = null, pathSolids = [];

function clearBuilt() {
  if (built) { scene.remove(built.group); built.dispose(); built = null; }
  if (pathBuilt) { scene.remove(pathBuilt.group); pathBuilt.dispose(); pathBuilt = null; }
  for (const c of pathSolids) removeSolid(c);
  pathSolids = [];
  for (const c of solids) removeSolid(c);
  solids = [];
  if (obstacle) { const i = obstacles.indexOf(obstacle); if (i >= 0) obstacles.splice(i, 1); obstacle = null; }
}

function rebuild(stage, phase) {
  clearBuilt();
  if (stage === 0) return;
  built = buildPlaza(stage, phase);
  scene.add(built.group);
  pathBuilt = buildPath(stage, phase);
  scene.add(pathBuilt.group);
  for (const s of [-1, 1]) pathSolids.push(solidCircle(PLAZA_ARCH.x + s * PLAZA_ARCH_HALF, PLAZA_ARCH.z, 0.3));   // 아치 기둥(가운데는 지나갈 수 있게)
  if (phase === 'active' && stage < 4) pathSolids.push(solidCircle(PLAZA_POLE.x, PLAZA_POLE.z, 0.3));
  obstacle = { x: PLAZA.x, z: PLAZA.z, r: PLAZA_R }; obstacles.push(obstacle);   // 야외 장식을 광장 위에 못 놓게
  solids.push(solidCircle(PLAZA_BOX.x, PLAZA_BOX.z, 0.6));
  if (phase === 'active') solids.push(solidCircle(PLAZA_STALL_POS.x, PLAZA_STALL_POS.z, 0.9));
  if (stage >= 2) solids.push(solidCircle(PLAZA.x - 3.6, PLAZA.z, 0.5), solidCircle(PLAZA.x + 3.6, PLAZA.z, 0.5));
  if (stage === 4) solids.push(solidCircle(PLAZA.x, PLAZA.z, 1.0));
}

export function plazaScatterBlocks(x, z, pad = 2) {
  return (DEBUG_STAGE !== null || siteOpen(Date.now())) && plazaBlocks(x, z, pad);
}

export function phaseNow() {
  if (DEBUG_STAGE !== null) return DEBUG_STAGE === 4 ? 'after' : DEBUG_STAGE === 0 ? 'before' : 'active';
  return seasonPhase(lastProg, Date.now());
}

// 단계뿐 아니라 국면(active→after)이 바뀌어도 다시 짓는다 — 좌판·기부함·명판이 국면을 따른다
function applyStage(stage) {
  const phase = phaseNow();
  if (stage === shownStage && phase === shownPhase) return;
  if (stage !== shownStage) gameState.plaza = { ...gameState.plaza, lastStage: stage };
  shownStage = stage; shownPhase = phase;
  rebuild(stage, phase);
}

export async function refresh(force = false) {
  const p = await progress.get(SEASON, { force });
  if (p && !fake) lastProg = p;
  if (DEBUG_STAGE === null) applyStage(visualStage(lastProg, gameState.plaza.lastStage));
}
export { refresh as refreshPlaza };   // ⚠️ applySave 가 initPlaza() 보다 뒤에 세이브를 복원한다 — applySave 끝에서 재조회

export function initPlaza() {
  applyStage(DEBUG_STAGE ?? visualStage(null, gameState.plaza.lastStage));
  refresh();
}

let viewCheck = 0;
export function updatePlaza(dt, inVillage) {
  if (!inVillage) { spotNow = null; return; }   // 마을을 나가면 근접 판정도 비운다(낡은 값이 밭일을 막지 않게)
  viewCheck -= dt;
  if (viewCheck > 0) return;
  viewCheck = 1;
  if (dist2D(PLAZA, player.position) < PLAZA_VIEW_R) refresh();
}

export function plazaSpot(pos) {
  const phase = phaseNow();
  if (shownStage <= 0 || phase === 'before') { spotNow = null; return null; }
  if (dist2D(PLAZA_BOX, pos) < BOX_R) spotNow = phase === 'after' || shownStage === 4 ? 'plaque' : 'box';
  else if (phase === 'active' && dist2D(PLAZA_STALL_POS, pos) < STALL_R) spotNow = 'stall';
  else spotNow = null;
  return spotNow;
}

export function plazaSpotNow() { return spotNow; }

// 🧾 모달 상태 — 내 기록(plaza_mine)은 열 때마다 새로 받는다(오늘 남은 수가 날마다 바뀐다)
let mineNow = null, mineReason = null, busy = false, modalKind = null;
let fake = null;   // localhost 전용 __plazaFake 로 넣은 가짜 진행률(시안 검수용) — 켜져 있으면 서버 값으로 덮지 않는다

// onBuy·onClaim 은 Task 9 에서 채운다
const onBuy = () => {};
const onClaim = () => {};

const ctx = () => ({ kind: modalKind, prog: lastProg, mine: mineNow, mineReason, inv: fake?.inv || gameState.inventory, busy,
                     onDonate, onBuy, onClaim });

export async function openPlaza() {
  modalKind = plazaSpotNow();
  if (!modalKind) return;
  if (!fake && (modalKind === 'box' || modalKind === 'plaque')) {
    const m = await fetchMine(SEASON);
    mineNow = m && m.ok ? m : null;
    mineReason = m && !m.ok ? m.reason : null;
  }
  openPlazaModal(modalKind, ctx());
  if (modalKind === 'box') trackEvent('plaza_modal_open', { season: SEASON, stage: shownStage, today_left: mineNow?.today_left ?? null });
}

// 🌾 기부 — 서버가 받은 만큼(accepted)만 가방에서 빼고 🍂 도 그만큼. 실패·거절이면 가방은 그대로
//   ⚠️ 인벤토리는 다른 모듈이 객체째 캐시한다(cooking·carving·river·cafe) → 새 객체로 갈아끼우지 않고 필드 대입
async function onDonate(item, qty) {
  if (busy || qty <= 0) return;
  busy = true; renderPlazaModal(ctx());
  try {
    const r = interpretDonate(qty, await donate(SEASON, item, qty));
    trackEvent(r.event, { season: SEASON, item, ...r.params });
    if (r.spend > 0) {
      gameState.inventory[item] = Math.max(0, (gameState.inventory[item] || 0) - r.spend);
      giveReward({ leaf: r.leaf }, 'plaza_donate', item);   // 🍂 — 코인이 아니라 econ 원장엔 안 남는다
      mineNow = { ...mineNow, my_total: r.params.my_total, today_left: r.params.today_left, tier: tierOf(r.params.my_total | 0) };
      refreshInventoryUI(); requestSave();
      await refresh(true);                                  // 단계 넘김 반영(떠 있던 조회를 기다린 뒤 새로 받는다)
    } else if (r.params.today_left === 0 || r.params.reason === 'cap') {
      mineNow = mineNow && { ...mineNow, today_left: 0 };
    }
    ui.toast?.(toastText(r.toastKey, item, r.spend));
  } finally {
    busy = false;
    if (modalKind) renderPlazaModal(ctx());
  }
}

// 🎨 검수용: localhost 에서만 가짜 진행률·내 기록(·가방)을 넣고 기부함 모달을 연다
//   예) __plazaFake({ stage: 2, items: [{ stage: 2, item: 'stone', have: 180, need: 400 }] }, { my_total: 34, today_left: 18, tier: 'bronze' }, { stone: 50 })
if (IS_LOCAL && typeof window !== 'undefined') {
  window.__plazaFake = (prog, mine, inv) => {
    fake = { inv: inv || null };
    lastProg = prog; mineNow = mine || null; mineReason = mine ? null : 'auth';
    modalKind = 'box';
    openPlazaModal('box', ctx());
  };
}

export const plazaView = { stage: () => shownStage, progress: () => lastProg };
