// =============================================================
//  calm forest · 🌳 마을 세계수 조형 (Three 만 — 게임 상태 없음)
//  ------------------------------------------------------------
//  ▶ js/spaces/world-tree.js 가 buildTreeArt() 로 세우고, 매 프레임 setState() 로 진척을 넘긴다.
//  ▶ 문법은 인트로 시든 세계수(js/spaces/prologue.js buildWiltSet)와 같다: 굽은 밑동 → 굵은 가지 → 잔가지 → 끝가지,
//    가지 끝마다 잎 구름. 조명 재질(정점색), 라이트 추가 없음. 줄기·밑동은 flatShading(마을 로우폴리 나무와 같은 결),
//    잎 구름은 작고 둥근 뭉치 여럿을 겹쳐(정점 법선을 둥글게) 몽글몽글 — 그늘진 아래 청록 → 햇살 받은 위 노란 연두, 꽃은 겉면에 박힌다.
//  ▶ 드로우콜 12: 줄기 1 · 밑동 둘레(풀·꽃·마른 풀·낙엽·팻말 기둥) 1 · 가지 잎 4 · 우듬지 1 · 마지막 잎 1 + 번짐 1 + 반짝이 1 · 빛 알갱이 1 · 팻말 글자 1
//  ▶ 잎·꽃이 "돋는" 건 정점 위치를 CPU 로 줄였다 늘리는 것(덩이마다 제 중심에서) — 진척이 바뀌는 동안에만 갱신한다.
//    그래서 덩이마다 메시를 따로 두지 않고도 안쪽(가지 밑)부터 바깥(잔가지 끝)으로 차례로 돋는다.
//  ▶ 시듦 ↔ 살아남: 정점마다 살아 있을 때 색·시든 색을 들고 있다가 섞는다(prologue setWither 와 같은 수법).
// =============================================================
let THREE = null;   // buildTreeArt(THREE) 가 넣는다 — 테스트가 vendor three 로 node 에서 세울 수 있게(js/mountain/*-art 와 같은 규칙)

// ── 색 ──
const BARK_LIVE = [0x7a5638, 0x936a46, 0xab8259];
const BARK_DEAD = [0x77706a, 0x88817a, 0x9a938b];
const ROOT_LIVE = [0x6c4b33, 0x83603f, 0x987150];
// 잎 구름: 그늘진 아래(서늘한 청록) → 싱그러운 연두(가운데) → 햇살 받은 윗면(따뜻한 노란 연두)
const LEAF = { under: 0x3dab84, mid: 0x66c96a, top: 0xb8e985 };
const CROWN = { under: 0x39a780, mid: 0x60c468, top: 0xb0e683 };
const BLOOM = { petal: 0xffe0ea, inner: 0xf7a6c2, heart: 0xffd76a };

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
  const pos = [], nor = [], live = [], dead = [], pieces = [], _c = new THREE.Color(), _d = new THREE.Color();
  const api = {
    pieces,
    /**
     * geo: BufferGeometry(아무 거나) · tone(face) → [liveHex, deadHex] · piece: { c:[x,y,z], ...meta } 면 조각으로 기억
     * opt.round: 둥근 덩이 중심(Vector3) — 정점 법선을 구 법선 쪽으로 기울여(roundK) 깎은 면이 부드럽게 이어진다
     *   opt.round2·k2: 더 큰 덩이(구름 전체) 중심 — 그 법선과 k2 만큼 섞는다
     * opt.vtone(V, n) → hex|Color: 정점마다 색(면 하나에 그라데이션) — tone 대신
     */
    add(geo, tone, piece = null, { round = null, roundK = 0.8, round2 = null, k2 = 0, vtone = null } = {}) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      const p = g.attributes.position, start = pos.length / 3;
      const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3(), M = new THREE.Vector3(), R = new THREE.Vector3(), R2 = new THREE.Vector3();
      for (let i = 0; i < p.count; i += 3) {
        A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2);
        N.subVectors(C, B).cross(M.subVectors(A, B)).normalize();
        M.copy(A).add(B).add(C).multiplyScalar(1 / 3);
        if (!vtone) { const [lh, dh] = tone(N, M, i / 3); _c.setHex(lh); _d.setHex(dh ?? lh); }
        for (const V of [A, B, C]) {
          let n = N;
          if (round) {
            R.subVectors(V, round).normalize();
            if (round2) R.lerp(R2.subVectors(V, round2).normalize(), k2).normalize();   // 뭉치 법선 ↔ 구름 전체 법선 — 뭉치 사이 골이 덜 진다
            n = R.multiplyScalar(roundK).addScaledVector(N, 1 - roundK).normalize();
          }
          if (vtone) { _c.set(vtone(V, n)); _d.copy(_c); }
          pos.push(V.x, V.y, V.z); nor.push(n.x, n.y, n.z); live.push(_c.r, _c.g, _c.b); dead.push(_d.r, _d.g, _d.b);
        }
      }
      if (piece) pieces.push({ s: start, n: p.count, c: piece.c, ...piece });
      return api;
    },
    /** 지금까지 쌓인 정점 수 — mark() 뒤로 여러 번 add 한 걸 piece(start, meta) 로 한 조각으로 묶는다 */
    mark: () => pos.length / 3,
    piece(start, piece) { pieces.push({ s: start, n: pos.length / 3 - start, c: piece.c, ...piece }); return api; },
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
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
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

