export const KT = Object.freeze({ cream: 0xf5e4cf, ginger: 0xe8964e, gingerD: 0xc8733a, pink: 0xf2a3b4, brown: 0x5e4334, bell: 0xf2c94c, fish: 0x8fb8d8, fishD: 0x5f8db5 });

export function kittyKit(THREE, K, X) {
  const { clay, M } = K, { small } = X;
  const bellMat = () => clay(KT.bell, { glow: KT.bell, k: 0.6 });
  function catHead(p, r, x, y, z, body = KT.ginger) {
    p.add(M(new THREE.SphereGeometry(r, 12, 9), clay(body, { smooth: true }), x, y, z));
    [-1, 1].forEach(s => {
      const e = M(new THREE.ConeGeometry(r * 0.42, r * 0.6, 4), clay(body), x + s * r * 0.55, y + r * 0.8, z); e.rotation.z = -s * 0.35; p.add(e);
      const ei = M(new THREE.ConeGeometry(r * 0.24, r * 0.36, 4), clay(KT.pink), x + s * r * 0.53, y + r * 0.78, z + r * 0.14); ei.rotation.z = -s * 0.35; p.add(ei);
      p.add(small(M(new THREE.SphereGeometry(r * 0.1, 6, 5), clay(KT.brown), x + s * r * 0.36, y + r * 0.12, z + r * 0.9)));
    });
    const mz = M(new THREE.SphereGeometry(r * 0.38, 8, 6), clay(KT.cream), x, y - r * 0.25, z + r * 0.72); mz.scale.set(1.25, 0.8, 0.6); p.add(mz);
    p.add(small(M(new THREE.SphereGeometry(r * 0.09, 6, 5), clay(KT.pink), x, y - r * 0.12, z + r * 0.97)));
  }
  function pawFace(p, r, x, y, z, dir) {
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = dir * Math.PI / 2; p.add(grp);
    grp.add(M(new THREE.CylinderGeometry(r, r, 0.014, 12), clay(KT.cream), 0, 0, 0).rotateX(Math.PI / 2));
    const pad = M(new THREE.SphereGeometry(r * 0.42, 10, 7), clay(KT.pink, { smooth: true }), 0, -r * 0.2, 0.01); pad.scale.set(1.15, 0.9, 0.4); grp.add(pad);
    [-0.55, -0.2, 0.2, 0.55].forEach(t => { const b = M(new THREE.SphereGeometry(r * 0.17, 8, 6), clay(KT.pink, { smooth: true }), Math.sin(t) * r * 0.62, Math.cos(t) * r * 0.5 + r * 0.05, 0.01); b.scale.z = 0.5; grp.add(b); });
  }
  return { bellMat, catHead, pawFace };
}

