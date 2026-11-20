import { domeTheta } from '../../js/cosmetics/anchors.js';
import { tubeAlong, backFront } from '../../js/cosmetics/art-winter-pick.js';
import { stickOn, strapsFrom } from '../../js/cosmetics/art-xmas-pick.js';
import { pushOut } from '../../js/cosmetics/art-forest-pick.js';

export const DS = Object.freeze({
  cream: 0xe6d6bc, creamDark: 0xcdb896,
  sponge: 0xdcb377, spongeDark: 0xb98e55,
  berry: 0xd2414f, berryDark: 0xa52f3c, leaf: 0x5f9a4e,
  pink: 0xe8a2ad, pinkDark: 0xc97885,
  mint: 0x93cdb4, mintDark: 0x6aa98f,
  lilac: 0xb9a3d6, lilacDark: 0x9580b8,
  lemon: 0xe6cc6c, lemonDark: 0xc4a94a,
  choc: 0x6b4430, chocDark: 0x4a2e20,
  wafer: 0xc99a58, waferDark: 0xa27840,
  ink: 0x2b221c,
});

const TAU = Math.PI * 2;
const SPRINKLE = [DS.berry, DS.mint, DS.lemon, DS.lilac, DS.cream];

function strawberry(THREE, h, s) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(s * 0.5, 10, 8), h.clay(DS.berry, false));
  b.scale.set(1, 1.15, 1); b.position.y = s * 0.45; g.add(b);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(s * 0.42, s * 0.42, 10), h.clay(DS.berry, false));
  tip.rotation.x = Math.PI; tip.position.y = s * 0.08; g.add(tip);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const l = new THREE.Mesh(new THREE.ConeGeometry(s * 0.12, s * 0.38, 3), h.clay(DS.leaf));
    l.position.set(Math.cos(a) * s * 0.18, s * 0.98, Math.sin(a) * s * 0.18);
    l.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); l.scale.z = 0.4; g.add(l);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function dollop(THREE, h, r, color, turns = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < turns; i++) {
    const t = i / turns, rr = r * (1 - t * 0.62);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.62, rr * 0.38, 7, 14), h.clay(color, false));
    ring.rotation.x = Math.PI / 2; ring.position.y = r * 0.42 * i; g.add(ring);
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.28, r * 0.42, 8), h.clay(color, false));
  tip.position.y = r * 0.42 * turns - r * 0.05; g.add(tip);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function macaron(THREE, h, r, shell, fill = DS.cream) {
  const g = new THREE.Group();
  [-1, 1].forEach(s => {
    const half = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), h.clay(shell, false));
    half.scale.set(1, 1, 0.36); half.position.z = s * r * 0.30; g.add(half);
    const foot = new THREE.Mesh(new THREE.TorusGeometry(r * 0.86, r * 0.09, 5, 18), h.clay(shell, false));
    foot.position.z = s * r * 0.14; g.add(foot);
  });
  const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.84, r * 0.84, r * 0.26, 16), h.clay(fill, false));
  f.rotation.x = Math.PI / 2; g.add(f);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function sprinkle(THREE, h, s, color) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.25, s, 2, 5), h.clay(color, false));
  m.castShadow = true;
  return m;
}