/** 둥근 잎 뭉치 하나(살짝만 찌그러뜨린다 — 같은 꼭짓점은 같은 만큼, 틈이 안 생기게) */
function puff(r, x, y, z, rnd, squash = 0.86, core = false) {
  const g = new THREE.IcosahedronGeometry(r, core ? 0 : 1);   // 겉 뭉치는 80면(테두리가 동글게) · 가려지는 가운데 심은 20면
  const p = g.attributes.position, jit = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!jit.has(key)) jit.set(key, 0.94 + rnd() * 0.1);
    const k = jit.get(key);
    p.setXYZ(i, p.getX(i) * k + x, p.getY(i) * k * squash + y, p.getZ(i) * k + z);
  }
  return g;
}
/** 정점색 3톤 그라데이션 — 법선이 위를 볼수록 · 구름 위쪽일수록 햇빛 색 */
function leafShade(pal, y0, h, warm) {
  const U = new THREE.Color(pal.under), Mi = new THREE.Color(pal.mid), T = new THREE.Color(pal.top), out = new THREE.Color();
  return (V, n) => {
    const hk = Math.min(1, Math.max(0, (V.y - y0) / h));
    const k = Math.min(1, Math.max(0, 0.5 * (n.y * 0.5 + 0.5) + 0.5 * hk + warm));
    if (k < 0.5) out.copy(U).lerp(Mi, smooth(k / 0.5)); else out.copy(Mi).lerp(T, smooth((k - 0.5) / 0.5) * 0.92);
    return out;
  };
}
/** 잎 카드 — 가운데 잎맥을 따라 살짝 접힌 마름모. +Y 로 뻗는다 */
function leafCard(len, wid) {
  const b = [0, 0, 0], l = [-wid, len * 0.42, len * 0.07], t = [0, len, 0], r = [wid, len * 0.42, len * 0.07];
  const f = [b, r, t, b, t, l, b, t, r, b, l, t].flat();   // 앞뒤 면(법선은 둘 다 구름 바깥 — 어느 쪽에서 봐도 같은 밝기)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(f, 3));
  return g;
}
/** 꽃 한 송이 — 둥근 꽃잎 다섯 장(컵 모양) + 노란 꽃술. +Y 를 본다 */
function blossomGeo(R) {
  const P = [], C = [];
  const pc = new THREE.Color(BLOOM.petal), ic = new THREE.Color(BLOOM.inner), hc = new THREE.Color(BLOOM.heart);
  // 꽃잎 다섯 장 — 장마다 오목한 틈 · 어깨 둘 · 둥근 끝(가장자리 20점), 가운데가 살짝 오목한 컵
  const rim = [];
  for (let i = 0; i < 5; i++) for (const [da, rr, h] of [[0, 0.34, 0.1], [0.28, 0.86, 0.24], [0.5, 1, 0.3], [0.72, 0.86, 0.24]]) {
    const a = ((i + da) / 5) * Math.PI * 2;
    rim.push([Math.cos(a) * R * rr, R * h, Math.sin(a) * R * rr, rr > 0.5]);
  }
  const ctr = [0, R * 0.04, 0];
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i], b = rim[(i + 1) % rim.length];
    P.push(...ctr, ...b.slice(0, 3), ...a.slice(0, 3));   // 한 면 — 위(+Y)를 본다(꽃은 잎 구름 윗면에만 핀다)
    C.push(ic, b[3] ? pc : ic, a[3] ? pc : ic);   // 가운데 진분홍 → 꽃잎 끝 연분홍
  }
  // 꽃술 — 낮은 세모뿔
  const hr = R * 0.24, top = [0, R * 0.26, 0], hb = [0, 1, 2].map(i => [Math.cos(i * 2.094) * hr, R * 0.08, Math.sin(i * 2.094) * hr]);
  for (let i = 0; i < 3; i++) { P.push(...top, ...hb[(i + 1) % 3], ...hb[i]); C.push(hc, hc, hc); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.userData.cols = C;
  return g;
}
/**
 * 🍃 잎 구름 — 큰 덩이 하나 대신 작고 둥근 뭉치 여럿(가운데 · 둘레 · 위)이 겹쳐 가장자리가 몽글몽글하다.
 * 가장자리엔 잎 카드를 조금 꽂고, 꽃은 뭉치 겉면에 박아(떠 있지 않게) 따로 조각으로 남긴다.
 * 반환: 꽃 자리 목록 [{ p, n }]
 */
