// 🏡 기본 완성 집 "코티지" — 단층 크림 스투코 + 큰 박공 지붕 (샌드/탄) + 왼쪽 굴뚝 + 아치 문
// 정면 +z · 발자국 ≤ 4.6×4.6 · 높이 ≤ 4.2 · 역할 태그: roof / wall / door (+ window)
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return add(m); };
  const win = (m) => { m.userData.role = 'window'; return m; };

  // ── 재질 — 역할별 단일 인스턴스 (게임 스와치가 색을 갈아 끼운다) ──
  const wall = H.clay(0xf3e6c8);          // 크림 스투코
  const roof = H.clay(0xd9b982);          // 샌드/탄 기와
  const door = H.clay(0x9b4a35);          // 붉은 갈색 아치 문
  const roofLite = H.clay(0xe6cfa0);      // 살짝 도드라진 밝은 기와 패치
  const cream = H.clay(0xefe3c9);         // 굴뚝
  const creamDark = H.clay(0xd8c7a4);     // 굴뚝 갓
  const brick = H.clay(0xc8704f);         // 벽돌 악센트
  const wood = H.clay(0x8a5a36);          // 창틀·우편함 기둥
  const woodDark = H.clay(0x63412a);      // 문틀
  const glassDark = H.clay(0x2c4a78, { roughness: 0.35, flatShading: false }); // 짙은 파란 창
  const lawn = H.clay(0x8cc96c);          // 잔디 타일
  const stone = H.clay(0xc6c0b2);         // 콘크리트 패드·디딤돌
  const bush = H.clay(0x5c9c44);
  const yellow = H.clay(0xf4c744);        // 우편함
  const red = H.clay(0xd94a3a);
  const gold = H.clay(0xe9b949, { roughness: 0.35, metalness: 0.5 });
  const metal = H.clay(0x3b3d45);         // 안테나
  const petal = [H.clay(0xf07a8a), H.clay(0xf7d15a), H.clay(0xffffff)];

  // ── 형상 도우미 ─────────────────────────────────────────────────
  // 삼각 프리즘: x 축으로 len, 밑변 ±hd(z), 높이 h — 박공 삼각벽
  const prism = (len, hd, h) => {
    const s = new THREE.Shape(); s.moveTo(-hd, 0); s.lineTo(hd, 0); s.lineTo(0, h); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2); geo.rotateY(Math.PI / 2);   // 돌출축 z→x
    return geo;
  };
  // 아치(직사각형 + 반원) 를 +z 로 depth 만큼 돌출 — 문·문틀
  const arch = (w, hRect, depth) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hRect);
    s.absarc(0, hRect, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  };

  // ── 치수 ───────────────────────────────────────────────────────
  const WZ = -0.2;                       // 본채 중심 z (z -1.5 ~ 1.1)
  const FRONT = 1.1;                     // 정면 벽 z
  const WALL_H = 1.95, EAVE = 1.9;
  const HD = 1.35, RH = 1.65;            // 지붕 반깊이 · 높이 (경사 ≈ 51°)
  const RLEN = 3.7;                      // 지붕 길이 (x)
  const RT = 0.16;                       // 지붕 슬래브 두께
  const L = Math.hypot(HD, RH);          // 경사면 길이
  const A = Math.atan2(RH, HD);          // 경사각
  const RIDGE = EAVE + RH;               // 3.55
  const nrm = new THREE.Vector3(0, HD, RH).divideScalar(L);      // 정면 경사 바깥 법선
  const down = new THREE.Vector3(0, -RH, HD).divideScalar(L);    // 용마루→처마 방향
  // 정면(sign=+1)/후면(-1) 경사면 위, 용마루에서 t 만큼 내려온 지점 + 법선 offset
  const onSlope = (sign, x, t, off) => new THREE.Vector3(x, RIDGE, WZ)
    .addScaledVector(new THREE.Vector3(0, down.y, down.z * sign), t)
    .addScaledVector(new THREE.Vector3(0, nrm.y, nrm.z * sign), off);

  // ── 잔디 타일 + 본채 ───────────────────────────────────────────
  add(H.box(4.5, 0.08, 4.5, lawn, 0, 0.04, 0.05));
  H.role(add(H.box(3.2, WALL_H, 2.6, wall, 0, WALL_H / 2 + 0.02, WZ)), 'wall');
  H.role(mesh(prism(3.2, 1.3, 1.3 * RH / HD - 0.02), wall, 0, EAVE, WZ), 'wall');   // 박공 삼각벽

  // ── 박공 지붕: 슬래브 2장 + 용마루 갓 ─────────────────────────
  for (const sign of [1, -1]) {
    const p = onSlope(sign, 0, L / 2, RT / 2);
    const m = H.role(add(H.box(RLEN, RT, L + 0.12, roof, 0, p.y, p.z)), 'roof');
    m.rotation.x = A * sign;
  }
  H.role(add(H.box(RLEN + 0.1, 0.16, 0.4, roof, 0, RIDGE + RT / Math.cos(A) - 0.02, WZ)), 'roof');
  // 살짝 도드라진 밝은 기와 패치 (정면 4 · 후면 1)
  const patches = [[1, -0.95, 1.4], [1, -0.15, 0.55], [1, 0.6, 1.35], [1, 1.35, 0.7], [-1, 0.3, 0.9]];
  for (const [sign, x, t] of patches) {
    const p = onSlope(sign, x, t, RT + 0.02);
    const m = add(H.box(0.48, 0.05, 0.38, roofLite, p.x, p.y, p.z)); m.rotation.x = A * sign;
  }
  // TV 안테나 (용마루 오른쪽)
  const ridgeTop = RIDGE + RT / Math.cos(A) + 0.05;
  mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.28, 6), metal, 1.2, ridgeTop + 0.14, WZ);
  add(H.box(0.55, 0.025, 0.025, metal, 1.2, ridgeTop + 0.26, WZ));
  add(H.box(0.36, 0.025, 0.025, metal, 1.2, ridgeTop + 0.16, WZ));

  // ── 굴뚝 (왼쪽, 정면 경사를 뚫고 올라옴) ──────────────────────
  const CX = -1.15, CZ = WZ + 0.35;
  add(H.box(0.5, 2.0, 0.5, cream, CX, 3.0, CZ));
  add(H.box(0.62, 0.14, 0.62, creamDark, CX, 4.05, CZ));
  add(H.box(0.16, 0.09, 0.03, brick, CX - 0.1, 3.42, CZ + 0.26));        // 정면 벽돌 악센트
  add(H.box(0.16, 0.09, 0.03, brick, CX + 0.09, 3.7, CZ + 0.26));
  add(H.box(0.03, 0.09, 0.16, brick, CX + 0.26, 3.56, CZ + 0.08));        // 오른쪽 면

  // ── 현관: 아치 문 + 문틀 + 금색 손잡이 + 아치 포치 지붕 ──────
  const DX = -0.45;
  mesh(arch(0.94, 0.95, 0.05), woodDark, DX, 0.08, FRONT);
  H.role(mesh(arch(0.78, 0.95, 0.08), door, DX, 0.08, FRONT), 'door');
  mesh(new THREE.SphereGeometry(0.045, 8, 6), gold, DX + 0.26, 0.78, FRONT + 0.1);
  const hood = new THREE.CylinderGeometry(0.46, 0.46, 0.4, 12, 1, false, -Math.PI / 2, Math.PI);
  hood.rotateX(-Math.PI / 2);                                              // 위쪽 반원 볼트, 축 z
  H.role(mesh(hood, roof, DX, 1.46, FRONT + 0.2), 'roof');
  for (const dx of [-0.38, 0.38]) add(H.box(0.06, 0.22, 0.3, woodDark, DX + dx, 1.36, FRONT + 0.15));   // 포치 받침

  // ── 정면 창 (문 오른쪽, 키 큰 짙은 파란 창 + 나무 틀) ─────────
  const WX = 0.75, WY = 1.12;
  add(H.box(0.64, 1.02, 0.06, wood, WX, WY, FRONT + 0.02));
  win(add(H.box(0.52, 0.9, 0.05, glassDark, WX, WY, FRONT + 0.04)));
  add(H.box(0.04, 0.9, 0.02, wood, WX, WY, FRONT + 0.07));
  add(H.box(0.52, 0.04, 0.02, wood, WX, WY + 0.1, FRONT + 0.07));
  add(H.box(0.72, 0.06, 0.14, wood, WX, WY - 0.54, FRONT + 0.06));       // 창턱
  // 창 아래 꽃 상자
  add(H.box(0.6, 0.16, 0.16, woodDark, WX, WY - 0.66, FRONT + 0.1));
  for (let i = 0; i < 3; i++) mesh(new THREE.IcosahedronGeometry(0.07, 0), petal[i], WX - 0.18 + i * 0.18, WY - 0.53, FRONT + 0.1);

  // ── 오른쪽 측면 작은 창 ───────────────────────────────────────
  add(H.box(0.06, 0.6, 0.6, wood, 1.62, 1.2, WZ - 0.1));
  win(add(H.box(0.05, 0.5, 0.5, glassDark, 1.64, 1.2, WZ - 0.1)));
  add(H.box(0.02, 0.5, 0.04, wood, 1.67, 1.2, WZ - 0.1));

  // ── 마당: 콘크리트 패드 · 디딤돌 · 둥근 관목 2 · 노란 우편함 ──
  add(H.box(1.1, 0.06, 0.55, stone, DX, 0.1, FRONT + 0.3));
  add(H.box(0.5, 0.05, 0.32, stone, DX, 0.1, FRONT + 0.75));
  add(H.box(0.44, 0.05, 0.3, stone, DX + 0.05, 0.1, FRONT + 1.08));
  mesh(new THREE.IcosahedronGeometry(0.36, 1), bush, -1.3, 0.4, FRONT + 0.42);
  mesh(new THREE.IcosahedronGeometry(0.3, 1), bush, 0.2, 0.34, FRONT + 0.4);
  const MX = 1.6, MZ = FRONT + 0.85;
  add(H.box(0.09, 0.75, 0.09, wood, MX, 0.42, MZ));
  add(H.box(0.4, 0.18, 0.28, yellow, MX, 0.84, MZ));
  const cap = new THREE.CylinderGeometry(0.14, 0.14, 0.4, 10); cap.rotateZ(Math.PI / 2);
  mesh(cap, yellow, MX, 0.93, MZ);
  add(H.box(0.04, 0.16, 0.03, red, MX + 0.22, 0.98, MZ - 0.07));

  g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}