function wedgeLayer(THREE, rad, ang, hgt) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.absarc(0, 0, rad, -ang / 2, ang / 2, false);
  sh.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: hgt, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function buildCakeHatA(THREE, g, k, h) {
  const HR = k.HR, r = HR * 0.50;
  const cake = new THREE.Group();
  cake.position.y = Math.sqrt(HR * HR - r * r) - HR * 0.05;
  cake.rotation.set(0.10, 0, -0.14); g.add(cake);
  let y = 0;
  [[HR * 0.15, DS.sponge], [HR * 0.06, DS.cream], [HR * 0.15, DS.sponge], [HR * 0.07, DS.cream]].forEach(([hh, c]) => {
    h.put(cake, new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, 24), h.clay(c, false)), 0, y + hh / 2, 0);
    y += hh;
  });
  const band = h.put(cake, new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, HR * 0.035, 5, 28), h.clay(DS.pink, false)), 0, HR * 0.05, 0);
  band.rotation.x = Math.PI / 2; band.scale.z = 1.6;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    const d = dollop(THREE, h, HR * 0.075, DS.cream, 2);
    d.position.set(Math.cos(a) * r * 0.78, y, Math.sin(a) * r * 0.78); cake.add(d);
  }
  const sb = strawberry(THREE, h, HR * 0.30);
  sb.position.y = y; sb.rotation.z = 0.15; cake.add(sb);
  [-0.5, 0.15, 0.75].forEach((a, i) => {
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(HR * 0.07, HR * 0.07, HR * 0.02, 10, 1, false, 0, Math.PI), h.clay(i % 2 ? DS.berryDark : DS.berry, false));
    sl.position.set(Math.sin(a) * r * 1.01, HR * 0.21, Math.cos(a) * r * 1.01);
    sl.lookAt(sl.position.clone().multiplyScalar(2));
    sl.rotateX(Math.PI / 2);
    cake.add(sl);
  });
}

export function buildCakeHatB(THREE, g, k, h) {
  const HR = k.HR, rk = 1.07, rad = HR * rk;
  const dome = new THREE.Group(); dome.rotation.x = -0.26; g.add(dome);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(rad, 28, 14, 0, TAU, 0, domeTheta(HR, rk)), h.clay(DS.pink, false));
  cap.castShadow = true; dome.add(cap);
  const rimR = Math.sqrt(rad * rad - (HR * 0.5) ** 2);
  const rim = h.put(dome, new THREE.Mesh(new THREE.TorusGeometry(rimR, HR * 0.06, 6, 32), h.clay(DS.pink, false)), 0, HR * 0.5, 0);
  rim.rotation.x = Math.PI / 2;
  const n = 15;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.2;
    const front = Math.cos(a) > 0.80;
    const L = front ? HR * 0.04 : HR * (0.10 + 0.09 * ((i * 7) % 3) / 2);
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(HR * 0.055, L, 3, 8), h.clay(DS.pink, false));
    d.position.set(Math.sin(a) * rimR * 1.01, HR * 0.5 - L / 2, Math.cos(a) * rimR * 1.01);
    d.castShadow = true; dome.add(d);
  }
  const top = dollop(THREE, h, HR * 0.20, DS.cream, 3);
  top.position.y = rad * 0.98; dome.add(top);
  const sb = strawberry(THREE, h, HR * 0.24);
  sb.position.set(0, rad * 0.98 + HR * 0.21, 0); sb.rotation.z = -0.2; dome.add(sb);
  for (let i = 0; i < 60; i++) {
    const y = 1 - 2 * (i + 0.5) / 60, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
    const dir = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
    if (dir.y < 0.62 || dir.y > 0.93) continue;
    const sp = sprinkle(THREE, h, HR * 0.07, SPRINKLE[i % SPRINKLE.length]);
    sp.position.copy(dir).multiplyScalar(rad * 1.01);
    sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dir.z, 0, dir.x).normalize());
    dome.add(sp);
  }
}

