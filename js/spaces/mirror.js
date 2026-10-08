// =============================================================
//  🪞 거울 마을 — 낮에 🚏 정류장 → 초승달 마차 → 🪞 거울 문 → 색 반전 마을에서 보색 쌍둥이 주민의 잃어버린 물건 찾기
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-08-mirror-village-design.md
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만. let 쓰기는 `$w.x = …`.
//  ▶ 좌표 js/mirror/layout.js(로컬, 월드 = MIRROR + 로컬) · 의뢰 quests.js · 문장 clues.js · 조형 art.js · 연출 ride.js
//  ▶ 트래킹은 js/mirror/track.js 의 T.* 만(스펙 §8 11종 — trackEvent 직접 호출 금지, tests/mirror-track.test.mjs 가 잠금)
// =============================================================
import {
  $w, atMirror, camera, dist2D, firstHintBanner, gameState, handAnchor, isNight, makeNameTag, player, playerAnchor,
  refreshInventoryUI, requestSave, scene, setSpaceVisible, snapCamera, solidBox, spawnFloatText, spawnSparkle, todayStr, ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { trackEvent } from '../analytics.js';
import { MIRROR, MIRROR_STOP } from '../data/places.js';
import { NPCS } from '../data/npcs.js';
import { buildNPCFigure } from './npc.js';
import {
  LANDMARKS, NPC_SPOTS, SOLIDS, MIRROR_LANDING, MIRROR_STOP_LOCAL, MIRROR_PARK, MIRROR_GATE_LOCAL, STOP_REACH, PICK_R, TALK_R,
  VILLAGE_BOARD, VILLAGE_PARK, LAKE_GATE, clampWalkable, spotOf,
} from '../mirror/layout.js';
import { QUESTS_PER_DAY, normalizeMirror, questAt, rewardFor } from '../mirror/quests.js';
import { clueText, clueShort, hintText, npcName } from '../mirror/clues.js';
import { buildMirrorWorld, invertColor, makeStopShelter, makeMirrorGate, mirrorizeFigure } from '../mirror/art.js';
import { makeMoonCarriage } from '../dream/art.js';
import { startRide } from '../mirror/ride.js';
import { T, bindTracker } from '../mirror/track.js';
import { Sound, setBGMTheme } from '../sound.js';
import { getLang } from '../i18n.js';
import * as THREE from 'three';

// 로컬에선 파라미터가 엇나가면 바로 터지게(strict), 운영에선 경고만
bindTracker(trackEvent, { strict: ['localhost', '127.0.0.1'].includes(location.hostname) });

const HINT_AFTER_S = 30;
const TWIN_IDS = ['farmer', 'angler', 'chef'];   // NPC_SPOTS 순서와 같다
let world = null, carriage = null, shelter = null, gateLake = null, gateMirror = null, twins = [];
let ride = null;            // 진행 중 연출
let active = null;          // 단서를 들은 의뢰 { q, heardAt, hinted, hintShown } — 저장하지 않는다(스펙 §6)
let arrivedAt = 0, lastHud = '', lastDay = '', stopShownKey = null;
// 힌트 쓴 의뢰 'day:n' — active 는 귀환 때 지워지지만 감점은 남아야 한다(다시 타고 와서 +3 받는 구멍)
const hintUsed = new Set();
const hintKey = (q) => `${todayStr()}:${q.n}`;
const lang = () => (getLang() === 'en' ? 'en' : 'ko');   // i18n.js 가 언어의 단일 출처(document lang 은 쓰지 않는다)
const secs = (from) => Math.round((performance.now() - from) / 100) / 10;
const W = (l) => ({ x: MIRROR.x + l.x, z: MIRROR.z + l.z });

/** 머리 위 💬 — 다음 의뢰를 줄 주민만 보인다 */
function bubbleSprite() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.roundRect(8, 10, 80, 62, 18); x.fill();
  x.font = '44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('💬', 48, 42);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  s.scale.set(0.8, 0.8, 0.8); s.position.y = 2.95; s.visible = false;
  return s;
}

