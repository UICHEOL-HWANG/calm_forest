const C = {
  wood: 0xd9a066, woodM: 0xc9935f, woodD: 0x8f633f, woodDD: 0x6b4a34, bark: 0x7a5536, ring: 0xecd09a,
  metal: 0x8b8b93, metalD: 0x55555d, steel: 0xc9ccd4, wrench: 0x7d7f88,
  cream: 0xfff2e0, board: 0xf3e3c0, teal: 0x5f9e94, red: 0xd9503f, coral: 0xff8f8f, orange: 0xf0a040, yellow: 0xffd23f,
  gold: 0xe0b04a, mint: 0x9fd8c0, stageRed: 0xb8433f, stageRedD: 0x9c3533, roof: 0xc8643c, roofD: 0xa84f2e,
  up: 0x3fae5f, down: 0xe0574a, apple: 0xd8503a, cabbage: 0x9fd36a, carrot: 0xf08a2a, leaf: 0x5ea062,
  berry: 0xe8463c, cap: 0x3a2a20, dust: 0xead7a8, shirt: 0x6fae7f, skin: 0xffe0c0,
};

const SAMPLE = { title: '📊 시세판', hi: '🍓 비싸요  +32%', lo: '🥕 싸요  -18%', foot: '가격은 매일 자정에 바뀌어요' };

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const texCache = new WeakMap();
function woodTexture(THREE) {
  if (texCache.has(THREE)) return texCache.get(THREE);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'), r = rng(7);
  c.fillStyle = '#d9a066'; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#a9743f'; c.lineWidth = 3;
  for (let y = 20; y < 128; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke(); }
  c.strokeStyle = 'rgba(150,95,55,0.28)'; c.lineWidth = 1.2;
  for (let i = 0; i < 46; i++) {
    const y = r() * 128; c.beginPath(); c.moveTo(0, y);
    for (let x = 0; x <= 128; x += 12) c.lineTo(x, y + Math.sin(x * 0.12 + i) * 1.8);
    c.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(THREE, t);
  return t;
}

function woodMat(THREE, rx = 1, ry = 1) {
  const t = woodTexture(THREE).clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, metalness: 0 });
}
function clayMat(THREE, color, flat = true) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: flat });
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function tri(c, x, y, s, up) {
  c.beginPath();
  if (up) { c.moveTo(x, y - s); c.lineTo(x + s, y + s * 0.7); c.lineTo(x - s, y + s * 0.7); }
  else { c.moveTo(x, y + s); c.lineTo(x + s, y - s * 0.7); c.lineTo(x - s, y - s * 0.7); }
  c.closePath(); c.fill();
}

function priceLines(c, hiCol, loCol) {
  c.font = 'bold 46px sans-serif'; c.textAlign = 'left';
  c.fillStyle = hiCol; tri(c, 62, 172, 18, true); c.fillText(SAMPLE.hi, 96, 188);
  c.fillStyle = loCol; tri(c, 62, 238, 18, false); c.fillText(SAMPLE.lo, 96, 254);
  c.textAlign = 'center';
}

