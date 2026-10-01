// js/cosmetics/trail-walk.js
// =============================================================
//  calm forest · ✨ 상점 이펙트 탭 미리보기 — 보이지 않는 발이 걸어온다
//  ------------------------------------------------------------
//  ▶ B안 '앞으로 걸어온다'(2026-09-28). 시안 비교: sims/trail-preview-sim.html
//    캐릭터 발밑에 자국 두 개를 깔아 두면 몸에 가려 뭐가 뭔지 모른다 → 캐릭터를 빼고
//    안쪽에서 화면 쪽(+z)으로 좌우 번갈아 걸어오며 자국을 남기고 흐려진다.
//  ▶ 자국 배치는 **시간만의 순수 함수**(walkMarks)다 — 상태가 없어 탭을 오가도 튀지 않고,
//    THREE 없이 테스트된다(tests/trail-walk.test.mjs).
//  ▶ 걸음 간격·페이드는 게임(TRAIL_STEP 0.6 · 1.2초)보다 촘촘·길게 — 120px 캔버스에
//    자국이 3~5개는 보여야 "걷는다" 로 읽힌다.
// =============================================================

import { buildTrailMark, TRAIL_SIDE } from './trail.js';
import { createTrailFx, rainbowHex, FX_IDS } from './trail-fx.js';

export const WALK_STEP = 0.26;   // 한 걸음
export const WALK_FADE = 1.6;    // 초
export const WALK_SPEED = 0.75;  // 월드/초
export const WALK_LEN = 1.4;     // 한 번에 걷는 거리 — 끝나면 다시 안쪽부터
export const WALK_Z0 = -0.8;     // 출발점(안쪽)
export const TRAIL_DEMO = 'paw';   // 아무것도 안 입어 봤을 때 걷는 자국 — 빈 바닥·캐릭터 대신
export const WALK_CAM ={ elev: 36, dist: 2.2, lookZ: -0.1 };   // 바닥을 비스듬히 내려다본다

const PER_LAP = Math.ceil(WALK_LEN / WALK_STEP);

/** t 초에 보이는 자국들 — {z, side(±1), age(초), n(안정 id)} */
export function walkMarks(t) {
  const out = [];
  const lapT = WALK_LEN / WALK_SPEED;
  const first = Math.max(0, Math.floor((t - WALK_FADE) / lapT));
  const last = Math.floor(t / lapT);
  for (let lap = first; lap <= last; lap++) {
    for (let k = 0; k < PER_LAP; k++) {
      const age = t - (lap * lapT + k * WALK_STEP / WALK_SPEED);
      if (age < 0 || age >= WALK_FADE) continue;
      out.push({ z: WALK_Z0 + k * WALK_STEP, side: k % 2 ? 1 : -1, age, n: lap * PER_LAP + k });
    }
  }
  return out;
}

/**
 * 자국 메시를 들고 걷는 그룹. update(dt) 로 흘린다.
 * ⚠️ buildTrailMark 는 자국마다 지오메트리·재질을 새로 굽는다(공유 아님) → dispose 해도 안전하다.
 */
export function makeTrailWalk(THREE, itemId, animalId) {
  const group = new THREE.Group();
  const meshes = [];
  const isFx = FX_IDS.includes(itemId);
  let ground = null;
  if (isFx) {   // 💎 밝은 패널 위에선 가산 글로우가 안 보인다 → 밤 바닥 원판 + 일반 혼합
    ground = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ color: 0x1f2a3a }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.002, WALK_Z0 + WALK_LEN / 2);
    group.add(ground);
  }
  const fx = createTrailFx(THREE, isFx ? { cap: 32, blending: 'normal' } : { cap: 32 });   // 미리보기는 늘 밤 값
  group.add(fx.points);
  const seen = new Set();                              // 이미 입자를 뿌린 자국 id(n)
  let t = WALK_FADE;                                   // 열자마자 자국이 몇 개 깔려 있게
  function update(dt) {
    t += dt;
    const marks = walkMarks(t);
    while (meshes.length < marks.length) {
      const m = buildTrailMark(THREE, itemId, 1, animalId);
      meshes.push(m); group.add(m);
    }
    meshes.forEach((m, i) => {
      const k = marks[i];
      m.visible = !!k;
      if (!k) return;
      m.position.set(k.side * TRAIL_SIDE, 0.01, k.z);
      if (!seen.has(k.n)) { seen.add(k.n); fx.onStamp(itemId, m.position, { nightLevel: 1 }); }   // 처음 나타날 때만
      if (itemId === 'rainbow') {                       // 색은 자국 id 에서 — 메시가 밀려도 색이 기어다니지 않는다
        const hex = rainbowHex(k.n);
        m.traverse(o => { if (o.isMesh) o.material.color.setHex(hex); });
      }
      const a = 1 - k.age / WALK_FADE;
      m.traverse(o => { if (o.material) o.material.opacity = a; });
    });
    const live = new Set(marks.map(x => x.n));
    for (const n of seen) if (!live.has(n)) seen.delete(n);
    fx.update(dt, { nightLevel: 1 });
  }
  function dispose() {
    for (const m of meshes) m.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    if (ground) { ground.geometry.dispose(); ground.material.dispose(); }
    fx.points.geometry.dispose(); fx.points.material.map.dispose(); fx.points.material.dispose();
  }
  update(0);
  return { group, update, dispose };
}
