// =============================================================
//  🌟 반딧불이 계곡 — 밤에만 열리는 남쪽 숲 (새 동사: 잡기)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-24).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, GLADE_MAX, SEASON, WEATHER, atFarm, atMine, atOrchard, awardBadge, bugJarMesh, bugRespawnAt, catchCeremony, clayMat, clearPest,
  clock, dexDiscover, dist2D, doPlayerAction, gameState, giveReward, gladeBugs, gladeGroup, indoor, isNight, isOpen, makeSignpost,
  mergeGeos, nightLevel, obstacles, pestTarget, player, questEvent, refreshInventoryUI, requestSave, scene, showCatchItem, situation,
  spawnFloatText, spawnSparkle, spawnTree, todayStr, trackGateBlocked, trees, tryUnlockDrop, ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { onPlay } from '../decor-drops/index.js';
import { BUG_KINDS, CAFE_GATE, GLADE, GLADE_R, LIGHT_WORKSHOP, LIGHT_WORKSHOP_POND } from '../data/places.js';
import { PAL } from '../data/world.js';
import { NIGHT_MIN } from '../daynight.js';
import { gateOf, gateOpen, rollKind } from '../dex-gates.js';
import { NIGHT_KINDS, STREAM, TUNE, monoKind, nightKind, pickKindId, streamPoint } from '../glade/night.js';
import { buildPools, updatePools } from '../glade/pool-art.js';
import { MONO_BANNER, NIGHT_BANNER, SWARM_BANNER, catchText, comboText, perfectText, stringBanner } from '../glade/copy.js';
import { FIRST_DELAY, KIDS, LEADER_BUGS, NEXT_DELAY, PERFECT_BONUS, createSwarm, delay, expired, kidBright, kidsLeft, nextKid, swingKid, swingLeader } from '../glade/swarm.js';
import { makeLeader, setLeaderGlow } from '../glade/swarm-art.js';
import { JARS_PER_SEG, SEG_COINS, THRESHOLDS, addCatch, nextThreshold, segmentsLit, stringColors } from '../glade/string.js';
import { layoutAnchors } from '../glade/string-layout.js';
import { buildString, refreshString } from '../glade/string-art.js';
import { concertScatterBlocks } from '../concert/index.js';
import { netBonus } from '../workbench/rules.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

const devQuery = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? new URLSearchParams(location.search) : new URLSearchParams();
let gladeNight = null;
let nightBannerDay = '';
let streamPhase = 0, poolArt = null;
let stringArt = null, stringNight = null, stringCaught = -1, devApplied = false;
const FALLBACK_COLOR = 0xfff2a8;

function paintString(night) {
  if (!stringArt) return;
  const caught = gameState.hintsSeen?.gladeCaught | 0;
  const lit = segmentsLit(caught);
  const colors = stringColors(gameState.hintsSeen?.gladeString).map(seg => seg.map(id => BUG_KINDS.find(k => k.id === id)?.color ?? FALLBACK_COLOR));
  while (colors.length < lit) colors.push(Array(JARS_PER_SEG).fill(FALLBACK_COLOR));
  refreshString(stringArt, colors.slice(0, lit), night);
  stringNight = night; stringCaught = caught;
}

function applyDev() {
  if (devApplied) return;
  devApplied = true;
  const n = parseInt(devQuery.get('gcaught'), 10);
  if (!Number.isFinite(n)) return;
  let s = { caught: 0, seg: '', string: '' };
  for (let i = 0; i < n; i++) s = addCatch(s, ['yellow', 'yellow', 'blue', 'green'][i % 4]);
  gameState.hintsSeen = { ...gameState.hintsSeen, gladeCaught: s.caught, gladeSeg: s.seg, gladeString: s.string };
}

function sparkleSegment(seg) {
  if (!stringArt) return;
  for (let j = 0; j < JARS_PER_SEG; j++) {
    const p = stringArt.jarPos[seg * JARS_PER_SEG + j];
    if (p) setTimeout(() => spawnSparkle(GLADE.x + p.x, p.y - 0.37, GLADE.z + p.z, 10), j * 180);
  }
}