export function buildCakeHatC(THREE, g, k, h) {
  const HR = k.HR, rad = HR * 0.80, ang = Math.PI / 3;
  const cx = 2 * rad * Math.sin(ang / 2) / (3 * ang / 2);
  const slice = new THREE.Group();
  slice.position.y = HR * 0.86;
  slice.rotation.set(0.05, 0.30, 0.08); g.add(slice);
  const inner = new THREE.Group(); inner.position.x = -cx; slice.add(inner);
  let y = 0;
  [[0.16, DS.choc], [0.06, DS.cream], [0.16, DS.choc], [0.06, DS.cream], [0.05, DS.pink]].forEach(([hh, c]) => {
    const m = new THREE.Mesh(wedgeLayer(THREE, rad, ang, HR * hh), h.clay(c));
    m.position.y = y; m.castShadow = true; inner.add(m);
    y += HR * hh;
  });
  [-0.3, 0, 0.3].forEach(t => {
    const sl = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.05, 8, 6), h.clay(DS.berry, false));
    sl.position.set(Math.cos(t * ang) * rad, HR * 0.19, -Math.sin(t * ang) * rad);
    sl.scale.set(0.5, 1, 1); sl.rotation.y = t * ang; inner.add(sl);
  });
  for (let i = 0; i < 4; i++) {
    const t = (i / 3 - 0.5) * 0.8;
    const d = dollop(THREE, h, HR * 0.07, DS.cream, 2);
    d.position.set(Math.cos(t * ang) * rad * 0.86, y, Math.sin(t * ang) * rad * 0.86); inner.add(d);
  }
  const sb = strawberry(THREE, h, HR * 0.28);
  sb.position.set(rad * 0.55, y, 0); sb.rotation.z = 0.3; inner.add(sb);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(HR * 0.20, HR * 0.12, HR * 0.025), h.clay(DS.chocDark));
  ch.position.set(rad * 0.30, y + HR * 0.07, HR * 0.05); ch.rotation.set(0, 0.4, 0.3); ch.castShadow = true; inner.add(ch);
}

function choker(THREE, g, h, r, color, tubeK = 0.09, sy = 1.6) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * tubeK, 8, 44), h.clay(color, false));
  t.rotation.x = Math.PI / 2; t.position.y = r * 0.04; t.scale.z = sy; t.castShadow = true; g.add(t);
}

function bow(THREE, h, s, color, dark) {
  const b = new THREE.Group();
  [-1, 1].forEach(x => {
    const lp = new THREE.Mesh(new THREE.TorusGeometry(s * 0.42, s * 0.16, 6, 14), h.clay(color, false));
    lp.position.set(x * s * 0.48, s * 0.04, 0); lp.rotation.z = x * 0.35; lp.scale.set(1, 0.72, 0.55); b.add(lp);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(s * 0.18, s * 0.80, 4), h.clay(dark));
    tail.position.set(x * s * 0.26, -s * 0.42, -s * 0.02); tail.rotation.z = Math.PI + x * 0.40; tail.scale.z = 0.35; b.add(tail);
  });
  b.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return b;
}

export function buildMacaronBroochA(THREE, g, k, h) {
  const r = k.neckR;
  choker(THREE, g, h, r, DS.pinkDark);
  const w = new THREE.Group();
  const m = macaron(THREE, h, r * 0.26, DS.mint, DS.pink); m.position.y = -r * 0.16; w.add(m);
  const b = bow(THREE, h, r * 0.24, DS.berry, DS.berryDark); b.position.set(0, r * 0.12, r * 0.10); w.add(b);
  stickOn(THREE, k, g, w, new THREE.Vector3(0, -r * 0.30, r), 1.15);
}

const strandAt = (THREE, r, a) => new THREE.Vector3(Math.sin(a) * r, -r * 0.04 - Math.max(0, Math.cos(a)) * r * 0.22, Math.cos(a) * r);

export function buildMacaronBroochB(THREE, g, k, h) {
  const r = k.neckR, n = 14, cols = [DS.pink, DS.mint, DS.lilac, DS.lemon];
  const pts = Array.from({ length: 48 }, (_, i) => pushOut(THREE, k, strandAt(THREE, r, (i / 48) * TAU), 1.09));
  g.add(tubeAlong(THREE, [...pts, pts[0]], r * 0.025, h.clay(DS.creamDark), 96, 5));
  for (let i = 1; i < n; i++) {
    const w = new THREE.Group(); w.add(macaron(THREE, h, r * 0.11, cols[i % 4]));
    stickOn(THREE, k, g, w, strandAt(THREE, r, (i / n) * TAU), 1.13);
  }
  const big = new THREE.Group(); big.add(macaron(THREE, h, r * 0.20, DS.pink, DS.berry));
  stickOn(THREE, k, g, big, strandAt(THREE, r, 0), 1.15);
}

