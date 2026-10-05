// 🏯 7단계 후보 D "모던 한옥 정원" — ㄱ자 한옥(회청색 기와 팔작지붕 + 흰 벽 + 나무 기둥·창살) + 돌 기단 + 앞 마루.
//   마당: 소나무 · 석등 · 연못 + 징검돌 · 대나무 · 낮은 돌담과 나무 대문. 한옥의 곡선 처마가 다른 후보와 가장 다른 실루엣.
//   정면 +z · 발자국 ≤ 7.4×6.6 · 높이 ≈ 4.4 · 역할 태그: roof / wall / door (+ window)
import { makeGarden } from './garden.js';
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const soft = (m) => { m.castShadow = false; return m; };
  const R = (m, r) => H.role(m, r);
  const tile = H.clay(0x59636b), tileTop = H.clay(0x4a535a), wall = H.clay(0xf6f1e6), pillar = H.clay(0x8a5a36);
  const lattice = H.clay(0xb98a57), paper = H.clay(0xfff4d9, { emissive: 0xffd9a0, emissiveIntensity: 0.45 });
  const door = H.clay(0xa8733f), base = H.clay(0xcfc9ba), floorW = H.clay(0xc9a56e), grass = H.clay(0x86b862);
  const G = makeGarden(THREE, H, add);

  // 팔작지붕: 아래 넓은 처마 판 + 위로 좁아지는 판 + 용마루, 추녀 끝을 살짝 들어 곡선 느낌
  const hanokRoof = (cx, cz, w, d, y) => {
    R(add(H.box(w + 1.0, 0.16, d + 1.0, tile, cx, y, cz)), 'roof');
    R(add(H.box(w + 0.35, 0.2, d + 0.35, tile, cx, y + 0.22, cz)), 'roof');
    R(add(H.box(w - 0.5, 0.2, d - 0.5, tileTop, cx, y + 0.42, cz)), 'roof');
    R(add(H.box(w - 1.3, 0.16, d * 0.35, tileTop, cx, y + 0.6, cz)), 'roof');
    R(add(H.box(w - 0.7, 0.1, 0.22, tile, cx, y + 0.72, cz)), 'roof');                 // 용마루
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const e = H.box(0.55, 0.1, 0.55, tile, cx + sx * (w / 2 + 0.42), y + 0.1, cz + sz * (d / 2 + 0.42));
      e.rotation.z = sx * -0.18; e.rotation.x = sz * 0.18; add(e);
    }
  };
  // 한 채: 돌 기단 + 흰 벽 + 나무 기둥 + 창살 문
  const hanok = (cx, cz, w, d, h) => {
    R(add(H.box(w + 0.7, 0.4, d + 0.7, base, cx, 0.2, cz)), 'wall');
    R(add(H.box(w, h, d, wall, cx, 0.4 + h / 2, cz)), 'wall');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(H.box(0.2, h + 0.2, 0.2, pillar, cx + sx * (w / 2 + 0.05), 0.4 + h / 2, cz + sz * (d / 2 + 0.05)));
    const n = Math.max(2, Math.round(w / 1.3)), cw = w / n - 0.2;
    for (let i = 0; i < n; i++) {                                                         // 앞면: 창살 + 한지 빛
      const x = cx - w / 2 + (w * (i + 0.5)) / n;
      soft(add(H.box(cw, h - 0.5, 0.05, paper, x, 0.4 + h / 2, cz + d / 2 + 0.02)));
      for (let k = 0; k < 4; k++) add(H.box(0.03, h - 0.5, 0.04, lattice, x - cw / 2 + ((k + 0.5) * cw) / 4, 0.4 + h / 2, cz + d / 2 + 0.05));
      add(H.box(cw, 0.03, 0.04, lattice, x, 0.4 + h / 2 + 0.25, cz + d / 2 + 0.05));
      add(H.box(cw, 0.03, 0.04, lattice, x, 0.4 + h / 2 - 0.25, cz + d / 2 + 0.05));
    }
    add(H.box(w + 0.1, 0.12, 0.14, pillar, cx, 0.4 + h + 0.06, cz + d / 2 + 0.05));      // 도리(보)
    hanokRoof(cx, cz, w, d, 0.4 + h + 0.2);
  };
  hanok(-0.4, -1.6, 5.2, 2.4, 1.9);   // 안채(뒤, 넓음)
  hanok(2.9, 0.5, 2.0, 3.0, 1.7);     // 사랑채(오른쪽 앞, ㄱ자)
  // 앞 마루 + 돌 계단 + 현관문
  soft(add(H.box(4.6, 0.12, 1.1, floorW, -0.9, 0.46, 0.0)));
  for (const x of [-2.6, -1.4, -0.2, 1.0]) add(H.box(0.12, 0.35, 0.12, pillar, x, 0.24, 0.45));
  R(add(H.box(0.9, 1.5, 0.06, wall, -0.4, 1.25, -0.39)), 'wall'); R(add(H.box(0.78, 1.42, 0.06, door, -0.4, 1.21, -0.36)), 'door');
  add(H.box(1.2, 0.2, 0.4, base, -0.4, 0.1, 0.75)); add(H.box(1.0, 0.2, 0.3, base, -0.4, 0.3, 0.55));

  // ── 마당 정원 ──
  soft(add(H.box(7.4, 0.04, 3.0, grass, 0, 0.02, 2.6)));
  G.pond(-1.6, 2.7, 1.1, 0.7); G.pine(-3.3, 2.0, 1.25); G.pine(0.9, 3.4, 0.9);
  G.stones([[-0.4, 1.1, 0.24], [-0.2, 1.8, 0.22], [0.2, 2.5, 0.22], [0.8, 2.2, 0.2], [1.5, 2.0, 0.2], [2.4, 2.4, 0.2]]);
  G.lantern(1.2, 1.2); G.lantern(-3.2, 3.5);
  for (let i = 0; i < 7; i++) {                                                          // 대나무(오른쪽 뒤)
    const x = 3.4 + (i % 3) * 0.2, z = -2.6 + i * 0.55;
    G.cyl(0.04, 0.05, 2.6 + (i % 3) * 0.4, G.m.bamboo, x, 1.3, z, 5);
    G.ico(0.2, G.m.leaf2, x, 2.7 + (i % 3) * 0.4, z);
  }
  G.bed(3.0, 3.6, 1.3, 0.5, 8); G.bush(-1.0, 3.8); G.tree(3.3, 2.7, 0.9, G.m.blossom);
  for (const [x0, x1] of [[-3.7, -1.0], [1.0, 3.7]]) {                                   // 낮은 돌담
    add(H.box(x1 - x0, 0.55, 0.28, base, (x0 + x1) / 2, 0.28, 3.85)); add(H.box(x1 - x0 + 0.1, 0.08, 0.34, tile, (x0 + x1) / 2, 0.58, 3.85));
  }
  for (const x of [-1.0, 1.0]) add(H.box(0.2, 1.5, 0.2, pillar, x, 0.75, 3.85));          // 나무 대문
  add(H.box(2.5, 0.14, 0.3, tile, 0, 1.55, 3.85));
  return g;
}
