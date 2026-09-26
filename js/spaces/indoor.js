// =============================================================
//  🏠 집 실내 — 방·계단·가구 배치 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, atFarm, camera, clayMat, clock, currentTool, decorGhost, decorMeshes, decorRot, decorTapHintShown,
  decorTarget, farmBuildingRecs, farmHalf, gameState, ghostOutdoor, habitatCtx, habitatEnvAt, houseFloor,
  houseWindows, indoor, interiorFloor, interiorFloors, interiorGroup, interiorLamp, lastNearMiss, mergeGeos,
  outdoorMesh, outdoorTarget, pickedDecor, pickedOutdoor, placeOutdoor, placingDecor, placingOutdoor, player,
  plots, pointer, raycaster, refreshInventoryUI, removeSolid, requestSave, scene, setFogExempt, setHeldDecor,
  setHeldTool, solidBox, solidCircle, spawnFloatText, ui, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { DECOR, DECOR_SCALE, FARM_PLACE_MSG, OUTDOOR, OUTDOOR_REACH } from '../data/catalog.js';
import { PLAYER_R } from '../data/character.js';
import { FARM, INT, ROOF_Y } from '../data/places.js';
import { TOOLS } from '../data/tools.js';
import { PAL } from '../data/world.js';
import { CELL as FARM_CELL, FARM_BUILDINGS, canPlaceBuilding, rotatedFp, snapCenter } from '../farm-building.js';
import { surveyYard } from '../farm-stage.js';
import { nearMiss, spotInfo } from '../habitat.js';
import { MAX_HOUSE_STAGE } from '../house-cost.js';
import { canPlaceOn, decorUnlocked, floorAt } from '../house-floors.js';
import { makeHouseHelpers } from '../house/index.js';
import { logEcon } from '../metrics.js';
import { Sound } from '../sound.js';
import { josa } from '../spaces/cafe.js';
import { unregisterWindows } from '../spaces/house.js';
import * as THREE from 'three';

export const INT_HALF = 7;

// 🎨 단계별 실내 마감 — 팔레트는 외관 모델(js/house/*.js)에서 가져와 안팎이 같은 집으로 읽히게 한다.
//    색만 담고 재질은 buildRoom 에서 만든다(방마다 fog 예외를 따로 걸어야 하므로).
//    tread/rail 은 계단 재질용, floor 는 바닥용 — 출처: cottage.js(3) · loft.js steel(4) · penthouse.js black(5) · villa.js interior/railGlass(6)
export const INT_FINISH = {
  3: { floor: { kind: 'wood',  c: 0xbfb0a0, rep: 7 }, tread: 0x9c6b40, rail: 0x8a5a36 },
  4: { floor: { kind: 'stone', c: 0xb9b3a8, rep: 6 }, tread: 0x23252a, rail: 0x23252a },
  5: { floor: { kind: 'stone', c: 0xe2ddd2, rep: 5 }, tread: 0xb98a4e, rail: 0x1e1f23 },
  6: { floor: { kind: 'stone', c: 0xf1ece3, rep: 4 }, tread: 0xf1ece3, rail: 'glass' },
};

export const finishFor = (stage) => INT_FINISH[Math.min(6, Math.max(3, stage || 3))];

// 🏠 지금 서 있는 층 정의 — houseStage 가 아직 안 연 층이면 1층 기본값으로.
export function curFloorDef() {
  return floorAt(gameState.houseStage, houseFloor) || { id: 'ground', half: INT_HALF, outdoor: false };
}

export function curHalf() { return curFloorDef().half; }

// 🏠 층 인덱스 f 의 바닥 높이 — floorAt(MAX_HOUSE_STAGE, f) 로 구조상 정의를 그대로 읽는다(해금 여부와 무관).
//   세이브 복원 중(applySave)엔 gameState.houseStage 가 아직 낮을 수 있어 curFloorDef() 대신 이걸 쓴다 —
//   f=2(루프탑)면 지금 단계와 상관없이 항상 ROOF_Y(가구 좌표는 층 인덱스로만 저장되니 복원해도 맞는 높이에 놓인다).
export function floorBaseY(f) { return floorAt(MAX_HOUSE_STAGE, f)?.outdoor ? ROOF_Y : 0; }

// 🌀 나선 계단 치수 — sims/stair-concepts/stairs.js(kind='spiral') 그대로 포팅(재설계 아님, 사용자 승인 조형).
//   오르내림을 한 몸으로 처리하는 단일 랜드마크 하나가 원형 구멍을 통과한다 — 직선형의
//   "오르는 계단(벽 붙박이)+내려가는 계단(바닥 구멍)" 두 오브젝트를 이것 하나로 대체한다(공간 절약이 재설계 이유).
export const SPIRAL_STEPS = 12, SPIRAL_RISE = 0.25, SPIRAL_R = 1.2, SPIRAL_NEWEL_R = 0.14;

export const SPIRAL_HOLE_R = SPIRAL_R + 0.15;

export const SPIRAL_STEP_DEG = 324 / SPIRAL_STEPS;

export const STAIR_PROMPT_R = 1.9;

// 🪜 계단 배치 좌표(순수 함수) — buildRoom(짓기)과 updateDoorInteract(프롬프트 판정)가
//   반드시 같은 공식을 써야 한다(계단을 옮기면 판정 좌표도 같이 옮긴다 — task-7 교훈).
//   컨셉 뷰어 stairs.js 의 layoutSpiral() 그대로: 구멍(=나선) 중심을 방 크기(H)에 비례해 잡는다.
export function stairLayout(H) {
  const cx = -H * 0.3, cz = -H * 0.05;
  return { cx, cz, r: SPIRAL_R, holeR: SPIRAL_HOLE_R };
}

