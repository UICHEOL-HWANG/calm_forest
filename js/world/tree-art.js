// =============================================================
//  calm forest · 🌳 마을 세계수 조형 (Three 만 — 게임 상태 없음)
//  ------------------------------------------------------------
//  ▶ js/spaces/world-tree.js 가 buildTreeArt() 로 세우고, 매 프레임 setState() 로 진척을 넘긴다.
//  ▶ 문법은 인트로 시든 세계수(js/spaces/prologue.js buildWiltSet)와 같다: 굽은 밑동 → 굵은 가지 → 잔가지 → 끝가지,
//    가지 끝마다 잎 뭉치. 마을용이라 조명 재질(정점색·flatShading — 마을 로우폴리 나무와 같은 결), 라이트 추가 없음.
//  ▶ 드로우콜 11: 줄기 1 · 밑동 둘레(풀·꽃·마른 풀·낙엽·팻말 기둥) 1 · 가지 잎 4 · 우듬지 1 · 마지막 잎 1 + 번짐 1 · 빛 알갱이 1 · 팻말 글자 1
//  ▶ 잎·꽃이 "돋는" 건 정점 위치를 CPU 로 줄였다 늘리는 것(덩이마다 제 중심에서) — 진척이 바뀌는 동안에만 갱신한다.
//    그래서 덩이마다 메시를 따로 두지 않고도 안쪽(가지 밑)부터 바깥(잔가지 끝)으로 차례로 돋는다.
//  ▶ 시듦 ↔ 살아남: 정점마다 살아 있을 때 색·시든 색을 들고 있다가 섞는다(prologue setWither 와 같은 수법).
// =============================================================
let THREE = null;   // buildTreeArt(THREE) 가 넣는다 — 테스트가 vendor three 로 node 에서 세울 수 있게(js/mountain/*-art 와 같은 규칙)

// ── 색 ──
const BARK_LIVE = [0x7a5638, 0x936a46, 0xab8259];
const BARK_DEAD = [0x77706a, 0x88817a, 0x9a938b];
const ROOT_LIVE = [0x6c4b33, 0x83603f, 0x987150];
const LEAF = { under: 0x3d7a49, mid: 0x5aa656, top: 0x92cf66 };
const CROWN = { under: 0x37724a, mid: 0x529e55, top: 0x86c862 };
const BLOOM = { under: 0xd9819f, mid: 0xf2a5c1, top: 0xffd3e2 };

// ── 가지(판 가지 4개 ↔ 나무 굵은 가지 4개). 카메라가 남쪽(+z)에서 내려다보므로 뒤쪽 가지를 조금 높게 ──
export const LIMBS = {
  water:   { dir: [-0.8, 0.6],   h: 4.3, len: 5.6 },   // 💧 연못(앞 왼쪽)
  farm:    { dir: [0.86, 0.5],   h: 4.6, len: 5.8 },
  kitchen: { dir: [0.8, -0.6],   h: 5.3, len: 5.6 },
  forest:  { dir: [-0.78, -0.62], h: 5.1, len: 5.7 },
};

const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

/**
 * 정점 묶음 빌더 — 조각(piece)마다 위치 범위·중심·문턱을 기억해, 나중에 조각별로 줄였다 늘린다.
 * 색은 면마다 하나(flatShading 과 맞아 깎은 면이 또렷하다). live/dead 두 벌.
 */
