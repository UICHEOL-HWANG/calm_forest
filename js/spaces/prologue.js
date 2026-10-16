// =============================================================
//  🎬 프롤로그 컷신 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
//  🌳 2026-10-16 세계관 개편 1단계: 회색 도시 세트 → 세계수 마을 세트(살아 있던 마을 → 시든 마을)
//     (docs/superpowers/specs/2026-10-16-world-tree-reworld-design.md §3, 사용자 수정 대본). 게임 로직은 그대로.
// =============================================================
import {
  $w, camera, gameState, handAnchor, player, playerAnchor, scene, sitting, snapCamera, stopOutdoorPlacing,
  ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

//    캐릭터 선택 직후 1회 재생. 실제 비디오가 아니라 인게임 세트(로우폴리 세계수 마을)로 연출해
//    번들 무게 0, 아트스타일 통일, 선택한 캐릭터가 그대로 출연한다. 자막/페이드/스킵은 index.html DOM.
//    세트는 마을에서 멀찍이(옛 도시 세트 자리) — 마을 안개 거리(74)보다 훨씬 밖이라 서로 안 보인다.
//    서사: 세계수 아래 사람·동물이 함께 살던 마을 → 세계수가 힘을 잃자 마을도 잿빛 → 바깥에서 온 주인공이
//          텅 빈 마을에 들어선다("아무도 없어요?") → 가지 끝 마지막 잎 곁에서 🦉 누군가 지켜본다.
export const WILT = new THREE.Vector3(0, 0, 480);

export let wiltSet = null;

export let intro = null;

// 🌳 세트 좌표(WILT 로컬) — 컷 카메라가 같은 값을 본다
const TRUNK = new THREE.Vector3(0, 0, -7);          // 세계수 밑동 중심
const LEAF = new THREE.Vector3(6.0, 8.55, -2.9);    // 마지막 잎이 매달린 가지 끝
const OWL = new THREE.Vector3(4.75, 8.12, -3.55);   // 🦉 마지막 잎 옆 가지에 앉은 올빼미
const WALK_FROM = new THREE.Vector3(1.1, 0, 17);    // 컷3 — 마을 어귀(남쪽)에서 걸어 들어온다
const WALK_TO = new THREE.Vector3(1.0, 0, 6.5);     //        마을 한가운데서 멈춘다
const LEAF_CAM = new THREE.Vector3(-1.3, 1.5, -1.5);   // 컷5 — 세계수 밑에서 가지 끝을 올려다보는 자리

// 부드러운 원형 텍스처(안개·빛 번짐 공용) — 캔버스 64px 하나
function softTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// 두 점을 잇는 가늘어지는 원기둥(가지·뿌리) — 6각 로우폴리
const _up = new THREE.Vector3(0, 1, 0);
function limb(g, mat, a, b, r0, r1) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 6), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(_up, d.normalize());
  g.add(m); return m;
}