function noteCatch(kind) {
  const h = gameState.hintsSeen || {};
  const r = addCatch({ caught: h.gladeCaught, seg: h.gladeSeg, string: h.gladeString }, kind.id);
  gameState.hintsSeen = { ...h, gladeCaught: r.caught, gladeSeg: r.seg, gladeString: r.string };
  if (!r.lit) return;
  const coins = SEG_COINS[r.lit - 1];
  if (coins) giveReward({ coins }, 'glade_string', String(r.lit));
  if (r.lit === THRESHOLDS.length) awardBadge('glade_ring');
  const copy = stringBanner(r.lit, r.caught, nextThreshold(r.caught));
  ui.showHintBanner?.({ ico: '🏮', title: copy.title, line: copy.line, kind: 'misc', key: 'glade-string-' + r.lit });
  trackEvent('glade_string', { step: r.lit, total: r.caught });
  sparkleSegment(r.lit - 1);
  requestSave();
}

let swarm = null, swarmObjs = null, swarmAt = 0, swarmBoost = 0;
const swarmPath = (u) => ({ x: 2.6 * Math.sin(u), y: 1.5 + 0.28 * Math.sin(2 * u), z: 1.6 * Math.cos(u) });
const leaderBright = (t) => (kidsLeft(swarm) ? 0 : 0.5 + 0.5 * Math.sin(t * 2.6));

function catchBugs(kind, bugs, wx, wz, text) {
  gameState.inventory.bug = (gameState.inventory.bug || 0) + bugs;
  refreshInventoryUI();
  Sound.harvest();
  spawnFloatText(wx, 1.4, wz, text, '#c98a2a');
  spawnSparkle(wx, 1.2, wz, kind.id === 'yellow' ? 12 : 20);
  for (let i = 0; i < bugs; i++) { questEvent('catch'); noteCatch(kind); }
  dexDiscover('bug', kind.id);
  catchCeremony('bugZoom');
  if (kind.id === 'rainbow') tryUnlockDrop(0.5);
  trackEvent('firefly_catch', { kind: kind.id, weather: WEATHER, night: Math.round(nightLevel * 100), mode: nightNow().kind });
  onPlay('firefly');
}

function endSwarm(t, result) {
  if (!swarm) return;
  trackEvent('firefly_swarm', { result, combo: swarm.combo, caught: swarm.caught, mode: nightNow().kind });
  for (const o of [swarmObjs.leader, ...swarmObjs.kids]) { gladeGroup.remove(o); o.traverse(m => { m.geometry?.dispose(); m.material?.dispose(); }); }
  swarm = null; swarmObjs = null;
  swarmAt = t + delay(NEXT_DELAY, Math.random);
}

function startSwarm(t) {
  const kind = rollBugKind();
  swarm = createSwarm(kind.id, t);
  const leader = makeLeader(kind.color, clayMat);
  const kids = Array.from({ length: KIDS }, () => makeFirefly(kind));
  for (const o of [leader, ...kids]) gladeGroup.add(o);
  swarmObjs = { leader, kids, kind, su: 0 };
  if (gameState.hintsSeen?.gladeSwarmSeen) return;
  ui.showHintBanner?.({
    ico: '✨', title: SWARM_BANNER.title, line: SWARM_BANNER.line, kind: 'misc', key: 'glade-swarm', live: () => !!swarm,
    burn: () => { gameState.hintsSeen = { ...gameState.hintsSeen, gladeSwarmSeen: true }; requestSave(); },
  });
}

function updateSwarm(dt, t) {
  const away = dist2D(GLADE, player.position);
  if (!swarm) {
    if (away > GLADE_R + 0.5) return;
    if (!swarmAt) swarmAt = t + (devQuery.has('gswarm') ? 3 : delay(FIRST_DELAY, Math.random));
    if (t >= swarmAt) startSwarm(t);
    return;
  }
  if (expired(swarm, t)) { endSwarm(t, 'timeout'); return; }
  if (away > GLADE_R + 4) { endSwarm(t, 'left'); return; }
  swarmBoost = Math.max(0, swarmBoost - dt);
  swarmObjs.su += dt * (swarmBoost > 0 ? 1.3 : 0.55);
  const fade = Math.min(1, (nightLevel - NIGHT_MIN) / 0.2);
  const lp = swarmPath(swarmObjs.su), ahead = swarmPath(swarmObjs.su + 0.1);
  swarmObjs.leader.position.set(lp.x, lp.y, lp.z);
  swarmObjs.leader.rotation.y = Math.atan2(ahead.x - lp.x, ahead.z - lp.z) + Math.PI;
  setLeaderGlow(swarmObjs.leader, (kidsLeft(swarm) ? 0.55 : leaderBright(t)) * fade);
  swarmObjs.kids.forEach((kid, i) => {
    if (!swarm.kids[i]) return;
    const p = swarmPath(swarmObjs.su - (i + 1) * 0.34);
    kid.position.set(p.x, p.y, p.z);
    const b = kidBright(i, t);
    kid.userData.bright = b;
    kid.userData.core.material.opacity = (0.25 + b * 0.75) * fade;
    kid.userData.halo.material.opacity = (0.04 + b * 0.34) * fade;
    kid.userData.halo.scale.setScalar(0.8 + b * 0.6);
  });
}