function ensureWorld() {
  if (world) return world;
  world = buildMirrorWorld();
  world.group.position.set(MIRROR.x, 0, MIRROR.z);
  world.group.visible = false;
  scene.add(world.group);
  for (const b of SOLIDS) solidBox(MIRROR.x + b.x1, MIRROR.z + b.z1, MIRROR.x + b.x2, MIRROR.z + b.z2);
  // 보색 쌍둥이 — 실제 주민 몸 그대로, 색만 뒤집는다(시안 residents.html v=2 확정)
  twins = TWIN_IDS.map((id, i) => {
    const def = NPCS.find(d => d.id === id);
    const { group } = buildNPCFigure(def);
    mirrorizeFigure(group);
    const s = NPC_SPOTS[i]; group.position.set(s.x, 0, s.z); group.rotation.y = s.ry;
    const tag = makeNameTag({ ...def, name: npcName(id, lang()), color: invertColor(def.color) });
    tag.position.y = 2.25; group.add(tag);
    const bubble = bubbleSprite(); group.add(bubble);
    world.npcAnchors[i].add(group);
    return { id, group, spot: s, bubble };
  });
  gateMirror = makeMirrorGate();
  gateMirror.group.position.set(MIRROR.x + MIRROR_GATE_LOCAL.x, MIRROR_GATE_LOCAL.y, MIRROR.z + MIRROR_GATE_LOCAL.z);
  scene.add(gateMirror.group);
  return world;
}
/** 마을 쪽 — 정박 마차와 호수 거울 문(처음 낮에 마을을 돌 때 지어진다) */
function ensureVillageSide() {
  if (carriage) return;
  carriage = makeMoonCarriage(); carriage.name = 'mirrorCarriage';
  carriage.position.set(VILLAGE_PARK.x, 0, VILLAGE_PARK.z); carriage.rotation.y = VILLAGE_PARK.heading;
  scene.add(carriage);
  gateLake = makeMirrorGate(); gateLake.group.position.set(LAKE_GATE.x, LAKE_GATE.y, LAKE_GATE.z);
  scene.add(gateLake.group);
  // 🚏 마을 정류장 — 지붕이 남쪽, 열린 쪽(북)이 호수·VILLAGE_BOARD 를 본다(거울 쪽 정류장과 같은 방향). 낮밤 모두 서 있다
  shelter = makeStopShelter(0x6f8fc9, 0xb98a5e);
  shelter.position.set(MIRROR_STOP.x, 0, MIRROR_STOP.z); shelter.rotation.y = Math.PI;
  scene.add(shelter);
  solidBox(MIRROR_STOP.x - 1.4, MIRROR_STOP.z - 0.7, MIRROR_STOP.x + 1.4, MIRROR_STOP.z + 0.5);   // x 14.6..17.4 · z 16.3..17.5 — VILLAGE_BOARD(z 15.6) 는 밖
}
/** 낮엔 정류장에 마차가 서 있다(발견성) · 밤엔 막차가 끊긴다 — game.js 루프에서 매 프레임(가벼움) */
export function syncVillageCarriage(inVillage) {
  if (ride) return;
  if ($w.atMirror) {   // 거울 마을 안 — 마차가 정박 자리에 서 있다(타기 직전·내린 뒤에 튀지 않게)
    if (!carriage) return;
    carriage.visible = true;
    carriage.position.set(MIRROR.x + MIRROR_PARK.x, 0, MIRROR.z + MIRROR_PARK.z); carriage.rotation.set(0, MIRROR_PARK.heading, 0);
    return;
  }
  if (!inVillage) { if (carriage) carriage.visible = false; return; }
  ensureVillageSide();
  carriage.visible = !isNight();
  carriage.position.set(VILLAGE_PARK.x, 0, VILLAGE_PARK.z); carriage.rotation.set(0, VILLAGE_PARK.heading, 0);
}

export function mirrorState() {
  const today = todayStr(), m = gameState.mirror;
  if (m && m.day === today && Number.isInteger(m.done)) return m;
  gameState.mirror = normalizeMirror(m, today);
  return gameState.mirror;
}
export function setMirrorVisible(on) { if (world) world.group.visible = on; }

