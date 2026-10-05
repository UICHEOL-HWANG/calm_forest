// =============================================================
//  🔭 천문대 — 마을 게이트 + 실내 홀
// =============================================================
import {
  $w, Input, firstHint, mergeGeos, obstacles, player, playerAnchor, scene, setFogExempt,
  rollDifficulty, setSpaceVisible, snapCamera, solidBox, solidCircle, ui,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { OBSERVATORY, OBSERVATORY_GATE, OBSERVATORY_R } from '../data/places.js';
import { Sound, setBGMTheme } from '../sound.js';
import { R_BASE, STAIR_FOOT, STAIR_HALF_W, buildObservatoryExterior, stairHeight } from '../observatory/exterior.js';
import { starAbandon, starBegin, starSettle, starState } from '../observatory/star-run.js';
import { HALL_SOLIDS, TELESCOPE, buildObservatoryInterior } from '../observatory/interior.js';

export const OBSERVATORY_LIGHT = {
  hemi: 0.5, amb: 0.58, sun: 0.32, tint: 0xe8e5ff, sunTint: 0xfff1cf,
  player: 0.95, fog: 0x1a2552, near: 18, far: 46,
};

let gateGroup = null;
let lookState = null;
let lensOpen = false;   // 렌즈 뷰(불투명 오버레이)가 화면을 덮고 있는 동안 — 3D 렌더를 쉬어도 된다

/** 렌즈가 화면을 다 덮고 있나 — game.js 루프가 composer.render() 를 건너뛴다 */
export function observatoryLensOpen() { return lensOpen; }

export const LOOK_SECONDS = 0.7;   // 허리 숙이는 시간 → 끝나면 렌즈 뷰
const LEAN = 0.28;                 // 얼굴이 접안렌즈에 닿을 만큼만 — 더 숙이면 머리가 경통을 뚫는다
export const TELESCOPE_EYE = TELESCOPE.eye;
export const TELESCOPE_SPOT = { x: TELESCOPE_EYE.x, z: TELESCOPE_EYE.z + 0.5, r: 1.1 };


export function spawnObservatoryGate() {
  if (gateGroup) return gateGroup;   // 마을은 한 번만 짓는다 — 두 번 불려도 건물·충돌체가 겹치지 않게
  gateGroup = buildObservatoryExterior(mergeGeos);
  gateGroup.position.copy(OBSERVATORY_GATE);
  scene.add(gateGroup);
  obstacles.push({ x: OBSERVATORY_GATE.x, z: OBSERVATORY_GATE.z, r: 5.9 });
  const plinth = solidCircle(OBSERVATORY_GATE.x, OBSERVATORY_GATE.z, 5.7);
  //    계단 통로 폭 안에서는 기단 원을 건너뛰어 맨 위 디딤판·문 앞까지 오른다 — 대신 탑 벽에서 멈춘다
  plinth.except = p => Math.abs(p.x - OBSERVATORY_GATE.x) < STAIR_HALF_W && p.z > OBSERVATORY_GATE.z;
  solidCircle(OBSERVATORY_GATE.x, OBSERVATORY_GATE.z, R_BASE + 0.1);
  // 🪜 계단은 앞에서만 오른다 — 양옆을 얇은 벽으로 막아 옆에서 한 번에 1.2m 위로 튀어오르지 않게
  for (const sx of [-1, 1]) {
    const x0 = OBSERVATORY_GATE.x + sx * STAIR_HALF_W, x1 = x0 + sx * 0.12;
    solidBox(Math.min(x0, x1), OBSERVATORY_GATE.z + R_BASE, Math.max(x0, x1), OBSERVATORY_GATE.z + STAIR_FOOT);
  }
  return gateGroup;
}

// 🎥 The hall is small and the door is at the south edge, so a camera that just follows the
//    player leaves the bottom half of the screen empty. Pull the focus most of the way to the centre.
const CAM_PULL = 0.4;
export function observatoryCamFocus(pos, out) {
  return out.set(OBSERVATORY.x + (pos.x - OBSERVATORY.x) * CAM_PULL, pos.y, OBSERVATORY.z + (pos.z - OBSERVATORY.z) * CAM_PULL);
}

export function buildObservatoryHall() {
  const g = buildObservatoryInterior(mergeGeos, OBSERVATORY_R);
  g.position.copy(OBSERVATORY);
  g.visible = false;
  scene.add(g);
  return g;
}

let hallColliders = null;   // 홀은 다시 빌드하지 않으니 가구 충돌체도 한 번만 등록
export function ensureObservatoryHall() {
  if (!$w.observatoryGroup) $w.observatoryGroup = buildObservatoryHall();
  hallColliders ??= HALL_SOLIDS.map(s => s.r !== undefined
    ? solidCircle(OBSERVATORY.x + s.x, OBSERVATORY.z + s.z, s.r)
    : solidBox(OBSERVATORY.x + s.x1, OBSERVATORY.z + s.z1, OBSERVATORY.x + s.x2, OBSERVATORY.z + s.z2));
  return $w.observatoryGroup;
}

export function enterObservatory() {
  $w.atObservatory = true; setFogExempt(player, true);
  const hall = ensureObservatoryHall();
  hall.visible = true;
  player.position.set(OBSERVATORY.x, 0, OBSERVATORY.z + OBSERVATORY_R - 2.0);
  player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('observatory', '🔭', '천문대', '망원경으로 별자리를 이어 보는 곳이에요. 나갈 땐 남쪽 문');
  setBGMTheme('stars');   // 🎵 천문대 오르골
  Sound.blip(); trackEvent('observatory_enter');
}

function resetLookPose() {
  if (!lookState) return;
  playerAnchor.rotation.x = lookState.anchorX;
  player.position.y = 0;
  if (lookState.ownsLock) document.body.classList.remove('menu-open');
  lookState = null; lensOpen = false;
}

// 🎲 판 id — GA4(star_*)와 star_runs 를 잇는 열쇠. randomUUID 가 없는 오래된 웹뷰는 v4 모양으로 만든다
const newRunId = () => crypto.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = Math.random() * 16 | 0;
    return (ch === 'x' ? r : (r & 3) | 8).toString(16);
  });