function earBlade(X) {
  return X.polyShape([[0, -0.07], [0.06, -0.1], [0.085, -0.175], [0.135, -0.11], [0.17, -0.07], [0.19, 0], [0.17, 0.07], [0.135, 0.11], [0.085, 0.175], [0.06, 0.1], [0, 0.07]]);
}
function catRingShape(THREE, X, r0, r1) {
  const s = new THREE.Shape(), N = 72, bump = a => { let b = 0; [Math.PI * 0.3, Math.PI * 0.7].forEach(c => { b = Math.max(b, Math.max(0, 1 - Math.abs(a - c) / 0.32)); }); return b; };
  for (let i = 0; i <= N; i++) { const a = i / N * X.TAU, rr = r1 * (1 + 0.42 * bump(a)); i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  s.holes.push(X.circlePath(r0, 0, 0)); return s;
}

export function kittyThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { small, polyShape, circlePath, roundBlade, pickArms, sickleBlade, rodFrame, netBag } = X;
  const { bellMat, catHead, pawFace } = kittyKit(THREE, K, X);
  const ktHandle = (g, l, r = 0.031) => X.handle(g, { wood: KT.cream, grip: KT.pink, knob: KT.pink, bands: [[KT.ginger, 0.5], [KT.ginger, 0.66], [KT.ginger, 0.82]] }, l, r);
  const pawHoles = (sh, cx, cy, s) => {
    sh.holes.push(circlePath(0.03 * s, cx, cy - 0.01 * s));
    [-0.55, -0.2, 0.2, 0.55].forEach(t => sh.holes.push(circlePath(0.012 * s, cx + Math.sin(t) * 0.05 * s, cy + Math.cos(t) * 0.042 * s + 0.004 * s)));
  };
  return { kitty: {
    axe(g) {
      const top = ktHandle(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(KT.gingerD), 0, cy, 0));
      g.add(M(ext(earBlade(X), 0.042, 0.009, 2), clay(KT.ginger), 0.02, cy, 0));
      [-1, 1].forEach(sz => {
        [-1, 1].forEach(sy => g.add(M(ext(polyShape([[0.075, sy * 0.105], [0.09, sy * 0.155], [0.12, sy * 0.105]]), 0.004, 0), clay(KT.pink), 0.02, cy, sz * 0.027)));
        const pad = M(new THREE.SphereGeometry(0.022, 8, 6), clay(KT.cream), 0.14, cy - 0.006, sz * 0.026); pad.scale.set(1.2, 1, 0.3); g.add(pad);
        [-0.6, 0, 0.6].forEach(t => { const b = M(new THREE.SphereGeometry(0.009, 6, 5), clay(KT.cream), 0.14 + Math.sin(t) * 0.025, cy + 0.024 + Math.cos(t) * 0.006, sz * 0.026); b.scale.z = 0.4; g.add(b); });
      });
      g.add(M(new THREE.BoxGeometry(0.05, 0.09, 0.075), clay(KT.gingerD), -0.035, cy, 0));
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = ktHandle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      pickArms(hd, [clay(KT.ginger), clay(KT.gingerD)], clay(KT.pink));
      catHead(hd, 0.05, 0, 0.015, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      const grp = new THREE.Group(); grp.scale.set(1.05, 0.95, 0.9); g.add(grp);
      catHead(grp, 0.11, 0, 0.1, 0);
      [-1, 1].forEach(s => [0, 1].forEach(k => { const w = M(new THREE.BoxGeometry(0.06, 0.004, 0.004), clay(KT.brown), s * 0.085, 0.07 + k * 0.014, 0.085); w.rotation.z = s * (k ? -0.15 : 0.12); grp.add(w); }));
      g.scale.setScalar(1.25);
    },
    water(g) {
      const body = M(new THREE.SphereGeometry(0.12, 12, 10), clay(KT.ginger, { smooth: true }), 0, 0.14, 0); body.scale.set(1, 1.1, 0.95); g.add(body);
      const bel = M(new THREE.SphereGeometry(0.075, 10, 8), clay(KT.cream), 0, 0.12, 0.07); bel.scale.set(1, 1.2, 0.6); g.add(bel);
      catHead(g, 0.085, 0, 0.3, 0.01);
      const tail = new THREE.CatmullRomCurve3([V(-0.09, 0.1, -0.05), V(-0.19, 0.16, -0.03), V(-0.2, 0.28, 0), V(-0.1, 0.34, 0)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 20, 0.02, 6), clay(KT.gingerD)));
      const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.2, 7), clay(KT.ginger), 0.15, 0.2, 0); sp.rotation.z = -0.9; g.add(sp);
      pawFace(g, 0.035, 0.235, 0.265, 0, 1);
      const col = M(new THREE.TorusGeometry(0.06, 0.012, 5, 14), clay(KT.pink), 0, 0.235, 0.01); col.rotation.x = Math.PI / 2; g.add(col);
      g.add(small(M(new THREE.SphereGeometry(0.016, 8, 6), bellMat(), 0, 0.22, 0.075)));
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = ktHandle(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(KT.ginger), clay(KT.gingerD), clay(KT.ginger)], clay(KT.cream), 1.3);
      bl.add(M(new THREE.SphereGeometry(0.03, 8, 6), clay(KT.cream, { smooth: true }), tip.x, tip.y, 0));
      const col = M(new THREE.TorusGeometry(0.036, 0.01, 5, 12), clay(KT.pink), 0, top - 0.01, 0); col.rotation.x = Math.PI / 2; g.add(col);
      g.add(small(M(new THREE.SphereGeometry(0.014, 8, 6), bellMat(), 0, top - 0.03, 0.04)));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = ktHandle(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 8), clay(KT.gingerD), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.1, 0.125), 0.016, 0, 14), clay(KT.pink), 0, by, 0));
      const sh = roundBlade(0.105, 0.13); pawHoles(sh, 0, 0.12, 1.25);
      g.add(M(ext(sh, 0.036, 0.012, 14), clay(KT.ginger, { smooth: true }), 0, by, 0));
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = ktHandle(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.06, 0.06, 0.17, 12), clay(KT.ginger, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => pawFace(g, 0.062, sx * 0.09, y, 0, sx));
      const col = M(new THREE.CylinderGeometry(0.064, 0.064, 0.02, 12), clay(KT.pink), 0, y, 0); col.rotation.z = Math.PI / 2; g.add(col);
      g.add(small(M(new THREE.SphereGeometry(0.016, 8, 6), bellMat(), 0, y - 0.07, 0.02)));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(KT.pink), 0, -0.095, 0)), rear: clay(KT.gingerD), line: 0xf6eee6, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.014, 0.027, L, 7), clay(KT.cream), 0, L / 2, 0));
        [0.2, 0.4, 0.6, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.025 - f * 0.011, 0.025 - f * 0.011, 0.02, 7), clay(KT.ginger), 0, L * f, 0)));
      } }, b => {
        const fish = new THREE.Shape(); fish.moveTo(-0.06, 0); fish.quadraticCurveTo(-0.01, 0.04, 0.04, 0.0); fish.lineTo(0.07, 0.03); fish.lineTo(0.07, -0.03); fish.lineTo(0.04, 0); fish.quadraticCurveTo(-0.01, -0.04, -0.06, 0);
        const f = M(ext(fish, 0.022, 0.008, 6), clay(KT.fish, { smooth: true })); f.rotation.z = Math.PI / 2; b.add(f);
        [-1, 1].forEach(s => b.add(small(M(new THREE.SphereGeometry(0.006, 5, 4), clay(KT.brown), 0.008, -0.04, s * 0.018))));
        b.add(M(new THREE.BoxGeometry(0.03, 0.006, 0.026), clay(KT.fishD), 0, 0.0, 0));
      });
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(KT.cream), 0, 0.25, 0));
      g.add(M(new THREE.SphereGeometry(0.045, 8, 6), clay(KT.pink), 0, -0.1, 0));
      const ring = M(ext(catRingShape(THREE, X, 0.175, 0.2), 0.03, 0.006, 2), clay(KT.ginger), 0, 0.6, 0); ring.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); g.add(ring);
      g.add(M(new THREE.ConeGeometry(0.17, 0.3, 12, 1, true), netBag(KT.cream, 0.55), 0, 0.75, 0));
      g.add(small(M(new THREE.SphereGeometry(0.016, 8, 6), bellMat(), 0.2, 0.58, 0)));
      g.scale.setScalar(1.25);
    },
  } };
}

