// =============================================================
//  calm forest · 🦇 박쥐 회오리 스프라이트 — 날갯짓 4프레임 아틀라스 + THREE.Points 하나(드로우콜 +1)
//  ------------------------------------------------------------
//  시안: sims/halloween-trail-sim.html 「🦇 B · 박쥐 회오리」(helixCell) — drawBat·makeAtlas·makePoints 를 옮겼다.
//  ▶ THREE 는 인자로 받는다(node 테스트는 three 를 못 부른다 — trail-fx.js 와 같은 규칙).
//  ▶ 입자 계산(나선·수명·밝기)은 trail-fx.js 의 순수 함수가 한다. 여기는 그리기만.
//  ▶ 블룸 임계 0.85: 흰 배·눈이 번지지 않게 정점색으로 밝기를 임계 아래로 누른다(BAT_LUMA).
//  ▶ 지오메트리·재질·텍스처는 모두 여기서 만들고 dispose() 로 정리한다.
// =============================================================

const FLAP = [1, 0.3, -0.7, 0.3];                 // 날갯짓 한 바퀴 — +1 활짝 위 … -1 아래
const ST_B = { body: '#b9a0f2', wing: '#dccbff', out: '#6a48b0', belly: '#fff0f6', eye: '#fff', pupil: '#3b2a66', cheek: '#ffb6d0' };   // 연보라 동글 박쥐(시안 B)
const BAT_LUMA = { day: 0.84, night: 0.78 };      // 밤엔 블룸 세기가 두 배라 조금 더 누른다
const FLAP_HZ = 9;                                // 초당 프레임 넘김(시안 helixCell)
const GROW_T = 0.25;                              // 톡 커지는 시간(초)

const clamp01 = x => Math.max(0, Math.min(1, x));
const outBack = x => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };

/** 박쥐 한 장 — a: 날갯짓(+1 활짝 위 … -1 아래), st: 색 */
function drawBat(c, S, a, st) {
  c.save(); c.translate(S / 2, S / 2 + S * 0.04); c.scale(S * 0.5, S * 0.5);
  const th = a * 0.85;
  const wing = s => {
    const sh = [s * 0.14, -0.05], tip = [s * 0.86 * Math.cos(th), -0.05 - 0.86 * Math.sin(th)], hip = [s * 0.13, 0.3];
    c.beginPath(); c.moveTo(...sh);
    c.quadraticCurveTo((sh[0] + tip[0]) / 2, Math.min(sh[1], tip[1]) - 0.16 + (th < 0 ? 0.1 : 0), ...tip);
    for (let i = 0; i < 3; i++) {             // 날개 아랫단 — 부채꼴 세 마디
      const A = [tip[0] + (hip[0] - tip[0]) * i / 3, tip[1] + (hip[1] - tip[1]) * i / 3], B = [tip[0] + (hip[0] - tip[0]) * (i + 1) / 3, tip[1] + (hip[1] - tip[1]) * (i + 1) / 3];
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L;
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      if (nx * (mx - sh[0]) + ny * (my - sh[1]) < 0) { nx = -nx; ny = -ny; }
      const bulge = 0.17 * (i === 2 ? 0.5 : 1);
      c.quadraticCurveTo(mx + nx * bulge, my + ny * bulge, ...B);
    }
    c.closePath();
    if (st.rim) { c.lineWidth = 0.13; c.strokeStyle = st.rim; c.stroke(); }
    c.fillStyle = st.wing; c.fill(); c.lineWidth = 0.05; c.strokeStyle = st.out; c.stroke();
  };
  wing(-1); wing(1);
  c.beginPath(); c.ellipse(0, 0.04, 0.22, 0.3, 0, 0, 7);
  c.moveTo(0.17, -0.3); c.arc(0, -0.3, 0.17, 0, 7);
  [-1, 1].forEach(s => { c.moveTo(s * 0.04, -0.4); c.lineTo(s * 0.15, -0.44); c.lineTo(s * 0.19, -0.66); c.lineTo(s * 0.02, -0.46); });
  if (st.rim) { c.lineWidth = 0.13; c.strokeStyle = st.rim; c.stroke(); }
  c.fillStyle = st.body; c.fill(); c.lineWidth = 0.05; c.strokeStyle = st.out; c.stroke();
  if (st.belly) { c.beginPath(); c.ellipse(0, 0.1, 0.12, 0.2, 0, 0, 7); c.fillStyle = st.belly; c.fill(); }
  [-1, 1].forEach(s => {
    c.beginPath(); c.arc(s * 0.075, -0.31, 0.058, 0, 7); c.fillStyle = st.eye; c.fill();
    if (st.pupil) { c.beginPath(); c.arc(s * 0.075, -0.3, 0.03, 0, 7); c.fillStyle = st.pupil; c.fill(); }
    if (st.cheek) { c.beginPath(); c.arc(s * 0.13, -0.22, 0.04, 0, 7); c.fillStyle = st.cheek; c.fill(); }
  });
  c.restore();
}

