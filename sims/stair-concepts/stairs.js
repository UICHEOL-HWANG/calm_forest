// 🪜 계단 컨셉 — "구멍형(내려가기)" + "벽 따라 오르기" + "루프탑 계단실 박스"
//   실제 js/game.js 는 아직 손대지 않는다(이 파일은 격리된 뷰어 전용). 사용자가 방향을 고르면 그때 포팅한다.
//   방: 반경 half, 벽 3면(왼쪽·오른쪽·뒤) + 천장 없음(게임과 같은 규칙) — 정면은 뚫어 둬 카메라가 안을 본다.
export function build(THREE, H, variant) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };

  // 단계별 마감 팔레트 — js/house/*.js 출처 그대로(리뷰가 지목한 색)
  const FINISH = {
    3: { wall: 0xf3e6c8, floor: 0xbfb0a0, tread: 0x9c6b40, rail: 0x8a5a36, name: '3 코티지 — 따뜻한 원목' },
    4: { wall: 0xd8cfc2, floor: 0xb9b3a8, tread: 0x23252a, rail: 0x23252a, name: '4 브릭 로프트 — 어두운 철골(loft.js)' },
    5: { wall: 0xe7e0d2, floor: 0xe2ddd2, tread: 0xb98a4e, rail: 0x1e1f23, name: '5 펜트하우스 — 원목 디딤판+검은 난간(penthouse.js)' },
    6: { wall: 0xf3e2c8, floor: 0xf1ece3, tread: 0x2a2e33, rail: 'glass', name: '6 루프탑 빌라 — shadowGap 디딤판+유리 난간(villa.js)' },
  };
  const stage = variant === 'rooftop' ? 6 : (Number(variant) || 4);
  const fin = FINISH[stage] || FINISH[4];

  const half = 5, W = half * 2;
  const wallMat = H.clay(fin.wall);
  const floorMat = H.clay(fin.floor);
  const treadMat = H.clay(fin.tread);
  const railMat = fin.rail === 'glass' ? H.glass(0xa9d8ea) : H.clay(fin.rail);
  if (fin.rail === 'glass') railMat.opacity = 0.22;   // villa.js railGlass 와 같은 값

  // ── 캐릭터 높이 참조(폭 0.8·키 1.1 캡슐) — 크기가 맞는지 눈으로 바로 잰다 ──
  const capMat = H.clay(0x8a8f96);
  const mkCapsule = (x, z) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.3, 4, 8), capMat); c.position.set(x, 0.55, z); c.castShadow = true; add(c); };
  if (variant === 'rooftop') mkCapsule(0.2, 0.6);
  else { mkCapsule(3.0, 4.4); mkCapsule(-3.3, -0.3); }   // 오르는 계단 입구 옆 · 내려가는 구멍 입구 옆

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
    // 문(짙은 유리 + 흰 문틀) — 정면(+z, 데크 쪽)
    add(H.box(0.9, BH - 0.2, 0.08, frame, BX, (BH - 0.2) / 2, BZ + BD / 2));
    add(H.box(0.64, BH - 0.5, 0.05, darkGlass, BX, (BH - 0.2) / 2 + 0.05, BZ + BD / 2 + 0.05));
    // 계단실 옆 유리 난간(옥상 가장자리 느낌) — villa.js railGlass 와 같은 값
    for (const rz of [BZ + BD / 2 + 0.9]) {
      const r = H.box(2.4, 0.85, 0.05, railMat, BX + 0.3, 0.5, rz); add(r);
    }
    return g;
  }

  // ── 방 3면 벽 + 바닥(정면은 뚫어 카메라가 안을 본다, 게임과 같이 천장 없음) ──
  add(H.box(W, 3, 0.2, wallMat, 0, 1.5, half));                         // 뒤
  add(H.box(0.2, 3, W, wallMat, -half, 1.5, 0));                        // 왼쪽
  add(H.box(0.2, 3, W, wallMat, half, 1.5, 0));                         // 오른쪽

  // ── A. 내려가는 계단 — 바닥에 구멍을 내고 그 안으로 내려간다(descend) ──
  const holeX = -1.8, holeZ = -0.3, holeHW = 0.7, holeHD = 1.6;         // 1.4×3.2 구멍
  const DSTEPS = 8, DRISE = 0.25, DRUN = 0.34;
  const shaftDepth = DSTEPS * DRISE;                                    // 2.0 — 디딤판이 바닥까지 닿는다
  // 바닥 — 구멍 둘레를 4조각 프레임으로(진짜 뚫린 구멍이어야 "구멍"으로 읽힌다)
  const x1 = holeX - holeHW, x2 = holeX + holeHW, z1 = holeZ - holeHD, z2 = holeZ + holeHD;
  add(H.box(x1 - (-half), 0.2, W, floorMat, (-half + x1) / 2, -0.1, 0));                 // 왼쪽 띠
  add(H.box(half - x2, 0.2, W, floorMat, (x2 + half) / 2, -0.1, 0));                     // 오른쪽 띠
  add(H.box(x2 - x1, 0.2, z1 - (-half), floorMat, holeX, -0.1, (-half + z1) / 2));       // 앞 띠(입구 쪽, 열어 둔다)
  add(H.box(x2 - x1, 0.2, half - z2, floorMat, holeX, -0.1, (z2 + half) / 2));           // 뒤 띠
  // 구멍 안쪽 — 짙은 음영으로 깊이감(그냥 칠한 사각형이 아니라 실제로 파여 있다)
  const shaftMat = H.clay(0x23252a, { roughness: 0.95 });
  add(H.box(x2 - x1, shaftDepth, 0.06, shaftMat, holeX, -shaftDepth / 2, z1));            // 안쪽 앞면(입구 쪽 내벽)
  add(H.box(0.06, shaftDepth, z2 - z1, shaftMat, x1, -shaftDepth / 2, holeZ));            // 안쪽 왼벽
  add(H.box(0.06, shaftDepth, z2 - z1, shaftMat, x2, -shaftDepth / 2, holeZ));            // 안쪽 오른벽
  add(H.box(x2 - x1, shaftDepth, 0.06, shaftMat, holeX, -shaftDepth / 2, z2));            // 안쪽 뒷면
  add(H.box(x2 - x1 - 0.1, 0.08, z2 - z1 - 0.1, shaftMat, holeX, -shaftDepth - 0.04, holeZ)); // 바닥(더 짙게)
  // 디딤판 — 입구(앞, z1)에서 뒤(z2)로 내려간다. 코를 살짝 내밀어 얇은 판 느낌을 없앤다.
  const DTW = 1.2;   // 구멍(1.4)보다 살짝 좁게 — 옆에 막힌 스커트 놓을 여유
  for (let i = 0; i < DSTEPS; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(DTW, 0.14, DRUN + 0.05), treadMat);
    s.position.set(holeX, -DRISE * (i + 1) + DRISE, z1 + 0.2 + i * DRUN);
    s.castShadow = true; add(s);
  }
  // 막힌 옆 스커트(양쪽) — 계단 밑이 뚫려 보이면 비계처럼 보인다.
  //   shape+extrude+rotateY(90°) 는 new_z = -shapeX 로 뒤집힌다(cottage.js 의 prism 패턴과 같은 축) —
  //   내려가는 진행 방향(+z)을 얻으려면 shapeX 를 음수 쪽으로 그려야 한다.
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
  // 구멍 둘레 난간 — 3면(왼·오른·뒤)만, 입구(앞)는 뚫어 둔다. 모서리에 손스침대.
  {
    const railH = 0.9, postR = 0.05;
    const corners = [[x1, z1], [x1, z2], [x2, z2], [x2, z1]];
    corners.forEach(([cx, cz], idx) => {
      if (idx === 0) return;   // 입구 쪽 앞-왼 모서리는 기둥 없이 열어 둔다(진입로)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, railH, 8), railMat);
      post.position.set(cx, railH / 2, cz); post.castShadow = true; add(post);
    });
    add(H.box(0.06, 0.06, z2 - z1, railMat, x1, railH, holeZ));   // 왼쪽 변
    add(H.box(x2 - x1, 0.06, 0.06, railMat, holeX, railH, z2));   // 뒤쪽 변
    add(H.box(0.06, 0.06, z2 - z1, railMat, x2, railH, holeZ));   // 오른쪽 변
  }

  // ── B. 올라가는 계단 — 오른쪽 벽을 따라 천장 높이(3.0)까지 닿는다(ascend) ──
  const ASTEPS = 12, ARISE = 0.25, ARUN = 0.32, ATW = 1.1;
  const runTotal = ASTEPS * ARUN, riseTotal = ASTEPS * ARISE;   // 3.84 · 3.0(=벽 높이)
  const slope = Math.atan2(riseTotal, runTotal);
  const runLen = Math.hypot(runTotal, riseTotal);
  const ax = half - ATW / 2 - 0.12, az = half - 1.2;   // 오른쪽 벽에 붙는다(벽 두께 절반만큼 안으로)
  for (let i = 0; i < ASTEPS; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(ATW, 0.14, ARUN + 0.05), treadMat);
    s.position.set(ax, ARISE * (i + 1), az - i * ARUN); s.castShadow = true; add(s);
  }
  const roomX = ax - (ATW / 2 - 0.05);
  const railX = ax - (ATW / 2 + 0.14);
  const RAIL_LIFT = 0.85;
  {
    // new_z = -shapeX 로 뒤집힌다 — 계단이 -z 로 올라가므로 shapeX 는 양수 쪽으로 그린다.
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

  return g;
}
