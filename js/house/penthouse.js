// 🏢 증축 2단계 "펜트하우스" — 2층 모던 하우스 (오른쪽 2층 크림 매스 + 왼쪽 단층 윙)
// 정면 +z · 발자국 ≤ 5.2×4.8 · 높이 ≤ 5.2 · 역할 태그: roof / wall / door (+ window 유리)
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };

  // 재질 — 역할별 단일 인스턴스 (게임 스와치가 색을 갈아 끼운다)
  const wall = H.clay(0xe9dcc3);          // 크림 벽
  const roof = H.clay(0xfaf8f3);          // 흰 평지붕 슬래브
  const door = H.clay(0x9a6a3c);          // 나무 양문
  const charcoal = H.clay(0x33343a);      // 안쪽으로 들어간 어두운 정면
  const black = H.clay(0x1e1f23);         // 난간·프레임·랜턴
  const stone = H.clay(0xb8b2a4);         // 돌길·계단
  const hedge = H.clay(0x3d6437);         // 낮은 산울타리
  const foliage = H.clay(0x6b9a4c);       // 화분 식물
  const pot = H.clay(0x7d5a44);
  const lamp = H.clay(0xffe3a6, { emissive: 0xffbf6a, emissiveIntensity: 0.9 });
  const glass = H.glass(0x7fb3d5);
  const darkGlass = H.glass(0x3c5364); darkGlass.opacity = 0.7;
  const win = (m) => { m.userData.role = 'window'; return m; };

  // ── 기단 (마당 판) ──────────────────────────────────────────────
  add(H.box(5.2, 0.06, 4.6, H.clay(0xd6cfbf), 0, 0.03, 0.05));

  // ── 오른쪽 2층 매스 (x -0.05 ~ 2.5) ─────────────────────────────
  const RX = 1.225;                                              // 매스 중심 x
  H.role(add(H.box(2.55, 4.4, 2.9, wall, RX, 2.2, -0.75)), 'wall');       // 본체 z -2.2 ~ 0.7
  H.role(add(H.box(0.25, 4.4, 0.95, wall, 0.075, 2.2, 1.125)), 'wall');   // 왼쪽 핀 (z 0.65 ~ 1.6)
  H.role(add(H.box(0.25, 4.4, 0.95, wall, 2.375, 2.2, 1.125)), 'wall');   // 오른쪽 핀
  add(H.box(2.05, 4.4, 0.14, charcoal, RX, 2.2, 0.77));                   // 어두운 후퇴 정면
  for (const x of [0.22, 2.23]) add(H.box(0.04, 4.4, 0.9, charcoal, x, 2.2, 1.15)); // 핀 안쪽 면도 어둡게 (깊은 후퇴감)
  add(H.box(2.05, 0.04, 1.2, charcoal, RX, 4.38, 1.35));                  // 후퇴부 천장 (슬래브 밑면)

  // 2층: 바닥부터 천장까지 유리벽 + 검은 멀리언
  win(add(H.box(2.0, 1.95, 0.05, glass, RX, 3.27, 0.9)));
  for (const dx of [-0.34, 0.34]) add(H.box(0.05, 1.95, 0.07, black, RX + dx, 3.27, 0.9));
  add(H.box(2.05, 0.06, 0.08, black, RX, 4.26, 0.9));                     // 유리 상단 프레임

  // 발코니 바닥 + 검은 난간
  add(H.box(2.05, 0.2, 0.85, H.clay(0xe6e1d6), RX, 2.2, 1.175));           // 발코니 바닥 슬래브 (밝은 띠)
  add(H.box(2.05, 0.05, 0.05, black, RX, 3.05, 1.55));                    // 상단 레일
  add(H.box(2.05, 0.04, 0.04, black, RX, 2.65, 1.55));                    // 중간 레일
  for (let i = 0; i < 5; i++) add(H.box(0.05, 0.78, 0.05, black, RX - 1.0 + i * 0.5, 2.68, 1.55));

  // 1층: 어두운 유리 현관 (발코니 아래)
  win(add(H.box(1.4, 1.85, 0.05, darkGlass, RX, 1.05, 0.86)));
  for (const dx of [-0.74, 0.74]) add(H.box(0.08, 1.95, 0.1, black, RX + dx, 1.05, 0.86));
  add(H.box(1.56, 0.08, 0.1, black, RX, 2.02, 0.86));
  add(H.box(0.04, 0.5, 0.05, black, RX - 0.15, 1.0, 0.92));               // 손잡이 바
  add(H.box(1.7, 0.12, 0.55, stone, RX, 0.09, 1.35));                     // 현관 계단

  // 두꺼운 흰 평지붕 슬래브 (정면으로 돌출) + 밑면 다운라이트 5개
  H.role(add(H.box(2.75, 0.32, 4.25, roof, RX, 4.56, -0.175)), 'roof');
  for (let i = 0; i < 5; i++) add(H.box(0.14, 0.07, 0.14, lamp, RX - 0.9 + i * 0.45, 4.335, 1.78)); // 밑면 다운라이트 5개
  add(H.box(0.28, 0.5, 0.28, black, 2.0, 4.95, -1.7));                    // 지붕 연도
  add(H.box(0.9, 0.08, 0.9, black, 0.7, 4.76, -1.0));                     // 천창 프레임
  win(add(H.box(0.76, 0.06, 0.76, glass, 0.7, 4.81, -1.0)));              // 천창 유리

  // 오른쪽 측면 창 (x = 2.5)
  const sideWin = (y, z, w, h) => {
    add(H.box(0.05, h + 0.12, w + 0.12, black, 2.51, y, z));
    win(add(H.box(0.05, h, w, glass, 2.54, y, z)));
  };
  sideWin(3.3, -1.5, 0.9, 0.9); sideWin(3.3, -0.2, 0.9, 0.9); sideWin(1.3, -1.0, 1.3, 0.8);

  // ── 왼쪽 단층 윙 (x -2.55 ~ -0.05) ─────────────────────────────
  const LX = -1.3;
  H.role(add(H.box(2.5, 2.4, 2.8, wall, LX, 1.2, -0.2)), 'wall');         // z -1.6 ~ 1.2
  H.role(add(H.box(2.6, 0.15, 3.0, roof, LX, 2.475, -0.2)), 'roof');      // 얇은 흰 평지붕
  add(H.box(2.6, 0.06, 0.08, black, LX, 2.36, 1.24));                     // 지붕 아래 검은 띠

  // 나무 양문 (게임이 색을 바꾸는 'door')
  const DX = -1.05;                                                       // 문 중심 (창과 안 겹치게 오른쪽으로)
  add(H.box(1.24, 1.92, 0.06, black, DX, 0.96, 1.22));                    // 문틀
  H.role(add(H.box(1.1, 1.82, 0.08, door, DX, 0.91, 1.25)), 'door');
  add(H.box(0.03, 1.82, 0.1, black, DX, 0.91, 1.26));                     // 가운데 분할선
  for (const dx of [-0.12, 0.12]) add(H.box(0.04, 0.22, 0.05, black, DX + dx, 0.95, 1.31));
  add(H.box(1.4, 0.1, 0.45, stone, DX, 0.08, 1.42));                      // 문 앞 계단

  // 윙 창: 정면 하나, 왼쪽 측면 하나
  add(H.box(0.7, 0.8, 0.04, black, -2.15, 1.35, 1.22));
  win(add(H.box(0.6, 0.7, 0.05, glass, -2.15, 1.35, 1.24)));
  add(H.box(0.04, 0.8, 1.1, black, -2.555, 1.35, -0.4));
  win(add(H.box(0.04, 0.7, 1.0, glass, -2.575, 1.35, -0.4)));

  // ── 벽 랜턴 (두 문 옆) ───────────────────────────────────────────
  const lantern = (x, y, z) => {
    add(H.box(0.12, 0.2, 0.09, black, x, y, z));
    add(H.box(0.07, 0.09, 0.06, lamp, x, y - 0.01, z + 0.03));
  };
  lantern(0.075, 1.9, 1.65); lantern(2.375, 1.9, 1.65);                    // 유리 현관 핀 앞
  lantern(DX - 0.7, 1.7, 1.25); lantern(DX + 0.7, 1.7, 1.25);              // 나무문 양옆

  // ── 마당: 낮은 산울타리 · 돌길 · 화분 ───────────────────────────
  add(H.box(1.1, 0.42, 0.34, hedge, -2.0, 0.24, 1.75));
  add(H.box(0.6, 0.38, 0.34, hedge, -0.2, 0.22, 1.9));
  add(H.box(0.9, 0.36, 0.34, hedge, 2.1, 0.21, 2.05));
  for (const x of [RX, DX]) for (const z of [1.78, 2.2]) add(H.box(0.6, 0.05, 0.36, stone, x, 0.08, z));
  const plant = (x, z) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.26, 6), pot); p.position.set(x, 0.19, z); p.castShadow = p.receiveShadow = true; add(p);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), foliage); f.position.set(x, 0.48, z); f.castShadow = true; add(f);
  };
  plant(0.55, 1.95); plant(1.95, 1.95);

  return g;
}
