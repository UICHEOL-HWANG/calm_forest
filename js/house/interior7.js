// =============================================================
//  🏡 7단계 정원 저택 — 실내 스타일(모던 / 한옥) + 실내 정원
//  ------------------------------------------------------------
//  외관 스타일(js/house/stage7-*.js)과 안팎이 같은 집으로 읽히게 방 안쪽 벽·창·모서리를 꾸민다.
//    · 한옥: 한지 창살 창 · 나무 기둥과 보 · 벽 하부 판자 + 모서리 미니 정원(소나무·석등·돌 연못·대나무)
//    · 모던: 통창 + 흰 멀리언 · 천장 간접등 띠 · 나무 슬랫 벽 + 실내 화단 · 큰 화분 나무
//  ⚠️ 가구 배치(decor)와 겹치지 않게 **벽 쪽 띠와 모서리**에만 둔다. 충돌·배치 규칙은 건드리지 않는다.
//  ⚠️ 드로우콜: 방마다 한 번 짓고 mergeByMaterial 로 합친다(재질 수 = 드로우콜).
//  좌표는 방 로컬(원점 = 방 중앙 바닥, 바닥 윗면 y=0.2, 먼 벽 z=-H · 가까운 벽 z=+H, 벽 높이 3).
//  THREE·H(makeHouseHelpers)는 인자로 받는다 — 노드에서 import 안 한다.
// =============================================================
import { makeGarden } from './garden.js';
import { mergeByMaterial } from './merge.js';

export const INTERIOR7_WALL = { hanok: 0xf2e9d3, modern: 0xf5f3ee };   // 한지 크림 / 흰색 — indoor.js 의 벽 색

/**
 * @param {object} p { style:'modern'|'hanok', half:number(방 반폭), ground:boolean(1층이면 먼 벽에 나가는 문 틈) }
 * @returns {{ group: THREE.Group, windowMats: THREE.Material[] }}  windowMats = 밤 점등 목록(houseWindows)에 넣을 재질
 */
