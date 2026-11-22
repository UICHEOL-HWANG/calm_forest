export const PE = Object.freeze({ skin: 0xffcc96, mid: 0xf9a08a, rose: 0xee6f80, flush: 0xf2868a, leaf: 0x5aa040, leafD: 0x3a7a34, stem: 0x7a5a3a, ink: 0x3a2618, blush: 0xec7c84, hi: 0xe0d4c4 });

const TAU = Math.PI * 2;
const sstep = t => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };

export function peachKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], smooth = true, ws = 12) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const leafShape = (w, l) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(l * 0.3, w, l * 0.75, w * 0.8, l, 0); s.bezierCurveTo(l * 0.75, -w * 0.8, l * 0.3, -w, 0, 0); return s; };
  function leaf(p, w, l, x, y, z, rz, ry = 0, col = PE.leaf) { const m = M(ext(leafShape(w, l), w * 0.18, w * 0.06, 6), clay(col, { smooth: true }), x, y, z); m.rotation.set(0, ry, rz); p.add(m); return m; }
  function face(g, r, fz, s = 1) {
    [-1, 1].forEach(sx => {
      g.add(small(M(new THREE.SphereGeometry(r * 0.13, 8, 6), clay(PE.ink, { smooth: true }), sx * r * 0.32, r * 0.1, fz)));
      g.add(small(M(new THREE.SphereGeometry(r * 0.04, 5, 4), clay(PE.hi), sx * r * 0.29, r * 0.14, fz + s * r * 0.1)));
      sph(g, r * 0.13, PE.blush, sx * r * 0.58, -r * 0.12, fz - s * r * 0.04, [1, 0.7, 0.4], true, 8);
    });
    const sm = M(new THREE.TorusGeometry(r * 0.15, r * 0.04, 5, 10, Math.PI), clay(PE.ink), 0, -r * 0.08, fz); sm.rotation.z = Math.PI; if (s < 0) sm.rotation.y = Math.PI; g.add(sm);
  }
  function peachPoint(R, t, ph, o) {
    const sy = o.sy ?? 0.95, tip = o.tip ?? 0.12, u = t * Math.PI;
    const y = -R * Math.cos(u) * sy + R * tip * sstep((t - 0.55) / 0.45) ** 2;
    const r = R * Math.sin(u);
    return new THREE.Vector3(Math.sin(ph) * r, y, Math.cos(ph) * r * (o.sz ?? 1));
  }
  function peachBand(R, a0, a1, bd, o) {
    const geo = new THREE.SphereGeometry(1, o.ws ?? 22, Math.max(2, Math.round((a1 - a0) * 7)), 0, TAU, a0, a1 - a0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bd));
    const pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      pos.setXYZ(i, ...peachPoint(R, Math.acos(Math.max(-1, Math.min(1, -v.y))) / Math.PI, Math.atan2(v.x, v.z), o).toArray());
    }
    geo.computeVertexNormals();
    return geo;
  }
  function peach(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const bd = new THREE.Vector3(...(o.blushDir ?? [0.35, 0.8, 0.5])).normalize();
    [[0, 0.6, PE.rose], [0.6, 0.92, PE.flush, 0.08], [0.92, 1.3, PE.mid, 0.17], [1.3, Math.PI, PE.skin, 0.26]].forEach(([a0, a1, col, lift]) => g.add(new THREE.Mesh(peachBand(R, a0, a1, bd, o), clay(col, { smooth: true, lift }))));
    const topY = R * (o.sy ?? 0.95) + R * (o.tip ?? 0.12);
    if (o.stem !== false) {
      const st = M(new THREE.CylinderGeometry(R * 0.06, R * 0.08, R * 0.28, 6), clay(PE.stem), 0, topY - R * 0.02, 0); st.rotation.z = -0.25; g.add(st);
    }
    const ry = o.leafRy ?? 0, lw = R * 0.26, ll = R * 0.78;
    leaf(g, lw, ll, R * 0.04, topY - R * 0.02, 0, o.leafA ?? 0.35, ry, PE.leaf);
    leaf(g, lw * 0.85, ll * 0.85, R * 0.02, topY - R * 0.02, 0, o.leafB ?? 1.05, ry + (o.leafRy2 ?? 0.6), PE.leafD);
    const faces = o.face === 'both' ? [1, -1] : [1];
    faces.forEach(s => { const f = new THREE.Group(); f.position.y = -R * (o.faceY ?? 0.16); g.add(f); face(f, R * 0.72, s * R * (o.sz ?? 1) * 0.97, s); });
    return g;
  }
  return { sph, leaf, peach };
}

