// =============================================================
//  🌳 마을 세계수 — 랜드마크 + 세계수 판 진입 (구역 머리말)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-16-world-tree-board-design.md §5~§9
//  ▶ 규칙(순수)은 js/world/tree-board.js, 판 화면(DOM)은 js/world/tree-board-ui.js. 여기는 게임 상태와 잇는 층.
//  ▶ 조형은 인트로 시든 세계수(js/spaces/prologue.js buildWiltSet)의 굽은 밑동·뿌리·가지 문법을 따른다.
//    마을용이라 조명 재질(라이트 추가 없음). 줄기·뿌리·가지는 지오메트리 하나 — 드로우콜 ≈ 줄기 1 + 우듬지 1 + 가지 잎 4 + 꽃 4.
//  ▶ 해금 꺼짐(CONFIG.UNLOCKS 'off') · 레거시 세이브 → 나무는 늘 다 살아 있고, 판은 선택 콘텐츠(꾸러미 보상만).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
// =============================================================
import {
  Input, clayMat, dist2D, gameState, giveReward, isOpen, mergeGeos, obstacles, player, refreshInventoryUI, requestSave,
  rewardText, scene, solidCircle, spawnConfetti, spawnSparkle, swayables, syncUnlocks, ui, unlocksOn,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { TAG_LABEL } from '../habitat.js';
import {
  BRANCHES, BRANCH_IDS, TREE_DECOR, branchGrowth, branchOf, branchStatus, branchUsable, bundleDone, bundlesDone,
  canAfford, decorOf, habitatDone, habitatRows, lifePercent, offerBundle, placeDecor, removeDecor,
} from '../world/tree-board.js';
import { closeTreeBoard, openTreeBoard, renderTreeBoard, treeBoardOpen } from '../world/tree-board-ui.js';
import * as THREE from 'three';

/** 마을 북쪽 끝 — 🛶 나루터 연못(0,-21.5 r7) 바로 뒤. 🏔️ 설산 언덕(-15,-36 r11)·🌫️ 입구(-21,-20)·🌊 후미와 안 겹친다 */
export const WORLD_TREE = new THREE.Vector3(4, 0, -35);
const TRUNK_R = 2.4;            // 밑동 콜라이더
const PROMPT_R = TRUNK_R + 2.3; // 밑동 둘레에 서면 프롬프트
const SCALE = 0.7;              // 인트로 나무 대비 — 마을 카메라(41° 내려다봄, 위쪽 끝이 수평 아래 20°)는 높은 우듬지를 못 담는다. 낮고 넓게

// 가지 → 마을 나무에서 뻗는 방향(카메라가 -z 를 보므로 +z 가 화면 앞). 💧 물은 연못 쪽(앞 왼쪽)
const LIMBS = {
  water:   { dir: [-1, 0.42, 0.95], h: 5.4 },
  farm:    { dir: [1, 0.45, 0.9],   h: 5.9 },
  kitchen: { dir: [1.1, 0.55, -0.3], h: 6.6 },
  forest:  { dir: [-1.1, 0.5, -0.3], h: 6.3 },
};
const BARK_LIVE = new THREE.Color(0x8d6a4c), BARK_DEAD = new THREE.Color(0x8e8b86);
const LEAF = 0x7cc97f, BLOOM = 0xf6a5c0;

let wt = null;   // { group, barkMat, crown, clusters: { id: { mesh, flowers, cur } }, crownCur }
let tab = 'water';
let freshTile = -1;   // 방금 놓은 칸만 톡 떨어지는 연출(다시 그릴 때마다 전부 튀지 않게)

const _up = new THREE.Vector3(0, 1, 0);
function limbGeo(a, b, r0, r1) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 6);
  const q = new THREE.Quaternion().setFromUnitVectors(_up, d.clone().normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** 마을에 세계수를 세운다(buildWorld 에서 1회) */
export function buildWorldTree() {
  if (wt) return;
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);   // 고정 시드 — 매번 같은 나무
  const g = new THREE.Group(); g.position.copy(WORLD_TREE); g.scale.setScalar(SCALE); g.name = 'worldTree';
  const bark = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // 밑동 + 굽은 줄기 두 마디
  const t1 = V(0.5, 4, 0.2), t2 = V(-0.2, 7.6, 0);
  bark.push(new THREE.CylinderGeometry(2.5, 3.3, 1.2, 7).translate(0, 0.5, 0));
  bark.push(limbGeo(V(0, -0.3, 0), t1, 2.5, 1.75), limbGeo(t1, t2, 1.75, 1.15));
  // 뿌리
  [12, 40, 100, 145, 200, 255, 315].forEach((deg) => {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), L = 4.2 + rnd() * 1.4;
    bark.push(limbGeo(V(c * 2.0, 0.9, s * 2.0), V(c * L, 0.05, s * L), 0.75, 0.16));
  });
  // 가지 — 판 가지마다 굵은 가지 1 + 잔가지. 잎 덩이는 그 가지 끝을 원점으로 한 메시 하나(흔들림·자람이 끝에서 퍼진다)
  const clusters = {};
  const leafMat = clayMat(LEAF), bloomMat = clayMat(BLOOM);
  for (const id of BRANCH_IDS) {
    const { dir, h } = LIMBS[id];
    const from = V(0, h, 0), d0 = V(...dir).normalize();
    const end = from.clone().addScaledVector(d0, 5.6 + rnd() * 0.8);
    bark.push(limbGeo(from, end, 0.75, 0.38));
    const tips = [];
    for (let i = 0; i < 3; i++) {
      const d2 = d0.clone(); d2.x += (rnd() - 0.5) * 1.3; d2.z += (rnd() - 0.5) * 1.3; d2.y += 0.25 + rnd() * 0.4;
      const tip = end.clone().addScaledVector(d2.normalize(), 2.6 + rnd() * 0.9);
      bark.push(limbGeo(end, tip, 0.36, 0.12));
      tips.push(tip);
    }
    // 잎 덩이(끝 기준 로컬) + 꽃
    const leafGeos = [], flowerGeos = [];
    const addBlob = (p, r) => {
      leafGeos.push(new THREE.IcosahedronGeometry(r, 0).rotateX(rnd() * 3).rotateY(rnd() * 3).translate(p.x - end.x, p.y - end.y, p.z - end.z));
      for (let k = 0; k < 3; k++) {
        const n = V(rnd() - 0.5, rnd() * 0.9, rnd() - 0.5).normalize();
        flowerGeos.push(new THREE.IcosahedronGeometry(0.24, 0).translate(p.x - end.x + n.x * r * 0.95, p.y - end.y + n.y * r * 0.95, p.z - end.z + n.z * r * 0.95));
      }
    };
    addBlob(end, 1.9);
    tips.forEach(tp => addBlob(tp, 1.3 + rnd() * 0.4));
    const mesh = new THREE.Mesh(mergeGeos(leafGeos), leafMat);
    mesh.position.copy(end); mesh.castShadow = true; mesh.scale.setScalar(0.001); mesh.visible = false;
    mesh.userData.swayPhase = rnd() * Math.PI * 2;
    const flowers = new THREE.Mesh(mergeGeos(flowerGeos), bloomMat);
    flowers.visible = false; mesh.add(flowers);
    g.add(mesh);
    clusters[id] = { mesh, flowers, cur: 0 };
  }
  const barkMat = clayMat(BARK_DEAD.getHex());
  const trunk = new THREE.Mesh(mergeGeos(bark), barkMat);
  trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk);
  // 우듬지 — 생명력만큼
  const crownGeos = [[0, 0, 0, 3.0], [1.6, -0.6, 0.8, 1.9], [-1.5, -0.4, -0.6, 2.0], [0.3, 1.4, -0.5, 1.6]]
    .map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 0).rotateY(rnd() * 3).translate(x, y, z));
  const crown = new THREE.Mesh(mergeGeos(crownGeos), leafMat);
  crown.position.copy(t2).add(V(0, 1.6, 0)); crown.castShadow = true; crown.scale.setScalar(0.001); crown.visible = false;
  crown.userData.swayPhase = 1.3;
  g.add(crown);
  scene.add(g);
  swayables.push(crown, ...Object.values(clusters).map(c => c.mesh));
  solidCircle(WORLD_TREE.x, WORLD_TREE.z, TRUNK_R);
  obstacles.push({ x: WORLD_TREE.x, z: WORLD_TREE.z, r: 5 });   // 나무 밑엔 밭 금지
  wt = { group: g, barkMat, crown, crownCur: 0, clusters, life: -1 };
}

