// 🪜 계단 컨셉 — "구멍형(내려가기)" + "벽 따라 오르기" + "루프탑 계단실 박스"
//   실제 js/game.js 는 아직 손대지 않는다(이 파일은 격리된 뷰어 전용). 사용자가 방향을 고르면 그때 포팅한다.
//   벽은 안 짓는다 — 카메라를 가려서 실루엣 판단이 안 됐다(리뷰). 바닥판 자체의 가장자리가
//   그 방의 실제 반경(half)을 보여주는 척도다("다락에 이 계단이 과한가"는 바닥 가장자리로 본다).

// 단계 → 실제 게임 방 반경(js/house-floors.js 그대로: 1층 7·다락 4.5·2층 6). 6단계는 2층을 그대로 쓴다.
export const HALF_BY_STAGE = { 3: 7, 4: 4.5, 5: 6, 6: 6 };

// 계단 치수(공통) — index.html 카메라 타게팅과 여기 지오메트리가 같은 숫자를 봐야 한다.
const DSTEPS = 9, DRISE = 0.25, DRUN = 0.34;                 // 내려가는 계단(구멍형) — 9단으로 구멍 길이(3.2)를 거의 채운다
const ASTEPS = 12, ARISE = 0.25, ARUN = 0.32, ATW = 1.1;      // 올라가는 계단(벽 붙박이, 천장 3.0 까지)
const HOLE_HW = 0.7, HOLE_HD = 1.6;                            // 구멍 반폭·반깊이(1.4×3.2)

// 순수 함수(THREE 불필요) — 카메라가 봐야 할 지점을 지오메트리와 같은 공식으로 계산한다.
export function layout(variant) {
  const half = variant === 'rooftop' ? 5 : (HALF_BY_STAGE[Number(variant)] || 5);
  const holeX = -half * 0.32, holeZ = -half * 0.05;
  const ax = half - ATW / 2 - 0.12, az = half - 1.2;   // 오른쪽 벽 붙박이 계단 진입점
  return { half, holeX, holeZ, ax, az, x1: holeX - HOLE_HW, x2: holeX + HOLE_HW, z1: holeZ - HOLE_HD, z2: holeZ + HOLE_HD };
}

