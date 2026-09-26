// =============================================================
//  🍳 작업대·자유주방·가공 클로즈업 무대 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, camera, clayMat, makeSignpost, mergeGeos, mgView, nearStation, obstacles, outdoorMeshes, player, refreshStations,
  roundRect, scene, snapCamera, solidCircle, spawnSparkle, trees, updateCarveScene, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { BENCH, KITCHEN, RANK } from '../data/places.js';
import { t } from '../i18n.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

export function spawnWorkbench() {
  const g = new THREE.Group(); g.position.copy(BENCH);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.9), woodMat(2, 1)); top.position.y = 0.7; top.castShadow = true; g.add(top);
  [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]].forEach(([x, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), clayMat(0x6b4a34)); l.position.set(x, 0.35, z); g.add(l);
  });
  const vise = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.22), clayMat(0x8b8b93)); vise.position.set(-0.35, 0.88, 0); vise.castShadow = true; g.add(vise); // 바이스(공구 느낌)
  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.1), woodMat(1, 1)); hammer.position.set(0.4, 0.81, 0.12); hammer.rotation.y = 0.5; g.add(hammer); // 놓인 망치 자루
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.16), clayMat(0x6e6e76)); head.position.set(0.52, 0.83, 0.05); head.rotation.y = 0.5; g.add(head);
  g.add(makeSignpost('🔧 작업대', 1.2, 0.7));   // 팻말 — 요리는 옆 🍳 자유주방으로 분리됨
  scene.add(g);
  obstacles.push({ x: BENCH.x, z: BENCH.z, r: 1.4 }); // 작업대 위엔 밭 금지
  solidCircle(BENCH.x, BENCH.z, 1.0);                 // 🚧 (제작 상호작용 2.0 확보)
}

export function spawnKitchen() {
  const g = new THREE.Group(); g.position.copy(KITCHEN);
  // 조리대(카운터)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.8, 0.85), clayMat(0xf3e6d0)); counter.position.y = 0.4; counter.castShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.09, 1.0), woodMat(2, 1)); top.position.y = 0.85; top.castShadow = true; g.add(top);
  // 화덕 + 냄비(김이 나는 요리 느낌)
  const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.16, 10), clayMat(0x7a5a44)); stove.position.set(-0.45, 0.97, 0); g.add(stove);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.3, 12), clayMat(0x5a5148)); pot.position.set(-0.45, 1.18, 0); pot.castShadow = true; g.add(pot);
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12), clayMat(0xffb35e, false)); soup.position.set(-0.45, 1.33, 0); g.add(soup);
  // 도마 + 칼(썰기 리듬 게임의 상징)
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.38), woodMat(1, 1)); board.position.set(0.42, 0.92, 0.05); g.add(board);
  const knife = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.07), clayMat(0xc9ccd4, false)); knife.position.set(0.42, 0.96, -0.06); knife.rotation.y = 0.35; g.add(knife);
  // 차양(상점과 톤이 다른 민트 줄무늬 — 멀리서도 "주방"으로 구분)
  for (let i = 0; i < 4; i++) {
    const c = i % 2 ? 0x9fd8c0 : 0xfff6e6;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.8), clayMat(c, false));
    s.position.set(-0.75 + i * 0.5, 1.95, 0.15); s.rotation.x = -0.35; g.add(s);
  }
  for (const x of [-0.85, 0.85]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.05, 6), clayMat(0x6b4a34)); p.position.set(x, 1.02, -0.25); g.add(p); }
  g.add(makeSignpost('🍳 자유주방', 1.45, 0.75));  // 팻말
  scene.add(g);
  obstacles.push({ x: KITCHEN.x, z: KITCHEN.z, r: 1.5 });
  solidCircle(KITCHEN.x, KITCHEN.z, 1.1);           // 🚧 (요리 상호작용 2.2 확보)
}

