// =============================================================
//  🌳 마을 세계수 — 랜드마크 + 세계수 판 진입 (구역 머리말)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-16-world-tree-board-design.md §5~§9
//  ▶ 규칙(순수)은 js/world/tree-board.js, 판 화면(DOM)은 js/world/tree-board-ui.js. 여기는 게임 상태와 잇는 층.
//  ▶ 조형(드로우콜 12·라이트 0)은 js/world/tree-art.js — 인트로 시든 세계수(prologue.js buildWiltSet)의 문법.
//  ▶ 이정표 조망샷(카메라 리그)은 js/world/tree-shot.js, 줄 세우기·잎 자람 지연은 아래 🎬 조망샷.
//  ▶ 해금 꺼짐(CONFIG.UNLOCKS 'off') · 레거시 세이브 → 나무는 늘 다 살아 있고, 판은 선택 콘텐츠(꾸러미 보상만).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
// =============================================================
import {
  Input, camera, cameraFree, defaultCamPose, setCameraRig, dist2D, gameState, giveReward, isOpen, obstacles, player, refreshInventoryUI, requestSave,
  habitatCtx, rewardText, scene, solidCircle, spawnConfetti, spawnSparkle, syncUnlocks, todayStr, ui, unlocksOn,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { TAG_LABEL } from '../habitat.js';
import {
  BRANCHES, BRANCH_IDS, TREE_DECOR, branchOf, branchStatus, branchUsable, bundleDone, bundlesDone,
  canAfford, decorOf, habitatDone, habitatRows, lifePercent, offerBundle, placeDecor, recommendDecor, removeDecor,
} from '../world/tree-board.js';
import {
  GUESTS, STAGES, bloomRows, bloomed, careNeed, careToday, decorLocked, growthOf, guestFor, lifeOf, observeGuest, offerStage,
} from '../world/tree-bloom.js';
import { closeTreeBoard, openTreeBoard, renderTreeBoard, treeBoardOpen } from '../world/tree-board-ui.js';
import { CHAPTER_SHOT_HOLD, chapterShotDue, createShotRig, shotFrame } from '../world/tree-shot.js';
import { STORY_REWORLD } from '../story/chapters.js';
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
  const bloom = shownBloom || gameState.treeBloom;
  const out = { life: full ? 100 : lifeOf(bloom, tree), branches: {} };
  for (const id of BRANCH_IDS) out.branches[id] = full ? { leaves: 1, bloom: true } : growthOf(bloom, tree, id);
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
const ICO = { wood: '🪵', stone: '🪨', coal: '⚫', gem: '💎', fish: '🐟', crop: '🥕', seed: '🌰', fert: '🌱', coins: '🪙', bait: '🪱', forage: '🍄', charcoal: '⚫', brick: '🧱' };
const LABEL = { wood: '목재', stone: '돌', coal: '석탄', gem: '보석', fish: '물고기', crop: '작물', seed: '씨앗', forage: '채집물', charcoal: '숯', brick: '벽돌' };
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
    life: lifeOf(gameState.treeBloom, tree),
    branches: BRANCHES.map(x => ({ id: x.id, ico: x.ico, name: x.name, short: x.short, status: tabStatus(tree, x.id) })),
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
      decor: TREE_DECOR.filter(d => !decorLocked(gameState.treeBloom, d.id)).map(d => ({ id: d.id, ico: d.ico, name: d.name, tagsText: tagsText(d.tags), costText: costText(d.cost), can: free && canAfford(inv, d.cost), bloom: !!d.bloom })),
      bundles: def.bundles.map(bd => {
        const given = b.given[bd.id] || {};
        const slots = Object.entries(bd.need).map(([k, need]) => ({ ico: ICO[k] || k, label: LABEL[k] || k, have: given[k] || 0, need, bag: inv[k] || 0 }));
        return {
          id: bd.id, name: bd.name, rewardText: costText(bd.reward), done: bundleDone(tree, def.id, bd.id),
          slots, canOffer: habitatDone(tree, def.id) && slots.some(s => s.have < s.need && s.bag > 0),
        };
      }),
      bloom: bloomView(def.id),
    },
  };
}