function leafCloud(b, a, pal, rnd, meta) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const r = a.r, c = a.p, start = b.mark();
  const shade = leafShade(pal, c.y - r * 0.85, r * 1.75, 0);
  const puffs = [[V(0, -0.04 * r, 0), 0.6 * r]];
  const nRing = 4, a0 = rnd() * Math.PI * 2;
  for (let k = 0; k < nRing; k++) {
    const ang = a0 + (k / nRing) * Math.PI * 2 + (rnd() - 0.5) * 0.5, d = r * (0.5 + rnd() * 0.08);
    puffs.push([V(Math.cos(ang) * d, -r * 0.1 + rnd() * r * 0.18, Math.sin(ang) * d), r * (0.4 + rnd() * 0.14)]);
  }
  const nTop = 2;
  for (let k = 0; k < nTop; k++) {
    const ang = a0 + 0.6 + (k / nTop) * Math.PI * 2, d = r * 0.24;
    puffs.push([V(Math.cos(ang) * d, r * (0.34 + rnd() * 0.08), Math.sin(ang) * d), r * (0.4 + rnd() * 0.06)]);
  }
  const cc = c.clone().add(V(0, -0.25 * r, 0));   // 구름 전체의 중심(조금 아래 — 옆면 법선이 옆을 보게)
  // 다른 뭉치 속에 완전히 묻힌 삼각형은 버린다(안 보이는 면 — 삼각형 수를 3분의 1쯤 던다)
  const inside = (x, y, z, skip) => puffs.some(([o, rr], j) => {
    if (j === skip) return false;
    const dx = x - o.x - c.x, dy = (y - o.y - c.y) / 0.86, dz = z - o.z - c.z;
    return dx * dx + dy * dy + dz * dz < (rr * 0.92) * (rr * 0.92);
  });
  puffs.forEach(([o, rr], k) => {
    const pc = o.clone().add(c);
    const g = puff(rr, pc.x, pc.y, pc.z, rnd, 0.86, k === 0), pa = g.attributes.position.array, keep = [];
    for (let i = 0; i < pa.length; i += 9) {
      if (inside(pa[i], pa[i + 1], pa[i + 2], k) && inside(pa[i + 3], pa[i + 4], pa[i + 5], k) && inside(pa[i + 6], pa[i + 7], pa[i + 8], k)) continue;
      for (let j = 0; j < 9; j++) keep.push(pa[i + j]);
    }
    const kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
    b.add(kg, null, null, { round: pc, roundK: 0.97, round2: cc, k2: 0.62, vtone: shade });
  });
  // 잎 카드 — 둘레 뭉치 겉에서 바깥·위로 삐죽
  const nCard = Math.round(3 + r * 2.5), q = new THREE.Quaternion(), Y = V(0, 1, 0), tmp = new THREE.Color(), W = new THREE.Color(0xffffff);
  for (let k = 0; k < nCard; k++) {
    const [o, rr] = puffs[1 + Math.floor(rnd() * (puffs.length - 1))];
    const out = V(o.x, 0, o.z).normalize();
    const dir = V(out.x + (rnd() - 0.5) * 0.7, 0.35 + rnd() * 0.75, out.z + (rnd() - 0.5) * 0.7).normalize();
    const base = o.clone().add(c).addScaledVector(dir, rr * 0.88);
    const len = 0.3 + rnd() * 0.12;
    const g = leafCard(len, len * 0.36).rotateY(rnd() * Math.PI * 2);
    g.applyQuaternion(q.setFromUnitVectors(Y, dir)).translate(base.x, base.y, base.z);
    b.add(g, null, null, { round: cc, roundK: 0.85, vtone: (P, n) => tmp.copy(shade(P, n)).lerp(W, 0.08) });   // 구름 겉면과 같은 색(법선도 구름 바깥) — 윤곽만 삐죽하게 깬다
  }
  b.piece(start, { c: [c.x, c.y - r * 0.3, c.z], ...meta });
  // 꽃 자리 — 위쪽 뭉치 겉면
  const spots = [];
  const nF = 5 + Math.floor(rnd() * 3);
  for (let f = 0; f < nF; f++) {
    const [o, rr] = puffs[1 + Math.floor(rnd() * (puffs.length - 1))];
    const n = V(o.x / r * 0.8 + (rnd() - 0.5) * 0.9, 0.5 + rnd() * 0.9, o.z / r * 0.8 + (rnd() - 0.5) * 0.9).normalize();
    const p = o.clone().add(c).addScaledVector(n, rr * 0.86);
    p.y = o.y + c.y + (p.y - o.y - c.y) * 0.86;
    spots.push({ p, n });
  }
  return spots;
}
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

