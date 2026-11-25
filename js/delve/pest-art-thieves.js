import * as THREE from 'three';
import { plush, put, G, pair, S, US, taper, keys, lathe, uPatch, uEyes, uEar, uSmile, unitHead, look, wing, baitInto, BLUSH, MOVING, PEST_SCALE } from './pest-art-kit.js';

const HOVER = (v) => v * PEST_SCALE / 1.6;
const CUP = [[0, -0.05], [0.07, -0.046], [0.115, -0.02], [0.14, 0.02], [0.15, 0.05], [0.135, 0.062], [0.12, 0.028], [0.095, -0.004], [0, -0.016]];

export function axolotl({ submerged = false } = {}) {
  const K = { SKIN: 0xf6c3d2, CREAM: 0xfde9f0, GILL: 0xf09ab5, GILL2: 0xf9cddb, MOUTH: 0x8a4a5a };
  const g = new THREE.Group(), b = G(g);
  put(b, S(0.12), plush(K.SKIN), [0, 0.12, -0.1], [1, 0.85, 1.3]);
  put(b, S(0.09), plush(K.CREAM), [0, 0.09, -0.06], [1, 0.62, 1.25]);
  const tail = G(b, [0, 0.13, -0.24]);
  put(tail, S(0.08), plush(K.SKIN), [0, -0.005, -0.06], [0.75, 0.55, 1.35]);
  put(tail, S(0.06), plush(K.GILL2), [0, 0.03, -0.08], [0.35, 0.7, 1.3]);
  pair(s => [0.06, -0.15].forEach(z => put(b, S(0.042), plush(K.SKIN), [s * 0.1, 0.03, z], [1, 0.75, 1.25])));
  const gp = [];
  const head = unitHead(b, [0, 0.2, 0.11], 0.16, (u) => {
    put(u, US(1), plush(K.SKIN), [0, 0, 0], [1.25, 0.92, 1]);
    uPatch(u, 0, -0.5, 0.85, 0.62, 0.34, K.CREAM, 0, 0.9);
    const cheeks = pair(s => put(u, US(0.36), plush(K.SKIN), [s * 0.7, -0.36, 0.48]));
    const face = uEyes(u, { x: 0.44, y: 0.02, z: 0.84, r: 0.19 });
    pair(s => uPatch(u, s * 0.74, -0.3, 0.6, 0.15, 0.09, BLUSH));
    uSmile(u, 0, -0.44, 0.87, 0.13, K.MOUTH);
    pair(s => {
      const p = G(u, [s * 1.02, 0.18, -0.12]);
      [1.25, 0.68, 0.1].forEach(a => {
        const c = [s * Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0];
        put(p, US(0.3, 12), plush(K.GILL), c, [0.42, 1.15, 0.32], [0, 0, s * (a - Math.PI / 2)]);
        put(p, US(0.2, 10), plush(K.GILL2), [c[0], c[1], 0.07], [0.32, 0.9, 0.22], [0, 0, s * (a - Math.PI / 2)]);
      });
      gp.push({ p, s });
    });
    return { cheeks, face };
  });
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.15, 0.31),
    pose(s, t = 0) {
      const sunk = submerged && (s === 'idle' || s === 'hide' || s === 'sleep' || s === 'gone');
      const walk = MOVING.has(s);
      b.position.y = sunk ? (s === 'hide' ? -0.24 : -0.18) : 0;
      b.rotation.set(0, walk ? Math.sin(t * 12) * 0.1 : 0, 0);
      tail.rotation.set(0, walk ? Math.sin(t * 10) * 0.5 : Math.sin(t * 1.5) * 0.15, 0);
      head.pivot.rotation.set(-0.32, 0, 0);
      head.cheeks.forEach(c => c.scale.setScalar(1));
      const sway = Math.sin(t * 2) * 0.08;
      gp.forEach(({ p, s: sd }) => p.rotation.set(0, 0, sd * sway));
      let mode = 'open';
      if (s === 'lurk' || s === 'approach') { head.pivot.rotation.x = -0.42; mode = 'half'; }
      if (s === 'carry') { head.cheeks.forEach(c => c.scale.setScalar(1.45)); mode = 'half'; }
      if (s === 'flee') { mode = 'wide'; gp.forEach(({ p, s: sd }) => p.rotation.z = -sd * 0.3); }
      if (s === 'eat') mode = 'closed';
      if (s === 'hide') mode = 'half';
      if (s === 'sleep') { mode = 'closed'; gp.forEach(({ p, s: sd }) => p.rotation.z = -sd * 0.55); tail.rotation.y = 0.9; }
      look(head.face, mode);
    },
  };
}

