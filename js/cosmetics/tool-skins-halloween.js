// js/cosmetics/tool-skins-halloween.js
// =============================================================
//  calm forest · 🎃 할로윈 도구 테마 2종 — 🦇 달밤 보라(batnight) · 🌽 수확제(harvest)
//  ------------------------------------------------------------
//  ▶ 시안·확정: sims/halloween-tools-sim.html (2026-10-06, 사용자가 B·C 안 선택 — A 잭오랜턴은 기각).
//    조형 수치는 시안에서 그대로 옮겼다. 시안을 고치면 여기도 같이 고친다.
//  ▶ 규칙은 tool-skins.js 와 같다: 도구 하나 = (g) => void, 원점 = 쥐는 곳. 굽기·발광은 tool-skins.js 의 bake().
//    쥐는 자리·자루 앞 오프셋은 부르는 쪽(game.js toolMesh) 몫이라 여기서 다루지 않는다.
//  ▶ 🌙 발광은 작은 별·꼬마 호박 얼굴·물약 수면만(블룸 임계 0.85 — 넓은 면 금지).
//  ▶ THREE 를 인자로 받는다(node 테스트는 소스 검사만 — tests/halloween-tool-skins.test.mjs).
// =============================================================

// ── 팔레트 ─────────────────────────────────────────────────
export const BT = { vio: 0x7c66bd, plum: 0x4f3f88, night: 0x35295f, lilac: 0xbaa9ea, orange: 0xf59a3a, gold: 0xffd96a, pot: 0x2f2650, potion: 0x8fe06a, stem: 0x6b8f3c };
export const HV = { wood: 0x9a6b3a, woodD: 0x6e4a28, straw: 0xe9c75e, strawD: 0xc99a3c, rope: 0xd9c08a, burlap: 0xcdac72, burlapD: 0xa88650, red: 0xc9482f, blue: 0x6286c0, corn: 0xf4cf48, cornD: 0xdcae2c, husk: 0x90c04c, huskD: 0x628f38, cream: 0xf6e7b8 };

