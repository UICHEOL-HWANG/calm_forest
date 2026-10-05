// 🌸 7단계 정원 저택 — 모던 스타일 "테라스 코트": ㄷ자 중정 + 벚나무 정원, 안채는 3단 테라스 정원으로 쌓았다.
//   양 날개는 단층(지붕 정원), 뒤쪽 안채가 3단으로 어긋나게 올라가 멀리서 계단식 실루엣이 된다. 중정엔 벚나무·연못·석등.
//   정면 +z · 발자국 7.4×6.8 · 높이 ≈ 6.3 · 역할 태그: roof / wall / door (+ window) — 재질당 role 하나(스와치 규칙)
//   충돌 박스·현관 좌표는 js/house-stage7.js 와 같은 값. 병합(js/house/merge.js)은 index.js 가 한다.
import { makeGarden } from './garden.js';
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const win = (m) => { m.userData.role = 'window'; m.castShadow = false; return m; };
  const soft = (m) => { m.castShadow = false; return m; };
  const R = (m, r) => H.role(m, r);
  const wall = H.clay(0xf7f3ea), roof = H.clay(0xeee9dd), door = H.clay(0xa8733f);
  const glass = H.glass(0x24415c); glass.opacity = 0.7;   // 더 푸르고 진하게 — 게임 안개 속에서 밋밋한 갈색으로 보이던 문제
  const rail = H.glass(0xb6e0ee); rail.opacity = 0.25;
  const slat = H.clay(0xb98a57), warm = H.clay(0x7a644e, { emissive: 0xffb877, emissiveIntensity: 0.16 });
  const glow = H.clay(0xffe3a6, { emissive: 0xffbf6a, emissiveIntensity: 1.1 });
  const grass = H.clay(0x86b862), deck = H.clay(0xc9a56e);
  const G = makeGarden(THREE, H, add);
  const lift = (fn, y) => { const n0 = g.children.length; fn(); for (let i = n0; i < g.children.length; i++) g.children[i].position.y += y; };

  R(add(H.box(7.4, 0.25, 6.8, wall, 0, 0.125, 0)), 'wall');                        // 기단
  soft(add(H.box(3.0, 0.05, 4.2, grass, 0, 0.27, 0.8)));                            // 중정 잔디
  soft(add(H.box(3.0, 0.05, 1.2, deck, 0, 0.28, -1.65)));                           // 안채 앞 마루
  // 한 층 매스: 유리 + 흰 모서리 + 슬래브 지붕. yb = 바닥 높이, 돌려주는 값 = 지붕 윗면 y
  const block = (cx, cz, w, d, h, yb, louver = false) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      R(add(H.box(0.13, h, 0.13, wall, cx + sx * (w / 2 - 0.065), yb + h / 2, cz + sz * (d / 2 - 0.065))), 'wall');
    win(add(H.box(w - 0.2, h - 0.1, 0.05, glass, cx, yb + h / 2, cz + d / 2 - 0.03)));
    win(add(H.box(w - 0.2, h - 0.1, 0.05, glass, cx, yb + h / 2, cz - d / 2 + 0.03)));
    win(add(H.box(0.05, h - 0.1, d - 0.2, glass, cx - w / 2 + 0.03, yb + h / 2, cz)));
    win(add(H.box(0.05, h - 0.1, d - 0.2, glass, cx + w / 2 - 0.03, yb + h / 2, cz)));
    soft(add(H.box(w - 0.3, h - 0.2, 0.04, warm, cx, yb + h / 2, cz - d / 2 + 0.12)));
    soft(add(H.box(w - 0.3, 0.04, d - 0.3, glow, cx, yb + h - 0.04, cz)));
    R(add(H.box(w + 0.3, 0.2, d + 0.3, roof, cx, yb + h + 0.12, cz)), 'roof');
    R(add(H.box(w + 0.34, 0.05, d + 0.34, wall, cx, yb + h + 0.03, cz)), 'wall');
    if (louver) for (let i = 0; i < Math.round(d / 0.35); i++)
      add(H.box(0.04, h - 0.2, 0.1, slat, cx + (cx < 0 ? 1 : -1) * (w / 2 + 0.05), yb + h / 2, cz - d / 2 + 0.2 + i * 0.35));
    return yb + h + 0.22;
  };
  // 안채 3단 (A) — 아래 넓게, 위로 갈수록 좁게, 오른쪽으로 어긋남
  const top1 = block(0, -2.5, 7.0, 1.9, 2.4, 0.25);                 // 1단 거실
  const top2 = block(1.2, -2.7, 4.4, 1.6, 1.9, top1);               // 2단 침실
  const top3 = block(1.7, -2.8, 2.2, 1.4, 1.6, top2);               // 3단 라운지
  // 양 날개(B) 단층 + 나무 루버
  const topL = block(-2.6, 0.8, 2.0, 4.6, 2.4, 0.25, true);
  const topR = block(2.6, 0.8, 2.0, 4.6, 2.4, 0.25, true);
  // 현관(안채 정면) + 캐노피
  R(add(H.box(1.0, 2.05, 0.08, wall, -0.6, 1.3, -1.5)), 'wall'); R(add(H.box(0.86, 1.95, 0.08, door, -0.6, 1.25, -1.46)), 'door');
  R(add(H.box(1.6, 0.08, 0.7, wall, -0.6, 2.45, -1.15)), 'wall');
  // 지붕 테라스 정원
  lift(() => { G.bed(-2.4, -2.4, 1.6, 0.8, 8); G.tree(-3.2, -2.2, 0.7); }, top1);
  lift(() => { G.bed(-0.5, -2.7, 1.2, 0.6, 7); G.plant(0.4, -2.0); }, top2);
  lift(() => { G.tree(1.7, -2.9, 0.65, G.m.blossom); G.plant(2.4, -2.4); }, top3);
  lift(() => { G.bed(-2.6, 0.3, 1.2, 1.5, 9); G.plant(-2.6, 2.4); }, topL);
  lift(() => { G.tree(2.6, 0.1, 0.7); G.bed(2.6, 1.6, 1.2, 0.8, 7); }, topR);
  // 1단 지붕 앞 가장자리 난간
  for (let i = 0; i <= 4; i++) R(add(H.box(0.05, 0.55, 0.05, wall, -0.9 + i * 0.75, top1 + 0.28, -1.78)), 'wall');
  R(add(H.box(3.0, 0.05, 0.05, wall, 0.6, top1 + 0.56, -1.78)), 'wall'); soft(add(H.box(3.0, 0.4, 0.03, rail, 0.6, top1 + 0.28, -1.78)));

  // ── 중정 정원 (기단 위로 0.28 올림) ──
  lift(() => {
    G.tree(0.4, 0.6, 1.4, G.m.blossom); G.pond(-0.3, 2.1, 0.95, 0.7);
    G.stones([[-0.4, -0.7, 0.22], [0.0, 0.0, 0.2], [0.3, 1.0, 0.2], [0.5, 1.6, 0.2], [0.8, 2.3, 0.2], [1.0, 3.0, 0.2]]);
    G.lantern(-1.1, 0.2); G.bench(0.6, -0.9, Math.PI); G.bush(-1.0, 3.2); G.bush(1.1, 1.2, 0.25); G.bed(-0.8, 3.2, 1.0, 0.4, 6);
  }, 0.28);
  // 앞: 슬랫 담장 + 대문
  for (const x of [-1.2, 1.2]) add(H.box(0.12, 1.1, 0.12, wall, x, 0.8, 3.65));
  for (let i = 0; i < 12; i++) add(H.box(0.07, 0.8, 0.05, slat, -1.1 + (2.2 * i) / 11, 0.65, 3.65));
  add(H.box(2.5, 0.08, 0.16, wall, 0, 1.4, 3.65));
  G.fence(-3.6, 3.4, -1.6, 3.4, 5, 0.45); G.fence(1.6, 3.4, 3.6, 3.4, 5, 0.45);
  G.tree(-3.6, 3.7, 0.9); G.tree(3.7, 3.7, 0.9, G.m.blossom);
  return g;
}
