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
 * 🦔 **가시끼리 이어진 껍질** — 낱개 바늘을 꽂는 게 아니라 하나의 지오메트리다.
 *   정이십면체의 각 면을 꼭짓점 하나로 뽑아올려, 이웃 가시와 **변을 공유**하게 만든다.
 *   ⚠️ 공에 바늘을 꽂는 방식은 7차까지 시도했고 전부 🌰밤 으로 읽혔다(2026-09-18).
 *      바늘이 공보다 작으면 시선이 공을 먼저 읽는다 — 껍질 자체가 형태가 되어야 한다.
 *   ⚠️ detail 을 1 이상으로 올리면 면이 80개가 되어 가시가 촘촘해진다 → 환공포증. 0 을 유지한다.
 * @param {(c:{x,y,z}) => boolean} keep 그 면을 가시로 뽑을지(얼굴 쪽은 비운다)
 */
function spikyShell(THREE, radius, spikeLen, keep) {
  const base = new THREE.IcosahedronGeometry(radius, 0).toNonIndexed();
  const pos = base.attributes.position;
  const out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    if (!keep(cen)) continue;
    const apex = cen.clone().normalize().multiplyScalar(radius + spikeLen);
    // 면 하나 → 삼각뿔 세 면. 밑변을 원래 면에 두므로 이웃 가시와 변이 붙는다.
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      out.push(p.x, p.y, p.z, q.x, q.y, q.z, apex.x, apex.y, apex.z);
    }
  }
  base.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();   // 평면 음영 — 저폴리 톤에 맞는다
  return g;
}

/**
 * 공통 얼굴 — 🐸 사양 그대로. 모든 종이 이걸 쓴다. 부속은 호출부가 더한다.
 * @param {{mouth?:boolean, nose?:boolean, eyes?:'bulge'|'flat'|'dark', eyeMul?:number}} opt
 *   부리·코가 입·콧구멍을 대신하는 종은 끈다. eyes 는 종별 눈 모양(위 주석 참고).
 *   eyeMul 은 눈 크기 배율 — 🐦 레퍼런스는 눈이 얼굴의 3분의 1씩을 차지한다.
 */
