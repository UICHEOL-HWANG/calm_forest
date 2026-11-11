import { paintKit, bake } from './paint-merge.js';

const GLOW_DAY = 0.45, GLOW_NIGHT = 1.8;

function kit(THREE) {
  const K = paintKit(THREE);
  const hipRoof = (g, w, d, h, top, m, y) => {
    const geo = K.cyl(top, 1, h, 4);
    geo.rotateY(Math.PI / 4);
    K.put(g, geo, m, [0, y + h / 2, 0], [0, 0, 0], [w / Math.SQRT2, 1, d / Math.SQRT2]);
  };
  const prism = (g, w, h, len, m, p) => {
    const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    K.put(g, geo, m, p);
  };
  return { ...K, hipRoof, prism };
}

function cutlery(THREE, K, parent, p, col, s, ry) {
  const c = new THREE.Group(); c.position.set(...p); c.scale.setScalar(s); c.rotation.y = ry; parent.add(c);
  const m = K.tag(col);
  K.put(c, K.box(0.05, 0.42, 0.03), m, [-0.14, -0.06, 0]);
  [-0.21, -0.14, -0.07].forEach(x => K.put(c, K.box(0.025, 0.14, 0.03), m, [x, 0.21, 0]));
  K.put(c, K.box(0.17, 0.035, 0.03), m, [-0.14, 0.14, 0]);
  K.put(c, K.box(0.05, 0.3, 0.03), m, [0.15, -0.12, 0]);
  K.put(c, K.box(0.085, 0.3, 0.03), m, [0.165, 0.17, 0], [0, 0, -0.06]);
}

function stringLights(THREE, K, g, a, b, drop, n) {
  const sag = k => {
    const pts = [];
    for (let i = 0; i <= k; i++) {
      const t = i / k;
      pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * drop, a[2] + (b[2] - a[2]) * t));
    }
    return pts;
  };
  K.put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sag(24)), 24, 0.012, 4), K.tag(0x2b2b2b));
  const pts = sag(n);
  for (let i = 1; i < n; i++) K.put(g, K.ball(0.055, 0), K.tag(0xffd98a, true), [pts[i].x, pts[i].y - 0.07, pts[i].z]);
}

function planterBox(K, g, x, y, z, w) {
  K.put(g, K.box(w, 0.22, 0.28), K.tag(0x6e4a2c), [x, y, z]);
  for (let i = 0; i < 4; i++) {
    const fx = x - w / 2 + 0.15 + i * (w - 0.3) / 3;
    K.put(g, K.ball(0.12, 0), K.tag(0x6f9f58), [fx, y + 0.17, z]);
    K.put(g, K.ball(0.06, 0), K.tag([0xf2c84b, 0xe9776a, 0xf6f0e2, 0xe9776a][i]), [fx + 0.03, y + 0.27, z + 0.06]);
  }
}

function bistroTable(K, g, x, z) {
  K.put(g, K.cyl(0.36, 0.36, 0.05, 14), K.tag(0xf4efe4), [x, 0.78, z]);
  K.put(g, K.cyl(0.035, 0.035, 0.74, 6), K.tag(0x2b2b2b), [x, 0.4, z]);
  K.put(g, K.cyl(0.2, 0.2, 0.03, 10), K.tag(0x2b2b2b), [x, 0.03, z]);
  [-0.55, 0.55].forEach(dx => {
    K.put(g, K.box(0.34, 0.05, 0.34), K.tag(0x2f5e47), [x + dx, 0.46, z]);
    K.put(g, K.box(0.05, 0.42, 0.34), K.tag(0x2f5e47), [x + dx * 1.27, 0.68, z]);
    K.put(g, K.cyl(0.02, 0.02, 0.45, 4), K.tag(0x2b2b2b), [x + dx, 0.22, z]);
  });
}

function shell(K, g) {
  const W = 6.2, D = 4.8, F = D / 2;
  const { put, box, ball, tag } = K;
  const slate = tag(0x71899a), trim = tag(0xe9dcc0), green = tag(0x2f5e47), frame = tag(0xf7f1e3), warm = tag(0xffd29a, true);
  put(g, box(W + 0.4, 0.3, D + 0.4), tag(0xb9ae9c), [0, 0.15, 0]);
  put(g, box(W, 0.95, D), green, [0, 0.77, 0]);
  put(g, box(W, 1.9, D), tag(0xf3e6cc), [0, 2.2, 0]);
  put(g, box(W + 0.14, 0.08, D + 0.14), tag(0xe2d3b4), [0, 1.27, 0]);
  put(g, box(W + 0.3, 0.22, D + 0.3), trim, [0, 3.24, 0]);
  K.hipRoof(g, W + 0.5, D + 0.5, 1.5, 0.42, slate, 3.35);
  [-1.6, 1.6].forEach(x => {
    put(g, box(0.9, 0.75, 0.6), trim, [x, 4.0, F - 0.15]);
    put(g, box(0.62, 0.5, 0.05), warm, [x, 4.0, F + 0.16]);
    K.prism(g, 1.05, 0.38, 0.75, slate, [x, 4.37, F - 0.15]);
  });
  put(g, box(0.55, 1.4, 0.55), tag(0x9a5a44), [2.1, 4.5, -1.2]);
  put(g, box(0.68, 0.14, 0.68), tag(0x7a4636), [2.1, 5.22, -1.2]);
  put(g, box(1.2, 2.1, 0.1), green, [0, 1.37, F + 0.03]);
  put(g, box(0.95, 1.95, 0.08), tag(0x6e4a2c), [0, 1.3, F + 0.08]);
  put(g, box(0.6, 0.75, 0.04), warm, [0, 1.72, F + 0.13]);
  put(g, ball(0.05, 0), tag(0xd9b25a), [0.36, 1.2, F + 0.15]);
  [-2.05, 2.05].forEach(x => {
    put(g, box(1.55, 1.55, 0.1), frame, [x, 1.95, F + 0.03]);
    put(g, box(1.35, 1.35, 0.06), warm, [x, 1.95, F + 0.06]);
    put(g, box(0.06, 1.35, 0.08), frame, [x, 1.95, F + 0.09]);
    put(g, box(1.35, 0.06, 0.08), frame, [x, 2.15, F + 0.09]);
    planterBox(K, g, x, 1.05, F + 0.2, 1.4);
  });
  [-1, 1].forEach(side => {
    put(g, box(0.1, 1.3, 1.1), warm, [side * (W / 2 + 0.01), 2.0, 0]);
    put(g, box(0.12, 1.45, 1.25), frame, [side * (W / 2 - 0.02), 2.0, 0]);
  });
  return { W, F };
}

