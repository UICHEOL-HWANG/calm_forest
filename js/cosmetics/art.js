// js/cosmetics/art.js
// =============================================================
//  calm forest · 🎀 꾸미기 조형
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §4·§11
//  ▶ 검수: sims/cosmetic-sim.html — **이 파일을 import 한다.** 복제본을 두지 않는다
//    (tool-tier-sim 에서 낚싯대 0단계 값이 갈려 역이식된 사고가 있었다).
//  ▶ THREE 를 인자로 받는다 — 시뮬(CDN)과 게임 번들이 각자 자기 THREE 를 넘긴다.
//  ▶ 앵커 수치(ringR·domeTheta·DOME_BOT·onSurf)는 **anchors.js 한 곳**에만 있다.
//  ▶ ⚠️ 블룸 임계 0.85 — PALETTE 전 색이 그 아래다. 색을 고치면 luma 를 다시 재라.
// =============================================================

import { ringR, domeTheta, DOME_BOT, onSurf } from './anchors.js';

export const PALETTE = Object.freeze({
  straw: 0xd9bd7e, strawDark: 0xb99a5c,
  petal: 0xf0b8c8, petalB: 0xc9d4ee, pollen: 0xe8c85e,
  leaf: 0x7fb857, leafLit: 0xa8d478, stem: 0x6e9b4a,
  wool: 0xd97b6c, woolDark: 0xb85f52,
  rope: 0xb08a5e,
  bell: 0xc9a227, bellLit: 0xd9bc5c, bellDark: 0x9c7a1c,   // 놋쇠 — tool-tiers 2단계 금색
  bow: 0xa8505f, bowDark: 0x7e3a48,
  canvas: 0xc2a882, canvasDark: 0x9c8462,
  cape: 0x7a8fc0, capeLine: 0xdcd0bc,
  star: 0xe8d06a, starLit: 0xe6ce78,
  spark: 0xd8c4f0, sparkLit: 0xdcccee,
  drop: 0x9fd0e0, dropLit: 0xb4d8e6,
  paw: 0xb5895f,
  wood: 0xbf9a68,
  shroomCap: 0xc4634f, shroomDot: 0xdccfb8,
});

const P = PALETTE;

