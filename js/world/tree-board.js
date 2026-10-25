// =============================================================
//  calm forest · 🌳 세계수 판 — 가지별 빈터(서식지) + 꾸러미 (순수 함수 — DOM/Three/import 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-16-world-tree-board-design.md
//  ▶ js/world/unlocks.js 의 가지 조건(state.tree.branches[id].habitat / .bundles)을 채우는 쪽이 여기다.
//  ▶ 완성 플래그는 **단조**: 한 번 true 면 장식을 빼도 true — 돌아온 이웃이 다시 떠나지 않는다.
//  ▶ 상태를 고치지 않는다 — 함수마다 새 tree 와 events 를 돌려준다. 가방 차감·보상 지급은 호출부(game.js) 몫.
//  ▶ 가지 순서 = 해금 순서. 💧 물이 첫 번째(E3 첫 물고기 경로와 맞물린다).
//  ▶ 테스트: npm test (tests/world-tree-board.test.mjs)
// =============================================================

export const TREE_V = 1;
export const TILES = 6;   // 가지마다 빈터 3×2

/** 빈터 장식 — 재료는 🪵·🪨·⚫ 만(시작부터 나는 것). tags 는 js/habitat.js 의 태그 이름 */
export const TREE_DECOR = [
  { id: 'plot',    ico: '🌾', name: '밭칸',     tags: { food: 2 },           cost: { wood: 1 } },
  { id: 'pond',    ico: '💧', name: '작은 연못', tags: { damp: 3 },           cost: { stone: 3 } },
  { id: 'flowers', ico: '🌷', name: '꽃밭',     tags: { nectar: 2 },         cost: { stone: 1 } },
  { id: 'lantern', ico: '🏮', name: '등불',     tags: { light: 2 },          cost: { wood: 2, coal: 1 } },
  { id: 'hut',     ico: '🛖', name: '오두막',   tags: { shelter: 3 },        cost: { wood: 6 } },
  { id: 'bigtree', ico: '🌳', name: '큰 나무',  tags: { shade: 2 },          cost: { wood: 2 } },
  { id: 'fruit',   ico: '🍎', name: '과일나무', tags: { food: 1, shade: 1 }, cost: { wood: 2 } },
  { id: 'lotus',     ico: '🌸', name: '꽃 연못',   tags: { damp: 4, nectar: 1 },  cost: { stone: 4 },          bloom: 'water' },
  { id: 'sunflower', ico: '🌻', name: '해바라기', tags: { food: 3, nectar: 1 },  cost: { wood: 2 },           bloom: 'farm' },
  { id: 'hearth',    ico: '🔥', name: '화롯불',   tags: { light: 3, shelter: 1 }, cost: { wood: 3, coal: 1 }, bloom: 'kitchen' },
  { id: 'oldtree',   ico: '🍄', name: '버섯 고목', tags: { shade: 3, shelter: 2 }, cost: { wood: 5 },          bloom: 'forest' },
  { id: 'crystallamp', ico: '🔮', name: '수정 등불', tags: { light: 3, shelter: 1 }, cost: { stone: 4, coal: 1 }, bloom: 'mine' },
];

/**
 * 가지 표 — 배열 순서 = 판이 열리는 순서.
 *   habitat  태그 하한(합이 이 값 이상이면 완성)
 *   bundles  need = 바칠 재료(gameState.inventory 키) · reward = 완성 보상
 *   ⚠️ 재료는 "그 가지가 열릴 때 이미 얻을 수 있는 것"만 — 스펙 §2 표. 🍄 채집물·🌟 반딧불이는 숲 가지 뒤라 못 쓴다.
 */