export function spawnRankBoard() {
  const g = new THREE.Group(); g.position.copy(RANK);
  // 받침: 크림 자갈 단(살짝 올라온 무대)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.14, 14), clayMat(0xefe6d2)); base.position.y = 0.07; base.receiveShadow = true; g.add(base);
  // 기둥: 판 "뒤"에서 받치는 지지대(정면에서 판을 가로지르지 않게 프레임 뒤로 숨김)
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.3, 10), clayMat(0xf7f0e0)); post.position.set(s * 0.95, 1.15, -0.14); post.castShadow = true; g.add(post);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 8, 14), clayMat(0xe8c46a, false)); ring.rotation.x = Math.PI / 2; ring.position.set(s * 0.95, 0.55, -0.14); g.add(ring);
  }
  // 패널: 민트 프레임 + 크림 면(캔버스 텍스처로 랭킹 미리보기 장식)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.62, 0.12), clayMat(0x9fd8c0)); frame.position.y = 1.62; frame.castShadow = true; g.add(frame);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 336;
  const c = cv.getContext('2d');
  c.fillStyle = '#fff8ea'; roundRect(c, 0, 0, 512, 336, 26); c.fill();
  c.fillStyle = '#7fce8b'; roundRect(c, 18, 16, 476, 74, 18); c.fill();
  c.fillStyle = '#2f4a3a'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '700 46px sans-serif'; c.fillText(t('🏆 이번 주 랭킹'), 256, 54);
  const rows = [['🥇', '#f5d76e'], ['🥈', '#cfd6de'], ['🥉', '#e0a878']];
  rows.forEach(([medal, col], i) => {
    const y = 116 + i * 62;
    c.font = '34px sans-serif'; c.textAlign = 'left'; c.fillStyle = '#3a4a40';
    c.fillText(medal, 34, y + 18);
    c.fillStyle = col; roundRect(c, 84, y, 340 - i * 60, 34, 12); c.fill();   // 장식용 점수 바(길이 차등)
  });
  c.fillStyle = '#8a9a8e'; c.font = '600 24px sans-serif'; c.textAlign = 'center';
  c.fillText(t('매주 월요일 새로 시작 · 가까이서 확인!'), 256, 312);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.44), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  face.position.set(0, 1.62, 0.065); g.add(face);
  // 지붕: 꿀색 박공 — 판 상단(2.43)에 밀착(붕 떠 보이지 않게) + 꼭대기 금 구슬
  for (const s of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.07, 0.55), clayMat(0xf0b46a));
    slab.position.set(s * 0.6, 2.56, 0); slab.rotation.z = -s * 0.4; slab.castShadow = true; g.add(slab);
  }
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), clayMat(0xe8c46a, false)); orb.position.set(0, 2.85, 0); g.add(orb);
  scene.add(g);
  obstacles.push({ x: RANK.x, z: RANK.z, r: 1.7 });   // 밭 금지
  solidCircle(RANK.x, RANK.z, 1.15);                  // 🚧 (상호작용 2.2 확보)
}

//    (카페 홀처럼 마을과 떨어진 별도 공간. 도마·칼·냄비를 크게 보여주는 "요리 게임 화면")
export const KSET = new THREE.Vector3(0, 0, 420);

export let kset = null;

//  ⚠️ 텍스처는 이모지별로 공유한다 — 이 스프라이트들은 dispose 하는 곳이 없어서,
//     호출마다 새 캔버스를 만들면 판을 거듭할수록 GPU 텍스처가 그대로 쌓인다.
//     재질(색·회전)은 스프라이트마다 따로 둬야 하므로(굽기의 탄 색, 뒤집기 회전) 재질은 공유하지 않는다.
export const _emojiTex = new Map();

export function emojiTexture(emoji) {
  let tex = _emojiTex.get(emoji);
  if (tex) return tex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  // ♨️처럼 위로 긴 글리프도 안 잘리게 폰트를 캔버스보다 넉넉히 작게(시각 크기는 sp.scale이 결정)
  c.font = '84px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(emoji, 64, 66);
  tex = new THREE.CanvasTexture(cv);
  _emojiTex.set(emoji, tex);
  return tex;
}

export function emojiSprite(emoji, size = 0.5) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthWrite: false }));
  sp.scale.set(size, size, 1);
  return sp;
}

export const LADLE_R = 0.22;

