import { PAL, kit, at3, lantern } from './kit.js';

const BOOKS = [PAL.red, PAL.greenDeep, PAL.ink, PAL.gold, PAL.celadonDeep, PAL.redDeep];

const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const nextCol = (cols, prev, h) => (prev < 0 ? Math.floor(h * cols.length) : (prev + 1 + Math.floor(h * (cols.length - 1))) % cols.length);

function bookRow(k, x0, x1, y, z, d, h, seed, { cols = BOOKS, caps = true, wMin = 0.06, wVar = 0.05, at = (g) => g } = {}) {
  const { add, xf, box } = k;
  let x = x0, i = 0, prev = -1;
  while (x1 - x > wMin * 0.8) {
    const w = Math.min(x1 - x, wMin + hash(seed + i) * wVar);
    const hh = h * (0.74 + hash(seed + i + 50) * 0.26);
    const dd = d * (0.84 + hash(seed + i + 90) * 0.16);
    const zf = z - hash(seed + i + 70) * 0.018;
    prev = nextCol(cols, prev, hash(seed + i + 20));
    const cx = x + w / 2, cz = zf - dd / 2, top = y + hh - 0.004;
    add('body', cols[prev], at(xf(box(w - 0.008, hh, dd), [cx, y + hh / 2 - 0.004, cz])));
    if (caps) add('fine', PAL.paper, at(xf(box(w - 0.026, 0.012, dd - 0.022), [cx, top + 0.002, cz - 0.006])));
    x += w;
    i += 1;
  }
}

function bookStack(k, x, y, z, n, w, d, seed, { cols = BOOKS, ry = 0 } = {}) {
  const { add, xf, box } = k;
  let yy = y, prev = -1;
  for (let i = 0; i < n; i++) {
    const t = 0.05 + hash(seed + i) * 0.03;
    const ww = w * (0.8 + hash(seed + i + 7) * 0.2), dd = d * (0.8 + hash(seed + i + 13) * 0.2);
    const r = ry + (hash(seed + i + 29) - 0.5) * 0.4;
    prev = nextCol(cols, prev, hash(seed + i + 41));
    const P = (g) => xf(g, [x, yy + t / 2 - 0.003, z], [0, r, 0]);
    add('body', cols[prev], P(box(ww, t, dd)));
    add('fine', PAL.paper, P(xf(box(ww - 0.012, t * 0.6, dd + 0.008), [0.01, 0, 0])));
    yy += t - 0.003;
  }
  return yy;
}

const LANDS = [[0.55, 0.35, 0.75, 0.86], [-0.8, 0.3, 0.45, 0.87], [-0.1, -0.55, -0.85, 0.85], [0.2, 0.75, -0.6, 0.9], [0.6, -0.55, 0.55, 0.93]];

function globeBall(k, at, r, detail = 2) {
  const { T } = k;
  let g = new T.IcosahedronGeometry(r, detail);
  if (g.index) g = g.toNonIndexed();
  const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), c = new T.Color();
  const v = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3();
  const dirs = LANDS.map(([x, y, z, t]) => [new T.Vector3(x, y, z).normalize(), t]);
  for (let f = 0; f < n / 3; f++) {
    v.fromBufferAttribute(p, f * 3).add(a.fromBufferAttribute(p, f * 3 + 1)).add(b.fromBufferAttribute(p, f * 3 + 2)).normalize();
    const land = dirs.some(([dir, t]) => v.dot(dir) > t - hash(f) * 0.05);
    c.set(Math.abs(v.y) > 0.93 ? PAL.cream : land ? (hash(f + 400) > 0.9 ? PAL.straw : PAL.green) : PAL.ink);
    for (let j = 0; j < 3; j++) { col[(f * 3 + j) * 3] = c.r; col[(f * 3 + j) * 3 + 1] = c.g; col[(f * 3 + j) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  k.addRaw('body', at(g));
}

function inkBottle(k, at, s = 1) {
  const { add, xf, lathe, cyl } = k;
  const S = (g) => at(xf(g, [0, 0, 0], [0, 0, 0], [s, s, s]));
  add('body', PAL.inkDeep, S(lathe([[0, 0], [0.085, 0], [0.1, 0.02], [0.1, 0.07], [0.085, 0.1], [0.045, 0.12], [0.04, 0.15], [0, 0.15]], 12)));
  add('fine', PAL.gold, S(xf(cyl(0.05, 0.05, 0.03, 10), [0, 0.15, 0])));
  add('fine', PAL.coal, S(xf(cyl(0.036, 0.036, 0.006, 10), [0, 0.167, 0])));
}

function featherGeo(T, L, W, t0, t1) {
  const wAt = (t) => (t < 0.14 ? 0 : W * Math.pow(Math.sin(Math.PI * Math.min(1, (t - 0.14) / 0.86)), 0.6));
  const N = 7, pts = [];
  for (let i = 0; i <= N; i++) { const t = t0 + ((t1 - t0) * i) / N; pts.push([wAt(t), t * L]); }
  for (let i = N; i >= 0; i--) { const t = t0 + ((t1 - t0) * i) / N; pts.push([-0.55 * wAt(t), t * L]); }
  const s = new T.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new T.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false });
  g.deleteAttribute('uv');
  return g.translate(0, 0, -0.004);
}

