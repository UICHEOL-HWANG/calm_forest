import * as THREE from 'three';
import { mat, flat, M, G, pair, teardrop, crystalCluster, eye, setEyes, wing, oreChunkInto, MOVING, PEST_SCALE } from './pest-art-kit.js';

const HOVER = (v) => v * PEST_SCALE / 1.6;

export function moth() {
  const K = { WING: 0xc4ecd0, WING2: 0xa8dcc0, EDGE: 0x9a6a8a, BODY: 0xf6f2e6, SPOT: 0xf2c46a, ANT: 0xd9b070 };
  const g = new THREE.Group(), body = G(g);
  M(new THREE.SphereGeometry(0.1, 12, 8), mat(K.BODY), body, [0, 0, 0], [0, 0, 0], [1, 1.1, 1]);
  M(teardrop(0.075, 0.26, 0.35, 0), mat(K.BODY), body, [0, -0.13, -0.03], [Math.PI / 2 + 0.25, 0, 0]);
  M(new THREE.SphereGeometry(0.11, 10, 6), mat(0xffffff, { roughness: 1 }), body, [0, 0.07, 0.02], [0, 0, 0], [1.1, 0.6, 1]);
  const head = G(body, [0, 0.13, 0.07]);
  M(new THREE.SphereGeometry(0.065, 10, 8), mat(K.BODY), head);
  const eyes = pair(sd => eye(head, [sd * 0.04, 0.01, 0.045], 0.024));
  const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.07, 0.08, 0, 0.2); leaf.quadraticCurveTo(-0.07, 0.08, 0, 0);
  pair(sd => M(new THREE.ShapeGeometry(leaf, 6), mat(K.ANT, { side: THREE.DoubleSide }), head, [sd * 0.03, 0.05, 0.02], [-0.4, 0, -sd * 0.55], [1.1, 1, 1], false));
  const fore = new THREE.Shape();
  fore.moveTo(0, 0.02); fore.bezierCurveTo(0.12, 0.2, 0.3, 0.24, 0.38, 0.16); fore.quadraticCurveTo(0.34, 0.02, 0.12, -0.03); fore.lineTo(0, 0);
  const hind = new THREE.Shape();
  hind.moveTo(0, 0); hind.quadraticCurveTo(0.24, -0.01, 0.24, -0.13); hind.quadraticCurveTo(0.2, -0.24, 0.27, -0.44);
  hind.quadraticCurveTo(0.14, -0.32, 0.1, -0.18); hind.quadraticCurveTo(0.04, -0.1, 0, -0.05);
  const wings = pair(sd => {
    const pv = G(body, [sd * 0.06, 0.03, -0.03]);
    M(new THREE.ShapeGeometry(fore, 8), mat(K.WING, { side: THREE.DoubleSide }), pv, [0, 0, 0], [0, 0, 0], [sd, 1, 1]);
    M(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(sd * 0.14, 0.22, 0), new THREE.Vector3(sd * 0.38, 0.16, 0)), 8, 0.008, 4), mat(K.EDGE), pv, [0, 0, 0.002], [0, 0, 0], [1, 1, 1], false);
    M(new THREE.ShapeGeometry(hind, 8), mat(K.WING2, { side: THREE.DoubleSide }), pv, [0, 0, -0.004], [0, 0, 0], [sd, 1, 1]);
    pair(f => {
      M(new THREE.CircleGeometry(0.036, 12), mat(K.SPOT, { side: THREE.DoubleSide }), pv, [sd * 0.16, -0.1, f * 0.006], [0, 0, 0], [1, 1, 1], false);
      M(new THREE.CircleGeometry(0.016, 8), mat(0x5a3a4a, { side: THREE.DoubleSide }), pv, [sd * 0.16, -0.1, f * 0.008], [0, 0, 0], [1, 1, 1], false);
    });
    return { pv, sd };
  });
  pair(sd => [0.03, -0.03].forEach(z => M(new THREE.CylinderGeometry(0.008, 0.006, 0.12, 4), mat(K.ANT), body, [sd * 0.04, -0.08, 0.05 + z], [0.3, 0, sd * 0.4], [1, 1, 1], false)));
  return {
    g, hover: HOVER(1.0), holdAt: new THREE.Vector3(0, -0.2, 0.08),
    pose(s, t = 0) {
      this.hover = HOVER(1.0) + Math.sin(t * 2.2) * 0.05;
      body.rotation.set(-0.15, 0, 0);
      let eyeMode = 'open', k = 6, base = 0.3, amp = 0.3, sweep = 0;
      if (s === 'approach') k = 8;
      if (s === 'carry') { k = 10; base = 0.6; sweep = 0.35; }
      if (s === 'flee') { k = 14; base = 0.4; eyeMode = 'wide'; }
      if (s === 'away') { this.hover = HOVER(1.25) + Math.sin(t * 1.4) * 0.08; k = 2.5; base = 0.45; amp = 0.15; eyeMode = 'half'; }
      if (s === 'eat') eyeMode = 'closed';
      if (s === 'sleep' || s === 'hide') { this.hover = HOVER(0.25); k = 0; base = -0.05; amp = 0; sweep = 0.55; eyeMode = s === 'sleep' ? 'closed' : 'half'; }
      wings.forEach(({ pv, sd }) => wing(pv, sd, 1.15, sweep, base + Math.sin(t * k) * amp));
      setEyes(eyes, eyeMode);
    },
  };
}

