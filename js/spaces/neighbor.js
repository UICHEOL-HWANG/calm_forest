// =============================================================
//  🏡 이웃 마을 — 오늘의 이웃 열기 · 입장/퇴장 · 집주인 반응 (공간 머리말)
//  스펙: docs/superpowers/specs/2026-10-07-neighbor-village-design.md
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 의 let 에 쓸 때는 `$w.x = …`.
//  🔒 게임 상태는 gameState.neighbors · gameState.hintsSeen.neighborPublic 만 쓴다(tests/neighbor-space 가 잠근다).
//     이웃 데이터는 visit 객체에만 둔다. 3D 는 js/neighbors/scene.js, 화면은 js/neighbors/ui.js.
// =============================================================
import { $w, ANIMALS, gameState, giveReward, nightLevel, obstacles, player, requestSave, scene, setFogExempt, setSpaceVisible, snapCamera, solidCircle, syncStory, ui } from '../game.js';
import * as THREE from 'three';
import { t } from '../i18n.js';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';
import { DECOR, FISH_KINDS, OUTDOOR } from '../data/catalog.js';
import { HOUSE_POS, NEIGHBOR, NEIGHBOR_GATE, NEIGHBOR_INT, NEIGHBOR_R, ROOF_Y, SEA_SPECIES } from '../data/places.js';
import { Sound } from '../sound.js';
import { sanitizeShowcase } from '../neighbors/sanitize.js';
import { BANNER_KEY, FAIL_TOAST, HOST_TALK_R, bannerDue, kstDay, REWARD_COINS, markSeen, noticeView, pickerRows, reactOutcome, recordVisit, visitorsSince } from '../neighbors/rules.js';
import { evBlock, evBanner, evFail, evIndoorEnter, evIndoorExit, evNotice, evOpen, evReact, evReport, evToggle, evVisitEnd, evVisitStart } from '../neighbors/track.js';
import { neighborApi } from '../neighbors/net.js';
import { buildNeighborScene } from '../neighbors/scene.js';
import { buildNeighborBalloon } from '../neighbors/gate-art.js';
import { canEnterIndoor, DOOR_R } from '../neighbors/indoor-rules.js';
import { buildNeighborIndoor } from '../neighbors/indoor-scene.js';
import { STAIR_PROMPT_R, stairLayout } from './indoor.js';
import { gardenDoorLocal } from '../house-floors.js';
import { inVillage2 } from './doors.js';
import { bindVillagePublicToggle, closePickerModal, hideNeighborHud, isPickerOpen, openBlockConfirm, openNbMenu, openPickerModal, openReportModal, openVisitorsModal, setHostBubble, setNeighborHudTitle, setPickerBusy, setVillagePublicUi, showNeighborHud } from '../neighbors/ui.js';

let visit = null;          // { publicId, slot, revisit, view, built, t0, reacted, bubble:'ask'|'thanks', near, busy, viewReq, viewId, indoor:null|{f,t0,floors:Set,tags:Set}, indoorBuilt }
let pickerBusy = false;

const faceOf = (id) => (ANIMALS.find(a => a.id === id) || ANIMALS[0]).emoji;
const showcaseCtx = () => ({
  pondRiverIds: FISH_KINDS.map(k => k.rarity), seaIds: SEA_SPECIES.map(s => s.id),
  outdoorIds: new Set(OUTDOOR.map(d => d.id)), decorIds: new Set(DECOR.map(d => d.id)), animalIds: new Set(ANIMALS.map(a => a.id)),
  fallbackAnimal: ANIMALS[0].id, yard: { x: HOUSE_POS.x, z: HOUSE_POS.z },
});

// ── 🏡 팻말 → 오늘의 이웃 ──
export async function openNeighborPicker(via) {
  if (pickerBusy || visit) return;
  pickerBusy = true;
  try {
    const today = await neighborApi.today();
    if (!today.ok) { trackEvent(...evFail('today', today.reason)); ui.toast?.(FAIL_TOAST, 2600); return; }
    trackEvent(...evOpen(today, via));                       // [GA4] 후보 수·오늘 받은 보상·진입 경로
    openPickerModal(pickerRows(today.list, faceOf), today.rewardedToday, goVisit, (row, anchor) => openMore(row.publicId, 'list', anchor));
  } finally { pickerBusy = false; }
}