function tabStatus(tree, id) {
  if (bloomed(gameState.treeBloom, id)) return 'bloom';
  const s = branchStatus(tree, id);
  return s === 'bloom' ? 'habitat' : s;
}

const slotsOf = (need, given, inv) => Object.entries(need).map(([k, n]) => ({ ico: ICO[k] || k, label: LABEL[k] || k, have: given[k] || 0, need: n, bag: inv[k] || 0 }));
const needText = (need) => Object.entries(need).map(([t, n]) => `${(TAG_LABEL[t] || t).split(' ')[0]}${n}`).join(' ');

function bloomView(id) {
  const tree = gameState.tree, bloom = gameState.treeBloom, inv = gameState.inventory;
  const b = bloom.branches[id], today = todayStr(), ctx = habitatCtx();
  const rows = bloomRows(bloom, tree, id);
  const stage = STAGES[id][b.stage] || null;
  const care = careNeed(id, today);
  const { guest, phase } = guestFor(bloom, tree, id, today, ctx);
  return {
    open: habitatDone(tree, id),
    done: b.bloomed,
    rows,
    stage: stage && {
      n: b.stage + 1, rewardText: costText(stage.reward), slots: slotsOf(stage.need, b.given, inv),
      locked: !bundlesDone(tree, id),
      canOffer: bundlesDone(tree, id) && Object.entries(stage.need).some(([k, n]) => (b.given[k] || 0) < n && (inv[k] || 0) > 0),
    },
    care: {
      complete: b.care.days >= rows.care.need, doneToday: b.care.last === today,
      slots: slotsOf(care, {}, inv), can: canAfford(inv, care),
    },
    guest: guest ? { id: guest.id, ico: guest.ico, name: guest.name, fresh: !b.seen[guest.id] } : null,
    phase,
    visited: b.slots[phase] === today,
    guests: GUESTS[id].map(g => ({ ico: g.ico, name: g.name, seen: !!b.seen[g.id], hint: needText(g.need), when: g.when === 'night' ? '🌙' : '☀️' })),
  };
}

const ACTIONS = {
  tab(id) { tab = id; rerender(); Sound.blip?.(); },
  place(decoId) { placeAction(decoId); },
  remove(tile) { removeAction(tile); },
  offer(bundleId) { offerAction(bundleId); },
  care() { careAction(); },
  stage() { stageAction(); },
  observe(guestId) { observeAction(guestId); },
  onClose() {},
};
function rerender() { if (treeBoardOpen()) renderTreeBoard(boardView()); freshTile = -1; }

/** 밑동에서 Space — 판 열기(박물관 전엔 안내만) */
export function openWorldTree() {
  if (!worldTreeBoardOpen()) { ui.toast?.('🌳 시든 세계수 · 할아버지를 찾아가요', 2600); return; }
  // 처음 열 땐 아직 안 끝난 첫 가지로
  const firstOpen = BRANCH_IDS.find(id => branchUsable(gameState.tree, id) && !bloomed(gameState.treeBloom, id));
  if (!treeBoardOpen() && firstOpen) tab = firstOpen;
  Input.setAnalog?.(0, 0);
  openTreeBoard(boardView(), ACTIONS);
  trackEvent('tree_board_open', { life: lifePercent(gameState.tree) });
  if (branchUsable(gameState.tree, tab)) ui.treeTour?.(tourPlan());
}

const SOURCE = { wood: '🪓 나무 베기', stone: '⛏️ 동굴', coal: '⛏️ 동굴', fish: '🎣 낚시', crop: '🌾 밭 수확', seed: '🌾 수확할 때', gem: '💎 안개 낀 날 동굴' };
const itemsOf = (need) => Object.entries(need).filter(([, n]) => n > 0).map(([k, n]) => ({ ico: ICO[k] || k, label: LABEL[k] || k, n, src: SOURCE[k] || '' }));

