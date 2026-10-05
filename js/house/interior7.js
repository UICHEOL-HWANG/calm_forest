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

  // ── 정원 ──  (가운데는 가구 자리 — 길은 문에서 연못까지 대각선으로 흘러 가장자리를 돈다)
  const rnd = (i) => { const v = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
  // 잔디 얼룩(밝고 어두운 두 톤) — 한 가지 초록이 칙칙하게 보이던 문제
  const patchD = H.clay(0x93cb6c), patchL = H.clay(0xb9e690);
  for (let i = 0; i < 9; i++) {   // 은은한 얼룩 — 크지 않게(큰 다각형이 도드라지던 문제)
    const x = (rnd(i) - 0.5) * (half * 2 - 3), z = (rnd(i + 40) - 0.5) * (half * 2 - 3), r = 0.45 + rnd(i + 80) * 0.5;
    const pt = G.cyl(r, r, 0.02, i % 2 ? patchD : patchL, x, FY + 0.012, z, 12); pt.castShadow = false;
  }
  lift(() => {
    // 돌길: 문 → 연못 쪽으로 이어지는 촘촘한 판석(끊기지 않게) + 길 끝 둥근 쉼터 판
    const path = [[wx - 1.3, doorZ], [wx - 2.3, doorZ + 0.15], [wx - 3.3, doorZ - 0.1], [wx - 4.3, doorZ - 0.6], [wx - 5.2, doorZ - 1.3], [wx - 6.0, doorZ - 2.1], [wx - 6.7, doorZ - 3.0], [wx - 7.3, doorZ - 4.0], [wx - 7.8, doorZ - 5.0], [wx - 8.2, doorZ - 6.0]];
    const slabMat = hanok ? stone : H.clay(0xe3dfd4);
    let k = 0;
    for (let seg = 0; seg < path.length - 1; seg++) {   // 꺾이는 점 사이를 촘촘히 이어(0.55 간격) 끊기지 않는 길로
      const [x0, z0] = path[seg], [x1, z1] = path[seg + 1], len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.55)), ang = Math.atan2(x1 - x0, z1 - z0);
      for (let t = 0; t < n; t++, k++) {
        const x = x0 + ((x1 - x0) * t) / n, z = z0 + ((z1 - z0) * t) / n;
        const sl = G.put(H.box(0.72, 0.05, 0.5, slabMat, x, 0.025, z), x, 0.025, z, false); sl.rotation.y = ang + (rnd(k) - 0.5) * 0.18;
      }
    }
    G.cyl(1.0, 1.05, 0.06, stone, -half + 3.6, 0.03, -1.0, 12).castShadow = false;   // 쉼터 판
    // 낮은 생울타리(왼쪽·가까운 변 안쪽)
    const leaf = hanok ? G.m.leafDark : G.m.leaf;
    const hedge = (x, z, w, d) => { G.put(H.box(w, 0.5, d, leaf, x, 0.25, z), x, 0.25, z, false); const n = Math.max(2, Math.round((w > d ? w : d) / 0.9)); for (let k = 0; k < n; k++) { const t = (k + 0.5) / n - 0.5; G.ico(0.34, G.m.leaf2, x + (w > d ? t * w : 0), 0.52, z + (w > d ? 0 : t * d)); } };
    hedge(-half + 0.55, 0.6, 0.5, half * 2 - 3.0); hedge(-0.8, half - 0.55, half * 2 - 6.5, 0.5);
    // 꽃: 길 가장자리·울타리 앞에 무리지어(색 5종 — 재질 5개로 병합)
    for (let i = 0; i < 46; i++) {
      const base = path[i % path.length], side = i % 2 ? 1 : -1;
      const x = base[0] + side * (0.55 + rnd(i) * 0.5) + (rnd(i + 7) - 0.5) * 0.4, z = base[1] + side * (0.4 + rnd(i + 3) * 0.5);
      if (x > wx - 0.7 || x < -half + 0.6 || z < -half + 0.6 || z > half - 0.7) continue;
      G.cyl(0.012, 0.012, 0.16, G.m.leafDark, x, 0.09, z, 4); G.ico(0.065, G.m.flowers[i % G.m.flowers.length], x, 0.2, z);
    }
    if (hanok) {
      G.pond(-half + 3.4, -half + 3.0, 2.0, 1.25); for (let i = 0; i < 5; i++) G.bush(-half + 1.4 + i * 0.9, -half + 0.9, 0.3, i % 2 ? G.m.leaf2 : G.m.leafDark);
      G.pine(-half + 1.0, -half + 1.0, 1.35); G.pine(-half + 0.9, 3.8, 1.15); G.tree(1.2, -half + 1.2, 1.1, G.m.blossom);
      for (let i = 0; i < 8; i++) { const x = -half + 1.2 + i * 0.5, z = 1.6 + (i % 3) * 0.25; G.cyl(0.04, 0.05, 2.2 + (i % 3) * 0.4, G.m.bamboo, x, 1.1, z, 5); G.ico(0.2, G.m.leaf2, x, 2.3 + (i % 3) * 0.4, z); }
      for (const [x, z, k] of [[-half + 1.0, -2.2, 1], [-half + 1.7, -1.7, 0.8], [-half + 1.0, -1.2, 0.7]]) { G.cyl(0.3 * k, 0.34 * k, 0.55 * k, G.m.pot, x, 0.28 * k, z, 8); G.cyl(0.2 * k, 0.3 * k, 0.14 * k, G.m.rockDark, x, 0.62 * k, z, 8); }   // 장독대
      // 정자(작은 누각): 마루 + 기둥 4 + 기와 사모지붕 — 오른쪽 먼 모서리
      const px = 3.9, pz = -4.6, tile = H.clay(0x59636b), pil = H.clay(0x8a5a36), deck = H.clay(0xc9a56e);
      G.put(H.box(3.0, 0.3, 2.6, deck, px, 0.15, pz), px, 0.15, pz, false);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.put(H.box(0.16, 2.3, 0.16, pil, px + sx * 1.3, 1.4, pz + sz * 1.1), px + sx * 1.3, 1.4, pz + sz * 1.1);
      [[3.7, 0.16, 3.3], [2.8, 0.2, 2.4], [1.7, 0.2, 1.4], [0.7, 0.18, 0.5]].forEach(([w, h, d], k) => G.put(H.box(w, h, d, tile, px, 2.7 + k * 0.2, pz), px, 2.7 + k * 0.2, pz, false));
      G.bench(px, pz + 0.7, 0); G.lantern(px + 2.2, pz + 1.4); G.lantern(wx - 1.2, doorZ - 1.6);
    } else {
      G.pond(-half + 3.4, -half + 3.0, 1.8, 1.15); for (let i = 0; i < 5; i++) G.bush(-half + 1.5 + i * 0.9, -half + 0.9, 0.3, i % 2 ? G.m.leaf2 : G.m.leaf);
      G.tree(-half + 1.0, -half + 1.0, 1.5); G.tree(-half + 1.1, half - 1.4, 1.4); G.tree(1.2, -half + 1.2, 1.2, G.m.blossom); G.tree(wx - 0.9, -half + 1.0, 1.35, G.m.blossom);
      G.bed(-1.2, -half + 0.9, 3.4, 0.7, 14); G.bed(-half + 1.0, -2.4, 0.7, 2.6, 9);
      // 파고라: 기둥 4 + 상부 슬랫 + 벤치·탁자 — 오른쪽 먼 모서리
      const px = 3.9, pz = -4.6, post = H.clay(0xffffff), slat = H.clay(0xb98a57), tbl = H.clay(0xf1ece3);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.put(H.box(0.14, 2.4, 0.14, post, px + sx * 1.35, 1.2, pz + sz * 1.05), px + sx * 1.35, 1.2, pz + sz * 1.05);
      G.put(H.box(3.0, 0.1, 0.16, post, px, 2.45, pz - 1.05), px, 2.45, pz - 1.05, false); G.put(H.box(3.0, 0.1, 0.16, post, px, 2.45, pz + 1.05), px, 2.45, pz + 1.05, false);
      for (let i = 0; i < 9; i++) G.put(H.box(0.1, 0.08, 2.4, slat, px - 1.3 + i * 0.325, 2.52, pz), px - 1.3 + i * 0.325, 2.52, pz, false);
      G.put(H.box(1.6, 0.04, 1.4, tbl, px, 0.02, pz), px, 0.02, pz, false);   // 데크 판
      G.bench(px, pz - 0.6, Math.PI); G.put(H.box(0.6, 0.4, 0.6, tbl, px, 0.2, pz + 0.2), px, 0.2, pz + 0.2);
      G.plant(px - 1.3, pz + 1.3, 1.1); G.plant(px + 1.3, pz + 1.3, 1.1);
      G.lantern(wx - 1.2, doorZ - 1.6); G.lantern(-half + 1.0, -half + 3.0 + 1.8);
    }
  });
  mergeByMaterial(THREE, g);
  return { group: g, windowMats };
}
