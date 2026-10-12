// =============================================================
//  🏠 이웃 집 실내 짓기·치우기 — NEIGHBOR_INT(0,0,780)
//  스펙: docs/superpowers/specs/2026-10-11-neighbor-indoor-design.md §5.2
//  ⚠️ 넘겨받은 뷰로만 그린다 — 내 세이브·전역 층 상태는 읽지도 쓰지도 않는다(tests/neighbor-indoor-wiring 잠금).
//  ⚠️ 방은 층마다 같은 x,z 에 겹쳐 짓고 보이는 층만 켠다(내 집과 같은 구조) — 안 보이는 층의 충돌체는 off.
//  ⚠️ 방 창 재질은 전역 houseWindows 가 아니라 여기 windows 에 모은다(밤 점등은 setLamp 가).
//     단 층 전용 가구(decorMesh 의 샹들리에·파이어핏·수영장)는 전역 houseWindows 에 직접 넣는다 —
//     dispose 의 unregisterWindows(group) 가 이 그룹의 재질을 거기서 빼서 되돌린다.
// =============================================================
import * as THREE from 'three';
import { disposeTree, removeSolid, scene, setFogExempt, solidBox, solidCircle } from '../game.js';
import { buildRoomWith, decorMesh } from '../spaces/indoor.js';
import { unregisterWindows } from '../spaces/house.js';
import { floorAt, floorsFor } from '../house-floors.js';
import { DECOR, DECOR_SCALE } from '../data/catalog.js';
import { NEIGHBOR_INT, ROOF_Y } from '../data/places.js';
import { layoutRoom, nearestTag } from './indoor-rules.js';

const DEF_BY_ID = new Map(DECOR.map(d => [d.id, d]));

// 🌲 바깥 풍경(시안 C 확정, 2026-10-12) — 루프탑·정원에서 방 밖이 안개 빈 공간으로 보이지 않게 잔디 원판 + 나무 둘레.
//    마당(js/neighbors/scene.js fixedSet)과 같은 색·나무 모양. 충돌체 없음(방 벽이 막는다)
export const OUTSIDE = Object.freeze({ groundR: 40, trees: 14, treeR: 13 });
function buildOutside() {
  const g = new THREE.Group(); g.name = 'neighbor-indoor-outside';
  const ground = new THREE.Mesh(new THREE.CircleGeometry(OUTSIDE.groundR, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xa9d68f, roughness: 1 }));
  ground.position.set(NEIGHBOR_INT.x, -0.02, NEIGHBOR_INT.z); g.add(ground);   // 방 바닥(0~0.2) 아래
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.95, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x6fb46a, roughness: 0.9, flatShading: true });
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.2, 6), leafGeo = new THREE.ConeGeometry(1.1, 2.4, 7);
  for (let i = 0; i < OUTSIDE.trees; i++) {
    const a = (i / OUTSIDE.trees) * Math.PI * 2, r = OUTSIDE.treeR + (i % 3);   // 반지름을 조금씩 흔들어 울타리처럼 안 보이게
    const x = NEIGHBOR_INT.x + Math.cos(a) * r, z = NEIGHBOR_INT.z + Math.sin(a) * r;
    const t = new THREE.Mesh(trunkGeo, trunkMat); t.position.set(x, 0.6, z); g.add(t);
    const c = new THREE.Mesh(leafGeo, leafMat); c.position.set(x, 2.2, z); g.add(c);
  }
  return g;
}

