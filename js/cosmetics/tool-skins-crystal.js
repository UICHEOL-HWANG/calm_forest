// js/cosmetics/tool-skins-crystal.js
// =============================================================
//  calm forest · ⭐ 별빛 도구 세트(theme 'star') — 🤝 친구 초대 보상 · 🌈 무지개 크리스탈
//  ------------------------------------------------------------
//  ▶ 시안·확정: sims/referral-reward-sim.html 도구 B안(2026-10-08 사용자 선택).
//    시안은 **이 파일을 import 한다**(복제본 없음) — 조형을 고치면 시안에도 그대로 보인다.
//  ▶ 규칙은 tool-skins.js 와 같다: 도구 하나 = (g) => void, 원점 = 쥐는 곳. 굽기·발광은 tool-skins.js 의 bake().
//    파스텔 무지개 띠가 날·통의 **층** 자체가 된다(부채꼴 도끼날 · 세 겹 삽날 · 무지개 낫 마디) + 육각 보석.
//    실루엣(곡괭이 양팔·삽 둥근 날·낫 세 마디)은 게임 0단계 뼈대 그대로.
//  ▶ 🌙 발광은 작은 보석(RB.gem)만 — 블룸 임계 0.85(넓은 면 금지).
//  ▶ THREE 를 인자로 받는다(node 테스트는 소스 검사만 — tests/referral-art.test.mjs).
// =============================================================

/** 팔레트 — 넓은 면은 전부 luma 0.85 아래, gem 만 작은 보석에 쓴다 */
export const RB = Object.freeze({ pearl: 0xf3edf8, pink: 0xf6a6c6, lemon: 0xffe48a, mint: 0xa4e3c4, sky: 0x9ecbf3, lilac: 0xc4acf0, gem: 0xfff6fb });