export function buildMacaronBroochC(THREE, g, k, h) {
  const r = k.neckR;
  choker(THREE, g, h, r, DS.lilacDark, 0.05, 1.0);
  const w = new THREE.Group();
  w.add(bow(THREE, h, r * 0.42, DS.lilac, DS.lilacDark));
  const m = macaron(THREE, h, r * 0.17, DS.mint); m.position.z = r * 0.06; w.add(m);
  w.add(tubeAlong(THREE, [new THREE.Vector3(0, -r * 0.12, r * 0.02), new THREE.Vector3(r * 0.02, -r * 0.30, r * 0.03), new THREE.Vector3(0, -r * 0.44, r * 0.02)], r * 0.018, h.clay(DS.lemonDark), 8, 5));
  const sb = strawberry(THREE, h, r * 0.20); sb.rotation.x = Math.PI; sb.position.set(0, -r * 0.40, r * 0.02); w.add(sb);
  stickOn(THREE, k, g, w, new THREE.Vector3(r * 0.45, -r * 0.24, r * 0.88), 1.15);
}

function clearZ(k, y0, y1, pad = 0.03) {
  let z = Infinity;
  for (let i = 0; i <= 8; i++) z = Math.min(z, backFront(k, y0 + (y1 - y0) * i / 8, pad).z);
  return z;
}

function cupcake(THREE, h, s, cup, frost, ribs = 12) {
  const g = new THREE.Group();
  const H = s * 0.85, rb = s * 0.62, rt = s * 0.82;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, H, ribs * 2), h.clay(cup));
  body.position.y = H / 2; g.add(body);
  const tilt = Math.atan2(rt - rb, H);
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * TAU, ra = (rt + rb) / 2;
    const st = new THREE.Mesh(new THREE.BoxGeometry(s * 0.06, H * 0.98, s * 0.06), h.clay(DS.waferDark));
    st.position.set(Math.cos(a) * ra * 1.02, H / 2, Math.sin(a) * ra * 1.02);
    st.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt); g.add(st);
  }
  const cake = new THREE.Mesh(new THREE.SphereGeometry(rt * 0.98, 16, 8, 0, TAU, 0, Math.PI / 2), h.clay(DS.sponge, false));
  cake.position.y = H; cake.scale.y = 0.35; g.add(cake);
  const f = dollop(THREE, h, rt * 0.95, frost, 3); f.position.y = H + s * 0.04; g.add(f);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, top: H + s * 0.04 + rt * 0.95 * 0.42 * 3 };
}

export function buildCupcakePackA(THREE, g, k, h) {
  const R = k.R, s = R * 0.36, D = 0.62, y0 = 1.42;
  const z = clearZ(k, y0, y0 + 0.9);
  const pack = new THREE.Group(); pack.position.set(0, backFront(k, y0).y, z - s * 0.82 * D); pack.scale.z = D; g.add(pack);
  const c = cupcake(THREE, h, s, DS.pink, DS.cream);
  pack.add(c.g);
  const ch = new THREE.Mesh(new THREE.SphereGeometry(s * 0.17, 10, 8), h.clay(DS.berry, false));
  ch.position.y = c.top + s * 0.06; pack.add(ch);
  pack.add(tubeAlong(THREE, [new THREE.Vector3(0, c.top + s * 0.2, 0), new THREE.Vector3(s * 0.06, c.top + s * 0.34, 0), new THREE.Vector3(s * 0.16, c.top + s * 0.40, 0)], s * 0.025, h.clay(DS.leaf), 8, 4));
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996, t = (i + 0.5) / 14, rr = s * 0.80 * (1 - t * 0.75);
    const sp = sprinkle(THREE, h, s * 0.10, SPRINKLE[i % SPRINKLE.length]);
    sp.position.set(Math.cos(a) * rr, s * 0.95 + t * s * 0.95, Math.sin(a) * rr);
    sp.rotation.set(i, i * 2, 0); pack.add(sp);
  }
  strapsFrom(THREE, g, k, h, [-1, 1].map(x => new THREE.Vector3(x * R * 0.22, pack.position.y + s * 0.40, z + R * 0.01)), DS.pinkDark);
}