async function goVisit(row) {
  const r = await neighborApi.showcase(row.publicId);
  if (!isPickerOpen()) return;   // 기다리는 사이 피커가 닫혔다 — 늦게 온 응답으로 순간이동하지 않는다
  try {
    const view = r.ok ? sanitizeShowcase(r.data, showcaseCtx()) : null;
    if (!view) {
      trackEvent(...evFail('showcase', r.ok ? 'invalid' : (r.code || r.reason)));
      ui.toast?.(FAIL_TOAST, 2600);
      setPickerBusy(false);
      return;
    }
    closePickerModal();
    enterNeighbor({ publicId: row.publicId, slot: row.slot, revisit: row.done, view, loadMs: r.loadMs });
  } catch (e) {   // 검증·짓기·입장 실패 — 조용히 삼키지 않는다
    console.error('[neighbor] visit failed', e);
    trackEvent(...evFail('showcase', 'build'));
    ui.toast?.(FAIL_TOAST, 2600);
    setPickerBusy(false);
  }
}

// ── 입장 · 퇴장 ──
export function enterNeighbor(entry) {
  if (visit || !inVillage2()) return;   // 다른 공간(실내·동굴…)에 있으면 겹쳐 들어가지 않는다
  const built = buildNeighborScene(entry.view);
  visit = { ...entry, built, t0: performance.now(), reacted: entry.revisit, bubble: entry.revisit ? 'thanks' : 'ask', near: false, busy: false };
  $w.atNeighbor = true;
  player.position.set(NEIGHBOR.x, 0, NEIGHBOR.z + NEIGHBOR_R - 2.5);
  player.rotation.y = Math.PI;   // 집 쪽(−z)을 보고 선다
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  showNeighborHud(entry.view.nickname, exitNeighbor, (anchor) => openMore(entry.publicId, 'visit', anchor));
  Sound.blip();
  trackEvent(...evVisitStart(entry));                        // [GA4] host·slot·revisit·load_ms
  startView(visit);                                          // [원장] village_views — 기다리지 않는다(입장을 막지 않음)
}

export function exitNeighbor() {
  if (!visit) return;
  leaveIndoor(false);   // 🏠 실내에서 바로 나가도(🚪 내 마을로·차단·비공개) 퇴장 트래킹·안개 예외·층 선택 UI를 정리한다
  const v = visit; visit = null;
  hideNeighborHud();
  v.built.dispose();
  v.indoorBuilt?.dispose();
  $w.atNeighbor = false;
  player.position.set(NEIGHBOR_GATE.x, 0, NEIGHBOR_GATE.z + 3.6);   // 팻말 트리거(z+1.2, r 2.2) 밖 — 프롬프트가 곧바로 다시 뜨지 않게
  player.rotation.y = 0;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip();
  const sec = (performance.now() - v.t0) / 1000;
  trackEvent(...evVisitEnd(v.publicId, sec, v.reacted));   // [GA4] 머문 시간·반응 여부
  endView(v, sec, v.reacted);                              // [원장] 같은 값으로 village_views 를 닫는다
  gameState.neighbors = recordVisit(gameState.neighbors);   // 📖 8장 판정(visited ≥ 1)
  requestSave();
  setTimeout(() => syncStory('neighbor_visit'), 600);       // 📖 8장 — 마을로 돌아온 화면이 먼저 보이고 나서
}