/** 시안 B안 전용 헬퍼 — 우산(tool-skins.js buildUmbrella)도 crystal 을 쓴다 */
export function crystalKit(THREE, K) {
  const { clay, M, V } = K;
  const crystal = (r, mat, ey = 1.6) => { const m = M(new THREE.OctahedronGeometry(r, 0), mat); m.scale.y = ey; return m; };
  const gem = () => clay(RB.gem, { glow: RB.gem, k: 0.85 });
  const hexBand = (r0, r1, h, col, y) => M(new THREE.CylinderGeometry(r1, r0, h, 6), clay(col), 0, y, 0);
  function sector(r0, r1, a0, a1) {   // 고리 부채꼴(r0=0 이면 파이)
    const s = new THREE.Shape();
    if (r0 <= 0) { s.moveTo(0, 0); s.absarc(0, 0, r1, a0, a1, false); s.lineTo(0, 0); }
    else { s.absarc(0, 0, r1, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true); }
    s.closePath(); return s;
  }
  // 자루 — 진주빛 + 무지개 띠 셋, 끝 혹은 하늘 수정
  function handle(g, l, r = 0.03) {
    g.add(M(new THREE.CylinderGeometry(r * 0.8, r, l, 7), clay(RB.pearl), 0, l / 2 - 0.08, 0));
    g.add(M(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.07, 7), clay(RB.lilac), 0, -0.02, 0));
    g.add(crystal(r * 1.4, clay(RB.sky), 1.5).translateY(-0.1));
    [[RB.pink, l - 0.22], [RB.lemon, l - 0.19], [RB.sky, l - 0.16]].forEach(([c, y]) => g.add(M(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 0.024, 7), clay(c), 0, y, 0)));
    return l - 0.08;
  }
  // 곡괭이 양팔(game.js hoe 뼈대) — 마디마다 다른 색
  function pickArms(hd, segMats, tipMat) {
    [-1, 1].forEach(sx => {
      const TH = [0.14, 0.32], LEN = [0.13, 0.12];
      let px = sx * 0.042, py = 0.012;
      for (let i = 0; i < 2; i++) {
        const dx = Math.cos(TH[i]) * sx, dy = -Math.sin(TH[i]);
        const seg = M(new THREE.BoxGeometry(LEN[i], 0.048 - i * 0.012, 0.05 - i * 0.012), segMats[i], px + dx * LEN[i] / 2, py + dy * LEN[i] / 2, 0);
        seg.rotation.z = -sx * TH[i]; hd.add(seg);
        px += dx * LEN[i]; py += dy * LEN[i];
      }
      const t3 = 0.48, dx = Math.cos(t3) * sx, dy = -Math.sin(t3);
      const tip = M(new THREE.ConeGeometry(0.020, 0.085, 6), tipMat, px + dx * 0.042, py + dy * 0.042, 0);
      tip.rotation.z = -sx * (Math.PI / 2 + t3); hd.add(tip);
    });
  }
  // 낫 날(game.js sickle 뼈대 3마디) — 마디마다 다른 색. 반환: 날 그룹 + 끝 좌표
  function sickleBlade(g, top, segMats, edgeMat, wk = 1) {
    const bl = new THREE.Group(); bl.position.y = top + 0.01; bl.rotation.y = 0.10; g.add(bl);
    const TH = [0.06, 0.28, 0.60], LEN = [0.15, 0.12, 0.10], W = [0.055 * wk, 0.045 * wk, 0.030 * wk];
    let px = 0, py = 0;
    for (let i = 0; i < 3; i++) {
      const dx = Math.sin(TH[i]), dy = Math.cos(TH[i]);
      const seg = M(new THREE.BoxGeometry(W[i], LEN[i], 0.016), segMats[i], px + dx * LEN[i] / 2, py + dy * LEN[i] / 2, 0); seg.rotation.z = -TH[i]; bl.add(seg);
      const edge = M(new THREE.BoxGeometry(0.013, LEN[i] * 0.94, 0.012), edgeMat, px + dx * LEN[i] / 2 + dy * (W[i] / 2), py + dy * LEN[i] / 2 - dx * (W[i] / 2), 0); edge.rotation.z = -TH[i]; bl.add(edge);
      px += dx * LEN[i]; py += dy * LEN[i];
    }
    return { bl, tip: V(px, py, 0) };
  }
  // 낚싯대 뼈대(game.js 0단계 수치) — 끝 혹이 수정
  function rodFrame(g, pole, bob) {
    g.add(crystal(0.04, clay(RB.sky), 1.5).translateY(-0.1));
    g.add(M(new THREE.CylinderGeometry(0.026, 0.030, 0.20, 7), clay(RB.lilac), 0, -0.01, 0));
    const poleG = new THREE.Group(); poleG.position.y = 0.08; poleG.rotation.z = -0.12; g.add(poleG);
    const RL = 0.92; pole(poleG, RL);
    const lineG = new THREE.Group(); lineG.position.y = RL; lineG.rotation.z = 0.12; poleG.add(lineG);
    lineG.add(M(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 5), clay(0xfdf3ff), 0, -0.17, 0));
    const b = new THREE.Group(); b.position.y = -0.38; lineG.add(b); bob(b);
    g.scale.setScalar(1.25);
  }
  return { crystal, gem, hexBand, sector, handle, pickArms, sickleBlade, rodFrame };
}

