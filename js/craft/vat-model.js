// =============================================================
//  🫙 발효통 — 눕힌 오크통 조형 (sims/vat-sim.html 에서 확정한 B안)
//  ------------------------------------------------------------
//  레퍼런스는 양조장 배럴: 배흘림 통 · 금테 · X자 받침 · 놋쇠 꼭지.
//  · 통 축은 **좌우(x)** 다. 앞뒤로 눕히면 정면에서 원만 보여 배흘림이 죽는다(시안 1차 실패).
//  · X 는 교차점이 **통 아래** 로 내려와야 X 로 보인다. 위로 숨기면 다리 네 개가 된다(시안 2차 실패).
//  · 받침 높이는 통 곡면에서 계산한다 — 띄워 두면 다리 달린 짐승이 된다(시안 3차 실패).
//  build(THREE, H) → { group, parts } · H = { paint, vtx, merge } (js/game.js 의 재질 헬퍼)
//  상태 토글은 parts.firing / parts.done 의 visible 로만 한다(안 보이면 드로우콜도 안 잡힌다).
// =============================================================

export const VAT_SCALE = 1.3;        // 마을 기준 체감 크기 — 🔥 화덕(1.35배, 폭 2.21)과 나란히 서야 한다

const C = {
  wood:  0x8a5a3a,   // 통널
  woodL: 0xa87a4e,   // 마구리(통 끝을 막는 판) — 살짝 밝아야 통 끝이 읽힌다
  gold:  0xc9a44e,   // 쇠테·꼭지
  lever: 0xb04a3a,   // 꼭지 손잡이 — 금색 속 붉은 점 하나가 눈을 잡는다
  leg:   0x6b4a34,   // 받침
  grape: 0x6d4a72,
  juice: 0x7d3a5a,
  basket: 0xb08a5a,
  cup:   0xe8dcc4,
  cork:  0x5a4a3a,
};

const LEN = 1.45, R_MID = 0.5, R_END = 0.39;
// 땅에 놓는 소품은 반드시 이만큼 띄운다. 밑면이 y=0 과 딱 맞으면 카메라가 움직일 때마다
// 두 면이 앞뒤로 다퉈 아른거린다(z-fighting, 사용자 지적 2026-09-21).
const LIFT = 0.02;
const HOOP_TS = [0.1, 0.5, 0.9];
const Y0 = R_MID + 0.42;             // 통 중심 높이 — X자 교차점이 보이게 띄운다
const TILT = 0.5;

/** t(0~1) 에서의 통 반지름 — 테·받침 높이를 여기서 뽑아야 통에 딱 붙는다 */
function staveR(t) {
  const b = Math.sin(Math.PI * Math.min(1, Math.max(0, t)) ** 0.78);   // 끝에서 빨리 부풀고 가운데는 평평
  return R_END + (R_MID - R_END) * b;
}

function staveProfile(THREE, n = 7) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2(staveR(t), t * LEN)); }
  return pts;
}

/** y 축으로 세워 만든 지오메트리를 통 축(좌우)으로 눕힌다 — (0,h,0) → x = LEN/2 - h */
function layDown(geo) { return geo.rotateZ(Math.PI / 2).translate(LEN / 2, Y0, 0); }

