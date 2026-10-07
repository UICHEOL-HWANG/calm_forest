// =============================================================
//  🏡 이웃 마을 — 오늘의 이웃 열기 · 입장/퇴장 · 집주인 반응 (공간 머리말)
//  스펙: docs/superpowers/specs/2026-10-07-neighbor-village-design.md
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 의 let 에 쓸 때는 `$w.x = …`.
//  🔒 게임 상태는 gameState.neighbors · gameState.hintsSeen.neighborPublic 만 쓴다(tests/neighbor-space 가 잠근다).
//     이웃 데이터는 visit 객체에만 둔다. 3D 는 js/neighbors/scene.js, 화면은 js/neighbors/ui.js.
// =============================================================
import { $w, ANIMALS, gameState, giveReward, makeSignpost, obstacles, player, requestSave, scene, setSpaceVisible, snapCamera, syncStory, ui } from '../game.js';
import * as THREE from 'three';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';
import { OUTDOOR } from '../data/catalog.js';
import { HOUSE_POS, NEIGHBOR, NEIGHBOR_GATE, NEIGHBOR_R } from '../data/places.js';
import { Sound } from '../sound.js';
import { sanitizeShowcase } from '../neighbors/sanitize.js';
import { FAIL_TOAST, HOST_TALK_R, REWARD_COINS, markSeen, noticeView, pickerRows, reactOutcome, recordVisit, visitorsSince } from '../neighbors/rules.js';
import { evFail, evNotice, evOpen, evReact, evToggle, evVisitEnd, evVisitStart } from '../neighbors/track.js';
import { neighborApi } from '../neighbors/net.js';
import { buildNeighborScene } from '../neighbors/scene.js';
import { inVillage2 } from './doors.js';
import { bindVillagePublicToggle, closePickerModal, hideNeighborHud, isPickerOpen, openPickerModal, openVisitorsModal, setHostBubble, setPickerBusy, setVillagePublicUi, showNeighborHud } from '../neighbors/ui.js';

let visit = null;          // { publicId, slot, revisit, view, built, t0, reacted, bubble:'ask'|'thanks', near, busy }
let pickerBusy = false;

const faceOf = (id) => (ANIMALS.find(a => a.id === id) || ANIMALS[0]).emoji;
const showcaseCtx = () => ({
  outdoorIds: new Set(OUTDOOR.map(d => d.id)), animalIds: new Set(ANIMALS.map(a => a.id)),
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
    openPickerModal(pickerRows(today.list, faceOf), today.rewardedToday, goVisit);
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
  showNeighborHud(entry.view.nickname, exitNeighbor);
  Sound.blip();
  trackEvent(...evVisitStart(entry));                        // [GA4] host·slot·revisit·load_ms
}

export function exitNeighbor() {
  if (!visit) return;
  const v = visit; visit = null;
  hideNeighborHud();
  v.built.dispose();
  $w.atNeighbor = false;
  player.position.set(NEIGHBOR_GATE.x, 0, NEIGHBOR_GATE.z + 3.6);   // 팻말 트리거(z+1.2, r 2.2) 밖 — 프롬프트가 곧바로 다시 뜨지 않게
  player.rotation.y = 0;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip();
  trackEvent(...evVisitEnd(v.publicId, (performance.now() - v.t0) / 1000, v.reacted));   // [GA4] 머문 시간·반응 여부
  gameState.neighbors = recordVisit(gameState.neighbors);   // 📖 8장 판정(visited ≥ 1)
  requestSave();
  setTimeout(() => syncStory('neighbor_visit'), 600);       // 📖 8장 — 마을로 돌아온 화면이 먼저 보이고 나서
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
  if (!visit) return;
  visit.built.update(dt);
  const h = visit.built.hostSpot;
  const near = Math.hypot(player.position.x - h.x, player.position.z - h.z) < HOST_TALK_R;
  if (near === visit.near) return;
  visit.near = near;
  setHostBubble(near ? bubbleNow() : null);
}

// ── game.js·doors.js 배선용(천문대 observatory.js 와 같은 자리) ──
/** 남쪽 출구 앞이면 'neighborexit' */
export function neighborDoor(p) {
  return Math.hypot(p.x - NEIGHBOR.x, p.z - (NEIGHBOR.z + NEIGHBOR_R)) < 2.2 ? 'neighborexit' : null;
}

/** 🏡 액션 — 팻말·나가기. 이웃 공간 안에선 그 밖의 액션을 전부 삼킨다(남의 마당에서 밭이 갈리지 않게) */
export function neighborAction(nearDoor) {
  if (nearDoor === 'neighbor') return openNeighborPicker('sign');
  if (nearDoor === 'neighborexit') return exitNeighbor();
}

/** 원형 마당 안쪽으로 제한 — 없으면 마을 반경 42 클램프가 입장하자마자 (0,42) 로 끌어당긴다 */
export function clampToNeighbor(p) {
  const R = NEIGHBOR_R - 0.6, dx = p.x - NEIGHBOR.x, dz = p.z - NEIGHBOR.z, dd = Math.hypot(dx, dz);
  if (dd > R) { p.x = NEIGHBOR.x + dx / dd * R; p.z = NEIGHBOR.z + dz / dd * R; }
}

/** 🏡 미니맵 — 나가는 길(남쪽) · 이웃의 집 · 집주인 */
export function neighborMinimapMarks(marks) {
  marks.push({ x: NEIGHBOR.x, z: NEIGHBOR.z + NEIGHBOR_R, c: '#c8905a', kind: 'exit' });
  marks.push({ x: NEIGHBOR.x, z: NEIGHBOR.z, c: '#e0b483', r: 4 });
  if (visit) marks.push({ x: visit.built.hostSpot.x, z: visit.built.hostSpot.z, c: '#ffd36e', r: 2.6 });
}

/** 이웃 공간에서 저장되면 팻말 앞으로 적는다 — 새로고침하면 마을에서 시작한다 */
export function neighborReturnPos() { return { x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z + 3.6 }; }

// ── 🏡 마을 입구 팻말 — buildEnvironment 가 한 번 부른다 ──
let gateGroup = null;
export function spawnNeighborGate() {
  if (gateGroup) return gateGroup;   // 두 번 불려도 팻말·충돌체가 겹치지 않게
  gateGroup = new THREE.Group();
  gateGroup.position.copy(NEIGHBOR_GATE);
  gateGroup.add(makeSignpost('🏡 이웃 마을 가는 길', 0, 0));   // 기둥 충돌체는 makeSignpost 가 다음 프레임에 등록
  scene.add(gateGroup);
  obstacles.push({ x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z, r: 1.2 });   // 팻말 위엔 밭·야외 장식 금지
  return gateGroup;
}

// ── 접속(부팅) — ⚙️ 토글 묶기 + 다녀간 이웃 알림 + 첫 공개 안내 ──
let villagePublic = true;   // 서버 기본값과 같다. my_visitors 가 실제 값을 준다
export function initNeighbors() {
  bindVillagePublicToggle(toggleVillagePublic);
  const member = !!authState.online && !authState.isGuest;
  setVillagePublicUi(villagePublic, member);   // 게스트는 후보에 안 들어가므로 토글을 숨긴다
  if (!member || !gameState.character || !gameState.tutorialSeen) return;   // 신규 온보딩(캐릭터 선택·튜토리얼)과 겹치지 않게
  setTimeout(bootVisitors, 6000);   // 출석·📮 소식 모달이 먼저 — 그 뒤 빈 화면을 기다려 띄운다
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
