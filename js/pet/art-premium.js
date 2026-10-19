const TAU = Math.PI * 2;
const STAGE_SCALE = [0.82, 0.92, 1];
const FX = Object.freeze({
  cloud_dragon: { kind: 'rain', cols: [0x9fd4f0, 0xb8e2f6] },
  hedgehog: { kind: 'petals', cols: [0xf5a3bf, 0xffd27a, 0xc8b6f2] },
  axolotl: { kind: 'bubbles', cols: [0xbfe8ff, 0xf6c8ea] },
  unicorn: { kind: 'sparkle', cols: [0xf6a6c6, 0xffe48a, 0xa4e3c4, 0x9ecbf3, 0xc4acf0] },
});

function kit(THREE) {
  const clay = (color, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: !o.smooth });
    if (o.glow) { m.emissive = new THREE.Color(o.glow); m.emissiveIntensity = 0.45; }
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
    return m;
  };
  const M = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const S = (r, ws = 14, hs = 10) => new THREE.SphereGeometry(r, ws, hs);
  const soft = c => clay(c, { smooth: true });
  const eyes = (g, r, x, y, z) => [-1, 1].forEach(s => { g.add(M(S(r, 8, 6), soft(0x2e241c), s * x, y, z)); g.add(M(S(r * 0.35, 6, 4), soft(0xffffff), s * x + r * 0.3, y + r * 0.35, z + r * 0.7)); });
  const cheeks = (g, r, x, y, z, c = 0xf4a3b4) => [-1, 1].forEach(s => { const m = M(S(r, 8, 6), soft(c), s * x, y, z); m.scale.z = 0.3; g.add(m); });
  function petalGeo(w, h, d = 0.012) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w * 1.1, h * 0.22, w * 0.95, h * 0.8, 0, h); s.bezierCurveTo(-w * 0.95, h * 0.8, -w * 1.1, h * 0.22, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.4, bevelSize: d * 0.4, bevelSegments: 1, curveSegments: 8 }); g.translate(0, 0, -d / 2); return g;
  }
  function star(r, k = 0.5) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * k : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: r * 0.3, bevelEnabled: true, bevelThickness: r * 0.15, bevelSize: r * 0.08, bevelSegments: 2 }); g.translate(0, 0, -r * 0.15); return g;
  }
  const anim = (obj, a) => { obj.userData.anim = a; return obj; };
  return { clay, soft, M, S, eyes, cheeks, petalGeo, star, anim };
}

