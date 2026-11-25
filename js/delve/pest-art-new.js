import * as THREE from 'three';
import { plush, gloss, put, G, pair, S, US, taper, keys, uPatch, uEyes, uEar, uSmile, unitHead, look, wing, oreChunkInto, BLUSH, MOVING, PEST_SCALE } from './pest-art-kit.js';

const HOVER = (v) => v * PEST_SCALE / 1.6;

export function moth() {
  const K = { BODY: 0xfbf6ec, FLUFF: 0xfffdf8, WING: 0xcdeedd, WING2: 0xe6f7ee, SPOT: 0xf6d98a, ANT: 0xf0d59a, ANT2: 0xf8e8c2 };
  const g = new THREE.Group(), b = G(g);
  put(b, S(0.09), plush(K.BODY), [0, -0.04, -0.01], [1, 1.1, 1]);
  put(b, S(0.07), plush(K.BODY), [0, -0.15, -0.06], [0.9, 1.3, 0.9]);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; put(b, S(0.042), plush(K.FLUFF), [Math.cos(a) * 0.07, 0.03, 0.01 + Math.sin(a) * 0.055]); }
  const head = unitHead(b, [0, 0.09, 0.04], 0.11, (u) => {
    put(u, US(1), plush(K.BODY));
    const face = uEyes(u, { x: 0.42, y: -0.06, z: 0.82, r: 0.2 });
    pair(s => uPatch(u, s * 0.72, -0.36, 0.6, 0.15, 0.09, BLUSH));
    uSmile(u, 0, -0.5, 0.84, 0.09);
    pair(s => uEar(u, s, { x: 0.38, y: 1.05, z: 0.02, outer: K.ANT, inner: K.ANT2, w: 0.34, h: 1.7, tilt: 0.5 }));
    return { face };
  });
  const wings = pair(sd => {
    const pv = G(b, [sd * 0.06, -0.02, -0.02]);
    put(pv, S(0.12), plush(K.WING), [sd * 0.17, 0.06, 0], [1.55, 1.0, 0.13]);
    put(pv, S(0.085), plush(K.WING2), [sd * 0.19, 0.065, 0.01], [1.5, 0.9, 0.11]);
    put(pv, S(0.1), plush(K.WING), [sd * 0.12, -0.1, -0.006], [1.0, 1.35, 0.13]);
    put(pv, S(0.05), plush(K.WING), [sd * 0.17, -0.24, -0.006], [0.75, 1.7, 0.13]);
    put(pv, S(0.036), plush(K.SPOT), [sd * 0.13, -0.11, 0.008], [1, 1, 0.32]);
    return { pv, sd };
  });
  pair(s => put(b, S(0.025), plush(K.ANT), [s * 0.04, -0.1, 0.07], [1, 2, 1], [0.4, 0, s * 0.3]));
  return {
    g, hover: HOVER(1.0), holdAt: new THREE.Vector3(0, -0.19, 0.08),
    pose(s, t = 0) {
      this.hover = HOVER(1.0) + Math.sin(t * 2.2) * 0.05;
      b.rotation.set(-0.12, 0, 0);
      let mode = 'open', k = 6, base = 0.3, amp = 0.3, sweep = 0;
      if (s === 'approach') k = 8;
      if (s === 'carry') { k = 10; base = 0.6; sweep = 0.3; }
      if (s === 'flee') { k = 14; base = 0.4; mode = 'wide'; }
      if (s === 'away') { this.hover = HOVER(1.25) + Math.sin(t * 1.4) * 0.08; k = 2.5; base = 0.45; amp = 0.15; mode = 'half'; }
      if (s === 'eat') mode = 'closed';
      if (s === 'sleep' || s === 'hide') { this.hover = HOVER(0.26); k = 0; base = -0.05; amp = 0; sweep = 0.5; mode = s === 'sleep' ? 'closed' : 'half'; }
      wings.forEach(({ pv, sd }) => wing(pv, sd, 1.1, sweep, base + Math.sin(t * k) * amp));
      look(head.face, mode);
    },
  };
}