// variant: '3'|'4'|'5'|'6'|'rooftop'. part: 'ascend'|'descend'|'rooftop' — 한 번에 하나만 짓는다(서로 가리지 않게).
export function build(THREE, H, variant, part = 'ascend') {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };

  const FINISH = {
    3: { floor: 0xbfb0a0, tread: 0x9c6b40, rail: 0x8a5a36, name: '3 코티지 — 따뜻한 원목' },
    4: { floor: 0xb9b3a8, tread: 0x23252a, rail: 0x23252a, name: '4 브릭 로프트 — 어두운 철골(loft.js)' },
    5: { floor: 0xe2ddd2, tread: 0xb98a4e, rail: 0x1e1f23, name: '5 펜트하우스 — 원목 디딤판+검은 난간(penthouse.js)' },
    6: { floor: 0xf1ece3, tread: 0x2a2e33, rail: 'glass', name: '6 빌라 — shadowGap 디딤판+유리 난간(villa.js)' },
  };
  const stage = variant === 'rooftop' ? 6 : (Number(variant) || 4);
  const fin = FINISH[stage] || FINISH[4];
  const { half, holeX, holeZ, ax, az, x1, x2, z1, z2 } = layout(variant);
  const W = half * 2;

  const floorMat = H.clay(fin.floor);
  const treadMat = H.clay(fin.tread);
  const railMat = fin.rail === 'glass' ? H.glass(0xa9d8ea) : H.clay(fin.rail);
  if (fin.rail === 'glass') railMat.opacity = 0.22;   // villa.js railGlass 와 같은 값

  const capMat = H.clay(0x8a8f96);
  const mkCapsule = (x, z, y = 0.55) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.3, 4, 8), capMat); c.position.set(x, y, z); c.castShadow = true; add(c); };
  // 두 점을 정확히 잇는 원기둥 — 회전각을 손으로 계산하다 기둥/손잡이가 어긋났다(리뷰: "기둥 끝이 손잡이 선과 안 맞는다").
  //   끝점 두 개를 직접 넣으면 삼각함수 부호 실수가 끼어들 자리가 없다.
  const rodBetween = (p1, p2, r, mat) => {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2];
    const len = Math.hypot(dx, dy, dz);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
    m.position.set((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2);
    const axis = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(dx, dy, dz).normalize();
    m.quaternion.setFromUnitVectors(axis, dir);
    m.castShadow = true; return m;
  };

  if (variant === 'rooftop') {
    // ── 루프탑: 나무 데크 + 흰 프레임 계단실 박스(villa.js 어휘: 프레임 0xf4f3ee·짙은 유리·유리 난간) ──
    const deckMat = H.clay(0xc19a66);
    add(H.box(W, 0.16, W, deckMat, 0, -0.08, 0));
    const frame = H.clay(0xf4f3ee);
    const darkGlass = H.glass(0x1e3242); darkGlass.opacity = 0.6;
    const BX = -1.6, BZ = -1.2, BW = 1.7, BD = 1.7, BH = 2.9;   // BH 2.3→2.9 — 문이 캐릭터(키 1.1)보다 확실히 커 보이게(리뷰: "캡슐이랑 비슷해서 옹색해 보인다")
    add(H.box(BW, BH, 0.1, frame, BX, BH / 2, BZ - BD / 2));                    // 뒤벽
    add(H.box(0.1, BH, BD, frame, BX - BW / 2, BH / 2, BZ));                    // 왼벽
    add(H.box(0.1, BH, BD, frame, BX + BW / 2, BH / 2, BZ));                    // 오른벽
    add(H.box(BW + 0.16, 0.12, BD + 0.16, frame, BX, BH + 0.06, BZ));           // 지붕 캡
    add(H.box(BW - 0.3, BH - 0.3, 0.06, darkGlass, BX, BH / 2, BZ - BD / 2 + 0.09));   // 뒷면 통유리
    add(H.box(0.9, BH - 0.2, 0.08, frame, BX, (BH - 0.2) / 2, BZ + BD / 2));            // 문틀
    add(H.box(0.64, BH - 0.5, 0.05, darkGlass, BX, (BH - 0.2) / 2 + 0.05, BZ + BD / 2 + 0.05));  // 문 유리
    add(H.box(2.4, 0.85, 0.05, railMat, BX + 0.3, 0.5, BZ + BD / 2 + 0.9));      // 유리 난간
    mkCapsule(0.9, -1.0);   // 카메라에서 더 멀리 — 문 바로 앞이라 가까우면 원근 때문에 캡슐이 실제보다 크게 보인다
    return g;
  }

  if (part === 'descend') {
    // ── A. 내려가는 계단 — 바닥에 진짜 구멍을 낸다(4조각 프레임) + 그 안으로 내려간다 ──
    //   ⚠️ 통 바닥판 하나로 지으면 구멍이 안 뚫려 계단이 바닥 밑에 안 보이게 묻힌다(1차 재촬영에서 겪은 버그).
    add(H.box(x1 - (-half), 0.2, W, floorMat, (-half + x1) / 2, -0.1, 0));                 // 왼쪽 띠
    add(H.box(half - x2, 0.2, W, floorMat, (x2 + half) / 2, -0.1, 0));                     // 오른쪽 띠
    add(H.box(x2 - x1, 0.2, z1 - (-half), floorMat, holeX, -0.1, (-half + z1) / 2));       // 앞 띠(입구 쪽, 열어 둔다)
    add(H.box(x2 - x1, 0.2, half - z2, floorMat, holeX, -0.1, (z2 + half) / 2));           // 뒤 띠
    const flightDepth = DSTEPS * DRISE;      // 2.25 — 디딤판이 실제로 닿는 깊이
    const shaftDepth = flightDepth + 1.75;   // 4.0 — 계단이 끝난 뒤로도 한참 더 어둠 속으로 이어진다("아래층으로 가는 통로", 얕은 상자 아님)
    // 벽을 위/아래 두 톤으로 나눈다 — 디딤판이 끝나는 지점(flightDepth)에서 갈라, 그 아래는 쭉 어둡게(바닥 없이 어둠 속으로).
    const shaftMatUp = H.clay(0x5e616a, { roughness: 0.95 });
    const shaftMatDown = H.clay(0x22242a, { roughness: 0.95 });
    [[0, -flightDepth, shaftMatUp], [-flightDepth, -shaftDepth, shaftMatDown]].forEach(([y0, y1, mat]) => {
      const h = y0 - y1, cy = (y0 + y1) / 2;
      add(H.box(x2 - x1, h, 0.06, mat, holeX, cy, z1));
      add(H.box(0.06, h, z2 - z1, mat, x1, cy, holeZ));
      add(H.box(0.06, h, z2 - z1, mat, x2, cy, holeZ));
      add(H.box(x2 - x1, h, 0.06, mat, holeX, cy, z2));
    });
    add(H.box(x2 - x1, 0.05, z2 - z1, shaftMatDown, holeX, -shaftDepth + 0.02, holeZ));   // 맨 밑은 그냥 닫아 둔다(바닥처럼 안 보이게 짙게)
    // 구멍 안을 밝히는 보조광 — 메인 조명은 위(해)·옆(보조광)에서 오기 때문에 바닥 밑 샤프트까지는 거의 안 닿는다.
    //   두 번째 광원은 디딤판이 끝나는 자리까지만 비춘다 — 그 아래는 자연히 어둠에 묻힌다(요청대로 "바닥 안 보여도 된다").
    const holeLight = new THREE.PointLight(0xfff4d8, 5.0, 9, 1.1);
    holeLight.position.set(holeX, 0.6, holeZ - 1.0); add(holeLight);   // 입구 쪽
    const holeLight2 = new THREE.PointLight(0xfff4d8, 4.5, 8, 1.1);
    holeLight2.position.set(holeX, -flightDepth * 0.5, holeZ + 0.2); add(holeLight2);   // 중간 — 계단이 길어져 하나로는 중간이 어둡게 죽는다
    const holeLight3 = new THREE.PointLight(0xfff4d8, 3.0, 6, 1.2);
    holeLight3.position.set(holeX, -flightDepth + 0.5, holeZ + 1.2); add(holeLight3);   // 계단 끝(뒤쪽)
    // 디딤판 폭 — 구멍 폭(1.4)을 거의 채운다(스커트용 여유 0.06 만 남긴다). 전엔 1.2 라 구멍 옆이 휑하게 비어 보였다(리뷰).
    const DTW = HOLE_HW * 2 - 0.12;
    const ENTRY_OFFSET = 0.22;   // 입구에서 첫 단까지 — 디딤판 반두께(0.2)보다 커야 판이 입구 밖으로 안 삐져나온다
    for (let i = 0; i < DSTEPS; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(DTW, 0.14, DRUN + 0.05), treadMat);
      s.position.set(holeX, -DRISE * i, z1 + ENTRY_OFFSET + i * DRUN);
      s.castShadow = true; add(s);
    }
    {
      const skirtShape = new THREE.Shape();
      skirtShape.moveTo(0, 0); skirtShape.lineTo(-0.3, 0);
      skirtShape.lineTo(-(DSTEPS * DRUN), -flightDepth); skirtShape.lineTo(0, -flightDepth); skirtShape.closePath();
      const skirtThick = 0.08;
      const geo = new THREE.ExtrudeGeometry(skirtShape, { depth: skirtThick, bevelEnabled: false });
      geo.translate(0, 0, -skirtThick / 2); geo.rotateY(Math.PI / 2);
      const skirt = new THREE.Mesh(geo, treadMat);
      skirt.position.set(holeX - DTW / 2, 0, z1 + ENTRY_OFFSET); skirt.castShadow = true; add(skirt);
      const skirt2 = skirt.clone(); skirt2.position.x = holeX + DTW / 2; add(skirt2);
    }
    {
      // 난간 3면만(왼·오른·뒤) — 입구(앞, z1 쪽)는 막지 않는다. 여기가 계단으로 내려가는 자리다(리뷰: "네 면을 다 막아 우물처럼 보인다").
      //   각목(사각 단면) — 굵은 원기둥은 이 축척에서 배관처럼 보인다(리뷰). 목공 손잡이처럼 폭>두께로 살짝 납작하게.
      const railH = 0.9, postW = 0.11, newelW = 0.14, handW = 0.12, handT = 0.07;
      const post = (cx, cz, w) => { add(H.box(w, railH, w, railMat, cx, railH / 2, cz)); };
      post(x1, z1, newelW); post(x1, z2, postW); post(x2, z2, postW); post(x2, z1, newelW);   // 네 모서리 — 입구 쪽 둘은 손스침대(굵게)
      post(x1, holeZ, postW); post(x2, holeZ, postW);                                          // 왼·오른 변 중간 기둥
      add(H.box(handT, handW, z2 - z1, railMat, x1, railH, holeZ));   // 왼쪽 손잡이
      add(H.box(x2 - x1, handW, handT, railMat, holeX, railH, z2));   // 뒤쪽 손잡이
      add(H.box(handT, handW, z2 - z1, railMat, x2, railH, holeZ));   // 오른쪽 손잡이
      // 입구 쪽엔 손잡이를 안 걸친다 — 이게 "여기로 들어간다"는 유일한 신호라 눈에 띄어야 한다.
    }
    mkCapsule(holeX + 0.15, z1 + ENTRY_OFFSET + 7 * DRUN, -7 * DRISE + 0.62);   // 뒤쪽(여덟 번째) 디딤판 위 — 머리가 바닥 아래로 뚜렷이 내려가 있어야 깊이가 읽힌다(리뷰: "머리가 바닥 높이 근처")
  } else {
    add(H.box(W, 0.2, W, floorMat, 0, -0.1, 0));   // 통 바닥판 — 가장자리가 그 단계 방의 실제 반경을 보여준다(벽은 안 짓는다)
    // ── B. 올라가는 계단 — 오른쪽 벽 자리를 따라 천장 높이(3.0)까지 닿는다 ──
    const runTotal = ASTEPS * ARUN, riseTotal = ASTEPS * ARISE;
    const slope = Math.atan2(riseTotal, runTotal);
    const runLen = Math.hypot(runTotal, riseTotal);
    for (let i = 0; i < ASTEPS; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(ATW, 0.14, ARUN + 0.05), treadMat);
      s.position.set(ax, ARISE * (i + 1), az - i * ARUN); s.castShadow = true; add(s);
    }
    const roomX = ax - (ATW / 2 - 0.05);
    const railX = ax - (ATW / 2 + 0.14);
    const RAIL_LIFT = 0.85;
    {
      const skirtShape = new THREE.Shape();
      skirtShape.moveTo(0, 0); skirtShape.lineTo(0, ARISE * 0.6);
      skirtShape.lineTo(runTotal, riseTotal); skirtShape.lineTo(runTotal, 0); skirtShape.closePath();
      const skirtThick = 0.1;
      const geo = new THREE.ExtrudeGeometry(skirtShape, { depth: skirtThick, bevelEnabled: false });
      geo.translate(0, 0, -skirtThick / 2); geo.rotateY(Math.PI / 2);
      const skirt = new THREE.Mesh(geo, treadMat);
      skirt.position.set(roomX, 0, az); skirt.castShadow = true; add(skirt);
    }
    if (fin.rail === 'glass') {
      const paneH = 0.7;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.04, paneH, runLen), railMat);
      pane.position.set(railX, riseTotal / 2 + RAIL_LIFT - paneH / 2, az - (ASTEPS - 1) * ARUN / 2);
      pane.rotation.x = slope; add(pane);
    } else {
      // 기둥은 "그 자리 디딤판 높이 + 난간 높이(0.85)" 로 꼭대기를 잡는다 — 길이를 고정값으로 주면
      // 단마다 실제 손잡이 선(기울기)과 안 맞아 기둥이 손잡이를 뚫고 올라가거나 못 미친다(리뷰에서 잡힌 버그).
      const postIdx = [0, 3, 6, 9, ASTEPS - 1];
      const postTop = (idx) => [railX, ARISE * (idx + 1) + RAIL_LIFT, az - idx * ARUN];
      const postBase = (idx) => [railX, ARISE * (idx + 1), az - idx * ARUN];
      postIdx.forEach(idx => {
        const newel = idx === 0; const r = newel ? 0.1 : 0.08;
        add(rodBetween(postBase(idx), postTop(idx), r, railMat));
      });
      // 손잡이는 기둥 "꼭대기"끼리 직접 잇는다 — 기울기를 따로 계산하지 않으니 어긋날 수가 없다.
      add(rodBetween(postTop(0), postTop(ASTEPS - 1), 0.08, railMat));
    }
    mkCapsule(ax - 1.0, az + 0.6);
  }

  return g;
}
