// js/cosmetics/trail.js
// =============================================================
//  calm forest · 👣 발자국 자취
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §4-4·§14
//  ▶ 검수: sims/cosmetic-sim.html — **이 파일을 import 한다.** 복제본을 두지 않는다.
//  ▶ THREE 를 인자로 받는다 — 시뮬(CDN)과 게임 번들이 각자 자기 THREE 를 넘긴다.
//
//  ⚠️ 자국 하나는 **단일 메시**다(스펙 §14). 조형을 메시 여러 개로 두면 12개 상한에서
//     반짝이 7×12 = 84 드로우콜 — 마을 기준선 567 에서 15% 가 늘어난다.
//     그래서 조형은 시뮬 그대로 만들되 **한 번 굽고 합친다**:
//       ① 색이 여럿이면 **정점색** 으로 싣는다 — 🦊여우 꼬리·js/duel/art.js 와 같은 문법
//       ② 부분마다 다른 투명도(⭐떠오르는 별 0.7/0.45/0.25 · ✨알갱이 · 💧파문 0.7)는
//          **정점색의 알파**(itemSize 4 → USE_COLOR_ALPHA)에 **비율**로 싣는다.
//          material.opacity 는 자국 전체의 o 를 그대로 들고 있으므로 페이드는
//          **재질 opacity 하나만 움직이면** 된다(1.2초).
//     ⚠️ mergeGeometries(three/addons)를 쓰지 않는다 — 시뮬 importmap 에는 "three" 하나만
//        있고 게임 번들도 addons 를 조형 모듈에 끌어오지 않는다. js/duel/art.js 의
//        mergeGeos 구현을 그대로 쓴다(정점색까지 합치는 같은 코드).
// =============================================================

import { PALETTE as P, petalOf, put } from './art.js';

export const TRAIL_S = 0.10;      // 자국 하나의 기준 반지름(월드) — 1차엔 0.34 로 캐릭터 몸통만 했다
export const TRAIL_CAP = 12;      // 동시 표시 상한
export const TRAIL_STEP = 0.6;    // 이만큼 이동할 때마다 하나
export const TRAIL_FADE = 1.2;    // 초
export const TRAIL_SIDE = 0.075;  // 좌우 번갈아 — 한 줄이면 자국이 아니라 점선이다

const CACHE = new WeakMap();
function marksFor(THREE) {
  let t = CACHE.get(THREE);
  if (!t) { t = makeMarks(THREE); CACHE.set(THREE, t); }
  return t;
}