// ── 🏠 이웃 집 실내(2026-10-11) — 전역 indoor/houseFloor 는 건드리지 않는다(내 집 저장·조명 분기 오염 방지) ──
function enterIndoor() {
  const v = visit; if (!v || v.indoor || !canEnterIndoor(v.view)) return;
  try {
    if (!v.indoorBuilt) v.indoorBuilt = buildNeighborIndoor(v.view);   // 처음 들어갈 때 한 번 짓고 방문 동안 유지
  } catch (e) {
    console.error('[neighbor] indoor build failed', e);
    trackEvent(...evFail('indoor', 'build'));
    ui.toast?.('🏠 집 안을 불러오지 못했어요', 2600);
    return;
  }
  v.indoor = { f: 0, t0: performance.now(), floors: new Set([0]), tags: new Set() };
  v.built.setVisible(false);
  v.indoorBuilt.setGroupVisible(true);
  v.indoorBuilt.show(0);
  setHostBubble(null); v.near = false;
  player.position.set(NEIGHBOR_INT.x, 0, NEIGHBOR_INT.z - 4); player.rotation.y = 0;   // 문(z−7) 프롬프트 반경 밖
  setFogExempt(player, true);
  setNeighborHudTitle(`🏡 ${v.view.nickname} 의 집`);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); $w.lastDoorPrompt = null;
  snapCamera(); setSpaceVisible();   // 🌧️ 빗소리 재판정(내 집 enterHouse 와 같다) — 비·계절 입자는 매 프레임 neighborIndoorFrame() 로 숨는다
  Sound.blip();
  trackEvent(...evIndoorEnter(v.publicId, v.view.houseStage, v.indoorBuilt.items.length));   // [GA4] 집 단계·가구 수
}

function leaveIndoor(toYard) {
  const v = visit; if (!v?.indoor) return;
  const s = v.indoor; v.indoor = null;
  trackEvent(...evIndoorExit(v.publicId, (performance.now() - s.t0) / 1000, s.floors.size, s.tags.size));   // [GA4] 머문 시간·층·이름표
  v.indoorBuilt.setGroupVisible(false);
  setFogExempt(player, false);
  player.position.y = 0;
  $w.lastFloorChoiceKey = null; ui.setFloorChoice?.(null);
  if (!toYard) return;
  v.built.setVisible(true);
  const d = v.built.doorSpot;
  player.position.set(d.x, 0, d.z + DOOR_R + 0.4); player.rotation.y = Math.PI;   // 문 앞 마당, 문 프롬프트 반경 밖
  setNeighborHudTitle(`🏡 ${v.view.nickname} 의 마을`);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); $w.lastDoorPrompt = null;
  snapCamera(); setSpaceVisible();   // 🌧️ 마당으로 나오면 비 오는 날 빗소리를 다시 켠다(toYard=false 는 exitNeighbor 가 부른다)
  Sound.blip();
}

function goIndoorFloor(f) {
  const v = visit; if (!v?.indoor) return;
  const def = v.indoorBuilt.floorDef(f); if (!def) return;
  const prev = v.indoor.f;
  v.indoor.f = f; v.indoor.floors.add(f);
  v.indoorBuilt.show(f);
  player.position.y = def.elevated ? ROOF_Y : 0;
  const h = def.half;
  player.position.x = Math.max(NEIGHBOR_INT.x - h + 1.5, Math.min(NEIGHBOR_INT.x + h - 1.5, player.position.x));
  player.position.z = Math.max(NEIGHBOR_INT.z - h + 1.5, Math.min(NEIGHBOR_INT.z + h - 1.5, player.position.z));
  if (f === 3 || (f === 0 && prev === 3)) {   // 🌿 정원 문 — 내 집 goFloor 와 같은 규칙(문 앞에 선다)
    const gd = gardenDoorLocal(h);
    player.position.set(NEIGHBOR_INT.x + gd.x - 0.6, player.position.y, NEIGHBOR_INT.z + gd.z);
    player.rotation.y = -Math.PI / 2;
  }
  $w.nearDoor = null; ui.setDoorPrompt?.(null); $w.lastDoorPrompt = null;
  $w.lastFloorChoiceKey = null; ui.setFloorChoice?.(null);
  Sound.blip();
  ui.toast?.(def.id === 'garden' ? `🌿 ${def.name}` : def.outdoor ? `☀️ ${def.name}` : `🏠 ${def.name}`, 1200);
}

