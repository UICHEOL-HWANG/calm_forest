// =============================================================
//  🪞 거울 마을 탑승 연출 — 걷기 → 올라앉기 → 이륙(🪞 거울 문이 일어섬) → 거울 문 통과(번쩍 = 공간 전환) → 내려앉기 → 하차
//  ------------------------------------------------------------
//  스펙 §2 · 확정 시안 mockups/compare-cut1.png(공통) · compare-cut3.png ③-B(거울 문)
//  게임 상태를 직접 만지지 않는다 — 호출부(js/spaces/mirror.js)가 넘긴 객체·콜백만 움직인다. 시간표는 ride-schedule.js(순수).
//  ⚠️ 1차 js/dream/cutscene.js 는 건드리지 않는다(라이브 꿈길 회귀 0) — 카메라 문법(옆에서 잡기·세로 화면 K)만 같다.
// =============================================================
import * as THREE from 'three';
import { rideSchedule, phaseAt } from './ride-schedule.js';
import { boardPath } from './layout.js';

const CEILING_LIFT = 4;   // 내려앉기 시작 때 시선을 드는 높이(m) — 천장(art.js MIRROR_CEILING)이 화면 위쪽에 들어온다
const smooth = (p) => { const c = Math.min(1, Math.max(0, p)); return c * c * (3 - 2 * c); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _a = new THREE.Vector3(), _t = new THREE.Vector3(), _look = new THREE.Vector3(), _w = new THREE.Vector3();

function curveFrom(f) {   // 정박 → 문 쪽으로 오르며 → 문 3 앞(문 높이) → 문 중심
  const dx = f.gate.x - f.park.x, dz = f.gate.z - f.park.z, len = Math.hypot(dx, dz) || 1;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(f.park.x, 0, f.park.z),
    new THREE.Vector3(f.park.x + dx * 0.35, f.gate.y * 0.55, f.park.z + dz * 0.35),
    new THREE.Vector3(f.gate.x - dx / len * 3, f.gate.y, f.gate.z - dz / len * 3),
    new THREE.Vector3(f.gate.x, f.gate.y, f.gate.z),
  ]);
}
function curveTo(t) {     // 문 중심 → 내려오며 → 정박
  const dx = t.park.x - t.gate.x, dz = t.park.z - t.gate.z;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(t.gate.x, t.gate.y, t.gate.z),
    new THREE.Vector3(t.gate.x + dx * 0.4, t.gate.y * 0.9, t.gate.z + dz * 0.4),
    new THREE.Vector3(t.gate.x + dx * 0.8, 1.2, t.gate.z + dz * 0.8),
    new THREE.Vector3(t.park.x, 0, t.park.z),
  ]);
}