function boardTexture(THREE, style) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320;
  const c = cv.getContext('2d');
  c.textAlign = 'center';
  if (style === 'paper') {
    c.fillStyle = '#6a4c32'; c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#f7f0dc'; c.fillRect(18, 18, 476, 284);
    c.fillStyle = '#8a6a48';
    [[34, 34], [478, 34], [34, 286], [478, 286]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); });
    c.fillStyle = '#4a3b28'; c.font = 'bold 74px sans-serif'; c.fillText(SAMPLE.title, 256, 96);
    c.strokeStyle = '#d9cdb0'; c.lineWidth = 4; c.beginPath(); c.moveTo(50, 122); c.lineTo(462, 122); c.stroke();
    c.font = 'bold 48px sans-serif';
    c.fillStyle = '#2fa564'; c.fillText(SAMPLE.hi, 256, 186);
    c.fillStyle = '#d05a4a'; c.fillText(SAMPLE.lo, 256, 248);
    c.fillStyle = '#8a7a5f'; c.font = '26px sans-serif'; c.fillText(SAMPLE.foot, 256, 292);
  } else if (style === 'chalk') {
    c.fillStyle = '#34503f'; c.fillRect(0, 0, 512, 320);
    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 5; i++) { roundRect(c, 30 + i * 90, 20 + (i % 2) * 140, 120, 120, 60); c.fill(); }
    c.fillStyle = '#efe6cf'; c.font = 'bold 72px sans-serif'; c.fillText(SAMPLE.title, 256, 92);
    c.strokeStyle = 'rgba(239,230,207,0.55)'; c.lineWidth = 4; c.setLineDash([16, 12]);
    c.beginPath(); c.moveTo(46, 120); c.lineTo(466, 120); c.stroke(); c.setLineDash([]);
    priceLines(c, '#8fe3a2', '#ffab98');
    c.fillStyle = 'rgba(239,230,207,0.7)'; c.font = '25px sans-serif'; c.fillText(SAMPLE.foot, 256, 300);
  } else if (style === 'stage') {
    c.fillStyle = '#f6ead2'; c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#b8433f'; c.fillRect(0, 0, 512, 116);
    c.fillStyle = '#fff2e0'; c.font = 'bold 72px sans-serif'; c.fillText(SAMPLE.title, 256, 84);
    priceLines(c, '#2fa564', '#d05a4a');
    c.fillStyle = '#8a7a5f'; c.font = '25px sans-serif'; c.fillText(SAMPLE.foot, 256, 300);
  } else {
    c.fillStyle = '#f7f0dc'; c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#4a3b28'; c.font = 'bold 72px sans-serif'; c.fillText(SAMPLE.title, 256, 84);
    c.strokeStyle = '#d9cdb0'; c.lineWidth = 4; c.beginPath(); c.moveTo(46, 116); c.lineTo(466, 116); c.stroke();
    priceLines(c, '#2fa564', '#d05a4a');
    c.fillStyle = '#8a7a5f'; c.font = '25px sans-serif'; c.fillText(SAMPLE.foot, 256, 300);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  return tex;
}

function signTexture(THREE, label) {
  const W = 640, H = 260;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#e8d3a8'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#c9a86e'; c.fillRect(0, 0, W, 22); c.fillRect(0, H - 22, W, 22);
  c.fillStyle = '#8a6a3a'; c.fillRect(0, 0, W, 9); c.fillRect(0, H - 9, W, 9);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'bold 128px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  c.fillStyle = '#4a3a24'; c.fillText(label, W / 2, H / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  return tex;
}

function kit(THREE) {
  const buckets = new Map();
  const tint = new THREE.Color();
  const paint = (geo, hex) => {
    tint.set(hex);
    const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = tint.r; arr[i * 3 + 1] = tint.g; arr[i * 3 + 2] = tint.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const add = (bucket, hex, geo) => {
    const g = paint(geo.index ? geo.toNonIndexed() : geo, hex);
    const list = buckets.get(bucket);
    if (list) list.push(g); else buckets.set(bucket, [g]);
  };
  const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const cyl = (rt, rb, h, x = 0, y = 0, z = 0, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
  const ball = (r, x = 0, y = 0, z = 0, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
  const UP = new THREE.Vector3(0, 1, 0);
  const beam = (a, b, r, seg = 6) => {
    const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b);
    const d = pb.clone().sub(pa), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
    const mid = pa.add(pb).multiplyScalar(0.5);
    return new THREE.CylinderGeometry(r, r, len, seg).applyQuaternion(q).translate(mid.x, mid.y, mid.z);
  };
  const shape = (pts, holes = []) => {
    const s = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    for (const h of holes) {
      const p = new THREE.Path();
      h.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      s.holes.push(p);
    }
    return s;
  };
  const extrude = (s, depth) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -depth / 2);

  const MATS = {
    body: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }),
    fine: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true, side: THREE.DoubleSide }),
    wood: () => new THREE.MeshStandardMaterial({ vertexColors: true, map: woodTexture(THREE), roughness: 0.82, metalness: 0 }),
    metal: () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35, flatShading: true }),
  };

  const merge = (geos) => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv', 'color']) {
      const size = geos[0].attributes[name].itemSize;
      const total = geos.reduce((n, g) => n + g.attributes[name].count, 0);
      const arr = new Float32Array(total * size);
      let off = 0;
      for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
      out.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    out.computeBoundingSphere();
    return out;
  };

  const finish = (extra = []) => {
    const group = new THREE.Group(), lamps = [];
    for (const [b, geos] of buckets) {
      let mat;
      if (b.startsWith('lamp')) {
        const hex = Number(b.split(':')[1]);
        mat = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.2, roughness: 0.6, flatShading: true });
        lamps.push(mat);
      } else mat = MATS[b]();
      const m = new THREE.Mesh(merge(geos), mat);
      for (const g of geos) g.dispose();
      m.castShadow = b === 'body' || b === 'wood' || b === 'metal';
      m.receiveShadow = !b.startsWith('lamp');
      group.add(m);
    }
    for (const m of extra) group.add(m);
    group.userData.lamps = lamps;
    return group;
  };

  return { add, box, cyl, ball, beam, shape, extrude, finish, THREE };
}