// ── 🚩🚫 신고·차단(App Store 1.2) — 목록(list)·구경 중(visit) 두 입구가 같은 흐름. 게스트도 가능(서버가 하루 20건으로 막는다)
function openMore(publicId, from, anchor) {
  openNbMenu(anchor, {
    onReport: () => openReportModal(async (reason) => {
      const r = await neighborApi.report(publicId, reason);
      trackEvent(...evReport(publicId, reason, from, r.ok));       // [GA4] host·reason·from·ok
      ui.toast?.(r.ok ? '🚩 신고했어요. 운영자가 확인 후 조치해요.' : FAIL_TOAST, 2800);
    }),
    onBlock: () => openBlockConfirm(async () => {
      const r = await neighborApi.block(publicId);
      trackEvent(...evBlock(publicId, from, r.ok));                // [GA4] host·from·ok
      if (!r.ok) { ui.toast?.(FAIL_TOAST, 2600); return; }
      ui.toast?.('🚫 차단했어요. 이 이웃은 다시 나오지 않아요.', 3000);
      if (from === 'visit') { if (visit?.publicId === publicId) exitNeighbor(); }
      else if (isPickerOpen()) { closePickerModal(); openNeighborPicker('after_block'); }   // 목록을 새로 받는다(차단한 이웃 빠지고 다른 이웃이 채움)
    }),
  });
}

// ── 📒 방문 원장(village_views) — 광고 차단으로 GA4 가 빠져도 서버에 남는다(성공 기준: 주간 활동자 중 방문 경험) ──
//    탭을 닫으면 viewEnd 가 안 가서 ended_at·sec 이 비어 남는다(허용 — 방문 자체는 기록됨)
function startView(v) {
  v.viewReq = neighborApi.viewStart(v.publicId, v.slot, v.revisit).then((r) => {
    if (!r.ok) {
      //  🚫 차단 관계 — 쇼케이스는 익명 캐시라 들어와졌어도 서버가 막는다("상대도 내 마을에 올 수 없어요" 약속)
      if (r.reason === 'private') { if (visit === v) { exitNeighbor(); ui.toast?.('🔒 지금은 이 마을에 갈 수 없어요', 2600); } return null; }
      trackEvent(...evFail('view_start', r.reason)); return null;
    }
    v.viewId = r.viewId;
    return r.viewId;
  });
}

function endView(v, sec, reacted) {
  //  시작 응답이 아직이면 기다렸다 닫는다 · 시작이 실패했으면(이미 evFail) 닫을 행이 없다
  v.viewReq?.then((id) => id == null ? null : neighborApi.viewEnd(id, sec, reacted).then((r) => {
    if (!r.ok) trackEvent(...evFail('view_end', r.reason));
  }));
}

// ── 집주인 말풍선 · 반응 ──
const bubbleNow = () => ({ face: faceOf(visit.view.character), state: visit.bubble, onReact });

async function onReact(emoji) {
  const v = visit;
  if (!v || v.busy || v.bubble !== 'ask') return;
  v.busy = true;
  //  🔐 게스트는 서버가 어차피 login 을 준다 — 호출 자체를 생략(광장과 같은 규칙)
  const res = authState.isGuest ? { ok: false, reason: 'login' } : await neighborApi.react(v.publicId, emoji);
  v.busy = false;
  const out = reactOutcome(res);
  trackEvent(...evReact(v.publicId, emoji, out));            // [GA4] host·emoji·rewarded·reason
  if (out.reward) { giveReward({ coins: REWARD_COINS }, 'neighbor_visit', v.publicId); requestSave(); }   // [원장] econ_logs source=neighbor_visit · item=public_id
  if (out.reason === 'ok' || out.reason === 'dup') v.reacted = true;
  else if (out.reason !== 'login') trackEvent(...evFail('react', out.reason));
  if (out.toast) ui.toast?.(out.toast, 2400);
  if (out.bubble && visit === v) { v.bubble = out.bubble; if (v.near) setHostBubble(bubbleNow()); }
}