function tourPlan() {
  const tree = gameState.tree, inv = gameState.inventory, def = branchOf(tab);
  const b = tree.branches[def.id];
  const owed = {};
  const decor = recommendDecor(tree, def.id).map((r) => {
    const d = decorOf(r.id);
    for (const [k, n] of Object.entries(d.cost)) owed[k] = (owed[k] || 0) + n * r.n;
    const lack = {};
    for (const k of Object.keys(d.cost)) lack[k] = Math.min(d.cost[k] * r.n, Math.max(0, owed[k] - (inv[k] || 0)));
    const have = b.tiles.filter((x) => x === r.id).length;
    return { id: r.id, ico: d.ico, name: d.name, n: r.n, goal: have + r.n, lack: itemsOf(lack) };
  });
  const bundles = def.bundles.filter((bd) => !bundleDone(tree, def.id, bd.id)).map((bd) => {
    const given = b.given[bd.id] || {};
    const left = Object.fromEntries(Object.entries(bd.need).map(([k, n]) => [k, n - (given[k] || 0)]));
    const lack = {};
    for (const [k, n] of Object.entries(left)) { owed[k] = (owed[k] || 0) + n; lack[k] = Math.min(n, Math.max(0, owed[k] - (inv[k] || 0))); }
    return { id: bd.id, name: bd.name, items: itemsOf(left), lack: itemsOf(lack) };
  });
  return { branch: `${def.ico} ${def.name}`, habitatDone: habitatDone(tree, def.id), decor, bundles };
}

const REASON = {
  locked: '앞 가지 빈터를 먼저 완성해요',
  afford: '재료가 모자라요',
  taken: '빈칸이 없어요',
  tile: '빈칸이 없어요',
  empty: '가방에 넣을 재료가 없어요',
  full: '이미 다 찼어요',
  bundles: '꾸러미를 먼저 다 채워요',
  habitat: '빈터를 먼저 완성해요',
  done: '오늘은 벌써 돌봤어요',
  complete: '이미 다 채웠어요',
  gone: '손님이 벌써 떠났어요',
  bloomLocked: '그 가지를 꽃피우면 열려요',
};

function spend(cost, sign) {
  const inv = gameState.inventory;
  for (const [k, n] of Object.entries(cost)) inv[k] = Math.max(0, (inv[k] || 0) + sign * n);
  refreshInventoryUI();
}

function placeAction(decoId) {
  if (decorLocked(gameState.treeBloom, decoId)) { ui.toast?.(REASON.bloomLocked, 1800); return; }
  const tree = gameState.tree;
  const tile = tree.branches[tab]?.tiles.findIndex(x => !x);
  const r = placeDecor(tree, tab, tile, decoId, gameState.inventory), prev = tree;
  if (!r.ok) { ui.toast?.(REASON[r.reason] || '지금은 놓을 수 없어요', 1800); return; }
  gameState.tree = r.tree;
  freshTile = tile;
  spend(r.cost, -1);
  Sound.build?.();
  trackEvent('tree_deco_place', { branch: tab, deco: decoId, tile });
  const placed = r.tree.branches[tab].tiles.filter((x) => x === decoId).length;
  for (let k = 1; k <= placed; k++) ui.treeSpot?.(`act:treedeco:${decoId}:${k}`);
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
  if (!r.ok) { ui.toast?.(REASON[r.reason] || '지금은 넣을 수 없어요', 1800); return; }
  gameState.tree = r.tree;
  spend(r.take, -1);
  Sound.harvest?.();
  const complete = r.events.some(e => e.type === 'bundle');
  trackEvent('tree_bundle_offer', { branch: tab, bundle: bundleId, items: Object.values(r.take).reduce((a, b) => a + b, 0), complete });
  handleEvents(r.events, prev);
  requestSave();
  rerender();
}

