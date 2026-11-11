const C = {
  wood: 0xd9a066, woodM: 0xc9935f, woodD: 0x8f633f, woodDD: 0x6b4a34, bark: 0x7a5536, ring: 0xecd09a,
  metal: 0x8b8b93, metalD: 0x55555d, steel: 0xc9ccd4, wrench: 0x7d7f88,
  cream: 0xfff2e0, board: 0xf3e3c0, teal: 0x5f9e94, red: 0xd9503f, coral: 0xff8f8f, orange: 0xf0a040, yellow: 0xffd23f,
  gold: 0xe0b04a, mint: 0x9fd8c0, stageRed: 0xb8433f, stageRedD: 0x9c3533, roof: 0xc8643c, roofD: 0xa84f2e,
  up: 0x3fae5f, down: 0xe0574a, apple: 0xd8503a, cabbage: 0x9fd36a, carrot: 0xf08a2a, leaf: 0x5ea062,
  berry: 0xe8463c, cap: 0x3a2a20, dust: 0xead7a8, shirt: 0x6fae7f, skin: 0xffe0c0,
};


function tri(c, x, y, s, up) {
  c.beginPath();
  if (up) { c.moveTo(x, y - s); c.lineTo(x + s, y + s * 0.7); c.lineTo(x - s, y + s * 0.7); }
  else { c.moveTo(x, y + s); c.lineTo(x + s, y - s * 0.7); c.lineTo(x - s, y - s * 0.7); }
  c.closePath(); c.fill();
}

function kit(THREE, env) {
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
    wood: () => new THREE.MeshStandardMaterial({ vertexColors: true, map: env.woodMap, roughness: 0.82, metalness: 0 }),
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

  const finish = (extra = [], custom = {}) => {
    const group = new THREE.Group(), lamps = [];
    for (const [b, geos] of buckets) {
      let mat;
      if (b.startsWith('lamp')) {
        const hex = Number(b.split(':')[1]);
        mat = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.2, roughness: 0.6, flatShading: true });
        lamps.push(mat);
      } else mat = custom[b] || MATS[b]();
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

function arrowShape(k) {
  return k.shape([[0, 0.5], [0.32, 0.12], [0.13, 0.12], [0.13, -0.32], [-0.13, -0.32], [-0.13, 0.12], [-0.32, 0.12]]);
}

function lantern(k, x, y, z, color, s = 1) {
  k.add(`lamp:${color}`, color, new k.THREE.SphereGeometry(0.15 * s, 10, 8).scale(1, 1.2, 1).translate(x, y, z));
  k.add('fine', C.cap, k.cyl(0.07 * s, 0.07 * s, 0.05 * s, x, y + 0.19 * s, z));
  k.add('fine', C.cap, k.cyl(0.05 * s, 0.05 * s, 0.04 * s, x, y - 0.19 * s, z));
}

function birdhouse(k, x, y, z) {
  k.add('body', C.woodM, k.box(0.26, 0.24, 0.24, x, y + 0.12, z));
  for (const s of [-1, 1]) k.add('body', C.red, k.box(0.2, 0.04, 0.32).rotateZ(-s * 0.7).translate(x + s * 0.075, y + 0.3, z));
  k.add('fine', C.cap, k.cyl(0.045, 0.045, 0.02, 0, 0, 0, 10).rotateX(Math.PI / 2).translate(x, y + 0.14, z + 0.125));
}


function workbenchC(THREE, env) {
  const k = kit(THREE, env);
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

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function uvRect(geo, u0, v0, u1, v1) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return geo;
}

function faceMat(THREE, cv) {
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.85, metalness: 0 });
}

function pctLabel(p) { return `${Math.abs(Math.round(p))}%`; }

function scaleTop(k, tilt, py, pz, L = 0.88, panR = 0.3, drop = 0.56) {
  const { add, box, beam, cyl } = k;
  add('metal', C.gold, box(2 * L + 0.1, 0.08, 0.08).rotateZ(tilt).translate(0, py, pz));
  add('metal', C.gold, k.ball(0.11, 0, py, pz + 0.06));
  add('metal', C.gold, new k.THREE.ConeGeometry(0.09, 0.22, 6).translate(0, py + 0.2, pz));
  return [-1, 1].map(s => {
    const ex = s * L * Math.cos(tilt), ey = py + s * L * Math.sin(tilt), panY = ey - drop;
    for (const a of [Math.PI, Math.PI * 1.5, Math.PI * 2]) add('fine', C.cap, beam([ex, ey, pz], [ex + Math.cos(a) * panR * 0.85, panY + 0.05, pz + Math.sin(a) * panR * 0.85], 0.008, 4));
    add('metal', C.gold, cyl(panR, panR * 0.66, 0.08, ex, panY, pz, 14));
    return [ex, panY, pz];
  });
}