export function crab() {
  const K = { SHELL: 0xf6ae8a, CREAM: 0xfde4d2, RIM: 0xf09a78, GUM1: 0xc2eee8, GUM2: 0xdcd0f6, MOUTH: 0x8a4a4a };
  const g = new THREE.Group(), b = G(g);
  const head = unitHead(b, [0, 0.16, 0], 0.17, (u) => {
    put(u, US(1), plush(K.SHELL), [0, 0, 0], [1.35, 0.85, 1.05]);
    uPatch(u, 0, -0.55, 0.8, 0.8, 0.42, K.CREAM, 0, 0.88);
    pair(s => put(u, US(0.34), plush(K.SHELL), [s * 0.44, 0.62, 0.5]));
    const face = uEyes(u, { x: 0.44, y: 0.66, z: 0.82, r: 0.2, ring: true });
    pair(s => uPatch(u, s * 0.78, -0.1, 0.62, 0.17, 0.1, BLUSH));
    uSmile(u, 0, -0.18, 1.0, 0.12, K.MOUTH);
    put(u, US(0.26, 12), plush(K.GUM1), [0, 0.86, -0.36], [0.7, 1.5, 0.7], [-0.35, 0, 0]);
    put(u, US(0.2, 12), plush(K.GUM2), [0.4, 0.74, -0.42], [0.7, 1.4, 0.7], [-0.3, 0, -0.5]);
    put(u, US(0.2, 12), plush(K.GUM1), [-0.4, 0.74, -0.4], [0.7, 1.3, 0.7], [-0.3, 0, 0.5]);
    return { face };
  });
  const arm = G(b, [0.2, 0.11, 0.08]);
  put(arm, S(0.05), plush(K.SHELL), [0.03, 0.02, 0.07], [1, 1, 1.5]);
  const bowl = G(arm, [0.06, 0.06, 0.17]);
  bowl.scale.setScalar(0.78);
  put(bowl, lathe(CUP), plush(K.CREAM));
  put(bowl, new THREE.TorusGeometry(0.143, 0.024, 6, 18), plush(K.RIM), [0, 0.052, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  const snack = baitInto(G(bowl, [0, -0.02, 0])); snack.scale.setScalar(0.5);
  const small = G(b, [-0.22, 0.1, 0.1], [0, 0.3, 0]);
  put(small, S(0.058), plush(K.SHELL), [0, 0, 0.03], [0.95, 0.8, 1.2]);
  put(small, S(0.036), plush(K.SHELL), [0.04, 0.02, 0.07]);
  const legs = [];
  pair(s => [0.05, -0.06, -0.16].forEach((z, k) => { const l = G(b, [s * 0.24, 0.04, z]); put(l, S(0.042), plush(K.SHELL), [0, 0, 0], [1.5, 0.8, 0.95]); legs.push({ l, s, k }); }));
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0.26, 0.19, 0.25),
    pose(s, t = 0) {
      const walk = MOVING.has(s);
      b.position.y = 0; b.rotation.set(0, 0, walk ? Math.sin(t * 16) * 0.05 : 0);
      arm.rotation.set(0, 0, 0); small.rotation.set(0, 0.3, 0);
      legs.forEach(({ l, s: sd, k }) => { l.rotation.set(0, 0, walk ? Math.sin(t * 16 + k * 2 + sd) * 0.3 : 0); });
      snack.visible = false;
      let mode = 'open';
      if (s === 'lurk' || s === 'approach') { arm.rotation.x = -0.35; small.rotation.x = -0.5; mode = 'half'; }
      if (s === 'carry') mode = 'half';
      if (s === 'flee') mode = 'wide';
      if (s === 'eat') { snack.visible = true; arm.rotation.set(-0.35, -0.5, 0); mode = 'closed'; }
      if (s === 'hide') { b.position.y = -0.05; mode = 'half'; }
      if (s === 'sleep') { b.position.y = -0.06; legs.forEach(({ l, s: sd }) => l.rotation.z = sd * 0.4); mode = 'closed'; }
      look(head.face, mode);
    },
  };
}

