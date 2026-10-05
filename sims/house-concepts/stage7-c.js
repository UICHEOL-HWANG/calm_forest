// 🌿 7단계 후보 C "온실 하우스" — 2층 흰 주택 + 오른쪽에 붙은 큰 유리 온실(박공 지붕, 안에 식물).
//   앞마당은 작은 분수 정원 + 채소·꽃 고랑 + 파고라. 온실 지붕이 멀리서도 읽히는 실루엣.
//   정면 +z · 발자국 ≤ 7.4×6.4 · 높이 ≈ 5.0 · 역할 태그: roof / wall / door (+ window)
import { makeGarden } from './garden.js';
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const win = (m) => { m.userData.role = 'window'; m.castShadow = false; return m; };
  const soft = (m) => { m.castShadow = false; return m; };
  const R = (m, r) => H.role(m, r);
  const wall = H.clay(0xf7f4ec), roof = H.clay(0xffffff), door = H.clay(0xa8733f);
  const glass = H.glass(0x24394a); glass.opacity = 0.55;
  const gh = H.glass(0xcdeedd); gh.opacity = 0.3;                         // 온실 유리(밝은 민트)
  const frame = H.clay(0xf4f7f2), warm = H.clay(0xf3dcb8, { emissive: 0xffb877, emissiveIntensity: 0.55 });
  const glow = H.clay(0xffe3a6, { emissive: 0xffbf6a, emissiveIntensity: 1.1 });
  const grass = H.clay(0x86b862), brick = H.clay(0xd9c4a0), shade = H.clay(0x2a2e33), pergola = H.clay(0xb98a57);
  const water = H.glass(0x5fd3e8); water.opacity = 0.8;
  const G = makeGarden(THREE, H, add);

  R(add(H.box(7.4, 0.25, 4.4, wall, 0, 0.125, -1.2)), 'wall');            // 기단
  // ── 왼쪽: 2층 주택 ──
  const HX = -1.5, HZ = -1.4, HW = 4.2, HD = 3.6;
  for (let f = 0; f < 2; f++) {
    const y0 = 0.25 + f * 2.2, fh = 2.05;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      R(add(H.box(0.14, fh, 0.14, wall, HX + sx * (HW / 2 - 0.07), y0 + fh / 2, HZ + sz * (HD / 2 - 0.07))), 'wall');
    win(add(H.box(HW - 0.2, fh - 0.1, 0.05, glass, HX, y0 + fh / 2, HZ + HD / 2 - 0.03)));
    win(add(H.box(HW - 0.2, fh - 0.1, 0.05, glass, HX, y0 + fh / 2, HZ - HD / 2 + 0.03)));
    win(add(H.box(0.05, fh - 0.1, HD - 0.2, glass, HX - HW / 2 + 0.03, y0 + fh / 2, HZ)));
    soft(add(H.box(HW - 0.3, fh - 0.2, 0.04, warm, HX, y0 + fh / 2, HZ - HD / 2 + 0.12)));
    soft(add(H.box(HW - 0.3, 0.04, HD - 0.3, glow, HX, y0 + fh - 0.02, HZ)));
    R(add(H.box(HW + 0.2, 0.15, HD + 0.2, wall, HX, y0 + fh + 0.07, HZ)), 'wall');
    for (const dx of [-0.7, 0.7]) R(add(H.box(0.06, fh - 0.1, 0.06, wall, HX + dx, y0 + fh / 2, HZ + HD / 2 - 0.03)), 'wall');
  }
  soft(add(H.box(HW, 0.06, HD, shade, HX, 4.67, HZ)));
  R(add(H.box(HW + 0.4, 0.2, HD + 0.4, roof, HX, 4.8, HZ)), 'roof');
  R(add(H.box(0.5, 0.45, 0.5, wall, -2.8, 5.1, -2.2)), 'wall');          // 옥상 화분 + 나무
  G.ico(0.34, G.m.leaf, -2.8, 5.55, -2.2);
  R(add(H.box(1.0, 2.05, 0.08, wall, -2.5, 1.3, 0.44)), 'wall'); R(add(H.box(0.86, 1.95, 0.08, door, -2.5, 1.25, 0.48)), 'door');
  add(H.box(1.3, 0.1, 0.4, brick, -2.5, 0.15, 0.65));
  // ── 오른쪽: 온실(박공 지붕) ──
  const GX = 2.2, GZ = -1.3, GW = 3.0, GD = 3.4, GH = 2.4;
  for (const sx of [-1, 1]) for (const z of [-1, 0, 1]) R(add(H.box(0.09, GH, 0.09, frame, GX + sx * (GW / 2 - 0.05), 0.25 + GH / 2, GZ + z * (GD / 2 - 0.05))), 'wall');
  win(add(H.box(GW - 0.1, GH, 0.04, gh, GX, 0.25 + GH / 2, GZ + GD / 2 - 0.03)));
  win(add(H.box(GW - 0.1, GH, 0.04, gh, GX, 0.25 + GH / 2, GZ - GD / 2 + 0.03)));
  win(add(H.box(0.04, GH, GD - 0.1, gh, GX + GW / 2 - 0.03, 0.25 + GH / 2, GZ)));
  for (const x of [-0.75, 0, 0.75]) R(add(H.box(0.05, GH, 0.05, frame, GX + x, 0.25 + GH / 2, GZ + GD / 2 - 0.03)), 'wall');
  const slope = (sx) => {   // 두 경사 유리 패널 — 능선이 앞뒤로 달린다
    const p = H.box(GW / 2 + 0.3, 0.05, GD + 0.2, gh, GX + sx * (GW / 4), 0.25 + GH + 0.42, GZ);
    p.rotation.z = -sx * 0.5; p.castShadow = false; p.userData.role = 'window'; add(p);
  };
  slope(-1); slope(1);
  R(add(H.box(0.1, 0.08, GD + 0.25, frame, GX, 0.25 + GH + 0.78, GZ)), 'roof');
  for (const z of [-1.4, 0, 1.4]) add(H.box(GW + 0.1, 0.04, 0.05, frame, GX, 0.25 + GH + 0.2, GZ + z));
  G.bed(GX - 0.5, GZ - 0.4, 0.8, 2.2, 10); G.bed(GX + 0.7, GZ - 0.4, 0.7, 2.2, 9);   // 온실 안 고랑
  G.tree(GX, GZ - 1.2, 0.8); G.plant(GX + 0.2, GZ + 1.1, 1.1);

  // ── 앞마당 정원 ──
  soft(add(H.box(7.4, 0.04, 2.9, grass, 0, 0.02, 2.55)));
  G.cyl(0.95, 1.0, 0.25, G.m.stone, -1.2, 0.125, 2.6, 12);                           // 분수 받침 · 물 · 기둥 · 윗접시
  G.cyl(0.8, 0.8, 0.06, water, -1.2, 0.26, 2.6, 12).castShadow = false;
  G.cyl(0.1, 0.14, 0.7, G.m.stone, -1.2, 0.6, 2.6, 8); G.cyl(0.38, 0.1, 0.12, G.m.stone, -1.2, 0.98, 2.6, 8);
  G.stones([[0.0, 1.0], [0.3, 1.6], [0.5, 2.3], [0.8, 3.0], [1.4, 3.4]]);
  G.bed(2.6, 2.0, 1.8, 0.5, 9); G.bed(2.6, 2.9, 1.8, 0.5, 9); G.bed(2.6, 3.8, 1.8, 0.5, 9);   // 채소·꽃 고랑
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(H.box(0.09, 1.9, 0.09, pergola, -1.2 + sx * 1.15, 0.95, 2.6 + sz * 0.9));
  for (let i = 0; i < 5; i++) add(H.box(2.5, 0.06, 0.1, pergola, -1.2, 1.9, 1.75 + i * 0.4));    // 파고라 살
  G.tree(-3.3, 1.9, 1.0); G.tree(-3.5, 3.4, 0.9, G.m.blossom); G.lantern(0.5, 1.0); G.bush(-3.0, 3.8);
  return g;
}
