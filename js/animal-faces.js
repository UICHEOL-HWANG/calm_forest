// 🎭 동물 캐릭터 머리 조립기 — 플러시(봉제인형) 스타일
//   sims/face-style-sim.html 에서 7종 검수한 값을 그대로 옮김(2026-09-13).
//   문법:
//     1) 구는 SphereGeometry(r,32,24) 스무스 — Icosahedron(r,1) 의 각진 면이 싸구려 인상의 8할
//     2) 눈 = 검은 구 + 흰 하이라이트 구 2개(큰 것 우상단·작은 것 좌하단)
//     3) 무늬(눈썹 점·볼터치·줄무늬) = patch(): 납작 타원을 구 표면 방향으로 반쯤 파묻음 — 텍스처 불필요
//     4) 귀 = 원뿔 대신 납작 타원 구(둥근 삼각형) + 안쪽 색 한 겹
//   모든 좌표는 단위 공간(머리 반지름 = 1)에서 잡고, 반환 그룹을 HR 로 스케일해 얹는다.
//   → 체형 수치(headR/headY)는 game.js ANIMALS 가 그대로 결정하고, 이 파일은 "얼굴 생김새"만 담당.
import * as THREE from 'three';

// 얼굴 전용 색(몸·배 색은 ANIMALS 에서 넘겨받아 드리프트 방지)
const FACE = {
  fox:    { nose: 0x3a2a24, eye: 0x2a1e18 },
  dog:    { nose: 0x1e1a18, eye: 0x151212, mouth: 0x3a2a24 },
  cat:    { stripe: 0x7b7c9e, earIn: 0xf2b3c0, nose: 0xf0a0b0, blush: 0xf0a9b8, muzzle: 0xf3d4d8, eye: 0x161616, mouth: 0x6a5a66, whisker: 0xffffff },
  rabbit: { earIn: 0xf5c3cc, nose: 0xe89aa8, blush: 0xf6c6cf, eye: 0x2a2226, teeth: 0xffffff },
  bear:   { nose: 0x231c19, eye: 0x1a1412, mouth: 0x3a2a24 },
  panda:  { black: 0x262626, eye: 0x161616, mouth: 0x3a3a3a },
  chick:  { beak: 0xff9a3a, comb: 0xf2564a, blush: 0xffb39a, eye: 0x1a1412 },
};