export function mole() {
  const K = { FUR: 0xc89f8a, CREAM: 0xf7e8da, NOSE: 0xf5a3bb, NOSE2: 0xfac9d6, HAND: 0xf6c2ca, DIRT: 0x9c7a60 };
  const g = new THREE.Group();
  const ring = G(g);
  put(ring, new THREE.TorusGeometry(0.21, 0.07, 8, 18), plush(K.DIRT), [0, 0.02, 0], [1, 1, 0.7], [-Math.PI / 2, 0, 0]);
  put(ring, new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0x14100e }), [0, 0.035, 0], [1, 1, 1], [-Math.PI / 2, 0, 0], false);
  const bump = G(g);
  [[0, 0.03, 0, 0.13], [0.1, 0.02, -0.09, 0.08], [-0.09, 0.02, -0.11, 0.07]].forEach(([x, y, z, r]) => put(bump, S(r), plush(K.DIRT), [x, y, z], [1, 0.55, 1]));
  const body = G(g);
  const head = unitHead(body, [0, 0.06, 0], 0.18, (u) => {
    put(u, US(1), plush(K.FUR), [0, 0, 0], [1.05, 1, 1]);
    put(u, US(0.5), plush(K.CREAM), [0, -0.16, 0.72], [1, 0.75, 0.8]);
    const star = G(u, [0, -0.1, 1.14], [-0.3, 0, 0]);
    put(star, US(0.17, 10), plush(K.NOSE));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; put(star, US(0.12, 8), plush(i % 2 ? K.NOSE2 : K.NOSE), [Math.cos(a) * 0.24, Math.sin(a) * 0.24, -0.04], [0.6, 1.25, 0.5], [0, 0, a - Math.PI / 2]); }
    const face = uEyes(u, { x: 0.4, y: 0.14, z: 0.84, r: 0.16 });
    pair(s => uPatch(u, s * 0.74, -0.1, 0.62, 0.15, 0.09, BLUSH));
    return { face };
  });
  const hands = pair(s => {
    const h = G(body, [s * 0.16, 0.03, 0.12], [0, -s * 0.2, s * 0.35]);
    put(h, S(0.075), plush(K.HAND), [0, 0, 0], [1.15, 0.42, 1.25]);
    [-0.04, 0, 0.04].forEach(x => put(h, S(0.03), plush(K.HAND), [x, 0.004, 0.085], [1, 0.75, 1.1]));
    return h;
  });
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.27, 0.22),
    pose(s, t = 0) {
      const under = s === 'approach' || s === 'hide' || s === 'gone';
      body.visible = !under; bump.visible = s === 'approach'; ring.visible = s === 'lost';
      bump.position.y = Math.abs(Math.sin(t * 10)) * 0.02;
      body.position.y = Math.sin(t * 2) * 0.008; body.rotation.set(0, 0, 0); head.pivot.rotation.set(-0.38, 0, 0);
      hands.forEach((h, i) => { const sd = i ? 1 : -1; h.position.set(sd * 0.16, 0.03, 0.12); h.rotation.set(0, -sd * 0.2, sd * 0.35); });
      let mode = 'open';
      if (s === 'carry') { body.position.y = -0.04; body.rotation.x = -0.2; hands.forEach((h, i) => { const sd = i ? 1 : -1; h.position.set(sd * 0.1, 0.2, 0.19); h.rotation.set(-0.8, 0, sd * 1.1); }); mode = 'wide'; }
      if (s === 'flee') { body.position.y = -0.1; mode = 'wide'; }
      if (s === 'lost') { body.position.y = 0.02; body.rotation.z = 0.3 * Math.sin(t * 1.6); }
      if (s === 'lurk') mode = 'half';
      if (s === 'eat') mode = 'closed';
      if (s === 'sleep') { body.position.y = -0.08; mode = 'closed'; }
      look(head.face, mode);
    },
  };
}

