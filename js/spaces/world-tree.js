// =============================================================
//  🌳 마을 세계수 — 랜드마크 + 세계수 판 진입 (구역 머리말)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-16-world-tree-board-design.md §5~§9
//  ▶ 규칙(순수)은 js/world/tree-board.js, 판 화면(DOM)은 js/world/tree-board-ui.js. 여기는 게임 상태와 잇는 층.
//  ▶ 조형(드로우콜 11·라이트 0)은 js/world/tree-art.js — 인트로 시든 세계수(prologue.js buildWiltSet)의 문법.
//  ▶ 이정표 조망샷(카메라 리그)은 js/world/tree-shot.js, 줄 세우기·잎 자람 지연은 아래 🎬 조망샷.
//  ▶ 해금 꺼짐(CONFIG.UNLOCKS 'off') · 레거시 세이브 → 나무는 늘 다 살아 있고, 판은 선택 콘텐츠(꾸러미 보상만).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
// =============================================================
import {
  Input, camera, cameraFree, defaultCamPose, setCameraRig, dist2D, gameState, giveReward, isOpen, obstacles, player, refreshInventoryUI, requestSave,
  rewardText, scene, solidCircle, spawnConfetti, spawnSparkle, syncUnlocks, ui, unlocksOn,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { TAG_LABEL } from '../habitat.js';
import {
  BRANCHES, BRANCH_IDS, TREE_DECOR, branchGrowth, branchOf, branchStatus, branchUsable, bundleDone, bundlesDone,
  canAfford, decorOf, habitatDone, habitatRows, lifePercent, offerBundle, placeDecor, removeDecor,
} from '../world/tree-board.js';
import { closeTreeBoard, openTreeBoard, renderTreeBoard, treeBoardOpen } from '../world/tree-board-ui.js';
import { createShotRig, shotFrame } from '../world/tree-shot.js';
import { inVillage2 } from './doors.js';
import { buildTreeArt } from '../world/tree-art.js';
import { t as tr } from '../i18n.js';
import * as THREE from 'three';

/** 마을 북쪽 끝 — 🛶 나루터 연못(0,-21.5 r7) 바로 뒤. 🏔️ 설산 언덕(-15,-36 r11)·🌫️ 입구(-21,-20)·🌊 후미와 안 겹친다 */
export const WORLD_TREE = new THREE.Vector3(4, 0, -35);
const TRUNK_R = 2.4;            // 밑동 콜라이더(판뿌리 사이로는 걸어 다닌다)
const PROMPT_R = TRUNK_R + 2.3; // 밑동 둘레에 서면 프롬프트

let wt = null;   // { art, cur: { id: { leaves, bloom } }, life, box }
let tab = 'water';
let freshTile = -1;   // 방금 놓은 칸만 톡 떨어지는 연출(다시 그릴 때마다 전부 튀지 않게)

/** 마을에 세계수를 세운다(buildWorld 에서 1회). 조형은 js/world/tree-art.js */
export function buildWorldTree() {
  if (wt) return;
  const art = buildTreeArt(THREE, { label: tr('세계수') });
  art.group.position.copy(WORLD_TREE);
  scene.add(art.group);
  art.group.updateMatrixWorld(true);
  const b = art.fullBox(), c = b.getCenter(new THREE.Vector3()), h = b.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  solidCircle(WORLD_TREE.x, WORLD_TREE.z, TRUNK_R);
  solidCircle(WORLD_TREE.x + art.plaque.x, WORLD_TREE.z + art.plaque.z, 0.3);   // 팻말 기둥
  obstacles.push({ x: WORLD_TREE.x, z: WORLD_TREE.z, r: 6 });   // 나무 밑엔 밭 금지
  const cur = {};
  for (const id of BRANCH_IDS) cur[id] = { leaves: 0, bloom: 0 };
  wt = { art, cur, life: 0, box: { cx: c.x, cy: c.y, cz: c.z, hx: h.x, hy: h.y, hz: h.z } };
}

/** 나무를 다 살려 보여 줄까 — 해금 꺼짐·레거시 세이브는 이웃이 이미 다 있다 */
function fullyAlive() { return !unlocksOn() || !!gameState.unlocks?.legacy; }

/** 판이 열렸나 — 박물관 할아버지를 만난 뒤(해금 꺼짐·레거시는 isOpen 이 늘 true) */
export function worldTreeBoardOpen() { return isOpen('museum'); }

let targetAt = 0, targets = null;
function computeTargets() {
  const full = fullyAlive(), tree = shownTree || gameState.tree;   // 🎬 조망샷이 줄 서 있으면 이전 모습을 붙잡아 둔다
  const out = { life: full ? 100 : lifePercent(tree), branches: {} };
  for (const id of BRANCH_IDS) out.branches[id] = full ? { leaves: 1, bloom: true } : branchGrowth(tree, id);
  return out;
}

/** 매 프레임 — 잎이 목표 크기로 천천히 자란다(0.5초마다 목표를 다시 잰다 — 표 4줄이라 싸다) */
export function updateWorldTree(dt, t) {
  if (!wt) return;
  updateTreeShot(t);
  if (!targets || t - targetAt > 0.5) { targets = computeTargets(); targetAt = t; }
  const k = Math.min(1, dt * (shot ? 2.4 : 1.6));   // 조망샷 머무는 동안(1.7초) 다 돋게 조금 빠르게
  const kb = Math.min(1, dt * (shot ? 2.0 : 1.2));
  for (const id of BRANCH_IDS) {
    const c = wt.cur[id], goal = targets.branches[id];
    c.leaves += (goal.leaves - c.leaves) * k;
    c.bloom += ((goal.bloom && c.leaves > 0.85 ? 1 : 0) - c.bloom) * kb;
  }
  wt.life += (targets.life / 100 - wt.life) * k;
  wt.art.setState({ life: wt.life, branches: wt.cur }, t);
}

/** 밑동 근처인가(doors.js 프롬프트) */
export function worldTreeNear(p) { return !!wt && !shot && dist2D(WORLD_TREE, p) < PROMPT_R; }   // 🎬 조망샷 중엔 안내를 끈다('탭하면 넘어가요'와 겹쳤다)

export function worldTreePrompt() {
  return worldTreeBoardOpen() ? '🌳 세계수 · Space 로 살펴보기' : '🌳 시든 세계수 · 할아버지를 찾아가요';
}

// ── 판 ──────────────────────────────────────────────────────
const ICO = { wood: '🪵', stone: '🪨', coal: '⚫', gem: '💎', fish: '🐟', crop: '🥕', seed: '🌰', fert: '🌱', coins: '🪙' };
const LABEL = { wood: '목재', stone: '돌', coal: '석탄', gem: '보석', fish: '물고기', crop: '작물', seed: '씨앗' };
const costText = (c) => Object.entries(c).map(([k, n]) => `${ICO[k] || k}${n}`).join(' ');
const tagsText = (tags) => Object.entries(tags).map(([k, n]) => `${(TAG_LABEL[k] || k).split(' ')[0]}+${n}`).join(' ');
// 받침 있음(이) / 없음(가) — 문장을 통째로 갈라 써야 영어 번역에 조사가 안 남는다(js/spaces/cafe.js 의 josa 와 같은 원리)
const jong = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };

function boardView() {
  const tree = gameState.tree, inv = gameState.inventory;
  const def = branchOf(tab) || BRANCHES[0];
  const i = BRANCH_IDS.indexOf(def.id);
  const b = tree.branches[def.id];
  const free = b.tiles.some(x => !x);
  return {
    fresh: freshTile,
    life: lifePercent(tree),
    branches: BRANCHES.map(x => ({ id: x.id, ico: x.ico, name: x.name, short: x.short, status: branchStatus(tree, x.id) })),
    cur: {
      id: def.id, ico: def.ico, name: def.name, npcIco: def.npcIco, npcName: def.npcName,
      usable: branchUsable(tree, def.id),
      prevName: i > 0 ? `${BRANCHES[i - 1].ico} ${BRANCHES[i - 1].name}` : '',
      // 해금 꺼짐·레거시는 이웃이 이미 다 있다
      lead: habitatDone(tree, def.id) || isOpen(def.npc)
        ? (jong(def.npcName) ? `${def.npcIco} ${def.npcName}이 돌아와 있어요` : `${def.npcIco} ${def.npcName}가 돌아와 있어요`)
        : (jong(def.npcName) ? `빈터를 꾸미면 ${def.npcIco} ${def.npcName}이 돌아와요` : `빈터를 꾸미면 ${def.npcIco} ${def.npcName}가 돌아와요`),
      habitatDone: habitatDone(tree, def.id), bundlesDone: bundlesDone(tree, def.id),
      tiles: b.tiles.map(id => { const d = decorOf(id); return d ? { ico: d.ico, name: d.name } : null; }),
      rows: habitatRows(tree, def.id).map(r => ({ ...r, label: TAG_LABEL[r.tag] || r.tag })),
      decor: TREE_DECOR.map(d => ({ id: d.id, ico: d.ico, name: d.name, tagsText: tagsText(d.tags), costText: costText(d.cost), can: free && canAfford(inv, d.cost) })),
      bundles: def.bundles.map(bd => {
        const given = b.given[bd.id] || {};
        const slots = Object.entries(bd.need).map(([k, need]) => ({ ico: ICO[k] || k, label: LABEL[k] || k, have: given[k] || 0, need, bag: inv[k] || 0 }));
        return {
          id: bd.id, name: bd.name, rewardText: costText(bd.reward), done: bundleDone(tree, def.id, bd.id),
          slots, canOffer: habitatDone(tree, def.id) && slots.some(s => s.have < s.need && s.bag > 0),
        };
      }),
    },
  };
}