export const BRANCHES = [
  { id: 'water',   ico: '💧', name: '물의 가지',   short: '물',   npc: 'angler',  npcIco: '🎣', npcName: '낚시꾼 할아버지',
    habitat: { damp: 6, shade: 2 },
    bundles: [
      { id: 'river',     name: '강의 꾸러미',    need: { fish: 5, stone: 5 },  reward: { coins: 30 } },
      { id: 'ferry',     name: '나루터 꾸러미',  need: { wood: 20, stone: 10 }, reward: { coins: 40 } },
    ] },
  { id: 'farm',    ico: '🌾', name: '밭의 가지',   short: '밭',   npc: 'farmer',  npcIco: '🧑‍🌾', npcName: '농부 삼촌',
    habitat: { food: 6, damp: 2 },
    bundles: [
      { id: 'harvest',   name: '첫 수확 꾸러미', need: { crop: 15 },           reward: { seed: 10 } },
      { id: 'seeds',     name: '씨앗 꾸러미',    need: { seed: 10, wood: 10 }, reward: { fert: 3 } },
    ] },
  { id: 'kitchen', ico: '🍳', name: '부엌의 가지', short: '부엌', npc: 'chef',    npcIco: '🐼', npcName: '요리사 판다',
    habitat: { food: 3, light: 3, nectar: 2 },
    bundles: [
      { id: 'breakfast', name: '아침상 꾸러미',  need: { crop: 10, fish: 3 },  reward: { coins: 40 } },
      { id: 'hearth',    name: '화덕 꾸러미',    need: { coal: 5, stone: 10 }, reward: { coins: 50 } },
    ] },
  { id: 'forest',  ico: '🌲', name: '숲의 가지',   short: '숲',   npc: 'forager', npcIco: '🦡', npcName: '숲지기 오소리',
    habitat: { shade: 4, nectar: 2, shelter: 2 },
    bundles: [
      { id: 'woods',     name: '숲의 꾸러미',    need: { wood: 30, stone: 10 }, reward: { coins: 50 } },
      { id: 'firefly',   name: '반딧불 꾸러미',  need: { coal: 5, gem: 1 },    reward: { coins: 80 } },
    ] },
  { id: 'mine',    ico: '⛏️', name: '광산의 가지', short: '광산', npc: 'miner',   npcIco: '👷', npcName: '광부 아저씨',
    habitat: { light: 4, shelter: 3, shade: 2 },
    bundles: [
      { id: 'shaft',     name: '갱도 꾸러미',    need: { coal: 15, stone: 20 }, reward: { coins: 60 } },
      { id: 'vein',      name: '광맥 꾸러미',    need: { gem: 2, coal: 10 },   reward: { coins: 80 } },
    ] },
];

export const BRANCH_IDS = BRANCHES.map(b => b.id);
const BY_ID = new Map(BRANCHES.map(b => [b.id, b]));
const DECOR_BY_ID = new Map(TREE_DECOR.map(d => [d.id, d]));
export const branchOf = (id) => BY_ID.get(id) || null;
export const decorOf = (id) => DECOR_BY_ID.get(id) || null;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

function emptyBranch(def) {
  const given = {};
  for (const b of def.bundles) given[b.id] = {};
  return { tiles: Array(TILES).fill(null), given, habitat: false, bundles: false };
}

/** 새 세이브 기본값 */
export function defaultTree() {
  const branches = {};
  for (const def of BRANCHES) branches[def.id] = emptyBranch(def);
  return { v: TREE_V, branches };
}

/**
 * 세이브 복원 — 모르는 가지·장식·꾸러미·재료는 버리고, 개수는 0~필요량 정수로 자른다.
 * habitat 은 저장값이 true 거나 지금 칸이 하한을 넘으면 true(단조). bundles 는 바친 양에서 다시 계산(+저장된 true 유지).
 */
export function restoreTree(saved) {
  const out = defaultTree();
  if (!isObj(saved) || !isObj(saved.branches)) return out;
  for (const def of BRANCHES) {
    const s = saved.branches[def.id];
    if (!isObj(s)) continue;
    const b = out.branches[def.id];
    if (Array.isArray(s.tiles)) {
      for (let i = 0; i < TILES; i++) b.tiles[i] = DECOR_BY_ID.has(s.tiles[i]) ? s.tiles[i] : null;
    }
    if (isObj(s.given)) {
      for (const bd of def.bundles) {
        const g = s.given[bd.id];
        if (!isObj(g)) continue;
        for (const [k, need] of Object.entries(bd.need)) {
          const n = g[k];
          if (Number.isInteger(n) && n > 0) b.given[bd.id][k] = Math.min(n, need);
        }
      }
    }
    b.habitat = s.habitat === true || meetsHabitat(def, b.tiles);
    b.bundles = s.bundles === true || def.bundles.every(bd => bundleFull(bd, b.given[bd.id]));
  }
  return out;
}

const branchState = (tree, id) => tree?.branches?.[id] || null;

/** 빈터 칸의 태그 합 { tag: n } — 하한에 쓰는 태그는 0 으로라도 채운다 */
export function tagTotals(tree, id) {
  const def = BY_ID.get(id), b = branchState(tree, id);
  const env = {};
  if (def) for (const t of Object.keys(def.habitat)) env[t] = 0;
  for (const deco of b?.tiles || []) {
    const d = DECOR_BY_ID.get(deco);
    if (d) for (const [t, n] of Object.entries(d.tags)) env[t] = (env[t] || 0) + n;
  }
  return env;
}

function meetsHabitat(def, tiles) {
  const env = {};
  for (const deco of tiles) { const d = DECOR_BY_ID.get(deco); if (d) for (const [t, n] of Object.entries(d.tags)) env[t] = (env[t] || 0) + n; }
  return Object.entries(def.habitat).every(([t, n]) => (env[t] || 0) >= n);
}
function bundleFull(bd, given) { return Object.entries(bd.need).every(([k, n]) => (given?.[k] || 0) >= n); }

