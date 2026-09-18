// =============================================================
//  calm forest · retention guidance — early-session rule router
//  -------------------------------------------------------------
//  The model is allowed to rescue rule-low users when a score is
//  supplied later, but the first implementation runs on client rules.
// =============================================================

export const DEFAULT_RETENTION_GUIDANCE = {
  enabled: true,
  highTracked: 20,
  highActions: 6,
  modelThreshold: 0.285,
  triggerSec: [180, 600],
  maxPerSession: 1,
  cooldownMs: 180000,
  outcomeWindowMs: 600000,
};

const SYSTEM_EVENTS = new Set([
  'churn_score',
  'session_time',
]);

const ACTION_EVENTS = new Set([
  'chop_tree', 'first_chop', 'plant_seed', 'water_crop', 'harvest_crop',
  'dig_plot', 'weed_pull', 'pest_clear', 'use_fert',
  'fishing_cast', 'fishing_catch', 'fishing_miss',
  'npc_talk', 'quest_accept', 'quest_complete',
  'shop_sell', 'shop_buy',
  'craft_item', 'place_decor', 'move_decor', 'store_decor',
  'cook_eat', 'cook_store', 'cooking_start', 'cooking_result',
  'carve_start', 'carve_result',
  'mine_ore', 'forage_pick', 'firefly_swing', 'firefly_catch',
  'sea_cast', 'sea_catch', 'sea_miss',
  'boat_start', 'boat_end', 'boat_pickup',
  'mist_soothe', 'mist_practice_soothe',
  'museum_enter', 'museum_view_open', 'museum_floor',
  'cafe_serve', 'cafe_complete',
  'orchard_enter', 'sapling_plant', 'tree_water', 'fruit_harvest',
  'worker_hire', 'worker_promote',
]);

const FAMILY_RULES = [
  ['sea_boat', /^(sea_|boat_)/],
  ['mist', /^mist_/],
  ['museum', /^museum_/],
  ['cafe', /^cafe_/],
  ['orchard', /^(orchard_|fruit_|tree_|sapling_|sap_)/],
  ['worker', /^worker_/],
  ['farm_system', /^(farm_|craft_item|warehouse_|honey_|compost)/],
  ['onboarding_guidance', /^(guide_|map_|tutorial_|intro_)/],
];

export function eventFamily(name) {
  for (const [family, re] of FAMILY_RULES) {
    if (re.test(name)) return family;
  }
  return null;
}

export function isDeliberateEvent(name) {
  return ACTION_EVENTS.has(name);
}

export function createGuidanceCounters(startMs = Date.now()) {
  const familyCounts = Object.create(null);
  const actionKinds = new Set();
  let tracked = 0;
  let actions = 0;

  function record(name) {
    if (!name || SYSTEM_EVENTS.has(name) || name.startsWith('retention_guidance_')) return null;
    tracked += 1;
    const family = eventFamily(name);
    if (family) familyCounts[family] = (familyCounts[family] || 0) + 1;
    if (isDeliberateEvent(name)) {
      actions += 1;
      actionKinds.add(name);
    }
    return { family, deliberate: isDeliberateEvent(name) };
  }

  function snapshot(nowMs = Date.now()) {
    return {
      elapsedSec: Math.max(0, Math.round((nowMs - startMs) / 1000)),
      earlyTracked: tracked,
      earlyActions: actions,
      actionKinds: actionKinds.size,
      familyCounts: { ...familyCounts },
      seenFamilies: Object.keys(familyCounts).filter(k => familyCounts[k] > 0),
    };
  }

  return { record, snapshot };
}

