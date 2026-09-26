// =============================================================
//  calm forest · 🐗🦝 대결 무대 — 카메라 클로즈업
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 전용 무대로 **전환하지 않는다**. 사건은 털린 밭 그 자리에서 벌어져야
//    인과가 끊기지 않는다. 카메라만 밀고, 끝나면 원래 시점으로 돌아온다.
//  ▶ 거리·높이는 실측으로 잡는다(applyStationCamera 의 주석과 같은 규칙).
//  ▶ 되돌릴 것(카메라 위치·숨긴 오브젝트)은 전부 handle 에 담는다 — 모듈 전역에
//    쌓으면 대결이 겹칠 때(연타·비동기 겹침) 서로의 것을 되살리게 된다.
//  ▶ stage = { THREE, scene, camera, player } 만 받는다. game.js 의 전역
//    (trees·outdoorMeshes 배열)은 안 보이므로, 가림 처리는 scene 을 직접 훑는다.
// =============================================================

import { makeBoar, makeRaccoon, DUEL_ART_H } from './art.js';
import { makeRaidScar } from './raid-art.js';
import { idle, hop, recoil, pump, pop, zoomPunch, flee, shake, decayTrauma, ZOOM_IN } from './motion.js';

const ART_FN = { boar: makeBoar, raccoon: makeRaccoon };

const FACE_OFFSET = 1.5;   // 털린 밭 중심에서 양쪽으로 서는 거리(밭 반폭 1 + 여유).
                           // 🥊 일대일 구도(2026-09-24): 플레이어도 밭 밖으로 옮겨 **플레이어 — 털린 밭 — 동물**
                           //    한 줄로 세운다. 예전엔 플레이어가 조사한 자리(밭 한가운데)에 앉은 채였고
                           //    동물만 2.7 떨어져 서서, 털린 밭이 화면에 안 잡혔다.

// 카메라 — 실측(2026-09-21). **375×812 에서 잘리지 않는 것**이 하한을 정한다.
//   ⚠️ 이 값들은 조건이 바뀌면 다시 재야 한다. 한 번 어겼다 — 데스크톱 구도만 보고
//      10.5 → 6.2 로 당겼더니 폰에서 멧돼지 뒷다리가 오른쪽으로 잘렸다(회귀).
//      그 사이 마주 서는 간격도 1.8 → 2.7 로 늘어서, 옛 실측값으로 되돌릴 수도 없었다.
//   측정한 값들(375×812, 간격 2.7, 몸통 붙은 모델 기준):
//     · 6.2 / 2.2 : 멧돼지 뒷다리가 오른쪽 가장자리에 걸림 — 기각
//     · 7.4 / 2.6 : 채택 — 둘 다 여유 있게 들고, 카드(하단 ~35%) 위로 뜬다
//     · 8.2 / 2.6 : 안 잘리지만 데스크톱에서 너무 작아진다 — 기각
//   세로 화면은 k(≤1.75)가 거리를 늘려 보정하지만, 375×812 가 실제로 필요한 배수
//   (1.55/0.4618 ≈ 3.36)에는 못 미친다. 그래서 기준 거리 자체가 폰에 맞춰 정해진다.
const CAM_DIST = 8.2;
const CAM_HEIGHT = 2.6;
const CAM_AIM_Y = 0.55;

/**
 * enterDuelStage(stage, { animal, x, z }) → handle
 *   stage: { THREE, scene, camera, player } — game.js 의 maybeDuel 이 그대로 넘긴다.
 *   x, z: 흔적(=털린 밭) 좌표. 동물은 거기서 플레이어 반대편으로 1.8 물러난 자리에 선다.
 */
