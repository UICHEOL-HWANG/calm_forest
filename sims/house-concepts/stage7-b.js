// 🌸 7단계 후보 B "중정 가든 코트" — ㄷ자 흰 건물이 가운데 정원(중정)을 감싼다.
//   양 날개는 2층 유리 + 나무 루버, 뒷동은 넓은 거실. 중정엔 벚나무 · 연못 · 징검돌 · 석등 · 벤치, 앞은 나무 슬랫 담장 + 대문.
//   정면 +z(중정이 열려 있다) · 발자국 ≤ 7.4×6.8 · 높이 ≈ 4.6 · 역할 태그: roof / wall / door (+ window)
import { makeGarden } from './garden.js';
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const win = (m) => { m.userData.role = 'window'; m.castShadow = false; return m; };
  const soft = (m) => { m.castShadow = false; return m; };
  const R = (m, r) => H.role(m, r);
  const wall = H.clay(0xf7f3ea), roof = H.clay(0xe9e3d6), door = H.clay(0xa8733f);
  const glass = H.glass(0x24394a); glass.opacity = 0.55;
  const slat = H.clay(0xb98a57), warm = H.clay(0xf3dcb8, { emissive: 0xffb877, emissiveIntensity: 0.55 });
  const glow = H.clay(0xffe3a6, { emissive: 0xffbf6a, emissiveIntensity: 1.1 });
  const grass = H.clay(0x86b862), deck = H.clay(0xc9a56e), shade = H.clay(0x2a2e33);
  const G = makeGarden(THREE, H, add);
  const lift = (fn, y) => { const n0 = g.children.length; fn(); for (let i = n0; i < g.children.length; i++) g.children[i].position.y += y; };

  // 기단 + 중정 바닥(잔디 + 데크 마루)
  R(add(H.box(7.4, 0.25, 6.8, wall, 0, 0.125, 0)), 'wall');
  soft(add(H.box(3.2, 0.05, 4.2, grass, 0, 0.27, 0.8)));
  soft(add(H.box(3.2, 0.05, 1.3, deck, 0, 0.28, -1.65)));   // 뒷동 앞 마루
  // 한 동: 층마다 유리 + 흰 모서리 + 슬래브, 위는 지붕 (cx,cz 중심, w×d, 높이 h, 층수)
  const wing = (cx, cz, w, d, h, floors) => {
    for (let f = 0; f < floors; f++) {
      const y0 = 0.25 + f * (h / floors), fh = h / floors - 0.15;
      for (const sx of [-1, 1]) for (const sz of [-1, 1])
        R(add(H.box(0.13, fh, 0.13, wall, cx + sx * (w / 2 - 0.065), y0 + fh / 2, cz + sz * (d / 2 - 0.065))), 'wall');
      win(add(H.box(w - 0.2, fh - 0.1, 0.05, glass, cx, y0 + fh / 2, cz + d / 2 - 0.03)));
      win(add(H.box(w - 0.2, fh - 0.1, 0.05, glass, cx, y0 + fh / 2, cz - d / 2 + 0.03)));
      win(add(H.box(0.05, fh - 0.1, d - 0.2, glass, cx - w / 2 + 0.03, y0 + fh / 2, cz)));
      win(add(H.box(0.05, fh - 0.1, d - 0.2, glass, cx + w / 2 - 0.03, y0 + fh / 2, cz)));
      soft(add(H.box(w - 0.3, fh - 0.2, 0.04, warm, cx, y0 + fh / 2, cz - d / 2 + 0.12)));
      soft(add(H.box(w - 0.3, 0.04, d - 0.3, glow, cx, y0 + fh - 0.02, cz)));
      R(add(H.box(w + 0.1, 0.13, d + 0.1, wall, cx, y0 + fh + 0.07, cz)), 'wall');   // 층 슬래브(흰 띠)
      if (w < 3) for (let i = 0; i < Math.round(d / 0.35); i++)                         // 중정 쪽 나무 루버(날개만)
        add(H.box(0.04, fh - 0.15, 0.1, slat, cx + (cx < 0 ? 1 : -1) * (w / 2 + 0.05), y0 + fh / 2, cz - d / 2 + 0.2 + i * 0.35));
    }
    R(add(H.box(w + 0.45, 0.2, d + 0.45, roof, cx, 0.25 + h + 0.14, cz)), 'roof');
  };
  wing(-2.6, 0.8, 2.1, 4.6, 2.6, 1);    // 왼쪽 날개(단층 — 중정이 위에서 보이게 낮춘다)
  wing(2.6, 0.8, 2.1, 4.6, 2.6, 1);     // 오른쪽 날개(단층)
  wing(0, -2.45, 7.0, 1.9, 4.2, 2);     // 뒷동(2층 안채)
  // 가운데 현관(뒷동 정면) + 처마 캐노피
  R(add(H.box(1.0, 2.05, 0.08, wall, 0, 1.3, -1.46)), 'wall'); R(add(H.box(0.86, 1.95, 0.08, door, 0, 1.25, -1.42)), 'door');
  R(add(H.box(1.6, 0.08, 0.7, wall, 0, 2.5, -1.1)), 'wall');
  // 옥상 정원: 뒷동 지붕(y≈3.0) 위 화단 + 나무, 날개 지붕 화분
  lift(() => { G.bed(-1.6, -2.5, 1.6, 0.7, 8); G.tree(1.4, -2.6, 0.7); G.plant(2.6, -2.4); }, 4.62);   // 안채 옥상 정원
  lift(() => { G.bed(-2.6, 0.6, 1.3, 1.6, 9); G.plant(-2.6, 2.4); }, 3.1);                            // 왼쪽 날개 옥상 화단
  lift(() => { G.tree(2.6, 0.2, 0.7); G.bed(2.6, 1.6, 1.3, 0.8, 7); }, 3.1);                            // 오른쪽 날개 옥상

  // ── 중정 정원 (기단 윗면 y 0.3 위에 올린다 — 안 올리면 연못·징검돌이 잔디 판 아래에 묻힌다) ──
  lift(() => {
    G.tree(0.6, 0.6, 1.4, G.m.blossom);                         // 벚나무(중정의 주인공)
    G.pond(-0.4, 2.1, 1.0, 0.7);
    G.stones([[-0.2, -0.7, 0.22], [0.1, 0.0, 0.2], [0.3, 1.0, 0.2], [0.5, 1.6, 0.2], [0.8, 2.3, 0.2], [1.0, 3.0, 0.2]]);
    G.lantern(-1.2, 0.2); G.bench(0.0, -0.9, Math.PI); G.bush(-1.0, 3.2); G.bush(1.1, 1.2, 0.25);
    G.bed(-0.9, 3.2, 1.0, 0.4, 6);
  }, 0.28);
  // ── 앞: 슬랫 담장 + 대문 ──
  for (const x of [-1.2, 1.2]) add(H.box(0.12, 1.1, 0.12, wall, x, 0.8, 3.65));
  for (let i = 0; i < 12; i++) { const x = -1.1 + (2.2 * i) / 11; add(H.box(0.07, 0.8, 0.05, slat, x, 0.65, 3.65)); }
  add(H.box(2.5, 0.08, 0.16, wall, 0, 1.4, 3.65));
  G.fence(-3.6, 3.4, -1.6, 3.4, 5, 0.45); G.fence(1.6, 3.4, 3.6, 3.4, 5, 0.45);
  G.tree(-3.6, 3.7, 0.9); G.tree(3.7, 3.7, 0.9, G.m.blossom);
  return g;
}