/**
 * 🌿 마지막 잎 — 잎자루가 끝가지 끝에서 그 방향 그대로 이어 나와 휘어 내려가고, 잎몸은 가운데 잎맥을 따라 살짝 접혀
 *    (두 쪽이 비스듬히 마주 선다) 끝이 앞으로 말린다. 밑동 싱그러운 초록 → 끝 빛나는 연두, 가장자리 밝은 테, 은은한 잎맥.
 *    빛 계산 없이(MeshBasic) 접힌 음영을 정점색에 구워 둔다 — 어두운 인트로 컷에서도 스스로 빛나 보이게.
 *    tw: 끝가지 끝 방향(트리 로컬 단위벡터) · face: 잎 앞면이 볼 쪽. 원점 = 붙는 자리(흔들어도 안 떨어진다)
 *    반환 { mesh, mid(잎몸 가운데 · 원점 기준), axes: { stem, face } }
 */
function lastLeafMesh(tw, face) {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // 정준 틀: 잎자루 +X 로 나와 → 잎몸이 아래(-Y)로 드리우고 → 앞면 +Z
  const stemPts = [V3(0, 0, 0), V3(0.06, 0.012, 0), V3(0.115, -0.018, 0.01), V3(0.145, -0.08, 0.022)];
  const B0 = stemPts[3].clone(), ax = V3(0.4, -1, 0.06).normalize(), Lb = 0.58, W = 0.2, FOLD = 0.34;
  const sd = V3(ax.y, -ax.x, 0).normalize(), fn = new THREE.Vector3().crossVectors(sd, ax).normalize();
  const mid = (u) => B0.clone().addScaledVector(ax, Lb * u).addScaledVector(fn, 0.05 * Math.sin(Math.PI * u) + 0.07 * u * u * u).addScaledVector(sd, 0.02 * Math.sin(Math.PI * u * 1.3));
  const wid = (u) => (u <= 0 || u >= 1 ? 0 : W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85));
  const surf = (u, v, s) => {
    const w = wid(u) * v;
    return mid(u).addScaledVector(sd, s * w * Math.cos(FOLD)).addScaledVector(fn, w * Math.sin(FOLD) + 0.08 * w * v + 0.012 * Math.sin(u * 17 + s) * v * v);
  };
  const BASE = new THREE.Color(0x3fae5a), TIP = new THREE.Color(0xc9ef6e), RIM = new THREE.Color(0xf1ffc4), VEIN = new THREE.Color(0xe8fcb8), STEM = new THREE.Color(0x4f9a4c);
  const bladeCol = (u, v, s) => {
    const c = BASE.clone().lerp(TIP, Math.pow(smooth(u), 0.85));
    if (v > 0.7) c.lerp(RIM, smooth((v - 0.7) / 0.3) * 0.45);
    return c.multiplyScalar((s > 0 ? 1 : 0.8) * (0.86 + 0.14 * v));   // 접힌 두 쪽 — 한쪽이 그늘, 잎맥 골이 살짝 어둡다
  };
  const P = [], C = [];
  const tri = (a, b, c, ca, cb, cc) => { P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); C.push(ca, cb, cc); };
  // 잎몸 — 두 쪽
  const US = [], VS = [0, 0.32, 0.62, 0.86, 1];
  for (let i = 0; i <= 14; i++) US.push(i / 14);
  for (const s of [1, -1]) {
    for (let i = 0; i < US.length - 1; i++) for (let j = 0; j < VS.length - 1; j++) {
      const q = [[US[i], VS[j]], [US[i + 1], VS[j]], [US[i + 1], VS[j + 1]], [US[i], VS[j + 1]]];
      const pt = q.map(([u, v]) => surf(u, v, s)), cl = q.map(([u, v]) => bladeCol(u, v, s));
      tri(pt[0], pt[1], pt[2], cl[0], cl[1], cl[2]); tri(pt[0], pt[2], pt[3], cl[0], cl[2], cl[3]);
    }
  }
  // 잎맥 — 가운데 한 줄 + 양쪽 네 쌍(잎몸 위로 아주 살짝 띄운 가는 띠, 끝으로 갈수록 가늘다)
  const lift = (p) => p.addScaledVector(fn, 0.005);
  const strip = (pts, w0, w1, side, col) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const wa = w0 + (w1 - w0) * (k / (pts.length - 1)), wb = w0 + (w1 - w0) * ((k + 1) / (pts.length - 1));
      const d = new THREE.Vector3().subVectors(pts[k + 1], pts[k]).normalize(), n = new THREE.Vector3().crossVectors(d, fn).normalize();
      const a1 = pts[k].clone().addScaledVector(n, wa), a2 = pts[k].clone().addScaledVector(n, -wa);
      const b1 = pts[k + 1].clone().addScaledVector(n, wb), b2 = pts[k + 1].clone().addScaledVector(n, -wb);
      tri(a1, b1, b2, col[k], col[k + 1], col[k + 1]); tri(a1, b2, a2, col[k], col[k + 1], col[k]);
    }
  };
  { const us = [0.0, 0.2, 0.4, 0.6, 0.8, 0.95]; strip(us.map(u => lift(surf(u, 0, 1))), 0.009, 0.002, 0, us.map(u => bladeCol(u, 0, 1).lerp(VEIN, 0.45))); }
  for (const s of [1, -1]) for (const u0 of [0.2, 0.37, 0.54, 0.7]) {
    const ts = [0, 0.5, 1], pts = ts.map(t => lift(surf(u0 + 0.15 * t, 0.06 + 0.72 * t, s)));
    strip(pts, 0.0045, 0.0012, s, ts.map(t => bladeCol(u0 + 0.15 * t, 0.06 + 0.72 * t, s).lerp(VEIN, 0.3 * (1 - t))));
  }
  // 잎자루
  const st = tube(stemPts, (t) => 0.016 - 0.006 * t, { radial: 5, segs: 5 }).attributes.position;
  for (let i = 0; i < st.count; i += 3) {
    const vs = [0, 1, 2].map(k => V3(st.getX(i + k), st.getY(i + k), st.getZ(i + k)));
    const cs = vs.map(v => STEM.clone().lerp(BASE, Math.min(1, v.x / 0.145) * 0.6));
    tri(vs[0], vs[1], vs[2], cs[0], cs[1], cs[2]);
  }
  // 정준 틀 → 트리 로컬: 잎자루 = 끝가지 방향, 위 = 세계 위, 앞 = face 쪽(거울이어도 된다 — 양면)
  const X = tw.clone().normalize(), up = V3(0, 1, 0);
  const Y = up.clone().addScaledVector(X, -up.dot(X)).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  if (Z.dot(face) < 0) Z.negate();
  const M = new THREE.Matrix4().makeBasis(X, Y, Z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  const col = new Float32Array(C.length * 3); C.forEach((c, i) => c.toArray(col, i * 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.applyMatrix4(M);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }));   // 안개 속에서도 또렷이
  return { mesh, mid: surf(0.45, 0, 1).applyMatrix4(M), axes: { stem: X, face: Z } };
}

