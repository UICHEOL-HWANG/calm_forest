// js/shop/building.js
// =============================================================
//  calm forest · 🏪 꾸미기 가게 — 밖에서 안이 보이는 디오라마
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md
//  계획: docs/superpowers/plans/2026-09-22-cosmetics-pet.md Task 8
//  ▶ 검수: sims/shop-sim.html — **이 파일을 import 한다.** 복제본을 두지 않는다
//    (tool-tier-sim 에서 낚싯대 0단계 값이 갈려 역이식된 사고가 있었다).
//    시뮬에 남은 지붕안 A·C·D 는 **설계 기록**이다 — 확정안은 B(뒤 60%)고,
//    `buildShop()` 이 인자를 안 받으면 B 를 세운다. 시뮬만 variant 를 넘긴다.
//  ▶ THREE 를 인자로 받는다 — 시뮬(CDN)과 게임 번들이 각자 자기 THREE 를 넘긴다.
//    머리(buildAnimalHead)도 인자다 — 복제하면 게임 주민과 얼굴이 갈린다.
//
//  ▶ 41.2° 검수를 통과한 값이다. **수치를 바꾸지 않는다.**
//    · 지붕 B안(뒤 60%만) — A·C 는 지붕이 내부를 덮는다
//    · 주인 몸 R 0.50(y 0.55) · 머리 R 0.38(y 1.15) — 게임 주민과 같은 크기.
//      작으면 카운터 상판(1.05)에 가린다
//    · 차양은 **창 위에만**, 정점색 한 덩어리 — 정면 전체면 문 베이까지 덮는다
//    · 주인 배회 **중심** x −1.33~−1.03 — 벽 판정은 중심이 아니라 **몸통 가장자리**로 한다.
//      왼쪽 옆벽 안쪽면(−1.91)을 넘으면 갈색 덩어리가 벽 밖 잔디로 나온다(updateShopOwner 주석)
//    · 간판은 건물 **옆으로** 돌출 — 벽에 붙이면 뜨고, 앞으로 내면 묻힌다
//    · 문짝 높이 2.05 — 2.6 은 간판을 스친다
//
//  ▶ ⚠️ 드로우콜 — 파츠를 메시 하나씩 두면 건물만 47메시(=65콜)다. 계획 Task 14 Step 4 의
//    예산은 기능 전체 +35 이고 가게는 "카페(병합 후 24) 수준" 이다. 그래서 ☕카페(spawnCafeGate)
//    와 같은 수법으로 **재질별로 지오메트리를 합친다** — 색은 정점에 실어(paintGeo) 색이 달라도
//    한 재질로 묶인다. 묶는 키는 `flatShading · castShadow · receiveShadow` 셋뿐이고,
//    좌표·회전·색은 **한 글자도 안 바뀐다**(메시의 행렬을 지오메트리에 구워 넣을 뿐).
//    병합 제외는 정점색 양면 재질인 **차양**(+ 등불 발광구) 뿐이다.
//    움직이는 **주인**은 건물 병합에선 빠지지만(그룹이라 mergeStatics 가 안 집는다) 따로 합친다 —
//    mergeOwnerParts 가 `buildAnimalHead` 가 세워 준 **그 인스턴스만** 재질별로 묶는다(34메시 → 7).
//
//  ▶ 정면은 **+Z** 다(zF = +D/2). 마을 카메라는 camOffset(0,14,16) 고정이라
//    시선이 늘 −Z — 정면을 +Z 로 둬야 플레이어가 어디 있든 안이 보인다.
//    game.js 는 회전 없이 그대로 얹는다.
//
//  ▶ ⚠️ 블룸 임계 0.85(js/tool-tiers.js BLOOM_LUMA) — 벽 0xf2e4cf 의 Rec.709 luma 는
//    0.900 으로 임계를 넘는다. 일부러 그렇게 뒀다: ☕카페 회벽 0xfaf8f4(0.973)이
//    이미 그 톤으로 서 있는 게 이 게임의 기존 톤이고, 여기에 노란기를 더해 따뜻하게 한 값이다.
//    색을 고치면 luma 를 다시 재라.
// =============================================================