function tradePans(k, pans) {
  const [[lx, ly, lz], [rx, ry, rz]] = pans;
  for (const [dx, dz, c] of [[-0.1, -0.04, C.apple], [0.1, -0.03, C.carrot], [0, 0.08, C.cabbage]]) k.add('body', c, k.ball(0.11, lx + dx, ly + 0.12, lz + dz, 0.9));
  for (let i = 0; i < 3; i++) k.add('metal', C.gold, k.cyl(0.13, 0.13, 0.05, rx + (i % 2) * 0.03, ry + 0.07 + i * 0.055, rz, 12));
}

function postAndBase(k, h, pz) {
  k.add('body', C.woodDD, k.box(0.5, 0.16, 0.4, 0, 0.08, pz));
  k.add('body', C.woodD, k.cyl(0.075, 0.09, h, 0, h / 2 + 0.08, pz, 8));
}

function sideArrows(k, upY = 1.34, downY = 0.9, x = 1.0, s = 0.56) {
  k.add('body', C.up, k.extrude(arrowShape(k), 0.09).scale(s, s, 1).translate(-x, upY, 0.02));
  k.add('body', C.down, k.extrude(arrowShape(k), 0.09).rotateZ(Math.PI).scale(s, s, 1).translate(x, downY, 0.02));
}

export function tagData(d) {
  return [
    { icon: d.hiIcon, label: pctLabel(d.hiPct), up: true },
    { icon: d.loIcon, label: pctLabel(d.loPct), up: false },
  ];
}

function tagCanvas(d, env) {
  const cv = env.makeCanvas(512, 300);
  const c = cv.getContext('2d');
  tagData(d).forEach(({ icon, label, up }, i) => {
    const ox = i * 256, col = up ? '#22924f' : '#c8473b';
    c.fillStyle = '#efe4c8'; c.fillRect(ox, 0, 256, 300);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `150px ${EMOJI_FONT}`; c.fillText(icon, ox + 128, 100);
    c.fillStyle = col; tri(c, ox + 44, 236, 30, up);
    c.font = 'bold 90px sans-serif'; c.textAlign = 'left'; c.fillText(label, ox + 80, 240);
  });
  return cv;
}

function tagShape(k, w, h) {
  const hw = w / 2, hh = h / 2;
  const hole = [];
  for (let i = 0; i < 10; i++) { const a = -(i / 10) * Math.PI * 2; hole.push([Math.cos(a) * 0.045, hh - 0.11 + Math.sin(a) * 0.045]); }
  return k.shape([[-hw, -hh], [hw, -hh], [hw, hh - 0.14], [0, hh], [-hw, hh - 0.14]], [hole]);
}

function marketB1(THREE, d, env) {
  const k = kit(THREE, env);
  const { add, box, beam } = k;
  const pz = -0.12;
  postAndBase(k, 2.34, pz);
  tradePans(k, scaleTop(k, 0.06, 2.5, pz));
  add('body', C.woodD, box(1.5, 0.08, 0.08, 0, 1.78, -0.02));
  const W = 0.74, H = 0.94, cy = 1.2;
  [[-0.43, C.up, 0.05, 0], [0.43, C.down, -0.05, 1]].forEach(([x, col, rz, i]) => {
    add('fine', C.cap, beam([x - 0.1, 1.76, 0.0], [x, cy + H / 2 - 0.11, 0.02], 0.008, 4));
    add('fine', C.cap, beam([x + 0.1, 1.76, 0.0], [x, cy + H / 2 - 0.11, 0.02], 0.008, 4));
    add('body', col, k.extrude(tagShape(k, W, H), 0.05).rotateZ(rz).translate(x, cy, 0.02));
    add('face', 0xffffff, uvRect(new THREE.PlaneGeometry(W - 0.1, H - 0.26), i * 0.5, 0, i * 0.5 + 0.5, 1).translate(0, -0.07, 0).rotateZ(rz).translate(x, cy, 0.06));
  });
  sideArrows(k, 1.3, 0.96, 1.03, 0.46);
  return k.finish([], { face: faceMat(THREE, tagCanvas(d, env)) });
}

export function buildCraftCart(THREE, env) {
  return workbenchC(THREE, env);
}

export function buildPriceBoard(THREE, data, env) {
  return marketB1(THREE, data, env);
}
