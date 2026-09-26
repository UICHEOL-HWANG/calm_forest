// =============================================================
//  🎬 프롤로그 컷신 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, camera, gameState, handAnchor, player, playerAnchor, scene, sitting, snapCamera, stopOutdoorPlacing,
  ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

//    캐릭터 선택 직후 1회 재생. 실제 비디오가 아니라 인게임 세트(로우폴리 도시)로 연출해
//    번들 무게 0, 아트스타일 통일, 선택한 캐릭터가 그대로 출연한다. 자막/페이드/스킵은 index.html DOM.
export const CITY = new THREE.Vector3(0, 0, 480);

export let citySet = null;

export let intro = null;

// 도시 세트 — 전부 MeshBasicMaterial(무조명): 마을의 낮/밤과 무관하게 항상 우중충한 밤 분위기 + 모바일에서 가장 저렴
export function buildCitySet() {
  if (citySet) return;
  const flat = (color) => new THREE.MeshBasicMaterial({ color });
  const g = new THREE.Group(); g.position.copy(CITY);
  // 바닥·도로·인도
  const ground = new THREE.Mesh(new THREE.BoxGeometry(60, 0.04, 30), flat(0x2e2f38)); ground.position.y = -0.02; g.add(ground);
  const road = new THREE.Mesh(new THREE.BoxGeometry(26, 0.06, 5), flat(0x33343c)); road.position.set(0, 0.03, 0); g.add(road);
  for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.14), flat(0x7d818f)); d.position.set(-8 + i * 4, 0.035, 0); g.add(d); }
  for (const z of [3.6, -3.6]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(26, 0.14, 3), flat(0x45464f)); sw.position.set(0, 0.07, z); g.add(sw); }
  // 빌딩(뒷줄) + 창문 불빛 — 일부 창문은 flickers 에 담아 깜빡임
  const flickers = [];
  [5, 7, 4.5, 6, 5.5].forEach((h, i) => {
    const x = -10 + i * 5;
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.6, h, 3), flat(i % 2 ? 0x44454f : 0x3c3d47));
    b.position.set(x, h / 2, -6.5); g.add(b);
    const rows = Math.floor(h / 1.15);
    for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) {
      const roll = Math.random();
      const col = roll < 0.55 ? 0xffd98a : roll < 0.8 ? 0x9ad8ff : 0x2b2c34;   // 따뜻/차가움/꺼짐
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.38), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      w.position.set(x - 0.8 + c * 1.6, 0.9 + r * 1.15, -4.98); g.add(w);
      if (roll < 0.8 && Math.random() < 0.25) flickers.push(w);
    }
  });
  // 스카이라인 실루엣 + 배경막
  [[-12, 9], [-4, 10.5], [4, 8.5], [12, 10]].forEach(([x, h]) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(4, h, 2), flat(0x2c2d36)); s.position.set(x, h / 2, -11); g.add(s);
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(70, 26), flat(0x1f2029)); back.position.set(0, 12, -14); g.add(back);
  // 간판은 이모지 없이 단순 네온 판만 — 이모지 빌보드는 각도에 따라 잘려 보여서 뺐다(사용자 결정)
  [[0xd98f6a, -4.2, 3.2, 1.1, 0.5], [0x9fd8c0, 5.2, 2.5, 0.9, 0.42], [0xc9a8ff, 10.2, 4.2, 0.7, 0.36]].forEach(([col, x, y, w, h]) => {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col }));
    sign.position.set(x, y, -4.96); g.add(sign);
  });
  // 가로등(차가운 빛) — 라이트는 1개만(모바일)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.4, 6), flat(0x50525c)); pole.position.set(-2.6, 1.7, 2.2); g.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), flat(0xcfd6e6)); head.position.set(-2.6, 3.42, 2.2); g.add(head);
  const lamp = new THREE.PointLight(0xbfd0ff, 0.9, 10); lamp.position.set(-2.6, 3.3, 2.2); g.add(lamp);
  // 버스 정류장 — 벤치는 없앴다(사용자 결정). 주인공은 인도 바닥에 그대로 주저앉아 있고,
  // 이게 오히려 "왜 길바닥에 앉아 있나"라는 서사(도시에서도 그랬다)와 맞아떨어진다.
  // 표지판 — 도시 무채색 팔레트에 맞춘 차분한 톤(쨍한 파랑 제거)
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), flat(0x50525c)); signPole.position.set(3.5, 1.3, 2.05); g.add(signPole);
  const signPlate = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.5, 0.06), flat(0x5a5f6b)); signPlate.position.set(3.5, 2.28, 2.05); g.add(signPlate);
  const signStripe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.02), flat(0xb9bec9)); signStripe.position.set(3.5, 2.28, 2.09); g.add(signStripe);
  // 바쁘게 오가는 행인 동물들(회색 톤 — 도시에선 모두가 지쳐 있다)
  // 앞줄은 벤치 뒤편(z≥3.5)으로 보내 벤치·주인공을 관통하지 않게, 같은 줄끼리도 차선을 띄운다
  const walkers = [];
  [[0x5a5c66, 3.6, 1, 1.15], [0x4e505a, -3.6, -1, 0.85], [0x62646e, 4.1, -1, 1.4], [0x545660, -3.1, 1, 1.0]].forEach(([col, z, dir, spd], i) => {
    const w = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 0.56, 8), flat(col)); body.position.y = 0.32; w.add(body);
    const wh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), flat(col)); wh.position.y = 0.72; w.add(wh);
    w.position.set(-9 + i * 5, 0.14, z); w.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(w); walkers.push({ m: w, dir, spd, ph: i * 1.7 });
  });
  g.visible = false;
  scene.add(g);
  citySet = { group: g, walkers, flickers, lamp };
}

