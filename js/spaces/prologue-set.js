// =============================================================
//  🎬 프롤로그 세트 — 세계수 마을(살아 있던 마을 → 시든 마을) 조형 + 시간에 따른 변화
//  ------------------------------------------------------------
//  js/spaces/prologue.js(타임라인·카메라·자막)가 buildIntroSet() 으로 세우고, 매 프레임 updateIntroSet(S, T, t) 로
//  시각 T(초)를 넘긴다. 상태는 전부 T 로만 정해진다(__introJump 로 건너뛰어도 어긋나지 않게).
//  ▶ 같은 세계수: js/world/tree-art.js 를 그대로 세워 setState({life, branches}) 로 꽃 핀 나무 → 시든 나무.
//  ▶ 진짜 이웃: js/spaces/npc.js buildNPCFigure 로 세운 몸을 정점색 한 메시로 구워(이웃당 드로우콜 1) 흩어지듯 사라지게.
//  ▶ 집: 마을 집 모델(js/house cottage)을 구워 한 메시(벽·지붕) + 창 한 메시(불빛 → 꺼짐).
//  ▶ 비용: 그림자 없음 · 라이트 추가 0(마을 라이트를 prologue.js introLook 이 잠시 빌려 쓴다) ·
//    입자는 Points/InstancedMesh 한 덩이씩. 전부 끝나면 disposeIntroSet 이 지오메트리·재질·텍스처를 버린다.
//  ▶ "시듦"은 공유 셰이더 유니폼 하나(uDesat — 채도 빼기 + 차가운 틴트)로 세트 전체에 한 번에 건다.
// =============================================================
import * as THREE from 'three';
import { buildTreeArt, LIMBS } from '../world/tree-art.js';
import { buildHouseModel } from '../house/index.js';
import { buildNPCFigure } from './npc.js';
import { NPCS } from '../data/npcs.js';
import { t as tr } from '../i18n.js';

const LIMBS_OPENING = Object.fromEntries(Object.entries(LIMBS).filter(([id]) => id !== 'snow'));

// ── 세트 좌표(WILT 로컬) ──
export const TREE = new THREE.Vector3(0, 0, -6);          // 세계수 밑동
export const WALK_FROM = new THREE.Vector3(1.5, 0, 29.5); // 컷3 — 마을 어귀(남쪽 아치 밖)
export const WALK_TO = new THREE.Vector3(0.5, 0, 9.2);    //        광장 앞에서 멈춘다
export const LOOK_SPOT = new THREE.Vector3(0.4, 0, 8.6);  // 컷4 — 두리번거리는 자리

// 광장에 모인 이웃(컷1) — [npc id, x, z, 사라지는 시각]
const FOLK = [
  ['farmer', -3.1, 1.6, 6.3], ['chef', -1.2, 3.1, 7.0], ['angler', 2.3, 1.4, 7.7],
  ['rancher', 3.9, 3.2, 8.3], ['curator', -4.9, 3.6, 8.9], ['ferryman', 0.9, 4.2, 9.4],
];
const HOUSES = [   // [x, z, 크기] — 광장을 둥글게 둘러 정면이 광장을 본다
  [-11.5, 1.5, 0.92], [11.8, 0.5, 0.92], [-13.5, -10, 0.9], [13.8, -11, 0.88],
  [-8.8, 14.5, 0.86], [9.6, 15.5, 0.86], [-4.5, -19.5, 0.8], [6.5, -20.5, 0.8], [-18.5, 8, 0.8], [19, 6.5, 0.8],
];
const LANTERNS = [[-6.6, 4.4], [6.4, 4.2], [-8.6, -4.8], [8.8, -5.2], [-4.6, 12.5], [6.0, 10.2], [-3.6, 25], [6.6, 26.5]];

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;

// ── 🌫️ 시듦 셰이더 패치 — 공유 유니폼(세트 전체가 같은 값을 본다) ──
const U = { uDesat: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) } };
function desat(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDesat = U.uDesat; sh.uniforms.uTint = U.uTint;
    sh.fragmentShader = 'uniform float uDesat;\nuniform vec3 uTint;\n' + sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l), uDesat) * uTint; }');
  };
  mat.customProgramCacheKey = () => 'introDesat';
  return mat;
}
const vcMat = (extra = {}) => desat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true, ...extra }));

