// js/shop/purchase-reveal.js
// =============================================================
//  calm forest · 💎 획득 연출 A(스포트라이트) — 현금 구매 직후 "짠"
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §4 · 시안 sims/premium-reveal-sim.html (A)
//  ▶ 보물상자 연출(js/boat-chest-reveal.js)과 같은 틀: 작은 WebGLRenderer 하나를 재사용, 움직임은 시간의 순수 함수(reveal-pose.js).
//  ▶ 진열물 = 받침 위 실제 자국 3개 + 같은 입자(밤 값) — 산 것 그대로를 보여 준다.
//  ▶ mode 'boxburst'(B+C 상자 폭발, 전신 스킨) 도 여기서 — startBox.
// =============================================================
import * as THREE from 'three';
import { buildTrailMark, tintTrailMark } from '../cosmetics/trail.js';
import { createTrailFx } from '../cosmetics/trail-fx.js';
import { revealPose, boxburstPose, REVEAL_COPY, REVEAL_CARD } from './reveal-pose.js';

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

//  🎁 B+C 무대 — 상자(몸·리본·뚜껑) + 충격파 링 + 무지개 버스트(Points 1개). 시안 sims/premium-reveal-sim.html mode D
function boxStage() {
  const box = new THREE.Group();
  const boxMat = new THREE.MeshLambertMaterial({ color: 0xc8553d, flatShading: true });
  const ribMat = new THREE.MeshLambertMaterial({ color: 0xf2c14e });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.3), boxMat); body.position.y = -0.9;
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.02, 1.32), ribMat); rib.position.y = -0.9;
  const lid = new THREE.Group();
  lid.add(new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.3, 1.45), boxMat), new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 1.47), ribMat));
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 6, 12), ribMat); bow.position.y = 0.25; lid.add(bow);
  box.add(body, rib, lid);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  ring.visible = false;
  const N = 70, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) {
    const c = new THREE.Color().setHSL(i / N, 0.9, 0.68); col.set([c.r, c.g, c.b], i * 3);
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
    vel.push(new THREE.Vector3(Math.cos(a) * sp, Math.sin(a) * sp + 1, (Math.random() - 0.5) * 2));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const burst = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  burst.visible = false; burst.frustumCulled = false;
  return { box, lid, ring, burst, vel, pos };
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
  if (rig) {
    scene.remove(rig.root, rig.rays, ...(rig.extra || []));
    if (!rig.extra) disposeTree(rig.root);          // A 진열물(자국)은 연출 전용이라 버린다 · B+C 의 캐릭터는 월드와 재질 공유라 떼기만
    disposeTree(rig.rays); (rig.extra || []).forEach(disposeTree);
    rig = null;
  }
  camera?.position.set(0, 1.1, 1.9); camera?.lookAt(0, 0.15, 0);   // 다음 A 연출이 상자 카메라를 물려받지 않게
  const fl = document.querySelector('#buy-reveal .br-flash'); if (fl) fl.style.opacity = '0';
  const wrap = document.getElementById('buy-reveal');
  wrap?.classList.remove('show', 'card');
  wrap?.style.setProperty('--br-dim', '0');   // 다시 틀 때 이전 어둠이 한 프레임 비치지 않게
}

/** mode: 'spot'(A 스포트라이트, 자국) | 'boxburst'(B+C 상자 폭발, 스킨) · buildShowcase: boxburst 진열 캐릭터 팩토리
 *  onWalk: [바로 걸어보기/입어보기] · onClose: [닫기] — 연출을 닫은 뒤 부른다. 인자 = 열려 있던 ms */