// 플러시 재질 — clayMat(0.95) 보다 살짝 덜 거칠게(봉제 천 느낌)
export function plushMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0 });
}
// 구 세분화는 반지름(단위 공간) 비례 — 머리(1.0)만 32, 주둥이·귀(0.2~0.5) 20, 눈·하이라이트(<0.2) 12.
//   하이라이트 구를 머리와 같은 32×24 로 만들면 한 마리에 삼각형이 수만 개 늘어난다(리뷰 지적).
const segsFor = (r) => (r >= 0.5 ? 32 : r >= 0.2 ? 20 : 12);
const S = (r, segs = segsFor(r)) => new THREE.SphereGeometry(r, segs, Math.round(segs * 0.75));
const noShadow = (m) => { m.castShadow = false; return m; };   // 눈·무늬·입처럼 표면에 붙는 장식은 그림자 패스에서 제외
const put = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; parent.add(m); return m;
};
// 단위구 표면의 방향 (dx,dy,dz) 에 납작 타원을 반쯤 파묻어 붙임 — 자유 배치 구는 표면에서 떠 보인다
//   ⚠️ lookAt 은 부모가 없는(월드=로컬) 상태에서 호출한다는 전제 — buildAnimalHead 가 항상 새 그룹(항등 변환)에
//   조립한 뒤 마지막에 scale/position 을 주므로 성립. 이미 변환된 그룹에 재사용하면 방향이 어긋난다.
function patch(g, dx, dy, dz, w, h, color, roll = 0, sink = 0.94, thick = 0.12) {
  const d = new THREE.Vector3(dx, dy, dz).normalize();
  const m = new THREE.Mesh(S(1, 20), plushMat(color));
  m.position.copy(d).multiplyScalar(sink); m.lookAt(d.clone().multiplyScalar(3)); m.rotateZ(roll);
  m.scale.set(w, h, thick); g.add(m); return m;   // castShadow 기본 false(장식)
}
// 눈: 검은 구 + 하이라이트 2개(ring 이면 흰 테두리 한 겹 — 고양이·판다처럼 검은 바탕과 분리할 때)
function eyes(g, { x, y, z, r, color, ring = false }) {
  const hi = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });   // 양쪽 눈이 공유
  const pupil = new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
  const ringMat = ring ? plushMat(0xffffff) : null;
  [-1, 1].forEach(s => {
    if (ring) noShadow(put(g, S(r * 1.10), ringMat, s * x, y, z - r * 0.40));
    noShadow(put(g, S(r), pupil, s * x, y, z));
    noShadow(put(g, S(r * 0.36), hi, s * x + r * 0.34, y + r * 0.42, z + r * 0.78));
    noShadow(put(g, S(r * 0.16), hi, s * x - r * 0.30, y - r * 0.30, z + r * 0.86));
  });
}
// 귀: 납작 타원(바깥색) + 안쪽 색 한 겹(살짝 앞으로)
function ear(g, side, { x, y, z, outer, inner, w = 0.30, h = 1.35, tilt = 0.35 }) {
  put(g, S(w), plushMat(outer), side * x, y, z, 0.9, h, 0.45, 0, 0, -side * tilt);
  put(g, S(w * 0.70), plushMat(inner), side * x, y - 0.02, z + 0.10, 0.65, h * 0.78, 0.32, 0, 0, -side * tilt);
}
// 아래쪽 반원 호(웃는 입 · ω 입의 반쪽)
function smile(g, x, y, z, r, color, rz = Math.PI) {
  noShadow(put(g, new THREE.TorusGeometry(r, r * 0.20, 6, 14, Math.PI), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), x, y, z, 1, 1, 1, 0, 0, rz));
}