function placer(k, x, y, z, s, rz) {
  return (b, c, g) => k.add(b, c, g.scale(s, s, 1).rotateZ(rz).translate(x, y, z));
}

function saw(k, x, y, z, s = 1, rz = 0, d = 0.04) {
  const put = placer(k, x, y, z, s, rz);
  const teeth = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    teeth.push([-0.1 + 0.07 * t - (i % 2 ? 0.035 : 0), -0.62 * t]);
  }
  put('metal', C.steel, k.extrude(k.shape([[0.1, 0], [0.05, -0.62], ...teeth.reverse()]), d));
  put('body', C.red, k.extrude(k.shape(
    [[-0.13, -0.02], [0.13, -0.02], [0.13, 0.2], [-0.13, 0.2]],
    [[[-0.07, 0.04], [0.07, 0.04], [0.07, 0.14], [-0.07, 0.14]]]), d + 0.02));
}

function hammer(k, x, y, z, s = 1, rz = 0, d = 0.05) {
  const put = placer(k, x, y, z, s, rz);
  put('body', C.woodD, k.box(0.075, 0.6, d, 0, -0.3, 0));
  put('metal', C.metalD, k.box(0.34, 0.13, d + 0.03, 0.03, 0.02, 0));
  put('metal', C.metalD, k.extrude(k.shape([[-0.14, -0.04], [-0.26, 0.1], [-0.2, 0.1], [-0.12, 0.05]]), d + 0.03));
}

function wrench(k, x, y, z, s = 1, rz = 0) {
  const put = placer(k, x, y, z, s, rz);
  put('metal', C.wrench, k.box(0.08, 0.5, 0.045, 0, -0.27, 0));
  put('metal', C.wrench, new k.THREE.TorusGeometry(0.085, 0.04, 6, 12, Math.PI * 1.45).rotateZ(Math.PI * 0.78).translate(0, 0.05, 0));
  put('metal', C.wrench, new k.THREE.TorusGeometry(0.06, 0.035, 6, 12).translate(0, -0.55, 0));
}

function gearShape(k, R, n = 8) {
  const pts = [], ri = R * 0.76;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, w = Math.PI / n;
    for (const [aa, rr] of [[a - w * 0.5, ri], [a - w * 0.3, R], [a + w * 0.3, R], [a + w * 0.5, ri]]) pts.push([Math.cos(aa) * rr, Math.sin(aa) * rr]);
  }
  const hole = [];
  for (let i = 0; i < 12; i++) { const a = -(i / 12) * Math.PI * 2; hole.push([Math.cos(a) * R * 0.32, Math.sin(a) * R * 0.32]); }
  return k.shape(pts, [hole]);
}

function arrowShape(k) {
  return k.shape([[0, 0.5], [0.32, 0.12], [0.13, 0.12], [0.13, -0.32], [-0.13, -0.32], [-0.13, 0.12], [-0.32, 0.12]]);
}

function lantern(k, x, y, z, color, s = 1) {
  k.add(`lamp:${color}`, color, new k.THREE.SphereGeometry(0.15 * s, 10, 8).scale(1, 1.2, 1).translate(x, y, z));
  k.add('fine', C.cap, k.cyl(0.07 * s, 0.07 * s, 0.05 * s, x, y + 0.19 * s, z));
  k.add('fine', C.cap, k.cyl(0.05 * s, 0.05 * s, 0.04 * s, x, y - 0.19 * s, z));
}