/** 나무를 다 살려 보여 줄까 — 해금 꺼짐·레거시 세이브는 이웃이 이미 다 있다 */
function fullyAlive() { return !unlocksOn() || !!gameState.unlocks?.legacy; }

/** 판이 열렸나 — 박물관 할아버지를 만난 뒤(해금 꺼짐·레거시는 isOpen 이 늘 true) */
export function worldTreeBoardOpen() { return isOpen('museum'); }

let targetAt = 0, targets = null;
function computeTargets() {
  const full = fullyAlive(), tree = gameState.tree;
  const out = { life: full ? 100 : lifePercent(tree), branches: {} };
  for (const id of BRANCH_IDS) out.branches[id] = full ? { leaves: 1, bloom: true } : branchGrowth(tree, id);
  return out;
}

/** 매 프레임 — 잎이 목표 크기로 천천히 자란다(0.5초마다 목표를 다시 잰다 — 표 4줄이라 싸다) */
export function updateWorldTree(dt, t) {
  if (!wt) return;
  if (!targets || t - targetAt > 0.5) { targets = computeTargets(); targetAt = t; }
  const k = Math.min(1, dt * 1.6);
  for (const id of BRANCH_IDS) {
    const c = wt.clusters[id], goal = targets.branches[id];
    c.cur += (goal.leaves - c.cur) * k;
    const s = c.cur < 0.02 ? 0 : 0.25 + 0.75 * c.cur;
    c.mesh.visible = s > 0;
    if (s > 0) c.mesh.scale.setScalar(s);
    c.flowers.visible = goal.bloom && c.cur > 0.9;
  }
  const life = targets.life / 100;
  wt.crownCur += (life - wt.crownCur) * k;
  const cs = wt.crownCur < 0.03 ? 0 : 0.2 + 0.8 * wt.crownCur;
  wt.crown.visible = cs > 0;
  if (cs > 0) wt.crown.scale.setScalar(cs);
  if (Math.abs(wt.life - wt.crownCur) > 0.004) {   // 줄기 색: 잿빛 → 따뜻한 갈색
    wt.life = wt.crownCur;
    wt.barkMat.color.copy(BARK_DEAD).lerp(BARK_LIVE, Math.min(1, wt.crownCur * 1.6));
  }
}