export function enterDuelStage(stage, { animal, x, z }) {
  const { THREE, scene, camera, player } = stage;
  const make = ART_FN[animal] || makeBoar;

  // 플레이어 → 흔적 방향을 그대로 이어가 흔적 너머에 동물을 세운다(반대편 1.8).
  //   플레이어가 흔적 바로 위에 서 있는 등 방향이 0에 가까우면 −Z(마을 기본 정면)로 둔다.
  const toX = x - player.position.x, toZ = z - player.position.z;
  const toLen = Math.hypot(toX, toZ);
  const dirX = toLen > 0.001 ? toX / toLen : 0, dirZ = toLen > 0.001 ? toZ / toLen : -1;
  const animalX = x + dirX * FACE_OFFSET, animalZ = z + dirZ * FACE_OFFSET;
  const savedPlayerPos = player.position.clone();
  player.position.set(x - dirX * FACE_OFFSET, player.position.y, z - dirZ * FACE_OFFSET);

  const animalMesh = make(THREE);
  animalMesh.position.set(animalX, 0, animalZ);
  // ⚠️ lookAt 을 쓰지 않는다. Object3D.lookAt 은 **카메라·조명만** −Z 를 타겟으로 향하고
  //    일반 메시는 +Z 를 향한다(three 내부에서 인자가 뒤집힌다). art.js 모델은 −Z 가 정면이라
  //    lookAt 을 쓰면 정확히 **등을 돌린다** — 나란히 선 것처럼 보였던 원인이다(실측).
  //    −Z 정면 모델이 (dx,dz) 를 보려면 rotation.y = atan2(−dx, −dz) 다.
  animalMesh.rotation.y = Math.atan2(player.position.x - animalX, player.position.z - animalZ) + Math.PI;
  scene.add(animalMesh);

  // 플레이어도 동물을 본다 — 캐릭터 모델은 +Z 가 정면(game.js 의 atan2 관용구, lookAt 과 반대축)
  const savedPlayerRotY = player.rotation.y;
  player.rotation.y = Math.atan2(animalX - player.position.x, animalZ - player.position.z);

  // 카메라 — 둘을 잇는 선의 수직(옆) 방향에서 본다. 정면이면 한쪽이 다른 쪽을 가린다.
  const midX = (player.position.x + animalX) / 2, midZ = (player.position.z + animalZ) / 2;
  const lineX = animalX - player.position.x, lineZ = animalZ - player.position.z;
  const lineLen = Math.hypot(lineX, lineZ) || 1;
  const perpX = -lineZ / lineLen, perpZ = lineX / lineLen;   // 선을 90도 돌린 단위 벡터

  // 세로 화면 보정 — applyStationCamera 와 같은 계수. 데스크톱(aspect 1.55)에서 k=1.
  const k = Math.min(1.75, Math.max(1, 1.55 / (camera.aspect || 1.55)));

  const savedCamPos = camera.position.clone();
  const savedCamQuat = camera.quaternion.clone();

  camera.position.set(midX + perpX * CAM_DIST * k, CAM_HEIGHT * k, midZ + perpZ * CAM_DIST * k);
  camera.lookAt(midX, CAM_AIM_Y, midZ);

  // 가림 처리 — 카메라와 중점 사이에 선 나무·야외 장식을 잠깐 숨긴다(hideKilnOccluders 와
  //   같은 이유: 안개로는 못 지운다. 가리는 게 대상보다 카메라 쪽에 있어 더 가깝기 때문이다).
  //   🎃허수아비·🪵울타리는 "밭 근처에 두면 밤손님을 막는다"는 용도로 설계된 물건이라
  //   (js/game.js 의 OUTDOOR 설명), 대결이 열리는 바로 그 밭 근처에 서 있을 확률이 가장 높다 —
  //   빠뜨리면 가장 잘 가릴 것들이 안 가려진다.
  //   stage 가 outdoorMeshes 배열을 안 넘기므로 scene 최상위 자식을 훑어 식별한다:
  //   나무는 spawnTree 의 userData(canopy·trunk), 야외 장식은 placeOutdoor 가 예외 없이 붙이는
  //   userData.rec(js/game.js:10616, hideKilnOccluders 자신이 "시설 자기 자신"을 가릴 때도
  //   이 표식을 쓴다) 로 고른다. farmGroup·mineGroup 같은 구조적 그룹은 이 표식이 없어 안전하다.
  const hidden = hideOccludersBetween(scene, camera.position, midX, midZ);

  // 🥊 일대일 — 둘과 털린 밭만 남긴다(사용자 요청 2026-09-24: "일기토처럼 둘이만").
  //   가림 판정으로는 부족했다: 🧙방랑 상인이 카메라 바로 앞에 서고, 주민 "!"·이름표·
  //   밭 배지("씨앗을 넣어요")가 무대를 덮었다(실측). 남길 것(땅·밭 흙·작물)은 game.js 가
  //   stage.keep 으로 넘긴다 — 조명은 절대 끄지 않는다(끄면 화면이 새까매진다).
  const keep = new Set([player, animalMesh, ...(stage.keep || [])]);
  for (const o of scene.children) {
    if (!o.visible || o.isLight || keep.has(o) || hidden.includes(o)) continue;
    o.visible = false; hidden.push(o);
  }
  // ⚠️ 한 번 끄는 것으론 부족하다 — 게임 루프가 매 프레임 visible 을 다시 쓰는 것들이 있다
  //    (🏠집터 안내판·고리, 시설 표지 등. 실측: "나무 바닥(데크)" 표지가 결투 하늘에 떴다).
  //    렌더 직전마다 다시 끈다 — 누가 무엇을 켜든 대결 중엔 안 나온다. 끝나면 훅을 원래대로.
  const ownHook = Object.prototype.hasOwnProperty.call(scene, 'onBeforeRender');
  const prevHook = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    for (const o of hidden) o.visible = false;
    return prevHook.apply(this, args);
  };
  const restoreHook = () => { if (ownHook) scene.onBeforeRender = prevHook; else delete scene.onBeforeRender; };

  // 🐾 발밑 — 털린 밭. 밭 위 흔적과 같은 조형(raid-art.js)이라 "그 밭에서 붙는다"가 읽힌다.
  const scar = makeRaidScar(THREE, { animal, seed: x * 31 + z * 17, away: [dirX, dirZ] });
  scar.position.set(x, 0, z);
  scene.add(scar);

  const handle = { THREE: stage.THREE, scene, camera, player, savedCamPos, savedCamQuat, savedPlayerRotY, savedPlayerPos, animalMesh, hidden, scar, restoreHook, throws: [],
           mid: { x: midX, z: midZ }, perp: { x: perpX, z: perpZ }, k, bowls: null,
           bowlMid: { x: midX + dirX * 0.5, z: midZ + dirZ * 0.5 } };
  startMotion(handle, { dirX, dirZ });
  return handle;
  // ⚠️ 0.9 는 동물 발치까지 밀려 그릇을 깔고 앉은 꼴이었다(실측). 0.5 면 밭(반폭 1)을
  //    갓 벗어나면서 동물과도 떨어진다.
}


