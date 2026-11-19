// =============================================================
//  🏡 이웃 공간 짓기·치우기 — NEIGHBOR(0,0,700)
//  ⚠️ 넘겨받은 뷰(js/neighbors/sanitize.js 결과)로만 그린다. 내 세이브는 읽지도 쓰지도 않는다 —
//     tests/neighbor-space.test.mjs 가 이 파일에 그 이름이 아예 없음을 잠근다.
//  ⚠️ 치울 때: 캐릭터·펫 재질은 내 캐릭터·펫과 공유(game.js makeCharacterPreview 주석) → 지오메트리만(disposeGeos).
//     집·구성품·장식·고정 세트는 여기서 새로 만든 것이라 disposeTree.
//  ⚠️ 구성품 애니메이션 등록(spaces/house.js 의 addon 애니 등록 함수)은 부르지 않는다 — 내 집의 전역 목록을 갈아 끼운다.
//     (tests/neighbor-space 가 그 함수 이름이 이 파일에 없음을 잠근다)
// =============================================================
import * as THREE from 'three';
import { buildCharacterMesh, disposeTree, dropKilnFlames, makeSignpost, fishMesh, mergeGeos, outdoorMesh, paintGeo, removeSolid, scene, solidBox, solidCircle } from '../game.js';
import { buildHouseModel, mountHouseAddons } from '../house/index.js';
import { prepHouseMeshes, unregisterWindows } from '../spaces/house.js';
import { spawnPet } from '../pet/render.js';
import { DOOR_COLORS, NEIGHBOR, NEIGHBOR_R, ROOF_COLORS, SEA_SPECIES, WALL_COLORS } from '../data/places.js';
import { stage7Boxes } from '../house-stage7.js';
import { hostSpot, houseSolidR, neighborPond, neighborPondView, neighborTable, pondCovers } from './rules.js';
import { buildTable } from '../table/build.js';
import { tableCovers } from '../table/site.js';
import { buildPond } from '../pond/build.js';
import { pondFishLimits } from '../pond/stage.js';
import { pondSignPos } from '../pond/sign.js';
import { buildPondSign } from '../pond/sign-build.js';
import { emojiSprite } from '../spaces/kitchen-stage.js';
import { hostStand } from './indoor-rules.js';
import { TABLE_SHAPES } from '../data/table.js';
import { PLATE_R, PLATE_RIM } from '../table/plates.js';
import { SEAT } from './seat-rules.js';
import { starLine } from './dish-rules.js';

export const GROUND_R = NEIGHBOR_R + 18;   // 34 — 언덕 끝 허공이 안 보이게(과수원 ORCHARD_HALF+16 과 같은 교훈). shadow-scope: 700−34−18 = 648m
const TREE_SPOTS = [[-15, -8], [-17, 3], [-13, 11], [15, -8], [17, 3], [13, 11], [-7, -16], [7, -16]];
const CANOPY_R = 1.1;
const GUEST_PLATE_X = 0.5, GUEST_PLATE_Z = 0.3, PLATE_TOP = 0.802, STAR_Y = 1.3, STAR_SIZE = 0.3;
const plateMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });

function guestPlate(tier, stars) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(PLATE_R, PLATE_R, 0.02, 14), plateMat(PLATE_RIM[tier] ?? PLATE_RIM.plain));
  rim.position.y = PLATE_TOP + 0.01;
  const food = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0).scale(PLATE_R * 2 - 0.18, 0.1, PLATE_R * 2 - 0.18), plateMat(0xc98a4b));
  food.position.y = PLATE_TOP + 0.07;
  g.add(rim, food);
  const n = [...starLine(stars)].length;
  for (let i = 0; i < n; i++) {
    const star = emojiSprite('⭐', STAR_SIZE);
    star.material.toneMapped = false;
    star.material.fog = false;
    star.position.set((i - (n - 1) / 2) * STAR_SIZE * 0.9, STAR_Y, 0);
    g.add(star);
  }
  return g;
}
const PAL = { roof: ROOF_COLORS, wall: WALL_COLORS, door: DOOR_COLORS };

