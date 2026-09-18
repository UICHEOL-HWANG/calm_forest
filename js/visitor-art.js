// =============================================================
//  calm forest · 🦋 텃밭 방문객 조형 4종
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-17-habitat-design.md
//  ▶ 🐸 청개구리 사양(2026-09-17 사용자 확정)을 4종의 공통 문법으로 쓴다:
//      · 몸통 없이 **둥근 머리 하나** (가로로 약간 넓은 타원)
//      · 머리 윤곽 **위로 튀어나온** 흰 눈 2개 + 정면 고정 검은 동공(흰자의 약 40%)
//      · 눈 사이 아래 작은 검은 점 2개(콧구멍)
//      · 아래로 볼록한 굵은 입선 하나
//      · 연분홍 볼터치
//      · 단색 · 아웃라인 없음(검정은 눈·코·입에만)
//    종별 차이는 여기에 **덧붙이는 부속**(날개·부리·가시)으로만 준다.
//  ▶ ⚠️ 정면 2D 도안이라 3D 로 옮기면 측면이 빈다.
//    눈·입·볼터치를 전부 정면 쪽에 얕게 붙이고, 머리를 앞뒤로 눌러 옆에서도 실루엣이 읽히게 한다.
//  ▶ ⚠️ 재질을 공유하지 않는다 — farm-visitors 가 페이드에 material.opacity 를 직접 건드리므로
//    공유하면 다른 방문객·지형까지 같이 투명해진다(장식 고스트에서 겪은 사고와 같은 유형).
//  ▶ 테스트: npm test (tests/visitor-art.test.mjs)
// =============================================================

/** 종별 몸 색 — 연한 단색. 아웃라인이 없으므로 잔디 배경과 충분히 달라야 한다 */
export const VISITOR_BODY = {
  butterfly: 0xe8a0c8,   // 연분홍
  sparrow:   0xb9c6d4,   // 흐린 청회색 — 🦔 와 나란히 놓여도 구분되게(갈색 둘은 섞인다)
  // ⚠️ 갈색 몸 + 진한 갈색 가시 = 🌰밤 이 된다(과수원에 실제로 밤이 있어 더 헷갈린다).
  //    얼굴을 크림색으로 빼서 "뚜껑 덮인 견과" 가 아니라 "가시 두른 얼굴" 로 읽히게 한다.
  hedgehog:  0xecd9bd,   // 크림색 얼굴
  frog:      0xa8d586,   // 연두 — 레퍼런스 색
};

const EYE_WHITE = 0xffffff, EYE_BLACK = 0x1b1b1b, BLUSH = 0xf0b9c2;

export const HEAD_R = 0.34;        // 머리 반지름
export const HEAD_Y = 0.42;        // 바닥에서 머리 중심까지
const EYE_R = HEAD_R * 0.44;       // 튀어나온 흰 눈 — 레퍼런스에서 얼굴을 지배하는 요소다
const PUPIL_R = EYE_R * 0.40;      // 동공 — 흰자의 약 40%

/** 재질은 매번 새로 만든다(페이드가 opacity 를 직접 건드린다) */
const mat = (THREE, color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

/**
 * 같은 지오메트리·재질을 여러 자리에 놓을 때 InstancedMesh 로 묶는다 — **드로우콜 1개**.
 * ⚠️ 눈·콧구멍·볼터치·가시를 낱개 Mesh 로 두면 🦔 하나가 36콜이었다(2026-09-18 실측).
 *   동시 2마리면 52콜이 늘어 밭 기준선(약 150)의 3분의 1이다. 짝·무리는 반드시 여기로 묶는다.
 * @param {Array<{p:[x,y,z], r?:[x,y,z], s?:[x,y,z]}>} at 놓을 자리들
 */
function cluster(THREE, geo, material, at, shadow = false) {
  const m = new THREE.InstancedMesh(geo, material, at.length);
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), eul = new THREE.Euler();
  at.forEach((a, i) => {
    pos.set(...a.p);
    eul.set(...(a.r || [0, 0, 0]));
    quat.setFromEuler(eul);
    scl.set(...(a.s || [1, 1, 1]));
    m.setMatrixAt(i, new THREE.Matrix4().compose(pos, quat, scl));
  });
  m.instanceMatrix.needsUpdate = true;
  // 그림자는 실루엣에 보이는 것만 — 눈·콧구멍·볼터치는 머리에 붙어 있어 그림자가 보이지도 않으면서
  // 섀도 패스에서 한 번 더 그려진다(드로우콜 2배).
  m.castShadow = shadow;
  return m;
}