// 세계수 마을 세트 — 전부 MeshBasicMaterial(무조명)·fog:false: 마을 낮/밤·날씨와 무관 + 모바일에서 가장 저렴.
//   라이트 0개. "살아 있음 → 시듦"은 재질 색 lerp(따뜻한 색 → 잿빛) 한 줄로 처리한다(tints, setWither).
export function buildWiltSet() {
  if (wiltSet) return;
  const tints = [];                                    // { m: 재질, a: 살아 있을 때 색, b: 시든 색 }
  const flat = (warm, grey, extra = {}) => {
    const m = new THREE.MeshBasicMaterial({ color: warm, fog: false, ...extra });
    tints.push({ m, a: new THREE.Color(warm), b: new THREE.Color(grey) }); return m;
  };
  const g = new THREE.Group(); g.position.copy(WILT);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);   // 고정 시드 — 매번 같은 나무
  // ☁️ 하늘 돔 — 살아 있을 땐 노을빛 하늘, 시들면 잿빛. 정점색 두 벌을 들고 있다가 섞는다
  const domeGeo = new THREE.SphereGeometry(95, 16, 12);
  const pos = domeGeo.attributes.position, n = pos.count;
  const skyA = new Float32Array(n * 3), skyB = new Float32Array(n * 3), cc = new THREE.Color();
  const aLo = new THREE.Color(0xf6dcb0), aHi = new THREE.Color(0x8fc3e3), bLo = new THREE.Color(0x6b7076), bHi = new THREE.Color(0x2a2d33);
  for (let i = 0; i < n; i++) {
    const k = Math.sqrt(Math.max(0, Math.min(1, pos.getY(i) / 60)));
    cc.copy(aLo).lerp(aHi, k); skyA.set([cc.r, cc.g, cc.b], i * 3);
    cc.copy(bLo).lerp(bHi, k); skyB.set([cc.r, cc.g, cc.b], i * 3);
  }
  domeGeo.setAttribute('color', new THREE.BufferAttribute(skyA.slice(), 3));
  g.add(new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  // 🌤️ 따뜻한 햇살 번짐(세계수 뒤) — 시들면 꺼진다
  const tex = softTex();
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffe2a0, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
  sun.position.set(2, 12, -30); sun.scale.setScalar(34); g.add(sun);
  // 🌱 땅 + 얼룩 + 마을 길 + 풀(인스턴스 1드로)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(95, 24), flat(0x86b06a, 0x4a4c50)); ground.rotation.x = -Math.PI / 2; g.add(ground);
  const patchM = flat(0x79a35f, 0x404246);
  [[-4, 6, 5], [7, 3, 4], [-13, -4, 6], [12, -9, 5], [2, -12, 7]].forEach(([x, z, r]) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 10), patchM); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z); g.add(p);
  });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 30), flat(0xd8c39a, 0x56575b)); path.rotation.x = -Math.PI / 2; path.position.set(1, 0.02, 10); g.add(path);
  const tuftN = 70, tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.5, 3), flat(0x5f9a4e, 0x6e675e), tuftN), dm = new THREE.Object3D();
  for (let i = 0; i < tuftN; i++) {
    const a = rnd() * Math.PI * 2, r = 3.5 + rnd() * 18;
    dm.position.set(Math.cos(a) * r, 0.2, Math.sin(a) * r * 0.8 + 1);
    if (Math.abs(dm.position.x - 1) < 2.2 && dm.position.z > -3) dm.position.x += dm.position.x > 1 ? 3 : -3;   // 길 위는 비운다
    dm.rotation.set((rnd() - 0.5) * 0.9, 0, (rnd() - 0.5) * 0.9);
    dm.scale.setScalar(0.6 + rnd() * 0.8); dm.updateMatrix(); tufts.setMatrixAt(i, dm.matrix);
  }
  g.add(tufts);
  // 🌳 세계수 — 굽은 밑동 + 굵은 가지 6 → 잔가지 → 끝가지. 가지 끝마다 잎 뭉치(시들면 오그라들어 사라진다)
  const bark = flat(0x6e5440, 0x4b443f), barkD = flat(0x5a4434, 0x3d3733);
  const leafM = flat(0x6cc06a, 0x77786f);
  const clumps = [];
  const clump = (at, r) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafM);
    m.position.copy(at); m.rotation.set(rnd() * 3, rnd() * 3, 0); g.add(m);
    clumps.push({ m, lag: rnd() * 0.35 });
  };
  const t0 = TRUNK.clone(), t1 = TRUNK.clone().add(new THREE.Vector3(0.5, 5, 0.2)), t2 = TRUNK.clone().add(new THREE.Vector3(-0.2, 9.5, 0));
  limb(g, bark, t0.clone().setY(-0.3), t1, 2.5, 1.75); limb(g, bark, t1, t2, 1.75, 1.15);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.3, 1.2, 7), barkD); base.position.copy(TRUNK).setY(0.5); g.add(base);
  [12, 40, 100, 145, 200, 255, 315].forEach((deg) => {   // 뿌리
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), L = 4.2 + rnd() * 1.4;
    limb(g, barkD, new THREE.Vector3(TRUNK.x + c * 2.0, 0.9, TRUNK.z + s * 2.0), new THREE.Vector3(TRUNK.x + c * L, 0.05, TRUNK.z + s * L), 0.75, 0.16);
  });
  const branch = (from, dir, len, r0, depth) => {
    const to = from.clone().addScaledVector(dir.clone().normalize(), len);
    limb(g, depth ? bark : barkD, from, to, r0, r0 * 0.5);
    if (depth >= 1) clump(to, depth === 1 ? 1.5 + rnd() * 0.5 : 1.0 + rnd() * 0.4);
    if (depth >= 2) return;
    const k = depth === 0 ? 3 : 2;
    for (let i = 0; i < k; i++) {
      const d2 = dir.clone().normalize();
      d2.x += (rnd() - 0.5) * 1.3; d2.z += (rnd() - 0.5) * 1.3; d2.y += 0.25 + rnd() * 0.4;
      branch(to, d2, len * (0.5 + rnd() * 0.15), r0 * 0.5, depth + 1);
    }
  };
  [[-1, 0.7, 0.1, 7.6], [1, 0.8, -0.3, 8.2], [-0.4, 1, -0.9, 9.3], [0.5, 1, 0.6, 9.3], [-0.9, 0.5, -0.7, 6.8], [0.9, 0.55, -0.9, 7.2]]
    .forEach(([dx, dy, dz, h]) => branch(TRUNK.clone().add(new THREE.Vector3(0, h, 0)), new THREE.Vector3(dx, dy, dz), 5.2 + rnd() * 1.5, 0.75, 0));
  clump(TRUNK.clone().add(new THREE.Vector3(0, 11, 0)), 3.2);   // 우듬지 가운데
  // 🌿 마지막 잎이 매달린 가지 — 컷5 카메라에서 하늘을 등지고 보이도록 따로 낮게 뻗는다
  const lb0 = TRUNK.clone().add(new THREE.Vector3(1.0, 6.0, 0.9)), lb1 = new THREE.Vector3(4.4, 7.9, -3.7);
  limb(g, bark, lb0, lb1, 0.5, 0.22); limb(g, bark, lb1, LEAF.clone().add(new THREE.Vector3(0, 0.15, 0)), 0.22, 0.05);
  limb(g, bark, lb1, new THREE.Vector3(5.2, 9.6, -4.6), 0.16, 0.04);
  clump(new THREE.Vector3(5.3, 9.3, -3.8), 1.3);
  // 🦉 의뢰 올빼미 실루엣 — 몸·머리·귀깃 + 희미한 눈빛 2점(이쪽을 본다). 컷5에서만 보인다
  const owl = new THREE.Group(); owl.position.copy(OWL); owl.rotation.y = -0.9; owl.scale.setScalar(1.3);   // 컷5 카메라 쪽을 향함
  const owlM = new THREE.MeshBasicMaterial({ color: 0x2b2622, fog: false });
  const ob = new THREE.Mesh(new THREE.SphereGeometry(0.26, 7, 5), owlM); ob.scale.set(1, 1.25, 0.9); ob.position.y = 0.3; owl.add(ob);
  const oh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), owlM); oh.position.y = 0.68; owl.add(oh);
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), owlM); ear.position.set(s * 0.12, 0.88, 0); ear.rotation.z = -s * 0.35; owl.add(ear);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false }));
    eye.position.set(s * 0.075, 0.7, 0.185); owl.add(eye);
  });
  owl.visible = false; g.add(owl);
  // 🏠 마을 집들 — 살아 있을 땐 크림색 벽·붉은 지붕·창에 불, 시들면 잿빛·불 꺼진 빈집
  const wall = flat(0xead6b4, 0x47464b), roofM = flat(0xc4664c, 0x302d30), door = flat(0x7a5236, 0x18191c);
  const win = flat(0xffd98a, 0x18191c), frame = flat(0x8a6a4e, 0x5d5e64);
  const house = (x, z, ry, sc) => {
    const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; h.scale.setScalar(sc);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 2.4), wall); body.position.y = 1; h.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.25, 1.4, 4), roofM); roof.position.y = 2.7; roof.rotation.y = Math.PI / 4; h.add(roof);
    const dr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1), door); dr.position.set(-0.6, 0.55, 1.21); h.add(dr);
    const wn = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.6), win); wn.position.set(0.55, 1.2, 1.21); h.add(wn);
    const bar1 = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.6), frame); bar1.position.set(0.55, 1.2, 1.215); h.add(bar1);
    const bar2 = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.05), frame); bar2.position.set(0.55, 1.2, 1.215); h.add(bar2);
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), roofM); chim.position.set(0.7, 2.9, -0.3); h.add(chim);
    g.add(h); return h;
  };
  house(-6.5, 1.5, 0.95, 1); house(6.8, 0.5, -0.95, 1);         // 길 양옆(컷4 — 불 꺼진 빈집)
  house(-5.8, 20, 2.6, 0.95); house(7.4, 21.5, -2.5, 0.95);     // 마을 어귀(컷3 배경 — 걸어오는 주인공 뒤로 보인다)
  house(-15, -4, 0.4, 0.9); house(14, -8, -0.4, 0.85); house(-6, -15, 0.1, 0.8);
  // 울타리 말뚝(어귀)
  for (let i = 0; i < 5; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), barkD);
    post.position.set(-3.6 + i * 0.6, 0.38, 19.5 - i * 0.1); post.rotation.z = i % 2 ? 0.12 : -0.06; g.add(post);
  }
  // 👨‍👩‍👧 세계수 아래 사람·동물 실루엣(컷1) — 시들면 사라진다(재질 투명도)
  const folkM = new THREE.MeshBasicMaterial({ color: 0x4a3a2e, fog: false, transparent: true, opacity: 1 });
  const folks = [];
  [[-3.4, 0.6, 1.0, 0], [-1.9, 1.6, 0.7, 1], [3.2, 1.0, 0.95, 0], [4.6, 0.2, 0.6, 1], [-5.0, -0.6, 0.55, 1], [0.9, 2.2, 0.75, 0]].forEach(([x, z, sc, animal], i) => {
    const f = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.62, 7), folkM); body.position.y = 0.32; f.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 7, 5), folkM); head.position.y = 0.8; f.add(head);
    if (animal) [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), folkM); e.position.set(s * 0.1, 1.0, 0); f.add(e); });
    f.position.set(x, 0, z); f.scale.setScalar(sc * 1.6); g.add(f); folks.push({ f, ph: i * 1.3 });
  });
  // 🍂 지는 잎(컷2) — 잎 뭉치 근처에서 떨어져 땅에 눕는다. 재질 하나 공유
  const fallM = new THREE.MeshBasicMaterial({ color: 0x6cc06a, fog: false, side: THREE.DoubleSide });
  const falls = [];
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), fallM);
    const src = clumps[(i * 5) % clumps.length].m.position;
    const p0 = src.clone().add(new THREE.Vector3((rnd() - 0.5) * 2, -0.5, (rnd() - 0.5) * 2));
    m.position.copy(p0); m.visible = false; g.add(m);
    falls.push({ m, p0, t0: 5.4 + rnd() * 3.2, spd: 1.6 + rnd() * 1.2, ph: rnd() * 6 });
  }
  // 🌫️ 떠도는 안개 — 시들수록 짙어진다
  const fogs = [];
  for (let i = 0; i < 16; i++) {
    const op = 0.22 + rnd() * 0.18;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xb4b9bf, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    const far = i >= 11;   // 뒤쪽 큰 안개 둑 — 세계수 밑동을 흐리게 감싼다
    s.position.set(-22 + rnd() * 44, far ? 2.5 + rnd() * 2 : 0.6 + rnd() * 1.8, far ? -16 - rnd() * 6 : -12 + rnd() * 26);
    s.scale.set(far ? 26 : 9 + rnd() * 7, far ? 8 : 2.6 + rnd() * 1.6, 1);
    g.add(s); fogs.push({ s, op, spd: (0.25 + rnd() * 0.35) * (rnd() < 0.5 ? -1 : 1) });
  }
  // 🌿 마지막 잎의 번짐(잎 모델은 introStart 에서 붙인다)
  const leafGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x9dffb0, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  leafGlow.position.copy(LEAF).add(new THREE.Vector3(0, -0.25, 0)); leafGlow.scale.setScalar(1.4); g.add(leafGlow);
  g.visible = false;
  scene.add(g);
  wiltSet = { group: g, tints, sky: { attr: domeGeo.attributes.color, a: skyA, b: skyB }, sun, clumps, folks, folkM, falls, fallM, fogs, owl, leafGlow, w: -1 };
}