function cloudDragon(THREE, K, stage) {
  const { clay, soft, M, S, eyes, cheeks, petalGeo, star, anim } = K;
  const C = { body: 0xb9c4f2, belly: 0xf3f2fb, horn: 0xf6dfa4, wing: 0xd7c6f4, cloud: 0xf4f6fb, tip: 0xfff1b0 };
  const g = new THREE.Group(), body = anim(new THREE.Group(), { kind: 'bob', base: 0.32, amp: 0.03 }); body.position.y = 0.32; g.add(body);
  const b = M(S(0.16), soft(C.body)); b.scale.set(1, 0.95, 1.05); body.add(b);
  const head = new THREE.Group(); head.position.set(0, 0.16, 0.06); body.add(head);
  head.add(M(S(0.13), soft(C.body)));
  const sn = M(S(0.075), soft(C.belly), 0, -0.03, 0.1); sn.scale.set(1.2, 0.8, 0.7); head.add(sn);
  eyes(head, 0.02, 0.055, 0.02, 0.115); cheeks(head, 0.022, 0.09, -0.02, 0.1);
  [-1, 1].forEach(s => { const h = M(new THREE.ConeGeometry(0.025, 0.08, 6), soft(C.horn), s * 0.06, 0.12, -0.01); h.rotation.z = -s * 0.3; head.add(h); });
  [[0, -0.12, 0, 0.1], [0.09, -0.11, 0.04, 0.07], [-0.09, -0.11, 0.04, 0.07], [0, -0.1, 0.1, 0.07], [0.05, -0.1, -0.08, 0.06], [-0.05, -0.1, -0.08, 0.06]].forEach(([x, y, z, r]) => body.add(M(new THREE.IcosahedronGeometry(r, 1), soft(C.cloud), x, y, z)));
  [-1, 1].forEach(s => { const w = anim(M(petalGeo(0.05, 0.14), soft(C.wing), s * 0.12, 0.06, -0.06), { kind: 'flap', base: -s * 1.1, s }); w.rotation.set(0.3, s * 0.6, -s * 1.1); body.add(w); });
  const tail = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.02, -0.14), new THREE.Vector3(0, 0.02, -0.26), new THREE.Vector3(0.06, 0.1, -0.3), new THREE.Vector3(0.02, 0.14, -0.24)]);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 20, 0.025, 6), soft(C.body)));
  body.add(M(star(0.03), clay(C.tip, { glow: C.tip }), 0.02, 0.15, -0.24));
  if (stage >= 1) { const cl = anim(new THREE.Group(), { kind: 'bob', base: 0.42, amp: 0.02 }); cl.position.y = 0.42; body.add(cl); [[0, 0, 0, 0.05], [0.05, -0.01, 0, 0.04], [-0.05, -0.01, 0, 0.04]].forEach(([x, y, z, r]) => cl.add(M(new THREE.IcosahedronGeometry(r, 1), soft(0xe4e8f6), x, y, z))); }
  if (stage >= 2) [0xf6a6c6, 0xffe48a, 0xa4e3c4, 0x9ecbf3, 0xc4acf0].forEach((c, i) => body.add(M(new THREE.TorusGeometry(0.2 - i * 0.012, 0.007, 4, 24, Math.PI), soft(c), 0, 0.3, -0.2)));
  return g;
}

function hedgehog(THREE, K, stage) {
  const { clay, soft, M, S, eyes, cheeks, petalGeo } = K;
  const C = { body: 0xf3cfa6, face: 0xfbeedd, nose: 0x3a2a24, p: [0xf5a3bf, 0xffd27a, 0xc8b6f2], leaf: 0x86c06a };
  const g = new THREE.Group(); g.userData.anim = { kind: 'wiggle' };
  const b = M(S(0.16), soft(C.body), 0, 0.15, 0); b.scale.set(1, 0.85, 1.1); g.add(b);
  const f = M(S(0.1), soft(C.face), 0, 0.14, 0.12); f.scale.set(1, 0.9, 0.9); g.add(f);
  g.add(M(S(0.018, 8, 6), soft(C.nose), 0, 0.13, 0.215));
  eyes(g, 0.017, 0.045, 0.17, 0.19); cheeks(g, 0.02, 0.07, 0.13, 0.17);
  [-1, 1].forEach(s => g.add(M(S(0.035, 8, 6), soft(C.body), s * 0.08, 0.03, 0.06)));
  const up = new THREE.Vector3(0, 1, 0);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.85 + i / 5 * Math.PI * 0.7 + row * 0.12, el = 0.35 + row * 0.35;
    const n = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el) - 0.2).normalize();
    const p = M(petalGeo(0.035, 0.1 - row * 0.012), soft(C.p[(i + row) % 3]), n.x * 0.14, 0.15 + n.y * 0.12, n.z * 0.15 - 0.02);
    p.quaternion.setFromUnitVectors(up, n); g.add(p);
  }
  if (stage >= 1) { const lf = M(petalGeo(0.03, 0.08), soft(C.leaf), 0.03, 0.28, 0.05); lf.rotation.z = -0.5; g.add(lf); }
  if (stage >= 2) {
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.add(M(S(0.022, 8, 6), soft(C.p[i % 3]), Math.cos(a) * 0.07, 0.29, 0.03 + Math.sin(a) * 0.05)); }
    g.add(M(S(0.014, 6, 4), clay(0xfff1b0, { glow: 0xfff1b0, smooth: true }), 0, 0.31, 0.03));
  }
  return g;
}