export function buildNeighborIndoor(view) {
  const group = new THREE.Group(); group.name = 'neighbor-indoor';
  const windows = [];
  const solids = [];                  // { c, f } — 층 전환 때 off 토글
  const rooms = [];                   // { f, g }
  const decor = [];                   // { f, m }
  let items = [], lamp = null, curF = 0, shown = false;
  const roomSolid = (f) => (x, z, r) => { const c = solidCircle(x, z, r); solids.push({ c, f }); return c; };
  const floorDef = (f) => floorAt(view.houseStage, f);

  // 충돌체 on/off — 그룹이 보이고 현재 층일 때만 켠다. 계단 충돌체는 계단이 안 보이면 꺼진다(내 집 refreshStairsLandmarks 와 같다).
  const syncSolids = () => {
    for (const s of solids) s.c.off = !group.visible || s.f !== curF;
    for (const r of rooms) {
      const st = r.g.userData.st, c = st && st.userData.collider;
      if (c) c.off = !(group.visible && r.g.visible && st.visible);
    }
  };

  const built = {
    get items() { return items; },
    floorDef,
    show(f) {
      curF = f;
      for (const r of rooms) r.g.visible = r.f === f;
      for (const d of decor) d.m.visible = d.f === f;
      syncSolids();
      if (lamp) lamp.position.set(NEIGHBOR_INT.x, (floorDef(f)?.elevated ? ROOF_Y : 0) + 3.4, NEIGHBOR_INT.z);
    },
    setGroupVisible(on) {
      group.visible = on;
      shown = on;   // 조명 개수가 바뀌면 셰이더가 재컴파일된다 → visible 은 두고 세기만 0
      if (lamp && !on) lamp.intensity = 0;
      syncSolids();   // 마당에 있을 땐 z≈780 충돌체가 아무것도 막지 않게
    },
    tagAt: (f, x, z) => nearestTag(items, f, x, z),
    setLamp(night, f) {   // 내 집 공식(js/game.js interiorLamp) — 루프탑·정원(outdoor)에선 끈다
      if (lamp) lamp.intensity = !shown || floorDef(f)?.outdoor ? 0 : 1.8 + night * 2.6;
      // 창 점등 — 내 집 houseWindows 규칙(js/game.js: nightAmt * 2.1 * nightScale)과 같다
      for (const w of windows) w.emissiveIntensity = night * 2.1 * (w.userData.nightScale ?? 1);
    },
    dispose() {
      for (const s of solids) removeSolid(s.c);
      unregisterWindows(group);   // decorMesh 가 전역 houseWindows 에 넣은 가구 재질(샹들리에·파이어핏·수영장)을 뺀다
      if (lamp) scene.remove(lamp);
      scene.remove(group);
      group.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) m?.map?.dispose?.(); });   // woodMat 이 부를 때마다 복제한 텍스처 — disposeTree 는 map 을 안 치운다
      disposeTree(group);
    },
  };

  try {
    const floors = floorsFor(view.houseStage);
    for (const def of floors) {
      const g = buildRoomWith(def, { stage: view.houseStage, style: view.style, origin: NEIGHBOR_INT, windows, solidCircle: roomSolid(def.f) });
      // 계단 — 내 집 refreshStairsLandmarks 와 같은 규칙(위·아래 어느 한쪽이라도 갈 수 있을 때만)
      const st = g.userData.st;
      if (st) {
        const upOk = def.f < 2 && !!floorAt(view.houseStage, def.f + 1);
        const downOk = def.f > 0 && !!floorAt(view.houseStage, def.f - 1);
        st.visible = upOk || downOk;
      }
      rooms.push({ f: def.f, g });
      group.add(g);
    }
    items = layoutRoom(view.room || [], {
      origin: NEIGHBOR_INT, defOf: (id) => DEF_BY_ID.get(id), scale: DECOR_SCALE, roofY: ROOF_Y,
      elevated: (f) => !!floorDef(f)?.elevated,
    }).map((it) => ({ ...it, def: DEF_BY_ID.get(it.id) }));
    for (const it of items) {
      const m = decorMesh(it.id);
      m.position.set(it.x, it.y, it.z); m.rotation.y = it.ry;
      group.add(m); decor.push({ f: it.f, m });
      if (it.box) solids.push({ c: solidBox(...it.box), f: it.f });
    }
    lamp = new THREE.PointLight(0xffd9a0, 0, 26);
    scene.add(lamp);
    setFogExempt(group, true);
    group.add(buildOutside());   // 🌲 안개 예외 뒤에 붙인다 — 바깥은 마당처럼 멀수록 흐려진다
    scene.add(group);
    built.setGroupVisible(false);   // 들어갈 때 neighbor.js 가 켠다
    built.show(0);
  } catch (e) { built.dispose(); throw e; }
  return built;
}
