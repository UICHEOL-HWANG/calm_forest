const TAU = Math.PI * 2;
const MAPLE_LOBES = [[Math.PI / 2, 1], [Math.PI / 2 - 1.0, 0.86], [Math.PI / 2 + 1.0, 0.86], [Math.PI / 2 - 2.05, 0.58], [Math.PI / 2 + 2.05, 0.58]];

export function mapleLeafShape(THREE, r, N = 110) {
  const s = new THREE.Shape();
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + i / N * TAU; let p = 0;
    MAPLE_LOBES.forEach(([c, h]) => { const d = Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))); p = Math.max(p, h * Math.max(0, 1 - d / 0.5)); });
    const rr = r * (0.3 + 0.7 * p + 0.07 * Math.abs(Math.sin(a * 9)) * p);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr + r * 0.15;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath(); return s;
}

export function extraKit(THREE, K) {
  const { clay, M, V, ext } = K;
  const small = m => { m.userData.small = true; return m; };
  function starShape(r, k = 0.46, n = 5, cx = 0, cy = 0, path = null) {
    const s = path || new THREE.Shape();
    for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * k : r; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
    s.closePath(); return s;
  }
  const polyShape = (pts, path = null) => { const s = path || new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; };
  const hexPts = (r, cx = 0, cy = 0, rot = 0) => Array.from({ length: 6 }, (_, i) => [cx + Math.cos(rot + i * Math.PI / 3) * r, cy + Math.sin(rot + i * Math.PI / 3) * r]);
  const circlePath = (r, cx, cy) => { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, TAU, true); return p; };
  function roundBlade(bw, bh) {
    const sh = new THREE.Shape();
    sh.moveTo(-bw, 0); sh.lineTo(-bw, bh); sh.absarc(0, bh, bw, Math.PI, 0, true); sh.lineTo(bw, 0); sh.closePath();
    return sh;
  }
  function scallopBlade(bw, bh, n = 6) {
    const sh = new THREE.Shape(); sh.moveTo(-bw, 0); sh.lineTo(-bw, bh);
    const N = n * 6;
    for (let i = 0; i <= N; i++) { const t = i / N, a = Math.PI - Math.PI * t, rr = bw * (0.93 + 0.07 * Math.abs(Math.sin(Math.PI * n * t))); sh.lineTo(Math.cos(a) * rr, bh + Math.sin(a) * rr); }
    sh.lineTo(bw, 0); sh.closePath(); return sh;
  }
  function scallopFan(r, a0, a1, n) {
    const s = new THREE.Shape(); s.moveTo(0, 0); const N = n * 6;
    for (let i = 0; i <= N; i++) { const t = i / N, a = a0 + (a1 - a0) * t, rr = r * (0.92 + 0.08 * Math.abs(Math.sin(Math.PI * n * t))); s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    s.closePath(); return s;
  }
  const mapleShape = r => mapleLeafShape(THREE, r);
  const puffStar = (r, k = 0.5, n = 5) => ext(starShape(r, k, n), r * 0.3, r * 0.2, 4);
  const flake = r => ext(starShape(r, 0.32, 6), r * 0.16, r * 0.05, 2);
  const faceX = (m, dir = 1) => { m.rotation.y = dir * Math.PI / 2; return m; };
  function rib(parent, mat, a, r0, r1, z, w = 0.008) {
    const len = r1 - r0, b = M(new THREE.BoxGeometry(len, w, 0.006), mat, Math.cos(a) * (r0 + len / 2), Math.sin(a) * (r0 + len / 2), z);
    b.rotation.z = a; parent.add(b); return b;
  }
  const hemi = (r, mat, x, y, z, sy = 0.7, ws = 14) => { const m = M(new THREE.SphereGeometry(r, ws, 7, 0, TAU, 0, Math.PI / 2), mat, x, y, z); m.scale.y = sy; return m; };
  function handle(g, P, l, r = 0.030) {
    g.add(M(new THREE.CylinderGeometry(r * 0.8, r, l, 7), clay(P.wood), 0, l / 2 - 0.08, 0));
    g.add(M(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.07, 7), clay(P.grip), 0, -0.02, 0));
    if (P.knobFn) P.knobFn(g, r); else g.add(M(new THREE.SphereGeometry(r * 1.35, 7, 6), clay(P.knob ?? P.grip), 0, -0.08, 0));
    (P.bands ?? []).forEach(([c, f]) => g.add(M(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 0.022, 7), clay(c), 0, l * f - 0.08, 0)));
    return l - 0.08;
  }
  function rodFrame(g, { knobFn, rear, pole, line = 0xe8e4d8 }, bob) {
    knobFn(g);
    g.add(M(new THREE.CylinderGeometry(0.026, 0.030, 0.20, 7), rear, 0, -0.01, 0));
    const poleG = new THREE.Group(); poleG.position.y = 0.08; poleG.rotation.z = -0.12; g.add(poleG);
    const RL = 0.92; pole(poleG, RL);
    const lineG = new THREE.Group(); lineG.position.y = RL; lineG.rotation.z = 0.12; poleG.add(lineG);
    lineG.add(M(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 5), clay(line), 0, -0.17, 0));
    const b = new THREE.Group(); b.position.y = -0.38; lineG.add(b); bob(b);
    g.scale.setScalar(1.25);
  }
  function pickArms(hd, segMat, tipMat) {
    [-1, 1].forEach(sx => {
      const TH = [0.14, 0.32], LEN = [0.13, 0.12]; let px = sx * 0.042, py = 0.012;
      for (let i = 0; i < 2; i++) {
        const dx = Math.cos(TH[i]) * sx, dy = -Math.sin(TH[i]);
        const seg = M(new THREE.BoxGeometry(LEN[i], 0.048 - i * 0.012, 0.05 - i * 0.012), Array.isArray(segMat) ? segMat[i] : segMat, px + dx * LEN[i] / 2, py + dy * LEN[i] / 2, 0);
        seg.rotation.z = -sx * TH[i]; hd.add(seg); px += dx * LEN[i]; py += dy * LEN[i];
      }
      const t3 = 0.48, dx = Math.cos(t3) * sx, dy = -Math.sin(t3);
      const tip = M(new THREE.ConeGeometry(0.020, 0.085, 6), tipMat, px + dx * 0.042, py + dy * 0.042, 0);
      tip.rotation.z = -sx * (Math.PI / 2 + t3); hd.add(tip);
    });
  }
  function sickleBlade(g, top, segMat, edgeMat, wk = 1) {
    const bl = new THREE.Group(); bl.position.y = top + 0.01; bl.rotation.y = 0.10; g.add(bl);
    const TH = [0.06, 0.28, 0.60], LEN = [0.15, 0.12, 0.10], W = [0.055 * wk, 0.045 * wk, 0.030 * wk]; let px = 0, py = 0;
    for (let i = 0; i < 3; i++) {
      const dx = Math.sin(TH[i]), dy = Math.cos(TH[i]);
      const seg = M(new THREE.BoxGeometry(W[i], LEN[i], 0.016), Array.isArray(segMat) ? segMat[i] : segMat, px + dx * LEN[i] / 2, py + dy * LEN[i] / 2, 0); seg.rotation.z = -TH[i]; bl.add(seg);
      const edge = M(new THREE.BoxGeometry(0.013, LEN[i] * 0.94, 0.012), edgeMat, px + dx * LEN[i] / 2 + dy * (W[i] / 2), py + dy * LEN[i] / 2 - dx * (W[i] / 2), 0); edge.rotation.z = -TH[i]; bl.add(edge);
      px += dx * LEN[i]; py += dy * LEN[i];
    }
    return { bl, tip: V(px, py, 0) };
  }
  const netBag = (color, opacity) => clay(color, { opacity, side: THREE.DoubleSide });
  const goreSurf = (R, th, phi) => { const p = V(-Math.cos(phi) * Math.sin(th) * R, (Math.cos(th) - 1) * R, Math.sin(phi) * Math.sin(th) * R); return { p, n: p.clone().add(V(0, R, 0)).normalize() }; };
  return { TAU, small, starShape, polyShape, hexPts, circlePath, roundBlade, scallopBlade, scallopFan, mapleShape, puffStar, flake, faceX, rib, hemi,
    handle, rodFrame, pickArms, sickleBlade, netBag, goreSurf };
}