const ACTIONS = {
  tab(id) { tab = id; rerender(); Sound.blip?.(); },
  place(decoId) { placeAction(decoId); },
  remove(tile) { removeAction(tile); },
  offer(bundleId) { offerAction(bundleId); },
  onClose() {},
};
function rerender() { if (treeBoardOpen()) renderTreeBoard(boardView()); freshTile = -1; }

/** 밑동에서 Space — 판 열기(박물관 전엔 안내만) */
export function openWorldTree() {
  if (!worldTreeBoardOpen()) { ui.toast?.('🌳 시든 세계수 · 할아버지를 찾아가요', 2600); return; }
  // 처음 열 땐 아직 안 끝난 첫 가지로
  const firstOpen = BRANCH_IDS.find(id => branchUsable(gameState.tree, id) && !(habitatDone(gameState.tree, id) && bundlesDone(gameState.tree, id)));
  if (!treeBoardOpen() && firstOpen) tab = firstOpen;
  Input.setAnalog?.(0, 0);
  openTreeBoard(boardView(), ACTIONS);
  trackEvent('tree_board_open', { life: lifePercent(gameState.tree) });
}

const REASON = {
  locked: '앞 가지 빈터를 먼저 완성해요',
  afford: '재료가 모자라요',
  taken: '빈칸이 없어요',
  tile: '빈칸이 없어요',
  empty: '가방에 바칠 재료가 없어요',
  full: '이미 다 찼어요',
};

function spend(cost, sign) {
  const inv = gameState.inventory;
  for (const [k, n] of Object.entries(cost)) inv[k] = Math.max(0, (inv[k] || 0) + sign * n);
  refreshInventoryUI();
}