export function mole() {
  const K = { FUR: 0x8a6656, NOSE: 0xff8fae, HAND: 0xf2a6b4, DIRT: 0x7a6048 };
  const g = new THREE.Group();
  const ring = G(g);
  M(new THREE.TorusGeometry(0.21, 0.075, 5, 12), flat(K.DIRT), ring, [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  M(new THREE.CircleGeometry(0.2, 12), new THREE.MeshBasicMaterial({ color: 0x080606 }), ring, [0, 0.035, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  const bump = G(g);
  [[0, 0.05, 0, 0.13], [0.1, 0.03, -0.08, 0.08], [-0.09, 0.03, -0.1, 0.07], [0.02, 0.02, -0.2, 0.06]].forEach(([x, y, z, r], i) => M(new THREE.IcosahedronGeometry(r, 0), flat(K.DIRT), bump, [x, y, z], [i, i * 2, 0], [1, 0.6, 1]));
  const body = G(g);
  M(new THREE.SphereGeometry(0.17, 14, 10), mat(K.FUR), body, [0, 0.08, 0], [0, 0, 0], [1, 1.1, 1.05]);
  M(new THREE.ConeGeometry(0.08, 0.12, 8), mat(K.FUR), body, [0, 0.15, 0.17], [Math.PI / 2, 0, 0]);
  const star = G(body, [0, 0.16, 0.26], [-0.35, 0, 0]);
  M(new THREE.SphereGeometry(0.045, 10, 8), mat(K.NOSE), star);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    M(new THREE.CapsuleGeometry(0.022, 0.06, 2, 5), mat(K.NOSE), star, [Math.cos(a) * 0.075, Math.sin(a) * 0.075, -0.01], [0, 0, a - Math.PI / 2], [1, 1, 1], false);
  }
  const eyes = pair(sd => eye(body, [sd * 0.075, 0.2, 0.13], 0.016));
  const hands = pair(sd => {
    const h = G(body, [sd * 0.15, 0.04, 0.12], [0, 0, sd * 0.5]);
    M(new THREE.SphereGeometry(0.075, 10, 6), mat(K.HAND), h, [0, 0, 0], [0, 0, 0], [1, 0.38, 1.2]);
    [-0.04, 0, 0.04].forEach(x => M(new THREE.SphereGeometry(0.018, 6, 4), mat(0xf2d6d0), h, [x, 0, 0.085], [0, 0, 0], [1, 0.6, 1.3], false));
    return h;
  });
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.27, 0.22),
    pose(s, t = 0) {
      const under = s === 'approach' || s === 'hide' || s === 'gone';
      body.visible = !under; bump.visible = s === 'approach'; ring.visible = s === 'lost';
      bump.position.y = Math.abs(Math.sin(t * 10)) * 0.02;
      body.position.y = Math.sin(t * 2) * 0.008; body.rotation.set(0, 0, 0);
      hands.forEach((h, i) => { const sd = i ? 1 : -1; h.position.set(sd * 0.15, 0.04, 0.12); h.rotation.set(0, 0, sd * 0.5); });
      let eyeMode = 'open';
      if (s === 'carry') { body.position.y = -0.04; body.rotation.x = -0.25; hands.forEach((h, i) => { const sd = i ? 1 : -1; h.position.set(sd * 0.1, 0.22, 0.2); h.rotation.set(-0.8, 0, sd * 1.1); }); eyeMode = 'wide'; }
      if (s === 'flee') { body.position.y = -0.12; eyeMode = 'wide'; }
      if (s === 'lost') { body.position.y = 0.02; body.rotation.z = 0.3 * Math.sin(t * 1.6); }
      if (s === 'eat') eyeMode = 'closed';
      if (s === 'sleep') { body.position.y = -0.1; eyeMode = 'closed'; }
      setEyes(eyes, eyeMode);
    },
  };
}

export function dormouse() {
  const K = { FUR: 0xb9b2aa, BELLY: 0xf4ecdc, EARIN: 0xf2b0aa, TAIL: 0xa9a199, NOSE: 0xe07a80 };
  const g = new THREE.Group(), body = G(g);
  M(teardrop(0.17, 0.36, 0.55, 0.35), mat(K.FUR), body, [0, 0.16, 0]);
  M(teardrop(0.14, 0.3, 0.6, 0.4), mat(K.BELLY), body, [0, 0.12, 0.05], [0, 0, 0], [0.85, 0.6, 0.95], false);
  const head = G(body, [0, 0.25, 0.19]);
  M(new THREE.SphereGeometry(0.14, 14, 10), mat(K.FUR), head, [0, 0, 0], [0, 0, 0], [1.05, 0.95, 1]);
  M(new THREE.SphereGeometry(0.06, 10, 8), mat(K.BELLY), head, [0, -0.035, 0.11], [0, 0, 0], [1.2, 0.8, 0.9]);
  M(new THREE.SphereGeometry(0.018, 6, 5), mat(K.NOSE), head, [0, -0.01, 0.17]);
  pair(sd => {
    const ear = G(head, [sd * 0.1, 0.12, -0.02], [0, 0, -sd * 0.35]);
    M(new THREE.SphereGeometry(0.12, 12, 8), mat(K.FUR), ear, [0, 0.06, 0], [0, 0, 0], [1, 1, 0.3]);
    M(new THREE.SphereGeometry(0.088, 10, 6), mat(K.EARIN), ear, [0, 0.06, 0.02], [0, 0, 0], [1, 1, 0.2], false);
  });
  const eyes = pair(sd => eye(head, [sd * 0.065, 0.025, 0.115], 0.028));
  const paws = pair(sd => M(new THREE.SphereGeometry(0.04, 8, 6), mat(K.BELLY), body, [sd * 0.07, 0.1, 0.3]));
  const tail = [0.075, 0.072, 0.068, 0.062, 0.056, 0.05].map(r => M(new THREE.SphereGeometry(r, 8, 6), mat(K.TAIL), body));
  const lay = (pts) => tail.forEach((b, i) => b.position.set(...pts[i]));
  const CURL = [[0.02, 0.1, -0.2], [0.14, 0.09, -0.16], [0.21, 0.09, -0.04], [0.2, 0.09, 0.09], [0.14, 0.08, 0.2], [0.05, 0.07, 0.27]];
  const UP = [[0, 0.14, -0.22], [0, 0.24, -0.3], [0, 0.35, -0.33], [0, 0.45, -0.3], [0, 0.52, -0.23], [0, 0.53, -0.15]];
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.36, 0.3),
    pose(s, t = 0) {
      body.position.y = 0; body.rotation.set(0, 0, 0); body.scale.set(1, 1, 1);
      head.position.set(0, 0.25, 0.19); head.rotation.set(0, 0, 0);
      paws.forEach((p, i) => p.position.set((i ? 1 : -1) * 0.07, 0.1, 0.3));
      if (s === 'doze' || s === 'sleep' || s === 'hide') {
        head.position.set(0.04, 0.17, 0.2); head.rotation.set(0.35, -0.45, 0.15);
        body.scale.y = 1 + Math.sin(t * 1.8) * 0.02;
        lay(CURL);
        setEyes(eyes, s === 'hide' ? 'half' : 'closed');
        return;
      }
      if (MOVING.has(s)) body.position.y = Math.abs(Math.sin(t * 12)) * 0.03;
      if (s === 'carry') { body.rotation.x = -0.3; paws.forEach((p, i) => p.position.set((i ? 1 : -1) * 0.08, 0.3, 0.27)); }
      lay(UP);
      setEyes(eyes, s === 'carry' || s === 'flee' ? 'wide' : s === 'eat' ? 'closed' : s === 'lurk' ? 'half' : 'open');
    },
  };
}

