// js/shop/purchase-reveal.js
// =============================================================
//  calm forest · 💎 획득 연출 A(스포트라이트) — 현금 구매 직후 "짠"
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §4 · 시안 sims/premium-reveal-sim.html (A)
//  ▶ 보물상자 연출(js/boat-chest-reveal.js)과 같은 틀: 작은 WebGLRenderer 하나를 재사용, 움직임은 시간의 순수 함수(reveal-pose.js).
//  ▶ 진열물 = 받침 위 실제 자국 3개 + 같은 입자(밤 값) — 산 것 그대로를 보여 준다.
//  ▶ 2단계: mode 'boxburst'(B+C) 를 여기에 더한다.
// =============================================================
import * as THREE from 'three';
import { buildTrailMark, tintTrailMark } from '../cosmetics/trail.js';
import { createTrailFx } from '../cosmetics/trail-fx.js';
import { revealPose, REVEAL_COPY } from './reveal-pose.js';

let renderer = null, scene = null, camera = null, raf = 0, rig = null;

function ensure(canvas) {
  if (renderer && renderer.domElement === canvas) return;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(2, 4, 3); scene.add(sun);
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 1.1, 1.9); camera.lookAt(0, 0.15, 0);
}

function raysMesh() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.translate(128, 128);
  for (let i = 0; i < 14; i++) {
    g.rotate(Math.PI * 2 / 14);
    const gr = g.createLinearGradient(0, 0, 0, -128);
    gr.addColorStop(0, 'rgba(255,230,160,.5)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(-11, -128); g.lineTo(11, -128); g.closePath(); g.fill();
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(0, 0.35, -0.6);
  return m;
}

const SPOTS = [[-0.08, 0.16], [0.08, 0], [-0.08, -0.16]];

function showcase(itemId, animalId) {
  const root = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x3e5a46, roughness: 0.8 }));
  plinth.position.y = -0.03; root.add(plinth);
  const fx = createTrailFx(THREE, { cap: 24 });
  root.add(fx.points);
  SPOTS.forEach(([x, z], i) => {
    const m = buildTrailMark(THREE, itemId, 1, animalId);
    m.scale.setScalar(1.6); m.position.set(x, 0.005, z); m.rotation.y = i % 2 ? 0.2 : -0.2;
    const { tint } = fx.onStamp(itemId, m.position, { nightLevel: 1 });
    if (tint != null) tintTrailMark(m, tint);
    root.add(m);
  });
  return { root, fx };
}

function disposeTree(o) {
  o.traverse(m => {
    if (!m.isMesh && !m.isPoints) return;
    m.geometry.dispose();
    if (m.material.map) m.material.map.dispose();
    m.material.dispose();
  });
}

export function stopPurchaseReveal() {
  cancelAnimationFrame(raf); raf = 0;
  if (rig) { scene.remove(rig.root, rig.rays); disposeTree(rig.root); disposeTree(rig.rays); rig = null; }
  const wrap = document.getElementById('buy-reveal');
  wrap?.classList.remove('show', 'card');
  wrap?.style.setProperty('--br-dim', '0');   // 다시 틀 때 이전 어둠이 한 프레임 비치지 않게
}

/** onWalk: [바로 걸어보기] · onClose: [닫기] — 연출을 닫은 뒤 부른다. 인자 = 열려 있던 ms */
export function playPurchaseReveal({ itemId, animalId = null, onWalk = () => {}, onClose = () => {} }) {
  const wrap = document.getElementById('buy-reveal');
  const canvas = document.getElementById('br-canvas');
  if (!wrap || !canvas) return;
  stopPurchaseReveal();
  ensure(canvas);
  const copy = REVEAL_COPY[itemId] || { name: itemId, desc: '' };
  document.getElementById('br-name').textContent = copy.name;
  document.getElementById('br-desc').textContent = copy.desc;
  wrap.classList.add('show');
  const w = canvas.clientWidth || 360, h = canvas.clientHeight || 280;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const { root, fx } = showcase(itemId, animalId);
  const rays = raysMesh();   // 진열물(root)과 따로 — root 에 달면 회전·커짐을 따라 빛줄기 중심이 진열물 뒤를 맴돈다
  scene.add(root, rays);
  const t0 = performance.now();
  rig = { root, rays, lastPuff: 0 };
  let last = t0;
  const frame = (now) => {
    if (!rig) return;
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = revealPose(t);
    wrap.style.setProperty('--br-dim', String(p.dim));
    root.scale.setScalar(Math.max(0.001, p.scale));
    root.rotation.y = t * 0.6;
    rays.material.opacity = p.rays * 0.9; rays.rotation.z = t * 0.15;   // 빛줄기는 늘 카메라 쪽(+z)을 본 채 제자리에서 돈다
    if (t - rig.lastPuff > 0.8) {                     // 진열물에선 입자가 계속 피어오르게 — 무지개 색은 처음 칠한 그대로
      rig.lastPuff = t;
      const [x, z] = SPOTS[Math.floor(t) % SPOTS.length];
      fx.onStamp(itemId, { x, y: 0, z }, { nightLevel: 1 });
    }
    fx.update(dt, { nightLevel: 1 });
    if (p.card) wrap.classList.add('card');
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const done = (cb) => () => { const ms = Math.round(performance.now() - t0); stopPurchaseReveal(); cb(ms); };
  document.getElementById('br-walk').onclick = done(onWalk);
  document.getElementById('br-close').onclick = done(onClose);
}