function placeAction(decoId) {
  const tree = gameState.tree;
  const tile = tree.branches[tab]?.tiles.findIndex(x => !x);
  const r = placeDecor(tree, tab, tile, decoId, gameState.inventory), prev = tree;
  if (!r.ok) { ui.toast?.(REASON[r.reason] || '지금은 놓을 수 없어요', 1800); return; }
  gameState.tree = r.tree;
  freshTile = tile;
  spend(r.cost, -1);
  Sound.build?.();
  trackEvent('tree_deco_place', { branch: tab, deco: decoId, tile });
  handleEvents(r.events, prev);
  requestSave();
  rerender();
}

function removeAction(tile) {
  const r = removeDecor(gameState.tree, tab, tile);
  if (!r.ok) return;
  gameState.tree = r.tree;
  spend(r.refund, +1);
  Sound.blip?.();
  ui.toast?.(`↩️ ${costText(r.refund)}`, 1400);
  requestSave();
  rerender();
}

function offerAction(bundleId) {
  const prev = gameState.tree, r = offerBundle(prev, tab, bundleId, gameState.inventory);
  if (!r.ok) { ui.toast?.(REASON[r.reason] || '지금은 바칠 수 없어요', 1800); return; }
  gameState.tree = r.tree;
  spend(r.take, -1);
  Sound.harvest?.();
  const complete = r.events.some(e => e.type === 'bundle');
  trackEvent('tree_bundle_offer', { branch: tab, bundle: bundleId, items: Object.values(r.take).reduce((a, b) => a + b, 0), complete });
  handleEvents(r.events, prev);
  requestSave();
  rerender();
}

/** 완성 이벤트 — 토스트·보상·GA4 · 서식지면 이웃 귀환(syncUnlocks) */
function handleEvents(events, prev) {
  let closeLater = false;
  for (const e of events) {
    const def = branchOf(e.branch);
    if (e.type === 'habitat') {
      Sound.complete?.();
      ui.toast?.(`${def.ico} ${def.name}에 잎이 돋았어요!`, 2600);
      trackEvent('tree_branch_habitat', { branch: e.branch, life: lifePercent(gameState.tree) });
      sparkle();
      closeLater = queueTreeShot('habitat', e.branch, prev) || closeLater;   // 🎬 귀환 모달보다 먼저 줄 선다(queueStoryModal 이 기다린다)
      const before = isOpen(def.npc);
      syncUnlocks(false);   // 🔓 기존 귀환 연출(걸어 들어오기 + 모달)
      if (!before && isOpen(def.npc)) {
        const line = jong(def.npcName) ? `${def.npcIco} ${def.npcName}이 빈터를 보고 돌아왔어요!` : `${def.npcIco} ${def.npcName}가 빈터를 보고 돌아왔어요!`;
        setTimeout(() => ui.toast?.(line, 3000), 900);
        closeLater = true;   // 판을 닫아야 조망샷·귀환 모달·걸어 들어오는 모습이 보인다
      }
    } else if (e.type === 'bundle') {
      const bd = def.bundles.find(x => x.id === e.bundle);
      giveReward(e.reward, 'tree_bundle', e.bundle);
      ui.toast?.(`🎁 ${bd.name} 완성! ${costText(e.reward)}`, 2600);   // 아이콘+숫자로 짧게
    } else if (e.type === 'bundles') {
      Sound.complete?.();
      trackEvent('tree_branch_bundles', { branch: e.branch, life: lifePercent(gameState.tree) });
      if (habitatDone(gameState.tree, e.branch)) setTimeout(() => ui.toast?.(`🌸 ${def.name}에 꽃이 피었어요!`, 2800), 1200);
      sparkle();
      closeLater = queueTreeShot(habitatDone(gameState.tree, e.branch) ? 'bloom' : 'bundles', e.branch, prev) || closeLater;
      syncUnlocks(false);   // 🦆 나루터 꾸러미 → 사공·바다
    }
  }
  if (closeLater) setTimeout(() => closeTreeBoard(), 2200);
}

