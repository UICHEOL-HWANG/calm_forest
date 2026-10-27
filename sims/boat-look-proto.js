export function install(G, THREE, B) {
  const scene = G.scene, rg = G.$w?.riverGroup || G.riverGroup;
  const clay = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const WOOD = clay(0xd9a066), WOOD_D = clay(0xa9743f), TEAL = clay(0x3fb3c2), STONE = clay(0x9fb0b8, { flatShading: true });
  const SHEET = new THREE.MeshStandardMaterial({ color: 0xc8f0fb, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const FOAM = clay(0xffffff, { roughness: 0.6 });
  const HUMP = new THREE.MeshStandardMaterial({ color: 0x8fd6ee, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.93 });
  const W = 16;

  function foamRow(n, z, y, spread, seed = 1) {
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), FOAM, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const base = [];
    for (let i = 0; i < n; i++) {
      const r = (Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
      const k = 0.6 + Math.abs(r) * 0.7;
      const p = new THREE.Vector3(-W / 2 + (i + 0.5) * (W / n) + r * 0.3, y, z + r * spread);
      const s = new THREE.Vector3(k * 1.25, k * 0.45, k);
      m.compose(p, q, s); im.setMatrixAt(i, m);
      base.push({ p, s, ph: i * 1.7 });
    }
    im.userData.base = base;
    return im;
  }
  function sheet(top, bottom, len) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      pts.push(new THREE.Vector3(0, bottom + (top - bottom) * Math.cos(u * Math.PI / 2), -len * Math.sin(u * Math.PI / 2)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const pos = [], idx = [], seg = 24;
    for (let i = 0; i <= seg; i++) {
      const c = curve.getPoint(i / seg);
      pos.push(-W / 2, c.y, c.z, W / 2, c.y, c.z);
      if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return new THREE.Mesh(geo, SHEET);
  }
  function rocks(g, xs) {
    for (const [x, sc] of xs) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), STONE);
      r.position.set(x, 0.3, 0.2); r.scale.set(sc, sc * 0.75, sc); r.rotation.set(0.3, x, 0.2); r.castShadow = true; g.add(r);
    }
  }

  function fallsA() {
    const g = new THREE.Group();
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(W, 0.32, 0.9), STONE);
    ledge.position.set(0, 0.2, 0.45); g.add(ledge);
    g.add(sheet(0.36, 0.06, 1.8));
    g.add(foamRow(16, -2.0, 0.12, 0.5, 1));
    g.add(foamRow(10, 0.95, 0.38, 0.1, 7));
    rocks(g, [[-7.4, 1.5], [-6.3, 0.9], [6.6, 1.3], [7.6, 1.0]]);
    return g;
  }
  function fallsB() {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(W, 0.42, 0.34), WOOD_D);
    wall.position.set(0, 0.24, 0.2); g.add(wall);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(W, 0.08, 0.46), WOOD);
    cap.position.set(0, 0.48, 0.2); g.add(cap);
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), WOOD, 9);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 9; i++) { m.makeTranslation(-W / 2 + 0.2 + i * ((W - 0.4) / 8), 0.32, 0.42); posts.setMatrixAt(i, m); }
    g.add(posts);
    g.add(sheet(0.5, 0.06, 1.6));
    g.add(foamRow(16, -1.8, 0.12, 0.5, 3));
    for (const x of [-7.6, 7.6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), WOOD_D);
      pole.position.set(x, 1.4, 0.6); g.add(pole);
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 3), clay(0xe0603f));
      flag.rotation.z = Math.sign(x) * Math.PI / 2; flag.position.set(x - Math.sign(x) * 0.45, 2.3, 0.6); g.add(flag);
    }
    return g;
  }
  function fallsC() {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(1, 1, W, 24, 1, true, -Math.PI / 2, Math.PI);
    geo.rotateZ(Math.PI / 2);
    const hump = new THREE.Mesh(geo, HUMP);
    hump.scale.set(1, 0.42, 1.2); hump.position.set(0, 0.08, 0); g.add(hump);
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, W, 10), FOAM);
    crest.rotation.z = Math.PI / 2; crest.position.set(0, 0.5, 0); g.add(crest);
    g.add(foamRow(14, 1.3, 0.12, 0.25, 5));
    g.add(foamRow(16, -1.4, 0.12, 0.35, 9));
    const pts = [], n = 11;
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new THREE.Vector3(-7.6 + 15.2 * u, 3.9 - Math.sin(u * Math.PI) * 0.7, 0)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.025, 4), WOOD_D));
    const cols = [0xf2c14e, 0xe0603f, 0x3fb3c2, 0xffffff];
    for (let i = 1; i < n; i++) {
      const u = i / n;
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), clay(cols[i % 4]));
      f.rotation.x = Math.PI; f.position.set(-7.6 + 15.2 * u, 3.9 - Math.sin(u * Math.PI) * 0.7 - 0.28, 0); g.add(f);
    }
    for (const x of [-7.6, 7.6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 6), WOOD_D);
      pole.position.set(x, 2, 0); g.add(pole);
    }
    return g;
  }

  const BUILD = { A: fallsA, B: fallsB, C: fallsC };
  let fallsGroups = [];
  function setFalls(k) {
    for (const g of fallsGroups) rg.remove(g);
    fallsGroups = [];
    for (const f of rg.userData.falls) f.visible = !k && B.state.course === 'rapid';
    if (!k) return;
    for (const band of rg.userData.falls) {
      const g = BUILD[k](); g.position.set(0, 0, band.position.z); rg.add(g); fallsGroups.push(g);
    }
  }

  function oarMesh(len, blades) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 8), WOOD);
    shaft.rotation.x = Math.PI / 2; shaft.position.z = len / 2; g.add(shaft);
    for (const at of blades) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.62), TEAL);
      b.position.z = at; g.add(b);
    }
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }
  function wheelRig() {
    const g = new THREE.Group();
    const wheels = [];
    for (const sd of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sd * 0.95, 0.42, 0.15);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12), clay(0xb2453e)); hub.rotation.z = Math.PI / 2; w.add(hub);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 20), WOOD); rim.rotation.y = Math.PI / 2; w.add(rim);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.36), TEAL);
        b.position.set(0, Math.sin(a) * 0.4, Math.cos(a) * 0.4); b.rotation.x = -a; w.add(b);
      }
      g.add(w); wheels.push(w);
    }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 8), WOOD_D); axle.rotation.z = Math.PI / 2; axle.position.set(0, 0.42, 0.15); g.add(axle);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), clay(0x8a5c36)); g.add(bar);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), clay(0xf2c14e)); g.add(knob);
    g.userData = { wheels, bar, knob };
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }
  function bladeGeo(shape, depth = 0.035) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 14 });
    g.translate(0, 0, -depth / 2); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 2);
    return g;
  }
  const leafShape = (w, L) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w * 1.1, L * 0.25, w * 0.9, L * 0.8, 0, L); s.bezierCurveTo(-w * 0.9, L * 0.8, -w * 1.1, L * 0.25, 0, 0); return s; };
  const dropShape = (w, L) => { const s = new THREE.Shape(); s.moveTo(-0.05, 0); s.lineTo(0.05, 0); s.bezierCurveTo(w * 0.5, L * 0.15, w, L * 0.45, w, L * 0.7); s.absarc(0, L * 0.7, w, 0, Math.PI, false); s.bezierCurveTo(-w, L * 0.45, -w * 0.5, L * 0.15, -0.05, 0); return s; };
  const petalShape = (w, L) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w * 0.9, L * 0.1, w * 1.05, L * 0.7, w * 0.55, L * 0.95); s.quadraticCurveTo(w * 0.25, L * 1.05, 0, L * 0.86); s.quadraticCurveTo(-w * 0.25, L * 1.05, -w * 0.55, L * 0.95); s.bezierCurveTo(-w * 1.05, L * 0.7, -w * 0.9, L * 0.1, 0, 0); return s; };
  function band(g, z, r, mat, h = 0.06) { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat); b.rotation.x = Math.PI / 2; b.position.z = z; g.add(b); return b; }
  function blades(g, len, geo, mat, extra) {
    for (const end of [0, 1]) {
      const m = new THREE.Mesh(geo, mat);
      if (end) m.position.z = len - 0.5; else { m.position.z = 0.5; m.scale.z = -1; }
      g.add(m);
      if (extra) extra(g, end ? len - 0.5 : 0.5, end ? 1 : -1);
    }
  }
  function paddle(style) {
    const len = 3.0, g = new THREE.Group();
    if (style === 1) {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len - 0.9, 10), clay(0xc98f5a)); sh.rotation.x = Math.PI / 2; sh.position.z = len / 2; g.add(sh);
      const leaf = clay(0x6cc56a, { roughness: 0.6 }), vein = clay(0xbfe9a8);
      blades(g, len, bladeGeo(leafShape(0.22, 0.85)), leaf, (g, z, d) => {
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.7), vein); v.position.z = z + d * 0.38; g.add(v);
        const tie = clay(0xf2c14e); band(g, z, 0.06, tie, 0.08);
      });
      for (const z of [1.2, 1.8]) band(g, z, 0.055, clay(0xffffff), 0.16);
    } else if (style === 2) {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, len - 0.9, 10), clay(0xf3e6cc)); sh.rotation.x = Math.PI / 2; sh.position.z = len / 2; g.add(sh);
      const teal = clay(0x3fb3c2, { roughness: 0.45 }), cream = clay(0xfff4dc, { roughness: 0.45 }), gold = clay(0xe2b04a, { roughness: 0.35, metalness: 0.3 });
      blades(g, len, bladeGeo(dropShape(0.2, 0.8)), teal, (g, z, d) => {
        const tip = new THREE.Mesh(bladeGeo(dropShape(0.12, 0.42), 0.05), cream); tip.position.z = z + d * 0.36; tip.scale.z = d; g.add(tip);
        band(g, z, 0.06, gold, 0.07);
      });
      for (const z of [1.15, 1.85]) band(g, z, 0.058, clay(0xb2453e), 0.28);
    } else {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len - 0.9, 10), clay(0xffffff)); sh.rotation.x = Math.PI / 2; sh.position.z = len / 2; g.add(sh);
      const coral = clay(0xf48a7a, { roughness: 0.5 }), white = clay(0xffffff);
      blades(g, len, bladeGeo(petalShape(0.22, 0.82)), coral, (g, z, d) => {
        for (const k of [0.25, 0.5]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32 - k * 0.2, 0.05), white); st.position.z = z + d * k; g.add(st); }
        band(g, z, 0.06, clay(0x8fd6ee), 0.08);
      });
      for (let i = 0; i < 6; i++) band(g, 1.15 + i * 0.14, 0.05, clay(i % 2 ? 0x8fd6ee : 0xf48a7a), 0.12);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), clay(0xf2c14e, { emissive: 0xf2c14e, emissiveIntensity: 0.3 }));
      star.position.set(0, -0.2, len / 2); g.add(star);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 4), clay(0x8a5c36)); str.position.set(0, -0.1, len / 2); g.add(str);
    }
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }
  const rig = {
    A: [oarMesh(2.5, [2.2]), oarMesh(2.5, [2.2])],
    B: [oarMesh(3.0, [0.3, 2.7])],
    B1: [paddle(1)], B2: [paddle(2)], B3: [paddle(3)],
    C: [wheelRig()],
  };
  for (const k in rig) for (const m of rig[k]) { m.visible = false; scene.add(m); }

  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), dir = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  const place = (m, from, d, back = 0) => {
    m.position.copy(from).addScaledVector(d, -back);
    m.quaternion.setFromUnitVectors(Z, d);
    m.updateMatrixWorld(true);
  };
  const P = { A: { x: -0.95, ax: 0.45, z: 0.35 }, B: { x: -1.05, ax: 0.5, z: 0.25, tw: 0.28 }, C: { rx: -0.25, lx: -2.7, ax: 0.5, bz: 0.55, tz: 0.35 } };
  let row = null, fall = null, sideC = 1, hold = null, pstyle = 0, camOff = null;

  function poseRow() {
    const arms = G.playerArms, anchor = G.playerAnchor, grp = B.state.group;
    if (!arms || !grp) return;
    const on = !!row && B.state.active && anchor.visible;
    grp.userData.oars.forEach(o => { o.visible = !row; });
    for (const k in rig) rig[k].forEach(m => { m.visible = on && (row === k || (row === 'B' && k === 'B' + pstyle) || (row === 'B' && !pstyle && k === 'B')); });
    if (row === 'B' && pstyle) rig.B[0].visible = false;
    if (!on) return;
    const fast = B.state.t < B.state.boostUntil;
    const w = fast ? 11 : 5.5, s = Math.sin(B.state.t * w), c = Math.cos(B.state.t * w);
    const R = arms.R.pivot, L = arms.L.pivot;
    if (row === 'A') {
      const p = P.A;
      R.rotation.set(p.x - p.ax * s, 0, p.z + 0.1 * c);
      L.rotation.set(p.x - p.ax * s, 0, -p.z - 0.1 * c);
      anchor.rotation.x = 0.1 + 0.16 * s;
    } else if (row === 'B') {
      const p = P.B;
      R.rotation.set(p.x + p.ax * s, 0, p.z);
      L.rotation.set(p.x - p.ax * s, 0, -p.z);
      anchor.rotation.x = 0.12;
      anchor.rotation.y = p.tw * s;
    } else {
      R.rotation.set(-1.25 - 0.35 * s, 0, 0.18 + 0.12 * c);
      L.rotation.set(-1.25 - 0.35 * s, 0, -0.18 - 0.12 * c);
      anchor.rotation.x = 0.14 + 0.1 * s;
      anchor.rotation.y = 0;
    }
    anchor.updateMatrixWorld(true);
    arms.R.hand.getWorldPosition(v1); arms.L.hand.getWorldPosition(v2);
    if (row === 'A') {
      grp.updateMatrixWorld(true);
      [[v1, 1], [v2, -1]].forEach(([h, sd], i) => {
        v3.set(sd * -0.78, 0.52, 0.1).applyMatrix4(grp.matrixWorld);
        dir.copy(v3).sub(h).normalize();
        place(rig.A[i], h, dir, 0.15);
      });
    } else if (row === 'B') {
      dir.copy(v2).sub(v1).normalize();
      v3.copy(v1).add(v2).multiplyScalar(0.5);
      place(rig[pstyle ? 'B' + pstyle : 'B'][0], v3, dir, 1.5);
    } else {
      const wr = rig.C[0], u = wr.userData;
      wr.position.copy(grp.position); wr.quaternion.copy(grp.quaternion);
      const ph = B.state.t * w;
      u.wheels.forEach(x => { x.rotation.x = -ph; });
      wr.updateMatrixWorld(true);
      v3.copy(v1).add(v2).multiplyScalar(0.5);
      dir.copy(v2).sub(v1); const len = dir.length(); dir.normalize();
      u.bar.position.copy(wr.worldToLocal(v3.clone())); u.bar.scale.y = len + 0.3;
      u.bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().transformDirection(wr.matrixWorld.clone().invert()));
      u.knob.position.copy(u.bar.position);
      wr.updateMatrixWorld(true);
    }
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function foamTick(t) {
    for (const g of fallsGroups) g.traverse(o => {
      if (!o.isInstancedMesh || !o.userData.base) return;
      o.userData.base.forEach((b, i) => {
        const k = 1 + Math.sin(t * 4 + b.ph) * 0.12;
        _p.copy(b.p); _p.y += Math.sin(t * 3 + b.ph) * 0.04; _s.copy(b.s).multiplyScalar(k);
        _m.compose(_p, _q, _s); o.setMatrixAt(i, _m);
      });
      o.instanceMatrix.needsUpdate = true;
    });
  }

  const prev = scene.onBeforeRender;
  scene.onBeforeRender = (r, sc, cam) => {
    if (camOff && B.state.active) { const pp = G.player.position; cam.position.set(pp.x + camOff[0], camOff[1], pp.z + camOff[2]); cam.lookAt(pp.x, 0.9, pp.z); cam.updateMatrixWorld(true); } if (hold != null && B.state.active) B.state.dist = hold; foamTick(performance.now() / 1000); poseRow(); };
  return {
    P,
    set({ row: r, falls: f, hold: h } = {}) {
      if (h !== undefined) hold = h;
      if (arguments[0]?.cam !== undefined) camOff = arguments[0].cam;
      if (arguments[0]?.paddle !== undefined) pstyle = arguments[0].paddle;
      if (r !== undefined) row = r;
      if (f !== undefined) { fall = f; setFalls(f); }
      return { row, fall };
    },
    uninstall() { scene.onBeforeRender = prev; setFalls(null); for (const k in rig) rig[k].forEach(m => scene.remove(m)); row = null; },
  };
}
