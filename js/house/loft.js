// 🧱 증축 1단계 "브릭 로프트" — 벽돌 헛간을 개조한 로프트
//   양쪽 벽돌 윙(완만한 박공 + 천창) 사이를 검은 철골 유리 아트리움(높은 유리 박공 + 연도)이 잇는다
//   정면 +z · 발자국 ≤ 5.0×4.6 · 높이 ≤ 4.6 · 역할 태그: roof / wall / door (+ window 유리)
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const win = (m) => { m.userData.role = 'window'; return m; };
  const tilt = (w, h, d, mat, x, y, z, rz) => { const m = H.box(w, h, d, mat, x, y, z); m.rotation.z = rz; return m; };
  const prism = (pts, depth, mat, x, y, z) => {                 // xy 삼각형을 z 로 밀어낸 박공 프리즘
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m;
  };

  // 재질 — 역할별 단일 인스턴스 (게임 스와치가 색을 갈아 끼운다)
  const wall = H.clay(0xa8624c);          // 붉은 갈색 벽돌
  const roof = H.clay(0x525d6b);          // 어두운 회청색 기와
  const door = H.clay(0xcf3b2a);          // 빨간 미닫이 헛간문
  const mortar = H.clay(0xc9a08c);        // 옅은 줄눈
  const steel = H.clay(0x23252a);         // 검은 철골·프레임·레일
  const stone = H.clay(0xb3aca0);         // 자갈 마당 바탕
  const cobble = H.clay(0x9a938a);        // 자갈 무늬
  const bark = H.clay(0x6b4a34);
  const blossom = H.clay(0xf3b4c6);       // 꽃나무
  const glass = H.glass(0x8fc3de);
  const skyglass = H.clay(0xbfe3f1, { roughness: 0.3 });   // 천창 — 어두운 지붕 위라 불투명 연하늘색이 유리로 읽힌다

  // ── 앞마당 자갈 (z 1.35 ~ 2.25) ─────────────────────────────────
  add(H.box(4.9, 0.06, 0.9, stone, 0, 0.03, 1.8));
  for (let i = 0; i < 8; i++) add(H.box(0.42, 0.025, 0.3, cobble, -2.1 + i * 0.6, 0.07, i % 2 ? 1.62 : 1.98));

  // ── 벽돌 윙 ×2 (폭 1.75 · 깊이 3.3 · 처마 2.2 · 용마루 2.75) ────────
  const WD = 3.3, WZ = -0.35, FZ = 1.3;                        // 윙 깊이·중심 z·정면 z
  const HALF = 0.875, RISE = 0.55, A = Math.atan2(RISE, HALF);  // 지붕 경사 32°
  const SL = Math.hypot(HALF, RISE) + 0.1;                      // 지붕 슬래브 길이(처마 내밀기 포함) — 바깥 처마 x ≤ 2.5
  const wing = (WX, sgn) => {                                   // sgn: 바깥쪽 방향 (-1 왼쪽, +1 오른쪽)
    H.role(add(H.box(1.75, 2.2, WD, wall, WX, 1.1, WZ)), 'wall');
    H.role(add(prism([[-HALF, 0], [HALF, 0], [0, RISE]], WD, wall, WX, 2.2, WZ - WD / 2)), 'wall');
    // 줄눈 — 바깥 측면 3줄 + 정면 박공 아래 1줄
    for (const y of [0.55, 1.1, 1.65]) add(H.box(0.02, 0.03, WD - 0.1, mortar, WX + sgn * 0.88, y, WZ));
    add(H.box(1.5, 0.03, 0.02, mortar, WX, 2.3, FZ + 0.01)); add(H.box(1.0, 0.03, 0.02, mortar, WX, 2.46, FZ + 0.01));
    // 지붕 슬래브 2장 (용마루 z 방향)
    for (const s of [-1, 1]) {
      const cx = WX + s * (HALF / 2 + 0.04), cy = 2.2 + RISE / 2 + 0.06;
      H.role(add(tilt(SL, 0.1, WD + 0.3, roof, cx, cy, WZ, -s * A)), 'roof');
    }
    // 천창 — 바깥쪽 경사면에 유리 격자 (2×3)
    const nx = sgn * Math.sin(A), ny = Math.cos(A), rz = -sgn * A;          // 바깥 경사면의 법선 (바깥·위)
    const mx = WX + sgn * (HALF / 2 + 0.04), my = 2.2 + RISE / 2 + 0.06;   // 슬래브 중심 → 법선 방향으로 띄운다
    add(tilt(0.78, 0.05, 1.3, steel, mx + nx * 0.07, my + ny * 0.07, WZ, rz));
    win(add(tilt(0.7, 0.05, 1.2, skyglass, mx + nx * 0.09, my + ny * 0.09, WZ, rz)));
    add(tilt(0.04, 0.05, 1.22, steel, mx + nx * 0.11, my + ny * 0.11, WZ, rz));
    for (const dz of [-0.2, 0.2]) add(tilt(0.72, 0.05, 0.04, steel, mx + nx * 0.11, my + ny * 0.11, WZ + dz, rz));
    // 정면: 바닥까지 유리문 + 양옆 빨간 미닫이 헛간문 (위 레일에 매달림)
    add(H.box(0.62, 2.05, 0.06, steel, WX, 1.03, FZ + 0.02));
    win(add(H.box(0.5, 1.95, 0.05, glass, WX, 1.0, FZ + 0.05)));
    add(H.box(1.5, 0.07, 0.1, steel, WX, 2.06, FZ + 0.08));                        // 레일
    for (const s of [-1, 1]) {
      const dx = WX + s * 0.53;
      H.role(add(H.box(0.36, 1.86, 0.08, door, dx, 0.99, FZ + 0.08)), 'door');
      for (const k of [-0.09, 0.09]) add(H.box(0.02, 1.7, 0.02, steel, dx + k, 0.99, FZ + 0.13));   // 세로 널 이음
      for (const k of [-0.1, 0.1]) add(H.box(0.05, 0.14, 0.11, steel, dx + k, 1.96, FZ + 0.09));  // 도르래 걸이
    }
  };
  wing(-1.54, -1); wing(1.54, 1);                              // 윙 x ±(0.665 ~ 2.415), 아트리움과 0.085 겹침

  // ── 가운데 유리 아트리움 (x ±0.75 · z -1.9 ~ 1.5 · 처마 2.9 · 용마루 3.6) ──
  const AD = 3.4, AZ = -0.2, AF = 1.5, AH = 2.9, AR = 0.7;
  win(add(H.box(1.5, AH, AD, glass, 0, AH / 2, AZ)));
  win(add(prism([[-0.75, 0], [0.75, 0], [0, AR]], AD, glass, 0, AH, AZ - AD / 2)));
  for (const x of [-0.72, 0.72]) for (const z of [AF - 0.04, AZ - AD / 2 + 0.04]) add(H.box(0.08, AH, 0.08, steel, x, AH / 2, z));   // 모서리 기둥
  add(H.box(1.56, 0.08, 0.1, steel, 0, AH, AF));                                   // 처마 보
  add(H.box(1.56, 0.06, 0.1, steel, 0, 2.15, AF));                                 // 중간 보
  for (const x of [-0.38, 0.38]) add(H.box(0.06, AH - 0.1, 0.1, steel, x, AH / 2, AF));   // 멀리언
  const RA = Math.atan2(AR, 0.75), RL = Math.hypot(0.75, AR);
  for (const s of [-1, 1]) add(tilt(RL, 0.07, 0.1, steel, s * 0.375, AH + AR / 2, AF, -s * RA));   // 박공 서까래 라인
  add(H.box(0.08, AR - 0.05, 0.1, steel, 0, AH + AR / 2 - 0.02, AF));             // 박공 중앙 기둥
  // 아트리움 지붕(같은 기와 재질) + 얇은 검은 연도
  const ASL = RL + 0.24;
  for (const s of [-1, 1]) H.role(add(tilt(ASL, 0.1, AD + 0.3, roof, s * (0.375 + 0.08), AH + AR / 2 + 0.06, AZ, -s * RA)), 'roof');
  const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 8), steel); flue.position.set(0.32, AH + 0.35 + 0.45, -0.9); flue.castShadow = true; add(flue);
  add(H.box(0.22, 0.05, 0.22, steel, 0.32, AH + 0.35 + 0.95, -0.9));
  // 검은 프레임 유리문 + 손잡이 + 문 앞 디딤돌
  add(H.box(0.8, 2.1, 0.06, steel, 0, 1.05, AF + 0.02));
  win(add(H.box(0.66, 2.0, 0.05, glass, 0, 1.0, AF + 0.05)));
  add(H.box(0.03, 0.4, 0.04, steel, -0.2, 1.0, AF + 0.1));
  add(H.box(1.0, 0.08, 0.3, stone, 0, 0.08, AF + 0.2));

  // ── 왼쪽 앞 꽃나무 ───────────────────────────────────────────────
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.0, 6), bark); trunk.position.set(-2.2, 0.5, 1.9); trunk.castShadow = true; add(trunk);
  for (const [dx, dy, dz, r] of [[0, 1.28, 0, 0.28], [-0.17, 1.1, 0.1, 0.21], [0.16, 1.04, -0.09, 0.2]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), blossom); b.position.set(-2.2 + dx, dy, 1.9 + dz); b.castShadow = true; add(b);
  }
  return g;
}