// 부드러운 원 텍스처(번짐·안개·빛 알갱이 공용)
function softTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ── 굽기: 그룹 안 메시들을 재질 색 → 정점색 한 지오메트리로(드로우콜 1) ──
const _white = new THREE.Color(1, 1, 1);
function bake(root, { only = null, skip = null } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), rel = new THREE.Matrix4();
  const P = [], N = [], C = [];
  root.traverse((o) => {
    if (!o.isMesh || (only && !only(o)) || (skip && skip(o))) return;
    let g = o.geometry.clone().applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld));
    if (g.index) { const n = g.toNonIndexed(); g.dispose(); g = n; }
    if (o.material.flatShading || !g.attributes.normal) g.computeVertexNormals();   // 인덱스 없는 지오메트리 → 면 법선(각진 면)
    const c = o.material.color || _white, p = g.attributes.position, nm = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(nm.getX(i), nm.getY(i), nm.getZ(i)); C.push(c.r, c.g, c.b); }
    g.dispose();
  });
  return geoOf(P, N, C);
}
function geoOf(P, N, C) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
/** 지오메트리 여러 개(같은 속성)를 이어 붙인다 — 들어온 건 버린다 */
function concat(geos) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    let total = 0; for (const g of geos) total += g.attributes[name].array.length;
    const arr = new Float32Array(total); let off = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  for (const g of geos) g.dispose();
  out.computeBoundingSphere();
  return out;
}
function freeGroup(g) {   // 굽고 난 원본(임시 그룹) 정리
  g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
}
/** 색 하나짜리 조각 → 정점색 지오메트리(소품 굽기용) */
function piece(geo, hex, m4 = null) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  if (m4) g.applyMatrix4(m4);
  g.deleteAttribute('uv'); g.computeVertexNormals();
  const c = new THREE.Color(hex), n = g.attributes.position.count, C = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  return g;
}
const M4 = (x, y, z, ry = 0, s = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));

// ── 땅 높이: 광장·마을은 평평, 멀리는 낮은 언덕이 둘러싼다 ──
export function groundY(x, z) {
  const r = Math.hypot(x, z - 2);
  const k = smooth((r - 26) / 34);
  const n = Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.09 - 0.4) + 0.5 * Math.sin(x * 0.23 - z * 0.17);
  return k * (4.5 + n * 3.2) + (1 - k) * 0;
}
/** 길(남쪽 아치 → 광장) 중심선 */
const PATH = new THREE.CatmullRomCurve3([new THREE.Vector3(1.8, 0, 34), new THREE.Vector3(1.3, 0, 24), new THREE.Vector3(0.6, 0, 15), new THREE.Vector3(0.2, 0, 8), new THREE.Vector3(0, 0, 2)]);
const PATH_PTS = PATH.getSpacedPoints(60);
function pathDist(x, z) { let d = 1e9; for (const p of PATH_PTS) d = Math.min(d, Math.hypot(p.x - x, p.z - z)); return d; }