// ═══════════ 🎬 연출 루프 — 무대가 떠 있는 동안만 돈다(C안, 2026-09-27) ═══════════
//   사용자: "대결 때 화면이 아예 멈춰 있어 어색하다". game.js 메인 루프는 duelActive 동안
//   플레이어·카메라 갱신을 건너뛰므로(game.js 의 `!duelActive` 가드) 무대가 스스로 돌린다.
//   ▶ 카메라는 **기준 자세(handle.cam) + 줌·흔들림**을 매 프레임 합성한다. 그릇 줌(zoomBowls)도
//     카메라가 아니라 기준 자세를 움직인다 — 둘이 카메라를 따로 쓰면 서로 덮어쓴다.
//   ▶ 곡선·크기 상한은 motion.js(테스트 있음). 여기는 그걸 무대 오브젝트에 입히기만 한다.
const ACT_MS = { hop: 520, recoil: 560, pump: 900, tilt: 520, flee: 1500 };

function actorOf(obj, phase, away) {
  return { obj, phase, away, act: null, hidden: false,
           base: { x: obj.position.x, y: obj.position.y, z: obj.position.z, ry: obj.rotation.y, rz: obj.rotation.z,
                   sx: obj.scale.x, sy: obj.scale.y, sz: obj.scale.z } };
}