function axolotl(THREE, K, stage) {
  const { clay, soft, M, S, eyes, cheeks, petalGeo, star, anim } = K;
  const C = { body: 0xf6b3c8, gill: 0xee7fa6, tip: 0xffd6f0, fin: 0xf9cddc, smile: 0x7a3a4a };
  const g = new THREE.Group(), body = anim(new THREE.Group(), { kind: 'still' }); body.position.y = 0.1; g.add(body);
  const b = M(S(0.12), soft(C.body), 0, 0, -0.04); b.scale.set(0.9, 0.75, 1.35); body.add(b);
  const head = M(S(0.13), soft(C.body), 0, 0.07, 0.13); head.scale.set(1.15, 0.85, 0.95); body.add(head);
  eyes(body, 0.016, 0.07, 0.1, 0.235); cheeks(body, 0.02, 0.1, 0.05, 0.21, 0xf38aa8);
  const sm = M(new THREE.TorusGeometry(0.035, 0.005, 4, 12, Math.PI), soft(C.smile), 0, 0.055, 0.24); sm.rotation.z = Math.PI; body.add(sm);
  [-1, 1].forEach(s => {
    const side = anim(new THREE.Group(), { kind: 'sway', base: 0, ph: s }); side.position.set(s * 0.12, 0.1, 0.1); body.add(side);
    [0.5, 0, -0.5].forEach(t => {
      const fr = new THREE.Group(); fr.position.y = t * 0.06; fr.rotation.z = -s * (0.5 - t * 0.8); side.add(fr);
      fr.add(M(new THREE.CylinderGeometry(0.01, 0.014, 0.1, 6), soft(C.gill), s * 0.04, 0, 0).rotateZ(s * Math.PI / 2));
      fr.add(M(S(0.018, 8, 6), stage >= 1 ? clay(C.tip, { glow: 0xffb8e0, smooth: true }) : soft(C.tip), s * 0.095, 0, 0));
    });
  });
  const fin = anim(M(petalGeo(0.07, 0.2, 0.01), soft(C.fin), 0, 0.02, -0.12), { kind: 'tail' }); fin.rotation.x = -Math.PI / 2; body.add(fin);
  [-1, 1].forEach(s => [0.08, -0.12].forEach(z => body.add(M(S(0.03, 8, 6), soft(C.body), s * 0.1, -0.07, z))));
  if (stage >= 2) body.add(M(star(0.03), clay(0xffe48a, { glow: 0xffe48a }), 0, 0.2, 0.1));
  return g;
}