function builder() {
  const pos = [], live = [], dead = [], pieces = [], _c = new THREE.Color(), _d = new THREE.Color();
  const api = {
    pieces,
    /** geo: BufferGeometry(아무 거나) · tone(face) → [liveHex, deadHex] · piece: { c:[x,y,z], ...meta } 면 조각으로 기억 */
    add(geo, tone, piece = null) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      const p = g.attributes.position, start = pos.length / 3;
      const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3(), M = new THREE.Vector3();
      for (let i = 0; i < p.count; i += 3) {
        A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2);
        N.subVectors(C, B).cross(M.subVectors(A, B)).normalize();
        M.copy(A).add(B).add(C).multiplyScalar(1 / 3);
        const [lh, dh] = tone(N, M, i / 3);
        _c.setHex(lh); _d.setHex(dh ?? lh);
        for (const V of [A, B, C]) { pos.push(V.x, V.y, V.z); live.push(_c.r, _c.g, _c.b); dead.push(_d.r, _d.g, _d.b); }
      }
      if (piece) pieces.push({ s: start, n: p.count, c: piece.c, ...piece });
      return api;
    },
    /** origin: 메시 원점(흔들림 축)으로 옮길 점 · autoHide: 조각이 다 접히면 숨긴다 */
    build(mat, { origin = null, autoHide = true } = {}) {
      const g = new THREE.BufferGeometry();
      const P = new Float32Array(pos);
      if (origin) {
        for (let i = 0; i < P.length; i += 3) { P[i] -= origin.x; P[i + 1] -= origin.y; P[i + 2] -= origin.z; }
        for (const pc of pieces) pc.c = [pc.c[0] - origin.x, pc.c[1] - origin.y, pc.c[2] - origin.z];
      }
      g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(live), 3));
      g.computeVertexNormals();
      g.computeBoundingSphere(); g.computeBoundingBox();   // 다 자란 크기로 한 번 — 줄여도 이 안이라 컬링이 안 틀린다
      const mesh = new THREE.Mesh(g, mat);
      const base = P.slice(), L = new Float32Array(live), D = new Float32Array(dead);
      let w = -1;
      return {
        mesh, pieces,
        /** 시듦 w(0 살아 있음 → 1 시듦) */
        tint(nw) {
          if (Math.abs(nw - w) < 0.003) return;
          w = nw;
          const col = g.attributes.color.array;
          for (let i = 0; i < col.length; i++) col[i] = L[i] + (D[i] - L[i]) * w;
          g.attributes.color.needsUpdate = true;
        },
        /** 조각마다 크기 s = scaleOf(piece) — 바뀐 조각만 다시 쓴다 */
        grow(scaleOf) {
          const arr = g.attributes.position.array;
          let dirty = false, any = false;
          for (const pc of pieces) {
            const s = scaleOf(pc);
            if (s > 0.001) any = true;
            if (pc.cur !== undefined && Math.abs(pc.cur - s) < 0.002) continue;
            pc.cur = s; dirty = true;
            const [cx, cy, cz] = pc.c;
            for (let v = pc.s * 3, e = (pc.s + pc.n) * 3; v < e; v += 3) {
              arr[v] = cx + (base[v] - cx) * s; arr[v + 1] = cy + (base[v + 1] - cy) * s; arr[v + 2] = cz + (base[v + 2] - cz) * s;
            }
          }
          if (dirty) g.attributes.position.needsUpdate = true;
          if (autoHide) mesh.visible = any;
        },
      };
    },
  };
  return api;
}

