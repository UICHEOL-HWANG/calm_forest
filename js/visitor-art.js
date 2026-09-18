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
  // ⚠️⚠️ 🌰밤 과 헷갈린 시안이 네 번 나왔다(2026-09-18). 색을 바꾸고 귀를 붙여도 안 됐다.
  //    근본 원인: **따뜻한 갈색·크림 계열 둥근 공** 자체가 밤이다. 위에 무엇을 얹어도 밤이다.
  //    그래서 밤에 없는 것으로 승부한다 — ① 차가운 **회색** ② 앞으로 뻗은 **뾰족한 주둥이**
  //    ③ 머리 위쪽을 뒤덮는 **회색 가시 덩어리**(얼굴은 아래 앞쪽만 남긴다).
  //    따뜻한 갈색으로 되돌리지 말 것.
  hedgehog:  0xcfc7bd,   // 차가운 회베이지 얼굴
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
 * @param {{mouth?:boolean, nose?:boolean, eyes?:'bulge'|'flat'|'dark', eyeMul?:number}} opt
 *   부리·코가 입·콧구멍을 대신하는 종은 끈다. eyes 는 종별 눈 모양(위 주석 참고).
 *   eyeMul 은 눈 크기 배율 — 🐦 레퍼런스는 눈이 얼굴의 3분의 1씩을 차지한다.
 */
