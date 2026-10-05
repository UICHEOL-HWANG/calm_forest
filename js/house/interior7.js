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
export function buildInterior7(THREE, H, { style, half, ground }) {
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
  const lift = (fn) => { const n0 = g.children.length; fn(); for (let i = n0; i < g.children.length; i++) g.children[i].position.y += FY; };

  if (style === 'hanok') {
    const wood = H.clay(0x8a5a36), woodLight = H.clay(0xb98a57), paper = lit(0xfff1d2, 0xffd9a0, 0.8);
    // 벽 하부 판자(wainscot): 먼 벽(문 틈 제외)·좌우 벽
    const band = (cx, cz, w, d) => add(soft(H.box(w, 0.9, d, wood, cx, FY + 0.45, cz)));
    if (ground) { band(-(half + gap) / 2, farZ, half - gap, 0.06); band((half + gap) / 2, farZ, half - gap, 0.06); }
    else band(0, farZ, half * 2 - 0.3, 0.06);
    band(-sideX, 0, 0.06, half * 2 - 0.3); band(sideX, 0, 0.06, half * 2 - 0.3);
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
    base(-sideX, 0, 0.05, half * 2 - 0.3); base(sideX, 0, 0.05, half * 2 - 0.3);
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
