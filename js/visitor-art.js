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
  sparrow:   0xf7f1e6,   // 흰 얼굴 — 레퍼런스대로. 붉은 관모·갈색 눈썹띠가 대비를 만든다
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

/**
 * 공통 얼굴 — 🐸 사양 그대로. 모든 종이 이걸 쓴다. 부속은 호출부가 더한다.
 * @param {{mouth?:boolean, nose?:boolean}} opt 부리·코가 입·콧구멍을 대신하는 종은 끈다
 */
function makeHead(THREE, bodyColor, opt = {}) {
  const { mouth = true, nose = true } = opt;
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

  // 콧구멍 — 눈 사이 아래 작은 점 2개. 부리·코가 있는 종은 끈다(두 개가 겹치면 지저분하다).
  if (nose) g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.055, 8, 6), mat(THREE, EYE_BLACK),
    [-1, 1].map(s => ({ p: [HEAD_R * 0.14 * s, HEAD_Y + HEAD_R * 0.16, HEAD_R * 0.90] }))));

  // 입 — 아래로 볼록한 굵은 곡선 하나. 두께가 있어야 인상이 산다(얇으면 멀리서 사라진다).
  if (mouth) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(HEAD_R * 0.46, HEAD_R * 0.065, 8, 20, Math.PI),
      mat(THREE, EYE_BLACK));
    m.position.set(0, HEAD_Y - HEAD_R * 0.02, HEAD_R * 0.80);
    m.rotation.z = Math.PI;      // 호가 아래로 볼록해진다
    g.add(m);
  }

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
  // 🐦 부리, 🦔 코가 공통 입·콧구멍을 대신한다 — 둘 다 붙으면 지저분해진다
  const g = makeHead(THREE, color, id === 'sparrow' ? { mouth: false }
                                : id === 'hedgehog' ? { nose: false } : {});

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
    // 🐦 레퍼런스(2026-09-18 사용자 제공) 특징: 흰 얼굴 · **붉은 관모가 뒤로 쓸려 올라감**
    //   · 눈 위 **진한 갈색 눈썹띠** · 주황색 **짧고 넓은** 삼각 부리(부리가 입 역할)
    //   ⚠️ 이전 시안은 청회색 공 + 작은 주황 삼각형이라 🌰밤 꼭지로 읽혔다.
    //   밤과 갈리는 건 색이 아니라 **관모와 눈썹띠** 다 — 둘이 얼굴 위쪽에 결을 만든다.
    const CREST = 0xc4553c, BROW = 0x5d4433, WING = 0xa8825e;

    // 부리 — 넓고 짧게, 살짝 아래로. 레퍼런스처럼 부리 자체가 웃는 입이 된다.
    const beak = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.30, HEAD_R * 0.52, 4), mat(THREE, 0xf09a3c));
    beak.position.set(0, HEAD_Y - HEAD_R * 0.04, HEAD_R * 0.98);
    beak.rotation.set(Math.PI / 2 + 0.22, 0, Math.PI / 4);
    beak.scale.set(1, 1, 0.62);          // 위아래로 눌러 넓적하게
    beak.castShadow = true;
    g.add(beak);
    // 부리 아래 그림자 선 — 위아래 부리가 갈린 느낌(레퍼런스의 웃는 입)
    const gape = new THREE.Mesh(new THREE.TorusGeometry(HEAD_R * 0.20, HEAD_R * 0.035, 6, 14, Math.PI), mat(THREE, 0x8a4a1c));
    gape.position.set(0, HEAD_Y - HEAD_R * 0.14, HEAD_R * 0.92);
    gape.rotation.z = Math.PI;
    g.add(gape);

    // 관모 — 뒤로 쓸려 올라간 붉은 판 5장. ⚠️ 3장·작게 두면 정수리 점처럼 보인다(3차 시안).
    //   정수리를 덮고 뒤통수로 흐르도록 넓고 크게.
    g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.42, 10, 8), mat(THREE, CREST),
      [-0.52, -0.26, 0, 0.26, 0.52].map(dx => ({
        p: [HEAD_R * dx, HEAD_Y + HEAD_R * (0.92 - Math.abs(dx) * 0.28), -HEAD_R * 0.06],
        r: [-0.80, 0, dx * 1.1],
        s: [0.52, 1.35, 0.50],
      })), true));

    // 눈썹띠 — 눈 위를 덮는 진한 갈색 호. 레퍼런스에서 표정을 만드는 요소다.
    g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.36, 10, 8), mat(THREE, BROW),
      [-1, 1].map(s => ({
        p: [HEAD_R * 0.52 * s, HEAD_Y + HEAD_R * 1.06, HEAD_R * 0.24],
        r: [0, 0, -0.50 * s],
        s: [1.15, 0.30, 0.66],
      }))));

    // 날개 — 양옆으로 벌려 가로로 넓은 실루엣(공에서 벗어난다)
    g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.62, 10, 8), mat(THREE, WING),
      [-1, 1].map(s => ({
        p: [HEAD_R * 1.00 * s, HEAD_Y - HEAD_R * 0.14, -HEAD_R * 0.10],
        r: [0, 0, -0.55 * s],
        s: [0.42, 0.85, 0.62],
      })), true));
    // 꼬리 — 뒤로 **위로** 솟게. 납작하게 눕히면 정면에서 안 보인다.
    const tail = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.55, 10, 8), mat(THREE, WING));
    tail.scale.set(0.34, 0.30, 1.05);
    tail.position.set(0, HEAD_Y + HEAD_R * 0.10, -HEAD_R * 1.25);
    tail.rotation.x = -0.55;
    tail.castShadow = true;
    g.add(tail);
  } else if (id === 'hedgehog') {
    // 가시 — ⚠️ 첫 시안은 짧고 성겨 얼룩처럼 보였다. 길고 촘촘하게, 뒤통수를 확실히 덮는다.
    //   앞얼굴은 여전히 비워 둔다(표정이 살아야 한다).
    //   ⚠️ 위쪽만 덮으면 "뚜껑" 이 돼 🌰밤 으로 읽힌다. **옆으로 넓게** 둘러 갈기처럼 퍼뜨리고,
    //   바깥으로 눕혀 실루엣에 뾰족한 결이 나오게 한다.
    //   ⚠️ 26개를 낱개 Mesh 로 두면 이것만 26콜이다 — InstancedMesh 로 1콜에 묶는다.
    //   ⚠️ 색을 바꾼 뒤에도 🌰밤 으로 읽혔다(2026-09-18). 표면에 무늬를 얹는 게 아니라
    //   **윤곽선을 톱니로 만들어야** 한다. 가시를 머리 반지름보다 길게(1.15×) 빼고
    //   확실히 바깥으로 눕혀, 머리 실루엣 밖으로 삐져나오게 한다.
    // 🦔 레퍼런스(2026-09-18 사용자 제공) 특징: 크림 얼굴 · **둥근 갈색 귀 2개**
    //   · 앞으로 살짝 나온 갈색 주둥이 + 진한 삼각 코 · 가늘고 촘촘한 **흰빛 침**이 위로 방사
    //   ⚠️ 귀가 없어서 🌰밤 으로 읽혔다. 둥근 귀 두 개만 붙어도 "동물" 로 읽힌다 — 이게 제일 큰 차이다.
    const EAR = 0x8a6a52, SNOUT = 0xb08a6a;

    // 둥근 귀 — 머리 옆 위쪽. 납작하게 눌러 윤곽에 두 개의 혹을 만든다.
    g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.30, 12, 10), mat(THREE, EAR),
      [-1, 1].map(s => ({
        p: [HEAD_R * 0.78 * s, HEAD_Y + HEAD_R * 0.62, HEAD_R * 0.02],
        s: [0.90, 1.00, 0.55],
      })), true));

    // 주둥이 — 앞으로 살짝 나온 갈색 덩어리
    const snout = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.34, 12, 10), mat(THREE, SNOUT));
    snout.scale.set(0.85, 0.72, 0.95);
    snout.position.set(0, HEAD_Y - HEAD_R * 0.16, HEAD_R * 0.86);
    snout.castShadow = true;
    g.add(snout);
    // 코 — 주둥이 끝 진한 삼각
    const nose = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.13, 10, 8), mat(THREE, 0x40312a));
    nose.scale.set(1.15, 0.85, 0.7);
    nose.position.set(0, HEAD_Y - HEAD_R * 0.10, HEAD_R * 1.12);
    g.add(nose);

    //   ⚠️ 옆으로만 뻗으면 수염처럼 보인다(2026-09-18 2차). 머리 **돔 위쪽**을
    //   구면 좌표로 덮고 각 가시를 바깥 법선 방향으로 눕혀야 정수리가 톱니가 된다.
    //   앞쪽 ±60° 는 비워 얼굴을 살린다.
    const SPIKE_LEN = HEAD_R * 1.05;
    const at = [];
    // ⚠️ 성기면 잔머리처럼 보인다(3차 시안). 레퍼런스의 침은 **촘촘한 다발**이다.
    //   InstancedMesh 라 개수를 늘려도 드로우콜은 1개다 — 밀도를 아끼지 않는다.
    const TIERS = [0.20, 0.48, 0.76, 1.04];   // +Y 로부터의 각도(rad) — 정수리부터 옆까지 4단
    for (const t of TIERS) {
      const n = t < 0.35 ? 8 : t < 0.62 ? 14 : t < 0.90 ? 18 : 20;   // 위 단은 둘레가 짧아 개수도 적다
      for (let i = 0; i < n; i++) {
        const phi = Math.PI * (0.36 + (i / (n - 1)) * 1.28);   // +Z(정면)에서 65°~295°
        const sy = Math.sin(t), cy = Math.cos(t);
        const jit = ((i * 7) % 5 - 2) * 0.03;                  // 살짝 흔들어 줄맞춤 티를 없앤다
        at.push({
          p: [HEAD_R * sy * Math.sin(phi) * (0.90 + jit),
              HEAD_Y + HEAD_R * cy * (0.90 + jit),
              HEAD_R * sy * Math.cos(phi) * (0.90 + jit)],
          // 바깥 법선으로 눕힌다 — 원뿔의 +Y 축을 (t, phi) 방향으로 돌리는 근사
          r: [t * Math.cos(phi), 0, -t * Math.sin(phi)],
        });
      }
    }
    // 레퍼런스의 침은 가늘고 흰빛이다 — 굵은 갈색 뿔로 두면 다시 밤껍질이 된다
    g.add(cluster(THREE, new THREE.ConeGeometry(HEAD_R * 0.055, SPIKE_LEN, 4), mat(THREE, 0xd9c8ad), at, true));
  }
  // 🐸 는 공통 얼굴 그대로 — 레퍼런스가 "머리 하나" 라 부속이 없다
  return g;
}