function netSwarm() {
  if (!swarm) return false;
  const t = clock.elapsedTime;
  let best = null, nd = 2.2;
  const near = (obj, idx) => {
    const d = Math.hypot(obj.position.x + GLADE.x - player.position.x, obj.position.z + GLADE.z - player.position.z);
    if (d < nd) { nd = d; best = { obj, idx }; }
  };
  near(swarmObjs.leader, -1);
  swarmObjs.kids.forEach((kid, i) => { if (swarm.kids[i]) near(kid, i); });
  for (const bug of gladeBugs) near(bug, null);
  if (!best || best.idx === null) return false;
  const wx = best.obj.position.x + GLADE.x, wy = best.obj.position.y, wz = best.obj.position.z + GLADE.z;
  doPlayerAction(wx, wz);
  const bonus = netBonus(gameState), kind = swarmObjs.kind;
  const odds = { chanceLit: Math.min(0.98, 0.9 + bonus), chanceDim: Math.min(0.98, nightNow().tune.dimChance + bonus), rnd: Math.random };
  if (best.idx < 0) {
    const res = swingLeader(swarm, { ...odds, bright: leaderBright(t) });
    if (!res.hit) {
      Sound.blip();
      if (res.reason === 'miss') { swarmBoost = 1.2; spawnFloatText(wx, wy + 0.5, wz, '휙— 놓쳤다!', '#8a8f7a'); return true; }
      const kid = swarmObjs.kids[nextKid(swarm)];
      if (kid) spawnSparkle(kid.position.x + GLADE.x, kid.position.y, kid.position.z + GLADE.z, 14);
      return true;
    }
    swarm = res.sw;
    const bugs = LEADER_BUGS + (res.perfect ? PERFECT_BONUS : 0);
    catchBugs(kind, bugs, wx, wz, res.perfect ? perfectText(kind.ico, kind.name, bugs) : catchText(kind.ico, kind.name, bugs));
    endSwarm(t, 'done');
    return true;
  }
  const res = swingKid(swarm, best.idx, { ...odds, bright: best.obj.userData.bright || 0 });
  if (!res.hit) {
    swarmBoost = 1.2; Sound.blip();
    spawnFloatText(wx, wy + 0.5, wz, '휙— 놓쳤다!', '#8a8f7a');
    return true;
  }
  swarm = res.sw;
  gladeGroup.remove(best.obj);
  catchBugs(kind, 1, wx, wz, res.inTurn ? comboText(kind.ico, kind.name, swarm.combo, KIDS) : catchText(kind.ico, kind.name, 1));
  return true;
}

export function nightNow() {
  if (gladeNight) return gladeNight;
  const key = todayStr();
  const forced = devQuery.get('gnight');
  const kind = NIGHT_KINDS.includes(forced) ? forced : nightKind(key);
  const open = BUG_KINDS.map(k => k.id).filter(id => gateOpen(gateOf('bug', id), { weather: 'clear', season: SEASON, night: true }));
  gladeNight = { key, kind, monoId: kind === 'mono' ? monoKind(key, open) : null, tune: TUNE[kind] };
  return gladeNight;
}

function announceNight(now) {
  if (now.kind === 'plain' || nightBannerDay === now.key) return;
  if (gameState.hintsSeen?.gladeNightSeen === now.key) { nightBannerDay = now.key; return; }
  if (dist2D(GLADE, player.position) > GLADE_R + 0.5 || ui.coachActive?.()) return;
  const copy = now.kind === 'mono' ? MONO_BANNER[now.monoId] : NIGHT_BANNER[now.kind];
  nightBannerDay = now.key;
  if (!copy) return;
  ui.showHintBanner?.({
    ico: '🌙', title: copy.title, line: copy.line, kind: 'place', key: 'glade-night',
    near: () => dist2D(GLADE, player.position) < GLADE_R + 3,
    burn: () => { gameState.hintsSeen = { ...gameState.hintsSeen, gladeNightSeen: now.key }; requestSave(); },
  });
}