// 두 점을 정확히 잇는 원기둥 — 각도를 손으로 계산하면 부호 실수가 낀다(컨셉 뷰어에서 이미 겪은 버그, stairs.js 그대로).
export function rodBetween(p1, p2, r, mat) {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2];
  const len = Math.hypot(dx, dy, dz);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.set((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  m.castShadow = true; return m;
}

// 방 한 채를 짓는다 — def = floorAt() 이 주는 층 정의(반경·실외 여부·id)
export function buildRoom(def) {
  const g = new THREE.Group(); g.position.set(INT.x, def.outdoor ? ROOF_Y : INT.y, INT.z);   // ☀️ 루프탑만 ROOF_Y 만큼 띄운다(내부 좌표는 그대로 — 방 전체가 같이 올라간다)
  g.userData.floorIdx = def.f;   // refreshStairsLandmarks 가 위/아래 목적지를 계산할 때 쓴다
  const H = def.half, W = H * 2;
  const fin = finishFor(gameState.houseStage);   // 🎨 집 단계에 맞춘 실내 마감(바닥·계단)
  const lay = stairLayout(H);       // 🪜 이 방의 계단 좌표(오르는 진입점 · 내려가는 구멍)
  const hasDown = def.f > 0;        // 1층(f=0)은 내려갈 곳이 없다 — 바닥에 구멍을 뚫지 않는다
  const HH = makeHouseHelpers(THREE);   // house/*.js 와 같은 box/glass 도우미(계단·유리 난간에 씀)
  // 바닥은 단계별 마감 — 루프탑(def.outdoor)은 표와 무관하게 나무 데크(villa.js 수영장 데크와 같은 널)
  //   돌·대리석은 가구용 나무 텍스처를 안 써서(베타 때 테이블·책장이 텍스처에 묻힌 문제 재발 방지) 평면 음영으로 둔다
  const floorMat = def.outdoor
    ? woodMat(3, 3, 0xc19a66)
    : fin.floor.kind === 'wood' ? woodMat(fin.floor.rep, fin.floor.rep, fin.floor.c)
                                : clayMat(fin.floor.c, false);
  // 🌀 바닥 — 내려갈 곳이 있는 층은 통 판에 THREE.Shape.holes 로 진짜 원형 구멍 하나를 낸다
  //   (나선 계단이 지나가는 자리). stairs.js 의 spiral 바닥과 같은 shape+extrude 방식 —
  //   메시 하나가 갈라지지 않아(직선형 포팅 때의 "4조각으로 쪼개져 가구 배치 레이캐스트가 1/4만
  //   먹힌" 회귀를 애초에 피한다) 그래도 다른 층과 구조를 맞추려 floorGroup 에 그대로 넣는다.
  const floorGroup = new THREE.Group(); g.add(floorGroup); g.userData.floorGroup = floorGroup;
  if (hasDown) {
    const outer = new THREE.Shape();
    outer.moveTo(-H, -H); outer.lineTo(H, -H); outer.lineTo(H, H); outer.lineTo(-H, H); outer.closePath();
    const holePath = new THREE.Path(); holePath.absarc(lay.cx, -lay.cz, lay.holeR, 0, Math.PI * 2, false);   // shape.y = -world z (stairs.js 규칙)
    outer.holes.push(holePath);
    const floorGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.2, bevelEnabled: false });
    floorGeo.rotateX(-Math.PI / 2);   // 회전 후 깊이(0~0.2)가 그대로 world y — 기존 박스 바닥(position.y=0.1 → [0,0.2])과 같은 범위라 translate 불필요
    const floor = new THREE.Mesh(floorGeo, floorMat); floor.receiveShadow = true; floorGroup.add(floor);
  } else {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, W), floorMat);
    floor.position.y = 0.1; floor.receiveShadow = true; floorGroup.add(floor);
  }
  if (def.outdoor) {   // ☀️ 루프탑 — 벽 대신 유리 난간, 하늘·밤별이 보인다
    // 🪟 외관 루프탑 모델(js/house/villa.js railGlass)과 같은 재질 — 스펙 "유리 난간", 불투명 크림색이면
    // 같은 건물처럼 안 읽힌다. H.glass() 는 기본 opacity 0.55 라 난간 전용으로 0.22 를 덮어쓴다.
    const rail = HH.glass(0xa9d8ea); rail.opacity = 0.22;
    [[0, H], [0, -H], [-H, 0], [H, 0]].forEach(([rx, rz], i) => {
      const w = i < 2 ? W : 0.12, d = i < 2 ? 0.12 : W;
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), rail);
      r.position.set(rx, 0.65, rz); g.add(r);
    });
    // 🏠 루프탑 계단실 박스는 짓지 않는다 — 사용자가 원한 건 "통과만 안 되게" 였지 구조물이
    //   아니었다(2026-09-18 지시 오해로 한 차례 지었다 철거). 나무 데크 + 유리 난간 + 원형 구멍
    //   (뒤이어 buildSpiralStair 가 짓는 테두리 난간 + solidCircle 차단)이 루프탑의 전부다.
  } else {
    const wall = () => clayMat(PAL.wall, false);
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, 3, 0.24), wall()); back.position.set(0, 1.5, H); back.castShadow = true; g.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3, W), wall()); left.position.set(-H, 1.5, 0); g.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3, W), wall()); right.position.set(H, 1.5, 0); g.add(right);
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffcaa0, emissiveIntensity: 0, roughness: 0.7 });
    houseWindows.push(winMat);
    [-H / 2.8, H / 2.8].forEach(wx => { const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 0.06), winMat); win.position.set(wx, 1.7, H - 0.1); g.add(win); });
    if (def.id === 'ground') {   // 1층에만 나가는 문
      const sideW = H - 1;            // 문 반폭 1
      const fL = new THREE.Mesh(new THREE.BoxGeometry(sideW, 3, 0.24), wall()); fL.position.set(-(1 + sideW / 2), 1.5, -H); g.add(fL);
      const fR = new THREE.Mesh(new THREE.BoxGeometry(sideW, 3, 0.24), wall()); fR.position.set((1 + sideW / 2), 1.5, -H); g.add(fR);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.24), wall()); lintel.position.set(0, 2.6, -H); g.add(lintel);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.1, 0.14), woodMat(1, 2, 0xa9743f)); door.position.set(0, 1.05, -H); g.add(door); // 나가는 문
    } else {
      const fw = new THREE.Mesh(new THREE.BoxGeometry(W, 3, 0.24), wall()); fw.position.set(0, 1.5, -H); g.add(fw);
    }
  }
  // 🌀 나선 계단 — 올라가지 않는다. 옆에 서면 프롬프트가 뜨는 표지물(스펙 §4.2).
  //   sims/stair-concepts/stairs.js(kind='spiral') 승인안 포팅. 좌표는 stairLayout(H) —
  //   updateDoorInteract 의 프롬프트 판정도 반드시 같은 공식을 쓴다(계단을 옮기면 판정 좌표도
  //   같이 옮긴다 — task-7 교훈). 실제로 보일지는 refreshStairsLandmarks() 가 지금 houseStage
  //   기준으로 매번 정한다(스펙 §3 "지금 그대로"). 계단 재질은 방에 하나씩(드로우콜, 스펙 §8.3).
  //   🔦 볼룸 함정(직선형 포팅 때 겪음, js/game.js:10216 UnrealBloomPass 임계 0.85): 나선은
  //   추가 광원을 넣지 않는다(컨셉 뷰어 확인 — grep 으로 PointLight 없음 재확인) — 형태·재질
  //   대비만으로 읽히게 짠 설계라 그 함정을 원천적으로 피한다.
  const treadMat = clayMat(fin.tread);
  const railMat = fin.rail === 'glass' ? HH.glass(0xa9d8ea) : clayMat(fin.rail);
  if (fin.rail === 'glass') railMat.opacity = 0.22;   // villa.js railGlass 와 같은 값
  // 🎨 4단계(브릭 로프트)는 난간·디딤판이 같은 색(0x23252a)이라 나선 형태에서 난간이 디딤판 바로 위를 지나가며
  //   통짜 검은 덩어리로 뭉쳤다(컨셉 뷰어에서 실측 확인). 난간 색만 밝혀(+0.16 HSL lightness) 분리한다.
  //   ⚠️ 리뷰에서 드러난 사고: 포팅 당시 INT_FINISH[4].tread 를 0x3a3d44 로 다르게 적어놔서
  //   (컨셉 승인안은 tread=rail=0x23252a) 이 조건이 게임에선 한 번도 안 걸렸다 — 컨셉 뷰어에서만
  //   밝아지고 실제 나선 계단은 계속 뭉쳐 있었다. tread 를 승인안 그대로 0x23252a 로 되돌려 조건이
  //   다시 걸리게 한다. 밝힌 색(#484c57, 휘도 0.30)은 UnrealBloomPass 임계 0.85(js/game.js:10219)에서
  //   한참 아래라 블룸 함정과는 무관 — 직선형 포팅 때 겪은 그 사고가 아니다.
  const spiralRailMat = (fin.rail !== 'glass' && fin.rail === fin.tread)
    ? clayMat(new THREE.Color(fin.tread).offsetHSL(0, 0, 0.16).getHex())
    : railMat;

  // 🪜 오르내림을 한 몸으로 — hasFlight(위로, def.f<2) · hasHole(아래로, def.f>0) 조합에 따라
  //   부분만 짓는다(직선형이 def.f<2/def.f>0 로 오르는/내려가는 계단을 따로 건 것과 같은 규칙,
  //   랜드마크 하나로 합쳤을 뿐): 1층(f=0)은 오르는 나선만(바닥에 구멍이 없다),
  //   루프탑(f=2)은 구멍+테두리 난간만(위로 갈 곳이 없다), 그 사이(f=1)는 둘 다.
  const buildSpiralStair = (hasFlight, hasHole) => {
    const st = new THREE.Group();
    const { cx, cz, r: R, holeR } = lay;
    const stepRad = (SPIRAL_STEP_DEG * Math.PI) / 180;
    const RAIL_LIFT = 0.9;
    const postPoint = (idx, top) => {
      const a = (idx + 0.5) * stepRad;   // 그 단의 바깥 가장자리 중앙(각도)
      return [cx + Math.cos(a) * (R - 0.06), idx * SPIRAL_RISE + (top ? RAIL_LIFT : 0), cz - Math.sin(a) * (R - 0.06)];
    };

    if (hasFlight) {
      // 쐐기 디딤판 — 한 장을 만들어 단마다 회전만 시킨다(재질·지오메트리 공유, 드로우콜 절감).
      const wedgeShape = new THREE.Shape();
      const rIn = SPIRAL_NEWEL_R + 0.04, segs = 5;
      for (let i = 0; i <= segs; i++) { const a = stepRad * i / segs; wedgeShape[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * R, -Math.sin(a) * R); }
      for (let i = segs; i >= 0; i--) { const a = stepRad * i / segs; wedgeShape.lineTo(Math.cos(a) * rIn, -Math.sin(a) * rIn); }
      wedgeShape.closePath();
      const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, { depth: 0.14, bevelEnabled: false });
      wedgeGeo.rotateX(-Math.PI / 2); wedgeGeo.translate(0, 0.14, 0);
      for (let i = 0; i < SPIRAL_STEPS; i++) {
        const tread = new THREE.Mesh(wedgeGeo, treadMat);
        tread.position.set(cx, i * SPIRAL_RISE, cz);
        tread.rotation.y = i * stepRad;
        tread.castShadow = true; st.add(tread);
      }
      // 중앙 기둥 — 얇은 디딤판이 떠 있는 게 아니라 굵은 기둥에 박혀 있는 것처럼 보이게 한다.
      const newelH = SPIRAL_STEPS * SPIRAL_RISE + 0.3;   // 천장(3.0)보다 살짝 더 올라간다(끝이 허전해 보이지 않게)
      const newel = new THREE.Mesh(new THREE.CylinderGeometry(SPIRAL_NEWEL_R, SPIRAL_NEWEL_R, newelH, 10), treadMat);
      newel.position.set(cx, newelH / 2, cz); newel.castShadow = true; st.add(newel);
      // 난간 기둥 — 두 단 걸러 세운다. "꼭대기" 좌표를 아래 손잡이 곡선의 제어점으로도 그대로 써서
      //   기둥이 손잡이를 뚫거나 못 미치는 불일치가 구조적으로 생길 수 없다.
      const postIdx = [0, 2, 4, 6, 8, 10, SPIRAL_STEPS - 1];
      postIdx.forEach(idx => {
        const newelPost = idx === 0; const r = newelPost ? 0.075 : 0.05;
        st.add(rodBetween(postPoint(idx, false), postPoint(idx, true), r, spiralRailMat));
      });
    }

    // 손잡이 — 나선을 그대로 따라 도는 매끈한 곡선 하나(TubeGeometry+CatmullRom).
    //   구멍이 있으면(hasHole) 테두리 난간(입구 쪽 35° 만 비움)을 같은 곡선 제어점에 이어붙여
    //   "따로 노는 원이 아니라 한 줄"로 만든다.
    let rimPts = null;
    if (hasHole) {
      const flightA0 = 0.5 * stepRad;   // 0단 바깥 가장자리 각도 — 곡선이 나선 손잡이와 만나는 자리
      const rimSpanRad = (325 * Math.PI) / 180, rimSegs = 24;
      rimPts = [];
      for (let i = rimSegs; i >= 0; i--) {   // 입구 쪽(먼 끝)에서 0단 방향으로 다가오는 순서 — 이어붙이기 순서 맞춤
        const a = flightA0 + (rimSpanRad * i) / rimSegs;
        rimPts.push([cx + Math.cos(a) * holeR, RAIL_LIFT, cz - Math.sin(a) * holeR]);
      }
    }
    const flightPts = hasFlight ? Array.from({ length: SPIRAL_STEPS }, (_, idx) => postPoint(idx, true)) : null;
    const curvePts = [...(rimPts || []), ...(flightPts || [])];
    if (curvePts.length >= 2) {
      const railCurve = new THREE.CatmullRomCurve3(curvePts.map(p => new THREE.Vector3(...p)));
      const railTube = new THREE.Mesh(new THREE.TubeGeometry(railCurve, hasFlight && hasHole ? 140 : hasFlight ? 100 : 80, 0.05, 8, false), spiralRailMat);
      railTube.castShadow = true; st.add(railTube);
    }
    if (rimPts) {
      // 손스침대 둘 — 입구(먼 끝)와 0단 쪽(반경이 holeR→R 로 줄어드는 지점), 둘 다 바닥에서 난간까지.
      st.add(rodBetween([rimPts[0][0], 0, rimPts[0][2]], rimPts[0], 0.09, spiralRailMat));
      st.add(rodBetween([rimPts[rimPts.length - 1][0], 0, rimPts[rimPts.length - 1][2]], rimPts[rimPts.length - 1], 0.08, spiralRailMat));
    }

    // 🚧 콜라이더 — 원형 발자국이라 solidCircle 로 정확히 막는다(각도에 상관없이 같은 반경에서 멈춘다).
    //   구멍이 있는 층(hasHole)은 구멍 전체를, 없는 층(1층)은 디딤판 바깥 반경을 — 둘 다 holeR 로
    //   통일해 단순하게(디딤판 R=1.2 보다 살짝 넉넉한 값이라 발이 걸리지 않는다).
    st.userData.collider = solidCircle(g.position.x + cx, g.position.z + cz, holeR);
    g.add(st);
    return st;
  };

  g.userData.st = buildSpiralStair(def.f < 2, hasDown);   // f<2 = 위로 갈 수 있는 구조(1·2층) · hasDown(f>0) = 아래로 갈 구멍
  scene.add(g); g.visible = false;
  setFogExempt(g, true);   // 방은 안개 밖(작은 방이라 안개가 지척의 벽까지 흐리게 만든다 — 루프탑도 좁아 같은 이유로 예외)
  return g;
}

