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

  // ── 정원 ──
  lift(() => {
    G.stones([[wx - 1.6, doorZ - 0.1, 0.22], [wx - 2.7, doorZ - 0.5, 0.2], [wx - 3.8, doorZ - 0.9, 0.2], [wx - 4.9, doorZ - 1.4, 0.2], [wx - 6.0, doorZ - 1.9, 0.2], [wx - 7.0, doorZ - 2.4, 0.2]]);
    if (hanok) {
      G.pond(-half + 3.0, -half + 3.0, 1.9, 1.2);
      G.pine(-half + 1.0, -half + 1.0, 1.3); G.pine(-half + 1.1, 3.8, 1.1); G.tree(3.8, -half + 1.2, 1.1, G.m.blossom);
      for (let i = 0; i < 9; i++) { const x = 0.5 + i * 0.55, z = -half + 0.6 + (i % 2) * 0.25; G.cyl(0.04, 0.05, 2.4 + (i % 3) * 0.4, G.m.bamboo, x, 1.2, z, 5); G.ico(0.2, G.m.leaf2, x, 2.5 + (i % 3) * 0.4, z); }
      G.lantern(-half + 1.0, -1.6); G.lantern(wx - 1.2, doorZ - 1.6);
      for (const [x, z, s] of [[-half + 1.0, 0.4, 1], [-half + 1.7, 0.9, 0.8], [-half + 1.0, 1.4, 0.7]]) {   // 장독대
        G.cyl(0.3 * s, 0.34 * s, 0.55 * s, G.m.pot, x, 0.28 * s, z, 8); G.cyl(0.2 * s, 0.3 * s, 0.14 * s, G.m.rockDark, x, 0.62 * s, z, 8);
      }
      G.bush(-2.2, 5.6, 0.4);
    } else {
      G.pond(-half + 3.2, -half + 3.0, 1.7, 1.1);
      G.tree(-half + 1.0, -half + 1.0, 1.5); G.tree(-half + 1.1, half - 1.2, 1.4); G.tree(wx - 0.8, -half + 1.0, 1.4, G.m.blossom); G.tree(3.6, -half + 1.2, 1.1, G.m.blossom);
      G.bed(-0.8, -half + 0.9, 4.2, 0.7, 14); G.bed(wx - 0.9, 2.4 - 6, 0.7, 2.2, 8);
      G.bench(-half + 0.9, 0.6, Math.PI / 2); G.lantern(wx - 1.2, doorZ - 1.6); G.lantern(-half + 1.0, -1.8);
      G.bush(-2.4, 5.7, 0.4); G.bush(0.8, 5.8, 0.35, G.m.leaf);
    }
  });
  mergeByMaterial(THREE, g);
  return { group: g, windowMats };
}
