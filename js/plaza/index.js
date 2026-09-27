// js/plaza/index.js
// =============================================================
//  🌾 수확제 광장 — 게임 연결 진입점. game.js 는 여기 함수만 부른다(연결 줄 ≤14).
//  스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
// =============================================================
import { gameState, player, dist2D, ui, scene, solidCircle, removeSolid, obstacles, giveReward, refreshInventoryUI, requestSave, awardBadge, mode } from '../game.js';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';   // 🔐 게스트(익명)는 기부 불가 — plaza_mine 호출 자체를 건너뛴다
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS, PLAZA_POLE, PLAZA_ARCH, PLAZA_ARCH_HALF, PLAZA_SEASON, PLAZA_VIEW_R, PLAZA_OPENS_KST } from '../data/plaza.js';
import { plazaBlocks, siteOpen, seasonPhase, visualStage, tierOf, currentItems, stageSeenPlan, gateOpens, economyAllowed, nearPollDue } from './rules.js';
import { progress, donate, mine as fetchMine } from './net.js';
import { openPlazaModal, renderPlazaModal } from './ui.js';
import { interpretDonate } from './donate.js';
import { toastText, fill, PLAZA_COPY } from './copy.js';
import { buyPlan, claimPlan, convertPlan } from './rewards.js';
import { buildPlaza } from './build.js';
import { buildPath } from './path.js';
import { updateInvite } from './invite.js';

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
let saveRestored = false;   // ⚠️ initPlaza() 가 applySave() 보다 먼저 돈다 — 복원 전엔 stage_seen·환전 금지(부팅 순서 함정)

const viewedStages = new Set();          // 세션·단계당 1회
let lastPathAt = -1e9;                    // 돌길 위를 마지막으로 밟은 시각
const OPENS_MS = Date.parse(`${PLAZA_OPENS_KST}T00:00:00+09:00`);

function trackView() {
  if (shownStage <= 0 || viewedStages.has(shownStage)) return;
  if (dist2D(PLAZA, player.position) > 12) return;
  viewedStages.add(shownStage);
  const items = currentItems(lastProg);
  const have = items.reduce((s, i) => s + i.have, 0), need = items.reduce((s, i) => s + i.need, 0);
  const invitedNow = gameState.plaza.invited === SEASON && !gameState.plaza.seen[`arrived:${SEASON}`];
  const from = invitedNow ? 'quest' : performance.now() - lastPathAt < 30_000 ? 'path' : 'other';
  trackEvent('plaza_view', { season: SEASON, stage: shownStage, pct: need ? Math.round(have / need * 100) : 100, from });
}

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

// 세이브 복원 전엔 절대 emit 하지 않는다(stageSeenPlan 이 판단, 여긴 결과만 반영) — 판정은 순수함수 tests/plaza-rules.test.mjs
function maybeEmitStageSeen(stage) {
  const plan = stageSeenPlan(gameState.plaza, stage, SEASON, { saveRestored, debug: DEBUG_STAGE !== null });
  if (!plan.emit) return;
  gameState.plaza = { ...gameState.plaza, seen: { ...gameState.plaza.seen, [plan.key]: true } };
  trackEvent('plaza_stage_seen', { season: SEASON, stage, day_n: Math.floor((Date.now() - OPENS_MS) / 86_400_000) + 1 });
}

// 단계뿐 아니라 국면(active→after)이 바뀌어도 다시 짓는다 — 좌판·기부함·명판이 국면을 따른다
function applyStage(stage) {
  const phase = phaseNow();
  if (stage === shownStage && phase === shownPhase) return;
  const isNewStage = stage !== shownStage;
  if (isNewStage) gameState.plaza = { ...gameState.plaza, lastStage: stage };
  shownStage = stage; shownPhase = phase;
  rebuild(stage, phase);
  if (isNewStage) maybeEmitStageSeen(stage);
}

export async function refresh(force = false) {
  const p = await progress.get(SEASON, { force });
  if (p && !fake) lastProg = p;
  if (DEBUG_STAGE === null) { applyStage(visualStage(lastProg, gameState.plaza.lastStage)); maybeConvert(); }
}

