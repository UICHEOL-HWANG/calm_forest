// =============================================================
//  calm forest · retention guidance — early-session rule router
//  -------------------------------------------------------------
//  The model is allowed to rescue rule-low users when a score is
//  supplied later, but the first implementation runs on client rules.
// =============================================================

export const DEFAULT_RETENTION_GUIDANCE = {
  enabled: true,
  endpoint: '',
  timeoutMs: 800,
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

const MODEL_AREA_RULES = [
  ['nature', /^(chop_tree|first_chop|plant_seed|water_crop|harvest_crop|dig_plot|weed_pull|pest_clear|use_fert|mine_ore|forage_pick|firefly_)/],
  ['fishing_sea', /^(fishing_|sea_|boat_)/],
  ['quest_social', /^(npc_talk|quest_accept|quest_complete|quest_offered|gift_)/],
  ['craft_home', /^(shop_|craft_|craft_item|place_decor|move_decor|store_decor|house_|cook_|cooking_|carve_)/],
  ['advanced', /^(mist_|museum_|cafe_|orchard_|fruit_|tree_|sapling_|worker_|dex_|album_|photo_)/],
];

export function eventFamily(name) {
  for (const [family, re] of FAMILY_RULES) {
    if (re.test(name)) return family;
  }
  return null;
}

function modelArea(name) {
  for (const [area, re] of MODEL_AREA_RULES) {
    if (re.test(name)) return area;
  }
  return null;
}

function trackingBucket(name) {
  if (/^(auth_|login_|guest_|save_load_|session_start|tutorial_start|intro_)/.test(name)) return 'entry_auth';
  if (/^(connect_ok|supabase_connect_ok|save_connect_ok)/.test(name)) return 'connect_ok';
  if (/^(connect_fail|supabase_connect_fail|save_connect_fail)/.test(name)) return 'connect_fail';
  if (/^(page_|screen_|visibility_|focus_|blur_|heartbeat_)/.test(name)) return 'other_tracking';
  return null;
}

export function isDeliberateEvent(name) {
  return ACTION_EVENTS.has(name);
}

export function createGuidanceCounters(startMs = Date.now()) {
  const familyCounts = Object.create(null);
  const areaCounts = Object.create(null);
  const trackingCounts = Object.create(null);
  const specificCounts = Object.create(null);
  const eventNames = new Set();
  const actionKinds = new Set();
  let tracked = 0;
  let actions = 0;

  function record(name) {
    if (!name || SYSTEM_EVENTS.has(name) || name.startsWith('retention_guidance_')) return null;
    tracked += 1;
    eventNames.add(name);
    const family = eventFamily(name);
    if (family) familyCounts[family] = (familyCounts[family] || 0) + 1;
    const area = modelArea(name);
    if (area) areaCounts[area] = (areaCounts[area] || 0) + 1;
    const bucket = trackingBucket(name);
    if (bucket) trackingCounts[bucket] = (trackingCounts[bucket] || 0) + 1;
    if (name === 'chop_tree' || name === 'first_chop') specificCounts.chop_tree = (specificCounts.chop_tree || 0) + 1;
    if (name === 'mine_ore') specificCounts.mine_ore = (specificCounts.mine_ore || 0) + 1;
    if (name === 'npc_talk') specificCounts.npc_talk = (specificCounts.npc_talk || 0) + 1;
    if (name.startsWith('tutorial_step')) specificCounts.tutorial_step = (specificCounts.tutorial_step || 0) + 1;
    if (name === 'quest_offered') specificCounts.quest_offered = (specificCounts.quest_offered || 0) + 1;
    if (name === 'session_summary') specificCounts.session_summary = (specificCounts.session_summary || 0) + 1;
    if (name.startsWith('econ_') || name === 'shop_sell' || name === 'shop_buy') specificCounts.econ_tx = (specificCounts.econ_tx || 0) + 1;
    if (name === 'zone_enter' || name.endsWith('_enter')) specificCounts.zone_enter = (specificCounts.zone_enter || 0) + 1;
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
      eventNameCount: eventNames.size,
      familyCounts: { ...familyCounts },
      areaCounts: { ...areaCounts },
      trackingCounts: { ...trackingCounts },
      specificCounts: { ...specificCounts },
      seenFamilies: Object.keys(familyCounts).filter(k => familyCounts[k] > 0),
    };
  }

  return { record, snapshot };
}

