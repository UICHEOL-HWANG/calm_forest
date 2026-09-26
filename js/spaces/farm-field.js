// =============================================================
//  🪧 표지판·텃밭 게이트·측량소·텃밭 필드 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, BARN, atFarm, clayMat, farmGroup, farmHalf, gambrelRoofSlabs, gambrelSolid, houseWindows, makeSignBoard,
  makeSignpost, mergeGeos, obstacles, paintGeo, playerInYard, removeSolid, scene, solidBox, solidCircle,
  spawnConfetti, spawnSparkle, triggerFarmReveal, vtxMat, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { FARM, FARM_GATE } from '../data/places.js';
import { PAL } from '../data/world.js';
import { YARD_D, YARD_HZ, fencePosts, perimeterTrees, surveyBenchPos, surveyDeskPos, surveyOfficePos } from '../farm-stage.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

// 마을 안 텃밭 입구 게이트(나무 아치 + 표지판)
export function spawnFarmGate() {
  const g = new THREE.Group(); g.position.copy(FARM_GATE);
  for (const x of [-1.1, 1.1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 7), woodMat(1, 1)); p.position.set(x, 1.2, 0); p.castShadow = true; g.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 0.24), woodMat(2, 1)); top.position.y = 2.4; g.add(top);
  // 🌿 덩굴 퍼걸러 입구 — 간판을 아치에 올리는 안은 두 번 실패(1.7=머리 관통, 2.95=캐릭터 가림/붕 뜸).
  //    입구는 꿀색 박공지붕(랭킹판과 같은 문법)+덩굴로 꾸미고, 이름은 옆 팻말이 맡는다.
  for (const s of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.07, 0.66), clayMat(0xf0b46a));
    slab.position.set(s * 0.68, 2.72, 0); slab.rotation.z = -s * 0.38; slab.castShadow = true; g.add(slab);
  }
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), clayMat(0xe8c46a, false)); orb.position.y = 3.0; g.add(orb);
  // 기둥 타고 오르는 덩굴 잎 + 들보 위 잎 뭉치
  for (const x of [-1.1, 1.1]) {
    [[0.7, 0.16], [1.4, 0.2], [2.1, 0.17]].forEach(([y, r], i) => {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), clayMat([PAL.leaf1, PAL.leaf2, PAL.leaf3][i]));
      leaf.position.set(x + (i % 2 ? 0.12 : -0.1), y, 0.1); g.add(leaf);
    });
    const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), clayMat(PAL.leaf2));
    tuft.position.set(x * 0.85, 2.5, 0); g.add(tuft);
  }
  g.add(makeSignpost('🌾 내 텃밭', 2.1, 0.5));
  scene.add(g);
  obstacles.push({ x: FARM_GATE.x, z: FARM_GATE.z, r: 1.2 });
  // 🚧 기둥 두 개만 — 아치 가운데는 걸어서 지나갈 수 있어야 한다
  [-1.1, 1.1].forEach(px => solidCircle(FARM_GATE.x + px, FARM_GATE.z, 0.28));
}

// 📐 측량소 제도 탁자 월드 좌표(상호작용 지점) — 서쪽 문 밖 마당. 울타리가 커지면 마당째 밖으로 밀려난다
export function surveyDeskWorld() { const d = surveyDeskPos(farmHalf()); return { x: FARM.x + d.x, z: FARM.z + d.z }; }

// 🔧 자재 작업대 월드 좌표 — 밭 시설을 주문하는 곳(마을 작업대는 텃밭에서 너무 멀다)
export function surveyBenchWorld() { const b = surveyBenchPos(farmHalf()); return { x: FARM.x + b.x, z: FARM.z + b.z }; }