function startMotion(handle, { dirX, dirZ }) {
  const { THREE, camera, player, animalMesh, mid } = handle;
  handle.cam = { pos: camera.position.clone(), quat: camera.quaternion.clone(), aim: new THREE.Vector3(mid.x, CAM_AIM_Y, mid.z) };
  handle.fx = {
    t: 0, last: performance.now(), trauma: 0, zoom: 1, zoomTarget: 1, punch: null, slowUntil: 0, raf: 0, fists: [],
    // 📱 세로 화면(k>1)에선 줌을 안 쓴다 — 6% 만 당겨도 375×812 에서 멧돼지 엉덩이가 잘렸다(실측 2026-09-27,
    //    CAM_DIST 주석의 회귀와 같은 것). 대신 결정타 흔들림을 조금 더 준다.
    zoomOK: handle.k <= 1.05,
    actors: { player: actorOf(player, 0, { x: -dirX, z: -dirZ }), animal: actorOf(animalMesh, 0.5, { x: dirX, z: dirZ }) },
  };
  const step = (now) => {
    const fx = handle.fx; if (!fx) return;
    // 실제 시간으로 흐른다 — 0.05 로 자르면 느린 폰(20fps 미만)에서 ✊ 박자가 늘어진다. 탭 복귀 같은 긴 공백만 자른다
    const real = Math.min(0.25, (now - fx.last) / 1000); fx.last = now;
    const dt = now < fx.slowUntil ? real * 0.35 : real;    // 결정타 — 잠깐 느리게
    fx.t += dt;
    for (const a of Object.values(fx.actors)) applyActor(a, fx.t, dt);
    for (const sp of handle.throws) {                        // 🖐️ 낸 손이 톡 튀어나온다
      sp.userData.t = (sp.userData.t || 0) + dt;
      sp.scale.setScalar(0.62 * pop(sp.userData.t / 0.35));
    }
    fx.trauma = decayTrauma(fx.trauma, real);
    fx.zoom += (fx.zoomTarget - fx.zoom) * Math.min(1, real * 4);
    let k = fx.zoom;
    if (fx.punch) { const u = (now - fx.punch) / 700; if (u >= 1) fx.punch = null; else k *= zoomPunch(u); }
    applyCamera(handle, k, shake(fx.trauma, fx.t));
    fx.raf = requestAnimationFrame(step);
  };
  handle.fx.raf = requestAnimationFrame(step);
}

function applyActor(a, t, dt) {
  const { obj, base } = a;
  if (a.hidden) return;
  const i = idle(t, a.phase);
  let dy = i.dy, sy = i.sy, sx = i.sx, push = 0, turn = 0, tilt = 0;
  const act = a.act;
  if (act) {
    act.t += dt * 1000;
    const u = Math.min(1, act.t / act.ms);
    if (act.kind === 'hop') { const h = hop(u); dy += h.dy; sy *= h.sy; sx *= 2 - h.sy; }
    else if (act.kind === 'recoil') { push = recoil(u); tilt = -push * 0.6; }
    else if (act.kind === 'pump') dy += pump(u) * 0.5;
    else if (act.kind === 'tilt') tilt = Math.sin(u * Math.PI * 2) * 0.12;
    else if (act.kind === 'flee') { const f = flee(u); turn = f.turn; push = f.dist; dy += f.dy; if (u >= 1) { a.hidden = true; obj.visible = false; } }
    if (u >= 1) { a.act = null; act.done(); }
  }
  obj.position.set(base.x + a.away.x * push, base.y + dy, base.z + a.away.z * push);
  obj.rotation.y = base.ry + turn;
  obj.rotation.z = base.rz + tilt;
  obj.scale.set(base.sx * sx, base.sy * sy, base.sz * sx);
}

function applyCamera(handle, k, sh) {
  const { camera, cam } = handle;
  const v = cam.scratch || (cam.scratch = { d: new handle.THREE.Vector3(), r: new handle.THREE.Vector3(), u: new handle.THREE.Vector3() });
  camera.quaternion.copy(cam.quat);
  camera.position.copy(cam.aim).addScaledVector(v.d.copy(cam.pos).sub(cam.aim), k);
  // 흔들림은 화면 기준 좌우·위아래로 — 카메라 방향은 그대로 두고 자리만 턴다
  v.r.set(1, 0, 0).applyQuaternion(cam.quat);
  v.u.set(0, 1, 0).applyQuaternion(cam.quat);
  camera.position.addScaledVector(v.r, sh.x).addScaledVector(v.u, sh.y);
}

function stopMotion(handle) {
  const fx = handle?.fx; if (!fx) return;
  cancelAnimationFrame(fx.raf);
  for (const sp of fx.fists) { handle.scene.remove(sp); sp.material.map?.dispose(); sp.material.dispose(); }
  for (const a of Object.values(fx.actors)) {           // 자세를 원래대로(위치는 exitDuelStage 가 되돌린다)
    a.act?.done();
    const { obj, base } = a;
    obj.position.y = base.y; obj.rotation.z = base.rz; obj.scale.set(base.sx, base.sy, base.sz); obj.visible = true;
  }
  handle.fx = null;
}

const play = (handle, who, kind, ms = ACT_MS[kind]) => new Promise(res => {
  const a = handle?.fx?.actors[who]; if (!a || a.hidden) return res();
  a.act?.done();
  a.act = { kind, ms, t: 0, done: res };
});