export function buildGlade() {
  $w.gladeGroup = new THREE.Group(); gladeGroup.position.copy(GLADE);
  // 짙은 이끼 바닥 — 주변 잔디보다 어두워 "숲 속 그늘" 느낌(반딧불이 대비도 ↑)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(GLADE_R + 0.6, 36), clayMat(0x8ac9a2, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.position.y = 0.02; floor.receiveShadow = true; gladeGroup.add(floor);
  // 이끼 바위 + 그루터기(공터가 허전하지 않게)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4, r = 2.4 + Math.random() * 3.4;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.32, 0), clayMat(0x9aab9a));
    rock.position.set(Math.cos(a) * r, 0.16, Math.sin(a) * r); rock.castShadow = true; gladeGroup.add(rock);
  }
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.5, 9), clayMat(PAL.trunk));
  stump.position.set(-1.6, 0.25, 1.2); stump.castShadow = true; gladeGroup.add(stump);
  gladeGroup.add(makeSignpost('🌟 반딧불이 계곡', 0, -GLADE_R + 1.2));
  scene.add(gladeGroup);
  // 계곡을 둘러싼 나무 링 — 마을 불빛을 막아 "어두운 숲" 을 만듦
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.25, r = GLADE_R + 1.4 + Math.random() * 1.2;
    const tx = GLADE.x + Math.cos(a) * r, tz = GLADE.z + Math.sin(a) * r;
    if (dist2D({ x: tx, z: tz }, CAFE_GATE) < 5.5) continue;   // ☕ 카페 시야를 가리지 않게 비움
    // 🏮 빛 공방 — 오두막에 박히는 나무만 비우고 옆 나무는 남긴다(숲 가장자리 느낌) · 연못 위도 비움
    if (dist2D({ x: tx, z: tz }, LIGHT_WORKSHOP) < 2.8) continue;
    if (concertScatterBlocks(tx, tz)) continue;
    if (dist2D({ x: tx, z: tz }, { x: LIGHT_WORKSHOP.x + LIGHT_WORKSHOP_POND.x, z: LIGHT_WORKSHOP.z + LIGHT_WORKSHOP_POND.z }) < LIGHT_WORKSHOP_POND.r + 0.6) continue;
    spawnTree(tx, tz);
  }
  obstacles.push({ x: GLADE.x, z: GLADE.z, r: GLADE_R });   // 계곡 안엔 밭 금지(빈터 유지)
  const ringTrees = trees.map(t => ({ x: t.position.x - GLADE.x, z: t.position.z - GLADE.z }));
  const anchors = layoutAnchors(ringTrees, GLADE_R);
  for (const a of anchors) if (!a.post) trees[a.i].userData.holdsString = true;
  stringArt = buildString({ group: gladeGroup, anchors, clayMat, mergeGeos });
  poolArt = buildPools(gladeGroup, GLADE_MAX + KIDS);
}

// 종류 추첨 — 🌈무지개반디는 🌧️비·🌫️안개 낀 날 **밤**에만(게이트 안에서 18%). 표는 js/dex-gates.js
//   ⚠️ 옛 주석은 "비 온 날엔 초록반디가, 안개 낀 날엔 무지개반디가" 였지만 실제 코드는
//      rain||fog 둘 다 희귀↑ 였다. 게이트가 그 동작을 명시적으로 만든 것이다.
export function rollBugKind() {
  const rnd = (WEATHER === 'rain' || WEATHER === 'fog')
    ? () => Math.min(Math.random(), Math.random())   // 두 번 굴려 작은 값 → 희귀↑
    : Math.random;
  const night = nightNow();
  const id = pickKindId(night.kind, night.monoId, Math.random, () => rollKind(BUG_KINDS, 'bug', situation(), rnd).id);
  return BUG_KINDS.find(k => k.id === id);
}

// 반딧불이 한 마리 — 발광 코어 + 넓은 헤일로(Additive). 블룸과 겹쳐 밤에 또렷하게 빛남
export function makeFirefly(kind) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: kind.color, transparent: true, opacity: 1 }));
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: kind.color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  g.userData = {
    kind, core, halo,
    phase: Math.random() * Math.PI * 2,          // 점멸 위상 — 밝을 때 휘둘러야 잘 잡힘
    tx: 0, tz: 0, ty: 1.4,                       // 배회 목적지(계곡 로컬)
    flee: 0,                                     // 남은 도망 시간(초)
    so: 0, home: Math.random() * STREAM.window,
  };
  retargetFirefly(g);
  return g;
}