export function buildCupcakePackB(THREE, g, k, h) {
  const R = k.R, W = R * 0.64, Hh = R * 0.46, D = R * 0.22, y0 = 1.42;
  const z = clearZ(k, y0, y0 + 0.5) - D / 2;
  const ctr = new THREE.Vector3(0, backFront(k, y0).y + Hh / 2, z);
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), h.clay(DS.cream)); box.position.copy(ctr); box.castShadow = true; g.add(box);
  const back = ctr.z - D / 2;
  const win = new THREE.Mesh(new THREE.BoxGeometry(W * 0.70, Hh * 0.44, R * 0.02), h.clay(DS.chocDark)); win.position.set(0, ctr.y - Hh * 0.06, back - R * 0.005); g.add(win);
  [-1, 0, 1].forEach((x, i) => {
    const c = cupcake(THREE, h, R * 0.075, [DS.pink, DS.mint, DS.lilac][i], [DS.cream, DS.pink, DS.cream][i], 8);
    c.g.position.set(x * W * 0.22, ctr.y - Hh * 0.27, back - R * 0.035); g.add(c.g);
  });
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(W / stripes * 0.5, Hh * 0.2, D * 1.02), h.clay(DS.pink));
    st.position.set(-W / 2 + W / stripes * (i + 0.5), ctr.y + Hh * 0.42, ctr.z); g.add(st);
  }
  const ribbonV = new THREE.Mesh(new THREE.BoxGeometry(R * 0.06, Hh * 1.03, D * 1.04), h.clay(DS.berry)); ribbonV.position.copy(ctr); g.add(ribbonV);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(R * 0.10, R * 0.022, 5, 12, Math.PI), h.clay(DS.berryDark));
  handle.position.set(0, ctr.y + Hh / 2, ctr.z); g.add(handle);
  const bw = bow(THREE, h, R * 0.09, DS.berry, DS.berryDark); bw.position.set(0, ctr.y + Hh * 0.30, back - R * 0.03); bw.rotation.y = Math.PI; g.add(bw);
  strapsFrom(THREE, g, k, h, [-1, 1].map(x => new THREE.Vector3(x * W * 0.32, ctr.y + Hh * 0.30, ctr.z + D / 2)), DS.berryDark);
}

export function buildCupcakePackC(THREE, g, k, h) {
  const R = k.R, y0 = 1.42, D = R * 0.24, W = R * 0.46, Hh = R * 0.24;
  const z = clearZ(k, y0, y0 + 0.75) - D / 2;
  const ctr = new THREE.Vector3(0, backFront(k, y0).y + Hh / 2, z);
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), h.clay(DS.wafer)); pouch.position.copy(ctr); pouch.castShadow = true; g.add(pouch);
  for (let i = -2; i <= 2; i++) {
    [[R * 0.012, Hh * 1.01, D * 1.02, i * W * 0.2, 0], [W * 1.01, R * 0.012, D * 1.02, 0, i * Hh * 0.2]].forEach(([a, b, c, x, y]) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(a, b, c), h.clay(DS.waferDark)); l.position.set(ctr.x + x, ctr.y + y, ctr.z); g.add(l);
    });
  }
  const trayY = ctr.y + Hh / 2;
  const trayZ = Math.min(clearZ(k, y0 + 0.24, y0 + 0.70), ctr.z + D / 2) - R * 0.24;
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.36, R * 0.30, R * 0.04, 20), h.clay(DS.lilac)); tray.position.set(0, trayY + R * 0.02, trayZ); tray.scale.z = 0.62; tray.castShadow = true; g.add(tray);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.36, R * 0.02, 5, 24), h.clay(DS.lilacDark)); rim.rotation.x = Math.PI / 2; rim.scale.y = 0.62; rim.position.set(0, trayY + R * 0.04, trayZ); g.add(rim);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(R * 0.10, R * 0.06, Math.abs(ctr.z - trayZ) + D / 2), h.clay(DS.lilacDark)); prop.position.set(0, trayY - R * 0.01, (ctr.z + trayZ) / 2); g.add(prop);
  [[-0.17, 0.02, DS.pink, DS.cream], [0.17, 0.0, DS.mint, DS.choc]].forEach(([x, dz, cup, fr]) => {
    const c = cupcake(THREE, h, R * 0.16, cup, fr, 10);
    c.g.position.set(x * R, trayY + R * 0.04, trayZ + dz * R); g.add(c.g);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(R * 0.035, 8, 6), h.clay(DS.berry, false));
    ch.position.set(x * R, trayY + R * 0.04 + c.top + R * 0.01, trayZ + dz * R); g.add(ch);
  });
  strapsFrom(THREE, g, k, h, [-1, 1].map(x => new THREE.Vector3(x * W * 0.32, ctr.y + Hh * 0.35, ctr.z + D / 2)), DS.lilacDark);
}