export function roller() {
  const K = { SHELL: 0x625e6c, BAND: 0x46424f, SKIN: 0xd8b8c4 };
  const g = new THREE.Group();
  const ball = G(g, [0, 0.15 / PEST_SCALE, 0]);
  ball.scale.setScalar(1 / PEST_SCALE);
  oreChunkInto(ball);
  const tells = G(ball);
  pair(sd => M(new THREE.ConeGeometry(0.028, 0.07, 5), mat(K.SKIN), tells, [sd * 0.06, 0.13, 0.04], [0.3, 0, -sd * 0.35]));
  M(new THREE.ConeGeometry(0.022, 0.09, 5), mat(K.SKIN), tells, [0.08, -0.04, -0.13], [-1.9, 0.6, 0]);
  const peek = pair(sd => eye(ball, [sd * 0.045, 0.05, 0.135], 0.022));
  const open = G(g);
  M(new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), flat(K.SHELL), open, [0, 0.06, 0], [0, 0, 0], [0.9, 0.85, 1.3]);
  [-0.12, -0.04, 0.04, 0.12].forEach(z => { const k = Math.sqrt(Math.max(0.05, 1 - (z / 0.195) ** 2)); M(new THREE.TorusGeometry(0.137 * k, 0.012, 4, 10, Math.PI), flat(K.BAND), open, [0, 0.06, z], [0, 0, 0], [0.9, 0.85, 1], false); });
  crystalCluster(open, [0, 0.18, -0.02], [[0, 0, 0, 0.03, 0.08, 0, 0, 0x9be3ee], [0.04, -0.01, 0.05, 0.025, 0.06, -0.4, 0.2, 0xc7a6f0]], 0.5);
  const head = G(open, [0, 0.08, 0.2]);
  M(teardrop(0.06, 0.16, 0.25, 0.2), mat(K.SKIN), head, [0, 0, 0.03], [0, Math.PI, 0]);
  pair(sd => M(new THREE.ConeGeometry(0.025, 0.07, 5), mat(K.SKIN), head, [sd * 0.04, 0.06, -0.01], [0, 0, -sd * 0.3]));
  const eyes = pair(sd => eye(head, [sd * 0.035, 0.025, 0.04], 0.016));
  M(new THREE.ConeGeometry(0.025, 0.14, 5), mat(K.SKIN), open, [0, 0.04, -0.24], [-1.9, 0, 0]);
  const feet = [];
  pair(sd => [0.1, -0.1].forEach((z, i) => feet.push({ f: M(new THREE.SphereGeometry(0.035, 6, 5), mat(K.SKIN), open, [sd * 0.09, 0.02, z]), ph: (sd + 1) + i * Math.PI })));
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.1, 0.36),
    pose(s, t = 0) {
      const curled = s === 'mimic' || s === 'flee' || s === 'hide' || s === 'sleep';
      ball.visible = curled; open.visible = !curled;
      ball.rotation.set(s === 'flee' ? t * 9 : 0, 0, 0);
      peek.forEach(e => e.visible = s === 'flee' || s === 'hide');
      open.position.y = MOVING.has(s) ? Math.abs(Math.sin(t * 12)) * 0.015 : 0;
      feet.forEach(({ f, ph }) => f.position.y = 0.02 + (MOVING.has(s) ? Math.max(0, Math.sin(t * 12 + ph)) * 0.025 : 0));
      setEyes(eyes, s === 'lurk' || s === 'carry' ? 'half' : s === 'eat' ? 'closed' : 'open');
      setEyes(peek, 'open');
    },
  };
}