// 🌫️ 시듦 정도 w(0 살아 있음 → 1 잿빛)를 세트 전체에 반영 — 같은 w 면 건너뛴다(정점색 갱신 아끼기)
const _fallA = new THREE.Color(0x6cc06a), _fallB = new THREE.Color(0x8a7f6c);
function setWither(w) {
  const S = wiltSet;
  if (Math.abs(S.w - w) < 0.002) return;
  S.w = w;
  for (const { m, a, b } of S.tints) m.color.copy(a).lerp(b, w);
  const { attr, a, b } = S.sky, arr = attr.array;
  for (let i = 0; i < arr.length; i++) arr[i] = a[i] + (b[i] - a[i]) * w;
  attr.needsUpdate = true;
  S.sun.material.opacity = 0.75 * (1 - w);
  for (const c of S.clumps) { const s = Math.max(0, 1 - Math.max(0, w * 1.35 - c.lag)); c.m.scale.setScalar(s); c.m.visible = s > 0.02; }
  S.folkM.opacity = Math.max(0, 1 - w * 1.8);
  for (const p of S.folks) p.f.visible = S.folkM.opacity > 0.01;
  S.fallM.color.copy(_fallA).lerp(_fallB, w);
  for (const f of S.fogs) f.s.material.opacity = f.op * (0.15 + 0.85 * w);
}