/** 🎨 game.js applyHouseStyle 와 같은 규칙 — 0번 = 그 모델 기본색(prepHouseMeshes 가 baseColor 로 기억), 1~4 = 공용 팔레트.
 *  역할마다 기본색을 먼저 다 읽고 나서 칠한다(같은 재질을 두 메시가 쓰면 칠한 색을 기본색으로 읽는다). */
export function paintHouse(root, style) {
  const base = {};
  root.traverse(o => {
    const r = o.userData.role;
    if (o.isMesh && PAL[r] && base[r] == null) base[r] = o.userData.baseColor ?? o.material.color.getHex();
  });
  root.traverse(o => {
    const r = o.userData.role;
    if (!o.isMesh || !o.material || !PAL[r]) return;
    const list = [base[r], ...PAL[r].slice(1)];
    o.material.color.setHex(list[(style[r] | 0) % list.length]);
  });
}

// 1~2단계 — js/spaces/house.js buildHouseStage 와 같은 치수(그쪽은 전역 houseGroup 에 붙여서 못 쓴다). 정면 +z
function earlyHouse(stage) {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.24, 3), new THREE.MeshStandardMaterial({ color: 0xcaa06a, roughness: 0.85 }));
  deck.position.y = 0.22; g.add(deck);
  if (stage >= 2) {
    const logMat = new THREE.MeshStandardMaterial({ color: WALL_COLORS[0], roughness: 0.85 });
    for (const [x, z, ry] of [[0, 1.45, 0], [0, -1.45, 0], [1.45, 0, Math.PI / 2], [-1.45, 0, Math.PI / 2]]) {
      for (const y of [0.62, 1.0, 1.38]) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.9, 8), logMat);
        log.rotation.set(0, ry, Math.PI / 2); log.position.set(x, y, z); log.userData.role = 'wall'; g.add(log);
      }
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.14), new THREE.MeshStandardMaterial({ color: DOOR_COLORS[0], roughness: 0.85 }));
    door.position.set(0, 0.85, 1.55); door.userData.role = 'door'; g.add(door);
  }
  return g;
}

//  🧹 캐릭터·펫 — 지오메트리는 부를 때마다 새로 만든다(buildAnimalMesh·buildCosmetic·스킨·pet BUILD 모두 캐시 없음).
//     재질만 plushMat·꾸미기·pet matsFor 캐시로 내 캐릭터·펫과 공유 → 재질은 건드리지 않는다.
//     (예전엔 disposeSkin 만 불러 방문마다 캐릭터 21개 + 펫 6개 지오메트리가 샜다, 2026-10-12)
function disposeGeos(root) {
  root.traverse(o => { if (o.isMesh) o.geometry?.dispose(); });
}

// 고정 세트 — 바닥 · 울타리(남쪽 출구만 비움) · 나무 8그루
function fixedSet(pond, table) {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND_R, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xa9d68f, roughness: 1 }));
  ground.position.set(NEIGHBOR.x, 0.005, NEIGHBOR.z); ground.receiveShadow = true; g.add(ground);
  const wood = new THREE.MeshStandardMaterial({ color: 0xb98a4e, roughness: 0.9, flatShading: true });
  const postGeo = new THREE.BoxGeometry(0.16, 0.7, 0.16);
  const R = NEIGHBOR_R + 1.2;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.22) continue;   // +z(남쪽, 카메라 쪽) = 나가는 길
    if (pondCovers(pond, Math.cos(a) * R, Math.sin(a) * R) || tableCovers(table, Math.cos(a) * R, Math.sin(a) * R, 0.3)) continue;
    const post = new THREE.Mesh(postGeo, wood);
    post.position.set(NEIGHBOR.x + Math.cos(a) * R, 0.35, NEIGHBOR.z + Math.sin(a) * R); g.add(post);
  }
  const trunk = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.95, flatShading: true });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x6fb46a, roughness: 0.9, flatShading: true });
  for (const [x, z] of TREE_SPOTS) {
    if (pondCovers(pond, x, z, CANOPY_R) || tableCovers(table, x, z, CANOPY_R)) continue;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.2, 6), trunk);
    t.position.set(NEIGHBOR.x + x, 0.6, NEIGHBOR.z + z); t.castShadow = true; g.add(t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(CANOPY_R, 2.4, 7), leaf);
    c.position.set(NEIGHBOR.x + x, 2.2, NEIGHBOR.z + z); c.castShadow = true; g.add(c);
  }
  return g;
}