function crate(k, x, z, ry, fill) {
  const parts = [];
  const p = (b, c, geo) => parts.push([b, c, geo]);
  p('wood', 0xffffff, k.box(0.56, 0.3, 0.4, 0, 0.15, 0));
  p('body', C.woodD, k.box(0.6, 0.06, 0.44, 0, 0.31, 0));
  if (fill === 'apple') {
    for (const [fx, fz] of [[-0.16, -0.08], [0, -0.09], [0.16, -0.07], [-0.08, 0.08], [0.09, 0.08]]) p('body', C.apple, k.ball(0.1, fx, 0.37, fz, 0.92));
  } else if (fill === 'cabbage') {
    for (const [fx, fz] of [[-0.14, -0.04], [0.14, -0.04], [0, 0.07]]) p('body', C.cabbage, k.ball(0.14, fx, 0.37, fz, 0.85));
  } else {
    for (let i = 0; i < 5; i++) {
      const fx = -0.18 + i * 0.09;
      p('body', C.carrot, new k.THREE.ConeGeometry(0.05, 0.28, 6).rotateX(Math.PI / 2 - 0.3).translate(fx, 0.38, 0.02));
      p('fine', C.leaf, new k.THREE.ConeGeometry(0.045, 0.12, 5).rotateX(-Math.PI / 2 - 0.3).translate(fx, 0.34, -0.17));
    }
  }
  const m = new k.THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z);
  for (const [b, c, geo] of parts) k.add(b, c, geo.applyMatrix4(m));
}

function signpost(THREE, label, x, z) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6), woodMat(THREE));
  post.position.set(x, 0.75, z); post.castShadow = true;
  const face = new THREE.MeshStandardMaterial({ map: signTexture(THREE, label), roughness: 0.8 });
  const side = new THREE.MeshStandardMaterial({ color: 0xcdb083, roughness: 0.85 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2 * 260 / 640, 0.1), [side, side, side, side, face, face]);
  sign.scale.setScalar(0.55); sign.position.set(x, 1.45, z + 0.04); sign.castShadow = true;
  return [post, sign];
}

function workbenchNow(THREE) {
  const g = new THREE.Group();
  const put = (m, x, y, z, cast = true) => { m.position.set(x, y, z); m.castShadow = cast; g.add(m); return m; };
  put(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.9), woodMat(THREE, 2, 1)), 0, 0.7, 0);
  for (const [x, z] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) put(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), clayMat(THREE, 0x6b4a34)), x, 0.35, z, false);
  put(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.22), clayMat(THREE, 0x8b8b93)), -0.35, 0.88, 0);
  put(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.1), woodMat(THREE)), 0.4, 0.81, 0.12, false).rotation.y = 0.5;
  put(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.16), clayMat(THREE, 0x6e6e76)), 0.52, 0.83, 0.05, false).rotation.y = 0.5;
  for (const m of signpost(THREE, '작업대', 1.2, 0.7)) g.add(m);
  g.userData.lamps = [];
  return g;
}

function birdhouse(k, x, y, z) {
  k.add('body', C.woodM, k.box(0.26, 0.24, 0.24, x, y + 0.12, z));
  for (const s of [-1, 1]) k.add('body', C.red, k.box(0.2, 0.04, 0.32).rotateZ(-s * 0.7).translate(x + s * 0.075, y + 0.3, z));
  k.add('fine', C.cap, k.cyl(0.045, 0.045, 0.02, 0, 0, 0, 10).rotateX(Math.PI / 2).translate(x, y + 0.14, z + 0.125));
}