export function dormouse() {
  const K = { FUR: 0xd2cbc2, CREAM: 0xfbf5ec, EARIN: 0xf8cbc8, TAIL: 0xc6beb5, NOSE: 0xef9ca6 };
  const g = new THREE.Group(), b = G(g);
  put(b, S(0.13), plush(K.FUR), [0, 0.12, -0.05], [1, 0.9, 1.1]);
  put(b, S(0.09), plush(K.CREAM), [0, 0.1, 0.03], [1, 0.9, 0.6]);
  const paws = pair(s => put(b, S(0.036), plush(K.CREAM), [s * 0.06, 0.05, 0.09]));
  const head = unitHead(b, [0, 0.25, 0.07], 0.16, (u) => {
    put(u, US(1), plush(K.FUR));
    put(u, US(0.42), plush(K.CREAM), [0, -0.32, 0.76], [1.15, 0.8, 0.85]);
    put(u, US(0.12), plush(K.NOSE), [0, -0.18, 1.12], [1.25, 0.85, 0.8]);
    const face = uEyes(u, { x: 0.42, y: 0.02, z: 0.84, r: 0.16 });
    pair(s => uPatch(u, s * 0.74, -0.3, 0.6, 0.15, 0.09, BLUSH));
    uSmile(u, 0, -0.5, 0.95, 0.08);
    pair(s => {
      const e = G(u, [s * 0.74, 0.74, -0.18], [-0.3, 0, -s * 0.4]);
      put(e, US(0.6, 14), plush(K.FUR), [0, 0, 0], [1, 1, 0.32]);
      put(e, US(0.44, 12), plush(K.EARIN), [0, -0.02, 0.12], [1, 1, 0.22]);
    });
    return { face };
  });
  const tailCurl = G(b), tailUp = G(b);
  taper(tailCurl, [[0, 0.09, -0.18], [0.16, 0.08, -0.14], [0.22, 0.08, 0.0], [0.18, 0.07, 0.14], [0.08, 0.06, 0.22]], keys([[0, 0.05], [0.5, 0.068], [1, 0.05]]), plush(K.TAIL), { segs: 14, radial: 9 });
  taper(tailUp, [[0, 0.12, -0.17], [0, 0.2, -0.28], [0, 0.31, -0.3], [0, 0.37, -0.23], [0, 0.35, -0.15]], keys([[0, 0.05], [0.6, 0.066], [1, 0.05]]), plush(K.TAIL), { segs: 12, radial: 9 });
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.32, 0.24),
    pose(s, t = 0) {
      b.position.y = 0; b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1);
      head.pivot.position.set(0, 0.25, 0.07); head.pivot.rotation.set(-0.15, 0, 0);
      paws.forEach((p, i) => p.position.set((i ? 1 : -1) * 0.06, 0.05, 0.09));
      const curled = s === 'doze' || s === 'sleep' || s === 'hide';
      tailCurl.visible = curled; tailUp.visible = !curled;
      if (curled) {
        head.pivot.position.set(0.02, 0.19, 0.1); head.pivot.rotation.set(0.35, -0.25, 0.2);
        b.scale.y = 1 + Math.sin(t * 1.8) * 0.02;
        look(head.face, s === 'hide' ? 'half' : 'closed');
        return;
      }
      if (MOVING.has(s)) b.position.y = Math.abs(Math.sin(t * 12)) * 0.03;
      if (s === 'carry') { b.rotation.x = -0.2; paws.forEach((p, i) => p.position.set((i ? 1 : -1) * 0.07, 0.24, 0.17)); }
      look(head.face, s === 'carry' || s === 'flee' ? 'wide' : s === 'eat' ? 'closed' : s === 'lurk' ? 'half' : 'open');
    },
  };
}