/** 밑동 근처인가(doors.js 프롬프트) */
export function worldTreeNear(p) { return !!wt && dist2D(WORLD_TREE, p) < PROMPT_R; }

export function worldTreePrompt() {
  return worldTreeBoardOpen() ? '🌳 세계수 · Space 로 살펴보기' : '🌳 시든 세계수 — 박물관 할아버지가 방법을 안대요';
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
    branches: BRANCHES.map(x => ({ id: x.id, ico: x.ico, name: x.name, status: branchStatus(tree, x.id) })),
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
          slots, canOffer: slots.some(s => s.have < s.need && s.bag > 0),
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
  if (!worldTreeBoardOpen()) { ui.toast?.('🌳 시든 세계수 — 박물관 할아버지가 방법을 안대요', 2600); return; }
  // 처음 열 땐 아직 안 끝난 첫 가지로
  const firstOpen = BRANCH_IDS.find(id => branchUsable(gameState.tree, id) && !(habitatDone(gameState.tree, id) && bundlesDone(gameState.tree, id)));
  if (!treeBoardOpen() && firstOpen) tab = firstOpen;
  Input.setAnalog?.(0, 0);
  openTreeBoard(boardView(), ACTIONS);
  trackEvent('tree_board_open', { life: lifePercent(gameState.tree) });
}