function unicorn(THREE, K, stage) {
  const { clay, soft, M, S, eyes, cheeks, petalGeo, star, anim } = K;
  const C = { body: 0xfaf3f6, hoof: 0xd7c6f4, horn: 0xf6dfa4, snout: 0xfde6ee, mane: [0xf6a6c6, 0xffe48a, 0xa4e3c4, 0x9ecbf3, 0xc4acf0] };
  const g = new THREE.Group();
  const b = M(S(0.14), soft(C.body), 0, 0.21, -0.03); b.scale.set(0.95, 0.85, 1.2); g.add(b);
  [-1, 1].forEach(s => [0.06, -0.12].forEach(z => {
    g.add(M(new THREE.CylinderGeometry(0.033, 0.029, 0.17, 10), soft(C.body), s * 0.062, 0.115, z));
    g.add(M(new THREE.CylinderGeometry(0.031, 0.034, 0.035, 10), soft(C.hoof), s * 0.062, 0.028, z));
  }));
  g.add(M(S(0.085), soft(C.body), 0, 0.29, 0.06));
  const head = anim(new THREE.Group(), { kind: 'nod' }); head.position.set(0, 0.37, 0.09); g.add(head);
  head.add(M(S(0.12), soft(C.body)));
  const sn = M(S(0.055), soft(C.snout), 0, -0.055, 0.092); sn.scale.set(1.1, 0.72, 0.7); head.add(sn);
  [-1, 1].forEach(s => head.add(M(S(0.007, 6, 4), soft(0xc98a9a), s * 0.022, -0.05, 0.13)));
  eyes(head, 0.02, 0.052, 0.025, 0.105); cheeks(head, 0.018, 0.08, -0.015, 0.095);
  [-1, 1].forEach(s => { const e = M(new THREE.ConeGeometry(0.03, 0.07, 6), soft(C.body), s * 0.07, 0.11, -0.02); e.rotation.z = -s * 0.35; head.add(e); });
  const horn = M(new THREE.ConeGeometry(0.022, 0.1 + stage * 0.02, 8), soft(C.horn), 0, 0.15, 0.04); horn.rotation.x = 0.3; head.add(horn);
  head.add(M(star(0.018), clay(0xfff1b0, { glow: 0xfff1b0 }), 0, 0.21 + stage * 0.01, 0.06));
  C.mane.forEach((c, i) => head.add(M(S(0.04 - i * 0.002, 10, 8), soft(c), 0, 0.09 - i * 0.045, -0.08 - i * 0.02)));
  C.mane.forEach((c, i) => g.add(M(S(0.035, 10, 8), soft(c), 0, 0.23 - i * 0.03, -0.2 - i * 0.025)));
  if (stage >= 1) for (let i = 0; i < 4; i++) { const a = -0.8 + i * 0.5; head.add(M(S(0.018, 8, 6), soft(C.mane[i]), Math.sin(a) * 0.09, 0.1, Math.cos(a) * 0.05 - 0.02)); }
  if (stage >= 2) [-1, 1].forEach(s => { const w = anim(M(petalGeo(0.05, 0.13), soft(0xe9ddfb), s * 0.11, 0.27, -0.05), { kind: 'flap', base: -s * 1.15, s }); w.rotation.set(0.3, s * 0.6, -s * 1.15); g.add(w); });
  return g;
}

const BUILD = { cloud_dragon: cloudDragon, hedgehog, axolotl, unicorn };
export const PREMIUM_PET_IDS = Object.freeze(Object.keys(BUILD));

function paint(THREE, geo, color) {
  const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}
function mergeGeos(THREE, geos) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const size = geos[0].attributes[name].itemSize, total = geos.reduce((a, g) => a + g.attributes[name].count, 0), arr = new Float32Array(total * size);
    let off = 0; for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
function bakeNode(THREE, node) {
  node.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(node.matrixWorld).invert(), buckets = new Map(), drop = [];
  const walk = (o) => {
    for (const c of [...o.children]) {
      if (c.userData.anim) { bakeNode(THREE, c); continue; }
      if (c.isMesh) {
        const m = c.material, key = [m.flatShading ? 'f' : 's', m.transparent ? m.opacity : 1, m.emissive.getHex()].join('|');
        const q = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld));
        for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k);
        paint(THREE, q, m.color);
        if (!buckets.has(key)) buckets.set(key, { proto: m, geos: [] });
        buckets.get(key).geos.push(q);
        drop.push(c);
      } else walk(c);
    }
  };
  walk(node);
  drop.forEach(c => { c.parent.remove(c); c.geometry.dispose(); c.material.dispose(); });
  for (const o of [...node.children]) if (!o.isMesh && !o.userData.anim && !o.children.some(x => x.userData.anim)) node.remove(o);
  for (const { proto: p, geos } of buckets.values()) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: p.flatShading, transparent: p.transparent, opacity: p.opacity, depthWrite: !p.transparent });
    if (p.emissive.getHex()) { mat.emissive.copy(p.emissive); mat.emissiveIntensity = p.emissiveIntensity; }
    const mesh = new THREE.Mesh(mergeGeos(THREE, geos), mat); mesh.castShadow = !p.transparent; node.add(mesh);
    geos.forEach(q => q.dispose());
  }
}