export function buildRetentionModelFeatures(snap = {}) {
  const areas = snap.areaCounts || {};
  const tracking = snap.trackingCounts || {};
  const specific = snap.specificCounts || {};
  return {
    early_tracked_events: snap.earlyTracked || 0,
    early_actions: snap.earlyActions || 0,
    early_action_kinds: snap.actionKinds || 0,
    early_area_count: Object.keys(areas).filter(k => areas[k] > 0).length,
    early_event_name_count: snap.eventNameCount || 0,
    early_ga_auto_events: 0,
    early_entry_auth_events: tracking.entry_auth || 0,
    early_connect_ok_events: tracking.connect_ok || 0,
    early_connect_fail_events: tracking.connect_fail || 0,
    early_other_tracking_events: tracking.other_tracking || 0,
    early_nature_events: areas.nature || 0,
    early_fishing_sea_events: areas.fishing_sea || 0,
    early_quest_social_events: areas.quest_social || 0,
    early_craft_home_events: areas.craft_home || 0,
    early_advanced_events: areas.advanced || 0,
    early_chop_tree_events: specific.chop_tree || 0,
    early_mine_ore_events: specific.mine_ore || 0,
    early_npc_talk_events: specific.npc_talk || 0,
    early_tutorial_step_events: specific.tutorial_step || 0,
    early_quest_offered_events: specific.quest_offered || 0,
    early_churn_score_events: 0,
    early_session_summary_events: specific.session_summary || 0,
    early_session_time_events: 0,
    early_econ_tx_events: specific.econ_tx || 0,
    early_zone_enter_events: specific.zone_enter || 0,
  };
}