function makeHead(THREE, bodyColor, opt = {}) {
  const { mouth = true, nose = true, eyes = 'bulge', eyeMul = 1, dome = true, blush = true } = opt;
  const g = new THREE.Group();

  // 머리 — 가로로 약간 넓은 타원(1 : 0.9). 앞뒤도 살짝 눌러 옆 실루엣을 만든다.
  // ⚠️ 🦔 는 가시 껍질이 머리 역할을 한다 — 안에 구체를 또 넣으면 껍질 틈으로 둥근 면이 비쳐
  //    다시 "공 + 가시" 로 읽힌다. dome:false 로 끈다.
  if (dome) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 18, 14), mat(THREE, bodyColor));
    head.scale.set(1, 0.9, 0.92);
    head.position.y = HEAD_Y;
    head.castShadow = true;
    g.add(head);
  }

  // 눈 — ⚠️ 🐸 의 "머리 윤곽 위로 튀어나온 눈" 은 **개구리 특징**이다.
  //   네 마리에 똑같이 붙이면 고슴도치가 골프공 두 개를 얹은 꼴이 된다(2026-09-18 지적).
  //   그래서 종별로 나눈다:
  //     bulge — 🐸. 윤곽 위로 솟은 흰 구 + 검은 동공(레퍼런스)
  //     flat  — 🦋🐦. 흰자는 있지만 얼굴에 붙어 솟지 않는다
  //     dark  — 🦔. 흰자 없이 얼굴에 박힌 검은 눈 + 작은 반짝임(레퍼런스)
  if (eyes === 'dark') {
    const eyeX = HEAD_R * 0.34, eyeY = HEAD_Y - HEAD_R * 0.08, eyeZ = HEAD_R * 0.78;
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
  if (blush) g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.17, 10, 8), mat(THREE, BLUSH),
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
    sparrow:   { eyes: 'flat', mouth: false, nose: false },
    hedgehog:  { eyes: 'dark', nose: false, mouth: false, dome: false, blush: false },
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

    // 부리 — ⚠️ 여섯 번 틀렸다. 답은 추측이 아니라 **이미 통과한 수치**에 있었다:
    //   🦔 주둥이(반경 0.40R · 길이 0.80R · 아래로 0.34rad · 눌림 없음)가 잘 읽혔으므로
    //   그 비율을 그대로 쓰고 색만 주황으로, 눌림만 살짝(0.55) 준다.
    //   카메라가 내려다보므로 수평에 가까우면 짓눌려 안 보이고, 더 꺾으면 당근처럼 늘어진다.
    const BEAK_LEN = HEAD_R * 0.78;
    const lower = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.32, BEAK_LEN, 4), mat(THREE, 0xf0a06a));
    lower.rotation.set(Math.PI / 2 + 0.30, 0, Math.PI / 4);
    lower.position.set(0, HEAD_Y - HEAD_R * 0.04, HEAD_R * 0.80);
    lower.scale.set(1, 1, 0.55);
    lower.castShadow = true;
    g.add(lower);
    // 윗부리 — 같은 계열로 살짝만 진하게. 대비를 크게 하면 "당근 + 이파리" 가 된다.
    const upper = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.31, BEAK_LEN * 0.90, 4), mat(THREE, 0xdf8a4c));
    upper.rotation.set(Math.PI / 2 + 0.19, 0, Math.PI / 4);
    upper.position.set(0, HEAD_Y + HEAD_R * 0.07, HEAD_R * 0.80);
    upper.scale.set(1, 1, 0.50);
    upper.castShadow = true;
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
    // 🦔 가시는 **서로 이어진 껍질**이다(사용자 제안 2026-09-18). spikyShell 주석 참고.
    //   얼굴은 껍질 앞아래를 비워 그 틈으로 내민다 — 그래서 "공 + 부속" 이 아니라 "가시 덩어리 + 얼굴" 이 된다.
    const QUILL = 0x8d867c, SNOUT = 0xc4bbaf, EAR = 0x7f776c;

    // 가시 껍질 — 앞아래(얼굴 자리)만 비운다
    const shell = new THREE.Mesh(
      spikyShell(THREE, HEAD_R * 0.96, HEAD_R * 0.52,
        (c) => !(c.z > HEAD_R * 0.30 && c.y < HEAD_R * 0.34)),
      new THREE.MeshStandardMaterial({ color: QUILL, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
    shell.position.y = HEAD_Y;
    shell.castShadow = true;
    g.add(shell);

    // 주둥이 — 껍질 틈으로 앞아래로 내민다. 밤에 없는 형태다.
    const snout = new THREE.Mesh(new THREE.ConeGeometry(HEAD_R * 0.40, HEAD_R * 0.80, 12), mat(THREE, SNOUT));
    snout.rotation.x = Math.PI / 2 + 0.34;
    snout.position.set(0, HEAD_Y - HEAD_R * 0.38, HEAD_R * 0.78);
    snout.castShadow = true;
    g.add(snout);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.12, 10, 8), mat(THREE, 0x2e2621));
    nose.scale.set(1.2, 0.9, 0.8);
    nose.position.set(0, HEAD_Y - HEAD_R * 0.62, HEAD_R * 1.06);
    g.add(nose);
    // 둥근 귀 — 껍질 옆에 살짝 걸친다
    g.add(cluster(THREE, new THREE.SphereGeometry(HEAD_R * 0.24, 12, 10), mat(THREE, EAR),
      [-1, 1].map(s => ({
        p: [HEAD_R * 0.80 * s, HEAD_Y + HEAD_R * 0.10, HEAD_R * 0.34],
        s: [0.86, 1.00, 0.48],
      })), true));
  }
  // 🐸 는 공통 얼굴 그대로 — 레퍼런스가 "머리 하나" 라 부속이 없다
  return g;
}