/** 폭·높이·깊이·벽 두께 — 0.14 는 두꺼워 보였다 */
export const SHOP_W = 4.0, SHOP_H = 2.9, SHOP_D = 3.2, SHOP_T = 0.09;

/** 정면 왼쪽 문 개구부의 폭 — 주인 배회 범위(updateShopOwner)가 이 값에서 파생한다 */
export const SHOP_DOOR_W = 1.25;

/** 확정 지붕안 — 뒤 60%만 덮어 41.2°에서 내부가 보이게 */
export const SHOP_VARIANT = 'B';

// ── 팔레트 — 전부 게임에 이미 있는 색 ──────────────────────────
export const SHOP_PALETTE = Object.freeze({
  //  ⚠️ 카페 회벽 0xfaf8f4 은 휘도 0.973 — 거의 순백이라 중성적이다.
  //     레퍼런스의 따뜻한 크림을 내려면 노란기를 더 넣어야 한다(0.900).
  wall:   0xf2e4cf,   // 따뜻한 크림
  wallSh: 0xddc9ac,   // 그늘진 면·몰딩
  wood:   0xc08c52,   // 창틀·카운터
  woodDk: 0x92653a,
  awnA:   0xe0b0b0,   // WALL_COLORS 의 핑크
  awnB:   0xfaf0e4,
  floor:  0xd6bfa0,
  shelf:  0xb8894f,
  jar:    0xe4e0d2,
  sign:   0x7e9c6f,
});

