// js/pet/art.js
// =============================================================
//  calm forest · 🐾 펫 조형 — 🍃 잎사귀 정령
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §10 (조형 규칙)
//  ▶ 검수: sims/pet-sim.html — **이 파일을 import 한다.** 복제본을 두지 않는다
//    (tool-tier-sim 에서 낚싯대 0단계 값이 갈려 역이식된 사고가 있었다).
//    시뮬에 남은 나머지 세 후보(✨정령·🐦새·🫘흙꼬마)는 **설계 기록**이다 —
//    고른 종만 여기로 옮긴다. 공통 헬퍼(put·eyesOf·leafOf·matsFor)는 이 파일이 단일 출처다.
//  ▶ THREE 를 인자로 받는다 — 시뮬(CDN)과 게임 번들이 각자 자기 THREE 를 넘긴다.
//
//  ▶ 왜 🍃 잎사귀 정령인가 (스펙 §15 열린 결정 — 여기서 닫았다):
//    · 1단계가 이미 **서 있는 생물**로 읽힌다. 🫘흙꼬마의 1단계는 땅에 놓인 돌멩이라
//      마을에 깔린 돌과 구분되지 않는다.
//    · 실루엣이 **위로 자란다**(잎 1장 → 3장 → 왕관 5장 + 망토) — 마을 거리에서도 단계가 읽힌다.
//    · **블룸 위험이 없다.** ✨정령의 starLit·sparkLit 은 임계 0.85 를 두 번 넘겼다.
//    · 식물 생물이라 플레이어 7종·일꾼·주민·방문객 도감과 **아무것도 겹치지 않는다**.
//
//  ▶ 조형 규칙(이 저장소에서 비싸게 배운 것들 · 스펙 §10):
//    · 부속을 꽂지 말고 **형태로 승격**한다 — 잎은 몸 안에서 자라 나온다.
//    · 눈은 **작고 어둡게**. 크고 흰 눈은 인형이 아니라 캐릭터가 된다.
//    · 면이 겹치면 줄무늬(z-fighting)가 인다 — 덮는 조각은 확실히 띄운다.
//    · 촘촘한 반복은 환공포증으로 읽힌다 — 잎·꽃잎은 6을 넘기지 않는다(왕관 5장).
//
//  ▶ ⚠️ 블룸 임계 0.85(js/tool-tiers.js BLOOM_LUMA) — PET_PALETTE 전 색이 그 아래다.
//    Rec.709 luma 최고값은 seed 0.816 이다. 색을 고치면 luma 를 다시 재라.
// =============================================================

/** 고른 종 — Task 13 의 구매가 이 값을 쓴다 */
export const PET_KIND = 'leaf';

export const PET_PALETTE = Object.freeze({
  // 🍃 잎사귀 정령 — 몸은 밝은 곡물색(흙꼬마의 회갈색과 대비)
  seed: 0xe6cf9a, leaf: 0x7fb857, leafLit: 0xa8d478, stem: 0x6e9b4a, bloom: 0xf0b8c8,
  // 공용
  eye: 0x2e241c,
});

const P = PET_PALETTE;

// ── 조형 공통 헬퍼 — 시뮬의 나머지 세 후보도 이 셋을 쓴다(복제본을 두지 않는다) ──
export const put = (parent, mesh, x, y, z, shadow = true) => { mesh.position.set(x, y, z); mesh.castShadow = shadow; parent.add(mesh); return mesh; };

/** 작고 어두운 눈 — 모든 방향이 이 하나를 공유한다(생김새가 갈리지 않게) */
export function eyesOf(THREE, g, { r = 0.022, x = 0.055, y = 0.0, z = 0.10 }) {
  const m = new THREE.MeshStandardMaterial({ color: P.eye, roughness: 0.5 });
  [-1, 1].forEach(s => put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), m), s * x, y, z, false));
}

