import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scanEventNames } from './event-names.mjs';
import { parseCsv, csvCell } from './csv.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'docs/analysis/event-taxonomy.csv');
const DESCRIPTIONS = join(ROOT, 'tools/amplitude/descriptions.json');
const LAST_DAY = '20261024';
const ACTIVE_WINDOW_DAYS = 14;

const GA4_AUTO_KEYS = new Set([
  'ga_session_id', 'ga_session_number', 'page_location', 'page_title', 'page_referrer',
  'engagement_time_msec', 'session_engaged', 'engaged_session_event', 'batch_page_id',
  'batch_ordering_id', 'ignore_referrer', 'entrances', 'term', 'medium', 'source',
  'campaign', 'gclid', 'percent_scrolled', 'link_url', 'link_domain', 'link_classes',
  'link_id', 'outbound', 'firebase_conversion', 'debug_mode', 'synthetic_bundle',
  'unique_search_term', 'search_term', 'content', 'firebase_screen_class', 'ts', 'platform',
]);

const NORTH_STAR = new Set([
  'harvest_crop', 'coop_collect', 'honey_collect', 'fishing_catch', 'sea_catch', 'firefly_catch',
  'forage_pick', 'mine_ore', 'craft_item', 'craft_claim', 'cooking_result', 'cafe_serve',
  'carve_result', 'quest_complete', 'star_result', 'duel_result',
]);

const FUNNEL = new Set([
  'first_visit', 'intro_start', 'intro_complete', 'intro_skip', 'login_screen', 'login',
  'email_login', 'character_select', 'nickname_set', 'tutorial_start', 'tutorial_step',
  'tutorial_complete', 'tutorial_skip', 'first_chop', 'install_survey', 'quest_offered',
  'quest_accept', 'story_chapter_start', 'story_chapter_complete',
]);

const SYSTEM = new Set([
  'session_summary', 'session_time', 'churn_score', 'retention_guidance_eligible',
  'retention_guidance_decision', 'retention_guidance_outcome', 'perf_sample', 'mp_probe',
  'weather_day', 'weather_event', 'rain_day', 'install_attribution', 'traffic_source',
  'recommendation_impression', 'cafe_guests_generated', 'worker_offline',
  'session_expired', 'neighbor_load_fail', 'fruit_capped', 'cash_grant_wait', 'dex_gate_blocked',
  'ga_param_overflow', 'save_apply_misuse',
]);

const UI = new Set([
  'zone_enter', 'near_pill_tap', 'tool_auto', 'quest_panel_toggle', 'settings_open',
  'lang_toggle', 'map_opened', 'diary_open', 'privacy_open', 'terms_open', 'refund_open',
  'delete_account_open', 'delete_account', 'decor_banner', 'neighbor_banner', 'camera_adjust',
  'camera_reset', 'craft_ready_notice', 'retention_guidance_show', 'retention_guidance_dismiss',
  'retention_guidance_click', 'push_open',
]);

const RULES = [
  [/^(page_view|scroll|session_start|first_visit|user_engagement|click)$/, 'ga4_auto', 'ga4'],
  [n => SYSTEM.has(n), 'system', 'ops'],
  [/^save_/, 'system', 'save'],
  [/^(exp_exposure|e1_intro|app_banner_holdout)$/, 'experiment', 'experiment'],
  [/^(cash_|paddle_|premium_|bundle_)/, 'monetization', 'cash_store'],
  [/^login_store_/, 'onboarding', 'app_store_badge'],
  [/^(intro_|tutorial_)/, 'onboarding', 'intro_tutorial'],
  [/^(login|login_screen|login_nudge|login_nudge_click|email_login|toss_connect|pgs_connect|gc_connect|apple_connect|guest_migrate|deferred_guest)$/, 'onboarding', 'login'],
  [/^inapp_/, 'onboarding', 'inapp_browser'],
  [/^(character_select|nickname_|first_chop|install_survey|starter_bed)/, 'onboarding', 'first_setup'],
  [n => UI.has(n), 'ui', 'ui'],
  [/^(hud_menu_|tool_wheel_|guide_|notice_|app_banner_|push_)/, 'ui', 'ui'],
  [/^(tree_water|tree_mature|tree_chop)$|^(orchard_|sapling_|sap_select|fruit_)/, 'farming', 'orchard'],
  [/^tree_/, 'progression', 'world_tree'],
  [/^(chop_tree|water_crop|plant_seed|harvest_crop|dig_plot|dig_expire|weed_pull|seed_select|use_fert|enter_farm|exit_farm|farm_expand|pest_spawn|pest_clear|craft_station_build)$/, 'farming', 'farm'],
  [/^(coop_|honey_)/, 'farming', 'coop_bee'],
  [/^(worker_|hireboard_|warehouse_)/, 'farming', 'farm_worker'],
  [/^(mine_ore|enter_mine|exit_mine|gem_fog_hint)$/, 'gathering', 'mine'],
  [/^(fishing_|use_bait)/, 'gathering', 'fishing'],
  [/^sea_/, 'gathering', 'sea'],
  [/^firefly_/, 'gathering', 'firefly'],
  [/^forage_/, 'gathering', 'forage'],
  [/^pond_/, 'gathering', 'pond'],
  [/^(visitor_|habitat_)/, 'gathering', 'habitat_visitor'],
  [/^(cooking_|cook_|kitchen_|free_pot_)/, 'crafting', 'kitchen'],
  [/^(cafe_|enter_cafe|exit_cafe)/, 'crafting', 'cafe'],
  [/^carve_/, 'crafting', 'carving'],
  [/^(craft_|tool_tier2_)/, 'crafting', 'craft'],
  [/^aura_/, 'crafting', 'light_workshop'],
  [/^(minigame_abandon)$/, 'content', 'minigame'],
  [/^mist_/, 'content', 'mist_forest'],
  [/^(star_|observatory_)/, 'content', 'observatory'],
  [/^(duel_|night_)/, 'content', 'night_guest'],
  [/^(boat_|ferry_quiz_)/, 'content', 'boat'],
  [/^mirror_/, 'content', 'mirror_village'],
  [/^dream_/, 'content', 'dream_forest'],
  [/^(mountain_|sled_|hut_)/, 'content', 'mountain'],
  [/^(delve_|pest_meet|pest_counter)/, 'content', 'cave_delve'],
  [/^hw_/, 'content', 'halloween'],
  [/^plaza_/, 'content', 'harvest_plaza'],
  [/^museum_/, 'content', 'museum'],
  [/^bridge_/, 'progression', 'story'],
  [/^(econ_tx|shop_|merchant_|lucky_box|daily_bonus|decor_buy_|outdoor_buy_|house_addon_buy|pet_buy|cosmetic_buy)/, 'economy', 'economy'],
  [/^pet_/, 'decor', 'pet'],
  [/^(pick_|move_|place_|store_)(decor|outdoor)$|^decor_/, 'decor', 'decor'],
  [/^(house_|enter_house|exit_house)/, 'decor', 'house'],
  [/^(cosmetic_|color_unlock|character_change|char_tab)/, 'decor', 'wardrobe'],
  [/^(photo_|album_)/, 'decor', 'photo'],
  [/^(quest_|owl_special_|cos_quest|hidden_quest_)/, 'progression', 'quest'],
  [/^story_/, 'progression', 'story'],
  [/^(dex_|badge_|unlock$|season_start_seen|map_locked|sleep$)/, 'progression', 'progression'],
  [/^(npc_talk|npc_chat)/, 'social', 'npc_talk'],
  [/^(neighbor|village_public_toggle)/, 'social', 'neighbor'],
  [/^(gift_give|invite_|referral_)/, 'social', 'invite'],
  [/^(leaderboard_open|feedback_submit)$/, 'social', 'community'],
];