function workbenchA(THREE) {
  const k = kit(THREE);
  const { add, box, beam } = k;
  add('wood', 0xffffff, box(1.74, 0.12, 0.74, 0, 0.84, 0.08));
  add('body', C.woodDD, box(1.6, 0.14, 0.04, 0, 0.71, 0.43));
  for (const [x, z] of [[-0.76, -0.22], [0.76, -0.22], [-0.76, 0.38], [0.76, 0.38]]) add('body', C.woodDD, box(0.11, 0.78, 0.11, x, 0.39, z));
  add('wood', 0xe8d0b0, box(1.52, 0.06, 0.56, 0, 0.24, 0.08));
  for (const x of [-0.42, 0.2]) add('wood', 0xffffff, box(0.5, 0.08, 0.14, x, 0.31, 0.02));
  for (const x of [-1.0, 1.0]) add('body', C.woodD, box(0.13, 2.62, 0.13, x, 1.31, -0.62));
  add('body', C.teal, box(1.9, 1.12, 0.06, 0, 1.56, -0.62));
  add('body', C.woodD, box(1.96, 0.08, 0.1, 0, 2.14, -0.6));
  add('body', C.woodD, box(1.96, 0.08, 0.1, 0, 0.98, -0.6));
  saw(k, -0.56, 1.72, -0.565, 1.2, 0.06);
  hammer(k, 0.02, 1.83, -0.565, 1.3, 0);
  wrench(k, 0.58, 1.79, -0.565, 1.35, -0.12);
  for (let i = 0; i < 4; i++) {
    add('wood', i % 2 ? 0xf0dcc0 : 0xffffff, box(0.58, 0.07, 0.56).rotateX(-0.36).translate(-0.87 + i * 0.58, 2.52 + (i % 2) * 0.012, -0.47));
  }
  add('body', C.orange, box(2.36, 0.14, 0.05, 0, 2.38, -0.2));
  add('body', C.woodD, box(0.1, 0.34, 0.08, 0, 2.62, -0.76));
  add('body', C.yellow, k.extrude(gearShape(k, 0.23), 0.08).translate(0, 2.76, -0.76));
  add('metal', C.metal, box(0.24, 0.16, 0.2, -0.6, 0.98, 0.12));
  add('metal', C.metalD, box(0.07, 0.07, 0.24, -0.6, 0.98, 0.33));
  birdhouse(k, 0.3, 0.9, 0.12);
  add('fine', C.cap, beam([0.98, 2.33, -0.22], [0.98, 2.17, -0.22], 0.01));
  lantern(k, 0.98, 2.02, -0.22, 0xffc65a, 0.8);
  return k.finish();
}

function workbenchB(THREE) {
  const k = kit(THREE);
  const { add, box, cyl, beam } = k;
  const bz = -0.32;
  for (const sx of [-0.55, 0.55]) {
    add('body', C.woodM, box(0.11, 0.1, 0.62, sx, 0.66, bz));
    for (const dz of [-0.24, 0.24]) for (const dx of [-1, 1]) add('body', C.woodD, beam([sx + dx * 0.2, 0, bz + dz * 1.2], [sx + dx * 0.02, 0.64, bz + dz], 0.035));
  }
  add('wood', 0xffffff, box(1.8, 0.08, 0.46, 0, 0.75, bz));
  saw(k, 0.38, 1.12, bz, 1.0, 0.95, 0.03);
  hammer(k, -0.3, 0.83, bz + 0.08, 0.7, Math.PI / 2, 0.05);
  for (const [x, y] of [[-0.98, 0.15], [-0.68, 0.15], [-0.38, 0.15], [-0.83, 0.41], [-0.53, 0.41], [-0.68, 0.67]]) {
    add('body', C.bark, cyl(0.15, 0.15, 0.56, 0, 0, 0, 9).rotateX(Math.PI / 2).translate(x, y, 0.38));
    add('body', C.ring, cyl(0.115, 0.115, 0.03, 0, 0, 0, 9).rotateX(Math.PI / 2).translate(x, y, 0.67));
  }
  add('body', C.bark, cyl(0.3, 0.34, 0.46, 0.72, 0.23, 0.36, 10));
  add('body', C.ring, cyl(0.28, 0.28, 0.03, 0.72, 0.465, 0.36, 10));
  add('body', C.wood, beam([0.66, 0.5, 0.34], [0.95, 1.12, 0.5], 0.04));
  add('metal', C.metalD, k.extrude(k.shape([[-0.04, 0], [0.13, -0.02], [0.18, -0.2], [-0.02, -0.12]]), 0.05).rotateZ(-0.42).translate(0.64, 0.58, 0.34));
  add('body', C.red, box(0.42, 0.2, 0.22, 0.1, 0.1, 0.5));
  add('body', C.metalD, new THREE.TorusGeometry(0.09, 0.02, 4, 10, Math.PI).translate(0.1, 0.2, 0.5));
  add('fine', C.yellow, box(0.43, 0.035, 0.23, 0.1, 0.15, 0.5));
  add('body', C.woodDD, box(0.1, 2.0, 0.1, -1.05, 1.0, -0.62));
  add('body', C.woodDD, box(0.4, 0.06, 0.06, -0.9, 1.97, -0.62));
  add('fine', C.cap, beam([-0.76, 1.95, -0.62], [-0.76, 1.8, -0.62], 0.01));
  lantern(k, -0.76, 1.66, -0.62, 0xffc65a, 0.8);
  return k.finish();
}