function careAction() {
  const today = todayStr(), prev = gameState.treeBloom;
  const r = careToday(prev, gameState.tree, tab, today, gameState.inventory);
  if (!r.ok) { ui.toast?.(REASON[r.reason] || '지금은 돌볼 수 없어요', 1800); return; }
  gameState.treeBloom = r.bloom;
  spend(r.take, -1);
  Sound.harvest?.();
  sparkle();
  trackEvent('tree_care', { branch: tab, days: r.bloom.branches[tab].care.days });
  handleBloomEvents(r.events, prev);
  requestSave();
  rerender();
}

function stageAction() {
  const prev = gameState.treeBloom;
  const r = offerStage(prev, gameState.tree, tab, gameState.inventory);
  if (!r.ok) { ui.toast?.(REASON[r.reason] || '지금은 넣을 수 없어요', 1800); return; }
  gameState.treeBloom = r.bloom;
  spend(r.take, -1);
  Sound.harvest?.();
  const complete = r.events.some(e => e.type === 'stage');
  trackEvent('tree_stage_offer', { branch: tab, stage: r.bloom.branches[tab].stage, items: Object.values(r.take).reduce((a, b) => a + b, 0), complete: complete ? 1 : 0 });
  handleBloomEvents(r.events, prev);
  requestSave();
  rerender();
}

function observeAction(guestId) {
  const prev = gameState.treeBloom;
  const r = observeGuest(prev, gameState.tree, tab, todayStr(), habitatCtx());
  if (!r.ok || (guestId && r.guest.id !== guestId)) { ui.toast?.(REASON[r.reason] || '손님이 없어요', 1800); rerender(); return; }
  gameState.treeBloom = r.bloom;
  Sound.blip?.();
  handleBloomEvents(r.events, prev);
  requestSave();
  rerender();
}

function handleBloomEvents(events, prev) {
  for (const e of events) {
    const def = branchOf(e.branch);
    if (e.type === 'care') {
      ui.toast?.(`💧 ${def.name} 돌보기 ${e.days}/7`, 1800);
    } else if (e.type === 'stage') {
      giveReward(e.reward, 'tree_stage', `${e.branch}_${e.stage}`);
      ui.toast?.(`🎁 ${def.name} 꽃 꾸러미 ${e.stage}/3 완성! ${costText(e.reward)}`, 2600);
    } else if (e.type === 'guest') {
      const g = GUESTS[e.branch].find(x => x.id === e.guest);
      trackEvent('tree_guest', { branch: e.branch, guest: e.guest, fresh: e.fresh ? 1 : 0, night: habitatCtx().night ? 1 : 0 });
      ui.toast?.(e.fresh ? `📖 ${g.ico} ${g.name} 첫 기록!` : `${g.ico} ${g.name}`, 2200);
    } else if (e.type === 'bloom') {
      Sound.complete?.();
      giveReward(e.reward, 'tree_bloom', e.branch);
      trackEvent('tree_bloom', { branch: e.branch, life: lifeOf(gameState.treeBloom, gameState.tree) });
      const deco = decorOf(e.decor);
      setTimeout(() => ui.toast?.(`🌸 ${def.name}에 꽃이 피었어요! ${deco ? `${deco.ico} ${deco.name} 장식이 열렸어요` : ''}`, 3200), 600);
      spawnConfetti?.(WORLD_TREE.x, 6, WORLD_TREE.z);
      if (queueTreeShot('bloom', e.branch, gameState.tree, prev)) setTimeout(() => closeTreeBoard(), 2200);
    }
  }
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
      setTimeout(() => ui.toast?.(`🍃 ${def.name}의 잎이 무성해졌어요!`, 2800), 1200);
      sparkle();
      closeLater = queueTreeShot('bundles', e.branch, prev) || closeLater;
      syncUnlocks(false);   // 🦆 나루터 꾸러미 → 사공·바다
    }
  }
  if (closeLater) setTimeout(() => closeTreeBoard(), 2200);
}