// ─────────────────────────────────────────────────────────────
export function buildIntroSet() {
  seed = 11;
  const g = new THREE.Group(); g.name = 'introSet';
  const disposables = [];   // 텍스처 등 지오메트리·재질 밖의 것
  const tex = softTex(); disposables.push(tex);

  // ☁️ 하늘 — 3단 그라데이션 + 해 번짐(셰이더 유니폼만 바꿔 황금빛 → 잿빛 푸른 해질녘)
  const sky = {
    top: new THREE.Color(), mid: new THREE.Color(), bot: new THREE.Color(), sun: new THREE.Color(),
    dir: new THREE.Vector3(-0.62, 0.16, -0.77).normalize(), amt: { value: 1 },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: sky.top }, uMid: { value: sky.mid }, uBot: { value: sky.bot }, uSun: { value: sky.sun }, uDir: { value: sky.dir }, uAmt: sky.amt },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uMid, uBot, uSun, uDir; uniform float uAmt; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = h > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.5, h)) : mix(uMid, uBot, smoothstep(0.0, -0.12, h));
        float s = max(dot(d, uDir), 0.0);
        c += uSun * (pow(s, 380.0) * 2.4 + pow(s, 24.0) * 0.55 + pow(s, 4.0) * 0.18) * uAmt;
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(96, 32, 16), skyMat);
  dome.renderOrder = -10; dome.frustumCulled = false; g.add(dome);

  // 🌱 땅 — 낮은 폴리 지형(면마다 색), 멀리 언덕
  {
    const geo = new THREE.PlaneGeometry(200, 200, 64, 64).rotateX(-Math.PI / 2).toNonIndexed();
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)));
    const C = new Float32Array(p.count * 3), c = new THREE.Color();
    const GR = [0x8fbf5f, 0x84b858, 0x99c766, 0x7cae54], HILL = [0x6f9f52, 0x79a958, 0x668f4c];
    for (let f = 0; f < p.count; f += 3) {
      const x = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, z = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
      const y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
      c.setHex(y > 1.2 ? HILL[Math.floor(rnd() * 3)] : GR[Math.floor(rnd() * 4)]);
      for (let k = 0; k < 3; k++) C.set([c.r, c.g, c.b], (f + k) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, vcMat()));
  }
  // 🟫 길 + 광장(흙) — 가장자리가 들쭉날쭉한 띠, 땅보다 살짝 위
  {
    const parts = [];
    const L = PATH_PTS.length, P = [];
    for (let i = 0; i < L; i++) {
      const a = PATH_PTS[i], b = PATH_PTS[Math.min(L - 1, i + 1)], c0 = PATH_PTS[Math.max(0, i - 1)];
      const tx = b.x - c0.x, tz = b.z - c0.z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      const w = 1.25 + (rnd() - 0.5) * 0.35;
      P.push([a.x + nx * w, a.z + nz * w], [a.x - nx * w * (0.9 + rnd() * 0.2), a.z - nz * w * (0.9 + rnd() * 0.2)]);
    }
    const pos = [];
    for (let i = 0; i < L - 1; i++) {
      const [l0, r0] = [P[i * 2], P[i * 2 + 1]], [l1, r1] = [P[i * 2 + 2], P[i * 2 + 3]];
      pos.push(l0[0], 0.03, l0[1], r0[0], 0.03, r0[1], l1[0], 0.03, l1[1], r0[0], 0.03, r0[1], r1[0], 0.03, r1[1], l1[0], 0.03, l1[1]);
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    parts.push(piece(pg, 0xdcc395));
    const plaza = new THREE.CircleGeometry(9.6, 30).rotateX(-Math.PI / 2);
    { const q = plaza.attributes.position; for (let i = 1; i < q.count; i++) { const k = i === q.count - 1 ? 1 : 0.9 + rnd() * 0.16; q.setXYZ(i, q.getX(i) * k, 0.025, q.getZ(i) * k); } q.setY(0, 0.025); }
    parts.push(piece(plaza, 0xe2cc9f, M4(0, 0, -3.2)));
    // 디딤돌·자갈
    for (let i = 0; i < 26; i++) {
      const u = rnd(), a = PATH.getPointAt(Math.min(0.97, u)), s = 0.22 + rnd() * 0.25;
      parts.push(piece(new THREE.DodecahedronGeometry(s, 0), rnd() < 0.5 ? 0xbdb6a6 : 0xcfc8b8, M4(a.x + (rnd() < 0.5 ? -1 : 1) * (1.35 + rnd() * 0.5), 0.02, a.z, rnd() * 3, 1, 0, 0).multiply(new THREE.Matrix4().makeScale(1, 0.35, 1))));
    }
    g.add(new THREE.Mesh(concat(parts), vcMat({ polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
  }

  // 🌳 세계수 — 마을과 같은 조형
  const art = buildTreeArt(THREE, { label: tr('세계수'), limbs: LIMBS_OPENING });
  art.group.position.copy(TREE);
  g.add(art.group);
  const leafMats = [art.crown.material, ...Object.values(art.clusters).map(c => c.mesh.material)];
  art.group.traverse((o) => {
    o.castShadow = false; o.receiveShadow = false;
    if (o.isMesh && o.material.isMeshStandardMaterial) desat(o.material);
  });

  // 🏠 집 — 마을 코티지를 한 번 세워 굽고, 자리마다 복사해 한 메시로
  const houseMats = {};
  {
    const cot = buildHouseModel(THREE, 3);
    const body = bake(cot, { skip: o => o.userData.role === 'window' });
    const win = bake(cot, { only: o => o.userData.role === 'window' });
    freeGroup(cot);
    const bodies = [], wins = [];
    for (const [x, z, s] of HOUSES) {
      const ry = Math.atan2(0 - x, -2 - z) + (rnd() - 0.5) * 0.25;   // 정면(+z)이 광장을 본다
      const m = M4(x, groundY(x, z), z, ry, s);
      bodies.push(body.clone().applyMatrix4(m)); wins.push(win.clone().applyMatrix4(m));
    }
    body.dispose(); win.dispose();
    g.add(new THREE.Mesh(concat(bodies), houseMats.body = vcMat({ flatShading: false })));
    houseMats.win = desat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: 0xffb257, emissiveIntensity: 1.4 }));
    g.add(new THREE.Mesh(concat(wins), houseMats.win));
  }

  // 🏮 등불 기둥 · 울타리 · 어귀 아치 · 깃발 줄 (한 메시) + 등불 유리(한 메시, 불빛) + 번짐(Points)
  const lamp = {};
  {
    const parts = [], glass = [], glowP = [];
    const WOOD = 0x7a5838, WOOD2 = 0x936a46, DARK = 0x4a3a2c;
    for (const [x, z] of LANTERNS) {
      parts.push(piece(new THREE.CylinderGeometry(0.07, 0.09, 2.3, 6), WOOD, M4(x, 1.15, z)));
      parts.push(piece(new THREE.BoxGeometry(0.62, 0.07, 0.07), WOOD, M4(x + 0.25, 2.22, z)));
      parts.push(piece(new THREE.ConeGeometry(0.27, 0.2, 4), DARK, M4(x + 0.5, 2.0, z, Math.PI / 4)));
      parts.push(piece(new THREE.BoxGeometry(0.3, 0.05, 0.3), DARK, M4(x + 0.5, 1.6, z)));
      glass.push(piece(new THREE.BoxGeometry(0.26, 0.34, 0.26), 0xffe6b0, M4(x + 0.5, 1.78, z)));
      glowP.push(x + 0.5, 1.78, z);
    }
    // 울타리·어귀 아치 — 따로 한 메시(컷3부터만 보인다: 세로 화면 크레인이 어귀 너머까지 물러나도 앞을 막지 않게)
    const gate = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const a = PATH.getPointAt(0.08 + i * 0.045), x = a.x + side * 2.3, z = a.z;
        gate.push(piece(new THREE.BoxGeometry(0.13, 0.85, 0.13), WOOD2, M4(x, 0.42, z, 0, 1, 0, (rnd() - 0.5) * 0.12)));
        if (i < 5) {
          const b = PATH.getPointAt(0.08 + (i + 1) * 0.045), bx = b.x + side * 2.3, len = Math.hypot(bx - x, b.z - z);
          gate.push(piece(new THREE.BoxGeometry(0.07, 0.09, len), WOOD, M4((x + bx) / 2, 0.62, (z + b.z) / 2, Math.atan2(bx - x, b.z - z))));
          gate.push(piece(new THREE.BoxGeometry(0.07, 0.09, len), WOOD, M4((x + bx) / 2, 0.32, (z + b.z) / 2, Math.atan2(bx - x, b.z - z))));
        }
      }
    }
    // 어귀 아치
    const A = PATH.getPointAt(0.2);
    for (const s of [-1, 1]) gate.push(piece(new THREE.CylinderGeometry(0.16, 0.2, 3.1, 7), WOOD, M4(A.x + s * 1.9, 1.55, A.z)));
    gate.push(piece(new THREE.BoxGeometry(4.6, 0.26, 0.3), WOOD2, M4(A.x, 3.05, A.z, 0, 1, 0, 0.02)));
    gate.push(piece(new THREE.BoxGeometry(4.2, 0.14, 0.22), DARK, M4(A.x, 2.72, A.z)));
    // 깃발 줄 — 등불 기둥 사이에 처진 줄 + 삼각 깃발
    const FLAG = [0xf2a5c1, 0xffd54f, 0x8fd0e8, 0xc8a6ec, 0xffffff];
    const garland = (a, b, sag) => {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n, x = lerp(a[0], b[0], k), z = lerp(a[2], b[2], k), y = lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * sag;
        const ry = Math.atan2(b[0] - a[0], b[2] - a[2]) + Math.PI / 2;
        const sh = new THREE.Shape(); sh.moveTo(-0.16, 0); sh.lineTo(0.16, 0); sh.lineTo(0, -0.34); sh.closePath();
        const fg = piece(new THREE.ShapeGeometry(sh), FLAG[i % FLAG.length], M4(x, y, z, ry));
        // 양면이 보이게 뒤집은 면을 하나 더
        const back = fg.clone(); const ar = back.attributes.position.array;
        for (let v = 0; v < ar.length; v += 9) for (let q = 0; q < 3; q++) { const t0 = ar[v + 3 + q]; ar[v + 3 + q] = ar[v + 6 + q]; ar[v + 6 + q] = t0; }
        back.computeVertexNormals(); parts.push(fg, back);
      }
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      for (let i = 0; i < 8; i++) {
        const k0 = i / 8, k1 = (i + 1) / 8;
        const p0 = [lerp(a[0], b[0], k0), lerp(a[1], b[1], k0) - Math.sin(k0 * Math.PI) * sag, lerp(a[2], b[2], k0)];
        const p1 = [lerp(a[0], b[0], k1), lerp(a[1], b[1], k1) - Math.sin(k1 * Math.PI) * sag, lerp(a[2], b[2], k1)];
        const d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), l = d.length();
        const cg = new THREE.CylinderGeometry(0.015, 0.015, l, 3);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        parts.push(piece(cg, 0xf3ead8, new THREE.Matrix4().compose(new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), q, new THREE.Vector3(1, 1, 1))));
      }
      return len;
    };
    garland([-6.6, 2.2, 4.4], [-8.6, 2.2, -4.8], 0.45);
    garland([6.4, 2.2, 4.2], [8.8, 2.2, -5.2], 0.45);
    g.add(new THREE.Mesh(concat(parts), vcMat({ side: THREE.DoubleSide })));
    lamp.gate = new THREE.Mesh(concat(gate), vcMat()); g.add(lamp.gate);
    lamp.mat = desat(new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffa040, emissiveIntensity: 2.2, roughness: 0.5 }));
    g.add(new THREE.Mesh(concat(glass), lamp.mat));
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glowP, 3));
    lamp.glow = new THREE.Points(gg, new THREE.PointsMaterial({ map: tex, color: 0xffb35c, size: 2.6, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(lamp.glow);
  }

  // 🌲 먼 숲(인스턴스 1) — 둥근 나무 · 언덕 위로 둘러싼다
  {
    const parts = [piece(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 5), 0x7a5838, M4(0, 0.8, 0)),
      piece(new THREE.IcosahedronGeometry(1.5, 0), 0xffffff, M4(0, 2.6, 0)), piece(new THREE.IcosahedronGeometry(1.1, 0), 0xffffff, M4(0.5, 3.5, 0.2))];
    const geo = concat(parts);
    const spots = [];
    for (let i = 0; i < 400 && spots.length < 120; i++) {
      const a = rnd() * Math.PI * 2, r = 22 + Math.pow(rnd(), 0.8) * 44, x = Math.cos(a) * r, z = Math.sin(a) * r + 2;
      if (Math.abs(x - 1.5) < 6 && z > 24 && z < 42) continue;   // 어귀 밖 길은 비운다(컷3 배경 — 길이 숲으로 이어진다)
      if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 2.6)) continue;
      spots.push([x, z]);
    }
    // 집 뒤 가까운 나무 몇 그루
    for (const [x, z] of [[-16, -3], [16.5, -4], [-15, 14], [15, 13], [-9, -15], [10, -16], [-20, -14], [21, -15]]) spots.push([x, z]);
    const im = new THREE.InstancedMesh(geo, vcMat(), spots.length), dm = new THREE.Object3D(), col = new THREE.Color();
    const LEAF = [0x5f9d4c, 0x6aa852, 0x568f45, 0x79b35c, 0x4f8a48];
    spots.forEach(([x, z], i) => {
      dm.position.set(x, groundY(x, z) - 0.1, z); dm.rotation.y = rnd() * 6; dm.scale.setScalar(1.1 + rnd() * 1.1); dm.updateMatrix();
      im.setMatrixAt(i, dm.matrix); im.setColorAt(i, col.setHex(LEAF[i % LEAF.length]));
    });
    im.frustumCulled = false;   // 인스턴스가 사방에 흩어져 있다(경계 구 하나로는 잘린다)
    g.add(im);
  }
  // 🌾 풀 + 🌼 꽃(인스턴스 각 1) — 길·밑동·집 자리는 비운다. 꽃은 시들며 고개를 숙이고 작아진다
  const flowers = { list: [], im: null, w: -1 };
  {
    const ok = (x, z) => pathDist(x, z) > 1.7 && Math.hypot(x - TREE.x, z - TREE.z) > 4.2 && !HOUSES.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 3.2);
    const tg = piece(new THREE.ConeGeometry(0.08, 0.55, 3), 0xffffff, M4(0, 0.27, 0));
    const tufts = [];
    for (let i = 0; i < 2000 && tufts.length < 360; i++) {
      const a = rnd() * Math.PI * 2, r = 2 + Math.sqrt(rnd()) * 24, x = Math.cos(a) * r, z = Math.sin(a) * r + 2;
      if (ok(x, z)) tufts.push([x, z, 0.7 + rnd() * 0.9]);
    }
    // 앞자리(컷1 카메라 앞) 키 큰 풀 — 화면 아래 가장자리에 걸려 깊이를 준다
    for (let i = 0; i < 22; i++) tufts.push([-1.3 - rnd() * 2.4, 10.8 + rnd() * 1.6, 1.1 + rnd() * 0.8]);
    for (let i = 0; i < 12; i++) tufts.push([3.4 + rnd() * 1.8, 11.2 + rnd() * 1.8, 1.0 + rnd() * 0.7]);
    const im = new THREE.InstancedMesh(tg, vcMat(), tufts.length), dm = new THREE.Object3D(), col = new THREE.Color();
    tufts.forEach(([x, z, s], i) => {
      dm.position.set(x, groundY(x, z), z); dm.rotation.set((rnd() - 0.5) * 0.6, rnd() * 6, (rnd() - 0.5) * 0.6); dm.scale.set(s, s * (0.8 + rnd() * 0.6), s); dm.updateMatrix();
      im.setMatrixAt(i, dm.matrix); im.setColorAt(i, col.setHex(rnd() < 0.5 ? 0x6fae50 : 0x86c262));
    });
    im.frustumCulled = false; g.add(im);
    const fgeo = concat([piece(new THREE.CylinderGeometry(0.02, 0.025, 0.42, 3), 0x5d9a4c, M4(0, 0.21, 0)), piece(new THREE.IcosahedronGeometry(0.11, 0), 0xffffff, M4(0, 0.45, 0))]);
    // 꽃잎 색은 인스턴스 색(줄기도 같이 물들지만 작아서 티가 안 난다)
    const FC = [0xfff4dc, 0xffd54f, 0xf7a8c4, 0xc8a6ec, 0xff9e7a];
    for (let i = 0; i < 1000 && flowers.list.length < 110; i++) {
      const a = rnd() * Math.PI * 2, r = 3 + Math.sqrt(rnd()) * 16, x = Math.cos(a) * r, z = Math.sin(a) * r + 2;
      if (ok(x, z)) flowers.list.push({ x, z, s: 0.8 + rnd() * 0.6, ry: rnd() * 6, lag: rnd() * 0.35, c: FC[flowers.list.length % FC.length] });
    }
    for (let i = 0; i < 14; i++) flowers.list.push({ x: -1.2 - rnd() * 2.6, z: 10.4 + rnd() * 2.0, s: 1.2 + rnd() * 0.5, ry: rnd() * 6, lag: rnd() * 0.35, c: FC[i % FC.length] });
    flowers.im = new THREE.InstancedMesh(fgeo, vcMat({ flatShading: false }), flowers.list.length);
    flowers.list.forEach((f, i) => flowers.im.setColorAt(i, col.setHex(f.c)));
    flowers.im.frustumCulled = false; g.add(flowers.im);
  }

  // 👨‍🌾 광장에 모인 이웃 — 진짜 주민 몸을 구워 이웃당 메시 1(재질 1 — 투명도로 흩어진다)
  const folks = [];
  for (const [id, x, z, at] of FOLK) {
    const def = NPCS.find(d => d.id === id); if (!def) continue;
    const fig = buildNPCFigure(def);
    const geo = bake(fig.group);
    freeGroup(fig.group);
    const mat = desat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, transparent: true, opacity: 1 }));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.04, z);
    m.rotation.y = Math.atan2(0.4 - x, 9 - z) * 0.75 + Math.atan2(-x, 2.4 - z) * 0.25;   // 대부분 카메라 쪽 · 조금씩 서로를 본다
    m.scale.setScalar(def.look === 'stargazer' ? 0.84 : 1);
    g.add(m);
    folks.push({ m, mat, x, z, at, ry: m.rotation.y, ph: rnd() * 6, s: m.scale.x });
  }
  // ✨ 흩어지는 빛(이웃이 사라질 때) — Points 하나(이웃당 14알)
  const puff = { n: 14 };
  {
    const P = new Float32Array(folks.length * puff.n * 3);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    puff.seed = []; for (let i = 0; i < folks.length * puff.n; i++) puff.seed.push([(rnd() - 0.5) * 0.9, rnd() * 1.4, (rnd() - 0.5) * 0.9, 0.6 + rnd() * 0.9, rnd() * 6]);
    puff.pts = new THREE.Points(gg, new THREE.PointsMaterial({ map: tex, color: 0xfff0c8, size: 0.36, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    puff.pts.frustumCulled = false; g.add(puff.pts);
  }

  // ✨ 떠도는 빛 알갱이(컷1) — 광장 위 공기
  const motes = { n: 90 };
  {
    const P = new Float32Array(motes.n * 3); motes.seed = [];
    for (let i = 0; i < motes.n; i++) motes.seed.push([(rnd() - 0.5) * 22, rnd() * 7, -8 + rnd() * 20, 0.15 + rnd() * 0.3, rnd() * 6]);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    motes.pts = new THREE.Points(gg, new THREE.PointsMaterial({ map: tex, color: 0xffe9a8, size: 0.32, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    motes.pts.frustumCulled = false; g.add(motes.pts);
  }
  // 🍂 지는 마른 잎(컷2~) — 인스턴스 1. 우듬지에서 하늘하늘 떨어져 땅에 눕는다(그 뒤 컷에도 낙엽으로 남는다)
  const falls = { list: [] };
  {
    const sh = new THREE.Shape(); sh.moveTo(0, -0.16); sh.quadraticCurveTo(0.13, 0, 0, 0.16); sh.quadraticCurveTo(-0.13, 0, 0, -0.16);
    const lg = piece(new THREE.ShapeGeometry(sh, 3), 0xffffff);
    falls.im = new THREE.InstancedMesh(lg, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 90);
    desat(falls.im.material);
    const AUT = [0xd99a3c, 0xc9772e, 0xe2b04a, 0xa8673a, 0xb9a04a];
    const col = new THREE.Color();
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2, r = 1.5 + rnd() * 6.5;
      falls.list.push({ x: TREE.x + Math.cos(a) * r, y: 5.5 + rnd() * 5.5, z: TREE.z + Math.sin(a) * r * 0.9, t0: 5.9 + rnd() * 4.2, spd: 1.1 + rnd() * 0.9, ph: rnd() * 6, drift: (rnd() - 0.5) * 2.4, s: 1.1 + rnd() * 0.9 });
      falls.im.setColorAt(i, col.setHex(AUT[i % AUT.length]));
    }
    falls.im.frustumCulled = false; g.add(falls.im);
  }
  // 🌫️ 낮게 깔리는 안개 둑(시들수록 짙어진다)
  const mist = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xaab4c2, transparent: true, opacity: 0, depthWrite: false }));
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4, r = 13 + rnd() * 12;
    s.position.set(Math.cos(a) * r, 1.0 + rnd() * 1.2, Math.sin(a) * r);
    s.scale.set(16 + rnd() * 10, 3.2 + rnd() * 1.6, 1);
    g.add(s); mist.push({ s, op: 0.28 + rnd() * 0.15, spd: (rnd() - 0.5) * 0.5, x0: s.position.x });
  }

  // 🦉 의뢰 올빼미 — 마지막 잎 곁 가지에 앉아 이쪽을 본다(컷5). 진짜 주민 몸 그대로(목·눈 깜빡임을 위해 굽지 않는다)
  const owlDef = NPCS.find(d => d.id === 'courier');
  const owl = { g: new THREE.Group(), eyes: [] };
  if (owlDef) {
    const fig = buildNPCFigure(owlDef);
    fig.group.traverse((o) => { if (o.isMesh) { o.castShadow = false; if (o.material.color?.getHex() === 0x241f1c) owl.eyes.push(o); } });
    owl.fig = fig.group; owl.g.add(fig.group);
  }
  const leafP = art.lastLeaf.position.clone();   // 트리 로컬 — 가지 끝
  const inward = new THREE.Vector3(-leafP.x, 0, -leafP.z).normalize();
  owl.perch = leafP.clone().addScaledVector(inward, 1.25).add(new THREE.Vector3(0, -0.2, 0));
  // 올빼미가 앉을 가지 — 나무 조형과 같은 결의 굵은 가지 하나를 덧댄다
  {
    const a = owl.perch.clone().addScaledVector(inward, 1.6).add(new THREE.Vector3(0, -0.5, 0)), b = owl.perch.clone().addScaledVector(inward, -0.55).add(new THREE.Vector3(0, 0.06, 0));
    const d = new THREE.Vector3().subVectors(b, a), l = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const br = piece(new THREE.CylinderGeometry(0.035, 0.13, l, 6), 0x88817a, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    const bm = new THREE.Mesh(br, vcMat()); bm.position.copy(TREE); g.add(bm);
  }
  owl.g.position.copy(TREE).add(owl.perch).add(new THREE.Vector3(0, 0.02, 0));
  owl.g.scale.setScalar(0.8); owl.face = 0; owl.y0 = owl.g.position.y;
  owl.g.visible = false; g.add(owl.g);

  g.visible = false;
  return {
    group: g, art, leafMats, houseMats, lamp, flowers, folks, puff, motes, falls, mist, owl, sky, disposables,
    leafBase: art.lastLeaf.position.clone(),
  };
}

// ── 시간 T 에 맞춰 세트를 칠한다 ──
const _c = new THREE.Color(), _dm = new THREE.Object3D();
const AUTUMN = new THREE.Color(0xe0b060), DRYLEAF = new THREE.Color(0xa58a62);
const SKY = {   // 황금빛(살아 있음) → 잿빛 푸른 해질녘(시듦)
  a: { top: 0x6fa6d8, mid: 0xffd9a0, bot: 0xf0c890, sun: 0xffc070 },
  b: { top: 0x34445c, mid: 0x8e9aab, bot: 0x7c8899, sun: 0x9fb2c8 },
};
const BR_ORDER = { forest: 0, kitchen: 0.25, farm: 0.5, water: 0.8, mine: 0.12 };   // 💧 가지가 마지막(마지막 잎이 거기 남는다)

/** 시듦 정도 w(0~1) — 컷2(5.4~10.2s) 동안 */
export function witherAt(T) { return smooth((T - 5.6) / 4.4); }

export function updateIntroSet(S, T, t) {
  const w = witherAt(T);
  // 하늘
  for (const k of ['top', 'mid', 'bot', 'sun']) S.sky[k].setHex(SKY.a[k]).lerp(_c.setHex(SKY.b[k]), w);
  S.sky.amt.value = 1 - w * 0.85;
  // 세트 전체 채도·틴트
  U.uDesat.value = w * 0.62;
  U.uTint.value.setRGB(lerp(1, 0.86, w), lerp(1, 0.9, w), lerp(1, 1.0, w));
  // 🌳 세계수 — 꽃 먼저 지고 → 잎이 물들고 → 가지마다 차례로 진다. 💧 가지가 마지막
  const bloom = 1 - smooth((T - 5.5) / 1.4);
  const branches = {};
  for (const id of Object.keys(LIMBS_OPENING)) {
    const o = BR_ORDER[id] ?? 0.5;
    branches[id] = { leaves: 1 - smooth((T - (6.7 + o * 2.4)) / 1.6), bloom };
  }
  const life = 1 - smooth((T - 6.2) / 3.8);
  S.art.setState({ life, branches }, t);
  const tint = smooth((T - 5.6) / 1.8), dry = smooth((T - 7.4) / 2.0);
  for (const m of S.leafMats) m.color.copy(_white).lerp(AUTUMN, tint).lerp(DRYLEAF, dry);
  // 🏠 창 불빛 · 🏮 등불 — 컷2 동안 하나둘 꺼진다
  const lit = 1 - smooth((T - 6.4) / 2.6);
  S.houseMats.win.emissiveIntensity = 1.5 * lit;
  S.lamp.mat.emissiveIntensity = 2.4 * lit;
  S.lamp.glow.material.opacity = 0.85 * lit * (0.92 + 0.08 * Math.sin(t * 7.3));
  S.lamp.glow.visible = lit > 0.01;
  S.lamp.gate.visible = T >= 10.3;   // 컷3 암전 속에서 나타난다
  // 🌼 꽃 — 시들며 고개를 숙이고 작아진다(바뀌는 동안만 행렬 갱신)
  const fw = smooth((T - 6.0) / 3.6);
  if (Math.abs(fw - S.flowers.w) > 0.003) {
    S.flowers.w = fw;
    S.flowers.list.forEach((f, i) => {
      const k = smooth((fw - f.lag) / 0.65);
      _dm.position.set(f.x, 0, f.z); _dm.rotation.set(k * 0.9, f.ry, k * 0.4);
      const s = f.s * (1 - k * 0.55); _dm.scale.set(s, s * (1 - k * 0.3), s); _dm.updateMatrix();
      S.flowers.im.setMatrixAt(i, _dm.matrix);
    });
    S.flowers.im.instanceMatrix.needsUpdate = true;
  }
  // 👨‍🌾 이웃 — 숨쉬듯 들썩, 차례로 빛이 되어 흩어진다
  const pp = S.puff.pts.geometry.attributes.position.array;
  let puffOn = 0;
  S.folks.forEach((f, i) => {
    const k = smooth((T - f.at) / 0.9);
    f.m.visible = k < 0.999;
    f.mat.opacity = 1 - k;
    f.m.position.y = 0.04 + Math.abs(Math.sin(t * 2.1 + f.ph)) * 0.05 * (1 - k) + k * 0.35;
    f.m.rotation.y = f.ry + Math.sin(t * 0.8 + f.ph) * 0.12;
    const sq = 1 + Math.sin(t * 2.1 + f.ph) * 0.015;
    f.m.scale.set(f.s * (1 - k * 0.12), f.s * sq * (1 - k * 0.12), f.s * (1 - k * 0.12));
    const u = T - f.at;   // 흩어지는 빛
    for (let j = 0; j < S.puff.n; j++) {
      const sd = S.puff.seed[i * S.puff.n + j], q = (i * S.puff.n + j) * 3;
      const life2 = Math.max(0, Math.min(1, u / (1.2 * sd[3])));
      pp[q] = f.x + sd[0] * (1 + life2 * 1.6) + Math.sin(u * 3 + sd[4]) * 0.15;
      pp[q + 1] = 0.3 + sd[1] + life2 * 2.4;
      pp[q + 2] = f.z + sd[2] * (1 + life2 * 1.6);
      if (u > 0 && life2 < 1) puffOn = 1;
    }
  });
  S.puff.pts.geometry.attributes.position.needsUpdate = true;
  S.puff.pts.visible = puffOn > 0;
  const dissolving = S.folks.map(f => T - f.at).filter(u => u > -0.1 && u < 1.8);
  S.puff.pts.material.opacity = dissolving.length ? 0.95 : 0;
  // ✨ 빛 알갱이
  const mo = 1 - smooth((T - 5.6) / 2.2);
  S.motes.pts.visible = mo > 0.01;
  if (S.motes.pts.visible) {
    const mp = S.motes.pts.geometry.attributes.position.array;
    S.motes.seed.forEach((sd, i) => {
      mp[i * 3] = sd[0] + Math.sin(t * 0.4 + sd[4]) * 0.6;
      mp[i * 3 + 1] = 0.6 + ((sd[1] + t * sd[3]) % 7);
      mp[i * 3 + 2] = sd[2] + Math.cos(t * 0.33 + sd[4]) * 0.6;
    });
    S.motes.pts.geometry.attributes.position.needsUpdate = true;
    S.motes.pts.material.opacity = 0.85 * mo;
  }
  // 🍂 마른 잎
  S.falls.list.forEach((f, i) => {
    const k = T - f.t0;
    if (k < 0) { _dm.scale.setScalar(0.0001); _dm.position.set(f.x, -1, f.z); }
    else {
      const y = Math.max(0.05, f.y - k * f.spd);
      _dm.position.set(f.x + Math.sin(k * 1.7 + f.ph) * 0.6 + f.drift * Math.min(k, 4) * 0.35, y, f.z + Math.cos(k * 1.3 + f.ph) * 0.4);
      if (y > 0.06) _dm.rotation.set(Math.sin(k * 2.6 + f.ph) * 1.2, k * 2.1 + f.ph, Math.cos(k * 2.0 + f.ph) * 0.9);
      else _dm.rotation.set(-Math.PI / 2, 0, f.ph);
      _dm.scale.setScalar(f.s);
    }
    _dm.updateMatrix(); S.falls.im.setMatrixAt(i, _dm.matrix);
  });
  S.falls.im.instanceMatrix.needsUpdate = true;
  // 🌫️ 안개 둑
  for (const m of S.mist) {
    m.s.material.opacity = m.op * smooth((T - 6) / 4);
    m.s.material.color.setHex(0xaab4c2);
    m.s.position.x = m.x0 + Math.sin(t * 0.05) * 2 + m.spd * t * 0.2;
  }
  // 🌿 마지막 잎 — 컷5에서 은은히 빛난다
  const glowK = smooth((T - 19.4) / 1.2);
  if (S.art.leafGlow.visible) {
    const pulse = 0.5 + 0.5 * Math.sin(T * 2.2);
    S.art.leafGlow.material.opacity = 0.2 + glowK * (0.16 + 0.1 * pulse);
    S.art.leafGlow.scale.setScalar(1.6 + glowK * (0.35 + 0.15 * pulse));
  }
  // 🦉 올빼미 — 컷5: 고개를 갸웃, 한 번 깜빡
  if (S.owl.g.visible) {
    const u = T - 19.2;
    S.owl.g.rotation.y = S.owl.face + Math.sin(u * 1.1) * 0.12;
    S.owl.g.rotation.z = smooth((u - 0.9) / 0.5) * 0.18 - smooth((u - 2.2) / 0.5) * 0.1;
    const blink = (u > 1.55 && u < 1.72) ? 0.12 : 1;
    for (const e of S.owl.eyes) e.scale.y = blink;
    S.owl.g.position.y = S.owl.y0 + Math.sin(t * 2.2) * 0.012;
  }
  return w;
}

export function disposeIntroSet(S) {
  if (!S) return;
  S.group.parent?.remove(S.group);
  const mats = new Set();
  S.group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
    if (o.isInstancedMesh) o.dispose?.();
  });
  for (const m of mats) { m.map?.dispose?.(); m.emissiveMap?.dispose?.(); m.dispose(); }
  for (const d of S.disposables) d.dispose?.();
  U.uDesat.value = 0; U.uTint.value.setRGB(1, 1, 1);
}