function front(THREE, K, g, { W, F }) {
  const { put, box, cyl, ball, tag } = K;
  const iron = tag(0x2b2b2b);
  const n = 12, sw = (W + 0.3) / n;
  for (let i = 0; i < n; i++) {
    const x = -(W + 0.3) / 2 + sw / 2 + i * sw;
    const c = tag(i % 2 ? 0xf4ecd8 : 0x2f6b4f);
    put(g, box(sw, 0.05, 1.15), c, [x, 2.86, F + 0.5], [0.42, 0, 0]);
    put(g, cyl(sw / 2, sw / 2, 0.05, 8), c, [x, 2.6, F + 1.02], [Math.PI / 2, 0, 0], [1, 1, 0.5]);
  }
  put(g, box(0.06, 0.06, 0.7), iron, [W / 2 + 0.02, 2.55, F + 0.35]);
  const blade = new THREE.Group(); blade.position.set(W / 2 + 0.02, 2.05, F + 0.62); g.add(blade);
  put(blade, box(0.06, 0.8, 0.62), tag(0x2f5e47));
  put(blade, box(0.07, 0.7, 0.52), tag(0xf4ecd8));
  cutlery(THREE, K, blade, [0.05, 0, 0], 0x2f5e47, 0.95, Math.PI / 2);
  cutlery(THREE, K, blade, [-0.05, 0, 0], 0x2f5e47, 0.95, -Math.PI / 2);
  [-1, 1].forEach(s => {
    put(g, cyl(0.05, 0.06, 2.4, 6), iron, [s * 3.25, 1.2, F + 2.1]);
    put(g, ball(0.08, 0), iron, [s * 3.25, 2.42, F + 2.1]);
    stringLights(THREE, K, g, [s * 3.1, 2.62, F + 1.0], [s * 3.25, 2.36, F + 2.1], 0.12, 4);
  });
  stringLights(THREE, K, g, [-3.25, 2.36, F + 2.1], [3.25, 2.36, F + 2.1], 0.45, 13);
  put(g, box(W - 0.2, 0.06, 2.0), tag(0xcdbfa6), [0, 0.03, F + 1.3]);
  bistroTable(K, g, -2.0, F + 1.45);
  bistroTable(K, g, 2.0, F + 1.45);
  const board = new THREE.Group(); board.position.set(0.95, 0, F + 0.75); board.rotation.y = -0.35; g.add(board);
  put(board, box(0.5, 0.7, 0.04), tag(0x2b2f2c), [0, 0.6, 0.06], [-0.18, 0, 0]);
  put(board, box(0.56, 0.76, 0.03), tag(0x8a6a48), [0, 0.6, 0.04], [-0.18, 0, 0]);
  [0.75, 0.62, 0.5].forEach((y, i) => put(board, box(0.34 - i * 0.06, 0.03, 0.01), tag(0xf4efe4), [0, y, 0.1 + (0.75 - y) * 0.18], [-0.18, 0, 0]));
  put(g, ball(0.35, 0), tag(0x6f9f58), [-3.35, 0.45, F - 0.2], [0.3, 0.6, 0], [1, 0.85, 1]);
  put(g, ball(0.32, 0), tag(0x5f8f4c), [3.35, 0.45, F - 0.2], [0.3, 0.6, 0], [1, 0.85, 1]);
}

export function buildBistro(THREE) {
  const K = kit(THREE);
  const g = new THREE.Group();
  g.add(...bake(THREE, scratch => front(THREE, K, scratch, shell(K, scratch)), { intensity: GLOW_DAY }));
  return g;
}

export function setBistroEvening(g, level) {
  const k = Math.max(0, Math.min(1, level));
  g.traverse(o => {
    if (o.isMesh && o.userData.glow) o.material.emissiveIntensity = GLOW_DAY + (GLOW_NIGHT - GLOW_DAY) * k;
  });
}