// 🏠 층 4개(1층·다락·2층·루프탑)를 항상 다 지어 두고 층 전환 때 보이는 것만 바꾼다(드로우콜은 늘지 않는다).
//   floorsFor(stage) 는 그 단계에서 "열린" 층만 주므로, 정의 4개를 다 뽑으려면 각자 열리는 최소 단계로 조회한다.
export function buildInterior() {
  const defs = [floorAt(4, 0), floorAt(4, 1), floorAt(5, 1), floorAt(6, 2)];   // ground · attic · upper · roof
  $w.interiorFloors = {};
  for (const def of defs) interiorFloors[def.id] = buildRoom(def);
  $w.interiorGroup = interiorFloors.ground;
  $w.interiorFloor = interiorGroup.userData.floorGroup;
  if (!interiorLamp) {   // 🏠 증축으로 재호출돼도 조명은 한 번만(rebuildInteriorFinish 경로)
    $w.interiorLamp = new THREE.PointLight(0xffd9a0, 0, 26); interiorLamp.position.copy(INT).add(new THREE.Vector3(0, 3.4, 0));
    scene.add(interiorLamp);
  }
  refreshStairsLandmarks();
}

// 🪜 계단 랜드마크(방마다 하나)를 지금 houseStage 에서 어느 한쪽이라도 실제로 갈 수 있을 때만 보이게 한다
//   (스펙 §3 위반 A 수정). houseStage 는 플레이 중 올라갈 수 있어 매번 다시 계산해야 한다 —
//   setSpaceVisible·증축 직후 호출.
export function refreshStairsLandmarks() {
  for (const id in interiorFloors) {
    const room = interiorFloors[id];
    const f = room.userData.floorIdx;
    const st = room.userData.st;
    if (!st) continue;
    const upOk = f < 2 && !!floorAt(gameState.houseStage, f + 1);
    const downOk = f > 0 && !!floorAt(gameState.houseStage, f - 1);
    st.visible = upOk || downOk;
    // 🚧 방(다른 층)이 지금 안 보이면 이 콜라이더도 꺼야 한다 — 네 방이 같은 좌표(INT)에 겹쳐 있어서,
    //    안 보이는 층의 콜라이더를 켜 두면 지금 서 있는 층에 안 보이는 벽이 생긴다(Task 4 review Critical 2 재발).
    if (st.userData.collider) st.userData.collider.off = !(room.visible && st.visible);
  }
}