// 🌿 프롤로그 잎사귀 — 이모지 대신 직접 모델링한 로우폴리 잎(회색 도시의 유일한 초록).
//    잎몸(곡선 셰이프) + 중앙 잎맥 + 곁맥 4개 + 줄기. 무조명 재질로 어디서든 선명한 초록.
export function makeIntroLeaf() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.16, 0.06, 0.2, 0.24);    // 오른쪽 볼록
  shape.quadraticCurveTo(0.12, 0.4, 0, 0.52);       // 끝(뾰족)
  shape.quadraticCurveTo(-0.12, 0.4, -0.2, 0.24);   // 왼쪽 볼록
  shape.quadraticCurveTo(-0.16, 0.06, 0, 0);
  const blade = new THREE.Mesh(new THREE.ShapeGeometry(shape, 6),
    new THREE.MeshBasicMaterial({ color: 0x86d492, side: THREE.DoubleSide }));
  g.add(blade);
  const veinMat = new THREE.MeshBasicMaterial({ color: 0x55a468, side: THREE.DoubleSide });
  const rib = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.44), veinMat);
  rib.position.set(0, 0.25, 0.003); g.add(rib);
  [[-1, 0.14], [1, 0.2], [-1, 0.28], [1, 0.34]].forEach(([s, y]) => {   // 곁맥
    const v = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.13), veinMat);
    v.position.set(s * 0.055, y, 0.003); v.rotation.z = s * 0.85; g.add(v);
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.017, 0.16, 5),
    new THREE.MeshBasicMaterial({ color: 0x55a468 }));
  stem.position.set(0, -0.07, 0); g.add(stem);
  g.rotation.x = -0.35;      // 살짝 눕혀 입체감
  g.scale.setScalar(0.72);   // 손바닥만 한 크기(캐릭터를 가리지 않게)
  return g;
}

// 자막·컷 타이밍(초) — 총 ~22초, 언제든 스킵 가능
//   마지막 자막은 4장 '잎사귀의 주인'의 회수를 첫 20초에 질문으로 심는다 —
//   "목적이 뭔지 모르겠다" 베타 피드백. 분위기만 주고 끝내면 플레이어는 목표 없이 마을에 떨궈진다.
export const INTRO_CAPTIONS = [
  { at: 0.6, until: 5.2, text: '매일이 시끄럽고, 매일이 똑같았다.' },
  { at: 6.0, until: 10.2, text: '그날, 바람이 잎사귀 하나를 데려왔다.' },
  { at: 12.6, until: 15.2, text: '…여기서 한번 살아볼까.' },
  { at: 15.9, until: 18.3, text: '그런데 이 잎사귀… 누가 보낸 걸까?' },
];