export function bat() {
  const K = { FUR: 0xbaa7d8, CREAM: 0xf5eefa, EARIN: 0xf8c6d4, WING: 0x9f8ac4, WING2: 0xc4b4e0, CLAW: 0xf6d78e, NOSE: 0xe8a3b8 };
  const g = new THREE.Group(), b = G(g);
  put(b, S(0.1), plush(K.FUR), [0, -0.07, -0.01], [1, 1.05, 0.95]);
  put(b, S(0.075), plush(K.CREAM), [0, -0.08, 0.05], [1, 1.1, 0.5]);
  const head = unitHead(b, [0, 0.09, 0.02], 0.15, (u) => {
    put(u, US(1), plush(K.FUR), [0, 0, 0], [1.05, 0.95, 1]);
    put(u, US(0.42), plush(K.CREAM), [0, -0.34, 0.76], [1.15, 0.78, 0.8]);
    put(u, US(0.12), plush(K.NOSE), [0, -0.16, 1.1], [1.3, 0.8, 0.7]);
    const face = uEyes(u, { x: 0.42, y: 0.02, z: 0.84, r: 0.18 });
    pair(s => uPatch(u, s * 0.7, -0.28, 0.64, 0.15, 0.09, BLUSH));
    uSmile(u, 0, -0.5, 1.0, 0.09);
    pair(s => uEar(u, s, { x: 0.52, y: 0.98, z: -0.05, outer: K.FUR, inner: K.EARIN, w: 0.36, h: 1.85, tilt: 0.38 }));
    return { face };
  });
  const wings = pair(sd => {
    const pv = G(b, [sd * 0.07, -0.04, -0.02]);
    put(pv, S(0.1), plush(K.WING), [sd * 0.15, 0.01, 0], [1.6, 0.8, 0.2]);
    put(pv, S(0.08), plush(K.WING), [sd * 0.28, -0.04, 0], [1.15, 0.85, 0.2]);
    put(pv, S(0.075), plush(K.WING2), [sd * 0.16, 0.0, 0.014], [1.4, 0.55, 0.12]);
    return { pv, sd };
  });
  const toes = [];
  const grab = G(b, [0, -0.17, 0.02]);
  put(grab, S(0.04), plush(K.CLAW));
  [0, 2.1, 4.2].forEach(a => {
    const seg = G(G(grab, [0, -0.015, 0], [0, a, 0]), [0, 0, 0.022]);
    put(seg, S(0.027), plush(K.CLAW), [0, -0.035, 0], [1, 1.8, 1]);
    put(seg, S(0.024), plush(K.CLAW), [0, -0.075, -0.018]);
    toes.push(seg);
  });
  return {
    g, hover: HOVER(0.8), holdAt: new THREE.Vector3(0, -0.29, 0.03),
    pose(s, t = 0) {
      b.rotation.set(-0.2, 0, 0); head.pivot.rotation.set(0, 0, 0); this.hover = HOVER(0.8);
      const flap = (k, base, sweep = 0) => wings.forEach(({ pv, sd }) => wing(pv, sd, 1.0, sweep, base + Math.sin(t * k) * 0.35));
      let splay = 0.35, mode = 'open';
      flap(8, 0.3);
      if (s === 'lurk') { this.hover = HOVER(1.05); b.rotation.x = -0.05; wings.forEach(({ pv, sd }) => wing(pv, sd, 0.8, -0.1, 1.0 + Math.sin(t * 3) * 0.08)); splay = 0.9; mode = 'half'; }
      if (s === 'approach') { b.rotation.x = 0.15; flap(10, 0.4); splay = 0.75; mode = 'half'; }
      if (s === 'carry') { b.rotation.x = 0.45; wings.forEach(({ pv, sd }) => wing(pv, sd, 1.25, 0.6, 0.15 + Math.sin(t * 12) * 0.15)); splay = 0.15; mode = 'half'; }
      if (s === 'flee') { this.hover = HOVER(0.65); head.pivot.rotation.z = 0.25; flap(16, 0.1); splay = 0.8; mode = 'wide'; }
      if (s === 'eat') mode = 'closed';
      if (s === 'sleep' || s === 'hide') { this.hover = HOVER(0.38); b.rotation.x = 0; wings.forEach(({ pv, sd }) => { pv.rotation.order = 'XYZ'; pv.rotation.set(0, sd * 1.1, -sd * 1.2); }); mode = s === 'sleep' ? 'closed' : 'half'; }
      toes.forEach(tt => tt.rotation.x = -splay);
      look(head.face, mode);
    },
  };
}