// 가구 메시(로우폴리)
// 🏖️ 파라솔 캔버스 패널 하나(부채꼴, a0~a1) — 이 게임 카메라는 늘 위에서 내려다보므로 윗면이 핵심이다.
//   가장자리 반지름을 sin 으로 부풀려(솔기=0 → 패널 중앙=최대 → 솔기=0) 스캘럽(물결) 테두리를 만들고,
//   중앙(hub)에서 테두리까지 고리를 RSEGS 단으로 나눠 볼록한 곡선(prof)으로 낮춘다 — 위에서 내려다봐도
//   고리마다 면 방향이 달라 중심이 도드라지는 "돔" 음영이 생긴다(2026-09-18: 부채꼴 1장짜리 팬이라 평평해
//   보이던 문제 수정). 색이 다른 패널·흰 솔기까지 전부 정점색(vertex color)으로 구분해 mergeGeos 로 한
//   지오메트리에 합친다 — 재질은 결국 하나(§8.3, 🏛️전시물과 같은 기법).
export function parasolPanel(a0, a1, rNear, bulge, yHub, yRim, dip, segs, color) {
  const RSEGS = 3;   // 중심→테두리 고리 단수 — 많을수록 곡면이 부드러워지지만 로우폴리 각짐은 유지
  const pos = [], col = [];
  const ring = (u, t) => {                                    // u: 중심(0)→테두리(1), t: 패널 내 각도 진행(0~1)
    const bump = Math.sin(t * Math.PI);                       // 0(솔기)→1(패널 중앙)→0(솔기)
    const rOuter = rNear + bulge * bump, yOuter = yRim - dip * bump;   // 테두리 반지름·높이(스캘럽 — 기존과 동일)
    const prof = 1 - Math.cos(u * Math.PI / 2);               // 0→1, 중심 근처는 완만하고 테두리로 갈수록 가팔라지는 볼록 곡선
    const a = a0 + (a1 - a0) * t;
    return [Math.cos(a) * (rOuter * u), yHub - (yHub - yOuter) * prof, -Math.sin(a) * (rOuter * u)];
  };
  for (let ri = 0; ri < RSEGS; ri++) {
    const u0 = ri / RSEGS, u1 = (ri + 1) / RSEGS;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const p10 = ring(u1, t0), p11 = ring(u1, t1);
      if (ri === 0) {   // 첫 고리는 중심 한 점(꼭대기)으로 모이므로 삼각형 하나만
        pos.push(0, yHub, 0, ...p10, ...p11);
        for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
      } else {
        const p00 = ring(u0, t0), p01 = ring(u0, t1);
        pos.push(...p00, ...p10, ...p11, ...p00, ...p11, ...p01);   // 고리 사이 사각형 = 삼각형 2개
        for (let k = 0; k < 6; k++) col.push(color.r, color.g, color.b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();   // 정점 공유가 없는 팬이라(비인덱스) 삼각형별 평면 노멀 = 로우폴리 각짐 그대로
  return geo;
}

export function decorMesh(id) {
  const root = new THREE.Group();
  const g = new THREE.Group(); g.scale.setScalar(DECOR_SCALE); root.add(g);   // 부품은 여기에 — 배율은 안쪽만
  if (id === 'rug') {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 20), clayMat(0xff9e9e, false)); r.position.y = 0.02; g.add(r);
  } else if (id === 'plant') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.3, 8), clayMat(0xd98b6a)); pot.position.y = 0.15; g.add(pot);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), clayMat(0x86d18a)); leaf.position.y = 0.5; g.add(leaf);
  } else if (id === 'chair') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), woodMat(1, 1)); seat.position.y = 0.45; g.add(seat);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), woodMat(1, 1)); bk.position.set(0, 0.7, -0.2); g.add(bk);
    [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.07), clayMat(0x6b4a34)); l.position.set(x, 0.22, z); g.add(l); });
  } else if (id === 'table') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.7), woodMat(2, 1)); top.position.y = 0.6; g.add(top);
    [[-.45, -.28], [.45, -.28], [-.45, .28], [.45, .28]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), woodMat(1, 1)); l.position.set(x, 0.3, z); g.add(l); });
  } else if (id === 'lamp') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.3, 6), clayMat(0x5a5148)); pole.position.y = 0.65; g.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffca70, emissiveIntensity: 0.85, roughness: 0.6 })); shade.position.y = 1.35; g.add(shade);
  } else if (id === 'sofa') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.7), clayMat(0x9ec7ff, false)); base.position.y = 0.3; g.add(base);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.2), clayMat(0x9ec7ff, false)); bk.position.set(0, 0.6, -0.25); g.add(bk);
  } else if (id === 'aquarium') {
    // 받침대 + 유리 물통 + 물 + 헤엄치는 물고기
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.42), woodMat(1, 1)); stand.position.y = 0.1; g.add(stand);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.44, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0 }));
    glass.position.y = 0.42; g.add(glass);
    const water = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x4aa6d0, transparent: true, opacity: 0.55, roughness: 0.25, emissive: 0x184a63, emissiveIntensity: 0.5 }));
    water.position.y = 0.4; g.add(water);
    const fish = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), clayMat(0xff8a5b, false));
    fish.rotation.z = Math.PI / 2; fish.position.set(0, 0.4, 0); fish.userData.swim = true; g.add(fish);
  } else if (id === 'bed') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 2.2), woodMat(1, 1)); frame.position.y = 0.2; g.add(frame);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 2.02), clayMat(0xfef1e6, false)); mattress.position.y = 0.42; g.add(mattress);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.16, 1.25), clayMat(0xf5a3a3, false)); blanket.position.set(0, 0.55, 0.4); g.add(blanket);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.42), clayMat(0xbfe6ff, false)); pillow.position.set(0, 0.57, -0.75); g.add(pillow);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.18), woodMat(2, 1)); head.position.set(0, 0.55, -1.06); g.add(head);
  } else if (id === 'bigtable') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 1.0), woodMat(2, 1)); top.position.y = 0.62; g.add(top);
    [[-.78, -.38], [.78, -.38], [-.78, .38], [.78, .38]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.12), woodMat(1, 1)); l.position.set(x, 0.31, z); g.add(l); });
    [-.5, .5].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.04, 12), clayMat(0xffffff, false)); p.position.set(x, 0.71, 0); g.add(p); });
  } else if (id === 'bigsofa') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 0.9), clayMat(0x8ab4e8, false)); base.position.y = 0.3; g.add(base);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.24), clayMat(0x8ab4e8, false)); bk.position.set(0, 0.65, -0.33); g.add(bk);
    [-1.08, 1.08].forEach(x => { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.9), clayMat(0x7aa6db, false)); arm.position.set(x, 0.42, 0); g.add(arm); });
    [-.6, .6].forEach(x => { const cush = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.7), clayMat(0xa8ccf2, false)); cush.position.set(x, 0.54, 0.05); g.add(cush); });
  } else if (id === 'bookshelf') {
    // 책이 본체에 파묻혀 안 보였다(베타) — 본체는 어둡게, 책은 앞면 밖으로 내밀어 위에서도 보이게
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.4), woodMat(1, 1, 0x9a7050)); body.position.y = 0.85; g.add(body);
    const cols = [0xd06b5b, 0x5b86d0, 0x64b06a, 0xe0b64a, 0x9a6ad0];
    for (let i = 0; i < 3; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.4), woodMat(2, 1)); shelf.position.set(0, 0.5 + i * 0.5, 0.04); g.add(shelf);
      for (let b = 0; b < 5; b++) { const bk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.26), clayMat(cols[(i + b) % cols.length], false)); bk.position.set(-0.5 + b * 0.22, 0.7 + i * 0.5, 0.14); g.add(bk); }
    }
  } else if (id === 'bigrug') {
    const r = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.6), clayMat(0xc7a6e8, false)); r.position.y = 0.03; g.add(r);
    const border = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.2), clayMat(0xe8d3f5, false)); border.position.y = 0.04; g.add(border);
  }
  // ── 2026-09-09 추가 9종 ──
  if (id === 'stool') {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), woodMat(1, 1)); seat.position.y = 0.38; g.add(seat);
    [0, 2.1, 4.2].forEach(a => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6), clayMat(0x6b4a34)); l.position.set(Math.cos(a) * 0.15, 0.18, Math.sin(a) * 0.15); g.add(l); });
  } else if (id === 'vase') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 10), clayMat(0x7fb2c9, false)); body.position.y = 0.15; g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.1, 10), clayMat(0x7fb2c9, false)); neck.position.y = 0.35; g.add(neck);
    [[0xff9eb5, -0.06, 0.02], [0xffe07a, 0.06, -0.02], [0xffffff, 0, 0.06]].forEach(([c, dx, dz], i) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 5), clayMat(0x6da35a)); stem.position.set(dx, 0.5, dz); stem.rotation.z = dx * 1.2; g.add(stem);
      const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), clayMat(c, false)); bloom.position.set(dx * 1.6, 0.62 + i * 0.02, dz * 1.6); g.add(bloom);
    });
  } else if (id === 'nightstand') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.45), woodMat(1, 1)); body.position.y = 0.275; g.add(body);
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.03), woodMat(1, 1, 0xd9b585)); drawer.position.set(0, 0.36, 0.235); g.add(drawer);
    const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), clayMat(0x5a5148)); knob.position.set(0, 0.36, 0.26); g.add(knob);
  } else if (id === 'cushion') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.16, 16), clayMat(0xf3a561, false)); c.position.y = 0.08; g.add(c);
    const tuft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), clayMat(0xd9823f, false)); tuft.position.y = 0.17; g.add(tuft);
  } else if (id === 'radio') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.2), woodMat(1, 1, 0xb8895a)); box.position.y = 0.15; g.add(box);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02), clayMat(0x4a3f36)); grille.position.set(-0.1, 0.15, 0.11); g.add(grille);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), clayMat(0xf2e8d8, false)); dial.rotation.x = Math.PI / 2; dial.position.set(0.14, 0.17, 0.11); g.add(dial);
    const led = new THREE.Mesh(new THREE.IcosahedronGeometry(0.015, 0), new THREE.MeshStandardMaterial({ color: 0x9dffb0, emissive: 0x4dff6a, emissiveIntensity: 1.2 })); led.position.set(0.14, 0.08, 0.11); g.add(led);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 5), clayMat(0x5a5148)); ant.position.set(0.2, 0.42, -0.04); ant.rotation.z = -0.5; g.add(ant);
  } else if (id === 'wardrobe') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 0.5), woodMat(1, 2)); body.position.y = 0.95; g.add(body);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.02), clayMat(0x6b4a34)); seam.position.set(0, 0.95, 0.26); g.add(seam);
    [-0.12, 0.12].forEach(x => { const k = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), clayMat(0x5a5148)); k.position.set(x, 0.95, 0.27); g.add(k); });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.08, 0.56), woodMat(1, 1, 0xa9743f)); top.position.y = 1.92; g.add(top);
  } else if (id === 'fireplace') {
    const stone = new THREE.MeshStandardMaterial({ color: 0x9a958c, roughness: 1, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 0.6), stone); body.position.y = 0.65; g.add(body);
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.7), woodMat(2, 1, 0xa9743f)); mantle.position.y = 1.35; g.add(mantle);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.5), stone); chimney.position.y = 1.65; g.add(chimney);
    // 아궁이·장작·불꽃은 몸통 앞면(z=0.3) 바깥에 — 안쪽에 두면 앞면에 가려 위에서 안 보인다
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.06), clayMat(0x2a2320)); hearth.position.set(0, 0.42, 0.32); g.add(hearth);   // 아궁이(어둠)
    [-0.14, 0.14].forEach(x => { const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), clayMat(0x5a3d2a)); log.rotation.z = Math.PI / 2; log.position.set(x, 0.2, 0.4); log.rotation.y = x * 2; g.add(log); });
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 7), new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff7a2a, emissiveIntensity: 1.4, roughness: 0.6 })); fire.position.set(0, 0.46, 0.42); fire.userData.flicker = true; g.add(fire);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xffe07a, emissiveIntensity: 1.6, roughness: 0.6 })); core.position.set(0, 0.4, 0.46); g.add(core);
  } else if (id === 'piano') {
    const dark = clayMat(0x2b2622, false);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.55), dark); body.position.set(0, 0.6, -0.15); g.add(body);
    const keybed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.32), dark); keybed.position.set(0, 0.72, 0.22); g.add(keybed);
    const keys = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.26), clayMat(0xf7f3ea, false)); keys.position.set(0, 0.79, 0.24); g.add(keys);
    for (let i = 0; i < 10; i++) { if (i % 7 === 2 || i % 7 === 6) continue; const bk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.14), dark); bk.position.set(-0.52 + i * 0.115, 0.815, 0.18); g.add(bk); }
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 0.6), dark); lid.position.set(0, 1.23, -0.12); g.add(lid);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.02), clayMat(0x3a332e, false)); stand.position.set(0, 1.0, 0.12); stand.rotation.x = -0.35; g.add(stand);
    [-0.6, 0.6].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.1), dark); l.position.set(x, 0.36, 0.3); g.add(l); });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.3), dark); bench.position.set(0, 0.42, 0.72); g.add(bench);
    [[-0.28, 0.6], [0.28, 0.6], [-0.28, 0.84], [0.28, 0.84]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), dark); l.position.set(x, 0.2, z); g.add(l); });
  } else if (id === 'bigaquarium') {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.6), woodMat(2, 1)); stand.position.y = 0.25; g.add(stand);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.5), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0 })); glass.position.y = 0.9; g.add(glass);
    const water = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.62, 0.44), new THREE.MeshStandardMaterial({ color: 0x4aa6d0, transparent: true, opacity: 0.55, roughness: 0.25, emissive: 0x184a63, emissiveIntensity: 0.5 })); water.position.y = 0.85; g.add(water);
    const weed = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), clayMat(0x5fbf7a, false)); weed.position.set(-0.4, 0.68, 0); g.add(weed);
    [[0xff8a5b, 0.0, 0.85, 0], [0x5b9bff, 0.3, 0.98, 2.1]].forEach(([c, x, y, ph]) => {
      const fish = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), clayMat(c, false));
      fish.rotation.z = Math.PI / 2; fish.position.set(x, y, 0); fish.userData.swim = true; fish.userData.swimW = 0.42; fish.userData.swimY = y; fish.userData.swimP = ph; g.add(fish);
    });
  } else if (id === 'rocker') {
    const w = woodMat(1, 1, 0x9c6b40);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.55), w); seat.position.y = 0.42; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.08), w); back.position.set(0, 0.72, -0.24); back.rotation.x = -0.18; g.add(back);
    [-0.26, 0.26].forEach(x => {   // 곡선 다리(흔들이)
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 8, Math.PI), w);
      r.position.set(x, 0.3, 0); r.rotation.set(Math.PI / 2, 0, Math.PI); g.add(r);
    });
  } else if (id === 'telescope') {
    const tri = clayMat(0x4a4f57);
    [0, 2.1, 4.2].forEach(a => {   // 삼각대
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 5), tri);
      leg.position.set(Math.cos(a) * 0.16, 0.35, Math.sin(a) * 0.16); leg.rotation.z = Math.cos(a) * 0.32; leg.rotation.x = -Math.sin(a) * 0.32; g.add(leg);
    });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.66, 10), clayMat(0xd8dde0, false));
    tube.position.set(0, 0.82, 0); tube.rotation.z = 0.5; g.add(tube);
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), clayMat(0x23252a));
    eye.position.set(-0.3, 0.68, 0); eye.rotation.z = 0.5; g.add(eye);
  } else if (id === 'trunk') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.5), woodMat(1, 1, 0x7a4a2e)); body.position.y = 0.23; g.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.85, 10, 1, false, 0, Math.PI), woodMat(1, 1, 0x8d5636));
    lid.position.y = 0.45; lid.rotation.z = Math.PI / 2; g.add(lid);
    const strapMat = clayMat(0x4a3526);
    [-0.28, 0.28].forEach(x => {   // 가죽 띠
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.53), strapMat); b.position.set(x, 0.24, 0); g.add(b);
    });
  } else if (id === 'bathtub') {
    const porcelain = clayMat(0xf7f5f0, false);
    const outer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.75), porcelain); outer.position.y = 0.25; g.add(outer);
    const water = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.06, 0.58), clayMat(0x8fd0e8, false)); water.position.y = 0.46; g.add(water);
    const fixture = clayMat(0xd8dde0, false);   // 발·수도꼭지 공용 금속 재질
    [-0.6, 0.6].forEach(x => {     // 발
      const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 6), fixture); ft.position.set(x, 0.06, 0.26); g.add(ft);
    });
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), fixture); tap.position.set(-0.68, 0.6, 0); g.add(tap);
  } else if (id === 'bigart') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.85, 0.07), clayMat(0xb98a4e)); frame.position.y = 1.15; g.add(frame);
    const canvas = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.03), clayMat(0xe8ddc8, false)); canvas.position.set(0, 1.15, 0.04); g.add(canvas);
    [[-0.22, 1.05, 0x7fb08a], [0.16, 1.24, 0xd98b6a], [0.3, 1.0, 0x8fa8d0]].forEach(([x, y, c]) => {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), clayMat(c, false)); blob.position.set(x, y, 0.06); blob.scale.z = 0.2; g.add(blob);
    });
  } else if (id === 'chandelier') {
    const gold = new THREE.MeshStandardMaterial({ color: 0xe9b949, roughness: 0.35, metalness: 0.5 });   // clayMat 은 flat(bool)만 받아 금속 재질은 직접 생성
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), gold); chain.position.y = 2.35; g.add(chain);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 14), gold); ring.position.y = 2.05; ring.rotation.x = Math.PI / 2; g.add(ring);
    const cmat = new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffca70, emissiveIntensity: 0, roughness: 0.6 });
    houseWindows.push(cmat);       // 🌙 밤에 창문·램프와 함께 켜진다
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 7), cmat);
      c.position.set(Math.cos(a) * 0.34, 2.14, Math.sin(a) * 0.34); g.add(c);
    }
  } else if (id === 'grandpiano') {
    const black = clayMat(0x1a1b1f);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.26, 16, 1, false, 0, Math.PI), black);
    body.position.y = 0.62; body.rotation.y = -Math.PI / 2; g.add(body);
    const front = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.26, 0.5), black); front.position.set(0, 0.62, 0.62); g.add(front);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.9), clayMat(0x26282e, false)); lid.position.set(0.1, 0.9, -0.1); lid.rotation.z = -0.28; g.add(lid);
    const keys = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.24), clayMat(0xf5f2e8, false)); keys.position.set(0, 0.76, 0.8); g.add(keys);
    [[-0.6, 0.72], [0.6, 0.72], [0, -0.5]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.5, 6), black); leg.position.set(x, 0.25, z); g.add(leg);
    });
  } else if (id === 'firepit') {
    const stone = clayMat(0x8b857a);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.14), stone);
      s.position.set(Math.cos(a) * 0.36, 0.08, Math.sin(a) * 0.36); s.rotation.y = -a; g.add(s);
    }
    const fmat = new THREE.MeshStandardMaterial({ color: 0xffb057, emissive: 0xff7b2e, emissiveIntensity: 0, roughness: 0.7 });
    houseWindows.push(fmat);       // 🌙 밤에 켜진다(실외 층이라 더 잘 보인다)
    [[0, 0.2, 0.17], [0.1, 0.3, 0.12], [-0.09, 0.28, 0.1]].forEach(([x, y, r]) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.4, 6), fmat); f.position.set(x, y, 0); g.add(f);
    });
  } else if (id === 'planttree') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.42, 10), clayMat(0xb87f5e)); pot.position.y = 0.21; g.add(pot);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.07, 10), clayMat(0xa06d4e)); rim.position.y = 0.44; g.add(rim);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6), clayMat(0x6b4a34)); trunk.position.y = 0.72; g.add(trunk);
    const leafMat = clayMat(0x6b9a4c);
    [[0, 1.16, 0.34], [-0.2, 0.98, 0.24], [0.22, 1.0, 0.22]].forEach(([x, y, r]) => {
      const l = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMat); l.position.set(x, y, 0); g.add(l);
    });
  } else if (id === 'jacuzzi') {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.72, 0.55, 14), clayMat(0xe9e4d8)); shell.position.y = 0.28; g.add(shell);
    const wmat = new THREE.MeshStandardMaterial({ color: 0x5fd3e8, emissive: 0x2aa8c4, emissiveIntensity: 0, roughness: 0.25 });
    houseWindows.push(wmat);       // 🌙 밤에 물이 파랗게 빛난다(구성품 수영장 조명과 같은 문법)
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.07, 14), wmat); water.position.y = 0.53; g.add(water);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.1, 14), woodMat(2, 2, 0xc19a66)); deck.position.y = 0.05; g.add(deck);
  } else if (id === 'parasol_set') {
    // 🥈 슬림한 크롬 기둥(재질 하나를 기둥·꼭대기 구슬이 같이 쓴다)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xd7dbe0, roughness: 0.3, metalness: 0.55, flatShading: true });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.58, 8), poleMat); pole.position.y = 0.79; g.add(pole);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), poleMat); cap.position.y = 1.62; g.add(cap);
    // ☂️ 캔버스 — 10패널(오렌지 5·하늘색 5) + 패널 사이 흰 솔기 10개, 스캘럽 테두리(사용자 제공 참고 사진 반영).
    //   위에서 보는 시점이 핵심이라 옆면 두께보단 윗면 부채꼴 윤곽·색 대비·물결 테두리에 공을 들였다.
    const PANELS = 10, SLOT = Math.PI * 2 / PANELS, SEAM_HALF = 0.045, SEGS = 5;
    const ORANGE = new THREE.Color(0xe08a3c), SKY = new THREE.Color(0x5fb6e0), SEAM = new THREE.Color(0xf7f4ea);
    const geos = [];
    for (let i = 0; i < PANELS; i++) {
      const a0 = i * SLOT, a1 = a0 + SLOT;
      geos.push(parasolPanel(a0 + SEAM_HALF, a1 - SEAM_HALF, 0.58, 0.16, 1.74, 1.30, 0.05, SEGS, i % 2 === 0 ? ORANGE : SKY));
    }
    for (let i = 0; i < PANELS; i++) {   // 얇은 흰 솔기 — 패널과 같은 반지름식이라 이음매에 정확히 맞물린다
      const a = i * SLOT;
      geos.push(parasolPanel(a - SEAM_HALF, a + SEAM_HALF, 0.58, 0.02, 1.74, 1.30, 0.05, 2, SEAM));
    }
    const canopy = new THREE.Mesh(mergeGeos(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
    canopy.castShadow = true; g.add(canopy);
    // 🛋️ 라운지 체어 2개 — 등받이를 기울이고 다리 4개를 세워 위에서도 "누울 자리"로 읽히게, 쿠션은 파라솔의 하늘색과 짝을 맞춘다.
    //   캔버스 테두리 반지름(rNear+bulge=0.74)보다 안쪽으로 당겨 파라솔 그늘 밑에 들어오게 배치(2026-09-18: 기존엔 그늘 밖으로 삐져나와 있었다)
    const frameMat = clayMat(0xe4e0d4, false), cushionMat = clayMat(0x8fd3ea, false);
    [-0.36, 0.36].forEach(x => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.85), cushionMat); seat.position.set(x, 0.28, 0); g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.07), cushionMat); back.position.set(x, 0.48, -0.38); back.rotation.x = 0.42; g.add(back);
      [[-0.16, -0.32], [0.16, -0.32], [-0.16, 0.32], [0.16, 0.32]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.24, 5), frameMat); leg.position.set(x + lx, 0.12, lz); g.add(leg);
      });
    });
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  setFogExempt(root, true);   // 실내 가구는 안개 밖(고스트는 재질을 clone 하므로 플래그가 따라간다)
  return root;
}

