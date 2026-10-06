// js/cosmetics/tool-skins.js
// =============================================================
//  calm forest · 🪓☂️ 프리미엄 도구 테마 세트 조형 — 도구 9종 × 5테마(🎃 할로윈 2종 포함) + 비 오는 날 우산
//  ------------------------------------------------------------
//  ▶ 시안·확정: sims/premium-tool-umbrella-sim.html (2026-10-02). 조형 수치는 시안에서 그대로 옮겼다.
//    시안을 고치면 여기도 같이 고친다(tool-tier-sim 에서 0단계 값이 갈려 역이식된 사고가 있었다).
//  ▶ 테마는 부속을 꽂지 않고 **날·통 자체의 형태**가 된다: 버섯=반쪽 갓 · 달밤=초승달 · 꽃=꽃잎.
//    단 도구 실루엣(곡괭이 양팔·삽의 둥근 날)은 지킨다 — 넓은 갓 괭이는 '막대에 꽂은 버섯', 꽃잎 삽은
//    '꽃봉오리'로 읽혀 기각됐다.
//  ▶ ⚡ 조형은 메시 수십 개 → bake() 가 재질 종류별로 정점색 메시 몇 개로 굽는다(도구 1개 ≤ 5콜).
//  ▶ 🌙 발광: 굽힌 재질 userData.glowK — setToolSkinNight(root, nightLevel) 로 밤에만 켠다.
//    블룸 임계 0.85 — 발광은 작은 별·테두리만(넓은 면 금지).
//  ▶ THREE 를 인자로 받는다(node 테스트는 three 를 못 불러 소스 검사만 한다 — tests/tool-skins.test.mjs).
// =============================================================
import { mergeGeos } from './trail.js';
import { halloweenThemes, halloweenKit, BT, HV } from './tool-skins-halloween.js';   // 🎃 달밤 보라 · 수확제

// ── 팔레트 ─────────────────────────────────────────────────
const SH = { stem: 0xeee2c8, stemD: 0xcdb894, cap: 0xd1473a, spot: 0xfff5e6, gill: 0xe6cfa6, birch: 0x5b4636, door: 0x8a5a3a };
const MN = { navy: 0x343a6e, navyD: 0x252a52, silver: 0xc2c7e4, gold: 0xf0cf63, lilac: 0x7b84c8 };
const BL = { stem: 0x79a85a, vine: 0x4e7d3b, leaf: 0x8fc46c, pink: 0xf09bb0, pinkL: 0xf6c6d2, center: 0xf2c64b };