/** 곡선을 따라 가늘어지는 관(평행 이동 틀 — 곧은 가지에서도 안 뒤집힌다). 면마다 결(세로 줄무늬) */
function tube(pts, rFn, { radial = 7, segs = 8, rnd, twist = 0 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const P = [], T = [];
  for (let i = 0; i <= segs; i++) { P.push(curve.getPointAt(i / segs)); T.push(curve.getTangentAt(i / segs).normalize()); }
  const ref = Math.abs(T[0].y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  let N = new THREE.Vector3().crossVectors(T[0], ref).normalize();
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    if (i) N = N.sub(T[i].clone().multiplyScalar(T[i].dot(N))).normalize();
    const B = new THREE.Vector3().crossVectors(T[i], N);
    const r = rFn(i / segs), ring = [];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2 + twist * (i / segs);
      const k = r * (0.9 + (rnd ? rnd() * 0.2 : 0.1));   // 울퉁불퉁한 껍질
      ring.push(P[i].clone().addScaledVector(N, Math.cos(a) * k).addScaledVector(B, Math.sin(a) * k));
    }
    rings.push(ring);
  }
  const out = [];
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = rings[i][j], b = rings[i + 1][j], c = rings[i + 1][(j + 1) % radial], d = rings[i][(j + 1) % radial];
      // 바깥을 보게 감는다(중심선에서 멀어지는 쪽)
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
      const flip = n.dot(new THREE.Vector3().subVectors(a, P[i])) < 0;
      for (const tri of [[a, b, d], [b, c, d]]) { const tt = flip ? [tri[0], tri[2], tri[1]] : tri; for (const v of tt) out.push(v.x, v.y, v.z); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.userData.radial = radial;
  return g;
}

/** 잎 덩이 — 이십면체(세분 1)를 살짝 찌그러뜨린다(같은 꼭짓점은 같은 만큼 — 틈이 안 생기게) */
function blob(r, x, y, z, rnd, { detail = 1, squash = 0.82, oct = false } = {}) {
  const g = oct ? new THREE.OctahedronGeometry(r, 0) : new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position, jit = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!jit.has(key)) jit.set(key, 0.86 + rnd() * 0.24);
    const k = jit.get(key);
    p.setXYZ(i, p.getX(i) * k + x, p.getY(i) * k * squash + y, p.getZ(i) * k + z);
  }
  return g;
}
/** 면 방향으로 3톤(아래 어둡게 · 가운데 · 위 햇빛) */
const tri3 = (pal, rnd) => (n) => {
  const y = n.y + (rnd() - 0.5) * 0.25;
  return [y < -0.2 ? pal.under : y > 0.42 ? pal.top : pal.mid];
};
const barkTone = (live, deadP, rnd) => (n, m, f) => {
  const k = (Math.floor(f / 2) + Math.floor(rnd() * 1.6)) % 3;   // 세로 결 + 약간의 뒤섞임
  return [live[k], deadP[k]];
};

function softTex() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** 🌿 마지막 잎 — 인트로 makeIntroLeaf 의 잎몸·잎맥을 한 메시로(정점색) — 마을 카메라에서 보이게 크게 */
function lastLeafMesh() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.16, 0.06, 0.2, 0.24); shape.quadraticCurveTo(0.12, 0.4, 0, 0.52);
  shape.quadraticCurveTo(-0.12, 0.4, -0.2, 0.24); shape.quadraticCurveTo(-0.16, 0.06, 0, 0);
  const parts = [[new THREE.ShapeGeometry(shape, 6), 0x86d492]];
  parts.push([new THREE.PlaneGeometry(0.022, 0.44).translate(0, 0.25, 0.004), 0x55a468]);
  [[-1, 0.14], [1, 0.2], [-1, 0.28], [1, 0.34]].forEach(([s, y]) => parts.push([new THREE.PlaneGeometry(0.014, 0.13).rotateZ(s * 0.85).translate(s * 0.055, y, 0.004), 0x55a468]));
  parts.push([new THREE.PlaneGeometry(0.02, 0.18).translate(0, -0.08, 0), 0x55a468]);
  const b = builder();
  for (const [g, hex] of parts) b.add(g, () => [hex]);
  const m = b.build(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), { autoHide: false }).mesh;
  m.geometry.rotateZ(Math.PI);   // 꼭지가 가지 끝에, 잎몸은 아래로 매달린다
  return m;
}