export function introStart(force = false) {
  if (intro) return true;
  if (!force && gameState.hintsSeen.intro) return false;   // 첫 시작에만
  buildCitySet();
  citySet.group.visible = true;
  intro = {
    t: 0, flags: {},
    savedPos: player.position.clone(),
    savedRotY: player.rotation.y,
  };
  // 주인공: 도시 벤치에 축 처져 앉아 있음(앉기 포즈 + 고개 숙임)
  $w.sitting = false; stopOutdoorPlacing(true);
  player.rotation.y = 0.15;                                 // 거의 정면(측면 카메라에서 좌석 이탈처럼 보이는 착시 방지)
  if (handAnchor) handAnchor.visible = false;               // 등의 도구(도끼 등)는 컷신 분위기상 숨김
  playerAnchor.position.y = -0.3;                           // 앉기 포즈
  playerAnchor.rotation.x = 0.24;                           // 지친 어깨
  // 🪑 인도 바닥에 실측 착석 — 몸 최저점을 인도 윗면(0.145)에 맞춰 어떤 몸집도 바닥을 뚫지 않음
  player.position.set(CITY.x + 1.5, 0, CITY.z + 2.7);
  player.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(player);
  player.position.y = 0.145 - bb.min.y;
  // 🌿 잎사귀(초대장) — 컷2에서 바람에 실려 내려온다(직접 모델링한 잎)
  intro.flyer = makeIntroLeaf();
  intro.flyer.visible = false;
  citySet.group.add(intro.flyer);
  ui.introShow?.(true);
  trackEvent('intro_start');                                // [GA4] 온보딩 퍼널 첫 계단
  return true;
}