// 조형 중에만 쓰는 도구 상자 — 굽기 전 임시 메시를 만든다
function kit(THREE) {
  const clay = (color, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: !o.smooth, side: o.side ?? THREE.FrontSide });
    if (o.glow) m.userData.glow = { hex: o.glow, k: o.k ?? 0.8 };
    if (o.lift) m.userData.lift = o.lift;
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; }
    return m;
  };
  const M = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function starShape(r, k = 0.46, n = 5) {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) {
      const a = Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * k : r;
      i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    s.closePath(); return s;
  }
  function petalShape(w, h) {   // 밑동(0,0) → 끝(0,h)
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.bezierCurveTo(w * 1.1, h * 0.22, w * 0.95, h * 0.8, 0, h); s.bezierCurveTo(-w * 0.95, h * 0.8, -w * 1.1, h * 0.22, 0, 0);
    return s;
  }
  function crescentShape(R = 0.13, cx = -0.08, deg = 84) {   // 볼록면 +x, 뿔은 -x 쪽
    const s = new THREE.Shape(), a0 = deg * Math.PI / 180;
    const ex = R * Math.cos(a0), ey = R * Math.sin(a0);
    const r2 = Math.hypot(ex - cx, ey), ti = Math.atan2(ey, ex - cx);
    for (let i = 0; i <= 16; i++) { const a = -a0 + 2 * a0 * i / 16; i ? s.lineTo(R * Math.cos(a), R * Math.sin(a)) : s.moveTo(R * Math.cos(a), R * Math.sin(a)); }
    for (let i = 0; i <= 16; i++) { const a = ti - 2 * ti * i / 16; s.lineTo(cx + r2 * Math.cos(a), r2 * Math.sin(a)); }
    s.closePath(); return s;
  }
  function crescentMid(R, cx, deg) {   // 초승달 가운데 두께의 중심 — 소켓에 걸칠 자리
    const a0 = deg * Math.PI / 180, ex = R * Math.cos(a0), ey = R * Math.sin(a0);
    return (R + cx + Math.hypot(ex - cx, ey)) / 2;
  }
  function roundBlade(bw, bh) {   // game.js 삽날과 같은 윤곽
    const sh = new THREE.Shape();
    sh.moveTo(-bw, 0); sh.lineTo(-bw, bh); sh.absarc(0, bh, bw, Math.PI, 0, true); sh.lineTo(bw, 0); sh.closePath();
    return sh;
  }
  const ext = (shape, depth, bev = 0.01, seg = 12) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: seg });
    g.translate(0, 0, -depth / 2); return g;
  };
  // 면에 붙는 납작한 점(버섯 흰 점)
  function dot(parent, mat, x, y, z, r, normal = V(0, 0, 1)) {
    const d = M(new THREE.SphereGeometry(r, 10, 6), mat, x, y, z);
    d.quaternion.setFromUnitVectors(V(0, 0, 1), normal.clone().normalize());
    d.scale.set(1, 1, 0.32); parent.add(d); return d;
  }
  function capDots(parent, cy, r, sc, list) {   // 타원 갓 위의 흰 점
    list.forEach(([th, ph, rr]) => {
      const x = Math.sin(th) * Math.cos(ph) * r * sc[0], y = Math.cos(th) * r * sc[1], z = Math.sin(th) * Math.sin(ph) * r * sc[2];
      dot(parent, clay(SH.spot), x, cy + y, z, rr, V(x / sc[0] ** 2, y / sc[1] ** 2, z / sc[2] ** 2));
    });
  }
  // 자루: 테이퍼 + 그립 밴드 + 끝 혹 (game.js handle 과 같은 조형). 반환: 꼭대기 y
  function handle(g, P, l, r = 0.030) {
    g.add(M(new THREE.CylinderGeometry(r * 0.8, r, l, 7), clay(P.wood), 0, l / 2 - 0.08, 0));
    g.add(M(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.07, 7), clay(P.grip), 0, -0.02, 0));
    g.add(M(new THREE.SphereGeometry(r * 1.35, 7, 6), P.knobMat ?? clay(P.knob ?? P.grip), 0, -0.08, 0));
    return l - 0.08;
  }
  // 꽃 자루 — 덩굴이 감아 오르고 잎 두 장
  function vineHandle(g, l, r = 0.031) {
    const top = handle(g, { wood: BL.stem, grip: BL.vine, knob: BL.pink }, l, r);
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 2 * 2.2; pts.push(V(Math.cos(a) * r * 1.02, 0.02 + t * l * 0.62, Math.sin(a) * r * 1.02)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.0075, 5), clay(BL.vine)));
    [[0.22, 0.6], [0.40, -2.3]].forEach(([f, ay]) => {
      const lf = new THREE.Mesh(ext(petalShape(0.026, 0.075), 0.006, 0.003), clay(BL.leaf));
      lf.position.set(0, l * f, 0); lf.rotation.set(0, ay, -1.0); lf.translateY(0.02); g.add(lf);
    });
    return top;
  }
  function flower(parent, x, y, z, r, petalMat = clay(BL.pink)) {
    const f = new THREE.Group(); f.position.set(x, y, z); parent.add(f);
    const geo = ext(petalShape(r * 0.42, r), 0.008, 0.004);
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(geo, petalMat); p.rotation.z = i * Math.PI * 2 / 5; f.add(p); }
    f.add(M(new THREE.SphereGeometry(r * 0.3, 8, 6), clay(BL.center), 0, 0, 0.01));
    return f;
  }
  function calyx(g, y) {   // 목을 받친 꽃받침 5장
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5, s = M(new THREE.ConeGeometry(0.022, 0.075, 4), clay(BL.leaf), Math.cos(a) * 0.032, y, Math.sin(a) * 0.032);
      s.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55); g.add(s);
    }
  }
  // 낚싯대 뼈대(0단계 game.js 수치) — 장대·찌만 테마별로 갈아 끼운다
  function rodFrame(g, { knob, rear, pole, line = 0xe8e4d8 }, bob) {
    g.add(M(new THREE.SphereGeometry(0.040, 7, 6), knob, 0, -0.09, 0));
    g.add(M(new THREE.CylinderGeometry(0.026, 0.030, 0.20, 7), rear, 0, -0.01, 0));
    const poleG = new THREE.Group(); poleG.position.y = 0.08; poleG.rotation.z = -0.12; g.add(poleG);
    const RL = 0.92;
    pole(poleG, RL);
    const lineG = new THREE.Group(); lineG.position.y = RL; lineG.rotation.z = 0.12; poleG.add(lineG);
    lineG.add(M(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 5), clay(line), 0, -0.17, 0));
    const b = new THREE.Group(); b.position.y = -0.38; lineG.add(b); bob(b);
    g.scale.setScalar(1.25);
  }
  // 곡괭이 양팔(소켓에서 대칭으로 뻗어 처지며 뾰족) — game.js hoe 와 같은 뼈대
  function pickArms(hd, segMat, tipMat) {
    [-1, 1].forEach(sx => {
      const TH = [0.14, 0.32], LEN = [0.13, 0.12];
      let px = sx * 0.042, py = 0.012;
      for (let i = 0; i < 2; i++) {
        const dx = Math.cos(TH[i]) * sx, dy = -Math.sin(TH[i]);
        const seg = M(new THREE.BoxGeometry(LEN[i], 0.048 - i * 0.012, 0.05 - i * 0.012), segMat, px + dx * LEN[i] / 2, py + dy * LEN[i] / 2, 0);
        seg.rotation.z = -sx * TH[i]; hd.add(seg);
        px += dx * LEN[i]; py += dy * LEN[i];
      }
      const t3 = 0.48, dx = Math.cos(t3) * sx, dy = -Math.sin(t3);
      const tip = M(new THREE.ConeGeometry(0.020, 0.085, 6), tipMat, px + dx * 0.042, py + dy * 0.042, 0);
      tip.rotation.z = -sx * (Math.PI / 2 + t3); hd.add(tip);
    });
  }
  // 낫 날(조금씩 더 휘는 3마디) — game.js sickle 과 같은 뼈대
  function sickleBlade(g, top, segMat, edgeMat, wk = 1, deco) {
    const bl = new THREE.Group(); bl.position.y = top + 0.01; bl.rotation.y = 0.10; g.add(bl);
    const TH = [0.06, 0.28, 0.60], LEN = [0.15, 0.12, 0.10], W = [0.055 * wk, 0.045 * wk, 0.030 * wk];
    let px = 0, py = 0;
    for (let i = 0; i < 3; i++) {
      const dx = Math.sin(TH[i]), dy = Math.cos(TH[i]);
      const seg = M(new THREE.BoxGeometry(W[i], LEN[i], 0.016), segMat, px + dx * LEN[i] / 2, py + dy * LEN[i] / 2, 0); seg.rotation.z = -TH[i]; bl.add(seg);
      const edge = M(new THREE.BoxGeometry(0.013, LEN[i] * 0.94, 0.012), edgeMat, px + dx * LEN[i] / 2 + dy * (W[i] / 2), py + dy * LEN[i] / 2 - dx * (W[i] / 2), 0); edge.rotation.z = -TH[i]; bl.add(edge);
      deco?.(bl, i, px + dx * LEN[i] / 2, py + dy * LEN[i] / 2);
      px += dx * LEN[i]; py += dy * LEN[i];
    }
  }
  const netBag = (color, opacity) => clay(color, { smooth: true, side: THREE.DoubleSide, opacity });
  return { clay, M, V, starShape, petalShape, crescentShape, crescentMid, roundBlade, ext, dot, capDots, handle, vineHandle,
    flower, calyx, rodFrame, pickArms, sickleBlade, netBag };
}