function dotTexture(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
let DOT = null;
function fxPoints(THREE, kind) {
  const def = FX[kind], n = 10, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tmp = new THREE.Color();
  for (let i = 0; i < n; i++) { tmp.setHex(def.cols[i % def.cols.length]); col.set([tmp.r, tmp.g, tmp.b], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  DOT = DOT || dotTexture(THREE);
  const mat = new THREE.PointsMaterial({ size: 0.05, map: DOT, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.userData.fx = def.kind;
  return pts;
}

export function buildPremiumPet(THREE, kind, stage) {
  const fn = BUILD[kind];
  if (!fn) return null;
  const s = Math.max(0, Math.min(2, stage | 0)), root = new THREE.Group(), inner = fn(THREE, kit(THREE), s);
  inner.scale.setScalar(STAGE_SCALE[s]); root.add(inner);
  const anims = [];
  inner.traverse(o => { if (o.userData.anim) anims.push({ obj: o, ...o.userData.anim, y0: o.position.y, rz: o.rotation.z }); });
  bakeNode(THREE, inner);
  const fx = fxPoints(THREE, kind); root.add(fx);
  root.userData.premium = { kind, anims, fx };
  updatePremiumPetAnim(root, 0);
  return root;
}

export function disposePremiumPet(root) {
  if (!root?.userData.premium) return;
  root.traverse(o => { if (o.isMesh || o.isPoints) { o.geometry.dispose(); o.material.dispose(); } });
}

export function updatePremiumPetAnim(pet3d, t, busy = false) {
  const u = pet3d.userData.premium;
  if (!u) return false;
  for (const a of u.anims) {
    if (a.kind === 'bob') a.obj.position.y = a.y0 + Math.sin(t * 1.6) * a.amp;
    else if (a.kind === 'flap') a.obj.rotation.z = a.base + a.s * Math.sin(t * (busy ? 10 : 6)) * 0.25;
    else if (a.kind === 'sway') a.obj.rotation.z = a.rz + Math.sin(t * 2.4 + a.ph) * 0.15;
    else if (a.kind === 'tail') a.obj.rotation.y = Math.sin(t * 3) * 0.25;
    else if (a.kind === 'wiggle') a.obj.scale.y = a.obj.scale.x * (1 + Math.sin(t * 3) * 0.03);
    else if (a.kind === 'nod') a.obj.rotation.x = Math.sin(t * 1.8) * 0.08;
  }
  const p = u.fx.geometry.attributes.position, n = p.count, sp = busy ? 0.9 : 0.45;
  for (let i = 0; i < n; i++) {
    const ph = i / n, v = (t * sp + ph) % 1, a = ph * TAU;
    if (u.fx.userData.fx === 'rain') p.setXYZ(i, Math.cos(a) * 0.06, 0.72 - v * 0.5, Math.sin(a) * 0.04);
    else if (u.fx.userData.fx === 'petals') p.setXYZ(i, Math.cos(a) * (0.12 + v * 0.18), 0.25 + Math.sin(v * Math.PI) * 0.25, Math.sin(a) * (0.12 + v * 0.18));
    else if (u.fx.userData.fx === 'bubbles') p.setXYZ(i, Math.cos(a) * 0.15 + Math.sin(t + a) * 0.03, 0.15 + v * 0.55, Math.sin(a) * 0.1);
    else p.setXYZ(i, -0.05 - v * 0.4 + Math.cos(a) * 0.05, 0.08 + Math.sin(v * Math.PI) * 0.12, -0.25 - Math.sin(a) * 0.1);
  }
  p.needsUpdate = true;
  u.fx.material.opacity = busy ? 0.95 : 0.6;
  return true;
}