const PAW = [[-0.50, 0.30], [-0.18, 0.52], [0.18, 0.52], [0.50, 0.30]];

function sprinkles(THREE, g, s, o, h, list) {
  list.forEach(([x, z, c], i) => {
    const sp = h.put(g, new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.025, s * 0.09, 2, 4), h.film(c, o)), x * s, 0.012, z * s, false);
    sp.rotation.set(Math.PI / 2, 0, i * 1.2);
  });
}

function peak(THREE, g, s, o, h, x, z, r, c = DS.cream) {
  const m = h.put(g, new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.3, 8), h.film(c, o)), x, r * 0.22, z, false);
  m.scale.y = 0.45;
  return m;
}

export function buildCreamTrailA(THREE, g, s, o, id, h) {
  const base = (r, x, z, sx, sz) => { const m = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 12, 6), h.film(DS.creamDark, o * 0.95)), x, 0.006, z, false); m.scale.set(sx, 0.14, sz); };
  base(s * 0.44, 0, -s * 0.12, 1.15, 0.95);
  PAW.forEach(([x, z]) => base(s * 0.17, x * s, z * s, 0.9, 1.15));
  peak(THREE, g, s, o * 0.95, h, 0, -s * 0.12, s * 0.30);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; peak(THREE, g, s, o * 0.9, h, Math.cos(a) * s * 0.26, -s * 0.12 + Math.sin(a) * s * 0.22, s * 0.16); }
  PAW.forEach(([x, z]) => peak(THREE, g, s, o * 0.95, h, x * s, z * s, s * 0.15));
  sprinkles(THREE, g, s, o, h, [[-0.7, -0.5, DS.berry], [0.65, -0.55, DS.mint], [0.1, -0.85, DS.lemon], [0.85, 0.65, DS.lilac]]);
}

export function buildCreamTrailB(THREE, g, s, o, id, h) {
  const n = 9, R = s * 0.52;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; peak(THREE, g, s, o * 0.95, h, Math.cos(a) * R, Math.sin(a) * R, s * 0.17).rotation.y = a; }
  const slice = h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(s * 0.30, s * 0.30, s * 0.04, 14), h.film(DS.berry, o)), 0, 0.01, 0, false);
  slice.scale.set(0.9, 1, 1.15);
  const core = h.put(g, new THREE.Mesh(new THREE.CylinderGeometry(s * 0.15, s * 0.15, s * 0.045, 12), h.film(DS.pink, o)), 0, 0.012, s * 0.02, false);
  core.scale.set(0.9, 1, 1.25);
  const leaf = h.put(g, new THREE.Mesh(new THREE.ConeGeometry(s * 0.12, s * 0.05, 5), h.film(DS.leaf, o)), 0, 0.02, s * 0.36, false);
  leaf.scale.z = 0.6;
}