/** 팻말 글자(캔버스) — 이모지 없이 한 줄 */
function plaqueFace(label) {
  const W = 256, H = 112;
  if (typeof document === 'undefined') return new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.95 * H / W), new THREE.MeshStandardMaterial({ color: 0xe6cf9f }));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#e6cf9f'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#b48c58'; c.fillRect(0, 0, W, 10); c.fillRect(0, H - 10, W, 10);
  let fs = 54; const font = (s) => `bold ${s}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
  c.font = font(fs); c.textAlign = 'center'; c.textBaseline = 'middle';
  while (fs > 22 && c.measureText(label).width > W - 36) { fs -= 2; c.font = font(fs); }
  c.fillStyle = '#4a3a24'; c.fillText(label, W / 2, H / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.95 * H / W), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: 0x5a5a5a, emissiveMap: tex }));   // 우듬지 그늘에서도 글자가 읽히게
}

/**
 * 세계수 조형을 만든다. 반환 { group, plaqueAt, setState(state, dt, t) }
 *   state: { life: 0~1(우듬지·껍질·밑동 풀), branches: { id: { leaves: 0~1, bloom: 0~1 } } }
 *   (부드럽게 따라가는 건 호출부가 — 여기는 받은 값 그대로 그린다). three: Three 모듈(순환 없이 테스트에서도 세운다)
 */
export function buildTreeArt(three, { label = '세계수' } = {}) {
  THREE = three;
  let seed = 23; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);   // 고정 시드 — 매번 같은 나무
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const group = new THREE.Group(); group.name = 'worldTree';
  const vtx = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });

  // ── 🪵 줄기·뿌리·가지(한 메시) ──
  const bark = builder();
  const bt = barkTone(BARK_LIVE, BARK_DEAD, rnd), rt = barkTone(ROOT_LIVE, BARK_DEAD, rnd);
  // 굵게 퍼지는 밑동 + 살짝 비틀린 줄기
  bark.add(tube([V(0, -0.4, 0), V(0.15, 1.2, 0.05), V(0.35, 2.8, -0.05), V(0.1, 4.4, -0.2), V(-0.15, 5.6, -0.15)],
    (t) => 1.05 + 0.5 * (1 - t) + 1.05 * Math.exp(-t * 9), { radial: 9, segs: 10, rnd, twist: 0.9 }), bt);
  // 위로 이어지는 가운데 줄기(우듬지 받침)
  bark.add(tube([V(-0.1, 4.8, -0.1), V(0.15, 6.6, -0.35), V(0.05, 8.2, -0.55), V(-0.15, 9.3, -0.6)], (t) => 0.82 - 0.58 * t, { radial: 7, segs: 7, rnd, twist: 0.6 }), bt);
  // 판뿌리(버팀뿌리) — 땅을 움켜쥐듯 퍼진다
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.35 + (rnd() - 0.5) * 0.4, c = Math.cos(a), s = Math.sin(a), L = 4.2 + rnd() * 1.8;
    bark.add(tube([V(c * 0.8, 2.0, s * 0.8), V(c * 1.9, 0.9, s * 1.9), V(c * (L * 0.7), 0.25, s * (L * 0.7)), V(c * L, -0.05, s * L)],
      (t) => 0.78 * (1 - t) + 0.1, { radial: 6, segs: 6, rnd }), rt);
  }
  // 가지 위계: 굵은 가지 → 곁가지 → 끝가지. 끝마다 잎 덩이 자리
  const anchors = {};   // id → [{ p, r, order }]
  const crownAnchors = [];
  const limb = (pts, r0, r1, radial, segs) => bark.add(tube(pts, (t) => r0 + (r1 - r0) * t, { radial, segs, rnd }), bt);
  const hdir = (x, z, rot) => { const c = Math.cos(rot), s = Math.sin(rot); return V(x * c - z * s, 0, x * s + z * c); };
  for (const [id, L] of Object.entries(LIMBS)) {
    const d = V(L.dir[0], 0, L.dir[1]).normalize(), up = V(0, 1, 0);
    const p0 = V(d.x * 0.35, L.h, d.z * 0.35);
    const p1 = p0.clone().addScaledVector(d, L.len * 0.36).addScaledVector(up, 1.3);
    const p2 = p0.clone().addScaledVector(d, L.len * 0.72).addScaledVector(up, 2.0);
    const p3 = p0.clone().addScaledVector(d, L.len).addScaledVector(up, 2.15);
    limb([p0, p1, p2, p3], 0.66, 0.2, 7, 7);
    const list = anchors[id] = [];
    list.push({ p: p2.clone().add(V(0, 0.55, 0)), r: 1.75, order: 0 }, { p: p3.clone().add(V(0, 0.45, 0)), r: 1.85, order: 1 });
    // 곁가지 3개(굵은 가지 중간·끝에서 양옆으로)
    [[0.5, -0.95], [0.78, 0.9], [1.0, 0.15]].forEach(([at, rot], k) => {
      const base = new THREE.CatmullRomCurve3([p0, p1, p2, p3]).getPointAt(at);
      const sd = hdir(d.x, d.z, rot + (rnd() - 0.5) * 0.3);
      const len = 2.3 + rnd() * 0.8;
      const q1 = base.clone().addScaledVector(sd, len * 0.5).add(V(0, 0.75, 0));
      const q2 = base.clone().addScaledVector(sd, len).add(V(0, 0.95 + rnd() * 0.4, 0));
      limb([base, q1, q2], 0.27, 0.09, 5, 4);
      list.push({ p: q2.clone().add(V(0, 0.35, 0)), r: 1.45 + rnd() * 0.25, order: 2 + k * 0.4 });
      // 끝가지 2개 — 끝이 살짝 처진다(잎이 없을 때 시든 느낌)
      for (let m = 0; m < 2; m++) {
        const td = hdir(sd.x, sd.z, (m ? 0.75 : -0.75) + (rnd() - 0.5) * 0.4);
        const tl = 1.3 + rnd() * 0.6;
        const u1 = q2.clone().addScaledVector(td, tl * 0.55).add(V(0, 0.35, 0));
        const u2 = q2.clone().addScaledVector(td, tl).add(V(0, -0.05 - rnd() * 0.25, 0));
        limb([q2, u1, u2], 0.09, 0.025, 4, 3);
        list.push({ p: u2.clone().add(V(0, 0.4, 0)), r: 1.05 + rnd() * 0.3, order: 3.2 + k * 0.4 + m * 0.2, tip: u2 });
      }
    });
  }
  // 가운데 줄기 위 곁가지(우듬지)
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + 0.6, base = V(0, 6.6 + k * 0.5, -0.4);
    const sd = V(Math.cos(a), 0, Math.sin(a));
    const e = base.clone().addScaledVector(sd, 2.2).add(V(0, 1.4, 0));
    limb([base, base.clone().addScaledVector(sd, 1.1).add(V(0, 0.9, 0)), e], 0.3, 0.08, 5, 4);
    crownAnchors.push({ p: e.clone().add(V(0, 0.4, 0)), r: 1.9 + rnd() * 0.3, order: k * 0.5 });
  }
  crownAnchors.push({ p: V(0, 9.7, -0.6), r: 2.5, order: 2.4 }, { p: V(0.4, 11.0, -0.9), r: 1.6, order: 3 });   // 꼭대기는 마지막에(혼자 떠 보이지 않게)
  const barkB = bark.build(vtx(), { autoHide: false });
  barkB.mesh.castShadow = true; barkB.mesh.receiveShadow = true;
  group.add(barkB.mesh);

  // ── 🍃 가지 잎(가지마다 한 메시) + 🌸 꽃(같은 메시 — 정점색) ──
  const clusters = {};
  const leafTone = tri3(LEAF, rnd), bloomTone = tri3(BLOOM, rnd);
  for (const [id, list] of Object.entries(anchors)) {
    const b = builder(), maxO = Math.max(...list.map(a => a.order));
    for (const a of list) {
      const t0 = a.order / maxO;   // 0 가지 밑 → 1 잔가지 끝(안쪽부터 바깥으로)
      b.add(blob(a.r, a.p.x, a.p.y, a.p.z, rnd), leafTone, { c: [a.p.x, a.p.y - a.r * 0.3, a.p.z], kind: 'leaf', t0 });
      // 꽃 — 덩이 윗면에 4~5송이
      const nF = 4 + Math.floor(rnd() * 2);
      for (let f = 0; f < nF; f++) {
        const n = V(rnd() - 0.5, 0.35 + rnd() * 0.8, rnd() - 0.5).normalize();
        const fp = a.p.clone().addScaledVector(n, a.r * 0.88);
        fp.y = a.p.y + (fp.y - a.p.y) * 0.82;
        b.add(blob(0.3 + rnd() * 0.08, fp.x, fp.y, fp.z, rnd, { oct: true, squash: 0.7 }), bloomTone, { c: [fp.x, fp.y, fp.z], kind: 'bloom', t0: f / nF * 0.5 });
      }
    }
    // 흔들림 축: 가지 중간 — 메시 원점을 그리 옮겨 그 둘레로 살짝 돈다
    const piv = list[0].p;
    const built = b.build(vtx(), { origin: piv });
    built.mesh.castShadow = true;
    built.mesh.position.copy(piv);
    built.mesh.userData.swayPhase = rnd() * Math.PI * 2;
    group.add(built.mesh);
    clusters[id] = built;
  }
  // 우듬지(생명력)
  const cb = builder(), crownTone = tri3(CROWN, rnd), cMax = Math.max(...crownAnchors.map(a => a.order));
  for (const a of crownAnchors) cb.add(blob(a.r, a.p.x, a.p.y, a.p.z, rnd), crownTone, { c: [a.p.x, a.p.y - a.r * 0.3, a.p.z], kind: 'leaf', t0: (a.order / cMax) * 0.6 });
  const crown = cb.build(vtx());
  crown.mesh.castShadow = true;
  group.add(crown.mesh);

  // ── 🌱 밑동 둘레: 이끼 바닥 · 풀 · 꽃 · 마른 풀 · 낙엽 · 팻말 기둥 (한 메시) ──
  const gb = builder();
  // 이끼 바닥 — 가장자리를 들쭉날쭉하게(원판 티가 안 나게), 안쪽 판 하나 + 바깥 고리 조각들
  const disc = new THREE.CircleGeometry(4.6, 26).rotateX(-Math.PI / 2);
  {
    const p = disc.attributes.position, ks = [];   // 테두리 점 26+1(마지막 = 첫 점)
    for (let i = 1; i < p.count; i++) ks.push(i === p.count - 1 ? ks[0] : 0.82 + rnd() * 0.3);
    for (let i = 1; i < p.count; i++) p.setXYZ(i, p.getX(i) * ks[i - 1], 0.035, p.getZ(i) * ks[i - 1]);
    p.setY(0, 0.035);
  }
  gb.add(disc, () => [0x86b866, 0x9a8f78]);
  for (let i = 0; i < 9; i++) {   // 바깥으로 번지는 이끼 얼룩
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.5, r = 4.6 + rnd() * 1.2, pr = 0.9 + rnd() * 0.8;
    gb.add(new THREE.CircleGeometry(pr, 7).rotateX(-Math.PI / 2).translate(Math.cos(a) * r, 0.03, Math.sin(a) * r), () => [0x8fbd6c, 0xa0957d]);
  }
  const ringPos = (r0, r1) => { const a = rnd() * Math.PI * 2, r = r0 + Math.sqrt(rnd()) * (r1 - r0); return [Math.cos(a) * r, Math.sin(a) * r, r]; };
  for (let i = 0; i < 70; i++) {   // 풀 — 생명력 따라 안쪽부터 돋는다
    const [x, z, r] = ringPos(2.2, 6.6), h = 0.35 + rnd() * 0.35;
    const g = new THREE.ConeGeometry(0.11, h, 3).rotateZ((rnd() - 0.5) * 0.5).translate(x, h / 2, z);
    gb.add(g, () => [rnd() < 0.5 ? 0x6fb257 : 0x8cc866], { c: [x, 0, z], kind: 'grass', t0: ((r - 2.2) / 4.4) * 0.55 + rnd() * 0.15 });
  }
  const FLOWER = [0xfff4dc, 0xffd54f, 0xf7a8c4, 0xc8a6ec];
  for (let i = 0; i < 26; i++) {   // 꽃 — 반쯤 살아난 뒤부터
    const [x, z] = ringPos(2.6, 6.2), h = 0.3 + rnd() * 0.2, col = FLOWER[i % 4];
    gb.add(new THREE.CylinderGeometry(0.025, 0.03, h, 3).translate(x, h / 2, z), () => [0x5d9a4c], { c: [x, 0, z], kind: 'grass', t0: 0.35 + rnd() * 0.5, grp: i });
    gb.add(new THREE.IcosahedronGeometry(0.13, 0).translate(x, h + 0.05, z), () => [col], { c: [x, 0, z], kind: 'grass', t0: 0.35 + rnd() * 0.5 });
  }
  for (let i = 0; i < 34; i++) {   // 마른 풀 — 시들었을 때만
    const [x, z] = ringPos(2.0, 6.4), h = 0.3 + rnd() * 0.25;
    const g = new THREE.ConeGeometry(0.09, h, 3).translate(0, h / 2, 0).rotateZ((rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.5)).rotateY(rnd() * 3).translate(x, 0, z);
    gb.add(g, () => [rnd() < 0.5 ? 0xb39c70 : 0x9a8560], { c: [x, 0, z], kind: 'dry', t0: rnd() * 0.5 });
  }
  for (let i = 0; i < 22; i++) {   // 낙엽
    const [x, z] = ringPos(1.8, 6.0);
    const g = new THREE.CircleGeometry(0.17 + rnd() * 0.08, 3).rotateX(-Math.PI / 2).rotateY(rnd() * 6).translate(x, 0.06, z);
    gb.add(g, () => [[0xa8794a, 0xc29a5a, 0x8f6a44][i % 3]], { c: [x, 0.06, z], kind: 'dry', t0: rnd() * 0.4 });
  }
  // 팻말 — 밑동 앞 오른쪽(프롬프트 자리 옆). 기둥·테두리만 여기, 글자 면은 따로
  const PLAQUE = { x: 3.3, z: 3.9 };
  for (const g of [new THREE.BoxGeometry(0.18, 1.3, 0.18).translate(PLAQUE.x, 0.65, PLAQUE.z - 0.22),
    new THREE.BoxGeometry(2.12, 1.04, 0.1).translate(PLAQUE.x, 1.3, PLAQUE.z - 0.06)]) gb.add(g, () => [0x8a6542]);
  const ground = gb.build(vtx(), { autoHide: false });
  ground.mesh.receiveShadow = true;
  ground.mesh.material.polygonOffset = true; ground.mesh.material.polygonOffsetFactor = -1; ground.mesh.material.polygonOffsetUnits = -2;
  group.add(ground.mesh);
  const face = plaqueFace(label);
  face.position.set(PLAQUE.x, 1.3, PLAQUE.z + 0.02);   // 테두리 앞면(z-0.01) 앞
  // 테두리가 든 밑동 메시는 polygonOffset 으로 앞당겨져 있다 — 글자 면은 그보다 더 당겨야 안 묻힌다
  Object.assign(face.material, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  group.add(face);

  // ── 🌿 마지막 잎(시들었을 때 가지 끝에 하나 — 은은히 빛난다) ──
  const tip = anchors.water.filter(a => a.tip).sort((a, b) => b.tip.z - a.tip.z)[0]?.tip || V(-4, 6, 3);   // 💧 가지에서 가장 앞(카메라 쪽) 끝가지
  const leaf = lastLeafMesh();
  leaf.scale.setScalar(1.7); leaf.position.copy(tip); leaf.rotation.set(0.25, 0.5, 0.2);
  group.add(leaf);
  const tex = softTex();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x9dffb0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.copy(tip).add(V(0, -0.45, 0)); glow.scale.setScalar(2.2);
  group.add(glow);

  // ── ✨ 빛 알갱이(살아날수록) ──
  const N = 30, mp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, r = 3 + rnd() * 6.5;
    mp.set([Math.cos(a) * r, 4.5 + rnd() * 7, Math.sin(a) * r * 0.85 - 0.4], i * 3);
  }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: tex, color: 0xfff3b0, size: 0.42, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(motes);

  // 다 자란 모습으로 상자를 잰 뒤 접어 둔다(조망샷 구도)
  const full = () => 1;
  for (const c of Object.values(clusters)) c.grow(full);
  crown.grow(full); ground.grow((p) => (p.kind === 'dry' ? 0 : 1));
  group.updateMatrixWorld(true);

  let lastLife = -1;
  return {
    group, clusters, plaque: PLAQUE,
    crown: crown.mesh, lastLeaf: leaf, leafGlow: glow, motes,   // 🎬 인트로(js/spaces/prologue-set.js)가 색·번짐을 덧칠한다
    /** 다 자란 나무를 감싸는 상자(그룹 로컬 — 호출부가 위치를 더한다). 빛 알갱이·이끼 바닥 제외 */
    fullBox() {
      const box = new THREE.Box3();
      for (const m of [barkB.mesh, crown.mesh, ...Object.values(clusters).map(c => c.mesh)]) box.union(new THREE.Box3().setFromObject(m));
      return box;
    },
    setState(state, t) {
      const life = state.life;
      for (const [id, c] of Object.entries(clusters)) {
        const st = state.branches[id] || { leaves: 0, bloom: 0 };
        // 서식지만(0.4)이면 가지의 절반쯤이 4분의 3 크기로, 꾸러미까지(1)면 끝가지까지 다 자란다
        c.grow((p) => (p.kind === 'leaf' ? smooth((st.leaves * 2.1 - p.t0) / 0.4) * (0.55 + 0.45 * st.leaves) : smooth((st.bloom - p.t0) / 0.5)));
        c.mesh.rotation.z = Math.sin(t * 0.9 + c.mesh.userData.swayPhase) * 0.022 * st.leaves;
        c.mesh.rotation.x = Math.cos(t * 0.7 + c.mesh.userData.swayPhase) * 0.016 * st.leaves;
      }
      crown.grow((p) => smooth((life - p.t0) / 0.4));
      crown.mesh.rotation.z = Math.sin(t * 0.6) * 0.012 * life;
      if (Math.abs(life - lastLife) > 0.002) {
        lastLife = life;
        const w = 1 - Math.min(1, life * 1.6);
        barkB.tint(w); ground.tint(w);
        ground.grow((p) => (p.kind === 'dry' ? 1 - smooth((life - p.t0) / 0.25) : smooth((life - p.t0) / 0.2)));
      }
      // 마지막 잎 — 첫 잎이 돋으면 물러난다
      const keep = 1 - smooth(((state.branches.water?.leaves || 0) - 0.05) / 0.3);
      leaf.visible = glow.visible = keep > 0.01;
      if (leaf.visible) {
        leaf.rotation.z = 0.2 + Math.sin(t * 1.4) * 0.12;
        glow.material.opacity = keep * (0.38 + 0.18 * Math.sin(t * 2.1));
      }
      motes.visible = life > 0.02;
      if (motes.visible) {
        motes.material.opacity = Math.min(0.9, life * 1.1);
        motes.rotation.y = t * 0.05;
        motes.position.y = Math.sin(t * 0.8) * 0.25;
      }
    },
  };
}