function workbenchC(THREE) {
  const k = kit(THREE);
  const { add, box, cyl, beam } = k;
  add('wood', 0xffffff, box(1.5, 0.56, 0.7, 0, 0.8, -0.05));
  add('body', C.woodD, box(1.58, 0.07, 0.78, 0, 1.11, -0.05));
  add('body', C.woodD, box(1.56, 0.08, 0.76, 0, 0.5, -0.05));
  [C.mint, C.yellow, C.coral].forEach((c, i) => {
    const x = -0.47 + i * 0.47;
    add('body', c, box(0.4, 0.36, 0.04, x, 0.8, 0.31));
    add('fine', C.cap, k.ball(0.035, x, 0.84, 0.345));
  });
  for (const x of [-0.5, 0.5]) for (const z of [-0.46, 0.4]) {
    add('body', C.woodDD, new THREE.TorusGeometry(0.27, 0.045, 6, 16).translate(x, 0.3, z));
    add('body', C.woodM, cyl(0.07, 0.07, 0.1, 0, 0, 0, 8).rotateX(Math.PI / 2).translate(x, 0.3, z));
    if (z > 0) for (const r of [0.4, 0.4 + Math.PI / 2]) add('body', C.woodM, box(0.04, 0.5, 0.03).rotateZ(r).translate(x, 0.3, z));
  }
  add('body', C.woodD, beam([0.72, 0.62, 0.0], [1.15, 0.28, 0.0], 0.035));
  add('body', C.woodD, beam([1.15, 0.28, -0.22], [1.15, 0.28, 0.22], 0.035));
  add('body', C.board, box(1.4, 0.72, 0.05, 0, 1.52, -0.36));
  saw(k, -0.42, 1.7, -0.32, 0.8, 0.0);
  hammer(k, 0.06, 1.7, -0.32, 0.85, 0);
  wrench(k, 0.45, 1.66, -0.32, 0.9, -0.1);
  add('body', C.coral, box(0.24, 0.2, 0.22, 0.42, 1.25, 0.12));
  add('fine', C.yellow, box(0.25, 0.21, 0.05, 0.42, 1.25, 0.12));
  add('fine', C.yellow, box(0.05, 0.21, 0.23, 0.42, 1.25, 0.12));
  birdhouse(k, -0.42, 1.15, 0.12);
  for (const x of [-0.74, 0.74]) add('body', C.woodDD, box(0.07, 1.75, 0.07, x, 1.98, -0.38));
  for (let i = 0; i < 4; i++) {
    add('body', i % 2 ? C.cream : C.orange, box(0.43, 0.06, 0.8).rotateX(0.32).translate(-0.645 + i * 0.43, 2.76 + (i % 2) * 0.01, -0.1));
    add('fine', i % 2 ? C.cream : C.orange, new THREE.CylinderGeometry(0.215, 0.215, 0.05, 10, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI).translate(-0.645 + i * 0.43, 2.62, 0.29));
  }
  add('fine', C.cap, beam([0.74, 2.6, 0.22], [0.74, 2.42, 0.22], 0.01));
  lantern(k, 0.74, 2.27, 0.22, 0xffc65a, 0.8);
  return k.finish();
}

export function buildWorkbench(THREE, v) {
  if (v === 'now') return workbenchNow(THREE);
  if (v === 'A') return workbenchA(THREE);
  if (v === 'B') return workbenchB(THREE);
  return workbenchC(THREE);
}