// ── 🎬 조망샷 ────────────────────────────────────────────────
//  이정표에서만 1회씩(hintsSeen.treeShot_<가지>_<종류> · treeShot_intro). 해금 꺼짐·레거시는 나무가 처음부터 다 살아 있어 안 띄운다.
//  판·모달·튜토리얼·미니게임·실내·다른 카메라 연출 중엔 줄만 서 있다가, 마을에서 한가해지면 돈다.
//  줄 서 있는 동안 나무는 이전 모습(shownTree)을 붙잡아 두고, 카메라가 도착한 순간 풀어 잎·꽃이 화면 안에서 돋는다.
const SHOT_KINDS = { habitat: 1, bundles: 1, bloom: 1, intro: 1 };
let shotQueue = [], shot = null, shownTree = null, idleSince = -1, overlay = null, onKey = null;
const shotKey = (kind, branch) => kind === 'intro' ? 'treeShot_intro' : `treeShot_${branch}_${kind}`;
function shotsOn() { return unlocksOn() && !gameState.unlocks?.legacy; }

/** 줄 세우기 — 이번에 처음이면 true(호출부가 판을 닫는다) */
function queueTreeShot(kind, branch, prev) {
  if (!SHOT_KINDS[kind] || !shotsOn() || !wt) return false;
  const key = shotKey(kind, branch);
  if (gameState.hintsSeen?.[key] || shotQueue.some(q => q.key === key)) return false;
  shotQueue.push({ kind, branch, key, at: performance.now() });
  if (prev && !shownTree) { shownTree = prev; targets = null; }
  return true;
}

/** 검수용(로컬 dev 훅 window.__treeShot) — 본 적 있어도 다시 줄 세운다 */
export function debugTreeShot(kind, branch) {
  if (kind === 'phase') return shot ? shot.rig.phase : shotQueue.length ? 'queued' : 'none';
  shotQueue.push({ kind, branch, key: shotKey(kind, branch), at: performance.now() });
  return shotQueue.length;
}

/** 조망샷이 줄 서 있거나 도는 중 — game.js 의 이야기 모달이 이 뒤로 선다. 오래(8초+) 못 돌고 있는 줄은 막지 않는다(교착 방지) */
export function treeShotBusy() {
  if (shot) return true;
  return shotQueue.some(q => q.kind !== 'intro' && performance.now() - q.at < 8000);
}

/** 조망샷 카메라가 기본 거리(≈21)보다 물러난 만큼 — game.js 가 안개를 그만큼 민다 */
export function treeShotFogPush() {
  if (!shot) return 0;
  const c = shot.rig.cur;
  return Math.max(0, Math.hypot(c.pos.x - c.look.x, c.pos.y - c.look.y, c.pos.z - c.look.z) - 21);
}

function shotReady() {
  return cameraFree() && inVillage2() && !ui.anyModalOpen?.() && !ui.coachActive?.() && !treeBoardOpen();
}

function updateTreeShot(t) {
  if (shot) { if (!inVillage2()) endShot(true); return; }   // 방어 — 오버레이가 입력을 막아 보통은 못 나간다
  if (!shotQueue.length && shotsOn() && !gameState.hintsSeen?.treeShot_intro && worldTreeBoardOpen()) {
    // 🧑‍🦳 할아버지를 만나 판이 처음 열렸다 — 시든 나무를 한 번 보여 준다(이미 살리기 시작한 세이브는 건너뛴다)
    if (lifePercent(gameState.tree) > 0) { gameState.hintsSeen = { ...(gameState.hintsSeen || {}), treeShot_intro: true }; requestSave(); }
    else shotQueue.push({ kind: 'intro', branch: 'none', key: 'treeShot_intro', at: performance.now() });
  }
  if (!shotQueue.length) { if (shownTree) { shownTree = null; targets = null; } return; }
  if (!shotsOn()) { shotQueue = []; return; }
  if (!shotReady()) { idleSince = -1; return; }
  if (idleSince < 0) idleSince = t;
  // 판에서 막 닫혔으면 바로, 처음 한 번(intro)은 귀환·1장 완료 모달이 이어 뜰 틈을 두고 2초 한가할 때
  if (t - idleSince < (shotQueue[0].kind === 'intro' ? 2 : 0.15)) return;
  startShot(shotQueue.shift());
}