export function buildCreamTrailC(THREE, g, s, o, id, h) {
  const flat = (r, x, z, sx = 1, sz = 1, op = 0.9) => { const m = h.put(g, new THREE.Mesh(new THREE.SphereGeometry(r, 12, 6), h.film(DS.choc, o * op)), x, 0.006, z, false); m.scale.set(sx, 0.10, sz); return m; };
  flat(s * 0.42, 0, -s * 0.12, 1.15, 0.95);
  PAW.forEach(([x, z]) => flat(s * 0.16, x * s, z * s, 0.9, 1.15));
  flat(s * 0.08, s * 0.30, -s * 0.62, 1, 2.0, 0.85);
  flat(s * 0.07, -s * 0.34, -s * 0.66, 1, 1.6, 0.85);
  peak(THREE, g, s, o, h, 0, -s * 0.12, s * 0.17);
  sprinkles(THREE, g, s, o, h, [[-0.35, 0.05, DS.berry], [0.38, 0.0, DS.mint], [0.05, 0.25, DS.lemon], [-0.15, -0.42, DS.lilac], [0.22, -0.32, DS.berry]]);
}

export const VARIANTS = {
  ds_cake_hat: {
    slot: 'head', name: '딸기 케이크 모자',
    A: { name: '작은 홀케이크', note: '정수리에 2단 생크림 케이크 · 크림 꽃 둘레 + 가운데 큰 딸기 · 옆면 딸기 조각', build: buildCakeHatA },
    B: { name: '분홍 크림 모자', note: '머리를 덮는 분홍 크림 모자 · 테두리에서 크림이 흘러내림 · 꼭대기 크림과 딸기 · 스프링클', build: buildCakeHatB },
    C: { name: '조각 케이크', note: '세모 조각 초코 케이크가 비스듬히 · 단면에 크림 층 · 딸기와 초콜릿 판', build: buildCakeHatC },
  },
  ds_macaron_brooch: {
    slot: 'neck', name: '마카롱 목걸이',
    A: { name: '리본 초커 + 큰 마카롱', note: '분홍 리본 초커 · 가운데 큰 민트 마카롱 브로치 + 딸기색 리본', build: buildMacaronBroochA },
    B: { name: '알록달록 마카롱 줄', note: '분홍·민트·라벤더·레몬 작은 마카롱을 꿴 목걸이 · 가운데 큰 마카롱', build: buildMacaronBroochB },
    C: { name: '라벤더 리본 브로치', note: '가는 끈 · 큰 라벤더 리본 안에 민트 마카롱 · 아래 딸기 장식이 달랑', build: buildMacaronBroochC },
  },
  ds_cupcake_pack: {
    slot: 'back', cols: 'back2', name: '컵케이크 배낭',
    A: { name: '큰 컵케이크', note: '주름 컵 + 크림 꼬깔 + 체리 · 스프링클 · 등 가운데 통째 컵케이크', build: buildCupcakePackA },
    B: { name: '케이크 상자 가방', note: '줄무늬 크림 상자 · 창으로 작은 컵케이크 셋 · 딸기 리본 손잡이', build: buildCupcakePackB },
    C: { name: '쟁반 배달 가방', note: '와플 주머니 위 라벤더 쟁반 · 컵케이크 둘이 어깨 위로 보임', build: buildCupcakePackC },
  },
  ds_cream_trail: {
    slot: 'trail', name: '크림 발자국',
    A: { name: '생크림 발자국', note: '발자국 모양으로 짠 생크림 꼬깔 + 흩어진 스프링클', build: buildCreamTrailA },
    B: { name: '크림 링 + 딸기', note: '둥글게 짠 크림 테두리 가운데 딸기 단면', build: buildCreamTrailB },
    C: { name: '초코 시럽 발자국', note: '초코 시럽 발자국 + 흐른 방울 · 크림 한 점과 스프링클', build: buildCreamTrailC },
  },
};
