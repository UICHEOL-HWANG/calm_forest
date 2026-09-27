// js/plaza/index.js
// =============================================================
//  🌾 수확제 광장 — 게임 연결 진입점. game.js 는 여기 함수만 부른다(연결 줄 ≤14).
//  스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
// =============================================================
import { gameState, player, dist2D, ui, scene, solidCircle, removeSolid, obstacles } from '../game.js';
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS, PLAZA_SEASON, PLAZA_VIEW_R } from '../data/plaza.js';
import { plazaBlocks, siteOpen, seasonPhase, visualStage } from './rules.js';
import { progress } from './net.js';
import { buildPlaza } from './build.js';

export { plazaDefault, restorePlaza } from './rules.js';

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
let lastProg = null;

const VARIANT = new URLSearchParams(location.search).get('plazaVar') || 'a';   // 디자인 게이트 A 용(확정 후 삭제)
let built = null, solids = [], obstacle = null;

function clearBuilt() {
  if (built) { scene.remove(built.group); built.dispose(); built = null; }
  for (const c of solids) removeSolid(c);
  solids = [];
  if (obstacle) { const i = obstacles.indexOf(obstacle); if (i >= 0) obstacles.splice(i, 1); obstacle = null; }
}

function rebuild(stage) {
  clearBuilt();
  if (stage === 0) return;
  const phase = phaseNow();
  built = buildPlaza(stage, phase, VARIANT);
  scene.add(built.group);
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

function applyStage(stage) {
  if (stage === shownStage) return;
  shownStage = stage;
  gameState.plaza = { ...gameState.plaza, lastStage: stage };
  rebuild(stage);
}

export async function refresh(force = false) {
  const p = await progress.get(SEASON, { force });
  if (p) lastProg = p;
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

export function openPlaza() {
  // Task 8·9: 모달
  ui.toast?.('🌾 준비 중이에요');
}

export const plazaView = { stage: () => shownStage, progress: () => lastProg };