// ── 테마별 도구 조형 (원점 = 쥐는 곳, game.js toolMesh 와 같은 좌표) ─────────────
function themeBuilders(THREE, K) {
  const { clay, M, V, starShape, petalShape, crescentShape, crescentMid, roundBlade, ext, dot, capDots, handle, vineHandle,
    flower, calyx, rodFrame, pickArms, sickleBlade, netBag } = K;
  const SHH = { wood: SH.stem, grip: SH.stemD, knob: SH.cap };
  const MNH = () => ({ wood: MN.navy, grip: MN.navyD, knobMat: gold(0.6) });
  const gold = (k = 0.9) => clay(MN.gold, { glow: MN.gold, k });
  const silver = (k = 0.35) => clay(MN.silver, { glow: MN.lilac, k });
  return {
    // 🍄 A 버섯 숲 — 크림 줄기 자루 + 빨간 갓 + 흰 점(면당 3개까지만 — 촘촘하면 환공포)
    shroom: {
      axe(g) {   // 날 = 반쪽 갓
        const top = handle(g, SHH, 0.52, 0.032);
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(SH.stemD), 0.0, top - 0.05, 0));
        const s = new THREE.Shape(), R = 0.12; s.moveTo(0, -R); s.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false); s.closePath();
        g.add(M(ext(s, 0.05, 0.022, 16), clay(SH.cap, { smooth: true }), 0.035, top - 0.05, 0));
        g.add(M(new THREE.BoxGeometry(0.022, 0.25, 0.075), clay(SH.gill), 0.035, top - 0.05, 0));   // 갓 밑면(주름)
        [[0.075, 0.045, 0.024], [0.055, -0.055, 0.019], [0.115, -0.005, 0.015]].forEach(([x, y, r]) => [-1, 1].forEach(sz =>
          dot(g, clay(SH.spot), 0.035 + x, top - 0.05 + y, sz * 0.048, r, V(0, 0, sz))));
        g.scale.setScalar(1.18);
      },
      hoe(g) {   // 곡괭이 양팔은 지키고 팔을 갓 색·흰 점으로, 가운데에 작은 갓
        const top = handle(g, SHH, 0.52, 0.032);
        const hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
        hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(SH.stemD)));
        pickArms(hd, clay(SH.cap), clay(SH.gill));
        [[-1, 0.075, 0.0, 0.015], [1, 0.09, -0.01, 0.017], [1, 0.19, -0.05, 0.012]].forEach(([sx, x, y, r]) =>
          [-1, 1].forEach(sz => dot(hd, clay(SH.spot), sx * x, y, sz * 0.026, r, V(0, 0, sz))));
        const cap = M(new THREE.SphereGeometry(0.06, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap, { smooth: true }), 0, 0.035, 0); cap.scale.y = 0.75; hd.add(cap);
        hd.add(M(new THREE.CylinderGeometry(0.058, 0.035, 0.012, 14), clay(SH.gill), 0, 0.032, 0));
        dot(hd, clay(SH.spot), 0, 0.08, 0, 0.016, V(0, 1, 0));
        g.scale.setScalar(1.18);
      },
      seed(g) {   // 크림 주머니 + 빨간 갓 뚜껑 → 주머니 자체가 버섯
        const bag = M(new THREE.SphereGeometry(0.11, 12, 10), clay(SH.stem, { smooth: true }), 0, 0.07, 0); bag.scale.set(1, 1.05, 1); g.add(bag);
        const sc = [1, 0.62, 1], r = 0.13, y = 0.15;
        const cap = M(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap, { smooth: true }), 0, y, 0); cap.scale.set(...sc); g.add(cap);
        g.add(M(new THREE.CylinderGeometry(r * 0.98, 0.08, 0.016, 16), clay(SH.gill), 0, y - 0.004, 0));
        capDots(g, y, r, sc, [[0.25, 0.5, 0.02], [0.85, 1.4, 0.02], [0.9, 3.0, 0.016], [0.75, 4.6, 0.018]]);
        g.scale.setScalar(1.25);
      },
      water(g) {   // 버섯집 물조리개 — 갓 지붕 + 작은 문
        g.add(M(new THREE.CylinderGeometry(0.10, 0.118, 0.19, 12), clay(SH.stem), 0, 0.17, 0));
        g.add(M(new THREE.CylinderGeometry(0.122, 0.122, 0.02, 12), clay(SH.stemD), 0, 0.08, 0));
        const capR = 0.16;
        const cap = M(new THREE.SphereGeometry(capR, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap, { smooth: true }), 0, 0.262, 0); cap.scale.y = 0.72; g.add(cap);
        g.add(M(new THREE.CylinderGeometry(capR * 0.98, 0.10, 0.025, 14), clay(SH.gill), 0, 0.255, 0));
        [[0.55, 2.2, 0.026], [0.95, 1.2, 0.022], [0.85, 3.4, 0.024], [0.3, 4.6, 0.018]].forEach(([th, ph, r]) => {
          const n = V(Math.sin(th) * Math.cos(ph), Math.cos(th) / 0.72, Math.sin(th) * Math.sin(ph));
          dot(g, clay(SH.spot), Math.sin(th) * Math.cos(ph) * capR, 0.262 + Math.cos(th) * capR * 0.72, Math.sin(th) * Math.sin(ph) * capR, r, n);
        });
        const door = new THREE.Shape(); door.moveTo(-0.03, 0); door.lineTo(-0.03, 0.05); door.absarc(0, 0.05, 0.03, Math.PI, 0, true); door.lineTo(0.03, 0); door.closePath();
        g.add(M(ext(door, 0.012, 0.003), clay(SH.door), 0, 0.09, 0.104));
        g.add(M(new THREE.SphereGeometry(0.006, 6, 4), clay(0xf2c64b), 0.015, 0.12, 0.113));   // 문고리
        const spt = M(new THREE.CylinderGeometry(0.02, 0.034, 0.22, 8), clay(SH.stem), 0.15, 0.22, 0); spt.rotation.z = -0.9; g.add(spt);
        const rose = M(new THREE.SphereGeometry(0.042, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap), 0.24, 0.29, 0); rose.rotation.z = -0.9; rose.scale.y = 0.7; g.add(rose);
        g.scale.setScalar(1.25);
      },
      sickle(g) {
        const top = handle(g, SHH, 0.30, 0.036);
        sickleBlade(g, top, clay(SH.cap), clay(SH.gill), 1.25, (bl, i, x, y) => {
          if (i < 2) [-1, 1].forEach(sz => dot(bl, clay(SH.spot), x - 0.004, y + (i ? -0.01 : 0.02), sz * 0.011, i ? 0.011 : 0.014, V(0, 0, sz)));
        });
        const fer = M(new THREE.SphereGeometry(0.05, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap), 0, top - 0.035, 0); fer.scale.y = 0.6; g.add(fer);   // 목 = 꼬마 갓
        g.scale.setScalar(1.18);
      },
      shovel(g) {
        const top = handle(g, SHH, 0.58, 0.032);
        g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 8), clay(SH.stemD), 0, top + 0.01, 0));
        g.add(M(ext(roundBlade(0.105, 0.13), 0.035, 0.014, 14), clay(SH.cap, { smooth: true }), 0, top + 0.03, 0));
        [[-0.045, 0.08, 0.022], [0.042, 0.14, 0.026], [-0.012, 0.205, 0.016]].forEach(([x, y, r]) => [-1, 1].forEach(sz =>
          dot(g, clay(SH.spot), sz * x, top + 0.03 + y, sz * 0.033, r, V(0, 0, sz))));
        const mini = new THREE.Group(); mini.position.set(0.045, top - 0.02, 0.01); mini.rotation.z = -0.5; g.add(mini);   // 목에 돋은 꼬마 버섯
        mini.add(M(new THREE.CylinderGeometry(0.010, 0.013, 0.04, 6), clay(SH.stem), 0, 0.02, 0));
        const c = M(new THREE.SphereGeometry(0.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap), 0, 0.035, 0); c.scale.y = 0.75; mini.add(c);
        g.scale.setScalar(1.18);
      },
      hammer(g) {   // 줄기 몸통 양끝에 버섯 갓 — 버섯 방망이
        const top = handle(g, SHH, 0.50, 0.032);
        const head = M(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10), clay(SH.stem), 0, top - 0.04, 0); head.rotation.z = Math.PI / 2; g.add(head);
        [-1, 1].forEach(sx => {
          const cap = M(new THREE.SphereGeometry(0.075, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap, { smooth: true }), sx * 0.07, top - 0.04, 0);
          cap.rotation.z = -sx * Math.PI / 2; cap.scale.y = 0.7; g.add(cap);
          const gl = M(new THREE.CylinderGeometry(0.073, 0.04, 0.012, 14), clay(SH.gill), sx * 0.068, top - 0.04, 0); gl.rotation.z = -sx * Math.PI / 2; g.add(gl);
          dot(g, clay(SH.spot), sx * 0.1, top - 0.02, 0.05, 0.016, V(sx * 0.6, 0.3, 1));
        });
        g.scale.setScalar(1.18);
      },
      rod(g) {
        rodFrame(g, { knob: clay(SH.cap), rear: clay(SH.stemD), pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.014, 0.027, L, 7), clay(SH.stem), 0, L / 2, 0));
          [0.22, 0.47, 0.7].forEach(f => p.add(M(new THREE.CylinderGeometry(0.024 - f * 0.011, 0.024 - f * 0.011, 0.014, 7), clay(SH.birch), 0, L * f, 0)));
        } }, b => {   // 찌 = 꼬마 버섯
          b.add(M(new THREE.CylinderGeometry(0.022, 0.028, 0.07, 8), clay(SH.stem), 0, -0.03, 0));
          const c = M(new THREE.SphereGeometry(0.07, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap, { smooth: true }), 0, 0.0, 0); c.scale.y = 0.8; b.add(c);
          b.add(M(new THREE.CylinderGeometry(0.068, 0.03, 0.012, 12), clay(SH.gill), 0, -0.004, 0));
          dot(b, clay(SH.spot), 0, 0.056, 0.0, 0.018, V(0, 1, 0));
          dot(b, clay(SH.spot), 0.0, 0.03, 0.058, 0.014, V(0, 0.6, 1));
        });
      },
      net(g) {
        g.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 7), clay(SH.stem), 0, 0.25, 0));   // 테까지 닿게(기본은 틈이 있다)
        const ring = M(new THREE.TorusGeometry(0.17, 0.026, 7, 18), clay(SH.cap, { smooth: true }), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
        [0.4, 1.9, 3.6].forEach((a, i) => dot(g, clay(SH.spot), Math.cos(a) * 0.17, 0.624, Math.sin(a) * 0.17, [0.016, 0.012, 0.014][i], V(0, 1, 0)));
        g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(0xf3e6cc, 0.55), 0, 0.74, 0));
        const mini = new THREE.Group(); mini.position.set(-0.15, 0.6, 0.07); g.add(mini);   // 테에 돋은 꼬마 버섯
        mini.add(M(new THREE.CylinderGeometry(0.011, 0.014, 0.045, 6), clay(SH.stem), 0, 0.03, 0));
        const c = M(new THREE.SphereGeometry(0.032, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), clay(SH.cap), 0, 0.05, 0); c.scale.y = 0.75; mini.add(c);
        g.scale.setScalar(1.25);
      },
    },

    // 🌙 B 달밤 — 남색 자루 + 은빛 초승달 + 금별(밤에만 은은히)
    moon: {
      axe(g) {   // 날 = 초승달(볼록면이 자루에 붙고 뿔이 바깥으로) + 품 안의 별
        const top = handle(g, MNH(), 0.52);
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.072), clay(MN.navyD), 0, top - 0.05, 0));
        const cr = M(ext(crescentShape(0.135, -0.08, 86), 0.034, 0.01, 18), silver(), 0.135, top - 0.05, 0); cr.rotation.z = Math.PI; g.add(cr);
        g.add(M(ext(starShape(0.03), 0.014, 0.005), gold(), 0.088, top - 0.05, 0));
        g.scale.setScalar(1.18);
      },
      hoe(g) {   // 머리 = 엎어 놓은 초승달. 처진 두 뿔이 곡괭이 양팔
        const top = handle(g, MNH(), 0.52);
        const R = 0.2, cx = -0.06, deg = 80;
        const cr = M(ext(crescentShape(R, cx, deg), 0.04, 0.01, 18), silver(), 0, top + 0.02 - crescentMid(R, cx, deg), 0); cr.rotation.z = Math.PI / 2; g.add(cr);
        g.add(M(new THREE.BoxGeometry(0.06, 0.07, 0.06), clay(MN.navyD), 0, top - 0.01, 0));
        g.add(M(ext(starShape(0.03), 0.012, 0.004), gold(), 0, top - 0.01, 0.036));
        g.scale.setScalar(1.18);
      },
      seed(g) {   // 남색 주머니 + 금 끈 + 초승달 단추
        const bag = M(new THREE.SphereGeometry(0.115, 12, 10), clay(MN.navy, { smooth: true }), 0, 0.08, 0); bag.scale.set(1, 1.12, 1); g.add(bag);
        g.add(M(new THREE.CylinderGeometry(0.05, 0.07, 0.06, 10), clay(MN.navy), 0, 0.2, 0));
        const cord = M(new THREE.TorusGeometry(0.058, 0.011, 5, 14), gold(), 0, 0.2, 0); cord.rotation.x = Math.PI / 2; g.add(cord);   // 발광 세기를 별과 맞춰 한 콜로 묶인다
        g.add(M(new THREE.ConeGeometry(0.06, 0.05, 10, 1, true), clay(MN.navy, { side: THREE.DoubleSide }), 0, 0.245, 0));
        g.add(M(ext(crescentShape(0.045, -0.028, 80), 0.008, 0.003), silver(), -0.01, 0.09, 0.112));
        g.add(M(ext(starShape(0.016), 0.006, 0.002), gold(), 0.035, 0.12, 0.105));
        g.scale.setScalar(1.25);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 12), clay(MN.navy), 0, 0.18, 0));
        g.add(M(new THREE.CylinderGeometry(0.115, 0.115, 0.024, 12), clay(MN.silver), 0, 0.282, 0));
        g.add(M(new THREE.CylinderGeometry(0.124, 0.124, 0.02, 12), clay(MN.silver), 0, 0.085, 0));
        const onCan = (mesh, x, y) => { const a = x / 0.118; mesh.position.set(Math.sin(a) * 0.118, 0.18 + y, Math.cos(a) * 0.118); mesh.rotation.y = a; g.add(mesh); };
        onCan(M(ext(crescentShape(0.05, -0.03, 80), 0.008, 0.003), silver(0.5)), -0.01, 0);
        [[0.035, 0.045, 0.016], [0.05, -0.04, 0.012], [-0.055, -0.05, 0.010]].forEach(([x, y, r]) => onCan(M(ext(starShape(r), 0.006, 0.002), gold()), x, y));
        const sp = M(new THREE.CylinderGeometry(0.02, 0.034, 0.22, 8), clay(MN.silver), 0.15, 0.26, 0); sp.rotation.z = -0.9; g.add(sp);
        g.add(M(ext(starShape(0.042), 0.016, 0.005), gold(), 0.245, 0.335, 0));   // 별 꼭지 — 정면을 본다
        g.scale.setScalar(1.25);
      },
      sickle(g) {   // 날 = 가는 초승달 하나
        const top = handle(g, MNH(), 0.30, 0.034);
        const R = 0.21, cx = -0.05, deg = 70, a0 = deg * Math.PI / 180;
        g.add(M(ext(crescentShape(R, cx, deg), 0.018, 0.006, 20), silver(), -R * Math.cos(a0), top + R * Math.sin(a0), 0));
        g.add(M(new THREE.CylinderGeometry(0.030, 0.036, 0.06, 8), clay(MN.navyD), 0, top - 0.01, 0));
        g.add(M(ext(starShape(0.026), 0.01, 0.004), gold(), 0, top - 0.01, 0.036));
        g.scale.setScalar(1.18);
      },
      shovel(g) {
        const top = handle(g, MNH(), 0.58);
        g.add(M(new THREE.CylinderGeometry(0.034, 0.042, 0.07, 8), clay(MN.navyD), 0, top + 0.01, 0));
        const ring = M(new THREE.TorusGeometry(0.04, 0.008, 5, 12), gold(0.4), 0, top + 0.035, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
        g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.012, 14), clay(MN.silver, { smooth: true, glow: MN.lilac, k: 0.25 }), 0, top + 0.03, 0));
        const c = M(ext(crescentShape(0.05, -0.03, 80), 0.008, 0.003), clay(MN.navy), -0.02, top + 0.16, 0.03); c.rotation.z = Math.PI * 0.85; g.add(c);
        g.add(M(ext(starShape(0.022), 0.008, 0.003), gold(), 0.04, top + 0.10, 0.03));
        g.scale.setScalar(1.18);
      },
      hammer(g) {
        const top = handle(g, MNH(), 0.50);
        const head = M(new THREE.CylinderGeometry(0.055, 0.055, 0.20, 10), clay(MN.navy), 0, top - 0.04, 0); head.rotation.z = Math.PI / 2; g.add(head);
        [-1, 1].forEach(sx => { const c = M(new THREE.CylinderGeometry(0.064, 0.06, 0.035, 10), silver(0.3), sx * 0.105, top - 0.04, 0); c.rotation.z = Math.PI / 2; g.add(c); });
        g.add(M(ext(crescentShape(0.04, -0.025, 80), 0.008, 0.003), silver(0.5), -0.015, top - 0.04, 0.056));
        g.add(M(ext(starShape(0.018), 0.008, 0.003), gold(), 0.028, top - 0.025, 0.056));
        g.scale.setScalar(1.18);
      },
      rod(g) {
        rodFrame(g, { knob: gold(0.6), rear: clay(MN.navyD), line: 0xd9dcf0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.02, 0.027, L * 0.58, 7), clay(MN.navy), 0, L * 0.29, 0));
          p.add(M(new THREE.CylinderGeometry(0.011, 0.02, L * 0.42, 7), clay(MN.silver), 0, L * 0.79, 0));
          p.add(M(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8), clay(MN.gold), 0, L * 0.58, 0));
        } }, b => b.add(M(ext(starShape(0.055), 0.02, 0.007), gold(1.0))));   // 찌 = 금별
      },
      net(g) {
        g.add(M(new THREE.CylinderGeometry(0.028, 0.028, 0.72, 7), clay(MN.navy), 0, 0.25, 0));
        const ring = M(new THREE.TorusGeometry(0.17, 0.02, 6, 18), silver(), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
        [[0.6, 0.032], [2.4, 0.024], [4.1, 0.028]].forEach(([a, r]) => g.add(M(ext(starShape(r), 0.01, 0.004), gold(), Math.cos(a) * 0.17, 0.6, Math.sin(a) * 0.17)));
        g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(0xc9cdf0, 0.45), 0, 0.74, 0));
        g.scale.setScalar(1.25);
      },
    },

    // 🌸 C 꽃정원 — 초록 줄기 자루에 덩굴, 분홍 꽃잎
    bloom: {
      axe(g) {   // 날 = 꽃잎
        const top = vineHandle(g, 0.52);
        g.add(M(new THREE.BoxGeometry(0.055, 0.1, 0.065), clay(BL.vine), 0, top - 0.05, 0));
        const p = M(ext(petalShape(0.085, 0.22), 0.034, 0.012, 16), clay(BL.pink, { smooth: true }), 0.0, top - 0.05, 0); p.rotation.z = -Math.PI / 2; g.add(p);
        [-1, 1].forEach(sz => { const q = M(ext(petalShape(0.045, 0.13), 0.006, 0.003), clay(BL.pinkL), 0.05, top - 0.05, sz * 0.03); q.rotation.z = -Math.PI / 2; g.add(q); });
        flower(g, 0, top - 0.05, 0.04, 0.045, clay(BL.pinkL));
        g.scale.setScalar(1.18);
      },
      hoe(g) {   // 양팔 = 비스듬히 처진 꽃잎 두 장, 가운데 꽃
        const top = vineHandle(g, 0.52);
        g.add(M(new THREE.BoxGeometry(0.07, 0.07, 0.065), clay(BL.vine), 0, top + 0.01, 0));
        [-1, 1].forEach(sx => {
          const p = M(ext(petalShape(0.038, 0.25), 0.03, 0.01, 16), clay(BL.pink, { smooth: true }), sx * 0.02, top + 0.015, 0); p.rotation.z = -sx * (Math.PI / 2 + 0.38); g.add(p);
          [-1, 1].forEach(sz => { const q = M(ext(petalShape(0.018, 0.14), 0.005, 0.002), clay(BL.pinkL), sx * 0.045, top + 0.0, sz * 0.026); q.rotation.z = -sx * (Math.PI / 2 + 0.38); g.add(q); });
        });
        flower(g, 0, top + 0.01, 0.038, 0.045, clay(BL.pinkL));
        g.scale.setScalar(1.18);
      },
      seed(g) {   // 분홍 주머니 위로 꽃잎 다섯 장이 오므린 봉오리
        const bag = M(new THREE.SphereGeometry(0.115, 12, 10), clay(BL.pink, { smooth: true }), 0, 0.08, 0); bag.scale.set(1, 1.08, 1); g.add(bag);
        const pg = ext(petalShape(0.05, 0.12), 0.008, 0.004, 14);
        for (let i = 0; i < 5; i++) {
          const piv = new THREE.Group(); piv.position.set(0, 0.12, 0); piv.rotation.y = i * Math.PI * 2 / 5; g.add(piv);
          const p = new THREE.Mesh(pg, clay(i % 2 ? BL.pinkL : BL.pink, { smooth: true })); p.position.z = 0.07; p.rotation.x = -0.12; piv.add(p);
        }
        const rib = M(new THREE.TorusGeometry(0.075, 0.012, 5, 14), clay(BL.vine), 0, 0.15, 0); rib.rotation.x = Math.PI / 2; g.add(rib);
        const lf = M(ext(petalShape(0.025, 0.075), 0.006, 0.003), clay(BL.leaf), 0.07, 0.15, 0.04); lf.rotation.z = -1.1; g.add(lf);
        g.scale.setScalar(1.25);
      },
      water(g) {   // 튤립 물조리개 — 통이 꽃봉오리, 꽃잎 5장이 윗부분을 감싼다(벌리면 토끼 귀처럼 읽혔다)
        const prof = [[0.001, 0], [0.07, 0.004], [0.11, 0.04], [0.125, 0.10], [0.115, 0.16], [0.10, 0.19]].map(([r, y]) => new THREE.Vector2(r, y));
        g.add(M(new THREE.LatheGeometry(prof, 16), clay(BL.pink, { smooth: true }), 0, 0.08, 0));
        const pg = ext(petalShape(0.07, 0.16), 0.01, 0.005, 16);
        for (let i = 0; i < 5; i++) {
          const piv = new THREE.Group(); piv.position.set(0, 0.17, 0); piv.rotation.y = i * Math.PI * 2 / 5 + 0.3; g.add(piv);
          const p = new THREE.Mesh(pg, clay(i % 2 ? BL.pinkL : BL.pink, { smooth: true })); p.position.z = 0.108; p.rotation.x = 0.16; piv.add(p);
        }
        const sp = M(new THREE.CylinderGeometry(0.018, 0.03, 0.24, 8), clay(BL.stem), 0.15, 0.22, 0); sp.rotation.z = -0.9; g.add(sp);
        const lf = M(ext(petalShape(0.025, 0.07), 0.006, 0.003), clay(BL.leaf), 0.14, 0.22, 0.02); lf.rotation.set(0, 0, -2.4); g.add(lf);
        flower(g, 0.245, 0.30, 0, 0.042);
        g.scale.setScalar(1.25);
      },
      sickle(g) {
        const top = vineHandle(g, 0.30, 0.034);
        sickleBlade(g, top, clay(BL.pink), clay(BL.pinkL), 1.3);
        calyx(g, top);
        flower(g, 0, top - 0.02, 0.04, 0.04, clay(BL.pinkL));
        g.scale.setScalar(1.18);
      },
      shovel(g) {   // ✅ ① 꽃 양각(2026-10-02 확정) — 둥근 날 실루엣을 지켜야 삽으로 읽힌다
        const top = vineHandle(g, 0.58);
        g.add(M(new THREE.CylinderGeometry(0.034, 0.042, 0.07, 8), clay(BL.vine), 0, top + 0.01, 0));
        calyx(g, top + 0.03);
        g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.012, 14), clay(BL.pink, { smooth: true }), 0, top + 0.03, 0));
        const f = flower(g, 0, top + 0.155, 0.03, 0.07, clay(BL.pinkL)); f.rotation.z = 0.3;
        g.scale.setScalar(1.18);
      },
      hammer(g) {   // 꽃 방망이 — 연분홍 몸통에 덩굴 띠, 양끝이 꽃
        const top = vineHandle(g, 0.50);
        const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 12), clay(BL.pinkL, { smooth: true }), 0, top - 0.04, 0); head.rotation.z = Math.PI / 2; g.add(head);
        const band = M(new THREE.TorusGeometry(0.051, 0.01, 5, 14), clay(BL.vine), 0, top - 0.04, 0); band.rotation.y = Math.PI / 2; g.add(band);
        [-1, 1].forEach(sx => { const f = flower(g, sx * 0.095, top - 0.04, 0, 0.075, clay(BL.pink)); f.rotation.y = sx * Math.PI / 2; });
        g.scale.setScalar(1.18);
      },
      rod(g) {
        rodFrame(g, { knob: clay(BL.pink), rear: clay(BL.vine), pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.014, 0.026, L, 7), clay(BL.stem), 0, L / 2, 0));
          [0.2, 0.42, 0.64, 0.84].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.012, 0.026 - f * 0.012, 0.016, 7), clay(BL.vine), 0, L * f, 0)));
        } }, b => {   // 찌 = 꽃봉오리
          const bud = M(new THREE.SphereGeometry(0.042, 10, 8), clay(BL.pink, { smooth: true })); bud.scale.set(1, 1.35, 1); b.add(bud);
          for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3, s = M(new THREE.ConeGeometry(0.016, 0.05, 4), clay(BL.leaf), Math.cos(a) * 0.025, 0.045, Math.sin(a) * 0.025); s.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); b.add(s); }
        });
      },
      net(g) {
        const top = vineHandle(g, 0.62, 0.028);
        const ring = M(new THREE.TorusGeometry(0.17, 0.02, 6, 18), clay(BL.vine), 0, top + 0.06, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
        [0.5, 2.3, 4.0].forEach((a, i) => { const f = flower(g, Math.cos(a) * 0.17, top + 0.075, Math.sin(a) * 0.17, [0.04, 0.03, 0.035][i]); f.rotation.x = -Math.PI / 2; });
        g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(0xf7c9d4, 0.5), 0, top + 0.2, 0));
        g.scale.setScalar(1.25);
      },
    },

    // 🎃 할로윈 2종(🦇 달밤 보라 · 🌽 수확제) — js/cosmetics/tool-skins-halloween.js
    ...halloweenThemes(THREE, K),
  };
}