// ── 조형 공통 헬퍼 — 👣 trail.js 도 이 두 개를 쓴다(복제본을 두지 않는다) ──
export const put = (p, m, x, y, z, shadow = true) => { m.position.set(x, y, z); m.castShadow = shadow; p.add(m); return m; };
/** 납작한 잎/꽃잎 한 장 — 구를 눌러 만든다(전용 지오메트리 없이 실루엣이 잎으로 읽히게) */
export const petalOf = (THREE, len, wide, mat) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(len, 7, 5), mat);
  m.scale.set(wide, 0.14, 1.0);
  return m;
};

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
  const clay = (c, flat = true) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, flatShading: flat });
  const soft = c => new THREE.MeshStandardMaterial({ color: c, roughness: 1.0, metalness: 0 });
  const petalMesh = (len, wide, mat) => petalOf(THREE, len, wide, mat);

  // ── ⚡ 재질별 병합 — js/pet/art.js(펫 20메시→4)·js/shop/building.js(가게 47→6) 와 같은 구현 ──
  //  ⚠️ 파츠를 메시 하나씩 두면 세 슬롯을 다 입었을 때 **+40 콜**이다(💐화관 혼자 +21).
  //     계획 예산은 +12 라 **재질별로 지오메트리를 합친다** — 색은 정점에 실어(paintGeo)
  //     색이 달라도 한 재질로 묶인다. **좌표·회전·색은 한 글자도 안 바뀐다**
  //     (메시의 행렬을 지오메트리에 구워 넣을 뿐이다 — 삼각형 덤프로 검증했다).
  //  ▶ 가게와 다른 점: 가게는 병합 대상이 전부 clay(0.95)라 키가 `flat|cast|recv` 로 충분했다.
  //     꾸미기는 clay(0.95)·soft(1.0) 두 거칠기가 섞여 있어 **roughness·metalness 도 키에 넣는다** —
  //     안 넣으면 조형은 그대로인데 털모자(soft)와 점토(clay)의 음영이 갈린다.
  //  ▶ **꾸미기는 파츠가 따로 움직이지 않는다** — game.js applyCosmetics 는 앵커의 자식을
  //     통째로 갈아끼울 뿐 자식 하나를 매 프레임 건드리지 않는다(👣 발자국만 opacity 를 흔드는데
  //     그건 trail.js 의 월드 이펙트라 이 경로가 아니다). 흔들 파츠가 생기면 병합 **뒤에** 달아라.
  /** 색을 정점에 실어 둔다. 재질의 color 는 **이미 작업 색공간**이라 다시 변환하지 않는다
   *  (new Color(hex) 로 다시 만들면 sRGB→Linear 가 한 번 더 걸려 색이 바뀐다). */
  const paintGeo = (geo, col) => {
    const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const mergeGeos = (geos) => {
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
  };
  /** 정점색 재질 — 원본과 같은 값이되 색만 정점에서 온다(color 흰색 × 정점색 = 같은 색) */
  const vtxOf = (src, flat) => new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: src.roughness, metalness: src.metalness, flatShading: flat });
  /** g 의 정적 파츠를 `flat|rough|metal|cast|recv` 키로 합친다.
   *  ▶ 정점색·양면·발광·**반투명** 재질은 건너뛴다 — 반투명을 합치면 블렌드 순서가 바뀐다.
   *  ▶ 혼자인 버킷은 그대로 둔다 — 합칠 상대가 없는데 인덱스를 풀면 정점만 늘어난다. */
  function mergeStatics(g) {
    const buckets = new Map();
    for (const child of g.children) {
      if (!child.isMesh) continue;
      const m = child.material;
      if (m.vertexColors || m.transparent || m.side !== THREE.FrontSide) continue;
      if (m.emissive && m.emissive.getHex() !== 0) continue;
      const key = `${!!m.flatShading}|${m.roughness}|${m.metalness}|${child.castShadow}|${child.receiveShadow}`;
      const b = buckets.get(key) || { meshes: [], flat: !!m.flatShading, cast: child.castShadow, recv: child.receiveShadow };
      b.meshes.push(child);
      buckets.set(key, b);
    }
    let merged = 0;
    for (const b of buckets.values()) {
      if (b.meshes.length < 2) continue;
      const geos = b.meshes.map(child => {
        child.updateMatrix();
        const geo = (child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(child.matrix);
        return paintGeo(geo, child.material.color);
      });
      const mesh = new THREE.Mesh(mergeGeos(geos), vtxOf(b.meshes[0].material, b.flat));
      mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
      b.meshes.forEach(child => g.remove(child));
      g.add(mesh);
      merged++;
    }
    return merged;
  }

  /** 테이퍼 튜브 — 곡선을 따라 굵기가 변하는 관. 🎒 어깨끈이 몸 표면을 따라 휘게 만든다.
   *  (js/game.js buildAnimalMesh 의 꼬리와 같은 방식 — 근사가 아니라 같은 기하다.) */
  function taperedTube(pts, radiusFn, colorFn = null, segs = 40, radial = 9) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const frames = curve.computeFrenetFrames(segs, false);
    const pos = [], col = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const P = curve.getPointAt(u), N = frames.normals[i], B = frames.binormals[i];
      const r = radiusFn(u), c = colorFn && colorFn(u);
      for (let j = 0; j < radial; j++) {
        const A = (j / radial) * Math.PI * 2, ca = Math.cos(A), sa = Math.sin(A);
        pos.push(P.x + (N.x * ca + B.x * sa) * r, P.y + (N.y * ca + B.y * sa) * r, P.z + (N.z * ca + B.z * sa) * r);
        if (c) col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial;
      const c2 = (i + 1) * radial + j, d = (i + 1) * radial + (j + 1) % radial;
      idx.push(a, c2, b, b, c2, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (col.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    return { geo, end: curve.getPointAt(1) };
  }

  // =============================================================
  //  🎩 머리 — 1차는 전부 earSafe:'low' (위가 트여 귀가 지나간다)
  //     ⚠️ 'dome'(머리를 덮는 것)은 이번에 만들지 않는다 — 귀 처리 규칙이 선 뒤에.
  // =============================================================
  //  ▶ 높이는 아이템이 정한다(앵커는 머리 중심). 반지름 HR 의 구에서 높이 h 에 걸치는
  //    둘레 반지름은 √(HR²−h²) 다 — 띠가 머리에 닿으려면 그 값을 써야 뜨지도 묻히지도 않는다.
  //    → anchors.js 의 ringR(HR, h)
  //
  //  ▶ earSafe: 'dome' — 머리를 덮는 모자.
  //    귀에 구멍을 뚫거나 귀를 눕힐 필요가 없다. **아래 테두리를 귀 밑동보다 위에서 끝내면**
  //    귀가 저절로 모자 옆으로 빠져나온다. animal-faces.js 의 귀 밑동(×HR):
  //      🐱0.46 · 🐶0.51 · 🦊0.52 · 🐰0.80   → 가장 낮은 고양이보다 위인 0.50 을 테두리로 잡는다.
  //    🐤병아리 볏은 낮고 뒤쪽이라 모자 안에 눌린다 — 모자를 쓰면 볏이 눌리는 게 자연스럽다.
  //    → anchors.js 의 DOME_BOT · domeTheta(HR, rk)
  /** 머리 위쪽만 덮는 캡. thetaLength 를 풀어 아래 테두리를 DOME_BOT 에 맞춘다 */
  function domeCap(HR, rk, mat, seg = 20) {
    const r = HR * rk;
    return new THREE.Mesh(new THREE.SphereGeometry(r, seg, 14, 0, Math.PI * 2, 0, domeTheta(HR, rk)), mat);
  }
  /** 캡 아래 테두리를 덮는 띠 — 열린 단면이 보이지 않게 막고, 모자에 윤곽을 준다 */
  function domeRim(HR, rk, tube, mat) {
    const r = HR * rk, y = DOME_BOT * HR;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(Math.max(0.01, r * r - y * y)), tube, 5, 22), mat);
    rim.rotation.x = Math.PI / 2; rim.position.y = y;
    return rim;
  }

  const HEAD = {
    flower_crown: (g, k) => {   // 화관 — 머리 위쪽 둘레에 얹는다. 가운데가 트여 귀가 지나간다
      const H = k.HR * 0.74, rad = ringR(k.HR, 0.74);
      const ring = put(g, new THREE.Mesh(new THREE.TorusGeometry(rad, k.HR * 0.055, 4, 20), clay(P.stem)), 0, H, 0, false);
      ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const A = (i / 4) * Math.PI * 2 + 0.4;
        const cx = Math.cos(A) * rad, cz = Math.sin(A) * rad;
        // ⚠️ 1차엔 꽃이 HR*0.13 이라 멀리서 초록 링만 보였다 — 꽃이 화관의 전부인데.
        put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(k.HR * 0.105, 0), clay(P.pollen)), cx, H + k.HR * 0.07, cz, false);
        for (let p = 0; p < 4; p++) {
          const B = (p / 4) * Math.PI * 2;
          const pt = petalMesh(k.HR * 0.21, 0.66, clay(i % 2 ? P.petal : P.petalB));
          pt.scale.y = 0.34;                      // 납작(0.14)하면 옆에서 안 읽힌다
          put(g, pt, cx + Math.cos(B) * k.HR * 0.17, H + k.HR * 0.05, cz + Math.sin(B) * k.HR * 0.17, false);
          pt.rotation.set(-0.30, -B, 0.28);       // 살짝 세워 볼륨을 준다
        }
      }
    },
    straw_hat: (g, k) => {      // 밀짚모자 — 낮은 크라운 + 넓은 챙
      //  ⚠️ 원래는 **챙만** 있고 크라운이 없었다. 구멍 내경 0.72·HR 에 그 높이의 머리 단면이
      //     0.714·HR — 간격이 0.006·HR 이라 머리가 구멍으로 튀어나온 채 챙만 떠 있었다.
      //     크라운을 씌워 해결한다. DOME_BOT 규칙 덕에 귀는 여전히 밖으로 빠져나간다.
      //
      //  ⚠️ 크라운에 scale.y 를 걸어 "낮게" 만들면 안 된다. 세로만 눌리면 중간 높이의
      //     가로 반지름이 머리보다 작아져 **머리가 다시 뚫고 나온다**. 반지름으로만 조절한다.
      const HR = k.HR, CR = 1.04;                 // 크라운 반지름 — 머리(1.0)보다 커야 안 뚫린다
      g.add(domeCap(HR, CR, clay(P.straw, false)));
      // 챙 — 크라운 아래 테두리(√(CR²−DOME_BOT²) ≈ 0.92·HR)에서 바깥으로. 그래야 머리와 안 겹친다
      const brim = put(g, new THREE.Mesh(new THREE.TorusGeometry(HR * 1.26, HR * 0.34, 4, 24), clay(P.straw)),
                       0, DOME_BOT * HR, 0, true);
      brim.rotation.x = Math.PI / 2; brim.scale.z = 0.14;
      // 리본 — 크라운 허리에. 둘레 반지름은 그 높이의 크라운 단면에서 구한다
      const by = 0.64;
      const band = put(g, new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(CR * CR - by * by) * HR, HR * 0.075, 4, 22), clay(P.strawDark)),
                       0, by * HR, 0, false);
      band.rotation.x = Math.PI / 2;
    },
    leaf_band: (g, k) => {      // 나뭇잎 머리띠 — 이마에 두른다(모자보다 낮다)
      const H = k.HR * 0.34, rad = ringR(k.HR, 0.34);
      const band = put(g, new THREE.Mesh(new THREE.TorusGeometry(rad, k.HR * 0.07, 4, 20), clay(P.stem)), 0, H, 0, false);
      band.rotation.x = Math.PI / 2;
      // ⚠️ 1차엔 잎이 위를 향해 서서 "이마에 꽂은 것"으로 보였다. 띠를 따라 눕혀야 장식이 된다.
      [-1, 0, 1].forEach(t => {
        const lf = petalMesh(k.HR * (0.36 - Math.abs(t) * 0.07), 0.46, clay(t ? P.leaf : P.leafLit));
        put(g, lf, t * k.HR * 0.30, H + k.HR * 0.06, rad * 0.86, false);
        lf.rotation.set(-0.30, t * 0.62, t * 0.42 + 0.15);
      });
    },
    // ── earSafe: 'dome' — 머리를 덮는 모자 3종 ──────────────────
    beanie: (g, k) => {         // 털모자 — 접힌 테두리 + 꼭대기 방울
      //  ⚠️ 방울은 크라운에 **얹는** 것이지 크라운 **위에 띄우는** 것이 아니다.
      //     1차 값 HR*1.12 는 크라운 꼭대기(1.06·HR)보다 0.06·HR **위**에 중심을 둔 유일한
      //     꼭대기 장식이었다(캡의 단추는 1.02·HR — 제 크라운 1.05·HR **안**에 파묻혀 있다).
      //     그래서 0.20·HR 짜리 공이 🐤병아리 볏 끝(0, 1.14, 0.05 ·HR)을 **안에 품어** 삼켰다 —
      //     볏 끝 ↔ 방울 중심 거리 0.054·HR < 반지름 0.20·HR, 통째로 방울 속이었다.
      //     DOME_BOT·domeTheta 가 잡아 주는 건 **아래 테두리**뿐이라 꼭대기는 이 줄이 혼자 정한다.
      //  ▶ 0.92·HR 로 내려 크라운에 파묻으면 볏 끝이 방울 밖(거리 0.226·HR)으로 나오고,
      //     모자 최고점이 1.32·HR → 1.12·HR 이 돼 캡(1.11)·밀짚(1.04)과 같은 자리에 선다.
      //     🐤볏 노출률(14시점 픽셀 실측) 22.4% → 48.9% (캡 59.3 · 버섯 79.7 · 밀짚 63.6).
      //     더 내리면(0.90) 53% 까지 오르지만 **방울이 크라운에 완전히 먹혀** 털모자가
      //     민무늬 돔이 된다 — 조형을 잃는 지점 바로 앞에서 멈춘다.
      const HR = k.HR;
      g.add(domeCap(HR, 1.06, soft(P.wool)));
      g.add(domeRim(HR, 1.06, HR * 0.10, soft(P.woolDark)));
      put(g, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.20, 10, 8), soft(P.woolDark)), 0, HR * 0.92, 0);
    },
    cap: (g, k) => {            // 캡 — 앞챙이 달린 모자. 챙은 눌러 만든다
      const HR = k.HR;
      g.add(domeCap(HR, 1.05, clay(P.cape, false)));
      g.add(domeRim(HR, 1.05, HR * 0.07, clay(P.capeLine)));
      // ⚠️ 반구를 돌려 챙을 만들려 했더니 방향이 안 맞아 안 보였다.
      //    phiStart 로 **앞쪽 반원**만 잘라 납작하게 누르는 편이 확실하다(+z 가 앞).
      const brim = put(g, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.96, 18, 6, -Math.PI / 2, Math.PI), clay(P.cape, false)),
                       0, DOME_BOT * HR + HR * 0.04, HR * 0.10);
      brim.scale.set(0.92, 0.12, 1.05); brim.rotation.x = -0.10;
      put(g, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.09, 8, 6), clay(P.capeLine)), 0, HR * 1.02, 0, false);
    },
    mushroom: (g, k) => {       // 버섯 모자 — 넓은 갓 + 점무늬. 숲 테마의 얼굴
      const HR = k.HR;
      const cap = domeCap(HR, 1.26, clay(P.shroomCap, false));
      cap.scale.y = 0.78; g.add(cap);
      g.add(domeRim(HR, 1.26, HR * 0.06, clay(P.shroomCap)));
      // 점 5개 — 그 이상은 촘촘해져 환공포증으로 읽힌다
      [[0, 0.95, 0.45], [0.75, 0.80, 0.30], [-0.70, 0.78, -0.35], [0.30, 0.72, -0.70], [-0.35, 0.92, 0.10]]
        .forEach(([x, y, z], i) => {
          const d = new THREE.Vector3(x, y, z).normalize().multiplyScalar(HR * 1.30);   // 갓(1.26)보다 밖
          const s = put(g, new THREE.Mesh(new THREE.SphereGeometry(HR * (0.13 - i * 0.012), 8, 6), clay(P.shroomDot)),
                        d.x, d.y * 0.78, d.z, false);
          s.scale.set(1, 0.45, 1);
        });
    },

    star_pin: (g, k) => {       // 별 머리핀 — 옆머리에 하나. 가장 작고 가장 싸다
      // ⚠️ 1차엔 옆머리 **뒤**에 박혀 정면에서 안 보였다. 앞쪽으로 당기고 키운다.
      const H = k.HR * 0.46, rad = ringR(k.HR, 0.46);
      const s = put(g, new THREE.Mesh(new THREE.OctahedronGeometry(k.HR * 0.26, 0), clay(P.star)), rad * 0.70, H + k.HR * 0.12, rad * 0.68, false);
      s.rotation.set(0.25, 0.9, 0.2); s.scale.set(1, 1.25, 0.55);
      const clip = put(g, new THREE.Mesh(new THREE.BoxGeometry(k.HR * 0.26, k.HR * 0.06, k.HR * 0.12), clay(P.strawDark)), rad * 0.64, H + k.HR * 0.01, rad * 0.62, false);
      clip.rotation.set(0, -0.7, -0.3);
    },
  };

  // =============================================================
  //  🧣 목 — 🐶목줄 조형이 그대로 템플릿이다(반지름 HR*0.92, 목 단면에 걸친다)
  // =============================================================
  const NECK = {
    scarf: (g, k) => {          // 목도리 — 두 겹으로 감고 앞으로 자락을 늘어뜨린다
      //  ⚠️ 얇은 띠 한 겹(tube 0.22)은 **목도리가 아니라 목줄**로 읽혔다.
      //     두툼하게(0.34) + 살짝 어긋난 두 겹으로 감아야 "감았다"가 보인다.
      const r = k.neckR;
      const a = put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.34, 6, 22), soft(P.wool)), 0, r * 0.06, 0);
      a.rotation.set(Math.PI / 2, 0, 0);
      const b = put(g, new THREE.Mesh(new THREE.TorusGeometry(r * 0.96, r * 0.30, 6, 22), soft(P.woolDark)), 0, -r * 0.22, 0);
      b.rotation.set(Math.PI / 2 + 0.16, 0.3, 0);       // 살짝 기울여 겹치면 감긴 결이 생긴다
      //  ⚠️ 늘어뜨린 자락은 포기한다. 몸이 구체라 아래로 내려오는 천은 **어디에 둬도 묻히거나 뜬다**
      //     (자락 끝 y=0.74 에서 몸 가로반지름이 0.45 인데 자락은 z=0.21 이라 통째로 몸 속이었다).
      //     대신 **매듭**을 앞에 얹는다 — 저폴리에선 이게 훨씬 깔끔하고 목도리로 잘 읽힌다.
      const knot = put(g, new THREE.Mesh(new THREE.BoxGeometry(r * 0.52, r * 0.46, r * 0.42), soft(P.wool)),
                       0, -r * 0.10, r * 0.96);
      knot.rotation.set(0.2, 0, 0.32);
      // 매듭에서 짧게 빠져나온 끝동 하나 — 매듭만 있으면 리본처럼 보인다
      const tail = put(g, new THREE.Mesh(new THREE.BoxGeometry(r * 0.34, r * 0.62, r * 0.26), soft(P.woolDark)),
                       r * 0.20, -r * 0.52, r * 1.02);
      tail.rotation.set(0.42, 0, 0.36);
    },
    bell: (g, k) => {           // 방울 목걸이 — 가는 끈 + 놋쇠 방울
      //  ▶ 금색은 **광택이 아니라 색**으로 낸다(metalness 0 · flatShading 유지).
      //    js/tool-tiers.js 2단계 "금" 과 같은 원칙이고, 색도 그 팔레트를 그대로 쓴다.
      //  ▶ 방울은 구 하나로는 구슬로 보인다. **적도 이음매 + 아래 슬릿 + 위 고리** 셋이 있어야
      //    "방울"로 읽힌다.
      const r = k.neckR, br = r * 0.40;
      const cy = -r * 0.36, cz = r * 0.90;
      const c = put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.11, 6, 22), clay(P.rope)), 0, 0, 0);
      c.rotation.x = Math.PI / 2;

      put(g, new THREE.Mesh(new THREE.SphereGeometry(br, 14, 11), clay(P.bell, false)), 0, cy, cz);
      // 적도 이음매 — 방울 몸보다 살짝 크게 둘러야 면이 겹치지 않는다
      const seam = put(g, new THREE.Mesh(new THREE.TorusGeometry(br * 0.99, br * 0.13, 5, 18), clay(P.bellLit, false)), 0, cy, cz, false);
      seam.rotation.x = Math.PI / 2;
      // 아래 슬릿(입) — 방울의 정체성. 어둡게 파인 것으로 읽혀야 한다
      const slit = put(g, new THREE.Mesh(new THREE.BoxGeometry(br * 1.02, br * 0.20, br * 0.34), clay(P.bellDark)), 0, cy - br * 0.62, cz + br * 0.22, false);
      slit.rotation.x = 0.35;
      put(g, new THREE.Mesh(new THREE.SphereGeometry(br * 0.13, 8, 6), clay(P.bellDark)), 0, cy - br * 0.74, cz + br * 0.30, false);
      // 위 고리 — 끈에 꿰인 자리
      const loop = put(g, new THREE.Mesh(new THREE.TorusGeometry(br * 0.24, br * 0.09, 5, 12), clay(P.bellLit)), 0, cy + br * 0.98, cz - br * 0.10, false);
      loop.rotation.x = 0.3;
    },
    bowtie: (g, k) => {         // 나비 넥타이 — 목띠 + 날개 두 장 + 가운데 매듭
      //  ▶ 날개는 **꼭짓점이 가운데를 향하는 사각뿔**이다. 저폴리에서 나비 날개를 그리는 제일 싼 방법 —
      //    옆에서 봐도 삼각으로 읽히고, 정면에선 두 삼각이 매듭에서 만나 나비가 된다.
      //  ⚠️ cz 를 0.96r 로 뒀더니 날개 뒷면(0.252)이 그 높이의 머리 단면(0.309)보다 안쪽이라
      //     **나비가 머리에 파묻혔다**(🦊여우 기준). 1.28r 이면 뒷면 0.361 로 확실히 밖이다.
      const r = k.neckR, cz = r * 1.28, wl = r * 0.62;
      const band = put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.085, 6, 22), clay(P.bowDark)), 0, 0, 0);
      band.rotation.x = Math.PI / 2;
      [-1, 1].forEach(s => {
        const wing = put(g, new THREE.Mesh(new THREE.ConeGeometry(r * 0.40, wl, 4), clay(P.bow, false)),
                         s * (wl * 0.52), -r * 0.04, cz);
        wing.rotation.set(0, Math.PI / 4, s * Math.PI / 2);   // 꼭짓점이 안쪽(가운데)을 향한다
        wing.scale.set(1, 1, 0.55);                           // 앞뒤로 눌러 납작한 천으로
      });
      // 매듭 — 두 날개가 만나는 자리를 덮어 이음매를 감춘다
      const knot = put(g, new THREE.Mesh(new THREE.BoxGeometry(r * 0.26, r * 0.30, r * 0.26), clay(P.bowDark)), 0, -r * 0.04, cz + r * 0.04, false);
      knot.rotation.z = 0.12;
    },
  };

  // =============================================================
  //  🎒 등 — ⚠️ 🦊여우 꼬리(위로 솟는 bushy)와 겹치는지가 이 슬롯의 관문이다
  // =============================================================
  //  ⚠️ 크로스 스트랩의 회전 순서 — THREE.Euler 기본값 'XYZ' 는 **Rz 를 먼저** 적용한다.
  //     `rotation.set(π/2, 0, tilt)` 로 주면 tilt 는 링 자기 축 회전이라 아무 일도 안 일어나고,
  //     그 뒤 Rx(π/2) 가 링을 눕혀 **허리를 수평으로 감은 띠**가 된다(1차 실측).
  //     대각선으로 매려면 "눕힌 다음 기울여야" 하므로 order 를 'ZYX' 로 바꾼다.
  //  ⚠️ 회전 순서 — THREE.Euler 기본값 'XYZ' 는 **Rz 를 먼저** 적용한다.
  //     `rotation.set(π/2, 0, tilt)` 로 주면 tilt 는 링 자기 축 회전이라 아무 일도 안 일어나고,
  //     그 뒤 Rx(π/2) 가 링을 눕혀 **허리를 수평으로 감은 띠**가 된다(1차 실측).
  //     대각선으로 매려면 "눕힌 다음 기울여야" 하므로 order 를 'ZYX' 로 바꾼다.
  //
  //  ▶ 끈은 앵커(= 링의 가장 낮은 점)를 **반드시 지나간다**. 가방은 그 점에 매달리므로
  //    둘이 저절로 맞물린다 — 좌표를 따로 정하면 안 닿는다.
  //  ⚠️ 원형 링 하나로는 크로스백이 안 된다. 몸은 타원인데 링은 원이라 **배 앞뒤로 튀어나와
  //     훌라후프처럼 보인다**(2차 실측). 실제 크로스백은 가방에서 어깨로 가는 **끈 두 가닥**이다 —
  //     앞으로 한 줄, 뒤로 한 줄. 꼬리에 쓴 taperedTube 로 몸 표면을 따라 휘게 만든다.
  const strapOf = (g, k, tube, mat) => {
    // 월드 표면점 → 홀더 로컬. onSurf 는 anchors.js(순수 수치) 라 평범한 {x,y,z} 를 준다
    const L = (x, y, z) => {
      const p = onSurf(k.bs, k.R, k.bodyY, x, y, z);
      return new THREE.Vector3(p.x - k.side.x, p.y - k.side.y, p.z - k.side.z);
    };
    const shoulder = L(0.55, 0.80, 0.20);
    [1, -1].forEach(front => {                                     // +1 앞 가닥 · −1 뒤 가닥
      const pts = [
        new THREE.Vector3(0, 0, 0),                                // 가방 고리(앵커)에서 출발
        L(-0.58, -0.08, front * 0.80),
        L(0.04, 0.46, front * 0.86),
        shoulder.clone(),
      ];
      const { geo } = taperedTube(pts, () => tube, null, 26, 6);
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
    });
    // 어깨에서 두 가닥이 만나는 지점 — 이음매가 벌어져 보이지 않게 덮는다
    put(g, new THREE.Mesh(new THREE.SphereGeometry(tube * 1.5, 8, 6), mat), shoulder.x, shoulder.y, shoulder.z, false);
  };

  /** 끈이 꿰이는 고리 — 앵커(로컬 원점)에 둔다. 끈이 그 점을 z 방향으로 지나므로
   *  구멍 축이 z 인 토러스(회전 없음)면 끈이 고리를 통과한다. */
  const strapLoop = (g, r, tube, mat) =>
    put(g, new THREE.Mesh(new THREE.TorusGeometry(r, tube, 4, 14), mat), 0, 0, 0, false);

  const BACK = {
    //  ▶ 가방류는 **옆구리(side 앵커)** 에 맨다. 등 한가운데는 🦊여우 꼬리 자리다.
    //    앵커는 어깨끈 링의 가장 낮은 점이라, 가방을 거기서 **아래로 매달면** 끈과 붙는다.
    pack: (g, k) => {           // 메신저 가방 — 왼쪽 옆구리에 걸치고 끈이 오른쪽 어깨를 넘어간다
      const R = k.R, w = R * 0.76;
      const out = 0;
      const hang = -w * 0.26;                   // 고리 아래로 매달린다
      const body = put(g, new THREE.Mesh(new THREE.BoxGeometry(w * 0.56, w * 0.88, w * 1.02), clay(P.canvas)), out, hang, 0);
      body.rotation.z = 0.12;
      const flap = put(g, new THREE.Mesh(new THREE.BoxGeometry(w * 0.60, w * 0.38, w * 1.08), clay(P.canvasDark)), out - w * 0.02, hang + w * 0.33, 0, false);
      flap.rotation.z = 0.12;
      const buckle = put(g, new THREE.Mesh(new THREE.BoxGeometry(w * 0.10, w * 0.15, w * 0.20), clay(P.strawDark)), out - w * 0.29, hang + w * 0.12, 0, false);
      buckle.rotation.z = 0.12;
      // 고리 ↔ 가방을 잇는 짧은 목끈 — 이게 없으면 가방이 끈 아래 떠 있는 상자로 보인다
      const neck = put(g, new THREE.Mesh(new THREE.BoxGeometry(w * 0.13, w * 0.30, w * 0.34), clay(P.canvasDark)), out, hang + w * 0.52, 0, false);
      neck.rotation.z = 0.12;
      strapLoop(g, w * 0.17, w * 0.055, clay(P.canvasDark));
      strapOf(g, k, R * 0.078, clay(P.canvasDark));
    },
    basket: (g, k) => {         // 바구니 — 옆구리에 낀 열린 통 + 어깨끈
      const R = k.R, r = R * 0.44;
      const out = 0, hang = -r * 0.48;
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.80, r * 1.4, 10, 1, true), clay(P.wood)), out, hang, 0);
      const rim = put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 4, 16), clay(P.strawDark)), out, hang + r * 0.70, 0, false);
      rim.rotation.x = Math.PI / 2;
      // 테두리에서 고리까지 끈 두 가닥
      [-1, 1].forEach(s => {
        const c = put(g, new THREE.Mesh(new THREE.BoxGeometry(r * 0.09, r * 0.52, r * 0.09), clay(P.strawDark)), out + s * r * 0.30, hang + r * 0.96, 0, false);
        c.rotation.z = -s * 0.42;
      });
      strapLoop(g, r * 0.19, r * 0.065, clay(P.strawDark));
      strapOf(g, k, R * 0.070, clay(P.strawDark));
    },
    cape: (g, k) => {           // 망토 — 등을 덮어 내려온다. 실루엣이 제일 크게 바뀐다
      const R = k.R;
      const c = put(g, new THREE.Mesh(new THREE.SphereGeometry(R * 0.92, 18, 14, 0, Math.PI), soft(P.cape)), 0, -R * 0.22, R * 0.10);
      c.scale.set(1.02, 1.16, 0.42); c.rotation.y = Math.PI / 2;
      const col = put(g, new THREE.Mesh(new THREE.TorusGeometry(R * 0.44, R * 0.07, 4, 16, Math.PI * 1.25), clay(P.capeLine)), 0, R * 0.52, R * 0.06, false);
      col.rotation.set(Math.PI / 2, 0, -Math.PI * 0.62);
    },
  };

  return { HEAD, NECK, BACK, mergeStatics };
}

/** itemId → 앵커에 꽂을 Group. 모르는 id 면 null
 *  k = { R, HR, HY, bs, bodyY, side: {x,y,z}, neckR } — sims/cosmetic-sim.html anchorsOf 와 같은 모양 */
export function buildCosmetic(THREE, itemId, k) {
  const { HEAD, NECK, BACK, mergeStatics } = tablesFor(THREE);
  const fn = HEAD[itemId] || NECK[itemId] || BACK[itemId];
  if (!fn) return null;
  const g = new THREE.Group();
  fn(g, k);
  //  ⚡ 여기서 한 번만 합친다 — 조형 함수 13개를 각자 고치면 새 아이템에서 빼먹는다.
  //     조형 함수가 끝난 뒤라 좌표·회전이 다 정해져 있고, 꾸미기엔 흔들 파츠가 없다.
  mergeStatics(g);
  return g;
}
