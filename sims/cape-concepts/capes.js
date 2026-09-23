// sims/cape-concepts/capes.js
// =============================================================
//  🦸 망토 시안 — 지금 것(반구를 눌러 등에 붙인 덩어리)이 천으로 안 읽혀서 다시 잡는다.
//  ------------------------------------------------------------
//  ▶ 승자 하나를 js/cosmetics/art.js 의 BACK.cape 로 이식한다.
//  ▶ k = { R, HR, HY, bs, bodyY } — cosmetic-sim anchorsOf 와 같은 모양.
//    좌표계는 **등 앵커(back)** 로컬 — 원점이 등 표면이라, 몸 축으로 돌아오려면 +z 만큼 민다.
// =============================================================

import { buildCosmetic } from '../../js/cosmetics/art.js';

export const CAPE_P = Object.freeze({
  cloth: 0x7a8fc0,        // 겉감 — 블룸 임계 0.85 아래(현 PALETTE.cape 그대로)
  lining: 0x5d6f9e,       // 안감 — 겉감보다 어둡게. 자락이 뒤집힌 곳에서 두께가 읽힌다
  trim: 0xdcd0bc,         // 깃·여밈끈 (현 PALETTE.capeLine)
  clasp: 0xc9a227,        // 브로치 — 놋쇠(PALETTE.bell)
});

/** 면 하나를 두께 있는 천으로 굽는다.
 *  fn(u,v) → {x,y,z}. 겉면·안면·테두리까지 닫아 **자락 단면이 보이는** 껍데기를 만든다
 *  (한 겹 면은 뒤에서 보면 사라지거나 종이처럼 읽힌다).
 *  색은 정점에 싣는다 — 겉감/안감이 한 메시 안에서 갈린다(드로우콜 1).
 */
export function clothShell(THREE, fn, { segU = 44, segV = 16, thick = 0.02, out, inn }) {
  const nu = segU + 1, nv = segV + 1;
  const P = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const p = fn(i / segU, j / segV);
    P.push(new THREE.Vector3(p.x, p.y, p.z));
  }
  const at = (i, j) => P[j * nu + i];
  // 법선 — 이웃 차분의 외적
  const N = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const du = at(Math.min(i + 1, segU), j).clone().sub(at(Math.max(i - 1, 0), j));
    const dv = at(i, Math.min(j + 1, segV)).clone().sub(at(i, Math.max(j - 1, 0)));
    N.push(du.cross(dv).normalize());
  }
  const pos = [], col = [], idx = [];
  const cOut = new THREE.Color(out), cIn = new THREE.Color(inn);
  const push = (v, c) => { pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); };
  const h = thick / 2;
  // 0 .. nu*nv-1 : 겉면 / nu*nv .. : 안면
  for (let k = 0; k < P.length; k++) push(P[k].clone().addScaledVector(N[k], h), cOut);
  for (let k = 0; k < P.length; k++) push(P[k].clone().addScaledVector(N[k], -h), cIn);
  const base = nu * nv;
  for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
    const a = j * nu + i, b = a + 1, c = a + nu, d = c + 1;
    idx.push(a, c, b, b, c, d);                                            // 겉면
    idx.push(base + a, base + b, base + c, base + b, base + d, base + c);  // 안면(감김 반대)
  }
  // 테두리 — 아래 자락 · 좌우 앞단 · 윗단. 안 닫으면 자락이 종이처럼 읽힌다
  const rim = (i0, j0, i1, j1, n) => {
    for (let s = 0; s < n; s++) {
      const t0 = s / n, t1 = (s + 1) / n;
      const A = Math.round(i0 + (i1 - i0) * t0) + Math.round(j0 + (j1 - j0) * t0) * nu;
      const B = Math.round(i0 + (i1 - i0) * t1) + Math.round(j0 + (j1 - j0) * t1) * nu;
      idx.push(A, base + A, B, B, base + A, base + B);
    }
  };
  rim(0, segV, segU, segV, segU);         // 아랫자락
  rim(0, 0, 0, segV, segV);               // 왼쪽 앞단
  rim(segU, segV, segU, 0, segV);         // 오른쪽 앞단
  rim(segU, 0, 0, 0, segU);               // 윗단(깃이 덮지만 닫아 둔다)

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