const REASON = {
  locked: '앞 가지의 빈터를 먼저 꾸며 주세요',
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
  const r = placeDecor(tree, tab, tile, decoId, gameState.inventory);
  if (!r.ok) { ui.toast?.(REASON[r.reason] || '지금은 놓을 수 없어요', 1800); return; }
  gameState.tree = r.tree;
  freshTile = tile;
  spend(r.cost, -1);
  Sound.build?.();
  trackEvent('tree_deco_place', { branch: tab, deco: decoId, tile });
  handleEvents(r.events);
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
  const r = offerBundle(gameState.tree, tab, bundleId, gameState.inventory);
  if (!r.ok) { ui.toast?.(REASON[r.reason] || '지금은 바칠 수 없어요', 1800); return; }
  gameState.tree = r.tree;
  spend(r.take, -1);
  Sound.harvest?.();
  const complete = r.events.some(e => e.type === 'bundle');
  trackEvent('tree_bundle_offer', { branch: tab, bundle: bundleId, items: Object.values(r.take).reduce((a, b) => a + b, 0), complete });
  handleEvents(r.events);
  requestSave();
  rerender();
}

/** 완성 이벤트 — 토스트·보상·GA4 · 서식지면 이웃 귀환(syncUnlocks) */
function handleEvents(events) {
  for (const e of events) {
    const def = branchOf(e.branch);
    if (e.type === 'habitat') {
      Sound.complete?.();
      ui.toast?.(`${def.ico} ${def.name}에 잎이 돋았어요!`, 2600);
      trackEvent('tree_branch_habitat', { branch: e.branch, life: lifePercent(gameState.tree) });
      sparkle();
      const before = isOpen(def.npc);
      syncUnlocks(false);   // 🔓 기존 귀환 연출(걸어 들어오기 + 모달)
      if (!before && isOpen(def.npc)) {
        const line = jong(def.npcName) ? `${def.npcIco} ${def.npcName}이 빈터를 보고 돌아왔어요!` : `${def.npcIco} ${def.npcName}가 빈터를 보고 돌아왔어요!`;
        setTimeout(() => ui.toast?.(line, 3000), 900);
        setTimeout(() => closeTreeBoard(), 2200);   // 판을 닫아야 귀환 모달·걸어 들어오는 모습이 보인다
      }
    } else if (e.type === 'bundle') {
      const bd = def.bundles.find(x => x.id === e.bundle);
      giveReward(e.reward, 'tree_bundle', e.bundle);
      ui.toast?.(`🎁 ${bd.name} 완성! ${rewardText(e.reward)}`, 2600);
    } else if (e.type === 'bundles') {
      Sound.complete?.();
      trackEvent('tree_branch_bundles', { branch: e.branch, life: lifePercent(gameState.tree) });
      if (habitatDone(gameState.tree, e.branch)) setTimeout(() => ui.toast?.(`🌸 ${def.name}에 꽃이 피었어요!`, 2800), 1200);
      sparkle();
      syncUnlocks(false);   // 🦆 나루터 꾸러미 → 사공·바다
    }
  }
}

function sparkle() {
  if (!player) return;
  spawnSparkle?.(player.position.x, 1.2, player.position.z, 18);
  spawnConfetti?.(player.position.x, 1.4, player.position.z);
}