export function buildKitchenSet() {
  if (kset) return;
  const g = new THREE.Group(); g.position.copy(KSET);
  // 배경 벽 + 선반(양념병) — 아늑한 주방 느낌
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), clayMat(0xf3e2c8, false)); wall.position.set(0, 2.2, -1.7); g.add(wall);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.5), woodMat(2, 1)); shelf.position.set(-0.4, 2.55, -1.45); g.add(shelf);
  [0xd98f6a, 0x9fd8c0, 0xe8c46a, 0xc9a8ff].forEach((col, i) => {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 8), clayMat(col, false));
    jar.position.set(-1.45 + i * 0.7, 2.72, -1.45); g.add(jar);
  });
  // 조리대(넓은 카운터가 화면 하단을 가득 채움)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(9, 1.0, 3.4), woodMat(3, 1)); counter.position.set(0, 0.5, 0); counter.receiveShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(9, 0.07, 3.5), clayMat(0xf7ecd8, false)); top.position.set(0, 1.03, 0); g.add(top);
  // 🔪 도마 + 칼 (썰기 무대)
  const boardGroup = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.15), woodMat(1, 1)); board.position.set(0, 1.10, 0.15); board.castShadow = true; boardGroup.add(board);
  const knife = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.025), new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.3, metalness: 0.6 }));
  blade.position.set(-0.27, -0.03, 0); knife.add(blade);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.028), new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.2, metalness: 0.7 }));
  edge.position.set(-0.27, -0.105, 0); knife.add(edge);   // 반짝이는 칼날 라인
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.055), clayMat(0x5a4632)); handle.position.set(0.1, 0.02, 0); knife.add(handle);
  knife.position.set(-0.28, 1.5, 0.55); knife.rotation.z = 0.42;   // 손잡이를 축으로 들려 있음
  boardGroup.add(knife);
  // ✂️ 썰기 지점 표시 — 노트가 이 흰 선에 올 때 탭
  const cutLine = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.75), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  cutLine.rotation.x = -Math.PI / 2; cutLine.position.set(-0.35, 1.155, 0.45); boardGroup.add(cutLine);
  g.add(boardGroup);
  // 🍲 화덕 + 냄비 (끓이기 무대)
  const potGroup = new THREE.Group();
  const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.16, 12), clayMat(0x6b5140)); stove.position.set(0, 1.12, 0.05); potGroup.add(stove);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.44, 0.46, 14), clayMat(0x54493f)); pot.position.set(0, 1.43, 0.05); pot.castShadow = true; potGroup.add(pot);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.16), clayMat(0x3f362e)); h.position.set(s * 0.56, 1.52, 0.05); potGroup.add(h); }
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 14), clayMat(0xf09a4b, false)); soup.position.set(0, 1.66, 0.05); potGroup.add(soup);
  const flames = [];
  for (let i = 0; i < 3; i++) { const f = emojiSprite('🔥', 0.3); f.position.set(-0.28 + i * 0.28, 1.16, 0.5); potGroup.add(f); flames.push(f); }
  const bubbles = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), clayMat(0xffe8c8, false));
    b.position.set((Math.random() - 0.5) * 0.6, 1.66, 0.05 + (Math.random() - 0.5) * 0.5);
    b.userData.ph = Math.random() * 2; potGroup.add(b); bubbles.push(b);
  }
  const steam = [];
  for (let i = 0; i < 2; i++) { const s = emojiSprite('♨️', 0.34); s.material.opacity = 0; s.position.set(-0.15 + i * 0.3, 1.9, 0.05); s.userData.ph = i * 1.3; potGroup.add(s); steam.push(s); }
  // 🥄 국자 — 냄비 안쪽에 담가 두고 손잡이만 위로(테두리 밖으로 튀지 않게)
  const ladle = new THREE.Group();
  const lHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.52, 8), woodMat(1, 1));
  lHandle.rotation.z = -0.62; lHandle.position.set(0.151, 0.212, 0); ladle.add(lHandle);   // 아래 끝이 국자 컵에 붙도록
  const lBowl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), clayMat(0x8a7a68));
  lBowl.scale.set(1, 0.72, 1); ladle.add(lBowl);                                           // 살짝 납작한 국자 컵
  ladle.position.set(LADLE_R, 1.70, 0.05); potGroup.add(ladle);                            // 국물에 반쯤 잠긴 높이
  const foods = new THREE.Group(); foods.position.set(0, 1.7, 0.05); potGroup.add(foods);   // 국에 둥둥 뜨는 재료 스프라이트
  g.add(potGroup);
  // 조명 — 세트 전용 따뜻한 불빛(밤에도 아늑하게 보이게)
  const light = new THREE.PointLight(0xffe0b0, 1.15, 14); light.position.set(0.4, 3.4, 2.2); g.add(light);
  // 🔥 굽기 무대 — 석쇠 팬 + 불꽃. 재료는 mgSceneStart 가 레시피 아이콘으로 얹는다.
  //    ⚡ 정적 파츠(팬·손잡이·받침)는 재질별로 미리 합쳐 둔다 — 무대는 매 프레임 카메라 고정이라
  //       드로우콜이 곧 프레임 시간이다.
  const grillGroup = new THREE.Group();
  {
    const dark = clayMat(0x4a4038, false), metal = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.35, metalness: 0.5 });
    const body = [
      new THREE.CylinderGeometry(0.7, 0.74, 0.16, 14).translate(0, 1.12, 0.05),           // 화덕 받침(불꽃이 숨을 자리)
      new THREE.CylinderGeometry(0.62, 0.66, 0.14, 16).translate(0, 1.28, 0.05),          // 팬
      new THREE.CylinderGeometry(0.055, 0.06, 0.7, 8).rotateZ(Math.PI / 2).translate(0.88, 1.34, 0.05),  // 손잡이
    ];
    grillGroup.add(new THREE.Mesh(mergeGeos(body), dark));
    const bars = [];
    for (let i = 0; i < 5; i++) bars.push(new THREE.BoxGeometry(1.02, 0.03, 0.05).translate(0, 1.36, -0.25 + i * 0.125));   // 석쇠 살
    grillGroup.add(new THREE.Mesh(mergeGeos(bars), metal));
    grillGroup.position.set(0, 0, 0);
  }
  const grillFlames = [];
  // 팬 앞쪽에서 혀를 내미는 불 — 받침에 묻히지 않게 팬 높이보다 살짝 아래, 카메라 쪽으로 당겨 둔다
  for (let i = 0; i < 3; i++) { const f = emojiSprite('🔥', 0.34); f.position.set(-0.34 + i * 0.34, 1.16, 0.82); grillGroup.add(f); grillFlames.push(f); }
  const grillFood = new THREE.Group(); grillFood.position.set(0, 1.46, 0.02); grillGroup.add(grillFood);
  g.add(grillGroup);

  // 🧂 간 맞추기 무대 — 그릇 + 기울어지는 소금통 + 쏟아지는 소금 입자
  const seasonGroup = new THREE.Group();
  {
    const bowlMat = clayMat(0xeae2d4, false);
    const bowl = [
      new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, 1.38, 0.05),  // 반구 그릇
      new THREE.CylinderGeometry(0.24, 0.3, 0.08, 12).translate(0, 0.92, 0.05),                                   // 굽
    ];
    seasonGroup.add(new THREE.Mesh(mergeGeos(bowl), bowlMat));
    const stew = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 16), clayMat(0xe8a763, false));
    stew.position.set(0, 1.3, 0.05); seasonGroup.add(stew);
  }
  const shaker = new THREE.Group();
  {
    const mats = clayMat(0xf4f1ea, false);
    shaker.add(new THREE.Mesh(mergeGeos([
      new THREE.CylinderGeometry(0.13, 0.15, 0.36, 10).translate(0, 0, 0),
      new THREE.SphereGeometry(0.13, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.18, 0),
    ]), mats));
  }
  //  그릇 바로 위에 낮게 — 높이 띄우면 클로즈업 카메라(높이 2.55)에서 그릇과 소금통이 화면 위아래로 갈라진다
  shaker.position.set(0.26, 1.74, 0.05); seasonGroup.add(shaker);
  const saltBits = [];
  {
    const saltMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const saltGeo = new THREE.SphereGeometry(0.022, 5, 4);
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(saltGeo, saltMat); b.visible = false; seasonGroup.add(b); saltBits.push(b);   // 지오메트리·재질 공유(입자 14개가 1콜)
    }
  }
  g.add(seasonGroup);

  g.visible = false;
  scene.add(g);
  kset = { group: g, boardGroup, knife, potGroup, soup, flames, bubbles, steam, ladle, foods, light,
    grillGroup, grillFlames, grillFood, seasonGroup, shaker, saltBits,
    notes: [], fx: [], knifeT: -1, ladleT: -1, flareT: -1, drop: null, dropT: -1,
    flipT: -1, burn: 0, pouring: false, saltT: 0 };
}