// 🔭 숙이기가 끝나면: 별자리 수첩 → 카드 고르기 → 렌즈 한 판 → 닫으면 다시 수첩 → 수첩을 닫으면 자세를 푼다
async function openStarView() {
  const session = lookState;
  try {
    const [lens, book] = await Promise.all([import('../observatory/ui.js'), import('../observatory/book.js')]);
    if (lookState !== session) return;
    lensOpen = true;   // 수첩도 불투명 오버레이 — 그동안 3D 를 쉰다
    showBook(lens, book, session);
  } catch {
    ui.toast?.('🔭 별보기 준비 중이에요', 1600);
    resetLookPose();
  }
}

function showBook(lens, book, session, fresh = null) {
  if (lookState !== session) return;
  const { cleared, best } = starState();
  book.openStarBook({ cleared, best, fresh, onPick: c => startRun(lens, book, session, c), onClose: resetLookPose });
}

async function startRun(lens, book, session, c) {
  if (lookState !== session) return;
  const diff = rollDifficulty('star');   // 🎚️ ease 가 클수록 쉽다(느린 혜성·넓은 판정 창) — DIFFICULTY 와 같은 방향
  const ctx = { c, runId: newRunId() };
  let fresh = null;   // 이 판으로 열린 별자리 — 수첩으로 돌아가면 그 카드를 금빛으로(결과 카드에도 한 줄)
  try {
    await lens.openStarView({
      constellation: c, diff, ease: diff.ease,
      onResult: (summary, run) => {
        const r = starSettle(summary, run, diff, ctx);
        fresh = r.unlockedNext;
        return r;
      },
      onAbandon: (reason, run) => starAbandon(reason, run, diff, ctx),
      onClose: () => showBook(lens, book, session, fresh),
    });
  } catch {   // 수첩은 이미 닫혔다 — 렌즈가 안 열리면 자세까지 풀어 멈춘 화면을 남기지 않는다
    ui.toast?.('🔭 별보기 준비 중이에요', 1600);
    resetLookPose();
    return;
  }
  Object.assign(ctx, starBegin(c, diff, ctx.runId));   // star_start — 렌즈가 실제로 열렸을 때만
}

export function startObservatoryLook() {
  if (lookState) return;
  Input.setAnalog(0, 0);
  lookState = { t: 0, duration: LOOK_SECONDS, opened: false, anchorX: playerAnchor.rotation.x };
  lookState.ownsLock = !document.body.classList.contains('menu-open');
  document.body.classList.add('menu-open');
  player.position.set(OBSERVATORY.x + TELESCOPE_EYE.x, 0.18, OBSERVATORY.z + TELESCOPE_EYE.z);
  player.rotation.y = TELESCOPE_EYE.yaw;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  Sound.blip();
}

