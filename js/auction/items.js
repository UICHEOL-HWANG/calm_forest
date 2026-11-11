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

const STAGE = {
  dark: 0x6d4a2e, red: 0xb8433f, cream: 0xfff2e0, gold: 0xe0b04a,
  moon: 0xfff0c8, lamp: 0xff9a4c, star: 0xffcf5a,

  moonswing(THREE, k) {
    const g = new THREE.Group();
    const R = 1.12, r = 0.98, d = 0.44, ox = 0.25, cy = 0.12 + R - 0.07;
    k.add(g, k.place(new THREE.BoxGeometry(1.0, 0.12, 0.5), -0.12, 0.06, 0), k.mat(STAGE.dark));
    k.add(g, k.place(new THREE.BoxGeometry(1.02, 0.035, 0.52), -0.12, 0.085, 0), k.mat(STAGE.gold), false);
    k.add(g, k.place(k.extrude(k.crescent(R, r, d), 0.14, 0.014, 56), -ox, cy, 0), k.glow(STAGE.moon, 0.34));
    const seatY = 0.8, cords = [];
    for (const x of [-0.21, 0.23]) {
      const top = cy + Math.sqrt(r * r - (x + ox - d) * (x + ox - d));
      cords.push(k.rod([x, seatY, 0], [x, top + 0.012, 0], 0.018, 0.018, 6));
    }
    k.add(g, k.merge(cords), k.mat(STAGE.gold), false);
    k.add(g, k.place(new THREE.BoxGeometry(0.58, 0.07, 0.28), 0.01, seatY, 0), k.mat(STAGE.red));
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
    ]), k.mat(STAGE.dark));
    k.add(g, k.merge([-1, 1].map(sx => k.place(new THREE.SphereGeometry(0.11, 12, 10), sx * px, 2.22, 0))), k.mat(STAGE.gold));
    const Rl = 3.2, half = 1.02, th = 0.15, base = 1.93;
    const a0 = Math.asin(half / Rl), cyl = base - Rl * Math.cos(a0);
    const lintel = new THREE.Shape();
    lintel.absarc(0, cyl, Rl + th, Math.PI / 2 + a0, Math.PI / 2 - a0, true);
    lintel.absarc(0, cyl, Rl, Math.PI / 2 - a0, Math.PI / 2 + a0, false);
    k.add(g, k.extrude(lintel, 0.16, 0.012, 24), k.mat(STAGE.red));
    const barY = 1.7;
    k.add(g, k.place(new THREE.BoxGeometry(px * 2, 0.07, 0.09), 0, barY, 0), k.mat(STAGE.gold));
    k.lanterns(g, [-0.46, 0, 0.46].map(x => [x, barY - 0.035 - 0.215 + 0.01, 0]), 1, STAGE.lamp, 0.55);
    return g;
  },

  starvane(THREE, k) {
    const g = new THREE.Group();
    k.add(g, k.merge([
      k.place(new THREE.BoxGeometry(0.38, 0.16, 0.38), 0, 0.08, 0),
      k.place(new THREE.CylinderGeometry(0.04, 0.052, 1.52, 10), 0, 0.16 + 0.76, 0),
    ]), k.mat(STAGE.dark));
    k.add(g, k.place(new THREE.BoxGeometry(0.4, 0.04, 0.4), 0, 0.13, 0), k.mat(STAGE.gold), false);
    k.add(g, k.merge([
      k.place(new THREE.SphereGeometry(0.075, 12, 10), 0, 1.74, 0),
      k.place(new THREE.ConeGeometry(0.03, 0.13, 10), 0, 1.86, 0),
    ]), k.mat(STAGE.gold));
    const spin = new THREE.Group();
    spin.position.y = 1.46;
    g.add(spin);
    k.add(spin, k.place(new THREE.BoxGeometry(0.86, 0.036, 0.036), 0, 0, 0), k.mat(STAGE.dark));
    k.add(spin, k.place(new THREE.CylinderGeometry(0.058, 0.058, 0.1, 12), 0, 0, 0), k.mat(STAGE.gold));
    k.add(spin, k.place(k.extrude(k.poly([[0, 0.09], [0.22, 0], [0, -0.09]]), 0.04, 0.008), 0.42, 0, 0), k.mat(STAGE.red));
    k.add(spin, k.place(k.extrude(k.star(0.2, 0.48), 0.05, 0.012), -0.45, 0, 0), k.glow(STAGE.star, 0.5));
    g.userData.spin = spin;
    return g;
  },
};

const BUILDERS = { moonswing: STAGE.moonswing, lanternarch: STAGE.lanternarch, starvane: STAGE.starvane };

export const AUCTION_ITEM_IDS = ['moonswing', 'lanternarch', 'starvane'];

export function auctionItemMesh(THREE, id) {
  const build = BUILDERS[id];
  return build ? build(THREE, kit(THREE)) : null;
}