// 📐 측량소 — 서쪽 문 밖 마당의 **작은** 측량 오두막(빨간 판자 + 회색 갬브럴 + 흰 트림, 밭 시설 세트와 같은 톤)
//   + 제도 탁자(상호작용) · 삼각대 측량기 · 말뚝 다발 · 🔧자재 작업대.
//   밭 안 공간을 한 칸도 쓰지 않으려고 울타리 바깥에 세운다. 좌표는 전부 밭 로컬(farmGroup 기준).
export function makeSurveyOffice(H) {
  const g = new THREE.Group();
  const o = surveyOfficePos(H), d = surveyDeskPos(H);
  const box = (w, h, dp, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  // 마당 바닥 — 밟아 다진 흙(밭 잔디와 구분). 울타리 서쪽 면에 딱 붙는다
  const yard = box(YARD_D, 0.2, YARD_HZ * 2, clayMat(0xbda476, false), -H - YARD_D / 2, 0.05, 0);
  yard.castShadow = false; yard.receiveShadow = true;
  // 건물 — 작은 측량 오두막(사용자 지적 2026-09-13: "넓히기만 하는데 너무 크다" → 4.2 → 2.6폭으로 축소).
  //   색·지붕은 밭 시설 세트(BARN)와 같게 — 빨간 판자 + 회색 갬브럴 + 흰 트림.
  //   다듬기(sims/survey-sim.html C안, 2026-09-21): 판자 결 + 지붕 널 + 차양·굴뚝·등불·도면 통.
  //   ⚠️ 문·창은 **z 폭**이다. 예전엔 x 폭(0.8)이라 정면에서 두께 0.08 짜리 선으로만 보였다
  //      — 문틀(흰 트림)은 z 기준으로 세워 둬서 둘이 어긋나 있었다.
  const OW = 2.6, OD = 2.3, OE = 1.5, OK2 = 2.0, OR = 2.4;
  const TP = 0.045;   // 트림이 벽 밖으로 나오는 여유. 반두께(0.06)면 면이 겹쳐 줄무늬가 어른거린다
  const P = (geo, hex) => paintGeo(geo, hex);
  const at = (geo) => geo.translate(o.x, 0, o.z);          // 밭 로컬 → 건물 자리
  {
    const solid = [];
    solid.push(P(at(gambrelSolid(OW, OE, OK2, OR, OD).rotateY(Math.PI / 2).translate(0, 0.22, 0)), BARN.wall));
    for (const q of gambrelRoofSlabs(OW, OE, OK2, OR, OD + 0.25))
      solid.push(P(at(q.rotateY(Math.PI / 2).translate(0, 0.22, 0)), BARN.roof));
    solid.push(P(at(new THREE.BoxGeometry(3.0, 0.22, 2.7).translate(0, 0.11, 0)), BARN.base));   // 돌 기초

    // 판자 결 — 벽에 세로 홈. 있어야 벽이 '판자' 로 읽힌다(단색은 종이 상자로 보인다)
    const PH = OE - 0.12;
    for (const sx of [1, -1]) for (let i = -3; i <= 3; i++) {
      const z = i * 0.34; if (Math.abs(z) > OW / 2 - 0.22) continue;
      solid.push(P(at(new THREE.BoxGeometry(0.03, PH, 0.05).translate(sx * (OD / 2 + 0.005), 0.22 + PH / 2, z)), BARN.dark));
    }
    for (const sz of [1, -1]) for (let i = -2; i <= 2; i++) {
      const x = i * 0.38; if (Math.abs(x) > OD / 2 - 0.2) continue;
      solid.push(P(at(new THREE.BoxGeometry(0.05, PH, 0.03).translate(x, 0.22 + PH / 2, sz * (OW / 2 + 0.005))), BARN.dark));
    }

    // 지붕 널 — 경사면에 가로 단을 얹어 '널을 이었다' 로 읽히게
    {
      const hw = OW / 2;
      for (const sgn of [1, -1]) {
        const ax = sgn * (hw + 0.15), ay = OE - 0.07, bx = sgn * hw * 0.62, by = OK2, cx = 0, cy = OR + 0.07;
        for (const t of [0.2, 0.42, 0.68, 0.88]) {
          const [px, py] = t < 0.55 ? [ax + (bx - ax) * (t / 0.55), ay + (by - ay) * (t / 0.55)]
                                    : [bx + (cx - bx) * ((t - 0.55) / 0.45), by + (cy - by) * ((t - 0.55) / 0.45)];
          solid.push(P(at(new THREE.BoxGeometry(OD + 0.3, 0.045, 0.1).translate(0, 0.22 + py + 0.088, px)), 0x7c828a));
        }
      }
    }

    // 🏕️ 문 위 줄무늬 차양 — 정면에 그늘이 져 입구가 어디인지 바로 읽힌다
    for (let i = 0; i < 5; i++)
      solid.push(P(at(new THREE.BoxGeometry(0.78, 0.06, 0.21).rotateZ(-0.3).translate(OD / 2 + 0.34, 1.66, 0.3 + (i - 2) * 0.21)), i % 2 ? BARN.trim : BARN.wall));
    for (const sz of [-0.42, 1.02])
      solid.push(P(at(new THREE.BoxGeometry(0.05, 0.52, 0.05).rotateZ(0.52).translate(OD / 2 + 0.26, 1.42, sz)), BARN.wood));

    // 🧱 굴뚝 — 지붕선에 수직 요소가 하나 있어야 실루엣이 산다
    solid.push(P(at(new THREE.BoxGeometry(0.34, 1.1, 0.34).translate(-0.5, 2.5, -0.62)), BARN.base));
    solid.push(P(at(new THREE.BoxGeometry(0.44, 0.1, 0.44).translate(-0.5, 3.08, -0.62)), 0x7d7469));

    // 📜 벽에 기대 둔 도면 통 — 말뚝 다발(z +1.0)과 반대쪽이라 겹치지 않는다
    for (const [dz, h, tilt] of [[-1.12, 0.78, 0.2], [-0.99, 0.66, -0.14]])
      solid.push(P(at(new THREE.CylinderGeometry(0.065, 0.065, h, 7).rotateX(tilt).translate(OD / 2 + 0.16, h / 2 + 0.12, dz)), 0xdcd2bb));

    // 문 + 흰 트림(문틀 · 모서리 기둥 · 창틀)
    solid.push(P(at(new THREE.BoxGeometry(0.08, 1.15, 0.8).translate(OD / 2 + 0.02, 0.8, 0.3)), BARN.dark));
    const tb = (w, h, d, x, y, z) => solid.push(P(at(new THREE.BoxGeometry(w, h, d).translate(x, y, z)), BARN.trim));
    tb(0.1, 1.25, 0.08, OD / 2 + 0.05, 0.82, -0.14); tb(0.1, 1.25, 0.08, OD / 2 + 0.05, 0.82, 0.74); tb(0.1, 0.1, 0.96, OD / 2 + 0.05, 1.42, 0.3);
    for (const [tx2, tz2] of [[-OD / 2 + TP, -OW / 2 + TP], [-OD / 2 + TP, OW / 2 - TP], [OD / 2 - TP, -OW / 2 + TP], [OD / 2 - TP, OW / 2 - TP]])
      tb(0.12, OE, 0.12, tx2, 0.22 + OE / 2, tz2);
    // 창틀 — 틀이 없으면 창이 벽에 붙인 판때기로 읽힌다
    for (const wy of [1.42, 0.88]) tb(0.09, 0.07, 0.74, OD / 2 + 0.05, wy, -0.55);
    for (const wz of [-0.89, -0.21]) tb(0.09, 0.61, 0.07, OD / 2 + 0.05, 1.15, wz);
    tb(0.09, 0.54, 0.05, OD / 2 + 0.05, 1.15, -0.55);                 // 가운데 살
    const sm = new THREE.Mesh(mergeGeos(solid), vtxMat()); sm.castShadow = true; sm.receiveShadow = true; g.add(sm);
  }
  {   // 🏮 창 둘 + 처마 등불 — 밤에 함께 켜진다(재질 하나를 houseWindows 가 물고 있다)
    const win = clayMat(0xffe3a4, false); houseWindows.push(win);
    const lit = [
      at(new THREE.BoxGeometry(0.08, 0.5, 0.6).translate(OD / 2 + 0.02, 1.15, -0.55)),   // 동쪽 창(정면)
      at(new THREE.BoxGeometry(0.62, 0.5, 0.08).translate(-0.68, 1.12, OW / 2 + 0.02)),  // 남쪽 창 — 벽 왼쪽(오른쪽은 간판 자리)
      at(new THREE.BoxGeometry(0.18, 0.2, 0.18).translate(OD / 2 + 0.16, 1.58, -0.2)),   // 등불
    ];
    const wm = new THREE.Mesh(mergeGeos(lit), win); wm.castShadow = false; g.add(wm);
    box(0.06, 0.18, 0.06, woodMat(1, 1), o.x + OD / 2 + 0.16, 1.76, o.z - 0.2);          // 등불 걸이
    box(0.74, 0.08, 0.06, clayMat(BARN.trim, false), o.x - 0.68, 0.84, o.z + OW / 2 + 0.03);  // 남쪽 창 선반
  }
  // 남쪽 벽 간판 — 처마 그늘(y 1.62)에 묻혀 글씨가 안 읽혔다(2026-09-21). 벽 가운데로 내리고
  //   🪟 남쪽 창(x -0.74)과 자리를 나눠 오른쪽에 붙인다. 벽에서 띄워야 판이 벽에 파묻히지 않는다.
  const sign = makeSignBoard('📐 측량소'); sign.scale.setScalar(0.56);
  sign.position.set(o.x + 0.36, 1.16, o.z + OW / 2 + 0.12); g.add(sign);

  // 제도 탁자 — 여기 서면 다음 단계 비용이 프롬프트에 뜬다
  box(1.6, 0.1, 1.1, woodMat(2, 1, 0xc9a071), d.x, 0.8, d.z);
  box(1.1, 0.75, 0.7, woodMat(1, 1), d.x, 0.38, d.z);
  const plan = box(0.95, 0.03, 0.65, clayMat(0xbfdcee, false), d.x + 0.08, 0.87, d.z);  // 청사진
  plan.rotation.y = 0.18; plan.castShadow = false;
  // 삼각대 측량기 — 탁자 옆
  const tx = d.x - 0.3, tz = d.z - 1.7;
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.35, 5), woodMat(1, 1));
    leg.position.set(tx + Math.cos(a) * 0.22, 0.66, tz + Math.sin(a) * 0.22);
    leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); leg.castShadow = true; g.add(leg);
  }
  box(0.3, 0.22, 0.3, clayMat(0x5b6472), tx, 1.42, tz);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), clayMat(0x3f4650));
  scope.position.set(tx + 0.2, 1.56, tz); scope.rotation.z = Math.PI / 2; scope.castShadow = true; g.add(scope);
  // 밭 문 → 탁자 디딤돌 3장(어디로 가면 되는지 바닥이 말해 준다) — 한 메시로 합친다
  {
    const sts = [];
    for (let i = 0; i < 3; i++) sts.push(new THREE.BoxGeometry(0.7, 0.08, 0.55).translate(-H - 0.9 - i * 1.5, 0.13, -0.5 - i * 0.65));
    const st = new THREE.Mesh(mergeGeos(sts), clayMat(0xa89272)); st.receiveShadow = true; g.add(st);
  }
  // 벽에 기대 둔 말뚝 다발(옛 측량 말뚝이 여기로 왔다) — 역시 한 메시
  {
    const sts = [];
    for (const [dx, r] of [[-0.16, 0.16], [0.14, -0.13]]) sts.push(new THREE.BoxGeometry(0.1, 1.4, 0.1).rotateZ(r).rotateX(0.1).translate(o.x + 1.32 + dx, 0.7, o.z + 1.0));
    const st = new THREE.Mesh(mergeGeos(sts), woodMat(1, 1)); st.castShadow = true; g.add(st);
  }
  // 🔧 자재 작업대 — 마을 작업대(spawnWorkbench)와 같은 조형. 액션이면 제작 메뉴의 🌷야외 탭이 열린다
  // 🔧 자재 작업대 — 상판·다리·뒤판 공구걸이·목재 더미까지 나무는 한 메시로 묶는다(조형은 살리고 드로우콜은 아끼고)
  const b = surveyBenchPos(H);
  const mergeAt = (geos, mat, shadow = true) => { const m = new THREE.Mesh(mergeGeos(geos), mat); m.castShadow = shadow; g.add(m); return m; };
  const bb = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(b.x + x, y, b.z + z);
  const bcy = (r, h, x, y, z, rz = 0) => { const q = new THREE.CylinderGeometry(r, r, h, 7); if (rz) q.rotateZ(rz); return q.translate(b.x + x, y, b.z + z); };
  const btop = mergeAt([
    bb(1.7, 0.16, 0.95, 0, 0.78, 0),                                        // 상판
    bb(0.14, 0.76, 0.14, -0.7, 0.38, -0.36), bb(0.14, 0.76, 0.14, 0.7, 0.38, -0.36),
    bb(0.14, 0.76, 0.14, -0.7, 0.38, 0.36), bb(0.14, 0.76, 0.14, 0.7, 0.38, 0.36),
    bb(1.7, 0.08, 0.12, 0, 0.3, -0.36),                                     // 아래 가로대
    bb(1.8, 0.9, 0.08, 0, 1.32, -0.52),                                     // 뒤판(공구걸이)
    bcy(0.06, 0.9, -0.55, 0.95, 0.34, Math.PI / 2), bcy(0.05, 0.8, -0.55, 1.06, 0.34, Math.PI / 2),   // 굴러 놓인 목재
  ], woodMat(2, 2, 0xc9a071));
  mergeAt([                                                                  // 쇠붙이 — 바이스 · 망치 · 톱날
    bb(0.28, 0.22, 0.24, -0.52, 0.95, 0),
    bb(0.1, 0.1, 0.18, 0.46, 0.9, 0.08), bb(0.34, 0.05, 0.08, 0.28, 0.9, 0.08),
    bb(0.5, 0.26, 0.03, 0.42, 1.42, -0.46),
  ], clayMat(0x8b8b93));
  { const lamp = clayMat(0xffd98a, false); houseWindows.push(lamp);          // 🏮 작업대 등불 — 밤에 켜진다
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 9, 8), lamp); l.position.set(b.x - 0.78, 1.66, b.z - 0.5); g.add(l); }
  g.add(makeSignpost('🔧 자재 작업대', b.x + 1.5, b.z - 0.1));   // 마을 작업대와 같이 옆 팻말(기둥 콜라이더는 rAF 에서 등록)
  // 🚧 건물·탁자·작업대 충돌 — 뚫고 지나가지 못하게(월드 좌표. farmGroup 정리에서 removeSolid 된다)
  yard.userData.solid = solidBox(FARM.x + o.x - 1.35, FARM.z + o.z - 1.4, FARM.x + o.x + 1.35, FARM.z + o.z + 1.4);   // 🚧 작아진 오두막 발자국
  //  ⚠️ 탁자·작업대는 **가로로 긴 사각**이다. 원으로 막으면 반지름이 조형의 대각(탁자 0.97 · 작업대 1.02)보다
  //     작아 좌우 끝과 모서리가 원 밖에 남고, 그 틈으로 캐릭터가 조형에 파고든다(2026-09-23 토스 -72 스샷).
  //     원을 대각까지 키우면 앞뒤로도 같이 두꺼워져 마당 통로가 좁아진다 — 🫙발효통(VAT_BOX)처럼 발자국 사각으로 막는다.
  //     ⚠️ 상호작용 판정은 둘 다 중심에서 1.9 다. 박스를 키울 땐 tests/farm-stage 가 접근 가능 여부까지 본다.
  const solidSpan = (cx, cz, hw, z1, z2) => solidBox(cx - hw, cz + z1, cx + hw, cz + z2);
  plan.userData.solid = solidSpan(FARM.x + d.x, FARM.z + d.z, 0.80, -0.55, 0.55);   // 제도 탁자 상판 1.6×1.1
  btop.userData.solid = solidSpan(FARM.x + b.x, FARM.z + b.z, 0.90, -0.56, 0.48);   // 작업대 뒤판 폭 1.8 · 상판 깊이 0.95
  return g;
}