export function updateNeighbor(dt) {
  gateArt?.update(dt, performance.now() / 1000);
  if (!visit) return;
  visit.built.update(dt);
  if (visit.indoor) { visit.indoorBuilt.setLamp(nightLevel, visit.indoor.f); return; }   // 실내엔 집주인 말풍선 없음
  const h = visit.built.hostSpot;
  const near = Math.hypot(player.position.x - h.x, player.position.z - h.z) < HOST_TALK_R;
  if (near === visit.near) return;
  visit.near = near;
  setHostBubble(near ? bubbleNow() : null);
}

// ── game.js·doors.js 배선용(천문대 observatory.js 와 같은 자리) ──
/** 🏡 이웃 공간 프롬프트 — 마당: 나가는 길·집 문 / 🏠 실내: 마당으로·계단·정원 문·가구 이름표(안내뿐, nd=null) */
export function neighborPrompt(p) {
  const v = visit;
  if (v?.indoor) {
    const f = v.indoor.f, h = v.indoorBuilt.floorDef(f).half;
    const gd = gardenDoorLocal(h);
    const nearGarden = Math.hypot(p.x - (NEIGHBOR_INT.x + gd.x), p.z - (NEIGHBOR_INT.z + gd.z)) < 1.7;
    if (v.view.houseStage >= 7 && f === 0 && nearGarden) { $w.nearDoorFloor = 3; return { nd: 'nbfloor', prompt: '🌿 정원으로' }; }
    if (f === 3 && nearGarden) { $w.nearDoorFloor = 0; return { nd: 'nbfloor', prompt: '🏠 집 안으로' }; }
    if (f === 0 && Math.hypot(p.x - NEIGHBOR_INT.x, p.z - (NEIGHBOR_INT.z - h)) < 1.7) return { nd: 'nbexitin', prompt: '🚪 마당으로' };
    if (f !== 3) {
      const lay = stairLayout(h);
      if (Math.hypot(p.x - (NEIGHBOR_INT.x + lay.cx), p.z - (NEIGHBOR_INT.z + lay.cz)) < STAIR_PROMPT_R) {
        let up = v.indoorBuilt.floorDef(f + 1); if (up?.id === 'garden') up = null;
        const down = f > 0 ? v.indoorBuilt.floorDef(f - 1) : null;
        const opts = [];
        if (up) opts.push({ f: f + 1, label: `🪜 ${up.name}으로` });
        if (down) opts.push({ f: f - 1, label: `🪜 ${down.name}으로` });
        if (opts.length === 2) return { nd: 'nbfloorchoice', prompt: null, choice: opts.map(o => ({ key: o.f, label: o.label, onSelect: () => goIndoorFloor(o.f) })) };   // 내 집 6단계 2층과 같은 두 버튼
        if (opts.length === 1) { $w.nearDoorFloor = opts[0].f; return { nd: 'nbfloor', prompt: opts[0].label }; }
      }
    }
    const tag = v.indoorBuilt.tagAt(f, p.x, p.z);
    if (tag) { v.indoor.tags.add(tag.id); return { nd: null, prompt: `${tag.def.ico} ${t(tag.def.name)}` }; }
    return { nd: null, prompt: null };
  }
  if (Math.hypot(p.x - NEIGHBOR.x, p.z - (NEIGHBOR.z + NEIGHBOR_R)) < 2.2) return { nd: 'neighborexit', prompt: '🚪 내 마을로' };
  const d = v?.built.doorSpot;
  if (d && canEnterIndoor(v.view) && Math.hypot(p.x - d.x, p.z - d.z) < DOOR_R) return { nd: 'nbenter', prompt: '🚪 들어가 보기' };
  return { nd: null, prompt: null };
}

/** 🏡 액션 — 팻말·나가기·집 문·실내 문·계단. 이웃 공간 안에선 그 밖의 액션을 전부 삼킨다(남의 마당에서 밭이 갈리지 않게) */
export function neighborAction(nearDoor) {
  if (nearDoor === 'neighbor') return openNeighborPicker('sign');
  if (nearDoor === 'neighborexit') return exitNeighbor();
  if (nearDoor === 'nbenter') return enterIndoor();
  if (nearDoor === 'nbexitin') return leaveIndoor(true);
  if (nearDoor === 'nbfloor') return goIndoorFloor($w.nearDoorFloor);
}