// 미니게임 무대 입장 — 종류별 소품 토글 + 카메라 클로즈업 고정.
//   코스 요리라 한 판 안에서 여러 번 불린다(썰기 → 굽기 → 끓이기). 매번 이전 판 소품을 치우고
//   그 단계의 소품만 켠다. 세트 자체는 한 번만 짓는다.
export function mgSceneStart(type, icos = [], noteN = 0, dishIco = '') {
  buildKitchenSet();
  kset.group.visible = true;
  kset.boardGroup.visible = type === 'chop';
  kset.potGroup.visible = type === 'pot';
  kset.grillGroup.visible = type === 'grill';
  kset.seasonGroup.visible = type === 'season';
  // 이전 판 소품 정리
  kset.notes.forEach(n => n.parent?.remove(n)); kset.notes = [];
  kset.fx.forEach(f => f.sp.parent?.remove(f.sp)); kset.fx = [];
  kset.foods.clear(); kset.grillFood.clear();
  kset.knifeT = -1; kset.ladleT = -1; kset.flareT = -1; kset.dropT = -1;
  kset.flipT = -1; kset.burn = 0; kset.pouring = false; kset.saltT = 0;
  kset.saltBits.forEach(b => { b.visible = false; });
  if (kset.drop) { kset.drop.parent?.remove(kset.drop); kset.drop = null; }
  if (type === 'pot') {                                     // 국물 위 재료
    icos.slice(0, 3).forEach((ico, i) => {
      const sp = emojiSprite(ico, 0.3); sp.position.set(-0.18 + i * 0.18, 0.02, 0); sp.userData.ph = i * 1.7;
      kset.foods.add(sp);
    });
  } else if (type === 'grill') {                            // 석쇠 위 한 덩이(뒤집을 대상) — 만들고 있는 요리를 보여준다
    const sp = emojiSprite(dishIco || icos[0] || '🥕', 0.56);
    kset.grillFood.add(sp);
  } else if (type === 'chop') {                             // 리듬 노트(도마 앞을 흘러감)
    for (let i = 0; i < noteN; i++) {
      const sp = emojiSprite(icos[i % Math.max(1, icos.length)] || '🥕', 0.44);
      sp.position.set(3.4, 1.24, 0.75); sp.visible = false;
      kset.group.add(sp); kset.notes.push(sp);
    }
  }
  $w.mgView = { type };
  applyMgCamera();
}

