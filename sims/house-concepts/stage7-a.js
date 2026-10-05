// 🌿 7단계 후보 A "스카이 가든 하우스" — 3단으로 어긋나게 쌓은 흰 매스, 단마다 지붕이 곧 정원 테라스.
//   아래 넓은 거실(유리) → 2단 침실 → 3단 작은 라운지 + 옥상 나무. 앞마당엔 연못 정원 + 징검돌 + 꽃밭.
//   정면 +z · 발자국 ≤ 7.2×6.6 · 높이 ≈ 6.6 · 역할 태그: roof / wall / door (+ window)
import { makeGarden } from './garden.js';
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const win = (m) => { m.userData.role = 'window'; m.castShadow = false; return m; };
  const wall = H.clay(0xf6f4ee), roof = H.clay(0xffffff), door = H.clay(0xb07a44);
  const glass = H.glass(0x24394a); glass.opacity = 0.55;
  const rail = H.glass(0xb6e0ee); rail.opacity = 0.25;
  const warm = H.clay(0xf3dcb8, { emissive: 0xffb877, emissiveIntensity: 0.55 });
  const glow = H.clay(0xffe3a6, { emissive: 0xffbf6a, emissiveIntensity: 1.1 });
  const grass = H.clay(0x7fb35a), shade = H.clay(0x2a2e33), step = H.clay(0xf1f0ea);
  const G = makeGarden(THREE, H, add);
  const R = (m, r) => H.role(m, r);
  const soft = (m) => { m.castShadow = false; return m; };

  R(add(H.box(7.0, 0.3, 4.4, wall, 0, 0.15, -1.2)), 'wall');   // 기단
  // 한 단(층) 매스: 유리 4면 + 멀리언 + 천장빛 + 흰 슬래브 지붕
  const tier = (t) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      R(add(H.box(0.14, t.h, 0.14, wall, t.cx + sx * (t.w / 2 - 0.07), t.y0 + t.h / 2, t.cz + sz * (t.d / 2 - 0.07))), 'wall');
    win(add(H.box(t.w - 0.2, t.h - 0.1, 0.05, glass, t.cx, t.y0 + t.h / 2, t.cz + t.d / 2 - 0.03)));
    win(add(H.box(t.w - 0.2, t.h - 0.1, 0.05, glass, t.cx, t.y0 + t.h / 2, t.cz - t.d / 2 + 0.03)));
    win(add(H.box(0.05, t.h - 0.1, t.d - 0.2, glass, t.cx - t.w / 2 + 0.03, t.y0 + t.h / 2, t.cz)));
    win(add(H.box(0.05, t.h - 0.1, t.d - 0.2, glass, t.cx + t.w / 2 - 0.03, t.y0 + t.h / 2, t.cz)));
    soft(add(H.box(t.w - 0.3, t.h - 0.2, 0.04, warm, t.cx, t.y0 + t.h / 2, t.cz - t.d / 2 + 0.12)));
    const n = Math.max(2, Math.round(t.w / 1.5));
    for (let i = 1; i < n; i++) R(add(H.box(0.06, t.h - 0.1, 0.06, wall, t.cx - t.w / 2 + (t.w * i) / n, t.y0 + t.h / 2, t.cz + t.d / 2 - 0.03)), 'wall');
    soft(add(H.box(t.w - 0.3, 0.04, t.d - 0.3, glow, t.cx, t.y0 + t.h - 0.04, t.cz)));
    soft(add(H.box(t.w - 0.1, 0.07, t.d - 0.1, shade, t.cx, t.y0 + t.h + 0.03, t.cz)));
    R(add(H.box(t.w + 0.3, 0.22, t.d + 0.3, roof, t.cx, t.y0 + t.h + 0.18, t.cz)), 'roof');
    R(add(H.box(t.w + 0.34, 0.05, t.d + 0.34, wall, t.cx, t.y0 + t.h + 0.07, t.cz)), 'wall');
  };
  tier({ w: 6.6, d: 4.0, cx: 0, cz: -1.2, y0: 0.3, h: 2.2 });        // 1단 거실
  tier({ w: 4.6, d: 3.0, cx: 0.9, cz: -1.6, y0: 2.8, h: 1.9 });      // 2단 침실
  tier({ w: 2.4, d: 2.2, cx: -0.6, cz: -1.9, y0: 4.9, h: 1.7 });     // 3단 라운지
  // 현관 + 계단
  R(add(H.box(1.0, 2.05, 0.08, wall, -2.3, 1.35, 0.84)), 'wall'); R(add(H.box(0.86, 1.95, 0.08, door, -2.3, 1.3, 0.88)), 'door');
  add(H.box(1.3, 0.1, 0.4, step, -2.3, 0.15, 1.05));

  // 단마다 정원 테라스(난간 + 화단 + 나무)
  const terrace = (y, x0, x1, z0, z1) => {
    const post = (x, z) => R(add(H.box(0.05, 0.6, 0.05, wall, x, y + 0.3, z)), 'wall');
    for (let i = 0; i <= 3; i++) post(x0 + ((x1 - x0) * i) / 3, z1);
    for (const z of [z0, (z0 + z1) / 2]) post(x0, z);
    R(add(H.box(x1 - x0, 0.05, 0.05, wall, (x0 + x1) / 2, y + 0.6, z1)), 'wall');
    R(add(H.box(0.05, 0.05, z1 - z0, wall, x0, y + 0.6, (z0 + z1) / 2)), 'wall');
    soft(add(H.box(x1 - x0, 0.45, 0.03, rail, (x0 + x1) / 2, y + 0.3, z1)));
  };
  const lift = (fn, y) => { const before = g.children.length; fn(); for (let i = before; i < g.children.length; i++) g.children[i].position.y += y; };
  terrace(2.82, -3.2, -1.4, -2.2, 0.7);                                   // 1단 지붕 왼쪽 테라스
  lift(() => { G.bed(-2.5, -1.3, 1.1, 0.5); G.plant(-3.0, -2.6); G.tree(-2.2, -2.5, 0.8); }, 2.82);
  terrace(4.92, -1.2, 0.2, -0.4, 0.0);                                    // 2단 지붕 앞 가장자리
  lift(() => { G.bed(2.3, -0.7, 1.3, 0.5, 8); G.tree(3.0, -2.5, 0.9, G.m.blossom); }, 4.92);
  lift(() => { G.tree(-0.6, -2.3, 0.7); G.plant(0.3, -1.2); }, 6.82);     // 3단 지붕 옥상 나무

  // ── 앞마당 정원 ──
  soft(add(H.box(7.2, 0.04, 2.7, grass, 0, 0.02, 2.5)));
  G.pond(1.9, 2.5, 1.25, 0.8);
  G.stones([[-2.3, 1.5], [-2.2, 2.2], [-1.8, 2.8], [-1.0, 3.1], [-0.2, 3.2], [0.6, 3.1]]);
  G.bed(-2.9, 3.4, 1.5, 0.55, 8); G.bed(3.0, 3.6, 1.3, 0.5, 7);
  G.tree(-3.3, 1.9, 1.1); G.tree(3.4, 1.7, 1.0, G.m.blossom);
  G.lantern(0.2, 1.7); G.bench(-0.9, 1.5, 0); G.bush(2.9, 3.0); G.bush(-1.5, 3.8);
  return g;
}