export function classifyGuidance(counters, opts = {}) {
  const cfg = { ...DEFAULT_RETENTION_GUIDANCE, ...opts };
  const tracked = counters.earlyTracked || 0;
  const actions = counters.earlyActions || 0;
  const score = typeof counters.modelScore === 'number' ? counters.modelScore : null;

  if (tracked >= cfg.highTracked && actions >= cfg.highActions) {
    return { eligible: true, segment: 'next_content', reason: 'rule_high_play' };
  }
  if (tracked >= cfg.highTracked && actions < cfg.highActions) {
    return { eligible: true, segment: 'first_action_help', reason: 'rule_high_low_action' };
  }
  if (score != null && score >= cfg.modelThreshold) {
    return { eligible: true, segment: 'model_rescue', reason: 'model_high_rule_low' };
  }
  if (tracked < cfg.highTracked && actions === 0) {
    return { eligible: true, segment: 'entry_support', reason: 'rule_entry_idle' };
  }
  return { eligible: false, segment: 'none', reason: 'rule_quiet' };
}

export function pickGuidanceBanner(decision, counters, gs = {}) {
  if (!decision?.eligible) return null;

  if (gs.plantedUnwatered > 0) {
    return {
      kind: 'water_crop',
      targetFamily: 'farm_system',
      ico: '💧',
      title: '작물이 기다리고 있어요',
      line: '심어둔 밭에 물을 주면 바로 이어갈 수 있어요.',
    };
  }
  if (gs.openQuests > 0) {
    return {
      kind: 'quest',
      targetFamily: 'quest',
      ico: '📜',
      title: '받아둔 부탁이 있어요',
      line: '마을 사람이 기다리고 있어요.',
    };
  }
  if (gs.buildableHouse) {
    return {
      kind: 'house_build',
      targetFamily: 'house',
      ico: '🏠',
      title: '집을 손볼 수 있어요',
      line: '재료가 모였어요. 집터에서 바로 이어갈 수 있어요.',
    };
  }

  const seen = new Set(counters.seenFamilies || []);
  if (decision.segment === 'next_content') {
    const candidates = [
      ['sea_boat', { kind: 'sea_boat', targetFamily: 'sea_boat', ico: '🎣', title: '물가 쪽도 열려 있어요', line: '낚시나 바다터에서 짧게 하나 해볼까요.' }],
      ['mist', { kind: 'mist', targetFamily: 'mist', ico: '🌫️', title: '안개 숲도 둘러볼까요', line: '등불과 정령 쪽으로 다른 흐름을 이어갈 수 있어요.' }],
      ['museum', { kind: 'museum', targetFamily: 'museum', ico: '🏛️', title: '모은 것들을 확인해볼까요', line: '박물관에서 도감 진행을 한 번 볼 수 있어요.' }],
      ['cafe', { kind: 'cafe', targetFamily: 'cafe', ico: '☕', title: '카페 일도 해볼까요', line: '손님 주문을 하나 처리하면 흐름이 이어져요.' }],
      ['orchard', { kind: 'orchard', targetFamily: 'orchard', ico: '🌳', title: '과수원도 살펴볼까요', line: '나무를 심고 돌보는 쪽으로 이어갈 수 있어요.' }],
    ];
    for (const [family, banner] of candidates) {
      if (!seen.has(family)) return banner;
    }
    return { kind: 'next_content', targetFamily: 'any_action', ico: '🌿', title: '이어서 하나만 더 해볼까요', line: '가까운 장소에서 짧은 행동 하나만 이어가도 좋아요.' };
  }

  if (decision.segment === 'first_action_help' || decision.segment === 'model_rescue') {
    return {
      kind: decision.segment,
      targetFamily: 'any_action',
      ico: '👉',
      title: '가까운 것부터 해볼까요',
      line: '나무, 주민, 밭처럼 바로 앞에 있는 것에 다가가 버튼을 눌러보세요.',
    };
  }

  return {
    kind: 'entry_support',
    targetFamily: 'onboarding_guidance',
    ico: '📖',
    title: '처음엔 한 가지만 해도 돼요',
    line: '움직여서 가까운 대상에 다가가면 할 수 있는 일이 떠요.',
  };
}