// ── ⚡ 굽기: 메시 더미 → 재질 종류(평면/부드러움 · 면 · 투명 · 발광)별 정점색 메시 몇 개 ──
function paint(THREE, geo, color) {
  const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}
function bake(THREE, src) {
  src.updateMatrixWorld(true);
  const buckets = new Map(), trash = new Set();
  src.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material, gl = m.userData.glow, lift = m.userData.lift;
    const key = [m.flatShading ? 'f' : 's', m.side, m.transparent ? m.opacity : 1,
      gl ? `g${gl.hex}:${gl.k}` : '', lift ? `l${m.color.getHex()}:${lift}` : ''].join('|');
    let b = buckets.get(key);
    if (!b) { b = { proto: m, geos: [] }; buckets.set(key, b); }
    const q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(q.attributes)) if (name !== 'position' && name !== 'normal') q.deleteAttribute(name);
    q.applyMatrix4(o.matrixWorld);                         // 위치·회전·배율까지 구워 넣는다
    paint(THREE, q, m.color);
    b.geos.push(q);
    trash.add(o.geometry); trash.add(m);
  });
  const out = new THREE.Group();
  for (const { proto: p, geos } of buckets.values()) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: p.flatShading,
      side: p.side, transparent: p.transparent, opacity: p.opacity, depthWrite: !p.transparent });
    const gl = p.userData.glow;
    if (gl) { mat.emissive.setHex(gl.hex); mat.userData.glowK = gl.k; mat.emissiveIntensity = gl.k * 0.1; }
    if (p.userData.lift) { mat.emissive.copy(p.color); mat.emissiveIntensity = p.userData.lift; }   // 우산 안쪽 — 아래 빛이 약해 회색으로 죽는 것 띄우기
    const mesh = new THREE.Mesh(mergeGeos(THREE, geos), mat);
    mesh.castShadow = !p.transparent;
    out.add(mesh);
    for (const q of geos) q.dispose();
  }
  for (const x of trash) x.dispose();
  return out;
}