export const KITTY_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 0.98, overlap: 1, shape: { w: () => 1, tip: 0.04 } });

export function kittyUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K, { bellMat } = kittyKit(THREE, K, X), up = new THREE.Vector3(0, 1, 0);
  return {
    outer: k => clay(k % 2 ? KT.cream : KT.ginger), inner: () => clay(KT.cream, { side: THREE.BackSide, lift: 0.35 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.0216, 0.0264, L, 7), clay(KT.cream), 0, L / 2, 0));
      [0, 0.05, 0.1].forEach(d => root.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 7), clay(KT.ginger), 0, L - 0.6 + d, 0)));
      jHook(clay(KT.pink), 0.07);
    },
    deco(h, k) {
      if (k !== 1 && k !== 3) return;
      const { p, n } = X.goreSurf(def.R, def.th * 0.32, 0);
      const e = M(new THREE.ConeGeometry(0.13, 0.22, 4), clay(KT.ginger), p.x, p.y + 0.08, p.z); e.quaternion.setFromUnitVectors(up, n); h.add(e);
      const ei = M(new THREE.ConeGeometry(0.075, 0.14, 4), clay(KT.pink), p.x + n.x * 0.03, p.y + 0.07, p.z + n.z * 0.03); ei.quaternion.setFromUnitVectors(up, n); h.add(ei);
    },
    finial(c) { c.add(X.small(M(new THREE.SphereGeometry(0.045, 10, 8), bellMat(), 0, 0.04, 0))); },
  };
}