/** 시안에만 있던 조형 헬퍼 — 우산(tool-skins.js buildUmbrella)도 같이 쓴다 */
export function halloweenKit(THREE, K) {
  const { clay, M, V, ext } = K;

  // 박쥐 날개(날 모양) — 어깨 (0,.05) → 바깥 +x, 끝이 뾰족한 손가락 셋
  function batWingShape(sc = 1) {
    const P = (x, y) => [x * sc, y * sc], s = new THREE.Shape();
    s.moveTo(...P(0, 0.05));
    s.quadraticCurveTo(...P(0.10, 0.17), ...P(0.27, 0.11));
    [[0.21, 0.015], [0.245, -0.075], [0.15, -0.025], [0.165, -0.115], [0.09, -0.05], [0.075, -0.125], [0, -0.06]].forEach(p => s.lineTo(...P(...p)));
    s.closePath(); return s;
  }
  // 박쥐 실루엣(양각용) — 반쪽을 거울로
  function batSilShape(sc = 1) {
    const half = [[0, 0.028], [0.011, 0.052], [0.021, 0.03], [0.05, 0.046], [0.092, 0.062], [0.083, 0.02], [0.064, 0.012], [0.068, -0.014], [0.046, -0.006], [0.04, -0.032], [0.02, -0.009], [0, -0.03]];
    const full = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
    const s = new THREE.Shape(); full.forEach(([x, y], i) => i ? s.lineTo(x * sc, y * sc) : s.moveTo(x * sc, y * sc)); s.closePath(); return s;
  }
  // 잭오랜턴 얼굴(단위 좌표 ±0.7) — 눈 둘 + 이빨 있는 웃는 입
  function faceShapes() {
    const eye = (cx, cy, w) => { const s = new THREE.Shape(); s.moveTo(cx - w, cy - w * 0.7); s.lineTo(cx + w, cy - w * 0.7); s.lineTo(cx, cy + w * 0.9); s.closePath(); return s; };
    const mouth = new THREE.Shape();
    const top = [[-0.62, -0.10], [-0.44, -0.10], [-0.32, -0.30], [-0.17, -0.10], [0, -0.30], [0.17, -0.10], [0.32, -0.30], [0.44, -0.10], [0.62, -0.10]];
    mouth.moveTo(...top[0]); top.slice(1).forEach(p => mouth.lineTo(...p));
    for (let i = 1; i <= 8; i++) { const a = i / 8; mouth.lineTo(0.62 - 1.24 * a, -0.10 - 0.52 * Math.sin(Math.PI * a)); }
    mouth.closePath();
    return [eye(-0.38, 0.24, 0.2), eye(0.38, 0.24, 0.2), mouth];
  }
  // 호박: 결 있는 납작 구 + 꼭지 (굽기가 지오메트리를 버리므로 캐시하지 않는다)
  function pumpkinGeo(r, ribs = 6, amp = 0.09, squash = 0.82) {
    const g = new THREE.SphereGeometry(r, ribs * 4, 9), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), phi = Math.atan2(z, x);
      const f = 1 + amp * Math.cos(ribs * phi) * Math.sqrt(Math.max(0, 1 - (y / r) ** 2));
      p.setXYZ(i, x * f, y * squash, z * f);
    }
    g.computeVertexNormals(); return g;
  }
  function pumpkin(parent, r, x, y, z, o = {}) {
    const sq = o.squash ?? 0.82;
    const gr = new THREE.Group(); gr.position.set(x, y, z); parent.add(gr);
    gr.add(M(pumpkinGeo(r, o.ribs ?? 6, o.amp ?? 0.09, sq), clay(o.color ?? BT.orange, { smooth: true })));
    const st = M(new THREE.CylinderGeometry(r * 0.13, r * 0.2, r * 0.42, 5), clay(o.stem ?? BT.stem), 0, r * sq * 0.98 + r * 0.08, 0);
    st.rotation.z = o.stemTilt ?? 0.28; gr.add(st);
    return gr;
  }
  // 곡면에 새기는 얼굴 — normal 쪽을 보게 놓는다. 면 안쪽으로 반쯤 묻어 가장자리에서 뜨지 않게
  function carved(parent, mat, pos, s, normal, depth = 0.16) {
    const gr = new THREE.Group(); gr.position.copy(pos); gr.quaternion.setFromUnitVectors(V(0, 0, 1), normal.clone().normalize()); gr.scale.setScalar(s); parent.add(gr);
    faceShapes().forEach(sh => gr.add(M(ext(sh, depth, 0, 2), mat)));
    return gr;
  }
  // 자루 — kit 의 handle 과 같은 조형에 끝 혹만 knobFn(호박·짚 다발)으로. 반환: 꼭대기 y
  function handleWith(g, P, l, r = 0.030) {
    g.add(M(new THREE.CylinderGeometry(r * 0.8, r, l, 7), clay(P.wood), 0, l / 2 - 0.08, 0));
    g.add(M(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.07, 7), clay(P.grip), 0, -0.02, 0));
    P.knobFn(g, r);
    return l - 0.08;
  }
  function leafCollar(g, y, color, r0 = 0.032) {   // 목을 받친 잎 5장(kit 의 calyx 에 색만 바꾼 것)
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5, s = M(new THREE.ConeGeometry(0.022, 0.075, 4), clay(color), Math.cos(a) * r0, y, Math.sin(a) * r0);
      s.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55); g.add(s);
    }
  }
  // 낚싯대 뼈대(kit 의 rodFrame 과 같은 수치) — 끝 혹만 knobFn 으로
  function rodFrameWith(g, { knobFn, rear, pole, line = 0xe8e4d8 }, bob) {
    knobFn(g);
    g.add(M(new THREE.CylinderGeometry(0.026, 0.030, 0.20, 7), rear, 0, -0.01, 0));
    const poleG = new THREE.Group(); poleG.position.y = 0.08; poleG.rotation.z = -0.12; g.add(poleG);
    const RL = 0.92; pole(poleG, RL);
    const lineG = new THREE.Group(); lineG.position.y = RL; lineG.rotation.z = 0.12; poleG.add(lineG);
    lineG.add(M(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 5), clay(line), 0, -0.17, 0));
    const b = new THREE.Group(); b.position.y = -0.38; lineG.add(b); bob(b);
    g.scale.setScalar(1.25);
  }
  // 🌽 새끼줄 고리 n 줄
  function twine(g, y, r, n = 1, gap = 0.022, col = HV.rope) {
    for (let i = 0; i < n; i++) { const t = M(new THREE.TorusGeometry(r, 0.0065, 4, 10), clay(col), 0, y + i * gap, 0); t.rotation.x = Math.PI / 2; g.add(t); }
  }
  // 짚 다발 — 끝을 묶고 아래로 풀어진다
  function strawKnob(g, r) {
    g.add(M(new THREE.CylinderGeometry(r * 1.55, r * 0.95, 0.055, 7), clay(HV.straw), 0, -0.075, 0));
    const t = M(new THREE.TorusGeometry(r * 1.2, 0.007, 4, 8), clay(HV.rope), 0, -0.07, 0); t.rotation.x = Math.PI / 2; g.add(t);
    [0, 2.1, 4.2].forEach((a, i) => { const s = M(new THREE.ConeGeometry(0.011, 0.07, 4), clay(i ? HV.strawD : HV.straw), Math.cos(a) * r * 0.9, -0.125, Math.sin(a) * r * 0.9); s.rotation.set(Math.PI + Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(s); });
  }
  // 기움천 — 작은 네모 + x 박음질
  function patch(parent, x, y, z, w, col, sz = 1, rz = 0) {
    const gr = new THREE.Group(); gr.position.set(x, y, z); gr.rotation.z = rz; parent.add(gr);
    gr.add(M(new THREE.BoxGeometry(w, w, 0.008), clay(col), 0, 0, sz * 0.004));
    [0.7, -0.7].forEach(a => { const s = M(new THREE.BoxGeometry(w * 1.1, 0.005, 0.004), clay(HV.woodD), 0, 0, sz * 0.009); s.rotation.z = a; gr.add(s); });
    return gr;
  }
  // 옥수수 — 낟알 요철은 정점을 체크무늬로 밀고 당겨서
  function cobGeo(len, r0, r1) {
    const g = new THREE.CylinderGeometry(r1, r0, len, 8, 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), row = Math.round((y / len + 0.5) * 6), col = Math.round(Math.atan2(z, x) / (Math.PI / 4));
      const k = ((row + col) & 1) ? 1.09 : 0.95; p.setXYZ(i, x * k, y, z * k);
    }
    g.computeVertexNormals(); return g;
  }
  function cob(parent, x, y, z, len = 0.15, r0 = 0.05, r1 = 0.034, huskN = 3) {   // +y 가 끝(뾰족한 쪽)
    const gr = new THREE.Group(); gr.position.set(x, y, z); parent.add(gr);
    gr.add(M(cobGeo(len, r0, r1), clay(HV.corn)));
    gr.add(M(new THREE.SphereGeometry(r1, 8, 5), clay(HV.cornD), 0, len / 2, 0));
    for (let i = 0; i < huskN; i++) {
      const a = i * Math.PI * 2 / huskN + 0.4, l = M(new THREE.ConeGeometry(r0 * 0.62, len * 0.7, 4), clay(i % 2 ? HV.husk : HV.huskD), Math.cos(a) * r0 * 0.78, -len * 0.28, Math.sin(a) * r0 * 0.78);
      l.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); gr.add(l);
    }
    return gr;
  }
  function strawHat(parent, x, y, z, s = 1) {   // 허수아비 모자
    const gr = new THREE.Group(); gr.position.set(x, y, z); gr.scale.setScalar(s); parent.add(gr);
    gr.add(M(new THREE.CylinderGeometry(0.085, 0.09, 0.012, 12), clay(HV.straw)));
    gr.add(M(new THREE.CylinderGeometry(0.04, 0.05, 0.05, 10), clay(HV.straw), 0, 0.03, 0));
    gr.add(M(new THREE.CylinderGeometry(0.052, 0.052, 0.016, 10), clay(HV.red), 0, 0.016, 0));
    return gr;
  }
  return { batWingShape, batSilShape, pumpkin, carved, handleWith, leafCollar, rodFrameWith, twine, strawKnob, patch, cob, strawHat };
}