// 🔥 굽기 — 뒤집기 연출(재료가 반 바퀴 돌아 다시 앉음). over=true 면 탄 정도가 한 단계 짙어진다
export function mgGrillFlip(judge, over = false) {
  if (!kset) return;
  kset.flipT = 0;
  if (over) kset.burn = Math.min(1, kset.burn + 0.45);
  kset.flareT = 0.4;
  if (judge !== 'miss') spawnSparkle(KSET.x, KSET.y + 1.7, KSET.z + 0.2, judge === 'perfect' ? 14 : 7);
}

// 🧂 간 맞추기 — 누르고 있는 동안 소금통이 기울며 소금이 쏟아진다
export function mgSeasonPour(on) { if (kset) kset.pouring = !!on; }

export function mgSeasonDone(judge) {
  if (!kset) return;
  kset.pouring = false;
  if (judge !== 'miss') spawnSparkle(KSET.x, KSET.y + 1.6, KSET.z + 0.2, judge === 'perfect' ? 16 : 8);
}

// 무대 카메라 — 고정 좌표로 두면 **세로 화면에서 소품이 화면 밖으로 넘친다**.
//   three 의 fov 는 세로 화각이라 폰 세로(aspect ≈ 0.46)에선 가로만 좁아진다 →
//   냄비·그릇·팬이 화면 폭을 꽉 채우고 소금통·불꽃이 잘렸다. 가로 화각이 좁아진 만큼 뒤로 뺀다.
//   기준 aspect 1.55(데스크톱)에서 k=1 이라 가로 화면 그림은 예전 그대로다.
export function applyMgCamera() {
  if (mgView?.type === 'station' && nearStation) return applyStationCamera(nearStation);   // 🔥🫙 가공 시설 클로즈업 유지
  const k = Math.min(1.75, Math.max(1, 1.55 / (camera.aspect || 1.55)));
  camera.position.set(KSET.x + 0.15 * k, KSET.y + 1.15 + 1.4 * k, KSET.z + 3.55 * k);
  camera.lookAt(KSET.x, KSET.y + 1.15, KSET.z - 0.3);
}

// 🔥🫙 가공 시설 클로즈업 — 걸 때 화면을 그 시설로 옮긴다(요리·조각과 같은 문법).
//    부엌 무대(KSET)를 쓰지 않고 마을·텃밭에 선 그 시설을 그대로 비춘다.
//    세로 화면은 가로 화각만 좁아지므로 그만큼 뒤로 뺀다(applyMgCamera 와 같은 보정).
export let stationCamDist = 5;

