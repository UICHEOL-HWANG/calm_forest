// 🏮 7단계 정원 저택 — 한옥 스타일 "한옥 마당": 모던과 같은 ㄷ자 중정 배치를 한옥으로 지었다.
//   안채(뒤, 높고 넓음) + 좌우 행랑채가 중정을 감싸고, 중정엔 소나무·연못·석등·벚나무, 앞은 돌담과 나무 대문.
//   배치는 하나·스타일 둘(모던/한옥) — 정면 +z · 발자국 7.4×6.8 · 높이 ≈ 4.4. 충돌 박스·현관 좌표는 js/house-stage7.js 와 같은 값.
//   역할 태그: roof / wall / door / window(한지창 — 밤에 켜진다). ⚠️ 재질당 role 하나: 기와는 한 재질, 돌 기단·기둥은 role 없음(스와치가 안 건드린다).
import { makeGarden } from './garden.js';
export function build(THREE, H) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const soft = (m) => { m.castShadow = false; return m; };
  const R = (m, r) => H.role(m, r);
  const tile = H.clay(0x6b7885), wall = H.clay(0xf6f1e6), pillar = H.clay(0x8a5a36);
  const lattice = H.clay(0xb98a57), paper = H.clay(0xfff4d9, { emissive: 0xffd9a0, emissiveIntensity: 0 });
  paper.userData.nightScale = 0.9;   // 밤에만 한지창이 켜진다(prepHouseMeshes 가 emissive 세기를 밤 수치로 갱신)
  const door = H.clay(0xa8733f), base = H.clay(0xcfc9ba), floorW = H.clay(0xc9a56e), grass = H.clay(0x86b862);
  const G = makeGarden(THREE, H, add);

  const roofOf = (cx, cz, w, d, y) => {
    R(add(H.box(w + 1.0, 0.16, d + 1.0, tile, cx, y, cz)), 'roof');
    R(add(H.box(w + 0.35, 0.2, d + 0.35, tile, cx, y + 0.22, cz)), 'roof');
    R(add(H.box(w - 0.5, 0.2, d - 0.5, tile, cx, y + 0.42, cz)), 'roof');
    R(add(H.box(Math.max(0.6, w - 1.3), 0.16, Math.max(0.6, d * 0.35), tile, cx, y + 0.6, cz)), 'roof');
    R(add(H.box(Math.max(0.5, w - 0.7), 0.1, 0.22, tile, cx, y + 0.72, cz)), 'roof');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const e = H.box(0.55, 0.1, 0.55, tile, cx + sx * (w / 2 + 0.42), y + 0.1, cz + sz * (d / 2 + 0.42));
      e.rotation.z = sx * -0.18; e.rotation.x = sz * 0.18; add(e);
    }
  };
  // face: 'z' 앞(+z) 창살 · 'x+' 오른쪽면(+x) · 'x-' 왼쪽면(-x) — 중정을 향한 면에 창살을 단다
  const hanok = (cx, cz, w, d, h, face = 'z') => {
    add(H.box(w + 0.7, 0.4, d + 0.7, base, cx, 0.2, cz));   // 돌 기단 — role 없음
    R(add(H.box(w, h, d, wall, cx, 0.4 + h / 2, cz)), 'wall');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(H.box(0.2, h + 0.2, 0.2, pillar, cx + sx * (w / 2 + 0.05), 0.4 + h / 2, cz + sz * (d / 2 + 0.05)));
    const len = face === 'z' ? w : d, n = Math.max(2, Math.round(len / 1.3)), cw = len / n - 0.2;
    for (let i = 0; i < n; i++) {
      const o = -len / 2 + (len * (i + 0.5)) / n;
      const mk = (bw, bh, bd, mat, dx, y, dz) => {   // dx: 면을 따라 이동, dz: 벽면에서 바깥으로
        const x = face === 'z' ? cx + o + dx : cx + (face === 'x+' ? 1 : -1) * (w / 2 + dz);
        const z = face === 'z' ? cz + d / 2 + dz : cz + o + dx;
        const box = soft(add(H.box(face === 'z' ? bw : bd, bh, face === 'z' ? bd : bw, mat, x, y, z)));
        if (mat === paper) box.userData.role = 'window';
      };
      mk(cw, h - 0.5, 0.05, paper, 0, 0.4 + h / 2, 0.02);
      for (let k = 0; k < 4; k++) mk(0.03, h - 0.5, 0.04, lattice, -cw / 2 + ((k + 0.5) * cw) / 4, 0.4 + h / 2, 0.05);
      mk(cw, 0.03, 0.04, lattice, 0, 0.4 + h / 2 + 0.25, 0.05); mk(cw, 0.03, 0.04, lattice, 0, 0.4 + h / 2 - 0.25, 0.05);
    }
    roofOf(cx, cz, w, d, 0.4 + h + 0.2);
  };
  soft(add(H.box(7.4, 0.04, 6.8, grass, 0, 0.02, 0)));
  hanok(0, -2.5, 5.4, 2.0, 2.0, 'z');                // 안채(뒤)
  hanok(-2.75, 0.9, 1.7, 3.0, 1.6, 'x+');            // 왼쪽 행랑채(중정 쪽 = +x 면)
  hanok(2.75, 0.9, 1.7, 3.0, 1.6, 'x-');             // 오른쪽 행랑채(중정 쪽 = -x 면)
  soft(add(H.box(3.6, 0.12, 1.0, floorW, 0, 0.46, -1.15)));   // 안채 앞 마루 + 문
  R(add(H.box(0.9, 1.5, 0.06, wall, 0, 1.25, -1.5)), 'wall'); R(add(H.box(0.78, 1.42, 0.06, door, 0, 1.21, -1.47)), 'door');
  add(H.box(1.2, 0.2, 0.4, base, 0, 0.1, -0.5));

  // ── 중정 정원 ──
  G.pond(-0.5, 1.5, 0.95, 0.65); G.pine(0.9, 0.2, 1.2); G.tree(1.1, 2.4, 1.0, G.m.blossom);
  G.stones([[0.0, -0.1, 0.22], [-0.2, 0.6, 0.2], [0.2, 1.4, 0.2], [0.3, 2.2, 0.2], [0.4, 3.0, 0.2]]);
  G.lantern(-1.1, -0.3); G.bush(-1.0, 2.7); G.bed(-0.6, 3.1, 1.0, 0.4, 6);
  for (const [x0, x1] of [[-3.7, -1.0], [1.0, 3.7]]) {   // 앞: 돌담 + 나무 대문
    add(H.box(x1 - x0, 0.55, 0.28, base, (x0 + x1) / 2, 0.28, 3.55)); add(H.box(x1 - x0 + 0.1, 0.08, 0.34, tile, (x0 + x1) / 2, 0.58, 3.55));
  }
  for (const x of [-1.0, 1.0]) add(H.box(0.2, 1.5, 0.2, pillar, x, 0.75, 3.55));
  add(H.box(2.5, 0.14, 0.3, tile, 0, 1.55, 3.55));
  for (let i = 0; i < 6; i++) {                          // 대나무(뒤 모서리)
    const x = 3.3 + (i % 3) * 0.2, z = -3.0 + i * 0.4;
    G.cyl(0.04, 0.05, 2.4 + (i % 3) * 0.4, G.m.bamboo, x, 1.2, z, 5); G.ico(0.2, G.m.leaf2, x, 2.5 + (i % 3) * 0.4, z);
  }
  return g;
}