/** 공통 얼굴 — 🐸 사양 그대로. 모든 종이 이걸 쓴다. 부속은 호출부가 더한다. */
function makeHead(THREE, bodyColor) {
  const g = new THREE.Group();

  // 머리 — 가로로 약간 넓은 타원(1 : 0.9). 앞뒤도 살짝 눌러 옆 실루엣을 만든다
  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 18, 14), mat(THREE, bodyColor));
  head.scale.set(1, 0.9, 0.92);
  head.position.y = HEAD_Y;
  head.castShadow = true;
  g.add(head);

  // 눈 — 머리 윤곽 **위로** 튀어나온다(레퍼런스의 핵심 인상). 종을 가리지 않고 같은 규칙.
  // ⚠️ eyeY 를 낮추면 눈이 머리 안으로 들어가 평범한 동물 얼굴이 된다 — 레퍼런스의 인상이 사라진다.
  const eyeY = HEAD_Y + HEAD_R * 0.70, eyeX = HEAD_R * 0.50, eyeZ = HEAD_R * 0.26;
  g.add(cluster(THREE, new THREE.SphereGeometry(EYE_R, 14, 12), mat(THREE, EYE_WHITE),
    [-1, 1].map(s => ({ p: [eyeX * s, eyeY, eyeZ] }))));
  // 동공 — 정면 고정 · 하이라이트 없음
  g.add(cluster(THREE, new THREE.SphereGeometry(PUPIL_R, 10, 8), mat(THREE, EYE_BLACK),
    [-1, 1].map(s => ({ p: [eyeX * s, eyeY, eyeZ + EYE_R * 0.72] }))));

  // 콧구멍 — 눈 사이 아래 작은 점 2개
  g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.055, 8, 6), mat(THREE, EYE_BLACK),
    [-1, 1].map(s => ({ p: [HEAD_R * 0.14 * s, HEAD_Y + HEAD_R * 0.16, HEAD_R * 0.90] }))));

  // 입 — 아래로 볼록한 굵은 곡선 하나. 두께가 있어야 인상이 산다(얇으면 멀리서 사라진다).
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(HEAD_R * 0.46, HEAD_R * 0.065, 8, 20, Math.PI),
    mat(THREE, EYE_BLACK));
  mouth.position.set(0, HEAD_Y - HEAD_R * 0.02, HEAD_R * 0.80);
  mouth.rotation.z = Math.PI;      // 호가 아래로 볼록해진다
  g.add(mouth);

  // 볼터치 — 연분홍. 이 크기에선 사선 2줄이 뭉개지므로 납작한 원반으로 옮긴다.
  g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.17, 10, 8), mat(THREE, BLUSH),
    [-1, 1].map(s => ({ p: [HEAD_R * 0.62 * s, HEAD_Y - HEAD_R * 0.10, HEAD_R * 0.68], s: [1, 0.75, 0.35] }))));
  return g;
}

/**
 * 방문객 조형. y 는 이 함수가 정한다 — farm-visitors 는 x·z 만 놓는다.
 * @param {object} THREE
 * @param {'butterfly'|'sparrow'|'hedgehog'|'frog'} id
 * @returns {object} THREE.Group
 */