/** 납작한 잎 한 장 — 구를 눌러 만든다(전용 지오메트리 없이 실루엣이 잎으로 읽히게) */
export function leafOf(THREE, len, wide, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(len, 7, 5), mat);
  m.scale.set(wide, 0.13, 1.0);
  return m;
}

/** 재질 — clay 저폴리 각진 면(돌·잎·부리) · plush 봉제인형 톤(몸통, 캐릭터와 같은 결) */
export function matsFor(THREE) { return tablesFor(THREE).mats; }

// =============================================================
//  조형 표 — THREE 마다 한 번만 굽는다(재질 헬퍼가 THREE 를 클로저로 잡는다)
// =============================================================
const CACHE = new WeakMap();
function tablesFor(THREE) {
  let t = CACHE.get(THREE);
  if (!t) { t = makeTables(THREE); CACHE.set(THREE, t); }
  return t;
}

function makeTables(THREE) {
  // ── 재질 ───────────────────────────────────────────────────
  const clay  = (c, flat = true) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, flatShading: flat });
  const plush = c => new THREE.MeshStandardMaterial({ color: c, roughness: 1.0, metalness: 0 });
  const leafMesh = (len, wide, mat) => leafOf(THREE, len, wide, mat);
  const eyes = (g, o) => eyesOf(THREE, g, o);

  // =============================================================
  //  🍃 ④ 잎사귀 정령 — 성장축: 잎 장수 + 망토
  //    정령의 신비로움에 "쓰다듬을 형태"를 더한 절충안. 몸은 씨앗이고 옷이 잎이다.
  // =============================================================
  function buildLeafling(st) {
    const g = new THREE.Group();
    const R = [0.125, 0.150, 0.172][st];
    const bodyY = R * 1.12 + 0.03;

    // 뿌리발 — 짧은 줄기 두 가닥. 지면에 닿는 점이 있어야 떠 보이지 않는다
    [-1, 1].forEach(s => {
      const l = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.07 + 0.015 * st, 5), clay(P.stem)), s * R * 0.34, 0.035 + 0.008 * st, 0);
      l.rotation.z = s * 0.10;
    });

    // 몸 — 씨앗. 세로로 늘려 "서 있는 것"으로 읽히게
    const body = put(g, new THREE.Mesh(new THREE.SphereGeometry(R, 18, 14), plush(P.seed)), 0, bodyY, 0);
    body.scale.set(0.86, 1.16, 0.86);
    eyes(g, { r: 0.020, x: R * 0.34, y: bodyY + R * 0.34, z: R * 0.80 });

    // ── 잎 ────────────────────────────────────────────────────
    //  ⚠️ leafMesh 의 장축은 **Z(수평)** 다. 1차 렌더에서 rotation.x 에 -0.42 를 줘
    //     잎을 세운 게 아니라 거의 눕혀 버렸고, 그래서 머리 위에 잎이 붕 떠 보였다.
    //     위로 세우려면 -π/2 쪽으로 가야 한다(-1.15 면 위로 66°, 바깥으로 살짝 벌어진다).
    //  ▶ 그리고 잎은 **몸 안에서 자라 나와야** 한다 — 안쪽 끝이 몸 표면 아래 묻히게
    //     중심을 잡는다. 그래야 "꽂은 것"이 아니라 "난 것"으로 읽힌다.
    const TOP = bodyY + R * 1.16;                 // 몸(세로 1.16 배) 꼭대기
    const crown = [1, 3, 5][st];
    for (let i = 0; i < crown; i++) {
      const t = i - (crown - 1) / 2;
      const len = R * (0.86 + 0.14 * st) * (1 - 0.13 * Math.abs(t));
      const lf = leafMesh(len, 0.44, clay(i % 2 ? P.leaf : P.leafLit));
      // 위로 0.42·len 만 올린다 → 안쪽 끝(−0.91·len)이 몸 속에 묻힌다
      put(g, lf, t * R * 0.22, TOP + len * 0.42 - Math.abs(t) * R * 0.06, -R * 0.06, false);
      lf.rotation.set(-1.15 + Math.abs(t) * 0.16, t * 0.52, t * 0.22);
    }

    // 팔 — 2단계부터. 줄기를 위로 벌려야 축 처진 인형이 되지 않는다
    if (st >= 1) {
      [-1, 1].forEach(s => {
        const arm = put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.013, R * 0.78, 5), clay(P.stem)), s * R * 0.72, bodyY + R * 0.30, 0, false);
        arm.rotation.z = s * 0.78;
        const hand = leafMesh(R * 0.30, 0.56, clay(P.leafLit));
        put(g, hand, s * R * 1.04, bodyY + R * 0.56, 0, false);
        hand.rotation.set(-0.5, 0, s * 0.8);
      });
    }

    // 겉껍질(husk) — 3단계만. 씨앗을 감싸던 껍질이 벌어진 모양.
    //   등에 판을 대는 게 아니라 **몸 아래를 감싸 올린다** — 이래야 망토가 몸에서 자란 것으로 보인다.
    if (st === 2) {
      //  ⚠️ 앞쪽(z+) 껍질은 얼굴을 덮어 버렸다 — 옆과 뒤에만 세운다
      [[-1, -0.62], [1, -0.62], [-1, -0.05], [1, -0.05]].forEach(([s, zk]) => {
        const husk = leafMesh(R * 1.02, 0.52, clay(P.leaf));
        put(g, husk, s * R * 0.62, bodyY - R * 0.30, zk * R, false);
        husk.rotation.set(-1.05 + zk * 0.5, 0, s * 1.05);
      });
      // 🌸 꽃 한 송이 — 1차엔 가슴 한가운데라 **분홍 코**로 읽혔다. 왕관 옆으로 옮긴다
      put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.032, 0), clay(P.bloom)), R * 0.46, TOP + R * 0.34, R * 0.10, false);
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, R * 0.34, 5), clay(P.stem)), R * 0.40, TOP + R * 0.14, R * 0.08, false);
    }
    return g;
  }

  return { mats: { clay, plush }, BUILD: { [PET_KIND]: buildLeafling } };
}