export function createRetentionGuidance(deps) {
  const cfg = { ...DEFAULT_RETENTION_GUIDANCE, ...(deps.config || {}) };
  const now = deps.now || (() => Date.now());
  const setTimer = deps.setTimeout || ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimeout || (id => clearTimeout(id));
  const counters = createGuidanceCounters(now());
  const timers = [];
  let shownCount = 0;
  let lastShownAt = 0;
  let active = null;
  let seq = 0;

  function commonPayload(trigger, snap, decision) {
    return {
      policy_version: cfg.policyVersion || 'retention-guidance-rules-2026-09-18',
      trigger,
      early_tracked: snap.earlyTracked,
      early_actions: snap.earlyActions,
      action_kinds: snap.actionKinds,
      rule_segment: decision.segment,
      reason: decision.reason,
      model_score: typeof snap.modelScore === 'number' ? snap.modelScore : undefined,
      platform: snap.platform,
    };
  }

  function run(trigger = 'timer') {
    if (!cfg.enabled) return null;
    const snap = counters.snapshot(now());
    if (deps.platform) snap.platform = typeof deps.platform === 'function' ? deps.platform() : deps.platform;
    const score = deps.modelScore ? deps.modelScore(snap) : null;
    if (typeof score === 'number') snap.modelScore = score;

    const decision = classifyGuidance(snap, cfg);
    deps.track?.('retention_guidance_eligible', commonPayload(trigger, snap, decision));

    const suppressed = deps.suppress?.() || null;
    if (!decision.eligible || suppressed || shownCount >= cfg.maxPerSession || now() - lastShownAt < cfg.cooldownMs) {
      deps.track?.('retention_guidance_decision', {
        ...commonPayload(trigger, snap, decision),
        eligible: decision.eligible,
        selected_kind: null,
        suppressed_reason: suppressed || (shownCount >= cfg.maxPerSession ? 'max_per_session' : (now() - lastShownAt < cfg.cooldownMs ? 'cooldown' : undefined)),
      });
      return null;
    }

    const gs = typeof deps.gameState === 'function' ? deps.gameState() : (deps.gameState || {});
    const banner = pickGuidanceBanner(decision, snap, gs);
    if (!banner) return null;

    const guidanceId = `${Date.now().toString(36)}-${++seq}`;
    const payload = {
      ...commonPayload(trigger, snap, decision),
      eligible: true,
      guidance_id: guidanceId,
      selected_kind: banner.kind,
      target_family: banner.targetFamily,
    };
    deps.track?.('retention_guidance_decision', payload);
    deps.showBanner?.({
      ...banner,
      attention: true,
      onShow: () => deps.track?.('retention_guidance_show', payload),
      onDismiss: reason => deps.track?.('retention_guidance_dismiss', { guidance_id: guidanceId, reason, selected_kind: banner.kind }),
      onTap: () => deps.track?.('retention_guidance_click', { guidance_id: guidanceId, selected_kind: banner.kind }),
    });
    shownCount += 1;
    lastShownAt = now();
    active = { id: guidanceId, shownAt: lastShownAt, targetFamily: banner.targetFamily, kind: banner.kind, done: false };
    return payload;
  }

  function recordEvent(name, params = {}) {
    const rec = counters.record(name);
    if (!rec || !active || active.done) return;
    if (now() - active.shownAt > cfg.outcomeWindowMs) {
      active.done = true;
      return;
    }
    const family = rec.family;
    const hit = active.targetFamily === 'any_action'
      ? rec.deliberate
      : family === active.targetFamily || name === active.kind;
    if (hit) {
      active.done = true;
      deps.track?.('retention_guidance_outcome', {
        guidance_id: active.id,
        selected_kind: active.kind,
        outcome_event: name,
        outcome_family: family,
        elapsed_ms: now() - active.shownAt,
        platform: params.platform,
      });
    }
  }

  function start() {
    if (!cfg.enabled) return;
    for (const sec of cfg.triggerSec || []) {
      timers.push(setTimer(() => run(`t${sec}`), sec * 1000));
    }
  }

  function stop() {
    while (timers.length) clearTimer(timers.pop());
  }

  return { recordEvent, run, start, stop, counters };
}

export function buildRetentionGameStateSnapshot(src = {}) {
  return {
    plantedUnwatered: src.plantedUnwatered || 0,
    openQuests: src.openQuests || 0,
    buildableHouse: !!src.buildableHouse,
  };
}