export function makeVisitor(THREE, id) {
  const color = VISITOR_BODY[id] || VISITOR_BODY.frog;
  const g = makeHead(THREE, color);

  if (id === 'butterfly') {
    // 날개 — ⚠️ 덩어리 4개로는 꽃·구름처럼 보인다(첫 시안). 나비로 읽히려면
    //   ① 위 날개가 크고 위로 솟고 ② 아래 날개가 작고 아래로 처지고 ③ 아주 얇아야 한다.
    const wingTip = 0xf6d9e8;   // 끝동 — 단색 덩어리를 피한다
    const wingMat = (c) => new THREE.MeshStandardMaterial({
      color: c, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    //        반지름         y      z    기울기  세로비   색
    for (const [r, dy, dz, rot, sy, c] of [
      [HEAD_R * 1.05,  0.30, -0.02,  0.50, 1.15, color],      // 윗날개 — 크고 위로
      [HEAD_R * 0.62, -0.14, -0.02, -0.30, 0.85, wingTip],    // 아랫날개 — 작고 아래로
    ]) {
      // 좌우 한 쌍을 한 콜로 — 살짝 비틀어 옆에서도 면이 보인다
      g.add(cluster(THREE, new THREE.CircleGeometry(r, 16), wingMat(c), [-1, 1].map(s => ({
        p: [HEAD_R * (0.85 + r * 0.5) * s, HEAD_Y + dy, dz],
        r: [0, Math.PI / 2 * s * 0.12, rot * s],
        s: [0.78, sy, 1],
      })), true));
    }
    // 더듬이
    g.add(cluster(THREE, new THREE.CylinderGeometry(0.012, 0.012, HEAD_R * 0.7, 6), mat(THREE, EYE_BLACK),
      [-1, 1].map(s => ({ p: [HEAD_R * 0.28 * s, HEAD_Y + HEAD_R * 1.05, HEAD_R * 0.1], r: [0, 0, 0.45 * s] }))));
  } else if (id === 'sparrow') {
    // 부리 — ⚠️ 첫 시안은 너무 작아 코처럼 묻혔다. 크고 노랗게 앞으로 뻗어야 새로 읽힌다.
    const beak = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.26, HEAD_R * 0.62, 4), mat(THREE, 0xf0a63a));
    beak.position.set(0, HEAD_Y + HEAD_R * 0.06, HEAD_R * 1.08);
    beak.rotation.set(Math.PI / 2, 0, Math.PI / 4);   // 4각뿔을 마름모로 세운다
    g.add(beak);
    // 꼬리 — 뒤로 뻗은 납작한 판
    const tail = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.45, 10, 8), mat(THREE, color));
    tail.scale.set(0.5, 0.28, 1);
    tail.position.set(0, HEAD_Y - HEAD_R * 0.25, -HEAD_R * 1.15);
    g.add(tail);
  } else if (id === 'hedgehog') {
    // 가시 — ⚠️ 첫 시안은 짧고 성겨 얼룩처럼 보였다. 길고 촘촘하게, 뒤통수를 확실히 덮는다.
    //   앞얼굴은 여전히 비워 둔다(표정이 살아야 한다).
    //   ⚠️ 위쪽만 덮으면 "뚜껑" 이 돼 🌰밤 으로 읽힌다. **옆으로 넓게** 둘러 갈기처럼 퍼뜨리고,
    //   바깥으로 눕혀 실루엣에 뾰족한 결이 나오게 한다.
    //   ⚠️ 26개를 낱개 Mesh 로 두면 이것만 26콜이다 — InstancedMesh 로 1콜에 묶는다.
    const at = [];
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI * 0.62 + (i / 25) * Math.PI * 2.24;   // 얼굴 앞 좁은 구간만 비운다
      const tier = i % 2;
      const r = HEAD_R * (0.86 + tier * 0.10);
      at.push({
        p: [Math.cos(a) * r,
            HEAD_Y + HEAD_R * (0.14 + tier * 0.26),            // 위가 아니라 옆까지 내려온다
            -Math.abs(Math.sin(a)) * r * 0.62 - HEAD_R * 0.06],
        // 바깥으로 눕혀 방사형 갈기를 만든다(위로 세우면 다시 뚜껑이 되고 🌰밤 처럼 보인다)
        r: [-0.55 - tier * 0.20, a, -Math.cos(a) * 0.65],
      });
    }
    g.add(cluster(THREE, new THREE.ConeGeometry(HEAD_R * 0.12, HEAD_R * 0.80, 5), mat(THREE, 0x8b7355), at, true));
  }
  // 🐸 는 공통 얼굴 그대로 — 레퍼런스가 "머리 하나" 라 부속이 없다
  return g;
}
