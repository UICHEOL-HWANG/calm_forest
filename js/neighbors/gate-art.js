// =============================================================
//  🎈 이웃 마을 입구 — 땅에 매인 작은 열기구(높이 ~5.5m) + 풍선 허리 띠 "이웃 마을"
//  ------------------------------------------------------------
//  2026-10-11 팻말(1.5m)이 안 보여 4일 방문 1/118 → 시안 A 우체통 · B 열기구 · C 꽃 아치 중 B 확정(사용자).
//  ⚠️ 카메라는 늘 북쪽을 보고 주변 ~8m 만 비춘다 — 랜드마크는 "가까이 왔을 때 눈에 띄는" 역할,
//     찾아오게 하는 건 하루 한 번 배너(js/spaces/neighbor.js dailyBanner).
//  저폴리 원칙(memory visitor-art-lessons): 줄무늬는 쐐기 8조각의 색으로(부속을 꽂지 않는다).
//  (THREE, label: 번역된 글씨) → { group, update(dt, t) } — 원점이 입구 자리, +z 가 길 쪽
// =============================================================

const mat = (THREE, color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
const glow = (THREE, color, k = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, flatShading: true });
function add(g, mesh, x, y, z, shadow = true) { mesh.position.set(x, y, z); if (shadow) mesh.castShadow = true; g.add(mesh); return mesh; }

// 글씨 텍스처 — 이모지 없이 한글만(js/spaces/mist.js gateLabel 과 같은 규칙) · 판 폭에 맞춰 폰트 축소
//   bg 가 있으면 판을 칠하고, copies>1 이면 가로로 같은 글씨를 여러 번(풍선 띠 둘레용)
function textTexture(THREE, label, w, h, { bg = null, fg = '#fffaf0', stroke = null, copies = 1, trim = null } = {}) {
  const PX = 256, cv = document.createElement('canvas'); cv.width = Math.min(4096, Math.round(PX * w / h)); cv.height = PX;
  const c = cv.getContext('2d');
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, cv.width, PX); }
  if (trim) { c.fillStyle = trim; c.fillRect(0, 0, cv.width, PX * 0.1); c.fillRect(0, PX * 0.9, cv.width, PX * 0.1); }
  const cell = cv.width / copies;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  let fs = Math.round(PX * 0.56);
  const font = (s2) => `bold ${s2}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
  c.font = font(fs); while (fs > 40 && c.measureText(label).width > cell * 0.86) { fs -= 6; c.font = font(fs); }
  for (let k = 0; k < copies; k++) {
    const x = cell * (k + 0.5);
    if (stroke) { c.lineWidth = fs * 0.14; c.strokeStyle = stroke; c.strokeText(label, x, PX / 2 + 4); }
    c.fillStyle = fg; c.fillText(label, x, PX / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.anisotropy = 4;
  return tex;
}

export const BALLOON_STRIPES = [0xf5a35c, 0xfff1d0, 0x7cc4a0, 0xfff1d0, 0xf07f7f, 0xfff1d0, 0x8fb8e8, 0xfff1d0];

export function buildNeighborBalloon(THREE, label) {
  const g = new THREE.Group();
  const balloon = new THREE.Group();
  const rope = mat(THREE, 0x6b5240);
  for (let i = 0; i < BALLOON_STRIPES.length; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(1.25, 4, 10, (i / BALLOON_STRIPES.length) * Math.PI * 2, (Math.PI * 2) / BALLOON_STRIPES.length), mat(THREE, BALLOON_STRIPES[i]));
    seg.castShadow = true; balloon.add(seg);
  }
  balloon.scale.set(1, 1.18, 1);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 0.5, 8, 1, true), mat(THREE, 0xf5a35c, { side: THREE.DoubleSide }));
  neck.position.y = -1.42; balloon.add(neck);
  balloon.position.y = 4.1; g.add(balloon);

  for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {   // 바구니 ↔ 풍선 줄
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 4), rope);
    r.position.set(x * 0.8, 2.25, z * 0.8); g.add(r);
  }
  add(g, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.0), mat(THREE, 0xb07a4a)), 0, 1.0, 0);          // 바구니
  add(g, new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 1.08), mat(THREE, 0x8a5a34)), 0, 1.38, 0, false); // 테두리

  // 🏡 풍선 허리에 두른 크림 천 띠에 "이웃 마을"(2026-10-11 시안 A 확정 — 떠 있는 글씨는 '달린 게 없어' 기각)
  //    글씨 칸 중심 u=0.25 가 +z(마을 쪽)에 오도록 thetaStart=-π/2, 글씨는 앞·뒤 두 번
  const tex = textTexture(THREE, label, 8, 0.5, { bg: '#fff3d6', fg: '#7a4a26', copies: 2, trim: '#e07a5f' });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.255, 1.255, 0.42, 32, 1, true, -Math.PI / 2, Math.PI * 2), mat(THREE, 0xffffff, { map: tex, side: THREE.DoubleSide, flatShading: false }));
  band.position.y = -0.18; balloon.add(band);

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