function startShot(q) {
  gameState.hintsSeen = { ...(gameState.hintsSeen || {}), [q.key]: true };
  requestSave();
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const p0 = camera.position, d0 = Math.hypot(p0.x - player.position.x, p0.y - player.position.y - 1.2, p0.z - player.position.z);
  const from = { pos: { x: p0.x, y: p0.y, z: p0.z }, look: { x: p0.x + fwd.x * d0, y: p0.y + fwd.y * d0, z: p0.z + fwd.z * d0 } };
  const to = shotFrame(wt.box, camera.aspect);
  const rig = createShotRig({
    from, to, home: defaultCamPose,
    onHold: () => {
      if (!shotQueue.some(x => x.kind !== 'intro')) { shownTree = null; targets = null; }   // 🍃 지금 돋는다
      if (q.kind === 'intro') ui.toast?.('🌳 저 나무가 세계수예요. 다시 살려 볼까요?', 3200);
      else Sound.complete?.();
    },
  });
  shot = { q, rig, skipped: false };
  Input.setAnalog?.(0, 0);
  setCameraRig((cam, dt) => {
    if (!shot) return;
    const ph = rig.update(Math.min(dt, 0.05));
    cam.position.set(rig.cur.pos.x, rig.cur.pos.y, rig.cur.pos.z);
    cam.lookAt(rig.cur.look.x, rig.cur.look.y, rig.cur.look.z);
    if (ph === 'done') endShot(false);
  });
  showOverlay();
}

function skipShot() {
  if (!shot || shot.skipped || shot.rig.phase === 'out') return;
  shot.skipped = true;
  shot.rig.skip();
}

function endShot(abort) {
  if (!shot) return;
  const { q, skipped } = shot;
  shot = null;
  setCameraRig(null);
  hideOverlay();
  if (!shotQueue.length) { shownTree = null; targets = null; }
  trackEvent('tree_shot', { kind: q.kind, branch: q.branch, skipped: skipped || abort });
}

// 탭·클릭·아무 키 = 넘기기. 투명 막(-modal → anyModalOpen 이 걷기·액션·다른 강제 이벤트를 멈춘다)
function showOverlay() {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'treeshot-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;cursor:pointer;-webkit-tap-highlight-color:transparent;'
      + 'background:linear-gradient(to bottom,rgba(0,0,0,0.16),transparent 14%,transparent 86%,rgba(0,0,0,0.16));';
    const hint = document.createElement('div');
    hint.textContent = '탭하면 넘어가요';
    hint.style.cssText = 'position:absolute;left:50%;bottom:calc(104px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);'
      + 'padding:4px 12px;border-radius:999px;background:rgba(30,40,30,0.38);color:#fff;font-size:12px;opacity:0.85;pointer-events:none;white-space:nowrap;';
    overlay.appendChild(hint);
    overlay.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); skipShot(); });
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'block';
  overlay.classList.add('show');
  onKey = (e) => { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) skipShot(); };
  window.addEventListener('keydown', onKey, true);
}
function hideOverlay() {
  if (overlay) { overlay.classList.remove('show'); overlay.style.display = 'none'; }
  if (onKey) window.removeEventListener('keydown', onKey, true);
  onKey = null;
}

function sparkle() {
  if (!player) return;
  spawnSparkle?.(player.position.x, 1.2, player.position.z, 18);
  spawnConfetti?.(player.position.x, 1.4, player.position.z);
}