const P = SHOP_PALETTE;
const W = SHOP_W, H = SHOP_H, D = SHOP_D, T = SHOP_T;

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
  // ── 재질·배치 헬퍼 ─────────────────────────────────────────
  const clay = (c, flat = true) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, flatShading: flat });
  const put = (p, m, x, y, z, shadow = true) => { m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; p.add(m); return m; };
  const box = (w, h, d, c, flat = false) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), clay(c, flat));

  // ── ⚡ 재질별 병합 — js/duel/art.js·js/cosmetics/trail.js 와 같은 구현(three/addons 없이 정점색까지) ──
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
  /** 정점색 clay — 건물 정적 파츠는 전부 clay(0.95 / metalness 0)라 거칠기를 물어볼 필요가 없다 */
  const vtxClay = (flat) => vtxOf({ roughness: 0.95, metalness: 0 }, flat);
  /** g 의 정적 파츠를 `flat|cast|recv` 키로 합친다. 차양(정점색·양면)·등불(발광)·주인(Group)은 건너뛴다. */
  function mergeStatics(g) {
    const buckets = new Map();
    for (const child of [...g.children]) {
      if (!child.isMesh) continue;                                   // 주인(Group)
      const m = child.material;
      if (m.vertexColors || m.side !== THREE.FrontSide) continue;    // 차양
      if (m.emissive && m.emissive.getHex() !== 0) continue;         // 등불 발광구
      const key = `${!!m.flatShading}|${child.castShadow}|${child.receiveShadow}`;
      child.updateMatrix();
      const geo = (child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(child.matrix);
      const b = buckets.get(key) || { geos: [], flat: !!m.flatShading, cast: child.castShadow, recv: child.receiveShadow };
      b.geos.push(paintGeo(geo, m.color));
      buckets.set(key, b);
      g.remove(child);
    }
    for (const b of buckets.values()) {
      const mesh = new THREE.Mesh(b.geos.length > 1 ? mergeGeos(b.geos) : b.geos[0], vtxClay(b.flat));
      mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
      g.add(mesh);
    }
    return buckets.size;
  }

  /** 🧑 주인 **한 마리(이 인스턴스)** 만 재질별로 합친다 — 34메시(=+42콜) → 7메시(=+9콜).
   *  ▶ 왜 여기서 후처리하나: 머리는 js/animal-faces.js `buildAnimalHead` 가 만든다. 그 함수는
   *    주민 9명과 플레이어가 같이 쓰므로 **안쪽을 고치면 마을 전체가 바뀐다**. 그래서 공용 조립기는
   *    한 글자도 안 건드리고, 그것이 **세워 준 결과물**만 여기서 합친다.
   *  ▶ mergeStatics(건물)와 다른 점 둘:
   *    · 머리는 Group 안에 Group(수염 피벗 6개)이 또 있어 **재귀**로 모으고, 행렬은 주인 기준으로 굽는다.
   *    · 얼굴엔 plush(0.88)·눈동자(0.35)·하이라이트(0.30)·입/수염(0.60)·몸 clay(0.95) 다섯 거칠기가 섞였다.
   *      건물 키(flat|cast|recv)로 묶으면 **얼굴이 한 거칠기로 뭉개진다** — js/pet/art.js 처럼
   *      roughness·metalness 를 키에 넣는다.
   *  ▶ ⚠️ `updateShopOwner` 는 **그룹 하나만** 움직인다(position·rotation.y) — 따로 움직이는 파츠가
   *    없어서 전부 병합해도 된다. 눈 깜빡임·귀 쫑긋처럼 **파츠가 따로 움직이게 되면 이 호출 뒤에 달아라**
   *    (병합에 걸린 파츠는 얼어붙는다).
   *  ▶ 혼자인 버킷(몸·앞치마)은 그대로 둔다 — 합칠 상대가 없는데 인덱스를 풀면 정점만 늘어난다. */
  function mergeOwnerParts(owner) {
    const found = [];
    (function walk(node, mat) {
      for (const child of node.children) {
        child.updateMatrix();
        const m = new THREE.Matrix4().multiplyMatrices(mat, child.matrix);
        if (child.isMesh) found.push({ child, m });
        else walk(child, m);
      }
    })(owner, new THREE.Matrix4());

    const buckets = new Map();
    for (const it of found) {
      const m = it.child.material;
      if (m.vertexColors || m.side !== THREE.FrontSide) continue;
      if (m.emissive && m.emissive.getHex() !== 0) continue;
      if (m.transparent || m.opacity < 1) continue;
      const key = `${!!m.flatShading}|${m.roughness}|${m.metalness}|${it.child.castShadow}|${it.child.receiveShadow}`;
      const b = buckets.get(key) || { items: [], src: m, flat: !!m.flatShading, cast: it.child.castShadow, recv: it.child.receiveShadow };
      b.items.push(it);
      buckets.set(key, b);
    }
    let merged = 0;
    for (const b of buckets.values()) {
      if (b.items.length < 2) continue;
      const geos = b.items.map(({ child, m }) =>
        paintGeo((child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(m), child.material.color));
      const mesh = new THREE.Mesh(mergeGeos(geos), vtxOf(b.src, b.flat));
      mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
      b.items.forEach(({ child }) => child.parent.remove(child));
      owner.add(mesh);
      merged++;
    }
    // 메시를 다 내준 빈 그룹(수염 피벗 6개·머리)은 지운다 — 매 프레임 scene.traverse 를 도는 값이다
    (function prune(node) {
      for (const child of [...node.children]) {
        if (child.isMesh) continue;
        prune(child);
        if (!child.children.length) node.remove(child);
      }
    })(owner);
    return merged;
  }

  // =============================================================
  //  차양 — 정점색 한 덩어리. 아래 가장자리를 물결로 깎아 레퍼런스의 결을 살린다
  //  ⚠️ 줄무늬를 조각마다 메시로 만들면 드로우콜이 튄다(카페가 병합 후 24).
  //     🦊여우 꼬리가 쓰는 방식과 같이 정점색으로 굽는다.
  // =============================================================
  function awning(W, drop, depth, stripes = 7) {
    const pos = [], col = [], idx = [];
    const A = new THREE.Color(P.awnA), B = new THREE.Color(P.awnB);
    const ARC = 10;                       // 물결 한 칸의 분할
    let v = 0;
    for (let s = 0; s < stripes; s++) {
      const c = s % 2 ? B : A;
      const x0 = -W / 2 + (W / stripes) * s, x1 = x0 + W / stripes;
      const top0 = v++, top1 = v++;
      pos.push(x0, 0, 0, x1, 0, 0);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      const bot = [];
      for (let i = 0; i <= ARC; i++) {
        const t = i / ARC, x = x0 + (x1 - x0) * t;
        const sag = Math.sin(Math.PI * t) * drop * 0.16;      // 물결 처짐
        pos.push(x, -drop - sag, depth);
        col.push(c.r, c.g, c.b);
        bot.push(v++);
      }
      for (let i = 0; i < ARC; i++) {
        idx.push(top0, bot[i], bot[i + 1]);
        if (i === ARC - 1) idx.push(top0, bot[ARC], top1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
    m.castShadow = true;
    return m;
  }

  // =============================================================
  //  상점 주인 — 주민 조형(game.js buildNPCs)과 같은 결.
  //  머리는 animal-faces.js 원본을 쓴다(복제하면 게임과 갈린다)
  // =============================================================
  //  ⚠️ 처음엔 몸 0.34 · 머리 y0.80 으로 **작게** 만들었다가 주인이 안 보였다.
  //     키가 1.06 인데 카운터 상판이 1.05 — 딱 가려진 것이다.
  //     게임 주민(game.js buildNPCs)은 몸 R 0.50(y 0.55) · 머리 R 0.38(y 1.15) = 키 ≈ 1.53 이다.
  //     **같은 크기로 맞춰야** 상반신 0.48 이 카운터 위로 나온다.
  function shopkeeper(buildAnimalHead) {
    const g = new THREE.Group();
    const body = put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.50, 1), clay(0xa86f52, false)), 0, 0.55, 0);
    body.scale.set(1, 1.05, 1);
    g.add(buildAnimalHead('cat', { HR: 0.38, HY: 1.15, body: 0xc9a38c, belly: 0xf2ece4 }));
    // 앞치마 — 상점 주인이라는 표식. 몸보다 살짝 크게 둘러야 면이 안 겹친다
    const ap = put(g, new THREE.Mesh(new THREE.SphereGeometry(0.505, 14, 10), clay(0xe8eeea, false)), 0, 0.50, 0.08, false);
    ap.scale.set(0.86, 0.92, 0.62);
    //  ⚡ 주인은 **이 한 마리만** 합친다(34메시 → 7). 공용 buildAnimalHead 는 그대로 — 주민 9명이 같이 쓴다.
    mergeOwnerParts(g);
    return g;
  }

  // =============================================================
  //  가게 — 확정안은 B. 시뮬만 나머지를 부른다
  //    A 레퍼런스 그대로   : 평지붕 전체 + 차양
  //    B 앞 처마 물림      : 지붕을 뒤쪽 60% 만  ← 확정
  //    C 정면 천장까지 개방 : 앞 상인방을 없애고 창틀만
  //    D 지붕 없음         : 차양만 (열린 가판)
  // =============================================================
  function shop(variant, buildAnimalHead) {
    const g = new THREE.Group();
    const owner = shopkeeper(buildAnimalHead);

    put(g, box(W, T, D, P.floor), 0, T / 2, 0);                                    // 바닥
    put(g, box(W, H, T, P.wallSh), 0, H / 2, -D / 2 + T / 2);                      // 뒷벽
    [-1, 1].forEach(s => put(g, box(T, H, D, P.wall), s * (W / 2 - T / 2), H / 2, 0));   // 옆벽

    // ── 정면 ── 왼쪽: 문 개구부 · 오른쪽: 큰 창
    const zF = D / 2 - T / 2;
    const doorW = SHOP_DOOR_W, winW = W - doorW - T * 3;
    const winX = W / 2 - T - winW / 2;
    put(g, box(T, H, T, P.wall), -W / 2 + T / 2, H / 2, zF);                       // 문 옆 기둥
    put(g, box(T, H, T, P.wall), -W / 2 + doorW, H / 2, zF);
    const sillH = 1.05;
    put(g, box(winW + T * 2, sillH, T, P.wall), winX, sillH / 2, zF);              // 허리벽
    put(g, box(winW + T * 2.4, 0.13, T * 2.2, P.wood), winX, sillH + 0.05, zF + 0.04);   // 창턱
    const winTop = variant === 'C' ? H : H - 0.55;
    [-1, 1].forEach(s => put(g, box(0.10, winTop - sillH, 0.14, P.wood), winX + s * (winW / 2), (sillH + winTop) / 2, zF));
    if (variant !== 'C') {
      put(g, box(winW + T * 2, 0.12, 0.14, P.wood), winX, winTop, zF);             // 창 윗틀
      put(g, box(winW + T * 2, H - winTop, T, P.wall), winX, (H + winTop) / 2, zF);// 상인방
    }

    // ── 지붕 ──
    if (variant === 'A' || variant === 'C') {                 // 평지붕 전체 + 파라펫(레퍼런스의 쟁반 모양)
      put(g, box(W + 0.34, 0.16, D + 0.34, P.wall), 0, H + 0.08, 0);
      put(g, box(W + 0.5, 0.26, D + 0.5, P.wallSh), 0, H + 0.24, 0);
      put(g, box(W + 0.14, 0.20, D + 0.14, P.floor), 0, H + 0.30, 0);
    } else if (variant === 'B') {                              // 앞 처마를 물려 시야를 연다
      const rd = D * 0.60;
      put(g, box(W + 0.34, 0.16, rd, P.wall), 0, H + 0.08, -D / 2 + rd / 2);
      put(g, box(W + 0.5, 0.26, rd + 0.16, P.wallSh), 0, H + 0.24, -D / 2 + rd / 2);
    }
    // D 는 지붕 없음

    // ── 차양 ──
    //  ⚠️ 차양을 정면 전체에 두면 **문 베이 위까지 덮어** 그 아래 주인이 가린다.
    //     창 위에만 둔다 — 실제 가게도 그렇고, 문 쪽이 트여야 안이 보인다.
    const aw = awning(winW + T * 3, 0.36, 0.50, 5);
    aw.position.set(winX, (variant === 'C' ? H - 0.04 : H - 0.24), zF + 0.06);
    aw.rotation.x = -0.10;
    g.add(aw);

    // ── 내부 ──
    //  ⚠️ 작은 소품에 그림자를 켜면 저폴리에서 지글거린다 — 전부 끈다.
    const back = -D / 2 + T + 0.12;
    put(g, box(W - 0.9, 0.10, 0.34, P.shelf), 0, 1.72, back, false);
    put(g, box(W - 0.9, 0.10, 0.34, P.shelf), 0, 2.22, back, false);
    for (let i = 0; i < 7; i++) {
      const x = -1.3 + i * 0.44, h = 0.20 + (i % 3) * 0.06;
      put(g, box(0.15, h, 0.15, P.jar), x, 1.77 + h / 2, back, false);
      if (i % 2) put(g, box(0.14, 0.17, 0.14, P.jar), x, 2.355, back, false);
    }
    // 카운터 — 창 쪽(오른쪽)으로 몬다. 왼쪽 문 베이는 주인이 오가는 자리로 비운다
    put(g, box(1.85, 0.78, 0.46, P.wood), 1.02, 0.39 + T, 0.62, false);
    put(g, box(2.0, 0.10, 0.60, P.woodDk), 1.02, 0.83 + T, 0.62, false);

    // ── 🪧 돌출 간판 ──
    //  ⚠️ 벽에 납작하게 붙였더니 41°에서 **지붕 안쪽 공간과 겹쳐 떠 보였다**.
    //     벽에서 앞으로 팔을 내고 판을 매다는 돌출 간판이면 실루엣이 확실히 분리된다.
    //     y 2.0~2.4 는 주인 시선(z 1.6~2.1 에서 2.84~3.28)보다 아래라 주인을 안 가린다.
    //  ⚠️ 2차엔 팔을 **앞으로** 냈더니 간판이 문 베이 안쪽에 묻혀 안 보였다.
    //     돌출 간판은 건물 **옆으로** 나와야 하늘을 배경으로 실루엣이 분리된다.
    const armX = -W / 2 - 0.30, sy = 2.40, sz = zF - 0.45;
    put(g, box(0.62, 0.08, 0.08, P.woodDk), armX, sy + 0.34, sz, false);                 // 팔(옆으로)
    [-0.20, 0.20].forEach(dx => put(g, box(0.05, 0.26, 0.05, P.woodDk), armX + dx, sy + 0.20, sz, false));   // 고리 2
    put(g, box(0.74, 0.52, 0.07, P.sign), armX, sy - 0.06, sz, true);                     // 매달린 판
    //  가게가 뭘 파는지 — 판 위에 모자 부조 하나. 글자는 i18n 이 필요하니 **심볼**로 간다
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 12), clay(P.awnB)), armX, sy - 0.13, sz + 0.06, false);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), clay(P.awnA)), armX, sy - 0.10, sz + 0.06, false);

    // ── 🚪 문 베이 채우기 ──
    //  주인이 오가는 자리(중심 x −1.33~−1.03 · updateShopOwner)는 비우고, 그 **뒤·옆**만 채운다
    const doorX = -W / 2 + doorW / 2;
    // 젖혀진 문짝 — 왼쪽 벽에 붙여 연다
    const DOORH = 2.05;   // 주민 키 1.53 에 맞춘 문 높이(H-0.30=2.6 은 너무 높아 간판을 스쳤다)
    const leaf = put(g, box(0.06, DOORH, 0.80, P.wood), -W / 2 + 0.12, DOORH / 2 + T, zF - 0.40, false);
    leaf.rotation.y = 0.26;
    // 문턱 발판
    put(g, box(doorW + 0.24, 0.10, 0.52, P.floor), doorX, 0.05, zF + 0.30, false);
    // 🎩 모자걸이 — 꾸미기 가게라는 걸 한눈에. 주인 뒤(뒷벽)라 시야를 안 막는다
    const hy = 1.62, hz = -D / 2 + T + 0.10;
    put(g, box(doorW - 0.16, 0.07, 0.10, P.woodDk), doorX, hy, hz, false);
    [-0.34, 0, 0.34].forEach((dx, i) => {
      put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.02, 0.16 - i * 0.02, 0.04, 10), clay(i % 2 ? P.awnB : P.awnA)), doorX + dx, hy - 0.10, hz + 0.05, false);
      put(g, new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), clay(i % 2 ? P.awnA : P.jar)), doorX + dx, hy - 0.08, hz + 0.05, false);
    });
    // 문 옆 화분 — 바깥. 실루엣에 숨통을 튼다
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.26, 9), clay(P.woodDk)), -W / 2 - 0.26, 0.13, zF + 0.34, true);
    put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), clay(0x7fb857)), -W / 2 - 0.26, 0.40, zF + 0.34, true);

    //  ⚡ 여기까지가 한 번 세우면 안 움직이는 정적 파츠 — 재질별로 합친다(47메시 → 4).
    //     주인은 이 뒤에 붙여야 병합에 안 걸린다.
    mergeStatics(g);

    owner.position.set(-1.35, T, 0.10);                                            // 문 베이 — 카운터 왼쪽
    g.add(owner);
    g.userData.owner = owner;
    return g;
  }

  //  ⚠️ 가게 안은 지붕·벽이 빛을 막아 어둡다. 전시실에서 이미 겪은 문제 —
  //     세기만 올리면 안 되고 **세기·색·광원 자리** 3종 세트를 같이 잡아야 한다.
  function innerLamp(g) {
    const l = new THREE.PointLight(0xffd9a8, 0.85, 6.5, 1.6);
    l.position.set(0, 2.05, 0.2); g.add(l);
    put(g, new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xf0d8a8, emissive: 0xe8c88a, emissiveIntensity: 0.8, roughness: 0.6 })), 0, 2.12, 0.2, false);
    g.userData.lamp = l;
    return l;
  }

  return { shop, innerLamp };
}