// 가구 배치(작물로 구매). silent=true 면 저장 복원(비용/이펙트 없음) · free=true 면 옮겨 놓기(비용 없음)
export function placeDecor(id, wx, wz, silent = false, rot = null, free = false, f = null) {
  const def = DECOR.find(d => d.id === id); if (!def) return false;
  const ry = (rot == null ? decorRot : rot) % 4;
  const curFloor = f == null ? houseFloor : f;    // f = 지금 서 있는 층(복원 시엔 호출부가 정규화해서 넘긴다)
  // 🔒 층 해금 · 실외 전용 가드 — silent(세이브 복원)는 건너뛴다: applySave 는 houseStage 를
  // 가구보다 나중에 복원하므로(js/game.js applySave), 여기서 즉시 gameState.houseStage 로 걸면
  // 이미 정당하게 산 고급 가구가 복원 시점에 stage=0 취급되어 통째로 사라진다. 결제·신규 배치(!silent)만 막으면
  // Task 4 가 찾은 구멍(3단계에서 사서 실내에 놓기)은 그대로 막힌다.
  if (!silent) {
    const floorDef = floorAt(gameState.houseStage, curFloor);
    if (!decorUnlocked(def, gameState.houseStage)) { ui.toast?.('집을 더 증축하면 살 수 있어요'); return false; }
    // 받침 유무로 "은/는" 이 갈린다(자쿠지·화분나무엔 받침이 없다) — josa() 로 문장 통째로 분기
    if (!canPlaceOn(def, floorDef)) {
      ui.toast?.(josa(def.name, `${def.ico} ${def.name}은 루프탑에만 놓을 수 있어요`, `${def.ico} ${def.name}는 루프탑에만 놓을 수 있어요`));
      return false;
    }
  }
  const stored = gameState.house.stored || (gameState.house.stored = {});
  const fromStore = !silent && !free && (stored[id] || 0) > 0;   // 🧺 창고에 있으면 값 없이 꺼내 놓는다
  if (fromStore) { stored[id]--; if (!stored[id]) delete stored[id]; }
  if (!silent && !free && !fromStore) {
    const pay = def.pay || 'crop';                          // 화폐: 작물 · 물고기 · 🪙코인(고급 가구)
    const have = pay === 'coins' ? (gameState.inventory.coins || 0) : (gameState.inventory[pay] || 0);
    if (have < def.cost) {
      ui.toast?.(pay === 'coins' ? `코인이 부족해요 (필요 ${def.cost} 🪙)`
               : pay === 'fish'  ? `물고기가 부족해요 (필요 ${def.cost} 🐟)`
               :                   `작물이 부족해요 (필요 ${def.cost} 🥕)`);
      return false;
    }
    gameState.inventory[pay] -= def.cost; refreshInventoryUI();
    if (pay === 'coins') {
      logEcon('decor_buy', id, -def.cost, gameState.inventory.coins);   // [원장] 코인 소비 — 다른 코인 싱크와 같은 축
      trackEvent('decor_buy_coins', { item: id, coins: def.cost, stage: gameState.houseStage }); // [GA4] 코인 싱크 퍼널
    }
  }
  const m = decorMesh(id);
  const lx = decorClampX(wx), lz = decorClampZ(wz);
  const fy = floorBaseY(curFloor);   // ☀️ 루프탑이면 ROOF_Y — 옛 세이브(y 저장 안 함, x·z·f 만)도 f 로 다시 계산되어 자동으로 맞는 높이에 놓인다
  m.position.set(lx, fy + 0.2, lz);
  m.rotation.y = ry * Math.PI / 2;
  const rec = { id, x: lx - INT.x, z: lz - INT.z, rot: ry, f: curFloor };
  m.userData.rec = rec;                                     // 탭해서 들어 올릴 때 저장 레코드를 같이 뺀다
  if (def.foot) {                                           // 🚧 발자국만큼 통행 차단 — 90°·270° 로 놓으면 가로·세로 교환
    const hw = def.foot[ry % 2 ? 1 : 0] / 2 * DECOR_SCALE, hd = def.foot[ry % 2 ? 0 : 1] / 2 * DECOR_SCALE;
    m.userData.collider = solidBox(lx - hw, lz - hd, lx + hw, lz + hd);
  }
  // ⚠️ §8.1 재발 지점 — indoor 만 보면 취소 경로(stopDecorPlacing→placeDecor, indoor===true인 채로 실행)에서
  //   다른 층 좌표에 새로 생긴 메시가 그대로 보여 버린다. 지금 층(houseFloor)까지 같이 봐야 한다.
  m.visible = indoor && curFloor === houseFloor;
  if (m.userData.collider) m.userData.collider.off = !m.visible;   // 🚧 안 보이는 층의 발자국은 막지 않는다(§8.1 콜라이더 버전)
  scene.add(m); decorMeshes.push(m);
  gameState.house.decor.push(rec);
  if (!silent) {
    m.userData.pop = 1; m.scale.setScalar(0.01);
    Sound.blip(); spawnFloatText(lx, fy + 1.3, lz, def.ico + ' 배치!', '#2fa564');
    if (free) trackEvent('move_decor', { item: id });    // [GA4] 옮겨 놓기
    else { ui.act?.('decor'); trackEvent('place_decor', { item: id, from: fromStore ? 'store' : 'buy' }); } // 튜토리얼: 가구 배치
    $w.pickedDecor = null;                      // 들었던 가구는 새 자리에 놓였다(제자리 복귀 불필요)
    stopDecorPlacing(false);                 // 한 번 놓으면 배치 모드 종료(고스트 제거·손에 든 가구 → 원래 도구)
    ui.onDecorPlaced?.();                    // 액션버튼 아이콘 복원(가구 제거)
    requestSave();
  }
  return true;
}