// ── 마을 정류장 ──────────────────────────────────────────────
/** doors.js 마을 분기에서 — 정류장 앞이면 { nd, prompt }, 아니면 null */
export function mirrorVillagePrompt() {
  if (dist2D(VILLAGE_BOARD, player.position) >= STOP_REACH) { stopShownKey = null; return null; }
  const night = isNight(), key = `${todayStr()}:${+night}`;
  if (stopShownKey !== key) { stopShownKey = key; T.stopShown({ prior_visits: mirrorState().visits, night }); }
  if (night) return { nd: null, prompt: '🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서' };
  if (firstHintBanner('mirrorStop', '🚏', '마차 정류장', '낮엔 🪞 거울 마을에 갈 수 있어요')) T.onboard({ step: 'stop' });
  return { nd: 'mirrorgo', prompt: '🪞 거울 마을행 타기' };
}

// ── 탑승 ─────────────────────────────────────────────────────
function routeGo() {
  return {
    from: { board: VILLAGE_BOARD, park: VILLAGE_PARK, gate: LAKE_GATE },
    to: { gate: { x: MIRROR.x + MIRROR_GATE_LOCAL.x, y: MIRROR_GATE_LOCAL.y, z: MIRROR.z + MIRROR_GATE_LOCAL.z }, park: { ...W(MIRROR_PARK), heading: MIRROR_PARK.heading }, landing: W(MIRROR_LANDING) },
  };
}
function routeBack() {
  const g = routeGo();
  return { from: { board: W(MIRROR_STOP_LOCAL), park: g.to.park, gate: g.to.gate }, to: { gate: LAKE_GATE, park: VILLAGE_PARK, landing: VILLAGE_BOARD } };
}
function board(dir) {
  if (ride) return;
  if (dir === 'go' && isNight()) { ui.toast?.('🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서'); return; }   // 프롬프트를 띄운 채 해가 진 경우
  ensureWorld(); ensureVillageSide();
  const m = mirrorState(), first = dir === 'go' ? m.visits === 0 : !gameState.hintsSeen.mirrorReturn;
  T.board({ dir, first, done_today: m.done });
  $w.sleeping = true; $w.sitting = false;   // 이동·액션·앉기·도구 전환 잠금(꿈길과 같은 잠금)
  if (handAnchor) handAnchor.visible = false;
  carriage.visible = true;
  Sound.blip();
  ui.setDreamSkip?.(true);   // 건너뛰기 버튼은 꿈길 것을 같이 쓴다(Input.dreamSkip 이 둘 다 부른다)
  ride = startRide({
    dir, first, route: dir === 'go' ? routeGo() : routeBack(),
    hooks: {
      player, playerAnchor, camera, carriage,
      gateFrom: dir === 'go' ? gateLake : gateMirror, gateTo: dir === 'go' ? gateMirror : gateLake,
      flash: (a) => ui.sleepFade?.(a, 'mirror'),
      teleport: () => (dir === 'go' ? enterSpace() : leaveSpace()),
      land: (r) => (dir === 'go' ? arrive(r) : backHome(r)),
    },
  });
}
export function mirrorRideActive() { return !!ride; }
export function skipMirrorRide() { ride?.skip(); }
/** 루프에서 매 프레임 — 연출 중이면 true(카메라·입력은 연출 몫) */
export function updateMirrorRide(dt, t) { if (!ride) return false; ride.update(dt); world?.update(t); return true; }

function enterSpace() {
  $w.atMirror = true;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastDoorPrompt = null;
  mirrorState().visits += 1;
  active = null; refreshWorld();
  setSpaceVisible(); setBGMTheme('mirror');
}
function arrive({ skipped, atS, short }) {
  ride = null; ui.setDreamSkip?.(false);
  if (handAnchor) handAnchor.visible = true;
  player.rotation.y = Math.PI;   // 연못(북쪽)을 본다
  snapCamera();
  arrivedAt = performance.now(); lastHud = '';
  setTimeout(() => { $w.sleeping = false; }, 300);   // 번쩍이 걷히는 동안 연타가 새지 않게
  const m = mirrorState();
  T.cutsceneEnd({ dir: 'go', skipped, at_s: atS, short });
  T.enter({ visit_n: m.visits, done_today: m.done });
  syncHud();
  if (!gameState.hintsSeen.mirrorArrive) { gameState.hintsSeen.mirrorArrive = true; ui.showMirrorArrive?.(); T.onboard({ step: 'arrive' }); }
  requestSave();
}
function leaveSpace() {
  $w.atMirror = false;
  active = null; if (world) world.beam.visible = false;
  ui.setZoneHint?.(null); $w.lastZoneHint = null;
  setSpaceVisible(); setBGMTheme('main');
}
function backHome({ skipped, atS, short }) {
  ride = null; ui.setDreamSkip?.(false);
  if (handAnchor) handAnchor.visible = true;
  carriage.position.set(VILLAGE_PARK.x, 0, VILLAGE_PARK.z); carriage.rotation.set(0, VILLAGE_PARK.heading, 0);
  player.rotation.y = Math.PI;
  snapCamera();
  setTimeout(() => { $w.sleeping = false; }, 300);
  const m = mirrorState();
  T.cutsceneEnd({ dir: 'back', skipped, at_s: atS, short });
  T.leave({ done_today: m.done, elapsed_s: secs(arrivedAt) });
  if (firstHintBanner('mirrorReturn', '🪞', '거울 장식', '🛋️ 꾸미기에서 거울 조각으로 바꿔요')) T.onboard({ step: 'return' });
  requestSave();
}