/** 🎥 판 시작 — 살짝 줌인(on) / 원래 거리(off). 그릇 게임은 그릇 줌이 따로 있어 쓰지 않는다 */
export function roundZoom(handle, on) {
  if (handle?.fx) handle.fx.zoomTarget = on && handle.fx.zoomOK ? ZOOM_IN : 1;
}

/** ✊ 가위·바위·보! — 둘 다 머리 위 주먹을 세 번 흔든다 */
export async function pumpFists(handle) {
  const fx = handle?.fx; if (!fx) return;
  const { THREE, scene, player, animalMesh } = handle;
  const fists = [[player, 2.05], [animalMesh, 1.25]].map(([o, up]) => {
    const sp = handSprite(THREE, '✊'); sp.userData.o = o; sp.userData.up = up; scene.add(sp); fx.fists.push(sp); return sp;
  });
  const t0 = performance.now();
  const follow = () => {
    const u = Math.min(1, (performance.now() - t0) / ACT_MS.pump);
    for (const sp of fists) sp.position.set(sp.userData.o.position.x, sp.userData.up + pump(u), sp.userData.o.position.z);
    if (u < 1 && handle.fx) requestAnimationFrame(follow);
  };
  follow();
  await Promise.all([play(handle, 'player', 'pump'), play(handle, 'animal', 'pump')]);
  if (!handle.fx) return;                               // 그만두기로 이미 stopMotion 이 치웠다
  for (const sp of fists) { scene.remove(sp); sp.material.map?.dispose(); sp.material.dispose(); }
  handle.fx.fists = handle.fx.fists.filter(f => !fists.includes(f));
}

/** 판 결과 — 이긴 쪽 폴짝, 진 쪽 움찔 + 화면 흔들림. final 이면 줌 펀치 + 잠깐 느리게 */
export async function reactRound(handle, result, { final = false } = {}) {
  const fx = handle?.fx; if (!fx) return;
  if (result === 'draw') { await Promise.all([play(handle, 'player', 'tilt'), play(handle, 'animal', 'tilt')]); return; }
  const [winner, loser] = result === 'win' ? ['player', 'animal'] : ['animal', 'player'];
  fx.trauma = Math.max(fx.trauma, final ? (fx.zoomOK ? 0.85 : 1) : 0.55);
  if (final) { if (fx.zoomOK) fx.punch = performance.now(); fx.slowUntil = performance.now() + 500; }
  await Promise.all([play(handle, winner, 'hop'), play(handle, loser, 'recoil')]);
}

/** 승부 끝 — 이기면 동물이 뒤돌아 후다닥 도망, 지면 동물이 신나서 두 번 폴짝 */
export async function endMatch(handle, won) {
  if (!handle?.fx) return;
  roundZoom(handle, false);
  if (won) await Promise.all([play(handle, 'animal', 'flee'), play(handle, 'player', 'hop')]);
  else { await play(handle, 'animal', 'hop', 420); await play(handle, 'animal', 'hop', 420); }
}

/** exitDuelStage(handle) — 카메라와 가려둔 오브젝트를 전부 되돌린다 */
/** 하위 메시의 geometry·material 을 전부 버린다 — 판마다 새로 만들므로 안 버리면 쌓인다 */
function disposeTree(obj) {
  obj.traverse?.(o => {
    o.geometry?.dispose?.();
    if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.());
    else o.material?.dispose?.();
  });
}

export function exitDuelStage(handle) {
  if (!handle) return;
  stopMotion(handle);                                  // 🎬 연출 루프를 먼저 멈춘다 — 안 멈추면 되돌린 카메라를 다음 프레임에 다시 덮어쓴다
  hideBowls(handle);                                   // 중단해도 그릇·작물이 씬에 남지 않게
  const { scene, camera, player, savedCamPos, savedCamQuat, savedPlayerRotY, savedPlayerPos, animalMesh, hidden, scar, restoreHook } = handle;
  clearThrow(handle);
  restoreHook?.();                                     // ⚠️ 되살리기 **전에** 풀어야 다음 프레임에 다시 꺼지지 않는다
  for (const o of hidden) o.visible = true;
  scene.remove(animalMesh);
  disposeTree(animalMesh);
  if (scar) { scene.remove(scar); disposeTree(scar); }
  if (savedPlayerPos) player.position.copy(savedPlayerPos);
  camera.position.copy(savedCamPos);
  camera.quaternion.copy(savedCamQuat);
  player.rotation.y = savedPlayerRotY;
}