export const DECOR_WALL_PAD = 0.5 * DECOR_SCALE;

export function decorClampX(x) { const h = curHalf(); return Math.max(INT.x - h + DECOR_WALL_PAD, Math.min(INT.x + h - DECOR_WALL_PAD, x)); }

export function decorClampZ(z) { const h = curHalf(); return Math.max(INT.z - h + DECOR_WALL_PAD, Math.min(INT.z + h - DECOR_WALL_PAD, z)); }

//   손에 든 축소 메시는 실내에 들어오면 맨손(등 수납)이라 화면에서 안 보였다(베타 피드백 "미리보기가 안 보여요").
//   → 바닥에 반투명 가구 + 초록 링을 띄워 "어디에·어느 방향으로" 놓일지 보여준다.
//   모바일: 바닥 탭 = 자리 잡기(고스트 이동) → 같은 자리 다시 탭 / 액션 버튼 = 놓기. 탭하기 전엔 발 앞을 따라다닌다.
//   마우스: 호버로 고스트가 따라오고 클릭 = 놓기(호버가 곧 미리보기).
//   놓아 둔 가구는 탭하면 다시 들어 올려(비용 없음) 같은 방식으로 옮긴다("소파 위치 변경 어떻게 해요").
export function startDecorPlacing(id, picked = null) {
  $w.placingDecor = id; $w.pickedDecor = picked; $w.decorTapHintShown = false;
  setHeldDecor(id);
  if (picked) $w.decorTarget = { x: picked.wx, z: picked.wz, pinned: true };   // 들어 올린 자리에서 시작
  else decorTarget.pinned = false;
  buildDecorGhost(id);
}