/** view → 씬에 올린 이웃 공간. dispose() 가 메시·충돌체·밤 점등 등록을 전부 되돌린다 */
export function buildNeighborScene(view) {
  const group = new THREE.Group(); group.name = 'neighbor';
  const solids = [];
  let host = null, pet = null, sign = null, t = 0, pondUpdate = null, pondDispose = null, tableDispose = null;
  let hostSeat = null, guestDish = null;
  const built = {
    group,
    hostSpot: null,
    doorSpot: null,
    setVisible(on) { group.visible = on; for (const c of solids) c.off = !on; },   // 🏠 실내에 있는 동안 마당을 끈다
    table: null,
    update(dt) { t += dt; host.position.y = hostSeat ? SEAT.y : Math.abs(Math.sin(t * 2.2)) * 0.04; pondUpdate?.(dt); },   // 반가워서 통통
    seatHost(pose) {
      hostSeat = pose;
      const at = pose || built.hostSpot;
      host.position.set(at.x, pose ? SEAT.y : 0, at.z);
      host.rotation.set(0, pose ? pose.ry : 0, 0);
      if (pet) pet.visible = !pose;
    },
    setTableSolid(on) { if (built.table) built.table.solid.off = !on; },
    showGuestDish(stars, tier) {
      clearGuestDish();
      if (!built.table) return;
      guestDish = guestPlate(tier, stars);
      guestDish.position.set(built.table.x + GUEST_PLATE_X, 0, built.table.z + GUEST_PLATE_Z);
      group.add(guestDish);
    },
    dispose() {
      clearGuestDish();
      pondDispose?.();
      tableDispose?.();
      for (const c of solids) removeSolid(c);
      if (sign) sign.userData.dead = true;                           // makeSignpost 의 rAF 등록이 철거 뒤에 돌지 않게
      unregisterWindows(group);                                      // 집 창문·정원등·화로 — 밤 점등 목록에서 뺀다
      dropKilnFlames(group);                                         // 🔥 장식 화덕 불꽃 — 전역 목록에서(부모 사슬이 살아 있을 때)
      scene.remove(group);
      if (host) { group.remove(host); disposeGeos(host); }
      if (pet) { group.remove(pet); disposeGeos(pet); }
      //  장식(화덕·발효통) 속 팻말까지 — 기둥 충돌체를 치우고 아직 rAF 등록 전이면 건너뛰게(rebuildFarm 과 같은 규칙)
      group.traverse(o => { if (o.userData.solid) removeSolid(o.userData.solid); o.userData.dead = true; });
      group.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) m?.map?.dispose?.(); });   // 팻말 캔버스·나무 텍스처 복제
      disposeTree(group);
    },
  };
  function clearGuestDish() {
    if (!guestDish) return;
    group.remove(guestDish);
    guestDish.traverse(o => { if (o.isMesh) o.geometry.dispose(); if (o.isSprite) o.material.dispose(); });
    guestDish = null;
  }

  try {
    const ps = neighborPond(view.pond, view.outdoor);
    const ts = neighborTable(view.table, ps, view.outdoor);
    group.add(fixedSet(ps, ts));

    const house = view.houseStage >= 3 ? buildHouseModel(THREE, view.houseStage, view.style || undefined) : earlyHouse(view.houseStage);
    if (view.houseStage >= 3) house.add(mountHouseAddons(THREE, view.houseStage, view.addons, view.style || undefined));
    house.position.copy(NEIGHBOR);   // 모델 정면이 +z — 마을은 houseGroup(π)·래퍼(π)로 상쇄하지만 여기선 돌리지 않는다
    group.add(house);

    for (const o of view.outdoor) {   // 앞마당 장식 — 집 터 기준 상대좌표. 충돌체는 두지 않는다(구경 공간)
      const m = outdoorMesh(o.id);
      m.position.set(NEIGHBOR.x + o.dx, 0, NEIGHBOR.z + o.dz);
      m.rotation.y = o.rot * Math.PI / 2;
      group.add(m);
    }

    if (ps) {
      const p = buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite, r: ps.r, stage: ps.stage, rim: ps.rim });
      pondDispose = () => p.dispose();
      p.group.position.set(NEIGHBOR.x + ps.dx, 0, NEIGHBOR.z + ps.dz);
      p.setContents(neighborPondView(view.pond), (sp) => SEA_SPECIES.find(s => s.id === sp)?.color ?? 0x6f8fa8, pondFishLimits(ps.stage));
      group.add(p.group);
      const s = buildPondSign({ mergeGeos, paintGeo, reach: false });
      const at = pondSignPos(p.group.position, ps.r, NEIGHBOR);
      s.group.position.set(at.x, 0, at.z);
      group.add(s.group);
      pondUpdate = (dt) => p.update(dt);
      pondDispose = () => { p.dispose(); s.dispose(); };
    }

    if (ts) {
      const tb = buildTable({ style: 'picnic', shape: ts.shape, dishes: view.table.dishes, mergeGeos, paintGeo });
      tableDispose = () => tb.dispose();
      tb.group.position.set(NEIGHBOR.x + ts.dx, 0, NEIGHBOR.z + ts.dz);
      group.add(tb.group);
      const x = tb.group.position.x, z = tb.group.position.z, f = TABLE_SHAPES[ts.shape];
      const solid = ts.shape === 'long' ? solidBox(x - f.hx, z - f.hz, x + f.hx, z + f.hz) : solidCircle(x, z, f.hx);
      solids.push(solid);
      built.table = { x, z, shape: ts.shape, solid };
    }

    //  전역 등록(창문 점등·충돌체)은 장식까지 다 지은 뒤에 — 그래도 아래서 터지면 catch 가 dispose 로 되돌린다
    prepHouseMeshes(house);          // 그림자 · 기본색 기억 · 밤 창문 등록(houseWindows) — 치울 때 unregisterWindows
    paintHouse(house, view.houseStyle);
    if (view.houseStage >= 7) for (const b of stage7Boxes(view.style, NEIGHBOR)) solids.push(solidBox(b.x0, b.z0, b.x1, b.z1));
    else if (view.houseStage >= 3) solids.push(solidCircle(NEIGHBOR.x, NEIGHBOR.z, houseSolidR(view.houseStage)));

    const spot = hostSpot(view.houseStage, view.style, NEIGHBOR);
    built.doorSpot = spot;                         // 🚪 실내 문 프롬프트 자리
    const stand = hostStand(spot);                 // 🙋 문 앞에서 비켜 선다(문 프롬프트·말풍선 겹침 방지)
    built.hostSpot = stand;
    host = buildCharacterMesh(view.character, { owned: [], equipped: view.equipped });
    host.position.set(stand.x, 0, stand.z);   // rotation 0 = +z(카메라) 를 본다
    group.add(host);
    solids.push(solidCircle(stand.x, stand.z, 0.45));
    if (view.pet) {
      pet = spawnPet(THREE, view.pet.kind, view.pet.stage);
      if (pet) { pet.position.set(stand.x + 1.1, 0, stand.z + 0.3); group.add(pet); }
    }

    sign = makeSignpost('🚪 내 마을로', NEIGHBOR.x + 2.4, NEIGHBOR.z + NEIGHBOR_R - 0.6);
    group.add(sign);
    scene.add(group);
  } catch (e) { built.dispose(); throw e; }   // 짓다 터지면 z≈700 에 투명 벽·밤 창문 등록이 남지 않게
  return built;
}
