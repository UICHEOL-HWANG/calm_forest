// =============================================================
//  🌙 꿈길 컷신 — 잠들기(암전) → 초승달 마차 비행 → 달맞이 섬 착지
//  ------------------------------------------------------------
//  스펙 §6 · 문법은 프롤로그(js/spaces/prologue.js)를 따른다: dt 누적 시계 + 시간 키 + smoothstep.
//  게임 상태를 직접 만지지 않는다 — 호출부(js/spaces/dream.js)가 넘긴 콜백·객체만 움직인다.
//    hooks = { fade(a), caption(text|null), teleport(), land({skipped,atS,short}), camera, player, playerAnchor, carriage }
//  ⚠️ carriage 는 DREAM 그룹의 자식(로컬 좌표) — 그룹이 DREAM 위치에 놓여 있어야 player 월드 좌표가 맞는다.
// =============================================================
import * as THREE from 'three';

export const SLEEP_S = 1.4;          // 보랏빛 암전이 덮여 있는 시간
export const FLY_FIRST_S = 3.1;      // 첫 회 비행(합계 4.5s)
export const FLY_SHORT_S = 0.4;      // 두 번째부터(합계 1.8s) — 경로 끝 15%만 탄다
const SHORT_FROM = 0.85;

// 비행 경로(DREAM 로컬) — 남서쪽 구름 위에서 내려와 달맞이 섬 남쪽 가장자리(정박 자리)에 앉는다
export const PARK = Object.freeze({ x: -0.6, z: 6.0, heading: Math.PI / 2 });   // 정박 — 머리(+z 로컬)가 +x 를 본다
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-34, 9, 26), new THREE.Vector3(-22, 5.5, 22), new THREE.Vector3(-11, 2.4, 13),
  new THREE.Vector3(-4.5, 0.6, 7.2), new THREE.Vector3(PARK.x, 0, PARK.z),
]);

const smooth = (p) => { const c = Math.min(1, Math.max(0, p)); return c * c * (3 - 2 * c); };
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _p = new THREE.Vector3(), _tan = new THREE.Vector3(), _w = new THREE.Vector3(), _look = new THREE.Vector3();

/** 경로 위 u(0..1)에 마차를 놓는다 — 진행 방향을 보게(마차의 +z 가 앞), 끝 15% 에선 정박 방향으로 돈다 */
export function placeCarriage(carriage, u) {
  PATH.getPointAt(u, _p); PATH.getTangentAt(Math.min(u, 0.999), _tan);
  carriage.position.copy(_p);
  const travel = Math.atan2(_tan.x, _tan.z), k = smooth((u - 0.85) / 0.15);
  carriage.rotation.y = travel + wrapAngle(PARK.heading - travel) * k;
  carriage.rotation.z = Math.sin(u * Math.PI) * 0.06;   // 살짝 기울며 난다(착지하면 0)
}

/** 컷신 하나. 만들고 매 프레임 update(dt), 탭/키로 skip() */
export function startDreamCut({ first, hooks }) {
  const fly = first ? FLY_FIRST_S : FLY_SHORT_S, from = first ? 0 : SHORT_FROM;
  const st = { t: 0, first, done: false, teleported: false };
  hooks.fade(1);
  hooks.caption('스르르… 꿈속으로');

  function seat(u) {
    placeCarriage(hooks.carriage, u);
    hooks.carriage.updateMatrixWorld(true);
    _w.set(0, hooks.carriage.userData.seatY, -0.1).applyMatrix4(hooks.carriage.matrixWorld);
    hooks.player.position.copy(_w);
    hooks.player.rotation.y = hooks.carriage.rotation.y;
  }
  function teleport() {
    st.teleported = true; hooks.teleport();
    hooks.playerAnchor.position.y = -0.3;   // 앉기 포즈(프롤로그와 같은 값)
  }
  function finish(skipped) {
    if (st.done) return;
    if (!st.teleported) teleport();
    placeCarriage(hooks.carriage, 1);
    st.done = true;
    hooks.caption(null);
    hooks.fade(0);
    hooks.land({ skipped, atS: Math.round(st.t * 10) / 10, short: !first });
  }

  st.update = (dt) => {
    if (st.done) return;
    st.t += dt;
    if (st.t >= SLEEP_S && !st.teleported) { teleport(); seat(from); hooks.fade(0); hooks.caption(null); }
    if (!st.teleported) return;
    const p = Math.min(1, (st.t - SLEEP_S) / fly), u = from + (1 - from) * smooth(p);
    seat(u);
    // 카메라 — 끝까지 마차 **왼쪽 옆**에서 잡는다(옆에서 봐야 초승달로 읽힌다 · 착지 땐 정박 방향이 +x 라 왼쪽 = 남쪽 → 섬이 마차 뒤로 보인다).
    //   ⚠️ 끝에 뒤쪽으로 돌던 1차안은 달을 끝에서 봐 막대처럼 보였다(실측 2026-10-08). 끝으로 갈수록 물러나며 올라간다. 세로 화면은 더 멀리
    const K = Math.max(1, Math.min(2.0, 0.85 / hooks.camera.aspect));
    const yaw = hooks.carriage.rotation.y, back = smooth((p - 0.5) / 0.5);
    const dist = 7.5 + 4.5 * back, ox = -Math.cos(yaw) * dist, oz = Math.sin(yaw) * dist;
    _look.copy(hooks.player.position); _look.y += 1.0;
    hooks.camera.position.set(_look.x + ox * K, _look.y + (2.2 + 3.0 * back) * K, _look.z + oz * K);
    hooks.camera.lookAt(_look);
    if (p >= 1) finish(false);
  };
  st.skip = () => finish(true);
  return st;
}