export function build(THREE, H) {
  const group = new THREE.Group();
  const vg = new THREE.Group(); vg.scale.setScalar(VAT_SCALE); group.add(vg);

  // ⚡ 통·마구리·금테·받침·꼭지는 색만 다르다 → 정점색으로 한 덩이(12 → 1 드로우콜)
  const still = [
    H.paint(layDown(new THREE.LatheGeometry(staveProfile(THREE), 12)), C.wood),
    ...[0.02, LEN - 0.02].map(h =>
      H.paint(layDown(new THREE.CylinderGeometry(R_END * 0.94, R_END * 0.94, 0.05, 12).translate(0, h, 0)), C.woodL)),
    ...HOOP_TS.map(t => {
      const r = staveR(t) + 0.018;
      return H.paint(layDown(new THREE.CylinderGeometry(r, r, 0.055, 12).translate(0, t * LEN, 0)), C.gold);
    }),
  ];

  // 받침 — X자 두 짝 + 가로 보. 교차점은 통 아랫면보다 낮다
  const rr0 = staveR(0.19), topY = Y0 - rr0 * 0.55;
  for (const x of [-LEN * 0.31, LEN * 0.31]) {
    for (const sz of [-1, 1]) {
      still.push(H.paint(new THREE.BoxGeometry(0.15, topY / Math.cos(TILT), 0.115)
        .rotateX(sz * TILT).translate(x, topY * 0.5, 0), C.leg));
    }
  }
  still.push(H.paint(new THREE.BoxGeometry(LEN * 0.66, 0.1, 0.1).translate(0, topY * 0.5, 0), C.leg));

  // 꼭지 — 통 배 앞쪽(+z) 아래. 통 곡면에 박히게 z 를 원 위에서 구한다
  const dy = R_MID * 0.36, dz = Math.sqrt(Math.max(0.01, R_MID * R_MID - dy * dy)), ty = Y0 - dy;
  still.push(
    H.paint(new THREE.CylinderGeometry(0.062, 0.062, 0.17, 8).rotateX(Math.PI / 2).translate(0, ty, dz + 0.06), C.gold),
    H.paint(new THREE.CylinderGeometry(0.044, 0.052, 0.13, 8).translate(0, ty - 0.08, dz + 0.13), C.gold),
    H.paint(new THREE.BoxGeometry(0.055, 0.15, 0.055).rotateX(-0.25).translate(0, ty + 0.12, dz + 0.06), C.lever),
  );
  vg.add(new THREE.Mesh(H.merge(still), H.vtx()));

  // 익는 중 — 재료를 넣어둔 티가 나야 한다. 통 등의 마개 + 옆에 놓인 포도 바구니.
  //   마개는 게임 카메라 각도에선 거의 안 보인다 — 멀리서 읽히는 신호는 **바구니** 다
  const firing = new THREE.Group(); vg.add(firing);
  firing.userData.noShadow = true;     // 잔·병·포도알은 섀도맵 텍셀보다 작아 카메라가 움직이면 그림자가 지글거린다
  firing.add(new THREE.Mesh(H.merge([
    H.paint(new THREE.CylinderGeometry(0.1, 0.085, 0.14, 8).translate(0, Y0 + 0.52, 0), C.woodL),
    H.paint(new THREE.CylinderGeometry(0.25, 0.19, 0.22, 9).translate(0.7, 0.11 + LIFT, 0.46), C.basket),
    ...[[0, 0.11, 0], [-0.09, 0.09, 0.06], [0.08, 0.1, -0.05], [0.02, 0.16, 0.05]].map(([dx2, dy2, dz2]) =>
      H.paint(new THREE.SphereGeometry(0.072, 6, 5).translate(0.7 + dx2, 0.22 + LIFT + dy2, 0.46 + dz2), C.grape)),
  ]), H.vtx()));

  // 다 익었다 — 꼭지 아래 잔에 즙이 받쳐지고 채운 병이 선다.
  //   즙 색이 통 밖으로 나와야 멀리서도 '받아 갈 게 있다' 가 읽힌다(🔥 화덕 상판과 같은 역할)
  const done = new THREE.Group(); vg.add(done);
  done.userData.noShadow = true;       // 위와 같은 이유 — 통 그림자 안이라 있어도 안 보인다
  done.add(new THREE.Mesh(H.merge([
    H.paint(new THREE.CylinderGeometry(0.14, 0.11, 0.19, 9).translate(0, 0.095 + LIFT, 0.74), C.cup),
    // 즙 면은 잔 **안쪽** 으로 내린다 — 테두리와 같은 높이면 두 면이 다툰다
    H.paint(new THREE.CylinderGeometry(0.125, 0.125, 0.03, 9).translate(0, 0.155 + LIFT, 0.74), C.juice),
    ...[[-0.46, 0.72], [0.48, 0.74]].flatMap(([x, z]) => [
      H.paint(new THREE.CylinderGeometry(0.085, 0.095, 0.3, 8).translate(x, 0.15 + LIFT, z), C.juice),
      H.paint(new THREE.CylinderGeometry(0.032, 0.048, 0.1, 8).translate(x, 0.34 + LIFT, z), C.cork),
    ]),
  ]), H.vtx()));

  return { group, parts: { firing, done } };
}

/** 충돌 상자 — 캐릭터가 통을 뚫지 않게. 받침까지 덮는 발자국(월드 단위) */
export const VAT_BOX = { w: LEN * VAT_SCALE + 0.3, d: R_MID * 2 * VAT_SCALE + 0.2 };