/** 미터 줄 [{tag, have, need, ok}] */
export function habitatRows(tree, id) {
  const def = BY_ID.get(id); if (!def) return [];
  const env = tagTotals(tree, id);
  return Object.entries(def.habitat).map(([tag, need]) => ({ tag, have: env[tag] || 0, need, ok: (env[tag] || 0) >= need }));
}

/** 지금 칸이 하한을 넘는가(라이브). 저장 플래그는 branches[id].habitat */
export function habitatMet(tree, id) {
  const def = BY_ID.get(id), b = branchState(tree, id);
  return !!(def && b && meetsHabitat(def, b.tiles));
}
export function recommendDecor(tree, id) {
  const def = BY_ID.get(id), b = branchState(tree, id);
  if (!def || !b || meetsHabitat(def, b.tiles)) return [];
  const pool = TREE_DECOR.filter(d => !d.bloom);
  const free = b.tiles.filter(x => !x).length;
  const env0 = tagTotals(tree, id);
  let best = null;
  const walk = (start, picks, cost) => {
    if (best && cost > best.cost) return;
    const env = { ...env0 };
    for (const d of picks) for (const [t, n] of Object.entries(d.tags)) env[t] = (env[t] || 0) + n;
    if (Object.entries(def.habitat).every(([t, n]) => (env[t] || 0) >= n)) {
      if (!best || cost < best.cost || (cost === best.cost && picks.length < best.picks.length)) best = { cost, picks: [...picks] };
      return;
    }
    if (picks.length >= free) return;
    for (let i = start; i < pool.length; i++) walk(i, [...picks, pool[i]], cost + sum(pool[i].cost));
  };
  walk(0, [], 0);
  if (!best) return [];
  return pool.map(d => ({ id: d.id, n: best.picks.filter(p => p === d).length })).filter(r => r.n > 0);
}

/** 서식지 완성 — 단조 플래그 */
export const habitatDone = (tree, id) => !!branchState(tree, id)?.habitat;

export function bundleDone(tree, id, bundleId) {
  const def = BY_ID.get(id), bd = def?.bundles.find(x => x.id === bundleId);
  return !!(bd && bundleFull(bd, branchState(tree, id)?.given?.[bundleId]));
}
/** 꾸러미 전부 완성 — 단조 플래그(바친 건 돌려받지 않으므로 자연히 단조) */
export const bundlesDone = (tree, id) => !!branchState(tree, id)?.bundles;

/** 가지 진척 { habitat: 0~1, bundles: 0~1 } */
export function branchRatio(tree, id) {
  const def = BY_ID.get(id), b = branchState(tree, id);
  if (!def || !b) return { habitat: 0, bundles: 0 };
  let habitat = 1;
  if (!b.habitat) {
    const rows = habitatRows(tree, id);
    habitat = rows.reduce((a, r) => a + Math.min(1, r.have / r.need), 0) / rows.length;
  }
  const bundles = def.bundles.reduce((a, bd) => {
    const g = b.given[bd.id] || {};
    const got = Object.entries(bd.need).reduce((s, [k, n]) => s + Math.min(n, g[k] || 0), 0);
    return a + got / sum(bd.need);
  }, 0) / def.bundles.length;
  return { habitat, bundles };
}

/** 세계수 생명력 0~100 — 4가지 × (서식지 + 꾸러미)/2 의 평균 */
export function lifePercent(tree) {
  let t = 0;
  for (const id of BRANCH_IDS) { const r = branchRatio(tree, id); t += (r.habitat + r.bundles) / 2; }
  return Math.round((t / BRANCH_IDS.length) * 100);
}

/** 마을 나무 가지 잎 0~1 — 서식지 완성 0.4 + 꾸러미 비율 0.6. bloom = 둘 다 끝 */
export function branchGrowth(tree, id) {
  const r = branchRatio(tree, id);
  return { leaves: (habitatDone(tree, id) ? 0.4 : 0) + 0.6 * r.bundles, bloom: habitatDone(tree, id) && bundlesDone(tree, id) };
}

/** 이 가지 판을 쓸 수 있나 — 앞 가지의 서식지가 완성돼야(첫 가지는 늘) */
export function branchUsable(tree, id) {
  const i = BRANCH_IDS.indexOf(id);
  if (i < 0) return false;
  return i === 0 || habitatDone(tree, BRANCH_IDS[i - 1]);
}

export function canAfford(inv, cost) {
  return Object.entries(cost).every(([k, n]) => (inv?.[k] || 0) >= n);
}