/** ⭐ star 테마 9종 — tool-skins.js themeBuilders 가 펼쳐 넣는다 */
export function crystalThemes(THREE, K) {
  const { clay, M, ext, roundBlade, netBag } = K;
  const { crystal, gem, hexBand, sector, handle, pickArms, sickleBlade, rodFrame } = crystalKit(THREE, K);
  const faceX = (m, dir = 1) => { m.rotation.y = dir * Math.PI / 2; return m; };
  return {
    star: {
      water(g) {   // ★ 히어로 — 육각 보석 통이 무지개 네 층 · 뾰족 수정 뚜껑 · 보석 물방울
        [[0.105, 0.115, RB.sky], [0.115, 0.118, RB.mint], [0.118, 0.112, RB.lemon], [0.112, 0.098, RB.pink]].forEach(([r0, r1, c], i) => g.add(hexBand(r0, r1, 0.056, c, 0.098 + i * 0.056)));
        g.add(M(new THREE.ConeGeometry(0.1, 0.1, 6), clay(RB.lilac), 0, 0.358, 0));
        g.add(crystal(0.018, gem(), 1.6).translateY(0.42));
        const sp = M(new THREE.CylinderGeometry(0.02, 0.034, 0.25, 6), clay(RB.sky), 0.155, 0.255, 0); sp.rotation.z = -0.9; g.add(sp);
        const tip = crystal(0.03, clay(RB.pink), 1.4); tip.position.set(0.255, 0.33, 0); tip.rotation.z = -0.9; g.add(tip);
        const hd = M(new THREE.TorusGeometry(0.08, 0.016, 4, 10, Math.PI), clay(RB.lilac), -0.105, 0.21, 0); hd.rotation.z = Math.PI / 2; g.add(hd);
        [[0.3, 0.29, 0.016], [0.325, 0.23, 0.012], [0.342, 0.18, 0.009]].forEach(([x, y, r]) => g.add(crystal(r, gem(), 1.5).translateX(x).translateY(y)));
        g.scale.setScalar(1.25);
      },
      hoe(g) {     // 팔이 분홍→하늘 · 가운데 육각 레몬 수정
        const top = handle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
        pickArms(hd, [clay(RB.pink), clay(RB.sky)], clay(RB.mint));
        hd.add(M(new THREE.CylinderGeometry(0.048, 0.048, 0.07, 6), clay(RB.lemon), 0, 0, 0));
        hd.add(M(new THREE.ConeGeometry(0.048, 0.06, 6), clay(RB.lilac), 0, 0.065, 0));
        hd.add(crystal(0.016, gem(), 1.4).translateY(0.11));
        g.scale.setScalar(1.18);
      },
      axe(g) {     // 날 자체가 무지개 부채(분홍·레몬·하늘 — 바깥 띠가 날끝)
        const top = handle(g, 0.52), cy = top - 0.05, A = 0.62;
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(RB.lilac), 0, cy, 0));
        g.add(M(ext(sector(0, 0.115, -A, A), 0.05, 0.004, 10), clay(RB.pink), 0, cy, 0));
        g.add(M(ext(sector(0.112, 0.165, -A, A), 0.042, 0.004, 12), clay(RB.lemon), 0, cy, 0));
        g.add(M(ext(sector(0.162, 0.21, -A, A), 0.034, 0.004, 14), clay(RB.sky), 0, cy, 0));
        g.add(faceX(crystal(0.045, clay(RB.mint), 1.3).translateX(-0.05).translateY(cy), -1));
        g.add(crystal(0.014, gem(), 1.5).translateY(cy + 0.075));
        g.scale.setScalar(1.18);
      },
      seed(g) {    // 깎은 보석 주머니 + 무지개 리본
        const bag = M(new THREE.IcosahedronGeometry(0.118, 1), clay(RB.pink), 0, 0.085, 0); bag.scale.set(1, 1.08, 1); g.add(bag);
        g.add(M(new THREE.CylinderGeometry(0.05, 0.07, 0.05, 6), clay(RB.pink), 0, 0.2, 0));
        g.add(M(new THREE.ConeGeometry(0.058, 0.07, 6), clay(RB.lilac), 0, 0.255, 0));
        const cord = M(new THREE.TorusGeometry(0.054, 0.012, 4, 12), clay(RB.lemon), 0, 0.2, 0); cord.rotation.x = Math.PI / 2; g.add(cord);
        [-1, 1].forEach(sx => { const w = M(new THREE.ConeGeometry(0.03, 0.075, 4), clay(RB.sky), sx * 0.04, 0.2, 0.06); w.rotation.z = -sx * Math.PI / 2; g.add(w); });
        g.add(crystal(0.014, gem(), 1.4).translateY(0.3));
        g.scale.setScalar(1.25);
      },
      sickle(g) {  // 낫 날 세 마디가 무지개
        const top = handle(g, 0.30, 0.034);
        const { bl, tip } = sickleBlade(g, top, [clay(RB.pink), clay(RB.lemon), clay(RB.sky)], clay(RB.pearl), 1.25);
        const t = crystal(0.02, clay(RB.mint), 1.5); t.position.copy(tip); t.rotation.z = -0.6; bl.add(t);
        g.add(M(new THREE.CylinderGeometry(0.030, 0.036, 0.06, 6), clay(RB.lilac), 0, top - 0.01, 0));
        g.scale.setScalar(1.18);
      },
      shovel(g) {  // 둥근 날이 무지개 세 겹(하늘 테 · 레몬 · 분홍 속)
        const top = handle(g, 0.58);
        g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 6), clay(RB.lilac), 0, top + 0.01, 0));
        g.add(M(ext(roundBlade(0.117, 0.14), 0.022, 0.004, 14), clay(RB.sky), 0, top + 0.026, 0));
        g.add(M(ext(roundBlade(0.094, 0.12), 0.034, 0.004, 14), clay(RB.lemon), 0, top + 0.03, 0));
        g.add(M(ext(roundBlade(0.06, 0.1), 0.048, 0.004, 12), clay(RB.pink), 0, top + 0.034, 0));
        g.add(crystal(0.016, gem(), 1.4).translateY(top + 0.17).translateZ(0.03));
        g.scale.setScalar(1.18);
      },
      hammer(g) {  // 육각 수정 망치 — 양끝 분홍·하늘, 가운데 레몬, 끝이 뾰족
        const top = handle(g, 0.50), y = top - 0.04;
        [[-0.06, RB.pink], [0, RB.lemon], [0.06, RB.sky]].forEach(([x, c]) => { const s = M(new THREE.CylinderGeometry(0.056, 0.056, 0.06, 6), clay(c), x, y, 0); s.rotation.z = Math.PI / 2; g.add(s); });
        [-1, 1].forEach(sx => { const c = M(new THREE.ConeGeometry(0.056, 0.04, 6), clay(RB.lilac), sx * 0.11, y, 0); c.rotation.z = -sx * Math.PI / 2; g.add(c); });
        g.add(crystal(0.014, gem(), 1.4).translateY(y + 0.066));
        g.scale.setScalar(1.18);
      },
      rod(g) {
        rodFrame(g, (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.014, 0.027, L, 6), clay(RB.pearl), 0, L / 2, 0));
          [RB.pink, RB.lemon, RB.mint, RB.sky].forEach((c, i) => { const f = 0.2 + i * 0.18; p.add(M(new THREE.CylinderGeometry(0.025 - f * 0.011, 0.025 - f * 0.011, 0.02, 6), clay(c), 0, L * f, 0)); });
          p.add(crystal(0.016, gem(), 1.5).translateY(L + 0.02));
        }, b => b.add(crystal(0.04, clay(RB.pink), 1.5)));
      },
      net(g) {     // 고리가 여섯 빛 무지개
        g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 6), clay(RB.pearl), 0, 0.25, 0));
        g.add(crystal(0.04, clay(RB.sky), 1.5).translateY(-0.11));
        [RB.pink, RB.lemon, RB.mint, RB.sky, RB.lilac, RB.pink].forEach((c, i) => { const t = M(new THREE.TorusGeometry(0.17, 0.022, 5, 4, Math.PI / 3), clay(c), 0, 0.6, 0); t.rotation.set(Math.PI / 2, 0, i * Math.PI / 3); g.add(t); });
        g.add(M(new THREE.ConeGeometry(0.155, 0.3, 12, 1, true), netBag(0xf3eaff, 0.48), 0, 0.75, 0));
        g.add(crystal(0.016, gem(), 1.4).translateY(0.64).translateZ(0.17));
        g.scale.setScalar(1.25);
      },
    },
  };
}