const HEADS = {
  fox(g, body, cream) {
    const c = FACE.fox;
    put(g, S(1), plushMat(body), 0, 0, 0, 1.0, 0.95, 1.0);
    put(g, S(0.40), plushMat(body), 0, -0.14, 0.74, 0.95, 0.74, 1.50);            // 콧대(주둥이 윗면)
    put(g, S(0.34), plushMat(cream), 0, -0.36, 0.78, 0.95, 0.55, 1.05);           // 크림 아래턱(코 밑만)
    put(g, S(0.15), plushMat(c.nose), 0, -0.08, 1.30, 1.15, 0.9, 0.9);            // 코
    eyes(g, { x: 0.38, y: 0.14, z: 0.86, r: 0.13, color: c.eye });
    [-1, 1].forEach(s => patch(g, s * 0.40, 0.34, 0.84, 0.17, 0.085, cream, -s * 0.30));   // 눈썹 점
    [-1, 1].forEach(s => ear(g, s, { x: 0.62, y: 0.95, z: -0.10, outer: body, inner: cream, h: 1.45 }));
  },
  dog(g, body, cream) {   // 🐶 시바 — 쫑긋 귀 + 흰 볼·주둥이·눈썹
    const c = FACE.dog;
    put(g, S(1), plushMat(body), 0, 0, 0, 1.05, 0.95, 1.0);
    [-1, 1].forEach(s => put(g, S(0.46), plushMat(cream), s * 0.50, -0.26, 0.52, 1.0, 0.82, 0.95));   // 흰 볼
    put(g, S(0.42), plushMat(cream), 0, -0.30, 0.85, 1.10, 0.80, 1.00);           // 흰 주둥이
    put(g, S(0.16), plushMat(c.nose), 0, -0.12, 1.22, 1.2, 0.85, 0.8);            // 코
    smile(g, 0, -0.42, 1.26, 0.10, c.mouth);
    eyes(g, { x: 0.37, y: 0.12, z: 0.88, r: 0.19, color: c.eye });
    [-1, 1].forEach(s => patch(g, s * 0.40, 0.46, 0.82, 0.16, 0.11, cream, -s * 0.15));    // 눈썹 점
    [-1, 1].forEach(s => ear(g, s, { x: 0.60, y: 0.90, z: -0.05, outer: body, inner: cream, h: 1.30, tilt: 0.30 }));
  },
  cat(g, body) {
    const c = FACE.cat;
    put(g, S(1), plushMat(body), 0, 0, 0, 1.08, 1.0, 1.0);
    put(g, S(0.32), plushMat(c.muzzle), 0, -0.34, 0.88, 1.40, 0.75, 0.5);         // 연분홍 주둥이
    put(g, S(0.11), plushMat(c.nose), 0, -0.22, 1.04, 1.3, 0.8, 0.7);             // 코
    smile(g, -0.09, -0.40, 1.04, 0.09, c.mouth); smile(g, 0.09, -0.40, 1.04, 0.09, c.mouth);   // ω 입
    eyes(g, { x: 0.36, y: 0.08, z: 0.90, r: 0.20, color: c.eye, ring: true });
    [-1, 1].forEach(s => patch(g, s * 0.66, -0.18, 0.72, 0.15, 0.10, c.blush, 0, 0.98));   // 볼터치
    const wm = new THREE.MeshStandardMaterial({ color: c.whisker, roughness: 0.6 });
    [-1, 1].forEach(s => [0.10, 0, -0.10].forEach((dy, i) => {   // 수염: 주둥이 옆 피벗에서 +X 로 뻗음(끝이 뒤·위아래로 벌어짐)
      const L = 0.80, pv = new THREE.Group();
      pv.position.set(s * 0.30, -0.20 + dy * 1.2, 0.95); pv.rotation.set(0, -s * 0.55, s * (i - 1) * 0.16); g.add(pv);
      noShadow(put(pv, new THREE.CylinderGeometry(0.014, 0.014, L, 5), wm, s * L / 2, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2));
    }));
    patch(g, 0, 0.70, 0.66, 0.11, 0.30, c.stripe, 0, 0.99);                                  // 이마 줄무늬 3
    [-1, 1].forEach(s => patch(g, s * 0.36, 0.64, 0.64, 0.10, 0.26, c.stripe, -s * 0.30, 0.99));
    [-1, 1].forEach(s => [0.12, -0.16].forEach(dy => patch(g, s * 1.0, dy, 0.20, 0.09, 0.30, c.stripe, s * 0.10, 1.0)));   // 볼 줄무늬 2×2
    [-1, 1].forEach(s => ear(g, s, { x: 0.64, y: 0.88, z: -0.05, outer: body, inner: c.earIn, w: 0.32, h: 1.30 }));
  },
  rabbit(g, body) {
    const c = FACE.rabbit;
    put(g, S(1), plushMat(body), 0, 0, 0, 1.0, 1.0, 1.0);
    [-1, 1].forEach(s => put(g, S(0.21), plushMat(body), s * 0.17, -0.30, 0.90, 1.0, 0.85, 0.8));   // 코 아래 볼록한 볼 2개
    put(g, S(0.09), plushMat(c.nose), 0, -0.12, 1.02, 1.3, 0.8, 0.6);             // 분홍 코
    put(g, new THREE.BoxGeometry(0.20, 0.16, 0.05), plushMat(c.teeth), 0, -0.46, 0.92);   // 앞니
    eyes(g, { x: 0.36, y: 0.12, z: 0.90, r: 0.17, color: c.eye });
    [-1, 1].forEach(s => patch(g, s * 0.62, -0.16, 0.74, 0.14, 0.09, c.blush, 0, 0.98));   // 볼터치
    [-1, 1].forEach(s => ear(g, s, { x: 0.40, y: 1.50, z: -0.05, outer: body, inner: c.earIn, w: 0.30, h: 2.35, tilt: 0.12 }));   // 긴 귀
  },
  bear(g, body, muzzle) {
    const c = FACE.bear;
    put(g, S(1), plushMat(body), 0, 0, 0, 1.05, 0.95, 1.0);
    put(g, S(0.42), plushMat(muzzle), 0, -0.28, 0.80, 1.15, 0.85, 0.95);          // 연갈색 주둥이
    put(g, S(0.17), plushMat(c.nose), 0, -0.08, 1.18, 1.25, 0.85, 0.8);           // 코
    smile(g, 0, -0.40, 1.16, 0.10, c.mouth);
    eyes(g, { x: 0.36, y: 0.16, z: 0.90, r: 0.15, color: c.eye });
    [-1, 1].forEach(s => {                                                       // 둥근 귀 + 안쪽 연갈색
      put(g, S(0.34), plushMat(body), s * 0.68, 0.72, -0.10, 1, 1, 0.7);
      put(g, S(0.22), plushMat(muzzle), s * 0.68, 0.70, 0.06, 1, 1, 0.5);
    });
  },
  panda(g, body) {
    const c = FACE.panda;
    put(g, S(1), plushMat(body), 0, 0, 0, 1.08, 0.95, 1.0);
    [-1, 1].forEach(s => patch(g, s * 0.40, 0.10, 0.86, 0.30, 0.37, c.black, -s * 0.55, 0.97));   // 눈 패치(기울인 타원)
    eyes(g, { x: 0.38, y: 0.10, z: 0.92, r: 0.15, color: c.eye, ring: true });   // 흰 테두리로 패치와 분리
    put(g, S(0.36), plushMat(body), 0, -0.26, 0.78, 1.2, 0.8, 0.8);              // 살짝 나온 주둥이
    put(g, S(0.13), plushMat(c.black), 0, -0.14, 1.06, 1.3, 0.8, 0.7);           // 코
    smile(g, 0, -0.38, 1.02, 0.09, c.mouth);
    [-1, 1].forEach(s => put(g, S(0.34), plushMat(c.black), s * 0.66, 0.74, -0.08, 1, 1, 0.7));   // 검은 둥근 귀
  },
  chick(g, body) {
    const c = FACE.chick;
    put(g, S(1), plushMat(body), 0, 0, 0, 1.05, 1.0, 1.0);
    put(g, new THREE.ConeGeometry(0.20, 0.46, 20), plushMat(c.beak), 0, -0.10, 1.06, 1.0, 1.0, 0.75, Math.PI / 2, 0, 0);   // 위 부리: 앞을 향한 둥근 원뿔
    put(g, S(0.11), plushMat(c.beak), 0, -0.24, 1.00, 1.2, 0.45, 1.0);           // 아래 부리(작게)
    eyes(g, { x: 0.34, y: 0.16, z: 0.90, r: 0.16, color: c.eye });
    [-1, 1].forEach(s => patch(g, s * 0.58, -0.14, 0.76, 0.15, 0.10, c.blush, 0, 0.98));   // 볼터치
    [[0, 0.98, 0.05, 0.16], [0, 1.00, -0.18, 0.13], [0, 0.94, -0.38, 0.10]].forEach(([x, y, z, r]) => put(g, S(r, 20), plushMat(c.comb), x, y, z));   // 볏
  },
};

// 머리 그룹 생성 — id 별 얼굴을 단위 공간에서 조립해 HR 로 스케일, HY 높이에 놓는다.
//   body/belly 는 ANIMALS 색(주둥이·눈썹의 크림색은 배 색을 그대로 씀 → 몸과 톤이 맞음)
export function buildAnimalHead(id, { HR, HY, body, belly }) {
  const build = HEADS[id] || HEADS.fox;
  const g = new THREE.Group();
  build(g, body, belly);
  g.scale.setScalar(HR); g.position.y = HY;
  return g;
}