export function buildInterior7(THREE, H, { style, half, ground, doorZ = 4.6, doorHalfW = 0.9 }) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const soft = (m) => { m.castShadow = false; return m; };
  const FY = 0.2;                 // 바닥 윗면
  const farZ = -half + 0.14, sideX = half - 0.14;
  const windowMats = [];
  const lit = (color, emissive, nightScale) => {
    const m = H.clay(color, { emissive, emissiveIntensity: 0 }); m.userData.nightScale = nightScale; windowMats.push(m); return m;
  };
  const hanok7 = style === 'hanok';
  const gap = ground ? 1.15 : 0;   // 1층 먼 벽 출입문 틈(반폭)
  // 🌿 1층 오른쪽 벽의 정원 문 틈(z doorZ±doorHalfW) — 판자·걸레받이가 문 앞을 가리지 않게 그 구간은 비운다
  const rightSegs = (len) => {   // [{c, l}] 오른쪽 벽을 따라 놓을 조각(중심 z, 길이)
    const a = -len / 2, b = len / 2;
    if (!ground) return [{ c: 0, l: len }];
    const g0 = doorZ - doorHalfW - 0.1, g1 = doorZ + doorHalfW + 0.1;
    return [{ c: (a + g0) / 2, l: g0 - a }, { c: (g1 + b) / 2, l: b - g1 }].filter((x) => x.l > 0.2);
  };
  const lift = (fn) => { const n0 = g.children.length; fn(); for (let i = n0; i < g.children.length; i++) g.children[i].position.y += FY; };

  if (style === 'hanok') {
    const wood = H.clay(0x8a5a36), woodLight = H.clay(0xb98a57), paper = lit(0xfff1d2, 0xffd9a0, 0.8);
    // 벽 하부 판자(wainscot): 먼 벽(문 틈 제외)·좌우 벽
    const band = (cx, cz, w, d) => add(soft(H.box(w, 0.9, d, wood, cx, FY + 0.45, cz)));
    if (ground) { band(-(half + gap) / 2, farZ, half - gap, 0.06); band((half + gap) / 2, farZ, half - gap, 0.06); }
    else band(0, farZ, half * 2 - 0.3, 0.06);
    band(-sideX, 0, 0.06, half * 2 - 0.3); for (const sg of rightSegs(half * 2 - 0.3)) band(sideX, sg.c, 0.06, sg.l);
    // 기둥(먼 벽 4 + 문 양옆) · 보(먼 벽·좌우 벽 윗단)
    for (const x of [-(half - 0.35), -half * 0.5, half * 0.5, half - 0.35]) add(H.box(0.2, 2.8, 0.2, wood, x, FY + 1.4, farZ + 0.04));
    if (ground) for (const sx of [-1, 1]) add(H.box(0.16, 2.4, 0.16, wood, sx * (gap + 0.08), FY + 1.2, farZ + 0.04));
    add(soft(H.box(half * 2 - 0.3, 0.16, 0.14, wood, 0, FY + 2.75, farZ + 0.04)));
    add(soft(H.box(0.14, 0.16, half * 2 - 0.3, wood, -sideX, FY + 2.75, 0)));
    add(soft(H.box(0.14, 0.16, half * 2 - 0.3, wood, sideX, FY + 2.75, 0)));
    // 창살 창: 한지 + 격자 (along 'x' = 먼 벽 · 'z' = 좌우 벽)
    const lattice = (x, z, w, h, along) => {
      const fx = along === 'x';
      add(soft(H.box(fx ? w : 0.05, h, fx ? 0.05 : w, paper, x, FY + 1.7, z)));
      const n = 5;
      for (let i = 0; i <= n; i++) {
        const o = -w / 2 + (w * i) / n;
        add(soft(H.box(fx ? 0.035 : 0.05, h, fx ? 0.06 : 0.035, woodLight, fx ? x + o : x, FY + 1.7, fx ? z : z + o)));
      }
      for (const dy of [-h / 2, 0, h / 2]) add(soft(H.box(fx ? w : 0.06, 0.04, fx ? 0.06 : w, woodLight, x, FY + 1.7 + dy, z)));
    };
    for (const sx of [-1, 1]) lattice(sx * half * 0.75, farZ + 0.03, 2.0, 1.4, 'x');
    for (const sx of [-1, 1]) for (const z of [-2.6, 2.6]) lattice(sx * sideX, z, 2.0, 1.4, 'z');
    // 모서리 미니 정원: 왼쪽 먼 모서리 소나무 + 석등 · 오른쪽 먼 모서리 연못 + 대나무
    const G = makeGarden(THREE, H, add);
    lift(() => {
      G.pine(-half + 1.1, -half + 1.2, 1.15); G.stones([[-half + 1.9, -half + 1.0, 0.2], [-half + 2.3, -half + 1.6, 0.2]]); G.lantern(-half + 2.2, -half + 0.8);
      G.pond(half - 1.8, -half + 1.5, 0.85, 0.6);
      for (let i = 0; i < 5; i++) {
        const x = half - 0.7 + (i % 2) * 0.18, z = -half + 0.7 + i * 0.22;
        G.cyl(0.035, 0.045, 2.2 + (i % 3) * 0.3, G.m.bamboo, x, 1.1, z, 5); G.ico(0.18, G.m.leaf2, x, 2.3 + (i % 3) * 0.3, z);
      }
    });
  } else {
    const white = H.clay(0xffffff), black = H.clay(0x2a2e33), slat = H.clay(0xb98a57), backing = H.clay(0x6b4a30);
    const glass = lit(0x24394a, 0xffc88a, 0.35), cove = H.clay(0xfff0cc, { emissive: 0xffd699, emissiveIntensity: 0.9 });
    // 걸레받이(검정) + 천장 간접등 띠
    const base = (cx, cz, w, d) => add(soft(H.box(w, 0.12, d, black, cx, FY + 0.06, cz)));
    if (ground) { base(-(half + gap) / 2, farZ, half - gap, 0.05); base((half + gap) / 2, farZ, half - gap, 0.05); } else base(0, farZ, half * 2 - 0.3, 0.05);
    base(-sideX, 0, 0.05, half * 2 - 0.3); for (const sg of rightSegs(half * 2 - 0.3)) base(sideX, sg.c, 0.05, sg.l);
    add(soft(H.box(half * 2 - 0.3, 0.05, 0.1, cove, 0, FY + 2.8, farZ + 0.05)));
    add(soft(H.box(0.1, 0.05, half * 2 - 0.3, cove, -sideX, FY + 2.8, 0)));
    add(soft(H.box(0.1, 0.05, half * 2 - 0.3, cove, sideX, FY + 2.8, 0)));
    // 먼 벽 통창 2 + 흰 멀리언
    for (const sx of [-1, 1]) {
      const cx = sx * half * 0.5;
      add(soft(H.box(3.2, 2.0, 0.05, glass, cx, FY + 1.5, farZ + 0.03)));
      for (const dx of [-1.6, 0, 1.6]) add(soft(H.box(0.07, 2.05, 0.07, white, cx + dx, FY + 1.5, farZ + 0.05)));
      for (const dy of [-1.0, 1.0]) add(soft(H.box(3.3, 0.07, 0.07, white, cx, FY + 1.5 + dy, farZ + 0.05)));
    }
    // 왼쪽 벽 나무 슬랫 포인트(외관 루버와 같은 결)
    add(soft(H.box(0.04, 2.6, half * 1.4, backing, -sideX + 0.02, FY + 1.5, 0)));
    for (let i = 0; i < Math.round((half * 1.4) / 0.24); i++) add(soft(H.box(0.1, 2.6, 0.05, slat, -sideX + 0.07, FY + 1.5, -half * 0.7 + 0.12 + i * 0.24)));
    // 실내 정원: 오른쪽 벽 긴 화단 + 큰 화분 나무 2 + 화분
    const G = makeGarden(THREE, H, add);
    lift(() => {
      G.bed(sideX - 0.55, -1.2, 0.8, 4.4, 14);
      G.tree(-half + 1.0, -half + 1.0, 1.4); G.tree(half - 1.0, -half + 1.0, 1.5);
      G.plant(-half + 1.0, -half + 3.0, 1.2); G.bush(half - 1.1, -half + 2.2, 0.35);
    });
  }
  // 🧶 바닥 러그 — 방이 휑하지 않게 가운데 왼쪽에 한 장(가구는 위에 그대로 놓인다 — 바닥 레이캐스트 그룹이 아니라 배치에 간섭 없음)
  const rugBase = H.clay(hanok7 ? 0xeadfc4 : 0xd9d5cc), rugEdge = H.clay(hanok7 ? 0x8a5a36 : 0x9a968c);
  const rw = hanok7 ? 3.8 : 4.4, rd = hanok7 ? 2.6 : 3.0, rx = -1.0, rz = 1.4;
  g.add(soft(H.box(rw + 0.24, 0.03, rd + 0.24, rugEdge, rx, FY + 0.015, rz)));
  g.add(soft(H.box(rw, 0.04, rd, rugBase, rx, FY + 0.02, rz)));
  if (hanok7) for (const dx of [-0.7, 0.7]) g.add(soft(H.box(0.55, 0.12, 0.55, H.clay(0xb55a4a), rx + dx, FY + 0.1, rz + 0.1)));   // 방석 2
  mergeByMaterial(THREE, g);
  return { group: g, windowMats };
}