/** updateDuelStage(handle, dt) — 연출은 무대가 스스로 돌린다(startMotion). 옛 호출 자리 호환용으로만 남긴다. */
export function updateDuelStage(_handle, _dt) {}

/** 나무이거나(spawnTree 의 userData) 야외 장식(placeOutdoor 가 붙이는 userData.rec) 인가 */
function isOccluderCandidate(o) {
  if (!o.userData) return false;
  if (o.userData.canopy && o.userData.trunk) return true;   // 나무
  return !!o.userData.rec;                                  // 울타리·허수아비 등 야외 장식(시설 포함)
}

/** 카메라→중점 선분 위, 반경 1.1 안에 있는 나무·야외 장식만 잠깐 끈다 */
function hideOccludersBetween(scene, camPos, midX, midZ) {
  const hidden = [];
  const corridorR = 1.1;
  const dx = midX - camPos.x, dz = midZ - camPos.z;
  const len2 = dx * dx + dz * dz || 1;
  for (const o of scene.children) {
    if (!o.visible || !isOccluderCandidate(o)) continue;
    const px = o.position.x - camPos.x, pz = o.position.z - camPos.z;
    const t = (px * dx + pz * dz) / len2;
    if (t <= 0.05 || t >= 0.95) continue;   // 카메라 바로 앞·중점 너머는 가리는 게 아니다
    const cx = camPos.x + dx * t, cz = camPos.z + dz * t;
    if (Math.hypot(o.position.x - cx, o.position.z - cz) > corridorR) continue;
    o.visible = false; hidden.push(o);
  }
  return hidden;
}

export { DUEL_ART_H };


// ═══════════ ✊✌️🖐️ 낸 손 — 둘의 머리 위에 띄운다 ═══════════
//   ▶ DOM 카드에만 결과를 적으면 "내가 뭘 냈고 쟤가 뭘 냈는지"가 무대에서 안 보인다.
//     승부는 마주 선 둘 사이에서 벌어져야 하므로, 낸 손을 머리 위에 올린다.
//   ▶ 이모지를 캔버스에 그려 스프라이트로 쓴다 — 외부 이미지 없이(저장소 규칙) 또렷하다.
function handSprite(THREE, ico) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.font = '96px "Apple Color Emoji", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(ico, 64, 70);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(0.62, 0.62, 1);
  return sp;
}

/** 둘이 낸 손을 머리 위에 띄운다. 다음 판에 다시 부르면 이전 것을 치운다 */
export function showThrow(handle, mineIco, theirsIco) {
  if (!handle) return;
  clearThrow(handle);
  const { THREE, scene, player, animalMesh } = handle;
  for (const [ico, at, up] of [[mineIco, player.position, 2.05], [theirsIco, animalMesh.position, 1.25]]) {
    const sp = handSprite(THREE, ico);
    sp.position.set(at.x, up, at.z);
    sp.userData.t = 0;
    scene.add(sp);
    handle.throws.push(sp);
  }
}

export function clearThrow(handle) {
  if (!handle?.throws) return;
  for (const sp of handle.throws) { handle.scene.remove(sp); sp.material.map?.dispose(); sp.material.dispose(); }
  handle.throws.length = 0;
}


// ═══════════ 🥣 3D 그릇 — 카메라가 훅 들어갔다 나온다 ═══════════
//   ▶ DOM 버튼만 움직이면 "미니게임"이 아니라 그냥 카드다. 그릇을 무대에 실제로 놓고
//     카메라를 밀어 넣어 섞는 걸 보여준 뒤, 고를 때 1:1 구도로 뺀다.
//   ▶ 선택 입력은 DOM 버튼이 맡는다 — 모바일에서 작은 3D 오브젝트 탭은 빗나간다.
//     화면 자리만 3D 와 맞춰두면 눈과 손이 같은 곳을 가리킨다.

const BOWL_GAP = 0.78;      // 깊이로 늘어서므로 넉넉히 — 좁으면 앞뒤 그릇이 겹쳐 보인다
const BOWL_R = 0.26;        // 그릇 반지름