// ── 안에서 ───────────────────────────────────────────────────
function refreshWorld() {
  if (!world) return;
  const next = questAt(mirrorState(), todayStr());
  for (const g of world.items.values()) g.visible = false;
  // 물건은 단서를 들은 의뢰 것만 보인다(미리 주우면 "누구 거지?"가 된다 — 스펙 §4)
  if (active) { const s = spotOf(active.q.spot), g = world.items.get(active.q.item); g.position.set(s.x, 0.15, s.z + 0.35); g.visible = true; }
  world.beam.visible = !!active?.hintShown;
  if (active?.hintShown) { const s = spotOf(active.q.spot); world.beam.position.set(s.x, 3.5, s.z + 0.35); }
  for (const tw of twins) if (tw.bubble) tw.bubble.visible = !!next && !active && next.npc === tw.id;
}
function syncHud() {
  const key = `${mirrorState().done}`;
  if (key === lastHud) return;
  lastHud = key;
  ui.setZoneHint?.(`🪞 거울 마을 · 의뢰 ${mirrorState().done}/${QUESTS_PER_DAY}`);   // 상태는 컨텍스트 슬롯 — 모바일 3단 레이아웃 규칙
  $w.lastZoneHint = 'mirror';
}
const twinWorld = (tw) => W(tw.spot);