/** kind → 성장 단계(0·1·2) 조형 Group. 모르는 kind 면 null */
export function buildPet(THREE, kind, stage) {
  const { BUILD } = tablesFor(THREE);
  const fn = BUILD[kind];
  if (!fn) return null;
  return fn(stage);
}

/** 매 프레임 — userData 애니메이션 규약.
 *  🍃 잎사귀 정령은 흔들 것이 없어 첫 줄에서 바로 빠져나온다(공짜다).
 *  ▶ userData 규약: orbit[{mesh,rad,a,y,spd}] · pulse · air · ring.
 *    ✨정령 계열은 공전·맥동이 없으면 빛덩이가 아니라 **구슬**로 보인다 —
 *    빛나는 종을 나중에 붙이면 조형에서 이 규약만 채우면 된다.
 *  ▶ 위상은 pet3d.position 에서 딴다(시뮬의 그리드 좌표 c.x·c.z 와 같은 값이다) —
 *    같은 무대에 여러 마리가 서도 같은 박자로 맥동하지 않게. */
export function updatePetAnim(pet3d, t) {
  const u = pet3d.userData;
  if (!u.orbit) return;
  u.orbit.forEach(o => {
    const a = o.a + t * o.spd;
    o.mesh.position.set(Math.cos(a) * o.rad, o.y + Math.sin(t * 1.6 + o.a) * 0.018, Math.sin(a) * o.rad);
  });
  const s = 1 + Math.sin(t * 2.1 + pet3d.position.z) * 0.05;
  u.pulse.scale.set(s, 1.25 * s, s);
  u.air.position.y = Math.sin(t * 1.1 + pet3d.position.x) * 0.035;   // 바닥 빛무리는 g 에 있어 안 흔들린다
  if (u.ring) u.ring.rotation.z += 0.004;
}