/**
 * 🌿 정원 층(f=3) — 집 옆 야외 정원. 오른쪽 끝이 집 벽(문 포함)이고, 나머지 세 변은 낮은 담.
 *   바닥(잔디)은 buildRoom 이 만든다(여긴 바닥 윗면 y=0.2 위의 것만). 가구 자리인 한가운데는 비우고
 *   돌길·연못·나무·화단은 가장자리 쪽에 둔다.
 * @param {object} p { style:'modern'|'hanok', half:number, doorZ:number(문 중심 z), doorHalfW:number }
 * @returns {{ group, windowMats }}
 */
export function buildGardenFloor7(THREE, H, { style, half, doorZ, doorHalfW }) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const soft = (m) => { m.castShadow = false; return m; };
  const FY = 0.2, windowMats = [];
  const lit = (color, emissive, nightScale) => { const m = H.clay(color, { emissive, emissiveIntensity: 0 }); m.userData.nightScale = nightScale; windowMats.push(m); return m; };
  const lift = (fn) => { const n0 = g.children.length; fn(); for (let i = n0; i < g.children.length; i++) g.children[i].position.y += FY; };
  const hanok = style === 'hanok';
  const G = makeGarden(THREE, H, add);
  const wallMat = H.clay(INTERIOR7_WALL[style]), woodDark = H.clay(0x8a5a36), door = H.clay(hanok ? 0xa8733f : 0xb07a44);
  const stone = H.clay(0xcfc9ba), cap = H.clay(hanok ? 0x59636b : 0xf1f0ea);
  const wx = half - 0.15;   // 집 벽 중심 x

  // ── 집 벽(오른쪽 끝) + 문 ──
  const z0 = doorZ - doorHalfW, z1 = doorZ + doorHalfW;
  add(H.box(0.3, 3, z0 + half, wallMat, wx, FY + 1.5, (-half + z0) / 2));              // 문 위쪽(먼 쪽) 벽
  add(H.box(0.3, 3, half - z1, wallMat, wx, FY + 1.5, (z1 + half) / 2));               // 문 아래쪽(가까운 쪽) 벽
  add(H.box(0.3, 0.8, doorHalfW * 2, wallMat, wx, FY + 2.6, doorZ));                  // 문 위 린텔
  add(soft(H.box(0.14, 2.1, doorHalfW * 2 - 0.1, door, wx, FY + 1.05, doorZ)));        // 문짝
  if (hanok) {
    for (const z of [z0 - 0.1, z1 + 0.1]) add(H.box(0.22, 2.9, 0.2, woodDark, wx - 0.05, FY + 1.45, z));   // 문 기둥
    const paper = lit(0xfff1d2, 0xffd9a0, 0.8), lat = H.clay(0xb98a57);
    for (const z of [-4.2, -0.6]) {                                                    // 한지 창살 창 2
      add(soft(H.box(0.05, 1.4, 2.0, paper, wx - 0.17, FY + 1.7, z)));
      for (let i = 0; i <= 5; i++) add(soft(H.box(0.06, 1.4, 0.035, lat, wx - 0.2, FY + 1.7, z - 1.0 + (2.0 * i) / 5)));
      for (const dy of [-0.7, 0, 0.7]) add(soft(H.box(0.06, 0.04, 2.0, lat, wx - 0.2, FY + 1.7 + dy, z)));
    }
  } else {
    const glass = lit(0x24394a, 0xffc88a, 0.35), white = H.clay(0xffffff);
    for (const z of [-4.0, -0.4]) {                                                    // 통창 2 + 멀리언
      add(soft(H.box(0.05, 2.0, 3.0, glass, wx - 0.17, FY + 1.5, z)));
      for (const dz of [-1.5, 0, 1.5]) add(soft(H.box(0.07, 2.05, 0.07, white, wx - 0.2, FY + 1.5, z + dz)));
    }
  }
  // 문 앞 디딤(돌 한 장)
  add(soft(H.box(1.2, 0.08, 1.5, stone, wx - 0.95, FY + 0.04, doorZ)));

  // ── 낮은 담(먼 변·가까운 변·왼쪽 변) ──
  const low = (cx, cz, w, d) => { add(H.box(w, 0.55, d, hanok ? stone : wallMat, cx, FY + 0.28, cz)); add(soft(H.box(w + 0.06, 0.07, d + 0.08, cap, cx, FY + 0.58, cz))); };
  low(0, -half + 0.1, (half - 0.3) * 2, 0.2); low(0, half - 0.1, (half - 0.3) * 2, 0.2); low(-half + 0.1, 0, 0.2, (half - 0.3) * 2);

  // ── 정원 ──  촘촘하게: 가장자리에 구역(연못·개울·누각·텃밭·쉼터)을 빽빽이, 가운데(x±3 · z -2~3)는 가구 자리라 납작한 것만
  const rnd = (i) => { const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
  const patchD = H.clay(0x93cb6c), patchL = H.clay(0xb9e690);
  for (let i = 0; i < 9; i++) {   // 은은한 잔디 얼룩
    const x = (rnd(i) - 0.5) * (half * 2 - 3), z = (rnd(i + 40) - 0.5) * (half * 2 - 3), r = 0.45 + rnd(i + 80) * 0.5;
    const pt = G.cyl(r, r, 0.02, i % 2 ? patchD : patchL, x, FY + 0.012, z, 12); pt.castShadow = false;
  }
  const M = G.m, woodM = H.clay(0xb98a57), woodDk = H.clay(0x8a5a36), ropeM = H.clay(0xc9b48a), strawM = H.clay(0xd9a441), tileM = H.clay(hanok ? 0x6b7885 : 0xe9e3d6), whiteM = H.clay(0xf4f3ee);
  const soilM = M.soil, waterM = M.water;
  lift(() => {
    const put = G.put;
    // ─ 길: 문 → 연못 쪽 판석(끊기지 않게) + 쉼터 판 ─
    const path = [[wx - 1.3, doorZ], [wx - 2.3, doorZ + 0.15], [wx - 3.3, doorZ - 0.1], [wx - 4.3, doorZ - 0.6], [wx - 5.2, doorZ - 1.3], [wx - 6.0, doorZ - 2.1], [wx - 6.7, doorZ - 3.0], [wx - 7.3, doorZ - 4.0], [wx - 7.8, doorZ - 5.0], [wx - 8.2, doorZ - 6.0]];
    const slabMat = hanok ? stone : H.clay(0xe3dfd4);
    let k = 0;
    for (let seg = 0; seg < path.length - 1; seg++) {
      const [x0, z0] = path[seg], [x1, z1] = path[seg + 1], len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.55)), ang = Math.atan2(x1 - x0, z1 - z0);
      for (let t = 0; t < n; t++, k++) { const x = x0 + ((x1 - x0) * t) / n, z = z0 + ((z1 - z0) * t) / n; const sl = put(H.box(0.72, 0.05, 0.5, slabMat, x, 0.025, z), x, 0.025, z, false); sl.rotation.y = ang + (rnd(k) - 0.5) * 0.18; }
    }
    G.cyl(1.0, 1.05, 0.06, stone, -half + 3.6, 0.03, -1.0, 12).castShadow = false;
    // ─ 문 앞 아치(덩굴 장미) ─
    for (const dz of [-1.05, 1.05]) { put(H.box(0.1, 2.3, 0.1, hanok ? woodDk : whiteM, wx - 1.15, 1.15, doorZ + dz), wx - 1.15, 1.15, doorZ + dz); }
    put(H.box(0.12, 0.1, 2.3, hanok ? woodDk : whiteM, wx - 1.15, 2.32, doorZ), wx - 1.15, 2.32, doorZ, false);
    for (const dz of [-0.75, 0.75]) { const r = put(H.box(0.1, 0.08, 0.7, hanok ? woodDk : whiteM, wx - 1.15, 2.2, doorZ + dz * 0.85), wx - 1.15, 2.2, doorZ + dz * 0.85, false); r.rotation.x = dz > 0 ? -0.5 : 0.5; }
    for (let q = 0; q < 14; q++) { const dz = (q % 2 ? 1 : -1) * (0.9 + rnd(q) * 0.2), y = 0.4 + rnd(q + 5) * 1.9; G.ico(0.1 + rnd(q + 9) * 0.05, q % 3 ? M.leaf : M.flowers[(q % 2) ? 0 : 4], wx - 1.15 + (rnd(q + 3) - 0.5) * 0.2, y, doorZ + dz); }
    // ─ 생울타리: 왼쪽 + 가까운 변(그네·쉼터 자리는 비움) ─
    const leaf = hanok ? M.leafDark : M.leaf;
    const hedge = (x, z, w, d) => { put(H.box(w, 0.5, d, leaf, x, 0.25, z), x, 0.25, z, false); const n = Math.max(2, Math.round((w > d ? w : d) / 0.9)); for (let q = 0; q < n; q++) { const t = (q + 0.5) / n - 0.5; G.ico(0.34, M.leaf2, x + (w > d ? t * w : 0), 0.52, z + (w > d ? 0 : t * d)); } };
    hedge(-half + 0.55, -4.4, 0.5, 1.6); hedge(-half + 0.55, 5.0, 0.5, 2.4); hedge(-4.2, half - 0.55, 4.0, 0.5); hedge(2.6, half - 0.55, 2.6, 0.5);
    // ─ 잔디 풀잎·조약돌·꽃무리(전체에 촘촘히) ─
    for (let q = 0; q < 70; q++) { const x = (rnd(q + 100) - 0.5) * (half * 2 - 1.6), z = (rnd(q + 200) - 0.5) * (half * 2 - 1.6); if (x > wx - 0.8) continue; G.put(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14 + rnd(q) * 0.1, 4), q % 2 ? M.leaf2 : M.leafDark), x, 0.07, z, false); }
    for (let q = 0; q < 34; q++) { const x = (rnd(q + 300) - 0.5) * (half * 2 - 2), z = (rnd(q + 400) - 0.5) * (half * 2 - 2); if (x > wx - 0.9) continue; const rk = G.ico(0.045 + rnd(q) * 0.04, q % 2 ? M.rock : M.rockDark, x, 0.04, z); rk.scale.y = 0.6; }
    const clusters = [[-2.2, -6.0], [0.9, -5.9], [5.3, 3.4], [-5.4, -5.3], [2.4, 5.6], [-0.4, 3.6], [-6.0, 2.0], [4.6, -3.2], [-2.6, 1.9], [1.8, 1.4], [3.2, -1.6], [-1.2, -1.2]];
    clusters.forEach(([cx, cz], c) => { for (let q = 0; q < 8; q++) { const a = q * 0.8 + c, r = 0.15 + rnd(q + c * 9) * 0.5, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (x > wx - 0.7) continue; G.cyl(0.012, 0.012, 0.16, M.leafDark, x, 0.09, z, 4); G.ico(0.065, M.flowers[(q + c) % M.flowers.length], x, 0.2, z); } });
    for (let q = 0; q < 40; q++) {   // 길가 꽃
      const base = path[q % path.length], side = q % 2 ? 1 : -1;
      const x = base[0] + side * (0.55 + rnd(q) * 0.5) + (rnd(q + 7) - 0.5) * 0.4, z = base[1] + side * (0.4 + rnd(q + 3) * 0.5);
      if (x > wx - 0.7 || x < -half + 0.6 || z < -half + 0.6 || z > half - 0.7) continue;
      G.cyl(0.012, 0.012, 0.16, M.leafDark, x, 0.09, z, 4); G.ico(0.065, M.flowers[q % M.flowers.length], x, 0.2, z);
    }
    // ─ 개울: 연못 → 동쪽으로 흐르는 얕은 물길 + 다리 ─
    const sx0 = -half + 3.6 + 1.9, sx1 = 1.7, sz = -half + 1.1;
    put(H.box(sx1 - sx0, 0.03, 0.8, M.waterBed, (sx0 + sx1) / 2, 0.02, sz), (sx0 + sx1) / 2, 0.02, sz, false);
    put(H.box(sx1 - sx0, 0.03, 0.7, waterM, (sx0 + sx1) / 2, 0.06, sz), (sx0 + sx1) / 2, 0.06, sz, false);
    for (let q = 0; q < 9; q++) { const x = sx0 + (q / 8) * (sx1 - sx0); for (const dz of [-0.45, 0.45]) { const rk = G.ico(0.12 + rnd(q + dz * 5) * 0.06, q % 2 ? M.rock : M.rockDark, x, 0.08, sz + dz); rk.scale.y = 0.6; } }
    const bx = (sx0 + sx1) / 2 + 0.2;
    if (hanok) {   // 돌다리
      put(H.box(1.5, 0.14, 1.1, stone, bx, 0.3, sz), bx, 0.3, sz); for (const dx of [-0.6, 0.6]) put(H.box(0.2, 0.3, 1.0, stone, bx + dx, 0.15, sz), bx + dx, 0.15, sz);
      for (const dz of [-0.5, 0.5]) for (const dx of [-0.65, 0.65]) put(H.box(0.12, 0.28, 0.12, stone, bx + dx, 0.5, sz + dz), bx + dx, 0.5, sz + dz);
    } else {       // 나무 다리
      for (let q = 0; q < 6; q++) put(H.box(0.2, 0.05, 1.1, woodM, bx - 0.65 + q * 0.26, 0.3, sz), bx - 0.65 + q * 0.26, 0.3, sz, false);
      for (const dz of [-0.52, 0.52]) { put(H.box(1.6, 0.05, 0.05, woodDk, bx, 0.55, sz + dz), bx, 0.55, sz + dz, false); for (const dx of [-0.75, 0, 0.75]) put(H.box(0.05, 0.28, 0.05, woodDk, bx + dx, 0.42, sz + dz), bx + dx, 0.42, sz + dz, false); }
      for (const dx of [-0.8, 0.8]) put(H.box(0.2, 0.25, 1.2, woodDk, bx + dx, 0.13, sz), bx + dx, 0.13, sz, false);
    }
    // ─ 연못 + 폭포 바위 + 연잎 ─
    const px = -half + 3.4, pzp = -half + 3.0;
    G.pond(px, pzp, hanok ? 2.0 : 1.8, hanok ? 1.25 : 1.15);
    for (let q = 0; q < 6; q++) G.ico(0.22 + rnd(q) * 0.16, q % 2 ? M.rock : M.rockDark, px - 1.5 + (q % 3) * 0.28, 0.2 + (q > 2 ? 0.28 : 0), pzp - 0.9 - (q % 2) * 0.2);   // 폭포 바위
    put(H.box(0.4, 0.5, 0.05, waterM, px - 1.3, 0.38, pzp - 0.8), px - 1.3, 0.38, pzp - 0.8, false);
    for (let q = 0; q < 4; q++) { G.cyl(0.14, 0.14, 0.015, M.leaf2, px + (rnd(q + 60) - 0.4) * 2.0, 0.11, pzp + (rnd(q + 70) - 0.5) * 1.2, 8); }
    if (hanok) for (const [dx, dz] of [[0.5, 0.2], [-0.5, -0.1], [0.1, 0.55]]) { G.ico(0.09, M.flowers[0], px + dx, 0.16, pzp + dz); }
    // ─ 누각(NE): 모던 파고라 / 한옥 정자 ─
    const kx = 3.9, kz = -4.6;
    if (hanok) {
      put(H.box(3.0, 0.3, 2.6, H.clay(0xc9a56e), kx, 0.15, kz), kx, 0.15, kz, false);
      for (const a of [-1, 1]) for (const b of [-1, 1]) put(H.box(0.16, 2.3, 0.16, woodDk, kx + a * 1.3, 1.4, kz + b * 1.1), kx + a * 1.3, 1.4, kz + b * 1.1);
      [[3.7, 0.16, 3.3], [2.8, 0.2, 2.4], [1.7, 0.2, 1.4], [0.7, 0.18, 0.5]].forEach(([w, h, d], q) => put(H.box(w, h, d, tileM, kx, 2.7 + q * 0.2, kz), kx, 2.7 + q * 0.2, kz, false));
      G.bench(kx, kz + 0.7, 0); for (const a of [-1, 1]) G.cyl(0.05, 0.06, 0.4, ropeM, kx + a * 1.0, 0.5, kz - 0.7, 6);   // 난간 대
      G.ico(0.14, M.lanternGlow, kx, 2.35, kz);
    } else {
      for (const a of [-1, 1]) for (const b of [-1, 1]) put(H.box(0.14, 2.4, 0.14, whiteM, kx + a * 1.35, 1.2, kz + b * 1.05), kx + a * 1.35, 1.2, kz + b * 1.05);
      for (const b of [-1, 1]) put(H.box(3.0, 0.1, 0.16, whiteM, kx, 2.45, kz + b * 1.05), kx, 2.45, kz + b * 1.05, false);
      for (let q = 0; q < 9; q++) put(H.box(0.1, 0.08, 2.4, woodM, kx - 1.3 + q * 0.325, 2.52, kz), kx - 1.3 + q * 0.325, 2.52, kz, false);
      put(H.box(1.6, 0.04, 1.4, whiteM, kx, 0.02, kz), kx, 0.02, kz, false);
      G.bench(kx, kz - 0.6, Math.PI); put(H.box(0.6, 0.4, 0.6, whiteM, kx, 0.2, kz + 0.2), kx, 0.2, kz + 0.2);
      G.plant(kx - 1.3, kz + 1.3, 1.1); G.plant(kx + 1.3, kz + 1.3, 1.1);
      for (const a of [-0.8, 0.8]) { G.cyl(0.006, 0.006, 0.4, ropeM, kx + a, 2.25, kz, 3); G.ico(0.11, M.lanternGlow, kx + a, 2.0, kz); }   // 매단 등
    }
    // ─ 텃밭(동쪽): 모던 = 높은 화단 3 + 격자 / 한옥 = 이랑 3 + 말뚝 ─
    const gx = 5.0;
    if (hanok) {
      for (let q = 0; q < 3; q++) { const z = -1.8 + q * 1.15; put(H.box(1.5, 0.16, 0.7, soilM, gx, 0.08, z), gx, 0.08, z, false); for (let c = 0; c < 4; c++) { G.ico(0.15, c % 2 ? M.leaf2 : M.leaf, gx - 0.55 + c * 0.37, 0.24, z); } G.cyl(0.015, 0.015, 0.6, woodDk, gx + 0.7, 0.3, z, 4); }
    } else {
      for (let q = 0; q < 3; q++) { const z = -1.8 + q * 1.15; put(H.box(1.5, 0.4, 0.7, woodM, gx, 0.2, z), gx, 0.2, z); put(H.box(1.38, 0.05, 0.58, soilM, gx, 0.42, z), gx, 0.42, z, false); for (let c = 0; c < 4; c++) { put(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), M.leaf), gx - 0.55 + c * 0.37, 0.6, z, false); G.ico(0.06, M.flowers[(q + c) % 5], gx - 0.55 + c * 0.37, 0.78, z); } }
      put(H.box(0.04, 1.4, 0.04, woodDk, gx + 0.85, 1.0, -1.8), gx + 0.85, 1.0, -1.8, false); put(H.box(0.04, 1.4, 0.04, woodDk, gx + 0.85, 1.0, 0.5), gx + 0.85, 1.0, 0.5, false);
      for (let q = 0; q < 4; q++) put(H.box(0.03, 0.03, 2.3, woodDk, gx + 0.85, 0.5 + q * 0.3, -0.65), gx + 0.85, 0.5 + q * 0.3, -0.65, false);   // 덩굴 격자
      G.cyl(0.1, 0.12, 0.2, M.pot, gx - 0.4, 0.1, 1.45, 8); G.cyl(0.015, 0.015, 0.2, M.pot, gx - 0.28, 0.2, 1.45, 4);   // 물뿌리개
    }
    // ─ 서쪽 쉼터: 모던 = 화덕 + 통나무 의자 + 그네 / 한옥 = 평상 + 소반 + 소나무 ─
    if (hanok) {
      const fx = -5.0, fz = 2.4;
      for (const a of [-1, 1]) for (const b of [-1, 1]) put(H.box(0.12, 0.34, 0.12, woodDk, fx + a * 1.0, 0.17, fz + b * 0.6), fx + a * 1.0, 0.17, fz + b * 0.6, false);
      put(H.box(2.3, 0.1, 1.5, woodM, fx, 0.4, fz), fx, 0.4, fz); put(H.box(2.0, 0.025, 1.2, strawM, fx, 0.46, fz), fx, 0.46, fz, false);   // 평상 + 돗자리
      put(H.box(0.6, 0.22, 0.45, woodDk, fx + 0.4, 0.58, fz), fx + 0.4, 0.58, fz); G.cyl(0.08, 0.1, 0.12, M.pot, fx + 0.3, 0.75, fz, 8); G.ico(0.045, M.pot, fx + 0.3, 0.84, fz); G.cyl(0.03, 0.03, 0.05, M.pot, fx + 0.5, 0.74, fz, 6);   // 소반·주전자·찻잔
      put(H.box(0.5, 0.1, 0.5, H.clay(0xb55a4a), fx - 0.6, 0.5, fz + 0.1), fx - 0.6, 0.5, fz + 0.1, false);                                            // 방석
      G.pine(-half + 1.0, 1.6, 1.4);
    } else {
      const fx = -4.4, fz = 0.8;
      for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2; const rk = G.ico(0.17, q % 2 ? M.rock : M.rockDark, fx + Math.cos(a) * 0.6, 0.12, fz + Math.sin(a) * 0.6); rk.scale.y = 0.8; }
      G.ico(0.18, H.clay(0xff9a3e, { emissive: 0xff6a1e, emissiveIntensity: 0.9 }), fx, 0.14, fz); for (const a of [0.5, 2.6]) { const lg = G.cyl(0.07, 0.07, 0.5, woodDk, fx, 0.1, fz, 6); lg.rotation.z = 1.4; lg.rotation.y = a; }
      for (const a of [0.3, 2.4, 4.4]) G.cyl(0.2, 0.2, 0.34, woodM, fx + Math.cos(a) * 1.4, 0.17, fz + Math.sin(a) * 1.4, 8);   // 통나무 의자
      const tx = -5.4, tz = 3.6; G.tree(tx, tz, 1.7);   // 그네 나무
      for (const dx of [-0.3, 0.3]) G.cyl(0.008, 0.008, 1.5, ropeM, tx + 0.55 + dx, 1.35, tz + 0.2, 3);
      put(H.box(0.7, 0.05, 0.25, woodM, tx + 0.55, 0.62, tz + 0.2), tx + 0.55, 0.62, tz + 0.2, false); put(H.box(0.04, 0.04, 0.9, woodDk, tx + 0.5, 2.05, tz), tx + 0.5, 2.05, tz, false);
    }
    // ─ 남쪽: 새 물그릇 / 장독·우물 ─
    if (hanok) {
      for (const [x, z, kk] of [[-half + 0.9, -0.4, 1.1], [-half + 1.7, 0.0, 0.9], [-half + 0.9, 0.5, 0.8], [-half + 1.6, 0.8, 1.0], [-half + 0.9, 1.1, 0.7]]) { G.cyl(0.3 * kk, 0.34 * kk, 0.55 * kk, M.pot, x, 0.28 * kk, z, 8); G.cyl(0.2 * kk, 0.3 * kk, 0.14 * kk, strawM, x, 0.62 * kk, z, 8); }
      const wx2 = 5.3, wz2 = 3.4;   // 우물
      for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2; put(H.box(0.3, 0.45, 0.28, stone, wx2 + Math.cos(a) * 0.48, 0.23, wz2 + Math.sin(a) * 0.48), wx2 + Math.cos(a) * 0.48, 0.23, wz2 + Math.sin(a) * 0.48).rotation.y = -a; }
      G.cyl(0.4, 0.4, 0.04, waterM, wx2, 0.28, wz2, 10); for (const a of [-1, 1]) G.put(H.box(0.08, 1.2, 0.08, woodDk, wx2 + a * 0.6, 0.7, wz2), wx2 + a * 0.6, 0.7, wz2);
      G.put(H.box(1.5, 0.1, 0.9, tileM, wx2, 1.38, wz2), wx2, 1.38, wz2, false); G.put(H.box(1.0, 0.1, 0.55, tileM, wx2, 1.5, wz2), wx2, 1.5, wz2, false);
      G.cyl(0.1, 0.08, 0.14, woodDk, wx2 + 0.45, 0.9, wz2, 6);   // 두레박
      G.lantern(-half + 1.0, -2.2); G.lantern(wx - 1.2, doorZ - 1.6); G.lantern(wx - 3.3, doorZ + 1.0); G.lantern(-2.4, 3.2);
      for (let q = 0; q < 14; q++) { const x = -half + 1.0 + (q % 7) * 0.45 + (q > 6 ? 0.2 : 0), z = -half + 0.7 + (q > 6 ? 0.5 : 0); G.cyl(0.04, 0.05, 2.4 + (q % 3) * 0.4, M.bamboo, x + 4.0, 1.2, z, 5); G.ico(0.2, M.leaf2, x + 4.0, 2.5 + (q % 3) * 0.4, z); }   // 대나무 숲(북쪽 길게)
      // 석가산(바위산)
      for (const [dx, dy, dz, r] of [[0, 0.2, 0, 0.5], [0.45, 0.18, 0.2, 0.4], [-0.4, 0.22, 0.25, 0.42], [0.1, 0.62, 0.05, 0.4], [-0.1, 0.95, 0, 0.3]]) { const rk = G.ico(r, rnd(dx * 9 + 3) > 0.5 ? M.rock : M.rockDark, -half + 1.2 + dx, dy, -half + 1.2 + dz); rk.scale.y = 0.85; }
      G.pine(-half + 1.2, -half + 1.2, 0.6);
      G.pine(-half + 0.9, 3.8, 1.2); G.tree(1.3, -half + 1.3, 1.15, M.blossom); G.pine(-half + 1.0, half - 1.2, 1.1); G.tree(wx - 0.9, -half + 0.9, 1.2, M.blossom); G.bush(-2.0, 5.7, 0.4); G.bush(0.6, 5.8, 0.35);
      for (let q = 0; q < 7; q++) G.bush(-half + 1.3 + q * 0.9, -half + 0.9, 0.28, q % 2 ? M.leaf2 : M.leafDark);
    } else {
      const bx2 = -1.7, bz2 = 5.35;   // 새 물그릇
      G.cyl(0.14, 0.2, 0.55, whiteM, bx2, 0.28, bz2, 8); G.cyl(0.4, 0.2, 0.12, whiteM, bx2, 0.6, bz2, 10); G.cyl(0.32, 0.32, 0.03, waterM, bx2, 0.66, bz2, 10); G.ico(0.05, M.flowers[1], bx2 + 0.15, 0.7, bz2);
      G.bench(1.9, 5.9, 0); G.plant(0.8, 5.9, 1.3); G.plant(3.0, 5.9, 1.3);
      for (let q = 0; q < 4; q++) { const x = -4.4 + q * 0.8; G.cyl(0.1, 0.13, 0.22, M.pot, x, 0.11, 5.9, 8); G.ico(0.18, q % 2 ? M.leaf2 : M.leaf, x, 0.36, 5.9); }
      G.lantern(wx - 1.2, doorZ - 1.6); G.lantern(wx - 3.3, doorZ + 1.0); G.lantern(-2.4, 3.2); G.lantern(-half + 1.0, -1.8);
      for (let q = 0; q < 10; q++) { G.ico(0.13, q % 2 ? M.leaf : M.leaf2, -half + 1.0 + (q % 5) * 0.4, 0.15, -half + 1.0 + Math.floor(q / 5) * 0.4 - 0.7); }   // 장식 풀(관엽)
      G.tree(-half + 1.0, -half + 1.0, 1.55); G.tree(-half + 1.1, half - 1.4, 1.5); G.tree(1.3, -half + 1.3, 1.2, M.blossom); G.tree(wx - 0.9, -half + 0.9, 1.35, M.blossom);
      G.bed(-1.0, -half + 2.0, 3.0, 0.7, 14); G.bed(-half + 1.0, -2.6, 0.7, 2.0, 9);
      G.bush(-2.4, 5.7, 0.4); G.bush(0.6, 5.5, 0.35, M.leaf);
    }
  });
  mergeByMaterial(THREE, g);
  return { group: g, windowMats };
}
