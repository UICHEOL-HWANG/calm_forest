// =============================================================
//  🍄 채집 숲 — 새 동사: 줍기 (도구 없이, 시간이 지나면 다시 돋음)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-24).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, FORAGE_NODES, WEATHER, atFarm, atMine, atOrchard, clayMat, clock, dexDiscover, dist2D, doPlayerAction,
  easeOutBack, forageNodes, forestGroup, giveReward, indoor, makeSignpost, noteSpecialExhibit, obstacles,
  player, questEvent, scene, situation, solidCircle, spawnFloatText, spawnSparkle, spawnTree, trackGateBlocked,
  trees,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { FORAGE_KINDS, FORAGE_RESPAWN, FOREST, FOREST_LOGS, FOREST_LOG_R, FOREST_LOG_SPOTS, FOREST_R } from '../data/places.js';
import { PAL } from '../data/world.js';
import { rollKind } from '../dex-gates.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

export function buildForest() {
  $w.forestGroup = new THREE.Group(); forestGroup.position.copy(FOREST);
  // 낙엽 깔린 숲 바닥 — 마을 잔디보다 누렇고 어두워 "다른 곳에 왔다" 는 신호
  const floor = new THREE.Mesh(new THREE.CircleGeometry(FOREST_R + 0.8, 40), clayMat(0xb0cc93, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.position.y = 0.02; floor.receiveShadow = true; forestGroup.add(floor);
  for (let i = 0; i < 14; i++) {   // 낙엽 무더기
    const a = Math.random() * Math.PI * 2, r = Math.random() * FOREST_R;
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.5 + Math.random() * 1.1, 8), clayMat(0xc9b878, false));
    leaf.geometry.rotateX(-Math.PI / 2);
    leaf.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r); forestGroup.add(leaf);
  }
  // 쓰러진 통나무 몇 개(숲 느낌 + 시선 유도) — 🚧 서 있는 나무처럼 통과 못 한다
  FOREST_LOGS.forEach(([lx, lz, ry]) => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 2.6, 8), clayMat(PAL.trunk));
    log.rotation.set(0, ry, Math.PI / 2); log.position.set(lx, 0.34, lz); log.castShadow = true; forestGroup.add(log);
  });
  for (const s of FOREST_LOG_SPOTS) solidCircle(s.x, s.z, FOREST_LOG_R);
  forestGroup.add(makeSignpost('🍄 채집 숲', 0, -FOREST_R + 1.4));
  scene.add(forestGroup);
  // 숲을 감싸는 나무들 — 안쪽에도 듬성듬성 심어 "숲 속을 헤집는" 느낌
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2 + 0.4, r = FOREST_R + 1.2 + Math.random() * 1.4;
    spawnTree(FOREST.x + Math.cos(a) * r, FOREST.z + Math.sin(a) * r);
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2, r = 3.5 + Math.random() * 4;
    spawnTree(FOREST.x + Math.cos(a) * r, FOREST.z + Math.sin(a) * r);
  }
  obstacles.push({ x: FOREST.x, z: FOREST.z, r: FOREST_R });   // 숲 안엔 밭 금지
  for (let i = 0; i < FORAGE_NODES; i++) spawnForageNode(i, true);
}

// 종류 추첨 — 🌿숲 약초는 **밤**에만(게이트 안에서 30%). 날씨는 안 본다. 표는 js/dex-gates.js
//   ⚠️ 🌧️비 온 날 "큰 값 → 목록 뒤쪽(버섯)" 보정은 **그대로 유지**한다.
//      약초 게이트를 날씨로 잡지 않은 이유가 바로 이것이다 — 비는 약초가 아니라 버섯을 밀어준다.
export function rollForageKind() {
  const rnd = WEATHER === 'rain'
    ? () => Math.max(Math.random(), Math.random())
    : Math.random;
  return rollKind(FORAGE_KINDS, 'forage', situation(), rnd);
}

export function forageMesh(kind) {
  const g = new THREE.Group();
  if (kind.id === 'mushroom') {
    [[0, 0, 1], [0.26, 0.12, 0.7], [-0.2, -0.18, 0.55]].forEach(([mx, mz, s]) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.07 * s, 0.26 * s, 7), clayMat(0xf3ead8));
      stem.position.set(mx, 0.13 * s, mz); g.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), clayMat(kind.color, false));
      cap.position.set(mx, 0.26 * s, mz); cap.scale.set(1, 0.8, 1); cap.castShadow = true; g.add(cap);
    });
  } else if (kind.id === 'berry') {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 0), clayMat(0x7fbf7a));
    bush.position.y = 0.26; bush.scale.set(1.1, 0.85, 1.1); bush.castShadow = true; g.add(bush);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), clayMat(kind.color, false));
      b.position.set(Math.cos(a) * 0.28, 0.3 + Math.sin(i) * 0.08, Math.sin(a) * 0.28); g.add(b);
    }
  } else if (kind.id === 'acorn') {
    [[0, 0], [0.2, 0.16], [-0.17, 0.2]].forEach(([mx, mz]) => {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 7), clayMat(kind.color, false));
      nut.position.set(mx, 0.12, mz); nut.scale.set(1, 1.25, 1); nut.castShadow = true; g.add(nut);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), clayMat(0x8a5f3a, false));
      cap.position.set(mx, 0.2, mz); g.add(cap);
    });
  } else {   // herb — 길쭉한 잎 다발
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 5), clayMat(kind.color));
      leaf.position.set(Math.cos(a) * 0.1, 0.26, Math.sin(a) * 0.1);
      leaf.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); leaf.castShadow = true; g.add(leaf);
    }
  }
  return g;
}