function makeBowl(THREE) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0, flatShading: true });
  // ⚠️ 엎어놓은 **반구 + 꼭지** 는 정확히 🌰밤 이다(실측 반려). 이 저장소가 여러 번 겪은 함정 —
  //    둥근 갈색 덩어리에 꼭지가 붙으면 무엇이든 밤으로 읽힌다.
  //    그래서 ① 옆면이 **직선**인 원뿔대(위가 좁고 아래가 넓은 컵을 엎은 모양)
  //          ② 윗면이 **평평**하다(밤은 꼭지가 뾰족하다)
  //          ③ 따뜻한 갈색이 아니라 **흰 도자기**색 — 밤에 없는 색이다.
  const top = BOWL_R * 0.62, bot = BOWL_R, h = BOWL_R * 1.15;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(top, bot, h, 10), mat(0xf2efe6));
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  // 굽 — 바닥에 닿는 테두리. 청록 띠 하나로 도자기라는 걸 못 박는다(밤엔 띠가 없다)
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(bot * 1.03, bot * 1.05, h * 0.14, 10), mat(0x8fb9b0));
  rim.position.y = h * 0.07;
  g.add(rim);
  // 윗면 — 평평하게 덮어 꼭지 없는 실루엣을 만든다
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(top * 1.06, top * 1.06, h * 0.10, 10), mat(0xe4dfd2));
  lid.position.y = h;
  g.add(lid);
  return g;
}

/** 🥕 작물 — 이모지를 캔버스에 그려 스프라이트로(외부 이미지 없이, 손 스프라이트와 같은 문법) */
function cropSprite(THREE, ico) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 96;
  const c = cv.getContext('2d');
  c.font = '72px "Apple Color Emoji", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(ico, 48, 54);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  sp.scale.set(0.34, 0.34, 1);
  return sp;
}

/** 부드러운 보간 한 번 — 그릇을 들었다 놓거나 작물을 내리는 데 쓴다 */
function tween(ms, fn) {
  const t0 = performance.now();
  return new Promise(res => {
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / ms);
      fn(u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
      if (u < 1) requestAnimationFrame(step); else res();
    };
    step();
  });
}

/** 그릇 3개를 무대에 놓고 작물을 하나에 넣는다. slotPos[i] = i 번 그릇이 지금 서 있는 자리 */
export function showBowls(handle, cropIco, startPos) {
  if (!handle) return;
  const { THREE, scene, perp } = handle;
  // ⚠️ 두 사람의 중점은 **털린 밭 위**다 — 거기 그릇을 놓으면 흙과 겹쳐 지저분하다(실측).
  //    동물 쪽으로 밀어 빈 땅에 차린다.
  const mid = handle.bowlMid;
  const group = new THREE.Group();
  // 그릇 줄을 **깊이(카메라 축)** 방향으로 둔다(사용자 지시 2026-09-21).
  //   ⚠️ 원근 탓에 앞 그릇이 더 크게 보이므로, 카메라를 높여 내려다보게 해 크기 차를 줄인다.
  const ax = perp.x, az = perp.z;
  const bowls = [];
  for (let i = 0; i < 3; i++) {
    const b = makeBowl(THREE);
    const o = (i - 1) * BOWL_GAP;
    b.position.set(mid.x + ax * o, 0.02, mid.z + az * o);
    scene.add(b);
    bowls.push(b);
  }
  handle.bowls = { group, meshes: bowls, axis: { x: ax, z: az }, slotPos: [0, 1, 2], startPos, crop: null, cropBowl: null };
  return handle.bowls;
}

/** 🥕 작물을 시작 그릇에 넣는다 — 그릇을 들고, 작물을 내려놓고, 다시 덮는다 */
export async function putCrop(handle, cropIco) {
  const st = handle?.bowls;
  if (!st) return;
  const { THREE, scene } = handle;
  const bowlIdx = st.slotPos.indexOf(st.startPos);
  st.cropBowl = bowlIdx;          // ⚠️ **그릇**을 기억한다. 자리를 기억하면 섞인 뒤 옆 그릇이 열린다
  const bowl = st.meshes[bowlIdx];
  const crop = cropSprite(THREE, cropIco);
  crop.position.set(bowl.position.x, 0.62, bowl.position.z);
  scene.add(crop);
  st.crop = crop;
  await tween(300, u => { bowl.position.y = 0.02 + u * 0.44; });      // 그릇을 든다
  await tween(320, u => { crop.position.y = 0.62 - u * 0.44; });      // 작물을 내려놓는다
  await tween(280, u => { bowl.position.y = 0.46 - u * 0.44; });      // 다시 덮는다
  crop.visible = false;                                               // 덮였으니 안 보인다
}