function quill(k, at, L, W, vane, tip, split = 0.66) {
  const { T, add, xf, rod, cone } = k;
  add('fine', vane, at(featherGeo(T, L, W, 0.14, split)));
  add('fine', tip, at(featherGeo(T, L, W, split, 1)));
  add('fine', PAL.cream, at(rod([0, 0, 0], [0, L * 0.96, 0], 0.0065, 0.004, 4)));
  add('fine', PAL.coal, at(xf(cone(0.007, 0.04, 4), [0, -0.018, 0], [Math.PI, 0, 0])));
}

function recentre(k, dx, dz) {
  const move = (geo) => geo.translate(dx, 0, dz);
  return { ...k, add: (bucket, hex, geo) => k.add(bucket, hex, move(geo)), addRaw: (bucket, geo) => k.addRaw(bucket, move(geo)) };
}

function bookstall(T) {
  const k = recentre(kit(T), -0.25, 0.1);
  const { add, xf, box, rod } = k;
  const W = 1.24, H = 0.5, D = 0.66, y0 = 0.22, body = PAL.greenDeep;
  for (const sx of [-1, 1]) add('body', PAL.woodDark, xf(box(0.12, y0 + 0.01, D + 0.08), [sx * 0.42, (y0 + 0.01) / 2 - 0.01, 0]));
  add('body', body, xf(box(W, 0.05, D), [0, y0 + 0.025, 0]));
  for (const sz of [-1, 1]) add('body', body, xf(box(W, H, 0.05), [0, y0 + H / 2, sz * (D / 2 - 0.025)]));
  for (const sx of [-1, 1]) add('body', body, xf(box(0.05, H, D - 0.1), [sx * (W / 2 - 0.025), y0 + H / 2, 0]));
  for (const y of [y0 + 0.1, y0 + H - 0.1]) {
    add('body', PAL.woodDark, xf(box(W + 0.02, 0.05, 0.02), [0, y, D / 2 + 0.006]));
    add('body', PAL.woodDark, xf(box(W + 0.02, 0.05, 0.02), [0, y, -D / 2 - 0.006]));
    for (const sx of [-1, 1]) add('body', PAL.woodDark, xf(box(0.02, 0.05, D + 0.02), [sx * (W / 2 + 0.006), y, 0]));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('fine', PAL.gold, xf(box(0.075, 0.075, 0.075), [sx * (W / 2 - 0.02), y0 + H - 0.02, sz * (D / 2 - 0.02)]));
  add('fine', PAL.gold, xf(box(0.1, 0.12, 0.03), [0, y0 + H - 0.08, D / 2 + 0.018]));
  const cols = [PAL.red, PAL.ink, PAL.gold, PAL.celadonDeep, PAL.redDeep, PAL.paper];
  [[0.27, 3], [0.09, 13], [-0.09, 23]].forEach(([z, s]) => bookRow(k, -W / 2 + 0.06, W / 2 - 0.06, y0 + 0.05, z, 0.17, 0.5, s, { cols, caps: false, wMin: 0.07, wVar: 0.05 }));
  const L = 0.66, th = -0.25;
  const at = (g) => xf(g, [0, y0 + H, -D / 2 - 0.006], [th, 0, 0]);
  add('body', body, at(xf(box(W, L, 0.03), [0, L / 2, -0.125])));
  for (const sx of [-1, 1]) add('body', body, at(xf(box(0.05, L, 0.11), [sx * (W / 2 - 0.025), L / 2, -0.055])));
  for (const y of [0.025, L - 0.025]) add('body', body, at(xf(box(W - 0.1, 0.05, 0.11), [0, y, -0.055])));
  add('body', PAL.woodLight, at(xf(box(W - 0.1, 0.03, 0.1), [0, 0.33, -0.06])));
  for (const sx of [-1, 1]) add('fine', PAL.gold, at(xf(box(0.075, 0.075, 0.075), [sx * (W / 2 - 0.02), L - 0.02, -0.07])));
  bookRow(k, -W / 2 + 0.05, W / 2 - 0.05, 0.05, -0.012, 0.09, 0.25, 53, { at, wMin: 0.065, wVar: 0.04, caps: false });
  bookRow(k, -W / 2 + 0.05, W / 2 - 0.05, 0.345, -0.012, 0.09, 0.24, 63, { at, wMin: 0.065, wVar: 0.04, caps: false });
  bookStack(k, 0.95, -0.004, 0.2, 4, 0.34, 0.26, 73, { ry: 0.3 });
  add('fine', PAL.woodDark, rod([0.5, 1.3, -0.56], [0.5, 1.56, -0.56], 0.018, 0.018, 4));
  add('fine', PAL.woodDark, rod([0.5, 1.56, -0.56], [0.5, 1.56, -0.28], 0.018, 0.018, 4));
  lantern(k, 0.5, 1.34, -0.28, 0.22);
  return k.finish('bookstall');
}

function globe(T) {
  const k = kit(T);
  const { add, xf, rod, ball, torus } = k;
  const top = bookStack(k, 0, -0.004, 0, 3, 0.36, 0.27, 5, { cols: [PAL.redDeep, PAL.greenDeep, PAL.gold, PAL.ink] });
  const r = 0.14, Rc = 0.075;
  add('body', PAL.wood, xf(torus(Rc, 0.022, 5, 12), [0, top + 0.016, 0], [Math.PI / 2, 0, 0]));
  const cy = top + 0.016 + Math.sqrt(r * r - Rc * Rc) + 0.012;
  const at = (g) => xf(g, [0, cy, 0], [0.15, 0, -0.41]);
  globeBall(k, at, r, 2);
  add('fine', PAL.gold, at(rod([0, r - 0.01, 0], [0, r + 0.035, 0], 0.01, 0.01, 5)));
  add('fine', PAL.gold, at(xf(ball(0.02, 0), [0, r + 0.04, 0])));
  return k.finish('globe');
}

function inkquill(T) {
  const k = kit(T);
  const { add, xf, lathe, cyl } = k;
  add('body', PAL.celadon, xf(lathe([[0, 0], [0.07, 0], [0.088, 0.03], [0.08, 0.15], [0.09, 0.17], [0, 0.17]], 10), [0.05, -0.004, -0.02]));
  add('fine', PAL.coal, xf(cyl(0.07, 0.07, 0.006, 10), [0.05, 0.168, -0.02]));
  const fan = [[-0.38, 0.44, PAL.cream, PAL.rose], [0.02, 0.5, PAL.cream, PAL.celadonDeep], [0.4, 0.42, PAL.cream, PAL.gold]];
  for (const [rz, L, v, t] of fan) quill(k, (g) => xf(g, [0.05, 0.1, -0.02], [-0.25, 0, rz]), L, 0.07, v, t);
  inkBottle(k, at3(k, -0.16, -0.004, 0.08), 0.75);
  return k.finish('inkquill');
}

export const BOOKS_ITEMS = Object.freeze({ bookstall, globe, inkquill });