function marketNow(THREE) {
  const g = new THREE.Group();
  for (const x of [-0.8, 0.8]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 2.1, 6), woodMat(THREE));
    p.position.set(x, 1.05, -0.12); p.castShadow = true; g.add(p);
  }
  const woodSide = new THREE.MeshStandardMaterial({ color: 0x9a7248, roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: boardTexture(THREE, 'paper'), roughness: 0.85 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 0.08), [woodSide, woodSide, woodSide, woodSide, front, woodSide]);
  board.position.y = 1.45; board.castShadow = true; g.add(board);
  g.userData.lamps = [];
  return g;
}

function face(THREE, style, w, h, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: boardTexture(THREE, style), roughness: 0.85 }));
  m.position.set(x, y, z);
  return m;
}

function marketA(THREE) {
  const k = kit(THREE);
  const { add, box, cyl } = k;
  for (const x of [-0.98, 0.98]) add('body', C.woodD, box(0.14, 2.3, 0.14, x, 1.15, -0.02));
  add('wood', 0xffffff, box(1.84, 1.2, 0.08, 0, 1.38, 0));
  add('body', C.woodDD, box(1.7, 0.06, 0.16, 0, 0.76, 0.06));
  add('fine', C.cream, box(0.12, 0.03, 0.03, 0.55, 0.805, 0.08));
  for (const s of [-1, 1]) add('body', C.roof, box(2.3, 0.07, 0.56).rotateX(s * 0.6).translate(0, 2.47, s * 0.24));
  add('body', C.roofD, box(2.34, 0.08, 0.08, 0, 2.63, 0));
  add('body', C.woodM, k.extrude(k.shape([[-0.96, 0], [0.96, 0], [0, 0.48]]), 0.06).translate(0, 2.04, 0.0));
  add('body', C.gold, cyl(0.15, 0.15, 0.06, 0, 0, 0, 16).rotateX(Math.PI / 2).translate(0, 2.84, 0));
  add('fine', 0xc9902a, cyl(0.09, 0.09, 0.02, 0, 0, 0, 16).rotateX(Math.PI / 2).translate(0, 2.84, 0.035));
  crate(k, -0.72, 0.5, 0.18, 'apple');
  crate(k, 0.7, 0.48, -0.2, 'carrot');
  crate(k, 0.84, 0.02, 0.1, 'cabbage');
  return k.finish([face(THREE, 'chalk', 1.68, 1.05, 0, 1.38, 0.055)]);
}

function marketB(THREE) {
  const k = kit(THREE);
  const { add, box, cyl, beam } = k;
  add('body', C.woodDD, box(0.5, 0.16, 0.4, 0, 0.08, -0.12));
  add('body', C.woodD, cyl(0.075, 0.09, 2.42, 0, 1.29, -0.12, 8));
  add('wood', 0xffffff, box(1.66, 1.04, 0.08, 0, 1.12, 0));
  const tilt = 0.17, L = 0.88, py = 2.5, pz = -0.12;
  add('metal', C.gold, box(1.86, 0.08, 0.08).rotateZ(tilt).translate(0, py, pz));
  add('metal', C.gold, k.ball(0.11, 0, py, pz + 0.06));
  add('metal', C.gold, new THREE.ConeGeometry(0.09, 0.22, 6).translate(0, py + 0.2, pz));
  const pans = [-1, 1].map(s => {
    const ex = s * L * Math.cos(tilt), ey = py + s * L * Math.sin(tilt), panY = ey - 0.56;
    for (const a of [0, 2.1, 4.2]) add('fine', C.cap, beam([ex, ey, pz], [ex + Math.cos(a) * 0.24, panY + 0.05, pz + Math.sin(a) * 0.24], 0.008, 4));
    add('metal', C.gold, cyl(0.3, 0.2, 0.08, ex, panY, pz, 14));
    return [ex, panY, pz];
  });
  const [lo, hi] = pans[0][1] < pans[1][1] ? pans : [pans[1], pans[0]];
  add('body', C.berry, new THREE.ConeGeometry(0.17, 0.3, 8).rotateX(Math.PI).translate(lo[0], lo[1] + 0.2, lo[2]));
  add('body', C.leaf, new THREE.ConeGeometry(0.13, 0.08, 6).translate(lo[0], lo[1] + 0.38, lo[2]));
  for (const dz of [-0.11, 0.0, 0.11]) add('body', C.carrot, new THREE.ConeGeometry(0.06, 0.32, 6).rotateZ(Math.PI / 2 + 0.15).translate(hi[0], hi[1] + 0.09, hi[2] + dz));
  add('fine', C.leaf, new THREE.ConeGeometry(0.06, 0.14, 5).rotateZ(-Math.PI / 2).translate(hi[0] - 0.22, hi[1] + 0.1, hi[2]));
  add('body', C.up, k.extrude(arrowShape(k), 0.09).scale(0.56, 0.56, 1).translate(-1.0, 1.34, 0.02));
  add('body', C.down, k.extrude(arrowShape(k), 0.09).rotateZ(Math.PI).scale(0.56, 0.56, 1).translate(1.0, 0.9, 0.02));
  return k.finish([face(THREE, 'cream', 1.54, 0.94, 0, 1.12, 0.055)]);
}

