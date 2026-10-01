// =============================================================
//  calm forest · 🌸🍂 계절 흩날림 — 봄 꽃잎 · 가을 낙엽
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-seasons-design.md · 표(색·속도·크기)는 js/season.js SEASON_DRIFT
//  ▶ THREE 를 인자로 받는다(js/cosmetics/trail.js 와 같은 문법) — 테스트가 vendor three 를 넘긴다.
//  ▶ ⚡ 드로우콜: 조각 전부가 InstancedMesh **하나**(+1). 그림자를 드리우지 않는다(그림자 패스 +0).
//    색은 인스턴스 색(setColorAt)이라 색이 셋이어도 재질은 하나다.
//  ▶ 빗줄기처럼 플레이어 주변 상자 안에서 돌고, 바닥에 닿으면 위로 다시 올린다(할당 없음).
// =============================================================
import { SEASON_DRIFT } from './season.js';

export const DRIFT_BOX = 30;     // 플레이어 주변 이 폭 안에서만 흩날린다(m)
export const DRIFT_TOP = 8;      // 다시 올리는 높이(m)

/**
 * @returns {{ mesh: THREE.InstancedMesh, update(dt:number, t:number, px:number, pz:number, show:boolean):void } | null}
 *   흩날림이 없는 계절(여름·겨울)은 null
 */
export function createSeasonDrift(THREE, seasonId, { count = 60, rnd = Math.random } = {}) {
  const cfg = SEASON_DRIFT[seasonId];
  if (!cfg || count <= 0) return null;
  const geo = new THREE.PlaneGeometry(cfg.size[0], cfg.size[1]);
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;      // 인스턴스가 플레이어를 따라다녀 경계 상자가 맞지 않는다
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.visible = false;

  // 조각마다 [x, y, z, 낙하 속도, 위상] — 회전은 시간·위상으로 계산(따로 저장하지 않는다)
  const st = new Float32Array(count * 5);
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const o = i * 5;
    st[o] = (rnd() - 0.5) * DRIFT_BOX; st[o + 1] = rnd() * DRIFT_TOP; st[o + 2] = (rnd() - 0.5) * DRIFT_BOX;
    st[o + 3] = cfg.fall[0] + rnd() * (cfg.fall[1] - cfg.fall[0]);
    st[o + 4] = rnd() * Math.PI * 2;
    mesh.setColorAt(i, col.setHex(cfg.colors[i % cfg.colors.length]));
  }
  mesh.instanceColor.needsUpdate = true;

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  let placed = false;   // 첫 표시 때 플레이어 주변으로 옮긴다(부팅 땐 원점 주변에 깔려 있다)

  function update(dt, t, px, pz, show) {
    mesh.visible = show;
    if (!show) return;
    const half = DRIFT_BOX / 2;
    for (let i = 0; i < count; i++) {
      const o = i * 5, ph = st[o + 4];
      if (!placed) { st[o] += px; st[o + 2] += pz; }
      st[o + 1] -= st[o + 3] * dt;
      st[o] += Math.sin(t * 0.9 + ph) * 0.6 * dt;          // 좌우로 하늘하늘
      st[o + 2] += Math.cos(t * 0.7 + ph * 1.3) * 0.4 * dt;
      // 바닥에 닿았거나 플레이어에게서 멀어지면 주변 상공에서 다시
      if (st[o + 1] < 0 || Math.abs(st[o] - px) > half || Math.abs(st[o + 2] - pz) > half) {
        st[o] = px + (rnd() - 0.5) * DRIFT_BOX; st[o + 2] = pz + (rnd() - 0.5) * DRIFT_BOX;
        st[o + 1] = st[o + 1] < 0 ? DRIFT_TOP : st[o + 1];
      }
      e.set(t * 1.7 + ph, t * 1.1 + ph * 2, Math.sin(t * 2 + ph) * 0.8);
      m4.compose(v.set(st[o], st[o + 1], st[o + 2]), q.setFromEuler(e), one);
      mesh.setMatrixAt(i, m4);
    }
    placed = true;
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