/** 깃 + 여밈끈 + 브로치 — 망토는 **목에서 여며야** 망토로 읽힌다(그냥 천이면 담요다) */
function collar(THREE, g, { R, arc, rTop, yTop, trimMat, claspMat, zc }) {
  const tube = R * 0.062;
  const band = new THREE.Mesh(new THREE.TorusGeometry(rTop, tube, 5, 30, arc), trimMat);
  band.rotation.x = Math.PI / 2;
  // 토러스는 +x 에서 시작해 반시계로 그려진다 → 호의 가운데가 등(−z)을 보게 돌린다
  band.rotation.z = -Math.PI / 2 - arc / 2;
  band.position.set(0, yTop, zc);
  band.castShadow = true; g.add(band);

  // 여밈끈 — 남은 호를 목 앞에서 이어 준다(반지름을 줄여 목에 붙인다)
  const cord = new THREE.Mesh(new THREE.TorusGeometry(rTop * 0.82, tube * 0.42, 4, 16, Math.PI * 2 - arc), trimMat);
  cord.rotation.x = Math.PI / 2;
  cord.rotation.z = -Math.PI / 2 + arc / 2;
  cord.position.set(0, yTop - R * 0.02, zc);
  g.add(cord);

  // 브로치 — 앞 한가운데
  const br = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.085, R * 0.085, R * 0.05, 10), claspMat);
  br.rotation.x = Math.PI / 2;
  br.position.set(0, yTop - R * 0.02, zc + rTop * 0.84);
  g.add(br);
}