// 채집물 하나를 숲 속 빈자리에 돋움. first=true 면 최초 배치(위치도 새로 뽑음)
export function spawnForageNode(i, first = false) {
  const kind = rollForageKind();
  const mesh = forageMesh(kind);
  let node = forageNodes[i];
  if (first) {
    let x, z, tries = 0;
    do {   // 통나무·나무와 안 겹치게 재시도 — 둘 다 막혀 있어 겹치면 주우러 갈 수가 없다
      const a = Math.random() * Math.PI * 2, r = 1.6 + Math.random() * (FOREST_R - 2.4);
      x = FOREST.x + Math.cos(a) * r; z = FOREST.z + Math.sin(a) * r; tries++;
    } while (tries < 20 && (trees.some(t => dist2D(t.position, { x, z }) < 1.6)
      || FOREST_LOG_SPOTS.some(s => dist2D(s, { x, z }) < FOREST_LOG_R + 0.4)));
    node = { mesh: null, kind, x, z, ready: true, respawnAt: 0, phase: Math.random() * 6 };
    forageNodes[i] = node;
  }
  if (node.mesh) forestGroup.remove(node.mesh);
  node.kind = kind; node.mesh = mesh; node.ready = true;
  mesh.position.set(node.x - FOREST.x, 0, node.z - FOREST.z);
  mesh.rotation.y = Math.random() * Math.PI * 2;
  mesh.scale.setScalar(0.01);                      // 뽕! 하고 돋아나는 연출
  mesh.userData.pop = 1;
  forestGroup.add(mesh);
}

// 매 프레임 — 돋아나는 팝 애니메이션 + 살랑임 + 재생성 타이머
export function updateForage(dt, t) {
  if (!forestGroup) return;
  forestGroup.visible = !indoor && !atFarm && !atMine && !atOrchard;
  for (let i = 0; i < forageNodes.length; i++) {
    const n = forageNodes[i];
    if (!n.ready) { if (t >= n.respawnAt) spawnForageNode(i); continue; }
    const m = n.mesh;
    if (m.userData.pop > 0) {                      // 돋아나기(살짝 튀는 이징)
      m.userData.pop = Math.max(0, m.userData.pop - dt * 2.6);
      m.scale.setScalar(Math.max(0.01, easeOutBack(1 - m.userData.pop)));
    }
    m.rotation.z = Math.sin(t * 1.1 + n.phase) * 0.06;   // 바람에 살랑
  }
}

// 가장 가까운(주울 수 있는) 채집물 — 없으면 null
export function forageTarget() {
  if (!forestGroup || indoor || atFarm || atMine || atOrchard) return null;
  let best = null, bd = 1.9;
  for (const n of forageNodes) {
    if (!n || !n.ready) continue;
    const d = dist2D(n, player.position);
    if (d < bd) { bd = d; best = n; }
  }
  return best ? { node: best, d: bd } : null;
}

// 🍄 줍기 — 도구가 필요 없는 "채집". 주운 자리는 잠시 뒤 다른 종류로 다시 돋아남
export function tryForage(node) {
  const i = forageNodes.indexOf(node);
  if (i < 0 || !node.ready) return;
  const kind = node.kind;
  doPlayerAction(node.x, node.z, 'pick');   // 🍄 도구를 휘두르지 않고 허리를 접는 동작
  node.ready = false;
  node.respawnAt = clock.elapsedTime + FORAGE_RESPAWN[0] + Math.random() * (FORAGE_RESPAWN[1] - FORAGE_RESPAWN[0]);
  forestGroup.remove(node.mesh); node.mesh = null;
  giveReward(kind.give, 'forage', kind.id);
  Sound.harvest();
  spawnFloatText(node.x, 1.0, node.z, `+${kind.ico} ${kind.name}`, '#5a7a3a');
  spawnSparkle(node.x, 0.55, node.z, kind.id === 'herb' ? 18 : 10);   // 발밑에서 반짝(잎 파티클은 나무 높이라 안 맞음)
  questEvent('forage');                                       // 🦉 데일리 의뢰(채집)
  dexDiscover('forage', kind.id);                             // 📖 채집 도감
  noteSpecialExhibit('forage', kind.id);                      // 🏛️ ✨안개 낀 날이면 특별 전시
  trackGateBlocked('forage', 'herb');     // [GA4] 📖
  trackEvent('forage_pick', { kind: kind.id, weather: WEATHER });   // [GA4] 채집 루프 KPI
}