/** doors.js atMirror 분기 — { nd, prompt } */
export function mirrorPrompt() {
  if (dist2D(W(MIRROR_STOP_LOCAL), player.position) < STOP_REACH) return { nd: 'mirrorback', prompt: '🚏 마을로 돌아가기' };
  const next = questAt(mirrorState(), todayStr());
  const tw = next && !active ? twins.find(x => x.id === next.npc) : null;
  if (tw && dist2D(twinWorld(tw), player.position) < TALK_R) return { nd: 'mirrortalk', prompt: lang() === 'en' ? `💬 Talk to ${npcName(tw.id, 'en')}` : `💬 ${npcName(tw.id, 'ko')}에게 말 걸기` };
  if (active) {
    if (!active.hintShown && secs(active.heardAt) >= HINT_AFTER_S) return { nd: 'mirrorhint', prompt: '💧 연못에 비춰 보기' };
    return { nd: null, prompt: active.hintShown ? hintText(active.q, lang()) : clueShort(active.q, lang()) };
  }
  if (!next) return { nd: null, prompt: '오늘 의뢰는 끝났어요 · 🚏 정류장에서 돌아가요' };
  return { nd: null, prompt: lang() === 'en' ? `💬 Talk to ${npcName(next.npc, 'en')}` : `💬 ${npcName(next.npc, 'ko')}에게 말 걸기` };
}
/** handleAction 에서 — 정류장 타기(마을) · 돌아가기 · 말 걸기 · 힌트 */
export function mirrorAction(nd) {
  if (nd === 'mirrorgo') return board('go');
  if (!atMirror) return;
  if (nd === 'mirrorback') return board('back');
  if (nd === 'mirrortalk') return talk();
  if (nd === 'mirrorhint') return useHint();
}
function talk() {
  const q = questAt(mirrorState(), todayStr()); if (!q || active) return;
  const used = hintUsed.has(hintKey(q));
  active = { q, heardAt: performance.now(), hinted: used, hintShown: used };
  ui.toast?.(clueText(q, lang()), 5200);
  T.clue({ quest_n: q.n, npc_id: q.npc, spot_id: q.spot, flipped: q.flipped });
  if (q.n === 2 && firstHintBanner('mirrorFlip', '🪞', '거울 말', '여기 주민들은 좌우를 반대로 말해요')) T.onboard({ step: 'flip' });
  refreshWorld();
}
function useHint() {
  if (!active || active.hintShown) return;
  active.hintShown = true; active.hinted = true; hintUsed.add(hintKey(active.q));
  T.hint({ quest_n: active.q.n, spot_id: active.q.spot, wait_s: secs(active.heardAt) });
  ui.toast?.(hintText(active.q, lang()), 4200);
  refreshWorld();
}
/** 루프에서 매 프레임 — 거울 마을이 아니면 아무것도 안 한다 */
export function updateMirror(dt, t) {
  if (!atMirror || !world || ride) return;
  world.update(t);
  const m = mirrorState();   // 안에서 자정을 넘기면 HUD·말풍선이 어제 상태로 남는다
  if (m.day !== lastDay) { lastDay = m.day; lastHud = null; syncHud(); refreshWorld(); }
  if (!active) return;
  const s = spotOf(active.q.spot);
  if (Math.hypot(player.position.x - MIRROR.x - s.x, player.position.z - MIRROR.z - (s.z + 0.35)) < PICK_R) found();
}
function found() {
  const a = active, m = mirrorState(), next = questAt(m, todayStr());
  active = null;
  // 거울 마을 안에서 자정을 넘기면 어제 의뢰가 남아 있다 — 오늘 다음 의뢰와 다르면 보상 없이 닫는다
  if (!next || next.n !== a.q.n || next.spot !== a.q.spot) { refreshWorld(); return; }
  T.found({ quest_n: a.q.n, item_id: a.q.item, spot_id: a.q.spot, flipped: a.q.flipped, hinted: a.hinted, search_s: secs(a.heardAt) });
  const reward = rewardFor(a.hinted);
  m.done += 1; if (a.hinted) m.hinted.push(a.q.n); m.total += reward;
  gameState.inventory.mirror = (gameState.inventory.mirror || 0) + reward;
  refreshInventoryUI();
  const w = twinWorld(twins.find(x => x.id === a.q.npc));
  spawnSparkle(w.x, 1.4, w.z, 22); spawnFloatText(w.x, 2.2, w.z, `+${reward} 🪞`, '#7ad6c0');
  Sound.starPick?.();
  T.ret({ quest_n: a.q.n, reward });
  const en = lang() === 'en', nm = npcName(a.q.npc, lang());
  ui.toast?.(m.done >= QUESTS_PER_DAY ? '오늘 의뢰는 끝났어요 · 🚏 정류장에서 돌아가요' : (en ? `${nm}: "Thank you for finding it!"` : `${nm}: "찾아 줘서 고마워요!"`), 3000);
  refreshWorld(); syncHud(); requestSave();
}

/** 원 안으로 — updatePlayer 이동 한계 */
export function clampToMirror(pos) { const c = clampWalkable(pos.x - MIRROR.x, pos.z - MIRROR.z); pos.x = MIRROR.x + c.x; pos.z = MIRROR.z + c.z; }
/** getGameState — 거울 마을에서 저장되면 마을 정류장 앞(z=-700 을 적으면 새로고침 때 마을 밖으로 튄다) */
export function mirrorReturnPos() { return { x: VILLAGE_BOARD.x, z: VILLAGE_BOARD.z }; }

/** 미니맵 — 원 하나 · 표지물 · 정류장(나가는 곳) · 힌트 쓴 자리 */
export const MIRROR_MAP = Object.freeze({ cx: MIRROR.x, cz: MIRROR.z, half: 23 });
export function mirrorMinimapMarks(marks) {
  for (const l of LANDMARKS) marks.push({ x: MIRROR.x + l.x, z: MIRROR.z + l.z, c: '#c8c0e0', r: 1.6 });
  marks.push({ x: MIRROR.x + MIRROR_STOP_LOCAL.x, z: MIRROR.z + MIRROR_STOP_LOCAL.z, c: '#9ecbff', kind: 'exit' });
  if (active?.hintShown) { const s = spotOf(active.q.spot); marks.push({ x: MIRROR.x + s.x, z: MIRROR.z + s.z, c: '#ffd86b', r: 2.4 }); }
}
