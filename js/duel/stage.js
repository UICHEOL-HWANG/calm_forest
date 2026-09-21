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

const ART_FN = { boar: makeBoar, raccoon: makeRaccoon };

const FACE_OFFSET = 1.8;   // 흔적 좌표에서 플레이어 반대편으로 두는 거리(스펙 고정값)

// 카메라 — 실측(2026-09-21, 콘솔에서 camera.project 로 플레이어·동물 바운딩박스 8꼭짓점을
//   전부 투영해 NDC 를 직접 쟀다. 눈대중 스크린샷보다 이 쪽이 "잘렸는지"를 정확히 잡는다):
//   · dist 4.0, height 2.35, aimY 0.55 : 데스크톱(aspect 1.55)에선 맞지만 세로 화면에선
//     플레이어·동물이 NDC x ±1.2~1.3 으로 화면 밖까지 튀어나갔다 — 흔적 간격(1.8)만큼
//     떨어뜨린 대상을 세로의 좁은 가로 화각(42°/0.46 ⇒ 실제 가로각 ≈22°)이 못 담는다.
//   · dist 9.0, height 3.7, aimY 0.62 : 708×1408(aspect 0.50)에선 NDC x [-0.93, 0.79] 로
//     들어오지만, **375×812(aspect 0.4618)는 그보다 더 좁아** NDC x −1.00 으로 왼쪽이 걸쳤다
//     (k 상한 1.75 는 두 폭이 같아도, 상한 안에서는 aspect 가 작을수록 가로 화각 자체가
//     더 좁아 여유가 줄어든다 — 실측 전엔 몰랐던 함정).
//   · dist 10.5, height 3.7, aimY 0.2 : 채택 — 375×812 기준 NDC x [-0.86, 0.74],
//     y [-0.05, 0.24] 로 카드(하단 ~40%, NDC y < −0.2) 위쪽·화면 안쪽에 여유 있게 든다.
//     데스크톱(aspect 1.55)에서는 NDC x [-0.47, 0.40] 로 더 작게 보인다. applyStationCamera 도
//     같은 k 로 보정하지만 거긴 피사체가 시설 하나뿐이라 이 문제를 실제로 겪지 않는다 —
//     대결은 **두 피사체가 1.8 떨어져 옆으로 늘어선** 구도라 가로로 담아야 할 각폭이 훨씬
//     넓다. k 상한(1.75)이 375×812 가 실제로 필요한 보정 배수(1.55/0.4618 ≈ 3.36)에
//     못 미치므로, 세로 화면에서 안 잘리려면 이 거리가 데스크톱 기준으로는 사실상 강제된다.
const CAM_DIST = 6.2;
const CAM_HEIGHT = 2.2;
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

  return { THREE: stage.THREE, scene, camera, player, savedCamPos, savedCamQuat, savedPlayerRotY, animalMesh, hidden, throws: [],
           mid: { x: midX, z: midZ }, perp: { x: perpX, z: perpZ }, k, bowls: null };
}

/** exitDuelStage(handle) — 카메라와 가려둔 오브젝트를 전부 되돌린다 */
export function exitDuelStage(handle) {
  if (!handle) return;
  const { scene, camera, player, savedCamPos, savedCamQuat, savedPlayerRotY, animalMesh, hidden } = handle;
  clearThrow(handle);
  for (const o of hidden) o.visible = true;
  scene.remove(animalMesh);
  camera.position.copy(savedCamPos);
  camera.quaternion.copy(savedCamQuat);
  player.rotation.y = savedPlayerRotY;
}

/** updateDuelStage(handle, dt) — 지금은 정적 구도라 비워 둔다(호출 안 해도 무방). */
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

const BOWL_GAP = 0.62;      // 그릇 사이 간격
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
  const { THREE, scene, mid, perp } = handle;
  const group = new THREE.Group();
  // 그릇 줄은 카메라(perp 방향)에 **수직**으로 — 그래야 셋이 나란히 보인다
  const ax = -perp.z, az = perp.x;
  const bowls = [];
  for (let i = 0; i < 3; i++) {
    const b = makeBowl(THREE);
    const o = (i - 1) * BOWL_GAP;
    b.position.set(mid.x + ax * o, 0.02, mid.z + az * o);
    scene.add(b);
    bowls.push(b);
  }
  handle.bowls = { group, meshes: bowls, axis: { x: ax, z: az }, slotPos: [0, 1, 2], startPos, crop: null };
  return handle.bowls;
}

/** 🥕 작물을 시작 그릇에 넣는다 — 그릇을 들고, 작물을 내려놓고, 다시 덮는다 */
export async function putCrop(handle, cropIco) {
  const st = handle?.bowls;
  if (!st) return;
  const { THREE, scene } = handle;
  const bowl = st.meshes[st.slotPos.indexOf(st.startPos)];
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
  if (st.crop) {
    const at = st.meshes[st.slotPos.indexOf(st.startPos)];
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
  const { mid, axis } = { mid: handle.mid, axis: st.axis };
  st.meshes.forEach((m, i) => {
    const o = (st.slotPos[i] - 1) * BOWL_GAP;
    m.position.set(mid.x + axis.x * o, 0.02, mid.z + axis.z * o);
  });
}

export function hideBowls(handle) {
  const st = handle?.bowls;
  if (!st) return;
  for (const m of st.meshes) handle.scene.remove(m);
  if (st.crop) { handle.scene.remove(st.crop); st.crop.material.map?.dispose(); st.crop.material.dispose(); }
  handle.bowls = null;
}

/** 카메라를 그릇 쪽으로 훅 밀어 넣거나(in) 1:1 구도로 뺀다(out). ms 동안 보간 */
export function zoomBowls(handle, inward, ms = 520) {
  if (!handle) return Promise.resolve();
  const { camera, mid, perp, k } = handle;
  const from = { p: camera.position.clone(), q: camera.quaternion.clone() };
  // 목표 구도 — 들어갈 땐 낮고 가깝게(그릇이 화면을 채운다), 나올 땐 원래 1:1 구도
  const t = camera.clone();
  if (inward) { t.position.set(mid.x + perp.x * 3.4 * k, 2.0 * k, mid.z + perp.z * 3.4 * k); t.lookAt(mid.x, 0.10, mid.z); }
  else { t.position.set(mid.x + perp.x * CAM_DIST * k, CAM_HEIGHT * k, mid.z + perp.z * CAM_DIST * k); t.lookAt(mid.x, CAM_AIM_Y, mid.z); }
  const to = { p: t.position.clone(), q: t.quaternion.clone() };
  const t0 = performance.now();
  return new Promise(res => {
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / ms);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;   // ease-in-out
      camera.position.lerpVectors(from.p, to.p, e);
      camera.quaternion.slerpQuaternions(from.q, to.q, e);
      if (u < 1) requestAnimationFrame(step); else res();
    };
    step();
  });
}
