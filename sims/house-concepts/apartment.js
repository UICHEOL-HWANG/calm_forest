// 🏬 최종 단계 후보 A "복합 아파트(타운하우스)" — 통통한 3층 페리윙클 블록 + 오른쪽 검은 비상계단
// 정면 +z · 발자국 ≤ 5.0×4.6 · 높이 ≤ 6.8 · 역할 태그: roof / wall / door (+ window 유리)
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const win = (m) => { m.userData.role = 'window'; return m; };

  // 재질 — 역할별 단일 인스턴스 (게임 스와치가 색을 갈아 끼운다)
  const wall = H.clay(0xbcc7f2);          // 연한 페리윙클 벽
  const roof = H.clay(0x7b8fd9);          // 조금 진한 파랑 평지붕 캡
  const door = H.clay(0x8a5a3a);          // 갈색 현관문
  const white = H.clay(0xf8f7f3);         // 창틀·계단·기단
  const sill = H.clay(0x5c78cf);          // 창 아래 파란 턱
  const black = H.clay(0x2b2c33);         // 비상계단·난간·손잡이
  const bush = H.clay(0x5f9a48);          // 둥근 관목
  const ivy = H.clay(0x4c8a3e);           // 모서리 담쟁이
  const planter = H.clay(0x9a6a44);       // 발코니 화분
  const petalA = H.clay(0xf28ab2);
  const petalB = H.clay(0xffd45c);
  const lamp = H.clay(0xfff1c2, { emissive: 0xffc46a, emissiveIntensity: 1.0 });
  const glass = H.glass(0x4f8fc8);

  // 둥근 모서리 블록: 두 상자 + 네 기둥 (연질·부풀린 장난감 느낌)
  const rounded = (w, h, d, r, mat, x, y, z, role) => {
    const tag = (m) => (role ? H.role(m, role) : m);
    tag(add(H.box(w, h, d - 2 * r, mat, x, y, z)));
    tag(add(H.box(w - 2 * r, h, d, mat, x, y, z)));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), mat);
      c.position.set(x + sx * (w / 2 - r), y, z + sz * (d / 2 - r));
      c.castShadow = c.receiveShadow = true; tag(add(c));
    }
  };
  const ball = (r, mat, x, y, z, seg = 7) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg - 1), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return add(m);
  };

  // ── 기단 (흰 판) ─────────────────────────────────────────────────
  add(H.box(5.0, 0.08, 4.6, white, 0, 0.04, 0));

  // ── 본체: x -2.1 ~ 1.5 · z -1.5 ~ 1.5 · 3층 (층고 1.85) ───────────
  const BX = -0.3, BW = 3.6, BD = 3.0, FH = 1.85, BH = FH * 3;   // 몸통 중심·폭·깊이·층고·높이
  const FZ = BD / 2;                                              // 정면 z
  rounded(BW, BH, BD, 0.28, wall, BX, BH / 2, 0, 'wall');

  // 평지붕 캡 (돌출) + 위에 얇은 두 번째 슬래브 + 물탱크
  rounded(BW + 0.5, 0.42, BD + 0.5, 0.32, roof, BX, BH + 0.21, 0, 'roof');
  H.role(add(H.box(BW - 0.4, 0.18, BD - 0.4, roof, BX, BH + 0.51, 0)), 'roof');
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 8), white);
  tank.position.set(BX + 0.9, BH + 0.85, -0.6); tank.castShadow = true; add(tank);
  add(H.box(0.06, 0.28, 0.06, black, BX + 0.9, BH + 0.74, -0.6));       // 탱크 다리 느낌의 배관
  add(H.box(0.32, 0.26, 0.32, black, BX - 0.9, BH + 0.73, 0.4));        // 옥상 환기구

  // ── 정면 창 3×3 (1층 가운데는 문) ──────────────────────────────────
  const cols = [BX - 1.1, BX, BX + 1.1];
  const rows = [1.15, FH + 1.15, FH * 2 + 1.15];
  const frontWindow = (x, y) => {
    add(H.box(0.92, 1.02, 0.12, white, x, y, FZ + 0.04));                 // 두꺼운 흰 창틀(판)
    win(add(H.box(0.66, 0.76, 0.05, glass, x, y, FZ + 0.115)));           // 유리 — 틀 앞면 위에 얹음
    add(H.box(0.66, 0.05, 0.04, white, x, y, FZ + 0.15));                 // 가운데 가로살
    add(H.box(0.82, 0.09, 0.2, sill, x, y - 0.56, FZ + 0.1));             // 파란 창턱
  };
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (r === 0 && c === 1) continue;
    frontWindow(cols[c], rows[r]);
  }

  // ── 현관: 갈색 문 + 흰 틀 + 흰 계단 3단 + 가는 검은 손잡이 난간 + 파란 램프 ──
  const DY0 = 0.36;                                                        // 문턱 높이(계단 위)
  add(H.box(1.0, 1.7, 0.12, white, BX, DY0 + 0.8, FZ + 0.04));            // 흰 문틀
  H.role(add(H.box(0.82, 1.56, 0.08, door, BX, DY0 + 0.76, FZ + 0.12)), 'door');
  add(H.box(0.05, 0.16, 0.05, black, BX + 0.28, DY0 + 0.72, FZ + 0.18));  // 손잡이
  win(add(H.box(0.5, 0.2, 0.05, glass, BX, DY0 + 1.36, FZ + 0.175)));     // 문 위 작은 채광창
  const steps = [[1.5, 0.6, 0.06, FZ + 0.32], [1.36, 0.42, 0.18, FZ + 0.23], [1.22, 0.24, 0.30, FZ + 0.14]];
  for (const [w, d, y, z] of steps) add(H.box(w, 0.12, d, white, BX, y, z));
  for (const sx of [-1, 1]) {                                              // 손잡이 난간
    const x = BX + sx * 0.66;
    add(H.box(0.05, 0.75, 0.05, black, x, 0.44, FZ + 0.62));
    add(H.box(0.05, 0.95, 0.05, black, x, 0.83, FZ + 0.12));
    const rail = H.box(0.05, 0.05, 0.62, black, x, 1.08, FZ + 0.37); rail.rotation.x = Math.atan2(0.42, 0.5); add(rail);
  }
  add(H.box(0.34, 0.12, 0.3, sill, BX, DY0 + 1.8, FZ + 0.15));             // 파란 램프 갓
  ball(0.08, lamp, BX, DY0 + 1.69, FZ + 0.18, 6);                          // 전구

  // ── 왼쪽 측면 창 (x = -2.1) 층마다 하나 ─────────────────────────────
  const LX = BX - BW / 2;
  for (const y of rows) {
    add(H.box(0.12, 0.9, 0.9, white, LX - 0.04, y, -0.3));
    win(add(H.box(0.05, 0.66, 0.66, glass, LX - 0.115, y, -0.3)));
    add(H.box(0.2, 0.09, 0.8, sill, LX - 0.1, y - 0.5, -0.3));
  }

  // ── 오른쪽 비상계단 (x 1.5 ~ 2.4): 발코니 2개 + 지그재그 계단 ──────
  const RX = BX + BW / 2;                                                  // 오른쪽 벽 x = 1.5
  const EX = RX + 0.45, EW = 0.9;                                          // 발코니 중심·폭
  const balcony = (y) => {
    add(H.box(EW - 0.1, 0.06, BD - 0.4, black, EX - 0.05, y, 0));          // 바닥판(얇게 — 위에서 봐도 덩어리로 안 읽히게)
    add(H.box(0.05, 0.05, BD - 0.2, black, RX + EW - 0.03, y + 0.9, 0));   // 바깥 상단 레일
    add(H.box(0.05, 0.04, BD - 0.2, black, RX + EW - 0.03, y + 0.5, 0));   // 중간 레일
    for (const z of [-1.35, -0.45, 0.45, 1.35]) add(H.box(0.05, 0.92, 0.05, black, RX + EW - 0.03, y + 0.46, z));
    for (const sz of [-1, 1]) {                                            // 앞뒤 옆 레일
      add(H.box(EW, 0.05, 0.05, black, EX, y + 0.9, sz * 1.4));
      add(H.box(EW, 0.04, 0.05, black, EX, y + 0.5, sz * 1.4));
    }
    add(H.box(0.06, 0.9, 0.7, black, RX + 0.02, y + 0.55, -0.6));          // 비상문 틀
    win(add(H.box(0.05, 0.74, 0.54, glass, RX + 0.075, y + 0.55, -0.6)));  // 비상문 유리
  };
  balcony(FH); balcony(FH * 2);
  // 지그재그 계단: 1층→2층은 앞(+z)에서 뒤(-z)로, 2층→3층은 뒤에서 앞으로
  const stair = (y0, dir) => {
    const n = 6, rise = FH / n, run = 2.2 / n;
    for (let i = 0; i < n; i++) {
      add(H.box(0.44, 0.06, run + 0.04, black, RX + 0.7, y0 + rise * (i + 0.5), dir * (1.1 - run * (i + 0.5))));
    }
    const len = Math.hypot(2.2, FH);
    const rail = H.box(0.05, 0.05, len, black, RX + 0.92, y0 + FH / 2 + 0.85, 0);
    rail.rotation.x = dir * Math.atan2(FH, 2.2); add(rail);
    for (const t of [0.2, 0.8]) add(H.box(0.05, 0.85, 0.05, black, RX + 0.92, y0 + FH * t + 0.45, dir * (1.1 - 2.2 * t)));
  };
  stair(0, 1); stair(FH, -1);
  add(H.box(0.06, FH * 2 + 0.9, 0.06, black, RX + EW - 0.03, (FH * 2 + 0.9) / 2 + 0.05, -1.4)); // 뒤 기둥
  add(H.box(0.06, FH * 2 + 0.9, 0.06, black, RX + EW - 0.03, (FH * 2 + 0.9) / 2 + 0.05, 1.4));  // 앞 기둥

  // 3층 발코니 화분 + 꽃 (숲 마을의 다정함)
  add(H.box(0.34, 0.22, 0.7, planter, RX + 0.2, FH * 2 + 0.19, 0.7));
  ball(0.1, petalA, RX + 0.2, FH * 2 + 0.38, 0.5, 6);
  ball(0.1, petalB, RX + 0.22, FH * 2 + 0.4, 0.75, 6);
  ball(0.1, petalA, RX + 0.18, FH * 2 + 0.37, 0.98, 6);
  ball(0.16, bush, RX + 0.2, FH * 2 + 0.3, 0.72, 6);

  // 왼쪽 앞 모서리 담쟁이 — 위로 갈수록 작아지는 초록 덩어리
  const ivyBlobs = [[0.34, 0.55, 0], [0.3, 1.2, 0.08], [0.26, 1.85, -0.05], [0.22, 2.45, 0.06], [0.17, 3.0, -0.02]];
  for (const [r, y, dz] of ivyBlobs) ball(r, ivy, LX + 0.05, y, FZ - 0.05 + dz, 7);

  // 기단 위 둥근 관목
  const bushes = [[0.44, -1.75, 1.8], [0.36, -1.1, 1.92], [0.4, 0.6, 1.88], [0.32, -2.15, 0.5], [0.34, -1.5, -1.92]];
  for (const [r, x, z] of bushes) ball(r, bush, x, r * 0.85, z, 7);

  return g;
}