export function roller() {
  const K = { SHELL: 0xb9b2cc, BAND: 0xa198bc, SKIN: 0xf5d8e2, EARIN: 0xf8c0cf, NOSE: 0xe89aae, GUM1: 0xc2eee8, GUM2: 0xdcd0f6 };
  const g = new THREE.Group();
  const ball = G(g, [0, 0.15 / PEST_SCALE, 0]);
  ball.scale.setScalar(1 / PEST_SCALE);
  oreChunkInto(ball);
  const tells = G(ball);
  pair(s => put(tells, S(0.034), plush(K.SKIN), [s * 0.065, 0.13, 0.04], [0.7, 1.4, 0.5], [0.3, 0, -s * 0.35]));
  put(tells, S(0.028), plush(K.SKIN), [0.08, -0.04, -0.13], [1, 1, 2.2], [0.3, 0.6, 0]);
  const peek = pair(s => {
    const e = G(ball, [s * 0.05, 0.05, 0.135]);
    put(e, S(0.024), gloss(0x2a1e22));
    put(e, S(0.009), gloss(0xffffff), [0.008, 0.01, 0.018]);
    return e;
  });
  const open = G(g);
  put(open, S(0.17), plush(K.SHELL), [0, 0.13, -0.03], [0.95, 0.8, 1.15]);
  [-0.13, -0.03, 0.07].forEach(z => { const k = Math.sqrt(Math.max(0.15, 1 - ((z + 0.03) / 0.196) ** 2)); put(open, new THREE.TorusGeometry(0.163 * k, 0.019, 6, 16, Math.PI), plush(K.BAND), [0, 0.13, z], [0.95, 0.82, 1]); });
  put(open, S(0.045), plush(K.GUM1), [0, 0.27, -0.06], [0.7, 1.5, 0.7], [-0.3, 0, 0]);
  put(open, S(0.035), plush(K.GUM2), [0.06, 0.25, 0.0], [0.7, 1.4, 0.7], [-0.2, 0, -0.5]);
  const head = unitHead(open, [0, 0.13, 0.18], 0.115, (u) => {
    put(u, US(1), plush(K.SKIN));
    put(u, US(0.46), plush(K.SKIN), [0, -0.24, 0.86], [0.85, 0.72, 1.25]);
    put(u, US(0.17, 10), plush(K.NOSE), [0, -0.2, 1.45], [1.2, 0.9, 0.8]);
    const face = uEyes(u, { x: 0.44, y: 0.08, z: 0.82, r: 0.19 });
    pair(s => uPatch(u, s * 0.74, -0.26, 0.6, 0.16, 0.1, BLUSH));
    pair(s => uEar(u, s, { x: 0.56, y: 0.8, z: -0.1, outer: K.SKIN, inner: K.EARIN, w: 0.32, h: 1.3, tilt: 0.4 }));
    return { face };
  });
  put(open, S(0.03), plush(K.SKIN), [0, 0.07, -0.24], [1, 1, 2.2], [-0.3, 0, 0]);
  const feet = [];
  pair(sd => [0.09, -0.11].forEach((z, i) => feet.push({ f: put(open, S(0.038), plush(K.SKIN), [sd * 0.1, 0.03, z], [1, 0.8, 1.2]), ph: (sd + 1) + i * Math.PI })));
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.1, 0.33),
    pose(s, t = 0) {
      const curled = s === 'mimic' || s === 'flee' || s === 'hide' || s === 'sleep';
      ball.visible = curled; open.visible = !curled;
      ball.rotation.set(s === 'flee' ? t * 9 : 0, 0, 0);
      peek.forEach(e => e.visible = s === 'flee' || s === 'hide');
      open.position.y = MOVING.has(s) ? Math.abs(Math.sin(t * 12)) * 0.015 : 0;
      head.pivot.rotation.set(-0.22, 0, 0);
      feet.forEach(({ f, ph }) => f.position.y = 0.03 + (MOVING.has(s) ? Math.max(0, Math.sin(t * 12 + ph)) * 0.025 : 0));
      look(head.face, s === 'lurk' || s === 'carry' ? 'half' : s === 'eat' ? 'closed' : 'open');
    },
  };
}