const TIER_OVERRIDE = {
  econ_tx: 3,
  tool_auto: 3,
  zone_enter: 1,
  retention_guidance_show: 1,
  retention_guidance_click: 1,
  habitat_meter: 1,
};

function readBq(path) {
  return new Map(parseCsv(readFileSync(path, 'utf8')).map(o => [o.event_name, o]));
}

function classify(name) {
  for (const [test, category, feature] of RULES) {
    const hit = typeof test === 'function' ? test(name) : test.test(name);
    if (hit) return { category, feature, matched: true };
  }
  return { category: 'unclassified', feature: '', matched: false };
}

function tierOf(name, category) {
  if (TIER_OVERRIDE[name]) return TIER_OVERRIDE[name];
  if (category === 'ga4_auto' || category === 'system') return 3;
  if (NORTH_STAR.has(name) || FUNNEL.has(name)) return 1;
  if (category === 'monetization' || category === 'experiment') return 1;
  return 2;
}

const dayNum = d => Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8)) / 86400000;
const iso = d => (d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : '');

function statusOf(bq, inCode, category) {
  if (category === 'ga4_auto') return 'auto';
  if (!bq) return inCode ? 'not_fired' : 'unknown';
  if (!inCode) return 'retired';
  return dayNum(LAST_DAY) - dayNum(bq.last_day) <= ACTIVE_WINDOW_DAYS ? 'active' : 'dormant';
}

function customKeys(bq) {
  if (!bq?.param_keys) return '';
  return bq.param_keys.split('|').filter(k => k && !GA4_AUTO_KEYS.has(k)).join('|');
}

function readDescriptions() {
  try { return JSON.parse(readFileSync(DESCRIPTIONS, 'utf8')); } catch { return {}; }
}

export function buildRows(bqPath, root = ROOT) {
  const bq = readBq(bqPath);
  const desc = readDescriptions();
  const code = scanEventNames(root);
  const names = [...new Set([...bq.keys(), ...code.keys()])].sort();
  return names.map(name => {
    const b = bq.get(name);
    const c = code.get(name);
    const { category, feature, matched } = classify(name);
    const tier = matched ? tierOf(name, category) : '';
    const status = statusOf(b, Boolean(c), category);
    const review = matched ? '' : '분류 규칙 없음';
    return {
      event_name: name, category, feature, tier,
      north_star: NORTH_STAR.has(name) ? 'Y' : 'N',
      status,
      n_total: b?.n ?? 0, devices: b?.devices ?? 0,
      first_day: iso(b?.first_day), last_day: iso(b?.last_day),
      custom_keys: customKeys(b),
      code_line: c?.line ?? '',
      description_draft: (desc[name] || c?.comment || '').replace(/\s*—\s*/g, '. '),
      review,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bqPath = process.argv[2];
  if (!bqPath) { console.error('usage: node tools/amplitude/build-taxonomy.mjs <ga4_events_full.csv>'); process.exit(1); }
  const rows = buildRows(bqPath);
  const cols = Object.keys(rows[0]);
  writeFileSync(OUT, [cols.join(','), ...rows.map(r => cols.map(k => csvCell(r[k])).join(','))].join('\n') + '\n');
  const count = (k) => rows.reduce((a, r) => ({ ...a, [r[k]]: (a[r[k]] || 0) + 1 }), {});
  console.log(`rows ${rows.length} → ${OUT}`);
  console.log('tier', count('tier'));
  console.log('status', count('status'));
  console.log('category', count('category'));
}