function cloneTree(tree) {
  const base = isObj(tree?.branches) ? tree : defaultTree();
  const branches = {};
  for (const def of BRANCHES) {
    const b = base.branches[def.id] || emptyBranch(def);
    const given = {};
    for (const bd of def.bundles) given[bd.id] = { ...(b.given?.[bd.id] || {}) };
    branches[def.id] = { tiles: [...(b.tiles || Array(TILES).fill(null))], given, habitat: !!b.habitat, bundles: !!b.bundles };
  }
  return { v: TREE_V, branches };
}

const fail = (tree, reason) => ({ ok: false, reason, tree, events: [] });

/**
 * 빈 칸에 장식 놓기.
 * @returns {{ok, reason?, tree, cost?, events}} cost = 가방에서 뺄 재료. events: [{type:'habitat', branch}]
 *   reason: 'branch' | 'locked' | 'tile' | 'taken' | 'decor' | 'afford'
 */
export function placeDecor(tree, id, tile, decoId, inv) {
  const def = BY_ID.get(id);
  if (!def) return fail(tree, 'branch');
  if (!branchUsable(tree, id)) return fail(tree, 'locked');
  if (!Number.isInteger(tile) || tile < 0 || tile >= TILES) return fail(tree, 'tile');
  const d = DECOR_BY_ID.get(decoId);
  if (!d) return fail(tree, 'decor');
  if (branchState(tree, id)?.tiles?.[tile]) return fail(tree, 'taken');
  if (!canAfford(inv, d.cost)) return fail(tree, 'afford');
  const next = cloneTree(tree);
  const b = next.branches[id];
  b.tiles[tile] = decoId;
  const events = [];
  if (!b.habitat && meetsHabitat(def, b.tiles)) { b.habitat = true; events.push({ type: 'habitat', branch: id }); }
  return { ok: true, tree: next, cost: { ...d.cost }, events };
}

/** 놓인 장식 빼기 — 재료를 돌려준다(refund). 서식지 플래그는 그대로(단조) */
export function removeDecor(tree, id, tile) {
  if (!BY_ID.has(id)) return fail(tree, 'branch');
  if (!branchUsable(tree, id)) return fail(tree, 'locked');
  const deco = branchState(tree, id)?.tiles?.[tile];
  const d = DECOR_BY_ID.get(deco);
  if (!d) return fail(tree, 'tile');
  const next = cloneTree(tree);
  next.branches[id].tiles[tile] = null;
  return { ok: true, tree: next, refund: { ...d.cost }, events: [] };
}

/**
 * 꾸러미에 가방에 있는 만큼 바치기.
 * @returns {{ok, reason?, tree, take?, events}} take = 가방에서 뺄 재료 { item: n }
 *   events: [{type:'bundle', branch, bundle, reward}] (그 꾸러미가 막 찼을 때) · [{type:'bundles', branch}] (가지 꾸러미 전부)
 *   reason: 'branch' | 'locked' | 'habitat' | 'bundle' | 'full' | 'empty'
 */
export function offerBundle(tree, id, bundleId, inv) {
  const def = BY_ID.get(id);
  if (!def) return fail(tree, 'branch');
  if (!branchUsable(tree, id)) return fail(tree, 'locked');
  // 🏡 빈터(이웃 귀환)가 먼저 — 꾸러미부터 끝내면 사공 오리가 낚시꾼보다 먼저 돌아오는 등 이야기 순서가 뒤집힌다(2026-10-17 사용자 결정)
  if (!habitatDone(tree, id)) return fail(tree, 'habitat');
  const bd = def.bundles.find(x => x.id === bundleId);
  if (!bd) return fail(tree, 'bundle');
  const cur = branchState(tree, id)?.given?.[bundleId] || {};
  if (bundleFull(bd, cur)) return fail(tree, 'full');
  const take = {};
  for (const [k, need] of Object.entries(bd.need)) {
    const n = Math.min(need - (cur[k] || 0), Math.max(0, Math.floor(inv?.[k] || 0)));
    if (n > 0) take[k] = n;
  }
  if (!Object.keys(take).length) return fail(tree, 'empty');
  const next = cloneTree(tree);
  const b = next.branches[id];
  for (const [k, n] of Object.entries(take)) b.given[bundleId][k] = (b.given[bundleId][k] || 0) + n;
  const events = [];
  if (bundleFull(bd, b.given[bundleId])) events.push({ type: 'bundle', branch: id, bundle: bundleId, reward: { ...bd.reward } });
  if (!b.bundles && def.bundles.every(x => bundleFull(x, b.given[x.id]))) { b.bundles = true; events.push({ type: 'bundles', branch: id }); }
  return { ok: true, tree: next, take, events };
}

/** 탭 상태 점 — 'locked' | 'open' | 'habitat' | 'bloom' */
export function branchStatus(tree, id) {
  if (!branchUsable(tree, id)) return 'locked';
  if (habitatDone(tree, id) && bundlesDone(tree, id)) return 'bloom';
  if (habitatDone(tree, id)) return 'habitat';
  return 'open';
}