export function applyStationCamera(rec) {
  const k = Math.min(1.75, Math.max(1, 1.55 / (camera.aspect || 1.55)));
  // 멀찍이 물러서 시설을 화면 **위쪽**에 두고 아래를 조작대 자리로 비운다.
  //   실측 3회로 잡은 값 — 2.35 는 상판이 화면을 덮었고, 5.2 는 앞의 나무가 화덕을 가렸다.
  //   🫙 발효통은 옆으로 길어(월드 1.9) 3.8 에선 통이 화면을 넘쳐 잘렸다 — 5.2 로 물러선다(실측 2026-09-21).
  //   lookAt 은 대상보다 **낮게** 잡아야 대상이 화면 위로 올라간다(통 중심 y 1.2 → 0.95).
  const far = rec.id === 'vat' ? 4.7 : 3.8, aim = rec.id === 'vat' ? 0.95 : 1.25;
  stationCamDist = far * k;
  camera.position.set(rec.x + (rec.id === 'vat' ? 0 : 0.1) * k, 1.95 + 0.35 * k, rec.z + far * k);   // 🫙 는 옆으로 길어 가운데서 본다
  camera.lookAt(rec.x, aim, rec.z);
}

// 클로즈업 중 카메라와 화덕 사이에 선 것들을 잠깐 숨긴다.
//   마을 한복판이라 나무·장식이 화덕을 가린다(요리·조각 무대엔 없던 문제).
//   안개로는 못 지운다 — 가리는 것이 화덕보다 **카메라 쪽**에 있어 더 가깝기 때문이다.
export let kilnHidden = [];

export function hideKilnOccluders(rec, on) {
  if (!on) { for (const o of kilnHidden) o.visible = true; kilnHidden = []; return; }
  const camZ = rec.z + 5.0;                      // 카메라 거리(3.8)보다 넉넉히
  const between = (p) => p.z > rec.z + 0.7 && p.z < camZ && Math.abs(p.x - rec.x) < 4.5;   // 3.2 로는 화면 가장자리 나무가 남았다
  for (const t of trees) if (t.visible && between(t.position)) { t.visible = false; kilnHidden.push(t); }
  for (const m of outdoorMeshes) {
    if (m.userData.rec === rec) continue;         // 시설 자신은 둔다
    if (m.visible && between(m.position)) { m.visible = false; kilnHidden.push(m); }
  }
}

// ⚫ 불 조절 중 실제 화덕의 불이 바늘을 따라 반응한다 — 화면에 화덕이 보이니
//    바에서만 움직이면 심심하다. v: 0(사그라듦) ~ 1(활활)
export function kilnFireOf(rec) {
  const st = outdoorMeshes.find(m => m.userData.rec === rec)?.userData.station;
  return st?.fire ? st : null;                 // 🫙 발효통엔 불이 없다
}

export function craftFlame(v) {
  const k = nearStation && kilnFireOf(nearStation); if (!k) return;
  k.fire.visible = true;
  //   1.05 배까지 키우니 불기둥이 조작대를 침범했다 — 0.75 로 줄인다(2026-09-20 실측)
  const s = 0.45 + Math.max(0, Math.min(1, v)) * 0.75;
  k.fire.scale.set(0.85 + s * 0.25, s, 0.85 + s * 0.25);      // 세로로 자라고 가로는 덜 퍼진다
}

export function craftFlameBurst(good) {
  const k = nearStation && kilnFireOf(nearStation); if (!k) return;
  if (good) {
    k.fire.scale.set(1.2, 1.45, 1.2);
    spawnSparkle(nearStation.x, 1.05, nearStation.z + 0.5, 16);
    Sound.blip?.();
  } else {
    k.fire.scale.set(0.7, 0.35, 0.7);                          // 사그라든다
  }
}

export function craftStomp() {
  if (!nearStation) return;
  spawnSparkle(nearStation.x, 1.0, nearStation.z + 0.7, 10);
  Sound.blip?.();
}

export function stationSign(rec, visible) {
  const sign = outdoorMeshes.find(m => m.userData.rec === rec)?.userData.sign;
  if (sign) sign.visible = visible;
}

export function craftFocus(on) {
  if (on && nearStation) {
    $w.mgView = { type: 'station' };
    player.visible = false;      // 마을에 선 시설이라 캐릭터가 카메라와 시설 사이를 가린다(요리 무대엔 없던 문제)
    hideKilnOccluders(nearStation, true);
    stationSign(nearStation, false);
    applyStationCamera(nearStation);
  } else if (!on) {
    const k = nearStation && kilnFireOf(nearStation);
    if (k) k.fire.scale.set(1, 1, 1);        // 미니게임에서 키운 불을 되돌린다
    hideKilnOccluders(null, false);
    if (nearStation) stationSign(nearStation, true);
    $w.mgView = null; player.visible = true; snapCamera();
    refreshStations();                          // 불·상판을 슬롯 상태에 맞게 다시 맞춘다
  }
  return !!mgView;
}