/** 마지막 잎 둘레 반짝이 — 정점색으로 깜빡인다(검정 = 안 보임, 덧셈 섞기) */
function leafSparkles(tex, n = 9) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, size: 0.26, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  pts.userData.seed = Array.from({ length: n }, (_, i) => [i / n * Math.PI * 2, 0.32 + (i % 3) * 0.14, 0.5 + (i * 0.37) % 0.6, (i * 1.7) % 3]);
  return pts;
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
        list.push({ p: u2.clone().add(V(0, 0.4, 0)), r: 1.05 + rnd() * 0.3, order: 3.2 + k * 0.4 + m * 0.2, tip: u2, tipDir: new THREE.CatmullRomCurve3([q2, u1, u2]).getTangentAt(1) });
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
  //   잎 자리마다 몽글몽글한 잎 구름(조각 하나 — 예전처럼 안쪽부터 돋는다) + 그 겉면에 박힌 꽃(조각마다)
  const clusters = {};
  const leafMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });   // 부드러운 음영(정점 법선을 둥글게 줬다)
  const flowerTo = (b, sp, R, meta) => {
    const g = blossomGeo(R), cols = g.userData.cols;
    g.rotateY(rnd() * Math.PI * 2).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), sp.n)).translate(sp.p.x, sp.p.y, sp.p.z);
    let i = 0;
    b.add(g, null, { c: [sp.p.x, sp.p.y, sp.p.z], ...meta }, { round: sp.p.clone().addScaledVector(sp.n, -1e4), roundK: 1, vtone: () => cols[i++] });   // 법선 = 꽃이 보는 쪽
  };
  for (const [id, list] of Object.entries(anchors)) {
    const b = builder(), maxO = Math.max(...list.map(a => a.order));
    for (const a of list) {
      const t0 = a.order / maxO;   // 0 가지 밑 → 1 잔가지 끝(안쪽부터 바깥으로)
      const spots = leafCloud(b, a, LEAF, rnd, { kind: 'leaf', t0 });
      spots.forEach((sp, f) => flowerTo(b, sp, 0.3 + rnd() * 0.07, { kind: 'bloom', t0: f / spots.length * 0.5 }));
    }
    // 흔들림 축: 가지 중간 — 메시 원점을 그리 옮겨 그 둘레로 살짝 돈다
    const piv = list[0].p;
    const built = b.build(leafMat(), { origin: piv });
    built.mesh.castShadow = true;
    built.mesh.position.copy(piv);
    built.mesh.userData.swayPhase = rnd() * Math.PI * 2;
    group.add(built.mesh);
    clusters[id] = built;
  }
  // 우듬지(생명력)
  const cb = builder(), cMax = Math.max(...crownAnchors.map(a => a.order));
  for (const a of crownAnchors) leafCloud(cb, a, CROWN, rnd, { kind: 'leaf', t0: (a.order / cMax) * 0.6 });
  const crown = cb.build(leafMat());
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
  const tipA = anchors.water.filter(a => a.tip).sort((a, b) => b.tip.z - a.tip.z)[0];   // 💧 가지에서 가장 앞(카메라 쪽) 끝가지
  const tip = tipA?.tip || V(-4, 6, 3), LS = 1.7;
  const ll = lastLeafMesh(tipA?.tipDir || V(-0.7, -0.3, 0.6), V(0.5, 0.15, 1).normalize());
  const leaf = new THREE.Group(); leaf.name = 'lastLeaf';
  leaf.position.copy(tip); leaf.scale.setScalar(LS); leaf.add(ll.mesh);
  group.add(leaf);
  const leafMid = tip.clone().addScaledVector(ll.mid, LS);   // 잎몸 가운데(트리 로컬)
  const tex = softTex();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xc8ffa8, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.copy(leafMid).addScaledVector(ll.axes.face, -0.35); glow.scale.setScalar(2.2);   // 잎 뒤 — 잎몸을 허옇게 덮지 않고 둘레로 번진다
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
  const sparkles = leafSparkles(tex);
  group.add(sparkles);

  // 다 자란 모습으로 상자를 잰 뒤 접어 둔다(조망샷 구도)
  const full = () => 1;
  for (const c of Object.values(clusters)) c.grow(full);
  crown.grow(full); ground.grow((p) => (p.kind === 'dry' ? 0 : 1));
  group.updateMatrixWorld(true);

  let lastLife = -1;
  const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
  return {
    group, clusters, plaque: PLAQUE,
    crown: crown.mesh, lastLeaf: leaf, leafGlow: glow, leafSparkles: sparkles, motes,   // 🎬 인트로(js/spaces/prologue-set.js)가 색·번짐을 덧칠한다
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
      leaf.visible = glow.visible = sparkles.visible = keep > 0.01;
      if (leaf.visible) {
        // 붙은 자리를 축으로 — 천천히 그네(앞면 축) + 잎자루 축으로 살랑 비틀림
        const swing = Math.sin(t * 1.3) * 0.1 + Math.sin(t * 2.9 + 1) * 0.025, flutter = Math.sin(t * 3.7) * 0.07 + Math.sin(t * 6.1) * 0.025;
        leaf.quaternion.setFromAxisAngle(ll.axes.face, swing).multiply(_q.setFromAxisAngle(ll.axes.stem, flutter));
        glow.material.opacity = keep * (0.38 + 0.18 * Math.sin(t * 2.1));
        _v.copy(ll.mid).applyQuaternion(leaf.quaternion).multiplyScalar(LS).add(tip);
        glow.position.copy(_v).addScaledVector(ll.axes.face, -0.35);
        const sp = sparkles.geometry.attributes.position.array, sc = sparkles.geometry.attributes.color.array;
        sparkles.userData.seed.forEach(([a0, r, spd, ph], i) => {
          const a = a0 + t * spd * 0.6, k = (t * spd * 0.35 + ph) % 1;   // 천천히 맴돌며 떠오르다 사라진다
          sp[i * 3] = _v.x + Math.cos(a) * r; sp[i * 3 + 1] = _v.y - 0.3 + k * 0.8; sp[i * 3 + 2] = _v.z + Math.sin(a) * r * 0.7;
          const b = keep * Math.sin(Math.PI * k) * (0.75 + 0.35 * Math.sin(t * 5 + i * 2.3));
          sc[i * 3] = b; sc[i * 3 + 1] = b; sc[i * 3 + 2] = b * 0.8;
        });
        sparkles.geometry.attributes.position.needsUpdate = true; sparkles.geometry.attributes.color.needsUpdate = true;
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