function marketC(THREE) {
  const k = kit(THREE);
  const { add, box, cyl } = k;
  add('wood', 0xffffff, box(2.2, 0.22, 0.86, 0, 0.11, -0.06));
  add('body', C.woodD, box(2.22, 0.2, 0.04, 0, 0.11, 0.37));
  for (let i = 0; i < 9; i++) add('fine', i % 2 ? C.cream : C.coral, new THREE.ConeGeometry(0.13, 0.2, 3).rotateX(Math.PI).rotateY(Math.PI / 6).scale(1, 1, 0.25).translate(-1.0 + i * 0.25, 0.14, 0.4));
  for (let i = 0; i < 5; i++) add('body', i % 2 ? C.stageRedD : C.stageRed, box(0.38, 1.9, 0.06, -0.76 + i * 0.38, 1.17, -0.32 + (i % 2) * 0.03));
  for (const x of [-0.98, 0.98]) {
    add('body', C.stageRed, cyl(0.09, 0.1, 2.6, x, 1.52, -0.12, 10));
    add('body', C.gold, k.ball(0.12, x, 2.88, -0.12));
    add('body', C.gold, cyl(0.12, 0.12, 0.06, x, 0.25, -0.12, 10));
  }
  add('body', C.gold, box(2.0, 0.2, 0.12, 0, 2.2, -0.2));
  for (let i = 0; i < 6; i++) add('body', C.gold, new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(-0.83 + i * 0.332, 2.11, -0.18));
  add('body', C.gold, box(1.72, 1.1, 0.08, 0, 1.34, -0.16));
  const pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3(-0.98 + 1.96 * t, 2.8 - Math.sin(Math.PI * t) * 0.18, -0.06)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  add('fine', C.cap, new THREE.TubeGeometry(curve, 20, 0.014, 4));
  const warm = [0xff9a4c, 0xffcf5a, 0xff9a4c];
  [0.25, 0.5, 0.75].forEach((t, i) => { const p = curve.getPoint(t); lantern(k, p.x, p.y - 0.2, p.z, warm[i], 0.85); });
  add('body', C.woodDD, box(0.24, 0.05, 0.05, 1.08, 1.95, -0.12));
  add('fine', C.cap, cyl(0.01, 0.01, 0.1, 1.12, 1.9, -0.12, 4));
  add('metal', 0xd9a93a, cyl(0.045, 0.1, 0.16, 1.12, 1.77, -0.12, 12));
  add('fine', 0x8a6a2a, k.ball(0.035, 1.12, 1.67, -0.12));
  return k.finish([face(THREE, 'stage', 1.56, 0.96, 0, 1.34, -0.105)]);
}

export function buildMarketBoard(THREE, v) {
  if (v === 'now') return marketNow(THREE);
  if (v === 'A') return marketA(THREE);
  if (v === 'B') return marketB(THREE);
  return marketC(THREE);
}

export function buildFigure(THREE) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clayMat(THREE, C.shirt, false));
  body.position.y = 0.55; body.scale.set(1, 1.05, 1); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(THREE, C.skin, false));
  head.position.y = 1.15; head.castShadow = true; g.add(head);
  return g;
}

export function meshCount(obj) {
  let n = 0;
  obj.traverse(o => { if (o.isMesh) n += 1; });
  return n;
}