export function introEnd(skipped) {
  if (!intro) return;
  const atS = Math.round(intro.t * 10) / 10;
  // 원상 복구 — 마을 스폰 자리로, 서 있는 포즈로
  player.position.copy(intro.savedPos); player.position.y = 0;
  player.rotation.y = intro.savedRotY;
  playerAnchor.position.y = 0; playerAnchor.rotation.x = 0;
  if (handAnchor) handAnchor.visible = true;                // 도구 복원
  citySet.group.visible = false;
  if (intro.flyer) {
    citySet.group.remove(intro.flyer);
    intro.flyer.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
  intro = null;
  gameState.hintsSeen.intro = true;                         // 다시 안 봄(저장에 포함)
  snapCamera();
  ui.introShow?.(false);
  trackEvent(skipped ? 'intro_skip' : 'intro_complete', { at_s: atS });  // [GA4] 어디서 건너뛰는지 = 연출 개선 지표
}

// 컷신 카메라 — 타깃 기준 오프셋을 화면비에 맞게 스케일(세로 화면은 수평 시야가 좁아 더 멀리서 잡아야 안 깨짐)
export function introCam(tx, ty, tz, x, y, z) {
  const K = Math.max(1, Math.min(2.1, 0.85 / camera.aspect));
  camera.position.set(tx + (x - tx) * K, ty + (y - ty) * K, tz + (z - tz) * K);
  camera.lookAt(tx, ty, tz);
}

// 매 프레임 컷신 진행 — dt 누적 기반이라 프레임 드랍/저사양에서도 순서가 밀리지 않는다
export function updateIntro(dt, t) {
  if (!intro) return;
  const T = (intro.t += dt);
  const F = intro.flags;
  const px = CITY.x + 1.5, pz = CITY.z + 2.62;              // 벤치의 주인공 위치
  // 자막
  const cap = INTRO_CAPTIONS.find(c => T >= c.at && T < c.until);
  ui.introCaption?.(cap ? cap.text : null);
  // 도시 생활감: 행인 걷기 + 창문 깜빡임 + 주인공의 무거운 숨
  if (T < 11.9) {
    for (const w of citySet.walkers) {
      w.m.position.x += w.dir * w.spd * dt;
      if (w.m.position.x > 12) w.m.position.x = -12;
      if (w.m.position.x < -12) w.m.position.x = 12;
      w.m.position.y = 0.14 + Math.abs(Math.sin(t * 7 + w.ph)) * 0.045;
    }
    citySet.flickers.forEach((w, i) => { w.material.opacity = 0.55 + 0.45 * (Math.sin(t * 2.2 + i * 2.9) > -0.4 ? 1 : 0); });
    playerAnchor.position.y = -0.3 + Math.sin(T * 1.5) * 0.02;
  }
  // ── 컷1 (0~5.5s): 도시 와이드 → 벤치로 느린 달리인 ──
  if (T < 5.5) {
    const p = Math.min(1, T / 5.5), e = p * p * (3 - 2 * p);  // smoothstep
    introCam(CITY.x + 1.2, 1.0, CITY.z + 1.2,
      CITY.x - 8 + e * 6.4, 3.0 - e * 1.1, CITY.z + 10.5 - e * 3.2);
  }
  // ── 컷2 (5.5~10.6s): 주인공 클로즈업 + 🌿 잎사귀가 바람에 실려 온다 ──
  else if (T < 10.6) {
    const p = Math.min(1, (T - 5.5) / 0.9), e = p * p * (3 - 2 * p);
    introCam(px, 0.9, pz,                                    // 바닥 착석 높이에 맞춰 시선 낮춤
      px + 2.6 - e * 0.7 + Math.sin(T * 0.7) * 0.04, 1.85 - e * 0.55, pz + 4.6 - e * 1.9);
    if (T >= 6.0) {
      if (!F.flyer) { F.flyer = true; intro.flyer.visible = true; }
      const fp = Math.min(1, (T - 6.0) / 2.6);               // 2.6초에 걸쳐 하늘하늘 하강
      intro.flyer.position.set(
        1.5 - 2.4 + fp * 3.25 + Math.sin(T * 3) * 0.12 * (1 - fp),   // 착지 x 2.35 — 캐릭터 옆 바닥
        2.9 - fp * 2.42,
        3.95 - fp * 0.4);   // 착지 z 3.55 — 캐릭터보다 카메라 쪽 앞바닥
      if (fp < 1) {
        intro.flyer.rotation.z = Math.sin(T * 2.4) * 0.6 * (1 - fp * 0.5);   // 좌우 나부낌
        intro.flyer.rotation.y = T * 2.0 * (1 - fp * 0.7);                   // 빙글 — 착지 가까워질수록 잦아듦
      } else {
        intro.flyer.rotation.y = Math.sin(T * 1.3) * 0.22;                   // 착지: 잎면이 카메라를 보며 살랑
        intro.flyer.rotation.z = Math.sin(T * 1.7) * 0.12;
        intro.flyer.position.y = 0.48 + Math.sin(T * 2) * 0.03;
      }
      if (fp > 0.75) playerAnchor.rotation.x = Math.max(0.06, playerAnchor.rotation.x - dt * 0.35); // 고개를 든다
    }
  }
  // ── 컷3 (10.6~11.9s): 화이트 페이드 → 숲 도착(원래 스폰 자리) ──
  if (T >= 10.6 && !F.fade) { F.fade = true; ui.introFade?.(1); }
  if (T >= 11.9 && !F.arrive) {
    F.arrive = true;
    citySet.group.visible = false;
    if (intro.flyer) intro.flyer.visible = false;
    player.position.copy(intro.savedPos); player.position.y = 0;
    player.rotation.y = Math.PI;                             // 숲(마을 안쪽)을 바라봄
    playerAnchor.position.y = -0.3; playerAnchor.rotation.x = 0.05;  // 아직 앉아서 둘러보는 중
    ui.introFade?.(0);
  }
  // ── 컷3b (11.9~18.6s): 숲의 색채 — 천천히 일어선다 ──
  //   달리인은 16.2s에 끝나고(ve=1) 그 뒤는 홀드 — '누가 보낸 걸까?' 자막 동안 숨쉬기만 이어진다.
  if (T >= 11.9 && T < 18.6) {
    const vp = Math.min(1, (T - 11.9) / 6.7), ve = vp * vp * (3 - 2 * vp);   // 6.7 = 홀드 끝(18.6)까지 — 4.3이면 16.2에 멈춰 2.4초 정지 화면이 된다
    const sx = intro.savedPos.x, sz = intro.savedPos.z;
    introCam(sx, 1.1, sz,
      sx + 0.5 - ve * 0.5, 3.4 - ve * 0.5, sz + 6.6 - ve * 1.3);
    playerAnchor.position.y = Math.sin(t * 2) * 0.03 - 0.3 * Math.max(0, 1 - Math.max(0, (T - 13.2) / 1.4)); // 13.2s부터 일어남
    if (T > 14.6) playerAnchor.rotation.x = Math.max(0, playerAnchor.rotation.x - dt * 0.3);
  }
  // ── 컷4 (18.9s~): 타이틀 인/아웃 → 종료 ──
  //   자막 페이드(.5s)가 끝난 뒤에 들어온다 — 마지막 자막 18.3 종료 + 0.6s 여유.
  if (T >= 18.9 && !F.title) { F.title = true; ui.introTitle?.(true); Sound.blip(); }
  if (T >= 21.1 && !F.titleOut) { F.titleOut = true; ui.introTitle?.(false); }
  if (T >= 21.7) introEnd(false);
}