export function mgSceneEnd() {
  if (kset) kset.group.visible = false;
  $w.mgView = null;
  snapCamera();                                             // 마을 카메라 복귀
}

// 리듬 노트 위치 동기화 — ps[i] = { p: 진행도(0=출발 1=칼 아래), s: 0진행 1처리됨 2미스 }
export const CHOP_X0 = 3.4, CHOP_X1 = -0.35;

export function mgChopFrame(ps) {
  if (!kset || !mgView) return;
  ps.forEach((st, i) => {
    const sp = kset.notes[i]; if (!sp) return;
    if (st.s === 1) { sp.visible = false; return; }         // 썰린 노트는 조각 연출로 대체
    sp.visible = st.p > 0;
    sp.position.x = CHOP_X0 + (CHOP_X1 - CHOP_X0) * st.p;
    if (st.s === 2) { sp.material.opacity = 0.28; sp.material.color?.set?.(0x777777); }
  });
}

// 칼질 명중 — 칼 내려찍기 + 재료 반쪽 두 개가 튀어오름 + 반짝이
export function mgChopHit(i, judge) {
  if (!kset) return;
  kset.knifeT = 0;
  const sp = kset.notes[i];
  const px = sp ? sp.position.x : CHOP_X1;
  for (const dir of [-1, 1]) {
    const half = emojiSprite(sp?.material.map ? '' : '🥕', 0.34);
    if (sp) { half.material.map = sp.material.map; half.material.needsUpdate = true; }
    half.position.set(px, 1.24, 0.75);
    kset.group.add(half);
    kset.fx.push({ sp: half, vx: dir * (0.9 + Math.random() * 0.4), vy: 1.6 + Math.random() * 0.6, life: 0.55 });
  }
  spawnSparkle(KSET.x + px, KSET.y + 1.3, KSET.z + 0.75, judge === 'perfect' ? 14 : 7);
}

// 끓이기 탭 연출 — 단계별(재료 퐁당 / 국자 젓기 / 불길 활활)
export function mgPotHit(step, judge, ico) {
  if (!kset) return;
  if (step === 0) {
    if (kset.drop) kset.drop.parent?.remove(kset.drop);
    kset.drop = emojiSprite(ico || '🥕', 0.34);
    kset.drop.position.set(0, 2.6, 0.05);
    kset.potGroup.add(kset.drop); kset.dropT = 0;
  } else if (step === 1) kset.ladleT = 0;
  else kset.flareT = 0.55;
  if (judge !== 'miss') spawnSparkle(KSET.x, KSET.y + 1.9, KSET.z + 0.4, judge === 'perfect' ? 14 : 7);
}