/** 📷 이웃 실내 루프탑이면 true(루프탑 카메라) — game.js updateCamera */
export const neighborIndoorElevated = () => !!(visit?.indoor && visit.indoorBuilt.floorDef(visit.indoor.f)?.elevated);
/** 🗺️📷 이웃 실내면 중심·반경 — 아니면 null(game.js 카메라·미니맵·안개) */
export function neighborIndoorFrame() {
  if (!visit?.indoor) return null;
  return { c: NEIGHBOR_INT, half: visit.indoorBuilt.floorDef(visit.indoor.f).half };
}

/** 원형 마당 안쪽으로 제한 — 없으면 마을 반경 42 클램프가 입장하자마자 (0,42) 로 끌어당긴다 */
export function clampToNeighbor(p) {
  if (visit?.indoor) {   // 🏠 실내 — 방 반폭 안쪽(벽 충돌체가 막지만 모서리 빠짐 방지)
    const h = visit.indoorBuilt.floorDef(visit.indoor.f).half - 0.5;
    p.x = Math.max(NEIGHBOR_INT.x - h, Math.min(NEIGHBOR_INT.x + h, p.x));
    p.z = Math.max(NEIGHBOR_INT.z - h, Math.min(NEIGHBOR_INT.z + h, p.z));
    return;
  }
  const R = NEIGHBOR_R - 0.6, dx = p.x - NEIGHBOR.x, dz = p.z - NEIGHBOR.z, dd = Math.hypot(dx, dz);
  if (dd > R) { p.x = NEIGHBOR.x + dx / dd * R; p.z = NEIGHBOR.z + dz / dd * R; }
}

/** 🏡 미니맵 — 나가는 길(남쪽) · 이웃의 집 · 집주인 */
export function neighborMinimapMarks(marks) {
  if (visit?.indoor) return;   // 🏠 실내 미니맵엔 마당 표시 없음
  marks.push({ x: NEIGHBOR.x, z: NEIGHBOR.z + NEIGHBOR_R, c: '#c8905a', kind: 'exit' });
  marks.push({ x: NEIGHBOR.x, z: NEIGHBOR.z, c: '#e0b483', r: 4 });
  if (visit) marks.push({ x: visit.built.hostSpot.x, z: visit.built.hostSpot.z, c: '#ffd36e', r: 2.6 });
}

/** 이웃 공간에서 저장되면 팻말 앞으로 적는다 — 새로고침하면 마을에서 시작한다 */
export function neighborReturnPos() { return { x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z + 3.6 }; }

// ── 🎈 마을 입구 열기구 — buildEnvironment 가 한 번 부른다 ──
//    팻말(1.5m)이 안 보여 4일 방문 1/118 → 열기구(~5.5m) + 풍선 허리 띠 "이웃 마을"(2026-10-11 시안 B 확정)
let gateGroup = null;
let gateArt = null;   // 열기구 흔들림·등불 — updateNeighbor 가 돌린다
export function spawnNeighborGate() {
  if (gateGroup) return gateGroup;   // 두 번 불려도 열기구·충돌체가 겹치지 않게
  gateGroup = new THREE.Group();
  gateGroup.position.copy(NEIGHBOR_GATE);
  gateArt = buildNeighborBalloon(THREE, t('이웃 마을'));
  gateGroup.add(gateArt.group);
  scene.add(gateGroup);
  solidCircle(NEIGHBOR_GATE.x, NEIGHBOR_GATE.z, 0.65);                 // 바구니 충돌(1×1)
  obstacles.push({ x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z, r: 1.6 });   // 열기구 밑엔 밭·야외 장식 금지(말뚝 줄까지)
  return gateGroup;
}

