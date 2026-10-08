// 🪞 거울 마을 시안 공용 helper — 3안(색 반전 숲) 팔레트·조명·저폴리 조형
import * as THREE from 'three';
export { THREE };
export const P3 = { ground: 0x50629a, pond: 0xf0e8ff, pondGlow: 0xc89eff, stone: 0xb8b0d0, wood: 0xc8c0e0, roofA: 0x7ad6c0,
  lampGlow: 0x9ef6d0, leaf: [0xdfe6f2, 0xc8d6ea, 0xeef2ff], trunk: 0x8a86a8, bush: [0x5a6aa0, 0x6a5aa8] };
export function setup() {
  const W = innerWidth, H = innerHeight, portrait = H > W;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(portrait ? 55 : 40, W / H, 0.1, 300);
  scene.background = sky('#120f2e', '#3a2f68');
  scene.fog = new THREE.Fog(0x2e2858, 18, 60);
  scene.add(new THREE.HemisphereLight(0xe0d4ff, 0x3a3270, 1.35));
  const d = new THREE.DirectionalLight(0xe8dcff, 1.0); d.position.set(8, 16, 10); d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048); const sc = d.shadow.camera; sc.left = sc.bottom = -15; sc.right = sc.top = 15; scene.add(d);
  return { renderer, scene, camera, portrait };
}
export function sky(top, bottom) {
  const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256;
  const g = cv.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...o });
export const glow = (color, k = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, flatShading: true, roughness: 0.4 });
export function mesh(parent, geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
let haloTex;
export function halo(parent, color, size, x, y, z, op = 0.8) {
  if (!haloTex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); haloTex = new THREE.CanvasTexture(cv);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); return s;
}
export function ground(scene, r = 14) {
  const g = mesh(scene, new THREE.CircleGeometry(r, 48), mat(P3.ground, { roughness: 0.7 })); g.rotation.x = -Math.PI / 2;
  return g;
}
export function tree(scene, x, z, s = 1, i = 0) {
  mesh(scene, new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.4 * s, 6), mat(P3.trunk), x, 0.7 * s, z);
  mesh(scene, new THREE.IcosahedronGeometry(1.0 * s, 0), mat(P3.leaf[i % 3]), x, 1.9 * s, z);
  mesh(scene, new THREE.IcosahedronGeometry(0.7 * s, 0), mat(P3.leaf[(i + 1) % 3]), x + 0.4 * s, 2.5 * s, z + 0.1 * s);
}
export function bush(scene, x, z, s = 1, i = 0) { mesh(scene, new THREE.IcosahedronGeometry(0.55 * s, 0), mat(P3.bush[i % 2]), x, 0.35 * s, z).scale.set(1.3, 0.8, 1.1); }
export function rock(scene, x, z, s = 1) { mesh(scene, new THREE.DodecahedronGeometry(0.42 * s, 0), mat(P3.stone), x, 0.2 * s, z); }
// HTML 라벨(이름표·말풍선) — 매 프레임 투영
export function labeler(camera) {
  const box = document.createElement('div'); document.body.appendChild(box);
  const list = [];
  return {
    add: (txt, x, y, z, cls = 'tag') => list.push({ txt, p: new THREE.Vector3(x, y, z), cls }),
    draw() {
      box.innerHTML = list.map(l => { const v = l.p.clone().project(camera); if (v.z > 1) return '';
        const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
        return `<div class="${l.cls}" style="left:${x}px;top:${y}px">${l.txt}</div>`; }).join('');
    },
  };
}
export function loop(renderer, scene, camera, anims, lab) {
  const clock = new THREE.Clock();
  (function f() { const t = 1.3 + clock.getElapsedTime(); anims.forEach(a => a(t)); renderer.render(scene, camera); lab?.draw(); requestAnimationFrame(f); })();
}