// 텃밭 필드(잔디 바닥 + 울타리 + 나가는 문 + 📐측량 말뚝) — 단계(farmHalf)에 맞춰 다시 지을 수 있다.
//   흙·작물·배지 InstancedMesh 는 plots 만 덮는 동적 버퍼라(scene 직속) 여기와 무관 — 울타리 안쪽 지형만 다시 그린다.
//   silent=false 면 증축 축하 연출(색종이·반짝임·효과음). 초기 생성·세이브 복원·dev 파라미터는 silent=true.
export function rebuildFarm(silent = false) {
  if (farmGroup) {
    // 이 그룹의 재질·지오메트리는 전부 여기서 만든 것(clayMat/woodMat 은 호출마다 새 재질, 텍스처는 clone) — 공유 자원 없음
    farmGroup.traverse(o => {
      if (o.userData.solid) removeSolid(o.userData.solid);   // 팻말 기둥 콜라이더 — 안 치우면 옛 울타리 자리에 안 보이는 벽이 남는다
      o.userData.dead = true;                                // 아직 rAF 등록 전인 팻말은 등록 자체를 건너뛰게(makeSignpost 참고)
      if (!o.isMesh) return;
      o.geometry.dispose();
      const hi = houseWindows.indexOf(o.material); if (hi >= 0) houseWindows.splice(hi, 1);   // 🏮 측량소 창 — 목록에 남으면 사라진 재질을 밤마다 켠다
      // 팻말(makeSignBoard)의 캔버스 텍스처처럼 dispose 가 없는 map 도 있다 — 옵셔널로 부른다(예외가 나면 옛 울타리가 그대로 남는다)
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) { m?.map?.dispose?.(); m?.dispose?.(); }
    });
    scene.remove(farmGroup); $w.farmGroup = null;
  }
  const g = new THREE.Group(); g.position.copy(FARM);
  // 주변 배경 — 필드가 마을 지면(r60) 밖 허공에 떠 있어, 밤엔 필드 너머가 하늘색 허공으로
  // 그대로 노출됐다(밤 그레이딩까지 얹혀 보랏빛 허공). 동굴·안개 숲처럼 자체 배경을 깐다.
  const skirtGeo = new THREE.CircleGeometry(48, 48); skirtGeo.rotateX(-Math.PI / 2);
  const skirt = new THREE.Mesh(skirtGeo, clayMat(PAL.groundDark, false));
  skirt.position.y = -0.02; skirt.receiveShadow = true; g.add(skirt);
  // 둘레 나무 24그루(장식) — 강둑 나무와 같은 간단 조형. 남쪽 출입구 방향은 비워 시야 확보.
  //   줄기·잎을 각각 InstancedMesh 1개로 묶는다(48메시 → 2콜). 줄기 높이(h)가 위치마다 달라
  //   지오메트리 자체 높이는 1로 고정해 두고 인스턴스 행렬의 Y 스케일로 표현한다(반지름은 그대로).
  //   잎 색은 원래 leaf1/2/3 세 가지였으나 배경 장식이라 차이가 안 보여 leaf1 하나로 통일(재질 절감).
  const H = farmHalf();
  const _trees = perimeterTrees(H);                                // 자리 규칙은 js/farm-stage.js (남쪽 출입구 비움)
  const _treeTrunks = _trees.map(t => [t.x, t.h, t.z]);
  const _treeLeaves = _trees.map(t => [t.x, t.h + 1.0, t.z]);
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1, 5), clayMat(PAL.trunk), _treeTrunks.length);
  const leafMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 2.6, 6), clayMat(PAL.leaf1), _treeLeaves.length);
  {
    const _tm = new THREE.Matrix4(), _ts = new THREE.Vector3(), _tq = new THREE.Quaternion(), _tp = new THREE.Vector3();
    _treeTrunks.forEach(([x, h, z], i) => { _ts.set(1, h, 1); _tp.set(x, h / 2, z); _tm.compose(_tp, _tq, _ts); trunkMesh.setMatrixAt(i, _tm); });
    _treeLeaves.forEach(([x, y, z], i) => { _tm.makeTranslation(x, y, z); leafMesh.setMatrixAt(i, _tm); });
  }
  trunkMesh.instanceMatrix.needsUpdate = true; leafMesh.instanceMatrix.needsUpdate = true;
  g.add(trunkMesh, leafMesh);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(H * 2, 0.2, H * 2), clayMat(0x8fce7e, false));
  ground.position.y = 0.05; ground.receiveShadow = true; g.add(ground);
  // 울타리 둘레 — 말뚝 35~58개가 위치만 다르고 크기·재질은 같아 InstancedMesh 1개로 묶는다(자리 규칙은 js/farm-stage.js).
  const _posts = fencePosts(H);
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), woodMat(1, 1), _posts.length);
  {
    const _pm = new THREE.Matrix4();
    _posts.forEach(([x, z], i) => { _pm.makeTranslation(x, 0.35, z); postMesh.setMatrixAt(i, _pm); });
  }
  postMesh.instanceMatrix.needsUpdate = true;
  g.add(postMesh);
  // 나가는 문(남쪽 가운데)
  const gate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.4), woodMat(1, 2, 0xa9743f)); gate.position.set(0, 0.16, H); g.add(gate);
  // 출구 팻말은 문 옆으로 — 문 가운데 띄우면(카메라가 남쪽이라) 문 앞에 선 캐릭터를 판이 가린다
  g.add(makeSignpost('🚪 나가기', 1.9, H - 0.2));
  // 📐 측량소 — 서쪽 문 밖 마당(밭 안 공간을 쓰지 않는다). 근접하면 다음 단계 비용 프롬프트, 액션이면 증축
  g.add(makeSurveyOffice(H));
  // 🚧 서쪽 울타리는 문(|z|<1.2)만 빼고 막는다 — 안 막으면 울타리를 그대로 통과해 마당으로 새어 나간다(이동 제한이 두 사각형이라)
  for (const [z0, z1] of [[-H, -1.6], [1.6, H]]) {   // ±1.6 — 말뚝 공백(±1.5)보다 살짝 넓게 열어야 캐릭터 반경(0.45)까지 통과 여유가 난다
    const mk = new THREE.Object3D(); mk.userData.solid = solidBox(FARM.x - H - 0.2, FARM.z + z0, FARM.x - H + 0.2, FARM.z + z1); g.add(mk);
  }
  // (허수아비 장식은 제거 — 이제 작업대에서 만들어 직접 배치해야 밤손님을 막는다)
  scene.add(g); $w.farmGroup = g; farmGroup.visible = atFarm;   // 텃밭에 있을 때만 표시
  $w.playerInYard = false;   // 울타리가 새 자리로 나갔다 — 증축 직후 캐릭터는 넓어진 밭 안이다
  if (!silent) {   // 🏗️ 증축 축하 — 토스트·요약은 호출부(surveyOfficeInteract)가 담당(집 증축과 같은 분담)
    //   밀착 줌(triggerMoment)은 울타리가 화면 밖이라 "뭐가 좋아졌는지" 가 안 보였다(사용자 지적 2026-09-13)
    //   → 뒤로 물러나 새 울타리 네 모서리에서 색종이가 터지는 조망샷으로 바꾼다.
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) spawnConfetti(FARM.x + sx * (H - 0.5), 2.2, FARM.z + sz * (H - 0.5));
    spawnSparkle(FARM.x, 2.4, FARM.z, 46);
    Sound.complete(); triggerFarmReveal();
  }
}