export { refresh as refreshPlaza };   // ⚠️ applySave 끝에서 재조회용으로 부른다(game.js 는 이 한 줄만 안다) — 게이트는 아니다, updatePlaza 가 연다

export function initPlaza() {
  applyStage(DEBUG_STAGE ?? visualStage(null, gameState.plaza.lastStage));
  maybeConvert();   // saveRestored 가 false 라 내부에서 no-op(?plaza= 검수 중에도 안전)
  refresh();
}

let viewCheck = 0;
let lastNearPollAt = -Infinity;   // 🚪 시즌 시작 전엔 매초 대신 10분에 한 번만 확인(nearPollDue)
export function updatePlaza(dt, inVillage) {
  // 🚪 부팅 게이트 — 첫 play 프레임에 딱 한 번. applySave() 는 저장이 있을 때만 도는데(오프라인·신규
  //   게스트·failed_fresh 는 load.state 가 null 이라 아예 안 불림) mode 는 모든 부팅 경로에서 결국 'play' 가
  //   된다. 그때까지 gameState.plaza 는 최종 상태다(복원됐거나, 애초에 plazaDefault() 가 정답이었거나).
  if (gateOpens(saveRestored, mode)) {
    saveRestored = true;
    maybeEmitStageSeen(shownStage);
    maybeConvert();
    refresh();
  }
  updateInvite(dt, inVillage, phaseNow(), SEASON, DEBUG_STAGE !== null);
  if (!inVillage) { spotNow = null; return; }   // 마을을 나가면 근접 판정도 비운다(낡은 값이 밭일을 막지 않게)
  viewCheck -= dt;
  if (viewCheck > 0) return;
  viewCheck = 1;
  if (plazaBlocks(player.position.x, player.position.z, -PLAZA_R)) lastPathAt = performance.now();
  trackView();
  if (dist2D(PLAZA, player.position) < PLAZA_VIEW_R && nearPollDue(lastProg, Date.now(), lastNearPollAt)) {
    lastNearPollAt = Date.now();
    refresh();
  }
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

// 🧺 보관함에 1개 — 작업대 장식 탭에서 값 없이 꺼내 놓는다(index.html renderOutdoor 가 hidden 품목을 보관분 있을 때만 보인다)
function addStored(id) {
  const stored = gameState.outdoorStored || {};
  gameState.outdoorStored = { ...stored, [id]: (stored[id] || 0) + 1 };
}

// 🍂 좌판 구매 — 단풍잎을 빼고 보관함에 넣는다(서버 없이 로컬 세이브)
//   ⚠️ 인벤토리는 다른 모듈이 객체째 캐시한다 → 새 객체로 갈아끼우지 않고 필드 대입(onDonate 와 같은 규칙)
function onBuy(id) {
  if (!economyAllowed(DEBUG_STAGE)) return;   // 🔒 검수 중엔 좌판 구매도 no-op
  const plan = buyPlan(gameState.inventory, id);
  if (!plan.ok) { ui.toast?.(PLAZA_COPY.stall[plan.reason]); return; }
  gameState.inventory.leaf -= plan.price;
  addStored(id);
  refreshInventoryUI(); requestSave();
  trackEvent('plaza_stall_buy', { season: SEASON, item: id, price: plan.price, leaf_left: gameState.inventory.leaf });
  ui.toast?.(PLAZA_COPY.stall.bought);
  renderPlazaModal(ctx());
}

// 🎁 명판 보상 — 서버가 준 내 등급(plaza_mine)까지 누적(🥉 배지 · 🥈 호박 등불 · 🥇 수확제 허수아비), 시즌마다 한 번
function onClaim() {
  if (!economyAllowed(DEBUG_STAGE)) return;   // 🔒 검수 중엔 명판 보상도 no-op
  const tier = mineNow?.tier || null;
  const plan = claimPlan(gameState.plaza, SEASON, tier);
  if (plan.already || plan.none) return;
  if (plan.badge) awardBadge(plan.badge);
  for (const id of plan.decor) addStored(id);
  gameState.plaza = { ...gameState.plaza, claimed: { ...gameState.plaza.claimed, [SEASON]: tier } };
  requestSave();
  trackEvent('plaza_reward_claim', { season: SEASON, tier, my_total: mineNow?.my_total ?? null });
  ui.toast?.(PLAZA_COPY.plaque.claimed);
  renderPlazaModal(ctx());
}

// 🪙 시즌이 끝나면(after) 남은 🍂 을 한 번만 코인으로 — refresh()·initPlaza() 끝에서 부른다
function maybeConvert() {
  if (!economyAllowed(DEBUG_STAGE)) return;   // 🔒 검수 중엔 환전도 no-op
  if (!saveRestored) return;   // 세이브 복원 전(가짜 gameState.plaza.converted 기본값) 판정 금지 — 부팅 순서 함정
  if (phaseNow() !== 'after') return;
  const leaves = gameState.inventory.leaf || 0;
  const plan = convertPlan(gameState.plaza, SEASON, leaves, 'after');
  if (plan.already) return;
  gameState.plaza = { ...gameState.plaza, converted: { ...gameState.plaza.converted, [SEASON]: true } };
  if (plan.coins > 0) {
    gameState.inventory.leaf = 0;
    giveReward({ coins: plan.coins }, 'plaza_leaf', 'leaf');   // 코인 → econ_logs source plaza_leaf 자동 기록
    trackEvent('plaza_leaf_convert', { season: SEASON, leaves, coins: plan.coins });
    ui.toast?.(fill(PLAZA_COPY.convert.done, leaves, plan.coins));
  }
  requestSave();
}

const ctx = () => ({ kind: modalKind, prog: lastProg, mine: mineNow, mineReason, inv: fake?.inv || gameState.inventory, busy,
                     claim: claimPlan(gameState.plaza, SEASON, mineNow?.tier || null),
                     onDonate, onBuy, onClaim, onClose: () => { modalKind = null; } });

export async function openPlaza() {
  modalKind = plazaSpotNow();
  if (!modalKind) return;
  if (!fake && (modalKind === 'box' || modalKind === 'plaque')) {
    if (authState.isGuest) {                        // 🔐 게스트는 어차피 서버가 reason 'login' 을 줄 것 — 호출 자체를 생략
      mineNow = null; mineReason = 'auth';
    } else {
      const m = await fetchMine(SEASON);
      mineNow = m && m.ok ? m : null;
      mineReason = m && !m.ok ? m.reason : null;
    }
  }
  openPlazaModal(modalKind, ctx());
  if (modalKind === 'box') {
    trackEvent('plaza_modal_open', { season: SEASON, stage: shownStage, today_left: mineNow?.today_left ?? null,
      ...(authState.isGuest ? { guest: true } : {}) });
  }
}

// 🌾 기부 — 서버가 받은 만큼(accepted)만 가방에서 빼고 🍂 도 그만큼. 실패·거절이면 가방은 그대로
//   ⚠️ 인벤토리는 다른 모듈이 객체째 캐시한다(cooking·carving·river·cafe) → 새 객체로 갈아끼우지 않고 필드 대입
async function onDonate(item, qty) {
  if (!economyAllowed(DEBUG_STAGE)) return;   // 🔒 검수 중엔 기부(서버 호출)도 no-op
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
  //   mine === 'real' 이면 서버의 내 기록(plaza_mine)을 그대로 쓴다 · kind 로 명판(plaque)·좌판(stall)도 연다
  //   ends_at 을 과거로 주면 국면이 after → 다음 refresh() 가 환전(maybeConvert)까지 탄다
  window.__plazaFake = async (prog, mine, inv, kind = 'box') => {
    fake = { inv: inv || null };
    lastProg = prog;
    if (mine === 'real') { const m = await fetchMine(SEASON); mineNow = m && m.ok ? m : null; mineReason = m && !m.ok ? m.reason : null; }
    else { mineNow = mine || null; mineReason = mine ? null : 'auth'; }
    modalKind = kind;
    openPlazaModal(kind, ctx());
    return { mine: mineNow, phase: phaseNow() };
  };
}

export const plazaView = { stage: () => shownStage, progress: () => lastProg };
export const plazaMapVisible = () => shownStage > 0;   // 🗺️ 시즌 전(0단계)엔 지도에서 완전히 숨긴다