export function grub() {
  const K = { BODY: 0xece2f6, BAND: 0xdccfee, ROD: 0xb8a6da, LAMP: 0xfff0b0, BASKET: 0xedcb9c, MOUTH: 0x7a4a5a };
  const g = new THREE.Group(), body = G(g);
  const SEG = [[0.13, 0.13, 0.1], [0.115, 0.115, -0.07], [0.1, 0.1, -0.21]];
  const head = unitHead(body, [0, 0.17, 0.29], 0.16, (u) => {
    put(u, US(1), plush(K.BODY), [0, 0, 0], [1.05, 0.95, 1]);
    const face = uEyes(u, { x: 0.42, y: -0.04, z: 0.84, r: 0.17 });
    pair(s => uPatch(u, s * 0.72, -0.32, 0.62, 0.15, 0.09, BLUSH));
    uSmile(u, 0, -0.46, 0.88, 0.1, K.MOUTH);
    pair(s => { put(u, US(0.13, 8), plush(K.ROD), [s * 0.34, 1.0, 0.12], [0.85, 2.0, 0.85], [0, 0, -s * 0.35]); put(u, US(0.17, 10), plush(K.ROD), [s * 0.52, 1.36, 0.16]); });
    return { face };
  });
  const segs = SEG.map(([r, y, z], i) => {
    const sg = G(body, [0, y, z]);
    put(sg, S(r), plush(i % 2 ? K.BODY : K.BAND));
    pair(s => put(sg, S(0.03), plush(K.BAND), [s * r * 0.72, -r * 0.78, 0]));
    return { sg, r, y, z };
  });
  const basket = G(segs[0].sg, [0, 0.12, -0.02]);
  put(basket, lathe(CUP), plush(K.BASKET), [0, 0, 0], [0.82, 0.9, 0.82]);
  const lure = G(segs[2].sg);
  taper(lure, [[0, 0.06, 0], [0.02, 0.32, 0.03], [0.07, 0.48, 0.24], [0.14, 0.47, 0.46], [0.17, 0.38, 0.6]], keys([[0, 0.026], [1, 0.022]]), plush(K.ROD), { segs: 14, radial: 7 });
  const bulb = new THREE.MeshStandardMaterial({ color: K.LAMP, emissive: K.LAMP, emissiveIntensity: 0.3, roughness: 0.4 });
  put(lure, S(0.058), bulb, [0.17, 0.32, 0.63]);
  put(lure, S(0.045), plush(K.ROD), [0.17, 0.37, 0.63], [1.1, 0.55, 1.1]);
  const light = new THREE.PointLight(0xfff0b0, 0.22, 1.4, 2); light.position.set(0.2, 0.3, 0.7); lure.add(light);
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.27, 0.08),
    pose(s, t = 0) {
      const walk = MOVING.has(s), coil = s === 'sleep' || s === 'hide';
      const ring = (i) => { const a = 0.9 + i * 1.15; return [Math.sin(a) * 0.2, Math.cos(a) * 0.2]; };
      head.pivot.position.set(0, 0.17, 0.29); head.pivot.rotation.set(-0.22, 0, 0);
      if (coil) { const [x, z] = ring(-0.2); head.pivot.position.set(x, 0.16, z); head.pivot.rotation.set(-0.15, 0.25, 0); }
      segs.forEach(({ sg, r, y, z }, i) => {
        if (coil) { const [x, zz] = ring(i + 1); sg.position.set(x, r, zz); }
        else sg.position.set(walk ? Math.sin(t * 9 - i) * 0.025 : 0, y + (walk ? Math.max(0, Math.sin(t * 9 - i)) * 0.035 : 0), z);
      });
      lure.rotation.set(Math.sin(t * 1.7) * 0.05, 0, 0);
      let mode = 'open';
      if (s === 'lurk' || s === 'approach') { head.pivot.position.y += 0.06; lure.rotation.x = 0.2; mode = 'half'; }
      if (s === 'carry') mode = 'half';
      if (s === 'flee') { lure.rotation.x = -0.25; mode = 'wide'; }
      if (s === 'eat') mode = 'closed';
      if (coil) { lure.rotation.set(-1.0, 0, 0); mode = s === 'sleep' ? 'closed' : 'half'; }
      const dim = coil || s === 'flee';
      bulb.emissiveIntensity = dim ? 0.1 : 0.3;
      light.intensity = dim ? 0.06 : 0.22;
      look(head.face, mode);
    },
  };
}