const cache = new WeakMap();   // THREE → 빌더(재질은 매번 새로 — 굽기 끝나면 버린다)
function buildersOf(THREE) {
  let b = cache.get(THREE);
  if (!b) { b = themeBuilders(THREE, kit(THREE)); cache.set(THREE, b); }
  return b;
}

/** 테마 도구 메시(원점 = 쥐는 곳). 모르는 테마·도구면 null — 부르는 쪽이 기본 조형으로 간다 */
export function buildToolSkin(THREE, theme, toolId) {
  const fn = buildersOf(THREE)[theme]?.[toolId];
  if (!fn) return null;
  const g = new THREE.Group();
  fn(g);
  const out = bake(THREE, g);
  out.userData.toolSkin = theme;
  return out;
}

// ── ☂️ 우산 — 살(gore) N장. 게임에선 늘 펼친 모양 하나를 구워 두고 배율로 '펴지는' 느낌만 준다 ──
const UMBRELLAS = {
  shroom: { N: 8, R: 0.86, th: 1.12, overlap: 1, shape: { w: () => 1, tip: 0 } },
  moon:   { N: 8, R: 1.15, th: 0.76, overlap: 1, shape: { w: () => 1, tip: -0.07 }, twist: Math.PI / 8 },
  bloom:  { N: 6, R: 1.0,  th: 0.98, overlap: 1.32, layer: true,
            shape: { w: v => 0.42 + 0.58 * Math.sin(Math.PI * Math.min(1, 0.12 + v * 0.88)), tip: 0.10 } },
  // 🎃 할로윈 — 시안 sims/halloween-tools-sim.html UMB.bat / UMB.harvest 그대로(2026-10-06 확정, look/umbrella-pc.png)
  batnight: { N: 6, R: 1.0,  th: 0.92, overlap: 1.28, layer: true,   // 보라 6폭 · 끝이 박쥐 날개처럼 뾰족
              shape: { w: v => 0.42 + 0.58 * Math.sin(Math.PI * Math.min(1, 0.12 + v * 0.88)), tip: 0.12 } },
  harvest:  { N: 10, R: 1.35, th: 0.62, overlap: 1, shape: { w: () => 1, tip: 0 } },   // 짚 갓우산
};
export const UMBRELLA_SHAFT = 1.55;   // 쥐는 곳 → 꼭지