// 🪜 게이트 앞에서만 발밑 계단 높이로 부드럽게 올린다(카메라도 player.position 을 따라 같이 오른다).
//    다른 공간·순간이동으로 계단 영역을 벗어나면 띄워 둔 높이를 바로 내려놓는다.
let stairLift = false;
export function updateObservatoryStairs(dt) {
  const lx = player.position.x - OBSERVATORY_GATE.x, lz = player.position.z - OBSERVATORY_GATE.z;
  if (Math.abs(lx) > 3 || lz < 0 || lz > 10) {
    if (stairLift) { player.position.y = 0; stairLift = false; }
    return;
  }
  const target = stairHeight(lx, lz);
  player.position.y += (target - player.position.y) * Math.min(1, dt * 16);
  stairLift = player.position.y > 1e-3;
  if (!stairLift) player.position.y = 0;
}

export function updateObservatory(dt, t) {
  if (!lookState) return;
  player.position.set(OBSERVATORY.x + TELESCOPE_EYE.x, 0.18, OBSERVATORY.z + TELESCOPE_EYE.z);
  player.rotation.y = TELESCOPE_EYE.yaw;
  lookState.t = Math.min(lookState.duration, lookState.t + dt);
  const k = Math.min(1, lookState.t / lookState.duration);
  playerAnchor.rotation.x = LEAN * k;   // 양수 = 앞으로 숙임(접안렌즈에 눈 대기)
  $w.armWristK = 0;
  if (!lookState.opened && k >= 1) {
    lookState.opened = true;
    openStarView();
  }
}

export function exitObservatory() {
  resetLookPose();
  $w.atObservatory = false; setFogExempt(player, false);
  if ($w.observatoryGroup) $w.observatoryGroup.visible = false;
  player.position.set(OBSERVATORY_GATE.x, 0, OBSERVATORY_GATE.z + 8);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  setBGMTheme('main');    // 🎵 마을 테마 복귀
  Sound.blip(); trackEvent('observatory_exit');
}

// ── game.js 배선을 줄이려고 여기로 옮긴 공간 규칙들(박물관은 game.js 안에 같은 코드가 있다) ──

/** 🔭 원형 홀 안쪽으로 이동 제한 */
export function clampToObservatory(p) {
  const R = OBSERVATORY_R - 0.75, dx = p.x - OBSERVATORY.x, dz = p.z - OBSERVATORY.z, dd = Math.hypot(dx, dz);
  if (dd > R) { p.x = OBSERVATORY.x + dx / dd * R; p.z = OBSERVATORY.z + dz / dd * R; }
}

/** 🔭 시간대 무관 실내 조명 — 세기·색·광원 자리 3종 세트(박물관 MUSEUM_LIGHT 와 같은 규칙) */
export function applyObservatoryLight({ hemiLight, ambient, sunLight, playerLight, fog }) {
  const L = OBSERVATORY_LIGHT;
  hemiLight.intensity = L.hemi; ambient.intensity = L.amb; sunLight.intensity = L.sun;
  ambient.color.setHex(L.tint);
  sunLight.color.setHex(L.sunTint);
  sunLight.position.set(OBSERVATORY.x + 6, 14, OBSERVATORY.z + 9);
  sunLight.target.position.set(OBSERVATORY.x, 1.6, OBSERVATORY.z);
  sunLight.target.updateMatrixWorld();
  if (playerLight) playerLight.intensity = L.player;
  fog.color.setHex(L.fog); fog.near = L.near; fog.far = L.far;
}

/** 🔭 액션 버튼 — 문·나가기·망원경. 실내에선 그 밖의 액션을 전부 삼킨다(밭 갈기 등 방지) */
export function observatoryAction(nearDoor) {
  if (nearDoor === 'observatory') return enterObservatory();
  if (nearDoor === 'observatoryexit') return exitObservatory();
  if (nearDoor === 'telescope') return startObservatoryLook();
}

/** 🔭 실내 미니맵 — 나가는 문(남쪽) · 망원경 */
export function observatoryMinimapMarks(marks) {
  marks.push({ x: OBSERVATORY.x, z: OBSERVATORY.z + OBSERVATORY_R, c: '#c8905a', kind: 'exit' });
  marks.push({ x: OBSERVATORY.x + TELESCOPE_SPOT.x, z: OBSERVATORY.z + TELESCOPE_SPOT.z, c: '#f3d27a', r: 3.0 });
}