function makeMarks(THREE) {
  const film = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0, transparent: true, opacity: o, depthWrite: false });
  const petalMesh = (len, wide, mat) => petalOf(THREE, len, wide, mat);

  // =============================================================
  //  👣 발자국 — 앵커가 아니라 월드 이펙트. 걸어온 자취를 흐려지며 남긴다
  //     스펙 §4-4: 0.6 이동마다 1개 · 1.2초 페이드 · 동시 12개 상한 · 풀 재사용
  // =============================================================
  //  ⚠️ 1차 자국은 **캐릭터 몸통만 했다**(꽃 하나가 0.34 폭 — 플레이어 몸 반지름이 0.52).
  //     발자국은 작아야 발자국이다. s 는 자국 하나의 반지름 기준(≈0.10 월드 단위).
  const TRAIL = {
    //  ▶ 🐾 발바닥은 **동물마다 다르다**. 같은 자국을 7종이 공유하면 "내 캐릭터가 남긴 것"이
    //    아니라 그냥 스티커가 된다. 상품은 하나지만 조형은 캐릭터를 따라간다.
    paw: (g, s, o, id) => {     // ⚠️ id = animalId. 없으면(카탈로그 미리보기 등) 포유류 기본형으로 그린다
      const m = film(P.paw, o);
      const oval = (r, sx, sz, x, z) => {
        const t = put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 9, 6), m), x, 0.006, z, false);
        t.scale.set(sx, 0.10, sz); return t;
      };

      if (id === 'chick') {                    // 🐤 새발자국 — 앞 3갈래 + 뒤 1갈래. 패드가 없다
        [-0.62, 0, 0.62].forEach(A => {
          const t = put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.14, s * 0.02, s * 0.92), m),
                        Math.sin(A) * s * 0.34, 0.006, s * 0.30 + Math.cos(A) * s * 0.14, false);
          t.rotation.y = -A;
        });
        put(g, new THREE.Mesh(new THREE.BoxGeometry(s * 0.12, s * 0.02, s * 0.42), m), 0, 0.006, -s * 0.34, false);
        return;
      }
      if (id === 'rabbit') {                   // 🐰 뒷발이 길다 — 발가락은 작고 패드가 길쭉하다
        oval(s * 0.64, 0.76, 1.55, 0, -s * 0.10);
        [-0.30, -0.10, 0.10, 0.30].forEach(x =>
          oval(s * 0.17, 1, 1.25, x * s * 1.6, s * 0.86));
        return;
      }
      // 🦊🐶🐱🐻🐼 포유류 — 패드 하나 + 발가락 4개. 곰·판다는 크고 뭉툭하다
      const big = id === 'bear' || id === 'panda';
      oval(s * (big ? 0.74 : 0.62), 1, 0.86, 0, -s * 0.12);
      [-1.02, -0.36, 0.36, 1.02].forEach(A =>
        oval(s * (big ? 0.31 : 0.26), 1, 1.15, Math.sin(A) * s * (big ? 0.82 : 0.72), s * 0.56 + Math.cos(A) * s * 0.20));
    },
    flower: (g, s, o) => {      // 🌸 꽃 — 꽃잎이 겹치면 덩어리가 된다. 간격을 벌리고 작게
      for (let i = 0; i < 5; i++) {
        const A = (i / 5) * Math.PI * 2;
        const pt = petalMesh(s * 0.46, 0.60, film(i % 2 ? P.petal : P.petalB, o));
        put(g, pt, Math.cos(A) * s * 0.52, 0.004, Math.sin(A) * s * 0.52, false);
        pt.rotation.set(0, -A, 0);
      }
      put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(s * 0.24, 0), film(P.pollen, o)), 0, 0.008, 0, false);
    },
    star: (g, s, o) => {        // ⭐ 별 — 바닥 별 + 떠오르는 작은 별. 특별 등급
      //  ⚠️ 팔면체를 누르면 **마름모**다. 삼각 둘을 엇갈려야 6각 별로 읽힌다.
      const sixStar = (size, mat, y) => [0, Math.PI / 3].forEach(rot => {
        const t = put(g, new THREE.Mesh(new THREE.ConeGeometry(size, size * 0.24, 3), mat), 0, y, 0, false);
        t.rotation.set(Math.PI / 2, 0, rot); t.scale.set(1, 1, 0.5);
      });
      sixStar(s * 0.92, film(P.star, o), 0.006);
      // 떠오르는 별 — 위로 갈수록 작고 옅게. 이게 "특별" 등급의 값어치다
      [[0.20, 0.55, 0.7], [0.34, 0.38, 0.45], [0.46, 0.26, 0.25]].forEach(([y, k, a]) => {
        const t = put(g, new THREE.Mesh(new THREE.ConeGeometry(s * k, s * k * 0.24, 3), film(P.starLit, o * a)),
                      s * (y * 1.4 - 0.3), y, s * 0.3, false);
        t.rotation.set(Math.PI / 2, 0, y * 5); t.scale.set(1, 1, 0.5);
      });
    },
    sparkle: (g, s, o) => {     // ✨ 반짝이 — 바닥 자국 없이 **빛 알갱이만 떠오른다**. 가장 비싼 등급
      //  ⚠️ 블룸 임계(0.85)를 넘는 색을 넓게 칠하면 후광이 형태를 삼킨다.
      //     알갱이는 작아서 살짝 밝아도 반짝임으로 읽힌다 — 그래도 임계 아래로 맞춘다.
      put(g, new THREE.Mesh(new THREE.CircleGeometry(s * 0.70, 14), film(P.sparkLit, o * 0.20)), 0, 0.004, 0, false)
        .rotation.x = -Math.PI / 2;
      // 알갱이 6개 — 그 이상은 촘촘해져 환공포증으로 읽힌다
      [[-0.5, 0.10, 0.3, 0.30], [0.4, 0.22, -0.2, 0.26], [-0.2, 0.36, -0.4, 0.22],
       [0.6, 0.48, 0.3, 0.18], [-0.6, 0.60, 0.1, 0.14], [0.2, 0.74, -0.3, 0.11]]
        .forEach(([x, y, z, k], i) => {
          const m = put(g, new THREE.Mesh(new THREE.OctahedronGeometry(s * k, 0), film(i % 2 ? P.spark : P.sparkLit, o * (1 - y * 0.8))),
                        s * x, s * y * 3.4, s * z, false);
          m.rotation.set(0.4 * i, 0.7 * i, 0.2 * i); m.scale.set(1, 1.5, 1);
        });
    },
    drop: (g, s, o) => {        // 💧 물방울 — 젖은 자국 + 퍼지는 파문 한 겹
      const wet = put(g, new THREE.Mesh(new THREE.SphereGeometry(s * 0.52, 12, 8), film(P.drop, o)), 0, 0.005, 0, false);
      wet.scale.set(1, 0.09, 1.12);
      const ring = put(g, new THREE.Mesh(new THREE.TorusGeometry(s * 0.88, s * 0.07, 4, 18), film(P.dropLit, o * 0.7)), 0, 0.004, 0, false);
      ring.rotation.x = Math.PI / 2;
    },
  };

  return TRAIL;
}

