// =============================================================
//  🌙 꿈의 숲 — 침대에서 꿈꾸기 → 초승달 마차 → 떠 있는 섬에서 ✨ 꿈 조각 → 구름 침대에서 깨어나기
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-08-dream-forest-design.md
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 의 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x).
//  ▶ 좌표 규칙은 js/dream/layout.js(로컬) — 월드 = DREAM + 로컬. 조형 js/dream/art.js · 컷신 js/dream/cutscene.js
//  ▶ 트래킹(스펙 §10): dream_prompt_shown · dream_choice · dream_cutscene_end · dream_enter · dream_shard ·
//    dream_wake · dream_hint · (decor_buy_shard 는 js/spaces/indoor.js placeDecor)
// =============================================================
import {
  $w, atDream, camera, dist2D, doSleep, firstHintBanner, gameState, handAnchor, houseFloor, indoor, isNight, player,
  playerAnchor, refreshInventoryUI, requestSave, scene, setFogExempt, setSpaceVisible, snapCamera, solidBox,
  spawnFloatText, spawnSparkle, todayStr, ui, wakeToMorning,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { trackEvent } from '../analytics.js';
import { DREAM } from '../data/places.js';
import { CLOUD_BED, LANDING, SHARDS_PER_DAY, SHARD_PICK_R, ISLANDS, clampWalkable, islandOf, normalizeDream, shardsLeft, spotOf } from '../dream/layout.js';
import { buildDreamWorld } from '../dream/art.js';
import { startDreamCut } from '../dream/cutscene.js';
import { houseExitPoint } from './house.js';
import { stopDecorPlacing } from './indoor.js';
import { Sound, setBGMTheme } from '../sound.js';

const BED_REACH = 2.1;   // 구름 침대 중심에서 이 거리 안이면 "깨어나기"
let world = null;        // buildDreamWorld() 결과 — 처음 꿈꿀 때 짓는다(첫 로딩에 얹지 않는다)
let cut = null;          // 진행 중인 컷신
let ret = null;          // 돌아갈 자리 { x, y, z, floor, indoor }
let arrivedAt = 0;       // 도착 시각(performance.now) — elapsed_s
let visitShards = 0;     // 이번 꿈에서 주운 수
let lastHud = '';

const nowS = () => Math.round((performance.now() - arrivedAt) / 100) / 10;

function ensureWorld() {
  if (world) return world;
  world = buildDreamWorld();
  world.group.position.set(DREAM.x, 0, DREAM.z);
  world.group.visible = false;
  scene.add(world.group);
  // 🛏️ 구름 침대는 밟고 지나가지 않게 — 옆에 서야 "깨어나기"가 뜬다
  solidBox(DREAM.x + CLOUD_BED.x - 0.85, DREAM.z + CLOUD_BED.z - 1.2, DREAM.x + CLOUD_BED.x + 0.85, DREAM.z + CLOUD_BED.z + 1.2);
  return world;
}

/** 오늘 기준으로 정리한 dream 상태(날이 바뀌면 got 이 비워진다) — 항상 이걸로 읽는다 */
export function dreamState() {
  gameState.dream = normalizeDream(gameState.dream, todayStr());
  return gameState.dream;
}
export function dreamLeftToday() { return shardsLeft(dreamState(), todayStr()).length; }

/** setSpaceVisible() 에서 부른다 */
export function setDreamVisible(on) { if (world) world.group.visible = on; }

// ── 💤/🌙 선택 창 ───────────────────────────────────────────
export function openSleepChoice() {
  if (!isNight()) return doSleep();   // 낮이면 doSleep 이 안내 토스트를 띄운다
  const d = dreamState(), left = dreamLeftToday(), first = d.visits === 0;
  trackEvent('dream_prompt_shown', { visit_n: d.visits, left_today: left });
  ui.openDreamChoice?.({
    first, left,
    onSleep() { trackEvent('dream_choice', { choice: 'sleep', first: +first, left_today: left }); doSleep(); },
    onDream() { trackEvent('dream_choice', { choice: 'dream', first: +first, left_today: left }); startDream(); },
    onCancel() { trackEvent('dream_choice', { choice: 'cancel', first: +first, left_today: left }); },
  });
}

/** 🛏️ 밤에 꿈을 안 꿔 본 사람이 침대 옆에 오면 한 번 — js/spaces/doors.js 침대 프롬프트에서 부른다 */
export function dreamNightHint() {
  if (dreamState().visits > 0) return;
  if (firstHintBanner('dreamNight', '🌙', '꿈꾸기', '밤엔 침대에서 꿈의 숲에 갈 수 있어요')) trackEvent('dream_hint', { step: 'night' });
}

// ── 들어가기(컷신) ───────────────────────────────────────────
export function startDream() {
  if (cut || atDream) return;
  ensureWorld();
  const first = dreamState().visits === 0;
  $w.sleeping = true;   // 이동·액션·앉기·도구 전환 잠금(game.js 의 자기 잠금을 그대로 쓴다)
  stopDecorPlacing(true);
  $w.sitting = false;
  if (handAnchor) handAnchor.visible = false;   // 마차에선 도구를 숨긴다(프롤로그와 같은 이유)
  Sound.blip();
  ui.setDreamSkip?.(true);
  cut = startDreamCut({
    first,
    hooks: {
      fade: (a) => ui.sleepFade?.(a, 'dream'),
      caption: (text) => ui.dreamCaption?.(text),
      teleport: enterDreamSpace,
      land: arrive,
      camera, player, playerAnchor, carriage: world.carriage,
    },
  });
}

export function dreamCutActive() { return !!cut; }
export function skipDreamCut() { if (cut) cut.skip(); }
/** 루프에서 매 프레임 — 컷신 중이면 true(카메라·입력은 컷신 몫) */
export function updateDreamCut(dt, t) {
  if (!cut) return false;
  cut.update(dt);
  world?.update(t);
  return true;
}

function enterDreamSpace() {
  ret = { x: player.position.x, y: player.position.y, z: player.position.z, floor: houseFloor, indoor };
  $w.indoor = false; ui.setIndoor?.(false); setFogExempt(player, false);
  $w.atDream = true;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastDoorPrompt = null;
  const d = dreamState();
  d.visits += 1;
  refreshShards();
  setSpaceVisible();
  setBGMTheme('dream');
}

function arrive({ skipped, atS, short }) {
  cut = null;
  ui.setDreamSkip?.(false);
  player.position.set(DREAM.x + LANDING.x, 0, DREAM.z + LANDING.z);
  player.rotation.y = Math.atan2(-LANDING.x, -LANDING.z);   // 섬 한가운데를 본다
  playerAnchor.position.y = 0;
  if (handAnchor) handAnchor.visible = true;
  snapCamera();
  arrivedAt = performance.now(); visitShards = 0; lastHud = '';
  setTimeout(() => { $w.sleeping = false; }, 300);   // 암전이 걷히는 동안 연타가 새지 않게
  const d = dreamState(), left = dreamLeftToday();
  trackEvent('dream_cutscene_end', { skipped: +skipped, at_s: atS, short: +short });
  trackEvent('dream_enter', { visit_n: d.visits, left_today: left });
  syncHud();
  if (!gameState.hintsSeen.dreamArrive) {
    gameState.hintsSeen.dreamArrive = true;
    ui.showDreamArrive?.();
    trackEvent('dream_hint', { step: 'arrive' });
  }
  requestSave();
}

// ── 안에서 ───────────────────────────────────────────────────
function refreshShards() {
  if (!world) return;
  const left = new Set(shardsLeft(dreamState(), todayStr()));
  for (const [id, g] of world.shards) g.visible = left.has(id);
}

function syncHud() {
  const d = dreamState(), key = `${d.got.length}`;
  if (key === lastHud) return;
  lastHud = key;
  // 상태는 컨텍스트 슬롯(zone-prompt)에 — 모바일 3단 레이아웃 규칙(안내는 슬롯·프롬프트 줄에만), 🌫️ 안개 숲과 같은 자리
  ui.setZoneHint?.(`🌙 꿈의 숲 · ✨ ${d.got.length}/${SHARDS_PER_DAY}`);
  $w.lastZoneHint = 'dream';
}

/** 루프에서 매 프레임 — 꿈속이 아니면 아무것도 안 한다 */
export function updateDream(dt, t) {
  if (!atDream || !world || cut) return;
  world.update(t);
  const lx = player.position.x - DREAM.x, lz = player.position.z - DREAM.z;
  for (const [id, g] of world.shards) {
    if (!g.visible) continue;
    const s = spotOf(id);
    if (Math.hypot(lx - s.x, lz - s.z) < SHARD_PICK_R) collect(id, g);
  }
}

function collect(id, g) {
  const d = dreamState();
  g.visible = false;
  // 꿈속에서 자정을 넘기면 화면엔 어제 자리가 남아 있다 — 오늘 자리가 아니면 줍지 않는다(인벤토리만 늘고 got 엔 안 남는 어긋남 방지)
  if (!shardsLeft(d, todayStr()).includes(id)) return;
  d.got.push(id); d.total += 1; visitShards += 1;
  gameState.inventory.shard = (gameState.inventory.shard || 0) + 1;
  refreshInventoryUI();
  const wx = DREAM.x + g.position.x, wz = DREAM.z + g.position.z;
  spawnSparkle(wx, 1.0, wz, 20);
  spawnFloatText(wx, 1.6, wz, '+1 ✨', '#8f7ad6');
  Sound.starPick?.();
  trackEvent('dream_shard', { shard_id: id, island: islandOf(id), nth_today: d.got.length, elapsed_s: nowS() });
  if (firstHintBanner('dreamShard', '✨', '꿈 조각', '구름 침대에 누우면 아침에 깨어나요')) trackEvent('dream_hint', { step: 'shard' });
  if (d.got.length >= SHARDS_PER_DAY) ui.toast?.('오늘 꿈 조각은 다 모았어요 · 내일 또 와요', 2600);
  syncHud();
  requestSave();
}

/** doors.js updateDoorInteract 에서 — { nd, prompt } */
export function dreamPrompt() {
  if (dist2D({ x: DREAM.x + CLOUD_BED.x, z: DREAM.z + CLOUD_BED.z }, player.position) < BED_REACH) return { nd: 'dreamwake', prompt: '🛏️ 구름 침대 · 깨어나기' };
  const left = dreamLeftToday();
  return { nd: null, prompt: left > 0 ? `✨ 반짝이는 조각을 찾아보세요 · ${left}개 남음` : '🛏️ 구름 침대에서 깨어나요' };
}

/** handleAction 에서 — 꿈속에선 깨어나기 말고 다른 액션이 없다 */
export function dreamAction(nd) {
  if (nd === 'dreamwake') wakeUp();
}

/** 걸을 수 있는 곳(섬 ∪ 다리) 안으로 — updatePlayer 이동 한계 */
export function clampToDream(pos) {
  const c = clampWalkable(pos.x - DREAM.x, pos.z - DREAM.z);
  pos.x = DREAM.x + c.x; pos.z = DREAM.z + c.z;
}

// ── 깨어나기 ─────────────────────────────────────────────────
function wakeUp() {
  if (!atDream || cut) return;
  $w.sleeping = true;
  ui.sleepFade?.(1, 'dream');
  Sound.blip();
  const elapsed = nowS(), shards = visitShards;
  setTimeout(() => {
    $w.atDream = false;
    const back = ret || { ...houseExitPoint(), y: 0, floor: 0, indoor: false };
    $w.indoor = back.indoor; $w.houseFloor = back.floor;
    ui.setIndoor?.(back.indoor); setFogExempt(player, back.indoor);
    player.position.set(back.x, back.y || 0, back.z);
    ret = null;
    ui.setZoneHint?.(null); $w.lastZoneHint = null;
    setSpaceVisible(); snapCamera();
    setBGMTheme('main');
    wakeToMorning();   // timeOfDay = WAKE_TIME + 저장(doSleep 과 같은 결과)
    trackEvent('dream_wake', { via: 'bed', shards, elapsed_s: elapsed, left_today: dreamLeftToday() });
    ui.sleepFade?.(0, 'dream');
    ui.toast?.(shards > 0 ? `☀️ 잘 잤어요 · 꿈 조각 ✨${shards}개` : '☀️ 잘 잤어요. 아침이에요', 2600);
    setTimeout(() => {
      $w.sleeping = false;
      if (firstHintBanner('dreamWake', '✨', '꿈 장식', '🛋️ 꾸미기에서 꿈 조각으로 바꿔요')) trackEvent('dream_hint', { step: 'wake' });
    }, 700);
  }, 750);
}

/** getGameState — 꿈속에서 저장되면 집 앞에서 아침으로 이어진다(z=-550 을 적으면 새로고침 때 마을 밖으로 튄다) */
export function dreamReturnPos() {
  const p = houseExitPoint();
  return { x: p.x, z: p.z };
}

/** 미니맵 — 중심·반경과 표시(섬 · 구름 침대 = 나가는 곳 · 남은 조각) */
export const DREAM_MAP = Object.freeze({ cx: DREAM.x + 4, cz: DREAM.z - 6, half: 24 });
export function dreamMinimapMarks(marks) {
  for (const i of ISLANDS) marks.push({ x: DREAM.x + i.x, z: DREAM.z + i.z, c: '#cbbdf2', r: i.r * 1.6 });
  marks.push({ x: DREAM.x + CLOUD_BED.x, z: DREAM.z + CLOUD_BED.z, c: '#9ecbff', kind: 'exit' });
  if (!world) return;
  for (const [id, g] of world.shards) if (g.visible) { const s = spotOf(id); marks.push({ x: DREAM.x + s.x, z: DREAM.z + s.z, c: '#ffd86b', r: 2.4 }); }
}