export function retargetFirefly(bug) {
  const u = bug.userData, tune = nightNow().tune;
  const a = Math.random() * Math.PI * 2, r = Math.random() * (GLADE_R - 0.8);
  u.tx = Math.cos(a) * r; u.tz = Math.sin(a) * r; u.ty = tune.yMin + Math.random() * (tune.yMax - tune.yMin);
}

// 계곡 안 랜덤 위치에 한 마리 추가(최대 GLADE_MAX)
export function spawnFirefly() {
  if (gladeBugs.length >= GLADE_MAX || !gladeGroup) return;
  const bug = makeFirefly(rollBugKind());
  const a = Math.random() * Math.PI * 2, r = Math.random() * (GLADE_R - 1);
  const tune = nightNow().tune;
  bug.position.set(Math.cos(a) * r, tune.yMin + Math.random() * (tune.yMax - tune.yMin), Math.sin(a) * r);
  if (nightNow().kind === 'stream') {
    bug.userData.so = bug.userData.home;
    const p = streamPoint(streamPhase - bug.userData.so, GLADE_R - 0.8);
    bug.position.x = p.x; bug.position.z = p.z;
  }
  gladeGroup.add(bug); gladeBugs.push(bug);
}

export function removeFirefly(bug) {
  const i = gladeBugs.indexOf(bug);
  if (i >= 0) gladeBugs.splice(i, 1);
  gladeGroup.remove(bug);
}

// 매 프레임 — 밤에만 나타나 떠다니고, 플레이어가 다가오면 슬쩍 도망
export function updateFireflyBugs(dt, t) {
  if (!gladeGroup) return;
  const night = isNight();
  gladeGroup.visible = !indoor && !atFarm && !atMine && !atOrchard;
  applyDev();
  if (stringNight !== night || stringCaught !== (gameState.hintsSeen?.gladeCaught | 0)) paintString(night);
  if (!night || !isOpen('glade')) {               // ☀️ 낮 → 전부 사라짐(밤에 다시 피어오름) · 🔓 계곡이 아직 안 돌아왔으면 피지 않는다
    while (gladeBugs.length) removeFirefly(gladeBugs[gladeBugs.length - 1]);
    if (swarm) endSwarm(t, 'timeout');
    swarmAt = 0;
    gladeNight = null;
    if (poolArt) poolArt.mesh.count = 0;
    return;
  }
  const now = nightNow(), tune = now.tune, stream = now.kind === 'stream';
  announceNight(now);
  if (stream) streamPhase += dt * STREAM.speed;
  if (t >= bugRespawnAt && gladeBugs.length < GLADE_MAX && !swarm) {
    spawnFirefly();
    $w.bugRespawnAt = t + (1.2 + Math.random() * 2.4) * tune.respawn;
  }
  // 플레이어의 계곡 로컬 좌표(도망 판정용)
  const plx = player.position.x - GLADE.x, plz = player.position.z - GLADE.z;
  for (const bug of gladeBugs) {
    const u = bug.userData;
    u.phase += dt * 3.4;
    // 점멸 — 밝을 때가 "잡을 타이밍"(사인 곡선 그대로 UI/성공률에 연동)
    const bright = 0.5 + 0.5 * Math.sin(u.phase);
    const fade = Math.min(1, (nightLevel - NIGHT_MIN) / 0.2);   // 해질녘엔 서서히 나타남
    u.bright = bright;
    u.core.material.opacity = (0.3 + bright * 0.7) * fade;
    u.halo.material.opacity = (0.05 + bright * 0.3) * fade;
    u.halo.scale.setScalar(0.8 + bright * 0.55);
    // 이동 — 목적지로 부드럽게. 가까이 오면 반대 방향으로 튐
    const dx = bug.position.x - plx, dz = bug.position.z - plz;
    const pd = Math.hypot(dx, dz);
    if (pd < tune.fleeDist && u.flee <= 0) { u.flee = 0.9; }
    let sp = tune.speed;
    if (stream) {
      if (u.flee > 0) { u.flee -= dt; u.so = Math.max(-STREAM.ahead, u.so - dt * 0.8); }
      else u.so += (u.home - u.so) * Math.min(1, dt * 0.6);
      const p = streamPoint(streamPhase - u.so, GLADE_R - 0.8);
      u.tx = p.x; u.tz = p.z; sp = u.flee > 0 ? 2.8 : 2.4;
    } else if (u.flee > 0) {
      u.flee -= dt; sp = 2.3;
      const k = pd || 0.001;
      u.tx = Math.max(-GLADE_R + 0.8, Math.min(GLADE_R - 0.8, plx + (dx / k) * 3.4));
      u.tz = Math.max(-GLADE_R + 0.8, Math.min(GLADE_R - 0.8, plz + (dz / k) * 3.4));
    }
    const tdx = u.tx - bug.position.x, tdz = u.tz - bug.position.z, tdy = u.ty - bug.position.y;
    const td = Math.hypot(tdx, tdz);
    if (td < 0.25 && u.flee <= 0 && !stream) retargetFirefly(bug);
    else {
      const step = Math.min(td, sp * dt);
      bug.position.x += (tdx / (td || 1)) * step;
      bug.position.z += (tdz / (td || 1)) * step;
    }
    bug.position.y += tdy * dt * 0.8 + Math.sin(t * 2.2 + u.phase) * dt * 0.35;   // 위아래로 하늘하늘
  }
  updateSwarm(dt, t);
  const kidsOut = swarm ? swarmObjs.kids.filter((k, i) => swarm.kids[i]) : [];
  if (poolArt) updatePools(poolArt, kidsOut.length ? [...gladeBugs, ...kidsOut] : gladeBugs, Math.max(0, Math.min(1, (nightLevel - NIGHT_MIN) / 0.2)));
}