export function stopDecorPlacing(putBack) {
  // 🏠 들었던 가구는 제자리(원래 층)로 — f 를 안 넘기면 placeDecor 가 "지금 서 있는 층" 을 써서,
  //   위층에서 들고 취소했는데 그사이 1층으로 내려가 있으면 가구가 1층에 떨어지는 사고가 난다(Ruling B).
  if (pickedDecor && putBack) placeDecor(pickedDecor.id, pickedDecor.wx, pickedDecor.wz, true, pickedDecor.rot, false, pickedDecor.f);
  $w.pickedDecor = null; $w.placingDecor = null; decorTarget.pinned = false;
  removeDecorGhost();
  setHeldTool(TOOLS[currentTool].id);      // 손에 든 가구 → 원래 도구(맨손이어도 메시는 필요 — 등에 멘 채로 돌아간다)
}

export function buildDecorGhost(id, outdoor = false) {
  removeDecorGhost();
  if (outdoor && atFarm) trackEvent('habitat_meter', { farm_stage: gameState.farm.stage });   // [GA4] 🦋 퍼널 1단 — 미터를 봤다
  // 🏮 outdoorMesh·decorMesh 둘 다 램프·화로 같은 재질을 houseWindows(밤 점등 목록)에 밀어 넣는다.
  //   고스트 것까지 남으면 목록이 불어나고, 고스트를 지울 때 dispose 된 재질이 목록에 남는다 → 도로 잘라낸다.
  const hw0 = houseWindows.length;
  const g = outdoor ? outdoorMesh(id) : decorMesh(id);
  houseWindows.length = hw0;
  $w.ghostOutdoor = outdoor;
  g.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = false; o.receiveShadow = false;
    o.material = o.material.clone();
    o.material.transparent = true; o.material.opacity = 0.45; o.material.depthWrite = false;
  });
  // 🏗️ 밭 시설은 발자국(2×2·1×3)이 커서 작은 링으론 "어디를 차지하는지" 가 안 보인다 — 발자국 크기로 키운다
  const fdef = FARM_BUILDINGS.find(d => d.id === id);
  let r0 = outdoor ? 0.6 : 0.55 * DECOR_SCALE, r1 = outdoor ? 0.78 : 0.72 * DECOR_SCALE;
  if (fdef) { const [w, d] = rotatedFp(fdef.fp, decorRot); r1 = Math.max(w, d) * FARM_CELL * 0.5; r0 = r1 - 0.22; }
  const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 32),
    new THREE.MeshBasicMaterial({ color: 0x7fce8b, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  ghostRing = ring; ghostFarmDef = fdef || null;
  g.rotation.y = decorRot * Math.PI / 2;
  scene.add(g); $w.decorGhost = g; updateDecorGhost();
}

export let ghostRing = null, ghostFarmDef = null, ghostOk = true;

// 🦋 배치 중인 자리의 환경을 미터에 띄운다. 텃밭 밖이면 조용히 끈다.
//   현재치는 정직하게 보여주되 **목표치는 보여주지 않는다** — 대신 nearMiss 가 막는 요인 하나를 집어 준다.
export function updateHabitatMeter() {
  if (!atFarm || !decorGhost) { ui.setHabitatMeter?.(null); $w.lastNearMiss = {}; return; }
  const env = habitatEnvAt(decorGhost.position.x, decorGhost.position.z);
  const known = gameState.dex.visitor || {};
  ui.setHabitatMeter?.(spotInfo(env, habitatCtx(), known));
  // [GA4] 퍼널 2단 — 화면 표시와 별개로 "70% 왔는데 막혔다" 만 기록한다(blocker 가 튜닝 축).
  //   ⚠️ 이 함수는 **매 프레임** 돈다. 조건 안팎을 오갈 때마다 쏘면 폭주한다
  //      (실측: 10번 왕복 = 같은 이벤트 10개). 배치 세션 하나에서 **종별 한 번**만 쏜다.
  //      removeDecorGhost 가 세션을 끝내며 기억을 비운다.
  const near = nearMiss(env, habitatCtx(), known);
  if (near && !lastNearMiss[near.visitor]) {
    lastNearMiss[near.visitor] = 1;
    trackEvent('visitor_nearmiss', { visitor: near.visitor, blocker: near.blocker });
  }
}

export function removeDecorGhost() {
  ui.setHabitatMeter?.(null); $w.lastNearMiss = {};   // 🦋 배치 모드가 끝나면 미터도 사라지고 근접 신호 기억도 비운다
  ghostRing = null; ghostFarmDef = null;
  if (!decorGhost) return;
  scene.remove(decorGhost);
  decorGhost.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  $w.decorGhost = null; $w.ghostOutdoor = false;
}

// 매 프레임: 핀 고정이 아니면 캐릭터 발 앞 1.3 을 따라다닌다(걸어가서 버튼으로 놓기)
export function updateDecorGhost() {
  if (!decorGhost) return;
  // 🪵 야외 장식은 발밑에 놓인다(placeOutdoor) — 고스트도 딱 그 자리에 두어 "어느 방향으로 놓일지"만 보여 준다.
  //   ↻회전 버튼은 이미 떴지만 미리보기도 반영도 없어서 "회전이 안 되는 것 같다"는 피드백이 나왔다(2026-09-11).
  if (ghostOutdoor) {
    const fdef = OUTDOOR.find(d => d.id === placingOutdoor);
    const ax = outdoorTarget.pinned ? outdoorTarget.x : player.position.x;   // 탭으로 조준한 자리(없으면 발밑)
    const az = outdoorTarget.pinned ? outdoorTarget.z : player.position.z;
    if (fdef?.farm) {   // 🏗️ 시설은 밭 격자에 스냅한 자리를 보여 준다 — 놓이는 자리와 미리보기가 같아야 한다
      const [sx, sz] = snapCenter(ax, az, fdef.fp, decorRot);
      decorGhost.position.set(sx, 0.02, sz);
      // 놓을 수 있는 자리인지 색으로 먼저 알려 준다 — 액션을 눌러 토스트로 거절당하기 전에(사용자 지적 2026-09-13)
      const v = canPlaceBuilding({ def: fdef, x: sx, z: sz, rot: decorRot, atFarm, center: FARM, half: farmHalf(), plots, buildings: farmBuildingRecs(pickedOutdoor?.rec || null), yard: surveyYard(farmHalf()) });
      if (v.ok !== ghostOk) {
        ghostOk = v.ok;
        if (ghostRing) ghostRing.material.color.setHex(v.ok ? 0x7fce8b : 0xe8705a);
        decorGhost.traverse(o => { if (o.isMesh && o !== ghostRing) o.material.opacity = v.ok ? 0.45 : 0.28; });
      }
      ui.setZoneHint?.(v.ok ? `${fdef.ico} ${fdef.name} — 바닥을 눌러 자리를 고르고 액션으로 놓기 · ↻ 방향` : FARM_PLACE_MSG[v.reason]);
    } else decorGhost.position.set(ax, 0.02, az);
    decorGhost.rotation.y = decorRot * Math.PI / 2;
    updateHabitatMeter();   // 🦋 정보가 필요한 순간은 정확히 "지금 어디에 놓을까" 다
    return;
  }
  if (!decorTarget.pinned) {
    // 발 앞 거리 — 긴 가구(침대·큰 식탁)를 돌려 놓을 때 상자가 캐릭터를 덮어 놓는 순간 튕기지 않게 발자국만큼 띄운다
    const fdef = DECOR.find(d => d.id === placingDecor);
    const hd = fdef?.foot ? fdef.foot[decorRot % 2 ? 0 : 1] / 2 * DECOR_SCALE : 0;
    const reach = Math.max(1.3, hd + PLAYER_R + 0.15);
    decorTarget.x = decorClampX(player.position.x + Math.sin(player.rotation.y) * reach);
    decorTarget.z = decorClampZ(player.position.z + Math.cos(player.rotation.y) * reach);
  }
  decorGhost.position.set(decorTarget.x, floorBaseY(houseFloor) + 0.2 + Math.sin(clock.elapsedTime * 3) * 0.03, decorTarget.z);   // ☀️ 루프탑이면 덱 높이에서 미리보기
  decorGhost.rotation.y = decorRot * Math.PI / 2;
}

// 🪵 야외 배치 조준 — 실내는 바닥 메시를 쓰지만 야외는 지면 평면(y=0.05)에 레이를 맞춘다(마을·텃밭·마당 공통)
export const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05), _groundHit = new THREE.Vector3();