function goreGeo(THREE, R, thMax, halfW, shape) {
  const W = 8, H = 9, pos = [], idx = [];
  for (let j = 0; j <= H; j++) {
    const v = j / H;
    for (let i = 0; i <= W; i++) {
      const u = i / W * 2 - 1, phi = u * halfW * shape.w(v), th = thMax * v * (1 + shape.tip * (1 - u * u));
      pos.push(-Math.cos(phi) * Math.sin(th) * R, (Math.cos(th) - 1) * R, Math.sin(phi) * Math.sin(th) * R);
    }
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

/** 펼친 우산(원점 = 손잡이 쥐는 곳, +y 가 꼭지). 모르는 테마면 null */
export function buildUmbrella(THREE, theme) {
  const def = UMBRELLAS[theme];
  if (!def) return null;
  const K = kit(THREE), { clay, M, V, starShape, petalShape, crescentShape, ext, dot } = K;
  const surf = (R, th, phi) => {
    const p = V(-Math.cos(phi) * Math.sin(th) * R, (Math.cos(th) - 1) * R, Math.sin(phi) * Math.sin(th) * R);
    return { p, n: p.clone().add(V(0, R, 0)).normalize() };
  };
  const HK = halloweenKit(THREE, K);
  const L = UMBRELLA_SHAFT, root = new THREE.Group();
  const jHook = (mat, r = 0.075) => { const j = M(new THREE.TorusGeometry(r, 0.022, 6, 14, Math.PI), mat, r, 0, 0); j.rotation.z = Math.PI; root.add(j); };
  const look = {
    shroom: {
      outer: () => clay(SH.cap), inner: () => clay(SH.gill, { side: THREE.BackSide, lift: 0.3 }),
      shaft() {
        root.add(M(new THREE.CylinderGeometry(0.034, 0.042, L, 8), clay(SH.stem), 0, L / 2, 0));
        root.add(M(new THREE.CylinderGeometry(0.05, 0.085, 0.06, 10, 1, true), clay(SH.stemD, { side: THREE.DoubleSide }), 0, L - 0.42, 0));   // 줄기 턱받이
        jHook(clay(SH.stemD));
      },
      deco(h, k) {   // 흰 점: 살마다 한두 개, 크기를 달리 — 같은 간격 반복 금지
        const set = [[[0.42, 0.1, 0.085]], [[0.85, -0.15, 0.07]], [[0.55, 0.2, 0.06], [0.95, -0.1, 0.05]], [[0.75, 0.05, 0.09]], [[0.38, -0.2, 0.06]], [[0.9, 0.18, 0.07]], [[0.6, -0.05, 0.075]], [[0.98, 0.0, 0.055]]][k];
        set.forEach(([th, ph, r]) => { const { p, n } = surf(def.R * 1.004, th, ph); dot(h, clay(SH.spot), p.x, p.y, p.z, r * 1.3, n); });
      },
      finial(c) { c.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(SH.cap), 0, 0.015, 0)); },
    },
    moon: {
      outer: () => clay(MN.navy), inner: () => clay(0x2b3160, { side: THREE.BackSide, lift: 0.15 }),
      shaft() {
        root.add(M(new THREE.CylinderGeometry(0.018, 0.018, L + 0.05, 8), clay(MN.silver), 0, L / 2, 0));
        jHook(clay(MN.navyD), 0.07);
      },
      deco(h, k) {
        const tipP = surf(def.R, def.th * 0.93, 0).p;   // 살 끝 은구슬
        h.add(M(new THREE.SphereGeometry(0.022, 8, 6), clay(MN.silver), tipP.x, tipP.y, tipP.z));
        if (k % 2 === 0) {   // 별은 한 폭 걸러 하나 — 크기 다르게
          const j = k / 2, r = [0.065, 0.045, 0.058, 0.04][j];
          const { p, n } = surf(def.R * 1.006, [0.45, 0.62, 0.35, 0.55][j], [0.12, -0.1, 0.0, 0.15][j]);
          const s = M(ext(starShape(r), 0.006, 0.002), clay(MN.gold, { glow: MN.gold, k: 1.0 }), p.x, p.y, p.z);
          s.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(s);
        }
      },
      finial(c) {
        const cr = M(ext(crescentShape(0.06, -0.035, 82), 0.014, 0.004), clay(MN.silver, { glow: MN.lilac, k: 0.6 }), 0, 0.07, 0);
        cr.rotation.z = Math.PI / 2; c.add(cr);
        c.add(M(new THREE.CylinderGeometry(0.012, 0.02, 0.04, 6), clay(MN.silver), 0, 0.015, 0));
      },
    },
    bloom: {
      outer: k => clay(k % 2 ? BL.pinkL : BL.pink), inner: () => clay(0xfbe3ea, { side: THREE.BackSide, lift: 0.4 }),
      shaft() {
        root.add(M(new THREE.CylinderGeometry(0.024, 0.03, L, 8), clay(BL.stem), 0, L / 2, 0));
        const lf = M(ext(petalShape(0.05, 0.15), 0.008, 0.004), clay(BL.leaf), 0, L * 0.42, 0); lf.rotation.set(0, 0.6, -0.9); root.add(lf);
        jHook(clay(BL.vine), 0.07);
      },
      finial(c) {
        c.add(M(new THREE.SphereGeometry(0.06, 10, 8), clay(BL.center), 0, 0.02, 0));
        for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.add(M(new THREE.SphereGeometry(0.016, 6, 5), clay(0xe0a83a), Math.cos(a) * 0.05, 0.07, Math.sin(a) * 0.05)); }
      },
    },
    // 🦇 달밤 보라 — 보라·자두 번갈이 6폭, 폭 끝이 박쥐 날개처럼 뾰족 + 끝마다 주황 구슬, 꼭지는 꼬마 호박
    batnight: {
      outer: k => clay(k % 2 ? BT.plum : BT.vio), inner: () => clay(0xd9cff4, { side: THREE.BackSide, lift: 0.3 }),
      shaft() {
        root.add(M(new THREE.CylinderGeometry(0.022, 0.028, L, 7), clay(BT.plum), 0, L / 2, 0));
        jHook(clay(BT.night), 0.07);
      },
      deco(h) {
        const tipP = surf(def.R, def.th * 1.1, 0).p;   // 폭 가운데 뾰족한 끝
        h.add(M(new THREE.SphereGeometry(0.022, 6, 5), clay(BT.orange), tipP.x, tipP.y, tipP.z));
      },
      finial(c) { HK.pumpkin(c, 0.05, 0, 0.04, 0); },
    },
    // 🌽 수확제 — 짚 갓우산 10폭 · 한 폭 걸러 빨간 끈 · 자루에 새끼줄 · 꼭지는 옥수수
    harvest: {
      outer: k => clay(k % 2 ? HV.strawD : HV.straw), inner: () => clay(HV.cream, { side: THREE.BackSide, lift: 0.35 }),
      shaft() {
        root.add(M(new THREE.CylinderGeometry(0.026, 0.034, L, 7), clay(HV.wood), 0, L / 2, 0));
        HK.twine(root, L - 0.5, 0.032, 2, 0.04);
        jHook(clay(HV.woodD));
      },
      deco(h, k) {
        if (k % 2) return;
        const p = surf(def.R * 1.003, 0.31, 0).p;
        h.add(M(new THREE.BoxGeometry(0.03, 0.03, 0.2), clay(HV.red), p.x, p.y, p.z));
      },
      finial(c) { HK.cob(c, 0, 0.1, 0, 0.16, 0.04, 0.028, 3); },
    },
  }[theme];
  look.shaft();
  const canopy = new THREE.Group(); canopy.position.y = L; root.add(canopy);
  const outerGeo = goreGeo(THREE, def.R, def.th, Math.PI / def.N * def.overlap, def.shape);
  const innerGeo = goreGeo(THREE, def.R * 0.985, def.th, Math.PI / def.N * def.overlap, def.shape);
  for (let k = 0; k < def.N; k++) {
    const piv = new THREE.Group(); piv.rotation.y = k * Math.PI * 2 / def.N + (def.twist ?? 0); canopy.add(piv);
    const rr = def.layer ? 1 + (k % 2) * 0.012 : 1;   // 겹치는 꽃잎은 한 장 걸러 살짝 바깥으로(깜빡임 방지)
    const out = new THREE.Mesh(outerGeo.clone(), look.outer(k)); out.scale.setScalar(rr); piv.add(out);
    const inn = new THREE.Mesh(innerGeo.clone(), look.inner(k)); inn.scale.setScalar(rr); piv.add(inn);
    look.deco?.(piv, k);
  }
  outerGeo.dispose(); innerGeo.dispose();
  look.finial(canopy);
  const out = bake(THREE, root);
  out.userData.umbrella = { theme, R: def.R * Math.sin(def.th), depth: def.R * (1 - Math.cos(def.th)) };
  return out;
}

/** 🌙 밤에만 발광 — level 0(낮)~1(밤). 낮에도 아주 조금(0.1) 남겨 금별이 금색으로 읽히게 */
export function setToolSkinNight(root, level) {
  root?.traverse(o => {
    const k = o.material?.userData?.glowK;
    if (k != null) o.material.emissiveIntensity = k * (0.1 + 0.9 * level);
  });
}

/** 굽힌 메시 버리기 — 지오메트리·재질 모두 이 모듈이 만든 것(공유 없음) */
export function disposeToolSkin(root) {
  root?.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
}
