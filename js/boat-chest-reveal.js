// =============================================================
//  🧰 보물상자 개봉 화면(R3) — 결과 카드 전에 한 번. 빛줄기 속 큰 상자가 열리고 보상 모형이 올라온다
//  ------------------------------------------------------------
//  시안: sims/boat-chest-sim.html?mode=result (R3) · ?mode=pickup (② 날아와서 열림) — 2026-09-29 승인.
//  ▶ 달리는 중에는 가벼운 ①(글자+반짝임)만 — 3구간 최고 속도에서 1.3초 시야를 가리면 부딪힌다.
//    열리는 연출은 멈춘 화면인 여기서만 한다.
//  ▶ 작은 WebGLRenderer 하나를 캔버스에 붙여 **재사용**한다(열 때마다 만들면 컨텍스트가 쌓인다).
//    장면의 상자·모형만 매번 새로 만들고 닫을 때 버린다.
//  ▶ 움직임은 경과 시간의 순수 함수 — 시안(필름 스트립)과 같은 타이밍.
// =============================================================
import * as THREE from 'three';
import { woodMat } from './game.js';   // 🔁 함수 안에서만 쓴다(로딩 시점엔 안 읽는다)
import { makeChestMesh, makeChestRays, makeLootMesh, setChestNight } from './boat-chest-art.js';

let renderer = null, scene = null, camera = null, raf = 0, rig = null;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - clamp01(x), 3);

function ensure(canvas) {
  if (renderer && renderer.domElement === canvas) return;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfe8c9, 0.9), new THREE.AmbientLight(0xfff0dd, 0.3));
  const sun = new THREE.DirectionalLight(0xffe9c4, 1.1); sun.position.set(3, 6, 5); scene.add(sun);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.5, 4.3); camera.lookAt(0, 0.75, 0);
}

// woodMat 은 부를 때마다 나뭇결 텍스처를 복제한다 → 재질만 버리면 텍스처가 GPU 에 남는다(열 때마다 2장).
//   물빛(_haloTex)은 강 상자와 공유하는 모듈 텍스처라 남긴다(버려도 다시 올라갈 뿐이지만 굳이).
function disposeTree(o, keep) {
  o.traverse(m => {
    if (!m.isMesh) return;
    m.geometry.dispose();
    for (const x of (Array.isArray(m.material) ? m.material : [m.material])) {
      if (x.map && x.map !== keep) x.map.dispose();
      x.dispose();
    }
  });
}

function clearRig() {
  if (!rig) return;
  scene.remove(rig.root); disposeTree(rig.root, rig.chest.userData.halo.material.map); rig = null;
}

/** 개봉 연출 재생 — stopChestReveal() 전까지 대기 동작(보상 회전·빛줄기)을 이어 간다 */
export function playChestReveal(canvas, { lootId, night = false } = {}) {
  ensure(canvas);
  stopChestReveal();
  const w = canvas.clientWidth || 360, h = canvas.clientHeight || 280;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const root = new THREE.Group(); scene.add(root);
  const rays = makeChestRays(); rays.position.set(0, 0.9, -0.5); root.add(rays);
  const chest = makeChestMesh({ wood: woodMat, buoy: false });
  setChestNight(chest, night);
  const u = chest.userData;
  u.ring.visible = false; u.glint.visible = false; u.halo.visible = false; u.body.position.y = 0;
  const item = makeLootMesh(lootId); u.body.add(item);
  root.add(chest);
  rig = { root, chest, item, rays, t0: performance.now() };
  const frame = (now) => {
    if (!rig) return;
    const t = (now - rig.t0) / 1000;
    // 튀어나옴(0~0.45) → 뚜껑 열림(0.45~0.75) → 보상이 솟음(0.6~0.9) → 대기(보상 회전·빛줄기)
    const kp = ease(t / 0.45);
    chest.scale.setScalar(1.25 * (0.3 + 0.7 * kp) * (1 + 0.08 * Math.sin(Math.PI * clamp01(t / 0.45))));
    chest.rotation.set(0.35 * kp, -0.35, 0);
    u.lid.rotation.x = -1.9 * ease((t - 0.45) / 0.3);
    const ki = ease((t - 0.6) / 0.3);
    item.visible = t > 0.6;
    item.position.set(0, u.H - 0.25 + 0.4 * ki, 0.05);
    item.scale.setScalar(1.05 * (0.4 + 0.6 * ki));   // 1.25 는 비료 자루가 뚜껑을 덮었다(실측)
    item.rotation.y = t * 1.6;
    const kr = clamp01((t - 0.45) / 0.4);
    rays.visible = kr > 0; rays.rotation.z = t * 0.5; rays.scale.setScalar(0.6 + 1.0 * ease(kr));
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

export function stopChestReveal() {
  cancelAnimationFrame(raf); raf = 0;
  if (scene) clearRig();
}