// 매 프레임 — 무대 연출(카메라 고정·거품·김·불·칼/국자 트윈·조각 물리)
export function updateMgScene(dt, t) {
  if (!mgView) return;
  if (mgView.type === 'carve') { updateCarveScene(dt, t); return; }  // 🗿 조각 공방 무대는 전용 루프
  if (mgView.type === 'station') return;                             // 🔥🫙 가공 시설은 선 자리 그대로를 비춘다(부엌 소품 없음)
  if (!kset) return;
  applyMgCamera();                                          // 다른 카메라 로직이 못 뺏게 매 프레임 고정
  // 김/거품/불/재료 — 냄비가 계속 "요리 중"으로 보이게
  for (const b of kset.bubbles) {
    b.position.y += dt * 0.35;
    if (b.position.y > 1.78) { b.position.y = 1.66; b.position.x = (Math.random() - 0.5) * 0.6; }
  }
  for (const s of kset.steam) {
    const ph = ((t * 0.55 + s.userData.ph) % 1.4) / 1.4;
    s.position.y = 1.85 + ph * 0.75;
    s.material.opacity = ph < 0.25 ? ph * 2.4 : (1 - ph) * 0.8;
  }
  kset.flames.forEach((f, i) => {
    const boost = kset.flareT > 0 ? 1.5 : 1;
    f.scale.y = 0.3 * boost * (1 + 0.18 * Math.sin(t * 13 + i * 2.1));
    f.scale.x = 0.3 * boost;
  });
  if (kset.flareT > 0) kset.flareT -= dt;
  kset.light.intensity = 1.15 + (kset.flareT > 0 ? 0.6 : 0) + 0.05 * Math.sin(t * 11);
  kset.foods.children.forEach((f, i) => { f.position.y = 0.02 + 0.02 * Math.sin(t * 2.4 + f.userData.ph); });
  // 🔪 칼 내려찍기 트윈(0~0.1 내려감 → 0.35 복귀)
  if (kset.knifeT >= 0) {
    kset.knifeT += dt;
    const k = kset.knifeT;
    kset.knife.rotation.z = k < 0.1 ? 0.42 - (k / 0.1) * 0.47 : k < 0.35 ? -0.05 + ((k - 0.1) / 0.25) * 0.47 : 0.42;
    if (k >= 0.35) kset.knifeT = -1;
  }
  // 🥄 국자 젓기(원 궤적)
  if (kset.ladleT >= 0) {
    kset.ladleT += dt;
    const a = (kset.ladleT / 0.7) * Math.PI * 2;
    kset.ladle.position.set(Math.cos(a) * LADLE_R, 1.65, 0.05 + Math.sin(a) * LADLE_R);
    kset.ladle.rotation.y = -a;                                                   // 손잡이가 궤적 바깥을 향하게 같이 회전
    if (kset.ladleT >= 0.7) { kset.ladleT = -1; kset.ladle.rotation.y = 0; kset.ladle.position.set(LADLE_R, 1.65, 0.05); }
  }
  // 🧺 재료 퐁당(냄비 속으로 낙하 → 반짝)
  if (kset.dropT >= 0 && kset.drop) {
    kset.dropT += dt;
    kset.drop.position.y = 2.6 - (kset.dropT / 0.45) * 0.95;
    if (kset.dropT >= 0.45) {
      kset.drop.parent?.remove(kset.drop); kset.drop = null; kset.dropT = -1;
      spawnSparkle(KSET.x, KSET.y + 1.72, KSET.z + 0.3, 8);
    }
  }
  // 반쪽 조각 물리(포물선 + 페이드)
  for (let i = kset.fx.length - 1; i >= 0; i--) {
    const f = kset.fx[i];
    f.sp.position.x += f.vx * dt; f.sp.position.y += f.vy * dt;
    f.vy -= 6 * dt; f.life -= dt;
    f.sp.material.opacity = Math.max(0, f.life / 0.55);
    if (f.life <= 0) { f.sp.parent?.remove(f.sp); kset.fx.splice(i, 1); }
  }
  // 🔥 굽기 — 불꽃 일렁임 + 뒤집기 포물선 + "타는 정도" 를 색으로. 실패가 눈에 남아야 다음 판에 조심한다
  if (mgView.type === 'grill') {
    kset.grillFlames.forEach((f, i) => {
      const boost = kset.flareT > 0 ? 1.5 : 1;
      f.scale.set(0.3 * boost, 0.3 * boost * (1 + 0.2 * Math.sin(t * 12 + i * 1.9)), 1);
    });
    const food = kset.grillFood.children[0];
    if (food) {
      if (kset.flipT >= 0) {
        kset.flipT += dt;
        const k = Math.min(1, kset.flipT / 0.42);
        food.position.y = Math.sin(k * Math.PI) * 0.5;                      // 공중으로 떴다 내려앉음
        food.material.rotation = k * Math.PI;                               // 스프라이트를 반 바퀴
        if (k >= 1) { kset.flipT = -1; food.position.y = 0; food.material.rotation = 0; }
      } else {
        food.position.y = 0.02 * Math.sin(t * 3);
      }
      const b = 1 - kset.burn * 0.75;                                       // 탈수록 어두워짐
      food.material.color.setRGB(b, b * 0.94, b * 0.88);
    }
  }
  // 🧂 간 맞추기 — 누르는 동안 소금통이 기울고 소금이 떨어진다(떼면 곧 멎음)
  if (mgView.type === 'season') {
    const want = kset.pouring ? -1.05 : 0;
    kset.shaker.rotation.z += (want - kset.shaker.rotation.z) * Math.min(1, dt * 12);
    kset.saltT += dt;
    kset.saltBits.forEach((b, i) => {
      if (!b.visible) {
        if (kset.pouring && kset.saltT > i * 0.045) { b.visible = true; b.position.set(0.18 + (Math.random() - 0.5) * 0.14, 1.64, 0.05 + (Math.random() - 0.5) * 0.1); }
        return;
      }
      b.position.y -= dt * 2.2;
      if (b.position.y < 1.34) { b.visible = false; if (!kset.pouring) return; b.position.y = 1.64; b.visible = true; }
    });
  }
}