export function groundHitFromEvent(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(_groundPlane, _groundHit)) return null;
  const dx = _groundHit.x - player.position.x, dz = _groundHit.z - player.position.z;
  const d = Math.hypot(dx, dz);
  if (d > OUTDOOR_REACH) { const k = OUTDOOR_REACH / d; return { x: player.position.x + dx * k, z: player.position.z + dz * k }; }   // 너무 멀면 사거리까지만
  return { x: _groundHit.x, z: _groundHit.z };
}

// 야외 배치 중 바닥 탭/클릭 — 실내 onDecorFloorTap 과 같은 규칙(마우스는 클릭 = 놓기, 터치는 한 번 더 탭)
export function onOutdoorGroundTap(e) {
  const p = groundHitFromEvent(e); if (!p) return;
  if (e.pointerType === 'mouse') { $w.outdoorTarget = { x: p.x, z: p.z, pinned: true }; return placeOutdoor(p.x, p.z); }
  if (outdoorTarget.pinned && Math.hypot(p.x - outdoorTarget.x, p.z - outdoorTarget.z) < 1.0) return placeOutdoor(outdoorTarget.x, outdoorTarget.z);
  $w.outdoorTarget = { x: p.x, z: p.z, pinned: true }; Sound.blip(); ui.onDecorAimed?.();
  if (!outdoorTapHintShown) { outdoorTapHintShown = true; ui.toast?.('여기 놓을까요? 한 번 더 탭하거나 오른쪽 버튼으로 놓기', 2600); }
}

export let outdoorTapHintShown = false;

export function floorHitFromEvent(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(interiorFloor, true)[0];   // 🌀 floorGroup — 나선 포팅 후 구멍 뚫린 바닥도 메시 하나(Shape.holes)뿐이지만, 방마다 조각 수가 달라도 안전하도록 재귀 탐색은 그대로 둔다
  return hit ? hit.point : null;
}

// 배치 중 바닥 탭/클릭
export function onDecorFloorTap(e) {
  const p = floorHitFromEvent(e); if (!p) return;
  const x = decorClampX(p.x), z = decorClampZ(p.z);
  if (e.pointerType === 'mouse') return commitDecor(x, z);   // 마우스: 호버로 이미 봤으니 클릭 = 놓기
  if (decorTarget.pinned && Math.hypot(x - decorTarget.x, z - decorTarget.z) < 0.8) return commitDecor(decorTarget.x, decorTarget.z); // 고스트 자리 다시 탭 = 놓기
  $w.decorTarget = { x, z, pinned: true }; Sound.blip(); ui.onDecorAimed?.();
  if (!decorTapHintShown) { $w.decorTapHintShown = true; ui.toast?.('여기 놓을까요? 한 번 더 탭하거나 오른쪽 버튼으로 놓기'); }
}

// 배치 확정(바닥 탭·액션 버튼·Space 공통). 재료가 부족하면 배치 모드를 유지한다
export function commitDecor(x, z) { placeDecor(placingDecor, x, z, false, null, !!pickedDecor); }

// 놓아 둔 가구 탭 → 들어 올리기(저장 레코드도 같이 뺀다)
//   ⚠️ three.js Raycaster 는 invisible 메시도 그대로 맞힌다(visible 을 안 본다) — 층이 겹치는 좌표라
//   다른 층(안 보이는) 가구까지 후보에 넣으면 안 보이는 걸 탭해서 들어 올리는 사고가 난다. 지금 층만 후보로.
export function tryPickDecor(e) {
  const curDecor = decorMeshes.filter(m => (m.userData.rec?.f || 0) === houseFloor);
  if (!curDecor.length) return false;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(curDecor, true)[0]; if (!hit) return false;
  let root = hit.object; while (root.parent && !curDecor.includes(root)) root = root.parent;
  return pickDecor(root);
}

// 캐릭터에서 가장 가까운 가구 — 발자국 상자 가장자리까지의 거리(러그처럼 foot 없는 건 중심 거리)
//   다른 층 가구는 같은 좌표에 겹칠 수 있어 반드시 지금 층만 본다(위 tryPickDecor 와 같은 이유).
export function nearestDecor(reach) {
  let best = null;
  for (const root of decorMeshes) {
    const rec = root.userData.rec; if (!rec || (rec.f || 0) !== houseFloor) continue;
    const def = DECOR.find(d => d.id === rec.id);
    const dx = player.position.x - root.position.x, dz = player.position.z - root.position.z;
    let d;
    if (def?.foot) {
      const hw = def.foot[rec.rot % 2 ? 1 : 0] / 2 * DECOR_SCALE, hd = def.foot[rec.rot % 2 ? 0 : 1] / 2 * DECOR_SCALE;
      d = Math.hypot(Math.max(0, Math.abs(dx) - hw), Math.max(0, Math.abs(dz) - hd));
    } else d = Math.hypot(dx, dz);
    if (d < reach && (!best || d < best.d)) best = { root, d };
  }
  return best;
}

// 놓아둔 가구를 들어 올리는 공통 경로 — 탭(레이캐스트)과 근접 프롬프트+액션이 같이 쓴다
export function pickDecor(root) {
  const rec = root.userData.rec; if (!rec) return false;
  scene.remove(root); decorMeshes.splice(decorMeshes.indexOf(root), 1);
  unregisterWindows(root);   // 🏮 샹들리에·파이어핏·자쿠지처럼 밤 점등 목록에 올라간 재질을 들어 올릴 때 같이 뺀다(pickOutdoor 와 같은 규칙)
  if (root.userData.collider) removeSolid(root.userData.collider);   // 🚧 들어 올린 자리에 안 보이는 벽이 남지 않게
  const i = gameState.house.decor.indexOf(rec); if (i >= 0) gameState.house.decor.splice(i, 1);
  $w.decorRot = rec.rot || 0;
  startDecorPlacing(rec.id, { id: rec.id, wx: INT.x + rec.x, wz: INT.z + rec.z, rot: decorRot, f: rec.f || 0 }); // f: 원래 있던 층 — 취소 시 그 층으로 되돌린다(Ruling B)
  Sound.blip(); trackEvent('pick_decor', { item: rec.id }); // [GA4] 옮기기 시작
  ui.onDecorPicked?.(DECOR.find(d => d.id === rec.id));
  return true;
}

// 🧺 들고 있는 가구를 창고로 — 바닥에서 들어 올린 것만(방금 산 건 아직 값을 안 치렀으니 취소가 맞다)
export function storeDecor() {
  if (!placingDecor || !pickedDecor) return false;
  const id = placingDecor, def = DECOR.find(d => d.id === id);
  const stored = gameState.house.stored || (gameState.house.stored = {});
  stored[id] = (stored[id] || 0) + 1;
  $w.pickedDecor = null;                       // 제자리 복귀 없이 정리
  stopDecorPlacing(false);
  Sound.blip(); ui.toast?.(`${def.ico} ${def.name}을(를) 창고에 넣었어요`);
  trackEvent('store_decor', { item: id }); // [GA4]
  ui.onDecorPlaced?.();                     // 액션버튼 아이콘 복원
  requestSave();
  return true;
}
