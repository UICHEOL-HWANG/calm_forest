// js/plaza/index.js
// =============================================================
//  🌾 수확제 광장 — 게임 연결 진입점. game.js 는 여기 함수만 부른다(연결 줄 ≤14).
//  스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
// =============================================================
import { gameState, player, dist2D, ui, scene, solidCircle, removeSolid, obstacles } from '../game.js';
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS, PLAZA_POLE, PLAZA_ARCH, PLAZA_ARCH_HALF, PLAZA_SEASON, PLAZA_VIEW_R } from '../data/plaza.js';
import { plazaBlocks, siteOpen, seasonPhase, visualStage } from './rules.js';
import { progress } from './net.js';
import { buildPlaza } from './build.js';
import { buildPath } from './path.js';

export { plazaDefault, restorePlaza } from './rules.js';

const DEBUG_STAGE = (() => {                       // ?plaza=0|1|2|3|4 — 검수용 단계 고정(DEV_PARAMS: 기록 안 됨)
  const v = new URLSearchParams(location.search).get('plaza');
  return v !== null && /^[0-4]$/.test(v) ? Number(v) : null;
})();
const ARCH_VAR = (() => {                          // 🎨 디자인 게이트 B2: ?plazaArch=a|b|c(확정 후 상수로)
  const v = new URLSearchParams(location.search).get('plazaArch');
  return /^[abc]$/.test(v || '') ? v : 'a';
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
  pathBuilt = buildPath(stage, phase, ARCH_VAR);
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