function makeHead(THREE, bodyColor, opt = {}) {
  const { mouth = true, nose = true, eyes = 'bulge', eyeMul = 1 } = opt;
  const g = new THREE.Group();

  // 머리 — 가로로 약간 넓은 타원(1 : 0.9). 앞뒤도 살짝 눌러 옆 실루엣을 만든다
  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 18, 14), mat(THREE, bodyColor));
  head.scale.set(1, 0.9, 0.92);
  head.position.y = HEAD_Y;
  head.castShadow = true;
  g.add(head);

  // 눈 — ⚠️ 🐸 의 "머리 윤곽 위로 튀어나온 눈" 은 **개구리 특징**이다.
  //   네 마리에 똑같이 붙이면 고슴도치가 골프공 두 개를 얹은 꼴이 된다(2026-09-18 지적).
  //   그래서 종별로 나눈다:
  //     bulge — 🐸. 윤곽 위로 솟은 흰 구 + 검은 동공(레퍼런스)
  //     flat  — 🦋🐦. 흰자는 있지만 얼굴에 붙어 솟지 않는다
  //     dark  — 🦔. 흰자 없이 얼굴에 박힌 검은 눈 + 작은 반짝임(레퍼런스)
  if (eyes === 'dark') {
    const eyeX = HEAD_R * 0.42, eyeY = HEAD_Y + HEAD_R * 0.26, eyeZ = HEAD_R * 0.74;
    const R = HEAD_R * 0.19;
    g.add(cluster(THREE, new THREE.SphereGeometry(R, 12, 10), mat(THREE, 0x241d18),
      [-1, 1].map(s => ({ p: [eyeX * s, eyeY, eyeZ], s: [1, 1, 0.7] }))));
    // 반짝임 — 이게 없으면 검은 구멍으로 보인다
    g.add(cluster(THREE, new THREE.SphereGeometry(R * 0.30, 8, 6), mat(THREE, EYE_WHITE),
      [-1, 1].map(s => ({ p: [eyeX * s + R * 0.30, eyeY + R * 0.34, eyeZ + R * 0.55] }))));
  } else {
    const bulge = eyes === 'bulge';
    const eyeX = HEAD_R * (bulge ? 0.50 : 0.44);
    const eyeY = HEAD_Y + HEAD_R * (bulge ? 0.70 : 0.30);
    const eyeZ = HEAD_R * (bulge ? 0.26 : 0.66);
    const R = EYE_R * (bulge ? 1 : 0.82) * eyeMul;
    g.add(cluster(THREE, new THREE.SphereGeometry(R, 14, 12), mat(THREE, EYE_WHITE),
      [-1, 1].map(s => ({ p: [eyeX * s, eyeY, eyeZ], s: bulge ? [1, 1, 1] : [1, 1, 0.55] }))));
    // 동공 — 정면 고정 · 하이라이트 없음. 앞으로 너무 빼면 검은 원반이 떠 보인다.
    g.add(cluster(THREE, new THREE.SphereGeometry(R * 0.42, 10, 8), mat(THREE, EYE_BLACK),
      [-1, 1].map(s => ({ p: [eyeX * s, eyeY, eyeZ + R * (bulge ? 0.68 : 0.34)] }))));
  }

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
  // 🐦 부리, 🦔 코가 공통 입·콧구멍을 대신한다 — 둘 다 붙으면 지저분해진다.
  // 눈 모양도 종별로 다르다(makeHead 주석) — 🐸 만 윤곽 위로 솟는다.
  const FACE = {
    butterfly: { eyes: 'flat' },
    // ⚠️ eyeMul 을 1.4 로 키웠더니 올빼미·원숭이처럼 보였다(2026-09-18). 기본 크기가 맞다.
    sparrow:   { eyes: 'flat', mouth: false },
    hedgehog:  { eyes: 'dark', nose: false },
    frog:      { eyes: 'bulge' },
  };
  const g = makeHead(THREE, color, FACE[id] || FACE.frog);

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

    // 부리 — ⚠️ 눈 아래로 내려오고 크면 늘어진 혀처럼 보인다(6차 시안 지적).
    //   레퍼런스는 **눈 사이 높이**에서 앞으로 짧고 좁게 뻗는다. 작게, 위로.
    const beak = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.21, HEAD_R * 0.38, 4), mat(THREE, 0xef8f5c));
    beak.rotation.set(Math.PI / 2 + 0.12, 0, Math.PI / 4);   // 앞으로, 끝만 살짝 아래
    beak.position.set(0, HEAD_Y + HEAD_R * 0.17, HEAD_R * 0.92);
    beak.scale.set(1, 1, 0.48);                              // 위아래로 눌러 넓적하게
    beak.castShadow = true;
    g.add(beak);
    // 윗부리 — 한 겹 더 얹어 위아래가 갈린 부리로 읽히게(단색은 고무 마개처럼 보인다)
    const upper = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.20, HEAD_R * 0.30, 4), mat(THREE, 0xd97442));
    upper.rotation.set(Math.PI / 2 + 0.02, 0, Math.PI / 4);
    upper.position.set(0, HEAD_Y + HEAD_R * 0.23, HEAD_R * 0.90);
    upper.scale.set(1, 1, 0.34);
    g.add(upper);

    // (웃는 입 선은 사용자 지시로 제외 — 부리만으로 충분하다)

    // 관모 — ⚠️ 작은 판 여러 장은 "빨간 모자" 로 보인다(4차 시안).
    //   레퍼런스는 **뒤로 쓸려 넘긴 하나의 덩어리**다. 정수리를 덮고 뒤통수로 길게 흐른다.
    const crest = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.72, 14, 12), mat(THREE, CREST));
    crest.scale.set(0.78, 0.52, 1.05);
    crest.position.set(0, HEAD_Y + HEAD_R * 0.62, -HEAD_R * 0.26);
    crest.rotation.x = -0.34;
    crest.castShadow = true;
    g.add(crest);
    // 관모 끝 삐침 3개 — 덩어리만 두면 헬멧처럼 매끈하다. 뒤로 뾰족하게 뺀다.
    g.add(cluster(THREE, new THREE.ConeGeometry(HEAD_R * 0.11, HEAD_R * 0.62, 4), mat(THREE, CREST),
      [-0.30, 0, 0.30].map(dx => ({
        p: [HEAD_R * dx, HEAD_Y + HEAD_R * (1.00 - Math.abs(dx) * 0.30), -HEAD_R * 0.34],
        r: [-1.15, 0, dx * 1.2],
      })), true));

    // 눈썹띠 — 눈 위를 스치는 갈색 띠. ⚠️ 너무 굵게 하면 올빼미 눈썹이 된다(6차 시안).
    g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.36, 12, 10), mat(THREE, BROW),
      [-1, 1].map(s => ({
        p: [HEAD_R * 0.48 * s, HEAD_Y + HEAD_R * 0.78, HEAD_R * 0.34],
        r: [0, 0, -0.38 * s],
        s: [1.00, 0.22, 0.48],
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
    // 🦔 ⚠️⚠️ 🌰밤 으로 읽힌 시안이 네 번 나왔다(2026-09-18). 색 변경·귀 추가로는 안 됐다.
    //   근본 원인: **따뜻한 갈색·크림 계열 둥근 공**이 곧 밤이다. 위에 무엇을 얹어도 밤이다.
    //   그래서 밤에 **없는 것**으로 승부한다:
    //     ① 차가운 **회색** 가시 (밤은 언제나 따뜻한 갈색이다)
    //     ② 앞으로 뻗은 **뾰족한 주둥이** (밤에는 주둥이가 없다)
    //     ③ 머리 위쪽을 **뒤덮는** 가시 덩어리 — 얼굴은 아래 앞쪽만 남긴다
    //   ⚠️ 따뜻한 갈색으로 되돌리거나 가시를 짧게 줄이지 말 것. 바로 밤으로 돌아간다.
    const EAR = 0x7f776c, SNOUT = 0xc4bbaf, QUILL = 0x6f6d66, QUILL_TIP = 0xa9a49a;

    // 주둥이 — 앞으로 길고 뾰족하게. 밤과 갈리는 두 번째 신호다.
    const snout = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.34, HEAD_R * 0.86, 12), mat(THREE, SNOUT));
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, HEAD_Y - HEAD_R * 0.22, HEAD_R * 0.92);
    snout.castShadow = true;
    g.add(snout);
    // 코 — 주둥이 끝 진한 점
    const nose = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.11, 10, 8), mat(THREE, 0x2e2621));
    nose.scale.set(1.2, 0.9, 0.8);
    nose.position.set(0, HEAD_Y - HEAD_R * 0.20, HEAD_R * 1.32);
    g.add(nose);
    // 둥근 귀 — 가시 앞쪽에 살짝 걸치게
    g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.26, 12, 10), mat(THREE, EAR),
      [-1, 1].map(s => ({
        p: [HEAD_R * 0.74 * s, HEAD_Y + HEAD_R * 0.46, HEAD_R * 0.16],
        s: [0.88, 1.00, 0.50],
      })), true));

    // 가시 — ⚠️ 가늘고 촘촘하게 84개를 박으니 **환공포증**을 일으킨다는 지적을 받았다(2026-09-18).
    //   오솔길 자갈에서 겪은 것과 같은 문제다: 작은 모양의 촘촘한 반복이 원인이다.
    //   그래서 **적고 굵게** 간다 — 14개의 넓은 삼각 가시로 실루엣만 만든다.
    //   개수를 다시 늘리지 말 것. 실루엣은 굵기로 만든다.
    const SPIKE_LEN = HEAD_R * 0.86;
    const at = [];
    const TIERS = [0.34, 0.80];                    // +Y 로부터의 각도(rad) — 정수리 / 옆
    for (const t of TIERS) {
      const n = t < 0.5 ? 6 : 8;
      for (let i = 0; i < n; i++) {
        const phi = Math.PI * (0.34 + (i / (n - 1)) * 1.32);   // +Z(정면)에서 61°~299°
        const sy = Math.sin(t), cy = Math.cos(t);
        at.push({
          p: [HEAD_R * sy * Math.sin(phi) * 0.86,
              HEAD_Y + HEAD_R * cy * 0.86,
              HEAD_R * sy * Math.cos(phi) * 0.86],
          // 바깥 법선으로 눕힌다 — 원뿔의 +Y 축을 (t, phi) 방향으로 돌리는 근사
          r: [t * Math.cos(phi), 0, -t * Math.sin(phi)],
        });
      }
    }
    g.add(cluster(THREE, new THREE.ConeGeometry(HEAD_R * 0.17, SPIKE_LEN, 4), mat(THREE, QUILL), at, true));
  }
  // 🐸 는 공통 얼굴 그대로 — 레퍼런스가 "머리 하나" 라 부속이 없다
  return g;
}