export function playPurchaseReveal({ itemId, animalId = null, mode = 'spot', buildShowcase = null, onWalk = () => {}, onClose = () => {} }) {
  const wrap = document.getElementById('buy-reveal');
  const canvas = document.getElementById('br-canvas');
  if (!wrap || !canvas) return;
  stopPurchaseReveal();
  ensure(canvas);
  const copy = REVEAL_COPY[itemId] || { name: itemId, desc: '' };
  const card = REVEAL_CARD[mode] || REVEAL_CARD.spot;
  document.getElementById('br-name').textContent = copy.name;
  document.getElementById('br-desc').textContent = copy.desc;
  document.getElementById('br-tag').textContent = card.tag;
  document.getElementById('br-walk').textContent = card.cta;
  wrap.classList.add('show');
  try {
    if (mode === 'boxburst') startBox(wrap, canvas, onWalk, onClose, buildShowcase);
    else start(wrap, canvas, itemId, animalId, onWalk, onClose);
  } catch (e) { stopPurchaseReveal(); throw e; }   // 중간에 터지면 투명한 전면 오버레이가 클릭을 다 먹는다
}

function start(wrap, canvas, itemId, animalId, onWalk, onClose) {
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
      const i = Math.floor(t) % SPOTS.length, [x, z] = SPOTS[i];
      fx.onStamp(itemId, { x, y: 0, z }, { nightLevel: 1, step: i });   // 무지개 반짝이는 그 자리 자국 색(showcase 가 0,1,2 로 칠했다)
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

function startBox(wrap, canvas, onWalk, onClose, buildShowcase) {
  const w = canvas.clientWidth || 360, h = canvas.clientHeight || 280;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.position.set(0, 0.4, 6); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();   // 상자 무대는 시안 카메라
  const st = boxStage();
  const root = new THREE.Group();
  const hero = buildShowcase ? buildShowcase() : new THREE.Group();   // 🧥 스킨 입은 내 캐릭터(cafe.js 가 만든다)
  hero.scale.setScalar(0.001); root.add(hero);
  const rays = raysMesh(); rays.position.set(0, 0.3, -1); rays.scale.setScalar(2.1);
  scene.add(root, rays, st.box, st.ring, st.burst);
  rig = { root, rays, extra: [st.box, st.ring, st.burst] };
  const flash = wrap.querySelector('.br-flash');
  const t0 = performance.now(); let last = t0;
  const frame = (now) => {
    if (!rig) return;
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = boxburstPose(t);
    wrap.style.setProperty('--br-dim', String(p.dim));
    st.box.visible = t < 2.0;                       // 뚜껑이 날아간 뒤 잠깐 남았다가 치운다
    st.box.scale.setScalar(Math.max(0.001, p.box)); st.box.rotation.set(0, -0.4, p.shake);
    st.lid.position.set(p.lid.x, p.lid.y, p.lid.z); st.lid.rotation.z = p.lid.rz;
    if (flash) flash.style.opacity = String(p.flash);
    st.ring.visible = p.ring.on; st.ring.scale.setScalar(p.ring.scale); st.ring.material.opacity = p.ring.opacity;
    if (p.open) {
      st.burst.visible = true;
      st.vel.forEach((v, i) => { v.y -= 2.5 * dt; st.pos[i * 3] += v.x * dt; st.pos[i * 3 + 1] += v.y * dt; st.pos[i * 3 + 2] += v.z * dt; });
      st.burst.geometry.attributes.position.needsUpdate = true;
      st.burst.material.opacity = Math.max(0, 1 - (t - 1.4) / 1.8);
    }
    hero.scale.setScalar(Math.max(0.001, p.rise * 0.95)); hero.position.y = p.riseY; hero.rotation.y = t * 0.8;
    hero.userData.skinTick?.(t);
    rays.material.opacity = p.rays * 0.4; rays.rotation.z = t * 0.15;
    if (p.card) wrap.classList.add('card');
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const done = (cb) => () => { const ms = Math.round(performance.now() - t0); stopPurchaseReveal(); cb(ms); };
  document.getElementById('br-walk').onclick = done(onWalk);
  document.getElementById('br-close').onclick = done(onClose);
}