export function startRide({ dir, first, route, hooks }) {
  const start = hooks.player.position.clone();
  // 지금 자리 → 승차 지점 — 정류장 지붕 뒤·마차 옆에서 타면 벽을 뚫지 않게 모서리로 돌아간다(route.from.avoid)
  const path = boardPath(start, route.from.board, route.from.avoid), segs = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.z - path[i].z));
  const pathLen = segs.reduce((a, b) => a + b, 0);
  const S = rideSchedule(first, pathLen), A = curveFrom(route.from), B = curveTo(route.to);
  const st = { t: 0, done: false, teleported: false, dir };
  const alongPath = (u) => {   // 0..1 → 길 위의 자리·진행 방향
    let d = u * pathLen;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) { const a = path[i], b = path[i + 1], k = segs[i] ? Math.min(1, d / segs[i]) : 1; return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dx: b.x - a.x, dz: b.z - a.z }; }
      d -= segs[i];
    }
    return { x: path.at(-1).x, z: path.at(-1).z, dx: 0, dz: 0 };
  };
  const { carriage: car, player, playerAnchor, camera } = hooks;
  const seatW = () => { car.updateMatrixWorld(true); return _w.set(0, car.userData.seatY, -0.1).applyMatrix4(car.matrixWorld); };   // 공유 벡터 — 오래 들고 있을 곳은 호출부가 복사
  const onCurve = (curve, u, endHeading) => {
    curve.getPointAt(u, _a); curve.getTangentAt(Math.min(u, 0.999), _t);
    car.position.copy(_a);
    const travel = Math.atan2(_t.x, _t.z), k = endHeading == null ? 0 : smooth((u - 0.8) / 0.2);
    car.rotation.y = travel + wrap((endHeading ?? travel) - travel) * k;
    car.rotation.x = -Math.sin(u * Math.PI) * 0.12;
  };
  const sitOn = () => { player.position.copy(seatW()); player.rotation.y = car.rotation.y; playerAnchor.position.y = -0.3; };   // 앉기 포즈(프롤로그·꿈길과 같은 값)
  function cam(back, lift = 0) {   // 마차 왼쪽 옆에서 — 옆에서 봐야 초승달로 읽힌다(꿈길 실측). 세로 화면은 더 멀리
    const K = Math.max(1, Math.min(2.0, 0.85 / camera.aspect)), yaw = car.rotation.y, dist = 7 + 4 * back;
    _look.copy(player.position); _look.y += 1.0;
    camera.position.set(_look.x - Math.cos(yaw) * dist * K, _look.y + (2.4 + 2.6 * back) * K, _look.z + Math.sin(yaw) * dist * K);
    _look.y += lift * K;   // 🌤️ 시선만 든다(자리는 그대로) — 거울 천장을 올려다봤다가 마차로 내려온다
    camera.lookAt(_look);
  }
  function teleport() {
    if (st.teleported) return;
    st.teleported = true;
    hooks.gateFrom.setRise(0);
    hooks.teleport();
    hooks.gateTo.setRise(1); hooks.gateTo.setOpen(1);
  }
  function finish(skipped) {
    if (st.done) return;
    teleport();
    onCurve(B, 1, route.to.park.heading); car.rotation.x = 0;
    hooks.gateTo.setRise(0);
    player.position.set(route.to.landing.x, 0, route.to.landing.z);
    playerAnchor.position.y = 0;
    hooks.flash(0);
    st.done = true;
    hooks.land({ skipped, atS: Math.round(st.t * 10) / 10, short: !first });
  }
  hooks.gateFrom.setRise(0); hooks.gateTo.setRise(0);
  car.position.set(route.from.park.x, 0, route.from.park.z); car.rotation.set(0, route.from.park.heading, 0);
  st.update = (dt) => {
    if (st.done) return;
    st.t += dt;
    const ph = phaseAt(S, st.t);
    if (ph.name === 'done') { finish(false); return; }
    if (ph.name === 'walk') {   // 지금 자리 → 승차 지점(종종걸음)
      const q = alongPath(smooth(ph.p));
      player.position.set(q.x, 0, q.z);
      if (Math.hypot(q.dx, q.dz) > 0.05) player.rotation.y = Math.atan2(q.dx, q.dz);
      playerAnchor.position.y = Math.abs(Math.sin(st.t * 14)) * 0.06;
      cam(0);
    } else if (ph.name === 'board') {   // 승차 지점 → 좌석(살짝 뛰어 오름)
      const p = smooth(ph.p), seat = seatW(), bx = route.from.board.x, bz = route.from.board.z;
      player.position.set(bx + (seat.x - bx) * p, seat.y * p + Math.sin(p * Math.PI) * 0.6, bz + (seat.z - bz) * p);
      playerAnchor.position.y = -0.3 * p;
      cam(0);
    } else if (ph.name === 'rise') {
      onCurve(A, smooth(ph.p) * 0.85, null);
      car.rotation.y = route.from.park.heading + wrap(car.rotation.y - route.from.park.heading) * smooth(ph.p / 0.25);   // 정박 방향 → 진행 방향(첫 25%) — 순간 회전 없음
      sitOn();
      const g = smooth((st.t - S.gate[0]) / (S.gate[1] - S.gate[0]));
      hooks.gateFrom.setRise(g); hooks.gateFrom.setOpen(g);
      cam(ph.p * 0.6);
    } else if (ph.name === 'pass') {
      if (st.t < S.flash) { onCurve(A, 0.85 + 0.15 * ph.p, null); }
      else { teleport(); onCurve(B, 0, null); }
      sitOn();
      hooks.flash(Math.sin(ph.p * Math.PI) * 0.9);   // 거울 문 통과 — 보랏빛 번쩍(가장 밝을 때 공간이 바뀐다)
      cam(0.6, st.teleported && dir === 'go' ? CEILING_LIFT : 0);   // 번쩍 뒤엔 이미 천장을 올려다본다(내려앉기와 이어지게)
    } else if (ph.name === 'descend') {
      teleport(); hooks.flash(0);
      const p = smooth(ph.p); onCurve(B, p, route.to.park.heading); sitOn();
      hooks.gateTo.setRise(1 - smooth((ph.p - 0.5) / 0.5));
      cam(0.6 * (1 - p) + 0.2, dir === 'go' ? CEILING_LIFT * (1 - smooth((ph.p - 0.25) / 0.5)) : 0);   // 거울 마을 도착 — 하늘의 낮 마을을 먼저 보여 준다
    } else if (ph.name === 'alight') {
      const p = smooth(ph.p), seat = seatW(), lx = route.to.landing.x, lz = route.to.landing.z;
      car.rotation.x = 0;
      player.position.set(seat.x + (lx - seat.x) * p, seat.y * (1 - p) + Math.sin(p * Math.PI) * 0.5, seat.z + (lz - seat.z) * p);
      playerAnchor.position.y = -0.3 * (1 - p);
      cam(0.2);
    }
  };
  st.skip = () => finish(true);
  return st;
}