/** 정점색(rgb + 알파 비율) — itemSize 4 라 three 가 USE_COLOR_ALPHA 로 굽는다 */
function paintRGBA(THREE, geo, color, alpha) {
  const n = geo.attributes.position.count, arr = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { arr[i * 4] = color.r; arr[i * 4 + 1] = color.g; arr[i * 4 + 2] = color.b; arr[i * 4 + 3] = alpha; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 4));
  return geo;
}

/** js/duel/art.js 의 mergeGeos 와 같은 구현 — three/addons 없이 정점색까지 합친다 */
function mergeGeos(THREE, geos) {
  const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    if (!flat[0].attributes[name]) continue;
    const size = flat[0].attributes[name].itemSize;
    let total = 0;
    for (const g of flat) total += g.attributes[name].count;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

/** 조형용으로 만든 메시 더미 → 정점색 단일 메시 하나 */
function bake(THREE, src, opacity) {
  src.updateMatrixWorld(true);
  const geos = [];
  src.traverse(o => {
    if (!o.isMesh) return;
    const q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    q.applyMatrix4(o.matrixWorld);                       // 위치·회전·눌린 비율까지 구워 넣는다
    paintRGBA(THREE, q, o.material.color, opacity > 0 ? o.material.opacity / opacity : 1);
    geos.push(q);
  });
  const m = new THREE.Mesh(mergeGeos(THREE, geos), new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0,
    transparent: true, opacity, depthWrite: false,
  }));
  m.castShadow = false;
  return m;
}

/**
 * 자국 하나 → **단일 메시**. 색이 두 가지 이상이면 정점색으로 굽는다.
 * animalId 는 🐾발바닥에만 쓴다(🐰길쭉 · 🐻🐼크게 · 🐤세 갈래).
 */
export function buildTrailMark(THREE, itemId, opacity, animalId) {
  const TRAIL = marksFor(THREE);
  const g = new THREE.Group();
  const fn = TRAIL[itemId];
  if (!fn) return g;
  const src = new THREE.Group();
  fn(src, TRAIL_S, opacity, animalId);
  g.add(bake(THREE, src, opacity));
  return g;
}
