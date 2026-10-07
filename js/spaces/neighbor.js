// =============================================================
//  🏡 이웃 마을 — 오늘의 이웃 열기 · 입장/퇴장 · 집주인 반응 (공간 머리말)
//  스펙: docs/superpowers/specs/2026-10-07-neighbor-village-design.md
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 의 let 에 쓸 때는 `$w.x = …`.
//  🔒 게임 상태는 gameState.neighbors · gameState.hintsSeen.neighborPublic 만 쓴다(tests/neighbor-space 가 잠근다).
//     이웃 데이터는 visit 객체에만 둔다. 3D 는 js/neighbors/scene.js, 화면은 js/neighbors/ui.js.
// =============================================================
import { $w, ANIMALS, gameState, giveReward, player, requestSave, setSpaceVisible, snapCamera, syncStory, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';
import { OUTDOOR } from '../data/catalog.js';
import { HOUSE_POS, NEIGHBOR, NEIGHBOR_GATE, NEIGHBOR_R } from '../data/places.js';
import { Sound } from '../sound.js';
import { sanitizeShowcase } from '../neighbors/sanitize.js';
import { FAIL_TOAST, HOST_TALK_R, REWARD_COINS, pickerRows, reactOutcome, recordVisit } from '../neighbors/rules.js';
import { evFail, evOpen, evReact, evVisitEnd, evVisitStart } from '../neighbors/track.js';
import { neighborApi } from '../neighbors/net.js';
import { buildNeighborScene } from '../neighbors/scene.js';
import { closePickerModal, hideNeighborHud, openPickerModal, setHostBubble, setPickerBusy, showNeighborHud } from '../neighbors/ui.js';

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
  const view = r.ok ? sanitizeShowcase(r.data, showcaseCtx()) : null;
  if (!view) {
    trackEvent(...evFail('showcase', r.ok ? 'invalid' : (r.code || r.reason)));
    ui.toast?.(FAIL_TOAST, 2600);
    setPickerBusy(false);
    return;
  }
  closePickerModal();
  enterNeighbor({ publicId: row.publicId, slot: row.slot, revisit: row.done, view, loadMs: r.loadMs });
}

// ── 입장 · 퇴장 ──
export function enterNeighbor(entry) {
  if (visit) return;
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
  player.position.set(NEIGHBOR_GATE.x, 0, NEIGHBOR_GATE.z + 2.2);
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
export function neighborReturnPos() { return { x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z + 2.2 }; }