// ── 테마별 도구 조형 (원점 = 쥐는 곳 · tool-skins.js themeBuilders 에 펼쳐 넣는다) ─────────────
export function halloweenThemes(THREE, K) {
  const { clay, M, V, starShape, petalShape, crescentShape, roundBlade, ext, pickArms, sickleBlade, netBag } = K;
  const { batWingShape, batSilShape, pumpkin, carved, handleWith, leafCollar, rodFrameWith, twine, strawKnob, patch, cob, strawHat } = halloweenKit(THREE, K);

  const batHandle = (g, l, r = 0.03) => handleWith(g, { wood: BT.plum, grip: BT.night,
    knobFn: (h, rr) => pumpkin(h, rr * 1.3, 0, -0.08, 0, { stemTilt: 0.5 }) }, l, r);
  const starGlow = () => clay(BT.gold, { glow: BT.gold, k: 0.9 });
  const star = (r, depth, bev) => ext(starShape(r), depth, bev);

  const hvHandle = (g, l, r = 0.03) => {
    const top = handleWith(g, { wood: HV.wood, grip: HV.woodD, knobFn: strawKnob }, l, r);
    twine(g, 0.2, r * 0.95, 2, 0.026); twine(g, l - 0.15, r * 0.78, 1);   // ⚠️ 0.2 아래는 팔뚝과 겹친다(쥐는 점 바로 위)
    return top;
  };

  return {
    // 🦇 B 달밤 보라 — 박쥐 날개 날 · 가마솥 · 끝마다 꼬마 호박 하나
    batnight: {
      axe(g) {   // 날이 박쥐 날개 — 어깨가 자루에, 끝 뾰족한 손가락 셋
        const top = batHandle(g, 0.52), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(BT.night), 0, cy, 0));
        g.add(M(ext(batWingShape(1.12), 0.04, 0.008, 10), clay(BT.vio, { smooth: true }), 0.025, cy, 0));
        [-1, 1].forEach(sz => g.add(M(star(0.024, 0.008, 0.003), starGlow(), 0.1, cy + 0.02, sz * 0.025)));
        pumpkin(g, 0.03, 0.0, cy + 0.085, 0.0);
        g.scale.setScalar(1.18);
      },
      hoe(g) {   // 박쥐 한 마리 — 가운데 몸은 꼬마 잭오랜턴, 양팔이 처진 날개
        const top = batHandle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
        hd.add(M(new THREE.BoxGeometry(0.06, 0.07, 0.06), clay(BT.night)));
        [-1, 1].forEach(sx => {
          const pv = new THREE.Group(); pv.position.set(sx * 0.03, 0.0, 0); pv.rotation.y = sx > 0 ? 0 : Math.PI; hd.add(pv);
          const w = M(ext(batWingShape(0.92), 0.034, 0.007, 10), clay(BT.vio, { smooth: true })); w.rotation.z = -0.62; pv.add(w);
        });
        pumpkin(hd, 0.058, 0, 0.0, 0.0, { stemTilt: 0.2 });
        carved(hd, clay(BT.night, { glow: BT.gold, k: 0.9 }), V(0, 0.0, 0.052), 0.034, V(0, 0, 1), 0.2);
        [-1, 1].forEach(sx => { const e = M(new THREE.ConeGeometry(0.014, 0.04, 4), clay(BT.night), sx * 0.03, 0.075, 0); e.rotation.z = -sx * 0.25; hd.add(e); });
        g.scale.setScalar(1.18);
      },
      seed(g) {   // 보라 주머니 + 주황 끈 + 박쥐 양각
        const bag = M(new THREE.SphereGeometry(0.115, 10, 8), clay(BT.vio, { smooth: true }), 0, 0.08, 0); bag.scale.set(1, 1.12, 1); g.add(bag);
        g.add(M(new THREE.CylinderGeometry(0.05, 0.07, 0.06, 8), clay(BT.vio), 0, 0.2, 0));
        const cord = M(new THREE.TorusGeometry(0.058, 0.012, 5, 14), clay(BT.orange), 0, 0.2, 0); cord.rotation.x = Math.PI / 2; g.add(cord);
        g.add(M(new THREE.ConeGeometry(0.06, 0.05, 8, 1, true), clay(BT.vio, { side: THREE.DoubleSide }), 0, 0.245, 0));
        g.add(M(ext(batSilShape(0.75), 0.008, 0.003, 4), clay(BT.night), 0, 0.09, 0.112));
        g.add(M(star(0.016, 0.006, 0.002), starGlow(), 0.04, 0.14, 0.106));
        g.scale.setScalar(1.25);
      },
      water(g) {   // 마녀 가마솥 물조리개 — 초록 물약이 보글보글
        const prof = [[0.001, 0], [0.058, 0.002], [0.095, 0.035], [0.118, 0.105], [0.108, 0.165], [0.088, 0.2]].map(([r, y]) => new THREE.Vector2(r, y));
        g.add(M(new THREE.LatheGeometry(prof, 12), clay(BT.pot, { smooth: true }), 0, 0.08, 0));
        const rim = M(new THREE.TorusGeometry(0.09, 0.013, 5, 14), clay(BT.lilac), 0, 0.282, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
        const potion = M(new THREE.CircleGeometry(0.088, 12), clay(BT.potion, { glow: BT.potion, k: 0.6, side: THREE.DoubleSide }), 0, 0.272, 0); potion.rotation.x = -Math.PI / 2; g.add(potion);
        [[0.04, 0.3, 0.03, 0.02], [-0.05, 0.31, -0.02, 0.016], [0.0, 0.33, -0.05, 0.012]].forEach(([x, y, z, r]) => g.add(M(new THREE.SphereGeometry(r, 6, 5), clay(BT.potion, { glow: BT.potion, k: 0.6 }), x, y, z)));
        [0, 2.1, 4.2].forEach(a => { const l = M(new THREE.ConeGeometry(0.022, 0.06, 4), clay(BT.pot), Math.cos(a) * 0.066, 0.075, Math.sin(a) * 0.066); l.rotation.x = Math.PI; g.add(l); });
        const arch = M(new THREE.TorusGeometry(0.092, 0.01, 4, 14, Math.PI), clay(BT.lilac), 0, 0.28, 0); arch.rotation.y = Math.PI / 2; g.add(arch);
        const band = M(new THREE.TorusGeometry(0.11, 0.011, 4, 14), clay(BT.orange), 0, 0.2, 0); band.rotation.x = Math.PI / 2; g.add(band);
        const sp = M(new THREE.CylinderGeometry(0.02, 0.036, 0.22, 6), clay(BT.vio), 0.15, 0.27, 0); sp.rotation.z = -0.9; g.add(sp);
        g.add(M(star(0.04, 0.014, 0.004), starGlow(), 0.245, 0.35, 0));
        g.scale.setScalar(1.25);
      },
      sickle(g) {   // 가는 초승달 + 별 하나
        const top = batHandle(g, 0.30, 0.034);
        const R = 0.21, cx = -0.05, deg = 70, a0 = deg * Math.PI / 180;
        g.add(M(ext(crescentShape(R, cx, deg), 0.02, 0.006, 20), clay(BT.lilac, { smooth: true }), -R * Math.cos(a0), top + R * Math.sin(a0), 0));
        g.add(M(new THREE.CylinderGeometry(0.030, 0.036, 0.06, 7), clay(BT.night), 0, top - 0.01, 0));
        g.add(M(star(0.026, 0.01, 0.004), starGlow(), 0, top - 0.01, 0.036));
        g.scale.setScalar(1.18);
      },
      shovel(g) {   // 보랏빛 둥근 날에 박쥐 한 마리 양각
        const top = batHandle(g, 0.58);
        g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 7), clay(BT.night), 0, top + 0.01, 0));
        g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.012, 14), clay(BT.vio, { smooth: true }), 0, top + 0.03, 0));
        [-1, 1].forEach(sz => {
          g.add(M(ext(batSilShape(1.0), 0.008, 0.003, 4), clay(BT.night), 0, top + 0.03 + 0.12, sz * 0.0335));
          g.add(M(star(0.018, 0.006, 0.002), starGlow(), 0.06, top + 0.03 + 0.062, sz * 0.0335));
          g.add(M(star(0.013, 0.006, 0.002), starGlow(), -0.055, top + 0.03 + 0.07, sz * 0.0335));
        });
        pumpkin(g, 0.03, 0.06, top - 0.005, 0.0);
        g.scale.setScalar(1.18);
      },
      hammer(g) {   // 보라 북통 + 주황 띠 + 금별
        const top = batHandle(g, 0.50);
        const head = M(new THREE.CylinderGeometry(0.056, 0.056, 0.2, 10), clay(BT.vio), 0, top - 0.04, 0); head.rotation.z = Math.PI / 2; g.add(head);
        [-1, 1].forEach(sx => { const c = M(new THREE.CylinderGeometry(0.064, 0.06, 0.036, 10), clay(BT.lilac), sx * 0.105, top - 0.04, 0); c.rotation.z = Math.PI / 2; g.add(c); });
        const band = M(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), clay(BT.orange), 0, top - 0.04, 0); band.rotation.z = Math.PI / 2; g.add(band);
        [-0.055, 0.055].forEach(x => g.add(M(star(0.018, 0.008, 0.003), starGlow(), x, top - 0.04, 0.058)));
        g.scale.setScalar(1.18);
      },
      rod(g) {   // 보라 장대 + 라일락 마디 + 끝별 · 찌는 꼬마 호박
        rodFrameWith(g, { knobFn: h => pumpkin(h, 0.05, 0, -0.095, 0, { stemTilt: 0.5 }), rear: clay(BT.night), line: 0xd9dcf0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.016, 0.027, L, 6), clay(BT.plum), 0, L / 2, 0));
          [0.2, 0.42, 0.64].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.012, 0.026 - f * 0.012, 0.016, 6), clay(BT.lilac), 0, L * f, 0)));
          p.add(M(star(0.035, 0.012, 0.004), starGlow(), 0, L + 0.01, 0));
        } }, b => pumpkin(b, 0.05, 0, 0, 0, { squash: 0.9, stemTilt: 0.2 }));
      },
      net(g) {
        g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(BT.plum), 0, 0.25, 0));
        g.add(M(new THREE.SphereGeometry(0.036, 6, 5), clay(BT.night), 0, -0.1, 0));
        const ring = M(new THREE.TorusGeometry(0.17, 0.02, 6, 16), clay(BT.vio), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
        [[0.6, 0.03], [2.4, 0.022], [4.1, 0.026]].forEach(([a, r]) => g.add(M(star(r, 0.01, 0.004), starGlow(), Math.cos(a) * 0.17, 0.6, Math.sin(a) * 0.17)));
        pumpkin(g, 0.04, -0.17, 0.62, 0);
        g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(0xc9bff0, 0.45), 0, 0.74, 0));
        g.scale.setScalar(1.25);
      },
    },

    // 🌽 C 수확제 — 짚·옥수수·허수아비 기움천 · 새끼줄
    harvest: {
      axe(g) {   // 수염 도끼 — 짚빛 날 + 빨간 끈 + 기움천, 등에서 짚이 삐죽
        const top = hvHandle(g, 0.52), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(HV.woodD), 0, cy, 0));
        const sh = new THREE.Shape(); sh.moveTo(0, -0.075); sh.lineTo(0.1, -0.115); sh.quadraticCurveTo(0.215, 0, 0.1, 0.115); sh.lineTo(0, 0.075); sh.closePath();
        g.add(M(ext(sh, 0.044, 0.01, 10), clay(HV.straw), 0.03, cy, 0));
        const edge = new THREE.Shape(); edge.moveTo(0.19, -0.075); edge.quadraticCurveTo(0.255, 0, 0.19, 0.075); edge.lineTo(0.17, 0.05); edge.quadraticCurveTo(0.2, 0, 0.17, -0.05); edge.closePath();
        g.add(M(ext(edge, 0.03, 0.005, 6), clay(HV.cream), 0.03, cy, 0));
        [-1, 1].forEach(sz => patch(g, 0.095, cy - 0.01, sz * 0.054, 0.052, sz > 0 ? HV.red : HV.blue, sz, 0.12));
        g.add(M(new THREE.BoxGeometry(0.014, 0.15, 0.085), clay(HV.red), 0.02, cy, 0));
        [0.3, -0.2].forEach((a, i) => { const s = M(new THREE.ConeGeometry(0.012, 0.09, 4), clay(i ? HV.strawD : HV.straw), -0.065, cy + (i ? -0.02 : 0.025), 0.01 * (i ? -1 : 1)); s.rotation.z = Math.PI / 2 + a; g.add(s); });
        g.scale.setScalar(1.18);
      },
      hoe(g) {   // 옥수수 곡괭이 — 양팔이 옥수수 색, 가운데엔 허수아비 모자
        const top = hvHandle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
        hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(HV.woodD)));
        pickArms(hd, clay(HV.corn), clay(HV.husk));
        strawHat(hd, 0, 0.042, 0, 0.95);
        g.scale.setScalar(1.18);
      },
      seed(g) {   // 삼베 자루 — 새끼줄 목 · 기움천 · 터진 짚
        const bag = M(new THREE.SphereGeometry(0.115, 10, 8), clay(HV.burlap, { smooth: true }), 0, 0.08, 0); bag.scale.set(1, 1.12, 1); g.add(bag);
        g.add(M(new THREE.CylinderGeometry(0.05, 0.07, 0.06, 8), clay(HV.burlap), 0, 0.2, 0));
        twine(g, 0.2, 0.058, 2, 0.014);
        g.add(M(new THREE.ConeGeometry(0.06, 0.06, 8, 1, true), clay(HV.burlapD, { side: THREE.DoubleSide }), 0, 0.255, 0));
        patch(g, -0.035, 0.07, 0.106, 0.06, HV.red, 1, 0.15); patch(g, 0.05, 0.13, 0.095, 0.04, HV.blue, 1, -0.2);
        [0, 1, 2].forEach(i => { const k = M(new THREE.SphereGeometry(0.013, 6, 4), clay(HV.corn), -0.03 + i * 0.03, 0.29, 0.0); k.scale.set(1, 1.2, 0.8); g.add(k); });
        g.scale.setScalar(1.25);
      },
      water(g) {   // 새끼줄 두른 양동이 — 짚 테두리 · 기움천 · 줄 손잡이
        g.add(M(new THREE.CylinderGeometry(0.098, 0.088, 0.2, 10), clay(HV.burlap), 0, 0.18, 0));
        twine(g, 0.12, 0.094, 2, 0.04); twine(g, 0.25, 0.098, 1);
        const rim = M(new THREE.TorusGeometry(0.098, 0.011, 5, 14), clay(HV.straw), 0, 0.282, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
        patch(g, 0, 0.19, 0.093, 0.07, HV.red, 1, 0.1);
        const bail = M(new THREE.TorusGeometry(0.098, 0.008, 4, 14, Math.PI), clay(HV.rope), 0, 0.28, 0); bail.rotation.y = Math.PI / 2; g.add(bail);
        const sp = M(new THREE.CylinderGeometry(0.02, 0.036, 0.22, 6), clay(HV.husk), 0.15, 0.26, 0); sp.rotation.z = -0.9; g.add(sp);
        g.scale.setScalar(1.25);
      },
      sickle(g) {   // 무쇠빛 낫 + 크림 날 · 목에 옥수수잎 깃
        const top = hvHandle(g, 0.30, 0.034);
        sickleBlade(g, top, clay(0x9a8460), clay(HV.cream), 1.2);
        leafCollar(g, top - 0.01, HV.husk, 0.034);
        g.scale.setScalar(1.18);
      },
      shovel(g) {   // 짚빛 둥근 날 + 큰 기움천 + 목에 옥수수잎 깃
        const top = hvHandle(g, 0.58);
        g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 7), clay(HV.woodD), 0, top + 0.01, 0));
        leafCollar(g, top + 0.03, HV.husk, 0.034);
        g.add(M(ext(roundBlade(0.105, 0.13), 0.034, 0.012, 14), clay(HV.straw, { smooth: true }), 0, top + 0.03, 0));
        [-1, 1].forEach(sz => {
          patch(g, 0.0, top + 0.03 + 0.1, sz * 0.0485, 0.085, sz > 0 ? HV.red : HV.blue, sz, 0.12);
          [-0.075, 0.075].forEach(x => g.add(M(new THREE.BoxGeometry(0.005, 0.1, 0.004), clay(HV.strawD), x, top + 0.03 + 0.07, sz * 0.0465)));
        });
        g.scale.setScalar(1.18);
      },
      hammer(g) {   // 옥수수 방망이 — 양끝이 옥수수
        const top = hvHandle(g, 0.50);
        const head = M(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), clay(HV.woodD), 0, top - 0.04, 0); head.rotation.z = Math.PI / 2; g.add(head);
        [-1, 1].forEach(sx => { const c = cob(g, sx * 0.1, top - 0.04, 0, 0.15, 0.052, 0.036, 3); c.rotation.z = -sx * Math.PI / 2; });
        g.scale.setScalar(1.18);
      },
      rod(g) {   // 옥수숫대 장대 — 마디마다 잎, 끝에 수염, 찌는 작은 옥수수
        rodFrameWith(g, { knobFn: h => strawKnob(h, 0.03), rear: clay(HV.woodD), line: 0xece2c8, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.014, 0.026, L, 6), clay(HV.husk), 0, L / 2, 0));
          [0.2, 0.42, 0.64, 0.84].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.012, 0.026 - f * 0.012, 0.016, 6), clay(HV.huskD), 0, L * f, 0)));
          [[0.3, 0.5, 1.1], [0.55, 3.7, 1.2]].forEach(([f, ry, rz]) => { const lf = M(ext(petalShape(0.026, 0.14), 0.006, 0.003), clay(HV.husk), 0, L * f, 0); lf.rotation.set(0, ry, -rz); p.add(lf); });
          [0, 2.1, 4.2].forEach(a => { const s = M(new THREE.ConeGeometry(0.006, 0.07, 4), clay(HV.strawD), Math.cos(a) * 0.012, L + 0.03, Math.sin(a) * 0.012); s.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); p.add(s); });
        } }, b => cob(b, 0, 0, 0, 0.1, 0.034, 0.024, 3));
      },
      net(g) {   // 짚 테 + 새끼줄 매듭 + 빨간 리본
        g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(HV.wood), 0, 0.25, 0));
        strawKnob(g, 0.03); twine(g, 0.2, 0.027, 2, 0.026);
        const ring = M(new THREE.TorusGeometry(0.17, 0.022, 6, 16), clay(HV.straw), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
        [0.4, 1.6, 2.8, 4.1, 5.3].forEach(a => { const t = M(new THREE.BoxGeometry(0.014, 0.05, 0.05), clay(HV.rope), Math.cos(a) * 0.17, 0.6, Math.sin(a) * 0.17); t.rotation.y = -a; g.add(t); });
        const bow = new THREE.Group(); bow.position.set(0, 0.62, 0.17); g.add(bow);
        [-1, 1].forEach(sx => { const w = M(new THREE.ConeGeometry(0.03, 0.08, 4), clay(HV.red), sx * 0.04, 0, 0); w.rotation.z = -sx * Math.PI / 2; bow.add(w); });
        bow.add(M(new THREE.BoxGeometry(0.03, 0.03, 0.03), clay(HV.red)));
        g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(0xf3e3b8, 0.5), 0, 0.74, 0));
        g.scale.setScalar(1.25);
      },
    },
  };
}