// ── 🎬 조망샷 ────────────────────────────────────────────────
//  이정표에서만 1회씩(hintsSeen.treeShot_<가지>_<종류> · treeShot_intro). 해금 꺼짐·레거시는 나무가 처음부터 다 살아 있어 안 띄운다.
//  판·모달·튜토리얼·미니게임·실내·다른 카메라 연출 중엔 줄만 서 있다가, 마을에서 한가해지면 돈다.
//  줄 서 있는 동안 나무는 이전 모습(shownTree)을 붙잡아 두고, 카메라가 도착한 순간 풀어 잎·꽃이 화면 안에서 돋는다.
const SHOT_KINDS = { habitat: 1, bundles: 1, bloom: 1, intro: 1, chapter: 1 };
const CHAPTER_WAIT_MS = 8000;
let shownBloom = null;
let shotQueue = [], shot = null, shownTree = null, idleSince = -1, overlay = null, onKey = null;
const shotKey = (kind, branch) => kind === 'intro' ? 'treeShot_intro' : kind === 'chapter' ? 'treeShot_chapter1' : `treeShot_${branch}_${kind}`;
function shotsOn() { return unlocksOn() && !gameState.unlocks?.legacy; }

/** 줄 세우기 — 이번에 처음이면 true(호출부가 판을 닫는다) */
function queueTreeShot(kind, branch, prev, prevBloom = gameState.treeBloom) {
  if (!SHOT_KINDS[kind] || !shotsOn() || !wt) return false;
  const key = shotKey(kind, branch);
  if (gameState.hintsSeen?.[key] || shotQueue.some(q => q.key === key)) return false;
  shotQueue.push({ kind, branch, key, at: performance.now() });
  if (prev && !shownTree) { shownTree = prev; shownBloom = prevBloom; targets = null; }
  return true;
}

export function queueChapterShot(after) {
  if (!wt || !chapterShotDue(gameState, shotsOn()) || shotQueue.some(q => q.kind === 'chapter')) return false;
  shotQueue.unshift({ kind: 'chapter', branch: 'none', key: shotKey('chapter'), at: performance.now(), after });
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
  if (!shotQueue.length) { if (shownTree) { shownTree = null; shownBloom = null; targets = null; } return; }
  if (!shotsOn()) { shotQueue.forEach(q => q.after?.()); shotQueue = []; return; }
  if (!shotReady()) {
    idleSince = -1;
    const q = shotQueue[0];
    if (q.kind === 'chapter' && q.after && performance.now() - q.at > CHAPTER_WAIT_MS) { const after = q.after; q.after = null; after(); }
    return;
  }
  if (idleSince < 0) idleSince = t;
  // 판에서 막 닫혔으면 바로, 처음 한 번(intro)은 귀환·1장 완료 모달이 이어 뜰 틈을 두고 2초 한가할 때
  if (t - idleSince < ({ intro: 2, chapter: 0.6 }[shotQueue[0].kind] ?? 0.15)) return;
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
    ...(q.kind === 'chapter' ? { hold: CHAPTER_SHOT_HOLD } : {}),
    onHold: () => {
      if (!shotQueue.some(x => x.kind !== 'intro')) { shownTree = null; shownBloom = null; targets = null; }   // 🍃 지금 돋는다
      if (q.kind === 'intro') ui.toast?.('🌳 저 나무가 세계수예요. 다시 살려 볼까요?', 3200);
      else if (q.kind !== 'chapter') Sound.complete?.();
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
  showOverlay(q.kind === 'chapter');
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
  if (!shotQueue.length) { shownTree = null; shownBloom = null; targets = null; }
  trackEvent('tree_shot', { kind: q.kind, branch: q.branch, skipped: skipped || abort });
  if (q.kind === 'chapter') ui.flashStoryChip?.();
  q.after?.();
}

// 탭·클릭·아무 키 = 넘기기. 투명 막(-modal → anyModalOpen 이 걷기·액션·다른 강제 이벤트를 멈춘다)
function chapterCine() {
  const el = document.createElement('div');
  el.id = 'treeshot-cine';
  const bar = 'position:absolute;left:0;right:0;height:clamp(48px,9vh,90px);background:#0d0f0e;transition:transform .5s ease;';
  const top = document.createElement('div'); top.style.cssText = bar + 'top:0;transform:translateY(-100%);';
  const bot = document.createElement('div'); bot.style.cssText = bar + 'bottom:0;transform:translateY(100%);';
  const shade = document.createElement('div');
  shade.style.cssText = 'position:absolute;inset:0;background:linear-gradient(rgba(12,22,18,0.1),rgba(12,22,18,0.55) 75%);opacity:0;transition:opacity .6s ease;';
  const title = document.createElement('div');
  title.style.cssText = 'position:absolute;left:0;right:0;top:66%;text-align:center;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.6);padding:0 20px;'
    + 'opacity:0;transform:translateY(8px);transition:opacity .7s ease .5s,transform .7s ease .5s;';
  const n = document.createElement('div'); n.textContent = tr('1장');
  n.style.cssText = 'font-size:14px;font-weight:800;letter-spacing:.3em;opacity:.85;';
  const big = document.createElement('div'); big.textContent = tr(STORY_REWORLD.home.title);
  big.style.cssText = 'font-size:clamp(26px,4.4vw,40px);font-weight:800;margin-top:4px;';
  title.append(n, big);
  const line = document.createElement('div'); line.textContent = tr(STORY_REWORLD.home.start);
  line.style.cssText = 'position:absolute;left:0;right:0;bottom:calc(clamp(48px,9vh,90px) + 18px);text-align:center;color:#fff;font-size:clamp(14px,1.6vw,17px);'
    + 'font-weight:600;line-height:1.5;padding:0 24px;text-shadow:0 1px 6px rgba(0,0,0,0.7);opacity:0;transition:opacity .7s ease 1.1s;';
  el.append(shade, top, bot, title, line);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    top.style.transform = bot.style.transform = 'translateY(0)';
    shade.style.opacity = title.style.opacity = line.style.opacity = '1';
    title.style.transform = 'translateY(0)';
  }));
  return el;
}

