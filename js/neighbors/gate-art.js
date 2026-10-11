// =============================================================
//  🎈 이웃 마을 입구 — 땅에 매인 작은 열기구(높이 ~5.5m) + 풍선 한가운데 "이웃 마을" 글씨
//  ------------------------------------------------------------
//  2026-10-11 팻말(1.5m)이 안 보여 4일 방문 1/118 → 시안 A 우체통 · B 열기구 · C 꽃 아치 중 B 확정(사용자).
//  ⚠️ 카메라는 늘 북쪽을 보고 주변 ~8m 만 비춘다 — 랜드마크는 "가까이 왔을 때 눈에 띄는" 역할,
//     찾아오게 하는 건 하루 한 번 배너(js/spaces/neighbor.js bootNeighborBanner).
//  저폴리 원칙(memory visitor-art-lessons): 줄무늬는 쐐기 8조각의 색으로(부속을 꽂지 않는다).
//  (THREE, label: 번역된 글씨) → { group, update(dt, t) } — 원점이 입구 자리, +z 가 길 쪽
// =============================================================

const mat = (THREE, color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
const glow = (THREE, color, k = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, flatShading: true });
function add(g, mesh, x, y, z, shadow = true) { mesh.position.set(x, y, z); if (shadow) mesh.castShadow = true; g.add(mesh); return mesh; }

// 글자판 — js/spaces/mist.js gateLabel 과 같은 규칙(이모지 없이 한글만 · 판 폭에 맞춰 폰트 축소)
function floatLabel(THREE, label, w, h) {
  const PX = 256, cv = document.createElement('canvas'); cv.width = Math.round(PX * w / h); cv.height = PX;
  const c = cv.getContext('2d');
  c.textAlign = 'center'; c.textBaseline = 'middle';
  let fs = Math.round(PX * 0.62);
  const font = (s2) => `bold ${s2}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
  c.font = font(fs); while (fs > 40 && c.measureText(label).width > cv.width * 0.86) { fs -= 6; c.font = font(fs); }
  c.lineWidth = fs * 0.14; c.strokeStyle = '#5a3a22'; c.strokeText(label, cv.width / 2, PX / 2 + 4);
  c.fillStyle = '#fffaf0'; c.fillText(label, cv.width / 2, PX / 2 + 4);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: 0xd0cabe, transparent: true, depthWrite: false, fog: false, toneMapped: false }));   // 안개·조명에 탁해지지 않게(밤에도 읽힌다) · color 로 블룸 임계 0.85 아래(번짐 방지)
}

export const BALLOON_STRIPES = [0xf5a35c, 0xfff1d0, 0x7cc4a0, 0xfff1d0, 0xf07f7f, 0xfff1d0, 0x8fb8e8, 0xfff1d0];

export function buildNeighborBalloon(THREE, label) {
  const g = new THREE.Group();
  const balloon = new THREE.Group();
  for (let i = 0; i < BALLOON_STRIPES.length; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(1.25, 4, 10, (i / BALLOON_STRIPES.length) * Math.PI * 2, (Math.PI * 2) / BALLOON_STRIPES.length), mat(THREE, BALLOON_STRIPES[i]));
    seg.castShadow = true; balloon.add(seg);
  }
  balloon.scale.set(1, 1.18, 1);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 0.5, 8, 1, true), mat(THREE, 0xf5a35c, { side: THREE.DoubleSide }));
  neck.position.y = -1.42; balloon.add(neck);
  balloon.position.y = 4.1; g.add(balloon);

  const rope = mat(THREE, 0x6b5240);
  for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {   // 바구니 ↔ 풍선 줄
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 4), rope);
    r.position.set(x * 0.8, 2.25, z * 0.8); g.add(r);
  }
  add(g, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.0), mat(THREE, 0xb07a4a)), 0, 1.0, 0);          // 바구니
  add(g, new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 1.08), mat(THREE, 0x8a5a34)), 0, 1.38, 0, false); // 테두리

  // 🏡 풍선 한가운데 "이웃 마을" — 과수원 사과 명판처럼 흰 글씨+짙은 테두리(사용자 요청 2026-10-11)
  //    풍선과 같이 흔들리게 balloon 의 자식. 앞면(+z)이 마을 쪽(카메라가 북향이라 남쪽 면이 보인다)
  const lbl = floatLabel(THREE, label, 2.2, 0.8);
  lbl.position.set(0, 0, 1.33); balloon.add(lbl);

  // 땅에 매어 둔 줄 + 말뚝
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), mat(THREE, 0x8a6a4a)), 1.3, 0.25, 0.9);
  const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), rope);
  tie.position.set(0.85, 0.75, 0.6); tie.rotation.set(0.4, 0, -0.75); g.add(tie);
  const lamp = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glow(THREE, 0xffd27a, 2)), 0.45, 1.55, 0.45, false);

  return {
    group: g,
    update(dt, t) {
      balloon.position.y = 4.1 + Math.sin(t * 0.9) * 0.12;
      balloon.rotation.y = Math.sin(t * 0.3) * 0.15;
      lamp.material.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.4;
    },
  };
}