// 🦋 포충망 휘두르기 — 밤 + 계곡 + 반딧불이 근처에서만. 반짝일 때 휘둘러야 잘 잡힘
export function tryNet() {
  const pp = pestTarget(); if (pp) return clearPest(pp);   // 🐛 밭의 해충 쫓기 — 포충망의 두 번째 용도(스펙 §2-1)
  if (!isOpen('glade')) { ui.toast?.('🌟 반딧불이 계곡이 깨어나면 쓰는 도구예요'); return; }   // 🔓 아직 없는 곳을 가리키지 않는다
  if (dist2D(GLADE, player.position) > GLADE_R + 2.5) { ui.toast?.('🌟 남쪽 반딧불이 계곡에서 쓰는 도구예요'); return; }
  if (!isNight()) { ui.toast?.('🌙 반딧불이는 밤에만 나와요. 해가 지면 다시 오세요', 2600); return; }
  if (netSwarm()) return;
  let target = null, nd = 2.2;
  for (const bug of gladeBugs) {
    const d = Math.hypot(bug.position.x + GLADE.x - player.position.x, bug.position.z + GLADE.z - player.position.z);
    if (d < nd) { nd = d; target = bug; }
  }
  const wx = target ? target.position.x + GLADE.x : player.position.x;
  const wz = target ? target.position.z + GLADE.z : player.position.z;
  doPlayerAction(wx, wz);   // 휘두르는 제스처는 헛스윙이어도 나감
  if (!target) { Sound.blip(); ui.toast?.('🌟 반딧불이 가까이에서 휘둘러 보세요'); trackEvent('firefly_swing_empty'); return; }
  const u = target.userData, kind = u.kind;
  const bright = 0.5 + 0.5 * Math.sin(u.phase);
  // 성공률: 반짝일 때 크게 유리 + 촘촘한 포충망(영구 업그레이드) 보정
  const base = bright > 0.6 ? 0.9 : nightNow().tune.dimChance;
  const chance = Math.min(0.98, base + netBonus(gameState));
  const ok = Math.random() < chance;
  trackEvent('firefly_swing', { kind: kind.id, bright: Math.round(bright * 100), lit: bright > 0.6, upgraded: !!gameState.upgrades.net, caught: ok }); // [GA4] 타이밍 성공률 분석
  if (!ok) {                                   // 실패 — 반딧불이가 휙 도망
    u.flee = 1.4; retargetFirefly(target);
    Sound.blip();
    spawnFloatText(wx, target.position.y + 0.5, wz, '휙— 놓쳤다!', '#8a8f7a');
    ui.toast?.('🌟 놓쳤어요! 반딧불이가 밝게 반짝일 때 휘둘러보세요', 2400);
    return;
  }
  removeFirefly(target);
  $w.bugRespawnAt = Math.min(bugRespawnAt, clock.elapsedTime + 2.5);
  catchBugs(kind, 1, wx, wz, catchText(kind.ico, kind.name, 1));
  trackGateBlocked('bug', 'rainbow');
  showCatchItem(bugJarMesh(kind), wx, target.position.y, wz);
}
