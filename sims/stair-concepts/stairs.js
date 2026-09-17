// 🪜 계단 컨셉 — "구멍형(내려가기)" + "벽 따라 오르기" + "루프탑 계단실 박스"
//   실제 js/game.js 는 아직 손대지 않는다(이 파일은 격리된 뷰어 전용). 사용자가 방향을 고르면 그때 포팅한다.
//   벽은 안 짓는다 — 카메라를 가려서 실루엣 판단이 안 됐다(리뷰). 바닥판 자체의 가장자리가
//   그 방의 실제 반경(half)을 보여주는 척도다("다락에 이 계단이 과한가"는 바닥 가장자리로 본다).

// 단계 → 실제 게임 방 반경(js/house-floors.js 그대로: 1층 7·다락 4.5·2층 6). 6단계는 2층을 그대로 쓴다.
export const HALF_BY_STAGE = { 3: 7, 4: 4.5, 5: 6, 6: 6 };

// 계단 치수(공통) — index.html 카메라 타게팅과 여기 지오메트리가 같은 숫자를 봐야 한다.
const DSTEPS = 8, DRISE = 0.25, DRUN = 0.34;                 // 내려가는 계단(구멍형)
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

  if (variant === 'rooftop') {
    // ── 루프탑: 나무 데크 + 흰 프레임 계단실 박스(villa.js 어휘: 프레임 0xf4f3ee·짙은 유리·유리 난간) ──
    const deckMat = H.clay(0xc19a66);
    add(H.box(W, 0.16, W, deckMat, 0, -0.08, 0));
    const frame = H.clay(0xf4f3ee);
    const darkGlass = H.glass(0x1e3242); darkGlass.opacity = 0.6;
    const BX = -1.6, BZ = -1.2, BW = 1.7, BD = 1.7, BH = 2.3;
    add(H.box(BW, BH, 0.1, frame, BX, BH / 2, BZ - BD / 2));                    // 뒤벽
    add(H.box(0.1, BH, BD, frame, BX - BW / 2, BH / 2, BZ));                    // 왼벽
    add(H.box(0.1, BH, BD, frame, BX + BW / 2, BH / 2, BZ));                    // 오른벽
    add(H.box(BW + 0.16, 0.12, BD + 0.16, frame, BX, BH + 0.06, BZ));           // 지붕 캡
    add(H.box(BW - 0.3, BH - 0.3, 0.06, darkGlass, BX, BH / 2, BZ - BD / 2 + 0.09));   // 뒷면 통유리
    add(H.box(0.9, BH - 0.2, 0.08, frame, BX, (BH - 0.2) / 2, BZ + BD / 2));            // 문틀
    add(H.box(0.64, BH - 0.5, 0.05, darkGlass, BX, (BH - 0.2) / 2 + 0.05, BZ + BD / 2 + 0.05));  // 문 유리
    add(H.box(2.4, 0.85, 0.05, railMat, BX + 0.3, 0.5, BZ + BD / 2 + 0.9));      // 유리 난간
    mkCapsule(0.2, 0.6);
    return g;
  }

  if (part === 'descend') {
    // ── A. 내려가는 계단 — 바닥에 진짜 구멍을 낸다(4조각 프레임) + 그 안으로 내려간다 ──
    //   ⚠️ 통 바닥판 하나로 지으면 구멍이 안 뚫려 계단이 바닥 밑에 안 보이게 묻힌다(1차 재촬영에서 겪은 버그).
    add(H.box(x1 - (-half), 0.2, W, floorMat, (-half + x1) / 2, -0.1, 0));                 // 왼쪽 띠
    add(H.box(half - x2, 0.2, W, floorMat, (x2 + half) / 2, -0.1, 0));                     // 오른쪽 띠
    add(H.box(x2 - x1, 0.2, z1 - (-half), floorMat, holeX, -0.1, (-half + z1) / 2));       // 앞 띠(입구 쪽, 열어 둔다)
    add(H.box(x2 - x1, 0.2, half - z2, floorMat, holeX, -0.1, (z2 + half) / 2));           // 뒤 띠
    const shaftDepth = DSTEPS * DRISE;   // 2.0 — 디딤판이 바닥까지 닿는다
    const shaftMat = H.clay(0x53565d, { roughness: 0.95 });   // 중간 회색 — 디딤판(3/4단계는 밝고 4/6단계는 어둡다)과 둘 다 대비가 나게
    add(H.box(x2 - x1, shaftDepth, 0.06, shaftMat, holeX, -shaftDepth / 2, z1));
    add(H.box(0.06, shaftDepth, z2 - z1, shaftMat, x1, -shaftDepth / 2, holeZ));
    add(H.box(0.06, shaftDepth, z2 - z1, shaftMat, x2, -shaftDepth / 2, holeZ));
    add(H.box(x2 - x1, shaftDepth, 0.06, shaftMat, holeX, -shaftDepth / 2, z2));
    add(H.box(x2 - x1 - 0.1, 0.08, z2 - z1 - 0.1, shaftMat, holeX, -shaftDepth - 0.04, holeZ));
    // 구멍 안을 밝히는 보조광 — 실내 조명 없이는 샤프트가 새까맣게 뭉개진다(리뷰: "검은 구멍")
    // 메인 조명은 위(해)·옆(보조광)에서 오기 때문에 바닥 밑 샤프트까지는 거의 안 닿는다 — 안쪽 전용 광원 2개.
    const holeLight = new THREE.PointLight(0xfff4d8, 5.0, 8, 1.2);
    holeLight.position.set(holeX, 0.5, holeZ); add(holeLight);
    const holeLight2 = new THREE.PointLight(0xfff4d8, 3.0, 6, 1.2);
    holeLight2.position.set(holeX, -shaftDepth + 0.5, holeZ); add(holeLight2);   // 바닥 쪽도 따로
    const DTW = 1.2;
    for (let i = 0; i < DSTEPS; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(DTW, 0.14, DRUN + 0.05), treadMat);
      s.position.set(holeX, -DRISE * (i + 1) + DRISE, z1 + 0.2 + i * DRUN);
      s.castShadow = true; add(s);
    }
    {
      const skirtShape = new THREE.Shape();
      skirtShape.moveTo(0, 0); skirtShape.lineTo(-0.3, 0);
      skirtShape.lineTo(-(DSTEPS * DRUN), -DSTEPS * DRISE); skirtShape.lineTo(0, -DSTEPS * DRISE); skirtShape.closePath();
      const skirtThick = 0.08;
      const geo = new THREE.ExtrudeGeometry(skirtShape, { depth: skirtThick, bevelEnabled: false });
      geo.translate(0, 0, -skirtThick / 2); geo.rotateY(Math.PI / 2);
      const skirt = new THREE.Mesh(geo, treadMat);
      skirt.position.set(holeX - DTW / 2, 0, z1 + 0.2); skirt.castShadow = true; add(skirt);
      const skirt2 = skirt.clone(); skirt2.position.x = holeX + DTW / 2; add(skirt2);
    }
    {
      const railH = 0.9, postR = 0.05;
      const corners = [[x1, z1], [x1, z2], [x2, z2], [x2, z1]];
      corners.forEach(([cx, cz], idx) => {
        if (idx === 0) return;   // 입구 쪽 앞-왼 모서리는 기둥 없이 열어 둔다(진입로)
        const post = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, railH, 8), railMat);
        post.position.set(cx, railH / 2, cz); post.castShadow = true; add(post);
      });
      add(H.box(0.06, 0.06, z2 - z1, railMat, x1, railH, holeZ));
      add(H.box(x2 - x1, 0.06, 0.06, railMat, holeX, railH, z2));
      add(H.box(0.06, 0.06, z2 - z1, railMat, x2, railH, holeZ));
    }
    mkCapsule(holeX + 0.3, z1 + 0.2 + 5 * DRUN, -5 * DRISE + 0.62);   // 여섯 번째 디딤판 위 — 실제로 내려가는 중처럼, 카메라 정면 시야 안에서 너무 크지 않게
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
      const postH = RAIL_LIFT - ARISE / 2;
      [0, 3, 6, ASTEPS - 1].forEach(idx => {
        const newel = idx === 0; const r = newel ? 0.075 : 0.05;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(r, r, postH, 8), railMat);
        post.position.set(railX, ARISE * (idx + 1) + postH / 2, az - idx * ARUN); post.castShadow = true; add(post);
      });
      const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, runLen, 8), railMat);
      hand.position.set(railX, riseTotal / 2 + RAIL_LIFT, az - (ASTEPS - 1) * ARUN / 2);
      hand.rotation.set(Math.PI / 2 - slope, 0, 0); hand.castShadow = true; add(hand);
    }
    mkCapsule(ax - 1.0, az + 0.6);
  }

  return g;
}
