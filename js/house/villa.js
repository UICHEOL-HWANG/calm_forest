// 🏝️ 최종 단계 후보 B "루프탑 빌라" — 흰 프레임 + 어두운 통유리 + 시안 수영장
// 오른쪽 2층 유리 매스(내부 계단 노출) · 왼쪽 단층 유리 윙(지붕 = 루프탑 테라스) · 앞 오른쪽 수영장 + 나무 데크
// 정면 +z · 발자국 ≤ 5.4×5.0 · 높이 ≤ 5.4 · 역할 태그: roof / wall / door (+ window 유리)
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const win = (m) => { m.userData.role = 'window'; m.castShadow = false; return m; };
  const noShadow = (m) => { m.castShadow = false; return m; };

  // ── 재질: 역할별 단일 인스턴스 (게임 스와치가 색을 갈아 끼운다) ──
  const wall = H.clay(0xf4f3ee);          // 흰 프레임·기단·멀리언·난간 기둥
  const roof = H.clay(0xffffff);          // 흰 평지붕 슬래브
  const door = H.clay(0xa8733f);          // 따뜻한 나무 현관문
  const darkGlass = H.glass(0x1e3242); darkGlass.opacity = 0.58;   // 어두운 틴트 통유리
  const railGlass = H.glass(0xa9d8ea); railGlass.opacity = 0.22;   // 난간 유리
  const water = H.glass(0x5fd3e8); water.opacity = 0.8; water.roughness = 0.1;
  const poolFloor = H.clay(0x9de0ee);
  const coping = H.clay(0xf1f0ea);        // 수영장 테두리·데크 계단
  const wood = H.clay(0xc19a66);          // 데크 널
  const shadowGap = H.clay(0x2a2e33);     // 슬래브 밑 그림자 띠
  const interior = H.clay(0xf1ece3);      // 실내 바닥·계단·가구
  const cushion = H.clay(0x6fd3e3);       // 라운지 체어 쿠션·파라솔
  const chrome = H.clay(0xd8dde0, { roughness: 0.4, metalness: 0.4 });
  const foliage = H.clay(0x6b9a4c);
  const pot = H.clay(0x8a6a50);
  const glow = H.clay(0xffe3a6, { emissive: 0xffbf6a, emissiveIntensity: 1.1 });
  const warmWall = H.clay(0xf3dcb8, { emissive: 0xffb877, emissiveIntensity: 0.6 });   // 안쪽 뒷벽 — 낮에도 따뜻한 실내

  // ── 기단 (흰 판 + 지면 어두운 유리 띠) ──────────────────────────
  H.role(add(H.box(5.3, 0.3, 3.1, wall, -0.05, 0.15, -0.95)), 'wall');   // x -2.7 ~ 2.6 · z -2.5 ~ 0.6
  win(add(H.box(5.2, 0.12, 0.04, darkGlass, -0.05, 0.13, 0.61)));            // 앞면 띠
  win(add(H.box(0.04, 0.12, 3.0, darkGlass, 2.61, 0.13, -0.95)));         // 오른쪽 띠

  // ── 오른쪽 2층 유리 매스 (x 0.1 ~ 2.5 · z -2.3 ~ 0.3) ───────────
  const RX = 1.3, RZ = -1.0, RW = 2.4, RD = 2.6;
  const F1 = { y: 1.275, h: 1.95 };       // 1층 유리: y 0.3 ~ 2.25
  const F2 = { y: 3.35, h: 1.9 };         // 2층 유리: y 2.4 ~ 4.3
  for (const sx of [-1, 1]) for (const sz of [-1, 1])                    // 모서리 흰 기둥 4
    H.role(add(H.box(0.14, 4.08, 0.14, wall, RX + sx * (RW / 2 - 0.07), 2.34, RZ + sz * (RD / 2 - 0.07))), 'wall');
  H.role(add(H.box(RW + 0.1, 0.15, RD + 0.1, wall, RX, 2.325, RZ)), 'wall');   // 2층 바닥 슬래브(흰 띠)
  for (const f of [F1, F2]) {
    win(add(H.box(RW - 0.2, f.h, 0.05, darkGlass, RX, f.y, RZ + RD / 2 - 0.03)));   // 앞
    win(add(H.box(RW - 0.2, f.h, 0.05, darkGlass, RX, f.y, RZ - RD / 2 + 0.03)));   // 뒤
    noShadow(add(H.box(RW - 0.3, f.h - 0.15, 0.04, warmWall, RX, f.y, RZ - RD / 2 + 0.12)));   // 안쪽 뒷벽(따뜻한 빛)
    win(add(H.box(0.05, f.h, RD - 0.2, darkGlass, RX + RW / 2 - 0.03, f.y, RZ)));   // 오른쪽
    for (const dx of [-0.6, 0, 0.6])                                                   // 앞면 멀리언 3
      H.role(add(H.box(0.06, f.h, 0.06, wall, RX + dx, f.y, RZ + RD / 2 - 0.03)), 'wall');
    for (const dz of [-0.65, 0.65])                                                    // 오른쪽 멀리언 2
      H.role(add(H.box(0.06, f.h, 0.06, wall, RX + RW / 2 - 0.03, f.y, RZ + dz)), 'wall');
  }
  win(add(H.box(0.05, F2.h, RD - 0.2, darkGlass, RX - RW / 2 + 0.03, F2.y, RZ)));     // 2층 왼쪽(윙 지붕 위)
  add(H.box(RW - 0.1, 0.08, RD - 0.1, shadowGap, RX, 4.34, RZ));                       // 슬래브 밑 그림자 띠
  H.role(add(H.box(RW + 0.24, 0.22, RD + 0.4, roof, RX, 4.49, RZ)), 'roof');           // 떠 있는 흰 슬래브
  H.role(add(H.box(RW + 0.28, 0.05, RD + 0.44, wall, RX, 4.395, RZ)), 'wall');        // 얇은 파샤

  // 실내: 오른쪽 유리벽을 따라 앞→뒤로 오르는 계단(정면·측면 유리로 보임) · 소파 · 천장 조명(따뜻한 빛)
  for (let i = 0; i < 7; i++) {
    const h = 0.28 * (i + 1);
    noShadow(add(H.box(0.5, h, 0.26, interior, RX + RW / 2 - 0.4, 0.3 + h / 2, 0.05 - 0.26 * i)));
  }
  noShadow(add(H.box(0.04, 0.9, 1.85, wall, RX + RW / 2 - 0.66, 1.45, -0.73)));         // 계단 흰 난간판
  noShadow(add(H.box(1.1, 0.32, 0.5, interior, 0.95, 0.46, -0.35)));                   // 소파
  noShadow(add(H.box(1.1, 0.3, 0.12, interior, 0.95, 0.75, -0.55)));                   // 소파 등받이
  noShadow(add(H.box(0.5, 0.05, 0.5, wall, 1.0, 0.62, 0.05)));                         // 흰 탁자
  noShadow(add(H.box(RW - 0.3, 0.04, RD - 0.3, glow, RX, 2.23, RZ)));                  // 1층 천장 빛
  noShadow(add(H.box(RW - 0.3, 0.04, RD - 0.3, glow, RX, 4.27, RZ)));                  // 2층 천장 빛
  noShadow(add(H.box(1.3, 0.34, 0.6, interior, 1.0, 2.57, -0.3)));                     // 2층 침대
  noShadow(add(H.box(0.5, 0.12, 0.5, cushion, 0.7, 2.8, -0.3)));                       // 침대 쿠션

  // 지붕: 천창 + 화분 나무
  win(add(H.box(0.7, 0.1, 0.7, darkGlass, 1.0, 4.65, -1.4)));
  add(H.box(0.45, 0.4, 0.45, wall, 2.1, 4.8, -1.9));
  { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), foliage); f.position.set(2.1, 5.05, -1.9); f.castShadow = true; add(f); }

  // ── 왼쪽 단층 유리 윙 (x -2.6 ~ 0.2 · z -2.3 ~ 0.5) ─────────────
  const LX = -1.2, LZ = -0.9, LW = 2.8, LD = 2.8;
  const W1 = { y: 1.325, h: 2.05 };       // 유리 y 0.3 ~ 2.35
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, 1]])                    // 모서리 기둥 3 (뒤오른쪽은 매스와 겹침)
    H.role(add(H.box(0.14, 2.12, 0.14, wall, LX + sx * (LW / 2 - 0.07), 1.36, LZ + sz * (LD / 2 - 0.07))), 'wall');
  win(add(H.box(LW - 0.2, W1.h, 0.05, darkGlass, LX, W1.y, LZ + LD / 2 - 0.03)));     // 앞
  win(add(H.box(LW - 0.2, W1.h, 0.05, darkGlass, LX, W1.y, LZ - LD / 2 + 0.03)));     // 뒤
  noShadow(add(H.box(LW - 0.3, W1.h - 0.15, 0.04, warmWall, LX, W1.y, LZ - LD / 2 + 0.12)));   // 안쪽 뒷벽
  win(add(H.box(0.05, W1.h, LD - 0.2, darkGlass, LX - LW / 2 + 0.03, W1.y, LZ)));     // 왼쪽
  for (const dx of [-0.2, 0.6])                                                          // 앞면 멀리언
    H.role(add(H.box(0.06, W1.h, 0.06, wall, LX + dx, W1.y, LZ + LD / 2 - 0.03)), 'wall');
  H.role(add(H.box(0.06, W1.h, 0.06, wall, LX - LW / 2 + 0.03, W1.y, LZ)), 'wall');    // 왼쪽 멀리언
  add(H.box(LW - 0.1, 0.07, LD - 0.1, shadowGap, LX, 2.385, LZ));                       // 슬래브 밑 그림자 띠
  H.role(add(H.box(LW + 0.2, 0.2, LD + 0.2, roof, LX, 2.52, LZ)), 'roof');             // 윙 흰 슬래브 = 테라스 바닥
  H.role(add(H.box(LW + 0.24, 0.05, LD + 0.24, wall, LX, 2.445, LZ)), 'wall');         // 얇은 파샤

  // 현관문 (윙 정면 왼쪽) — 흰 문틀 + 나무문 + 손잡이
  const DX = -1.7, DZ = LZ + LD / 2;
  H.role(add(H.box(1.0, 2.0, 0.08, wall, DX, 1.3, DZ + 0.02)), 'wall');
  H.role(add(H.box(0.86, 1.9, 0.08, door, DX, 1.25, DZ + 0.05)), 'door');
  add(H.box(0.04, 0.5, 0.04, chrome, DX + 0.3, 1.25, DZ + 0.11));

  // 윙 실내: 주방 카운터 + 천장 빛
  noShadow(add(H.box(1.5, 0.5, 0.5, interior, -1.3, 0.55, -1.75)));
  noShadow(add(H.box(0.6, 0.6, 0.5, interior, -2.1, 0.6, -0.4)));
  noShadow(add(H.box(LW - 0.3, 0.04, LD - 0.3, glow, LX, 2.33, LZ)));

  // ── 루프탑 테라스 (윙 지붕 위, y 2.62) ───────────────────────────
  const TY = 2.62, RAIL_H = 0.7;
  const post = (x, z) => H.role(add(H.box(0.05, RAIL_H, 0.05, wall, x, TY + RAIL_H / 2, z)), 'wall');
  const fz = LZ + LD / 2 - 0.05, bz = LZ - LD / 2 + 0.05, lx = LX - LW / 2 + 0.05;   // 앞·뒤·왼쪽 난간선
  for (const x of [lx, LX, 0.15]) post(x, fz);
  for (const z of [bz, LZ]) post(lx, z);
  for (const x of [LX, 0.15]) post(x, bz);
  H.role(add(H.box(LW, 0.05, 0.05, wall, LX, TY + RAIL_H, fz)), 'wall');
  H.role(add(H.box(0.05, 0.05, LD, wall, lx, TY + RAIL_H, LZ)), 'wall');
  H.role(add(H.box(LW, 0.05, 0.05, wall, LX, TY + RAIL_H, bz)), 'wall');
  noShadow(add(H.box(LW - 0.1, RAIL_H - 0.12, 0.03, railGlass, LX, TY + RAIL_H / 2, fz)));
  noShadow(add(H.box(0.03, RAIL_H - 0.12, LD - 0.1, railGlass, lx, TY + RAIL_H / 2, LZ)));

  // 라운지 체어 (정면을 보고 눕는 형태): 받침 · 쿠션 · 기울어진 등받이
  const lounge = (x, y, z) => {
    add(H.box(0.5, 0.12, 1.1, wall, x, y + 0.16, z));
    add(H.box(0.44, 0.06, 0.8, cushion, x, y + 0.25, z + 0.15));
    const back = H.box(0.44, 0.55, 0.06, wall, x, y + 0.45, z - 0.5);
    back.rotation.x = -0.55; add(back);
  };
  lounge(-2.05, TY, -0.4); lounge(-1.35, TY, -0.4);
  add(H.box(0.5, 0.35, 0.5, wall, -0.35, TY + 0.175, -1.9));                            // 테라스 화분
  { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), foliage); f.position.set(-0.35, TY + 0.6, -1.9); f.castShadow = true; add(f); }
  add(H.box(0.5, 0.05, 0.5, wall, -0.7, TY + 0.3, -0.4));                               // 작은 사이드 테이블

  // ── 수영장 (앞 오른쪽, x 0.4 ~ 2.6 · z 0.75 ~ 2.35) ─────────────
  const PX = 1.45, PZ = 1.55, PW = 2.2, PD = 1.6, CW = 0.15;
  add(H.box(PW, 0.14, CW, coping, PX, 0.07, PZ + PD / 2 - CW / 2));
  add(H.box(PW, 0.14, CW, coping, PX, 0.07, PZ - PD / 2 + CW / 2));
  add(H.box(CW, 0.14, PD - 2 * CW, coping, PX - PW / 2 + CW / 2, 0.07, PZ));
  add(H.box(CW, 0.14, PD - 2 * CW, coping, PX + PW / 2 - CW / 2, 0.07, PZ));
  noShadow(add(H.box(PW - 2 * CW, 0.02, PD - 2 * CW, poolFloor, PX, 0.01, PZ)));
  noShadow(add(H.box(PW - 2 * CW, 0.1, PD - 2 * CW, water, PX, 0.07, PZ)));
  for (const dz of [-0.1, 0.1]) add(H.box(0.03, 0.4, 0.03, chrome, 2.3, 0.25, PZ - 0.3 + dz));   // 사다리
  add(H.box(0.03, 0.03, 0.26, chrome, 2.3, 0.45, PZ - 0.3));

  // ── 나무 데크 (앞 왼쪽, x -2.5 ~ 0.2) + 기단 계단 ────────────────
  for (let i = 0; i < 6; i++) add(H.box(0.41, 0.1, PD, wood, -2.5 + 0.205 + 0.45 * i, 0.05, PZ));
  add(H.box(1.1, 0.1, 0.2, coping, DX, 0.15, 0.68));

  // 데크 위: 라운지 체어 · 파라솔 · 화분 2
  lounge(-1.55, 0.1, 1.75);
  { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6), chrome); p.position.set(-0.6, 0.9, 1.3); p.castShadow = true; add(p); }
  { const c = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.24, 8), cushion); c.position.set(-0.6, 1.78, 1.3); c.castShadow = true; add(c); }
  const plant = (x, y, z) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.26, 6), pot); p.position.set(x, y + 0.13, z); p.castShadow = p.receiveShadow = true; add(p);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), foliage); f.position.set(x, y + 0.42, z); f.castShadow = true; add(f);
  };
  plant(-2.3, 0.1, 2.15); plant(-0.05, 0.1, 2.15);

  return g;
}