function showOverlay(cine = false) {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'treeshot-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;cursor:pointer;-webkit-tap-highlight-color:transparent;'
      + 'background:linear-gradient(to bottom,rgba(0,0,0,0.16),transparent 14%,transparent 86%,rgba(0,0,0,0.16));';
    const hint = document.createElement('div');
    hint.textContent = '탭하면 넘어가요';
    hint.id = 'treeshot-hint';
    hint.style.cssText = 'position:absolute;left:50%;bottom:calc(104px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);'
      + 'padding:4px 12px;border-radius:999px;background:rgba(30,40,30,0.38);color:#fff;font-size:12px;opacity:0.85;pointer-events:none;white-space:nowrap;';
    overlay.appendChild(hint);
    overlay.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); skipShot(); });
    document.body.appendChild(overlay);
  }
  overlay.querySelector('#treeshot-cine')?.remove();
  if (cine) { overlay.prepend(chapterCine()); document.body.classList.add('cine-open'); }
  overlay.querySelector('#treeshot-hint').style.bottom = cine ? 'calc(clamp(48px,9vh,90px) / 2 - 12px)' : 'calc(104px + env(safe-area-inset-bottom,0px))';
  overlay.style.display = 'block';
  overlay.classList.add('show');
  onKey = (e) => { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) skipShot(); };
  window.addEventListener('keydown', onKey, true);
}
function hideOverlay() {
  if (overlay) { overlay.classList.remove('show'); overlay.style.display = 'none'; overlay.querySelector('#treeshot-cine')?.remove(); }
  document.body.classList.remove('cine-open');
  if (onKey) window.removeEventListener('keydown', onKey, true);
  onKey = null;
}

function sparkle() {
  if (!player) return;
  spawnSparkle?.(player.position.x, 1.2, player.position.z, 18);
  spawnConfetti?.(player.position.x, 1.4, player.position.z);
}