function paint(THREE, geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

/** 망토 한 벌. opt 로 시안이 갈린다.
 *  ▶ 반지름을 손으로 정하지 않는다 — **몸 타원체에서 푼다**(anchors.js 가 네 번 틀렸던 그 실수).
 *    깃이 몸보다 좁으면 망토가 몸 속에서 솟아난 치마로 읽힌다.
 *  ▶ 등 한가운데에 **뒤트임**을 낸다 — 🦊여우 꼬리가 지나갈 자리다(다른 동물에겐 그냥 뒤트임).
 */
function buildCape(THREE, g, k, opt) {
  const R = k.R, bs = k.bs;
  const zc = R * bs[2] * 0.98;                     // 등 앵커 → 몸 축
  const arc = opt.arc;
  const cloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const trimMat = new THREE.MeshStandardMaterial({ color: CAPE_P.trim, roughness: 0.95, metalness: 0, flatShading: true });
  const claspMat = new THREE.MeshStandardMaterial({ color: CAPE_P.clasp, roughness: 0.6, metalness: 0.15, flatShading: true });

  //  ── 높이 — 목(깃)에서 시작해 자락까지. 전부 앵커 로컬 ──
  const anchorY = k.bodyY + R * 0.30;
  const yNeck = (k.HY - k.HR * 0.58) - anchorY;    // 목줄이 이미 쓰는 높이(anchors.neckAnchor)
  const yTop = yNeck;
  const yBot = R * opt.bot;

  //  ── 반지름 — 목 둘레 · 어깨(몸 최대 폭) · 자락 ──
  const rNeck = k.HR * 0.92 * 1.02;                       // anchors.neckR 보다 한 겹 밖
  const hAt = y => {                                      // 높이 y(로컬)에서 몸의 가로 반지름
    const dy = (y + anchorY - k.bodyY) / (R * bs[1]);
    return R * bs[0] * Math.sqrt(Math.max(0.02, 1 - dy * dy));
  };
  //  ⚠️ 어깨 높이의 몸 폭으로만 잡으면 **배가 제일 굵은 데서 천이 몸을 뚫는다**(주름 골은 더 얕다).
  //     몸 최대 폭 × (여유 + 주름 골 깊이) 로 잡아 골에서도 안 뚫리게 한다.
  const bodyMax = R * Math.max(bs[0], bs[2]);
  const rShoulder = Math.max(hAt(yTop - R * 0.45), bodyMax) * (1.10 + opt.foldAmt);
  const rHem = rShoulder * opt.flare;

  const surf = (u, v) => {
    //  뒤트임 — 아래로 갈수록 벌어진다. u 는 [0,1] 을 좌/우 두 폭으로 나눠 쓴다
    //  위(깃 밑)는 거의 붙이고, 꼬리가 지나는 아래에서 크게 벌린다
    const vent = opt.vent * (0.16 + 0.84 * smooth(0.04, 0.42, v));
    const half = (arc / 2 - vent);
    const s = u < 0.5 ? -1 : 1;                           // 왼폭 / 오른폭
    const t = u < 0.5 ? (0.5 - u) * 2 : (u - 0.5) * 2;    // 0(트임) → 1(앞단)
    const th = s * (vent + half * t);

    const r0 = rNeck + (rShoulder - rNeck) * smooth(0, 0.30, v);
    const r = (r0 + (rHem - rShoulder) * smooth(0.30, 1, v))
            * (1 + opt.foldAmt * smooth(0.12, 1, v) * Math.cos(opt.folds * th));
    // 자락은 주름 사이가 처진다 — 일직선 밑단이면 천이 아니라 판때기다
    const y = yTop + (yBot - yTop) * v + opt.hem * R * v * v * Math.cos(opt.folds * th + Math.PI);
    const back = -opt.trail * R * v * v;                  // 자락이 뒤로 흐른다(옆에서 봤을 때)
    return { x: Math.sin(th) * r, y, z: zc - Math.cos(th) * r + back };
  };
  const m = new THREE.Mesh(clothShell(THREE, surf, {
    segU: opt.segU || 52, segV: 18, thick: R * 0.035, out: CAPE_P.cloth, inn: CAPE_P.lining,
  }), cloth);
  m.castShadow = true; g.add(m);

  collar(THREE, g, { R, arc, rTop: rNeck, yTop: yTop + R * 0.04, trimMat, claspMat, zc });

  if (opt.stand) {  // 세운 깃 — 목 뒤에서 위로 퍼져 선다. 실루엣이 제일 극적이다
    const arcC = Math.PI * 1.06;
    const hi = R * opt.stand;
    const stand = (u, v) => {
      const th = (u - 0.5) * arcC;
      const r = rNeck * (1 + 0.42 * v);
      const y = yTop + R * 0.02 + hi * v;
      return { x: Math.sin(th) * r, y, z: zc - Math.cos(th) * r - R * 0.10 * v };
    };
    const sc = new THREE.Mesh(clothShell(THREE, stand, {
      segU: 26, segV: 6, thick: R * 0.035, out: CAPE_P.cloth, inn: CAPE_P.lining,
    }), cloth);
    sc.castShadow = true; g.add(sc);
  }
}

// =============================================================
//  시안
// =============================================================
export const CAPES = {
  //  ⚡ 실물 — js/cosmetics/art.js 의 buildCosmetic('cape') 를 **그대로** 부른다.
  //     이식이 끝난 뒤 이 칸이 B 와 같아야 한다(복제본과 실물이 갈리는 사고를 막는 유일한 방법).
  real: {
    name: '실물(art.js)',
    build: (THREE, g, k) => { const m = buildCosmetic(THREE, 'cape', k); if (m) g.add(m); },
  },

  now: {
    name: '지금 것',
    build: (THREE, g, k) => {           // js/cosmetics/art.js BACK.cape 원본 — 비교 기준
      const R = k.R;
      const soft = c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0 });
      const clay = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, flatShading: true });
      const c = new THREE.Mesh(new THREE.SphereGeometry(R * 0.92, 18, 14, 0, Math.PI), soft(0x7a8fc0));
      c.position.set(0, -R * 0.22, R * 0.10); c.scale.set(1.02, 1.16, 0.42); c.rotation.y = Math.PI / 2;
      c.castShadow = true; g.add(c);
      const col = new THREE.Mesh(new THREE.TorusGeometry(R * 0.44, R * 0.07, 4, 16, Math.PI * 1.25), clay(0xdcd0bc));
      col.position.set(0, R * 0.52, R * 0.06); col.rotation.set(Math.PI / 2, 0, -Math.PI * 0.62);
      g.add(col);
    },
  },

  // A) 매끈 — 주름 없이 떨어지는 긴 망토. 제일 얌전하다
  cone: {
    name: 'A 매끈',
    build: (THREE, g, k) => buildCape(THREE, g, k, {
      arc: Math.PI * 1.50, bot: -1.05, flare: 1.18, vent: 0.50,
      folds: 0, foldAmt: 0, hem: 0, trail: 0.10, segU: 44,
    }),
  },

  // B) 주름 — 세로 주름 + 물결 자락. 천으로 읽히는 건 결국 주름이다
  gore: {
    name: 'B 주름',
    build: (THREE, g, k) => buildCape(THREE, g, k, {
      arc: Math.PI * 1.50, bot: -1.05, flare: 1.22, vent: 0.50,
      folds: 8, foldAmt: 0.075, hem: 0.09, trail: 0.10,
    }),
  },

  // C) 세운 깃 — B + 목 뒤로 선 깃. 실루엣이 제일 극적이다
  //    (후드는 뺐다 — 젖힌 후드는 등에 붙은 베개로 읽히고, 머리를 덮는 건 귀 처리 규칙이 서야 한다)
  stand: {
    name: 'C 세운깃',
    build: (THREE, g, k) => buildCape(THREE, g, k, {
      arc: Math.PI * 1.50, bot: -1.05, flare: 1.22, vent: 0.50,
      folds: 8, foldAmt: 0.075, hem: 0.09, trail: 0.10, stand: 0.52,
    }),
  },

  // B′) 좁은 폭 — 팔 앞에서 끊는다(팔 각도 ±102~104°). 팔이 천을 뚫지 않는다
  narrow: {
    name: "B' 좁은폭",
    build: (THREE, g, k) => buildCape(THREE, g, k, {
      arc: Math.PI * 1.06, bot: -1.05, flare: 1.22, vent: 0.50,
      folds: 8, foldAmt: 0.075, hem: 0.09, trail: 0.10,
    }),
  },

  // D) 어깨 케이프 — 짧게 어깨만 덮는다. 통통한 몸에 긴 망토는 종(鐘)이 되기 쉽다
  short: {
    name: 'D 어깨',
    build: (THREE, g, k) => buildCape(THREE, g, k, {
      arc: Math.PI * 1.56, bot: -0.30, flare: 1.10, vent: 0.44,
      folds: 10, foldAmt: 0.06, hem: 0.05, trail: 0.04,
    }),
  },
};