/** 고른 그릇을 열어 정답을 보여준다 — 맞았는지 그릇으로 확인시킨다 */
export async function openBowl(handle, slot) {
  const st = handle?.bowls;
  if (!st) return;
  const bowl = st.meshes[st.slotPos.indexOf(slot)];
  if (st.crop && st.cropBowl != null) {
    const at = st.meshes[st.cropBowl];        // 작물을 든 그 그릇(자리가 아니라)
    st.crop.position.set(at.position.x, 0.18, at.position.z);
    st.crop.visible = true;
  }
  await tween(280, u => { bowl.position.y = 0.02 + u * 0.46; });
  await new Promise(r => setTimeout(r, 620));
}

/** 그릇 두 자리를 바꾼다 — 화면 자리 기준(ui.js 의 domPos 와 같은 규약) */
export function swapBowls(handle, a, b) {
  const st = handle?.bowls;
  if (!st) return;
  const i1 = st.slotPos.indexOf(a), i2 = st.slotPos.indexOf(b);
  if (i1 < 0 || i2 < 0) return;
  [st.slotPos[i1], st.slotPos[i2]] = [st.slotPos[i2], st.slotPos[i1]];
  const { mid, axis } = { mid: handle.bowlMid, axis: st.axis };
  st.meshes.forEach((m, i) => {
    const o = (st.slotPos[i] - 1) * BOWL_GAP;
    m.position.set(mid.x + axis.x * o, 0.02, mid.z + axis.z * o);
  });
}

export function hideBowls(handle) {
  const st = handle?.bowls;
  if (!st) return;
  for (const m of st.meshes) { handle.scene.remove(m); disposeTree(m); }
  if (st.crop) { handle.scene.remove(st.crop); st.crop.material.map?.dispose(); st.crop.material.dispose(); }
  handle.bowls = null;
}

/** 카메라를 그릇 쪽으로 훅 밀어 넣거나(in) 1:1 구도로 뺀다(out). ms 동안 보간 */
export function zoomBowls(handle, inward, ms = 520) {
  if (!handle) return Promise.resolve();
  const { camera, mid, perp, k } = handle;
  // 🎬 연출 루프가 있으면 카메라가 아니라 기준 자세(handle.cam)를 움직인다 — 루프가 매 프레임 합성한다
  const cam = handle.cam;
  const from = cam ? { p: cam.pos.clone(), q: cam.quat.clone(), a: cam.aim.clone() } : { p: camera.position.clone(), q: camera.quaternion.clone() };
  // 목표 구도 — 들어갈 땐 낮고 가깝게(그릇이 화면을 채운다), 나올 땐 원래 1:1 구도
  const t = camera.clone();
  if (inward) {
    const b = handle.bowlMid;
    t.position.set(b.x + perp.x * 3.0 * k, 4.2 * k, b.z + perp.z * 3.0 * k);   // 높이↑↑ — 깊이 줄은 위에서 내려다봐야 셋이 갈린다
    t.lookAt(b.x, 0.12, b.z);
  }
  else { t.position.set(mid.x + perp.x * CAM_DIST * k, CAM_HEIGHT * k, mid.z + perp.z * CAM_DIST * k); t.lookAt(mid.x, CAM_AIM_Y, mid.z); }
  const b0 = handle.bowlMid;
  const to = { p: t.position.clone(), q: t.quaternion.clone(),
               a: inward ? new handle.THREE.Vector3(b0.x, 0.12, b0.z) : new handle.THREE.Vector3(mid.x, CAM_AIM_Y, mid.z) };
  const t0 = performance.now();
  return new Promise(res => {
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / ms);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;   // ease-in-out
      if (cam) { cam.pos.lerpVectors(from.p, to.p, e); cam.quat.slerpQuaternions(from.q, to.q, e); cam.aim.lerpVectors(from.a, to.a, e); }
      else { camera.position.lerpVectors(from.p, to.p, e); camera.quaternion.slerpQuaternions(from.q, to.q, e); }
      if (u < 1) requestAnimationFrame(step); else res();
    };
    step();
  });
}