/** 프레임마다 그리는 함수 목록 → 가로로 이어 붙인 아틀라스 한 장 */
function makeAtlas(THREE, fns) {
  const S = 128, c = document.createElement('canvas'); c.width = S * fns.length; c.height = S;
  const g = c.getContext('2d');
  fns.forEach((fn, i) => { g.save(); g.translate(i * S, 0); g.beginPath(); g.rect(0, 0, S, S); g.clip(); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g, S); g.restore(); });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;          // 캔버스 색 그대로 — 셰이더 끝의 colorspace_fragment 와 짝
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return { tex, n: fns.length };
}

const ATTRS = { position: 3, aColor: 3, aSize: 1, aAlpha: 1, aFrame: 1, aRot: 1 };

/** 점마다 아틀라스 칸·회전·크기를 주는 Points — 시안 makePoints. 크기는 월드 단위(원근 감쇠) */
function makePoints(THREE, atlas, cap) {
  const geo = new THREE.BufferGeometry();
  const arr = {};
  for (const [k, n] of Object.entries(ATTRS)) { arr[k] = new Float32Array(cap * n); geo.setAttribute(k, new THREE.BufferAttribute(arr[k], n)); }
  geo.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { map: { value: atlas.tex }, uNF: { value: atlas.n }, uScale: { value: 300 } },
    vertexShader: `attribute vec3 aColor; attribute float aSize, aAlpha, aFrame, aRot; uniform float uScale;
      varying vec3 vC; varying float vA, vF, vR;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_PointSize = aSize*uScale/(-mv.z); vC=aColor; vA=aAlpha; vF=aFrame; vR=aRot; }`,
    fragmentShader: `uniform sampler2D map; uniform float uNF; varying vec3 vC; varying float vA, vF, vR;
      void main(){ vec2 p = gl_PointCoord-.5; float s=sin(vR), c=cos(vR); p = vec2(c*p.x - s*p.y, s*p.x + c*p.y)+.5;
        if(p.x<0.||p.x>1.||p.y<0.||p.y>1.) discard;
        vec4 t = texture2D(map, vec2((vF+p.x)/uNF, 1.-p.y)); gl_FragColor = vec4(t.rgb*vC, t.a*vA);
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; points.renderOrder = 5;
  //  ⚠️ 점 크기(px) = 월드 크기 × 뷰포트 세로 / (2·tan(fov/2)) / 거리 — 렌더 직전에 그 뷰포트·카메라 값으로 맞춘다
  //     (게임 본화면·상점 미리보기·구매 연출이 각자 다른 렌더러를 쓴다. 캔버스 전체가 아니라 **지금 뷰포트** 높이 —
  //      캔버스를 나눠 그리면 캔버스 높이로는 박쥐가 그 배수만큼 커진다)
  const vp = new THREE.Vector4();
  points.onBeforeRender = (renderer, _scene, camera) => {
    if (!camera.isPerspectiveCamera) return;
    renderer.getCurrentViewport(vp);
    mat.uniforms.uScale.value = vp.w / (2 * Math.tan(camera.fov * Math.PI / 360));
  };
  return { points, geo, mat, arr };
}

/** 🦇 박쥐 스프라이트 묶음 — setBats(입자 목록, 밤 정도) 로 매 프레임 그린다 */
export function createBatSprites(THREE, { cap = 16 } = {}) {
  const atlas = makeAtlas(THREE, FLAP.map(a => (c, S) => drawBat(c, S, a, ST_B)));
  const { points, geo, mat, arr } = makePoints(THREE, atlas, cap);

  /** list: kind 'bat' 입자(trail-fx.js particleStep 결과 + alpha + ang) — 넘치면 가장 새 박쥐를 남긴다 */
  function setBats(list, nightLevel = 0) {
    const shown = list.length > cap ? list.slice(-cap) : list;
    const n = shown.length, luma = nightLevel >= 0.5 ? BAT_LUMA.night : BAT_LUMA.day;
    for (let i = 0; i < n; i++) {
      const p = shown[i], ang = p.ang, depth = Math.sin(ang);
      arr.position.set([p.x, p.y, p.z], i * 3);
      arr.aColor.set([luma, luma, luma], i * 3);
      arr.aSize[i] = p.size * outBack(p.age / GROW_T) * (0.88 + 0.12 * depth);   // 앞으로 돌 때 살짝 크게 — 원근감
      arr.aAlpha[i] = p.alpha * (0.85 + 0.15 * depth);
      arr.aFrame[i] = Math.floor((p.age * FLAP_HZ + p.phase) % FLAP.length);
      arr.aRot[i] = -Math.cos(ang) * p.dir * 0.25;                               // 도는 쪽으로 몸을 기울인다
    }
    geo.setDrawRange(0, n);
    for (const k in ATTRS) geo.attributes[k].needsUpdate = true;
  }

  function dispose() { geo.dispose(); mat.dispose(); atlas.tex.dispose(); }

  return { points, setBats, dispose };
}