// ── 접속(부팅) — ⚙️ 토글 묶기 + 다녀간 이웃 알림 + 첫 공개 안내 ──
let villagePublic = true;   // 서버 기본값과 같다. my_visitors 가 실제 값을 준다
export function initNeighbors() {
  bindVillagePublicToggle(toggleVillagePublic);
  const member = !!authState.online && !authState.isGuest;
  setVillagePublicUi(villagePublic, member);   // 게스트는 후보에 안 들어가므로 토글을 숨긴다
  if (!authState.online || !gameState.character || !gameState.tutorialSeen) return;   // 신규 온보딩(캐릭터 선택·튜토리얼)과 겹치지 않게
  setTimeout(dailyBanner, 14000);   // 게스트도 구경은 할 수 있다 — 다녀간 이웃 알림(6초)보다 뒤
  if (!member) return;
  setTimeout(bootVisitors, 6000);   // 출석·📮 소식 모달이 먼저 — 그 뒤 빈 화면을 기다려 띄운다
}

// 🏡 하루 한 번 "오늘의 이웃" 배너 — 누르면 목록이 열린다(기기당 KST 하루 1회)
function readBannerDay() { try { return localStorage.getItem(BANNER_KEY); } catch { return null; } }
function dailyBanner() {
  if (!bannerDue(readBannerDay(), Date.now())) return;
  whenNoModal(() => {
    if (visit || !inVillage2() || ui.anyModalOpen?.()) return;   // 실내·다른 공간·30초 넘게 창이 떠 있으면 오늘 몫을 쓰지 않고 다음 접속에 다시
    try { localStorage.setItem(BANNER_KEY, kstDay(Date.now())); } catch { /* 저장 못 해도 배너는 띄운다 */ }
    ui.showHintBanner?.({
      ico: '🏡', title: '오늘의 이웃이 기다려요', line: '눌러서 이웃 마을 구경 가기',
      near: () => true, attention: true,
      onShow: () => trackEvent(...evBanner('show')),   // [GA4] 배너 노출 → 탭 전환율
      onTap: () => { trackEvent(...evBanner('tap')); openNeighborPicker('banner'); },
      onDismiss: (reason) => { if (reason !== 'tap') trackEvent(...evBanner('dismiss')); },   // 탭은 done('tap') 이 먼저 부른다
    });
  });
}

async function bootVisitors() {
  const asked = Date.now();
  const r = await neighborApi.visitors(visitorsSince(gameState.neighbors.seenAt, asked));
  if (!r.ok) { trackEvent(...evFail('visitors', r.reason)); return; }   // 접속 직후라 토스트로 방해하지 않는다(GA4 로만)
  villagePublic = r.isPublic;
  setVillagePublicUi(villagePublic, true);
  whenNoModal(() => {
    if (r.total > 0) {
      const view = noticeView(r, faceOf);
      trackEvent(...evNotice(view.rows.length, view.total));   // [GA4] 보여 준 줄 수·전체 방문자 수
      openVisitorsModal(view, () => { gameState.neighbors = markSeen(gameState.neighbors, asked); requestSave(); firstPublicNotice(); });
    } else firstPublicNotice();
  });
}

function firstPublicNotice() {
  if (gameState.hintsSeen.neighborPublic || !villagePublic) return;
  gameState.hintsSeen.neighborPublic = true;
  requestSave();
  ui.toast?.('🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요', 4200);
}

// 출석·소식·안내 모달이 떠 있으면 닫힐 때까지 기다린다(최대 30초 — 그래도 안 닫히면 그냥 띄운다)
function whenNoModal(fn, tries = 0) {
  if (!ui.anyModalOpen?.() || tries >= 20) return fn();
  setTimeout(() => whenNoModal(fn, tries + 1), 1500);
}

async function toggleVillagePublic() {
  const next = !villagePublic;
  const r = await neighborApi.setPublic(next);
  if (!r.ok) { trackEvent(...evFail('toggle', r.reason)); ui.toast?.(FAIL_TOAST, 2400); return; }
  villagePublic = r.is_public;
  setVillagePublicUi(villagePublic, true);
  trackEvent(...evToggle(villagePublic));   // [GA4] 공개 끄기·켜기
}