// 🌿 프롤로그 잎사귀 — 이모지 대신 직접 모델링한 로우폴리 잎. 이제는 "세계수의 마지막 잎"(잿빛 세트의 유일한 초록).
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

// 자막·컷 타이밍(초) — 5박자 ~22초 + 마을 도착·타이틀(~26초), 언제든 스킵 가능
//   첫 20초에 "세계수가 힘을 잃어 마을이 비었다"는 상황 + "누가 보고 있지?"라는 질문을 심는다 —
//   "목적이 뭔지 모르겠다" 베타 피드백. 분위기만 주고 끝내면 플레이어는 목표 없이 마을에 떨궈진다.
export const INTRO_CAPTIONS = [
  { at: 0.6, until: 5.0, text: '세계수 아래, 사람과 동물은 함께 살았다.' },
  { at: 5.6, until: 10.2, text: '그런데 세계수가 힘을 잃자, 마을도 기운을 잃었다.' },
  { at: 11.0, until: 15.0, text: '…여기가 그 마을인가?' },
  { at: 15.6, until: 19.0, text: '저기요… 아무도 없어요?' },
  { at: 19.5, until: 22.0, text: '…누군가 이쪽을 보고 있다.' },
];

export function introStart(force = false) {
  if (intro) return true;
  if (!force && gameState.hintsSeen.intro) return false;   // 첫 시작에만
  buildWiltSet();
  wiltSet.group.visible = true;
  setWither(0);
  intro = {
    t: 0, flags: {},
    savedPos: player.position.clone(),
    savedRotY: player.rotation.y,
  };
  // 주인공: 컷1·2(옛 마을 이야기)엔 아직 없다 — 컷3에서 마을 어귀로 걸어 들어온다
  $w.sitting = false; stopOutdoorPlacing(true);
  if (handAnchor) handAnchor.visible = false;               // 등의 도구(도끼 등)는 컷신 분위기상 숨김
  playerAnchor.position.y = 0; playerAnchor.rotation.x = 0; playerAnchor.rotation.z = 0;
  player.position.set(WILT.x + WALK_FROM.x, 0, WILT.z + WALK_FROM.z);
  player.rotation.y = Math.PI;                              // 마을 안쪽(북쪽, 카메라 쪽)을 향해 걷는다
  player.visible = false;
  // 🌿 세계수의 마지막 잎 — 가지 끝에 매달려 있다가 컷5에서 희미하게 빛난다(직접 모델링한 잎 재활용)
  intro.flyer = makeIntroLeaf();
  intro.flyer.position.copy(LEAF);
  intro.flyer.scale.setScalar(1.7);
  intro.flyer.rotation.set(0.25, -1.25, Math.PI);           // 거꾸로 매달림 · 잎면이 컷5 카메라 쪽
  intro.leafMat = intro.flyer.children[0].material;
  wiltSet.group.add(intro.flyer);
  wiltSet.owl.visible = false; wiltSet.leafGlow.material.opacity = 0;
  for (const f of wiltSet.falls) f.m.visible = false;
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
  player.visible = true;                                    // 컷1·2 숨김 복원
  playerAnchor.position.y = 0; playerAnchor.rotation.x = 0; playerAnchor.rotation.z = 0;
  if (handAnchor) handAnchor.visible = true;                // 도구 복원
  wiltSet.group.visible = false;
  if (intro.flyer) {
    wiltSet.group.remove(intro.flyer);
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

const smooth = (p) => { p = Math.max(0, Math.min(1, p)); return p * p * (3 - 2 * p); };
const _leafA = new THREE.Color(0x86d492), _leafDull = new THREE.Color(0x6f8a72), _leafLit = new THREE.Color(0xb4ffbf);

// 매 프레임 컷신 진행 — dt 누적 기반이라 프레임 드랍/저사양에서도 순서가 밀리지 않는다
export function updateIntro(dt, t) {
  if (!intro) return;
  const T = (intro.t += dt);
  const F = intro.flags;
  const W = WILT, S = wiltSet;
  // 자막
  const cap = INTRO_CAPTIONS.find(c => T >= c.at && T < c.until);
  ui.introCaption?.(cap ? cap.text : null);
  if (S.group.visible) {
    // 시듦: 컷2(5.4~10.0s) 동안 0 → 1. T 로만 정해지니 __introJump 로 건너뛰어도 어긋나지 않는다
    setWither(smooth((T - 5.4) / 4.6));
    for (const f of S.fogs) {                                          // 안개가 흐른다
      f.s.position.x += f.spd * dt;
      if (f.s.position.x > 24) f.s.position.x = -24;
      if (f.s.position.x < -24) f.s.position.x = 24;
    }
    for (const p of S.folks) p.f.position.y = Math.abs(Math.sin(t * 2.2 + p.ph)) * 0.04;   // 살아 있는 마을 — 사람·동물이 들썩
    for (const f of S.falls) {                                         // 🍂 지는 잎 — 하늘하늘 내려와 땅에 눕는다
      const k = T - f.t0;
      if (k < 0 || T > 15) { f.m.visible = false; continue; }
      f.m.visible = true;
      const y = Math.max(0.04, f.p0.y - k * f.spd);
      f.m.position.set(f.p0.x + Math.sin(k * 2 + f.ph) * 0.5, y, f.p0.z + Math.cos(k * 1.6 + f.ph) * 0.3);
      if (y > 0.05) f.m.rotation.set(Math.sin(k * 3 + f.ph), k * 2, Math.cos(k * 2.4));
      else f.m.rotation.set(-Math.PI / 2, 0, f.ph);
    }
    // 마지막 잎 — 시들며 빛바랬다가 컷5에서 희미하게 빛난다
    const lit = smooth((T - 19.2) / 1.4), pulse = 0.5 + 0.5 * Math.sin(T * 2.1);
    S.leafGlow.material.opacity = lit * (0.4 + pulse * 0.25);
    S.leafGlow.scale.setScalar(1.4 + lit * 0.6 + pulse * 0.15);
    intro.leafMat.color.copy(_leafA).lerp(_leafDull, Math.min(1, S.w * 1.2)).lerp(_leafLit, lit * (0.6 + 0.4 * pulse));
    intro.flyer.rotation.z = Math.PI + Math.sin(T * 1.3) * 0.12;
  }
  // ── 컷1 (0~5.4s): 살아 있는 세계수와 마을 와이드 → 느린 달리인 ──
  // ── 컷2 (5.4~10.6s): 같은 와이드에서 잎이 지고 마을이 잿빛으로, 사람·동물이 사라진다 ──
  if (T < 10.6) {
    const e = smooth(T / 10.6);
    introCam(W.x + TRUNK.x + 0.5, 7.6, W.z + TRUNK.z + 1,      // 잎 뭉치(우듬지)까지 화면에 — 가까이 잡으면 머리가 잘린다
      W.x + 2.2 - e * 1.6, 3.2 + e * 0.6, W.z + 31 - e * 4.5);   // 길 한가운데서 — 옆으로 비키면 어귀 집이 화면을 가린다
  }
  // ── 컷3 (10.6~15.2s): 바깥에서 온 주인공이 텅 빈 마을 어귀로 걸어 들어온다(카메라를 향해) ──
  else if (T < 15.2) {
    if (!F.walk) { F.walk = true; player.visible = true; player.rotation.y = Math.PI; }
    const p = Math.min(1, (T - 10.6) / 4.0);
    const px = W.x + WALK_FROM.x + (WALK_TO.x - WALK_FROM.x) * p, pz = W.z + WALK_FROM.z + (WALK_TO.z - WALK_FROM.z) * p;
    player.position.set(px, 0, pz);
    if (p < 1) {                                           // 걷기 — updatePlayer 의 걸음(통통 + 좌우 흔들)과 같은 식
      const ph = (T - 10.6) * 11;
      playerAnchor.position.y = Math.abs(Math.sin(ph)) * 0.18;
      playerAnchor.rotation.z = Math.sin(ph) * 0.05;
    } else { playerAnchor.position.y = 0; playerAnchor.rotation.z = 0; }
    introCam(px, 0.95, pz, px + 1.6, 1.7, pz - 4.8);        // 앞(마을 안쪽)에서 뒷걸음질하듯 따라간다
  }
  // ── 컷4 (15.2~19.2s): 불 꺼진 빈집들 — 주인공이 두리번 "아무도 없어요?" ──
  else if (T < 19.2) {
    if (!F.look) { F.look = true; player.visible = true; player.position.set(W.x + WALK_TO.x, 0, W.z + WALK_TO.z); playerAnchor.position.y = 0; playerAnchor.rotation.z = 0; }
    player.rotation.y = Math.PI + Math.sin((T - 15.2) * 1.25) * 0.95;   // 왼쪽 집 → 오른쪽 집
    const e = smooth((T - 15.2) / 4.0);
    const tx = W.x - 1.2, tz = W.z + 0.8;
    introCam(tx, 1.3, tz, tx + 4.6 - e * 0.8, 2.3 - e * 0.2, tz + 9.4 - e * 1.0);
  }
  // ── 컷5 (19.2~22.2s): 세계수 가지 끝 마지막 잎 — 그 곁에서 🦉 누군가 이쪽을 본다 ──
  //    잎이 높아 introCam(K 확대)을 쓰면 세로 화면에서 카메라가 땅속으로 내려간다 → 직접 배치
  else if (T < 22.2) {
    if (!F.owl) { F.owl = true; S.owl.visible = true; }
    const push = smooth((T - 19.2) / 3.0);
    const portrait = camera.aspect < 0.85 ? 1.6 : 0;          // 세로 화면은 뒤로 조금 더(수평 시야 좁음)
    camera.position.set(W.x + LEAF_CAM.x - portrait + push * 0.8, LEAF_CAM.y + push * 0.4, W.z + LEAF_CAM.z + portrait * 0.6);
    camera.lookAt(W.x + (LEAF.x + OWL.x) / 2, (LEAF.y + OWL.y) / 2 - 0.1, W.z + (LEAF.z + OWL.z) / 2);
    S.owl.rotation.y = -0.9 + Math.sin(T * 0.9) * 0.08;      // 고개를 아주 살짝 갸웃
  }
  // ── 컷6 (22.2s~): 화이트 페이드 → 지금의 숲 마을(원래 스폰 자리) → 타이틀 ──
  if (T >= 22.2 && !F.fade) { F.fade = true; ui.introFade?.(1); }
  if (T >= 23.4 && !F.arrive) {
    F.arrive = true;
    S.group.visible = false;
    player.visible = true;
    player.position.copy(intro.savedPos); player.position.y = 0;
    player.rotation.y = Math.PI;                             // 숲(마을 안쪽)을 바라봄
    playerAnchor.position.y = 0; playerAnchor.rotation.x = 0; playerAnchor.rotation.z = 0;
    ui.introFade?.(0);
  }
  if (T >= 23.4) {
    const ve = smooth((T - 23.4) / 2.4);
    const vx = intro.savedPos.x, vz = intro.savedPos.z;
    introCam(vx, 1.1, vz, vx + 0.5 - ve * 0.5, 3.4 - ve * 0.5, vz + 6.6 - ve * 1.3);
    playerAnchor.position.y = Math.sin(t * 2) * 0.02;
  }
  //   타이틀은 페이드가 걷히는 도중(1.15s 전환)에 들어온다 — 마을 색채 위에 로고
  if (T >= 23.7 && !F.title) { F.title = true; ui.introTitle?.(true); Sound.blip(); }
  if (T >= 25.2 && !F.titleOut) { F.titleOut = true; ui.introTitle?.(false); }
  if (T >= 25.8) introEnd(false);
}