export function classifyGuidance(counters, opts = {}) {
  const cfg = { ...DEFAULT_RETENTION_GUIDANCE, ...opts };
  const tracked = counters.earlyTracked || 0;
  const actions = counters.earlyActions || 0;
  const score = typeof counters.modelScore === 'number' ? counters.modelScore : null;
  const modelThreshold = typeof counters.modelThreshold === 'number' ? counters.modelThreshold : cfg.modelThreshold;

  if (tracked >= cfg.highTracked && actions >= cfg.highActions) {
    return { eligible: true, segment: 'next_content', reason: 'rule_high_play' };
  }
  if (tracked >= cfg.highTracked && actions < cfg.highActions) {
    return { eligible: true, segment: 'first_action_help', reason: 'rule_high_low_action' };
  }
  if (score != null && score >= modelThreshold) {
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
      // 📜 퀘스트 패널은 화면 왼쪽(left:16px)에 늘 떠 있다. 의뢰 목표가 7종이라
      //    본문에서 특정 행동을 짚을 수 없으니, 이미 보이는 곳을 가리킨다.
      line: '왼쪽 📜 에 무엇을 하면 되는지 적혀 있어요.',
    };
  }
  if (gs.buildableHouse) {
    return {
      kind: 'house_build',
      targetFamily: 'house',
      ico: '🏠',
      title: '집을 손볼 수 있어요',
      line: '재료가 모였어요. 집터에서 바로 시작하면 돼요.',
    };
  }

  const seen = new Set(counters.seenFamilies || []);
  if (decision.segment === 'next_content') {
    const candidates = [
      ['sea_boat', { kind: 'sea_boat', targetFamily: 'sea_boat', ico: '🎣', title: '물가 쪽도 열려 있어요', line: '낚시나 바다터에서 짧게 하나 해볼까요.' }],
      ['mist', { kind: 'mist', targetFamily: 'mist', ico: '🌫️', title: '안개 숲도 둘러볼까요', line: '등불을 따라가면 정령을 만나요.' }],
      ['museum', { kind: 'museum', targetFamily: 'museum', ico: '🏛️', title: '모은 것들을 확인해볼까요', line: '박물관에서 도감 진행을 한 번 볼 수 있어요.' }],
      ['cafe', { kind: 'cafe', targetFamily: 'cafe', ico: '☕', title: '카페 일도 해볼까요', line: '손님 주문을 하나만 받아봐도 좋아요.' }],
      ['orchard', { kind: 'orchard', targetFamily: 'orchard', ico: '🌳', title: '과수원도 살펴볼까요', line: '나무를 심고 돌볼 수 있어요.' }],
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
      // ⌨️ 조작 안내는 PC/터치를 나눈다 — index.html 의 TOUCH ? '(액션)' : '(Space)' 와 같은 규칙.
      //    i18n 은 통문장 사전 매칭이라 {0} 슬롯 대신 두 문장을 각각 등재한다(" · " 글루 함정 회피).
      line: gs.touch
        ? '나무, 주민, 밭처럼 바로 앞에 있는 것에 다가가 액션 버튼을 눌러보세요.'
        : '나무, 주민, 밭처럼 바로 앞에 있는 것에 다가가 Space 를 눌러보세요.',
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

  async function fetchModelPrediction(snap, trigger) {
    if (deps.modelScore) {
      const score = await deps.modelScore(snap, trigger);
      return typeof score === 'number' ? { score, rawFeatures: buildRetentionModelFeatures(snap) } : null;
    }
    if (!cfg.endpoint || typeof fetch !== 'function') return null;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller && cfg.timeoutMs > 0
      ? setTimer(() => controller.abort(), cfg.timeoutMs)
      : null;
    const identity = typeof deps.identity === 'function' ? deps.identity() : (deps.identity || {});
    const rawFeatures = buildRetentionModelFeatures(snap);
    try {
      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller?.signal,
        body: JSON.stringify({
          features: rawFeatures,
          trigger,
          session_id: identity.sessionId || identity.session_id || 'unknown',
          client_id: identity.clientId || identity.client_id || 'unknown',
          variant: identity.variant || 'control',
          platform: snap.platform || identity.platform || undefined,
          policy_version: cfg.policyVersion || 'retention-guidance-rules-2026-09-18',
        }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      return {
        score: typeof body.score === 'number' ? body.score : null,
        threshold: typeof body.threshold === 'number' ? body.threshold : null,
        modelVersion: body.model_version || 'none',
        modelBand: body.score_band || 'none',
        modelEligible: !!body.eligible,
        rawFeatures,
      };
    } catch (e) {
      return null;
    } finally {
      if (timeout) clearTimer(timeout);
    }
  }

  function persistScoreSnapshot(trigger, snap, decision, extra = {}) {
    if (!deps.persistScore) return;
    const rawFeatures = snap.modelFeatures || buildRetentionModelFeatures(snap);
    const row = {
      policy_version: cfg.policyVersion || 'retention-guidance-rules-2026-09-18',
      trigger,
      rule_segment: decision.segment,
      reason: decision.reason,
      final_eligible: extra.finalEligible ?? !!decision.eligible,
      suppressed_reason: extra.suppressedReason || null,
      selected_kind: extra.selectedKind || null,
      target_family: extra.targetFamily || null,
      model_score: typeof snap.modelScore === 'number' ? snap.modelScore : null,
      model_threshold: typeof snap.modelThreshold === 'number' ? snap.modelThreshold : null,
      model_version: snap.modelVersion || 'none',
      model_band: snap.modelBand || 'none',
      model_eligible: !!snap.modelEligible,
      raw_features: rawFeatures,
    };
    try {
      const r = deps.persistScore(row);
      if (r?.catch) r.catch(() => {});
    } catch (e) {}
  }

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
      model_threshold: typeof snap.modelThreshold === 'number' ? snap.modelThreshold : undefined,
      model_version: snap.modelVersion,
      model_band: snap.modelBand,
      platform: snap.platform,
    };
  }

  async function run(trigger = 'timer') {
    if (!cfg.enabled) return null;
    const snap = counters.snapshot(now());
    if (deps.platform) snap.platform = typeof deps.platform === 'function' ? deps.platform() : deps.platform;
    const model = await fetchModelPrediction(snap, trigger);
    if (model) {
      if (typeof model.score === 'number') snap.modelScore = model.score;
      if (typeof model.threshold === 'number') snap.modelThreshold = model.threshold;
      snap.modelVersion = model.modelVersion;
      snap.modelBand = model.modelBand;
      snap.modelEligible = model.modelEligible;
      snap.modelFeatures = model.rawFeatures;
    }

    const decision = classifyGuidance(snap, cfg);
    deps.track?.('retention_guidance_eligible', commonPayload(trigger, snap, decision));

    const suppressed = deps.suppress?.() || null;
    const suppressedReason = suppressed
      || (shownCount >= cfg.maxPerSession ? 'max_per_session' : (now() - lastShownAt < cfg.cooldownMs ? 'cooldown' : undefined));
    if (!decision.eligible || suppressed || shownCount >= cfg.maxPerSession || now() - lastShownAt < cfg.cooldownMs) {
      persistScoreSnapshot(trigger, snap, decision, { suppressedReason, finalEligible: false });
      deps.track?.('retention_guidance_decision', {
        ...commonPayload(trigger, snap, decision),
        eligible: decision.eligible,
        selected_kind: null,
        suppressed_reason: suppressedReason,
      });
      return null;
    }

    const gs = typeof deps.gameState === 'function' ? deps.gameState() : (deps.gameState || {});
    const banner = pickGuidanceBanner(decision, snap, gs);
    if (!banner) return null;
    persistScoreSnapshot(trigger, snap, decision, {
      finalEligible: true,
      selectedKind: banner.kind,
      targetFamily: banner.targetFamily,
    });

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
      timers.push(setTimer(() => { run(`t${sec}`).catch(() => {}); }, sec * 1000));
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
