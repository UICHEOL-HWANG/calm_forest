// =============================================================
//  🎈 이웃 마을 입구 — 땅에 매인 작은 열기구(높이 ~5.5m)
//  2026-10-25 시안 D 확정: 글씨 띠를 없애고 조각보(퀼트) 풍선 + 집 자수 패치 + 꼭대기 리본.
//  이름 안내는 가까이 갔을 때 프롬프트 줄("🏡 이웃 마을 가는 길")이 맡는다.
//  (THREE) → { group, update(dt, t) } — 원점이 입구 자리, +z 가 길 쪽
// =============================================================

const mat = (THREE, color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
const glow = (THREE, color, k = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, flatShading: true });
function add(g, mesh, x, y, z, shadow = true) { mesh.position.set(x, y, z); if (shadow) mesh.castShadow = true; g.add(mesh); return mesh; }

export const QUILT_COLORS = [0xf6b99a, 0xa9d8c0, 0xfbe3b8, 0xb9cdee, 0xf3c4d6, 0xc8e2a8];
export const HOUSE_PATCH_U = [0.25, 0.75];

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

function quiltTexture(THREE) {
  const W = 1024, H = 512, cols = 12, rows = 6, cw = W / cols, rh = H / rows;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    c.fillStyle = hex(QUILT_COLORS[(x * 7 + y * 3) % QUILT_COLORS.length]);
    c.fillRect(x * cw, y * rh, cw + 1, rh + 1);
  }
  c.setLineDash([10, 8]); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.75)';
  for (let x = 0; x <= cols; x++) { c.beginPath(); c.moveTo(x * cw, 0); c.lineTo(x * cw, H); c.stroke(); }
  for (let y = 0; y <= rows; y++) { c.beginPath(); c.moveTo(0, y * rh); c.lineTo(W, y * rh); c.stroke(); }
  c.setLineDash([]);
  for (const u of HOUSE_PATCH_U) {
    const bx = W * u, by = H * 0.52, s = 86;
    c.fillStyle = '#fff8ec'; c.beginPath(); c.arc(bx, by, 74, 0, Math.PI * 2); c.fill();
    c.lineWidth = 6; c.setLineDash([9, 7]); c.strokeStyle = '#e0705a'; c.beginPath(); c.arc(bx, by, 64, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    const cy = by + 6;
    c.fillStyle = '#f6c86a'; c.fillRect(bx - s * 0.36, cy - s * 0.05, s * 0.72, s * 0.5);
    c.fillStyle = '#e0705a'; c.beginPath(); c.moveTo(bx - s * 0.5, cy); c.lineTo(bx, cy - s * 0.45); c.lineTo(bx + s * 0.5, cy); c.closePath(); c.fill();
    c.fillStyle = '#9a6a3c'; roundRect(c, bx - s * 0.1, cy + s * 0.15, s * 0.2, s * 0.3, s * 0.06); c.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function buildNeighborBalloon(THREE) {
  const g = new THREE.Group();
  const balloon = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 12), new THREE.MeshStandardMaterial({ map: quiltTexture(THREE), roughness: 0.9, flatShading: true }));
  shell.castShadow = true; balloon.add(shell);
  balloon.scale.set(1, 1.15, 1);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.45, 10, 1, true), mat(THREE, 0xe9a07a, { side: THREE.DoubleSide }));
  neck.position.y = -1.38; balloon.add(neck);
  const bowMat = mat(THREE, 0xe0705a);
  const bow = new THREE.Group();
  for (const s of [1, -1]) {
    const loop = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), bowMat);
    loop.rotation.z = s * Math.PI / 2; loop.position.x = s * 0.15; bow.add(loop);
  }
  bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), bowMat));
  bow.position.y = 1.45; balloon.add(bow);
  balloon.position.y = 4.1; g.add(balloon);

  const rope = mat(THREE, 0x6b5240);
  for (const [x, z] of [[-0.34, -0.34], [0.34, -0.34], [-0.34, 0.34], [0.34, 0.34]]) add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 4), rope), x, 2.25, z, false);
  const weave = [mat(THREE, 0xc79a62), mat(THREE, 0xb5844f)];
  for (let i = 0; i < 3; i++) add(g, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.24, 1.0), weave[i % 2]), 0, 0.77 + i * 0.23, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.1), mat(THREE, 0x8a5a34)), 0, 1.4, 0, false);
  const lamp = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), glow(THREE, 0xffd27a, 2)), 0.45, 1.6, 0.45, false);

  return {
    group: g,
    update(dt, t) {
      balloon.position.y = 4.1 + Math.sin(t * 0.9) * 0.12;
      balloon.rotation.y = Math.sin(t * 0.3) * 0.15;
      lamp.material.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.4;
    },
  };
}
