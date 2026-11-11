const LANTERN_CAP = 0x3a2a20;

function kit(THREE) {
  const mats = new Map();
  const UP = new THREE.Vector3(0, 1, 0);
  const mat = (c, flat = false) => {
    const key = `${c}:${flat}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0, flatShading: flat }));
    return mats.get(key);
  };
  const glow = (c, k) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: Math.min(k, 0.6), roughness: 0.6 });
  const add = (parent, geo, material, shadow = true) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const place = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) => geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(...s),
  ));
  const rod = (a, b, r1, r2 = r1, seg = 8) => {
    const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b), d = pb.clone().sub(pa);
    const geo = new THREE.CylinderGeometry(r2, r1, d.length(), seg);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
    return geo.applyMatrix4(new THREE.Matrix4().compose(pa.clone().add(pb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  };
  const merge = geos => {
    const parts = geos.map(g => (g.index ? g.toNonIndexed() : g));
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal']) {
      const total = parts.reduce((t, g) => t + g.getAttribute(name).array.length, 0);
      const arr = new Float32Array(total);
      parts.reduce((off, g) => { arr.set(g.getAttribute(name).array, off); return off + g.getAttribute(name).array.length; }, 0);
      out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
    return out;
  };
  const extrude = (shape, depth, bevel = 0.012, curveSegments = 28) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments });
    g.translate(0, 0, -depth / 2);
    return g;
  };
  const crescent = (R, r, d) => {
    const xi = (d * d + R * R - r * r) / (2 * d);
    const yi = Math.sqrt(R * R - xi * xi);
    const t = Math.atan2(yi, xi);
    const s = new THREE.Shape();
    s.absarc(0, 0, R, t, -t, false);
    s.absarc(d, 0, r, Math.atan2(-yi, xi - d), Math.atan2(yi, xi - d), true);
    return s;
  };
  const star = (r, k = 0.48) => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + i * Math.PI / 5, m = i % 2 ? r * k : r;
      if (i) s.lineTo(Math.cos(a) * m, Math.sin(a) * m); else s.moveTo(Math.cos(a) * m, Math.sin(a) * m);
    }
    s.closePath();
    return s;
  };
  const archBand = (w, h, t) => {
    const s = new THREE.Shape(), y0 = h - w;
    s.moveTo(-w, 0);
    s.lineTo(-w, y0);
    s.absarc(0, y0, w, Math.PI, 0, true);
    s.lineTo(w, 0);
    s.lineTo(w - t, 0);
    s.lineTo(w - t, y0);
    s.absarc(0, y0, w - t, 0, Math.PI, false);
    s.lineTo(-w + t, 0);
    s.closePath();
    return s;
  };
  const poly = pts => {
    const s = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return s;
  };
  const lanterns = (parent, spots, s, color, k, capColor = LANTERN_CAP) => {
    const bodies = [], caps = [];
    for (const [x, y, z] of spots) {
      bodies.push(place(new THREE.SphereGeometry(0.15, 12, 10), x, y, z, 0, 0, 0, [s, s * 1.2, s]));
      caps.push(place(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), x, y + 0.19 * s, z, 0, 0, 0, [s, s, s]));
      caps.push(place(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8), x, y - 0.19 * s, z, 0, 0, 0, [s, s, s]));
    }
    add(parent, merge(bodies), glow(color, k));
    add(parent, merge(caps), mat(capColor), false);
  };
  const hangFrom = (cx, cy, ri, deg, s) => {
    const a = deg * Math.PI / 180;
    return [cx + Math.sin(a) * ri, cy + Math.cos(a) * ri - 0.215 * s + 0.012, 0];
  };
  return { mat, glow, add, place, rod, merge, extrude, crescent, star, archBand, poly, lanterns, hangFrom };
}

const A = {
  wood: 0xc79a63, rope: 0xeadcbc, moon: 0xffe2a0, lamp: 0xffc46b, star: 0xffd26a,

  moonswing(THREE, k) {
    const g = new THREE.Group(), wood = k.mat(A.wood);
    const legs = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push(k.rod([sx * 0.86, 0, sz * 0.42], [sx * 0.8, 2.17, 0], 0.056, 0.046));
    legs.push(k.rod([-0.94, 2.19, 0], [0.94, 2.19, 0], 0.062, 0.062, 10));
    k.add(g, k.merge(legs), wood);
    const R = 0.52, r = 0.44, d = 0.25, cy = 1.0, rot = Math.PI / 2 + 0.5;
    const xi = (d * d + R * R - r * r) / (2 * d), yi = Math.sqrt(R * R - xi * xi);
    k.add(g, k.place(k.extrude(k.crescent(R, r, d), 0.13, 0.016), 0, cy, 0, 0, 0, rot), k.glow(A.moon, 0.42));
    const tip = sy => [Math.cos(rot) * xi - Math.sin(rot) * sy, cy + Math.sin(rot) * xi + Math.cos(rot) * sy];
    const ropes = [yi, -yi].map(sy => { const [x, y] = tip(sy * 0.93); return k.rod([x, y - 0.02, 0], [x, 2.14, 0], 0.02, 0.02, 6); });
    k.add(g, k.merge(ropes), k.mat(A.rope), false);
    return g;
  },

  lanternarch(THREE, k) {
    const g = new THREE.Group(), wood = k.mat(A.wood);
    const w = 0.92, h = 2.42, t = 0.13;
    const parts = [k.extrude(k.archBand(w, h, t), 0.16, 0.014)];
    for (const sx of [-1, 1]) parts.push(k.place(new THREE.BoxGeometry(0.26, 0.08, 0.28), sx * (w - t / 2), 0.04, 0));
    k.add(g, k.merge(parts), wood);
    const s = 0.85, ri = w - t - 0.014, cy = h - w;
    k.lanterns(g, [-36, 0, 36].map(a => k.hangFrom(0, cy, ri, a, s)), s, A.lamp, 0.48, 0x8f633f);
    return g;
  },

  starvane(THREE, k) {
    const g = new THREE.Group(), wood = k.mat(A.wood);
    k.add(g, k.merge([
      k.place(new THREE.CylinderGeometry(0.15, 0.2, 0.14, 14), 0, 0.07, 0),
      k.place(new THREE.CylinderGeometry(0.034, 0.05, 1.52, 10), 0, 0.14 + 0.76, 0),
      k.place(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 12), 0, 1.66, 0),
      k.place(new THREE.SphereGeometry(0.066, 12, 10), 0, 1.73, 0),
      k.place(new THREE.ConeGeometry(0.035, 0.14, 10), 0, 1.84, 0),
    ]), wood);
    const spin = new THREE.Group();
    spin.position.y = 1.44;
    g.add(spin);
    k.add(spin, k.merge([
      k.place(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 12), 0, 0, 0),
      k.place(new THREE.BoxGeometry(0.86, 0.036, 0.036), 0.03, 0, 0),
      k.place(k.extrude(k.poly([[0, 0.085], [0.22, 0], [0, -0.085]]), 0.036, 0.008), 0.44, 0, 0),
    ]), wood);
    k.add(spin, k.place(k.extrude(k.star(0.19, 0.5), 0.05, 0.012), -0.44, 0, 0), k.glow(A.star, 0.5));
    g.userData.spin = spin;
    return g;
  },
};

const B = {
  bark: 0x7a5536, barkLight: 0x8f6a45, cut: 0xd9b27a, plank: 0xb98654, twine: 0xc9a66b,
  moon: 0xf3dca2, willow: [0x9a7048, 0xb3875a], leaf: 0x6f9a48, grass: 0x7fa04a,
  paper: 0xffb45a, capDark: 0x5e3b22, acornNut: 0xc08a4a, acornCap: 0x6d4a2e, star: 0xf2c14e,

  tufts(THREE, k, spots) {
    const geos = [];
    spots.forEach(([x, z], i) => {
      for (let j = 0; j < 3; j++) {
        const a = i * 1.7 + j * 2.1;
        geos.push(k.place(new THREE.ConeGeometry(0.045, 0.2 - j * 0.03, 5), x + Math.cos(a) * 0.05, 0.09 - j * 0.015, z + Math.sin(a) * 0.05, Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25));
      }
    });
    return k.merge(geos);
  },

  moonswing(THREE, k) {
    const g = new THREE.Group(), bark = k.mat(B.bark, true);
    k.add(g, k.merge([
      k.rod([-0.8, 0, 0], [-0.8, 2.12, 0], 0.088, 0.076, 7),
      k.rod([0.8, 0, 0], [0.8, 2.12, 0], 0.088, 0.076, 7),
      k.rod([-0.99, 2.13, 0], [0.99, 2.13, 0], 0.086, 0.086, 7),
      k.rod([-0.8, 1.7, 0], [-0.5, 2.08, 0], 0.04, 0.036, 6),
      k.rod([0.8, 1.7, 0], [0.5, 2.08, 0], 0.04, 0.036, 6),
    ]), bark);
    k.add(g, k.merge([-1, 1].map(sx => k.place(new THREE.CylinderGeometry(0.072, 0.072, 0.014, 7), sx * 0.992, 2.13, 0, 0, 0, Math.PI / 2))), k.mat(B.cut, true), false);
    const seatY = 0.58;
    k.add(g, k.place(new THREE.BoxGeometry(0.84, 0.07, 0.34), 0, seatY, 0), k.mat(B.plank, true));
    k.add(g, k.place(k.extrude(k.crescent(0.37, 0.31, 0.15), 0.07, 0.012), 0, seatY + 0.385, -0.13, 0, 0, 0.3), k.glow(B.moon, 0.3));
    k.add(g, k.merge([-1, 1].map(sx => k.rod([sx * 0.36, seatY, 0], [sx * 0.36, 2.06, 0], 0.02, 0.02, 6))), k.mat(B.twine), false);
    k.add(g, B.tufts(THREE, k, [[-0.8, 0.1], [0.8, -0.08]]), k.mat(B.grass, true), false);
    return g;
  },

  lanternarch(THREE, k) {
    const g = new THREE.Group();
    const w = 0.85, cy = 1.45, N = 90;
    const center = s => {
      const L1 = cy, L2 = Math.PI * w, total = 2 * L1 + L2, u = s * total;
      if (u < L1) return [new THREE.Vector3(-w, u, 0), new THREE.Vector3(1, 0, 0)];
      if (u < L1 + L2) {
        const a = Math.PI - (u - L1) / w;
        return [new THREE.Vector3(Math.cos(a) * w, cy + Math.sin(a) * w, 0), new THREE.Vector3(-Math.cos(a), -Math.sin(a), 0)];
      }
      return [new THREE.Vector3(w, cy - (u - L1 - L2), 0), new THREE.Vector3(-1, 0, 0)];
    };
    [0, 1].forEach(i => {
      const pts = [];
      for (let j = 0; j <= N; j++) {
        const s = j / N, [p, n] = center(s), ph = s * Math.PI * 2 * 3 + i * Math.PI;
        pts.push(p.clone().addScaledVector(n, Math.cos(ph) * 0.032).add(new THREE.Vector3(0, 0, Math.sin(ph) * 0.032)));
      }
      pts[0].y = 0; pts[N].y = 0;
      k.add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.042, 6), k.mat(B.willow[i], true));
    });
    const leaves = [0.06, 0.1, 0.15, 0.44, 0.5, 0.55, 0.9].map((s, i) => {
      const [p, n] = center(s), side = i % 2 ? 1 : -1;
      return k.place(new THREE.IcosahedronGeometry(0.075, 0), p.x - n.x * 0.06, p.y - n.y * 0.06 + 0.02, p.z + side * 0.05, 0.4 * side, i * 0.9, i * 0.7, [1, 0.42, 0.62]);
    });
    k.add(g, k.merge(leaves), k.mat(B.leaf, true), false);
    const s = 0.9, ri = w - 0.085;
    k.lanterns(g, [-42, 0, 42].map(a => k.hangFrom(0, cy, ri, a, s)), s, B.paper, 0.45, B.capDark);
    k.add(g, B.tufts(THREE, k, [[-w, 0.08], [w, -0.06]]), k.mat(B.grass, true), false);
    return g;
  },

  starvane(THREE, k) {
    const g = new THREE.Group(), bark = k.mat(B.bark, true);
    const roots = [0.5, 2.6, 4.4].map(a => k.place(new THREE.ConeGeometry(0.075, 0.26, 5), Math.cos(a) * 0.27, 0.05, Math.sin(a) * 0.27, 0, -a, Math.PI / 2 + 0.25, [1, 1, 0.8]));
    k.add(g, k.merge([k.place(new THREE.CylinderGeometry(0.22, 0.27, 0.34, 8), 0, 0.17, 0), ...roots]), bark);
    k.add(g, k.place(new THREE.CylinderGeometry(0.2, 0.2, 0.014, 8), 0, 0.343, 0), k.mat(B.cut, true));
    k.add(g, k.place(new THREE.CylinderGeometry(0.032, 0.046, 1.28, 7), 0, 0.34 + 0.64, 0), k.mat(B.barkLight, true));
    k.add(g, k.place(new THREE.SphereGeometry(0.062, 10, 8), 0, 1.7, 0, 0, 0, 0, [1, 1.25, 1]), k.mat(B.acornNut));
    k.add(g, k.merge([
      k.place(new THREE.SphereGeometry(0.072, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.735, 0),
      k.place(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 5), 0, 1.8, 0),
    ]), k.mat(B.acornCap, true));
    const spin = new THREE.Group();
    spin.position.y = 1.46;
    g.add(spin);
    k.add(spin, k.merge([
      k.rod([-0.42, 0, 0], [0.44, 0, 0], 0.024, 0.02, 6),
      k.place(new THREE.SphereGeometry(0.048, 8, 6), 0, 0, 0),
    ]), k.mat(B.barkLight, true));
    k.add(spin, k.place(k.extrude(k.poly([[0, 0.08], [0.1, 0.05], [0.22, 0], [0.1, -0.05], [0, -0.08]]), 0.04, 0.008), 0.42, 0, 0), k.mat(B.plank, true));
    k.add(spin, k.place(k.extrude(k.star(0.2, 0.5), 0.06, 0.014), -0.45, 0, 0, 0, 0, 0.12), k.glow(B.star, 0.42));
    k.add(g, B.tufts(THREE, k, [[0.22, 0.2], [-0.25, -0.12]]), k.mat(B.grass, true), false);
    g.userData.spin = spin;
    return g;
  },
};

const C = {
  dark: 0x6d4a2e, red: 0xb8433f, cream: 0xfff2e0, gold: 0xe0b04a,
  moon: 0xfff0c8, lamp: 0xff9a4c, star: 0xffcf5a,

  moonswing(THREE, k) {
    const g = new THREE.Group();
    const R = 1.12, r = 0.98, d = 0.44, ox = 0.25, cy = 0.12 + R - 0.07;
    k.add(g, k.place(new THREE.BoxGeometry(1.0, 0.12, 0.5), -0.12, 0.06, 0), k.mat(C.dark));
    k.add(g, k.place(new THREE.BoxGeometry(1.02, 0.035, 0.52), -0.12, 0.085, 0), k.mat(C.gold), false);
    k.add(g, k.place(k.extrude(k.crescent(R, r, d), 0.14, 0.014, 56), -ox, cy, 0), k.glow(C.moon, 0.34));
    const seatY = 0.8, cords = [];
    for (const x of [-0.21, 0.23]) {
      const top = cy + Math.sqrt(r * r - (x + ox - d) * (x + ox - d));
      cords.push(k.rod([x, seatY, 0], [x, top + 0.012, 0], 0.018, 0.018, 6));
    }
    k.add(g, k.merge(cords), k.mat(C.gold), false);
    k.add(g, k.place(new THREE.BoxGeometry(0.58, 0.07, 0.28), 0.01, seatY, 0), k.mat(C.red));
    return g;
  },

  lanternarch(THREE, k) {
    const g = new THREE.Group();
    const px = 0.85;
    k.add(g, k.merge([
      k.rod([-px, 0, 0], [-px, 2.12, 0], 0.09, 0.08, 10),
      k.rod([px, 0, 0], [px, 2.12, 0], 0.09, 0.08, 10),
      k.place(new THREE.BoxGeometry(0.26, 0.1, 0.26), -px, 0.05, 0),
      k.place(new THREE.BoxGeometry(0.26, 0.1, 0.26), px, 0.05, 0),
    ]), k.mat(C.dark));
    k.add(g, k.merge([-1, 1].map(sx => k.place(new THREE.SphereGeometry(0.11, 12, 10), sx * px, 2.22, 0))), k.mat(C.gold));
    const Rl = 3.2, half = 1.02, th = 0.15, base = 1.93;
    const a0 = Math.asin(half / Rl), cyl = base - Rl * Math.cos(a0);
    const lintel = new THREE.Shape();
    lintel.absarc(0, cyl, Rl + th, Math.PI / 2 + a0, Math.PI / 2 - a0, true);
    lintel.absarc(0, cyl, Rl, Math.PI / 2 - a0, Math.PI / 2 + a0, false);
    k.add(g, k.extrude(lintel, 0.16, 0.012, 24), k.mat(C.red));
    const barY = 1.7;
    k.add(g, k.place(new THREE.BoxGeometry(px * 2, 0.07, 0.09), 0, barY, 0), k.mat(C.cream));
    k.lanterns(g, [-0.46, 0, 0.46].map(x => [x, barY - 0.035 - 0.215 + 0.01, 0]), 1, C.lamp, 0.55);
    return g;
  },

  starvane(THREE, k) {
    const g = new THREE.Group();
    k.add(g, k.merge([
      k.place(new THREE.BoxGeometry(0.38, 0.16, 0.38), 0, 0.08, 0),
      k.place(new THREE.CylinderGeometry(0.04, 0.052, 1.52, 10), 0, 0.16 + 0.76, 0),
    ]), k.mat(C.dark));
    k.add(g, k.place(new THREE.BoxGeometry(0.4, 0.04, 0.4), 0, 0.13, 0), k.mat(C.gold), false);
    k.add(g, k.merge([
      k.place(new THREE.SphereGeometry(0.075, 12, 10), 0, 1.74, 0),
      k.place(new THREE.ConeGeometry(0.03, 0.13, 10), 0, 1.86, 0),
    ]), k.mat(C.gold));
    const spin = new THREE.Group();
    spin.position.y = 1.46;
    g.add(spin);
    k.add(spin, k.place(new THREE.BoxGeometry(0.86, 0.036, 0.036), 0, 0, 0), k.mat(C.dark));
    k.add(spin, k.place(new THREE.CylinderGeometry(0.058, 0.058, 0.1, 12), 0, 0, 0), k.mat(C.gold));
    k.add(spin, k.place(k.extrude(k.poly([[0, 0.09], [0.22, 0], [0, -0.09]]), 0.04, 0.008), 0.42, 0, 0), k.mat(C.red));
    k.add(spin, k.place(k.extrude(k.star(0.2, 0.48), 0.05, 0.012), -0.45, 0, 0), k.glow(C.star, 0.5));
    g.userData.spin = spin;
    return g;
  },
};

const VARIANTS = { A, B, C };

export const COMPARE_IDS = ['moonswing', 'lanternarch', 'starvane'];

export function buildVariant(THREE, variant, id) {
  const v = VARIANTS[variant];
  if (!v || !COMPARE_IDS.includes(id)) return null;
  return v[id](THREE, kit(THREE));
}