export function peachThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = peachKit(THREE, K, X);
  const motif = (p, r, x, y, z) => T.peach(p, r * 1.1, x, y, z, { leafA: 0.3, leafB: 1.0 });
  const H = (g, l, r = 0.03) => X.handle(g, { wood: PE.skin, grip: PE.rose, knob: PE.rose, bands: [[PE.leaf, 0.62]] }, l, r);
  const canHandle = (g, col, x = -0.17) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const spout = (g, col, x = 0.17) => { const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(col), x, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); };
  return { peach: {
    axe(g) {
      const top = H(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(PE.rose), 0, cy, 0));
      T.peach(g, 0.115, 0.125, cy - 0.02, 0, { sz: 0.46, blushDir: [0.55, 0.85, 0], face: 'both', faceY: 0.18, leafA: 0.25, leafB: 1.0, leafRy2: 0 });
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = H(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(PE.rose)));
      pickArms(hd, [clay(PE.mid), clay(PE.rose)], clay(PE.skin));
      motif(hd, 0.05, 0, 0.085, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      T.sph(g, 0.11, PE.mid, 0, 0.09, 0, [1, 1.05, 1], true, 14);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(PE.rose), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 5, 12), clay(PE.skin), 0, 0.2, 0).rotateX(Math.PI / 2));
      motif(g, 0.065, 0, 0.09, 0.075);
      g.scale.setScalar(1.25);
    },
    water(g) {
      T.peach(g, 0.14, 0, 0.15, 0, { stem: false, leafA: 0.3, leafB: 0.9, leafRy: -0.6, leafRy2: -0.9 });
      g.add(M(new THREE.CylinderGeometry(0.03, 0.036, 0.03, 8), clay(PE.stem), 0, 0.31, 0));
      spout(g, PE.rose);
      canHandle(g, PE.rose);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = H(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(PE.mid), clay(PE.mid), clay(PE.rose)], clay(PE.skin), 1.2);
      motif(bl, 0.04, tip.x, tip.y + 0.01, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(PE.rose), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = H(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(PE.rose), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(PE.mid, { smooth: true }), 0, by, 0));
      motif(g, 0.06, 0, by + 0.12, 0.03);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = H(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12), clay(PE.rose, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => motif(g, 0.058, sx * 0.1, y, 0));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(PE.rose, { smooth: true }), 0, -0.1, 0)), rear: clay(PE.rose), line: 0xe8dcd0, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(PE.skin), 0, L / 2, 0));
        [0.25, 0.45, 0.65, 0.85].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(PE.rose), 0, L * f, 0)));
      } }, b => T.peach(b, 0.064, 0, -0.05, 0, { leafA: 0.3, leafB: 1.0 }));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(PE.skin), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(PE.rose, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(PE.mid), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(PE.skin, 0.5), 0, 0.75, 0));
      motif(g, 0.05, 0, 0.62, 0.17);
      g.scale.setScalar(1.25);
    },
  } };
}

export const PEACH_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.02 } });

export function peachUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M, V } = K, T = peachKit(THREE, K, X);
  const rim = (c, col, r) => c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, r, 6, 40), clay(col), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
  return {
    outer: k => clay(k % 2 ? PE.mid : PE.rose, { smooth: true }), inner: () => clay(PE.skin, { side: THREE.BackSide }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(PE.skin), 0, L / 2, 0));
      jHook(clay(PE.rose), 0.07);
    },
    deco(h, k) {
      if (k % 2) return;
      const { p, n } = X.goreSurf(def.R * 1.004, 0.6, 0), g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g);
      T.leaf(g, 0.05, 0.16, -0.08, 0, 0.01, 0, 0, PE.leaf);
    },
    finial(c) { rim(c, PE.skin, 0.04); T.peach(c, 0.18, 0, 0.13, 0, { leafA: 0.3, leafB: 1.0 }); },
  };
}