/**
 * 🏪 가게 한 채. 정면은 +Z — 마을에 얹을 땐 회전하지 않는다.
 * @param {object} THREE          시뮬(CDN)/게임 번들이 각자 넘긴다
 * @param {Function} buildAnimalHead  js/animal-faces.js 의 원본(복제 금지)
 * @param {string} [variant]      확정안 B. 시뮬의 지붕 비교용으로만 A·C·D 를 넘긴다
 * @returns {{ group: object, owner: object, lamp: object }}
 */
export function buildShop(THREE, buildAnimalHead, variant = SHOP_VARIANT) {
  const { shop, innerLamp } = tablesFor(THREE);
  const group = shop(variant, buildAnimalHead);
  const lamp = innerLamp(group);
  return { group, owner: group.userData.owner, lamp };
}

// =============================================================
//  주인 배회 범위 — ⚠️ **몸통 가장자리 vs 벽 안쪽면** 으로 잡는다
//  ------------------------------------------------------------
//  ▶ 🚫 중심 좌표를 가게 경계(±SHOP_W/2)와 비교하면 **통과해 버린다.**
//    Task 8 검증이 그 방식이었고(중심 −1.67 은 ±2.0 안이니 "통과"), 그래서
//    주인이 왼쪽 옆벽을 뚫고 잔디로 나오는 걸 못 잡았다 — 실제 몸 왼쪽 끝은
//    −2.247 로 옆벽 **바깥면**(−2.00)보다 0.247 밖이었다(실기기 제보).
//    판정은 언제나 `중심 ± 발자국 반경` vs **벽 안쪽면** 이다. 중심끼리 비교하지 마라.
//
//  ▶ 발자국 반경은 몸 R 0.50 이 **아니다.** rotation.y 가 x 와 같은 sin(p) 라
//    x 가 가장 왼쪽일 때 고개는 항상 −OWNER_TURN 으로 틀어져 있고, 그때 코·귀가
//    회전축 밖으로 돌아 xz 발자국이 0.577 까지 넓어진다(주인 전 정점 실측).
//    **주인 조형(shopkeeper/buildAnimalHead)을 고치면 이 값을 다시 재라.**
//
//  ▶ 네 방향 벽 **안쪽면** — 전부 치수 상수에서 파생한다.
//      옆벽 ∓(SHOP_W/2 − SHOP_T) = ∓1.91 · 뒷벽 −SHOP_D/2 + SHOP_T = −1.51
//      정면 SHOP_D/2 − SHOP_T = 1.51 (문 베이는 뚫려 있지만 몸이 문턱을 넘으면 안 된다)
//
//  ▶ 문 개구부는 폭 SHOP_DOOR_W − 1.5·SHOP_T = 1.115 인데 회전한 발자국은 1.154 다 —
//    **애초에 몸 전체를 담을 수 없다.** 그래서 하드 조건은 "왼쪽 옆벽 안쪽" 하나뿐이고,
//    문 베이 가시성은 **중심이 문 개구부 안** 에 있는 것으로 잡는다(X_MAX 의 Math.min).
//    ※ 창 허리벽(sillH 1.05)은 조건이 아니다 — 주인은 그 벽보다 1.06 이상 뒤에 있고
//      마을 카메라는 41.2° 로 **내려다보므로** 허리벽 너머가 오히려 다 보인다.
//
//  ▶ 한 주기(p 0~10π) 실측 여유 — 네 면 전부 ≥ 0 이어야 한다.
//      왼쪽 0.003 · 오른쪽 2.36 · 뒤 0.77 · 앞 0.42
// =============================================================
const OWNER_TURN = 0.5;                                  // rotation.y 진폭 — 손님(마을 카메라) 쪽을 본다
const OWNER_HALF = 0.58;                                 // |rotation.y| = OWNER_TURN 에서의 xz 발자국 반경(실측 0.577 올림)
const WALL_L = -SHOP_W / 2 + SHOP_T;                     // 왼쪽 옆벽 안쪽면 −1.91
const DOOR_R = -SHOP_W / 2 + SHOP_DOOR_W - SHOP_T / 2;   // 문 개구부 오른쪽(문틀 기둥 안쪽면) −0.795
const HOME_X = -1.35, SWING_X = 0.32;                    // 41.2° 검수 당시 배회 — 오른쪽 끝만 그대로 쓴다
const X_MIN = WALL_L + OWNER_HALF;                       // −1.33 · 왼쪽 옆벽이 정하는 한계
const X_MAX = Math.min(HOME_X + SWING_X, DOOR_R);        // −1.03 · 중심이 문 개구부를 안 벗어난다
const OWNER_CX = (X_MIN + X_MAX) / 2;                    // −1.18
const OWNER_AX = (X_MAX - X_MIN) / 2;                    // 0.15 (좌우 0.30 — 앞뒤 0.70 과 함께 걷는 게 보인다)

/**
 * 주인 배회 — 게임의 주민(wanderTimer)과 같은 결이되, **가게 안을 못 벗어난다**.
 *   중심 x −1.33~−1.03 · z −0.25~0.45. 범위는 위 블록에서 **몸통 가장자리 vs 벽 안쪽면**
 *   으로 파생한다 — 중심을 가게 경계와 비교하면 벽 뚫림을 못 잡는다.
 * @param {{owner: object}} shop  buildShop 이 돌려준 것
 * @param {number} t              경과 시간(초)
 * @param {number} [phase]        같은 무대에 여러 채가 설 때 박자를 어긋내는 위상(시뮬 전용)
 */
export function updateShopOwner(shop, t, phase = 0) {
  const o = shop && shop.owner; if (!o) return;
  const p = t * 0.55 + phase;
  o.position.x = OWNER_CX + Math.sin(p) * OWNER_AX;          // 문 베이 안에서만 (몸 끝이 옆벽을 안 넘는다)
  o.position.z = 0.10 + Math.sin(p * 0.6) * 0.35;            // −0.25~0.45 — 뒷벽·정면 안쪽면까지 여유 0.77 / 0.42
  //  ⚠️ 예전엔 `+ Math.PI` 가 붙어 있었다 — 그러면 주석과 **반대로** 등을 보인다.
  //     animal-faces.js 는 얼굴을 +Z 에 만들고(코 z 1.30·눈 z 0.86), 마을 카메라는 늘 −Z 를 본다.
  //     41.2° 검수는 배회를 끈 채(회전 0) 봤기 때문에 이 방향이 검수된 적이 없었다.
  o.rotation.y = Math.sin(p) * OWNER_TURN;                   // 손님(카메라) 쪽을 본다 — 발자국을 넓히는 장본인이다
  o.position.y = SHOP_T + Math.abs(Math.sin(p * 3.2)) * 0.035;    // 걸음 들썩임
}
